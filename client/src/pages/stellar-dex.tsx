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
  ArrowUpDown,
  BookOpen,
  HelpCircle,
  RefreshCw,
  Globe,
  Shield,
  Wallet,
  Star,
  Info,
} from "lucide-react";
import { SeoHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";

interface StellarAsset {
  code: string;
  issuer: string | null;
  display: string;
  type: "native" | "credit_alphanum4" | "credit_alphanum12";
}

interface StellarPair {
  label: string;
  base: StellarAsset;
  quote: StellarAsset;
  category: string;
}

const XLM_NATIVE: StellarAsset = { code: "XLM", issuer: null, display: "XLM", type: "native" };
const USDC_STELLAR: StellarAsset = { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", display: "USDC", type: "credit_alphanum4" };
const EURC_STELLAR: StellarAsset = { code: "EURC", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE", display: "EURC", type: "credit_alphanum4" };
const USDT_STELLAR: StellarAsset = { code: "USDT", issuer: "GCQTGZQQ5G4PTM2GL7CDIFKUBBER43GPYJHEZ5B65LNQP3WGSY6RA24T", display: "USDT", type: "credit_alphanum4" };
const BTC_ULTRA: StellarAsset = { code: "BTC", issuer: "GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF", display: "BTC", type: "credit_alphanum4" };
const ETH_ULTRA: StellarAsset = { code: "ETH", issuer: "GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF", display: "ETH", type: "credit_alphanum4" };
const AQUA_STELLAR: StellarAsset = { code: "AQUA", issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA", display: "AQUA", type: "credit_alphanum4" };
const yXLM_STELLAR: StellarAsset = { code: "yXLM", issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55", display: "yXLM", type: "credit_alphanum4" };
const XRP_STELLAR: StellarAsset = { code: "XRP", issuer: "GBXRPL45NPHCVMFFAYZVUVFFVKSIZ362ZXFP7I2ETNOJEMON2KWSSVAIX", display: "XRP", type: "credit_alphanum4" };
const DOGE_ULTRA: StellarAsset = { code: "DOGE", issuer: "GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF", display: "DOGE", type: "credit_alphanum4" };
const SHX_STELLAR: StellarAsset = { code: "SHX", issuer: "GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEZ6JHR5PX7CXZJOQL5WFHAVPS", display: "SHX", type: "credit_alphanum4" };
const RMT_STELLAR: StellarAsset = { code: "RMT", issuer: "GDEGOXPCHXWFYY234D2YNNFBY5HACK47Q7BWIV6SLLIUG55TP5MHKM6S", display: "RMT", type: "credit_alphanum4" };
const MOBI_STELLAR: StellarAsset = { code: "MOBI", issuer: "GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH", display: "MOBI", type: "credit_alphanum4" };

const STELLAR_PAIRS: StellarPair[] = [
  { label: "XLM / USDC", base: XLM_NATIVE, quote: USDC_STELLAR, category: "Stablecoins" },
  { label: "XLM / EURC", base: XLM_NATIVE, quote: EURC_STELLAR, category: "Stablecoins" },
  { label: "XLM / USDT", base: XLM_NATIVE, quote: USDT_STELLAR, category: "Stablecoins" },
  { label: "USDC / EURC", base: USDC_STELLAR, quote: EURC_STELLAR, category: "Stablecoins" },
  { label: "XLM / BTC", base: XLM_NATIVE, quote: BTC_ULTRA, category: "Crypto" },
  { label: "XLM / ETH", base: XLM_NATIVE, quote: ETH_ULTRA, category: "Crypto" },
  { label: "XLM / XRP", base: XLM_NATIVE, quote: XRP_STELLAR, category: "Crypto" },
  { label: "XLM / DOGE", base: XLM_NATIVE, quote: DOGE_ULTRA, category: "Crypto" },
  { label: "XLM / AQUA", base: XLM_NATIVE, quote: AQUA_STELLAR, category: "Crypto" },
  { label: "XLM / yXLM", base: XLM_NATIVE, quote: yXLM_STELLAR, category: "Crypto" },
  { label: "XLM / SHX", base: XLM_NATIVE, quote: SHX_STELLAR, category: "Crypto" },
  { label: "XLM / RMT", base: XLM_NATIVE, quote: RMT_STELLAR, category: "Crypto" },
  { label: "XLM / MOBI", base: XLM_NATIVE, quote: MOBI_STELLAR, category: "Crypto" },
];

const PAIR_CATEGORIES = ["Stablecoins", "Crypto"];

interface OrderBookEntry {
  price: string;
  amount: string;
}

interface HorizonOrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

function formatAmount(val: string | number, decimals = 6): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0";
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num < 0.0001) return num.toExponential(4);
  return num.toFixed(Math.min(decimals, 6));
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function buildHorizonAssetParams(asset: StellarAsset, prefix: string): string {
  if (asset.type === "native") {
    return `${prefix}_asset_type=native`;
  }
  return `${prefix}_asset_type=${asset.type}&${prefix}_asset_code=${asset.code}&${prefix}_asset_issuer=${asset.issuer}`;
}

async function fetchStellarOrderBook(base: StellarAsset, quote: StellarAsset, limit = 15): Promise<HorizonOrderBook> {
  const baseParams = buildHorizonAssetParams(base, "selling");
  const quoteParams = buildHorizonAssetParams(quote, "buying");
  const url = `https://horizon.stellar.org/order_book?${baseParams}&${quoteParams}&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch order book");
  const data = await res.json();

  const bids: OrderBookEntry[] = (data.bids || []).map((b: any) => ({
    price: b.price,
    amount: b.amount,
  }));
  const asks: OrderBookEntry[] = (data.asks || []).map((a: any) => ({
    price: a.price,
    amount: a.amount,
  }));

  return { bids, asks };
}

function buildStellarTradeUrl(pair: StellarPair, wallet: "lobstr" | "stellarterm" | "stellarx"): string {
  const baseCode = pair.base.code;
  const quoteCode = pair.quote.code;

  if (wallet === "lobstr") {
    if (pair.base.type === "native") {
      return `https://lobstr.co/trade/${quoteCode}:${pair.quote.issuer}`;
    }
    return `https://lobstr.co/trade/${baseCode}:${pair.base.issuer}`;
  }
  if (wallet === "stellarterm") {
    if (pair.base.type === "native") {
      return `https://stellarterm.com/exchange/${quoteCode}-${pair.quote.issuer}/${baseCode}-native`;
    }
    return `https://stellarterm.com/exchange/${baseCode}-${pair.base.issuer}/${quoteCode}-${pair.quote.issuer || "native"}`;
  }
  return `https://www.stellarx.com/swap/${baseCode}/${quoteCode}`;
}

export default function StellarDex() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });
  const isPremiumOrAbove = subscriptionData?.tier === "premium" || subscriptionData?.tier === "pro";
  const [educationOpen, setEducationOpen] = useState(true);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [loadingBook, setLoadingBook] = useState(false);
  const [swapMode, setSwapMode] = useState(true);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapDirection, setSwapDirection] = useState<"buy" | "sell">("buy");
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);

  const pair = STELLAR_PAIRS[selectedPairIndex];

  const fetchOrderBook = useCallback(async () => {
    setLoadingBook(true);
    try {
      const result = await fetchStellarOrderBook(pair.base, pair.quote);
      setBids(result.bids);
      setAsks(result.asks);
    } catch {
      toast({ title: "Failed to load order book", variant: "destructive" });
    } finally {
      setLoadingBook(false);
    }
  }, [pair, toast]);

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 15000);
    return () => clearInterval(interval);
  }, [fetchOrderBook]);

  const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
  const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : 0;
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  const swapAmountNum = parseFloat(swapAmount) || 0;
  const estimatedReceive = swapDirection === "buy"
    ? (bestAsk > 0 ? swapAmountNum / bestAsk : 0)
    : swapAmountNum * bestBid;
  const receiveAsset = swapDirection === "buy" ? pair.base.display : pair.quote.display;
  const payAsset = swapDirection === "buy" ? pair.quote.display : pair.base.display;

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
    setTradeDialogOpen(true);
  };

  if (!isPremiumOrAbove) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dex-title">Stellar DEX Trading</h1>
          <p className="text-muted-foreground mt-1">
            Trade 13 token pairs on the Stellar network's built-in decentralized exchange — XLM, USDC, EURC, BTC, and more.
          </p>
        </div>
        <UpgradePrompt
          feature="Stellar DEX trading is a Premium feature. Upgrade to access live order books, Quick Swap, and trading across 13 pairs on the Stellar network's native DEX."
          variant="premium"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SeoHead
        title="Stellar DEX — CryptoOwnBank | Trade on Stellar's Built-in Exchange"
        description="Trade tokens on Stellar's native decentralized exchange. XLM to USDC, EURC, BTC, ETH and more. Non-custodial, live order book, sign in your own wallet."
        path="/stellar/dex"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-dex-title">Stellar DEX</h1>
          <p className="text-muted-foreground">Trade tokens on Stellar's built-in decentralized exchange</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-[#7B61FF]/40" data-testid="badge-stellar-network">
            <Star className="h-3 w-3 mr-1 text-[#7B61FF]" />
            Stellar Network
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrderBook}
            disabled={loadingBook}
            data-testid="button-refresh-stellar-dex"
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
                <BookOpen className="h-5 w-5 text-[#7B61FF]" />
                Learn: How the Stellar DEX Works
              </CardTitle>
              {educationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <StellarDexEducation />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select
          value={selectedPairIndex.toString()}
          onValueChange={(val) => setSelectedPairIndex(parseInt(val))}
        >
          <SelectTrigger className="w-full sm:w-72" data-testid="select-stellar-pair">
            <SelectValue placeholder="Select trading pair" />
          </SelectTrigger>
          <SelectContent>
            {PAIR_CATEGORIES.map((cat) => {
              const catPairs = STELLAR_PAIRS.filter(p => p.category === cat);
              const catOffset = STELLAR_PAIRS.indexOf(catPairs[0]);
              return (
                <div key={cat}>
                  <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat}</p>
                  {catPairs.map((p, j) => (
                    <SelectItem key={catOffset + j} value={(catOffset + j).toString()} data-testid={`select-stellar-pair-${catOffset + j}`}>
                      {p.label}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
        <Badge variant="secondary" data-testid="badge-stellar-selected-pair">
          {pair.base.display} / {pair.quote.display}
        </Badge>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={swapMode ? "default" : "outline"}
            size="sm"
            onClick={() => setSwapMode(true)}
            data-testid="button-swap-mode"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Quick Swap
          </Button>
          <Button
            variant={!swapMode ? "default" : "outline"}
            size="sm"
            onClick={() => setSwapMode(false)}
            data-testid="button-book-mode"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Order Book
          </Button>
        </div>
      </div>

      {midPrice > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Mid Price:</span>
            <span className="font-mono font-medium" data-testid="text-stellar-mid-price">{formatAmount(midPrice)}</span>
            <span className="text-muted-foreground">{pair.quote.display} per {pair.base.display}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Spread:</span>
            <span className="font-mono text-muted-foreground" data-testid="text-stellar-spread">{formatAmount(spread)} ({spreadPct.toFixed(2)}%)</span>
          </div>
        </div>
      )}

      {swapMode ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card data-testid="card-stellar-swap">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-[#7B61FF]" />
                Quick Swap
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>See the live rate, enter your amount, and open the trade in your Stellar wallet (LOBSTR, StellarTerm, or StellarX).</p>
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
                  data-testid="button-stellar-buy"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Buy {pair.base.display}
                </Button>
                <Button
                  variant={swapDirection === "sell" ? "default" : "outline"}
                  className={swapDirection === "sell" ? "flex-1 bg-red-600 border-red-600 text-white" : "flex-1"}
                  onClick={() => setSwapDirection("sell")}
                  data-testid="button-stellar-sell"
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
                  data-testid="input-stellar-swap-amount"
                />
              </div>

              {swapAmountNum > 0 && midPrice > 0 && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">You receive (est.)</span>
                    <span className="font-mono font-medium text-lg" data-testid="text-stellar-receive">
                      ~{formatAmount(estimatedReceive, 4)} {receiveAsset}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Rate</span>
                    <span className="font-mono">
                      1 {pair.base.display} = {formatAmount(midPrice)} {pair.quote.display}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Network fee</span>
                    <span>~0.00001 XLM</span>
                  </div>
                </div>
              )}

              <Button
                className={`w-full ${swapDirection === "buy" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
                onClick={handleSwapClick}
                data-testid="button-stellar-swap-execute"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Trade in Stellar Wallet
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                Opens your preferred Stellar wallet to sign the trade. Non-custodial — you control your keys.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stellar-mini-book">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Live Order Book</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchOrderBook} disabled={loadingBook} data-testid="button-refresh-stellar-book">
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
                <MiniOrderBook bids={bids} asks={asks} maxAmount={maxAmount} pair={pair} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card data-testid="card-stellar-full-book">
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
            <Button variant="ghost" size="sm" onClick={fetchOrderBook} disabled={loadingBook} data-testid="button-refresh-stellar-full-book">
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
                  <p className="text-xs font-medium text-muted-foreground mb-2">Bids (Buyers)</p>
                  <div className="space-y-0.5">
                    {bids.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No bids</p>}
                    {bids.slice(0, 15).map((bid, i) => {
                      const depthPct = ((parseFloat(bid.amount) || 0) / maxAmount) * 100;
                      return (
                        <div key={i} className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm" data-testid={`row-stellar-bid-${i}`}>
                          <div className="absolute inset-y-0 left-0 bg-green-500/10 rounded-sm" style={{ width: `${Math.min(depthPct, 100)}%` }} />
                          <span className="relative text-green-600 dark:text-green-400">{formatAmount(bid.price, 6)}</span>
                          <span className="relative text-muted-foreground">{formatAmount(bid.amount, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Asks (Sellers)</p>
                  <div className="space-y-0.5">
                    {asks.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No asks</p>}
                    {asks.slice(0, 15).map((ask, i) => {
                      const depthPct = ((parseFloat(ask.amount) || 0) / maxAmount) * 100;
                      return (
                        <div key={i} className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm" data-testid={`row-stellar-ask-${i}`}>
                          <div className="absolute inset-y-0 right-0 bg-red-500/10 rounded-sm" style={{ width: `${Math.min(depthPct, 100)}%` }} />
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
                <span>Spread: <span className="font-mono">{formatAmount(spread, 6)}</span></span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-3">Trade this pair</p>
              <div className="flex flex-wrap gap-2">
                <a href={buildStellarTradeUrl(pair, "lobstr")} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" data-testid="button-trade-lobstr-full">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in LOBSTR
                  </Button>
                </a>
                <a href={buildStellarTradeUrl(pair, "stellarterm")} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" data-testid="button-trade-stellarterm-full">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in StellarTerm
                  </Button>
                </a>
                <a href={buildStellarTradeUrl(pair, "stellarx")} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" data-testid="button-trade-stellarx-full">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in StellarX
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-[#7B61FF]/30 bg-[#7B61FF]/5 p-4 text-sm" data-testid="stellar-dex-disclaimer">
        <Info className="h-5 w-5 text-[#7B61FF] shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          This is not financial advice. Stellar DEX trades execute in your own wallet — CryptoOwnBank never holds your funds or keys. We show live order book data and link you to signing wallets (LOBSTR, StellarTerm, StellarX). All trades are non-custodial and settle on the Stellar blockchain in ~5 seconds.
        </p>
      </div>

      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-stellar-trade-title">
              Open Trade in Stellar Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Pair</span>
                <span className="font-medium">{pair.label}</span>
              </div>
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
                <span className="text-muted-foreground">Rate</span>
                <span className="font-mono text-xs">1 {pair.base.display} = {formatAmount(midPrice)} {pair.quote.display}</span>
              </div>
            </div>

            <div className="rounded-md bg-[#7B61FF]/5 border border-[#7B61FF]/20 p-3">
              <p className="text-xs text-[#7B61FF] dark:text-[#9D8AFF]">
                Choose your Stellar wallet below. The trade opens pre-filled in your wallet — you just confirm and sign. Non-custodial: your keys, your trade.
              </p>
            </div>

            <div className="space-y-2">
              <a href={buildStellarTradeUrl(pair, "lobstr")} target="_blank" rel="noopener noreferrer" className="block" onClick={() => setTradeDialogOpen(false)}>
                <Button className="w-full bg-[#7B61FF] hover:bg-[#6B51EF] text-white" data-testid="button-trade-lobstr">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Trade on LOBSTR
                </Button>
              </a>
              <a href={buildStellarTradeUrl(pair, "stellarterm")} target="_blank" rel="noopener noreferrer" className="block" onClick={() => setTradeDialogOpen(false)}>
                <Button variant="outline" className="w-full" data-testid="button-trade-stellarterm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Trade on StellarTerm
                </Button>
              </a>
              <a href={buildStellarTradeUrl(pair, "stellarx")} target="_blank" rel="noopener noreferrer" className="block" onClick={() => setTradeDialogOpen(false)}>
                <Button variant="outline" className="w-full" data-testid="button-trade-stellarx">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Trade on StellarX
                </Button>
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTradeDialogOpen(false)} data-testid="button-cancel-stellar-trade">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniOrderBook({ bids, asks, maxAmount, pair }: { bids: OrderBookEntry[]; asks: OrderBookEntry[]; maxAmount: number; pair: StellarPair }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Asks (Sellers)</p>
        <div className="space-y-0.5">
          {asks.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">No asks</p>}
          {[...asks.slice(0, 6)].reverse().map((ask, i) => {
            const depthPct = ((parseFloat(ask.amount) || 0) / maxAmount) * 100;
            return (
              <div key={i} className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm" data-testid={`row-stellar-mini-ask-${i}`}>
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
            {formatAmount(((parseFloat(bids[0].price) + parseFloat(asks[0].price)) / 2), 6)} {pair.quote.display}
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
              <div key={i} className="relative flex items-center justify-between gap-2 px-2 py-0.5 text-xs font-mono rounded-sm" data-testid={`row-stellar-mini-bid-${i}`}>
                <div className="absolute inset-y-0 left-0 bg-green-500/10 rounded-sm" style={{ width: `${Math.min(depthPct, 100)}%` }} />
                <span className="relative text-green-600 dark:text-green-400">{formatAmount(bid.price, 6)}</span>
                <span className="relative text-muted-foreground">{formatAmount(bid.amount, 2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StellarDexEducation() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border p-4 space-y-2">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Old Way</p>
          <p className="text-sm text-muted-foreground">
            Open a forex account &rarr; deposit via bank wire &rarr; pay spread + commissions &rarr; wait for settlement &rarr; broker holds your cash
          </p>
        </div>
        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">New Way (Stellar DEX)</p>
          <p className="text-sm text-muted-foreground">
            Pick your pair &rarr; confirm in your wallet &rarr; trade settles in ~5 seconds &rarr; tokens stay in YOUR wallet
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/30 border border-muted p-4 space-y-2">
        <p className="text-sm font-medium">How the Stellar DEX works</p>
        <p className="text-sm text-muted-foreground">
          Like XRPL, Stellar has a native decentralized exchange built into the protocol. No company runs it. XLM acts as the bridge currency — it connects every asset pair through automatic pathfinding. When you trade XLM for USDC, the Stellar network finds the best route and settles atomically. Your funds never leave your wallet until the trade completes.
        </p>
      </div>

      <div className="rounded-md bg-[#7B61FF]/5 border border-[#7B61FF]/20 p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-[#7B61FF]" />
          XLM as Bridge Currency
        </p>
        <p className="text-sm text-muted-foreground">
          Just like XRP bridges assets on the XRPL, XLM bridges assets on Stellar. Send USD, receive EUR. Send BTC, receive USDC. Stellar's path payment feature automatically finds the best conversion route through the DEX, often routing through XLM. One atomic transaction, ~5 seconds, near-zero fees.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold mb-1">LOBSTR</p>
          <p className="text-xs text-muted-foreground">
            Most popular Stellar wallet — iOS/Android/Web. Built-in DEX trading, staking, and USDC support.
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold mb-1">StellarTerm</p>
          <p className="text-xs text-muted-foreground">
            Web-based DEX interface. Advanced order types, full order book view. Connect with Freighter or Ledger.
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold mb-1">StellarX</p>
          <p className="text-xs text-muted-foreground">
            Clean swap interface by SDF. Easy for beginners. Supports Freighter, Ledger, and Albedo wallets.
          </p>
        </div>
      </div>

      <a
        href="https://developers.stellar.org/docs/learn/fundamentals/stellar-ecosystem-proposals"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-[#7B61FF] hover:underline"
        data-testid="link-stellar-dex-docs"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Learn more at Stellar Docs
      </a>
    </>
  );
}
