import { useState, useMemo } from "react";
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

interface AmendmentStatus {
  xls65Active: boolean;
  xls66Active: boolean;
  vaultsLive: boolean;
  lendingLive: boolean;
  featureEnabled: boolean;
  rippled_minimum: string;
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

function AmendmentBanner({ status }: { status: AmendmentStatus }) {
  if (status.vaultsLive && status.lendingLive) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3" data-testid="amendment-active-banner">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
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
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">XLS-65 Vaults — Active on Mainnet</p>
            <p className="text-sm text-muted-foreground">Single Asset Vaults are live. You can browse on-ledger vaults and deposit.</p>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3" data-testid="amendment-lending-pending">
          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-amber-700 dark:text-amber-400">XLS-66 Lending Protocol</span> — still in validator voting (~17% of 80% needed). Lending features activate automatically when it passes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3" data-testid="amendment-pending-banner">
      <Clock className="h-5 w-5 text-amber-500 shrink-0" />
      <div>
        <p className="font-medium text-amber-700 dark:text-amber-400">Amendments Pending — Validator Voting in Progress</p>
        <p className="text-sm text-muted-foreground">
          XLS-65 (Vaults) and XLS-66 (Lending) require 80% validator consensus for 2 weeks on rippled {status.rippled_minimum}+. While pending, you can run yield calculations and set up trustlines. Features activate automatically the moment amendments pass.
        </p>
      </div>
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
            <p className="font-medium text-foreground mb-1">Single Asset Vaults (XLS-66)</p>
            <p>XLS-66 introduces native, on-ledger yield vaults to the XRP Ledger. Unlike DeFi protocols on Ethereum that rely on smart contracts, XLS-66 vaults are built directly into the XRPL's transaction engine (rippled v3.1+). This means:</p>
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

  const depositMutation = useMutation({
    mutationFn: async (vault: OnLedgerVault) => {
      const res = await apiRequest("POST", "/api/xls66/vault-deposit", {
        vaultId: vault.vaultId,
        amount: "100",
        asset: vault.asset,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.deepLink) {
        window.open(data.deepLink, "_blank");
      }
      toast({
        title: "Deposit Request Created",
        description: "Open Xaman (Xumm) to sign the VaultDeposit transaction.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deposit Failed",
        description: error.message || "Could not create deposit request",
        variant: "destructive",
      });
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
                  onDeposit={(v) => depositMutation.mutate(v)}
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
    </div>
  );
}