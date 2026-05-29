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

export function registerLegacyRoutes(app: Express) {
  app.patch("/api/wallets/:id/label", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      const { label } = req.body;
      if (!label || typeof label !== "string" || label.trim().length === 0) {
        return res.status(400).json({ message: "Label is required" });
      }
      await storage.updateWalletLabel(req.params.id, label.trim());
      if (wallet.chain === "xrp") {
        try {
          const { xamanConnections } = await import("@shared/schema");
          const userConns = await db.select().from(xamanConnections).where(eq(xamanConnections.userId, userId));
          const matchingConn = userConns.find(c => c.xrpAddress.toLowerCase() === wallet.address.toLowerCase());
          if (matchingConn) {
            await db.update(xamanConnections).set({ accountLabel: label.trim() }).where(eq(xamanConnections.id, matchingConn.id));
          }
        } catch (syncErr) {
          console.error("[wallet-rename] xaman sync error:", syncErr);
        }
      }
      res.json({ message: "Wallet label updated" });
    } catch (error) {
      console.error("Rename wallet error:", error);
      res.status(500).json({ message: "Failed to rename wallet" });
    }
  });

  app.patch("/api/wallets/:id/hardware-device", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      const { hardwareDevice } = req.body;
      const validDevices = ["ledger", "cypherock", "trezor", "tangem", "coldcard", "ellipal", "keystone", "bitbox", "xaman", "metamask", "trust", "phantom", "exodus", "coinbase-wallet", "exchange", "other", ""];
      if (hardwareDevice !== undefined && !validDevices.includes(hardwareDevice)) {
        return res.status(400).json({ message: "Invalid hardware device type" });
      }
      await db.update(wallets).set({ hardwareDevice: hardwareDevice || null }).where(eq(wallets.id, req.params.id));
      res.json({ message: "Hardware device updated" });
    } catch (error) {
      console.error("Update wallet hardware device error:", error);
      res.status(500).json({ message: "Failed to update hardware device" });
    }
  });

  app.patch("/api/wallets/:id/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      const { notes } = req.body;
      if (typeof notes !== "string") {
        return res.status(400).json({ message: "Notes must be a string" });
      }
      await db.update(wallets).set({ notes: notes.trim() || null }).where(eq(wallets.id, req.params.id));
      res.json({ message: "Wallet notes updated" });
    } catch (error) {
      console.error("Update wallet notes error:", error);
      res.status(500).json({ message: "Failed to update wallet notes" });
    }
  });

  app.post("/api/wallets/auto-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWallets = await storage.getWalletsByUser(userId);
      const updated: string[] = [];

      const chainNotes: Record<string, (w: any) => string> = {
        xrp: (w) => {
          const lines = ["App: Xaman (XUMM)", "URL: https://xumm.app", "Extension: Xaman browser extension or mobile app"];
          if (w.label?.toLowerCase().includes("ledger")) lines.push("Cold wallet: Ledger Nano — connect via USB");
          return lines.join("\n");
        },
        stellar: (w) => {
          const lines = ["App: StellarTerm or Lobstr", "URL: https://stellarterm.com / https://lobstr.co", "Extension: Freighter wallet (browser extension)"];
          if (w.label?.toLowerCase().includes("ledger")) lines.push("Cold wallet: Ledger Nano — connect via USB");
          return lines.join("\n");
        },
        hedera: (w) => {
          const lines = ["App: HashPack", "URL: https://www.hashpack.app", "Extension: HashPack browser extension"];
          if (w.label?.toLowerCase().includes("stader") || w.label?.toLowerCase().includes("staking")) lines.push("Staking: Wipro node via HashPack");
          if (w.label?.toLowerCase().includes("ledger")) lines.push("Cold wallet: Ledger Nano — connect via HashPack");
          return lines.join("\n");
        },
        cardano: (w) => {
          const lines: string[] = [];
          const lbl = (w.label || "").toLowerCase();
          if (lbl.includes("adalite") || lbl.includes("ledger")) {
            lines.push("App: ADALite", "URL: https://adalite.io", "Cold wallet: Ledger Nano — connect via USB to ADALite");
            lines.push("Staking: Delegated — check pool saturation periodically");
          } else if (lbl.includes("eternl") || lbl.includes("ccvault")) {
            lines.push("App: Eternl (formerly ccvault)", "URL: https://eternl.io", "Extension: Eternl browser extension");
          } else if (lbl.includes("coinbase")) {
            lines.push("App: Coinbase", "URL: https://coinbase.com", "Note: Check if ADA staking is enabled on Coinbase");
          } else if (lbl.includes("uphold")) {
            lines.push("App: Uphold", "URL: https://uphold.com", "Note: Uphold may offer limited staking — check Earn section");
          } else {
            lines.push("App: ADALite or Eternl recommended", "URL: https://adalite.io / https://eternl.io");
          }
          return lines.join("\n");
        },
        solana: (w) => {
          const lines = ["App: Phantom or Solflare", "URL: https://phantom.app / https://solflare.com", "Extension: Phantom or Solflare browser extension"];
          if (w.label?.toLowerCase().includes("ledger")) lines.push("Cold wallet: Ledger Nano — connect via Phantom");
          return lines.join("\n");
        },
        ethereum: (w) => {
          const lines = ["App: MetaMask or Rabby", "URL: https://metamask.io", "Extension: MetaMask browser extension"];
          if (w.label?.toLowerCase().includes("ledger")) lines.push("Cold wallet: Ledger Nano — connect via MetaMask");
          return lines.join("\n");
        },
        bitcoin: (w) => {
          const lines: string[] = [];
          const lbl = (w.label || "").toLowerCase();
          if (lbl.includes("ledger") || lbl.includes("cold")) {
            lines.push("App: Ledger Live", "URL: https://ledger.com", "Cold wallet: Ledger Nano — connect via USB");
          } else if (lbl.includes("trezor")) {
            lines.push("App: Trezor Suite", "URL: https://trezor.io/trezor-suite", "Cold wallet: Trezor — connect via USB");
          } else {
            lines.push("App: Ledger Live or Electrum", "URL: https://ledger.com / https://electrum.org");
          }
          return lines.join("\n");
        },
        polkadot: (w) => ["App: Polkadot.js or Nova Wallet", "URL: https://polkadot.js.org/apps", "Extension: Polkadot.js browser extension"].join("\n"),
        cosmos: (w) => ["App: Keplr", "URL: https://wallet.keplr.app", "Extension: Keplr browser extension"].join("\n"),
        avalanche: (w) => ["App: Core Wallet", "URL: https://core.app", "Extension: Core browser extension or MetaMask"].join("\n"),
        polygon: (w) => ["App: MetaMask (Polygon network)", "URL: https://metamask.io", "Extension: MetaMask — add Polygon RPC"].join("\n"),
        algorand: (w) => ["App: Pera Wallet", "URL: https://perawallet.app", "Extension: Pera Wallet mobile app"].join("\n"),
        tron: (w) => ["App: TronLink", "URL: https://www.tronlink.org", "Extension: TronLink browser extension"].join("\n"),
        zilliqa: (w) => {
          const lines = ["App: Zillet.io", "URL: https://zillet.io", "Extension: ZilPay browser extension"];
          lines.push("Staking: Native delegation via Zillet dashboard");
          return lines.join("\n");
        },
        flare: (w) => ["App: Bifrost Wallet or MetaMask", "URL: https://bifrostwallet.com", "Extension: MetaMask — add Flare RPC (chainId 14)"].join("\n"),
        near: (w) => ["App: NEAR Wallet or MyNearWallet", "URL: https://app.mynearwallet.com", "Extension: NEAR Wallet browser extension"].join("\n"),
        cronos: (w) => ["App: Crypto.com DeFi Wallet or MetaMask", "URL: https://crypto.com", "Extension: MetaMask — add Cronos RPC"].join("\n"),
      };

      for (const w of userWallets) {
        if (w.notes && w.notes.trim().length > 0) continue;
        const generator = chainNotes[w.chain];
        if (!generator) continue;

        const balances = await storage.getWalletBalances(w.id);
        const totalBal = balances.reduce((sum, b) => sum + parseFloat(b.usdValue || "0"), 0);
        let note = generator(w);
        if (totalBal > 0) {
          note += `\nApprox value: $${totalBal.toFixed(2)}`;
        }
        const assetList = balances.filter(b => parseFloat(b.balance) > 0).map(b => `${b.assetSymbol}: ${parseFloat(b.balance).toFixed(4)}`);
        if (assetList.length > 0) {
          note += `\nHoldings: ${assetList.join(", ")}`;
        }

        await db.update(wallets).set({ notes: note }).where(eq(wallets.id, w.id));
        updated.push(w.label || w.chain);
      }

      res.json({ message: `Auto-populated notes for ${updated.length} wallets`, wallets: updated });
    } catch (error) {
      console.error("Auto-populate notes error:", error);
      res.status(500).json({ message: "Failed to auto-populate notes" });
    }
  });

  app.patch("/api/xaman-connections/:id/label", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connId = parseInt(req.params.id);
      const { label } = req.body;
      if (!label || typeof label !== "string" || label.trim().length === 0) {
        return res.status(400).json({ message: "Label is required" });
      }
      const { xamanConnections } = await import("@shared/schema");
      const [conn] = await db.select().from(xamanConnections).where(and(eq(xamanConnections.id, connId), eq(xamanConnections.userId, userId)));
      if (!conn) {
        return res.status(404).json({ message: "Connection not found" });
      }
      await db.update(xamanConnections).set({ accountLabel: label.trim() }).where(eq(xamanConnections.id, connId));
      const userWallets = await storage.getWalletsByUser(userId);
      const matchingWallet = userWallets.find(w => w.address.toLowerCase() === conn.xrpAddress.toLowerCase());
      if (matchingWallet) {
        await storage.updateWalletLabel(matchingWallet.id, label.trim());
      }
      res.json({ message: "Connection label updated" });
    } catch (error) {
      console.error("Rename xaman connection error:", error);
      res.status(500).json({ message: "Failed to rename connection" });
    }
  });

  app.post("/api/wallets/bulk-rename", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fromLabel, toLabel } = req.body;
      if (!fromLabel || !toLabel) {
        return res.status(400).json({ message: "Both fromLabel and toLabel are required" });
      }
      const userWallets = await storage.getWalletsByUser(userId);
      const matching = userWallets.filter(w => w.label?.toLowerCase() === fromLabel.toLowerCase());
      if (matching.length === 0) {
        return res.status(404).json({ message: `No wallets found with label "${fromLabel}"` });
      }
      for (const w of matching) {
        await storage.updateWalletLabel(w.id, toLabel.trim());
      }
      res.json({ message: `Renamed ${matching.length} wallets from "${fromLabel}" to "${toLabel}"` });
    } catch (error) {
      console.error("Bulk rename error:", error);
      res.status(500).json({ message: "Failed to bulk rename wallets" });
    }
  });

  app.delete("/api/wallets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      await storage.deleteWallet(wallet.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete wallet error:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  app.get("/api/user-wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const walletList = await storage.getUserWallets(userId);
      res.json(walletList);
    } catch (error) {
      console.error("Get user wallets error:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post("/api/user-wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { label, address, chain, purpose, destinationTag, isPrimary } = req.body;
      if (!label || !address || !chain) {
        return res.status(400).json({ message: "Label, address, and chain are required" });
      }
      const validPurposes = ["yield", "spending", "receiving", "savings", "trading", "general"];
      const walletPurpose = validPurposes.includes(purpose) ? purpose : "general";

      if (isPrimary) {
        const existing = await storage.getUserWallets(userId);
        for (const w of existing) {
          if (w.isPrimary) {
            await storage.updateUserWallet(w.id, { isPrimary: false });
          }
        }
      }

      const wallet = await storage.createUserWallet({
        userId,
        label,
        address: address.trim(),
        chain,
        purpose: walletPurpose,
        destinationTag: destinationTag || null,
        isPrimary: isPrimary || false,
      });
      res.json(wallet);
    } catch (error) {
      console.error("Create user wallet error:", error);
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });

  app.put("/api/user-wallets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getUserWallet(req.params.id);
      if (!wallet || wallet.userId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      const { label, address, chain, purpose, destinationTag, isPrimary } = req.body;
      const validPurposes = ["yield", "spending", "receiving", "savings", "trading", "general"];

      if (isPrimary) {
        const existing = await storage.getUserWallets(userId);
        for (const w of existing) {
          if (w.isPrimary && w.id !== wallet.id) {
            await storage.updateUserWallet(w.id, { isPrimary: false });
          }
        }
      }

      const updated = await storage.updateUserWallet(wallet.id, {
        ...(label && { label }),
        ...(address && { address: address.trim() }),
        ...(chain && { chain }),
        ...(purpose && validPurposes.includes(purpose) && { purpose }),
        ...(destinationTag !== undefined && { destinationTag: destinationTag || null }),
        ...(isPrimary !== undefined && { isPrimary }),
      });
      res.json(updated);
    } catch (error) {
      console.error("Update user wallet error:", error);
      res.status(500).json({ message: "Failed to update wallet" });
    }
  });

  app.delete("/api/user-wallets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getUserWallet(req.params.id);
      if (!wallet || wallet.userId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      await storage.deleteUserWallet(wallet.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user wallet error:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  // ===== Scheduled Payments =====
  app.get("/api/scheduled-payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payments = await storage.getScheduledPaymentsByUser(userId);
      res.json(payments);
    } catch (error) {
      console.error("Get scheduled payments error:", error);
      res.status(500).json({ message: "Failed to load scheduled payments" });
    }
  });

  app.post("/api/scheduled-payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      if (tier === "free") {
        return res.status(403).json({ message: "Recurring payments require a Premium or Pro subscription" });
      }
      const { payeeName, payeeAddress, chain, amount, currency, frequency, nextRunAt, memo, destinationTag, totalRuns } = req.body;
      if (!payeeName || !payeeAddress || !chain || !amount || !currency || !frequency || !nextRunAt) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const payment = await storage.createScheduledPayment({
        userId,
        payeeName,
        payeeAddress,
        chain,
        amount: String(amount),
        currency,
        frequency,
        nextRunAt: new Date(nextRunAt),
        memo: memo || null,
        destinationTag: destinationTag || null,
        totalRuns: totalRuns || null,
        status: "active",
      });
      res.json(payment);
    } catch (error) {
      console.error("Create scheduled payment error:", error);
      res.status(500).json({ message: "Failed to create scheduled payment" });
    }
  });

  app.patch("/api/scheduled-payments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payment = await storage.getScheduledPayment(req.params.id);
      if (!payment || payment.userId !== userId) {
        return res.status(404).json({ message: "Scheduled payment not found" });
      }
      const updated = await storage.updateScheduledPayment(payment.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update scheduled payment error:", error);
      res.status(500).json({ message: "Failed to update scheduled payment" });
    }
  });

  app.delete("/api/scheduled-payments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payment = await storage.getScheduledPayment(req.params.id);
      if (!payment || payment.userId !== userId) {
        return res.status(404).json({ message: "Scheduled payment not found" });
      }
      await storage.deleteScheduledPayment(payment.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete scheduled payment error:", error);
      res.status(500).json({ message: "Failed to delete scheduled payment" });
    }
  });

  app.get("/api/payment-executions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const executions = await storage.getPaymentExecutionsByUser(userId);
      res.json(executions);
    } catch (error) {
      console.error("Get payment executions error:", error);
      res.status(500).json({ message: "Failed to load payment history" });
    }
  });

  app.get("/api/effective-tier", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, billingCycle } = await getEffectiveTier(userId);
      res.json({ tier, billingCycle });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get tier" });
    }
  });

  app.get("/api/auto-buy-xrp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json({
        enabled: settings?.autoBuyXrpEnabled ?? false,
        percent: settings?.autoBuyXrpPercent ?? 100,
        minAmount: settings?.autoBuyXrpMinAmount ?? "5",
      });
    } catch (error) {
      console.error("Get auto-buy settings error:", error);
      res.status(500).json({ message: "Failed to load auto-buy settings" });
    }
  });

  app.patch("/api/auto-buy-xrp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enabled, percent, minAmount } = req.body;
      const updates: Record<string, unknown> = { userId };
      if (typeof enabled === "boolean") updates.autoBuyXrpEnabled = enabled;
      if (typeof percent === "number" && percent >= 1 && percent <= 100) updates.autoBuyXrpPercent = percent;
      if (minAmount !== undefined) updates.autoBuyXrpMinAmount = String(minAmount);
      const result = await storage.upsertUserSettings(updates as any);
      res.json({
        enabled: result.autoBuyXrpEnabled ?? false,
        percent: result.autoBuyXrpPercent ?? 100,
        minAmount: result.autoBuyXrpMinAmount ?? "5",
      });
    } catch (error) {
      console.error("Update auto-buy settings error:", error);
      res.status(500).json({ message: "Failed to update auto-buy settings" });
    }
  });

  app.get("/api/auto-withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json({
        enabled: settings?.autoWithdrawEnabled ?? false,
        threshold: settings?.autoWithdrawThreshold ?? "5",
        frequency: settings?.autoWithdrawFrequency ?? "daily",
        lastRunAt: settings?.autoWithdrawLastRunAt ?? null,
      });
    } catch (error) {
      console.error("Get auto-withdraw settings error:", error);
      res.status(500).json({ message: "Failed to load auto-withdraw settings" });
    }
  });

  app.patch("/api/auto-withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      if (tier !== "premium" && tier !== "pro") {
        return res.status(403).json({ message: "Premium or Pro subscription required" });
      }
      const { enabled, threshold, frequency } = req.body;
      const updates: Record<string, unknown> = { userId };
      if (typeof enabled === "boolean") updates.autoWithdrawEnabled = enabled;
      if (threshold !== undefined && parseFloat(threshold) > 0) updates.autoWithdrawThreshold = String(threshold);
      if (frequency && ["daily", "weekly", "biweekly", "monthly"].includes(frequency)) updates.autoWithdrawFrequency = frequency;
      const result = await storage.upsertUserSettings(updates as any);
      res.json({
        enabled: result.autoWithdrawEnabled ?? false,
        threshold: result.autoWithdrawThreshold ?? "5",
        frequency: result.autoWithdrawFrequency ?? "daily",
        lastRunAt: result.autoWithdrawLastRunAt ?? null,
      });
    } catch (error) {
      console.error("Update auto-withdraw settings error:", error);
      res.status(500).json({ message: "Failed to update auto-withdraw settings" });
    }
  });

  app.get("/api/auto-withdraw/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await db.select().from(autoWithdrawLogs)
        .where(eq(autoWithdrawLogs.userId, userId))
        .orderBy(desc(autoWithdrawLogs.createdAt))
        .limit(50);
      res.json({ logs });
    } catch (error) {
      console.error("Get auto-withdraw history error:", error);
      res.status(500).json({ message: "Failed to load history" });
    }
  });

  async function hasLegacyAccess(userId: string): Promise<boolean> {
    const { tier } = await getEffectiveTier(userId);
    if (tier === "pro") return true;
    const now = new Date();
    for (const k of LEGACY_ADDON_KEYS) {
      const addon = await storage.getUserAddonByKey(userId, k);
      if (isLegacyAddonActive(addon, now)) return true;
    }
    return false;
  }

  app.get("/api/legacy-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.json(null);
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const checkIns = await storage.getLegacyCheckIns(plan.id, 10);
      res.json({ plan, beneficiaries, checkIns });
    } catch (error) {
      console.error("Get legacy plan error:", error);
      res.status(500).json({ message: "Failed to load legacy plan" });
    }
  });

  app.post("/api/legacy-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const existing = await storage.getLegacyPlan(userId);
      if (existing) return res.status(400).json({ message: "Legacy plan already exists" });
      const { checkInFrequency, gracePeriodDays, secondaryContactName, secondaryContactEmail, personalMessage, splitDeliveryEnabled, splitDeliveryMode, splitDeliveryThreshold } = req.body;
      const firstReviewDue = new Date();
      firstReviewDue.setFullYear(firstReviewDue.getFullYear() + 1);
      const verifyToken = secondaryContactEmail ? crypto.randomUUID().replace(/-/g, "") : null;
      const plan = await storage.createLegacyPlan({
        userId,
        status: "active",
        checkInFrequency: checkInFrequency || "monthly",
        gracePeriodDays: gracePeriodDays || 14,
        nextCheckInDue: new Date(),
        secondaryContactName: secondaryContactName || null,
        secondaryContactEmail: secondaryContactEmail || null,
        secondaryContactVerified: false,
        secondaryContactVerifyToken: verifyToken,
        personalMessage: personalMessage || null,
        splitDeliveryEnabled: splitDeliveryEnabled || false,
        splitDeliveryMode: splitDeliveryMode || "all",
        splitDeliveryThreshold: splitDeliveryThreshold || 2,
        nextAnnualReviewDue: firstReviewDue,
        annualReviewCount: 0,
      });

      if (secondaryContactEmail && secondaryContactName && verifyToken) {
        const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, userId));
        const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "A CryptoOwnBank member";
        const verifyUrl = `https://cryptoownbank.com/api/legacy-plan/verify-contact?token=${verifyToken}`;
        try {
          await sendSecondaryContactVerification(secondaryContactEmail, secondaryContactName, ownerName, verifyUrl);
        } catch (err) {
          console.error("Failed to send secondary contact verification:", err);
        }
      }

      res.json(plan);
    } catch (error) {
      console.error("Create legacy plan error:", error);
      res.status(500).json({ message: "Failed to create legacy plan" });
    }
  });

  app.patch("/api/legacy-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const updates: Record<string, unknown> = {};
      const { checkInFrequency, gracePeriodDays, secondaryContactName, secondaryContactEmail, personalMessage, splitDeliveryEnabled, splitDeliveryMode, splitDeliveryThreshold, lastResortEnabled, lastResortWindowDays, defaultBeneficiaryEmail } = req.body;
      if (defaultBeneficiaryEmail !== undefined) {
        updates.defaultBeneficiaryEmail = defaultBeneficiaryEmail ? String(defaultBeneficiaryEmail).toLowerCase().trim() || null : null;
      }
      if (lastResortEnabled !== undefined) updates.lastResortEnabled = !!lastResortEnabled;
      if (lastResortWindowDays !== undefined) {
        const d = Number(lastResortWindowDays);
        if ([180, 365, 540, 730, 1095].includes(d)) updates.lastResortWindowDays = d;
      }
      const validFrequencies = ["weekly", "biweekly", "monthly", "quarterly"];
      if (checkInFrequency && validFrequencies.includes(checkInFrequency)) updates.checkInFrequency = checkInFrequency;
      if (gracePeriodDays && [7, 14, 30, 60, 90].includes(Number(gracePeriodDays))) updates.gracePeriodDays = Number(gracePeriodDays);
      if (secondaryContactName !== undefined) updates.secondaryContactName = secondaryContactName;
      if (secondaryContactEmail !== undefined) {
        updates.secondaryContactEmail = secondaryContactEmail;
        if (secondaryContactEmail !== plan.secondaryContactEmail) {
          updates.earlyTriggerRequestToken = null;
          updates.earlyTriggerVetoToken = null;
          updates.earlyTriggerRequestedAt = null;
          updates.earlyTriggerVetoedAt = null;
          updates.earlyTriggerRequestNotes = null;
        }
        if (secondaryContactEmail && secondaryContactEmail !== plan.secondaryContactEmail) {
          const newToken = crypto.randomUUID().replace(/-/g, "");
          updates.secondaryContactVerified = false;
          updates.secondaryContactVerifyToken = newToken;
          const contactName = secondaryContactName || plan.secondaryContactName || "there";
          const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, userId));
          const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "A CryptoOwnBank member";
          const verifyUrl = `https://cryptoownbank.com/api/legacy-plan/verify-contact?token=${newToken}`;
          try {
            await sendSecondaryContactVerification(secondaryContactEmail, contactName, ownerName, verifyUrl);
          } catch (err) {
            console.error("Failed to send secondary contact verification:", err);
          }
        }
        if (!secondaryContactEmail) {
          updates.secondaryContactVerified = false;
          updates.secondaryContactVerifyToken = null;
        }
      }
      if (personalMessage !== undefined) updates.personalMessage = personalMessage;
      if (splitDeliveryEnabled !== undefined) updates.splitDeliveryEnabled = !!splitDeliveryEnabled;
      if (splitDeliveryMode !== undefined && ["all", "threshold"].includes(splitDeliveryMode)) updates.splitDeliveryMode = splitDeliveryMode;
      if (splitDeliveryThreshold !== undefined) {
        const t = Number(splitDeliveryThreshold);
        if (t >= 2 && t <= 10) updates.splitDeliveryThreshold = t;
      }
      const result = await storage.updateLegacyPlan(plan.id, updates as any);
      res.json(result);
    } catch (error) {
      console.error("Update legacy plan error:", error);
      res.status(500).json({ message: "Failed to update legacy plan" });
    }
  });

  app.post("/api/legacy-plan/check-in", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      if (plan.status === "triggered") return res.status(400).json({ message: "Plan already triggered — cannot check in" });
      const now = new Date();
      const nextDue = new Date(now);
      switch (plan.checkInFrequency) {
        case "weekly": nextDue.setDate(nextDue.getDate() + 7); break;
        case "biweekly": nextDue.setDate(nextDue.getDate() + 14); break;
        case "monthly": nextDue.setMonth(nextDue.getMonth() + 1); break;
        case "quarterly": nextDue.setMonth(nextDue.getMonth() + 3); break;
        default: nextDue.setMonth(nextDue.getMonth() + 1);
      }
      await storage.createLegacyCheckIn(plan.id);
      const checkInUpdates: any = {
        lastCheckIn: now,
        nextCheckInDue: nextDue,
        status: "active",
        graceStartedAt: null,
      };
      if (plan.earlyTriggerRequestedAt && !plan.earlyTriggerVetoedAt) {
        checkInUpdates.earlyTriggerVetoedAt = now;
        checkInUpdates.earlyTriggerVetoToken = null;
        checkInUpdates.earlyTriggerRequestedAt = null;
        checkInUpdates.earlyTriggerRequestNotes = null;
      }
      const updated = await storage.updateLegacyPlan(plan.id, checkInUpdates);
      res.json(updated);
    } catch (error) {
      console.error("Check-in error:", error);
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  app.post("/api/legacy-plan/annual-review", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const now = new Date();
      const nextReviewDue = new Date(now);
      nextReviewDue.setFullYear(nextReviewDue.getFullYear() + 1);
      const updated = await storage.updateLegacyPlan(plan.id, {
        lastAnnualReview: now,
        nextAnnualReviewDue: nextReviewDue,
        annualReviewCount: (plan.annualReviewCount || 0) + 1,
      });
      res.json(updated);
    } catch (error) {
      console.error("Annual review error:", error);
      res.status(500).json({ message: "Failed to record annual review" });
    }
  });

  app.get("/api/legacy-plan/verify-contact", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).send("Invalid verification link");
      const [plan] = await db.select().from(legacyPlans).where(eq(legacyPlans.secondaryContactVerifyToken, token));
      if (!plan) {
        return res.send(`
          <html><head><title>Verification — CryptoOwnBank</title></head>
          <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px 20px;">
            <h1 style="color: #00A4E4;">CryptoOwnBank</h1>
            <h2>Link Expired or Invalid</h2>
            <p style="color: #666;">This verification link is no longer valid. It may have already been used or the contact was updated.</p>
          </body></html>
        `);
      }
      if (plan.secondaryContactVerified) {
        return res.send(`
          <html><head><title>Already Verified — CryptoOwnBank</title></head>
          <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px 20px;">
            <h1 style="color: #00A4E4;">CryptoOwnBank</h1>
            <h2 style="color: #16a34a;">Already Verified</h2>
            <p style="color: #666;">You've already confirmed your role as a secondary contact. No further action needed.</p>
          </body></html>
        `);
      }
      const earlyReqToken = crypto.randomUUID().replace(/-/g, "");
      await storage.updateLegacyPlan(plan.id, { secondaryContactVerified: true, earlyTriggerRequestToken: earlyReqToken, secondaryContactVerifyToken: null });
      try {
        const [owner2] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
        const ownerName2 = owner2?.firstName || owner2?.email?.split("@")[0] || "the plan owner";
        const reqUrl = `https://cryptoownbank.com/api/legacy-plan/early-trigger-request?token=${earlyReqToken}`;
        const vetoDays = plan.earlyTriggerVetoDays || 30;
        const { sendEarlyTriggerInstructionsToSecondary } = await import("../email");
        await sendEarlyTriggerInstructionsToSecondary(plan.secondaryContactEmail!, plan.secondaryContactName!, ownerName2, reqUrl, vetoDays);
      } catch (e) { console.error("Failed to email early-trigger instructions:", e); }
      res.send(`
        <html><head><title>Verified — CryptoOwnBank</title></head>
        <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px 20px;">
          <h1 style="color: #00A4E4;">CryptoOwnBank</h1>
          <h2 style="color: #16a34a;">Email Verified Successfully</h2>
          <p style="color: #666; max-width: 500px; margin: 0 auto; line-height: 1.6;">
            Thank you, <strong>${plan.secondaryContactName}</strong>. You've confirmed your role as a secondary contact on a CryptoOwnBank Legacy Plan.
          </p>
          <p style="color: #888; margin-top: 20px; font-size: 14px;">
            If a check-in is missed, you'll receive a notification asking you to try to reach the plan holder. You will <strong>not</strong> receive any wallet keys or financial information.
          </p>
        </body></html>
      `);
    } catch (error) {
      console.error("Verify contact error:", error);
      res.status(500).send("Something went wrong");
    }
  });

  app.post("/api/legacy-plan/resend-verification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Access denied" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      if (!plan.secondaryContactEmail || !plan.secondaryContactName) {
        return res.status(400).json({ message: "No secondary contact configured" });
      }
      if (plan.secondaryContactVerified) {
        return res.status(400).json({ message: "Secondary contact is already verified" });
      }
      const newToken = crypto.randomUUID().replace(/-/g, "");
      await storage.updateLegacyPlan(plan.id, { secondaryContactVerifyToken: newToken });
      const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, userId));
      const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "A CryptoOwnBank member";
      const verifyUrl = `https://cryptoownbank.com/api/legacy-plan/verify-contact?token=${newToken}`;
      await sendSecondaryContactVerification(plan.secondaryContactEmail, plan.secondaryContactName, ownerName, verifyUrl);
      res.json({ message: "Verification email resent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification" });
    }
  });

  app.get("/api/legacy-plan/wallet-assets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const userWallets = await storage.getWalletsByUser(userId);
      const result: Array<{
        walletId: string;
        chain: string;
        address: string;
        label: string | null;
        hardwareDevice: string | null;
        assets: Array<{ symbol: string; balance: string; usdValue: string | null }>;
      }> = [];
      for (const w of userWallets) {
        const balances = await storage.getWalletBalances(w.id);
        result.push({
          walletId: w.id,
          chain: w.chain,
          address: w.address,
          label: w.label,
          hardwareDevice: (w as any).hardwareDevice || null,
          assets: balances.map(b => ({
            symbol: b.assetSymbol,
            balance: b.balance,
            usdValue: b.usdValue,
          })),
        });
      }
      res.json(result);
    } catch (error) {
      console.error("Get legacy wallet assets error:", error);
      res.status(500).json({ message: "Failed to load wallet assets" });
    }
  });

  app.post("/api/legacy-beneficiaries/:id/mark-tested", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const existing = beneficiaries.find(b => b.id === req.params.id);
      if (!existing) return res.status(403).json({ message: "Not your beneficiary" });
      if (!existing.encryptedVault) return res.status(400).json({ message: "No encrypted vault on this beneficiary" });
      await storage.updateLegacyBeneficiary(req.params.id, { vaultTested: true, vaultTestedAt: new Date() } as any);
      res.json({ ok: true });
    } catch (e) {
      console.error("mark-tested error:", e);
      res.status(500).json({ message: "Failed to record test" });
    }
  });

  app.post("/api/legacy-plan/slip39", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const total = Number(req.body?.totalShards);
      const threshold = Number(req.body?.threshold);
      if (!Number.isFinite(total) || total < 2 || total > 16) return res.status(400).json({ message: "totalShards must be 2-16" });
      if (!Number.isFinite(threshold) || threshold < 1 || threshold > total) return res.status(400).json({ message: "threshold must be between 1 and totalShards" });
      await storage.updateLegacyPlan(plan.id, {
        slip39TotalShards: total,
        slip39Threshold: threshold,
        slip39CompletedAt: new Date(),
      } as any);
      res.json({ ok: true });
    } catch (e) {
      console.error("slip39 record error:", e);
      res.status(500).json({ message: "Failed to record SLIP-39 setup" });
    }
  });

  app.post("/api/legacy-plan/dismiss-tip", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const tipId = String(req.body?.tipId || "").slice(0, 80);
      if (!tipId) return res.status(400).json({ message: "tipId required" });
      const dismissed = (plan as any).readinessDismissedTips ? String((plan as any).readinessDismissedTips).split(",") : [];
      if (!dismissed.includes(tipId)) dismissed.push(tipId);
      await storage.updateLegacyPlan(plan.id, { readinessDismissedTips: dismissed.join(",") } as any);
      res.json({ ok: true });
    } catch (e) {
      console.error("dismiss-tip error:", e);
      res.status(500).json({ message: "Failed to dismiss" });
    }
  });

  app.get("/api/legacy-plan/readiness", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.json({ score: 0, checks: [{ id: "no-plan", severity: "critical", title: "Create your Legacy Plan", message: "You haven't created a Legacy Plan yet.", fixUrl: "/legacy-plan", fixLabel: "Get started" }] });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const userWallets = await storage.getWalletsByUser(userId);
      const dismissed = (plan as any).readinessDismissedTips ? String((plan as any).readinessDismissedTips).split(",") : [];

      const walletInfos: { id: string; chain: string; address: string; label: string | null; usd: number }[] = [];
      for (const w of userWallets) {
        const balances = await storage.getWalletBalances(w.id);
        const usd = balances.reduce((s, b) => s + (parseFloat(b.usdValue || "0") || 0), 0);
        walletInfos.push({ id: w.id, chain: w.chain, address: w.address, label: w.label, usd });
      }

      const referencedAddrs = new Set<string>();
      for (const b of beneficiaries) {
        const blob = `${b.deviceInstructions || ""} ${b.seedPhraseInstructions || ""} ${b.additionalNotes || ""} ${b.walletAssetSummary || ""}`.toLowerCase();
        for (const w of walletInfos) {
          if (w.address && blob.includes(w.address.toLowerCase().slice(0, 12))) referencedAddrs.add(w.id);
          if (w.label && blob.includes(w.label.toLowerCase())) referencedAddrs.add(w.id);
        }
      }
      const uncovered = walletInfos.filter(w => !referencedAddrs.has(w.id));
      const uncoveredHigh = uncovered.filter(w => w.usd >= 10000);
      const uncoveredAny = uncovered.filter(w => w.usd > 0);

      const checks: Array<{ id: string; severity: "critical" | "warning" | "tip"; title: string; message: string; fixUrl?: string; fixLabel?: string }> = [];

      if (beneficiaries.length === 0) {
        checks.push({ id: "no-beneficiaries", severity: "critical", title: "Add at least one beneficiary", message: "Without a beneficiary, the plan can never deliver anything when triggered.", fixUrl: "/legacy-plan", fixLabel: "Add beneficiary" });
      }

      const untestedVaults = beneficiaries.filter((b: any) => b.encryptedVault && !b.vaultTested);
      if (untestedVaults.length > 0) {
        checks.push({ id: "untested-vault", severity: "critical", title: `${untestedVaults.length} encrypted vault${untestedVaults.length > 1 ? "s" : ""} never test-decrypted`, message: `These vaults will be delivered to your survivors but were never verified to open. Edit each beneficiary and click Test Decrypt: ${untestedVaults.map((b: any) => b.name).join(", ")}.`, fixUrl: "/legacy-plan", fixLabel: "Test now" });
      }

      const SIX_MONTHS = 180 * 86400000;
      const staleVerifications = beneficiaries.filter((b: any) => b.encryptedVault && b.vaultVerificationCapsule && (!b.vaultVerifiedAt || (Date.now() - new Date(b.vaultVerifiedAt).getTime()) > SIX_MONTHS));
      if (staleVerifications.length > 0) {
        const names = staleVerifications.map((b: any) => b.name).join(", ");
        const allUnverified = staleVerifications.every((b: any) => !b.vaultVerifiedAt);
        checks.push({
          id: "stale-passphrase-verification",
          severity: "warning",
          title: allUnverified
            ? `${staleVerifications.length} beneficiar${staleVerifications.length > 1 ? "ies have" : "y has"} never verified their passphrase`
            : `${staleVerifications.length} passphrase verification${staleVerifications.length > 1 ? "s are" : " is"} over 6 months old`,
          message: `Send ${names} a quick check so you know they still remember the passphrase — better to find out now than in an emergency.`,
          fixUrl: "/legacy-plan?view=people",
          fixLabel: "Send check",
        });
      }

      if (uncoveredHigh.length > 0) {
        checks.push({ id: "uncovered-high", severity: "critical", title: `${uncoveredHigh.length} high-value wallet${uncoveredHigh.length > 1 ? "s" : ""} not covered`, message: `Wallets totaling ${uncoveredHigh.map(w => `$${Math.round(w.usd).toLocaleString()} (${w.chain})`).join(", ")} have no beneficiary instructions. Your family won't know they exist.`, fixUrl: "/legacy-plan", fixLabel: "Add coverage" });
      }

      const slip39Total = (plan as any).slip39TotalShards;
      const slip39Threshold = (plan as any).slip39Threshold;
      if (slip39Total) {
        const beneficiariesWithShards = beneficiaries.filter((b: any) => Number.isFinite(b.shardIndex)).length;
        if (beneficiariesWithShards < slip39Total) {
          checks.push({ id: "slip39-mismatch", severity: "critical", title: "SLIP-39 shards not fully distributed", message: `You generated ${slip39Total} shards (need ${slip39Threshold} to reconstruct) but only ${beneficiariesWithShards} are assigned to beneficiaries. The remaining ${slip39Total - beneficiariesWithShards} shard${slip39Total - beneficiariesWithShards > 1 ? "s have" : " has"} nowhere to go.`, fixUrl: "/legacy-plan", fixLabel: "Assign shards" });
        }
        const slip39Set = new Set(beneficiaries.map((b: any) => b.shardIndex).filter((n: any) => Number.isFinite(n)));
        if (slip39Set.size < beneficiariesWithShards) {
          checks.push({ id: "slip39-duplicate", severity: "critical", title: "Duplicate SLIP-39 shards assigned", message: "Two or more beneficiaries hold the same shard. Threshold reconstruction will fail.", fixUrl: "/legacy-plan", fixLabel: "Fix assignments" });
        }
      }

      const pendingOld = beneficiaries.filter((b: any) => b.confirmationStatus === "pending" && b.confirmationSentAt && (Date.now() - new Date(b.confirmationSentAt).getTime()) > 14 * 86400000);
      if (pendingOld.length > 0) {
        checks.push({ id: "pending-beneficiaries", severity: "warning", title: `${pendingOld.length} beneficiary email${pendingOld.length > 1 ? "s" : ""} unconfirmed > 14 days`, message: `${pendingOld.map((b: any) => b.name).join(", ")} never clicked the confirmation link. They may have wrong/dead email addresses.`, fixUrl: "/legacy-plan", fixLabel: "Resend or fix" });
      }

      const declined = beneficiaries.filter((b: any) => b.confirmationStatus === "declined");
      if (declined.length > 0) {
        checks.push({ id: "declined-beneficiaries", severity: "warning", title: `${declined.length} beneficiary declined`, message: `${declined.map((b: any) => b.name).join(", ")} declined the role. Replace them or your plan has a hole.`, fixUrl: "/legacy-plan", fixLabel: "Replace" });
      }

      if (!plan.secondaryContactEmail) {
        checks.push({ id: "no-secondary", severity: "warning", title: "No secondary contact set", message: "A secondary contact (spouse, attorney) is your last line of human verification before trigger fires.", fixUrl: "/legacy-plan", fixLabel: "Add contact" });
      } else if (plan.secondaryContactEmail && !plan.secondaryContactVerified) {
        checks.push({ id: "secondary-unverified", severity: "warning", title: "Secondary contact not verified", message: `${plan.secondaryContactEmail} hasn't clicked the verification link yet.`, fixUrl: "/legacy-plan", fixLabel: "Resend" });
      }

      if (uncoveredAny.length > 0 && uncoveredHigh.length === 0) {
        checks.push({ id: "uncovered-any", severity: "warning", title: `${uncoveredAny.length} wallet${uncoveredAny.length > 1 ? "s" : ""} with balance not covered`, message: `Wallets on ${[...new Set(uncoveredAny.map(w => w.chain))].join(", ")} have balances but no instructions for survivors.`, fixUrl: "/legacy-plan", fixLabel: "Add coverage" });
      }

      const nextDue = plan.nextCheckInDue ? new Date(plan.nextCheckInDue).getTime() : 0;
      if (nextDue && nextDue < Date.now() && plan.status === "active") {
        const daysOverdue = Math.floor((Date.now() - nextDue) / 86400000);
        checks.push({ id: "checkin-overdue", severity: "warning", title: `Check-in overdue by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}`, message: "Press 'I'm Still Here' to reset the timer before grace period begins.", fixUrl: "/legacy-plan", fixLabel: "Check in" });
      }

      if (!plan.personalMessage && !dismissed.includes("personal-message")) {
        checks.push({ id: "personal-message", severity: "tip", title: "Write a personal message", message: "A short note to your survivors is the human touch they will remember most. Even one sentence helps.", fixUrl: "/legacy-plan", fixLabel: "Write message" });
      }

      if (!slip39Total && !dismissed.includes("slip39-tip") && beneficiaries.length >= 2) {
        checks.push({ id: "slip39-tip", severity: "tip", title: "Consider SLIP-39 splitting", message: "Splitting a seed across multiple beneficiaries removes the single-point-of-failure risk. With 2+ beneficiaries you can use 2-of-3 or 3-of-5.", fixUrl: "/slip39-setup", fixLabel: "Learn more" });
      }

      if (!plan.lastExportedAt && !dismissed.includes("export-tip")) {
        checks.push({ id: "export-tip", severity: "tip", title: "Export a Survivability snapshot", message: "Print or save a one-page PDF that survivors can use even if CryptoOwnBank is unreachable.", fixUrl: "/legacy-plan", fixLabel: "Export" });
      }

      let score = 100;
      for (const c of checks) {
        if (c.severity === "critical") score -= 20;
        else if (c.severity === "warning") score -= 8;
        else score -= 2;
      }
      score = Math.max(0, Math.min(100, score));

      res.json({
        score,
        totalWallets: walletInfos.length,
        coveredWallets: referencedAddrs.size,
        totalBeneficiaries: beneficiaries.length,
        confirmedBeneficiaries: beneficiaries.filter((b: any) => b.confirmationStatus === "confirmed").length,
        slip39: slip39Total ? { total: slip39Total, threshold: slip39Threshold, assigned: beneficiaries.filter((b: any) => Number.isFinite(b.shardIndex)).length } : null,
        checks,
      });
    } catch (e) {
      console.error("readiness error:", e);
      res.status(500).json({ message: "Failed to compute readiness" });
    }
  });

  const VALID_WALLET_TYPES = ["cypherock", "ledger", "ledger-stax", "trezor", "xaman", "tangem", "coldcard", "ellipal", "keystone", "bitbox", "arculus", "safepal", "metamask", "trust", "phantom", "exodus", "uniswap", "coinbase-wallet", "exchange", "manual", "other"];

  function escapeHtml(str: string): string {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function getOwnerDisplayName(userId: string): Promise<string> {
    try {
      const user = await storage.getUser(userId);
      const first = (user as any)?.firstName || "";
      const last = (user as any)?.lastName || "";
      const full = `${first} ${last}`.trim();
      return full || (user as any)?.email || "Your CryptoOwnBank contact";
    } catch { return "Your CryptoOwnBank contact"; }
  }

  function makeToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  function sanitizeFallbackRecipients(input: any): Array<{ name: string; email: string }> | null {
    if (input === null || input === undefined || input === "") return [];
    if (!Array.isArray(input)) return null;
    if (input.length > 5) return null;
    const out: Array<{ name: string; email: string }> = [];
    for (const item of input) {
      if (!item || typeof item !== "object") return null;
      const name = String(item.name || "").trim().slice(0, 200);
      const email = String(item.email || "").toLowerCase().trim().slice(0, 320);
      if (!name && !email) continue;
      if (!name || !email) return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
      out.push({ name, email });
    }
    return out;
  }

  function htmlPage(title: string, body: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} — CryptoOwnBank</title>
<style>body{font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:48px 24px;color:#222;line-height:1.55}
h1{color:#00A4E4}h2{color:#1e3a8a}.success{color:#16a34a}.muted{color:#888;font-size:13px}
button,form button{background:#00A4E4;color:#fff;border:0;padding:12px 24px;border-radius:8px;font-size:15px;cursor:pointer;margin-top:16px}
button.danger{background:#dc2626}label{display:block;margin:16px 0 6px;font-weight:600}
textarea,input{width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px;box-sizing:border-box}
</style></head><body><h1>CryptoOwnBank</h1>${body}</body></html>`;
  }

  async function dispatchBeneficiaryConfirmation(beneficiary: any, userId: string) {
    try {
      const ownerName = await getOwnerDisplayName(userId);
      const confirmUrl = `https://cryptoownbank.com/api/legacy-beneficiaries/confirm?token=${beneficiary.confirmationToken}`;
      const declineUrl = `https://cryptoownbank.com/api/legacy-beneficiaries/decline?token=${beneficiary.confirmationToken}`;
      await sendBeneficiaryConfirmation(beneficiary.email, beneficiary.name, ownerName, beneficiary.relationship || null, confirmUrl, declineUrl);
    } catch (e) {
      console.error("Failed to send beneficiary confirmation:", e);
    }
  }

  app.post("/api/legacy-beneficiaries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "Create a legacy plan first" });
      const { name, email, relationship, walletType, walletNickname, beneficiaryGroup, deviceInstructions, seedPhraseInstructions, additionalNotes, splitPieces, encryptedVault, encryptedVaultHint, walletAssetSummary, fallbackRecipients } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
      const cleanFallbacks = sanitizeFallbackRecipients(fallbackRecipients);
      if (cleanFallbacks === null) return res.status(400).json({ message: "Fallback recipients must be a list of {name, email} (max 5)" });
      const confirmationToken = makeToken();
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const hasVault = !!encryptedVault;
      const vaultTestedClient = req.body?.vaultTested === true;
      if (hasVault && !vaultTestedClient) {
        return res.status(400).json({ message: "Test Decrypt your encrypted vault before saving. This guarantees your survivors can actually open it." });
      }
      const shardIndexNum = Number.isFinite(Number(req.body?.shardIndex)) ? Number(req.body?.shardIndex) : null;
      const beneficiary = await storage.createLegacyBeneficiary({
        legacyPlanId: plan.id,
        name: String(name).slice(0, 200),
        email: String(email).slice(0, 320).toLowerCase().trim(),
        relationship: relationship || null,
        walletType: walletType && VALID_WALLET_TYPES.includes(walletType) ? walletType : null,
        walletNickname: walletNickname ? String(walletNickname).slice(0, 200) : null,
        beneficiaryGroup: beneficiaryGroup ? String(beneficiaryGroup).slice(0, 100).trim() : null,
        deviceInstructions: deviceInstructions ? String(deviceInstructions).slice(0, 2000) : null,
        seedPhraseInstructions: seedPhraseInstructions ? String(seedPhraseInstructions).slice(0, 2000) : null,
        additionalNotes: additionalNotes ? String(additionalNotes).slice(0, 5000) : null,
        splitPieces: splitPieces ? String(splitPieces).slice(0, 500) : null,
        encryptedVault: encryptedVault ? String(encryptedVault).slice(0, 50000) : null,
        encryptedVaultHint: encryptedVaultHint ? String(encryptedVaultHint).slice(0, 500) : null,
        vaultVerificationCapsule: hasVault && req.body?.vaultVerificationCapsule ? String(req.body.vaultVerificationCapsule).slice(0, 5000) : null,
        vaultTested: hasVault ? true : false,
        vaultTestedAt: hasVault ? now : null,
        shardIndex: shardIndexNum,
        walletAssetSummary: walletAssetSummary ? String(walletAssetSummary).slice(0, 10000) : null,
        fallbackRecipients: cleanFallbacks.length ? cleanFallbacks : null,
        confirmationStatus: "pending",
        confirmationToken,
        confirmationSentAt: now,
        confirmationExpiresAt: expires,
      } as any);
      dispatchBeneficiaryConfirmation(beneficiary, userId);
      res.json(beneficiary);
    } catch (error) {
      console.error("Create beneficiary error:", error);
      res.status(500).json({ message: "Failed to add beneficiary" });
    }
  });

  app.patch("/api/legacy-beneficiaries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(403).json({ message: "No legacy plan found" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const existing = beneficiaries.find(b => b.id === req.params.id);
      if (!existing) return res.status(403).json({ message: "Not your beneficiary" });
      const { name, email, relationship, walletType, walletNickname, beneficiaryGroup, deviceInstructions, seedPhraseInstructions, additionalNotes, splitPieces, encryptedVault, encryptedVaultHint, walletAssetSummary, fallbackRecipients } = req.body;
      const safeUpdates: Record<string, unknown> = {};
      if (fallbackRecipients !== undefined) {
        const cleanFB = sanitizeFallbackRecipients(fallbackRecipients);
        if (cleanFB === null) return res.status(400).json({ message: "Fallback recipients must be a list of {name, email} (max 5)" });
        safeUpdates.fallbackRecipients = cleanFB.length ? cleanFB : null;
      }
      if (name !== undefined) safeUpdates.name = String(name).slice(0, 200);
      let emailChanged = false;
      if (email !== undefined) {
        const newEmail = String(email).slice(0, 320).toLowerCase().trim();
        safeUpdates.email = newEmail;
        if (newEmail !== (existing.email || "").toLowerCase().trim()) emailChanged = true;
      }
      if (relationship !== undefined) safeUpdates.relationship = relationship;
      if (walletType !== undefined) safeUpdates.walletType = walletType && VALID_WALLET_TYPES.includes(walletType) ? walletType : null;
      if (walletNickname !== undefined) safeUpdates.walletNickname = walletNickname ? String(walletNickname).slice(0, 200) : null;
      if (beneficiaryGroup !== undefined) safeUpdates.beneficiaryGroup = beneficiaryGroup ? String(beneficiaryGroup).slice(0, 100).trim() : null;
      if (deviceInstructions !== undefined) safeUpdates.deviceInstructions = deviceInstructions ? String(deviceInstructions).slice(0, 2000) : null;
      if (seedPhraseInstructions !== undefined) safeUpdates.seedPhraseInstructions = seedPhraseInstructions ? String(seedPhraseInstructions).slice(0, 2000) : null;
      if (additionalNotes !== undefined) safeUpdates.additionalNotes = additionalNotes ? String(additionalNotes).slice(0, 5000) : null;
      if (splitPieces !== undefined) safeUpdates.splitPieces = splitPieces ? String(splitPieces).slice(0, 500) : null;
      let vaultChanged = false;
      if (encryptedVault !== undefined) {
        const newVault = encryptedVault ? String(encryptedVault).slice(0, 50000) : null;
        safeUpdates.encryptedVault = newVault;
        if ((newVault || null) !== (existing.encryptedVault || null)) vaultChanged = true;
      }
      if (encryptedVaultHint !== undefined) safeUpdates.encryptedVaultHint = encryptedVaultHint ? String(encryptedVaultHint).slice(0, 500) : null;
      if (vaultChanged) {
        const willHaveVault = !!safeUpdates.encryptedVault;
        const vaultTestedClient = req.body?.vaultTested === true;
        if (willHaveVault && !vaultTestedClient) {
          return res.status(400).json({ message: "Test Decrypt the new encrypted vault before saving. Editing the vault clears the previous test." });
        }
        safeUpdates.vaultTested = willHaveVault ? true : false;
        safeUpdates.vaultTestedAt = willHaveVault ? new Date() : null;
        safeUpdates.vaultVerificationCapsule = willHaveVault && req.body?.vaultVerificationCapsule ? String(req.body.vaultVerificationCapsule).slice(0, 5000) : null;
        safeUpdates.vaultVerifiedAt = null;
        safeUpdates.vaultVerificationToken = null;
        safeUpdates.vaultVerificationSentAt = null;
      } else if (req.body?.vaultTested === true && existing.encryptedVault) {
        safeUpdates.vaultTested = true;
        safeUpdates.vaultTestedAt = new Date();
      }
      if (req.body?.shardIndex !== undefined) {
        const n = Number(req.body.shardIndex);
        safeUpdates.shardIndex = Number.isFinite(n) ? n : null;
      }
      if (walletAssetSummary !== undefined) safeUpdates.walletAssetSummary = walletAssetSummary ? String(walletAssetSummary).slice(0, 10000) : null;
      if (emailChanged) {
        const newToken = makeToken();
        const now = new Date();
        safeUpdates.confirmationStatus = "pending";
        safeUpdates.confirmationToken = newToken;
        safeUpdates.confirmationSentAt = now;
        safeUpdates.confirmationExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        safeUpdates.confirmedAt = null;
        safeUpdates.declinedAt = null;
        safeUpdates.declineReason = null;
        safeUpdates.bouncedAt = null;
      }
      const result = await storage.updateLegacyBeneficiary(req.params.id, safeUpdates as any);
      if (!result) return res.status(404).json({ message: "Beneficiary not found" });
      if (emailChanged) dispatchBeneficiaryConfirmation(result, userId);
      res.json(result);
    } catch (error) {
      console.error("Update beneficiary error:", error);
      res.status(500).json({ message: "Failed to update beneficiary" });
    }
  });

  app.post("/api/legacy-beneficiaries/:id/resend-confirmation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const existing = beneficiaries.find(b => b.id === req.params.id);
      if (!existing) return res.status(403).json({ message: "Not your beneficiary" });
      const newToken = makeToken();
      const now = new Date();
      const updated = await storage.updateLegacyBeneficiary(req.params.id, {
        confirmationStatus: "pending",
        confirmationToken: newToken,
        confirmationSentAt: now,
        confirmationExpiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        confirmedAt: null,
        declinedAt: null,
        declineReason: null,
        bouncedAt: null,
      } as any);
      if (updated) dispatchBeneficiaryConfirmation(updated, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Resend confirmation error:", error);
      res.status(500).json({ message: "Failed to resend" });
    }
  });

  app.post("/api/legacy-beneficiaries/:id/mark-deceased", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const existing = beneficiaries.find(b => b.id === req.params.id);
      if (!existing) return res.status(403).json({ message: "Not your beneficiary" });
      const deceased = req.body?.deceased === true;
      const updated = await storage.updateLegacyBeneficiary(req.params.id, {
        markedDeceasedAt: deceased ? new Date() : null,
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Mark deceased error:", error);
      res.status(500).json({ message: "Failed to update" });
    }
  });

  app.get("/api/legacy-plan/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).send("Legacy Plan required");
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).send("No legacy plan");
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const [owner] = await db.select({ firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(eq(users.id, userId));
      const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") || owner?.email || "Plan Owner";
      const ownerWallets = await storage.getUserWallets(userId);
      const now = new Date();
      // The Sovereignty Recovery Kit content is bundled below as an appendix so beneficiaries
      // get complete restore guidance in one document — no need to track down a second file.
      const kitAppendix = buildSovereigntyKitContent({ wallets: ownerWallets, audience: "survivor" });

      const beneSections = beneficiaries.map((b, i) => {
        const fr: any[] = Array.isArray((b as any).fallbackRecipients) ? (b as any).fallbackRecipients : [];
        return `
        <section class="bene">
          <h2>Beneficiary ${i + 1}: ${escapeHtml(b.name)}</h2>
          <table>
            <tr><th>Email</th><td>${escapeHtml(b.email)}</td></tr>
            <tr><th>Relationship</th><td>${escapeHtml(b.relationship || "—")}</td></tr>
            <tr><th>Group</th><td>${escapeHtml((b as any).beneficiaryGroup || "—")}</td></tr>
            <tr><th>Wallet Type</th><td>${escapeHtml(b.walletType || "—")}</td></tr>
            <tr><th>Wallet Nickname</th><td>${escapeHtml((b as any).walletNickname || "—")}</td></tr>
            <tr><th>Confirmation Status</th><td>${escapeHtml((b as any).confirmationStatus || "pending")}</td></tr>
            <tr><th>Marked Deceased</th><td>${(b as any).markedDeceasedAt ? "YES — " + new Date((b as any).markedDeceasedAt).toISOString() : "no"}</td></tr>
          </table>
          ${fr.length ? `<h3>Fallback Recipients</h3><ul>${fr.map((f: any) => `<li><strong>${escapeHtml(f.name || "")}</strong> &lt;${escapeHtml(f.email || "")}&gt;</li>`).join("")}</ul>` : ""}
          ${b.deviceInstructions ? `<h3>Device Location</h3><p>${escapeHtml(b.deviceInstructions)}</p>` : ""}
          ${b.seedPhraseInstructions ? `<h3>Recovery Backup Location</h3><p>${escapeHtml(b.seedPhraseInstructions)}</p>` : ""}
          ${b.additionalNotes ? `<h3>Additional Notes</h3><pre>${escapeHtml(b.additionalNotes)}</pre>` : ""}
          ${b.splitPieces ? `<h3>Receives (split pieces)</h3><p>${escapeHtml(b.splitPieces)}</p>` : ""}
          ${b.walletAssetSummary ? `<h3>Asset Summary</h3><pre>${escapeHtml(b.walletAssetSummary)}</pre>` : ""}
          ${b.encryptedVault ? `
            <h3>Encrypted Recovery Vault</h3>
            <p><em>Hint: ${escapeHtml(b.encryptedVaultHint || "(no hint set)")}</em></p>
            <details><summary>Show ciphertext (base64, AES-GCM)</summary>
              <pre class="vault">${escapeHtml(b.encryptedVault)}</pre>
            </details>
          ` : ""}
        </section>`;
      }).join("\n");

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>CryptoOwnBank Legacy Plan Export — ${escapeHtml(ownerName)} — ${now.toISOString().slice(0,10)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#222;line-height:1.55}
h1{color:#00A4E4;border-bottom:3px solid #00A4E4;padding-bottom:8px}
h2{color:#1e3a8a;margin-top:40px;border-bottom:1px solid #ddd;padding-bottom:6px}
h3{color:#555;margin-top:18px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px}
.warning{background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin:20px 0;color:#991b1b}
.info{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0}
table{border-collapse:collapse;width:100%;margin:8px 0}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
th{width:180px;color:#555;font-weight:600}
pre{background:#f6f8fa;padding:10px;border-radius:6px;white-space:pre-wrap;word-break:break-word;font-size:12px}
pre.vault{font-size:10px;max-height:240px;overflow:auto}
section.bene{page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:24px 0;background:#fafafa}
.muted{color:#888;font-size:12px}
@media print{body{padding:16px}section.bene{break-inside:avoid}.print-bar{display:none}}
${getSovereigntyKitStyles()}
.appendix-divider{margin:60px 0 20px;padding-top:30px;border-top:3px double #00A4E4}
.appendix-divider h1{color:#1e3a8a;border-bottom:none;font-size:22px;margin:0 0 6px}
.appendix-intro{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;font-size:13px;margin:10px 0 20px}
</style></head><body>
<div class="print-bar">
  <span>Legacy Plan Export &mdash; ${escapeHtml(ownerName)}</span>
  <button onclick="window.print()">Print this document</button>
</div>
<h1>CryptoOwnBank Legacy Plan — Survivability Export</h1>
<p><strong>Owner:</strong> ${escapeHtml(ownerName)} (${escapeHtml(owner?.email || "")})</p>
<p><strong>Generated:</strong> ${now.toLocaleString()}</p>
<p><strong>Beneficiaries:</strong> ${beneficiaries.length}</p>

<div class="warning">
  <strong>This file contains the location of recovery materials and (if you set them) encrypted recovery vaults.</strong> It does NOT contain plaintext seed phrases. Treat this file like you would treat the materials it points to: store it physically (fireproof safe, safe deposit box, with your attorney). Do not email it. Do not store it in plain cloud sync. If your encrypted vaults use weak passphrases, this file is only as secure as those passphrases.
</div>

<div class="info">
  <strong>How survivors use this file:</strong>
  <ol>
    <li>Each section below describes one beneficiary, what they would receive, and where the recovery materials physically live.</li>
    <li>Encrypted vaults are AES-GCM ciphertext (base64). The owner shared the passphrase with each beneficiary out of band. To decrypt, paste the ciphertext into the open-source decryption tool documented at <code>cryptoownbank.com/decrypt</code>, or use the offline script included in any annual export ZIP.</li>
    <li>An <strong>appendix at the end of this document</strong> contains chain-by-chain restore guidance — which wallets to install, how to import the seed, how to verify balances. Survivors don't need a second document.</li>
    <li>Re-export this file annually after any change to your beneficiaries or wallets.</li>
  </ol>
</div>

<h2>Plan Settings</h2>
<table>
  <tr><th>Status</th><td>${escapeHtml(plan.status)}</td></tr>
  <tr><th>Check-in frequency</th><td>${escapeHtml(plan.checkInFrequency)}</td></tr>
  <tr><th>Grace period (days)</th><td>${plan.gracePeriodDays}</td></tr>
  <tr><th>Last check-in</th><td>${plan.lastCheckIn ? new Date(plan.lastCheckIn).toLocaleString() : "—"}</td></tr>
  <tr><th>Next check-in due</th><td>${plan.nextCheckInDue ? new Date(plan.nextCheckInDue).toLocaleString() : "—"}</td></tr>
  <tr><th>Secondary contact</th><td>${escapeHtml(plan.secondaryContactName || "—")} ${plan.secondaryContactEmail ? `&lt;${escapeHtml(plan.secondaryContactEmail)}&gt;` : ""} ${plan.secondaryContactVerified ? "(verified)" : "(unverified)"}</td></tr>
  <tr><th>Beneficiary heartbeat</th><td>${plan.beneficiaryHeartbeatEnabled ? `enabled, ${escapeHtml(plan.beneficiaryHeartbeatFrequency || "annual")}` : "disabled"}</td></tr>
  <tr><th>Contingency redistribution window</th><td>${plan.contingencyRedistributionDays} days</td></tr>
  <tr><th>Early-trigger veto window</th><td>${plan.earlyTriggerVetoDays} days</td></tr>
</table>

${plan.personalMessage ? `<h2>Personal Message to Beneficiaries</h2><pre>${escapeHtml(plan.personalMessage)}</pre>` : ""}

${beneSections}

<p class="muted">Export ID: ${crypto.randomUUID()} — generated by CryptoOwnBank server. This file is not transmitted or stored after generation.</p>

<div class="appendix-divider">
  <h1>Appendix: How to actually restore the assets</h1>
  <p class="muted">Chain-by-chain restore guidance bundled in so survivors don't need a second document.</p>
</div>
<div class="appendix-intro">
  <strong>Who this appendix is for.</strong> If you're a beneficiary reading this after the owner has passed, this section walks you through restoring each chain's assets using the seed phrase or SLIP-39 shares you've been given. The addresses below are the owner's <strong>public</strong> addresses — useful for verifying the right account loaded after you import the seed. Nothing here can move funds on its own; the seed phrase (or combined SLIP-39 shares) is the lock.
</div>
${kitAppendix}

</body></html>`;

      await storage.updateLegacyPlan(plan.id, { lastExportedAt: now } as any);
      const filename = `cryptoownbank-legacy-export-${now.toISOString().slice(0,10)}.html`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.send(html);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).send("Failed to generate export");
    }
  });

  // Sovereignty Recovery Kit — for the living owner, all tiers.
  // Different audience and shape from Legacy Plan export (which is survivor-facing, beneficiary-shaped).
  // The same kit content is also bundled into the Legacy Plan export as an appendix so survivors
  // get a complete package without needing a second document.
  app.get("/api/sovereignty-kit/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [owner] = await db.select({ firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(eq(users.id, userId));
      const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") || owner?.email || "Member";
      const wallets = await storage.getUserWallets(userId);
      const now = new Date();

      const grouped: Record<string, typeof wallets> = {};
      for (const w of wallets) {
        const key = normalizeChainKey(w.chain);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(w);
      }
      const kitBody = buildSovereigntyKitContent({ wallets, audience: "self" });

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>CryptoOwnBank Sovereignty Recovery Kit — ${escapeHtml(ownerName)} — ${now.toISOString().slice(0, 10)}</title>
<style>${getSovereigntyKitStyles()}</style></head><body>

<div class="print-bar">
  <span>Sovereignty Recovery Kit &mdash; ${escapeHtml(ownerName)}</span>
  <button onclick="window.print()">Print this kit</button>
</div>

<h1>Sovereignty Recovery Kit</h1>
<p><strong>Member:</strong> ${escapeHtml(ownerName)} (${escapeHtml(owner?.email || "")})</p>
<p><strong>Generated:</strong> ${escapeHtml(now.toLocaleString())}</p>
<p><strong>Addresses included:</strong> ${wallets.length} across ${Object.keys(grouped).length} chain${Object.keys(grouped).length === 1 ? "" : "s"}</p>

<div class="promise">
  <strong>The promise this kit makes you.</strong>
  <p style="margin:6px 0 0 0;font-size:13px">Your assets don't live in CryptoOwnBank. They don't live in your wallet app. They don't live on your phone or hardware device. They live on the blockchain &mdash; a public network nobody owns and nobody can shut down. As long as the network is running and you have your seed phrase, you can get to your assets. With our app, without our app, with any wallet, with no wallet at all.</p>
</div>

<div class="warning">
  <strong>What this kit is and isn't.</strong>
  <p style="margin:6px 0 0 0;font-size:13px">This kit contains your <strong>public</strong> wallet addresses and generic restore guidance. It does <strong>not</strong> contain your seed phrase, private keys, or anything else that could move your funds. CryptoOwnBank never sees those. If you lose your seed phrase, no kit, no tool, and no company can recover your assets &mdash; that's the trade for nobody being able to take them from you. Store the phrase well. The kit is the guide. The phrase is the lock.</p>
</div>

<h2>How to use this kit</h2>
<ol style="font-size:13px;line-height:1.6">
  <li><strong>Print it.</strong> Keep the printout with your seed phrase &mdash; same room, separate envelope. Reprint whenever you add wallets or change addresses.</li>
  <li><strong>For verification:</strong> any day you want to prove you still control your assets, follow the restore steps for one chain on a clean device. You should see the balance you expect.</li>
  <li><strong>For switching wallets:</strong> if the wallet you usually use shuts down or you simply want a different one, the per-chain "current good wallets" lists are the safe options that follow the open standard.</li>
  <li><strong>For survivors:</strong> if you have a Legacy Plan, this same restore guidance is bundled automatically into the Legacy Plan export your family will receive &mdash; you don't need to share this kit separately.</li>
</ol>

${kitBody}

<div class="footer">
  Generated by CryptoOwnBank for ${escapeHtml(ownerName)} on ${escapeHtml(now.toLocaleDateString())}. Not financial advice. Wallets and best practices change &mdash; re-download annually.
</div>

</body></html>`;

      const safeName = ownerName.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40) || "member";
      const filename = `cryptoownbank-sovereignty-kit-${safeName}-${now.toISOString().slice(0, 10)}.html`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.send(html);
    } catch (error) {
      console.error("Sovereignty kit export error");
      res.status(500).send("Failed to generate sovereignty kit");
    }
  });


  app.get("/api/legacy-plan/last-resort-status/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "");
      if (!token) return res.status(400).json({ message: "Invalid token" });
      const plan = await storage.getLegacyPlanByLastResortToken(token);
      if (!plan) return res.status(404).json({ message: "Token not found or expired" });
      const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
      const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "the plan holder";
      res.json({
        ownerName,
        triggeredAt: plan.triggeredAt,
        notifyStartedAt: plan.lastResortNotifyStartedAt,
        confirmStartedAt: plan.lastResortConfirmStartedAt,
        objectedAt: plan.lastResortObjectedAt,
        objectedBy: plan.lastResortObjectedBy,
        releasedAt: plan.lastResortReleasedAt,
        windowDays: plan.lastResortWindowDays || 365,
      });
    } catch (e) {
      console.error("Last-resort status error:", e);
      res.status(500).json({ message: "Failed to load status" });
    }
  });

  app.post("/api/legacy-plan/last-resort-object/:token", express.json(), async (req: any, res) => {
    try {
      const token = String(req.params.token || "");
      const objectorEmail = String(req.body?.email || "").trim().toLowerCase();
      const objectorReason = String(req.body?.reason || "").slice(0, 500);
      if (!token) return res.status(400).json({ message: "Invalid token" });
      if (!objectorEmail || !objectorEmail.includes("@")) return res.status(400).json({ message: "Valid email required to record objection" });
      const plan = await storage.getLegacyPlanByLastResortToken(token);
      if (!plan) return res.status(404).json({ message: "Token not found" });
      if (plan.lastResortReleasedAt) return res.status(409).json({ message: "Vault has already been released — objection cannot be recorded" });

      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, plan.userId));
      const allowedEmails = new Set<string>();
      for (const b of beneficiaries) if (b.email) allowedEmails.add(b.email.trim().toLowerCase());
      if (plan.secondaryContactEmail) allowedEmails.add(plan.secondaryContactEmail.trim().toLowerCase());
      if (owner?.email) allowedEmails.add(owner.email.trim().toLowerCase());
      if (!allowedEmails.has(objectorEmail)) {
        console.log(`[Legacy LastResort] Rejected objection from non-stakeholder ${objectorEmail} for plan ${plan.id}`);
        return res.status(403).json({ message: "This email is not listed as a stakeholder on the plan. Use the email address you were notified at." });
      }

      const now = new Date();
      const auditEntry = `${now.toISOString()} OBJECTION by=${objectorEmail} reason="${objectorReason.replace(/"/g, "'")}"`;
      const [updated] = await db.update(legacyPlans).set({
        lastResortObjectedAt: now,
        lastResortObjectedBy: objectorEmail,
        lastResortAuditLog: ((plan.lastResortAuditLog || "") + "\n" + auditEntry).trim(),
      } as any).where(
        and(
          eq(legacyPlans.id, plan.id),
          sql`${legacyPlans.lastResortReleasedAt} IS NULL`,
          sql`${legacyPlans.lastResortObjectionToken} = ${token}`,
        )
      ).returning();
      if (!updated) {
        return res.status(409).json({ message: "Plan state changed — objection could not be recorded. Refresh and try again." });
      }
      console.log(`[Legacy LastResort] Objection recorded for plan ${plan.id} by ${objectorEmail}`);
      res.json({ ok: true, message: "Objection recorded. Last-resort release is paused for 90 days." });
    } catch (e) {
      console.error("Last-resort object error:", e);
      res.status(500).json({ message: "Failed to record objection" });
    }
  });

  app.get("/api/legacy-plan/early-trigger-request", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const plan = await storage.getLegacyPlanByEarlyTriggerRequestToken(token);
      if (!plan) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2><p>This link is no longer valid.</p>`));
      if (plan.status === "triggered") return res.send(htmlPage("Already triggered", `<h2>Plan already triggered</h2><p>This Legacy Plan has already been triggered. No further action is needed.</p>`));
      if (plan.earlyTriggerRequestedAt && !plan.earlyTriggerVetoedAt) {
        const deadline = new Date(plan.earlyTriggerRequestedAt.getTime() + (plan.earlyTriggerVetoDays || 30) * 86400000);
        return res.send(htmlPage("Already requested", `<h2>Request already pending</h2><p>You requested early trigger on ${escapeHtml(plan.earlyTriggerRequestedAt.toLocaleString())}. The veto deadline is <strong>${escapeHtml(deadline.toLocaleString())}</strong>. The plan owner has been notified and can veto until then.</p>`));
      }
      const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
      const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "the plan owner";
      res.send(htmlPage("Request Early Trigger", `
        <h2>Request Early Trigger</h2>
        <p>You're about to ask CryptoOwnBank to start the trigger process for <strong>${escapeHtml(ownerName)}</strong>'s Legacy Plan.</p>
        <p>${escapeHtml(ownerName)} will receive an email with a <strong>${plan.earlyTriggerVetoDays || 30}-day veto window</strong>. If they don't veto, all beneficiary packets will be delivered automatically.</p>
        <p>Only do this if you have reason to believe ${escapeHtml(ownerName)} cannot respond. Add brief notes about why (optional but helpful):</p>
        <form method="POST" action="/api/legacy-plan/early-trigger-request">
          <input type="hidden" name="token" value="${escapeHtml(token)}">
          <label>Notes (optional)<textarea name="notes" rows="5" placeholder="e.g., Hospitalized, unable to communicate; family has confirmed; etc."></textarea></label>
          <button type="submit" class="danger" style="background:#dc2626">Send Early-Trigger Request</button>
        </form>
      `));
    } catch (e) {
      console.error("Early trigger GET error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2>`));
    }
  });

  app.post("/api/slip39/sandbox/generate", async (req: any, res) => {
    try {
      const Slip39 = (await import("slip39")).default;
      const bip39 = await import("bip39");

      const wordCount = req.body?.wordCount === 12 ? 12 : 24;
      const providedSeed = typeof req.body?.testSeedPhrase === "string" ? req.body.testSeedPhrase.trim() : "";
      const passphrase = typeof req.body?.passphrase === "string" ? req.body.passphrase : "";
      const groupsInput = Array.isArray(req.body?.groups) ? req.body.groups : [];
      const groupThreshold = Number(req.body?.groupThreshold) || 1;

      let mnemonic: string;
      if (providedSeed) {
        if (!bip39.validateMnemonic(providedSeed)) {
          return res.status(400).json({ message: "The test phrase you entered isn't a valid BIP-39 mnemonic. Use the Generate button for a fresh test phrase." });
        }
        mnemonic = providedSeed;
      } else {
        const strength = wordCount === 24 ? 256 : 128;
        mnemonic = bip39.generateMnemonic(strength);
      }

      const masterSecretHex = bip39.mnemonicToEntropy(mnemonic);
      const masterSecret = Buffer.from(masterSecretHex, "hex");

      const groups: Array<[number, number, string]> = groupsInput
        .filter((g: any) => g && typeof g === "object")
        .map((g: any, i: number) => {
          const memberThreshold = Math.max(1, Math.min(16, Number(g.memberThreshold) || 1));
          const memberCount = Math.max(memberThreshold, Math.min(16, Number(g.memberCount) || 1));
          const label = String(g.label || `Group ${i + 1}`).slice(0, 60);
          if (memberThreshold === 1 && memberCount > 1) {
            return [1, 1, label] as [number, number, string];
          }
          return [memberThreshold, memberCount, label] as [number, number, string];
        });

      if (groups.length === 0) {
        return res.status(400).json({ message: "At least one group is required." });
      }
      if (groupThreshold > groups.length) {
        return res.status(400).json({ message: `Group threshold (${groupThreshold}) cannot exceed the number of groups (${groups.length}).` });
      }

      const slip = (Slip39 as any).fromArray(masterSecret, {
        passphrase,
        threshold: groupThreshold,
        groups,
        title: "CryptoOwnBank SLIP-39 Sandbox",
      });

      const shards: Array<{ groupIndex: number; groupLabel: string; memberIndex: number; mnemonic: string }> = [];
      const root = slip.root;
      root.children.forEach((groupNode: any, gi: number) => {
        if (groupNode.mnemonic) {
          shards.push({ groupIndex: gi, groupLabel: groupNode.description || `Group ${gi + 1}`, memberIndex: 0, mnemonic: groupNode.mnemonic });
        } else if (Array.isArray(groupNode.children)) {
          groupNode.children.forEach((memberNode: any, mi: number) => {
            shards.push({ groupIndex: gi, groupLabel: groupNode.description || groups[gi][2], memberIndex: mi, mnemonic: memberNode.mnemonic });
          });
        }
      });

      res.json({
        ok: true,
        testMnemonic: mnemonic,
        wordCount,
        groupThreshold,
        groups: groups.map((g, i) => ({ label: g[2], memberThreshold: g[0], memberCount: g[1], groupIndex: i })),
        shards,
        notice: "TEST DATA ONLY — this mnemonic was generated by the sandbox and controls no real wallet. Never paste a real seed phrase here.",
      });
    } catch (e: any) {
      console.error("SLIP-39 sandbox generate error:", e);
      res.status(500).json({ message: e?.message || "Sandbox generation failed" });
    }
  });

  app.post("/api/slip39/sandbox/recover", async (req: any, res) => {
    try {
      const Slip39 = (await import("slip39")).default;
      const bip39 = await import("bip39");

      const shards = Array.isArray(req.body?.shards)
        ? req.body.shards.map((s: any) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ")).filter((s: string) => s.length > 0)
        : [];
      const passphrase = typeof req.body?.passphrase === "string" ? req.body.passphrase : "";

      if (shards.length === 0) {
        return res.status(400).json({ message: "Provide at least one shard to attempt recovery." });
      }

      const sharesArrays = shards.map((s: string) => s.split(" "));

      try {
        const recovered = (Slip39 as any).recoverSecret(sharesArrays, passphrase);
        const hex = Buffer.from(recovered).toString("hex");
        let mnemonic: string | null = null;
        try { mnemonic = bip39.entropyToMnemonic(hex); } catch { mnemonic = null; }
        return res.json({
          ok: true,
          recoveredEntropyHex: hex,
          recoveredMnemonic: mnemonic,
          shardsUsed: shards.length,
          notice: "TEST DATA ONLY — recovered from sandbox shards.",
        });
      } catch (err: any) {
        return res.status(400).json({
          ok: false,
          message: err?.message || "Could not recover the secret with the shards provided. This is the expected result if you have fewer shards than the threshold, or if any shard is mistyped.",
        });
      }
    } catch (e: any) {
      console.error("SLIP-39 sandbox recover error:", e);
      res.status(500).json({ message: e?.message || "Sandbox recovery failed" });
    }
  });

  app.post("/api/legacy-plan/early-trigger-request", express.urlencoded({ extended: true }) as any, async (req: any, res) => {
    try {
      const token = String(req.body.token || "");
      const notes = String(req.body.notes || "").slice(0, 2000);
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const plan = await storage.getLegacyPlanByEarlyTriggerRequestToken(token);
      if (!plan) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2>`));
      if (plan.status === "triggered") return res.send(htmlPage("Already triggered", `<h2>Already triggered</h2>`));
      if (plan.earlyTriggerRequestedAt && !plan.earlyTriggerVetoedAt) return res.send(htmlPage("Already requested", `<h2>Already requested</h2>`));

      const vetoToken = crypto.randomUUID().replace(/-/g, "");
      const requestedAt = new Date();
      const vetoDays = plan.earlyTriggerVetoDays || 30;
      await storage.updateLegacyPlan(plan.id, {
        earlyTriggerRequestedAt: requestedAt,
        earlyTriggerVetoToken: vetoToken,
        earlyTriggerVetoedAt: null,
        earlyTriggerRequestNotes: notes || null,
      } as any);
      const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
      const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "the plan owner";
      const ownerEmail = owner?.email || "";
      const vetoUrl = `https://cryptoownbank.com/api/legacy-plan/veto-early-trigger?token=${vetoToken}`;
      const deadline = new Date(requestedAt.getTime() + vetoDays * 86400000);
      try {
        const { sendEarlyTriggerVetoToOwner } = await import("../email");
        if (ownerEmail) await sendEarlyTriggerVetoToOwner(ownerEmail, ownerName, plan.secondaryContactName || "your secondary contact", notes || null, vetoUrl, vetoDays, deadline);
      } catch (e) { console.error("Failed to email owner veto link:", e); }
      res.send(htmlPage("Request sent", `<h2 class="success">Request sent</h2><p>${escapeHtml(ownerName)} has been notified and has until <strong>${escapeHtml(deadline.toLocaleString())}</strong> to veto. If they don't veto, the plan will trigger automatically.</p><p class="muted">Thank you for handling this carefully.</p>`));
    } catch (e) {
      console.error("Early trigger POST error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2>`));
    }
  });

  app.get("/api/legacy-plan/veto-early-trigger", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const plan = await storage.getLegacyPlanByEarlyTriggerVetoToken(token);
      if (!plan) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2><p>This veto link is no longer valid.</p>`));
      if (plan.status === "triggered") return res.send(htmlPage("Already triggered", `<h2>Too late</h2><p>The plan has already triggered. Vetoing is no longer possible. Contact support if this was a mistake.</p>`));
      if (plan.earlyTriggerVetoedAt) return res.send(htmlPage("Already vetoed", `<h2 class="success">Already vetoed</h2><p>You already vetoed this request. Your plan is fine.</p>`));
      const now = new Date();
      const nextCheckIn = new Date(now.getTime() + (plan.checkInFrequency === "weekly" ? 7 : plan.checkInFrequency === "biweekly" ? 14 : plan.checkInFrequency === "quarterly" ? 90 : 30) * 86400000);
      await storage.updateLegacyPlan(plan.id, {
        earlyTriggerVetoedAt: now,
        earlyTriggerVetoToken: null,
        earlyTriggerRequestedAt: null,
        earlyTriggerRequestNotes: null,
        lastCheckIn: now,
        nextCheckInDue: nextCheckIn,
        graceStartedAt: null,
        status: "active",
      } as any);
      await storage.createLegacyCheckIn(plan.id);
      res.send(htmlPage("Vetoed", `<h2 class="success">Vetoed — your plan is safe</h2><p>The early-trigger request has been cancelled, and we've also recorded this as a check-in (your dead-man switch has been reset).</p><p class="muted">If your secondary contact keeps making false requests, consider updating them in your dashboard.</p>`));
    } catch (e) {
      console.error("Veto early trigger error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2>`));
    }
  });

  app.get("/api/legacy-beneficiaries/acknowledge-delivery", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const beneficiary = await storage.getLegacyBeneficiaryByDeliveryAckToken(token);
      if (!beneficiary) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2><p>This acknowledgment link has already been used or is no longer valid.</p>`));
      if (beneficiary.deliveryAcknowledgedAt) {
        return res.send(htmlPage("Already acknowledged", `<h2 class="success">Already acknowledged</h2><p>You've already confirmed receipt. Thank you.</p>`));
      }
      await storage.updateLegacyBeneficiary(beneficiary.id, {
        deliveryAcknowledgedAt: new Date(),
        deliveryAckToken: null,
      } as any);
      res.send(htmlPage("Acknowledged", `<h2 class="success">Receipt acknowledged</h2><p>Thank you, ${escapeHtml(beneficiary.name)}. We've recorded that you received your packet and have access to its contents.</p><p class="muted">Your share will not be redistributed. If you ever need to reach out, contact the plan owner's family directly.</p>`));
    } catch (e) {
      console.error("Acknowledge delivery error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2><p>Please try the link again.</p>`));
    }
  });

  app.post("/api/legacy-beneficiaries/:id/send-heartbeat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const existing = beneficiaries.find(b => b.id === req.params.id);
      if (!existing) return res.status(403).json({ message: "Not your beneficiary" });
      const heartbeatToken = makeToken();
      const now = new Date();
      const updated = await storage.updateLegacyBeneficiary(req.params.id, {
        heartbeatToken,
        heartbeatSentAt: now,
        heartbeatRespondedAt: null,
      } as any);
      try {
        const ownerName = await getOwnerDisplayName(userId);
        const respondUrl = `https://cryptoownbank.com/api/legacy-beneficiaries/heartbeat?token=${heartbeatToken}`;
        await sendBeneficiaryHeartbeat(existing.email, existing.name, ownerName, respondUrl);
      } catch (e) { console.error("Heartbeat send failed:", e); }
      res.json({ success: true });
    } catch (error) {
      console.error("Send heartbeat error:", error);
      res.status(500).json({ message: "Failed to send heartbeat" });
    }
  });

  app.post("/api/legacy-beneficiaries/:id/send-passphrase-verification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const existing = beneficiaries.find(b => b.id === req.params.id);
      if (!existing) return res.status(403).json({ message: "Not your beneficiary" });
      if (!(existing as any).encryptedVault) return res.status(400).json({ message: "This beneficiary has no encrypted vault — nothing to verify" });
      if (!(existing as any).vaultVerificationCapsule) return res.status(400).json({ message: "Verification capsule missing — please re-encrypt the vault to enable passphrase verification" });
      const token = makeToken();
      const now = new Date();
      await storage.updateLegacyBeneficiary(req.params.id, {
        vaultVerificationToken: token,
        vaultVerificationSentAt: now,
      } as any);
      try {
        const ownerName = await getOwnerDisplayName(userId);
        const verifyUrl = `https://cryptoownbank.com/verify-passphrase?token=${token}`;
        await sendBeneficiaryPassphraseVerification(existing.email, existing.name, ownerName, verifyUrl);
      } catch (e) { console.error("Passphrase verification send failed:", e); }
      res.json({ success: true });
    } catch (error) {
      console.error("Send passphrase verification error:", error);
      res.status(500).json({ message: "Failed to send verification" });
    }
  });

  app.post("/api/legacy-beneficiaries/:id/generate-test-verification-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const existing = beneficiaries.find(b => b.id === req.params.id);
      if (!existing) return res.status(403).json({ message: "Not your beneficiary" });
      if (!(existing as any).encryptedVault) return res.status(400).json({ message: "This beneficiary has no encrypted vault — nothing to test" });
      if (!(existing as any).vaultVerificationCapsule) return res.status(400).json({ message: "Verification capsule missing — please re-encrypt the vault to enable passphrase verification" });
      const token = makeToken();
      await storage.updateLegacyBeneficiary(req.params.id, {
        vaultVerificationToken: token,
      } as any);
      const origin = (req.headers["x-forwarded-host"] ? `https://${req.headers["x-forwarded-host"]}` : `${req.protocol}://${req.get("host")}`);
      const verifyUrl = `${origin}/verify-passphrase/${token}?test=1`;
      res.json({ verifyUrl });
    } catch (error) {
      console.error("Generate test verification link error:", error);
      res.status(500).json({ message: "Failed to generate test link" });
    }
  });

  app.get("/api/legacy-plan/passphrase-verify/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "");
      if (token.length < 16) return res.status(404).json({ message: "Invalid link" });
      const beneficiary = await storage.getLegacyBeneficiaryByVaultVerificationToken(token);
      if (!beneficiary) return res.status(404).json({ message: "Invalid or expired verification link" });
      if (!(beneficiary as any).vaultVerificationCapsule) return res.status(400).json({ message: "No verification capsule on file" });
      const plan = await storage.getLegacyPlanById((beneficiary as any).legacyPlanId);
      const ownerName = plan ? await getOwnerDisplayName(plan.userId) : "the plan owner";
      res.json({
        capsule: (beneficiary as any).vaultVerificationCapsule,
        beneficiaryName: beneficiary.name,
        ownerName,
      });
    } catch (error) {
      console.error("Passphrase verify GET error:", error);
      res.status(500).json({ message: "Failed to load verification" });
    }
  });

  app.post("/api/legacy-plan/passphrase-verify/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "");
      if (token.length < 16) return res.status(404).json({ message: "Invalid link" });
      const beneficiary = await storage.getLegacyBeneficiaryByVaultVerificationToken(token);
      if (!beneficiary) return res.status(404).json({ message: "Invalid or expired verification link" });
      const success = req.body?.success === true;
      const isTest = req.body?.isTest === true;
      if (isTest) {
        await storage.updateLegacyBeneficiary(beneficiary.id, {
          vaultVerificationToken: null,
        } as any);
      } else if (success) {
        await storage.updateLegacyBeneficiary(beneficiary.id, {
          vaultVerifiedAt: new Date(),
          vaultVerificationToken: null,
        } as any);
      }
      res.json({ success: true, testMode: isTest });
    } catch (error) {
      console.error("Passphrase verify POST error:", error);
      res.status(500).json({ message: "Failed to record verification" });
    }
  });

  app.post("/api/legacy-beneficiaries/:id/clear-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      if (!beneficiaries.find(b => b.id === req.params.id)) return res.status(403).json({ message: "Not your beneficiary" });
      await storage.updateLegacyBeneficiary(req.params.id, {
        pendingChangeRequest: null,
        pendingChangeReviewedAt: new Date(),
      } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear feedback error:", error);
      res.status(500).json({ message: "Failed to clear" });
    }
  });

  function htmlPage(title: string, body: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;color:#0f172a}.card{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:36px;box-shadow:0 4px 14px rgba(0,0,0,0.04)}h1{color:#00A4E4;margin:0 0 8px;font-size:22px}h2{color:#0f172a;margin:0 0 16px;font-size:18px}p{line-height:1.7;color:#334155;margin:10px 0;font-size:15px}.muted{color:#64748b;font-size:13px}.success{color:#16a34a;font-weight:600}.danger{color:#dc2626;font-weight:600}textarea,input{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;box-sizing:border-box;margin-top:6px}label{font-size:14px;font-weight:600;color:#0f172a;display:block;margin-top:14px}button{background:#00A4E4;color:#fff;border:0;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer;margin-top:16px}.opt{display:flex;align-items:flex-start;gap:8px;margin:8px 0;font-size:14px;color:#334155}</style></head><body><div class="card"><h1>CryptoOwnBank</h1>${body}</div></body></html>`;
  }

  app.get("/api/legacy-beneficiaries/confirm", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2><p>This confirmation link is missing its token.</p>`));
      const beneficiary = await storage.getLegacyBeneficiaryByConfirmationToken(token);
      if (!beneficiary) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2><p>This confirmation link has already been used or is no longer valid. If you believe this is a mistake, contact the person who added you.</p>`));
      if (beneficiary.confirmationExpiresAt && new Date() > new Date(beneficiary.confirmationExpiresAt)) {
        return res.status(410).send(htmlPage("Expired", `<h2>This link has expired</h2><p>Please ask the person who added you to resend the confirmation.</p>`));
      }
      if (beneficiary.confirmationStatus === "confirmed") {
        return res.send(htmlPage("Already confirmed", `<h2 class="success">Already confirmed</h2><p>You've already confirmed this designation. Thank you.</p>`));
      }
      const plan = await db.select().from(legacyPlans).where(eq(legacyPlans.id, beneficiary.legacyPlanId)).limit(1);
      const ownerName = plan[0] ? await getOwnerDisplayName(plan[0].userId) : "the plan owner";
      await storage.updateLegacyBeneficiary(beneficiary.id, {
        confirmationStatus: "confirmed",
        confirmedAt: new Date(),
        confirmationToken: null,
      } as any);
      if (plan[0]) {
        try {
          const ownerEmail = (await storage.getUser(plan[0].userId) as any)?.email;
          if (ownerEmail) {
            const manageUrl = "https://cryptoownbank.com/legacy-plan";
            await sendBeneficiaryFeedbackToOwner(ownerEmail, ownerName, beneficiary.name, beneficiary.email, "confirmed", null, manageUrl);
          }
        } catch (e) { console.error("Owner notify failed:", e); }
      }
      res.send(htmlPage("Confirmed", `<h2 class="success">Thank you, ${escapeHtml(beneficiary.name)}</h2><p>You've confirmed your designation on ${escapeHtml(ownerName)}'s Legacy Plan. They've been notified.</p><p class="muted">No further action is needed. We may send an annual check-in to verify you're still reachable. If anything changes, contact ${escapeHtml(ownerName)} directly.</p>`));
    } catch (e) {
      console.error("Confirm error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2><p>Please try again or contact the person who added you.</p>`));
    }
  });

  app.get("/api/legacy-beneficiaries/decline", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const beneficiary = await storage.getLegacyBeneficiaryByConfirmationToken(token);
      if (!beneficiary) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2><p>This link has already been used or is no longer valid.</p>`));
      res.send(htmlPage("Decline", `<h2>Decline this designation</h2><p>If you don't want to be a beneficiary on this Legacy Plan, let us know why (optional). The plan owner will be notified so they can reassign or remove you.</p><form method="POST" action="/api/legacy-beneficiaries/decline"><input type="hidden" name="token" value="${escapeHtml(token)}"><label>Reason (optional)<textarea name="reason" rows="4" placeholder="e.g. I'd rather not have this responsibility"></textarea></label><button type="submit" class="danger" style="background:#dc2626">Confirm Decline</button></form>`));
    } catch (e) {
      console.error("Decline GET error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2>`));
    }
  });

  app.post("/api/legacy-beneficiaries/decline", express.urlencoded({ extended: true }) as any, async (req: any, res) => {
    try {
      const token = String(req.body.token || "");
      const reason = String(req.body.reason || "").slice(0, 1000);
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const beneficiary = await storage.getLegacyBeneficiaryByConfirmationToken(token);
      if (!beneficiary) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2>`));
      const plan = await db.select().from(legacyPlans).where(eq(legacyPlans.id, beneficiary.legacyPlanId)).limit(1);
      await storage.updateLegacyBeneficiary(beneficiary.id, {
        confirmationStatus: "declined",
        declinedAt: new Date(),
        declineReason: reason || null,
        confirmationToken: null,
      } as any);
      if (plan[0]) {
        try {
          const ownerEmail = (await storage.getUser(plan[0].userId) as any)?.email;
          const ownerName = await getOwnerDisplayName(plan[0].userId);
          if (ownerEmail) {
            const manageUrl = "https://cryptoownbank.com/legacy-plan";
            await sendBeneficiaryFeedbackToOwner(ownerEmail, ownerName, beneficiary.name, beneficiary.email, "declined", reason || null, manageUrl);
          }
        } catch (e) { console.error("Owner notify failed:", e); }
      }
      res.send(htmlPage("Declined", `<h2>Declined</h2><p>The plan owner has been notified. Thank you for letting us know.</p><p class="muted">If this was a mistake, contact the plan owner so they can re-add you.</p>`));
    } catch (e) {
      console.error("Decline POST error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2>`));
    }
  });

  app.get("/api/legacy-beneficiaries/heartbeat", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const beneficiary = await storage.getLegacyBeneficiaryByHeartbeatToken(token);
      if (!beneficiary) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2><p>This check-in link has already been used or expired.</p>`));
      const plan = await db.select().from(legacyPlans).where(eq(legacyPlans.id, beneficiary.legacyPlanId)).limit(1);
      const ownerName = plan[0] ? await getOwnerDisplayName(plan[0].userId) : "the plan owner";
      res.send(htmlPage("Annual Check-In", `<h2>Annual check-in</h2><p>Hi ${escapeHtml(beneficiary.name)} — please tell ${escapeHtml(ownerName)} if everything is still accurate.</p><form method="POST" action="/api/legacy-beneficiaries/heartbeat"><input type="hidden" name="token" value="${escapeHtml(token)}"><label><input type="radio" name="response" value="ok" checked> Yes — I'm still reachable, no changes needed</label><label><input type="radio" name="response" value="changes"> I have changes to report</label><label>Notes / changes (optional)<textarea name="notes" rows="4" placeholder="e.g. New email is..., I'd like to be removed, my relationship is now spouse, etc."></textarea></label><button type="submit">Submit Response</button></form><p class="muted">Whatever you submit goes directly to ${escapeHtml(ownerName)}. They make the changes — you don't need to.</p>`));
    } catch (e) {
      console.error("Heartbeat GET error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2>`));
    }
  });

  app.post("/api/legacy-beneficiaries/heartbeat", express.urlencoded({ extended: true }) as any, async (req: any, res) => {
    try {
      const token = String(req.body.token || "");
      const response = String(req.body.response || "ok");
      const notes = String(req.body.notes || "").slice(0, 2000);
      if (!token) return res.status(400).send(htmlPage("Invalid", `<h2>Invalid link</h2>`));
      const beneficiary = await storage.getLegacyBeneficiaryByHeartbeatToken(token);
      if (!beneficiary) return res.status(404).send(htmlPage("Not found", `<h2>Link not found</h2>`));
      const plan = await db.select().from(legacyPlans).where(eq(legacyPlans.id, beneficiary.legacyPlanId)).limit(1);
      const hasChanges = response === "changes" || notes.trim().length > 0;
      const updates: any = {
        heartbeatRespondedAt: new Date(),
        heartbeatToken: null,
      };
      if (hasChanges) {
        updates.pendingChangeRequest = `${response === "changes" ? "Changes requested" : "Confirmed reachable"}\n${notes ? `\nNotes:\n${notes}` : ""}`.trim();
        updates.pendingChangeReviewedAt = null;
      }
      await storage.updateLegacyBeneficiary(beneficiary.id, updates);
      if (plan[0]) {
        try {
          const ownerEmail = (await storage.getUser(plan[0].userId) as any)?.email;
          const ownerName = await getOwnerDisplayName(plan[0].userId);
          if (ownerEmail) {
            const manageUrl = "https://cryptoownbank.com/legacy-plan";
            await sendBeneficiaryFeedbackToOwner(ownerEmail, ownerName, beneficiary.name, beneficiary.email, hasChanges ? "changes" : "heartbeat", notes || null, manageUrl);
          }
        } catch (e) { console.error("Owner notify failed:", e); }
      }
      res.send(htmlPage("Submitted", `<h2 class="success">Response received</h2><p>Thank you. The plan owner has been notified.</p>`));
    } catch (e) {
      console.error("Heartbeat POST error:", e);
      res.status(500).send(htmlPage("Error", `<h2>Something went wrong</h2>`));
    }
  });

  app.delete("/api/legacy-beneficiaries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan requires Pro tier or Legacy Plan add-on ($9.99/mo)" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(403).json({ message: "No legacy plan found" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      if (!beneficiaries.find(b => b.id === req.params.id)) return res.status(403).json({ message: "Not your beneficiary" });
      await storage.deleteLegacyBeneficiary(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete beneficiary error:", error);
      res.status(500).json({ message: "Failed to delete beneficiary" });
    }
  });

  // ============================================================
  // Wallet-first assignments (M:N wallet ↔ beneficiary)
  // ============================================================
  const VALID_RECOVERY_MODES = ["solo", "joint_threshold", "shared"];

  app.get("/api/legacy-plan/wallet-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.json([]);
      const assignments = await storage.getLegacyWalletAssignments(plan.id);
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const enriched = assignments.map(a => ({
        ...a,
        beneficiaries: beneficiaries.filter(b => b.assignmentId === a.id).map(b => ({
          id: b.id,
          name: b.name,
          email: b.email,
          relationship: b.relationship,
          pieceDescription: b.pieceDescription,
          privateNote: b.privateNote,
          confirmationStatus: b.confirmationStatus,
          vaultVerifiedAt: b.vaultVerifiedAt,
        })),
      }));
      res.json(enriched);
    } catch (e) {
      console.error("List wallet assignments error:", e);
      res.status(500).json({ message: "Failed to load wallet assignments" });
    }
  });

  app.post("/api/legacy-plan/wallet-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "Create a legacy plan first" });
      const { walletId, walletLabel, walletType, chain, recoveryMode, thresholdK, thresholdN, wishesText, walletAssetSummary, autoAssigned } = req.body;
      if (!walletLabel) return res.status(400).json({ message: "walletLabel required" });
      const mode = VALID_RECOVERY_MODES.includes(recoveryMode) ? recoveryMode : "solo";
      const assignment = await storage.createLegacyWalletAssignment({
        legacyPlanId: plan.id,
        walletId: walletId || null,
        walletLabel: String(walletLabel).slice(0, 200),
        walletType: walletType && VALID_WALLET_TYPES.includes(walletType) ? walletType : null,
        chain: chain ? String(chain).slice(0, 20) : null,
        recoveryMode: mode,
        thresholdK: mode === "joint_threshold" && Number.isFinite(Number(thresholdK)) ? Number(thresholdK) : null,
        thresholdN: mode === "joint_threshold" && Number.isFinite(Number(thresholdN)) ? Number(thresholdN) : null,
        wishesText: wishesText ? String(wishesText).slice(0, 5000) : null,
        walletAssetSummary: walletAssetSummary ? String(walletAssetSummary).slice(0, 10000) : null,
        autoAssigned: !!autoAssigned,
      } as any);
      res.json(assignment);
    } catch (e) {
      console.error("Create wallet assignment error:", e);
      res.status(500).json({ message: "Failed to create wallet assignment" });
    }
  });

  app.patch("/api/legacy-plan/wallet-assignments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const existing = await storage.getLegacyWalletAssignment(req.params.id);
      if (!existing || existing.legacyPlanId !== plan.id) return res.status(403).json({ message: "Not your assignment" });
      const updates: Record<string, unknown> = {};
      const b = req.body;
      if (b.walletLabel !== undefined) updates.walletLabel = String(b.walletLabel).slice(0, 200);
      if (b.walletType !== undefined) updates.walletType = b.walletType && VALID_WALLET_TYPES.includes(b.walletType) ? b.walletType : null;
      if (b.chain !== undefined) updates.chain = b.chain ? String(b.chain).slice(0, 20) : null;
      if (b.recoveryMode !== undefined) {
        const mode = VALID_RECOVERY_MODES.includes(b.recoveryMode) ? b.recoveryMode : "solo";
        updates.recoveryMode = mode;
        if (mode !== "joint_threshold") {
          updates.thresholdK = null;
          updates.thresholdN = null;
        }
      }
      if (b.thresholdK !== undefined) updates.thresholdK = Number.isFinite(Number(b.thresholdK)) ? Number(b.thresholdK) : null;
      if (b.thresholdN !== undefined) updates.thresholdN = Number.isFinite(Number(b.thresholdN)) ? Number(b.thresholdN) : null;
      if (b.wishesText !== undefined) updates.wishesText = b.wishesText ? String(b.wishesText).slice(0, 5000) : null;
      if (b.walletAssetSummary !== undefined) updates.walletAssetSummary = b.walletAssetSummary ? String(b.walletAssetSummary).slice(0, 10000) : null;
      if (b.markReviewed === true) {
        updates.reviewedAt = new Date();
        updates.autoAssigned = false;
      }
      const result = await storage.updateLegacyWalletAssignment(req.params.id, updates as any);
      res.json(result);
    } catch (e) {
      console.error("Update wallet assignment error:", e);
      res.status(500).json({ message: "Failed to update wallet assignment" });
    }
  });

  app.delete("/api/legacy-plan/wallet-assignments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const existing = await storage.getLegacyWalletAssignment(req.params.id);
      if (!existing || existing.legacyPlanId !== plan.id) return res.status(403).json({ message: "Not your assignment" });
      await storage.deleteLegacyWalletAssignment(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error("Delete wallet assignment error:", e);
      res.status(500).json({ message: "Failed to delete wallet assignment" });
    }
  });

  // Link/unlink a beneficiary to a wallet assignment + edit per-person packet
  app.post("/api/legacy-plan/wallet-assignments/:id/beneficiaries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const assignment = await storage.getLegacyWalletAssignment(req.params.id);
      if (!assignment || assignment.legacyPlanId !== plan.id) return res.status(403).json({ message: "Not your assignment" });
      const { beneficiaryId, pieceDescription, privateNote } = req.body;
      if (!beneficiaryId) return res.status(400).json({ message: "beneficiaryId required" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const target = beneficiaries.find(b => b.id === beneficiaryId);
      if (!target) return res.status(404).json({ message: "Beneficiary not found" });
      // Idempotent + non-clobbering: if this person already has a row for this assignment, update it.
      // Otherwise, if their selected row is unassigned or matches this assignment, use it.
      // If their selected row is linked to a DIFFERENT assignment, clone it so both links survive.
      const existingForThisAssignment = beneficiaries.find(b =>
        (b.email || "").toLowerCase() === (target.email || "").toLowerCase() && b.assignmentId === assignment.id
      );
      let rowIdToUpdate = beneficiaryId;
      if (existingForThisAssignment) {
        rowIdToUpdate = existingForThisAssignment.id;
      } else if (target.assignmentId && target.assignmentId !== assignment.id) {
        // Clone — preserves the other wallet's link
        const { id, createdAt, updatedAt, confirmationToken, heartbeatToken, vaultVerificationToken, deliveryAckToken, vaultVerifiedAt, vaultVerificationSentAt, ...cloneable } = target as any;
        const cloned = await storage.createLegacyBeneficiary({
          ...cloneable,
          assignmentId: assignment.id,
          pieceDescription: null,
          privateNote: null,
        } as any);
        rowIdToUpdate = cloned.id;
      }
      const updates: Record<string, unknown> = { assignmentId: assignment.id };
      if (pieceDescription !== undefined) updates.pieceDescription = pieceDescription ? String(pieceDescription).slice(0, 2000) : null;
      if (privateNote !== undefined) updates.privateNote = privateNote ? String(privateNote).slice(0, 5000) : null;
      const result = await storage.updateLegacyBeneficiary(rowIdToUpdate, updates as any);
      res.json(result);
    } catch (e) {
      console.error("Link beneficiary error:", e);
      res.status(500).json({ message: "Failed to link beneficiary" });
    }
  });

  app.delete("/api/legacy-plan/wallet-assignments/:id/beneficiaries/:beneficiaryId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!await hasLegacyAccess(userId)) return res.status(403).json({ message: "Legacy Plan access required" });
      const plan = await storage.getLegacyPlan(userId);
      if (!plan) return res.status(404).json({ message: "No legacy plan found" });
      const assignment = await storage.getLegacyWalletAssignment(req.params.id);
      if (!assignment || assignment.legacyPlanId !== plan.id) return res.status(403).json({ message: "Not your assignment" });
      const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
      const target = beneficiaries.find(b => b.id === req.params.beneficiaryId);
      if (!target || target.assignmentId !== assignment.id) return res.status(404).json({ message: "Beneficiary not on this assignment" });
      await storage.updateLegacyBeneficiary(req.params.beneficiaryId, { assignmentId: null, pieceDescription: null } as any);
      res.json({ success: true });
    } catch (e) {
      console.error("Unlink beneficiary error:", e);
      res.status(500).json({ message: "Failed to unlink beneficiary" });
    }
  });

  // ============================================================
  // Family Collaborative Mode v1 — read-only seats
  // ============================================================
  const VALID_FAMILY_ROLES = ["viewer", "proposer"];

  app.get("/api/family-seats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seats = await storage.getFamilySeats(userId);
      res.json(seats.map(s => ({ ...s, inviteToken: undefined })));
    } catch (e) {
      console.error("List family seats error:", e);
      res.status(500).json({ message: "Failed to list family seats" });
    }
  });

  app.post("/api/family-seats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { seatEmail, seatName, relationship, role } = req.body;
      if (!seatEmail || !seatName) return res.status(400).json({ message: "seatEmail and seatName required" });
      const cleanEmail = String(seatEmail).toLowerCase().trim().slice(0, 255);
      const cleanName = String(seatName).slice(0, 255);
      const cleanRole = VALID_FAMILY_ROLES.includes(role) ? role : "viewer";
      const existingSeats = await storage.getFamilySeats(userId);
      if (existingSeats.length >= 10) return res.status(400).json({ message: "Family seat limit reached (10)" });
      if (existingSeats.find(s => s.seatEmail.toLowerCase() === cleanEmail)) return res.status(409).json({ message: "You've already invited this email" });
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const seat = await storage.createFamilySeat({
        ownerUserId: userId,
        seatEmail: cleanEmail,
        seatName: cleanName,
        relationship: relationship ? String(relationship).slice(0, 100) : null,
        role: cleanRole,
        status: "invited",
        inviteToken,
      } as any);
      // Send invite email
      try {
        const owner = (req as any).user.dbUser || await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
        const ownerName = owner ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email : "Someone";
        const acceptUrl = `https://cryptoownbank.com/family/accept/${inviteToken}`;
        await sendEmail(cleanEmail, `${ownerName} invited you to view their CryptoOwnBank account`, `
          <p>Hi ${cleanName},</p>
          <p><strong>${ownerName}</strong> has invited you to be a <em>${cleanRole === "viewer" ? "Viewer" : "Proposer"}</em> on their CryptoOwnBank family seat.</p>
          <p>${cleanRole === "viewer" ? "You'll be able to see their portfolio in real time, but you won't be able to move funds or change anything. This is a read-only window." : "You'll be able to view their portfolio and propose buys/swaps, but they'll have to sign every transaction in their own wallet."}</p>
          <p style="margin:24px 0"><a href="${acceptUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Accept Invite</a></p>
          <p style="color:#64748b;font-size:13px">If you don't have a CryptoOwnBank account yet, you'll be asked to create one with this email address. ${ownerName} can revoke access at any time.</p>
        `);
      } catch (emailErr) {
        console.error("Failed to send family seat invite:", emailErr);
      }
      res.json({ ...seat, inviteToken: undefined });
    } catch (e) {
      console.error("Create family seat error:", e);
      res.status(500).json({ message: "Failed to invite family member" });
    }
  });

  app.delete("/api/family-seats/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seat = await storage.getFamilySeat(req.params.id);
      if (!seat || seat.ownerUserId !== userId) return res.status(403).json({ message: "Not your seat" });
      await storage.updateFamilySeat(seat.id, { status: "revoked", revokedAt: new Date() } as any);
      res.json({ success: true });
    } catch (e) {
      console.error("Revoke family seat error:", e);
      res.status(500).json({ message: "Failed to revoke seat" });
    }
  });

  app.patch("/api/family-seats/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seat = await storage.getFamilySeat(req.params.id);
      if (!seat || seat.ownerUserId !== userId) return res.status(403).json({ message: "Not your seat" });
      const updates: Record<string, unknown> = {};
      if (req.body.role !== undefined) updates.role = VALID_FAMILY_ROLES.includes(req.body.role) ? req.body.role : "viewer";
      if (req.body.relationship !== undefined) updates.relationship = req.body.relationship ? String(req.body.relationship).slice(0, 100) : null;
      const result = await storage.updateFamilySeat(seat.id, updates as any);
      res.json({ ...result, inviteToken: undefined });
    } catch (e) {
      console.error("Update family seat error:", e);
      res.status(500).json({ message: "Failed to update seat" });
    }
  });

  // Public: look up an invite by token (for the accept page UI)
  app.get("/api/family-seats/invite/:token", async (req, res) => {
    try {
      const seat = await storage.getFamilySeatByToken(req.params.token);
      if (!seat || seat.status !== "invited") return res.status(404).json({ message: "Invite not found or already used" });
      const [owner] = await db.select().from(users).where(eq(users.id, seat.ownerUserId));
      const ownerName = owner ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email : "Someone";
      res.json({
        seatId: seat.id,
        seatEmail: seat.seatEmail,
        seatName: seat.seatName,
        relationship: seat.relationship,
        role: seat.role,
        ownerName,
        ownerEmail: owner?.email || null,
        status: seat.status,
      });
    } catch (e) {
      console.error("Lookup invite error:", e);
      res.status(500).json({ message: "Failed to look up invite" });
    }
  });

  // Authenticated: accept an invite (links current user to the seat)
  app.post("/api/family-seats/accept/:token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [me] = await db.select().from(users).where(eq(users.id, userId));
      const seat = await storage.getFamilySeatByToken(req.params.token);
      if (!seat || seat.status !== "invited") return res.status(404).json({ message: "Invite not found or already used" });
      if (me.email && me.email.toLowerCase() !== seat.seatEmail.toLowerCase()) {
        return res.status(403).json({ message: `This invite was sent to ${seat.seatEmail}. Please log in with that email or ask the inviter to send a new one.` });
      }
      const result = await storage.updateFamilySeat(seat.id, {
        seatUserId: userId,
        status: "active",
        acceptedAt: new Date(),
        inviteToken: null,
      } as any);
      res.json({ success: true, seatId: result?.id });
    } catch (e) {
      console.error("Accept invite error:", e);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Authenticated: list seats granted TO me (so the kid sees parents' accounts)
  app.get("/api/family-seats/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seats = await storage.getFamilySeatsForUser(userId);
      const enriched = await Promise.all(seats.map(async s => {
        const [owner] = await db.select().from(users).where(eq(users.id, s.ownerUserId));
        return {
          id: s.id,
          ownerUserId: s.ownerUserId,
          ownerName: owner ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email : "Owner",
          ownerEmail: owner?.email,
          role: s.role,
          relationship: s.relationship,
          acceptedAt: s.acceptedAt,
          lastSeenAt: s.lastSeenAt,
        };
      }));
      res.json(enriched);
    } catch (e) {
      console.error("List my seats error:", e);
      res.status(500).json({ message: "Failed to load family access" });
    }
  });

  // Authenticated: read-only view of an owner's portfolio (gated by active seat)
  app.get("/api/family-seats/:id/view", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seat = await storage.getFamilySeat(req.params.id);
      if (!seat) return res.status(404).json({ message: "Seat not found" });
      if (seat.seatUserId !== userId || seat.status !== "active") return res.status(403).json({ message: "Access denied" });
      await storage.updateFamilySeat(seat.id, { lastSeenAt: new Date() } as any);
      const [owner] = await db.select().from(users).where(eq(users.id, seat.ownerUserId));
      const ownerName = owner ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email : "Owner";
      const ownerWallets = await storage.getWalletsByUser(seat.ownerUserId);
      const ownerPositions = await storage.getPositionsByUser(seat.ownerUserId);
      const ownerBalances = await Promise.all(ownerWallets.map(async w => ({
        wallet: { id: w.id, chain: w.chain, label: w.label, address: w.address.slice(0, 8) + "…" + w.address.slice(-4) },
        balances: await storage.getWalletBalances(w.id),
      })));
      res.json({
        ownerName,
        role: seat.role,
        relationship: seat.relationship,
        positions: ownerPositions,
        wallets: ownerBalances,
      });
    } catch (e) {
      console.error("View family seat error:", e);
      res.status(500).json({ message: "Failed to load view" });
    }
  });

  // ============================================================
  // Family Proposals — kid/seat requests, owner approves
  // ============================================================
  const VALID_ACTION_TYPES = ["send", "dca", "stake", "unstake", "swap", "other"];

  function buildHumanSummary(actionType: string, payload: any, proposerName: string): string {
    const amt = payload?.amount ? `${payload.amount} ${payload.asset || ""}`.trim() : "";
    switch (actionType) {
      case "send":
        return `${proposerName} requests sending ${amt} to ${payload?.destinationLabel || payload?.destination || "a saved address"}`;
      case "dca":
        return `${proposerName} requests starting a DCA: ${amt} ${payload?.frequency ? "every " + payload.frequency : ""} into ${payload?.targetAsset || "a token"}`;
      case "stake":
        return `${proposerName} requests staking ${amt}`;
      case "unstake":
        return `${proposerName} requests unstaking ${amt}`;
      case "swap":
        return `${proposerName} requests swapping ${amt} → ${payload?.toAsset || "another asset"}`;
      case "other":
        return `${proposerName} has a request: ${payload?.description || "(see note)"}`;
      default:
        return `${proposerName} has a request`;
    }
  }

  // Whitelist: addresses the seat may pick from (owner's saved payees + own wallets)
  app.get("/api/family-seats/:id/whitelist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seat = await storage.getFamilySeat(req.params.id);
      if (!seat || seat.seatUserId !== userId || seat.status !== "active") {
        return res.status(403).json({ message: "Access denied" });
      }
      // Owner's wallets (kid can request sends to owner's own wallets)
      const wallets = await storage.getWalletsByUser(seat.ownerUserId);
      const walletAddresses = wallets.map(w => ({
        label: w.label || `${w.chain.toUpperCase()} wallet`,
        address: w.address,
        chain: w.chain,
        source: "wallet" as const,
      }));
      // Owner's saved scheduled-payment payees
      let payeeAddresses: any[] = [];
      try {
        const payees = await db.select().from(scheduledPayments).where(eq(scheduledPayments.userId, seat.ownerUserId));
        const seen = new Set<string>();
        for (const p of payees) {
          const key = `${p.chain}:${p.payeeAddress}`;
          if (seen.has(key)) continue;
          seen.add(key);
          payeeAddresses.push({ label: p.payeeName, address: p.payeeAddress, chain: p.chain, source: "payee" as const });
        }
      } catch (e) { /* ignore if table missing */ }
      res.json({ destinations: [...walletAddresses, ...payeeAddresses] });
    } catch (e) {
      console.error("Whitelist error:", e);
      res.status(500).json({ message: "Failed to load whitelist" });
    }
  });

  // Seat creates a proposal
  app.post("/api/family-proposals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { seatId, actionType, actionLabel, payload, proposerNote } = req.body;
      if (!seatId || !actionType) return res.status(400).json({ message: "seatId and actionType required" });
      if (!VALID_ACTION_TYPES.includes(actionType)) return res.status(400).json({ message: "Invalid actionType" });
      const seat = await storage.getFamilySeat(seatId);
      if (!seat || seat.seatUserId !== userId || seat.status !== "active") return res.status(403).json({ message: "Not your seat" });
      if (seat.role !== "proposer") return res.status(403).json({ message: "Your role is read-only. Ask the owner to upgrade you to Proposer." });

      // For "send" requests, enforce whitelist
      if (actionType === "send") {
        const dest = payload?.destination;
        if (!dest) return res.status(400).json({ message: "Destination is required" });
        const wallets = await storage.getWalletsByUser(seat.ownerUserId);
        const ownerPayees = await db.select().from(scheduledPayments).where(eq(scheduledPayments.userId, seat.ownerUserId)).catch(() => []);
        const allowed = new Set<string>([
          ...wallets.map(w => w.address),
          ...ownerPayees.map(p => p.payeeAddress),
        ]);
        if (!allowed.has(dest)) return res.status(400).json({ message: "Destination is not on the whitelist of saved addresses" });
      }

      const [me] = await db.select().from(users).where(eq(users.id, userId));
      const proposerName = me ? `${me.firstName || ""} ${me.lastName || ""}`.trim() || me.email || seat.seatName : seat.seatName;
      const humanSummary = buildHumanSummary(actionType, payload, proposerName);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72); // 72h

      const proposal = await storage.createFamilyProposal({
        seatId: seat.id,
        ownerUserId: seat.ownerUserId,
        proposedByUserId: userId,
        proposedByName: proposerName,
        actionType,
        actionLabel: String(actionLabel || actionType).slice(0, 100),
        payload: payload || {},
        humanSummary,
        proposerNote: proposerNote ? String(proposerNote).slice(0, 1000) : null,
        expiresAt,
      } as any);

      // Notify owner
      try {
        const [owner] = await db.select().from(users).where(eq(users.id, seat.ownerUserId));
        if (owner?.email) {
          const reviewUrl = `https://cryptoownbank.com/family?tab=requests`;
          const safeProposerName = escapeHtml(proposerName);
          const safeSummary = escapeHtml(humanSummary);
          const safeNote = proposerNote ? escapeHtml(String(proposerNote).slice(0, 500)) : "";
          const safeOwnerFirst = escapeHtml(owner.firstName || "");
          await sendEmail(owner.email, `New request from ${proposerName}`, `
            <p>Hi ${safeOwnerFirst},</p>
            <p><strong>${safeProposerName}</strong> sent you a request on CryptoOwnBank:</p>
            <blockquote style="border-left:4px solid #2563eb;padding:8px 16px;background:#f8fafc;margin:12px 0;border-radius:4px">
              ${safeSummary}
              ${safeNote ? `<p style="margin:8px 0 0;color:#64748b;font-size:14px"><em>"${safeNote}"</em></p>` : ""}
            </blockquote>
            <p>Nothing happens until you approve it. Requests expire in 72 hours.</p>
            <p style="margin:24px 0"><a href="${reviewUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Review request</a></p>
          `);
        }
      } catch (emailErr) { console.error("Failed to send proposal email:", emailErr); }

      res.json(proposal);
    } catch (e) {
      console.error("Create proposal error:", e);
      res.status(500).json({ message: "Failed to create request" });
    }
  });

  // Owner: list pending proposals across all seats (with optional ?status=)
  app.get("/api/family-proposals/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = typeof req.query.status === "string" ? req.query.status : "pending";
      const proposals = await storage.getFamilyProposalsByOwner(userId, status);
      res.json(proposals);
    } catch (e) {
      console.error("List pending proposals error:", e);
      res.status(500).json({ message: "Failed to load requests" });
    }
  });

  // Seat: list my own proposals (across all owners)
  app.get("/api/family-proposals/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const proposals = await storage.getFamilyProposalsByProposer(userId);
      res.json(proposals);
    } catch (e) {
      console.error("List my proposals error:", e);
      res.status(500).json({ message: "Failed to load your requests" });
    }
  });

  // Owner: approve
  app.post("/api/family-proposals/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const p = await storage.getFamilyProposal(req.params.id);
      if (!p || p.ownerUserId !== userId) return res.status(403).json({ message: "Not your request" });
      if (p.status !== "pending") return res.status(400).json({ message: `Request is already ${p.status}` });
      const note = req.body?.note ? String(req.body.note).slice(0, 1000) : null;
      const updated = await storage.updateFamilyProposal(p.id, { status: "approved", decidedAt: new Date(), ownerDecisionNote: note } as any);
      // Notify proposer
      try {
        const [proposer] = await db.select().from(users).where(eq(users.id, p.proposedByUserId));
        if (proposer?.email) {
          const safeFirst = escapeHtml(proposer.firstName || "");
          const safeSummary = escapeHtml(p.humanSummary);
          const safeNote = note ? escapeHtml(note) : "";
          await sendEmail(proposer.email, `Your request was approved`, `
            <p>Hi ${safeFirst},</p>
            <p>Your request was <strong style="color:#16a34a">approved</strong>:</p>
            <blockquote style="border-left:4px solid #16a34a;padding:8px 16px;background:#f0fdf4;margin:12px 0;border-radius:4px">${safeSummary}</blockquote>
            ${safeNote ? `<p><em>Note from owner: "${safeNote}"</em></p>` : ""}
            <p>The owner will execute the action from their account. You can see the status on your <a href="https://cryptoownbank.com/family">Family page</a>.</p>
          `);
        }
      } catch (emailErr) { console.error("Failed to send approval email:", emailErr); }
      res.json(updated);
    } catch (e) {
      console.error("Approve proposal error:", e);
      res.status(500).json({ message: "Failed to approve" });
    }
  });

  // Owner: reject
  app.post("/api/family-proposals/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const p = await storage.getFamilyProposal(req.params.id);
      if (!p || p.ownerUserId !== userId) return res.status(403).json({ message: "Not your request" });
      if (p.status !== "pending") return res.status(400).json({ message: `Request is already ${p.status}` });
      const note = req.body?.note ? String(req.body.note).slice(0, 1000) : null;
      const updated = await storage.updateFamilyProposal(p.id, { status: "rejected", decidedAt: new Date(), ownerDecisionNote: note } as any);
      try {
        const [proposer] = await db.select().from(users).where(eq(users.id, p.proposedByUserId));
        if (proposer?.email) {
          const safeFirst = escapeHtml(proposer.firstName || "");
          const safeSummary = escapeHtml(p.humanSummary);
          const safeNote = note ? escapeHtml(note) : "";
          await sendEmail(proposer.email, `Your request was declined`, `
            <p>Hi ${safeFirst},</p>
            <p>Your request was <strong style="color:#dc2626">declined</strong>:</p>
            <blockquote style="border-left:4px solid #dc2626;padding:8px 16px;background:#fef2f2;margin:12px 0;border-radius:4px">${safeSummary}</blockquote>
            ${safeNote ? `<p><em>Note from owner: "${safeNote}"</em></p>` : "<p>No note provided. Talk it over with them — that's usually the best next step.</p>"}
          `);
        }
      } catch (emailErr) { console.error("Failed to send rejection email:", emailErr); }
      res.json(updated);
    } catch (e) {
      console.error("Reject proposal error:", e);
      res.status(500).json({ message: "Failed to reject" });
    }
  });

  // Proposer: withdraw
  app.post("/api/family-proposals/:id/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const p = await storage.getFamilyProposal(req.params.id);
      if (!p || p.proposedByUserId !== userId) return res.status(403).json({ message: "Not your request" });
      if (p.status !== "pending") return res.status(400).json({ message: `Request is already ${p.status}` });
      const updated = await storage.updateFamilyProposal(p.id, { status: "withdrawn", decidedAt: new Date() } as any);
      res.json(updated);
    } catch (e) {
      console.error("Withdraw proposal error:", e);
      res.status(500).json({ message: "Failed to withdraw" });
    }
  });

}
