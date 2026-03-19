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
import {
  Flame,
  Wallet,
  TrendingUp,
  Gift,
  CheckCircle,
  XCircle,
  ExternalLink,
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
  const [savedAddress, setSavedAddress] = useState(() => {
    try { return localStorage.getItem("flare_address") || ""; } catch { return ""; }
  });
  const [showGuide, setShowGuide] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
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
    setSavedAddress(addr);
    try { localStorage.setItem("flare_address", addr); } catch {}
    toast({ title: "Flare wallet connected", description: "Fetching your delegation and reward data..." });
  }

  function handleDisconnect() {
    setSavedAddress("");
    setFlareAddress("");
    try { localStorage.removeItem("flare_address"); } catch {}
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

      {!savedAddress ? (
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
              How FTSO Delegation Works
            </CardTitle>
            {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showGuide && (
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-orange-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Wrap FLR to WFLR</p>
                  <p>Use Bifrost Wallet or the Flare Portal to wrap your FLR tokens. Wrapping is instant and free (just gas). WFLR can be unwrapped back to FLR at any time.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-orange-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Delegate to FTSO Providers</p>
                  <p>Choose one or two FTSO data providers to delegate your WFLR to. Providers submit price data to the network — if they're accurate, you earn rewards proportional to your delegation.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-orange-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Claim Rewards</p>
                  <p>FTSO rewards are distributed every ~3.5 days (each reward epoch). You can claim them in Bifrost Wallet and re-delegate to compound your returns.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Gift className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Claim FlareDrops</p>
                  <p>In addition to FTSO rewards, monthly FlareDrop distributions run through January 2026. You must have WFLR (wrapped) to be eligible. Claim each month in Bifrost Wallet.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-medium">Recommended Tools:</p>
              <div className="flex flex-wrap gap-2">
                <a href="https://bifrostwallet.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Bifrost Wallet
                </a>
                <a href="https://portal.flare.network" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Flare Portal
                </a>
                <a href="https://flarescan.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <ExternalLink className="h-3 w-3" /> FlareScan Explorer
                </a>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
