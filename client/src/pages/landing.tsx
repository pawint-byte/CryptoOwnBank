import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
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
} from "lucide-react";

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
    title: "Multi-Exchange Portfolio",
    description:
      "Connect Coinbase, Kraken, Binance, and more. See your entire crypto portfolio — BTC, ETH, XRP, altcoins — in one real-time dashboard.",
  },
  {
    icon: TrendingUp,
    title: "RLUSD Yield Vaults",
    description:
      "Earn 5–8% fixed APR on Ripple's regulated stablecoin through Soil Protocol's RWA-backed institutional lending.",
  },
  {
    icon: FileText,
    title: "Tax Reports (FIFO/LIFO)",
    description:
      "Auto-calculate capital gains across all your holdings. Export IRS-ready CSV reports with one click. Huge time saver.",
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
      "CryptoOwnBank isn't just about XRPL — it's your complete crypto command center. Connect your Coinbase, Kraken, or Binance accounts and see Bitcoin, Ethereum, XRP, and every altcoin you hold in one dashboard with real-time performance metrics and tax reports.",
    benefit: "One dashboard for your entire crypto portfolio, plus yield vaults for RLUSD.",
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
    quote: "Finally a tool that lets me earn real yield on my RLUSD without ever touching my stack. Cold wallet only — exactly what I wanted.",
    author: "@XRPGodfather",
    role: "Early User",
  },
  {
    quote: "Auto-withdraw + tax exports saved me hours. This is how you actually become your own bank.",
    author: "Verified Premium Member",
    role: "Premium Subscriber",
  },
];

const freeTierFeatures = [
  "Real-time crypto balances (all exchanges)",
  "Soil vault deposits & interest tracking",
  "Manual interest withdrawals",
  "Full transaction history (XRPL + exchanges)",
  "FIFO/LIFO tax calculations",
  "Referral program (earn bonus SEED points)",
  "Connect unlimited exchanges",
];

const premiumFeatures = [
  "Everything in Free, plus:",
  "Auto \"Withdraw Interest Only\" every week",
  "Tax-ready CSV exports (huge time saver)",
  "Priority alerts for new vaults & XLS-66",
  "Premium referral bonuses (free months)",
  "Priority support & future feature votes",
  "XLS-66 lending early access",
];

const onChainReasons = [
  {
    icon: Lock,
    title: "Maximum Security & True Ownership",
    points: [
      "When you connect your cold wallet (Ledger or Xumm), your private keys never leave your device.",
      "We never see them, store them, or have any ability to move your funds.",
      "Direct bank integrations require someone to handle your fiat and personal banking details \u2014 introducing KYC requirements, potential data breaches, and counterparty risk.",
    ],
    highlight: "Your assets stay in your control, not ours or anyone else\u2019s. That\u2019s what \u201Cbe your own bank\u201D really means.",
  },
  {
    icon: Ban,
    title: "No Regulatory Overload = Faster, Simpler Experience",
    points: [
      "No ID, proof of address, or banking info required to use the site.",
      "Instant onboarding in seconds \u2014 not days or weeks.",
      "No hidden compliance fees or account freezes.",
    ],
    highlight: "We keep things non-custodial and permissionless \u2014 exactly how the blockchain was designed to work.",
  },
  {
    icon: DollarSign,
    title: "Lower Costs & Better Yields for You",
    points: [
      "Every layer of fiat handling adds fees (bank wires, ACH, compliance overhead, partner cuts).",
      "By keeping everything on-chain (RLUSD \u2192 Soil vaults \u2192 interest withdrawals), we avoid those costs entirely.",
      "You keep more of your 5\u20138% fixed yield with no hidden \u201Cprocessing\u201D or \u201Cwithdrawal\u201D fees from us.",
    ],
    highlight: "The system stays lean so we can focus on features like auto-withdrawals and XLS-66 lending \u2014 not compliance paperwork.",
  },
];

const onChainSteps = [
  {
    step: 1,
    icon: Coins,
    title: "Buy RLUSD",
    description: "Use any trusted exchange (Binance, Kraken, Coinbase, etc.). Buy RLUSD and withdraw it directly to your XRPL wallet address.",
    note: "We provide affiliate links so you may earn rewards for using them \u2014 disclosed transparently.",
  },
  {
    step: 2,
    icon: Fingerprint,
    title: "Connect Your Cold Wallet",
    description: "Scan with Xumm or plug in Ledger. Takes seconds \u2014 no forms, no ID, no waiting.",
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
        a: "CryptoOwnBank was created for one reason: to help people truly become their own bank \u2014 without giving up control of their assets. Most tools today force you to choose between: custodial platforms (Uphold, Binance, Coinbase) that hold your keys and pay low yields (3\u20136%), traditional banks that pay almost nothing (0.01\u20134.5%) and control your money, or raw blockchain explorers and DeFi apps that feel complicated and overwhelming. We built CryptoOwnBank to fix all three problems at once: (1) Full ownership \u2014 your cold wallet (Ledger, ELLIPAL, Arculus, etc.) stays in control; we never see or store your private keys. (2) Real, higher yields \u2014 earn 5\u20138% fixed APR on RLUSD through Soil Protocol\u2019s real-world-asset vaults (Treasuries, private credit) with automatic compounding if you don\u2019t withdraw interest. (3) Simplicity & power \u2014 one clean dashboard to connect your wallet, track your XRPL portfolio, deposit to vaults, withdraw only the interest you want, and see everything in real time. No copy-pasting addresses, no switching apps. (4) Future-proof \u2014 built for XRPL today (RLUSD + Soil), ready for tomorrow (XLS-66 XRP lending, more protocols, multi-chain support) \u2014 all while keeping you non-custodial. The world is shifting to on-chain finance. Banks fight to keep yields low and control high. Exchanges hold your keys and limit what you can do. CryptoOwnBank flips the script: you earn more, own everything, and stay in full control. Bottom line: if you want higher yields than Uphold/Binance, true self-custody instead of trusting a third party, and a dashboard that grows with the XRPL ecosystem \u2014 CryptoOwnBank was built exactly for you. Connect your cold wallet (free, no KYC) and start today.",
      },
      {
        q: "What is CryptoOwnBank?",
        a: "CryptoOwnBank is a non-custodial dashboard that lets you track your XRP & RLUSD portfolio and earn fixed yield on RLUSD through Soil Protocol vaults \u2014 all while keeping full control via your cold wallet (Ledger or Xumm). We help you \u201Cbe your own bank\u201D: deposit RLUSD, earn 5\u20138% fixed APR, withdraw only the interest, and leave your principal locked and protected forever \u2014 without ever selling your base holdings.",
      },
      {
        q: "How does CryptoOwnBank compare to traditional banks and crypto exchanges?",
        a: "Banks offer 0.01\u20134.5% yield but you\u2019re an unsecured creditor \u2014 they own the money. Centralized exchanges (Uphold ~3.75%, others up to 6%) hold your keys custodially. CryptoOwnBank + Soil gives you 5\u20138% fixed APR with automatic compounding, and you own 100% \u2014 keys stay on your cold wallet, every action requires your signature. Other advantages: no KYC on our end, no bank linking, low XRPL fees (~0.0001 XRP vs $15\u201330 wire fees), interest-only withdrawals so principal keeps earning, and future XLS-66 XRP lending from the same dashboard. Banks and exchanges are convenient but take custody and pay less. CryptoOwnBank flips the script: full control, higher yields, complete transparency.",
      },
      {
        q: "How does CryptoOwnBank make money?",
        a: "Free tier forever (basic tracking + manual withdrawals). Premium subscription ($9/mo or $79/yr) for auto-withdrawals, tax exports, family views, etc. Affiliate referrals (e.g., when you buy RLUSD via our exchange links or join Soil via our referral \u2014 we may earn rewards; disclosed transparently). We never take fees from your yields or principal.",
      },
      {
        q: "Can CryptoOwnBank connect to other blockchains and protocols in the future?",
        a: "Yes \u2014 and that\u2019s exactly the vision. CryptoOwnBank is built to be your personal on-chain control center \u2014 not just for XRPL today, but for any blockchain or smart contract that offers yield, lending, staking, or tokenized assets. We plug into new protocols the same non-custodial way: reading public blockchain data, building ready-to-sign transactions, and letting your cold wallet approve. You stay the owner; we become your smart assistant \u2014 one beautiful dashboard instead of scattered apps, one-click actions instead of copy-pasting addresses, and automation without giving up sovereignty. When XLS-66 XRP lending activates or new RWA protocols launch, we add them \u2014 you get instant access without switching tools. Coming soon: native XRP lending, more XRPL protocols, and multi-chain support \u2014 all while keeping you in 100% control.",
      },
      {
        q: "Why should I join now?",
        a: "Regulatory clarity is advancing, RLUSD is growing as the compliant stablecoin of choice, and institutional DeFi is expanding. Banks are still offering minimal yields. CryptoOwnBank lets you start earning real, fixed yield today while keeping full control of your assets \u2014 no waiting for traditional finance to catch up.",
      },
    ],
  },
  {
    heading: "Wallet & Security Basics",
    items: [
      {
        q: "Why do I need a cold wallet to use CryptoOwnBank?",
        a: "To keep you in full control. We are 100% non-custodial \u2014 your private keys never leave your Ledger, ELLIPAL, Arculus, SafePal, etc. The site only reads public data and builds transactions for you to sign. Without a cold wallet, there\u2019s no way to approve deposits or withdrawals.",
      },
      {
        q: "Is this a wallet? Do you hold my funds?",
        a: "No \u2014 we are 100% non-custodial. We never hold, control, or have access to your funds or private keys. All actions (deposits, withdrawals) are signed directly from your own cold wallet. The dashboard is just a secure interface to view balances and interact with XRPL + Soil. Your keys stay on your Ledger or Xumm device at all times.",
      },
      {
        q: "What wallets are supported?",
        a: "For XRPL yield vaults, we support Xumm/Xaman (mobile app with QR code / deep link connection) and Ledger hardware wallets (Nano S/X via Bluetooth through Xaman). Both are cold wallet solutions that keep your private keys completely offline or on a secure device. For portfolio tracking, you connect exchange accounts via API keys. See our step-by-step Setup Guide at /setup-guide for detailed instructions.",
      },
      {
        q: "Do Ledger Nano X and Xaman show the same address for RLUSD?",
        a: "Yes \u2014 when you pair Ledger Nano X with Xaman, Xaman displays the exact XRPL address controlled by your Ledger device. There is only one address. Xaman is the bridge that sends signing requests to Ledger \u2014 the keys stay on Ledger.",
      },
      {
        q: "Does every transaction require Ledger signing even if I use Xaman?",
        a: "Yes. Xaman builds the transaction and forwards it to your paired Ledger for offline approval. You physically confirm on the Ledger device every time. This is the security model \u2014 no keys ever leave hardware.",
      },
      {
        q: "How do I connect my Ledger Nano X with Xaman?",
        a: "1) Install Xaman (App Store/Google Play) and Ledger Live. 2) Open Xaman \u2192 Settings \u2192 Hardware Wallets \u2192 Ledger \u2192 enable Bluetooth \u2192 unlock Ledger \u2192 open XRP app \u2192 pairs automatically. 3) Add RLUSD trust line: tap \u201C+\u201D Add Token \u2192 RLUSD \u2192 Setup Trust Line \u2192 sign on Ledger. 4) On CryptoOwnBank, click \u201CConnect Wallet\u201D \u2192 Xumm/Xaman \u2192 approve in Xaman (Ledger confirms if needed). Done \u2014 deposit RLUSD to Soil vaults and sign with your Ledger/Xaman combo. Full guide: /setup-guide",
      },
      {
        q: "Do I need a destination tag/memo when transferring RLUSD?",
        a: "No \u2014 RLUSD on XRPL does not require tags or memos (unlike XLM on Stellar). Just send to your correct XRPL address (starts with \u201Cr\u2026\u201D). Always double-check the address before sending.",
      },
      {
        q: "Is my data secure?",
        a: "Your exchange API keys are encrypted at rest using AES-256. Your XRPL wallet connection is read-only \u2014 we only see your public address. All transaction signing happens on your device. We use secure authentication and Stripe for payment processing. We never store private keys or seed phrases.",
      },
    ],
  },
  {
    heading: "Yield & Soil Mechanics",
    items: [
      {
        q: "What is RLUSD and how do the yield vaults work?",
        a: "RLUSD is Ripple\u2019s regulated stablecoin, pegged 1:1 to the US Dollar and backed by cash and cash equivalents. The yield comes from Soil Protocol, which lends your RLUSD to institutional borrowers \u2014 similar to how traditional banks make money, except the interest goes to you. The Treasury Vault (5.2% APR) is backed by US government securities. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools.",
      },
      {
        q: "Which vault should I choose \u2014 Treasury (5.2%) or CREDIT+ (8.0%)?",
        a: "It depends on your risk tolerance and how soon you might need your funds. The Treasury Vault (5.2% APR) is backed by US government securities \u2014 essentially the safest asset class in the world. It has a short 3-day rolling withdrawal period, so you can access your funds quickly. Best for: stability and liquidity. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools (institutional lending). It pays more but requires a 90-day notice + 10-day cooldown to withdraw, and carries higher default risk than Treasuries. Best for: users willing to lock funds longer for bigger returns. You can also split your RLUSD across both vaults \u2014 for example, put some in Treasury for quick access and some in Private Credit for higher yield. The vault cards on the Vaults page show risk level, withdrawal terms, and a \u201CBest for\u201D recommendation to help you decide at a glance.",
      },
      {
        q: "Does interest in Soil vaults compound automatically?",
        a: "Yes. If you do not withdraw the earned interest, it is automatically added to your position in the vault and starts earning additional yield right away. Example: Deposit $10,000 RLUSD at 6% APR. After one month \u2248 $50 interest is earned. If left in the vault, your new balance becomes ~$10,050. Next month\u2019s interest is calculated on the larger amount \u2014 this is automatic compounding. There is no \u201Creinvest\u201D button because it happens by default. You can withdraw only the interest anytime (manually or auto-scheduled with Premium). The principal plus any unwithdrawn interest stays in the vault and continues growing. This gives you higher effective returns than most banks or custodial platforms while keeping full control of your keys.",
      },
      {
        q: "How does Soil compare to Uphold\u2019s 3.75% yield?",
        a: "Soil offers 5\u20138% fixed APR (real RWA-backed yield from Treasuries and private credit) with automatic compounding \u2014 usually higher than Uphold\u2019s ~3.75%. Plus you get full self-custody (your keys stay on your cold wallet) instead of Uphold holding everything custodially. The trade-off: Uphold is simpler to start with, but you give up ownership and earn less.",
      },
      {
        q: "How do I withdraw my earned interest?",
        a: "Go to the Withdraw Interest page, select a vault, and click \u201CWithdraw Interest.\u201D The app builds a transaction sending ONLY your accrued interest to your designated spending wallet. You sign the transaction on your Xumm or Ledger. Free users withdraw manually; Premium users can set up automatic weekly withdrawals.",
      },
      {
        q: "Why can\u2019t I withdraw my full principal anytime?",
        a: "Soil vaults are lending pools backed by real-world assets (U.S. Treasuries, private credit, etc.). Withdrawal rules depend on the vault: Liquid/Treasury vaults have a 3-day rolling period. Credit vaults require a 90-day notice + 10-day cooldown (interest continues during notice). Your funds earn during notice periods, but the lock-up aligns with underlying assets for stability. This is standard for fixed-yield RWA protocols \u2014 check each vault\u2019s details on the site.",
      },
      {
        q: "How safe is my principal?",
        a: "Your principal is protected in two ways: 1) Non-custodial design \u2014 keys never leave your cold wallet. 2) Soil vaults are backed by real-world assets (Treasuries, credit funds) with institutional-grade underwriting. Yields are fixed and predictable, but crypto/blockchain always carries risks (smart contract bugs, protocol changes, market events). We display real-time data but never guarantee returns. Always DYOR.",
      },
      {
        q: "What happens if Soil or XRPL has issues?",
        a: "Soil is a compliant RWA protocol on XRPL \u2014 funds are loaned to Soil Ltd. (backed by real assets), not algorithmic or high-risk DeFi. If issues arise (rare), withdrawals follow vault rules (notice periods). XRPL itself is battle-tested and decentralized. Your assets stay on-chain in your wallet \u2014 we can\u2019t access or lose them.",
      },
    ],
  },
  {
    heading: "Getting Started & Transfers",
    items: [
      {
        q: "How do I start earning yield on RLUSD?",
        a: "1) Buy RLUSD on a trusted exchange (Binance, Kraken, Coinbase, etc.) and withdraw it to your XRPL wallet. 2) Connect your cold wallet to the dashboard. 3) Deposit RLUSD into a Soil vault (Treasury-backed at 5.2% or CREDIT+ at 8.0%). 4) Earn fixed yield immediately \u2014 your principal stays locked. 5) Withdraw only the accrued interest whenever you want (manual or auto for Premium users). No KYC on our end, no bank linking required.",
      },
      {
        q: "Can I transfer RLUSD from Uphold to my cold wallet?",
        a: "Yes \u2014 Uphold supports XRPL withdrawals. Go to Withdraw \u2192 RLUSD \u2192 XRPL network \u2192 paste your wallet address. Test with a small amount first. Make sure your trust line to RLUSD is set in Xaman/Ledger before sending. Funds typically arrive in seconds with fees around ~0.0001 XRP.",
      },
      {
        q: "Which exchange should I recommend for buying RLUSD?",
        a: "Binance usually offers the best liquidity and lowest fees for RLUSD. Kraken is great for low-cost XRPL withdrawals. Crypto.com and Uphold are beginner-friendly. Use the referral links on the My Referrals page to help others \u2014 you may earn rewards when they sign up and buy.",
      },
      {
        q: "Should I route through an exchange to earn referral rewards on my own transfer?",
        a: "Not worth it for your own funds. Referral commissions only trigger for new users signing up via your link \u2014 self-referral usually doesn\u2019t pay and adds extra fees/steps. Transfer directly from Uphold (or wherever your RLUSD is) to your cold wallet, then use your referral links to help others buy RLUSD.",
      },
      {
        q: "Why don\u2019t you connect directly to my bank account?",
        a: "We deliberately stay on-chain only to keep things simple, secure, and non-custodial. Bank integrations would require us to handle fiat, trigger money transmitter rules (federal MSB registration + state licenses), and force KYC/AML on users \u2014 adding delays, fees, and risks. By skipping banks, we avoid all that: no middleman, no data collection, no compliance overhead. You buy RLUSD on exchanges, deposit on-chain, and manage everything from your wallet \u2014 faster, cheaper, and truly in your control.",
      },
      {
        q: "Can I use this for other cryptos besides XRP/RLUSD?",
        a: "Currently focused on XRPL-native assets (XRP, RLUSD, Soil positions). You can also connect exchange accounts (Coinbase, Kraken, Binance) to track your full crypto portfolio \u2014 Bitcoin, Ethereum, altcoins, and more. Future updates will add multi-chain support so you can manage more from one dashboard \u2014 still signing from your cold wallet.",
      },
    ],
  },
  {
    heading: "Premium, Referrals & Features",
    items: [
      {
        q: "What\u2019s the difference between Free and Premium?",
        a: "Free gives you full access to portfolio tracking, wallet connection, vault deposits, manual interest withdrawal, and tax reports. Premium ($9/month or $79/year) adds automatic weekly interest withdrawals, priority vault alerts, advanced tax CSV exports, XLS-66 lending early access, and premium referral bonuses.",
      },
      {
        q: "How does the referral program work?",
        a: "Share your unique referral link with friends. When they sign up and deposit RLUSD, you earn bonus SEED points through Soil Protocol, which can boost your yields over time. If a referred friend upgrades to Premium, you get one free month of Premium.",
      },
      {
        q: "What is XLS-66 Lending?",
        a: "XLS-66 is a proposed XRPL amendment for native on-ledger lending. When it goes live (expected Q2 2026), OwnBank will integrate it so you can lend directly on the XRPL without any intermediary. Premium members get early access.",
      },
    ],
  },
  {
    heading: "Safety & Disclaimers",
    items: [
      {
        q: "Is this financial advice?",
        a: "No \u2014 this is not financial, investment, or tax advice. Crypto and yield protocols involve risk of loss. Past performance isn\u2019t indicative of future results. Always do your own research (DYOR) and consider your own situation. We provide tools and information only.",
      },
      {
        q: "What if I have more questions or issues?",
        a: "Use the in-site contact form or join XRPL community channels. Note: we can\u2019t help with wallet recovery or fund issues since we\u2019re non-custodial \u2014 only you control your keys.",
      },
    ],
  },
];

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
  return (
    <div className="min-h-screen bg-background">
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
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-features">Features That Actually Matter</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Track your entire crypto portfolio, earn yield on RLUSD, generate tax reports, and manage it all from one place.
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
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
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
                        { label: "Yield", value: "5\u20138%" },
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
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-testimonials">What Members Are Saying</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {testimonials.map((t, i) => (
                <Card key={i} data-testid={`card-testimonial-${i}`}>
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-foreground leading-relaxed mb-4 italic">"{t.quote}"</p>
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <div className="h-8 w-8 rounded-full bg-[#00A4E4]/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-[#00A4E4]" />
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
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-pricing">Start Free — No Credit Card Needed</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Go Premium to unlock the full "own bank" experience with auto-withdrawals and advanced features.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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
                      Get Started Free
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
                    <span className="text-3xl font-bold">$9</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-[#00A4E4] font-medium mb-6">or $79/year (save 27%)</p>
                  <ul className="space-y-3 mb-6">
                    {premiumFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/signup">
                    <Button className="w-full bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-plan-premium">
                      Upgrade Now
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
                  Upgrade to Premium — $9/mo
                </Button>
              </a>
            </div>
            <p className="text-white/50 text-xs mt-6">
              Not financial advice. Not a bank. You control your keys and funds at all times.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#00A4E4]" />
              <span className="font-semibold text-gray-200">CryptoOwnBank</span>
            </div>
            <p className="text-sm text-center">
              &copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm flex-wrap justify-center">
              <a href="/setup-guide" className="hover:text-[#00A4E4] transition-colors" data-testid="link-setup-guide">Setup Guide</a>
              <span>&middot;</span>
              <a href="/yield-calculator" className="hover:text-[#00A4E4] transition-colors" data-testid="link-yield-calculator">Yield Calculator</a>
              <span>&middot;</span>
              <a href="/legal" className="hover:text-[#00A4E4] transition-colors" data-testid="link-legal">Legal &amp; Disclaimers</a>
              <span>&middot;</span>
              <a href="/privacy" className="hover:text-[#00A4E4] transition-colors" data-testid="link-privacy">Privacy Policy</a>
              <span>&middot;</span>
              <a href="/contact" className="hover:text-[#00A4E4] transition-colors" data-testid="link-contact">Contact & Feedback</a>
            </div>
            <p className="text-xs text-center max-w-2xl leading-relaxed">
              Non-custodial dashboard &middot; We never hold your funds or keys &middot; Not financial advice &middot; DYOR
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
