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

export async function handleWebhookEvent(
  body: string,
  signature: string,
  webhookSecret: string
) {
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  return event;
}

export { stripe };
