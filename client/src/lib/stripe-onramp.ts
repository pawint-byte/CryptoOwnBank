import { apiRequest } from "./queryClient";

export interface StripeOnrampOption {
  currency: string;
  network: string;
  label: string;
  symbol: string;
}

export const STRIPE_ONRAMP_BY_CHAIN: Record<string, StripeOnrampOption[]> = {
  evm: [
    { currency: "eth", network: "ethereum", label: "ETH on Ethereum", symbol: "ETH" },
    { currency: "usdc", network: "ethereum", label: "USDC on Ethereum", symbol: "USDC" },
    { currency: "eth", network: "base", label: "ETH on Base", symbol: "ETH" },
    { currency: "usdc", network: "base", label: "USDC on Base", symbol: "USDC" },
    { currency: "pol", network: "polygon", label: "POL on Polygon", symbol: "POL" },
    { currency: "usdc", network: "polygon", label: "USDC on Polygon", symbol: "USDC" },
    { currency: "avax", network: "avalanche", label: "AVAX on Avalanche", symbol: "AVAX" },
    { currency: "usdc", network: "avalanche", label: "USDC on Avalanche", symbol: "USDC" },
  ],
  btc: [{ currency: "btc", network: "bitcoin", label: "Bitcoin", symbol: "BTC" }],
  sol: [
    { currency: "sol", network: "solana", label: "SOL on Solana", symbol: "SOL" },
    { currency: "usdc", network: "solana", label: "USDC on Solana", symbol: "USDC" },
  ],
  stellar: [
    { currency: "xlm", network: "stellar", label: "XLM on Stellar", symbol: "XLM" },
    { currency: "usdc", network: "stellar", label: "USDC on Stellar", symbol: "USDC" },
  ],
};

export function getStripeOptionsForChain(chain: string): StripeOnrampOption[] {
  return STRIPE_ONRAMP_BY_CHAIN[chain] || [];
}

export function chainHasStripeOnramp(chain: string): boolean {
  return (STRIPE_ONRAMP_BY_CHAIN[chain]?.length ?? 0) > 0;
}

export interface ExternalOnrampOption {
  provider: string;
  label: string;
  url: string;
  note: string;
}

export const EXTERNAL_ONRAMP_BY_CHAIN: Record<string, ExternalOnrampOption[]> = {
  xrp: [
    {
      provider: "xaman",
      label: "Buy XRP in Xaman",
      url: "https://xaman.app/",
      note: "Import this seed into Xaman, then tap Buy. The card-bought XRP lands in this exact address.",
    },
    {
      provider: "sologenic",
      label: "Swap on Sologenic DEX",
      url: "https://sologenic.org/trade",
      note: "On-chain XRPL DEX — useful if you already hold IOUs or USD-pegged stablecoins on XRPL.",
    },
  ],
};

export function getExternalOnrampsForChain(chain: string): ExternalOnrampOption[] {
  return EXTERNAL_ONRAMP_BY_CHAIN[chain] || [];
}

export function chainHasAnyOnramp(chain: string): boolean {
  return chainHasStripeOnramp(chain) || getExternalOnrampsForChain(chain).length > 0;
}

export interface CreateOnrampParams {
  walletAddress: string;
  destinationCurrency: string;
  destinationNetwork: string;
  sourceAmount?: number;
}

export interface OnrampSessionResponse {
  id: string;
  clientSecret: string;
  redirectUrl: string;
}

export async function createOnrampSessionAndRedirect(
  params: CreateOnrampParams,
): Promise<void> {
  // Open the popup SYNCHRONOUSLY during the click handler so browsers don't
  // treat the later navigation as a non-user-initiated popup and block it.
  const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
  try {
    const res = await apiRequest("POST", "/api/stripe/onramp-session", params);
    const data = (await res.json()) as OnrampSessionResponse;
    if (!data.redirectUrl) {
      throw new Error("Stripe did not return a redirect URL");
    }
    if (popup && !popup.closed) {
      popup.location.href = data.redirectUrl;
    } else {
      // Popup was blocked — fall back to top-level redirect so the user
      // still gets to Stripe (a confirmation toast in the caller can warn).
      window.location.href = data.redirectUrl;
    }
  } catch (err) {
    if (popup && !popup.closed) popup.close();
    throw err;
  }
}
