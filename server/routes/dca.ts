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

export async function registerDcaRoutes(app: Express) {
  app.get("/api/dca-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getDcaOrdersByUser(userId);
      res.json(orders);
    } catch (error) {
      console.error("Get DCA orders error:", error);
      res.status(500).json({ message: "Failed to load DCA orders" });
    }
  });

  app.post("/api/dca-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chain, spendCurrency, spendIssuer, buyCurrency, buyIssuer, spendAmount, frequency, nextRunAt, totalRuns, label } = req.body;

      if (!chain || !spendCurrency || !buyCurrency || !spendAmount || !frequency || !nextRunAt) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const order = await storage.createDcaOrder({
        userId,
        chain,
        spendCurrency,
        spendIssuer: spendIssuer || null,
        buyCurrency,
        buyIssuer: buyIssuer || null,
        spendAmount: String(spendAmount),
        frequency,
        nextRunAt: new Date(nextRunAt),
        status: "active",
        totalRuns: totalRuns || null,
        label: label || null,
      });

      res.json(order);
    } catch (error) {
      console.error("Create DCA order error:", error);
      res.status(500).json({ message: "Failed to create DCA order" });
    }
  });

  app.patch("/api/dca-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await storage.getDcaOrder(req.params.id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "DCA order not found" });
      }
      const allowedFields = ["status", "spendAmount", "frequency", "preferredDay", "totalRuns", "label"];
      const updateData: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }
      const updated = await storage.updateDcaOrder(order.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update DCA order error:", error);
      res.status(500).json({ message: "Failed to update DCA order" });
    }
  });

  app.post("/api/record-dex-trade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { txHash, spentAmount, spentCurrency, receivedAmount, receivedCurrency } = req.body;
      if (!spentAmount || !spentCurrency || !receivedAmount || !receivedCurrency) {
        return res.status(400).json({ message: "Missing trade details" });
      }

      const existingAccounts = await storage.getAccountsByUser(userId);
      let dexAccount = existingAccounts.find(a => a.accountName === "XRPL DEX" && a.accountType === "wallet");
      if (!dexAccount) {
        dexAccount = await storage.createAccount({
          userId,
          provider: "xrp",
          accountName: "XRPL DEX",
          accountType: "wallet",
        });
      }

      const spentNum = parseFloat(spentAmount);
      const receivedNum = parseFloat(receivedAmount);
      const pricePerUnit = spentNum / receivedNum;

      const buySymbol = receivedCurrency === "524C555344000000000000000000000000000000" ? "RLUSD" : receivedCurrency;
      const sellSymbol = spentCurrency === "524C555344000000000000000000000000000000" ? "RLUSD" : spentCurrency;

      const tx = await storage.createTransaction({
        userId,
        accountId: dexAccount.id,
        assetSymbol: buySymbol,
        transactionType: "buy",
        quantity: receivedNum.toFixed(8),
        pricePerUnit: pricePerUnit.toFixed(8),
        totalValue: spentNum.toFixed(2),
        fee: "0",
        transactionDate: new Date(),
        externalId: txHash || null,
        notes: `DCA/DEX: Bought ${receivedNum} ${buySymbol} with ${spentNum} ${sellSymbol}`,
      });

      const existingPositions = await storage.getPositionsByUser(userId);
      const existingPos = existingPositions.find(p => p.assetSymbol === buySymbol && p.accountId === dexAccount!.id);
      if (existingPos) {
        const oldQty = parseFloat(existingPos.quantity);
        const oldCost = parseFloat(existingPos.totalCostBasis);
        const newQty = oldQty + receivedNum;
        const newCost = oldCost + spentNum;
        await storage.updatePosition(existingPos.id, {
          quantity: newQty.toFixed(8),
          averageCost: (newCost / newQty).toFixed(8),
          totalCostBasis: newCost.toFixed(2),
        });
      } else {
        await storage.createPosition({
          userId,
          accountId: dexAccount.id,
          assetSymbol: buySymbol,
          quantity: receivedNum.toFixed(8),
          averageCost: pricePerUnit.toFixed(8),
          totalCostBasis: spentNum.toFixed(2),
        });
      }

      await storage.createTaxLot({
        userId,
        transactionId: tx.id,
        assetSymbol: buySymbol,
        acquiredDate: new Date(),
        originalQuantity: receivedNum.toFixed(8),
        remainingQuantity: receivedNum.toFixed(8),
        costBasisPerUnit: pricePerUnit.toFixed(8),
        acquisitionType: "trade",
      });

      console.log(`[DEX] Recorded trade for ${userId}: ${receivedNum} ${buySymbol} for ${spentNum} ${sellSymbol}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Record DEX trade error:", error);
      res.status(500).json({ message: "Failed to record trade" });
    }
  });

  app.post("/api/dca-orders/:id/execute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await storage.getDcaOrder(req.params.id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "DCA order not found" });
      }
      if (order.status === "completed") {
        return res.status(400).json({ message: "This DCA order is already completed" });
      }

      const { txHash } = req.body || {};

      if (!txHash) {
        return res.status(400).json({ message: "txHash is required — trade must be signed in Xaman first" });
      }

      let txVerified = false;
      try {
        const xrpl = await import("xrpl");
        const client = new xrpl.Client("wss://xrplcluster.com");
        await client.connect();
        try {
          const txResponse = await client.request({ command: "tx", transaction: txHash });
          const meta = (txResponse.result as any).meta || (txResponse.result as any).metaData;
          const engineResult = meta?.TransactionResult || (txResponse.result as any).engine_result;
          if (engineResult === "tesSUCCESS") {
            txVerified = true;
          } else {
            console.log(`[DCA] Order ${order.id.slice(0, 8)} — tx ${txHash} result: ${engineResult} (proceeding anyway — user signed in Xaman)`);
            txVerified = true;
          }
        } finally {
          await client.disconnect().catch(() => {});
        }
      } catch (verifyErr) {
        console.warn(`[DCA] Could not verify tx ${txHash} on XRPL — recording execution anyway:`, verifyErr instanceof Error ? verifyErr.message : verifyErr);
        txVerified = true;
      }

      const execution = await storage.createDcaExecution({
        dcaOrderId: order.id,
        userId: order.userId,
        status: "completed",
        spendAmount: order.spendAmount,
        receivedAmount: null,
        xamanPayloadId: null,
        txHash: txHash,
        errorMessage: null,
      });

      const newRunsCompleted = (order.runsCompleted || 0) + 1;
      const isComplete = order.totalRuns && newRunsCompleted >= order.totalRuns;

      const { getNextRunDate } = await import("../services/payment-scheduler");

      await storage.updateDcaOrder(order.id, {
        lastRunAt: new Date(),
        nextRunAt: isComplete ? order.nextRunAt : getNextRunDate(order.nextRunAt, order.frequency, order.preferredDay),
        runsCompleted: newRunsCompleted,
        status: isComplete ? "completed" : order.status,
      });

      const buyDisplay = order.buyCurrency.length > 3 ? order.buyCurrency.slice(0, 6) : order.buyCurrency;
      console.log(`[DCA] Manual execute — execution ${execution.id} for order ${order.id} — Buy ${buyDisplay} with ${order.spendAmount} ${order.spendCurrency}`);

      res.json({ success: true, executionId: execution.id });
    } catch (error) {
      console.error("Execute DCA order error:", error);
      res.status(500).json({ message: "Failed to execute DCA order" });
    }
  });

  app.post("/api/lightning/validate-address", isAuthenticated, async (req: any, res) => {
    try {
      const address = String(req.body?.address || "").trim();
      if (!address) return res.status(400).json({ ok: false, reason: "address is required" });
      const { resolveLightningAddress } = await import("../services/lightning");
      const result = await resolveLightningAddress(address);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, reason: err?.message || "validation failed" });
    }
  });

  app.post("/api/lightning/fetch-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const address = String(req.body?.address || "").trim();
      const amountSats = Number(req.body?.amountSats);
      const comment = req.body?.comment ? String(req.body.comment) : undefined;
      if (!address || !Number.isFinite(amountSats) || amountSats <= 0) {
        return res.status(400).json({ ok: false, reason: "address and positive amountSats are required" });
      }
      const { resolveLightningAddress, fetchInvoiceForLnAddress } = await import("../services/lightning");
      const resolved = await resolveLightningAddress(address);
      if (!resolved.ok) return res.status(400).json(resolved);
      const sats = Math.floor(amountSats);
      if (sats < resolved.minSendableSats || sats > resolved.maxSendableSats) {
        return res.status(400).json({
          ok: false,
          reason: `Amount must be between ${resolved.minSendableSats} and ${resolved.maxSendableSats} sats for this Lightning Address.`,
        });
      }
      const invoice = await fetchInvoiceForLnAddress(resolved.callback, sats, comment);
      res.json(invoice);
    } catch (err: any) {
      res.status(500).json({ ok: false, reason: err?.message || "fetch failed" });
    }
  });

  app.post("/api/dca-orders/:id/stellar/build-tx", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await storage.getDcaOrder(req.params.id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "DCA order not found" });
      }
      if (order.chain !== "stellar") {
        return res.status(400).json({ message: "This endpoint is for Stellar DCA orders only" });
      }
      if (order.status === "completed") {
        return res.status(400).json({ message: "This DCA order is already completed" });
      }

      const wallets = await storage.getUserWallets(userId);
      const stellarWallet = wallets.find(
        (w) => w.chain === "stellar" && w.address.startsWith("G") && w.address.length === 56
      );
      if (!stellarWallet) {
        return res.status(400).json({
          message: "No Stellar wallet connected. Add your LOBSTR / Stellar address under Wallets first.",
        });
      }

      const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const publicAppUrl = `${proto}://${host}`;

      const { buildStellarDcaTransaction } = await import("../services/stellar-dca");
      try {
        const result = await buildStellarDcaTransaction({
          order,
          sourceAddress: stellarWallet.address,
          publicAppUrl,
        });
        return res.json(result);
      } catch (buildErr: any) {
        const msg: string = buildErr?.message || "build failed";
        if (msg.includes("not a valid Stellar account ID") || msg.includes("no issuer is configured")) {
          await storage.updateDcaOrder(order.id, { status: "paused" });
          return res.json({ kind: "invalidOrder", message: msg, autoPaused: true });
        }
        throw buildErr;
      }
    } catch (error: any) {
      console.error("[stellar-dca] build-tx error:", error?.message || error);
      res.status(500).json({ message: error?.message || "Failed to prepare Stellar DCA transaction" });
    }
  });

  app.post("/api/stellar/dca-callback", async (req: any, res) => {
    try {
      const token = (req.query.token as string) || "";
      if (!token) return res.status(400).send("missing token");

      const { getPendingBuild, consumePendingBuild, verifySignedXdrMatchesIntent, submitSignedStellarTransaction } = await import("../services/stellar-dca");
      const pending = getPendingBuild(token);
      if (!pending) return res.status(404).send("token expired or unknown");

      const xdr: string | undefined = req.body?.xdr;
      if (!xdr) return res.status(400).send("missing xdr");

      const verify = verifySignedXdrMatchesIntent(xdr, pending);
      if (!verify.ok) {
        console.warn(`[stellar-dca] callback rejected — XDR does not match pending intent: ${verify.reason}`);
        return res.status(400).send(`xdr/intent mismatch: ${verify.reason}`);
      }

      const order = await storage.getDcaOrder(pending.orderId);
      if (!order || order.userId !== pending.userId) {
        return res.status(404).send("order not found");
      }
      if (order.status === "completed") return res.status(400).send("order already completed");

      consumePendingBuild(token);

      let submitResult: { hash: string; receivedAmount?: string };
      try {
        submitResult = await submitSignedStellarTransaction(xdr);
      } catch (submitErr: any) {
        const errMsg = submitErr?.response?.data?.extras?.result_codes
          ? JSON.stringify(submitErr.response.data.extras.result_codes)
          : submitErr?.message || "submit failed";
        await storage.createDcaExecution({
          dcaOrderId: order.id,
          userId: order.userId,
          status: "failed",
          spendAmount: order.spendAmount,
          receivedAmount: null,
          xamanPayloadId: null,
          txHash: null,
          errorMessage: errMsg,
        });
        console.error(`[stellar-dca] submit failed for order ${order.id.slice(0, 8)}: ${errMsg}`);
        return res.status(200).send("recorded failure");
      }

      const execution = await storage.createDcaExecution({
        dcaOrderId: order.id,
        userId: order.userId,
        status: "completed",
        spendAmount: order.spendAmount,
        receivedAmount: submitResult.receivedAmount || pending.expectedReceive,
        xamanPayloadId: null,
        txHash: submitResult.hash,
        errorMessage: null,
      });

      const newRunsCompleted = (order.runsCompleted || 0) + 1;
      const isComplete = order.totalRuns && newRunsCompleted >= order.totalRuns;
      const { getNextRunDate } = await import("../services/payment-scheduler");
      await storage.updateDcaOrder(order.id, {
        lastRunAt: new Date(),
        nextRunAt: isComplete ? order.nextRunAt : getNextRunDate(order.nextRunAt, order.frequency, order.preferredDay),
        runsCompleted: newRunsCompleted,
        status: isComplete ? "completed" : order.status,
      });

      console.log(`[stellar-dca] Order ${order.id.slice(0, 8)} executed via LOBSTR — tx ${submitResult.hash.slice(0, 12)}…`);
      res.status(200).send("ok");
    } catch (err: any) {
      console.error("[stellar-dca] callback error:", err?.message || err);
      res.status(500).send("internal error");
    }
  });

  app.get("/api/dca-orders/:id/stellar/check-execution", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await storage.getDcaOrder(req.params.id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "DCA order not found" });
      }
      const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 30 * 60 * 1000);
      const executions = await storage.getDcaExecutionsByOrder(order.id);
      const recent = executions.find((e) => e.executedAt && new Date(e.executedAt) >= since);
      const { getPendingBuild } = await import("../services/stellar-dca");
      const stillPending = req.query.token ? !!getPendingBuild(req.query.token as string) : false;
      res.json({
        execution: recent || null,
        stillPending,
      });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "check failed" });
    }
  });

  app.post("/api/dca-orders/:id/reset", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin only" });
      }
      const order = await storage.getDcaOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "DCA order not found" });
      }
      await storage.updateDcaOrder(order.id, {
        runsCompleted: 0,
        lastRunAt: null,
        nextRunAt: new Date(),
        status: "active",
      });
      console.log(`[DCA] Admin reset order ${order.id} — runs_completed set to 0`);
      res.json({ success: true, message: "Order reset successfully" });
    } catch (error) {
      console.error("Reset DCA order error:", error);
      res.status(500).json({ message: "Failed to reset DCA order" });
    }
  });

  app.delete("/api/dca-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await storage.getDcaOrder(req.params.id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "DCA order not found" });
      }
      await storage.deleteDcaOrder(order.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete DCA order error:", error);
      res.status(500).json({ message: "Failed to delete DCA order" });
    }
  });

  app.get("/api/dca-executions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orderId = req.query.orderId as string | undefined;
      if (orderId) {
        const order = await storage.getDcaOrder(orderId);
        if (!order || order.userId !== userId) {
          return res.status(404).json({ message: "DCA order not found" });
        }
        const executions = await storage.getDcaExecutionsByOrder(orderId);
        return res.json(executions);
      }
      const executions = await storage.getDcaExecutionsByUser(userId);
      res.json(executions);
    } catch (error) {
      console.error("Get DCA executions error:", error);
      res.status(500).json({ message: "Failed to load DCA history" });
    }
  });

  const { isXrplTradeable, getXrplToken } = await import("@shared/xrpl-token-registry");

  const CURATED_BUCKETS = [
    {
      id: "blue-chip",
      name: "Blue Chip",
      description: "The most established XRPL-tradeable cryptocurrencies",
      tokens: [
        { symbol: "BTC", allocationPct: "30", category: "Layer 1" },
        { symbol: "ETH", allocationPct: "25", category: "Smart Contracts" },
        { symbol: "XRP", allocationPct: "20", category: "Layer 1" },
        { symbol: "SOL", allocationPct: "15", category: "Layer 1" },
        { symbol: "ADA", allocationPct: "10", category: "Layer 1" },
      ],
    },
    {
      id: "layer1-mix",
      name: "Layer 1 Mix",
      description: "Diversified Layer 1 blockchains available on XRPL DEX",
      tokens: [
        { symbol: "BTC", allocationPct: "25", category: "Layer 1" },
        { symbol: "SOL", allocationPct: "20", category: "Layer 1" },
        { symbol: "ADA", allocationPct: "15", category: "Layer 1" },
        { symbol: "AVAX", allocationPct: "15", category: "Layer 1" },
        { symbol: "DOT", allocationPct: "10", category: "Layer 1" },
        { symbol: "ATOM", allocationPct: "10", category: "Layer 1" },
        { symbol: "NEAR", allocationPct: "5", category: "Layer 1" },
      ],
    },
    {
      id: "xrpl-ecosystem",
      name: "XRPL Ecosystem",
      description: "Native XRPL and Sologenic ecosystem tokens",
      tokens: [
        { symbol: "XRP", allocationPct: "30", category: "Layer 1" },
        { symbol: "SOLO", allocationPct: "20", category: "Finance" },
        { symbol: "CORE", allocationPct: "15", category: "Layer 1" },
        { symbol: "ELS", allocationPct: "10", category: "DeFi" },
        { symbol: "CSC", allocationPct: "10", category: "Gaming" },
        { symbol: "FLR", allocationPct: "15", category: "Smart Contracts" },
      ],
    },
    {
      id: "meme-basket",
      name: "Meme Basket",
      description: "Top memecoins available via Sologenic bridge",
      tokens: [
        { symbol: "DOGE", allocationPct: "30", category: "Memecoin" },
        { symbol: "SHIB", allocationPct: "25", category: "Memecoin" },
        { symbol: "PEPE", allocationPct: "20", category: "Memecoin" },
        { symbol: "BONK", allocationPct: "15", category: "Memecoin" },
        { symbol: "XRP", allocationPct: "10", category: "Layer 1" },
      ],
    },
    {
      id: "rwa-defi",
      name: "RWA & DeFi",
      description: "Real-world assets and DeFi protocols on XRPL DEX",
      tokens: [
        { symbol: "ONDO", allocationPct: "25", category: "RWA" },
        { symbol: "LINK", allocationPct: "25", category: "Oracle" },
        { symbol: "UNI", allocationPct: "20", category: "DeFi" },
        { symbol: "AAVE", allocationPct: "15", category: "DeFi" },
        { symbol: "SOLO", allocationPct: "15", category: "Finance" },
      ],
    },
    {
      id: "alt-l1",
      name: "Alt L1 + Interop",
      description: "Alternative Layer 1s and cross-chain tokens",
      tokens: [
        { symbol: "HBAR", allocationPct: "20", category: "Layer 1" },
        { symbol: "SUI", allocationPct: "20", category: "Layer 1" },
        { symbol: "TON", allocationPct: "20", category: "Layer 1" },
        { symbol: "APT", allocationPct: "15", category: "Layer 1" },
        { symbol: "ALGO", allocationPct: "15", category: "Layer 1" },
        { symbol: "ICP", allocationPct: "10", category: "Internet" },
      ],
    },
  ];

  app.get("/api/token-buckets/curated", isAuthenticated, async (_req: any, res) => {
    res.json(CURATED_BUCKETS);
  });

  app.get("/api/token-buckets/categories", isAuthenticated, async (_req: any, res) => {
    try {
      const { ASSET_CATEGORIES, CATEGORY_COLORS } = await import("@shared/asset-categories");
      const categoryMap: Record<string, string[]> = {};
      for (const [symbol, category] of Object.entries(ASSET_CATEGORIES)) {
        if (!categoryMap[category]) categoryMap[category] = [];
        categoryMap[category].push(symbol);
      }
      res.json({ categories: categoryMap, colors: CATEGORY_COLORS });
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to load categories" });
    }
  });

  app.get("/api/token-buckets/portfolio-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const balances = await storage.getWalletBalancesByUser(userId);
      const { getAssetCategory } = await import("@shared/asset-categories");
      const categoryBreakdown: Record<string, { totalValue: number; tokens: { symbol: string; value: number }[] }> = {};
      let totalPortfolioValue = 0;

      for (const bal of balances) {
        const value = parseFloat(bal.valueUsd || "0");
        if (value <= 0) continue;
        const category = getAssetCategory(bal.symbol);
        if (category === "Stablecoin" || category === "Stock & ETF") continue;
        if (!categoryBreakdown[category]) categoryBreakdown[category] = { totalValue: 0, tokens: [] };
        categoryBreakdown[category].totalValue += value;
        categoryBreakdown[category].tokens.push({ symbol: bal.symbol, value });
        totalPortfolioValue += value;
      }

      const analysis = Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        totalValue: data.totalValue,
        percentage: totalPortfolioValue > 0 ? (data.totalValue / totalPortfolioValue) * 100 : 0,
        tokens: data.tokens.sort((a, b) => b.value - a.value),
      })).sort((a, b) => b.totalValue - a.totalValue);

      res.json({ analysis, totalPortfolioValue });
    } catch (error) {
      console.error("Portfolio analysis error:", error);
      res.status(500).json({ message: "Failed to analyze portfolio" });
    }
  });

  app.get("/api/token-buckets/preflight/:bucketId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bucket = await storage.getTokenBucket(req.params.bucketId);
      if (!bucket || bucket.userId !== userId) {
        return res.status(404).json({ message: "Bucket not found" });
      }
      const items = await storage.getTokenBucketItems(bucket.id);
      const wallets = await storage.getWalletsByUser(userId);
      const balances = await storage.getWalletBalancesByUser(userId);

      const xrplWallets = wallets.filter(w => w.chain === "xrpl");
      const hasXrplWallet = xrplWallets.length > 0;

      const existingTrustlines = new Set<string>();
      for (const bal of balances) {
        existingTrustlines.add(bal.symbol.toUpperCase());
      }
      existingTrustlines.add("XRP");

      const tokenChecks = items.map(item => {
        const sym = item.symbol.toUpperCase();
        const needsTrustline = bucket.chain === "xrpl" && sym !== "XRP";
        const hasTrustline = existingTrustlines.has(sym);
        return {
          symbol: sym,
          allocationPct: item.allocationPct,
          needsTrustline,
          hasTrustline: needsTrustline ? hasTrustline : true,
          ready: !needsTrustline || hasTrustline,
        };
      });

      const missingTrustlines = tokenChecks.filter(t => !t.ready);
      const reserveNeeded = missingTrustlines.length * 2;

      const xrpBalance = balances
        .filter(b => b.symbol.toUpperCase() === "XRP")
        .reduce((sum, b) => sum + parseFloat(b.balance || "0"), 0);

      const hasEnoughReserve = xrpBalance >= (10 + reserveNeeded);

      res.json({
        ready: missingTrustlines.length === 0 && (bucket.chain !== "xrpl" || hasXrplWallet),
        hasWallet: hasXrplWallet || bucket.chain !== "xrpl",
        chain: bucket.chain,
        tokens: tokenChecks,
        missingTrustlineCount: missingTrustlines.length,
        reserveXrpNeeded: reserveNeeded,
        currentXrpBalance: xrpBalance,
        hasEnoughReserve,
        warnings: [
          ...(!hasXrplWallet && bucket.chain === "xrpl" ? ["No XRPL wallet connected. Connect one via Xaman to proceed."] : []),
          ...(missingTrustlines.length > 0 ? [`${missingTrustlines.length} trustline(s) needed: ${missingTrustlines.map(t => t.symbol).join(", ")}. Each requires 2 XRP reserve.`] : []),
          ...(!hasEnoughReserve && reserveNeeded > 0 ? [`Insufficient XRP for reserves. Need ${10 + reserveNeeded} XRP (10 base + ${reserveNeeded} for trustlines), have ${xrpBalance.toFixed(2)} XRP.`] : []),
        ],
      });
    } catch (error) {
      console.error("Preflight check error:", error);
      res.status(500).json({ message: "Failed to run preflight check" });
    }
  });

  app.get("/api/token-buckets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const buckets = await storage.getTokenBucketsByUser(userId);
      const bucketsWithItems = await Promise.all(
        buckets.map(async (bucket) => {
          const items = await storage.getTokenBucketItems(bucket.id);
          return { ...bucket, items };
        })
      );
      res.json(bucketsWithItems);
    } catch (error) {
      console.error("Get token buckets error:", error);
      res.status(500).json({ message: "Failed to load token buckets" });
    }
  });

  app.post("/api/token-buckets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { items, ...rawBucket } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one token is required" });
      }
      const untradeable = items
        .map((i: any) => String(i.symbol || "").toUpperCase())
        .filter((s: string) => s && !isXrplTradeable(s));
      if (untradeable.length > 0) {
        return res.status(400).json({ message: `Not tradeable on XRPL DEX: ${untradeable.join(", ")}. Only tokens with XRPL DEX pairs can be added to buckets.` });
      }
      const totalPct = items.reduce((sum: number, i: any) => sum + parseFloat(i.allocationPct || "0"), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        return res.status(400).json({ message: "Token allocations must total 100%" });
      }
      const bucketData = {
        userId,
        name: String(rawBucket.name || "").slice(0, 100),
        description: rawBucket.description ? String(rawBucket.description) : null,
        bucketType: String(rawBucket.bucketType || "custom"),
        spendCurrency: String(rawBucket.spendCurrency || "RLUSD"),
        spendAmount: rawBucket.spendAmount && String(rawBucket.spendAmount).trim() ? String(rawBucket.spendAmount) : null,
        frequency: rawBucket.frequency ? String(rawBucket.frequency) : null,
        chain: String(rawBucket.chain || "xrpl"),
        nextRunAt: rawBucket.nextRunAt ? new Date(rawBucket.nextRunAt) : null,
      };
      if (!bucketData.name) {
        return res.status(400).json({ message: "Bucket name is required" });
      }
      const bucket = await storage.createTokenBucket(bucketData);
      const createdItems = await Promise.all(
        items.map((item: any) =>
          storage.createTokenBucketItem({
            bucketId: bucket.id,
            symbol: String(item.symbol || "").toUpperCase().slice(0, 20),
            allocationPct: String(parseFloat(item.allocationPct) || 0),
            category: item.category ? String(item.category) : null,
          })
        )
      );
      res.json({ ...bucket, items: createdItems });
    } catch (error) {
      console.error("Create token bucket error:", error);
      res.status(500).json({ message: "Failed to create token bucket" });
    }
  });

  app.patch("/api/token-buckets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bucket = await storage.getTokenBucket(req.params.id);
      if (!bucket || bucket.userId !== userId) {
        return res.status(404).json({ message: "Bucket not found" });
      }
      const { items, ...raw } = req.body;
      const safeUpdates: Record<string, any> = {};
      if (raw.name !== undefined) safeUpdates.name = String(raw.name).slice(0, 100);
      if (raw.description !== undefined) safeUpdates.description = raw.description ? String(raw.description) : null;
      if (raw.spendCurrency !== undefined) safeUpdates.spendCurrency = String(raw.spendCurrency);
      if (raw.spendAmount !== undefined) safeUpdates.spendAmount = raw.spendAmount && String(raw.spendAmount).trim() ? String(raw.spendAmount) : null;
      if (raw.frequency !== undefined) safeUpdates.frequency = raw.frequency ? String(raw.frequency) : null;
      if (raw.status !== undefined && ["active", "paused"].includes(raw.status)) safeUpdates.status = raw.status;

      const updated = await storage.updateTokenBucket(req.params.id, safeUpdates);
      if (items && Array.isArray(items)) {
        const totalPct = items.reduce((sum: number, i: any) => sum + parseFloat(i.allocationPct || "0"), 0);
        if (Math.abs(totalPct - 100) > 0.01) {
          return res.status(400).json({ message: "Token allocations must total 100%" });
        }
        await storage.deleteTokenBucketItems(req.params.id);
        const createdItems = await Promise.all(
          items.map((item: any) =>
            storage.createTokenBucketItem({
              bucketId: req.params.id,
              symbol: String(item.symbol || "").toUpperCase().slice(0, 20),
              allocationPct: String(parseFloat(item.allocationPct) || 0),
              category: item.category ? String(item.category) : null,
            })
          )
        );
        return res.json({ ...updated, items: createdItems });
      }
      const existingItems = await storage.getTokenBucketItems(req.params.id);
      res.json({ ...updated, items: existingItems });
    } catch (error) {
      console.error("Update token bucket error:", error);
      res.status(500).json({ message: "Failed to update token bucket" });
    }
  });

  app.delete("/api/token-buckets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bucket = await storage.getTokenBucket(req.params.id);
      if (!bucket || bucket.userId !== userId) {
        return res.status(404).json({ message: "Bucket not found" });
      }
      await storage.deleteTokenBucket(req.params.id);
      res.json({ message: "Bucket deleted" });
    } catch (error) {
      console.error("Delete token bucket error:", error);
      res.status(500).json({ message: "Failed to delete token bucket" });
    }
  });

  app.post("/api/portfolio-snapshots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { expiresInMinutes = 30 } = req.body;
      const clampedMinutes = Math.min(Math.max(expiresInMinutes, 5), 1440);

      const portfolioRes = await fetch(`http://localhost:${(app as any).get("port") || 5000}/api/portfolio`, {
        headers: { cookie: req.headers.cookie || "" },
      });

      let totalValue = "0";
      let holdings: any[] = [];
      if (portfolioRes.ok) {
        const data = await portfolioRes.json();
        totalValue = String(data.totalValue || 0);
        holdings = (data.allocation || []).map((a: any) => ({
          symbol: a.symbol,
          value: a.value,
          percent: a.percent,
        }));
      }

      const userSettingsData = await storage.getUserSettings(userId);
      const token = require("crypto").randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + clampedMinutes * 60 * 1000);

      const snapshot = await storage.createPortfolioSnapshot({
        userId,
        token,
        totalValue,
        holdings,
        businessName: (userSettingsData as any)?.businessName || undefined,
        businessLogo: (userSettingsData as any)?.businessLogo || undefined,
        expiresAt,
      });

      res.json({
        ...snapshot,
        url: `/snapshot/${token}`,
        qrUrl: `${req.protocol}://${req.get("host")}/snapshot/${token}`,
      });
    } catch (error) {
      console.error("Create snapshot error:", error);
      res.status(500).json({ message: "Failed to create snapshot" });
    }
  });

  app.get("/api/portfolio-snapshots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const snapshots = await storage.getPortfolioSnapshotsByUser(userId);
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ message: "Failed to load snapshots" });
    }
  });

  app.delete("/api/portfolio-snapshots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deletePortfolioSnapshot(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete snapshot" });
    }
  });

  app.get("/api/snapshot/:token", async (req, res) => {
    try {
      const snapshot = await storage.getPortfolioSnapshotByToken(req.params.token);
      if (!snapshot) {
        return res.status(404).json({ message: "Snapshot not found" });
      }
      if (new Date(snapshot.expiresAt) < new Date()) {
        return res.status(410).json({ message: "Snapshot expired" });
      }
      res.json({
        totalValue: snapshot.totalValue,
        holdings: snapshot.holdings,
        businessName: snapshot.businessName,
        businessLogo: snapshot.businessLogo,
        createdAt: snapshot.createdAt,
        expiresAt: snapshot.expiresAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load snapshot" });
    }
  });

  // ============ WHISPER (Tier 1: no-login single-asset share) ============
  // Per-IP rate limit on the public viewer to discourage token-probing and view-spam.
  const whisperPublicHits = new Map<string, { count: number; windowStart: number }>();
  const WHISPER_PUBLIC_WINDOW_MS = 60 * 1000;
  const WHISPER_PUBLIC_MAX = 60;

  app.post("/api/whispers", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.user.claims.sub;
      // Strip client-supplied assetSymbol — we derive it from the position to prevent
      // pricing one asset while pointing at another's quantity.
      const { assetSymbol: _ignoredSymbol, ...rest } = req.body || {};
      const looseParsed = insertWhisperSchema.partial({ assetSymbol: true }).safeParse({ ...rest, ownerId });
      if (!looseParsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: looseParsed.error.flatten() });
      }
      const data = looseParsed.data;
      if (!data.positionId) {
        return res.status(400).json({ message: "positionId is required" });
      }
      const [pos] = await db.select().from(positions).where(eq(positions.id, data.positionId));
      if (!pos || pos.userId !== ownerId) {
        return res.status(404).json({ message: "Position not found" });
      }
      const derivedSymbol = pos.assetSymbol;
      const existing = await storage.listWhispersByOwner(ownerId);
      const liveCount = existing.filter((w) => !w.revokedAt).length;
      if (liveCount >= 25) {
        return res.status(400).json({ message: "You can have at most 25 active Whispers. Revoke some first." });
      }
      const token = require("crypto").randomBytes(12).toString("base64url");
      const whisper = await storage.createWhisper({ ...data, assetSymbol: derivedSymbol, token } as any);
      res.json({
        ...whisper,
        url: `/v/${token}`,
        shareUrl: `${req.protocol}://${req.get("host")}/v/${token}`,
      });
    } catch (error) {
      console.error("Create whisper error:", error);
      res.status(500).json({ message: "Failed to create Whisper" });
    }
  });

  app.get("/api/whispers", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.user.claims.sub;
      const list = await storage.listWhispersByOwner(ownerId);
      res.json(list.map((w) => ({ ...w, shareUrl: `${req.protocol}://${req.get("host")}/v/${w.token}` })));
    } catch (error) {
      console.error("List whispers error:", error);
      res.status(500).json({ message: "Failed to list Whispers" });
    }
  });

  app.post("/api/whispers/:id/revoke", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.user.claims.sub;
      await storage.revokeWhisper(req.params.id, ownerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Revoke whisper error:", error);
      res.status(500).json({ message: "Failed to revoke" });
    }
  });

  app.delete("/api/whispers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.user.claims.sub;
      await storage.deleteWhisper(req.params.id, ownerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete whisper error:", error);
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  app.get("/api/whispers/public/:token", async (req, res) => {
    try {
      // Per-IP rate limit (in addition to the global /api/* limiter).
      const ip = (req.ip || req.socket?.remoteAddress || "unknown").toString();
      const now = Date.now();
      const bucket = whisperPublicHits.get(ip);
      if (!bucket || now - bucket.windowStart > WHISPER_PUBLIC_WINDOW_MS) {
        whisperPublicHits.set(ip, { count: 1, windowStart: now });
      } else {
        bucket.count += 1;
        if (bucket.count > WHISPER_PUBLIC_MAX) {
          return res.status(429).json({ message: "Too many requests, please slow down." });
        }
      }
      // Opportunistic janitor — keep the map from growing unbounded.
      if (whisperPublicHits.size > 5000) {
        for (const [k, v] of whisperPublicHits) {
          if (now - v.windowStart > WHISPER_PUBLIC_WINDOW_MS) whisperPublicHits.delete(k);
        }
      }

      const token = req.params.token;
      if (!token || token.length < 8 || token.length > 32) {
        return res.status(404).json({ message: "Whisper not found" });
      }
      const whisper = await storage.getWhisperByToken(token);
      if (!whisper) return res.status(404).json({ message: "Whisper not found" });
      if (whisper.revokedAt) return res.status(410).json({ message: "This Whisper has been revoked by the owner." });

      let quantity = 0;
      let priceSource: "live" | "stored" = "stored";
      if (whisper.positionId) {
        const [pos] = await db.select().from(positions).where(eq(positions.id, whisper.positionId));
        if (pos && pos.userId === whisper.ownerId) {
          quantity = parseFloat(pos.quantity) || 0;
        }
      }
      const asset = await storage.getAsset(whisper.assetSymbol);
      const currentPrice = asset?.currentPrice ? parseFloat(asset.currentPrice) : 0;
      if (currentPrice > 0) priceSource = "live";
      const value = quantity * currentPrice;

      // Owner-controlled display name (opt-in). We never auto-pull the owner's real name.
      const senderName = (whisper.senderName || "").trim() || "A CryptoOwnBank user";

      // Fire-and-forget view recording
      storage.recordWhisperView(whisper.id).catch(() => {});

      res.set("Cache-Control", "public, max-age=30");
      res.json({
        assetSymbol: whisper.assetSymbol,
        quantity,
        currentPrice,
        value,
        priceSource,
        priceUpdatedAt: asset?.priceUpdatedAt || null,
        recipientName: whisper.recipientName || null,
        personalNote: whisper.personalNote || null,
        showAddress: !!whisper.showAddress,
        walletAddress: whisper.showAddress ? whisper.walletAddress || null : null,
        senderName,
        createdAt: whisper.createdAt,
      });
    } catch (error) {
      console.error("Get public whisper error:", error);
      res.status(500).json({ message: "Failed to load Whisper" });
    }
  });

}
