import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  getBalances,
  getXrpPrice,
  calculateAccruedInterest,
  AFFILIATE_LINKS,
} from "@/lib/xrpl-client";
import { connectXumm } from "@/lib/xumm-connector";
import { connectLedger } from "@/lib/ledger-connector";
import { Link } from "wouter";
import {
  Wallet,
  Unplug,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Copy,
  Check,
  ArrowDownToLine,
  Users,
  RefreshCw,
  Shield,
} from "lucide-react";
import { SiRipple } from "react-icons/si";

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function OwnBankDashboard() {
  const { toast } = useToast();
  const {
    walletAddress,
    isConnected,
    walletType,
    xrpBalance,
    rlusdBalance,
    vaultDeposits,
    referralCode,
    connect,
    disconnect,
    updateBalances,
    generateReferralCode,
  } = useXrplStore();

  const [xrpPrice, setXrpPrice] = useState<number>(0);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [connectingXumm, setConnectingXumm] = useState(false);
  const [connectingLedger, setConnectingLedger] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingBalances(true);
    try {
      const balances = await getBalances(walletAddress);
      updateBalances(balances.xrp, balances.rlusd);
    } catch {
      toast({
        title: "Failed to fetch balances",
        description: "Could not connect to XRPL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress, updateBalances, toast]);

  const fetchPrice = useCallback(async () => {
    setLoadingPrice(true);
    try {
      const price = await getXrpPrice();
      setXrpPrice(price);
    } catch {
      // silent
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchBalances();
      fetchPrice();
    }
  }, [isConnected, walletAddress, fetchBalances, fetchPrice]);

  const handleConnectXumm = async () => {
    setConnectingXumm(true);
    try {
      const result = await connectXumm();
      if (result.success && result.address) {
        connect(result.address, "xumm");
        toast({ title: "Wallet Connected", description: `Connected via Xumm: ${truncateAddress(result.address)}` });
      } else {
        toast({ title: "Connection Failed", description: result.error || "Could not connect Xumm wallet.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message || "Unexpected error.", variant: "destructive" });
    } finally {
      setConnectingXumm(false);
    }
  };

  const handleConnectLedger = async () => {
    setConnectingLedger(true);
    try {
      const result = await connectLedger();
      if (result.success && result.address) {
        connect(result.address, "ledger");
        toast({ title: "Wallet Connected", description: `Connected via Ledger: ${truncateAddress(result.address)}` });
      } else {
        toast({ title: "Connection Failed", description: result.error || "Could not connect Ledger.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message || "Unexpected error.", variant: "destructive" });
    } finally {
      setConnectingLedger(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({ title: "Wallet Disconnected" });
  };

  const portfolioValue = xrpBalance * xrpPrice + rlusdBalance;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let allTimeInterest = 0;
  let thisMonthInterest = 0;
  for (const dep of vaultDeposits) {
    const totalInterest = calculateAccruedInterest(dep.principal, dep.apr, dep.depositDate);
    allTimeInterest += totalInterest;
    const depositDate = new Date(dep.depositDate);
    if (depositDate < startOfMonth) {
      const daysThisMonth = (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24);
      thisMonthInterest += dep.principal * (dep.apr / 100) * (daysThisMonth / 365);
    } else {
      thisMonthInterest += totalInterest;
    }
  }

  const referralLink = referralCode
    ? `${window.location.origin}/?ref=${referralCode}`
    : null;

  const handleCopyReferral = async () => {
    if (!referralLink) {
      const code = generateReferralCode();
      const link = `${window.location.origin}/?ref=${code}`;
      await navigator.clipboard.writeText(link);
    } else {
      await navigator.clipboard.writeText(referralLink);
    }
    setCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-ownbank-title">OwnBank</h1>
          <p className="text-muted-foreground">
            Non-custodial XRPL yield dashboard. Connect your cold wallet to get started.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#00A4E4]/10">
              <Wallet className="h-8 w-8 text-[#00A4E4]" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold" data-testid="text-connect-heading">Connect Your Wallet</h2>
              <p className="text-muted-foreground max-w-md">
                Connect your XRPL cold wallet to view balances, manage vault deposits, and withdraw earned interest.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleConnectXumm}
                disabled={connectingXumm || connectingLedger}
                className="bg-[#00A4E4] border-[#00A4E4] text-white"
                data-testid="button-connect-xumm"
              >
                {connectingXumm ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <SiRipple className="h-4 w-4 mr-2" />
                )}
                Connect Xumm
              </Button>
              <Button
                variant="outline"
                onClick={handleConnectLedger}
                disabled={connectingXumm || connectingLedger}
                data-testid="button-connect-ledger"
              >
                {connectingLedger ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Connect Ledger
              </Button>
            </div>
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
          <h1 className="text-2xl font-bold" data-testid="text-ownbank-title">OwnBank</h1>
          <p className="text-muted-foreground">
            Non-custodial XRPL yield dashboard
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" data-testid="badge-wallet-address">
            <Wallet className="h-3 w-3 mr-1" />
            {truncateAddress(walletAddress!)}
          </Badge>
          <Badge variant="secondary" data-testid="badge-wallet-type">
            {walletType === "xumm" ? "Xumm" : "Ledger"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { fetchBalances(); fetchPrice(); }}
            disabled={loadingBalances}
            data-testid="button-refresh-balances"
          >
            <RefreshCw className={`h-4 w-4 ${loadingBalances ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            data-testid="button-disconnect"
          >
            <Unplug className="h-4 w-4 mr-1" />
            Disconnect
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">XRP Balance</CardTitle>
            <div className="h-8 w-8 rounded-md bg-[#00A4E4]/10 flex items-center justify-center">
              <SiRipple className="h-4 w-4 text-[#00A4E4]" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingBalances ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-mono" data-testid="text-xrp-balance">
                {xrpBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} XRP
              </div>
            )}
            {!loadingBalances && xrpPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-xrp-usd">
                {formatCurrency(xrpBalance * xrpPrice)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RLUSD Balance</CardTitle>
            <div className="h-8 w-8 rounded-md bg-[#00A4E4]/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-[#00A4E4]" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingBalances ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-mono" data-testid="text-rlusd-balance">
                {formatCurrency(rlusdBalance)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Value</CardTitle>
            <div className="h-8 w-8 rounded-md bg-[#00A4E4]/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#00A4E4]" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingBalances || loadingPrice ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-mono" data-testid="text-portfolio-value">
                {formatCurrency(portfolioValue)}
              </div>
            )}
            {!loadingPrice && xrpPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-xrp-price">
                XRP: {formatCurrency(xrpPrice)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned Interest</CardTitle>
            <div className="h-8 w-8 rounded-md bg-[#00A4E4]/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-[#00A4E4]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-total-interest">
              {formatCurrency(allTimeInterest)}
            </div>
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-month-interest">
              This month: {formatCurrency(thisMonthInterest)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/ownbank/withdraw">
              <Button
                className="w-full bg-[#00A4E4] border-[#00A4E4] text-white"
                data-testid="button-withdraw-interest"
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Withdraw Interest Only
              </Button>
            </Link>
            <Link href="/ownbank/vaults">
              <Button variant="outline" className="w-full" data-testid="button-view-vaults">
                <DollarSign className="h-4 w-4 mr-2" />
                View Vaults
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buy RLUSD</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Purchase RLUSD on a supported exchange, then deposit to a Soil vault for yield.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={AFFILIATE_LINKS.binance} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="link-buy-binance">
                  Binance <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
              <a href={AFFILIATE_LINKS.kraken} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="link-buy-kraken">
                  Kraken <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
              <a href={AFFILIATE_LINKS.coinbase} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="link-buy-coinbase">
                  Coinbase <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">
            <Users className="h-4 w-4 inline mr-2" />
            Refer a Friend
          </CardTitle>
          <Link href="/ownbank/referrals">
            <Button variant="ghost" size="sm" data-testid="link-view-referrals">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Share your referral link and earn bonus points when friends deposit into vaults.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <code
              className="flex-1 min-w-0 truncate rounded-md bg-muted px-3 py-2 text-sm font-mono"
              data-testid="text-referral-link"
            >
              {referralLink || `${window.location.origin}/?ref=...`}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyReferral}
              data-testid="button-copy-referral"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <XrplDisclaimer />
    </div>
  );
}
