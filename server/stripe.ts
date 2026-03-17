import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});

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
    name: "Legacy Plan (Dead-Man Switch)",
    type: "legacy_plan",
    key: "legacy-plan",
    amount: 999,
    interval: "month" as const,
    description: "Crypto inheritance dead-man switch — $9.99/mo (included free with Pro)",
  },
};

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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
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
          recurring: {
            interval: addonConfig.interval,
          },
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
