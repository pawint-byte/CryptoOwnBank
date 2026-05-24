export interface ThorAsset {
  symbol: string;
  thorchainAsset: string;
  displayName: string;
  decimals: number;
  network: string;
}

export const USDC_ETH: ThorAsset = {
  symbol: "USDC",
  thorchainAsset: "ETH.USDC-0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48",
  displayName: "USDC on Ethereum",
  decimals: 6,
  network: "ETH",
};

export const THOR_BRIDGEABLE: Record<string, ThorAsset> = {
  btc: { symbol: "BTC", thorchainAsset: "BTC.BTC", displayName: "Bitcoin", decimals: 8, network: "BTC" },
  ltc: { symbol: "LTC", thorchainAsset: "LTC.LTC", displayName: "Litecoin", decimals: 8, network: "LTC" },
  doge: { symbol: "DOGE", thorchainAsset: "DOGE.DOGE", displayName: "Dogecoin", decimals: 8, network: "DOGE" },
  bch: { symbol: "BCH", thorchainAsset: "BCH.BCH", displayName: "Bitcoin Cash", decimals: 8, network: "BCH" },
};

export function chainHasThorBridge(chain: string): boolean {
  return chain.toLowerCase() in THOR_BRIDGEABLE;
}

export function getThorAsset(chain: string): ThorAsset | null {
  return THOR_BRIDGEABLE[chain.toLowerCase()] || null;
}

export interface ThorQuoteResult {
  expectedOutHuman: string;
  expectedOutRaw: string;
  totalFeesPctHuman: string;
  slippageBpsHuman: string;
  totalSwapMinutes: number;
  memo: string;
  warning?: string;
  recommendedMinUsd?: number;
  rawQuote: any;
}

export async function fetchThorQuote(opts: {
  toChain: string;
  destinationAddress: string;
  usdAmount: number;
}): Promise<ThorQuoteResult> {
  const toAsset = getThorAsset(opts.toChain);
  if (!toAsset) throw new Error(`No THORChain route for ${opts.toChain}`);

  // THORChain quote endpoint expects amounts in 1e8 base units regardless of native asset decimals.
  const amount1e8 = BigInt(Math.floor(opts.usdAmount * 1e8));

  const search = new URLSearchParams({
    fromAsset: USDC_ETH.thorchainAsset,
    toAsset: toAsset.thorchainAsset,
    amount: amount1e8.toString(),
    destination: opts.destinationAddress,
  });

  const r = await fetch(`/api/thorchain/quote?${search}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || "Failed to fetch quote");

  // expected_amount_out is returned in 1e8 units; convert to human using asset decimals.
  const outRaw = BigInt(data.expected_amount_out || "0");
  // Display in native asset units (1e8 -> divide by 1e8 to get human number)
  const outHumanNum = Number(outRaw) / 1e8;
  const totalBps = data?.fees?.total_bps ?? 0;
  const slippageBps = data?.fees?.slippage_bps ?? 0;

  const recMinRaw = data?.recommended_min_amount_in
    ? Number(data.recommended_min_amount_in) / 1e8
    : undefined;

  return {
    expectedOutHuman: outHumanNum.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    }),
    expectedOutRaw: outRaw.toString(),
    totalFeesPctHuman: (totalBps / 100).toFixed(2) + "%",
    slippageBpsHuman: (slippageBps / 100).toFixed(2) + "%",
    totalSwapMinutes: Math.ceil((data.total_swap_seconds || 600) / 60),
    memo: data.memo,
    warning: data.warning,
    recommendedMinUsd: recMinRaw,
    rawQuote: data,
  };
}

/**
 * Build a THORSwap deep-link that pre-fills USDC.ETH → target swap with the
 * destination address ready. The user signs the actual transaction inside
 * THORSwap's battle-tested UI (no in-app signing code required for v1).
 *
 * THORSwap supports affiliate fees via the `aff` query parameter (a THORName).
 */
export function buildThorSwapDeeplink(opts: {
  toChain: string;
  destinationAddress: string;
  usdAmount?: number;
  affiliateThorname?: string;
}): string {
  const toAsset = getThorAsset(opts.toChain);
  if (!toAsset) throw new Error(`No THORChain route for ${opts.toChain}`);

  const params = new URLSearchParams({
    input: USDC_ETH.thorchainAsset,
    output: toAsset.thorchainAsset,
    recipient: opts.destinationAddress,
  });
  if (opts.usdAmount && opts.usdAmount > 0) {
    params.set("inputAmount", String(opts.usdAmount));
  }
  if (opts.affiliateThorname) {
    params.set("aff", opts.affiliateThorname);
  }
  return `https://app.thorswap.finance/swap?${params.toString()}`;
}
