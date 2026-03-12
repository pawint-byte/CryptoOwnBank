import { Lock, Crown, Check, CalendarClock, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface UpgradePromptProps {
  feature: string;
  compact?: boolean;
  variant?: "premium" | "annual" | "pro" | "addon";
  addonName?: string;
}

const PREMIUM_BENEFITS = [
  "Unlimited exchange connections",
  "Unlimited blockchain addresses across 24 chains",
  "Full Recommendations Hub — Best in Class, staking guides, DeFi comparisons",
  "Wallet-specific staking guides for your exact hardware wallet",
  "Portfolio search, filter & sort",
  "Full transaction history (all time)",
  "CSV import (Yahoo Finance, CoinTracker)",
  "Unlimited price alerts",
  "Auto-withdrawal from Soil vaults",
  "Statement Insights with rate comparisons",
  "Recurring payments (personal)",
];

const ANNUAL_BENEFITS = [
  "Complete tax reports (CSV + PDF + TurboTax)",
  "Capital gains & losses calculation",
  "IRS Form 8949 / Schedule D guidance",
  "TurboTax-ready export",
  "Income tracking for staking & yield",
  "Save $149/yr vs monthly billing",
];

const PRO_BENEFITS = [
  "Everything in Premium",
  "DeFi Borrowing Hub — Aave, Compound, Maple, MakerDAO",
  "Real Estate Tokenization directory — RealT, Lofty, Propy",
  "Batch & payroll recurring payments",
  "Treasury dashboard for business wallets",
  "Up to 5 team member seats",
  "XLS-66 Lending (coming Q2 2026)",
];

const ADDON_BENEFITS = [
  "No full plan upgrade required",
  "Pay only for what you need",
  "Cancel anytime — monthly billing",
];

export function UpgradePrompt({ feature, compact = false, variant = "premium", addonName }: UpgradePromptProps) {
  const isAnnual = variant === "annual";
  const isPro = variant === "pro";
  const isAddon = variant === "addon";
  const benefits = isAddon ? ADDON_BENEFITS : isPro ? PRO_BENEFITS : isAnnual ? ANNUAL_BENEFITS : PREMIUM_BENEFITS;
  const title = isAddon ? "Add-On Available" : isPro ? "Pro Feature" : isAnnual ? "Annual Plan Feature" : "Premium Feature";
  const buttonText = isAddon
    ? `Get ${addonName || "Add-On"}`
    : isPro ? "Upgrade to Pro — $99/mo" : isAnnual ? "Switch to Annual — $199/yr" : "Upgrade to Premium — $29/mo";
  const Icon = isAddon ? Plus : isPro ? Building2 : isAnnual ? CalendarClock : Lock;
  const borderColor = isAddon ? "border-blue-200 dark:border-blue-800" : "border-amber-200 dark:border-amber-800";
  const bgColor = isAddon ? "bg-blue-50 dark:bg-blue-950/20" : "bg-amber-50 dark:bg-amber-950/20";
  const textColor = isAddon ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400";
  const headingColor = isAddon ? "text-blue-900 dark:text-blue-200" : "text-amber-900 dark:text-amber-200";

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-md border ${borderColor} ${bgColor} px-4 py-2.5`}
        data-testid="upgrade-prompt"
      >
        <Icon className={`h-4 w-4 ${textColor} shrink-0`} />
        <span className={`text-sm ${headingColor} flex-1`}>{feature}</span>
        <Button size="sm" asChild data-testid="button-upgrade">
          <Link href="/settings">
            {isAddon ? <Plus className="h-3.5 w-3.5 mr-1.5" /> : <Crown className="h-3.5 w-3.5 mr-1.5" />}
            {isAddon ? "Get Add-On" : isAnnual ? "Go Annual" : "Upgrade"}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Card
      className={`${borderColor} ${bgColor}`}
      data-testid="upgrade-prompt"
    >
      <CardContent className="flex flex-col items-center text-center py-8 px-6">
        <div className={`h-12 w-12 rounded-full ${isAddon ? "bg-blue-100 dark:bg-blue-900/40" : "bg-amber-100 dark:bg-amber-900/40"} flex items-center justify-center mb-4`}>
          <Icon className={`h-6 w-6 ${textColor}`} />
        </div>
        <h3 className={`text-lg font-semibold ${headingColor} mb-1`}>
          {title}
        </h3>
        <p className={`text-sm ${isAddon ? "text-blue-800 dark:text-blue-300" : "text-amber-800 dark:text-amber-300"} mb-4 max-w-md`}>
          {feature}
        </p>
        <ul className={`text-left text-sm space-y-1.5 mb-6 ${headingColor}`}>
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className={`h-4 w-4 mt-0.5 ${textColor} shrink-0`} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button asChild data-testid="button-upgrade">
          <Link href="/settings">
            {isAddon ? <Plus className="h-4 w-4 mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
            {buttonText}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
