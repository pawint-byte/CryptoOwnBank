export type CustodyType = "on_chain" | "custodial";

const WALLET_LINKS: Record<string, string> = {
  "MetaMask": "https://metamask.io",
  "MetaMask (ERC-20)": "https://metamask.io",
  "MetaMask (Optimism network)": "https://metamask.io",
  "MetaMask (Arbitrum network)": "https://metamask.io",
  "MetaMask (Fantom network)": "https://metamask.io",
  "MetaMask (ETC network)": "https://metamask.io",
  "MetaMask (Base network)": "https://metamask.io",
  "MetaMask (Songbird RPC)": "https://metamask.io",
  "MetaMask (Flare RPC)": "https://metamask.io",
  "MetaMask (Chiliz Chain)": "https://metamask.io",
  "MetaMask (Filecoin EVM)": "https://metamask.io",
  "Ledger Nano X": "https://www.ledger.com",
  "Ledger Nano X (via Ronin)": "https://www.ledger.com",
  "Trezor": "https://trezor.io",
  "ELLIPAL": "https://www.ellipal.com",
  "Phantom": "https://phantom.app",
  "Phantom (Solana)": "https://phantom.app",
  "Solflare": "https://solflare.com",
  "Trust Wallet": "https://trustwallet.com",
  "Coinbase Wallet": "https://www.coinbase.com/wallet",
  "Keplr": "https://wallet.keplr.app",
  "Keplr + Ledger": "https://wallet.keplr.app",
  "MetaMask + Ledger": "https://metamask.io",
  "Cosmostation + Ledger": "https://wallet.cosmostation.io",
  "Leap Wallet": "https://leapwallet.io",
  "Xaman (XUMM)": "https://xaman.app",
  "HashPack": "https://www.hashpack.app",
  "Pera Wallet": "https://perawallet.app",
  "ADALite": "https://adalite.io",
  "Yoroi Wallet": "https://yoroi-wallet.com",
  "Tonkeeper": "https://tonkeeper.com",
  "MyTonWallet": "https://mytonwallet.io",
  "MyNearWallet": "https://app.mynearwallet.com",
  "NEAR Wallet (browser extension)": "https://mynearwallet.com",
  "Sui Wallet (browser extension)": "https://suiwallet.com",
  "Petra Wallet": "https://petra.app",
  "Martian Wallet": "https://martianwallet.xyz",
  "Polkadot.js": "https://polkadot.js.org/apps",
  "Nova Wallet": "https://novawallet.io",
  "Bifrost Wallet": "https://bifrostwallet.com",
  "Compass Wallet": "https://compass.sh",
  "Auro Wallet": "https://www.aurowallet.com",
  "Stargazer Wallet": "https://constellationnetwork.io",
  "Natrium (mobile)": "https://natrium.io",
  "Nault (web)": "https://nault.cc",
  "Electron Cash": "https://electroncash.org",
  "Monero GUI Wallet": "https://www.getmonero.org/downloads",
  "Cake Wallet": "https://cakewallet.com",
  "Feather Wallet": "https://featherwallet.org",
  "Firefly Wallet": "https://firefly.iota.org",
  "MultiversX Web Wallet": "https://wallet.multiversx.com",
  "xPortal App": "https://xportal.com",
  "Casper Wallet (browser extension)": "https://www.casperwallet.io",
  "Oasis Wallet": "https://wallet.oasis.io",
  "Kaspa Web Wallet": "https://kaspa.org",
  "KDX Desktop Wallet": "https://kdx.app",
  "Tangem": "https://tangem.com",
  "XDC Web Wallet": "https://wallet.xdc.network",
  "Crypto.com DeFi Wallet": "https://crypto.com",
  "Coinomi": "https://www.coinomi.com",
  "Ronin Wallet": "https://wallet.roninchain.com",
  "Ravencoin Core Wallet": "https://ravencoin.org",
  "DigiByte Core Wallet": "https://digibyte.org",
  "World App": "https://worldcoin.org/download",
  "Ice Wallet App": "https://ice.io",
  "SubWallet": "https://subwallet.app",
  "Plug Wallet": "https://plugwallet.ooo",
  "NNS dApp (Internet Identity)": "https://nns.ic0.app",
  "Leather (Hiro) Wallet": "https://leather.io",
  "Xverse Wallet": "https://www.xverse.app",
  "Flow Wallet (Lilico)": "https://lilico.app",
  "Temple Wallet": "https://templewallet.com",
  "Kukai Wallet": "https://wallet.kukai.app",
  "fWallet": "https://pwawallet.fantom.network",
  "XDEFI Wallet": "https://www.xdefi.io",
  "Rainbow Wallet": "https://rainbow.me",
  "Rabby Wallet": "https://rabby.io",
  "Uniswap Wallet": "https://wallet.uniswap.org",
  "Glif Wallet": "https://glif.io",
  "JoyID Wallet": "https://app.joy.id",
  "Neuron Wallet": "https://www.nervos.org/wallets",
  "Harmony Chrome Extension": "https://staking.harmony.one",
  "Cosmostation": "https://wallet.cosmostation.io",
  "Polkadot.js (Bittensor network)": "https://polkadot.js.org/apps",
  "Lattice Exchange": "https://lattice.exchange",
  "SafePal": "https://www.safepal.com",
};

interface EcosystemInfo {
  wallets: { name: string; link: string }[];
  stakeable: boolean;
  stakingNote?: string;
}

const ECOSYSTEM_WALLET_MAP: Record<string, EcosystemInfo> = {
  ethereum: {
    wallets: [
      { name: "MetaMask", link: "https://metamask.io" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
      { name: "Rabby Wallet", link: "https://rabby.io" },
    ],
    stakeable: false,
  },
  solana: {
    wallets: [
      { name: "Phantom", link: "https://phantom.app" },
      { name: "Solflare", link: "https://solflare.com" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: true,
    stakingNote: "Solana tokens can often be staked via Phantom or Solflare",
  },
  cosmos: {
    wallets: [
      { name: "Keplr", link: "https://wallet.keplr.app" },
      { name: "Leap Wallet", link: "https://leapwallet.io" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: true,
    stakingNote: "Cosmos ecosystem tokens can typically be delegated to validators via Keplr or Leap",
  },
  polkadot: {
    wallets: [
      { name: "Polkadot.js", link: "https://polkadot.js.org/apps" },
      { name: "Nova Wallet", link: "https://novawallet.io" },
      { name: "SubWallet", link: "https://subwallet.app" },
    ],
    stakeable: true,
    stakingNote: "Substrate-based tokens can usually be staked via Polkadot.js or Nova Wallet",
  },
  bitcoin: {
    wallets: [
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
      { name: "Trezor", link: "https://trezor.io" },
      { name: "ELLIPAL", link: "https://www.ellipal.com" },
    ],
    stakeable: false,
  },
  ton: {
    wallets: [
      { name: "Tonkeeper", link: "https://tonkeeper.com" },
      { name: "MyTonWallet", link: "https://mytonwallet.io" },
    ],
    stakeable: true,
    stakingNote: "TON tokens can be staked via Tonkeeper pool staking",
  },
  xrpl: {
    wallets: [
      { name: "Xaman (XUMM)", link: "https://xaman.app" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: false,
  },
  avalanche: {
    wallets: [
      { name: "Core Wallet", link: "https://core.app" },
      { name: "MetaMask", link: "https://metamask.io" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: true,
    stakingNote: "AVAX can be delegated to validators via Core Wallet",
  },
  near: {
    wallets: [
      { name: "MyNearWallet", link: "https://app.mynearwallet.com" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: true,
    stakingNote: "NEAR tokens can be delegated to validators via MyNearWallet",
  },
  stellar: {
    wallets: [
      { name: "Lobstr", link: "https://lobstr.co" },
      { name: "Solar Wallet", link: "https://solarwallet.io" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: false,
  },
  tron: {
    wallets: [
      { name: "TronLink", link: "https://www.tronlink.org" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: true,
    stakingNote: "TRX can be frozen and delegated to Super Representatives via TronScan",
  },
  bsc: {
    wallets: [
      { name: "MetaMask", link: "https://metamask.io" },
      { name: "Trust Wallet", link: "https://trustwallet.com" },
      { name: "Ledger Nano X", link: "https://www.ledger.com" },
    ],
    stakeable: true,
    stakingNote: "BNB can be staked via BNB Chain staking portal",
  },
};

const TOKEN_ECOSYSTEM_HINTS: Record<string, string> = {
  ATOM: "cosmos", OSMO: "cosmos", TIA: "cosmos", DYDX: "cosmos", AKT: "cosmos",
  INJ: "cosmos", SEI: "cosmos", KAVA: "cosmos", FET: "cosmos", SCRT: "cosmos",
  JUNO: "cosmos", EVMOS: "cosmos", STRD: "cosmos", REGEN: "cosmos",
  SOL: "solana", RAY: "solana", JUP: "solana", PYTH: "solana", BONK: "solana",
  ORCA: "solana", MNGO: "solana", RENDER: "solana", HNT: "solana", W: "solana",
  JTO: "solana", TENSOR: "solana", WIF: "solana", BOME: "solana",
  ETH: "ethereum", LINK: "ethereum", UNI: "ethereum", AAVE: "ethereum",
  MKR: "ethereum", LDO: "ethereum", ENS: "ethereum", GRT: "ethereum",
  SHIB: "ethereum", PEPE: "ethereum", SAND: "ethereum", MANA: "ethereum",
  CRV: "ethereum", COMP: "ethereum", SNX: "ethereum", SUSHI: "ethereum",
  "1INCH": "ethereum", BAL: "ethereum", PENDLE: "ethereum", ENA: "ethereum",
  RPL: "ethereum", SSV: "ethereum", ANKR: "ethereum", BLUR: "ethereum",
  DOT: "polkadot", KSM: "polkadot", GLMR: "polkadot", ASTR: "polkadot",
  ACA: "polkadot", TAO: "polkadot", PEAQ: "polkadot", CKB: "polkadot",
  BTC: "bitcoin", BCH: "bitcoin", LTC: "bitcoin", DOGE: "bitcoin",
  KAS: "bitcoin", DGB: "bitcoin", RVN: "bitcoin",
  TON: "ton", NOT: "ton",
  XRP: "xrpl", XLM: "stellar",
  AVAX: "avalanche", QI: "avalanche", JOE: "avalanche",
  NEAR: "near",
  TRX: "tron",
  BNB: "bsc", CAKE: "bsc",
  ARB: "ethereum", OP: "ethereum", IMX: "ethereum",
  POL: "ethereum", MATIC: "ethereum",
  VIRTUAL: "ethereum", ONDO: "ethereum", WLD: "ethereum",
  QNT: "ethereum", JASMY: "ethereum", CHZ: "ethereum",
  WOO: "ethereum", GALA: "ethereum", AXS: "ethereum",
  LEO: "ethereum",
};

interface ExchangeWithdrawalInfo {
  supported: boolean;
  note?: string;
  workaround?: string;
}

const EXCHANGE_WITHDRAWAL_RESTRICTIONS: Record<string, Record<string, ExchangeWithdrawalInfo>> = {
  uphold: {
    ADA: { supported: false, note: "Uphold does not support ADA withdrawals to the Cardano blockchain", workaround: "Swap ADA to XRP or XLM on Uphold → withdraw to Coinbase or Kraken → re-buy ADA → withdraw to your Cardano wallet" },
    KSM: { supported: false, note: "Uphold does not support KSM withdrawals to the Kusama network", workaround: "Swap KSM to XRP or XLM on Uphold → withdraw to Kraken → re-buy KSM → withdraw to Nova Wallet or Polkadot.js" },
    DOT: { supported: false, note: "Uphold does not support DOT withdrawals to the Polkadot network", workaround: "Swap DOT to XRP or XLM on Uphold → withdraw to Kraken or Binance → re-buy DOT → withdraw to Polkadot.js or Nova Wallet" },
    ATOM: { supported: false, note: "Uphold does not support ATOM withdrawals to the Cosmos network", workaround: "Swap ATOM to XRP or XLM on Uphold → withdraw to Coinbase or Kraken → re-buy ATOM → withdraw to Keplr" },
    ALGO: { supported: false, note: "Uphold does not support ALGO withdrawals to the Algorand network", workaround: "Swap ALGO to XRP or XLM on Uphold → withdraw to Coinbase → re-buy ALGO → withdraw to Pera Wallet" },
    INJ: { supported: false, note: "Uphold does not support INJ withdrawals to the Injective network", workaround: "Swap INJ to XRP or XLM on Uphold → withdraw to Binance → re-buy INJ → withdraw to Keplr" },
    NEAR: { supported: false, note: "Uphold does not support NEAR withdrawals to the NEAR network", workaround: "Swap NEAR to XRP or XLM on Uphold → withdraw to Binance or Coinbase → re-buy NEAR → withdraw to MyNearWallet" },
    HBAR: { supported: false, note: "Uphold does not support HBAR withdrawals to the Hedera network", workaround: "Swap HBAR to XRP or XLM on Uphold → withdraw to Coinbase → re-buy HBAR → withdraw to HashPack" },
    IOTA: { supported: false, note: "Uphold does not support IOTA withdrawals", workaround: "Swap IOTA to XRP or XLM on Uphold → withdraw to Binance → re-buy IOTA → withdraw to Firefly Wallet" },
    VET: { supported: false, note: "Uphold does not support VET withdrawals to the VeChain network", workaround: "Swap VET to XRP or XLM on Uphold → withdraw to Binance → re-buy VET → withdraw to VeChainThor Wallet" },
    ONE: { supported: false, note: "Uphold does not support ONE withdrawals to the Harmony network", workaround: "Swap ONE to XRP or XLM on Uphold → withdraw to Binance → re-buy ONE → withdraw to Harmony wallet" },
    THETA: { supported: false, note: "Uphold does not support THETA withdrawals", workaround: "Swap THETA to XRP or XLM on Uphold → withdraw to Binance → re-buy THETA → withdraw to Theta Web Wallet" },
    MINA: { supported: false, note: "Uphold does not support MINA withdrawals", workaround: "Swap MINA to XRP or XLM on Uphold → withdraw to Coinbase → re-buy MINA → withdraw to Auro Wallet" },
    EGLD: { supported: false, note: "Uphold does not support EGLD withdrawals to the MultiversX network", workaround: "Swap EGLD to XRP or XLM on Uphold → withdraw to Binance → re-buy EGLD → withdraw to xPortal" },
    CSPR: { supported: false, note: "Uphold does not support CSPR withdrawals to the Casper network", workaround: "Swap CSPR to XRP or XLM on Uphold → withdraw to an exchange that supports CSPR → re-buy → withdraw to Casper Wallet" },
    ROSE: { supported: false, note: "Uphold does not support ROSE withdrawals to the Oasis network", workaround: "Swap ROSE to XRP or XLM on Uphold → withdraw to Binance → re-buy ROSE → withdraw to Oasis Wallet" },
    SGB: { supported: false, note: "Uphold does not support SGB withdrawals to the Songbird network", workaround: "Swap SGB to XRP or XLM on Uphold → withdraw → re-buy SGB on a DEX or Bifrost Wallet" },
    FIL: { supported: false, note: "Uphold does not support FIL withdrawals to the Filecoin network", workaround: "Swap FIL to XRP or XLM on Uphold → withdraw to Coinbase or Kraken → re-buy FIL → withdraw to Glif or MetaMask" },
    SEI: { supported: false, note: "Uphold does not support SEI withdrawals", workaround: "Swap SEI to XRP or XLM on Uphold → withdraw to Binance → re-buy SEI → withdraw to Compass Wallet or Keplr" },
    DAG: { supported: false, note: "Uphold does not support DAG withdrawals", workaround: "Swap DAG to XRP or XLM on Uphold → withdraw to an exchange with DAG support → re-buy → withdraw to Stargazer Wallet" },
    ICE: { supported: false, note: "Uphold does not support ICE withdrawals", workaround: "Swap ICE to XRP or XLM on Uphold → withdraw → re-buy ICE on a supporting exchange" },
    PEAQ: { supported: false, note: "Uphold does not support PEAQ withdrawals", workaround: "Swap PEAQ to XRP or XLM on Uphold → withdraw → re-buy PEAQ on a supporting exchange → withdraw to SubWallet" },
    XRP: { supported: true, note: "Uphold supports XRP withdrawals on the XRPL — low fees" },
    XLM: { supported: true, note: "Uphold supports XLM withdrawals on the Stellar network — low fees" },
    BTC: { supported: true, note: "Uphold supports BTC withdrawals on the Bitcoin network" },
    ETH: { supported: true, note: "Uphold supports ETH withdrawals on the Ethereum network — watch gas fees" },
    LTC: { supported: true, note: "Uphold supports LTC withdrawals on the Litecoin network — low fees" },
    DOGE: { supported: true, note: "Uphold supports DOGE withdrawals on the Dogecoin network" },
    SOL: { supported: true, note: "Uphold supports SOL withdrawals on the Solana network" },
    AVAX: { supported: true, note: "Uphold supports AVAX withdrawals on the Avalanche C-Chain" },
    BAT: { supported: true, note: "Uphold supports BAT withdrawals as an ERC-20 token" },
    SUI: { supported: true, note: "Uphold supports SUI withdrawals on the Sui network" },
    APT: { supported: true, note: "Uphold supports APT withdrawals on the Aptos network" },
    TAO: { supported: true, note: "Uphold supports TAO withdrawals on the Bittensor network" },
  },
  coinbase: {
    ADA: { supported: true, note: "Coinbase supports ADA withdrawals on the Cardano network" },
    DOT: { supported: true, note: "Coinbase supports DOT withdrawals on the Polkadot network" },
    ATOM: { supported: true, note: "Coinbase supports ATOM withdrawals on the Cosmos network" },
    ALGO: { supported: true, note: "Coinbase supports ALGO withdrawals on the Algorand network" },
    SOL: { supported: true, note: "Coinbase supports SOL withdrawals on the Solana network" },
    NEAR: { supported: true, note: "Coinbase supports NEAR withdrawals on the NEAR network" },
    HBAR: { supported: true, note: "Coinbase supports HBAR withdrawals on the Hedera network" },
    MINA: { supported: true, note: "Coinbase supports MINA withdrawals on the Mina network" },
    XRP: { supported: true, note: "Coinbase supports XRP withdrawals on the XRPL" },
  },
  kraken: {
    ADA: { supported: true, note: "Kraken supports ADA withdrawals on the Cardano network" },
    DOT: { supported: true, note: "Kraken supports DOT withdrawals on the Polkadot network" },
    KSM: { supported: true, note: "Kraken supports KSM withdrawals on the Kusama network" },
    ATOM: { supported: true, note: "Kraken supports ATOM withdrawals on the Cosmos network" },
    ALGO: { supported: true, note: "Kraken supports ALGO withdrawals on the Algorand network" },
    SOL: { supported: true, note: "Kraken supports SOL withdrawals on the Solana network" },
    XRP: { supported: true, note: "Kraken supports XRP withdrawals on the XRPL" },
    NEAR: { supported: true, note: "Kraken supports NEAR withdrawals on the NEAR network" },
  },
};

function getExchangeWithdrawalInfo(symbol: string, exchange: string): ExchangeWithdrawalInfo | null {
  const exchangeNorm = exchange.toLowerCase().trim();
  for (const [exKey, tokens] of Object.entries(EXCHANGE_WITHDRAWAL_RESTRICTIONS)) {
    if (exchangeNorm.includes(exKey)) {
      return tokens[symbol] || null;
    }
  }
  return null;
}

function getEcosystemFallback(symbol: string): EcosystemInfo | null {
  const eco = TOKEN_ECOSYSTEM_HINTS[symbol];
  if (eco && ECOSYSTEM_WALLET_MAP[eco]) return ECOSYSTEM_WALLET_MAP[eco];
  return null;
}

function walletActionItems(walletNames: string[], symbol: string): ActionItem[] {
  return walletNames.slice(0, 3).map(name => {
    const link = WALLET_LINKS[name];
    return {
      text: `Set up ${name} to hold your ${symbol}`,
      link: link || undefined,
      custodyBadge: "on_chain" as CustodyType,
    };
  });
}

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

export interface WalletTip {
  trigger: "staking" | "rewards" | "unstaked" | "general";
  text: string;
  link?: string;
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
  walletTips?: WalletTip[];
  notes?: string;
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
      { platform: "Coinbase (cbETH)", method: "Wrapped Staking", apyRange: "2.5–3.0%", apyMid: 2.75, link: "https://coinbase.com/join/TT3HJ4K?src=ios-link", custodyType: "custodial", blockchain: "Ethereum" },
      { platform: "EigenLayer", method: "Restaking", apyRange: "Variable + Points", apyMid: 4.0, link: "https://www.eigenlayer.xyz", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "ETH Staking", apyRange: "2.5–3.0%", apyMid: 2.75, flexible: false, link: "https://coinbase.com/join/TT3HJ4K?src=ios-link", custodyType: "custodial" },
      { exchange: "Kraken", program: "ETH Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://proinvite.kraken.com/9f1e/oya30ft6", custodyType: "custodial" },
      { exchange: "Binance", program: "ETH 2.0 Staking", apyRange: "2.5–3.5%", apyMid: 3.0, flexible: false, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "1.5–3.0%", apyMid: 2.0, flexible: true, link: "https://crypto.com/app/24csm6d4km", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Lido stETH", defiApy: "3.2%", defiApyMid: 3.2, riskLevel: "Low", link: "https://lido.fi", custodyType: "on_chain", blockchain: "Ethereum" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Aave ETH Lending", defiApy: "2.0–4.0%", defiApyMid: 3.0, riskLevel: "Medium", link: "https://aave.com", custodyType: "on_chain", blockchain: "Ethereum" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Compound ETH", defiApy: "1.5–3.5%", defiApyMid: 2.5, riskLevel: "Low", link: "https://compound.finance", custodyType: "on_chain", blockchain: "Ethereum" },
      { tradFiProduct: "Bond Fund (4.0% APY)", tradFiApy: "4.0%", defiProtocol: "Curve ETH/stETH Pool", defiApy: "2.0–5.0%", defiApyMid: 3.5, riskLevel: "Medium", link: "https://curve.fi", custodyType: "on_chain", blockchain: "Ethereum" },
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
      { exchange: "Coinbase", program: "SOL Staking", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: false, link: "https://coinbase.com/join/TT3HJ4K?src=ios-link", custodyType: "custodial" },
      { exchange: "Kraken", program: "SOL Staking", apyRange: "5.0–6.0%", apyMid: 5.5, flexible: false, link: "https://proinvite.kraken.com/9f1e/oya30ft6", custodyType: "custodial" },
      { exchange: "Binance", program: "SOL Staking", apyRange: "5.0–7.0%", apyMid: 6.0, flexible: false, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Jito Staking", defiApy: "7.5%", defiApyMid: 7.5, riskLevel: "Low", link: "https://www.jito.network", custodyType: "on_chain", blockchain: "Solana" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Marinade DeFi", defiApy: "6.5–7.5%", defiApyMid: 7.0, riskLevel: "Low", link: "https://marinade.finance", custodyType: "on_chain", blockchain: "Solana" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Raydium SOL Pools", defiApy: "5.0–12.0%", defiApyMid: 8.0, riskLevel: "Medium", link: "https://raydium.io", custodyType: "on_chain", blockchain: "Solana" },
      { tradFiProduct: "Bond Fund (4.0% APY)", tradFiApy: "4.0%", defiProtocol: "Orca Whirlpools", defiApy: "4.0–15.0%", defiApyMid: 8.5, riskLevel: "High", link: "https://www.orca.so", custodyType: "on_chain", blockchain: "Solana" },
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
      { platform: "SundaeSwap", method: "Liquidity Provision", apyRange: "5.0–15.0%", apyMid: 10.0, link: "https://sundaeswap.finance", custodyType: "on_chain", blockchain: "Cardano" },
      { platform: "Minswap", method: "Yield Farming", apyRange: "4.0–12.0%", apyMid: 8.0, link: "https://minswap.org", custodyType: "on_chain", blockchain: "Cardano" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "ADA Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://proinvite.kraken.com/9f1e/oya30ft6", custodyType: "custodial" },
      { exchange: "Binance", program: "ADA Staking", apyRange: "1.5–3.0%", apyMid: 2.0, flexible: true, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Native ADA Staking", defiApy: "3.0–5.0%", defiApyMid: 4.0, riskLevel: "Low", link: "https://pool.pm", custodyType: "on_chain", blockchain: "Cardano" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Minswap ADA Pools", defiApy: "4.0–12.0%", defiApyMid: 8.0, riskLevel: "Medium", link: "https://minswap.org", custodyType: "on_chain", blockchain: "Cardano" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "SundaeSwap Liquidity", defiApy: "5.0–15.0%", defiApyMid: 10.0, riskLevel: "High", link: "https://sundaeswap.finance", custodyType: "on_chain", blockchain: "Cardano" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Daedalus", "Yoroi", "Eternl"],
    walletTips: [
      { trigger: "unstaked", text: "Delegate your ADA to a stake pool using Eternl or Yoroi wallet connected to your Ledger", link: "https://eternl.io" },
      { trigger: "staking", text: "Your ADA is delegated and earning rewards — Cardano staking keeps your funds liquid" },
      { trigger: "rewards", text: "Claim your ADA staking rewards through your wallet app — rewards are added to your delegated balance automatically on Cardano" },
    ],
  },
  ZIL: {
    symbol: "ZIL",
    name: "Zilliqa",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Staking", method: "SSN Delegation", apyRange: "10–13%", apyMid: 11.5, link: "https://v1.zillet.io/staking", custodyType: "on_chain", blockchain: "Zilliqa" },
    ],
    exchangeEarnOptions: [
      { exchange: "Binance", program: "ZIL Staking", apyRange: "8.0–10.0%", apyMid: 9.0, flexible: false, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "ZIL Native Staking", defiApy: "10–13%", defiApyMid: 11.5, riskLevel: "Low", link: "https://v1.zillet.io/staking", custodyType: "on_chain", blockchain: "Zilliqa" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Zillet", "Moonlet"],
    walletTips: [
      { trigger: "unstaked", text: "Go to v1.zillet.io and connect your hardware wallet to stake your ZIL tokens", link: "https://v1.zillet.io/staking" },
      { trigger: "staking", text: "Your ZIL is delegated to a seed node and earning rewards via Zillet" },
      { trigger: "rewards", text: "Go to v1.zillet.io and connect your hardware wallet to claim your ZIL staking rewards", link: "https://v1.zillet.io/staking" },
    ],
  },
  DOT: {
    symbol: "DOT",
    name: "Polkadot",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Native Nomination", method: "Nominating Validators", apyRange: "12–15%", apyMid: 13.5, link: "https://polkadot.js.org/apps/#/staking", custodyType: "on_chain", blockchain: "Polkadot" },
      { platform: "Bifrost", method: "Liquid Staking (vDOT)", apyRange: "10–13%", apyMid: 11.5, link: "https://bifrost.finance", custodyType: "on_chain", blockchain: "Polkadot" },
      { platform: "Acala", method: "Liquid Staking (LDOT)", apyRange: "10–14%", apyMid: 12.0, link: "https://acala.network", custodyType: "on_chain", blockchain: "Polkadot" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "DOT Staking", apyRange: "8.0–12.0%", apyMid: 10.0, flexible: false, link: "https://proinvite.kraken.com/9f1e/oya30ft6", custodyType: "custodial" },
      { exchange: "Binance", program: "DOT Staking", apyRange: "10.0–12.0%", apyMid: 11.0, flexible: false, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Polkadot Native Staking", defiApy: "12–15%", defiApyMid: 13.5, riskLevel: "Low", link: "https://polkadot.js.org/apps/#/staking", custodyType: "on_chain", blockchain: "Polkadot" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Bifrost Liquid Staking", defiApy: "10–13%", defiApyMid: 11.5, riskLevel: "Medium", link: "https://bifrost.finance", custodyType: "on_chain", blockchain: "Polkadot" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Acala LDOT", defiApy: "10–14%", defiApyMid: 12.0, riskLevel: "Medium", link: "https://acala.network", custodyType: "on_chain", blockchain: "Polkadot" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Polkadot.js", "Nova Wallet", "Talisman"],
  },
  AVAX: {
    symbol: "AVAX",
    name: "Avalanche",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Benqi", method: "Liquid Staking (sAVAX)", apyRange: "5.0–6.0%", apyMid: 5.5, link: "https://benqi.fi", custodyType: "on_chain", blockchain: "Avalanche" },
      { platform: "Native Delegation", method: "Validator Delegation", apyRange: "8.0–9.5%", apyMid: 8.75, link: "https://wallet.avax.network", custodyType: "on_chain", blockchain: "Avalanche" },
      { platform: "GoGoPool", method: "Liquid Staking (ggAVAX)", apyRange: "5.5–7.0%", apyMid: 6.25, link: "https://www.gogopool.com", custodyType: "on_chain", blockchain: "Avalanche" },
    ],
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "AVAX Staking", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: false, link: "https://coinbase.com/join/TT3HJ4K?src=ios-link", custodyType: "custodial" },
      { exchange: "Binance", program: "AVAX Staking", apyRange: "5.0–7.0%", apyMid: 6.0, flexible: false, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "AVAX Native Staking", defiApy: "8.0–9.5%", defiApyMid: 8.75, riskLevel: "Low", link: "https://wallet.avax.network", custodyType: "on_chain", blockchain: "Avalanche" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Benqi Liquid Staking", defiApy: "5.0–6.0%", defiApyMid: 5.5, riskLevel: "Low", link: "https://benqi.fi", custodyType: "on_chain", blockchain: "Avalanche" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Aave on Avalanche", defiApy: "2.0–5.0%", defiApyMid: 3.5, riskLevel: "Medium", link: "https://app.aave.com", custodyType: "on_chain", blockchain: "Avalanche" },
      { tradFiProduct: "Bond Fund (4.0% APY)", tradFiApy: "4.0%", defiProtocol: "Trader Joe Liquidity", defiApy: "5.0–20.0%", defiApyMid: 10.0, riskLevel: "High", link: "https://traderjoexyz.com", custodyType: "on_chain", blockchain: "Avalanche" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Core Wallet", "MetaMask"],
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Crypto.com", program: "Earn", apyRange: "0.5–1.5%", apyMid: 1.0, flexible: true, link: "https://crypto.com/app/24csm6d4km", custodyType: "custodial" },
      { exchange: "Binance", program: "Simple Earn", apyRange: "0.5–2.0%", apyMid: 1.0, flexible: true, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
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
      { exchange: "Coinbase", program: "MATIC Staking", apyRange: "3.0–4.0%", apyMid: 3.5, flexible: false, link: "https://coinbase.com/join/TT3HJ4K?src=ios-link", custodyType: "custodial" },
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
      { exchange: "Binance", program: "BNB Vault", apyRange: "2.0–5.0%", apyMid: 3.5, flexible: true, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
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
      { platform: "Stader", method: "Liquid Staking (HBARX)", apyRange: "3.0–4.5%", apyMid: 3.75, link: "https://www.staderlabs.com/hedera/", custodyType: "on_chain", blockchain: "Hedera" },
      { platform: "SaucerSwap", method: "Liquidity Provision", apyRange: "5.0–15.0%", apyMid: 8.0, link: "https://www.saucerswap.finance", custodyType: "on_chain", blockchain: "Hedera" },
    ],
    exchangeEarnOptions: [
      { exchange: "Binance", program: "HBAR Staking", apyRange: "2.0–3.0%", apyMid: 2.5, flexible: false, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Hedera Native Staking", defiApy: "2.5–3.5%", defiApyMid: 3.0, riskLevel: "Low", link: "https://hedera.com/staking", custodyType: "on_chain", blockchain: "Hedera" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Stader HBARX", defiApy: "3.0–4.5%", defiApyMid: 3.75, riskLevel: "Low", link: "https://www.staderlabs.com/hedera/", custodyType: "on_chain", blockchain: "Hedera" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "SaucerSwap Pools", defiApy: "5.0–15.0%", defiApyMid: 8.0, riskLevel: "Medium", link: "https://www.saucerswap.finance", custodyType: "on_chain", blockchain: "Hedera" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "HashPack", "Blade Wallet"],
    walletTips: [
      { trigger: "unstaked", text: "Install the HashPack browser extension and connect your Ledger to stake HBAR", link: "https://www.hashpack.app" },
      { trigger: "staking", text: "Manage your HBAR staking via the HashPack browser extension — click STAKE tab to view rewards", link: "https://www.hashpack.app" },
      { trigger: "rewards", text: "Your HBAR staking rewards are auto-compounded — no need to claim manually" },
    ],
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    stakeable: false,
    withdrawable: true,
    exchangeEarnOptions: [
      { exchange: "Coinbase", program: "USDC Rewards", apyRange: "4.0–5.0%", apyMid: 4.5, flexible: true, link: "https://coinbase.com/join/TT3HJ4K?src=ios-link", custodyType: "custodial" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "3.0–6.0%", apyMid: 4.5, flexible: true, link: "https://crypto.com/app/24csm6d4km", custodyType: "custodial" },
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
      { exchange: "Binance", program: "Simple Earn", apyRange: "3.0–5.0%", apyMid: 4.0, flexible: true, link: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196", custodyType: "custodial" },
      { exchange: "Crypto.com", program: "Earn", apyRange: "3.0–6.0%", apyMid: 4.5, flexible: true, link: "https://crypto.com/app/24csm6d4km", custodyType: "custodial" },
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
      { platform: "pSTAKE", method: "Liquid Staking (stkATOM)", apyRange: "12–16%", apyMid: 14.0, link: "https://pstake.finance", custodyType: "on_chain", blockchain: "Cosmos" },
    ],
    exchangeEarnOptions: [
      { exchange: "Kraken", program: "ATOM Staking", apyRange: "10.0–14.0%", apyMid: 12.0, flexible: false, link: "https://proinvite.kraken.com/9f1e/oya30ft6", custodyType: "custodial" },
      { exchange: "Coinbase", program: "ATOM Staking", apyRange: "8.0–12.0%", apyMid: 10.0, flexible: false, link: "https://coinbase.com/join/TT3HJ4K?src=ios-link", custodyType: "custodial" },
    ],
    defiAlternatives: [
      { tradFiProduct: "High-Yield Savings (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Cosmos Native Staking", defiApy: "15–20%", defiApyMid: 17.5, riskLevel: "Low", link: "https://www.mintscan.io/cosmos/validators", custodyType: "on_chain", blockchain: "Cosmos" },
      { tradFiProduct: "1-Year CD (4.5% APY)", tradFiApy: "4.5%", defiProtocol: "Stride Liquid Staking", defiApy: "14–17%", defiApyMid: 15.5, riskLevel: "Medium", link: "https://stride.zone", custodyType: "on_chain", blockchain: "Cosmos" },
      { tradFiProduct: "Money Market (5.0% APY)", tradFiApy: "5.0%", defiProtocol: "Osmosis LP Pools", defiApy: "10–30%", defiApyMid: 15.0, riskLevel: "High", link: "https://app.osmosis.zone", custodyType: "on_chain", blockchain: "Cosmos" },
    ],
    selfCustodyWallets: ["Ledger Nano X", "Keplr", "Cosmostation", "Leap Wallet"],
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
  NEAR: {
    symbol: "NEAR",
    name: "NEAR Protocol",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "MyNearWallet", method: "Validator Delegation", apyRange: "8–11%", apyMid: 9.5, link: "https://app.mynearwallet.com", custodyType: "on_chain", blockchain: "NEAR" },
      { platform: "Ledger (via NEAR Wallet)", method: "Validator Delegation", apyRange: "8–11%", apyMid: 9.5, link: "https://app.mynearwallet.com", custodyType: "on_chain", blockchain: "NEAR" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "NEAR Staking", apyRange: "3–5%", apyMid: 4.0, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["MyNearWallet", "NEAR Wallet (browser extension)", "Ledger Nano X"],
  },
  INJ: {
    symbol: "INJ",
    name: "Injective",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Keplr Wallet", method: "Validator Delegation", apyRange: "14–18%", apyMid: 16.0, link: "https://wallet.keplr.app/chains/injective", custodyType: "on_chain", blockchain: "Injective" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "INJ Staking", apyRange: "5–8%", apyMid: 6.5, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Keplr", "Leap Wallet", "Ledger Nano X"],
  },
  KSM: {
    symbol: "KSM",
    name: "Kusama",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Polkadot.js", method: "Nominator Staking", apyRange: "12–15%", apyMid: 13.5, link: "https://polkadot.js.org/apps/#/staking", custodyType: "on_chain", blockchain: "Kusama" },
      { platform: "Nova Wallet", method: "Nominator Staking", apyRange: "12–15%", apyMid: 13.5, link: "https://novawallet.io", custodyType: "on_chain", blockchain: "Kusama" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "KSM Staking", apyRange: "5–8%", apyMid: 6.5, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Polkadot.js", "Nova Wallet", "Ledger Nano X", "ELLIPAL"],
  },
  SUI: {
    symbol: "SUI",
    name: "Sui",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Sui Wallet", method: "Validator Delegation", apyRange: "3.5–5%", apyMid: 4.2, link: "https://suiwallet.com", custodyType: "on_chain", blockchain: "Sui" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "SUI Staking", apyRange: "3–4%", apyMid: 3.5, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Sui Wallet (browser extension)", "Ledger Nano X"],
  },
  APT: {
    symbol: "APT",
    name: "Aptos",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Petra Wallet", method: "Validator Delegation", apyRange: "6–8%", apyMid: 7.0, link: "https://petra.app", custodyType: "on_chain", blockchain: "Aptos" },
      { platform: "Martian Wallet", method: "Validator Delegation", apyRange: "6–8%", apyMid: 7.0, link: "https://martianwallet.xyz", custodyType: "on_chain", blockchain: "Aptos" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "APT Staking", apyRange: "5–7%", apyMid: 6.0, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Petra Wallet", "Martian Wallet", "Ledger Nano X"],
  },
  TAO: {
    symbol: "TAO",
    name: "Bittensor",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Bittensor CLI / Polkadot.js", method: "Subnet Delegation", apyRange: "10–18%", apyMid: 14.0, link: "https://bittensor.com", custodyType: "on_chain", blockchain: "Bittensor" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "TAO Staking", apyRange: "8–12%", apyMid: 10.0, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    warnings: ["Bittensor native staking requires CLI knowledge — Uphold staking is simpler but custodial"],
    selfCustodyWallets: ["Polkadot.js (Bittensor network)", "Bittensor CLI"],
  },
  FIL: {
    symbol: "FIL",
    name: "Filecoin",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Ledger Nano X", "Glif Wallet", "MetaMask (Filecoin EVM)"],
  },
  SEI: {
    symbol: "SEI",
    name: "Sei",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Compass Wallet", method: "Validator Delegation", apyRange: "4–6%", apyMid: 5.0, link: "https://compass.sh", custodyType: "on_chain", blockchain: "Sei" },
      { platform: "Keplr Wallet", method: "Validator Delegation", apyRange: "4–6%", apyMid: 5.0, link: "https://wallet.keplr.app/chains/sei", custodyType: "on_chain", blockchain: "Sei" },
    ],
    selfCustodyWallets: ["Compass Wallet", "Keplr", "Leap Wallet"],
  },
  THETA: {
    symbol: "THETA",
    name: "Theta Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Theta Web Wallet", method: "Guardian Node / Delegate", apyRange: "3–5%", apyMid: 4.0, link: "https://wallet.thetatoken.org", custodyType: "on_chain", blockchain: "Theta" },
    ],
    selfCustodyWallets: ["Theta Web Wallet", "Ledger Nano X"],
  },
  IOTA: {
    symbol: "IOTA",
    name: "IOTA",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Firefly Wallet", method: "IOTA Staking", apyRange: "5–10%", apyMid: 7.5, link: "https://firefly.iota.org", custodyType: "on_chain", blockchain: "IOTA" },
    ],
    selfCustodyWallets: ["Firefly Wallet", "Ledger Nano X"],
  },
  EGLD: {
    symbol: "EGLD",
    name: "MultiversX",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "MultiversX Wallet", method: "Validator Delegation", apyRange: "7–10%", apyMid: 8.5, link: "https://wallet.multiversx.com", custodyType: "on_chain", blockchain: "MultiversX" },
      { platform: "xPortal App", method: "Validator Delegation", apyRange: "7–10%", apyMid: 8.5, link: "https://xportal.com", custodyType: "on_chain", blockchain: "MultiversX" },
    ],
    selfCustodyWallets: ["MultiversX Web Wallet", "xPortal App", "Ledger Nano X"],
  },
  CSPR: {
    symbol: "CSPR",
    name: "Casper",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Casper Wallet", method: "Validator Delegation", apyRange: "9–12%", apyMid: 10.5, link: "https://cspr.live/delegate-stake", custodyType: "on_chain", blockchain: "Casper" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "CSPR Staking", apyRange: "5–8%", apyMid: 6.5, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Casper Wallet (browser extension)", "Ledger Nano X"],
  },
  ROSE: {
    symbol: "ROSE",
    name: "Oasis Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Oasis Wallet", method: "Validator Delegation", apyRange: "6–10%", apyMid: 8.0, link: "https://wallet.oasis.io", custodyType: "on_chain", blockchain: "Oasis" },
    ],
    exchangeEarnOptions: [
      { exchange: "Uphold", program: "ROSE Staking", apyRange: "4–6%", apyMid: 5.0, flexible: false, link: "https://uphold.com", custodyType: "custodial" },
    ],
    selfCustodyWallets: ["Oasis Wallet", "Ledger Nano X"],
  },
  KAS: {
    symbol: "KAS",
    name: "Kaspa",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Kaspa Web Wallet", "KDX Desktop Wallet", "Tangem"],
  },
  XDC: {
    symbol: "XDC",
    name: "XDC Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "XDC Web Wallet", method: "Masternode Delegation", apyRange: "8–12%", apyMid: 10.0, link: "https://wallet.xdc.network", custodyType: "on_chain", blockchain: "XDC Network" },
    ],
    selfCustodyWallets: ["XDC Web Wallet", "ELLIPAL", "Ledger Nano X"],
  },
  SGB: {
    symbol: "SGB",
    name: "Songbird",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Bifrost Wallet", method: "FTSO Delegation", apyRange: "5–10%", apyMid: 7.5, link: "https://bifrostwallet.com", custodyType: "on_chain", blockchain: "Songbird" },
    ],
    selfCustodyWallets: ["Bifrost Wallet", "MetaMask (Songbird RPC)"],
  },
  FLR: {
    symbol: "FLR",
    name: "Flare",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Bifrost Wallet", method: "FTSO Delegation + FlareDrops", apyRange: "5–10%", apyMid: 7.5, link: "https://bifrostwallet.com", custodyType: "on_chain", blockchain: "Flare" },
    ],
    selfCustodyWallets: ["Bifrost Wallet", "MetaMask (Flare RPC)", "Ledger Nano X"],
  },
  MINA: {
    symbol: "MINA",
    name: "Mina Protocol",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Auro Wallet", method: "Validator Delegation", apyRange: "10–14%", apyMid: 12.0, link: "https://www.aurowallet.com", custodyType: "on_chain", blockchain: "Mina" },
    ],
    selfCustodyWallets: ["Auro Wallet", "Ledger Nano X"],
  },
  ONE: {
    symbol: "ONE",
    name: "Harmony",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Harmony Staking Dashboard", method: "Validator Delegation", apyRange: "8–11%", apyMid: 9.5, link: "https://staking.harmony.one", custodyType: "on_chain", blockchain: "Harmony" },
    ],
    selfCustodyWallets: ["Harmony Chrome Extension", "Ledger Nano X"],
  },
  FET: {
    symbol: "FET",
    name: "Artificial Superintelligence Alliance (ASI)",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Keplr + Ledger", method: "Validator Delegation (Cosmos SDK)", apyRange: "7–12%", apyMid: 9.5, link: "https://wallet.keplr.app/chains/fetchhub", custodyType: "on_chain", blockchain: "Fetch.ai" },
      { platform: "Cosmostation + Ledger", method: "Validator Delegation", apyRange: "7–12%", apyMid: 9.5, link: "https://wallet.cosmostation.io/fetchai", custodyType: "on_chain", blockchain: "Fetch.ai" },
    ],
    notes: "FET is a Cosmos SDK chain — connect your Ledger to Keplr to stake directly. If your FET is an ERC-20 on Ethereum, you'll need to bridge it to the native Fetch.ai chain first via the ASI Alliance bridge (https://bridge.asi.ai). Once on the native chain, stake through Keplr with Ledger signing for cold wallet security.",
    selfCustodyWallets: ["Keplr + Ledger", "Cosmostation + Ledger", "MetaMask (ERC-20 only)", "Ledger Nano X"],
  },
  WLD: {
    symbol: "WLD",
    name: "Worldcoin",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["World App", "MetaMask (Optimism)", "Ledger Nano X"],
  },
  NOT: {
    symbol: "NOT",
    name: "Notcoin",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Tonkeeper", "MyTonWallet"],
  },
  DGB: {
    symbol: "DGB",
    name: "DigiByte",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["DigiByte Core Wallet", "Ledger Nano X", "Coinomi"],
  },
  POL: {
    symbol: "POL",
    name: "Polygon",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Polygon Staking Portal", method: "Validator Delegation", apyRange: "4–6%", apyMid: 5.0, link: "https://staking.polygon.technology", custodyType: "on_chain", blockchain: "Polygon" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "ELLIPAL"],
  },
  PEAQ: {
    symbol: "PEAQ",
    name: "peaq",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "peaq Portal", method: "Machine DePIN Staking", apyRange: "8–15%", apyMid: 11.5, link: "https://www.peaq.network", custodyType: "on_chain", blockchain: "peaq" },
    ],
    selfCustodyWallets: ["SubWallet", "Nova Wallet"],
  },
  DAG: {
    symbol: "DAG",
    name: "Constellation",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Stargazer Wallet", method: "Soft Node Staking", apyRange: "8–12%", apyMid: 10.0, link: "https://constellationnetwork.io", custodyType: "on_chain", blockchain: "Constellation" },
    ],
    selfCustodyWallets: ["Stargazer Wallet", "Lattice Exchange"],
  },
  XNO: {
    symbol: "XNO",
    name: "Nano",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Natrium (mobile)", "Nault (web)", "Ledger Nano X"],
  },
  HYPE: {
    symbol: "HYPE",
    name: "HyperLiquid",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "HyperLiquid App", method: "Native Staking", apyRange: "8–15%", apyMid: 11.5, link: "https://app.hyperliquid.xyz", custodyType: "on_chain", blockchain: "HyperLiquid" },
    ],
    selfCustodyWallets: ["HyperLiquid App (connect MetaMask)"],
  },
  VIRTUAL: {
    symbol: "VIRTUAL",
    name: "Virtuals Protocol",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask (Base network)", "Coinbase Wallet", "Ledger Nano X"],
  },
  ICE: {
    symbol: "ICE",
    name: "Ice Open Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Ice App", method: "Native Staking", apyRange: "5–10%", apyMid: 7.5, link: "https://ice.io", custodyType: "on_chain", blockchain: "Ice" },
    ],
    selfCustodyWallets: ["Ice Wallet App"],
  },
  RVN: {
    symbol: "RVN",
    name: "Ravencoin",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Ravencoin Core Wallet", "Ledger Nano X"],
  },
  LINK: {
    symbol: "LINK",
    name: "Chainlink",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Chainlink Staking v0.2 (MetaMask + Ledger)", method: "Community Staking Pool", apyRange: "4–6%", apyMid: 5.0, link: "https://staking.chain.link", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    notes: "Chainlink staking is done through staking.chain.link — connect MetaMask with your Ledger for cold wallet signing. The Community Pool requires a minimum of 1 LINK. Staking has a capacity cap and may have a waitlist. Your LINK stays on Ethereum, secured by your Ledger. Keplr cannot stake LINK — use MetaMask + Ledger instead.",
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X", "Trezor"],
  },
  RNDR: {
    symbol: "RNDR",
    name: "Render Network",
    stakeable: false,
    withdrawable: true,
    notes: "RNDR does not have traditional staking. You earn RNDR by contributing GPU power to the Render Network as a node operator, not by locking tokens. As a holder, RNDR is a hold-only asset — keep it in cold storage on your Ledger via MetaMask. Some DeFi protocols may offer RNDR lending/LP opportunities but they carry smart contract risk.",
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X", "Coinbase Wallet"],
  },
  SPELL: {
    symbol: "SPELL",
    name: "Spell Token (Abracadabra)",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Abracadabra.money (MetaMask + Ledger)", method: "sSPELL Staking", apyRange: "5–15%", apyMid: 10.0, link: "https://abracadabra.money/stake", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    notes: "Stake SPELL for sSPELL on Abracadabra.money to earn a share of platform fees. Connect MetaMask with your Ledger for cold wallet signing. sSPELL is an auto-compounding token — your staked position grows over time.",
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X"],
  },
  stETH: {
    symbol: "stETH",
    name: "Lido Staked ETH",
    stakeable: false,
    withdrawable: true,
    notes: "stETH is already staked ETH earning ~3% APY through Lido. No further action needed — you're already earning. You can also use stETH as collateral on Aave or other DeFi protocols for additional yield. Hold in MetaMask + Ledger for cold wallet security. To unstake, use the Lido withdrawal portal at stake.lido.fi.",
    defiAlternatives: [
      { tradFiProduct: "Already Staked (Lido)", tradFiApy: "~3%", defiProtocol: "Aave (supply stETH)", defiApy: "1–3%", defiApyMid: 2.0, riskLevel: "Medium", link: "https://app.aave.com", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X"],
  },
  XCN: {
    symbol: "XCN",
    name: "Onyxcoin (Chain)",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Onyx Protocol (MetaMask + Ledger)", method: "XCN Staking", apyRange: "5–10%", apyMid: 7.5, link: "https://onyx.org", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    notes: "Stake XCN through the Onyx Protocol governance portal. Connect MetaMask with your Ledger for cold wallet signing.",
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X"],
  },
  DNT: {
    symbol: "DNT",
    name: "district0x",
    stakeable: false,
    withdrawable: true,
    notes: "DNT is a governance token for district0x — no traditional staking available. Hold in cold storage via MetaMask + Ledger.",
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X"],
  },
  VRA: {
    symbol: "VRA",
    name: "Verasity",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "VeraWallet", method: "VRA Staking", apyRange: "10–18%", apyMid: 14.0, link: "https://verawallet.tv", custodyType: "custodial", blockchain: "Ethereum" },
    ],
    notes: "VRA staking is available through VeraWallet with competitive APY. Note: VeraWallet is custodial — you'd need to transfer VRA to their platform. For cold wallet security, keep VRA on Ledger via MetaMask and accept no staking yield.",
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X"],
  },
  REEF: {
    symbol: "REEF",
    name: "Reef",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Reef Chain", method: "Validator Nomination", apyRange: "15–30%", apyMid: 22.0, link: "https://reef.io", custodyType: "on_chain", blockchain: "Reef Chain" },
    ],
    notes: "REEF has its own chain (Reef Chain) with validator staking. The ERC-20 version on Ethereum cannot be staked — you'd need to bridge to Reef Chain. Given the project's smaller size, evaluate the risk carefully before bridging.",
    selfCustodyWallets: ["MetaMask + Ledger", "Reef Chain Extension", "Ledger Nano X"],
  },
  PRQ: {
    symbol: "PRQ",
    name: "PARSIQ",
    stakeable: false,
    withdrawable: true,
    notes: "PRQ does not currently offer staking. Hold in cold storage via MetaMask + Ledger. PARSIQ is a blockchain analytics platform — PRQ is its utility token.",
    selfCustodyWallets: ["MetaMask + Ledger", "Ledger Nano X"],
  },
  UNI: {
    symbol: "UNI",
    name: "Uniswap",
    stakeable: false,
    withdrawable: true,
    defiAlternatives: [
      { tradFiProduct: "Hold Only", tradFiApy: "0%", defiProtocol: "Uniswap LP", defiApy: "5–20%", defiApyMid: 12.0, riskLevel: "Medium", link: "https://app.uniswap.org/pool", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Uniswap Wallet", "Ledger Nano X", "Coinbase Wallet"],
  },
  AAVE: {
    symbol: "AAVE",
    name: "Aave",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Aave Safety Module", method: "stkAAVE Staking", apyRange: "5–8%", apyMid: 6.5, link: "https://app.aave.com/staking", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "Trezor"],
  },
  MKR: {
    symbol: "MKR",
    name: "Maker",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Sky (MakerDAO)", method: "SKY Staking Rewards", apyRange: "5–8%", apyMid: 6.5, link: "https://app.sky.money", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "Trezor"],
  },
  ARB: {
    symbol: "ARB",
    name: "Arbitrum",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Arbitrum DAO Staking", method: "ARB Staking", apyRange: "5–10%", apyMid: 7.5, link: "https://www.tally.xyz/gov/arbitrum", custodyType: "on_chain", blockchain: "Arbitrum" },
    ],
    selfCustodyWallets: ["MetaMask (Arbitrum network)", "Ledger Nano X", "Rabby Wallet"],
  },
  OP: {
    symbol: "OP",
    name: "Optimism",
    stakeable: false,
    withdrawable: true,
    defiAlternatives: [
      { tradFiProduct: "Hold Only", tradFiApy: "0%", defiProtocol: "Velodrome LP", defiApy: "5–15%", defiApyMid: 10.0, riskLevel: "Medium", link: "https://velodrome.finance", custodyType: "on_chain", blockchain: "Optimism" },
    ],
    selfCustodyWallets: ["MetaMask (Optimism network)", "Ledger Nano X", "Rabby Wallet"],
  },
  RENDER: {
    symbol: "RENDER",
    name: "Render",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Phantom (Solana)", "Ledger Nano X", "Solflare"],
  },
  GRT: {
    symbol: "GRT",
    name: "The Graph",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "The Graph Explorer", method: "GRT Delegation", apyRange: "7–12%", apyMid: 9.5, link: "https://thegraph.com/explorer", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X"],
  },
  IMX: {
    symbol: "IMX",
    name: "Immutable",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Immutable Staking", method: "IMX Staking", apyRange: "3–6%", apyMid: 4.5, link: "https://www.immutable.com", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X"],
  },
  TON: {
    symbol: "TON",
    name: "Toncoin",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Tonkeeper", method: "TON Pool Staking", apyRange: "3–5%", apyMid: 4.0, link: "https://tonkeeper.com", custodyType: "on_chain", blockchain: "TON" },
      { platform: "MyTonWallet", method: "TON Pool Staking", apyRange: "3–5%", apyMid: 4.0, link: "https://mytonwallet.io", custodyType: "on_chain", blockchain: "TON" },
    ],
    selfCustodyWallets: ["Tonkeeper", "MyTonWallet", "Ledger Nano X"],
  },
  SHIB: {
    symbol: "SHIB",
    name: "Shiba Inu",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "ShibaSwap", method: "BONE Staking / Bury SHIB", apyRange: "1–3%", apyMid: 2.0, link: "https://shibaswap.com/#/bury", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "Coinbase Wallet"],
  },
  PEPE: {
    symbol: "PEPE",
    name: "Pepe",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "Coinbase Wallet"],
  },
  BONK: {
    symbol: "BONK",
    name: "Bonk",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Phantom (Solana)", "Solflare", "Ledger Nano X"],
  },
  ONDO: {
    symbol: "ONDO",
    name: "Ondo Finance",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask", "Ledger Nano X"],
  },
  TIA: {
    symbol: "TIA",
    name: "Celestia",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Keplr Wallet", method: "Validator Delegation", apyRange: "12–16%", apyMid: 14.0, link: "https://wallet.keplr.app/chains/celestia", custodyType: "on_chain", blockchain: "Celestia" },
      { platform: "Leap Wallet", method: "Validator Delegation", apyRange: "12–16%", apyMid: 14.0, link: "https://cosmos.leapwallet.io/chains/celestia", custodyType: "on_chain", blockchain: "Celestia" },
    ],
    selfCustodyWallets: ["Keplr", "Leap Wallet", "Ledger Nano X"],
  },
  DYDX: {
    symbol: "DYDX",
    name: "dYdX",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Keplr Wallet", method: "Validator Delegation", apyRange: "15–20%", apyMid: 17.5, link: "https://wallet.keplr.app/chains/dydx", custodyType: "on_chain", blockchain: "dYdX Chain" },
    ],
    selfCustodyWallets: ["Keplr", "Leap Wallet", "Ledger Nano X"],
  },
  JUP: {
    symbol: "JUP",
    name: "Jupiter",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Jupiter Vote", method: "JUP Staking (Active Staking Rewards)", apyRange: "3–8%", apyMid: 5.5, link: "https://vote.jup.ag", custodyType: "on_chain", blockchain: "Solana" },
    ],
    selfCustodyWallets: ["Phantom", "Solflare", "Ledger Nano X"],
  },
  PYTH: {
    symbol: "PYTH",
    name: "Pyth Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Pyth Staking Portal", method: "PYTH Governance Staking", apyRange: "5–10%", apyMid: 7.5, link: "https://staking.pyth.network", custodyType: "on_chain", blockchain: "Solana" },
    ],
    selfCustodyWallets: ["Phantom", "Solflare", "Ledger Nano X"],
  },
  STX: {
    symbol: "STX",
    name: "Stacks",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Leather Wallet (Hiro)", method: "STX Stacking", apyRange: "7–11%", apyMid: 9.0, link: "https://leather.io", custodyType: "on_chain", blockchain: "Stacks" },
      { platform: "Xverse Wallet", method: "STX Stacking", apyRange: "7–11%", apyMid: 9.0, link: "https://www.xverse.app", custodyType: "on_chain", blockchain: "Stacks" },
    ],
    selfCustodyWallets: ["Leather (Hiro) Wallet", "Xverse Wallet", "Ledger Nano X"],
  },
  ICP: {
    symbol: "ICP",
    name: "Internet Computer",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "NNS dApp", method: "Neuron Staking (8-year max lock)", apyRange: "8–15%", apyMid: 11.5, link: "https://nns.ic0.app", custodyType: "on_chain", blockchain: "Internet Computer" },
    ],
    selfCustodyWallets: ["NNS dApp (Internet Identity)", "Plug Wallet", "Ledger Nano X"],
  },
  BCH: {
    symbol: "BCH",
    name: "Bitcoin Cash",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Electron Cash", "Ledger Nano X", "Trezor", "ELLIPAL"],
  },
  ETC: {
    symbol: "ETC",
    name: "Ethereum Classic",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask (ETC network)", "Ledger Nano X", "Trezor", "Trust Wallet"],
  },
  XMR: {
    symbol: "XMR",
    name: "Monero",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["Monero GUI Wallet", "Cake Wallet", "Feather Wallet", "Ledger Nano X"],
  },
  CRO: {
    symbol: "CRO",
    name: "Cronos",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Crypto.com DeFi Wallet", method: "CRO Validator Delegation", apyRange: "8–12%", apyMid: 10.0, link: "https://crypto.com", custodyType: "on_chain", blockchain: "Cronos" },
      { platform: "Keplr Wallet", method: "CRO Validator Delegation", apyRange: "8–12%", apyMid: 10.0, link: "https://wallet.keplr.app/chains/crypto-org", custodyType: "on_chain", blockchain: "Cronos" },
    ],
    selfCustodyWallets: ["Crypto.com DeFi Wallet", "Keplr", "Ledger Nano X"],
  },
  SAND: {
    symbol: "SAND",
    name: "The Sandbox",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "The Sandbox Staking", method: "SAND Staking", apyRange: "5–10%", apyMid: 7.5, link: "https://www.sandbox.game/staking", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X"],
  },
  MANA: {
    symbol: "MANA",
    name: "Decentraland",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "Coinbase Wallet"],
  },
  AXS: {
    symbol: "AXS",
    name: "Axie Infinity",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Axie Infinity Staking", method: "AXS Staking Dashboard", apyRange: "30–50%", apyMid: 40.0, link: "https://stake.axieinfinity.com", custodyType: "on_chain", blockchain: "Ronin" },
    ],
    selfCustodyWallets: ["Ronin Wallet", "Ledger Nano X (via Ronin)"],
  },
  GALA: {
    symbol: "GALA",
    name: "Gala Games",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Gala Games Node", method: "GALA Node License", apyRange: "5–15%", apyMid: 10.0, link: "https://app.gala.games", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "Trust Wallet"],
  },
  LEO: {
    symbol: "LEO",
    name: "UNUS SED LEO",
    stakeable: false,
    withdrawable: true,
    warnings: ["LEO is primarily used on Bitfinex — limited self-custody utility"],
    selfCustodyWallets: ["MetaMask (ERC-20)", "Ledger Nano X"],
  },
  LDO: {
    symbol: "LDO",
    name: "Lido DAO",
    stakeable: false,
    withdrawable: true,
    defiAlternatives: [
      { tradFiProduct: "Hold Only", tradFiApy: "0%", defiProtocol: "Lido stETH (stake ETH)", defiApy: "3.5%", defiApyMid: 3.5, riskLevel: "Low", link: "https://stake.lido.fi", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X"],
  },
  FTM: {
    symbol: "FTM",
    name: "Fantom",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "fWallet", method: "Validator Delegation", apyRange: "4–7%", apyMid: 5.5, link: "https://pwawallet.fantom.network", custodyType: "on_chain", blockchain: "Fantom" },
    ],
    selfCustodyWallets: ["fWallet", "MetaMask (Fantom network)", "Ledger Nano X"],
  },
  RUNE: {
    symbol: "RUNE",
    name: "THORChain",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "THORChain App", method: "LP / Savers Vault", apyRange: "5–15%", apyMid: 10.0, link: "https://app.thorswap.finance", custodyType: "on_chain", blockchain: "THORChain" },
    ],
    selfCustodyWallets: ["THORSwap (connect any wallet)", "Ledger Nano X", "XDEFI Wallet"],
  },
  ENS: {
    symbol: "ENS",
    name: "Ethereum Name Service",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask", "Ledger Nano X", "Rainbow Wallet"],
  },
  QNT: {
    symbol: "QNT",
    name: "Quant",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask (ERC-20)", "Ledger Nano X", "Trezor"],
  },
  FLOW: {
    symbol: "FLOW",
    name: "Flow",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Flow Port", method: "FLOW Delegation", apyRange: "8–12%", apyMid: 10.0, link: "https://port.onflow.org", custodyType: "on_chain", blockchain: "Flow" },
    ],
    selfCustodyWallets: ["Flow Wallet (Lilico)", "Ledger Nano X"],
  },
  XTZ: {
    symbol: "XTZ",
    name: "Tezos",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Temple Wallet", method: "Baker Delegation", apyRange: "5–7%", apyMid: 6.0, link: "https://templewallet.com", custodyType: "on_chain", blockchain: "Tezos" },
      { platform: "Ledger Live", method: "Baker Delegation", apyRange: "5–7%", apyMid: 6.0, link: "https://www.ledger.com/staking-tezos", custodyType: "on_chain", blockchain: "Tezos" },
    ],
    selfCustodyWallets: ["Temple Wallet", "Kukai Wallet", "Ledger Nano X"],
  },
  KAVA: {
    symbol: "KAVA",
    name: "Kava",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Keplr Wallet", method: "Validator Delegation", apyRange: "10–15%", apyMid: 12.5, link: "https://wallet.keplr.app/chains/kava", custodyType: "on_chain", blockchain: "Kava" },
    ],
    selfCustodyWallets: ["Keplr", "Leap Wallet", "Ledger Nano X"],
  },
  OSMO: {
    symbol: "OSMO",
    name: "Osmosis",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Keplr Wallet", method: "Validator Delegation", apyRange: "8–12%", apyMid: 10.0, link: "https://wallet.keplr.app/chains/osmosis", custodyType: "on_chain", blockchain: "Osmosis" },
      { platform: "Osmosis DEX", method: "LP + Superfluid Staking", apyRange: "10–30%", apyMid: 20.0, link: "https://app.osmosis.zone", custodyType: "on_chain", blockchain: "Osmosis" },
    ],
    selfCustodyWallets: ["Keplr", "Leap Wallet", "Ledger Nano X"],
  },
  AKT: {
    symbol: "AKT",
    name: "Akash Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Keplr Wallet", method: "Validator Delegation", apyRange: "15–20%", apyMid: 17.5, link: "https://wallet.keplr.app/chains/akash", custodyType: "on_chain", blockchain: "Akash" },
    ],
    selfCustodyWallets: ["Keplr", "Leap Wallet", "Ledger Nano X"],
  },
  CKB: {
    symbol: "CKB",
    name: "Nervos Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Neuron Wallet", method: "CKB DAO Deposit", apyRange: "2–4%", apyMid: 3.0, link: "https://www.nervos.org/wallets", custodyType: "on_chain", blockchain: "Nervos" },
    ],
    selfCustodyWallets: ["Neuron Wallet", "JoyID Wallet", "Ledger Nano X"],
  },
  PENDLE: {
    symbol: "PENDLE",
    name: "Pendle",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Pendle Finance", method: "vePENDLE Staking", apyRange: "10–30%", apyMid: 20.0, link: "https://app.pendle.finance/vependle", custodyType: "on_chain", blockchain: "Ethereum / Arbitrum" },
    ],
    selfCustodyWallets: ["MetaMask", "Rabby Wallet", "Ledger Nano X"],
  },
  W: {
    symbol: "W",
    name: "Wormhole",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Wormhole Staking", method: "W Token Staking", apyRange: "5–10%", apyMid: 7.5, link: "https://www.wormhole.com", custodyType: "on_chain", blockchain: "Solana / EVM" },
    ],
    selfCustodyWallets: ["Phantom", "MetaMask", "Ledger Nano X"],
  },
  ENA: {
    symbol: "ENA",
    name: "Ethena",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Ethena App", method: "sENA Staking", apyRange: "10–20%", apyMid: 15.0, link: "https://app.ethena.fi", custodyType: "on_chain", blockchain: "Ethereum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X"],
  },
  WOO: {
    symbol: "WOO",
    name: "WOO Network",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "WOOFi Staking", method: "WOO Staking", apyRange: "5–15%", apyMid: 10.0, link: "https://fi.woo.org/stake", custodyType: "on_chain", blockchain: "Arbitrum" },
    ],
    selfCustodyWallets: ["MetaMask", "Ledger Nano X"],
  },
  JASMY: {
    symbol: "JASMY",
    name: "JasmyCoin",
    stakeable: false,
    withdrawable: true,
    selfCustodyWallets: ["MetaMask (ERC-20)", "Ledger Nano X", "Trust Wallet"],
  },
  CHZ: {
    symbol: "CHZ",
    name: "Chiliz",
    stakeable: true,
    withdrawable: true,
    stakingOptions: [
      { platform: "Chiliz Chain", method: "CHZ Staking", apyRange: "8–12%", apyMid: 10.0, link: "https://chiliz.com/staking", custodyType: "on_chain", blockchain: "Chiliz Chain" },
    ],
    selfCustodyWallets: ["MetaMask (Chiliz Chain)", "Ledger Nano X"],
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
      { text: "⚠️ WARNING: Some 'staking pools' listed in wallet apps (including Pera) are unverified and may be scams. Only use Algorand Governance or well-known validators." },
      { text: "Safest option: Go directly to governance.algorand.foundation → connect Pera (with Ledger) → commit your ALGO for the current governance period", link: "https://governance.algorand.foundation" },
      { text: "In Pera: tap your ALGO account → Pera will build the governance commit transaction → approve on your Ledger device" },
      { text: "With Governance, your ALGO stays in your own wallet — it should NOT be sent to another address" },
      { text: "You must vote during each governance period to earn the full reward" },
      { text: "Red flag: If any 'staking' option asks to send your ALGO to an unfamiliar address, do NOT approve it" },
    ],
    ellipal: [
      { text: "⚠️ WARNING: Some 'staking pools' in wallet apps are unverified. Only use Algorand Governance directly." },
      { text: "ELLIPAL does not support ALGO staking — use Pera Wallet paired with your Ledger if possible" },
      { text: "Go directly to governance.algorand.foundation to commit your ALGO", link: "https://governance.algorand.foundation" },
    ],
    safepal: [
      { text: "⚠️ WARNING: Some 'staking pools' in wallet DApp browsers are unverified. Only use Algorand Governance directly." },
      { text: "Go directly to governance.algorand.foundation via SafePal's DApp browser", link: "https://governance.algorand.foundation" },
      { text: "With Governance, your ALGO stays in your own wallet — it should NOT be sent to another address" },
    ],
    cypherock: [
      { text: "CypheRock does not directly support ALGO staking — use Pera Wallet with Algorand Governance", link: "https://governance.algorand.foundation" },
    ],
    arculus: [
      { text: "Arculus does not directly support ALGO staking — use Pera Wallet with Algorand Governance", link: "https://governance.algorand.foundation" },
    ],
    tronlink: [],
    xaman: [],
    metamask: [],
    stader: [],
    unknown: [
      { text: "⚠️ WARNING: Only stake ALGO through official Algorand Governance — many 'staking pools' in wallet apps are unverified" },
      { text: "Go directly to governance.algorand.foundation to commit your ALGO safely", link: "https://governance.algorand.foundation" },
      { text: "With real Governance, your ALGO stays in your wallet — if anything asks you to send ALGO to another address, do NOT approve" },
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
      { text: "ELLIPAL does not support CRO staking — use the Crypto.com DeFi Wallet or Keplr to delegate CRO", link: "https://crypto.com" },
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
  XDC: {
    ledger: [
      { text: "Connect your Ledger to the XDC Web Wallet (wallet.xdc.network) to delegate to a masternode for 8–12% APY", link: "https://wallet.xdc.network" },
    ],
    ellipal: [
      { text: "ELLIPAL is air-gapped and cannot connect to the XDC Web Wallet directly — to stake XDC, you would need to send it to an XDC Web Wallet or Ledger first" },
      { text: "Use XDC Web Wallet (supports WalletConnect, browser extension, or hardware wallet) to delegate to a masternode", link: "https://wallet.xdc.network" },
    ],
    safepal: [
      { text: "SafePal's DApp browser may support the XDC Web Wallet — try connecting via WalletConnect", link: "https://wallet.xdc.network" },
    ],
    cypherock: [
      { text: "CypheRock doesn't support XDC staking — send XDC to a Ledger or XDC Web Wallet to delegate to a masternode", link: "https://wallet.xdc.network" },
    ],
    arculus: [
      { text: "Arculus doesn't support XDC staking — send XDC to a Ledger or XDC Web Wallet to delegate to a masternode", link: "https://wallet.xdc.network" },
    ],
    xaman: [],
    tronlink: [],
    metamask: [
      { text: "Add the XDC Network RPC to MetaMask and connect to the XDC Web Wallet to delegate to a masternode", link: "https://wallet.xdc.network" },
    ],
    stader: [],
    unknown: [
      { text: "Use the XDC Web Wallet to delegate to a masternode for 8–12% APY", link: "https://wallet.xdc.network" },
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

export function getWalletTip(symbol: string, trigger: WalletTip["trigger"]): ActionItem | null {
  const knowledge = CUSTODY_KNOWLEDGE[symbol];
  if (!knowledge?.walletTips) return null;
  const tip = knowledge.walletTips.find(t => t.trigger === trigger);
  if (!tip) return null;
  return { text: tip.text, link: tip.link };
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
  notes?: string;
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
    const ecosystem = getEcosystemFallback(symbol);
    if (ecosystem && location === "exchange") {
      const actions: ActionItem[] = [
        { text: `Withdraw ${symbol} from ${provider} to your own wallet for self-custody`, custodyBadge: "on_chain" as CustodyType },
        ...ecosystem.wallets.map(w => ({
          text: `Set up ${w.name} to hold your ${symbol}`,
          link: w.link,
          custodyBadge: "on_chain" as CustodyType,
        })),
      ];
      if (ecosystem.stakeable && ecosystem.stakingNote) {
        actions.push({ text: ecosystem.stakingNote, custodyBadge: "on_chain" as CustodyType });
      }
      return {
        symbol, name: displayName, type: "move_to_cold",
        title: "Move to Self-Custody",
        description: `${symbol} is on ${provider} (custodial). Move it to your own wallet for true ownership — ${ecosystem.wallets[0].name} is the recommended option.`,
        currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
        actionItems: actions,
        custodyInfo: {
          type: "custodial" as CustodyType,
          explanation: `${provider} is custodial — move to your own wallet for true ownership`,
        },
      };
    }
    if (ecosystem && location === "cold_wallet") {
      return {
        symbol, name: displayName, type: "optimal", title: "Self-Custodied",
        description: `${symbol} is safely in your own wallet on ${provider} — you control your keys.${ecosystem.stakeable && ecosystem.stakingNote ? ` ${ecosystem.stakingNote}.` : ""}`,
        currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
        actionItems: ecosystem.stakeable && ecosystem.stakingNote
          ? [{ text: ecosystem.stakingNote, custodyBadge: "on_chain" as CustodyType }]
          : [],
      };
    }
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
      const stakingTip = getWalletTip(symbol, "staking");
      const rewardsTip = getWalletTip(symbol, "rewards");
      const items: ActionItem[] = [];
      if (bestStakingSource?.link) items.push({ text: `Earning ~${bestStaking.toFixed(1)}% APY via ${bestStakingSource.platform}`, link: bestStakingSource.link });
      if (stakingTip) items.push(stakingTip);
      if (rewardsTip) items.push(rewardsTip);
      return {
        symbol, name: displayName, type: "optimal", title: "Already Staking",
        description: `${symbol} is staked on your ${provider} wallet — safe and earning yield.`,
        currentLocation: provider, currentYield: bestStaking, bestYield: bestStaking, bestYieldSource: bestStakingSource?.platform || provider, usdValue, missedAnnual: 0,
        actionItems: items,
      };
    }

    const hasStakedOnSameWallet = stakedContext && stakedContext.stakedUsdOnSameWallet > 0;

    if (hasStakedOnSameWallet && bestSelfCustodyYield > 0) {
      const totalOnWallet = usdValue + stakedContext.stakedUsdOnSameWallet;
      const stakedPct = Math.round((stakedContext.stakedUsdOnSameWallet / totalOnWallet) * 100);
      const liquidPct = 100 - stakedPct;
      const missed = usdValue * (bestSelfCustodyYield / 100);
      const totalEarning = stakedContext.stakedUsdOnSameWallet * (bestSelfCustodyYield / 100);
      const stakingTip = getWalletTip(symbol, missed > 10 ? "unstaked" : "staking");
      let items: ActionItem[];
      if (missed > 10 && walletActions.length > 0) {
        items = [...walletActions];
      } else if (missed > 10) {
        items = [
          bestStaking > 0 ? { text: `Stake remaining via ${bestStakingSource?.platform} (${bestStakingSource?.apyRange} APY)`, link: bestStakingSource?.link } : null,
          bestDefi > 0 ? { text: `Use ${bestDefiSource?.defiProtocol} (${bestDefiSource?.defiApy} APY)`, link: bestDefiSource?.link } : null,
        ].filter(Boolean) as ActionItem[];
      } else {
        items = [];
      }
      if (stakingTip) items.push(stakingTip);
      return {
        symbol, name: displayName, type: missed > 10 ? "stake_available" : "optimal",
        title: missed > 10 ? "Partially Staked" : "Already Staking",
        description: missed > 10
          ? `${stakedPct}% of your ${symbol} on ${provider} ($${stakedContext.stakedUsdOnSameWallet.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is staked and earning ~$${totalEarning.toFixed(0)}/year. The remaining ${liquidPct}% ($${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is liquid — staking it could earn ~$${missed.toFixed(0)}/year more.`
          : `${stakedPct}% of your ${symbol} on ${provider} is staked and earning ~$${totalEarning.toFixed(0)}/year (~${bestSelfCustodyYield.toFixed(1)}% APY). Total value: $${totalOnWallet.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
        currentLocation: provider, currentYield: bestSelfCustodyYield, bestYield: bestSelfCustodyYield,
        bestYieldSource: bestStakingSource?.platform || bestSelfCustodyLabel, usdValue: totalOnWallet, missedAnnual: missed > 10 ? missed : 0,
        actionItems: items,
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
    const exchangeWithdrawal = getExchangeWithdrawalInfo(symbol, provider);
    const canWithdraw = exchangeWithdrawal ? exchangeWithdrawal.supported : knowledge.withdrawable !== false;
    const withdrawalBlockedNote = (!canWithdraw && exchangeWithdrawal?.note) ? exchangeWithdrawal.note : null;
    const withdrawalWorkaround = (!canWithdraw && exchangeWithdrawal?.workaround) ? exchangeWithdrawal.workaround : null;
    const exchangeCustodyNote = `${provider} is a custodial platform — they hold your assets on your behalf. Not your keys, not your crypto.`;

    if (bestExchangeEarnOnCurrent > 0 && bestSelfCustodyYield > 0) {
      if (bestSelfCustodyYield > bestExchangeEarnOnCurrent) {
        const missed = usdValue * ((bestSelfCustodyYield - bestExchangeEarnOnCurrent) / 100);
        const stakingLink = bestStaking >= bestDefi ? bestStakingSource?.link : bestDefiSource?.link;
        const onChainSource = bestStaking >= bestDefi ? bestStakingSource : null;
        const onChainDefi = bestDefi > bestStaking ? bestDefiSource : null;
        const onChainBlockchain = onChainSource?.blockchain || onChainDefi?.blockchain || "";
        const moveActions: (ActionItem | null)[] = canWithdraw
          ? [{ text: `Move to cold wallet and stake on-chain via ${bestSelfCustodyLabel} on ${onChainBlockchain}`, link: stakingLink, custodyBadge: "on_chain" as CustodyType }]
          : [
              { text: `⚠️ ${withdrawalBlockedNote || `${symbol} cannot be withdrawn directly from ${provider}`}` },
              withdrawalWorkaround ? { text: `Workaround: ${withdrawalWorkaround}` } : null,
            ];
        return {
          symbol, name: displayName, type: "split_strategy",
          title: "Better On-Chain Yield Available",
          description: `${provider} (custodial) offers ${bestExchangeEarnOnCurrentSource?.apyRange} APY on ${symbol}, but on-chain staking via ${bestSelfCustodyLabel} on ${onChainBlockchain} offers ${bestSelfCustodyYield.toFixed(1)}% — and you keep your keys.${!canWithdraw ? ` Note: ${provider} does not support direct ${symbol} withdrawals.` : ""}`,
          currentLocation: provider, currentYield: bestExchangeEarnOnCurrent, bestYield: bestSelfCustodyYield, bestYieldSource: bestSelfCustodyLabel, usdValue, missedAnnual: missed,
          actionItems: [
            ...moveActions,
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
      const actions: ActionItem[] = [];
      if (canWithdraw) {
        actions.push({ text: `Withdraw ${symbol} from ${provider} to your own wallet`, custodyBadge: "on_chain" });
      } else {
        actions.push({ text: `⚠️ ${withdrawalBlockedNote || `${symbol} cannot be withdrawn directly from ${provider}`}` });
        if (withdrawalWorkaround) {
          actions.push({ text: `Workaround: ${withdrawalWorkaround}` });
        }
      }
      actions.push(
        { text: `Stake on-chain via ${stakingName} on ${stakingBlockchain} for ${stakingApy} APY — you keep your keys`, link: stakingLink, custodyBadge: "on_chain" },
        { text: `Check if ${provider} offers an earn/staking program for ${symbol} — we can't detect enrollment automatically` },
      );
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
          description: `${symbol} on ${provider} (custodial) — no yield options.${withdrawalBlockedNote ? ` ${withdrawalBlockedNote}.` : " Withdrawal may not be available."}`,
          currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
          actionItems: withdrawalWorkaround
            ? [
                { text: `⚠️ ${withdrawalBlockedNote || "Direct withdrawal not supported"}` },
                { text: `Workaround: ${withdrawalWorkaround}` },
              ]
            : [],
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
            ...(knowledge.selfCustodyWallets ? walletActionItems(knowledge.selfCustodyWallets, symbol) : []),
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
        description: `${symbol} is on ${provider} (custodial) with no yield available. Moving to your cold wallet gives you full ownership — your keys, your crypto.${knowledge.selfCustodyWallets?.[0] ? ` Use ${knowledge.selfCustodyWallets[0]} to manage it.` : ""}`,
        currentLocation: provider, currentYield: 0, bestYield: 0, bestYieldSource: "", usdValue, missedAnnual: 0,
        actionItems: [
          { text: `Withdraw ${symbol} from ${provider} to your own wallet`, custodyBadge: "on_chain" as CustodyType },
          ...(knowledge.selfCustodyWallets ? walletActionItems(knowledge.selfCustodyWallets, symbol) : []),
          { text: "Self-custody protects against exchange hacks, freezes, or insolvency" },
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
