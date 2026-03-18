import { useState, useEffect, useCallback } from "react";
import { InlineXrplConnect } from "@/components/inline-xrpl-connect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  getAccountTransactions,
  getXrpPrice,
  SOIL_VAULTS,
  type XrplTransaction,
} from "@/lib/xrpl-client";
import {
  History,
  ExternalLink,
  RefreshCw,
  WalletCards,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Link2,
  AlertCircle,
  XCircle,
  SlidersHorizontal,
} from "lucide-react";

type TxFilter = "all" | "vault" | "payment" | "swap" | "trustset";

type ColumnKey = "hash" | "type" | "direction" | "amount" | "usdValue" | "fee" | "address" | "date" | "status";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "hash", label: "Tx Hash" },
  { key: "type", label: "Type" },
  { key: "direction", label: "Direction" },
  { key: "amount", label: "Amount" },
  { key: "usdValue", label: "USD Value" },
  { key: "fee", label: "Fee" },
  { key: "address", label: "Address" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

const DEFAULT_COLUMNS: ColumnKey[] = ["hash", "type", "direction", "amount", "usdValue", "fee", "address", "date", "status"];

const MOBILE_HIDDEN_COLUMNS: ColumnKey[] = ["fee", "address", "usdValue", "status"];

const STORAGE_KEY = "xrpl-history-columns";

function loadColumnPrefs(): ColumnKey[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ColumnKey[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_COLUMNS;
}

function saveColumnPrefs(cols: ColumnKey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

function truncateHash(hash: string): string {
  if (!hash) return "";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

function truncateAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDateShort(isoDate: string): string {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "N/A";
  }
}

function formatDateFull(isoDate: string): string {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

const vaultAddresses = SOIL_VAULTS.map((v) => v.address.toLowerCase());

function isVaultTransaction(tx: XrplTransaction): boolean {
  return (
    vaultAddresses.includes(tx.destination.toLowerCase()) ||
    vaultAddresses.includes(tx.source.toLowerCase())
  );
}

function getDirectionIcon(tx: XrplTransaction, walletAddress: string) {
  if (tx.source.toLowerCase() === walletAddress.toLowerCase()) {
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  }
  if (tx.destination.toLowerCase() === walletAddress.toLowerCase()) {
    return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
  }
  return <Link2 className="h-4 w-4 text-muted-foreground" />;
}

function getUsdValue(
  amount: string,
  currency: string,
  xrpPrice: number,
  amount2?: string,
  currency2?: string,
): { primary: number; secondary?: number; total: number } | null {
  if (!amount || !currency) return null;

  const toUsd = (val: string, cur: string) => {
    const num = Math.abs(Number(val));
    if (isNaN(num) || num === 0) return 0;
    if (cur === "XRP") return num * xrpPrice;
    if (cur === "RLUSD" || cur === "USD") return num;
    return 0;
  };

  const primary = toUsd(amount, currency);
  if (amount2 && currency2) {
    const secondary = toUsd(amount2, currency2);
    return { primary, secondary, total: Math.max(primary, secondary) };
  }
  return { primary, total: primary };
}

function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getTypeVariant(type: string): "default" | "secondary" | "outline" {
  switch (type) {
    case "Payment":
      return "default";
    case "TrustSet":
      return "secondary";
    default:
      return "outline";
  }
}

export default function OwnBankHistory() {
  const { walletAddress, isConnected } = useXrplStore();
  const [transactions, setTransactions] = useState<XrplTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TxFilter>("all");
  const [xrpPrice, setXrpPrice] = useState<number>(0);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(loadColumnPrefs);

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col];
      if (next.length === 0) return prev;
      saveColumnPrefs(next);
      return next;
    });
  };

  const isColumnVisible = (col: ColumnKey) => visibleColumns.includes(col);

  const fetchTransactions = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const [txs, price] = await Promise.all([
        getAccountTransactions(walletAddress, 50),
        getXrpPrice(),
      ]);
      setTransactions(txs);
      setXrpPrice(price);
    } catch {
      setError("Failed to fetch transactions from XRPL. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchTransactions();
    }
  }, [isConnected, walletAddress, fetchTransactions]);

  const filteredTransactions = transactions.filter((tx) => {
    switch (filter) {
      case "vault":
        return isVaultTransaction(tx);
      case "payment":
        return tx.type === "Payment";
      case "swap":
        return tx.type === "OfferCreate";
      case "trustset":
        return tx.type === "TrustSet";
      default:
        return true;
    }
  });

  if (!isConnected || !walletAddress) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-history-title">
            XRPL Wallet History
          </h1>
          <p className="text-muted-foreground">
            On-chain activity from your connected XRPL wallet
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <WalletCards className="h-12 w-12 text-muted-foreground" />
            <InlineXrplConnect />
          </CardContent>
        </Card>
        <XrplDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-history-title">
            XRPL Wallet History
          </h1>
          <p className="text-muted-foreground">
            On-chain transactions for{" "}
            <span className="font-mono text-foreground">
              {truncateAddress(walletAddress)}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTransactions}
          disabled={isLoading}
          data-testid="button-refresh-history"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#00A4E4]" />
            Transactions
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-column-picker">
                  <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Columns</span>
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
                    checked={isColumnVisible(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    data-testid={`toggle-col-${col.key}`}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as TxFilter)}
            >
              <SelectTrigger
                className="w-[130px] sm:w-[160px]"
                data-testid="select-tx-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="vault">Vault Only</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="swap">Swaps</SelectItem>
                <SelectItem value="trustset">Trust Lines</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3" data-testid="loading-skeleton">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-3"
              data-testid="text-error-message"
            >
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-muted-foreground text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTransactions}
                data-testid="button-retry"
              >
                Try Again
              </Button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-3"
              data-testid="text-no-transactions"
            >
              <History className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                {filter === "all"
                  ? "No transactions found for this wallet."
                  : "No matching transactions found. Try a different filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isColumnVisible("hash") && <TableHead>Tx Hash</TableHead>}
                    {isColumnVisible("type") && <TableHead>Type</TableHead>}
                    {isColumnVisible("direction") && <TableHead className="hidden sm:table-cell">Direction</TableHead>}
                    {isColumnVisible("amount") && <TableHead>Amount</TableHead>}
                    {isColumnVisible("usdValue") && <TableHead className="text-right hidden sm:table-cell">USD Value</TableHead>}
                    {isColumnVisible("fee") && <TableHead className="text-right hidden md:table-cell">Fee</TableHead>}
                    {isColumnVisible("address") && <TableHead className="hidden md:table-cell">Address</TableHead>}
                    {isColumnVisible("date") && <TableHead>Date</TableHead>}
                    {isColumnVisible("status") && <TableHead className="hidden sm:table-cell">Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx, index) => {
                    const isSent =
                      tx.source.toLowerCase() === walletAddress.toLowerCase();
                    const counterparty = isSent ? tx.destination : tx.source;

                    return (
                      <TableRow
                        key={tx.hash || index}
                        data-testid={`row-tx-${tx.hash || index}`}
                      >
                        {isColumnVisible("hash") && (
                          <TableCell>
                            <a
                              href={`https://xrplscan.com/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono text-sm text-[#00A4E4] hover:underline"
                              data-testid={`link-tx-hash-${tx.hash || index}`}
                            >
                              {truncateHash(tx.hash)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                        )}
                        {isColumnVisible("type") && (
                          <TableCell>
                            <Badge variant={getTypeVariant(tx.type)} data-testid={`badge-tx-type-${tx.hash || index}`}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                        )}
                        {isColumnVisible("direction") && (
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1">
                              {tx.type === "OfferCreate" ? (
                                <>
                                  <ArrowLeftRight className="h-4 w-4 text-[#00A4E4]" />
                                  <span className="text-sm text-muted-foreground">Swap</span>
                                </>
                              ) : tx.type === "TrustSet" ? (
                                <>
                                  <Link2 className="h-4 w-4 text-amber-500" />
                                  <span className="text-sm text-muted-foreground">Trust Line</span>
                                </>
                              ) : tx.type === "OfferCancel" ? (
                                <>
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Cancel</span>
                                </>
                              ) : (
                                <>
                                  {getDirectionIcon(tx, walletAddress)}
                                  <span className="text-sm text-muted-foreground">
                                    {isSent ? "Sent" : "Received"}
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible("amount") && (
                          <TableCell>
                            <div className="font-mono text-sm" data-testid={`text-tx-amount-${tx.hash || index}`}>
                              {tx.type === "OfferCreate" && tx.amount2 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-red-500">
                                    -{Number(tx.amount).toLocaleString("en-US", { maximumFractionDigits: 6 })} {tx.currency}
                                  </span>
                                  <span className="text-emerald-600">
                                    +{Number(tx.amount2).toLocaleString("en-US", { maximumFractionDigits: 6 })} {tx.currency2}
                                  </span>
                                </div>
                              ) : tx.type === "TrustSet" ? (
                                <span className="text-muted-foreground">
                                  {tx.currency || "—"} trust line
                                </span>
                              ) : tx.type === "OfferCancel" ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span>
                                  {Number(tx.amount).toLocaleString("en-US", { maximumFractionDigits: 6 })} {tx.currency}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible("usdValue") && (
                          <TableCell className="text-right hidden sm:table-cell">
                            {(() => {
                              if (tx.type === "TrustSet" || tx.type === "OfferCancel") {
                                return <span className="text-muted-foreground font-mono text-sm">—</span>;
                              }
                              const usd = getUsdValue(tx.amount, tx.currency, xrpPrice, tx.amount2, tx.currency2);
                              if (!usd || usd.total === 0) {
                                return <span className="text-muted-foreground font-mono text-sm">—</span>;
                              }
                              if (tx.type === "OfferCreate" && usd.secondary !== undefined) {
                                return (
                                  <div className="flex flex-col gap-0.5 font-mono text-sm" data-testid={`text-tx-usd-${tx.hash || index}`}>
                                    <span className="text-red-500">{formatUsd(usd.primary)}</span>
                                    <span className="text-emerald-600">{formatUsd(usd.secondary)}</span>
                                  </div>
                                );
                              }
                              return (
                                <span
                                  className={`font-mono text-sm ${isSent ? "text-red-500" : "text-emerald-600"}`}
                                  data-testid={`text-tx-usd-${tx.hash || index}`}
                                >
                                  {formatUsd(usd.total)}
                                </span>
                              );
                            })()}
                          </TableCell>
                        )}
                        {isColumnVisible("fee") && (
                          <TableCell className="text-right hidden md:table-cell">
                            <span className="font-mono text-xs text-muted-foreground" data-testid={`text-tx-fee-${tx.hash || index}`}>
                              {tx.fee && Number(tx.fee) > 0
                                ? `${Number(tx.fee).toFixed(6)} XRP`
                                : "—"}
                            </span>
                          </TableCell>
                        )}
                        {isColumnVisible("address") && (
                          <TableCell className="hidden md:table-cell">
                            {counterparty ? (
                              <a
                                href={`https://xrplscan.com/account/${counterparty}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-muted-foreground hover:underline"
                                data-testid={`link-tx-address-${tx.hash || index}`}
                              >
                                {truncateAddress(counterparty)}
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                --
                              </span>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("date") && (
                          <TableCell>
                            <span className="text-sm text-muted-foreground" data-testid={`text-tx-date-${tx.hash || index}`}>
                              <span className="sm:hidden">{formatDateShort(tx.date)}</span>
                              <span className="hidden sm:inline">{formatDateFull(tx.date)}</span>
                            </span>
                          </TableCell>
                        )}
                        {isColumnVisible("status") && (
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={tx.status === "Success" ? "outline" : "destructive"}
                              data-testid={`badge-tx-status-${tx.hash || index}`}
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {xrpPrice > 0 && isColumnVisible("usdValue") && (
        <p className="text-xs text-muted-foreground text-right" data-testid="text-xrp-price-note">
          USD values based on current XRP price: ${xrpPrice.toFixed(4)}
        </p>
      )}

      <XrplDisclaimer />
    </div>
  );
}
