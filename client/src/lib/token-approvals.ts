import { ethers } from "ethers";
import { EVM_CHAINS, sendEvmTransaction, useEvmWallet } from "@/lib/evm-wallet";

// Chains we offer to scan. The first four are on by default (lighter load on
// public RPCs); the rest are opt-in via the "scan deeper" toggles.
export const DEFAULT_SCAN_CHAINS = [1, 137, 8453, 42161] as const;
export const EXTRA_SCAN_CHAINS = [10, 43114, 56] as const;
export const ALL_SCAN_CHAINS = [...DEFAULT_SCAN_CHAINS, ...EXTRA_SCAN_CHAINS];

export const MAX_UINT256 = (1n << 256n) - 1n;
// Anything above half of uint256 is, for practical purposes, "unlimited".
const UNLIMITED_THRESHOLD = 1n << 255n;

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const erc20Iface = new ethers.Interface(ERC20_ABI);
const APPROVAL_TOPIC = ethers.id("Approval(address,address,uint256)");

const providerCache: Record<number, ethers.JsonRpcProvider> = {};
function getReadProvider(chainId: number): ethers.JsonRpcProvider {
  if (!providerCache[chainId]) {
    const chain = EVM_CHAINS[chainId];
    if (!chain) throw new Error(`Unsupported chain ${chainId}`);
    providerCache[chainId] = new ethers.JsonRpcProvider(chain.rpcUrl);
  }
  return providerCache[chainId];
}

// Best-effort human labels for well-known spender contracts. Keyed by
// lowercased address. Many of these are shared across EVM chains.
const KNOWN_SPENDERS: Record<string, string> = {
  "0x000000000022d473030f116ddee9f6b43ac78ba3": "Uniswap Permit2",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap Router",
  "0x66a9893cc07d91d95644aedd05d03f95e1dba8af": "Uniswap Universal Router",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2 Router",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch Router",
  "0x111111125421ca6dc452d289314280a0f8842a65": "1inch Router",
  "0x6131b5fae19ea4f9d964eac0408e4408b66337b5": "KyberSwap Router",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x Exchange Proxy",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave v3 Pool (Ethereum)",
  "0xa238dd80c259a72e81d7e4664a9801593f98d1c5": "Aave v3 Pool (Base)",
  "0x794a61358d6845594f94dc1db02a252b5b4814ad": "Aave v3 Pool",
  "0xc36442b4a4522e871399cd717abdd847ab11fe88": "Uniswap V3 Positions",
};

function labelForSpender(spender: string): string | null {
  return KNOWN_SPENDERS[spender.toLowerCase()] ?? null;
}

export interface TokenApproval {
  id: string;
  chainId: number;
  token: string;
  tokenSymbol: string;
  tokenDecimals: number;
  spender: string;
  spenderLabel: string | null;
  allowance: bigint;
  isUnlimited: boolean;
  walletBalance: bigint;
  atRisk: bigint;
}

export interface ChainScanResult {
  chainId: number;
  ok: boolean;
  error: string | null;
  approvals: TokenApproval[];
  // True when we could NOT read this chain's full history (the public connection
  // limited the range), so newer-only results may be missing older approvals.
  partial: boolean;
}

// When a full-history log read is refused by the public RPC, we page backwards
// from the latest block in windows. These bounds keep the load gentle.
const CHUNK_MAX_WINDOW = 50_000;
const CHUNK_MIN_WINDOW = 2_000;
const CHUNK_MAX_QUERIES = 60;

/**
 * Fetch this owner's ERC-20 Approval logs. Tries one full-history call first
 * (cheapest + most complete when the RPC allows it); if that's refused, pages
 * backwards from the latest block in shrinking windows. Returns the logs found
 * plus `partial = true` when we couldn't reach genesis (so the UI can warn).
 */
async function fetchApprovalLogs(
  provider: ethers.JsonRpcProvider,
  ownerTopic: string,
): Promise<{ logs: ethers.Log[]; partial: boolean }> {
  const filter = { topics: [APPROVAL_TOPIC, ownerTopic] };

  try {
    const logs = await provider.getLogs({ ...filter, fromBlock: 0, toBlock: "latest" });
    return { logs, partial: false };
  } catch {
    // fall through to windowed paging
  }

  const latest = await provider.getBlockNumber();
  const all: ethers.Log[] = [];
  let toBlock = latest;
  let window = CHUNK_MAX_WINDOW;
  let queries = 0;
  let reachedGenesis = false;

  while (toBlock > 0 && queries < CHUNK_MAX_QUERIES) {
    const fromBlock = Math.max(0, toBlock - window + 1);
    try {
      const logs = await provider.getLogs({ ...filter, fromBlock, toBlock });
      all.push(...logs);
      queries++;
      if (fromBlock === 0) {
        reachedGenesis = true;
        break;
      }
      toBlock = fromBlock - 1;
      // gently grow the window back up after a success
      window = Math.min(CHUNK_MAX_WINDOW, window * 2);
    } catch {
      // window too large for this RPC — shrink and retry the same toBlock
      if (window <= CHUNK_MIN_WINDOW) {
        // even the smallest window failed; stop and report partial
        break;
      }
      window = Math.max(CHUNK_MIN_WINDOW, Math.floor(window / 2));
    }
  }

  return { logs: all, partial: !reachedGenesis };
}

async function runInBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const res = await Promise.all(chunk.map(fn));
    out.push(...res);
  }
  return out;
}

/**
 * Read-only scan of one chain. Finds every ERC-20 `Approval` this owner has ever
 * granted (via event logs), then keeps only those whose CURRENT allowance is
 * still above zero. Never sends a transaction.
 */
export async function scanChainApprovals(chainId: number, owner: string): Promise<ChainScanResult> {
  const provider = getReadProvider(chainId);
  const ownerTopic = ethers.zeroPadValue(ethers.getAddress(owner), 32);

  let logs: ethers.Log[];
  let partial: boolean;
  try {
    const res = await fetchApprovalLogs(provider, ownerTopic);
    logs = res.logs;
    partial = res.partial;
  } catch (err: any) {
    return {
      chainId,
      ok: false,
      error: err?.message || "This network's free connection wouldn't return the full history right now.",
      approvals: [],
      partial: true,
    };
  }

  // Unique (token, spender) pairs. ERC-20 Approval has exactly 3 topics; ERC-721
  // approvals carry 4 topics (indexed tokenId) — skip those.
  const pairs = new Map<string, { token: string; spender: string }>();
  for (const log of logs) {
    if (log.topics.length !== 3) continue;
    const token = log.address.toLowerCase();
    const spender = ethers.getAddress("0x" + log.topics[2].slice(26));
    const key = `${token}|${spender.toLowerCase()}`;
    if (!pairs.has(key)) pairs.set(key, { token, spender });
  }

  const results = await runInBatches(Array.from(pairs.values()), 8, async ({ token, spender }) => {
    try {
      const c = new ethers.Contract(token, ERC20_ABI, provider);
      const allowanceRaw = BigInt((await c.allowance(owner, spender)).toString());
      if (allowanceRaw <= 0n) return null;

      const [symbol, decimals, balance] = await Promise.all([
        c.symbol().catch(() => null),
        c.decimals().catch(() => 18),
        c.balanceOf(owner).catch(() => 0n),
      ]);

      const walletBalance = BigInt(balance.toString());
      const isUnlimited = allowanceRaw >= UNLIMITED_THRESHOLD;
      const atRisk = allowanceRaw < walletBalance ? allowanceRaw : walletBalance;

      const approval: TokenApproval = {
        id: `${chainId}-${token}-${spender.toLowerCase()}`,
        chainId,
        token,
        tokenSymbol: typeof symbol === "string" && symbol ? symbol : `${token.slice(0, 6)}…`,
        tokenDecimals: Number(decimals) || 18,
        spender,
        spenderLabel: labelForSpender(spender),
        allowance: allowanceRaw,
        isUnlimited,
        walletBalance,
        atRisk,
      };
      return approval;
    } catch {
      return null;
    }
  });

  const approvals = results.filter((a): a is TokenApproval => a !== null);

  // Sort: unlimited first, then by amount actually at risk (highest first).
  approvals.sort((a, b) => {
    if (a.isUnlimited !== b.isUnlimited) return a.isUnlimited ? -1 : 1;
    return b.atRisk > a.atRisk ? 1 : b.atRisk < a.atRisk ? -1 : 0;
  });

  return { chainId, ok: true, error: null, approvals, partial };
}

async function ensureChain(chainId: number) {
  const { chainId: current, switchChain } = useEvmWallet.getState();
  if (current !== chainId) {
    await switchChain(chainId);
    const after = useEvmWallet.getState().chainId;
    if (after !== chainId) {
      throw new Error(`Switch to ${EVM_CHAINS[chainId]?.name || chainId} in your wallet and try again.`);
    }
  }
}

/** Build + send an approve(spender, 0) transaction. The member signs it. */
export async function revokeApproval(
  chainId: number,
  token: string,
  spender: string,
  from: string,
): Promise<string> {
  await ensureChain(chainId);
  const data = erc20Iface.encodeFunctionData("approve", [spender, 0n]);
  return await sendEvmTransaction({ from, to: token, data });
}

/** Re-read a single allowance so the UI can confirm a revoke landed. */
export async function getAllowance(
  chainId: number,
  token: string,
  owner: string,
  spender: string,
): Promise<bigint> {
  const provider = getReadProvider(chainId);
  const c = new ethers.Contract(token, ERC20_ABI, provider);
  return BigInt((await c.allowance(owner, spender)).toString());
}

export function formatTokenAmount(raw: bigint, decimals: number, maxFractionDigits = 6): string {
  const s = ethers.formatUnits(raw, decimals);
  const [whole, frac = ""] = s.split(".");
  if (!frac) return whole;
  const trimmed = frac.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}
