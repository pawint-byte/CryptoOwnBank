import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AllocationChart } from "@/components/allocation-chart";
import { TrendingUp, TrendingDown, Minus, Trash2, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Position } from "@shared/schema";

interface PositionWithMarket extends Position {
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  source?: string;
  isImport?: boolean;
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  const { data, isLoading } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio"],
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const res = await apiRequest("DELETE", `/api/positions/${positionId}`);
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: result.message });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove position", description: error.message, variant: "destructive" });
    },
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

  const allPositions = data?.positions || [];

  const uniqueSources = [...new Set(allPositions.map(p => p.source).filter(Boolean))] as string[];

  let filtered = allPositions.filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!p.assetSymbol.toLowerCase().includes(term) && !(p.source || "").toLowerCase().includes(term)) {
        return false;
      }
    }
    if (sourceFilter !== "all") {
      if (sourceFilter === "imports" && !p.isImport) return false;
      if (sourceFilter === "exchanges" && p.isImport) return false;
      if (sourceFilter !== "imports" && sourceFilter !== "exchanges" && p.source !== sourceFilter) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === "name") {
      const cmp = a.assetSymbol.localeCompare(b.assetSymbol);
      if (cmp !== 0) return cmp;
      return (a.isImport ? 1 : 0) - (b.isImport ? 1 : 0);
    }
    if (sortBy === "value") return (b.currentValue || 0) - (a.currentValue || 0);
    if (sortBy === "gainloss") return (b.gainLoss || 0) - (a.gainLoss || 0);
    if (sortBy === "quantity") return parseFloat(b.quantity) - parseFloat(a.quantity);
    return 0;
  });

  const symbolCounts = new Map<string, number>();
  filtered.forEach(p => symbolCounts.set(p.assetSymbol, (symbolCounts.get(p.assetSymbol) || 0) + 1));
  const duplicateSymbols = new Set<string>();
  symbolCounts.forEach((count, symbol) => { if (count > 1) duplicateSymbols.add(symbol); });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-portfolio">Portfolio</h1>
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
            <div className="text-2xl font-bold font-mono" data-testid="text-total-value">
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
            <div className="text-2xl font-bold font-mono" data-testid="text-cost-basis">
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
              data-testid="text-gain-loss"
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Holdings ({filtered.length})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-40 pl-8 text-sm"
                    data-testid="input-search-portfolio"
                  />
                </div>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-9 w-36 text-sm" data-testid="select-source-filter">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="imports">Imports Only</SelectItem>
                    <SelectItem value="exchanges">Exchanges Only</SelectItem>
                    {uniqueSources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 w-32 text-sm" data-testid="select-sort-by">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">By Name</SelectItem>
                    <SelectItem value="value">By Value</SelectItem>
                    <SelectItem value="gainloss">By Gain/Loss</SelectItem>
                    <SelectItem value="quantity">By Quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
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
                <h3 className="text-lg font-medium">
                  {searchTerm || sourceFilter !== "all" ? "No matching holdings" : "No holdings yet"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm || sourceFilter !== "all"
                    ? "Try adjusting your search or filter."
                    : "Add transactions to see your portfolio here."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((position, idx) => {
                  const isDupe = duplicateSymbols.has(position.assetSymbol);
                  const isFirstOfGroup = sortBy === "name" && (idx === 0 || filtered[idx - 1].assetSymbol !== position.assetSymbol);

                  return (
                    <div key={position.id}>
                      {isDupe && isFirstOfGroup && (
                        <div className="flex items-center gap-2 mt-3 mb-1 px-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{position.assetSymbol}</span>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Multiple sources</span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border",
                          isDupe && position.isImport && "border-l-4 border-l-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10",
                          isDupe && !position.isImport && "border-l-4 border-l-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-950/10"
                        )}
                        data-testid={`position-${position.assetSymbol}-${position.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {position.assetSymbol.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{position.assetSymbol}</span>
                              {position.source && (
                                <Badge variant={position.isImport ? "secondary" : "default"} className="text-[10px] px-1.5 py-0">
                                  {position.source}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {parseFloat(position.quantity).toFixed(6)} units
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
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
                          {position.isImport && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deletePositionMutation.mutate(position.id)}
                              disabled={deletePositionMutation.isPending}
                              data-testid={`button-delete-position-${position.assetSymbol}`}
                              title={`Remove ${position.assetSymbol} from ${position.source}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AllocationChart data={data?.allocation || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
