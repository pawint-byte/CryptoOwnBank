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

export function registerVaultsRoutes(app: Express) {
  app.get("/api/wallet", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select({
        xrplWalletAddress: users.xrplWalletAddress,
        xrplWalletType: users.xrplWalletType,
      }).from(users).where(eq(users.id, userId));
      if (user?.xrplWalletAddress) {
        res.json({ walletAddress: user.xrplWalletAddress, walletType: user.xrplWalletType });
      } else {
        res.json({ walletAddress: null, walletType: null });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to load wallet" });
    }
  });

  app.post("/api/wallet", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { walletAddress, walletType } = req.body;
      console.log(`[wallet-save] userId=${userId} address=${walletAddress} type=${walletType}`);
      const result = await db.update(users).set({
        xrplWalletAddress: walletAddress || null,
        xrplWalletType: walletType || null,
      }).where(eq(users.id, userId));
      console.log(`[wallet-save] result:`, result);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[wallet-save] ERROR:", error);
      res.status(500).json({ message: "Failed to save wallet" });
    }
  });

  app.post("/api/wallets/keygen-save", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chain, address, label, notes } = req.body || {};
      if (!chain || typeof chain !== "string") {
        return res.status(400).json({ message: "chain is required" });
      }
      if (!address || typeof address !== "string") {
        return res.status(400).json({ message: "address is required" });
      }
      const addr = address.trim();
      if (addr.length > 255) {
        return res.status(400).json({ message: "address too long" });
      }
      if (chain === "xrp" && !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr)) {
        return res.status(400).json({ message: "Invalid XRPL address format" });
      }
      const looksLikeSecret = (s: string): string | null => {
        const t = s.trim();
        if (!t) return null;
        const words = t.toLowerCase().split(/\s+/);
        if (words.length >= 10 && words.length <= 24 && words.every((w) => /^[a-z]{3,8}$/.test(w))) {
          return "looks like a BIP-39 seed phrase";
        }
        if (/^s[1-9A-HJ-NP-Za-km-z]{27,30}$/.test(t)) return "looks like an XRPL family seed (sXXX)";
        if (/^[0-9a-fA-F]{64}$/.test(t)) return "looks like a 256-bit private key";
        if (/^(0x)?[0-9a-fA-F]{64}$/.test(t)) return "looks like a hex private key";
        return null;
      };
      const addrSecret = looksLikeSecret(addr);
      if (addrSecret) {
        console.warn(`[wallets/keygen-save] rejected address field — ${addrSecret}`);
        return res.status(400).json({ message: `Address field ${addrSecret} — never send secrets to the server` });
      }
      if (typeof label === "string") {
        const labelSecret = looksLikeSecret(label);
        if (labelSecret) {
          console.warn(`[wallets/keygen-save] rejected label field — ${labelSecret}`);
          return res.status(400).json({ message: `Label ${labelSecret} — never send secrets to the server` });
        }
      }
      if (typeof notes === "string") {
        const notesSecret = looksLikeSecret(notes);
        if (notesSecret) {
          console.warn(`[wallets/keygen-save] rejected notes field — ${notesSecret}`);
          return res.status(400).json({ message: `Notes ${notesSecret} — never send secrets to the server` });
        }
      }
      const existing = await storage.getWalletsByUser(userId);
      const dup = existing.find((w) => w.chain === chain && w.address.toLowerCase() === addr.toLowerCase());
      if (dup) {
        return res.json({ success: true, wallet: dup, alreadyExists: true });
      }
      const safeLabel = (typeof label === "string" && label.trim()) ? label.trim().slice(0, 100) : `XRP_Wallet_${existing.filter((w) => w.chain === chain).length + 1}`;
      const wallet = await storage.createWallet({
        userId,
        chain,
        address: addr,
        label: safeLabel,
        notes: (typeof notes === "string" ? notes.slice(0, 500) : null) || "Created in-browser via CryptoOwnBank wallet generator. Keys held only by the member; the server stores the public address only.",
      });
      console.log(`[wallets/keygen-save] created wallet ${wallet.id} for user ${userId}`);
      res.json({ success: true, wallet });
    } catch (error: any) {
      console.error("[wallets/keygen-save] ERROR:", error);
      res.status(500).json({ message: "Failed to save wallet" });
    }
  });

  app.post("/api/admin/announce-wallet-create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [adminUser] = await db.select({ email: users.email, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
      if (!adminUser?.isAdmin && !ADMIN_EMAILS.includes(adminUser?.email?.toLowerCase() || "")) {
        return res.status(403).json({ message: "Admin only" });
      }
      const { sendWalletCreateAnnouncement } = await import("../email");
      const { testEmail, dryRun } = req.body || {};
      if (testEmail && typeof testEmail === "string") {
        if (dryRun) {
          return res.json({ success: true, dryRun: true, wouldSendTo: [testEmail], count: 1 });
        }
        await sendWalletCreateAnnouncement(testEmail, "");
        console.log(`[announce-wallet-create] test email sent to ${testEmail}`);
        return res.json({ success: true, testEmail, count: 1 });
      }
      const recipients = await db
        .select({ email: users.email, firstName: users.firstName })
        .from(users)
        .where(eq(users.emailVerified, true));
      const valid = recipients.filter((r) => r.email && r.email.includes("@"));
      if (dryRun) {
        return res.json({
          success: true,
          dryRun: true,
          count: valid.length,
          sample: valid.slice(0, 5).map((r) => r.email),
        });
      }
      let sent = 0;
      let failed = 0;
      for (const r of valid) {
        try {
          await sendWalletCreateAnnouncement(r.email!, r.firstName || "");
          sent++;
          await new Promise((resolve) => setTimeout(resolve, 250));
        } catch (err: any) {
          failed++;
          console.error(`[announce-wallet-create] failed for ${r.email}:`, err?.message);
        }
      }
      console.log(`[announce-wallet-create] broadcast complete: ${sent} sent, ${failed} failed`);
      res.json({ success: true, sent, failed, totalEligible: valid.length });
    } catch (error: any) {
      console.error("[announce-wallet-create] ERROR:", error);
      res.status(500).json({ message: "Failed to send announcement" });
    }
  });

  app.get("/api/xaman-connections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connections = await db.select().from(xamanConnections).where(eq(xamanConnections.userId, userId));
      res.json(connections);
    } catch (error: any) {
      console.error("[xaman-connections] GET error:", error);
      res.status(500).json({ message: "Failed to load Xaman connections" });
    }
  });

  app.post("/api/xaman-connections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { xrpAddress, accountLabel } = req.body;
      if (!xrpAddress || !xrpAddress.startsWith("r")) {
        return res.status(400).json({ message: "Valid XRP address required" });
      }
      const existing = await db.select().from(xamanConnections)
        .where(eq(xamanConnections.userId, userId));
      const alreadyLinked = existing.find(c => c.xrpAddress.toLowerCase() === xrpAddress.toLowerCase());
      if (alreadyLinked) {
        return res.json({ success: true, alreadyLinked: true, connection: alreadyLinked });
      }
      const [connection] = await db.insert(xamanConnections).values({
        userId,
        xrpAddress,
        accountLabel: accountLabel || null,
      }).returning();

      try {
        const existingWallets = await storage.getWalletsByUser(userId);
        const walletAlreadyTracked = existingWallets.find(
          (w) => w.chain === "xrp" && w.address.toLowerCase() === xrpAddress.toLowerCase()
        );
        if (!walletAlreadyTracked) {
          let walletLabel = accountLabel || "";
          if (!walletLabel) {
            const xrpCount = existingWallets.filter(w => w.chain === "xrp").length;
            walletLabel = xrpCount === 0 ? "XRP_Wallet" : `XRP_Wallet_${xrpCount + 1}`;
          }
          if (!walletLabel.toUpperCase().startsWith("XRP_") && !walletLabel.toUpperCase().startsWith("XRP ") && !walletLabel.toUpperCase().startsWith("XRP-")) {
            walletLabel = `XRP_${walletLabel}`;
          }
          await storage.createWallet({
            userId,
            chain: "xrp",
            address: xrpAddress,
            label: walletLabel,
          });
        }
      } catch (walletErr) {
        console.error("[xaman-connections] Auto-register wallet error (non-fatal):", walletErr);
      }

      res.json({ success: true, connection });
    } catch (error: any) {
      console.error("[xaman-connections] POST error:", error);
      res.status(500).json({ message: "Failed to save Xaman connection" });
    }
  });

  app.delete("/api/xaman-connections/:address", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { address } = req.params;
      const { and } = await import("drizzle-orm");
      await db.delete(xamanConnections).where(
        and(eq(xamanConnections.userId, userId), eq(xamanConnections.xrpAddress, address))
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("[xaman-connections] DELETE error:", error);
      res.status(500).json({ message: "Failed to remove Xaman connection" });
    }
  });

  app.get("/api/custom-vaults", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      const vaults = (settings?.customVaults as CustomVault[] | null) || [];
      res.json({ vaults });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch custom vaults" });
    }
  });

  app.post("/api/custom-vaults", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { address, name, apr } = req.body;

      if (!address || !name || typeof address !== "string" || typeof name !== "string") {
        return res.status(400).json({ message: "Address and name are required" });
      }

      if (!address.startsWith("r") || address.length < 25 || address.length > 35) {
        return res.status(400).json({ message: "Invalid XRPL address format" });
      }

      const parsedApr = typeof apr === "number" ? apr : parseFloat(apr || "0");
      if (isNaN(parsedApr) || parsedApr < 0 || parsedApr > 100) {
        return res.status(400).json({ message: "APR must be between 0 and 100" });
      }

      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.upsertUserSettings({ userId });
      }

      const existing = (settings.customVaults as CustomVault[] | null) || [];

      if (existing.some(v => v.address === address)) {
        return res.status(400).json({ message: "This vault address is already added" });
      }

      if (SOIL_VAULT_ADDRESSES.includes(address)) {
        return res.status(400).json({ message: "This is a built-in vault address — no need to add it manually" });
      }

      const newVault: CustomVault = {
        address,
        name: name.trim(),
        apr: parsedApr,
        addedAt: new Date().toISOString(),
      };

      const updated = [...existing, newVault];
      await storage.upsertUserSettings({ userId, customVaults: updated });

      res.json({ success: true, vaults: updated });
    } catch (error: any) {
      console.error("Custom vault add error:", error);
      res.status(500).json({ message: "Failed to add custom vault" });
    }
  });

  app.delete("/api/custom-vaults/:address", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const address = req.params.address;
      const settings = await storage.getUserSettings(userId);
      if (!settings) return res.json({ success: true, vaults: [] });

      const existing = (settings.customVaults as CustomVault[] | null) || [];
      const updated = existing.filter(v => v.address !== address);
      await storage.upsertUserSettings({ userId, customVaults: updated });
      res.json({ success: true, vaults: updated });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to remove custom vault" });
    }
  });

  app.patch("/api/custom-vaults/:address", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const address = req.params.address;
      const { name, apr } = req.body;
      const settings = await storage.getUserSettings(userId);
      if (!settings) return res.status(404).json({ message: "No settings found" });

      const existing = (settings.customVaults as CustomVault[] | null) || [];
      const updated = existing.map(v => {
        if (v.address !== address) return v;
        return {
          ...v,
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(apr !== undefined ? { apr: typeof apr === "number" ? apr : parseFloat(apr) } : {}),
        };
      });
      await storage.upsertUserSettings({ userId, customVaults: updated });
      res.json({ success: true, vaults: updated });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update custom vault" });
    }
  });

  app.post("/api/custom-vaults/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { address } = req.body;
      if (!address) return res.status(400).json({ message: "Address is required" });

      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.upsertUserSettings({ userId });
      }

      const existing = (settings.customVaults as CustomVault[] | null) || [];
      const dismissed: CustomVault = {
        address,
        name: "__dismissed__",
        apr: 0,
        addedAt: new Date().toISOString(),
      };
      const updated = [...existing, dismissed];
      await storage.upsertUserSettings({ userId, customVaults: updated });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to dismiss address" });
    }
  });

  app.post("/api/soil/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const [user] = await db.select({
        xrplWalletAddress: users.xrplWalletAddress,
      }).from(users).where(eq(users.id, userId));

      let walletAddress = user?.xrplWalletAddress;

      if (!walletAddress && req.body.walletAddress) {
        walletAddress = req.body.walletAddress;
        await db.update(users).set({
          xrplWalletAddress: walletAddress,
          xrplWalletType: req.body.walletType || "xumm",
        }).where(eq(users.id, userId));
      }

      if (!walletAddress) {
        return res.status(400).json({ message: "No wallet connected. Connect your XRPL wallet first." });
      }

      const existingAccounts = await storage.getAccountsByUser(userId);
      let soilAccount = existingAccounts.find(a => a.provider === "soil-xrpl");
      if (!soilAccount) {
        soilAccount = await storage.createAccount({
          userId,
          credentialId: null,
          provider: "soil-xrpl",
          accountName: "Soil Protocol (XRPL)",
          accountType: "defi",
        });
      }

      const existingTxns = await storage.getTransactionsByUser(userId);
      const existingHashes = new Set(
        existingTxns
          .filter(t => t.externalId && t.accountId === soilAccount!.id)
          .map(t => t.externalId)
      );

      const RLUSD_ISSUER = RLUSD.issuer;

      const settings = await storage.getUserSettings(userId);
      const userCustomVaults = (settings?.customVaults as CustomVault[] | null) || [];

      let client: Client | null = null;
      const xrplServers = ["wss://xrplcluster.com", "wss://s1.ripple.com", "wss://s2.ripple.com"];
      for (const server of xrplServers) {
        try {
          const c = new Client(server, { connectionTimeout: 15000 });
          await c.connect();
          console.log(`[Soil sync] Connected to ${server} for wallet: ${walletAddress}`);
          client = c;
          break;
        } catch (err: any) {
          console.error(`[Soil sync] Failed to connect to ${server}:`, err?.message);
        }
      }
      if (!client) {
        throw new Error("Could not connect to any XRPL server. Please try again.");
      }

      const SOIL_VAULT_APR: Record<string, number> = {
        "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX": 0.08,
        "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8": 0.05,
      };
      const SOIL_VAULT_NAMES: Record<string, string> = {
        "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX": "Credit+",
        "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8": "Liquid",
      };

      for (const cv of userCustomVaults) {
        SOIL_VAULT_APR[cv.address] = cv.apr / 100;
        SOIL_VAULT_NAMES[cv.address] = cv.name;
      }

      const dismissedAddresses = new Set(
        userCustomVaults.filter(v => v.name === "__dismissed__").map(v => v.address)
      );
      const activeCustomVaults = userCustomVaults.filter(v => v.name !== "__dismissed__");

      const allKnownVaultAddresses = new Set([
        ...SOIL_VAULT_ADDRESSES,
        ...activeCustomVaults.map(v => v.address),
      ]);
      console.log(`[Soil sync] allKnownVaultAddresses: ${JSON.stringify([...allKnownVaultAddresses])}, customVaults: ${JSON.stringify(userCustomVaults)}`);

      const discoveredAddresses: Array<{ address: string; direction: "outgoing" | "incoming"; amount: number; date: string; hash: string }> = [];

      const soilTxns: Array<{
        hash: string;
        type: "deposit" | "withdrawal";
        amount: number;
        currency: string;
        date: string;
        fee: string;
        vaultAddress?: string;
        vaultName?: string;
      }> = [];

      let totalTxScanned = 0;
      let rlsudTxFound = 0;
      try {
        let marker: any = undefined;
        let hasMore = true;

        while (hasMore) {
          const request: any = {
            command: "account_tx",
            account: walletAddress,
            ledger_index_min: -1,
            ledger_index_max: -1,
            limit: 100,
          };
          if (marker) request.marker = marker;

          const response = await client.request(request);
          const txs = response.result.transactions || [];
          console.log(`[Soil sync] Fetched ${txs.length} txs for ${walletAddress}, marker=${!!marker}`);

          for (const tx of txs) {
            totalTxScanned++;
            const txData = tx.tx_json || tx.tx || {};
            const meta = typeof tx.meta === "string" ? {} : (tx.meta || {});

            if (meta.TransactionResult && meta.TransactionResult !== "tesSUCCESS") continue;
            if (txData.TransactionType !== "Payment") continue;

            const src = txData.Account || "";
            const dest = txData.Destination || "";
            const srcIsVault = allKnownVaultAddresses.has(src);
            const destIsVault = allKnownVaultAddresses.has(dest);
            const isKnownVault = srcIsVault || destIsVault;
            if (isKnownVault && !srcIsVault && !destIsVault) {
              console.log(`[Soil sync] BUG: isKnownVault=true but neither src nor dest matched! src=${src} dest=${dest}`);
            }

            let amount = 0;
            let currency = "Unknown";
            let validCurrency = false;

            const deliveredAmount = meta.delivered_amount || txData.DeliverMax || txData.Amount;

            if (typeof deliveredAmount === "object" && deliveredAmount) {
              const amountCurrency = deliveredAmount.currency || "";
              const amountIssuer = deliveredAmount.issuer || "";
              if (
                (amountCurrency === RLUSD_CURRENCY_HEX || amountCurrency === "RLUSD") &&
                (amountIssuer === RLUSD_ISSUER || !amountIssuer)
              ) {
                amount = parseFloat(deliveredAmount.value || "0");
                currency = "RLUSD";
                validCurrency = true;
              }
            }

            if (!validCurrency) {
              const fallbackAmount = txData.DeliverMax || txData.Amount;
              if (typeof fallbackAmount === "object" && fallbackAmount) {
                const amountCurrency = fallbackAmount.currency || "";
                const amountIssuer = fallbackAmount.issuer || "";
                if (
                  (amountCurrency === RLUSD_CURRENCY_HEX || amountCurrency === "RLUSD") &&
                  (amountIssuer === RLUSD_ISSUER || !amountIssuer)
                ) {
                  amount = parseFloat(fallbackAmount.value || "0");
                  currency = "RLUSD";
                  validCurrency = true;
                }
              }
            }

            if (!validCurrency || amount <= 0) continue;

            if (currency !== "RLUSD") continue;

            rlsudTxFound++;

            const rippleEpoch = 946684800;
            const closeTimeIso = (tx as any).close_time_iso;
            const date = closeTimeIso
              ? new Date(closeTimeIso).toISOString()
              : txData.date
                ? new Date((txData.date + rippleEpoch) * 1000).toISOString()
                : new Date().toISOString();

            const hash = (tx as any).hash || txData.hash || txData.Hash || "";
            if (!hash) continue;

            if (src === walletAddress && dest === walletAddress) continue;

            const isDeposit = src === walletAddress && allKnownVaultAddresses.has(dest);
            const isVaultToWallet = dest === walletAddress && allKnownVaultAddresses.has(src);
            const isWithdrawal = isVaultToWallet && amount >= 50;
            const isYieldPayment = isVaultToWallet && amount < 50;

            if (!isDeposit && !isWithdrawal && !isYieldPayment) {
              if (amount >= 10) {
                const isOutgoing = src === walletAddress;
                const counterparty = isOutgoing ? dest : src;
                if (
                  counterparty !== walletAddress &&
                  !dismissedAddresses.has(counterparty) &&
                  !discoveredAddresses.some(d => d.address === counterparty && d.hash === hash)
                ) {
                  discoveredAddresses.push({
                    address: counterparty,
                    direction: isOutgoing ? "outgoing" : "incoming",
                    amount,
                    date,
                    hash,
                  });
                }
              }
              continue;
            }

            const vaultAddr = isDeposit ? dest : src;
            const txType = isDeposit ? "deposit" : isYieldPayment ? "yield" : "withdrawal";
            console.log(`[Soil sync] Found ${txType}: ${amount} ${currency} | ${src.slice(0,8)}->${dest.slice(0,8)} | vault=${vaultAddr.slice(0,8)} | hash=${hash.slice(0,12)}`);
            soilTxns.push({
              hash,
              type: txType as any,
              amount,
              currency,
              date,
              fee: txData.Fee
                ? (Number(txData.Fee) / 1_000_000).toFixed(6)
                : "0",
              vaultAddress: vaultAddr,
              vaultName: SOIL_VAULT_NAMES[vaultAddr] || "Unknown",
            });
          }

          marker = response.result.marker;
          hasMore = !!marker;
        }
      } finally {
        await client.disconnect().catch(() => {});
      }

      console.log(`[Soil sync] Scanned ${totalTxScanned} total txs, found ${soilTxns.length} Soil txs, ${discoveredAddresses.length} discovered addresses for wallet ${walletAddress}`);

      let imported = 0;
      const newDeposits: typeof soilTxns = [];
      const newWithdrawals: typeof soilTxns = [];
      for (const stx of soilTxns) {
        if (existingHashes.has(stx.hash)) {
          const vaultName = stx.vaultName || SOIL_VAULT_NAMES[stx.vaultAddress || ""] || "Unknown";
          const existingTxn = existingTxns.find(t => t.externalId === stx.hash && t.accountId === soilAccount!.id);
          if (existingTxn && existingTxn.notes && !existingTxn.notes.includes("[")) {
            const newNotes = stx.type === "deposit"
              ? `Soil vault deposit [${vaultName}] (auto-synced from XRPL)`
              : `Soil vault withdrawal [${vaultName}] (auto-synced from XRPL)`;
            await db.update(transactions).set({ notes: newNotes }).where(eq(transactions.id, existingTxn.id));
          }
          continue;
        }

        const transactionType = stx.type === "deposit" ? "transfer_out" : "transfer_in";
        const assetSymbol = stx.currency;

        await storage.createTransaction({
          userId,
          accountId: soilAccount.id,
          assetSymbol,
          transactionType,
          quantity: stx.amount.toString(),
          pricePerUnit: "1",
          totalValue: stx.amount.toFixed(2),
          fee: stx.fee,
          transactionDate: new Date(stx.date),
          externalId: stx.hash,
          notes: stx.type === "deposit"
            ? `Soil vault deposit [${stx.vaultName || "Unknown"}] (auto-synced from XRPL)`
            : `Soil vault withdrawal [${stx.vaultName || "Unknown"}] (auto-synced from XRPL)`,
        });

        if (stx.type === "deposit") newDeposits.push(stx);
        else if (stx.type === "withdrawal") newWithdrawals.push(stx);
        imported++;
      }

      if (imported > 0) {
        const [emailUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
        if (emailUser?.email) {
          for (const dep of newDeposits) {
            const vName = dep.vaultName || SOIL_VAULT_NAMES[dep.vaultAddress || ""] || "Soil Vault";
            const apr = SOIL_VAULT_APR[dep.vaultAddress || ""] || 0.05;
            sendDepositConfirmation(emailUser.email, vName, dep.amount, apr * 100)
              .catch(err => console.error("[soil-email] Deposit notification failed:", err?.message));
          }
          for (const wd of newWithdrawals) {
            const vName = wd.vaultName || SOIL_VAULT_NAMES[wd.vaultAddress || ""] || "Soil Vault";
            sendWithdrawalConfirmation(emailUser.email, wd.amount, vName, walletAddress)
              .catch(err => console.error("[soil-email] Withdrawal notification failed:", err?.message));
          }
        }
      }

      const deposits = soilTxns.filter(t => t.type === "deposit");
      const withdrawals = soilTxns.filter(t => t.type === "withdrawal");
      const yieldPayments = soilTxns.filter(t => t.type === "yield");
      const totalDeposited = deposits.reduce((sum, t) => sum + t.amount, 0);
      const totalWithdrawn = withdrawals.reduce((sum, t) => sum + t.amount, 0);
      const totalYieldReceived = yieldPayments.reduce((sum, t) => sum + t.amount, 0);

      const currentPrincipal = totalDeposited - totalWithdrawn;

      const vaultTotals: Record<string, number> = {};
      for (const dep of deposits) {
        const addr = dep.vaultAddress || SOIL_VAULT_ADDRESSES[0];
        vaultTotals[addr] = (vaultTotals[addr] || 0) + dep.amount;
      }
      for (const wd of withdrawals) {
        const addr = wd.vaultAddress || SOIL_VAULT_ADDRESSES[0];
        vaultTotals[addr] = (vaultTotals[addr] || 0) - wd.amount;
      }

      for (const [addr, total] of Object.entries(vaultTotals)) {
        if (total <= 0) continue;
        const vaultName = SOIL_VAULT_NAMES[addr] || "Vault";
        const posSymbol = `RLUSD-SOIL-${vaultName.toUpperCase()}`;
        const existingPos = await storage.getPositionByUserAndAsset(userId, soilAccount.id, posSymbol);
        if (existingPos) {
          const posUpdate: any = {
            quantity: total.toFixed(8),
            averageCost: "1",
            totalCostBasis: total.toFixed(2),
          };
          if (existingPos.isAddressed) {
            await storage.markPositionAddressed(existingPos.id, false);
          }
          await storage.updatePosition(existingPos.id, posUpdate);
        } else {
          await storage.createPosition({
            userId,
            accountId: soilAccount.id,
            assetSymbol: posSymbol,
            quantity: total.toFixed(8),
            averageCost: "1",
            totalCostBasis: total.toFixed(2),
          });
        }
      }

      const sortedTxns = [...soilTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstDeposit = deposits.length > 0
        ? deposits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
        : null;

      const vaultBreakdown: Record<string, { principal: number; apr: number; name: string; deposits: Array<{amount: number; date: string}>; yieldReceived: number }> = {};
      for (const dep of deposits) {
        const addr = dep.vaultAddress || SOIL_VAULT_ADDRESSES[0];
        if (!vaultBreakdown[addr]) {
          vaultBreakdown[addr] = {
            principal: 0,
            apr: SOIL_VAULT_APR[addr] || 0.065,
            name: SOIL_VAULT_NAMES[addr] || "Vault",
            deposits: [],
            yieldReceived: 0,
          };
        }
        vaultBreakdown[addr].principal += dep.amount;
        vaultBreakdown[addr].deposits.push({ amount: dep.amount, date: dep.date });
      }
      for (const wd of withdrawals) {
        const addr = wd.vaultAddress || SOIL_VAULT_ADDRESSES[0];
        if (vaultBreakdown[addr]) {
          vaultBreakdown[addr].principal -= wd.amount;
        }
      }
      for (const yp of yieldPayments) {
        const addr = yp.vaultAddress || SOIL_VAULT_ADDRESSES[0];
        if (vaultBreakdown[addr]) {
          vaultBreakdown[addr].yieldReceived += yp.amount;
        }
      }

      let calculatedInterest = 0;
      if (currentPrincipal > 0) {
        for (const [, info] of Object.entries(vaultBreakdown)) {
          for (const dep of info.deposits) {
            const depositDate = new Date(dep.date);
            const daysSince = Math.max(0, (Date.now() - depositDate.getTime()) / (1000 * 60 * 60 * 24));
            calculatedInterest += dep.amount * info.apr * (daysSince / 365);
          }
        }
      }

      const weightedApr = totalDeposited > 0
        ? Object.values(vaultBreakdown).reduce((sum, v) => sum + Math.max(0, v.principal) * v.apr, 0) / totalDeposited
        : 0;

      const effectiveYieldPercent = currentPrincipal > 0 ? (calculatedInterest / currentPrincipal) * 100 : 0;

      const vaults = Object.entries(vaultBreakdown).map(([addr, info]) => {
        let vaultInterest = 0;
        const vaultTotalDeposited = info.deposits.reduce((s, d) => s + d.amount, 0);
        for (const dep of info.deposits) {
          const depositDate = new Date(dep.date);
          const daysSince = Math.max(0, (Date.now() - depositDate.getTime()) / (1000 * 60 * 60 * 24));
          vaultInterest += dep.amount * info.apr * (daysSince / 365);
        }
        return {
          address: addr,
          name: info.name,
          totalDeposited: vaultTotalDeposited.toFixed(2),
          principal: Math.max(0, info.principal).toFixed(2),
          apr: (info.apr * 100).toFixed(1),
          interest: vaultInterest.toFixed(2),
          yieldReceived: info.yieldReceived.toFixed(4),
        };
      });

      const uniqueDiscovered = Object.values(
        discoveredAddresses.reduce((acc, d) => {
          if (!acc[d.address]) {
            acc[d.address] = { address: d.address, totalAmount: 0, txCount: 0, lastDate: d.date, direction: d.direction };
          }
          acc[d.address].totalAmount += d.amount;
          acc[d.address].txCount += 1;
          if (d.date > acc[d.address].lastDate) acc[d.address].lastDate = d.date;
          return acc;
        }, {} as Record<string, { address: string; totalAmount: number; txCount: number; lastDate: string; direction: string }>)
      );

      res.json({
        success: true,
        totalTransactions: soilTxns.length,
        totalTxScanned,
        newlyImported: imported,
        discoveredAddresses: uniqueDiscovered,
        summary: {
          deposits: deposits.length,
          totalDeposited: totalDeposited.toFixed(2),
          withdrawals: withdrawals.length,
          totalWithdrawn: totalWithdrawn.toFixed(2),
          yieldPayments: yieldPayments.length,
          totalYieldReceived: totalYieldReceived.toFixed(4),
          currentPrincipal: currentPrincipal.toFixed(2),
          calculatedInterest: calculatedInterest.toFixed(4),
          effectiveYieldPercent: effectiveYieldPercent.toFixed(2),
          firstDepositDate: firstDeposit?.date || null,
          weightedApr: (weightedApr * 100).toFixed(1),
          vaults,
          transactions: sortedTxns.map(t => ({
            hash: t.hash,
            type: t.type,
            amount: t.amount.toFixed(2),
            currency: t.currency,
            date: t.date,
            vaultName: t.vaultName || null,
          })),
        },
      });
    } catch (error: any) {
      console.error("Soil sync error:", error?.message || error);
      console.error("Soil sync stack:", error?.stack?.slice(0, 500));
      res.status(500).json({ message: "Failed to sync Soil transactions: " + (error?.message || "Unknown error") });
    }
  });

  app.get("/api/auto-compound", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getAutoCompoundSettings(userId);
      res.json({ settings });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch auto-compound settings" });
    }
  });

  app.post("/api/auto-compound", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vaultAddress, enabled } = req.body;
      if (!vaultAddress || typeof vaultAddress !== "string" || vaultAddress.length > 255) {
        return res.status(400).json({ message: "Valid vaultAddress is required" });
      }
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      const setting = await storage.upsertAutoCompoundSetting(userId, vaultAddress, enabled);
      res.json({ success: true, setting });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update auto-compound setting" });
    }
  });

  app.get("/api/yield-positions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positions = await storage.getYieldPositionsByUser(userId);
      res.json({ positions });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch yield positions" });
    }
  });

  app.post("/api/yield-positions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { protocol, chain, asset, walletAddress, depositAmount, apr, trackingLevel, externalLink, notes, depositDate } = req.body;
      if (!protocol || typeof protocol !== "string" || protocol.length > 100) {
        return res.status(400).json({ message: "Valid protocol name is required (max 100 chars)" });
      }
      if (!chain || typeof chain !== "string" || chain.length > 50) {
        return res.status(400).json({ message: "Valid chain is required" });
      }
      if (!asset || typeof asset !== "string" || asset.length > 50) {
        return res.status(400).json({ message: "Valid asset is required" });
      }
      const depAmt = parseFloat(depositAmount);
      const aprVal = parseFloat(apr);
      if (isNaN(depAmt) || depAmt <= 0) {
        return res.status(400).json({ message: "depositAmount must be a positive number" });
      }
      if (isNaN(aprVal) || aprVal < 0 || aprVal > 1000) {
        return res.status(400).json({ message: "apr must be between 0 and 1000" });
      }
      const position = await storage.createYieldPosition({
        userId,
        protocol: protocol.slice(0, 100),
        chain: chain.slice(0, 50),
        asset: asset.slice(0, 50),
        walletAddress: walletAddress ? String(walletAddress).slice(0, 255) : null,
        depositAmount: depAmt.toString(),
        apr: aprVal.toString(),
        trackingLevel: [2, 3].includes(trackingLevel) ? trackingLevel : 2,
        externalLink: externalLink ? String(externalLink).slice(0, 500) : null,
        notes: notes ? String(notes).slice(0, 1000) : null,
        depositDate: depositDate ? new Date(depositDate) : new Date(),
        status: "active",
      });
      res.json({ success: true, position });
    } catch (error: any) {
      console.error("Create yield position error:", error);
      res.status(500).json({ message: "Failed to create yield position" });
    }
  });

  app.patch("/api/yield-positions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const position = await storage.getYieldPosition(req.params.id);
      if (!position || position.userId !== userId) {
        return res.status(404).json({ message: "Position not found" });
      }
      const allowedFields: Record<string, any> = {};
      if (req.body.depositAmount !== undefined) {
        const val = parseFloat(req.body.depositAmount);
        if (!isNaN(val) && val > 0) allowedFields.depositAmount = val.toString();
      }
      if (req.body.apr !== undefined) {
        const val = parseFloat(req.body.apr);
        if (!isNaN(val) && val >= 0 && val <= 1000) allowedFields.apr = val.toString();
      }
      if (req.body.status && ["active", "closed"].includes(req.body.status)) {
        allowedFields.status = req.body.status;
      }
      if (req.body.notes !== undefined) allowedFields.notes = String(req.body.notes).slice(0, 1000);
      if (req.body.walletAddress !== undefined) allowedFields.walletAddress = String(req.body.walletAddress).slice(0, 255);
      if (req.body.externalLink !== undefined) allowedFields.externalLink = String(req.body.externalLink).slice(0, 500);

      const updated = await storage.updateYieldPosition(req.params.id, allowedFields);
      res.json({ success: true, position: updated });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update yield position" });
    }
  });

  app.delete("/api/yield-positions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const position = await storage.getYieldPosition(req.params.id);
      if (!position || position.userId !== userId) {
        return res.status(404).json({ message: "Position not found" });
      }
      await storage.deleteYieldPosition(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete yield position" });
    }
  });

}
