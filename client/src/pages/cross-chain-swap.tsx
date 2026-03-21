import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { SeoHead } from "@/components/seo-head";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  ArrowDownUp,
  Loader2,
  ExternalLink,
  Wallet,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings2,
  Info,
  Zap,
  Clock,
  DollarSign,
  Route,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEvmWallet, EVM_CHAINS, sendEvmTransaction, getExplorerTxUrl, shortenAddress } from "@/lib/evm-wallet";
import { SiWalletconnect } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";

interface LifiChain {
  id: number;
  key: string;
  name: string;
  coin: string;
  logoURI: string;
  nativeToken: { address: string; symbol: string; decimals: number; logoURI: string; priceUSD: string };
}

interface LifiToken {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
}

interface RouteStep {
  id: string;
  type: string;
  tool: string;
  toolDetails: { key: string; name: string; logoURI: string };
  action: {
    fromToken: LifiToken;
    toToken: LifiToken;
    fromChainId: number;
    toChainId: number;
    fromAmount: string;
  };
  estimate: {
    toAmount: string;
    toAmountMin: string;
    executionDuration: number;
    gasCosts: { amountUSD: string }[];
    feeCosts: { amountUSD: string; name: string }[];
  };
}

interface LifiRoute {
  id: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  fromToken: LifiToken;
  toToken: LifiToken;
  fromChainId: number;
  toChainId: number;
  steps: RouteStep[];
  gasCostUSD: string;
  tags: string[];
}

interface QuoteData {
  id: string;
  type: string;
  tool: string;
  toolDetails: { key: string; name: string; logoURI: string };
  action: {
    fromToken: LifiToken;
    toToken: LifiToken;
    fromChainId: number;
    toChainId: number;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
    slippage: number;
  };
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: { name: string; amountUSD: string; percentage: string }[];
    gasCosts: { type: string; estimate: string; amountUSD: string }[];
  };
  transactionRequest?: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    chainId: number;
  };
  includedSteps?: RouteStep[];
}

const POPULAR_CHAINS = [1, 137, 42161, 10, 8453, 43114, 56];

const CHAIN_NATIVE_TOKENS: Record<number, { address: string; symbol: string; decimals: number }> = {
  1: { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", decimals: 18 },
  137: { address: "0x0000000000000000000000000000000000000000", symbol: "POL", decimals: 18 },
  42161: { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", decimals: 18 },
  10: { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", decimals: 18 },
  8453: { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", decimals: 18 },
  43114: { address: "0x0000000000000000000000000000000000000000", symbol: "AVAX", decimals: 18 },
  56: { address: "0x0000000000000000000000000000000000000000", symbol: "BNB", decimals: 18 },
};

const POPULAR_TOKENS_PER_CHAIN: Record<number, { address: string; symbol: string; name: string; decimals: number }[]> = {
  1: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  ],
  137: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "POL", name: "POL", decimals: 18 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether", decimals: 6 },
  ],
  42161: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether", decimals: 6 },
  ],
  10: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  8453: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  43114: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "AVAX", name: "Avalanche", decimals: 18 },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  56: [
    { address: "0x0000000000000000000000000000000000000000", symbol: "BNB", name: "BNB", decimals: 18 },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
  ],
};

function formatTokenAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount) / (10 ** decimals);
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (num >= 0.0001) return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return num.toExponential(4);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)}min`;
  return `~${(seconds / 3600).toFixed(1)}hr`;
}

export default function CrossChainSwap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { address, chainId, isConnected, isConnecting, connect, connectWalletConnect, disconnect, switchChain, walletProvider, error: walletError } = useEvmWallet();

  const [fromChainId, setFromChainId] = useState(1);
  const [toChainId, setToChainId] = useState(137);
  const [fromToken, setFromToken] = useState("0x0000000000000000000000000000000000000000");
  const [toToken, setToToken] = useState("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("3");
  const [showSettings, setShowSettings] = useState(false);

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [isSwapping, setIsSwapping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const tier = (user as any)?.subscriptionTier || "free";
  const isAdmin = (user as any)?.isAdmin === true;
  const hasPremium = isAdmin || tier === "premium" || tier === "pro" || tier === "premium_annual";

  const { data: chainsData } = useQuery<{ chains: LifiChain[] }>({
    queryKey: ["/api/cross-chain/chains"],
  });
  const availableChains = chainsData?.chains?.filter(c => POPULAR_CHAINS.includes(c.id)) || [];

  const fromTokens = POPULAR_TOKENS_PER_CHAIN[fromChainId] || [];
  const toTokens = POPULAR_TOKENS_PER_CHAIN[toChainId] || [];

  const fromTokenInfo = fromTokens.find(t => t.address === fromToken);
  const toTokenInfo = toTokens.find(t => t.address === toToken);

  useEffect(() => {
    const tokens = POPULAR_TOKENS_PER_CHAIN[fromChainId];
    if (tokens?.length) {
      setFromToken(tokens[0].address);
    }
    setQuote(null);
    setQuoteError(null);
  }, [fromChainId]);

  useEffect(() => {
    const tokens = POPULAR_TOKENS_PER_CHAIN[toChainId];
    if (tokens?.length) {
      setToToken(tokens.length > 1 ? tokens[1].address : tokens[0].address);
    }
    setQuote(null);
    setQuoteError(null);
  }, [toChainId]);

  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0 || !address) return;
    const srcInfo = fromTokens.find(t => t.address === fromToken);
    if (!srcInfo) return;

    setIsQuoting(true);
    setQuoteError(null);
    try {
      const parts = amount.split(".");
      const whole = parts[0] || "0";
      const frac = (parts[1] || "").padEnd(srcInfo.decimals, "0").slice(0, srcInfo.decimals);
      const rawAmount = BigInt(whole + frac).toString();
      const params = new URLSearchParams({
        fromChain: fromChainId.toString(),
        toChain: toChainId.toString(),
        fromToken,
        toToken,
        fromAmount: rawAmount,
        fromAddress: address,
        slippage: (parseFloat(slippage) / 100).toString(),
      });
      const res = await apiRequest("GET", `/api/cross-chain/quote?${params}`);
      const data = await res.json();
      if (data.message) {
        setQuoteError(data.message);
        setQuote(null);
      } else {
        setQuote(data);
        setQuoteError(null);
      }
    } catch (err: any) {
      setQuoteError(err.message || "Failed to fetch quote");
      setQuote(null);
    } finally {
      setIsQuoting(false);
    }
  }, [fromToken, toToken, amount, fromChainId, toChainId, address, slippage, fromTokens]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0 && fromToken && toToken && address) {
        fetchQuote();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken, fetchQuote]);

  const handleFlipChains = () => {
    const tmpChain = fromChainId;
    const tmpToken = fromToken;
    setFromChainId(toChainId);
    setToChainId(tmpChain);
    setFromToken(toToken);
    setToToken(tmpToken);
    setQuote(null);
  };

  const handleExecuteSwap = async () => {
    if (!quote || !address) return;
    setShowConfirmDialog(false);
    setIsSwapping(true);
    setTxHash(null);
    setBridgeStatus(null);

    try {
      if (chainId !== fromChainId) {
        await switchChain(fromChainId);
        await new Promise(r => setTimeout(r, 1000));
      }

      const steps = quote.includedSteps || [quote];
      setTotalSteps(steps.length);
      setCurrentStep(1);

      const txReq = quote.transactionRequest;
      if (!txReq) throw new Error("No transaction data in quote");

      const hash = await sendEvmTransaction({
        to: txReq.to,
        data: txReq.data,
        value: txReq.value,
        gasLimit: txReq.gasLimit,
      });

      setTxHash(hash);
      setBridgeStatus("pending");

      toast({
        title: "Transaction Submitted",
        description: `Cross-chain swap initiated. Tx: ${hash.slice(0, 10)}...`,
      });

      let attempts = 0;
      const maxAttempts = 120;
      const checkStatus = async () => {
        try {
          const bridge = quote.tool || "";
          const statusRes = await apiRequest("GET",
            `/api/cross-chain/status?txHash=${hash}&bridge=${bridge}&fromChain=${fromChainId}&toChain=${toChainId}`
          );
          const statusData = await statusRes.json();

          if (statusData.status === "DONE") {
            setBridgeStatus("complete");
            toast({
              title: "Cross-Chain Swap Complete!",
              description: `Successfully swapped to ${toTokenInfo?.symbol || "token"} on ${EVM_CHAINS[toChainId]?.name || "destination chain"}`,
            });
            return;
          } else if (statusData.status === "FAILED") {
            setBridgeStatus("failed");
            toast({
              title: "Swap Failed",
              description: "The cross-chain transaction failed. Your funds should be returned.",
              variant: "destructive",
            });
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 10000);
          } else {
            setBridgeStatus("timeout");
          }
        } catch {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 10000);
          }
        }
      };

      setTimeout(checkStatus, 15000);

    } catch (err: any) {
      toast({
        title: "Swap Failed",
        description: err.message || "Transaction was rejected or failed",
        variant: "destructive",
      });
      setBridgeStatus(null);
    } finally {
      setIsSwapping(false);
    }
  };

  const totalFeesUSD = quote?.estimate?.feeCosts?.reduce((sum, f) => sum + parseFloat(f.amountUSD || "0"), 0) || 0;
  const totalGasUSD = quote?.estimate?.gasCosts?.reduce((sum, g) => sum + parseFloat(g.amountUSD || "0"), 0) || 0;
  const estimatedDuration = quote?.estimate?.executionDuration || 0;

  if (!user) return null;

  if (!hasPremium) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <SeoHead title="Cross-Chain Swap | CryptoOwnBank" description="Swap tokens across blockchains" />
        <UpgradePrompt
          feature="Cross-Chain Swap"
          description="Bridge and swap tokens across different blockchains seamlessly. Upgrade to Premium to unlock this feature."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <SeoHead
        title="Cross-Chain Swap | CryptoOwnBank"
        description="Swap tokens across different blockchains with optimal routing"
      />

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Route className="h-6 w-6 text-orange-500" /> Cross-Chain Swap
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Swap tokens across blockchains via bridges & DEXs — powered by LI.FI
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-settings"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>

        {showSettings && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Slippage %</label>
                <div className="flex gap-2">
                  {["1", "3", "5"].map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={slippage === s ? "default" : "outline"}
                      onClick={() => setSlippage(s)}
                      data-testid={`button-slippage-${s}`}
                    >
                      {s}%
                    </Button>
                  ))}
                  <Input
                    className="w-20 h-8"
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    value={slippage}
                    onChange={e => setSlippage(e.target.value)}
                    data-testid="input-slippage-custom"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isConnected ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <Wallet className="h-8 w-8 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect MetaMask to start swapping tokens across chains
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" /> Before You Start
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Connect via MetaMask (browser extension) or WalletConnect (scan QR with any mobile wallet)</li>
                    <li>• Your tokens stay in your wallet — we never hold your funds</li>
                    <li>• Cross-chain swaps use bridges (Across, Stargate, etc.) to move tokens between chains</li>
                    <li>• Bridge times vary: 1–20 minutes depending on the route</li>
                  </ul>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={connect}
                    disabled={isConnecting}
                    className="bg-orange-500 hover:bg-orange-600"
                    data-testid="button-connect-metamask"
                  >
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                    MetaMask
                  </Button>
                  <Button
                    onClick={connectWalletConnect}
                    disabled={isConnecting}
                    variant="outline"
                    data-testid="button-connect-walletconnect"
                  >
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SiWalletconnect className="h-4 w-4 mr-2 text-blue-500" />}
                    WalletConnect
                  </Button>
                </div>
                {walletError && (
                  <p className="text-xs text-red-500" data-testid="text-wallet-error">{walletError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-orange-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium" data-testid="text-wallet-address">
                      {shortenAddress(address || "")}
                    </span>
                    {chainId && EVM_CHAINS[chainId] && (
                      <Badge variant="outline" className="text-xs" data-testid="badge-chain">
                        {EVM_CHAINS[chainId].name}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={disconnect} data-testid="button-disconnect">
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownUp className="h-4 w-4" /> Swap Route
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From</label>
                  <div className="flex gap-2">
                    <Select value={fromChainId.toString()} onValueChange={v => setFromChainId(parseInt(v))}>
                      <SelectTrigger className="w-[140px]" data-testid="select-from-chain">
                        <SelectValue placeholder="Chain" />
                      </SelectTrigger>
                      <SelectContent>
                        {POPULAR_CHAINS.map(cid => (
                          <SelectItem key={cid} value={cid.toString()} data-testid={`option-from-chain-${cid}`}>
                            {EVM_CHAINS[cid]?.name || `Chain ${cid}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={fromToken} onValueChange={v => { setFromToken(v); setQuote(null); }}>
                      <SelectTrigger className="flex-1" data-testid="select-from-token">
                        <SelectValue placeholder="Token" />
                      </SelectTrigger>
                      <SelectContent>
                        {fromTokens.map(t => (
                          <SelectItem key={t.address} value={t.address} data-testid={`option-from-token-${t.symbol}`}>
                            {t.symbol} — {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={`Amount in ${fromTokenInfo?.symbol || "token"}`}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setQuote(null); }}
                    data-testid="input-amount"
                  />
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-10 w-10"
                    onClick={handleFlipChains}
                    data-testid="button-flip-chains"
                  >
                    <ArrowDownUp className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To</label>
                  <div className="flex gap-2">
                    <Select value={toChainId.toString()} onValueChange={v => setToChainId(parseInt(v))}>
                      <SelectTrigger className="w-[140px]" data-testid="select-to-chain">
                        <SelectValue placeholder="Chain" />
                      </SelectTrigger>
                      <SelectContent>
                        {POPULAR_CHAINS.map(cid => (
                          <SelectItem key={cid} value={cid.toString()} data-testid={`option-to-chain-${cid}`}>
                            {EVM_CHAINS[cid]?.name || `Chain ${cid}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={toToken} onValueChange={v => { setToToken(v); setQuote(null); }}>
                      <SelectTrigger className="flex-1" data-testid="select-to-token">
                        <SelectValue placeholder="Token" />
                      </SelectTrigger>
                      <SelectContent>
                        {toTokens.map(t => (
                          <SelectItem key={t.address} value={t.address} data-testid={`option-to-token-${t.symbol}`}>
                            {t.symbol} — {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {fromChainId === toChainId && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    Same chain selected — for same-chain swaps, use <a href="/ownbank/evm-swap" className="underline font-medium">EVM Swap</a> instead for better rates.
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={fetchQuote}
                  disabled={!amount || parseFloat(amount) <= 0 || !fromToken || !toToken || isQuoting}
                  data-testid="button-get-quote"
                >
                  {isQuoting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Finding Best Route...</>
                  ) : (
                    <><Route className="h-4 w-4 mr-2" /> Get Cross-Chain Quote</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {quoteError && (
              <Card className="border-red-500/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm" data-testid="text-quote-error">{quoteError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {quote && (
              <Card className="border-green-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Route Found
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Send</span>
                        <div className="font-semibold text-lg" data-testid="text-from-amount">
                          {amount} {fromTokenInfo?.symbol}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          on {EVM_CHAINS[fromChainId]?.name}
                        </span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground mx-2 flex-shrink-0" />
                      <div className="text-sm text-right">
                        <span className="text-muted-foreground">Receive</span>
                        <div className="font-semibold text-lg text-green-600" data-testid="text-to-amount">
                          {formatTokenAmount(quote.estimate.toAmount, quote.action.toToken.decimals)} {quote.action.toToken.symbol}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          on {EVM_CHAINS[toChainId]?.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Minimum received: {formatTokenAmount(quote.estimate.toAmountMin, quote.action.toToken.decimals)} {quote.action.toToken.symbol}
                    </div>
                  </div>

                  {quote.includedSteps && quote.includedSteps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Route Steps</p>
                      <div className="space-y-1">
                        {quote.includedSteps.map((step, i) => (
                          <div key={step.id || i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-sm" data-testid={`route-step-${i}`}>
                            <Badge variant="outline" className="text-[10px] px-1.5 flex-shrink-0">
                              {i + 1}
                            </Badge>
                            {step.toolDetails?.logoURI && (
                              <img src={step.toolDetails.logoURI} alt="" className="h-4 w-4 rounded" />
                            )}
                            <span className="font-medium">{step.toolDetails?.name || step.tool}</span>
                            <span className="text-muted-foreground">
                              {step.type === "swap" ? "Swap" : step.type === "cross" ? "Bridge" : step.type === "lifi" ? "Bridge + Swap" : step.type}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {step.action.fromToken.symbol}
                              <ChevronRight className="h-3 w-3 inline mx-0.5" />
                              {step.action.toToken.symbol}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-muted/30 rounded-lg p-2">
                      <Clock className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                      <p className="text-xs text-muted-foreground">Est. Time</p>
                      <p className="text-sm font-medium" data-testid="text-duration">
                        {formatDuration(estimatedDuration)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <DollarSign className="h-4 w-4 mx-auto text-green-500 mb-1" />
                      <p className="text-xs text-muted-foreground">Gas Cost</p>
                      <p className="text-sm font-medium" data-testid="text-gas-cost">
                        ${totalGasUSD.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <Shield className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                      <p className="text-xs text-muted-foreground">Fees</p>
                      <p className="text-sm font-medium" data-testid="text-fees">
                        ${totalFeesUSD.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    <Shield className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    Non-custodial: You sign each step directly from your wallet. We never hold your funds.
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={isSwapping}
                    data-testid="button-execute-swap"
                  >
                    {isSwapping ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing Step {currentStep}/{totalSteps}...</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-2" /> Execute Cross-Chain Swap</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {txHash && (
              <Card className={`border-${bridgeStatus === "complete" ? "green" : bridgeStatus === "failed" ? "red" : "blue"}-500/30`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {bridgeStatus === "complete" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : bridgeStatus === "failed" ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                    <span className="font-medium" data-testid="text-bridge-status">
                      {bridgeStatus === "complete"
                        ? "Cross-Chain Swap Complete!"
                        : bridgeStatus === "failed"
                        ? "Transaction Failed"
                        : bridgeStatus === "timeout"
                        ? "Status check timed out — check explorer"
                        : "Bridging in progress..."
                      }
                    </span>
                  </div>

                  {bridgeStatus === "pending" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Bridge transfers take 1–20 minutes depending on the route. Please wait...
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Source Tx:</span>
                    <a
                      href={getExplorerTxUrl(fromChainId, txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                      data-testid="link-tx-hash"
                    >
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" /> How Cross-Chain Swaps Work
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">1</Badge>
                  <span>Select your source chain & token, destination chain & token, and amount.</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">2</Badge>
                  <span>LI.FI finds the best route using bridges & DEXs across 30+ chains.</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">3</Badge>
                  <span>Approve the transaction in MetaMask. The bridge handles delivery automatically.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" /> Confirm Cross-Chain Swap
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Send</span>
                <span className="font-medium">{amount} {fromTokenInfo?.symbol} on {EVM_CHAINS[fromChainId]?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receive</span>
                <span className="font-medium text-green-600">
                  {quote ? formatTokenAmount(quote.estimate.toAmount, quote.action.toToken.decimals) : "—"} {toTokenInfo?.symbol} on {EVM_CHAINS[toChainId]?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Time</span>
                <span>{formatDuration(estimatedDuration)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gas + Fees</span>
                <span>${(totalGasUSD + totalFeesUSD).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Via</span>
                <span>{quote?.toolDetails?.name || quote?.tool || "—"}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Cross-chain swaps use bridges which take time to settle. Once confirmed, the transaction cannot be reversed.
                Make sure the destination chain and token are correct.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} data-testid="button-cancel-swap">
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleExecuteSwap}
              data-testid="button-confirm-swap"
            >
              <Zap className="h-4 w-4 mr-2" /> Confirm Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
