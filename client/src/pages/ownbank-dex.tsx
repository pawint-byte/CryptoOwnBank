import { useState, useEffect, useCallback } from "react";
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
  getAccountTrustlines,
  getBalances,
  type OrderBookEntry,
  type XrplOffer,
} from "@/lib/xrpl-client";
import { signTransaction } from "@/lib/xumm-connector";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useToast } from "@/hooks/use-toast";

const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

interface TradingPair {
  label: string;
  base: { currency: string; issuer?: string; display: string };
  counter: { currency: string; issuer?: string; display: string };
}

const COMMON_PAIRS: TradingPair[] = [
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
    label: "XRP / EUR (Gatehub)",
    base: { currency: "EUR", issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq", display: "EUR" },
    counter: { currency: "XRP", display: "XRP" },
  },
  {
    label: "SOLO / XRP",
    base: { currency: "534F4C4F00000000000000000000000000000000", issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz", display: "SOLO" },
    counter: { currency: "XRP", display: "XRP" },
  },
];

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
  const { isConnected, walletAddress, walletType } = useXrplStore();

  const [educationOpen, setEducationOpen] = useState(true);
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

  useEffect(() => {
    if (isConnected) {
      fetchMyOffers();
    }
  }, [isConnected, fetchMyOffers]);

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

      let takerGets: any;
      let takerPays: any;

      if (orderSide === "buy") {
        takerGets = buildAmountField(pair.counter, orderType === "limit" ? (a * p).toString() : (a * (parseFloat(asks[0]?.price) || p)).toString());
        takerPays = buildAmountField(pair.base, a.toString());
      } else {
        takerGets = buildAmountField(pair.base, a.toString());
        takerPays = buildAmountField(pair.counter, orderType === "limit" ? (a * p).toString() : (a * (parseFloat(bids[0]?.price) || p)).toString());
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
        toast({
          title: "Order Placed",
          description: `${orderSide === "buy" ? "Buy" : "Sell"} order for ${formatAmount(amount)} ${pair.base.display} submitted successfully.`,
        });
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
          <SelectTrigger className="w-full sm:w-64" data-testid="select-trading-pair">
            <SelectValue placeholder="Select trading pair" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_PAIRS.map((p, i) => (
              <SelectItem key={i} value={i.toString()} data-testid={`select-pair-${i}`}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" data-testid="badge-selected-pair">
          {pair.base.display} / {pair.counter.display}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
      </div>

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
