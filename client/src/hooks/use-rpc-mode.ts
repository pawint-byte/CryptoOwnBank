import { useQuery } from "@tanstack/react-query";
import type { UserSettings } from "@shared/schema";

export type RpcMode = "direct" | "relay" | "custom";

export interface RpcModeInfo {
  mode: RpcMode;
  customRpcUrl: string | null;
  isLoading: boolean;
}

const PUBLIC_RPC: Record<string, string> = {
  flare: "https://flare-api.flare.network/ext/C/rpc",
  xrpl: "https://xrplcluster.com",
  ethereum: "https://eth.llamarpc.com",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  solana: "https://api.mainnet-beta.solana.com",
};

export function useRpcMode(): RpcModeInfo {
  const { data, isLoading } = useQuery<UserSettings>({ queryKey: ["/api/settings"] });
  const mode = ((data as any)?.rpcMode as RpcMode) || "direct";
  const customRpcUrl = (data as any)?.customRpcUrl ?? null;
  return { mode, customRpcUrl, isLoading };
}

export function resolveRpcUrl(
  chain: keyof typeof PUBLIC_RPC | string,
  mode: RpcMode,
  customRpcUrl: string | null,
): string {
  if (mode === "custom" && customRpcUrl) return customRpcUrl;
  if (mode === "relay") return `/api/rpc/${chain}`;
  const url = PUBLIC_RPC[chain];
  if (!url) {
    throw new Error(
      `No public RPC configured for chain "${chain}" — switch to relay or custom mode.`,
    );
  }
  return url;
}
