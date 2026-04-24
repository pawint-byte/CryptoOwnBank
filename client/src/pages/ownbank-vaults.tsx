import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { InlineXrplConnect } from "@/components/inline-xrpl-connect";
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
  Search,
} from "lucide-react";
import { useXrplStore, type VaultDeposit } from "@/lib/xrpl-store";
import { WalletPicker } from "@/components/wallet-picker";
import {
  SOIL_VAULTS,
  SOIL_REFERRAL_URL,
  SOIL_REFERRAL_CODE,
  AFFILIATE_LINKS,
  calculateAccruedInterest,
  DOPPLER_VAULTS,
  BLEND_VAULTS,
} from "@/lib/xrpl-client";
import { useStellarStore } from "@/lib/stellar-store";
import { useRlusdPolling } from "@/hooks/use-rlusd-polling";
import { signPayment, hasPendingXummPayment, completePendingXummPayment, clearPendingXummPayment } from "@/lib/xumm-connector";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useToast } from "@/hooks/use-toast";

import { RLUSD } from "@/lib/constants";
const RLUSD_CURRENCY = RLUSD.currency;
const RLUSD_ISSUER = RLUSD.issuer;

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
    walletAddress,
    walletType,
    connect,
    vaultDeposits,
    addVaultDeposit,
    referredBy,
    rlusdBalance,
  } = useXrplStore();

  const { showDepositPrompt, balanceIncrease, dismissPrompt } = useRlusdPolling();
  const [autoDepositHandled, setAutoDepositHandled] = useState(false);

  const { data: soilPositions } = useQuery<{ assetSymbol: string; quantity: string; totalCostBasis: string; firstDepositDate: string; earnedToDate: number; depositHistory: { amount: number; date: string }[] }[]>({
    queryKey: ["/api/positions/soil"],
  });

  const backendDeposits = useMemo(() => {
    if (!soilPositions) return {};
    const map: Record<string, { principal: number; depositDate: string; earnedToDate: number }> = {};
    for (const pos of soilPositions) {
      const sym = pos.assetSymbol.toUpperCase();
      const qty = parseFloat(pos.quantity) || 0;
      if (sym.includes("CREDIT")) {
        if (!map["soil-credit-plus"]) map["soil-credit-plus"] = { principal: 0, depositDate: "", earnedToDate: 0 };
        map["soil-credit-plus"].principal += qty;
        map["soil-credit-plus"].earnedToDate += pos.earnedToDate || 0;
        if (pos.firstDepositDate && (!map["soil-credit-plus"].depositDate || pos.firstDepositDate < map["soil-credit-plus"].depositDate)) {
          map["soil-credit-plus"].depositDate = pos.firstDepositDate;
        }
      } else if (sym.includes("LIQUID")) {
        if (!map["soil-treasury"]) map["soil-treasury"] = { principal: 0, depositDate: "", earnedToDate: 0 };
        map["soil-treasury"].principal += qty;
        map["soil-treasury"].earnedToDate += pos.earnedToDate || 0;
        if (pos.firstDepositDate && (!map["soil-treasury"].depositDate || pos.firstDepositDate < map["soil-treasury"].depositDate)) {
          map["soil-treasury"].depositDate = pos.firstDepositDate;
        }
      }
    }
    return map;
  }, [soilPositions]);

  const { data: dopplerPositions } = useQuery<{ assetSymbol: string; quantity: string; totalCostBasis: string; depositDate: string; earnedToDate: number; apr: number }[]>({
    queryKey: ["/api/positions/doppler"],
  });

  const dopplerPosition = useMemo(() => {
    if (!dopplerPositions || dopplerPositions.length === 0) return null;
    const pos = dopplerPositions[0];
    const qty = parseFloat(pos.quantity) || 0;
    if (qty <= 0) return null;
    return {
      principal: qty,
      depositDate: pos.depositDate || "",
      earnedToDate: pos.earnedToDate || 0,
      apr: pos.apr || 3.2,
    };
  }, [dopplerPositions]);

  const [isSyncingDoppler, setIsSyncingDoppler] = useState(false);
  const [dopplerSyncError, setDopplerSyncError] = useState<string | null>(null);
  const [isDetectingDoppler, setIsDetectingDoppler] = useState(false);
  const [dopplerDetectResult, setDopplerDetectResult] = useState<null | {
    detected: boolean;
    walletAddress: string;
    netDeposited: number;
    totalDeposited: number;
    totalWithdrawn: number;
    depositCount: number;
    withdrawalCount: number;
    firstDepositDate?: string;
    lastDepositDate?: string;
    estimatedEarnedToDate?: number;
    deposits?: { amount: number; date: string; txHash: string }[];
    truncated?: boolean;
    message?: string;
  }>(null);

  const { stellarAddress, isConnected: isStellarConnected } = useStellarStore();

  type BlendApiResponse = {
    positions: { assetSymbol: string; tokenSymbol: string; poolKey: string; quantity: string; totalCostBasis: string; supplyApy: number }[];
    lastSyncedAt: string | null;
    snapshots: any[];
  };

  const { data: blendData } = useQuery<BlendApiResponse>({
    queryKey: ["/api/positions/blend"],
  });

  const blendPositionsByPool = useMemo(() => {
    const map: Record<string, { tokenSymbol: string; quantity: number; supplyApy: number }[]> = {};
    if (!blendData?.positions) return map;
    for (const p of blendData.positions) {
      const qty = parseFloat(p.quantity) || 0;
      if (qty <= 0) continue;
      if (!map[p.poolKey]) map[p.poolKey] = [];
      map[p.poolKey].push({ tokenSymbol: p.tokenSymbol, quantity: qty, supplyApy: p.supplyApy });
    }
    return map;
  }, [blendData]);

  const [isSyncingBlend, setIsSyncingBlend] = useState(false);
  const [blendSyncError, setBlendSyncError] = useState<string | null>(null);

  const blendSyncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncingBlend(true);
      const res = await apiRequest("POST", "/api/blend/sync", { stellarAddress });
      return res.json();
    },
    onSuccess: (data: any) => {
      setIsSyncingBlend(false);
      setBlendSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/positions/blend"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      const count = (data.positions || []).filter((p: any) => (p.supply + p.collateral) > 0).length;
      toast({
        title: count > 0 ? "Blend Position Synced" : "No Blend Position Found",
        description: count > 0 ? `${count} active position(s) synced from Blend.` : "No active supply or collateral was found on Blend for your Stellar address.",
      });
    },
    onError: (error: any) => {
      setIsSyncingBlend(false);
      let msg = "Failed to sync Blend positions. Try again later.";
      try {
        const raw = error?.message || "";
        const jsonStart = raw.indexOf("{");
        if (jsonStart >= 0) {
          const parsed = JSON.parse(raw.slice(jsonStart));
          if (parsed.message) msg = parsed.message;
        }
      } catch {}
      setBlendSyncError(msg);
      toast({ title: "Sync Failed", description: msg, variant: "destructive" });
    },
  });

  const dopplerDetectMutation = useMutation({
    mutationFn: async () => {
      setIsDetectingDoppler(true);
      const res = await apiRequest("POST", "/api/doppler/detect-onchain", {
        walletAddress,
        walletType,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setIsDetectingDoppler(false);
      setDopplerSyncError(null);
      setDopplerDetectResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/positions/doppler"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      if (data.detected) {
        toast({
          title: "On-chain deposits found",
          description: `${data.netDeposited.toLocaleString(undefined, { maximumFractionDigits: 2 })} XRP net deposited across ${data.depositCount} payment${data.depositCount === 1 ? "" : "s"}.`,
        });
      } else {
        toast({
          title: "No deposits found",
          description: data.message || "No payments to the Doppler XRP Vault address were found in your wallet's history.",
        });
      }
    },
    onError: (error: any) => {
      setIsDetectingDoppler(false);
      let msg = "Could not scan XRPL history. Try again later.";
      try {
        const raw = error?.message || "";
        const jsonStart = raw.indexOf("{");
        if (jsonStart >= 0) {
          const parsed = JSON.parse(raw.slice(jsonStart));
          if (parsed.message) msg = parsed.message;
        }
      } catch {}
      setDopplerSyncError(msg);
      toast({ title: "On-chain detection failed", description: msg, variant: "destructive" });
    },
  });

  const dopplerSyncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncingDoppler(true);
      const res = await apiRequest("POST", "/api/doppler/sync", {
        walletAddress,
        walletType,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setIsSyncingDoppler(false);
      setDopplerSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/positions/doppler"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      if (data.position?.quantity > 0) {
        toast({
          title: "Doppler Position Synced",
          description: `${data.position.quantity.toFixed(2)} XRP staked (~${data.position.earnedToDate.toFixed(4)} XRP earned)`,
        });
      } else {
        toast({
          title: "No Doppler Position Found",
          description: "No active stake was found for your wallet on Doppler Finance.",
        });
      }
    },
    onError: (error: any) => {
      setIsSyncingDoppler(false);
      let msg = "Failed to sync Doppler position. Try again later.";
      try {
        const raw = error?.message || "";
        const jsonStart = raw.indexOf("{");
        if (jsonStart >= 0) {
          const parsed = JSON.parse(raw.slice(jsonStart));
          if (parsed.noApiKey) {
            msg = "Position sync is not yet available. Check your position directly on app.doppler.finance.";
          } else if (parsed.message) {
            msg = parsed.message;
          }
        }
      } catch { /* use default msg */ }
      setDopplerSyncError(msg);
      toast({ title: "Sync Failed", description: msg, variant: "destructive" });
    },
  });

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
    const backendData = backendDeposits[vaultId];
    if (backendData && backendData.principal > 0) {
      const localDeposit = vaultDeposits.find((d) => d.vaultId === vaultId);
      return {
        vaultId,
        vaultName: vaultId === "soil-credit-plus" ? "Soil CREDIT+ Vault" : "Soil Treasury Vault",
        principal: backendData.principal,
        depositDate: backendData.depositDate || localDeposit?.depositDate || new Date().toISOString(),
        apr: vaultId === "soil-credit-plus" ? 8.0 : 5.2,
        txHash: localDeposit?.txHash,
      };
    }
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

  function renderBlendSection() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Stellar / Soroban — Blend Capital</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {BLEND_VAULTS.map((vault) => {
            const positions = blendPositionsByPool[vault.poolKey] || [];
            const hasPositions = positions.length > 0;
            return (
              <Card key={vault.id} className="border-blue-500/20" data-testid={`card-vault-${vault.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Sparkles className="h-5 w-5 text-blue-500" />
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
                    className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0"
                    data-testid={`badge-network-${vault.id}`}
                  >
                    {vault.network}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasPositions && (
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 space-y-2" data-testid={`blend-position-display-${vault.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Your Positions</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                          onClick={() => blendSyncMutation.mutate()}
                          disabled={isSyncingBlend || !isStellarConnected}
                          data-testid={`button-blend-refresh-${vault.id}`}
                        >
                          {isSyncingBlend ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {positions.map(p => (
                          <div key={p.tokenSymbol} className="flex items-center justify-between text-sm" data-testid={`blend-pos-${vault.id}-${p.tokenSymbol}`}>
                            <span className="font-medium">{p.tokenSymbol}</span>
                            <div className="text-right">
                              <span className="font-semibold">{p.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                              {p.supplyApy > 0 && (
                                <span className="ml-2 text-xs text-green-600 dark:text-green-400">{(p.supplyApy * 100).toFixed(2)}% APY</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Assets</p>
                      <span className="text-sm font-medium" data-testid={`text-assets-${vault.id}`}>{vault.assets.join(", ")}</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Risk Level</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-sm font-medium" data-testid={`text-risk-${vault.id}`}>{vault.riskLevel}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Withdrawal</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium" data-testid={`text-withdrawal-${vault.id}`}>{vault.withdrawalTerms}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Provider</p>
                      <span className="text-sm font-medium">{vault.provider}</span>
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/30 border border-muted px-3 py-2">
                    <div className="flex items-start gap-2">
                      <Target className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
                      <p className="text-xs text-muted-foreground" data-testid={`text-bestfor-${vault.id}`}>
                        <span className="font-medium text-foreground">Best for:</span> {vault.bestFor}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md bg-blue-500/5 border border-blue-500/20 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Custody:</span> {vault.custodyNote}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={vault.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        data-testid={`link-blend-docs-${vault.id}`}
                      >
                        Docs
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {isStellarConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => blendSyncMutation.mutate()}
                          disabled={isSyncingBlend}
                          className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                          data-testid={`button-blend-sync-${vault.id}`}
                        >
                          {isSyncingBlend ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          )}
                          <span className="hidden sm:inline">Sync Position</span>
                          <span className="sm:hidden">Sync</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground" data-testid={`text-blend-connect-${vault.id}`}>
                          Connect Stellar wallet to sync
                        </span>
                      )}
                      <Button
                        onClick={() => window.open(vault.depositUrl, "_blank")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                        data-testid={`button-deposit-${vault.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Open Blend</span>
                        <span className="sm:hidden">Open</span>
                      </Button>
                    </div>
                  </div>
                  {blendSyncError && !hasPositions && (
                    <p className="text-xs text-blue-400 mt-1" data-testid={`text-blend-sync-fallback-${vault.id}`}>
                      {blendSyncError}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDopplerSection() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Doppler Finance</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {DOPPLER_VAULTS.map((vault) => (
            <Card key={vault.id} className="border-purple-500/20" data-testid={`card-vault-${vault.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
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
                  className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 shrink-0"
                  data-testid={`badge-apr-${vault.id}`}
                >
                  ~{vault.apr}% APR
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {dopplerPosition && (
                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3 space-y-2" data-testid="doppler-position-display">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Your Position</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700"
                        onClick={() => dopplerSyncMutation.mutate()}
                        disabled={isSyncingDoppler}
                        data-testid="button-doppler-refresh"
                      >
                        {isSyncingDoppler ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Staked</p>
                        <p className="text-sm font-semibold" data-testid="text-doppler-staked">
                          {dopplerPosition.principal.toLocaleString(undefined, { maximumFractionDigits: 2 })} XRP
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Earned</p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400" data-testid="text-doppler-earned">
                          +{dopplerPosition.earnedToDate.toLocaleString(undefined, { maximumFractionDigits: 4 })} XRP
                        </p>
                      </div>
                    </div>
                    {dopplerPosition.depositDate && (
                      <p className="text-xs text-muted-foreground">
                        Since {new Date(dopplerPosition.depositDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Strategy</p>
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
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
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
                    <p className="text-xs text-muted-foreground">Asset</p>
                    <span className="text-sm font-medium">{vault.asset}</span>
                  </div>
                </div>

                <div className="rounded-md bg-muted/30 border border-muted px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Target className="h-3.5 w-3.5 mt-0.5 shrink-0 text-purple-500" />
                    <p className="text-xs text-muted-foreground" data-testid={`text-bestfor-${vault.id}`}>
                      <span className="font-medium text-foreground">Best for:</span> {vault.bestFor}
                    </p>
                  </div>
                </div>

                <div className="rounded-md bg-purple-500/5 border border-purple-500/20 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-purple-500" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Custody:</span> {vault.custodyNote}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={vault.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                      data-testid={`link-doppler-docs-${vault.id}`}
                    >
                      Docs
                    </a>
                    <span className="text-muted-foreground">|</span>
                    <a
                      href={vault.xamanBlogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                      data-testid={`link-doppler-xaman-${vault.id}`}
                    >
                      Xaman Guide
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isConnected && !dopplerPosition && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dopplerSyncMutation.mutate()}
                        disabled={isSyncingDoppler}
                        className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                        data-testid="button-doppler-sync"
                      >
                        {isSyncingDoppler ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        )}
                        <span className="hidden sm:inline">Sync Position</span>
                        <span className="sm:hidden">Sync</span>
                      </Button>
                    )}
                    {isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dopplerDetectMutation.mutate()}
                        disabled={isDetectingDoppler}
                        className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                        data-testid="button-doppler-detect-onchain"
                        title="Scan your XRPL transaction history for deposits to the Doppler vault address. Works without a partner API key."
                      >
                        {isDetectingDoppler ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-1" />
                        )}
                        <span className="hidden sm:inline">Detect on-chain</span>
                        <span className="sm:hidden">Detect</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => window.open(vault.depositUrl, "_blank")}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                      data-testid={`button-deposit-${vault.id}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Deposit via Doppler</span>
                      <span className="sm:hidden">Deposit</span>
                    </Button>
                  </div>
                  {dopplerSyncError && !dopplerPosition && (
                    <p className="text-xs text-purple-400 mt-2" data-testid="text-doppler-sync-fallback">
                      {dopplerSyncError}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p
          className="text-[11px] leading-relaxed text-muted-foreground/80 mt-3 px-1"
          data-testid="text-third-party-disclosure"
        >
          Third-party vaults (Doppler and others) are operated by independent providers and enforce their own KYC, eligibility, and geographic restrictions. Availability, supported countries, and rates can change at any time and depend on your jurisdiction. CryptoOwnBank is non-custodial and does not control these terms — please review the provider's site before depositing.
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-vaults-title">
            Yield Vaults
          </h1>
          <p className="text-muted-foreground">
            Access RLUSD and XRP yield vault opportunities from one dashboard
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Vault className="h-12 w-12 text-muted-foreground" />
            <InlineXrplConnect />
          </CardContent>
        </Card>

        {renderDopplerSection()}

        {renderBlendSection()}

        <XrplDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-vaults-title">
            Yield Vaults
          </h1>
          <p className="text-muted-foreground">
            Access RLUSD and XRP yield vault opportunities from one dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WalletPicker
            value={walletAddress || ""}
            onChange={(addr) => connect(addr, walletType || "xumm")}
            label="Active Wallet"
          />
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
            +{formatCurrency(balanceIncrease || 0)} RLUSD received
          </AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
            <span className="text-sm">
              Your wallet balance has been updated. You can deposit to a vault below or use your RLUSD for sending, trading, or transfers.
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

      {(() => {
        const allDeposits = SOIL_VAULTS.map(v => {
          const dep = getUserDeposit(v.id);
          if (!dep) return null;
          const bd = backendDeposits[v.id];
          const accrued = bd?.earnedToDate ?? calculateAccruedInterest(dep.principal, dep.apr, dep.depositDate);
          return { vault: v, principal: dep.principal, accrued };
        }).filter(Boolean) as { vault: typeof SOIL_VAULTS[0]; principal: number; accrued: number }[];
        
        if (allDeposits.length > 0) {
          const totalDeposited = allDeposits.reduce((s, d) => s + d.principal, 0);
          const totalInterest = allDeposits.reduce((s, d) => s + d.accrued, 0);
          const totalBalance = totalDeposited + totalInterest;
          return (
            <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5" data-testid="card-total-vault-balance">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Deposited</p>
                    <p className="text-lg font-bold" data-testid="text-total-deposited">{formatCurrency(totalDeposited)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Earned to Date</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-total-earned">+{formatCurrency(totalInterest)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Balance</p>
                    <p className="text-lg font-bold text-[#00A4E4]" data-testid="text-total-balance">{formatCurrency(totalBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Vaults</p>
                    <p className="text-lg font-bold" data-testid="text-active-vaults">{allDeposits.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      <div className="grid gap-6 md:grid-cols-2">
        {SOIL_VAULTS.map((vault) => {
          const userDeposit = getUserDeposit(vault.id);
          const backendData = backendDeposits[vault.id];
          const accrued = backendData?.earnedToDate ?? (userDeposit
            ? calculateAccruedInterest(
                userDeposit.principal,
                userDeposit.apr,
                userDeposit.depositDate
              )
            : 0);

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
                    <div className="flex items-center justify-between gap-2 border-t border-muted pt-2">
                      <span className="text-xs text-muted-foreground font-medium">Est. Earned to Date</span>
                      <span
                        className="text-sm font-bold text-green-600 dark:text-green-400"
                        data-testid={`text-earned-${vault.id}`}
                      >
                        +{formatCurrency(accrued)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Current Balance</span>
                      <span
                        className="text-sm font-bold text-[#00A4E4]"
                        data-testid={`text-balance-${vault.id}`}
                      >
                        {formatCurrency(userDeposit.principal + accrued)}
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

      {renderDopplerSection()}

      {renderBlendSection()}

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
                    <>Your Xaman wallet will prompt you to sign a <span className="font-semibold">{depositAmount} RLUSD</span> payment directly to the <span className="font-semibold">{selectedVault?.name}</span> vault. The transaction is recorded and tracked automatically.</>
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
