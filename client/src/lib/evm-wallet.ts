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

type WalletProvider = "metamask" | "walletconnect" | null;

let wcProviderInstance: any = null;

interface EvmWalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  walletProvider: WalletProvider;

  connect: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  setError: (error: string | null) => void;
}

async function getWalletConnectProvider() {
  if (wcProviderInstance) return wcProviderInstance;

  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (!projectId) throw new Error("WalletConnect project ID not configured");

  const { default: EthereumProvider } = await import("@walletconnect/ethereum-provider");

  const rpcMap: Record<number, string> = {};
  const chainIds: number[] = [];
  for (const [id, chain] of Object.entries(EVM_CHAINS)) {
    rpcMap[parseInt(id)] = chain.rpcUrl;
    chainIds.push(parseInt(id));
  }

  wcProviderInstance = await EthereumProvider.init({
    projectId,
    chains: [1],
    optionalChains: chainIds.filter(c => c !== 1),
    rpcMap,
    showQrModal: true,
    metadata: {
      name: "CryptoOwnBank",
      description: "Multi-chain crypto portfolio & swap platform",
      url: "https://cryptoownbank.com",
      icons: ["https://cryptoownbank.com/favicon.ico"],
    },
  });

  return wcProviderInstance;
}

export const useEvmWallet = create<EvmWalletState>()(
  persist(
    (set, get) => ({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      walletProvider: null,

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
            walletProvider: "metamask",
          });

          ethereum.on("accountsChanged", (accs: string[]) => {
            if (accs.length === 0) {
              set({ address: null, isConnected: false, chainId: null, walletProvider: null });
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

      connectWalletConnect: async () => {
        set({ isConnecting: true, error: null });
        try {
          const provider = await getWalletConnectProvider();

          await provider.connect();

          const accounts = provider.accounts;
          const chainId = provider.chainId;

          if (!accounts || accounts.length === 0) {
            throw new Error("No accounts returned from WalletConnect");
          }

          set({
            address: accounts[0],
            chainId,
            isConnected: true,
            isConnecting: false,
            walletProvider: "walletconnect",
          });

          provider.on("accountsChanged", (accs: string[]) => {
            if (accs.length === 0) {
              set({ address: null, isConnected: false, chainId: null, walletProvider: null });
              wcProviderInstance = null;
            } else {
              set({ address: accs[0] });
            }
          });

          provider.on("chainChanged", (newChainId: number) => {
            set({ chainId: newChainId });
          });

          provider.on("disconnect", () => {
            set({ address: null, chainId: null, isConnected: false, walletProvider: null });
            wcProviderInstance = null;
          });
        } catch (err: any) {
          set({ error: err.message || "Failed to connect via WalletConnect", isConnecting: false });
        }
      },

      disconnect: () => {
        const { walletProvider } = get();
        if (walletProvider === "walletconnect" && wcProviderInstance) {
          try {
            wcProviderInstance.disconnect();
          } catch {}
          wcProviderInstance = null;
        }
        set({ address: null, chainId: null, isConnected: false, error: null, walletProvider: null });
      },

      switchChain: async (chainId: number) => {
        const { walletProvider } = get();
        const provider = walletProvider === "walletconnect" ? wcProviderInstance : (window as any).ethereum;
        if (!provider) return;

        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          });
          set({ chainId });
        } catch (err: any) {
          if (err.code === 4902) {
            const chain = EVM_CHAINS[chainId];
            if (chain) {
              try {
                await provider.request({
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
      partialize: (state) => ({ address: state.address, chainId: state.chainId, isConnected: state.isConnected, walletProvider: state.walletProvider }),
      onRehydrate: () => {
        return (state) => {
          if (state?.isConnected) {
            if (state.walletProvider === "walletconnect") {
              getWalletConnectProvider().then(provider => {
                if (provider.connected) {
                  const accounts = provider.accounts;
                  if (accounts && accounts.length > 0) {
                    useEvmWallet.setState({ address: accounts[0], chainId: provider.chainId });
                    provider.on("accountsChanged", (accs: string[]) => {
                      if (accs.length === 0) {
                        useEvmWallet.setState({ address: null, isConnected: false, chainId: null, walletProvider: null });
                        wcProviderInstance = null;
                      } else {
                        useEvmWallet.setState({ address: accs[0] });
                      }
                    });
                    provider.on("chainChanged", (newChainId: number) => {
                      useEvmWallet.setState({ chainId: newChainId });
                    });
                    provider.on("disconnect", () => {
                      useEvmWallet.setState({ address: null, chainId: null, isConnected: false, walletProvider: null });
                      wcProviderInstance = null;
                    });
                  } else {
                    useEvmWallet.setState({ address: null, chainId: null, isConnected: false, walletProvider: null });
                  }
                } else {
                  useEvmWallet.setState({ address: null, chainId: null, isConnected: false, walletProvider: null });
                }
              }).catch(() => {
                useEvmWallet.setState({ address: null, chainId: null, isConnected: false, walletProvider: null });
              });
            } else {
              if (typeof window === "undefined" || !(window as any).ethereum) {
                state.address = null;
                state.chainId = null;
                state.isConnected = false;
                state.error = null;
                state.walletProvider = null;
              } else {
                const ethereum = (window as any).ethereum;
                ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
                  if (!accounts || accounts.length === 0) {
                    useEvmWallet.setState({ address: null, chainId: null, isConnected: false, error: null, walletProvider: null });
                  } else {
                    ethereum.request({ method: "eth_chainId" }).then((chainHex: string) => {
                      useEvmWallet.setState({ address: accounts[0], chainId: parseInt(chainHex, 16) });
                    }).catch(() => {});
                    ethereum.on("accountsChanged", (accs: string[]) => {
                      if (accs.length === 0) {
                        useEvmWallet.setState({ address: null, isConnected: false, chainId: null, walletProvider: null });
                      } else {
                        useEvmWallet.setState({ address: accs[0] });
                      }
                    });
                    ethereum.on("chainChanged", (newChainHex: string) => {
                      useEvmWallet.setState({ chainId: parseInt(newChainHex, 16) });
                    });
                  }
                }).catch(() => {
                  useEvmWallet.setState({ address: null, chainId: null, isConnected: false, error: null, walletProvider: null });
                });
              }
            }
          }
        };
      },
    }
  )
);

export async function sendEvmTransaction(txData: any): Promise<string> {
  const { walletProvider } = useEvmWallet.getState();
  const provider = walletProvider === "walletconnect" ? wcProviderInstance : (window as any).ethereum;
  if (!provider) throw new Error("No wallet connected");

  const txHash = await provider.request({
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
