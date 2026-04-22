import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any })
  : (new Proxy({}, {
      get() {
        throw new Error("Stripe is not configured: STRIPE_SECRET_KEY env var is missing.");
      },
    }) as unknown as Stripe);

export const PLANS = {
  monthly: {
    name: "OwnBank Premium Monthly",
    amount: 2900,
    interval: "month" as const,
    tier: "premium" as const,
    description: "$29/month — Unlimited exchanges, wallets, alerts, auto-withdraw",
  },
  yearly: {
    name: "OwnBank Premium Annual",
    amount: 19900,
    interval: "year" as const,
    tier: "premium" as const,
    description: "$199/year — Everything in monthly + tax reports, save $149",
  },
  "pro-monthly": {
    name: "OwnBank Pro Monthly",
    amount: 9900,
    interval: "month" as const,
    tier: "pro" as const,
    description: "$99/month — Everything in Premium + priority support, API access, advanced analytics",
  },
  "pro-yearly": {
    name: "OwnBank Pro Annual",
    amount: 79900,
    interval: "year" as const,
    tier: "pro" as const,
    description: "$799/year — Everything in Pro monthly, save $389",
  },
};

export type PlanKey = keyof typeof PLANS;

export const ADDONS = {
  "chain-ethereum": {
    name: "Multi-Chain: Ethereum",
    type: "multi_chain",
    key: "chain-ethereum",
    amount: 499,
    interval: "month" as const,
    description: "Track Ethereum wallets & tokens — $4.99/mo",
  },
  "chain-bitcoin": {
    name: "Multi-Chain: Bitcoin",
    type: "multi_chain",
    key: "chain-bitcoin",
    amount: 499,
    interval: "month" as const,
    description: "Track Bitcoin wallets & UTXOs — $4.99/mo",
  },
  "chain-solana": {
    name: "Multi-Chain: Solana",
    type: "multi_chain",
    key: "chain-solana",
    amount: 499,
    interval: "month" as const,
    description: "Track Solana wallets & SPL tokens — $4.99/mo",
  },
  "chain-stellar": {
    name: "Multi-Chain: Stellar",
    type: "multi_chain",
    key: "chain-stellar",
    amount: 499,
    interval: "month" as const,
    description: "Track Stellar wallets & anchored assets — $4.99/mo",
  },
  "chain-cardano": {
    name: "Multi-Chain: Cardano",
    type: "multi_chain",
    key: "chain-cardano",
    amount: 499,
    interval: "month" as const,
    description: "Track Cardano wallets & native tokens — $4.99/mo",
  },
  "chain-polygon": {
    name: "Multi-Chain: Polygon",
    type: "multi_chain",
    key: "chain-polygon",
    amount: 499,
    interval: "month" as const,
    description: "Track Polygon wallets & tokens — $4.99/mo",
  },
  "technical-analysis": {
    name: "Technical Analysis Indicators",
    type: "technical_analysis",
    key: "technical-analysis",
    amount: 999,
    interval: "month" as const,
    description: "RSI, MACD, Bollinger Bands & more — $9.99/mo",
  },
  "payments": {
    name: "XRP/XLM Payment Tools",
    type: "payments",
    key: "payments",
    amount: 799,
    interval: "month" as const,
    description: "Send/receive XRP & XLM, recurring payments — $7.99/mo",
  },
  "legacy-plan": {
    name: "Legacy Plan — Monthly",
    type: "legacy_plan",
    key: "legacy-plan",
    amount: 999,
    interval: "month" as const,
    priceLabel: "$9.99/mo",
    description: "Crypto inheritance dead-man switch — $9.99/mo (included free with Pro)",
  },
  "legacy-plan-yearly": {
    name: "Legacy Plan — Annual",
    type: "legacy_plan",
    key: "legacy-plan-yearly",
    amount: 7900,
    interval: "year" as const,
    priceLabel: "$79/yr",
    description: "Crypto inheritance dead-man switch — $79/yr (save $40 vs monthly)",
  },
  "legacy-plan-lifetime": {
    name: "Legacy Plan — Lifetime",
    type: "legacy_plan",
    key: "legacy-plan-lifetime",
    amount: 49900,
    interval: null as null,
    priceLabel: "$499 once",
    description: "One-time payment, never expires. Stays active until trigger fires + 12 months after release. Lifetime seat passes to your primary beneficiary.",
  },
};

export const LEGACY_ADDON_KEYS = ["legacy-plan", "legacy-plan-yearly", "legacy-plan-lifetime"] as const;
export type LegacyAddonKey = typeof LEGACY_ADDON_KEYS[number];
export function isLegacyAddon(key: string): key is LegacyAddonKey {
  return (LEGACY_ADDON_KEYS as readonly string[]).includes(key);
}

// "House Tier" chains get an extra 5% off (15% total vs 10% baseline) — they're
// the assets we actually want to hold in treasury (BTC/ETH/SOL appreciate;
// XRP/RLUSD are our home chain where the yield vaults run).
export const HOUSE_CHAINS = ["xrp", "rlusd", "bitcoin", "ethereum", "solana"] as const;
export type HouseChain = typeof HOUSE_CHAINS[number];
export function isHouseChain(chain: string): chain is HouseChain {
  return (HOUSE_CHAINS as readonly string[]).includes(chain.toLowerCase());
}
export function getCryptoDiscountRate(chain: string): number {
  return isHouseChain(chain) ? 0.15 : 0.10;
}
export function applyCryptoDiscount(usdAmount: number, chain: string): number {
  return Math.round(usdAmount * (1 - getCryptoDiscountRate(chain)) * 100) / 100;
}

export type AddonKey = keyof typeof ADDONS;

export async function createCheckoutSession(
  userId: string,
  plan: PlanKey,
  successUrl: string,
  cancelUrl: string
) {
  const planConfig = PLANS[plan];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: planConfig.name,
            description: planConfig.description,
          },
          unit_amount: planConfig.amount,
          recurring: {
            interval: planConfig.interval,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan,
      tier: planConfig.tier,
    },
  });

  return session;
}

export async function createAddonCheckoutSession(
  userId: string,
  addonKey: AddonKey,
  successUrl: string,
  cancelUrl: string
) {
  const addonConfig = ADDONS[addonKey];
  const isOneTime = !addonConfig.interval;

  const session = await stripe.checkout.sessions.create({
    mode: isOneTime ? "payment" : "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: addonConfig.name,
            description: addonConfig.description,
          },
          unit_amount: addonConfig.amount,
          ...(isOneTime
            ? {}
            : { recurring: { interval: addonConfig.interval as "month" | "year" } }),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      addonKey,
      addonType: addonConfig.type,
      isAddon: "true",
      isLifetime: isOneTime ? "true" : "false",
    },
  });

  return session;
}

export async function handleWebhookEvent(
  body: string,
  signature: string,
  webhookSecret: string
) {
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  return event;
}

export { stripe };
