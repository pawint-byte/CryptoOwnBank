// Pure XRPL signing core — no network, no device I/O.
//
// This is the testable heart of cold-wallet signing. It builds the exact
// transaction the member will approve, produces the bytes a device or raw key
// signs, and assembles the final signed blob. Because it touches no network and
// no hardware, it can be exercised end-to-end against XRPL Testnet with a
// software stand-in wallet (see scripts/test-xrpl-signing.ts) — proving the
// build -> sign -> assemble path byte-for-byte before any real money moves.
//
// NOTE: we import the RLUSD constant via a RELATIVE path (./constants) on
// purpose, so a plain `tsx` test runner can import this module without needing
// Vite's `@/` alias.

import { encode, encodeForSigning } from "xrpl";
import { RLUSD } from "./constants";

export interface RlusdPaymentParams {
  account: string;
  destination: string;
  /** RLUSD value as a decimal string, e.g. "100.50". */
  amount: string;
  destinationTag?: number;
  memos?: { MemoType?: string; MemoData?: string }[];
}

function textToHex(s: string): string {
  return Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/** Build an unsigned RLUSD (IOU) Payment. No autofill / SigningPubKey yet. */
export function buildRlusdPayment(p: RlusdPaymentParams): Record<string, any> {
  const tx: Record<string, any> = {
    TransactionType: "Payment",
    Account: p.account,
    Destination: p.destination,
    Amount: {
      currency: RLUSD.currency,
      issuer: RLUSD.issuer,
      value: p.amount,
    },
  };
  if (p.destinationTag !== undefined) tx.DestinationTag = p.destinationTag;
  if (p.memos?.length) {
    tx.Memos = p.memos.map((m) => ({
      Memo: {
        ...(m.MemoType ? { MemoType: textToHex(m.MemoType) } : {}),
        ...(m.MemoData ? { MemoData: textToHex(m.MemoData) } : {}),
      },
    }));
  }
  return tx;
}

/** Build an unsigned TrustSet (e.g. to trust the RLUSD line). */
export function buildTrustSet(
  account: string,
  currency: string,
  issuer: string,
  limit = "1000000000",
): Record<string, any> {
  return {
    TransactionType: "TrustSet",
    Account: account,
    LimitAmount: { currency, issuer, value: limit },
  };
}

/**
 * The blob a hardware device signs: the standard serialization with
 * SigningPubKey present and no TxnSignature. (Ledger's hw-app-xrp expects this
 * and applies the signing prefix internally.)
 */
export function encodeForDevice(tx: Record<string, any>): string {
  return encode(tx as any);
}

/**
 * The hex message a raw-key signer (ripple-keypairs) signs. This applies the
 * single-signature hash prefix. Used by the test harness and any software key.
 */
export function signingMessage(tx: Record<string, any>): string {
  return encodeForSigning(tx as any);
}

/**
 * Attach a signature and produce the final broadcastable blob. The same step
 * is used whether the signature came from a Ledger, a QR device, or a software
 * key — only the way the signature was produced differs.
 */
export function attachSignature(
  tx: Record<string, any>,
  txnSignature: string,
): { signedTx: Record<string, any>; txBlob: string } {
  const signedTx = { ...tx, TxnSignature: txnSignature.toUpperCase() };
  return { signedTx, txBlob: encode(signedTx as any) };
}

// ---------------------------------------------------------------------------
// Injectable orchestrator. The ONLY thing a cold wallet does is "tell us its
// address and produce a signature". By expressing that as an interface, the
// EXACT same assemble -> sign -> submit code runs in production (signer = a
// Ledger over USB) and in the test harness (signer = a software keypair on
// Testnet). That means the harness exercises the real flow, not a copy of it.
// ---------------------------------------------------------------------------

/** A thing that can reveal an address and sign a prepared XRPL transaction. */
export interface TxSigner {
  /** Reveal the address + public key this signer will sign with. */
  getAddress(): Promise<{ address: string; publicKey: string }>;
  /**
   * Produce the TxnSignature (hex) for a fully-prepared tx (autofilled, with
   * SigningPubKey set). Each signer owns how it derives its signing input: a
   * Ledger signs `encodeForDevice(prepared)`, a raw key signs
   * `signingMessage(prepared)`.
   */
  signPrepared(prepared: Record<string, any>): Promise<string>;
}

/** The two network operations the flow needs, kept injectable for testnet. */
export interface TxNetwork {
  autofill(tx: Record<string, any>): Promise<Record<string, any>>;
  submit(
    txBlob: string,
  ): Promise<{ success: boolean; hash?: string; code?: string; error?: string }>;
}

export interface AssembleResult {
  success: boolean;
  txHash?: string;
  /** Where it failed, so callers can show the right message. */
  stage?: "mismatch" | "submit";
  code?: string;
  error?: string;
}

/**
 * Build -> autofill -> set SigningPubKey -> sign -> attach -> submit, with the
 * signer and network injected. This is the single source of truth for the
 * cold-wallet send flow; the live Ledger path and the Testnet harness both call
 * it so the assembly logic is proven, not duplicated.
 */
export async function assembleSignSubmit(
  baseTxFor: (account: string) => Record<string, any>,
  signer: TxSigner,
  net: TxNetwork,
  expectedAddress?: string,
): Promise<AssembleResult> {
  const { address, publicKey } = await signer.getAddress();
  if (expectedAddress && address !== expectedAddress) {
    return { success: false, stage: "mismatch" };
  }

  const baseTx = baseTxFor(address);
  const prepared = await net.autofill(baseTx);
  prepared.SigningPubKey = publicKey.toUpperCase();

  const signature = await signer.signPrepared(prepared);
  const { txBlob } = attachSignature(prepared, signature);

  const res = await net.submit(txBlob);
  if (!res.success) {
    return { success: false, stage: "submit", code: res.code, error: res.error };
  }
  return { success: true, txHash: res.hash };
}
