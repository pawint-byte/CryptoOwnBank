export interface NormalizedWalletBalance {
  assetSymbol: string;
  balance: string;
  usdValue: string;
}

export type WalletSyncStatus = "unavailable" | "partial" | "complete";

const PARTIAL_ENUMERATION_CHAINS = new Set([
  "ethereum",
  "solana",
  "xrp",
  "flare",
  "cardano",
  "avalanche",
  "bsc",
  "cosmos",
  "tron",
  "hedera",
  "cronos",
  "ton",
  "stellar",
  "xdc",
  "polygon",
  "base",
  "arbitrum",
  "optimism",
]);

export function classifyWalletSyncResult(
  chain: string,
  validBalanceCount: number,
): WalletSyncStatus {
  if (validBalanceCount === 0) return "unavailable";
  return PARTIAL_ENUMERATION_CHAINS.has(chain.toLowerCase()) ? "partial" : "complete";
}

export function normalizeWalletBalance(
  input: { symbol?: unknown; balance?: unknown; usdValue?: unknown },
): NormalizedWalletBalance | null {
  const assetSymbol = typeof input.symbol === "string"
    ? input.symbol.trim().toUpperCase()
    : "";
  const numericBalance = Number(input.balance);
  const numericUsdValue = Number(input.usdValue);

  if (
    !assetSymbol
    || !Number.isFinite(numericBalance)
    || numericBalance < 0
    || !Number.isFinite(numericUsdValue)
    || numericUsdValue < 0
  ) {
    return null;
  }

  return {
    assetSymbol,
    balance: numericBalance.toString(),
    usdValue: numericUsdValue.toFixed(2),
  };
}

export function normalizeNewsFields(input: {
  title?: unknown;
  snippet?: unknown;
  categories?: unknown;
}): { title: string; snippet: string; categories: string[]; searchText: string } {
  const title = typeof input.title === "string" ? input.title : "";
  const snippet = typeof input.snippet === "string" ? input.snippet : "";
  const categories = Array.isArray(input.categories)
    ? input.categories.filter((category): category is string => typeof category === "string")
    : [];

  return {
    title,
    snippet,
    categories,
    searchText: `${title} ${snippet} ${categories.join(" ")}`.toLowerCase(),
  };
}