export type CustodyType = "on_chain" | "custodial";

export interface StakingOption {
  platform: string;
  method: string;
  apyRange: string;
  apyMid: number;
  link: string;
  custodyType: CustodyType;
  blockchain: string;
}

export interface DefiAlternative {
  tradFiProduct: string;
  tradFiApy: string;
  defiProtocol: string;
  defiApy: string;
  defiApyMid: number;
  riskLevel: "Low" | "Medium" | "High";
  link: string;
  custodyType: CustodyType;
  blockchain: string;
}

export interface ExchangeEarnOption {
  exchange: string;
  program: string;
  apyRange: string;
  apyMid: number;
  flexible: boolean;
  link: string;
  custodyType: CustodyType;
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
      { platform: "Lido", method: "Liquid Staking (stETH)", apyRange: "3.0–3.5%", apyMid: 3.25, link: "https://lido.fi", custodyType: "on_chain", blockchain: "Ethereum" },
      { platform: "Rocket Pool", method: "Decentralized Staking (rETH)", apyRange: "2.8–3.2%", apyMid: 3.0, link: "https://rocketpool.net", custodyType: "on_chain", blockchain: "Ethereum" },
      { platform: "Coinbase (cbETH)", method: "Wrapped Staking", apyRange: "2.5–3.0%", apyMid: 2.75, link: "https://www.coinbase.com/earn", custodyType: "custodial", blockchain: "Ethereum" },
      { platform: "EigenLayer", method: "Restaking", apyRange: "Variable + Points", apyMid: 4.0, link: "https://www.eigenlayer.xyz", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "ETH Staking", apyRange: "2.5–3.0%", apyMid: 2.75, flexible: false, link: "https://www.coinbase.com/earn", custodyType: "custodial" },
      { exchange: "Kraken", program: "ETH Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://www.kraken.com/features/staking-coins", custodyType: "custodial" },
      { exchange: "Binance", program: "ETH 2.0 Staking", apyRange: "2.5–3.5%", apyMid: 3.0, flexible: false, link: "https://www.binance.com/en/eth2", custodyType: "custodial" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "1.5–3.0%", apyMid: 2.0, flexible: true, link: "https://crypto.com/earn", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Lido stETH", defiApy: "3.2%", defiApyMid: 3.2, riskLevel: "Low", link: "https://lido.fi", custodyType: "on_chain", blockchain: "Ethereum" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave ETH Lending", defiApy: "2.0–4.0%", defiApyMid: 3.0, riskLevel: "Medium", link: "https://aave.com", custodyType: "on_chain", blockchain: "Ethereum" },
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
      { platform: "Marinade", method: "Liquid Staking (mSOL)", apyRange: "6.5–7.5%", apyMid: 7.0, link: "https://marinade.finance", custodyType: "on_chain", blockchain: "Solana" },
      { platform: "Jito", method: "Liquid Staking (JitoSOL)", apyRange: "7.0–8.0%", apyMid: 7.5, link: "https://www.jito.network", custodyType: "on_chain", blockchain: "Solana" },
      { platform: "Native Delegation", method: "Direct Validator Staking", apyRange: "6.0–7.0%", apyMid: 6.5, link: "https://solanabeach.io/validators", custodyType: "on_chain", blockchain: "Solana" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "SOL Staking", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: false, link: "https://www.coinbase.com/earn", custodyType: "custodial" },
      { exchange: "Kraken", program: "SOL Staking", apyRange: "5.0–6.0%", apyMid: 5.5, flexible: false, link: "https://www.kraken.com/features/staking-coins", custodyType: "custodial" },
      { exchange: "Binance", program: "SOL Staking", apyRange: "5.0–7.0%", apyMid: 6.0, flexible: false, link: "https://www.binance.com/en/staking", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Jito Staking", defiApy: "7.5%", defiApyMid: 7.5, riskLevel: "Low", link: "https://www.jito.network", custodyType: "on_chain", blockchain: "Solana" },
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
      { platform: "Native Delegation", method: "Stake Pool Delegation", apyRange: "3.0–5.0%", apyMid: 4.0, link: "https://pool.pm", custodyType: "on_chain", blockchain: "Cardano" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "ADA Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://www.kraken.com/features/staking-coins", custodyType: "custodial" },
      { exchange: "Binance", program: "ADA Staking", apyRange: "1.5–3.0%", apyMid: 2.0, flexible: true, link: "https://www.binance.com/en/staking", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Daedalus", "Yoroi"],
  },
  DOT: {
    symbol: "DOT",
    name: "Polkadot",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Nomination", method: "Nominating Validators", apyRange: "12–15%", apyMid: 13.5, link: "https://polkadot.js.org/apps/#/staking", custodyType: "on_chain", blockchain: "Polkadot" },
      { platform: "Bifrost", method: "Liquid Staking (vDOT)", apyRange: "10–13%", apyMid: 11.5, link: "https://bifrost.finance", custodyType: "on_chain", blockchain: "Polkadot" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "DOT Staking", apyRange: "8.0–12.0%", apyMid: 10.0, flexible: false, link: "https://www.kraken.com/features/staking-coins", custodyType: "custodial" },
      { exchange: "Binance", program: "DOT Staking", apyRange: "10.0–12.0%", apyMid: 11.0, flexible: false, link: "https://www.binance.com/en/staking", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Polkadot.js", "Nova Wallet"],
  },
  AVAX: {
    symbol: "AVAX",
    name: "Avalanche",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Benqi", method: "Liquid Staking (sAVAX)", apyRange: "5.0–6.0%", apyMid: 5.5, link: "https://benqi.fi", custodyType: "on_chain", blockchain: "Avalanche" },
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "8.0–9.5%", apyMid: 8.75, link: "https://wallet.avax.network", custodyType: "on_chain", blockchain: "Avalanche" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "AVAX Staking", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: false, link: "https://www.coinbase.com/earn", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Core Wallet"],
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Crypto.com", program: "Earn", apyRange: "0.5–1.5%", apyMid: 1.0, flexible: true, link: "https://crypto.com/earn", custodyType: "custodial" },
      { exchange: "Binance", program: "Simple Earn", apyRange: "0.5–2.0%", apyMid: 1.0, flexible: true, link: "https://www.binance.com/en/earn", custodyType: "custodial" },
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
      { platform: "Lido", method: "Liquid Staking (stMATIC)", apyRange: "4.0–5.0%", apyMid: 4.5, link: "https://polygon.lido.fi", custodyType: "on_chain", blockchain: "Polygon" },
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "4.5–5.5%", apyMid: 5.0, link: "https://staking.polygon.technology", custodyType: "on_chain", blockchain: "Polygon" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "MATIC Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://www.coinbase.com/earn", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask"],
  },
  BNB: {
    symbol: "BNB",
    name: "BNB",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Ankr", method: "Liquid Staking (ankrBNB)", apyRange: "2.5–3.5%", apyMid: 3.0, link: "https://www.ankr.com/staking/stake/bnb/", custodyType: "on_chain", blockchain: "BNB Chain" },
    ],
    exchangeEarnOptions: [
      { exchange: "Binance", program: "BNB Vault", apyRange: "2.0–5.0%", apyMid: 3.5, flexible: true, link: "https://www.binance.com/en/bnbvault", custodyType: "custodial" },
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
      { platform: "Native Freezing", method: "Energy/Bandwidth Staking", apyRange: "3.0–5.0%", apyMid: 4.0, link: "https://tronscan.org/#/sr/votes", custodyType: "on_chain", blockchain: "TRON" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "TronLink"],
  },
  ALGO: {
    symbol: "ALGO",
    name: "Algorand",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Governance", method: "Governance Rewards", apyRange: "5.0–8.0%", apyMid: 6.5, link: "https://governance.algorand.foundation", custodyType: "on_chain", blockchain: "Algorand" },
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
      { platform: "Native Staking", method: "Proxy Staking", apyRange: "2.5–3.5%", apyMid: 3.0, link: "https://hedera.com/staking", custodyType: "on_chain", blockchain: "Hedera" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "HashPack"],
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "USDC Rewards", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: true, link: "https://www.coinbase.com/earn", custodyType: "custodial" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "3.0–6.0%", apyMid: 4.5, flexible: true, link: "https://crypto.com/earn", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave USDC Lending", defiApy: "3.0–6.0%", defiApyMid: 4.5, riskLevel: "Low", link: "https://aave.com", custodyType: "on_chain", blockchain: "Ethereum" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Morpho USDC", defiApy: "4.0–7.0%", defiApyMid: 5.5, riskLevel: "Medium", link: "https://morpho.org", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask", "Phantom"],
  },
  USDT: {
    symbol: "USDT",
    name: "Tether",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Binance", program: "Simple Earn", apyRange: "3.0–5.0%", apyMid: 4.0, flexible: true, link: "https://www.binance.com/en/earn", custodyType: "custodial" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "3.0–6.0%", apyMid: 4.5, flexible: true, link: "https://crypto.com/earn", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave USDT Lending", defiApy: "3.0–5.0%", defiApyMid: 4.0, riskLevel: "Low", link: "https://aave.com", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask"],
  },
  ATOM: {
    symbol: "ATOM",
    name: "Cosmos",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "15–20%", apyMid: 17.5, link: "https://www.mintscan.io/cosmos/validators", custodyType: "on_chain", blockchain: "Cosmos" },
      { platform: "Stride", method: "Liquid Staking (stATOM)", apyRange: "14–17%", apyMid: 15.5, link: "https://stride.zone", custodyType: "on_chain", blockchain: "Cosmos" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "ATOM Staking", apyRange: "10.0–14.0%", apyMid: 12.0, flexible: false, link: "https://www.kraken.com/features/staking-coins", custodyType: "custodial" },
      { exchange: "Coinbase", program: "ATOM Staking", apyRange: "8.0–12.0%", apyMid: 10.0, flexible: false, link: "https://www.coinbase.com/earn", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Keplr", "Cosmostation"],
  },
  VET: {
    symbol: "VET",
    name: "VeChain",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "VeChainThor", method: "VTHO Generation (holding)", apyRange: "1.0–2.0%", apyMid: 1.5, link: "https://www.vechain.org", custodyType: "on_chain", blockchain: "VeChain" },
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
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Soil Credit+ Vault", defiApy: "8.0%", defiApyMid: 8.0, riskLevel: "Low", link: "https://soil.xyz", custodyType: "on_chain", blockchain: "XRPL" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Soil Liquid Vault", defiApy: "5.0%", defiApyMid: 5.0, riskLevel: "Low", link: "https://soil.xyz", custodyType: "on_chain", blockchain: "XRPL" },
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
      { text: "ELLIPAL does not support TRX staking (freeze/vote) — it is an air-gapped wallet with no DApp browser" },
      { text: "To stake TRX, you would need to use TronLink wallet or connect a Ledger to TronScan", link: "https://tronscan.org/#/sr/votes" },
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
      { text: "ELLIPAL does not support ALGO governance — it is an air-gapped wallet with no DApp browser" },
      { text: "To participate in Algorand Governance, use Pera Wallet instead", link: "https://perawallet.app" },
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
      { text: "ELLIPAL natively supports ATOM staking — open the ELLIPAL app and select your ATOM wallet" },
      { text: "Tap 'Stake' → choose a validator with good uptime and low commission" },
      { text: "Min. deposit: 0.000001 ATOM · Estimated APY: ~10%", link: "https://www.ellipal.com/pages/ellipal-staking" },
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
      { text: "ELLIPAL natively supports DOT staking — open the ELLIPAL app and select your DOT wallet" },
      { text: "Tap 'Stake' → choose validators to nominate" },
      { text: "Min. deposit: 120 DOT · Estimated APY: ~8.8%", link: "https://www.ellipal.com/pages/ellipal-staking" },
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
      { text: "ELLIPAL natively supports ADA staking — open the ELLIPAL app and select your ADA wallet" },
      { text: "Tap 'Stake' → choose a stake pool to delegate to" },
      { text: "Min. deposit: 4 ADA · Estimated APY: ~5%", link: "https://www.ellipal.com/pages/ellipal-staking" },
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
      { text: "ELLIPAL does not support ETH staking — it is an air-gapped wallet with no DApp browser" },
      { text: "To stake ETH via Lido, use MetaMask or a Ledger connected to lido.fi", link: "https://lido.fi" },
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
      { text: "ELLIPAL does not support CRO staking — use the Crypto.com DeFi Wallet or Keplr to delegate CRO", link: "https://crypto.com/defi-wallet" },
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
  custodyInfo?: {
    type: CustodyType;
    blockchain?: string;
    explanation: string;
  };
}

export interface ActionItem {
  text: string;
  link?: string;
  custodyBadge?: CustodyType;
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

function custodyLabel(ct: CustodyType): string {
  return ct === "on_chain" ? "On-Chain (You Keep Your Keys)" : "Custodial (Company Holds Your Assets)";
}

function getCustodyInfo(source: StakingOption | DefiAlternative | null, type: "staking" | "defi"): AssetRecommendation["custodyInfo"] {
  if (!source) return undefined;
  if (type === "staking") {
    const s = source as StakingOption;
    return {
      type: s.custodyType,
      blockchain: s.blockchain,
      explanation: s.custodyType === "on_chain"
        ? `${s.platform} runs on the ${s.blockchain} blockchain — your assets stay on-chain and you keep ownership`
        : `${s.platform} is custodial — they hold your assets on your behalf`,
    };
  }
  const d = source as DefiAlternative;
  return {
    type: d.custodyType,
    blockchain: d.blockchain,
    explanation: d.custodyType === "on_chain"
      ? `${d.defiProtocol} is a DeFi protocol on ${d.blockchain} — your assets stay on-chain via smart contracts`
      : `${d.defiProtocol} is custodial — they hold your assets on your behalf`,
  };
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

  const hasStakedCompanion = stakedContext && stakedContext.stakedUsdOnSameWallet > 0;
  if (usdValue < DUST_THRESHOLD_USD && !hasStakedCompanion) {
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
    const defiBlockchain = bestDefiSource?.blockchain || "";
    return {
      symbol, name: displayName, type: "optimal", title: "Earning On-Chain in DeFi",
      description: `${symbol} is in a non-custodial DeFi protocol on ${provider}${defiBlockchain ? ` (${defiBlockchain} blockchain)` : ""} — you control your keys and are earning yield on-chain.`,
      currentLocation: provider, currentYield: bestDefi, bestYield: bestDefi, bestYieldSource: provider, usdValue, missedAnnual: 0,
      actionItems: [],
      custodyInfo: bestDefiSource ? getCustodyInfo(bestDefiSource, "defi") : {
        type: "on_chain" as CustodyType,
        blockchain: defiBlockchain,
        explanation: `${provider} is a DeFi protocol — your assets are managed by smart contracts on the blockchain`,
      },
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
      const totalEarning = stakedContext.stakedUsdOnSameWallet * (bestSelfCustodyYield / 100);
      return {
        symbol, name: displayName, type: missed > 10 ? "stake_available" : "optimal",
        title: missed > 10 ? "Partially Staked" : "Already Staking",
        description: missed > 10
          ? `${stakedPct}% of your ${symbol} on ${provider} ($${stakedContext.stakedUsdOnSameWallet.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is staked and earning ~$${totalEarning.toFixed(0)}/year. The remaining ${liquidPct}% ($${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is liquid — staking it could earn ~$${missed.toFixed(0)}/year more.`
          : `${stakedPct}% of your ${symbol} on ${provider} is staked and earning ~$${totalEarning.toFixed(0)}/year (~${bestSelfCustodyYield.toFixed(1)}% APY). Total value: $${totalOnWallet.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
        currentLocation: provider, currentYield: bestSelfCustodyYield, bestYield: bestSelfCustodyYield,
        bestYieldSource: bestStakingSource?.platform || bestSelfCustodyLabel, usdValue: totalOnWallet, missedAnnual: missed > 10 ? missed : 0,
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
      const bestSource = bestStaking >= bestDefi ? bestStakingSource : null;
      const bestDefiSrc = bestDefi > bestStaking ? bestDefiSource : null;
      const primaryCustody = bestSource
        ? getCustodyInfo(bestSource, "staking")
        : getCustodyInfo(bestDefiSrc, "defi");
      const onChainNote = primaryCustody?.type === "on_chain"
        ? ` This is on-chain on ${primaryCustody.blockchain} — you keep ownership of your assets.`
        : "";
      return {
        symbol, name: displayName, type: "stake_available",
        title: "Yield Available",
        description: `${symbol} on your ${provider} wallet could earn ~${bestSelfCustodyYield.toFixed(1)}% APY by staking — that's ~$${missed.toFixed(0)}/year on $${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}.${onChainNote}`,
        currentLocation: provider, currentYield: 0, bestYield: bestSelfCustodyYield, bestYieldSource: bestSelfCustodyLabel, usdValue, missedAnnual: missed,
        actionItems: walletActions.length > 0 ? walletActions : [
          bestStaking > 0 ? { text: `Stake via ${bestStakingSource?.platform} on ${bestStakingSource?.blockchain} (${bestStakingSource?.apyRange} APY)`, link: bestStakingSource?.link, custodyBadge: bestStakingSource?.custodyType } : null,
          bestDefi > 0 ? { text: `Use ${bestDefiSource?.defiProtocol} on ${bestDefiSource?.blockchain} (${bestDefiSource?.defiApy} APY)`, link: bestDefiSource?.link, custodyBadge: bestDefiSource?.custodyType } : null,
        ].filter(Boolean) as ActionItem[],
        custodyInfo: primaryCustody,
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
    const exchangeCustodyNote = `${provider} is a custodial platform — they hold your assets on your behalf. Not your keys, not your crypto.`;

    if (bestExchangeEarnOnCurrent > 0 && bestSelfCustodyYield > 0) {
      if (bestSelfCustodyYield > bestExchangeEarnOnCurrent) {
        const missed = usdValue * ((bestSelfCustodyYield - bestExchangeEarnOnCurrent) / 100);
        const stakingLink = bestStaking >= bestDefi ? bestStakingSource?.link : bestDefiSource?.link;
        const onChainSource = bestStaking >= bestDefi ? bestStakingSource : null;
        const onChainDefi = bestDefi > bestStaking ? bestDefiSource : null;
        const onChainBlockchain = onChainSource?.blockchain || onChainDefi?.blockchain || "";
        return {
          symbol, name: displayName, type: "split_strategy",
          title: "Better On-Chain Yield Available",
          description: `${provider} (custodial) offers ${bestExchangeEarnOnCurrentSource?.apyRange} APY on ${symbol}, but on-chain staking via ${bestSelfCustodyLabel} on ${onChainBlockchain} offers ${bestSelfCustodyYield.toFixed(1)}% — and you keep your keys.`,
          currentLocation: provider, currentYield: bestExchangeEarnOnCurrent, bestYield: bestSelfCustodyYield, bestYieldSource: bestSelfCustodyLabel, usdValue, missedAnnual: missed,
          actionItems: [
            canWithdraw ? { text: `Move to cold wallet and stake on-chain via ${bestSelfCustodyLabel} on ${onChainBlockchain}`, link: stakingLink, custodyBadge: "on_chain" } : null,
            { text: `Keep some on ${provider} for liquidity — but remember, ${provider} is custodial`, custodyBadge: "custodial" },
            bestExchangeEarnOnCurrentSource?.link ? { text: `Currently earning up to ${bestExchangeEarnOnCurrentSource.apyRange} on ${provider} (custodial)`, link: bestExchangeEarnOnCurrentSource.link, custodyBadge: "custodial" } : null,
          ].filter(Boolean) as ActionItem[],
          riskNote: exchangeCustodyNote,
          custodyInfo: onChainSource
            ? getCustodyInfo(onChainSource, "staking")
            : getCustodyInfo(onChainDefi, "defi"),
        };
      } else {
        return {
          symbol, name: displayName, type: "split_strategy",
          title: "Earning on Exchange — Consider Self-Custody",
          description: `${provider} (custodial) offers competitive ${bestExchangeEarnOnCurrentSource?.apyRange} APY on ${symbol}. On-chain yield (${bestSelfCustodyYield.toFixed(1)}%) is similar or lower, but self-custody means you own your assets.`,
          currentLocation: provider, currentYield: bestExchangeEarnOnCurrent, bestYield: bestExchangeEarnOnCurrent, bestYieldSource: `${provider} ${bestExchangeEarnOnCurrentSource?.program}`, usdValue, missedAnnual: 0,
          actionItems: [
            { text: `You're earning well on ${provider} — but your assets are held by the exchange`, custodyBadge: "custodial" as CustodyType },
            canWithdraw ? { text: "For true ownership, move a portion to your cold wallet", custodyBadge: "on_chain" as CustodyType } : null,
            { text: "Keep enough on exchange for easy liquidation if needed" },
          ].filter(Boolean) as ActionItem[],
          riskNote: exchangeCustodyNote,
          custodyInfo: {
            type: "custodial" as CustodyType,
            explanation: `${provider} is a custodial exchange — competitive yield, but they hold your assets`,
          },
        };
      }
    }

    if (bestExchangeEarnOnCurrent > 0 && bestSelfCustodyYield === 0) {
      return {
        symbol, name: displayName, type: "split_strategy",
        title: "Earning on Exchange — No On-Chain Alternative",
        description: `${symbol} earns ${bestExchangeEarnOnCurrentSource?.apyRange} APY on ${provider} (custodial). No on-chain staking exists for this asset, so this is the best yield option — but your assets are held by ${provider}.`,
        currentLocation: provider, currentYield: bestExchangeEarnOnCurrent, bestYield: bestExchangeEarnOnCurrent, bestYieldSource: `${provider} ${bestExchangeEarnOnCurrentSource?.program}`, usdValue, missedAnnual: 0,
        actionItems: [
          bestExchangeEarnOnCurrentSource?.link
            ? { text: `Earning ${bestExchangeEarnOnCurrentSource.apyRange} on ${provider} — best available, but custodial`, link: bestExchangeEarnOnCurrentSource.link, custodyBadge: "custodial" as CustodyType }
            : { text: `Earning ${bestExchangeEarnOnCurrentSource?.apyRange} on ${provider} — best available, but custodial`, custodyBadge: "custodial" as CustodyType },
          canWithdraw ? { text: "Move a portion to cold wallet for self-custody (no yield, but you own it)", custodyBadge: "on_chain" as CustodyType } : null,
        ].filter(Boolean) as ActionItem[],
        riskNote: exchangeCustodyNote,
        custodyInfo: {
          type: "custodial" as CustodyType,
          explanation: `${provider} is a custodial exchange — they hold your ${symbol} on your behalf. No on-chain staking alternative exists for this asset.`,
        },
      };
    }

    if (bestExchangeEarnOnCurrent === 0 && bestSelfCustodyYield > 0) {
      const missed = usdValue * (bestOverall / 100);
      const stakingName = bestStakingSource?.platform || bestDefiSource?.defiProtocol || "";
      const stakingLink = bestStaking >= bestDefi ? bestStakingSource?.link : bestDefiSource?.link;
      const stakingApy = bestStakingSource?.apyRange || bestDefiSource?.defiApy || "";
      const stakingBlockchain = bestStakingSource?.blockchain || bestDefiSource?.blockchain || "";
      const actions: ActionItem[] = [
        canWithdraw ? { text: `Withdraw ${symbol} from ${provider} (custodial) to your cold wallet` } : { text: `${symbol} may not be withdrawable from ${provider}` },
        { text: `Stake on-chain via ${stakingName} on ${stakingBlockchain} for ${stakingApy} APY — you keep your keys`, link: stakingLink, custodyBadge: "on_chain" },
        { text: `Check if ${provider} offers an earn/staking program for ${symbol} — we can't detect enrollment automatically` },
      ];
      if (bestExchangeEarnAnywhere > 0 && bestExchangeEarnAnywhere > bestSelfCustodyYield) {
        const bestAnyExch = knowledge.exchangeEarnOptions?.reduce((best, e) => e.apyMid > (best?.apyMid || 0) ? e : best, null as ExchangeEarnOption | null);
        if (bestAnyExch) {
          actions.push({ text: `Alternative: ${bestAnyExch.exchange} offers ${bestAnyExch.apyRange} APY (custodial — they hold your assets)`, link: bestAnyExch.link, custodyBadge: "custodial" });
        }
      }
      const primarySource = bestStaking >= bestDefi ? bestStakingSource : null;
      const primaryDefi = bestDefi > bestStaking ? bestDefiSource : null;
      return {
        symbol, name: displayName, type: "move_to_cold",
        title: "Move to Self-Custody & Earn On-Chain",
        description: `${symbol} is sitting on ${provider} (custodial) earning nothing. Moving to your own wallet and staking on-chain could earn ~$${missed.toFixed(0)}/year (${bestOverall.toFixed(1)}% APY via ${bestOverallSource} on ${stakingBlockchain}).`,
        currentLocation: provider, currentYield: 0, bestYield: bestOverall, bestYieldSource: bestOverallSource, usdValue, missedAnnual: missed,
        actionItems: actions,
        custodyInfo: primarySource
          ? getCustodyInfo(primarySource, "staking")
          : getCustodyInfo(primaryDefi, "defi"),
      };
    }

    if (bestExchangeEarnOnCurrent === 0 && bestSelfCustodyYield === 0) {
      if (!canWithdraw) {
        return {
          symbol, name: displayName, type: "no_action", title: "No Action Available",
          description: `${symbol} on ${provider} (custodial) — no yield options and withdrawal may not be available.`,
          currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
          actionItems: [],
          riskNote: exchangeCustodyNote,
          custodyInfo: {
            type: "custodial" as CustodyType,
            explanation: `${provider} is a custodial exchange — they hold your assets`,
          },
        };
      }

      if (bestExchangeEarnAnywhere > 0) {
        const bestAnyExch = knowledge.exchangeEarnOptions?.reduce((best, e) => e.apyMid > (best?.apyMid || 0) ? e : best, null as ExchangeEarnOption | null);
        const missed = usdValue * (bestExchangeEarnAnywhere / 100);
        return {
          symbol, name: displayName, type: "split_strategy",
          title: "Yield Available — But Only Custodial",
          description: `${symbol} is on ${provider} (custodial) earning nothing. ${bestAnyExch?.exchange} offers ${bestAnyExch?.apyRange} APY via ${bestAnyExch?.program} — but that's also custodial. No on-chain option exists.`,
          currentLocation: provider, currentYield: 0, bestYield: bestExchangeEarnAnywhere, bestYieldSource: bestAnyExch ? `${bestAnyExch.exchange} ${bestAnyExch.program}` : "", usdValue, missedAnnual: missed,
          actionItems: [
            bestAnyExch?.link ? { text: `Move to ${bestAnyExch.exchange} for ${bestAnyExch.apyRange} APY (custodial)`, link: bestAnyExch.link, custodyBadge: "custodial" as CustodyType } : null,
            { text: "For true ownership, move to your cold wallet — no yield, but you own your assets", custodyBadge: "on_chain" as CustodyType },
            knowledge.selfCustodyWallets ? { text: `Recommended self-custody wallets: ${knowledge.selfCustodyWallets.join(", ")}` } : null,
          ].filter(Boolean) as ActionItem[],
          riskNote: exchangeCustodyNote,
          custodyInfo: {
            type: "custodial" as CustodyType,
            explanation: `Both ${provider} and ${bestAnyExch?.exchange} are custodial — no on-chain alternative exists for ${symbol}`,
          },
        };
      }

      return {
        symbol, name: displayName, type: "move_to_cold",
        title: "Move to Self-Custody",
        description: `${symbol} is on ${provider} (custodial) with no yield available. Moving to your cold wallet gives you full ownership — your keys, your crypto.`,
        currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
        actionItems: [
          { text: `Withdraw ${symbol} from ${provider} to your cold wallet`, custodyBadge: "on_chain" as CustodyType },
          { text: "Self-custody protects against exchange hacks, freezes, or insolvency" },
          knowledge.selfCustodyWallets ? { text: `Recommended self-custody wallets: ${knowledge.selfCustodyWallets.join(", ")}` } : null,
        ].filter(Boolean) as ActionItem[],
        custodyInfo: {
          type: "custodial" as CustodyType,
          explanation: `${provider} is custodial — move to your own wallet for true ownership`,
        },
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

export interface BestInClassEntry {
  symbol: string;
  name: string;
  category: string;
  platform: string;
  method: string;
  apyRange: string;
  apyMid: number;
  link: string;
  custodyType: CustodyType;
  blockchain: string;
}

export function getBestInClass(): { category: string; description: string; entries: BestInClassEntry[] }[] {
  const allOnChainStaking: BestInClassEntry[] = [];
  const allDefiYield: BestInClassEntry[] = [];
  const allPassiveEarning: BestInClassEntry[] = [];
  const allExchangeEarning: BestInClassEntry[] = [];

  for (const asset of Object.values(CUSTODY_KNOWLEDGE)) {
    if (asset.stakingOptions) {
      for (const opt of asset.stakingOptions) {
        if (opt.custodyType === "on_chain") {
          allOnChainStaking.push({
            symbol: asset.symbol, name: asset.name, category: "On-Chain Staking",
            platform: opt.platform, method: opt.method, apyRange: opt.apyRange,
            apyMid: opt.apyMid, link: opt.link, custodyType: opt.custodyType, blockchain: opt.blockchain,
          });
        }
      }
    }
    if (asset.defiAlternatives) {
      for (const alt of asset.defiAlternatives) {
        if (alt.custodyType === "on_chain") {
          allDefiYield.push({
            symbol: asset.symbol, name: asset.name, category: "DeFi Yield",
            platform: alt.defiProtocol, method: `Lending/Vault on ${alt.blockchain}`,
            apyRange: alt.defiApy, apyMid: alt.defiApyMid, link: alt.link,
            custodyType: alt.custodyType, blockchain: alt.blockchain,
          });
        }
      }
    }
    if (asset.symbol === "VET") {
      allPassiveEarning.push({
        symbol: "VET", name: "VeChain", category: "Passive Earning",
        platform: "VeChainThor", method: "VTHO Generation (just hold it)",
        apyRange: "1.0–2.0%", apyMid: 1.5, link: "https://www.vechain.org",
        custodyType: "on_chain", blockchain: "VeChain",
      });
    }
    if (asset.exchangeEarnOptions) {
      const best = asset.exchangeEarnOptions.reduce((b, e) => e.apyMid > (b?.apyMid || 0) ? e : b, null as typeof asset.exchangeEarnOptions[0] | null);
      if (best) {
        allExchangeEarning.push({
          symbol: asset.symbol, name: asset.name, category: "Exchange Earning",
          platform: best.exchange, method: best.program,
          apyRange: best.apyRange, apyMid: best.apyMid, link: best.link,
          custodyType: "custodial", blockchain: "",
        });
      }
    }
  }

  allOnChainStaking.sort((a, b) => b.apyMid - a.apyMid);
  allDefiYield.sort((a, b) => b.apyMid - a.apyMid);
  allExchangeEarning.sort((a, b) => b.apyMid - a.apyMid);

  return [
    {
      category: "On-Chain Staking",
      description: "Stake directly on the blockchain — you keep your keys and earn yield from the network itself.",
      entries: allOnChainStaking,
    },
    {
      category: "DeFi Yield",
      description: "Earn yield through decentralized finance protocols — smart contracts manage your assets on-chain.",
      entries: allDefiYield,
    },
    {
      category: "Passive Earning",
      description: "Assets that earn yield automatically just by holding them — no staking or DeFi action needed.",
      entries: allPassiveEarning,
    },
    {
      category: "Exchange Earning (Custodial)",
      description: "Earn through exchange programs — higher convenience, but you hand custody of your assets to the exchange.",
      entries: allExchangeEarning,
    },
  ].filter(c => c.entries.length > 0);
}
