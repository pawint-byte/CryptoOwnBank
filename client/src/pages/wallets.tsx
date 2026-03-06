import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradePrompt } from "@/components/upgrade-prompt";
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
  nervos: "CKB",
  zilliqa: "ZIL",
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
  nervos: "#3CC68A",
  zilliqa: "#49C1BF",
};

const CHART_COLORS = [
  "#00A4E4", "#F7931A", "#627EEA", "#9945FF", "#C2A633",
  "#345D9D", "#0033AD", "#E91E63", "#4CAF50", "#FF9800",
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
    referralUrl: "https://shop.ledger.com/pages/ledger-nano-x?r=YOUR_REFERRAL",
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
    referralUrl: "https://shop.ledger.com/pages/ledger-nano-s-plus?r=YOUR_REFERRAL",
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
    referralUrl: "https://shop.ledger.com/pages/ledger-stax?r=YOUR_REFERRAL",
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
    nervos: `https://explorer.nervos.org/address/${address}`,
    zilliqa: `https://viewblock.io/zilliqa/address/${address}`,
  };
  return explorers[chain] || "#";
}

export default function Wallets() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { toast } = useToast();

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
      if (txCount > 0) {
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
      for (const wallet of userWallets) {
        await apiRequest("POST", `/api/wallets/${wallet.id}/sync`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "All wallets synced" });
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

  const bySourceData = userWallets.map((w) => {
    const total = w.balances.reduce((s, b) => s + parseFloat(b.usdValue || "0"), 0);
    return {
      name: w.label || `${w.chain.charAt(0).toUpperCase() + w.chain.slice(1)} Wallet`,
      value: total,
      chain: w.chain,
    };
  }).filter((d) => d.value > 0);

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
        usdValue: parseFloat(b.usdValue || "0"),
        source: w.label || `${w.chain.charAt(0).toUpperCase() + w.chain.slice(1)} Wallet`,
        chain: w.chain,
        walletId: w.id,
      });
    }
  }

  const savedLabels = Array.from(
    new Set(userWallets.map((w) => w.label).filter((l): l is string => !!l && l.trim().length > 0))
  ).sort();

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
    { value: "nervos", label: "Nervos (CKB)" },
    { value: "zilliqa", label: "Zilliqa (ZIL)" },
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
          <h1 className="text-2xl font-bold" data-testid="text-wallets-title">Blockchain Addresses</h1>
          <p className="text-muted-foreground">
            Paste any public address to automatically pull on-chain balances and transaction history — read-only, no keys needed
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label (Optional)</FormLabel>
                        {savedLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pb-1" data-testid="saved-labels">
                            {savedLabels.map((lbl) => (
                              <Button
                                key={lbl}
                                type="button"
                                variant={field.value === lbl ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs px-2.5"
                                onClick={() => field.onChange(field.value === lbl ? "" : lbl)}
                                data-testid={`label-quick-pick-${lbl.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {lbl}
                              </Button>
                            ))}
                          </div>
                        )}
                        <FormControl>
                          <Input
                            placeholder="e.g. My Ledger, Cold Storage, Trading..."
                            {...field}
                            data-testid="input-wallet-label"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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
                            <strong className="text-foreground">XRP + issued currencies.</strong>{" "}
                            We'll pull your native XRP balance plus any trust line tokens (RLUSD, etc.) from the XRP Ledger.
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
        </div>
      </div>

      {walletAtLimit && (
        <UpgradePrompt
          compact
          feature="Free users can track 1 cold wallet. Upgrade to Premium for unlimited wallet tracking."
        />
      )}

      {userWallets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Wallet Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-total-wallet-value">
                {portfolioLoading ? <Skeleton className="h-8 w-32" /> : formatUsd(portfolioData?.totalValue || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wallets Connected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-wallet-count">
                {userWallets.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assets Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-asset-count">
                {byAssetData.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
              <Layers className="h-4 w-4 mr-2" />
              By Source
            </TabsTrigger>
            <TabsTrigger value="asset" data-testid="tab-by-asset">
              <BarChart3 className="h-4 w-4 mr-2" />
              By Asset
            </TabsTrigger>
            <TabsTrigger value="detail" data-testid="tab-detail">
              <Eye className="h-4 w-4 mr-2" />
              All Holdings
            </TabsTrigger>
            <TabsTrigger value="recommend" data-testid="tab-recommend">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="source" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {userWallets.map((w) => {
                  const totalVal = w.balances.reduce((s, b) => s + parseFloat(b.usdValue || "0"), 0);
                  return (
                    <Card key={w.id} data-testid={`wallet-card-${w.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                              style={{ backgroundColor: CHAIN_COLORS[w.chain] || "#666" }}
                            >
                              {CHAIN_LABELS[w.chain] || "?"}
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {w.label || `${w.chain.charAt(0).toUpperCase() + w.chain.slice(1)} Wallet`}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-0.5">
                                <code className="text-xs text-muted-foreground">
                                  {truncateAddress(w.address)}
                                </code>
                                <button
                                  onClick={() => handleCopy(w.address)}
                                  className="text-muted-foreground hover:text-foreground"
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
                                  className="text-muted-foreground hover:text-foreground"
                                  data-testid={`link-explorer-${w.id}`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold font-mono">
                              {formatUsd(totalVal)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
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
                                  className="text-destructive hover:text-destructive"
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
                      </CardHeader>
                      {w.balances.length > 0 && (
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {w.balances.map((b) => (
                              <div
                                key={b.id}
                                className="flex items-center justify-between py-2 border-t"
                                data-testid={`balance-${b.assetSymbol}-${w.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">
                                      {b.assetSymbol.slice(0, 2)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-sm">{b.assetSymbol}</span>
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {formatBalance(parseFloat(b.balance))}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-mono font-medium text-sm">
                                  {formatUsd(parseFloat(b.usdValue || "0"))}
                                </span>
                              </div>
                            ))}
                          </div>
                          {w.lastSyncAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Last synced: {format(new Date(w.lastSyncAt), "MMM d, yyyy h:mm a")}
                            </p>
                          )}
                        </CardContent>
                      )}
                      {w.balances.length === 0 && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground">
                            No balances found. Try syncing this wallet.
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
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
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: CHAIN_COLORS[item.chain] || CHART_COLORS[i] }}
                              />
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{formatUsd(item.value)}</span>
                              <span className="text-muted-foreground">
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
                                className="flex items-center gap-4 p-3 rounded-lg border"
                                data-testid={`asset-row-${h.symbol}`}
                              >
                                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/10">
                                  <span className="text-sm font-bold text-primary">
                                    {h.symbol.slice(0, 3)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">{h.symbol}</span>
                                    <span className="font-mono font-medium">{formatUsd(h.usdValue)}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {formatBalance(h.balance)} {h.symbol}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {pct.toFixed(1)}% of wallet portfolio
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
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
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
                          <TableHead>Source</TableHead>
                          <TableHead>Chain</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-right">USD Value</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
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
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-bold text-primary">
                                        {h.symbol.slice(0, 2)}
                                      </span>
                                    </div>
                                    <span className="font-medium">{h.symbol}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {h.source}
                                  </Badge>
                                </TableCell>
                                <TableCell>
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
                                <TableCell className="text-right font-mono">
                                  {formatBalance(h.balance)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  {formatUsd(h.usdValue)}
                                </TableCell>
                                <TableCell className="text-right">
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

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                            <TableHead>Currently On</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead>Compatible Wallets</TableHead>
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
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-bold text-primary">
                                        {item.symbol.slice(0, 2)}
                                      </span>
                                    </div>
                                    <span className="font-medium">{item.symbol}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {item.source}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatUsd(item.usdValue)}
                                </TableCell>
                                <TableCell>
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
    </div>
  );
}
