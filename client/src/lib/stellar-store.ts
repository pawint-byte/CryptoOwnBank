import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest } from "@/lib/queryClient";

export interface StellarBalance {
  asset_code: string;
  asset_issuer: string | null;
  balance: string;
  asset_type: string;
}

interface HorizonNativeBalance {
  asset_type: "native";
  balance: string;
}

interface HorizonCreditBalance {
  asset_type: "credit_alphanum4" | "credit_alphanum12";
  asset_code: string;
  asset_issuer: string;
  balance: string;
}

interface HorizonAccountResponse {
  balances: (HorizonNativeBalance | HorizonCreditBalance)[];
}

interface HorizonPaymentRecord {
  type: string;
  [key: string]: unknown;
}

interface HorizonPaymentsResponse {
  _embedded?: { records: HorizonPaymentRecord[] };
}

interface StellarState {
  stellarAddress: string | null;
  isConnected: boolean;
  xlmBalance: number;
  balances: StellarBalance[];
  loading: boolean;
  recentRecipients: string[];

  connect: (address: string) => void;
  disconnect: () => void;
  setBalances: (xlm: number, balances: StellarBalance[]) => void;
  setLoading: (loading: boolean) => void;
  addRecentRecipient: (address: string) => void;
  syncToServer: (address: string | null, customLabel?: string) => void;
  loadFromServer: () => void;
}

export const useStellarStore = create<StellarState>()(
  persist(
    (set, get) => ({
      stellarAddress: null,
      isConnected: false,
      xlmBalance: 0,
      balances: [],
      loading: false,
      recentRecipients: [],

      connect: (address) => {
        set({
          stellarAddress: address,
          isConnected: true,
        });
        get().syncToServer(address);
      },

      disconnect: () => {
        set({
          stellarAddress: null,
          isConnected: false,
          xlmBalance: 0,
          balances: [],
        });
        get().syncToServer(null);
      },

      setBalances: (xlm, balances) =>
        set({
          xlmBalance: xlm,
          balances,
        }),

      setLoading: (loading) => set({ loading }),

      addRecentRecipient: (address) =>
        set((state) => {
          const filtered = state.recentRecipients.filter((r) => r !== address);
          return { recentRecipients: [address, ...filtered].slice(0, 10) };
        }),

      syncToServer: async (address, customLabel) => {
        try {
          if (address) {
            await apiRequest("PUT", "/api/stellar/address", { stellarAddress: address });
            try {
              await apiRequest("POST", "/api/wallets", {
                chain: "stellar",
                address,
                ...(customLabel ? { label: customLabel } : {}),
              });
            } catch {
            }
          } else {
            await apiRequest("DELETE", "/api/stellar/address");
          }
        } catch {
        }
      },

      loadFromServer: async () => {
        try {
          const res = await fetch("/api/stellar/address", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.stellarAddress && !get().isConnected) {
              set({ stellarAddress: data.stellarAddress, isConnected: true });
            }
          }
        } catch {
        }
      },
    }),
    {
      name: "stellar-wallet-storage",
    }
  )
);

export async function fetchStellarBalances(address: string): Promise<{
  xlm: number;
  balances: StellarBalance[];
}> {
  const res = await fetch(`https://horizon.stellar.org/accounts/${address}`);
  if (!res.ok) {
    if (res.status === 404) {
      return { xlm: 0, balances: [] };
    }
    throw new Error("Failed to fetch Stellar account");
  }
  const data: HorizonAccountResponse = await res.json();
  const allBalances: StellarBalance[] = (data.balances || []).map((b) => ({
    asset_code: b.asset_type === "native" ? "XLM" : (b as HorizonCreditBalance).asset_code,
    asset_issuer: b.asset_type === "native" ? null : (b as HorizonCreditBalance).asset_issuer,
    balance: b.balance,
    asset_type: b.asset_type,
  }));

  const nativeBalance = allBalances.find((b) => b.asset_type === "native");
  const xlm = nativeBalance ? parseFloat(nativeBalance.balance) : 0;

  return { xlm, balances: allBalances };
}

export async function fetchStellarTransactions(address: string, limit = 20) {
  const res = await fetch(
    `https://horizon.stellar.org/accounts/${address}/payments?order=desc&limit=${limit}`
  );
  if (!res.ok) return [];
  const data: HorizonPaymentsResponse = await res.json();
  return (data._embedded?.records || []).filter(
    (r) => r.type === "payment" || r.type === "path_payment_strict_send" || r.type === "path_payment_strict_receive"
  );
}

export function buildStellarPayUri(
  destination: string,
  amount: string,
  assetCode?: string,
  assetIssuer?: string | null,
  memo?: string,
  memoType?: string
): string {
  let uri = `web+stellar:pay?destination=${destination}&amount=${amount}`;
  if (assetCode && assetCode !== "XLM" && assetIssuer) {
    uri += `&asset_code=${assetCode}&asset_issuer=${assetIssuer}`;
  }
  if (memo?.trim()) {
    uri += `&memo=${encodeURIComponent(memo)}&memo_type=MEMO_${(memoType || "text").toUpperCase()}`;
  }
  return uri;
}

export function buildLobstrUrl(assetCode: string, assetIssuer: string | null): string {
  if (!assetIssuer) return "https://lobstr.co";
  return `https://lobstr.co/trade/${assetCode}:${assetIssuer}`;
}

export function buildStellarChangeTrustUrl(assetCode: string, assetIssuer: string): string {
  return `https://laboratory.stellar.org/#txbuilder?params=changeTrust&asset_code=${assetCode}&asset_issuer=${assetIssuer}`;
}
