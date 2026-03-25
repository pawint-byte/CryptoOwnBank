export interface XrplToken {
  symbol: string;
  currency: string;
  issuer: string | null;
  gateway: string;
  category: string;
}

const SOLO_ISSUER = "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz";
const GATEHUB_BTC = "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL";
const GATEHUB_ETH = "rcA8X3TVMST1n3CJeAdGk1RdRCHii7N2h";
const GATEHUB_SOL = "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL";
const GATEHUB_LTC = "rcRzGWq6Ng3jeYhqnmM4zcWcUh69hrQ8V";
const GATEHUB_DOGE = "rLqUC2eCPohYvJCEBJ77eCCqVL2uEiczjA";
const GATEHUB_XLM = "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y";
const CORE_ISSUER = "rcoreNywaoz2ZCQ8Lg2EbSLnGuRBmun6D";
const ELS_ISSUER = "rHXuEaRYnnJHbDeuBH5w8yPh5uwNVh5zAg";
const CSC_ISSUER = "rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const BITSTAMP_USD = "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B";
const GATEHUB_EUR = "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq";

function hex(name: string): string {
  return Buffer.from(name.padEnd(20, "\0")).toString("hex").toUpperCase().slice(0, 40);
}

export const XRPL_TRADEABLE_TOKENS: XrplToken[] = [
  { symbol: "XRP", currency: "XRP", issuer: null, gateway: "Native", category: "Layer 1" },
  { symbol: "RLUSD", currency: hex("RLUSD"), issuer: RLUSD_ISSUER, gateway: "Ripple", category: "Stablecoin" },

  { symbol: "BTC", currency: "BTC", issuer: GATEHUB_BTC, gateway: "GateHub", category: "Layer 1" },
  { symbol: "ETH", currency: "ETH", issuer: GATEHUB_ETH, gateway: "GateHub", category: "Smart Contracts" },
  { symbol: "SOL", currency: "SOL", issuer: GATEHUB_SOL, gateway: "GateHub", category: "Layer 1" },
  { symbol: "LTC", currency: "LTC", issuer: GATEHUB_LTC, gateway: "GateHub", category: "Layer 1" },
  { symbol: "DOGE", currency: "DOG", issuer: GATEHUB_DOGE, gateway: "GateHub", category: "Memecoin" },
  { symbol: "XLM", currency: "XLM", issuer: GATEHUB_XLM, gateway: "GateHub", category: "Finance" },

  { symbol: "SOLO", currency: hex("SOLO"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Finance" },
  { symbol: "CORE", currency: hex("CORE"), issuer: CORE_ISSUER, gateway: "Coreum", category: "Layer 1" },
  { symbol: "ELS", currency: hex("ELS"), issuer: ELS_ISSUER, gateway: "Elysian", category: "DeFi" },
  { symbol: "CSC", currency: "CSC", issuer: CSC_ISSUER, gateway: "CasinoCoin", category: "Gaming" },

  { symbol: "ADA", currency: "ADA", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "VET", currency: "VET", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Supply Chain" },
  { symbol: "ZIL", currency: "ZIL", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "XDC", currency: "XDC", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Finance" },
  { symbol: "SHIB", currency: hex("SHIB"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Memecoin" },
  { symbol: "HBAR", currency: hex("HBAR"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "DGB", currency: "DGB", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "CRO", currency: "CRO", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Finance" },
  { symbol: "EOS", currency: "EOS", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "FLR", currency: "FLR", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Smart Contracts" },
  { symbol: "ICP", currency: "ICP", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Internet" },
  { symbol: "LINK", currency: hex("LINK"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Oracle" },
  { symbol: "ONDO", currency: hex("ONDO"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "RWA" },
  { symbol: "TON", currency: "TON", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "SUI", currency: "SUI", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "TRX", currency: "TRX", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "DOT", currency: "DOT", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "AVAX", currency: hex("AVAX"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "ATOM", currency: hex("ATOM"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "ALGO", currency: hex("ALGO"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "NEAR", currency: hex("NEAR"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "APT", currency: "APT", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 1" },
  { symbol: "PEPE", currency: hex("PEPE"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Memecoin" },
  { symbol: "BONK", currency: hex("BONK"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Memecoin" },
  { symbol: "UNI", currency: "UNI", issuer: SOLO_ISSUER, gateway: "Sologenic", category: "DeFi" },
  { symbol: "AAVE", currency: hex("AAVE"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "DeFi" },
  { symbol: "MATIC", currency: hex("MATIC"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Layer 2" },
  { symbol: "ZBCN", currency: hex("ZBCN"), issuer: SOLO_ISSUER, gateway: "Sologenic", category: "Finance" },
];

const tokenMap = new Map<string, XrplToken>();
for (const token of XRPL_TRADEABLE_TOKENS) {
  tokenMap.set(token.symbol.toUpperCase(), token);
}

export function getXrplToken(symbol: string): XrplToken | undefined {
  return tokenMap.get(symbol.toUpperCase());
}

export function isXrplTradeable(symbol: string): boolean {
  return tokenMap.has(symbol.toUpperCase());
}

export function getXrplTradeableSymbols(): string[] {
  return XRPL_TRADEABLE_TOKENS.map(t => t.symbol);
}

export function getXrplTokensByCategory(category: string): XrplToken[] {
  return XRPL_TRADEABLE_TOKENS.filter(t => t.category === category);
}
