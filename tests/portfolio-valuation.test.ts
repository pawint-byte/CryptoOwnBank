import { describe, expect, it } from "vitest";
import { resolveWalletValuation } from "../server/services/portfolio-valuation";

describe("resolveWalletValuation", () => {
  it("does not invent current value from cost basis when a token has no market price", () => {
    const result = resolveWalletValuation({
      balance: "312561978.49724",
      reportedUsdValue: "0",
      marketPrice: 0,
      storedCostBasis: "492775151426.79",
    });

    expect(result.currentValue).toBe(0);
    expect(result.currentPrice).toBe(0);
  });

  it("uses linked remaining tax lots instead of stale stored wallet cost basis", () => {
    const result = resolveWalletValuation({
      balance: "312561978.49724",
      reportedUsdValue: "0",
      marketPrice: 0,
      storedCostBasis: "492775151426.79",
      linkedLotCostBasis: 0,
    });

    expect(result.costBasis).toBe(0);
  });

  it("uses a real market price when the provider returns one", () => {
    const result = resolveWalletValuation({
      balance: "10",
      reportedUsdValue: "0",
      marketPrice: "2.50",
      storedCostBasis: "20",
    });

    expect(result.currentValue).toBe(25);
    expect(result.currentPrice).toBe(2.5);
    expect(result.costBasis).toBe(20);
  });
});