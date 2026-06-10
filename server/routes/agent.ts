import type { Express } from "express";
import { z } from "zod";
import { isAuthenticated, isAdmin } from "../replit_integrations/auth";
import { storage } from "../storage";
import { generateProposals, generatePaymentProposals } from "../services/agent-proposals";

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

const payeeBodySchema = z.object({
  chain: z.enum(["xrpl", "stellar"]),
  label: z.string().min(1).max(100),
  address: z.string().min(10).max(120),
  destinationTag: z.string().max(30).optional().nullable(),
  assetCode: z.string().min(1).max(20),
  issuer: z.string().max(120).optional().nullable(),
  amount: z.coerce.number().positive(),
  note: z.string().max(200).optional().nullable(),
  enabled: z.boolean().optional(),
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
      const payees = await storage.getAgentPayees(userId);
      const candidates = [
        ...generateProposals(mandate, positions),
        ...generatePaymentProposals(payees, mandate, positions),
      ];
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
      // For payment proposals the member signs in their OWN wallet on the client;
      // they pass back the resulting txHash so we can record it ("track after").
      // The server never signs and never holds keys. The hash is for the audit
      // trail only — it never moves funds — but we still validate its shape so the
      // history can't be poisoned with arbitrary strings.
      const rawHash = req.body?.txHash;
      if (rawHash !== undefined && rawHash !== null && (typeof rawHash !== "string" || !/^[A-Za-z0-9]{16,128}$/.test(rawHash))) {
        return res.status(400).json({ message: "Invalid transaction hash" });
      }
      const txHash = typeof rawHash === "string" ? rawHash : undefined;
      const updated = await storage.updateAgentProposalStatus(req.params.id, userId, "approved", txHash ?? null);
      if (!updated) return res.status(404).json({ message: "Proposal not found" });
      const signed = !!txHash;
      res.json({
        proposal: updated,
        executed: signed,
        message: signed
          ? "Recorded — you signed this in your own wallet. The agent never touched your keys or funds."
          : "Recorded your approval. Yield moves aren't wired for signing in this prototype yet; " +
            "outward payments to your saved payees are signed in your own wallet (Xaman / Freighter).",
      });
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to approve proposal" });
    }
  });

  // ── Payees (the member-controlled whitelist for outward payments) ──
  app.get("/api/agent/payees", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      res.json(await storage.getAgentPayees(req.user.claims.sub));
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to load payees" });
    }
  });

  app.post("/api/agent/payees", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const p = payeeBodySchema.parse(req.body);
      const created = await storage.createAgentPayee({
        userId,
        chain: p.chain,
        label: p.label,
        address: p.address,
        destinationTag: p.destinationTag ?? null,
        assetCode: p.assetCode,
        issuer: p.issuer ?? null,
        amount: String(p.amount),
        note: p.note ?? null,
        enabled: p.enabled ?? true,
      });
      res.json(created);
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Invalid payee", errors: e.errors });
      res.status(500).json({ message: e?.message ?? "Failed to create payee" });
    }
  });

  app.put("/api/agent/payees/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const p = payeeBodySchema.partial().parse(req.body);
      const data: Record<string, any> = { ...p };
      if (p.amount !== undefined) data.amount = String(p.amount);
      const updated = await storage.updateAgentPayee(req.params.id, userId, data);
      if (!updated) return res.status(404).json({ message: "Payee not found" });
      res.json(updated);
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Invalid payee", errors: e.errors });
      res.status(500).json({ message: e?.message ?? "Failed to update payee" });
    }
  });

  app.delete("/api/agent/payees/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ok = await storage.deleteAgentPayee(req.params.id, req.user.claims.sub);
      if (!ok) return res.status(404).json({ message: "Payee not found" });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Failed to delete payee" });
    }
  });
}
