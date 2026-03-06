import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Search,
  AlertTriangle,
  Check,
  Pencil,
  Trash2,
  Merge,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
  Shield,
  Wallet,
  Building2,
  FileText,
  ArrowRightLeft,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnrichedPosition {
  id: string;
  assetSymbol: string;
  quantity: string;
  averageCost: string;
  totalCostBasis: string;
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  source?: string;
  isImport?: boolean;
  isAddressed?: boolean;
  isWallet?: boolean;
  updatedAt?: string;
  accountId?: string;
}

interface AssetGroup {
  symbol: string;
  positions: EnrichedPosition[];
  totalQuantity: number;
  totalValue: number;
  totalCostBasis: number;
  sourceCount: number;
  hasDuplicateRisk: boolean;
  hasWalletAndExchange: boolean;
}

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatQty(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num === 0) return "0";
  if (num >= 1000) return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (num >= 1) return num.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return num.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

function getSourceIcon(source: string, isWallet?: boolean, isImport?: boolean) {
  if (isWallet) return <Wallet className="h-3.5 w-3.5" />;
  if (isImport) return <FileText className="h-3.5 w-3.5" />;
  return <Building2 className="h-3.5 w-3.5" />;
}

function getSourceType(source: string, isWallet?: boolean, isImport?: boolean): string {
  if (isWallet) return "Blockchain";
  if (isImport) return "Import/Manual";
  return "Exchange";
}

function timeSince(dateStr?: string): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Reconciliation() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: "", averageCost: "", totalCostBasis: "" });
  const [mergeSelection, setMergeSelection] = useState<{ symbol: string; ids: string[] } | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "duplicates" | "manual" | "zero">("all");
  const [showAddressed, setShowAddressed] = useState(false);

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery<any>({
    queryKey: ["/api/portfolio"],
  });

  const { data: dbPositions = [], isLoading: positionsLoading } = useQuery<EnrichedPosition[]>({
    queryKey: ["/api/positions"],
  });

  const allPositions: EnrichedPosition[] = useMemo(() => {
    const positions = portfolioData?.positions || [];
    const positionIds = new Set(positions.map((p: any) => p.id));
    const deduped = [...positions];
    for (const dbp of dbPositions) {
      if (!positionIds.has(dbp.id)) {
        deduped.push(dbp);
      }
    }
    return deduped;
  }, [portfolioData?.positions, dbPositions]);

  const assetGroups: AssetGroup[] = useMemo(() => {
    const groupMap = new Map<string, EnrichedPosition[]>();
    for (const pos of allPositions) {
      if (!showAddressed && pos.isAddressed) continue;
      const sym = pos.assetSymbol.toUpperCase();
      if (!groupMap.has(sym)) groupMap.set(sym, []);
      groupMap.get(sym)!.push(pos);
    }

    const groups: AssetGroup[] = [];
    for (const [symbol, positions] of groupMap) {
      const totalQuantity = positions.reduce((sum, p) => sum + parseFloat(p.quantity || "0"), 0);
      const totalValue = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
      const totalCostBasis = positions.reduce((sum, p) => sum + parseFloat(p.totalCostBasis || "0"), 0);
      const sources = new Set(positions.map(p => p.source || "Unknown"));
      const hasWallet = positions.some(p => p.isWallet);
      const hasExchange = positions.some(p => !p.isWallet && !p.isImport);
      const hasImport = positions.some(p => p.isImport);

      const hasDuplicateRisk = positions.length > 1 && (
        (hasWallet && hasExchange) ||
        (hasWallet && hasImport) ||
        positions.filter(p => p.source === positions[0].source).length > 1
      );

      groups.push({
        symbol,
        positions,
        totalQuantity,
        totalValue,
        totalCostBasis,
        sourceCount: sources.size,
        hasDuplicateRisk,
        hasWalletAndExchange: hasWallet && (hasExchange || hasImport),
      });
    }

    return groups.sort((a, b) => {
      if (a.hasDuplicateRisk !== b.hasDuplicateRisk) return a.hasDuplicateRisk ? -1 : 1;
      return b.totalValue - a.totalValue;
    });
  }, [allPositions, showAddressed]);

  const filteredGroups = useMemo(() => {
    let filtered = assetGroups;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.symbol.toLowerCase().includes(term) ||
        g.positions.some(p => (p.source || "").toLowerCase().includes(term))
      );
    }

    if (filterMode === "duplicates") {
      filtered = filtered.filter(g => g.hasDuplicateRisk);
    } else if (filterMode === "manual") {
      filtered = filtered.filter(g => g.positions.some(p => p.isImport));
    } else if (filterMode === "zero") {
      filtered = filtered.filter(g => g.totalQuantity === 0 || g.totalValue === 0);
    }

    return filtered;
  }, [assetGroups, searchTerm, filterMode]);

  const stats = useMemo(() => {
    const total = assetGroups.length;
    const duplicates = assetGroups.filter(g => g.hasDuplicateRisk).length;
    const manualCount = assetGroups.filter(g => g.positions.some(p => p.isImport)).length;
    const zeroCount = assetGroups.filter(g => g.totalQuantity === 0).length;
    const totalPositions = allPositions.filter(p => showAddressed || !p.isAddressed).length;
    return { total, duplicates, manualCount, zeroCount, totalPositions };
  }, [assetGroups, allPositions, showAddressed]);

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/positions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Position updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/positions/${id}`);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: result.message || "Position removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ keepId, removeId }: { keepId: string; removeId: string }) => {
      const res = await apiRequest("POST", "/api/positions/merge", { keepId, removeId });
      return res.json();
    },
    onSuccess: (result) => {
      setMergeSelection(null);
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Positions merged", description: result.message });
    },
    onError: (error: Error) => {
      toast({ title: "Merge failed", description: error.message, variant: "destructive" });
    },
  });

  const addressedMutation = useMutation({
    mutationFn: async ({ id, addressed }: { id: string; addressed: boolean }) => {
      await apiRequest("PATCH", `/api/positions/${id}/addressed`, { addressed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const toggleGroup = useCallback((symbol: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }, []);

  const startEdit = useCallback((pos: EnrichedPosition) => {
    setEditingId(pos.id);
    setEditForm({
      quantity: pos.quantity,
      averageCost: pos.averageCost || "0",
      totalCostBasis: pos.totalCostBasis || "0",
    });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const qty = parseFloat(editForm.quantity);
    const avgCost = parseFloat(editForm.averageCost);
    if (isNaN(qty) || qty < 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    const costBasis = isNaN(avgCost) ? 0 : qty * avgCost;
    editMutation.mutate({
      id: editingId,
      data: {
        quantity: editForm.quantity,
        averageCost: editForm.averageCost,
        totalCostBasis: costBasis.toFixed(2),
      },
    });
  }, [editingId, editForm]);

  const startMerge = useCallback((symbol: string) => {
    setMergeSelection({ symbol, ids: [] });
  }, []);

  const toggleMergeId = useCallback((id: string) => {
    setMergeSelection(prev => {
      if (!prev) return null;
      const ids = prev.ids.includes(id)
        ? prev.ids.filter(x => x !== id)
        : [...prev.ids, id].slice(0, 2);
      return { ...prev, ids };
    });
  }, []);

  const isLoading = portfolioLoading || positionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="page-reconciliation">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6" data-testid="page-reconciliation">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Data Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Review every position across all sources. Spot duplicates, fix quantities, merge entries, and make sure your portfolio reflects reality.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card
            className={`cursor-pointer transition-colors ${filterMode === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterMode("all")}
            data-testid="filter-all"
          >
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Assets · {stats.totalPositions} entries</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${filterMode === "duplicates" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterMode("duplicates")}
            data-testid="filter-duplicates"
          >
            <CardContent className="pt-4 pb-3 px-4">
              <p className={`text-2xl font-bold ${stats.duplicates > 0 ? "text-amber-500" : ""}`}>{stats.duplicates}</p>
              <p className="text-xs text-muted-foreground">Possible Duplicates</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${filterMode === "manual" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterMode("manual")}
            data-testid="filter-manual"
          >
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{stats.manualCount}</p>
              <p className="text-xs text-muted-foreground">Manual / Imports</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${filterMode === "zero" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterMode("zero")}
            data-testid="filter-zero"
          >
            <CardContent className="pt-4 pb-3 px-4">
              <p className={`text-2xl font-bold ${stats.zeroCount > 0 ? "text-muted-foreground" : ""}`}>{stats.zeroCount}</p>
              <p className="text-xs text-muted-foreground">Zero Balance</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by asset or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-search-reconciliation"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddressed(!showAddressed)}
              className="text-xs"
              data-testid="button-toggle-addressed"
            >
              {showAddressed ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {showAddressed ? "Hide Addressed" : "Show Addressed"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allSymbols = filteredGroups.map(g => g.symbol);
                setExpandedGroups(prev => {
                  const allExpanded = allSymbols.every(s => prev.has(s));
                  return allExpanded ? new Set() : new Set(allSymbols);
                });
              }}
              className="text-xs"
              data-testid="button-expand-all"
            >
              Expand All
            </Button>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Check className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
              <p className="font-medium">
                {filterMode === "duplicates"
                  ? "No duplicate risks detected"
                  : filterMode === "zero"
                  ? "No zero-balance positions"
                  : filterMode === "manual"
                  ? "No manual or imported entries"
                  : "No positions found"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filterMode !== "all"
                  ? "Try a different filter to review other positions."
                  : "Connect an exchange or add a wallet to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.symbol);
              const isMerging = mergeSelection?.symbol === group.symbol;

              return (
                <Card
                  key={group.symbol}
                  className={`overflow-hidden ${group.hasDuplicateRisk ? "border-amber-300 dark:border-amber-700" : ""}`}
                  data-testid={`card-asset-${group.symbol}`}
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleGroup(group.symbol)}
                    data-testid={`toggle-${group.symbol}`}
                  >
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{group.symbol}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatQty(group.totalQuantity)} · {formatCurrency(group.totalValue)}
                        </span>
                        {group.hasDuplicateRisk && (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                            Review
                          </Badge>
                        )}
                        {group.sourceCount > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {group.sourceCount} sources
                          </Badge>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {group.positions.map(p => p.source || "Unknown").join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium shrink-0">{formatCurrency(group.totalValue)}</span>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/10">
                      {group.hasDuplicateRisk && (
                        <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-800 dark:text-amber-200">
                            <span className="font-medium">Possible duplicate detected.</span>
                            {group.hasWalletAndExchange
                              ? " This asset appears in both a blockchain wallet and an exchange/import. If the exchange holds the same coins shown on-chain, one entry may be double-counting."
                              : " This asset appears from multiple sources. Review quantities to ensure nothing is counted twice."}
                          </div>
                        </div>
                      )}

                      {isMerging && mergeSelection.ids.length === 2 && (
                        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Ready to merge — the second entry will be absorbed into the first.
                          </p>
                          <div className="flex gap-1.5">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="text-xs h-7" data-testid="button-confirm-merge">
                                  <Merge className="h-3 w-3 mr-1" /> Merge
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Merge positions?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will combine both entries into one, adding their quantities and cost bases together. The second entry will be deleted. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => mergeMutation.mutate({
                                      keepId: mergeSelection.ids[0],
                                      removeId: mergeSelection.ids[1],
                                    })}
                                    data-testid="button-confirm-merge-dialog"
                                  >
                                    Merge
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => setMergeSelection(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="divide-y">
                        {group.positions.map((pos) => {
                          const isEditing = editingId === pos.id;
                          const isMergeCandidate = isMerging && !pos.isWallet;

                          return (
                            <div
                              key={pos.id}
                              className={`px-4 py-3 ${isMerging && mergeSelection.ids.includes(pos.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                              data-testid={`position-${pos.id}`}
                            >
                              <div className="flex items-start gap-3">
                                {isMergeCandidate && (
                                  <input
                                    type="checkbox"
                                    checked={mergeSelection.ids.includes(pos.id)}
                                    onChange={() => toggleMergeId(pos.id)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300"
                                    disabled={mergeSelection.ids.length >= 2 && !mergeSelection.ids.includes(pos.id)}
                                    data-testid={`merge-checkbox-${pos.id}`}
                                  />
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-muted-foreground">
                                      {getSourceIcon(pos.source || "", pos.isWallet, pos.isImport)}
                                    </span>
                                    <span className="text-sm font-medium">{pos.source || "Unknown"}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {getSourceType(pos.source || "", pos.isWallet, pos.isImport)}
                                    </Badge>
                                    {pos.isAddressed && (
                                      <Badge variant="secondary" className="text-[10px]">Addressed</Badge>
                                    )}
                                    {pos.isWallet && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-600">
                                            <RefreshCcw className="h-2.5 w-2.5 mr-0.5" /> Live
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">
                                          Balance pulled from blockchain — always current
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>

                                  {isEditing ? (
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div>
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Quantity</label>
                                        <Input
                                          value={editForm.quantity}
                                          onChange={(e) => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                                          className="h-8 text-sm mt-0.5"
                                          data-testid="input-edit-quantity"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Cost</label>
                                        <Input
                                          value={editForm.averageCost}
                                          onChange={(e) => setEditForm(f => ({ ...f, averageCost: e.target.value }))}
                                          className="h-8 text-sm mt-0.5"
                                          data-testid="input-edit-avg-cost"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost Basis (auto)</label>
                                        <p className="text-sm font-medium mt-1.5">
                                          {formatCurrency(
                                            (parseFloat(editForm.quantity) || 0) * (parseFloat(editForm.averageCost) || 0)
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Qty: </span>
                                        <span className="font-medium">{formatQty(pos.quantity)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Value: </span>
                                        <span className="font-medium">{formatCurrency(pos.currentValue)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Avg Cost: </span>
                                        <span className="font-medium">{formatCurrency(pos.averageCost)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Cost Basis: </span>
                                        <span className="font-medium">{formatCurrency(pos.totalCostBasis)}</span>
                                      </div>
                                    </div>
                                  )}

                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    Updated {timeSince(pos.updatedAt)}
                                    {pos.currentPrice ? ` · Price: ${formatCurrency(pos.currentPrice)}` : ""}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={saveEdit}
                                        disabled={editMutation.isPending}
                                        data-testid="button-save-edit"
                                      >
                                        <Save className="h-3.5 w-3.5 text-emerald-500" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setEditingId(null)}
                                        data-testid="button-cancel-edit"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      {!pos.isWallet && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0"
                                              onClick={(e) => { e.stopPropagation(); startEdit(pos); }}
                                              data-testid={`button-edit-${pos.id}`}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent className="text-xs">Edit quantity & cost</TooltipContent>
                                        </Tooltip>
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              addressedMutation.mutate({ id: pos.id, addressed: !pos.isAddressed });
                                            }}
                                            data-testid={`button-address-${pos.id}`}
                                          >
                                            {pos.isAddressed
                                              ? <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                              : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                            }
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">
                                          {pos.isAddressed ? "Restore to portfolio" : "Mark as addressed (hide)"}
                                        </TooltipContent>
                                      </Tooltip>
                                      {!pos.isWallet && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                              onClick={(e) => e.stopPropagation()}
                                              data-testid={`button-delete-${pos.id}`}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete this position?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently remove {pos.assetSymbol} from {pos.source || "this source"}. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => deleteMutation.mutate(pos.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {group.positions.length > 1 && !group.positions.every(p => p.isWallet) && (
                        <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">{group.positions.length} entries</span> for {group.symbol}
                            {" · Total: "}{formatQty(group.totalQuantity)} ({formatCurrency(group.totalValue)})
                          </div>
                          {!isMerging ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => startMerge(group.symbol)}
                              data-testid={`button-merge-${group.symbol}`}
                            >
                              <Merge className="h-3 w-3 mr-1" /> Merge Entries
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => setMergeSelection(null)}
                            >
                              Cancel Merge
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Blockchain wallet balances are pulled live and cannot be edited directly — they always reflect what's on-chain.
            Exchange and manual positions can be edited, merged, or deleted.
            Use "Mark as Addressed" to hide entries you've reviewed but don't want to delete.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
