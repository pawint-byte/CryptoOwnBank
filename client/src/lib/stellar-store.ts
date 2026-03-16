import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StellarBalance {
  asset_code: string;
  asset_issuer: string | null;
  balance: string;
  asset_type: string;
}

interface StellarState {
  stellarAddress: string | null;
  isConnected: boolean;
  xlmBalance: number;
  balances: StellarBalance[];
  loading: boolean;

  connect: (address: string) => void;
  disconnect: () => void;
  setBalances: (xlm: number, balances: StellarBalance[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useStellarStore = create<StellarState>()(
  persist(
    (set) => ({
      stellarAddress: null,
      isConnected: false,
      xlmBalance: 0,
      balances: [],
      loading: false,

      connect: (address) =>
        set({
          stellarAddress: address,
          isConnected: true,
        }),

      disconnect: () =>
        set({
          stellarAddress: null,
          isConnected: false,
          xlmBalance: 0,
          balances: [],
        }),

      setBalances: (xlm, balances) =>
        set({
          xlmBalance: xlm,
          balances,
        }),

      setLoading: (loading) => set({ loading }),
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
  const data = await res.json();
  const allBalances: StellarBalance[] = (data.balances || []).map((b: any) => ({
    asset_code: b.asset_type === "native" ? "XLM" : b.asset_code,
    asset_issuer: b.asset_type === "native" ? null : b.asset_issuer,
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
  const data = await res.json();
  return (data._embedded?.records || []).filter(
    (r: any) => r.type === "payment" || r.type === "path_payment_strict_send" || r.type === "path_payment_strict_receive"
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

export function buildStellarChangeTrustUri(assetCode: string, assetIssuer: string): string {
  return `web+stellar:tx?xdr=&network=public&callback=&replace=sourceAccount:X;operations.type:changeTrust;operations.line.assetCode:${assetCode};operations.line.issuer:${assetIssuer}`;
}
