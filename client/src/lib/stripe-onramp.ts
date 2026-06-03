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
  // "buy" = an in-app card/fiat buy rail; "swap" = a DEX/swap venue.
  kind: "buy" | "swap";
}

export const EXTERNAL_ONRAMP_BY_CHAIN: Record<string, ExternalOnrampOption[]> = {
  xrp: [
    {
      provider: "xaman",
      label: "Buy XRP in Xaman",
      url: "https://xaman.app/",
      note: "Import this seed into Xaman, then tap Buy. The card-bought XRP lands in this exact address.",
      kind: "buy",
    },
    {
      provider: "sologenic",
      label: "Swap on Sologenic DEX",
      url: "https://sologenic.org/trade",
      note: "On-chain XRPL DEX — useful if you already hold IOUs or USD-pegged stablecoins on XRPL.",
      kind: "swap",
    },
  ],
  rlusd: [
    {
      provider: "xaman",
      label: "Buy RLUSD in Xaman",
      url: "https://xaman.app/",
      note: "Import this seed into Xaman. Inside Xaman you can buy XRP by card, then swap it to RLUSD on the built-in XRPL DEX — it all lands in this exact address.",
      kind: "buy",
    },
    {
      provider: "sologenic",
      label: "Swap to RLUSD on Sologenic DEX",
      url: "https://sologenic.org/trade",
      note: "On-chain XRPL DEX — handy if you already hold XRP or other IOUs on the XRP Ledger and want to swap into RLUSD.",
      kind: "swap",
    },
  ],
  xlm: [
    {
      provider: "lobstr",
      label: "Buy XLM in LOBSTR",
      url: "https://lobstr.co/",
      note: "Open LOBSTR, tap Buy, choose XLM, and pay by card or Apple/Google Pay. This in-app buy often works even when a website says \"not supported in your region\" — the XLM lands in your own LOBSTR wallet.",
      kind: "buy",
    },
  ],
  usdc: [
    {
      provider: "lobstr",
      label: "Buy USDC in LOBSTR (on Stellar)",
      url: "https://lobstr.co/",
      note: "Open LOBSTR, tap Buy, choose USDC, and pay by card or Apple/Google Pay — in many places even with cash at a MoneyGram counter. The USDC lands in your own LOBSTR wallet on Stellar; CryptoOwnBank never touches it.",
      kind: "buy",
    },
  ],
};

export function getExternalOnrampsForChain(chain: string): ExternalOnrampOption[] {
  return EXTERNAL_ONRAMP_BY_CHAIN[chain] || [];
}

export function getWalletAppBuysForChain(chain: string): ExternalOnrampOption[] {
  return getExternalOnrampsForChain(chain).filter((o) => o.kind === "buy");
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
