import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { userAddons as userAddonsTable, userSettings as userSettingsTable } from "@shared/schema";
import { isLegacyAddon, computeLegacyAddonExpiry } from "./stripe";

// Shared handler for Stripe webhook events. The route is responsible for
// obtaining/verifying the event (signed when STRIPE_WEBHOOK_SECRET is set,
// otherwise read directly from the body); this function owns all the business
// logic so it can be exercised end-to-end in tests without booting the full app.
export async function handleStripeWebhookEvent(event: any): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const isAddon = session.metadata?.isAddon === "true";

    if (isAddon && userId) {
      const addonKey = session.metadata?.addonKey;
      const addonType = session.metadata?.addonType;
      if (addonKey && addonType) {
        if (isLegacyAddon(addonKey)) {
          const addonExpiresAt = computeLegacyAddonExpiry(addonKey, "stripe");
          await storage.activateLegacyAddon({
            userId,
            addonType,
            addonKey,
            paymentMethod: "stripe",
            stripeSubscriptionId: session.subscription || null,
            externalRef: session.id ? `stripe:${session.id}` : null,
            expiresAt: addonExpiresAt,
          });
        } else {
          const existingAddon = await storage.getUserAddonByKey(userId, addonKey);
          if (!existingAddon) {
            await storage.createUserAddon({
              userId,
              addonType,
              addonKey,
              status: "active",
              paymentMethod: "stripe",
              stripeSubscriptionId: session.subscription || null,
              expiresAt: null,
            });
          }
        }
      }
    } else if (userId) {
      const plan = session.metadata?.plan || "monthly";
      const billingCycle = (plan === "yearly" || plan === "pro-yearly") ? "yearly" : "monthly";
      const tier = session.metadata?.tier || "premium";
      const existing = await storage.getUserSettings(userId);
      await storage.upsertUserSettings({
        userId,
        taxMethod: existing?.taxMethod || "FIFO",
        defaultCurrency: existing?.defaultCurrency || "USD",
        subscriptionTier: tier,
        subscriptionBillingCycle: billingCycle,
        subscriptionPaymentMethod: "stripe",
        subscriptionExpiresAt: null,
        subscriptionRenewalWallet: existing?.subscriptionRenewalWallet || null,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      });
    }
  } else if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object;
    const status = subscription.status;
    const customerId = subscription.customer;
    if (status === "canceled" || status === "unpaid") {
      const addonSubs = await db
        .select()
        .from(userAddonsTable)
        .where(eq(userAddonsTable.stripeSubscriptionId, subscription.id as string));
      for (const addon of addonSubs) {
        await storage.cancelUserAddon(addon.id);
      }

      const allSettings = await db
        .select()
        .from(userSettingsTable)
        .where(eq(userSettingsTable.stripeCustomerId, customerId as string));
      for (const s of allSettings) {
        if (s.stripeSubscriptionId === subscription.id) {
          await storage.upsertUserSettings({
            userId: s.userId,
            taxMethod: s.taxMethod || "FIFO",
            defaultCurrency: s.defaultCurrency || "USD",
            subscriptionTier: "free",
            subscriptionBillingCycle: null,
            subscriptionPaymentMethod: null,
            subscriptionExpiresAt: null,
            stripeCustomerId: s.stripeCustomerId,
            stripeSubscriptionId: s.stripeSubscriptionId,
          });
        }
      }
    }
  }
}
