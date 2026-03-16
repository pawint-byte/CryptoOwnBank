import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  Eye,
  BarChart3,
  Layers,
  ExternalLink,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Check,
  X,
  Star,
  Info,
  AlertCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Pencil,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useXrplStore } from "@/lib/xrpl-store";
import { Smartphone, Link2, LinkIcon, Loader2, ArrowRightLeft, Ban } from "lucide-react";
import { connectXumm, connectXummForLinkDesktop, createXummLinkPayload, pollXummLinkStatus, completePendingXummSignIn, hasPendingXummSignIn, hasPendingXummLink, getPendingXummLink, clearPendingXummLink } from "@/lib/xumm-connector";
import type { XummLinkPayload } from "@/lib/xumm-connector";
import type { Wallet as WalletType, WalletBalance, Position } from "@shared/schema";

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

const CHAIN_LABELS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  xrp: "XRP",
  dogecoin: "DOGE",
  litecoin: "LTC",
  cardano: "ADA",
  avalanche: "AVAX",
  algorand: "ALGO",
  cosmos: "ATOM",
  tron: "TRX",
  hedera: "HBAR",
  polkadot: "DOT",
  vechain: "VET",
  digibyte: "DGB",
  casper: "CSPR",
  cronos: "CRO",
  ton: "TON",
  nervos: "CKB",
  zilliqa: "ZIL",
  stellar: "XLM",
  verge: "XVG",
  xdc: "XDC",
  polygon: "POL",
  manual: "MAN",
};

const CHAIN_COLORS: Record<string, string> = {
  bitcoin: "#F7931A",
  ethereum: "#627EEA",
  solana: "#9945FF",
  xrp: "#00A4E4",
  dogecoin: "#C2A633",
  litecoin: "#345D9D",
  cardano: "#0033AD",
  avalanche: "#E84142",
  algorand: "#000000",
  cosmos: "#2E3148",
  tron: "#FF0013",
  hedera: "#222222",
  polkadot: "#E6007A",
  vechain: "#15BDFF",
  digibyte: "#006AD2",
  casper: "#FF473E",
  cronos: "#002D74",
  ton: "#0098EA",
  nervos: "#3CC68A",
  zilliqa: "#49C1BF",
  stellar: "#000000",
  verge: "#00CBFF",
  xdc: "#1E4B6E",
  polygon: "#8247E5",
  manual: "#888888",
};

const CHART_COLORS = [
  "#00A4E4", "#F7931A", "#627EEA", "#9945FF", "#C2A633",
  "#345D9D", "#0033AD", "#E91E63", "#4CAF50", "#FF9800",
];

const WALLET_PRESETS = [
  "Ledger Nano X",
  "Ledger Nano S Plus",
  "Ledger Stax",
  "Trezor",
  "ELLIPAL",
  "SafePal",
  "CypheRock",
  "Arculus",
  "Tangem",
  "Xaman",
];

interface WalletWithBalances extends WalletType {
  balances: WalletBalance[];
}

interface WalletPortfolio {
  holdings: Array<{ symbol: string; balance: number; usdValue: number; sources: string[] }>;
  totalValue: number;
  walletCount: number;
}

interface PositionWithSource extends Position {
  currentPrice?: number;
  currentValue?: number;
  source?: string;
}

interface PortfolioData {
  positions: PositionWithSource[];
  totalValue: number;
}

interface HardwareWallet {
  name: string;
  model: string;
  price: string;
  supportedAssets: string[];
  totalCoins: string;
  features: string[];
  referralUrl: string;
  bestFor: string;
}

const HARDWARE_WALLETS: HardwareWallet[] = [
  {
    name: "Ledger Nano X",
    model: "nano-x",
    price: "$149",
    supportedAssets: [
      "BTC", "ETH", "XRP", "SOL", "ADA", "DOT", "DOGE", "LTC",
      "AVAX", "MATIC", "LINK", "UNI", "ATOM", "ALGO", "XLM",
      "NEAR", "FTM", "HBAR", "VET", "EOS", "XTZ", "RLUSD",
    ],
    totalCoins: "5,500+",
    features: [
      "Bluetooth connectivity",
      "100+ app capacity",
      "XRPL native support",
      "Ledger Live app",
      "Staking support",
    ],
    referralUrl: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4",
    bestFor: "Best overall for most crypto portfolios",
  },
  {
    name: "Ledger Nano S Plus",
    model: "nano-s-plus",
    price: "$79",
    supportedAssets: [
      "BTC", "ETH", "XRP", "SOL", "ADA", "DOT", "DOGE", "LTC",
      "AVAX", "MATIC", "LINK", "UNI", "ATOM", "ALGO", "XLM",
      "NEAR", "FTM", "HBAR", "VET", "EOS", "XTZ", "RLUSD",
    ],
    totalCoins: "5,500+",
    features: [
      "USB-C connection",
      "100+ app capacity",
      "XRPL native support",
      "Ledger Live app",
      "Budget-friendly",
    ],
    referralUrl: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4",
    bestFor: "Best budget option with full coin support",
  },
  {
    name: "Ledger Stax",
    model: "stax",
    price: "$399",
    supportedAssets: [
      "BTC", "ETH", "XRP", "SOL", "ADA", "DOT", "DOGE", "LTC",
      "AVAX", "MATIC", "LINK", "UNI", "ATOM", "ALGO", "XLM",
      "NEAR", "FTM", "HBAR", "VET", "EOS", "XTZ", "RLUSD",
    ],
    totalCoins: "5,500+",
    features: [
      "E-ink touchscreen",
      "Bluetooth + USB-C",
      "Wireless charging",
      "Premium build quality",
      "NFT display on device",
    ],
    referralUrl: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4",
    bestFor: "Premium experience with touchscreen",
  },
  {
    name: "Trezor Model T",
    model: "trezor-t",
    price: "$179",
    supportedAssets: [
      "BTC", "ETH", "ADA", "DOT", "DOGE", "LTC",
      "AVAX", "MATIC", "LINK", "UNI", "ATOM", "ALGO", "XLM",
      "NEAR", "EOS", "XTZ",
    ],
    totalCoins: "1,800+",
    features: [
      "Color touchscreen",
      "Open-source firmware",
      "Shamir backup (SLIP-39)",
      "MicroSD card slot",
      "Trezor Suite app",
    ],
    referralUrl: "https://trezor.io/trezor-model-t?r=YOUR_REFERRAL",
    bestFor: "Best for open-source enthusiasts",
  },
  {
    name: "Trezor Safe 3",
    model: "trezor-safe3",
    price: "$79",
    supportedAssets: [
      "BTC", "ETH", "ADA", "DOT", "DOGE", "LTC",
      "AVAX", "MATIC", "LINK", "UNI", "ATOM", "ALGO", "XLM",
      "NEAR", "EOS", "XTZ",
    ],
    totalCoins: "8,000+",
    features: [
      "Secure Element chip",
      "Open-source",
      "USB-C connection",
      "Compact design",
      "Trezor Suite app",
    ],
    referralUrl: "https://trezor.io/trezor-safe-3?r=YOUR_REFERRAL",
    bestFor: "Budget open-source option",
  },
];

function getWalletRecommendations(userAssets: string[]) {
  if (userAssets.length === 0) return [];

  return HARDWARE_WALLETS.map((hw) => {
    const supported = userAssets.filter((a) =>
      hw.supportedAssets.includes(a.toUpperCase())
    );
    const unsupported = userAssets.filter(
      (a) => !hw.supportedAssets.includes(a.toUpperCase())
    );
    const coverage = userAssets.length > 0 ? (supported.length / userAssets.length) * 100 : 0;

    return {
      ...hw,
      supported,
      unsupported,
      coverage,
      score: coverage,
    };
  }).sort((a, b) => b.score - a.score);
}

const walletFormSchema = z.object({
  chain: z.string().min(1, "Select a blockchain"),
  address: z.string().min(10, "Enter a valid wallet address"),
  label: z.string().optional(),
});

type WalletFormValues = z.infer<typeof walletFormSchema>;

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBalance(value: number, decimals = 6): string {
  if (value === 0) return "0";
  if (value < 0.001) return value.toFixed(8);
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function getExplorerUrl(chain: string, address: string): string {
  const explorers: Record<string, string> = {
    bitcoin: `https://mempool.space/address/${address}`,
    ethereum: `https://etherscan.io/address/${address}`,
    solana: `https://solscan.io/account/${address}`,
    xrp: `https://xrplscan.com/account/${address}`,
    dogecoin: `https://dogechain.info/address/${address}`,
    litecoin: `https://litecoinspace.org/address/${address}`,
    cardano: `https://cardanoscan.io/address/${address}`,
    avalanche: `https://snowtrace.io/address/${address}`,
    algorand: `https://algoexplorer.io/address/${address}`,
    cosmos: `https://www.mintscan.io/cosmos/address/${address}`,
    tron: `https://tronscan.org/#/address/${address}`,
    hedera: `https://hashscan.io/mainnet/account/${address}`,
    polkadot: `https://subscan.io/account/${address}`,
    vechain: `https://explore.vechain.org/accounts/${address}`,
    digibyte: `https://digiexplorer.info/address/${address}`,
    casper: `https://cspr.live/account/${address}`,
    cronos: `https://cronos.org/explorer/address/${address}`,
    ton: `https://tonviewer.com/${address}`,
    nervos: `https://explorer.nervos.org/address/${address}`,
    zilliqa: `https://viewblock.io/zilliqa/address/${address}`,
    stellar: `https://stellar.expert/explorer/public/account/${address}`,
    verge: `https://verge-blockchain.info/address/${address}`,
    xdc: `https://xdc.blocksscan.io/address/${address.startsWith("xdc") ? address : "xdc" + address.slice(2)}`,
    polygon: `https://polygonscan.com/address/${address}`,
  };
  return explorers[chain] || "#";
}

interface TaxLotData {
  id: string;
  assetSymbol: string;
  acquiredDate: string;
  originalQuantity: string;
  remainingQuantity: string;
  costBasisPerUnit: string;
  note?: string | null;
  acquisitionType?: string | null;
}

interface MoveTarget {
  walletBalanceId: string;
  walletLabel: string;
  chain: string;
}

function CostBasisPanel({ balance, currentPrice, moveTargets = [] }: { balance: WalletBalance; currentPrice: number; moveTargets?: MoveTarget[] }) {
  const [expanded, setExpanded] = useState(false);
  const [addingLot, setAddingLot] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [editCostValue, setEditCostValue] = useState("");
  const { toast } = useToast();

  const { data: lots = [], isLoading: lotsLoading } = useQuery<TaxLotData[]>({
    queryKey: ["/api/wallet-balances", balance.id, "lots"],
    queryFn: async () => {
      const res = await fetch(`/api/wallet-balances/${balance.id}/lots`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: expanded,
  });

  const [lotForm, setLotForm] = useState({ quantity: "", costPerUnit: "", acquiredDate: "", note: "", acquisitionType: "purchase" });

  const addLotMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/wallet-balances/${balance.id}/lots`, lotForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", balance.id, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      setAddingLot(false);
      setLotForm({ quantity: "", costPerUnit: "", acquiredDate: "", note: "", acquisitionType: "purchase" });
      toast({ title: "Lot added" });
    },
    onError: () => toast({ title: "Failed to add lot", variant: "destructive" }),
  });

  const editCostMutation = useMutation({
    mutationFn: async () => {
      const avgCost = parseFloat(editCostValue);
      const bal = parseFloat(balance.balance);
      return apiRequest("PATCH", `/api/wallet-balances/${balance.id}/cost`, {
        averageCost: avgCost.toString(),
        totalCostBasis: (avgCost * bal).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      setEditingCost(false);
      toast({ title: "Cost basis updated" });
    },
    onError: () => toast({ title: "Failed to update cost basis", variant: "destructive" }),
  });

  const editLotMutation = useMutation({
    mutationFn: async ({ lotId, data }: { lotId: string; data: any }) => {
      return apiRequest("PATCH", `/api/wallet-balances/${balance.id}/lots/${lotId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", balance.id, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Purchase lot updated" });
    },
    onError: () => toast({ title: "Failed to update lot", variant: "destructive" }),
  });

  const deleteLotMutation = useMutation({
    mutationFn: async (lotId: string) => {
      return apiRequest("DELETE", `/api/wallet-balances/${balance.id}/lots/${lotId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", balance.id, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Purchase lot removed" });
    },
    onError: () => toast({ title: "Failed to delete lot", variant: "destructive" }),
  });

  const moveLotMutation = useMutation({
    mutationFn: async ({ lotId, targetWalletBalanceId }: { lotId: string; targetWalletBalanceId: string }) => {
      return apiRequest("POST", `/api/wallet-balances/${balance.id}/lots/${lotId}/move`, { targetWalletBalanceId });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", balance.id, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", variables.targetWalletBalanceId, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Lot moved to another wallet" });
    },
    onError: () => toast({ title: "Failed to move lot", variant: "destructive" }),
  });

  const avgCost = balance.averageCost ? parseFloat(balance.averageCost) : 0;
  const totalCostBasis = balance.totalCostBasis ? parseFloat(balance.totalCostBasis) : 0;
  const bal = parseFloat(balance.balance);
  const currentValue = bal * currentPrice;
  const unrealizedPnl = totalCostBasis > 0 ? currentValue - totalCostBasis : 0;
  const pnlPercent = totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : 0;
  const hasCostData = avgCost > 0 || totalCostBasis > 0;

  return (
    <div className="mt-1">
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`toggle-cost-basis-${balance.id}`}
      >
        <DollarSign className="h-3 w-3" />
        {hasCostData ? (
          <span className="flex items-center gap-1">
            Avg {formatUsd(avgCost)}
            <span className="mx-0.5">·</span>
            <span className={cn("font-medium", unrealizedPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
              {unrealizedPnl >= 0 ? "+" : ""}{formatUsd(unrealizedPnl)} ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
            </span>
          </span>
        ) : (
          <span>Add cost basis</span>
        )}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-2 p-3 rounded-lg bg-muted/50 border space-y-3">
          {hasCostData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Avg Cost</span>
                <div className="font-mono font-medium" data-testid={`text-avg-cost-${balance.id}`}>{formatUsd(avgCost)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Cost Basis</span>
                <div className="font-mono font-medium" data-testid={`text-cost-basis-${balance.id}`}>{formatUsd(totalCostBasis)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Current Value</span>
                <div className="font-mono font-medium">{formatUsd(currentValue)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Unrealized P&L</span>
                <div className={cn("font-mono font-medium flex items-center gap-0.5", unrealizedPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} data-testid={`text-pnl-${balance.id}`}>
                  {unrealizedPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {unrealizedPnl >= 0 ? "+" : ""}{formatUsd(unrealizedPnl)}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!editingCost ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setEditingCost(true); setEditCostValue(avgCost > 0 ? avgCost.toString() : ""); }}
                data-testid={`button-edit-cost-${balance.id}`}
              >
                <Pencil className="h-3 w-3 mr-1" />
                {hasCostData ? "Edit Avg Cost" : "Set Avg Cost"}
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="Cost per unit"
                  value={editCostValue}
                  onChange={(e) => setEditCostValue(e.target.value)}
                  className="h-7 w-28 text-xs"
                  data-testid={`input-avg-cost-${balance.id}`}
                />
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => editCostMutation.mutate()}
                  disabled={editCostMutation.isPending || !editCostValue}
                  data-testid={`button-save-cost-${balance.id}`}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditingCost(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setAddingLot(true)}
              data-testid={`button-add-lot-${balance.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Lot
            </Button>
          </div>

          {addingLot && (
            <div className="border rounded-lg p-3 space-y-2 bg-background">
              <div className="text-xs font-medium">New Lot</div>
              <div className="flex flex-wrap gap-1 mb-1">
                {[
                  { value: "purchase", label: "Purchase" },
                  { value: "earned", label: "Earned / Reward" },
                  { value: "airdrop", label: "Airdrop" },
                  { value: "transfer", label: "Transfer In" },
                ].map(opt => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={lotForm.acquisitionType === opt.value ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setLotForm({ ...lotForm, acquisitionType: opt.value, costPerUnit: opt.value === "earned" || opt.value === "airdrop" ? "0" : lotForm.costPerUnit })}
                    data-testid={`lot-type-${opt.value}-${balance.id}`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Quantity</label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="Amount"
                    value={lotForm.quantity}
                    onChange={(e) => setLotForm({ ...lotForm, quantity: e.target.value })}
                    className="h-7 text-xs"
                    data-testid={`input-lot-quantity-${balance.id}`}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    {lotForm.acquisitionType === "earned" ? "Fair market value per unit ($)" : lotForm.acquisitionType === "airdrop" ? "Value per unit at receipt ($)" : "Cost per unit ($)"}
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder={lotForm.acquisitionType === "earned" || lotForm.acquisitionType === "airdrop" ? "0 if no value at receipt" : "Price paid"}
                    value={lotForm.costPerUnit}
                    onChange={(e) => setLotForm({ ...lotForm, costPerUnit: e.target.value })}
                    className="h-7 text-xs"
                    data-testid={`input-lot-cost-${balance.id}`}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    {lotForm.acquisitionType === "earned" ? "Date Received" : lotForm.acquisitionType === "airdrop" ? "Airdrop Date" : lotForm.acquisitionType === "transfer" ? "Transfer Date" : "Purchase Date"}
                  </label>
                  <Input
                    type="date"
                    value={lotForm.acquiredDate}
                    onChange={(e) => setLotForm({ ...lotForm, acquiredDate: e.target.value })}
                    className="h-7 text-xs"
                    data-testid={`input-lot-date-${balance.id}`}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Note (optional)</label>
                  <Input
                    placeholder={lotForm.acquisitionType === "earned" ? "e.g. Staking reward" : lotForm.acquisitionType === "airdrop" ? "e.g. Flare airdrop" : "e.g. From Crypto.com"}
                    value={lotForm.note}
                    onChange={(e) => setLotForm({ ...lotForm, note: e.target.value })}
                    className="h-7 text-xs"
                    data-testid={`input-lot-note-${balance.id}`}
                  />
                </div>
              </div>
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddingLot(false)}>Cancel</Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addLotMutation.mutate()}
                  disabled={addLotMutation.isPending || !lotForm.quantity || !lotForm.costPerUnit || !lotForm.acquiredDate}
                  data-testid={`button-save-lot-${balance.id}`}
                >
                  {addLotMutation.isPending ? "Saving..." : "Save Lot"}
                </Button>
              </div>
            </div>
          )}

          {lotsLoading ? (
            <div className="text-xs text-muted-foreground">Loading purchase lots...</div>
          ) : lots.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground mb-1">Acquisition History ({lots.length} lot{lots.length !== 1 ? "s" : ""})</div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {lots.map((lot) => (
                  <LotRow
                    key={lot.id}
                    lot={lot}
                    balanceId={balance.id}
                    onEdit={(lotId, data) => editLotMutation.mutate({ lotId, data })}
                    onDelete={(lotId) => deleteLotMutation.mutate(lotId)}
                    moveTargets={moveTargets}
                    onMove={(lotId, targetId) => moveLotMutation.mutate({ lotId, targetWalletBalanceId: targetId })}
                    isMoving={moveLotMutation.isPending}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No purchase lots yet. Add one manually or sync the wallet to import on-chain transactions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LotRow({ lot, balanceId, onEdit, onDelete, moveTargets = [], onMove, isMoving }: {
  lot: TaxLotData;
  balanceId: string;
  onEdit: (id: string, data: Record<string, string>) => void;
  onDelete: (id: string) => void;
  moveTargets?: MoveTarget[];
  onMove?: (lotId: string, targetId: string) => void;
  isMoving?: boolean;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [costPerUnit, setCostPerUnit] = useState(lot.costBasisPerUnit);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [writeOffForm, setWriteOffForm] = useState({ reason: "scam", lossDate: "", note: "" });

  const writeOffMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/lots/${lot.id}/write-off`, writeOffForm);
      return res.json();
    },
    onSuccess: (data: { message: string; loss: number; quantity: number; isLongTerm: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balances", balanceId, "lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation"] });
      toast({
        title: `${formatBalance(data.quantity, 4)} ${lot.assetSymbol} written off`,
        description: `$${data.loss.toFixed(2)} ${data.isLongTerm ? "long-term" : "short-term"} capital loss recorded. This will appear on your tax report.`,
      });
      setShowWriteOff(false);
    },
    onError: (err: Error) => toast({ title: "Failed to write off lot", description: err.message, variant: "destructive" }),
  });

  const qty = parseFloat(lot.originalQuantity);
  const cost = parseFloat(lot.costBasisPerUnit);
  const totalCost = qty * cost;
  const isWrittenOff = lot.note?.startsWith("WRITTEN OFF");

  if (editing) {
    return (
      <div className="flex items-center gap-1 py-1 px-2 rounded bg-muted/30 border text-xs">
        <span className="text-muted-foreground shrink-0">{format(new Date(lot.acquiredDate), "MMM d, yyyy")}</span>
        <span className="text-muted-foreground shrink-0 mx-1">·</span>
        <span className="shrink-0 font-mono">{formatBalance(qty, 4)}</span>
        <span className="text-muted-foreground shrink-0 mx-1">@</span>
        <span className="text-muted-foreground shrink-0">$</span>
        <Input
          type="number"
          step="0.0001"
          value={costPerUnit}
          onChange={(e) => setCostPerUnit(e.target.value)}
          className="h-6 w-20 text-xs"
          data-testid={`input-edit-lot-cost-${lot.id}`}
        />
        <Button
          variant="default"
          size="sm"
          className="h-6 px-1.5 text-xs"
          onClick={() => { onEdit(lot.id, { costPerUnit }); setEditing(false); }}
          data-testid={`button-save-edit-lot-${lot.id}`}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (isWrittenOff) {
    return (
      <div className="flex items-center justify-between py-1 px-2 rounded bg-red-50/50 dark:bg-red-950/20 text-xs opacity-60" data-testid={`lot-row-${lot.id}`}>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[9px] font-medium px-1 py-0.5 rounded shrink-0 uppercase bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <Ban className="h-2.5 w-2.5 inline mr-0.5" />Loss
          </span>
          <span className="text-muted-foreground shrink-0 line-through">{format(new Date(lot.acquiredDate), "MMM d, yyyy")}</span>
          <span className="text-muted-foreground shrink-0">·</span>
          <span className="font-mono shrink-0 line-through">{formatBalance(qty, 4)}</span>
          <span className="text-muted-foreground shrink-0">@</span>
          <span className="font-mono shrink-0">{formatUsd(cost)}</span>
          <span className="text-muted-foreground shrink-0">=</span>
          <span className="font-mono font-medium shrink-0 text-red-600 dark:text-red-400">-{formatUsd(totalCost)}</span>
          {lot.note && <span className="text-muted-foreground truncate ml-1 text-[10px]">({lot.note})</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30 text-xs group" data-testid={`lot-row-${lot.id}`}>
      <div className="flex items-center gap-1 min-w-0">
        {lot.acquisitionType && lot.acquisitionType !== "purchase" && (
          <span className={cn(
            "text-[9px] font-medium px-1 py-0.5 rounded shrink-0 uppercase",
            lot.acquisitionType === "earned" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
            lot.acquisitionType === "airdrop" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" :
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          )}>
            {lot.acquisitionType === "earned" ? "Earned" : lot.acquisitionType === "airdrop" ? "Airdrop" : "Transfer"}
          </span>
        )}
        <span className="text-muted-foreground shrink-0">{format(new Date(lot.acquiredDate), "MMM d, yyyy")}</span>
        <span className="text-muted-foreground shrink-0">·</span>
        <span className="font-mono shrink-0">{formatBalance(qty, 4)}</span>
        <span className="text-muted-foreground shrink-0">@</span>
        <span className="font-mono shrink-0">{formatUsd(cost)}</span>
        <span className="text-muted-foreground shrink-0">=</span>
        <span className="font-mono font-medium shrink-0">{formatUsd(totalCost)}</span>
        {lot.note && <span className="text-muted-foreground truncate ml-1">({lot.note})</span>}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => setEditing(true)}
          data-testid={`button-edit-lot-${lot.id}`}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        {moveTargets.length > 0 && onMove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            disabled={isMoving}
            title="Move to another wallet"
            data-testid={`button-move-lot-${lot.id}`}
          >
            <ArrowRightLeft className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-amber-600 hover:text-amber-700"
          onClick={() => setShowWriteOff(true)}
          title="Write off as loss (scam, hack, etc.)"
          data-testid={`button-writeoff-lot-${lot.id}`}
        >
          <Ban className="h-3 w-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" data-testid={`button-delete-lot-${lot.id}`}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove lot?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the {formatBalance(qty, 4)} {lot.assetSymbol} lot from {format(new Date(lot.acquiredDate), "MMM d, yyyy")} and update your cost basis. No loss will be recorded — use "Write Off" instead if this was lost to a scam or hack.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(lot.id)}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {showMoveMenu && (
          <div className="absolute right-0 top-6 z-10 bg-popover border rounded-lg shadow-lg p-1 min-w-[160px]">
            <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium">Move to:</p>
            {moveTargets.map(t => (
              <button
                key={t.walletBalanceId}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors truncate"
                onClick={() => {
                  onMove!(lot.id, t.walletBalanceId);
                  setShowMoveMenu(false);
                }}
                data-testid={`move-lot-${lot.id}-to-${t.walletBalanceId}`}
              >
                {t.walletLabel}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showWriteOff} onOpenChange={setShowWriteOff}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Write Off as Loss</DialogTitle>
            <DialogDescription>
              Record {formatBalance(qty, 4)} {lot.assetSymbol} (cost basis {formatUsd(totalCost)}) as a capital loss. This removes it from your active holdings and creates a loss event on your tax report with $0 proceeds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {[
                  { value: "scam", label: "Scam" },
                  { value: "hack", label: "Hack" },
                  { value: "sent_in_error", label: "Sent in Error" },
                  { value: "lost_keys", label: "Lost Keys" },
                  { value: "other", label: "Other" },
                ].map(opt => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={writeOffForm.reason === opt.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setWriteOffForm({ ...writeOffForm, reason: opt.value })}
                    data-testid={`writeoff-reason-${opt.value}`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Date of Loss</label>
              <Input
                type="date"
                value={writeOffForm.lossDate}
                onChange={(e) => setWriteOffForm({ ...writeOffForm, lossDate: e.target.value })}
                className="h-8 text-sm mt-1"
                data-testid="input-writeoff-date"
              />
              <p className="text-xs text-muted-foreground mt-1">When the loss occurred. Leave blank to use today's date.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                placeholder="e.g. Sent to scam address, reported to authorities"
                value={writeOffForm.note}
                onChange={(e) => setWriteOffForm({ ...writeOffForm, note: e.target.value })}
                className="h-8 text-sm mt-1"
                data-testid="input-writeoff-note"
              />
            </div>
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-medium mb-1">What this does:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Records a <strong>{formatUsd(totalCost)}</strong> capital loss ($0 proceeds − {formatUsd(totalCost)} cost basis)</li>
                <li>Removes {formatBalance(qty, 4)} {lot.assetSymbol} from your active holdings</li>
                <li>Loss appears on your tax report for the selected year</li>
                <li>Consult a tax professional about deductibility in your jurisdiction</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowWriteOff(false)}>Cancel</Button>
              <Button
                onClick={() => writeOffMutation.mutate()}
                disabled={writeOffMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                data-testid="button-confirm-writeoff"
              >
                {writeOffMutation.isPending ? "Processing..." : "Write Off as Loss"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Wallets() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ label: "", assetSymbol: "", balance: "" });
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean> | null>(null);
  const { toast } = useToast();
  const xrplStore = useXrplStore();

  const { data: xrplWalletData } = useQuery<{ walletAddress: string; walletType: string }>({
    queryKey: ["/api/wallet"],
  });

  const { data: xamanConnections = [], refetch: refetchXamanConnections } = useQuery<Array<{ id: number; xrpAddress: string; accountLabel: string | null; connectedAt: string }>>({
    queryKey: ["/api/xaman-connections"],
  });

  const connectedXrplAddress = xrplStore.walletAddress || xrplWalletData?.walletAddress || null;

  const [linkingAddress, setLinkingAddress] = useState<string | null>(null);
  const [mobileLinkPayload, setMobileLinkPayload] = useState<XummLinkPayload | null>(null);
  const [xamanAccountSwitched, setXamanAccountSwitched] = useState(false);
  const cancelPollRef = useRef<(() => void) | null>(null);

  const isXamanLinked = (address: string) => {
    if (connectedXrplAddress && address.toLowerCase() === connectedXrplAddress.toLowerCase()) return true;
    return xamanConnections.some(c => c.xrpAddress.toLowerCase() === address.toLowerCase());
  };

  const saveLinkResult = async (address: string) => {
    await apiRequest("POST", "/api/xaman-connections", { xrpAddress: address });
    await apiRequest("POST", "/api/wallet", { walletAddress: address, walletType: "xumm" });
    xrplStore.connect(address, "xumm");
    await refetchXamanConnections();
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    toast({
      title: "Xaman linked!",
      description: `${address.slice(0, 8)}...${address.slice(-6)} is now connected via Xaman.`,
    });
  };

  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleLinkResolved = async (result: { success: boolean; address?: string; error?: string }, expectedAddress: string) => {
    if (result.success && result.address) {
      const returnedAddr = result.address.toLowerCase();
      const mainWalletAddr = connectedXrplAddress?.toLowerCase();

      if (mainWalletAddr && returnedAddr === mainWalletAddr) {
        await saveLinkResult(expectedAddress);
      } else {
        const xrpWallets = userWallets.filter(w => w.chain === "xrp");
        const matchedWallet = xrpWallets.find(w => w.address.toLowerCase() === returnedAddr);
        if (matchedWallet && !isXamanLinked(matchedWallet.address)) {
          await saveLinkResult(matchedWallet.address);
        } else {
          await saveLinkResult(expectedAddress);
        }
      }
    } else if (result.error) {
      toast({ title: "Connection failed", description: result.error, variant: "destructive" });
    }
    setLinkingAddress(null);
    setMobileLinkPayload(null);
    setXamanAccountSwitched(false);
    if (cancelPollRef.current) {
      cancelPollRef.current();
      cancelPollRef.current = null;
    }
  };

  const startPollingForLink = (uuid: string, expectedAddress: string) => {
    if (cancelPollRef.current) {
      cancelPollRef.current();
    }
    const cancel = pollXummLinkStatus(uuid, (result) => {
      clearPendingXummLink();
      handleLinkResolved(result, expectedAddress);
    });
    cancelPollRef.current = cancel;
  };

  const handleLinkXaman = async (expectedAddress: string) => {
    setLinkingAddress(expectedAddress);
    try {
      if (isMobile) {
        const payload = await createXummLinkPayload(expectedAddress);
        setMobileLinkPayload(payload);
        localStorage.setItem("xumm_pending_link", JSON.stringify({
          uuid: payload.uuid,
          expectedAddress,
          timestamp: Date.now(),
        }));
        startPollingForLink(payload.uuid, expectedAddress);
      } else {
        const result = await connectXummForLinkDesktop(expectedAddress);
        await handleLinkResolved(result, expectedAddress);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to connect Xaman", variant: "destructive" });
      setLinkingAddress(null);
      setMobileLinkPayload(null);
    }
  };

  const cancelMobileLink = () => {
    if (cancelPollRef.current) {
      cancelPollRef.current();
      cancelPollRef.current = null;
    }
    clearPendingXummLink();
    setLinkingAddress(null);
    setMobileLinkPayload(null);
    setXamanAccountSwitched(false);
  };

  useEffect(() => {
    if (hasPendingXummLink()) {
      const pending = getPendingXummLink();
      if (pending) {
        setLinkingAddress(pending.expectedAddress);
        setMobileLinkPayload({
          uuid: pending.uuid,
          expectedAddress: pending.expectedAddress,
          qrUrl: "",
          deepLink: `https://xumm.app/sign/${pending.uuid}`,
        });
        startPollingForLink(pending.uuid, pending.expectedAddress);
      }
    } else if (hasPendingXummSignIn()) {
      completePendingXummSignIn().then(async (result) => {
        if (result.success && result.address) {
          await saveLinkResult(result.address);
        }
      });
    }
  }, []);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...(prev || {}), [groupKey]: !(prev?.[groupKey] ?? true) }));
  };

  const { data: userWallets = [], isLoading } = useQuery<WalletWithBalances[]>({
    queryKey: ["/api/wallets"],
  });

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery<WalletPortfolio>({
    queryKey: ["/api/wallets/portfolio"],
  });

  const { data: fullPortfolio } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio"],
  });

  const { data: limits } = useQuery<SubscriptionLimits>({
    queryKey: ["/api/subscription/limits"],
  });

  const walletAtLimit = limits?.wallets.limit !== null && limits?.wallets.used !== undefined && limits.wallets.used >= (limits.wallets.limit ?? Infinity);

  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      chain: "",
      address: "",
      label: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chainParam = params.get("chain");
    if (chainParam) {
      const chainAliases: Record<string, string> = {
        xrpl: "xrp", eth: "ethereum", sol: "solana",
      };
      const validChains = [
        "bitcoin", "ethereum", "solana", "xrp", "dogecoin", "litecoin",
        "cardano", "avalanche", "algorand", "cosmos", "tron", "hedera",
        "polkadot", "vechain", "digibyte", "casper", "cronos", "ton",
        "nervos", "zilliqa", "stellar", "verge", "xdc", "polygon",
      ];
      const normalized = chainAliases[chainParam.toLowerCase()] || chainParam.toLowerCase();
      if (validChains.includes(normalized)) {
        form.setValue("chain", normalized);
        setIsDialogOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: async (values: WalletFormValues) => {
      return apiRequest("POST", "/api/wallets", values);
    },
    onSuccess: async (res) => {
      const wallet = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Wallet added successfully" });
      setIsDialogOpen(false);
      form.reset();
      syncMutation.mutate(wallet.id);
    },
    onError: () => {
      toast({ title: "Failed to add wallet", variant: "destructive" });
    },
  });

  const createManualMutation = useMutation({
    mutationFn: async (values: { label: string; assetSymbol: string; balance: string }) => {
      const res = await apiRequest("POST", "/api/wallets/manual", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation"] });
      toast({ title: "Manual entry added" });
      setIsManualDialogOpen(false);
      setManualForm({ label: "", assetSymbol: "", balance: "" });
    },
    onError: () => {
      toast({ title: "Failed to create manual entry", variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const res = await apiRequest("POST", `/api/wallets/${walletId}/sync`, {});
      try {
        return await res.json();
      } catch {
        return {};
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      const txCount = data?.newTransactions || 0;
      if (data?.exchangeDeposit) {
        toast({ title: "Exchange Deposit Address", description: "This is an exchange deposit address — the on-chain balance belongs to the exchange, not you. Use API key integration to track exchange holdings." });
      } else if (data?.correctedChain) {
        toast({ title: "Chain Auto-Corrected", description: `Address was detected as ${data.correctedChain} and synced successfully.` });
      } else if (data?.skipped) {
        toast({ title: "Already up to date — synced less than 2 min ago" });
      } else if (txCount > 0) {
        toast({ title: `Wallet synced — ${txCount} new transaction${txCount > 1 ? "s" : ""} imported` });
      } else {
        toast({ title: "Wallet synced successfully" });
      }
    },
    onError: () => {
      toast({ title: "Failed to sync wallet — the address may be invalid or the blockchain API may be temporarily unavailable", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (walletId: string) => {
      return apiRequest("DELETE", `/api/wallets/${walletId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Wallet removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove wallet", variant: "destructive" });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      let synced = 0, skipped = 0;
      for (const wallet of userWallets) {
        try {
          const res = await apiRequest("POST", `/api/wallets/${wallet.id}/sync`, {});
          const data = await res.json().catch(() => ({}));
          if (data?.skipped) skipped++; else synced++;
        } catch { synced++; }
      }
      return { synced, skipped };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (data.skipped > 0 && data.synced === 0) {
        toast({ title: "All wallets already up to date" });
      } else if (data.skipped > 0) {
        toast({ title: `${data.synced} wallet${data.synced > 1 ? "s" : ""} synced, ${data.skipped} already up to date` });
      } else {
        toast({ title: "All wallets synced" });
      }
    },
    onError: () => {
      toast({ title: "Some wallets failed to sync", variant: "destructive" });
    },
  });

  const onSubmit = (values: WalletFormValues) => {
    createMutation.mutate(values);
  };

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const portfolioPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (portfolioData?.holdings) {
      for (const h of portfolioData.holdings) {
        if (h.balance > 0 && h.usdValue > 0) {
          map[h.symbol] = h.usdValue / h.balance;
        }
      }
    }
    return map;
  }, [portfolioData]);

  const getEnrichedUsdValue = (symbol: string, balance: number, storedUsd: string | null) => {
    const usd = parseFloat(storedUsd || "0");
    if (usd > 0) return usd;
    if (balance <= 0) return 0;
    const baseSym = symbol.replace(" (staked)", "");
    const price = portfolioPriceMap[symbol] || portfolioPriceMap[baseSym];
    return price ? balance * price : 0;
  };

  const bySourceData = (() => {
    const grouped: Record<string, { name: string; value: number; chain: string }> = {};
    for (const w of userWallets) {
      const total = w.balances.reduce((s, b) => s + getEnrichedUsdValue(b.assetSymbol, parseFloat(b.balance), b.usdValue), 0);
      const label = (w.label || `${w.chain.charAt(0).toUpperCase() + w.chain.slice(1)} Wallet`).trim().toUpperCase();
      if (!grouped[label]) {
        grouped[label] = { name: label, value: 0, chain: w.chain };
      }
      grouped[label].value += total;
    }
    return Object.values(grouped).filter((d) => d.value > 0);
  })();

  const byAssetData = portfolioData?.holdings || [];

  const allHoldings: Array<{
    symbol: string;
    balance: number;
    usdValue: number;
    source: string;
    chain: string;
    walletId: string;
  }> = [];

  for (const w of userWallets) {
    for (const b of w.balances) {
      allHoldings.push({
        symbol: b.assetSymbol,
        balance: parseFloat(b.balance),
        usdValue: getEnrichedUsdValue(b.assetSymbol, parseFloat(b.balance), b.usdValue),
        source: w.label || `${w.chain.charAt(0).toUpperCase() + w.chain.slice(1)} Wallet`,
        chain: w.chain,
        walletId: w.id,
      });
    }
  }

  const savedLabels = Array.from(
    userWallets
      .map((w) => w.label)
      .filter((l): l is string => !!l && l.trim().length > 0)
      .reduce((map, lbl) => {
        const key = lbl.toLowerCase().trim();
        if (!map.has(key)) map.set(key, lbl);
        return map;
      }, new Map<string, string>())
      .values()
  ).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const chains = [
    { value: "bitcoin", label: "Bitcoin (BTC)" },
    { value: "ethereum", label: "Ethereum (ETH)" },
    { value: "solana", label: "Solana (SOL)" },
    { value: "xrp", label: "XRP Ledger" },
    { value: "dogecoin", label: "Dogecoin (DOGE)" },
    { value: "litecoin", label: "Litecoin (LTC)" },
    { value: "cardano", label: "Cardano (ADA)" },
    { value: "avalanche", label: "Avalanche C-Chain (AVAX)" },
    { value: "algorand", label: "Algorand (ALGO)" },
    { value: "cosmos", label: "Cosmos Hub (ATOM)" },
    { value: "tron", label: "Tron (TRX)" },
    { value: "hedera", label: "Hedera (HBAR)" },
    { value: "polkadot", label: "Polkadot (DOT)" },
    { value: "vechain", label: "VeChain (VET)" },
    { value: "digibyte", label: "DigiByte (DGB)" },
    { value: "casper", label: "Casper (CSPR)" },
    { value: "cronos", label: "Cronos (CRO)" },
    { value: "ton", label: "TON (TON)" },
    { value: "nervos", label: "Nervos (CKB)" },
    { value: "zilliqa", label: "Zilliqa (ZIL)" },
    { value: "stellar", label: "Stellar (XLM)" },
    { value: "verge", label: "Verge (XVG)" },
    { value: "xdc", label: "XDC Network (XDC)" },
    { value: "polygon", label: "Polygon (POL)" },
  ];

  const selectedChain = form.watch("chain");

  const allUserAssets: Array<{ symbol: string; usdValue: number; source: string; onExchange: boolean }> = [];

  if (fullPortfolio?.positions) {
    for (const pos of fullPortfolio.positions) {
      const isWalletPos = pos.source && pos.source !== "Exchange";
      allUserAssets.push({
        symbol: pos.assetSymbol.toUpperCase(),
        usdValue: pos.currentValue || 0,
        source: pos.source || "Exchange",
        onExchange: !isWalletPos,
      });
    }
  }

  const uniqueAssetSymbols = [...new Set(allUserAssets.map((a) => a.symbol))];

  const exchangeAssets = allUserAssets.filter((a) => a.onExchange);
  const exchangeValue = exchangeAssets.reduce((s, a) => s + a.usdValue, 0);

  const recommendations = getWalletRecommendations(uniqueAssetSymbols);

  const migrationItems = exchangeAssets.filter((a) => a.usdValue > 0).sort((a, b) => b.usdValue - a.usdValue);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-wallets-title">Wallets & Addresses</h1>
          <p className="text-muted-foreground">
            Track your cold wallets and blockchain addresses — see balances, signing relationships, and transaction history in one place
          </p>
        </div>
        <div className="flex gap-2">
          {userWallets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
              data-testid="button-sync-all"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncAllMutation.isPending && "animate-spin")} />
              Sync All
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-wallet" disabled={walletAtLimit}>
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Track a Blockchain Address</DialogTitle>
                <DialogDescription>
                  Paste a public address from any blockchain below. We'll pull the current balance and, for Bitcoin and Ethereum, your full transaction history with cost basis. We never need your private keys.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="chain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-chain">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {chains.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-lg" style={{ color: CHAIN_COLORS[c.value] }}>
                                    {CHAIN_LABELS[c.value]}
                                  </span>
                                  {c.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Paste your public wallet address here"
                            {...field}
                            data-testid="input-wallet-address"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Find this in your wallet app (Ledger Live, MetaMask, Trust Wallet, etc.) under "Receive"
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => {
                      const allOptions = [...new Set([...savedLabels, ...WALLET_PRESETS.filter((p) => !savedLabels.some((s) => s.toLowerCase() === p.toLowerCase()))])];
                      return (
                        <FormItem>
                          <FormLabel>Wallet Name</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Which wallet or device holds the keys for this address?
                          </p>
                          {savedLabels.length > 0 && (
                            <>
                              <p className="text-xs font-medium text-muted-foreground pt-1">Your wallets</p>
                              <div className="flex flex-wrap gap-1.5" data-testid="saved-labels">
                                {savedLabels.map((lbl) => (
                                  <Button
                                    key={lbl}
                                    type="button"
                                    variant={field.value?.toLowerCase() === lbl.toLowerCase() ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => field.onChange(lbl)}
                                    data-testid={`label-quick-pick-${lbl.toLowerCase().replace(/\s+/g, "-")}`}
                                  >
                                    {lbl}
                                  </Button>
                                ))}
                              </div>
                            </>
                          )}
                          <p className="text-xs font-medium text-muted-foreground pt-1">
                            {savedLabels.length > 0 ? "Or pick a wallet type" : "Pick a wallet type"}
                          </p>
                          <div className="flex flex-wrap gap-1.5" data-testid="wallet-presets">
                            {WALLET_PRESETS.filter((p) => !savedLabels.some((s) => s.toLowerCase() === p.toLowerCase())).map((preset) => (
                              <Button
                                key={preset}
                                type="button"
                                variant={field.value?.toLowerCase() === preset.toLowerCase() ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs px-2.5"
                                onClick={() => field.onChange(preset)}
                                data-testid={`label-preset-${preset.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {preset}
                              </Button>
                            ))}
                          </div>
                          <FormControl>
                            <Input
                              placeholder="Or type a custom wallet name..."
                              {...field}
                              data-testid="input-wallet-label"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {selectedChain && (
                    <div className="rounded-lg border bg-muted/50 p-3 flex gap-3" data-testid="info-chain-details">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        {selectedChain === "ethereum" ? (
                          <span>
                            <strong className="text-foreground">ETH + all ERC-20 tokens + transaction history.</strong>{" "}
                            We'll pull your native ETH balance plus every ERC-20 token (USDT, USDC, LINK, UNI, etc.), import transaction history, calculate historical cost basis, and add everything to your portfolio and tax reports.
                          </span>
                        ) : selectedChain === "bitcoin" ? (
                          <span>
                            <strong className="text-foreground">Balance + full transaction history.</strong>{" "}
                            We'll import all transactions from the Bitcoin blockchain, calculate historical cost basis for each, and add them to your portfolio and tax reports.
                          </span>
                        ) : selectedChain === "solana" ? (
                          <span>
                            <strong className="text-foreground">SOL + SPL tokens.</strong>{" "}
                            We'll pull your native SOL balance plus SPL tokens (USDC, USDT, JUP, BONK, RAY, etc.) with current prices.
                          </span>
                        ) : selectedChain === "xrp" ? (
                          <span>
                            <strong className="text-foreground">XRP + issued currencies + full transaction history.</strong>{" "}
                            We'll pull your native XRP balance, trust line tokens (RLUSD, etc.), and import your complete payment history with historical cost basis from the XRP Ledger. Transfers between your own wallets are detected automatically.
                          </span>
                        ) : (
                          <span>
                            <strong className="text-foreground">Balance tracking.</strong>{" "}
                            We'll pull your current {CHAIN_LABELS[selectedChain]} balance. Token scanning and transaction history import are coming soon for this network.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-wallet"
                    >
                      {createMutation.isPending ? "Adding..." : "Add Wallet"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" data-testid="button-add-manual-wallet">
                <Plus className="h-4 w-4 mr-2" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Track Exchange / Off-Chain Holdings</DialogTitle>
                <DialogDescription>
                  For assets held on exchanges or in places where the address isn't publicly trackable. This creates a manual entry so your portfolio stays accurate without double-counting.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Where is it held?</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {["Crypto.com", "Coinbase", "Binance", "Kraken", "Uphold", "Other Exchange"].map(ex => (
                      <Button
                        key={ex}
                        type="button"
                        variant={manualForm.label === ex ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setManualForm({ ...manualForm, label: ex })}
                        data-testid={`manual-label-${ex.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                      >
                        {ex}
                      </Button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or type a custom name..."
                    value={manualForm.label}
                    onChange={(e) => setManualForm({ ...manualForm, label: e.target.value })}
                    className="h-8 text-sm mt-1.5"
                    data-testid="input-manual-label"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Asset</label>
                  <Input
                    placeholder="e.g. XRP, BTC, ETH"
                    value={manualForm.assetSymbol}
                    onChange={(e) => setManualForm({ ...manualForm, assetSymbol: e.target.value.toUpperCase() })}
                    className="h-8 text-sm mt-1"
                    data-testid="input-manual-asset"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Current Balance</label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="Amount held"
                    value={manualForm.balance}
                    onChange={(e) => setManualForm({ ...manualForm, balance: e.target.value })}
                    className="h-8 text-sm mt-1"
                    data-testid="input-manual-balance"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This balance is manually maintained — update it when your holdings change.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsManualDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createManualMutation.mutate(manualForm)}
                    disabled={createManualMutation.isPending || !manualForm.label || !manualForm.assetSymbol || !manualForm.balance}
                    data-testid="button-submit-manual-wallet"
                  >
                    {createManualMutation.isPending ? "Adding..." : "Add Entry"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {walletAtLimit && (
        <UpgradePrompt
          compact
          feature="Free users can track 1 blockchain address. Upgrade to Premium for unlimited addresses across all 24 blockchains."
        />
      )}

      {userWallets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Wallet Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold font-mono" data-testid="text-total-wallet-value">
                {portfolioLoading ? <Skeleton className="h-8 w-32" /> : formatUsd(portfolioData?.totalValue || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Wallets Connected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-wallet-count">
                {userWallets.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Assets Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-asset-count">
                {byAssetData.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(() => {
        const xrpWallets = userWallets.filter(w => w.chain === "xrp");
        if (xrpWallets.length === 0) return null;
        return (
          <Card data-testid="xaman-connections-panel">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-[#00A4E4]" />
                  <CardTitle className="text-base">Xaman Wallet Connections</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {xrpWallets.filter(w => isXamanLinked(w.address)).length}/{xrpWallets.length} linked
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Link each XRP address to Xaman so the site can build transactions for your cold wallets. Approve with your main Xaman account.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {xrpWallets.map((w) => {
                const linked = isXamanLinked(w.address);
                return (
                  <div key={w.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border" data-testid={`xaman-row-${w.id}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: "#00A4E4" }}
                      >
                        XRP
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{w.label || "Unlabeled"}</span>
                          {linked && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400">
                              <Link2 className="h-3 w-3 mr-1" />
                              Xaman Linked
                            </Badge>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">
                          {w.address.slice(0, 8)}...{w.address.slice(-6)}
                        </code>
                      </div>
                    </div>
                    {linked ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-[#00A4E4] text-[#00A4E4] hover:bg-[#00A4E4]/10"
                        onClick={() => handleLinkXaman(w.address)}
                        disabled={linkingAddress === w.address}
                        data-testid={`button-link-xaman-panel-${w.id}`}
                      >
                        {linkingAddress === w.address ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Linking...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4 mr-1.5" />
                            Link Xaman
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {userWallets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No addresses tracked yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Paste any public blockchain address — from a Ledger, Trezor, MetaMask, exchange deposit address, or any on-chain wallet. We'll pull balances and transaction history directly from the blockchain.
            </p>
            <Button
              className="mt-4"
              onClick={() => setIsDialogOpen(true)}
              data-testid="button-add-wallet-empty"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="source" className="space-y-4">
          <TabsList data-testid="tabs-wallet-views">
            <TabsTrigger value="source" data-testid="tab-by-source">
              <Layers className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">By Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="asset" data-testid="tab-by-asset">
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">By Asset</span>
            </TabsTrigger>
            <TabsTrigger value="detail" data-testid="tab-detail">
              <Eye className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">All Holdings</span>
            </TabsTrigger>
            <TabsTrigger value="recommend" data-testid="tab-recommend">
              <ShieldCheck className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Recommendations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="source" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {(() => {
                  const groups: Record<string, WalletWithBalances[]> = {};
                  for (const w of userWallets) {
                    const key = (w.label || "Unlabeled").trim();
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(w);
                  }
                  return Object.entries(groups).map(([groupName, groupWallets]) => {
                    const groupTotal = groupWallets.reduce(
                      (s, w) => s + w.balances.reduce((bs, b) => bs + getEnrichedUsdValue(b.assetSymbol, parseFloat(b.balance), b.usdValue), 0),
                      0
                    );
                    const isCollapsed = collapsedGroups?.[groupName] ?? true;
                    const hasXamanSigning = groupWallets.some(
                      (w) => w.chain === "xrp" && isXamanLinked(w.address)
                    );
                    return (
                      <Card key={groupName} data-testid={`wallet-group-${groupName.toLowerCase().replace(/\s+/g, "-")}`}>
                        <CardHeader className="pb-2">
                          <button
                            className="flex items-center justify-between w-full text-left group"
                            onClick={() => toggleGroup(groupName)}
                            data-testid={`toggle-group-${groupName.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Wallet className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-base">{groupName}</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {groupWallets.length} address{groupWallets.length !== 1 ? "es" : ""}
                                  </Badge>
                                  {hasXamanSigning && (
                                    <Badge variant="outline" className="text-[10px] border-[#00A4E4] text-[#00A4E4]" data-testid={`badge-xaman-signing-${groupName.toLowerCase().replace(/\s+/g, "-")}`}>
                                      <Smartphone className="h-3 w-3 mr-1" />
                                      Xaman Signing
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {groupWallets.map((w) => CHAIN_LABELS[w.chain] || w.chain.toUpperCase()).join(", ")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-lg font-bold font-mono">{formatUsd(groupTotal)}</span>
                              {isCollapsed ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronUp className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </button>
                        </CardHeader>
                        {!isCollapsed && (
                          <CardContent className="pt-0 space-y-3">
                            {groupWallets.map((w) => {
                              const totalVal = w.balances.reduce((s, b) => s + getEnrichedUsdValue(b.assetSymbol, parseFloat(b.balance), b.usdValue), 0);
                              const xamanLinked = w.chain === "xrp" && isXamanLinked(w.address);
                              const isXrpAddress = w.chain === "xrp";
                              return (
                                <div key={w.id} className="rounded-lg border p-3" data-testid={`wallet-card-${w.id}`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                                        style={{ backgroundColor: CHAIN_COLORS[w.chain] || "#666" }}
                                      >
                                        {CHAIN_LABELS[w.chain] || "?"}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-sm">{w.chain === "manual" ? (w.label || "Manual Entry") : (CHAIN_LABELS[w.chain] || w.chain)}</span>
                                          {w.chain === "manual" && (
                                            <Badge variant="outline" className="text-[10px] border-gray-400 text-gray-500">
                                              Manual
                                            </Badge>
                                          )}
                                          {xamanLinked && (
                                            <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400" data-testid={`badge-xaman-connected-${w.id}`}>
                                              <Link2 className="h-3 w-3 mr-1" />
                                              Xaman Linked
                                            </Badge>
                                          )}
                                          {isXrpAddress && !xamanLinked && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-5 text-[10px] px-2 border-[#00A4E4] text-[#00A4E4] hover:bg-[#00A4E4]/10"
                                              onClick={() => handleLinkXaman(w.address)}
                                              disabled={linkingAddress === w.address}
                                              data-testid={`button-link-xaman-${w.id}`}
                                            >
                                              {linkingAddress === w.address ? (
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                              ) : (
                                                <LinkIcon className="h-3 w-3 mr-1" />
                                              )}
                                              Link Xaman
                                            </Button>
                                          )}
                                        </div>
                                        {w.chain !== "manual" ? (
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <code className="text-xs text-muted-foreground truncate">
                                              {truncateAddress(w.address)}
                                            </code>
                                            <button
                                              onClick={() => handleCopy(w.address)}
                                              className="text-muted-foreground hover:text-foreground shrink-0"
                                              data-testid={`button-copy-${w.id}`}
                                            >
                                              {copiedAddress === w.address ? (
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                              ) : (
                                                <Copy className="h-3 w-3" />
                                              )}
                                            </button>
                                            <a
                                              href={getExplorerUrl(w.chain, w.address)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-muted-foreground hover:text-foreground shrink-0"
                                              data-testid={`link-explorer-${w.id}`}
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            Balance manually maintained — not synced from blockchain
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                                      <span className="text-sm font-bold font-mono">
                                        {formatUsd(totalVal)}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => syncMutation.mutate(w.id)}
                                          disabled={syncMutation.isPending}
                                          data-testid={`button-sync-${w.id}`}
                                        >
                                          <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-destructive hover:text-destructive"
                                              data-testid={`button-delete-${w.id}`}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remove wallet?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will remove the wallet and its balance data from your portfolio. You can always add it back.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => deleteMutation.mutate(w.id)}>
                                                Remove
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  </div>
                                  {w.balances.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {w.balances.map((b) => {
                                        const balVal = parseFloat(b.balance);
                                        const usdVal = getEnrichedUsdValue(b.assetSymbol, balVal, b.usdValue);
                                        const pricePerUnit = balVal > 0 ? usdVal / balVal : 0;
                                        return (
                                          <div
                                            key={b.id}
                                            className="py-2 border-t"
                                            data-testid={`balance-${b.assetSymbol}-${w.id}`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                  <span className="text-[10px] sm:text-xs font-bold text-primary">
                                                    {b.assetSymbol.slice(0, 2)}
                                                  </span>
                                                </div>
                                                <div className="min-w-0">
                                                  <span className="font-medium text-sm truncate block">{b.assetSymbol}</span>
                                                  <span className="text-xs font-mono font-medium text-foreground">
                                                    {formatBalance(balVal, 4)}
                                                  </span>
                                                </div>
                                              </div>
                                              <span className="font-mono font-medium text-xs sm:text-sm shrink-0">
                                                {formatUsd(usdVal)}
                                              </span>
                                            </div>
                                            <CostBasisPanel
                                              balance={b}
                                              currentPrice={pricePerUnit}
                                              moveTargets={userWallets.flatMap(ow =>
                                                ow.balances
                                                  .filter(ob => ob.id !== b.id && ob.assetSymbol.toUpperCase() === b.assetSymbol.toUpperCase())
                                                  .map(ob => ({ walletBalanceId: ob.id, walletLabel: ow.label || ow.chain, chain: ow.chain }))
                                              )}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {w.balances.length === 0 && (
                                    <div className="mt-2">
                                      {["polkadot", "cosmos", "tron", "cronos", "algorand"].includes(w.chain) ? (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">
                                            No balances found. Try syncing this wallet.
                                          </p>
                                          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md p-2">
                                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            <span>
                                              If your assets are staked through a platform like Ledger Earn or a nomination pool, they may have been moved to a pool address. On-chain tracking only sees balances at your address — staked assets held by pools won't appear here.
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          No balances found. Try syncing this wallet.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {w.lastSyncAt && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Last synced: {format(new Date(w.lastSyncAt), "MMM d, yyyy h:mm a")}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </CardContent>
                        )}
                      </Card>
                    );
                  });
                })()}
              </div>

              {bySourceData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribution by Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={bySourceData.reduce((acc, item, i) => {
                        acc[item.name] = { label: item.name, color: CHAIN_COLORS[item.chain] || CHART_COLORS[i] };
                        return acc;
                      }, {} as Record<string, { label: string; color: string }>)}
                      className="h-56 w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={bySourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {bySourceData.map((entry, i) => (
                              <Cell key={i} fill={CHAIN_COLORS[entry.chain] || CHART_COLORS[i]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <div className="mt-4 space-y-2">
                      {bySourceData.map((item, i) => {
                        const total = bySourceData.reduce((s, d) => s + d.value, 0);
                        return (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: CHAIN_COLORS[item.chain] || CHART_COLORS[i] }}
                              />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                              <span className="font-mono">{formatUsd(item.value)}</span>
                              <span className="text-muted-foreground hidden sm:inline">
                                ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="asset" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Holdings by Asset</CardTitle>
                    <CardDescription>
                      All your coins aggregated across wallets — see total exposure per asset
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {byAssetData.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Sync your wallets to see aggregated holdings
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {[...byAssetData]
                          .sort((a, b) => b.usdValue - a.usdValue)
                          .map((h, i) => {
                            const total = portfolioData?.totalValue || 1;
                            const pct = (h.usdValue / total) * 100;
                            return (
                              <div
                                key={h.symbol}
                                className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-lg border"
                                data-testid={`asset-row-${h.symbol}`}
                              >
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center bg-primary/10 shrink-0">
                                  <span className="text-xs sm:text-sm font-bold text-primary">
                                    {h.symbol.slice(0, 3)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm sm:text-base">{h.symbol}</span>
                                    <span className="font-mono font-medium text-sm sm:text-base">{formatUsd(h.usdValue)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground font-mono truncate">
                                      {formatBalance(h.balance, 4)} {h.symbol}
                                    </span>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {pct.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${Math.min(pct, 100)}%`,
                                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                      }}
                                    />
                                  </div>
                                  {h.sources.length > 0 && (
                                    <div className="hidden sm:flex gap-1 mt-1.5 flex-wrap">
                                      {h.sources.map((src) => (
                                        <Badge key={src} variant="outline" className="text-[10px] px-1.5 py-0">
                                          {src}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {byAssetData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Asset Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={byAssetData.reduce((acc, item, i) => {
                        acc[item.symbol] = { label: item.symbol, color: CHART_COLORS[i % CHART_COLORS.length] };
                        return acc;
                      }, {} as Record<string, { label: string; color: string }>)}
                      className="h-56 w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={byAssetData.map((h) => ({ name: h.symbol, value: h.usdValue }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {byAssetData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <div className="mt-4 space-y-2">
                      {[...byAssetData]
                        .sort((a, b) => b.usdValue - a.usdValue)
                        .map((h, i) => {
                          const total = portfolioData?.totalValue || 1;
                          return (
                            <div key={h.symbol} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                />
                                <span>{h.symbol}</span>
                              </div>
                              <span className="font-mono text-muted-foreground">
                                {((h.usdValue / total) * 100).toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="detail" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Holdings — Detailed View</CardTitle>
                <CardDescription>
                  Every position across every wallet. Compare where your assets sit to optimize staking, yield, or security.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allHoldings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Sync your wallets to see individual holdings
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead className="hidden sm:table-cell">Source</TableHead>
                          <TableHead className="hidden md:table-cell">Chain</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">Balance</TableHead>
                          <TableHead className="text-right">USD Value</TableHead>
                          <TableHead className="hidden md:table-cell text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...allHoldings]
                          .sort((a, b) => b.usdValue - a.usdValue)
                          .map((h, i) => {
                            const total = portfolioData?.totalValue || 1;
                            const pct = (h.usdValue / total) * 100;
                            return (
                              <TableRow key={`${h.walletId}-${h.symbol}`} data-testid={`holding-row-${i}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <span className="text-[10px] sm:text-xs font-bold text-primary">
                                        {h.symbol.slice(0, 2)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-sm">{h.symbol}</span>
                                      <div className="sm:hidden text-xs text-muted-foreground font-mono">
                                        {formatBalance(h.balance, 4)}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge variant="outline" className="text-xs">
                                    {h.source}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="text-sm font-mono"
                                      style={{ color: CHAIN_COLORS[h.chain] || "#666" }}
                                    >
                                      {CHAIN_LABELS[h.chain] || "?"}
                                    </span>
                                    <span className="text-sm capitalize">{h.chain}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-right font-mono">
                                  {formatBalance(h.balance)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  {formatUsd(h.usdValue)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      {pct.toFixed(1)}%
                                    </span>
                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-primary"
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                  </div>
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
          </TabsContent>

          <TabsContent value="recommend" className="space-y-6">
            {exchangeValue > 0 && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-200">
                        You have {formatUsd(exchangeValue)} on exchanges
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        Moving assets to a cold wallet gives you full control of your private keys.
                        Not your keys, not your crypto.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {uniqueAssetSymbols.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No assets detected yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Connect an exchange or add a wallet to get personalized hardware wallet recommendations
                    based on the coins you own.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Recommended for Your Portfolio</h2>
                  <p className="text-sm text-muted-foreground">
                    Based on your {uniqueAssetSymbols.length} asset{uniqueAssetSymbols.length !== 1 ? "s" : ""}: {uniqueAssetSymbols.slice(0, 8).join(", ")}{uniqueAssetSymbols.length > 8 ? ` + ${uniqueAssetSymbols.length - 8} more` : ""}
                  </p>
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {recommendations.map((rec, i) => (
                    <Card
                      key={rec.model}
                      className={cn(
                        "relative overflow-hidden",
                        i === 0 && "ring-2 ring-primary"
                      )}
                      data-testid={`wallet-rec-${rec.model}`}
                    >
                      {i === 0 && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            TOP PICK
                          </div>
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{rec.name}</CardTitle>
                        <CardDescription>{rec.bestFor}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{rec.price}</span>
                          <Badge
                            variant={rec.coverage === 100 ? "default" : "secondary"}
                            className={cn(
                              rec.coverage === 100 && "bg-emerald-600 text-white",
                              rec.coverage >= 80 && rec.coverage < 100 && "bg-amber-500 text-white"
                            )}
                          >
                            {rec.coverage.toFixed(0)}% coverage
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Supports {rec.totalCoins} coins total
                          </p>
                          <div className="space-y-1">
                            {rec.supported.slice(0, 6).map((sym) => (
                              <div key={sym} className="flex items-center gap-2 text-sm">
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{sym}</span>
                              </div>
                            ))}
                            {rec.supported.length > 6 && (
                              <p className="text-xs text-muted-foreground ml-5">
                                + {rec.supported.length - 6} more supported
                              </p>
                            )}
                            {rec.unsupported.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                {rec.unsupported.slice(0, 3).map((sym) => (
                                  <div key={sym} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                    <span>{sym}</span>
                                  </div>
                                ))}
                                {rec.unsupported.length > 3 && (
                                  <p className="text-xs text-muted-foreground ml-5">
                                    + {rec.unsupported.length - 3} more not supported
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Key Features</p>
                          <div className="flex flex-wrap gap-1">
                            {rec.features.map((f) => (
                              <Badge key={f} variant="outline" className="text-[10px]">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          variant={i === 0 ? "default" : "outline"}
                          asChild
                          data-testid={`button-buy-${rec.model}`}
                        >
                          <a
                            href={rec.referralUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Buy {rec.name}
                            <ExternalLink className="h-3.5 w-3.5 ml-2" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {migrationItems.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        Migration Guide
                      </CardTitle>
                      <CardDescription>
                        Assets currently on exchanges that you could move to self-custody.
                        Always double-check the receiving address and send a small test amount first.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead className="hidden sm:table-cell">Currently On</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="hidden md:table-cell">Compatible Wallets</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {migrationItems.map((item, idx) => {
                            const compatWallets = HARDWARE_WALLETS.filter((hw) =>
                              hw.supportedAssets.includes(item.symbol)
                            ).map((hw) => hw.name);
                            return (
                              <TableRow key={`${item.symbol}-${item.source}-${idx}`} data-testid={`migration-row-${idx}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <span className="text-[10px] sm:text-xs font-bold text-primary">
                                        {item.symbol.slice(0, 2)}
                                      </span>
                                    </div>
                                    <span className="font-medium text-sm">{item.symbol}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge variant="outline" className="text-xs">
                                    {item.source}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatUsd(item.usdValue)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <div className="flex flex-wrap gap-1">
                                    {compatWallets.length > 0 ? (
                                      compatWallets.slice(0, 2).map((wn) => (
                                        <Badge key={wn} variant="secondary" className="text-[10px]">
                                          {wn}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Check wallet compatibility
                                      </span>
                                    )}
                                    {compatWallets.length > 2 && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        +{compatWallets.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Why use a hardware wallet?</p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>Your private keys never leave the device — even if your computer is compromised</li>
                          <li>Full ownership: no exchange can freeze, lock, or lose your funds</li>
                          <li>Protection against exchange hacks, bankruptcies, and withdrawal freezes</li>
                          <li>Works with CryptoOwnBank — connect your Ledger to manage Soil vaults directly</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!mobileLinkPayload} onOpenChange={(open) => { if (!open) cancelMobileLink(); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-mobile-xaman-link">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#00A4E4]" />
              Link with Xaman
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-3">
            <div className="w-full rounded-lg bg-muted/50 border p-3">
              <p className="text-xs text-muted-foreground mb-1">Linking wallet:</p>
              <p className="text-sm font-semibold">
                {linkingAddress ? (() => {
                  const wallet = userWallets.find(w => w.address === linkingAddress);
                  return wallet?.label || "XRP Wallet";
                })() : "XRP Wallet"}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {linkingAddress ? linkingAddress.slice(0, 12) + "..." + linkingAddress.slice(-6) : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Approve in Xaman with your main account to authorize this wallet connection.
            </p>
            {mobileLinkPayload && (
              <a
                href={mobileLinkPayload.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00A4E4] text-white px-6 py-3 text-base font-semibold shadow-lg active:bg-[#0090c8] w-full"
                data-testid="link-open-xaman"
              >
                <Smartphone className="h-5 w-5" />
                Open Xaman to Approve
              </a>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for approval...
            </div>
            <p className="text-xs text-muted-foreground text-center">
              After approving, come back here. The connection saves automatically.
            </p>
            <Button variant="ghost" size="sm" onClick={cancelMobileLink} data-testid="button-cancel-link">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
