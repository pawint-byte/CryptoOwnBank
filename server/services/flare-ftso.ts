const FLARE_RPC = "https://flare-api.flare.network/ext/C/rpc";
const FLARE_EXPLORER_API = "https://flare-explorer.flare.network/api";

const WFLR_CONTRACT = "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d";
const FTSO_REWARD_MANAGER = "0xc5738334b972745067fFa666040fdeADc66Cb925";
const DISTRIBUTION_TO_DELEGATORS = "0x9c7A4C83842B29bB4A082b0E689CB9474BD938d0";

const FLARE_CACHE: Record<string, { data: any; lastFetch: number }> = {};
const CACHE_TTL = 10 * 60 * 1000;

async function rpcCall(method: string, params: any[]): Promise<any> {
  const resp = await fetch(FLARE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
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
