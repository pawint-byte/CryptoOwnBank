import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import {
  Shield,
  TrendingUp,
  FileText,
  ArrowRight,
  CheckCircle2,
  Wallet,
  Lock,
  Coins,
  Users,
  ChevronDown,
  ChevronUp,
  Landmark,
  Zap,
  Eye,
  Globe,
  BadgeDollarSign,
  UserPlus,
  ExternalLink,
  PieChart,
  Clock,
  BarChart3,
  RefreshCw,
  Star,
  DollarSign,
  Link as LinkIcon,
  Ban,
  Fingerprint,
  ArrowDownUp,
  Bell,
  Trophy,
  Send,
  ArrowLeftRight,
  Timer,
  Building2,
  Scale,
  Store,
  CreditCard,
  Receipt,
  Handshake,
  CircleDollarSign,
  Wifi,
  UserX,
  MapPin,
  Waves,
  CandlestickChart,
  Repeat,
} from "lucide-react";

const xrplToolsComparison = [
  {
    oldIcon: Building2,
    oldTitle: "Brokerage Account",
    oldDesc: "Open account, fill out forms, wait days for approval to hold foreign currencies",
    newIcon: Coins,
    newTitle: "Token Manager",
    newDesc: "Set a trustline, sign with your wallet, hold any XRPL or Stellar token in seconds",
    link: "/ownbank/tokens",
    status: "live",
  },
  {
    oldIcon: BarChart3,
    oldTitle: "Stock Exchange (NYSE)",
    oldDesc: "Call your broker, T+2 settlement (2 days), brokerage holds your shares",
    newIcon: TrendingUp,
    newTitle: "DEX Trading",
    newDesc: "Place an order on-chain, settled in 4 seconds, tokens stay in YOUR wallet",
    link: "/ownbank/dex",
    status: "live",
  },
  {
    oldIcon: Landmark,
    oldTitle: "Wire Transfer (SWIFT)",
    oldDesc: "Fill out forms, pay $25–50 fee, wait 1–5 business days, only during business hours",
    newIcon: Send,
    newTitle: "Send & Receive",
    newDesc: "Enter address, sign with your wallet, delivered in 4 seconds, costs $0.000001",
    link: "/ownbank/send",
    status: "live",
  },
  {
    oldIcon: CreditCard,
    oldTitle: "Payment Processor (Stripe)",
    oldDesc: "2.9% + $0.30 per transaction, chargebacks, account freezes, 2-day settlement",
    newIcon: CircleDollarSign,
    newTitle: "Payment Corridor",
    newDesc: "Direct wallet-to-wallet payment, ~0.00001 XRP fee, 4-second settlement, no middleman",
    link: "/ownbank/send",
    status: "live",
  },
  {
    oldIcon: Clock,
    oldTitle: "Recurring Buy (Robinhood)",
    oldDesc: "Set a schedule, the app buys for you — but they hold your coins, you can't withdraw to your own wallet",
    newIcon: Repeat,
    newTitle: "DCA Orders",
    newDesc: "Automated recurring buys on XRPL & Stellar DEX — your wallet, your keys, approve each buy from your phone",
    link: "/ownbank/dca",
    status: "live",
  },
  {
    oldIcon: ArrowLeftRight,
    oldTitle: "Market Maker (Citadel)",
    oldDesc: "Institutional firms provide liquidity, take spreads, you never see behind the curtain",
    newIcon: RefreshCw,
    newTitle: "AMM Pools",
    newDesc: "Provide liquidity directly on-chain, earn fees transparently, fully decentralized",
    link: "#",
    status: "coming",
  },
  {
    oldIcon: Scale,
    oldTitle: "Escrow Company (Lawyers)",
    oldDesc: "Hire attorneys, pay legal fees, wait weeks for escrow release, trust a third party",
    newIcon: Timer,
    newTitle: "Escrow Manager",
    newDesc: "Create on-chain escrow with conditions, trustless release, no intermediary needed",
    link: "#",
    status: "coming",
  },
];

const heroStats = [
  { label: "RLUSD Yield", value: "5–8%", sub: "Fixed APR" },
  { label: "Your Principal", value: "100%", sub: "Always Locked" },
  { label: "Your Keys", value: "Yours", sub: "Non-Custodial" },
];

const whyPoints = [
  {
    icon: TrendingUp,
    text: "Earn real, fixed 5–8% APR on RLUSD through Soil's RWA-backed vaults (Treasuries + private credit)",
  },
  {
    icon: Lock,
    text: "Keep your principal 100% locked and protected — withdraw only the interest to spend or reinvest",
  },
  {
    icon: Shield,
    text: "Full cold-wallet security — your keys never leave your Ledger or Xumm device",
  },
  {
    icon: PieChart,
    text: "Track your entire crypto portfolio in one beautiful dashboard — Bitcoin, ETH, XRP, altcoins, and more",
  },
  {
    icon: FileText,
    text: "Generate IRS-ready tax reports automatically with FIFO/LIFO calculations",
  },
  {
    icon: Zap,
    text: "Ready for XLS-66 native on-ledger lending the moment it activates",
  },
];

const howItWorks = [
  {
    step: 1,
    icon: Wallet,
    title: "Connect Your Wallet",
    description:
      "Scan with Xumm or plug in your Ledger. No hot wallets. No seed phrases. Ever. Link your exchange accounts for full portfolio tracking.",
    detail:
      "Your wallet stays in your hands. We read your public address to show balances and prepare unsigned transactions for you to approve.",
  },
  {
    step: 2,
    icon: Coins,
    title: "Deposit to Yield Vaults",
    description:
      "Send RLUSD into Soil's fixed-yield pools (already earning 5–8%). Your principal stays safe in the vault — locked and protected.",
    detail:
      "RLUSD is Ripple's regulated stablecoin pegged 1:1 to USD. Soil Protocol lends it to institutional borrowers and passes yield back to you.",
  },
  {
    step: 3,
    icon: BadgeDollarSign,
    title: "Live Off the Interest",
    description:
      "Withdraw only the earnings whenever you want — to your spending wallet, family members, or back into more yield. Premium members get auto-withdraw every week.",
    detail:
      "Your base never moves. Your money never sleeps.",
  },
];

const features = [
  {
    icon: PieChart,
    title: "One Cockpit for Everything",
    description:
      "Connect all your exchanges, cold wallets, and yield vaults across 24 blockchains — Bitcoin, Ethereum (with full ERC-20 token detection), Solana, XRP, Avalanche, Cardano, Algorand, Cosmos, Tron, Hedera, Polkadot, VeChain, Dogecoin, Litecoin, Stellar, TON, Polygon, Arbitrum, Base, Optimism, DigiByte, Casper, Cronos, and more. See your entire crypto footprint in one real-time dashboard instead of logging into five different apps.",
    link: "/portfolio",
    linkLabel: "Open Portfolio",
  },
  {
    icon: TrendingUp,
    title: "RLUSD Yield Vaults",
    description:
      "Earn 5–8% fixed APR on Ripple's regulated stablecoin through Soil Protocol's RWA-backed institutional lending.",
    link: "/ownbank/vaults",
    linkLabel: "Explore Vaults",
  },
  {
    icon: FileText,
    title: "Tax Reports (FIFO/LIFO)",
    description:
      "Auto-calculate capital gains across all your holdings. Export IRS-ready CSV, PDF, or TurboTax-compatible reports with one click.",
    link: "/tax-reports",
    linkLabel: "View Tax Reports",
  },
  {
    icon: Trophy,
    title: "Best in Class Yield Finder",
    description:
      "Our Recommendations Hub analyzes every asset you hold and shows you the top staking, DeFi, and yield opportunities — ranked by APY. Every option is tagged as on-chain (you keep your keys) or custodial (company holds assets), with step-by-step staking guides for your exact hardware wallet.",
    link: "/rwa-yields",
    linkLabel: "Yield Finder",
  },
  {
    icon: Repeat,
    title: "DCA Orders",
    description:
      "Set up recurring buys on XRPL (31 pairs) and Stellar (18 pairs) DEX. Choose your pair, frequency, amount, and preferred day of the week — align buys with payday (e.g. every Friday). Each buy is a quick approval in Xaman or LOBSTR. Non-custodial dollar-cost averaging, no exchange needed.",
    link: "/ownbank/dca",
    linkLabel: "Set Up DCA",
  },
  {
    icon: Shield,
    title: "100% Non-Custodial",
    description:
      "We never touch your keys. All transactions are signed on your device — Xumm or Ledger. You always control your funds.",
  },
  {
    icon: Lock,
    title: "Principal Protection",
    description:
      "Your deposited capital is always locked. Only earned interest can be withdrawn — your savings are safe from impulse spending.",
  },
  {
    icon: Users,
    title: "Referral Rewards",
    description:
      "Share your link, earn bonus SEED points when friends deposit. Premium referrals earn you a free month of Premium.",
    link: "/ownbank/referrals",
    linkLabel: "Referral Program",
  },
  {
    icon: Bell,
    title: "Price Alerts",
    description:
      "Set alerts for any crypto — get an email when XRP hits $3, BTC breaks $100K, or any price you choose. Free users get 1 alert, Premium gets unlimited.",
    link: "/price-alerts",
    linkLabel: "Set Alerts",
  },
  {
    icon: Globe,
    title: "Earn & Yield Explorer",
    description:
      "Earn 5–8% on tokenized treasuries and real-world assets. Compare yields from Ondo, Centrifuge, Soil, and more — all in one explorer with live APY data.",
    link: "/rwa-yields",
    linkLabel: "Explore Earn & Yield",
  },
  {
    icon: DollarSign,
    title: "Stablecoin Dashboard",
    description:
      "Track and compare stablecoins across every chain — RLUSD, USDC, USDT, EURCV, PYUSD, DAI. See market caps, peg stability, and supported networks at a glance.",
    link: "/stablecoins",
    linkLabel: "Stablecoin Dashboard",
  },
  {
    icon: LinkIcon,
    title: "Real-Time Market Data",
    description:
      "Real-time pricing from CoinGecko across 24+ blockchains. We track Chainlink oracle feed availability for major assets so you know which prices have decentralized verification on-chain.",
    link: "/portfolio",
    linkLabel: "View Market Data",
  },
  {
    icon: Waves,
    title: "XRPL Whale Alerts",
    description:
      "Real-time monitoring of large XRP and RLUSD transactions on the XRP Ledger. See whale movements as they happen — amounts, direction, and identified wallets like Binance, Ripple, and Kraken. Free users see the last 24 hours; Premium and Pro get extended history with customizable thresholds.",
    link: "/whale-alerts",
    linkLabel: "View Whale Alerts",
  },
  {
    icon: CandlestickChart,
    title: "Technical Analysis",
    description:
      "Interactive candlestick charts with live pattern detection — the chart identifies Doji, Hammer, Engulfing, Morning Star, and 10+ more patterns as you hover, explaining what each means in plain English. Includes SMA, EMA, RSI, MACD, and Bollinger Bands for 21 crypto assets. Free tier includes SMA indicators with up to 30 days of data; Premium and Pro unlock all indicators with up to 10 years of history.",
    link: "/technical-analysis",
    linkLabel: "Open Charts",
  },
];

const memberStories = [
  {
    title: "Save Without Temptation",
    icon: Lock,
    accent: "from-blue-500/10 to-cyan-500/10",
    story:
      "Most people struggle to save because their money is always one tap away from being spent. With OwnBank, your principal is locked — you can't touch it even if you wanted to. Only the interest flows out. It's like a savings account that actually forces you to save.",
    benefit: "Your principal grows untouched while interest flows to your spending wallet.",
  },
  {
    title: "Earn Real Yield, Not Promises",
    icon: Landmark,
    accent: "from-emerald-500/10 to-green-500/10",
    story:
      "Unlike DeFi protocols offering unsustainable 100%+ APY, Soil Protocol lends RLUSD to real institutional borrowers — the same way traditional banks make money, but the yield goes to you instead of shareholders. 5–8% APR is real, sustainable, and backed by actual assets.",
    benefit: "Institutional-grade yields backed by US Treasuries and private credit.",
  },
  {
    title: "Be Your Own Bank",
    icon: Wallet,
    accent: "from-purple-500/10 to-violet-500/10",
    story:
      "Traditional banks hold your money and decide what to do with it. With OwnBank, YOU hold your keys, YOU choose where your money earns yield, and YOU decide when to withdraw interest. No bank can freeze your account, change your terms, or deny you access.",
    benefit: "Full control over your funds with cold wallet security — Xumm or Ledger.",
  },
  {
    title: "Track Everything, Not Just One Chain",
    icon: BarChart3,
    accent: "from-amber-500/10 to-orange-500/10",
    story:
      "CryptoOwnBank isn't just about XRPL — it's your complete crypto command center. Connect your Coinbase, Kraken, Crypto.com, or Binance accounts. Add cold wallets across 24 blockchains — Bitcoin, Ethereum (auto-detects all ERC-20 tokens), Solana (with SPL tokens), XRP (with trust lines), Avalanche, Cardano, Algorand, Cosmos (with staking), Tron (with TRC-20 tokens), Hedera (staked HBAR included), Polkadot, VeChain (auto-detects VET + VTHO), Stellar, TON, Polygon, Arbitrum, Base, Optimism, and more. Our Recommendations Hub analyzes every asset and shows you the best on-chain staking, DeFi, and yield opportunities — clearly labeled as on-chain (you keep your keys) or custodial (company holds assets). Search, filter, and sort your holdings. Import CSV files from Ledger Live or Yahoo Finance.",
    benefit: "One dashboard for your entire crypto portfolio across 24 chains, with personalized yield recommendations and Soil vaults for RLUSD.",
  },
];

const whyNow = [
  { icon: Zap, text: "Regulatory clarity is moving — institutional DeFi is coming to XRPL and beyond" },
  { icon: Globe, text: "RLUSD is growing as the compliant stablecoin of choice" },
  { icon: TrendingUp, text: "Banks are still fighting yield — you don't have to wait" },
  { icon: Shield, text: "You keep full control while traditional finance catches up" },
];

const testimonials = [
  {
    quote: "I had crypto spread across Coinbase, Kraken, a Ledger, and two blockchain wallets. CryptoOwnBank finally let me see everything in one place — and I discovered I was sitting on way more than I thought.",
    author: "Marcus T.",
    role: "Long-term HODLer",
    persona: "Multi-Exchange Investor",
  },
  {
    quote: "Tax season used to be a nightmare. I'd spend days pulling CSVs from five different exchanges. Now I just click export and hand it to my accountant. The annual plan paid for itself in one filing.",
    author: "Sarah K.",
    role: "Premium Annual Member",
    persona: "Tax-Conscious Trader",
  },
  {
    quote: "I only trust cold storage — no exchange holds my keys. CryptoOwnBank tracks my Ledger addresses and XRPL vaults without me ever sharing a private key. Non-custodial is the only way.",
    author: "DeFi_Dave",
    role: "Hardware Wallet User",
    persona: "Security-First Holder",
  },
  {
    quote: "5-8% APR on RLUSD with my keys in my own wallet? That's better than any savings account, and I don't have to trust a bank with my money. The Soil vault integration is why I'm here.",
    author: "Jennifer L.",
    role: "Yield Earner",
    persona: "Stablecoin Yield Seeker",
  },
  {
    quote: "I trade on Binance and Kraken daily. Having real-time portfolio value, cost basis, and P&L across both exchanges in one dashboard saves me from constant tab-switching. Game changer.",
    author: "CryptoNomad",
    role: "Active Trader",
    persona: "Multi-Exchange Day Trader",
  },
  {
    quote: "My wife and I both invest in crypto separately. We each have our own CryptoOwnBank account — she tracks her Coinbase portfolio and I manage my Ledger cold storage. Simple and private.",
    author: "Robert & Amy W.",
    role: "Free Tier Users",
    persona: "Casual Crypto Couple",
  },
  {
    quote: "I imported 800+ transactions from Yahoo Finance in one upload. It built my entire cost basis history and tax lots automatically. Would have taken me weeks to do manually.",
    author: "Alex M.",
    role: "Premium Member",
    persona: "Portfolio Migrator",
  },
  {
    quote: "I set price alerts for BTC, ETH, and XRP and just wait. No need to watch charts all day. When something hits my target, I get notified. Clean, simple, no noise.",
    author: "PatientCapital",
    role: "Free Tier User",
    persona: "Set-and-Forget Investor",
  },
  {
    quote: "I run a small web design studio. Stripe was taking 2.9% of every invoice — on a $5,000 project that's $145 gone. Now clients pay me in RLUSD, it settles in 4 seconds, and I keep every dollar. No chargebacks, no frozen accounts.",
    author: "Nina R.",
    role: "Business Owner",
    persona: "Small Business Operator",
  },
  {
    quote: "I freelance for clients in Europe and the US. Cross-currency payments used to mean waiting days and losing money on conversion fees. Now I send an XRPL address, they pay in whatever currency they have, and I get RLUSD instantly. Game changer for international work.",
    author: "Carlos M.",
    role: "Premium Member",
    persona: "International Freelancer",
  },
  {
    quote: "PayPal froze my account with $4,200 in it. No warning, no explanation, no access for 180 days. I moved to the XRPL — now nobody can freeze my funds. I accept payments in RLUSD, it settles in 4 seconds, and I control my own money. That's what debanked taught me.",
    author: "Jordan P.",
    role: "Debanked Business Owner",
    persona: "Debanked Entrepreneur",
  },
  {
    quote: "There's no bank branch within 200km of where I live. I sell produce at the market and buyers pay me in RLUSD — they scan my QR code and I have digital dollars in 4 seconds. I save what I don't spend in a Soil vault earning 8%. No bank has ever offered me an account, but I have a better financial system than most people with one.",
    author: "Amina K.",
    role: "Free Tier User",
    persona: "Unbanked Farmer & Vendor",
  },
];

const freeTierFeatures = [
  "Connect 1 exchange (Coinbase, Kraken, Crypto.com, etc.)",
  "Track 1 blockchain address across 24 blockchains",
  "Soil vault access (deposit + manual withdraw)",
  "Basic Recommendations Hub (see yield opportunities for your assets)",
  "Yield calculator for projected earnings",
  "1 price alert with email notifications",
  "7-day transaction history",
];

const premiumFeatures = [
  "XRPL DEX trading — 44 pairs (Quick Swap + Advanced order book)",
  "Stellar DEX trading — 13 pairs (Quick Swap + live order book)",
  "DCA Orders — automated recurring buys on XRPL (31 pairs) and Stellar (18 pairs) DEX",
  "Earn & Accumulate XRP — auto-convert vault interest into XRP on the DEX (configurable %, min threshold)",
  "Unlimited exchange connections",
  "Unlimited blockchain addresses across 24 chains (BTC, ETH, SOL, XRP, ADA, AVAX, ALGO, ATOM, TRX, HBAR, DOT, VET, TON, XLM, MATIC, and more)",
  "Full ERC-20, SPL, TRC-20, VIP-180 & CRC-20 token auto-detection",
  "Full Recommendations Hub — Best in Class rankings, staking guides, DeFi comparisons, 'You Hold This' badges",
  "Wallet-specific staking guides (Ledger, ELLIPAL, SafePal, CypheRock, Arculus)",
  "Full transaction history (all time)",
  "CSV import (Ledger Live, Yahoo Finance, CoinTracker)",
  "Unlimited price alerts",
  "Auto-withdrawal from Soil vaults",
  "Portfolio search, filter & sort",
  "Statement Insights with rate comparisons",
  "Whale Alerts — extended history + custom thresholds",
  "Technical Analysis — all indicators, pattern detection + 10-year charts",
];

const annualBonusFeatures = [
  "Complete tax reports (CSV + PDF + TurboTax)",
  "Capital gains & losses calculation",
  "IRS Form 8949 / Schedule D guidance",
  "Save $149/yr vs monthly billing",
];

const proFeatures = [
  "Everything in Premium",
  "Legacy Plan — dead-man switch (Member for Life)",
  "DeFi Borrowing Hub (Aave, Compound, Maple, MakerDAO)",
  "Real Estate Tokenization (RealT, Lofty, Propy)",
  "Batch & payroll recurring payments",
  "Treasury dashboard for business wallets",
  "Up to 5 team member seats",
  "XLS-65/66 Lending (pending validator vote)",
];

const onChainReasons = [
  {
    icon: Lock,
    title: "Maximum Security & True Ownership",
    points: [
      "When you connect your cold wallet (Ledger or Xumm), your private keys never leave your device.",
      "We never see them, store them, or have any ability to move your funds.",
      "Direct bank integrations require someone to handle your fiat and personal banking details — introducing KYC requirements, potential data breaches, and counterparty risk.",
    ],
    highlight: "Your assets stay in your control, not ours or anyone else's. That's what \u201Cbe your own bank\u201D really means.",
  },
  {
    icon: Ban,
    title: "No Regulatory Overload = Faster, Simpler Experience",
    points: [
      "No ID, proof of address, or banking info required to use the site.",
      "Instant onboarding in seconds — not days or weeks.",
      "No hidden compliance fees or account freezes.",
    ],
    highlight: "We keep things non-custodial and permissionless — exactly how the blockchain was designed to work.",
  },
  {
    icon: DollarSign,
    title: "Lower Costs & Better Yields for You",
    points: [
      "Every layer of fiat handling adds fees (bank wires, ACH, compliance overhead, partner cuts).",
      "By keeping everything on-chain (RLUSD \u2192 Soil vaults \u2192 interest withdrawals), we avoid those costs entirely.",
      "You keep more of your 5–8% fixed yield with no hidden \u201Cprocessing\u201D or \u201Cwithdrawal\u201D fees from us.",
    ],
    highlight: "The system stays lean so we can focus on features like auto-withdrawals and XLS-66 lending — not compliance paperwork.",
  },
];

const onChainSteps = [
  {
    step: 1,
    icon: Coins,
    title: "Buy RLUSD",
    description: "Use any trusted exchange (Binance, Kraken, Coinbase, etc.). Buy RLUSD and withdraw it directly to your XRPL wallet address.",
    note: "We provide affiliate links so you may earn rewards for using them — disclosed transparently.",
  },
  {
    step: 2,
    icon: Fingerprint,
    title: "Connect Your Cold Wallet",
    description: "Scan with Xumm or plug in Ledger. Takes seconds — no forms, no ID, no waiting.",
  },
  {
    step: 3,
    icon: Landmark,
    title: "Deposit to Soil Vaults",
    description: "Choose a vault (Treasury-backed 5.2% or CREDIT+ 8.0%). Sign the transaction with your cold wallet. Your RLUSD is now earning fixed yield.",
  },
  {
    step: 4,
    icon: ArrowDownUp,
    title: "Withdraw Only the Interest",
    description: "When earnings accrue, click \u201CWithdraw Interest Only.\u201D Your principal never moves. Repeat forever.",
  },
];

const faqGroups = [
  {
    heading: "About CryptoOwnBank",
    items: [
      {
        q: "Why was CryptoOwnBank created? (And why should I use it?)",
        a: "CryptoOwnBank was created for one reason: to help people truly become their own bank — without giving up control of their assets. Most tools today force you to choose between: custodial platforms (Uphold, Binance, Coinbase) that hold your keys and pay low yields (3–6%), traditional banks that pay almost nothing (0.01–4.5%) and control your money, or raw blockchain explorers and DeFi apps that feel complicated and overwhelming. We built CryptoOwnBank to fix all three problems at once: (1) Full ownership — your cold wallet (Ledger, ELLIPAL, Arculus, etc.) stays in control; we never see or store your private keys. (2) Real, higher yields — earn 5–8% fixed APR on RLUSD through Soil Protocol's real-world-asset vaults (Treasuries, private credit) with automatic compounding if you don't withdraw interest. (3) Simplicity & power — one clean dashboard to connect your wallet, track your XRPL portfolio, deposit to vaults, withdraw only the interest you want, and see everything in real time. No copy-pasting addresses, no switching apps. (4) Future-proof — built for XRPL today (RLUSD + Soil), ready for tomorrow (XLS-66 XRP lending, more protocols, multi-chain support) — all while keeping you non-custodial. The world is shifting to on-chain finance. Banks fight to keep yields low and control high. Exchanges hold your keys and limit what you can do. CryptoOwnBank flips the script: you earn more, own everything, and stay in full control. Bottom line: if you want higher yields than Uphold/Binance, true self-custody instead of trusting a third party, and a dashboard that grows with the XRPL ecosystem — CryptoOwnBank was built exactly for you. Connect your cold wallet (free, no KYC) and start today.",
      },
      {
        q: "What is CryptoOwnBank?",
        a: "CryptoOwnBank is a combined crypto portfolio tracker, non-custodial XRPL yield vault, and payment toolkit — designed so anyone with an internet connection can participate in global commerce. Track your entire crypto portfolio across 24 blockchains and multiple exchanges from one dashboard, earn fixed yield on RLUSD through Soil Protocol vaults, trade on the XRPL's built-in DEX, send and receive payments in seconds, and accept crypto payments for your business — all while keeping full control via your cold wallet. Whether you're unbanked (no access to traditional finance), debanked (shut out by banks or payment processors), or simply tired of paying 2.9% to a middleman — CryptoOwnBank gives you the tools to be your own bank.",
      },
      {
        q: "Why does CryptoOwnBank focus on XRPL and Stellar instead of Ethereum or Solana?",
        a: "Because we don't believe in patchwork. On Ethereum, a simple swap requires MetaMask, Uniswap (a third-party smart contract), ETH for gas ($5–50), and hope the contract hasn't been exploited. On BNB Chain: different wallet, different DEX (PancakeSwap), different gas token. Solana: another wallet, another aggregator (Jupiter), another set of permissions. Every layer is another company, another point of failure. The XRP Ledger and Stellar are different — the decentralized exchange is built into the protocol itself. No third-party app runs it. No smart contract to exploit. No governance token to hold. You open your wallet, pick a pair, sign the trade, and it settles in 4 seconds. Our philosophy: get your assets on the blockchain, use XRP as your bridge currency, and the native DEX handles the rest. One chain, one wallet, one bridge — not five apps, three gas tokens, and two browser extensions.",
      },
      {
        q: "How does CryptoOwnBank compare to traditional banks and crypto exchanges?",
        a: "Banks offer 0.01–4.5% yield but you're an unsecured creditor — they own the money. Centralized exchanges (Uphold ~3.75%, others up to 6%) hold your keys custodially. CryptoOwnBank + Soil gives you 5–8% fixed APR with automatic compounding, and you own 100% — keys stay on your cold wallet, every action requires your signature. Other advantages: no KYC on our end, no bank linking, low XRPL fees (~0.0001 XRP vs $15–30 wire fees), interest-only withdrawals so principal keeps earning, and future XLS-66 XRP lending from the same dashboard. Banks and exchanges are convenient but take custody and pay less. CryptoOwnBank flips the script: full control, higher yields, complete transparency.",
      },
      {
        q: "How does CryptoOwnBank make money?",
        a: "Free tier forever (basic tracking + manual withdrawals). Premium subscription ($29/mo or $199/yr) for auto-withdrawals, tax exports, family views, etc. Affiliate referrals (e.g., when you buy RLUSD via our exchange links or join Soil via our referral — we may earn rewards; disclosed transparently). We never take fees from your yields or principal.",
      },
      {
        q: "Which blockchains and protocols does CryptoOwnBank support?",
        a: "CryptoOwnBank supports 24 blockchains for portfolio tracking: Bitcoin, Ethereum (with automatic ERC-20 token detection), Solana (with SPL tokens), XRP Ledger (with trust line tokens like RLUSD), Avalanche, Cardano, Algorand, Cosmos Hub (with staking), Tron (with TRC-20 tokens), Hedera (staked HBAR included), Polkadot, VeChain (auto-detects VET + VTHO), Stellar, TON, Polygon, Arbitrum, Base, Optimism, Dogecoin, Litecoin, DigiByte, Casper, Cronos (with CRC-20 tokens), and more. On the exchange side, connect Coinbase, Kraken, Crypto.com, Binance, and more via API keys. Over 150 tokens are mapped to live CoinGecko prices. Our Recommendations Hub analyzes every asset and shows the best on-chain staking, DeFi, and yield opportunities — clearly tagged as on-chain (you keep your keys) or custodial. For yield, we integrate with Soil Protocol on XRPL for 5–8% fixed APR on RLUSD. All non-custodial, all from one dashboard.",
      },
      {
        q: "Can my business accept crypto payments through CryptoOwnBank?",
        a: "Yes. Connect your wallet, set up trustlines for the currencies you want to accept (like RLUSD), and share your payment QR code with customers. Payments settle in 4 seconds for a fraction of a penny — no 2.9% processing fee, no chargebacks, no account freezes. We're the tooling layer (the workbench), not the payment processor. You and your customer transact directly on the XRPL. Consumers, freelancers, and small businesses can compete at scale without giving a cut to Stripe or PayPal.",
      },
      {
        q: "What if I don't have a bank account or got debanked?",
        a: "CryptoOwnBank was built with you in mind. 1.4 billion people worldwide are unbanked — no access to traditional finance at all. Millions more have been debanked — accounts closed, funds frozen, services denied without explanation. The XRPL doesn't require a bank account, credit check, or government ID. You don't even need to 'buy' crypto through an exchange — you can earn it directly by selling goods and services. A farmer sells produce, a buyer scans a QR code, and RLUSD lands in the farmer's wallet in 4 seconds. Then save it in a yield vault earning 5-8%, spend it by paying others who accept it, and send it to family anywhere in the world. No bank touches the money at any point. See our step-by-step guide at /setup-guide.",
      },
      {
        q: "Why should I join now?",
        a: "Regulatory clarity is advancing, RLUSD is growing as the compliant stablecoin of choice, and institutional DeFi is expanding. Banks are still offering minimal yields. CryptoOwnBank lets you start earning real, fixed yield today while keeping full control of your assets — no waiting for traditional finance to catch up.",
      },
    ],
  },
  {
    heading: "Wallet & Security Basics",
    items: [
      {
        q: "Why do I need a cold wallet to use CryptoOwnBank?",
        a: "To keep you in full control. We are 100% non-custodial — your private keys never leave your Ledger, ELLIPAL, Arculus, SafePal, etc. The site only reads public data and builds transactions for you to sign. Without a cold wallet, there's no way to approve deposits or withdrawals.",
      },
      {
        q: "Is this a wallet? Do you hold my funds?",
        a: "No — we are 100% non-custodial. We never hold, control, or have access to your funds or private keys. All actions (deposits, withdrawals) are signed directly from your own cold wallet. The dashboard is just a secure interface to view balances and interact with XRPL + Soil. Your keys stay on your Ledger or Xumm device at all times.",
      },
      {
        q: "What wallets and hardware devices are supported?",
        a: "For XRPL yield vaults: Xumm/Xaman (mobile, QR code connection) and Ledger hardware wallets (Nano S/X via Bluetooth through Xaman). For portfolio tracking: paste any wallet address from Ledger, CypheRock, ELLIPAL, Arculus, SafePal, Trezor, or any hardware wallet — we support 24 blockchains. We provide wallet-specific staking guides for each hardware wallet, so you get step-by-step instructions tailored to your exact device. Ethereum addresses automatically detect all ERC-20 tokens. Hedera pulls your full HBAR balance including staked amounts. VeChain auto-detects VET + VTHO. Cosmos includes staking delegations. For exchanges: connect via API keys (Coinbase, Kraken, Crypto.com, Binance, and more). You can also import transactions from Ledger Live or Yahoo Finance CSV files.",
      },
      {
        q: "Do Ledger Nano X and Xaman show the same address for RLUSD?",
        a: "Yes — when you pair Ledger Nano X with Xaman, Xaman displays the exact XRPL address controlled by your Ledger device. There is only one address. Xaman is the bridge that sends signing requests to Ledger — the keys stay on Ledger.",
      },
      {
        q: "Does every transaction require Ledger signing even if I use Xaman?",
        a: "Yes. Xaman builds the transaction and forwards it to your paired Ledger for offline approval. You physically confirm on the Ledger device every time. This is the security model — no keys ever leave hardware.",
      },
      {
        q: "How do I connect my Ledger Nano X with Xaman?",
        a: "1) Install Xaman (App Store/Google Play) and Ledger Live. 2) Open Xaman \u2192 Settings \u2192 Hardware Wallets \u2192 Ledger \u2192 enable Bluetooth \u2192 unlock Ledger \u2192 open XRP app \u2192 pairs automatically. 3) Add RLUSD trust line: tap \u201C+\u201D Add Token \u2192 RLUSD \u2192 Setup Trust Line \u2192 sign on Ledger. 4) On CryptoOwnBank, click \u201CConnect Wallet\u201D \u2192 Xumm/Xaman \u2192 approve in Xaman (Ledger confirms if needed). Done — deposit RLUSD to Soil vaults and sign with your Ledger/Xaman combo. Full guide: /setup-guide",
      },
      {
        q: "Do I need a destination tag/memo when transferring RLUSD?",
        a: "No — RLUSD on XRPL does not require tags or memos (unlike XLM on Stellar). Just send to your correct XRPL address (starts with \u201Cr\u2026\u201D). Always double-check the address before sending.",
      },
      {
        q: "How does Hedera (HBAR) tracking work? What about staking?",
        a: "Super simple — just paste your Hedera account ID (it looks like 0.0.12345) into the wallet address field. Our system uses the Hedera Mirror Node API to pull your full HBAR balance, including staked HBAR. If you stake through Stader, HashPack, or any other provider, your HBAR stays in your account with a staking delegation — it doesn't move to a different address. So one account ID captures everything.",
      },
      {
        q: "Which tokens are auto-detected on each chain?",
        a: "Ethereum: all ERC-20 tokens (UNI, LINK, SHIB, PEPE, RNDR, and 100+ more). Solana: all SPL tokens (JUP, BONK, RAY, etc.). XRP: trust line tokens like RLUSD. Avalanche: all C-Chain tokens via Glacier API. Tron: all TRC-20 tokens. VeChain: VET + VTHO (gas token) automatically. Cosmos: ATOM + staking delegations. Cronos: CRO + all CRC-20 tokens. Hedera: HBAR + HTS tokens. Over 150 tokens are mapped to live CoinGecko prices for accurate USD valuations.",
      },
      {
        q: "I have crypto on multiple hardware wallets (Ledger, Cypherock, Ellipal). Can I track them all?",
        a: "Yes! Premium users can add unlimited wallet addresses. Use the label feature to organize them — label each wallet 'Ledger X', 'Cypherock', 'Ellipal', etc. Previously used labels appear as quick-pick buttons so you don't have to retype them. You can even add suffixes like 'Ledger X - Dad' or 'Ledger X - Kids' to distinguish multiple devices of the same type.",
      },
      {
        q: "Is my data secure?",
        a: "Your exchange API keys are encrypted at rest using AES-256. Your XRPL wallet connection is read-only — we only see your public address. All transaction signing happens on your device. We use secure authentication and Stripe for payment processing. We never store private keys or seed phrases.",
      },
    ],
  },
  {
    heading: "Yield & Soil Mechanics",
    items: [
      {
        q: "What is RLUSD and how do the yield vaults work?",
        a: "RLUSD is Ripple's regulated stablecoin, pegged 1:1 to the US Dollar and backed by cash and cash equivalents. The yield comes from Soil Protocol, which lends your RLUSD to institutional borrowers — similar to how traditional banks make money, except the interest goes to you. The Treasury Vault (5.2% APR) is backed by US government securities. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools.",
      },
      {
        q: "Which vault should I choose — Treasury (5.2%) or CREDIT+ (8.0%)?",
        a: "It depends on your risk tolerance and how soon you might need your funds. The Treasury Vault (5.2% APR) is backed by US government securities — essentially the safest asset class in the world. It has a short 3-day rolling withdrawal period, so you can access your funds quickly. Best for: stability and liquidity. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools (institutional lending). It pays more but requires a 90-day notice + 10-day cooldown to withdraw, and carries higher default risk than Treasuries. Best for: users willing to lock funds longer for bigger returns. You can also split your RLUSD across both vaults — for example, put some in Treasury for quick access and some in Private Credit for higher yield. The vault cards on the Vaults page show risk level, withdrawal terms, and a \u201CBest for\u201D recommendation to help you decide at a glance.",
      },
      {
        q: "Does interest in Soil vaults compound automatically?",
        a: "Yes. If you do not withdraw the earned interest, it is automatically added to your position in the vault and starts earning additional yield right away. Example: Deposit $10,000 RLUSD at 6% APR. After one month \u2248 $50 interest is earned. If left in the vault, your new balance becomes ~$10,050. Next month's interest is calculated on the larger amount — this is automatic compounding. There is no \u201Creinvest\u201D button because it happens by default. You can withdraw only the interest anytime (manually or auto-scheduled with Premium). The principal plus any unwithdrawn interest stays in the vault and continues growing. This gives you higher effective returns than most banks or custodial platforms while keeping full control of your keys.",
      },
      {
        q: "How does Soil compare to Uphold's 3.75% yield?",
        a: "Soil offers 5–8% fixed APR (real RWA-backed yield from Treasuries and private credit) with automatic compounding — usually higher than Uphold's ~3.75%. Plus you get full self-custody (your keys stay on your cold wallet) instead of Uphold holding everything custodially. The trade-off: Uphold is simpler to start with, but you give up ownership and earn less.",
      },
      {
        q: "How do I withdraw my earned interest?",
        a: "Go to the Withdraw Interest page, select a vault, and click \u201CWithdraw Interest.\u201D The app builds a transaction sending ONLY your accrued interest to your designated spending wallet. You sign the transaction on your Xumm or Ledger. Free users withdraw manually; Premium users can set up automatic weekly withdrawals.",
      },
      {
        q: "Why can't I withdraw my full principal anytime?",
        a: "Soil vaults are lending pools backed by real-world assets (U.S. Treasuries, private credit, etc.). Withdrawal rules depend on the vault: Liquid/Treasury vaults have a 3-day rolling period. Credit vaults require a 90-day notice + 10-day cooldown (interest continues during notice). Your funds earn during notice periods, but the lock-up aligns with underlying assets for stability. This is standard for fixed-yield RWA protocols — check each vault's details on the site.",
      },
      {
        q: "How safe is my principal?",
        a: "Your principal is protected in two ways: 1) Non-custodial design — keys never leave your cold wallet. 2) Soil vaults are backed by real-world assets (Treasuries, credit funds) with institutional-grade underwriting. Yields are fixed and predictable, but crypto/blockchain always carries risks (smart contract bugs, protocol changes, market events). We display real-time data but never guarantee returns. Always DYOR.",
      },
      {
        q: "What happens if Soil or XRPL has issues?",
        a: "Soil is a compliant RWA protocol on XRPL — funds are loaned to Soil Ltd. (backed by real assets), not algorithmic or high-risk DeFi. If issues arise (rare), withdrawals follow vault rules (notice periods). XRPL itself is battle-tested and decentralized. Your assets stay on-chain in your wallet — we can't access or lose them.",
      },
    ],
  },
  {
    heading: "Getting Started & Transfers",
    items: [
      {
        q: "How do I start earning yield on RLUSD?",
        a: "1) Buy RLUSD on a trusted exchange (Binance, Kraken, Coinbase, etc.) and withdraw it to your XRPL wallet. 2) Connect your cold wallet to the dashboard. 3) Deposit RLUSD into a Soil vault (Treasury-backed at 5.2% or CREDIT+ at 8.0%). 4) Earn fixed yield immediately — your principal stays locked. 5) Withdraw only the accrued interest whenever you want (manual or auto for Premium users). No KYC on our end, no bank linking required.",
      },
      {
        q: "Can I transfer RLUSD from Uphold to my cold wallet?",
        a: "Yes — Uphold supports XRPL withdrawals. Go to Withdraw \u2192 RLUSD \u2192 XRPL network \u2192 paste your wallet address. Test with a small amount first. Make sure your trust line to RLUSD is set in Xaman/Ledger before sending. Funds typically arrive in seconds with fees around ~0.0001 XRP.",
      },
      {
        q: "Which exchange should I recommend for buying RLUSD?",
        a: "Binance usually offers the best liquidity and lowest fees for RLUSD. Kraken is great for low-cost XRPL withdrawals. Crypto.com and Uphold are beginner-friendly. Use the referral links on the My Referrals page to help others — you may earn rewards when they sign up and buy.",
      },
      {
        q: "Should I route through an exchange to earn referral rewards on my own transfer?",
        a: "Not worth it for your own funds. Referral commissions only trigger for new users signing up via your link — self-referral usually doesn't pay and adds extra fees/steps. Transfer directly from Uphold (or wherever your RLUSD is) to your cold wallet, then use your referral links to help others buy RLUSD.",
      },
      {
        q: "Why don't you connect directly to my bank account?",
        a: "We deliberately stay on-chain only to keep things simple, secure, and non-custodial. Bank integrations would require us to handle fiat, trigger money transmitter rules (federal MSB registration + state licenses), and force KYC/AML on users — adding delays, fees, and risks. By skipping banks, we avoid all that: no middleman, no data collection, no compliance overhead. You buy RLUSD on exchanges, deposit on-chain, and manage everything from your wallet — faster, cheaper, and truly in your control.",
      },
      {
        q: "Can I use this for other cryptos besides XRP/RLUSD?",
        a: "Absolutely — CryptoOwnBank is a full multi-chain portfolio tracker across 24 blockchains. Add wallet addresses for Bitcoin, Ethereum, Solana, XRP, Avalanche, Cardano, Algorand, Cosmos, Tron, Hedera, Polkadot, VeChain, Stellar, TON, Polygon, and more. Connect exchange accounts to track everything in one place. Our Recommendations Hub analyzes every asset and surfaces the best staking, DeFi, and yield opportunities — with clear on-chain vs custodial labels and wallet-specific staking guides for your exact hardware wallet. All with real-time prices (150+ supported assets). The XRPL yield vaults (Soil Protocol) are a bonus on top of comprehensive portfolio tracking.",
      },
    ],
  },
  {
    heading: "Premium, Referrals & Features",
    items: [
      {
        q: "What's the difference between Free, Premium, and Pro?",
        a: "Free: 1 exchange, 1 blockchain address, 1 price alert, Soil vault access, basic Recommendations Hub, yield calculator, and 7-day history. Premium ($29/mo or $199/yr): unlimited exchanges and addresses across 24 chains, full Recommendations Hub, staking guides, CSV import, auto-withdraw, Statement Insights, recurring payments, full history. Annual bonus: tax reports. Pro ($99/mo or $799/yr): everything in Premium plus DeFi Borrowing Hub, Real Estate Tokenization directory, batch/payroll payments, treasury dashboard, up to 5 team seats, and XLS-66 Lending. Pro is designed for businesses and high-value clients.",
      },
      {
        q: "How do I pay for Premium?",
        a: "We accept crypto payments on 25 blockchains — XRP, RLUSD, Bitcoin, Ethereum, Solana, Stellar, Dogecoin, Litecoin, Cardano, Avalanche, Algorand, Cosmos, Tron, Hedera, Polkadot, VeChain, TON, Polygon, Cronos, XDC, DigiByte, Casper, Nervos, Zilliqa, and Verge. Crypto is our preferred payment method — we practice what we preach. Select your chain, send the exact amount to our cold wallet address, and your account is upgraded automatically. For XRP and RLUSD payments, include the Destination Tag we provide so we can match your payment. For all other chains, we match by the exact amount (the last few decimal places are unique to your order). Every payment is verified directly on-chain — no payment processor involved. Credit/debit card via Stripe is also available as a fallback for members who aren't on-chain yet.",
      },
      {
        q: "How do Price Alerts work?",
        a: "Set a target price for any supported crypto (XRP, BTC, ETH, SOL, ADA, and more). Choose whether you want to be notified when the price goes above or below your target. Our system checks prices every 60 seconds and sends you an email notification when your alert triggers. Free users get 1 active alert; Premium users get unlimited alerts.",
      },
      {
        q: "What is the Yield Calculator?",
        a: "The Yield Calculator is a free public tool (no login required) that lets you estimate how much you'd earn by depositing RLUSD into Soil vaults. Enter any amount, choose Treasury (5.2% APR) or CREDIT+ (8.0% APR), and toggle between simple and compound interest to see projected daily, weekly, monthly, and yearly earnings. Try it at /yield-calculator.",
      },
      {
        q: "Can I export my tax report as a PDF?",
        a: "Yes — Premium users can download a professionally formatted PDF tax report with a summary of short-term and long-term gains/losses, a full table of all gain events, and a disclaimer footer. Free users can still export CSV files. Go to Tax Reports, select your year and method, then click the PDF button.",
      },
      {
        q: "How does the referral program work?",
        a: "Share your unique referral link with friends. When they sign up and deposit RLUSD, you earn bonus SEED points through Soil Protocol, which can boost your yields over time. If a referred friend upgrades to Premium, you get one free month of Premium.",
      },
      {
        q: "What is XLS-65/66 Lending?",
        a: "XLS-65 (Single Asset Vaults) and XLS-66 (Lending Protocol) are proposed XRPL amendments for native on-ledger lending. They're currently in validator voting and require 80% consensus for 2 weeks to activate. When live, you'll be able to lend XRP directly from your cold wallet into on-ledger vaults — no bridges, no smart contracts, no custody risk. CryptoOwnBank is fully built and ready to activate the moment the amendments pass. Pro members get access.",
      },
      {
        q: "How does the XRPL amendment voting process work?",
        a: "XRPL amendments don't work like a ballot where validators vote yes or no. Instead, validators signal support passively by upgrading their server software (rippled) to a version that includes the amendment code. When a validator upgrades to the required version, their server automatically signals 'I support this amendment' in every ledger validation it publishes. Validators on older versions simply don't signal — they haven't said no, they just haven't upgraded yet. There is no 'reject' mechanism. For an amendment to activate, 80% of the validators on the Unique Node List (UNL) must be running the new version, and that 80% threshold must be sustained continuously for 2 full weeks. Once those conditions are met, the amendment activates automatically on the next flag ledger — no human action needed. So when you see '17% support,' that means 17% of validators have upgraded so far. The remaining 83% haven't voted against it — they simply haven't upgraded their software yet. The timeline depends entirely on how quickly validator operators (Ripple, exchanges, universities, independent operators) choose to upgrade. Some move fast, some are cautious. That's why there's no guaranteed activation date.",
      },
      {
        q: "How do I prepare my XRP cold wallets for XLS-65 lending?",
        a: "If you want to lend XRP from your cold wallets, the good news is: you're already set up. XRP is the native asset on the XRPL, so no trustline is needed — every XRPL wallet can send and receive XRP by default. When you deposit into an XLS-65 vault, you receive vault shares as Multi-Purpose Tokens (MPTs), which are a new XRPL object type that don't use the old trustline system either. Your wallet receives them automatically as part of the VaultDeposit transaction. So your Day 1 checklist is: (1) Make sure each cold wallet is imported into Xaman — see our Setup Guide for a full walkthrough. (2) That's it. When XLS-65 activates, come to CryptoOwnBank, browse the on-ledger vaults, pick one, click Deposit, enter your amount, and sign in Xaman from whichever cold wallet you want to use. For straight XRP lending, there's nothing to configure — you're just waiting on the validators to upgrade.",
      },
      {
        q: "Do I need a trustline to lend XRP?",
        a: "No. XRP is the native asset on the XRPL — it doesn't need a trustline. Trustlines are only required for issued tokens (like RLUSD, USD, EUR) because those tokens are created by a specific issuer, and your wallet needs to explicitly authorize holding tokens from that issuer. XRP has no issuer — it's built into the ledger itself, so every wallet can hold and transact with it automatically. If you want to deposit XRP into an XLS-65 vault, you just sign the VaultDeposit transaction in Xaman and you're done. No trustline setup, no extra steps.",
      },
    ],
  },
  {
    heading: "Safety & Disclaimers",
    items: [
      {
        q: "Is this financial advice?",
        a: "No — this is not financial, investment, or tax advice. Crypto and yield protocols involve risk of loss. Past performance isn't indicative of future results. Always do your own research (DYOR) and consider your own situation. We provide tools and information only.",
      },
      {
        q: "What if I have more questions or issues?",
        a: "Use the in-site contact form or join XRPL community channels. Note: we can't help with wallet recovery or fund issues since we're non-custodial — only you control your keys.",
      },
    ],
  },
];

function AmendmentTracker() {
  const { data } = useQuery<{
    xls65: { name: string; enabled: boolean; count: number; threshold: number; validatorCount: number; percentage: number } | null;
    xls66: { name: string; enabled: boolean; count: number; threshold: number; validatorCount: number; percentage: number } | null;
    lastChecked: string | null;
  }>({
    queryKey: ["/api/xls66/amendment-progress"],
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || (!data.xls65 && !data.xls66)) return null;

  const timeAgo = data.lastChecked ? (() => {
    const mins = Math.round((Date.now() - new Date(data.lastChecked!).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  })() : null;

  const renderBar = (item: NonNullable<typeof data.xls65>, label: string) => {
    const pct = item.percentage;
    const barColor = item.enabled ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-[#00A4E4]";
    return (
      <div className="space-y-2" data-testid={`landing-voting-${label.replace(/\s/g, "-").toLowerCase()}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-sm">
            {item.enabled ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active on Mainnet</Badge>
            ) : (
              <span className="text-muted-foreground">{item.count}/{item.validatorCount} validators ({pct}%)</span>
            )}
          </span>
        </div>
        <div className="relative w-full bg-muted rounded-full h-3 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          {!item.enabled && (
            <div className="absolute top-0 h-full" style={{ left: "80%" }}>
              <div className="w-0.5 h-full bg-white/50" />
            </div>
          )}
        </div>
        {!item.enabled && (
          <p className="text-xs text-muted-foreground">Needs {item.threshold} of {item.validatorCount} validators (80%) for 2 consecutive weeks to activate</p>
        )}
      </div>
    );
  };

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-background" data-testid="section-amendment-tracker">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/30">Live from XRPL</Badge>
          <h2 className="text-3xl font-bold mb-3" data-testid="heading-amendment-tracker">XRPL Amendment Progress</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Two new XRPL amendments are being voted on by validators right now. When they reach 80% support for 2 weeks, 
            non-custodial lending vaults go live — and CryptoOwnBank is ready from day one.
          </p>
        </div>
        <Card className="border-2">
          <CardContent className="p-6 space-y-6">
            {data.xls65 && renderBar(data.xls65, "XLS-65 Single Asset Vaults")}
            {data.xls66 && renderBar(data.xls66, "XLS-66 Lending Protocol")}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Live data from XRPL validators{timeAgo ? ` · Updated ${timeAgo}` : ""}</span>
              </div>
              <a href="/login">
                <Button size="sm" className="bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-amendment-signup">
                  Get Ready — Sign Up Free
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-muted/50">
            <Wallet className="h-5 w-5 mx-auto mb-2 text-[#00A4E4]" />
            <p className="text-sm font-medium">Link Your Cold Wallets</p>
            <p className="text-xs text-muted-foreground mt-1">Connect via Xaman so you're ready to deposit the moment vaults go live</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-medium">100% Non-Custodial</p>
            <p className="text-xs text-muted-foreground mt-1">Your keys never leave your hardware device — we build transactions, you sign them</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-amber-500" />
            <p className="text-sm font-medium">Earn Yield on XRP</p>
            <p className="text-xs text-muted-foreground mt-1">Lend XRP directly from your cold wallet and earn interest — no intermediary</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left gap-4"
        data-testid={`faq-toggle-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
      >
        <span className="font-medium text-foreground">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-muted-foreground leading-relaxed pr-8">{a}</p>
      )}
    </div>
  );
}

export default function Landing() {
  const landingJsonLd = useMemo(() => [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "CryptoOwnBank",
      url: "https://cryptoownbank.com",
      logo: "https://cryptoownbank.com/favicon.png",
      description: "Non-custodial crypto portfolio tracker with RLUSD yield vaults earning 5-8% APR.",
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CryptoOwnBank",
      url: "https://cryptoownbank.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://cryptoownbank.com/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "CryptoOwnBank",
      operatingSystem: "Web",
      applicationCategory: "FinanceApplication",
      description: "Non-custodial crypto portfolio tracker with RLUSD yield vaults earning 5-8% APR. Connect your cold wallet, track your portfolio across 24 blockchains, and earn real yield.",
      offers: [
        { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier" },
        { "@type": "Offer", price: "29", priceCurrency: "USD", description: "Premium Monthly" },
        { "@type": "Offer", price: "199", priceCurrency: "USD", description: "Premium Annual" },
      ],
    },
  ], []);

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="CryptoOwnBank — Be Your Own Bank | Track Crypto & Earn Yield"
        description="Non-custodial crypto portfolio tracker with RLUSD yield vaults earning 5-8% APR. Connect your cold wallet, track your portfolio, and earn real yield — principal always protected."
        path="/"
        jsonLd={landingJsonLd}
      />
      <div className="fixed top-0 left-0 right-0 z-[60] bg-[#00A4E4] text-white text-center py-1.5 text-xs font-medium" data-testid="banner-beta">
        Beta — Early Access &middot; We're actively building. Your feedback shapes the product.
      </div>

      <header className="fixed top-[30px] left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A4E4]">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-semibold" data-testid="text-brand-name">CryptoOwnBank</span>
                <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Be Your Own Bank</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <a href="#how-it-works" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#features" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#on-chain" className="hidden lg:inline text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-on-chain">
                Why On-Chain
              </a>
              <a href="#pricing" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#faq" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </a>
              <a href="/setup-guide" className="hidden lg:inline text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-getting-started">
                Getting Started
              </a>
              <a href="/yield-calculator" className="hidden lg:inline text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-yield-calculator">
                Yield Calculator
              </a>
              <ThemeToggle />
              <a href="/login">
                <Button data-testid="button-login">Sign In</Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-36 sm:pt-40 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-sm font-medium" data-testid="badge-non-custodial">
                    <Shield className="h-3.5 w-3.5" />
                    Non-Custodial &middot; Cold Wallet Only &middot; You Control Your Keys
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                    Be Your Own
                    <span className="block text-[#00A4E4]">Bank</span>
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-lg">
                    Track your entire crypto portfolio. Earn real 5–8% fixed yield on RLUSD.
                    Withdraw only the interest — your principal stays locked and protected forever.
                  </p>
                  <p className="text-sm text-muted-foreground/80 max-w-lg">
                    Deposit RLUSD into Soil vaults &rarr; earn fixed yield &rarr; withdraw only the earnings. Simple. Secure. Yours.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <a href="/login">
                    <Button size="lg" className="w-full sm:w-auto bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-get-started">
                      Connect Wallet — Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <a href="#pricing">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-upgrade-hero">
                      Upgrade to Premium
                    </Button>
                  </a>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Free forever tier
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Ledger + Xumm supported
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    No credit card required
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="relative rounded-xl border bg-card p-6 shadow-lg">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-[#00A4E4]/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-[#00A4E4]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Connected Wallet</p>
                        <p className="font-mono text-sm font-medium" data-testid="text-demo-wallet">rN7dP...k4Xm9</p>
                      </div>
                      <div className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                        Connected
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {heroStats.map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/60 text-center">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-bold text-[#00A4E4]">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium">Soil Treasury Vault</p>
                            <p className="text-xs text-muted-foreground">US Treasury backed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">5.2% APR</p>
                          <p className="text-xs text-muted-foreground">$10,000 deposited</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">Soil Private Credit</p>
                            <p className="text-xs text-muted-foreground">Private credit backed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600">8.0% APR</p>
                          <p className="text-xs text-muted-foreground">$5,000 deposited</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Earned Interest (This Month)</p>
                        <p className="text-xl font-bold text-emerald-600">+$76.44</p>
                      </div>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        Withdraw Interest
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="absolute -z-10 -inset-4 bg-gradient-to-r from-[#00A4E4]/20 to-emerald-500/20 rounded-xl blur-2xl opacity-50" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-why">Why CryptoOwnBank?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                You've been holding crypto for the long game.
                Now it's time to make your assets work for you — without selling a single token.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {whyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                  <div className="h-8 w-8 rounded-md bg-[#00A4E4]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <point.icon className="h-4 w-4 text-[#00A4E4]" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{point.text}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <p className="text-muted-foreground italic">
                This isn't another DeFi gamble. This is your own bank, running on XRPL rails, today.
              </p>
            </div>
          </div>
        </section>

        <section id="why" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold" data-testid="heading-why">
              Why CryptoOwnBank Exists
            </h2>
            <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
              <p>
                Most dashboards today are either multi-chain tools that treat XRPL as
                an afterthought, or they're built around centralized platforms that hold
                your keys.
              </p>
              <p className="text-foreground font-medium">
                We built CryptoOwnBank differently.
              </p>
              <p>
                It's a focused, non-custodial dashboard made specifically for XRPL users
                who want to earn real yield on RLUSD through Soil vaults — while keeping
                full control with their own cold wallet.
              </p>
              <p className="text-foreground font-medium italic">
                Simple, secure, and built for people who actually want to be their own bank.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-how-it-works">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to start earning — while keeping full control of your keys and funds.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {howItWorks.map((step) => (
                <Card key={step.step} className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="absolute top-4 right-4 text-5xl font-bold text-muted/30">
                      {step.step}
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center mb-4">
                      <step.icon className="h-6 w-6 text-[#00A4E4]" />
                    </div>
                    <h3 className="font-semibold text-lg mb-3">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
                    <p className="text-xs text-muted-foreground/70 italic">{step.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-center mt-8 text-lg font-medium text-[#00A4E4]">
              Your base never moves. Your money never sleeps.
            </p>
          </div>
        </section>

        <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-features">Your Complete Crypto Cockpit</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Stop jumping between Coinbase, Kraken, Ledger Live, and Yahoo Finance. Manage every exchange, wallet, vault, and tax report from a single dashboard.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-[#00A4E4]" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                    {"link" in feature && feature.link && (
                      <a href={feature.link} data-testid={`link-feature-${index}`}>
                        <Button size="sm" variant="outline" className="border-[#00A4E4]/40 text-[#00A4E4] hover:bg-[#00A4E4]/10">
                          {feature.linkLabel}
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="xrpl-tools" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-sm font-medium mb-4">
                <Zap className="h-3.5 w-3.5" />
                XRPL Native Tools
              </div>
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-xrpl-tools">
                Everything Your Bank Does — But You Own It
              </h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">
                The XRP Ledger has built-in financial tools that replace traditional intermediaries.
                No brokers, no banks, no middlemen — just you, your wallet, and the blockchain.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-4 mb-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center">The Old Way</p>
                <div className="w-8" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center">The New Way</p>
              </div>

              {xrplToolsComparison.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch" data-testid={`card-xrpl-comparison-${index}`}>
                  <Card className="bg-muted/50">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <item.oldIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-muted-foreground">{item.oldTitle}</h4>
                        <p className="text-sm text-muted-foreground/70 mt-1">{item.oldDesc}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="hidden md:flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-[#00A4E4]" />
                  </div>
                  <div className="flex md:hidden items-center justify-center">
                    <ChevronDown className="h-5 w-5 text-[#00A4E4]" />
                  </div>

                  <Card className="border-[#00A4E4]/20">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center flex-shrink-0">
                        <item.newIcon className="h-5 w-5 text-[#00A4E4]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{item.newTitle}</h4>
                          {item.status === "coming" ? (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-coming-soon-${index}`}>Coming Soon</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-live-${index}`}>Live</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.newDesc}</p>
                        {item.status === "live" && (
                          <a href={item.link} className="inline-flex items-center gap-1 text-xs text-[#00A4E4] font-medium mt-2" data-testid={`link-xrpl-tool-${index}`}>
                            Try it now <ArrowRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <a href="/signup">
                <Button size="lg" className="bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-xrpl-tools-cta">
                  Start Using XRPL Tools — Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                All XRPL tools are non-custodial. Your keys never leave your device.
              </p>
            </div>
          </div>
        </section>

        <section id="payment-corridor" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-4">
                  <Store className="h-3.5 w-3.5" />
                  For Consumers & Small Businesses
                </div>
                <h2 className="text-3xl font-bold mb-4" data-testid="heading-payment-corridor">
                  Your Payment Corridor — Not Stripe's
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Stripe charges 2.9% + $0.30 on every transaction. Wire transfers cost $25–50 and take days.
                  PayPal freezes accounts. Every traditional payment method puts a middleman between you and your money.
                </p>
                <p className="text-foreground font-medium mb-6">
                  The XRPL flips this entirely. XRP acts as the bridge currency — value moves from any point A to any point B in 4 seconds, for a fraction of a penny, 24/7/365.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3" data-testid="text-corridor-point-0">
                    <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Store className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Merchants & freelancers</p>
                      <p className="text-xs text-muted-foreground">Accept RLUSD (dollar-pegged) or any XRPL token. No signup forms, no processing fees, no chargebacks. Customer scans a QR code, signs with their wallet, and payment settles in seconds.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3" data-testid="text-corridor-point-1">
                    <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Send className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cross-currency payments</p>
                      <p className="text-xs text-muted-foreground">Customer pays in EUR, you receive USD — XRP bridges the gap automatically using the XRPL's built-in DEX. One transaction, 4 seconds, no correspondent banks.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3" data-testid="text-corridor-point-2">
                    <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Handshake className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No middleman, no permission</p>
                      <p className="text-xs text-muted-foreground">CryptoOwnBank gives you the tools — you process your own payments. We're the workbench, not the payment processor. No percentage taken from every sale, no platform holding your funds.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3" data-testid="text-corridor-point-3">
                    <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Full payment toolkit</p>
                      <p className="text-xs text-muted-foreground">Generate payment requests, share QR codes, track incoming payments, manage your token positions, and save contacts — all from one dashboard, all non-custodial.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="overflow-hidden border-emerald-500/20" data-testid="card-corridor-comparison">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">The Real Cost of Getting Paid</h3>
                    <div className="space-y-3">
                      {[
                        { method: "Stripe / PayPal", fee: "2.9% + $0.30", time: "2 days", risk: "Account freezes, chargebacks" },
                        { method: "Wire transfer", fee: "$25–50", time: "1–5 days", risk: "Bank hours only, forms required" },
                        { method: "Venmo / Cash App", fee: "1.9% (business)", time: "1–3 days", risk: "Personal limits, reporting" },
                      ].map((row, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-muted-foreground">{row.method}</span>
                            <span className="text-sm font-bold text-red-500 dark:text-red-400">{row.fee}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{row.time} settlement · {row.risk}</p>
                        </div>
                      ))}

                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">XRPL (via CryptoOwnBank)</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">~0.00001 XRP</span>
                        </div>
                        <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">4-second settlement · No chargebacks · Direct wallet-to-wallet</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden" data-testid="card-corridor-positioning">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-[#00A4E4]" />
                      <h3 className="font-semibold text-lg">You Own the Payment Rail</h3>
                    </div>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">With Stripe</span> — they process your payment, take 2.9%, hold your money for 2 days, and can freeze your account, delay payouts, or shut you down at any time. You have no recourse.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">With CryptoOwnBank</span> — you process your own payment. Funds go directly to your wallet in 4 seconds. Nobody can freeze it, reverse it, or take a cut. Refunds happen on your terms, not a card network's.
                      </p>
                      <p className="text-xs">
                        That's what "be your own bank" means in practice: you control when money comes in, when it goes out, and nobody sits between you and your revenue.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-12 text-center">
              <a href="/signup">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-corridor-cta">
                  Start Accepting Payments — Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-3 max-w-lg mx-auto">
                Connect your wallet, share your payment QR code, and get paid in seconds.
                No forms, no fees, no waiting. Consumers and small businesses welcome.
              </p>
            </div>
          </div>
        </section>

        <section id="multi-chain" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-b border-border/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-3" data-testid="heading-multi-chain">
                Two Chains, One Platform — Use Each for What It Does Best
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                XRP Ledger for institutional-grade savings and trading. Stellar for retail payments and global remittances.
                CryptoOwnBank brings both together so you don't have to choose.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border bg-[#00A4E4]/5 border-[#00A4E4]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-3 w-3 rounded-full bg-[#00A4E4]" />
                  <h3 className="font-semibold">XRP Ledger</h3>
                  <span className="text-xs text-muted-foreground ml-auto">Savings &amp; Trading</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-[#00A4E4] mt-0.5">✓</span> <a href="/ownbank/vaults" className="hover:text-[#00A4E4] hover:underline transition-colors">5–8% fixed APR on RLUSD yield vaults →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#00A4E4] mt-0.5">✓</span> <a href="/ownbank/dex" className="hover:text-[#00A4E4] hover:underline transition-colors">Built-in DEX — no smart contracts, no middleman apps →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#00A4E4] mt-0.5">✓</span> <a href="/wallets" className="hover:text-[#00A4E4] hover:underline transition-colors">Non-custodial wallet management →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#00A4E4] mt-0.5">✓</span> <a href="/ownbank/invoices" className="hover:text-[#00A4E4] hover:underline transition-colors">B2B invoicing &amp; payment corridors →</a></li>
                </ul>
              </div>
              <div className="p-5 rounded-xl border bg-[#7B61FF]/5 border-[#7B61FF]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-3 w-3 rounded-full bg-[#7B61FF]" />
                  <h3 className="font-semibold">Stellar</h3>
                  <span className="text-xs text-muted-foreground ml-auto">Payments &amp; Remittances</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-[#7B61FF] mt-0.5">✓</span> <a href="/stellar/wallet" className="hover:text-[#7B61FF] hover:underline transition-colors">Wallet dashboard — connect your Stellar address, view balances &amp; reserves →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#7B61FF] mt-0.5">✓</span> <a href="/stellar/dex" className="hover:text-[#7B61FF] hover:underline transition-colors">Built-in DEX — trade XLM, USDC, EURC, BTC and more →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#7B61FF] mt-0.5">✓</span> <a href="/stellar/send" className="hover:text-[#7B61FF] hover:underline transition-colors">Send &amp; receive — LOBSTR, Freighter, StellarTerm, StellarX deep links →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#7B61FF] mt-0.5">✓</span> <a href="/stellar/tokens" className="hover:text-[#7B61FF] hover:underline transition-colors">Token manager — add/remove trustlines for any Stellar asset →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#7B61FF] mt-0.5">✓</span> <a href="/stellar/invoices" className="hover:text-[#7B61FF] hover:underline transition-colors">Invoicing — QR codes &amp; payment request links via web+stellar:pay →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#7B61FF] mt-0.5">✓</span> <a href="/stellar/remittances" className="hover:text-[#7B61FF] hover:underline transition-colors">Remittance corridor calculator &amp; guides →</a></li>
                  <li className="flex items-start gap-2"><span className="text-[#7B61FF] mt-0.5">✓</span> <a href="/stablecoins" className="hover:text-[#7B61FF] hover:underline transition-colors">USDC &amp; EURC stablecoin support →</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 p-6 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <h3 className="font-semibold mb-3 text-center" data-testid="heading-why-native">Why We Build on Native Blockchain Rails — Not Third-Party Apps</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Most crypto platforms today patch together a maze of third-party apps to make things work. Want to swap tokens on Ethereum? You need MetaMask, then Uniswap, then ETH for gas, then hope the smart contract hasn't been exploited. Want to trade on BNB Chain? Different wallet, different DEX (PancakeSwap), different gas token. Solana? Another wallet, another app (Jupiter), another set of permissions. Every layer is another company, another point of failure, another entity that can go offline, get hacked, or change the rules.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                CryptoOwnBank takes a fundamentally different approach. We chose the XRP Ledger and Stellar because they have something almost no other blockchain has: <span className="text-foreground font-medium">a decentralized exchange built into the protocol itself</span>. The DEX isn't an app someone built on top — it's part of the chain, run by the same validators that process every transaction. No smart contracts to exploit. No front-end website to hack. No company to shut it down. No governance token you need to buy. No wrapped tokens adding another layer of risk.
              </p>
              <p className="text-sm text-foreground font-medium leading-relaxed">
                Our philosophy is simple: get your assets on the blockchain, use XRP as your bridge currency, and the native DEX handles the rest. One chain, one wallet, one bridge — not a patchwork of five apps, three gas tokens, and two browser extensions. That's what "be your own bank" actually looks like.
              </p>
            </div>
            <div className="mt-6 text-center flex flex-wrap items-center justify-center gap-3">
              <a href="/chain-guide">
                <Button variant="outline" data-testid="button-chain-guide-cta">
                  Explore the Chain Guide — XRP vs XLM
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="/rwa-yields">
                <Button variant="outline" data-testid="button-rwa-yields-cta">
                  Earn & Yield Explorer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="/stablecoins">
                <Button variant="outline" data-testid="button-stablecoins-cta">
                  Stablecoin Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section id="own-nothing-control-everything" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-sm font-medium mb-4">
                <Fingerprint className="h-3.5 w-3.5" />
                Our Philosophy
              </div>
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-own-nothing">
                Own Nothing. Control Everything.
              </h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">
                Rockefeller used trusts and entities to separate ownership from control. Crypto made that unnecessary. When you hold your own keys, you own it AND control it — with no uninvited third party in your decisions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              <Card className="overflow-hidden border-[#00A4E4]/30 bg-[#00A4E4]/5" data-testid="card-philosophy-cryptoownbank">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center mb-3">
                    <Wallet className="h-5 w-5 text-[#00A4E4]" />
                  </div>
                  <h3 className="font-semibold mb-1">CryptoOwnBank</h3>
                  <p className="text-xs text-[#00A4E4] font-medium mb-2">You own it. You control it.</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> Your keys never leave your device</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> Transfer, trade, earn — no permission needed</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> Decentralized assets stay under your control</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> Walk away anytime — no lawyers, no paperwork</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="overflow-hidden" data-testid="card-philosophy-cbdc">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
                    <Eye className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="font-semibold mb-1">CBDCs</h3>
                  <p className="text-xs text-red-500 font-medium mb-2">Designed for issuer control.</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" /> Programmable — spending rules set by the issuer</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" /> Some designs allow expiration or usage limits</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" /> Account restrictions possible without your input</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" /> Transaction visibility built into the architecture</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="overflow-hidden" data-testid="card-philosophy-custodial">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                    <Building2 className="h-5 w-5 text-amber-500" />
                  </div>
                  <h3 className="font-semibold mb-1">Custodial Services</h3>
                  <p className="text-xs text-amber-500 font-medium mb-2">Someone else holds the keys.</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" /> A company manages your private keys</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" /> Account access subject to their terms</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" /> If they go under, you join a creditor queue</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" /> Ongoing custody and management fees</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="overflow-hidden" data-testid="card-philosophy-banks">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center mb-3">
                    <Landmark className="h-5 w-5 text-gray-500" />
                  </div>
                  <h3 className="font-semibold mb-1">Traditional Banks</h3>
                  <p className="text-xs text-gray-500 font-medium mb-2">Your deposit becomes their balance sheet.</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" /> Deposits are legally the bank's asset</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" /> Accounts can be closed or limited at discretion</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" /> Yield typically trails what the bank earns</li>
                    <li className="flex items-start gap-2"><Ban className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" /> Disputes often require legal involvement</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden border-[#00A4E4]/20 max-w-4xl mx-auto" data-testid="card-xrp-parallel">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center shrink-0 mt-1">
                    <Coins className="h-6 w-6 text-[#00A4E4]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2" data-testid="text-xrp-philosophy">The XRP Principle</h3>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      Ripple manages the release of 1 billion XRP per month from escrow. But once that XRP reaches your wallet, the protocol doesn't give Ripple any mechanism to restrict how you use it. That's how the XRPL was designed. The same principle guides how we think about self-custody for decentralized assets.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      We provide the tools — portfolio tracking, yield vaults, DEX trading, payment processing. But we don't stand between you and your assets. You decide when to move them, where to send them, and what to do with them. That direct relationship between you and your wallet is what self-custody is about.
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      With decentralized crypto, the protocol works for the holder. With centrally issued digital currencies, the design priorities may differ. Understanding that distinction is worth your time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="financial-access" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-medium mb-4">
                <Globe className="h-3.5 w-3.5" />
                Unbanked &middot; Debanked &middot; Underbanked
              </div>
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-financial-access">
                If You Have Internet, You Have a Bank
              </h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">
                1.4 billion adults worldwide have no bank account. Millions more have been debanked — shut out by institutions that decided they're too risky, too small, or too inconvenient to serve. The XRPL doesn't care about any of that.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="overflow-hidden" data-testid="card-unbanked">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">The Unbanked</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    No bank branch in your village. No government ID that meets requirements. No minimum balance to keep an account open. Traditional finance was never built for you.
                  </p>
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <p className="text-sm font-medium">With the XRPL: a smartphone and internet connection is all you need. Get paid directly for your goods and services in RLUSD — no bank, no exchange, no fiat conversion. A farmer sells produce, a buyer scans a QR code, and digital dollars land in the farmer's wallet in 4 seconds.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden" data-testid="card-debanked">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                    <UserX className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">The Debanked</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Account closed without explanation. PayPal froze your funds for 180 days. Stripe shut down your business overnight. You had access — until someone decided you didn't.
                  </p>
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <p className="text-sm font-medium">On the XRPL: nobody can close your wallet, freeze your funds, or deny you service. Your keys, your money, your business — running 24/7 on a decentralized network no company controls.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden" data-testid="card-underbanked">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                    <Wifi className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Everyone Else</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Overdraft fees, $12/month account charges, 0.01% savings rates, 3-day holds on deposits, $35 wire fees, limited business hours. Banks nickel-and-dime the people who can least afford it.
                  </p>
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <p className="text-sm font-medium">The XRPL charges a fraction of a penny per transaction. Earn 5–8% yield instead of 0.01%. Send money anywhere in 4 seconds. No monthly fees, no overdrafts, no surprises. Open 24/7/365.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden border-purple-500/20 max-w-4xl mx-auto" data-testid="card-internet-is-enough">
              <CardContent className="p-6 sm:p-8">
                <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-center">
                  <div>
                    <h3 className="font-semibold text-xl mb-3">Earn It, Hold It, Spend It — No Bank Touches It</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      You don't need to "buy" crypto through an exchange or convert from a bank account. You can earn it directly — sell goods, provide services, do work, and get paid in RLUSD or XRP.
                      A farmer sells produce at a market, the buyer scans a QR code, and 25 RLUSD lands in the farmer's wallet in 4 seconds. No bank involved at any point.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Then spend it the same way: pay your seed supplier in RLUSD, send money to family in another country, save the rest in a Soil vault earning 5-8% APR.
                      Every person you help set up a wallet grows the network. A village where 20 people have XRPL wallets is a village with its own financial system — no bank branch required.
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      And here's what levels the field completely: 1 XRP held by someone in America has the exact same value as 1 XRP held by someone in Nigeria. No currency depreciation. No exchange rate penalty for living in the wrong country. A street vendor in Lagos and a freelance developer in Berlin use the same tools, hold the same value, pay the same fees (practically zero), and settle in the same 4 seconds.
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-center gap-2 text-center px-4">
                    <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Wifi className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 max-w-[120px]">Internet is the only requirement</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-10 text-center">
              <a href="/signup">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700" data-testid="button-access-cta">
                  Get On-Chain — Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-3 max-w-md mx-auto">
                No bank account needed. No credit check. No minimum balance. Just connect a wallet and go.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-why-members">Why Members Love OwnBank</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real reasons people are switching to CryptoOwnBank for saving, earning, and tracking.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {memberStories.map((story, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`p-6 bg-gradient-to-br ${story.accent}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-background/80 flex items-center justify-center">
                          <story.icon className="h-5 w-5 text-[#00A4E4]" />
                        </div>
                        <h3 className="font-semibold text-lg">{story.title}</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mb-4">{story.story}</p>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium">{story.benefit}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-sm font-medium mb-4" data-testid="badge-broker">
                  <Wallet className="h-3.5 w-3.5" />
                  Smart Assistant
                </div>
                <h2 className="text-3xl font-bold mb-4" data-testid="heading-broker">
                  Your Personal On-Chain Broker — Without Giving Up Control
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  We built CryptoOwnBank to give you the best of both worlds:
                  you remain the sole owner of your assets (cold wallet only),
                  and we act as your smart assistant that handles the boring parts.
                </p>
                <p className="text-foreground font-medium mb-6">
                  Think of us like a personal broker who:
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    { icon: TrendingUp, text: "Shows you the best yield opportunities in real time" },
                    { icon: Zap, text: "Pre-builds every transaction so you just click \u201CSign\u201D" },
                    { icon: RefreshCw, text: "Automates interest withdrawals on your schedule" },
                    { icon: ArrowRight, text: "Guides you from exchange \u2192 wallet \u2192 vault in one smooth flow" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3" data-testid={`text-broker-point-${i}`}>
                      <div className="h-8 w-8 rounded-md bg-[#00A4E4]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4 text-[#00A4E4]" />
                      </div>
                      <p className="text-sm text-foreground leading-relaxed pt-1">{item.text}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mb-6">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">You never lose control.</span>{" "}
                    Every single action still requires your cold wallet signature.
                    We just remove the friction so "being your own bank" actually feels good instead of painful.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="overflow-hidden" data-testid="card-broker-why-switching">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3">Why Thousands Are Switching</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      They keep 100% ownership and security, but finally get the convenience they've been missing.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Ownership", value: "100%" },
                        { label: "Keys Stored", value: "Zero" },
                        { label: "Yield", value: "5–8%" },
                        { label: "Friction", value: "None" },
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/60 text-center">
                          <p className="text-lg font-bold text-[#00A4E4]">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-[#00A4E4]/30" data-testid="card-broker-premium">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                      <h3 className="font-semibold text-lg">The Full Broker Experience</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Premium members get everything a personal broker would offer:
                    </p>
                    <div className="space-y-2">
                      {[
                        "Auto-scheduled interest withdrawals",
                        "One-click exchange \u2192 vault flows",
                        "Tax-ready CSV reports",
                        "Priority alerts for new vaults",
                        "XLS-66 lending early access",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <a href="#pricing" className="block mt-4">
                      <Button className="w-full bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-broker-upgrade">
                        Upgrade to Premium
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-why-now">Why Members Are Joining Right Now</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {whyNow.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                  <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-sm text-foreground">{item.text}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-8">
              Crypto holders everywhere are already quietly earning on stablecoins.
              CryptoOwnBank makes it dead simple and safe.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3" data-testid="heading-testimonials">What Members Are Saying</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Real feedback from crypto investors, traders, HODLers, and yield earners who use CryptoOwnBank every day.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {testimonials.map((t, i) => (
                <Card key={i} className="flex flex-col" data-testid={`card-testimonial-${i}`}>
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#00A4E4]/10 text-[#00A4E4]" data-testid={`badge-persona-${i}`}>{t.persona}</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-4 italic flex-1">"{t.quote}"</p>
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">{t.author.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.author}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-rlusd">What Is RLUSD?</h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">
                RLUSD is Ripple's regulated US dollar stablecoin on the XRP Ledger. It's pegged 1:1 to USD and backed by cash,
                US Treasuries, and cash equivalents. You can buy RLUSD on these exchanges and then deposit it into yield vaults through CryptoOwnBank.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {[
                { name: "Coinbase", url: "https://coinbase.com/join/TT3HJ4K?src=ios-link" },
                { name: "Kraken", url: "https://proinvite.kraken.com/9f1e/oya30ft6" },
                { name: "Binance", url: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196" },
              ].map((exchange) => (
                <a
                  key={exchange.name}
                  href={exchange.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`link-exchange-${exchange.name.toLowerCase()}`}
                >
                  <Button variant="outline" size="lg" className="gap-2">
                    {exchange.name}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              After purchasing RLUSD, send it to your XRPL wallet and deposit into a vault through CryptoOwnBank.
            </p>
          </div>
        </section>

        <section id="pricing" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#00A4E4] font-medium mb-2" data-testid="text-pricing-tagline">Your crypto is everywhere. Your cockpit is here.</p>
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-pricing">One Dashboard to Rule Them All</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Start free with enough to see the value. Go Premium to unlock the full cockpit — manage every exchange, wallet, and yield source from one place.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card data-testid="card-plan-free">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-1">Free Forever</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground">/forever</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {freeTierFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/signup">
                    <Button className="w-full" variant="outline" data-testid="button-plan-free">
                      Start Free
                    </Button>
                  </a>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-[#00A4E4] border-2 shadow-lg" data-testid="card-plan-premium">
                <div className="absolute top-0 left-0 right-0 bg-[#00A4E4] text-white text-center text-xs font-medium py-1">
                  Most Popular
                </div>
                <CardContent className="p-6 pt-8">
                  <h3 className="text-xl font-bold mb-1">Premium</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold">$29</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-[#00A4E4] font-medium mb-4">or $199/yr — Save $149 · Pay with crypto (25 chains) or card</p>
                  <ul className="space-y-3 mb-4">
                    {premiumFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-amber-200 dark:border-amber-800 pt-3 mb-4">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Annual plan bonus</p>
                    <ul className="space-y-2">
                      {annualBonusFeatures.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a href="/signup">
                    <Button className="w-full bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-plan-premium">
                      Go Premium
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-purple-500 border-2" data-testid="card-plan-pro">
                <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white text-center text-xs font-medium py-1">
                  Business & High-Value
                </div>
                <CardContent className="p-6 pt-8">
                  <h3 className="text-xl font-bold mb-1">Pro</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold">$99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-4">or $799/yr — Save $389 · Pay with crypto or card</p>
                  <ul className="space-y-3 mb-6">
                    {proFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/signup">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-plan-pro">
                      Go Pro
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6" data-testid="heading-security">
                  Built for Security
                </h2>
                <p className="text-muted-foreground mb-8">
                  Every design decision puts your security first. Non-custodial architecture means
                  we literally cannot access your funds — even if we wanted to.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Shield, title: "Non-Custodial", desc: "Private keys never leave your device. We only see your public address." },
                    { icon: Lock, title: "Client-Side Signing", desc: "All transactions are built in your browser and signed on your Xumm or Ledger." },
                    { icon: Eye, title: "Read-Only Connection", desc: "Our app only reads your balance and transaction history — it cannot initiate transfers." },
                    { icon: Zap, title: "AES-256 Encryption", desc: "Exchange API keys for portfolio tracking are encrypted at rest with bank-grade encryption." },
                    { icon: Globe, title: "XRPL Mainnet", desc: "All vault operations happen on the XRP Ledger mainnet — a public, decentralized blockchain." },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-5 w-5 text-[#00A4E4]" />
                      </div>
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-5 text-center">
                  <div className="text-3xl font-bold text-[#00A4E4]">5–8%</div>
                  <div className="text-sm text-muted-foreground mt-1">Fixed APR on RLUSD</div>
                </Card>
                <Card className="p-5 text-center">
                  <div className="text-3xl font-bold text-[#00A4E4]">100%</div>
                  <div className="text-sm text-muted-foreground mt-1">Principal Protected</div>
                </Card>
                <Card className="p-5 text-center">
                  <div className="text-3xl font-bold text-[#00A4E4]">256-bit</div>
                  <div className="text-sm text-muted-foreground mt-1">AES Encryption</div>
                </Card>
                <Card className="p-5 text-center">
                  <div className="text-3xl font-bold text-[#00A4E4]">0</div>
                  <div className="text-sm text-muted-foreground mt-1">Keys Stored by Us</div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="on-chain" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-sm font-medium mb-4">
                <LinkIcon className="h-3.5 w-3.5" />
                100% On-Chain
              </div>
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-on-chain">
                Why We Don't Connect to Banks (And Why That's Great for You)
              </h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">
                We never touch fiat, never link to your bank account, and never act as a middleman.
                Here's why that matters — and why it puts you in the strongest possible position.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {onChainReasons.map((reason, index) => (
                <Card key={index} className="overflow-hidden" data-testid={`card-onchain-reason-${index}`}>
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center mb-4">
                      <reason.icon className="h-6 w-6 text-[#00A4E4]" />
                    </div>
                    <h3 className="font-semibold text-lg mb-4" data-testid={`text-onchain-reason-title-${index}`}>{reason.title}</h3>
                    <ul className="space-y-3 mb-5">
                      {reason.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="p-3 rounded-lg bg-[#00A4E4]/5 border border-[#00A4E4]/10">
                      <p className="text-sm font-medium text-foreground">{reason.highlight}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-center mb-2" data-testid="heading-how-it-actually-works">
                How It Actually Works (Simple & Safe)
              </h3>
              <p className="text-center text-muted-foreground mb-10">
                No banks. No middlemen. No permission needed. Just you, your keys, and the XRPL.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {onChainSteps.map((step) => (
                  <div key={step.step} className="flex gap-4 p-5 rounded-lg border bg-card" data-testid={`card-onchain-step-${step.step}`}>
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-[#00A4E4] text-white flex items-center justify-center font-bold text-sm">
                        {step.step}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon className="h-4 w-4 text-[#00A4E4]" />
                        <h4 className="font-semibold">{step.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {"note" in step && step.note && (
                        <p className="text-xs text-muted-foreground/70 mt-2 italic">{step.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <div className="inline-block p-6 rounded-xl bg-muted/50 border max-w-2xl" data-testid="text-onchain-bottom-line">
                  <p className="font-semibold text-lg mb-2">Bottom Line</p>
                  <p className="text-muted-foreground">
                    We don't connect to banks because you don't need us to.
                    You already have full control — and that's exactly how we want to keep it.
                  </p>
                  <p className="text-sm text-[#00A4E4] font-medium mt-3">
                    Your keys. Your funds. Your bank.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <a href="/signup">
                  <Button size="lg" className="w-full sm:w-auto bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-onchain-cta">
                    Connect Your Wallet — Free, No KYC, No Bank Needed
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="signing" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-signing">
                Signing Options — Choose Your Security Level
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                CryptoOwnBank is 100% non-custodial. We never see or store your
                private keys. Every action requires your approval. Here are your
                options:
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-[#00A4E4]/40" data-testid="card-signing-landing-0">
                <CardContent className="p-8 space-y-4">
                  <Badge className="bg-[#00A4E4] text-white">Most Secure</Badge>
                  <h3 className="text-xl font-semibold leading-tight">
                    Full Hardware Signing
                    <br />
                    <span className="text-sm font-normal text-muted-foreground">
                      (Ledger Nano X + Xaman)
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Xaman builds the transaction and forwards it to your Ledger.
                    You approve on the hardware device (keys never leave Ledger).
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      Highest security
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      Keys stay offline
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      Industry standard
                    </li>
                  </ul>
                  <p className="text-xs text-[#00A4E4] font-medium pt-2">
                    Recommended for most users
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-signing-landing-1">
                <CardContent className="p-8 space-y-4">
                  <Badge variant="secondary">Most Convenient</Badge>
                  <h3 className="text-xl font-semibold leading-tight">
                    Xaman-Only Signing
                    <br />
                    <span className="text-sm font-normal text-muted-foreground">
                      (Phone Only)
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Approve transactions directly in the Xaman app on your phone
                    (PIN or biometrics). No Ledger needed for small actions.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      Fastest
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      Phone-only
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      Still non-custodial
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card data-testid="card-signing-landing-2">
                <CardContent className="p-8 space-y-4">
                  <Badge variant="secondary">Flexible</Badge>
                  <h3 className="text-xl font-semibold leading-tight">
                    Hybrid Approach
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use Ledger for large or important transactions. Switch to
                    Xaman-only for quick daily actions.
                  </p>
                  <p className="text-sm text-muted-foreground pt-4">
                    Best of both worlds. Most users end up here.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-10">
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium mb-3">Our Recommendation</p>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                  Start with{" "}
                  <span className="text-[#00A4E4] font-medium">
                    Full Hardware Signing (Ledger Nano X + Xaman)
                  </span>
                  . This is the safest and most trusted way. You can always add
                  Xaman-only signing later for convenience.
                </p>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center mt-8">
              No matter which option you choose, you remain in full control. We
              never see your keys.
            </p>
          </div>
        </section>

        <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-faq">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Everything you need to know about CryptoOwnBank, yield vaults, principal protection, and how your funds stay safe.
              </p>
            </div>

            <div className="space-y-8">
              {faqGroups.map((group, groupIndex) => (
                <Card key={groupIndex}>
                  <CardContent className="p-6">
                    <h3
                      className="text-lg font-semibold mb-4 text-[#00A4E4]"
                      data-testid={`heading-faq-group-${groupIndex}`}
                    >
                      {group.heading}
                    </h3>
                    {group.items.map((faq, index) => (
                      <FAQItem key={index} q={faq.q} a={faq.a} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <AmendmentTracker />

        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#00A4E4] text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4" data-testid="heading-cta">Ready to Be Your Own Bank?</h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Connect your cold wallet, track your portfolio, deposit RLUSD, and start earning 5–8% fixed APR —
              all while keeping full control of your keys. No bank required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/login">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" data-testid="button-cta-start">
                  Start Earning Now — Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10" data-testid="button-cta-premium">
                  Upgrade to Premium — $29/mo
                </Button>
              </a>
            </div>
            <p className="text-white/50 text-xs mt-6">
              Not financial advice. Not a bank. You control your keys and funds at all times.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-5 w-5 text-[#00A4E4]" />
                <span className="font-semibold text-gray-200">CryptoOwnBank</span>
              </div>
              <p className="text-xs leading-relaxed">
                Your non-custodial crypto command center. Track portfolios, earn yield on RLUSD, and manage taxes — all without giving up your keys.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 mb-3">Resources</p>
              <div className="flex flex-col gap-2 text-sm">
                <a href="/migration-guide" className="hover:text-[#00A4E4] transition-colors" data-testid="link-migration-guide">Migration Guide</a>
                <a href="/setup-guide" className="hover:text-[#00A4E4] transition-colors" data-testid="link-setup-guide">Getting Started</a>
                <a href="/yield-calculator" className="hover:text-[#00A4E4] transition-colors" data-testid="link-yield-calculator">Yield Calculator</a>
                <a href="/faq" className="hover:text-[#00A4E4] transition-colors" data-testid="link-faq-footer">FAQ</a>
                <a href="/contact" className="hover:text-[#00A4E4] transition-colors" data-testid="link-contact">Contact &amp; Feedback</a>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 mb-3">Legal</p>
              <div className="flex flex-col gap-2 text-sm">
                <a href="/legal" className="hover:text-[#00A4E4] transition-colors" data-testid="link-legal">Terms &amp; Disclaimers</a>
                <a href="/privacy" className="hover:text-[#00A4E4] transition-colors" data-testid="link-privacy">Privacy Policy</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 space-y-3">
            <p className="text-xs text-center leading-relaxed max-w-4xl mx-auto">
              CryptoOwnBank is a non-custodial portfolio tracking and yield dashboard. We never hold, control, or have access to your funds, private keys, or seed phrases. All on-chain transactions are signed locally on your device using your own wallet (Xumm or Ledger). CryptoOwnBank is not a bank, broker, exchange, or financial institution.
            </p>
            <p className="text-xs text-center leading-relaxed max-w-4xl mx-auto">
              Nothing on this site constitutes financial, investment, tax, or legal advice. Cryptocurrency investments carry significant risk, including the potential loss of principal. Past performance is not indicative of future results. Yield rates shown are estimates provided by third-party protocols (Soil Protocol) and are not guaranteed by CryptoOwnBank. Always do your own research (DYOR) and consult a qualified professional before making financial decisions.
            </p>
            <p className="text-xs text-center leading-relaxed max-w-4xl mx-auto">
              Tax report features are provided for informational purposes only and should not be considered tax advice. Consult a licensed tax professional for your specific situation. CryptoOwnBank is not responsible for the accuracy of third-party exchange data, blockchain data, or price feeds.
            </p>
            <p className="text-xs text-center mt-4">
              &copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
