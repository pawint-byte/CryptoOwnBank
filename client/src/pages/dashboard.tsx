import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { PortfolioChart } from "@/components/portfolio-chart";
import { AllocationChart } from "@/components/allocation-chart";
import { TransactionsTable } from "@/components/transactions-table";
import { RecommendationsHub } from "@/components/recommendations-hub";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { YieldEarningsTracker } from "@/components/yield-earnings-tracker";
import { useXrplStore } from "@/lib/xrpl-store";
import { apiRequest } from "@/lib/queryClient";
import { useUserData } from "@/hooks/use-user-data";
import { KeyRound } from "lucide-react";
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
  Landmark,
  ArrowRight,
  FileText,
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

  const { vaultDeposits } = useXrplStore();

  const [soilSummary, setSoilSummary] = useState<{
    currentPrincipal: string;
    calculatedInterest: string;
    weightedApr?: string;
    firstDepositDate: string | null;
    vaults?: Array<{ principal: string; apr: string }>;
  } | null>(null);
  const [soilSynced, setSoilSynced] = useState(false);

  const xrplWallet = walletAddresses.find((w: any) => w.chain?.toLowerCase() === "xrpl" || w.chain?.toLowerCase() === "xrp");

  const syncSoilForDashboard = useCallback(async () => {
    if (!xrplWallet?.address) return;
    try {
      const response = await apiRequest("POST", "/api/soil/sync", {
        walletAddress: xrplWallet.address,
        walletType: "xumm",
      });
      const result = await response.json();
      if (result.success && result.summary && parseFloat(result.summary.currentPrincipal) > 0) {
        setSoilSummary(result.summary);
      }
    } catch {
    } finally {
      setSoilSynced(true);
    }
  }, [xrplWallet?.address]);

  useEffect(() => {
    if (xrplWallet?.address && !soilSynced) {
      syncSoilForDashboard();
    }
  }, [xrplWallet?.address, soilSynced, syncSoilForDashboard]);

  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const downloadStatement = async () => {
    setDownloadingStatement(true);
    try {
      const res = await fetch("/api/portfolio/statement", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to generate statement" }));
        if (err.code === "PROFILE_INCOMPLETE") {
          if (confirm(err.message + "\n\nGo to Settings now?")) {
            window.location.href = "/settings";
          }
          return;
        }
        throw new Error(err.message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CryptoOwnBank-Statement-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to generate statement");
    } finally {
      setDownloadingStatement(false);
    }
  };

  const hasData = walletAddresses.length > 0 || exchangeBalances.length > 0;

  const RWA_TOKENS = ["USDY", "OUSG", "DROP", "TIN", "MPL", "SOIL"];

  const rwaPositions = walletAddresses.flatMap((w: any) =>
    (w.balances || []).filter((b: any) =>
      RWA_TOKENS.some((t) => b.assetSymbol?.toUpperCase()?.includes(t))
    )
  );

  const rwaTotal = rwaPositions.reduce(
    (sum: number, b: any) => sum + (parseFloat(b.usdValue) || 0),
    0
  );

  const hasRwaPositions = rwaPositions.length > 0 && rwaTotal > 0;

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
            Your crypto holdings at a glance
          </p>
        </div>
        <div className="flex gap-2">
          {subStatus && subStatus.tier !== "free" && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadStatement}
              disabled={downloadingStatement}
              data-testid="button-download-statement-dashboard"
            >
              <FileText className={`h-4 w-4 mr-2 ${downloadingStatement ? "animate-pulse" : ""}`} />
              {downloadingStatement ? "Generating..." : "Statement"}
            </Button>
          )}
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

      <SovereigntyReminderBanner hasWallets={(walletsData?.length ?? 0) > 0} />

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
          title="Total Crypto Holdings"
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

      <YieldEarningsTracker vaultDeposits={vaultDeposits} soilSummary={soilSummary} />

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

      <Card data-testid="card-rwa-discovery">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          {hasRwaPositions ? (
            <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold" data-testid="text-rwa-title">RWA Yield Positions</p>
                <p className="text-xs text-muted-foreground" data-testid="text-rwa-value">
                  Estimated value: {formatCurrency(rwaTotal)} across {rwaPositions.length} token{rwaPositions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Link href="/rwa-yields">
                <Button variant="outline" size="sm" data-testid="link-rwa-positions">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold" data-testid="text-rwa-title">Real-World Asset Yields</p>
                <p className="text-xs text-muted-foreground" data-testid="text-rwa-description">
                  Earn 5-8% on treasuries, real estate, and trade finance
                </p>
              </div>
              <Link href="/rwa-yields">
                <Button variant="outline" size="sm" data-testid="link-explore-rwa">
                  Explore Earn & Yield
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

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

function SovereigntyReminderBanner({ hasWallets }: { hasWallets: boolean }) {
  const { data: acknowledgedAt, isLoading } = useUserData<string | null>(
    "sovereignty_acknowledged_at",
    null,
  );
  if (isLoading || acknowledgedAt || !hasWallets) return null;
  return (
    <Link href="/sovereignty">
      <div
        className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3 hover-elevate cursor-pointer"
        data-testid="banner-sovereignty-reminder"
      >
        <KeyRound className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-sm">Take 30 seconds: confirm you understand self-custody</div>
          <div className="text-xs text-muted-foreground mt-1">
            You have wallets but haven't done the one-time sovereignty acknowledgement yet. It's the foundation everything else here stands on.
          </div>
        </div>
        <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex-shrink-0 mt-0.5">
          Open →
        </div>
      </div>
    </Link>
  );
}
