import type { Express } from "express";
import { z } from "zod";
import { isAuthenticated, isAdmin } from "../replit_integrations/auth";
import { storage } from "../storage";
import { generateProposals } from "../services/agent-proposals";

// HIDDEN proposals-only prototype ("Agent Lab").
// Every route is admin-gated, so it is invisible to regular members. There is no
// sidebar entry and no signing/execution path — approving a proposal only records
// the decision; it never moves funds.

const mandateBodySchema = z.object({
  riskTolerance: z.enum(["conservative", "balanced", "aggressive"]),
  floorUsd: z.coerce.number().min(0),
  maxMoveUsd: z.coerce.number().min(0),
  enabled: z.boolean(),
});

export function registerAgentRoutes(app: Express) {
  app.get("/api/agent/mandate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mandate = await storage.getAgentMandate(userId);
      res.json(mandate ?? null);
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to load mandate" });
    }
  });

  app.put("/api/agent/mandate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = mandateBodySchema.parse(req.body);
      const mandate = await storage.upsertAgentMandate(userId, {
        riskTolerance: parsed.riskTolerance,
        floorUsd: String(parsed.floorUsd),
        maxMoveUsd: String(parsed.maxMoveUsd),
        enabled: parsed.enabled,
      });
      res.json(mandate);
    } catch (e: any) {
      if (e?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid guardrails", errors: e.errors });
      }
      res.status(500).json({ message: e?.message ?? "Failed to save guardrails" });
    }
  });

  app.post("/api/agent/proposals/generate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mandate = await storage.getAgentMandate(userId);
      if (!mandate) {
        return res.status(400).json({ message: "Set your guardrails first." });
      }
      // Honor the on/off switch: when disabled, the agent makes no suggestions.
      if (!mandate.enabled) {
        await storage.deletePendingAgentProposals(userId);
        return res.json([]);
      }
      const positions = await storage.getPositionsByUser(userId);
      const candidates = generateProposals(mandate, positions);
      // Clear stale pending proposals before re-generating (keeps the inbox honest).
      await storage.deletePendingAgentProposals(userId);
      const created = [];
      for (const c of candidates) {
        created.push(await storage.createAgentProposal({ userId, ...c }));
      }
      res.json(created);
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to generate proposals" });
    }
  });

  app.get("/api/agent/proposals", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      res.json(await storage.getAgentProposals(userId));
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to load proposals" });
    }
  });

  app.post("/api/agent/proposals/:id/dismiss", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await storage.updateAgentProposalStatus(req.params.id, userId, "dismissed");
      if (!updated) return res.status(404).json({ message: "Proposal not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to dismiss proposal" });
    }
  });

  app.post("/api/agent/proposals/:id/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await storage.updateAgentProposalStatus(req.params.id, userId, "approved");
      if (!updated) return res.status(404).json({ message: "Proposal not found" });
      // PROTOTYPE: no signing/execution is wired. Nothing moves on-chain.
      res.json({
        proposal: updated,
        executed: false,
        message:
          "Prototype only — this records your approval but does NOT sign or move any funds. " +
          "In the live version, this is where you'd review and sign the transaction in Xaman.",
      });
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to approve proposal" });
    }
  });
}
