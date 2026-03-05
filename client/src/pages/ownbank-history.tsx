import { useState, useEffect, useCallback } from "react";
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
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  getAccountTransactions,
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
  Link2,
  AlertCircle,
} from "lucide-react";

type TxFilter = "all" | "vault" | "payment" | "trustset";

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

function formatDate(isoDate: string): string {
  if (!isoDate) return "N/A";
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
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

  const fetchTransactions = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const txs = await getAccountTransactions(walletAddress, 50);
      setTransactions(txs);
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
            <h2 className="text-lg font-semibold" data-testid="text-connect-prompt">
              Wallet Not Connected
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              Connect your XRPL wallet from the Wallet & Yield page to view your
              on-chain transaction history.
            </p>
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
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#00A4E4]" />
            Transactions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as TxFilter)}
            >
              <SelectTrigger
                className="w-[160px]"
                data-testid="select-tx-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="vault">Vault Only</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="trustset">TrustSet</SelectItem>
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
                    <TableHead>Tx Hash</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
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
                        <TableCell>
                          <Badge variant={getTypeVariant(tx.type)} data-testid={`badge-tx-type-${tx.hash || index}`}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getDirectionIcon(tx, walletAddress)}
                            <span className="text-sm text-muted-foreground">
                              {isSent ? "Sent" : "Received"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm" data-testid={`text-tx-amount-${tx.hash || index}`}>
                            {Number(tx.amount).toLocaleString("en-US", {
                              maximumFractionDigits: 6,
                            })}{" "}
                            {tx.currency}
                          </span>
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
                          <span className="text-sm text-muted-foreground" data-testid={`text-tx-date-${tx.hash || index}`}>
                            {formatDate(tx.date)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.status === "Success" ? "outline" : "destructive"}
                            data-testid={`badge-tx-status-${tx.hash || index}`}
                          >
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <XrplDisclaimer />
    </div>
  );
}
