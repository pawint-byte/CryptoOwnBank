import { describe, expect, it } from "vitest";
import Slip39 from "slip39";
import * as bip39 from "bip39";
import { entropyHexToSlip39MasterSecret } from "../server/lib/slip39-master-secret";

describe("SLIP-39 sandbox generation and recovery", () => {
  it.each([
    ["12-word", "00000000000000000000000000000000"],
    ["24-word", "0000000000000000000000000000000000000000000000000000000000000000"],
  ])("recovers the original %s test mnemonic from threshold shares", (_label, entropyHex) => {
    const testMnemonic = bip39.entropyToMnemonic(entropyHex);
    const masterSecret = entropyHexToSlip39MasterSecret(entropyHex);

    expect(Array.isArray(masterSecret)).toBe(true);
    expect(Buffer.isBuffer(masterSecret)).toBe(false);

    const slip = (Slip39 as any).fromArray(masterSecret, {
      passphrase: "",
      threshold: 1,
      groups: [[2, 3, "Test group"]],
      title: "CryptoOwnBank SLIP-39 Sandbox",
    });

    const thresholdShares = [
      slip.fromPath("r/0/0").mnemonics[0],
      slip.fromPath("r/0/1").mnemonics[0],
    ];
    const expectedShareWords = entropyHex.length === 32 ? 20 : 33;
    expect(thresholdShares.map((share) => share.split(/\s+/).length)).toEqual([
      expectedShareWords,
      expectedShareWords,
    ]);
    const recovered = (Slip39 as any).recoverSecret(thresholdShares, "");
    const recoveredMnemonic = bip39.entropyToMnemonic(
      Buffer.from(recovered).toString("hex"),
    );

    expect(recoveredMnemonic).toBe(testMnemonic);
  });
});