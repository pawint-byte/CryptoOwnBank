import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface VaultDeposit {
  vaultId: string;
  vaultName: string;
  principal: number;
  depositDate: string;
  apr: number;
  txHash?: string;
}

interface XrplState {
  walletAddress: string | null;
  isConnected: boolean;
  walletType: "xumm" | "ledger" | null;
  spendingWallet: string;
  xrpBalance: number;
  rlusdBalance: number;
  previousRlusdBalance: number | null;
  balanceIncrease: number | null;
  balancePromptDismissed: boolean;
  vaultDeposits: VaultDeposit[];
  referredBy: string | null;
  premiumCreditMonths: number;
  subscriptionTier: "free" | "premium";
  ownerUserId: string | null;

  connect: (address: string, type: "xumm" | "ledger") => void;
  disconnect: () => void;
  resetWallet: () => void;
  syncOwner: (currentUserId: string | null) => void;
  setSpendingWallet: (address: string) => void;
  updateBalances: (xrp: number, rlusd: number) => void;
  addVaultDeposit: (deposit: VaultDeposit) => void;
  removeVaultDeposit: (vaultId: string) => void;
  setReferredBy: (code: string) => void;
  addPremiumCredit: () => void;
  setSubscriptionTier: (tier: "free" | "premium") => void;
  dismissBalancePrompt: () => void;
}

export const useXrplStore = create<XrplState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      isConnected: false,
      walletType: null,
      spendingWallet: "",
      xrpBalance: 0,
      rlusdBalance: 0,
      previousRlusdBalance: null,
      balanceIncrease: null,
      balancePromptDismissed: false,
      vaultDeposits: [],
      referredBy: null,
      premiumCreditMonths: 0,
      subscriptionTier: "free",
      ownerUserId: null,

      connect: (address, type) =>
        set({
          walletAddress: address,
          isConnected: true,
          walletType: type,
        }),

      disconnect: () =>
        set({
          walletAddress: null,
          isConnected: false,
          walletType: null,
          xrpBalance: 0,
          rlusdBalance: 0,
          previousRlusdBalance: null,
          balanceIncrease: null,
          balancePromptDismissed: false,
        }),

      // Wipe every wallet-derived value back to defaults. Used when the browser's
      // connected wallet belongs to a different account than the one now logged in.
      resetWallet: () =>
        set({
          walletAddress: null,
          isConnected: false,
          walletType: null,
          spendingWallet: "",
          xrpBalance: 0,
          rlusdBalance: 0,
          previousRlusdBalance: null,
          balanceIncrease: null,
          balancePromptDismissed: false,
          vaultDeposits: [],
          referredBy: null,
          premiumCreditMonths: 0,
          subscriptionTier: "free",
        }),

      // Tie the persisted (browser-local) wallet connection to the logged-in
      // account. If a wallet is connected under a different account — or an
      // unknown/legacy session we can't attribute — clear it so one member never
      // sees another's wallet in the same browser.
      syncOwner: (currentUserId) => {
        const s = get();
        if (!s.isConnected && !s.walletAddress) {
          if (s.ownerUserId !== currentUserId) set({ ownerUserId: currentUserId });
          return;
        }
        if (s.ownerUserId === null || s.ownerUserId !== currentUserId) {
          get().resetWallet();
          set({ ownerUserId: currentUserId });
        }
      },

      setSpendingWallet: (address) => set({ spendingWallet: address }),

      updateBalances: (xrp, rlusd) => {
        const currentBalance = get().rlusdBalance;
        const prevStored = get().previousRlusdBalance;
        const baseline = prevStored !== null ? prevStored : currentBalance;
        const increase = rlusd - baseline > 1 ? rlusd - baseline : null;
        set({
          xrpBalance: xrp,
          rlusdBalance: rlusd,
          previousRlusdBalance: baseline,
          balanceIncrease: increase,
          balancePromptDismissed: increase ? false : get().balancePromptDismissed,
        });
      },

      addVaultDeposit: (deposit) =>
        set((state) => {
          const existing = state.vaultDeposits.find(
            (d) => d.vaultId === deposit.vaultId
          );
          if (existing) {
            return {
              vaultDeposits: state.vaultDeposits.map((d) =>
                d.vaultId === deposit.vaultId
                  ? { ...d, principal: d.principal + deposit.principal }
                  : d
              ),
            };
          }
          return { vaultDeposits: [...state.vaultDeposits, deposit] };
        }),

      removeVaultDeposit: (vaultId) =>
        set((state) => ({
          vaultDeposits: state.vaultDeposits.filter((d) => d.vaultId !== vaultId),
        })),

      setReferredBy: (code) => set({ referredBy: code }),

      addPremiumCredit: () =>
        set((state) => ({
          premiumCreditMonths: state.premiumCreditMonths + 1,
        })),

      setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),

      dismissBalancePrompt: () => set({ balancePromptDismissed: true, balanceIncrease: null }),
    }),
    {
      name: "ownbank-xrpl-storage",
    }
  )
);
