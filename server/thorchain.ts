/**
 * THORChain endpoints — try multiple public providers in sequence.
 * ninerealms is the official primary; liquify is the official secondary
 * (and is reachable from environments where ninerealms DNS is blocked).
 */
const THORNODE_BASES = [
  process.env.THORNODE_URL,
  "https://thornode.ninerealms.com",
  "https://thornode.thorchain.liquify.com",
].filter(Boolean) as string[];

const MIDGARD_BASES = [
  process.env.MIDGARD_URL,
  "https://midgard.ninerealms.com",
  "https://midgard.thorswap.net",
].filter(Boolean) as string[];

async function fetchWithFailover(bases: string[], path: string): Promise<Response> {
  let lastErr: any = null;
  for (const base of bases) {
    try {
      const r = await fetch(`${base}${path}`);
      // 404/403 from a misconfigured mirror → try next
      if (r.status >= 500 || r.status === 404 || r.status === 403) {
        lastErr = new Error(`${base} returned ${r.status}`);
        continue;
      }
      return r;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  throw lastErr || new Error("All THORChain providers unreachable");
}

export interface QuoteSwapInput {
  fromAsset: string;
  toAsset: string;
  amount: bigint;
  destination: string;
  affiliateBps?: number;
  affiliateAddress?: string;
  toleranceBps?: number;
}

export interface ThorchainQuote {
  expected_amount_out: string;
  expiry: number;
  fees: {
    affiliate?: string;
    outbound?: string;
    liquidity?: string;
    total?: string;
    slippage_bps?: number;
    total_bps?: number;
    asset?: string;
  };
  inbound_address?: string;
  router?: string;
  memo: string;
  notes?: string;
  total_swap_seconds?: number;
  warning?: string;
  recommended_min_amount_in?: string;
}

export async function getSwapQuote(input: QuoteSwapInput): Promise<ThorchainQuote> {
  const params = new URLSearchParams({
    from_asset: input.fromAsset,
    to_asset: input.toAsset,
    amount: input.amount.toString(),
    destination: input.destination,
  });
  if (input.affiliateBps) params.set("affiliate_bps", String(input.affiliateBps));
  if (input.affiliateAddress) params.set("affiliate", input.affiliateAddress);
  if (input.toleranceBps) params.set("tolerance_bps", String(input.toleranceBps));

  const r = await fetchWithFailover(THORNODE_BASES, `/thorchain/quote/swap?${params}`);
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const raw = data?.error || data?.message || `THORNode error ${r.status}`;
    // Translate the confusing "THORName doesn't exist" error that THORNode
    // returns when the destination chain is halted (it falls through to the
    // THORName lookup instead of validating against the chain's address rules).
    const friendly = /THORName doesn't exist/i.test(raw)
      ? "THORChain is temporarily paused for this chain. Trading should resume shortly — try again in a few minutes, or check status at thorchain.network."
      : raw;
    throw new Error(friendly);
  }
  return data as ThorchainQuote;
}

export interface InboundAddress {
  chain: string;
  pub_key?: string;
  address: string;
  router?: string;
  halted: boolean;
  global_trading_paused?: boolean;
  chain_trading_paused?: boolean;
  gas_rate?: string;
  outbound_fee?: string;
}

export async function getInboundAddresses(): Promise<InboundAddress[]> {
  const r = await fetchWithFailover(THORNODE_BASES, `/thorchain/inbound_addresses`);
  if (!r.ok) throw new Error(`THORNode error ${r.status}`);
  return await r.json();
}

export async function getSwapStatus(txId: string): Promise<any> {
  const clean = txId.startsWith("0x") ? txId.slice(2) : txId;
  const r = await fetchWithFailover(MIDGARD_BASES, `/v2/actions?txid=${clean}&limit=1`);
  if (!r.ok) throw new Error(`Midgard error ${r.status}`);
  return await r.json();
}
