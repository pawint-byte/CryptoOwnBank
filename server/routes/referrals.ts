import { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";

export function registerReferralRoutes(app: Express) {
  // The member's own referral dashboard: code + real, server-tracked counts.
  app.get("/api/referrals/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });
}
