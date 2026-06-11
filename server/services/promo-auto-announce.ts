import { db } from "../db";
import { featureAnnouncements, users } from "@shared/schema";
import { and, eq, gte, sql } from "drizzle-orm";
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

// In-process single-flight guard: a check takes a few seconds while the
// interval is 6h, but the startup check could overlap a manual trigger.
let isRunning = false;

// Deterministic 32-bit signed key from a string, for pg advisory locks.
function lockKey(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Atomically reserve the one send-slot for this campaign occurrence. Runs the
 * dedupe SELECT and the row INSERT inside a single transaction guarded by a
 * transaction-scoped Postgres advisory lock keyed on (title + window-start), so
 * even overlapping scheduler runs across multiple instances — or a manual send
 * racing the scheduler — can never both create a row. Returns the new row id, or
 * null if this occurrence was already sent (auto OR by hand). The row is
 * committed before any email goes out, so a concurrent check sees it and skips.
 */
async function reserveCampaignSend(
  title: string,
  description: string,
  ctaLabel: string,
  ctaUrl: string,
  windowStart: Date,
  totalRecipients: number,
): Promise<string | null> {
  const key = lockKey(`${title}|${windowStart.toISOString()}`);
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${key})`);

    const existing = await tx
      .select({ id: featureAnnouncements.id })
      .from(featureAnnouncements)
      .where(
        and(eq(featureAnnouncements.title, title), gte(featureAnnouncements.sentAt, windowStart)),
      )
      .limit(1);
    if (existing.length > 0) return null;

    const [row] = await tx
      .insert(featureAnnouncements)
      .values({
        title,
        description,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        audienceTier: "all",
        sentBy: "auto-promo",
        totalRecipients,
        totalSent: 0,
        totalFailed: 0,
      })
      .returning();
    return row.id;
  });
}

async function sendCampaign(
  announcementId: string,
  title: string,
  description: string,
  ctaLabel: string,
  ctaUrl: string,
  validUsers: Array<{ id: string; email: string | null; firstName: string | null }>,
): Promise<void> {
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
      .where(eq(featureAnnouncements.id, announcementId));
  } catch (e: any) {
    console.error("[promo-auto] Failed to update send counts:", e.message);
  }
  console.log(`[promo-auto] "${title}" — ${sent} sent, ${failed} failed of ${validUsers.length}`);
}

async function eligibleUsers() {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      unsubscribedFromAnnouncements: users.unsubscribedFromAnnouncements,
    })
    .from(users);
  return allUsers.filter(
    (u) =>
      u.email &&
      !u.email.endsWith("@example.com") &&
      !u.email.endsWith("@test.com") &&
      !u.unsubscribedFromAnnouncements,
  );
}

export async function checkAndSendPromoAnnouncements(): Promise<void> {
  if (process.env.PROMO_AUTO_ANNOUNCE_DISABLED === "1") return;
  if (isRunning) return;
  isRunning = true;
  try {
    const now = new Date();
    const active = getActiveCampaigns(now).filter((c) => c.kind !== "memberAnniversary");
    if (active.length === 0) return;
    for (const c of active) {
      const windowStart = activeWindowStart(c, now);
      if (!windowStart) continue;
      const ann = buildCampaignAnnouncement(c);
      const validUsers = await eligibleUsers();
      const announcementId = await reserveCampaignSend(
        ann.title,
        ann.description,
        ann.ctaLabel,
        ann.ctaUrl,
        windowStart,
        validUsers.length,
      );
      if (!announcementId) continue; // already sent this occurrence (auto or by hand)
      console.log(`[promo-auto] Window open for "${c.name}" — auto-sending announcement.`);
      await sendCampaign(
        announcementId,
        ann.title,
        ann.description,
        ann.ctaLabel,
        ann.ctaUrl,
        validUsers,
      );
    }
  } catch (err: any) {
    console.error("[promo-auto] check failed:", err.message);
  } finally {
    isRunning = false;
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
