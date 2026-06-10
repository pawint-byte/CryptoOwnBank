import { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";

// Compute the three non-custodial onboarding steps from live, real data so they
// can never be faked:
//  1. Wallet connected  -> member has at least one saved wallet
//  2. Recovery Kit       -> member actually generated a Sovereignty Recovery Kit
//                           (the kitConfirmed flag is written ONLY by the real
//                           GET /api/sovereignty-kit/export path, never by a
//                           self-attested checkbox)
//  3. One real action    -> member has a price alert or a Legacy Plan
async function computeOnboarding(userId: string) {
  const [wallets, onboarding, alerts, legacyPlan] = await Promise.all([
    storage.getWalletsByUser(userId),
    storage.getFoundingOnboarding(userId),
    storage.getPriceAlertsByUser(userId),
    storage.getLegacyPlan(userId),
  ]);

  const walletConnected = wallets.length > 0;
  const kitCreated = !!onboarding?.kitConfirmed;
  const actionCompleted = alerts.length > 0 || !!legacyPlan;

  return {
    walletConnected,
    kitCreated,
    actionCompleted,
    complete: walletConnected && kitCreated && actionCompleted,
  };
}

export function registerFoundingRoutes(app: Express) {
  // Public live counter — no auth, powers the "N of 1,000 left" display for
  // logged-out visitors too.
  app.get("/api/founding/stats", async (_req, res) => {
    try {
      const stats = await storage.getFoundingStats();
      res.json(stats);
    } catch (error) {
      console.error("[founding] stats error:", error);
      res.status(500).json({ message: "Failed to load Founding Member stats" });
    }
  });

  // A member's own status: their seat (if claimed), live onboarding progress,
  // whether they can claim now, and the global stats.
  app.get("/api/founding/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [member, stats, onboarding] = await Promise.all([
        storage.getFoundingMember(userId),
        storage.getFoundingStats(),
        computeOnboarding(userId),
      ]);
      res.json({
        member: member ?? null,
        onboarding: {
          walletConnected: onboarding.walletConnected,
          kitCreated: onboarding.kitCreated,
          actionCompleted: onboarding.actionCompleted,
        },
        canClaim: !member && onboarding.complete && stats.remaining > 0,
        stats,
      });
    } catch (error) {
      console.error("[founding] status error:", error);
      res.status(500).json({ message: "Failed to load Founding Member status" });
    }
  });

  // Claim the next seat. Re-verifies all three steps from live data, then
  // allocates a seat number atomically (concurrency-safe, capped at 1,000).
  app.post("/api/founding/claim", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const onboarding = await computeOnboarding(userId);
      const result = await storage.claimFoundingSeat(userId, onboarding.complete);

      if (result.status === "incomplete") {
        return res.status(400).json({ message: "Finish all three steps first", onboarding });
      }
      if (result.status === "sold_out") {
        return res.status(409).json({ message: "All 1,000 Founding Member seats have been claimed" });
      }
      res.json({ status: result.status, member: result.member });
    } catch (error) {
      console.error("[founding] claim error:", error);
      res.status(500).json({ message: "Failed to claim your Founding Member seat" });
    }
  });
}
