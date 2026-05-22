import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sprout,
  Wallet,
  BarChart3,
  Crown,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  Sparkles,
  Shield,
  Smartphone,
  HardDrive,
  ClipboardList,
  Building2,
  Link2,
  Lock,
  Play,
  Pause,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { useXrplStore } from "@/lib/xrpl-store";

interface UserInventory {
  ownsCrypto: "exchange" | "wallet" | "both" | "none" | null;
  hasColdWallet: boolean | null;
  hasHotWallet: boolean | null;
}

type StepStatus = "completed" | "in_progress" | "ready" | "blocked" | "not_started";

interface OnboardingStep {
  id: string;
  phase: "foundation" | "connect" | "earn";
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  href: string;
  icon: any;
  iconColor: string;
  autoCompleted: boolean;
  requires: string[];
  parallelWith?: string[];
  onClick?: () => void;
}

const PHASE_META: Record<string, { label: string; color: string; dot: string }> = {
  foundation: { label: "Set Up Your Foundation", color: "text-blue-500", dot: "bg-blue-500" },
  connect: { label: "Connect Your Assets", color: "text-amber-500", dot: "bg-amber-500" },
  earn: { label: "Start Earning", color: "text-emerald-500", dot: "bg-emerald-500" },
};

function getStoredInventory(): UserInventory | null {
  const raw = localStorage.getItem("onboarding-inventory");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function storeInventory(inv: UserInventory) {
  localStorage.setItem("onboarding-inventory", JSON.stringify(inv));
}

function getManualStatuses(): Record<string, "in_progress" | "done"> {
  const raw = localStorage.getItem("onboarding-step-status");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function setManualStatus(stepId: string, status: "in_progress" | "done" | null) {
  const current = getManualStatuses();
  if (status === null) {
    delete current[stepId];
  } else {
    current[stepId] = status;
  }
  localStorage.setItem("onboarding-step-status", JSON.stringify(current));
}

function resolveStatus(
  step: OnboardingStep,
  allSteps: OnboardingStep[],
  manualStatuses: Record<string, "in_progress" | "done">
): StepStatus {
  if (step.autoCompleted || manualStatuses[step.id] === "done") return "completed";
  if (manualStatuses[step.id] === "in_progress") return "in_progress";

  if (step.requires.length > 0) {
    const allRequirementsMet = step.requires.every((reqId) => {
      const reqStep = allSteps.find((s) => s.id === reqId);
      if (!reqStep) return true;
      return reqStep.autoCompleted || manualStatuses[reqId] === "done";
    });
    if (!allRequirementsMet) return "blocked";
  }

  return "ready";
}

function InventoryQuiz({ onComplete, onSkip }: { onComplete: (inv: UserInventory) => void; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  const [inventory, setInventory] = useState<UserInventory>({
    ownsCrypto: null,
    hasColdWallet: null,
    hasHotWallet: null,
  });

  const questions = [
    {
      title: "Do you currently own any crypto?",
      subtitle: "This helps us know where to start",
      options: [
        { label: "Yes, on an exchange (Coinbase, Binance, etc.)", value: "exchange" as const, icon: Building2 },
        { label: "Yes, in my own wallet", value: "wallet" as const, icon: Wallet },
        { label: "Yes, both exchange and wallet", value: "both" as const, icon: Link2 },
        { label: "Not yet — I'm new to crypto", value: "none" as const, icon: Sparkles },
      ],
    },
    {
      title: "Do you have a cold wallet?",
      subtitle: "Hardware wallets like Ledger, ELLIPAL, Trezor, or Cypherock",
      options: [
        { label: "Yes, I have a cold wallet", value: true as const, icon: HardDrive },
        { label: "No, not yet", value: false as const, icon: Shield },
      ],
    },
    {
      title: "Do you have a hot wallet like Xaman?",
      subtitle: "Mobile wallets for signing transactions on XRPL",
      options: [
        { label: "Yes, I have Xaman (or similar)", value: true as const, icon: Smartphone },
        { label: "No, not yet", value: false as const, icon: Smartphone },
      ],
    },
  ];

  const currentQ = questions[step];

  const handleSelect = (value: any) => {
    const updated = { ...inventory };
    if (step === 0) updated.ownsCrypto = value;
    else if (step === 1) updated.hasColdWallet = value;
    else if (step === 2) updated.hasHotWallet = value;
    setInventory(updated);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      storeInventory(updated);
      onComplete(updated);
    }
  };

  return (
    <Card className="border-[#00A4E4]/30 bg-gradient-to-r from-[#00A4E4]/5 to-transparent" data-testid="card-inventory-quiz">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5 text-[#00A4E4]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base" data-testid="heading-quiz">
              Quick Setup — Question {step + 1} of {questions.length}
            </h3>
            <p className="text-xs text-muted-foreground">
              Tell us what you have so we can create your personalized path
            </p>
          </div>
        </div>

        <Progress value={((step + 1) / questions.length) * 100} className="h-1.5 mb-5" />

        <div className="mb-2">
          <h4 className="text-sm font-semibold mb-1" data-testid="text-quiz-question">{currentQ.title}</h4>
          <p className="text-xs text-muted-foreground mb-4">{currentQ.subtitle}</p>
        </div>

        <div className="space-y-2">
          {currentQ.options.map((opt: any) => (
            <button
              key={String(opt.value)}
              onClick={() => handleSelect(opt.value)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-muted bg-card hover:border-[#00A4E4]/50 hover:bg-[#00A4E4]/5 transition-all text-left"
              data-testid={`quiz-option-${String(opt.value)}`}
            >
              <div className="h-8 w-8 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
                <opt.icon className="h-4 w-4 text-[#00A4E4]" />
              </div>
              <span className="text-sm font-medium">{opt.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div>
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                data-testid="button-quiz-back"
              >
                ← Back
              </Button>
            )}
          </div>
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            data-testid="button-skip-quiz"
          >
            Skip, I'll explore on my own
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function buildSteps(
  inventory: UserInventory,
  liveState: {
    walletCount: number;
    hasExchangeData: boolean;
    hasXrplWallet: boolean;
    isXrplConnected: boolean;
    hasVaultDeposits: boolean;
    subscriptionTier: string | null;
    recsViewed: boolean;
    markRecsViewed: () => void;
  }
): OnboardingStep[] {
  const steps: OnboardingStep[] = [];

  const needsColdWallet = !inventory.hasColdWallet;
  const needsHotWallet = !inventory.hasHotWallet;
  const hasNoCrypto = inventory.ownsCrypto === "none";
  const hasCryptoOnExchange = inventory.ownsCrypto === "exchange" || inventory.ownsCrypto === "both";
  const hasCryptoInWallet = inventory.ownsCrypto === "wallet" || inventory.ownsCrypto === "both";

  if (needsColdWallet) {
    steps.push({
      id: "get_cold_wallet",
      phase: "foundation",
      title: "Get a Cold Wallet",
      subtitle: "Your keys, your crypto",
      description:
        "A cold wallet (Ledger, ELLIPAL, Trezor, Cypherock) keeps your private keys offline and secure. This is the foundation of self-custody — the whole point of 'being your own bank.'",
      cta: "See Recommended Wallets",
      href: "/setup-guide",
      icon: HardDrive,
      iconColor: "text-blue-500",
      autoCompleted: false,
      requires: [],
      parallelWith: needsHotWallet ? ["get_hot_wallet"] : undefined,
    });
  }

  if (needsHotWallet) {
    steps.push({
      id: "create_wallet_browser",
      phase: "foundation",
      title: "Create a Wallet in Your Browser (90 seconds)",
      subtitle: "Fastest path — no shipping, no app install",
      description:
        "The quickest way to get a working non-custodial XRPL wallet. Generate fresh, import an existing seed, or roll your own entropy with dice — all in your browser. Your keys are created on your device and never sent to our server. Recommended if you don't have a wallet yet.",
      cta: "Create Wallet",
      href: "/wallet/create",
      icon: Sparkles,
      iconColor: "text-[#00A4E4]",
      autoCompleted: false,
      requires: [],
      parallelWith: ["get_hot_wallet"],
    });
    steps.push({
      id: "get_hot_wallet",
      phase: "foundation",
      title: "Or Download Xaman Wallet",
      subtitle: "Alternative — mobile app with cold wallet pairing",
      description:
        "Prefer a dedicated mobile app, or already own a Ledger you want to pair? Xaman is the mobile wallet for XRPL — it can run standalone or pair with your cold wallet so your hardware device holds the keys while Xaman acts as the interface.",
      cta: "Set Up Xaman",
      href: "/setup-guide",
      icon: Smartphone,
      iconColor: "text-blue-500",
      autoCompleted: false,
      requires: [],
      parallelWith: ["create_wallet_browser"].concat(needsColdWallet ? ["get_cold_wallet"] : []),
    });
  }

  if (hasCryptoInWallet || inventory.hasColdWallet) {
    steps.push({
      id: "add_wallets",
      phase: "connect",
      title: "Add Your Wallet Addresses",
      subtitle: "See all your holdings in one place",
      description:
        "Paste your cold wallet addresses across 32+ blockchains. We pull balances and history — read-only, no keys needed. This is how we show you everything you own.",
      cta: "Add Wallet Addresses",
      href: "/wallets",
      icon: Wallet,
      iconColor: "text-amber-500",
      autoCompleted: liveState.walletCount >= 1,
      requires: needsColdWallet ? ["get_cold_wallet"] : [],
      parallelWith: hasCryptoOnExchange ? ["add_exchange"] : undefined,
    });
  }

  if (hasCryptoOnExchange) {
    steps.push({
      id: "add_exchange",
      phase: "connect",
      title: "Import Exchange Data",
      subtitle: "Import your exchange transaction history",
      description:
        "Export your transaction history from Coinbase, Binance, Kraken, or other exchanges as a CSV file. Then upload it on the Import Data page to see everything in one dashboard.",
      cta: "Import Data",
      href: "/integrations",
      icon: Building2,
      iconColor: "text-amber-500",
      autoCompleted: liveState.hasExchangeData,
      requires: [],
      parallelWith: hasCryptoInWallet || inventory.hasColdWallet ? ["add_wallets"] : undefined,
    });
  }

  if (hasNoCrypto) {
    steps.push({
      id: "add_wallets_new",
      phase: "connect",
      title: "Add a Wallet Address",
      subtitle: "Once you get crypto, add your address here",
      description:
        "After you acquire your first crypto and set up a wallet, paste the address here. We'll track your balances and transactions automatically across 32+ blockchains.",
      cta: "Add Wallet Address",
      href: "/wallets",
      icon: Wallet,
      iconColor: "text-amber-500",
      autoCompleted: liveState.walletCount >= 1 || liveState.hasExchangeData,
      requires: needsColdWallet ? ["get_cold_wallet"] : [],
    });
  }

  const xrplRequires: string[] = [];
  if (needsHotWallet) xrplRequires.push("get_hot_wallet");
  steps.push({
    id: "connect_xrpl",
    phase: "connect",
    title: "Connect XRPL Wallet",
    subtitle: "Link your wallet to OwnBank",
    description:
      "Connect your Xaman or Ledger wallet to CryptoOwnBank. This lets you manage RLUSD yield vaults, track XRP balances live, and sign transactions — all non-custodial.",
    cta: "Connect Wallet",
    href: "/ownbank",
    icon: Link2,
    iconColor: "text-amber-500",
    autoCompleted: liveState.isXrplConnected || liveState.hasXrplWallet,
    requires: xrplRequires,
  });

  steps.push({
    id: "earn_yield",
    phase: "earn",
    title: "Deposit & Start Earning Yield",
    subtitle: "5-8% fixed APR on RLUSD",
    description:
      "Deposit RLUSD into a Soil vault and start earning 5–8% fixed APR. Backed by real-world assets, fully non-custodial — your crypto never leaves your wallet.",
    cta: "Deposit into Vault",
    href: "/ownbank",
    icon: Sprout,
    iconColor: "text-emerald-500",
    autoCompleted: liveState.hasVaultDeposits,
    requires: ["connect_xrpl"],
  });

  steps.push({
    id: "get_evaluated",
    phase: "earn",
    title: "Get Your Portfolio Evaluated",
    subtitle: "See where you're leaving money on the table",
    description:
      "Our Recommendations Hub analyzes every asset you hold and shows you exactly where you can earn more — better staking rates, on-chain yield, and optimization opportunities.",
    cta: "View Recommendations",
    href: "/",
    icon: BarChart3,
    iconColor: "text-emerald-500",
    autoCompleted: (liveState.walletCount >= 1 || liveState.hasExchangeData) && liveState.recsViewed,
    requires: [],
    parallelWith: ["earn_yield"],
    onClick: liveState.markRecsViewed,
  });

  steps.push({
    id: "go_premium",
    phase: "earn",
    title: "Unlock Full Power",
    subtitle: "Unlimited everything",
    description:
      "Go Premium for unlimited wallets, full Recommendations Hub, portfolio search/filter, unlimited alerts, and tax reports. Pay with crypto — it's our preferred method.",
    cta: "Upgrade to Premium",
    href: "/settings",
    icon: Crown,
    iconColor: "text-emerald-500",
    autoCompleted: liveState.subscriptionTier === "premium" || liveState.subscriptionTier === "pro",
    requires: [],
  });

  return steps;
}

function StatusBadge({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700">Done</Badge>;
    case "in_progress":
      return <Badge className="bg-amber-500 text-[10px] px-1.5 py-0">In Progress</Badge>;
    case "ready":
      return <Badge className="bg-[#00A4E4] text-[10px] px-1.5 py-0">Ready</Badge>;
    case "blocked":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">Blocked</Badge>;
    default:
      return null;
  }
}

function StatusIcon({ status, step }: { status: StepStatus; step: OnboardingStep }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case "in_progress":
      return <Play className="h-4 w-4 text-amber-500 fill-amber-500" />;
    case "blocked":
      return <Lock className="h-4 w-4 text-muted-foreground/50" />;
    default:
      return <step.icon className={`h-4 w-4 ${status === "ready" ? step.iconColor : "text-muted-foreground"}`} />;
  }
}

function StepActions({
  step,
  status,
  allSteps,
  onStatusChange,
  onNavigate,
}: {
  step: OnboardingStep;
  status: StepStatus;
  allSteps: OnboardingStep[];
  onStatusChange: (stepId: string, status: "in_progress" | "done" | null) => void;
  onNavigate: (step: OnboardingStep) => void;
}) {
  if (status === "completed") return null;

  if (status === "blocked") {
    const blockers = step.requires
      .map((id) => allSteps.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => s!.title);
    return (
      <p className="text-[11px] text-muted-foreground/70 italic mt-1">
        Requires: {blockers.join(", ")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {status === "in_progress" ? (
        <>
          <Button
            size="sm"
            className="bg-[#00A4E4] hover:bg-[#0090c9] text-white h-7 text-xs"
            onClick={() => onNavigate(step)}
            data-testid={`button-continue-${step.id}`}
          >
            Continue
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onStatusChange(step.id, "done")}
            data-testid={`button-mark-done-${step.id}`}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Mark Done
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => onStatusChange(step.id, null)}
            data-testid={`button-reset-${step.id}`}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            className="bg-[#00A4E4] hover:bg-[#0090c9] text-white h-7 text-xs"
            onClick={() => {
              onStatusChange(step.id, "in_progress");
              onNavigate(step);
            }}
            data-testid={`button-start-${step.id}`}
          >
            {step.cta}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => onStatusChange(step.id, "done")}
            data-testid={`button-skip-${step.id}`}
          >
            Already done
          </Button>
        </>
      )}
    </div>
  );
}

export function OnboardingChecklist({
  walletCount,
  hasExchangeData,
  hasXrplWallet,
}: {
  walletCount: number;
  hasExchangeData: boolean;
  hasXrplWallet?: boolean;
}) {
  const { isConnected, walletAddress, vaultDeposits, subscriptionTier } = useXrplStore();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [inventory, setInventory] = useState<UserInventory | null>(() => getStoredInventory());
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("onboarding-dismissed") === "true"
  );
  const [recsViewed, setRecsViewed] = useState(() =>
    localStorage.getItem("recommendations-viewed") === "true"
  );
  const [manualStatuses, setManualStatuses] = useState<Record<string, "in_progress" | "done">>(
    () => getManualStatuses()
  );

  const markRecsViewed = useCallback(() => {
    localStorage.setItem("recommendations-viewed", "true");
    setRecsViewed(true);
  }, []);

  const handleQuizComplete = (inv: UserInventory) => setInventory(inv);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("onboarding-dismissed", "true");
  };

  const handleResetQuiz = () => {
    localStorage.removeItem("onboarding-inventory");
    localStorage.removeItem("onboarding-step-status");
    setInventory(null);
    setManualStatuses({});
  };

  const handleStatusChange = (stepId: string, status: "in_progress" | "done" | null) => {
    setManualStatus(stepId, status);
    setManualStatuses(getManualStatuses());
  };

  const handleNavigate = (step: OnboardingStep) => {
    if (step.onClick) step.onClick();
    setLocation(step.href);
  };

  if (dismissed) return null;

  if (!inventory) {
    return <InventoryQuiz onComplete={handleQuizComplete} onSkip={handleDismiss} />;
  }

  const steps = buildSteps(inventory, {
    walletCount,
    hasExchangeData,
    hasXrplWallet: hasXrplWallet === true,
    isXrplConnected: isConnected && walletAddress !== null,
    hasVaultDeposits: vaultDeposits.length > 0,
    subscriptionTier,
    recsViewed,
    markRecsViewed,
  });

  const statuses = steps.map((s) => resolveStatus(s, steps, manualStatuses));
  const completedCount = statuses.filter((s) => s === "completed").length;
  const inProgressCount = statuses.filter((s) => s === "in_progress").length;
  const allDone = completedCount === steps.length;
  const progressPercent = (completedCount / steps.length) * 100;

  if (allDone) return null;

  const phases = ["foundation", "connect", "earn"] as const;
  const stepsByPhase = phases
    .map((phase) => ({
      phase,
      ...PHASE_META[phase],
      items: steps
        .map((s, i) => ({ step: s, status: statuses[i] }))
        .filter(({ step }) => step.phase === phase),
    }))
    .filter((p) => p.items.length > 0);

  const firstReadyOrInProgress = steps.findIndex(
    (_, i) => statuses[i] === "ready" || statuses[i] === "in_progress"
  );
  const focusStep = firstReadyOrInProgress >= 0 ? steps[firstReadyOrInProgress] : null;
  const focusStatus = firstReadyOrInProgress >= 0 ? statuses[firstReadyOrInProgress] : null;

  return (
    <Card className="border-[#00A4E4]/30 bg-gradient-to-r from-[#00A4E4]/5 to-transparent" data-testid="card-onboarding">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[#00A4E4]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base" data-testid="heading-onboarding">
                Your Path — {completedCount} of {steps.length} complete
              </h3>
              <p className="text-xs text-muted-foreground">
                {inProgressCount > 0
                  ? `${inProgressCount} step${inProgressCount > 1 ? "s" : ""} in progress — pick up where you left off`
                  : "Personalized steps to get you earning"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCollapsed(!collapsed)}
              data-testid="button-toggle-onboarding"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
              data-testid="button-dismiss-onboarding"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Progress value={progressPercent} className="h-1.5 mb-4" data-testid="progress-onboarding" />

        {!collapsed && (
          <div className="space-y-4">
            {stepsByPhase.map((phaseGroup) => {
              const phaseComplete = phaseGroup.items.every(({ status }) => status === "completed");
              const readyCount = phaseGroup.items.filter(({ status }) => status === "ready").length;
              return (
                <div key={phaseGroup.phase}>
                  <div className="flex items-center gap-2 mb-2">
                    {phaseComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <div className={`h-2 w-2 rounded-full ${phaseGroup.dot}`} />
                    )}
                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                      phaseComplete ? "text-emerald-500 line-through" : phaseGroup.color
                    }`}>
                      {phaseGroup.label}
                    </span>
                    {readyCount > 1 && !phaseComplete && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30 ml-auto">
                        <Zap className="h-2.5 w-2.5 mr-0.5" />
                        {readyCount} can be done at once
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {phaseGroup.items.map(({ step, status }) => {
                      const isExpanded = status === "ready" || status === "in_progress";

                      return (
                        <div
                          key={step.id}
                          className={`rounded-lg border transition-all ${
                            status === "completed"
                              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : status === "in_progress"
                                ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm"
                                : status === "ready"
                                  ? "border-[#00A4E4]/40 bg-[#00A4E4]/5 shadow-sm"
                                  : "border-muted bg-muted/30 opacity-50"
                          } ${isExpanded ? "p-4" : "p-3"}`}
                          data-testid={`step-${step.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              status === "completed"
                                ? "bg-emerald-100 dark:bg-emerald-900/40"
                                : status === "in_progress"
                                  ? "bg-amber-100 dark:bg-amber-900/40"
                                  : status === "ready"
                                    ? "bg-[#00A4E4]/10"
                                    : "bg-muted"
                            }`}>
                              <StatusIcon status={status} step={step} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-medium ${
                                  status === "completed" ? "line-through text-muted-foreground" :
                                  status === "blocked" ? "text-muted-foreground" : ""
                                }`}>
                                  {step.title}
                                </span>
                                <StatusBadge status={status} />
                              </div>
                              {!isExpanded && (
                                <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                              )}
                            </div>

                            {status === "in_progress" && (
                              <Button
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 hidden sm:flex h-7 text-xs"
                                onClick={() => handleNavigate(step)}
                                data-testid={`button-continue-desktop-${step.id}`}
                              >
                                Continue
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="mt-3 ml-11">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                              {step.parallelWith && step.parallelWith.length > 0 && status !== "completed" && (
                                <p className="text-[11px] text-[#00A4E4] mt-1.5 flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  Can be done at the same time as: {step.parallelWith.map((id) => {
                                    const s = steps.find((x) => x.id === id);
                                    return s?.title || id;
                                  }).join(", ")}
                                </p>
                              )}
                              <StepActions
                                step={step}
                                status={status}
                                allSteps={steps}
                                onStatusChange={handleStatusChange}
                                onNavigate={handleNavigate}
                              />
                            </div>
                          )}

                          {status === "blocked" && (
                            <div className="mt-2 ml-11">
                              <StepActions
                                step={step}
                                status={status}
                                allSteps={steps}
                                onStatusChange={handleStatusChange}
                                onNavigate={handleNavigate}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="pt-1">
              <button
                onClick={handleResetQuiz}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline"
                data-testid="button-retake-quiz"
              >
                Retake setup quiz
              </button>
            </div>
          </div>
        )}

        {collapsed && focusStep && (
          <div
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              focusStatus === "in_progress"
                ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                : "border-[#00A4E4]/30 bg-[#00A4E4]/5 hover:bg-[#00A4E4]/10"
            }`}
            onClick={() => {
              if (focusStatus !== "in_progress") {
                handleStatusChange(focusStep.id, "in_progress");
              }
              handleNavigate(focusStep);
            }}
            data-testid="button-collapsed-step"
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={focusStatus || "ready"} step={focusStep} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{focusStep.title}</span>
                  <StatusBadge status={focusStatus || "ready"} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {focusStatus === "in_progress" ? "Pick up where you left off" : focusStep.subtitle}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
