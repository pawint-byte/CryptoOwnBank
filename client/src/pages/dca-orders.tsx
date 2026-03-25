import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Repeat,
  Plus,
  Trash2,
  Pause,
  Play,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  Shield,
  Smartphone,
  Link2,
  Zap,
  Bell,
} from "lucide-react";
import { SeoHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useXrplStore } from "@/lib/xrpl-store";
import { WalletPicker } from "@/components/wallet-picker";
import { signTransaction, hasPendingXummPayment, completePendingXummPayment } from "@/lib/xumm-connector";
import { getOrderBook } from "@/lib/xrpl-client";
import type { DcaOrder, DcaExecution } from "@shared/schema";

import { RLUSD } from "@/lib/constants";
const RLUSD_CURRENCY = RLUSD.currency;
const RLUSD_ISSUER = RLUSD.issuer;

interface DcaPair {
  label: string;
  spendCurrency: string;
  spendIssuer: string | null;
  spendDisplay: string;
  buyCurrency: string;
  buyIssuer: string | null;
  buyDisplay: string;
  category: string;
}

const SOLO_HEX = "534F4C4F00000000000000000000000000000000";
const SOLO_ISSUER = "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz";
const CORE_HEX = "434F524500000000000000000000000000000000";
const CORE_ISSUER = "rcoreNywaoz2ZCQ8Lg2EbSLnGuRBmun6D";
const ELS_HEX = "454C5300000000000000000000000000000000000";
const ELS_ISSUER = "rHXuEaRYnnJHbDeuBH5w8yPh5uwNVh5zAg";
const BTC_ISSUER_GH = "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL";
const ETH_ISSUER_GH = "rcA8X3TVMST1n3CJeAdGk1RdRCHii7N2h";
const SOL_ISSUER_GH = "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL";
const LINK_HEX = "4C494E4B00000000000000000000000000000000";
const ONDO_HEX = "4F4E444F00000000000000000000000000000000";
const HBAR_HEX = "484241520000000000000000000000000000000000";
const USD_ISSUER_BS = "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B";
const EUR_ISSUER_GH = "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq";

const XRPL_DCA_PAIRS: DcaPair[] = [
  { label: "Buy XRP with RLUSD", spendCurrency: RLUSD_CURRENCY, spendIssuer: RLUSD_ISSUER, spendDisplay: "RLUSD", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Accumulate XRP" },
  { label: "Buy XRP with USD (Bitstamp)", spendCurrency: "USD", spendIssuer: USD_ISSUER_BS, spendDisplay: "USD", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Accumulate XRP" },
  { label: "Buy XRP with EUR (GateHub)", spendCurrency: "EUR", spendIssuer: EUR_ISSUER_GH, spendDisplay: "EUR", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Accumulate XRP" },
  { label: "Sell SOLO → XRP", spendCurrency: SOLO_HEX, spendIssuer: SOLO_ISSUER, spendDisplay: "SOLO", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Accumulate XRP" },
  { label: "Sell CORE → XRP", spendCurrency: CORE_HEX, spendIssuer: CORE_ISSUER, spendDisplay: "CORE", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Accumulate XRP" },
  { label: "Sell ELS → XRP", spendCurrency: ELS_HEX, spendIssuer: ELS_ISSUER, spendDisplay: "ELS", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Accumulate XRP" },

  { label: "Buy RLUSD with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: RLUSD_CURRENCY, buyIssuer: RLUSD_ISSUER, buyDisplay: "RLUSD", category: "Accumulate RLUSD" },
  { label: "Sell SOLO → RLUSD", spendCurrency: SOLO_HEX, spendIssuer: SOLO_ISSUER, spendDisplay: "SOLO", buyCurrency: RLUSD_CURRENCY, buyIssuer: RLUSD_ISSUER, buyDisplay: "RLUSD", category: "Accumulate RLUSD" },
  { label: "Sell CORE → RLUSD", spendCurrency: CORE_HEX, spendIssuer: CORE_ISSUER, spendDisplay: "CORE", buyCurrency: RLUSD_CURRENCY, buyIssuer: RLUSD_ISSUER, buyDisplay: "RLUSD", category: "Accumulate RLUSD" },
  { label: "Sell ELS → RLUSD", spendCurrency: ELS_HEX, spendIssuer: ELS_ISSUER, spendDisplay: "ELS", buyCurrency: RLUSD_CURRENCY, buyIssuer: RLUSD_ISSUER, buyDisplay: "RLUSD", category: "Accumulate RLUSD" },

  { label: "Buy SOLO with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: SOLO_HEX, buyIssuer: SOLO_ISSUER, buyDisplay: "SOLO", category: "Buy Tokens with XRP" },
  { label: "Buy CORE with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: CORE_HEX, buyIssuer: CORE_ISSUER, buyDisplay: "CORE", category: "Buy Tokens with XRP" },
  { label: "Buy ELS with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: ELS_HEX, buyIssuer: ELS_ISSUER, buyDisplay: "ELS", category: "Buy Tokens with XRP" },
  { label: "Buy BTC with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: "BTC", buyIssuer: BTC_ISSUER_GH, buyDisplay: "BTC", category: "Buy Tokens with XRP" },
  { label: "Buy ETH with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: "ETH", buyIssuer: ETH_ISSUER_GH, buyDisplay: "ETH", category: "Buy Tokens with XRP" },
  { label: "Buy SOL with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: "SOL", buyIssuer: SOL_ISSUER_GH, buyDisplay: "SOL", category: "Buy Tokens with XRP" },
  { label: "Buy LINK with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: LINK_HEX, buyIssuer: SOLO_ISSUER, buyDisplay: "LINK", category: "Buy Tokens with XRP" },
  { label: "Buy ONDO with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: ONDO_HEX, buyIssuer: SOLO_ISSUER, buyDisplay: "ONDO", category: "Buy Tokens with XRP" },
  { label: "Buy HBAR with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: HBAR_HEX, buyIssuer: SOLO_ISSUER, buyDisplay: "HBAR", category: "Buy Tokens with XRP" },
  { label: "Buy FLR with XRP", spendCurrency: "XRP", spendIssuer: null, spendDisplay: "XRP", buyCurrency: "FLR", buyIssuer: SOLO_ISSUER, buyDisplay: "FLR", category: "Buy Tokens with XRP" },

  { label: "Buy SOLO with RLUSD", spendCurrency: RLUSD_CURRENCY, spendIssuer: RLUSD_ISSUER, spendDisplay: "RLUSD", buyCurrency: SOLO_HEX, buyIssuer: SOLO_ISSUER, buyDisplay: "SOLO", category: "Buy Tokens with RLUSD" },
  { label: "Buy CORE with RLUSD", spendCurrency: RLUSD_CURRENCY, spendIssuer: RLUSD_ISSUER, spendDisplay: "RLUSD", buyCurrency: CORE_HEX, buyIssuer: CORE_ISSUER, buyDisplay: "CORE", category: "Buy Tokens with RLUSD" },
  { label: "Buy BTC with RLUSD", spendCurrency: RLUSD_CURRENCY, spendIssuer: RLUSD_ISSUER, spendDisplay: "RLUSD", buyCurrency: "BTC", buyIssuer: BTC_ISSUER_GH, buyDisplay: "BTC", category: "Buy Tokens with RLUSD" },
  { label: "Buy ETH with RLUSD", spendCurrency: RLUSD_CURRENCY, spendIssuer: RLUSD_ISSUER, spendDisplay: "RLUSD", buyCurrency: "ETH", buyIssuer: ETH_ISSUER_GH, buyDisplay: "ETH", category: "Buy Tokens with RLUSD" },

  { label: "Sell BTC → XRP", spendCurrency: "BTC", spendIssuer: BTC_ISSUER_GH, spendDisplay: "BTC", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Sell Tokens → XRP" },
  { label: "Sell ETH → XRP", spendCurrency: "ETH", spendIssuer: ETH_ISSUER_GH, spendDisplay: "ETH", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Sell Tokens → XRP" },
  { label: "Sell SOL → XRP", spendCurrency: "SOL", spendIssuer: SOL_ISSUER_GH, spendDisplay: "SOL", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Sell Tokens → XRP" },
  { label: "Sell LINK → XRP", spendCurrency: LINK_HEX, spendIssuer: SOLO_ISSUER, spendDisplay: "LINK", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Sell Tokens → XRP" },
  { label: "Sell ONDO → XRP", spendCurrency: ONDO_HEX, spendIssuer: SOLO_ISSUER, spendDisplay: "ONDO", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Sell Tokens → XRP" },
  { label: "Sell HBAR → XRP", spendCurrency: HBAR_HEX, spendIssuer: SOLO_ISSUER, spendDisplay: "HBAR", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Sell Tokens → XRP" },
  { label: "Sell FLR → XRP", spendCurrency: "FLR", spendIssuer: SOLO_ISSUER, spendDisplay: "FLR", buyCurrency: "XRP", buyIssuer: null, buyDisplay: "XRP", category: "Sell Tokens → XRP" },
];

const USDC_ISSUER_S = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const EURC_ISSUER_S = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE";
const USDT_ISSUER_S = "GCQTGZQQ5G4PTM2GL7CDIFKUBBER43GPYJHEZ5B65LNQP3WGSY6RA24T";
const ULTRA_ISSUER = "GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF";
const AQUA_ISSUER = "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const YXLM_ISSUER = "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55";
const XRP_ISSUER_S = "GBXRPL45NPHCVMFFAYZVUVFFVKSIZ362ZXFP7I2ETNOJEMON2KWSSVAIX";

const STELLAR_DCA_PAIRS: DcaPair[] = [
  { label: "Buy XLM with USDC", spendCurrency: "USDC", spendIssuer: USDC_ISSUER_S, spendDisplay: "USDC", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },
  { label: "Buy XLM with EURC", spendCurrency: "EURC", spendIssuer: EURC_ISSUER_S, spendDisplay: "EURC", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },
  { label: "Buy XLM with USDT", spendCurrency: "USDT", spendIssuer: USDT_ISSUER_S, spendDisplay: "USDT", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },
  { label: "Sell BTC → XLM", spendCurrency: "BTC", spendIssuer: ULTRA_ISSUER, spendDisplay: "BTC", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },
  { label: "Sell ETH → XLM", spendCurrency: "ETH", spendIssuer: ULTRA_ISSUER, spendDisplay: "ETH", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },
  { label: "Sell AQUA → XLM", spendCurrency: "AQUA", spendIssuer: AQUA_ISSUER, spendDisplay: "AQUA", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },

  { label: "Buy USDC with XLM", spendCurrency: "XLM", spendIssuer: null, spendDisplay: "XLM", buyCurrency: "USDC", buyIssuer: USDC_ISSUER_S, buyDisplay: "USDC", category: "Accumulate USDC" },
  { label: "Sell BTC → USDC", spendCurrency: "BTC", spendIssuer: ULTRA_ISSUER, spendDisplay: "BTC", buyCurrency: "USDC", buyIssuer: USDC_ISSUER_S, buyDisplay: "USDC", category: "Accumulate USDC" },
  { label: "Sell ETH → USDC", spendCurrency: "ETH", spendIssuer: ULTRA_ISSUER, spendDisplay: "ETH", buyCurrency: "USDC", buyIssuer: USDC_ISSUER_S, buyDisplay: "USDC", category: "Accumulate USDC" },
  { label: "Sell AQUA → USDC", spendCurrency: "AQUA", spendIssuer: AQUA_ISSUER, spendDisplay: "AQUA", buyCurrency: "USDC", buyIssuer: USDC_ISSUER_S, buyDisplay: "USDC", category: "Accumulate USDC" },

  { label: "Buy BTC with XLM", spendCurrency: "XLM", spendIssuer: null, spendDisplay: "XLM", buyCurrency: "BTC", buyIssuer: ULTRA_ISSUER, buyDisplay: "BTC", category: "Buy Tokens with XLM" },
  { label: "Buy ETH with XLM", spendCurrency: "XLM", spendIssuer: null, spendDisplay: "XLM", buyCurrency: "ETH", buyIssuer: ULTRA_ISSUER, buyDisplay: "ETH", category: "Buy Tokens with XLM" },
  { label: "Buy XRP with XLM", spendCurrency: "XLM", spendIssuer: null, spendDisplay: "XLM", buyCurrency: "XRP", buyIssuer: XRP_ISSUER_S, buyDisplay: "XRP", category: "Buy Tokens with XLM" },
  { label: "Buy AQUA with XLM", spendCurrency: "XLM", spendIssuer: null, spendDisplay: "XLM", buyCurrency: "AQUA", buyIssuer: AQUA_ISSUER, buyDisplay: "AQUA", category: "Buy Tokens with XLM" },
  { label: "Buy yXLM with XLM", spendCurrency: "XLM", spendIssuer: null, spendDisplay: "XLM", buyCurrency: "yXLM", buyIssuer: YXLM_ISSUER, buyDisplay: "yXLM", category: "Buy Tokens with XLM" },

  { label: "Buy BTC with USDC", spendCurrency: "USDC", spendIssuer: USDC_ISSUER_S, spendDisplay: "USDC", buyCurrency: "BTC", buyIssuer: ULTRA_ISSUER, buyDisplay: "BTC", category: "Buy Tokens with USDC" },
  { label: "Buy ETH with USDC", spendCurrency: "USDC", spendIssuer: USDC_ISSUER_S, spendDisplay: "USDC", buyCurrency: "ETH", buyIssuer: ULTRA_ISSUER, buyDisplay: "ETH", category: "Buy Tokens with USDC" },
  { label: "Buy XRP with USDC", spendCurrency: "USDC", spendIssuer: USDC_ISSUER_S, spendDisplay: "USDC", buyCurrency: "XRP", buyIssuer: XRP_ISSUER_S, buyDisplay: "XRP", category: "Buy Tokens with USDC" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-status-active"><Play className="w-3 h-3 mr-1" /> Active</Badge>;
    case "paused":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30" data-testid="badge-status-paused"><Pause className="w-3 h-3 mr-1" /> Paused</Badge>;
    case "completed":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30" data-testid="badge-status-completed"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
  }
}

function getExecStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30" data-testid="badge-exec-pending"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>;
    case "pushed":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30" data-testid="badge-exec-pushed"><Bell className="w-3 h-3 mr-1" /> Sent to Xaman</Badge>;
    case "signed":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30" data-testid="badge-exec-signed"><CheckCircle2 className="w-3 h-3 mr-1" /> Signed</Badge>;
    case "completed":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-exec-completed"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
    case "rejected":
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30" data-testid="badge-exec-rejected"><AlertCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    case "expired":
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30" data-testid="badge-exec-expired"><Clock className="w-3 h-3 mr-1" /> Expired</Badge>;
    case "failed":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid="badge-exec-failed"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-exec-unknown">{status}</Badge>;
  }
}

export default function DcaOrders() {
  const [location] = useLocation();
  const chain = location.startsWith("/stellar") ? "stellar" : "xrpl";
  const isXrpl = chain === "xrpl";
  const chainColor = isXrpl ? "#00A4E4" : "#7B61FF";
  const chainName = isXrpl ? "XRPL" : "Stellar";
  const pairs = isXrpl ? XRPL_DCA_PAIRS : STELLAR_DCA_PAIRS;

  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPairIdx, setSelectedPairIdx] = useState<string>("");
  const [spendAmount, setSpendAmount] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [preferredDay, setPreferredDay] = useState("");
  const [totalRuns, setTotalRuns] = useState("");
  const [label, setLabel] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const signingAddress = useXrplStore((s) => s.walletAddress);
  const [activeWallet, setActiveWallet] = useState(signingAddress || "");

  const { data: orders = [], isLoading } = useQuery<DcaOrder[]>({
    queryKey: ["/api/dca-orders"],
  });

  const chainOrders = orders.filter((o) => o.chain === chain);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/dca-orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
      setShowCreate(false);
      resetForm();
      toast({ title: "DCA order created", description: "Your recurring buy order is now active." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/dca-orders/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dca-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
      toast({ title: "DCA order deleted" });
    },
  });

  const [executingOrderId, setExecutingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const pendingDcaOrderId = sessionStorage.getItem("dca_execute_order_id") || localStorage.getItem("dca_execute_order_id");
    if (!pendingDcaOrderId) return;

    if (hasPendingXummPayment()) {
      setExecutingOrderId(pendingDcaOrderId);
      completePendingXummPayment().then(async (result) => {
        if (result.success) {
          try {
            await apiRequest("POST", `/api/dca-orders/${pendingDcaOrderId}/execute`, {
              txHash: result.txHash || null,
            });
            try {
              const tradeInfo = JSON.parse(sessionStorage.getItem("dca_pending_trade") || localStorage.getItem("dca_pending_trade") || "{}");
              if (tradeInfo.spentAmount) {
                await apiRequest("POST", "/api/record-dex-trade", {
                  txHash: result.txHash,
                  spentAmount: tradeInfo.spentAmount,
                  spentCurrency: tradeInfo.spentCurrency,
                  receivedAmount: tradeInfo.receivedAmount,
                  receivedCurrency: tradeInfo.receivedCurrency,
                });
              }
            } catch {}
            sessionStorage.removeItem("dca_pending_trade");
            localStorage.removeItem("dca_pending_trade");
            queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dca-executions", pendingDcaOrderId] });
            toast({ title: "DCA executed successfully", description: "Your trade was confirmed on the XRPL." });
          } catch {
            toast({ title: "Trade confirmed but record failed", description: "The trade went through on XRPL. Refresh to update.", variant: "destructive" });
          }
        } else if (result.error !== "No pending payment") {
          toast({ title: "Trade not completed", description: result.error || "Transaction was cancelled or timed out.", variant: "destructive" });
        }
        sessionStorage.removeItem("dca_execute_order_id");
        sessionStorage.removeItem("dca_pending_trade");
        localStorage.removeItem("dca_execute_order_id");
        localStorage.removeItem("dca_pending_trade");
        setExecutingOrderId(null);
      });
    } else {
      sessionStorage.removeItem("dca_execute_order_id");
      localStorage.removeItem("dca_execute_order_id");
      setExecutingOrderId(null);
    }
  }, []);

  async function executeNow(order: DcaOrder) {
    const walletAddress = activeWallet || useXrplStore.getState().walletAddress;
    if (!walletAddress) {
      toast({ title: "No wallet connected", description: "Connect your XRPL wallet first.", variant: "destructive" });
      return;
    }

    setExecutingOrderId(order.id);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
      const spendAmount = parseFloat(order.spendAmount);

      const toHexCurrency = (c: string): string => {
        if (c.length <= 3) return c;
        if (c.length === 40 && /^[0-9A-Fa-f]+$/.test(c)) return c;
        const buf = Buffer.from(c.padEnd(20, "\0"));
        return buf.toString("hex").toUpperCase().slice(0, 40);
      };

      const buildAmount = (currency: string, issuer: string | null, value: string) => {
        if (currency === "XRP") {
          return (parseFloat(value) * 1_000_000).toFixed(0);
        }
        return { currency: toHexCurrency(currency), issuer: issuer!, value };
      };

      const spendCur = { currency: order.spendCurrency, issuer: order.spendIssuer || undefined };
      const buyCur = { currency: order.buyCurrency, issuer: order.buyIssuer || undefined };

      toast({ title: "Fetching market price...", description: "Connecting to XRPL order book" });

      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
        ]);

      let pricePerBuy = 0;
      try {
        const book = await withTimeout(getOrderBook(buyCur, spendCur, 5), 15000);
        if (book.asks && book.asks.length > 0) {
          pricePerBuy = parseFloat(book.asks[0].price);
        }
      } catch (bookErr) {
        console.error("[DCA] Order book fetch failed:", bookErr);
      }

      if (pricePerBuy <= 0) {
        try {
          const book = await withTimeout(getOrderBook(spendCur, buyCur, 5), 10000);
          if (book.bids && book.bids.length > 0) {
            const bidPrice = parseFloat(book.bids[0].price);
            if (bidPrice > 0) pricePerBuy = 1 / bidPrice;
          }
        } catch {
          // ignore reverse lookup failure
        }
      }

      if (pricePerBuy <= 0) {
        toast({ title: "No market price available", description: "Could not fetch current price from the XRPL order book. Try the DEX page instead.", variant: "destructive" });
        setExecutingOrderId(null);
        return;
      }

      let buyAmount = (spendAmount / pricePerBuy).toFixed(6);

      const sanityMax = spendAmount * 10;
      if (parseFloat(buyAmount) > sanityMax) {
        console.warn(`[DCA] Buy amount ${buyAmount} exceeds sanity limit (${sanityMax}), price may be inverted. Using inverse.`);
        buyAmount = (spendAmount * pricePerBuy).toFixed(6);
      }

      if (parseFloat(buyAmount) <= 0 || parseFloat(buyAmount) > spendAmount * 100) {
        toast({ title: "Price error", description: "Market price seems unreliable. Try again or use the DEX page.", variant: "destructive" });
        setExecutingOrderId(null);
        return;
      }

      const takerGets = buildAmount(order.spendCurrency, order.spendIssuer, spendAmount.toString());
      const takerPays = buildAmount(order.buyCurrency, order.buyIssuer, buyAmount);

      toast({ title: "Opening Xaman...", description: `Swapping ${spendAmount} ${getTokenDisplay(order.spendCurrency)} → ${buyAmount} ${getTokenDisplay(order.buyCurrency)}` });

      const txJson: Record<string, unknown> = {
        TransactionType: "OfferCreate",
        Account: walletAddress,
        TakerGets: takerGets,
        TakerPays: takerPays,
        Flags: 0x00040000,
      };

      sessionStorage.setItem("dca_execute_order_id", order.id);
      localStorage.setItem("dca_execute_order_id", order.id);
      const dcaTradeData = JSON.stringify({
        spentAmount: spendAmount.toString(),
        spentCurrency: order.spendCurrency,
        receivedAmount: buyAmount,
        receivedCurrency: order.buyCurrency,
      });
      sessionStorage.setItem("dca_pending_trade", dcaTradeData);
      localStorage.setItem("dca_pending_trade", dcaTradeData);
      const result = await signTransaction(txJson);

      if (result.success) {
        await apiRequest("POST", `/api/dca-orders/${order.id}/execute`, {
          txHash: result.txHash || null,
        });
        try {
          await apiRequest("POST", "/api/record-dex-trade", {
            txHash: result.txHash,
            spentAmount: spendAmount.toString(),
            spentCurrency: order.spendCurrency,
            receivedAmount: buyAmount,
            receivedCurrency: order.buyCurrency,
          });
        } catch {}
        sessionStorage.removeItem("dca_pending_trade");
        localStorage.removeItem("dca_pending_trade");
        localStorage.removeItem("dca_execute_order_id");
        queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dca-executions", order.id] });
        toast({ title: "DCA executed successfully", description: `Swapped ${spendAmount} ${getTokenDisplay(order.spendCurrency)} on the DEX.` });
      } else {
        sessionStorage.removeItem("dca_pending_trade");
        localStorage.removeItem("dca_pending_trade");
        localStorage.removeItem("dca_execute_order_id");
        toast({ title: "Trade not completed", description: result.error || "The transaction was rejected or expired.", variant: "destructive" });
      }
    } catch (err) {
      console.error("[DCA] Execute now error:", err);
      toast({ title: "Execution failed", description: "Something went wrong. Try again.", variant: "destructive" });
    } finally {
      if (!isMobile) {
        sessionStorage.removeItem("dca_execute_order_id");
        setExecutingOrderId(null);
      }
    }
  }

  function resetForm() {
    setSelectedPairIdx("");
    setSpendAmount("");
    setFrequency("weekly");
    setPreferredDay("");
    setTotalRuns("");
    setLabel("");
  }

  function handleCreate() {
    const pair = pairs[parseInt(selectedPairIdx)];
    if (!pair) return;
    if (!spendAmount || parseFloat(spendAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    const dayNum = preferredDay !== "" ? parseInt(preferredDay) : null;
    const now = new Date();
    const nextRun = new Date(now);
    switch (frequency) {
      case "daily": nextRun.setDate(nextRun.getDate() + 1); break;
      case "weekly": {
        if (dayNum != null) {
          const diff = (dayNum - now.getDay() + 7) % 7;
          nextRun.setDate(nextRun.getDate() + (diff === 0 ? 7 : diff));
        } else {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
      }
      case "biweekly": {
        nextRun.setDate(nextRun.getDate() + 14);
        if (dayNum != null) {
          const diff = (dayNum - nextRun.getDay() + 7) % 7;
          if (diff > 0) nextRun.setDate(nextRun.getDate() + diff);
        }
        break;
      }
      case "monthly": nextRun.setMonth(nextRun.getMonth() + 1); break;
      case "quarterly": nextRun.setMonth(nextRun.getMonth() + 3); break;
    }

    createMutation.mutate({
      chain,
      spendCurrency: pair.spendCurrency,
      spendIssuer: pair.spendIssuer,
      buyCurrency: pair.buyCurrency,
      buyIssuer: pair.buyIssuer,
      spendAmount,
      frequency,
      preferredDay: dayNum,
      nextRunAt: nextRun.toISOString(),
      totalRuns: totalRuns ? parseInt(totalRuns) : null,
      label: label || pair.label,
    });
  }

  if (!user) {
    return <UpgradePrompt feature="DCA Orders" requiredTier="free" />;
  }

  return (
    <>
      <SeoHead
        title={`${chainName} DCA Orders | CryptoOwnBank`}
        description={`Set up dollar-cost averaging on the ${chainName} DEX. Automated recurring buys with non-custodial signing.`}
      />
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${chainColor}20` }}>
              <Repeat className="w-6 h-6" style={{ color: chainColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-dca-title">{chainName} DCA Orders</h1>
              <p className="text-sm text-muted-foreground">Dollar-cost average into any {chainName} DEX pair — non-custodial, you approve each buy from {isXrpl ? "Xaman" : "LOBSTR"}</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-dca" style={{ backgroundColor: chainColor }}>
            <Plus className="w-4 h-4 mr-2" /> New DCA
          </Button>
        </div>

        {isXrpl && (
          <WalletPicker
            value={activeWallet}
            onChange={setActiveWallet}
            label="Signing Wallet"
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chainOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Repeat className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-no-orders">No DCA Orders Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Set up recurring buys to dollar-cost average into your favorite {chainName} tokens. Each execution only needs a quick approval in {isXrpl ? "Xaman" : "LOBSTR"} on your phone.
              </p>
              <Button onClick={() => setShowCreate(true)} variant="outline" data-testid="button-create-dca-empty">
                <Plus className="w-4 h-4 mr-2" /> Create Your First DCA
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chainOrders.map((order) => (
              <DcaOrderCard
                key={order.id}
                order={order}
                expanded={expandedOrder === order.id}
                onToggleExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                onToggleStatus={() => {
                  const newStatus = order.status === "active" ? "paused" : "active";
                  toggleMutation.mutate({ id: order.id, status: newStatus });
                }}
                onDelete={() => deleteMutation.mutate(order.id)}
                onExecuteNow={() => executeNow(order)}
                isExecuting={executingOrderId === order.id}
                chainColor={chainColor}
                isXrpl={isXrpl}
              />
            ))}
          </div>
        )}

        <Collapsible>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0 p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-400" />
                  How Non-Custodial DCA Works
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-blue-400 mb-1">Non-Custodial DCA — {isXrpl ? "Xaman (XUMM)" : "LOBSTR"} Required</p>
                    <p>Your funds stay in your wallet at all times. When a DCA order is due, it creates a <strong>pending execution</strong> that you approve via {isXrpl ? "Xaman (XUMM)" : "LOBSTR"}. No private keys ever leave your device.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-blue-500/10 pt-3">
                  <Smartphone className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-green-400 mb-1">Setup: {isXrpl ? "Xaman" : "LOBSTR"} with Full Control</p>
                    {isXrpl ? (
                      <ol className="list-decimal list-inside space-y-1 mt-1">
                        <li>Install <strong>Xaman (XUMM)</strong> on your phone and set it up with <strong>full control</strong> over your {isXrpl ? "XRPL" : "Stellar"} account.</li>
                        <li>If you use a <strong>Ledger Nano X</strong>, pair it with Xaman via Bluetooth — Xaman sends signing requests to Ledger, so your keys stay on the hardware device while Xaman handles the DCA approval flow.</li>
                        <li>Set trust lines for any tokens you want to buy (e.g. RLUSD, SOLO, BTC). Go to <strong>Token Manager</strong> to add them.</li>
                        <li>Fund your Xaman account with your DCA budget — this is the &quot;checking account&quot; for recurring buys.</li>
                      </ol>
                    ) : (
                      <ol className="list-decimal list-inside space-y-1 mt-1">
                        <li>Install <strong>LOBSTR</strong> on your phone and set it up with <strong>full control</strong> over your Stellar account.</li>
                        <li>If you use a <strong>Ledger</strong>, connect it to LOBSTR so it handles signing — your keys stay on the hardware device.</li>
                        <li>Set trust lines for any tokens you want to buy (e.g. USDC, BTC, ETH). Go to <strong>Token Manager</strong> to add them.</li>
                        <li>Fund your LOBSTR account with your DCA budget — this is the &quot;checking account&quot; for recurring buys.</li>
                      </ol>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-blue-500/10 pt-3">
                  <Link2 className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-purple-400 mb-1">Best Wallet for DCA: Ledger + {isXrpl ? "Xaman" : "LOBSTR"}</p>
                    <p>A <strong>Ledger Nano X</strong> (or Nano S Plus) paired with {isXrpl ? "Xaman" : "LOBSTR"} is the ideal DCA setup. Ledger connects via Bluetooth{isXrpl ? " or USB" : ""} — so you approve DCA buys on your phone and Ledger signs the transaction without being air-gapped. Your keys stay on the hardware, but you don&apos;t need to plug in a USB cable or scan QR codes each time. Just tap approve in {isXrpl ? "Xaman" : "LOBSTR"} and Ledger handles the rest.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-blue-500/10 pt-3">
                  <Shield className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-yellow-400 mb-1">Air-Gapped Cold Wallets (ELLIPAL, CypheRock, SafePal)</p>
                    <p>Air-gapped wallets <strong>can</strong> sign DCA transactions — there&apos;s no technical limitation. However, every approval requires scanning QR codes back and forth between your phone and the device, which gets tedious when you&apos;re doing daily or weekly buys. It absolutely works, but most users prefer a <strong>Ledger + {isXrpl ? "Xaman" : "LOBSTR"}</strong> setup where you just tap approve on your phone and Ledger signs over Bluetooth — same hardware security, much smoother for recurring buys.</p>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <DcaDisclaimer />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5" style={{ color: chainColor }} />
              New DCA Order — {chainName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trading Pair</Label>
              <Select value={selectedPairIdx} onValueChange={setSelectedPairIdx}>
                <SelectTrigger data-testid="select-dca-pair">
                  <SelectValue placeholder="Select a pair..." />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(pairs.map((p) => p.category))].map((cat) => {
                    const catPairs = pairs.filter((p) => p.category === cat);
                    return (
                      <div key={cat}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat}</div>
                        {catPairs.map((p) => {
                          const idx = pairs.indexOf(p);
                          return (
                            <SelectItem key={idx} value={String(idx)} data-testid={`select-pair-${idx}`}>
                              {p.label}
                            </SelectItem>
                          );
                        })}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPairIdx !== "" && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: chainColor }} />
                  <span>Spend <strong>{pairs[parseInt(selectedPairIdx)]?.spendDisplay}</strong> to buy <strong>{pairs[parseInt(selectedPairIdx)]?.buyDisplay}</strong></span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount per Buy {selectedPairIdx !== "" ? `(${pairs[parseInt(selectedPairIdx)]?.spendDisplay})` : ""}</Label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
                min="0"
                step="any"
                data-testid="input-dca-amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => { setFrequency(v); if (v !== "weekly" && v !== "biweekly") setPreferredDay(""); }}>
                <SelectTrigger data-testid="select-dca-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(frequency === "weekly" || frequency === "biweekly") && (
              <div className="space-y-2">
                <Label>Preferred Day (optional — align buys with payday)</Label>
                <Select value={preferredDay} onValueChange={setPreferredDay}>
                  <SelectTrigger data-testid="select-dca-preferred-day">
                    <SelectValue placeholder="Any day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Many people set this to Thursday or Friday to align with payday.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Total Buys (optional — leave empty for unlimited)</Label>
              <Input
                type="number"
                placeholder="e.g. 52 for 1 year of weekly buys"
                value={totalRuns}
                onChange={(e) => setTotalRuns(e.target.value)}
                min="1"
                data-testid="input-dca-total-runs"
              />
            </div>

            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g. Weekly XRP accumulation"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                data-testid="input-dca-label"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} data-testid="button-cancel-dca">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || selectedPairIdx === "" || !spendAmount}
              style={{ backgroundColor: chainColor }}
              data-testid="button-submit-dca"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create DCA Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DcaOrderCard({
  order,
  expanded,
  onToggleExpand,
  onToggleStatus,
  onDelete,
  onExecuteNow,
  isExecuting,
  chainColor,
  isXrpl,
}: {
  order: DcaOrder;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onExecuteNow: () => void;
  isExecuting: boolean;
  chainColor: string;
  isXrpl: boolean;
}) {
  const spendDisplay = getTokenDisplay(order.spendCurrency);
  const buyDisplay = getTokenDisplay(order.buyCurrency);

  const { data: executions = [] } = useQuery<DcaExecution[]>({
    queryKey: ["/api/dca-executions", order.id],
    queryFn: async () => {
      const res = await fetch(`/api/dca-executions?orderId=${order.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load executions");
      return res.json();
    },
    enabled: expanded,
  });

  const freq = FREQUENCIES.find((f) => f.value === order.frequency)?.label || order.frequency;
  const dayLabel = order.preferredDay != null ? DAYS_OF_WEEK.find((d) => d.value === String(order.preferredDay))?.label : null;
  const freqDisplay = dayLabel ? `${freq} (${dayLabel}s)` : freq;

  return (
    <Card data-testid={`card-dca-order-${order.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${chainColor}20` }}>
              <Repeat className="w-5 h-5" style={{ color: chainColor }} />
            </div>
            <div>
              <CardTitle className="text-base" data-testid={`text-order-label-${order.id}`}>
                {order.label || `${spendDisplay} → ${buyDisplay}`}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {order.spendAmount} {spendDisplay} → {buyDisplay} • {freqDisplay}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Per Buy</p>
            <p className="font-medium" data-testid={`text-order-amount-${order.id}`}>{order.spendAmount} {spendDisplay}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next Run</p>
            <p className="font-medium" data-testid={`text-order-next-${order.id}`}>
              {order.status === "active" ? (
                new Date(order.nextRunAt) <= new Date() ? (
                  <span className="text-yellow-400">Due now</span>
                ) : (
                  new Date(order.nextRunAt).toLocaleDateString()
                )
              ) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="font-medium" data-testid={`text-order-runs-${order.id}`}>
              {order.runsCompleted || 0}{order.totalRuns ? ` / ${order.totalRuns}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="font-medium" data-testid={`text-order-total-${order.id}`}>
              {((order.runsCompleted || 0) * parseFloat(order.spendAmount)).toFixed(2)} {spendDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {order.status !== "completed" && (
            <Button
              size="sm"
              variant="outline"
              className="border-[#00A4E4]/40 text-[#00A4E4] hover:bg-[#00A4E4]/10"
              onClick={onExecuteNow}
              disabled={isExecuting}
              data-testid={`button-execute-now-${order.id}`}
            >
              {isExecuting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Executing...</>
              ) : (
                <><Zap className="w-3.5 h-3.5 mr-1" /> Execute Now</>
              )}
            </Button>
          )}
          {order.status !== "completed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleStatus}
              data-testid={`button-toggle-${order.id}`}
            >
              {order.status === "active" ? (
                <><Pause className="w-3.5 h-3.5 mr-1" /> Pause</>
              ) : (
                <><Play className="w-3.5 h-3.5 mr-1" /> Resume</>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleExpand}
            data-testid={`button-history-${order.id}`}
          >
            <History className="w-3.5 h-3.5 mr-1" />
            History
            {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
            onClick={onDelete}
            data-testid={`button-delete-${order.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <History className="w-4 h-4" /> Execution History
            </h4>
            {executions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No executions yet — the first buy will appear here when it&apos;s due.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {executions.map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm" data-testid={`exec-row-${exec.id}`}>
                    <div className="flex items-center gap-3">
                      {getExecStatusBadge(exec.status)}
                      <span className="text-muted-foreground">{exec.spendAmount} {spendDisplay}</span>
                      {exec.receivedAmount && (
                        <span className="text-green-400">→ {exec.receivedAmount} {buyDisplay}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {exec.executedAt ? new Date(exec.executedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DcaDisclaimer() {
  return (
    <p className="text-xs text-muted-foreground italic mt-6 px-1">
      CryptoOwnBank does not execute trades on your behalf. When a DCA order is due, a signing request is pushed to your Xaman wallet — you must review and approve each transaction. Your funds remain in your wallet at all times. You can also use the "Execute Now" button to manually trigger at any time. This is not automated trading and CryptoOwnBank is not a broker or trading platform. Past performance of any asset does not guarantee future results.
    </p>
  );
}

function getTokenDisplay(currency: string): string {
  if (currency === "XRP" || currency === "XLM") return currency;
  if (currency.length <= 4) return currency;
  const hexMap: Record<string, string> = {
    "524C555344000000000000000000000000000000": "RLUSD",
    "534F4C4F00000000000000000000000000000000": "SOLO",
    "434F524500000000000000000000000000000000": "CORE",
    "454C5300000000000000000000000000000000000": "ELS",
    "4C494E4B00000000000000000000000000000000": "LINK",
    "4F4E444F00000000000000000000000000000000": "ONDO",
    "484241520000000000000000000000000000000000": "HBAR",
    "5045504500000000000000000000000000000000": "PEPE",
    "424F4E4B00000000000000000000000000000000": "BONK",
    "534849420000000000000000000000000000000000": "SHIB",
    "5A42434E00000000000000000000000000000000": "ZBCN",
    "4156415800000000000000000000000000000000": "AVAX",
    "41544F4D00000000000000000000000000000000": "ATOM",
    "414C474F00000000000000000000000000000000": "ALGO",
    "4E45415200000000000000000000000000000000": "NEAR",
    "4141564500000000000000000000000000000000": "AAVE",
    "4D41544943000000000000000000000000000000": "MATIC",
  };
  return hexMap[currency] || currency.slice(0, 6) + "...";
}
