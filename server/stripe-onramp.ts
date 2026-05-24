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
