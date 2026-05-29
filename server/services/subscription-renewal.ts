import { storage } from "../storage";
import { db } from "../db";
import { userSettings, wallets, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { XummSdk } from "xumm-sdk";
import { sendEmail as sendMainEmail } from "../email";

const MONTHLY_PRICE_XRP = "29";
const YEARLY_PRICE_XRP = "199";
const MONTHLY_PRICE_RLUSD = "29";
const YEARLY_PRICE_RLUSD = "199";

const COLD_WALLET = "rwQ6SJMX6j7R5mVUXg5tSPgKRKvH12YQzc";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

function getXummSdk(): XummSdk | null {
  const apiKey = process.env.VITE_XUMM_API_KEY || process.env.XUMM_API_KEY;
  const apiSecret = process.env.XUMM_API_SECRET;
  if (apiKey && apiSecret) {
    return new XummSdk(apiKey, apiSecret);
  }
  return null;
}

function getDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date();
  return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getNotificationType(daysLeft: number): string | null {
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 1) return "1day";
  if (daysLeft <= 3) return "3day";
  if (daysLeft <= 7) return "7day";
  return null;
}

function textToHex(text: string): string {
  return Buffer.from(text, "utf8").toString("hex").toUpperCase();
}

function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  return "https://cryptoownbank.com";
}

function buildPayLink(billingCycle: string): string {
  const isYearly = billingCycle === "yearly";
  const amount = isYearly ? YEARLY_PRICE_RLUSD : MONTHLY_PRICE_RLUSD;
  const plan = isYearly ? "Annual" : "Monthly";
  return `${getBaseUrl()}/pay?to=${COLD_WALLET}&amount=${amount}&currency=RLUSD&memo=Premium+${plan}+Renewal`;
}

async function sendXamanRenewalRequest(
  walletAddress: string,
  billingCycle: string,
  userId: string,
  daysLeft: number
): Promise<string | null> {
  const xumm = getXummSdk();
  if (!xumm) {
    console.warn("[renewal] XUMM SDK not configured, cannot create renewal payload");
    return null;
  }

  const isYearly = billingCycle === "yearly";
  const rlusdAmount = isYearly ? YEARLY_PRICE_RLUSD : MONTHLY_PRICE_RLUSD;

  const memo = daysLeft <= 0
    ? `CryptoOwnBank Premium ${isYearly ? "Annual" : "Monthly"} renewal - subscription expired`
    : `CryptoOwnBank Premium ${isYearly ? "Annual" : "Monthly"} renewal - expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  try {
    const payload = await xumm.payload.create({
      txjson: {
        TransactionType: "Payment",
        Destination: COLD_WALLET,
        Amount: {
          currency: "RLUSD",
          value: rlusdAmount,
          issuer: RLUSD_ISSUER,
        },
        Memos: [
          {
            Memo: {
              MemoType: textToHex("text/plain"),
              MemoData: textToHex(memo),
            },
          },
        ],
      },
      options: {
        submit: true,
        expire: 1440,
        return_url: {
          web: `${getBaseUrl()}/ownbank/settings`,
        },
      },
      custom_meta: {
        instruction: memo,
        blob: JSON.stringify({ type: "subscription_renewal", userId, billingCycle }),
      },
    } as any);

    if (payload?.uuid) {
      console.log(`[renewal] Created Xaman renewal payload ${payload.uuid} for user ${userId} (wallet: ${walletAddress})`);
      return payload.uuid;
    }
  } catch (err) {
    console.error(`[renewal] Failed to create Xaman renewal payload:`, err);
  }
  return null;
}

async function sendEmailPayLink(
  userId: string,
  billingCycle: string,
  daysLeft: number
): Promise<boolean> {
  try {
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (!user?.email) return false;

    const isYearly = billingCycle === "yearly";
    const amount = isYearly ? YEARLY_PRICE_RLUSD : MONTHLY_PRICE_RLUSD;
    const plan = isYearly ? "Annual" : "Monthly";
    const payLink = buildPayLink(billingCycle);

    const subject = daysLeft <= 0
      ? `Your CryptoOwnBank Premium subscription has expired`
      : `Your CryptoOwnBank Premium expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
            <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
          </div>
          <div style="padding: 30px 0;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Renew Your Premium</h2>
            <p style="color: #555; line-height: 1.6;">
              ${daysLeft <= 0
                ? `Your CryptoOwnBank Premium ${plan} subscription has expired. Renew now to keep your premium features.`
                : `Your CryptoOwnBank Premium ${plan} subscription expires in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>. Renew now to avoid any interruption.`
              }
            </p>
            <div style="margin: 24px 0;">
              <a href="${payLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Renew for $${amount} RLUSD
              </a>
            </div>
            <p style="color: #888; font-size: 13px;">
              Or copy this link: <a href="${payLink}" style="color: #2563eb;">${payLink}</a>
            </p>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">
              You can also renew from your Settings page with any supported cryptocurrency.
            </p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
            <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
          </div>
        </div>
      `;

    await sendMainEmail(user.email, subject, html);

    console.log(`[renewal] Sent renewal email to ${user.email} for user ${userId}`);
    return true;
  } catch (err) {
    console.error(`[renewal] Failed to send renewal email:`, err);
    return false;
  }
}

async function checkAndRenewSubscriptions() {
  try {
    const expiringSubs = await storage.getExpiringCryptoSubscriptions(7);

    for (const settings of expiringSubs) {
      if (!settings.subscriptionExpiresAt) continue;

      const daysLeft = getDaysUntilExpiry(new Date(settings.subscriptionExpiresAt));
      const notificationType = getNotificationType(daysLeft);
      if (!notificationType) continue;

      const alreadySent = await storage.hasRecentRenewalNotification(
        settings.userId,
        notificationType,
        notificationType === "expired" ? 24 : 48
      );
      if (alreadySent) continue;

      if (daysLeft <= 0) {
        await storage.upsertUserSettings({
          userId: settings.userId,
          subscriptionTier: "free",
          subscriptionBillingCycle: null,
          subscriptionPaymentMethod: settings.subscriptionPaymentMethod,
          subscriptionExpiresAt: settings.subscriptionExpiresAt,
          subscriptionRenewalWallet: settings.subscriptionRenewalWallet,
          stripeCustomerId: settings.stripeCustomerId,
          stripeSubscriptionId: settings.stripeSubscriptionId,
        });
        console.log(`[renewal] Downgraded user ${settings.userId} to free — subscription expired`);
      }

      let method = "paylink";
      let paymentId: string | null = null;

      const emailSent = await sendEmailPayLink(
        settings.userId,
        settings.subscriptionBillingCycle || "monthly",
        daysLeft
      );
      if (emailSent) {
        method = "email";
      }

      if (settings.subscriptionRenewalWallet) {
        const xamanResult = await sendXamanRenewalRequest(
          settings.subscriptionRenewalWallet,
          settings.subscriptionBillingCycle || "monthly",
          settings.userId,
          daysLeft
        );
        if (xamanResult) {
          method = emailSent ? "xaman+email" : "xaman";
          paymentId = xamanResult;
        }
      }

      await storage.createRenewalNotification({
        userId: settings.userId,
        type: notificationType,
        method,
        paymentId,
      });
    }
  } catch (err) {
    console.error("[renewal] Error in subscription renewal check:", err);
  }
}

async function checkAndExpireAddons() {
  try {
    const expiringAddons = await storage.getExpiringAddons(0);
    const now = new Date();
    for (const addon of expiringAddons) {
      if (addon.expiresAt && new Date(addon.expiresAt) < now) {
        await storage.updateUserAddonStatus(addon.id, "expired");
        console.log(`[renewal] Expired addon ${addon.addonKey} for user ${addon.userId}`);
      }
    }
  } catch (err) {
    console.error("[renewal] Error checking addon expiry:", err);
  }
}

// Legacy Plan SKUs that carry a hard expiry and do NOT auto-renew: the 5-Year
// one-time purchase (both rails) and the crypto-paid Annual (a one-time prepaid
// term). Lifetime never expires; card-paid Annual/Monthly auto-renew via Stripe.
// Those are excluded because their stored expiresAt is null.
const LEGACY_WARN_ADDON_KEYS = ["legacy-plan-5yr", "legacy-plan-yearly"];
const LEGACY_EXPIRY_WARN_DAYS = 30;
const LEGACY_EXPIRY_WARN_TYPE = "legacy_expiry";

function legacyAddonLabel(addonKey: string): string {
  if (addonKey === "legacy-plan-5yr") return "5-Year Legacy Plan";
  if (addonKey === "legacy-plan-yearly") return "Annual Legacy Plan";
  return "Legacy Plan";
}

async function sendLegacyExpiryWarningEmail(
  userId: string,
  addonKey: string,
  daysLeft: number,
  expiresAt: Date,
): Promise<boolean> {
  try {
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (!user?.email) return false;

    const planLabel = legacyAddonLabel(addonKey);
    const pricingLink = `${getBaseUrl()}/pricing`;
    const expiryDate = expiresAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const subject = `Your ${planLabel} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
            <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
          </div>
          <div style="padding: 30px 0;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Your Legacy Plan is about to expire</h2>
            <p style="color: #555; line-height: 1.6;">
              Your <strong>${planLabel}</strong> expires on <strong>${expiryDate}</strong>
              (in ${daysLeft} day${daysLeft === 1 ? "" : "s"}). This plan was a one-time
              purchase and does <strong>not auto-renew</strong>, so your crypto inheritance
              coverage will end unless you renew it.
            </p>
            <p style="color: #555; line-height: 1.6;">
              Renew now to keep your beneficiaries protected without interruption.
            </p>
            <div style="margin: 24px 0;">
              <a href="${pricingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Renew your Legacy Plan
              </a>
            </div>
            <p style="color: #888; font-size: 13px;">
              Or copy this link: <a href="${pricingLink}" style="color: #2563eb;">${pricingLink}</a>
            </p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
            <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
          </div>
        </div>
      `;

    await sendMainEmail(user.email, subject, html);
    console.log(`[renewal] Sent Legacy Plan expiry warning to ${user.email} (user ${userId}, ${addonKey}, ${daysLeft}d left)`);
    return true;
  } catch (err) {
    console.error("[renewal] Failed to send Legacy Plan expiry warning:", err);
    return false;
  }
}

async function checkAndWarnLegacyExpiry() {
  try {
    const expiringAddons = await storage.getExpiringAddons(LEGACY_EXPIRY_WARN_DAYS);
    for (const addon of expiringAddons) {
      if (!LEGACY_WARN_ADDON_KEYS.includes(addon.addonKey)) continue;
      if (!addon.expiresAt) continue;

      const daysLeft = getDaysUntilExpiry(new Date(addon.expiresAt));
      // Only warn for plans still active and inside the warning window.
      if (daysLeft <= 0 || daysLeft > LEGACY_EXPIRY_WARN_DAYS) continue;

      // Send the warning at most once per expiry cycle (window covers the whole
      // remaining term so the 4h sweep doesn't re-email daily).
      const alreadySent = await storage.hasRecentRenewalNotification(
        addon.userId,
        LEGACY_EXPIRY_WARN_TYPE,
        (LEGACY_EXPIRY_WARN_DAYS + 1) * 24,
      );
      if (alreadySent) continue;

      const emailSent = await sendLegacyExpiryWarningEmail(
        addon.userId,
        addon.addonKey,
        daysLeft,
        new Date(addon.expiresAt),
      );
      if (!emailSent) continue;

      await storage.createRenewalNotification({
        userId: addon.userId,
        type: LEGACY_EXPIRY_WARN_TYPE,
        method: "email",
        paymentId: null,
      });
    }
  } catch (err) {
    console.error("[renewal] Error checking Legacy Plan expiry warnings:", err);
  }
}

export function startSubscriptionRenewalService() {
  const offsetMs = 150 * 60 * 1000;
  console.log("[renewal] Starting subscription renewal service (checks every 4h, offset 150min)");
  setTimeout(() => {
    checkAndRenewSubscriptions().catch(() => {});
    checkAndExpireAddons().catch(() => {});
    checkAndWarnLegacyExpiry().catch(() => {});
    setInterval(checkAndRenewSubscriptions, 4 * 60 * 60 * 1000);
    setInterval(checkAndExpireAddons, 4 * 60 * 60 * 1000);
    setInterval(checkAndWarnLegacyExpiry, 4 * 60 * 60 * 1000);
  }, offsetMs);
}
