import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SeoHead } from "@/components/seo-head";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useUserData } from "@/hooks/use-user-data";
import memberFlrStaking from "@assets/IMG_0107_1773957022639.png";
import autoclaimScreenshot from "@assets/IMG_0108_1773957517213.png";
import bifrostMenuScreenshot from "@assets/IMG_0109_1773958267636.png";
import wrapConfirmScreenshot from "@assets/IMG_0111_1773958416955.png";
import delegateListScreenshot from "@assets/IMG_0112_1773958470375.png";
import batchDelegateScreenshot from "@assets/IMG_0114_1773958620161.png";
import delegationCompleteScreenshot from "@assets/IMG_0115_1773958651120.png";
import { Link } from "wouter";
import {
  Flame,
  Wallet,
  TrendingUp,
  Gift,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Calculator,
  Target,
  Clock,
  Coins,
  Users,
  ArrowRight,
  ArrowRightLeft,
  ExternalLink,
} from "lucide-react";

interface FlareWalletInfo {
  address: string;
  flrBalance: string;
  wflrBalance: string;
  totalFlr: string;
  delegations: Array<{
    provider: string;
    percentBips: number;
    percent: string;
  }>;
  isDelegated: boolean;
  isWrapped: boolean;
  estimatedApy: number;
  estimatedMonthlyReward: string;
  estimatedYearlyReward: string;
  flareDrop: {
    active: boolean;
    currentMonth: number;
    totalMonths: number;
    endDate: string;
    note: string;
  };
  readinessChecklist: {
    hasFlr: boolean;
    isWrapped: boolean;
    isDelegated: boolean;
    score: number;
    total: number;
  };
}

interface NetworkStats {
  currentEpoch: number;
  estimatedFtsoApy: string;
  avgFtsoApy: number;
  flareDropActive: boolean;
  flareDropMonth: number;
  totalMonths: number;
}

function formatFlr(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FlareFtso() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flareAddress, setFlareAddress] = useState("");
  const { data: savedAddress, save: saveFlareAddress, remove: removeFlareAddress, isLoading: addressLoading } = useUserData("flare_address", "");
  const [showGuide, setShowGuide] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showEarnXrp, setShowEarnXrp] = useState(false);
  const [calcAmount, setCalcAmount] = useState("20000");
  const [calcApy, setCalcApy] = useState("8.5");

  const { data: networkStats, isLoading: statsLoading } = useQuery<NetworkStats>({
    queryKey: ["/api/flare/network-stats"],
    refetchInterval: 10 * 60 * 1000,
  });

  const { data: walletInfo, isLoading: walletLoading, refetch: refetchWallet } = useQuery<FlareWalletInfo>({
    queryKey: ["/api/flare/wallet", savedAddress],
    queryFn: () => fetch(`/api/flare/wallet/${savedAddress}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!savedAddress && !!user,
    refetchInterval: 10 * 60 * 1000,
  });

  function handleConnectFlare() {
    const addr = flareAddress.trim();
    if (!addr.startsWith("0x") || addr.length !== 42) {
      toast({ title: "Invalid address", description: "Enter a valid Flare C-chain address starting with 0x", variant: "destructive" });
      return;
    }
    saveFlareAddress(addr);
    toast({ title: "Flare wallet connected", description: "Fetching your delegation and reward data..." });
  }

  function handleDisconnect() {
    setFlareAddress("");
    removeFlareAddress();
    toast({ title: "Flare wallet disconnected" });
  }

  const calcPrincipal = parseFloat(calcAmount) || 0;
  const calcApyVal = parseFloat(calcApy) || 0;
  const calcMonthly = calcPrincipal * (calcApyVal / 100) / 12;
  const calcYearly = calcPrincipal * (calcApyVal / 100);
  const calc5Year = calcPrincipal * Math.pow(1 + calcApyVal / 100 / 12, 60) - calcPrincipal;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      <SeoHead
        title="Flare FTSO Delegation Rewards | CryptoOwnBank"
        description="Track your Flare FLR delegation rewards, FlareDrop claims, and WFLR staking. Monitor FTSO data provider yields."
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Flame className="h-7 w-7 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Flare FTSO Rewards</h1>
            <p className="text-muted-foreground text-sm">Track delegation rewards, FlareDrop claims, and WFLR positions</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/ownbank/dex" data-testid="link-trade-flr-dex">
            <Button size="sm" className="bg-[#00A4E4] text-white border-[#00A4E4]">
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              Trade FLR
            </Button>
          </Link>
          <Link href="/technical-analysis?symbol=FLR" data-testid="link-chart-flr">
            <Button size="sm" variant="outline">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              View Chart
            </Button>
          </Link>
          <a href="https://bifrostwallet.com" target="_blank" rel="noopener noreferrer" data-testid="link-bifrost-download">
            <Button size="sm" variant="outline">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Get Bifrost Wallet
            </Button>
          </a>
        </div>
        {savedAddress && (
          <Button variant="outline" size="sm" onClick={() => refetchWallet()} data-testid="button-refresh-flare">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="card-ftso-apy">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              FTSO Delegation APY
            </div>
            <p className="text-2xl font-bold text-green-600">
              {networkStats?.estimatedFtsoApy || "5–15%"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Varies by data provider</p>
          </CardContent>
        </Card>
        <Card data-testid="card-flaredrop-status">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Gift className="h-3.5 w-3.5" />
              FlareDrop Status
            </div>
            <p className="text-2xl font-bold">
              {networkStats?.flareDropActive ? (
                <span className="text-blue-600">Month {networkStats.flareDropMonth}/{networkStats.totalMonths}</span>
              ) : (
                <span className="text-muted-foreground">Completed</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Monthly distributions</p>
          </CardContent>
        </Card>
        <Card data-testid="card-avg-apy">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Target className="h-3.5 w-3.5" />
              Average FTSO APY
            </div>
            <p className="text-2xl font-bold text-green-600">
              ~{networkStats?.avgFtsoApy || 8.5}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Network-wide average</p>
          </CardContent>
        </Card>
      </div>

      {(user && addressLoading) ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : !savedAddress ? (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-500" />
              Connect Your Flare Wallet
            </CardTitle>
            <CardDescription>
              Enter your Flare C-chain address to track your FLR balance, WFLR delegation, and FTSO rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="0x... (Flare C-chain address)"
                value={flareAddress}
                onChange={(e) => setFlareAddress(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-flare-address"
              />
              <Button onClick={handleConnectFlare} disabled={!user} data-testid="button-connect-flare">
                <Flame className="h-4 w-4 mr-1" />
                Connect
              </Button>
            </div>
            {!user && (
              <p className="text-xs text-muted-foreground">Sign in to connect your Flare wallet</p>
            )}
            <div className="rounded-lg border p-3 bg-background">
              <p className="text-xs text-muted-foreground">
                <strong>Where to find your address:</strong> Open Bifrost Wallet or MetaMask (with Flare network added). Your Flare C-chain address starts with 0x. This is the same address format as Ethereum.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : walletLoading ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : walletInfo ? (
        <>
          <Card className="border-orange-500/20" data-testid="card-wallet-overview">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-orange-500" />
                  Wallet Overview
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    {savedAddress.slice(0, 8)}...{savedAddress.slice(-6)}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleDisconnect} data-testid="button-disconnect-flare">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">FLR Balance</p>
                  <p className="text-lg font-bold" data-testid="text-flr-balance">{formatFlr(walletInfo.flrBalance)} FLR</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WFLR (Wrapped)</p>
                  <p className="text-lg font-bold" data-testid="text-wflr-balance">{formatFlr(walletInfo.wflrBalance)} WFLR</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Holdings</p>
                  <p className="text-lg font-bold" data-testid="text-total-flr">{formatFlr(walletInfo.totalFlr)} FLR</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated APY</p>
                  <p className="text-lg font-bold text-green-600" data-testid="text-estimated-apy">
                    {walletInfo.isDelegated ? `${walletInfo.estimatedApy}%` : "Not delegated"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {walletInfo.isDelegated && (
            <Card className="border-green-500/20 bg-green-500/5" data-testid="card-reward-estimates">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-green-600" />
                  Estimated Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Estimate</p>
                    <p className="text-lg font-bold text-green-600" data-testid="text-monthly-reward">
                      ~{formatFlr(walletInfo.estimatedMonthlyReward)} FLR
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Yearly Estimate</p>
                    <p className="text-lg font-bold text-green-600" data-testid="text-yearly-reward">
                      ~{formatFlr(walletInfo.estimatedYearlyReward)} FLR
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delegation Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-medium text-green-600">Active</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Estimates are based on average FTSO reward rates (~{walletInfo.estimatedApy}% APY). Actual rewards vary by epoch and data provider performance.
                </p>
              </CardContent>
            </Card>
          )}

          {walletInfo.delegations.length > 0 && (
            <Card data-testid="card-delegations">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Active Delegations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {walletInfo.delegations.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border p-3" data-testid={`card-delegation-${i}`}>
                      <div>
                        <p className="text-sm font-mono" data-testid={`text-provider-${i}`}>
                          {d.provider.slice(0, 10)}...{d.provider.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground">FTSO Data Provider</p>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30" variant="outline">
                        {d.percent}% delegated
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-readiness">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                Readiness Checklist
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs ${
                    walletInfo.readinessChecklist.score === walletInfo.readinessChecklist.total
                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  }`}
                >
                  {walletInfo.readinessChecklist.score}/{walletInfo.readinessChecklist.total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { done: walletInfo.readinessChecklist.hasFlr, label: "Have FLR in your wallet", tip: "Acquire FLR from Uphold, Bitrue, or another exchange" },
                { done: walletInfo.readinessChecklist.isWrapped, label: "Wrap FLR to WFLR", tip: "Wrap in Bifrost Wallet or the Flare Portal — required for delegation and FlareDrop" },
                { done: walletInfo.readinessChecklist.isDelegated, label: "Delegate WFLR to an FTSO provider", tip: "Choose a provider in Bifrost Wallet and delegate to start earning rewards" },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-md border p-3 ${item.done ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}
                  data-testid={`checklist-item-${i}`}
                >
                  {item.done ? (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    {!item.done && <p className="text-xs text-muted-foreground mt-0.5">{item.tip}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card data-testid="card-flaredrop">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                FlareDrop Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={walletInfo.flareDrop.active ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-600"}>
                    {walletInfo.flareDrop.active ? "Active" : "Completed"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-sm font-medium">Month {walletInfo.flareDrop.currentMonth} of {walletInfo.flareDrop.totalMonths}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="text-sm font-medium">{walletInfo.flareDrop.endDate}</p>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(walletInfo.flareDrop.currentMonth / walletInfo.flareDrop.totalMonths) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{walletInfo.flareDrop.note}</p>
              {!walletInfo.isWrapped && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Your FLR is not wrapped. You must wrap to WFLR to be eligible for FlareDrop claims.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowCalc(!showCalc)}
          data-testid="button-toggle-calc"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-500" />
              Reward Calculator
            </CardTitle>
            {showCalc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showCalc && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">FLR Amount</label>
                <Input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  data-testid="input-calc-amount"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">APY (%)</label>
                <Input
                  type="number"
                  value={calcApy}
                  onChange={(e) => setCalcApy(e.target.value)}
                  step="0.5"
                  data-testid="input-calc-apy"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-lg font-bold text-green-600" data-testid="text-calc-monthly">{formatFlr(calcMonthly)} FLR</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Yearly</p>
                <p className="text-lg font-bold text-green-600" data-testid="text-calc-yearly">{formatFlr(calcYearly)} FLR</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">5-Year (Compounded)</p>
                <p className="text-lg font-bold text-green-600" data-testid="text-calc-5year">{formatFlr(calc5Year)} FLR</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              5-year projection assumes monthly compounding. Actual rewards depend on FTSO provider performance and network conditions.
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowGuide(!showGuide)}
          data-testid="button-toggle-guide"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              How to Set Up &amp; Earn Flare Rewards
            </CardTitle>
            {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showGuide && (
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-orange-500" />
                Step 1: Move FLR from Uphold to Bifrost Wallet
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Uphold does not support FTSO delegation or wrapping, so you need to move your FLR to a wallet that does. Bifrost Wallet is the most popular non-custodial Flare wallet — it handles wrapping, delegation, and FlareDrop claiming all in one app.</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Download <strong>Bifrost Wallet</strong> from the App Store (iOS) or Google Play (Android).</li>
                  <li>Open Bifrost and create a new wallet. <strong>Write down your recovery phrase</strong> and store it securely — this is your only backup. Never share it with anyone.</li>
                  <li>Once your wallet is created, tap <strong>Flare (FLR)</strong> in your asset list, then tap <strong>Receive</strong>. Copy your Flare C-chain address (starts with <code className="text-xs bg-muted px-1 rounded">0x</code>).</li>
                  <li>Open Uphold. Go to your FLR balance, tap <strong>Transact → Send to a crypto network</strong>.</li>
                  <li>Select <strong>Flare network</strong> as the destination network. Paste your Bifrost <code className="text-xs bg-muted px-1 rounded">0x</code> address. No destination tag or memo needed.</li>
                  <li><strong>Send a small test amount first</strong> (e.g., 10 FLR) to confirm it arrives in Bifrost. Once confirmed, send the rest.</li>
                </ol>
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2.5 mt-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span><strong>Important:</strong> Make sure you select the <strong>Flare network</strong> when withdrawing from Uphold — not Ethereum, not XRPL. FLR is a native Flare C-chain token. Sending to the wrong network may result in lost funds.</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                Step 2: Wrap FLR to WFLR
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Wrapping converts your FLR into WFLR (Wrapped FLR). This is required for both FTSO delegation rewards AND FlareDrop eligibility. Your tokens stay in your wallet — wrapping just changes the token format.</p>
                <div className="flex gap-3 overflow-x-auto py-2">
                  <img src={bifrostMenuScreenshot} alt="Bifrost Wallet menu showing Wrap and Delegate options" className="rounded-lg border shadow-sm h-48 w-auto" data-testid="img-bifrost-menu" />
                  <img src={wrapConfirmScreenshot} alt="Bifrost showing 25,590 FLR successfully wrapped with transaction history" className="rounded-lg border shadow-sm h-48 w-auto" data-testid="img-wrap-confirm" />
                </div>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>In Bifrost Wallet, tap <strong>Flare (FLR)</strong> in your asset list.</li>
                  <li>Tap the <strong>three-dot menu (•••)</strong> and select <strong>Wrap</strong> (shown in the screenshot above).</li>
                  <li>Enter the amount you want to wrap. <strong>Leave a small amount unwrapped</strong> (5–10 FLR) to cover gas fees for future transactions.</li>
                  <li>Confirm the transaction. Wrapping is instant and costs a tiny gas fee (fractions of a penny).</li>
                  <li>Your WFLR balance will appear in Bifrost immediately. You can unwrap back to FLR at any time.</li>
                </ol>
              </div>
            </div>

            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-500" />
                Step 3: Delegate WFLR to FTSO Data Providers
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Delegation is what earns you the 5–15% APY. You're pointing your WFLR at data providers who submit price feeds to the Flare network. When their data is accurate, both you and the provider earn FLR rewards. <strong>Your WFLR never leaves your wallet</strong> — delegation is a signal, not a transfer.</p>
                <div className="flex gap-3 overflow-x-auto py-2">
                  <img src={delegateListScreenshot} alt="Bifrost FTSO provider list showing available data providers to delegate to" className="rounded-lg border shadow-sm h-48 w-auto" data-testid="img-delegate-list" />
                  <img src={batchDelegateScreenshot} alt="Batch delegate confirmation showing 50/50 split between Bifrost Wallet and FTSO EU" className="rounded-lg border shadow-sm h-48 w-auto" data-testid="img-batch-delegate" />
                  <img src={delegationCompleteScreenshot} alt="Completed delegation showing 2 of 2 providers active with 25,590 WFLR vote power" className="rounded-lg border shadow-sm h-48 w-auto" data-testid="img-delegation-complete" />
                </div>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>In Bifrost Wallet, tap the <strong>three-dot menu (•••)</strong> on your FLR asset and select <strong>Delegate</strong>, or go to the <strong>FTSO Delegation</strong> section.</li>
                  <li>Browse the list of available FTSO data providers (shown above). You can delegate to <strong>up to 2 providers</strong>.</li>
                  <li>Choose providers with a good track record — popular choices include <strong>Bifrost Wallet</strong> and <strong>FTSO EU</strong>.</li>
                  <li>Select how much of your WFLR to delegate to each provider (e.g., 50%/50% split). The confirmation screen shows exactly what you're delegating before you commit.</li>
                  <li>Confirm the batch delegation. The network fee is less than $0.01. Once confirmed, you'll see <strong>"Delegations (2 of 2)"</strong> with your full vote power allocated.</li>
                  <li>Rewards start accumulating in the next reward epoch (~3.5 days). The autoclaimer handles collection for you.</li>
                </ol>
                <div className="rounded border border-green-500/30 bg-green-500/5 p-2.5 mt-2">
                  <p className="text-xs text-green-700 dark:text-green-400">
                    <strong>Your WFLR stays in your wallet.</strong> Delegation doesn't move your tokens anywhere. You can change providers or undelegate at any time. Think of it like voting — you're lending your weight to a provider, not sending them your money.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-purple-500" />
                Step 4: Claim Rewards &amp; FlareDrop
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>You now have two income streams: FTSO delegation rewards (every ~3.5 days) and monthly FlareDrop distributions.</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li><strong>FTSO rewards:</strong> In Bifrost Wallet, check the Rewards section regularly. Unclaimed rewards accumulate each epoch (~3.5 days). Tap <strong>Claim</strong> to receive your FLR.</li>
                  <li><strong>FlareDrop:</strong> Each month, a FlareDrop distribution becomes claimable. In Bifrost, go to the FlareDrop section and tap <strong>Claim</strong>. The amount you receive is proportional to your WFLR balance.</li>
                  <li><strong>Compound your earnings:</strong> After claiming, wrap the new FLR to WFLR and it automatically counts toward your existing delegation — increasing your future rewards. No need to re-delegate.</li>
                </ol>

                <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 mt-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="sm:w-36 shrink-0">
                      <img
                        src={autoclaimScreenshot}
                        alt="Bifrost Wallet autoclaiming setup showing Bifrost Claim Bot with 3.20 FLR setup fee and 3.20 FLR per claim"
                        className="rounded-lg border shadow-sm w-full sm:w-36"
                        data-testid="img-autoclaim"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-purple-500" />
                        Pro Tip: Enable Autoclaiming
                      </p>
                      <p className="text-xs">
                        When you first open Bifrost, you'll see a prompt to <strong>Enable Autoclaiming</strong>. This lets the <strong>Bifrost Claim Bot</strong> automatically claim your FTSO rewards so they don't expire — you don't have to remember to do it manually.
                      </p>
                      <p className="text-xs">
                        <strong>Cost:</strong> 3.20 FLR one-time setup fee + 3.20 FLR per claim (about $0.03 at current prices). This is well worth it — unclaimed FTSO rewards expire, and the bot handles everything for you.
                      </p>
                      <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        We recommend enabling this. It's a small cost that protects your rewards from expiring.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-cyan-500" />
                Step 5: Track on CryptoOwnBank
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Once your FLR is in Bifrost and you've set up delegation, come back to this page and connect your Flare address to track everything in one place.</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Copy your Flare C-chain address from Bifrost Wallet (the same <code className="text-xs bg-muted px-1 rounded">0x</code> address).</li>
                  <li>Paste it into the wallet connection box at the top of this page.</li>
                  <li>CryptoOwnBank reads your on-chain data directly — FLR balance, WFLR balance, delegation status, estimated rewards, and FlareDrop progress.</li>
                  <li>Check back anytime to monitor your earnings. We never access your keys — read-only tracking only.</li>
                </ol>
              </div>
            </div>

            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-indigo-500" />
                Member Spotlight: From 3.39% to Full FTSO Yield
              </p>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-44 shrink-0">
                  <img
                    src={memberFlrStaking}
                    alt="Member's FLR staking position showing 25,486 FLR earning 3.39% APY on a centralized exchange"
                    className="rounded-lg border shadow-sm w-full md:w-44"
                    data-testid="img-member-spotlight"
                  />
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    One of our members had <strong>25,486 FLR</strong> staked on a centralized exchange, earning <strong>3.39% APY</strong> — about <strong>$0.13 per week</strong> in rewards. That's roughly $6.75 per year on a $212 position.
                  </p>
                  <p>
                    After discovering the difference, they decided to unstake, move their FLR to Bifrost Wallet, wrap to WFLR, and delegate to FTSO providers. The potential difference:
                  </p>
                  <div className="grid grid-cols-2 gap-3 my-2">
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Exchange Staking</p>
                      <p className="text-lg font-bold text-red-500">3.39%</p>
                      <p className="text-xs text-muted-foreground">~$7/yr on 25K FLR</p>
                    </div>
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">FTSO Delegation</p>
                      <p className="text-lg font-bold text-green-500">5–15%</p>
                      <p className="text-xs text-muted-foreground">~$10–32/yr + FlareDrop</p>
                    </div>
                  </div>
                  <p>
                    Beyond the higher APY, FTSO delegation keeps your tokens in <strong>your own wallet</strong> — not on an exchange. You hold the keys. Plus, wrapped WFLR qualifies for the monthly <strong>FlareDrop</strong>, which is an entirely separate reward stream on top of delegation yield.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      This member followed the 5-step guide above to make the switch. The whole process takes about 15 minutes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                Key Reminders
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong>Bifrost Wallet is non-custodial</strong> — your keys stay on your phone, just like Xaman for XRPL. Nobody else can access your FLR.</li>
                <li><strong>Delegation does NOT transfer your tokens</strong> — your WFLR stays in your wallet the entire time. You can undelegate and unwrap at any time.</li>
                <li><strong>Keep 5–10 FLR unwrapped</strong> for gas fees (wrapping, claiming, delegating all need a tiny gas payment in FLR).</li>
                <li><strong>FlareDrop requires WFLR</strong> — if your FLR is unwrapped or sitting on an exchange, you're not eligible for the monthly drop.</li>
                <li><strong>Claim rewards regularly</strong> — unclaimed FTSO rewards expire after a certain period. Check Bifrost every week or two.</li>
                <li><strong>Coming from Uphold?</strong> Your monthly FlareDrop from holding XRP during the snapshot still lands on Uphold. Move that FLR to Bifrost too, wrap it, and it earns delegation rewards on top of the drop.</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-orange-500/30">
        <CardHeader className="cursor-pointer" onClick={() => setShowEarnXrp(!showEarnXrp)} data-testid="btn-toggle-earnxrp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-orange-500" />
              <div>
                <CardTitle className="text-lg">earnXRP Vault — Earn Yield on Your XRP</CardTitle>
                <CardDescription>Self-custody yield via Flare's FXRP bridge (Upshift + Clearstar) — vault currently full, deposits paused</CardDescription>
              </div>
            </div>
            {showEarnXrp ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showEarnXrp && (
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                What is the earnXRP Vault?
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>The <strong>"Flare XRPFi Yield"</strong> xApp in Xaman lets you earn yield on your XRP while maintaining full self-custody. Open Xaman → xApps tab → search "Flare XRPFi Yield." Your XRP bridges to Flare and mints 1:1 as FXRP, which you can then deploy into multiple yield options — all from the same xApp.</p>
                <p>As of March 2026, the original earnXRP vault has reached its <strong>25M FXRP capacity</strong> ($35M+ TVL). But two additional providers are live, and more Xaman integrations are incoming:</p>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 space-y-1">
                  <p className="text-sm font-semibold">Firelight stXRP — Live (Dec 2025)</p>
                  <p className="text-xs text-muted-foreground">Mint FXRP → stake for liquid stXRP. Earn variable yield via Firelight's insurance/DeFi model. stXRP is tradable on SparkDEX and Enosys, so your position stays liquid.</p>
                </div>
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 space-y-1">
                  <p className="text-sm font-semibold">Morpho + Mystic Lending — Live (Feb 2026)</p>
                  <p className="text-xs text-muted-foreground">Lend FXRP in curated vaults or borrow against it (USDT0/FLR-backed). Variable yields ~2–5%. Claim and redeem anytime.</p>
                </div>
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 space-y-1">
                  <p className="text-sm font-semibold">earnXRP Vault (Upshift + Clearstar) — 3.4% APY</p>
                  <p className="text-xs text-muted-foreground">The original vault — currently full at 25M FXRP. Capacity expansions and 2 more Xaman providers incoming. Tap "Notify me" in the xApp to get alerted when deposits reopen.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-orange-500" />
                How It Works
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                <li><strong>Bridge XRP to FXRP via Xaman</strong> — Open the "Flare XRPFi Yield" xApp in Xaman (xApps tab → search "Flare XRPFi Yield"). Tap Deposit, enter your amount, and sign the transaction. Your XRP bridges to Flare and mints 1:1 as FXRP.</li>
                <li><strong>Choose how to earn</strong> — Once you have FXRP, you can deploy it into any of the available providers:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><strong>Firelight</strong> — Stake FXRP for liquid stXRP. Variable yield. Tradable on SparkDEX/Enosys.</li>
                    <li><strong>Morpho/Mystic</strong> — Lend FXRP in curated vaults (~2–5% variable). Can also borrow against it.</li>
                    <li><strong>earnXRP vault</strong> — Clearstar-curated strategies (~3.4% APY). Currently full — waitlist available.</li>
                  </ul>
                </li>
                <li><strong>Redeem anytime</strong> — Claim/redeem your position, unwrap FXRP back to native XRP with one transaction. Your XRP returns to your cold wallet. No lock-ups.</li>
              </ol>
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 mt-2">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Yes — you get more XRP back. If you deposit 1,000 XRP and earn 3% over a year, you redeem ~1,030 XRP. The yield accrues as additional FXRP which converts back to real XRP.</p>
              </div>
            </div>

            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                Key Details & Risks
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-green-600 dark:text-green-400">Pros:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> Self-custody — keys never leave your device</li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> No lock-ups — redeem to XRP anytime</li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> One-click via Xaman — no manual bridging</li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> ~3.4% estimated APY on idle XRP</li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> $35M+ TVL (25M FXRP) — real traction</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-orange-600 dark:text-orange-400">Risks to consider:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Smart contract risk — bridge/vault code bugs</li>
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Variable yield — 3.4% is current estimate, not guaranteed</li>
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Flare network dependency</li>
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Clearstar strategy curation trust</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Getting Started with Xaman (Quick Start)
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                <li><strong>Update Xaman</strong> — Make sure you have the latest version (Flare Smart Accounts support was added in February 2026).</li>
                <li><strong>Open "Flare XRPFi Yield"</strong> — Tap the xApps icon in Xaman's bottom menu. Look under "What's new" or "Popular" for <strong>Flare XRPFi Yield</strong>, or search for it. You can also search for Firelight or Morpho directly. The xApp handles activating the Flare Smart Account for your address if needed.</li>
                <li><strong>Acknowledge the virtual asset disclaimer</strong> — The xApp will explain that FXRP is a "virtual asset" that lives on the Flare network, not XRPL. Tap "I understand" to continue.</li>
                <li><strong>Bridge XRP → FXRP</strong> — Tap Deposit, enter your amount, and sign. Your XRP bridges to Flare and mints 1:1 as FXRP.</li>
                <li><strong>Choose your yield provider</strong> — Stake on Firelight (liquid stXRP), lend on Morpho/Mystic (~2–5%), or join the earnXRP vault waitlist (~3.4%). Claim and redeem anytime.</li>
                <li><strong>Monitor</strong> — Your FXRP position and vault balances appear in the xApp. Yield accrues on-chain.</li>
                <li><strong>Redeem</strong> — Tap Withdraw. FXRP unwraps back to native XRP and returns to your wallet. One transaction.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500" />
                Using Ledger + Xaman Together
              </p>
              <p className="text-sm text-muted-foreground">If you use a Ledger hardware wallet for cold storage, here's how to set up earnXRP while keeping your keys on the Ledger:</p>
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 mb-2">
                <p className="text-xs text-muted-foreground"><strong>Prerequisites:</strong> You need your Ledger already set up with the XRP app installed and an XRP account created in Ledger Live. If you haven't done this yet, open Ledger Live → My Ledger → install the XRP app, then go to Accounts → Add Account → XRP to create your XRP account. Make sure your Ledger firmware is up to date.</p>
              </div>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                <li><strong>Pair Ledger with Xaman</strong> — In Xaman, go to Settings → Accounts → Add Account → Import (read-only). Scan the QR code or enter your XRPL address from Ledger Live. This makes your Ledger address visible in Xaman without exposing your private keys.</li>
                <li><strong>Open "Flare XRPFi Yield"</strong> — With your Ledger-linked account selected in Xaman, tap the xApps icon (bottom menu). Look under "What's new" or "Popular" for <strong>Flare XRPFi Yield</strong>, or search for it (also try Firelight or Morpho). The xApp will detect your account and walk you through the setup, including activating the Flare Smart Account for that address if needed. Acknowledge the virtual asset disclaimer by tapping "I understand."</li>
                <li><strong>Bridge XRP → FXRP</strong> — Tap Deposit and enter how much XRP to bridge. The xApp will prepare the transaction and prompt you to sign.</li>
                <li><strong>Sign on Ledger</strong> — When Xaman shows the signing request, connect your Ledger via USB or Bluetooth. Open the XRP app on your Ledger and approve the transaction on the device screen. Your private keys never leave the Ledger.</li>
                <li><strong>Choose your yield provider</strong> — Stake on Firelight (liquid stXRP), lend on Morpho/Mystic (~2–5%), or join the earnXRP vault waitlist (~3.4%). Each provider transaction requires Ledger signing.</li>
                <li><strong>Confirm and monitor</strong> — Once signed, your FXRP is deployed and starts earning. Track your position in the xApp.</li>
                <li><strong>To redeem</strong> — Same process in reverse: open the xApp, select withdraw, sign with your Ledger, and your XRP (plus yield) returns to your Ledger-controlled address.</li>
              </ol>
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 mt-2 space-y-1">
                <p className="text-xs text-muted-foreground"><strong>Why Ledger + Xaman?</strong> Xaman acts as the interface and bridge coordinator, while your Ledger holds the keys. You get the convenience of Xaman's one-click earnXRP with the security of hardware signing. Every transaction requires physical approval on your Ledger — no software wallet can move your XRP without you pressing the button.</p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-muted-foreground"><strong>Recommendation:</strong> Start small — test with 100-500 XRP to validate the full round-trip (deposit → earn → redeem) before committing a larger position. Use a general-purpose wallet, not your primary receiving address.</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
