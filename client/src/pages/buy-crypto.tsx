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
  Zap,
  RefreshCcw,
  ArrowRightLeft,
  Users,
  Globe,
  MessageCircle,
  Lock,
} from "lucide-react";

type Step = "token" | "wallet" | "address" | "instructions";

interface TokenOption {
  symbol: string;
  name: string;
  color: string;
  featured?: boolean;
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
];

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

const walletsByToken: Record<string, WalletOption[]> = {
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
  const [step, setStep] = useState<Step>("token");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [selectedOnramp, setSelectedOnramp] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [changellyBuyCrypto, setChangellyBuyCrypto] = useState("xrp");

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

  const changellyWalletAddress = useMemo(() => {
    const symbol = changellyBuyCrypto.toUpperCase();
    const chain = tokenToChain[symbol];
    if (!chain) return "";
    const wallet = savedWallets.find((w: any) => w.chain === chain);
    return wallet?.address || "";
  }, [changellyBuyCrypto, savedWallets]);

  const changellyBuyUrl = useMemo(() => {
    const addr = encodeURIComponent(changellyWalletAddress);
    const to = changellyBuyCrypto.toLowerCase();
    return `https://widget.changelly.com?from=*&to=*&amount=500&address=${addr}&fromDefault=usd&toDefault=${to}&merchant_id=U-FDw3yOEYkT06Im&payment_id=&v=3&type=no-rev-share&color=5f41ff&headerId=1&logo=hide&buyButtonTextId=1`;
  }, [changellyBuyCrypto, changellyWalletAddress]);

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

  function handleTokenSelect(symbol: string) {
    setSelectedToken(symbol);
    setSelectedWallet(null);
    setSelectedOnramp(null);
    setNewAddress("");
    setNewLabel("");
    const wallets = walletsByToken[symbol];
    if (wallets && wallets.length === 1) {
      setSelectedWallet(wallets[0]);
      if (savedWallets.find((w: any) => w.chain === tokenToChain[symbol])) {
        setStep("instructions");
      } else {
        setStep("address");
      }
    } else {
      setStep("wallet");
    }
  }

  function handleWalletSelect(wallet: WalletOption) {
    setSelectedWallet(wallet);
    setSelectedOnramp(null);
    if (selectedToken && savedWallets.find((w: any) => w.chain === tokenToChain[selectedToken])) {
      setStep("instructions");
    } else {
      setStep("address");
    }
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
    setSelectedOnramp(null);
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
  const swapAlt = selectedToken ? getSwapAlternative(selectedToken, userChains) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <SeoHead
        title="Buy Crypto — XRP, RLUSD, XLM, ETH, BTC & More | CryptoOwnBank"
        description="Step-by-step guide to buying crypto with your card or bank account. Buy XRP, RLUSD, XLM, ETH, BTC, SOL, and more through trusted wallets with built-in on-ramps. Buy RLUSD on Binance or Kraken and earn 5-8% APR in Soil Protocol vaults."
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

      <Card className="border-violet-500/30 bg-gradient-to-r from-violet-500/5 to-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2" data-testid="heading-changelly-widget">
            <CreditCard className="h-5 w-5 text-violet-600" />
            Buy Crypto Instantly
          </CardTitle>
          <CardDescription>
            Buy crypto directly with your card or bank account. Powered by Changelly — fast, secure, and available worldwide.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">I want to buy</label>
              <select
                value={changellyBuyCrypto}
                onChange={(e) => setChangellyBuyCrypto(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                data-testid="select-changelly-buy-crypto"
              >
                {tokens.map((t) => (
                  <option key={t.symbol} value={t.symbol.toLowerCase()}>{t.symbol} — {t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Receiving wallet</label>
              {changellyWalletAddress ? (
                <div className="flex items-center gap-2 h-9 rounded-md border bg-green-500/10 border-green-500/30 px-3" data-testid="changelly-wallet-prefilled">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-sm truncate font-mono">{changellyWalletAddress.slice(0, 8)}...{changellyWalletAddress.slice(-6)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 h-9 rounded-md border bg-yellow-500/10 border-yellow-500/30 px-3" data-testid="changelly-wallet-missing">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">No {changellyBuyCrypto.toUpperCase()} wallet saved — you'll enter it in the widget</span>
                </div>
              )}
            </div>
          </div>
          {changellyWalletAddress && (
            <p className="text-xs text-green-600 dark:text-green-400" data-testid="text-changelly-prefill-note">
              Your saved {changellyBuyCrypto.toUpperCase()} wallet address will be pre-filled in the widget below.
            </p>
          )}
          <div className="rounded-lg overflow-hidden border" style={{ height: "450px" }} data-testid="changelly-widget-container">
            <iframe
              key={changellyBuyUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="camera"
              src={changellyBuyUrl}
              title="Changelly Buy Crypto Widget"
              data-testid="changelly-widget-iframe"
            >
              Can't load widget
            </iframe>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Changelly supports 100+ cryptocurrencies. Transactions are processed by Changelly — CryptoOwnBank never touches your funds.
          </p>
        </CardContent>
      </Card>

      <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2" data-testid="heading-changelly-swap-widget">
            <ArrowRightLeft className="h-5 w-5 text-green-600" />
            Exchange Crypto
          </CardTitle>
          <CardDescription>
            Swap between 500+ cryptocurrencies instantly. No account needed — just select your pair and swap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border" style={{ height: "450px" }} data-testid="changelly-swap-widget-container">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              allow="camera"
              src="https://widget.changelly.com?from=*&to=*&amount=0.1&address=&fromDefault=btc&toDefault=eth&merchant_id=17hPNKintbYkms_z&payment_id=&v=3"
              title="Changelly Exchange Crypto Widget"
              data-testid="changelly-swap-widget-iframe"
            >
              Can't load widget
            </iframe>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Swap any crypto to any crypto. Powered by Changelly — best rates aggregated from multiple exchanges.
          </p>
        </CardContent>
      </Card>

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

          {!user && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold mb-1">New to crypto? Here's the game plan</p>
                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs">1</span>
                        <span><strong>Get a wallet</strong> — pick one above (Xaman for XRP, LOBSTR for Stellar, MetaMask for ETH). It takes 2 minutes.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs">2</span>
                        <span><strong>Buy your first crypto</strong> — use the wallet's built-in buy button, or grab some through NoOnes, ByBarter, or Telegram.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs">3</span>
                        <span><strong>Sign up here and add your wallet</strong> — we'll automatically track your balances, show your portfolio value, and give you tools to trade, swap, earn yield, send payments, and more.</span>
                      </li>
                    </ol>
                  </div>
                </div>
                <Link href="/auth">
                  <Button className="w-full bg-green-600 hover:bg-green-700 gap-2 mt-2" data-testid="button-signup-cta">
                    <Wallet className="h-4 w-4" />
                    Sign Up Free — Start Managing Your Crypto
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

      {step === "wallet" && selectedToken && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {swapAlt && (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Swap instead of buying</p>
                    <p className="text-sm text-muted-foreground mb-2">{swapAlt.message}</p>
                    <Link href={swapAlt.url}>
                      <Button size="sm" className="gap-2 bg-yellow-600 hover:bg-yellow-700" data-testid="button-swap-alternative">
                        <ArrowRightLeft className="h-4 w-4" /> {swapAlt.label}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                      <Badge key={ramp.name} variant="secondary" className="text-[10px]">
                        {ramp.name}
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

                {selectedWallet.deepLink && (() => {
                  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  return isMobile ? (
                    <a href={selectedWallet.deepLink} className="block">
                      <Button variant="outline" className="w-full gap-2 border-green-500/30 text-green-700 hover:bg-green-500/10" data-testid="button-open-wallet-app">
                        <Smartphone className="h-4 w-4" />
                        Open {selectedWallet.name} App
                      </Button>
                    </a>
                  ) : (
                    <a href={selectedWallet.downloadUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="w-full gap-2 border-green-500/30 text-green-700 hover:bg-green-500/10" data-testid="button-open-wallet-app">
                        <Monitor className="h-4 w-4" />
                        Visit {selectedWallet.name} Website
                      </Button>
                    </a>
                  );
                })()}

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

          {swapAlt && (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Quick alternative: Swap instead</p>
                    <p className="text-sm text-muted-foreground mb-2">{swapAlt.message}</p>
                    <Link href={swapAlt.url}>
                      <Button size="sm" className="gap-2 bg-yellow-600 hover:bg-yellow-700" data-testid="button-swap-alt-instructions">
                        <ArrowRightLeft className="h-4 w-4" /> {swapAlt.label}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {savedAddressForToken && (
            <Card className="border-green-500/10 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Your {selectedToken} address</p>
                    <p className="text-sm font-mono truncate" data-testid="text-address-reminder">{savedAddressForToken.address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(savedAddressForToken.address);
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedWallet.onramps.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Choose your on-ramp provider</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedWallet.onramps.map((ramp) => (
                      <Button
                        key={ramp.name}
                        variant={selectedOnramp === ramp.name ? "default" : "outline"}
                        size="sm"
                        className={`gap-1.5 ${selectedOnramp === ramp.name ? "bg-green-600 hover:bg-green-700" : ""}`}
                        onClick={() => setSelectedOnramp(ramp.name)}
                        data-testid={`button-onramp-${ramp.name.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        {ramp.name}
                        {ramp.buildUrl && <ExternalLink className="h-3 w-3 opacity-50" />}
                      </Button>
                    ))}
                  </div>
                  {selectedOnramp && (() => {
                    const ramp = selectedWallet.onramps.find(r => r.name === selectedOnramp);
                    if (ramp?.buildUrl) {
                      const url = ramp.buildUrl({ token: selectedToken, address: savedAddressForToken?.address, walletName: selectedWallet.name });
                      return (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" data-testid="button-buy-via-provider">
                            <ExternalLink className="h-4 w-4" />
                            Buy {selectedToken} via {selectedOnramp}
                            {savedAddressForToken && <span className="text-xs opacity-75">(address pre-filled)</span>}
                          </Button>
                        </a>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {selectedWallet.onramps.length === 1 && selectedWallet.onramps[0].buildUrl && (
                <a
                  href={selectedWallet.onramps[0].buildUrl({ token: selectedToken, address: savedAddressForToken?.address, walletName: selectedWallet.name })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" data-testid="button-buy-direct">
                    <ExternalLink className="h-4 w-4" />
                    Buy {selectedToken} via {selectedWallet.onramps[0].name}
                    {savedAddressForToken && <span className="text-xs opacity-75">(address pre-filled)</span>}
                  </Button>
                </a>
              )}

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Step-by-step guide</p>
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
              </div>

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                {selectedWallet.deepLink && (() => {
                  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  return isMobile ? (
                    <a href={selectedWallet.deepLink}>
                      <Button variant="outline" className="gap-2 border-green-500/30 text-green-700 hover:bg-green-500/10" data-testid="button-open-app">
                        <Smartphone className="h-4 w-4" />
                        Open {selectedWallet.name} App
                      </Button>
                    </a>
                  ) : (
                    <a href={selectedWallet.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2 border-green-500/30 text-green-700 hover:bg-green-500/10" data-testid="button-open-app">
                        <Monitor className="h-4 w-4" />
                        Visit {selectedWallet.name} Website
                      </Button>
                    </a>
                  );
                })()}
                {!selectedWallet.deepLink && (
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
                )}
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
