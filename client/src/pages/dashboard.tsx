import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { PortfolioChart } from "@/components/portfolio-chart";
import { AllocationChart } from "@/components/allocation-chart";
import { TransactionsTable } from "@/components/transactions-table";
import { RecommendationsHub } from "@/components/recommendations-hub";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { 
  DollarSign, 
  TrendingUp, 
  Percent,
  Wallet,
  Plus,
  RefreshCw,
  Clock,
  AlertTriangle,
  Crown,
} from "lucide-react";
import { Link } from "wouter";
import type { Transaction } from "@shared/schema";

interface DashboardData {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  roi: number;
  assetCount: number;
  portfolioHistory: Array<{ date: string; value: number }>;
  allocation: Array<{ name: string; value: number; color: string }>;
  recentTransactions: Transaction[];
}

export default function Dashboard() {
  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: walletsData } = useQuery<any[]>({
    queryKey: ["/api/wallets"],
  });

  const { data: portfolioData } = useQuery<any>({
    queryKey: ["/api/portfolio"],
  });

  const { data: subStatus } = useQuery<{
    tier: string;
    paymentMethod: string | null;
    expiresAt: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    billingCycle: string | null;
  }>({
    queryKey: ["/api/subscription/status"],
  });

  const walletAddresses = (walletsData || []).map((w: any) => ({
    id: w.id,
    chain: w.chain,
    address: w.address,
    label: w.label,
    balances: (w.balances || []).map((b: any) => ({
      assetSymbol: b.assetSymbol,
      balance: b.balance,
      usdValue: b.usdValue || "0",
    })),
  }));

  const exchangeBalances = (portfolioData?.positions || [])
    .filter((p: any) => p.isExchange && parseFloat(p.quantity) > 0)
    .map((p: any) => ({
      provider: p.source || "Exchange",
      asset: p.assetSymbol || "",
      balance: parseFloat(p.quantity) || 0,
      usdValue: p.currentValue || 0,
    }));

  const hasData = walletAddresses.length > 0 || exchangeBalances.length > 0;


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Your portfolio overview at a glance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/transactions">
            <Button size="sm" data-testid="button-add-transaction">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      <OnboardingChecklist
        walletCount={walletAddresses.length}
        hasExchangeData={exchangeBalances.length > 0}
        hasXrplWallet={walletAddresses.some((w: any) => w.chain?.toLowerCase() === "xrpl" || w.chain?.toLowerCase() === "xrp")}
      />

      {subStatus?.paymentMethod === "crypto" && subStatus.daysRemaining !== null && subStatus.daysRemaining <= 7 && (
        <div
          className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
            subStatus.isExpired || subStatus.daysRemaining <= 0
              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              : subStatus.daysRemaining <= 3
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          }`}
          data-testid="banner-subscription-renewal"
        >
          <div className="flex items-start gap-3 flex-1">
            {subStatus.isExpired || subStatus.daysRemaining <= 0 ? (
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            ) : subStatus.daysRemaining <= 3 ? (
              <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <Crown className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-semibold ${
                subStatus.isExpired ? "text-red-800 dark:text-red-200" :
                subStatus.daysRemaining <= 3 ? "text-amber-800 dark:text-amber-200" :
                "text-blue-800 dark:text-blue-200"
              }`}>
                {subStatus.isExpired
                  ? "Your Premium subscription has expired"
                  : `Premium expires in ${subStatus.daysRemaining} day${subStatus.daysRemaining === 1 ? "" : "s"}`
                }
              </p>
              <p className={`text-xs mt-0.5 ${
                subStatus.isExpired ? "text-red-700 dark:text-red-300" :
                subStatus.daysRemaining <= 3 ? "text-amber-700 dark:text-amber-300" :
                "text-blue-700 dark:text-blue-300"
              }`}>
                {subStatus.isExpired
                  ? "Renew now to restore your premium features."
                  : "Check your Xaman wallet for a renewal request, or renew from Settings."
                }
              </p>
            </div>
          </div>
          <Link href="/settings">
            <Button
              size="sm"
              className={
                subStatus.isExpired
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : subStatus.daysRemaining <= 3
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : ""
              }
              data-testid="button-renew-subscription"
            >
              <Crown className="h-4 w-4 mr-1.5" />
              Renew Now
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          title="Total Portfolio Value"
          value={data ? formatCurrency(data.totalValue) : "$0.00"}
          change={data?.dayChangePercent}
          changeLabel="24h"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="24h Change"
          value={data ? formatCurrency(data.dayChange) : "$0.00"}
          change={data?.dayChangePercent}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Gain/Loss"
          value={data ? formatCurrency(data.totalGainLoss) : "$0.00"}
          change={data?.totalGainLossPercent}
          changeLabel="all time"
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Assets"
          value={data?.assetCount?.toString() || "0"}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <PortfolioChart
          data={data?.portfolioHistory || []}
          isLoading={isLoading}
        />
        <AllocationChart
          data={data?.allocation || []}
          isLoading={isLoading}
        />
      </div>

      {hasData && (
        <RecommendationsHub
          addresses={walletAddresses}
          exchangeBalances={exchangeBalances}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Recent Transactions</CardTitle>
          <Link href="/transactions">
            <Button variant="ghost" size="sm" data-testid="link-view-all-transactions">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <TransactionsTable
            transactions={data?.recentTransactions || []}
            isLoading={isLoading}
            limit={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
