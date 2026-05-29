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

export function registerAdminSubscriptionsRoutes(app: Express) {
  app.get("/api/crypto-payment/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payments = await storage.getCryptoPaymentsByUser(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to load payment history" });
    }
  });

  app.get("/api/admin/payment-addresses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const addresses = await storage.getCryptoPaymentAddresses(false);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ message: "Failed to load payment addresses" });
    }
  });

  app.post("/api/admin/bulk-delete-lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const { lotIds } = req.body;
      if (!Array.isArray(lotIds) || lotIds.length === 0) {
        return res.status(400).json({ message: "lotIds array required" });
      }
      let deleted = 0;
      for (const lotId of lotIds) {
        try {
          await storage.deleteTaxLot(lotId);
          deleted++;
        } catch {}
      }
      res.json({ message: `Deleted ${deleted} of ${lotIds.length} lots` });
    } catch (error) {
      console.error("Bulk delete lots error:", error);
      res.status(500).json({ message: "Failed to bulk delete lots" });
    }
  });

  app.post("/api/admin/remove-duplicate-lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      const allLots = await storage.getTaxLotsByUser(userId);

      const groups: Record<string, typeof allLots> = {};
      for (const lot of allLots) {
        const qty = parseFloat(lot.originalQuantity).toFixed(4);
        const dateStr = new Date(lot.acquiredDate).toISOString().split("T")[0];
        const price = parseFloat(lot.costBasisPerUnit).toFixed(6);
        const key = `${lot.assetSymbol}|${qty}|${dateStr}|${price}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(lot);
      }

      let removedCount = 0;
      const removedDetails: { symbol: string; date: string; qty: string }[] = [];

      for (const [key, lots] of Object.entries(groups)) {
        if (lots.length > 1) {
          const toRemove = lots.slice(1);
          for (const lot of toRemove) {
            try {
              await storage.deleteTaxLot(lot.id);
              removedCount++;
              const [sym, qty, date] = key.split("|");
              removedDetails.push({ symbol: sym, date, qty });
            } catch (e) {
              console.error(`Failed to delete duplicate lot ${lot.id}:`, e);
            }
          }
        }
      }

      console.log(`[dedup] Removed ${removedCount} duplicate lots for user ${userId}`);
      res.json({ removed: removedCount, details: removedDetails });
    } catch (error) {
      console.error("Remove duplicate lots error:", error);
      res.status(500).json({ message: "Failed to remove duplicates" });
    }
  });

  app.post("/api/admin/cleanup-lot", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const { lotId, positionId } = req.body;
      const deleted: string[] = [];
      if (lotId) {
        await db.delete(taxLots).where(and(eq(taxLots.id, lotId), eq(taxLots.userId, userId)));
        deleted.push(`lot:${lotId}`);
      }
      if (positionId) {
        await db.execute(sql`DELETE FROM positions WHERE id = ${positionId} AND user_id = ${userId}`);
        deleted.push(`position:${positionId}`);
      }
      console.log(`[admin-cleanup] Deleted: ${deleted.join(", ")}`);
      res.json({ deleted });
    } catch (error) {
      console.error("Admin cleanup error:", error);
      res.status(500).json({ message: "Failed to cleanup" });
    }
  });

  app.post("/api/admin/recalc-positions-from-lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      const allLots = await storage.getTaxLotsByUser(userId);
      const positionsData = await storage.getPositionsByUser(userId);

      // Clean up known bad lots (WLFI 141M manual entry error)
      const badLots = allLots.filter(l => 
        l.assetSymbol === 'WLFI' && parseFloat(l.originalQuantity) > 100000000
      );
      for (const bad of badLots) {
        await db.delete(taxLots).where(eq(taxLots.id, bad.id));
        console.log(`[admin-cleanup] Deleted bad lot: ${bad.assetSymbol} qty=${bad.originalQuantity}`);
      }
      const badPositions = positionsData.filter(p =>
        p.assetSymbol === 'WLFI' && parseFloat(p.quantity) > 100000000
      );
      for (const bad of badPositions) {
        await db.execute(sql`DELETE FROM positions WHERE id = ${bad.id}`);
        console.log(`[admin-cleanup] Deleted bad position: ${bad.assetSymbol} qty=${bad.quantity}`);
      }

      const cleanLots = allLots.filter(l => !(l.assetSymbol === 'WLFI' && parseFloat(l.originalQuantity) > 100000000));

      const lotTotals: Record<string, { qty: number; costBasis: number; count: number }> = {};
      for (const lot of cleanLots) {
        const sym = lot.assetSymbol;
        if (!lotTotals[sym]) lotTotals[sym] = { qty: 0, costBasis: 0, count: 0 };
        const qty = parseFloat(lot.remainingQuantity);
        const price = parseFloat(lot.costBasisPerUnit);
        lotTotals[sym].qty += qty;
        lotTotals[sym].costBasis += qty * price;
        lotTotals[sym].count++;
      }

      let updated = 0;
      let created = 0;
      const changes: { symbol: string; action: string; oldQty?: string; newQty: string; lotCount: number }[] = [];

      const existingSymbols = new Set(positionsData.map(p => p.assetSymbol));

      for (const pos of positionsData) {
        const lotData = lotTotals[pos.assetSymbol];
        if (lotData) {
          const newQty = lotData.qty.toFixed(8);
          const newCostBasis = lotData.costBasis.toFixed(2);
          const newAvgCost = lotData.qty > 0 ? (lotData.costBasis / lotData.qty).toFixed(8) : "0";
          const oldQty = parseFloat(pos.quantity).toFixed(8);
          if (oldQty !== newQty) {
            await storage.updatePosition(pos.id, {
              quantity: newQty,
              totalCostBasis: newCostBasis,
              averageCost: newAvgCost,
            });
            changes.push({ symbol: pos.assetSymbol, action: "updated", oldQty, newQty, lotCount: lotData.count });
            updated++;
          }
        }
      }

      const userAccounts = await storage.getAccountsByUser(userId);
      const yahooAccount = userAccounts.find(a => a.provider === "yahoo_import");
      const fallbackAccount = yahooAccount || userAccounts[0];

      if (fallbackAccount) {
        for (const [sym, lotData] of Object.entries(lotTotals)) {
          if (existingSymbols.has(sym)) continue;
          if (lotData.qty <= 0) continue;

          const newQty = lotData.qty.toFixed(8);
          const newCostBasis = lotData.costBasis.toFixed(2);
          const newAvgCost = lotData.qty > 0 ? (lotData.costBasis / lotData.qty).toFixed(8) : "0";

          await storage.createPosition({
            userId,
            accountId: fallbackAccount.id,
            assetSymbol: sym,
            quantity: newQty,
            averageCost: newAvgCost,
            totalCostBasis: newCostBasis,
          });
          changes.push({ symbol: sym, action: "created", newQty, lotCount: lotData.count });
          created++;
        }
      }

      console.log(`[recalc] Updated ${updated}, created ${created} positions from lot data for user ${userId}`);
      res.json({ updated, created, changes });
    } catch (error) {
      console.error("Recalc positions error:", error);
      res.status(500).json({ message: "Failed to recalculate positions" });
    }
  });

  app.post("/api/admin/fix-erc20-cost-basis", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      const highValueStocks = new Set([
        "BTC", "ETH", "SOL", "TAO", "TAO22974", "ABBV", "VTI", "FDN", "PLTR",
        "IVV", "NVDA", "AAPL", "NFLX", "VGT", "HD", "QS", "KSM", "LINK",
        "MKR", "AAVE", "COMP", "YFI", "BNB", "AVAX", "DOT",
      ]);

      const allLots = await storage.getTaxLotsByUser(userId);
      const priceCacheRows = await db.select().from(priceCacheTable);
      const priceLookup: Record<string, number> = {};
      for (const row of priceCacheRows) {
        priceLookup[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
      }
      const assetsAll = await storage.getAllAssets();
      for (const a of assetsAll) {
        if (a.currentPrice) priceLookup[a.symbol.toUpperCase()] = parseFloat(a.currentPrice);
      }

      const ethThreshold = 500;
      const fixes: { id: string; symbol: string; oldCost: string; newCost: string; qty: string }[] = [];

      for (const lot of allLots) {
        const costPerUnit = parseFloat(lot.costBasisPerUnit);
        if (costPerUnit <= ethThreshold) continue;
        if (highValueStocks.has(lot.assetSymbol.toUpperCase())) continue;

        const currentPrice = priceLookup[lot.assetSymbol.toUpperCase()] || 0;
        const correctedCost = currentPrice > 0 ? currentPrice : 0;

        await db.execute(
          sql`UPDATE tax_lots SET cost_basis_per_unit = ${correctedCost.toFixed(8)} WHERE id = ${lot.id}`
        );
        fixes.push({
          id: lot.id,
          symbol: lot.assetSymbol,
          oldCost: costPerUnit.toFixed(8),
          newCost: correctedCost.toFixed(8),
          qty: lot.remainingQuantity,
        });
      }

      console.log(`[admin-fix-erc20] Fixed ${fixes.length} corrupted tax lots for user ${userId}`);
      res.json({ fixed: fixes.length, details: fixes });
    } catch (error) {
      console.error("Fix ERC-20 cost basis error:", error);
      res.status(500).json({ message: "Failed to fix ERC-20 cost basis" });
    }
  });

  app.get("/api/duplicate-lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allLots = await storage.getTaxLotsByUser(userId);

      const groups: Record<string, typeof allLots> = {};
      for (const lot of allLots) {
        const qty = parseFloat(lot.remainingQuantity).toFixed(4);
        const dateStr = new Date(lot.acquiredDate).toISOString().split("T")[0];
        const key = `${lot.assetSymbol}|${qty}|${dateStr}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(lot);
      }

      const duplicates: { key: string; assetSymbol: string; quantity: string; date: string; lots: any[] }[] = [];
      for (const [key, lots] of Object.entries(groups)) {
        if (lots.length > 1) {
          const [sym, qty, date] = key.split("|");
          duplicates.push({
            key,
            assetSymbol: sym,
            quantity: qty,
            date,
            lots: lots.map(l => ({
              id: l.id,
              acquisitionType: l.acquisitionType,
              note: l.note,
              costBasisPerUnit: l.costBasisPerUnit,
              walletBalanceId: l.walletBalanceId,
              transactionId: l.transactionId,
            })),
          });
        }
      }

      duplicates.sort((a, b) => a.assetSymbol.localeCompare(b.assetSymbol) || a.date.localeCompare(b.date));
      res.json({ totalDuplicateGroups: duplicates.length, duplicates });
    } catch (error) {
      console.error("Duplicate lots error:", error);
      res.status(500).json({ message: "Failed to find duplicates" });
    }
  });

  app.post("/api/admin/payment-addresses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      const { chain, address, label } = req.body;
      if (!chain || !address) {
        return res.status(400).json({ message: "Chain and address are required." });
      }

      const result = await storage.createCryptoPaymentAddress({
        chain: chain.toLowerCase(),
        address,
        label: label || null,
        isActive: true,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment address" });
    }
  });

  app.delete("/api/admin/payment-addresses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }

      await storage.deleteCryptoPaymentAddress(parseInt(req.params.id));
      res.json({ message: "Address deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment address" });
    }
  });

  app.get("/api/admin/crypto-payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin only" });
      }
      const payments = await storage.getRecentCryptoPayments(50);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to load crypto payments" });
    }
  });

  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      res.json({ tier, status: "active" });
    } catch (error) {
      console.error("Subscription check error:", error);
      res.status(500).json({ message: "Failed to check subscription" });
    }
  });

}
