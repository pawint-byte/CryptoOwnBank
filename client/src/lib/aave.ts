import { ethers } from "ethers";
import { EVM_CHAINS, sendEvmTransaction, useEvmWallet } from "@/lib/evm-wallet";

export const AAVE_CHAIN_IDS = [1, 8453, 42161, 137] as const;
export type AaveChainId = (typeof AAVE_CHAIN_IDS)[number];

export const AAVE_POOL: Record<AaveChainId, string> = {
  1: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
  8453: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  42161: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  137: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
};

export interface AaveAsset {
  symbol: string;
  address: string;
  decimals: number;
  isBorrowable: boolean;
  isCollateral: boolean;
}

export const AAVE_ASSETS: Record<AaveChainId, AaveAsset[]> = {
  1: [
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, isBorrowable: true, isCollateral: true },
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, isBorrowable: true, isCollateral: true },
    { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, isBorrowable: true, isCollateral: true },
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, isBorrowable: true, isCollateral: true },
    { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8, isBorrowable: true, isCollateral: true },
  ],
  8453: [
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, isBorrowable: true, isCollateral: true },
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18, isBorrowable: true, isCollateral: true },
    { symbol: "cbBTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8, isBorrowable: false, isCollateral: true },
  ],
  42161: [
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, isBorrowable: true, isCollateral: true },
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, isBorrowable: true, isCollateral: true },
    { symbol: "DAI", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18, isBorrowable: true, isCollateral: true },
    { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18, isBorrowable: true, isCollateral: true },
    { symbol: "WBTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8, isBorrowable: true, isCollateral: true },
  ],
  137: [
    { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6, isBorrowable: true, isCollateral: true },
    { symbol: "USDT", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6, isBorrowable: true, isCollateral: true },
    { symbol: "DAI", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18, isBorrowable: true, isCollateral: true },
    { symbol: "WETH", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18, isBorrowable: true, isCollateral: true },
    { symbol: "WBTC", address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8, isBorrowable: true, isCollateral: true },
    { symbol: "WMATIC", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18, isBorrowable: true, isCollateral: true },
  ],
};

const POOL_ABI = [
  "function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))",
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const providerCache: Record<number, ethers.JsonRpcProvider> = {};
function getReadProvider(chainId: number): ethers.JsonRpcProvider {
  if (!providerCache[chainId]) {
    const chain = EVM_CHAINS[chainId];
    if (!chain) throw new Error(`Unsupported chain ${chainId}`);
    providerCache[chainId] = new ethers.JsonRpcProvider(chain.rpcUrl);
  }
  return providerCache[chainId];
}

const RAY = 10n ** 27n;
const SECONDS_PER_YEAR = 31_536_000n;

/** Convert Aave's per-second RAY rate to compounded APY (decimal, e.g. 0.045 = 4.5%). */
function rayRateToApy(ratePerYearInRay: bigint): number {
  const ratePerSecond = Number(ratePerYearInRay) / Number(RAY) / Number(SECONDS_PER_YEAR);
  const apy = Math.pow(1 + ratePerSecond, Number(SECONDS_PER_YEAR)) - 1;
  return apy;
}

export interface ReserveSnapshot {
  asset: AaveAsset;
  supplyApy: number;
  variableBorrowApy: number;
  aTokenAddress: string;
  variableDebtTokenAddress: string;
}

export async function fetchReserveSnapshot(chainId: AaveChainId, asset: AaveAsset): Promise<ReserveSnapshot> {
  const provider = getReadProvider(chainId);
  const pool = new ethers.Contract(AAVE_POOL[chainId], POOL_ABI, provider);
  const data = await pool.getReserveData(asset.address);
  return {
    asset,
    supplyApy: rayRateToApy(BigInt(data.currentLiquidityRate.toString())),
    variableBorrowApy: rayRateToApy(BigInt(data.currentVariableBorrowRate.toString())),
    aTokenAddress: data.aTokenAddress,
    variableDebtTokenAddress: data.variableDebtTokenAddress,
  };
}

export interface UserAssetPosition {
  asset: AaveAsset;
  walletBalance: bigint;
  supplied: bigint;
  borrowed: bigint;
  supplyApy: number;
  variableBorrowApy: number;
  aTokenAddress: string;
  variableDebtTokenAddress: string;
}

export async function fetchUserAssetPositions(
  chainId: AaveChainId,
  user: string,
): Promise<UserAssetPosition[]> {
  const provider = getReadProvider(chainId);
  const pool = new ethers.Contract(AAVE_POOL[chainId], POOL_ABI, provider);
  const assets = AAVE_ASSETS[chainId];

  return await Promise.all(
    assets.map(async (asset) => {
      const data = await pool.getReserveData(asset.address);
      const token = new ethers.Contract(asset.address, ERC20_ABI, provider);
      const aToken = new ethers.Contract(data.aTokenAddress, ERC20_ABI, provider);
      const debtToken = new ethers.Contract(data.variableDebtTokenAddress, ERC20_ABI, provider);

      const [walletBalance, supplied, borrowed] = await Promise.all([
        token.balanceOf(user).catch(() => 0n),
        aToken.balanceOf(user).catch(() => 0n),
        debtToken.balanceOf(user).catch(() => 0n),
      ]);

      return {
        asset,
        walletBalance: BigInt(walletBalance.toString()),
        supplied: BigInt(supplied.toString()),
        borrowed: BigInt(borrowed.toString()),
        supplyApy: rayRateToApy(BigInt(data.currentLiquidityRate.toString())),
        variableBorrowApy: rayRateToApy(BigInt(data.currentVariableBorrowRate.toString())),
        aTokenAddress: data.aTokenAddress,
        variableDebtTokenAddress: data.variableDebtTokenAddress,
      };
    }),
  );
}

export interface AccountSummary {
  totalCollateralUsd: number;
  totalDebtUsd: number;
  availableBorrowsUsd: number;
  ltvBps: number;
  liquidationThresholdBps: number;
  healthFactor: number;
}

export async function fetchUserAccountSummary(
  chainId: AaveChainId,
  user: string,
): Promise<AccountSummary> {
  const provider = getReadProvider(chainId);
  const pool = new ethers.Contract(AAVE_POOL[chainId], POOL_ABI, provider);
  const r = await pool.getUserAccountData(user);
  const baseDecimals = 1e8;
  const hfRaw = BigInt(r.healthFactor.toString());
  const healthFactor =
    hfRaw > 10n ** 36n ? Infinity : Number(hfRaw) / 1e18;
  return {
    totalCollateralUsd: Number(r.totalCollateralBase) / baseDecimals,
    totalDebtUsd: Number(r.totalDebtBase) / baseDecimals,
    availableBorrowsUsd: Number(r.availableBorrowsBase) / baseDecimals,
    ltvBps: Number(r.ltv),
    liquidationThresholdBps: Number(r.currentLiquidationThreshold),
    healthFactor,
  };
}

const erc20Iface = new ethers.Interface(ERC20_ABI);
const poolIface = new ethers.Interface(POOL_ABI);

async function ensureChain(chainId: number) {
  const { chainId: current, switchChain } = useEvmWallet.getState();
  if (current !== chainId) {
    await switchChain(chainId);
    const after = useEvmWallet.getState().chainId;
    if (after !== chainId) throw new Error(`Switch to ${EVM_CHAINS[chainId]?.name || chainId} in your wallet and try again`);
  }
}

export async function fetchAllowance(chainId: AaveChainId, token: string, owner: string): Promise<bigint> {
  const provider = getReadProvider(chainId);
  const c = new ethers.Contract(token, ERC20_ABI, provider);
  const v = await c.allowance(owner, AAVE_POOL[chainId]);
  return BigInt(v.toString());
}

export const MAX_UINT256 = (1n << 256n) - 1n;

export async function sendApprove(chainId: AaveChainId, token: string, amount: bigint, from: string): Promise<string> {
  await ensureChain(chainId);
  const current = await fetchAllowance(chainId, token, from);
  if (current > 0n && current < amount) {
    const resetData = erc20Iface.encodeFunctionData("approve", [AAVE_POOL[chainId], 0n]);
    const resetHash = await sendEvmTransaction({ from, to: token, data: resetData });
    const provider = getReadProvider(chainId);
    await provider.waitForTransaction(resetHash, 1, 120_000).catch(() => null);
  }
  const data = erc20Iface.encodeFunctionData("approve", [AAVE_POOL[chainId], amount]);
  return await sendEvmTransaction({ from, to: token, data });
}

export async function sendSupply(chainId: AaveChainId, asset: string, amount: bigint, from: string): Promise<string> {
  await ensureChain(chainId);
  const data = poolIface.encodeFunctionData("supply", [asset, amount, from, 0]);
  return await sendEvmTransaction({ from, to: AAVE_POOL[chainId], data });
}

export async function sendWithdraw(chainId: AaveChainId, asset: string, amount: bigint, from: string): Promise<string> {
  await ensureChain(chainId);
  const data = poolIface.encodeFunctionData("withdraw", [asset, amount, from]);
  return await sendEvmTransaction({ from, to: AAVE_POOL[chainId], data });
}

export async function sendBorrow(chainId: AaveChainId, asset: string, amount: bigint, from: string): Promise<string> {
  await ensureChain(chainId);
  const data = poolIface.encodeFunctionData("borrow", [asset, amount, 2, 0, from]);
  return await sendEvmTransaction({ from, to: AAVE_POOL[chainId], data });
}

export async function sendRepay(chainId: AaveChainId, asset: string, amount: bigint, from: string): Promise<string> {
  await ensureChain(chainId);
  const data = poolIface.encodeFunctionData("repay", [asset, amount, 2, from]);
  return await sendEvmTransaction({ from, to: AAVE_POOL[chainId], data });
}

export function formatAmount(raw: bigint, decimals: number, maxFractionDigits = 6): string {
  const s = ethers.formatUnits(raw, decimals);
  const [whole, frac = ""] = s.split(".");
  if (!frac) return whole;
  const trimmed = frac.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function parseAmount(input: string, decimals: number): bigint {
  if (!input || input.trim() === "" || isNaN(Number(input))) return 0n;
  try {
    return ethers.parseUnits(input.trim(), decimals);
  } catch {
    return 0n;
  }
}

export function formatApy(apy: number): string {
  if (!isFinite(apy) || isNaN(apy)) return "—";
  return `${(apy * 100).toFixed(2)}%`;
}

export function formatHealthFactor(hf: number): string {
  if (!isFinite(hf)) return "∞";
  if (hf > 1000) return ">1000";
  return hf.toFixed(2);
}

export function healthFactorColor(hf: number): string {
  if (!isFinite(hf) || hf > 5) return "text-green-600 dark:text-green-400";
  if (hf > 2) return "text-emerald-600 dark:text-emerald-400";
  if (hf > 1.5) return "text-yellow-600 dark:text-yellow-400";
  if (hf > 1.1) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}
