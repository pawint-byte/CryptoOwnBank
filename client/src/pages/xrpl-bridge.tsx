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
  GitCompareArrows,
  ChevronRight,
  Globe,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEvmWallet, EVM_CHAINS, sendEvmTransaction, getExplorerTxUrl, shortenAddress } from "@/lib/evm-wallet";
import { signPayment } from "@/lib/xumm-connector";
import { SiWalletconnect } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";

interface SquidChain {
  chainId: string;
  chainName: string;
  networkName: string;
  type: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  chainIconURI: string;
}

interface SquidToken {
  address: string;
  chainId: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  coingeckoId?: string;
}

interface RouteEstimate {
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  exchangeRate: string;
  estimatedRouteDuration: number;
  feeCosts: Array<{ name: string; amount: string; amountUSD: string; token: { symbol: string } }>;
  gasCosts: Array<{ amount: string; amountUSD: string; token: { symbol: string } }>;
}

const AXELAR_XRPL_GATEWAY = "rfmS3zqrQrka8wVyhXifEeyTwe8AMz2Yhw";

const SUPPORTED_SOURCE_CHAINS = [
  { chainId: "1", name: "Ethereum", icon: "🔷" },
  { chainId: "137", name: "Polygon", icon: "🟣" },
  { chainId: "42161", name: "Arbitrum", icon: "🔵" },
  { chainId: "10", name: "Optimism", icon: "🔴" },
  { chainId: "8453", name: "Base", icon: "🔵" },
  { chainId: "43114", name: "Avalanche", icon: "🔺" },
  { chainId: "56", name: "BNB Chain", icon: "🟡" },
];

const DEST_EVM_CHAINS = [
  { chainId: "1", name: "Ethereum", icon: "🔷", axelarName: "ethereum" },
  { chainId: "137", name: "Polygon", icon: "🟣", axelarName: "polygon" },
  { chainId: "42161", name: "Arbitrum", icon: "🔵", axelarName: "arbitrum" },
  { chainId: "10", name: "Optimism", icon: "🔴", axelarName: "optimism" },
  { chainId: "8453", name: "Base", icon: "🔵", axelarName: "base" },
  { chainId: "43114", name: "Avalanche", icon: "🔺", axelarName: "avalanche" },
  { chainId: "56", name: "BNB Chain", icon: "🟡", axelarName: "binance" },
];

export default function XrplBridge() {
  const { user } = useAuth();
  const { toast } = useToast();
  const evmWallet = useEvmWallet();

  const isAdmin = (user as any)?.isAdmin === true;
  const hasPremium = isAdmin || user?.subscriptionTier === "premium" || user?.subscriptionTier === "pro" || user?.subscriptionTier === "premium_annual";

  const [sourceChain, setSourceChain] = useState("1");
  const [sourceToken, setSourceToken] = useState("");
  const [amount, setAmount] = useState("");
  const [xrplAddress, setXrplAddress] = useState("");
  const [slippage, setSlippage] = useState("3");
  const [showSettings, setShowSettings] = useState(false);
  const [direction, setDirection] = useState<"evm-to-xrpl" | "xrpl-to-evm">("evm-to-xrpl");

  const [quote, setQuote] = useState<any>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<{ status: string; txHash?: string } | null>(null);

  const [reverseDestChain, setReverseDestChain] = useState("1");
  const [reverseEvmAddress, setReverseEvmAddress] = useState("");
  const [reverseAmount, setReverseAmount] = useState("");
  const [reverseBridgeStatus, setReverseBridgeStatus] = useState<{ status: string; txHash?: string } | null>(null);
  const [isReverseBridging, setIsReverseBridging] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);

  const { data: bridgeConfig } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/xrpl-bridge/status-check"],
  });

  const isConfigured = bridgeConfig?.configured ?? false;

  const sourceChainName = SUPPORTED_SOURCE_CHAINS.find(c => c.chainId === sourceChain)?.name || "Ethereum";

  const commonTokens: Record<string, SquidToken[]> = {
    "1": [
      { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", chainId: "1", symbol: "ETH", name: "Ether", decimals: 18, logoURI: "" },
      { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chainId: "1", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
      { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", chainId: "1", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: "" },
    ],
    "137": [
      { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", chainId: "137", symbol: "POL", name: "POL", decimals: 18, logoURI: "" },
      { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", chainId: "137", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
    ],
    "42161": [
      { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", chainId: "42161", symbol: "ETH", name: "Ether", decimals: 18, logoURI: "" },
      { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", chainId: "42161", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
    ],
    "10": [
      { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", chainId: "10", symbol: "ETH", name: "Ether", decimals: 18, logoURI: "" },
      { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", chainId: "10", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
    ],
    "8453": [
      { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", chainId: "8453", symbol: "ETH", name: "Ether", decimals: 18, logoURI: "" },
      { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", chainId: "8453", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
    ],
    "43114": [
      { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", chainId: "43114", symbol: "AVAX", name: "Avalanche", decimals: 18, logoURI: "" },
      { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", chainId: "43114", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
    ],
    "56": [
      { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", chainId: "56", symbol: "BNB", name: "BNB", decimals: 18, logoURI: "" },
      { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", chainId: "56", symbol: "USDC", name: "USD Coin", decimals: 18, logoURI: "" },
    ],
  };

  const availableTokens = commonTokens[sourceChain] || commonTokens["1"];

  useEffect(() => {
    if (availableTokens.length > 0 && !sourceToken) {
      setSourceToken(availableTokens[0].address);
    }
  }, [sourceChain]);

  const selectedToken = availableTokens.find(t => t.address === sourceToken);

  const getQuote = useCallback(async () => {
    if (!amount || !xrplAddress || !evmWallet.address || !sourceToken) return;

    setIsQuoting(true);
    setQuote(null);
    try {
      const tokenDecimals = selectedToken?.decimals || 18;
      const [whole, frac = ""] = amount.split(".");
      const paddedFrac = frac.padEnd(tokenDecimals, "0").slice(0, tokenDecimals);
      const rawAmount = BigInt(whole + paddedFrac).toString();

      const res = await apiRequest("POST", "/api/xrpl-bridge/route", {
        fromChain: sourceChain,
        toChain: "xrpl",
        fromToken: sourceToken,
        toToken: "XRP",
        fromAmount: rawAmount,
        fromAddress: evmWallet.address,
        toAddress: xrplAddress,
        slippageConfig: { autoMode: 1 },
      });
      const data = await res.json();
      setQuote(data);
    } catch (err: any) {
      toast({
        title: "Quote Failed",
        description: err.message || "Could not get bridge quote",
        variant: "destructive",
      });
    } finally {
      setIsQuoting(false);
    }
  }, [amount, xrplAddress, evmWallet.address, sourceToken, sourceChain, slippage]);

  const executeBridge = async () => {
    if (!quote?.route?.transactionRequest) {
      toast({ title: "No Route", description: "Please get a quote first", variant: "destructive" });
      return;
    }

    setIsSwapping(true);
    setShowConfirm(false);
    setBridgeStatus({ status: "signing" });

    try {
      const requiredChainId = parseInt(sourceChain);
      if (evmWallet.chainId !== requiredChainId) {
        try {
          await evmWallet.switchChain(requiredChainId);
        } catch {
          toast({ title: "Chain Switch Required", description: `Please switch your wallet to ${sourceChainName}`, variant: "destructive" });
          setBridgeStatus(null);
          setIsSwapping(false);
          return;
        }
      }

      const txRequest = quote.route.transactionRequest;
      const txHash = await sendEvmTransaction({
        to: txRequest.target || txRequest.targetAddress,
        data: txRequest.data,
        value: txRequest.value || "0x0",
        gasLimit: txRequest.gasLimit,
      });

      setBridgeStatus({ status: "bridging", txHash });

      toast({
        title: "Transaction Submitted",
        description: `Bridge initiated. Tracking cross-chain delivery...`,
      });

      let attempts = 0;
      const maxAttempts = 60;

      const checkStatus = async () => {
        try {
          const statusRes = await apiRequest("GET",
            `/api/xrpl-bridge/tx-status?transactionId=${txHash}&fromChainId=${sourceChain}&toChainId=xrpl`
          );
          const statusData = await statusRes.json();

          if (statusData.squidTransactionStatus === "success" || statusData.status === "success") {
            setBridgeStatus({ status: "completed", txHash });
            toast({ title: "Bridge Complete!", description: "XRP has been delivered to your XRPL address" });
            return;
          }
          if (statusData.squidTransactionStatus === "failed" || statusData.status === "failed") {
            setBridgeStatus({ status: "failed", txHash });
            toast({ title: "Bridge Failed", description: "The cross-chain transfer failed", variant: "destructive" });
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 15000);
          } else {
            setBridgeStatus({ status: "timeout", txHash });
          }
        } catch {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 15000);
          }
        }
      };

      setTimeout(checkStatus, 20000);

    } catch (err: any) {
      toast({
        title: "Bridge Failed",
        description: err.message || "Transaction was rejected or failed",
        variant: "destructive",
      });
      setBridgeStatus(null);
    } finally {
      setIsSwapping(false);
    }
  };

  useEffect(() => {
    if (evmWallet.address && !reverseEvmAddress) {
      setReverseEvmAddress(evmWallet.address);
    }
  }, [evmWallet.address]);

  const reverseDestChainInfo = DEST_EVM_CHAINS.find(c => c.chainId === reverseDestChain);

  const executeReverseBridge = async () => {
    if (!reverseAmount || parseFloat(reverseAmount) <= 0 || !reverseEvmAddress) return;

    setIsReverseBridging(true);
    setShowReverseConfirm(false);
    setReverseBridgeStatus({ status: "signing" });

    try {
      const xrpDrops = Math.floor(parseFloat(reverseAmount) * 1_000_000).toString();

      const destChainName = reverseDestChainInfo?.axelarName || "ethereum";
      const memoData = JSON.stringify({
        destination_chain: destChainName,
        destination_address: reverseEvmAddress,
        payload: null,
        type: 2,
      });

      const result = await signPayment(
        AXELAR_XRPL_GATEWAY,
        xrpDrops,
        {
          memos: [
            { MemoType: "text/plain", MemoData: memoData },
          ],
        }
      );

      if (result.success && result.txHash) {
        setReverseBridgeStatus({ status: "bridging", txHash: result.txHash });
        toast({
          title: "Bridge Transaction Submitted",
          description: "XRP sent to Axelar gateway. Cross-chain delivery in progress...",
        });

        let attempts = 0;
        const maxAttempts = 60;
        const checkStatus = async () => {
          try {
            const statusRes = await apiRequest("GET",
              `/api/xrpl-bridge/tx-status?transactionId=${result.txHash}&fromChainId=xrpl&toChainId=${reverseDestChain}`
            );
            const statusData = await statusRes.json();

            if (statusData.squidTransactionStatus === "success" || statusData.status === "success") {
              setReverseBridgeStatus({ status: "completed", txHash: result.txHash });
              toast({ title: "Bridge Complete!", description: `Tokens delivered to your ${reverseDestChainInfo?.name || "EVM"} wallet` });
              return;
            }
            if (statusData.squidTransactionStatus === "failed" || statusData.status === "failed") {
              setReverseBridgeStatus({ status: "failed", txHash: result.txHash });
              toast({ title: "Bridge Failed", description: "The cross-chain transfer failed", variant: "destructive" });
              return;
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkStatus, 15000);
            } else {
              setReverseBridgeStatus({ status: "timeout", txHash: result.txHash });
            }
          } catch {
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkStatus, 15000);
            }
          }
        };

        setTimeout(checkStatus, 30000);
      } else {
        setReverseBridgeStatus(null);
        toast({
          title: "Bridge Cancelled",
          description: result.error || "Transaction was not signed",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Bridge Failed",
        description: err.message || "Failed to initiate bridge",
        variant: "destructive",
      });
      setReverseBridgeStatus(null);
    } finally {
      setIsReverseBridging(false);
    }
  };

  const estimate = quote?.route?.estimate;
  const totalFeesUSD = estimate?.feeCosts?.reduce((sum: number, f: any) => sum + parseFloat(f.amountUSD || "0"), 0) || 0;
  const totalGasUSD = estimate?.gasCosts?.reduce((sum: number, g: any) => sum + parseFloat(g.amountUSD || "0"), 0) || 0;
  const estimatedDuration = estimate?.estimatedRouteDuration || 0;

  if (!user) return null;

  if (!hasPremium) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <SeoHead title="XRPL Bridge | CryptoOwnBank" description="Bridge assets between EVM chains and XRP Ledger" />
        <UpgradePrompt
          feature="XRPL Bridge"
          description="Bridge tokens between Ethereum/EVM chains and the XRP Ledger via Axelar. Upgrade to Premium to unlock this feature."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <SeoHead
        title="XRPL Bridge | CryptoOwnBank"
        description="Bridge assets between EVM chains and XRP Ledger powered by Axelar via Squid Router"
      />

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <GitCompareArrows className="h-6 w-6 text-blue-500" /> XRPL Bridge
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bridge tokens between EVM chains & XRP Ledger — powered by Axelar
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-bridge-settings"
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
                      data-testid={`button-bridge-slippage-${s}`}
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
                    data-testid="input-bridge-slippage-custom"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex rounded-lg border overflow-hidden" data-testid="bridge-direction-toggle">
          <button
            className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${direction === "evm-to-xrpl" ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted/60 text-muted-foreground"}`}
            onClick={() => { setDirection("evm-to-xrpl"); setReverseBridgeStatus(null); }}
            data-testid="button-direction-evm-to-xrpl"
          >
            <ArrowRight className="h-4 w-4" /> EVM → XRPL
          </button>
          <button
            className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${direction === "xrpl-to-evm" ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted/60 text-muted-foreground"}`}
            onClick={() => { setDirection("xrpl-to-evm"); setBridgeStatus(null); }}
            data-testid="button-direction-xrpl-to-evm"
          >
            <ArrowRight className="h-4 w-4" /> XRPL → EVM
          </button>
        </div>

        {!isConfigured && direction === "evm-to-xrpl" && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-600 dark:text-amber-400">Squid Integrator ID Pending</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The XRPL Bridge is fully built and ready. We're awaiting our Squid Router integrator ID
                    (expected within 24 hours). Once configured, this bridge will be live. In the meantime,
                    you can use{" "}
                    <a
                      href="https://app.squidrouter.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                      data-testid="link-squid-direct"
                    >
                      app.squidrouter.com <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    directly to bridge ETH → XRP.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {direction === "evm-to-xrpl" ? (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Shield className="h-3 w-3" /> Axelar Secured
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" /> Squid Router
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Non-Custodial
              </Badge>
            </div>

            {!evmWallet.isConnected ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-lg">Connect Your EVM Wallet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect MetaMask or WalletConnect to bridge tokens to XRPL
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => evmWallet.connect()}
                    disabled={evmWallet.isConnecting}
                    className="gap-2"
                    data-testid="button-connect-metamask"
                  >
                    <Wallet className="h-4 w-4" />
                    {evmWallet.isConnecting ? "Connecting..." : "MetaMask"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => evmWallet.connectWalletConnect()}
                    disabled={evmWallet.isConnecting}
                    className="gap-2"
                    data-testid="button-connect-walletconnect"
                  >
                    <SiWalletconnect className="h-4 w-4" />
                    WalletConnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                      Connected
                    </Badge>
                    <span className="text-sm font-mono" data-testid="text-wallet-address">
                      {shortenAddress(evmWallet.address || "")}
                    </span>
                    {evmWallet.chainId && EVM_CHAINS[evmWallet.chainId] && (
                      <Badge variant="outline" className="text-xs">
                        {EVM_CHAINS[evmWallet.chainId].shortName}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => evmWallet.disconnect()}
                    data-testid="button-disconnect-wallet"
                  >
                    Disconnect
                  </Button>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">FROM (EVM)</span>
                    <Badge variant="outline" className="text-xs">Source</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Chain</label>
                      <Select value={sourceChain} onValueChange={(v) => { setSourceChain(v); setSourceToken(""); setQuote(null); }}>
                        <SelectTrigger data-testid="select-source-chain">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_SOURCE_CHAINS.map(c => (
                            <SelectItem key={c.chainId} value={c.chainId}>
                              {c.icon} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Token</label>
                      <Select value={sourceToken} onValueChange={(v) => { setSourceToken(v); setQuote(null); }}>
                        <SelectTrigger data-testid="select-source-token">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTokens.map(t => (
                            <SelectItem key={t.address} value={t.address}>
                              {t.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                    <Input
                      type="number"
                      placeholder={`0.0 ${selectedToken?.symbol || ""}`}
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setQuote(null); }}
                      min="0"
                      step="any"
                      data-testid="input-bridge-amount"
                    />
                  </div>
                </div>

                <div className="flex justify-center -my-1">
                  <div className="bg-primary/10 rounded-full p-2">
                    <ArrowDownUp className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">TO (XRP Ledger)</span>
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                      Destination
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">XRPL Address (r...)</label>
                    <Input
                      placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={xrplAddress}
                      onChange={e => setXrplAddress(e.target.value)}
                      className="font-mono text-sm"
                      data-testid="input-xrpl-address"
                    />
                    {xrplAddress && !xrplAddress.startsWith("r") && (
                      <p className="text-xs text-red-500 mt-1">XRPL addresses start with 'r'</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    <span>You will receive native XRP on the XRP Ledger</span>
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  size="lg"
                  disabled={!amount || !xrplAddress || !xrplAddress.startsWith("r") || isQuoting || !isConfigured || !sourceToken}
                  onClick={getQuote}
                  data-testid="button-get-quote"
                >
                  {isQuoting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Getting Bridge Quote...</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Get Bridge Quote</>
                  )}
                </Button>

                {quote?.route && (
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-green-600 dark:text-green-400">Route Found</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={getQuote}
                          className="gap-1"
                          data-testid="button-refresh-quote"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Refresh
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">You Send</p>
                          <p className="font-semibold" data-testid="text-send-amount">
                            {amount} {selectedToken?.symbol}
                          </p>
                          <p className="text-xs text-muted-foreground">on {sourceChainName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">You Receive</p>
                          <p className="font-semibold text-green-600" data-testid="text-receive-amount">
                            ~{estimate?.toAmount ? (parseFloat(estimate.toAmount) / 1e6).toFixed(2) : "..."} XRP
                          </p>
                          <p className="text-xs text-muted-foreground">on XRP Ledger</p>
                        </div>
                      </div>

                      <div className="border-t pt-3 space-y-1.5">
                        {estimatedDuration > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> Est. Time
                            </span>
                            <span>{Math.ceil(estimatedDuration / 60)} min</span>
                          </div>
                        )}
                        {(totalFeesUSD + totalGasUSD) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" /> Total Fees
                            </span>
                            <span>${(totalFeesUSD + totalGasUSD).toFixed(2)}</span>
                          </div>
                        )}
                        {estimate?.exchangeRate && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Exchange Rate</span>
                            <span>1 {selectedToken?.symbol} = {parseFloat(estimate.exchangeRate).toFixed(4)} XRP</span>
                          </div>
                        )}
                      </div>

                      {quote.route.estimate?.actions && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium mb-2">Bridge Route</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {quote.route.estimate.actions.map((action: any, i: number) => (
                              <div key={i} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                <Badge variant="outline" className="text-xs">
                                  {action.type || action.provider || `Step ${i + 1}`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full gap-2"
                        size="lg"
                        onClick={() => setShowConfirm(true)}
                        disabled={isSwapping}
                        data-testid="button-initiate-bridge"
                      >
                        <GitCompareArrows className="h-4 w-4" />
                        Bridge to XRPL
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {bridgeStatus && (
                  <Card className={`border-${bridgeStatus.status === "completed" ? "green" : bridgeStatus.status === "failed" ? "red" : "blue"}-500/30`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        {bridgeStatus.status === "signing" && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                        {bridgeStatus.status === "bridging" && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
                        {bridgeStatus.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {bridgeStatus.status === "failed" && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        {bridgeStatus.status === "timeout" && <Clock className="h-5 w-5 text-amber-500" />}
                        <div>
                          <p className="font-medium">
                            {bridgeStatus.status === "signing" && "Signing Transaction..."}
                            {bridgeStatus.status === "bridging" && "Bridging in Progress..."}
                            {bridgeStatus.status === "completed" && "Bridge Complete!"}
                            {bridgeStatus.status === "failed" && "Bridge Failed"}
                            {bridgeStatus.status === "timeout" && "Status Check Timeout"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {bridgeStatus.status === "bridging" && "Cross-chain transfer in progress. This may take a few minutes."}
                            {bridgeStatus.status === "completed" && "XRP has been delivered to your XRPL address."}
                            {bridgeStatus.status === "failed" && "The cross-chain transfer encountered an error."}
                            {bridgeStatus.status === "timeout" && "Status tracking timed out. Check the explorer for your transaction."}
                          </p>
                        </div>
                      </div>
                      {bridgeStatus.txHash && (
                        <div className="mt-3">
                          <a
                            href={getExplorerTxUrl(parseInt(sourceChain), bridgeStatus.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                            data-testid="link-explorer-tx"
                          >
                            View on Explorer <ExternalLink className="h-3 w-3" />
                          </a>
                          <a
                            href={`https://axelarscan.io/gmp/${bridgeStatus.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1 mt-1"
                            data-testid="link-axelar-scan"
                          >
                            Track on Axelarscan <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Shield className="h-3 w-3" /> Axelar Secured
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" /> Xaman Signing
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Non-Custodial
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">FROM (XRP Ledger)</span>
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">Source</Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">XRP Amount</label>
                  <Input
                    type="number"
                    placeholder="0.0 XRP"
                    value={reverseAmount}
                    onChange={e => setReverseAmount(e.target.value)}
                    min="0"
                    step="any"
                    data-testid="input-reverse-bridge-amount"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span>Signed via Xaman — your keys never leave your device</span>
                </div>
              </div>

              <div className="flex justify-center -my-1">
                <div className="bg-primary/10 rounded-full p-2">
                  <ArrowDownUp className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">TO (EVM Chain)</span>
                  <Badge variant="outline" className="text-xs">Destination</Badge>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Destination Chain</label>
                  <Select value={reverseDestChain} onValueChange={setReverseDestChain}>
                    <SelectTrigger data-testid="select-reverse-dest-chain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEST_EVM_CHAINS.map(c => (
                        <SelectItem key={c.chainId} value={c.chainId}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">EVM Destination Address (0x...)</label>
                  <Input
                    placeholder="0x..."
                    value={reverseEvmAddress}
                    onChange={e => setReverseEvmAddress(e.target.value)}
                    className="font-mono text-sm"
                    data-testid="input-reverse-evm-address"
                  />
                  {reverseEvmAddress && !reverseEvmAddress.startsWith("0x") && (
                    <p className="text-xs text-red-500 mt-1">EVM addresses start with '0x'</p>
                  )}
                  {evmWallet.address && reverseEvmAddress !== evmWallet.address && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline mt-1"
                      onClick={() => setReverseEvmAddress(evmWallet.address || "")}
                      data-testid="button-use-connected-address"
                    >
                      Use connected wallet: {shortenAddress(evmWallet.address)}
                    </button>
                  )}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                disabled={!reverseAmount || parseFloat(reverseAmount) <= 0 || !reverseEvmAddress || !reverseEvmAddress.startsWith("0x") || isReverseBridging}
                onClick={() => setShowReverseConfirm(true)}
                data-testid="button-reverse-bridge"
              >
                {isReverseBridging ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Bridging...</>
                ) : (
                  <><Zap className="h-4 w-4" /> Bridge XRP to {reverseDestChainInfo?.name || "EVM"}</>
                )}
              </Button>

              {reverseBridgeStatus && (
                <Card className={`border-${reverseBridgeStatus.status === "completed" ? "green" : reverseBridgeStatus.status === "failed" ? "red" : "blue"}-500/30`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      {reverseBridgeStatus.status === "signing" && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                      {reverseBridgeStatus.status === "bridging" && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
                      {reverseBridgeStatus.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {reverseBridgeStatus.status === "failed" && <AlertTriangle className="h-5 w-5 text-red-500" />}
                      {reverseBridgeStatus.status === "timeout" && <Clock className="h-5 w-5 text-amber-500" />}
                      <div>
                        <p className="font-medium">
                          {reverseBridgeStatus.status === "signing" && "Open Xaman to sign..."}
                          {reverseBridgeStatus.status === "bridging" && "Bridging in Progress..."}
                          {reverseBridgeStatus.status === "completed" && "Bridge Complete!"}
                          {reverseBridgeStatus.status === "failed" && "Bridge Failed"}
                          {reverseBridgeStatus.status === "timeout" && "Status Check Timeout"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reverseBridgeStatus.status === "signing" && "Scan the QR code or approve in Xaman to sign the transaction."}
                          {reverseBridgeStatus.status === "bridging" && "XRP sent to Axelar gateway. Cross-chain delivery may take 5-15 minutes."}
                          {reverseBridgeStatus.status === "completed" && `Tokens delivered to your ${reverseDestChainInfo?.name || "EVM"} wallet.`}
                          {reverseBridgeStatus.status === "failed" && "The cross-chain transfer encountered an error."}
                          {reverseBridgeStatus.status === "timeout" && "Status tracking timed out. Check Axelarscan for your transaction."}
                        </p>
                      </div>
                    </div>
                    {reverseBridgeStatus.txHash && (
                      <div className="mt-3">
                        <a
                          href={`https://livenet.xrpl.org/transactions/${reverseBridgeStatus.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                          data-testid="link-xrpl-explorer-tx"
                        >
                          View on XRPL Explorer <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href={`https://axelarscan.io/gmp/${reverseBridgeStatus.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline flex items-center gap-1 mt-1"
                          data-testid="link-reverse-axelar-scan"
                        >
                          Track on Axelarscan <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        <Card className="bg-muted/30" data-testid="card-bridge-info">
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" /> {direction === "evm-to-xrpl" ? "How EVM → XRPL Bridge Works" : "How XRPL → EVM Bridge Works"}
            </h3>
            {direction === "evm-to-xrpl" ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>1. Connect EVM Wallet</strong> — Use MetaMask or WalletConnect to connect your Ethereum/EVM wallet.
              </p>
              <p>
                <strong>2. Enter Details</strong> — Select your source chain and token, enter the amount, and provide your XRPL destination address.
              </p>
              <p>
                <strong>3. Get Quote</strong> — We fetch the optimal bridge route via Squid Router (powered by Axelar's cross-chain protocol).
              </p>
              <p>
                <strong>4. Bridge</strong> — Sign the transaction in your wallet. Axelar secures the cross-chain transfer, delivering native XRP to your XRPL address.
              </p>
            </div>
            ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>1. Enter XRP Amount</strong> — Specify how much XRP you want to bridge to an EVM chain.
              </p>
              <p>
                <strong>2. Choose Destination</strong> — Select the EVM chain (Ethereum, Polygon, Arbitrum, etc.) and enter your EVM wallet address.
              </p>
              <p>
                <strong>3. Sign with Xaman</strong> — A payment to the Axelar XRPL gateway is created. Scan the QR or approve in Xaman.
              </p>
              <p>
                <strong>4. Cross-Chain Delivery</strong> — Axelar picks up the payment and delivers wrapped XRP (or your chosen token) to your EVM wallet. Typically takes 5-15 minutes.
              </p>
            </div>
            )}
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Axelar Security</Badge>
              <Badge variant="secondary" className="text-xs">Non-Custodial</Badge>
              <Badge variant="secondary" className="text-xs">{direction === "evm-to-xrpl" ? "EVM → XRPL" : "XRPL → EVM"}</Badge>
              <Badge variant="secondary" className="text-xs">{direction === "evm-to-xrpl" ? "Native XRP Delivery" : "Xaman Signing"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bridge Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Send</span>
              <span className="font-medium">{amount} {selectedToken?.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From Chain</span>
              <span className="font-medium">{sourceChainName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receive</span>
              <span className="font-medium text-green-600">
                ~{estimate?.toAmount ? (parseFloat(estimate.toAmount) / 1e6).toFixed(2) : "?"} XRP
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To</span>
              <span className="font-mono text-sm">{shortenAddress(xrplAddress)}</span>
            </div>
            {estimatedDuration > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Time</span>
                <span>~{Math.ceil(estimatedDuration / 60)} min</span>
              </div>
            )}
            {(totalFeesUSD + totalGasUSD) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fees</span>
                <span>${(totalFeesUSD + totalGasUSD).toFixed(2)}</span>
              </div>
            )}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-2">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Cross-chain bridging involves smart contract interactions. Ensure your destination XRPL address is correct — transactions cannot be reversed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} data-testid="button-cancel-bridge">
              Cancel
            </Button>
            <Button onClick={executeBridge} disabled={isSwapping} className="gap-2" data-testid="button-confirm-bridge">
              {isSwapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
              Confirm Bridge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReverseConfirm} onOpenChange={setShowReverseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm XRPL → EVM Bridge</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Send</span>
              <span className="font-medium">{reverseAmount} XRP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From</span>
              <span className="font-medium">XRP Ledger (via Xaman)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To Chain</span>
              <span className="font-medium">{reverseDestChainInfo?.name || "Ethereum"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EVM Address</span>
              <span className="font-mono text-sm">{shortenAddress(reverseEvmAddress)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gateway</span>
              <span className="font-mono text-xs">{shortenAddress(AXELAR_XRPL_GATEWAY)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Time</span>
              <span>5-15 minutes</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-2">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                XRP will be sent to the Axelar XRPL gateway. Ensure your EVM destination address is correct — cross-chain transactions cannot be reversed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReverseConfirm(false)} data-testid="button-cancel-reverse-bridge">
              Cancel
            </Button>
            <Button onClick={executeReverseBridge} disabled={isReverseBridging} className="gap-2" data-testid="button-confirm-reverse-bridge">
              {isReverseBridging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
              Sign with Xaman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
