import { describe, expect, it } from "vitest";
import Slip39 from "slip39";
import { combineShards } from "../client/src/lib/slip39-client";

function makeThresholdShares(byteLength: 16 | 32): string[] {
  const secret = Array.from({ length: byteLength }, (_, index) => index);
  const slip = (Slip39 as any).fromArray(secret, {
    passphrase: "",
    threshold: 1,
    groups: [[2, 3, "Test group"]],
    title: "SLIP-39 validation test",
  });
  return [
    slip.fromPath("r/0/0").mnemonics[0],
    slip.fromPath("r/0/1").mnemonics[0],
  ];
}

describe("SLIP-39 shard length validation", () => {
  it.each([
    [16, 20],
    [32, 33],
  ] as const)("accepts %i-byte secrets encoded as %i-word shares", (byteLength, expectedWords) => {
    const shares = makeThresholdShares(byteLength);
    expect(shares[0].split(/\s+/)).toHaveLength(expectedWords);
    expect(combineShards(shares)).toBe(
      Array.from({ length: byteLength }, (_, index) => index.toString(16).padStart(2, "0")).join(""),
    );
  });

  it("rejects shard lengths that cannot represent supported sandbox entropy", () => {
    expect(() => combineShards(["word ".repeat(19), "word ".repeat(19)])).toThrow(
      "Expected 20 words for a 128-bit secret or 33 words for a 256-bit secret",
    );
  });
});