import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/seo-head";
import {
  CheckCircle2,
  Clock,
  Rocket,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Shield,
  Wallet,
  Globe,
  Landmark,
  ArrowRight,
  Zap,
  Users,
  Send,
  BarChart3,
  Lock,
  Coins,
  FileText,
  Bell,
  Eye,
  Bot,
} from "lucide-react";
import { Link } from "wouter";

type Phase = "live" | "building" | "horizon";

interface RoadmapItem {
  phase: Phase;
  title: string;
  description: string;
  category: string;
  icon: any;
  link?: string;
  linkLabel?: string;
}

const PHASE_META: Record<Phase, { label: string; badge: string; badgeClass: string; description: string }> = {
  live: {
    label: "Live Now",
    badge: "Live",
    badgeClass: "bg-emerald-500 text-white",
    description: "Available today — log in or sign up to use these features",
  },
  building: {
    label: "Coming to the Ecosystem",
    badge: "In Progress",
    badgeClass: "bg-amber-500 text-white",
    description: "Industry developments and on-chain upgrades we're preparing for",
  },
  horizon: {
    label: "On the Horizon",
    badge: "Future",
    badgeClass: "bg-blue-500 text-white",
    description: "The bigger picture — get value on the blockchain, keep it there, and make the middlemen irrelevant",
  },
};

const roadmapItems: RoadmapItem[] = [
  {
    phase: "live",
    title: "RLUSD Yield Vaults (Soil Protocol)",
    description: "Deposit RLUSD into Treasury-backed (5.2% APR) or CREDIT+ (8.0% APR) vaults. Non-custodial — your keys never leave your wallet. Interest accrues daily, no platform fees, you keep 100% of your yield.",
    category: "Earn",
    icon: Coins,
    link: "/ownbank/vaults",
    linkLabel: "View Vaults",
  },
  {
    phase: "live",
    title: "Live Yield Earnings Tracker",
    description: "Watch your earnings grow in real-time on your dashboard. See what you've earned Today, This Month, and All Time — plus compound projections at 1, 5, and 10 years based on your actual deposits and APR rates.",
    category: "Earn",
    icon: TrendingUp,
    link: "/ownbank",
    linkLabel: "View Dashboard",
  },
  {
    phase: "live",
    title: "Portfolio Tracking (24 Blockchains)",
    description: "Track every asset across Bitcoin, Ethereum, Solana, XRP, Stellar, Cardano, and 18+ more chains. Automatic ERC-20/SPL/TRC-20 token detection. Import exchange data via CSV.",
    category: "Track",
    icon: BarChart3,
    link: "/wallets",
    linkLabel: "Add Wallets",
  },
  {
    phase: "live",
    title: "DEX Trading (XRPL + Stellar)",
    description: "Trade directly from your wallet on the XRPL DEX (44 pairs) and Stellar DEX (13 pairs). Quick Swap for simple trades, Advanced mode with full order book. All non-custodial.",
    category: "Trade",
    icon: ArrowRight,
    link: "/ownbank/dex",
    linkLabel: "Trade on DEX",
  },
  {
    phase: "live",
    title: "DCA Orders",
    description: "Dollar-cost average into any supported pair on XRPL (31 pairs) or Stellar (18 pairs). Set your schedule, amount, and pair — the platform queues orders and you sign each batch.",
    category: "Trade",
    icon: Clock,
    link: "/ownbank/dca",
    linkLabel: "Set Up DCA",
  },
  {
    phase: "live",
    title: "Cross-Border Payments & Invoicing",
    description: "Send XRP, RLUSD, or XLM wallet-to-wallet in 4 seconds. B2B invoicing with QR codes, payment corridors, recurring payments, and offline queuing on Stellar.",
    category: "Pay",
    icon: Send,
    link: "/ownbank/send",
    linkLabel: "Send Payment",
  },
  {
    phase: "live",
    title: "RWA Yield Discovery",
    description: "Compare yields from Soil, Ondo, Centrifuge, Maple, and more. Live APY data, risk ratings, and backing details — all in one explorer.",
    category: "Earn",
    icon: Landmark,
    link: "/rwa-yields",
    linkLabel: "Explore Yields",
  },
  {
    phase: "live",
    title: "Whale Alerts & Technical Analysis",
    description: "Real-time monitoring of large XRP/RLUSD transfers. Full charting with SMA, EMA, RSI, MACD, Bollinger Bands, candlestick pattern detection, and up to 10 years of data.",
    category: "Analyze",
    icon: Eye,
    link: "/whale-alerts",
    linkLabel: "View Whale Alerts",
  },
  {
    phase: "live",
    title: "Personalized Crypto News",
    description: "Headlines from CoinDesk, CoinTelegraph, Decrypt, and The Block — refreshed every 15 minutes. Personalized 'For You' section matches articles to the assets you actually hold.",
    category: "Stay Informed",
    icon: FileText,
    link: "/crypto-news",
    linkLabel: "Read News",
  },
  {
    phase: "live",
    title: "Recommendations Hub",
    description: "Analyzes every asset you hold and surfaces the best staking, DeFi, and yield opportunities you'd otherwise miss. Hardware-wallet-specific guides included.",
    category: "Earn",
    icon: Lightbulb,
  },
  {
    phase: "live",
    title: "Legacy Plan",
    description: "Dead-man's-switch inheritance system. Your crypto passes to your family — not to an exchange, not to a bankruptcy court. Non-custodial from start to finish.",
    category: "Protect",
    icon: Shield,
    link: "/legacy-plan",
    linkLabel: "Learn More",
  },
  {
    phase: "live",
    title: "Tax Reports & Statement Insights",
    description: "IRS-ready tax reports (FIFO/LIFO) exportable as CSV, PDF, or TurboTax files. Statement Insights compares your bank rates against on-chain yields.",
    category: "Manage",
    icon: FileText,
    link: "/tax-reports",
    linkLabel: "View Tax Tools",
  },
  {
    phase: "live",
    title: "Price Alerts",
    description: "Set custom price targets for any tracked asset. Get notified by email when prices cross your thresholds. System checks every 60 seconds.",
    category: "Analyze",
    icon: Bell,
    link: "/price-alerts",
    linkLabel: "Set Alerts",
  },

  {
    phase: "building",
    title: "XLS-65 & XLS-66: Native On-Ledger Lending",
    description: "Two XRPL amendments in the validator voting phase. When activated, they enable non-custodial lending vaults directly on the XRP Ledger — deposit XRP or RLUSD and earn yield without any intermediary. CryptoOwnBank tracks validator progress in real-time and will support these vaults from day one.",
    category: "Earn",
    icon: Landmark,
    link: "/xls66-lending",
    linkLabel: "Track Progress",
  },
  {
    phase: "building",
    title: "Direct Fiat-to-Wallet On-Ramps",
    description: "The ability to buy crypto with a debit card or bank transfer and have it land directly in your self-custody wallet — no exchange account needed. On-ramp providers are building these bridges now. We're preparing to integrate this so members can go from dollars to earning yield in minutes.",
    category: "Buy",
    icon: Wallet,
  },
  {
    phase: "building",
    title: "XRPL AMM Expansion",
    description: "The XRPL Automated Market Maker is live and liquidity pools are growing. As RLUSD and other stablecoin pairs deepen, swapping between fiat-backed stablecoins and XRP becomes even more seamless — all on-chain, no exchange required.",
    category: "Trade",
    icon: ArrowRight,
  },
  {
    phase: "building",
    title: "Multi-Chain Yield Expansion",
    description: "Stablecoin yield opportunities are expanding across Ethereum (Aave, Compound, Morpho), Solana (Marinade, Kamino), and newer chains. We're preparing to surface and compare these alongside Soil vaults so you can find the best risk-adjusted yield regardless of chain.",
    category: "Earn",
    icon: Globe,
  },

  {
    phase: "horizon",
    title: "Fiat-to-Vault in One Step",
    description: "The end goal: go from dollars in your bank account to earning 5-8% yield in a non-custodial vault in a single transaction. No exchange account, no manual transfers, no middleman holding your funds. The on-chain infrastructure is heading here — and we'll be ready.",
    category: "Buy & Earn",
    icon: Zap,
  },
  {
    phase: "horizon",
    title: "Everyone You Do Business With — On-Chain",
    description: "Get your money on the blockchain. Get everyone you do business with on the blockchain. Pay your rent, your contractors, your suppliers — all on-chain, settled in seconds. Once the value lives on the blockchain and the people using it are there too, the intermediaries that slow things down and take a cut become unnecessary. This is the real shift: not just holding crypto, but living on-chain.",
    category: "Vision",
    icon: Users,
  },
  {
    phase: "horizon",
    title: "Value Stays On-Chain",
    description: "The less you need to convert back to fiat, the more powerful the on-chain economy becomes. Earn yield on-chain, pay bills on-chain, receive payments on-chain. When your money never has to leave the blockchain, you stop losing value to conversion fees, bank delays, and intermediaries. The goal isn't to replace your bank — it's to make your bank irrelevant.",
    category: "Vision",
    icon: Coins,
  },
  {
    phase: "horizon",
    title: "Cross-Chain Yield Aggregation",
    description: "Automatically route your stablecoins to the highest-yielding vault across any supported chain. One interface, one decision — the protocol handles the bridging and rebalancing. Your money works harder without you having to monitor every chain separately.",
    category: "Earn",
    icon: Globe,
  },
  {
    phase: "horizon",
    title: "On-Chain Identity & Reputation",
    description: "As decentralized identity standards mature, your on-chain history could unlock better rates, higher limits, and trusted counterparty status — all without KYC paperwork. Your wallet becomes your credit score.",
    category: "Identity",
    icon: Eye,
  },
  {
    phase: "horizon",
    title: "AI-Powered Portfolio Assistant",
    description: "An on-platform AI assistant that can suggest portfolio rebalancing, flag tax-loss harvesting opportunities, set up DCA schedules, and surface yield strategies — all within our non-custodial framework. You always approve and sign every transaction yourself. Powered by emerging standards like MCP (Model Context Protocol) and hardware wallet signing, so the AI proposes and you decide.",
    category: "Intelligence",
    icon: Bot,
  },
  {
    phase: "horizon",
    title: "Institutional-Grade Self-Custody Tools",
    description: "Multi-signature wallets, approval workflows for large transactions, role-based team access, and audit trails — all non-custodial. The security and compliance tools that institutions need, built for the self-custody model.",
    category: "Protect",
    icon: Lock,
  },
];

function PhaseIcon({ phase }: { phase: Phase }) {
  switch (phase) {
    case "live":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "building":
      return <Rocket className="h-5 w-5 text-amber-500" />;
    case "horizon":
      return <Lightbulb className="h-5 w-5 text-blue-500" />;
  }
}

export default function Roadmap() {
  const [expandedPhase, setExpandedPhase] = useState<Phase | null>(null);
  const phases: Phase[] = ["live", "building", "horizon"];

  const togglePhase = (phase: Phase) => {
    setExpandedPhase(expandedPhase === phase ? null : phase);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      <SeoHead
        title="Roadmap — CryptoOwnBank | What's Live, What's Coming"
        description="See what CryptoOwnBank offers today and where the platform is headed. RLUSD yield vaults, DEX trading, on-chain lending, fiat on-ramps, and more — all non-custodial."
        path="/roadmap"
      />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-roadmap-title">Roadmap</h1>
        <p className="text-muted-foreground mt-1">
          What's live today, what the ecosystem is building, and where we're headed
        </p>
      </div>

      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardContent className="py-5 px-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 mt-0.5">
              <Shield className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold" data-testid="text-roadmap-philosophy">Our Commitment</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Everything we build follows the same principle: <span className="text-foreground font-medium">you own your crypto, you keep your keys, you keep 100% of your earnings</span>. 
                No feature will ever require you to hand over custody. No platform fee will ever take a cut of your yield. 
                The bigger vision is simple: get your money on the blockchain, get everyone you do business with on the blockchain, and keep the value there. 
                The less you need fiat, the less you need the institutions that charge you to use it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {phases.map((phase) => {
        const meta = PHASE_META[phase];
        const items = roadmapItems.filter((item) => item.phase === phase);
        const isCollapsed = expandedPhase !== null && expandedPhase !== phase;

        return (
          <div key={phase} className="space-y-3" data-testid={`section-${phase}`}>
            <button
              onClick={() => togglePhase(phase)}
              className="flex items-center justify-between w-full group"
              data-testid={`button-toggle-${phase}`}
            >
              <div className="flex items-center gap-3">
                <PhaseIcon phase={phase} />
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl font-bold">{meta.label}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">{meta.description}</p>
                </div>
                <Badge className={`${meta.badgeClass} text-[10px] hidden sm:inline-flex`}>{meta.badge}</Badge>
              </div>
              <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                {expandedPhase === phase ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>

            {!isCollapsed && (
              <div className="grid gap-3 sm:gap-4">
                {items.map((item, idx) => (
                  <Card
                    key={idx}
                    className={`transition-all hover:shadow-sm ${
                      phase === "live"
                        ? "border-emerald-500/10"
                        : phase === "building"
                        ? "border-amber-500/10"
                        : "border-blue-500/10"
                    }`}
                    data-testid={`card-roadmap-${phase}-${idx}`}
                  >
                    <CardContent className="py-4 px-4 sm:px-5">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            phase === "live"
                              ? "bg-emerald-500/10"
                              : phase === "building"
                              ? "bg-amber-500/10"
                              : "bg-blue-500/10"
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${
                              phase === "live"
                                ? "text-emerald-500"
                                : phase === "building"
                                ? "text-amber-500"
                                : "text-blue-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-semibold">{item.title}</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                            {item.description}
                          </p>
                          {item.link && item.linkLabel && (
                            <Link href={item.link}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 text-xs text-[#00A4E4] hover:text-[#0090c9] px-0"
                                data-testid={`link-roadmap-${phase}-${idx}`}
                              >
                                {item.linkLabel}
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Card className="border-[#00A4E4]/20 bg-gradient-to-br from-[#00A4E4]/5 to-transparent">
        <CardContent className="py-6 px-4 sm:px-6 text-center">
          <h3 className="text-base sm:text-lg font-semibold mb-2" data-testid="text-roadmap-cta">
            Start Earning Today
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
            You don't have to wait for what's coming. Soil vaults are live now — deposit RLUSD, earn 5-8% fixed APR, 
            and keep every cent. No platform fees, no middleman, no exchange holding your funds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup">
              <Button className="bg-[#00A4E4] hover:bg-[#0090c9] text-white" data-testid="button-roadmap-signup">
                Create Free Account
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/yield-calculator">
              <Button variant="outline" data-testid="button-roadmap-calculator">
                Try the Yield Calculator
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}