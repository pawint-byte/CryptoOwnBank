// Keystone connector for XRPL.
//
// Keystone is an air-gapped device: it never touches a cable or the internet.
// You show it a QR code (the transaction to review) and it shows you a QR code
// back (its reply). All of that runs in the browser — no npm device driver and
// no blocked dependencies. We use Keystone's own SDK to read its account QR and
// to build/parse the signing QR codes.

import { KeystoneSDK } from "@keystonehq/keystone-sdk";
import { UR } from "@ngraveio/bc-ur";

export interface KeystoneAccount {
  address: string;
  /** Public key (hex), needed later when building a signable transaction. */
  key: string;
}

export interface KeystoneXrpTx {
  TransactionType: string;
  Account: string;
  Fee: string;
  Sequence: number;
  Flags: number;
  Amount: string;
  SigningPubKey: string;
  Destination: string;
  DestinationTag?: number;
  LastLedgerSequence?: number;
}

const sdk = new KeystoneSDK();

/** True if a camera is likely available for scanning Keystone QR codes. */
export function isCameraLikelyAvailable(): boolean {
  try {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  } catch {
    return false;
  }
}

function urFromScan(type: string, cborHex: string): UR {
  return new UR(Buffer.from(cborHex, "hex"), type);
}

/**
 * Parse the account-export QR shown by the Keystone
 * ("Connect Software Wallet" → XRP). Returns the XRP address + public key.
 */
export function parseKeystoneAccount(
  type: string,
  cborHex: string,
): KeystoneAccount {
  return sdk.xrp.parseAccount(urFromScan(type, cborHex) as any) as KeystoneAccount;
}

/** Build the animated-QR payload the Keystone scans to review and sign a tx. */
export function buildXrpSignRequest(tx: KeystoneXrpTx): {
  type: string;
  cbor: string;
} {
  const ur = sdk.xrp.generateSignRequest(tx as any);
  return { type: ur.type, cbor: ur.cbor.toString("hex") };
}

/** Parse the signature QR the Keystone shows after the user approves. */
export function parseKeystoneSignature(type: string, cborHex: string): string {
  return sdk.xrp.parseSignature(urFromScan(type, cborHex) as any);
}
