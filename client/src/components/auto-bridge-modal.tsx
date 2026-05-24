import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowRight, ExternalLink, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  fetchThorQuote,
  buildThorSwapDeeplink,
  getThorAsset,
  type ThorQuoteResult,
} from "@/lib/thorchain";
import { getStripeOptionsForChain } from "@/lib/stripe-onramp";
import { useToast } from "@/hooks/use-toast";

interface AutoBridgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Target chain key (e.g. "ltc", "doge", "bch") */
  toChain: string;
  /** User's derived address on the target chain — receives the final coin */
  destinationAddress: string;
  /** User's derived EVM address — where USDC is delivered by Stripe */
  evmAddress: string;
}

type Stage = "quote" | "buy-usdc" | "swap" | "done";

const MIN_USD = 25;
const MAX_USD = 1000;

export function AutoBridgeModal({
  open,
  onOpenChange,
  toChain,
  destinationAddress,
  evmAddress,
}: AutoBridgeModalProps) {
  const { toast } = useToast();
  const toAsset = getThorAsset(toChain);
  const [usdAmount, setUsdAmount] = useState(50);
  const [stage, setStage] = useState<Stage>("quote");
  const [quote, setQuote] = useState<ThorQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Reset whenever the modal opens
  useEffect(() => {
    if (open) {
      setStage("quote");
      setQuote(null);
      setQuoteError(null);
    }
  }, [open, toChain]);

  // Debounced live quote
  useEffect(() => {
    if (!open || !toAsset || !destinationAddress) return;
    if (usdAmount < MIN_USD || usdAmount > MAX_USD) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);
    const handle = setTimeout(async () => {
      try {
        const q = await fetchThorQuote({ toChain, destinationAddress, usdAmount });
        if (!cancelled) {
          setQuote(q);
          setQuoteLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setQuoteError(err?.message || "Could not fetch quote");
          setQuote(null);
          setQuoteLoading(false);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, toChain, destinationAddress, usdAmount, toAsset]);

  const handleOpenStripe = useCallback(async () => {
    if (!evmAddress) {
      toast({ title: "No EVM address", description: "Your seed didn't derive an Ethereum address.", variant: "destructive" });
      return;
    }
    const opts = getStripeOptionsForChain("evm");
    const usdcOpt = opts.find((o) => o.currency === "usdc" && o.network === "ethereum") || opts[0];
    if (!usdcOpt) {
      toast({ title: "Stripe option missing", description: "USDC on Ethereum is not configured.", variant: "destructive" });
      return;
    }

    // Open popup synchronously to avoid blocker, then update URL when ready
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer,width=500,height=800");
    setStripeLoading(true);
    try {
      const r = await fetch("/api/stripe/onramp-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: evmAddress,
          destinationCurrency: usdcOpt.currency,
          destinationNetwork: usdcOpt.network,
          sourceAmount: usdAmount,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data?.redirectUrl) {
        throw new Error(data?.message || "Failed to create Stripe session");
      }
      if (popup && !popup.closed) {
        popup.location.href = data.redirectUrl;
      } else {
        window.location.href = data.redirectUrl;
      }
      setStage("buy-usdc");
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      toast({ title: "Stripe error", description: err?.message || "Could not open Stripe", variant: "destructive" });
    } finally {
      setStripeLoading(false);
    }
  }, [evmAddress, usdAmount, toast]);

  const handleOpenThorSwap = useCallback(() => {
    const url = buildThorSwapDeeplink({
      toChain,
      destinationAddress,
      usdAmount,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setStage("done");
  }, [toChain, destinationAddress, usdAmount]);

  if (!toAsset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="modal-auto-bridge">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Buy {toAsset.displayName} with card
          </DialogTitle>
          <DialogDescription>
            Two steps: card → USDC (Stripe), then USDC → {toAsset.symbol} (THORChain). Non-custodial end-to-end — we never touch your funds.
          </DialogDescription>
        </DialogHeader>

        {/* Amount + live quote */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bridge-amount" className="text-xs">Amount (USD)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="bridge-amount"
                type="number"
                inputMode="decimal"
                min={MIN_USD}
                max={MAX_USD}
                step={5}
                value={usdAmount}
                onChange={(e) => setUsdAmount(Number(e.target.value) || 0)}
                disabled={stage !== "quote"}
                className="h-9"
                data-testid="input-bridge-amount"
              />
            </div>
            <div className="text-[11px] text-muted-foreground">
              Min ${MIN_USD} (gas economics) · Max ${MAX_USD} (slippage on smaller pools)
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 min-h-[88px] flex flex-col justify-center" data-testid="panel-bridge-quote">
            {usdAmount < MIN_USD || usdAmount > MAX_USD ? (
              <div className="text-xs text-muted-foreground">Enter an amount between ${MIN_USD} and ${MAX_USD}.</div>
            ) : quoteLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Fetching live THORChain quote…
              </div>
            ) : quoteError ? (
              <div className="text-xs text-rose-600">{quoteError}</div>
            ) : quote ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">You receive (est.)</span>
                  <span className="text-base font-semibold tabular-nums" data-testid="text-bridge-expected">
                    {quote.expectedOutHuman} {toAsset.symbol}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Fees ~{quote.totalFeesPctHuman}</span>
                  <span>Slippage ~{quote.slippageBpsHuman}</span>
                  <span>Time ~{quote.totalSwapMinutes} min</span>
                </div>
                {quote.warning && (
                  <div className="flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{quote.warning}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <div className="space-y-2">
          <StepRow
            n={1}
            active={stage === "quote" || stage === "buy-usdc"}
            done={stage === "swap" || stage === "done"}
            title="Pay Stripe → receive USDC on Ethereum"
            sub={`USDC lands at your address ${evmAddress.slice(0, 8)}…${evmAddress.slice(-6)} (~1–5 min)`}
          />
          <StepRow
            n={2}
            active={stage === "swap"}
            done={stage === "done"}
            title={`Swap USDC → ${toAsset.symbol} via THORChain`}
            sub={`THORSwap UI pre-filled, sends ${toAsset.symbol} to ${destinationAddress.slice(0, 8)}…${destinationAddress.slice(-6)}`}
          />
        </div>

        {stage === "buy-usdc" && (
          <Alert className="border-emerald-500/40 bg-emerald-500/5">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-sm">Stripe checkout opened in a new tab</AlertTitle>
            <AlertDescription className="text-xs space-y-2">
              <div>
                After you complete the card payment, USDC will arrive at your Ethereum address within a few minutes.
                Once you see it in your wallet, click below to swap it to {toAsset.symbol}.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {stage === "done" && (
          <Alert className="border-emerald-500/40 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-sm">Swap handed off to THORSwap</AlertTitle>
            <AlertDescription className="text-xs">
              Complete the swap in the THORSwap tab. Your {toAsset.symbol} will arrive at <code className="font-mono">{destinationAddress.slice(0, 8)}…{destinationAddress.slice(-6)}</code> in ~{quote?.totalSwapMinutes || 10} minutes.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {stage === "quote" && (
            <Button
              onClick={handleOpenStripe}
              disabled={!quote || stripeLoading || quoteLoading}
              className="w-full sm:w-auto"
              data-testid="button-bridge-open-stripe"
            >
              {stripeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Step 1: Buy ${usdAmount} USDC
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {stage === "buy-usdc" && (
            <Button
              onClick={() => setStage("swap")}
              className="w-full sm:w-auto"
              data-testid="button-bridge-confirm-paid"
            >
              I've completed the Stripe payment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {stage === "swap" && (
            <Button
              onClick={handleOpenThorSwap}
              className="w-full sm:w-auto"
              data-testid="button-bridge-open-thorswap"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Step 2: Open THORSwap to convert
            </Button>
          )}
          {stage === "done" && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
              data-testid="button-bridge-close"
            >
              Close
            </Button>
          )}
        </DialogFooter>

        <div className="text-[10px] text-muted-foreground border-t pt-2 leading-snug">
          <Badge variant="outline" className="text-[10px] mr-1.5">v1</Badge>
          THORSwap (the open-source THORChain frontend) handles the actual swap signing. They've routed $1B+ in non-custodial swaps. In a future release we'll move the signing in-house so it happens here without a tab switch.
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({ n, active, done, title, sub }: { n: number; active: boolean; done: boolean; title: string; sub: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-md border p-2.5 ${done ? "border-emerald-500/40 bg-emerald-500/5" : active ? "border-[#00A4E4]/40 bg-[#00A4E4]/5" : "bg-muted/20"}`}>
      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${done ? "bg-emerald-500 text-white" : active ? "bg-[#00A4E4] text-white" : "bg-muted text-muted-foreground"}`}>
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
