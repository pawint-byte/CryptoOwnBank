import Slip39 from "slip39";
import * as bip39 from "bip39";

export type GroupSpec = [number, number, string];

export interface GenerateInput {
  masterSecretHex: string;
  passphrase?: string;
  groupThreshold: number;
  groups: GroupSpec[];
  iterationExponent?: number;
  title?: string;
}

export interface GenerateResult {
  shards: Array<{ groupIndex: number; groupLabel: string; memberIndex: number; mnemonic: string }>;
}

function hexToArray(hex: string): number[] {
  const out: number[] = [];
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length");
  for (let i = 0; i < clean.length; i += 2) out.push(parseInt(clean.substr(i, 2), 16));
  return out;
}

function arrayToHex(arr: ArrayLike<number>): string {
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

export function generateShards(input: GenerateInput): GenerateResult {
  const masterSecret = hexToArray(input.masterSecretHex);
  const slip = (Slip39 as any).fromArray(masterSecret, {
    passphrase: input.passphrase || "",
    threshold: input.groupThreshold,
    groups: input.groups,
    iterationExponent: input.iterationExponent ?? 0,
    title: input.title || "CryptoOwnBank SLIP-39",
  });

  const shards: GenerateResult["shards"] = [];
  input.groups.forEach((group, gi) => {
    const [memberThreshold, memberCount, label] = group;
    if (memberThreshold === 1 && memberCount === 1) {
      const m = slip.fromPath(`r/${gi}`).mnemonics[0];
      shards.push({ groupIndex: gi, groupLabel: label, memberIndex: 0, mnemonic: m });
    } else {
      for (let mi = 0; mi < memberCount; mi++) {
        const m = slip.fromPath(`r/${gi}/${mi}`).mnemonics[0];
        shards.push({ groupIndex: gi, groupLabel: label, memberIndex: mi, mnemonic: m });
      }
    }
  });

  return { shards };
}

export function combineShards(mnemonics: string[], passphrase = ""): string {
  const cleaned = mnemonics.map((s) => s.trim().toLowerCase().replace(/\s+/g, " "));
  const recovered = (Slip39 as any).recoverSecret(cleaned, passphrase);
  return arrayToHex(recovered);
}

export function mnemonicToHex(mnemonic: string): string {
  const trimmed = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
  if (!bip39.validateMnemonic(trimmed)) {
    throw new Error("Invalid BIP-39 mnemonic — check spelling and word count (12/15/18/21/24).");
  }
  return bip39.mnemonicToEntropy(trimmed);
}

export function hexToMnemonic(hex: string): string {
  return bip39.entropyToMnemonic(hex);
}

export function isValidBip39(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase().replace(/\s+/g, " "));
}
