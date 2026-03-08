import { storage } from "../storage";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", XDC: "xdcinnetwork", MATIC: "polygon-ecosystem-token",
  SOL: "solana", XRP: "ripple", ADA: "cardano", DOT: "polkadot", TRX: "tron",
  ALGO: "algorand", XLM: "stellar", DOGE: "dogecoin", LTC: "litecoin", BNB: "binancecoin",
  AVAX: "avalanche-2", FTM: "fantom", XVG: "verge", DGB: "digibyte", USDT: "tether",
  USDC: "usd-coin", CRO: "crypto-com-chain", HBAR: "hedera-hashgraph", VET: "vechain",
  ZIL: "zilliqa", CKB: "nervos-network", CSPR: "casper-network", TON: "the-open-network",
};

const KNOWN_PROTOCOLS = [
  "lido", "rocket-pool", "aave", "jito", "benqi", "marinade", "compound",
  "morpho", "spark", "eigen", "ankr", "stakewise", "frax-ether", "stader",
  "coinbase-wrapped-staked-eth", "binance-staked-eth", "yearn", "curve",
];

const TRACKED_YIELD_SYMBOLS = ["ETH", "SOL", "MATIC", "AVAX", "ADA", "DOT", "BNB", "XRP", "USDC", "USDT"];

async function fetchWithUA(url: string): Promise<any> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CryptoOwnBank/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  return resp.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithUA(url);
    } catch (err: any) {
      if (err?.message?.includes("429") && attempt < retries) {
        const backoff = (attempt + 1) * 10000;
        console.log(`[market-data] Rate limited, waiting ${backoff / 1000}s before retry...`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function fetchCoinGeckoPrices(): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  const entries = Object.entries(COINGECKO_IDS);

  const ids = entries.map(([_, id]) => id).join(",");
  try {
    const data = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    for (const [symbol, cgId] of entries) {
      if (data[cgId]) {
        results[symbol] = {
          usd: data[cgId].usd,
          usd_24h_change: data[cgId].usd_24h_change,
        };
      }
    }
  } catch (err) {
    console.warn(`[market-data] CoinGecko fetch error:`, err);
  }
  return results;
}

async function fetchDefiLlamaYields(): Promise<Record<string, any[]>> {
  const results: Record<string, any[]> = {};
  try {
    const data = await fetchWithUA("https://yields.llama.fi/pools");
    if (!data?.data) return results;

    const pools = data.data.filter((pool: any) => {
      if (!pool.symbol || !pool.tvlUsd || pool.tvlUsd < 1_000_000) return false;
      const sym = pool.symbol.toUpperCase();
      const matchesSymbol = TRACKED_YIELD_SYMBOLS.some(s => sym.includes(s));
      if (!matchesSymbol) return false;
      const projectLower = (pool.project || "").toLowerCase();
      return KNOWN_PROTOCOLS.some(p => projectLower.includes(p));
    });

    for (const pool of pools) {
      const sym = pool.symbol.toUpperCase();
      const matchedSymbol = TRACKED_YIELD_SYMBOLS.find(s => sym.includes(s));
      if (!matchedSymbol) continue;

      if (!results[matchedSymbol]) results[matchedSymbol] = [];
      results[matchedSymbol].push({
        protocol: pool.project,
        pool: pool.pool,
        chain: pool.chain,
        tvl: pool.tvlUsd,
        apy: pool.apy,
        apyBase: pool.apyBase,
        apyReward: pool.apyReward,
        symbol: pool.symbol,
      });
    }

    for (const sym of Object.keys(results)) {
      results[sym].sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0));
      results[sym] = results[sym].slice(0, 5);
    }
  } catch (err) {
    console.warn("[market-data] DefiLlama fetch error:", err);
  }
  return results;
}

export async function getCachedPrices(): Promise<Record<string, any>> {
  const entries = await storage.getAllMarketCacheByCategory("price");
  const result: Record<string, any> = {};
  for (const entry of entries) {
    result[entry.symbol] = entry.data;
  }
  return result;
}

export async function getCachedYields(): Promise<Record<string, any[]>> {
  const entries = await storage.getAllMarketCacheByCategory("defi_yield");
  const result: Record<string, any[]> = {};
  for (const entry of entries) {
    result[entry.symbol] = entry.data as any[];
  }
  return result;
}

export async function refreshAllMarketData(): Promise<{ priceCount: number; yieldCount: number }> {
  const oldPrices = await getCachedPrices();
  const oldYields = await getCachedYields();

  const prices = await fetchCoinGeckoPrices();
  let priceCount = 0;
  for (const [symbol, data] of Object.entries(prices)) {
    await storage.upsertMarketCache("price", symbol, data);
    priceCount++;
  }
  console.log(`[market-data] Updated ${priceCount} prices from CoinGecko`);

  const yields = await fetchDefiLlamaYields();
  let yieldCount = 0;
  for (const [symbol, data] of Object.entries(yields)) {
    await storage.upsertMarketCache("defi_yield", symbol, data);
    yieldCount++;
  }
  console.log(`[market-data] Updated ${yieldCount} yield categories from DefiLlama`);

  return { priceCount, yieldCount };
}

export function startMarketDataScheduler(hours: number): void {
  console.log(`[market-data] Scheduler started — refreshing every ${hours} hours`);
  setTimeout(async () => {
    await refreshAllMarketData().catch(err => console.error("[market-data] Initial refresh error:", err));
  }, 10000);

  setInterval(() => {
    refreshAllMarketData().catch(err => console.error("[market-data] Scheduled refresh error:", err));
  }, hours * 60 * 60 * 1000);
}
