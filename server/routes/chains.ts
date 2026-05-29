import crypto from "crypto";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "../replit_integrations/auth";
import { insertTransactionSchema, insertApiCredentialSchema, userSettings as userSettingsTable, users, insertPriceAlertSchema, insertWalletSchema, priceCache as priceCacheTable, walletBalances, wallets, xamanConnections, taxLots, featureAnnouncements, legacyPlans, autoWithdrawLogs, type CustomVault, properties, insertPropertySchema, dismissedRecommendations, transactions, aiChatMessages, scheduledPayments, offChainHoldings, insertOffChainHoldingSchema, OFF_CHAIN_ASSET_TYPES, OFF_CHAIN_STATUSES, ROADMAP_STATUSES, ROADMAP_CATEGORIES, type RoadmapStatus, type InsertRoadmapItem, insertWhisperSchema, positions } from "@shared/schema";
import OpenAI from "openai";
import { createCheckoutSession, createAddonCheckoutSession, PLANS, ADDONS, type AddonKey, getCryptoDiscountRate, applyCryptoDiscount, isHouseChain, isLegacyAddon, LEGACY_ADDON_KEYS, isLegacyAddonActive } from "../stripe";
import { handleStripeWebhookEvent } from "../stripe-webhook";
import { createOnrampSession, isValidAddressForNetwork } from "../stripe-onramp";
import { getSwapQuote as getThorSwapQuote, getInboundAddresses as getThorInboundAddresses, getSwapStatus as getThorSwapStatus } from "../thorchain";
import { sendFeedbackNotification, sendPriceAlertEmail, sendReEngagementEmail, sendInactivityReminderEmail, sendDexTradeConfirmation, sendDepositConfirmation, sendWithdrawalConfirmation, sendFeatureAnnouncementEmail, sendSecondaryContactVerification, sendBeneficiaryConfirmation, sendBeneficiaryHeartbeat, sendBeneficiaryFeedbackToOwner, sendEmail, escapeHtml } from "../email";
import { buildSovereigntyKitContent, getSovereigntyKitStyles, normalizeChainKey } from "../sovereignty-kit-html";
import { invalidateBudgetCache } from "../services/api-watchdog";
import { insertApiBudgetSchema } from "@shared/schema";
import { scanForHarvestOpportunities } from "@shared/financial-math";
import multer from "multer";
import { db } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import { XummSdk } from "xumm-sdk";
import { Client } from "xrpl";
import https from "https";
import fs from "fs";
import path from "path";
import { RLUSD, ADMIN_EMAILS } from "@shared/constants";
import { getEffectiveTier, safeServerDate, detectChainMismatch, SOIL_VAULT_ADDRESSES, SOIL_VAULT_ADDRESS, RLUSD_CURRENCY_HEX } from "./shared";

export function registerChainsRoutes(app: Express) {
  app.get("/api/admin/errors/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const stats = await storage.getErrorStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to load error stats" });
    }
  });

  app.get("/api/admin/errors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const { source, status, search, limit, offset } = req.query;
      const errors = await storage.getErrorLogs({
        source: source || undefined,
        status: status || undefined,
        search: search || undefined,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      });
      const total = await storage.getErrorLogCount({
        source: source || undefined,
        status: status || undefined,
        search: search || undefined,
      });
      res.json({ errors, total });
    } catch (error) {
      res.status(500).json({ message: "Failed to load error logs" });
    }
  });

  app.patch("/api/admin/errors/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const { status } = req.body;
      if (!["open", "resolved", "ignored"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be open, resolved, or ignored." });
      }
      const updated = await storage.updateErrorLogStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ message: "Error log not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update error status" });
    }
  });

  // ============ API Cost Watchdog ============
  async function requireAdmin(req: any, res: any): Promise<boolean> {
    const userId = req.user?.claims?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return false; }
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u?.isAdmin && !ADMIN_EMAILS.includes(u?.email?.toLowerCase() || "")) {
      res.status(403).json({ message: "Admin only" });
      return false;
    }
    return true;
  }

  app.get("/api/admin/api-watch/summary", isAuthenticated, async (req: any, res) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const periodHours = Math.max(1, Math.min(720, parseInt(req.query.periodHours as string) || 24));
      const summary = await storage.getApiUsageSummary(periodHours);
      res.json({ summary, periodHours });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to load summary" });
    }
  });

  app.get("/api/admin/api-watch/failures", isAuthenticated, async (req: any, res) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const limit = Math.max(1, Math.min(200, parseInt(req.query.limit as string) || 25));
      const failures = await storage.getRecentApiFailures(limit);
      res.json({ failures });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to load failures" });
    }
  });

  app.get("/api/admin/api-watch/top-consumers", isAuthenticated, async (req: any, res) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const periodHours = Math.max(1, Math.min(720, parseInt(req.query.periodHours as string) || 24));
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 15));
      const consumers = await storage.getTopApiConsumers(periodHours, limit);
      res.json({ consumers });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to load consumers" });
    }
  });

  app.get("/api/admin/api-watch/budgets", isAuthenticated, async (req: any, res) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const budgets = await storage.getApiBudgetsWithSpend();
      res.json({ budgets });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to load budgets" });
    }
  });

  app.post("/api/admin/api-watch/budgets", isAuthenticated, async (req: any, res) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const parsed = insertApiBudgetSchema.parse(req.body);
      if (parsed.hardLimitCents < parsed.softLimitCents) {
        return res.status(400).json({ message: "Hard limit must be >= soft limit" });
      }
      const saved = await storage.upsertApiBudget(parsed);
      invalidateBudgetCache();
      res.json(saved);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Invalid budget" });
    }
  });

  app.delete("/api/admin/api-watch/budgets/:id", isAuthenticated, async (req: any, res) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteApiBudget(id);
      invalidateBudgetCache();
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to delete" });
    }
  });

  app.post("/api/admin/api-watch/budgets/:id/reset-alerts", isAuthenticated, async (req: any, res) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.resetApiBudgetAlerts(id);
      invalidateBudgetCache();
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to reset" });
    }
  });

  app.post("/api/admin/send-bulk-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
      }).from(users);

      const validUsers = allUsers.filter(u => u.email && !u.email.endsWith("@example.com") && !u.email.endsWith("@test.com"));

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const u of validUsers) {
        try {
          await sendReEngagementEmail(u.email!, u.firstName || "there");
          sent++;
          await new Promise(r => setTimeout(r, 500));
        } catch (err: any) {
          failed++;
          errors.push(`${u.email}: ${err.message}`);
        }
      }

      res.json({ sent, failed, total: validUsers.length, errors: errors.slice(0, 10) });
    } catch (error: any) {
      console.error("Bulk email error:", error);
      res.status(500).json({ message: "Failed to send bulk emails", error: error.message });
    }
  });

  app.get("/api/admin/announcements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const announcements = await db.select().from(featureAnnouncements).orderBy(featureAnnouncements.sentAt);
      res.json(announcements.reverse());
    } catch (error: any) {
      console.error("Get announcements error:", error);
      res.status(500).json({ message: "Failed to load announcements" });
    }
  });

  app.post("/api/admin/announcements/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      const { title, description, ctaLabel, ctaUrl, audienceTier } = req.body;
      if (!title || !description) return res.status(400).json({ message: "Title and description are required" });

      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        unsubscribedFromAnnouncements: users.unsubscribedFromAnnouncements,
      }).from(users);

      let validUsers = allUsers.filter(u =>
        u.email &&
        !u.email.endsWith("@example.com") &&
        !u.email.endsWith("@test.com") &&
        !u.unsubscribedFromAnnouncements
      );

      if (audienceTier && audienceTier !== "all") {
        const settingsRows = await db.select({
          userId: userSettingsTable.userId,
          tier: userSettingsTable.tier,
        }).from(userSettingsTable);
        const tierMap = new Map(settingsRows.map(s => [s.userId, s.tier]));
        validUsers = validUsers.filter(u => {
          const userTier = tierMap.get(u.id) || "free";
          if (audienceTier === "premium") return userTier === "premium" || userTier === "pro";
          if (audienceTier === "pro") return userTier === "pro";
          return true;
        });
      }

      const [announcement] = await db.insert(featureAnnouncements).values({
        title,
        description,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        audienceTier: audienceTier || "all",
        sentBy: user?.email || userId,
        totalRecipients: validUsers.length,
        totalSent: 0,
        totalFailed: 0,
      }).returning();

      res.json({ announcement, sent: 0, failed: 0, total: validUsers.length, queued: true });

      (async () => {
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
            await new Promise(r => setTimeout(r, 300));
          } catch (err: any) {
            failed++;
            console.error(`[announcement] Failed to email ${u.email}:`, err.message);
          }
        }
        try {
          await db.update(featureAnnouncements)
            .set({ totalSent: sent, totalFailed: failed })
            .where(eq(featureAnnouncements.id, announcement.id));
          console.log(`[announcement] "${title}" — ${sent} sent, ${failed} failed out of ${validUsers.length}`);
        } catch (e: any) {
          console.error("[announcement] Failed to update send counts:", e.message);
        }
      })();
    } catch (error: any) {
      console.error("Send announcement error:", error);
      res.status(500).json({ message: "Failed to send announcement", error: error.message });
    }
  });

  app.post("/api/admin/announcements/preview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      const { title, description, ctaLabel, ctaUrl } = req.body;
      if (!title || !description) return res.status(400).json({ message: "Title and description are required" });

      await sendFeatureAnnouncementEmail(
        user.email!,
        user.firstName || "there",
        title,
        description,
        ctaLabel || null,
        ctaUrl || null,
        "https://cryptoownbank.com/unsubscribe?uid=preview",
      );

      res.json({ message: "Preview sent to your email" });
    } catch (error: any) {
      console.error("Preview announcement error:", error);
      res.status(500).json({ message: "Failed to send preview" });
    }
  });

  app.get("/api/unsubscribe", async (req, res) => {
    try {
      const uid = req.query.uid as string;
      if (!uid) return res.status(400).send("Invalid unsubscribe link");
      await db.update(users).set({ unsubscribedFromAnnouncements: true }).where(eq(users.id, uid));
      res.send(`
        <html>
          <head><title>Unsubscribed — CryptoOwnBank</title></head>
          <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px 20px;">
            <h1 style="color: #00A4E4;">CryptoOwnBank</h1>
            <h2>You've been unsubscribed</h2>
            <p style="color: #666;">You will no longer receive product announcement emails.</p>
            <p style="color: #666;">You'll still receive important transactional emails (deposits, withdrawals, security alerts).</p>
            <a href="https://cryptoownbank.com" style="color: #00A4E4;">Return to CryptoOwnBank</a>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(500).send("Something went wrong");
    }
  });

  app.get("/api/admin/announcements/audience-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const tier = (req.query.tier as string) || "all";
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        unsubscribedFromAnnouncements: users.unsubscribedFromAnnouncements,
      }).from(users);
      let validUsers = allUsers.filter(u =>
        u.email &&
        !u.email.endsWith("@example.com") &&
        !u.email.endsWith("@test.com") &&
        !u.unsubscribedFromAnnouncements
      );
      if (tier !== "all") {
        const settingsRows = await db.select({
          userId: userSettingsTable.userId,
          tier: userSettingsTable.tier,
        }).from(userSettingsTable);
        const tierMap = new Map(settingsRows.map(s => [s.userId, s.tier]));
        validUsers = validUsers.filter(u => {
          const userTier = tierMap.get(u.id) || "free";
          if (tier === "premium") return userTier === "premium" || userTier === "pro";
          if (tier === "pro") return userTier === "pro";
          return true;
        });
      }
      res.json({ count: validUsers.length });
    } catch (error) {
      console.error("Audience count error:", error);
      res.status(500).json({ message: "Failed to count audience" });
    }
  });

  const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY || "";
  const ONEINCH_AFFILIATE = "0xEc4e0f92BE6A1054FCfF951a5d28E55eB250E8a7";
  const ONEINCH_FEE = 1;
  const EVM_SUPPORTED_CHAINS = [1, 137, 42161, 10, 8453, 43114, 56];

  let lastOneinchCall = 0;
  const ONEINCH_MIN_INTERVAL = 1200;

  async function oneinchFetch(path: string, retries = 3): Promise<any> {
    if (!ONEINCH_API_KEY) throw new Error("1inch API key not configured");

    const now = Date.now();
    const elapsed = now - lastOneinchCall;
    if (elapsed < ONEINCH_MIN_INTERVAL) {
      await new Promise((r) => setTimeout(r, ONEINCH_MIN_INTERVAL - elapsed));
    }
    lastOneinchCall = Date.now();

    const resp = await fetch(`https://api.1inch.dev${path}`, {
      headers: {
        "Authorization": `Bearer ${ONEINCH_API_KEY}`,
        "Accept": "application/json",
      },
    });

    if (resp.status === 429 && retries > 0) {
      const retryAfter = parseInt(resp.headers.get("retry-after") || "0") * 1000;
      const delay = Math.max(retryAfter, 2000 * (4 - retries));
      console.log(`[1inch] Rate limited, retrying in ${delay}ms (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, delay));
      return oneinchFetch(path, retries - 1);
    }

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status}: ${text}`);
    }
    return resp.json();
  }

  app.get("/api/evm/supported-chains", (_req, res) => {
    res.json({ chains: EVM_SUPPORTED_CHAINS });
  });

  const tokenListCache: Record<number, { data: any; ts: number }> = {};
  const TOKEN_CACHE_TTL = 30 * 60 * 1000;

  app.get("/api/evm/tokens/:chainId", isAuthenticated, async (req: any, res) => {
    const chainId = parseInt(req.params.chainId);
    try {
      if (!EVM_SUPPORTED_CHAINS.includes(chainId)) {
        return res.status(400).json({ message: "Unsupported chain" });
      }
      const cached = tokenListCache[chainId];
      if (cached && Date.now() - cached.ts < TOKEN_CACHE_TTL) {
        return res.json(cached.data);
      }
      const data = await oneinchFetch(`/token/v1.2/${chainId}`);
      tokenListCache[chainId] = { data, ts: Date.now() };
      res.json(data);
    } catch (err: any) {
      console.error("[1inch] Token list error:", err.message);
      const cached = tokenListCache[chainId];
      if (cached) return res.json(cached.data);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/evm/quote", isAuthenticated, async (req: any, res) => {
    try {
      const { chainId, src, dst, amount } = req.query;
      if (!chainId || !src || !dst || !amount) {
        return res.status(400).json({ message: "Missing required params: chainId, src, dst, amount" });
      }
      const chain = parseInt(chainId as string);
      if (!EVM_SUPPORTED_CHAINS.includes(chain)) {
        return res.status(400).json({ message: "Unsupported chain" });
      }
      const params = new URLSearchParams({
        src: src as string,
        dst: dst as string,
        amount: amount as string,
        fee: ONEINCH_FEE.toString(),
      });
      const data = await oneinchFetch(`/swap/v6.0/${chain}/quote?${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[1inch] Quote error:", err.message);
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("insufficient liquidity") || msg.includes("not enough") || msg.includes("bad request")) {
        return res.status(400).json({ message: "No liquidity available for this token pair on this chain. The token may not be actively traded on supported DEXes yet." });
      }
      if (msg.includes("cannot estimate") || msg.includes("cannot swap")) {
        return res.status(400).json({ message: "Cannot estimate swap for this token. It may have transfer restrictions or no trading pairs." });
      }
      if (msg.includes("429") || msg.includes("rate limit")) {
        return res.status(429).json({ message: "Rate limited — please wait a few seconds and try again." });
      }
      res.status(400).json({ message: "Quote unavailable for this token pair. Try a different token or chain." });
    }
  });

  app.get("/api/evm/approve", isAuthenticated, async (req: any, res) => {
    try {
      const { chainId, tokenAddress, amount } = req.query;
      if (!chainId || !tokenAddress) {
        return res.status(400).json({ message: "Missing required params: chainId, tokenAddress" });
      }
      const chain = parseInt(chainId as string);
      if (!EVM_SUPPORTED_CHAINS.includes(chain)) {
        return res.status(400).json({ message: "Unsupported chain" });
      }
      const params = new URLSearchParams({ tokenAddress: tokenAddress as string });
      if (amount) params.set("amount", amount as string);
      const data = await oneinchFetch(`/swap/v6.0/${chain}/approve/transaction?${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[1inch] Approve error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/evm/allowance", isAuthenticated, async (req: any, res) => {
    try {
      const { chainId, tokenAddress, walletAddress } = req.query;
      if (!chainId || !tokenAddress || !walletAddress) {
        return res.status(400).json({ message: "Missing required params" });
      }
      const chain = parseInt(chainId as string);
      if (!EVM_SUPPORTED_CHAINS.includes(chain)) {
        return res.status(400).json({ message: "Unsupported chain" });
      }
      const params = new URLSearchParams({
        tokenAddress: tokenAddress as string,
        walletAddress: walletAddress as string,
      });
      const data = await oneinchFetch(`/swap/v6.0/${chain}/approve/allowance?${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[1inch] Allowance error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/evm/swap", isAuthenticated, async (req: any, res) => {
    try {
      const { chainId, src, dst, amount, from, slippage } = req.query;
      if (!chainId || !src || !dst || !amount || !from) {
        return res.status(400).json({ message: "Missing required params: chainId, src, dst, amount, from" });
      }
      const chain = parseInt(chainId as string);
      if (!EVM_SUPPORTED_CHAINS.includes(chain)) {
        return res.status(400).json({ message: "Unsupported chain" });
      }
      const params = new URLSearchParams({
        src: src as string,
        dst: dst as string,
        amount: amount as string,
        from: from as string,
        slippage: (slippage as string) || "1",
        referrer: ONEINCH_AFFILIATE,
        fee: ONEINCH_FEE.toString(),
      });
      const data = await oneinchFetch(`/swap/v6.0/${chain}/swap?${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[1inch] Swap error:", err.message);
      const msg = err.message || "";
      if (msg.includes("Bad Request") && msg.includes("fromTokenBalance")) {
        res.status(400).json({ message: "Insufficient balance — your wallet doesn't have enough of this token to complete the swap. Try a smaller amount." });
      } else {
        res.status(500).json({ message: msg });
      }
    }
  });

  const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

  const DEX_ROUTERS: Record<number, { router: string; weth: string; name: string }> = {
    1:     { router: "0x7a250d5C4E6cF7284C4c5fF71d7f6AeB31F8F0B3", weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", name: "Uniswap" },
    56:    { router: "0x10ED43C718714eb63d5aA57B78B54704E256024E", weth: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", name: "PancakeSwap" },
    137:   { router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", weth: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", name: "QuickSwap" },
    42161: { router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", name: "SushiSwap" },
    10:    { router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", weth: "0x4200000000000000000000000000000000000006", name: "SushiSwap" },
    8453:  { router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", weth: "0x4200000000000000000000000000000000000006", name: "Uniswap" },
    43114: { router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", weth: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", name: "TraderJoe" },
  };

  function abiEncode(types: string[], values: any[]): string {
    const parts: string[] = [];
    let dynamicOffset = types.length * 32;
    const dynamicParts: string[] = [];

    for (let i = 0; i < types.length; i++) {
      if (types[i] === "uint256") {
        parts.push(BigInt(values[i]).toString(16).padStart(64, "0"));
      } else if (types[i] === "address") {
        parts.push(values[i].slice(2).toLowerCase().padStart(64, "0"));
      } else if (types[i] === "address[]") {
        parts.push(dynamicOffset.toString(16).padStart(64, "0"));
        const arr = values[i] as string[];
        const arrEncoded = arr.length.toString(16).padStart(64, "0") +
          arr.map((a: string) => a.slice(2).toLowerCase().padStart(64, "0")).join("");
        dynamicParts.push(arrEncoded);
        dynamicOffset += (1 + arr.length) * 32;
      }
    }
    return parts.join("") + dynamicParts.join("");
  }

  app.get("/api/evm/dex-quote", isAuthenticated, async (req: any, res) => {
    try {
      const { chainId, src, dst, amount } = req.query;
      if (!chainId || !src || !dst || !amount) {
        return res.status(400).json({ message: "Missing required params: chainId, src, dst, amount" });
      }
      const chain = parseInt(chainId as string);
      const dex = DEX_ROUTERS[chain];
      const rpcUrls = CHAIN_RPC_URLS[chain];
      if (!dex || !rpcUrls) {
        return res.status(400).json({ message: "Unsupported chain for DEX swap" });
      }
      const rpcUrl = rpcUrls[0];

      const srcAddr = (src as string).toLowerCase() === NATIVE_TOKEN ? dex.weth : (src as string).toLowerCase();
      const dstAddr = (dst as string).toLowerCase() === NATIVE_TOKEN ? dex.weth : (dst as string).toLowerCase();
      const isNativeSrc = (src as string).toLowerCase() === NATIVE_TOKEN;
      const isNativeDst = (dst as string).toLowerCase() === NATIVE_TOKEN;

      const paths = [
        [srcAddr, dstAddr],
        [srcAddr, dex.weth, dstAddr],
      ];
      if (srcAddr.toLowerCase() === dex.weth.toLowerCase() || dstAddr.toLowerCase() === dex.weth.toLowerCase()) {
        paths.splice(1, 1);
      }

      let bestOutput: bigint = 0n;
      let bestPath: string[] = [];

      for (const path of paths) {
        try {
          const calldata = "0xd06ca61f" + abiEncode(["uint256", "address[]"], [amount, path]);
          const rpcResp = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", id: 1, method: "eth_call",
              params: [{ to: dex.router, data: calldata }, "latest"],
            }),
          });
          const rpcData = await rpcResp.json();
          if (rpcData.result && rpcData.result !== "0x" && rpcData.result.length > 2) {
            const hex = rpcData.result.slice(2);
            const lastAmountHex = hex.slice(-64);
            const output = BigInt("0x" + lastAmountHex);
            if (output > bestOutput) {
              bestOutput = output;
              bestPath = path;
            }
          }
        } catch {
          continue;
        }
      }

      if (bestOutput === 0n || bestPath.length === 0) {
        return res.status(400).json({ message: "No liquidity pool found for this token pair on " + dex.name });
      }

      res.json({
        dstAmount: bestOutput.toString(),
        path: bestPath,
        router: dex.router,
        dexName: dex.name,
        isNativeSrc,
        isNativeDst,
        srcAmount: amount,
      });
    } catch (err: any) {
      console.error("[dex-quote] Error:", err.message);
      res.status(500).json({ message: "DEX quote failed" });
    }
  });

  app.get("/api/evm/dex-swap", isAuthenticated, async (req: any, res) => {
    try {
      const { chainId, src, dst, amount, from, slippage, path: pathJson } = req.query;
      if (!chainId || !src || !dst || !amount || !from || !pathJson) {
        return res.status(400).json({ message: "Missing required params" });
      }
      const chain = parseInt(chainId as string);
      const dex = DEX_ROUTERS[chain];
      if (!dex) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const slip = parseFloat((slippage as string) || "1") / 100;
      if (isNaN(slip) || slip < 0 || slip > 0.5) {
        return res.status(400).json({ message: "Invalid slippage value" });
      }

      let path: string[];
      try {
        path = JSON.parse(pathJson as string);
      } catch {
        return res.status(400).json({ message: "Invalid path format" });
      }
      if (!Array.isArray(path) || path.length < 2 || path.length > 3) {
        return res.status(400).json({ message: "Path must have 2 or 3 addresses" });
      }
      const hexRe = /^0x[a-fA-F0-9]{40}$/;
      if (!path.every(a => hexRe.test(a))) {
        return res.status(400).json({ message: "Invalid address in path" });
      }

      const isNativeSrc = (src as string).toLowerCase() === NATIVE_TOKEN;
      const isNativeDst = (dst as string).toLowerCase() === NATIVE_TOKEN;
      const expectedStart = isNativeSrc ? dex.weth.toLowerCase() : (src as string).toLowerCase();
      const expectedEnd = isNativeDst ? dex.weth.toLowerCase() : (dst as string).toLowerCase();
      if (path[0].toLowerCase() !== expectedStart || path[path.length - 1].toLowerCase() !== expectedEnd) {
        return res.status(400).json({ message: "Path does not match src/dst tokens" });
      }

      let amountIn: bigint;
      try {
        amountIn = BigInt(amount as string);
      } catch {
        return res.status(400).json({ message: "Invalid amount" });
      }
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      const rpcUrl = CHAIN_RPC_URLS[chain]?.[0];
      const quoteCalldata = "0xd06ca61f" + abiEncode(["uint256", "address[]"], [amountIn.toString(), path]);
      const quoteResp = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "eth_call",
          params: [{ to: dex.router, data: quoteCalldata }, "latest"],
        }),
      });
      const quoteData = await quoteResp.json();
      if (!quoteData.result || quoteData.result === "0x") {
        return res.status(400).json({ message: "Cannot get quote for swap" });
      }
      const expectedOut = BigInt("0x" + quoteData.result.slice(2).slice(-64));
      const minOut = expectedOut * BigInt(Math.floor((1 - slip) * 10000)) / 10000n;

      let fnSelector: string;
      let encoded: string;
      let value = "0x0";

      if (isNativeSrc) {
        fnSelector = "0xb6f9de95";
        encoded = abiEncode(["uint256", "address[]", "address", "uint256"], [minOut.toString(), path, from, deadline]);
        value = "0x" + amountIn.toString(16);
      } else if (isNativeDst) {
        fnSelector = "0x791ac947";
        encoded = abiEncode(["uint256", "uint256", "address[]", "address", "uint256"], [amountIn.toString(), minOut.toString(), path, from, deadline]);
      } else {
        fnSelector = "0x5c11d795";
        encoded = abiEncode(["uint256", "uint256", "address[]", "address", "uint256"], [amountIn.toString(), minOut.toString(), path, from, deadline]);
      }

      res.json({
        tx: {
          to: dex.router,
          data: fnSelector + encoded,
          value,
          from: from as string,
        },
        dexName: dex.name,
        router: dex.router,
        expectedOutput: expectedOut.toString(),
        minOutput: minOut.toString(),
      });
    } catch (err: any) {
      console.error("[dex-swap] Error:", err.message);
      res.status(500).json({ message: "Failed to build swap transaction" });
    }
  });

  const EXPLORER_API_URLS: Record<number, { api: string; key?: string }> = {
    1: { api: "https://api.etherscan.io/api" },
    137: { api: "https://api.polygonscan.com/api" },
    42161: { api: "https://api.arbiscan.io/api" },
    10: { api: "https://api-optimistic.etherscan.io/api" },
    8453: { api: "https://api.basescan.org/api" },
    43114: { api: "https://api.snowtrace.io/api" },
    56: { api: "https://api.bscscan.com/api" },
  };

  const CHAIN_RPC_URLS: Record<number, string[]> = {
    1: ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com", "https://1rpc.io/eth"],
    137: ["https://polygon-rpc.com", "https://polygon-bor-rpc.publicnode.com"],
    42161: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"],
    10: ["https://mainnet.optimism.io", "https://optimism-rpc.publicnode.com"],
    8453: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
    43114: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain-rpc.publicnode.com"],
    56: ["https://bsc-dataseed.binance.org", "https://bsc-rpc.publicnode.com"],
  };

  async function rpcCallWithFallback(chainId: number, method: string, params: any[]): Promise<any> {
    const urls = CHAIN_RPC_URLS[chainId];
    if (!urls || urls.length === 0) throw new Error("No RPC URLs for chain " + chainId);
    let lastErr: any = null;
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await resp.json();
        if (data.error) {
          lastErr = new Error(data.error.message || "RPC error");
          continue;
        }
        return data.result;
      } catch (err: any) {
        lastErr = err;
        continue;
      }
    }
    throw lastErr || new Error("All RPCs failed for chain " + chainId);
  }

  const COINGECKO_PLATFORM_MAP: Record<string, number> = {
    "ethereum": 1,
    "polygon-pos": 137,
    "arbitrum-one": 42161,
    "optimistic-ethereum": 10,
    "base": 8453,
    "avalanche": 43114,
    "binance-smart-chain": 56,
  };

  app.get("/api/token-research/search", isAuthenticated, async (req: any, res) => {
    const query = (req.query.q as string || "").trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    try {
      const cgRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
      if (!cgRes.ok) {
        console.error("[token-search] CoinGecko search failed:", cgRes.status);
        return res.status(502).json({ message: "Search service temporarily unavailable" });
      }
      const cgData = await cgRes.json();
      const coins = (cgData.coins || []).slice(0, 15);

      if (coins.length === 0) {
        return res.json({ results: [] });
      }

      const coinIds = coins.map((c: any) => c.id);
      const marketRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds.join(",")}&per_page=15&page=1&sparkline=false`);
      const marketData: any[] = marketRes.ok ? await marketRes.json() : [];
      const marketMap = new Map(marketData.map((m: any) => [m.id, m]));

      const platformResults: { id: string; platforms: any[]; allPlatforms: any[] }[] = [];
      for (let i = 0; i < Math.min(coins.length, 15); i++) {
        const coin = coins[i];
        if (i > 0) await new Promise(r => setTimeout(r, 250));
        try {
          const r = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`);
          if (!r.ok) {
            platformResults.push({ id: coin.id, platforms: [], allPlatforms: [] });
            if (r.status === 429) {
              console.log(`[token-search] Rate limited at coin ${i}, waiting 2s`);
              await new Promise(r => setTimeout(r, 2000));
            }
            continue;
          }
          const d = await r.json();
          const evmPlats: any[] = [];
          const allPlats: any[] = [];
          const detailPlatforms = d.detail_platforms || {};
          for (const [platform, info] of Object.entries(detailPlatforms as Record<string, any>)) {
            const addr = typeof info === "object" ? info?.contract_address : info;
            const chainId = COINGECKO_PLATFORM_MAP[platform];
            if (chainId && addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
              evmPlats.push({ chainId, address: addr.toLowerCase(), platform });
            }
            if (addr && addr.length > 0) {
              allPlats.push({ platform, address: addr, chainId: chainId || null });
            }
          }
          if (evmPlats.length === 0 && d.platforms) {
            for (const [platform, addr] of Object.entries(d.platforms as Record<string, string>)) {
              const chainId = COINGECKO_PLATFORM_MAP[platform];
              if (chainId && addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
                evmPlats.push({ chainId, address: addr.toLowerCase(), platform });
              }
              if (addr && addr.length > 0 && !allPlats.some(p => p.platform === platform)) {
                allPlats.push({ platform, address: addr, chainId: chainId || null });
              }
            }
          }
          platformResults.push({ id: coin.id, platforms: evmPlats, allPlatforms: allPlats });
        } catch {
          platformResults.push({ id: coin.id, platforms: [], allPlatforms: [] });
        }
      }
      const platformMap = new Map(platformResults.map(p => [p.id, p.platforms]));
      const allPlatformMap = new Map(platformResults.map(p => [p.id, p.allPlatforms]));

      const results: any[] = [];

      for (const coin of coins) {
        const market = marketMap.get(coin.id);
        const platforms = platformMap.get(coin.id) || [];

        results.push({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol?.toUpperCase(),
          thumb: coin.thumb,
          large: coin.large,
          marketCapRank: coin.market_cap_rank || market?.market_cap_rank || null,
          currentPrice: market?.current_price || null,
          marketCap: market?.market_cap || null,
          volume24h: market?.total_volume || null,
          priceChange24h: market?.price_change_percentage_24h || null,
          platforms,
          allPlatforms: allPlatformMap.get(coin.id) || [],
        });
      }

      results.sort((a, b) => {
        const aEvm = a.platforms.length > 0 ? 1 : 0;
        const bEvm = b.platforms.length > 0 ? 1 : 0;
        if (aEvm !== bEvm) return bEvm - aEvm;
        if (a.marketCapRank && b.marketCapRank) return a.marketCapRank - b.marketCapRank;
        if (a.marketCapRank) return -1;
        if (b.marketCapRank) return 1;
        return 0;
      });

      const safetyByChainAddr: Record<string, any> = {};
      const allPlatformEntries: { id: string; chainId: number; address: string }[] = [];
      for (const token of results) {
        for (const p of token.platforms) {
          allPlatformEntries.push({ id: token.id, chainId: p.chainId, address: p.address });
        }
      }
      const entriesToCheck = allPlatformEntries.slice(0, 10);

      const chainGroups = new Map<number, { id: string; address: string }[]>();
      for (const entry of entriesToCheck) {
        if (!chainGroups.has(entry.chainId)) chainGroups.set(entry.chainId, []);
        chainGroups.get(entry.chainId)!.push({ id: entry.id, address: entry.address });
      }

      const safetyPromises: Promise<void>[] = [];
      for (const [cId, tokens] of chainGroups) {
        const addresses = tokens.map(t => t.address).join(",");
        safetyPromises.push((async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const gpRes = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${cId}?contract_addresses=${addresses}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!gpRes.ok) return;
            const gpData = await gpRes.json();
            const gpResults = gpData.result || {};
            for (const token of tokens) {
              const addrKey = Object.keys(gpResults).find(k => k.toLowerCase() === token.address.toLowerCase());
              if (!addrKey || !gpResults[addrKey]) continue;
              const gp = gpResults[addrKey];
              const isHoneypot = gp.is_honeypot === "1";
              const isMintable = gp.is_mintable === "1";
              const isOpenSource = gp.is_open_source === "1";
              const buyTax = parseFloat(gp.buy_tax || "0") * 100;
              const sellTax = parseFloat(gp.sell_tax || "0") * 100;
              const hiddenOwner = gp.hidden_owner === "1";
              const canTakeBack = gp.can_take_back_ownership === "1";
              const ownerChangeBalance = gp.owner_change_balance === "1";
              const transferPausable = gp.transfer_pausable === "1";
              const holderCount = parseInt(gp.holder_count || "0");

              let riskScore = 0;
              if (isHoneypot) riskScore += 50;
              if (isMintable) riskScore += 15;
              if (!isOpenSource) riskScore += 10;
              if (hiddenOwner) riskScore += 10;
              if (canTakeBack) riskScore += 10;
              if (ownerChangeBalance) riskScore += 15;
              if (transferPausable) riskScore += 5;
              if (buyTax > 5) riskScore += 10;
              if (sellTax > 5) riskScore += 10;
              riskScore = Math.min(riskScore, 100);

              const riskLevel = riskScore >= 50 ? "high" : riskScore >= 20 ? "medium" : "low";

              const greenFlags: string[] = [];
              const redFlags: string[] = [];
              if (!isHoneypot) greenFlags.push("Not a honeypot"); else redFlags.push("Honeypot detected");
              if (isOpenSource) greenFlags.push("Open source"); else redFlags.push("Not open source");
              if (!isMintable) greenFlags.push("Not mintable"); else redFlags.push("Mintable");
              if (!hiddenOwner) greenFlags.push("No hidden owner"); else redFlags.push("Hidden owner");
              if (!ownerChangeBalance) greenFlags.push("Owner can't change balances"); else redFlags.push("Owner can change balances");
              if (buyTax <= 5 && sellTax <= 5) greenFlags.push("Low tax"); else redFlags.push(`Tax: ${buyTax.toFixed(1)}% buy / ${sellTax.toFixed(1)}% sell`);

              const safetyKey = `${cId}:${token.address.toLowerCase()}`;
              safetyByChainAddr[safetyKey] = { riskScore, riskLevel, greenFlags, redFlags, holderCount, isHoneypot };
            }
          } catch (err: any) {
            if (err.name !== "AbortError") {
              console.error("[token-search] GoPlus safety check failed for chain", cId, err.message);
            }
          }
        })());
      }

      await Promise.all(safetyPromises);

      for (const r of results) {
        const platformSafety: Record<string, any> = {};
        for (const p of r.platforms) {
          const key = `${p.chainId}:${p.address.toLowerCase()}`;
          if (safetyByChainAddr[key]) {
            platformSafety[key] = safetyByChainAddr[key];
          }
        }
        const keys = Object.keys(platformSafety);
        if (keys.length === 1) {
          r.safety = platformSafety[keys[0]];
        } else if (keys.length > 1) {
          const best = keys.reduce((a, b) => platformSafety[a].riskScore <= platformSafety[b].riskScore ? a : b);
          r.safety = platformSafety[best];
        } else {
          r.safety = null;
        }
        r.platformSafety = platformSafety;
      }

      return res.json({ results });
    } catch (err: any) {
      console.error("[token-search] Error:", err.message);
      return res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/token-research/:chainId/:address", isAuthenticated, async (req: any, res) => {
    const chainId = parseInt(req.params.chainId);
    const address = req.params.address?.trim().toLowerCase();

    if (!EVM_SUPPORTED_CHAINS.includes(chainId)) {
      return res.status(400).json({ message: "Unsupported chain" });
    }
    if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
      return res.status(400).json({ message: "Invalid contract address" });
    }

    const result: any = { chainId, address, warnings: [], signals: [] };

    try {
      const codeResult = await rpcCallWithFallback(chainId, "eth_getCode", [address, "latest"]).catch(() => "0x");
      if (!codeResult || codeResult === "0x") {
        const chainName = chainId === 1 ? "Ethereum" : chainId === 56 ? "BNB Chain" : chainId === 137 ? "Polygon" : chainId === 42161 ? "Arbitrum" : chainId === 10 ? "Optimism" : chainId === 8453 ? "Base" : chainId === 43114 ? "Avalanche" : `chain ${chainId}`;
        return res.status(404).json({ message: `No contract found at this address on ${chainName}. This token may exist on a different chain (e.g., HyperLiquid, Solana, or another network we don't support yet). Try the "Search by Name" tab to see which chains it's available on.` });
      }
      result.isContract = true;

      const nameData = await rpcCallWithFallback(chainId, "eth_call", [{ to: address, data: "0x06fdde03" }, "latest"]).catch(() => null);
      const symbolData = await rpcCallWithFallback(chainId, "eth_call", [{ to: address, data: "0x95d89b41" }, "latest"]).catch(() => null);
      const decimalsData = await rpcCallWithFallback(chainId, "eth_call", [{ to: address, data: "0x313ce567" }, "latest"]).catch(() => null);
      const totalSupplyData = await rpcCallWithFallback(chainId, "eth_call", [{ to: address, data: "0x18160ddd" }, "latest"]).catch(() => null);

      const decodeString = (hex: string | null): string => {
        if (!hex || hex === "0x" || hex.length <= 2) return "";
        try {
          const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
          if (stripped.length >= 128) {
            const offset = parseInt(stripped.slice(0, 64), 16) * 2;
            if (offset + 64 <= stripped.length) {
              const length = parseInt(stripped.slice(offset, offset + 64), 16);
              if (length > 0 && length < 256 && offset + 64 + length * 2 <= stripped.length) {
                const strHex = stripped.slice(offset + 64, offset + 64 + length * 2);
                const decoded = Buffer.from(strHex, "hex").toString("utf8").replace(/\0/g, "").trim();
                if (decoded) return decoded;
              }
            }
          }
          const raw = Buffer.from(stripped, "hex").toString("utf8").replace(/\0/g, "").trim();
          if (raw && /^[\x20-\x7E]+$/.test(raw)) return raw;
          return "";
        } catch {
          return "";
        }
      };

      result.name = decodeString(nameData) || "Unknown";
      result.symbol = decodeString(symbolData) || "???";
      result.decimals = decimalsData ? parseInt(decimalsData, 16) : 18;
      if (totalSupplyData && totalSupplyData !== "0x") {
        const rawSupply = BigInt(totalSupplyData);
        result.totalSupply = (Number(rawSupply) / Math.pow(10, result.decimals)).toLocaleString(undefined, { maximumFractionDigits: 0 });
        result.totalSupplyRaw = rawSupply.toString();
      }
    } catch (err: any) {
      console.error("[token-research] RPC error:", err.message);
    }

    try {
      const goplusResp = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address}`);
      if (goplusResp.ok) {
        const goplusData = await goplusResp.json();
        const tokenData = goplusData?.result?.[address] || goplusData?.result?.[address.toLowerCase()];
        if (tokenData) {
          if ((!result.name || result.name === "Unknown") && tokenData.token_name) {
            result.name = tokenData.token_name;
          }
          if ((!result.symbol || result.symbol === "???") && tokenData.token_symbol) {
            result.symbol = tokenData.token_symbol;
          }
          if (tokenData.holder_count) {
            result.holderCount = parseInt(tokenData.holder_count);
          }
          if (tokenData.total_supply && !result.totalSupply) {
            result.totalSupply = parseFloat(tokenData.total_supply).toLocaleString(undefined, { maximumFractionDigits: 0 });
          }

          result.goplus = {
            isOpenSource: tokenData.is_open_source === "1",
            isProxy: tokenData.is_proxy === "1",
            isMintable: tokenData.is_mintable === "1",
            canTakeBackOwnership: tokenData.can_take_back_ownership === "1",
            ownerChangeBalance: tokenData.owner_change_balance === "1",
            hiddenOwner: tokenData.hidden_owner === "1",
            isHoneypot: tokenData.is_honeypot === "1",
            buyTax: tokenData.buy_tax ? parseFloat(tokenData.buy_tax) : 0,
            sellTax: tokenData.sell_tax ? parseFloat(tokenData.sell_tax) : 0,
            holderCount: tokenData.holder_count ? parseInt(tokenData.holder_count) : null,
            lpHolderCount: tokenData.lp_holder_count ? parseInt(tokenData.lp_holder_count) : null,
            totalSupply: tokenData.total_supply,
            ownerAddress: tokenData.owner_address || null,
            creatorAddress: tokenData.creator_address || null,
            lpTotalSupply: tokenData.lp_total_supply || null,
            isAntiWhale: tokenData.is_anti_whale === "1",
            tradingCooldown: tokenData.trading_cooldown === "1",
            isBlacklisted: tokenData.is_blacklisted === "1",
            transferPausable: tokenData.transfer_pausable === "1",
            cannotSellAll: tokenData.cannot_sell_all === "1",
            externalCall: tokenData.external_call === "1",
          };

          if (tokenData.is_honeypot === "1") {
            result.warnings.push("HONEYPOT DETECTED - You may not be able to sell this token");
          }
          if (tokenData.is_mintable === "1") {
            result.warnings.push("Token supply can be increased by the owner (mintable)");
          }
          if (tokenData.owner_change_balance === "1") {
            result.warnings.push("Owner can modify token balances");
          }
          if (tokenData.hidden_owner === "1") {
            result.warnings.push("Contract has hidden ownership functions");
          }
          if (tokenData.can_take_back_ownership === "1") {
            result.warnings.push("Previous owner can reclaim ownership");
          }
          if (tokenData.transfer_pausable === "1") {
            result.warnings.push("Token transfers can be paused by the owner");
          }
          if (tokenData.cannot_sell_all === "1") {
            result.warnings.push("You may not be able to sell your full balance");
          }
          if (tokenData.is_blacklisted === "1") {
            result.warnings.push("Contract includes a blacklist function");
          }
          if (parseFloat(tokenData.buy_tax || "0") > 0.05) {
            result.warnings.push(`High buy tax: ${(parseFloat(tokenData.buy_tax) * 100).toFixed(1)}%`);
          }
          if (parseFloat(tokenData.sell_tax || "0") > 0.05) {
            result.warnings.push(`High sell tax: ${(parseFloat(tokenData.sell_tax) * 100).toFixed(1)}%`);
          }

          if (tokenData.is_open_source === "1") result.signals.push("Contract source code is verified");
          if (tokenData.is_open_source !== "1") result.warnings.push("Contract source code is NOT verified");
          if (!tokenData.is_proxy || tokenData.is_proxy === "0") result.signals.push("Not a proxy contract");
          if (!tokenData.is_mintable || tokenData.is_mintable === "0") result.signals.push("Supply is not mintable");
          if (!tokenData.owner_change_balance || tokenData.owner_change_balance === "0") result.signals.push("Owner cannot modify balances");
          if (tokenData.holder_count && parseInt(tokenData.holder_count) > 100) {
            result.signals.push(`${parseInt(tokenData.holder_count).toLocaleString()} holders`);
          }
          if (tokenData.holder_count && parseInt(tokenData.holder_count) < 50) {
            result.warnings.push(`Very few holders (${tokenData.holder_count}) — token may be in presale or very new`);
          }

          const lpCount = tokenData.lp_holder_count ? parseInt(tokenData.lp_holder_count) : 0;
          const lpSupply = tokenData.lp_total_supply ? parseFloat(tokenData.lp_total_supply) : 0;
          if (lpCount === 0 || lpSupply === 0) {
            result.warnings.push("No DEX liquidity pools detected — token may only be available via presale or the project's official site");
            result.isPresale = true;
          } else if (lpCount < 3) {
            result.warnings.push(`Very low DEX liquidity (${lpCount} LP holder${lpCount > 1 ? "s" : ""}) — trading may have high slippage or fail`);
          }
        }
      }
    } catch (err: any) {
      console.error("[token-research] GoPlus error:", err.message);
    }

    let riskScore = 0;
    let riskMax = 0;
    if (result.goplus) {
      const g = result.goplus;
      const checks = [
        { bad: g.isHoneypot, weight: 30 },
        { bad: g.ownerChangeBalance, weight: 20 },
        { bad: g.hiddenOwner, weight: 15 },
        { bad: g.canTakeBackOwnership, weight: 15 },
        { bad: g.isMintable, weight: 10 },
        { bad: !g.isOpenSource, weight: 10 },
        { bad: g.transferPausable, weight: 10 },
        { bad: g.cannotSellAll, weight: 15 },
        { bad: g.isBlacklisted, weight: 5 },
        { bad: g.externalCall, weight: 5 },
        { bad: g.buyTax > 0.05, weight: 10 },
        { bad: g.sellTax > 0.05, weight: 10 },
        { bad: g.holderCount !== null && g.holderCount < 50, weight: 10 },
      ];
      checks.forEach(c => { riskMax += c.weight; if (c.bad) riskScore += c.weight; });
    }
    result.riskScore = riskMax > 0 ? Math.round((riskScore / riskMax) * 100) : null;
    result.riskLevel = result.riskScore === null ? "unknown" : result.riskScore >= 50 ? "high" : result.riskScore >= 20 ? "medium" : "low";

    res.json(result);
  });

  const LIFI_BASE = "https://li.quest/v1";

  async function lifiFetch(path: string, options?: { method?: string; body?: any }, retries = 2): Promise<any> {
    const lifiApiKey = process.env.LIFI_API_KEY;
    const resp = await fetch(`${LIFI_BASE}${path}`, {
      method: options?.method || "GET",
      headers: {
        "Accept": "application/json",
        ...(lifiApiKey ? { "x-lifi-api-key": lifiApiKey } : {}),
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    });
    if (!resp.ok) {
      const text = await resp.text();
      if ((resp.status === 401 || resp.status >= 500) && retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return lifiFetch(path, options, retries - 1);
      }
      throw new Error(`LI.FI API error ${resp.status}: ${text}`);
    }
    return resp.json();
  }

  app.get("/api/cross-chain/chains", async (_req, res) => {
    try {
      const data = await lifiFetch("/chains?chainTypes=EVM");
      const chains = data.chains.map((c: any) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        coin: c.coin,
        logoURI: c.logoURI,
        nativeToken: c.nativeToken,
      }));
      res.json({ chains });
    } catch (err: any) {
      console.error("[LI.FI] Chains error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/cross-chain/tokens", async (req, res) => {
    try {
      const { chains } = req.query;
      const params = chains ? `?chains=${chains}` : "";
      const data = await lifiFetch(`/tokens${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[LI.FI] Tokens error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  async function requirePremiumTier(req: any, res: any): Promise<boolean> {
    const user = req.user;
    if (!user) { res.status(401).json({ message: "Authentication required" }); return false; }
    const userId = user.claims?.sub;
    if (!userId) { res.status(401).json({ message: "Authentication required" }); return false; }
    const { tier } = await getEffectiveTier(userId);
    if (tier === "premium" || tier === "pro" || tier === "premium_annual") return true;
    res.status(403).json({ message: "Premium subscription required for cross-chain swaps" });
    return false;
  }

  app.get("/api/cross-chain/quote", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const { fromChain, toChain, fromToken, toToken, fromAmount, fromAddress, slippage } = req.query;
      if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
        return res.status(400).json({ message: "Missing required params: fromChain, toChain, fromToken, toToken, fromAmount, fromAddress" });
      }
      const params = new URLSearchParams({
        fromChain: fromChain as string,
        toChain: toChain as string,
        fromToken: fromToken as string,
        toToken: toToken as string,
        fromAmount: fromAmount as string,
        fromAddress: fromAddress as string,
        slippage: (slippage as string) || "0.03",
        integrator: "cryptoownbank",
        fee: "0.01",
      });
      const data = await lifiFetch(`/quote?${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[LI.FI] Quote error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/cross-chain/routes", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const { fromChainId, toChainId, fromTokenAddress, toTokenAddress, fromAmount, fromAddress, slippage } = req.body;
      if (!fromChainId || !toChainId || !fromTokenAddress || !toTokenAddress || !fromAmount || !fromAddress) {
        return res.status(400).json({ message: "Missing required body fields" });
      }
      const data = await lifiFetch("/advanced/routes", {
        method: "POST",
        body: {
          fromChainId: parseInt(fromChainId),
          toChainId: parseInt(toChainId),
          fromTokenAddress,
          toTokenAddress,
          fromAmount,
          fromAddress,
          options: {
            slippage: parseFloat(slippage || "0.03"),
            order: "RECOMMENDED",
            integrator: "cryptoownbank",
            fee: 0.01,
          },
        },
      });
      res.json(data);
    } catch (err: any) {
      console.error("[LI.FI] Routes error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/cross-chain/status", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const { txHash, bridge, fromChain, toChain } = req.query;
      if (!txHash) {
        return res.status(400).json({ message: "Missing txHash" });
      }
      const params = new URLSearchParams({ txHash: txHash as string });
      if (bridge) params.set("bridge", bridge as string);
      if (fromChain) params.set("fromChain", fromChain as string);
      if (toChain) params.set("toChain", toChain as string);
      const data = await lifiFetch(`/status?${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[LI.FI] Status error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/cross-chain/step-transaction", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const { routeId, stepId } = req.query;
      if (!routeId || !stepId) {
        return res.status(400).json({ message: "Missing routeId or stepId" });
      }
      const data = await lifiFetch(`/advanced/stepTransaction?route=${routeId}&step=${stepId}`);
      res.json(data);
    } catch (err: any) {
      console.error("[LI.FI] Step transaction error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  // ── XRPL Bridge (Squid Router / Axelar-powered) ──
  const SQUID_BASE = "https://apiplus.squidrouter.com/v2";
  const SQUID_INTEGRATOR_ID = process.env.SQUID_INTEGRATOR_ID || "";

  async function squidFetch(path: string, options?: { method?: string; body?: any }) {
    if (!SQUID_INTEGRATOR_ID) {
      throw new Error("Squid integrator ID not configured");
    }
    const resp = await fetch(`${SQUID_BASE}${path}`, {
      method: options?.method || "GET",
      headers: {
        "x-integrator-id": SQUID_INTEGRATOR_ID,
        "Accept": "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Squid API error ${resp.status}: ${text}`);
    }
    return resp.json();
  }

  app.get("/api/xrpl-bridge/status-check", (_req, res) => {
    res.json({ configured: !!SQUID_INTEGRATOR_ID });
  });

  app.get("/api/xrpl-bridge/chains", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const data = await squidFetch("/sdk-info");
      const chains = (data.chains || []).map((c: any) => ({
        chainId: c.chainId,
        chainName: c.chainName,
        networkName: c.networkName,
        type: c.type,
        nativeCurrency: c.nativeCurrency,
        chainIconURI: c.chainIconURI,
      }));
      res.json({ chains });
    } catch (err: any) {
      console.error("[Squid] Chains error:", err.message);
      res.status(500).json({ message: "Failed to fetch bridge chains. Please try again." });
    }
  });

  app.get("/api/xrpl-bridge/tokens", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const { chainId } = req.query;
      const data = await squidFetch("/sdk-info");
      const allTokens = data.tokens || {};
      if (chainId) {
        res.json({ tokens: allTokens[chainId] || [] });
      } else {
        res.json({ tokens: allTokens });
      }
    } catch (err: any) {
      console.error("[Squid] Tokens error:", err.message);
      res.status(500).json({ message: "Failed to fetch bridge tokens. Please try again." });
    }
  });

  app.post("/api/xrpl-bridge/route", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const { fromChain, toChain, fromToken, toToken, fromAmount, fromAddress, toAddress, slippageConfig } = req.body;
      if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress || !toAddress) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const data = await squidFetch("/route", {
        method: "POST",
        body: {
          fromChain,
          toChain,
          fromToken,
          toToken,
          fromAmount,
          fromAddress,
          toAddress,
          slippageConfig: slippageConfig || { autoMode: 1 },
        },
      });
      res.json(data);
    } catch (err: any) {
      console.error("[Squid] Route error:", err.message);
      res.status(500).json({ message: "Failed to get bridge route. Please check your inputs and try again." });
    }
  });

  app.get("/api/xrpl-bridge/tx-status", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requirePremiumTier(req, res))) return;
      const { transactionId, requestId, fromChainId, toChainId } = req.query;
      const params = new URLSearchParams();
      if (transactionId) params.set("transactionId", transactionId as string);
      if (requestId) params.set("requestId", requestId as string);
      if (fromChainId) params.set("fromChainId", fromChainId as string);
      if (toChainId) params.set("toChainId", toChainId as string);
      const data = await squidFetch(`/status?${params}`);
      res.json(data);
    } catch (err: any) {
      console.error("[Squid] Status error:", err.message);
      res.status(500).json({ message: "Failed to check bridge status. Please try again." });
    }
  });

  const GP_APP_ID = "gp_17049a01fc33eac60a9140bbe4af5236";
  const GP_CERT_DIR = path.resolve(".gnosis-pay");
  const GP_PSE_API = "https://pse-api.gnosispay.com";

  app.post("/api/gnosis-pay/ephemeral-token", isAuthenticated, async (req: any, res) => {
    try {
      const { safeAddress } = req.body;
      if (!safeAddress || typeof safeAddress !== "string") {
        return res.status(400).json({ error: "Safe wallet address is required" });
      }

      const keyPath = path.join(GP_CERT_DIR, `${GP_APP_ID}.key.pem`);
      const certPath = path.join(GP_CERT_DIR, `${GP_APP_ID}.cert.pem`);

      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        return res.status(500).json({ error: "Gnosis Pay certificates not configured" });
      }

      const key = fs.readFileSync(keyPath, "utf-8");
      const cert = fs.readFileSync(certPath, "utf-8");

      const postData = JSON.stringify({ safeAddress });

      const url = new URL(`${GP_PSE_API}/v1/ephemeral-token`);

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        key,
        cert,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "X-App-Id": GP_APP_ID,
        },
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (proxyRes.statusCode === 200) {
              res.json(parsed);
            } else {
              console.error("[gnosis-pay] Token error:", proxyRes.statusCode, data);
              res.status(proxyRes.statusCode || 500).json({ error: parsed.message || "Failed to get token" });
            }
          } catch {
            res.status(500).json({ error: "Invalid response from Gnosis Pay" });
          }
        });
      });

      proxyReq.on("error", (err) => {
        console.error("[gnosis-pay] Request error:", err.message);
        res.status(500).json({ error: "Failed to connect to Gnosis Pay" });
      });

      proxyReq.write(postData);
      proxyReq.end();
    } catch (err: any) {
      console.error("[gnosis-pay] Ephemeral token error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/gnosis-pay/config", (_req, res) => {
    res.json({ appId: GP_APP_ID });
  });

  app.get("/api/roadmap", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub ?? null;
      const items = await storage.listRoadmapItems(userId);
      let viewer: { isAuthed: boolean; canVote: boolean; reason: string | null; activeVotes: number; maxVotes: number } = {
        isAuthed: false,
        canVote: false,
        reason: "not_authed",
        activeVotes: 0,
        maxVotes: 10,
      };
      if (userId) {
        const [u] = await db.select().from(users).where(eq(users.id, userId));
        const activeVotes = await storage.getUserActiveVoteCount(userId);
        let reason: string | null = null;
        let canVote = true;
        if (!u) {
          canVote = false; reason = "not_authed";
        } else if (!u.emailVerified) {
          canVote = false; reason = "email_not_verified";
        } else {
          const ageMs = Date.now() - new Date(u.createdAt as any).getTime();
          if (ageMs < 7 * 24 * 60 * 60 * 1000) {
            canVote = false; reason = "account_too_new";
          } else if (activeVotes >= 10) {
            canVote = false; reason = "vote_cap_reached";
          }
        }
        viewer = { isAuthed: true, canVote, reason, activeVotes, maxVotes: 10 };
      }
      res.json({ items, viewer });
    } catch (error) {
      console.error("[GET /api/roadmap] error:", error);
      res.status(500).json({ message: "Failed to load roadmap" });
    }
  });

  app.post("/api/roadmap/:itemId/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ message: "Invalid item id" });

      const item = await storage.getRoadmapItem(itemId);
      if (!item) return res.status(404).json({ message: "Item not found" });
      if (item.status === "shipped" || item.status === "not_pursuing") {
        return res.status(400).json({ message: "Voting is closed on this item" });
      }

      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (!u) return res.status(401).json({ message: "Sign in to vote" });
      if (!u.emailVerified) return res.status(403).json({ message: "Verify your email before voting", reason: "email_not_verified" });
      const ageMs = Date.now() - new Date(u.createdAt as any).getTime();
      if (ageMs < 7 * 24 * 60 * 60 * 1000) {
        return res.status(403).json({ message: "Accounts must be at least 7 days old to vote", reason: "account_too_new" });
      }
      const activeVotes = await storage.getUserActiveVoteCount(userId);
      if (activeVotes >= 10) {
        return res.status(403).json({ message: "You've used all 10 active votes. Remove one to free up a slot.", reason: "vote_cap_reached" });
      }

      const commentSchema = z.object({ comment: z.string().max(500).optional().nullable() });
      const parsed = commentSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Invalid comment" });

      try {
        const vote = await storage.voteOnRoadmapItem(itemId, userId, parsed.data.comment ?? null);
        res.json({ vote });
      } catch (err: any) {
        if (err?.code === "23505") {
          return res.status(409).json({ message: "You've already voted on this item" });
        }
        throw err;
      }
    } catch (error) {
      console.error("[POST /api/roadmap/:itemId/vote] error:", error);
      res.status(500).json({ message: "Failed to record vote" });
    }
  });

  app.delete("/api/roadmap/:itemId/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ message: "Invalid item id" });
      await storage.unvoteRoadmapItem(itemId, userId);
      res.json({ ok: true });
    } catch (error) {
      console.error("[DELETE /api/roadmap/:itemId/vote] error:", error);
      res.status(500).json({ message: "Failed to remove vote" });
    }
  });

  app.patch("/api/admin/roadmap/:itemId/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (!u?.isAdmin && !ADMIN_EMAILS.includes(u?.email?.toLowerCase() || "")) {
        return res.status(403).json({ message: "Admin only" });
      }
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ message: "Invalid item id" });
      const parsed = z.object({ status: z.enum(ROADMAP_STATUSES) }).safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Invalid status" });
      const updated = await storage.updateRoadmapItemStatus(itemId, parsed.data.status as RoadmapStatus);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json({ item: updated });
    } catch (error) {
      console.error("[PATCH /api/admin/roadmap/:itemId/status] error:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.patch("/api/admin/roadmap/:itemId/meta", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (!u?.isAdmin && !ADMIN_EMAILS.includes(u?.email?.toLowerCase() || "")) {
        return res.status(403).json({ message: "Admin only" });
      }
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ message: "Invalid item id" });
      const safeUrl = z
        .string()
        .max(500)
        .refine(
          (v) => {
            if (v === "") return true;
            // Allow same-origin relative paths like "/principles" but reject
            // protocol-relative ("//evil.com") and backslash tricks.
            if (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\")) return true;
            try {
              const u = new URL(v);
              return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "mailto:";
            } catch {
              return false;
            }
          },
          { message: "URL must be https://, http://, mailto:, or a relative /path" },
        );
      const parsed = z.object({
        shippedAt: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
        learnMoreUrl: z.union([safeUrl, z.null()]).optional(),
      }).safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Invalid meta payload" });
      const patch: { shippedAt?: Date | null; learnMoreUrl?: string | null } = {};
      if (parsed.data.shippedAt !== undefined) {
        patch.shippedAt = parsed.data.shippedAt === null ? null : new Date(parsed.data.shippedAt);
      }
      if (parsed.data.learnMoreUrl !== undefined) {
        patch.learnMoreUrl = parsed.data.learnMoreUrl === null || parsed.data.learnMoreUrl === "" ? null : parsed.data.learnMoreUrl;
      }
      const updated = await storage.updateRoadmapItemMeta(itemId, patch);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json({ item: updated });
    } catch (error) {
      console.error("[PATCH /api/admin/roadmap/:itemId/meta] error:", error);
      res.status(500).json({ message: "Failed to update meta" });
    }
  });

  app.patch("/api/admin/roadmap/:itemId/response", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (!u?.isAdmin && !ADMIN_EMAILS.includes(u?.email?.toLowerCase() || "")) {
        return res.status(403).json({ message: "Admin only" });
      }
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ message: "Invalid item id" });
      const parsed = z.object({ response: z.string().min(1).max(4000) }).safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Response is required (max 4000 chars)" });
      const updated = await storage.postRoadmapTeamResponse(itemId, parsed.data.response);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json({ item: updated });
    } catch (error) {
      console.error("[PATCH /api/admin/roadmap/:itemId/response] error:", error);
      res.status(500).json({ message: "Failed to post response" });
    }
  });

}
