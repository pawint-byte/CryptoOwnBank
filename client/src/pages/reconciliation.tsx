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
  ArrowRight,
  Copy,
  CheckCircle2,
  Scale,
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

interface TaxLot {
  id: string;
  assetSymbol: string;
  acquiredDate: string;
  originalQuantity: string;
  remainingQuantity: string;
  costBasisPerUnit: string;
  note?: string | null;
}

function PurchaseLots({ walletBalanceId, assetSymbol, liveQuantity }: {
  walletBalanceId: string;
  assetSymbol: string;
  liveQuantity: number;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ quantity: "", costPerUnit: "", acquiredDate: "", note: "" });
  const [editForm, setEditForm] = useState({ quantity: "", costPerUnit: "", acquiredDate: "", note: "" });
  const { toast } = useToast();

  const { data: lots = [], isLoading } = useQuery<TaxLot[]>({
    queryKey: ["/api/wallet-balances", walletBalanceId, "lots"],
    queryFn: async () => {
      const res = await fetch(`/api/wallet-balances/${walletBalanceId}/lots`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load lots");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof addForm) => {
      const res = await apiRequest("POST", `/api/wallet-balances/${walletBalanceId}/lots`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", walletBalanceId, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setAddForm({ quantity: "", costPerUnit: "", acquiredDate: "", note: "" });
      setShowAddForm(false);
      toast({ title: "Purchase lot added" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ lotId, data }: { lotId: string; data: typeof editForm }) => {
      const res = await apiRequest("PATCH", `/api/wallet-balances/${walletBalanceId}/lots/${lotId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", walletBalanceId, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setEditingLotId(null);
      toast({ title: "Purchase lot updated" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (lotId: string) => {
      const res = await apiRequest("DELETE", `/api/wallet-balances/${walletBalanceId}/lots/${lotId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", walletBalanceId, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Purchase lot removed" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const lotsTotal = lots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
  const lotsCostBasis = lots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
  const difference = liveQuantity - lotsTotal;
  const isAccountedFor = Math.abs(difference) < 0.0001;

  const startEditLot = (lot: TaxLot) => {
    setEditingLotId(lot.id);
    setEditForm({
      quantity: lot.originalQuantity,
      costPerUnit: lot.costBasisPerUnit,
      acquiredDate: new Date(lot.acquiredDate).toISOString().split("T")[0],
      note: lot.note || "",
    });
  };

  if (isLoading) return <Skeleton className="h-16 w-full" />;

  return (
    <div className="mt-3 pt-3 border-t border-dashed" data-testid={`purchase-lots-${walletBalanceId}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium">Purchase Lots</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {lots.length} lot{lots.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-6 px-2"
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="add-purchase-lot-btn"
        >
          {showAddForm ? <X className="h-3 w-3 mr-1" /> : <span className="mr-1">+</span>}
          {showAddForm ? "Cancel" : "Add Lot"}
        </Button>
      </div>

      {lots.length > 0 && (
        <div className="mb-2 text-[11px] flex items-center gap-3 text-muted-foreground">
          <span>Lots total: <span className="font-medium text-foreground">{formatQty(lotsTotal)}</span></span>
          <span>Live: <span className="font-medium text-foreground">{formatQty(liveQuantity)}</span></span>
          {isAccountedFor ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <Check className="h-3 w-3" /> Fully accounted for
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <AlertTriangle className="h-3 w-3" /> Gap: {formatQty(Math.abs(difference))} {difference > 0 ? "untracked" : "over-tracked"}
            </span>
          )}
        </div>
      )}

      {lots.length === 0 && !showAddForm && (
        <p className="text-[11px] text-muted-foreground mb-2">
          No purchase lots recorded. Add your purchase history to track cost basis and gain/loss per acquisition.
        </p>
      )}

      <div className="space-y-1.5">
        {lots.map((lot, idx) => {
          const qty = parseFloat(lot.originalQuantity);
          const cost = parseFloat(lot.costBasisPerUnit);
          const totalCost = qty * cost;
          const isEditing = editingLotId === lot.id;
          const dateStr = new Date(lot.acquiredDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

          if (isEditing) {
            return (
              <div key={lot.id} className="rounded border p-2 bg-muted/30 space-y-2" data-testid={`edit-lot-${lot.id}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Quantity</label>
                    <Input
                      type="number"
                      step="any"
                      value={editForm.quantity}
                      onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                      className="h-7 text-xs"
                      data-testid="edit-lot-quantity"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Cost/Unit ($)</label>
                    <Input
                      type="number"
                      step="any"
                      value={editForm.costPerUnit}
                      onChange={e => setEditForm(f => ({ ...f, costPerUnit: e.target.value }))}
                      className="h-7 text-xs"
                      data-testid="edit-lot-cost"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Date Acquired</label>
                    <Input
                      type="date"
                      value={editForm.acquiredDate}
                      onChange={e => setEditForm(f => ({ ...f, acquiredDate: e.target.value }))}
                      className="h-7 text-xs"
                      data-testid="edit-lot-date"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Note</label>
                    <Input
                      value={editForm.note}
                      onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                      className="h-7 text-xs"
                      placeholder="Optional"
                      data-testid="edit-lot-note"
                    />
                  </div>
                </div>
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingLotId(null)}>
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2"
                    disabled={editMutation.isPending}
                    onClick={() => editMutation.mutate({ lotId: lot.id, data: editForm })}
                    data-testid="save-edit-lot-btn"
                  >
                    <Save className="h-3 w-3 mr-1" /> Save
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div key={lot.id} className="rounded border px-2.5 py-1.5 flex items-center justify-between bg-background hover:bg-muted/30 transition-colors" data-testid={`lot-row-${lot.id}`}>
              <div className="flex items-center gap-3 text-[11px] flex-wrap">
                <span className="text-muted-foreground w-4 text-center">{idx + 1}</span>
                <span className="font-medium">{formatQty(qty)} {assetSymbol}</span>
                <span className="text-muted-foreground">@ {formatCurrency(cost)}</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-medium">{formatCurrency(totalCost)}</span>
                <span className="text-muted-foreground">{dateStr}</span>
                {lot.note && <span className="text-muted-foreground italic">"{lot.note}"</span>}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditLot(lot)} data-testid={`edit-lot-btn-${lot.id}`}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" data-testid={`delete-lot-btn-${lot.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this purchase lot?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {formatQty(qty)} {assetSymbol} acquired on {dateStr} at {formatCurrency(cost)}/unit will be permanently removed. Your live balance is unaffected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(lot.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Lot
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      {showAddForm && (
        <div className="rounded border p-2 bg-muted/30 space-y-2 mt-2" data-testid="add-lot-form">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Quantity</label>
              <Input
                type="number"
                step="any"
                value={addForm.quantity}
                onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                className="h-7 text-xs"
                placeholder="e.g. 1000"
                data-testid="add-lot-quantity"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Cost/Unit ($)</label>
              <Input
                type="number"
                step="any"
                value={addForm.costPerUnit}
                onChange={e => setAddForm(f => ({ ...f, costPerUnit: e.target.value }))}
                className="h-7 text-xs"
                placeholder="e.g. 0.55"
                data-testid="add-lot-cost"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Date Acquired</label>
              <Input
                type="date"
                value={addForm.acquiredDate}
                onChange={e => setAddForm(f => ({ ...f, acquiredDate: e.target.value }))}
                className="h-7 text-xs"
                data-testid="add-lot-date"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Note</label>
              <Input
                value={addForm.note}
                onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))}
                className="h-7 text-xs"
                placeholder="Optional"
                data-testid="add-lot-note"
              />
            </div>
          </div>
          <div className="flex gap-1 justify-end">
            <Button
              size="sm"
              className="h-6 text-xs px-2"
              disabled={addMutation.isPending || !addForm.quantity || !addForm.costPerUnit || !addForm.acquiredDate}
              onClick={() => addMutation.mutate(addForm)}
              data-testid="submit-add-lot-btn"
            >
              <Save className="h-3 w-3 mr-1" /> Add Purchase Lot
            </Button>
          </div>
        </div>
      )}

      {lots.length > 0 && (
        <div className="mt-2 pt-2 border-t text-[11px] flex items-center gap-3">
          <span className="text-muted-foreground">Total cost basis:</span>
          <span className="font-medium">{formatCurrency(lotsCostBasis)}</span>
          {lotsTotal > 0 && (
            <>
              <span className="text-muted-foreground">Avg cost:</span>
              <span className="font-medium">{formatCurrency(lotsCostBasis / lotsTotal)}/unit</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResolveSection({ positions, selectedKeep, setSelectedKeep, onResolve }: {
  positions: EnrichedPosition[];
  selectedKeep: string | null;
  setSelectedKeep: (id: string | null) => void;
  onResolve: (keepId: string, removeId: string, copyValues: boolean, keepIsWallet?: boolean) => void;
}) {
  const { toast } = useToast();
  const livePositions = positions.filter(p => p.isWallet);
  const importPositions = positions.filter(p => p.isImport);
  const exchangePositions = positions.filter(p => !p.isWallet && !p.isImport);
  const hasLiveSource = livePositions.length > 0 || exchangePositions.length > 0;
  const removable = importPositions.filter(p => !p.isWallet);

  const distributeMutation = useMutation({
    mutationFn: async (importPositionId: string) => {
      const res = await apiRequest("POST", "/api/positions/distribute-lots", { importPositionId });
      return res.json();
    },
    onSuccess: (data: { message: string; distributed: Array<{ targetWallet: string; quantity: number }>; remainingLots: number; importRemoved: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation"] });
      const walletNames = [...new Set(data.distributed.map(d => d.targetWallet))];
      if (data.importRemoved) {
        toast({
          title: `All ${data.distributed.length} lots distributed`,
          description: `Moved to ${walletNames.join(", ")}. Import entry removed — no more double counting.`,
        });
      } else {
        toast({
          title: `${data.distributed.length} lots distributed, ${data.remainingLots} remaining`,
          description: `Wallets are full. Remaining lots may be on an exchange or wallet you haven't connected yet. Add a Manual Entry on the Wallets page to account for them.`,
          duration: 8000,
        });
      }
    },
    onError: () => toast({ title: "Failed to distribute lots", variant: "destructive" }),
  });

  const totalLiveQty = livePositions.reduce((sum, p) => sum + parseFloat(p.quantity || "0"), 0);
  const totalExchangeQty = exchangePositions.reduce((sum, p) => sum + parseFloat(p.quantity || "0"), 0);
  const liveSources = [
    ...livePositions.map(p => p.source || "Wallet"),
    ...exchangePositions.map(p => p.source || "Exchange"),
  ];

  if (hasLiveSource && removable.length > 0) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <div className="flex items-start gap-2 mb-3">
          <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              Already tracked by live sources
            </p>
            <p className="text-muted-foreground mt-0.5">
              This asset is tracked live via {liveSources.join(", ")}
              {livePositions.length > 0 ? " (on-chain — always current)" : " (exchange API)"}
              . The import {removable.length === 1 ? "entry" : "entries"} below {removable.length === 1 ? "is" : "are"} from your Yahoo/CSV import and no longer needed.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {removable.map(removePos => {
            const removeQty = parseFloat(removePos.quantity || "0");
            const liveTotal = totalLiveQty + totalExchangeQty;
            const qtyMatch = Math.abs(liveTotal - removeQty) < 0.0001;

            return (
              <div
                key={removePos.id}
                className="rounded-lg border p-3 bg-muted/20 space-y-2"
                data-testid={`resolve-action-${removePos.id}`}
              >
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-medium">
                      {removePos.source} — {formatQty(removeQty)} units
                      {parseFloat(removePos.totalCostBasis || "0") > 0 ? `, cost basis ${formatCurrency(removePos.totalCostBasis)}` : ""}
                    </p>
                    {qtyMatch ? (
                      <p className="text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3 inline mr-0.5" />
                        Quantity matches live wallets. You can distribute lots or remove the import.
                      </p>
                    ) : (
                      <div className="text-amber-600 dark:text-amber-400">
                        <p>
                          <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                          Import: {formatQty(removeQty)} vs Live: {formatQty(liveTotal)}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-amber-600/80 dark:text-amber-400/80">
                          {removeQty > liveTotal
                            ? `${formatQty(removeQty - liveTotal)} units may be on an exchange or wallet you haven't connected. Distribute what fits, then add a Manual Entry for the rest.`
                            : `Live wallets hold more than the import — safe to distribute.`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {livePositions.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 flex-1"
                          disabled={distributeMutation.isPending}
                          data-testid={`resolve-distribute-${removePos.id}`}
                        >
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          {distributeMutation.isPending ? "Distributing..." : "Distribute Lots to Wallets"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Distribute purchase lots to wallets?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your {removePos.assetSymbol} purchase lots from "{removePos.source}" will be distributed across your live wallets ({liveSources.join(", ")}) — filling each wallet up to its current balance, then moving on to the next. Cost basis and purchase dates are preserved. If all lots are distributed, the import entry is automatically removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => distributeMutation.mutate(removePos.id)}
                          >
                            Distribute Lots
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 flex-1 text-destructive hover:text-destructive"
                        data-testid={`resolve-delete-${removePos.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove Import
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this import entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{removePos.source}" ({formatQty(removeQty)} {removePos.assetSymbol}) will be removed. If you want to preserve your purchase history (cost basis, dates), use "Distribute Lots to Wallets" first. Otherwise, the import entry and its lots will be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            const keepRef = livePositions[0] || exchangePositions[0];
                            onResolve(keepRef.id, removePos.id, false, keepRef.isWallet);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove Import Entry
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (removable.length >= 2 && !hasLiveSource) {
    const others = selectedKeep ? positions.filter(p => p.id !== selectedKeep) : [];

    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <p className="text-[11px] text-muted-foreground mb-2 font-medium">
          No live source connected for this asset. Pick the entry you want to keep, and remove the duplicate.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {removable.map((pos) => (
            <Button
              key={pos.id}
              size="sm"
              variant={selectedKeep === pos.id ? "default" : "outline"}
              className="text-xs h-8 flex-1"
              onClick={() => setSelectedKeep(selectedKeep === pos.id ? null : pos.id)}
              data-testid={`resolve-keep-${pos.id}`}
            >
              {selectedKeep === pos.id ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <ArrowRight className="h-3 w-3 mr-1" />
              )}
              Keep {pos.source || "Unknown"}
            </Button>
          ))}
        </div>

        {selectedKeep && others.length > 0 && (
          <div className="mt-3 space-y-2">
            {others.filter(p => !p.isWallet).map(removePos => {
              const keepPos = positions.find(p => p.id === selectedKeep)!;
              const keepQty = parseFloat(keepPos.quantity || "0");
              const removeQty = parseFloat(removePos.quantity || "0");
              const qtyMatch = Math.abs(keepQty - removeQty) < 0.0001;

              return (
                <div
                  key={removePos.id}
                  className="rounded-lg border p-3 bg-muted/20 space-y-2"
                  data-testid={`resolve-action-${removePos.id}`}
                >
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-xs">
                      {qtyMatch ? (
                        <p className="text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3 inline mr-0.5" />
                          Quantities match ({formatQty(keepQty)}). Safe to remove the duplicate.
                        </p>
                      ) : (
                        <p className="text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                          Quantities differ: keeping {formatQty(keepQty)}, removing {formatQty(removeQty)}.
                        </p>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 w-full text-destructive hover:text-destructive"
                        data-testid={`resolve-delete-${removePos.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove {removePos.source}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove duplicate entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{removePos.source}" ({formatQty(removeQty)} {removePos.assetSymbol}). "{keepPos.source}" will remain. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onResolve(selectedKeep!, removePos.id, false)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function ComparisonTable({ positions, onResolve }: {
  positions: EnrichedPosition[];
  onResolve: (keepId: string, removeId: string, copyValues: boolean, keepIsWallet?: boolean) => void;
}) {
  const [selectedKeep, setSelectedKeep] = useState<string | null>(null);

  if (positions.length < 2) return null;

  const fields: { label: string; key: string; format: (pos: EnrichedPosition) => string }[] = [
    { label: "Quantity", key: "quantity", format: (p) => formatQty(p.quantity) },
    { label: "Current Value", key: "currentValue", format: (p) => formatCurrency(p.currentValue) },
    { label: "Avg Cost", key: "averageCost", format: (p) => formatCurrency(p.averageCost) },
    { label: "Cost Basis", key: "totalCostBasis", format: (p) => formatCurrency(p.totalCostBasis) },
    { label: "Price Used", key: "currentPrice", format: (p) => formatCurrency(p.currentPrice) },
    { label: "Last Updated", key: "updatedAt", format: (p) => timeSince(p.updatedAt) },
  ];

  const qtyValues = positions.map(p => parseFloat(p.quantity || "0"));
  const allQtySame = qtyValues.every(v => Math.abs(v - qtyValues[0]) < 0.0001);
  const costValues = positions.map(p => parseFloat(p.totalCostBasis || "0"));
  const allCostSame = costValues.every(v => Math.abs(v - costValues[0]) < 0.01);

  const others = selectedKeep ? positions.filter(p => p.id !== selectedKeep) : [];

  return (
    <div className="px-4 py-3 border-t bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-950/10" data-testid="comparison-table">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Side-by-Side Comparison</span>
        {allQtySame && (
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600">
            <Check className="h-2.5 w-2.5 mr-0.5" /> Quantities match
          </Badge>
        )}
        {!allQtySame && (
          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Quantities differ
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse" data-testid="comparison-grid">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1.5 px-2 text-muted-foreground font-medium w-28">Field</th>
              {positions.map((pos) => (
                <th key={pos.id} className="text-right py-1.5 px-2 font-medium min-w-[120px]">
                  <div className="flex items-center justify-end gap-1.5">
                    {getSourceIcon(pos.source || "", pos.isWallet, pos.isImport)}
                    <span className="truncate max-w-[100px]">{pos.source || "Unknown"}</span>
                  </div>
                  <div className="mt-0.5">
                    <Badge variant="outline" className="text-[9px]">
                      {getSourceType(pos.source || "", pos.isWallet, pos.isImport)}
                    </Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const values = positions.map(p => field.format(p));
              const allSame = values.every(v => v === values[0]);
              return (
                <tr key={field.key} className="border-b border-dashed last:border-b-0">
                  <td className="py-1.5 px-2 text-muted-foreground">{field.label}</td>
                  {positions.map((pos, i) => {
                    const isDifferent = !allSame;
                    return (
                      <td
                        key={pos.id}
                        className={`py-1.5 px-2 text-right font-medium ${
                          isDifferent && (field.key === "quantity" || field.key === "totalCostBasis")
                            ? "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                            : ""
                        }`}
                      >
                        {values[i]}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ResolveSection positions={positions} selectedKeep={selectedKeep} setSelectedKeep={setSelectedKeep} onResolve={onResolve} />
    </div>
  );
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
    mutationFn: async ({ id, data, isWallet }: { id: string; data: any; isWallet?: boolean }) => {
      if (isWallet) {
        const res = await apiRequest("PATCH", `/api/wallet-balances/${id}/cost`, data);
        return res.json();
      }
      const res = await apiRequest("PATCH", `/api/positions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Updated successfully" });
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

  const resolveMutation = useMutation({
    mutationFn: async ({ keepId, removeId, copyValues, keepIsWallet }: { keepId: string; removeId: string; copyValues: boolean; keepIsWallet?: boolean }) => {
      if (keepIsWallet) {
        const res = await apiRequest("POST", "/api/positions/resolve-to-wallet", {
          removePositionId: removeId,
          walletBalanceId: keepId,
        });
        return res.json();
      }
      if (copyValues) {
        const removePos = allPositions.find(p => p.id === removeId);
        if (removePos) {
          await apiRequest("PATCH", `/api/positions/${keepId}`, {
            averageCost: removePos.averageCost,
            totalCostBasis: removePos.totalCostBasis,
          });
        }
      }
      const res = await apiRequest("DELETE", `/api/positions/${removeId}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      const desc = data?.lotsTransferred > 0
        ? `Duplicate removed. ${data.lotsTransferred} purchase lot${data.lotsTransferred > 1 ? "s" : ""} transferred to wallet entry.`
        : "Duplicate removed. Your portfolio is updated.";
      toast({ title: "Resolved", description: desc });
    },
    onError: (error: Error) => {
      toast({ title: "Resolve failed", description: error.message, variant: "destructive" });
    },
  });

  const handleResolve = useCallback((keepId: string, removeId: string, copyValues: boolean, keepIsWallet?: boolean) => {
    resolveMutation.mutate({ keepId, removeId, copyValues, keepIsWallet });
  }, []);

  const [csvResult, setCsvResult] = useState<any>(null);

  const bulkRenameMutation = useMutation({
    mutationFn: async ({ fromLabel, toLabel }: { fromLabel: string; toLabel: string }) => {
      const res = await apiRequest("POST", "/api/wallets/bulk-rename", { fromLabel, toLabel });
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Wallets renamed", description: result.message });
    },
    onError: (error: Error) => {
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    },
  });

  const csvReconcileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reconcile/yahoo-csv-to-wallets");
      return res.json();
    },
    onSuccess: (result) => {
      setCsvResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({
        title: "Yahoo CSV Reconciled",
        description: `${result.summary.totalAssetsMatched} assets matched, ${result.summary.totalLotsCreated} purchase lots created`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "CSV reconciliation failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteYahooPositionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reconcile/delete-yahoo-positions");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({
        title: "Yahoo Import Positions Deleted",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete Yahoo positions", description: error.message, variant: "destructive" });
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
    const editingPos = allPositions.find(p => p.id === editingId);
    const isWalletEdit = editingPos?.isWallet;
    const avgCost = parseFloat(editForm.averageCost);

    if (isWalletEdit) {
      const qty = parseFloat(editingPos?.quantity || "0");
      const costBasis = isNaN(avgCost) ? 0 : qty * avgCost;
      editMutation.mutate({
        id: editingId,
        isWallet: true,
        data: {
          averageCost: editForm.averageCost,
          totalCostBasis: costBasis.toFixed(2),
        },
      });
    } else {
      const qty = parseFloat(editForm.quantity);
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
    }
  }, [editingId, editForm, allPositions]);

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

        <Card className="border-dashed border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-4 pb-4 px-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-500" />
                Merge LEDGERX → LEDGER
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rename all wallets labeled "LEDGERX" to "LEDGER" so they appear under one group.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
              onClick={() => bulkRenameMutation.mutate({ fromLabel: "LEDGERX", toLabel: "LEDGER" })}
              disabled={bulkRenameMutation.isPending}
              data-testid="button-bulk-rename"
            >
              {bulkRenameMutation.isPending ? (
                <RefreshCcw className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-1.5" />
              )}
              {bulkRenameMutation.isPending ? "Renaming..." : "Rename Wallets"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-4 pb-4 px-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                Yahoo Finance CSV Cost Basis Import
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Import purchase lots (dates, prices, quantities) from your Yahoo Finance CSV into wallet balances. Only populates wallets that don't already have cost basis data.
              </p>
              {csvResult && (
                <div className="mt-2 text-xs space-y-1">
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {csvResult.summary.totalAssetsMatched} assets matched · {csvResult.summary.totalLotsCreated} purchase lots created
                  </p>
                  {csvResult.skipped.length > 0 && (
                    <p className="text-muted-foreground">
                      Skipped {csvResult.skipped.length} (already had lots): {csvResult.skipped.map((s: any) => s.symbol).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => csvReconcileMutation.mutate()}
                disabled={csvReconcileMutation.isPending}
                data-testid="button-csv-reconcile"
              >
                {csvReconcileMutation.isPending ? (
                  <RefreshCcw className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                )}
                {csvReconcileMutation.isPending ? "Importing..." : "Import Cost Basis"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/50 text-red-600 hover:bg-red-500/10"
                onClick={() => {
                  if (window.confirm("Delete all Yahoo Finance Import positions? This removes the duplicate entries. Your tax lots and wallet balances are NOT affected.")) {
                    deleteYahooPositionsMutation.mutate();
                  }
                }}
                disabled={deleteYahooPositionsMutation.isPending}
                data-testid="button-delete-yahoo-positions"
              >
                {deleteYahooPositionsMutation.isPending ? (
                  <RefreshCcw className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                {deleteYahooPositionsMutation.isPending ? "Deleting..." : "Delete Yahoo Import Positions"}
              </Button>
            </div>
          </CardContent>
        </Card>

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
                            <span className="font-medium">This asset appears from multiple sources.</span>
                            {group.hasWalletAndExchange
                              ? " Your live data (blockchain/exchange) already tracks this holding. If you imported it via Yahoo/CSV, that import entry is likely a duplicate — review and remove it below."
                              : " Compare the entries below to identify duplicates. If one is from an old import and the asset is now tracked elsewhere, remove the import."}
                          </div>
                        </div>
                      )}

                      {group.positions.length >= 2 && !isMerging && (
                        <ComparisonTable
                          positions={group.positions}
                          onResolve={handleResolve}
                        />
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
                                    <div className="mt-2 space-y-2">
                                      {pos.isWallet && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                          <Shield className="h-3 w-3 text-emerald-500" />
                                          Quantity is live from the blockchain. Edit your average cost to calculate profit/loss.
                                        </div>
                                      )}
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div>
                                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Quantity</label>
                                          {pos.isWallet ? (
                                            <p className="text-sm font-medium mt-1.5 text-muted-foreground">
                                              {formatQty(parseFloat(pos.quantity || "0"))} <span className="text-[10px]">(live)</span>
                                            </p>
                                          ) : (
                                            <Input
                                              value={editForm.quantity}
                                              onChange={(e) => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                                              className="h-8 text-sm mt-0.5"
                                              data-testid="input-edit-quantity"
                                            />
                                          )}
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Cost (per unit)</label>
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
                                              (parseFloat(pos.isWallet ? pos.quantity : editForm.quantity) || 0) * (parseFloat(editForm.averageCost) || 0)
                                            )}
                                          </p>
                                        </div>
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

                                  {pos.isWallet && !isEditing && (
                                    <PurchaseLots
                                      walletBalanceId={pos.id}
                                      assetSymbol={pos.assetSymbol}
                                      liveQuantity={parseFloat(pos.quantity || "0")}
                                    />
                                  )}
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
                                        <TooltipContent className="text-xs">
                                          {pos.isWallet ? "Edit cost basis" : "Edit quantity & cost"}
                                        </TooltipContent>
                                      </Tooltip>
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
