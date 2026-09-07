import { describe, expect, it } from "vitest";
import { normalizeSwapMemo, validateSwapMemo } from "../shared/swap-memo";

describe("Swap Any Pair memo defaults", () => {
  it.each(["XRP", "XLM"])("defaults a missing %s memo/tag to 0", (symbol) => {
    expect(normalizeSwapMemo(symbol, "")).toBe("0");
    expect(validateSwapMemo(symbol, "")).toBeNull();
  });

  it("rejects an invalid XRP destination tag before submit", () => {
    expect(validateSwapMemo("XRP", "not-a-tag")).toMatch(/whole number/i);
    expect(validateSwapMemo("XRP", "4294967296")).toMatch(/between 0 and 4294967295/i);
  });
});