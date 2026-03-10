import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});

export const PLANS = {
  monthly: {
    name: "OwnBank Premium Monthly",
    amount: 2900,
    interval: "month" as const,
    description: "$29/month — Unlimited exchanges, wallets, alerts, auto-withdraw",
  },
  yearly: {
    name: "OwnBank Premium Annual",
    amount: 19900,
    interval: "year" as const,
    description: "$199/year — Everything in monthly + tax reports, save $149",
  },
};

export async function createCheckoutSession(
  userId: string,
  plan: "monthly" | "yearly",
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
