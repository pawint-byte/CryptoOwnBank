import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SeoHead } from "@/components/seo-head";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ShoppingCart,
  Wallet,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  Smartphone,
  Monitor,
  Shield,
  CreditCard,
  HelpCircle,
  Repeat,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Star,
  Copy,
  Plus,
} from "lucide-react";

type Step = "token" | "wallet" | "address" | "instructions";

interface TokenOption {
  symbol: string;
  name: string;
  color: string;
  featured?: boolean;
}

interface WalletOption {
  name: string;
  type: "cold" | "hot";
  onramps: string[];
  platforms: ("mobile" | "desktop" | "browser")[];
  deepLink?: string;
  downloadUrl: string;
  description: string;
  steps: string[];
}

const tokens: TokenOption[] = [
  { symbol: "XRP", name: "XRP", color: "#23292F", featured: true },
  { symbol: "XLM", name: "Stellar Lumens", color: "#7B61FF", featured: true },
  { symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  { symbol: "SOL", name: "Solana", color: "#9945FF" },
  { symbol: "ADA", name: "Cardano", color: "#0033AD" },
  { symbol: "ATOM", name: "Cosmos", color: "#2E3148" },
  { symbol: "DOT", name: "Polkadot", color: "#E6007A" },
  { symbol: "AVAX", name: "Avalanche", color: "#E84142" },
  { symbol: "MATIC", name: "Polygon", color: "#8247E5" },
  { symbol: "TRX", name: "Tron", color: "#FF0013" },
  { symbol: "DOGE", name: "Dogecoin", color: "#C2A633" },
  { symbol: "LTC", name: "Litecoin", color: "#345D9D" },
  { symbol: "HBAR", name: "Hedera", color: "#000000" },
  { symbol: "ALGO", name: "Algorand", color: "#000000" },
  { symbol: "CRO", name: "Cronos", color: "#002D74" },
];

const walletsByToken: Record<string, WalletOption[]> = {
  XRP: [
    {
      name: "Xaman (XUMM)",
      type: "hot",
      onramps: ["MoonPay", "Topper"],
      platforms: ["mobile"],
      deepLink: "xumm://",
      downloadUrl: "https://xaman.app",
      description: "The go-to XRP wallet with built-in fiat on-ramps. Buy XRP directly with your card or bank — no exchange needed.",
      steps: [
        "Download Xaman from the App Store or Google Play",
        "Create or import your XRP wallet",
        "Tap the Buy button on the home screen",
        "Choose MoonPay or Topper as your payment provider",
        "Enter the amount you want to buy and complete payment with card or bank transfer",
        "XRP arrives in your Xaman wallet within minutes",
        "Your Xaman wallet works directly with CryptoOwnBank's XRPL tools — DEX trading, DCA orders, Send & Receive, and more",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify", "Transak", "BTC Direct"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy XRP directly into cold storage. Your keys never touch the internet.",
      steps: [
        "Open Ledger Live on desktop or mobile",
        "Make sure the XRP app is installed on your Ledger device (My Ledger → install XRP app)",
        "Go to Accounts → Add Account → XRP if you haven't already",
        "Click Buy / Sell in the left menu",
        "Select XRP and choose a provider (MoonPay, Coinify, Transak, or BTC Direct)",
        "Enter the amount and complete payment with card or bank transfer",
        "XRP is sent directly to your Ledger-secured address",
        "Add this address to CryptoOwnBank under Wallets to track your balance",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: ["MoonPay", "Mercuryo", "Transak"],
      platforms: ["mobile", "browser"],
      downloadUrl: "https://trustwallet.com",
      description: "Multi-chain wallet with multiple built-in buy options.",
      steps: [
        "Download Trust Wallet from App Store or Google Play",
        "Create your wallet and back up your recovery phrase",
        "Tap the Buy button and select XRP",
        "Choose a provider (MoonPay, Mercuryo, or Transak)",
        "Enter amount and complete payment",
        "XRP arrives in your Trust Wallet",
        "Send to your preferred cold wallet or add the address to CryptoOwnBank",
      ],
    },
  ],
  XLM: [
    {
      name: "LOBSTR",
      type: "hot",
      onramps: ["MoonPay"],
      platforms: ["mobile", "desktop"],
      downloadUrl: "https://lobstr.co",
      description: "The most popular Stellar wallet with built-in MoonPay integration. Buy XLM with your card in minutes.",
      steps: [
        "Download LOBSTR from the App Store, Google Play, or use the web app",
        "Create your Stellar account",
        "Tap Buy on the home screen",
        "MoonPay opens — enter the amount and pay with card or bank transfer",
        "XLM arrives in your LOBSTR wallet",
        "Your LOBSTR wallet works with CryptoOwnBank's Stellar tools — DEX, DCA, Send, Invoices, and Remittances",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify", "Transak"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy XLM directly into cold storage via Ledger Live.",
      steps: [
        "Open Ledger Live on desktop or mobile",
        "Install the Stellar app on your Ledger device (My Ledger → install Stellar app)",
        "Go to Accounts → Add Account → Stellar",
        "Click Buy / Sell → select Stellar (XLM)",
        "Choose a provider and enter your amount",
        "Complete payment — XLM goes directly to your Ledger",
        "Add this address to CryptoOwnBank to track your balance",
      ],
    },
  ],
  ETH: [
    {
      name: "MetaMask",
      type: "hot",
      onramps: ["MoonPay", "Transak", "Banxa"],
      platforms: ["browser", "mobile"],
      downloadUrl: "https://metamask.io",
      description: "The most popular EVM wallet. Buy ETH directly in the browser extension or mobile app.",
      steps: [
        "Install MetaMask browser extension or download the mobile app",
        "Create your wallet and back up your recovery phrase",
        "Click Buy and choose a provider (MoonPay, Transak, or Banxa)",
        "Enter your amount and complete payment with card or bank transfer",
        "ETH arrives in your MetaMask wallet",
        "Connect MetaMask to CryptoOwnBank's EVM Swap to trade tokens across chains",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify", "Transak", "BTC Direct"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ETH directly into cold storage. Works with MetaMask too.",
      steps: [
        "Open Ledger Live → Buy / Sell → select Ethereum",
        "Choose a provider and enter your amount",
        "Complete payment — ETH goes to your Ledger address",
        "You can also connect your Ledger to MetaMask for DeFi access while keeping keys on the device",
      ],
    },
  ],
  BTC: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify", "Transak", "BTC Direct"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "The safest way to buy and hold Bitcoin. Buy directly into cold storage.",
      steps: [
        "Open Ledger Live → install the Bitcoin app on your Ledger",
        "Add a Bitcoin account if you haven't already",
        "Click Buy / Sell → select Bitcoin",
        "Choose a provider and enter your amount",
        "Complete payment — BTC goes directly to your Ledger",
        "Add your BTC address to CryptoOwnBank to track your balance alongside your other assets",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: ["MoonPay", "Mercuryo", "Transak"],
      platforms: ["mobile"],
      downloadUrl: "https://trustwallet.com",
      description: "Buy Bitcoin on mobile with multiple on-ramp providers.",
      steps: [
        "Download Trust Wallet → tap Buy → select Bitcoin",
        "Choose a provider and enter your amount",
        "Complete payment — BTC arrives in Trust Wallet",
        "For long-term holding, consider transferring to a Ledger for cold storage security",
      ],
    },
  ],
  SOL: [
    {
      name: "Phantom",
      type: "hot",
      onramps: ["MoonPay", "Coinbase Pay"],
      platforms: ["browser", "mobile"],
      downloadUrl: "https://phantom.app",
      description: "The go-to Solana wallet with built-in buying via MoonPay.",
      steps: [
        "Install Phantom browser extension or download the mobile app",
        "Create your wallet and back up your recovery phrase",
        "Tap Buy → choose MoonPay or Coinbase Pay",
        "Enter your amount and complete payment",
        "SOL arrives in your Phantom wallet",
        "Add your Solana address to CryptoOwnBank to track staking and balances",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify", "Transak"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy SOL into cold storage via Ledger Live.",
      steps: [
        "Open Ledger Live → install the Solana app → Add Account → Solana",
        "Click Buy / Sell → select Solana",
        "Choose a provider, enter your amount, complete payment",
        "SOL goes directly to your Ledger — stake via Phantom connected to Ledger for best security",
      ],
    },
  ],
  ADA: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify", "Transak"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ADA into cold storage. Stake directly through AdaLite connected to your Ledger.",
      steps: [
        "Open Ledger Live → install the Cardano app → Add Account → Cardano",
        "Click Buy / Sell → select Cardano (ADA)",
        "Choose a provider, enter your amount, complete payment",
        "ADA goes to your Ledger — stake through AdaLite (adalite.io) connected to your Ledger for best security",
        "See our Native Staking guide for step-by-step Cardano staking instructions",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: ["MoonPay", "Mercuryo"],
      platforms: ["mobile"],
      downloadUrl: "https://trustwallet.com",
      description: "Buy ADA on mobile and stake from the app.",
      steps: [
        "Download Trust Wallet → tap Buy → select Cardano (ADA)",
        "Choose a provider, enter your amount, complete payment",
        "ADA arrives in Trust Wallet — you can stake from within the app",
      ],
    },
  ],
  ATOM: [
    {
      name: "Keplr",
      type: "hot",
      onramps: ["Transak"],
      platforms: ["browser", "mobile"],
      downloadUrl: "https://www.keplr.app",
      description: "The standard Cosmos wallet with Transak buy integration and built-in staking.",
      steps: [
        "Install Keplr browser extension or download the mobile app",
        "Create your wallet and back up your recovery phrase",
        "Use the Buy feature (Transak) to purchase ATOM with card",
        "ATOM arrives in Keplr — stake directly in the app to earn 15–20% APR",
        "Add your Cosmos address to CryptoOwnBank to track staking rewards",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ATOM into cold storage. Stake through Keplr connected to Ledger.",
      steps: [
        "Open Ledger Live → install the Cosmos app → Add Account → Cosmos",
        "Click Buy / Sell → select Cosmos (ATOM)",
        "Choose a provider, enter your amount, complete payment",
        "ATOM goes to your Ledger — connect Keplr to your Ledger for staking with hardware security",
      ],
    },
  ],
  DOT: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify", "Transak"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy DOT into cold storage. Stake through Nova Wallet connected to Ledger.",
      steps: [
        "Open Ledger Live → install the Polkadot app → Add Account → Polkadot",
        "Click Buy / Sell → select Polkadot (DOT)",
        "Choose a provider, enter your amount, complete payment",
        "DOT goes to your Ledger — stake through Nova Wallet or Polkadot.js for best security",
        "See our Native Staking guide for step-by-step Polkadot staking instructions",
      ],
    },
  ],
  AVAX: [
    {
      name: "MetaMask",
      type: "hot",
      onramps: ["MoonPay", "Transak"],
      platforms: ["browser", "mobile"],
      downloadUrl: "https://metamask.io",
      description: "Buy AVAX in MetaMask (add Avalanche C-Chain network).",
      steps: [
        "Install MetaMask → add Avalanche C-Chain network",
        "Click Buy → choose MoonPay or Transak → select AVAX",
        "Enter your amount and complete payment",
        "AVAX arrives in MetaMask on the Avalanche network",
        "Use CryptoOwnBank's EVM Swap to trade AVAX for other tokens",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy AVAX into cold storage.",
      steps: [
        "Open Ledger Live → install the Avalanche app → Add Account",
        "Click Buy / Sell → select Avalanche (AVAX)",
        "Choose a provider, enter your amount, complete payment",
      ],
    },
  ],
  MATIC: [
    {
      name: "MetaMask",
      type: "hot",
      onramps: ["MoonPay", "Transak", "Banxa"],
      platforms: ["browser", "mobile"],
      downloadUrl: "https://metamask.io",
      description: "Buy MATIC/POL in MetaMask on Polygon network.",
      steps: [
        "Install MetaMask → add Polygon network",
        "Click Buy → choose a provider → select MATIC",
        "Enter your amount and complete payment",
        "MATIC arrives in MetaMask on Polygon — use CryptoOwnBank's EVM Swap for trading",
      ],
    },
  ],
  TRX: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy TRX into cold storage via Ledger Live.",
      steps: [
        "Open Ledger Live → install the Tron app → Add Account → Tron",
        "Click Buy / Sell → select Tron (TRX)",
        "Choose a provider, enter your amount, complete payment",
        "TRX goes to your Ledger — stake for energy/bandwidth through TronLink connected to Ledger",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: ["MoonPay", "Mercuryo"],
      platforms: ["mobile"],
      downloadUrl: "https://trustwallet.com",
      description: "Buy TRX on mobile and stake from the app.",
      steps: [
        "Download Trust Wallet → tap Buy → select Tron (TRX)",
        "Choose a provider, enter your amount, complete payment",
        "TRX arrives in Trust Wallet — freeze/stake from the app",
      ],
    },
  ],
  DOGE: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy DOGE into cold storage.",
      steps: [
        "Open Ledger Live → install the Dogecoin app → Add Account → Dogecoin",
        "Click Buy / Sell → select Dogecoin",
        "Choose a provider, enter your amount, complete payment",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: ["MoonPay", "Mercuryo"],
      platforms: ["mobile"],
      downloadUrl: "https://trustwallet.com",
      description: "Buy DOGE on mobile.",
      steps: [
        "Download Trust Wallet → tap Buy → select Dogecoin",
        "Choose a provider, enter your amount, complete payment",
      ],
    },
  ],
  LTC: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy LTC into cold storage.",
      steps: [
        "Open Ledger Live → install the Litecoin app → Add Account → Litecoin",
        "Click Buy / Sell → select Litecoin",
        "Choose a provider, enter your amount, complete payment",
      ],
    },
  ],
  HBAR: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy HBAR into cold storage via Ledger Live.",
      steps: [
        "Open Ledger Live → install the Hedera app → Add Account → Hedera",
        "Click Buy / Sell → select Hedera (HBAR)",
        "Choose MoonPay, enter your amount, complete payment",
      ],
    },
  ],
  ALGO: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay", "Coinify"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ALGO into cold storage via Ledger Live.",
      steps: [
        "Open Ledger Live → install the Algorand app → Add Account → Algorand",
        "Click Buy / Sell → select Algorand (ALGO)",
        "Choose a provider, enter your amount, complete payment",
      ],
    },
  ],
  CRO: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: ["MoonPay"],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy CRO into cold storage via Ledger Live.",
      steps: [
        "Open Ledger Live → install the Cronos app → Add Account → Cronos",
        "Click Buy / Sell → select Cronos (CRO)",
        "Choose MoonPay, enter your amount, complete payment",
      ],
    },
  ],
};

function getNextStepLink(token: string): { label: string; url: string } | null {
  switch (token) {
    case "XRP":
      return { label: "Explore XRPL Tools", url: "/ownbank" };
    case "XLM":
      return { label: "Explore Stellar Tools", url: "/stellar/wallet" };
    case "ETH":
    case "AVAX":
    case "MATIC":
      return { label: "Open EVM Swap", url: "/ownbank/evm-swap" };
    case "ADA":
    case "DOT":
    case "SOL":
    case "ATOM":
      return { label: "View Native Staking", url: "/native-staking" };
    default:
      return { label: "View Portfolio", url: "/portfolio" };
  }
}

const tokenToChain: Record<string, string> = {
  XRP: "xrp",
  XLM: "stellar",
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  ADA: "cardano",
  ATOM: "cosmos",
  DOT: "polkadot",
  AVAX: "avalanche",
  MATIC: "polygon",
  TRX: "tron",
  DOGE: "dogecoin",
  LTC: "litecoin",
  HBAR: "hedera",
  ALGO: "algorand",
  CRO: "cronos",
  FLR: "flare",
};

const walletNameToKey: Record<string, string> = {
  "Xaman (XUMM)": "xaman",
  "CypheRock X1": "cypherock",
  "Arculus Card": "arculus",
  "SafePal S1 Pro": "safepal",
  "Ellipal Titan": "ellipal",
  "Ledger (via Ledger Live)": "ledger",
  "Trust Wallet": "trust",
  "MetaMask": "metamask",
  "Phantom": "phantom",
  "Keplr": "keplr",
  "LOBSTR": "lobstr",
};

function detectUserWallets(walletRecords: any[]): Set<string> {
  const detected = new Set<string>();
  if (!walletRecords?.length) return detected;

  for (const w of walletRecords) {
    const label = (w.label || "").toLowerCase();
    const notes = (w.notes || "").toLowerCase();
    const combined = `${label} ${notes}`;

    if (combined.includes("ledger") || combined.includes("nano")) detected.add("ledger");
    if (combined.includes("xaman") || combined.includes("xumm") || combined.includes("deathkeeper")) detected.add("xaman");
    if (combined.includes("lobstr")) detected.add("lobstr");
    if (combined.includes("metamask")) detected.add("metamask");
    if (combined.includes("phantom")) detected.add("phantom");
    if (combined.includes("keplr")) detected.add("keplr");
    if (combined.includes("trust")) detected.add("trust");
    if (combined.includes("arculus")) detected.add("arculus");
    if (combined.includes("safepal")) detected.add("safepal");
    if (combined.includes("ellipal")) detected.add("ellipal");
    if (combined.includes("cypherock")) detected.add("cypherock");

    const chain = (w.chain || "").toLowerCase();
    if (chain === "xrpl" || chain === "xrp") detected.add("xaman");
    if (chain === "stellar" || chain === "xlm") detected.add("lobstr");
    if (chain === "ethereum" || chain === "eth" || chain === "erc20") detected.add("metamask");
    if (chain === "solana" || chain === "sol") detected.add("phantom");
    if (chain === "cosmos" || chain === "atom") detected.add("keplr");
  }
  return detected;
}

const chainAliasMap: Record<string, string> = {
  xrpl: "XRP", xrp: "XRP",
  stellar: "XLM", xlm: "XLM",
  ethereum: "ETH", eth: "ETH", erc20: "ETH",
  bitcoin: "BTC", btc: "BTC",
  solana: "SOL", sol: "SOL",
  cardano: "ADA", ada: "ADA",
  cosmos: "ATOM", atom: "ATOM",
  polkadot: "DOT", dot: "DOT",
  avalanche: "AVAX", avax: "AVAX",
  polygon: "MATIC", matic: "MATIC",
  flare: "FLR", flr: "FLR",
  tron: "TRX", trx: "TRX",
  cronos: "CRO", cro: "CRO",
  hedera: "HBAR", hbar: "HBAR",
  algorand: "ALGO", algo: "ALGO",
  near: "NEAR",
  dogecoin: "DOGE", doge: "DOGE",
  litecoin: "LTC", ltc: "LTC",
};

function detectUserChains(walletRecords: any[]): Set<string> {
  const chains = new Set<string>();
  if (!walletRecords?.length) return chains;

  for (const w of walletRecords) {
    const chain = (w.chain || "").toLowerCase();
    const label = (w.label || "").toLowerCase();
    const combined = `${chain} ${label}`;

    if (chainAliasMap[chain]) {
      chains.add(chainAliasMap[chain]);
    }

    for (const [key, symbol] of Object.entries(chainAliasMap)) {
      if (combined.includes(key)) chains.add(symbol);
    }
  }
  return chains;
}

export default function BuyCrypto() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("token");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const { data: savedWallets = [] } = useQuery<any[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const userWallets = useMemo(() => detectUserWallets(savedWallets), [savedWallets]);
  const userChains = useMemo(() => detectUserChains(savedWallets), [savedWallets]);
  const hasAnyWallets = userWallets.size > 0;

  const savedAddressForToken = useMemo(() => {
    if (!selectedToken) return null;
    const chain = tokenToChain[selectedToken];
    if (!chain) return null;
    return savedWallets.find((w: any) => w.chain === chain) || null;
  }, [selectedToken, savedWallets]);

  const availableWallets = useMemo(() => {
    if (!selectedToken) return [];
    const wallets = walletsByToken[selectedToken] || [];
    const sorted = [...wallets].sort((a, b) => {
      const aKey = walletNameToKey[a.name] || "";
      const bKey = walletNameToKey[b.name] || "";
      const aOwned = userWallets.has(aKey) ? 1 : 0;
      const bOwned = userWallets.has(bKey) ? 1 : 0;
      return bOwned - aOwned;
    });
    return sorted;
  }, [selectedToken, userWallets]);

  const addWalletMutation = useMutation({
    mutationFn: async (data: { chain: string; address: string; label: string }) => {
      const res = await apiRequest("POST", "/api/wallets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Address saved!", description: "Your wallet address has been saved to your profile. It's ready for all future purchases." });
      setNewAddress("");
      setNewLabel("");
      setStep("instructions");
    },
    onError: (err: any) => {
      toast({ title: "Could not save address", description: err.message || "Please try again.", variant: "destructive" });
    },
  });

  function handleTokenSelect(symbol: string) {
    setSelectedToken(symbol);
    setSelectedWallet(null);
    setNewAddress("");
    setNewLabel("");
    const wallets = walletsByToken[symbol];
    if (wallets && wallets.length === 1) {
      setSelectedWallet(wallets[0]);
      setStep("address");
    } else {
      setStep("wallet");
    }
  }

  function handleWalletSelect(wallet: WalletOption) {
    setSelectedWallet(wallet);
    setStep("address");
  }

  function handleBack() {
    if (step === "instructions") {
      setStep("address");
    } else if (step === "address") {
      const wallets = selectedToken ? walletsByToken[selectedToken] || [] : [];
      if (wallets.length === 1) {
        setStep("token");
        setSelectedToken(null);
        setSelectedWallet(null);
      } else {
        setStep("wallet");
        setSelectedWallet(null);
      }
    } else if (step === "wallet") {
      setStep("token");
      setSelectedToken(null);
    }
  }

  function handleStartOver() {
    setStep("token");
    setSelectedToken(null);
    setSelectedWallet(null);
    setNewAddress("");
    setNewLabel("");
  }

  function handleSaveAddress() {
    if (!selectedToken || !newAddress.trim()) return;
    const chain = tokenToChain[selectedToken];
    if (!chain) return;
    addWalletMutation.mutate({
      chain,
      address: newAddress.trim(),
      label: newLabel.trim() || `${selectedToken} wallet`,
    });
  }

  const tokenData = tokens.find((t) => t.symbol === selectedToken);
  const nextStep = selectedToken ? getNextStepLink(selectedToken) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <SeoHead
        title="Buy Crypto | CryptoOwnBank"
        description="Step-by-step guide to buying crypto with your card or bank account. Buy XRP, XLM, ETH, BTC, SOL, and more through trusted wallets with built-in on-ramps."
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-buy-crypto">
            <ShoppingCart className="h-6 w-6 text-green-600" />
            Buy Crypto
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Buy crypto with your card or bank account — we'll guide you to the right wallet and on-ramp
          </p>
        </div>
        {step !== "token" && (
          <Button variant="outline" size="sm" onClick={handleStartOver} data-testid="button-start-over">
            Start Over
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Badge variant={step === "token" ? "default" : "outline"} className="gap-1">
          1. Choose Token
        </Badge>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant={step === "wallet" ? "default" : "outline"} className="gap-1">
          2. Pick Wallet
        </Badge>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant={step === "address" ? "default" : "outline"} className="gap-1">
          3. Save Address
        </Badge>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant={step === "instructions" ? "default" : "outline"} className="gap-1">
          4. Buy
        </Badge>
      </div>

      {step === "token" && (
        <div className="space-y-4">
          {hasAnyWallets && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <strong>Welcome back!</strong> We detected wallets on your account —{" "}
                    {Array.from(userWallets).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(", ")}.
                    {" "}Wallets you already have will be highlighted as recommended options.
                    {userChains.size > 0 && (
                      <span> You already hold: {Array.from(userChains).join(", ")}.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What do you want to buy?</CardTitle>
              <CardDescription>Select the cryptocurrency you want to purchase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tokens.filter((t) => t.featured).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Featured</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {tokens
                        .filter((t) => t.featured)
                        .map((token) => (
                          <Button
                            key={token.symbol}
                            variant="outline"
                            className={`h-16 flex flex-col gap-1 border-2 hover:border-green-500 transition-colors relative ${userChains.has(token.symbol) ? "border-green-500/50 bg-green-500/5" : ""}`}
                            onClick={() => handleTokenSelect(token.symbol)}
                            data-testid={`button-token-${token.symbol.toLowerCase()}`}
                          >
                            {userChains.has(token.symbol) && (
                              <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-medium">You hold</span>
                            )}
                            <span className="font-bold text-base">{token.symbol}</span>
                            <span className="text-xs text-muted-foreground">{token.name}</span>
                          </Button>
                        ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">All tokens</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {tokens
                      .filter((t) => !t.featured)
                      .map((token) => (
                        <Button
                          key={token.symbol}
                          variant="outline"
                          className={`h-14 flex flex-col gap-0.5 hover:border-green-500 transition-colors relative ${userChains.has(token.symbol) ? "border-green-500/50 bg-green-500/5" : ""}`}
                          onClick={() => handleTokenSelect(token.symbol)}
                          data-testid={`button-token-${token.symbol.toLowerCase()}`}
                        >
                          {userChains.has(token.symbol) && (
                            <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-[7px] px-1 py-0.5 rounded-full font-medium whitespace-nowrap">You hold</span>
                          )}
                          <span className="font-bold text-sm">{token.symbol}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">{token.name}</span>
                        </Button>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Don't see your token?</strong> Most tokens can be purchased through{" "}
                <a href="https://www.ledger.com/ledger-live" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Ledger Live
                </a>{" "}
                (supports 500+ assets) or bought on an exchange like Coinbase or Kraken and transferred to your wallet.
                You can also buy a major token and use our{" "}
                <Link href="/ownbank/cross-chain" className="text-blue-600 hover:underline">
                  Cross-Chain Swap
                </Link>{" "}
                to convert it.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "wallet" && selectedToken && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How do you want to buy {selectedToken}?</CardTitle>
              <CardDescription>
                Choose the wallet you already have — or pick one to get started. Each has a built-in way to buy with your card or bank account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableWallets.map((wallet) => {
                const wKey = walletNameToKey[wallet.name] || "";
                const isOwned = userWallets.has(wKey);
                return (
                <button
                  key={wallet.name}
                  className={`w-full text-left rounded-lg border p-4 hover:border-green-500 transition-colors space-y-2 bg-background ${isOwned ? "border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20" : ""}`}
                  onClick={() => handleWalletSelect(wallet)}
                  data-testid={`button-wallet-${wallet.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {wallet.type === "cold" ? (
                        <Shield className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Wallet className="h-5 w-5 text-green-600" />
                      )}
                      <span className="font-semibold">{wallet.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {wallet.type === "cold" ? "Cold Storage" : "Hot Wallet"}
                      </Badge>
                      {isOwned && (
                        <Badge className="bg-green-600 text-white text-[10px]">
                          You have this
                        </Badge>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{wallet.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Buy via:</span>
                    {wallet.onramps.map((ramp) => (
                      <Badge key={ramp} variant="secondary" className="text-[10px]">
                        {ramp}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">|</span>
                    {wallet.platforms.map((p) => (
                      <span key={p} className="text-xs text-muted-foreground flex items-center gap-0.5">
                        {p === "mobile" && <Smartphone className="h-3 w-3" />}
                        {p === "desktop" && <Monitor className="h-3 w-3" />}
                        {p === "browser" && <Monitor className="h-3 w-3" />}
                        {p}
                      </span>
                    ))}
                  </div>
                </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {step === "address" && selectedToken && selectedWallet && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back-address">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {savedAddressForToken ? (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Your {selectedToken} Address Is Ready
                </CardTitle>
                <CardDescription>
                  You already have a {tokenData?.name || selectedToken} address saved. Tokens you buy will arrive at this address automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{savedAddressForToken.label || "Wallet"}</p>
                    <p className="text-sm font-mono truncate" data-testid="text-saved-address">{savedAddressForToken.address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(savedAddressForToken.address);
                      toast({ title: "Copied!", description: "Address copied to clipboard." });
                    }}
                    data-testid="button-copy-address"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set up once, works forever — any time you buy {selectedToken}, it arrives at this address. You can also share this address with anyone who wants to send you {selectedToken}.
                </p>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 gap-2"
                  onClick={() => setStep("instructions")}
                  data-testid="button-continue-to-buy"
                >
                  Continue to Buy Instructions <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : user ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Save Your {selectedToken} Address
                </CardTitle>
                <CardDescription>
                  Before you buy, save your {tokenData?.name || selectedToken} receive address here. Set it up once and it works forever — every future purchase lands at this address automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-2">How to find your address:</p>
                    <ol className="text-sm text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">1</span>
                        Open <strong>{selectedWallet.name}</strong> on your phone or computer
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">2</span>
                        Tap <strong>Receive</strong> (or <strong>Deposit</strong>) for {selectedToken}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">3</span>
                        Copy the address shown (it's your public receive address — safe to share)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">4</span>
                        Paste it below and save — you only need to do this once
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Your {selectedToken} Address</label>
                    <Input
                      placeholder={`Paste your ${selectedToken} receive address here`}
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="font-mono text-sm"
                      data-testid="input-wallet-address"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Label (optional)</label>
                    <Input
                      placeholder={`e.g., My ${selectedWallet.name} ${selectedToken}`}
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      data-testid="input-wallet-label"
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 gap-2"
                    disabled={!newAddress.trim() || addWalletMutation.isPending}
                    onClick={handleSaveAddress}
                    data-testid="button-save-address"
                  >
                    {addWalletMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Save Address & Continue
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-t pt-3">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setStep("instructions")}
                    data-testid="button-skip-address"
                  >
                    Skip for now — I'll add my address later
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Sign in to save your {selectedToken} address to your profile. Once saved, we'll automatically track your balance whenever you buy.
                </p>
                <Button
                  className="w-full"
                  onClick={() => setStep("instructions")}
                  data-testid="button-continue-no-auth"
                >
                  Continue to Buy Instructions <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === "instructions" && selectedToken && selectedWallet && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back-instructions">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <Card className="border-green-500/20">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    Buy {selectedToken} with {selectedWallet.name}
                  </CardTitle>
                  <CardDescription>{selectedWallet.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedWallet.type === "cold" ? "Cold Storage" : "Hot Wallet"}
                  </Badge>
                  {selectedWallet.onramps.map((ramp) => (
                    <Badge key={ramp} variant="secondary" className="text-xs">
                      {ramp}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3">
                {selectedWallet.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
                      {i + 1}
                    </div>
                    <p className="text-sm text-muted-foreground pt-1">{s}</p>
                  </li>
                ))}
              </ol>

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <a
                  href={selectedWallet.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button variant="outline" className="gap-2" data-testid="button-download-wallet">
                    <ExternalLink className="h-4 w-4" />
                    Get {selectedWallet.name}
                  </Button>
                </a>
                {nextStep && (
                  <Link href={nextStep.url}>
                    <Button className="gap-2 bg-green-600 hover:bg-green-700" data-testid="button-next-step">
                      <Sparkles className="h-4 w-4" />
                      {nextStep.label}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedToken === "XRP" && (
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  After you buy XRP — put it to work
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <Link href="/flare" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Earn yield via Flare XRPFi (Firelight / Morpho)
                  </Link>
                  <Link href="/ownbank/dex" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Trade on XRPL DEX (31 pairs)
                  </Link>
                  <Link href="/ownbank/dca" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Set up DCA orders
                  </Link>
                  <Link href="/ownbank/send" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Send payments via Xaman
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedToken === "XLM" && (
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  After you buy XLM — put it to work
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <Link href="/stellar/dex" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Trade on Stellar DEX (18 pairs)
                  </Link>
                  <Link href="/stellar/dca" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Set up DCA orders
                  </Link>
                  <Link href="/stellar/send" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Send payments via LOBSTR
                  </Link>
                  <Link href="/stellar/remittances" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Cross-border remittances
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowFaq(!showFaq)}
          data-testid="button-toggle-buy-faq"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              Common Questions
            </CardTitle>
            {showFaq ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showFaq && (
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Why doesn't CryptoOwnBank sell crypto directly?</p>
              <p className="text-sm text-muted-foreground">
                We're a non-custodial platform — we never hold your funds or keys. Instead, we guide you to trusted wallets with
                built-in on-ramps (MoonPay, Transak, Topper, etc.) so you can buy directly into your own wallet. This means you
                always have full control of your assets.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">What payment methods can I use?</p>
              <p className="text-sm text-muted-foreground">
                Most on-ramp providers accept credit/debit cards (Visa, Mastercard) and bank transfers (ACH, SEPA, wire).
                Available methods depend on your country and the provider. MoonPay and Transak have the widest coverage.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">How long does it take?</p>
              <p className="text-sm text-muted-foreground">
                Card purchases usually arrive in 1–5 minutes. Bank transfers can take 1–3 business days depending on your bank
                and the provider. Crypto-to-crypto swaps are nearly instant.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">What if my token isn't listed here?</p>
              <p className="text-sm text-muted-foreground">
                Buy any major token (ETH, BTC, XRP) through one of the methods above, then use our{" "}
                <Link href="/ownbank/evm-swap" className="text-blue-600 hover:underline">EVM Swap</Link> or{" "}
                <Link href="/ownbank/cross-chain" className="text-blue-600 hover:underline">Cross-Chain Swap</Link> to
                convert to the token you want. Ledger Live also supports 500+ tokens directly.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Is it safe?</p>
              <p className="text-sm text-muted-foreground">
                All recommended wallets and on-ramp providers are established, regulated services. For maximum security,
                use a Ledger hardware wallet — your keys are stored on the device and never exposed to the internet.
                We recommend starting with a small test purchase to verify everything works before buying larger amounts.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">What's the "Save Address" step about?</p>
              <p className="text-sm text-muted-foreground">
                When you set up a wallet, it gives you a receive address — like a mailing address for crypto.
                We ask you to save that address here once so we can track your balance automatically. Set it up once,
                and it works forever — every future purchase on that chain shows up here. You can also share your
                address with anyone who wants to send you crypto.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">I already bought crypto on an exchange. How do I use it here?</p>
              <p className="text-sm text-muted-foreground">
                Withdraw from the exchange to your own wallet address (Xaman, Ledger, MetaMask, etc.), then add that
                wallet address to CryptoOwnBank under{" "}
                <Link href="/wallets" className="text-blue-600 hover:underline">Wallets</Link>.
                Your balances will appear on your dashboard automatically.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> CryptoOwnBank does not sell, broker, or custody any cryptocurrency. We provide
              informational guides to help you purchase crypto through third-party wallets and on-ramp providers. All purchases
              are between you and the provider. Crypto carries risk including loss of principal. DYOR.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
