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
