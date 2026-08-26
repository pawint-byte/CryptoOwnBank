import { describe, expect, it } from "vitest";
import {
  normalizeNewsFields,
  normalizeWalletBalance,
} from "../server/services/sync-data-normalization";

describe("normalizeWalletBalance", () => {
  it("normalizes a valid balance for an ownership-aware upsert", () => {
    expect(normalizeWalletBalance({
      symbol: " xrp ",
      balance: 12.5,
      usdValue: 25.678,
    })).toEqual({
      assetSymbol: "XRP",
      balance: "12.5",
      usdValue: "25.68",
    });
  });

  it.each([
    { symbol: "", balance: 1, usdValue: 1 },
    { symbol: "ETH", balance: Number.NaN, usdValue: 1 },
    { symbol: "ETH", balance: -1, usdValue: 1 },
    { symbol: "ETH", balance: 1, usdValue: Number.POSITIVE_INFINITY },
    { symbol: "ETH", balance: 1, usdValue: -1 },
  ])("rejects invalid provider output: %o", (input) => {
    expect(normalizeWalletBalance(input)).toBeNull();
  });
});

describe("normalizeNewsFields", () => {
  it("tolerates missing or malformed feed metadata", () => {
    expect(normalizeNewsFields({
      title: null,
      snippet: undefined,
      categories: null,
    })).toEqual({
      title: "",
      snippet: "",
      categories: [],
      searchText: "  ",
    });
  });

  it("keeps only string categories and builds lowercase search text", () => {
    expect(normalizeNewsFields({
      title: "XRP Adoption",
      snippet: "RLUSD expands",
      categories: ["Payments", null, 123],
    })).toEqual({
      title: "XRP Adoption",
      snippet: "RLUSD expands",
      categories: ["Payments"],
      searchText: "xrp adoption rlusd expands payments",
    });
  });
});