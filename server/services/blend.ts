import { PoolV2, Network } from "@blend-capital/blend-sdk";
import { Networks } from "@stellar/stellar-sdk";

const SOROBAN_RPC = process.env.SOROBAN_RPC_URL || "https://mainnet.sorobanrpc.com";

export interface BlendPoolConfig {
  poolId: string;
  poolKey: string;
  poolName: string;
  description: string;
}

export interface BlendAssetMeta {
  symbol: string;
  coingeckoId: string;
}

export const STELLAR_ASSET_REGISTRY: Record<string, BlendAssetMeta> = {
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA": { symbol: "XLM", coingeckoId: "stellar" },
  "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75": { symbol: "USDC", coingeckoId: "usd-coin" },
};

function parsePoolsFromEnv(): BlendPoolConfig[] {
  const raw = process.env.BLEND_POOLS_JSON;
  if (!raw) return DEFAULT_BLEND_POOLS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(p => p.poolId && p.poolKey && p.poolName)) {
      return parsed;
    }
  } catch (err) {
    console.error("[blend] Failed to parse BLEND_POOLS_JSON, using defaults:", err);
  }
  return DEFAULT_BLEND_POOLS;
}

const DEFAULT_BLEND_POOLS: BlendPoolConfig[] = [
  {
    poolId: "CDIE73IJJKOWXWCPU5GWQ745FUKWCSH3YKZRF5IQW7GE3G7YAZ773MYK",
    poolKey: "FIXEDXLM",
    poolName: "Blend Fixed XLM Pool",
    description: "Supply XLM/USDC to earn lending interest on Stellar Soroban",
  },
];

export const BLEND_POOLS = parsePoolsFromEnv();

export interface BlendAssetPosition {
  assetId: string;
  symbol: string;
  coingeckoId: string;
  supply: number;
  collateral: number;
  liabilities: number;
  supplyApy: number;
  borrowApy: number;
}

export interface BlendUserSnapshot {
  poolId: string;
  poolKey: string;
  poolName: string;
  positions: BlendAssetPosition[];
  fetchedAt: string;
}

export async function fetchBlendPosition(
  pool: BlendPoolConfig,
  stellarAddress: string,
): Promise<BlendUserSnapshot> {
  const network: Network = {
    rpc: SOROBAN_RPC,
    passphrase: Networks.PUBLIC,
  };

  const blendPool = await PoolV2.load(network, pool.poolId);
  const user = await blendPool.loadUser(stellarAddress);

  const positions: BlendAssetPosition[] = [];
  const reserveEntries = Array.from(blendPool.reserves.entries());
  for (const [assetId, reserve] of reserveEntries) {
    const supplyFloat = user.getSupplyFloat(reserve);
    const collateralFloat = user.getCollateralFloat(reserve);
    const liabilitiesFloat = user.getLiabilitiesFloat(reserve);

    if (supplyFloat <= 0 && collateralFloat <= 0 && liabilitiesFloat <= 0) continue;

    const meta = STELLAR_ASSET_REGISTRY[assetId] || { symbol: `SAC:${assetId.slice(0, 6)}`, coingeckoId: "" };
    positions.push({
      assetId,
      symbol: meta.symbol,
      coingeckoId: meta.coingeckoId,
      supply: supplyFloat,
      collateral: collateralFloat,
      liabilities: liabilitiesFloat,
      supplyApy: reserve.estSupplyApy || 0,
      borrowApy: reserve.estBorrowApy || 0,
    });
  }

  return {
    poolId: pool.poolId,
    poolKey: pool.poolKey,
    poolName: pool.poolName,
    positions,
    fetchedAt: new Date().toISOString(),
  };
}

export interface FetchAllResult {
  snapshots: BlendUserSnapshot[];
  successPoolKeys: Set<string>;
  failedPoolKeys: string[];
}

export async function fetchAllBlendPositions(stellarAddress: string): Promise<FetchAllResult> {
  const snapshots: BlendUserSnapshot[] = [];
  const successPoolKeys = new Set<string>();
  const failedPoolKeys: string[] = [];
  for (const pool of BLEND_POOLS) {
    try {
      const snapshot = await fetchBlendPosition(pool, stellarAddress);
      snapshots.push(snapshot);
      successPoolKeys.add(pool.poolKey.toUpperCase());
    } catch (err: any) {
      console.error(`[blend] Failed to fetch pool ${pool.poolKey}:`, err?.message || err);
      failedPoolKeys.push(pool.poolKey);
    }
  }
  return { snapshots, successPoolKeys, failedPoolKeys };
}

export function buildPositionSymbol(poolKey: string, assetSymbol: string): string {
  return `${assetSymbol}-BLEND-${poolKey}`;
}
