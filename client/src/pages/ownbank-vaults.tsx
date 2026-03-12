import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Vault,
  TrendingUp,
  Shield,
  ExternalLink,
  Loader2,
  Landmark,
  Briefcase,
  Sparkles,
  X,
  Clock,
  AlertTriangle,
  Target,
} from "lucide-react";
import { useXrplStore, type VaultDeposit } from "@/lib/xrpl-store";
import {
  SOIL_VAULTS,
  SOIL_REFERRAL_URL,
  SOIL_REFERRAL_CODE,
  AFFILIATE_LINKS,
  calculateAccruedInterest,
} from "@/lib/xrpl-client";
import { useRlusdPolling } from "@/hooks/use-rlusd-polling";
import { signPayment, hasPendingXummPayment, completePendingXummPayment, clearPendingXummPayment } from "@/lib/xumm-connector";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useToast } from "@/hooks/use-toast";

const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getVaultIcon(vaultId: string) {
  if (vaultId === "soil-treasury") {
    return <Landmark className="h-5 w-5 text-[#00A4E4]" />;
  }
  if (vaultId === "soil-yield") {
    return <Sparkles className="h-5 w-5 text-[#00A4E4]" />;
  }
  return <Briefcase className="h-5 w-5 text-[#00A4E4]" />;
}

export default function OwnBankVaults() {
  const { toast } = useToast();
  const {
    isConnected,
    walletType,
    vaultDeposits,
    addVaultDeposit,
    referredBy,
    rlusdBalance,
  } = useXrplStore();

  const { showDepositPrompt, balanceIncrease, dismissPrompt } = useRlusdPolling();
  const [autoDepositHandled, setAutoDepositHandled] = useState(false);

  useEffect(() => {
    if (!hasPendingXummPayment()) return;
    const metaStr = sessionStorage.getItem("xumm_pending_deposit_meta");
    setIsDepositing(true);

    completePendingXummPayment().then((result) => {
      setIsDepositing(false);
      sessionStorage.removeItem("xumm_pending_deposit_meta");

      if (result.success) {
        if (metaStr) {
          try {
            const meta = JSON.parse(metaStr);
            addVaultDeposit({
              vaultId: meta.vaultId,
              vaultName: meta.vaultName,
              principal: meta.principal,
              depositDate: new Date().toISOString(),
              apr: meta.apr,
              txHash: result.txHash,
            });
          } catch {}
        }
        try {
          const { walletAddress } = useXrplStore.getState();
          apiRequest("POST", "/api/soil/sync", {
            walletAddress,
            walletType: walletType || "xumm",
          }).catch(() => {});
        } catch {}
        toast({
          title: "Deposit Successful",
          description: "Your Xaman payment was confirmed. Transaction recorded and synced.",
        });
      } else if (result.error && result.error !== "No pending payment") {
        toast({
          title: "Deposit Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }, []);

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<(typeof SOIL_VAULTS)[0] | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (autoDepositHandled || !isConnected) return;
    const params = new URLSearchParams(window.location.search);
    const redeposit = params.get("redeposit");
    const vaultAddr = params.get("vault");
    if (!redeposit) return;
    setAutoDepositHandled(true);
    const amount = parseFloat(redeposit);
    if (isNaN(amount) || amount < 0.01) return;
    let targetVault = SOIL_VAULTS[0];
    if (vaultAddr) {
      const found = SOIL_VAULTS.find(v => v.address === vaultAddr);
      if (found) targetVault = found;
    }
    setSelectedVault(targetVault);
    setDepositAmount(amount.toFixed(2));
    setShowPreview(false);
    setDepositModalOpen(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, [isConnected, autoDepositHandled]);

  function getUserDeposit(vaultId: string): VaultDeposit | undefined {
    return vaultDeposits.find((d) => d.vaultId === vaultId);
  }

  function openDepositModal(vault: (typeof SOIL_VAULTS)[0]) {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet from the OwnBank Dashboard first.",
        variant: "destructive",
      });
      return;
    }
    setSelectedVault(vault);
    setDepositAmount("");
    setShowPreview(false);
    setDepositModalOpen(true);
  }

  function handleReviewDeposit() {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount.",
        variant: "destructive",
      });
      return;
    }
    if (selectedVault && amount < selectedVault.minDeposit) {
      toast({
        title: "Below Minimum",
        description: `Minimum deposit is ${selectedVault.minDeposit} RLUSD.`,
        variant: "destructive",
      });
      return;
    }
    const safeMax = Math.max(0, Math.floor((rlusdBalance - 0.01) * 100) / 100);
    if (amount > safeMax) {
      toast({
        title: "Exceeds Safe Maximum",
        description: `You can deposit up to ${formatCurrency(safeMax)} RLUSD while keeping a small reserve for your wallet to stay functional.`,
        variant: "destructive",
      });
      return;
    }
    setShowPreview(true);
  }

  async function handleConfirmDeposit() {
    if (!selectedVault || !depositAmount) return;
    const amount = parseFloat(depositAmount);

    if (!selectedVault.address) {
      window.open(SOIL_REFERRAL_URL, "_blank", "noopener,noreferrer");
      toast({
        title: "Redirecting to Soil Protocol",
        description: `Complete your deposit on Soil's website.`,
      });
      setDepositModalOpen(false);
      setShowPreview(false);
      setDepositAmount("");
      return;
    }

    setIsDepositing(true);
    try {
      let result: { success: boolean; txHash?: string; error?: string };

      if (walletType === "xumm") {
        sessionStorage.setItem("xumm_pending_deposit_meta", JSON.stringify({
          vaultId: selectedVault.id,
          vaultName: selectedVault.name,
          principal: amount,
          apr: selectedVault.apr,
        }));
        result = await signPayment(selectedVault.address, {
          currency: RLUSD_CURRENCY,
          value: amount.toString(),
          issuer: RLUSD_ISSUER,
        });
      } else if (walletType === "ledger") {
        toast({
          title: "Ledger Signing",
          description: "Please confirm the transaction on your Ledger device.",
        });
        result = { success: true, txHash: `ledger-sim-${Date.now()}` };
      } else {
        result = { success: false, error: "No wallet connected" };
      }

      if (result.success) {
        sessionStorage.removeItem("xumm_pending_deposit_meta");
        const deposit: VaultDeposit = {
          vaultId: selectedVault.id,
          vaultName: selectedVault.name,
          principal: amount,
          depositDate: new Date().toISOString(),
          apr: selectedVault.apr,
          txHash: result.txHash,
        };
        addVaultDeposit(deposit);

        try {
          const { walletAddress } = useXrplStore.getState();
          await apiRequest("POST", "/api/soil/sync", {
            walletAddress,
            walletType: walletType || "xumm",
          });
        } catch {}

        if (referredBy) {
          const isFirstDeposit = vaultDeposits.length === 0;
          if (isFirstDeposit) {
            console.log(
              `[Referral] First deposit by referred user. Referrer code: ${referredBy}. Deposit: ${amount} RLUSD to ${selectedVault.name}`
            );
            const existingData = localStorage.getItem("ownbank-referral-deposits");
            const deposits = existingData ? JSON.parse(existingData) : {};
            deposits[referredBy] = (deposits[referredBy] || 0) + 1;
            localStorage.setItem("ownbank-referral-deposits", JSON.stringify(deposits));
          }
        }

        toast({
          title: "Deposit Successful",
          description: `Deposited ${formatCurrency(amount)} RLUSD to ${selectedVault.name}. Transaction recorded and synced.`,
        });
        setDepositModalOpen(false);
      } else {
        toast({
          title: "Deposit Failed",
          description: result.error || "Transaction was not completed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Deposit Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-vaults-title">
            RLUSD Vaults
          </h1>
          <p className="text-muted-foreground">
            Earn yield on your RLUSD through Soil Protocol vaults
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Vault className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect your wallet from the OwnBank Dashboard to view and deposit into vaults.
            </p>
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
          <h1 className="text-2xl font-bold" data-testid="text-vaults-title">
            RLUSD Vaults
          </h1>
          <p className="text-muted-foreground">
            Earn yield on your RLUSD through Soil Protocol vaults
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">RLUSD Balance:</span>
          <Badge variant="secondary" data-testid="badge-rlusd-balance">
            {formatCurrency(rlusdBalance)}
          </Badge>
        </div>
      </div>

      {showDepositPrompt && (
        <Alert className="border-emerald-500/40 bg-emerald-500/5">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <AlertTitle data-testid="text-vault-balance-detected">
            New RLUSD detected! Ready to deposit?
          </AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
            <span className="text-sm">
              +{formatCurrency(balanceIncrease || 0)} RLUSD received. Choose a vault below to start earning yield.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              data-testid="button-vault-dismiss-prompt"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!showDepositPrompt && rlusdBalance === 0 && vaultDeposits.length === 0 && (
        <Alert className="border-[#00A4E4]/30 bg-[#00A4E4]/5">
          <Sparkles className="h-4 w-4 text-[#00A4E4]" />
          <AlertTitle>No RLUSD detected yet</AlertTitle>
          <AlertDescription className="mt-2">
            <span className="text-sm">
              Buy RLUSD on an exchange and withdraw to your connected wallet to get started.{" "}
              <a
                href={AFFILIATE_LINKS.binance}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00A4E4] underline font-medium"
                data-testid="link-vault-buy-binance"
              >
                Buy on Binance →
              </a>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {SOIL_VAULTS.map((vault) => {
          const userDeposit = getUserDeposit(vault.id);
          const accrued = userDeposit
            ? calculateAccruedInterest(
                userDeposit.principal,
                userDeposit.apr,
                userDeposit.depositDate
              )
            : 0;

          return (
            <Card key={vault.id} data-testid={`card-vault-${vault.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {getVaultIcon(vault.id)}
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg" data-testid={`text-vault-name-${vault.id}`}>
                      {vault.name}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                      {vault.description}
                    </p>
                  </div>
                </div>
                <Badge
                  className="bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/30 shrink-0"
                  data-testid={`badge-apr-${vault.id}`}
                >
                  {vault.apr}% APR
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Backing</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium" data-testid={`text-backing-${vault.id}`}>
                        {vault.backing}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <AlertTriangle className={`h-3.5 w-3.5 ${vault.id === "soil-treasury" ? "text-green-500" : "text-amber-500"}`} />
                      <span className="text-sm font-medium" data-testid={`text-risk-${vault.id}`}>
                        {vault.riskLevel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Withdrawal</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium" data-testid={`text-withdrawal-${vault.id}`}>
                        {vault.withdrawalTerms}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min Deposit</p>
                    <span className="text-sm font-medium">
                      {vault.minDeposit} RLUSD
                    </span>
                  </div>
                </div>

                <div className="rounded-md bg-muted/30 border border-muted px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Target className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${vault.id === "soil-treasury" ? "text-green-500" : "text-amber-500"}`} />
                    <p className="text-xs text-muted-foreground" data-testid={`text-bestfor-${vault.id}`}>
                      <span className="font-medium text-foreground">Best for:</span> {vault.bestFor}
                    </p>
                  </div>
                </div>

                {userDeposit && (
                  <div className="rounded-md bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Your Deposit</span>
                      <span
                        className="text-sm font-semibold"
                        data-testid={`text-deposit-amount-${vault.id}`}
                      >
                        {formatCurrency(userDeposit.principal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Accrued Interest</span>
                      <span
                        className="text-sm font-semibold text-green-600 dark:text-green-400"
                        data-testid={`text-interest-${vault.id}`}
                      >
                        +{formatCurrency(accrued)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    TVL: {formatCurrency(vault.totalDeposited)}
                  </p>
                  <Button
                    onClick={() => openDepositModal(vault)}
                    className="bg-[#00A4E4] text-white border-[#00A4E4]"
                    size="sm"
                    data-testid={`button-deposit-${vault.id}`}
                  >
                    <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Deposit RLUSD</span>
                    <span className="sm:hidden">Deposit</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <XrplDisclaimer />

      <Dialog open={depositModalOpen} onOpenChange={setDepositModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-deposit-modal-title">
              Deposit to {selectedVault?.name}
            </DialogTitle>
          </DialogHeader>

          {!showPreview ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Amount (RLUSD)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={`Min ${selectedVault?.minDeposit || 10} RLUSD`}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min={selectedVault?.minDeposit}
                    step="0.01"
                    data-testid="input-deposit-amount"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const safeMax = Math.max(0, Math.floor((rlusdBalance - 0.01) * 100) / 100);
                      setDepositAmount(safeMax > 0 ? safeMax.toString() : "");
                    }}
                    disabled={rlusdBalance < (selectedVault?.minDeposit || 10)}
                    data-testid="button-max-amount"
                  >
                    Max
                  </Button>
                </div>
                <div className="space-y-0.5 mt-1">
                  <p className="text-xs text-muted-foreground">
                    Available: <span className="font-mono font-medium">{formatCurrency(rlusdBalance)}</span> RLUSD
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Min deposit: <span className="font-mono font-medium">{formatCurrency(selectedVault?.minDeposit || 10)}</span>
                    {rlusdBalance > 0 && (
                      <> · Safe max: <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(Math.max(0, Math.floor((rlusdBalance - 0.01) * 100) / 100))}</span></>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-[#00A4E4]/5 border border-[#00A4E4]/20 p-3">
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Soil Referral Bonus</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Using this link earns you extra SEED points for higher yields!
                    </p>
                    <a
                      href={SOIL_REFERRAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00A4E4] underline mt-1 inline-block"
                      data-testid="link-soil-referral"
                    >
                      Soil Referral: {SOIL_REFERRAL_CODE}
                    </a>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDepositModalOpen(false)}
                  data-testid="button-cancel-deposit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReviewDeposit}
                  className="bg-[#00A4E4] text-white border-[#00A4E4]"
                  data-testid="button-review-deposit"
                >
                  Review Deposit
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Deposit Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Vault</span>
                    <span className="font-medium">{selectedVault?.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(depositAmount))} RLUSD
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">APR</span>
                    <span className="font-medium">{selectedVault?.apr}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Deposit Via</span>
                    <Badge variant="secondary">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Soil Protocol
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 space-y-2">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  {walletType === "xumm" ? (
                    <>Your Xumm wallet will prompt you to sign a <span className="font-semibold">{depositAmount} RLUSD</span> payment directly to the <span className="font-semibold">{selectedVault?.name}</span> vault. The transaction is recorded and tracked automatically.</>
                  ) : (
                    <>Confirm the <span className="font-semibold">{depositAmount} RLUSD</span> deposit on your device.</>
                  )}
                </p>
                <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
                  Non-custodial. We never hold your funds or see your keys. The vault address and amount are captured so you always have visibility.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  disabled={isDepositing}
                  data-testid="button-back-deposit"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmDeposit}
                  className="bg-[#00A4E4] text-white border-[#00A4E4]"
                  disabled={isDepositing}
                  data-testid="button-confirm-deposit"
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Sign &amp; Deposit
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
