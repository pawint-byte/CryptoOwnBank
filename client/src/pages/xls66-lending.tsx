import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Zap,
  Vault,
  Calculator,
  TrendingUp,
  Shield,
  Lock,
  Rocket,
  RefreshCcw,
  ExternalLink,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Percent,
  Clock,
  Coins,
  Layers,
  Link2,
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  BarChart3,
} from "lucide-react";
import { SiRipple } from "react-icons/si";

interface OnLedgerVault {
  vaultId: string;
  owner: string;
  asset: string;
  assetRaw: any;
  assetsTotal: string;
  assetsAvailable: string;
  shareMptId: string | null;
  lossUnrealized: string;
  flags: number;
  hasFirstLossCapital: boolean;
}

interface Xls66Position {
  id: string;
  vaultId: string;
  walletAddress: string;
  depositAmount: string;
  sharesHeld: string;
  yieldEarned: string;
  yieldClaimed: string;
  autoReinvest: boolean;
  status: string;
  depositTxHash: string | null;
  depositedAt: string;
}

interface AmendmentVoting {
  name: string;
  enabled: boolean;
  count: number;
  threshold: number;
  validatorCount: number;
  percentage: number;
}

interface AmendmentStatus {
  xls65Active: boolean;
  xls66Active: boolean;
  vaultsLive: boolean;
  lendingLive: boolean;
  featureEnabled: boolean;
  rippled_minimum: string;
  voting?: {
    xls65: AmendmentVoting | null;
    xls66: AmendmentVoting | null;
    lastChecked: string | null;
  };
}

interface VaultsResponse {
  onLedgerVaults: OnLedgerVault[];
  vaultsLive: boolean;
  lendingLive: boolean;
  disclaimer: string;
}

interface YieldCalcResult {
  principal: number;
  finalAmount: number;
  yieldEarned: number;
  apr: number;
  effectiveApy: number;
  days: number;
  compounding: string;
}

const BORROWING_PROTOCOLS = [
  {
    name: "Aave",
    chains: ["Ethereum", "Polygon", "Arbitrum", "Base"],
    assets: ["ETH", "WBTC", "USDC", "USDT", "DAI"],
    rateRange: "2–12%",
    ltv: "50–80%",
    link: "https://app.aave.com",
    description: "The largest DeFi lending protocol. Variable and stable rates across 8+ chains.",
    riskLevel: "Medium",
  },
  {
    name: "Compound",
    chains: ["Ethereum", "Polygon", "Base"],
    assets: ["ETH", "WBTC", "USDC"],
    rateRange: "2–10%",
    ltv: "50–75%",
    link: "https://app.compound.finance",
    description: "Battle-tested protocol. Simplified single-asset markets in V3.",
    riskLevel: "Medium",
  },
  {
    name: "MakerDAO / Spark",
    chains: ["Ethereum"],
    assets: ["ETH", "WBTC", "DAI"],
    rateRange: "3–8%",
    ltv: "50–65%",
    link: "https://app.spark.fi",
    description: "Borrow DAI against ETH/WBTC. Governance-controlled stability fees.",
    riskLevel: "Low",
  },
  {
    name: "Venus",
    chains: ["BNB Chain"],
    assets: ["BNB", "USDC", "USDT", "BTCB"],
    rateRange: "3–15%",
    ltv: "50–80%",
    link: "https://app.venus.io",
    description: "Leading BNB Chain lending protocol with algorithmic rates.",
    riskLevel: "Medium",
  },
];

const COMMON_TRUSTLINES = [
  { currency: "524C555344000000000000000000000000000000", issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De", label: "RLUSD", displayCurrency: "RLUSD" },
  { currency: "USD", issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", label: "USD (Bitstamp)", displayCurrency: "USD" },
  { currency: "EUR", issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq", label: "EUR (GateHub)", displayCurrency: "EUR" },
];

function VotingProgressBar({ voting, label }: { voting: AmendmentVoting; label: string }) {
  const pct = voting.percentage;
  const barColor = voting.enabled ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-amber-500/70";
  return (
    <div className="space-y-1" data-testid={`voting-progress-${voting.name}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {voting.enabled ? (
            <span className="text-emerald-500 font-semibold">Active</span>
          ) : (
            <>{voting.count}/{voting.validatorCount} validators ({pct}% of 80% needed)</>
          )}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        <div className="relative -top-2.5 h-2.5" style={{ marginLeft: "80%" }}>
          <div className="w-px h-full bg-white/40" />
        </div>
      </div>
    </div>
  );
}

function AmendmentBanner({ status }: { status: AmendmentStatus }) {
  const v = status.voting;
  const lastChecked = v?.lastChecked ? new Date(v.lastChecked) : null;
  const timeAgo = lastChecked ? (() => {
    const mins = Math.round((Date.now() - lastChecked.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  })() : null;

  if (status.vaultsLive && status.lendingLive) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3" data-testid="amendment-active-banner">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">XLS-65 + XLS-66 Active on Mainnet</p>
          <p className="text-sm text-muted-foreground">Single Asset Vaults and the Lending Protocol are both live. All features are fully operational.</p>
        </div>
      </div>
    );
  }

  if (status.vaultsLive && !status.lendingLive) {
    return (
      <div className="space-y-2">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3" data-testid="amendment-vaults-active">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">XLS-65 Vaults — Active on Mainnet</p>
            <p className="text-sm text-muted-foreground">Single Asset Vaults are live. You can browse on-ledger vaults and deposit.</p>
            {v?.xls65 && <div className="mt-2"><VotingProgressBar voting={v.xls65} label="XLS-65 Single Asset Vaults" /></div>}
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4" data-testid="amendment-lending-pending">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 dark:text-amber-400">XLS-66 Lending Protocol — Validator Voting</p>
              <p className="text-xs text-muted-foreground">Lending features activate automatically when this reaches 80% for 2 consecutive weeks.</p>
            </div>
          </div>
          {v?.xls66 && <VotingProgressBar voting={v.xls66} label="XLS-66 Lending Protocol" />}
          {timeAgo && <p className="text-xs text-muted-foreground mt-2">Last checked from XRPL: {timeAgo}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4" data-testid="amendment-pending-banner">
      <div className="flex items-center gap-3 mb-3">
        <Clock className="h-5 w-5 text-amber-500 shrink-0" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">Amendments Pending — Validator Voting in Progress</p>
          <p className="text-sm text-muted-foreground">
            Both amendments require 80% validator consensus for 2 consecutive weeks on rippled {status.rippled_minimum}+. Features activate automatically.
          </p>
        </div>
      </div>
      <div className="space-y-3 mt-2">
        {v?.xls65 && <VotingProgressBar voting={v.xls65} label="XLS-65 Single Asset Vaults" />}
        {v?.xls66 && <VotingProgressBar voting={v.xls66} label="XLS-66 Lending Protocol" />}
      </div>
      {timeAgo && <p className="text-xs text-muted-foreground mt-3">Last checked from XRPL: {timeAgo}</p>}
    </div>
  );
}

function truncAddr(addr: string) {
  return addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "Unknown";
}

function formatLedgerAmount(amount: string, asset: string): string {
  const n = parseFloat(amount);
  if (isNaN(n)) return "0";
  if (asset === "XRP") return (n / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function OnLedgerVaultCard({ vault, vaultsLive, onDeposit }: { vault: OnLedgerVault; vaultsLive: boolean; onDeposit: (v: OnLedgerVault) => void }) {
  const totalDisplay = formatLedgerAmount(vault.assetsTotal, vault.asset);
  const availableDisplay = formatLedgerAmount(vault.assetsAvailable, vault.asset);
  const totalNum = parseFloat(vault.assetsTotal) || 0;
  const availableNum = parseFloat(vault.assetsAvailable) || 0;
  const utilization = totalNum > 0 ? ((totalNum - availableNum) / totalNum) * 100 : 0;
  const hasLoss = parseFloat(vault.lossUnrealized) > 0;

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`vault-card-${vault.vaultId.slice(0, 8)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00A4E4]/10">
              <Vault className="h-5 w-5 text-[#00A4E4]" />
            </div>
            <div>
              <CardTitle className="text-base">{vault.asset} Vault</CardTitle>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{truncAddr(vault.vaultId)}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">On-Ledger</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-muted-foreground">Total Assets</p>
            <p className="font-medium">{totalDisplay} {vault.asset}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-muted-foreground">Available</p>
            <p className="font-medium">{availableDisplay} {vault.asset}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-muted-foreground">Vault Owner</p>
            <p className="font-medium font-mono">{truncAddr(vault.owner)}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-muted-foreground">Utilization</p>
            <p className="font-medium">{utilization.toFixed(1)}%</p>
          </div>
        </div>

        {totalNum > 0 && (
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-[#00A4E4] h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        )}

        {hasLoss && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Unrealized loss reported: {vault.lossUnrealized}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            size="sm"
            onClick={() => onDeposit(vault)}
            disabled={!vaultsLive}
            data-testid={`deposit-vault-${vault.vaultId.slice(0, 8)}`}
          >
            {vaultsLive ? (
              <>
                <Coins className="h-3.5 w-3.5 mr-1.5" />
                Deposit
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Pending
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://livenet.xrpl.org/accounts/${vault.owner}`, "_blank")}
            data-testid={`inspect-vault-${vault.vaultId.slice(0, 8)}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground italic leading-tight">
          On-chain data only. CryptoOwnBank does not endorse this vault. DYOR.
        </p>
      </CardContent>
    </Card>
  );
}

function PositionRow({ position, onToggleReinvest }: { position: Xls66Position; onToggleReinvest: (id: string, enabled: boolean) => void }) {
  const deposited = parseFloat(position.depositAmount);
  const earned = parseFloat(position.yieldEarned);
  const claimed = parseFloat(position.yieldClaimed);

  return (
    <div className="border rounded-lg p-4 space-y-3" data-testid={`position-${position.id}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Vault Position</p>
          <p className="text-xs text-muted-foreground font-mono">{position.walletAddress.slice(0, 8)}...{position.walletAddress.slice(-6)}</p>
        </div>
        <Badge variant={position.status === "active" ? "default" : "secondary"}>
          {position.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Deposited</p>
          <p className="font-medium">{deposited.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Yield Earned</p>
          <p className="font-medium text-emerald-600 dark:text-emerald-400">{earned.toFixed(6)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Claimed</p>
          <p className="font-medium">{claimed.toFixed(6)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">Auto-Reinvest</span>
        </div>
        <Switch
          checked={position.autoReinvest}
          onCheckedChange={(checked) => onToggleReinvest(position.id, checked)}
          data-testid={`toggle-reinvest-${position.id}`}
        />
      </div>

      {position.depositTxHash && (
        <a
          href={`https://livenet.xrpl.org/transactions/${position.depositTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#00A4E4] hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          View on XRPL Explorer
        </a>
      )}
    </div>
  );
}

function YieldCalculator() {
  const [amount, setAmount] = useState("10000");
  const [aprBps, setAprBps] = useState(800);
  const [days, setDays] = useState("365");
  const [compounding, setCompounding] = useState("daily");
  const [asset, setAsset] = useState("RLUSD");

  const calcMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/xls66/calculate-yield", {
        amount,
        aprBps,
        days,
        compounding,
      });
      return res.json() as Promise<YieldCalcResult>;
    },
  });

  const result = calcMutation.data;

  return (
    <Card data-testid="yield-calculator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-[#00A4E4]" />
          Yield Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="calc-amount">Deposit Amount</Label>
            <div className="flex gap-2">
              <Input
                id="calc-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000"
                data-testid="input-calc-amount"
              />
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger className="w-28" data-testid="select-calc-asset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XRP">XRP</SelectItem>
                  <SelectItem value="RLUSD">RLUSD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>APR: {(aprBps / 100).toFixed(1)}%</Label>
            <Slider
              value={[aprBps]}
              onValueChange={([v]) => setAprBps(v)}
              min={100}
              max={2000}
              step={25}
              className="mt-3"
              data-testid="slider-apr"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1%</span>
              <span>20%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calc-days">Duration (Days)</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger data-testid="select-calc-days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
                <SelectItem value="1095">3 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Compounding</Label>
            <Select value={compounding} onValueChange={setCompounding}>
              <SelectTrigger data-testid="select-compounding">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Compounding (Simple)</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => calcMutation.mutate()}
          disabled={calcMutation.isPending}
          className="w-full"
          data-testid="button-calculate"
        >
          {calcMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4 mr-2" />
          )}
          Calculate Yield
        </Button>

        {result && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3" data-testid="calc-result">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Principal</p>
                <p className="text-lg font-bold">{result.principal.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{asset}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Yield Earned</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{result.yieldEarned.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{asset}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Final Value</p>
                <p className="text-lg font-bold">{result.finalAmount.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{asset}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Effective APY</p>
                <p className="text-lg font-bold text-[#00A4E4]">{result.effectiveApy.toFixed(2)}%</p>
                <p className="text-[10px] text-muted-foreground">{result.compounding === "none" ? "simple" : result.compounding} compounding</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  {result.compounding !== "none"
                    ? `With ${result.compounding} compounding, your effective APY of ${result.effectiveApy.toFixed(2)}% exceeds the base APR of ${result.apr.toFixed(1)}% — earned yield is automatically re-deposited into the vault.`
                    : `Simple interest at ${result.apr.toFixed(1)}% APR. Enable auto-reinvest on your position to compound earnings automatically.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrustlineSetup() {
  const { toast } = useToast();
  const [settingUp, setSettingUp] = useState<string | null>(null);

  const trustlineMutation = useMutation({
    mutationFn: async (trustline: typeof COMMON_TRUSTLINES[0]) => {
      setSettingUp(trustline.label);
      const res = await apiRequest("POST", "/api/xls66/trustline", {
        currency: trustline.currency,
        issuer: trustline.issuer,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSettingUp(null);
      if (data.deepLink) {
        window.open(data.deepLink, "_blank");
      }
      toast({
        title: "Trustline Request Sent",
        description: "Open Xaman (Xumm) to sign the TrustSet transaction.",
      });
    },
    onError: (error: any) => {
      setSettingUp(null);
      toast({
        title: "Failed",
        description: error.message || "Could not create trustline request",
        variant: "destructive",
      });
    },
  });

  return (
    <Card data-testid="trustline-setup">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-[#00A4E4]" />
          Trustline Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Before depositing tokens into XLS-66 vaults, your XRPL wallet needs trustlines for each asset. Set them up in one click below.
        </p>

        <div className="space-y-2">
          {COMMON_TRUSTLINES.map((tl) => (
            <div key={tl.label} className="flex items-center justify-between border rounded-lg p-3" data-testid={`trustline-${tl.displayCurrency}`}>
              <div>
                <p className="font-medium text-sm">{tl.label}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{tl.issuer.slice(0, 12)}...{tl.issuer.slice(-6)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => trustlineMutation.mutate(tl)}
                disabled={settingUp === tl.label}
                data-testid={`button-trustline-${tl.displayCurrency}`}
              >
                {settingUp === tl.label ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Wallet className="h-3.5 w-3.5 mr-1.5" />
                    Set Trustline
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
          <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Trustlines are free to set on XRPL (only the standard ~0.0001 XRP transaction fee). They allow your wallet to hold issued tokens while you remain in full custody of your assets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BorrowingHub() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
        <Info className="h-5 w-5 text-[#00A4E4] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Cross-Chain Borrowing</p>
          <p className="text-xs text-muted-foreground mt-1">
            While XLS-66 brings native lending to XRPL, these established protocols on other chains let you borrow against crypto collateral today. All are non-custodial — you control your wallet and keys.
          </p>
        </div>
      </div>

      {BORROWING_PROTOCOLS.map((protocol) => (
        <Card key={protocol.name} className="hover:shadow-sm transition-shadow" data-testid={`borrowing-${protocol.name}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Layers className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium">{protocol.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {protocol.chains.slice(0, 3).map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0">{c}</Badge>
                    ))}
                    {protocol.chains.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{protocol.chains.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{protocol.rateRange}</p>
                  <p className="text-[10px] text-muted-foreground">Borrow Rate</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(expanded === protocol.name ? null : protocol.name)}
                >
                  {expanded === protocol.name ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {expanded === protocol.name && (
              <div className="mt-4 pt-3 border-t space-y-3">
                <p className="text-sm text-muted-foreground">{protocol.description}</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-muted-foreground">LTV Range</p>
                    <p className="font-medium">{protocol.ltv}</p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-muted-foreground">Risk Level</p>
                    <p className="font-medium">{protocol.riskLevel}</p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-muted-foreground">Collateral</p>
                    <p className="font-medium">{protocol.assets.slice(0, 3).join(", ")}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(protocol.link, "_blank")}
                  data-testid={`link-${protocol.name}`}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Open {protocol.name}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DepositModal({ vault, open, onClose }: { vault: OnLedgerVault | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [payloadUuid, setPayloadUuid] = useState<string | null>(null);
  const [pollStatus, setPollStatus] = useState<"idle" | "waiting" | "signed" | "rejected">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanUp = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPayloadUuid(null);
    setPollStatus("idle");
    setAmount("");
  }, []);

  useEffect(() => {
    if (!open) cleanUp();
    return () => cleanUp();
  }, [open, cleanUp]);

  useEffect(() => {
    if (!payloadUuid || pollStatus !== "waiting") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/xumm/status/${payloadUuid}`);
        const data = await res.json();
        if (data.resolved) {
          if (data.signed) {
            setPollStatus("signed");
            toast({ title: "Transaction Signed", description: `VaultDeposit signed by ${data.account?.slice(0, 8)}...` });
            queryClient.invalidateQueries({ queryKey: ["/api/xls66/positions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/xls66/vaults"] });
          } else {
            setPollStatus("rejected");
            toast({ title: "Transaction Rejected", description: "You declined the deposit in Xaman.", variant: "destructive" });
          }
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [payloadUuid, pollStatus, toast]);

  const depositMutation = useMutation({
    mutationFn: async () => {
      if (!vault) throw new Error("No vault selected");
      const res = await apiRequest("POST", "/api/xls66/vault-deposit", {
        vaultId: vault.vaultId,
        amount,
        asset: vault.asset,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPayloadUuid(data.uuid);
      setPollStatus("waiting");
      if (data.deepLink) {
        window.open(data.deepLink, "_blank");
      }
      toast({ title: "Deposit Request Created", description: "Open Xaman to sign the VaultDeposit transaction." });
    },
    onError: (error: any) => {
      toast({ title: "Deposit Failed", description: error.message || "Could not create deposit request", variant: "destructive" });
    },
  });

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

  if (!vault) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="deposit-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#00A4E4]" />
            Deposit into Vault
          </DialogTitle>
          <DialogDescription>
            {vault.asset} vault owned by {truncAddr(vault.owner)}
          </DialogDescription>
        </DialogHeader>

        {pollStatus === "idle" && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Vault ID</p>
                <p className="font-mono font-medium">{truncAddr(vault.vaultId)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="font-medium">{formatLedgerAmount(vault.assetsAvailable, vault.asset)} {vault.asset}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Amount to Deposit</Label>
              <div className="flex gap-2">
                <Input
                  id="deposit-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`e.g. 100 ${vault.asset}`}
                  min="0"
                  step="any"
                  data-testid="input-deposit-amount"
                />
                <Badge variant="outline" className="shrink-0 self-center px-3 py-1.5">{vault.asset}</Badge>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2.5 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                You will sign a VaultDeposit transaction in Xaman. CryptoOwnBank never has custody of your funds. Verify the vault operator before depositing.
              </p>
            </div>
          </div>
        )}

        {pollStatus === "waiting" && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#00A4E4] mx-auto" />
            <p className="font-medium">Waiting for Xaman signature...</p>
            <p className="text-sm text-muted-foreground">Open Xaman on your phone and approve the VaultDeposit transaction for {amount} {vault.asset}.</p>
          </div>
        )}

        {pollStatus === "signed" && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-medium text-emerald-700 dark:text-emerald-400">Deposit Signed Successfully</p>
            <p className="text-sm text-muted-foreground">Your VaultDeposit of {amount} {vault.asset} has been signed and submitted to the XRPL.</p>
          </div>
        )}

        {pollStatus === "rejected" && (
          <div className="py-8 text-center space-y-3">
            <XCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="font-medium text-red-700 dark:text-red-400">Deposit Rejected</p>
            <p className="text-sm text-muted-foreground">You declined the transaction in Xaman. No funds were moved.</p>
          </div>
        )}

        <DialogFooter>
          {pollStatus === "idle" && (
            <Button
              onClick={() => depositMutation.mutate()}
              disabled={!isValid || depositMutation.isPending}
              className="w-full"
              data-testid="button-confirm-deposit"
            >
              {depositMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Coins className="h-4 w-4 mr-2" />
              )}
              Deposit {isValid ? `${parsedAmount} ${vault.asset}` : vault.asset}
            </Button>
          )}
          {(pollStatus === "signed" || pollStatus === "rejected") && (
            <Button onClick={onClose} className="w-full" variant={pollStatus === "signed" ? "default" : "outline"} data-testid="button-close-deposit">
              {pollStatus === "signed" ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadinessChecklist() {
  const walletsQuery = useQuery<any[]>({
    queryKey: ["/api/wallets"],
  });
  const xamanQuery = useQuery<any[]>({
    queryKey: ["/api/xaman-connections"],
  });
  const statusQuery = useQuery<AmendmentStatus>({
    queryKey: ["/api/xls66/status"],
  });

  const wallets = walletsQuery.data || [];
  const xamanConnections = xamanQuery.data || [];
  const status = statusQuery.data;

  const xrpWallets = wallets.filter((w: any) => w.chain === "xrp");
  const hasXrpWallet = xrpWallets.length > 0;
  const hasXamanConnected = xamanConnections.length > 0;
  const xamanLinkedAddresses = new Set(xamanConnections.map((c: any) => c.xrpAddress?.toLowerCase()));
  const hasXamanLinkedWallet = xrpWallets.some((w: any) => xamanLinkedAddresses.has(w.address?.toLowerCase()));
  const hasMultipleChains = new Set(wallets.map((w: any) => w.chain)).size > 1;

  const soilReady = hasXrpWallet && hasXamanConnected && hasXamanLinkedWallet;

  const amendmentPct = status?.voting?.xls66?.percentage ?? null;
  const amendmentActive = status?.voting?.xls66?.enabled || status?.lendingLive || false;

  const steps = [
    {
      label: "Create your CryptoOwnBank account",
      done: true,
      tip: "You're here — done!",
    },
    {
      label: "Add an XRP Ledger wallet address",
      done: hasXrpWallet,
      tip: hasXrpWallet
        ? `${xrpWallets.length} XRP wallet${xrpWallets.length > 1 ? "s" : ""} added`
        : "Go to Portfolio → Wallets and add your XRP address. This is the address that will interact with XLS-66 vaults.",
      href: "/wallets",
    },
    {
      label: "Connect Xaman (signing app)",
      done: hasXamanConnected,
      tip: hasXamanConnected
        ? `${xamanConnections.length} Xaman connection${xamanConnections.length > 1 ? "s" : ""} active`
        : "Xaman is how you sign transactions — from your phone or via Ledger Bluetooth. It doesn't hold your crypto; the XRPL does.",
      href: "/wallets",
    },
    {
      label: "Link Xaman to your XRP wallet for signing",
      done: hasXamanLinkedWallet,
      tip: hasXamanLinkedWallet
        ? "Your XRP wallet is linked to Xaman — ready to sign vault deposits"
        : "On the Wallets page, click 'Link to Xaman' next to your XRP wallet. This lets CryptoOwnBank send signing requests to your device.",
      href: "/wallets",
    },
    {
      label: "Have XRP in your wallet for transaction fees",
      done: hasXrpWallet,
      tip: hasXrpWallet
        ? "Every XRPL transaction costs a fraction of a penny in XRP. You also need a 10 XRP reserve (XRPL requirement for all active wallets)."
        : "You'll need a small amount of XRP to pay transaction fees (fractions of a penny) and the 10 XRP wallet reserve required by the XRPL.",
    },
    {
      label: "RLUSD trustline (for RLUSD vaults only)",
      done: soilReady,
      tip: soilReady
        ? "Already using Soil vaults? Your RLUSD trustline is already set up — you're good to go. If depositing into XRP-only vaults, no trustline needed."
        : "Required only if you want to deposit into RLUSD vaults. XRP vaults don't need a trustline. Use the Trustlines tab below to set it up.",
      action: "trustlines",
    },
    {
      label: "Track your portfolio across multiple chains",
      done: hasMultipleChains,
      tip: hasMultipleChains
        ? `Tracking wallets across ${new Set(wallets.map((w: any) => w.chain)).size} chains — your full portfolio in one place`
        : "Optional but recommended: add wallets from other chains (ETH, SOL, ADA, etc.) to see your full portfolio in one dashboard",
      href: "/wallets",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalSteps = steps.length;
  const pct = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;

  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border-2 border-[#00A4E4]/30" data-testid="readiness-checklist">
      <CardHeader className="pb-3">
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid="toggle-readiness-checklist"
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-[#00A4E4]" />
            Are You Ready for XLS-66?
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge className={allDone ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" : "bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/30"}>
              {completedCount}/{totalSteps} complete
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Readiness</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${allDone ? "bg-emerald-500" : "bg-[#00A4E4]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {soilReady && !amendmentActive && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-3" data-testid="soil-ready-banner">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Soil vault member? You're at the finish line.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You already have your XRP wallet, Xaman connected, and RLUSD trustline from using Soil vaults. 
                  XLS-66 uses the exact same setup — same wallet, same Xaman signing, same keys. When validators 
                  hit 80%{amendmentPct !== null ? ` (currently at ${amendmentPct}%)` : ""}, you can start lending on day one 
                  with zero additional setup.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {amendmentActive
              ? "XLS-66 is live! Complete these steps to start depositing into on-ledger vaults."
              : soilReady
                ? "Review the checklist below to confirm everything is in place. Most of it should already be green."
                : amendmentPct !== null
                  ? `Validators are at ${amendmentPct}% (need 80% for 2 weeks). Do your homework now so you're ready to deposit the moment it activates.`
                  : "Do your homework now so you're ready the moment XLS-66 activates. When validators hit 80%, you'll be first in line."}
          </p>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  step.done
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-muted/30 border-border hover:border-[#00A4E4]/30"
                }`}
                data-testid={`readiness-step-${i}`}
              >
                <div className="mt-0.5">
                  {step.done ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.tip}</p>
                </div>
                {!step.done && step.href && (
                  <a href={step.href}>
                    <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" data-testid={`readiness-action-${i}`}>
                      Go <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>

          {allDone && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {soilReady 
                  ? "You're 100% ready. Same wallet, same Xaman, same signing — when XLS-66 activates, you can start lending immediately."
                  : "You're 100% ready! When XLS-66 activates, you can deposit into vaults immediately."}
              </p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[#00A4E4]" />
              How signing works with XLS-66
            </p>
            <p className="text-xs text-muted-foreground">
              CryptoOwnBank builds the transaction (deposit, withdraw, trustline). You sign it in Xaman — 
              either on your phone (hot wallet) or via your Ledger hardware device connected through Bluetooth (cold wallet). 
              Your private keys never leave your device. Every transaction requires your explicit approval. 
              Same signing flow you already use for Soil vaults and DEX trades.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function XLS66Guide() {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-muted/30 border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setShow(!show)}
        data-testid="toggle-xls66-guide"
      >
        <span className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4 text-[#00A4E4]" />
          What is XLS-66 &amp; How Does It Work?
        </span>
        {show ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {show && (
        <div className="px-3 pb-3 space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Single Asset Vaults (XLS-65) &amp; Lending Protocol (XLS-66)</p>
            <p>XLS-65 introduces native, on-ledger Single Asset Vaults to the XRP Ledger. XLS-66 adds the Lending Protocol on top. Unlike DeFi on Ethereum that relies on smart contracts, these are built directly into the XRPL's transaction engine (rippled v3.1+). This means:</p>
            <ul className="mt-2 space-y-1 ml-4 list-disc">
              <li><strong>On-ledger execution</strong> — no smart contract risk, no bridge risk. Everything happens natively on XRPL.</li>
              <li><strong>Non-custodial</strong> — you deposit from your own wallet and receive vault shares as Multi-Purpose Tokens (MPTs). Your keys, your assets.</li>
              <li><strong>Transparent</strong> — vault balances, share ratios, and all transactions are publicly verifiable on the XRPL.</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">How Deposits Work</p>
            <p>1. Choose a vault (XRP or RLUSD) → 2. Sign the VaultDeposit transaction in Xaman → 3. Receive vault shares (MPTs) proportional to your deposit → 4. Earn yield as the vault's asset total grows → 5. Withdraw anytime by redeeming shares via VaultWithdraw.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Auto-Reinvest</p>
            <p>When enabled, earned yield is automatically re-deposited into the same vault, compounding your returns. This is tracked off-chain by CryptoOwnBank and executed via signed Xaman transactions on your behalf — you always approve every transaction.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Lending (Future Phase)</p>
            <p>XLS-66 also proposes native lending primitives — collateralized loans directly on the XRPL. When activated, you'll be able to lend XRP/RLUSD to borrowers and earn interest, or borrow against your holdings, all without leaving the ledger.</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Risk Disclosure
            </p>
            <p className="text-xs mt-1">
              XLS-66 vaults carry inherent risks including vault operator risk, liquidity risk, and potential impermanent loss. Always verify vault operators and never deposit more than you can afford to lose. CryptoOwnBank does not control any vault and does not custody your assets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function XLS66LendingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("vaults");
  const [depositVault, setDepositVault] = useState<OnLedgerVault | null>(null);

  const statusQuery = useQuery<AmendmentStatus>({
    queryKey: ["/api/xls66/status"],
    enabled: !!user,
  });

  const limitsQuery = useQuery<any>({
    queryKey: ["/api/subscription/limits"],
    enabled: !!user,
  });

  const vaultsQuery = useQuery<VaultsResponse>({
    queryKey: ["/api/xls66/vaults"],
    enabled: !!user && limitsQuery.data?.xls66Lending === true,
  });

  const positionsQuery = useQuery<{ positions: Xls66Position[] }>({
    queryKey: ["/api/xls66/positions"],
    enabled: !!user && limitsQuery.data?.xls66Lending === true,
  });

  const reinvestMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("POST", `/api/xls66/positions/${id}/auto-reinvest`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/xls66/positions"] });
      toast({ title: "Updated", description: "Auto-reinvest setting saved." });
    },
  });

  const status = statusQuery.data;
  const hasAccess = limitsQuery.data?.xls66Lending === true;
  const isLoading = limitsQuery.isLoading || statusQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00A4E4]/10">
            <Zap className="h-6 w-6 text-[#00A4E4]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">XLS-66 Native Lending</h1>
            <p className="text-sm text-muted-foreground">XRPL Single Asset Vaults &amp; On-Ledger Lending</p>
          </div>
        </div>

        <UpgradePrompt
          feature="XLS-66 Native Lending"
          requiredTier="pro"
          description="XLS-66 lending gives you access to native XRPL yield vaults, on-ledger lending pools, and auto-compounding — all non-custodial. Upgrade to Pro to unlock this feature."
        />

        <XLS66Guide />
      </div>
    );
  }

  const onLedgerVaults = vaultsQuery.data?.onLedgerVaults || [];
  const vaultsLive = vaultsQuery.data?.vaultsLive || status?.vaultsLive || false;
  const positions = positionsQuery.data?.positions || [];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6" data-testid="xls66-lending-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00A4E4]/10">
            <Zap className="h-6 w-6 text-[#00A4E4]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">XLS-66 Native Lending</h1>
            <p className="text-sm text-muted-foreground">XRPL Single Asset Vaults &amp; On-Ledger Lending</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SiRipple className="h-4 w-4 text-[#00A4E4]" />
          <Badge variant="outline" className="text-xs">
            rippled {status?.rippled_minimum || "3.1.0"}+
          </Badge>
        </div>
      </div>

      {status && <AmendmentBanner status={status} />}

      {!status?.lendingLive && <ReadinessChecklist />}

      {positions.length > 0 && (
        <Card data-testid="positions-summary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-[#00A4E4]" />
              Your Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Deposited</p>
                <p className="text-xl font-bold">{positions.reduce((s, p) => s + parseFloat(p.depositAmount), 0).toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Yield Earned</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  +{positions.reduce((s, p) => s + parseFloat(p.yieldEarned), 0).toFixed(6)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Active Positions</p>
                <p className="text-xl font-bold">{positions.filter(p => p.status === "active").length}</p>
              </div>
            </div>
            <div className="space-y-3">
              {positions.map((pos) => (
                <PositionRow
                  key={pos.id}
                  position={pos}
                  onToggleReinvest={(id, enabled) => reinvestMutation.mutate({ id, enabled })}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4" data-testid="xls66-tabs">
          <TabsTrigger value="vaults" data-testid="tab-vaults">
            <Vault className="h-4 w-4 mr-1.5" />
            Vaults
          </TabsTrigger>
          <TabsTrigger value="calculator" data-testid="tab-calculator">
            <Calculator className="h-4 w-4 mr-1.5" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="trustlines" data-testid="tab-trustlines">
            <Link2 className="h-4 w-4 mr-1.5" />
            Trustlines
          </TabsTrigger>
          <TabsTrigger value="borrowing" data-testid="tab-borrowing">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Borrow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vaults" className="mt-4 space-y-4">
          {vaultsQuery.data?.disclaimer && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2" data-testid="vault-disclaimer">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{vaultsQuery.data.disclaimer}</p>
            </div>
          )}

          {vaultsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Querying XRPL ledger for vaults...</span>
            </div>
          ) : onLedgerVaults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onLedgerVaults.map((vault) => (
                <OnLedgerVaultCard
                  key={vault.vaultId}
                  vault={vault}
                  vaultsLive={vaultsLive}
                  onDeposit={(v) => setDepositVault(v)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Vault className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg">No On-Ledger Vaults Found</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  {vaultsLive
                    ? "No Vault objects discovered on the XRPL ledger yet. Vault operators can create Single Asset Vaults using the VaultCreate transaction type."
                    : "XLS-65 vaults will appear here once the amendment activates on XRPL mainnet. While pending, explore the yield calculator and set up your trustlines."}
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button variant="outline" onClick={() => setActiveTab("calculator")} data-testid="cta-calculator">
                    <Calculator className="h-4 w-4 mr-2" />
                    Try Yield Calculator
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("trustlines")} data-testid="cta-trustlines">
                    <Link2 className="h-4 w-4 mr-2" />
                    Set Up Trustlines
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <XLS66Guide />
        </TabsContent>

        <TabsContent value="calculator" className="mt-4">
          <YieldCalculator />
        </TabsContent>

        <TabsContent value="trustlines" className="mt-4">
          <TrustlineSetup />
        </TabsContent>

        <TabsContent value="borrowing" className="mt-4">
          <BorrowingHub />
        </TabsContent>
      </Tabs>

      <DepositModal
        vault={depositVault}
        open={!!depositVault}
        onClose={() => setDepositVault(null)}
      />
    </div>
  );
}