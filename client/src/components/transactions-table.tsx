import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { safeParseDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Transaction } from "@shared/schema";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
  limit?: number;
}

export function TransactionsTable({
  transactions,
  isLoading,
  limit,
}: TransactionsTableProps) {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
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
          Connect an exchange or add a transaction to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayTransactions.map((tx) => (
            <TableRow key={tx.id} data-testid={`transaction-row-${tx.id}`}>
              <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                {format(safeParseDate(tx.transactionDate), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={tx.transactionType === "buy" ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    tx.transactionType === "buy" && "bg-chart-2 text-white",
                    tx.transactionType === "sell" && "bg-chart-5 text-white"
                  )}
                >
                  {tx.transactionType.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-xs sm:text-sm">{tx.assetSymbol}</TableCell>
              <TableCell className="text-right font-mono text-xs sm:text-sm">
                {parseFloat(tx.quantity).toFixed(4)}
              </TableCell>
              <TableCell className="text-right font-mono hidden sm:table-cell">
                ${parseFloat(tx.pricePerUnit).toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono font-medium hidden sm:table-cell">
                ${parseFloat(tx.totalValue).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
