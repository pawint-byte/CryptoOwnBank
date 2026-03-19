import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, CalendarDays, Target, ChevronDown, ChevronUp } from "lucide-react";
import { calculateAccruedInterest } from "@/lib/xrpl-client";
import type { VaultDeposit } from "@/lib/xrpl-store";

interface YieldEarningsTrackerProps {
  vaultDeposits: VaultDeposit[];
  soilSummary?: {
    currentPrincipal: string;
    calculatedInterest: string;
    weightedApr?: string;
    firstDepositDate: string | null;
    vaults?: Array<{ principal: string; apr: string }>;
  } | null;
  compact?: boolean;
}

function getWeightedApr(vaultDeposits: VaultDeposit[]): number {
  const totalPrincipal = vaultDeposits.reduce((sum, d) => sum + d.principal, 0);
  if (totalPrincipal === 0) return 0;
  return vaultDeposits.reduce((sum, d) => sum + d.principal * d.apr, 0) / totalPrincipal;
}

function computeCompoundProjection(principal: number, apr: number, years: number): number {
  if (principal <= 0 || apr <= 0) return 0;
  const rate = apr / 100;
  const n = 12;
  return principal * Math.pow(1 + rate / n, n * years) - principal;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 100_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function YieldEarningsTracker({ vaultDeposits, soilSummary, compact }: YieldEarningsTrackerProps) {
  const [tick, setTick] = useState(0);
  const [showProjections, setShowProjections] = useState(true);
  const prevEarnings = useRef<{ today: number; month: number; allTime: number }>({ today: 0, month: 0, allTime: 0 });
  const [animating, setAnimating] = useState<{ today: boolean; month: boolean; allTime: boolean }>({ today: false, month: false, allTime: false });

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const hasDeposits = vaultDeposits.length > 0 && vaultDeposits.some((d) => d.principal > 0);
  if (!hasDeposits) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayInterest = 0;
  let thisMonthInterest = 0;
  let allTimeInterest = 0;

  for (const dep of vaultDeposits) {
    const totalInterest = calculateAccruedInterest(dep.principal, dep.apr, dep.depositDate);
    allTimeInterest += totalInterest;

    const depositDate = new Date(dep.depositDate);
    const dailyRate = dep.principal * (dep.apr / 100) / 365;

    if (depositDate < startOfDay) {
      const hoursToday = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      todayInterest += dailyRate * (hoursToday / 24);
    } else if (depositDate >= startOfDay) {
      const hoursSinceDeposit = (now.getTime() - depositDate.getTime()) / (1000 * 60 * 60);
      todayInterest += dailyRate * (hoursSinceDeposit / 24);
    }

    if (depositDate < startOfMonth) {
      const daysThisMonth = (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24);
      thisMonthInterest += dailyRate * daysThisMonth;
    } else {
      thisMonthInterest += totalInterest;
    }
  }

  const totalPrincipal = vaultDeposits.reduce((sum, d) => sum + d.principal, 0);
  const weightedApr = getWeightedApr(vaultDeposits);

  const proj1y = computeCompoundProjection(totalPrincipal, weightedApr, 1);
  const proj5y = computeCompoundProjection(totalPrincipal, weightedApr, 5);
  const proj10y = computeCompoundProjection(totalPrincipal, weightedApr, 10);

  useEffect(() => {
    const prev = prevEarnings.current;
    const newAnimating = {
      today: prev.today !== 0 && Math.abs(todayInterest - prev.today) > 0.001,
      month: prev.month !== 0 && Math.abs(thisMonthInterest - prev.month) > 0.001,
      allTime: prev.allTime !== 0 && Math.abs(allTimeInterest - prev.allTime) > 0.001,
    };
    setAnimating(newAnimating);
    prevEarnings.current = { today: todayInterest, month: thisMonthInterest, allTime: allTimeInterest };

    if (newAnimating.today || newAnimating.month || newAnimating.allTime) {
      const timer = setTimeout(() => setAnimating({ today: false, month: false, allTime: false }), 600);
      return () => clearTimeout(timer);
    }
  }, [tick, todayInterest, thisMonthInterest, allTimeInterest]);

  const earnPerSecond = totalPrincipal * (weightedApr / 100) / 365 / 86400;

  return (
    <Card
      className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-emerald-500/[0.02] to-transparent overflow-hidden"
      data-testid="card-yield-earnings-tracker"
    >
      <CardContent className={compact ? "py-4 px-3 sm:px-4" : "py-5 px-4 sm:px-6"}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold" data-testid="text-yield-tracker-title">
                Yield Earnings
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatUsd(totalPrincipal)} earning {weightedApr.toFixed(1)}% APR — you keep 100%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              +{formatUsd(earnPerSecond)}/sec
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border bg-card/50 p-2.5 sm:p-3 text-center" data-testid="earnings-today">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">Today</p>
            </div>
            <p
              className={`text-sm sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 transition-all duration-500 ${
                animating.today ? "scale-105" : ""
              }`}
              data-testid="text-earnings-today"
            >
              {formatUsd(todayInterest)}
            </p>
          </div>
          <div className="rounded-lg border bg-card/50 p-2.5 sm:p-3 text-center" data-testid="earnings-month">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">This Month</p>
            </div>
            <p
              className={`text-sm sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 transition-all duration-500 ${
                animating.month ? "scale-105" : ""
              }`}
              data-testid="text-earnings-month"
            >
              {formatUsd(thisMonthInterest)}
            </p>
          </div>
          <div className="rounded-lg border bg-card/50 p-2.5 sm:p-3 text-center" data-testid="earnings-alltime">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">All Time</p>
            </div>
            <p
              className={`text-sm sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 transition-all duration-500 ${
                animating.allTime ? "scale-105" : ""
              }`}
              data-testid="text-earnings-alltime"
            >
              {formatUsd(allTimeInterest)}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={() => setShowProjections(!showProjections)}
            className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
            data-testid="button-toggle-projections"
          >
            <Target className="h-3 w-3" />
            <span>Compound Projections</span>
            {showProjections ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showProjections && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
              <div className="rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/[0.03] p-2.5 sm:p-3 text-center" data-testid="projection-1y">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">1 Year</p>
                <p className="text-xs sm:text-base font-bold font-mono text-emerald-600/80 dark:text-emerald-400/80" data-testid="text-projection-1y">
                  +{formatUsd(proj1y)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/70">
                  {formatUsd(totalPrincipal + proj1y)} total
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/[0.03] p-2.5 sm:p-3 text-center" data-testid="projection-5y">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">5 Years</p>
                <p className="text-xs sm:text-base font-bold font-mono text-emerald-600/80 dark:text-emerald-400/80" data-testid="text-projection-5y">
                  +{formatUsd(proj5y)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/70">
                  {formatUsd(totalPrincipal + proj5y)} total
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/[0.03] p-2.5 sm:p-3 text-center" data-testid="projection-10y">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">10 Years</p>
                <p className="text-xs sm:text-base font-bold font-mono text-emerald-600/80 dark:text-emerald-400/80" data-testid="text-projection-10y">
                  +{formatUsd(proj10y)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/70">
                  {formatUsd(totalPrincipal + proj10y)} total
                </p>
              </div>
            </div>
          )}

          <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 text-center mt-2">
            Projections assume monthly compounding at current APR with reinvested earnings · No platform fees — all yield is yours
          </p>
        </div>
      </CardContent>
    </Card>
  );
}