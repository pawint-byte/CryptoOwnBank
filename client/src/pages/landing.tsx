import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const faqs = [
  {
    q: "What is CryptoOwnBank?",
    a: "CryptoOwnBank is a complete crypto portfolio tracker combined with non-custodial XRPL yield vaults. Connect your exchanges (Coinbase, Kraken, Binance) to track your full crypto portfolio — Bitcoin, Ethereum, XRP, altcoins — in one dashboard. Plus, connect your cold wallet to deposit RLUSD into Soil Protocol vaults earning 5–8% fixed APR, and withdraw only the earned interest while your principal stays locked and protected.",
  },
  {
    q: "Is this a bank? Do you hold my money?",
    a: "No. CryptoOwnBank is NOT a bank and does not hold, custody, or control your funds. All wallets are non-custodial — your private keys stay on your Xumm app or Ledger device. We prepare unsigned transactions that you review and sign on your own device. We never have access to move your funds.",
  },
  {
    q: "What cryptocurrencies can I track?",
    a: "You can track any cryptocurrency across your connected exchanges — Bitcoin, Ethereum, XRP, Solana, and thousands more. The portfolio tracker connects to Coinbase, Kraken, Binance, and other major exchanges via API. The yield vault feature specifically uses RLUSD (Ripple's regulated stablecoin) on the XRPL.",
  },
  {
    q: "What is RLUSD and how do the yield vaults work?",
    a: "RLUSD is Ripple's regulated stablecoin, pegged 1:1 to the US Dollar and backed by cash and cash equivalents. The yield comes from Soil Protocol, which lends your RLUSD to institutional borrowers — similar to how traditional banks make money, except the interest goes to you. The Treasury Vault (5.2% APR) is backed by US government securities. The Private Credit Vault (7.8% APR) is backed by diversified private credit pools.",
  },
  {
    q: "Can I withdraw my principal (the amount I deposited)?",
    a: "No — and that's by design. Your principal is locked in the vault to protect your savings. Only the earned interest can be withdrawn to your spending wallet. This prevents impulse spending and ensures your savings grow continuously. Think of it as a certificate of deposit where you can access the interest but not the principal.",
  },
  {
    q: "How do I withdraw my earned interest?",
    a: "Go to the Withdraw Interest page, select a vault, and click 'Withdraw Interest.' The app builds a transaction sending ONLY your accrued interest to your designated spending wallet. You sign the transaction on your Xumm or Ledger. Free users withdraw manually; Premium users can set up automatic weekly withdrawals.",
  },
  {
    q: "What wallets are supported?",
    a: "For XRPL yield vaults, we support Xumm (mobile app with QR code / deep link connection) and Ledger hardware wallets (Nano S/X via WebUSB). Both are cold wallet solutions that keep your private keys completely offline or on a secure device. For portfolio tracking, you connect exchange accounts via API keys.",
  },
  {
    q: "What's the difference between Free and Premium?",
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
  {
    q: "Is my data secure?",
    a: "Your exchange API keys are encrypted at rest using AES-256. Your XRPL wallet connection is read-only — we only see your public address. All transaction signing happens on your device. We use secure authentication and Stripe for payment processing. We never store private keys or seed phrases.",
  },
  {
    q: "Why should I join now?",
    a: "Regulatory clarity is advancing, RLUSD is growing as the compliant stablecoin of choice, and institutional DeFi is expanding. Banks are still offering minimal yields. CryptoOwnBank lets you start earning real, fixed yield today while keeping full control of your assets — no waiting for traditional finance to catch up.",
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
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
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
              <a href="#pricing" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#faq" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
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
        <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
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
                          <p className="text-sm font-bold text-blue-600">7.8% APR</p>
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
                { name: "Coinbase", url: "https://www.coinbase.com" },
                { name: "Kraken", url: "https://www.kraken.com" },
                { name: "Binance", url: "https://www.binance.com" },
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
                  <a href="/login">
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
                  <a href="/login">
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

        <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-faq">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Everything you need to know about CryptoOwnBank, yield vaults, portfolio tracking, and how your funds stay safe.
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                {faqs.map((faq, index) => (
                  <FAQItem key={index} q={faq.q} a={faq.a} />
                ))}
              </CardContent>
            </Card>
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
            <div className="flex items-center gap-2 text-sm">
              <a href="/legal" className="hover:text-[#00A4E4] transition-colors" data-testid="link-legal">Legal &amp; Disclaimers</a>
              <span>&middot;</span>
              <a href="/privacy" className="hover:text-[#00A4E4] transition-colors" data-testid="link-privacy">Privacy Policy</a>
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
