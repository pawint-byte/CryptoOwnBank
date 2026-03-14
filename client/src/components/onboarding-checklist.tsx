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
  CircleDollarSign,
  ClipboardList,
  Building2,
  Link2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useXrplStore } from "@/lib/xrpl-store";

interface UserInventory {
  ownsCrypto: "exchange" | "wallet" | "both" | "none" | null;
  hasColdWallet: boolean | null;
  hasHotWallet: boolean | null;
}

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
  completed: boolean;
  onClick?: () => void;
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  foundation: { label: "Set Up Your Foundation", color: "text-blue-500" },
  connect: { label: "Connect Your Assets", color: "text-amber-500" },
  earn: { label: "Start Earning", color: "text-emerald-500" },
};

function getStoredInventory(): UserInventory | null {
  const raw = localStorage.getItem("onboarding-inventory");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeInventory(inv: UserInventory) {
  localStorage.setItem("onboarding-inventory", JSON.stringify(inv));
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
      completed: false,
    });
  }

  if (needsHotWallet) {
    steps.push({
      id: "get_hot_wallet",
      phase: "foundation",
      title: "Download Xaman Wallet",
      subtitle: "Sign transactions on the go",
      description:
        "Xaman is the mobile wallet for XRPL. You'll use it to connect to CryptoOwnBank and sign vault deposits/withdrawals. Your cold wallet holds the keys — Xaman is just the interface.",
      cta: "Set Up Xaman",
      href: "/setup-guide",
      icon: Smartphone,
      iconColor: "text-blue-500",
      completed: false,
    });
  }

  if (hasCryptoInWallet || inventory.hasColdWallet) {
    steps.push({
      id: "add_wallets",
      phase: "connect",
      title: "Add Your Wallet Addresses",
      subtitle: "See all your holdings in one place",
      description:
        "Paste your cold wallet addresses across 24+ blockchains. We pull balances and history — read-only, no keys needed. This is how we show you everything you own.",
      cta: "Add Wallet Addresses",
      href: "/wallets",
      icon: Wallet,
      iconColor: "text-amber-500",
      completed: liveState.walletCount >= 1,
    });
  }

  if (hasCryptoOnExchange) {
    steps.push({
      id: "add_exchange",
      phase: "connect",
      title: "Connect Your Exchange",
      subtitle: "Track exchange balances automatically",
      description:
        "Connect Coinbase, Binance, Kraken, or other exchanges with a read-only API key. We'll pull your balances and transaction history so you can see everything in one dashboard.",
      cta: "Connect Exchange",
      href: "/integrations",
      icon: Building2,
      iconColor: "text-amber-500",
      completed: liveState.hasExchangeData,
    });
  }

  if (hasNoCrypto) {
    steps.push({
      id: "add_wallets_new",
      phase: "connect",
      title: "Add a Wallet Address",
      subtitle: "Once you get crypto, add your address here",
      description:
        "After you acquire your first crypto and set up a wallet, paste the address here. We'll track your balances and transactions automatically across 24+ blockchains.",
      cta: "Add Wallet Address",
      href: "/wallets",
      icon: Wallet,
      iconColor: "text-amber-500",
      completed: liveState.walletCount >= 1 || liveState.hasExchangeData,
    });
  }

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
    completed: liveState.isXrplConnected || liveState.hasXrplWallet,
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
    completed: liveState.hasVaultDeposits,
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
    completed: (liveState.walletCount >= 1 || liveState.hasExchangeData) && liveState.recsViewed,
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
    completed: liveState.subscriptionTier === "premium" || liveState.subscriptionTier === "pro",
  });

  return steps;
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
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("onboarding-dismissed") === "true";
  });
  const [recsViewed, setRecsViewed] = useState(() => {
    return localStorage.getItem("recommendations-viewed") === "true";
  });

  const markRecsViewed = useCallback(() => {
    localStorage.setItem("recommendations-viewed", "true");
    setRecsViewed(true);
  }, []);

  const handleQuizComplete = (inv: UserInventory) => {
    setInventory(inv);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("onboarding-dismissed", "true");
  };

  const handleResetQuiz = () => {
    localStorage.removeItem("onboarding-inventory");
    setInventory(null);
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
    markRecsViewed: markRecsViewed,
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;
  const progressPercent = (completedCount / steps.length) * 100;
  const currentStepIndex = steps.findIndex((s) => !s.completed);
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  if (allDone) return null;

  const handleStepClick = (step: OnboardingStep) => {
    if (step.onClick) step.onClick();
    setLocation(step.href);
  };

  const phases = ["foundation", "connect", "earn"] as const;
  const stepsByPhase = phases
    .map((phase) => ({
      phase,
      ...PHASE_LABELS[phase],
      steps: steps.filter((s) => s.phase === phase),
    }))
    .filter((p) => p.steps.length > 0);

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
                Personalized steps to get you earning
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
              const phaseCompleted = phaseGroup.steps.every((s) => s.completed);
              return (
                <div key={phaseGroup.phase}>
                  <div className="flex items-center gap-2 mb-2">
                    {phaseCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <div className={`h-2 w-2 rounded-full ${
                        phaseGroup.phase === "foundation" ? "bg-blue-500" :
                        phaseGroup.phase === "connect" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                    )}
                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                      phaseCompleted ? "text-emerald-500 line-through" : phaseGroup.color
                    }`}>
                      {phaseGroup.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {phaseGroup.steps.map((step) => {
                      const isCurrent = steps.indexOf(step) === currentStepIndex;
                      const isPast = step.completed;

                      return (
                        <div
                          key={step.id}
                          className={`rounded-lg border transition-all ${
                            isCurrent
                              ? "border-[#00A4E4]/40 bg-[#00A4E4]/5 shadow-sm"
                              : isPast
                                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                                : "border-muted bg-muted/30 opacity-60"
                          } ${isCurrent ? "p-4" : "p-3"}`}
                          data-testid={`step-${step.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              isPast
                                ? "bg-emerald-100 dark:bg-emerald-900/40"
                                : isCurrent
                                  ? "bg-[#00A4E4]/10"
                                  : "bg-muted"
                            }`}>
                              {isPast ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <step.icon className={`h-4 w-4 ${isCurrent ? step.iconColor : "text-muted-foreground"}`} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${isPast ? "line-through text-muted-foreground" : ""}`}>
                                  {step.title}
                                </span>
                                {isCurrent && (
                                  <Badge className="bg-[#00A4E4] text-[10px] px-1.5 py-0">Next</Badge>
                                )}
                                {isPast && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">Done</Badge>
                                )}
                              </div>
                              {!isCurrent && (
                                <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                              )}
                            </div>

                            {isCurrent && (
                              <Button
                                size="sm"
                                className="bg-[#00A4E4] hover:bg-[#0090c9] text-white shrink-0 hidden sm:flex"
                                onClick={() => handleStepClick(step)}
                                data-testid={`button-${step.id}`}
                              >
                                {step.cta}
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>

                          {isCurrent && (
                            <div className="mt-3 ml-11">
                              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                {step.description}
                              </p>
                              <Button
                                size="sm"
                                className="bg-[#00A4E4] hover:bg-[#0090c9] text-white w-full sm:hidden"
                                onClick={() => handleStepClick(step)}
                                data-testid={`button-${step.id}-mobile`}
                              >
                                {step.cta}
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
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

        {collapsed && currentStep && (
          <div
            className="flex items-center justify-between p-3 rounded-lg border border-[#00A4E4]/30 bg-[#00A4E4]/5 cursor-pointer hover:bg-[#00A4E4]/10 transition-colors"
            onClick={() => handleStepClick(currentStep)}
            data-testid="button-collapsed-step"
          >
            <div className="flex items-center gap-3">
              <currentStep.icon className={`h-4 w-4 ${currentStep.iconColor}`} />
              <div>
                <span className="text-sm font-medium">{currentStep.title}</span>
                <p className="text-xs text-muted-foreground">{currentStep.subtitle}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
