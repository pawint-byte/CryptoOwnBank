import { CUSTODY_KNOWLEDGE } from "./custody-knowledge";

export interface ColdWallet {
  id: string;
  name: string;
  type: "hardware" | "card" | "air-gapped";
  price: string;
  buyUrl: string;
  supportedChains: string[];
  features: string[];
  xrplCompatible: boolean;
  ethereumCompatible: boolean;
  stellarCompatible: boolean;
  earningOpps: { protocol: string; chain: string; apy: string; link: string }[];
  bestFor: string;
}

export const COLD_WALLETS: ColdWallet[] = [
  {
    id: "ledger-nano-x",
    name: "Ledger Nano X",
    type: "hardware",
    price: "~$149",
    buyUrl: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4",
    supportedChains: ["XRPL", "Ethereum", "Bitcoin", "Solana", "Cardano", "Polkadot", "Cosmos", "Avalanche", "Tron", "Algorand", "Stellar", "Hedera", "VeChain", "Polygon", "Arbitrum", "Optimism", "Base", "Tezos", "Litecoin", "Near", "Aptos", "Sui", "Fantom", "Cronos"],
    features: ["Bluetooth", "Pairs with Xaman", "5,500+ tokens", "Ledger Live app", "CC EAL5+ secure chip"],
    xrplCompatible: true,
    ethereumCompatible: true,
    stellarCompatible: true,
    earningOpps: [
      { protocol: "Soil Protocol (RLUSD Vaults)", chain: "XRPL", apy: "5–8%", link: "/ownbank/vaults" },
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "Ondo Finance (OUSG)", chain: "Ethereum", apy: "~4.8%", link: "/rwa-yields#protocol-ondo-ousg" },
      { protocol: "Centrifuge", chain: "Ethereum", apy: "4–10%", link: "/rwa-yields#protocol-centrifuge" },
      { protocol: "Maple Finance", chain: "Ethereum/Solana", apy: "6–12%", link: "/rwa-yields#protocol-maple" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
      { protocol: "SOL Staking (Marinade)", chain: "Solana", apy: "6.5–7.5%", link: "https://marinade.finance" },
      { protocol: "ADA Staking", chain: "Cardano", apy: "3–5%", link: "https://pool.pm" },
      { protocol: "DOT Staking", chain: "Polkadot", apy: "12–15%", link: "https://polkadot.js.org" },
    ],
    bestFor: "Best all-around — covers the most chains and earning opportunities. Pairs with Xaman for XRPL.",
  },
  {
    id: "ledger-nano-s-plus",
    name: "Ledger Nano S Plus",
    type: "hardware",
    price: "~$79",
    buyUrl: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4",
    supportedChains: ["XRPL", "Ethereum", "Bitcoin", "Solana", "Cardano", "Polkadot", "Cosmos", "Avalanche", "Tron", "Algorand", "Stellar", "Hedera", "VeChain", "Polygon", "Arbitrum", "Optimism", "Base", "Tezos", "Litecoin"],
    features: ["USB-C only (no Bluetooth)", "5,500+ tokens", "Ledger Live app", "CC EAL5+ secure chip"],
    xrplCompatible: true,
    ethereumCompatible: true,
    stellarCompatible: true,
    earningOpps: [
      { protocol: "Soil Protocol (RLUSD Vaults)", chain: "XRPL", apy: "5–8%", link: "/ownbank/vaults" },
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "Centrifuge", chain: "Ethereum", apy: "4–10%", link: "/rwa-yields#protocol-centrifuge" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
      { protocol: "ADA Staking", chain: "Cardano", apy: "3–5%", link: "https://pool.pm" },
    ],
    bestFor: "Most affordable Ledger — same chain support, no Bluetooth (USB-C only, won't pair wirelessly with Xaman).",
  },
  {
    id: "ledger-stax",
    name: "Ledger Stax",
    type: "hardware",
    price: "~$279",
    buyUrl: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4",
    supportedChains: ["XRPL", "Ethereum", "Bitcoin", "Solana", "Cardano", "Polkadot", "Cosmos", "Avalanche", "Tron", "Algorand", "Stellar", "Hedera", "Polygon", "Arbitrum", "Optimism", "Base"],
    features: ["E-ink touchscreen", "Bluetooth", "Wireless charging", "Pairs with Xaman", "5,500+ tokens", "CC EAL5+ secure chip"],
    xrplCompatible: true,
    ethereumCompatible: true,
    stellarCompatible: true,
    earningOpps: [
      { protocol: "Soil Protocol (RLUSD Vaults)", chain: "XRPL", apy: "5–8%", link: "/ownbank/vaults" },
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "Centrifuge", chain: "Ethereum", apy: "4–10%", link: "/rwa-yields#protocol-centrifuge" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
    ],
    bestFor: "Premium experience — E-ink display shows what you're signing. Same chain coverage as Nano X.",
  },
  {
    id: "ellipal-titan",
    name: "ELLIPAL Titan",
    type: "air-gapped",
    price: "~$139",
    buyUrl: "https://www.ellipal.com/?rfsn=9012773.864657d",
    supportedChains: ["XRPL", "Ethereum", "Bitcoin", "Solana", "Cardano", "Tron", "Cosmos", "Avalanche", "Polygon", "Litecoin", "VeChain"],
    features: ["100% air-gapped (no Bluetooth/USB/WiFi)", "QR code signing", "Large touchscreen", "Anti-tamper design", "10,000+ tokens"],
    xrplCompatible: true,
    ethereumCompatible: true,
    stellarCompatible: false,
    earningOpps: [
      { protocol: "Soil Protocol (RLUSD Vaults)", chain: "XRPL", apy: "5–8%", link: "/ownbank/vaults" },
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
      { protocol: "ADA Staking", chain: "Cardano", apy: "3–5%", link: "https://pool.pm" },
    ],
    bestFor: "Maximum security — fully air-gapped, never connects to any network. Uses QR codes for signing.",
  },
  {
    id: "arculus-card",
    name: "Arculus Card",
    type: "card",
    price: "~$99",
    buyUrl: "https://arculusholdingsllc.pxf.io/9VVWge",
    supportedChains: ["XRPL", "Ethereum", "Bitcoin", "Solana", "Stellar", "Polygon", "Avalanche"],
    features: ["Credit card form factor", "NFC tap to sign", "No battery needed", "Pairs with Xaman", "Water/fire resistant"],
    xrplCompatible: true,
    ethereumCompatible: true,
    stellarCompatible: true,
    earningOpps: [
      { protocol: "Soil Protocol (RLUSD Vaults)", chain: "XRPL", apy: "5–8%", link: "/ownbank/vaults" },
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "SOL Staking", chain: "Solana", apy: "6–8%", link: "https://marinade.finance" },
    ],
    bestFor: "Most portable — fits in your wallet like a credit card, tap to sign via NFC.",
  },
  {
    id: "safepal-s1",
    name: "SafePal S1",
    type: "air-gapped",
    price: "~$49",
    buyUrl: "https://www.safepal.com",
    supportedChains: ["XRPL", "Ethereum", "Bitcoin", "Solana", "Cardano", "Tron", "Polygon", "Avalanche", "BSC"],
    features: ["Air-gapped (QR codes)", "Compact design", "Self-destruct on tamper", "SafePal app", "Budget-friendly"],
    xrplCompatible: true,
    ethereumCompatible: true,
    stellarCompatible: false,
    earningOpps: [
      { protocol: "Soil Protocol (RLUSD Vaults)", chain: "XRPL", apy: "5–8%", link: "/ownbank/vaults" },
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
    ],
    bestFor: "Best budget option — air-gapped security at the lowest price point.",
  },
  {
    id: "trezor-model-t",
    name: "Trezor Model T",
    type: "hardware",
    price: "~$179",
    buyUrl: "https://trezor.io",
    supportedChains: ["Ethereum", "Bitcoin", "Cardano", "Solana", "Polygon", "Avalanche", "Tezos", "Litecoin", "Stellar"],
    features: ["Color touchscreen", "USB-C", "Trezor Suite app", "Open-source firmware", "Shamir backup"],
    xrplCompatible: false,
    ethereumCompatible: true,
    stellarCompatible: true,
    earningOpps: [
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "Centrifuge", chain: "Ethereum", apy: "4–10%", link: "/rwa-yields#protocol-centrifuge" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
      { protocol: "ADA Staking", chain: "Cardano", apy: "3–5%", link: "https://pool.pm" },
    ],
    bestFor: "Open-source security — strong for Ethereum/Bitcoin, but does NOT support XRPL.",
  },
  {
    id: "trezor-safe-3",
    name: "Trezor Safe 3",
    type: "hardware",
    price: "~$79",
    buyUrl: "https://trezor.io",
    supportedChains: ["Ethereum", "Bitcoin", "Cardano", "Solana", "Polygon", "Avalanche", "Litecoin"],
    features: ["Compact", "USB-C", "Secure Element chip", "Trezor Suite", "Open-source"],
    xrplCompatible: false,
    ethereumCompatible: true,
    stellarCompatible: false,
    earningOpps: [
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
      { protocol: "ADA Staking", chain: "Cardano", apy: "3–5%", link: "https://pool.pm" },
    ],
    bestFor: "Budget Trezor — solid Ethereum/Bitcoin option, but no XRPL support.",
  },
  {
    id: "cypherock-x1",
    name: "CypheRock X1",
    type: "hardware",
    price: "~$199",
    buyUrl: "https://cypherock.com/store/?ref=PETER.WINT",
    supportedChains: ["XRPL", "Ethereum", "Bitcoin", "Solana", "Polygon", "Avalanche", "Near", "Cosmos"],
    features: ["Seedless (no seed phrase)", "4 NFC cards + device", "Shamir Secret Sharing", "USB-C", "1,000+ tokens"],
    xrplCompatible: true,
    ethereumCompatible: true,
    stellarCompatible: false,
    earningOpps: [
      { protocol: "Soil Protocol (RLUSD Vaults)", chain: "XRPL", apy: "5–8%", link: "/ownbank/vaults" },
      { protocol: "Ondo Finance (USDY)", chain: "Ethereum", apy: "~5.2%", link: "/rwa-yields#protocol-ondo-usdy" },
      { protocol: "ETH Staking (Lido)", chain: "Ethereum", apy: "3–3.5%", link: "https://lido.fi" },
    ],
    bestFor: "No seed phrase — splits your key across 4 NFC cards so there's no single point of failure.",
  },
];

const CHAIN_ALIASES: Record<string, string[]> = {
  XRPL: ["XRP", "XRPL", "xrp", "xrpl"],
  Ethereum: ["ETH", "Ethereum", "ethereum", "LINK", "UNI", "AAVE", "MATIC", "USDC", "USDT", "USDY", "OUSG"],
  Bitcoin: ["BTC", "Bitcoin"],
  Solana: ["SOL", "Solana"],
  Cardano: ["ADA", "Cardano"],
  Polkadot: ["DOT", "Polkadot"],
  Cosmos: ["ATOM", "Cosmos"],
  Avalanche: ["AVAX", "Avalanche"],
  Tron: ["TRX", "Tron"],
  Algorand: ["ALGO", "Algorand"],
  Stellar: ["XLM", "Stellar"],
  Hedera: ["HBAR", "Hedera"],
  VeChain: ["VET", "VeChain"],
  Polygon: ["MATIC", "POL", "Polygon"],
  Tezos: ["XTZ", "Tezos"],
  Litecoin: ["LTC", "Litecoin"],
  Near: ["NEAR", "Near"],
  Aptos: ["APT", "Aptos"],
  Sui: ["SUI", "Sui"],
  Fantom: ["FTM", "Fantom"],
  Cronos: ["CRO", "Cronos"],
  Arbitrum: ["ARB", "Arbitrum"],
  Optimism: ["OP", "Optimism"],
  Base: ["Base"],
  BSC: ["BNB", "BSC"],
};

function assetToChains(symbol: string): string[] {
  const chains: string[] = [];
  for (const [chain, aliases] of Object.entries(CHAIN_ALIASES)) {
    if (aliases.some(a => a.toUpperCase() === symbol.toUpperCase())) {
      chains.push(chain);
    }
  }
  return chains;
}

export interface WalletRecommendation {
  wallet: ColdWallet;
  coveredAssets: string[];
  uncoveredAssets: string[];
  coveragePercent: number;
  missedEarnings: { protocol: string; chain: string; apy: string; link: string }[];
}

export function getWalletRecommendations(heldAssets: string[]): WalletRecommendation[] {
  if (heldAssets.length === 0) return [];

  const assetChainMap: Record<string, string[]> = {};
  for (const sym of heldAssets) {
    assetChainMap[sym] = assetToChains(sym);
  }

  return COLD_WALLETS.map(wallet => {
    const walletChainsSet = new Set(wallet.supportedChains.map(c => c.toLowerCase()));
    const covered: string[] = [];
    const uncovered: string[] = [];

    for (const sym of heldAssets) {
      const chains = assetChainMap[sym] || [];
      const isSupported = chains.some(c => walletChainsSet.has(c.toLowerCase()));
      if (isSupported) {
        covered.push(sym);
      } else {
        uncovered.push(sym);
      }
    }

    const currentChains = new Set<string>();
    for (const sym of heldAssets) {
      for (const c of assetChainMap[sym] || []) {
        currentChains.add(c.toLowerCase());
      }
    }

    const missed = wallet.earningOpps.filter(opp => {
      const oppChain = opp.chain.split("/").map(c => c.trim().toLowerCase());
      return !oppChain.some(c => currentChains.has(c));
    });

    return {
      wallet,
      coveredAssets: covered,
      uncoveredAssets: uncovered,
      coveragePercent: heldAssets.length > 0 ? Math.round((covered.length / heldAssets.length) * 100) : 0,
      missedEarnings: missed,
    };
  }).sort((a, b) => {
    if (b.coveragePercent !== a.coveragePercent) return b.coveragePercent - a.coveragePercent;
    return b.wallet.earningOpps.length - a.wallet.earningOpps.length;
  });
}

export function getQuickPicks(): { label: string; walletId: string; reason: string }[] {
  return [
    { label: "Best for XRPL", walletId: "ledger-nano-x", reason: "Bluetooth pairs directly with Xaman for seamless vault deposits" },
    { label: "Best Multi-Chain", walletId: "ledger-nano-x", reason: "Covers 24+ chains and the most earning opportunities" },
    { label: "Best Air-Gapped", walletId: "ellipal-titan", reason: "Never connects to any network — maximum isolation" },
    { label: "Best Card Form", walletId: "arculus-card", reason: "Fits in your wallet, tap to sign via NFC" },
    { label: "Most Affordable", walletId: "safepal-s1", reason: "Air-gapped security at the lowest price ($49)" },
    { label: "No Seed Phrase", walletId: "cypherock-x1", reason: "Splits key across 4 NFC cards — no single point of failure" },
  ];
}
