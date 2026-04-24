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
  const { user, isLoading: authLoading } = useAuth();
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

  type VaultStatus = {
    key: string;
    name: string;
    status: "live" | "snapshot" | "error";
    isConfigured: boolean;
    isAccepting?: boolean | null;
    isUncapped?: boolean;
    capacityKnown?: boolean;
    tvlSource?: "totalAssets" | "balanceOf";
    totalAssetsXrp?: number;
    totalCapacityXrp?: number | null;
    percentFull?: number | null;
    lastCheckedAt?: string;
    message?: string;
  };
  type VaultStatusResponse = { vaults: VaultStatus[]; lastCheckedAt: string };

  const { data: vaultStatusData } = useQuery<VaultStatusResponse>({
    queryKey: ["/api/flare/vault-status"],
    refetchInterval: 5 * 60 * 1000,
  });

  const vaultByKey = (key: string) => vaultStatusData?.vaults.find((v) => v.key === key);

  const formatXrp = (n?: number | null) => {
    if (n === undefined || n === null) return "";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M XRP`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K XRP`;
    return `${n.toFixed(0)} XRP`;
  };

  const renderVaultBadges = (key: string, snapshotBadge: JSX.Element, snapshotMeta: JSX.Element) => {
    const v = vaultByKey(key);
    if (v?.status === "error") {
      return (
        <div className="flex items-center gap-2 flex-wrap" data-testid={`badges-vault-${key}-error`}>
          <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-600" title={v.message ?? undefined}>
            On-chain read failed — showing snapshot
          </Badge>
          {snapshotBadge}
          {snapshotMeta}
        </div>
      );
    }
    if (!v || v.status !== "live" || !v.isConfigured) {
      return (
        <div className="flex items-center gap-2" data-testid={`badges-vault-${key}-snapshot`}>
          {snapshotBadge}
          {snapshotMeta}
        </div>
      );
    }
    const tvlPrefix = v.tvlSource === "balanceOf" ? "Holds " : "";
    const fillText = v.isUncapped
      ? `${tvlPrefix}${formatXrp(v.totalAssetsXrp)} TVL · uncapped`
      : v.totalCapacityXrp
        ? `${formatXrp(v.totalAssetsXrp)} / ${formatXrp(v.totalCapacityXrp)} (${v.percentFull?.toFixed(1)}% full)`
        : `${tvlPrefix}${formatXrp(v.totalAssetsXrp)} TVL`;

    // Capacity-known: show clear Accepting / FULL pill.
    // Capacity-unknown (e.g. earnXRP via balanceOf fallback): show "Live · capacity unknown".
    let statusPill: JSX.Element;
    if (v.capacityKnown === false) {
      statusPill = (
        <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600" title="TVL read on-chain via FXRP balanceOf — vault doesn't expose ERC-4626 maxDeposit, so remaining capacity is unknown.">
          Live · capacity unknown
        </Badge>
      );
    } else if (v.isAccepting) {
      statusPill = <Badge className="bg-green-600 text-white text-[10px]">Accepting Deposits · Live</Badge>;
    } else {
      statusPill = <Badge variant="outline" className="text-[10px] border-red-500 text-red-600">FULL — Not Accepting · Live</Badge>;
    }

    return (
      <div className="flex items-center gap-2 flex-wrap" data-testid={`badges-vault-${key}-live`}>
        {statusPill}
        <Badge variant="outline" className="text-[10px]">{fillText}</Badge>
      </div>
    );
  };

  const vaults = vaultStatusData?.vaults ?? [];
  const liveCount = vaults.filter((v) => v.status === "live").length;
  const errorCount = vaults.filter((v) => v.status === "error").length;
  const snapshotCount = vaults.filter((v) => v.status === "snapshot").length;
  let statusHeading: string;
  if (vaults.length === 0) {
    statusHeading = "Current Status (snapshot — live on-chain status not yet configured)";
  } else if (liveCount === vaults.length) {
    statusHeading = `Current Status (live on-chain as of ${new Date(vaultStatusData!.lastCheckedAt).toLocaleString()})`;
  } else if (liveCount > 0) {
    statusHeading = `Current Status (mixed — ${liveCount} live, ${snapshotCount} snapshot${errorCount ? `, ${errorCount} read failed` : ""}, as of ${new Date(vaultStatusData!.lastCheckedAt).toLocaleString()})`;
  } else if (errorCount > 0) {
    statusHeading = `Current Status (on-chain read failed — showing snapshot${snapshotCount ? ` and unconfigured` : ""})`;
  } else {
    statusHeading = "Current Status (snapshot — live on-chain status not yet configured)";
  }

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

      {(authLoading || (user && addressLoading)) ? (
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
                <CardTitle className="text-lg">Earn Yield on Your XRP via Flare</CardTitle>
                <CardDescription>Self-custody yield options using FXRP on the Flare network — current status and how to get started</CardDescription>
              </div>
            </div>
            {showEarnXrp ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showEarnXrp && (
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {statusHeading}
              </p>
              <p className="text-sm text-muted-foreground">The <strong>"Flare XRPFi Yield"</strong> xApp in Xaman is tied to the <strong>earnXRP vault</strong>. When the vault is at capacity the xApp shows a "vault full" message with an option to sign up for notifications. The badges on each vault below show live on-chain status when configured, and a snapshot otherwise.</p>
              <p className="text-sm text-muted-foreground">Firelight and Morpho/Mystic are <strong>separate platforms on Flare</strong> — they are NOT inside the Xaman xApp. To use them, you need to get FXRP through a different route (see below).</p>
            </div>

            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                Understanding the Pieces
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>All XRP yield options on Flare require <strong>FXRP</strong> — a 1:1 wrapped version of your XRP that lives on the Flare network. Think of it like wrapping FLR → WFLR for FTSO delegation, but across chains. The challenge is getting your XRP bridged to FXRP in the first place.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 space-y-1">
                  <p className="text-xs font-semibold">How to get FXRP (bridge XRP → Flare):</p>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                    <li className="flex items-start gap-2">
                      <span className="font-medium shrink-0">Flare Portal:</span>
                      <span>Visit <a href="https://portal.flare.network" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">portal.flare.network</a> — Flare's official bridge. Connect a wallet that holds XRP (e.g., via WalletConnect) and bridge to FXRP on Flare.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium shrink-0">Squid/Axelar:</span>
                      <span>The Squid xApp is in Xaman (see your xApps list). It enables cross-chain swaps from XRPL to Flare via Axelar.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium shrink-0">Xaman xApp (when available):</span>
                      <span>The "Flare XRPFi Yield" xApp bridge is currently tied to the full earnXRP vault. Sign up for notifications — when the vault reopens or expands, the one-tap bridge will work again.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <p className="text-sm font-semibold flex items-center gap-2 px-1">
                <Coins className="h-4 w-4 text-orange-500" />
                Once You Have FXRP — Three Yield Options
              </p>

              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Firelight stXRP
                  </p>
                  {renderVaultBadges(
                    "firelight",
                    <Badge className="bg-green-600 text-white text-[10px]">Accepting Deposits</Badge>,
                    <Badge variant="outline" className="text-[10px]">Live since Dec 2025</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Stake your FXRP on Firelight to receive <strong>liquid stXRP</strong>. Variable yield through Firelight's insurance and DeFi model. stXRP stays liquid — tradable on SparkDEX or Enosys anytime.</p>
                <p className="text-xs text-muted-foreground italic">Separate website — not inside Xaman. You need FXRP in a Flare wallet first.</p>
                <div className="flex items-center gap-2 pt-1">
                  <a href="https://firelight.xyz" target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="button-firelight-link">
                      <ExternalLink className="h-3 w-3" /> Go to Firelight
                    </Button>
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Morpho + Mystic Lending
                  </p>
                  {renderVaultBadges(
                    "morpho",
                    <Badge className="bg-green-600 text-white text-[10px]">Accepting Deposits</Badge>,
                    <Badge variant="outline" className="text-[10px]">Live since Feb 2026</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Lend your FXRP in curated Morpho vaults for <strong>~2–5% variable yield</strong>. You can also borrow against your FXRP (USDT0 or FLR-backed). Claim and redeem anytime — no lock-ups.</p>
                <p className="text-xs text-muted-foreground italic">Separate website — not inside Xaman. You need FXRP in a Flare wallet first.</p>
                <div className="flex items-center gap-2 pt-1">
                  <a href="https://app.morpho.org/?network=flare" target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="button-morpho-link">
                      <ExternalLink className="h-3 w-3" /> Go to Morpho (Flare)
                    </Button>
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    earnXRP Vault (Upshift + Clearstar)
                  </p>
                  {renderVaultBadges(
                    "earnXRP",
                    <Badge variant="outline" className="text-[10px] border-red-500 text-red-600">FULL — Not Accepting Deposits</Badge>,
                    <Badge variant="outline" className="text-[10px]">~3.4% APY when open</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">The original Clearstar-curated vault. Two ways in: deposit FXRP directly on <strong>Upshift</strong> (web), or use the <strong>"Flare XRPFi Yield"</strong> xApp in Xaman. The xApp shows a "vault full" message when at capacity — tap "Notify me" to get alerted when deposits reopen.</p>
                <p className="text-xs text-muted-foreground italic">Separate website — not inside Xaman. You need FXRP in a Flare wallet first.</p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <a href="https://upshift.finance" target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="button-upshift-link">
                      <ExternalLink className="h-3 w-3" /> Open Upshift (earnXRP)
                    </Button>
                  </a>
                  <a href="https://xumm.app" target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="button-xaman-xapp-link">
                      <ExternalLink className="h-3 w-3" /> Open in Xaman (xApp)
                    </Button>
                  </a>
                </div>
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
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> Firelight & Morpho are live and accepting deposits</li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> $35M+ TVL in the ecosystem — real traction</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-orange-600 dark:text-orange-400">Risks & friction:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Bridging XRP → FXRP adds complexity — not one-click yet</li>
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Smart contract risk — bridge and DeFi protocol bugs</li>
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Variable yield — rates are estimates, not guaranteed</li>
                    <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" /> Flare network dependency — your XRP lives on Flare while earning</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Bottom Line
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Right now, the simplest path is to <strong>sign up for notifications</strong> in the Flare XRPFi Yield xApp and wait for the earnXRP vault to reopen or expand capacity. When it does, the one-tap bridge + deposit flow will work again.</p>
                <p>If you want to use Firelight or Morpho right now, you'll need to bridge your XRP to FXRP independently through the <a href="https://portal.flare.network" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Flare Portal</a> or Squid, then go to those platforms' websites with a Flare-compatible wallet. It's more steps, but it works.</p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-muted-foreground"><strong>Recommendation:</strong> If you do bridge, start small — test with 100-500 XRP to validate the full round-trip (bridge → deposit → earn → redeem → bridge back) before committing a larger position.</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
