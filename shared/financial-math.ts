export function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface TaxLot {
  id: string;
  remainingQuantity: string;
  costBasisPerUnit: string;
  acquiredDate: string;
  assetSymbol: string;
}

export interface SaleEvent {
  quantity: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  isLongTerm: boolean;
  lotId: string;
  sellFromLot: number;
  newLotRemaining: number;
}

export interface SaleResult {
  events: SaleEvent[];
  totalProceeds: number;
  totalCostBasis: number;
  totalGainLoss: number;
  remainingQty: number;
}

export function sortLotsByMethod(lots: TaxLot[], method: "FIFO" | "LIFO"): TaxLot[] {
  return [...lots].sort((a, b) => {
    const dateA = new Date(a.acquiredDate).getTime();
    const dateB = new Date(b.acquiredDate).getTime();
    return method === "LIFO" ? dateB - dateA : dateA - dateB;
  });
}

export function calculateSale(
  lots: TaxLot[],
  sellQuantity: number,
  pricePerUnit: number,
  method: "FIFO" | "LIFO",
  saleDate: Date
): SaleResult {
  const activeLots = lots.filter(l => parseFloat(l.remainingQuantity) > 0);
  const sorted = sortLotsByMethod(activeLots, method);
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  let remaining = sellQuantity;
  let totalProceeds = 0;
  let totalCostBasis = 0;
  const events: SaleEvent[] = [];

  for (const lot of sorted) {
    if (remaining <= 0.0001) break;
    const lotRemaining = parseFloat(lot.remainingQuantity);
    if (lotRemaining <= 0) continue;

    const sellFromLot = round8(Math.min(remaining, lotRemaining));
    const proceeds = round2(sellFromLot * pricePerUnit);
    const costBasis = round2(sellFromLot * parseFloat(lot.costBasisPerUnit));
    const gainLoss = round2(proceeds - costBasis);
    const acquiredDate = new Date(lot.acquiredDate);
    const isLongTerm = (saleDate.getTime() - acquiredDate.getTime()) >= oneYear;

    totalProceeds += proceeds;
    totalCostBasis += costBasis;
    events.push({
      quantity: sellFromLot,
      proceeds,
      costBasis,
      gainLoss,
      isLongTerm,
      lotId: lot.id,
      sellFromLot,
      newLotRemaining: round8(lotRemaining - sellFromLot),
    });
    remaining = round8(remaining - sellFromLot);
  }

  const remainingQty = sorted.reduce((sum, lot) => {
    const lotRem = parseFloat(lot.remainingQuantity);
    const sold = events.find(e => e.lotId === lot.id);
    return sum + (sold ? sold.newLotRemaining : lotRem);
  }, 0);

  return {
    events,
    totalProceeds: round2(totalProceeds),
    totalCostBasis: round2(totalCostBasis),
    totalGainLoss: round2(totalProceeds - totalCostBasis),
    remainingQty: round8(remainingQty),
  };
}

export function calculateAverageCost(lots: TaxLot[]): { averageCost: number; totalCost: number; totalQuantity: number } {
  const activeLots = lots.filter(l => parseFloat(l.remainingQuantity) > 0);
  const totalCost = activeLots.reduce(
    (sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit),
    0
  );
  const totalQuantity = activeLots.reduce(
    (sum, l) => sum + parseFloat(l.remainingQuantity),
    0
  );
  const averageCost = totalQuantity > 0 ? round8(totalCost / totalQuantity) : 0;
  return { averageCost, totalCost: round2(totalCost), totalQuantity: round8(totalQuantity) };
}

export interface PortfolioPosition {
  assetSymbol: string;
  quantity: string;
  totalCostBasis: string;
  averageCost: string;
  isAddressed?: boolean;
}

export interface WalletBalance {
  assetSymbol: string;
  usdValue: string | null;
}

export function calculatePortfolioValue(
  positions: PortfolioPosition[],
  walletBalances: WalletBalance[],
  priceLookup: Record<string, number>
): {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  allocation: { name: string; value: number }[];
} {
  let totalValue = 0;
  let totalCostBasis = 0;
  const allocationMap = new Map<string, number>();

  for (const pos of positions) {
    if (pos.isAddressed) continue;
    const qty = parseFloat(pos.quantity) || 0;
    const costBasis = parseFloat(pos.totalCostBasis) || 0;
    let currentPrice = priceLookup[pos.assetSymbol.toUpperCase()] || 0;

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      currentPrice = parseFloat(pos.averageCost) || 0;
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      currentPrice = qty > 0 ? costBasis / qty : 0;
    }

    const value = Number.isFinite(qty * currentPrice) ? qty * currentPrice : 0;
    totalValue += value;
    totalCostBasis += costBasis;
    allocationMap.set(pos.assetSymbol, (allocationMap.get(pos.assetSymbol) || 0) + value);
  }

  for (const wb of walletBalances) {
    const usdVal = parseFloat(wb.usdValue || "0");
    if (Number.isFinite(usdVal) && usdVal > 0) {
      totalValue += usdVal;
      allocationMap.set(wb.assetSymbol, (allocationMap.get(wb.assetSymbol) || 0) + usdVal);
    }
  }

  const totalGainLoss = round2(totalValue - totalCostBasis);
  const totalGainLossPercent = totalCostBasis > 0 ? round2((totalGainLoss / totalCostBasis) * 100) : 0;

  const allocation = Array.from(allocationMap.entries()).map(([name, value]) => ({
    name,
    value: round2(value),
  }));

  return { totalValue: round2(totalValue), totalCostBasis: round2(totalCostBasis), totalGainLoss, totalGainLossPercent, allocation };
}

export function calculateGainLossPercent(currentValue: number, costBasis: number): number {
  if (costBasis <= 0) return 0;
  return round2(((currentValue - costBasis) / costBasis) * 100);
}

export function isLongTermHolding(acquiredDate: Date, soldDate: Date): boolean {
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  return (soldDate.getTime() - acquiredDate.getTime()) >= oneYear;
}
