const RWA_RATE_CACHE: {
  data: Record<string, any> | null;
  lastFetch: number;
} = { data: null, lastFetch: 0 };

const CACHE_TTL = 30 * 60 * 1000;

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<any> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CryptoOwnBank/1.0)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function fetchDefiLlamaPoolRates(): Promise<Record<string, any>> {
  const rates: Record<string, any> = {};
  try {
    const data = await fetchWithTimeout("https://yields.llama.fi/pools");
    if (!data?.data) return rates;

    const targetPools: Record<string, { project: string; chain?: string; symbol?: string }> = {
      "ondo-usdy": { project: "ondo", symbol: "USDY" },
      "ondo-ousg": { project: "ondo", symbol: "OUSG" },
      "maple": { project: "maple" },
      "centrifuge": { project: "centrifuge" },
      "morpho-blue": { project: "morpho" },
      "aave-usdc": { project: "aave", symbol: "USDC" },
      "compound-usdc": { project: "compound", symbol: "USDC" },
      "spark-dai": { project: "spark" },
      "yearn-usdc": { project: "yearn", symbol: "USDC" },
    };

    for (const pool of data.data) {
      if (!pool.project || !pool.apy) continue;
      const projectLower = pool.project.toLowerCase();
      const symbolUpper = (pool.symbol || "").toUpperCase();

      for (const [key, target] of Object.entries(targetPools)) {
        if (rates[key]) continue;
        if (!projectLower.includes(target.project)) continue;
        if (target.symbol && !symbolUpper.includes(target.symbol)) continue;
        if (target.chain && pool.chain?.toLowerCase() !== target.chain) continue;

        if (pool.tvlUsd && pool.tvlUsd > 100000) {
          rates[key] = {
            apy: Math.round(pool.apy * 100) / 100,
            tvl: pool.tvlUsd,
            chain: pool.chain,
            symbol: pool.symbol,
            project: pool.project,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[rwa-rates] DefiLlama fetch error:", err);
  }
  return rates;
}

export async function getRwaLiveRates(): Promise<Record<string, any>> {
  const now = Date.now();
  if (RWA_RATE_CACHE.data && now - RWA_RATE_CACHE.lastFetch < CACHE_TTL) {
    return RWA_RATE_CACHE.data;
  }

  const defiLlamaRates = await fetchDefiLlamaPoolRates();

  const result: Record<string, any> = {
    ...defiLlamaRates,
    "soil-liquid": { apy: 5.0, source: "protocol", chain: "XRPL" },
    "soil-credit": { apy: 8.0, source: "protocol", chain: "XRPL" },
    "xdc-tradefi": { apy: 7.0, source: "estimate", chain: "XDC" },
  };

  RWA_RATE_CACHE.data = result;
  RWA_RATE_CACHE.lastFetch = now;

  console.log(`[rwa-rates] Updated ${Object.keys(result).length} RWA protocol rates`);
  return result;
}
