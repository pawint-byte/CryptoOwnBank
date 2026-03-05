const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  LTC: "litecoin",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
};

const priceCache = new Map<string, number>();

function cacheKey(symbol: string, date: Date): string {
  const d = date.toISOString().split("T")[0];
  return `${symbol.toUpperCase()}_${d}`;
}

function formatDateForCoinGecko(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getHistoricalPrice(symbol: string, date: Date): Promise<number> {
  const key = cacheKey(symbol, date);
  if (priceCache.has(key)) {
    return priceCache.get(key)!;
  }

  const coinId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!coinId) {
    console.warn(`No CoinGecko ID for symbol: ${symbol}`);
    return 0;
  }

  try {
    const dateStr = formatDateForCoinGecko(date);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${dateStr}&localization=false`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (res.status === 429) {
      console.warn("CoinGecko rate limited, waiting 60s...");
      await sleep(60000);
      return getHistoricalPrice(symbol, date);
    }

    if (!res.ok) {
      console.warn(`CoinGecko historical price failed: HTTP ${res.status} for ${symbol} on ${dateStr}`);
      return 0;
    }

    const data = await res.json();
    const price = data?.market_data?.current_price?.usd || 0;

    priceCache.set(key, price);
    return price;
  } catch (error) {
    console.warn(`Failed to fetch historical price for ${symbol}:`, error);
    return 0;
  }
}

export async function getHistoricalPricesBatch(
  symbol: string,
  dates: Date[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  const uniqueDates = new Map<string, Date>();

  for (const date of dates) {
    const key = date.toISOString().split("T")[0];
    if (!uniqueDates.has(key)) {
      uniqueDates.set(key, date);
    }
  }

  for (const [dayKey, date] of uniqueDates) {
    const price = await getHistoricalPrice(symbol, date);
    results.set(dayKey, price);
    await sleep(2500);
  }

  return results;
}

export function lookupPriceFromBatch(
  batchResults: Map<string, number>,
  date: Date
): number {
  const key = date.toISOString().split("T")[0];
  return batchResults.get(key) || 0;
}
