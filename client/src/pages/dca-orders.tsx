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
  Pencil,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { SeoHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useXrplStore } from "@/lib/xrpl-store";
import { useStellarStore } from "@/lib/stellar-store";
import { WalletPicker } from "@/components/wallet-picker";
import { signTransaction, hasPendingXummPayment, completePendingXummPayment } from "@/lib/xumm-connector";
import { getOrderBook } from "@/lib/xrpl-client";
import { isFreighterInstalled, connectFreighter, buildAndSignOffer } from "@/lib/freighter-connector";
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
const ULTRA_ISSUER = "GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF";
const AQUA_ISSUER = "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const YXLM_ISSUER = "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55";
const XRP_ISSUER_S = "GBXRPL45NPHCVMFFAYZVUVFFVKSIZ362ZXFP7I2ETNOJEMON2KWSSVAIX";

const STELLAR_DCA_PAIRS: DcaPair[] = [
  { label: "Buy XLM with USDC", spendCurrency: "USDC", spendIssuer: USDC_ISSUER_S, spendDisplay: "USDC", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },
  { label: "Buy XLM with EURC", spendCurrency: "EURC", spendIssuer: EURC_ISSUER_S, spendDisplay: "EURC", buyCurrency: "XLM", buyIssuer: null, buyDisplay: "XLM", category: "Accumulate XLM" },
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

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/dca-orders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
      setEditingOrder(null);
      toast({ title: "DCA order updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/dca-orders/${id}/reset`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
      toast({ title: "Order reset", description: "Runs completed set to 0, status set to active." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [editingOrder, setEditingOrder] = useState<DcaOrder | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editFrequency, setEditFrequency] = useState("");
  const [editTotalRuns, setEditTotalRuns] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editPreferredDay, setEditPreferredDay] = useState("");

  function openEditDialog(order: DcaOrder) {
    setEditingOrder(order);
    setEditAmount(order.spendAmount);
    setEditFrequency(order.frequency);
    setEditTotalRuns(order.totalRuns ? String(order.totalRuns) : "");
    setEditLabel(order.label || "");
    setEditPreferredDay(order.preferredDay != null ? String(order.preferredDay) : "");
  }

  function handleEditSave() {
    if (!editingOrder) return;
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      id: editingOrder.id,
      data: {
        spendAmount: editAmount,
        frequency: editFrequency,
        totalRuns: editTotalRuns ? parseInt(editTotalRuns) : null,
        label: editLabel || null,
        preferredDay: editPreferredDay !== "" ? parseInt(editPreferredDay) : null,
      },
    });
  }

  const isAdmin = user?.role === "admin";

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

  const isMobileDca = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [freighterStatus, setFreighterStatus] = useState<"unknown" | "ready" | "missing">("unknown");
  useEffect(() => {
    if (chain !== "stellar" || isMobileDca) return;
    let cancelled = false;
    (async () => {
      try {
        const ready = await isFreighterInstalled();
        if (!cancelled) setFreighterStatus(ready ? "ready" : "missing");
      } catch {
        if (!cancelled) setFreighterStatus("missing");
      }
    })();
    return () => { cancelled = true; };
  }, [chain, isMobileDca]);

  const [lobstrDialogOrder, setLobstrDialogOrder] = useState<DcaOrder | null>(null);

  function openLobstrForDca(order: DcaOrder) {
    setLobstrDialogOrder(order);
  }

  const [stellarSignState, setStellarSignState] = useState<{
    order: DcaOrder;
    xdr: string;
    deepLink: string;
    expectedReceive: string;
    minReceive: string;
    token: string;
    sinceIso: string;
    pollIntervalId?: number;
  } | null>(null);

  async function executeNow(order: DcaOrder) {
    if (order.chain === "stellar") {
      setExecutingOrderId(order.id);
      try {
        const buildRes = await apiRequest("POST", `/api/dca-orders/${order.id}/stellar/build-tx`, {});
        const data = await buildRes.json();

        if (data.kind === "needsTrustline") {
          toast({
            title: `${data.assetCode} trustline needed first`,
            description: `LOBSTR needs a trustline to ${data.assetCode} before this trade can settle. Tap to add it (one-time, ~0.5 XLM reserve).`,
            duration: 15000,
            action: (
              <ToastAction altText={`Add ${data.assetCode} trustline`} onClick={() => { window.location.href = data.trustlineDeepLink; }}>
                Add trustline
              </ToastAction>
            ),
          });
          return;
        }
        if (data.kind === "needsFunding") {
          toast({ title: "Stellar account needs funding", description: `Wallet has ${data.currentXlm} XLM, need at least ${data.minXlm} XLM to cover reserve + fee.`, variant: "destructive" });
          return;
        }
        if (data.kind === "needsSpendTrustline") {
          toast({
            title: `No ${data.assetCode} trustline`,
            description: `Your Stellar wallet doesn't trust ${data.assetCode} yet. Add the trustline in LOBSTR (Trade → search ${data.assetCode} → Add asset) and fund the wallet with ${data.assetCode}, then try again.`,
            variant: "destructive",
            duration: 15000,
          });
          return;
        }
        if (data.kind === "insufficientBalance") {
          toast({
            title: `Not enough ${data.assetCode}`,
            description: `This buy needs ${data.required} ${data.assetCode} but your wallet only has ${parseFloat(data.available).toFixed(4)} ${data.assetCode} available. Top up your Stellar wallet and try again.`,
            variant: "destructive",
            duration: 15000,
          });
          return;
        }
        if (data.kind === "noLiquidity") {
          toast({ title: "No DEX liquidity right now", description: `Couldn't route ${data.spendCurrency} → ${data.buyCurrency} on the Stellar DEX. Try again in a bit — this is rare for major pairs.`, variant: "destructive" });
          return;
        }
        if (data.kind === "invalidOrder") {
          toast({ title: "This DCA order can't run", description: `${data.message} The order has been paused for you.`, variant: "destructive", duration: 15000 });
          queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
          return;
        }
        if (data.kind !== "ready") {
          toast({ title: "Could not prepare trade", description: data.message || "Unexpected response from server.", variant: "destructive" });
          return;
        }

        const sinceIso = new Date().toISOString();
        setStellarSignState({
          order,
          xdr: data.xdr,
          deepLink: data.deepLink,
          expectedReceive: data.expectedReceive,
          minReceive: data.minReceive,
          token: data.token,
          sinceIso,
        });
      } catch (err: any) {
        toast({ title: "Could not prepare Stellar trade", description: err?.message || "Server error", variant: "destructive" });
      } finally {
        setExecutingOrderId(null);
      }
      return;
    }
    const walletAddress = activeWallet || useXrplStore.getState().walletAddress;
    if (!walletAddress) {
      toast({ title: "No wallet connected", description: "Connect your XRPL wallet first.", variant: "destructive" });
      return;
    }

    setExecutingOrderId(order.id);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
      const spendAmount = parseFloat(order.spendAmount);

      const buildAmountField = (currency: string, issuer: string | null, value: string) => {
        if (currency === "XRP") {
          return (parseFloat(value) * 1_000_000).toFixed(0);
        }
        return { currency, issuer: issuer!, value };
      };

      const spendCur = { currency: order.spendCurrency, issuer: order.spendIssuer || undefined };
      const buyCur = { currency: order.buyCurrency, issuer: order.buyIssuer || undefined };

      toast({ title: "Fetching market price...", description: "Connecting to XRPL order book" });

      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
        ]);

      let bestAskPrice = 0;
      let bestBidPrice = 0;
      try {
        const book = await withTimeout(getOrderBook(buyCur, spendCur, 10), 15000);
        if (book.asks && book.asks.length > 0) {
          bestAskPrice = parseFloat(book.asks[0].price);
        }
        if (book.bids && book.bids.length > 0) {
          bestBidPrice = parseFloat(book.bids[0].price);
        }
        console.log(`[DCA] Order book (base=${order.buyCurrency}, counter=${order.spendCurrency}): askPrice=${bestAskPrice}, bidPrice=${bestBidPrice}`);
      } catch (bookErr) {
        console.error("[DCA] Order book fetch failed:", bookErr);
      }

      const pricePerBuy = bestAskPrice > 0 ? bestAskPrice : (bestBidPrice > 0 ? (1 / bestBidPrice) : 0);

      if (pricePerBuy <= 0) {
        toast({ title: "No market price available", description: "Could not fetch current price from the XRPL order book. Try the DEX page instead.", variant: "destructive" });
        setExecutingOrderId(null);
        return;
      }

      const buyAmount = (spendAmount / pricePerBuy).toFixed(6);

      if (parseFloat(buyAmount) <= 0) {
        toast({ title: "Price error", description: "Market price seems unreliable. Try again or use the DEX page.", variant: "destructive" });
        setExecutingOrderId(null);
        return;
      }

      const takerGets = buildAmountField(order.spendCurrency, order.spendIssuer, spendAmount.toString());
      const takerPays = buildAmountField(order.buyCurrency, order.buyIssuer, buyAmount);

      console.log(`[DCA] pricePerBuy=${pricePerBuy}, buyAmount=${buyAmount}, TakerGets=`, JSON.stringify(takerGets), `TakerPays=`, JSON.stringify(takerPays));
      toast({ title: "Opening Xaman...", description: `Swapping ${spendAmount} ${getTokenDisplay(order.spendCurrency)} → ~${parseFloat(buyAmount).toFixed(2)} ${getTokenDisplay(order.buyCurrency)}` });

      const txJson: Record<string, unknown> = {
        TransactionType: "OfferCreate",
        Account: walletAddress,
        TakerGets: takerGets,
        TakerPays: takerPays,
        Flags: 0x00080000,
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
        try {
          await apiRequest("POST", `/api/dca-orders/${order.id}/execute`, {
            txHash: result.txHash || null,
          });
        } catch (execErr) {
          console.warn("[DCA] Failed to record execution on server, but trade was signed:", execErr);
        }
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
      toast({ title: "Execution failed", description: String(err instanceof Error ? err.message : err) || "Something went wrong. Try again.", variant: "destructive" });
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

        {chain === "stellar" && !isMobileDca && freighterStatus === "missing" && (
          <Card className="border-yellow-500/30 bg-yellow-500/5" data-testid="banner-freighter-missing">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-3 flex-1">
                <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Freighter wallet extension required to execute Stellar trades</p>
                  <p className="text-xs text-muted-foreground">Stellar trades sign in your browser via the free Freighter extension (Chrome, Brave, Edge, Firefox). Install it once, connect your Stellar wallet, and Execute Now will work. Your XLM stays in your wallet — Freighter only signs the trade you approve. On mobile, use LOBSTR instead.</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" data-testid="link-install-freighter">
                  <Button size="sm" variant="default" className="bg-yellow-600 hover:bg-yellow-700">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Install Freighter
                  </Button>
                </a>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()} data-testid="button-recheck-freighter">
                  Re-check
                </Button>
              </div>
            </CardContent>
          </Card>
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
                onEdit={() => openEditDialog(order)}
                onReset={isAdmin ? () => resetMutation.mutate(order.id) : undefined}
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

      <Dialog open={!!editingOrder} onOpenChange={(open) => { if (!open) setEditingOrder(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" style={{ color: chainColor }} />
              Edit DCA Order
            </DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: chainColor }} />
                  <span>{getTokenDisplay(editingOrder.spendCurrency)} → {getTokenDisplay(editingOrder.buyCurrency)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount per Buy ({getTokenDisplay(editingOrder.spendCurrency)})</Label>
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  min="0"
                  step="any"
                  data-testid="input-edit-amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={editFrequency} onValueChange={(v) => { setEditFrequency(v); if (v !== "weekly" && v !== "biweekly") setEditPreferredDay(""); }}>
                  <SelectTrigger data-testid="select-edit-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(editFrequency === "weekly" || editFrequency === "biweekly") && (
                <div className="space-y-2">
                  <Label>Preferred Day</Label>
                  <Select value={editPreferredDay} onValueChange={setEditPreferredDay}>
                    <SelectTrigger data-testid="select-edit-preferred-day">
                      <SelectValue placeholder="Any day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Total Runs (leave empty for unlimited)</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={editTotalRuns}
                  onChange={(e) => setEditTotalRuns(e.target.value)}
                  min="1"
                  data-testid="input-edit-total-runs"
                />
              </div>

              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  placeholder="e.g. Weekly XRP Buys"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  data-testid="input-edit-label"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editMutation.isPending || !editAmount}
              style={{ backgroundColor: chainColor }}
              data-testid="button-save-edit"
            >
              {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stellarSignState} onOpenChange={(open) => {
        if (!open) {
          if (stellarSignState?.pollIntervalId) window.clearInterval(stellarSignState.pollIntervalId);
          setStellarSignState(null);
        }
      }}>
        <DialogContent className="max-w-md" data-testid="dialog-stellar-sign">
          <DialogHeader>
            <DialogTitle>Sign your DCA buy</DialogTitle>
          </DialogHeader>
          {stellarSignState && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sell:</span><span className="font-mono font-medium">{stellarSignState.order.spendAmount} {stellarSignState.order.spendCurrency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Receive (est):</span><span className="font-mono font-medium">~{parseFloat(stellarSignState.expectedReceive).toFixed(4)} {stellarSignState.order.buyCurrency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Min received:</span><span className="font-mono">{parseFloat(stellarSignState.minReceive).toFixed(4)} {stellarSignState.order.buyCurrency}</span></div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pick how to sign</p>

                <Button
                  className="w-full justify-start h-auto py-3"
                  variant="default"
                  data-testid="button-sign-lobstr-web"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(stellarSignState.xdr); } catch {}
                    toast({ title: "XDR copied to clipboard", description: "Paste it into LOBSTR's transaction signer.", duration: 8000 });
                    window.open("https://lobstr.co/sign", "_blank", "noopener,noreferrer");
                  }}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">Sign on LOBSTR Web (recommended on iPhone)</span>
                    <span className="text-xs opacity-80 font-normal">Opens lobstr.co/sign in a new tab. We auto-copy the XDR — paste &amp; sign.</span>
                  </div>
                </Button>

                <Button
                  className="w-full justify-start h-auto py-3"
                  variant="outline"
                  data-testid="button-sign-lobstr-app"
                  onClick={() => {
                    const sinceIso = stellarSignState.sinceIso;
                    const orderId = stellarSignState.order.id;
                    const token = stellarSignState.token;
                    const pollStart = Date.now();
                    const pollInterval = window.setInterval(async () => {
                      if (Date.now() - pollStart > 5 * 60 * 1000) { window.clearInterval(pollInterval); return; }
                      try {
                        const r = await apiRequest("GET", `/api/dca-orders/${orderId}/stellar/check-execution?since=${encodeURIComponent(sinceIso)}&token=${token}`);
                        const cd = await r.json();
                        if (cd.execution) {
                          window.clearInterval(pollInterval);
                          if (cd.execution.status === "completed") {
                            toast({ title: "DCA buy executed", description: `Tx ${cd.execution.txHash?.slice(0, 14)}…` });
                          } else {
                            toast({ title: "DCA buy failed in LOBSTR", description: cd.execution.errorMessage || "Check Stellar wallet for details.", variant: "destructive", duration: 12000 });
                          }
                          queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/dca-executions"] });
                          setStellarSignState(null);
                        } else if (!cd.stillPending) {
                          window.clearInterval(pollInterval);
                        }
                      } catch {}
                    }, 3000);
                    setStellarSignState({ ...stellarSignState, pollIntervalId: pollInterval });
                    window.location.href = stellarSignState.deepLink;
                  }}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">Open in LOBSTR app (deep link)</span>
                    <span className="text-xs opacity-80 font-normal">Only works if the LOBSTR mobile app is installed. Auto-records the result.</span>
                  </div>
                </Button>

                <Button
                  className="w-full justify-start h-auto py-3"
                  variant="outline"
                  data-testid="button-copy-xdr"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(stellarSignState.xdr);
                      toast({ title: "XDR copied", description: "Paste it into Freighter, StellarTerm, or any Stellar wallet's transaction signer." });
                    } catch {
                      toast({ title: "Couldn't copy", description: "Long-press the XDR below to select and copy manually.", variant: "destructive" });
                    }
                  }}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">Copy XDR — sign in any Stellar wallet</span>
                    <span className="text-xs opacity-80 font-normal">Freighter, StellarTerm, StellarX, Stellar Lab — anything that signs raw XDR.</span>
                  </div>
                </Button>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground" data-testid="toggle-raw-xdr">Show raw XDR</summary>
                <textarea
                  readOnly
                  className="mt-2 w-full text-[10px] font-mono p-2 rounded bg-muted border h-24"
                  value={stellarSignState.xdr}
                  data-testid="text-raw-xdr"
                />
              </details>

              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                After signing in LOBSTR (Web or App), come back here and tap <strong className="text-foreground">"I signed it"</strong> below so we can record the buy. <em>If you used the app deep link, we'll detect it automatically — you don't need to tap.</em>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              className="w-full"
              variant="secondary"
              data-testid="button-stellar-mark-signed"
              onClick={async () => {
                if (!stellarSignState) return;
                try {
                  await apiRequest("POST", `/api/dca/${stellarSignState.order.id}/execution`, {
                    status: "completed",
                    executedPrice: "0",
                    txHash: "manual-lobstr-web",
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/dca"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/dca-orders"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/dca-executions"] });
                  toast({ title: "Logged", description: "DCA buy logged. Verify on stellar.expert if you want to double-check." });
                  if (stellarSignState.pollIntervalId) window.clearInterval(stellarSignState.pollIntervalId);
                  setStellarSignState(null);
                } catch (e: any) {
                  toast({ title: "Could not log", description: e?.message || "Try again", variant: "destructive" });
                }
              }}
            >
              I signed it in LOBSTR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lobstrDialogOrder} onOpenChange={(open) => !open && setLobstrDialogOrder(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-lobstr-instructions">
          <DialogHeader>
            <DialogTitle>Execute this trade in LOBSTR</DialogTitle>
          </DialogHeader>
          {lobstrDialogOrder && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sell:</span><span className="font-mono font-medium">{lobstrDialogOrder.spendAmount} {lobstrDialogOrder.spendCurrency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Buy:</span><span className="font-mono font-medium">{lobstrDialogOrder.buyCurrency}</span></div>
                {lobstrDialogOrder.buyIssuer && (
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Issuer:</span><span className="font-mono text-[10px] break-all text-right">{lobstrDialogOrder.buyIssuer}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Order type:</span><span>Market buy</span></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Steps in LOBSTR:</p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
                  <li>Open the <strong>LOBSTR</strong> app on your phone (install if needed).</li>
                  <li>Tap <strong>Trade</strong> at the bottom.</li>
                  <li>Search for <strong className="font-mono">{lobstrDialogOrder.buyCurrency}</strong>{lobstrDialogOrder.buyIssuer ? " — confirm the issuer matches the address shown above" : ""}.</li>
                  {lobstrDialogOrder.buyCurrency !== "XLM" && lobstrDialogOrder.buyIssuer && (
                    <li>If prompted, accept the <strong>trustline</strong> for this asset (one-time, costs ~0.5 XLM reserve).</li>
                  )}
                  <li>Choose <strong>Buy</strong>, enter <strong className="font-mono">{lobstrDialogOrder.spendAmount}</strong> {lobstrDialogOrder.spendCurrency} as the amount to spend.</li>
                  <li>Tap <strong>Place Order</strong> and confirm.</li>
                  <li>Come back here and tap <strong>Mark as executed</strong> below to log the buy.</li>
                </ol>
              </div>
              <p className="text-[10px] text-muted-foreground italic">LOBSTR doesn't yet support automatic background signing for third-party DCA. This is the same one-tap flow you'd use to place any manual trade in LOBSTR.</p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <a href="https://lobstr.co/" target="_blank" rel="noopener noreferrer" className="w-full" data-testid="link-open-lobstr">
              <Button className="w-full" variant="default">
                <ExternalLink className="w-4 h-4 mr-2" /> Open LOBSTR
              </Button>
            </a>
            <a
              href={/iPhone|iPad|iPod/i.test(navigator.userAgent)
                ? "https://apps.apple.com/app/lobstr-stellar-wallet/id1429103572"
                : "https://play.google.com/store/apps/details?id=com.lobstr.client"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
              data-testid="link-install-lobstr"
            >
              <Button className="w-full" variant="outline">
                Install LOBSTR app
              </Button>
            </a>
            <Button
              className="w-full"
              variant="secondary"
              onClick={async () => {
                if (!lobstrDialogOrder) return;
                try {
                  await apiRequest("POST", `/api/dca/${lobstrDialogOrder.id}/execution`, {
                    status: "completed",
                    executedPrice: "0",
                    txHash: "manual-lobstr",
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/dca"] });
                  toast({ title: "Logged", description: "DCA buy logged. Verify in LOBSTR's transactions." });
                  setLobstrDialogOrder(null);
                } catch (e: any) {
                  toast({ title: "Could not log", description: e?.message || "Try again", variant: "destructive" });
                }
              }}
              data-testid="button-mark-executed"
            >
              Mark as executed
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
  onEdit,
  onReset,
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
  onEdit: () => void;
  onReset?: () => void;
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
            onClick={onEdit}
            data-testid={`button-edit-${order.id}`}
          >
            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
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
          {onReset && (
            <Button
              size="sm"
              variant="outline"
              className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
              onClick={onReset}
              data-testid={`button-reset-${order.id}`}
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
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
