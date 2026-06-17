export type TokenSource = "cryptoownbank" | "lifi";

export interface CatalogToken {
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  source: TokenSource;
  verified: boolean;
}

export interface LifiTokenLike {
  address: string;
  chainId?: number;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
  verificationStatus?: string;
}

interface GrandfatheredToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Our hand-curated, grandfathered token list. Every entry here is treated as
// CryptoOwnBank-verified (we vetted it). The open approved feed (LI.FI) is
// merged on top of this — ours always win on dedupe and keep the verified mark.
export const GRANDFATHERED_TOKENS: Record<number, GrandfatheredToken[]> = {
  1: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  ],
  137: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "POL", name: "POL", decimals: 18 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether", decimals: 6 },
  ],
  42161: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether", decimals: 6 },
  ],
  10: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  8453: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  43114: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "AVAX", name: "Avalanche", decimals: 18 },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  56: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "BNB", name: "BNB", decimals: 18 },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
  ],
};

export function grandfatheredFor(chainId: number): CatalogToken[] {
  return (GRANDFATHERED_TOKENS[chainId] || []).map((t) => ({
    ...t,
    chainId,
    source: "cryptoownbank" as const,
    verified: true,
  }));
}

// Merge our grandfathered list with the open approved feed.
// Dedupe by lowercased address — our verified entries always take precedence,
// everything else flows in from the feed automatically (no manual upkeep).
export function mergeCatalog(chainId: number, feed: LifiTokenLike[] | undefined): CatalogToken[] {
  const ours = grandfatheredFor(chainId);
  const seen = new Set(ours.map((t) => t.address.toLowerCase()));
  const merged: CatalogToken[] = [...ours];
  for (const t of feed || []) {
    // Only take the open APPROVED tokens — drop anything LI.FI flags as not verified.
    if ((t.verificationStatus ?? "verified") !== "verified") continue;
    const key = t.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      address: t.address,
      chainId,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoURI: t.logoURI,
      source: "lifi",
      verified: false,
    });
  }
  return merged;
}
