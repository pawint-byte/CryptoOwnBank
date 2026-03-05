import { Lock, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface UpgradePromptProps {
  feature: string;
  compact?: boolean;
}

const PREMIUM_BENEFITS = [
  "Unlimited exchange connections",
  "Unlimited cold wallets",
  "Full transaction history (all time)",
  "CSV import (Yahoo Finance, CoinTracker)",
  "Complete tax reports (CSV + PDF + TurboTax)",
  "Unlimited price alerts",
  "Auto-withdrawal from Soil vaults",
  "Portfolio analytics across all sources",
];

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5"
        data-testid="upgrade-prompt"
      >
        <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-sm text-amber-900 dark:text-amber-200 flex-1">{feature}</span>
        <Button size="sm" asChild data-testid="button-upgrade">
          <Link href="/settings">
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            Upgrade
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Card
      className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
      data-testid="upgrade-prompt"
    >
      <CardContent className="flex flex-col items-center text-center py-8 px-6">
        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-1">
          Premium Feature
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-300 mb-4 max-w-md">
          {feature}
        </p>
        <ul className="text-left text-sm space-y-1.5 mb-6 text-amber-900 dark:text-amber-200">
          {PREMIUM_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button asChild data-testid="button-upgrade">
          <Link href="/settings">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium — $9/mo
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
