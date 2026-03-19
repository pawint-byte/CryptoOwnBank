import { Client } from "xrpl";

const AMM_CACHE: {
  data: Record<string, any> | null;
  lastFetch: number;
} = { data: null, lastFetch: 0 };

const CACHE_TTL = 5 * 60 * 1000;

const POPULAR_AMM_PAIRS = [
  {
    id: "xrp-rlusd",
    label: "XRP / RLUSD",
    asset1: { currency: "XRP" },
    asset2: { currency: "524C555344000000000000000000000000000000", issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De" },
  },
  {
    id: "xrp-usd",
    label: "XRP / USD (Bitstamp)",
    asset1: { currency: "XRP" },
    asset2: { currency: "USD", issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B" },
  },
  {
    id: "xrp-usdt",
    label: "XRP / USDT (GateHub)",
    asset1: { currency: "XRP" },
    asset2: { currency: "USD", issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq" },
  },
];

async function connectXrpl(): Promise<Client> {
  const endpoints = [
    "wss://xrplcluster.com",
    "wss://s1.ripple.com",
    "wss://s2.ripple.com",
  ];

  for (const url of endpoints) {
    try {
      const client = new Client(url, { timeout: 10000 });
      await client.connect();
      return client;
    } catch (err) {
      console.warn(`[xrpl-amm] Failed to connect to ${url}`);
    }
  }
  throw new Error("Could not connect to any XRPL endpoint");
}

export async function getAmmPoolInfo(): Promise<any[]> {
  const now = Date.now();
  if (AMM_CACHE.data && now - AMM_CACHE.lastFetch < CACHE_TTL) {
    return Object.values(AMM_CACHE.data);
  }

  const client = await connectXrpl();
  const pools: any[] = [];

  try {
    for (const pair of POPULAR_AMM_PAIRS) {
      try {
        const ammInfo: any = await client.request({
          command: "amm_info",
          asset: pair.asset1,
          asset2: pair.asset2,
        } as any);

        if (ammInfo?.result?.amm) {
          const amm = ammInfo.result.amm;
          const amount1 = typeof amm.amount === "string"
            ? { value: (parseFloat(amm.amount) / 1_000_000).toString(), currency: "XRP" }
            : amm.amount;
          const amount2 = typeof amm.amount2 === "string"
            ? { value: (parseFloat(amm.amount2) / 1_000_000).toString(), currency: "XRP" }
            : amm.amount2;

          const tradingFee = amm.trading_fee || 0;
          const feePercent = tradingFee / 1000;

          pools.push({
            id: pair.id,
            label: pair.label,
            asset1Amount: amount1.value || "0",
            asset1Currency: amount1.currency === "XRP" ? "XRP" : amount1.currency?.length > 3
              ? Buffer.from(amount1.currency, "hex").toString("utf8").replace(/\0/g, "")
              : amount1.currency,
            asset2Amount: amount2.value || "0",
            asset2Currency: amount2.currency === "XRP" ? "XRP" : amount2.currency?.length > 3
              ? Buffer.from(amount2.currency, "hex").toString("utf8").replace(/\0/g, "")
              : amount2.currency,
            lpTokenBalance: amm.lp_token?.value || "0",
            tradingFeePercent: feePercent,
            auctionSlot: amm.auction_slot || null,
            account: amm.account,
          });
        }
      } catch (err: any) {
        if (err?.data?.error !== "actNotFound") {
          console.warn(`[xrpl-amm] Error fetching ${pair.id}:`, err?.message || err);
        }
      }
    }
  } finally {
    await client.disconnect();
  }

  if (pools.length > 0) {
    AMM_CACHE.data = {};
    for (const p of pools) AMM_CACHE.data[p.id] = p;
    AMM_CACHE.lastFetch = now;
  }

  return pools;
}

export async function getUserAmmPositions(walletAddress: string): Promise<any[]> {
  const client = await connectXrpl();
  const positions: any[] = [];

  try {
    const accountLines: any = await client.request({
      command: "account_lines",
      account: walletAddress,
      limit: 400,
    });

    const lines = accountLines?.result?.lines || [];
    const lpLines = lines.filter((l: any) =>
      l.currency && l.currency.length === 40 && parseFloat(l.balance) > 0
    );

    for (const pair of POPULAR_AMM_PAIRS) {
      try {
        const ammInfo: any = await client.request({
          command: "amm_info",
          asset: pair.asset1,
          asset2: pair.asset2,
        } as any);

        if (ammInfo?.result?.amm) {
          const amm = ammInfo.result.amm;
          const ammAccount = amm.account;
          const lpCurrency = amm.lp_token?.currency;
          const totalLpTokens = parseFloat(amm.lp_token?.value || "0");

          const userLp = lpLines.find((l: any) =>
            l.account === ammAccount && l.currency === lpCurrency
          );

          if (userLp && parseFloat(userLp.balance) > 0) {
            const userLpAmount = parseFloat(userLp.balance);
            const sharePercent = totalLpTokens > 0 ? (userLpAmount / totalLpTokens) * 100 : 0;

            const amount1 = typeof amm.amount === "string"
              ? parseFloat(amm.amount) / 1_000_000
              : parseFloat(amm.amount?.value || "0");
            const amount2 = typeof amm.amount2 === "string"
              ? parseFloat(amm.amount2) / 1_000_000
              : parseFloat(amm.amount2?.value || "0");

            const userAsset1Share = amount1 * (sharePercent / 100);
            const userAsset2Share = amount2 * (sharePercent / 100);

            const tradingFee = amm.trading_fee || 0;
            const feePercent = tradingFee / 1000;

            const asset2Currency = typeof amm.amount2 === "string" ? "XRP" :
              (amm.amount2?.currency?.length > 3
                ? Buffer.from(amm.amount2.currency, "hex").toString("utf8").replace(/\0/g, "")
                : amm.amount2?.currency);

            positions.push({
              id: pair.id,
              label: pair.label,
              lpTokens: userLpAmount,
              totalLpTokens,
              sharePercent,
              userAsset1: userAsset1Share,
              userAsset2: userAsset2Share,
              asset1Currency: "XRP",
              asset2Currency,
              tradingFeePercent: feePercent,
              totalPoolAsset1: amount1,
              totalPoolAsset2: amount2,
            });
          }
        }
      } catch (err: any) {
        if (err?.data?.error !== "actNotFound") {
          console.warn(`[xrpl-amm] Error checking user position ${pair.id}:`, err?.message || err);
        }
      }
    }
  } finally {
    await client.disconnect();
  }

  return positions;
}
