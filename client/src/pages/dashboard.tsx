import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { PortfolioChart } from "@/components/portfolio-chart";
import { AllocationChart } from "@/components/allocation-chart";
import { TransactionsTable } from "@/components/transactions-table";
import { RecommendationsHub } from "@/components/recommendations-hub";
import { 
  DollarSign, 
  TrendingUp, 
  Percent,
  Wallet,
  Plus,
  RefreshCw
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
