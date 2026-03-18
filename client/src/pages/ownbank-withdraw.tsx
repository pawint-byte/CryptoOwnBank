import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import { calculateAccruedInterest, SOIL_VAULTS } from "@/lib/xrpl-client";
import { signPayment } from "@/lib/xumm-connector";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Lock,
  TrendingUp,
  ArrowDownToLine,
  Wallet,
  Crown,
  Clock,
  AlertCircle,
  CheckCircle2,
  Settings,
  Repeat,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { UserWallet } from "@shared/schema";

type ServerVault = {
  address: string;
  name: string;
  totalDeposited: string;
  principal: string;
  apr: string;
  interest: string;
  yieldReceived: string;
};

type AutoBuySettings = {
  enabled: boolean;
  percent: number;
  minAmount: string;
};

type AutoWithdrawSettings = {
  enabled: boolean;
  threshold: string;
  frequency: string;
  lastRunAt: string | null;
};

type AutoWithdrawLog = {
  id: string;
  vaultName: string | null;
  interestAmount: string;
  xrpConvertAmount: string | null;
  keepRlusdAmount: string | null;
  status: string;
  createdAt: string;
};

function AutoEarnAccumulateCard({ totalInterest, subscriptionTier }: { totalInterest: number; subscriptionTier: string }) {
  const { toast } = useToast();
  const [localPercent, setLocalPercent] = useState<number | null>(null);
  const [localMin, setLocalMin] = useState<string | null>(null);
  const [localThreshold, setLocalThreshold] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: buySettings, isLoading: buyLoading } = useQuery<AutoBuySettings>({
    queryKey: ["/api/auto-buy-xrp"],
  });

  const { data: withdrawSettings, isLoading: withdrawLoading } = useQuery<AutoWithdrawSettings>({
    queryKey: ["/api/auto-withdraw"],
  });

  const { data: historyData } = useQuery<{ logs: AutoWithdrawLog[] }>({
    queryKey: ["/api/auto-withdraw/history"],
    enabled: showHistory,
  });

  const updateBuyMutation = useMutation({
    mutationFn: async (updates: Partial<AutoBuySettings>) => {
      const res = await apiRequest("PATCH", "/api/auto-buy-xrp", updates);
      return res.json();
    },
    onSuccess: (data: AutoBuySettings) => {
      queryClient.setQueryData(["/api/auto-buy-xrp"], data);
      toast({ title: data.enabled ? "Auto-Buy XRP Enabled" : "Auto-Buy XRP Disabled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateWithdrawMutation = useMutation({
    mutationFn: async (updates: Partial<AutoWithdrawSettings>) => {
      const res = await apiRequest("PATCH", "/api/auto-withdraw", updates);
      return res.json();
    },
    onSuccess: (data: AutoWithdrawSettings) => {
      queryClient.setQueryData(["/api/auto-withdraw"], data);
      toast({ title: data.enabled ? "Auto-Withdraw Enabled" : "Auto-Withdraw Disabled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (buyLoading || withdrawLoading || !buySettings || !withdrawSettings) return null;

  const percent = localPercent ?? buySettings.percent;
  const minAmount = localMin ?? buySettings.minAmount;
  const threshold = localThreshold ?? withdrawSettings.threshold;
  const previewAmount = totalInterest * (percent / 100);
  const keepAmount = totalInterest * ((100 - percent) / 100);
  const isPremium = subscriptionTier === "premium" || subscriptionTier === "pro";
  const isFullyAutomatic = withdrawSettings.enabled && buySettings.enabled;

  return (
    <Card className={`border-[#00A4E4]/20 ${isFullyAutomatic ? "bg-[#00A4E4]/5" : ""}`} data-testid="card-auto-earn-accumulate">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00A4E4]/10">
              <Zap className="h-5 w-5 text-[#00A4E4]" />
            </div>
            <div>
              <CardTitle className="text-base">Earn & Accumulate XRP</CardTitle>
              <CardDescription>
                Fully automatic: withdraw interest + convert to XRP — no interaction needed
              </CardDescription>
            </div>
          </div>
          {!isPremium && (
            <Link href="/settings">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer" data-testid="badge-premium-required">
                <Crown className="w-3 h-3 mr-1" /> Premium
              </Badge>
            </Link>
          )}
        </div>
      </CardHeader>

      {isPremium && (
        <CardContent className="pt-0 space-y-5">
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#00A4E4]" />
              <p className="text-sm font-medium">How it works</p>
            </div>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Your RLUSD earns interest in the vault automatically</li>
              <li>When interest hits your threshold, the system sends a withdrawal request to your Xaman wallet</li>
              <li>You tap &quot;Approve&quot; in Xaman (push notification) — one tap</li>
              <li>If Auto-Buy XRP is on, a DEX offer is also pushed to convert RLUSD → XRP</li>
            </ol>
            {isFullyAutomatic && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <p className="text-xs text-green-500 font-medium">Fully automatic — you just approve in Xaman when notified</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-green-500" />
                <Label className="text-sm font-medium">Auto-Withdraw Interest</Label>
              </div>
              <Switch
                checked={withdrawSettings.enabled}
                onCheckedChange={(checked) => updateWithdrawMutation.mutate({ enabled: checked })}
                disabled={updateWithdrawMutation.isPending}
                data-testid="switch-auto-withdraw"
              />
            </div>

            {withdrawSettings.enabled && (
              <div className="space-y-3 pl-6 border-l-2 border-green-500/20">
                <div className="space-y-2">
                  <Label className="text-xs">Withdraw when interest reaches</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={localThreshold ?? withdrawSettings.threshold}
                      onChange={(e) => setLocalThreshold(e.target.value)}
                      onBlur={() => {
                        if (localThreshold && parseFloat(localThreshold) > 0) {
                          updateWithdrawMutation.mutate({ threshold: localThreshold });
                        }
                        setLocalThreshold(null);
                      }}
                      min="1"
                      step="1"
                      className="font-mono h-8 w-32"
                      data-testid="input-auto-withdraw-threshold"
                    />
                    <span className="text-xs text-muted-foreground">RLUSD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Check frequency</Label>
                  <Select
                    value={withdrawSettings.frequency}
                    onValueChange={(v) => updateWithdrawMutation.mutate({ frequency: v })}
                  >
                    <SelectTrigger className="h-8 w-40" data-testid="select-auto-withdraw-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {withdrawSettings.lastRunAt && (
                  <p className="text-xs text-muted-foreground">
                    Last checked: {new Date(withdrawSettings.lastRunAt).toLocaleDateString()} at {new Date(withdrawSettings.lastRunAt).toLocaleTimeString()}
                  </p>
                )}

                {totalInterest > 0 && (
                  <div className="p-2 rounded bg-muted/30 text-xs">
                    {totalInterest >= parseFloat(threshold) ? (
                      <span className="text-green-500 font-medium">
                        Current interest ({totalInterest.toFixed(4)} RLUSD) meets your threshold — next check will trigger a withdrawal push to Xaman.
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Current interest: {totalInterest.toFixed(4)} RLUSD — needs {(parseFloat(threshold) - totalInterest).toFixed(4)} more to trigger.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-[#00A4E4]" />
                <Label className="text-sm font-medium">Auto-Buy XRP</Label>
              </div>
              <Switch
                checked={buySettings.enabled}
                onCheckedChange={(checked) => updateBuyMutation.mutate({ enabled: checked })}
                disabled={updateBuyMutation.isPending}
                data-testid="switch-auto-buy-xrp"
              />
            </div>

            {buySettings.enabled && (
              <div className="space-y-3 pl-6 border-l-2 border-[#00A4E4]/20">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Convert to XRP</Label>
                    <span className="text-xs font-mono font-medium" data-testid="text-auto-buy-percent">{percent}%</span>
                  </div>
                  <Slider
                    value={[percent]}
                    onValueChange={([v]) => setLocalPercent(v)}
                    onValueCommit={([v]) => {
                      setLocalPercent(null);
                      updateBuyMutation.mutate({ percent: v });
                    }}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                    data-testid="slider-auto-buy-percent"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Minimum RLUSD to trigger buy</Label>
                  <Input
                    type="number"
                    value={localMin ?? buySettings.minAmount}
                    onChange={(e) => setLocalMin(e.target.value)}
                    onBlur={() => {
                      if (localMin && parseFloat(localMin) > 0) {
                        updateBuyMutation.mutate({ minAmount: localMin });
                      }
                      setLocalMin(null);
                    }}
                    min="1"
                    step="1"
                    className="font-mono h-8"
                    data-testid="input-auto-buy-min"
                  />
                </div>
              </div>
            )}

            {buySettings.enabled && totalInterest > 0 && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Preview based on current interest:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Buy XRP with</p>
                    <p className="text-sm font-bold font-mono text-[#00A4E4]" data-testid="text-preview-buy">
                      {previewAmount.toFixed(4)} RLUSD
                    </p>
                  </div>
                  {percent < 100 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Keep as RLUSD</p>
                      <p className="text-sm font-bold font-mono text-green-500" data-testid="text-preview-keep">
                        {keepAmount.toFixed(4)} RLUSD
                      </p>
                    </div>
                  )}
                </div>
                {parseFloat(minAmount) > totalInterest && (
                  <p className="text-xs text-amber-400 mt-2">
                    Current interest ({totalInterest.toFixed(4)} RLUSD) is below your buy minimum ({minAmount} RLUSD) — auto-buy won&apos;t trigger yet.
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs"
              data-testid="button-toggle-history"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {showHistory ? "Hide History" : "View History"}
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Non-custodial — you always approve in Xaman</span>
            </div>
          </div>

          {showHistory && (
            <div className="space-y-2">
              {historyData?.logs && historyData.logs.length > 0 ? (
                historyData.logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                    <div>
                      <span className="font-medium">{log.vaultName || "Vault"}</span>
                      <span className="text-muted-foreground ml-2">
                        {parseFloat(log.interestAmount).toFixed(4)} RLUSD
                        {log.xrpConvertAmount && parseFloat(log.xrpConvertAmount) > 0 && (
                          <span className="text-[#00A4E4]"> → {parseFloat(log.xrpConvertAmount).toFixed(4)} to XRP</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        log.status === "pushed" ? "border-blue-500/30 text-blue-500" :
                        log.status === "completed" ? "border-green-500/30 text-green-500" :
                        "border-red-500/30 text-red-500"
                      }>
                        {log.status}
                      </Badge>
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-3">No auto-withdraw history yet</p>
              )}
            </div>
          )}
        </CardContent>
      )}

      {!isPremium && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Upgrade to Premium ($29/mo) to enable fully automatic interest withdrawal and XRP accumulation. Set your threshold, and the system handles everything — just approve in Xaman when notified.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default function OwnBankWithdraw() {
  const {
    isConnected,
    walletAddress,
    walletType,
    spendingWallet,
    vaultDeposits: localVaultDeposits,
  } = useXrplStore();
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVaultAddress, setSelectedVaultAddress] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWithdrawWallet, setSelectedWithdrawWallet] = useState<string>("");
  const [serverVaults, setServerVaults] = useState<ServerVault[]>([]);
  const [syncingVaults, setSyncingVaults] = useState(false);
  const [vaultsSynced, setVaultsSynced] = useState(false);

  const { data: tierData } = useQuery<{ tier: string; billingCycle: string }>({
    queryKey: ["/api/effective-tier"],
  });
  const effectiveTier = tierData?.tier || "free";

  const { data: savedWallets = [] } = useQuery<UserWallet[]>({
    queryKey: ["/api/user-wallets"],
  });

  const syncVaultsFromServer = useCallback(async () => {
    if (!walletAddress) return;
    setSyncingVaults(true);
    try {
      const response = await apiRequest("POST", "/api/soil/sync", {
        walletAddress,
        walletType: walletType || "xumm",
      });
      const data = await response.json();
      if (data.success && data.summary?.vaults) {
        setServerVaults(data.summary.vaults);
      }
    } catch (err: unknown) {
      console.error("[Withdraw] Vault sync error:", err);
    } finally {
      setSyncingVaults(false);
      setVaultsSynced(true);
    }
  }, [walletAddress, walletType]);

  useEffect(() => {
    if (isConnected && walletAddress && !vaultsSynced) {
      syncVaultsFromServer();
    }
  }, [isConnected, walletAddress, vaultsSynced, syncVaultsFromServer]);

  const mergedVaults = (() => {
    if (serverVaults.length > 0) {
      return serverVaults.map((sv) => ({
        vaultAddress: sv.address,
        vaultName: sv.name,
        principal: parseFloat(sv.principal) || 0,
        apr: parseFloat(sv.apr) || 0,
        interest: parseFloat(sv.interest) || 0,
        totalDeposited: parseFloat(sv.totalDeposited) || 0,
        yieldReceived: parseFloat(sv.yieldReceived) || 0,
      }));
    }
    return localVaultDeposits.map((dep) => ({
      vaultAddress: dep.vaultId,
      vaultName: dep.vaultName,
      principal: dep.principal,
      apr: dep.apr,
      interest: calculateAccruedInterest(dep.principal, dep.apr, dep.depositDate),
      totalDeposited: dep.principal,
      yieldReceived: 0,
    }));
  })();

  const xrplWallets = savedWallets.filter((w) => w.chain === "xrpl");
  const yieldWallets = xrplWallets.filter((w) => w.purpose === "yield" || w.purpose === "spending");
  const primaryXrplWallet = xrplWallets.find((w) => w.isPrimary) || xrplWallets[0];
  const defaultWithdrawAddress = yieldWallets.length > 0 ? yieldWallets[0].address : (primaryXrplWallet?.address || spendingWallet || walletAddress);
  const withdrawTarget = selectedWithdrawWallet || defaultWithdrawAddress;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);

  const totalInterest = mergedVaults.reduce((sum, v) => sum + v.interest, 0);

  const handleWithdrawClick = (vaultAddress: string) => {
    if (!withdrawTarget) {
      toast({
        title: "No Wallet Set",
        description: "Please add a wallet in Settings before withdrawing.",
        variant: "destructive",
      });
      return;
    }
    setSelectedVaultAddress(vaultAddress);
    setShowPreview(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!selectedVaultAddress || !withdrawTarget) return;

    const vault = mergedVaults.find((v) => v.vaultAddress === selectedVaultAddress);
    if (!vault) return;

    const interest = vault.interest;

    if (interest <= 0) {
      toast({
        title: "No Interest Accrued",
        description: "You haven't earned any interest yet.",
        variant: "destructive",
      });
      setShowPreview(false);
      return;
    }

    setIsProcessing(true);
    try {
      if (walletType === "xumm") {
        const result = await signPayment(selectedVaultAddress, {
          currency: "RLUSD",
          value: interest.toFixed(6),
          issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
        }, {
          memos: [
            { MemoType: "withdraw-interest", MemoData: `Withdraw ${interest.toFixed(6)} RLUSD interest to ${withdrawTarget}` },
          ],
        });

        if (result.success) {
          toast({
            title: "Interest Withdrawn Successfully",
            description: `${formatCurrency(interest)} RLUSD interest claimed from ${vault.vaultName}.`,
          });
        } else {
          toast({
            title: "Withdrawal Failed",
            description: result.error || "Transaction was rejected",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Ledger Signing",
          description: "Please confirm the transaction on your Ledger device.",
        });
        await new Promise((r) => setTimeout(r, 2000));
        toast({
          title: "Interest Withdrawn Successfully",
          description: `${formatCurrency(interest)} RLUSD sent to your spending wallet.`,
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Withdrawal Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowPreview(false);
      setSelectedVaultAddress(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Withdraw Interest</h1>
          <p className="text-muted-foreground">
            Withdraw only earned interest — your principal stays protected
          </p>
        </div>
        <XrplDisclaimer />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect your wallet on the{" "}
              <Link href="/ownbank" className="text-[#00A4E4] underline">
                OwnBank Dashboard
              </Link>{" "}
              to view and withdraw interest.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedVault = selectedVaultAddress
    ? mergedVaults.find((v) => v.vaultAddress === selectedVaultAddress)
    : null;
  const selectedInterest = selectedVault?.interest || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Withdraw Interest</h1>
          <p className="text-muted-foreground">
            Withdraw only earned interest — your principal stays protected forever
          </p>
        </div>
        {!withdrawTarget && (
          <Link href="/settings">
            <Button variant="outline" data-testid="button-set-spending-wallet">
              <Settings className="h-4 w-4 mr-2" />
              Set Spending Wallet
            </Button>
          </Link>
        )}
      </div>

      <XrplDisclaimer />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Interest Earned</p>
                <p className="text-xl font-bold font-mono" data-testid="text-total-interest">
                  {formatCurrency(totalInterest)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00A4E4]/10">
                <Lock className="h-5 w-5 text-[#00A4E4]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Principal Locked</p>
                <p className="text-xl font-bold font-mono" data-testid="text-total-principal">
                  {formatCurrency(
                    mergedVaults.reduce((sum, v) => sum + v.principal, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Wallet className="h-5 w-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Withdraw To</p>
                {xrplWallets.length >= 1 ? (
                  <Select value={selectedWithdrawWallet || withdrawTarget} onValueChange={setSelectedWithdrawWallet}>
                    <SelectTrigger className="h-7 text-xs font-mono w-[180px] mt-0.5" data-testid="select-withdraw-wallet">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {xrplWallets.map((w) => (
                        <SelectItem key={w.id} value={w.address}>
                          {w.label} ({w.address.slice(0, 6)}...{w.address.slice(-4)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-mono truncate max-w-[150px]" data-testid="text-spending-wallet">
                    {withdrawTarget
                      ? `${withdrawTarget.slice(0, 8)}...${withdrawTarget.slice(-6)}`
                      : "Not set"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AutoEarnAccumulateCard
        totalInterest={totalInterest}
        subscriptionTier={effectiveTier}
      />

      {syncingVaults && mergedVaults.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground text-center">
              Loading vault deposits from XRPL...
            </p>
          </CardContent>
        </Card>
      ) : mergedVaults.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              No vault deposits found.{" "}
              <Link href="/ownbank/vaults" className="text-[#00A4E4] underline">
                Deposit RLUSD into a vault
              </Link>{" "}
              to start earning interest.
            </p>
            {vaultsSynced && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setVaultsSynced(false); }}
                data-testid="button-resync-vaults"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-sync from XRPL
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setVaultsSynced(false); }}
              disabled={syncingVaults}
              data-testid="button-refresh-vaults"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingVaults ? "animate-spin" : ""}`} />
              {syncingVaults ? "Syncing..." : "Refresh"}
            </Button>
          </div>
          {mergedVaults.map((vault) => {
            const soilVault = SOIL_VAULTS.find((v) => v.id === vault.vaultAddress);

            return (
              <Card key={vault.vaultAddress} data-testid={`card-vault-deposit-${vault.vaultAddress}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{vault.vaultName}</CardTitle>
                      <CardDescription>
                        {soilVault?.backing || "RWA-Backed"} · {vault.apr}% APR
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-green-500/30 text-green-500"
                    >
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Principal (Locked)
                        </span>
                      </div>
                      <p className="text-lg font-bold font-mono">
                        {formatCurrency(vault.principal)} RLUSD
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">
                          Accrued Interest
                        </span>
                      </div>
                      <p className="text-lg font-bold font-mono text-green-500">
                        {formatCurrency(vault.interest)} RLUSD
                      </p>
                    </div>
                  </div>

                  {vault.yieldReceived > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Yield already received: {formatCurrency(vault.yieldReceived)} RLUSD
                    </div>
                  )}

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 bg-[#00A4E4] hover:bg-[#0090cc] text-white"
                      onClick={() => handleWithdrawClick(vault.vaultAddress)}
                      disabled={vault.interest <= 0 || isProcessing}
                      data-testid={`button-withdraw-${vault.vaultAddress}`}
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-2" />
                      Withdraw {formatCurrency(vault.interest)} Interest
                    </Button>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent data-testid="dialog-withdraw-preview">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#00A4E4]" />
              Confirm Interest Withdrawal
            </DialogTitle>
            <DialogDescription>
              Review the withdrawal details before signing
            </DialogDescription>
          </DialogHeader>

          {selectedVault && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vault</span>
                  <span className="text-sm font-medium">{selectedVault.vaultName}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Interest to Withdraw
                  </span>
                  <span className="text-sm font-bold text-green-500 font-mono">
                    {formatCurrency(selectedInterest)} RLUSD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Principal (Remains Locked)
                  </span>
                  <span className="text-sm font-mono">
                    {formatCurrency(selectedVault.principal)} RLUSD
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Sending To
                  </span>
                  <span className="text-sm font-mono truncate max-w-[200px]">
                    {withdrawTarget}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-muted-foreground text-center">
                  Sending {formatCurrency(selectedInterest)} RLUSD interest to your
                  spending wallet. Your principal of{" "}
                  {formatCurrency(selectedVault.principal)} RLUSD remains locked
                  and protected in the vault.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              disabled={isProcessing}
              data-testid="button-cancel-withdraw"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#00A4E4] hover:bg-[#0090cc] text-white"
              onClick={handleConfirmWithdraw}
              disabled={isProcessing}
              data-testid="button-confirm-withdraw"
            >
              {isProcessing ? "Signing..." : "Sign & Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
