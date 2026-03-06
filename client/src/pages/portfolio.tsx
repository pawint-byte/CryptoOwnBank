import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AllocationChart } from "@/components/allocation-chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Minus, Trash2, Search, Filter, CheckCircle, Eye, EyeOff, Layers, BarChart3, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAssetCategory, CATEGORY_COLORS } from "@shared/asset-categories";
import type { Position } from "@shared/schema";

interface PositionWithMarket extends Position {
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  source?: string;
  isImport?: boolean;
  isAddressed?: boolean;
  isWallet?: boolean;
}

interface PortfolioData {
  positions: PositionWithMarket[];
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  allocation: Array<{ name: string; value: number; color: string }>;
}

type ViewMode = "holdings" | "consolidated" | "category";

export default function Portfolio() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("holdings");
  const [showAddressed, setShowAddressed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    assetSymbol: "",
    quantity: "",
    costPerUnit: "",
    currentPrice: "",
    location: "",
  });

  const { data, isLoading } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio"],
  });

  const { data: dbPositions = [] } = useQuery<PositionWithMarket[]>({
    queryKey: ["/api/positions"],
  });

  const allPositions = useMemo(() => {
    return data?.positions || dbPositions;
  }, [data?.positions, dbPositions]);

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

  const addressMutation = useMutation({
    mutationFn: async ({ id, addressed }: { id: string; addressed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/positions/${id}/addressed`, { addressed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Position updated" });
    },
    onError: () => {
      toast({ title: "Failed to update position", variant: "destructive" });
    },
  });

  const manualEntryMutation = useMutation({
    mutationFn: async (data: typeof manualForm) => {
      const res = await apiRequest("POST", "/api/positions/manual", data);
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: result.message || "Position added" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setManualOpen(false);
      setManualForm({ assetSymbol: "", quantity: "", costPerUnit: "", currentPrice: "", location: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add position", description: error.message, variant: "destructive" });
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

  const activePositions = useMemo(() => {
    return allPositions.filter(p => !p.isAddressed);
  }, [allPositions]);

  const addressedPositions = useMemo(() => {
    return allPositions.filter(p => p.isAddressed);
  }, [allPositions]);

  const displayPositions = showAddressed ? allPositions : activePositions;

  const uniqueSources = useMemo(() => {
    return [...new Set(displayPositions.map(p => p.source).filter(Boolean))] as string[];
  }, [displayPositions]);

  const filtered = useMemo(() => {
    let result = displayPositions.filter(p => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!p.assetSymbol.toLowerCase().includes(term) && !(p.source || "").toLowerCase().includes(term)) {
          return false;
        }
      }
      if (sourceFilter !== "all") {
        if (sourceFilter === "imports" && !p.isImport) return false;
        if (sourceFilter === "exchanges" && (p.isImport || p.isWallet)) return false;
        if (sourceFilter === "wallets" && !p.isWallet) return false;
        if (sourceFilter !== "imports" && sourceFilter !== "exchanges" && sourceFilter !== "wallets" && p.source !== sourceFilter) return false;
      }
      return true;
    });

    result.sort((a, b) => {
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

    return result;
  }, [displayPositions, searchTerm, sourceFilter, sortBy]);

  const consolidated = useMemo(() => {
    const map = new Map<string, {
      symbol: string;
      totalQty: number;
      totalCostBasis: number;
      totalValue: number;
      sources: string[];
      positions: PositionWithMarket[];
    }>();

    for (const p of filtered) {
      if (p.isAddressed) continue;
      const sym = p.assetSymbol;
      const existing = map.get(sym) || { symbol: sym, totalQty: 0, totalCostBasis: 0, totalValue: 0, sources: [], positions: [] };
      existing.totalQty += parseFloat(p.quantity);
      existing.totalCostBasis += parseFloat(p.totalCostBasis);
      existing.totalValue += (p.currentValue || 0);
      if (p.source && !existing.sources.includes(p.source)) {
        existing.sources.push(p.source);
      }
      existing.positions.push(p);
      map.set(sym, existing);
    }

    return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
  }, [filtered]);

  const categoryData = useMemo(() => {
    const map = new Map<string, {
      category: string;
      totalValue: number;
      totalCostBasis: number;
      assets: Array<{ symbol: string; value: number; qty: number; costBasis: number }>;
    }>();

    for (const p of filtered) {
      if (p.isAddressed) continue;
      const cat = getAssetCategory(p.assetSymbol);
      const existing = map.get(cat) || { category: cat, totalValue: 0, totalCostBasis: 0, assets: [] };
      existing.totalValue += (p.currentValue || 0);
      existing.totalCostBasis += parseFloat(p.totalCostBasis);
      const existingAsset = existing.assets.find(a => a.symbol === p.assetSymbol);
      if (existingAsset) {
        existingAsset.value += (p.currentValue || 0);
        existingAsset.qty += parseFloat(p.quantity);
        existingAsset.costBasis += parseFloat(p.totalCostBasis);
      } else {
        existing.assets.push({
          symbol: p.assetSymbol,
          value: p.currentValue || 0,
          qty: parseFloat(p.quantity),
          costBasis: parseFloat(p.totalCostBasis),
        });
      }
      map.set(cat, existing);
    }

    return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
  }, [filtered]);

  const categoryAllocation = useMemo(() => {
    return categoryData.map(c => ({
      name: c.category,
      value: c.totalValue,
      color: CATEGORY_COLORS[c.category] || CATEGORY_COLORS["Other"],
    }));
  }, [categoryData]);

  const symbolCounts = new Map<string, number>();
  filtered.forEach(p => symbolCounts.set(p.assetSymbol, (symbolCounts.get(p.assetSymbol) || 0) + 1));
  const duplicateSymbols = new Set<string>();
  symbolCounts.forEach((count, symbol) => { if (count > 1) duplicateSymbols.add(symbol); });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
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

  const totalPortfolioValue = categoryData.reduce((sum, c) => sum + c.totalValue, 0) || data?.totalValue || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-portfolio">Portfolio</h1>
          <p className="text-muted-foreground">
            Your holdings and performance breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          {addressedPositions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddressed(!showAddressed)}
              className="text-xs"
              data-testid="button-toggle-addressed"
            >
              {showAddressed ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
              {showAddressed ? "Hide" : "Show"} Addressed ({addressedPositions.length})
            </Button>
          )}
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-manual">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Entry</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  manualEntryMutation.mutate(manualForm);
                }}
                className="space-y-4"
                data-testid="form-manual-entry"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assetSymbol">Asset Symbol *</Label>
                    <Input
                      id="assetSymbol"
                      placeholder="BTC, AAPL, GOLD..."
                      value={manualForm.assetSymbol}
                      onChange={(e) => setManualForm(f => ({ ...f, assetSymbol: e.target.value }))}
                      required
                      data-testid="input-manual-symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="10"
                      value={manualForm.quantity}
                      onChange={(e) => setManualForm(f => ({ ...f, quantity: e.target.value }))}
                      required
                      data-testid="input-manual-quantity"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costPerUnit">Cost Per Unit ($)</Label>
                    <Input
                      id="costPerUnit"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={manualForm.costPerUnit}
                      onChange={(e) => setManualForm(f => ({ ...f, costPerUnit: e.target.value }))}
                      data-testid="input-manual-cost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentPrice">Current Price ($)</Label>
                    <Input
                      id="currentPrice"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={manualForm.currentPrice}
                      onChange={(e) => setManualForm(f => ({ ...f, currentPrice: e.target.value }))}
                      data-testid="input-manual-price"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Where It's Held</Label>
                  <Input
                    id="location"
                    placeholder="Fidelity, Cold Storage, Safe..."
                    value={manualForm.location}
                    onChange={(e) => setManualForm(f => ({ ...f, location: e.target.value }))}
                    data-testid="input-manual-location"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  If the asset has no live price feed, you can set the current price manually and update it later.
                </p>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={manualEntryMutation.isPending}
                  data-testid="button-submit-manual"
                >
                  {manualEntryMutation.isPending ? "Adding..." : "Add to Portfolio"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "holdings" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("holdings")}
                  data-testid="button-view-holdings"
                >
                  Holdings
                </Button>
                <Button
                  variant={viewMode === "consolidated" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("consolidated")}
                  data-testid="button-view-consolidated"
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  By Asset
                </Button>
                <Button
                  variant={viewMode === "category" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("category")}
                  data-testid="button-view-category"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  By Category
                </Button>
              </div>
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
                {viewMode === "holdings" && (
                  <>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="h-9 w-36 text-sm" data-testid="select-source-filter">
                        <Filter className="h-3.5 w-3.5 mr-1.5" />
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="imports">Imports Only</SelectItem>
                        <SelectItem value="exchanges">Exchanges Only</SelectItem>
                        <SelectItem value="wallets">Wallets Only</SelectItem>
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
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "holdings" && (
              <>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium">
                      {searchTerm || sourceFilter !== "all" ? "No matching holdings" : "No holdings yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || sourceFilter !== "all" ? "Try adjusting your search or filter." : "Add transactions to see your portfolio here."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((position, idx) => {
                      const isDupe = duplicateSymbols.has(position.assetSymbol);
                      const isFirstOfGroup = sortBy === "name" && (idx === 0 || filtered[idx - 1].assetSymbol !== position.assetSymbol);
                      const isAddr = position.isAddressed;

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
                              isAddr && "opacity-50 bg-muted/30",
                              !isAddr && isDupe && position.isImport && "border-l-4 border-l-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10",
                              !isAddr && isDupe && !position.isImport && "border-l-4 border-l-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-950/10"
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
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                    {getAssetCategory(position.assetSymbol)}
                                  </Badge>
                                  {isAddr && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      Addressed
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  {parseFloat(position.quantity).toFixed(6)} units
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
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
                              {!position.isWallet && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn("h-8 w-8", isAddr ? "text-chart-2 hover:text-chart-2" : "text-muted-foreground hover:text-amber-600")}
                                  onClick={() => addressMutation.mutate({ id: position.id, addressed: !isAddr })}
                                  disabled={addressMutation.isPending}
                                  data-testid={`button-address-${position.id}`}
                                  title={isAddr ? "Restore position" : "Mark as addressed"}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {position.isImport && !position.isWallet && !isAddr && (
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
              </>
            )}

            {viewMode === "consolidated" && (
              <div className="space-y-2">
                {consolidated.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No holdings to consolidate.</p>
                ) : (
                  consolidated.map(item => {
                    const avgCost = item.totalQty > 0 ? item.totalCostBasis / item.totalQty : 0;
                    const gainLoss = item.totalValue - item.totalCostBasis;
                    const gainPct = item.totalCostBasis > 0 ? (gainLoss / item.totalCostBasis) * 100 : 0;
                    const pctOfPortfolio = totalPortfolioValue > 0 ? (item.totalValue / totalPortfolioValue) * 100 : 0;

                    return (
                      <div key={item.symbol} className="p-4 rounded-lg border" data-testid={`consolidated-${item.symbol}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">{item.symbol.slice(0, 2)}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{item.symbol}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {getAssetCategory(item.symbol)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {pctOfPortfolio.toFixed(1)}% of portfolio
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-mono">{item.totalQty.toFixed(6)}</span> units
                                {item.sources.length > 0 && (
                                  <span className="ml-2 text-xs">
                                    from {item.sources.join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-medium">{formatCurrency(item.totalValue)}</div>
                            <div className="text-xs text-muted-foreground">
                              Avg: {formatCurrency(avgCost)} | Basis: {formatCurrency(item.totalCostBasis)}
                            </div>
                            <div className={cn("text-sm", gainLoss > 0 ? "text-chart-2" : gainLoss < 0 ? "text-destructive" : "text-muted-foreground")}>
                              {gainLoss > 0 ? "+" : ""}{formatCurrency(gainLoss)} ({gainPct.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {viewMode === "category" && (
              <div className="space-y-2">
                {categoryData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No holdings to categorize.</p>
                ) : (
                  categoryData.map(cat => {
                    const isExpanded = expandedCategories.has(cat.category);
                    const gainLoss = cat.totalValue - cat.totalCostBasis;
                    const gainPct = cat.totalCostBasis > 0 ? (gainLoss / cat.totalCostBasis) * 100 : 0;
                    const pctOfPortfolio = totalPortfolioValue > 0 ? (cat.totalValue / totalPortfolioValue) * 100 : 0;
                    const color = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS["Other"];

                    return (
                      <div key={cat.category} className="rounded-lg border overflow-hidden" data-testid={`category-${cat.category}`}>
                        <button
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => toggleCategory(cat.category)}
                          data-testid={`button-toggle-category-${cat.category}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{cat.category}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {cat.assets.length} asset{cat.assets.length !== 1 ? "s" : ""}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {pctOfPortfolio.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 mt-1" style={{ maxWidth: 200 }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pctOfPortfolio, 100)}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-mono font-medium">{formatCurrency(cat.totalValue)}</div>
                              <div className={cn("text-sm", gainLoss > 0 ? "text-chart-2" : gainLoss < 0 ? "text-destructive" : "text-muted-foreground")}>
                                {gainLoss > 0 ? "+" : ""}{gainPct.toFixed(2)}%
                              </div>
                            </div>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t px-4 pb-3 bg-muted/20">
                            {cat.assets.sort((a, b) => b.value - a.value).map(asset => {
                              const assetGain = asset.value - asset.costBasis;
                              const assetPct = asset.costBasis > 0 ? (assetGain / asset.costBasis) * 100 : 0;
                              return (
                                <div key={asset.symbol} className="flex items-center justify-between py-2 border-b last:border-b-0 border-border/50" data-testid={`category-asset-${asset.symbol}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{asset.symbol}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{asset.qty.toFixed(4)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-sm">{formatCurrency(asset.value)}</span>
                                    <span className={cn("text-xs ml-2", assetGain > 0 ? "text-chart-2" : assetGain < 0 ? "text-destructive" : "text-muted-foreground")}>
                                      {assetGain > 0 ? "+" : ""}{assetPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AllocationChart
            data={viewMode === "category" ? categoryAllocation : (data?.allocation || [])}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
