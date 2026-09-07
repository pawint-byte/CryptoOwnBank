import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CreditCard, ExternalLink, Loader2, Lock, RefreshCcw, Route, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { tokens } from "@/pages/buy-crypto";
import { apiRequest } from "@/lib/queryClient";
import { createOnrampSessionAndRedirect } from "@/lib/stripe-onramp";
import { composeGuidedRoute, makeGuidedSwapRails, type GuidedHolding, type GuidedRailId, type GuidedRoute } from "@/lib/guided-buy-route";
import { useToast } from "@/hooks/use-toast";

type WalletRow = {
  id: string; chain: string; address: string; label?: string | null;
  balances: Array<{ assetSymbol: string; balance: string; usdValue?: string | null }>;
};

const CHAIN_FOR_TOKEN: Record<string, string[]> = {
  ETH: ["evm", "ethereum"], USDC: ["evm", "ethereum", "base", "polygon", "avalanche"],
  MATIC: ["evm", "polygon"], AVAX: ["evm", "avalanche"], BTC: ["btc", "bitcoin"],
  LTC: ["ltc"], DOGE: ["doge"], BCH: ["bch"], XRP: ["xrp", "xrpl"], RLUSD: ["xrp", "xrpl"],
  XLM: ["xlm", "stellar"], SOL: ["sol", "solana"], XMR: ["xmr", "monero"],
};

export function GuidedBuyWizard({ open, onOpenChange, initialTarget }: {
  open: boolean; onOpenChange: (open: boolean) => void; initialTarget?: string;
}) {
  const { toast } = useToast();
  const [target, setTarget] = useState(initialTarget || "BTC");
  const [walletId, setWalletId] = useState("");
  const [amountUsd, setAmountUsd] = useState(50);
  const [started, setStarted] = useState(false);
  const [legIndex, setLegIndex] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [baseline, setBaseline] = useState<Record<string, number>>({});
  const [selectedRails, setSelectedRails] = useState<Record<string, GuidedRailId>>({});
  const [checking, setChecking] = useState(false);
  const [doneAmount, setDoneAmount] = useState<number | null>(null);
  const [lockedRoute, setLockedRoute] = useState<GuidedRoute | null>(null);
  const [sessionId, setSessionId] = useState("");

  const walletsQuery = useQuery<WalletRow[]>({ queryKey: ["/api/wallets"], enabled: open, refetchInterval: waiting ? 10_000 : false });
  const thorStatusQuery = useQuery<{ chains: Record<string, { halted: boolean; reason?: string | null }> }>({
    queryKey: ["/api/thorchain/status"],
    enabled: open,
    staleTime: 60_000,
  });
  const wallets = walletsQuery.data || [];
  const destinationWallets = useMemo(() => {
    const aliases = CHAIN_FOR_TOKEN[target] || [target.toLowerCase()];
    return wallets.filter((w) => aliases.includes(w.chain.toLowerCase()));
  }, [wallets, target]);
  useEffect(() => {
    if (destinationWallets.length && !destinationWallets.some((w) => w.id === walletId)) setWalletId(destinationWallets[0].id);
  }, [destinationWallets, walletId]);
  useEffect(() => {
    if (open) { setTarget(initialTarget || "BTC"); setStarted(false); setLegIndex(0); setWaiting(false); setDoneAmount(null); setLockedRoute(null); setSessionId(crypto.randomUUID()); }
  }, [open, initialTarget]);

  const destination = destinationWallets.find((w) => w.id === walletId);
  const bridgeWallet = wallets.find((w) => ["evm", "ethereum"].includes(w.chain.toLowerCase()) && /^0x[a-fA-F0-9]{40}$/.test(w.address));
  const holdings = useMemo<GuidedHolding[]>(() => wallets.flatMap((w) => w.balances.map((b) => ({
    symbol: b.assetSymbol.toUpperCase(),
    balance: Number(b.balance) || 0,
    usdValue: Number(b.usdValue) || 0,
    walletAddress: w.address,
    chain: w.chain,
  }))), [wallets]);
  const previewRoute = useMemo(() => destination ? composeGuidedRoute({
    target, destinationAddress: destination.address, holdings, amountUsd, bridgeAddress: bridgeWallet?.address,
  }) : null, [target, destination, holdings, amountUsd, bridgeWallet?.address]);
  const route = started ? lockedRoute : previewRoute;
  const leg = route?.legs[legIndex];
  const displayedRails = useMemo(() => {
    if (!leg) return [];
    return leg.rails.map((rail) => {
      if (rail.id !== "thorchain") return rail;
      const chain = thorStatusQuery.data?.chains[leg.to];
      return chain?.halted ? { ...rail, unavailableReason: chain.reason || "Network temporarily paused" } : rail;
    });
  }, [leg, thorStatusQuery.data]);
  const complete = !!route && (route.legs.length === 0 || legIndex >= route.legs.length);

  function balanceOf(symbol: string) {
    return holdings.filter((h) => h.symbol === symbol).reduce((sum, h) => sum + h.balance, 0);
  }
  async function beginLeg() {
    if (!leg) return;
    if (leg.kind === "buy") {
      const evm = wallets.find((w) => w.address.toLowerCase() === leg.destinationAddress.toLowerCase());
      if (!evm) return toast({ title: "Save an EVM wallet first", description: "Stripe needs your own 0x address for the bridge coin.", variant: "destructive" });
      const walletBalances = Object.fromEntries(evm.balances.map((b) => [b.assetSymbol.toUpperCase(), Number(b.balance) || 0]));
      setBaseline({ USDC: walletBalances.USDC || 0, ETH: walletBalances.ETH || 0 });
      try {
        await createOnrampSessionAndRedirect({ walletAddress: evm.address, destinationCurrency: leg.to.toLowerCase(), destinationNetwork: "ethereum", sourceAmount: amountUsd });
        setWaiting(true);
      } catch (error: any) {
        toast({ title: "Could not open Stripe", description: error?.message, variant: "destructive" });
      }
      return;
    }
    const rail = selectedRails[leg.id] || displayedRails.find((r) => !r.unavailableReason)?.id;
    const choice = displayedRails.find((r) => r.id === rail);
    if (!choice?.href) return;
    const sourceWallet = wallets.find((w) => w.address.toLowerCase() === leg.sourceWalletAddress?.toLowerCase());
    const destinationWallet = wallets.find((w) => w.address.toLowerCase() === leg.destinationAddress.toLowerCase());
    const sourceBalance = sourceWallet?.balances.find((b) => b.assetSymbol.toUpperCase() === leg.from)?.balance;
    const destinationBalance = destinationWallet?.balances.find((b) => b.assetSymbol.toUpperCase() === leg.to)?.balance;
    setBaseline({ [`source:${leg.from}`]: Number(sourceBalance) || 0, [`destination:${leg.to}`]: Number(destinationBalance) || 0 });
    window.open(choice.href, "_blank", "noopener,noreferrer");
    setWaiting(true);
  }
  async function checkArrival(manual = false) {
    if (!leg) return;
    setChecking(true);
    const relevantWallets = wallets.filter((w) =>
      w.address.toLowerCase() === leg.destinationAddress.toLowerCase()
      || w.address.toLowerCase() === leg.sourceWalletAddress?.toLowerCase()
    );
    const synced = await Promise.all(relevantWallets.map(async (wallet) => {
      try {
        const res = await apiRequest("POST", `/api/wallets/${wallet.id}/sync`);
        return await res.json() as WalletRow;
      } catch {
        return wallet;
      }
    }));
    await walletsQuery.refetch();
    const freshDestination = synced.find((w) => w.address.toLowerCase() === leg.destinationAddress.toLowerCase());
    const freshSource = synced.find((w) => w.address.toLowerCase() === leg.sourceWalletAddress?.toLowerCase());
    const inWallet = (wallet: WalletRow | undefined, symbol: string) =>
      Number(wallet?.balances.find((b) => b.assetSymbol.toUpperCase() === symbol)?.balance) || 0;
    let arrived = manual;
    let received = 0;
    let disposed = 0;
    if (leg.kind === "buy") {
      const usdcDelta = inWallet(freshDestination, "USDC") - (baseline.USDC || 0);
      const ethDelta = inWallet(freshDestination, "ETH") - (baseline.ETH || 0);
      arrived = arrived || usdcDelta > 0 || ethDelta > 0;
      received = Math.max(usdcDelta, ethDelta, 0);
      const actualBridge = ethDelta > usdcDelta ? "ETH" : "USDC";
      if (arrived && route?.legs[legIndex + 1]?.from && route.legs[legIndex + 1].from !== actualBridge) {
        const next = route.legs[legIndex + 1];
        setLockedRoute({
          ...route,
          legs: route.legs.map((routeLeg, index) => index === legIndex + 1 ? {
            ...routeLeg,
            id: `swap-${actualBridge}-${routeLeg.to}`,
            from: actualBridge,
            sourceWalletAddress: leg.destinationAddress,
            rails: makeGuidedSwapRails(actualBridge, routeLeg.to, routeLeg.destinationAddress, leg.destinationAddress, routeLeg.amountUsd),
          } : routeLeg),
        });
      }
    } else {
      received = Math.max(inWallet(freshDestination, leg.to) - (baseline[`destination:${leg.to}`] || 0), 0);
      disposed = Math.max((baseline[`source:${leg.from}`] || 0) - inWallet(freshSource, leg.from || ""), 0);
      arrived = arrived || received > 0;
    }
    if (arrived) {
      if (!manual && leg.kind !== "buy" && leg.from && leg.sourceWalletAddress && disposed > 0) {
        try {
          await apiRequest("POST", "/api/send/disposal-notification", {
            chain: holdings.find((h) => h.walletAddress === leg.sourceWalletAddress)?.chain,
            assetSymbol: leg.from,
            quantity: disposed,
            walletAddress: leg.sourceWalletAddress,
            recipient: leg.destinationAddress,
            disposalType: "swap",
            memo: `Guided route ${leg.from} → ${leg.to}`,
            idempotencyKey: `${sessionId}:${leg.id}`,
          });
        } catch { /* tax notification is best-effort; never block member funds */ }
      }
      setWaiting(false);
      setDoneAmount(received || null);
      setLegIndex((n) => n + 1);
    } else {
      toast({ title: "Still waiting", description: `${leg.to} has not appeared in your saved wallet balance yet.` });
    }
    setChecking(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-guided-buy">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-primary" /> Get me to a token</DialogTitle>
          <DialogDescription>We compose the shortest working path. You approve each leg; your own wallets hold the funds between legs.</DialogDescription>
        </DialogHeader>
        {!started ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Token you want</Label><Select value={target} onValueChange={setTarget}><SelectTrigger data-testid="select-guided-target"><SelectValue /></SelectTrigger><SelectContent>{tokens.map((t) => <SelectItem key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Amount to route (USD)</Label><Input type="number" min={25} max={1000} value={amountUsd} onChange={(e) => setAmountUsd(Number(e.target.value) || 0)} /></div>
            </div>
            <div className="space-y-2"><Label>Final wallet</Label>{destinationWallets.length ? <Select value={walletId} onValueChange={setWalletId}><SelectTrigger data-testid="select-guided-wallet"><SelectValue /></SelectTrigger><SelectContent>{destinationWallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.label || w.chain} — {w.address.slice(0, 10)}…{w.address.slice(-6)}</SelectItem>)}</SelectContent></Select> : <Alert><Wallet className="h-4 w-4" /><AlertTitle>No saved {target} wallet</AlertTitle><AlertDescription>Save a compatible wallet on Wallets & Addresses first, then reopen this guide.</AlertDescription></Alert>}</div>
            {route && <div className="rounded-lg border p-4 space-y-3"><div className="font-semibold">{route.summary}</div><div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline">Est. fees ${route.estimatedFeeUsd.toFixed(2)}</Badge><Badge variant="outline">Est. receive ${route.estimatedReceiveUsd.toFixed(2)}</Badge><Badge variant="outline">ETA ~{route.etaMinutes} min</Badge></div>{route.legs.map((l, i) => <div key={l.id} className="flex gap-3 text-sm"><span className="font-bold">{i + 1}</span><span>{l.kind === "buy" ? `Buy ${l.to}` : `${l.from} → ${l.to}`} · {l.rails.map((r) => r.label).join(" or ")}</span></div>)}</div>}
            {!bridgeWallet && route?.legs.some((l) => l.kind === "buy") && <Alert><CreditCard className="h-4 w-4" /><AlertTitle>An EVM bridge wallet is required</AlertTitle><AlertDescription>Save an Ethereum/EVM 0x address first. Stripe sends the entry coin there before the next leg.</AlertDescription></Alert>}
            <Button className="w-full" disabled={!destination || !route || (!bridgeWallet && route.legs.some((l) => l.kind === "buy"))} onClick={() => { setLockedRoute(route); setStarted(true); }} data-testid="button-guided-lock-route"><Lock className="mr-2 h-4 w-4" /> Lock address and start</Button>
          </div>
        ) : complete ? (
          <Alert className="border-emerald-500/40 bg-emerald-500/5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><AlertTitle>{target} route complete</AlertTitle><AlertDescription>{doneAmount ? `${doneAmount.toLocaleString()} ${target} was detected at ` : `${target} is at `}<code>{destination?.address}</code>.</AlertDescription></Alert>
        ) : leg && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">Leg {legIndex + 1} of {route!.legs.length} · destination locked</div>
            <div className="rounded-lg border p-4"><div className="font-semibold text-lg">{leg.kind === "buy" ? <><CreditCard className="inline h-5 w-5 mr-2" />Buy {leg.to} with card</> : <>{leg.from} <ArrowRight className="inline h-4 w-4" /> {leg.to}</>}</div><p className="text-sm text-muted-foreground mt-1">Est. fee ${leg.estimatedFeeUsd.toFixed(2)} · ETA ~{leg.etaMinutes} min</p></div>
            {displayedRails.length > 1 && <div className="space-y-2"><Label>Choose a working rail</Label><Select value={selectedRails[leg.id] || displayedRails.find((r) => !r.unavailableReason)?.id || displayedRails[0].id} onValueChange={(v) => setSelectedRails((s) => ({ ...s, [leg.id]: v as GuidedRailId }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{displayedRails.map((r) => <SelectItem key={r.id} value={r.id} disabled={!!r.unavailableReason}>{r.label}{r.unavailableReason ? ` — ${r.unavailableReason}` : ""}</SelectItem>)}</SelectContent></Select></div>}
            {waiting ? <Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertTitle>Waiting for {leg.to} to arrive at the locked address</AlertTitle><AlertDescription className="space-y-3"><p>We refresh only the wallet for this leg. Automatic verification unlocks the next leg when its balance increases.</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => checkArrival()} disabled={checking}><RefreshCcw className="mr-2 h-4 w-4" /> Check again</Button><Button size="sm" variant="outline" onClick={() => checkArrival(true)} disabled={checking}>Continue without verification</Button></div><p className="text-xs">Recovery fallback: continuing manually trusts your wallet check and does not create an automatic tax entry.</p></AlertDescription></Alert> : <Button className="w-full" onClick={beginLeg} disabled={!displayedRails.some((r) => !r.unavailableReason)}>{leg.kind === "buy" ? <CreditCard className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}{leg.kind === "buy" ? "Open Stripe checkout" : `Open ${displayedRails.find((r) => r.id === (selectedRails[leg.id] || displayedRails.find((x) => !x.unavailableReason)?.id))?.label}`}</Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}