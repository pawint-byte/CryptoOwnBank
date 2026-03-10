import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Landmark,
  Shield,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Building2,
  Info,
  ArrowRight,
  Lock,
  Droplets,
  Scale,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Wallet,
  Compass,
  Clock,
  UserCheck,
  Coins,
  Plus,
  LogIn,
  CreditCard,
} from "lucide-react";

interface YieldOpportunity {
  id: string;
  protocol: string;
  chain: string;
  asset: string;
  apyRange: string;
  apyMid: number;
  backingType: string;
  tvl: string;
  riskLevel: "Low" | "Medium" | "High";
  link: string;
  description: string;
  integrated: boolean;
  minInvestment: string;
  lockup: string;
  kycRequired: boolean;
  tokenReceived: string;
  trackingChain: string;
  steps: string[];
  category: "yield" | "cashback";
}

const YIELD_OPPORTUNITIES: YieldOpportunity[] = [
  {
    id: "soil",
    category: "yield",
    protocol: "Soil Protocol",
    chain: "XRPL",
    asset: "RLUSD",
    apyRange: "5\u20138%",
    apyMid: 6.5,
    backingType: "Private Credit & Treasuries",
    tvl: "$12M+",
    riskLevel: "Low",
    link: "https://soil.xyz",
    description: "Earn yield on RLUSD through institutional-grade credit vaults on the XRP Ledger. Backed by real-world loan portfolios and short-term treasuries.",
    integrated: true,
    minInvestment: "$50",
    lockup: "Liquid vault: instant \u2022 Credit+ vault: 7-day notice",
    kycRequired: false,
    tokenReceived: "RLUSD vault receipt on XRPL",
    trackingChain: "xrpl",
    steps: [
      "Connect your XRPL wallet via Xaman (formerly Xumm)",
      "Make sure you have RLUSD in your wallet \u2014 you can get it on the XRPL DEX or from a supported exchange",
      "Click \u201cDeposit Now\u201d below to go to our integrated Vaults page",
      "Choose Credit+ vault (8% APY) or Liquid vault (5% APY) based on your needs",
      "Sign the deposit transaction in Xaman \u2014 done! Your position is tracked automatically right here in CryptoOwnBank",
    ],
  },
  {
    id: "ondo-usdy",
    category: "yield",
    protocol: "Ondo Finance",
    chain: "Ethereum",
    asset: "USDY",
    apyRange: "~5.2%",
    apyMid: 5.2,
    backingType: "US Treasuries",
    tvl: "$500M+",
    riskLevel: "Low",
    link: "https://app.ondo.finance",
    description: "USDY is a tokenized note backed by short-term US Treasuries and bank deposits. Offers transparent, regulated yield with daily liquidity.",
    integrated: false,
    minInvestment: "$500",
    lockup: "T+1 (next business day redemption)",
    kycRequired: true,
    tokenReceived: "USDY token on Ethereum",
    trackingChain: "ethereum",
    steps: [
      "Visit app.ondo.finance and create an account",
      "Complete identity verification (KYC) on Ondo\u2019s platform \u2014 typically takes 1\u20132 business days (this is Ondo\u2019s requirement, not ours)",
      "Connect your Ethereum wallet (MetaMask, WalletConnect, or similar)",
      "Deposit USDC to mint USDY tokens \u2014 they\u2019ll appear in your Ethereum wallet",
      "Come back to CryptoOwnBank \u2192 add your Ethereum wallet address on the Blockchain Addresses page \u2192 we\u2019ll automatically detect your USDY balance and track your yield",
    ],
  },
  {
    id: "ondo-ousg",
    category: "yield",
    protocol: "Ondo Finance",
    chain: "Ethereum",
    asset: "OUSG",
    apyRange: "~4.8%",
    apyMid: 4.8,
    backingType: "Short-Term Govt Bonds",
    tvl: "$200M+",
    riskLevel: "Low",
    link: "https://app.ondo.finance",
    description: "OUSG provides tokenized exposure to short-term US government bond funds managed by BlackRock. Institutional-grade with KYC required.",
    integrated: false,
    minInvestment: "$100,000",
    lockup: "T+1 (next business day)",
    kycRequired: true,
    tokenReceived: "OUSG token on Ethereum",
    trackingChain: "ethereum",
    steps: [
      "Visit app.ondo.finance \u2014 OUSG requires accredited investor status",
      "Complete enhanced KYC/AML verification and accreditation check on Ondo\u2019s platform (this is Ondo\u2019s requirement, not ours)",
      "Connect your Ethereum wallet (MetaMask, WalletConnect, etc.)",
      "Deposit minimum $100,000 USDC to mint OUSG tokens",
      "Add your Ethereum wallet to CryptoOwnBank to track your OUSG position automatically",
    ],
  },
  {
    id: "centrifuge",
    category: "yield",
    protocol: "Centrifuge",
    chain: "Ethereum / Base",
    asset: "Various",
    apyRange: "4\u201310%",
    apyMid: 7.0,
    backingType: "Invoices / Real Estate / Trade Finance",
    tvl: "$250M+",
    riskLevel: "Medium",
    link: "https://centrifuge.io",
    description: "Centrifuge tokenizes real-world assets like invoices, real estate mortgages, and trade finance receivables into on-chain pools. Variable yields depending on pool risk.",
    integrated: false,
    minInvestment: "Varies by pool (typically $5,000+)",
    lockup: "Varies by pool \u2014 some have redemption periods",
    kycRequired: true,
    tokenReceived: "Pool tokens (DROP/TIN) on Ethereum",
    trackingChain: "ethereum",
    steps: [
      "Visit app.centrifuge.io and browse available investment pools",
      "Choose a pool based on your risk preference \u2014 real estate, trade finance, or invoice pools \u2014 and review the pool terms",
      "Complete KYC verification for your chosen pool (each pool issuer may have their own requirements)",
      "Connect your Ethereum wallet and invest in the pool",
      "Add your Ethereum wallet to CryptoOwnBank \u2192 we\u2019ll detect your pool tokens (DROP/TIN) and track your position",
    ],
  },
  {
    id: "xdc-tradefi",
    category: "yield",
    protocol: "XDC / TradeFi",
    chain: "XDC Network",
    asset: "XDC-based",
    apyRange: "5\u20139%",
    apyMid: 7.0,
    backingType: "Trade Receivables",
    tvl: "$100M+",
    riskLevel: "Medium",
    link: "https://xinfin.org",
    description: "XDC Network focuses on tokenized trade finance. Platforms like Tradeteq and Yodaplus offer exposure to global trade receivables with attractive yields.",
    integrated: false,
    minInvestment: "$1,000",
    lockup: "Varies \u2014 typically 30\u201390 day terms matching trade finance cycles",
    kycRequired: true,
    tokenReceived: "Trade receivable tokens on XDC Network",
    trackingChain: "xdc",
    steps: [
      "Set up an XDC-compatible wallet (XDCPay browser extension or import into MetaMask with XDC network)",
      "Acquire XDC tokens from a supported exchange (e.g., KuCoin, Gate.io, Bitfinex)",
      "Visit a trade finance platform like Tradeteq (tradeteq.com) or Yodaplus (yodaplus.com)",
      "Complete platform onboarding and invest in trade receivable tokens",
      "Add your XDC wallet address to CryptoOwnBank to track your position automatically",
    ],
  },
  {
    id: "maple",
    category: "yield",
    protocol: "Maple Finance",
    chain: "Ethereum / Solana",
    asset: "USDC / wETH",
    apyRange: "6\u201312%",
    apyMid: 9.0,
    backingType: "Institutional Lending",
    tvl: "$100M+",
    riskLevel: "Medium",
    link: "https://maple.finance",
    description: "Maple provides under-collateralized lending pools for institutional borrowers. Higher yields but with credit exposure to vetted corporate borrowers.",
    integrated: false,
    minInvestment: "$1,000",
    lockup: "Varies by pool \u2014 some pools have lock-up periods",
    kycRequired: false,
    tokenReceived: "Maple LP tokens on Ethereum or Solana",
    trackingChain: "ethereum",
    steps: [
      "Visit app.maple.finance and connect your Ethereum or Solana wallet",
      "Browse available lending pools \u2014 review borrower quality, historical performance, and pool terms",
      "Choose a pool and deposit USDC or wETH (check minimum for each pool)",
      "You\u2019ll receive Maple LP tokens representing your position",
      "Add your wallet to CryptoOwnBank \u2192 we\u2019ll detect your Maple LP tokens and track your yield",
    ],
  },
  {
    id: "uphold-payroll",
    category: "cashback",
    protocol: "Uphold Payroll",
    chain: "XRPL (XRP rewards)",
    asset: "XRP",
    apyRange: "4% back",
    apyMid: 4.0,
    backingType: "Payroll Direct Deposit Rewards",
    tvl: "N/A",
    riskLevel: "Low",
    link: "https://uphold.com",
    description: "Earn 4% back in XRP on qualifying salary-linked ACH direct deposits of $250+. Get paid up to 2 days early. Max reward $500/month. Available in US (excluding NY, USVI, American Samoa).",
    integrated: false,
    minInvestment: "$250 qualifying deposit",
    lockup: "None \u2014 XRP rewards paid automatically",
    kycRequired: true,
    tokenReceived: "XRP in your Uphold account",
    trackingChain: "xrpl",
    steps: [
      "Sign up at uphold.com and complete identity verification",
      "Set up direct deposit by linking your employer\u2019s payroll to your Uphold account",
      "Start receiving your salary via ACH direct deposit ($250+ qualifying deposit)",
      "Earn 4% back in XRP automatically on each qualifying deposit (up to $500/month in rewards)",
      "Add your XRPL wallet address to CryptoOwnBank to track your XRP rewards alongside your portfolio",
    ],
  },
  {
    id: "uphold-card",
    category: "cashback",
    protocol: "Uphold Debit Card",
    chain: "XRPL (XRP rewards)",
    asset: "XRP",
    apyRange: "Up to 4% back",
    apyMid: 3.5,
    backingType: "Spending Cashback Rewards",
    tvl: "N/A",
    riskLevel: "Low",
    link: "https://uphold.com",
    description: "Earn up to 4% back in XRP on everyday purchases with the Uphold Debit Card. Get 4% when funding with crypto or metals, or 3% when using fiat or stablecoins (Elite tier).",
    integrated: false,
    minInvestment: "No minimum",
    lockup: "None \u2014 XRP rewards on every purchase",
    kycRequired: true,
    tokenReceived: "XRP in your Uphold account",
    trackingChain: "xrpl",
    steps: [
      "Sign up at uphold.com and complete identity verification if you haven\u2019t already",
      "Apply for the Uphold Debit Card through your Uphold account",
      "Choose your funding source \u2014 crypto/metals for 4% back, or fiat/stablecoins for 3% back (Elite tier)",
      "Use the card for everyday purchases and earn XRP rewards automatically",
      "Add your XRPL wallet to CryptoOwnBank to track your XRP cashback rewards",
    ],
  },
];

interface ComparisonRow {
  type: string;
  product: string;
  apy: string;
  apyNum: number;
  notes: string;
}

const COMPARISON_DATA: ComparisonRow[] = [
  { type: "Traditional", product: "Bank Savings Account", apy: "~0.5%", apyNum: 0.5, notes: "FDIC insured, instant access, negligible yield" },
  { type: "Traditional", product: "High-Yield Savings", apy: "~4.5%", apyNum: 4.5, notes: "Online banks, FDIC insured, variable rate" },
  { type: "Traditional", product: "Money Market Fund", apy: "~5.0%", apyNum: 5.0, notes: "Not FDIC insured, daily liquidity, government bonds" },
  { type: "Tokenized", product: "USDY (Ondo)", apy: "~5.2%", apyNum: 5.2, notes: "Tokenized treasuries, 24/7 settlement, blockchain-native" },
  { type: "Tokenized", product: "Soil RLUSD Vaults", apy: "5\u20138%", apyNum: 6.5, notes: "XRPL-native, credit-backed, non-custodial" },
  { type: "Tokenized", product: "Centrifuge Pools", apy: "4\u201310%", apyNum: 7.0, notes: "Real estate, invoices, trade finance pools" },
];

interface RiskInfo {
  type: string;
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  mitigation: string;
}

const RISK_EDUCATION: RiskInfo[] = [
  {
    type: "credit",
    icon: Building2,
    title: "Credit Risk",
    description: "RWA yields depend on real-world borrowers repaying their loans. If borrowers default, the principal in the pool could be partially or fully lost.",
    mitigation: "Look for protocols with over-collateralization, insurance reserves, and transparent borrower vetting processes. Diversify across multiple pools.",
  },
  {
    type: "smart_contract",
    icon: Lock,
    title: "Smart Contract Risk",
    description: "RWA tokens rely on smart contracts to manage deposits, interest accrual, and redemptions. Bugs or exploits in these contracts could lead to loss of funds.",
    mitigation: "Choose protocols with multiple audits from reputable firms. Check if they have bug bounty programs and insurance coverage.",
  },
  {
    type: "liquidity",
    icon: Droplets,
    title: "Liquidity Risk",
    description: "Some RWA pools have lock-up periods or limited secondary markets. You may not be able to withdraw your funds immediately when needed.",
    mitigation: "Check withdrawal terms before depositing. Some protocols offer instant redemption for smaller amounts. Plan your liquidity needs accordingly.",
  },
  {
    type: "regulatory",
    icon: Scale,
    title: "Regulatory Risk",
    description: "Tokenized RWAs operate in a rapidly evolving regulatory landscape. New rules could affect token availability, yields, or legal status in your jurisdiction.",
    mitigation: "Use protocols that are proactively seeking regulatory compliance. Check if tokens are available in your jurisdiction before investing.",
  },
];


function getRiskBadgeVariant(level: string) {
  if (level === "Low") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (level === "Medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

function ProtocolCard({ opp }: { opp: YieldOpportunity }) {
  const [showSteps, setShowSteps] = useState(false);
  const slug = opp.protocol.toLowerCase().replace(/[\s\/]/g, "-");

  return (
    <Card data-testid={`card-yield-${slug}-${opp.asset.toLowerCase().replace(/[\s\/]/g, "-")}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap" data-testid={`text-protocol-${slug}`}>
            {opp.protocol}
            {opp.integrated && (
              <Badge variant="default" className="text-xs bg-[#00A4E4]" data-testid={`badge-integrated-${slug}`}>
                Integrated
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{opp.chain}</p>
        </div>
        <Badge className={`shrink-0 ${getRiskBadgeVariant(opp.riskLevel)}`} data-testid={`badge-risk-${slug}`}>
          {opp.riskLevel} Risk
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{opp.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{opp.category === "cashback" ? "Reward" : "Asset"}</p>
            <p className="text-sm font-medium" data-testid={`text-asset-${slug}`}>{opp.asset}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{opp.category === "cashback" ? "Rate" : "APY"}</p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400" data-testid={`text-apy-${slug}`}>{opp.apyRange}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{opp.category === "cashback" ? "Type" : "Backing"}</p>
            <div className="flex items-center gap-1.5">
              {opp.category === "cashback" ? (
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <p className="text-sm font-medium" data-testid={`text-backing-${slug}`}>{opp.backingType}</p>
            </div>
          </div>
          {opp.tvl !== "N/A" && (
            <div>
              <p className="text-xs text-muted-foreground">TVL</p>
              <p className="text-sm font-medium" data-testid={`text-tvl-${slug}`}>{opp.tvl}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" /> Min. Investment
            </p>
            <p className="text-sm font-medium" data-testid={`text-min-${slug}`}>{opp.minInvestment}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Lockup
            </p>
            <p className="text-sm font-medium" data-testid={`text-lockup-${slug}`}>{opp.lockup}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> KYC Required
            </p>
            <p className="text-sm font-medium" data-testid={`text-kyc-${slug}`}>
              {opp.kycRequired ? (
                <span className="text-amber-600 dark:text-amber-400">Yes</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">No</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" /> You Receive
            </p>
            <p className="text-sm font-medium" data-testid={`text-token-${slug}`}>{opp.tokenReceived}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {opp.integrated ? (
            <Link href="/ownbank/vaults" data-testid={`link-deposit-${slug}`}>
              <Button size="sm" className="bg-[#00A4E4] text-white border-[#00A4E4]">
                <Landmark className="h-4 w-4 mr-1.5" />
                Deposit Now
              </Button>
            </Link>
          ) : (
            <a href={opp.link} target="_blank" rel="noopener noreferrer" data-testid={`link-protocol-${slug}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Visit Protocol
              </Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSteps(!showSteps)}
            data-testid={`button-steps-${slug}`}
          >
            {showSteps ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showSteps ? "Hide Steps" : "Get Started \u2014 Step by Step"}
          </Button>
        </div>

        {showSteps && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3" data-testid={`steps-${slug}`}>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#00A4E4]" />
              How to get started with {opp.protocol}
            </p>
            <ol className="space-y-2">
              {opp.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            <div className="pt-2 border-t flex items-center gap-2">
              {opp.integrated ? (
                <Link href="/ownbank/vaults" data-testid={`link-steps-deposit-${slug}`}>
                  <Button size="sm" className="bg-[#00A4E4] text-white">
                    <Landmark className="h-4 w-4 mr-1.5" />
                    Go to Vaults
                  </Button>
                </Link>
              ) : (
                <Link href={`/wallets?chain=${opp.trackingChain}`} data-testid={`link-track-${slug}`}>
                  <Button size="sm" variant="default">
                    <Wallet className="h-4 w-4 mr-1.5" />
                    Track This Investment
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type QuizChain = "xrpl" | "ethereum" | "solana" | "multiple" | "unsure";
type QuizSize = "small" | "medium" | "large" | "xlarge";
type QuizWithdrawal = "instant" | "few_days" | "long_term";
type QuizRisk = "conservative" | "moderate" | "growth";

interface QuizState {
  chain: QuizChain | null;
  size: QuizSize | null;
  withdrawal: QuizWithdrawal | null;
  risk: QuizRisk | null;
}

function getRecommendations(quiz: QuizState): { id: string; reason: string }[] {
  const results: { id: string; reason: string }[] = [];
  if (!quiz.chain || !quiz.size || !quiz.withdrawal || !quiz.risk) return results;

  if (quiz.chain === "xrpl" || quiz.chain === "unsure" || quiz.chain === "multiple") {
    results.push({
      id: "soil",
      reason: quiz.chain === "xrpl"
        ? "You\u2019re on XRPL \u2014 Soil is directly integrated, no KYC needed, and you can start with as little as $50."
        : "Soil on XRPL is the easiest entry point \u2014 fully integrated, no KYC, deposit in seconds.",
    });
  }

  if (quiz.chain === "ethereum" || quiz.chain === "multiple" || quiz.chain === "unsure") {
    if (quiz.risk === "conservative") {
      results.push({
        id: "ondo-usdy",
        reason: "USDY is backed by US Treasuries with next-day redemption \u2014 the closest crypto equivalent to a money market fund.",
      });
      if (quiz.size === "xlarge") {
        results.push({
          id: "ondo-ousg",
          reason: "With $100K+ to invest, OUSG gives you tokenized exposure to BlackRock-managed government bond funds.",
        });
      }
    }
    if (quiz.risk === "moderate") {
      results.push({
        id: "centrifuge",
        reason: "Centrifuge offers diversified real-world asset pools \u2014 real estate, trade finance \u2014 with moderate risk and 4\u201310% yields.",
      });
    }
    if (quiz.risk === "growth") {
      results.push({
        id: "maple",
        reason: "Maple\u2019s institutional lending pools offer the highest yields (6\u201312%) with credit exposure to vetted corporate borrowers.",
      });
    }
  }

  if (quiz.chain === "solana" || quiz.chain === "multiple") {
    if (quiz.risk === "growth" && !results.find(r => r.id === "maple")) {
      results.push({
        id: "maple",
        reason: "Maple Finance is available on Solana \u2014 institutional lending pools with 6\u201312% yields.",
      });
    }
  }

  if ((quiz.chain === "xrpl" || quiz.chain === "unsure") && quiz.risk !== "conservative" && !results.find(r => r.id === "centrifuge")) {
    // no extra for xrpl-only users unless they picked multiple
  }

  if (quiz.chain === "multiple" || quiz.chain === "unsure") {
    if (!results.find(r => r.id === "xdc-tradefi") && quiz.risk === "moderate") {
      results.push({
        id: "xdc-tradefi",
        reason: "XDC\u2019s trade finance ecosystem offers unique exposure to global trade receivables \u2014 a real-economy yield source.",
      });
    }
  }

  if (results.length === 0) {
    results.push({
      id: "soil",
      reason: "Soil is the easiest starting point \u2014 no KYC, low minimum, and fully integrated with CryptoOwnBank.",
    });
    results.push({
      id: "ondo-usdy",
      reason: "USDY is the most popular tokenized treasury product \u2014 backed by US Treasuries with transparent, regulated yield.",
    });
  }

  return results;
}

function RecommenderSection() {
  const [quiz, setQuiz] = useState<QuizState>({ chain: null, size: null, withdrawal: null, risk: null });
  const [expanded, setExpanded] = useState(false);
  const recommendations = getRecommendations(quiz);
  const allAnswered = quiz.chain && quiz.size && quiz.withdrawal && quiz.risk;

  const radioGroup = (
    label: string,
    field: keyof QuizState,
    options: { value: string; label: string }[],
    testId: string
  ) => (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setQuiz((prev) => ({ ...prev, [field]: opt.value }))}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              quiz[field] === opt.value
                ? "bg-[#00A4E4] text-white border-[#00A4E4]"
                : "bg-card border-border hover:border-[#00A4E4]/50 text-foreground"
            }`}
            data-testid={`${testId}-${opt.value}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card data-testid="card-recommender">
      <CardContent className="p-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
          data-testid="button-toggle-recommender"
        >
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#00A4E4]" />
            <div>
              <p className="font-semibold text-sm">Find Your Best Fit</p>
              <p className="text-xs text-muted-foreground">Answer 4 quick questions to get a personalized recommendation</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {radioGroup(
              "What blockchain are you on?",
              "chain",
              [
                { value: "xrpl", label: "XRPL" },
                { value: "ethereum", label: "Ethereum" },
                { value: "solana", label: "Solana" },
                { value: "multiple", label: "Multiple chains" },
                { value: "unsure", label: "Not sure yet" },
              ],
              "quiz-chain"
            )}
            {radioGroup(
              "How much are you looking to invest?",
              "size",
              [
                { value: "small", label: "Under $1K" },
                { value: "medium", label: "$1K\u2013$10K" },
                { value: "large", label: "$10K\u2013$100K" },
                { value: "xlarge", label: "$100K+" },
              ],
              "quiz-size"
            )}
            {radioGroup(
              "How important is instant withdrawal?",
              "withdrawal",
              [
                { value: "instant", label: "Need instant access" },
                { value: "few_days", label: "Can wait a few days" },
                { value: "long_term", label: "Long-term is fine" },
              ],
              "quiz-withdrawal"
            )}
            {radioGroup(
              "What\u2019s your risk preference?",
              "risk",
              [
                { value: "conservative", label: "Conservative (govt bonds)" },
                { value: "moderate", label: "Moderate (credit & real estate)" },
                { value: "growth", label: "Growth (institutional lending)" },
              ],
              "quiz-risk"
            )}

            {allAnswered && recommendations.length > 0 && (
              <div className="pt-3 border-t space-y-3" data-testid="recommender-results">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Recommended for you
                </p>
                {recommendations.map((rec) => {
                  const opp = YIELD_OPPORTUNITIES.find((o) => o.id === rec.id);
                  if (!opp) return null;
                  return (
                    <div key={rec.id} className="rounded-lg border p-3 bg-muted/20" data-testid={`rec-${rec.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{opp.protocol} \u2014 {opp.asset}</p>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">{opp.apyRange} APY</p>
                        </div>
                        <Badge className={`shrink-0 text-xs ${getRiskBadgeVariant(opp.riskLevel)}`}>
                          {opp.riskLevel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">{rec.reason}</p>
                      <a href={`#protocol-${rec.id}`} className="text-xs text-[#00A4E4] hover:underline mt-1 inline-block" data-testid={`rec-link-${rec.id}`}>
                        View details below \u2193
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EarningStatusSection() {
  const { user } = useAuth();
  const { data: wallets } = useQuery<any[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const coveredChains = new Set(
    (wallets || []).map((w: any) => {
      const chain = w.chain?.toLowerCase();
      if (chain === "xrp") return "xrpl";
      if (chain === "eth") return "ethereum";
      if (chain === "sol") return "solana";
      return chain;
    })
  );

  if (!user) {
    return (
      <Card className="border-dashed" data-testid="card-tracking-guest">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wallet className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Track Your Earnings</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Create a free account to track all your yield and staking positions. Add your wallet and we detect your earning tokens automatically.
                </p>
              </div>
            </div>
            <Link href="/signup" data-testid="link-signup-tracking">
              <Button>
                <LogIn className="h-4 w-4 mr-1.5" />
                Sign Up Free
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const earningOpps = YIELD_OPPORTUNITIES.map((opp) => {
    const chainKey = opp.trackingChain?.toLowerCase();
    const isTracking = coveredChains.has(chainKey);
    return { opp, isTracking };
  });

  const activeCount = earningOpps.filter((e) => e.isTracking).length;
  const notEarningCount = earningOpps.filter((e) => !e.isTracking).length;

  return (
    <Card data-testid="card-earning-status">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#00A4E4]" />
            Your Earning Status
          </span>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs" data-testid="badge-earning-count">
                {activeCount} tracking
              </Badge>
            )}
            {notEarningCount > 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground" data-testid="badge-not-earning-count">
                {notEarningCount} not started
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {earningOpps.map(({ opp, isTracking }) => (
          <div
            key={opp.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${isTracking ? "bg-green-500/5 border-green-500/20" : "bg-muted/20"}`}
            data-testid={`earning-status-${opp.id}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {isTracking ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{opp.protocol}</span>
                  <Badge variant="outline" className="text-xs">{opp.chain}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{opp.asset} — {opp.apyRange}{opp.category === "yield" ? " APY" : ""}</p>
              </div>
            </div>
            <div className="shrink-0 ml-2">
              {isTracking ? (
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                  Tracking
                </Badge>
              ) : opp.integrated ? (
                <Link href="/ownbank/vaults" data-testid={`link-start-earning-${opp.id}`}>
                  <Button size="sm" className="bg-[#00A4E4] text-white border-[#00A4E4] h-7 text-xs">
                    Start Earning
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              ) : (
                <a href={`#protocol-${opp.id}`} data-testid={`link-start-earning-${opp.id}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Start Earning
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        ))}

        {notEarningCount > 0 && activeCount > 0 && (
          <p className="text-xs text-muted-foreground pt-1">
            You're tracking {activeCount} of {earningOpps.length} opportunities. Click "Start Earning" on any you haven't tried yet.
          </p>
        )}

        {activeCount === 0 && (
          <p className="text-xs text-muted-foreground pt-1">
            You haven't started earning with any protocols yet. Pick one above to get started — Soil Protocol is the easiest (no KYC, $50 minimum).
          </p>
        )}

        <div className="pt-3 mt-3 border-t border-muted">
          <a href="/ownbank" className="text-xs text-primary hover:underline flex items-center gap-1.5" data-testid="link-cold-wallet-guide">
            <Shield className="h-3.5 w-3.5" />
            Need a cold wallet? Compare wallets based on your portfolio →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RwaYields() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-rwa-yields-title">
          Earn & Yield Explorer
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-rwa-yields-subtitle">
          Discover every way to earn on your crypto — yield vaults, RWA lending, cashback rewards, and more — all from one place
        </p>
      </div>

      <Card data-testid="card-rwa-education">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-[#00A4E4] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">What are Real-World Assets (RWAs)?</p>
              <p className="text-sm text-muted-foreground">
                RWA tokens represent ownership or exposure to real-world assets \u2014 like US Treasury bonds, real estate mortgages, trade invoices, or corporate loans \u2014 on the blockchain. Instead of earning yield from speculative crypto trading, RWA yields come from tangible economic activity: governments paying interest on bonds, businesses paying invoices, or borrowers repaying loans.
              </p>
              <p className="text-sm text-muted-foreground">
                This means more predictable, sustainable returns compared to volatile DeFi farming \u2014 often with institutional-grade backing and transparent collateral.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RecommenderSection />

      <EarningStatusSection />

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-yield-opportunities-heading">
          <TrendingUp className="h-5 w-5 text-[#00A4E4]" />
          Yield Vaults & RWA
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {YIELD_OPPORTUNITIES.filter((opp) => opp.category === "yield").map((opp) => (
            <div key={opp.id} id={`protocol-${opp.id}`}>
              <ProtocolCard opp={opp} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-cashback-opportunities-heading">
          <CreditCard className="h-5 w-5 text-[#00A4E4]" />
          Cashback & Rewards
        </h2>
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Earn XRP rewards on your everyday payroll and spending activity — no lockups, no deposits required.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {YIELD_OPPORTUNITIES.filter((opp) => opp.category === "cashback").map((opp) => (
            <div key={opp.id} id={`protocol-${opp.id}`}>
              <ProtocolCard opp={opp} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-comparison-heading">
          <Scale className="h-5 w-5" />
          Traditional vs Tokenized Yields
        </h2>
        <Card data-testid="card-yield-comparison">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">APY</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_DATA.map((row, i) => (
                    <tr key={i} className="border-b last:border-b-0" data-testid={`row-comparison-${i}`}>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs ${row.type === "Tokenized" ? "border-[#00A4E4]/40 text-[#00A4E4]" : ""}`}>
                          {row.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{row.product}</td>
                      <td className="p-3">
                        <span className={`font-semibold ${row.apyNum >= 5 ? "text-green-600 dark:text-green-400" : row.apyNum >= 4 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {row.apy}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Info className="h-3 w-3 shrink-0" />
          Yields are approximate and subject to change. Traditional rates based on US market as of early 2026. Tokenized rates vary by pool and market conditions.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-risks-heading">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Understanding RWA Risks
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          RWA tokens offer attractive yields but carry unique risks different from traditional DeFi. Understanding these risks helps you make informed allocation decisions.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {RISK_EDUCATION.map((risk) => (
            <Card key={risk.type} data-testid={`card-risk-${risk.type}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <risk.icon className={`h-5 w-5 shrink-0 ${risk.type === "credit" ? "text-amber-500" : risk.type === "smart_contract" ? "text-red-500" : risk.type === "liquidity" ? "text-blue-500" : "text-purple-500"}`} />
                  <h3 className="font-semibold text-sm" data-testid={`text-risk-title-${risk.type}`}>{risk.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{risk.description}</p>
                <div className="rounded-md bg-muted/30 border border-muted p-3">
                  <p className="text-xs">
                    <span className="font-medium text-foreground">Mitigation:</span>{" "}
                    <span className="text-muted-foreground">{risk.mitigation}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5" data-testid="card-rwa-cta">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Landmark className="h-6 w-6 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ready to earn RWA yield?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Soil Protocol is fully integrated \u2014 deposit RLUSD and start earning 5\u20138% APY backed by real-world credit. No KYC, no minimum lockup.
                </p>
              </div>
            </div>
            <Link href="/ownbank/vaults" data-testid="link-cta-vaults">
              <Button className="bg-[#00A4E4] text-white border-[#00A4E4] shrink-0">
                <ArrowRight className="h-4 w-4 mr-1.5" />
                Go to Vaults
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Information provided is for educational purposes only. Not financial advice. Always do your own research before depositing into any protocol. Past yields do not guarantee future returns.
      </p>
    </div>
  );
}
