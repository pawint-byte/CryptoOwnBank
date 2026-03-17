import { useState } from "react";
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

type AutoBuySettings = {
  enabled: boolean;
  percent: number;
  minAmount: string;
};

function AutoBuyXrpCard({ totalInterest, subscriptionTier }: { totalInterest: number; subscriptionTier: string }) {
  const { toast } = useToast();
  const [localPercent, setLocalPercent] = useState<number | null>(null);
  const [localMin, setLocalMin] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<AutoBuySettings>({
    queryKey: ["/api/auto-buy-xrp"],
  });

  const updateMutation = useMutation({
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

  if (isLoading || !settings) return null;

  const percent = localPercent ?? settings.percent;
  const minAmount = localMin ?? settings.minAmount;
  const previewAmount = totalInterest * (percent / 100);
  const keepAmount = totalInterest * ((100 - percent) / 100);
  const isPremium = subscriptionTier === "premium" || subscriptionTier === "pro";

  return (
    <Card className={`border-[#00A4E4]/20 ${settings.enabled ? "bg-[#00A4E4]/5" : ""}`} data-testid="card-auto-buy-xrp">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00A4E4]/10">
              <Zap className="h-5 w-5 text-[#00A4E4]" />
            </div>
            <div>
              <CardTitle className="text-base">Earn & Accumulate XRP</CardTitle>
              <CardDescription>
                Automatically convert RLUSD interest into XRP on the DEX
              </CardDescription>
            </div>
          </div>
          {isPremium ? (
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateMutation.mutate({ enabled: checked })}
              disabled={updateMutation.isPending}
              data-testid="switch-auto-buy-xrp"
            />
          ) : (
            <Link href="/settings">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer" data-testid="badge-premium-required">
                <Crown className="w-3 h-3 mr-1" /> Premium
              </Badge>
            </Link>
          )}
        </div>
      </CardHeader>

      {settings.enabled && isPremium && (
        <CardContent className="pt-0 space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p>When your vault interest is withdrawn, <strong>{percent}%</strong> will automatically create a DEX offer to buy XRP with RLUSD. You approve the trade in Xaman — one tap, same wallet, same chain.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Convert to XRP</Label>
                <span className="text-sm font-mono font-medium" data-testid="text-auto-buy-percent">{percent}%</span>
              </div>
              <Slider
                value={[percent]}
                onValueChange={([v]) => setLocalPercent(v)}
                onValueCommit={([v]) => {
                  setLocalPercent(null);
                  updateMutation.mutate({ percent: v });
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
              <Label className="text-sm">Minimum RLUSD to trigger buy</Label>
              <Input
                type="number"
                value={localMin ?? settings.minAmount}
                onChange={(e) => setLocalMin(e.target.value)}
                onBlur={() => {
                  if (localMin && parseFloat(localMin) > 0) {
                    updateMutation.mutate({ minAmount: localMin });
                  }
                  setLocalMin(null);
                }}
                min="1"
                step="1"
                className="font-mono"
                data-testid="input-auto-buy-min"
              />
              <p className="text-xs text-muted-foreground">
                Won&apos;t trigger a buy if accrued interest is below this amount
              </p>
            </div>
          </div>

          {totalInterest > 0 && (
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
                  Current interest ({totalInterest.toFixed(4)} RLUSD) is below your minimum ({minAmount} RLUSD) — auto-buy won&apos;t trigger yet.
                </p>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Repeat className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#00A4E4]" />
            <p>Each auto-buy creates a pending DEX offer (RLUSD → XRP) that you approve in Xaman. Your keys never leave your device — fully non-custodial.</p>
          </div>
        </CardContent>
      )}

      {!settings.enabled && isPremium && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Turn this on to automatically convert your vault interest earnings into XRP. Choose how much to convert (10–100%) and set a minimum threshold. Each buy goes through the XRPL DEX and requires your approval in Xaman.
          </p>
        </CardContent>
      )}

      {!isPremium && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Upgrade to Premium ($29/mo) to automatically convert your vault interest into XRP. Set your percentage, minimum amount, and let your earnings accumulate XRP hands-free.
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
    vaultDeposits,
    subscriptionTier,
  } = useXrplStore();
  const { toast } = useToast();
  const [withdrawingVault, setWithdrawingVault] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWithdrawWallet, setSelectedWithdrawWallet] = useState<string>("");

  const { data: savedWallets = [] } = useQuery<UserWallet[]>({
    queryKey: ["/api/user-wallets"],
  });

  const xrplWallets = savedWallets.filter((w) => w.chain === "xrpl");
  const yieldWallets = xrplWallets.filter((w) => w.purpose === "yield" || w.purpose === "spending");
  const primaryXrplWallet = xrplWallets.find((w) => w.isPrimary) || xrplWallets[0];
  const defaultWithdrawAddress = yieldWallets.length > 0 ? yieldWallets[0].address : (primaryXrplWallet?.address || spendingWallet);
  const withdrawTarget = selectedWithdrawWallet || defaultWithdrawAddress;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);

  const totalInterest = vaultDeposits.reduce((sum, dep) => {
    return sum + calculateAccruedInterest(dep.principal, dep.apr, dep.depositDate);
  }, 0);

  const handleWithdrawClick = (vaultId: string) => {
    if (!withdrawTarget) {
      toast({
        title: "No Wallet Set",
        description: "Please add a wallet in Settings before withdrawing.",
        variant: "destructive",
      });
      return;
    }
    setSelectedVaultId(vaultId);
    setShowPreview(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!selectedVaultId || !withdrawTarget) return;

    const deposit = vaultDeposits.find((d) => d.vaultId === selectedVaultId);
    if (!deposit) return;

    const interest = calculateAccruedInterest(
      deposit.principal,
      deposit.apr,
      deposit.depositDate
    );

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
        const result = await signPayment(withdrawTarget, {
          currency: "RLUSD",
          value: interest.toFixed(6),
          issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
        });

        if (result.success) {
          toast({
            title: "Interest Withdrawn Successfully",
            description: `${formatCurrency(interest)} RLUSD sent to your spending wallet.`,
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
    } catch (error: any) {
      toast({
        title: "Withdrawal Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowPreview(false);
      setSelectedVaultId(null);
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

  const selectedDeposit = selectedVaultId
    ? vaultDeposits.find((d) => d.vaultId === selectedVaultId)
    : null;
  const selectedInterest = selectedDeposit
    ? calculateAccruedInterest(
        selectedDeposit.principal,
        selectedDeposit.apr,
        selectedDeposit.depositDate
      )
    : 0;

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
                    vaultDeposits.reduce((sum, d) => sum + d.principal, 0)
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

      <AutoBuyXrpCard
        totalInterest={totalInterest}
        subscriptionTier={subscriptionTier}
      />

      {vaultDeposits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              No vault deposits yet.{" "}
              <Link href="/ownbank/vaults" className="text-[#00A4E4] underline">
                Deposit RLUSD into a vault
              </Link>{" "}
              to start earning interest.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {vaultDeposits.map((deposit) => {
            const vault = SOIL_VAULTS.find((v) => v.id === deposit.vaultId);
            const interest = calculateAccruedInterest(
              deposit.principal,
              deposit.apr,
              deposit.depositDate
            );
            const daysSinceDeposit = Math.floor(
              (Date.now() - new Date(deposit.depositDate).getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return (
              <Card key={deposit.vaultId} data-testid={`card-vault-deposit-${deposit.vaultId}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{deposit.vaultName}</CardTitle>
                      <CardDescription>
                        {vault?.backing || "RWA-Backed"} · {deposit.apr}% APR ·{" "}
                        {daysSinceDeposit} days
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
                        {formatCurrency(deposit.principal)} RLUSD
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
                        {formatCurrency(interest)} RLUSD
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 bg-[#00A4E4] hover:bg-[#0090cc] text-white"
                      onClick={() => handleWithdrawClick(deposit.vaultId)}
                      disabled={interest <= 0 || isProcessing}
                      data-testid={`button-withdraw-${deposit.vaultId}`}
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-2" />
                      Withdraw {formatCurrency(interest)} Interest
                    </Button>
                  </div>

                  {subscriptionTier === "free" && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Auto-Withdraw Available with Premium</p>
                        <p className="text-xs text-muted-foreground">
                          Automatically withdraw interest weekly — upgrade to Premium ($29/mo)
                        </p>
                      </div>
                      <Link href="/settings">
                        <Button size="sm" variant="outline" data-testid="button-upgrade-premium">
                          Upgrade
                        </Button>
                      </Link>
                    </div>
                  )}

                  {subscriptionTier === "premium" && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#00A4E4]/5 border border-[#00A4E4]/20">
                      <Clock className="h-5 w-5 text-[#00A4E4] shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Auto-Withdraw</p>
                        <p className="text-xs text-muted-foreground">
                          Weekly automatic interest withdrawal — Coming soon
                        </p>
                      </div>
                      <Badge variant="outline" className="border-[#00A4E4]/30 text-[#00A4E4]">
                        Soon
                      </Badge>
                    </div>
                  )}
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

          {selectedDeposit && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vault</span>
                  <span className="text-sm font-medium">{selectedDeposit.vaultName}</span>
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
                    {formatCurrency(selectedDeposit.principal)} RLUSD
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
                  {formatCurrency(selectedDeposit.principal)} RLUSD remains locked
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
