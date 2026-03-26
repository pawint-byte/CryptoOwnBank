import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { SeoHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  CloudUpload,
  WifiOff,
  Wifi,
  Trash2,
  Play,
  Check,
  AlertTriangle,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wallet,
  ExternalLink,
  Receipt,
  Copy,
  Share2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { signPayment } from "@/lib/xumm-connector";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  loadQueue,
  saveQueue,
  addToQueue,
  updateQueueItem,
  removeFromQueue,
  clearSentFromQueue,
  getExplorerUrl,
  getReceiptData,
  cacheBalances,
  getCachedBalance,
  getBalanceCacheAge,
  getEffectiveBalance,
  type QueuedPayment,
  type CachedBalance,
} from "@/lib/offline-queue";

import { RLUSD } from "@/lib/constants";
const RLUSD_ISSUER = RLUSD.issuer;

const STELLAR_ASSETS: Record<string, { issuer: string } | null> = {
  XLM: null,
  USDC: { issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  EURCV: { issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE" },
};

function buildStellarUri(to: string, amount: string, currency: string, memo: string): string {
  let uri = `web+stellar:pay?destination=${to}&amount=${amount}`;
  const asset = STELLAR_ASSETS[currency.toUpperCase()];
  if (asset) {
    uri += `&asset_code=${currency}&asset_issuer=${asset.issuer}`;
  }
  if (memo.trim()) {
    uri += `&memo=${encodeURIComponent(memo)}&memo_type=MEMO_TEXT`;
  }
  return uri;
}

function textToHex(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentQueuePage() {
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const { xrpBalance, rlusdBalance, isConnected: xrplConnected } = useXrplStore();
  const [queue, setQueue] = useState<QueuedPayment[]>(loadQueue);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<QueuedPayment | null>(null);
  const [stellarSyncPayment, setStellarSyncPayment] = useState<QueuedPayment | null>(null);
  const [stellarTxHash, setStellarTxHash] = useState("");
  const [loc] = useLocation();
  const isStellarRoute = loc.startsWith("/stellar");
  const [newPayment, setNewPayment] = useState({
    to: "",
    amount: "",
    currency: isStellarRoute ? "XLM" : "XRP",
    chain: (isStellarRoute ? "stellar" : "xrpl") as "xrpl" | "stellar",
    memo: "",
    destinationTag: "",
    recipientName: "",
  });

  useEffect(() => {
    if (xrplConnected && (xrpBalance > 0 || rlusdBalance > 0)) {
      const now = new Date().toISOString();
      const balances: CachedBalance[] = [];
      if (xrpBalance > 0) balances.push({ chain: "xrpl", currency: "XRP", amount: xrpBalance, updatedAt: now });
      if (rlusdBalance > 0) balances.push({ chain: "xrpl", currency: "RLUSD", amount: rlusdBalance, updatedAt: now });
      cacheBalances(balances);
    }
  }, [xrpBalance, rlusdBalance, xrplConnected]);

  const refreshQueue = useCallback(() => {
    setQueue(loadQueue());
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshQueue, 2000);
    return () => clearInterval(interval);
  }, [refreshQueue]);

  const pendingPayments = queue.filter(q => q.status === "queued" || q.status === "failed");
  const completedPayments = queue.filter(q => q.status === "sent");
  const syncableCount = pendingPayments.length;

  const handleAddToQueue = () => {
    if (!newPayment.to.trim()) {
      toast({ title: "Address required", variant: "destructive" });
      return;
    }
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast({ title: "Valid amount required", variant: "destructive" });
      return;
    }

    addToQueue({
      to: newPayment.to.trim(),
      amount: newPayment.amount,
      currency: newPayment.currency,
      chain: newPayment.chain,
      memo: newPayment.memo.trim(),
      destinationTag: newPayment.destinationTag.trim(),
      recipientName: newPayment.recipientName.trim(),
    });

    setCreateOpen(false);
    setNewPayment({ to: "", amount: "", currency: isStellarRoute ? "XLM" : "XRP", chain: isStellarRoute ? "stellar" : "xrpl", memo: "", destinationTag: "", recipientName: "" });
    refreshQueue();
    toast({ title: "Payment queued", description: isOnline ? "Ready to sync now." : "Will sync when you're back online." });
  };

  const handleSyncOne = async (payment: QueuedPayment) => {
    if (!isOnline) {
      toast({ title: "Still offline", description: "Waiting for connectivity to sync.", variant: "destructive" });
      return;
    }

    setSyncingId(payment.id);
    updateQueueItem(payment.id, { status: "syncing" });
    refreshQueue();

    try {
      if (payment.chain === "xrpl") {
        const isRlusd = payment.currency.toUpperCase() === "RLUSD";
        let xrpAmount: string | { currency: string; value: string; issuer: string };

        if (isRlusd) {
          xrpAmount = {
            currency: "RLUSD",
            value: payment.amount,
            issuer: RLUSD_ISSUER,
          };
        } else {
          xrpAmount = String(Math.round(parseFloat(payment.amount) * 1_000_000));
        }

        const options: { destinationTag?: number; memos?: Array<{ MemoType?: string; MemoData?: string }> } = {};
        if (payment.destinationTag) {
          options.destinationTag = parseInt(payment.destinationTag);
        }
        if (payment.memo) {
          options.memos = [{ MemoType: "text/plain", MemoData: payment.memo }];
        }

        const result = await signPayment(payment.to, xrpAmount, options);
        if (result.success) {
          updateQueueItem(payment.id, {
            status: "sent",
            syncedAt: new Date().toISOString(),
            txHash: result.txHash || undefined,
            fromAddress: result.address || undefined,
          });
          toast({ title: "Payment sent", description: `${payment.amount} ${payment.currency} to ${payment.recipientName || payment.to.slice(0, 8)}...` });
        } else {
          updateQueueItem(payment.id, { status: "failed", errorMessage: result.error || "Payment declined" });
          toast({ title: "Payment not completed", description: result.error || "Try again later.", variant: "destructive" });
        }
      } else {
        updateQueueItem(payment.id, { status: "queued" });
        setSyncingId(null);
        setStellarSyncPayment(payment);
        refreshQueue();
        return;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Sync failed";
      updateQueueItem(payment.id, { status: "failed", errorMessage: errorMsg });
      toast({ title: "Sync failed", description: errorMsg, variant: "destructive" });
    } finally {
      setSyncingId(null);
      refreshQueue();
    }
  };

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast({ title: "Still offline", description: "Waiting for connectivity.", variant: "destructive" });
      return;
    }

    setSyncing(true);
    const xrplPayments = pendingPayments.filter(p => (p.status === "queued" || p.status === "failed") && p.chain === "xrpl");
    const stellarCount = pendingPayments.filter(p => (p.status === "queued" || p.status === "failed") && p.chain === "stellar").length;
    let successCount = 0;

    for (const payment of xrplPayments) {
      await handleSyncOne(payment);
      const updated = loadQueue().find(q => q.id === payment.id);
      if (updated?.status === "sent") successCount++;
    }

    setSyncing(false);
    refreshQueue();
    if (successCount > 0) {
      toast({ title: `Synced ${successCount} XRPL payment${successCount !== 1 ? "s" : ""}` });
    }
    if (stellarCount > 0) {
      toast({ title: `${stellarCount} Stellar payment${stellarCount !== 1 ? "s" : ""} need individual sync`, description: "Tap the play button on each to open your Stellar wallet." });
    }
  };

  const handleDeletePayment = (id: string) => {
    removeFromQueue(id);
    refreshQueue();
    toast({ title: "Payment removed from queue" });
  };

  const handleClearSent = () => {
    clearSentFromQueue();
    refreshQueue();
    toast({ title: "Cleared completed payments" });
  };

  const statusIcon = (status: QueuedPayment["status"]) => {
    switch (status) {
      case "queued": return <Clock className="h-4 w-4 text-amber-500" />;
      case "syncing": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "sent": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const statusLabel = (status: QueuedPayment["status"]) => {
    switch (status) {
      case "queued": return "Queued";
      case "syncing": return "Syncing...";
      case "sent": return "Sent";
      case "failed": return "Failed";
    }
  };

  return (
    <div className="space-y-6">
      <SeoHead
        title="Batch Crypto Payments — CryptoOwnBank | Payroll, Bulk Transfers, Offline Queue"
        description="Queue and batch-send crypto payments on XRPL and Stellar. Perfect for payroll, supplier payments, and bulk transfers. Works offline — sync when ready. Non-custodial."
        path={loc}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-queue-title">Payment Queue</h1>
          <p className="text-muted-foreground">
            Queue payments offline and sync them when you're back online
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isOnline ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`} data-testid="badge-connectivity">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateOpen(true)}
            data-testid="button-queue-payment"
          >
            <Plus className="h-4 w-4 mr-1" /> Queue Payment
          </Button>
        </div>
      </div>

      {syncableCount > 0 && (
        <Card className={isOnline ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CloudUpload className="h-5 w-5 text-emerald-600" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <WifiOff className="h-5 w-5 text-amber-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">
                    {syncableCount} payment{syncableCount !== 1 ? "s" : ""} ready to sync
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isOnline
                      ? "You're online — sync now to submit payments to your wallet for approval"
                      : "Waiting for internet connectivity to sync"
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSyncAll}
                disabled={!isOnline || syncing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="button-sync-all"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4 mr-2" />
                )}
                Sync All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending ({pendingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-3"
                data-testid={`queue-item-${payment.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(payment.status)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {payment.recipientName || `${payment.to.slice(0, 8)}...${payment.to.slice(-4)}`}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 h-5 shrink-0">
                        {payment.chain.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {payment.amount} {payment.currency}
                      </span>
                      <span>{formatDate(payment.createdAt)}</span>
                    </div>
                    {payment.memo && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{payment.memo}</p>
                    )}
                    {payment.status === "failed" && payment.errorMessage && (
                      <p className="text-[11px] text-red-500 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {payment.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleSyncOne(payment)}
                    disabled={!isOnline || syncingId === payment.id}
                    data-testid={`button-sync-${payment.id}`}
                  >
                    {syncingId === payment.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDeletePayment(payment.id)}
                    data-testid={`button-delete-${payment.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {completedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completed ({completedPayments.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleClearSent} data-testid="button-clear-sent">
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-3"
                data-testid={`queue-sent-${payment.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(payment.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payment.recipientName || `${payment.to.slice(0, 8)}...${payment.to.slice(-4)}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{payment.amount} {payment.currency}</span>
                      {payment.syncedAt && <span>Synced {formatDate(payment.syncedAt)}</span>}
                    </div>
                    {payment.txHash && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" />
                        TX: {payment.txHash.slice(0, 12)}...{payment.txHash.slice(-6)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => setReceiptPayment(payment)}
                    data-testid={`button-receipt-${payment.id}`}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Proof
                  </Button>
                  {payment.txHash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => window.open(getExplorerUrl(payment.chain, payment.txHash!), "_blank")}
                      data-testid={`button-verify-${payment.id}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {queue.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <CloudUpload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-1">
              <p className="font-medium">No queued payments</p>
              <p className="text-sm text-muted-foreground max-w-md">
                When you're offline or want to batch payments, queue them here.
                They'll be submitted to your wallet for approval when you sync.
              </p>
            </div>
            <Button variant="outline" onClick={() => setCreateOpen(true)} data-testid="button-first-queue">
              <Plus className="h-4 w-4 mr-2" /> Queue a Payment
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Offline Payments Work</CardTitle>
          <p className="text-sm text-muted-foreground">
            Built for market days, field work, rural areas, and anywhere with spotty coverage.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Wifi className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">1. Load Once</p>
                <p className="text-xs text-muted-foreground">
                  Open the app while you have signal. It loads into your browser and stays there — even if your connection drops.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">2. Queue</p>
                <p className="text-xs text-muted-foreground">
                  Create payments while offline. They're saved on your device — no server needed. Your cached balance shows what you can afford.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CloudUpload className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">3. Sync</p>
                <p className="text-xs text-muted-foreground">
                  When signal returns, hit "Sync All". Each payment opens in your wallet for approval — one by one.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">4. Proof</p>
                <p className="text-xs text-muted-foreground">
                  Every completed payment records the on-chain transaction hash. Both sides can verify it on the blockchain.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Supported Wallets</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-[#00A4E4]/10 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5 text-[#00A4E4]" />
                  </div>
                  <p className="text-sm font-medium">Xaman (XRPL)</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  XRP and RLUSD payments. Sync opens Xaman automatically — scan the QR or tap the deep link to approve.
                </p>
              </div>
              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-[#7B61FF]/10 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5 text-[#7B61FF]" />
                  </div>
                  <p className="text-sm font-medium">Lobstr / Solar / Freighter (Stellar)</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  XLM and USDC payments. Sync generates a Stellar deep link that opens your wallet app directly with the payment pre-filled.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Install for Full Offline Access
            </p>
            <p className="text-xs text-muted-foreground">
              Add CryptoOwnBank to your phone's home screen for true offline access. The app will load from cache even without any internet — perfect for remote areas.
              On iPhone: tap the share button in Safari, then "Add to Home Screen". On Android: tap the menu, then "Install app" or "Add to Home Screen".
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Important:</strong> The queue stores your payment intent — who to pay, how much, and in which currency. The actual transaction only happens when you sync and approve it in your wallet.
              We never hold your keys or submit transactions without your approval. Your wallet balance is cached locally so you can check what you can afford while offline.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!stellarSyncPayment} onOpenChange={(open) => {
        if (!open && stellarSyncPayment) {
          setStellarSyncPayment(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#7B61FF]" />
              Open in Stellar Wallet
            </DialogTitle>
          </DialogHeader>
          {stellarSyncPayment && (() => {
            const uri = buildStellarUri(stellarSyncPayment.to, stellarSyncPayment.amount, stellarSyncPayment.currency, stellarSyncPayment.memo);
            return (
              <div className="space-y-4" data-testid="stellar-sync-content">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To</span>
                    <span className="font-mono text-xs">{stellarSyncPayment.to.slice(0, 10)}...{stellarSyncPayment.to.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">{stellarSyncPayment.amount} {stellarSyncPayment.currency}</span>
                  </div>
                  {stellarSyncPayment.memo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memo</span>
                      <span>{stellarSyncPayment.memo}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Tap "Open in Wallet" to launch your Stellar wallet app (Lobstr, Solar, Freighter, or StellarTerm) with this payment pre-filled. Approve it in your wallet to complete the transaction.
                </p>

                <Button
                  className="w-full bg-[#7B61FF] hover:bg-[#6B51EF] text-white"
                  onClick={() => {
                    window.open(uri, "_blank");
                  }}
                  data-testid="button-open-stellar-wallet"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Wallet
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(uri);
                      toast({ title: "Stellar URI copied" });
                    }}
                    data-testid="button-copy-stellar-uri"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy URI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(stellarSyncPayment.to);
                      toast({ title: "Address copied" });
                    }}
                    data-testid="button-copy-stellar-addr"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Address
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-xs font-medium block">Transaction Hash (optional)</label>
                  <Input
                    placeholder="Paste Stellar tx hash for verification..."
                    value={stellarTxHash}
                    onChange={(e) => setStellarTxHash(e.target.value)}
                    className="font-mono text-xs"
                    data-testid="input-stellar-tx-hash"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      updateQueueItem(stellarSyncPayment.id, { status: "failed", errorMessage: "Not completed — try again later" });
                      setStellarSyncPayment(null);
                      setStellarTxHash("");
                      refreshQueue();
                    }}
                    data-testid="button-stellar-cancel"
                  >
                    Not Yet
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      updateQueueItem(stellarSyncPayment.id, {
                        status: "sent",
                        syncedAt: new Date().toISOString(),
                        ...(stellarTxHash.trim() ? { txHash: stellarTxHash.trim() } : {}),
                      });
                      setStellarSyncPayment(null);
                      setStellarTxHash("");
                      refreshQueue();
                      toast({
                        title: "Payment confirmed",
                        description: stellarTxHash.trim()
                          ? `TX ${stellarTxHash.slice(0, 10)}... recorded.`
                          : `${stellarSyncPayment.amount} ${stellarSyncPayment.currency} marked as sent.`,
                      });
                    }}
                    data-testid="button-stellar-confirm"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    I Approved It
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiptPayment} onOpenChange={(open) => !open && setReceiptPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              Proof of Delivery
            </DialogTitle>
          </DialogHeader>
          {receiptPayment && (() => {
            const receipt = getReceiptData(receiptPayment);
            return (
              <div className="space-y-4" data-testid="receipt-content">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{receipt.amount} {receipt.currency}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {receipt.chain.toUpperCase()} Payment
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {receipt.recipientName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To</span>
                        <span className="font-medium">{receipt.recipientName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-mono text-xs">{receipt.to.slice(0, 10)}...{receipt.to.slice(-6)}</span>
                    </div>
                    {receipt.from && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From</span>
                        <span className="font-mono text-xs">{receipt.from.slice(0, 10)}...{receipt.from.slice(-6)}</span>
                      </div>
                    )}
                    {receipt.memo && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Memo</span>
                        <span>{receipt.memo}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Queued</span>
                      <span>{formatDate(receipt.createdAt)}</span>
                    </div>
                    {receipt.syncedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confirmed</span>
                        <span>{formatDate(receipt.syncedAt)}</span>
                      </div>
                    )}
                  </div>
                  {receipt.txHash && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                        <div className="flex items-center gap-2">
                          <code className="text-[11px] font-mono bg-muted rounded px-2 py-1 flex-1 truncate" data-testid="text-tx-hash">
                            {receipt.txHash}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(receipt.txHash);
                              toast({ title: "TX hash copied" });
                            }}
                            data-testid="button-copy-txhash"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {receipt.txHash && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Verified on {receipt.chain === "stellar" ? "Stellar" : "XRP Ledger"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          This payment is permanently recorded on the blockchain. Both sender and receiver can independently verify it.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!receipt.txHash && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          No transaction hash recorded
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          The payment was marked as sent, but no on-chain TX hash was captured. Check your wallet history for confirmation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {receipt.explorerUrl && (
                    <Button
                      className="flex-1"
                      onClick={() => window.open(receipt.explorerUrl, "_blank")}
                      data-testid="button-view-explorer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Verify on {receipt.chain === "stellar" ? "Stellar Expert" : "XRPScan"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      const text = [
                        `Payment Proof — CryptoOwnBank`,
                        `Amount: ${receipt.amount} ${receipt.currency}`,
                        receipt.recipientName ? `To: ${receipt.recipientName}` : `To: ${receipt.to}`,
                        receipt.txHash ? `TX: ${receipt.txHash}` : "",
                        receipt.explorerUrl ? `Verify: ${receipt.explorerUrl}` : "",
                        `Date: ${receipt.syncedAt ? new Date(receipt.syncedAt).toLocaleString() : new Date(receipt.createdAt).toLocaleString()}`,
                      ].filter(Boolean).join("\n");

                      if (navigator.share) {
                        try {
                          await navigator.share({ title: "Payment Proof", text });
                        } catch {}
                      } else {
                        await navigator.clipboard.writeText(text);
                        toast({ title: "Receipt copied to clipboard" });
                      }
                    }}
                    data-testid="button-share-receipt"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Proof
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Queue a Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!isOnline && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                <WifiOff className="h-3.5 w-3.5 shrink-0" />
                You're offline. This payment will be saved and synced later.
              </div>
            )}
            <div className="space-y-2">
              <Label>Recipient Name (optional)</Label>
              <Input
                placeholder="Who are you paying?"
                value={newPayment.recipientName}
                onChange={(e) => setNewPayment(p => ({ ...p, recipientName: e.target.value }))}
                data-testid="input-queue-recipient"
              />
            </div>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                placeholder="rXXX... or GXXX..."
                value={newPayment.to}
                onChange={(e) => {
                  const addr = e.target.value;
                  setNewPayment(p => ({
                    ...p,
                    to: addr,
                    chain: addr.startsWith("G") ? "stellar" : "xrpl",
                    currency: addr.startsWith("G") ? "XLM" : p.currency === "XLM" ? "XRP" : p.currency,
                  }));
                }}
                data-testid="input-queue-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                  min="0"
                  step="0.01"
                  data-testid="input-queue-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={newPayment.currency}
                  onValueChange={(v) => setNewPayment(p => ({ ...p, currency: v }))}
                >
                  <SelectTrigger data-testid="select-queue-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {newPayment.chain === "xrpl" ? (
                      <>
                        <SelectItem value="XRP">XRP</SelectItem>
                        <SelectItem value="RLUSD">RLUSD</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="XLM">XLM</SelectItem>
                        <SelectItem value="USDC">USDC</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(() => {
              const effective = getEffectiveBalance(newPayment.chain, newPayment.currency);
              const cacheAge = getBalanceCacheAge();
              const amt = parseFloat(newPayment.amount) || 0;
              const insufficient = effective && amt > 0 && amt > effective.available;
              return (
                <div className="space-y-1.5">
                  {effective && (
                    <div className="rounded-lg bg-muted/50 p-2.5 space-y-1" data-testid="text-cached-balance">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          Wallet balance
                          {cacheAge && <span className="text-[10px] opacity-70">({cacheAge})</span>}
                        </span>
                        <span className="font-semibold">{effective.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {newPayment.currency}</span>
                      </div>
                      {effective.pending > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Already queued</span>
                          <span className="text-amber-600 font-medium">-{effective.pending.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs border-t border-border/50 pt-1">
                        <span className="text-muted-foreground font-medium">Available</span>
                        <span className={`font-bold ${insufficient ? "text-red-500" : "text-green-600"}`}>
                          {effective.available.toLocaleString(undefined, { maximumFractionDigits: 2 })} {newPayment.currency}
                        </span>
                      </div>
                    </div>
                  )}
                  {insufficient && (
                    <div className="flex items-center gap-1.5 rounded bg-red-500/10 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400" data-testid="warning-insufficient">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Amount exceeds available balance. Payment may fail when synced.
                    </div>
                  )}
                  {!effective && newPayment.chain === "xrpl" && (
                    <p className="text-[11px] text-muted-foreground">
                      Connect your wallet to cache your balance for offline reference.
                    </p>
                  )}
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>Memo (optional)</Label>
              <Input
                placeholder="What's this payment for?"
                value={newPayment.memo}
                onChange={(e) => setNewPayment(p => ({ ...p, memo: e.target.value }))}
                data-testid="input-queue-memo"
              />
            </div>
            {newPayment.chain === "xrpl" && (
              <div className="space-y-2">
                <Label>Destination Tag (optional)</Label>
                <Input
                  placeholder="e.g. 12345"
                  value={newPayment.destinationTag}
                  onChange={(e) => setNewPayment(p => ({ ...p, destinationTag: e.target.value }))}
                  data-testid="input-queue-tag"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToQueue} data-testid="button-confirm-queue">
              <Plus className="h-4 w-4 mr-2" />
              {isOnline ? "Queue Payment" : "Save for Later"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
