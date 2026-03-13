import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq, and, lt, isNotNull, isNull, or } from "drizzle-orm";
import { sendInactivityReminderEmail } from "../email";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const REMINDER_COOLDOWN_MS = 25 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function checkInactiveUsers() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);
    const sixtyDaysAgo = new Date(now.getTime() - SIXTY_DAYS_MS);
    const reminderCooldown = new Date(now.getTime() - REMINDER_COOLDOWN_MS);

    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastLoginAt: users.lastLoginAt,
      lastReminderSentAt: users.lastReminderSentAt,
      createdAt: users.createdAt,
    }).from(users);

    const eligibleUsers = allUsers.filter(u => {
      if (!u.email) return false;
      if (u.email.endsWith("@example.com") || u.email.endsWith("@test.com")) return false;

      if (u.lastReminderSentAt && u.lastReminderSentAt > reminderCooldown) return false;

      const lastActive = u.lastLoginAt || u.createdAt;
      if (!lastActive) return false;

      return lastActive < thirtyDaysAgo;
    });

    let sent = 0;
    for (const user of eligibleUsers) {
      const lastActive = user.lastLoginAt || user.createdAt;
      const daysInactive = Math.floor((now.getTime() - (lastActive?.getTime() || 0)) / (24 * 60 * 60 * 1000));

      try {
        await sendInactivityReminderEmail(user.email!, user.firstName || "there", daysInactive);
        await db.update(users).set({ lastReminderSentAt: now }).where(eq(users.id, user.id));
        sent++;
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`[inactivity-reminder] Failed to send to ${user.email}:`, err);
      }
    }

    if (sent > 0) {
      console.log(`[inactivity-reminder] Sent ${sent} reminder emails`);
    }
  } catch (err) {
    console.error("[inactivity-reminder] Check failed:", err);
  }
}

export function startInactivityReminder() {
  console.log("[inactivity-reminder] Scheduler started — checking every 24h");
  setTimeout(() => checkInactiveUsers(), 60000);
  setInterval(() => checkInactiveUsers(), CHECK_INTERVAL_MS);
}
