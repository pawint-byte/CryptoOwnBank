import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEvmWallet, EVM_CHAINS, sendEvmTransaction, getExplorerTxUrl, shortenAddress } from "@/lib/evm-wallet";
import { SiWalletconnect } from "react-icons/si";

const POPULAR_TOKENS: Record<number, { address: string; symbol: string; name: string; decimals: number; logoURI?: string }[]> = {
  1: [
    { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
    { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", decimals: 18 },
    { address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", symbol: "stETH", name: "Lido Staked ETH", decimals: 18 },
    { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18 },
    { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave", decimals: 18 },
    { address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", symbol: "MKR", name: "Maker", decimals: 18 },
    { address: "0xFEtc6b2E1B8e0DcE6a0c4BFfDD3B0dA3F3dB8F0C", symbol: "FET", name: "Fetch.ai", decimals: 18 },
    { address: "0x6810e776880C02933D47DB1b9fc05908e5386b96", symbol: "GNO", name: "Gnosis", decimals: 18 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "Shiba Inu", decimals: 18 },
    { address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", symbol: "PEPE", name: "Pepe", decimals: 18 },
  ],
  137: [
    { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "POL", name: "POL", decimals: 18 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether", decimals: 6 },
    { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped ETH", decimals: 18 },
    { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", symbol: "LINK", name: "Chainlink", decimals: 18 },
  ],
  42161: [
    { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether", decimals: 6 },
    { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18 },
  ],
  10: [
    { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000042", symbol: "OP", name: "Optimism", decimals: 18 },
  ],
  8453: [
    { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ether", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  43114: [
    { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "AVAX", name: "Avalanche", decimals: 18 },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  56: [
    { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "BNB", name: "BNB", decimals: 18 },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether", decimals: 18 },
  ],
};

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

interface QuoteResult {
  dstAmount: string;
  gas: number;
  srcToken: { symbol: string; decimals: number };
  dstToken: { symbol: string; decimals: number };
}

interface SwapResult {
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice: string;
  };
  dstAmount: string;
}

export default function EvmSwap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { address, chainId, isConnected, isConnecting, connect, connectWalletConnect, disconnect, switchChain, walletProvider, error: walletError } = useEvmWallet();

  const [selectedChainId, setSelectedChainId] = useState(1);
  const [srcToken, setSrcToken] = useState<string>(NATIVE_TOKEN);
  const [dstToken, setDstToken] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [showSettings, setShowSettings] = useState(false);

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [swapTxHash, setSwapTxHash] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [srcTokenBalance, setSrcTokenBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  const tier = (user as any)?.subscriptionTier || "free";
  const isAdmin = (user as any)?.isAdmin === true;
  const hasPremium = isAdmin || tier === "premium" || tier === "pro" || tier === "premium_annual";

  const tokens = POPULAR_TOKENS[selectedChainId] || [];
  const srcTokenInfo = tokens.find(t => t.address === srcToken);
  const dstTokenInfo = tokens.find(t => t.address === dstToken);

  useEffect(() => {
    const chainTokens = POPULAR_TOKENS[selectedChainId];
    if (chainTokens && chainTokens.length > 0) {
      setSrcToken(chainTokens[0].address);
      setDstToken(chainTokens.length > 1 ? chainTokens[1].address : "");
    }
    setQuote(null);
    setQuoteError(null);
  }, [selectedChainId]);

  useEffect(() => {
    if (chainId && chainId !== selectedChainId && EVM_CHAINS[chainId]) {
      setSelectedChainId(chainId);
    }
  }, [chainId]);

  useEffect(() => {
    if (!isConnected || !address) {
      setNativeBalance(null);
      return;
    }
    const chainInfo = EVM_CHAINS[selectedChainId];
    if (!chainInfo) return;

    const fetchBalance = async () => {
      try {
        const resp = await fetch(chainInfo.rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
        });
        const json = await resp.json();
        if (!json.result) return;
        const balWei = BigInt(json.result);
        const whole = balWei / BigInt(10 ** 18);
        const frac = balWei % BigInt(10 ** 18);
        const fracStr = frac.toString().padStart(18, "0").slice(0, 6);
        const formatted = `${whole}.${fracStr}`.replace(/\.?0+$/, "") || "0";
        setNativeBalance(formatted);
      } catch {
        setNativeBalance(null);
      }
    };

    fetchBalance();
  }, [isConnected, address, selectedChainId]);

  useEffect(() => {
    if (!isConnected || !address || !srcToken) {
      setSrcTokenBalance(null);
      return;
    }
    if (srcToken === NATIVE_TOKEN) {
      setSrcTokenBalance(nativeBalance);
      return;
    }
    const chainInfo = EVM_CHAINS[selectedChainId];
    if (!chainInfo) return;
    const tokenInfo = tokens.find(t => t.address === srcToken);
    if (!tokenInfo) return;

    setIsFetchingBalance(true);
    const fetchErc20Balance = async () => {
      try {
        const balanceOfSig = "0x70a08231";
        const paddedAddr = address.slice(2).toLowerCase().padStart(64, "0");
        const callData = balanceOfSig + paddedAddr;

        const resp = await fetch(chainInfo.rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: 1, method: "eth_call",
            params: [{ to: srcToken, data: callData }, "latest"],
          }),
        });
        const json = await resp.json();
        if (!json.result || json.result === "0x") {
          setSrcTokenBalance("0");
          return;
        }
        const rawBal = BigInt(json.result);
        const decimals = tokenInfo.decimals;
        const divisor = BigInt(10 ** decimals);
        const whole = rawBal / divisor;
        const frac = rawBal % divisor;
        const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6);
        const formatted = `${whole}.${fracStr}`.replace(/\.?0+$/, "") || "0";
        setSrcTokenBalance(formatted);
      } catch {
        setSrcTokenBalance(null);
      } finally {
        setIsFetchingBalance(false);
      }
    };

    fetchErc20Balance();
  }, [isConnected, address, srcToken, selectedChainId, nativeBalance]);

  const walletLabel = walletProvider === "metamask" ? "MetaMask" : walletProvider === "walletconnect" ? "WalletConnect" : "Wallet";

  const fetchQuote = useCallback(async () => {
    if (!srcToken || !dstToken || !amount || parseFloat(amount) <= 0) return;
    const srcInfo = tokens.find(t => t.address === srcToken);
    if (!srcInfo) return;

    setIsQuoting(true);
    setQuoteError(null);
    try {
      const rawAmount = BigInt(Math.floor(parseFloat(amount) * (10 ** srcInfo.decimals))).toString();
      const res = await apiRequest("GET", `/api/evm/quote?chainId=${selectedChainId}&src=${srcToken}&dst=${dstToken}&amount=${rawAmount}`);
      const data = await res.json();
      if (data.message) {
        const msg = data.message.includes("429") ? "Rate limited — please wait a few seconds and try again" : data.message;
        setQuoteError(msg);
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
  }, [srcToken, dstToken, amount, selectedChainId, tokens]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0 && srcToken && dstToken && srcToken !== dstToken) {
        fetchQuote();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [amount, srcToken, dstToken, fetchQuote]);

  const handleFlipTokens = () => {
    const tmpSrc = srcToken;
    setSrcToken(dstToken);
    setDstToken(tmpSrc);
    setQuote(null);
  };

  const formatTokenAmount = (raw: string, decimals: number) => {
    const val = Number(BigInt(raw)) / (10 ** decimals);
    if (val < 0.0001) return val.toExponential(4);
    if (val < 1) return val.toFixed(6);
    if (val < 1000) return val.toFixed(4);
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const handleSwap = async () => {
    if (!address || !srcToken || !dstToken || !amount) return;
    const srcInfo = tokens.find(t => t.address === srcToken);
    if (!srcInfo) return;

    setIsSwapping(true);
    setSwapTxHash(null);
    try {
      const rawAmount = BigInt(Math.floor(parseFloat(amount) * (10 ** srcInfo.decimals))).toString();

      if (srcToken !== NATIVE_TOKEN) {
        setIsApproving(true);
        const allowanceRes = await apiRequest("GET",
          `/api/evm/allowance?chainId=${selectedChainId}&tokenAddress=${srcToken}&walletAddress=${address}`
        );
        const allowanceData = await allowanceRes.json();
        const currentAllowance = BigInt(allowanceData.allowance || "0");

        if (currentAllowance < BigInt(rawAmount)) {
          const approveRes = await apiRequest("GET",
            `/api/evm/approve?chainId=${selectedChainId}&tokenAddress=${srcToken}&amount=${rawAmount}`
          );
          const approveTxData = await approveRes.json();

          await sendEvmTransaction({
            from: address,
            to: approveTxData.to,
            data: approveTxData.data,
            value: approveTxData.value || "0x0",
          });

          toast({ title: "Approval confirmed", description: "Token spend approved. Executing swap..." });
          await new Promise(r => setTimeout(r, 2000));
        }
        setIsApproving(false);
      }

      const swapRes = await apiRequest("GET",
        `/api/evm/swap?chainId=${selectedChainId}&src=${srcToken}&dst=${dstToken}&amount=${rawAmount}&from=${address}&slippage=${slippage}`
      );
      const swapData: SwapResult = await swapRes.json();

      if (swapData.tx) {
        const txHash = await sendEvmTransaction({
          from: swapData.tx.from,
          to: swapData.tx.to,
          data: swapData.tx.data,
          value: swapData.tx.value,
        });

        setSwapTxHash(txHash);
        setShowConfirmDialog(false);
        toast({
          title: "Swap submitted!",
          description: `Transaction sent. Check your wallet for the updated balance.`,
        });
        setAmount("");
        setQuote(null);
      }
    } catch (err: any) {
      const rawMsg = err.message || "Swap failed";
      if (rawMsg.includes("User denied") || rawMsg.includes("rejected")) {
        toast({ title: "Transaction rejected", description: "You cancelled the transaction in your wallet.", variant: "destructive" });
      } else if (rawMsg.includes("429")) {
        toast({ title: "Rate limited", description: "Too many requests — please wait a few seconds and try again.", variant: "destructive" });
      } else if (rawMsg.includes("Bad Request") && rawMsg.includes("fromTokenBalance")) {
        toast({ title: "Insufficient balance", description: `You don't have enough ${srcTokenInfo?.symbol || "tokens"} for this swap. Try a smaller amount.`, variant: "destructive" });
      } else if (rawMsg.includes("insufficient funds") || rawMsg.includes("insufficient balance")) {
        toast({ title: "Insufficient balance", description: `You don't have enough ${srcTokenInfo?.symbol || "tokens"} for this swap. Try a smaller amount.`, variant: "destructive" });
      } else {
        toast({ title: "Swap failed", description: rawMsg, variant: "destructive" });
      }
    } finally {
      setIsSwapping(false);
      setIsApproving(false);
    }
  };

  if (!hasPremium) {
    return (
      <div className="space-y-6">
        <SeoHead title="EVM Swap | CryptoOwnBank" description="Swap any ERC-20 token across Ethereum, Polygon, Arbitrum, and more — powered by 1inch." />
        <UpgradePrompt feature="EVM Swap lets you trade thousands of tokens across Ethereum, Polygon, Arbitrum, Base, and more — best prices aggregated from every DEX, signed securely with your Ledger." />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="evm-swap-page">
      <SeoHead title="EVM Swap | CryptoOwnBank" description="Swap any ERC-20 token across Ethereum, Polygon, Arbitrum, and more." />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">EVM Swap</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Swap thousands of tokens across 7 chains — best prices from every DEX, secured by your wallet
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && address ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="gap-1.5 py-1 cursor-help"
                title={`${walletLabel}: ${address}`}
                data-testid="badge-wallet-address"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {walletProvider === "metamask" ? <Wallet className="h-3 w-3" /> : <SiWalletconnect className="h-3 w-3" />}
                <span>{walletLabel} · {shortenAddress(address)}</span>
              </Badge>
              <Badge variant="outline" className="gap-1 py-1" data-testid="badge-chain">
                {EVM_CHAINS[chainId || 1]?.shortName || "Unknown"}
              </Badge>
              {walletProvider === "metamask" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { disconnect(); setTimeout(() => connectWalletConnect(), 100); }}
                  disabled={isConnecting}
                  data-testid="button-switch-walletconnect"
                >
                  <SiWalletconnect className="h-3 w-3 mr-1" />
                  Switch to WalletConnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { disconnect(); setTimeout(() => connect(), 100); }}
                  disabled={isConnecting}
                  data-testid="button-switch-metamask"
                >
                  <Wallet className="h-3 w-3 mr-1" />
                  Switch to MetaMask
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={disconnect} data-testid="button-disconnect-wallet">
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={connect} disabled={isConnecting} data-testid="button-connect-metamask">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                MetaMask
              </Button>
              <Button onClick={connectWalletConnect} disabled={isConnecting} variant="outline" data-testid="button-connect-walletconnect">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SiWalletconnect className="h-4 w-4 mr-2" />}
                WalletConnect
              </Button>
            </div>
          )}
        </div>
      </div>

      {walletError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2" data-testid="alert-wallet-error">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{walletError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Swap Tokens</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowSettings(!showSettings)}
                    data-testid="button-settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Network</label>
                <Select
                  value={selectedChainId.toString()}
                  onValueChange={(v) => {
                    const newChain = parseInt(v);
                    setSelectedChainId(newChain);
                    if (isConnected && chainId !== newChain) {
                      switchChain(newChain);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-chain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVM_CHAINS).map(([id, chain]) => (
                      <SelectItem key={id} value={id} data-testid={`select-chain-${id}`}>
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showSettings && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <label className="text-xs font-medium">Slippage Tolerance</label>
                  <div className="flex gap-2">
                    {["0.5", "1", "2", "3"].map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={slippage === s ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setSlippage(s)}
                        data-testid={`button-slippage-${s}`}
                      >
                        {s}%
                      </Button>
                    ))}
                    <Input
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      className="h-7 w-16 text-xs"
                      placeholder="Custom"
                      data-testid="input-slippage-custom"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">You Pay</label>
                  <div className="flex items-center gap-2">
                    {isConnected && srcToken !== NATIVE_TOKEN && nativeBalance !== null && (
                      <span className="text-xs text-muted-foreground" data-testid="text-native-balance">
                        {EVM_CHAINS[selectedChainId]?.nativeCurrency.symbol}: {nativeBalance} (gas)
                      </span>
                    )}
                    {isConnected && srcTokenBalance !== null && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                          const bal = parseFloat(srcTokenBalance);
                          if (bal <= 0) return;
                          const maxAmount = srcToken === NATIVE_TOKEN ? Math.max(0, bal - 0.005) : bal;
                          if (maxAmount > 0) setAmount(maxAmount.toFixed(6));
                        }}
                        data-testid="button-max-balance"
                      >
                        Balance: <span className="font-medium text-foreground">{srcTokenBalance} {srcTokenInfo?.symbol}</span> <span className="text-primary ml-1">MAX</span>
                      </button>
                    )}
                    {isConnected && srcTokenBalance === null && isFetchingBalance && (
                      <span className="text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" />Loading balance...
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={srcToken} onValueChange={(v) => { setSrcToken(v); setQuote(null); }}>
                    <SelectTrigger className="w-[160px]" data-testid="select-src-token">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.filter(t => t.address !== dstToken).map(t => (
                        <SelectItem key={t.address} value={t.address} data-testid={`select-src-${t.symbol}`}>
                          {t.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1"
                    data-testid="input-amount"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-full border"
                  onClick={handleFlipTokens}
                  data-testid="button-flip-tokens"
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">You Receive</label>
                <div className="flex gap-2">
                  <Select value={dstToken} onValueChange={(v) => { setDstToken(v); setQuote(null); }}>
                    <SelectTrigger className="w-[160px]" data-testid="select-dst-token">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.filter(t => t.address !== srcToken).map(t => (
                        <SelectItem key={t.address} value={t.address} data-testid={`select-dst-${t.symbol}`}>
                          {t.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 bg-muted/50 rounded-md px-3 flex items-center" data-testid="text-receive-amount">
                    {isQuoting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : quote && dstTokenInfo ? (
                      <span className="text-lg font-medium">
                        {formatTokenAmount(quote.dstAmount, dstTokenInfo.decimals)}
                      </span>
                    ) : quoteError ? (
                      <span className="text-sm text-destructive">{quoteError}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Enter amount to see quote</span>
                    )}
                  </div>
                </div>
              </div>

              {quote && srcTokenInfo && dstTokenInfo && amount && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-xs" data-testid="quote-details">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>
                      1 {srcTokenInfo.symbol} ≈ {(Number(BigInt(quote.dstAmount)) / (10 ** dstTokenInfo.decimals) / parseFloat(amount)).toFixed(6)} {dstTokenInfo.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Gas</span>
                    <span>{quote.gas?.toLocaleString() || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slippage</span>
                    <span>{slippage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span>1%</span>
                  </div>
                </div>
              )}

              {!isConnected ? (
                <Button className="w-full" size="lg" onClick={connect} disabled={isConnecting} data-testid="button-connect-swap">
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                  Connect MetaMask to Swap
                </Button>
              ) : chainId !== selectedChainId ? (
                <Button className="w-full" size="lg" onClick={() => switchChain(selectedChainId)} data-testid="button-switch-chain">
                  Switch to {EVM_CHAINS[selectedChainId]?.name}
                </Button>
              ) : !quote || !amount || parseFloat(amount) <= 0 ? (
                <Button className="w-full" size="lg" disabled data-testid="button-swap-disabled">
                  {isQuoting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Getting quote...
                    </>
                  ) : (
                    "Enter amount to swap"
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full bg-[#00A4E4] hover:bg-[#0093cc] text-white"
                  size="lg"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isSwapping}
                  data-testid="button-review-swap"
                >
                  {isSwapping ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isApproving ? "Approving token..." : "Swapping..."}
                    </>
                  ) : (
                    <>
                      <ArrowDownUp className="h-4 w-4 mr-2" />
                      Review Swap
                    </>
                  )}
                </Button>
              )}

              {swapTxHash && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2" data-testid="alert-swap-success">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Swap submitted successfully</p>
                    <a
                      href={getExplorerTxUrl(selectedChainId, swapTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline flex items-center gap-1"
                      data-testid="link-tx-explorer"
                    >
                      View on {EVM_CHAINS[selectedChainId]?.name} Explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {!isConnected && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Before You Start
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3" data-testid="card-prerequisites">
                <p className="font-medium text-foreground">Connect your wallet to use EVM Swap:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li><strong>MetaMask</strong> — Use the browser extension (<a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-[#00A4E4] underline font-medium">install here</a>)</li>
                  <li><strong>WalletConnect</strong> — Scan QR code with MetaMask Mobile, Trust Wallet, Rainbow, Coinbase Wallet, or 50+ other wallets</li>
                  <li>Have ETH or tokens on the chain you want to trade</li>
                  <li>Pick your tokens, get a quote, and approve the swap</li>
                </ol>
                <div className="pt-1 border-t border-amber-200 dark:border-amber-800 space-y-1">
                  <p><span className="font-medium text-foreground">Ledger users:</span> Connect your Ledger to MetaMask first, then connect MetaMask here. Your Ledger signs every transaction.</p>
                  <p><span className="font-medium text-foreground">Gas fees:</span> You need a small amount of the native token (ETH, POL, BNB, etc.) on the chain you're trading to pay for gas.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#00A4E4]" />
                Powered by 1inch
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>1inch aggregates prices from Uniswap, SushiSwap, Curve, Balancer, and dozens more DEXs to find the best swap rate.</p>
              <p>Your swap is routed through multiple pools to minimize slippage and maximize the tokens you receive.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Self-Custody Swap
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>Every swap is signed directly from your wallet — MetaMask, Ledger, or any EVM-compatible wallet.</p>
              <p>CryptoOwnBank never touches your tokens. The swap happens on-chain between your wallet and the DEX smart contracts.</p>
              <p className="font-medium text-foreground">Your keys → Your swap → Your tokens.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Supported Networks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(EVM_CHAINS).map(chain => (
                  <Badge key={chain.name} variant="outline" className="text-[10px]" data-testid={`badge-chain-${chain.shortName}`}>
                    {chain.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Swap</DialogTitle>
          </DialogHeader>
          {quote && srcTokenInfo && dstTokenInfo && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">You Pay</span>
                  <span className="text-lg font-semibold" data-testid="text-confirm-pay">
                    {amount} {srcTokenInfo.symbol}
                  </span>
                </div>
                <div className="flex justify-center">
                  <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">You Receive</span>
                  <span className="text-lg font-semibold text-green-600" data-testid="text-confirm-receive">
                    {formatTokenAmount(quote.dstAmount, dstTokenInfo.decimals)} {dstTokenInfo.symbol}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Network</span>
                  <span className="text-foreground">{EVM_CHAINS[selectedChainId]?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slippage Tolerance</span>
                  <span className="text-foreground">{slippage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Gas</span>
                  <span className="text-foreground">{quote.gas?.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  You will be asked to sign {srcToken !== NATIVE_TOKEN ? "two transactions (approval + swap)" : "one transaction"} in your wallet. Review the details carefully before confirming.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} data-testid="button-cancel-swap">
              Cancel
            </Button>
            <Button
              className="bg-[#00A4E4] hover:bg-[#0093cc] text-white"
              onClick={() => { setShowConfirmDialog(false); handleSwap(); }}
              disabled={isSwapping}
              data-testid="button-confirm-swap"
            >
              {isSwapping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
