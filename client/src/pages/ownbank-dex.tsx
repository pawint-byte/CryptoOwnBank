import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  ArrowRightLeft,
  BookOpen,
  HelpCircle,
  X,
  RefreshCw,
  Wallet,
  Shield,
} from "lucide-react";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  getOrderBook,
  getAccountOffers,
  getAccountTransactions,
  getAccountTrustlines,
  getBalances,
  type OrderBookEntry,
  type XrplOffer,
  type XrplTransaction,
} from "@/lib/xrpl-client";
import { signTransaction, hasPendingXummPayment, completePendingXummPayment, clearPendingXummPayment } from "@/lib/xumm-connector";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useToast } from "@/hooks/use-toast";

const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

interface TradingPair {
  label: string;
  base: { currency: string; issuer?: string; display: string };
  counter: { currency: string; issuer?: string; display: string };
}

interface PairCategory {
  label: string;
  pairs: TradingPair[];
}

const PAIR_CATEGORIES: PairCategory[] = [
  {
    label: "Stablecoins",
    pairs: [
      {
        label: "XRP / RLUSD",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: RLUSD_CURRENCY, issuer: RLUSD_ISSUER, display: "RLUSD" },
      },
      {
        label: "XRP / USD (Bitstamp)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "USD", issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", display: "USD" },
      },
      {
        label: "XRP / EUR (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "EUR", issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq", display: "EUR" },
      },
      {
        label: "XRP / USD (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "USD", issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq", display: "USD (GH)" },
      },
    ],
  },
  {
    label: "Crypto",
    pairs: [
      {
        label: "XRP / BTC (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "BTC", issuer: "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL", display: "BTC" },
      },
      {
        label: "XRP / ETH (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "ETH", issuer: "rcA8X3TVMST1n3CJeAdGk1RdRCHii7N2h", display: "ETH" },
      },
      {
        label: "XRP / XLM (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "XLM", issuer: "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y", display: "XLM" },
      },
      {
        label: "XRP / LTC (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "LTC", issuer: "rcRzGWq6Ng3jeYhqnmM4zcWcUh69hrQ8V", display: "LTC" },
      },
      {
        label: "XRP / DOGE (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "DOG", issuer: "rLqUC2eCPohYvJCEBJ77eCCqVL2uEiczjA", display: "DOGE" },
      },
      {
        label: "SOLO / XRP",
        base: { currency: "534F4C4F00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "SOLO" },
        counter: { currency: "XRP", display: "XRP" },
      },
      {
        label: "CORE / XRP",
        base: { currency: "434F524500000000000000000000000000000000", issuer: "rcoreNywaoz2ZCQ8Lg2EbSLnGuRBmun6D", display: "CORE" },
        counter: { currency: "XRP", display: "XRP" },
      },
      {
        label: "ELS / XRP",
        base: { currency: "454C5300000000000000000000000000000000000", issuer: "rHXuEaRYnnJHbDeuBH5w8yPh5uwNVh5zAg", display: "ELS" },
        counter: { currency: "XRP", display: "XRP" },
      },
      {
        label: "CSC / XRP",
        base: { currency: "CSC", issuer: "rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr", display: "CSC" },
        counter: { currency: "XRP", display: "XRP" },
      },
      {
        label: "XRP / ADA (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "ADA", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "ADA" },
      },
      {
        label: "XRP / VET (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "VET", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "VET" },
      },
      {
        label: "XRP / ZIL (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "ZIL", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "ZIL" },
      },
      {
        label: "XRP / XDC (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "XDC", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "XDC" },
      },
      {
        label: "XRP / SHIB (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "534849420000000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "SHIB" },
      },
      {
        label: "XRP / HBAR (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "484241520000000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "HBAR" },
      },
      {
        label: "XRP / SOL (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "SOL", issuer: "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL", display: "SOL" },
      },
      {
        label: "XRP / DGB (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "DGB", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "DGB" },
      },
      {
        label: "XRP / CRO (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "CRO", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "CRO" },
      },
      {
        label: "XRP / EOS (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "EOS", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "EOS" },
      },
      {
        label: "XRP / FLR (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "FLR", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "FLR" },
      },
      {
        label: "XRP / ICP (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "ICP", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "ICP" },
      },
      {
        label: "XRP / LINK (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "4C494E4B00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "LINK" },
      },
      {
        label: "XRP / ONDO (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "4F4E444F00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "ONDO" },
      },
      {
        label: "XRP / TON (Sologenic)",
        base: { currency: "TON", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "TON" },
        counter: { currency: "XRP", display: "XRP" },
      },
      {
        label: "XRP / SUI (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "SUI", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "SUI" },
      },
      {
        label: "XRP / TRX (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "TRX", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "TRX" },
      },
      {
        label: "XRP / ZBCN (Sologenic)",
        base: { currency: "5A42434E00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "ZBCN" },
        counter: { currency: "XRP", display: "XRP" },
      },
      {
        label: "XRP / DOT (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "DOT", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "DOT" },
      },
      {
        label: "XRP / AVAX (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "4156415800000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "AVAX" },
      },
      {
        label: "XRP / ATOM (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "41544F4D00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "ATOM" },
      },
      {
        label: "XRP / ALGO (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "414C474F00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "ALGO" },
      },
      {
        label: "XRP / NEAR (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "4E45415200000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "NEAR" },
      },
      {
        label: "XRP / APT (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "APT", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "APT" },
      },
      {
        label: "XRP / PEPE (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "5045504500000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "PEPE" },
      },
      {
        label: "XRP / BONK (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "424F4E4B00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "BONK" },
      },
      {
        label: "XRP / UNI (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "UNI", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "UNI" },
      },
      {
        label: "XRP / AAVE (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "4141564500000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "AAVE" },
      },
      {
        label: "XRP / MATIC (Sologenic)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "4D41544943000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "MATIC" },
      },
    ],
  },
  {
    label: "Fiat",
    pairs: [
      {
        label: "XRP / GBP (GateHub)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "GBP", issuer: "r4GN9eEoz9K4BhMQXe4H1eYNwne3YtRhK", display: "GBP" },
      },
      {
        label: "XRP / CNY (RippleFox)",
        base: { currency: "XRP", display: "XRP" },
        counter: { currency: "CNY", issuer: "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y", display: "CNY" },
      },
    ],
  },
];

const ALL_PAIRS: TradingPair[] = PAIR_CATEGORIES.flatMap(c => c.pairs);
const COMMON_PAIRS = ALL_PAIRS;

function formatAmount(val: string | number, decimals = 6): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0";
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return num.toFixed(Math.min(decimals, 6));
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function OwnBankDex() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, walletAddress, walletType } = useXrplStore();
  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });
  const isPremiumOrAbove = subscriptionData?.tier === "premium" || subscriptionData?.tier === "pro";

  const [educationOpen, setEducationOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"swap" | "advanced">("swap");
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [myOffers, setMyOffers] = useState<XrplOffer[]>([]);
  const [loadingBook, setLoadingBook] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cancelingSeq, setCancelingSeq] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<XrplTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const pair = COMMON_PAIRS[selectedPairIndex];

  const fetchOrderBook = useCallback(async () => {
    setLoadingBook(true);
    try {
      const result = await getOrderBook(
        { currency: pair.base.currency, issuer: pair.base.issuer },
        { currency: pair.counter.currency, issuer: pair.counter.issuer },
        15
      );
      setBids(result.bids);
      setAsks(result.asks);
    } catch {
      toast({ title: "Failed to load order book", variant: "destructive" });
    } finally {
      setLoadingBook(false);
    }
  }, [pair, toast]);

  const fetchMyOffers = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingOffers(true);
    try {
      const offers = await getAccountOffers(walletAddress);
      setMyOffers(offers);
    } catch {
      setMyOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchOrderBook();
  }, [fetchOrderBook]);

  const fetchTradeHistory = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingHistory(true);
    try {
      const txs = await getAccountTransactions(walletAddress, 100);
      const trades = txs.filter(tx =>
        tx.type === "OfferCreate" && tx.status === "Success"
      );
      setTradeHistory(trades);
    } catch {
      setTradeHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isConnected) {
      fetchMyOffers();
    }
  }, [isConnected, fetchMyOffers]);

  useEffect(() => {
    if (hasPendingXummPayment()) {
      setPlacingOrder(true);
      completePendingXummPayment().then((result) => {
        setPlacingOrder(false);
        if (result.success) {
          toast({ title: "Order placed", description: "Your trade was submitted to the XRPL." });
          setTimeout(() => { fetchOrderBook(); fetchMyOffers(); }, 4000);
        } else if (result.error !== "No pending payment") {
          toast({ title: "Trade not completed", description: result.error || "Transaction was cancelled or timed out.", variant: "destructive" });
        }
      });
    }
  }, []);

  const computeTotal = () => {
    const a = parseFloat(amount) || 0;
    const p = parseFloat(price) || 0;
    return a * p;
  };

  const handlePlaceOrder = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid amount.", variant: "destructive" });
      return;
    }
    if (orderType === "limit") {
      const p = parseFloat(price);
      if (!p || p <= 0) {
        toast({ title: "Invalid price", description: "Enter a valid price.", variant: "destructive" });
        return;
      }
    }
    setConfirmDialogOpen(true);
  };

  const buildAmountField = (currency: { currency: string; issuer?: string; display: string }, value: string) => {
    if (currency.currency === "XRP") {
      return (parseFloat(value) * 1_000_000).toFixed(0);
    }
    return {
      currency: currency.currency,
      issuer: currency.issuer!,
      value: value,
    };
  };

  const handleConfirmOrder = async () => {
    setConfirmDialogOpen(false);
    setPlacingOrder(true);
    try {
      const a = parseFloat(amount);
      const p = parseFloat(price) || 0;

      if (orderType === "market") {
        const marketPrice = orderSide === "buy" ? asks[0]?.price : bids[0]?.price;
        if (!marketPrice || parseFloat(marketPrice) <= 0) {
          toast({ title: "No liquidity", description: "No orders available on the book for this pair. Try a limit order instead.", variant: "destructive" });
          setPlacingOrder(false);
          return;
        }
      }

      let takerGets: any;
      let takerPays: any;

      if (orderSide === "buy") {
        const usePrice = orderType === "limit" ? p : parseFloat(asks[0]?.price) || 0;
        takerGets = buildAmountField(pair.counter, (a * usePrice).toString());
        takerPays = buildAmountField(pair.base, a.toString());
      } else {
        const usePrice = orderType === "limit" ? p : parseFloat(bids[0]?.price) || 0;
        takerGets = buildAmountField(pair.base, a.toString());
        takerPays = buildAmountField(pair.counter, (a * usePrice).toString());
      }

      const txJson: Record<string, any> = {
        TransactionType: "OfferCreate",
        Account: walletAddress,
        TakerGets: takerGets,
        TakerPays: takerPays,
      };

      if (orderType === "market") {
        txJson.Flags = 0x00020000;
      }

      const result = await signTransaction(txJson);

      if (result.success) {
        const usePrice = orderType === "limit" ? p : parseFloat(orderSide === "buy" ? (asks[0]?.price || "0") : (bids[0]?.price || "0"));
        const totalVal = (a * usePrice).toFixed(6);
        toast({
          title: "Order Placed",
          description: `${orderSide === "buy" ? "Buy" : "Sell"} order for ${formatAmount(amount)} ${pair.base.display} submitted successfully.`,
        });
        try {
          window.fetch("/api/dex/trade-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              dex: "XRPL",
              side: orderSide === "buy" ? "Buy" : "Sell",
              orderType: orderType === "limit" ? "Limit" : "Market",
              baseAsset: pair.base.display,
              counterAsset: pair.counter.display,
              amount: formatAmount(amount),
              price: usePrice.toString(),
              total: totalVal,
              walletAddress,
              pair: `${pair.base.display}/${pair.counter.display}`,
            }),
          }).catch(() => {});
        } catch {}
        setAmount("");
        setPrice("");
        setTimeout(() => {
          fetchOrderBook();
          fetchMyOffers();
        }, 4000);
      } else {
        toast({ title: "Order Failed", description: result.error || "Transaction was not completed.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Order Error", description: err.message || "Unexpected error.", variant: "destructive" });
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCancelOrder = async (seq: number) => {
    setCancelingSeq(seq);
    try {
      const txJson = {
        TransactionType: "OfferCancel",
        Account: walletAddress,
        OfferSequence: seq,
      };
      const result = await signTransaction(txJson);
      if (result.success) {
        toast({ title: "Order Canceled", description: `Offer #${seq} canceled successfully.` });
        setTimeout(() => {
          fetchMyOffers();
          fetchOrderBook();
        }, 4000);
      } else {
        toast({ title: "Cancel Failed", description: result.error || "Could not cancel order.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Cancel Error", description: err.message || "Unexpected error.", variant: "destructive" });
    } finally {
      setCancelingSeq(null);
    }
  };

  const maxBidAmount = bids.reduce((max, b) => Math.max(max, parseFloat(b.amount) || 0), 0);
  const maxAskAmount = asks.reduce((max, a) => Math.max(max, parseFloat(a.amount) || 0), 0);
  const maxAmount = Math.max(maxBidAmount, maxAskAmount, 1);

  if (!isPremiumOrAbove) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dex-title">XRPL DEX Trading</h1>
          <p className="text-muted-foreground mt-1">
            Trade 44 token pairs on the XRP Ledger's built-in decentralized exchange — no smart contracts, no middleman apps.
          </p>
        </div>
        <UpgradePrompt
          feature="XRPL DEX trading is a Premium feature. Upgrade to access Quick Swap and Advanced order book trading across 44 pairs — stablecoins, crypto, and fiat — all bridged through XRP on the native DEX."
          variant="premium"
        />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dex-title">DEX Trading</h1>
          <p className="text-muted-foreground">Trade tokens on the XRPL decentralized exchange</p>
        </div>

        <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#00A4E4]" />
                  Learn: How the XRPL DEX Works
                </CardTitle>
                {educationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <EducationContent />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <ArrowRightLeft className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect your wallet from the OwnBank Dashboard to start trading on the XRPL DEX.
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
          <h1 className="text-2xl font-bold" data-testid="text-dex-title">DEX Trading</h1>
          <p className="text-muted-foreground">Trade tokens on the XRPL decentralized exchange</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" data-testid="badge-dex-wallet">
            <Wallet className="h-3 w-3 mr-1" />
            {truncateAddress(walletAddress!)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { fetchOrderBook(); fetchMyOffers(); }}
            disabled={loadingBook}
            data-testid="button-refresh-dex"
          >
            <RefreshCw className={`h-4 w-4 ${loadingBook ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#00A4E4]" />
                Learn: How the XRPL DEX Works
              </CardTitle>
              {educationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <EducationContent />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select
          value={selectedPairIndex.toString()}
          onValueChange={(val) => setSelectedPairIndex(parseInt(val))}
        >
          <SelectTrigger className="w-full sm:w-72" data-testid="select-trading-pair">
            <SelectValue placeholder="Select trading pair" />
          </SelectTrigger>
          <SelectContent>
            {PAIR_CATEGORIES.map((cat) => {
              const catOffset = ALL_PAIRS.indexOf(cat.pairs[0]);
              return (
                <div key={cat.label}>
                  <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat.label}</p>
                  {cat.pairs.map((p, j) => (
                    <SelectItem key={catOffset + j} value={(catOffset + j).toString()} data-testid={`select-pair-${catOffset + j}`}>
                      {p.label}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
        <Badge variant="secondary" data-testid="badge-selected-pair">
          {pair.base.display} / {pair.counter.display}
        </Badge>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={viewMode === "swap" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("swap")}
            data-testid="button-swap-mode"
          >
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Quick Swap
          </Button>
          <Button
            variant={viewMode === "advanced" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("advanced")}
            data-testid="button-advanced-mode"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Advanced
          </Button>
        </div>
      </div>

      {viewMode === "swap" && <QuickSwapPanel
        pair={pair}
        bids={bids}
        asks={asks}
        loadingBook={loadingBook}
        isConnected={isConnected}
        walletAddress={walletAddress}
        walletType={walletType}
        placingOrder={placingOrder}
        onPlaceOrder={async (side, amt) => {
          setPlacingOrder(true);
          try {
            const bestPrice = side === "buy" ? asks[0]?.price : bids[0]?.price;
            if (!bestPrice) {
              toast({ title: "No liquidity", description: "No orders available for this pair.", variant: "destructive" });
              return;
            }
            const a = parseFloat(amt);
            const p = parseFloat(bestPrice);
            let takerGets: any;
            let takerPays: any;
            if (side === "buy") {
              takerGets = buildAmountField(pair.counter, (a * p).toString());
              takerPays = buildAmountField(pair.base, a.toString());
            } else {
              takerGets = buildAmountField(pair.base, a.toString());
              takerPays = buildAmountField(pair.counter, (a * p).toString());
            }
            const txJson: Record<string, any> = {
              TransactionType: "OfferCreate",
              Account: walletAddress,
              TakerGets: takerGets,
              TakerPays: takerPays,
              Flags: 0x00020000,
            };
            const result = await signTransaction(txJson);
            if (result.success) {
              toast({ title: "Swap Completed", description: `${side === "buy" ? "Bought" : "Sold"} ${formatAmount(amt)} ${pair.base.display} successfully.` });
              setTimeout(() => { fetchOrderBook(); fetchMyOffers(); }, 4000);
            } else {
              toast({ title: "Swap Failed", description: result.error || "Transaction was not completed.", variant: "destructive" });
            }
          } catch (err: any) {
            toast({ title: "Swap Error", description: err.message || "Unexpected error.", variant: "destructive" });
          } finally {
            setPlacingOrder(false);
          }
        }}
        onRefresh={fetchOrderBook}
        toast={toast}
      />}

      {viewMode === "advanced" && <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" data-testid="card-order-book">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              Order Book
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Green = buyers willing to pay this price. Red = sellers asking this price. The gap is the "spread."</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchOrderBook}
              disabled={loadingBook}
              data-testid="button-refresh-orderbook"
            >
              <RefreshCw className={`h-4 w-4 ${loadingBook ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBook ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Bids (Buyers)
                  </p>
                  <div className="space-y-0.5">
                    {bids.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">No bids</p>
                    )}
                    {bids.slice(0, 12).map((bid, i) => {
                      const depthPercent = ((parseFloat(bid.amount) || 0) / maxAmount) * 100;
                      return (
                        <div
                          key={i}
                          className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm cursor-pointer"
                          onClick={() => { setPrice(parseFloat(bid.price).toFixed(6)); setOrderSide("sell"); }}
                          data-testid={`row-bid-${i}`}
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-green-500/10 rounded-sm"
                            style={{ width: `${Math.min(depthPercent, 100)}%` }}
                          />
                          <span className="relative text-green-600 dark:text-green-400">{formatAmount(bid.price, 6)}</span>
                          <span className="relative text-muted-foreground">{formatAmount(bid.amount, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Asks (Sellers)
                  </p>
                  <div className="space-y-0.5">
                    {asks.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">No asks</p>
                    )}
                    {asks.slice(0, 12).map((ask, i) => {
                      const depthPercent = ((parseFloat(ask.amount) || 0) / maxAmount) * 100;
                      return (
                        <div
                          key={i}
                          className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm cursor-pointer"
                          onClick={() => { setPrice(parseFloat(ask.price).toFixed(6)); setOrderSide("buy"); }}
                          data-testid={`row-ask-${i}`}
                        >
                          <div
                            className="absolute inset-y-0 right-0 bg-red-500/10 rounded-sm"
                            style={{ width: `${Math.min(depthPercent, 100)}%` }}
                          />
                          <span className="relative text-red-600 dark:text-red-400">{formatAmount(ask.price, 6)}</span>
                          <span className="relative text-muted-foreground">{formatAmount(ask.amount, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {bids.length > 0 && asks.length > 0 && (
              <div className="mt-3 pt-3 border-t flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Best Bid: <span className="font-mono text-green-600 dark:text-green-400">{formatAmount(bids[0].price, 6)}</span></span>
                <span>Best Ask: <span className="font-mono text-red-600 dark:text-red-400">{formatAmount(asks[0].price, 6)}</span></span>
                <span>Spread: <span className="font-mono">{formatAmount((parseFloat(asks[0].price) - parseFloat(bids[0].price)).toString(), 6)}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-place-order">
          <CardHeader className="space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              Place Order
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>You're creating an offer on the blockchain. If matched, the trade executes instantly. If not, your order sits in the book until someone takes it or you cancel.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1">
              <Button
                variant={orderSide === "buy" ? "default" : "outline"}
                className={orderSide === "buy" ? "flex-1 bg-green-600 border-green-600 text-white" : "flex-1"}
                onClick={() => setOrderSide("buy")}
                data-testid="button-buy"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Buy
              </Button>
              <Button
                variant={orderSide === "sell" ? "default" : "outline"}
                className={orderSide === "sell" ? "flex-1 bg-red-600 border-red-600 text-white" : "flex-1"}
                onClick={() => setOrderSide("sell")}
                data-testid="button-sell"
              >
                <TrendingDown className="h-4 w-4 mr-1" />
                Sell
              </Button>
            </div>

            <div className="flex gap-1">
              <Button
                variant={orderType === "limit" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setOrderType("limit")}
                data-testid="button-limit"
              >
                Limit
              </Button>
              <Button
                variant={orderType === "market" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setOrderType("market")}
                data-testid="button-market"
              >
                Market
              </Button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Amount ({pair.base.display})
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.000001"
                data-testid="input-order-amount"
              />
            </div>

            {orderType === "limit" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Price ({pair.counter.display} per {pair.base.display})
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.000001"
                  data-testid="input-order-price"
                />
              </div>
            )}

            {orderType === "limit" && amount && price && (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-medium" data-testid="text-order-total">
                  {formatAmount(computeTotal(), 4)} {pair.counter.display}
                </span>
              </div>
            )}

            <Button
              className={`w-full ${orderSide === "buy" ? "bg-green-600 border-green-600 text-white" : "bg-red-600 border-red-600 text-white"}`}
              onClick={handlePlaceOrder}
              disabled={placingOrder}
              data-testid="button-place-order"
            >
              {placingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  {orderSide === "buy" ? "Buy" : "Sell"} {pair.base.display}
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Network fee: ~0.00001 XRP (fraction of a penny)
            </p>
          </CardContent>
        </Card>
      </div>}

      <Card data-testid="card-my-orders">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            My Open Orders
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>Canceling an order is free (just the tiny XRPL network fee). Your funds are never locked.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMyOffers}
            disabled={loadingOffers}
            data-testid="button-refresh-orders"
          >
            <RefreshCw className={`h-4 w-4 ${loadingOffers ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingOffers ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : myOffers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-orders">
              No open orders. Place an order above to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {myOffers.map((offer) => (
                <div
                  key={offer.seq}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                  data-testid={`row-order-${offer.seq}`}
                >
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <Badge variant="secondary" className="shrink-0" data-testid={`badge-order-seq-${offer.seq}`}>
                      #{offer.seq}
                    </Badge>
                    <span className="text-sm font-mono">
                      <span className="text-muted-foreground">Selling</span>{" "}
                      <span className="font-medium">{formatAmount(offer.takerGets.amount, 4)} {offer.takerGets.currency === RLUSD_CURRENCY ? "RLUSD" : offer.takerGets.currency}</span>
                    </span>
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono">
                      <span className="text-muted-foreground">For</span>{" "}
                      <span className="font-medium">{formatAmount(offer.takerPays.amount, 4)} {offer.takerPays.currency === RLUSD_CURRENCY ? "RLUSD" : offer.takerPays.currency}</span>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelOrder(offer.seq)}
                    disabled={cancelingSeq === offer.seq}
                    data-testid={`button-cancel-order-${offer.seq}`}
                  >
                    {cancelingSeq === offer.seq ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-trade-history">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            Trade History
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>Your recent OfferCreate transactions on the XRPL DEX — both filled and placed orders.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTradeHistory}
              disabled={loadingHistory}
              data-testid="button-refresh-history"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory && tradeHistory.length === 0) fetchTradeHistory();
              }}
              data-testid="button-toggle-history"
            >
              {showHistory ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showHistory ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : tradeHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-history">
                No trade history found. Place a trade to see it here.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tradeHistory.map((tx) => {
                  const displayCurrency = (c: string) =>
                    c === RLUSD_CURRENCY ? "RLUSD" : c;
                  return (
                    <div
                      key={tx.hash}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                      data-testid={`row-history-${tx.hash.slice(0, 8)}`}
                    >
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        <Badge variant="outline" className="shrink-0 text-green-400 border-green-500/30">
                          Trade
                        </Badge>
                        <span className="text-sm font-mono">
                          <span className="font-medium">{formatAmount(tx.amount, 4)} {displayCurrency(tx.currency)}</span>
                        </span>
                        {tx.amount2 && tx.currency2 && (
                          <>
                            <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-sm font-mono">
                              <span className="font-medium">{formatAmount(tx.amount2, 4)} {displayCurrency(tx.currency2)}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {tx.date ? new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                        <a
                          href={`https://xrpscan.com/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00A4E4] hover:text-[#00A4E4]/80"
                          data-testid={`link-tx-${tx.hash.slice(0, 8)}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <XrplDisclaimer />

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-confirm-order-title">
              Confirm {orderSide === "buy" ? "Buy" : "Sell"} Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Side</span>
                <Badge className={orderSide === "buy" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"}>
                  {orderSide === "buy" ? "Buy" : "Sell"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{orderType === "limit" ? "Limit" : "Market"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium font-mono">{formatAmount(amount)} {pair.base.display}</span>
              </div>
              {orderType === "limit" && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium font-mono">{formatAmount(price)} {pair.counter.display}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium font-mono">{formatAmount(computeTotal(), 4)} {pair.counter.display}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Pair</span>
                <span className="font-medium">{pair.label}</span>
              </div>
            </div>

            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                {walletType === "xumm" ? (
                  <>Your Xaman wallet will prompt you to sign an <span className="font-semibold">OfferCreate</span> transaction. If matched, the trade executes instantly on the XRPL.</>
                ) : (
                  <>Confirm the <span className="font-semibold">OfferCreate</span> transaction on your Ledger device.</>
                )}
              </p>
              <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">
                Non-custodial. Your funds stay in your wallet until the trade executes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} data-testid="button-cancel-confirm">
              Cancel
            </Button>
            <Button
              className={orderSide === "buy" ? "bg-green-600 border-green-600 text-white" : "bg-red-600 border-red-600 text-white"}
              onClick={handleConfirmOrder}
              disabled={placingOrder}
              data-testid="button-confirm-order"
            >
              {placingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Sign & Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EducationContent() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border p-4 space-y-2">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Old Way</p>
          <p className="text-sm text-muted-foreground">
            Call your broker &rarr; they place the order &rarr; matched on NYSE &rarr; T+2 settlement (2 days) &rarr; brokerage holds your shares
          </p>
        </div>
        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">New Way (XRPL DEX)</p>
          <p className="text-sm text-muted-foreground">
            Place an order &rarr; matched on the XRPL DEX &rarr; settled in 4 seconds &rarr; tokens stay in YOUR wallet
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/30 border border-muted p-4 space-y-2">
        <p className="text-sm font-medium">How the XRPL DEX works</p>
        <p className="text-sm text-muted-foreground">
          The XRP Ledger has a built-in exchange &mdash; no company runs it. When you place an order, it goes directly on the blockchain. If someone has a matching order, the trade happens automatically. Your funds never leave your wallet until the trade executes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold mb-1">Limit Order</p>
          <p className="text-xs text-muted-foreground">
            Set your price and wait for a match (like a "buy at $X" stock order)
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold mb-1">Market Order</p>
          <p className="text-xs text-muted-foreground">
            Buy/sell immediately at the best available price
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold mb-1">Order Book</p>
          <p className="text-xs text-muted-foreground">
            The list of everyone's open buy and sell orders
          </p>
        </div>
      </div>

      <a
        href="https://xrpl.org/decentralized-exchange.html"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-[#00A4E4] hover:underline"
        data-testid="link-xrpl-dex-docs"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Learn more on XRPL.org
      </a>
    </>
  );
}

interface QuickSwapPanelProps {
  pair: TradingPair;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  loadingBook: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  walletType: string | null;
  placingOrder: boolean;
  onPlaceOrder: (side: "buy" | "sell", amount: string) => Promise<void>;
  onRefresh: () => void;
  toast: any;
}

function QuickSwapPanel({ pair, bids, asks, loadingBook, isConnected, walletAddress, walletType, placingOrder, onPlaceOrder, onRefresh, toast }: QuickSwapPanelProps) {
  const [swapDirection, setSwapDirection] = useState<"buy" | "sell">("buy");
  const [swapAmount, setSwapAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
  const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;

  const swapAmountNum = parseFloat(swapAmount) || 0;
  const estimatedReceive = swapDirection === "buy"
    ? (bestAsk > 0 ? swapAmountNum / bestAsk : 0)
    : swapAmountNum * bestBid;
  const receiveAsset = swapDirection === "buy" ? pair.base.display : pair.counter.display;
  const payAsset = swapDirection === "buy" ? pair.counter.display : pair.base.display;

  const maxAmount = Math.max(
    ...bids.map((b) => parseFloat(b.amount) || 0),
    ...asks.map((a) => parseFloat(a.amount) || 0),
    1
  );

  const handleSwapClick = () => {
    if (!swapAmountNum || swapAmountNum <= 0) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }
    if (!isConnected) {
      toast({ title: "Connect wallet first", description: "Connect from the OwnBank Dashboard.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    const actualAmount = swapDirection === "buy" ? (swapAmountNum / (bestAsk || 1)).toString() : swapAmount;
    await onPlaceOrder(swapDirection, actualAmount);
    setSwapAmount("");
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-quick-swap">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-[#00A4E4]" />
              Quick Swap
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Instantly swap at the best available price. Uses a market order under the hood — your Xaman wallet signs the trade.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1">
              <Button
                variant={swapDirection === "buy" ? "default" : "outline"}
                className={swapDirection === "buy" ? "flex-1 bg-green-600 border-green-600 text-white" : "flex-1"}
                onClick={() => setSwapDirection("buy")}
                data-testid="button-quick-buy"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Buy {pair.base.display}
              </Button>
              <Button
                variant={swapDirection === "sell" ? "default" : "outline"}
                className={swapDirection === "sell" ? "flex-1 bg-red-600 border-red-600 text-white" : "flex-1"}
                onClick={() => setSwapDirection("sell")}
                data-testid="button-quick-sell"
              >
                <TrendingDown className="h-4 w-4 mr-1" />
                Sell {pair.base.display}
              </Button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                You pay ({payAsset})
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                step="any"
                data-testid="input-quick-swap-amount"
              />
            </div>

            {swapAmountNum > 0 && midPrice > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">You receive (est.)</span>
                  <span className="font-mono font-medium text-lg" data-testid="text-quick-receive">
                    ~{formatAmount(estimatedReceive, 4)} {receiveAsset}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Rate</span>
                  <span className="font-mono">1 {pair.base.display} = {formatAmount(midPrice)} {pair.counter.display}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Network fee</span>
                  <span>~0.00001 XRP</span>
                </div>
              </div>
            )}

            <Button
              className={`w-full ${swapDirection === "buy" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
              onClick={handleSwapClick}
              disabled={placingOrder || !isConnected}
              data-testid="button-quick-swap-execute"
            >
              {placingOrder ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing...</>
              ) : (
                <><Shield className="h-4 w-4 mr-2" />Swap Now</>
              )}
            </Button>

            {!isConnected && (
              <p className="text-xs text-muted-foreground text-center">
                Connect your wallet from the OwnBank Dashboard to swap.
              </p>
            )}
            {isConnected && (
              <p className="text-[11px] text-muted-foreground text-center">
                Market order via Xaman &bull; Settles in ~4 seconds &bull; Non-custodial
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-quick-swap-book">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Live Order Book</CardTitle>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loadingBook} data-testid="button-refresh-quick-book">
              <RefreshCw className={`h-4 w-4 ${loadingBook ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBook ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Asks (Sellers)</p>
                  <div className="space-y-0.5">
                    {asks.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">No asks</p>}
                    {[...asks.slice(0, 6)].reverse().map((ask, i) => {
                      const depthPct = ((parseFloat(ask.amount) || 0) / maxAmount) * 100;
                      return (
                        <div key={i} className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm" data-testid={`row-quick-ask-${i}`}>
                          <div className="absolute inset-y-0 right-0 bg-red-500/10 rounded-sm" style={{ width: `${Math.min(depthPct, 100)}%` }} />
                          <span className="relative text-red-600 dark:text-red-400">{formatAmount(ask.price, 6)}</span>
                          <span className="relative text-muted-foreground">{formatAmount(ask.amount, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {bids.length > 0 && asks.length > 0 && (
                  <div className="py-1.5 px-2 rounded-md bg-muted/50 text-center">
                    <span className="text-xs font-mono font-medium">
                      {formatAmount(midPrice, 6)} {pair.counter.display}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Bids (Buyers)</p>
                  <div className="space-y-0.5">
                    {bids.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">No bids</p>}
                    {bids.slice(0, 6).map((bid, i) => {
                      const depthPct = ((parseFloat(bid.amount) || 0) / maxAmount) * 100;
                      return (
                        <div key={i} className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm" data-testid={`row-quick-bid-${i}`}>
                          <div className="absolute inset-y-0 left-0 bg-green-500/10 rounded-sm" style={{ width: `${Math.min(depthPct, 100)}%` }} />
                          <span className="relative text-green-600 dark:text-green-400">{formatAmount(bid.price, 6)}</span>
                          <span className="relative text-muted-foreground">{formatAmount(bid.amount, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-confirm-swap-title">
              Confirm {swapDirection === "buy" ? "Buy" : "Sell"} Swap
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Direction</span>
                <Badge className={swapDirection === "buy" ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"}>
                  {swapDirection === "buy" ? "Buy" : "Sell"} {pair.base.display}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">You pay</span>
                <span className="font-mono font-medium">{formatAmount(swapAmountNum, 4)} {payAsset}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">You receive (est.)</span>
                <span className="font-mono font-medium">~{formatAmount(estimatedReceive, 4)} {receiveAsset}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Pair</span>
                <span className="font-medium">{pair.label}</span>
              </div>
            </div>
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                {walletType === "xumm" ? (
                  <>Your Xaman wallet will prompt you to sign a market <span className="font-semibold">OfferCreate</span> transaction. Executes instantly at the best available price.</>
                ) : (
                  <>Confirm the <span className="font-semibold">OfferCreate</span> transaction on your Ledger device.</>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} data-testid="button-cancel-swap">Cancel</Button>
            <Button
              className={swapDirection === "buy" ? "bg-green-600 text-white" : "bg-red-600 text-white"}
              onClick={handleConfirm}
              disabled={placingOrder}
              data-testid="button-confirm-swap"
            >
              {placingOrder ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing...</> : <><Shield className="h-4 w-4 mr-2" />Sign & Swap</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
