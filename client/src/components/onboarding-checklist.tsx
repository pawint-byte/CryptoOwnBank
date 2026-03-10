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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useXrplStore } from "@/lib/xrpl-store";

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  href: string;
  icon: typeof Sprout;
  iconColor: string;
  completed: boolean;
  onClick?: () => void;
}

function storageKey(base: string): string {
  return base;
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
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(storageKey("onboarding-dismissed")) === "true";
  });
  const [recsViewed, setRecsViewed] = useState(() => {
    return localStorage.getItem(storageKey("recommendations-viewed")) === "true";
  });

  const markRecommendationsViewed = useCallback(() => {
    localStorage.setItem(storageKey("recommendations-viewed"), "true");
    setRecsViewed(true);
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: "earn_yield",
      title: "Start Earning Yield",
      subtitle: "Make money first",
      description:
        "Connect your XRPL wallet (Xaman or Ledger) and deposit RLUSD into a Soil vault. Earn 5\u20138% fixed APR \u2014 backed by real-world assets, fully non-custodial.",
      cta: "Connect Wallet & Earn",
      href: "/ownbank",
      icon: Sprout,
      iconColor: "text-emerald-500",
      completed: vaultDeposits.length > 0 || (walletAddress !== null && isConnected) || hasXrplWallet === true,
    },
    {
      id: "add_wallets",
      title: "Add Your Wallet Addresses",
      subtitle: "Show us what you hold",
      description:
        "Paste your cold wallet addresses (Ledger, ELLIPAL, Cypherock, etc.) across 24 blockchains. We\u2019ll pull balances and transaction history \u2014 read-only, no keys needed.",
      cta: "Add Wallet Addresses",
      href: "/wallets",
      icon: Wallet,
      iconColor: "text-blue-500",
      completed: walletCount >= 1 || hasExchangeData,
    },
    {
      id: "get_evaluated",
      title: "Get Your Portfolio Evaluated",
      subtitle: "See what you're missing",
      description:
        "Our Recommendations Hub analyzes every asset you hold and shows you exactly where you\u2019re leaving money on the table \u2014 better staking rates, on-chain yield, and optimization opportunities.",
      cta: "View Recommendations",
      href: "/",
      icon: BarChart3,
      iconColor: "text-amber-500",
      completed: (walletCount >= 1 || hasExchangeData) && recsViewed,
      onClick: markRecommendationsViewed,
    },
    {
      id: "go_premium",
      title: "Unlock Full Power",
      subtitle: "Unlimited everything",
      description:
        "Go Premium to unlock unlimited wallets, full Recommendations Hub with staking guides, portfolio search/filter/sort, unlimited alerts, and tax reports. Pay with crypto \u2014 it\u2019s our preferred method.",
      cta: "Upgrade to Premium",
      href: "/settings",
      icon: Crown,
      iconColor: "text-amber-500",
      completed: subscriptionTier === "premium",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;
  const progressPercent = (completedCount / steps.length) * 100;

  const currentStepIndex = steps.findIndex((s) => !s.completed);
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  useEffect(() => {
    if (allDone && !dismissed) {
      setDismissed(true);
      localStorage.setItem(storageKey("onboarding-dismissed"), "true");
    }
  }, [allDone, dismissed]);

  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey("onboarding-dismissed"), "true");
  };

  const handleStepClick = (step: OnboardingStep) => {
    if (step.onClick) step.onClick();
    setLocation(step.href);
  };

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
                Get Started — {completedCount} of {steps.length} complete
              </h3>
              <p className="text-xs text-muted-foreground">
                Follow these steps to get the most out of CryptoOwnBank
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
          <div className="space-y-2">
            {steps.map((step, i) => {
              const isCurrent = i === currentStepIndex;
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
        )}

        {collapsed && currentStep && (
          <div
            className="flex items-center justify-between p-3 rounded-lg border border-[#00A4E4]/30 bg-[#00A4E4]/5 cursor-pointer hover:bg-[#00A4E4]/10 transition-colors"
            onClick={() => handleStepClick(currentStep)}
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
