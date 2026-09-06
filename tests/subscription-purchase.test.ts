import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "../server/stripe";

const getUserSettings = vi.fn(async () => undefined as any);
const getWalletsByUser = vi.fn(async () => [] as any[]);
const upsertUserSettings = vi.fn(async (settings: any) => settings);
const attributeReferralConversion = vi.fn(async () => undefined);
const getCryptoPaymentAddresses = vi.fn(async () => [] as any[]);
const sendSubscriptionReceiptEmail = vi.fn(async () => undefined);
let dbRows: any[] = [];

vi.mock("../server/storage", () => ({
  storage: {
    getUserSettings: (userId: string) => getUserSettings(userId),
    getWalletsByUser: (userId: string) => getWalletsByUser(userId),
    upsertUserSettings: (settings: any) => upsertUserSettings(settings),
    attributeReferralConversion: (userId: string) => attributeReferralConversion(userId),
    getCryptoPaymentAddresses: (activeOnly?: boolean) => getCryptoPaymentAddresses(activeOnly),
  },
}));

vi.mock("../server/email", () => ({
  sendCryptoPaymentReceivedEmail: vi.fn(async () => undefined),
  sendPremiumWelcomeEmail: vi.fn(async () => undefined),
  sendLegacyPlanReceiptEmail: vi.fn(async () => undefined),
  sendSubscriptionReceiptEmail: (...args: any[]) => sendSubscriptionReceiptEmail(...args),
}));

vi.mock("../server/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: vi.fn(async () => dbRows),
      }),
    }),
  },
}));

const EXPECTED_PLANS = [
  { key: "monthly", amount: 2900, interval: "month", tier: "premium", cycle: "monthly" },
  { key: "yearly", amount: 19900, interval: "year", tier: "premium", cycle: "yearly" },
  { key: "pro-monthly", amount: 9900, interval: "month", tier: "pro", cycle: "monthly" },
  { key: "pro-yearly", amount: 79900, interval: "year", tier: "pro", cycle: "yearly" },
] as const;

describe("Premium/Pro pricing catalog", () => {
  it.each(EXPECTED_PLANS)(
    "$key charges the correct amount and maps to the correct tier/cycle",
    ({ key, amount, interval, tier }) => {
      expect(PLANS[key].amount).toBe(amount);
      expect(PLANS[key].interval).toBe(interval);
      expect(PLANS[key].tier).toBe(tier);
    },
  );
});

function makeCryptoPayment(plan: string) {
  return {
    id: `payment-${plan}`,
    userId: "user-1",
    plan,
    chain: "bitcoin",
    expectedAmount: "0.001",
    expectedAsset: "BTC",
    usdAmount: "100",
    toAddress: "payment-address",
    txHash: "transaction-hash",
  } as any;
}

describe("crypto verifier — Premium/Pro activation", () => {
  let activateSubscription: (payment: any) => Promise<void>;

  beforeAll(async () => {
    ({ activateSubscription } = await import("../server/services/crypto-payment-verifier"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getUserSettings.mockResolvedValue(undefined);
    getWalletsByUser.mockResolvedValue([]);
    dbRows = [{ id: "user-1", email: "buyer@example.com" }];
  });

  it.each(EXPECTED_PLANS)(
    "activates $key as $tier/$cycle with the correct prepaid expiry",
    async ({ key, tier, cycle }) => {
      const before = new Date();
      await activateSubscription(makeCryptoPayment(key));
      const after = new Date();

      expect(upsertUserSettings).toHaveBeenCalledTimes(1);
      const settings = upsertUserSettings.mock.calls[0][0];
      expect(settings).toMatchObject({
        userId: "user-1",
        subscriptionTier: tier,
        subscriptionBillingCycle: cycle,
        subscriptionPaymentMethod: "crypto",
      });
      expect(settings.subscriptionExpiresAt).toBeInstanceOf(Date);

      if (cycle === "yearly") {
        expect(settings.subscriptionExpiresAt.getFullYear()).toBe(before.getFullYear() + 1);
        expect(settings.subscriptionExpiresAt.getMonth()).toBe(before.getMonth());
        expect(settings.subscriptionExpiresAt.getDate()).toBe(before.getDate());
      } else {
        const minExpiry = new Date(before);
        minExpiry.setDate(minExpiry.getDate() + 30);
        const maxExpiry = new Date(after);
        maxExpiry.setDate(maxExpiry.getDate() + 30);
        expect(settings.subscriptionExpiresAt.getTime()).toBeGreaterThanOrEqual(minExpiry.getTime());
        expect(settings.subscriptionExpiresAt.getTime()).toBeLessThanOrEqual(maxExpiry.getTime());
      }

      expect(sendSubscriptionReceiptEmail).toHaveBeenCalledTimes(1);
      expect(sendSubscriptionReceiptEmail).toHaveBeenCalledWith("buyer@example.com", expect.objectContaining({
        tierName: tier === "pro" ? "Pro" : "Premium",
        billingCycle: cycle,
        amountPaid: "0.001 BTC (~$100 USD)",
        paymentMethodLabel: "Crypto — BTC",
        paymentMethod: "crypto",
        expiresAt: settings.subscriptionExpiresAt,
      }));
    },
  );
});

function checkoutEvent(plan: (typeof EXPECTED_PLANS)[number]) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: `checkout-${plan.key}`,
        customer: `customer-${plan.key}`,
        subscription: `subscription-${plan.key}`,
        amount_total: plan.amount,
        created: 1_788_729_600,
        metadata: {
          userId: "user-1",
          plan: plan.key,
          tier: plan.tier,
        },
      },
    },
  };
}

describe("Stripe webhook — Premium/Pro activation", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    const express = (await import("express")).default;
    const { handleStripeWebhookEvent } = await import("../server/stripe-webhook");
    const app = express();
    app.use(express.json());
    app.post("/api/stripe/webhook", async (req, res) => {
      try {
        await handleStripeWebhookEvent(req.body);
        res.json({ received: true });
      } catch {
        res.status(400).json({ message: "Webhook error" });
      }
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getUserSettings.mockResolvedValue(undefined);
    dbRows = [{ id: "user-1", email: "buyer@example.com" }];
  });

  it.each(EXPECTED_PLANS)(
    "activates $key as $tier/$cycle with no fixed card expiry",
    async (plan) => {
      const response = await fetch(`${baseUrl}/api/stripe/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(checkoutEvent(plan)),
      });

      expect(response.status).toBe(200);
      expect(upsertUserSettings).toHaveBeenCalledTimes(1);
      expect(upsertUserSettings.mock.calls[0][0]).toMatchObject({
        userId: "user-1",
        subscriptionTier: plan.tier,
        subscriptionBillingCycle: plan.cycle,
        subscriptionPaymentMethod: "stripe",
        subscriptionExpiresAt: null,
        stripeCustomerId: `customer-${plan.key}`,
        stripeSubscriptionId: `subscription-${plan.key}`,
      });
      expect(sendSubscriptionReceiptEmail).toHaveBeenCalledTimes(1);
      expect(sendSubscriptionReceiptEmail).toHaveBeenCalledWith("buyer@example.com", expect.objectContaining({
        tierName: plan.tier === "pro" ? "Pro" : "Premium",
        billingCycle: plan.cycle,
        amountPaid: `$${(plan.amount / 100).toFixed(2)}`,
        paymentMethodLabel: "Credit / debit card",
        paymentMethod: "card",
        expiresAt: null,
        purchasedAt: new Date(1_788_729_600_000),
      }));
    },
  );
});