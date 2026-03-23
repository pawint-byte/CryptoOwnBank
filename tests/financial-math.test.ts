import { describe, it, expect } from "vitest";
import {
  sortLotsByMethod,
  calculateSale,
  calculateAverageCost,
  calculatePortfolioValue,
  calculateGainLossPercent,
  isLongTermHolding,
  type TaxLot,
} from "../shared/financial-math";

const makeLot = (
  id: string,
  qty: string,
  cost: string,
  date: string,
  symbol = "BTC"
): TaxLot => ({
  id,
  remainingQuantity: qty,
  costBasisPerUnit: cost,
  acquiredDate: date,
  assetSymbol: symbol,
});

describe("sortLotsByMethod", () => {
  const lots = [
    makeLot("a", "1", "100", "2024-01-15"),
    makeLot("b", "2", "200", "2023-06-01"),
    makeLot("c", "3", "150", "2024-07-20"),
  ];

  it("FIFO sorts oldest first", () => {
    const sorted = sortLotsByMethod(lots, "FIFO");
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("a");
    expect(sorted[2].id).toBe("c");
  });

  it("LIFO sorts newest first", () => {
    const sorted = sortLotsByMethod(lots, "LIFO");
    expect(sorted[0].id).toBe("c");
    expect(sorted[1].id).toBe("a");
    expect(sorted[2].id).toBe("b");
  });

  it("does not mutate the original array", () => {
    const original = [...lots];
    sortLotsByMethod(lots, "LIFO");
    expect(lots).toEqual(original);
  });
});

describe("calculateSale — FIFO", () => {
  const lots = [
    makeLot("lot1", "2", "100", "2023-01-01"),
    makeLot("lot2", "3", "200", "2024-03-15"),
    makeLot("lot3", "5", "300", "2024-09-01"),
  ];
  const saleDate = new Date("2025-06-01");

  it("sells from the oldest lot first", () => {
    const result = calculateSale(lots, 1.5, 500, "FIFO", saleDate);
    expect(result.events.length).toBe(1);
    expect(result.events[0].lotId).toBe("lot1");
    expect(result.events[0].sellFromLot).toBe(1.5);
  });

  it("calculates proceeds correctly", () => {
    const result = calculateSale(lots, 2, 500, "FIFO", saleDate);
    expect(result.totalProceeds).toBe(1000);
  });

  it("calculates cost basis correctly", () => {
    const result = calculateSale(lots, 2, 500, "FIFO", saleDate);
    expect(result.totalCostBasis).toBe(200);
  });

  it("calculates gain/loss correctly", () => {
    const result = calculateSale(lots, 2, 500, "FIFO", saleDate);
    expect(result.totalGainLoss).toBe(800);
  });

  it("spans multiple lots when selling more than one lot holds", () => {
    const result = calculateSale(lots, 4, 500, "FIFO", saleDate);
    expect(result.events.length).toBe(2);
    expect(result.events[0].lotId).toBe("lot1");
    expect(result.events[0].sellFromLot).toBe(2);
    expect(result.events[1].lotId).toBe("lot2");
    expect(result.events[1].sellFromLot).toBe(2);
  });

  it("sells across all lots when selling entire position", () => {
    const result = calculateSale(lots, 10, 500, "FIFO", saleDate);
    expect(result.events.length).toBe(3);
    expect(result.totalProceeds).toBe(5000);
    expect(result.totalCostBasis).toBe(2 * 100 + 3 * 200 + 5 * 300);
    expect(result.remainingQty).toBeCloseTo(0, 4);
  });

  it("marks long-term gains correctly (held >1 year)", () => {
    const result = calculateSale(lots, 2, 500, "FIFO", saleDate);
    expect(result.events[0].isLongTerm).toBe(true);
  });

  it("marks short-term gains correctly (held <1 year)", () => {
    const shortSaleDate = new Date("2024-12-01");
    const result = calculateSale(lots, 4, 500, "FIFO", shortSaleDate);
    expect(result.events[1].isLongTerm).toBe(false);
  });

  it("handles selling a loss correctly", () => {
    const result = calculateSale(lots, 2, 50, "FIFO", saleDate);
    expect(result.totalGainLoss).toBe(-100);
    expect(result.events[0].gainLoss).toBe(-100);
  });

  it("handles zero price sale", () => {
    const result = calculateSale(lots, 1, 0, "FIFO", saleDate);
    expect(result.totalProceeds).toBe(0);
    expect(result.totalGainLoss).toBe(-100);
  });

  it("skips lots with zero remaining quantity", () => {
    const lotsWithEmpty = [
      makeLot("empty", "0", "100", "2022-01-01"),
      makeLot("full", "5", "200", "2024-01-01"),
    ];
    const result = calculateSale(lotsWithEmpty, 2, 500, "FIFO", saleDate);
    expect(result.events.length).toBe(1);
    expect(result.events[0].lotId).toBe("full");
  });
});

describe("calculateSale — LIFO", () => {
  const lots = [
    makeLot("old", "3", "100", "2023-01-01"),
    makeLot("new", "2", "400", "2025-03-01"),
  ];
  const saleDate = new Date("2025-06-01");

  it("sells from the newest lot first", () => {
    const result = calculateSale(lots, 1.5, 500, "LIFO", saleDate);
    expect(result.events.length).toBe(1);
    expect(result.events[0].lotId).toBe("new");
  });

  it("calculates higher cost basis with LIFO on recent expensive lots", () => {
    const result = calculateSale(lots, 2, 500, "LIFO", saleDate);
    expect(result.totalCostBasis).toBe(800);
    expect(result.totalGainLoss).toBe(200);
  });

  it("LIFO vs FIFO gives different gain/loss for same quantity", () => {
    const fifo = calculateSale(lots, 2, 500, "FIFO", saleDate);
    const lifo = calculateSale(lots, 2, 500, "LIFO", saleDate);
    expect(fifo.totalCostBasis).not.toBe(lifo.totalCostBasis);
    expect(fifo.totalGainLoss).not.toBe(lifo.totalGainLoss);
  });
});

describe("calculateAverageCost", () => {
  it("calculates weighted average cost", () => {
    const lots = [
      makeLot("a", "2", "100", "2024-01-01"),
      makeLot("b", "3", "200", "2024-06-01"),
    ];
    const result = calculateAverageCost(lots);
    expect(result.totalQuantity).toBe(5);
    expect(result.totalCost).toBe(800);
    expect(result.averageCost).toBe(160);
  });

  it("ignores lots with zero quantity", () => {
    const lots = [
      makeLot("empty", "0", "100", "2024-01-01"),
      makeLot("full", "4", "250", "2024-06-01"),
    ];
    const result = calculateAverageCost(lots);
    expect(result.totalQuantity).toBe(4);
    expect(result.averageCost).toBe(250);
  });

  it("returns zero when no active lots", () => {
    const lots = [makeLot("empty", "0", "100", "2024-01-01")];
    const result = calculateAverageCost(lots);
    expect(result.averageCost).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.totalQuantity).toBe(0);
  });

  it("handles single lot", () => {
    const lots = [makeLot("a", "10", "55.50", "2024-01-01")];
    const result = calculateAverageCost(lots);
    expect(result.averageCost).toBe(55.5);
    expect(result.totalCost).toBe(555);
  });

  it("handles fractional quantities", () => {
    const lots = [
      makeLot("a", "0.5", "60000", "2024-01-01"),
      makeLot("b", "0.25", "70000", "2024-06-01"),
    ];
    const result = calculateAverageCost(lots);
    expect(result.totalQuantity).toBeCloseTo(0.75, 8);
    expect(result.totalCost).toBeCloseTo(47500, 2);
    expect(result.averageCost).toBeCloseTo(63333.33, 0);
  });
});

describe("calculatePortfolioValue", () => {
  it("calculates total value from positions and prices", () => {
    const positions = [
      { assetSymbol: "BTC", quantity: "2", totalCostBasis: "50000", averageCost: "25000" },
      { assetSymbol: "ETH", quantity: "10", totalCostBasis: "15000", averageCost: "1500" },
    ];
    const priceLookup = { BTC: 60000, ETH: 3000 };
    const result = calculatePortfolioValue(positions, [], priceLookup);
    expect(result.totalValue).toBe(150000);
    expect(result.totalCostBasis).toBe(65000);
    expect(result.totalGainLoss).toBe(85000);
  });

  it("includes wallet balances in total value", () => {
    const positions = [
      { assetSymbol: "XRP", quantity: "1000", totalCostBasis: "500", averageCost: "0.50" },
    ];
    const walletBals = [{ assetSymbol: "RLUSD", usdValue: "5000" }];
    const priceLookup = { XRP: 2.5 };
    const result = calculatePortfolioValue(positions, walletBals, priceLookup);
    expect(result.totalValue).toBe(7500);
    expect(result.allocation.length).toBe(2);
  });

  it("skips addressed positions", () => {
    const positions = [
      { assetSymbol: "BTC", quantity: "1", totalCostBasis: "50000", averageCost: "50000", isAddressed: true },
      { assetSymbol: "ETH", quantity: "5", totalCostBasis: "10000", averageCost: "2000" },
    ];
    const priceLookup = { BTC: 60000, ETH: 3000 };
    const result = calculatePortfolioValue(positions, [], priceLookup);
    expect(result.totalValue).toBe(15000);
  });

  it("falls back to averageCost when price not in lookup", () => {
    const positions = [
      { assetSymbol: "OBSCURE", quantity: "100", totalCostBasis: "1000", averageCost: "10" },
    ];
    const result = calculatePortfolioValue(positions, [], {});
    expect(result.totalValue).toBe(1000);
  });

  it("falls back to costBasis/qty when no price or avgCost", () => {
    const positions = [
      { assetSymbol: "TOKEN", quantity: "50", totalCostBasis: "500", averageCost: "0" },
    ];
    const result = calculatePortfolioValue(positions, [], {});
    expect(result.totalValue).toBe(500);
  });

  it("handles zero quantity position", () => {
    const positions = [
      { assetSymbol: "BTC", quantity: "0", totalCostBasis: "0", averageCost: "0" },
    ];
    const result = calculatePortfolioValue(positions, [], { BTC: 60000 });
    expect(result.totalValue).toBe(0);
  });

  it("calculates gain/loss percent correctly", () => {
    const positions = [
      { assetSymbol: "BTC", quantity: "1", totalCostBasis: "40000", averageCost: "40000" },
    ];
    const result = calculatePortfolioValue(positions, [], { BTC: 60000 });
    expect(result.totalGainLossPercent).toBeCloseTo(50, 1);
  });

  it("handles negative gain (loss)", () => {
    const positions = [
      { assetSymbol: "BTC", quantity: "1", totalCostBasis: "60000", averageCost: "60000" },
    ];
    const result = calculatePortfolioValue(positions, [], { BTC: 40000 });
    expect(result.totalGainLoss).toBe(-20000);
    expect(result.totalGainLossPercent).toBeCloseTo(-33.33, 1);
  });

  it("aggregates allocation for same asset from multiple sources", () => {
    const positions = [
      { assetSymbol: "XRP", quantity: "1000", totalCostBasis: "500", averageCost: "0.50" },
    ];
    const walletBals = [{ assetSymbol: "XRP", usdValue: "2500" }];
    const result = calculatePortfolioValue(positions, walletBals, { XRP: 2.5 });
    const xrpAlloc = result.allocation.find(a => a.name === "XRP");
    expect(xrpAlloc?.value).toBe(5000);
  });

  it("skips wallet balances with null/zero usdValue", () => {
    const walletBals = [
      { assetSymbol: "DEAD", usdValue: null },
      { assetSymbol: "ZERO", usdValue: "0" },
    ];
    const result = calculatePortfolioValue([], walletBals, {});
    expect(result.totalValue).toBe(0);
    expect(result.allocation.length).toBe(0);
  });
});

describe("calculateGainLossPercent", () => {
  it("calculates positive gain percent", () => {
    expect(calculateGainLossPercent(150, 100)).toBe(50);
  });

  it("calculates negative loss percent", () => {
    expect(calculateGainLossPercent(80, 100)).toBe(-20);
  });

  it("returns 0 when cost basis is zero", () => {
    expect(calculateGainLossPercent(100, 0)).toBe(0);
  });

  it("returns 0 when cost basis is negative", () => {
    expect(calculateGainLossPercent(100, -50)).toBe(0);
  });

  it("handles break-even", () => {
    expect(calculateGainLossPercent(100, 100)).toBe(0);
  });
});

describe("isLongTermHolding", () => {
  it("returns true for exactly 365 days", () => {
    const acquired = new Date("2024-01-01");
    const sold = new Date("2025-01-01");
    expect(isLongTermHolding(acquired, sold)).toBe(true);
  });

  it("returns false for 364 days", () => {
    const acquired = new Date("2025-01-01");
    const sold = new Date("2025-12-31");
    expect(isLongTermHolding(acquired, sold)).toBe(false);
  });

  it("returns true for multi-year holding", () => {
    const acquired = new Date("2020-06-15");
    const sold = new Date("2025-03-01");
    expect(isLongTermHolding(acquired, sold)).toBe(true);
  });

  it("returns false for same-day sale", () => {
    const date = new Date("2025-03-01");
    expect(isLongTermHolding(date, date)).toBe(false);
  });
});
