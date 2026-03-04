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

export interface Referral {
  referredAddress: string;
  depositCount: number;
  estimatedSeed: number;
  joinedDate: string;
  upgradedToPremium: boolean;
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
  referralCode: string | null;
  referrals: Referral[];
  referredBy: string | null;
  premiumCreditMonths: number;
  subscriptionTier: "free" | "premium";

  connect: (address: string, type: "xumm" | "ledger") => void;
  disconnect: () => void;
  setSpendingWallet: (address: string) => void;
  updateBalances: (xrp: number, rlusd: number) => void;
  addVaultDeposit: (deposit: VaultDeposit) => void;
  removeVaultDeposit: (vaultId: string) => void;
  generateReferralCode: () => string;
  addReferral: (referral: Referral) => void;
  setReferredBy: (code: string) => void;
  addPremiumCredit: () => void;
  setSubscriptionTier: (tier: "free" | "premium") => void;
  dismissBalancePrompt: () => void;
}

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
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
      referralCode: null,
      referrals: [],
      referredBy: null,
      premiumCreditMonths: 0,
      subscriptionTier: "free",

      connect: (address, type) =>
        set({
          walletAddress: address,
          isConnected: true,
          walletType: type,
          referralCode: get().referralCode || `${address.slice(0, 6)}${address.slice(-4)}`,
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

      generateReferralCode: () => {
        const address = get().walletAddress;
        const code = address
          ? `${address.slice(0, 6)}${address.slice(-4)}`
          : generateShortId();
        set({ referralCode: code });
        return code;
      },

      addReferral: (referral) =>
        set((state) => ({
          referrals: [...state.referrals, referral],
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
