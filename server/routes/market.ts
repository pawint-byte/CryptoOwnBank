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

export async function registerMarketRoutes(app: Express) {
  app.patch("/api/statement-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const source = await storage.getStatementSource(parseInt(req.params.id));
      if (!source || source.userId !== userId) {
        return res.status(404).json({ message: "Source not found" });
      }
      const { accountLabel, accountType } = req.body;
      const updated = await storage.updateStatementSource(source.id, {
        ...(accountLabel !== undefined && { accountLabel }),
        ...(accountType !== undefined && { accountType }),
      });
      res.json(updated);
    } catch (error) {
      console.error("Update statement source error:", error);
      res.status(500).json({ message: "Failed to update source" });
    }
  });

  app.delete("/api/statement-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const source = await storage.getStatementSource(parseInt(req.params.id));
      if (!source || source.userId !== userId) {
        return res.status(404).json({ message: "Source not found" });
      }
      await storage.deleteStatementSource(source.id);
      res.json({ message: "Source and all associated holdings deleted" });
    } catch (error) {
      console.error("Delete statement source error:", error);
      res.status(500).json({ message: "Failed to delete source" });
    }
  });

  app.get("/api/rwa/live-rates", async (_req: any, res) => {
    try {
      const { getRwaLiveRates } = await import("../services/rwa-rates");
      const rates = await getRwaLiveRates();
      res.json(rates);
    } catch (error) {
      console.error("RWA live rates error:", error);
      res.status(500).json({ message: "Failed to fetch RWA rates" });
    }
  });

  app.get("/api/xrpl/amm-pools", async (_req: any, res) => {
    try {
      const { getAmmPoolInfo } = await import("../services/xrpl-amm");
      const pools = await getAmmPoolInfo();
      res.json(pools);
    } catch (error) {
      console.error("AMM pools error:", error);
      res.status(500).json({ message: "Failed to fetch AMM pool data" });
    }
  });

  app.get("/api/xrpl/amm-positions/:address", isAuthenticated, async (req: any, res) => {
    try {
      const { getUserAmmPositions } = await import("../services/xrpl-amm");
      const positions = await getUserAmmPositions(req.params.address);
      res.json(positions);
    } catch (error) {
      console.error("AMM positions error:", error);
      res.status(500).json({ message: "Failed to fetch AMM positions" });
    }
  });

  app.get("/api/flare/wallet/:address", isAuthenticated, async (req: any, res) => {
    try {
      const { getFlareWalletInfo } = await import("../services/flare-ftso");
      const info = await getFlareWalletInfo(req.params.address);
      res.json(info);
    } catch (error) {
      console.error("Flare wallet error:", error);
      res.status(500).json({ message: "Failed to fetch Flare wallet data" });
    }
  });

  app.get("/api/flare/network-stats", async (_req: any, res) => {
    try {
      const { getFlareNetworkStats } = await import("../services/flare-ftso");
      const stats = await getFlareNetworkStats();
      res.json(stats);
    } catch (error) {
      console.error("Flare network stats error:", error);
      res.status(500).json({ message: "Failed to fetch Flare network stats" });
    }
  });

  app.get("/api/flare/vault-status", async (_req: any, res) => {
    try {
      const { getFlareVaultStatus } = await import("../services/flare-ftso");
      const status = await getFlareVaultStatus();
      res.json(status);
    } catch (error) {
      console.error("Flare vault status error:", error);
      res.status(500).json({ message: "Failed to fetch Flare vault status" });
    }
  });

  app.get("/api/dismissed-recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dismissed = await db.select().from(dismissedRecommendations).where(eq(dismissedRecommendations.userId, userId));
      res.json(dismissed);
    } catch (error) {
      console.error("Get dismissed recommendations error:", error);
      res.status(500).json({ message: "Failed to get dismissed recommendations" });
    }
  });

  app.post("/api/dismissed-recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetSymbol, walletLabel, reason } = req.body;
      if (!assetSymbol || typeof assetSymbol !== "string") {
        return res.status(400).json({ message: "assetSymbol is required" });
      }
      await db.insert(dismissedRecommendations).values({
        userId,
        assetSymbol: assetSymbol.toUpperCase(),
        walletLabel: walletLabel || null,
        reason: reason || "addressed",
      }).onConflictDoNothing();
      res.json({ message: "Recommendation dismissed" });
    } catch (error) {
      console.error("Dismiss recommendation error:", error);
      res.status(500).json({ message: "Failed to dismiss recommendation" });
    }
  });

  app.delete("/api/dismissed-recommendations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await db.delete(dismissedRecommendations).where(
        and(eq(dismissedRecommendations.id, id), eq(dismissedRecommendations.userId, userId))
      );
      res.json({ message: "Recommendation restored" });
    } catch (error) {
      console.error("Restore recommendation error:", error);
      res.status(500).json({ message: "Failed to restore recommendation" });
    }
  });

  app.get("/api/market-data/prices", isAuthenticated, async (_req: any, res) => {
    try {
      const { getCachedPrices } = await import("../services/market-data");
      const prices = await getCachedPrices();
      res.json(prices);
    } catch (error) {
      console.error("Market data prices error:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  app.get("/api/market-data/yields", isAuthenticated, async (_req: any, res) => {
    try {
      const { getCachedYields } = await import("../services/market-data");
      const yields = await getCachedYields();
      res.json(yields);
    } catch (error) {
      console.error("Market data yields error:", error);
      res.status(500).json({ message: "Failed to fetch yields" });
    }
  });

  app.get("/api/market-data/price-sources", isAuthenticated, async (_req: any, res) => {
    try {
      const { getPriceSources, getChainlinkTrackedSymbols } = await import("../services/market-data");
      const sources = getPriceSources();
      const chainlinkTrackedSymbols = getChainlinkTrackedSymbols();
      res.json({ sources, chainlinkTrackedSymbols });
    } catch (error) {
      console.error("Price sources error:", error);
      res.status(500).json({ message: "Failed to fetch price sources" });
    }
  });

  app.post("/api/market-data/refresh", isAuthenticated, async (_req: any, res) => {
    try {
      const { refreshAllMarketData, getCachedPrices, getCachedYields } = await import("../services/market-data");
      const { checkAndSendAlerts, sendWeeklyDigest } = await import("../services/email-service");
      const oldPrices = await getCachedPrices();
      const oldYields = await getCachedYields();
      const result = await refreshAllMarketData();
      const newPrices = await getCachedPrices();
      const newYields = await getCachedYields();
      await checkAndSendAlerts(newPrices, newYields, oldPrices, oldYields).catch(e => console.error("Alert check error:", e));
      await sendWeeklyDigest(newPrices, newYields).catch(e => console.error("Weekly digest error:", e));
      res.json({ message: "Market data refreshed", ...result });
    } catch (error) {
      console.error("Market data refresh error:", error);
      res.status(500).json({ message: "Failed to refresh market data" });
    }
  });

  app.get("/api/email-config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isEmailConfigured } = await import("../services/email-service");
      const config = await storage.getEmailConfigByUser(userId);
      res.json({ config: config || null, smtpConfigured: isEmailConfigured() });
    } catch (error) {
      console.error("Email config get error:", error);
      res.status(500).json({ message: "Failed to get email config" });
    }
  });

  app.post("/api/email-config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email, enabled, alertTypes } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const config = await storage.upsertEmailConfig(userId, { email, enabled, alertTypes });
      res.json(config);
    } catch (error) {
      console.error("Email config save error:", error);
      res.status(500).json({ message: "Failed to save email config" });
    }
  });

  app.post("/api/email-config/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sendTestEmail, isEmailConfigured } = await import("../services/email-service");
      if (!isEmailConfigured()) {
        return res.json({ sent: false, message: "SMTP not configured" });
      }
      const sent = await sendTestEmail(userId);
      res.json({ sent, message: sent ? "Test email sent" : "Failed to send" });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  app.get("/api/alert-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getAlertLogsByUser(userId, 50);
      res.json(logs);
    } catch (error) {
      console.error("Alert logs error:", error);
      res.status(500).json({ message: "Failed to fetch alert logs" });
    }
  });

  const TA_COINGECKO_IDS: Record<string, string> = {
    BTC: "bitcoin", ETH: "ethereum", XRP: "ripple", SOL: "solana",
    ADA: "cardano", DOT: "polkadot", XLM: "stellar", DOGE: "dogecoin",
    LTC: "litecoin", BNB: "binancecoin", AVAX: "avalanche-2", TRX: "tron",
    MATIC: "polygon-ecosystem-token", HBAR: "hedera-hashgraph", ALGO: "algorand",
    XDC: "xdcinnetwork", CRO: "crypto-com-chain", VET: "vechain",
    TON: "the-open-network", USDT: "tether", USDC: "usd-coin",
  };

  const ohlcCache = new Map<string, { data: any; expiry: number }>();

  app.get("/api/technical-analysis/ohlc/:symbol", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);

      const symbol = (req.params.symbol as string).toUpperCase();
      const maxDays = tier === "free" ? 30 : 3650;
      const rawDays = parseInt(req.query.days as string);
      const days = Math.max(1, Math.min(Number.isFinite(rawDays) ? rawDays : 90, maxDays));

      const cgId = TA_COINGECKO_IDS[symbol];
      if (!cgId) {
        return res.status(400).json({ message: `Unsupported symbol: ${symbol}` });
      }

      const cacheKey = `${cgId}-${days}`;
      const cached = ohlcCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return res.json({ symbol, days, ohlc: cached.data });
      }

      const url = `https://api.coingecko.com/api/v3/coins/${cgId}/ohlc?vs_currency=usd&days=${days}`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; CryptoOwnBank/1.0)" },
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        console.error(`[ta] CoinGecko OHLC error: ${resp.status} for ${symbol}`);
        return res.status(502).json({ message: "Failed to fetch OHLC data from provider" });
      }

      const raw = await resp.json();
      const ohlc = (raw as number[][]).map((candle: number[]) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
      }));

      ohlcCache.set(cacheKey, { data: ohlc, expiry: Date.now() + 2 * 60 * 60 * 1000 });

      res.json({ symbol, days, ohlc });
    } catch (error) {
      console.error("Technical analysis OHLC error:", error);
      res.status(500).json({ message: "Failed to fetch OHLC data" });
    }
  });

  app.get("/api/technical-analysis/symbols", isAuthenticated, async (_req: any, res) => {
    res.json({ symbols: Object.keys(TA_COINGECKO_IDS) });
  });

  // Crypto News Feed (RSS aggregation)
  const NEWS_FEEDS = [
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", icon: "coindesk" },
    { name: "CoinTelegraph", url: "https://cointelegraph.com/rss", icon: "cointelegraph" },
    { name: "Decrypt", url: "https://decrypt.co/feed", icon: "decrypt" },
    { name: "The Block", url: "https://www.theblock.co/rss.xml", icon: "theblock" },
  ];

  interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    sourceIcon: string;
    snippet: string;
    categories: string[];
  }

  let newsCache: { items: NewsItem[]; fetchedAt: number } = { items: [], fetchedAt: 0 };
  const NEWS_CACHE_INTERVAL = 15 * 60 * 1000;

  async function fetchNewsFeeds(): Promise<NewsItem[]> {
    const now = Date.now();
    if (newsCache.fetchedAt > 0 && now - newsCache.fetchedAt < NEWS_CACHE_INTERVAL) {
      return newsCache.items;
    }

    try {
      const RssParser = (await import("rss-parser")).default;
      const parser = new RssParser({
        timeout: 10000,
        headers: { "User-Agent": "CryptoOwnBank/1.0 NewsAggregator" },
      });

      const allItems: NewsItem[] = [];

      const results = await Promise.allSettled(
        NEWS_FEEDS.map(async (feed) => {
          try {
            const parsed = await parser.parseURL(feed.url);
            return (parsed.items || []).slice(0, 15).map((item: any) => ({
              title: (item.title || "").trim(),
              link: item.link || "",
              pubDate: item.pubDate || item.isoDate || "",
              source: feed.name,
              sourceIcon: feed.icon,
              snippet: (item.contentSnippet || item.content || "")
                .replace(/<[^>]*>/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 200),
              categories: (item.categories || []).slice(0, 3).map((c: any) =>
                typeof c === "string" ? c : c?._ || ""
              ).filter(Boolean),
            }));
          } catch (err) {
            console.log(`[news] Failed to fetch ${feed.name}: ${(err as any)?.message?.slice(0, 60)}`);
            return [];
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          allItems.push(...result.value);
        }
      }

      allItems.sort((a, b) => {
        const da = new Date(a.pubDate).getTime();
        const db = new Date(b.pubDate).getTime();
        return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
      });

      const deduplicated = allItems.filter((item, idx, arr) =>
        arr.findIndex(i => i.title.toLowerCase() === item.title.toLowerCase()) === idx
      );

      newsCache = { items: deduplicated.slice(0, 50), fetchedAt: now };
      console.log(`[news] Fetched ${deduplicated.length} articles from ${NEWS_FEEDS.length} sources`);
    } catch (error) {
      console.error("[news] Feed fetch failed:", (error as any)?.message);
    }

    return newsCache.items;
  }

  app.get("/api/news", async (_req: any, res) => {
    try {
      const items = await fetchNewsFeeds();
      res.json({
        items,
        sources: NEWS_FEEDS.map(f => f.name),
        fetchedAt: newsCache.fetchedAt ? new Date(newsCache.fetchedAt).toISOString() : null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load news" });
    }
  });

  const ASSET_KEYWORDS: Record<string, string[]> = {
    XRP: ["xrp", "ripple", "xrpl", "rlusd", "xls-66", "xls-65", "xumm", "xaman"],
    BTC: ["bitcoin", "btc", "satoshi", "lightning network", "ordinals"],
    ETH: ["ethereum", "eth", "vitalik", "erc-20", "layer 2", "l2"],
    XLM: ["stellar", "xlm", "stellar lumens"],
    SOL: ["solana", "sol"],
    ADA: ["cardano", "ada"],
    DOT: ["polkadot", "dot", "parachain"],
    AVAX: ["avalanche", "avax"],
    MATIC: ["polygon", "matic", "pol"],
    LINK: ["chainlink", "link"],
    DOGE: ["dogecoin", "doge"],
    ATOM: ["cosmos", "atom"],
    ALGO: ["algorand", "algo"],
    HBAR: ["hedera", "hbar"],
    XDC: ["xdc", "xinfin"],
    VET: ["vechain", "vet"],
    CRO: ["cronos", "cro", "crypto.com"],
    TON: ["toncoin", "ton", "telegram open network"],
    USDT: ["tether", "usdt"],
    USDC: ["usdc", "circle"],
    RLUSD: ["rlusd", "ripple usd"],
  };

  const GENERAL_KEYWORDS = ["sec", "regulation", "etf", "defi", "stablecoin", "cbdc", "tax", "irs", "crypto ban", "exchange hack", "security breach"];

  app.get("/api/news/personalized", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const balances = await db.select({
        symbol: walletBalances.symbol,
      }).from(walletBalances).where(eq(walletBalances.userId, userId));

      const heldSymbols = [...new Set(balances.map(b => b.symbol?.toUpperCase()).filter(Boolean))];

      const allKeywords: { keyword: string; asset: string }[] = [];
      for (const symbol of heldSymbols) {
        const keywords = ASSET_KEYWORDS[symbol];
        if (keywords) {
          for (const kw of keywords) {
            allKeywords.push({ keyword: kw, asset: symbol });
          }
        } else {
          allKeywords.push({ keyword: symbol.toLowerCase(), asset: symbol });
        }
      }

      const allItems = await fetchNewsFeeds();

      const forYou: (NewsItem & { matchedAssets: string[]; relevanceScore: number })[] = [];

      for (const item of allItems) {
        const searchText = `${item.title} ${item.snippet} ${item.categories.join(" ")}`.toLowerCase();
        const matched = new Set<string>();
        let score = 0;

        for (const { keyword, asset } of allKeywords) {
          if (searchText.includes(keyword)) {
            matched.add(asset);
            if (item.title.toLowerCase().includes(keyword)) {
              score += 3;
            } else {
              score += 1;
            }
          }
        }

        for (const gk of GENERAL_KEYWORDS) {
          if (searchText.includes(gk)) {
            score += 0.5;
          }
        }

        if (matched.size > 0) {
          forYou.push({
            ...item,
            matchedAssets: [...matched],
            relevanceScore: score,
          });
        }
      }

      forYou.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
        const da = new Date(a.pubDate).getTime();
        const db2 = new Date(b.pubDate).getTime();
        return (isNaN(db2) ? 0 : db2) - (isNaN(da) ? 0 : da);
      });

      res.json({
        forYou: forYou.slice(0, 10),
        heldAssets: heldSymbols,
        totalMatched: forYou.length,
      });
    } catch (error) {
      console.error("[news] Personalized feed error:", error);
      res.status(500).json({ message: "Failed to load personalized news" });
    }
  });

  app.get("/api/whale-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

      let since: Date | undefined;
      if (tier === "free") {
        since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const alerts = await storage.getWhaleAlerts(limit, since);
      res.json({ alerts, tierRestricted: tier === "free" });
    } catch (error) {
      console.error("Whale alerts error:", error);
      res.status(500).json({ message: "Failed to fetch whale alerts" });
    }
  });

  app.get("/api/whale-alerts/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getWhaleAlertSettings(userId);
      res.json(settings || { xrpThreshold: "100000", rlusdThreshold: "10000", enabled: true });
    } catch (error) {
      console.error("Whale alert settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/whale-alerts/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      if (tier === "free") {
        return res.status(403).json({ message: "Custom whale alert settings require Premium or Pro" });
      }
      const { xrpThreshold, rlusdThreshold, enabled } = req.body;
      const xrpNum = xrpThreshold !== undefined ? Number(xrpThreshold) : undefined;
      const rlusdNum = rlusdThreshold !== undefined ? Number(rlusdThreshold) : undefined;
      if ((xrpNum !== undefined && (!Number.isFinite(xrpNum) || xrpNum < 100_000)) ||
          (rlusdNum !== undefined && (!Number.isFinite(rlusdNum) || rlusdNum < 10_000))) {
        return res.status(400).json({ message: "Invalid thresholds. XRP minimum is 100,000 and RLUSD minimum is 10,000." });
      }
      const settings = await storage.upsertWhaleAlertSettings(userId, {
        xrpThreshold: xrpNum !== undefined ? xrpNum.toString() : undefined,
        rlusdThreshold: rlusdNum !== undefined ? rlusdNum.toString() : undefined,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
      });
      res.json(settings);
    } catch (error) {
      console.error("Whale alert settings update error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  let xrpMarketCache: { data: any; expiry: number } | null = null;

  app.get("/api/xrp-market-stats", isAuthenticated, async (_req: any, res) => {
    try {
      if (xrpMarketCache && xrpMarketCache.expiry > Date.now()) {
        return res.json(xrpMarketCache.data);
      }

      const resp = await fetch(
        "https://api.coingecko.com/api/v3/coins/ripple?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false",
        {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; CryptoOwnBank/1.0)" },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!resp.ok) {
        return res.status(502).json({ message: "Failed to fetch XRP market data" });
      }

      const coin = await resp.json() as any;
      const md = coin.market_data || {};

      const data = {
        price: md.current_price?.usd || 0,
        priceChange24h: md.price_change_percentage_24h || 0,
        marketCap: md.market_cap?.usd || 0,
        circulatingSupply: md.circulating_supply || 0,
        totalSupply: md.total_supply || 0,
        maxSupply: md.max_supply || 100_000_000_000,
        fullyDilutedValuation: md.fully_diluted_valuation?.usd || 0,
      };

      xrpMarketCache = { data, expiry: Date.now() + 5 * 60 * 1000 };
      res.json(data);
    } catch (error) {
      console.error("XRP market stats error:", error);
      res.status(500).json({ message: "Failed to fetch XRP market stats" });
    }
  });

  const { captureError } = await import("../errorMonitor");

  const clientErrorRateMap = new Map<string, number>();
  const CLIENT_ERROR_RATE_LIMIT_MS = 5000;
  const CLIENT_ERROR_RATE_LIMIT_CLEANUP = 60000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of clientErrorRateMap) {
      if (now - ts > CLIENT_ERROR_RATE_LIMIT_CLEANUP) clientErrorRateMap.delete(key);
    }
  }, CLIENT_ERROR_RATE_LIMIT_CLEANUP);

  app.post("/api/errors/report", async (req: any, res) => {
    try {
      const { message, stack, route, source, metadata } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Error message is required" });
      }

      const ip = req.ip || req.connection?.remoteAddress || "unknown";
      const rateKey = `${ip}:${String(message).slice(0, 100)}`;
      const now = Date.now();
      const lastReport = clientErrorRateMap.get(rateKey);
      if (lastReport && now - lastReport < CLIENT_ERROR_RATE_LIMIT_MS) {
        return res.json({ success: true, throttled: true });
      }
      clientErrorRateMap.set(rateKey, now);

      console.log(`[client-error] route=${route || "?"} source=${source || "?"} msg=${String(message).slice(0, 300)}`);
      if (stack) console.log(`[client-error] stack=${String(stack).slice(0, 500)}`);

      const userId = req.user?.claims?.sub || null;
      const userEmail = req.user?.claims?.email || null;

      const allowedSeverities = ["info", "warning", "error"];
      const safeSeverity = allowedSeverities.includes(req.body.severity) ? req.body.severity : "error";

      await captureError({
        message: String(message).slice(0, 2000),
        stack: stack ? String(stack).slice(0, 5000) : undefined,
        source: source || "client",
        route: route ? String(route).slice(0, 500) : undefined,
        severity: safeSeverity,
        userId,
        userEmail,
        userAgent: req.headers["user-agent"],
        metadata: metadata || null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error report endpoint failed:", error);
      res.status(500).json({ message: "Failed to report error" });
    }
  });

}
