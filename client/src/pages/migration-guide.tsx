import { useState } from "react";
import { SeoHead } from "@/components/seo-head";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Link2,
  Wallet,
  ArrowRightLeft,
  Landmark,
  Shield,
  TrendingUp,
  Upload,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Target,
  Star,
  LogIn,
} from "lucide-react";

interface MigrationStep {
  id: string;
  number: number;
  icon: any;
  title: string;
  subtitle: string;
  time: string;
  description: string;
  why: string;
  details: string[];
  action: { label: string; href: string };
  tip?: string;
  optional?: boolean;
}

const migrationSteps: MigrationStep[] = [
  {
    id: "import",
    number: 1,
    icon: Upload,
    title: "Import Your Yahoo Finance Portfolio",
    subtitle: "Get everything on the board",
    time: "5 min",
    description:
      "Export your holdings from Yahoo Finance as a CSV, then upload it here. This creates a baseline of everything you own — your starting point.",
    why: "This gives you a complete snapshot of your current holdings, even before connecting anything live. It's the fastest way to see your full portfolio in one place.",
    details: [
      "Go to Yahoo Finance → Portfolio → Export to CSV",
      "Navigate to Statement Insights on this site",
      "Upload the CSV file — the parser handles Yahoo's format automatically",
      "Review the parsed entries and click \"Add to Portfolio\" for each one",
      "Your entire Yahoo portfolio is now visible on the dashboard",
    ],
    action: { label: "Go to Statement Insights", href: "/statement-insights" },
    tip: "Don't worry about duplicates yet — we'll clean those up in Step 4. The goal here is to get everything visible first.",
  },
  {
    id: "exchanges",
    number: 2,
    icon: Link2,
    title: "Import Your Exchange Data",
    subtitle: "Bring your exchange transaction history into one dashboard",
    time: "5 min per exchange",
    description:
      "Export your transaction history from your exchange accounts (Coinbase, Kraken, Binance, etc.) as CSV files and upload them here. Your positions and tax lots are created automatically — no more manual tracking.",
    why: "Once imported, your exchange transactions are consolidated with your wallet data. You'll see your complete portfolio in one place. This replaces the tedious part of Yahoo Finance.",
    details: [
      "Go to Import Data in the sidebar",
      "Log in to your exchange and export your transaction history as a CSV file",
      "Most exchanges have this in Settings, Reports, or Statements",
      "Upload the CSV file — we support Ledger Live, Yahoo Finance, CoinTracker, and generic CSV formats",
      "Your transactions, positions, and tax lots will appear automatically",
    ],
    action: { label: "Go to Import Data", href: "/integrations" },
    tip: "Most exchanges let you export transaction history from their Settings or Reports page. If your exchange's format isn't recognized, try the generic CSV option (Symbol, Quantity, Price, Date).",
  },
  {
    id: "wallets",
    number: 3,
    icon: Wallet,
    title: "Add Your Blockchain Wallets",
    subtitle: "Track your cold storage and on-chain holdings live",
    time: "2 min per wallet",
    description:
      "Add the public addresses of your hardware wallets (Ledger, Trezor) or any blockchain address. The site reads balances directly from the blockchain — always accurate, always current.",
    why: "If you moved crypto from an exchange to a Ledger for safekeeping, the exchange no longer shows that balance. Adding your wallet address here means it's tracked live from the blockchain itself — the most reliable source of truth.",
    details: [
      "Go to Blockchain Addresses",
      "Click \"Add Address\" and paste your wallet's public address",
      "Select the blockchain network (Bitcoin, Ethereum, XRP, Solana, etc.)",
      "The site reads your balance directly from the blockchain — no API key needed",
      "Supports 32+ blockchains including BTC, ETH, XRP, SOL, ADA, MATIC, AVAX, TON, XLM, and more",
      "If you have multiple Ledgers or moved assets between wallets, add each address",
    ],
    action: { label: "Go to Blockchain Addresses", href: "/wallets" },
    tip: "Your public address is safe to share — it's like a bank account number. Anyone can see the balance, but only you (with your private key/Ledger) can move the funds.",
  },
  {
    id: "reconcile",
    number: 4,
    icon: ArrowRightLeft,
    title: "Reconcile & Clean Up Duplicates",
    subtitle: "Cross off the old entries now tracked live",
    time: "5–10 min",
    description:
      "Now that your exchanges and wallets are connected live, some of your Yahoo imports are duplicates. The Reconciliation page groups everything by asset and helps you cross off entries that are already accounted for.",
    why: "When you imported from Yahoo, you captured everything. But now that Coinbase is connected and your Ledger address is added, those same assets show up twice. This step removes the old import entries so your totals are accurate.",
    details: [
      "Go to Reconciliation — assets with possible duplicates are flagged at the top",
      "Expand any flagged asset to see the side-by-side comparison",
      "For each Yahoo import that's now tracked live, click \"Already accounted for — Remove\"",
      "For Yahoo entries without a live source yet, click \"Mark as Addressed\" to check them off",
      "Use the filter cards to focus on just duplicates or just manual/import entries",
    ],
    action: { label: "Go to Reconciliation", href: "/reconciliation" },
    tip: "You don't have to do this all at once. Come back anytime — the Reconciliation page always shows what needs attention.",
  },
  {
    id: "verify",
    number: 5,
    icon: Target,
    title: "Verify Your Dashboard",
    subtitle: "Make sure everything adds up",
    time: "5 min",
    description:
      "Head to the dashboard and portfolio pages. Your total net worth should now match what you had on Yahoo — but now it updates automatically. Compare the numbers to make sure nothing was missed.",
    why: "This is your sanity check. The dashboard total should be close to what Yahoo showed (prices change, so exact match isn't expected). If something looks off, go back to Reconciliation to investigate.",
    details: [
      "Check the Overview dashboard — total portfolio value should be in the right ballpark",
      "Open the Portfolio page for a detailed breakdown by asset",
      "Compare against your Yahoo Finance total to make sure nothing was missed",
      "If an asset is missing, either import that exchange's CSV or add the wallet address",
      "If totals seem doubled, check Reconciliation for unresolved duplicates",
    ],
    action: { label: "Go to Dashboard", href: "/" },
  },
  {
    id: "yield",
    number: 6,
    icon: Landmark,
    title: "Explore Yield Vaults (Optional)",
    subtitle: "Put idle stablecoins to work",
    time: "15 min first time",
    description:
      "Once your portfolio is consolidated, you may want to explore earning yield on stablecoins like RLUSD through the non-custodial Soil vault. This is completely optional — the portfolio tracker works great on its own.",
    why: "If you have stablecoins sitting idle, the yield vault offers 5–8% APR backed by real-world assets. Your funds stay in your own wallet — this site never holds your money.",
    details: [
      "Read the Setup Guide to understand the non-custodial vault architecture",
      "You'll need Xaman (mobile app) and optionally a Ledger for hardware-level security",
      "Deposit RLUSD into the Soil vault and earn weekly interest",
      "Withdraw anytime — your principal is always accessible",
      "Interest shows up in your portfolio automatically",
    ],
    action: { label: "Go to OwnBank", href: "/ownbank" },
    tip: "This step is entirely optional. Many users just use CryptoOwnBank as a portfolio tracker. The yield vault is there when you're ready.",
    optional: true,
  },
];

function StepCard({
  step,
  isComplete,
  isActive,
  onToggle,
  isExpanded,
}: {
  step: MigrationStep;
  isComplete: boolean;
  isActive: boolean;
  onToggle: () => void;
  isExpanded: boolean;
}) {
  const [, navigate] = useLocation();
  const Icon = step.icon;

  return (
    <Card
      className={`transition-all duration-200 ${
        isComplete
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
          : isActive
            ? "border-[#00A4E4]/40 shadow-sm"
            : "opacity-75"
      }`}
      data-testid={`step-card-${step.id}`}
    >
      <CardHeader
        className="cursor-pointer pb-2"
        onClick={onToggle}
        data-testid={`step-toggle-${step.id}`}
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-0.5">
            {isComplete ? (
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            ) : isActive ? (
              <div className="h-10 w-10 rounded-full bg-[#00A4E4] flex items-center justify-center">
                <span className="text-white font-bold text-sm">{step.number}</span>
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                <span className="text-muted-foreground/50 font-bold text-sm">{step.number}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{step.title}</CardTitle>
              {step.optional && (
                <Badge variant="outline" className="text-[10px] shrink-0">Optional</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{step.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />
              {step.time}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-5">
          <div className="ml-14 space-y-4">
            <p className="text-sm leading-relaxed">{step.description}</p>

            <div className="rounded-lg bg-[#00A4E4]/5 dark:bg-[#00A4E4]/10 border border-[#00A4E4]/20 p-3">
              <div className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-[#00A4E4] shrink-0 mt-0.5" />
                <p className="text-xs text-[#00A4E4] dark:text-[#00A4E4]/90 font-medium">
                  Why this matters
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.why}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                How to do it
              </p>
              <ol className="space-y-2">
                {step.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{detail}</span>
                  </li>
                ))}
              </ol>
            </div>

            {step.tip && (
              <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3">
                <p className="text-xs">
                  <span className="font-medium text-amber-700 dark:text-amber-400">Tip: </span>
                  <span className="text-muted-foreground">{step.tip}</span>
                </p>
              </div>
            )}

            <Button
              onClick={() => navigate(step.action.href)}
              className="gap-2"
              variant={isActive ? "default" : "outline"}
              size="sm"
              data-testid={`step-action-${step.id}`}
            >
              {step.action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function MigrationGuide() {
  const [expandedStep, setExpandedStep] = useState<string | null>("import");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ["/api/positions"],
    enabled: isLoggedIn,
  });
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ["/api/accounts"],
    enabled: isLoggedIn,
  });
  const { data: wallets = [] } = useQuery<any[]>({
    queryKey: ["/api/blockchain-addresses"],
    enabled: isLoggedIn,
  });

  const hasImports = positions.some(
    (p: any) => p.source?.includes("Yahoo") || p.source?.includes("CSV") || p.source?.includes("Manual")
  );
  const hasExchangeConnected = accounts.some(
    (a: any) => a.accountType === "exchange" && a.apiKey
  );
  const hasWalletAdded = (wallets as any[]).length > 0;

  const addressedCount = positions.filter((p: any) => p.isAddressed).length;
  const importCount = positions.filter(
    (p: any) => p.source?.includes("Yahoo") || p.source?.includes("CSV") || p.source?.includes("Manual")
  ).length;
  const hasReconciled = addressedCount > 0 || (hasImports && (hasExchangeConnected || hasWalletAdded) && importCount === 0);

  const hasVerified = hasImports && (hasExchangeConnected || hasWalletAdded) && hasReconciled;

  const completedSteps = {
    import: hasImports,
    exchanges: hasExchangeConnected,
    wallets: hasWalletAdded,
    reconcile: hasReconciled,
    verify: hasVerified,
    yield: false,
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = migrationSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const firstIncomplete = migrationSteps.find(
    (s) => !completedSteps[s.id as keyof typeof completedSteps]
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="page-migration-guide">
      <SeoHead
        title="Migration Guide — CryptoOwnBank | Import Your Portfolio"
        description="Migrate from spreadsheets and Yahoo Finance to live portfolio tracking. Import CSV files, add blockchain wallets — step by step."
        path="/migration-guide"
      />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/20 text-[10px]">
            Migration Guide
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-migration-title">
          Bridge Your Portfolio to Live Tracking
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Move from spreadsheets and Yahoo Finance to a dashboard that updates itself. 
          Follow these steps at your own pace — each one builds on the last, and you can 
          come back anytime to pick up where you left off.
        </p>
      </div>

      {isLoggedIn ? (
        <Card className="border-dashed" data-testid="card-migration-progress">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#00A4E4]" />
                <span className="text-sm font-medium">Your Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {completedCount} of {totalSteps} steps
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {completedCount === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Start with Step 1 — importing your Yahoo Finance portfolio takes about 5 minutes.
              </p>
            )}
            {completedCount > 0 && completedCount < totalSteps && firstIncomplete && (
              <p className="text-xs text-muted-foreground mt-2">
                Next up: {firstIncomplete.title}
              </p>
            )}
            {completedCount === totalSteps && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                Migration complete — your portfolio is fully live!
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-[#00A4E4]/30" data-testid="card-migration-login-prompt">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Sign in to track your progress</p>
                <p className="text-xs text-muted-foreground">
                  Create a free account to follow along and check off each step as you go.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => navigate("/signup")}
                data-testid="button-migration-signup"
              >
                <LogIn className="h-3.5 w-3.5" />
                Get Started Free
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-900/50 dark:to-blue-950/20 border p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-[#00A4E4] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Your data stays yours</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This site is a dashboard — it reads your data from exchanges and blockchains
              using read-only connections. It never holds your funds, never has your private keys,
              and never makes trades on your behalf. You're in complete control at every step.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3" data-testid="steps-container">
        {migrationSteps.map((step) => {
          const stepComplete = completedSteps[step.id as keyof typeof completedSteps];
          const isActive = firstIncomplete?.id === step.id;

          return (
            <StepCard
              key={step.id}
              step={step}
              isComplete={stepComplete}
              isActive={isActive}
              isExpanded={expandedStep === step.id}
              onToggle={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
            />
          );
        })}
      </div>

      <Card className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-200/50 dark:border-emerald-800/30">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Star className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">After migration</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Once your portfolio is consolidated, you'll have a single dashboard that tracks 
                everything automatically. Blockchain wallets update from the chain, imported 
                exchange data is always available, and prices refresh throughout the day. No more 
                switching between Yahoo Finance tabs and exchange apps to figure out where you stand.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Zap className="h-2.5 w-2.5" /> Auto-updating balances
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <FileSpreadsheet className="h-2.5 w-2.5" /> Tax reports ready
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Shield className="h-2.5 w-2.5" /> 100% non-custodial
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
