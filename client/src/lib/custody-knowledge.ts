export interface StakingOption {
  platform: string;
  method: string;
  apyRange: string;
  apyMid: number;
  link: string;
}

export interface DefiAlternative {
  tradFiProduct: string;
  tradFiApy: string;
  defiProtocol: string;
  defiApy: string;
  defiApyMid: number;
  riskLevel: "Low" | "Medium" | "High";
  link: string;
}

export interface ExchangeEarnOption {
  exchange: string;
  program: string;
  apyRange: string;
  apyMid: number;
  flexible: boolean;
  link: string;
}

export interface AssetKnowledge {
  symbol: string;
  name: string;
  stakeable: boolean;
  stakingOptions?: StakingOption[];
  defiAlternatives?: DefiAlternative[];
  exchangeEarnOptions?: ExchangeEarnOption[];
  warnings?: string[];
  selfCustodyWallets?: string[];
  withdrawable?: boolean;
}

export const CUSTODY_KNOWLEDGE: Record<string, AssetKnowledge> = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Lido", method: "Liquid Staking (stETH)", apyRange: "3.0–3.5%", apyMid: 3.25, link: "https://lido.fi" },
      { platform: "Rocket Pool", method: "Decentralized Staking (rETH)", apyRange: "2.8–3.2%", apyMid: 3.0, link: "https://rocketpool.net" },
      { platform: "Coinbase (cbETH)", method: "Wrapped Staking", apyRange: "2.5–3.0%", apyMid: 2.75, link: "https://www.coinbase.com/earn" },
      { platform: "EigenLayer", method: "Restaking", apyRange: "Variable + Points", apyMid: 4.0, link: "https://www.eigenlayer.xyz" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "ETH Staking", apyRange: "2.5–3.0%", apyMid: 2.75, flexible: false, link: "https://www.coinbase.com/earn" },
      { exchange: "Kraken", program: "ETH Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://www.kraken.com/features/staking-coins" },
      { exchange: "Binance", program: "ETH 2.0 Staking", apyRange: "2.5–3.5%", apyMid: 3.0, flexible: false, link: "https://www.binance.com/en/eth2" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "1.5–3.0%", apyMid: 2.0, flexible: true, link: "https://crypto.com/earn" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Lido stETH", defiApy: "3.2%", defiApyMid: 3.2, riskLevel: "Low", link: "https://lido.fi" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave ETH Lending", defiApy: "2.0–4.0%", defiApyMid: 3.0, riskLevel: "Medium", link: "https://aave.com" },
    ],
    warnings: ["Never share your seed phrase", "Verify staking contracts before depositing"],
    selfCustodyWallets: ["Ledger Nano X", "Trezor Model T", "MetaMask (software)"],
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Marinade", method: "Liquid Staking (mSOL)", apyRange: "6.5–7.5%", apyMid: 7.0, link: "https://marinade.finance" },
      { platform: "Jito", method: "Liquid Staking (JitoSOL)", apyRange: "7.0–8.0%", apyMid: 7.5, link: "https://www.jito.network" },
      { platform: "Native Delegation", method: "Direct Validator Staking", apyRange: "6.0–7.0%", apyMid: 6.5, link: "https://solanabeach.io/validators" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "SOL Staking", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: false, link: "https://www.coinbase.com/earn" },
      { exchange: "Kraken", program: "SOL Staking", apyRange: "5.0–6.0%", apyMid: 5.5, flexible: false, link: "https://www.kraken.com/features/staking-coins" },
      { exchange: "Binance", program: "SOL Staking", apyRange: "5.0–7.0%", apyMid: 6.0, flexible: false, link: "https://www.binance.com/en/staking" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Jito Staking", defiApy: "7.5%", defiApyMid: 7.5, riskLevel: "Low", link: "https://www.jito.network" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Phantom (software)", "Solflare (software)"],
  },
  XRP: {
    symbol: "XRP",
    name: "XRP",
    stakeable: false,
    withdrawable: true,
    defiAlternatives: [],
    warnings: ["XRPL does not support native staking"],
    selfCustodyWallets: ["Ledger Nano X", "Xaman (XUMM)", "Ellipal Titan", "Arculus"],
  },
  ADA: {
    symbol: "ADA",
    name: "Cardano",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Delegation", method: "Stake Pool Delegation", apyRange: "3.0–5.0%", apyMid: 4.0, link: "https://pool.pm" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "ADA Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://www.kraken.com/features/staking-coins" },
      { exchange: "Binance", program: "ADA Staking", apyRange: "1.5–3.0%", apyMid: 2.0, flexible: true, link: "https://www.binance.com/en/staking" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Daedalus", "Yoroi"],
  },
  DOT: {
    symbol: "DOT",
    name: "Polkadot",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Nomination", method: "Nominating Validators", apyRange: "12–15%", apyMid: 13.5, link: "https://polkadot.js.org/apps/#/staking" },
      { platform: "Bifrost", method: "Liquid Staking (vDOT)", apyRange: "10–13%", apyMid: 11.5, link: "https://bifrost.finance" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "DOT Staking", apyRange: "8.0–12.0%", apyMid: 10.0, flexible: false, link: "https://www.kraken.com/features/staking-coins" },
      { exchange: "Binance", program: "DOT Staking", apyRange: "10.0–12.0%", apyMid: 11.0, flexible: false, link: "https://www.binance.com/en/staking" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Polkadot.js", "Nova Wallet"],
  },
  AVAX: {
    symbol: "AVAX",
    name: "Avalanche",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Benqi", method: "Liquid Staking (sAVAX)", apyRange: "5.0–6.0%", apyMid: 5.5, link: "https://benqi.fi" },
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "8.0–9.5%", apyMid: 8.75, link: "https://wallet.avax.network" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "AVAX Staking", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: false, link: "https://www.coinbase.com/earn" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Core Wallet"],
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Crypto.com", program: "Earn", apyRange: "0.5–1.5%", apyMid: 1.0, flexible: true, link: "https://crypto.com/earn" },
      { exchange: "Binance", program: "Simple Earn", apyRange: "0.5–2.0%", apyMid: 1.0, flexible: true, link: "https://www.binance.com/en/earn" },
    ],
    warnings: ["Bitcoin does not support native staking", "Be cautious of wrapped BTC yield products"],
    selfCustodyWallets: ["Ledger Nano X", "Trezor Model T", "Coldcard", "Ellipal Titan", "Arculus"],
  },
  MATIC: {
    symbol: "MATIC",
    name: "Polygon",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Lido", method: "Liquid Staking (stMATIC)", apyRange: "4.0–5.0%", apyMid: 4.5, link: "https://polygon.lido.fi" },
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "4.5–5.5%", apyMid: 5.0, link: "https://staking.polygon.technology" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "MATIC Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://www.coinbase.com/earn" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask"],
  },
  BNB: {
    symbol: "BNB",
    name: "BNB",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Ankr", method: "Liquid Staking (ankrBNB)", apyRange: "2.5–3.5%", apyMid: 3.0, link: "https://www.ankr.com/staking/stake/bnb/" },
    ],
    exchangeEarnOptions: [
      { exchange: "Binance", program: "BNB Vault", apyRange: "2.0–5.0%", apyMid: 3.5, flexible: true, link: "https://www.binance.com/en/bnbvault" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Trust Wallet"],
  },
  DOGE: {
    symbol: "DOGE",
    name: "Dogecoin",
    stakeable: false,
    withdrawable: true,
    warnings: ["Dogecoin does not support staking — be wary of scam staking offers"],
    selfCustodyWallets: ["Ledger Nano X", "Ellipal Titan"],
  },
  LTC: {
    symbol: "LTC",
    name: "Litecoin",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Ledger Nano X", "Trezor Model T", "Ellipal Titan"],
  },
  TRX: {
    symbol: "TRX",
    name: "TRON",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Freezing", method: "Energy/Bandwidth Staking", apyRange: "3.0–5.0%", apyMid: 4.0, link: "https://tronscan.org/#/sr/votes" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "TronLink"],
  },
  ALGO: {
    symbol: "ALGO",
    name: "Algorand",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Governance", method: "Governance Rewards", apyRange: "5.0–8.0%", apyMid: 6.5, link: "https://governance.algorand.foundation" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Pera Wallet"],
  },
  XLM: {
    symbol: "XLM",
    name: "Stellar",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Ledger Nano X", "LOBSTR", "Arculus"],
  },
  HBAR: {
    symbol: "HBAR",
    name: "Hedera",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Staking", method: "Proxy Staking", apyRange: "2.5–3.5%", apyMid: 3.0, link: "https://hedera.com/staking" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "HashPack"],
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "USDC Rewards", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: true, link: "https://www.coinbase.com/earn" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "3.0–6.0%", apyMid: 4.5, flexible: true, link: "https://crypto.com/earn" },
    ],
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave USDC Lending", defiApy: "3.0–6.0%", defiApyMid: 4.5, riskLevel: "Low", link: "https://aave.com" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Morpho USDC", defiApy: "4.0–7.0%", defiApyMid: 5.5, riskLevel: "Medium", link: "https://morpho.org" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask", "Phantom"],
  },
  USDT: {
    symbol: "USDT",
    name: "Tether",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Binance", program: "Simple Earn", apyRange: "3.0–5.0%", apyMid: 4.0, flexible: true, link: "https://www.binance.com/en/earn" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "3.0–6.0%", apyMid: 4.5, flexible: true, link: "https://crypto.com/earn" },
    ],
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave USDT Lending", defiApy: "3.0–5.0%", defiApyMid: 4.0, riskLevel: "Low", link: "https://aave.com" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask"],
  },
  ATOM: {
    symbol: "ATOM",
    name: "Cosmos",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "15–20%", apyMid: 17.5, link: "https://www.mintscan.io/cosmos/validators" },
      { platform: "Stride", method: "Liquid Staking (stATOM)", apyRange: "14–17%", apyMid: 15.5, link: "https://stride.zone" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "ATOM Staking", apyRange: "10.0–14.0%", apyMid: 12.0, flexible: false, link: "https://www.kraken.com/features/staking-coins" },
      { exchange: "Coinbase", program: "ATOM Staking", apyRange: "8.0–12.0%", apyMid: 10.0, flexible: false, link: "https://www.coinbase.com/earn" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Keplr", "Cosmostation"],
  },
  VET: {
    symbol: "VET",
    name: "VeChain",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "VeChainThor", method: "VTHO Generation (holding)", apyRange: "1.0–2.0%", apyMid: 1.5, link: "https://www.vechain.org" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "VeChainThor Wallet"],
  },
  STETH: {
    symbol: "STETH",
    name: "Lido Staked ETH",
    stakeable: false,
    withdrawable: true,
    warnings: ["stETH is already staked ETH via Lido — it earns ~3.2% APY automatically by just holding it"],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask"],
  },
  VTHO: {
    symbol: "VTHO",
    name: "VeThor",
    stakeable: false,
    withdrawable: true,
    warnings: ["VTHO is generated passively by holding VET — it has no staking mechanism of its own"],
    selfCustodyWallets: ["Ledger Nano X", "VeChainThor Wallet"],
  },
  HBARX: {
    symbol: "HBARX",
    name: "Stader Staked HBAR",
    stakeable: false,
    withdrawable: true,
    warnings: ["HBARX represents HBAR staked via Stader — it earns staking rewards automatically"],
    selfCustodyWallets: ["HashPack"],
  },
  RLUSD: {
    symbol: "RLUSD",
    name: "Ripple USD",
    stakeable: false,
    withdrawable: true,
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Soil Credit+ Vault", defiApy: "8.0%", defiApyMid: 8.0, riskLevel: "Low", link: "https://soil.xyz" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Soil Liquid Vault", defiApy: "5.0%", defiApyMid: 5.0, riskLevel: "Low", link: "https://soil.xyz" },
    ],
    selfCustodyWallets: ["Xaman (XUMM)", "Ledger Nano X"],
  },
};

type WalletBrand = "ledger" | "ellipal" | "cypherock" | "safepal" | "arculus" | "xaman" | "tronlink" | "metamask" | "stader" | "unknown";

function detectWalletBrand(label: string): WalletBrand {
  const l = label.toLowerCase().trim();
  if (l.includes("ledger")) return "ledger";
  if (l.includes("ellipal")) return "ellipal";
  if (l.includes("cypherock") || l.includes("cyphe")) return "cypherock";
  if (l.includes("safepal")) return "safepal";
  if (l.includes("arculus")) return "arculus";
  if (l.includes("xaman") || l.includes("xumm")) return "xaman";
  if (l.includes("tronlink")) return "tronlink";
  if (l.includes("metamask")) return "metamask";
  if (l.includes("stader")) return "stader";
  return "unknown";
}

interface WalletAction {
  text: string;
  link?: string;
}

const WALLET_STAKING_GUIDES: Record<string, Record<WalletBrand, WalletAction[]>> = {
  TRX: {
    ledger: [
      { text: "Open Ledger Live → connect your Ledger → open the Tron app", link: "https://support.ledger.com/article/360006904193-zd" },
      { text: "Go to TronScan, click 'Connect Wallet' → select 'Ledger', then vote for a Super Representative", link: "https://tronscan.org/#/sr/votes" },
      { text: "Pick an SR with high APR and 100% reward share (e.g. Binance Staking, TRONALLIANCE)" },
    ],
    ellipal: [
      { text: "Open the ELLIPAL app on your phone → select your TRX wallet" },
      { text: "Tap 'Freeze' to freeze your TRX for Energy or Bandwidth" },
      { text: "Then tap 'Vote' to vote for a Super Representative — this is what earns the ~3-5% APY" },
      { text: "ELLIPAL staking guide", link: "https://www.ellipal.com/blogs/support/how-to-vote-trx" },
    ],
    safepal: [
      { text: "Open SafePal app → select your TRX wallet → tap 'DApp'" },
      { text: "Navigate to tronscan.org → Connect Wallet → vote for a Super Representative", link: "https://tronscan.org/#/sr/votes" },
    ],
    cypherock: [
      { text: "CypheRock does not directly support TRX staking — you would need to transfer to a Ledger or TronLink wallet to stake" },
    ],
    arculus: [
      { text: "Arculus does not directly support TRX staking — you would need to transfer to a Ledger or TronLink wallet to stake" },
    ],
    tronlink: [
      { text: "Open TronLink extension → click 'Freeze' → freeze TRX for Energy" },
      { text: "Go to TronScan → Connect TronLink → vote for a Super Representative", link: "https://tronscan.org/#/sr/votes" },
    ],
    xaman: [],
    metamask: [],
    stader: [],
    unknown: [
      { text: "Freeze your TRX and vote for a Super Representative to earn ~3-5% APY", link: "https://tronscan.org/#/sr/votes" },
    ],
  },
  ALGO: {
    ledger: [
      { text: "Connect your Ledger to Pera Wallet (perawallet.app) — it supports Ledger hardware wallets", link: "https://perawallet.app" },
      { text: "Once connected, go to Algorand Governance portal and commit your ALGO for the current period", link: "https://governance.algorand.foundation" },
      { text: "You must vote during each governance period to earn the full reward" },
    ],
    ellipal: [
      { text: "ELLIPAL supports Algorand — open the app, select your ALGO wallet" },
      { text: "Use ELLIPAL's built-in DApp browser to visit the Algorand Governance portal", link: "https://governance.algorand.foundation" },
      { text: "Commit your ALGO and vote during each governance period" },
    ],
    safepal: [
      { text: "Open SafePal → select ALGO wallet → use DApp browser to join Algorand Governance", link: "https://governance.algorand.foundation" },
    ],
    cypherock: [
      { text: "CypheRock does not directly support ALGO governance — consider using Pera Wallet for governance participation", link: "https://perawallet.app" },
    ],
    arculus: [
      { text: "Arculus does not directly support ALGO governance — consider using Pera Wallet", link: "https://perawallet.app" },
    ],
    tronlink: [],
    xaman: [],
    metamask: [],
    stader: [],
    unknown: [
      { text: "Join Algorand Governance to earn 5-8% APY on your ALGO", link: "https://governance.algorand.foundation" },
    ],
  },
  ATOM: {
    ledger: [
      { text: "Open Ledger Live → install the Cosmos app on your Ledger" },
      { text: "Go to Keplr wallet (keplr.app), connect your Ledger, and delegate to a validator", link: "https://wallet.keplr.app/chains/cosmos-hub" },
      { text: "Or use Ledger Live's built-in staking to delegate ATOM directly" },
    ],
    ellipal: [
      { text: "Open ELLIPAL app → select your ATOM wallet → tap 'Delegate'" },
      { text: "Choose a validator with good uptime and commission rate" },
      { text: "ELLIPAL Cosmos staking guide", link: "https://www.ellipal.com/blogs/support" },
    ],
    safepal: [
      { text: "Open SafePal → ATOM wallet → use DApp browser to connect to Keplr or Mintscan", link: "https://www.mintscan.io/cosmos/validators" },
    ],
    cypherock: [
      { text: "CypheRock doesn't support Cosmos delegation directly — use Keplr wallet to delegate", link: "https://wallet.keplr.app/chains/cosmos-hub" },
    ],
    arculus: [
      { text: "Arculus doesn't support Cosmos delegation directly — use Keplr wallet", link: "https://wallet.keplr.app/chains/cosmos-hub" },
    ],
    tronlink: [],
    xaman: [],
    metamask: [],
    stader: [],
    unknown: [
      { text: "Delegate your ATOM to a validator via Keplr wallet for 15-20% APY", link: "https://wallet.keplr.app/chains/cosmos-hub" },
    ],
  },
  HBAR: {
    ledger: [
      { text: "Connect your Ledger to HashPack wallet — it supports Ledger hardware signing", link: "https://www.hashpack.app" },
      { text: "Select a node to stake to — Hedera native staking earns ~2.5-3.5% APY", link: "https://hedera.com/staking" },
    ],
    stader: [
      { text: "If your HBAR is already on Stader, it may already be staked — check your HBARX balance" },
      { text: "HBARX is Stader's liquid staking token for HBAR — holding it means you're earning staking rewards", link: "https://www.staderlabs.com/hedera/" },
    ],
    ellipal: [
      { text: "ELLIPAL doesn't natively support HBAR staking — use HashPack wallet", link: "https://www.hashpack.app" },
    ],
    safepal: [
      { text: "SafePal doesn't natively support HBAR staking — use HashPack wallet", link: "https://www.hashpack.app" },
    ],
    cypherock: [
      { text: "CypheRock doesn't support HBAR staking — use HashPack wallet", link: "https://www.hashpack.app" },
    ],
    arculus: [
      { text: "Arculus doesn't support HBAR staking — use HashPack wallet", link: "https://www.hashpack.app" },
    ],
    tronlink: [],
    xaman: [],
    metamask: [],
    unknown: [
      { text: "Stake HBAR via HashPack wallet for ~2.5-3.5% APY", link: "https://www.hashpack.app" },
    ],
  },
  DOT: {
    ledger: [
      { text: "Open Ledger Live → install the Polkadot app → use Ledger Live's built-in staking to nominate validators" },
      { text: "Or connect Ledger to Polkadot.js for more control over validator selection", link: "https://polkadot.js.org/apps/#/staking" },
      { text: "Note: Ledger Earn nomination pools move DOT off your visible address — your DOT is still safe" },
    ],
    ellipal: [
      { text: "ELLIPAL doesn't directly support DOT nomination — use Polkadot.js or Nova Wallet", link: "https://polkadot.js.org/apps/#/staking" },
    ],
    safepal: [
      { text: "SafePal supports Polkadot — use the DApp browser to access Polkadot.js staking", link: "https://polkadot.js.org/apps/#/staking" },
    ],
    cypherock: [
      { text: "CypheRock doesn't support DOT staking — use Nova Wallet or Polkadot.js", link: "https://polkadot.js.org/apps/#/staking" },
    ],
    arculus: [
      { text: "Arculus doesn't support DOT staking — use Nova Wallet or Polkadot.js", link: "https://polkadot.js.org/apps/#/staking" },
    ],
    tronlink: [],
    xaman: [],
    metamask: [],
    stader: [],
    unknown: [
      { text: "Nominate validators on Polkadot for 12-15% APY", link: "https://polkadot.js.org/apps/#/staking" },
    ],
  },
  ADA: {
    ledger: [
      { text: "Open Ledger Live → install the Cardano app → use Ledger Live to delegate to a stake pool" },
      { text: "Or connect Ledger to Yoroi or Eternl wallet for more stake pool choices", link: "https://pool.pm" },
    ],
    ellipal: [
      { text: "Open ELLIPAL app → select ADA wallet → tap 'Delegate' to choose a stake pool" },
      { text: "Browse stake pools at pool.pm", link: "https://pool.pm" },
    ],
    safepal: [
      { text: "SafePal supports ADA — use the DApp browser or built-in staking to delegate" },
    ],
    cypherock: [
      { text: "CypheRock doesn't support ADA delegation — use Yoroi or Eternl wallet", link: "https://yoroi-wallet.com" },
    ],
    arculus: [
      { text: "Arculus doesn't support ADA delegation — use Yoroi or Eternl wallet", link: "https://yoroi-wallet.com" },
    ],
    tronlink: [],
    xaman: [],
    metamask: [],
    stader: [],
    unknown: [
      { text: "Delegate your ADA to a stake pool for 3-5% APY", link: "https://pool.pm" },
    ],
  },
  ETH: {
    ledger: [
      { text: "Your stETH on Ledger is already earning ~3.2% APY via Lido — no action needed", link: "https://lido.fi" },
    ],
    ellipal: [
      { text: "Stake ETH via Lido — swap ETH for stETH which earns ~3.2% APY automatically", link: "https://lido.fi" },
    ],
    safepal: [
      { text: "Use SafePal's DApp browser to access Lido and swap ETH for stETH", link: "https://lido.fi" },
    ],
    cypherock: [
      { text: "Use MetaMask or a web wallet to access Lido staking for ETH", link: "https://lido.fi" },
    ],
    arculus: [
      { text: "Arculus doesn't support ETH staking — use MetaMask with Lido", link: "https://lido.fi" },
    ],
    tronlink: [],
    xaman: [],
    metamask: [
      { text: "Connect MetaMask to Lido and stake your ETH for stETH (~3.2% APY)", link: "https://lido.fi" },
    ],
    stader: [],
    unknown: [
      { text: "Stake ETH via Lido for ~3.2% APY (you get stETH in return)", link: "https://lido.fi" },
    ],
  },
  CRO: {
    ledger: [
      { text: "Your CRO is already staked via Ledger — earning validator delegation rewards" },
    ],
    ellipal: [
      { text: "ELLIPAL supports Cronos — use the app to delegate CRO to a validator" },
    ],
    safepal: [],
    cypherock: [],
    arculus: [],
    tronlink: [],
    xaman: [],
    metamask: [],
    stader: [],
    unknown: [
      { text: "Delegate CRO to a Cronos validator for staking rewards" },
    ],
  },
};

const VET_PASSIVE_NOTE: ActionItem = {
  text: "VET generates VTHO passively just by holding it — no staking action needed. You're already earning ~1-2% equivalent.",
  link: "https://www.vechain.org",
};

export function getWalletSpecificActions(symbol: string, walletLabel: string): ActionItem[] {
  const brand = detectWalletBrand(walletLabel);
  const guideMap = WALLET_STAKING_GUIDES[symbol];
  if (!guideMap) return [];
  const actions = guideMap[brand] || guideMap.unknown || [];
  return actions;
}

export type RecommendationType =
  | "optimal"
  | "move_to_cold"
  | "split_strategy"
  | "stake_available"
  | "defi_yield"
  | "scam_warning"
  | "no_action"
  | "no_data";

export interface AssetRecommendation {
  symbol: string;
  name: string;
  type: RecommendationType;
  title: string;
  description: string;
  currentLocation: string;
  currentYield: number;
  bestYield: number;
  bestYieldSource: string;
  usdValue: number;
  missedAnnual: number;
  actionItems: ActionItem[];
  riskNote?: string;
}

export interface ActionItem {
  text: string;
  link?: string;
}

const DUST_THRESHOLD_USD = 5;

const SCAM_PATTERNS = [
  /https?:\/\//i,
  /visit\s/i,
  /claim\s/i,
  /airdrop/i,
  /reward/i,
  /\.com\b/i,
  /\.xyz\b/i,
  /\.fi\b/i,
  /\.io\b/i,
  /\.pro\b/i,
  /\.eu\b/i,
  /\.cash\b/i,
];

export function isScamToken(symbol: string): boolean {
  return SCAM_PATTERNS.some(p => p.test(symbol)) || symbol.length > 20;
}

export interface StakedContext {
  stakedUsdOnSameWallet: number;
  stakedBalanceOnSameWallet: number;
}

export function evaluateAsset(
  symbol: string,
  location: "cold_wallet" | "exchange" | "defi",
  provider: string,
  usdValue: number,
  isAlreadyStaked: boolean,
  stakedContext?: StakedContext,
): AssetRecommendation {
  const knowledge = CUSTODY_KNOWLEDGE[symbol];
  const displayName = knowledge?.name || symbol;

  if (isScamToken(symbol)) {
    return {
      symbol, name: symbol, type: "scam_warning", title: "Suspected Scam Token",
      description: `This token name contains a URL or suspicious pattern. It was likely airdropped to your ${provider} wallet as a dust attack. Do NOT interact with it — clicking links or approving transactions could drain your wallet.`,
      currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue: 0, missedAnnual: 0,
      actionItems: [
        { text: "Do not click any links in the token name" },
        { text: "Do not try to sell or swap this token" },
        { text: "Ignore it — it cannot affect your other assets if left alone" },
      ],
    };
  }

  if (usdValue < DUST_THRESHOLD_USD) {
    return {
      symbol, name: displayName, type: "no_action", title: "Dust Balance",
      description: `$${usdValue.toFixed(2)} on ${provider} is too small to act on — gas/withdrawal fees would exceed the value.`,
      currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0, actionItems: [],
    };
  }

  if (!knowledge) {
    return {
      symbol, name: displayName, type: "no_data", title: "No Data Available",
      description: `We don't have optimization data for ${symbol} yet. Your funds are ${location === "cold_wallet" ? `safely self-custodied on ${provider}` : location === "exchange" ? `on ${provider} — consider moving to a cold wallet for safety` : `in DeFi on ${provider}`}.`,
      currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
      actionItems: location === "exchange" ? [{ text: "Consider moving to a cold wallet for self-custody" }] : [],
    };
  }

  const bestStaking = knowledge.stakingOptions?.reduce((best, opt) => opt.apyMid > best ? opt.apyMid : best, 0) || 0;
  const bestStakingSource = knowledge.stakingOptions?.reduce((best, opt) => opt.apyMid > (best?.apyMid || 0) ? opt : best, null as StakingOption | null);

  const bestDefi = knowledge.defiAlternatives?.reduce((best, alt) => alt.defiApyMid > best ? alt.defiApyMid : best, 0) || 0;
  const bestDefiSource = knowledge.defiAlternatives?.reduce((best, alt) => alt.defiApyMid > (best?.defiApyMid || 0) ? alt : best, null as DefiAlternative | null);

  const bestSelfCustodyYield = Math.max(bestStaking, bestDefi);
  const bestSelfCustodyLabel = bestStaking >= bestDefi
    ? bestStakingSource?.platform || ""
    : bestDefiSource?.defiProtocol || "";

  const providerNorm = provider.toLowerCase();
  const matchingExchangeEarn = knowledge.exchangeEarnOptions?.filter(e =>
    providerNorm.includes(e.exchange.toLowerCase())
  ) || [];
  const bestExchangeEarnOnCurrent = matchingExchangeEarn.reduce((best, e) => e.apyMid > best ? e.apyMid : best, 0);
  const bestExchangeEarnOnCurrentSource = matchingExchangeEarn.reduce((best, e) => e.apyMid > (best?.apyMid || 0) ? e : best, null as ExchangeEarnOption | null);

  const bestExchangeEarnAnywhere = knowledge.exchangeEarnOptions?.reduce((best, e) => e.apyMid > best ? e.apyMid : best, 0) || 0;

  const bestOverall = Math.max(bestSelfCustodyYield, bestExchangeEarnAnywhere);
  let bestOverallSource = "";
  if (bestOverall === bestSelfCustodyYield && bestSelfCustodyYield > 0) bestOverallSource = bestSelfCustodyLabel;
  else if (bestOverall > 0) {
    const src = knowledge.exchangeEarnOptions?.reduce((best, e) => e.apyMid > (best?.apyMid || 0) ? e : best, null as ExchangeEarnOption | null);
    bestOverallSource = src ? `${src.exchange} ${src.program}` : "";
  }

  if (location === "defi") {
    return {
      symbol, name: displayName, type: "optimal", title: "Earning in DeFi",
      description: `${symbol} is in a non-custodial DeFi protocol on ${provider} — you control your keys and are earning yield.`,
      currentLocation: provider, currentYield: bestDefi, bestYield: bestDefi, bestYieldSource: provider, usdValue, missedAnnual: 0,
      actionItems: [],
    };
  }

  if (location === "cold_wallet") {
    const walletBrand = detectWalletBrand(provider);
    const walletActions = getWalletSpecificActions(symbol, provider);

    if (symbol === "VET") {
      return {
        symbol, name: displayName, type: "optimal", title: "Earning Passively",
        description: `VET on your ${provider} wallet generates VTHO automatically just by holding it — no staking action needed.`,
        currentLocation: provider, currentYield: 1.5, bestYield: 1.5, bestYieldSource: "VTHO Generation", usdValue, missedAnnual: 0,
        actionItems: [VET_PASSIVE_NOTE],
      };
    }

    if (symbol === "STETH") {
      return {
        symbol, name: displayName, type: "optimal", title: "Already Earning",
        description: `stETH on your ${provider} wallet is already staked ETH via Lido — it earns ~3.2% APY automatically just by holding it.`,
        currentLocation: provider, currentYield: 3.2, bestYield: 3.2, bestYieldSource: "Lido", usdValue, missedAnnual: 0,
        actionItems: [{ text: "stETH earns Ethereum staking rewards automatically — no action needed", link: "https://lido.fi" }],
      };
    }

    if (symbol === "VTHO") {
      return {
        symbol, name: displayName, type: "optimal", title: "Generated Token",
        description: `VTHO on your ${provider} wallet is generated passively by your VET holdings. It can be used for transactions on VeChain or traded.`,
        currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
        actionItems: [{ text: "VTHO is generated by holding VET — consider saving or trading it" }],
      };
    }

    if (symbol === "HBARX") {
      return {
        symbol, name: displayName, type: "optimal", title: "Staked Position",
        description: `HBARX on ${provider} represents your staked HBAR via Stader — earning staking rewards automatically.`,
        currentLocation: provider, currentYield: 3.0, bestYield: 3.0, bestYieldSource: "Stader", usdValue, missedAnnual: 0,
        actionItems: [{ text: "HBARX accrues staking rewards automatically — no action needed", link: "https://www.staderlabs.com/hedera/" }],
      };
    }

    if (symbol === "HBAR" && walletBrand === "stader") {
      return {
        symbol, name: displayName, type: "optimal", title: "Staking via Stader",
        description: `HBAR on ${provider} is being staked through Stader's liquid staking protocol — you're already earning rewards.`,
        currentLocation: provider, currentYield: 3.0, bestYield: 3.0, bestYieldSource: "Stader Liquid Staking", usdValue, missedAnnual: 0,
        actionItems: [
          { text: "Your HBAR is staked via Stader — HBARX represents your staked position", link: "https://www.staderlabs.com/hedera/" },
          { text: "Staking rewards accrue automatically — no action needed" },
        ],
      };
    }

    if (isAlreadyStaked) {
      return {
        symbol, name: displayName, type: "optimal", title: "Already Staking",
        description: `${symbol} is staked on your ${provider} wallet — safe and earning yield.`,
        currentLocation: provider, currentYield: bestStaking, bestYield: bestStaking, bestYieldSource: bestStakingSource?.platform || provider, usdValue, missedAnnual: 0,
        actionItems: bestStakingSource?.link
          ? [{ text: `Earning ~${bestStaking.toFixed(1)}% APY via ${bestStakingSource.platform}`, link: bestStakingSource.link }]
          : [],
      };
    }

    const hasStakedOnSameWallet = stakedContext && stakedContext.stakedUsdOnSameWallet > 0;

    if (hasStakedOnSameWallet && bestSelfCustodyYield > 0) {
      const totalOnWallet = usdValue + stakedContext.stakedUsdOnSameWallet;
      const stakedPct = Math.round((stakedContext.stakedUsdOnSameWallet / totalOnWallet) * 100);
      const liquidPct = 100 - stakedPct;
      const missed = usdValue * (bestSelfCustodyYield / 100);
      return {
        symbol, name: displayName, type: missed > 10 ? "stake_available" : "optimal",
        title: missed > 10 ? "Partially Staked" : "Mostly Optimized",
        description: missed > 10
          ? `${stakedPct}% of your ${symbol} on ${provider} is staked and earning yield. The remaining ${liquidPct}% ($${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is liquid — staking it could earn ~$${missed.toFixed(0)}/year more.`
          : `${stakedPct}% of your ${symbol} on ${provider} is staked. The liquid remainder ($${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is too small to generate meaningful additional yield.`,
        currentLocation: provider, currentYield: bestSelfCustodyYield, bestYield: bestSelfCustodyYield,
        bestYieldSource: bestStakingSource?.platform || bestSelfCustodyLabel, usdValue, missedAnnual: missed > 10 ? missed : 0,
        actionItems: missed > 10 && walletActions.length > 0
          ? walletActions
          : missed > 10 ? [
            bestStaking > 0 ? { text: `Stake remaining via ${bestStakingSource?.platform} (${bestStakingSource?.apyRange} APY)`, link: bestStakingSource?.link } : null,
            bestDefi > 0 ? { text: `Use ${bestDefiSource?.defiProtocol} (${bestDefiSource?.defiApy} APY)`, link: bestDefiSource?.link } : null,
          ].filter(Boolean) as ActionItem[] : [],
      };
    }

    if (bestSelfCustodyYield > 0) {
      const missed = usdValue * (bestSelfCustodyYield / 100);
      return {
        symbol, name: displayName, type: "stake_available",
        title: "Yield Available",
        description: `${symbol} on your ${provider} wallet could earn ~${bestSelfCustodyYield.toFixed(1)}% APY by staking — that's ~$${missed.toFixed(0)}/year on $${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
        currentLocation: provider, currentYield: 0, bestYield: bestSelfCustodyYield, bestYieldSource: bestSelfCustodyLabel, usdValue, missedAnnual: missed,
        actionItems: walletActions.length > 0 ? walletActions : [
          bestStaking > 0 ? { text: `Stake via ${bestStakingSource?.platform} (${bestStakingSource?.apyRange} APY)`, link: bestStakingSource?.link } : null,
          bestDefi > 0 ? { text: `Use ${bestDefiSource?.defiProtocol} (${bestDefiSource?.defiApy} APY)`, link: bestDefiSource?.link } : null,
        ].filter(Boolean) as ActionItem[],
      };
    }

    return {
      symbol, name: displayName, type: "optimal", title: "Safe & Secure",
      description: `${symbol} on your ${provider} wallet — fully self-custodied. No native staking is available for this asset.`,
      currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
      actionItems: [],
    };
  }

  if (location === "exchange") {
    const canWithdraw = knowledge.withdrawable !== false;

    if (bestExchangeEarnOnCurrent > 0 && bestSelfCustodyYield > 0) {
      if (bestSelfCustodyYield > bestExchangeEarnOnCurrent) {
        const missed = usdValue * ((bestSelfCustodyYield - bestExchangeEarnOnCurrent) / 100);
        const stakingLink = bestStaking >= bestDefi ? bestStakingSource?.link : bestDefiSource?.link;
        return {
          symbol, name: displayName, type: "split_strategy",
          title: "Split Strategy Recommended",
          description: `${provider} offers ${bestExchangeEarnOnCurrentSource?.apyRange} APY on ${symbol}, but self-custody staking via ${bestSelfCustodyLabel} offers ${bestSelfCustodyYield.toFixed(1)}% — moving could earn ~$${missed.toFixed(0)}/year more.`,
          currentLocation: provider, currentYield: bestExchangeEarnOnCurrent, bestYield: bestSelfCustodyYield, bestYieldSource: bestSelfCustodyLabel, usdValue, missedAnnual: missed,
          actionItems: [
            canWithdraw ? { text: `Move a portion to cold wallet and stake via ${bestSelfCustodyLabel}`, link: stakingLink } : null,
            { text: `Keep some on ${provider} for liquidity and easy selling` },
            bestExchangeEarnOnCurrentSource?.link ? { text: `Currently earning up to ${bestExchangeEarnOnCurrentSource.apyRange} on ${provider}`, link: bestExchangeEarnOnCurrentSource.link } : { text: `Currently earning up to ${bestExchangeEarnOnCurrentSource?.apyRange} on ${provider}` },
          ].filter(Boolean) as ActionItem[],
          riskNote: "Splitting between exchange and cold wallet balances yield optimization with liquidity and safety.",
        };
      } else {
        return {
          symbol, name: displayName, type: "split_strategy",
          title: "Earning on Exchange — Consider Safety Split",
          description: `${provider} offers competitive ${bestExchangeEarnOnCurrentSource?.apyRange} APY on ${symbol}. Self-custody yield (${bestSelfCustodyYield.toFixed(1)}%) is similar or lower.`,
          currentLocation: provider, currentYield: bestExchangeEarnOnCurrent, bestYield: bestExchangeEarnOnCurrent, bestYieldSource: `${provider} ${bestExchangeEarnOnCurrentSource?.program}`, usdValue, missedAnnual: 0,
          actionItems: [
            { text: `You're earning well on ${provider} — no urgency to move` },
            canWithdraw ? { text: "For risk mitigation, consider moving a portion to cold wallet" } : null,
            { text: "Keep enough on exchange for easy liquidation if needed" },
          ].filter(Boolean) as ActionItem[],
          riskNote: "Exchange yield is good, but remember: not your keys, not your crypto. A safety split reduces risk.",
        };
      }
    }

    if (bestExchangeEarnOnCurrent > 0 && bestSelfCustodyYield === 0) {
      return {
        symbol, name: displayName, type: "split_strategy",
        title: "Earning on Exchange — No Better Alternative",
        description: `${symbol} earns ${bestExchangeEarnOnCurrentSource?.apyRange} APY on ${provider}. No self-custody staking is available, so exchange earning is your best yield option.`,
        currentLocation: provider, currentYield: bestExchangeEarnOnCurrent, bestYield: bestExchangeEarnOnCurrent, bestYieldSource: `${provider} ${bestExchangeEarnOnCurrentSource?.program}`, usdValue, missedAnnual: 0,
        actionItems: [
          bestExchangeEarnOnCurrentSource?.link
            ? { text: `Earning ${bestExchangeEarnOnCurrentSource.apyRange} — this is the best available yield`, link: bestExchangeEarnOnCurrentSource.link }
            : { text: `Earning ${bestExchangeEarnOnCurrentSource?.apyRange} — this is the best available yield` },
          canWithdraw ? { text: "Move a portion to cold wallet for safety (no yield, but self-custodied)" } : null,
        ].filter(Boolean) as ActionItem[],
        riskNote: "Not your keys, not your crypto. Even with earning, keep only what you need on exchange.",
      };
    }

    if (bestExchangeEarnOnCurrent === 0 && bestSelfCustodyYield > 0) {
      const missed = usdValue * (bestOverall / 100);
      const stakingName = bestStakingSource?.platform || bestDefiSource?.defiProtocol || "";
      const stakingLink = bestStaking >= bestDefi ? bestStakingSource?.link : bestDefiSource?.link;
      const stakingApy = bestStakingSource?.apyRange || bestDefiSource?.defiApy || "";
      const actions: ActionItem[] = [
        canWithdraw ? { text: `Withdraw ${symbol} from ${provider} to your cold wallet` } : { text: `${symbol} may not be withdrawable from ${provider}` },
        { text: `Stake via ${stakingName} for ${stakingApy} APY`, link: stakingLink },
        { text: `Check if ${provider} offers an earn/staking program for ${symbol} — we can't detect enrollment automatically` },
      ];
      if (bestExchangeEarnAnywhere > 0 && bestExchangeEarnAnywhere > bestSelfCustodyYield) {
        const bestAnyExch = knowledge.exchangeEarnOptions?.reduce((best, e) => e.apyMid > (best?.apyMid || 0) ? e : best, null as ExchangeEarnOption | null);
        if (bestAnyExch) {
          actions.push({ text: `Alternative: ${bestAnyExch.exchange} offers ${bestAnyExch.apyRange} APY via ${bestAnyExch.program} (custodial)`, link: bestAnyExch.link });
        }
      }
      return {
        symbol, name: displayName, type: "move_to_cold",
        title: "Move to Cold Wallet & Earn",
        description: `${symbol} is sitting on ${provider} earning nothing. Moving to a cold wallet and staking could earn ~$${missed.toFixed(0)}/year (${bestOverall.toFixed(1)}% APY via ${bestOverallSource}).`,
        currentLocation: provider, currentYield: 0, bestYield: bestOverall, bestYieldSource: bestOverallSource, usdValue, missedAnnual: missed,
        actionItems: actions,
      };
    }

    if (bestExchangeEarnOnCurrent === 0 && bestSelfCustodyYield === 0) {
      if (!canWithdraw) {
        return {
          symbol, name: displayName, type: "no_action", title: "No Action Available",
          description: `${symbol} on ${provider} — no yield options and withdrawal may not be available.`,
          currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
          actionItems: [],
        };
      }

      if (bestExchangeEarnAnywhere > 0) {
        const bestAnyExch = knowledge.exchangeEarnOptions?.reduce((best, e) => e.apyMid > (best?.apyMid || 0) ? e : best, null as ExchangeEarnOption | null);
        const missed = usdValue * (bestExchangeEarnAnywhere / 100);
        return {
          symbol, name: displayName, type: "split_strategy",
          title: "Yield Available Elsewhere",
          description: `${symbol} is on ${provider} earning nothing. ${bestAnyExch?.exchange} offers ${bestAnyExch?.apyRange} APY via ${bestAnyExch?.program}.`,
          currentLocation: provider, currentYield: 0, bestYield: bestExchangeEarnAnywhere, bestYieldSource: bestAnyExch ? `${bestAnyExch.exchange} ${bestAnyExch.program}` : "", usdValue, missedAnnual: missed,
          actionItems: [
            bestAnyExch?.link ? { text: `Move to ${bestAnyExch.exchange} to earn ${bestAnyExch.apyRange} APY`, link: bestAnyExch.link } : { text: `Move to ${bestAnyExch?.exchange} to earn ${bestAnyExch?.apyRange} APY` },
            { text: "Move a portion to cold wallet for self-custody and safety" },
            knowledge.selfCustodyWallets ? { text: `Recommended wallets: ${knowledge.selfCustodyWallets.join(", ")}` } : null,
          ].filter(Boolean) as ActionItem[],
          riskNote: "Exchanges are custodial — not your keys, not your crypto. Only keep what you're actively earning on.",
        };
      }

      return {
        symbol, name: displayName, type: "move_to_cold",
        title: "Move to Cold Wallet for Safety",
        description: `${symbol} is on ${provider} with no yield earning opportunity anywhere. Moving to a cold wallet gives you full self-custody.`,
        currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
        actionItems: [
          { text: `Withdraw ${symbol} from ${provider} to your cold wallet` },
          { text: "Self-custody protects against exchange hacks, freezes, or insolvency" },
          knowledge.selfCustodyWallets ? { text: `Recommended wallets: ${knowledge.selfCustodyWallets.join(", ")}` } : null,
        ].filter(Boolean) as ActionItem[],
      };
    }
  }

  return {
    symbol, name: displayName, type: "no_data", title: "Unknown",
    description: `Unable to evaluate ${symbol}.`,
    currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0, actionItems: [],
  };
}

export function getStakeableAssets(): AssetKnowledge[] {
  return Object.values(CUSTODY_KNOWLEDGE).filter(a => a.stakeable);
}

export function getAssetsWithDefiAlternatives(): AssetKnowledge[] {
  return Object.values(CUSTODY_KNOWLEDGE).filter(a => a.defiAlternatives && a.defiAlternatives.length > 0);
}

export function getAssetWarnings(): { symbol: string; warnings: string[] }[] {
  return Object.values(CUSTODY_KNOWLEDGE)
    .filter(a => a.warnings && a.warnings.length > 0)
    .map(a => ({ symbol: a.symbol, warnings: a.warnings! }));
}
