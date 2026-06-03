import { useState, useMemo, useCallback, useEffect } from "react";
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
  Zap,
  RefreshCcw,
  ArrowRightLeft,
  Users,
  Globe,
  MessageCircle,
  Lock,
  Loader2,
  Search,
  Banknote,
  Coins,
} from "lucide-react";
import { createOnrampSessionAndRedirect } from "@/lib/stripe-onramp";

type Step = "coin" | "method" | "destination" | "checkout";

type MethodId =
  | "card_instant"
  | "card_widget"
  | "card_external"
  | "aggregator"
  | "swap"
  | "p2p"
  | "privacy";

interface BuyMethod {
  id: MethodId;
  title: string;
  subtitle: string;
  badge: string;
  inSite: boolean;
  needsAddress: boolean;
}

interface TokenOption {
  symbol: string;
  name: string;
  color: string;
  featured?: boolean;
  privacyRoute?: boolean;
}

interface OnrampProvider {
  name: string;
  buildUrl?: (params: { token: string; address?: string; walletName: string }) => string;
}

interface WalletOption {
  name: string;
  type: "cold" | "hot";
  onramps: OnrampProvider[];
  platforms: ("mobile" | "desktop" | "browser")[];
  deepLink?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
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
  { symbol: "FLR", name: "Flare", color: "#E42058" },
  { symbol: "XMR", name: "Monero", color: "#FF6600", privacyRoute: true },
];

const COIN_BLURB: Record<string, string> = {
  XRP: "Built for moving money across borders in seconds, with tiny fees.",
  XLM: "Stellar's coin for cheap global payments and stablecoin transfers.",
  ETH: "The leading smart-contract network — powers most DeFi and stablecoins.",
  BTC: "The original cryptocurrency and the most widely held store of value.",
  SOL: "A high-speed network known for low fees and fast apps.",
  ADA: "Cardano's coin — a research-driven proof-of-stake network.",
  ATOM: "Cosmos' coin — the hub of an 'internet of blockchains.'",
  DOT: "Polkadot's coin — connects many specialized chains together.",
  AVAX: "Avalanche's fast, low-fee smart-contract network.",
  MATIC: "Polygon's coin — a low-cost network that scales Ethereum.",
  TRX: "Tron's coin — widely used for low-fee stablecoin transfers.",
  DOGE: "The original meme coin — fast, cheap, and widely accepted.",
  LTC: "Litecoin — a fast, low-fee 'digital silver' to Bitcoin's gold.",
  HBAR: "Hedera's coin — an enterprise-grade network with very low fees.",
  ALGO: "Algorand's coin — a fast, low-fee proof-of-stake network.",
  CRO: "Cronos' coin — tied to the Crypto.com ecosystem.",
  FLR: "Flare's coin — brings data and smart contracts to assets like XRP.",
  XMR: "The leading privacy coin — balances and transfers are private by design.",
};

function fmtPrice(p?: number): string | null {
  if (p == null || Number.isNaN(p)) return null;
  if (p >= 1) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${p.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function buildMoonPayUrl(params: { token: string; address?: string }) {
  const coinCode = params.token.toLowerCase();
  let url = `https://www.moonpay.com/buy/${coinCode}`;
  if (params.address) url += `?walletAddress=${encodeURIComponent(params.address)}`;
  return url;
}

function buildTransakUrl(params: { token: string; address?: string }) {
  const cryptoCurrency = params.token.toUpperCase();
  let url = `https://global.transak.com/?cryptoCurrencyCode=${cryptoCurrency}`;
  if (params.address) url += `&walletAddress=${encodeURIComponent(params.address)}`;
  return url;
}

function buildTrocadorUrl(params: { token: string }) {
  return `https://trocador.app/en/?ticker_to=${params.token.toLowerCase()}&network_to=Mainnet`;
}

export const BUYABLE_COIN_SYMBOLS: string[] = tokens.map((t) => t.symbol);

const walletsByToken: Record<string, WalletOption[]> = {
  XMR: [
    {
      name: "Cake Wallet",
      type: "hot",
      onramps: [],
      platforms: ["mobile", "desktop"],
      downloadUrl: "https://cakewallet.com",
      description: "Open-source Monero (and Bitcoin) wallet for phone and desktop. Easy to set up, with swaps built in. Your keys stay on your device.",
      steps: [
        "Download Cake Wallet from cakewallet.com (or the App/Play Store)",
        "Create a new Monero wallet and write down your recovery phrase",
        "Tap Receive to see your Monero address",
        "Copy that address and paste it here to save it",
      ],
    },
    {
      name: "Feather Wallet",
      type: "hot",
      onramps: [],
      platforms: ["desktop"],
      downloadUrl: "https://featherwallet.org",
      description: "Lightweight, open-source Monero desktop wallet. Fast and privacy-respecting, with optional Tor.",
      steps: [
        "Download Feather Wallet from featherwallet.org",
        "Create a new wallet and back up your recovery phrase",
        "Open the Receive tab to find your Monero address",
        "Copy that address and paste it here to save it",
      ],
    },
    {
      name: "Monero GUI",
      type: "hot",
      onramps: [],
      platforms: ["desktop"],
      downloadUrl: "https://getmonero.org/downloads",
      description: "The official Monero wallet from the core project. Maximum control, with the option to run your own node.",
      steps: [
        "Download Monero GUI from getmonero.org/downloads",
        "Create a new wallet and securely save your recovery phrase",
        "Open the Receive tab to find your Monero address",
        "Copy that address and paste it here to save it",
      ],
    },
  ],
  XRP: [
    {
      name: "Xaman (XUMM)",
      type: "hot",
      onramps: [
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "XRP", address: p.address }) },
        { name: "Topper" },
        { name: "MoonPay (via Xaman app)", buildUrl: (p) => buildMoonPayUrl({ token: "xrp", address: p.address }) },
      ],
      platforms: ["mobile"],
      deepLink: "xumm://",
      appStoreUrl: "https://apps.apple.com/app/xumm/id1492302343",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.xrpllabs.xumm",
      downloadUrl: "https://xaman.app",
      description: "The go-to XRP wallet with built-in fiat on-ramps. Buy XRP directly with your card or bank — no exchange needed. Tip: MoonPay works inside Xaman even if it blocks your region on the web.",
      steps: [
        "Download Xaman from the App Store or Google Play",
        "Create or import your XRP wallet",
        "Tap the Buy button on the home screen",
        "Choose Transak, Topper, or MoonPay as your payment provider",
        "If MoonPay blocks your region on the web, try buying through Xaman's built-in MoonPay — partner integrations bypass some regional restrictions",
        "Enter the amount you want to buy and complete payment with card or bank transfer",
        "XRP arrives in your Xaman wallet within minutes",
        "Your Xaman wallet works directly with CryptoOwnBank's XRPL tools — DEX trading, DCA orders, Send & Receive, and more",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: [
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "XRP", address: p.address }) },
        { name: "Coinify" },
        { name: "BTC Direct" },
        { name: "Noah (bank transfer)" },
        { name: "MoonPay (via Ledger Live)", buildUrl: (p) => buildMoonPayUrl({ token: "xrp", address: p.address }) },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy XRP directly into cold storage. Your keys never touch the internet. Tip: MoonPay works inside Ledger Live even if it blocks your region on the web — Ledger has a direct partner integration.",
      steps: [
        "Open Ledger Live on desktop or mobile",
        "Make sure the XRP app is installed on your Ledger device (My Ledger → install XRP app)",
        "Go to Accounts → Add Account → XRP if you haven't already",
        "Click Buy / Sell in the left menu",
        "Select XRP and choose a provider (Transak, Coinify, BTC Direct, Noah, or MoonPay)",
        "MoonPay works inside Ledger Live even if moonpay.com blocks your region — Ledger's partner integration bypasses regional restrictions",
        "Noah option: deposit USD/EUR via bank transfer to get instant USDC/USDT — then swap to XRP inside Ledger Live",
        "Enter the amount and complete payment",
        "XRP is sent directly to your Ledger-secured address",
        "Add this address to CryptoOwnBank under Wallets to track your balance",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: [
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "XRP", address: p.address }) },
        { name: "Mercuryo" },
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "xrp", address: p.address }) },
      ],
      platforms: ["mobile", "browser"],
      deepLink: "trust://",
      appStoreUrl: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
      downloadUrl: "https://trustwallet.com",
      description: "Multi-chain wallet with multiple built-in buy options. Transak has the widest regional support for XRP purchases.",
      steps: [
        "Download Trust Wallet from App Store or Google Play",
        "Create your wallet and back up your recovery phrase",
        "Tap the Buy button and select XRP",
        "Choose Transak (widest regional support), Mercuryo, or MoonPay",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "xlm", address: p.address }) },
      ],
      platforms: ["mobile", "desktop"],
      deepLink: "lobstr://",
      appStoreUrl: "https://apps.apple.com/app/lobstr-stellar-lumens-wallet/id1404357892",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.lobstr.client",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "xlm", address: p.address }) },
        { name: "Coinify" },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "XLM", address: p.address }) },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy XLM directly into cold storage via Ledger Live. Noah lets you deposit USD/EUR via bank transfer for instant stablecoins — no credit card needed.",
      steps: [
        "Open Ledger Live on desktop or mobile",
        "Install the Stellar app on your Ledger device (My Ledger → install Stellar app)",
        "Go to Accounts → Add Account → Stellar",
        "Click Buy / Sell → select Stellar (XLM)",
        "Choose a provider and enter your amount — or use Noah for bank transfer to stablecoins, then swap",
        "Complete payment — XLM goes directly to your Ledger",
        "Add this address to CryptoOwnBank to track your balance",
      ],
    },
  ],
  ETH: [
    {
      name: "MetaMask",
      type: "hot",
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "eth", address: p.address }) },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "ETH", address: p.address }) },
        { name: "Banxa" },
      ],
      platforms: ["browser", "mobile"],
      deepLink: "metamask://",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "eth", address: p.address }) },
        { name: "Coinify" },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "ETH", address: p.address }) },
        { name: "BTC Direct" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ETH directly into cold storage. Works with MetaMask too. Noah lets you deposit USD/EUR via bank transfer for instant stablecoins — no credit card needed.",
      steps: [
        "Open Ledger Live → Buy / Sell → select Ethereum",
        "Choose a provider and enter your amount — or use Noah for fee-free bank transfer to stablecoins",
        "Complete payment — ETH goes to your Ledger address",
        "You can also connect your Ledger to MetaMask for DeFi access while keeping keys on the device",
      ],
    },
  ],
  BTC: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "btc", address: p.address }) },
        { name: "Coinify" },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "BTC", address: p.address }) },
        { name: "BTC Direct" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "The safest way to buy and hold Bitcoin. Buy directly into cold storage. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
      steps: [
        "Open Ledger Live → install the Bitcoin app on your Ledger",
        "Add a Bitcoin account if you haven't already",
        "Click Buy / Sell → select Bitcoin",
        "Choose a provider and enter your amount — or use Noah for bank transfer to stablecoins, then swap to BTC",
        "Complete payment — BTC goes directly to your Ledger",
        "Add your BTC address to CryptoOwnBank to track your balance alongside your other assets",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "btc", address: p.address }) },
        { name: "Mercuryo" },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "BTC", address: p.address }) },
      ],
      platforms: ["mobile"],
      deepLink: "trust://",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "sol", address: p.address }) },
        { name: "Coinbase Pay" },
      ],
      platforms: ["browser", "mobile"],
      deepLink: "phantom://",
      appStoreUrl: "https://apps.apple.com/app/phantom-crypto-wallet/id1598432977",
      playStoreUrl: "https://play.google.com/store/apps/details?id=app.phantom",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "sol", address: p.address }) },
        { name: "Coinify" },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "SOL", address: p.address }) },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy SOL into cold storage via Ledger Live. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "ada", address: p.address }) },
        { name: "Coinify" },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "ADA", address: p.address }) },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ADA into cold storage. Stake directly through AdaLite connected to your Ledger. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "ada", address: p.address }) },
        { name: "Mercuryo" },
      ],
      platforms: ["mobile"],
      deepLink: "trust://",
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
      onramps: [
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "ATOM", address: p.address }) },
      ],
      platforms: ["browser", "mobile"],
      deepLink: "keplrwallet://",
      appStoreUrl: "https://apps.apple.com/app/keplr-wallet/id1567851089",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.chainapsis.keplr",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "atom", address: p.address }) },
        { name: "Coinify" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ATOM into cold storage. Stake through Keplr connected to Ledger. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "dot", address: p.address }) },
        { name: "Coinify" },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "DOT", address: p.address }) },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy DOT into cold storage. Stake through Nova Wallet connected to Ledger. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "avax_cchain", address: p.address }) },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "AVAX", address: p.address }) },
      ],
      platforms: ["browser", "mobile"],
      deepLink: "metamask://",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "avax_cchain", address: p.address }) },
        { name: "Coinify" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy AVAX into cold storage. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "matic_polygon", address: p.address }) },
        { name: "Transak", buildUrl: (p) => buildTransakUrl({ token: "MATIC", address: p.address }) },
        { name: "Banxa" },
      ],
      platforms: ["browser", "mobile"],
      deepLink: "metamask://",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "trx", address: p.address }) },
        { name: "Coinify" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy TRX into cold storage via Ledger Live. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "trx", address: p.address }) },
        { name: "Mercuryo" },
      ],
      platforms: ["mobile"],
      deepLink: "trust://",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "doge", address: p.address }) },
        { name: "Coinify" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy DOGE into cold storage. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
      steps: [
        "Open Ledger Live → install the Dogecoin app → Add Account → Dogecoin",
        "Click Buy / Sell → select Dogecoin",
        "Choose a provider, enter your amount, complete payment",
      ],
    },
    {
      name: "Trust Wallet",
      type: "hot",
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "doge", address: p.address }) },
        { name: "Mercuryo" },
      ],
      platforms: ["mobile"],
      deepLink: "trust://",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "ltc", address: p.address }) },
        { name: "Coinify" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy LTC into cold storage. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "hbar", address: p.address }) },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy HBAR into cold storage via Ledger Live. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
      steps: [
        "Open Ledger Live → install the Hedera app → Add Account → Hedera",
        "Click Buy / Sell → select Hedera (HBAR)",
        "Choose a provider (MoonPay or Noah for bank transfer), enter your amount, complete payment",
      ],
    },
  ],
  ALGO: [
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "algo", address: p.address }) },
        { name: "Coinify" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy ALGO into cold storage via Ledger Live. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
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
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "cro", address: p.address }) },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Buy CRO into cold storage via Ledger Live. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
      steps: [
        "Open Ledger Live → install the Cronos app → Add Account → Cronos",
        "Click Buy / Sell → select Cronos (CRO)",
        "Choose a provider (MoonPay or Noah for bank transfer), enter your amount, complete payment",
      ],
    },
  ],
  FLR: [
    {
      name: "MetaMask",
      type: "hot",
      onramps: [
        { name: "MoonPay", buildUrl: (p) => buildMoonPayUrl({ token: "flr", address: p.address }) },
      ],
      platforms: ["browser", "mobile"],
      deepLink: "metamask://",
      downloadUrl: "https://metamask.io",
      description: "Buy FLR via MetaMask, or swap from ETH/AVAX using CryptoOwnBank's EVM Swap.",
      steps: [
        "Install MetaMask → add the Flare network (Chain ID 14, RPC: https://flare-api.flare.network/ext/C/rpc)",
        "Buy FLR through MoonPay, or swap from ETH/AVAX using CryptoOwnBank's EVM Swap or Cross-Chain Swap",
        "FLR arrives in MetaMask on the Flare network",
        "Delegate to FTSO providers to earn rewards — see our Flare page for staking guidance",
      ],
    },
    {
      name: "Ledger (via Ledger Live)",
      type: "cold",
      onramps: [
        { name: "MoonPay" },
        { name: "Noah (bank transfer)" },
      ],
      platforms: ["desktop", "mobile"],
      downloadUrl: "https://www.ledger.com/ledger-live",
      description: "Hold FLR securely on Ledger. Connect to MetaMask for FTSO delegation. Noah lets you deposit USD/EUR via bank transfer — no credit card needed.",
      steps: [
        "Open Ledger Live → install the Flare app (or use Ethereum app with Flare network)",
        "Connect Ledger to MetaMask for Flare network access",
        "Delegate to FTSO providers via the Flare Portal (portal.flare.network)",
      ],
    },
  ],
};

const evmSwapTokens = new Set(["ETH", "AVAX", "MATIC", "FLR"]);
const crossChainTokens = new Set(["ETH", "AVAX", "MATIC", "FLR", "BNB"]);

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
    case "FLR":
      return { label: "View Flare Dashboard", url: "/flare" };
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

const STRIPE_BUY_BY_SYMBOL: Record<string, { currency: string; network: string }> = {
  ETH: { currency: "eth", network: "ethereum" },
  BTC: { currency: "btc", network: "bitcoin" },
  SOL: { currency: "sol", network: "solana" },
  XLM: { currency: "xlm", network: "stellar" },
  AVAX: { currency: "avax", network: "avalanche" },
  MATIC: { currency: "pol", network: "polygon" },
};

const SYMBOL_CHAIN_ALIASES: Record<string, string[]> = {
  XRP: ["xrp", "ripple"],
  XLM: ["stellar", "xlm"],
  ETH: ["ethereum", "evm", "eth"],
  BTC: ["bitcoin", "btc"],
  SOL: ["solana", "sol"],
  ADA: ["cardano", "ada"],
  ATOM: ["cosmos", "atom"],
  DOT: ["polkadot", "dot"],
  AVAX: ["avalanche", "evm", "avax"],
  MATIC: ["polygon", "evm", "matic", "pol"],
  TRX: ["tron", "trx"],
  DOGE: ["dogecoin", "doge"],
  LTC: ["litecoin", "ltc"],
  HBAR: ["hedera", "hbar"],
  ALGO: ["algorand", "algo"],
  CRO: ["cronos", "cro"],
  FLR: ["flare", "flr"],
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

function getSwapAlternative(token: string, userChains: Set<string>): { message: string; url: string; label: string } | null {
  if (token === "FLR" && (userChains.has("ETH") || userChains.has("AVAX"))) {
    return {
      message: `You already hold ${userChains.has("ETH") ? "ETH" : "AVAX"} — swap it to FLR right here instead of buying through an on-ramp.`,
      url: "/ownbank/evm-swap",
      label: "Swap to FLR",
    };
  }
  if (evmSwapTokens.has(token)) {
    const held = ["ETH", "AVAX", "MATIC"].filter(t => t !== token && userChains.has(t));
    if (held.length > 0) {
      return {
        message: `You already hold ${held.join(", ")} — swap it to ${token} right here using EVM Swap.`,
        url: "/ownbank/evm-swap",
        label: `Swap to ${token}`,
      };
    }
  }
  return null;
}

export default function BuyCrypto() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("coin");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<MethodId | null>(null);
  const [coinSearch, setCoinSearch] = useState("");
  const [showFaq, setShowFaq] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // Allow deep-linking from Token Research etc. with ?coin=SYMBOL: preselect
  // the coin and jump straight to "How to pay".
  useEffect(() => {
    const coin = new URLSearchParams(window.location.search).get("coin")?.toUpperCase();
    if (coin && tokens.some((t) => t.symbol === coin)) {
      setSelectedToken(coin);
      setStep("method");
    }
  }, []);

  const { data: prices } = useQuery<Record<string, { usd: number; usd_24h_change: number }>>({
    queryKey: ["/api/public/market-prices"],
  });

  const { data: savedWallets = [] } = useQuery<any[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const userWallets = useMemo(() => detectUserWallets(savedWallets), [savedWallets]);
  const userChains = useMemo(() => detectUserChains(savedWallets), [savedWallets]);
  const hasAnyWallets = userWallets.size > 0;

  const resolveSavedWallet = useCallback(
    (symbol: string): any | null => {
      const aliases =
        SYMBOL_CHAIN_ALIASES[symbol] ||
        [tokenToChain[symbol]].filter(Boolean);
      // Honour alias priority: try the exact chain (e.g. "polygon") first,
      // then the generic "evm" fallback — don't depend on wallet list order.
      for (const alias of aliases) {
        const wallet = savedWallets.find(
          (w: any) => (w.chain || "").toLowerCase() === alias,
        );
        if (wallet?.address) return wallet;
      }
      return null;
    },
    [savedWallets],
  );

  const savedAddressForToken = useMemo(
    () => (selectedToken ? resolveSavedWallet(selectedToken) : null),
    [selectedToken, resolveSavedWallet],
  );

  const resolveSavedAddress = useCallback(
    (symbol: string): string => resolveSavedWallet(symbol)?.address || "",
    [resolveSavedWallet],
  );

  // ALL saved wallets that can receive the chosen coin (a member may have several
  // — Ledger, Xaman, SafePal, etc.). The member picks which one the coin lands in.
  const savedWalletsForToken = useMemo(() => {
    if (!selectedToken) return [] as any[];
    const aliases =
      SYMBOL_CHAIN_ALIASES[selectedToken] ||
      [tokenToChain[selectedToken]].filter(Boolean);
    const seen = new Set<string>();
    const out: any[] = [];
    for (const alias of aliases) {
      for (const w of savedWallets) {
        const addr = (w.address || "").trim();
        if ((w.chain || "").toLowerCase() === alias && addr && !seen.has(addr)) {
          seen.add(addr);
          out.push(w);
        }
      }
    }
    return out;
  }, [selectedToken, savedWallets]);

  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>("");

  // Default the picker to the member's first saved wallet for this coin, and keep
  // the selection valid whenever the coin (and therefore the list) changes.
  useEffect(() => {
    if (savedWalletsForToken.length > 0) {
      setSelectedSavedAddress((prev) =>
        savedWalletsForToken.some((w) => w.address === prev)
          ? prev
          : savedWalletsForToken[0].address,
      );
    } else {
      setSelectedSavedAddress("");
    }
  }, [savedWalletsForToken]);

  const chosenSavedAddress = useMemo(
    () =>
      selectedSavedAddress &&
      savedWalletsForToken.some((w) => w.address === selectedSavedAddress)
        ? selectedSavedAddress
        : savedWalletsForToken[0]?.address || "",
    [selectedSavedAddress, savedWalletsForToken],
  );

  const changellyWalletAddress = chosenSavedAddress;

  const [onrampLoading, setOnrampLoading] = useState(false);
  const handleBuyWithStripe = useCallback(
    async (
      address: string,
      opt: { currency: string; network: string; symbol: string },
    ) => {
      if (!address) {
        toast({
          title: "Add your wallet address first",
          description: `Save your ${opt.symbol} wallet address so the coin has somewhere to land.`,
          variant: "destructive",
        });
        return;
      }
      setOnrampLoading(true);
      try {
        await createOnrampSessionAndRedirect({
          walletAddress: address,
          destinationCurrency: opt.currency,
          destinationNetwork: opt.network,
        });
        toast({
          title: "Stripe opened in a new tab",
          description: `Buying ${opt.symbol} → your own wallet. CryptoOwnBank never touches it.`,
        });
      } catch (err: any) {
        toast({
          title: "Could not open Stripe",
          description:
            err?.message || "Try another provider below — your coins still land in the same wallet.",
          variant: "destructive",
        });
      } finally {
        setOnrampLoading(false);
      }
    },
    [toast],
  );

  const changellyBuyUrl = useMemo(() => {
    const addr = encodeURIComponent(changellyWalletAddress || newAddress.trim());
    const to = (selectedToken || "xrp").toLowerCase();
    return `https://widget.changelly.com?from=*&to=*&amount=500&address=${addr}&fromDefault=usd&toDefault=${to}&merchant_id=U-FDw3yOEYkT06Im&payment_id=&v=3&type=no-rev-share&color=5f41ff&headerId=1&logo=hide&buyButtonTextId=1`;
  }, [selectedToken, changellyWalletAddress, newAddress]);

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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      // Honour the "Save & use this address" promise: make the coin land in the
      // address the member just saved, not whichever was previously selected.
      setSelectedSavedAddress(variables.address);
      toast({ title: "Address saved!", description: "Your wallet address has been saved to your profile. It's ready for all future purchases." });
      setNewAddress("");
      setNewLabel("");
      setStep("checkout");
    },
    onError: (err: any) => {
      toast({ title: "Could not save address", description: err.message || "Please try again.", variant: "destructive" });
    },
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  function handleRefreshBalances() {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: "Balances refreshed", description: "Your portfolio data has been updated." });
    }, 1500);
  }

  function handleCoinSelect(symbol: string) {
    setSelectedToken(symbol);
    setSelectedMethod(null);
    setNewAddress("");
    setNewLabel("");
    setStep("method");
  }

  function handleMethodSelect(id: MethodId, needsAddress: boolean) {
    setSelectedMethod(id);
    setStep(needsAddress ? "destination" : "checkout");
  }

  function handleBack() {
    if (step === "checkout") {
      const m = buyMethods.find((x) => x.id === selectedMethod);
      setStep(m?.needsAddress ? "destination" : "method");
    } else if (step === "destination") {
      setStep("method");
    } else if (step === "method") {
      setStep("coin");
      setSelectedToken(null);
      setSelectedMethod(null);
    }
  }

  function handleStartOver() {
    setStep("coin");
    setSelectedToken(null);
    setSelectedMethod(null);
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

  // The address the coin will actually land in: a saved wallet if we have one,
  // otherwise a one-time address the member pasted in this session (so logged-out
  // members can still use Stripe / providers without an account).
  const effectiveAddress = changellyWalletAddress || newAddress.trim();

  const tokenData = tokens.find((t) => t.symbol === selectedToken);
  const nextStep = selectedToken ? getNextStepLink(selectedToken) : null;
  const swapAlt = selectedToken ? getSwapAlternative(selectedToken, userChains) : null;
  const stripeOpt = selectedToken ? STRIPE_BUY_BY_SYMBOL[selectedToken] : undefined;
  const tokenPrice = selectedToken ? prices?.[selectedToken]?.usd : undefined;

  const buyMethods = useMemo<BuyMethod[]>(() => {
    if (!selectedToken) return [];
    if (tokenData?.privacyRoute) {
      return [
        {
          id: "privacy",
          title: "Buy it privately",
          subtitle: "Monero can't be bought with a card here — we'll point you to trusted private routes.",
          badge: "Private",
          inSite: false,
          needsAddress: true,
        },
      ];
    }
    const list: BuyMethod[] = [];
    if (STRIPE_BUY_BY_SYMBOL[selectedToken]) {
      list.push({
        id: "card_instant",
        title: "Card, Apple Pay or Google Pay",
        subtitle: "Fastest — finished right here on CryptoOwnBank. The coin lands in your own wallet.",
        badge: "In-site · instant",
        inSite: true,
        needsAddress: true,
      });
    }
    list.push({
      id: "card_widget",
      title: STRIPE_BUY_BY_SYMBOL[selectedToken] ? "Card or bank (more coins)" : "Card or bank",
      subtitle: "Buy in the on-site widget — it never leaves CryptoOwnBank.",
      badge: "In-site · 100+ coins",
      inSite: true,
      needsAddress: true,
    });
    list.push({
      id: "card_external",
      title: "MoonPay or Transak",
      subtitle: "Opens in a new tab with your address already filled in. A reliable backup if a card is declined.",
      badge: "External · backup",
      inSite: false,
      needsAddress: true,
    });
    list.push({
      id: "aggregator",
      title: "Exchange a coin you already own",
      subtitle: `Swap any crypto you hold into ${selectedToken} through Trocador — it shops dozens of swap services for the best rate. Usually no account needed, and nothing passes through us.`,
      badge: "Low-KYC · self-serve",
      inSite: false,
      needsAddress: true,
    });
    if (swapAlt) {
      list.push({
        id: "swap",
        title: "Swap crypto you already own",
        subtitle: swapAlt.message,
        badge: "No card needed",
        inSite: true,
        needsAddress: true,
      });
    }
    list.push({
      id: "p2p",
      title: "Cash, gift cards & P2P",
      subtitle: "Buy from a real person — no exchange account needed.",
      badge: "Other ways",
      inSite: false,
      needsAddress: true,
    });
    return list;
  }, [selectedToken, tokenData, swapAlt]);

  const selectedMethodObj = buyMethods.find((m) => m.id === selectedMethod) || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <SeoHead
        title="Buy Crypto — XRP, RLUSD, XLM, ETH, BTC & More | CryptoOwnBank"
        description="Step-by-step guide to buying crypto with your card or bank account. Buy XRP, RLUSD, XLM, ETH, BTC, SOL, and more through trusted wallets with built-in on-ramps. Buy RLUSD on Binance or Kraken and earn 5-8% APR in Soil Protocol vaults."
      />

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-buy-crypto">
            <ShoppingCart className="h-6 w-6 text-green-600" />
            Buy Crypto
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pick a coin, choose how to pay, and finish — one simple step at a time, right here on CryptoOwnBank.
          </p>
        </div>
        {step !== "coin" && (
          <Button variant="outline" size="sm" onClick={handleStartOver} data-testid="button-start-over">
            Start Over
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-sm flex-wrap" data-testid="step-progress">
        {([
          { key: "coin", label: "1. Coin" },
          { key: "method", label: "2. How to pay" },
          { key: "destination", label: "3. Your wallet" },
          { key: "checkout", label: "4. Finish" },
        ] as const).map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            <Badge variant={step === s.key ? "default" : "outline"} className="gap-1">
              {s.label}
            </Badge>
          </div>
        ))}
      </div>

      {step === "coin" && (
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
              <CardDescription>Pick a coin to start — we'll handle the rest one step at a time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or symbol (e.g. Bitcoin, XRP)"
                  value={coinSearch}
                  onChange={(e) => setCoinSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-coin-search"
                />
              </div>
              {(() => {
                const q = coinSearch.trim().toLowerCase();
                const matches = (t: TokenOption) =>
                  !q || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
                const featured = tokens.filter((t) => t.featured && matches(t));
                const rest = tokens.filter((t) => !t.featured && matches(t));
                const renderCoin = (token: TokenOption) => {
                  const price = fmtPrice(prices?.[token.symbol]?.usd);
                  const chg = prices?.[token.symbol]?.usd_24h_change;
                  return (
                    <button
                      key={token.symbol}
                      type="button"
                      onClick={() => handleCoinSelect(token.symbol)}
                      className={`text-left rounded-lg border p-3 hover:border-green-500 transition-colors relative ${userChains.has(token.symbol) ? "border-green-500/50 bg-green-500/5" : ""}`}
                      data-testid={`button-token-${token.symbol.toLowerCase()}`}
                    >
                      {userChains.has(token.symbol) && (
                        <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-medium">You hold</span>
                      )}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-sm">{token.symbol}</span>
                        {price && (
                          <span className="text-xs font-medium" data-testid={`text-price-${token.symbol.toLowerCase()}`}>{price}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{token.name}</div>
                      {typeof chg === "number" && (
                        <div className={`text-[10px] font-medium ${chg >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {chg >= 0 ? "+" : ""}{chg.toFixed(2)}% 24h
                        </div>
                      )}
                    </button>
                  );
                };
                if (featured.length === 0 && rest.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground py-6 text-center" data-testid="text-no-coins">
                      No coins match "{coinSearch}". Try a different name.
                    </p>
                  );
                }
                return (
                  <div className="space-y-4">
                    {featured.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Popular</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {featured.map(renderCoin)}
                        </div>
                      </div>
                    )}
                    {rest.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">All coins</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {rest.map(renderCoin)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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

          {!user && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold mb-1">New here?</p>
                    <p className="text-sm text-muted-foreground">
                      Sign up free to save your wallet address once and have every future purchase land there automatically — plus track balances, trade, swap, and earn yield, all in one place.
                    </p>
                  </div>
                </div>
                <Link href="/auth">
                  <Button className="w-full bg-green-600 hover:bg-green-700 gap-2 mt-1" data-testid="button-signup-cta">
                    <Wallet className="h-4 w-4" />
                    Sign Up Free
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {user && !hasAnyWallets && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <Wallet className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold mb-1">Already bought crypto? Add your wallet to start tracking</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Once you add your wallet address, we'll automatically pull in your balances. You'll see everything on one dashboard — and unlock DEX trading, DCA orders, swaps, yield tools, and payment features.
                    </p>
                    <Link href="/wallets">
                      <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" data-testid="button-add-wallet-cta">
                        <Plus className="h-4 w-4" /> Add My Wallet
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === "method" && selectedToken && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span
                  className="inline-flex h-7 min-w-7 px-1 items-center justify-center rounded-full text-white text-[10px] font-bold"
                  style={{ backgroundColor: tokenData?.color || "#00A4E4" }}
                >
                  {selectedToken}
                </span>
                How do you want to pay for {tokenData?.name || selectedToken}?
              </CardTitle>
              <CardDescription>
                {tokenPrice
                  ? `About ${fmtPrice(tokenPrice)} per ${selectedToken} right now — pick the option that suits you.`
                  : "Pick the option that suits you. You can always come back and switch."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {buyMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodSelect(m.id, m.needsAddress)}
                  className="w-full text-left rounded-lg border p-4 hover:border-green-500 transition-colors bg-background flex items-start gap-3"
                  data-testid={`button-method-${m.id}`}
                >
                  <div className="mt-0.5 shrink-0 text-green-600">
                    {(m.id === "card_instant" || m.id === "card_widget") && <CreditCard className="h-5 w-5" />}
                    {m.id === "card_external" && <Banknote className="h-5 w-5" />}
                    {m.id === "aggregator" && <Repeat className="h-5 w-5" />}
                    {m.id === "swap" && <ArrowRightLeft className="h-5 w-5" />}
                    {m.id === "p2p" && <Users className="h-5 w-5" />}
                    {m.id === "privacy" && <Lock className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{m.title}</span>
                      <Badge variant={m.inSite ? "default" : "outline"} className="text-[10px]">{m.badge}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{m.subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>

          {COIN_BLURB[selectedToken] && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>{tokenData?.name || selectedToken}:</strong> {COIN_BLURB[selectedToken]}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === "destination" && selectedToken && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back-address">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {savedWalletsForToken.length > 0 ? (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  {savedWalletsForToken.length > 1
                    ? `Which ${selectedToken} wallet should it land in?`
                    : `Your ${selectedToken} wallet is ready`}
                </CardTitle>
                <CardDescription>
                  {savedWalletsForToken.length > 1
                    ? `You have ${savedWalletsForToken.length} ${tokenData?.name || selectedToken} addresses saved. Pick the one your purchase should land in.`
                    : `You already have a ${tokenData?.name || selectedToken} address saved. Everything you buy lands here automatically.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {savedWalletsForToken.map((w) => {
                    const isSelected = chosenSavedAddress === w.address;
                    return (
                      <div
                        key={w.id || w.address}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedSavedAddress(w.address)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedSavedAddress(w.address);
                          }
                        }}
                        className={`flex items-center gap-3 rounded-lg p-3 border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-green-500 bg-green-500/10 ring-1 ring-green-500"
                            : "border-border bg-muted/40 hover:border-green-500/50"
                        }`}
                        data-testid={`button-select-wallet-${w.id || w.address}`}
                      >
                        <div
                          className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-green-600" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{w.label || "Wallet"}</p>
                          <p className="text-sm font-mono truncate text-muted-foreground" data-testid={`text-saved-address-${w.id || w.address}`}>{w.address}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(w.address);
                            toast({ title: "Copied!", description: "Address copied to clipboard." });
                          }}
                          data-testid={`button-copy-address-${w.id || w.address}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <details className="rounded-lg border p-3 group" data-testid="details-add-another-address">
                  <summary className="text-sm font-medium cursor-pointer flex items-center gap-2 list-none">
                    <Plus className="h-4 w-4 text-green-600" />
                    Send to a different {selectedToken} address
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">New {selectedToken} address</label>
                      <Input
                        placeholder={`Paste your ${selectedToken} receive address here`}
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        className="font-mono text-sm"
                        data-testid="input-wallet-address-extra"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Label (optional)</label>
                      <Input
                        placeholder={`e.g., My ${selectedToken} wallet`}
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        data-testid="input-wallet-label-extra"
                      />
                    </div>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 gap-2"
                      disabled={!newAddress.trim() || addWalletMutation.isPending}
                      onClick={handleSaveAddress}
                      data-testid="button-save-address-extra"
                    >
                      {addWalletMutation.isPending ? "Saving..." : (<><Plus className="h-4 w-4" /> Save & use this address</>)}
                    </Button>
                  </div>
                </details>

                <p className="text-xs text-muted-foreground">
                  Set up once, works forever — any time you buy {selectedToken}, it arrives in the wallet you pick. You can also share these addresses with anyone who wants to send you {selectedToken}.
                </p>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 gap-2"
                  onClick={() => setStep("checkout")}
                  data-testid="button-continue-to-buy"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : user ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Where should your {selectedToken} land?
                </CardTitle>
                <CardDescription>
                  Save your {tokenData?.name || selectedToken} receive address so the coin goes straight to a wallet you control. Set it up once — every future purchase lands here automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-2">Already have a wallet? Find your address:</p>
                    <ol className="text-sm text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">1</span>
                        Open your wallet app on your phone or computer
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

                {availableWallets.length > 0 && (
                  <details className="rounded-lg border p-3 group" data-testid="details-no-wallet">
                    <summary className="text-sm font-medium cursor-pointer flex items-center gap-2 list-none">
                      <Plus className="h-4 w-4 text-green-600" />
                      Don't have a wallet yet? Set one up (2 minutes)
                    </summary>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        These free wallets hold {selectedToken} and only you control them. Install one, create a wallet, then come back and paste your receive address.
                      </p>
                      {availableWallets.map((wallet) => (
                        <a
                          key={wallet.name}
                          href={wallet.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-md border p-3 hover:border-green-500 transition-colors"
                          data-testid={`link-get-wallet-${wallet.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {wallet.type === "cold" ? (
                              <Shield className="h-4 w-4 text-blue-600 shrink-0" />
                            ) : (
                              <Wallet className="h-4 w-4 text-green-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-sm font-medium">{wallet.name}</span>
                              <p className="text-xs text-muted-foreground truncate">{wallet.description}</p>
                            </div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                        </a>
                      ))}
                    </div>
                  </details>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Your {selectedToken} address</label>
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
                      placeholder={`e.g., My ${selectedToken} wallet`}
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
                        <Plus className="h-4 w-4" /> Save address & continue
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Sign in to save your {selectedToken} address once — then every purchase lands there automatically and we track your balance for you. You can still continue without an account.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Your {selectedToken} address</label>
                  <Input
                    placeholder={`Paste your ${selectedToken} receive address here`}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="font-mono text-sm"
                    data-testid="input-wallet-address"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kept on this device for this purchase — sign in to save it so it's there for every future buy.
                  </p>
                </div>
                <Button
                  className="w-full"
                  disabled={!newAddress.trim()}
                  onClick={() => setStep("checkout")}
                  data-testid="button-continue-no-auth"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === "checkout" && selectedToken && selectedMethodObj && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back-instructions">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="ghost" size="sm" onClick={handleStartOver} className="gap-1 text-muted-foreground" data-testid="button-start-over-checkout">
              <RefreshCcw className="h-3.5 w-3.5" /> Start over
            </Button>
          </div>

          {effectiveAddress && selectedMethodObj.needsAddress && (
            <Card className="border-green-500/10 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Your {selectedToken} lands here</p>
                    <p className="text-sm font-mono truncate" data-testid="text-address-reminder">{effectiveAddress}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(effectiveAddress);
                      toast({ title: "Copied!", description: "Address copied to clipboard." });
                    }}
                    data-testid="button-copy-address-instructions"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedMethodObj.needsAddress && !effectiveAddress && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground flex-1">
                    No {selectedToken} address yet — the coin needs somewhere to land.{" "}
                    <button onClick={() => setStep("destination")} className="text-amber-700 dark:text-amber-400 font-medium underline" data-testid="button-go-save-address">Add your address</button>{" "}
                    {user ? "(we'll remember it) " : "to use it here "}
                    or paste it directly into the provider when prompted.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedMethod === "card_instant" && stripeOpt && (
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Buy {selectedToken} with card — finish right here
                </CardTitle>
                <CardDescription>
                  Pay with a card, Apple Pay or Google Pay through Stripe. The coin goes straight to your own wallet — CryptoOwnBank never touches it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 gap-2"
                  onClick={() => handleBuyWithStripe(effectiveAddress, { ...stripeOpt, symbol: selectedToken })}
                  disabled={onrampLoading}
                  data-testid="button-buy-stripe"
                >
                  <CreditCard className="h-4 w-4" />
                  {onrampLoading ? "Opening Stripe..." : `Buy ${selectedToken} now`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Opens Stripe in a new tab with your wallet address locked in. Non-custodial and self-custodied the whole way.
                </p>
              </CardContent>
            </Card>
          )}

          {selectedMethod === "card_widget" && (
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Buy {selectedToken} — right here on CryptoOwnBank
                </CardTitle>
                <CardDescription>
                  Pay by card or bank in the secure widget below. It never leaves this page, and your coin lands in your own wallet{effectiveAddress ? " (address pre-filled)" : ""}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <iframe
                  src={changellyBuyUrl}
                  className="w-full rounded-lg border"
                  style={{ height: 480 }}
                  title="Buy crypto"
                  allow="camera; payment; clipboard-write"
                  data-testid="iframe-changelly-buy"
                />
              </CardContent>
            </Card>
          )}

          {selectedMethod === "card_external" && (
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-green-600" />
                  Buy {selectedToken} with MoonPay or Transak
                </CardTitle>
                <CardDescription>
                  Opens in a new tab with your wallet address already filled in{effectiveAddress ? "" : " (paste it there if prompted)"}. A reliable backup if a card is declined elsewhere.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href={buildMoonPayUrl({ token: selectedToken, address: effectiveAddress || undefined })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" data-testid="button-buy-moonpay">
                    <ExternalLink className="h-4 w-4" /> Buy {selectedToken} via MoonPay
                  </Button>
                </a>
                <a
                  href={buildTransakUrl({ token: selectedToken, address: effectiveAddress || undefined })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full gap-2" data-testid="button-buy-transak">
                    <ExternalLink className="h-4 w-4" /> Buy {selectedToken} via Transak
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}

          {selectedMethod === "aggregator" && (
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-green-600" />
                  Exchange into {selectedToken} via Trocador
                </CardTitle>
                <CardDescription>
                  Trocador shops dozens of swap services and picks the best rate — you swap a coin you already own into {selectedToken}. Most swaps need no account, though some providers may ask for one depending on the amount or your country. The coins never pass through CryptoOwnBank. Best for crypto-to-crypto; to turn cash into crypto, use the card options.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {effectiveAddress && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground mb-1">Send the {selectedToken} to your own wallet:</p>
                    <p className="font-mono break-all" data-testid="text-aggregator-address">{effectiveAddress}</p>
                  </div>
                )}
                <a
                  href={buildTrocadorUrl({ token: selectedToken })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" data-testid="button-buy-trocador">
                    <ExternalLink className="h-4 w-4" /> Open Trocador to swap into {selectedToken}
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground">
                  On Trocador: choose the coin you're sending, paste your {selectedToken} address as the destination, and double-check it matches before you send. {selectedToken === "XRP" || selectedToken === "XLM" ? "If your wallet shows a destination tag/memo, add it too." : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {selectedMethod === "swap" && (swapAlt || nextStep) && (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-yellow-600" />
                  Swap into {selectedToken} — no card needed
                </CardTitle>
                <CardDescription>{swapAlt?.message || `Use crypto you already hold to get ${selectedToken}.`}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={swapAlt?.url || nextStep?.url || "/ownbank/cross-chain"}>
                  <Button className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700" data-testid="button-go-swap">
                    <ArrowRightLeft className="h-4 w-4" /> {swapAlt?.label || "Open swap"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {selectedMethod === "privacy" && (
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-violet-600" />
                  Buy {selectedToken} privately
                </CardTitle>
                <CardDescription>
                  {selectedToken} can't be bought with a card here, and we never hold your coins — so the buy finishes on a trusted outside service and lands straight in your own wallet. The next page walks you through it in 3 steps: (1) get a Monero wallet, (2) swap a coin you own — or buy with cash — into it, (3) done. You stay in control the whole time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/own-privately">
                  <Button className="w-full gap-2 bg-violet-600 hover:bg-violet-700" data-testid="button-go-privacy">
                    <Lock className="h-4 w-4" /> See the 3 steps to buy {selectedToken}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {selectedMethod === "p2p" && (
            <>
          <Card className="border-violet-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-600" />
                P2P On-Ramps — Buy Crypto Your Way
              </CardTitle>
              <CardDescription>
                No exchange account needed. Buy crypto directly from other people using gift cards, cash, mobile money, bank transfers, and 900+ other methods — then add your wallet here to track everything.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href="https://noones.com/r/EasyMora369" target="_blank" rel="noopener noreferrer" className="block">
                <div className="rounded-lg border p-4 hover:border-violet-500 transition-colors space-y-2" data-testid="card-p2p-noones">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-violet-600" />
                      <span className="font-semibold">NoOnes</span>
                      <Badge className="bg-violet-600 text-white text-[10px]">900+ Payment Methods</Badge>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gift cards, prepaid cards, cash deposits, mobile money (M-Pesa, GCash), bank transfers, in-person meetups — whatever works for you. Buy XRP, BTC, USDT, and more directly from sellers with built-in escrow protection.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Availability: Global (excluding the US)</p>
                  <p className="text-xs text-violet-600 font-medium">
                    Buy crypto → send to your wallet → add wallet to CryptoOwnBank → track, trade, and manage everything from one dashboard
                  </p>
                </div>
              </a>

              <a href="https://bybarter.com" target="_blank" rel="noopener noreferrer" className="block">
                <div className="rounded-lg border p-4 hover:border-violet-500 transition-colors space-y-2" data-testid="card-p2p-bybarter">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5 text-violet-600" />
                      <span className="font-semibold">ByBarter</span>
                      <Badge variant="outline" className="text-[10px]">Non-Custodial P2P</Badge>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Non-custodial P2P with built-in escrow and QR code support. Swap fiat for crypto directly wallet-to-wallet — no middleman holds your funds.
                  </p>
                  <p className="text-xs text-violet-600 font-medium">
                    Crypto goes straight to your wallet → add it here → see your balances update in real time
                  </p>
                </div>
              </a>

              <a href="https://narfex.com" target="_blank" rel="noopener noreferrer" className="block">
                <div className="rounded-lg border p-4 hover:border-violet-500 transition-colors space-y-2" data-testid="card-p2p-narfex">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-violet-600" />
                      <span className="font-semibold">Narfex</span>
                      <Badge variant="outline" className="text-[10px]">Decentralized P2P</Badge>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fully decentralized P2P protocol — no platform holds anything. Pure peer-to-peer fiat-to-crypto swaps for the privacy-conscious.
                  </p>
                  <p className="text-xs text-violet-600 font-medium">
                    Your keys, your crypto → add your wallet address here → use our DEX, DCA, and swap tools
                  </p>
                </div>
              </a>

              <Card className="border-violet-500/10 bg-violet-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <strong>Telegram users:</strong> You can also buy USDT instantly inside{" "}
                      <a href="https://t.me/wallet" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                        Telegram Wallet
                      </a>{" "}
                      using Apple Pay, Google Pay, or your card (100+ countries). Then send it to your wallet address and add it to CryptoOwnBank to track alongside all your other assets.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-600" />
                Emerging Market On-Ramps
              </CardTitle>
              <CardDescription>
                Built for India, Southeast Asia, Africa, and Latin America — local payment methods, light KYC, and fast settlement. Get crypto into your wallet, then manage it all here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href="https://onramp.money" target="_blank" rel="noopener noreferrer" className="block">
                <div className="rounded-lg border p-4 hover:border-amber-500 transition-colors space-y-2" data-testid="card-onramp-money">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold">Onramp.money</span>
                      <Badge className="bg-amber-600 text-white text-[10px]">India & Southeast Asia Only</Badge>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Buy crypto with UPI, IMPS, NEFT, local bank transfers, and mobile wallets. Designed for India and Southeast Asia with fast KYC and instant settlement. Supports XRP, ETH, BTC, USDT, and more.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Availability: India & Southeast Asia</p>
                  <p className="text-xs text-amber-600 font-medium">
                    Buy with UPI or local bank → crypto lands in your wallet → add it to CryptoOwnBank → track balances and use DEX, DCA, swaps
                  </p>
                </div>
              </a>

              <a href="https://my.digitap.app/en/sign-up/a5ddfe70-5c63-4aea-94de-1ff0741c56ec" target="_blank" rel="noopener noreferrer" className="block">
                <div className="rounded-lg border p-4 hover:border-amber-500 transition-colors space-y-2" data-testid="card-digitap">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold">Digitap</span>
                      <Badge variant="outline" className="text-[10px]">QR-Based, Merchant-Friendly</Badge>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    QR-based fiat-to-crypto with minimal KYC. Built for emerging markets — supports local payment rails across India, Brazil, Philippines, Nigeria, and more. Perfect for first-time crypto buyers.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Availability: Emerging markets (India, Brazil, Philippines, Nigeria, etc.)</p>
                  <p className="text-xs text-amber-600 font-medium">
                    Scan QR → pay with local method → get crypto in your wallet → come back here to manage everything
                  </p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-cyan-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-600" />
                Local P2P Communities
              </CardTitle>
              <CardDescription>
                In many countries, the easiest way to buy crypto is through local communities where people trade daily.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Millions of people buy and sell crypto every day in local Telegram groups, WhatsApp groups, and Facebook communities — especially in Nigeria, Brazil, Philippines, India, Kenya, Ghana, and South Africa. Search for groups like "Buy Sell Crypto [your city]" or "P2P Crypto [your country]" on Telegram or Facebook.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-semibold text-xs">How it works</p>
                  <ol className="text-xs text-muted-foreground space-y-1">
                    <li>1. Find a local P2P group on Telegram or WhatsApp</li>
                    <li>2. Agree on price with a seller</li>
                    <li>3. Pay via local method (cash, bank, mobile money)</li>
                    <li>4. Seller sends crypto to your wallet</li>
                  </ol>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-semibold text-xs">Then come back here</p>
                  <ol className="text-xs text-muted-foreground space-y-1">
                    <li>1. Add your wallet address to CryptoOwnBank</li>
                    <li>2. See your balance update automatically</li>
                    <li>3. Trade on DEX, set up DCA, swap tokens</li>
                    <li>4. Track your full portfolio in one place</li>
                  </ol>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-cyan-500/10 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-cyan-700 dark:text-cyan-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Safety tip:</strong> Use escrow services when available (NoOnes and ByBarter have built-in escrow). For direct P2P trades, start with small amounts, verify the seller's reputation, and never share your private keys or recovery phrase.
                </p>
              </div>
            </CardContent>
          </Card>
            </>
          )}

          {user && savedAddressForToken && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <RefreshCcw className={`h-5 w-5 text-blue-600 mt-0.5 shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Done buying?</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      After your purchase completes, refresh your balances to see the updated amount in your portfolio.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={handleRefreshBalances}
                      disabled={isRefreshing}
                      data-testid="button-refresh-balance"
                    >
                      <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                      {isRefreshing ? "Refreshing..." : "Refresh My Balances"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

          {(selectedToken === "ETH" || selectedToken === "AVAX" || selectedToken === "MATIC" || selectedToken === "FLR") && (
            <Card className="border-indigo-500/20 bg-indigo-500/5">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  After you buy {selectedToken} — put it to work
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <Link href="/ownbank/evm-swap" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Swap tokens via EVM Swap
                  </Link>
                  <Link href="/ownbank/cross-chain" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Cross-chain swap to other networks
                  </Link>
                  {selectedToken === "FLR" && (
                    <Link href="/flare" className="flex items-center gap-2 hover:text-foreground transition-colors">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      Delegate to FTSO for rewards
                    </Link>
                  )}
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
                Wallet on-ramps (MoonPay, Transak) accept credit/debit cards and bank transfers. For more options — gift cards, cash deposits,
                mobile money (M-Pesa, GCash), prepaid cards, in-person meetups — use P2P platforms like{" "}
                <a href="https://noones.com/r/EasyMora369" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">NoOnes</a> (global, excluding US) or{" "}
                <a href="https://bybarter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ByBarter</a>.
                In India and Southeast Asia,{" "}
                <a href="https://onramp.money" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Onramp.money</a> supports UPI, IMPS, and local bank transfers.{" "}
                <a href="https://my.digitap.app/en/sign-up/a5ddfe70-5c63-4aea-94de-1ff0741c56ec" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Digitap</a> offers QR-based buying across emerging markets.
                Telegram users can buy USDT instantly with Apple Pay or Google Pay via{" "}
                <a href="https://t.me/wallet" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Telegram Wallet</a>.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">I'm in India / Africa / Southeast Asia — what's the best option for me?</p>
              <p className="text-sm text-muted-foreground">
                <a href="https://onramp.money" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Onramp.money</a> is the best for India (UPI, IMPS, NEFT).{" "}
                <a href="https://noones.com/r/EasyMora369" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">NoOnes</a> (global, excluding US) is excellent for Nigeria, Kenya, Ghana, and the Philippines — it supports mobile money (M-Pesa, GCash), cash deposits, and local payment methods.{" "}
                <a href="https://bybarter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ByBarter</a> also supports mobile money, cash deposits, and P2P with escrow.{" "}
                <a href="https://my.digitap.app/en/sign-up/a5ddfe70-5c63-4aea-94de-1ff0741c56ec" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Digitap</a> works across all emerging markets with QR-based purchases.
                You can also find active local P2P communities on Telegram and WhatsApp where people trade daily — search for "P2P Crypto" + your city or country.
                Whichever method you use, add your wallet to CryptoOwnBank afterward to track your balances and use our trading tools.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">What is Noah and how does it work?</p>
              <p className="text-sm text-muted-foreground">
                Noah is a cash-to-stablecoin on-ramp built into Ledger Live. It lets you deposit USD or EUR via a regular bank transfer
                and instantly receive USDC or USDT in your Ledger wallet — no credit card needed, no card fees. Once you have stablecoins,
                you can swap them to any token inside Ledger Live or use CryptoOwnBank's EVM Swap. It's one of the cheapest ways to get
                crypto if you have a Ledger hardware wallet.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">How long does it take?</p>
              <p className="text-sm text-muted-foreground">
                Card purchases usually arrive in 1–5 minutes. Bank transfers (including Noah) can take 1–3 business days depending on your bank
                and the provider. Crypto-to-crypto swaps are nearly instant.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">How do I buy RLUSD to earn yield?</p>
              <p className="text-sm text-muted-foreground">
                RLUSD is Ripple's regulated USD stablecoin (market cap over $1.5B). Buy it on{" "}
                <a href="https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Binance</a>,{" "}
                <a href="https://proinvite.kraken.com/9f1e/oya30ft6" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Kraken</a>, or{" "}
                <a href="https://coinbase.com/join/TT3HJ4K?src=ios-link" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Coinbase</a>{" "}
                and withdraw it to your XRPL wallet. Then deposit into a{" "}
                <Link href="/ownbank/vaults" className="text-blue-600 hover:underline">Soil Protocol vault</Link>{" "}
                to earn 5-8% fixed APR. Your keys stay in your hands the entire time.
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
            <div className="space-y-1">
              <p className="text-sm font-medium">Can I swap tokens I already have instead of buying new ones?</p>
              <p className="text-sm text-muted-foreground">
                Yes! If you already hold ETH, AVAX, or MATIC, use our{" "}
                <Link href="/ownbank/evm-swap" className="text-blue-600 hover:underline">EVM Swap</Link> to convert between tokens on the same chain, or{" "}
                <Link href="/ownbank/cross-chain" className="text-blue-600 hover:underline">Cross-Chain Swap</Link> to move assets between networks.
                For XRP holders, use the{" "}
                <Link href="/ownbank/dex" className="text-blue-600 hover:underline">XRPL DEX</Link> (31 trading pairs).
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">Ready to spend your crypto in the real world?</p>
              <p className="text-sm text-muted-foreground mb-2">
                Check out non-custodial crypto debit cards — spend directly from your wallet at any Visa or Mastercard terminal, anywhere in the world.
              </p>
              <Link href="/crypto-debit-cards">
                <Button size="sm" variant="outline" className="gap-2 border-blue-500/30 text-blue-700" data-testid="button-spend-crypto-link">
                  <CreditCard className="h-3.5 w-3.5" /> View Crypto Debit Cards
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
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
