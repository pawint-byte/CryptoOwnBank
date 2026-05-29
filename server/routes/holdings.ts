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

export function registerHoldingsRoutes(app: Express) {
  app.get("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProps = await db.select().from(properties).where(eq(properties.userId, userId));
      res.json(userProps);
    } catch (error) {
      console.error("Properties fetch error:", error);
      res.status(500).json({ message: "Failed to load properties" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertPropertySchema.parse({ ...req.body, userId });

      const { resolveMetroSeries, getMetroLabel } = await import("../services/housing-index");
      const seriesId = resolveMetroSeries(
        parsed.city,
        parsed.stateProvince || null,
        parsed.zipCode || null,
        parsed.country || "US"
      );
      const metroArea = seriesId ? getMetroLabel(seriesId) : null;

      const purchasePrice = parseFloat(parsed.purchasePrice);
      const purchaseDate = new Date(parsed.purchaseDate);
      const now = new Date();
      const yearsHeld = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      const COUNTRY_RATES: Record<string, number> = {
        US: 0.047, GB: 0.043, CA: 0.052, AU: 0.065, DE: 0.038, FR: 0.032,
        NL: 0.045, IE: 0.048, ES: 0.028, IT: 0.015, JP: 0.010, SG: 0.055,
        HK: 0.058, NZ: 0.062, SE: 0.050, NO: 0.048, CH: 0.035, AE: 0.040,
        IN: 0.055, BR: 0.042, MX: 0.038, ZA: 0.045, KR: 0.048,
      };
      const annualRate = COUNTRY_RATES[parsed.country || "US"] || 0.03;
      const currentValue = purchasePrice * Math.pow(1 + annualRate, yearsHeld);
      const appreciationPct = ((currentValue - purchasePrice) / purchasePrice) * 100;

      const [created] = await db.insert(properties).values({
        ...parsed,
        indexSeriesId: seriesId || null,
        metroArea,
        currentValue: currentValue.toFixed(2),
        appreciationPct: appreciationPct.toFixed(4),
        lastUpdated: new Date(),
      }).returning();

      const { refreshHousingIndices } = await import("../services/housing-index");
      refreshHousingIndices().catch(() => {});

      res.json(created);
    } catch (error) {
      console.error("Property create error:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const propId = parseInt(req.params.id);
      const existing = await db.select().from(properties).where(and(eq(properties.id, propId), eq(properties.userId, userId)));
      if (existing.length === 0) return res.status(404).json({ message: "Property not found" });

      const { address, city, stateProvince, country, zipCode, purchasePrice, purchaseDate, notes } = req.body;
      const updates: any = {};
      if (address !== undefined) updates.address = address;
      if (city !== undefined) updates.city = city;
      if (stateProvince !== undefined) updates.stateProvince = stateProvince;
      if (country !== undefined) updates.country = country;
      if (zipCode !== undefined) updates.zipCode = zipCode;
      if (purchasePrice !== undefined) updates.purchasePrice = purchasePrice;
      if (purchaseDate !== undefined) updates.purchaseDate = purchaseDate;
      if (notes !== undefined) updates.notes = notes;

      if (city || stateProvince || zipCode || country) {
        const { resolveMetroSeries, getMetroLabel } = await import("../services/housing-index");
        const c = city || existing[0].city;
        const s = stateProvince || existing[0].stateProvince;
        const z = zipCode || existing[0].zipCode;
        const co = country || existing[0].country;
        const seriesId = resolveMetroSeries(c, s, z, co);
        updates.indexSeriesId = seriesId || null;
        updates.metroArea = seriesId ? getMetroLabel(seriesId) : null;
      }

      const [updated] = await db.update(properties).set(updates).where(eq(properties.id, propId)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Property update error:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const propId = parseInt(req.params.id);
      const existing = await db.select().from(properties).where(and(eq(properties.id, propId), eq(properties.userId, userId)));
      if (existing.length === 0) return res.status(404).json({ message: "Property not found" });
      await db.delete(properties).where(eq(properties.id, propId));
      res.json({ success: true });
    } catch (error) {
      console.error("Property delete error:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // ========================================================================
  // Off-chain holdings (seed investments, insurance, brokerage, vehicles, etc)
  // ========================================================================
  app.get("/api/off-chain-holdings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rows = await db.select().from(offChainHoldings).where(eq(offChainHoldings.userId, userId));
      res.json(rows);
    } catch (error) {
      console.error("Off-chain holdings fetch error:", error);
      res.status(500).json({ message: "Failed to load holdings" });
    }
  });

  app.post("/api/off-chain-holdings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertOffChainHoldingSchema.parse({ ...req.body, userId });
      const insertData: any = {
        userId,
        assetType: parsed.assetType,
        name: parsed.name,
        provider: parsed.provider || null,
        accountIdentifier: parsed.accountIdentifier || null,
        amountInvested: parsed.amountInvested != null && parsed.amountInvested !== "" ? String(parsed.amountInvested) : null,
        currentValue: parsed.currentValue != null && parsed.currentValue !== "" ? String(parsed.currentValue) : null,
        purchaseDate: parsed.purchaseDate || null,
        status: parsed.status || "active",
        notes: parsed.notes || null,
        legacyInstructions: parsed.legacyInstructions || null,
        beneficiaryName: parsed.beneficiaryName || null,
        beneficiaryContact: parsed.beneficiaryContact || null,
        metadata: parsed.metadata || {},
      };
      const [created] = await db.insert(offChainHoldings).values(insertData).returning();
      res.json(created);
    } catch (error: any) {
      console.error("Off-chain holding create error:", error);
      res.status(400).json({ message: error?.message || "Failed to create holding" });
    }
  });

  app.post("/api/off-chain-holdings/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (items.length === 0) return res.status(400).json({ message: "No items provided" });
      if (items.length > 200) return res.status(400).json({ message: "Maximum 200 items per import" });

      const inserted: any[] = [];
      const errors: { row: number; message: string }[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const parsed = insertOffChainHoldingSchema.parse({ ...items[i], userId });
          const [row] = await db.insert(offChainHoldings).values({
            userId,
            assetType: parsed.assetType,
            name: parsed.name,
            provider: parsed.provider || null,
            accountIdentifier: parsed.accountIdentifier || null,
            amountInvested: parsed.amountInvested != null && parsed.amountInvested !== "" ? String(parsed.amountInvested) : null,
            currentValue: parsed.currentValue != null && parsed.currentValue !== "" ? String(parsed.currentValue) : null,
            purchaseDate: parsed.purchaseDate || null,
            status: parsed.status || "active",
            notes: parsed.notes || null,
            legacyInstructions: parsed.legacyInstructions || null,
            beneficiaryName: parsed.beneficiaryName || null,
            beneficiaryContact: parsed.beneficiaryContact || null,
            metadata: parsed.metadata || {},
          } as any).returning();
          inserted.push(row);
        } catch (e: any) {
          errors.push({ row: i + 1, message: e?.message || "Invalid row" });
        }
      }
      res.json({ inserted: inserted.length, errors, items: inserted });
    } catch (error: any) {
      console.error("Off-chain bulk import error:", error);
      res.status(500).json({ message: error?.message || "Bulk import failed" });
    }
  });

  app.patch("/api/off-chain-holdings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const existing = await db.select().from(offChainHoldings).where(and(eq(offChainHoldings.id, id), eq(offChainHoldings.userId, userId)));
      if (existing.length === 0) return res.status(404).json({ message: "Holding not found" });

      const allowed = ["assetType", "name", "provider", "accountIdentifier", "amountInvested", "currentValue", "quantity", "contactUrl", "contactPhone", "purchaseDate", "status", "notes", "legacyInstructions", "beneficiaryName", "beneficiaryContact", "metadata"];
      const updates: any = { updatedAt: new Date() };
      for (const k of allowed) {
        if (req.body[k] !== undefined) {
          if (k === "assetType" && !OFF_CHAIN_ASSET_TYPES.includes(req.body[k])) continue;
          if (k === "status" && !OFF_CHAIN_STATUSES.includes(req.body[k])) continue;
          if (k === "amountInvested" || k === "currentValue") {
            updates[k] = req.body[k] != null && req.body[k] !== "" ? String(req.body[k]) : null;
          } else {
            updates[k] = req.body[k];
          }
        }
      }
      const [updated] = await db.update(offChainHoldings).set(updates).where(and(eq(offChainHoldings.id, id), eq(offChainHoldings.userId, userId))).returning();
      res.json(updated);
    } catch (error: any) {
      console.error("Off-chain holding update error:", error);
      res.status(500).json({ message: error?.message || "Failed to update holding" });
    }
  });

  app.delete("/api/off-chain-holdings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const existing = await db.select().from(offChainHoldings).where(and(eq(offChainHoldings.id, id), eq(offChainHoldings.userId, userId)));
      if (existing.length === 0) return res.status(404).json({ message: "Holding not found" });
      await db.delete(offChainHoldings).where(eq(offChainHoldings.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Off-chain holding delete error:", error);
      res.status(500).json({ message: "Failed to delete holding" });
    }
  });

  app.get("/api/credentials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const creds = await storage.getApiCredentialsByUser(userId);
      const safeCreds = creds.map(c => ({
        ...c,
        apiKey: "••••••••",
        apiSecret: "••••••••",
      }));
      res.json(safeCreds);
    } catch (error) {
      console.error("Credentials error:", error);
      res.status(500).json({ message: "Failed to load credentials" });
    }
  });

  app.post("/api/credentials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { provider, apiKey, apiSecret } = req.body;

      if (!provider || !apiKey || !apiSecret) {
        return res.status(400).json({ message: "Missing required fields: provider, apiKey, apiSecret" });
      }

      const { tier: credTier } = await getEffectiveTier(userId);
      if (credTier === "free") {
        const existingCreds = await storage.getApiCredentialsByUser(userId);
        if (existingCreds.length >= 1) {
          return res.status(403).json({ message: "Free users can connect 1 exchange. Upgrade to Premium for unlimited exchange connections." });
        }
      }

      const validProviders = [
        "binance", "binance_us", "coinbase", "kraken", "crypto_com", "uphold",
        "gemini", "kucoin", "bybit", "okx", "bitfinex", "bitstamp", "gate_io",
        "nexo", "webull", "etoro", "robinhood", "fidelity",
      ];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid provider" });
      }

      const credential = await storage.createApiCredential({
        userId,
        provider,
        apiKey,
        apiSecret,
        isConnected: true,
        lastSyncAt: new Date(),
      });

      const account = await storage.createAccount({
        userId,
        credentialId: credential.id,
        provider,
        accountName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Account`,
        accountType: provider === "robinhood" || provider === "fidelity" ? "brokerage" : "exchange",
      });

      res.json({
        ...credential,
        apiKey: "••••••••",
        apiSecret: "••••••••",
      });
    } catch (error) {
      console.error("Create credential error:", error);
      res.status(500).json({ message: "Failed to connect exchange" });
    }
  });

  app.delete("/api/credentials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApiCredential(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete credential error:", error);
      res.status(500).json({ message: "Failed to disconnect exchange" });
    }
  });

  app.post("/api/credentials/:id/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const credential = await storage.getApiCredential(id);
      if (!credential || credential.userId !== userId) {
        return res.status(404).json({ message: "Credential not found" });
      }

      const { syncExchange } = await import("../services/exchange-sync");
      const result = await syncExchange(credential.provider, credential.apiKey, credential.apiSecret);

      if (result.error) {
        return res.status(400).json({ message: `Sync failed: ${result.error}` });
      }

      const existingAccounts = await storage.getAccountsByUser(userId);
      let account = existingAccounts.find(a => a.credentialId === id);
      if (!account) {
        account = await storage.createAccount({
          userId,
          credentialId: id,
          provider: credential.provider,
          accountName: `${credential.provider} Account`,
          accountType: "exchange",
        });
      }

      const existingTxns = await storage.getTransactionsByUser(userId);
      const existingExternalIds = new Set(
        existingTxns.filter(t => t.externalId && t.accountId === account!.id).map(t => t.externalId)
      );

      let importedTrades = 0;
      for (const trade of result.trades) {
        if (existingExternalIds.has(trade.externalId)) continue;

        const totalValue = trade.quantity * trade.price;
        await storage.createTransaction({
          userId,
          accountId: account.id,
          assetSymbol: trade.asset,
          transactionType: trade.type,
          quantity: trade.quantity.toString(),
          pricePerUnit: trade.price.toString(),
          totalValue: totalValue.toFixed(2),
          fee: trade.fee.toString(),
          transactionDate: trade.date,
          externalId: trade.externalId,
          notes: `Imported from ${credential.provider}`,
        });
        importedTrades++;
      }

      for (const balance of result.balances) {
        if (balance.asset === "USD" || balance.asset === "USDT" || balance.asset === "BUSD" || balance.asset === "USDC") continue;
        const totalQty = balance.free + balance.locked;
        if (totalQty <= 0) continue;

        const existing = await storage.getPositionByUserAndAsset(userId, account.id, balance.asset);
        if (existing) {
          await storage.updatePosition(existing.id, {
            quantity: totalQty.toString(),
            updatedAt: new Date(),
          });
        } else {
          await storage.createPosition({
            userId,
            accountId: account.id,
            assetSymbol: balance.asset,
            quantity: totalQty.toString(),
            averageCost: "0",
            totalCostBasis: "0",
          });
        }
      }

      let assetPricesUpdated = 0;
      for (const balance of result.balances) {
        if (balance.asset === "USD" || balance.asset === "USDT" || balance.asset === "BUSD" || balance.asset === "USDC") continue;
        try {
          const coingeckoMap: Record<string, string> = {
            BTC: "bitcoin", ETH: "ethereum", XRP: "ripple", SOL: "solana",
            ADA: "cardano", DOGE: "dogecoin", DOT: "polkadot", AVAX: "avalanche-2",
            MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap", LTC: "litecoin",
            ATOM: "cosmos", ALGO: "algorand", FIL: "filecoin", NEAR: "near",
            APT: "aptos", ARB: "arbitrum", OP: "optimism", CRO: "crypto-com-chain",
            SHIB: "shiba-inu", PEPE: "pepe", RLUSD: "rlusd",
          };
          const coingeckoId = coingeckoMap[balance.asset];
          if (coingeckoId) {
            const priceData = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
            if (priceData.ok) {
              const prices = await priceData.json();
              const price = prices[coingeckoId]?.usd;
              if (price) {
                const existingAsset = await storage.getAsset(balance.asset);
                if (existingAsset) {
                  await storage.updateAssetPrice(balance.asset, price.toString());
                } else {
                  await storage.createAsset({
                    symbol: balance.asset,
                    name: balance.asset,
                    assetType: "crypto",
                    currentPrice: price.toString(),
                    coingeckoId,
                  });
                }
                assetPricesUpdated++;
              }
            }
          }
        } catch {
          // price fetch might fail, not critical
        }
      }

      await storage.updateApiCredential(id, { lastSyncAt: new Date() });

      res.json({
        success: true,
        message: "Sync completed",
        balances: result.balances.length,
        tradesImported: importedTrades,
        totalTrades: result.trades.length,
        pricesUpdated: assetPricesUpdated,
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ message: "Failed to sync: " + (error.message || "Unknown error") });
    }
  });

  app.get("/api/subscription/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      const { tier } = await getEffectiveTier(userId);

      const expiresAt = settings?.subscriptionExpiresAt ? new Date(settings.subscriptionExpiresAt) : null;
      const daysRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

      res.json({
        tier,
        billingCycle: settings?.subscriptionBillingCycle || null,
        paymentMethod: settings?.subscriptionPaymentMethod || null,
        expiresAt: expiresAt?.toISOString() || null,
        daysRemaining,
        renewalWallet: settings?.subscriptionRenewalWallet || null,
        isExpired: expiresAt ? expiresAt.getTime() < Date.now() : false,
      });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: "Failed to load subscription status" });
    }
  });

  app.get("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        settings = await storage.upsertUserSettings({
          userId,
          taxMethod: "FIFO",
          defaultCurrency: "USD",
        });
      }
      
      const { tier } = await getEffectiveTier(userId);
      if (tier === "pro" && settings.subscriptionTier !== "pro") {
        res.json({ ...settings, subscriptionTier: "pro", subscriptionBillingCycle: "yearly" });
        return;
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Settings error:", error);
      res.status(500).json({ message: "Failed to load settings" });
    }
  });

  app.get("/api/user-data/:key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { key } = req.params;
      const settings = await storage.getUserSettings(userId);
      const store = (settings?.userDataStore as Record<string, any>) || {};
      res.json({ value: store[key] ?? null });
    } catch (error) {
      console.error("User data read error:", error);
      res.status(500).json({ message: "Failed to read user data" });
    }
  });

  app.put("/api/user-data/:key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { key } = req.params;
      const { value } = req.body;
      let settings = await storage.getUserSettings(userId);
      const store = (settings?.userDataStore as Record<string, any>) || {};
      store[key] = value;
      await storage.upsertUserSettings({ userId, userDataStore: store });
      res.json({ success: true });
    } catch (error) {
      console.error("User data write error:", error);
      res.status(500).json({ message: "Failed to save user data" });
    }
  });

  app.delete("/api/user-data/:key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { key } = req.params;
      const settings = await storage.getUserSettings(userId);
      const store = (settings?.userDataStore as Record<string, any>) || {};
      delete store[key];
      await storage.upsertUserSettings({ userId, userDataStore: store });
      res.json({ success: true });
    } catch (error) {
      console.error("User data delete error:", error);
      res.status(500).json({ message: "Failed to delete user data" });
    }
  });

  app.put("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taxMethod, defaultCurrency, taxYear, businessName, businessLogo, businessTagline, businessEmail, businessWebsite, businessPhone, stellarAddress, fullName, addressLine1, addressLine2, profileCity, profileStateProvince, postalCode, profileCountry, rpcMode, customRpcUrl } = req.body;
      
      const updateData: any = { userId };
      if (taxMethod !== undefined) updateData.taxMethod = taxMethod;
      if (defaultCurrency !== undefined) updateData.defaultCurrency = defaultCurrency;
      if (taxYear !== undefined) updateData.taxYear = taxYear;
      if (businessName !== undefined) updateData.businessName = businessName;
      if (businessLogo !== undefined) updateData.businessLogo = businessLogo;
      if (businessTagline !== undefined) updateData.businessTagline = businessTagline;
      if (businessEmail !== undefined) updateData.businessEmail = businessEmail;
      if (businessWebsite !== undefined) updateData.businessWebsite = businessWebsite;
      if (businessPhone !== undefined) updateData.businessPhone = businessPhone;
      if (stellarAddress !== undefined) updateData.stellarAddress = stellarAddress;
      if (fullName !== undefined) updateData.fullName = fullName;
      if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
      if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
      if (profileCity !== undefined) updateData.profileCity = profileCity;
      if (profileStateProvince !== undefined) updateData.profileStateProvince = profileStateProvince;
      if (postalCode !== undefined) updateData.postalCode = postalCode;
      if (profileCountry !== undefined) updateData.profileCountry = profileCountry;
      if (rpcMode !== undefined) {
        if (typeof rpcMode !== "string" || !["direct", "relay", "custom"].includes(rpcMode)) {
          return res.status(400).json({ message: "Invalid rpcMode (must be direct, relay, or custom)" });
        }
        updateData.rpcMode = rpcMode;
      }
      if (customRpcUrl !== undefined) {
        if (customRpcUrl === null || customRpcUrl === "") {
          updateData.customRpcUrl = null;
        } else if (typeof customRpcUrl !== "string" || !/^https:\/\//i.test(customRpcUrl) || customRpcUrl.length > 500) {
          return res.status(400).json({ message: "customRpcUrl must be an https:// URL up to 500 chars" });
        } else {
          updateData.customRpcUrl = customRpcUrl;
        }
      }
      if (updateData.rpcMode === "custom" && !updateData.customRpcUrl) {
        const existing = await storage.getUserSettings(userId);
        if (!existing?.customRpcUrl) {
          return res.status(400).json({ message: "customRpcUrl is required when rpcMode is custom" });
        }
      }
      
      const settings = await storage.upsertUserSettings(updateData);
      
      res.json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

}
