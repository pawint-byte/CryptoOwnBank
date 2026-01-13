import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationChart } from "@/components/allocation-chart";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Position } from "@shared/schema";

interface PositionWithMarket extends Position {
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}

interface PortfolioData {
  positions: PositionWithMarket[];
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  allocation: Array<{ name: string; value: number; color: string }>;
}

export default function Portfolio() {
  const { data, isLoading } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const positions = data?.positions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground">
          Your holdings and performance breakdown
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(data?.totalValue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cost Basis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(data?.totalCostBasis || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unrealized Gain/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold font-mono",
                (data?.totalGainLoss || 0) > 0 && "text-chart-2",
                (data?.totalGainLoss || 0) < 0 && "text-destructive"
              )}
            >
              {formatCurrency(data?.totalGainLoss || 0)}
              <span className="text-sm ml-2">
                ({(data?.totalGainLossPercent || 0).toFixed(2)}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <svg
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">No holdings yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add transactions to see your portfolio here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`position-${position.assetSymbol}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {position.assetSymbol.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{position.assetSymbol}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {parseFloat(position.quantity).toFixed(6)} units
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-medium">
                        {formatCurrency(position.currentValue || 0)}
                      </div>
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 text-sm",
                          (position.gainLossPercent || 0) > 0 && "text-chart-2",
                          (position.gainLossPercent || 0) < 0 && "text-destructive",
                          (position.gainLossPercent || 0) === 0 && "text-muted-foreground"
                        )}
                      >
                        {(position.gainLossPercent || 0) > 0 && <TrendingUp className="h-3 w-3" />}
                        {(position.gainLossPercent || 0) < 0 && <TrendingDown className="h-3 w-3" />}
                        {(position.gainLossPercent || 0) === 0 && <Minus className="h-3 w-3" />}
                        <span>
                          {(position.gainLossPercent || 0) > 0 && "+"}
                          {(position.gainLossPercent || 0).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AllocationChart data={data?.allocation || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
