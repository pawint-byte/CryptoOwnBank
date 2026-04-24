import { relayJsonRpc } from "./rpc-relay";

const FLARE_EXPLORER_API = "https://flare-explorer.flare.network/api";

const WFLR_CONTRACT = "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d";
const FTSO_REWARD_MANAGER = "0xc5738334b972745067fFa666040fdeADc66Cb925";
const DISTRIBUTION_TO_DELEGATORS = "0x9c7A4C83842B29bB4A082b0E689CB9474BD938d0";

const FLARE_CACHE: Record<string, { data: any; lastFetch: number }> = {};
const CACHE_TTL = 10 * 60 * 1000;

async function rpcCall(method: string, params: any[]): Promise<any> {
  return relayJsonRpc("flare", method, params);
}

function encodeAddress(addr: string): string {
  return addr.toLowerCase().replace("0x", "").padStart(64, "0");
}

async function getFlrBalance(address: string): Promise<string> {
  const result = await rpcCall("eth_getBalance", [address, "latest"]);
  const wei = BigInt(result);
  return (Number(wei) / 1e18).toFixed(4);
}

async function getWflrBalance(address: string): Promise<string> {
  const balanceOfSelector = "0x70a08231";
  const data = balanceOfSelector + encodeAddress(address);

  const result = await rpcCall("eth_call", [
    { to: WFLR_CONTRACT, data },
    "latest",
  ]);
  const wei = BigInt(result);
  return (Number(wei) / 1e18).toFixed(4);
}

async function getDelegationInfo(address: string): Promise<any[]> {
  try {
    const delegatesOfSelector = "0x9926b430";
    const data = delegatesOfSelector + encodeAddress(address);

    const result = await rpcCall("eth_call", [
      { to: WFLR_CONTRACT, data },
      "latest",
    ]);

    if (!result || result === "0x" || result.length < 130) {
      return [];
    }

    const hex = result.slice(2);
    const delegations: any[] = [];

    const addressesOffset = parseInt(hex.slice(0, 64), 16) * 2;
    const bipsOffset = parseInt(hex.slice(64, 128), 16) * 2;

    const addressCount = parseInt(hex.slice(addressesOffset, addressesOffset + 64), 16);
    const bipsCount = parseInt(hex.slice(bipsOffset, bipsOffset + 64), 16);
    const count = Math.min(addressCount, bipsCount);

    if (count === 0 || isNaN(count) || count > 10) return [];

    for (let i = 0; i < count; i++) {
      const addrHex = hex.slice(addressesOffset + 64 + i * 64, addressesOffset + 128 + i * 64);
      const bipsHex = hex.slice(bipsOffset + 64 + i * 64, bipsOffset + 128 + i * 64);
      const providerAddr = "0x" + addrHex.slice(24);
      const bips = parseInt(bipsHex, 16);

      if (bips > 0) {
        delegations.push({
          provider: providerAddr,
          percentBips: bips,
          percent: (bips / 100).toFixed(1),
        });
      }
    }

    return delegations;
  } catch (err) {
    console.warn("[flare-ftso] Delegation info error:", err);
    return [];
  }
}

async function getFlareDropStatus(): Promise<any> {
  return {
    active: true,
    currentMonth: getFlareDropMonth(),
    totalMonths: 36,
    endDate: "2026-01-31",
    note: "FlareDrop distributions run monthly through Jan 2026. Must wrap FLR to WFLR and claim each month.",
  };
}

function getFlareDropMonth(): number {
  const startDate = new Date("2023-03-17");
  const now = new Date();
  const months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  return Math.min(months + 1, 36);
}

export async function getFlareWalletInfo(address: string): Promise<any> {
  const cacheKey = `wallet-${address.toLowerCase()}`;
  const cached = FLARE_CACHE[cacheKey];
  if (cached && Date.now() - cached.lastFetch < CACHE_TTL) {
    return cached.data;
  }

  try {
    const [flrBalance, wflrBalance, delegations] = await Promise.all([
      getFlrBalance(address),
      getWflrBalance(address),
      getDelegationInfo(address),
    ]);

    const flareDrop = await getFlareDropStatus();

    const totalFlr = parseFloat(flrBalance) + parseFloat(wflrBalance);
    const isWrapped = parseFloat(wflrBalance) > 0;
    const isDelegated = delegations.length > 0 || isWrapped;

    const estimatedApy = isDelegated ? 8.5 : 0;
    const estimatedMonthlyReward = isDelegated
      ? (totalFlr * (estimatedApy / 100) / 12)
      : 0;

    const result = {
      address,
      flrBalance,
      wflrBalance,
      totalFlr: totalFlr.toFixed(4),
      delegations,
      isDelegated,
      isWrapped,
      estimatedApy,
      estimatedMonthlyReward: estimatedMonthlyReward.toFixed(2),
      estimatedYearlyReward: (estimatedMonthlyReward * 12).toFixed(2),
      flareDrop,
      readinessChecklist: {
        hasFlr: totalFlr > 0,
        isWrapped,
        isDelegated,
        score: [totalFlr > 0, isWrapped, isDelegated].filter(Boolean).length,
        total: 3,
      },
    };

    FLARE_CACHE[cacheKey] = { data: result, lastFetch: Date.now() };
    return result;
  } catch (err) {
    console.error("[flare-ftso] Error fetching wallet info:", err);
    throw err;
  }
}

type VaultDef = {
  key: string;
  name: string;
  protocol: string;
  asset: string;
  assetAddress: string;
  decimals: number;
  address: string;
  url: string;
  expectedApy: string;
};

// FXRP token on Flare — 6 decimals (matches XRP native), used as TVL-fallback
// asset when a vault doesn't expose ERC-4626 totalAssets() directly.
const FXRP_ADDRESS = "0xAd552A648C74D49E10027AB8a618A3ad4901c5bE";
const FXRP_DECIMALS = 6;

const FLARE_VAULTS: VaultDef[] = [
  {
    key: "earnXRP",
    name: "earnXRP Vault",
    protocol: "Upshift + Clearstar",
    asset: "FXRP",
    assetAddress: FXRP_ADDRESS,
    decimals: FXRP_DECIMALS,
    address: process.env.FLARE_VAULT_EARNXRP_ADDRESS ?? "",
    url: "https://upshift.finance",
    expectedApy: "~3.4%",
  },
  {
    key: "firelight",
    name: "Firelight stXRP",
    protocol: "Firelight",
    asset: "FXRP",
    assetAddress: FXRP_ADDRESS,
    decimals: FXRP_DECIMALS,
    address: process.env.FLARE_VAULT_FIRELIGHT_ADDRESS ?? "",
    url: "https://firelight.finance",
    expectedApy: "variable",
  },
  {
    key: "morpho",
    name: "Morpho FXRP Vault",
    protocol: "Morpho + Mystic",
    asset: "FXRP",
    assetAddress: FXRP_ADDRESS,
    decimals: FXRP_DECIMALS,
    address: process.env.FLARE_VAULT_MORPHO_ADDRESS ?? "",
    url: "https://app.morpho.org",
    expectedApy: "~2-5%",
  },
];

const ERC4626_TOTAL_ASSETS_SELECTOR = "0x01e1d114";
const ERC4626_MAX_DEPOSIT_SELECTOR = "0x402d267d";
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";
const MAX_UINT256 = (1n << 256n) - 1n;

async function tryRpcCall(to: string, data: string): Promise<bigint | null> {
  try {
    const raw = await rpcCall("eth_call", [{ to, data }, "latest"]);
    if (!raw || raw === "0x") return null;
    return BigInt(raw);
  } catch {
    return null;
  }
}

async function readVaultOnChain(def: VaultDef): Promise<{
  totalAssetsXrp: number;
  remainingCapacityXrp: number | null;
  isUncapped: boolean;
  tvlSource: "totalAssets" | "balanceOf";
  capacityKnown: boolean;
}> {
  const divisor = 10 ** def.decimals;

  // 1. Try standard ERC-4626 totalAssets() first.
  let totalAssetsWei = await tryRpcCall(def.address, ERC4626_TOTAL_ASSETS_SELECTOR);
  let tvlSource: "totalAssets" | "balanceOf" = "totalAssets";

  // 2. Fallback to assetToken.balanceOf(vault) — works for non-ERC-4626 vaults
  //    (e.g. Upshift earnXRP which holds FXRP directly but doesn't expose totalAssets).
  if (totalAssetsWei === null) {
    const balanceOfData = ERC20_BALANCE_OF_SELECTOR + encodeAddress(def.address);
    totalAssetsWei = await tryRpcCall(def.assetAddress, balanceOfData);
    tvlSource = "balanceOf";
  }

  if (totalAssetsWei === null) {
    throw new Error(`Could not read TVL for ${def.key} (totalAssets and balanceOf both reverted)`);
  }

  const totalAssetsXrp = Number(totalAssetsWei) / divisor;

  // 3. Try maxDeposit() — but treat failure as "capacity unknown", not error.
  const probeAddr = process.env.FLARE_VAULT_PROBE_ADDRESS || "0x000000000000000000000000000000000000dEaD";
  const probeAddrEncoded = encodeAddress(probeAddr);
  const maxDepositWei = await tryRpcCall(def.address, ERC4626_MAX_DEPOSIT_SELECTOR + probeAddrEncoded);

  let remainingCapacityXrp: number | null = null;
  let isUncapped = false;
  let capacityKnown = false;

  if (maxDepositWei !== null) {
    capacityKnown = true;
    if (maxDepositWei === MAX_UINT256) {
      isUncapped = true;
    } else {
      remainingCapacityXrp = Number(maxDepositWei) / divisor;
    }
  }

  return { totalAssetsXrp, remainingCapacityXrp, isUncapped, tvlSource, capacityKnown };
}

export async function getFlareVaultStatus(): Promise<any> {
  const cached = FLARE_CACHE["vault-status"];
  if (cached && Date.now() - cached.lastFetch < 5 * 60 * 1000) {
    return cached.data;
  }

  const vaults = await Promise.all(
    FLARE_VAULTS.map(async (def) => {
      if (!def.address) {
        return {
          key: def.key,
          name: def.name,
          protocol: def.protocol,
          asset: def.asset,
          url: def.url,
          expectedApy: def.expectedApy,
          isConfigured: false,
          status: "snapshot" as const,
          message: "Live status not configured — set the vault address to enable live data.",
        };
      }

      try {
        const { totalAssetsXrp, remainingCapacityXrp, isUncapped, tvlSource, capacityKnown } = await readVaultOnChain(def);
        const totalCapacityXrp = remainingCapacityXrp === null ? null : totalAssetsXrp + remainingCapacityXrp;
        const percentFull = totalCapacityXrp && totalCapacityXrp > 0
          ? Math.min(100, (totalAssetsXrp / totalCapacityXrp) * 100)
          : null;
        // If capacity is unknown, we can't determine accepting status from the chain.
        const isAccepting = capacityKnown
          ? (isUncapped ? true : (remainingCapacityXrp ?? 0) > 0)
          : null;

        return {
          key: def.key,
          name: def.name,
          protocol: def.protocol,
          asset: def.asset,
          url: def.url,
          expectedApy: def.expectedApy,
          address: def.address,
          isConfigured: true,
          status: "live" as const,
          totalAssetsXrp: Number(totalAssetsXrp.toFixed(2)),
          totalCapacityXrp: totalCapacityXrp === null ? null : Number(totalCapacityXrp.toFixed(2)),
          remainingCapacityXrp: remainingCapacityXrp === null ? null : Number(remainingCapacityXrp.toFixed(2)),
          percentFull: percentFull === null ? null : Number(percentFull.toFixed(1)),
          isAccepting,
          isUncapped,
          capacityKnown,
          tvlSource,
          lastCheckedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        return {
          key: def.key,
          name: def.name,
          protocol: def.protocol,
          asset: def.asset,
          url: def.url,
          expectedApy: def.expectedApy,
          isConfigured: true,
          status: "error" as const,
          message: `On-chain read failed: ${err?.message ?? "unknown error"}. Showing snapshot.`,
        };
      }
    })
  );

  const result = {
    vaults,
    lastCheckedAt: new Date().toISOString(),
  };

  FLARE_CACHE["vault-status"] = { data: result, lastFetch: Date.now() };
  return result;
}

export async function getFlareNetworkStats(): Promise<any> {
  const cached = FLARE_CACHE["network-stats"];
  if (cached && Date.now() - cached.lastFetch < CACHE_TTL) {
    return cached.data;
  }

  try {
    const result = {
      currentEpoch: Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3.5)),
      estimatedFtsoApy: "5–15%",
      avgFtsoApy: 8.5,
      flareDropActive: getFlareDropMonth() <= 36,
      flareDropMonth: getFlareDropMonth(),
      totalMonths: 36,
      wflrContract: WFLR_CONTRACT,
      rewardManagerContract: FTSO_REWARD_MANAGER,
    };

    FLARE_CACHE["network-stats"] = { data: result, lastFetch: Date.now() };
    return result;
  } catch (err) {
    console.error("[flare-ftso] Network stats error:", err);
    throw err;
  }
}
