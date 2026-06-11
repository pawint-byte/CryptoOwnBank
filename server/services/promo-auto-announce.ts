import { db } from "../db";
import { featureAnnouncements, users } from "@shared/schema";
import { and, eq, gte } from "drizzle-orm";
import {
  getActiveCampaigns,
  activeWindowStart,
  buildCampaignAnnouncement,
} from "@shared/promo-calendar";
import { sendFeatureAnnouncementEmail } from "../email";

// Auto-distribution of crypto-date campaign announcements. When a campaign
// window opens, the matching announcement is emailed to members ONCE per
// occurrence — so the opportunity is never missed even if no one sends it by
// hand. Safeguards:
//  - one send per occurrence (deduped against the feature_announcements table,
//    so a manual send during the same window also blocks the auto-send);
//  - respects users.unsubscribedFromAnnouncements;
//  - master kill-switch via PROMO_AUTO_ANNOUNCE_DISABLED=1.
// Anniversary campaigns are per-user and are intentionally NOT auto-blasted.

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

async function alreadySentThisWindow(title: string, windowStart: Date): Promise<boolean> {
  const rows = await db
    .select({ id: featureAnnouncements.id })
    .from(featureAnnouncements)
    .where(and(eq(featureAnnouncements.title, title), gte(featureAnnouncements.sentAt, windowStart)))
    .limit(1);
  return rows.length > 0;
}

async function sendCampaign(
  title: string,
  description: string,
  ctaLabel: string,
  ctaUrl: string,
): Promise<void> {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      unsubscribedFromAnnouncements: users.unsubscribedFromAnnouncements,
    })
    .from(users);

  const validUsers = allUsers.filter(
    (u) =>
      u.email &&
      !u.email.endsWith("@example.com") &&
      !u.email.endsWith("@test.com") &&
      !u.unsubscribedFromAnnouncements,
  );

  const [announcement] = await db
    .insert(featureAnnouncements)
    .values({
      title,
      description,
      ctaLabel: ctaLabel || null,
      ctaUrl: ctaUrl || null,
      audienceTier: "all",
      sentBy: "auto-promo",
      totalRecipients: validUsers.length,
      totalSent: 0,
      totalFailed: 0,
    })
    .returning();

  let sent = 0;
  let failed = 0;
  for (const u of validUsers) {
    try {
      const unsubUrl = `https://cryptoownbank.com/unsubscribe?uid=${u.id}`;
      await sendFeatureAnnouncementEmail(
        u.email!,
        u.firstName || "there",
        title,
        description,
        ctaLabel || null,
        ctaUrl || null,
        unsubUrl,
      );
      sent++;
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      failed++;
      console.error(`[promo-auto] Failed to email ${u.email}:`, err.message);
    }
  }

  try {
    await db
      .update(featureAnnouncements)
      .set({ totalSent: sent, totalFailed: failed })
      .where(eq(featureAnnouncements.id, announcement.id));
  } catch (e: any) {
    console.error("[promo-auto] Failed to update send counts:", e.message);
  }
  console.log(`[promo-auto] "${title}" — ${sent} sent, ${failed} failed of ${validUsers.length}`);
}

export async function checkAndSendPromoAnnouncements(): Promise<void> {
  if (process.env.PROMO_AUTO_ANNOUNCE_DISABLED === "1") return;
  try {
    const now = new Date();
    const active = getActiveCampaigns(now).filter((c) => c.kind !== "memberAnniversary");
    for (const c of active) {
      const windowStart = activeWindowStart(c, now);
      if (!windowStart) continue;
      const ann = buildCampaignAnnouncement(c);
      if (await alreadySentThisWindow(ann.title, windowStart)) continue;
      console.log(`[promo-auto] Window open for "${c.name}" — auto-sending announcement.`);
      await sendCampaign(ann.title, ann.description, ann.ctaLabel, ann.ctaUrl);
    }
  } catch (err: any) {
    console.error("[promo-auto] check failed:", err.message);
  }
}

export function startPromoAutoAnnounce(): void {
  if (process.env.PROMO_AUTO_ANNOUNCE_DISABLED === "1") {
    console.log("[promo-auto] disabled via PROMO_AUTO_ANNOUNCE_DISABLED");
    return;
  }
  // First check shortly after boot, then on a fixed interval.
  setTimeout(() => {
    checkAndSendPromoAnnouncements();
  }, 30_000);
  setInterval(checkAndSendPromoAnnouncements, CHECK_INTERVAL_MS);
  console.log("[promo-auto] scheduler started (checks every 6h).");
}
