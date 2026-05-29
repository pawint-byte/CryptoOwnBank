import crypto from "crypto";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "../replit_integrations/auth";
import { registerTaxRoutes } from "./tax";
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

export function registerBillingRoutes(app: Express) {
  app.get("/api/stellar/address", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json({ stellarAddress: settings?.stellarAddress || null });
    } catch (error) {
      console.error("Get stellar address error:", error);
      res.status(500).json({ message: "Failed to load Stellar address" });
    }
  });

  app.put("/api/stellar/address", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stellarAddress } = req.body;

      if (stellarAddress && (!stellarAddress.startsWith("G") || stellarAddress.length !== 56)) {
        return res.status(400).json({ message: "Invalid Stellar address" });
      }

      await storage.upsertUserSettings({ userId, stellarAddress: stellarAddress || null });
      res.json({ stellarAddress: stellarAddress || null });
    } catch (error) {
      console.error("Update stellar address error:", error);
      res.status(500).json({ message: "Failed to update Stellar address" });
    }
  });

  app.delete("/api/stellar/address", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.upsertUserSettings({ userId, stellarAddress: null });
      res.json({ stellarAddress: null });
    } catch (error) {
      console.error("Delete stellar address error:", error);
      res.status(500).json({ message: "Failed to remove Stellar address" });
    }
  });

  app.get("/api/security-phrase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select({ securityPhrase: users.securityPhrase }).from(users).where(eq(users.id, userId));
      res.json({ securityPhrase: user?.securityPhrase || null });
    } catch (error) {
      console.error("Get security phrase error:", error);
      res.status(500).json({ message: "Failed to load security phrase" });
    }
  });

  app.put("/api/security-phrase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { securityPhrase } = req.body;
      if (!securityPhrase || typeof securityPhrase !== "string" || securityPhrase.trim().length < 3) {
        return res.status(400).json({ message: "Security phrase must be at least 3 characters" });
      }
      if (securityPhrase.trim().length > 100) {
        return res.status(400).json({ message: "Security phrase must be 100 characters or less" });
      }
      await db.update(users).set({ securityPhrase: securityPhrase.trim() }).where(eq(users.id, userId));
      res.json({ securityPhrase: securityPhrase.trim() });
    } catch (error) {
      console.error("Update security phrase error:", error);
      res.status(500).json({ message: "Failed to update security phrase" });
    }
  });

  registerTaxRoutes(app);

  app.post("/api/stripe/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body;

      const validPlans = ["monthly", "yearly", "pro-monthly", "pro-yearly"];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Use 'monthly', 'yearly', 'pro-monthly', or 'pro-yearly'." });
      }

      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const baseUrl = `${protocol}://${host}`;

      const session = await createCheckoutSession(
        userId,
        plan as "monthly" | "yearly" | "pro-monthly" | "pro-yearly",
        `${baseUrl}/settings?subscription=success`,
        `${baseUrl}/settings?subscription=cancelled`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/onramp-session", async (req: any, res) => {
    try {
      const { walletAddress, destinationCurrency, destinationNetwork, sourceAmount } = req.body || {};
      if (!walletAddress || typeof walletAddress !== "string" || walletAddress.trim().length < 10) {
        return res.status(400).json({ message: "Valid walletAddress is required" });
      }
      if (!destinationCurrency || typeof destinationCurrency !== "string") {
        return res.status(400).json({ message: "destinationCurrency is required" });
      }
      if (!destinationNetwork || typeof destinationNetwork !== "string") {
        return res.status(400).json({ message: "destinationNetwork is required" });
      }
      if (!isValidAddressForNetwork(walletAddress.trim(), destinationNetwork)) {
        return res.status(400).json({ message: `Invalid ${destinationNetwork} wallet address format` });
      }
      const amt = sourceAmount != null ? Number(sourceAmount) : undefined;
      const session = await createOnrampSession({
        walletAddress: walletAddress.trim(),
        destinationCurrency: destinationCurrency.toLowerCase(),
        destinationNetwork: destinationNetwork.toLowerCase(),
        sourceAmount: amt && !isNaN(amt) && amt > 0 ? amt : undefined,
        lockWalletAddress: true,
      });
      res.json(session);
    } catch (err: any) {
      console.error("Stripe onramp session error:", err?.message || err);
      res.status(500).json({ message: err?.message || "Failed to create onramp session" });
    }
  });

  app.get("/api/thorchain/quote", async (req, res) => {
    try {
      const { fromAsset, toAsset, amount, destination, affiliateBps, affiliateAddress, toleranceBps } = req.query as Record<string, string>;
      if (!fromAsset || !toAsset || !amount || !destination) {
        return res.status(400).json({ message: "fromAsset, toAsset, amount, destination are required" });
      }
      let amt: bigint;
      try {
        amt = BigInt(amount);
      } catch {
        return res.status(400).json({ message: "amount must be an integer (1e8 base units)" });
      }
      if (amt <= 0n) {
        return res.status(400).json({ message: "amount must be > 0" });
      }
      const quote = await getThorSwapQuote({
        fromAsset,
        toAsset,
        amount: amt,
        destination,
        affiliateBps: affiliateBps ? Number(affiliateBps) : undefined,
        affiliateAddress: affiliateAddress || undefined,
        toleranceBps: toleranceBps ? Number(toleranceBps) : undefined,
      });
      res.json(quote);
    } catch (err: any) {
      console.error("THORChain quote error:", err?.message || err);
      res.status(500).json({ message: err?.message || "Quote failed" });
    }
  });

  app.get("/api/thorchain/inbound", async (_req, res) => {
    try {
      const addrs = await getThorInboundAddresses();
      res.json(addrs);
    } catch (err: any) {
      console.error("THORChain inbound error:", err?.message || err);
      res.status(500).json({ message: err?.message || "Inbound lookup failed" });
    }
  });

  app.get("/api/thorchain/status", async (req, res) => {
    try {
      const txId = (req.query.txId as string) || "";
      if (!txId) return res.status(400).json({ message: "txId is required" });
      const data = await getThorSwapStatus(txId);
      res.json(data);
    } catch (err: any) {
      console.error("THORChain status error:", err?.message || err);
      res.status(500).json({ message: err?.message || "Status lookup failed" });
    }
  });

  app.post("/api/stripe/webhook", async (req: any, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: any;
      if (!webhookSecret) {
        event = req.body;
      } else {
        const { stripe } = await import("../stripe");
        event = stripe.webhooks.constructEvent(
          JSON.stringify(req.body),
          sig,
          webhookSecret
        );
      }

      await handleStripeWebhookEvent(event);

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({ message: "Webhook error" });
    }
  });

  app.get("/api/stripe/plans", (_req, res) => {
    res.json(PLANS);
  });

  app.get("/api/addons/catalog", (_req, res) => {
    res.json(ADDONS);
  });

  app.get("/api/addons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const addons = await storage.getActiveUserAddons(userId);
      res.json(addons);
    } catch (error) {
      console.error("Get addons error:", error);
      res.status(500).json({ message: "Failed to load add-ons" });
    }
  });

  app.get("/api/addons/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const addons = await storage.getUserAddons(userId);
      res.json(addons);
    } catch (error) {
      console.error("Get all addons error:", error);
      res.status(500).json({ message: "Failed to load add-ons" });
    }
  });

  app.post("/api/addons/stripe-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { addonKey } = req.body;

      if (!addonKey || !ADDONS[addonKey as AddonKey]) {
        return res.status(400).json({ message: "Invalid add-on key." });
      }

      const { tier } = await getEffectiveTier(userId);
      const isLegacy = isLegacyAddon(addonKey);
      if (isLegacy) {
        if (tier === "pro") return res.status(400).json({ message: "Legacy Plan is already included in your Pro tier." });
        const now = new Date();
        for (const k of LEGACY_ADDON_KEYS) {
          const existingLegacy = await storage.getUserAddonByKey(userId, k);
          if (existingLegacy && existingLegacy.status === "active" && (!existingLegacy.expiresAt || new Date(existingLegacy.expiresAt) > now)) {
            return res.status(400).json({ message: "You already have an active Legacy Plan. Cancel it first to switch billing options." });
          }
        }
      } else {
        if (tier === "premium" || tier === "pro") return res.status(400).json({ message: "This feature is already included in your plan." });
        const existing = await storage.getUserAddonByKey(userId, addonKey);
        if (existing) {
          return res.status(400).json({ message: "You already have this add-on active." });
        }
      }

      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "http://localhost:5000";

      const successPath = isLegacy ? "/legacy-plan?addon_success=true" : "/settings?addon_success=true";
      const cancelPath = isLegacy ? "/pricing?addon_cancelled=true" : "/settings?addon_cancelled=true";
      const session = await createAddonCheckoutSession(
        userId,
        addonKey as AddonKey,
        `${baseUrl}${successPath}`,
        `${baseUrl}${cancelPath}`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Addon Stripe checkout error:", error);
      res.status(500).json({ message: "Failed to create addon checkout" });
    }
  });

  app.post("/api/addons/crypto-purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { addonKey, chain } = req.body;

      if (!addonKey || !ADDONS[addonKey as AddonKey]) {
        return res.status(400).json({ message: "Invalid add-on key." });
      }
      if (!chain) {
        return res.status(400).json({ message: "Chain is required." });
      }

      const { tier } = await getEffectiveTier(userId);
      const isLegacy = isLegacyAddon(addonKey);
      if (isLegacy) {
        if (tier === "pro") return res.status(400).json({ message: "Legacy Plan is already included in your Pro tier." });
        const now = new Date();
        for (const k of LEGACY_ADDON_KEYS) {
          const existingLegacy = await storage.getUserAddonByKey(userId, k);
          if (existingLegacy && existingLegacy.status === "active" && (!existingLegacy.expiresAt || new Date(existingLegacy.expiresAt) > now)) {
            return res.status(400).json({ message: "You already have an active Legacy Plan. Cancel it first to switch billing options." });
          }
        }
      } else {
        if (tier === "premium" || tier === "pro") return res.status(400).json({ message: "This feature is already included in your plan." });
        const existing = await storage.getUserAddonByKey(userId, addonKey);
        if (existing) {
          return res.status(400).json({ message: "You already have this add-on active." });
        }
      }

      const pendingPayments = await storage.getCryptoPaymentsByUser(userId);
      const hasPending = pendingPayments.some(p => p.plan === `addon:${addonKey}` && p.status === "pending");
      if (hasPending) {
        return res.status(400).json({ message: "You already have a pending payment for this add-on." });
      }

      const addonConfig = ADDONS[addonKey as AddonKey];
      const usdAmount = applyCryptoDiscount(addonConfig.amount / 100, chain);

      const ALL_SUPPORTED_CHAINS = [
        "xrp", "rlusd", "bitcoin", "ethereum", "solana", "dogecoin", "litecoin",
        "cardano", "avalanche", "algorand", "cosmos", "tron", "hedera",
        "polkadot", "vechain", "digibyte", "casper", "cronos", "nervos",
        "zilliqa", "ton", "stellar", "verge", "xdc", "polygon",
      ];
      if (!ALL_SUPPORTED_CHAINS.includes(chain.toLowerCase())) {
        return res.status(400).json({ message: `Unsupported chain: ${chain}` });
      }

      const addresses = await storage.getCryptoPaymentAddresses(true);
      const paymentAddr = addresses.find(a => a.chain.toLowerCase() === chain.toLowerCase());
      if (!paymentAddr) {
        return res.status(400).json({ message: `No payment address configured for ${chain}.` });
      }

      const CHAIN_TO_COINGECKO: Record<string, string> = {
        bitcoin: "bitcoin", ethereum: "ethereum", solana: "solana",
        xrp: "ripple", rlusd: "ripple-usd", dogecoin: "dogecoin", litecoin: "litecoin",
        cardano: "cardano", avalanche: "avalanche-2", algorand: "algorand",
        cosmos: "cosmos", tron: "tron", hedera: "hedera-hashgraph",
        polkadot: "polkadot", vechain: "vechain", stellar: "stellar",
        ton: "the-open-network", polygon: "matic-network", cronos: "crypto-com-chain",
        xdc: "xdce-crowd-sale", digibyte: "digibyte", casper: "casper-network",
        nervos: "nervos-network", zilliqa: "zilliqa", verge: "verge",
      };

      const coingeckoId = CHAIN_TO_COINGECKO[chain.toLowerCase()];
      if (!coingeckoId) {
        return res.status(400).json({ message: `Unsupported chain: ${chain}` });
      }

      const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
      const priceData = await priceRes.json();
      const price = priceData[coingeckoId]?.usd;
      if (!price || price <= 0) {
        return res.status(500).json({ message: "Failed to fetch current price." });
      }

      let cryptoAmount = usdAmount / price;
      const uniqueSuffix = Math.floor(Math.random() * 900 + 100) / 1e8;
      cryptoAmount += uniqueSuffix;

      const CHAIN_TO_ASSET: Record<string, string> = {
        bitcoin: "BTC", ethereum: "ETH", solana: "SOL", xrp: "XRP", rlusd: "RLUSD",
        dogecoin: "DOGE", litecoin: "LTC", cardano: "ADA", avalanche: "AVAX",
        algorand: "ALGO", cosmos: "ATOM", tron: "TRX", hedera: "HBAR",
        polkadot: "DOT", vechain: "VET", stellar: "XLM", ton: "TON",
        polygon: "MATIC", cronos: "CRO", xdc: "XDC", digibyte: "DGB",
        casper: "CSPR", nervos: "CKB", zilliqa: "ZIL", verge: "XVG",
      };

      let destinationTag: number | null = null;
      if (chain.toLowerCase() === "xrp" || chain.toLowerCase() === "rlusd") {
        destinationTag = Math.floor(Math.random() * 2_000_000_000) + 1;
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const payment = await storage.createCryptoPayment({
        userId,
        plan: `addon:${addonKey}`,
        chain: chain.toLowerCase(),
        toAddress: paymentAddr.address,
        expectedAmount: cryptoAmount.toFixed(8),
        expectedAsset: CHAIN_TO_ASSET[chain.toLowerCase()] || chain.toUpperCase(),
        usdAmount: usdAmount.toFixed(2),
        destinationTag,
        status: "pending",
        expiresAt,
      });

      res.json({
        id: payment.id,
        toAddress: payment.toAddress,
        expectedAmount: payment.expectedAmount,
        expectedAsset: payment.expectedAsset,
        usdAmount: payment.usdAmount,
        destinationTag: payment.destinationTag,
        expiresAt: payment.expiresAt,
        status: payment.status,
        chain: payment.chain,
        addonKey,
      });
    } catch (error) {
      console.error("Addon crypto purchase error:", error);
      res.status(500).json({ message: "Failed to create addon crypto payment" });
    }
  });

  app.post("/api/addons/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const addon = await storage.getUserAddon(req.params.id);

      if (!addon || addon.userId !== userId) {
        return res.status(404).json({ message: "Add-on not found." });
      }
      if (addon.status !== "active") {
        return res.status(400).json({ message: "Add-on is not active." });
      }

      if (addon.stripeSubscriptionId) {
        try {
          const { stripe } = await import("../stripe");
          await stripe.subscriptions.cancel(addon.stripeSubscriptionId);
        } catch (err) {
          console.error("Failed to cancel Stripe addon subscription:", err);
        }
      }

      const cancelled = await storage.cancelUserAddon(addon.id);
      res.json(cancelled);
    } catch (error) {
      console.error("Cancel addon error:", error);
      res.status(500).json({ message: "Failed to cancel add-on" });
    }
  });

  app.get("/api/crypto-payment/addresses", async (_req, res) => {
    try {
      const addresses = await storage.getCryptoPaymentAddresses(true);
      res.json(addresses);
    } catch (error) {
      console.error("Crypto payment addresses error:", error);
      res.status(500).json({ message: "Failed to load payment addresses" });
    }
  });

  app.post("/api/crypto-payment/create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan, chain } = req.body;

      const validPlans = ["monthly", "yearly", "pro-monthly", "pro-yearly"];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Use 'monthly', 'yearly', 'pro-monthly', or 'pro-yearly'." });
      }
      if (!chain) {
        return res.status(400).json({ message: "Chain is required." });
      }

      const ALL_SUPPORTED_CHAINS = [
        "xrp", "rlusd", "bitcoin", "ethereum", "solana", "dogecoin", "litecoin",
        "cardano", "avalanche", "algorand", "cosmos", "tron", "hedera",
        "polkadot", "vechain", "digibyte", "casper", "cronos", "nervos",
        "zilliqa", "ton", "stellar", "verge", "xdc", "polygon",
      ];
      if (!ALL_SUPPORTED_CHAINS.includes(chain.toLowerCase())) {
        return res.status(400).json({ message: `Unsupported chain: ${chain}` });
      }

      const addresses = await storage.getCryptoPaymentAddresses(true);
      const paymentAddr = addresses.find(a => a.chain.toLowerCase() === chain.toLowerCase());
      if (!paymentAddr) {
        return res.status(400).json({ message: `No payment address configured for ${chain}.` });
      }

      const FULL_USD: Record<string, number> = {
        monthly: 29,
        yearly: 199,
        "pro-monthly": 99,
        "pro-yearly": 799,
      };
      const usdAmount = applyCryptoDiscount(FULL_USD[plan], chain);

      const CHAIN_TO_COINGECKO: Record<string, string> = {
        bitcoin: "bitcoin", ethereum: "ethereum", solana: "solana",
        xrp: "ripple", rlusd: "ripple-usd", dogecoin: "dogecoin", litecoin: "litecoin",
        cardano: "cardano", avalanche: "avalanche-2", algorand: "algorand",
        cosmos: "cosmos", tron: "tron", hedera: "hedera-hashgraph",
        polkadot: "polkadot", vechain: "vechain", stellar: "stellar",
        ton: "the-open-network", polygon: "matic-network", cronos: "crypto-com-chain",
        xdc: "xdce-crowd-sale", digibyte: "digibyte", casper: "casper-network",
        nervos: "nervos-network", zilliqa: "zilliqa", verge: "verge",
      };

      const coingeckoId = CHAIN_TO_COINGECKO[chain.toLowerCase()];
      if (!coingeckoId) {
        return res.status(400).json({ message: `Unsupported chain: ${chain}` });
      }

      const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
      const priceData = await priceRes.json();
      const price = priceData[coingeckoId]?.usd;
      if (!price || price <= 0) {
        return res.status(500).json({ message: "Failed to fetch current price." });
      }

      let cryptoAmount = usdAmount / price;
      const uniqueSuffix = Math.floor(Math.random() * 900 + 100) / 1e8;
      cryptoAmount += uniqueSuffix;

      const CHAIN_TO_ASSET: Record<string, string> = {
        bitcoin: "BTC", ethereum: "ETH", solana: "SOL", xrp: "XRP", rlusd: "RLUSD",
        dogecoin: "DOGE", litecoin: "LTC", cardano: "ADA", avalanche: "AVAX",
        algorand: "ALGO", cosmos: "ATOM", tron: "TRX", hedera: "HBAR",
        polkadot: "DOT", vechain: "VET", stellar: "XLM", ton: "TON",
        polygon: "MATIC", cronos: "CRO", xdc: "XDC", digibyte: "DGB",
        casper: "CSPR", nervos: "CKB", zilliqa: "ZIL", verge: "XVG",
      };

      let destinationTag: number | null = null;
      if (chain.toLowerCase() === "xrp" || chain.toLowerCase() === "rlusd") {
        destinationTag = Math.floor(Math.random() * 2_000_000_000) + 1;
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const payment = await storage.createCryptoPayment({
        userId,
        plan,
        chain: chain.toLowerCase(),
        toAddress: paymentAddr.address,
        expectedAmount: cryptoAmount.toFixed(8),
        expectedAsset: CHAIN_TO_ASSET[chain.toLowerCase()] || chain.toUpperCase(),
        usdAmount: usdAmount.toFixed(2),
        destinationTag,
        status: "pending",
        expiresAt,
      });

      const refCode = `COB-${payment.id.toString().padStart(4, "0")}`;

      res.json({
        id: payment.id,
        referenceCode: refCode,
        toAddress: payment.toAddress,
        expectedAmount: payment.expectedAmount,
        expectedAsset: payment.expectedAsset,
        usdAmount: payment.usdAmount,
        destinationTag: payment.destinationTag,
        expiresAt: payment.expiresAt,
        status: payment.status,
        chain: payment.chain,
        plan: payment.plan,
      });
    } catch (error) {
      console.error("Crypto payment create error:", error);
      res.status(500).json({ message: "Failed to create crypto payment" });
    }
  });

  app.get("/api/crypto-payment/status/:id", isAuthenticated, async (req: any, res) => {
    try {
      const payment = await storage.getCryptoPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found." });
      }
      if (payment.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied." });
      }
      res.json({
        id: payment.id,
        status: payment.status,
        txHash: payment.txHash,
        confirmedAt: payment.confirmedAt,
        expiresAt: payment.expiresAt,
        expectedAmount: payment.expectedAmount,
        expectedAsset: payment.expectedAsset,
        toAddress: payment.toAddress,
        destinationTag: payment.destinationTag,
        chain: payment.chain,
        plan: payment.plan,
      });
    } catch (error) {
      console.error("Crypto payment status error:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

}
