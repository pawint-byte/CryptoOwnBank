export interface WalletValuationInput {
  balance: string | number | null | undefined;
  reportedUsdValue: string | number | null | undefined;
  marketPrice: string | number | null | undefined;
  storedCostBasis: string | number | null | undefined;
  linkedLotCostBasis?: number;
}

function finiteNonNegative(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : parseFloat(value || "0");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function resolveWalletValuation(input: WalletValuationInput) {
  const balance = finiteNonNegative(input.balance);
  const reportedUsdValue = finiteNonNegative(input.reportedUsdValue);
  const marketPrice = finiteNonNegative(input.marketPrice);
  const storedCostBasis = finiteNonNegative(input.storedCostBasis);
  const linkedLotCostBasis = input.linkedLotCostBasis;

  const currentValue = reportedUsdValue > 0
    ? reportedUsdValue
    : balance > 0 && marketPrice > 0
      ? balance * marketPrice
      : 0;

  const costBasis = linkedLotCostBasis === undefined
    ? storedCostBasis
    : finiteNonNegative(linkedLotCostBasis);

  return {
    balance,
    currentValue,
    currentPrice: balance > 0 ? currentValue / balance : 0,
    costBasis,
  };
}