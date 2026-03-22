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
  quantity: z.string().min(1, "Enter quantity"),
  pricePerUnit: z.string().min(1, "Enter price"),
  transactionDate: z.string().min(1, "Select date"),
  notes: z.string().optional(),
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
  direction: "sent" | "received" | "swap" | "trust" | "cancel" | "buy" | "sell" | "income" | "transfer";
  hash?: string;
  usdValue?: number;
  amount2?: string;
  currency2?: string;
}

type ColumnKey = "date" | "type" | "direction" | "asset" | "quantity" | "price" | "total" | "usdValue" | "fee" | "source" | "hash";

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
  { key: "source", label: "Source" },
  { key: "hash", label: "Tx Link" },
];

const DEFAULT_COLUMNS: ColumnKey[] = ["date", "type", "direction", "asset", "quantity", "price", "total", "fee", "source"];


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
    direction: isSent ? "sent" : "received",
    hash: tx.hash,
    usdValue: toUsd(amount, currency),
  };
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
    direction: directionMap[tx.transactionType] || "buy",
    hash: tx.externalId || undefined,
  };
}

export default function Transactions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        getAccountTransactions(walletAddress, 50),
        getXrpPrice(),
      ]);
      setXrplTransactions(txs);
      setXrpPrice(price);
    } catch {
      // silently fail — XRPL data is supplementary
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
      quantity: "",
      pricePerUnit: "",
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      return apiRequest("POST", "/api/transactions", {
        ...values,
        transactionDate: values.transactionDate + "T12:00:00",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Transaction added successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add transaction", variant: "destructive" });
    },
  });

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
    createMutation.mutate(values);
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-transaction">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>
                  Record a new buy or sell transaction
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-transaction-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="buy">Buy</SelectItem>
                              <SelectItem value="sell">Sell</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-transaction"
                    >
                      {createMutation.isPending ? "Adding..." : "Add Transaction"}
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
              <p className="text-sm text-muted-foreground mt-1">
                Connect an exchange or XRPL wallet, or add a transaction manually.
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
                    {isCol("source") && <TableHead className="hidden sm:table-cell">Source</TableHead>}
                    {isCol("hash") && <TableHead>Tx Link</TableHead>}
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
    </div>
  );
}
