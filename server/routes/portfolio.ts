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
import { clearGainEventsForSell, resolveReviewWithMemory } from "../services/transfer-reconciliation";

export function registerPortfolioRoutes(app: Express) {
  app.post("/api/blend/sync", isAuthenticated, async (req: any, res) => {
    try {
      const { fetchAllBlendPositions, BLEND_POOLS, buildPositionSymbol } = await import("../services/blend");
      const userId = req.user.claims.sub;

      const settings = await storage.getUserSettings(userId);
      let stellarAddress = settings?.stellarAddress || null;

      if (!stellarAddress && req.body.stellarAddress) {
        stellarAddress = req.body.stellarAddress;
        if (stellarAddress && (!stellarAddress.startsWith("G") || stellarAddress.length !== 56)) {
          return res.status(400).json({ message: "Invalid Stellar address format." });
        }
        await storage.upsertUserSettings({ userId, stellarAddress });
      }

      if (!stellarAddress) {
        return res.status(400).json({ message: "No Stellar address connected. Connect your Stellar wallet first." });
      }

      if (!BLEND_POOLS || BLEND_POOLS.length === 0) {
        return res.status(503).json({
          message: "Blend pools are not configured. Check your positions directly on mainnet.blend.capital.",
          noPools: true,
        });
      }

      let fetchResult;
      try {
        fetchResult = await fetchAllBlendPositions(stellarAddress);
      } catch (err: any) {
        console.error("[blend/sync] Soroban query failed:", err?.message || err);
        return res.status(502).json({
          message: "Could not reach Blend on Soroban right now. Try again later or check mainnet.blend.capital.",
        });
      }
      const { snapshots, successPoolKeys, failedPoolKeys } = fetchResult;
      if (snapshots.length === 0 && failedPoolKeys.length > 0) {
        return res.status(502).json({
          message: `Blend pool query failed (${failedPoolKeys.join(", ")}). Try again later or check mainnet.blend.capital.`,
        });
      }

      const existingAccounts = await storage.getAccountsByUser(userId);
      let blendAccount = existingAccounts.find(a => a.provider === "blend-stellar");
      if (!blendAccount) {
        blendAccount = await storage.createAccount({
          userId,
          credentialId: null,
          provider: "blend-stellar",
          accountName: "Blend Capital (Stellar)",
          accountType: "defi",
        });
      }

      const priceRows = await db.select().from(priceCacheTable);
      const priceMap: Record<string, number> = {};
      for (const row of priceRows) priceMap[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);

      const synced: Array<{ poolKey: string; assetSymbol: string; positionSymbol: string; supply: number; collateral: number; liabilities: number; supplyApy: number }> = [];
      const seenSymbols = new Set<string>();

      for (const snap of snapshots) {
        for (const p of snap.positions) {
          const positionSymbol = buildPositionSymbol(snap.poolKey, p.symbol);
          seenSymbols.add(positionSymbol.toUpperCase());
          const totalSupply = p.supply + p.collateral;
          const price = priceMap[p.symbol.toUpperCase()] || 0;
          const costBasis = totalSupply * price;

          const existing = await storage.getPositionByUserAndAsset(userId, blendAccount.id, positionSymbol);
          if (totalSupply > 0) {
            if (existing) {
              await storage.updatePosition(existing.id, {
                quantity: totalSupply.toFixed(8),
                averageCost: price.toFixed(8),
                totalCostBasis: costBasis.toFixed(2),
              });
              if (existing.isAddressed) await storage.markPositionAddressed(existing.id, false);
            } else {
              await storage.createPosition({
                userId,
                accountId: blendAccount.id,
                assetSymbol: positionSymbol,
                quantity: totalSupply.toFixed(8),
                averageCost: price.toFixed(8),
                totalCostBasis: costBasis.toFixed(2),
              });
            }
          } else if (existing) {
            await storage.updatePosition(existing.id, { quantity: "0", totalCostBasis: "0" });
            await storage.markPositionAddressed(existing.id, true);
          }

          synced.push({
            poolKey: snap.poolKey,
            assetSymbol: p.symbol,
            positionSymbol,
            supply: p.supply,
            collateral: p.collateral,
            liabilities: p.liabilities,
            supplyApy: p.supplyApy,
          });
        }
      }

      const allBlendPositions = (await storage.getPositionsByUser(userId)).filter(p =>
        p.accountId === blendAccount.id && p.assetSymbol.toUpperCase().includes("-BLEND-")
      );
      for (const pos of allBlendPositions) {
        const parts = pos.assetSymbol.toUpperCase().split("-BLEND-");
        const positionPoolKey = parts[1] || "";
        const wasFetched = successPoolKeys.has(positionPoolKey);
        if (wasFetched && !seenSymbols.has(pos.assetSymbol.toUpperCase()) && parseFloat(pos.quantity) > 0) {
          await storage.updatePosition(pos.id, { quantity: "0", totalCostBasis: "0" });
          await storage.markPositionAddressed(pos.id, true);
        }
      }

      const userSettingsCurrent = await storage.getUserSettings(userId);
      const store = (userSettingsCurrent?.userDataStore as Record<string, any>) || {};
      store.blendSync = {
        lastSyncedAt: new Date().toISOString(),
        snapshots,
      };
      await storage.upsertUserSettings({ userId, userDataStore: store });

      res.json({ synced: true, stellarAddress, positions: synced });
    } catch (error: any) {
      console.error("[blend/sync] Error:", error);
      res.status(500).json({ message: "Failed to sync Blend positions" });
    }
  });

  app.get("/api/positions/blend", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positionsData = await storage.getPositionsByUser(userId);
      const blendPositions = positionsData.filter(p => p.assetSymbol.toUpperCase().includes("-BLEND-"));

      if (blendPositions.length === 0) return res.json({ positions: [], lastSyncedAt: null, snapshots: [] });

      const settings = await storage.getUserSettings(userId);
      const store = (settings?.userDataStore as Record<string, any>) || {};
      const blendSync = store.blendSync || {};
      const snapshots = blendSync.snapshots || [];

      const apySymbolMap: Record<string, number> = {};
      for (const snap of snapshots) {
        for (const p of (snap.positions || [])) {
          const key = `${snap.poolKey}|${p.symbol}`.toUpperCase();
          apySymbolMap[key] = p.supplyApy || 0;
        }
      }

      const result = blendPositions.map(p => {
        const parts = p.assetSymbol.split("-BLEND-");
        const assetSymbol = parts[0] || "";
        const poolKey = parts[1] || "";
        const apy = apySymbolMap[`${poolKey}|${assetSymbol}`.toUpperCase()] || 0;
        return {
          assetSymbol: p.assetSymbol,
          tokenSymbol: assetSymbol,
          poolKey,
          quantity: p.quantity,
          totalCostBasis: p.totalCostBasis,
          supplyApy: apy,
        };
      });

      res.json({ positions: result, lastSyncedAt: blendSync.lastSyncedAt || null, snapshots });
    } catch (error) {
      console.error("[positions/blend] Error:", error);
      res.status(500).json({ message: "Failed to fetch Blend positions" });
    }
  });

  app.get("/api/positions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positionsData = await storage.getPositionsByUser(userId);
      const accounts = await storage.getAccountsByUser(userId);
      const accountMap = new Map(accounts.map(a => [a.id, a]));
      const allAssetsForPos = await storage.getAllAssets();
      const assetPriceMap = new Map(allAssetsForPos.map(a => [a.symbol.toUpperCase(), a.currentPrice ? parseFloat(a.currentPrice) : 0]));
      const enriched = [];
      const [posPriceCacheRows] = await Promise.all([db.select().from(priceCacheTable)]);
      const posPriceCacheLookup: Record<string, number> = {};
      for (const row of posPriceCacheRows) {
        posPriceCacheLookup[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
      }
      for (const pos of positionsData) {
        let currentPrice = assetPriceMap.get(pos.assetSymbol.toUpperCase()) || 0;
        if (currentPrice <= 0) currentPrice = posPriceCacheLookup[pos.assetSymbol.toUpperCase()] || 0;
        if (currentPrice <= 0) currentPrice = parseFloat(pos.averageCost) || 0;
        const qty = parseFloat(pos.quantity);
        if (currentPrice <= 0 && qty > 0) {
          const cb = parseFloat(pos.totalCostBasis) || 0;
          if (cb > 0) currentPrice = cb / qty;
        }
        const value = qty * currentPrice;
        const costBasis = parseFloat(pos.totalCostBasis);
        const gainLoss = value - costBasis;
        const account = accountMap.get(pos.accountId);
        const isImport = account?.accountType === "import";
        enriched.push({
          ...pos,
          currentPrice,
          currentValue: value,
          gainLoss,
          gainLossPercent: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
          source: account?.accountName || "",
          isImport: isImport || account?.provider === "manual",
          isAddressed: pos.isAddressed || false,
        });
      }
      res.json(enriched);
    } catch (error) {
      console.error("Positions error:", error);
      res.status(500).json({ message: "Failed to load positions" });
    }
  });

  app.patch("/api/positions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const positionsData = await storage.getPositionsByUser(userId);
      const position = positionsData.find(p => p.id === id);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }
      if (position.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { quantity, averageCost, totalCostBasis, assetSymbol } = req.body;
      const updates: any = {};
      if (quantity !== undefined) {
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty < 0) return res.status(400).json({ message: "Invalid quantity" });
        updates.quantity = qty.toString();
      }
      if (averageCost !== undefined) {
        const ac = parseFloat(averageCost);
        if (isNaN(ac) || ac < 0) return res.status(400).json({ message: "Invalid average cost" });
        updates.averageCost = ac.toString();
      }
      if (totalCostBasis !== undefined) {
        const tcb = parseFloat(totalCostBasis);
        if (isNaN(tcb) || tcb < 0) return res.status(400).json({ message: "Invalid cost basis" });
        updates.totalCostBasis = tcb.toFixed(2);
      }
      if (assetSymbol !== undefined) {
        const sym = String(assetSymbol).toUpperCase().trim();
        if (!sym || sym.length > 20) return res.status(400).json({ message: "Invalid symbol" });
        updates.assetSymbol = sym;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const updated = await storage.updatePosition(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Edit position error:", error);
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.delete("/api/wallet-balances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const balances = await storage.getWalletBalancesByUser(userId);
      const balance = balances.find(b => b.id === id);
      if (!balance) {
        return res.status(404).json({ message: "Wallet balance not found" });
      }
      if (balance.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const wallet = (await storage.getWalletsByUser(userId)).find(w => w.id === balance.walletId);
      if (!wallet || wallet.chain !== "manual") {
        return res.status(400).json({ message: "Can only delete balances from manual wallets" });
      }
      await db.delete(walletBalances).where(eq(walletBalances.id, id));
      res.json({ message: `Removed ${balance.assetSymbol} from ${wallet.label || "manual wallet"}` });
    } catch (error) {
      console.error("Delete wallet balance error:", error);
      res.status(500).json({ message: "Failed to delete wallet balance" });
    }
  });

  app.patch("/api/wallet-balances/:id/balance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const balances = await storage.getWalletBalancesByUser(userId);
      const balance = balances.find(b => b.id === id);
      if (!balance) {
        return res.status(404).json({ message: "Wallet balance not found" });
      }
      if (balance.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const wallet = (await storage.getWalletsByUser(userId)).find(w => w.id === balance.walletId);
      if (!wallet || wallet.chain !== "manual") {
        return res.status(400).json({ message: "Can only edit balances on manual wallets" });
      }
      const { newBalance } = req.body;
      if (newBalance === undefined || isNaN(parseFloat(newBalance))) {
        return res.status(400).json({ message: "Valid balance required" });
      }
      const avgCost = parseFloat(balance.averageCost || "0");
      const newBal = parseFloat(newBalance);
      const newCostBasis = (avgCost * newBal).toFixed(2);
      await db.update(walletBalances)
        .set({ balance: newBalance, totalCostBasis: newCostBasis, updatedAt: new Date() })
        .where(eq(walletBalances.id, id));
      res.json({ message: `Updated ${balance.assetSymbol} balance to ${newBalance}` });
    } catch (error) {
      console.error("Edit wallet balance error:", error);
      res.status(500).json({ message: "Failed to update wallet balance" });
    }
  });

  app.patch("/api/wallet-balances/:id/hold-reason", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const balances = await storage.getWalletBalancesByUser(userId);
      const balance = balances.find(b => b.id === id);
      if (!balance) {
        return res.status(404).json({ message: "Wallet balance not found" });
      }
      if (balance.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { holdReason } = req.body;
      await db.update(walletBalances)
        .set({ holdReason: holdReason || null })
        .where(eq(walletBalances.id, id));
      res.json({ message: holdReason ? `Flagged ${balance.assetSymbol} as "${holdReason}"` : `Cleared flag on ${balance.assetSymbol}` });
    } catch (error) {
      console.error("Set hold reason error:", error);
      res.status(500).json({ message: "Failed to update hold reason" });
    }
  });

  app.patch("/api/wallet-balances/:id/cost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const balances = await storage.getWalletBalancesByUser(userId);
      const balance = balances.find(b => b.id === id);
      if (!balance) {
        return res.status(404).json({ message: "Wallet balance not found" });
      }
      if (balance.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { averageCost, totalCostBasis } = req.body;
      const updates: any = {};
      if (averageCost !== undefined) {
        const ac = parseFloat(averageCost);
        if (isNaN(ac) || ac < 0) return res.status(400).json({ message: "Invalid average cost" });
        updates.averageCost = ac.toString();
      }
      if (totalCostBasis !== undefined) {
        const tcb = parseFloat(totalCostBasis);
        if (isNaN(tcb) || tcb < 0) return res.status(400).json({ message: "Invalid cost basis" });
        updates.totalCostBasis = tcb.toFixed(2);
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Provide averageCost and/or totalCostBasis" });
      }
      await storage.updateWalletBalanceCostData(
        id,
        updates.averageCost || balance.averageCost || "0",
        updates.totalCostBasis || balance.totalCostBasis || "0"
      );
      res.json({ message: "Cost data updated" });
    } catch (error) {
      console.error("Edit wallet balance cost error:", error);
      res.status(500).json({ message: "Failed to update cost data" });
    }
  });

  app.get("/api/wallet-balances/:id/lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const lots = await storage.getTaxLotsByWalletBalance(userId, id);
      res.json(lots);
    } catch (error) {
      console.error("Get wallet lots error:", error);
      res.status(500).json({ message: "Failed to load purchase lots" });
    }
  });

  app.post("/api/wallet-balances/:id/lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const balances = await storage.getWalletBalancesByUser(userId);
      const balance = balances.find(b => b.id === id);
      if (!balance) {
        return res.status(404).json({ message: "Wallet balance not found" });
      }
      const { quantity, costPerUnit, acquiredDate, note, acquisitionType } = req.body;
      const qty = parseFloat(quantity);
      const cost = parseFloat(costPerUnit);
      if (isNaN(qty) || qty <= 0) return res.status(400).json({ message: "Quantity must be positive" });
      if (isNaN(cost) || cost < 0) return res.status(400).json({ message: "Cost per unit must be non-negative" });
      if (!acquiredDate) return res.status(400).json({ message: "Acquired date is required" });

      const validTypes = ["purchase", "earned", "airdrop", "transfer"];
      const acqType = validTypes.includes(acquisitionType) ? acquisitionType : "purchase";

      const lot = await storage.createTaxLot({
        userId,
        walletBalanceId: id,
        assetSymbol: balance.assetSymbol,
        acquiredDate: safeServerDate(acquiredDate),
        originalQuantity: qty.toString(),
        remainingQuantity: qty.toString(),
        costBasisPerUnit: cost.toString(),
        acquisitionType: acqType,
        note: note || null,
      });

      const allLots = await storage.getTaxLotsByWalletBalance(userId, id);
      const totalCost = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      await storage.updateWalletBalanceCostData(id, avgCost.toFixed(8), totalCost.toFixed(2));

      const userWallets = await storage.getWalletsByUser(userId);
      const ownerWallet = userWallets.find(w => w.id === balance.walletId);
      if (ownerWallet && ownerWallet.chain === "manual") {
        const currentBal = parseFloat(balance.balance);
        if (totalQty > currentBal) {
          const prices = await db.select().from(priceCacheTable);
          const priceEntry = prices.find(p => p.symbol.toUpperCase() === balance.assetSymbol.toUpperCase());
          const newUsd = priceEntry ? totalQty * parseFloat(priceEntry.price) : 0;
          await db.update(walletBalances)
            .set({ balance: totalQty.toFixed(8), usdValue: newUsd.toFixed(2), updatedAt: new Date() })
            .where(eq(walletBalances.id, id));
        }
      }

      res.json(lot);
    } catch (error) {
      console.error("Create wallet lot error:", error);
      res.status(500).json({ message: "Failed to create purchase lot" });
    }
  });

  app.patch("/api/wallet-balances/:balanceId/lots/:lotId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { balanceId, lotId } = req.params;
      const lots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const lot = lots.find(l => l.id === lotId);
      if (!lot) return res.status(404).json({ message: "Purchase lot not found" });

      const { quantity, costPerUnit, acquiredDate, note } = req.body;
      const updates: any = {};
      if (quantity !== undefined) {
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) return res.status(400).json({ message: "Quantity must be positive" });
        updates.originalQuantity = qty.toString();
        updates.remainingQuantity = qty.toString();
      }
      if (costPerUnit !== undefined) {
        const cost = parseFloat(costPerUnit);
        if (isNaN(cost) || cost < 0) return res.status(400).json({ message: "Cost per unit must be non-negative" });
        updates.costBasisPerUnit = cost.toString();
      }
      if (acquiredDate !== undefined) {
        updates.acquiredDate = safeServerDate(acquiredDate);
      }
      if (note !== undefined) {
        updates.note = note || null;
      }

      const updated = await storage.updateTaxLot(lotId, updates);

      const allLots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const totalCost = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      await storage.updateWalletBalanceCostData(balanceId, avgCost.toFixed(8), totalCost.toFixed(2));

      res.json(updated);
    } catch (error) {
      console.error("Update wallet lot error:", error);
      res.status(500).json({ message: "Failed to update purchase lot" });
    }
  });

  app.delete("/api/wallet-balances/:balanceId/lots/:lotId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { balanceId, lotId } = req.params;
      const lots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const lot = lots.find(l => l.id === lotId);
      if (!lot) return res.status(404).json({ message: "Purchase lot not found" });

      await storage.deleteTaxLot(lotId);

      const remainingLots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const totalCost = remainingLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = remainingLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      await storage.updateWalletBalanceCostData(balanceId, avgCost.toFixed(8), totalCost.toFixed(2));

      res.json({ message: "Purchase lot removed" });
    } catch (error) {
      console.error("Delete wallet lot error:", error);
      res.status(500).json({ message: "Failed to delete purchase lot" });
    }
  });

  app.post("/api/lots/:lotId/write-off", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lotId } = req.params;
      const { reason, lossDate, note } = req.body;

      const allLots = await storage.getTaxLotsByUser(userId);
      const lot = allLots.find(l => l.id === lotId);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      const validReasons = ["scam", "hack", "lost_keys", "sent_in_error", "other"];
      const writeOffReason = validReasons.includes(reason) ? reason : "other";

      const qty = parseFloat(lot.remainingQuantity);
      if (qty <= 0) {
        return res.status(400).json({ message: "This lot has no remaining quantity to write off" });
      }

      const costPerUnit = parseFloat(lot.costBasisPerUnit);
      const totalCostBasis = qty * costPerUnit;
      const acquiredDate = new Date(lot.acquiredDate);
      const disposalDate = lossDate ? new Date(lossDate) : new Date();
      const holdingDays = (disposalDate.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24);
      const isLongTerm = holdingDays >= 365;

      const reasonLabels: Record<string, string> = {
        scam: "Lost to scam",
        hack: "Lost in hack",
        lost_keys: "Lost keys / inaccessible",
        sent_in_error: "Sent in error",
        other: "Write-off",
      };

      const disposalNote = `${reasonLabels[writeOffReason]}${note ? `: ${note}` : ""}`;

      await storage.createGainEvent({
        userId,
        sellTransactionId: `writeoff-${lotId}-${Date.now()}`,
        taxLotId: lotId,
        assetSymbol: lot.assetSymbol,
        quantity: qty.toString(),
        proceeds: "0.00",
        costBasis: totalCostBasis.toFixed(2),
        gainLoss: (-totalCostBasis).toFixed(2),
        isLongTerm,
        taxMethod: "WRITEOFF",
        soldDate: disposalDate,
        acquiredDate,
        disposalType: writeOffReason,
        disposalNote,
      });

      await storage.updateTaxLot(lotId, {
        remainingQuantity: "0",
        note: `${lot.note ? lot.note + " | " : ""}WRITTEN OFF: ${disposalNote}`,
      });

      if (lot.walletBalanceId) {
        const wbLots = await storage.getTaxLotsByWalletBalance(userId, lot.walletBalanceId);
        const activeLots = wbLots.filter(l => parseFloat(l.remainingQuantity) > 0);
        const totalCost = activeLots
          .reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
        const totalQty = activeLots
          .reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
        const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
        await storage.updateWalletBalanceCostData(lot.walletBalanceId, avgCost.toFixed(8), totalCost.toFixed(2));
      }

      res.json({
        message: `Written off ${qty} ${lot.assetSymbol} — $${totalCostBasis.toFixed(2)} capital loss recorded`,
        loss: totalCostBasis,
        quantity: qty,
        isLongTerm,
      });
    } catch (error) {
      console.error("Write-off lot error:", error);
      res.status(500).json({ message: "Failed to write off lot" });
    }
  });

  app.post("/api/lots/write-off-by-asset", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetSymbol, reason = "scam", lossDate, note } = req.body;
      if (!assetSymbol) return res.status(400).json({ message: "assetSymbol is required" });

      const sym = assetSymbol.toUpperCase().trim();
      const allLots = await storage.getTaxLotsByUser(userId);
      const targetLots = allLots.filter(l =>
        l.assetSymbol.toUpperCase() === sym && parseFloat(l.remainingQuantity) > 0
      ).sort((a, b) => parseFloat(b.costBasisPerUnit) - parseFloat(a.costBasisPerUnit));

      if (targetLots.length === 0) {
        return res.status(404).json({ message: `No active ${sym} lots found to write off` });
      }

      const validReasons = ["scam", "hack", "lost_keys", "sent_in_error", "other"];
      const writeOffReason = validReasons.includes(reason) ? reason : "scam";
      const reasonLabels: Record<string, string> = {
        scam: "Lost to scam", hack: "Lost in hack", lost_keys: "Lost keys / inaccessible",
        sent_in_error: "Sent in error", other: "Write-off",
      };
      const disposalDate = lossDate ? new Date(lossDate) : new Date();
      const disposalNote = `${reasonLabels[writeOffReason]}${note ? `: ${note}` : ""}`;

      let totalQtyWritten = 0;
      let totalLoss = 0;
      const touchedBalanceIds = new Set<string>();

      for (const lot of targetLots) {
        const qty = parseFloat(lot.remainingQuantity);
        const costPerUnit = parseFloat(lot.costBasisPerUnit);
        const lotCostBasis = qty * costPerUnit;
        const acquiredDate = new Date(lot.acquiredDate);
        const holdingDays = (disposalDate.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24);
        const isLongTerm = holdingDays >= 365;

        await storage.createGainEvent({
          userId,
          sellTransactionId: `writeoff-asset-${lot.id}-${Date.now()}`,
          taxLotId: lot.id,
          assetSymbol: sym,
          quantity: qty.toString(),
          proceeds: "0.00",
          costBasis: lotCostBasis.toFixed(2),
          gainLoss: (-lotCostBasis).toFixed(2),
          isLongTerm,
          taxMethod: "WRITEOFF",
          soldDate: disposalDate,
          acquiredDate,
          disposalType: writeOffReason,
          disposalNote,
        });

        await storage.updateTaxLot(lot.id, {
          remainingQuantity: "0",
          note: `${lot.note ? lot.note + " | " : ""}WRITTEN OFF: ${disposalNote}`,
        });

        totalQtyWritten += qty;
        totalLoss += lotCostBasis;
        if (lot.walletBalanceId) touchedBalanceIds.add(lot.walletBalanceId);
      }

      for (const wbId of touchedBalanceIds) {
        const wbLots = await storage.getTaxLotsByWalletBalance(userId, wbId);
        const tc = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
        const tq = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
        const avg = tq > 0 ? tc / tq : 0;
        await storage.updateWalletBalanceCostData(wbId, avg.toFixed(8), tc.toFixed(2));
      }

      res.json({
        message: `Written off ${totalQtyWritten.toFixed(4)} ${sym} across ${targetLots.length} lots — $${totalLoss.toFixed(2)} total capital loss recorded`,
        totalQtyWritten,
        totalLoss,
        lotsAffected: targetLots.length,
      });
    } catch (error) {
      console.error("Write-off by asset error:", error);
      res.status(500).json({ message: "Failed to write off asset lots" });
    }
  });

  app.post("/api/lots/write-off-excess", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reason = "scam", lossDate, note } = req.body;
      const allLots = await storage.getTaxLotsByUser(userId);
      const allBalances = await storage.getWalletBalancesByUser(userId);

      const validReasons = ["scam", "hack", "lost_keys", "sent_in_error", "other"];
      const writeOffReason = validReasons.includes(reason) ? reason : "scam";
      const reasonLabels: Record<string, string> = {
        scam: "Lost to scam",
        hack: "Lost in hack",
        lost_keys: "Lost keys / inaccessible",
        sent_in_error: "Sent in error",
        other: "Write-off",
      };
      const disposalDate = lossDate ? new Date(lossDate) : new Date();

      let totalWrittenOff = 0;
      let totalLossAmount = 0;
      const details: Array<{ wallet: string; symbol: string; qtyWrittenOff: number; lossAmount: number; lotsAffected: number }> = [];
      const touchedBalanceIds = new Set<string>();

      for (const wb of allBalances) {
        const assignedLots = allLots
          .filter(l => l.walletBalanceId === wb.id && parseFloat(l.remainingQuantity) > 0)
          .sort((a, b) => parseFloat(b.costBasisPerUnit) - parseFloat(a.costBasisPerUnit));

        const totalAssigned = assignedLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
        const liveBalance = parseFloat(wb.balance);
        const excess = totalAssigned - liveBalance;

        if (excess <= 0.001) continue;

        let remaining = excess;
        let walletLoss = 0;
        let lotsAffected = 0;

        for (const lot of assignedLots) {
          if (remaining <= 0.001) break;
          const lotQty = parseFloat(lot.remainingQuantity);
          const writeOffQty = Math.min(remaining, lotQty);
          const costPerUnit = parseFloat(lot.costBasisPerUnit);
          const lotCostBasis = writeOffQty * costPerUnit;
          const acquiredDate = new Date(lot.acquiredDate);
          const holdingDays = (disposalDate.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24);
          const isLongTerm = holdingDays >= 365;

          const disposalNote = `${reasonLabels[writeOffReason]} (bulk excess write-off)${note ? `: ${note}` : ""}`;

          await storage.createGainEvent({
            userId,
            sellTransactionId: `writeoff-excess-${lot.id}-${Date.now()}`,
            taxLotId: lot.id,
            assetSymbol: lot.assetSymbol,
            quantity: writeOffQty.toString(),
            proceeds: "0.00",
            costBasis: lotCostBasis.toFixed(2),
            gainLoss: (-lotCostBasis).toFixed(2),
            isLongTerm,
            taxMethod: "WRITEOFF",
            soldDate: disposalDate,
            acquiredDate,
            disposalType: writeOffReason,
            disposalNote,
          });

          const newRemaining = lotQty - writeOffQty;
          await storage.updateTaxLot(lot.id, {
            remainingQuantity: newRemaining.toFixed(8),
            note: `${lot.note ? lot.note + " | " : ""}WRITTEN OFF: ${disposalNote} (${writeOffQty.toFixed(4)} of ${lotQty.toFixed(4)})`,
          });

          remaining -= writeOffQty;
          walletLoss += lotCostBasis;
          lotsAffected++;
        }

        totalWrittenOff += (excess - remaining);
        totalLossAmount += walletLoss;
        touchedBalanceIds.add(wb.id);

        const userWallets = await storage.getWalletsByUser(userId);
        const wallet = userWallets.find(w => w.id === wb.walletId);
        details.push({
          wallet: wallet?.label || wallet?.chain || "Unknown",
          symbol: wb.assetSymbol,
          qtyWrittenOff: excess - remaining,
          lossAmount: walletLoss,
          lotsAffected,
        });
      }

      for (const wbId of touchedBalanceIds) {
        const wbLots = await storage.getTaxLotsByWalletBalance(userId, wbId);
        const totalCost = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
        const totalQty = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
        const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
        await storage.updateWalletBalanceCostData(wbId, avgCost.toFixed(8), totalCost.toFixed(2));
      }

      res.json({
        message: `Written off ${totalWrittenOff.toFixed(4)} excess across ${touchedBalanceIds.size} wallet(s) — $${totalLossAmount.toFixed(2)} total capital loss recorded`,
        totalWrittenOff,
        totalLossAmount,
        walletsAffected: touchedBalanceIds.size,
        details,
      });
    } catch (error) {
      console.error("Write-off excess error:", error);
      res.status(500).json({ message: "Failed to write off excess lots" });
    }
  });

  app.post("/api/wallet-balances/:balanceId/record-sale", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { balanceId } = req.params;
      const { quantity, pricePerUnit, saleDate, method = "FIFO", note, source } = req.body;

      const qty = parseFloat(quantity);
      const price = parseFloat(pricePerUnit);
      if (!qty || qty <= 0 || isNaN(price) || price < 0) {
        return res.status(400).json({ message: "Valid quantity and price per unit are required" });
      }

      const lots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const activeLots = lots.filter(l => parseFloat(l.remainingQuantity) > 0);
      const totalAvailable = activeLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);

      if (totalAvailable < qty * 0.9999) {
        return res.status(400).json({ message: `Not enough lots to cover sale. Available: ${totalAvailable.toFixed(4)}, Selling: ${qty}` });
      }

      const sortedLots = method === "LIFO"
        ? [...activeLots].sort((a, b) => new Date(b.acquiredDate).getTime() - new Date(a.acquiredDate).getTime())
        : [...activeLots].sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());

      const sellDate = saleDate ? new Date(saleDate) : new Date();
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      let remaining = qty;
      let totalProceeds = 0;
      let totalCostBasis = 0;
      const events: Array<{ quantity: number; proceeds: number; costBasis: number; gainLoss: number; isLongTerm: boolean }> = [];

      for (const lot of sortedLots) {
        if (remaining <= 0.0001) break;
        const lotRemaining = parseFloat(lot.remainingQuantity);
        if (lotRemaining <= 0) continue;

        const sellFromLot = Math.min(remaining, lotRemaining);
        const proceeds = sellFromLot * price;
        const costBasis = sellFromLot * parseFloat(lot.costBasisPerUnit);
        const gainLoss = proceeds - costBasis;
        const acquiredDate = new Date(lot.acquiredDate);
        const isLongTerm = (sellDate.getTime() - acquiredDate.getTime()) >= oneYear;

        await storage.createGainEvent({
          userId,
          sellTransactionId: null,
          taxLotId: lot.id,
          assetSymbol: lot.assetSymbol,
          quantity: sellFromLot.toString(),
          proceeds: proceeds.toFixed(2),
          costBasis: costBasis.toFixed(2),
          gainLoss: gainLoss.toFixed(2),
          isLongTerm,
          taxMethod: method,
          soldDate: sellDate,
          acquiredDate,
          disposalType: source === "swap" ? "swap" : source === "send" ? "send" : "sale",
          disposalNote: note || undefined,
        });

        await storage.updateTaxLot(lot.id, {
          remainingQuantity: (lotRemaining - sellFromLot).toFixed(8),
        });

        totalProceeds += proceeds;
        totalCostBasis += costBasis;
        events.push({ quantity: sellFromLot, proceeds, costBasis, gainLoss, isLongTerm });
        remaining -= sellFromLot;
      }

      const wbLots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const remainingLots = wbLots.filter(l => parseFloat(l.remainingQuantity) > 0);
      const newTotalCost = remainingLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const newTotalQty = remainingLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
      const newAvgCost = newTotalQty > 0 ? newTotalCost / newTotalQty : 0;
      await storage.updateWalletBalanceCostData(balanceId, newAvgCost.toFixed(8), newTotalCost.toFixed(2));

      const totalGainLoss = totalProceeds - totalCostBasis;
      const assetSymbol = sortedLots[0]?.assetSymbol || "Unknown";

      res.json({
        message: `Sold ${qty} ${assetSymbol}`,
        proceeds: totalProceeds,
        costBasis: totalCostBasis,
        gainLoss: totalGainLoss,
        events,
        remainingLotQty: newTotalQty,
      });
    } catch (error) {
      console.error("Record sale error:", error);
      res.status(500).json({ message: "Failed to record sale" });
    }
  });

  app.post("/api/wallet-balances/:balanceId/lots/:lotId/move", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { balanceId, lotId } = req.params;
      const { targetWalletBalanceId } = req.body;
      if (!targetWalletBalanceId) {
        return res.status(400).json({ message: "targetWalletBalanceId is required" });
      }
      if (targetWalletBalanceId === balanceId) {
        return res.status(400).json({ message: "Source and target wallets are the same" });
      }

      const sourceLots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const lot = sourceLots.find(l => l.id === lotId);
      if (!lot) return res.status(404).json({ message: "Purchase lot not found" });

      const balances = await storage.getWalletBalancesByUser(userId);
      const targetBal = balances.find(b => b.id === targetWalletBalanceId);
      if (!targetBal) return res.status(404).json({ message: "Target wallet balance not found" });

      if (targetBal.assetSymbol.toUpperCase() !== lot.assetSymbol.toUpperCase()) {
        return res.status(400).json({ message: `Asset mismatch: lot is ${lot.assetSymbol}, target wallet holds ${targetBal.assetSymbol}` });
      }

      await storage.updateTaxLot(lotId, { walletBalanceId: targetWalletBalanceId });

      const recalc = async (wbId: string) => {
        const lots = await storage.getTaxLotsByWalletBalance(userId, wbId);
        const totalCost = lots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
        const totalQty = lots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
        const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
        await storage.updateWalletBalanceCostData(wbId, avgCost.toFixed(8), totalCost.toFixed(2));
      };
      await recalc(balanceId);
      await recalc(targetWalletBalanceId);

      res.json({ message: "Lot moved successfully" });
    } catch (error) {
      console.error("Move lot error:", error);
      res.status(500).json({ message: "Failed to move lot" });
    }
  });

  app.post("/api/reconcile/yahoo-csv-to-wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fs = await import("fs");
      const path = await import("path");

      const csvPath = path.resolve("attached_assets/portfolio_(1)_1772983040841.csv");
      if (!fs.existsSync(csvPath)) {
        return res.status(404).json({ message: "Yahoo CSV file not found" });
      }

      const csvContent = fs.readFileSync(csvPath, "utf-8");
      const csvLines = csvContent.trim().split("\n");

      interface CsvLot {
        symbol: string;
        tradeDate: string;
        purchasePrice: number;
        quantity: number;
        commission: number;
        comment: string;
        exchange: string;
      }

      const csvLots: CsvLot[] = [];
      for (let i = 1; i < csvLines.length; i++) {
        const parts = csvLines[i].split(",");
        const rawSym = parts[0] || "";
        const sym = rawSym.replace("-USD", "");
        const td = parts[9] || "";
        const pp = parseFloat(parts[10] || "0");
        const qty = parseFloat(parts[11] || "0");
        const comm = parseFloat(parts[12] || "0");
        const comment = (parts[15] || "").trim();
        const commentLower = comment.toLowerCase().trim();
        let exchange = "";
        if (commentLower.includes("coinbase") || commentLower === "cb wallet") exchange = "coinbase";
        else if (commentLower.includes("uphold") || commentLower === "uohold") exchange = "uphold";
        else if (commentLower.includes("crypto.com") || commentLower === "cro" || commentLower.includes("crypto earn")) exchange = "crypto.com";
        else if (commentLower.includes("ledger")) exchange = "ledger";
        else if (commentLower.includes("ellipal")) exchange = "ellipal";
        else if (commentLower.includes("safepal")) exchange = "safepal";
        else if (commentLower.includes("cypherock")) exchange = "cypherock";
        else if (commentLower.includes("robinhood")) exchange = "robinhood";
        else if (commentLower.includes("webull")) exchange = "webull";
        else if (commentLower.includes("ally")) exchange = "ally";
        else if (commentLower.includes("schwab")) exchange = "schwab";
        else if (commentLower.includes("e*trade")) exchange = "e*trade";
        else if (commentLower.includes("stash")) exchange = "stash";
        else if (commentLower.includes("greenlight")) exchange = "greenlight";
        if (sym && qty > 0) {
          csvLots.push({ symbol: sym, tradeDate: td, purchasePrice: pp, quantity: qty, commission: comm, comment, exchange });
        }
      }

      const csvBySymbol: Record<string, CsvLot[]> = {};
      for (const lot of csvLots) {
        if (!csvBySymbol[lot.symbol]) csvBySymbol[lot.symbol] = [];
        csvBySymbol[lot.symbol].push(lot);
      }

      const allWalletBalances = await storage.getWalletBalancesByUser(userId);
      const userWallets = await storage.getWalletsByUser(userId);
      const walletMap = new Map(userWallets.map(w => [w.id, w]));

      const wbBySymbol: Record<string, typeof allWalletBalances> = {};
      for (const wb of allWalletBalances) {
        const sym = wb.assetSymbol.replace(" (staked)", "");
        if (!wbBySymbol[sym]) wbBySymbol[sym] = [];
        wbBySymbol[sym].push(wb);
      }

      const results: any[] = [];
      let totalLotsCreated = 0;
      let totalAssetsMatched = 0;
      const processedWbIds = new Set<string>();

      for (const [sym, lots] of Object.entries(csvBySymbol)) {
        const walletBalances = wbBySymbol[sym];
        if (!walletBalances || walletBalances.length === 0) continue;

        for (const wb of walletBalances) {
          if (processedWbIds.has(wb.id)) continue;
          const wallet = walletMap.get(wb.walletId);
          const walletLabel = (wallet?.label || "").toUpperCase();

          const existingYahooCsvLots = await storage.getTaxLotsByWalletBalance(userId, wb.id);
          const hasYahooCsvLots = existingYahooCsvLots.some(l => l.note && l.note.startsWith("Yahoo CSV"));
          if (hasYahooCsvLots) {
            results.push({
              symbol: sym,
              walletBalance: wb.id,
              wallet: wallet?.label || "Unknown",
              status: "skipped",
              reason: `Already has Yahoo CSV lots`,
            });
            processedWbIds.add(wb.id);
            continue;
          }

          const matchingLots = lots.filter(l => {
            if (!l.exchange) {
              if (walletBalances.length === 1) return true;
              return false;
            }
            const ex = l.exchange.toUpperCase();
            if (ex === "CRYPTO.COM" && (walletLabel.includes("CRYPTO") || walletLabel.includes("CRO"))) return true;
            if (ex === "COINBASE" && (walletLabel.includes("COINBASE") || walletLabel.includes("CB"))) return true;
            if (walletLabel.includes(ex)) return true;
            return false;
          });

          if (matchingLots.length === 0) {
            results.push({
              symbol: sym,
              walletBalance: wb.id,
              wallet: wallet?.label || "Unknown",
              status: "skipped",
              reason: "No CSV lots matched this wallet",
            });
            processedWbIds.add(wb.id);
            continue;
          }

          matchingLots.sort((a, b) => (a.tradeDate || "0").localeCompare(b.tradeDate || "0"));

          let lotsCreated = 0;
          let totalCost = 0;
          let totalQty = 0;

          for (const lot of matchingLots) {
            const dateStr = lot.tradeDate;
            let acquiredDate: Date;
            if (dateStr && dateStr.length === 8) {
              const y = dateStr.slice(0, 4);
              const m = dateStr.slice(4, 6);
              const d = dateStr.slice(6, 8);
              acquiredDate = new Date(`${y}-${m}-${d}T00:00:00Z`);
            } else {
              acquiredDate = new Date();
            }

            const notePrefix = lot.purchasePrice === 0 ? "Yahoo CSV (free/airdrop)" : "Yahoo CSV";
            const noteText = lot.comment ? `${notePrefix}: ${lot.comment}` : `${notePrefix} import`;

            await storage.createTaxLot({
              userId,
              walletBalanceId: wb.id,
              assetSymbol: sym,
              acquiredDate,
              originalQuantity: lot.quantity.toString(),
              remainingQuantity: lot.quantity.toString(),
              costBasisPerUnit: lot.purchasePrice.toString(),
              note: noteText,
            });

            totalCost += lot.quantity * lot.purchasePrice;
            totalQty += lot.quantity;
            lotsCreated++;
          }

          if (totalQty > 0) {
            const existingAllLots = await storage.getTaxLotsByWalletBalance(userId, wb.id);
            const allTotalQty = existingAllLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
            const allTotalCost = existingAllLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
            const avgCost = allTotalQty > 0 ? allTotalCost / allTotalQty : 0;
            await storage.updateWalletBalanceCostData(wb.id, avgCost.toFixed(8), allTotalCost.toFixed(2));
          }

          results.push({
            symbol: sym,
            walletBalance: wb.id,
            wallet: wallet?.label || "Unknown",
            chain: wallet?.chain || "unknown",
            status: "reconciled",
            lotsCreated,
            totalCost: totalCost.toFixed(2),
            avgCost: totalQty > 0 ? (totalCost / totalQty).toFixed(6) : "0",
            csvQuantity: totalQty.toFixed(2),
          });

          totalLotsCreated += lotsCreated;
          totalAssetsMatched++;
          processedWbIds.add(wb.id);
        }
      }

      const csvOnlySymbols = Object.keys(csvBySymbol).filter(
        sym => !allWalletBalances.some(wb => wb.assetSymbol.replace(" (staked)", "") === sym)
      );

      res.json({
        summary: {
          totalAssetsMatched,
          totalLotsCreated,
          csvSymbolCount: Object.keys(csvBySymbol).length,
          walletBalanceCount: allWalletBalances.length,
          csvOnlyCount: csvOnlySymbols.length,
        },
        reconciled: results.filter(r => r.status === "reconciled"),
        skipped: results.filter(r => r.status === "skipped"),
        csvOnlySymbols: csvOnlySymbols.sort(),
      });
    } catch (error) {
      console.error("Yahoo CSV reconciliation error:", error);
      res.status(500).json({ message: "Failed to reconcile Yahoo CSV" });
    }
  });

  app.post("/api/reconcile/remove-yahoo-csv-lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const allLots = await db.select().from(taxLots).where(eq(taxLots.userId, userId));
      const yahooCsvLots = allLots.filter(l => l.note && (l.note.startsWith("Yahoo CSV") || l.note.startsWith("Yahoo CSV (")));

      if (yahooCsvLots.length === 0) {
        return res.json({ message: "No Yahoo CSV reconciliation lots found", deleted: 0 });
      }

      const affectedWbIds = new Set<string>();
      for (const lot of yahooCsvLots) {
        if (lot.walletBalanceId) affectedWbIds.add(lot.walletBalanceId);
        await db.delete(taxLots).where(eq(taxLots.id, lot.id));
      }

      let recalculated = 0;
      for (const wbId of affectedWbIds) {
        const remainingLots = await db.select().from(taxLots).where(
          and(eq(taxLots.walletBalanceId, wbId), eq(taxLots.userId, userId))
        );
        if (remainingLots.length > 0) {
          const totalQty = remainingLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
          const totalCost = remainingLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
          const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
          await storage.updateWalletBalanceCostData(wbId, avgCost.toFixed(8), totalCost.toFixed(2));
        } else {
          await storage.updateWalletBalanceCostData(wbId, "0", "0");
        }
        recalculated++;
      }

      res.json({
        message: `Deleted ${yahooCsvLots.length} Yahoo CSV lots, recalculated cost data for ${recalculated} wallet balances`,
        deleted: yahooCsvLots.length,
        walletsRecalculated: recalculated,
      });
    } catch (error) {
      console.error("Remove Yahoo CSV lots error:", error);
      res.status(500).json({ message: "Failed to remove Yahoo CSV lots" });
    }
  });

  app.post("/api/reconcile/delete-yahoo-positions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingAccounts = await storage.getAccountsByUser(userId);
      const yahooAccount = existingAccounts.find(a => a.provider === "yahoo_import");
      if (!yahooAccount) {
        return res.status(404).json({ message: "No Yahoo Finance Import account found" });
      }

      const allPositions = await storage.getPositionsByUser(userId);
      const yahooPositions = allPositions.filter(p => p.accountId === yahooAccount.id);

      let deleted = 0;
      for (const pos of yahooPositions) {
        await storage.deletePosition(pos.id);
        deleted++;
      }

      res.json({
        message: `Deleted ${deleted} Yahoo Finance Import positions`,
        deleted,
        accountId: yahooAccount.id,
      });
    } catch (error) {
      console.error("Delete Yahoo positions error:", error);
      res.status(500).json({ message: "Failed to delete Yahoo positions" });
    }
  });

  app.post("/api/positions/merge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { keepId, removeId } = req.body;
      if (!keepId || !removeId || keepId === removeId) {
        return res.status(400).json({ message: "Provide two different position IDs" });
      }
      const positionsData = await storage.getPositionsByUser(userId);
      const keep = positionsData.find(p => p.id === keepId);
      const remove = positionsData.find(p => p.id === removeId);
      if (!keep || !remove) {
        return res.status(404).json({ message: "One or both positions not found" });
      }
      if (keep.userId !== userId || remove.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (keep.assetSymbol.toUpperCase() !== remove.assetSymbol.toUpperCase()) {
        return res.status(400).json({ message: "Cannot merge positions with different asset symbols" });
      }
      const keepQty = parseFloat(keep.quantity);
      const removeQty = parseFloat(remove.quantity);
      const keepCost = parseFloat(keep.totalCostBasis);
      const removeCost = parseFloat(remove.totalCostBasis);
      const newQty = keepQty + removeQty;
      const newCostBasis = keepCost + removeCost;
      const newAvgCost = newQty > 0 ? newCostBasis / newQty : 0;
      await storage.updatePosition(keepId, {
        quantity: newQty.toString(),
        averageCost: newAvgCost.toString(),
        totalCostBasis: newCostBasis.toFixed(2),
      });
      await storage.deletePosition(removeId);
      res.json({ message: `Merged into ${keep.assetSymbol} — combined ${newQty} units`, positionId: keepId });
    } catch (error) {
      console.error("Merge positions error:", error);
      res.status(500).json({ message: "Failed to merge positions" });
    }
  });

  app.post("/api/positions/distribute-lots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { importPositionId } = req.body;
      if (!importPositionId) {
        return res.status(400).json({ message: "importPositionId is required" });
      }

      const positionsData = await storage.getPositionsByUser(userId);
      const importPos = positionsData.find(p => p.id === importPositionId && p.userId === userId);
      if (!importPos) {
        return res.status(404).json({ message: "Import position not found" });
      }

      const symbol = importPos.assetSymbol.toUpperCase();
      const importAccount = importPos.accountId;
      const allTxns = await storage.getTransactionsByUser(userId);
      const importTxns = allTxns.filter(t => t.accountId === importAccount && t.assetSymbol.toUpperCase() === symbol);
      const txnIds = new Set(importTxns.map(t => t.id));

      const allLots = await storage.getTaxLotsByUser(userId);
      const importLots = allLots.filter(l =>
        l.assetSymbol.toUpperCase() === symbol &&
        l.transactionId && txnIds.has(l.transactionId)
      ).sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());

      if (importLots.length === 0) {
        return res.json({ message: "No import lots found to distribute", distributed: [] });
      }

      const userWallets = await storage.getWalletsByUser(userId);
      const allBalances = await storage.getWalletBalancesByUser(userId);
      const walletBalanceEntries = allBalances.filter(b =>
        b.assetSymbol.toUpperCase() === symbol
      );

      const targets: Array<{ walletBalanceId: string; walletLabel: string; capacity: number }> = [];
      for (const wb of walletBalanceEntries) {
        const wallet = userWallets.find(w => w.id === wb.walletId);
        if (!wallet) continue;
        const existingLots = allLots.filter(l => l.walletBalanceId === wb.id);
        const alreadyAssigned = existingLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity), 0);
        const liveBalance = parseFloat(wb.balance);
        const remaining = Math.max(0, liveBalance - alreadyAssigned);
        if (remaining > 0.0001) {
          targets.push({
            walletBalanceId: wb.id,
            walletLabel: wallet.label || wallet.chain,
            capacity: remaining,
          });
        }
      }

      const distributed: Array<{ lotId: string; targetWallet: string; quantity: number }> = [];
      const touchedBalanceIds = new Set<string>();
      let lotIdx = 0;

      for (const target of targets) {
        let filled = 0;
        while (lotIdx < importLots.length && filled < target.capacity - 0.0001) {
          const lot = importLots[lotIdx];
          const lotQty = parseFloat(lot.originalQuantity);
          const spaceLeft = target.capacity - filled;

          if (lotQty <= spaceLeft + 0.0001) {
            await storage.updateTaxLot(lot.id, {
              walletBalanceId: target.walletBalanceId,
              transactionId: null,
            });
            distributed.push({ lotId: lot.id, targetWallet: target.walletLabel, quantity: lotQty });
            touchedBalanceIds.add(target.walletBalanceId);
            filled += lotQty;
            lotIdx++;
          } else {
            break;
          }
        }
      }

      for (const wbId of touchedBalanceIds) {
        const lots = await storage.getTaxLotsByWalletBalance(userId, wbId);
        const totalCost = lots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
        const totalQty = lots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
        const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
        await storage.updateWalletBalanceCostData(wbId, avgCost.toFixed(8), totalCost.toFixed(2));
      }

      const remainingImportLots = importLots.length - lotIdx;
      if (remainingImportLots === 0) {
        await storage.deletePosition(importPositionId);
      }

      res.json({
        message: `Distributed ${distributed.length} lots across ${touchedBalanceIds.size} wallet(s)`,
        distributed,
        remainingLots: remainingImportLots,
        importRemoved: remainingImportLots === 0,
      });
    } catch (error) {
      console.error("Distribute lots error:", error);
      res.status(500).json({ message: "Failed to distribute lots" });
    }
  });

  app.post("/api/lots/auto-distribute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allLots = await storage.getTaxLotsByUser(userId);
      const allBalances = await storage.getWalletBalancesByUser(userId);
      const userWallets = await storage.getWalletsByUser(userId);

      const unassigned = allLots.filter(l => !l.walletBalanceId && parseFloat(l.remainingQuantity) > 0);
      const bySymbol: Record<string, typeof unassigned> = {};
      for (const lot of unassigned) {
        const sym = lot.assetSymbol.toUpperCase();
        if (!bySymbol[sym]) bySymbol[sym] = [];
        bySymbol[sym].push(lot);
      }
      for (const sym of Object.keys(bySymbol)) {
        bySymbol[sym].sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());
      }

      let totalDistributed = 0;
      const touchedBalanceIds = new Set<string>();
      const details: Array<{ symbol: string; wallet: string; lotsAssigned: number; qtyAssigned: number }> = [];

      for (const [sym, lots] of Object.entries(bySymbol)) {
        const matchingBalances = allBalances
          .filter(b => b.assetSymbol.toUpperCase() === sym)
          .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

        let lotIdx = 0;
        for (const wb of matchingBalances) {
          const wallet = userWallets.find((w: any) => w.id === wb.walletId);
          const existingAssigned = allLots
            .filter(l => l.walletBalanceId === wb.id)
            .reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
          const capacity = Math.max(0, parseFloat(wb.balance) - existingAssigned);
          if (capacity < 0.0001) continue;

          let filled = 0;
          let lotsForWallet = 0;
          while (lotIdx < lots.length && filled < capacity - 0.0001) {
            const lot = lots[lotIdx];
            const lotQty = parseFloat(lot.remainingQuantity);
            const spaceLeft = capacity - filled;
            if (lotQty <= spaceLeft + 0.0001) {
              await storage.updateTaxLot(lot.id, { walletBalanceId: wb.id });
              filled += lotQty;
              lotsForWallet++;
              totalDistributed++;
              touchedBalanceIds.add(wb.id);
              lotIdx++;
            } else if (spaceLeft >= 0.0001) {
              const splitQty = Math.min(spaceLeft, lotQty);
              await storage.createTaxLot({
                userId,
                walletBalanceId: wb.id,
                assetSymbol: lot.assetSymbol,
                acquiredDate: new Date(lot.acquiredDate),
                originalQuantity: splitQty.toFixed(8),
                remainingQuantity: splitQty.toFixed(8),
                costBasisPerUnit: lot.costBasisPerUnit,
                transactionId: lot.transactionId || undefined,
                acquisitionType: (lot as Record<string, unknown>).acquisitionType as string || undefined,
                note: (lot as Record<string, unknown>).note as string || undefined,
              });
              await storage.updateTaxLot(lot.id, {
                remainingQuantity: (lotQty - splitQty).toFixed(8),
                originalQuantity: (parseFloat(lot.originalQuantity) - splitQty).toFixed(8),
              });
              filled += splitQty;
              lotsForWallet++;
              totalDistributed++;
              touchedBalanceIds.add(wb.id);
              break;
            } else {
              break;
            }
          }
          if (lotsForWallet > 0) {
            details.push({ symbol: sym, wallet: wallet?.label || wallet?.chain || "Unknown", lotsAssigned: lotsForWallet, qtyAssigned: filled });
          }
        }
      }

      for (const wbId of touchedBalanceIds) {
        const wbLots = await storage.getTaxLotsByWalletBalance(userId, wbId);
        const totalCost = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
        const totalQty = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
        const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
        await storage.updateWalletBalanceCostData(wbId, avgCost.toFixed(8), totalCost.toFixed(2));
      }

      const remainingUnassigned = allLots.filter(l => !l.walletBalanceId && parseFloat(l.remainingQuantity) > 0).length;

      res.json({
        message: `Distributed ${totalDistributed} lots across ${touchedBalanceIds.size} wallet balance(s)`,
        totalDistributed,
        walletsUpdated: touchedBalanceIds.size,
        remainingUnassigned: unassigned.length - totalDistributed,
        details,
      });
    } catch (error) {
      console.error("Auto-distribute lots error:", error);
      res.status(500).json({ message: "Failed to auto-distribute lots" });
    }
  });

  app.post("/api/positions/resolve-to-wallet", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { removePositionId, walletBalanceId } = req.body;
      if (!removePositionId || !walletBalanceId) {
        return res.status(400).json({ message: "Provide removePositionId and walletBalanceId" });
      }

      const positionsData = await storage.getPositionsByUser(userId);
      const removePos = positionsData.find(p => p.id === removePositionId && p.userId === userId);
      if (!removePos) {
        return res.status(404).json({ message: "Import position not found" });
      }

      const balances = await storage.getWalletBalancesByUser(userId);
      const walletBal = balances.find(b => b.id === walletBalanceId);
      if (!walletBal) {
        return res.status(404).json({ message: "Wallet balance not found" });
      }

      const importAccount = removePos.accountId;
      const allTxns = await storage.getTransactionsByUser(userId);
      const importTxns = allTxns.filter(t => t.accountId === importAccount && t.assetSymbol.toUpperCase() === removePos.assetSymbol.toUpperCase());
      const txnIds = new Set(importTxns.map(t => t.id));

      const allLots = await storage.getTaxLotsByUser(userId);
      const matchingLots = allLots.filter(l =>
        l.assetSymbol.toUpperCase() === removePos.assetSymbol.toUpperCase() &&
        l.transactionId && txnIds.has(l.transactionId)
      );

      let transferred = 0;
      for (const lot of matchingLots) {
        await storage.updateTaxLot(lot.id, {
          walletBalanceId: walletBalanceId,
          transactionId: null,
        });
        transferred++;
      }

      const updatedLots = await storage.getTaxLotsByWalletBalance(userId, walletBalanceId);
      const totalCost = updatedLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = updatedLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      await storage.updateWalletBalanceCostData(walletBalanceId, avgCost.toFixed(8), totalCost.toFixed(2));

      await storage.deletePosition(removePositionId);

      res.json({
        message: `Resolved: transferred ${transferred} purchase lots to wallet`,
        lotsTransferred: transferred,
        totalCostBasis: totalCost.toFixed(2),
        averageCost: avgCost.toFixed(8),
      });
    } catch (error) {
      console.error("Resolve to wallet error:", error);
      res.status(500).json({ message: "Failed to resolve position" });
    }
  });

  app.post("/api/positions/bulk-remove-non-crypto", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      if (tier !== "pro") {
        return res.status(403).json({ message: "Admin only" });
      }

      const NON_CRYPTO_SYMBOLS = new Set([
        "GE", "JMIA", "QS", "ASTS", "KSCP", "CSCO", "ARLO", "PFE", "ABBV",
        "VTI", "NIO", "IVV", "CNQ", "TXT", "MO", "FDN", "PLTR", "QBTS",
        "SEV", "AIEQ", "ICLN", "ROBO", "NVDA", "AGNMF", "ACHR", "SNDL",
        "UL", "UAMY", "AAPL", "VGT", "VWO", "VT", "HD", "NFLX", "SOCL",
        "PYXS", "BIGZ", "ATYR", "LIDR", "INSP",
        "ALLY-CD", "ALLY-SAVE", "MORGANSTAN-BOND", "MORGANSTAN-INVEST",
        "MORGANSTAN-MM", "KINECTAFED-SAVE", "NAVYFEDERA-CHK",
        "NAVYFEDERA-SAVE", "ROBINHOOD-INVEST",
        "USD-CREDIT", "CRC", "STGC",
      ]);

      const allPositions = await storage.getPositionsByUser(userId);
      const toRemove = allPositions.filter(p => NON_CRYPTO_SYMBOLS.has(p.assetSymbol));

      if (req.body?.dryRun) {
        return res.json({
          dryRun: true,
          count: toRemove.length,
          symbols: toRemove.map(p => ({
            symbol: p.assetSymbol,
            costBasis: p.totalCostBasis,
            quantity: p.quantity,
          })),
        });
      }

      let removed = 0;
      for (const pos of toRemove) {
        await storage.deletePosition(pos.id);
        removed++;
      }

      console.log(`[cleanup] Removed ${removed} non-crypto positions for user ${userId}`);
      res.json({
        removed,
        symbols: toRemove.map(p => p.assetSymbol),
      });
    } catch (error) {
      console.error("Bulk remove error:", error);
      res.status(500).json({ message: "Failed to remove non-crypto positions" });
    }
  });

  app.delete("/api/positions/by-symbol/:symbol", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const symbol = decodeURIComponent(req.params.symbol).toUpperCase();
      const positionsData = await storage.getPositionsByUser(userId);
      const position = positionsData.find(p => p.assetSymbol === symbol);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }
      await storage.deletePosition(position.id);
      res.json({ message: `Removed ${symbol} from portfolio` });
    } catch (error) {
      console.error("Delete position by symbol error:", error);
      res.status(500).json({ message: "Failed to remove position" });
    }
  });

  app.delete("/api/positions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const positionsData = await storage.getPositionsByUser(userId);
      const position = positionsData.find(p => p.id === id);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }
      if (position.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deletePosition(id);
      res.json({ message: `Removed ${position.assetSymbol} position` });
    } catch (error) {
      console.error("Delete position error:", error);
      res.status(500).json({ message: "Failed to delete position" });
    }
  });

  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let txns = await storage.getTransactionsByUser(userId);

      const { tier } = await getEffectiveTier(userId);
      if (tier === "free") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        txns = txns.filter(t => new Date(t.transactionDate) >= thirtyDaysAgo);
      }

      res.json(txns);
    } catch (error) {
      console.error("Transactions error:", error);
      res.status(500).json({ message: "Failed to load transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = req.body;

      if (!data.assetSymbol || !data.transactionType || !data.quantity || !data.pricePerUnit || !data.transactionDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const qty = parseFloat(data.quantity);
      const price = parseFloat(data.pricePerUnit);
      
      if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) {
        return res.status(400).json({ message: "Invalid quantity or price" });
      }

      if (data.transactionType === "sell" && data.disposalType === "swap") {
        const swapToQtyNum = parseFloat(data.swapToQuantity);
        if (!data.swapToSymbol || String(data.swapToSymbol).trim() === "" || isNaN(swapToQtyNum) || swapToQtyNum <= 0) {
          return res.status(400).json({ message: "For a swap, enter the coin you received and how much of it you got." });
        }
      }

      const totalVal = qty * price;

      let accountId = data.accountId;
      if (accountId === "manual" || !accountId) {
        const existingAccounts = await storage.getAccountsByUser(userId);
        let manualAccount = existingAccounts.find(a => a.provider === "manual");
        if (!manualAccount) {
          manualAccount = await storage.createAccount({
            userId,
            credentialId: null,
            provider: "manual",
            accountName: "Manual Entry",
            accountType: "manual",
          });
        }
        accountId = manualAccount.id;
      } else {
        const account = await storage.getAccount(accountId);
        if (!account || account.userId !== userId) {
          return res.status(403).json({ message: "That account isn't linked to your profile. Pick one of your own accounts." });
        }
      }

      const upperSymbol = data.assetSymbol.toUpperCase();

      let sellMethod: "FIFO" | "LIFO" = "FIFO";
      let sellSortedLots: Awaited<ReturnType<typeof storage.getTaxLotsByAsset>> = [];
      if (data.transactionType === "sell") {
        const settings = await storage.getUserSettings(userId);
        sellMethod = settings?.taxMethod === "LIFO" ? "LIFO" : "FIFO";
        const allLots = await storage.getTaxLotsByAsset(userId, upperSymbol);
        const activeLots = allLots.filter(l => parseFloat(l.remainingQuantity) > 0);
        const available = activeLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);

        if (available <= 0.00000001) {
          return res.status(400).json({
            message: `No recorded purchases found for ${upperSymbol}. Add the buy(s) first so we can calculate the gain or loss.`,
          });
        }
        if (qty > available + 0.00000001) {
          return res.status(400).json({
            message: `You're recording a sale of ${qty} ${upperSymbol}, but only ${available} is tracked from your recorded purchases. Record the missing buy(s) first, or reduce the amount.`,
          });
        }
        sellSortedLots = sellMethod === "LIFO"
          ? [...activeLots].sort((a, b) => new Date(b.acquiredDate).getTime() - new Date(a.acquiredDate).getTime())
          : [...activeLots].sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());
      }

      const transaction = await storage.createTransaction({
        userId,
        accountId,
        assetSymbol: upperSymbol,
        transactionType: data.transactionType,
        quantity: qty.toString(),
        pricePerUnit: price.toString(),
        totalValue: totalVal.toFixed(2),
        fee: data.fee || "0",
        transactionDate: safeServerDate(data.transactionDate),
        notes: data.notes,
      });

      const existingPosition = await storage.getPositionByUserAndAsset(
        userId,
        accountId,
        data.assetSymbol.toUpperCase()
      );

      if (data.transactionType === "buy" || data.transactionType === "income") {
        if (existingPosition) {
          const existingQty = parseFloat(existingPosition.quantity);
          const existingCostBasis = parseFloat(existingPosition.totalCostBasis);
          const newQty = existingQty + qty;
          const newCostBasis = existingCostBasis + totalVal;
          const newAvgCost = newCostBasis / newQty;

          await storage.updatePosition(existingPosition.id, {
            quantity: newQty.toString(),
            averageCost: newAvgCost.toString(),
            totalCostBasis: newCostBasis.toString(),
          });
        } else {
          await storage.createPosition({
            userId,
            accountId,
            assetSymbol: data.assetSymbol.toUpperCase(),
            quantity: qty.toString(),
            averageCost: price.toString(),
            totalCostBasis: totalVal.toFixed(2),
          });
        }

        await storage.createTaxLot({
          userId,
          transactionId: transaction.id,
          assetSymbol: data.assetSymbol.toUpperCase(),
          acquiredDate: safeServerDate(data.transactionDate),
          originalQuantity: qty.toString(),
          remainingQuantity: qty.toString(),
          costBasisPerUnit: price.toString(),
        });
      } else if (data.transactionType === "sell") {
        const sellDate = safeServerDate(data.transactionDate);
        const disposalType =
          data.disposalType === "swap" ? "swap" : data.disposalType === "send" ? "send" : "sale";

        const oneYear = 365 * 24 * 60 * 60 * 1000;
        let remaining = qty;
        let consumedCostBasis = 0;
        for (const lot of sellSortedLots) {
          if (remaining <= 0.00000001) break;
          const lotRemaining = parseFloat(lot.remainingQuantity);
          if (lotRemaining <= 0) continue;

          const sellFromLot = Math.min(remaining, lotRemaining);
          const proceeds = sellFromLot * price;
          const costBasis = sellFromLot * parseFloat(lot.costBasisPerUnit);
          const gainLoss = proceeds - costBasis;
          const acquiredDate = new Date(lot.acquiredDate);
          const isLongTerm = (sellDate.getTime() - acquiredDate.getTime()) >= oneYear;

          await storage.createGainEvent({
            userId,
            sellTransactionId: transaction.id,
            taxLotId: lot.id,
            assetSymbol: upperSymbol,
            quantity: sellFromLot.toString(),
            proceeds: proceeds.toFixed(2),
            costBasis: costBasis.toFixed(2),
            gainLoss: gainLoss.toFixed(2),
            isLongTerm,
            taxMethod: sellMethod,
            soldDate: sellDate,
            acquiredDate,
            disposalType,
            disposalNote: data.notes || undefined,
          });

          await storage.updateTaxLot(lot.id, {
            remainingQuantity: (lotRemaining - sellFromLot).toFixed(8),
          });

          if (lot.walletBalanceId) {
            const wbLots = await storage.getTaxLotsByWalletBalance(userId, lot.walletBalanceId);
            const totalRem = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
            const totalCb = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
            const avg = totalRem > 0 ? totalCb / totalRem : 0;
            await storage.updateWalletBalanceCostData(lot.walletBalanceId, avg.toFixed(8), totalCb.toFixed(2));
          }

          consumedCostBasis += costBasis;
          remaining -= sellFromLot;
        }

        if (existingPosition) {
          const existingQty = parseFloat(existingPosition.quantity);
          const existingCostBasis = parseFloat(existingPosition.totalCostBasis);
          const newQty = Math.max(0, existingQty - qty);
          const newCostBasis = Math.max(0, existingCostBasis - consumedCostBasis);
          const newAvgCost = newQty > 0 ? newCostBasis / newQty : 0;

          if (newQty <= 0.00000001) {
            await storage.deletePosition(existingPosition.id);
          } else {
            await storage.updatePosition(existingPosition.id, {
              quantity: newQty.toString(),
              averageCost: newAvgCost.toString(),
              totalCostBasis: newCostBasis.toFixed(2),
            });
          }
        }

        if (disposalType === "swap" && data.swapToSymbol && data.swapToQuantity) {
          const toSym = String(data.swapToSymbol).toUpperCase().trim();
          const toQty = parseFloat(data.swapToQuantity);
          if (toSym && toSym.length <= 20 && !isNaN(toQty) && toQty > 0) {
            const toCostBasis = totalVal;
            const toPrice = toQty > 0 ? toCostBasis / toQty : 0;

            const toTxn = await storage.createTransaction({
              userId,
              accountId,
              assetSymbol: toSym,
              transactionType: "buy",
              quantity: toQty.toString(),
              pricePerUnit: toPrice.toString(),
              totalValue: toCostBasis.toFixed(2),
              fee: "0",
              transactionDate: sellDate,
              notes: `Received from swapping ${qty} ${upperSymbol}`,
            });

            const toPosition = await storage.getPositionByUserAndAsset(userId, accountId, toSym);
            if (toPosition) {
              const eq = parseFloat(toPosition.quantity);
              const ec = parseFloat(toPosition.totalCostBasis);
              const nq = eq + toQty;
              const nc = ec + toCostBasis;
              await storage.updatePosition(toPosition.id, {
                quantity: nq.toString(),
                averageCost: (nq > 0 ? nc / nq : 0).toString(),
                totalCostBasis: nc.toFixed(2),
              });
            } else {
              await storage.createPosition({
                userId,
                accountId,
                assetSymbol: toSym,
                quantity: toQty.toString(),
                averageCost: toPrice.toString(),
                totalCostBasis: toCostBasis.toFixed(2),
              });
            }

            await storage.createTaxLot({
              userId,
              transactionId: toTxn.id,
              assetSymbol: toSym,
              acquiredDate: sellDate,
              originalQuantity: toQty.toString(),
              remainingQuantity: toQty.toString(),
              costBasisPerUnit: toPrice.toString(),
            });
          }
        }
      }

      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.patch("/api/transactions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tx = await storage.getTransaction(req.params.id);
      if (!tx || tx.userId !== userId) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const txAccount = await storage.getAccount(tx.accountId);
      const txProvider = txAccount?.provider || "manual";
      if (txProvider !== "manual" && !txProvider.endsWith("_import")) {
        return res.status(400).json({
          message: "Only manual and imported entries can be edited here. On-chain wallet activity reflects the blockchain and can't be changed.",
        });
      }

      if (tx.transactionType !== "buy" && tx.transactionType !== "income") {
        return res.status(400).json({
          message:
            tx.transactionType === "sell"
              ? "To change a sale, please delete it and add it again — that keeps your gain and loss calculations correct."
              : "This type of entry can't be edited here. Delete it and add a new one instead.",
        });
      }

      const data = req.body;
      if (!data.quantity || !data.pricePerUnit || !data.transactionDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const newQty = parseFloat(data.quantity);
      const newPrice = parseFloat(data.pricePerUnit);
      if (isNaN(newQty) || isNaN(newPrice) || newQty <= 0 || newPrice < 0) {
        return res.status(400).json({ message: "Invalid quantity or price" });
      }
      const newTotal = newQty * newPrice;
      const newDate = safeServerDate(data.transactionDate);

      const lots = await storage.getTaxLotsByAsset(userId, tx.assetSymbol);
      const lot = lots.find((l) => l.transactionId === tx.id);
      if (lot && parseFloat(lot.remainingQuantity) < parseFloat(lot.originalQuantity) - 0.00000001) {
        return res.status(400).json({
          message: "This purchase is already matched to a sale you recorded. Delete that sale first, then edit this purchase.",
        });
      }

      const oldQty = parseFloat(tx.quantity);
      const oldTotal = parseFloat(tx.totalValue);

      const updated = await storage.updateTransaction(tx.id, {
        quantity: newQty.toString(),
        pricePerUnit: newPrice.toString(),
        totalValue: newTotal.toFixed(2),
        transactionDate: newDate,
        notes: data.notes ?? tx.notes,
      });

      if (lot) {
        await storage.updateTaxLot(lot.id, {
          originalQuantity: newQty.toString(),
          remainingQuantity: newQty.toString(),
          costBasisPerUnit: newPrice.toString(),
          acquiredDate: newDate,
        });
      }

      const position = await storage.getPositionByUserAndAsset(userId, tx.accountId, tx.assetSymbol);
      if (position) {
        const posQty = parseFloat(position.quantity) - oldQty + newQty;
        const posCost = parseFloat(position.totalCostBasis) - oldTotal + newTotal;
        if (posQty <= 0.00000001) {
          await storage.deletePosition(position.id);
        } else {
          await storage.updatePosition(position.id, {
            quantity: posQty.toString(),
            averageCost: (posCost / posQty).toString(),
            totalCostBasis: posCost.toFixed(2),
          });
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tx = await storage.getTransaction(req.params.id);
      if (!tx || tx.userId !== userId) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const txAccount = await storage.getAccount(tx.accountId);
      const txProvider = txAccount?.provider || "manual";
      if (txProvider !== "manual" && !txProvider.endsWith("_import")) {
        return res.status(400).json({
          message: "Only manual and imported entries can be deleted here. On-chain wallet activity reflects the blockchain and can't be changed.",
        });
      }

      const qty = parseFloat(tx.quantity);

      if (tx.transactionType === "buy" || tx.transactionType === "income") {
        const lots = await storage.getTaxLotsByAsset(userId, tx.assetSymbol);
        const lot = lots.find((l) => l.transactionId === tx.id);
        if (lot && parseFloat(lot.remainingQuantity) < parseFloat(lot.originalQuantity) - 0.00000001) {
          return res.status(400).json({
            message: "This purchase is already matched to a sale you recorded. Delete that sale first, then remove this purchase.",
          });
        }
        if (lot) {
          await storage.deleteTaxLot(lot.id);
        }

        const position = await storage.getPositionByUserAndAsset(userId, tx.accountId, tx.assetSymbol);
        if (position) {
          const posQty = parseFloat(position.quantity) - qty;
          const posCost = parseFloat(position.totalCostBasis) - parseFloat(tx.totalValue);
          if (posQty <= 0.00000001) {
            await storage.deletePosition(position.id);
          } else {
            await storage.updatePosition(position.id, {
              quantity: posQty.toString(),
              averageCost: (Math.max(0, posCost) / posQty).toString(),
              totalCostBasis: Math.max(0, posCost).toFixed(2),
            });
          }
        }
      } else if (tx.transactionType === "sell") {
        const allLots = await storage.getTaxLotsByUser(userId);
        const lotById = new Map(allLots.map((l) => [l.id, l]));
        const events = (await storage.getGainEventsByUser(userId)).filter(
          (g) => g.sellTransactionId === tx.id,
        );

        if (events.length === 0) {
          return res.status(409).json({
            message: "We couldn't find the gain/loss records linked to this sale, so deleting it could throw off your holdings. It's been left in place — please reach out before removing it.",
          });
        }

        let restoredQty = 0;
        let restoredCost = 0;
        for (const ev of events) {
          const lot = lotById.get(ev.taxLotId);
          if (lot) {
            await storage.updateTaxLot(lot.id, {
              remainingQuantity: (parseFloat(lot.remainingQuantity) + parseFloat(ev.quantity)).toFixed(8),
            });
            if (lot.walletBalanceId) {
              const wbLots = await storage.getTaxLotsByWalletBalance(userId, lot.walletBalanceId);
              const totalRem = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
              const totalCb = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
              const avg = totalRem > 0 ? totalCb / totalRem : 0;
              await storage.updateWalletBalanceCostData(lot.walletBalanceId, avg.toFixed(8), totalCb.toFixed(2));
            }
          }
          restoredQty += parseFloat(ev.quantity);
          restoredCost += parseFloat(ev.costBasis);
          await storage.deleteGainEvent(ev.id);
        }

        const position = await storage.getPositionByUserAndAsset(userId, tx.accountId, tx.assetSymbol);
        if (position) {
          const posQty = parseFloat(position.quantity) + restoredQty;
          const posCost = parseFloat(position.totalCostBasis) + restoredCost;
          await storage.updatePosition(position.id, {
            quantity: posQty.toString(),
            averageCost: posQty > 0 ? (posCost / posQty).toString() : "0",
            totalCostBasis: posCost.toFixed(2),
          });
        } else if (restoredQty > 0.00000001) {
          await storage.createPosition({
            userId,
            accountId: tx.accountId,
            assetSymbol: tx.assetSymbol,
            quantity: restoredQty.toString(),
            averageCost: (restoredCost / restoredQty).toString(),
            totalCostBasis: restoredCost.toFixed(2),
          });
        }
      }

      await storage.deleteTransaction(tx.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // clearGainEventsForSell now lives in ../services/transfer-reconciliation
  // (shared with the self-correcting transfer reconciler) and is imported above.

  // realizeSellGains now lives in ../services/transfer-reconciliation (shared with
  // smart-memory auto-application at sync time) and is used via resolveReviewWithMemory.

  // The user labels an outgoing transfer that the auto-sync held for review.
  // "sale" / "swap" keep it as a taxable disposal; "own_transfer" / "vault_deposit"
  // reclassify it as a non-taxable transfer so it never counts as a gain.
  app.post("/api/transactions/:id/resolve-review", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tx = await storage.getTransaction(req.params.id);
      if (!tx || tx.userId !== userId) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (tx.reviewStatus !== "pending") {
        return res.status(400).json({ message: "This transaction isn't waiting for review." });
      }

      const category = String(req.body?.category || "");
      const allowed = ["sale", "swap", "own_transfer", "vault_deposit"];
      if (!allowed.includes(category)) {
        return res.status(400).json({ message: "Pick how to label this transfer." });
      }

      // Smart memory: apply the label to this transfer, remember the destination
      // address for future syncs, and apply the same label to every other transfer
      // still waiting for review that went to the same address.
      const { alsoApplied } = await resolveReviewWithMemory(
        userId,
        tx,
        category as "sale" | "swap" | "own_transfer" | "vault_deposit",
      );

      res.json({ success: true, alsoApplied });
    } catch (error) {
      console.error("Resolve review error:", error);
      res.status(500).json({ message: "Failed to update this transaction" });
    }
  });

  // One-time cleanup: take every auto-synced/imported outgoing "sale" still counting
  // as taxable and HOLD it for review instead, wiping the phantom gain events it
  // created. This fixes historical data created before the auto-sync was corrected.
  app.post("/api/transactions/flag-imported-sells", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const txns = await storage.getTransactionsByUser(userId);
      const imported = txns.filter(
        (t) =>
          t.transactionType === "sell" &&
          t.reviewStatus !== "pending" &&
          typeof t.notes === "string" &&
          (t.notes.startsWith("Imported from") || t.notes.includes("(auto-synced)")),
      );

      let flagged = 0;
      for (const t of imported) {
        await clearGainEventsForSell(userId, t.id);
        await storage.updateTransaction(t.id, { reviewStatus: "pending" });
        flagged++;
      }

      res.json({ success: true, flagged });
    } catch (error) {
      console.error("Flag imported sells error:", error);
      res.status(500).json({ message: "Failed to flag imported sales for review" });
    }
  });

  app.get("/api/transactions/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const txns = await storage.getTransactionsByUser(userId);
      
      const headers = ["Date", "Type", "Asset", "Quantity", "Price", "Total", "Fee", "Notes"];
      const rows = txns.map((tx) => [
        new Date(tx.transactionDate).toISOString().split("T")[0],
        tx.transactionType,
        tx.assetSymbol,
        tx.quantity,
        tx.pricePerUnit,
        tx.totalValue,
        tx.fee || "0",
        tx.notes || "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
      res.send(csv);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  app.get("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accts = await storage.getAccountsByUser(userId);
      res.json(accts);
    } catch (error) {
      console.error("Accounts error:", error);
      res.status(500).json({ message: "Failed to load accounts" });
    }
  });

  app.delete("/api/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const account = await storage.getAccount(id);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }
      await storage.deleteAccountWithData(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.post("/api/positions/manual", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetSymbol, quantity, costPerUnit, currentPrice, location } = req.body;

      if (!assetSymbol || !quantity) {
        return res.status(400).json({ message: "Asset symbol and quantity are required" });
      }

      const sym = String(assetSymbol).toUpperCase().trim();
      if (!sym || sym.length > 20) {
        return res.status(400).json({ message: "Invalid asset symbol" });
      }

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }

      const cost = costPerUnit ? parseFloat(costPerUnit) : 0;
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ message: "Cost per unit must be a valid number" });
      }

      const price = currentPrice ? parseFloat(currentPrice) : 0;
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ message: "Current price must be a valid number" });
      }

      const accountName = location ? String(location).trim().substring(0, 100) : "Manual Entry";

      const existingAccounts = await storage.getAccountsByUser(userId);
      let account = existingAccounts.find(a => a.provider === "manual" && a.accountName === accountName);
      if (!account) {
        account = await storage.createAccount({
          userId,
          credentialId: null,
          provider: "manual",
          accountName,
          accountType: "manual",
        });
      }

      const totalCostBasis = qty * cost;

      const existingPosition = await storage.getPositionByUserAndAsset(userId, account.id, sym);
      if (existingPosition) {
        const existingQty = parseFloat(existingPosition.quantity);
        const existingCost = parseFloat(existingPosition.totalCostBasis);
        const newQty = existingQty + qty;
        const newCostBasis = existingCost + totalCostBasis;
        const newAvgCost = newQty > 0 ? newCostBasis / newQty : 0;
        await storage.updatePosition(existingPosition.id, {
          quantity: newQty.toString(),
          averageCost: newAvgCost.toString(),
          totalCostBasis: newCostBasis.toFixed(2),
        });
      } else {
        await storage.createPosition({
          userId,
          accountId: account.id,
          assetSymbol: sym,
          quantity: qty.toString(),
          averageCost: cost.toString(),
          totalCostBasis: totalCostBasis.toFixed(2),
        });
      }

      const acquiredDate = safeServerDate(new Date());
      const buyTxn = await storage.createTransaction({
        userId,
        accountId: account.id,
        assetSymbol: sym,
        transactionType: "buy",
        quantity: qty.toString(),
        pricePerUnit: cost.toString(),
        totalValue: totalCostBasis.toFixed(2),
        fee: "0",
        transactionDate: acquiredDate,
        notes: "Added from Portfolio",
      });

      await storage.createTaxLot({
        userId,
        transactionId: buyTxn.id,
        assetSymbol: sym,
        acquiredDate,
        originalQuantity: qty.toString(),
        remainingQuantity: qty.toString(),
        costBasisPerUnit: cost.toString(),
      });

      res.json({ success: true, message: `Added ${qty} ${sym} to ${accountName}` });
    } catch (error) {
      console.error("Manual position error:", error);
      res.status(500).json({ message: "Failed to add manual position" });
    }
  });

  app.patch("/api/positions/:id/addressed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { addressed } = req.body;
      const position = await storage.getPositionsByUser(userId);
      const pos = position.find(p => p.id === id);
      if (!pos) {
        return res.status(404).json({ message: "Position not found" });
      }
      await storage.markPositionAddressed(id, addressed);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark addressed error:", error);
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.get("/api/lot-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allLots = await storage.getTaxLotsByUser(userId);
      const summary: Record<string, {
        totalOriginal: number; totalRemaining: number; totalCostBasis: number; lotCount: number;
        lots: Array<{ id: string; acquiredDate: string; originalQuantity: string; remainingQuantity: string; costBasisPerUnit: string; note: string | null; acquisitionType: string | null; walletBalanceId: string | null }>;
      }> = {};
      for (const lot of allLots) {
        const sym = lot.assetSymbol.toUpperCase();
        if (!summary[sym]) summary[sym] = { totalOriginal: 0, totalRemaining: 0, totalCostBasis: 0, lotCount: 0, lots: [] };
        const origQty = parseFloat(lot.originalQuantity);
        const remQty = parseFloat(lot.remainingQuantity);
        const cost = parseFloat(lot.costBasisPerUnit);
        summary[sym].totalOriginal += origQty;
        summary[sym].totalRemaining += remQty;
        summary[sym].totalCostBasis += origQty * cost;
        summary[sym].lotCount++;
        summary[sym].lots.push({
          id: lot.id,
          acquiredDate: lot.acquiredDate instanceof Date ? lot.acquiredDate.toISOString() : String(lot.acquiredDate),
          originalQuantity: lot.originalQuantity,
          remainingQuantity: lot.remainingQuantity,
          costBasisPerUnit: lot.costBasisPerUnit,
          note: lot.note || null,
          acquisitionType: lot.acquisitionType || null,
          walletBalanceId: lot.walletBalanceId || null,
        });
      }
      for (const sym of Object.keys(summary)) {
        summary[sym].lots.sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());
      }
      res.json(summary);
    } catch (error) {
      console.error("Lot summary error:", error);
      res.status(500).json({ message: "Failed to get lot summary" });
    }
  });

}
