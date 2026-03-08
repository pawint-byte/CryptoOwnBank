export interface StakingOption {
  platform: string;
  method: string;
  apyRange: string;
  link: string;
}

export interface DefiAlternative {
  tradFiProduct: string;
  tradFiApy: string;
  defiProtocol: string;
  defiApy: string;
  riskLevel: "Low" | "Medium" | "High";
  link: string;
}

export interface AssetKnowledge {
  symbol: string;
  name: string;
  stakeable: boolean;
  stakingOptions?: StakingOption[];
  defiAlternatives?: DefiAlternative[];
  warnings?: string[];
  selfCustodyWallets?: string[];
}

export const CUSTODY_KNOWLEDGE: Record<string, AssetKnowledge> = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    stakeable: true,
    stakingOptions: [
      { platform: "Lido", method: "Liquid Staking (stETH)", apyRange: "3.0–3.5%", link: "https://lido.fi" },
      { platform: "Rocket Pool", method: "Decentralized Staking (rETH)", apyRange: "2.8–3.2%", link: "https://rocketpool.net" },
      { platform: "Coinbase (cbETH)", method: "Wrapped Staking", apyRange: "2.5–3.0%", link: "https://www.coinbase.com/earn" },
      { platform: "EigenLayer", method: "Restaking", apyRange: "Variable + Points", link: "https://www.eigenlayer.xyz" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Lido stETH", defiApy: "3.2%", riskLevel: "Low", link: "https://lido.fi" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave ETH Lending", defiApy: "2.0–4.0%", riskLevel: "Medium", link: "https://aave.com" },
    ],
    warnings: ["Never share your seed phrase", "Verify staking contracts before depositing"],
    selfCustodyWallets: ["Ledger Nano X", "Trezor Model T", "MetaMask (software)"],
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    stakeable: true,
    stakingOptions: [
      { platform: "Marinade", method: "Liquid Staking (mSOL)", apyRange: "6.5–7.5%", link: "https://marinade.finance" },
      { platform: "Jito", method: "Liquid Staking (JitoSOL)", apyRange: "7.0–8.0%", link: "https://www.jito.network" },
      { platform: "Native Delegation", method: "Direct Validator Staking", apyRange: "6.0–7.0%", link: "https://solanabeach.io/validators" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Jito Staking", defiApy: "7.5%", riskLevel: "Low", link: "https://www.jito.network" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Phantom (software)", "Solflare (software)"],
  },
  XRP: {
    symbol: "XRP",
    name: "XRP",
    stakeable: false,
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Soil RLUSD Vault (Credit+)", defiApy: "8.0%", riskLevel: "Low", link: "https://soil.xyz" },
    ],
    warnings: ["XRPL does not support native staking", "Use Soil vaults for RLUSD yield on XRPL"],
    selfCustodyWallets: ["Ledger Nano X", "Xaman (XUMM)", "Ellipal Titan"],
  },
  ADA: {
    symbol: "ADA",
    name: "Cardano",
    stakeable: true,
    stakingOptions: [
      { platform: "Native Delegation", method: "Stake Pool Delegation", apyRange: "3.0–5.0%", link: "https://pool.pm" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Daedalus", "Yoroi"],
  },
  DOT: {
    symbol: "DOT",
    name: "Polkadot",
    stakeable: true,
    stakingOptions: [
      { platform: "Native Nomination", method: "Nominating Validators", apyRange: "12–15%", link: "https://polkadot.js.org/apps/#/staking" },
      { platform: "Bifrost", method: "Liquid Staking (vDOT)", apyRange: "10–13%", link: "https://bifrost.finance" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Polkadot.js", "Nova Wallet"],
  },
  AVAX: {
    symbol: "AVAX",
    name: "Avalanche",
    stakeable: true,
    stakingOptions: [
      { platform: "Benqi", method: "Liquid Staking (sAVAX)", apyRange: "5.0–6.0%", link: "https://benqi.fi" },
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "8.0–9.5%", link: "https://wallet.avax.network" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Core Wallet"],
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    stakeable: false,
    warnings: ["Bitcoin does not support native staking", "Be cautious of wrapped BTC yield products"],
    selfCustodyWallets: ["Ledger Nano X", "Trezor Model T", "Coldcard", "Ellipal Titan"],
  },
  MATIC: {
    symbol: "MATIC",
    name: "Polygon",
    stakeable: true,
    stakingOptions: [
      { platform: "Lido", method: "Liquid Staking (stMATIC)", apyRange: "4.0–5.0%", link: "https://polygon.lido.fi" },
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "4.5–5.5%", link: "https://staking.polygon.technology" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask"],
  },
  BNB: {
    symbol: "BNB",
    name: "BNB",
    stakeable: true,
    stakingOptions: [
      { platform: "Ankr", method: "Liquid Staking (ankrBNB)", apyRange: "2.5–3.5%", link: "https://www.ankr.com/staking/stake/bnb/" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Trust Wallet"],
  },
  DOGE: {
    symbol: "DOGE",
    name: "Dogecoin",
    stakeable: false,
    warnings: ["Dogecoin does not support staking — be wary of scam staking offers"],
    selfCustodyWallets: ["Ledger Nano X", "Ellipal Titan"],
  },
  LTC: {
    symbol: "LTC",
    name: "Litecoin",
    stakeable: false,
    selfCustodyWallets: ["Ledger Nano X", "Trezor Model T", "Ellipal Titan"],
  },
  TRX: {
    symbol: "TRX",
    name: "TRON",
    stakeable: true,
    stakingOptions: [
      { platform: "Native Freezing", method: "Energy/Bandwidth Staking", apyRange: "3.0–5.0%", link: "https://tronscan.org/#/sr/votes" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "TronLink"],
  },
  ALGO: {
    symbol: "ALGO",
    name: "Algorand",
    stakeable: true,
    stakingOptions: [
      { platform: "Governance", method: "Governance Rewards", apyRange: "5.0–8.0%", link: "https://governance.algorand.foundation" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Pera Wallet"],
  },
  XLM: {
    symbol: "XLM",
    name: "Stellar",
    stakeable: false,
    selfCustodyWallets: ["Ledger Nano X", "LOBSTR"],
  },
  HBAR: {
    symbol: "HBAR",
    name: "Hedera",
    stakeable: true,
    stakingOptions: [
      { platform: "Native Staking", method: "Proxy Staking", apyRange: "2.5–3.5%", link: "https://hedera.com/staking" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "HashPack"],
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    stakeable: false,
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave USDC Lending", defiApy: "3.0–6.0%", riskLevel: "Low", link: "https://aave.com" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Morpho USDC", defiApy: "4.0–7.0%", riskLevel: "Medium", link: "https://morpho.org" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask", "Phantom"],
  },
  USDT: {
    symbol: "USDT",
    name: "Tether",
    stakeable: false,
    defiAlternatives: [
      { tradFiProduct: "Savings Account (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave USDT Lending", defiApy: "3.0–5.0%", riskLevel: "Low", link: "https://aave.com" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "MetaMask"],
  },
};

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
