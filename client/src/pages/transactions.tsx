import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserData } from "@/hooks/use-user-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  getAccountTransactions,
  getXrpPrice,
  type XrplTransaction,
} from "@/lib/xrpl-client";
import {
  Plus,
  Search,
  Filter,
  Download,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  SlidersHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import type { Transaction, Account } from "@shared/schema";

interface SubscriptionLimits {
  tier: string;
  exchanges: { limit: number | null; used: number };
  wallets: { limit: number | null; used: number };
  alerts: { limit: number | null; used: number };
  transactionHistoryDays: number | null;
  csvImport: boolean;
  taxReports: boolean;
  autoWithdraw: boolean;
}

const transactionFormSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  assetSymbol: z.string().min(1, "Enter asset symbol").toUpperCase(),
  transactionType: z.enum(["buy", "sell"]),
  disposalType: z.enum(["sale", "swap", "send"]).optional(),
  quantity: z.string().min(1, "Enter quantity"),
  pricePerUnit: z.string().min(1, "Enter price"),
  transactionDate: z.string().min(1, "Select date"),
  notes: z.string().optional(),
  swapToSymbol: z.string().optional(),
  swapToQuantity: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.transactionType === "sell" && val.disposalType === "swap") {
    if (!val.swapToSymbol || val.swapToSymbol.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["swapToSymbol"], message: "Enter the coin you received" });
    }
    if (!val.swapToQuantity || !(parseFloat(val.swapToQuantity) > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["swapToQuantity"], message: "Enter how much you received" });
    }
  }
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface UnifiedTransaction {
  id: string;
  date: Date;
  type: string;
  asset: string;
  quantity: number;
  price: number;
  total: number;
  fee: number;
  source: string;
  accountName?: string;
  direction: "sent" | "received" | "swap" | "trust" | "cancel" | "buy" | "sell" | "income" | "transfer";
  hash?: string;
  usdValue?: number;
  amount2?: string;
  currency2?: string;
  reviewStatus?: string | null;
  notes?: string | null;
}

type ColumnKey = "date" | "type" | "direction" | "asset" | "quantity" | "price" | "total" | "usdValue" | "fee" | "source" | "account" | "hash";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "type", label: "Type" },
  { key: "direction", label: "Direction" },
  { key: "asset", label: "Asset" },
  { key: "quantity", label: "Quantity" },
  { key: "price", label: "Price" },
  { key: "total", label: "Total" },
  { key: "usdValue", label: "USD Value" },
  { key: "fee", label: "Fee" },
  { key: "account", label: "Account" },
  { key: "source", label: "Source" },
  { key: "hash", label: "Tx Link" },
];

const DEFAULT_COLUMNS: ColumnKey[] = ["date", "type", "direction", "asset", "quantity", "price", "total", "fee", "account", "source"];


function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const getProviderLabel = (provider: string) => {
  const labels: Record<string, string> = {
    binance: "Binance",
    binance_us: "Binance.US",
    coinbase: "Coinbase",
    crypto_com: "Crypto.com",
    kraken: "Kraken",
    uphold: "Uphold",
    gemini: "Gemini",
    kucoin: "KuCoin",
    bybit: "Bybit",
    okx: "OKX",
    nexo: "Nexo",
    "soil-xrpl": "Soil Protocol",
    manual: "Manual Entry",
    xrpl: "XRPL Wallet",
  };
  return labels[provider] || provider;
};

function xrplTxToUnified(tx: XrplTransaction, walletAddress: string, xrpPrice: number): UnifiedTransaction | null {
  if (tx.type === "TrustSet" || tx.type === "OfferCancel") return null;

  const isSent = tx.source.toLowerCase() === walletAddress.toLowerCase();
  const amount = Math.abs(Number(tx.amount));
  const currency = tx.currency || "XRP";

  const toUsd = (val: number, cur: string) => {
    if (cur === "XRP") return val * xrpPrice;
    if (cur === "RLUSD" || cur === "USD") return val;
    return 0;
  };

  if (tx.type === "OfferCreate") {
    const amount2Num = tx.amount2 ? Math.abs(Number(tx.amount2)) : 0;
    return {
      id: `xrpl-${tx.hash}`,
      date: new Date(tx.date),
      type: "swap",
      asset: `${currency} → ${tx.currency2 || "?"}`,
      quantity: amount,
      price: 0,
      total: toUsd(amount, currency),
      fee: tx.fee ? Number(tx.fee) : 0,
      source: "xrpl",
      accountName: "XRPL On-Ledger",
      direction: "swap",
      hash: tx.hash,
      usdValue: toUsd(amount2Num, tx.currency2 || ""),
      amount2: tx.amount2,
      currency2: tx.currency2,
    };
  }

  return {
    id: `xrpl-${tx.hash}`,
    date: new Date(tx.date),
    type: "payment",
    asset: currency,
    quantity: amount,
    price: toUsd(1, currency),
    total: toUsd(amount, currency),
    fee: tx.fee ? Number(tx.fee) : 0,
    source: "xrpl",
    accountName: "XRPL On-Ledger",
    direction: isSent ? "sent" : "received",
    hash: tx.hash,
    usdValue: toUsd(amount, currency),
  };
}

function extractMessage(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : "";
  const m = raw.match(/^\d+:\s*([\s\S]*)$/);
  if (m) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed && typeof parsed.message === "string") return parsed.message;
    } catch {}
  }
  return fallback;
}

function dbTxToUnified(tx: Transaction, accounts: Account[]): UnifiedTransaction {
  const account = accounts.find((a) => a.id === tx.accountId);
  const source = account?.provider || "manual";
  const directionMap: Record<string, UnifiedTransaction["direction"]> = {
    buy: "buy",
    sell: "sell",
    income: "income",
    transfer_out: "transfer",
  };

  return {
    id: tx.id,
    date: new Date(tx.transactionDate),
    type: tx.transactionType,
    asset: tx.assetSymbol,
    quantity: parseFloat(tx.quantity),
    price: parseFloat(tx.pricePerUnit),
    total: parseFloat(tx.totalValue),
    fee: parseFloat(tx.fee || "0"),
    source,
    accountName: account?.accountName || undefined,
    direction: directionMap[tx.transactionType] || "buy",
    hash: tx.externalId || undefined,
    reviewStatus: tx.reviewStatus,
    notes: tx.notes,
  };
}

const REVIEW_OPTIONS: { value: string; label: string; help: string }[] = [
  { value: "vault_deposit", label: "Deposit into a yield vault", help: "Moving coins into a vault — not a sale, no tax." },
  { value: "own_transfer", label: "Transfer to my own wallet", help: "Sending to another wallet you control — not a sale, no tax." },
  { value: "sale", label: "A sale", help: "You sold this for cash — counts as a taxable sale." },
  { value: "swap", label: "A swap for another coin", help: "You traded it for a different coin — a taxable disposal." },
];

export default function Transactions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTx, setDeletingTx] = useState<UnifiedTransaction | null>(null);
  const [reviewingTx, setReviewingTx] = useState<UnifiedTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const { data: visibleColumns, save: saveColumnPrefs } = useUserData<ColumnKey[]>("transactions_columns", DEFAULT_COLUMNS);
  const [xrplTransactions, setXrplTransactions] = useState<XrplTransaction[]>([]);
  const [xrpPrice, setXrpPrice] = useState<number>(0);
  const [xrplLoading, setXrplLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { walletAddress, isConnected } = useXrplStore();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: limits } = useQuery<SubscriptionLimits>({
    queryKey: ["/api/subscription/limits"],
  });

  const isHistoryLimited = limits?.transactionHistoryDays === 30;

  const fetchXrplTxs = useCallback(async () => {
    if (!walletAddress || !isConnected) return;
    setXrplLoading(true);
    try {
      const [txs, price] = await Promise.all([
        getAccountTransactions(walletAddress, 100),
        getXrpPrice(),
      ]);
      setXrplTransactions(txs);
      setXrpPrice(price);
    } catch {
    } finally {
      setXrplLoading(false);
    }
  }, [walletAddress, isConnected]);

  useEffect(() => {
    fetchXrplTxs();
  }, [fetchXrplTxs]);

  const toggleColumn = (col: ColumnKey) => {
    const next = visibleColumns.includes(col) ? visibleColumns.filter((c) => c !== col) : [...visibleColumns, col];
    if (next.length === 0) return;
    saveColumnPrefs(next);
  };

  const isCol = (col: ColumnKey) => visibleColumns.includes(col);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      accountId: "manual",
      assetSymbol: "",
      transactionType: "buy",
      disposalType: "sale",
      quantity: "",
      pricePerUnit: "",
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      swapToSymbol: "",
      swapToQuantity: "",
    },
  });

  const invalidateTxQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tax-report"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tax/harvest-scan"] });
    queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      return apiRequest("POST", "/api/transactions", {
        ...values,
        transactionDate: values.transactionDate + "T12:00:00",
      });
    },
    onSuccess: (_data, values) => {
      invalidateTxQueries();
      toast({
        title:
          values.transactionType === "sell"
            ? values.disposalType === "swap"
              ? "Swap recorded — old coin's gain/loss logged and the new coin added to your holdings"
              : "Sale recorded — gain/loss added to your tax report"
            : "Transaction added successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (e) => {
      toast({ title: extractMessage(e, "Failed to add transaction"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TransactionFormValues }) => {
      return apiRequest("PATCH", `/api/transactions/${id}`, {
        quantity: values.quantity,
        pricePerUnit: values.pricePerUnit,
        transactionDate: values.transactionDate + "T12:00:00",
        notes: values.notes,
      });
    },
    onSuccess: () => {
      invalidateTxQueries();
      toast({ title: "Transaction updated" });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (e) => {
      toast({ title: extractMessage(e, "Couldn't update this transaction"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/transactions/${id}`),
    onSuccess: () => {
      invalidateTxQueries();
      toast({ title: "Transaction deleted" });
      setDeletingTx(null);
    },
    onError: (e) => {
      toast({ title: extractMessage(e, "Couldn't delete this transaction"), variant: "destructive" });
      setDeletingTx(null);
    },
  });

  const resolveReviewMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) =>
      apiRequest("POST", `/api/transactions/${id}/resolve-review`, { category }),
    onSuccess: () => {
      invalidateTxQueries();
      toast({ title: "Thanks — we've updated this transfer." });
      setReviewingTx(null);
    },
    onError: (e) => {
      toast({ title: extractMessage(e, "Couldn't update this transfer"), variant: "destructive" });
    },
  });

  const flagImportedMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/transactions/flag-imported-sells"),
    onSuccess: async (res) => {
      const data = await res.json().catch(() => ({ flagged: 0 }));
      invalidateTxQueries();
      toast({
        title: data.flagged > 0
          ? `${data.flagged} imported transfer${data.flagged === 1 ? "" : "s"} moved to review`
          : "Nothing to review — your imported transfers look fine.",
      });
    },
    onError: (e) => {
      toast({ title: extractMessage(e, "Couldn't check imported sales"), variant: "destructive" });
    },
  });

  const isEditable = (tx: UnifiedTransaction) =>
    !tx.id.startsWith("xrpl-") && (tx.source === "manual" || tx.source.endsWith("_import"));

  const openEdit = (tx: UnifiedTransaction) => {
    setEditingId(tx.id);
    form.reset({
      accountId: "manual",
      assetSymbol: tx.asset,
      transactionType: tx.direction === "sell" ? "sell" : "buy",
      disposalType: "sale",
      quantity: String(tx.quantity),
      pricePerUnit: String(tx.price),
      transactionDate: format(tx.date, "yyyy-MM-dd"),
      notes: "",
      swapToSymbol: "",
      swapToQuantity: "",
    });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sellAsset = params.get("sell");
    if (sellAsset) {
      setEditingId(null);
      form.reset({
        accountId: params.get("acct") || "manual",
        assetSymbol: sellAsset.toUpperCase(),
        transactionType: "sell",
        disposalType: "sale",
        quantity: params.get("qty") || "",
        pricePerUnit: params.get("price") || "",
        transactionDate: format(new Date(), "yyyy-MM-dd"),
        notes: "",
        swapToSymbol: "",
        swapToQuantity: "",
      });
      setIsDialogOpen(true);
      window.history.replaceState({}, "", "/transactions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dbExternalIds = new Set(
    transactions.filter((t) => t.externalId).map((t) => t.externalId)
  );

  const unifiedDb = transactions.map((tx) => dbTxToUnified(tx, accounts));
  const unifiedXrpl = xrplTransactions
    .map((tx) => xrplTxToUnified(tx, walletAddress || "", xrpPrice))
    .filter((tx): tx is UnifiedTransaction => tx !== null)
    .filter((tx) => !tx.hash || !dbExternalIds.has(tx.hash));

  const allUnified = [...unifiedDb, ...unifiedXrpl].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const pendingReview = unifiedDb.filter((tx) => tx.reviewStatus === "pending");
  const importedSellsToFlag = unifiedDb.filter(
    (tx) =>
      tx.type === "sell" &&
      tx.reviewStatus !== "pending" &&
      typeof tx.notes === "string" &&
      (tx.notes.startsWith("Imported from") || tx.notes.includes("(auto-synced)")),
  );

  const sourceOptions = (() => {
    const sources = new Set<string>();
    allUnified.forEach((tx) => sources.add(tx.source));
    return Array.from(sources);
  })();

  const filteredTransactions = allUnified.filter((tx) => {
    const matchesSearch = tx.asset.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      typeFilter === "all" ||
      tx.type === typeFilter ||
      tx.direction === typeFilter;
    const matchesSource = sourceFilter === "all" || tx.source === sourceFilter;
    return matchesSearch && matchesType && matchesSource;
  });

  const onSubmit = (values: TransactionFormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/transactions/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Transactions exported successfully" });
    } catch {
      toast({ title: "Failed to export transactions", variant: "destructive" });
    }
  };

  const getDirectionBadge = (tx: UnifiedTransaction) => {
    const config: Record<string, { label: string; className: string }> = {
      buy: { label: "BUY", className: "bg-chart-2 text-white" },
      sell: { label: "SELL", className: "bg-chart-5 text-white" },
      income: { label: "INCOME", className: "bg-amber-500 text-white" },
      transfer: { label: "TRANSFER", className: "bg-blue-500 text-white" },
      sent: { label: "SENT", className: "bg-red-500 text-white" },
      received: { label: "RECEIVED", className: "bg-emerald-600 text-white" },
      swap: { label: "SWAP", className: "bg-[#00A4E4] text-white" },
      trust: { label: "TRUST", className: "" },
      cancel: { label: "CANCEL", className: "" },
    };
    if (tx.reviewStatus === "pending") {
      return (
        <Badge variant="default" className="bg-amber-500 text-white">
          NEEDS REVIEW
        </Badge>
      );
    }
    const c = config[tx.direction] || { label: tx.type.toUpperCase(), className: "" };
    return (
      <Badge variant="default" className={c.className}>
        {c.label}
      </Badge>
    );
  };

  const getDirectionIcon = (tx: UnifiedTransaction) => {
    if (tx.direction === "swap") return <ArrowLeftRight className="h-4 w-4 text-[#00A4E4]" />;
    if (tx.direction === "sent" || tx.direction === "sell" || tx.direction === "transfer")
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
  };

  const anyLoading = isLoading || xrplLoading;

  return (
    <div className="space-y-6">
      {isHistoryLimited && (
        <UpgradePrompt
          compact
          feature="Showing last 7 days of transactions. Upgrade to Premium for complete history."
        />
      )}

      {pendingReview.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30" data-testid="card-review-banner">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {pendingReview.length} outgoing transfer{pendingReview.length === 1 ? "" : "s"} need{pendingReview.length === 1 ? "s" : ""} your label
                </p>
                <p className="text-sm text-muted-foreground">
                  We couldn't tell if {pendingReview.length === 1 ? "this was" : "these were"} a sale or just you moving your own coins. Until you label {pendingReview.length === 1 ? "it" : "them"}, {pendingReview.length === 1 ? "it" : "they"} won't count as a taxable sale.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {pendingReview.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                  data-testid={`row-review-${tx.id}`}
                >
                  <div className="text-sm">
                    <span className="font-medium">{tx.quantity} {tx.asset}</span>
                    <span className="text-muted-foreground ml-2">{format(tx.date, "MMM d, yyyy")}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setReviewingTx(tx)}
                    data-testid={`button-review-${tx.id}`}
                  >
                    Label this
                  </Button>
                </div>
              ))}
              {pendingReview.length > 8 && (
                <p className="text-xs text-muted-foreground">…and {pendingReview.length - 8} more below in the table.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingReview.length === 0 && importedSellsToFlag.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30" data-testid="card-flag-imported-banner">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Check your imported sales</p>
                <p className="text-sm text-muted-foreground">
                  We found {importedSellsToFlag.length} auto-imported transfer{importedSellsToFlag.length === 1 ? "" : "s"} marked as a sale. Some of these may have been vault deposits or moves between your own wallets. Review them so they don't get taxed by mistake.
                </p>
              </div>
            </div>
            <Button
              onClick={() => flagImportedMutation.mutate()}
              disabled={flagImportedMutation.isPending}
              data-testid="button-flag-imported"
              className="shrink-0"
            >
              {flagImportedMutation.isPending ? "Checking…" : "Review imported sales"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            All trades across exchanges, XRPL wallet, Soil vaults, and manual entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-testid="button-export-transactions"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingId(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                data-testid="button-add-transaction"
                onClick={() => {
                  setEditingId(null);
                  form.reset();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Update the amount, price, or date for this entry. To change the asset or type, delete it and add a new one."
                    : "Record a new buy or sell transaction"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!editingId}>
                          <FormControl>
                            <SelectTrigger data-testid="select-account">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manual">Manual Entry</SelectItem>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.accountName || account.provider}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="assetSymbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Symbol</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="BTC, ETH, AAPL..."
                              {...field}
                              disabled={!!editingId}
                              data-testid="input-asset-symbol"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transactionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!!editingId}>
                            <FormControl>
                              <SelectTrigger data-testid="select-transaction-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="buy">Buy</SelectItem>
                              <SelectItem value="sell">Sell / Swap</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch("transactionType") === "buy" && (
                    <div className="rounded-md border border-border bg-muted/40 p-4">
                      <p className="text-sm text-muted-foreground" data-testid="text-buy-explainer">
                        This is your <strong>original purchase</strong> — it records what you paid
                        (your cost basis). Enter how much you bought, the price you paid per coin,
                        and the date you bought it. When you later sell or swap, add that as a
                        separate <strong>Sell / Swap</strong> entry and we'll match it back to this
                        purchase automatically to work out your gain or loss. You don't reopen this
                        entry.
                      </p>
                    </div>
                  )}

                  {form.watch("transactionType") === "sell" && (
                    <div className="space-y-4 rounded-md border border-border bg-muted/40 p-4">
                      <FormField
                        control={form.control}
                        name="disposalType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What happened to it?</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "sale"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-disposal-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sale">Sold for cash / stablecoin</SelectItem>
                                <SelectItem value="swap">Swapped into another coin</SelectItem>
                                <SelectItem value="send">Sent / spent it</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-sm text-muted-foreground" data-testid="text-sell-explainer">
                        Enter how much you sold and the price each coin was worth at the time of the
                        sale or swap, plus the date. We'll match it against your purchase history ({" "}
                        {form.watch("disposalType") === "swap" ? "swap" : "sale"} date order) and add
                        the gain or loss to your tax report automatically.
                        {form.watch("disposalType") === "swap"
                          ? " Tell us the coin you received below and we'll create that new holding for you in one step — its cost basis is set to the value of what you gave up."
                          : ""}
                      </p>

                      {form.watch("disposalType") === "swap" && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="swapToSymbol"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Coin you received</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g. ETH"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-swap-to-symbol"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="swapToQuantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount you received</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="any"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-swap-to-quantity"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              {...field}
                              data-testid="input-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricePerUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Unit ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              {...field}
                              data-testid="input-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="transactionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Add any notes..."
                            {...field}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingId(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-transaction"
                    >
                      {editingId
                        ? updateMutation.isPending
                          ? "Saving..."
                          : "Save Changes"
                        : createMutation.isPending
                          ? "Adding..."
                          : "Add Transaction"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-transactions"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-column-picker">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Columns
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {visibleColumns.length}/{ALL_COLUMNS.length}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ALL_COLUMNS.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={isCol(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      data-testid={`toggle-col-${col.key}`}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[100px] sm:w-[120px]" data-testid="select-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="swap">Swap</SelectItem>
                </SelectContent>
              </Select>
              {sourceOptions.length > 1 && (
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[120px] sm:w-[150px]" data-testid="select-source-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sourceOptions.map((src) => (
                      <SelectItem key={src} value={src}>
                        {getProviderLabel(src)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {anyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium">No transactions yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Connect an exchange or XRPL wallet, or add a transaction manually. The more of
                your buying and selling that's recorded here — along with what you paid — the
                more complete and accurate your portfolio and tax reports become.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isCol("date") && <TableHead>Date</TableHead>}
                    {isCol("type") && <TableHead>Type</TableHead>}
                    {isCol("direction") && <TableHead className="hidden sm:table-cell">Direction</TableHead>}
                    {isCol("asset") && <TableHead>Asset</TableHead>}
                    {isCol("quantity") && <TableHead className="text-right">Qty</TableHead>}
                    {isCol("price") && <TableHead className="hidden sm:table-cell text-right">Price</TableHead>}
                    {isCol("total") && <TableHead className="hidden sm:table-cell text-right">Total</TableHead>}
                    {isCol("usdValue") && <TableHead className="text-right">USD Value</TableHead>}
                    {isCol("fee") && <TableHead className="hidden sm:table-cell text-right">Fee</TableHead>}
                    {isCol("account") && <TableHead className="hidden sm:table-cell">Account</TableHead>}
                    {isCol("source") && <TableHead className="hidden sm:table-cell">Source</TableHead>}
                    {isCol("hash") && <TableHead>Tx Link</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`transaction-row-${tx.id}`}>
                      {isCol("date") && (
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          <span className="sm:hidden">{format(tx.date, "MMM d")}</span>
                          <span className="hidden sm:inline">{format(tx.date, "MMM d, yyyy")}</span>
                        </TableCell>
                      )}
                      {isCol("type") && (
                        <TableCell>{getDirectionBadge(tx)}</TableCell>
                      )}
                      {isCol("direction") && (
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            {getDirectionIcon(tx)}
                            <span className="text-sm text-muted-foreground capitalize">
                              {tx.direction}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {isCol("asset") && (
                        <TableCell className="font-medium">{tx.asset}</TableCell>
                      )}
                      {isCol("quantity") && (
                        <TableCell className="text-right font-mono">
                          {tx.quantity > 0 ? tx.quantity.toLocaleString("en-US", { maximumFractionDigits: isMobile ? 2 : 6 }) : "—"}
                        </TableCell>
                      )}
                      {isCol("price") && (
                        <TableCell className="hidden sm:table-cell text-right font-mono">
                          {tx.price > 0 ? formatUsd(tx.price) : "—"}
                        </TableCell>
                      )}
                      {isCol("total") && (
                        <TableCell className="hidden sm:table-cell text-right font-mono font-medium">
                          {tx.total > 0 ? formatUsd(tx.total) : "—"}
                        </TableCell>
                      )}
                      {isCol("usdValue") && (
                        <TableCell className="text-right font-mono">
                          {tx.usdValue && tx.usdValue > 0 ? (
                            <span className={cn(
                              tx.direction === "sent" || tx.direction === "sell" ? "text-red-500" : "text-emerald-600"
                            )}>
                              {formatUsd(tx.usdValue)}
                            </span>
                          ) : tx.total > 0 ? (
                            formatUsd(tx.total)
                          ) : "—"}
                        </TableCell>
                      )}
                      {isCol("fee") && (
                        <TableCell className="hidden sm:table-cell text-right">
                          <span className="font-mono text-xs text-muted-foreground">
                            {tx.fee > 0
                              ? tx.source === "xrpl"
                                ? `${tx.fee.toFixed(6)} XRP`
                                : formatUsd(tx.fee)
                              : "—"}
                          </span>
                        </TableCell>
                      )}
                      {isCol("account") && (
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground" data-testid={`account-name-${tx.id}`}>
                            {tx.accountName || "—"}
                          </span>
                        </TableCell>
                      )}
                      {isCol("source") && (
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {getProviderLabel(tx.source)}
                          </Badge>
                        </TableCell>
                      )}
                      {isCol("hash") && (
                        <TableCell>
                          {tx.hash ? (
                            <a
                              href={
                                tx.source === "xrpl"
                                  ? `https://xrplscan.com/tx/${tx.hash}`
                                  : "#"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[#00A4E4] hover:underline"
                              data-testid={`link-tx-${tx.id}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {isEditable(tx) ? (
                          <div className="flex justify-end gap-1">
                            {(tx.direction === "buy" || tx.direction === "income") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(tx)}
                                data-testid={`button-edit-${tx.id}`}
                                aria-label="Edit transaction"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingTx(tx)}
                              data-testid={`button-delete-${tx.id}`}
                              aria-label="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && xrpPrice > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          XRP USD values based on current price: {formatUsd(xrpPrice)}
        </p>
      )}

      <AlertDialog open={!!deletingTx} onOpenChange={(open) => !open && setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTx
                ? `This removes your ${deletingTx.direction === "sell" ? "sale" : "purchase"} of ${deletingTx.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${deletingTx.asset}. ${
                    deletingTx.direction === "sell"
                      ? "The matching gain or loss will be removed from your tax report and the coins put back into your holdings."
                      : "Its cost basis will be removed from your holdings and tax reports. This can't be undone."
                  }`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deletingTx) deleteMutation.mutate(deletingTx.id);
              }}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!reviewingTx} onOpenChange={(open) => !open && setReviewingTx(null)}>
        <DialogContent data-testid="dialog-review">
          <DialogHeader>
            <DialogTitle>What was this transfer?</DialogTitle>
            <DialogDescription>
              {reviewingTx
                ? `You sent ${reviewingTx.quantity} ${reviewingTx.asset} on ${format(reviewingTx.date, "MMM d, yyyy")}. Tell us what it was so we tax it correctly.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {REVIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={resolveReviewMutation.isPending}
                onClick={() =>
                  reviewingTx &&
                  resolveReviewMutation.mutate({ id: reviewingTx.id, category: opt.value })
                }
                className="w-full text-left rounded-md border p-3 hover-elevate active-elevate-2 disabled:opacity-50"
                data-testid={`button-review-option-${opt.value}`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.help}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
