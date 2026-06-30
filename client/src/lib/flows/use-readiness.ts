import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useXrplStore } from "@/lib/xrpl-store";
import { useStellarStore, fetchStellarBalances } from "@/lib/stellar-store";
import { getBalances, getAccountTrustlines } from "@/lib/xrpl-client";
import { isWebUSBSupported, signTrustSetWithLedger } from "@/lib/ledger-connector";
import { signTrustSet } from "@/lib/xumm-connector";
import { RLUSD, STELLAR_USDC } from "@/lib/constants";
import { RESERVE } from "@/lib/flows/types";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  tier: "free" | "premium" | "pro";
}

export interface XrplReadiness {
  connected: boolean;
  address: string | null;
  walletType: "xumm" | "ledger" | null;
  xrpBalance: number;
  rlusdBalance: number;
  activated: boolean;
  hasRlusdTrust: boolean;
  signerReady: boolean;
  ledgerOnMobile: boolean;
  loading: boolean;
}

export interface StellarReadiness {
  connected: boolean;
  address: string | null;
  xlmBalance: number;
  usdcBalance: number;
  activated: boolean;
  hasUsdcTrust: boolean;
  loading: boolean;
}

export interface Readiness {
  subscription: { tier: "free" | "premium" | "pro"; loading: boolean };
  xrpl: XrplReadiness;
  stellar: StellarReadiness;
  setRlusdTrust: () => Promise<void>;
  settingRlusdTrust: boolean;
  refresh: () => void;
}

/**
 * Gathers the live readiness signals both rails need for the guided flows, plus
 * the one inline action net-new to Phase 1 (open the RLUSD trust line — reuses
 * the exact vault signing path). Everything is read from real wallet/network
 * state; nothing is faked, so a member never sees a green light they can't pass.
 */
export function useReadiness(): Readiness {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    isConnected: xrplConnected,
    walletAddress,
    walletType,
    rlusdBalance: storedRlusd,
  } = useXrplStore();

  const {
    isConnected: stellarConnected,
    stellarAddress,
  } = useStellarStore();

  const [hasUsb, setHasUsb] = useState(false);
  const [settingRlusdTrust, setSettingRlusdTrust] = useState(false);

  useEffect(() => {
    isWebUSBSupported().then(setHasUsb).catch(() => setHasUsb(false));
  }, []);

  // --- XRPL live signals ---
  const xrplBalancesQuery = useQuery({
    queryKey: ["flows-xrpl-balances", walletAddress],
    queryFn: () => getBalances(walletAddress!),
    enabled: xrplConnected && !!walletAddress,
    staleTime: 30_000,
  });

  const xrplTrustQuery = useQuery({
    queryKey: ["flows-xrpl-trustlines", walletAddress],
    queryFn: () => getAccountTrustlines(walletAddress!),
    enabled: xrplConnected && !!walletAddress,
    staleTime: 30_000,
  });

  const xrpBalance = xrplBalancesQuery.data?.xrp ?? 0;
  // Live balance drives the trust decision; the persisted store value is only a
  // display fallback so a stale cached number can never paint a false "trusted".
  const liveRlusd = xrplBalancesQuery.data?.rlusd;
  const rlusdBalance = liveRlusd ?? storedRlusd ?? 0;
  // A trust line is authoritative from account_lines (it exists even at a zero
  // balance); a live positive balance also proves the line exists.
  const hasRlusdTrust =
    !!xrplTrustQuery.data?.some(
      (t) => t.currency === "RLUSD" && t.issuer === RLUSD.issuer,
    ) || (liveRlusd ?? 0) > 0;
  const ledgerOnMobile = walletType === "ledger" && !hasUsb;
  const signerReady =
    xrplConnected && (walletType === "xumm" || (walletType === "ledger" && hasUsb));

  // --- Stellar live signals ---
  const stellarBalancesQuery = useQuery({
    queryKey: ["flows-stellar-balances", stellarAddress],
    queryFn: () => fetchStellarBalances(stellarAddress!),
    enabled: stellarConnected && !!stellarAddress,
    staleTime: 30_000,
  });

  const xlmBalance = stellarBalancesQuery.data?.xlm ?? 0;
  const stellarBalances = stellarBalancesQuery.data?.balances ?? [];
  const usdcLine = stellarBalances.find(
    (b) => b.asset_code === STELLAR_USDC.code && b.asset_issuer === STELLAR_USDC.issuer,
  );
  const usdcBalance = usdcLine ? parseFloat(usdcLine.balance) || 0 : 0;
  const stellarActivated =
    xlmBalance >= RESERVE.stellar.minAccount || stellarBalances.length > 0;

  // --- Platform signal ---
  const subQuery = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    staleTime: 60_000,
  });

  async function setRlusdTrust() {
    if (!walletAddress) return;
    setSettingRlusdTrust(true);
    try {
      const result =
        walletType === "ledger"
          ? await signTrustSetWithLedger(RLUSD.currency, RLUSD.issuer, walletAddress)
          : await signTrustSet(RLUSD.currency, RLUSD.issuer);
      if (result.success) {
        toast({
          title: "RLUSD line opened",
          description: "Your wallet can now hold and move RLUSD.",
        });
        await xrplTrustQuery.refetch();
        await xrplBalancesQuery.refetch();
      } else {
        toast({
          title: "Couldn't open the RLUSD line",
          description: result.error || "The request wasn't completed.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Couldn't open the RLUSD line",
        description: e?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSettingRlusdTrust(false);
    }
  }

  function refresh() {
    xrplBalancesQuery.refetch();
    xrplTrustQuery.refetch();
    stellarBalancesQuery.refetch();
    subQuery.refetch();
  }

  return {
    subscription: {
      tier: subQuery.data?.tier ?? "free",
      loading: subQuery.isLoading,
    },
    xrpl: {
      connected: xrplConnected,
      address: walletAddress,
      walletType,
      xrpBalance,
      rlusdBalance,
      activated: xrpBalance >= RESERVE.xrpl.base,
      hasRlusdTrust,
      signerReady,
      ledgerOnMobile,
      loading: xrplBalancesQuery.isLoading || xrplTrustQuery.isLoading,
    },
    stellar: {
      connected: stellarConnected,
      address: stellarAddress,
      xlmBalance,
      usdcBalance,
      activated: stellarActivated,
      hasUsdcTrust: !!usdcLine,
      loading: stellarBalancesQuery.isLoading,
    },
    setRlusdTrust,
    settingRlusdTrust,
    refresh,
  };
}
