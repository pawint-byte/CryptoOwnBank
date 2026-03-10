import { storage } from "../storage";
import { db } from "../db";
import { userSettings, wallets, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { XummSdk } from "xumm-sdk";

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

async function sendXamanRenewalRequest(
  walletAddress: string,
  billingCycle: string,
  userId: string,
  daysLeft: number
): Promise<string | null> {
  const xumm = getXummSdk();
  if (!xumm) {
    console.warn("[renewal] XUMM SDK not configured, cannot send wallet push");
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
          web: `${process.env.REPLIT_DOMAINS?.split(",")[0] ? "https://" + process.env.REPLIT_DOMAINS.split(",")[0] : "https://cryptoownbank.com"}/ownbank/settings`,
        },
      },
      custom_meta: {
        instruction: memo,
        blob: JSON.stringify({ type: "subscription_renewal", userId, billingCycle }),
      },
      user_token: walletAddress,
    } as any);

    if (payload?.uuid) {
      console.log(`[renewal] Sent Xaman renewal request to wallet ${walletAddress} for user ${userId}, payload: ${payload.uuid}`);
      return payload.uuid;
    }
  } catch (err) {
    console.error(`[renewal] Failed to send Xaman renewal request:`, err);
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

    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "https://cryptoownbank.com";

    const payLink = `${baseUrl}/pay?to=${COLD_WALLET}&amount=${amount}&currency=RLUSD&memo=Premium+${plan}+Renewal`;

    const subject = daysLeft <= 0
      ? `Your CryptoOwnBank Premium subscription has expired`
      : `Your CryptoOwnBank Premium expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "CryptoOwnBank <noreply@cryptoownbank.com>",
      to: user.email,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
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
      `,
    });

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

      if (settings.subscriptionRenewalWallet) {
        const xamanResult = await sendXamanRenewalRequest(
          settings.subscriptionRenewalWallet,
          settings.subscriptionBillingCycle || "monthly",
          settings.userId,
          daysLeft
        );
        if (xamanResult) {
          method = "xaman";
          paymentId = xamanResult;
        }
      }

      if (method === "paylink") {
        const emailSent = await sendEmailPayLink(
          settings.userId,
          settings.subscriptionBillingCycle || "monthly",
          daysLeft
        );
        if (emailSent) {
          method = "email";
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

export function startSubscriptionRenewalService() {
  console.log("[renewal] Starting subscription renewal service (checks every hour)");
  setInterval(checkAndRenewSubscriptions, 60 * 60 * 1000);
  setTimeout(checkAndRenewSubscriptions, 30_000);
}
