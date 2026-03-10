import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Wallet,
  ArrowLeft,
  Smartphone,
  Bluetooth,
  Plus,
  Link2,
  Shield,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShoppingCart,
  ScanLine,
  UserCheck,
  Landmark,
  BarChart3,
  BookOpen,
  Store,
  Wifi,
  UserX,
  TrendingUp,
  Key,
  Download,
  CreditCard,
  QrCode,
  ArrowLeftRight,
  Globe,
  Lock,
  Send,
  PiggyBank,
  Search,
  Coins,
  FileText,
  Settings,
  HardDrive,
} from "lucide-react";

interface ToolkitStep {
  number: number;
  icon: any;
  title: string;
  description: string;
  details: string[];
  tip: string;
}

interface Toolkit {
  id: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  tagline: string;
  description: string;
  timeEstimate: string;
  requirements: string[];
  steps: ToolkitStep[];
  completionTitle: string;
  completionText: string;
}

const toolkits: Toolkit[] = [
  {
    id: "beginner",
    label: "New to Crypto",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    tagline: "Never owned crypto? Start here.",
    description: "This guide walks you through everything from scratch — buying your first hardware wallet, setting up a phone wallet, funding your account, and earning yield. No prior knowledge needed.",
    timeEstimate: "30-45 minutes + hardware wallet shipping",
    requirements: [
      "A smartphone (iPhone or Android)",
      "An internet connection",
      "A way to buy crypto (bank account or debit card linked to an exchange)",
      "About $50-100 to start (for XRP reserves + initial RLUSD)",
      "Optional but recommended: a hardware cold wallet ($60-150)",
    ],
    steps: [
      {
        number: 1,
        icon: Key,
        title: "Understand Hot Wallets vs Cold Wallets",
        description: "Before you set anything up, understand the two types of crypto wallets.",
        details: [
          "A HOT wallet is an app on your phone (like Xaman). It's connected to the internet, making it convenient for daily use — sending, receiving, signing transactions",
          "A COLD wallet is a physical device (like Ledger Nano X, ELLIPAL Titan, Arculus Card, or SafePal). It stores your private keys OFFLINE, which makes it much harder to hack",
          "The best setup: use BOTH together. Your cold wallet holds your keys safely offline. Your hot wallet (Xaman) connects to the cold wallet and acts as the interface — you see your balances and approve transactions on your phone, but the actual signing happens on the cold wallet device",
          "Think of it like this: the cold wallet is your vault, the hot wallet is the teller window. The vault keeps the money safe; the teller window lets you do business",
          "You CAN start with just a hot wallet (Xaman) and add a cold wallet later. But for larger amounts, a cold wallet is strongly recommended",
        ],
        tip: "Your seed phrase (12 or 24 words given during setup) is the master key to your wallet. Write it down on paper, store it somewhere safe and offline. NEVER type it into a website or share it with anyone. If someone has your seed phrase, they have your money.",
      },
      {
        number: 2,
        icon: HardDrive,
        title: "Buy a Cold Wallet (Recommended)",
        description: "Order a hardware wallet to keep your private keys offline and secure.",
        details: [
          "Ledger Nano X (~$149) — Bluetooth, pairs with Xaman, most popular for XRPL. Buy ONLY from ledger.com",
          "ELLIPAL Titan (~$139) — Air-gapped (no Bluetooth/USB), uses QR codes. Buy from ellipal.com",
          "Arculus Card (~$99) — Credit-card sized, NFC tap to sign. Buy from getarculus.com",
          "SafePal S1 (~$49) — Budget option, air-gapped with QR codes. Buy from safepal.com",
          "IMPORTANT: Always buy directly from the manufacturer's website — never from third-party Amazon/eBay sellers (risk of tampered devices)",
          "While waiting for your cold wallet to arrive, you can proceed with steps 3-5 using just the Xaman hot wallet. Add the cold wallet connection later",
        ],
        tip: "The Ledger Nano X is the most common choice for XRPL because it pairs directly with Xaman via Bluetooth. But any of these work — pick the one that fits your budget and comfort level. Compare all cold wallets in the Cold Wallets tab of your Recommendations Hub on the OwnBank dashboard.",
      },
      {
        number: 3,
        icon: Download,
        title: "Download Xaman (Your Hot Wallet)",
        description: "Install the Xaman wallet app on your phone — this is your gateway to the XRPL.",
        details: [
          "Download Xaman (formerly Xumm) from the App Store (iPhone) or Google Play (Android)",
          "Open the app and create a new account — follow the on-screen prompts",
          "Xaman will generate your XRPL wallet address (starts with 'r...')",
          "CRITICAL: Write down your secret recovery phrase (seed words) on paper. Store it somewhere safe. This is the ONLY way to recover your wallet if you lose your phone",
          "Set up a PIN or biometric lock (fingerprint/face) for the app",
          "Your wallet address is public and safe to share — it's like an email address for money. Your seed phrase is private and must NEVER be shared",
        ],
        tip: "If you have a cold wallet ready, you can instead import your cold wallet's XRPL account into Xaman rather than creating a new one. Go to Settings → Accounts → Import → Hardware Wallet.",
      },
      {
        number: 4,
        icon: Bluetooth,
        title: "Connect Cold Wallet to Xaman (If You Have One)",
        description: "Pair your hardware wallet so Xaman uses it for signing — your keys stay offline.",
        details: [
          "For Ledger Nano X: Open Xaman → Settings → Hardware Wallets → Ledger. Enable Bluetooth on your phone. Unlock your Ledger, open the XRP app. Xaman will detect it automatically. Confirm pairing on both devices",
          "For Arculus Card: Open Xaman → Settings → Hardware Wallets → Arculus. Tap your Arculus card against the back of your phone (NFC). Follow the prompts to pair",
          "For ELLIPAL/SafePal (air-gapped): These use QR code scanning. In Xaman, choose Import Account → Read-only address. You'll sign transactions by scanning QR codes between your phone and the device",
          "Once paired, your Xaman app shows your balances and lets you initiate transactions, but every transaction requires physical confirmation on your cold wallet device",
          "If you don't have a cold wallet yet, skip this step — Xaman works standalone. You can add one later",
        ],
        tip: "After pairing, Xaman becomes a 'viewing window' for your cold wallet. You see everything on your phone, but the private keys never leave the hardware device. This is the ideal security setup.",
      },
      {
        number: 5,
        icon: CreditCard,
        title: "Buy XRP and Fund Your Wallet",
        description: "Purchase XRP on an exchange and send it to your XRPL wallet to activate it.",
        details: [
          "Create an account on a crypto exchange: Coinbase, Kraken, Uphold, Crypto.com, or Binance",
          "Complete their identity verification (KYC) — usually a photo ID and selfie",
          "Buy at least 15-20 XRP ($10-15 at current prices) — you need a minimum of 10 XRP as the XRPL account reserve, plus a few more for transaction fees and trust line reserves",
          "Go to Withdraw → select XRP → choose XRP Ledger (XRPL) as the network",
          "Paste your XRPL wallet address from Xaman (the 'r...' address)",
          "Some exchanges require a destination tag — if your personal wallet doesn't need one, you can enter 0 or leave it blank (check exchange instructions)",
          "Send a small test amount first (e.g., 15 XRP) to make sure everything works",
          "The XRP should arrive in your Xaman wallet within seconds",
        ],
        tip: "The 10 XRP account reserve is locked by the XRPL network (not by any company) — it's required to keep your account active on the ledger. Each trust line you add reserves an additional ~2 XRP. These reserves are returned if you ever close the account or remove trust lines.",
      },
      {
        number: 6,
        icon: Plus,
        title: "Set Up Trust Lines (RLUSD and More)",
        description: "Enable your wallet to hold tokens like RLUSD by setting up trust lines on the XRPL.",
        details: [
          "A 'trust line' tells the XRPL that your account accepts a specific token. Without a trust line for RLUSD, nobody can send you RLUSD",
          "In Xaman: tap the '+' button or go to Add Token → search for 'RLUSD' → tap 'Set Trust Line'",
          "If using a cold wallet: your Ledger/Arculus will prompt you to physically confirm the TrustSet transaction",
          "You can also use CryptoOwnBank's Token Manager page to set up trust lines — it shows 'Old Way' (manual) vs 'New Way' (one-click through CryptoOwnBank) for each token",
          "Recommended trust lines to start: RLUSD (Ripple's dollar-pegged stablecoin) and optionally SOLO (community token for the Sologenic ecosystem)",
          "Each trust line reserves approximately 2 XRP from your account balance",
        ],
        tip: "RLUSD is pegged 1:1 to the US dollar by Ripple Labs. It's designed for stability — if crypto prices swing, your RLUSD stays at $1. This makes it ideal for savings, payments, and earning yield.",
      },
      {
        number: 7,
        icon: Link2,
        title: "Sign Up for CryptoOwnBank and Connect Your Wallet",
        description: "Create your free account and link your wallet to the dashboard.",
        details: [
          "Go to cryptoownbank.com and click 'Get Started Free'",
          "Sign up with your email — no KYC required on our end",
          "Once logged in, go to OwnBank Dashboard → Connect Wallet → Connect Xumm",
          "A QR code appears — scan it with Xaman (or tap the deep link on mobile)",
          "Approve the connection request in Xaman (and confirm on cold wallet if paired)",
          "Your wallet address, XRP balance, RLUSD balance, and trust lines will appear on the dashboard",
          "This is a READ-ONLY connection — we only see your public address. We never see or store your keys",
        ],
        tip: "The free tier gives you access to all XRPL tools (Token Manager, DEX Trading, Send & Receive), plus 1 exchange connection, 1 wallet address, and 1 price alert. Upgrade to Premium when you need more.",
      },
      {
        number: 8,
        icon: Landmark,
        title: "Buy RLUSD and Deposit into a Soil Vault",
        description: "Purchase RLUSD, withdraw it to your wallet, and start earning 5-8% APR.",
        details: [
          "On your exchange (Coinbase, Kraken, Uphold, etc.), buy RLUSD",
          "Withdraw RLUSD to your XRPL wallet address — make sure you select the XRPL network",
          "From CryptoOwnBank, go to OwnBank → Vaults → click 'Deposit RLUSD'",
          "You'll be redirected to Soil Protocol (xrpl.soil.co) — connect your wallet there too",
          "Complete Soil's KYC verification (passport/ID + selfie — one-time process)",
          "Choose a vault: Treasury (~5.2% APR, 3-day withdrawal) or CREDIT+ (8.0% APR, 90-day notice)",
          "Enter deposit amount → scan QR with Xaman → confirm on cold wallet → done",
          "Interest accrues daily and compounds automatically if you don't withdraw it",
        ],
        tip: "You can split RLUSD across both vaults — some in Treasury for quick access, some in CREDIT+ for higher yield. Start small and add more as you get comfortable.",
      },
      {
        number: 9,
        icon: BarChart3,
        title: "Track Everything from Your Dashboard",
        description: "Monitor your portfolio, yield, and transactions — all in one place.",
        details: [
          "Your CryptoOwnBank dashboard shows your XRPL wallet balances, vault positions, and accrued interest",
          "Set up price alerts to get notified when XRP, RLUSD, or any token hits your target price",
          "Use the Portfolio page to see your total holdings across all connected exchanges and wallets",
          "Explore the Recommendations Hub to see yield opportunities for every asset you hold",
          "When you're ready, explore the DEX for trading and Send & Receive for payments",
          "Premium members get unlimited exchange connections, full transaction history, and tax reports",
        ],
        tip: "Congratulations — you just set up a complete crypto banking system. You own your keys, you earn yield, you track everything, and no bank sits between you and your money. Welcome to being your own bank.",
      },
    ],
    completionTitle: "You're Your Own Bank Now",
    completionText: "You've gone from zero to a fully operational crypto financial system: cold wallet security, hot wallet convenience, RLUSD for stability, yield from Soil vaults, and CryptoOwnBank as your dashboard. Your keys never left your device, and nobody can freeze your account or take your money. This is what financial sovereignty looks like.",
  },
  {
    id: "existing",
    label: "Existing Crypto User",
    icon: Coins,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    tagline: "Already have crypto? Consolidate and level up.",
    description: "You've got crypto on exchanges, in wallets, maybe across multiple chains. This guide shows you how to bring it all into one dashboard, discover yield opportunities, and unlock XRPL tools.",
    timeEstimate: "15-20 minutes",
    requirements: [
      "Existing exchange accounts (Coinbase, Kraken, Crypto.com, Binance, etc.)",
      "Wallet addresses you want to track (any of 24 supported blockchains)",
      "API keys from your exchanges (read-only — we never need trade/withdraw permissions)",
      "Optional: Xaman wallet app if you want to use XRPL tools",
    ],
    steps: [
      {
        number: 1,
        icon: UserCheck,
        title: "Sign Up for CryptoOwnBank",
        description: "Create your free account — no KYC required on our end.",
        details: [
          "Go to cryptoownbank.com and click 'Get Started Free'",
          "Sign up with your email address",
          "Confirm your email and log in",
          "You'll land on the Dashboard — currently empty, about to change",
        ],
        tip: "The free tier gives you 1 exchange connection, 1 wallet address, 1 price alert, and 7-day transaction history. If you have multiple exchanges or wallets, Premium ($29/mo or $199/yr) unlocks unlimited everything.",
      },
      {
        number: 2,
        icon: Link2,
        title: "Connect Your Exchanges",
        description: "Link your exchange accounts via API keys to pull in balances and transactions.",
        details: [
          "Go to Integrations in the sidebar",
          "Click 'Add Exchange' and choose your exchange (Coinbase, Kraken, Crypto.com, Binance, etc.)",
          "Log into your exchange and generate a READ-ONLY API key (we never need trade or withdraw permissions)",
          "Paste the API key and secret into CryptoOwnBank",
          "Your exchange balances, positions, and transaction history will sync automatically",
          "Repeat for each exchange you use (free tier: 1 exchange, Premium: unlimited)",
        ],
        tip: "Always create read-only API keys. CryptoOwnBank only needs to see your balances and history — we never execute trades or withdrawals on your behalf.",
      },
      {
        number: 3,
        icon: Wallet,
        title: "Add Your Blockchain Wallet Addresses",
        description: "Track cold wallets, hot wallets, and any on-chain addresses across 24 blockchains.",
        details: [
          "Go to Wallets in the sidebar → click 'Add Wallet'",
          "Select the blockchain (BTC, ETH, SOL, XRP, ADA, AVAX, DOT, ATOM, TRX, HBAR, VET, TON, and more)",
          "Paste your PUBLIC wallet address — we only read on-chain data, never your private keys",
          "Ethereum addresses automatically detect all ERC-20 tokens in your wallet",
          "Solana addresses automatically detect SPL tokens; VeChain detects VET + VTHO",
          "XRP addresses detect trust line tokens like RLUSD",
          "Each wallet's balance is mapped to live CoinGecko prices for portfolio valuation",
        ],
        tip: "If you've been using Ledger Live or Yahoo Finance, you can also import transaction history via CSV upload to build your complete cost basis.",
      },
      {
        number: 4,
        icon: BarChart3,
        title: "See Your Full Portfolio in One Dashboard",
        description: "All your exchanges and wallets, consolidated into a single view.",
        details: [
          "The Dashboard shows your total portfolio value across all connected sources",
          "The Portfolio page breaks down holdings by asset, with cost basis, current value, and P&L",
          "Search, filter, and sort your holdings — find any asset instantly",
          "Transaction history shows every buy, sell, transfer, and fee across all sources",
          "Set price alerts to get email notifications when any asset hits your target",
          "The Recommendations Hub analyzes your holdings and shows yield opportunities — clearly labeled as on-chain (you keep your keys) or custodial (company holds assets)",
        ],
        tip: "If you discover you're holding assets with high yield opportunities (like RLUSD in Soil vaults or staking-eligible tokens), the Recommendations Hub will surface those — so you're not leaving money on the table.",
      },
      {
        number: 5,
        icon: Smartphone,
        title: "Set Up an XRPL Wallet (If You Don't Have One)",
        description: "To use XRPL tools (DEX, payments, vaults), you need an XRPL wallet.",
        details: [
          "Download Xaman (formerly Xumm) from the App Store or Google Play",
          "Create a new XRPL account or import an existing one",
          "Your wallet needs at least 10 XRP as the network account reserve",
          "If you already have XRP on an exchange, withdraw it to your new Xaman address",
          "Optional but recommended: pair Xaman with a hardware wallet (Ledger, Arculus, etc.) for cold storage security",
          "On CryptoOwnBank, go to OwnBank Dashboard → Connect Wallet → Connect Xumm to link your XRPL wallet",
        ],
        tip: "If you already have an XRPL wallet (from Xaman, Ledger, or another app), just connect it to CryptoOwnBank — no need to create a new one.",
      },
      {
        number: 6,
        icon: TrendingUp,
        title: "Explore Yield Opportunities",
        description: "Discover where your existing holdings can earn yield — on-chain or through Soil vaults.",
        details: [
          "The Recommendations Hub (sidebar) analyzes every asset in your portfolio",
          "Each recommendation shows: protocol name, estimated APR/APY, whether it's on-chain or custodial, and risk level",
          "For RLUSD holders: Soil Protocol vaults offer 5-8% fixed APR backed by US Treasuries and private credit",
          "For XRP holders: staking and lending opportunities are surfaced as they become available (XLS-66 lending coming soon)",
          "For ETH, SOL, ADA, ATOM, DOT holders: native staking and DeFi opportunities are shown",
          "Use the Yield Calculator to project earnings over time at different APR rates",
        ],
        tip: "We label everything clearly: 'on-chain' means you keep your keys and interact directly with a protocol. 'Custodial' means a company holds your assets. The choice is always yours.",
      },
      {
        number: 7,
        icon: ArrowLeftRight,
        title: "Use XRPL Tools — DEX, Token Manager, Send & Receive",
        description: "Trade, manage tokens, and send payments directly on the XRP Ledger.",
        details: [
          "Token Manager: set up and remove trust lines, see all available XRPL tokens, manage your token portfolio",
          "DEX Trading: trade any XRPL token pair on the built-in decentralized exchange — limit orders and market orders, no exchange account needed",
          "Send & Receive: send XRP, RLUSD, or any XRPL token to any address. Save contacts in your address book. Receive via your wallet address or QR code",
          "All three tools are in the OwnBank section of the sidebar",
          "Every transaction is signed by your wallet (Xaman/cold wallet) — CryptoOwnBank submits transactions to the XRPL on your behalf, but we never have your keys",
          "These tools are available on the free tier — no Premium required",
        ],
        tip: "The DEX is particularly powerful for existing crypto users: you can swap between XRPL tokens without an exchange account, without KYC, and without fees beyond the tiny XRPL network cost (~0.00001 XRP).",
      },
    ],
    completionTitle: "Your Crypto Command Center Is Ready",
    completionText: "All your exchanges and wallets are consolidated in one dashboard. You can see your entire portfolio, track performance, discover yield opportunities, and use XRPL tools for trading, payments, and token management. No more switching between five different apps.",
  },
  {
    id: "business",
    label: "Business / Point of Sale",
    icon: Store,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    tagline: "Accept crypto payments for your business.",
    description: "Set up your business to accept payments in RLUSD, XRP, or any XRPL token. No payment processor, no 2.9% fees, no chargebacks. Customers pay directly to your wallet — you keep every penny.",
    timeEstimate: "20-30 minutes",
    requirements: [
      "A smartphone (iPhone or Android)",
      "A way to display a QR code to customers (phone screen, printed, or tablet)",
      "XRP for wallet activation (~15 XRP / ~$10)",
      "Recommended: a cold wallet for securing business funds",
    ],
    steps: [
      {
        number: 1,
        icon: Smartphone,
        title: "Set Up Your Business XRPL Wallet",
        description: "Create the wallet where customer payments will land.",
        details: [
          "Download Xaman (formerly Xumm) from the App Store or Google Play",
          "Create a new XRPL account — this will be your business payment wallet",
          "Write down and securely store your recovery phrase — if you lose this, you lose access to all your business funds",
          "Strongly recommended: pair with a cold wallet (Ledger Nano X, Arculus, ELLIPAL) for extra security. Business funds deserve hardware protection",
          "Fund your wallet with at least 15 XRP (buy on Coinbase, Kraken, or Uphold and withdraw to your XRPL address)",
          "Consider having a separate wallet for business vs personal — easier for accounting",
        ],
        tip: "For a business, a cold wallet is not optional — it's essential. You're holding customer revenue. Protect it the same way you'd protect a cash register, but better.",
      },
      {
        number: 2,
        icon: Plus,
        title: "Add RLUSD Trust Line",
        description: "Enable your wallet to receive RLUSD — a dollar-pegged stablecoin ideal for business payments.",
        details: [
          "In Xaman: tap '+' → search 'RLUSD' → tap 'Set Trust Line'",
          "If using a cold wallet: confirm the TrustSet transaction on your hardware device",
          "Or use CryptoOwnBank's Token Manager (OwnBank → Token Manager) to set up trust lines with one click",
          "Why RLUSD? It's pegged 1:1 to the US dollar by Ripple Labs. When a customer pays you 100 RLUSD, you receive $100 in value — no crypto volatility risk",
          "You can also add trust lines for other tokens if you want to accept them (XRP is accepted by default — no trust line needed)",
          "Each trust line reserves approximately 2 XRP from your balance",
        ],
        tip: "RLUSD is the ideal business payment token: dollar-stable, fast (4-second settlement), and backed by Ripple. Your pricing stays simple — $50 in RLUSD is always $50.",
      },
      {
        number: 3,
        icon: Link2,
        title: "Sign Up for CryptoOwnBank and Connect",
        description: "Create your free account and link your business wallet.",
        details: [
          "Go to cryptoownbank.com and click 'Get Started Free'",
          "Sign up with your business email",
          "Go to OwnBank Dashboard → Connect Wallet → Connect Xumm",
          "Scan the QR code with Xaman to connect",
          "Your wallet address, XRP balance, and RLUSD balance will appear",
          "CryptoOwnBank becomes your business payment dashboard — track every incoming payment",
        ],
        tip: "CryptoOwnBank is your tooling layer — we give you the tools to process your own payments. We never touch your funds, never take a percentage, and never sit between you and your customer.",
      },
      {
        number: 4,
        icon: QrCode,
        title: "Share Your Payment Address with Customers",
        description: "Give customers your wallet address or QR code so they can pay you directly.",
        details: [
          "Your XRPL wallet address (starts with 'r...') is your payment address — like a business bank account number, but on the blockchain",
          "In Xaman, tap 'Receive' to see your QR code — customers scan this to pay",
          "Print the QR code and display it at your point of sale (counter, register, or table)",
          "For online businesses: share your wallet address on invoices, your website, or in email",
          "On CryptoOwnBank's Send & Receive page, you can also display your QR code and specify the amount and currency",
          "Tell customers the amount and currency: 'Send 50 RLUSD to this address' or 'Scan this QR code'",
        ],
        tip: "For walk-in businesses, a printed QR code at the register is the simplest setup. Customer opens their wallet app, scans, enters the amount, and sends. You see the payment in your wallet within 4 seconds.",
      },
      {
        number: 5,
        icon: CheckCircle2,
        title: "Accept Your First Payment",
        description: "A customer pays — here's what happens step by step.",
        details: [
          "Customer opens their XRPL wallet (Xaman or any XRPL-compatible wallet)",
          "They scan your QR code or paste your wallet address",
          "They enter the payment amount (e.g., 50 RLUSD) and tap 'Send'",
          "They approve the transaction in their wallet (and on their cold wallet if they have one)",
          "The XRPL processes the transaction in approximately 4 seconds",
          "The RLUSD (or XRP, or whatever token) appears in YOUR wallet immediately — you now have it",
          "No processing delay, no 2-day settlement, no pending status. The money is yours the moment the transaction confirms",
          "The XRPL network fee is approximately 0.00001 XRP — a fraction of a fraction of a penny",
        ],
        tip: "Compare this to Stripe: customer pays $50, Stripe takes $1.75 (2.9% + $0.30), you get $48.25 in 2 days. On the XRPL: customer pays 50 RLUSD, you get 50 RLUSD in 4 seconds. No middleman, no cut, no delay.",
      },
      {
        number: 6,
        icon: ArrowLeftRight,
        title: "Convert Currencies on the DEX (If Needed)",
        description: "If a customer pays in XRP but you want RLUSD, swap it on the built-in exchange.",
        details: [
          "Go to OwnBank → DEX Trading on CryptoOwnBank",
          "Select the trading pair (e.g., XRP/RLUSD)",
          "Enter the amount you want to convert and choose market order (instant) or limit order (set your price)",
          "Sign the transaction with your wallet — the swap executes on the XRPL's decentralized order book",
          "The XRPL DEX has no signup, no KYC, no exchange account needed — it's built into the ledger itself",
          "Cross-currency payments can also happen automatically: if a customer sends XRP and you want RLUSD, the XRPL can route it using XRP as a bridge currency",
        ],
        tip: "The DEX is the XRPL's built-in exchange. It's not run by any company — it's part of the blockchain itself. Trading fees are just the XRPL network fee, plus the spread between buy and sell orders.",
      },
      {
        number: 7,
        icon: BarChart3,
        title: "Track Payments and Manage Business Funds",
        description: "Monitor incoming payments, balances, and transaction history.",
        details: [
          "CryptoOwnBank's Dashboard shows all incoming and outgoing transactions in real time",
          "The Send & Receive page has an address book — save regular customers and suppliers for quick payments",
          "Use the Portfolio page to see your total business crypto holdings",
          "Set price alerts if you hold XRP and want to be notified of price movements",
          "For daily operations: check your XRPL wallet balance in Xaman anytime — it updates in real time",
          "Consider moving business savings into a Soil vault to earn 5-8% APR on idle RLUSD (instead of leaving it in a checking account earning 0%)",
        ],
        tip: "Separate business and personal wallets. This makes accounting cleaner and tax reporting simpler. You can connect both to CryptoOwnBank on separate accounts.",
      },
      {
        number: 8,
        icon: FileText,
        title: "Premium Features for Growing Businesses",
        description: "As your payment volume grows, Premium unlocks powerful business tools.",
        details: [
          "Tax Reports: export all transactions for your accountant — FIFO and LIFO cost basis methods, CSV exports for tax filing",
          "Full Transaction History: see every payment ever received, not just 7 days",
          "Unlimited Wallet Tracking: track multiple business wallets and exchange accounts",
          "Statement Insights: analyze your transaction patterns and cash flow",
          "Reconciliation Tools: match incoming payments against invoices or expected amounts",
          "Premium is $29/month or $199/year — on a business doing $5,000/month in payments, the savings from not paying Stripe's 2.9% ($145/month) more than cover the subscription",
        ],
        tip: "The math: Stripe costs $1,740/year on $5,000/month revenue. CryptoOwnBank Premium costs $199/year. That's $1,541/year you keep — while getting better tools and instant settlement.",
      },
    ],
    completionTitle: "Your Business Is Now Its Own Payment Processor",
    completionText: "You're set up to accept crypto payments with zero processing fees, 4-second settlement, and no chargebacks. Display your QR code, receive payments directly to your wallet, convert currencies on the DEX, and track everything from CryptoOwnBank. No Stripe, no PayPal, no middleman. Your business, your money, your rules.",
  },
  {
    id: "unbanked",
    label: "Unbanked / Debanked",
    icon: Wifi,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    tagline: "No bank account? No problem. Internet is enough.",
    description: "Whether you've never had a bank account or lost access to one, this guide shows you how to build a complete financial system using just a smartphone and an internet connection. Receive payments, hold stable dollars, earn yield, and participate in global commerce — no bank required.",
    timeEstimate: "10-15 minutes to start (wallet only), 30 minutes for full setup",
    requirements: [
      "A smartphone (iPhone or Android) with internet access",
      "That's it. No bank account. No credit check. No government ID (for CryptoOwnBank — Soil KYC is separate). No minimum balance. No physical address required",
    ],
    steps: [
      {
        number: 1,
        icon: Wifi,
        title: "All You Need Is a Smartphone with Internet",
        description: "The only requirement for global financial access is now a phone with internet.",
        details: [
          "Traditional banking requires: a physical bank branch, government-issued ID, proof of address, minimum deposit, credit history, and often a referral or existing relationship",
          "The XRPL requires: an internet connection. That's the complete list",
          "No credit check. No minimum balance. No monthly fees. No application to be denied",
          "The same tools, same fees (fractions of a penny), and same 4-second settlement — whether you're in New York, Nairobi, Manila, or São Paulo",
          "And here's what makes crypto fundamentally different from fiat: 1 XRP held by someone in America has the exact same value as 1 XRP held by someone in Nigeria, Argentina, or anywhere else. There's no currency depreciation working against you. No exchange rate penalty for living in the wrong country. Your money holds the same value as everyone else's — for the first time in history, the financial playing field is actually level",
          "If you were debanked (account closed, funds frozen, service denied), the XRPL gives you back everything they took: the ability to receive, hold, send, and earn on your money",
        ],
        tip: "Being 'unbanked' or 'debanked' is not a character flaw — it's a system failure. 1.4 billion people worldwide have no bank access. Millions more have been cut off by algorithms and compliance departments. The XRPL exists as the alternative.",
      },
      {
        number: 2,
        icon: Download,
        title: "Download Xaman — Your Wallet Is Your Bank Account",
        description: "Install the Xaman wallet app. This replaces a bank account, debit card, and savings account — all in one.",
        details: [
          "Download Xaman (formerly Xumm) from the App Store (iPhone) or Google Play (Android)",
          "Open the app and create a new account — takes about 2 minutes",
          "Xaman will generate your XRPL wallet address (starts with 'r...'). This is like a bank account number — you give it to people who want to pay you",
          "IMPORTANT: Write down your recovery phrase (the secret words) on paper. Store it somewhere safe. This is the ONLY way to recover your wallet. If you lose your phone and don't have these words, your money is gone",
          "Set up a PIN or fingerprint lock on the app",
          "Your wallet is now LIVE — anyone in the world can send you money to this address",
        ],
        tip: "Your wallet address is safe to share — it's public, like an email address. Your recovery phrase (seed words) is private — never share it, never type it into any website. Anyone with those words controls your money.",
      },
      {
        number: 3,
        icon: Send,
        title: "Get Paid in Crypto — Skip Fiat Entirely",
        description: "You don't need to 'buy' crypto first. Get paid for your work, your goods, or your services directly in crypto.",
        details: [
          "To activate your XRPL wallet, someone needs to send you at least 10 XRP (the network account reserve — required by the blockchain, not by any company)",
          "Here's the key insight: you don't need a bank account or an exchange to get crypto. You just need to EARN it. Sell goods, provide a service, do work — and get paid in XRP or RLUSD instead of cash",
          "Example: A farmer sells produce at a market. The buyer opens their Xaman wallet, scans the farmer's QR code, and sends 25 RLUSD. Done. The farmer now has $25 in digital dollars — no bank involved at any point",
          "Share your wallet address (the 'r...' address from Xaman) or show your QR code (tap 'Receive' in Xaman)",
          "Payment arrives in about 4 seconds. No waiting for bank clearance, no processing fees, no trip to a bank branch",
          "If you need someone to send you the initial 10 XRP to activate your wallet: ask a friend, a customer, or a community member who already uses crypto. Once activated, you can receive any amount from anyone",
          "Peer-to-peer options also exist: crypto ATMs, local Bitcoin/XRP marketplaces, and mobile money on-ramps (varies by region)",
        ],
        tip: "This is the biggest mental shift: you don't need to convert from fiat to crypto. You can start earning in crypto from day one. If you grow food, make crafts, offer services, or do any kind of work — someone in the world will pay you in RLUSD or XRP. That's your on-ramp. No bank, no exchange, no conversion.",
      },
      {
        number: 4,
        icon: Plus,
        title: "Set Up Trust Lines to Hold Stablecoins",
        description: "Add RLUSD to your wallet — a dollar-pegged stablecoin that protects against local currency inflation.",
        details: [
          "RLUSD is pegged 1:1 to the US dollar by Ripple Labs. If your local currency is losing value, holding RLUSD preserves your purchasing power in dollars",
          "In Xaman: tap '+' → search 'RLUSD' → tap 'Set Trust Line' → approve",
          "This is a one-time setup that costs about 2 XRP in reserve (locked, not spent)",
          "Once the trust line is set, anyone can send you RLUSD and you can hold it in your wallet",
          "You can also use CryptoOwnBank's Token Manager for a guided trust line setup",
          "Why this matters: if you sell 50 kg of rice today for local currency, that money might lose 10-30% of its value in a year due to inflation. If you sell it for RLUSD, you're holding US dollars — a much more stable store of value. And unlike fiat, 1 RLUSD in your wallet is worth the same $1 whether you're in Lagos or London — no exchange rate working against you",
        ],
        tip: "RLUSD is your inflation shield. A farmer in Nigeria, Argentina, or Turkey who holds RLUSD instead of local currency is protecting their earnings from devaluation — and they can still spend it instantly when they need to.",
      },
      {
        number: 5,
        icon: ArrowLeftRight,
        title: "Spend Crypto — Pay Others Who Accept It",
        description: "Use the same system in reverse: pay suppliers, vendors, and anyone else with an XRPL wallet.",
        details: [
          "This is where the circular economy starts: you earn in crypto AND spend in crypto. No fiat conversion needed at any point",
          "Example: A farmer sells produce for RLUSD → uses some of that RLUSD to buy seeds from a supplier who also accepts RLUSD → saves the rest in a yield vault",
          "To pay someone: open CryptoOwnBank → Send & Receive → enter their wallet address or scan their QR code → enter the amount → sign with Xaman",
          "If the person you're paying doesn't have a wallet yet, help them set one up — it takes 2 minutes. Then you've expanded the network",
          "Save frequent contacts (customers, suppliers, family) in the address book for quick repeat payments",
          "The more people in your community using XRPL wallets, the less anyone needs a bank. Each new wallet makes the network more useful for everyone",
        ],
        tip: "Every person you help set up a wallet is one more person you can transact with directly. A village where 20 people have XRPL wallets is a village with its own financial system — no bank branch required. You become the network.",
      },
      {
        number: 6,
        icon: Link2,
        title: "Sign Up for CryptoOwnBank",
        description: "Create your free account to track and manage your funds with a clean dashboard.",
        details: [
          "Go to cryptoownbank.com → Get Started Free",
          "Sign up with your email (no government ID required, no KYC on our end)",
          "Go to OwnBank Dashboard → Connect Wallet → scan the QR code with Xaman",
          "Your balances, trust lines, and transaction history appear on the dashboard",
          "Use the Send & Receive page to send payments — save frequent contacts in the address book",
          "Use the Token Manager to manage your trust lines visually",
          "All XRPL tools are available on the free tier — Token Manager, DEX, Send & Receive",
        ],
        tip: "CryptoOwnBank is the dashboard for your financial life. Think of Xaman as the wallet in your pocket, and CryptoOwnBank as the online banking portal — except nobody can lock you out.",
      },
      {
        number: 7,
        icon: PiggyBank,
        title: "Save and Earn Yield — Your Money Works for You",
        description: "Deposit RLUSD into Soil Protocol vaults and earn 5-8% APR — more than most bank savings accounts anywhere in the world.",
        details: [
          "From CryptoOwnBank, go to OwnBank → Vaults",
          "Soil Protocol offers two vault options: Treasury (~5.2% APR, backed by US Treasuries) and CREDIT+ (8.0% APR, backed by private credit)",
          "Click 'Deposit RLUSD' → you'll be redirected to Soil Protocol's site",
          "Connect your wallet and complete KYC verification (passport or ID — required for regulated yield products)",
          "Choose a vault, enter your deposit amount, and sign with your wallet",
          "Interest accrues daily and compounds automatically. Compare: most bank savings accounts pay 0.01-0.5%. Soil pays 5-8%",
          "Your principal stays locked (protected). Only interest can be withdrawn — this protects your savings from impulse spending",
          "Example: A farmer saves 500 RLUSD from a good harvest season. At 8% APR, that earns ~40 RLUSD in a year — money that grew while sitting safely in a vault, not under a mattress losing value",
        ],
        tip: "This is savings that actually works: dollar-stable, earning real yield, protected from impulse withdrawals, and accessible from anywhere with internet. No bank has ever offered this to someone without an account.",
      },
      {
        number: 8,
        icon: Globe,
        title: "Send Money Anywhere in the World — 4 Seconds",
        description: "Send XRP, RLUSD, or any XRPL token to anyone with an XRPL wallet, anywhere on Earth.",
        details: [
          "Go to OwnBank → Send & Receive on CryptoOwnBank",
          "Enter the recipient's XRPL wallet address (or scan their QR code)",
          "Choose the token (XRP, RLUSD, etc.) and enter the amount",
          "Sign the transaction with Xaman → payment settles in about 4 seconds",
          "Cost: approximately 0.00001 XRP (less than $0.001). Compare: Western Union charges $5-50, banks charge $25-50 for international wires",
          "No intermediary banks, no SWIFT codes, no correspondent chains, no 3-5 day waits",
          "Family remittances: a relative working abroad can send RLUSD directly to your wallet. No middleman taking 5-10% off the top",
        ],
        tip: "Remittances are a $700+ billion global market, and companies like Western Union and MoneyGram take 5-10% in fees. On the XRPL, the same transfer costs a fraction of a penny. That difference is food on the table.",
      },
      {
        number: 9,
        icon: Shield,
        title: "Optional: Add a Cold Wallet as Your Balance Grows",
        description: "When you're holding meaningful amounts, add hardware security.",
        details: [
          "A cold wallet (Ledger, ELLIPAL, Arculus, SafePal) stores your private keys on a physical device, offline",
          "Even if your phone is stolen or hacked, nobody can move your funds without the cold wallet device",
          "Prices range from $49 (SafePal) to $149 (Ledger Nano X)",
          "Pair it with Xaman so you still use your phone for day-to-day transactions, but the actual signing happens on the cold wallet",
          "This is optional but strongly recommended once you're holding more than a few hundred dollars",
          "Buy only from the manufacturer's official website — never from third-party sellers",
        ],
        tip: "Think of the cold wallet upgrade like putting a lock on your door. When you had nothing, it didn't matter. Now that you have savings, yield, and incoming payments — protect them.",
      },
    ],
    completionTitle: "You're In. No Bank Required.",
    completionText: "You've built a complete financial system with a phone and an internet connection. Earn in crypto by selling goods and services. Hold RLUSD to protect against inflation. Save in yield vaults that pay 5-8%. Spend by paying others who accept crypto. Send money across the world in 4 seconds for fractions of a penny. Every person you help set up a wallet grows the network and makes banks less necessary. This is financial access without permission — and it started with a smartphone.",
  },
  {
    id: "yield",
    label: "Yield Seeker / Saver",
    icon: TrendingUp,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    tagline: "Already have RLUSD? Start earning 5-8% APR.",
    description: "You know the basics. You have RLUSD or know how to get it. This guide is a straight line from wallet setup to earning yield through Soil Protocol vaults — the fastest path to passive income on the XRPL.",
    timeEstimate: "15-20 minutes",
    requirements: [
      "Xaman wallet app installed",
      "RLUSD in your XRPL wallet (or the ability to buy and withdraw it from an exchange)",
      "Recommended: cold wallet (Ledger, Arculus, etc.) paired with Xaman",
      "Valid passport or government ID (for Soil Protocol KYC — one-time)",
      "Some XRP for network reserves (~10 XRP)",
    ],
    steps: [
      {
        number: 1,
        icon: Wallet,
        title: "Ensure Your Wallet Is Ready",
        description: "Verify your Xaman wallet is set up with RLUSD trust line and adequate XRP.",
        details: [
          "Open Xaman — confirm your XRPL account is active and funded",
          "Check that you have at least 10 XRP for the account reserve, plus 2 XRP per trust line",
          "If you haven't set up an RLUSD trust line yet: tap '+' → search 'RLUSD' → 'Set Trust Line' → confirm",
          "If using a cold wallet (Ledger, Arculus, etc.), make sure it's paired with Xaman and working",
          "Make sure your Xaman app is up to date",
        ],
        tip: "If you're coming from an exchange (Uphold, Coinbase, etc.) where your RLUSD is custodial, this is the step where you take control: withdraw your RLUSD to YOUR wallet, protected by YOUR keys.",
      },
      {
        number: 2,
        icon: ShoppingCart,
        title: "Get RLUSD into Your Wallet",
        description: "Buy RLUSD on an exchange and withdraw it to your XRPL wallet.",
        details: [
          "If you already have RLUSD in your Xaman wallet, skip this step",
          "Log into your exchange (Coinbase, Kraken, Uphold, Crypto.com, Binance)",
          "Buy RLUSD — it's pegged 1:1 to USD, so $1,000 buys approximately 1,000 RLUSD",
          "Go to Withdraw → select RLUSD → select XRPL as the network (not Ethereum or another chain)",
          "Paste your XRPL wallet address from Xaman",
          "Send a small test amount first (e.g., 10 RLUSD), confirm it arrives, then send the rest",
          "RLUSD typically arrives in your wallet within seconds",
        ],
        tip: "Always double-check the network when withdrawing. RLUSD exists on multiple chains — make sure you select 'XRP Ledger' or 'XRPL' as the network. Sending to the wrong network means lost funds.",
      },
      {
        number: 3,
        icon: Link2,
        title: "Connect Wallet to CryptoOwnBank",
        description: "Link your wallet to the CryptoOwnBank dashboard.",
        details: [
          "Go to cryptoownbank.com → sign up or log in",
          "Go to OwnBank Dashboard → Connect Wallet → Connect Xumm",
          "Scan the QR code with Xaman → approve the connection",
          "Your RLUSD balance and wallet details will appear on the dashboard",
          "This is a read-only connection — we only see your public address",
        ],
        tip: "CryptoOwnBank shows your vault positions, accrued interest, and wallet balances all in one place. It's your control panel.",
      },
      {
        number: 4,
        icon: ScanLine,
        title: "Connect Wallet to Soil Protocol",
        description: "From CryptoOwnBank, link your wallet to Soil to access vaults.",
        details: [
          "On CryptoOwnBank, go to OwnBank → Vaults",
          "Click 'Deposit RLUSD' on a vault, then click 'Deposit on Soil'",
          "You'll be redirected to Soil Protocol's XRPL app (xrpl.soil.co)",
          "On Soil's site, click 'Connect Wallet' — a QR code appears",
          "Scan with Xaman → approve the connection",
          "If using a cold wallet, your hardware device may prompt for confirmation",
          "Your wallet address and RLUSD balance will appear on Soil's dashboard",
        ],
        tip: "This is a separate connection from CryptoOwnBank. Soil needs to verify your wallet independently to manage deposits. Both connections are non-custodial.",
      },
      {
        number: 5,
        icon: UserCheck,
        title: "Complete Soil KYC Verification",
        description: "Soil requires identity verification before you can deposit into vaults.",
        details: [
          "After connecting your wallet on Soil, you'll be prompted to verify your identity",
          "Upload a clear photo of your passport or government-issued ID",
          "Complete the camera/selfie verification — follow the on-screen instructions",
          "Submit and wait — verification usually completes within minutes",
          "Once verified, you'll see green checkmarks: Wallet Connected, Email Verified, Identity (KYC) Verified",
          "You only need to do this once — after that, you can deposit freely",
        ],
        tip: "Soil's KYC is required because their vaults involve real-world assets (US Treasuries, private credit). This is standard for regulated yield products. CryptoOwnBank does not require KYC.",
      },
      {
        number: 6,
        icon: Landmark,
        title: "Choose a Vault and Deposit",
        description: "Select your vault based on yield, risk, and liquidity needs.",
        details: [
          "On Soil's dashboard, click 'Vaults' in the sidebar",
          "Treasury Vault (~5.2% APR): backed by US Treasuries, 3-day rolling withdrawal period, lower risk — best for funds you might need relatively soon",
          "CREDIT+ Vault (8.0% APR): backed by private credit, 90-day notice + 10-day cooldown to withdraw, higher yield — best for longer-term savings",
          "Enter the amount of RLUSD you want to deposit",
          "Click 'Deposit' → scan QR with Xaman → approve on phone → confirm on cold wallet if prompted",
          "You'll see 'Allocation Successful' with your principal, APR, and status confirmed",
          "You can split across both vaults — e.g., some in Treasury for liquidity, some in CREDIT+ for maximum yield",
        ],
        tip: "Interest compounds automatically if you don't withdraw it. $10,000 in the CREDIT+ vault at 8% APR grows to approximately $10,800 in one year with simple interest — more with compounding.",
      },
      {
        number: 7,
        icon: BarChart3,
        title: "Track Yield and Manage Withdrawals",
        description: "Monitor your positions and withdraw interest when you want it.",
        details: [
          "Return to CryptoOwnBank → OwnBank Dashboard to see updated wallet balances",
          "Click 'View Vault & Yield on Soil' to see detailed vault positions: Total Commitment, Total Yield, Return Rate, SEED Bonus",
          "Interest accrues daily — check back after 24 hours to see your first yield",
          "To withdraw interest: go to CryptoOwnBank → Withdraw Interest, or manage directly on Soil",
          "Your principal stays locked and protected — only accrued interest is withdrawable",
          "Premium members get auto-withdrawal schedules, full history exports, and tax reports for yield income",
        ],
        tip: "This is the entire point: your RLUSD earns 5-8% APR, your keys stay on your device, your principal is protected, and you control when interest comes out. Banks pay 0.01%. Exchanges hold your keys. Soil + CryptoOwnBank gives you both: real yield AND real ownership.",
      },
    ],
    completionTitle: "Your Money Is Working for You",
    completionText: "Your RLUSD is earning 5-8% APR in Soil Protocol vaults, compounding daily. Your keys are on your device. Your principal is locked and protected. Interest withdraws on your schedule. Track everything from CryptoOwnBank. This is what 'be your own bank' looks like when the yields are real and the control is yours.",
  },
];

export default function SetupGuide() {
  const [activeToolkit, setActiveToolkit] = useState("beginner");
  const toolkit = toolkits.find((t) => t.id === activeToolkit)!;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A4E4]">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-semibold">CryptoOwnBank</span>
              </a>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a href="/">
                <Button variant="outline" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/30 mb-4" data-testid="badge-toolkits">
              Getting Started Toolkits
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3" data-testid="heading-toolkits">
              Pick Your Path. We'll Walk You Through It.
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Whether you've never touched crypto or you're running a business that wants to accept payments — choose the guide that matches where you are, and we'll show you every step from start to finish.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex flex-wrap gap-2 justify-center" data-testid="toolkit-tabs">
              {toolkits.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveToolkit(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeToolkit === t.id
                      ? `${t.bgColor} ${t.color} ring-2 ring-current/20`
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`tab-toolkit-${t.id}`}
                >
                  <t.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <Card className={`overflow-hidden ${toolkit.borderColor}`} data-testid={`card-toolkit-header-${toolkit.id}`}>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg ${toolkit.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <toolkit.icon className={`h-6 w-6 ${toolkit.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1">{toolkit.tagline}</h2>
                    <p className="text-muted-foreground mb-4">{toolkit.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Settings className="h-3.5 w-3.5" />
                        {toolkit.timeEstimate}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {toolkit.steps.length} steps
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={`rounded-lg ${toolkit.bgColor} border ${toolkit.borderColor} p-4 mb-8`}>
            <div className="flex items-start gap-3">
              <Shield className={`h-5 w-5 ${toolkit.color} mt-0.5 flex-shrink-0`} />
              <div>
                <p className="text-sm font-medium text-foreground">Non-Custodial — You Stay in Control</p>
                <p className="text-sm text-muted-foreground mt-1">
                  CryptoOwnBank never holds your funds or sees your private keys. Every transaction requires your explicit approval. We're the tooling layer — you're the bank.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 mb-8" data-testid="card-requirements">
            <h3 className="text-sm font-semibold mb-3">What You'll Need</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {toolkit.requirements.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${toolkit.color.replace("text-", "bg-").replace("dark:", "").split(" ")[0]}`} />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {toolkit.steps.map((step) => (
              <Card key={step.number} data-testid={`card-step-${toolkit.id}-${step.number}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-lg flex-shrink-0 text-white ${
                      toolkit.color.includes("blue") ? "bg-blue-600" :
                      toolkit.color.includes("amber") ? "bg-amber-600" :
                      toolkit.color.includes("emerald") ? "bg-emerald-600" :
                      toolkit.color.includes("purple") ? "bg-purple-600" :
                      "bg-cyan-600"
                    }`}>
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <step.icon className={`h-5 w-5 ${toolkit.color}`} />
                        <h2 className="text-lg font-semibold">{step.title}</h2>
                      </div>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      <ul className="space-y-2 mb-4">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Tip:</span> {step.tip}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 space-y-6">
            <Card className={`${toolkit.borderColor} ${toolkit.bgColor}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`h-6 w-6 mt-0.5 flex-shrink-0 ${toolkit.color}`} />
                  <div>
                    <h3 className="text-lg font-semibold mb-2" data-testid={`text-completion-${toolkit.id}`}>{toolkit.completionTitle}</h3>
                    <p className="text-muted-foreground mb-4">{toolkit.completionText}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a href="/signup">
                        <Button className="bg-[#00A4E4] text-white hover:bg-[#0090c9]" data-testid="button-get-started">
                          Get Started Free
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </a>
                      <a href="https://xaman.app" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" data-testid="button-download-xaman">
                          Download Xaman
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-3">Other Toolkits</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These guides aren't exclusive — you might be a beginner who also wants to accept business payments, or an existing crypto user exploring yield. Pick another path:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {toolkits
                    .filter((t) => t.id !== activeToolkit)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveToolkit(t.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${t.borderColor} ${t.bgColor} hover:opacity-80 transition-opacity text-left`}
                        data-testid={`link-other-toolkit-${t.id}`}
                      >
                        <t.icon className={`h-5 w-5 ${t.color} flex-shrink-0`} />
                        <div>
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.tagline}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-3">
          <p className="text-sm">&copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm flex-wrap justify-center">
            <a href="/setup-guide" className="text-gray-200">Getting Started</a>
            <span>&middot;</span>
            <a href="/faq" className="hover:text-[#00A4E4] transition-colors">FAQ</a>
            <span>&middot;</span>
            <a href="/legal" className="hover:text-[#00A4E4] transition-colors">Legal & Disclaimers</a>
            <span>&middot;</span>
            <a href="/privacy" className="hover:text-[#00A4E4] transition-colors">Privacy Policy</a>
          </div>
          <p className="text-xs text-center">
            Non-custodial dashboard &middot; We never hold your funds or keys &middot; Not financial advice &middot; DYOR
          </p>
        </div>
      </footer>
    </div>
  );
}
