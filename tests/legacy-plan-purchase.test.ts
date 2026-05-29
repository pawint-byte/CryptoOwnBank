import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ADDONS,
  LEGACY_ADDON_KEYS,
  computeLegacyAddonExpiry,
  isLegacyAddon,
  isLegacyAddonActive,
} from "../server/stripe";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Whole days between two dates (rounded), used to assert relative expiries
// without being brittle about exact milliseconds.
function daysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

const FIXED_NOW = new Date("2026-05-29T12:00:00.000Z");

// ---------------------------------------------------------------------------
// 1. Pricing catalog — each tier charges the correct amount
// ---------------------------------------------------------------------------

describe("Legacy Plan pricing catalog", () => {
  it("charges the correct amount per SKU (in cents)", () => {
    expect(ADDONS["legacy-plan"].amount).toBe(999); // $9.99/mo
    expect(ADDONS["legacy-plan-yearly"].amount).toBe(2900); // $29/yr
    expect(ADDONS["legacy-plan-5yr"].amount).toBe(9900); // $99 / 5yr
    expect(ADDONS["legacy-plan-lifetime"].amount).toBe(49900); // $499 once
  });

  it("marks recurring vs one-time SKUs with the right billing interval", () => {
    expect(ADDONS["legacy-plan"].interval).toBe("month");
    expect(ADDONS["legacy-plan-yearly"].interval).toBe("year");
    expect(ADDONS["legacy-plan-5yr"].interval).toBeNull();
    expect(ADDONS["legacy-plan-lifetime"].interval).toBeNull();
  });

  it("registers every legacy SKU as a legacy add-on and nothing else", () => {
    for (const key of LEGACY_ADDON_KEYS) {
      expect(isLegacyAddon(key)).toBe(true);
      expect(ADDONS[key].type).toBe("legacy_plan");
    }
    expect(isLegacyAddon("technical-analysis")).toBe(false);
    expect(isLegacyAddon("chain-bitcoin")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Expiry per SKU — card-webhook ("stripe") path
// ---------------------------------------------------------------------------

describe("computeLegacyAddonExpiry — card / Stripe path", () => {
  it("never sets an expiry for recurring SKUs (Stripe auto-renews)", () => {
    // Monthly and Annual are live subscriptions on card; access is revoked via
    // subscription-cancellation webhooks, not a stored expiry.
    expect(computeLegacyAddonExpiry("legacy-plan", "stripe", FIXED_NOW)).toBeNull();
    expect(computeLegacyAddonExpiry("legacy-plan-yearly", "stripe", FIXED_NOW)).toBeNull();
  });

  it("sets a +5 year expiry for the one-time 5-Year SKU", () => {
    const exp = computeLegacyAddonExpiry("legacy-plan-5yr", "stripe", FIXED_NOW);
    expect(exp).not.toBeNull();
    expect(exp!.getFullYear()).toBe(FIXED_NOW.getFullYear() + 5);
    expect(exp!.getMonth()).toBe(FIXED_NOW.getMonth());
    expect(exp!.getDate()).toBe(FIXED_NOW.getDate());
  });

  it("never expires the Lifetime SKU", () => {
    expect(computeLegacyAddonExpiry("legacy-plan-lifetime", "stripe", FIXED_NOW)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Expiry per SKU — crypto-verifier ("crypto") path
// ---------------------------------------------------------------------------

describe("computeLegacyAddonExpiry — crypto path", () => {
  it("prepays +30 days for the Monthly SKU", () => {
    const exp = computeLegacyAddonExpiry("legacy-plan", "crypto", FIXED_NOW);
    expect(exp).not.toBeNull();
    expect(daysBetween(exp!, FIXED_NOW)).toBe(30);
  });

  it("prepays +1 year for the Annual SKU", () => {
    const exp = computeLegacyAddonExpiry("legacy-plan-yearly", "crypto", FIXED_NOW);
    expect(exp).not.toBeNull();
    expect(exp!.getFullYear()).toBe(FIXED_NOW.getFullYear() + 1);
    expect(exp!.getMonth()).toBe(FIXED_NOW.getMonth());
    expect(exp!.getDate()).toBe(FIXED_NOW.getDate());
  });

  it("prepays +5 years for the 5-Year SKU", () => {
    const exp = computeLegacyAddonExpiry("legacy-plan-5yr", "crypto", FIXED_NOW);
    expect(exp).not.toBeNull();
    expect(exp!.getFullYear()).toBe(FIXED_NOW.getFullYear() + 5);
  });

  it("never expires the Lifetime SKU", () => {
    expect(computeLegacyAddonExpiry("legacy-plan-lifetime", "crypto", FIXED_NOW)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Access predicate — hasLegacyAccess relies on isLegacyAddonActive
// ---------------------------------------------------------------------------

describe("isLegacyAddonActive — gates Legacy Plan access", () => {
  const now = FIXED_NOW;

  it("grants access for an active add-on with no expiry (lifetime / live card sub)", () => {
    expect(isLegacyAddonActive({ status: "active", expiresAt: null }, now)).toBe(true);
  });

  it("grants access for an active add-on whose expiry is in the future", () => {
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(isLegacyAddonActive({ status: "active", expiresAt: future }, now)).toBe(true);
  });

  it("denies access once an active add-on has expired", () => {
    const past = new Date(now.getTime() - 1000);
    expect(isLegacyAddonActive({ status: "active", expiresAt: past }, now)).toBe(false);
  });

  it("denies access for non-active statuses regardless of expiry", () => {
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(isLegacyAddonActive({ status: "cancelled", expiresAt: future }, now)).toBe(false);
    expect(isLegacyAddonActive({ status: "superseded", expiresAt: null }, now)).toBe(false);
  });

  it("denies access when there is no add-on at all", () => {
    expect(isLegacyAddonActive(undefined, now)).toBe(false);
    expect(isLegacyAddonActive(null, now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Crypto-verifier path — end to end through activateSubscription
//    Exercises the real verifier wiring with storage/email/db mocked out.
// ---------------------------------------------------------------------------

const activateLegacyAddon = vi.fn(async (params: any) => ({ id: "addon-1", ...params }));
const getCryptoPaymentAddresses = vi.fn(async () => [] as any[]);
const getUserAddonByKey = vi.fn(async () => undefined as any);
const createUserAddon = vi.fn(async (p: any) => p);
const cancelUserAddon = vi.fn(async (id: string) => ({ id }));
const upsertUserSettings = vi.fn(async () => undefined);

// db.select().from().where() — returns rows used by the cancellation path.
let dbRows: any[] = [];
const dbWhere = vi.fn(async () => dbRows);

vi.mock("../server/storage", () => ({
  storage: {
    activateLegacyAddon: (p: any) => activateLegacyAddon(p),
    getCryptoPaymentAddresses: (p?: any) => getCryptoPaymentAddresses(p),
    getUserAddonByKey: (u: string, k: string) => getUserAddonByKey(u, k),
    createUserAddon: (p: any) => createUserAddon(p),
    cancelUserAddon: (id: string) => cancelUserAddon(id),
    getUserSettings: vi.fn(async () => undefined),
    getWalletsByUser: vi.fn(async () => []),
    upsertUserSettings: (p: any) => upsertUserSettings(p),
  },
}));

const sendLegacyPlanReceiptEmail = vi.fn(async () => undefined);

vi.mock("../server/email", () => ({
  sendCryptoPaymentReceivedEmail: vi.fn(async () => undefined),
  sendPremiumWelcomeEmail: vi.fn(async () => undefined),
  sendLegacyPlanReceiptEmail: (...args: any[]) => sendLegacyPlanReceiptEmail(...args),
}));

vi.mock("../server/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: (...args: any[]) => dbWhere(...args) }) }),
  },
}));

function makePayment(addonKey: string) {
  return {
    id: `pay-${addonKey}`,
    userId: "user-1",
    plan: `addon:${addonKey}`,
    chain: "bitcoin",
    expectedAmount: "0.001",
    expectedAsset: "BTC",
    usdAmount: "29",
    toAddress: "addr",
    txHash: "0xhash",
  } as any;
}

describe("crypto-verifier activateSubscription — Legacy add-on activation", () => {
  let activateSubscription: (p: any) => Promise<void>;

  beforeEach(async () => {
    activateLegacyAddon.mockClear();
    getCryptoPaymentAddresses.mockClear();
    sendLegacyPlanReceiptEmail.mockClear();
    dbRows = [{ id: "user-1", email: "buyer@example.com" }];
    ({ activateSubscription } = await import("../server/services/crypto-payment-verifier"));
  });

  it("activates the Annual SKU with a +1 year expiry, paid in crypto", async () => {
    const before = new Date();
    await activateSubscription(makePayment("legacy-plan-yearly"));
    expect(activateLegacyAddon).toHaveBeenCalledTimes(1);
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan-yearly");
    expect(arg.paymentMethod).toBe("crypto");
    expect(arg.paidInChain).toBe("bitcoin");
    expect(arg.externalRef).toBe("crypto:pay-legacy-plan-yearly");
    expect(arg.expiresAt).toBeInstanceOf(Date);
    expect(arg.expiresAt.getFullYear()).toBe(before.getFullYear() + 1);
  });

  it("activates the 5-Year SKU with a +5 year expiry", async () => {
    const before = new Date();
    await activateSubscription(makePayment("legacy-plan-5yr"));
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan-5yr");
    expect(arg.expiresAt.getFullYear()).toBe(before.getFullYear() + 5);
  });

  it("activates the Lifetime SKU with no expiry", async () => {
    await activateSubscription(makePayment("legacy-plan-lifetime"));
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan-lifetime");
    expect(arg.expiresAt).toBeNull();
  });

  it("activates the Monthly SKU with a +30 day expiry", async () => {
    const before = new Date();
    await activateSubscription(makePayment("legacy-plan"));
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan");
    expect(daysBetween(arg.expiresAt, before)).toBe(30);
  });

  it("emails the buyer a crypto receipt with tier, amount, method, and expiry", async () => {
    await activateSubscription(makePayment("legacy-plan-yearly"));
    expect(sendLegacyPlanReceiptEmail).toHaveBeenCalledTimes(1);
    const [to, details] = sendLegacyPlanReceiptEmail.mock.calls[0] as [string, any];
    expect(to).toBe("buyer@example.com");
    expect(details.addonKey).toBe("legacy-plan-yearly");
    expect(details.tierName).toBe(ADDONS["legacy-plan-yearly"].name);
    expect(details.paymentMethod).toBe("crypto");
    expect(details.paymentMethodLabel).toContain("BTC");
    expect(details.amountPaid).toContain("BTC");
    expect(details.amountPaid).toContain("29");
    expect(details.expiresAt).toBeInstanceOf(Date);
  });

  it("does not send a Legacy receipt for non-legacy add-ons", async () => {
    getUserAddonByKey.mockResolvedValueOnce(undefined);
    await activateSubscription({
      id: "pay-ta",
      userId: "user-1",
      plan: "addon:technical-analysis",
      chain: "bitcoin",
      expectedAmount: "0.001",
      expectedAsset: "BTC",
      usdAmount: "29",
      toAddress: "addr",
      txHash: "0xhash",
    } as any);
    expect(sendLegacyPlanReceiptEmail).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Card webhook path — end to end over real HTTP
//    Spins up an Express app posting to /api/stripe/webhook and exercises the
//    exact production handler (handleStripeWebhookEvent) the route uses.
// ---------------------------------------------------------------------------

function checkoutEvent(addonKey: string, sessionId = `cs_${addonKey}`) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        subscription: addonKey === "legacy-plan-5yr" || addonKey === "legacy-plan-lifetime" ? null : "sub_123",
        metadata: {
          userId: "user-1",
          isAddon: "true",
          addonKey,
          addonType: "legacy_plan",
        },
      },
    },
  };
}

describe("POST /api/stripe/webhook — card Legacy Plan activation", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    const express = (await import("express")).default;
    const { handleStripeWebhookEvent } = await import("../server/stripe-webhook");
    const app = express();
    app.use(express.json());
    // Mirrors the production route's thin wrapper (no STRIPE_WEBHOOK_SECRET → event = body).
    app.post("/api/stripe/webhook", async (req: any, res: any) => {
      try {
        await handleStripeWebhookEvent(req.body);
        res.json({ received: true });
      } catch (e) {
        res.status(400).json({ message: "Webhook error" });
      }
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    activateLegacyAddon.mockClear();
    createUserAddon.mockClear();
    cancelUserAddon.mockClear();
    upsertUserSettings.mockClear();
    sendLegacyPlanReceiptEmail.mockClear();
    dbRows = [{ id: "user-1", email: "buyer@example.com" }];
  });

  async function post(body: any) {
    const res = await fetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  }

  it("activates the Annual SKU with no expiry (card subscription auto-renews)", async () => {
    const res = await post(checkoutEvent("legacy-plan-yearly"));
    expect(res.status).toBe(200);
    expect(activateLegacyAddon).toHaveBeenCalledTimes(1);
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan-yearly");
    expect(arg.paymentMethod).toBe("stripe");
    expect(arg.externalRef).toBe("stripe:cs_legacy-plan-yearly");
    expect(arg.expiresAt).toBeNull();
  });

  it("activates the 5-Year SKU with a +5 year expiry", async () => {
    const before = new Date();
    await post(checkoutEvent("legacy-plan-5yr"));
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan-5yr");
    expect(arg.expiresAt).not.toBeNull();
    expect(new Date(arg.expiresAt).getFullYear()).toBe(before.getFullYear() + 5);
  });

  it("activates the Lifetime SKU with no expiry", async () => {
    await post(checkoutEvent("legacy-plan-lifetime"));
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan-lifetime");
    expect(arg.expiresAt).toBeNull();
  });

  it("activates the Monthly SKU with no expiry (card subscription)", async () => {
    await post(checkoutEvent("legacy-plan"));
    const arg = activateLegacyAddon.mock.calls[0][0];
    expect(arg.addonKey).toBe("legacy-plan");
    expect(arg.expiresAt).toBeNull();
  });

  it("emails the buyer a card receipt with tier, USD amount, method, and null expiry", async () => {
    await post(checkoutEvent("legacy-plan-yearly"));
    expect(sendLegacyPlanReceiptEmail).toHaveBeenCalledTimes(1);
    const [to, details] = sendLegacyPlanReceiptEmail.mock.calls[0] as [string, any];
    expect(to).toBe("buyer@example.com");
    expect(details.addonKey).toBe("legacy-plan-yearly");
    expect(details.tierName).toBe(ADDONS["legacy-plan-yearly"].name);
    expect(details.paymentMethod).toBe("card");
    expect(details.paymentMethodLabel).toBe("Credit / debit card");
    expect(details.amountPaid).toBe("$29.00");
    expect(details.expiresAt).toBeNull();
  });

  it("cancels the legacy add-on when its subscription is canceled", async () => {
    // The cancellation path looks up addons by stripeSubscriptionId and cancels them.
    dbRows = [{ id: "addon-1", stripeSubscriptionId: "sub_123" }];
    const res = await post({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123", status: "canceled", customer: "cus_1" } },
    });
    expect(res.status).toBe(200);
    expect(cancelUserAddon).toHaveBeenCalledWith("addon-1");
  });
});
