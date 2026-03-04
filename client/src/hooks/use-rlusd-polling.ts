import { useEffect, useRef } from "react";
import { useXrplStore } from "@/lib/xrpl-store";
import { getBalances } from "@/lib/xrpl-client";

const POLL_INTERVAL = 30_000;

export function useRlusdPolling() {
  const {
    walletAddress,
    isConnected,
    updateBalances,
    balanceIncrease,
    balancePromptDismissed,
    dismissBalancePrompt,
    rlusdBalance,
  } = useXrplStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const balances = await getBalances(walletAddress);
        updateBalances(balances.xrp, balances.rlusd);
      } catch {
      }
    };

    poll();

    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isConnected, walletAddress, updateBalances]);

  const showDepositPrompt = balanceIncrease !== null && balanceIncrease > 1 && !balancePromptDismissed;

  return {
    showDepositPrompt,
    balanceIncrease,
    rlusdBalance,
    dismissPrompt: dismissBalancePrompt,
  };
}
