const STRIPE_ONRAMP_API = "https://api.stripe.com/v1/crypto/onramp_sessions";

const ADDRESS_PATTERNS: Record<string, RegExp> = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  base: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  avalanche: /^0x[a-fA-F0-9]{40}$/,
  bitcoin: /^(bc1[a-z0-9]{6,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  stellar: /^G[A-Z2-7]{55}$/,
};

export function isValidAddressForNetwork(address: string, network: string): boolean {
  const pattern = ADDRESS_PATTERNS[network.toLowerCase()];
  if (!pattern) return true;
  return pattern.test(address);
}

// Currency+network pairs Stripe's crypto onramp can actually fulfil. Any pair
// outside this set is rejected up front so a malformed payload can never reach
// Stripe and trigger a silent fallback to a different asset.
const SUPPORTED_ONRAMP_PAIRS = new Set<string>([
  "eth:ethereum",
  "eth:base",
  "usdc:ethereum",
  "usdc:base",
  "usdc:polygon",
  "usdc:avalanche",
  "usdc:solana",
  "usdc:stellar",
  "btc:bitcoin",
  "sol:solana",
  "pol:polygon",
  "matic:polygon",
  "avax:avalanche",
  "xlm:stellar",
]);

export function isSupportedOnrampPair(currency: string, network: string): boolean {
  return SUPPORTED_ONRAMP_PAIRS.has(
    `${currency.toLowerCase()}:${network.toLowerCase()}`,
  );
}

export interface CreateOnrampSessionInput {
  walletAddress: string;
  destinationCurrency: string;
  destinationNetwork: string;
  sourceAmount?: number;
  sourceCurrency?: "usd" | "eur";
  lockWalletAddress?: boolean;
}

export interface OnrampSessionResult {
  id: string;
  clientSecret: string;
  redirectUrl: string;
}

export async function createOnrampSession(
  input: CreateOnrampSessionInput,
): Promise<OnrampSessionResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const params = new URLSearchParams();
  params.append("transaction_details[wallet_address]", input.walletAddress);
  params.append(
    "transaction_details[destination_currency]",
    input.destinationCurrency.toLowerCase(),
  );
  params.append(
    "transaction_details[destination_network]",
    input.destinationNetwork.toLowerCase(),
  );
  // Lock the session to exactly this coin + network. Without these, Stripe
  // treats destination_currency/network as a mere default and silently falls
  // back to ETH on Ethereum when the chosen coin isn't available in the user's
  // region — which would let someone buy ETH while thinking they bought XLM.
  params.append(
    "transaction_details[supported_destination_currencies][]",
    input.destinationCurrency.toLowerCase(),
  );
  params.append(
    "transaction_details[supported_destination_networks][]",
    input.destinationNetwork.toLowerCase(),
  );
  params.append(
    "transaction_details[source_currency]",
    input.sourceCurrency || "usd",
  );
  if (input.sourceAmount && input.sourceAmount > 0) {
    params.append(
      "transaction_details[source_amount]",
      String(input.sourceAmount),
    );
  }
  if (input.lockWalletAddress !== false) {
    params.append("transaction_details[lock_wallet_address]", "true");
  }

  const res = await fetch(STRIPE_ONRAMP_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe API error ${res.status}`;
    throw new Error(msg);
  }

  return {
    id: data.id,
    clientSecret: data.client_secret,
    redirectUrl: data.redirect_url,
  };
}
