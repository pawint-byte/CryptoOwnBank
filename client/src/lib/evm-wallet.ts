import { create } from "zustand";
import { persist } from "zustand/middleware";

export const EVM_CHAINS: Record<number, { name: string; shortName: string; rpcUrl: string; explorerUrl: string; nativeCurrency: { name: string; symbol: string; decimals: number } }> = {
  1: { name: "Ethereum", shortName: "ETH", rpcUrl: "https://eth.llamarpc.com", explorerUrl: "https://etherscan.io", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
  137: { name: "Polygon", shortName: "MATIC", rpcUrl: "https://polygon-rpc.com", explorerUrl: "https://polygonscan.com", nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 } },
  42161: { name: "Arbitrum", shortName: "ARB", rpcUrl: "https://arb1.arbitrum.io/rpc", explorerUrl: "https://arbiscan.io", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
  10: { name: "Optimism", shortName: "OP", rpcUrl: "https://mainnet.optimism.io", explorerUrl: "https://optimistic.etherscan.io", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
  8453: { name: "Base", shortName: "BASE", rpcUrl: "https://mainnet.base.org", explorerUrl: "https://basescan.org", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
  43114: { name: "Avalanche", shortName: "AVAX", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", explorerUrl: "https://snowtrace.io", nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 } },
  56: { name: "BNB Chain", shortName: "BNB", rpcUrl: "https://bsc-dataseed.binance.org", explorerUrl: "https://bscscan.com", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 } },
};

interface EvmWalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useEvmWallet = create<EvmWalletState>()(
  persist(
    (set, get) => ({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,

      connect: async () => {
        if (typeof window === "undefined" || !(window as any).ethereum) {
          set({ error: "MetaMask not detected. Please install MetaMask to use EVM swaps." });
          return;
        }
        set({ isConnecting: true, error: null });
        try {
          const ethereum = (window as any).ethereum;
          const accounts = await ethereum.request({ method: "eth_requestAccounts" });
          const chainIdHex = await ethereum.request({ method: "eth_chainId" });
          const chainId = parseInt(chainIdHex, 16);
          set({
            address: accounts[0],
            chainId,
            isConnected: true,
            isConnecting: false,
          });

          ethereum.on("accountsChanged", (accs: string[]) => {
            if (accs.length === 0) {
              set({ address: null, isConnected: false, chainId: null });
            } else {
              set({ address: accs[0] });
            }
          });

          ethereum.on("chainChanged", (newChainHex: string) => {
            set({ chainId: parseInt(newChainHex, 16) });
          });
        } catch (err: any) {
          set({ error: err.message || "Failed to connect wallet", isConnecting: false });
        }
      },

      disconnect: () => {
        set({ address: null, chainId: null, isConnected: false, error: null });
      },

      switchChain: async (chainId: number) => {
        if (!(window as any).ethereum) return;
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          });
          set({ chainId });
        } catch (err: any) {
          if (err.code === 4902) {
            const chain = EVM_CHAINS[chainId];
            if (chain) {
              try {
                await (window as any).ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [{
                    chainId: `0x${chainId.toString(16)}`,
                    chainName: chain.name,
                    rpcUrls: [chain.rpcUrl],
                    blockExplorerUrls: [chain.explorerUrl],
                    nativeCurrencies: [chain.nativeCurrency],
                  }],
                });
                set({ chainId });
              } catch (addErr: any) {
                set({ error: addErr.message || "Failed to add network" });
              }
            }
          } else {
            set({ error: err.message || "Failed to switch network" });
          }
        }
      },

      setError: (error) => set({ error }),
    }),
    {
      name: "evm-wallet-storage",
      partialize: (state) => ({ address: state.address, chainId: state.chainId, isConnected: state.isConnected }),
    }
  )
);

export async function sendEvmTransaction(txData: any): Promise<string> {
  if (!(window as any).ethereum) throw new Error("MetaMask not detected");
  const txHash = await (window as any).ethereum.request({
    method: "eth_sendTransaction",
    params: [txData],
  });
  return txHash;
}

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const chain = EVM_CHAINS[chainId];
  if (!chain) return `https://etherscan.io/tx/${txHash}`;
  return `${chain.explorerUrl}/tx/${txHash}`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
