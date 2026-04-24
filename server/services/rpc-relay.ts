type ChainKey =
  | "flare"
  | "xrpl"
  | "stellar"
  | "ethereum"
  | "avalanche"
  | "solana"
  | "bitcoin"
  | "dogecoin"
  | "litecoin";

type EndpointKind = "json-rpc" | "rest";

interface EndpointHealth {
  url: string;
  failures: number;
  lastFailureAt: number;
  cooldownUntil: number;
}

interface ChainConfig {
  kind: EndpointKind;
  endpoints: string[];
  timeoutMs: number;
}

const CHAINS: Record<ChainKey, ChainConfig> = {
  flare: {
    kind: "json-rpc",
    timeoutMs: 15000,
    endpoints: [
      "https://flare-api.flare.network/ext/C/rpc",
      "https://flare.rpc.thirdweb.com",
      "https://flare.public-rpc.com",
      "https://rpc.ankr.com/flare",
    ],
  },
  xrpl: {
    kind: "json-rpc",
    timeoutMs: 12000,
    endpoints: [
      "https://xrplcluster.com",
      "https://s1.ripple.com:51234",
      "https://s2.ripple.com:51234",
      "https://xrpl.ws",
    ],
  },
  stellar: {
    kind: "rest",
    timeoutMs: 12000,
    endpoints: [
      "https://horizon.stellar.org",
      "https://horizon.stellar.lobstr.co",
      "https://stellar-horizon.satoshipay.io",
    ],
  },
  ethereum: {
    kind: "json-rpc",
    timeoutMs: 12000,
    endpoints: [
      "https://eth.llamarpc.com",
      "https://ethereum-rpc.publicnode.com",
      "https://rpc.ankr.com/eth",
      "https://eth.drpc.org",
      "https://cloudflare-eth.com",
    ],
  },
  avalanche: {
    kind: "json-rpc",
    timeoutMs: 12000,
    endpoints: [
      "https://api.avax.network/ext/bc/C/rpc",
      "https://avalanche-c-chain-rpc.publicnode.com",
      "https://rpc.ankr.com/avalanche",
      "https://avax.meowrpc.com",
    ],
  },
  solana: {
    kind: "json-rpc",
    timeoutMs: 12000,
    endpoints: [
      "https://api.mainnet-beta.solana.com",
      "https://solana-rpc.publicnode.com",
      "https://rpc.ankr.com/solana",
      "https://solana.drpc.org",
    ],
  },
  bitcoin: {
    kind: "rest",
    timeoutMs: 15000,
    endpoints: [
      "https://blockstream.info/api",
      "https://mempool.space/api",
    ],
  },
  dogecoin: {
    kind: "rest",
    timeoutMs: 15000,
    endpoints: [
      "https://dogechain.info/api/v1",
    ],
  },
  litecoin: {
    kind: "rest",
    timeoutMs: 15000,
    endpoints: [
      "https://litecoinspace.org/api",
    ],
  },
};

const HEALTH: Record<string, EndpointHealth> = {};
const COOLDOWN_BASE_MS = 30_000;
const COOLDOWN_MAX_MS = 5 * 60_000;
const FAILURE_THRESHOLD = 2;

function getHealth(url: string): EndpointHealth {
  if (!HEALTH[url]) {
    HEALTH[url] = { url, failures: 0, lastFailureAt: 0, cooldownUntil: 0 };
  }
  return HEALTH[url];
}

function markSuccess(url: string) {
  const h = getHealth(url);
  h.failures = 0;
  h.cooldownUntil = 0;
}

function markFailure(url: string) {
  const h = getHealth(url);
  h.failures += 1;
  h.lastFailureAt = Date.now();
  if (h.failures >= FAILURE_THRESHOLD) {
    const backoff = Math.min(
      COOLDOWN_BASE_MS * Math.pow(2, h.failures - FAILURE_THRESHOLD),
      COOLDOWN_MAX_MS,
    );
    h.cooldownUntil = Date.now() + backoff;
  }
}

function rankEndpoints(chain: ChainKey): string[] {
  const cfg = CHAINS[chain];
  const now = Date.now();
  return [...cfg.endpoints].sort((a, b) => {
    const ha = getHealth(a);
    const hb = getHealth(b);
    const aDown = ha.cooldownUntil > now ? 1 : 0;
    const bDown = hb.cooldownUntil > now ? 1 : 0;
    if (aDown !== bDown) return aDown - bDown;
    return ha.failures - hb.failures;
  });
}

export async function relayJsonRpc(
  chain: ChainKey,
  method: string,
  params: any[],
): Promise<any> {
  const cfg = CHAINS[chain];
  if (cfg.kind !== "json-rpc") {
    throw new Error(`relayJsonRpc: chain ${chain} is REST, use relayHttpGet`);
  }
  const ordered = rankEndpoints(chain);
  let lastErr: unknown = null;
  for (const url of ordered) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      if (!resp.ok) {
        markFailure(url);
        lastErr = new Error(`HTTP ${resp.status} from ${url}`);
        continue;
      }
      const json = await resp.json();
      if (json.error) {
        markFailure(url);
        lastErr = new Error(json.error.message || "RPC error");
        continue;
      }
      markSuccess(url);
      return json.result;
    } catch (err) {
      markFailure(url);
      lastErr = err;
    }
  }
  throw new Error(
    `All ${chain} RPC endpoints failed: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

export async function relayHttpGet(
  chain: ChainKey,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const cfg = CHAINS[chain];
  if (cfg.kind !== "rest") {
    throw new Error(`relayHttpGet: chain ${chain} is JSON-RPC, use relayJsonRpc`);
  }
  const ordered = rankEndpoints(chain);
  let lastErr: unknown = null;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  for (const base of ordered) {
    const url = `${base}${cleanPath}`;
    try {
      const resp = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      if (!resp.ok) {
        markFailure(base);
        lastErr = new Error(`HTTP ${resp.status} from ${url}`);
        continue;
      }
      markSuccess(base);
      return resp;
    } catch (err) {
      markFailure(base);
      lastErr = err;
    }
  }
  throw new Error(
    `All ${chain} REST endpoints failed: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

export function getRelayHealth() {
  const out: Record<string, { healthy: number; total: number; endpoints: any[] }> = {};
  const now = Date.now();
  for (const [chain, cfg] of Object.entries(CHAINS)) {
    const endpoints = cfg.endpoints.map((url) => {
      const h = getHealth(url);
      return {
        url,
        healthy: h.cooldownUntil <= now,
        failures: h.failures,
        cooldownMsRemaining: Math.max(0, h.cooldownUntil - now),
      };
    });
    out[chain] = {
      healthy: endpoints.filter((e) => e.healthy).length,
      total: endpoints.length,
      endpoints,
    };
  }
  return out;
}
