import crypto from "crypto";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "./replit_integrations/auth";
import { insertTransactionSchema, insertApiCredentialSchema, userSettings as userSettingsTable, users, insertPriceAlertSchema, insertWalletSchema, priceCache as priceCacheTable, walletBalances, wallets, xamanConnections, taxLots, featureAnnouncements, legacyPlans, autoWithdrawLogs, type CustomVault, properties, insertPropertySchema, dismissedRecommendations, transactions, aiChatMessages, scheduledPayments, offChainHoldings, insertOffChainHoldingSchema, OFF_CHAIN_ASSET_TYPES, OFF_CHAIN_STATUSES, ROADMAP_STATUSES, ROADMAP_CATEGORIES, type RoadmapStatus, type InsertRoadmapItem, insertWhisperSchema, positions } from "@shared/schema";
import OpenAI from "openai";
import { createCheckoutSession, createAddonCheckoutSession, PLANS, ADDONS, type AddonKey, getCryptoDiscountRate, applyCryptoDiscount, isHouseChain, isLegacyAddon, LEGACY_ADDON_KEYS, isLegacyAddonActive } from "./stripe";
import { handleStripeWebhookEvent } from "./stripe-webhook";
import { createOnrampSession, isValidAddressForNetwork } from "./stripe-onramp";
import { getSwapQuote as getThorSwapQuote, getInboundAddresses as getThorInboundAddresses, getSwapStatus as getThorSwapStatus } from "./thorchain";
import { sendFeedbackNotification, sendPriceAlertEmail, sendReEngagementEmail, sendInactivityReminderEmail, sendDexTradeConfirmation, sendDepositConfirmation, sendWithdrawalConfirmation, sendFeatureAnnouncementEmail, sendSecondaryContactVerification, sendBeneficiaryConfirmation, sendBeneficiaryHeartbeat, sendBeneficiaryFeedbackToOwner, sendEmail, escapeHtml } from "./email";
import { buildSovereigntyKitContent, getSovereigntyKitStyles, normalizeChainKey } from "./sovereignty-kit-html";
import { invalidateBudgetCache } from "./services/api-watchdog";
import { insertApiBudgetSchema } from "@shared/schema";
import { scanForHarvestOpportunities } from "@shared/financial-math";
import multer from "multer";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import { XummSdk } from "xumm-sdk";
import { Client } from "xrpl";
import https from "https";
import fs from "fs";
import path from "path";

import { RLUSD, ADMIN_EMAILS } from "@shared/constants";
import { getEffectiveTier, safeServerDate, detectChainMismatch, SOIL_VAULT_ADDRESSES, SOIL_VAULT_ADDRESS, RLUSD_CURRENCY_HEX, isKnownVaultAddress } from "./routes/shared";
import { registerLegacyRoutes } from "./routes/legacy";
import { registerChainsRoutes } from "./routes/chains";
import { registerDcaRoutes } from "./routes/dca";
import { registerMarketRoutes } from "./routes/market";
import { registerAdminSubscriptionsRoutes } from "./routes/admin-subscriptions";
import { registerBillingRoutes } from "./routes/billing";
import { registerHoldingsRoutes } from "./routes/holdings";
import { registerVaultsRoutes } from "./routes/vaults";
import { registerPortfolioRoutes } from "./routes/portfolio";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/robots.txt", (_req, res) => {
    res.header("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /
Allow: /faq-plain
Allow: /faq.txt
Disallow: /admin/
Disallow: /api/
Disallow: /ownbank/
Disallow: /stellar/wallet
Disallow: /stellar/tokens
Disallow: /stellar/dex

Sitemap: https://cryptoownbank.com/sitemap.xml
`);
  });

  // Crawler-friendly FAQ: server-rendered plain HTML so AI fetchers (Perplexity,
  // ChatGPT, Grok, etc.) that don't execute JavaScript can read the full FAQ.
  // The interactive React version at /faq stays as-is.
  {
    const { faqGroups } = await import("@shared/faq-data");
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "");

    app.get("/faq-plain", (_req, res) => {
      const sections = faqGroups
        .map((group) => {
          const items = group.items
            .map(
              (it) =>
                `    <section>\n      <h3>${escapeHtml(it.q)}</h3>\n      <p>${it.a}</p>\n    </section>`
            )
            .join("\n");
          return `  <section id="${escapeHtml(group.groupKey)}">\n    <h2>${escapeHtml(group.heading)}</h2>\n${items}\n  </section>`;
        })
        .join("\n");
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqGroups.flatMap((g) =>
          g.items.map((it) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: stripHtml(it.a) },
          }))
        ),
      };
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CryptoOwnBank FAQ (Plain) — Crawler-friendly</title>
<meta name="description" content="Full FAQ for CryptoOwnBank rendered as plain HTML for AI fetchers and search crawlers. Interactive version at /faq.">
<link rel="canonical" href="https://cryptoownbank.com/faq">
<meta name="robots" content="index,follow">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<header>
<h1>CryptoOwnBank — Frequently Asked Questions</h1>
<p>This page is a plain-HTML mirror of <a href="https://cryptoownbank.com/faq">/faq</a> for AI assistants and crawlers that do not execute JavaScript. A machine-readable version is available at <a href="/faq.txt">/faq.txt</a>.</p>
</header>
<main>
${sections}
</main>
</body>
</html>`;
      res.header("Content-Type", "text/html; charset=utf-8");
      res.header("Cache-Control", "public, max-age=300");
      res.send(html);
    });

    app.get("/faq.txt", (_req, res) => {
      const body = faqGroups
        .map((group) => {
          const items = group.items
            .map((it) => `Q: ${it.q}\nA: ${stripHtml(it.a)}`)
            .join("\n\n");
          return `## ${group.heading}\n\n${items}`;
        })
        .join("\n\n---\n\n");
      res.header("Content-Type", "text/plain; charset=utf-8");
      res.header("Cache-Control", "public, max-age=300");
      res.send(`CryptoOwnBank FAQ\nSource: https://cryptoownbank.com/faq\n\n${body}\n`);
    });
  }

  app.get("/sitemap.xml", (_req, res) => {
    const baseUrl = "https://cryptoownbank.com";
    const publicRoutes = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/yield-calculator", priority: "0.8", changefreq: "weekly" },
      { path: "/chain-guide", priority: "0.8", changefreq: "monthly" },
      { path: "/rwa-yields", priority: "0.8", changefreq: "weekly" },
      { path: "/stablecoins", priority: "0.8", changefreq: "weekly" },
      { path: "/crypto-news", priority: "0.8", changefreq: "daily" },
      { path: "/whale-alerts", priority: "0.7", changefreq: "daily" },
      { path: "/xls66-lending", priority: "0.8", changefreq: "weekly" },
      { path: "/roadmap", priority: "0.6", changefreq: "monthly" },
      { path: "/insurance", priority: "0.7", changefreq: "monthly" },
      { path: "/migration-guide", priority: "0.7", changefreq: "monthly" },
      { path: "/faq", priority: "0.8", changefreq: "monthly" },
      { path: "/faq-plain", priority: "0.7", changefreq: "monthly" },
      { path: "/help", priority: "0.7", changefreq: "weekly" },
      { path: "/help/create-wallet", priority: "0.6", changefreq: "monthly" },
      { path: "/help/buy-crypto", priority: "0.6", changefreq: "monthly" },
      { path: "/help/transfer-from-exchange", priority: "0.6", changefreq: "monthly" },
      { path: "/help/soil-vault", priority: "0.6", changefreq: "monthly" },
      { path: "/help/aave-borrow", priority: "0.6", changefreq: "monthly" },
      { path: "/help/sovereignty-kit", priority: "0.6", changefreq: "monthly" },
      { path: "/help/legacy-tier", priority: "0.6", changefreq: "monthly" },
      { path: "/help/legacy-beneficiary", priority: "0.6", changefreq: "monthly" },
      { path: "/help/legacy-test", priority: "0.6", changefreq: "monthly" },
      { path: "/setup-guide", priority: "0.7", changefreq: "monthly" },
      { path: "/signing-options", priority: "0.6", changefreq: "monthly" },
      { path: "/contact", priority: "0.5", changefreq: "monthly" },
      { path: "/pay", priority: "0.6", changefreq: "monthly" },
      { path: "/legal", priority: "0.3", changefreq: "yearly" },
      { path: "/privacy", priority: "0.3", changefreq: "yearly" },
      { path: "/login", priority: "0.5", changefreq: "monthly" },
      { path: "/signup", priority: "0.5", changefreq: "monthly" },
      { path: "/stellar/send", priority: "0.6", changefreq: "monthly" },
      { path: "/stellar/remittances", priority: "0.6", changefreq: "monthly" },
    ];
    const today = new Date().toISOString().split("T")[0];
    const urls = publicRoutes
      .map(
        (r) =>
          `  <url>\n    <loc>${baseUrl}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
      )
      .join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    res.header("Content-Type", "application/xml");
    res.send(xml);
  });

  registerVaultsRoutes(app);
  async function enrichWalletBalances(walletBals: any[]): Promise<any[]> {
    const stablecoins = new Set(["USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD", "GUSD", "RLUSD"]);
    const zeroBalances = walletBals.filter(wb => {
      const usd = parseFloat(wb.usdValue || "0");
      const bal = parseFloat(wb.balance);
      return usd === 0 && bal > 0 && !stablecoins.has(wb.assetSymbol) && !wb.assetSymbol.includes("(staked)");
    });

    if (zeroBalances.length === 0) return walletBals;

    let prices: Record<string, number> = {};
    try {
      const rows = await db.select().from(priceCacheTable);
      for (const row of rows) {
        prices[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
      }
    } catch {}

    return walletBals.map(wb => {
      const usd = parseFloat(wb.usdValue || "0");
      const bal = parseFloat(wb.balance);
      if (usd === 0 && bal > 0) {
        if (stablecoins.has(wb.assetSymbol)) {
          return { ...wb, usdValue: bal.toString() };
        }
        const baseSym = wb.assetSymbol.replace(" (staked)", "");
        const price = prices[wb.assetSymbol] || prices[baseSym];
        if (price) {
          return { ...wb, usdValue: (bal * price).toString() };
        }
      }
      return wb;
    });
  }

  app.get("/api/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const txns = await storage.getTransactionsByUser(userId);
      const positionsData = await storage.getActivePositionsByUser(userId);
      
      let totalValue = 0;
      let totalCostBasis = 0;
      
      const allocationMap = new Map<string, number>();
      const colors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
      ];

      const [dashPriceCacheRows, allAssets] = await Promise.all([
        db.select().from(priceCacheTable),
        storage.getAllAssets(),
      ]);
      const dashPriceLookup: Record<string, number> = {};
      const dashChangeLookup: Record<string, number> = {};
      for (const row of dashPriceCacheRows) {
        dashPriceLookup[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
        if (row.change24h) dashChangeLookup[row.symbol.toUpperCase()] = parseFloat(row.change24h);
      }
      const assetPriceLookup: Record<string, number> = {};
      for (const a of allAssets) {
        if (a.currentPrice) assetPriceLookup[a.symbol.toUpperCase()] = parseFloat(a.currentPrice);
      }

      let totalPrevValue = 0;

      for (const pos of positionsData) {
        if (pos.isAddressed) continue;
        let currentPrice = assetPriceLookup[pos.assetSymbol.toUpperCase()] || 0;
        if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
          currentPrice = dashPriceLookup[pos.assetSymbol.toUpperCase()] || 0;
        }
        if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
          currentPrice = parseFloat(pos.averageCost) || 0;
        }
        const qty = parseFloat(pos.quantity) || 0;
        const costBasis = parseFloat(pos.totalCostBasis) || 0;
        if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
          currentPrice = qty > 0 ? costBasis / qty : 0;
        }
        const value = Number.isFinite(qty * currentPrice) ? qty * currentPrice : 0;
        totalValue += value;
        totalCostBasis += costBasis;
        allocationMap.set(pos.assetSymbol, (allocationMap.get(pos.assetSymbol) || 0) + value);

        const change24h = dashChangeLookup[pos.assetSymbol.toUpperCase()];
        if (change24h !== undefined && Number.isFinite(change24h)) {
          const prevPrice = currentPrice / (1 + change24h / 100);
          totalPrevValue += qty * prevPrice;
        } else {
          totalPrevValue += value;
        }
      }

      const rawWalletBals = await storage.getWalletBalancesByUser(userId);
      const walletBals = await enrichWalletBalances(rawWalletBals);
      const dashPositionAssets = new Set(positionsData.filter(p => !p.isAddressed).map(p => p.assetSymbol.toUpperCase()));
      for (const wb of walletBals) {
        if (dashPositionAssets.has(wb.assetSymbol.toUpperCase())) continue;
        const usdVal = parseFloat(wb.usdValue || "0");
        if (Number.isFinite(usdVal) && usdVal > 0) {
          totalValue += usdVal;
          totalPrevValue += usdVal;
          allocationMap.set(wb.assetSymbol, (allocationMap.get(wb.assetSymbol) || 0) + usdVal);
        }
      }

      const dashAccounts = await storage.getAccountsByUser(userId);
      const dashSoilAccount = dashAccounts.find(a => a.provider === "soil-xrpl");
      if (dashSoilAccount) {
        const soilPositions = positionsData.filter(p => p.assetSymbol.toUpperCase().includes("RLUSD-SOIL"));
        const soilAlreadyCounted = soilPositions.some(p => {
          const qty = parseFloat(p.quantity) || 0;
          return qty > 0;
        });
        if (!soilAlreadyCounted) {
          const soilAllPositions = await storage.getPositionsByUser(userId);
          const soilVaultPositions = soilAllPositions.filter(p =>
            p.assetSymbol.toUpperCase().includes("RLUSD-SOIL") && p.accountId === dashSoilAccount.id
          );
          for (const sp of soilVaultPositions) {
            const qty = parseFloat(sp.quantity) || 0;
            if (qty > 0) {
              totalValue += qty;
              totalCostBasis += qty;
              totalPrevValue += qty;
              allocationMap.set(sp.assetSymbol, (allocationMap.get(sp.assetSymbol) || 0) + qty);
            }
          }
        }
      }

      const userPropertiesDash = await db.select().from(properties).where(eq(properties.userId, userId));
      for (const prop of userPropertiesDash) {
        const cv = parseFloat(prop.currentValue || "0");
        const pp = parseFloat(prop.purchasePrice);
        const propVal = cv > 0 ? cv : pp;
        totalValue += propVal;
        totalCostBasis += pp;
        totalPrevValue += propVal;
        allocationMap.set(prop.propertyName || "Real Estate", (allocationMap.get(prop.propertyName || "Real Estate") || 0) + propVal);
      }

      const dashStatementHoldings = await storage.getStatementHoldingsByUser(userId);
      for (const h of dashStatementHoldings) {
        const bal = parseFloat(h.balance || "0");
        if (bal > 0) {
          totalValue += bal;
          totalCostBasis += bal;
          totalPrevValue += bal;
          allocationMap.set(h.accountName || "Bank", (allocationMap.get(h.accountName || "Bank") || 0) + bal);
        }
      }

      const allocation = Array.from(allocationMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }));

      const totalGainLoss = totalValue - totalCostBasis;
      const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

      const dayChange = totalValue - totalPrevValue;
      const dayChangePercent = totalPrevValue > 0 ? (dayChange / totalPrevValue) * 100 : 0;

      const now = new Date();
      const portfolioHistory = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (29 - i));
        const baseValue = totalValue * 0.9;
        const variance = Math.random() * 0.2 - 0.1;
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: Math.max(0, baseValue * (1 + variance + i * 0.003)),
        };
      });

      res.json({
        totalValue,
        dayChange,
        dayChangePercent,
        totalGainLoss,
        totalGainLossPercent,
        roi: totalGainLossPercent,
        assetCount: positionsData.length,
        portfolioHistory,
        allocation,
        recentTransactions: txns.slice(0, 10),
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  app.get("/api/positions/soil", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positionsData = await storage.getPositionsByUser(userId);
      const soilPositions = positionsData.filter(p => p.assetSymbol.toUpperCase().includes("RLUSD-SOIL"));

      const accounts = await storage.getAccountsByUser(userId);
      const soilAccount = accounts.find(a => a.provider === "soil-xrpl");

      const VAULT_APR: Record<string, number> = { "CREDIT+": 0.08, "LIQUID": 0.052 };

      const depositsByVault: Record<string, { amount: number; date: string }[]> = {};

      if (soilAccount) {
        const allTxns = await storage.getTransactionsByUser(userId);
        const soilDepositTxns = allTxns.filter(t =>
          t.accountId === soilAccount.id && t.transactionType === "transfer_out"
        );

        for (const txn of soilDepositTxns) {
          const notes = (txn.notes || "").toUpperCase();
          let vaultKey = "";
          if (notes.includes("[CREDIT")) vaultKey = "CREDIT+";
          else if (notes.includes("[LIQUID")) vaultKey = "LIQUID";
          else if (notes.includes("[TREASURY")) vaultKey = "LIQUID";

          const dateStr = txn.transactionDate instanceof Date ? txn.transactionDate.toISOString() : String(txn.transactionDate);
          const amount = parseFloat(txn.quantity || "0");
          if (amount > 0) {
            if (!vaultKey) vaultKey = "__untagged__";
            if (!depositsByVault[vaultKey]) depositsByVault[vaultKey] = [];
            depositsByVault[vaultKey].push({ amount, date: dateStr });
          }
        }
      }

      const now = Date.now();

      const result = soilPositions.map(p => {
        const sym = p.assetSymbol.toUpperCase();
        let vaultKey = "";
        if (sym.includes("CREDIT")) vaultKey = "CREDIT+";
        else if (sym.includes("LIQUID")) vaultKey = "LIQUID";
        const apr = VAULT_APR[vaultKey] || 0.065;
        const principal = parseFloat(p.quantity) || 0;

        let deposits = vaultKey ? (depositsByVault[vaultKey] || []) : [];

        if (deposits.length === 0 && depositsByVault["__untagged__"]?.length) {
          const untagged = depositsByVault["__untagged__"];
          const totalPosQty = soilPositions.reduce((s, pp) => s + (parseFloat(pp.quantity) || 0), 0);
          if (totalPosQty > 0 && principal > 0) {
            const ratio = principal / totalPosQty;
            deposits = untagged.map(d => ({ amount: d.amount * ratio, date: d.date }));
          } else {
            deposits = untagged;
          }
        }

        let earnedToDate = 0;
        const depositHistory: { amount: number; date: string }[] = [];

        if (deposits.length > 0) {
          for (const d of deposits) {
            const depositTime = new Date(d.date).getTime();
            const daysElapsed = Math.max(0, (now - depositTime) / (1000 * 60 * 60 * 24));
            earnedToDate += d.amount * (apr / 365) * daysElapsed;
            depositHistory.push({ amount: d.amount, date: d.date });
          }
        } else if (principal > 0) {
          const createdAt = (p as any).createdAt;
          const fallbackDate = createdAt ? new Date(createdAt).toISOString() : new Date(now - 19 * 24 * 60 * 60 * 1000).toISOString();
          const daysElapsed = Math.max(0, (now - new Date(fallbackDate).getTime()) / (1000 * 60 * 60 * 24));
          earnedToDate = principal * (apr / 365) * daysElapsed;
          depositHistory.push({ amount: principal, date: fallbackDate });
        }

        earnedToDate = Math.round(earnedToDate * 100) / 100;

        const firstDate = depositHistory.length > 0
          ? depositHistory.reduce((earliest, d) => d.date < earliest ? d.date : earliest, depositHistory[0].date)
          : "";

        return {
          assetSymbol: p.assetSymbol,
          quantity: p.quantity,
          totalCostBasis: p.totalCostBasis,
          firstDepositDate: firstDate,
          earnedToDate,
          depositHistory,
        };
      });

      res.json(result);
    } catch (error) {
      console.error("[positions/soil] Error:", error);
      res.status(500).json({ message: "Failed to fetch soil positions" });
    }
  });

  const DOPPLER_PARTNER_API = "https://partner.doppler.finance";
  const DOPPLER_XRP_VAULT_APR = 0.032;
  const DOPPLER_DEPOSIT_ADDRESS = "rEPQxsSVER2r4HeVR4APrVCB45K68rqgp2";
  const DOPPLER_TREASURY_ADDRESS = "rprFy94qJB5riJpMmnPDp3ttmVKfcrFiuq";
  const DOPPLER_WITHDRAWAL_ADDRESS = "rGuVpUBfprkb1cmKFGbL8c48fQWT3xEwyZ";

  const DOPPLER_SERVER_VAULTS = [
    {
      vaultId: "xrp-vault",
      name: "Doppler XRP Vault",
      asset: "XRP",
      apr: DOPPLER_XRP_VAULT_APR,
      positionSymbol: "XRP-DOPPLER-VAULT",
      depositAddress: DOPPLER_DEPOSIT_ADDRESS,
      treasuryAddress: DOPPLER_TREASURY_ADDRESS,
      withdrawalAddress: DOPPLER_WITHDRAWAL_ADDRESS,
    },
  ];

  app.post("/api/doppler/sync", isAuthenticated, async (req: any, res) => {
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

      const dopplerApiKey = process.env.DOPPLER_API_KEY;
      if (!dopplerApiKey) {
        return res.status(503).json({
          message: "Doppler Partner API key not configured. Check your position directly on app.doppler.finance.",
          noApiKey: true,
        });
      }

      const existingAccounts = await storage.getAccountsByUser(userId);
      let dopplerAccount = existingAccounts.find(a => a.provider === "doppler-xrpl");
      if (!dopplerAccount) {
        dopplerAccount = await storage.createAccount({
          userId,
          credentialId: null,
          provider: "doppler-xrpl",
          accountName: "Doppler Finance (XRPL)",
          accountType: "defi",
        });
      }

      const vault = DOPPLER_SERVER_VAULTS[0];
      let apiData: any = null;
      try {
        const apiUrl = `${DOPPLER_PARTNER_API}/v1/vaults/${vault.vaultId}/staking/xrpl/${walletAddress}`;
        const apiRes = await fetch(apiUrl, {
          headers: {
            "Authorization": `Bearer ${dopplerApiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (apiRes.ok) {
          apiData = await apiRes.json();
        } else if (apiRes.status === 404) {
          apiData = { stakedAmount: 0, status: "not_found" };
        } else {
          console.error(`[doppler/sync] Partner API returned ${apiRes.status}: ${await apiRes.text()}`);
          return res.status(502).json({
            message: "Doppler Partner API returned an error. Try again later or check app.doppler.finance.",
          });
        }
      } catch (apiErr: any) {
        console.error("[doppler/sync] Partner API request failed:", apiErr.message);
        return res.status(502).json({
          message: "Could not reach Doppler Partner API. Try again later or check your position on app.doppler.finance.",
        });
      }

      const stakedAmount = parseFloat(apiData.stakedAmount || apiData.staked_amount || apiData.balance || "0");
      const depositDate = apiData.depositDate || apiData.deposit_date || apiData.created_at || null;
      const pendingRewards = parseFloat(apiData.pendingRewards || apiData.pending_rewards || apiData.rewards || "0");

      const posSymbol = vault.positionSymbol;
      const existingPos = await storage.getPositionByUserAndAsset(userId, dopplerAccount.id, posSymbol);

      if (stakedAmount > 0) {
        const priceRow = await db.select({ priceUsd: priceCacheTable.priceUsd }).from(priceCacheTable).where(eq(priceCacheTable.symbol, "XRP")).limit(1);
        const xrpPrice = priceRow.length > 0 ? parseFloat(priceRow[0].priceUsd) : 0;
        const costBasis = stakedAmount * xrpPrice;

        if (existingPos) {
          await storage.updatePosition(existingPos.id, {
            quantity: stakedAmount.toFixed(8),
            averageCost: xrpPrice.toFixed(8),
            totalCostBasis: costBasis.toFixed(2),
          });
          if (existingPos.isAddressed) {
            await storage.markPositionAddressed(existingPos.id, false);
          }
        } else {
          await storage.createPosition({
            userId,
            accountId: dopplerAccount.id,
            assetSymbol: posSymbol,
            quantity: stakedAmount.toFixed(8),
            averageCost: xrpPrice.toFixed(8),
            totalCostBasis: costBasis.toFixed(2),
          });
        }
      } else if (existingPos) {
        await storage.updatePosition(existingPos.id, {
          quantity: "0",
          totalCostBasis: "0",
        });
        await storage.markPositionAddressed(existingPos.id, true);
      }

      let earnedToDate = pendingRewards;
      if (earnedToDate === 0 && stakedAmount > 0 && depositDate) {
        const daysElapsed = Math.max(0, (Date.now() - new Date(depositDate).getTime()) / (1000 * 60 * 60 * 24));
        earnedToDate = stakedAmount * (DOPPLER_XRP_VAULT_APR / 365) * daysElapsed;
      }
      earnedToDate = Math.round(earnedToDate * 1e6) / 1e6;

      const settings = await storage.getUserSettings(userId);
      const store = (settings?.userDataStore as Record<string, any>) || {};
      store.dopplerSync = {
        depositDate: depositDate || new Date().toISOString(),
        pendingRewards: earnedToDate,
        stakedAmount,
        lastSyncedAt: new Date().toISOString(),
      };
      await storage.upsertUserSettings({ userId, userDataStore: store });

      res.json({
        synced: true,
        position: {
          assetSymbol: posSymbol,
          quantity: stakedAmount,
          depositDate: depositDate || null,
          earnedToDate,
          pendingRewards,
          apr: DOPPLER_XRP_VAULT_APR * 100,
        },
      });
    } catch (error: any) {
      console.error("[doppler/sync] Error:", error);
      res.status(500).json({ message: "Failed to sync Doppler position" });
    }
  });

  app.post("/api/doppler/detect-onchain", isAuthenticated, async (req: any, res) => {
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

      if (!walletAddress || typeof walletAddress !== "string" || !walletAddress.startsWith("r")) {
        return res.status(400).json({ message: "No XRPL wallet connected. Connect your XRPL wallet first." });
      }

      const deposits: { amountXrp: number; date: string; txHash: string }[] = [];
      const withdrawals: { amountXrp: number; date: string; txHash: string }[] = [];

      const MAX_PAGES = 20;
      let marker: any = undefined;
      let pages = 0;
      let xrplError: string | null = null;

      while (pages < MAX_PAGES) {
        pages++;
        const params: any = {
          account: walletAddress,
          ledger_index_min: -1,
          ledger_index_max: -1,
          limit: 200,
          forward: false,
        };
        if (marker) params.marker = marker;

        let apiRes: Response;
        try {
          apiRes = await fetch("https://xrplcluster.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "account_tx", params: [params] }),
            signal: AbortSignal.timeout(15000),
          });
        } catch (err: any) {
          xrplError = `Could not reach XRPL: ${err?.message || "network error"}`;
          break;
        }

        if (!apiRes.ok) {
          xrplError = `XRPL responded with HTTP ${apiRes.status}`;
          break;
        }

        const data = await apiRes.json();
        const result = data?.result;
        if (!result || result.status !== "success") {
          xrplError = result?.error_message || "XRPL request did not succeed";
          break;
        }

        const txs = result.transactions || [];
        if (txs.length === 0) break;

        for (const entry of txs) {
          const tx = entry.tx || entry.tx_json;
          const meta = entry.meta;
          if (!tx || !meta) continue;
          if (tx.TransactionType !== "Payment") continue;
          if (meta.TransactionResult !== "tesSUCCESS") continue;

          const isDepositOut = tx.Account === walletAddress && tx.Destination === DOPPLER_DEPOSIT_ADDRESS;
          const isWithdrawalIn = tx.Destination === walletAddress && (tx.Account === DOPPLER_WITHDRAWAL_ADDRESS || tx.Account === DOPPLER_TREASURY_ADDRESS);
          if (!isDepositOut && !isWithdrawalIn) continue;

          const delivered = meta.delivered_amount || meta.DeliveredAmount;
          if (!delivered) continue;
          if (typeof delivered !== "string") continue;
          const drops = Number(delivered);
          if (!Number.isFinite(drops) || drops <= 0) continue;
          const amountXrp = drops / 1e6;

          let dateIso: string;
          const closeTime = (entry.tx?.date ?? tx.date) as number | undefined;
          const closeTimeIso = entry.close_time_iso as string | undefined;
          if (typeof closeTimeIso === "string") {
            dateIso = closeTimeIso;
          } else if (typeof closeTime === "number") {
            dateIso = new Date((closeTime + 946684800) * 1000).toISOString();
          } else {
            continue;
          }

          const txHash = (tx.hash || entry.hash || "") as string;

          if (isDepositOut) {
            deposits.push({ amountXrp, date: dateIso, txHash });
          } else {
            withdrawals.push({ amountXrp, date: dateIso, txHash });
          }
        }

        marker = result.marker;
        if (!marker) break;
      }

      if (xrplError && deposits.length === 0 && withdrawals.length === 0) {
        return res.status(502).json({ message: `Could not read XRPL transaction history: ${xrplError}` });
      }

      const totalDeposited = deposits.reduce((s, d) => s + d.amountXrp, 0);
      const totalWithdrawn = withdrawals.reduce((s, w) => s + w.amountXrp, 0);
      const netDeposited = Math.max(0, totalDeposited - totalWithdrawn);

      if (deposits.length === 0) {
        return res.json({
          detected: false,
          walletAddress,
          totalDeposited: 0,
          netDeposited: 0,
          depositCount: 0,
          message: "No deposits to the Doppler XRP Vault address were found in this wallet's history.",
        });
      }

      deposits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstDepositDate = deposits[0].date;
      const lastDepositDate = deposits[deposits.length - 1].date;

      let earnedToDate = 0;
      const now = Date.now();
      for (const d of deposits) {
        const days = Math.max(0, (now - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24));
        earnedToDate += d.amountXrp * (DOPPLER_XRP_VAULT_APR / 365) * days;
      }
      for (const w of withdrawals) {
        const days = Math.max(0, (now - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
        earnedToDate -= w.amountXrp * (DOPPLER_XRP_VAULT_APR / 365) * days;
      }
      earnedToDate = Math.max(0, Math.round(earnedToDate * 1e6) / 1e6);

      const existingAccounts = await storage.getAccountsByUser(userId);
      let dopplerAccount = existingAccounts.find(a => a.provider === "doppler-xrpl");
      if (!dopplerAccount) {
        dopplerAccount = await storage.createAccount({
          userId,
          credentialId: null,
          provider: "doppler-xrpl",
          accountName: "Doppler Finance (XRPL)",
          accountType: "defi",
        });
      }

      const vault = DOPPLER_SERVER_VAULTS[0];
      const posSymbol = vault.positionSymbol;
      const existingPos = await storage.getPositionByUserAndAsset(userId, dopplerAccount.id, posSymbol);

      const priceRow = await db.select({ priceUsd: priceCacheTable.priceUsd }).from(priceCacheTable).where(eq(priceCacheTable.symbol, "XRP")).limit(1);
      const xrpPrice = priceRow.length > 0 ? parseFloat(priceRow[0].priceUsd) : 0;
      const costBasis = netDeposited * xrpPrice;

      if (netDeposited > 0) {
        if (existingPos) {
          await storage.updatePosition(existingPos.id, {
            quantity: netDeposited.toFixed(8),
            averageCost: xrpPrice.toFixed(8),
            totalCostBasis: costBasis.toFixed(2),
          });
          if (existingPos.isAddressed) {
            await storage.markPositionAddressed(existingPos.id, false);
          }
        } else {
          await storage.createPosition({
            userId,
            accountId: dopplerAccount.id,
            assetSymbol: posSymbol,
            quantity: netDeposited.toFixed(8),
            averageCost: xrpPrice.toFixed(8),
            totalCostBasis: costBasis.toFixed(2),
          });
        }
      } else if (existingPos) {
        await storage.updatePosition(existingPos.id, {
          quantity: "0",
          totalCostBasis: "0",
        });
        await storage.markPositionAddressed(existingPos.id, true);
      }

      const settings = await storage.getUserSettings(userId);
      const store = (settings?.userDataStore as Record<string, any>) || {};
      store.dopplerSync = {
        depositDate: firstDepositDate,
        pendingRewards: earnedToDate,
        stakedAmount: netDeposited,
        lastSyncedAt: new Date().toISOString(),
        source: "onchain",
        depositCount: deposits.length,
        withdrawalCount: withdrawals.length,
      };
      await storage.upsertUserSettings({ userId, userDataStore: store });

      res.json({
        detected: true,
        walletAddress,
        totalDeposited: Math.round(totalDeposited * 1e6) / 1e6,
        totalWithdrawn: Math.round(totalWithdrawn * 1e6) / 1e6,
        netDeposited: Math.round(netDeposited * 1e6) / 1e6,
        depositCount: deposits.length,
        withdrawalCount: withdrawals.length,
        firstDepositDate,
        lastDepositDate,
        estimatedEarnedToDate: earnedToDate,
        apr: DOPPLER_XRP_VAULT_APR * 100,
        deposits: deposits.map(d => ({ amount: d.amountXrp, date: d.date, txHash: d.txHash })),
        truncated: pages >= MAX_PAGES,
      });
    } catch (error: any) {
      console.error("[doppler/detect-onchain] Error:", error);
      res.status(500).json({ message: error?.message || "Failed to detect on-chain Doppler deposits" });
    }
  });

  app.get("/api/positions/doppler", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positionsData = await storage.getPositionsByUser(userId);
      const dopplerPositions = positionsData.filter(p => p.assetSymbol.toUpperCase().includes("XRP-DOPPLER"));

      if (dopplerPositions.length === 0) {
        return res.json([]);
      }

      const settings = await storage.getUserSettings(userId);
      const store = (settings?.userDataStore as Record<string, any>) || {};
      const syncData = store.dopplerSync || {};

      const now = Date.now();

      const result = dopplerPositions.map(p => {
        const principal = parseFloat(p.quantity) || 0;
        let earnedToDate = 0;

        const depositDate = syncData.depositDate || p.updatedAt?.toISOString?.() || new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

        if (syncData.pendingRewards && syncData.pendingRewards > 0) {
          const syncTime = new Date(syncData.lastSyncedAt || now).getTime();
          const additionalDays = Math.max(0, (now - syncTime) / (1000 * 60 * 60 * 24));
          earnedToDate = syncData.pendingRewards + (principal * (DOPPLER_XRP_VAULT_APR / 365) * additionalDays);
        } else if (principal > 0) {
          const daysElapsed = Math.max(0, (now - new Date(depositDate).getTime()) / (1000 * 60 * 60 * 24));
          earnedToDate = principal * (DOPPLER_XRP_VAULT_APR / 365) * daysElapsed;
        }

        earnedToDate = Math.round(earnedToDate * 1e6) / 1e6;

        return {
          assetSymbol: p.assetSymbol,
          quantity: p.quantity,
          totalCostBasis: p.totalCostBasis,
          depositDate,
          earnedToDate,
          apr: DOPPLER_XRP_VAULT_APR * 100,
          lastSyncedAt: syncData.lastSyncedAt || null,
        };
      });

      res.json(result);
    } catch (error) {
      console.error("[positions/doppler] Error:", error);
      res.status(500).json({ message: "Failed to fetch Doppler positions" });
    }
  });

  registerPortfolioRoutes(app);
  app.get("/api/portfolio", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positionsData = await storage.getActivePositionsByUser(userId);
      
      let totalValue = 0;
      let totalCostBasis = 0;
      const colors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
      ];

      const [priceCacheRows, allAssetsPortfolio] = await Promise.all([
        db.select().from(priceCacheTable),
        storage.getAllAssets(),
      ]);
      const priceCacheLookup: Record<string, number> = {};
      for (const row of priceCacheRows) {
        priceCacheLookup[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
      }
      const portfolioAssetPrices: Record<string, number> = {};
      for (const a of allAssetsPortfolio) {
        if (a.currentPrice) portfolioAssetPrices[a.symbol.toUpperCase()] = parseFloat(a.currentPrice);
      }

      const positionsWithMarket = await Promise.all(
        positionsData.map(async (pos, index) => {
          let currentPrice = portfolioAssetPrices[pos.assetSymbol.toUpperCase()] || 0;
          if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
            currentPrice = priceCacheLookup[pos.assetSymbol.toUpperCase()] || 0;
          }
          if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
            currentPrice = parseFloat(pos.averageCost) || 0;
          }
          const qty = parseFloat(pos.quantity) || 0;
          const costBasis = parseFloat(pos.totalCostBasis) || 0;
          if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
            currentPrice = qty > 0 ? costBasis / qty : 0;
          }
          const currentValue = Number.isFinite(qty * currentPrice) ? qty * currentPrice : 0;
          const gainLoss = currentValue - costBasis;
          const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

          totalValue += currentValue;
          totalCostBasis += costBasis;

          return {
            ...pos,
            currentPrice,
            currentValue,
            gainLoss,
            gainLossPercent,
          };
        })
      );

      const rawWalletBalsForPortfolio = await storage.getWalletBalancesByUser(userId);
      const enrichedWalletBals = await enrichWalletBalances(rawWalletBalsForPortfolio);
      const userWalletsForPortfolio = await storage.getWalletsByUser(userId);

      const positionAssets = new Set(positionsData.filter(p => !p.isAddressed).map(p => p.assetSymbol.toUpperCase()));

      const walletPositions = await Promise.all(enrichedWalletBals.map(async (wb) => {
        const wallet = userWalletsForPortfolio.find((w: any) => w.id === wb.walletId);
        let usdVal = parseFloat(wb.usdValue || "0") || 0;
        const bal = parseFloat(wb.balance) || 0;
        const avgCost = parseFloat(wb.averageCost || "0") || 0;
        const costBasis = parseFloat(wb.totalCostBasis || "0") || 0;

        if (usdVal === 0 && bal > 0) {
          const sym = wb.assetSymbol.toUpperCase();
          let resolvedPrice = portfolioAssetPrices[sym] || 0;
          if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
            resolvedPrice = priceCacheLookup[sym] || 0;
          }
          if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
            resolvedPrice = avgCost;
          }
          if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
            resolvedPrice = bal > 0 && costBasis > 0 ? costBasis / bal : 0;
          }
          if (Number.isFinite(resolvedPrice) && resolvedPrice > 0) {
            usdVal = bal * resolvedPrice;
          }
        }

        const safeUsdVal = Number.isFinite(usdVal) ? usdVal : 0;
        const price = bal > 0 ? safeUsdVal / bal : 0;
        const alreadyInPositions = positionAssets.has(wb.assetSymbol.toUpperCase());
        const usableCostBasis = alreadyInPositions ? 0 : costBasis;
        const usableValue = alreadyInPositions ? 0 : safeUsdVal;
        const gainLoss = usableCostBasis > 0 ? usableValue - usableCostBasis : 0;
        const gainLossPercent = usableCostBasis > 0 ? (gainLoss / usableCostBasis) * 100 : 0;
        totalValue += usableValue;
        if (usableCostBasis > 0) totalCostBasis += usableCostBasis;
        return {
          id: wb.id,
          userId: wb.userId,
          accountId: wb.walletId,
          assetSymbol: wb.assetSymbol,
          quantity: wb.balance,
          averageCost: avgCost.toString(),
          totalCostBasis: usableCostBasis.toFixed(2),
          updatedAt: wb.updatedAt,
          currentPrice: price,
          currentValue: usdVal,
          gainLoss,
          gainLossPercent,
          source: wallet?.label || wallet?.chain || "Wallet",
          isImport: false,
          isAddressed: false,
          isWallet: true,
        };
      }));

      const accounts = await storage.getAccountsByUser(userId);
      const accountMap = new Map(accounts.map(a => [a.id, a]));

      const portfolioSoilAccount = accounts.find(a => a.provider === "soil-xrpl");
      const soilVaultPositions: typeof walletPositions = [];
      if (portfolioSoilAccount) {
        const allUserPositions = await storage.getPositionsByUser(userId);
        const soilPos = allUserPositions.filter(p =>
          p.assetSymbol.toUpperCase().includes("RLUSD-SOIL") &&
          p.accountId === portfolioSoilAccount.id &&
          !positionsData.some(ap => ap.id === p.id)
        );
        for (const sp of soilPos) {
          const qty = parseFloat(sp.quantity) || 0;
          if (qty > 0) {
            const spValue = qty;
            totalValue += spValue;
            totalCostBasis += qty;
            soilVaultPositions.push({
              id: sp.id,
              userId: sp.userId,
              accountId: sp.accountId,
              assetSymbol: sp.assetSymbol,
              quantity: sp.quantity,
              averageCost: "1",
              totalCostBasis: qty.toFixed(2),
              updatedAt: sp.updatedAt,
              currentPrice: 1,
              currentValue: spValue,
              gainLoss: 0,
              gainLossPercent: 0,
              source: "Soil Protocol (XRPL)",
              isImport: false,
              isAddressed: false,
              isWallet: false,
            });
          }
        }
      }

      const allPositions = [...positionsWithMarket.map(p => {
        const account = accountMap.get(p.accountId);
        const isImport = account?.accountType === "import" || account?.provider === "manual";
        const isDefi = account?.accountType === "defi";
        return {
          ...p,
          source: account?.accountName || "Exchange",
          isImport,
          isDefi,
          isExchange: !isImport && !isDefi,
          isAddressed: p.isAddressed || false,
          isWallet: false,
        };
      }), ...walletPositions, ...soilVaultPositions];

      const allocationMap = new Map<string, number>();
      allPositions.forEach((pos) => {
        const val = pos.currentValue || 0;
        allocationMap.set(pos.assetSymbol, (allocationMap.get(pos.assetSymbol) || 0) + val);
      });

      const userProperties = await db.select().from(properties).where(eq(properties.userId, userId));
      let propertyTotalValue = 0;
      let propertyTotalCostBasis = 0;
      for (const prop of userProperties) {
        const cv = parseFloat(prop.currentValue || "0");
        const pp = parseFloat(prop.purchasePrice);
        if (cv > 0) propertyTotalValue += cv;
        else propertyTotalValue += pp;
        propertyTotalCostBasis += pp;
      }

      const statementHoldingsForPortfolio = await storage.getStatementHoldingsByUser(userId);
      let statementTotalValue = 0;
      const statementSourceValues = new Map<string, number>();
      for (const h of statementHoldingsForPortfolio) {
        const bal = parseFloat(h.balance || "0");
        if (bal > 0) {
          statementTotalValue += bal;
          const sourceId = h.sourceId.toString();
          statementSourceValues.set(sourceId, (statementSourceValues.get(sourceId) || 0) + bal);
        }
      }

      const userOffChainHoldings = await db.select().from(offChainHoldings).where(eq(offChainHoldings.userId, userId));
      let offChainTotalValue = 0;
      let offChainCostBasis = 0;
      const offChainTypeValues = new Map<string, number>();
      for (const h of userOffChainHoldings) {
        if (h.status !== "active") continue;
        const cv = parseFloat(h.currentValue || "0");
        const ai = parseFloat(h.amountInvested || "0");
        const value = cv > 0 ? cv : ai;
        if (value > 0) {
          offChainTotalValue += value;
          offChainCostBasis += ai;
          offChainTypeValues.set(h.assetType, (offChainTypeValues.get(h.assetType) || 0) + value);
        }
      }

      const grandTotalValue = totalValue + propertyTotalValue + statementTotalValue + offChainTotalValue;
      const grandTotalCostBasis = totalCostBasis + propertyTotalCostBasis + statementTotalValue + offChainCostBasis;
      const totalGainLoss = grandTotalValue - grandTotalCostBasis;
      const totalGainLossPercent = grandTotalCostBasis > 0 ? (totalGainLoss / grandTotalCostBasis) * 100 : 0;

      if (propertyTotalValue > 0) {
        allocationMap.set("Real Estate", (allocationMap.get("Real Estate") || 0) + propertyTotalValue);
      }
      if (statementTotalValue > 0) {
        allocationMap.set("Bank & Brokerage", (allocationMap.get("Bank & Brokerage") || 0) + statementTotalValue);
      }
      const OFF_CHAIN_ALLOC_LBL: Record<string, string> = {
        startup: "Startups",
        insurance: "Insurance",
        brokerage: "Brokerage",
        vehicle: "Vehicles",
        collectible: "Collectibles",
        other: "Other Assets",
      };
      for (const [type, value] of Array.from(offChainTypeValues.entries())) {
        const label = OFF_CHAIN_ALLOC_LBL[type] || "Other Assets";
        allocationMap.set(label, (allocationMap.get(label) || 0) + value);
      }
      const allocation = Array.from(allocationMap.entries()).map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length],
      }));

      res.json({
        positions: allPositions,
        totalValue: grandTotalValue,
        totalCostBasis: grandTotalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        allocation,
        cryptoValue: totalValue,
        propertyValue: propertyTotalValue,
        propertyCount: userProperties.length,
        statementValue: statementTotalValue,
        statementSourceCount: statementSourceValues.size,
        offChainValue: offChainTotalValue,
        offChainCount: userOffChainHoldings.filter(h => h.status === "active").length,
      });
    } catch (error) {
      console.error("Portfolio error:", error);
      res.status(500).json({ message: "Failed to load portfolio" });
    }
  });

  app.get("/api/portfolio/statement", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      if (tier === "free") {
        return res.status(403).json({ message: "Portfolio statements require a Premium or Pro membership." });
      }

      const settings = await storage.getUserSettings(userId);

      const fullName = (settings?.fullName || "").trim();
      if (!fullName || fullName.length < 2) {
        return res.status(400).json({
          message: "Please add your full name in Settings before generating a statement.",
          code: "PROFILE_INCOMPLETE",
        });
      }

      const memberName = fullName;
      const memberAddress = [
        settings?.addressLine1,
        settings?.addressLine2,
        [settings?.profileCity, settings?.profileStateProvince, settings?.postalCode].filter(Boolean).join(", "),
        settings?.profileCountry,
      ].filter(Boolean);

      const positionsData = await storage.getActivePositionsByUser(userId);
      const [priceCacheRows, allAssetsStmt] = await Promise.all([
        db.select().from(priceCacheTable),
        storage.getAllAssets(),
      ]);
      const priceLookup: Record<string, number> = {};
      for (const row of priceCacheRows) {
        priceLookup[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
      }
      const assetPrices: Record<string, number> = {};
      for (const a of allAssetsStmt) {
        if (a.currentPrice) assetPrices[a.symbol.toUpperCase()] = parseFloat(a.currentPrice);
      }

      const accounts = await storage.getAccountsByUser(userId);
      const accountMap = new Map(accounts.map(a => [a.id, a]));

      let cryptoTotal = 0;
      let cryptoCostBasis = 0;
      const exchangeRows: any[] = [];

      for (const pos of positionsData) {
        const qty = parseFloat(pos.quantity) || 0;
        if (qty <= 0) continue;
        const sym = pos.assetSymbol.toUpperCase();
        let price = assetPrices[sym] || priceLookup[sym] || parseFloat(pos.averageCost) || 0;
        const costBasis = parseFloat(pos.totalCostBasis) || 0;
        if (price <= 0 && qty > 0 && costBasis > 0) price = costBasis / qty;
        const mktVal = qty * price;
        const gl = costBasis > 0 ? mktVal - costBasis : 0;
        cryptoTotal += mktVal;
        cryptoCostBasis += costBasis;
        const account = accountMap.get(pos.accountId);
        exchangeRows.push({
          asset: pos.assetSymbol,
          source: account?.accountName || "Exchange",
          quantity: qty,
          price,
          marketValue: mktVal,
          costBasis,
          gainLoss: gl,
          gainLossPct: costBasis > 0 ? (gl / costBasis) * 100 : 0,
        });
      }

      const rawWalletBals = await storage.getWalletBalancesByUser(userId);
      const enrichedBals = await enrichWalletBalances(rawWalletBals);
      const userWalletsStmt = await storage.getWalletsByUser(userId);
      const walletRows: any[] = [];

      for (const wb of enrichedBals) {
        const bal = parseFloat(wb.balance) || 0;
        if (bal <= 0) continue;
        const sym = wb.assetSymbol.toUpperCase();
        const wallet = userWalletsStmt.find((w: any) => w.id === wb.walletId);
        let usdVal = parseFloat(wb.usdValue || "0") || 0;
        const avgCost = parseFloat(wb.averageCost || "0") || 0;
        const costBasis = parseFloat(wb.totalCostBasis || "0") || 0;
        if (usdVal === 0 && bal > 0) {
          const resolvedPrice = assetPrices[sym] || priceLookup[sym] || avgCost || (costBasis > 0 ? costBasis / bal : 0);
          if (resolvedPrice > 0) usdVal = bal * resolvedPrice;
        }
        const price = bal > 0 ? usdVal / bal : 0;
        const gl = costBasis > 0 ? usdVal - costBasis : 0;
        cryptoTotal += usdVal;
        if (costBasis > 0) cryptoCostBasis += costBasis;
        walletRows.push({
          asset: wb.assetSymbol,
          source: wallet?.label || wallet?.chain || "Wallet",
          chain: wallet?.chain || "",
          quantity: bal,
          price,
          marketValue: usdVal,
          costBasis,
          gainLoss: gl,
          gainLossPct: costBasis > 0 ? (gl / costBasis) * 100 : 0,
        });
      }

      const userPropsStmt = await db.select().from(properties).where(eq(properties.userId, userId));
      let propTotal = 0;
      let propCostBasis = 0;
      const propertyRows = userPropsStmt.map(p => {
        const cv = parseFloat(p.currentValue || "0") || parseFloat(p.purchasePrice);
        const pp = parseFloat(p.purchasePrice);
        propTotal += cv;
        propCostBasis += pp;
        return { address: p.address, city: p.city, purchasePrice: pp, currentValue: cv, gainLoss: cv - pp };
      });

      const userHoldingsStmt = await db.select().from(offChainHoldings).where(eq(offChainHoldings.userId, userId));
      let holdingsTotal = 0;
      let holdingsCostBasis = 0;
      const holdingsRows = userHoldingsStmt
        .filter(h => h.status === "active")
        .map(h => {
          const cv = parseFloat(h.currentValue || "0") || parseFloat(h.amountInvested || "0");
          const ai = parseFloat(h.amountInvested || "0");
          holdingsTotal += cv;
          holdingsCostBasis += ai;
          return {
            name: h.name,
            type: h.assetType,
            provider: h.provider || "",
            accountId: h.accountIdentifier || "",
            quantity: h.quantity || "",
            contactUrl: h.contactUrl || "",
            contactPhone: h.contactPhone || "",
            invested: ai,
            currentValue: cv,
            gainLoss: cv - ai,
            beneficiary: h.beneficiaryName || "",
            beneficiaryContact: h.beneficiaryContact || "",
            legacyInstructions: h.legacyInstructions || "",
          };
        });

      const stmtHoldings = await storage.getStatementHoldingsByUser(userId);
      let stmtTotal = 0;
      const bankRows = stmtHoldings.filter(h => parseFloat(h.balance || "0") > 0).map(h => {
        const bal = parseFloat(h.balance || "0");
        stmtTotal += bal;
        return { label: h.label || h.productType, balance: bal, apy: h.apy ? parseFloat(h.apy) : null };
      });

      const grandTotal = cryptoTotal + propTotal + stmtTotal + holdingsTotal;
      const grandCostBasis = cryptoCostBasis + propCostBasis + stmtTotal + holdingsCostBasis;
      const totalGL = grandTotal - grandCostBasis;

      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const fmtCur = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
      const fmtQty = (v: number) => v >= 1 ? v.toLocaleString("en-US", { maximumFractionDigits: 4 }) : v.toFixed(8);
      const fmtPct = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
      const now = new Date();
      const statementDate = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      doc.setFontSize(20);
      doc.setTextColor(0, 164, 228);
      doc.text("CryptoOwnBank", 14, 20);
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Portfolio Statement", 14, 28);

      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text(`Prepared for: ${memberName}`, 14, 38);
      let infoY = 43;
      if (memberAddress.length > 0) {
        for (const line of memberAddress) {
          doc.text(line, 14, infoY);
          infoY += 4;
        }
      }
      doc.text(`Statement Date: ${statementDate}`, 14, infoY);
      infoY += 5;
      doc.text(`Membership: ${tier.charAt(0).toUpperCase() + tier.slice(1)}`, 14, infoY);
      infoY += 6;

      doc.setDrawColor(0, 164, 228);
      doc.setLineWidth(0.5);
      doc.line(14, infoY, 196, infoY);
      infoY += 8;

      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.text("Account Summary", 14, infoY);

      const summaryData = [
        ["Total Portfolio Value", fmtCur(grandTotal)],
        ["Total Cost Basis", fmtCur(grandCostBasis)],
        ["Unrealized Gain/Loss", `${fmtCur(totalGL)} (${fmtPct(grandCostBasis > 0 ? (totalGL / grandCostBasis) * 100 : 0)})`],
      ];
      if (cryptoTotal > 0) summaryData.push(["Crypto Holdings", fmtCur(cryptoTotal)]);
      if (propTotal > 0) summaryData.push(["Real Estate", fmtCur(propTotal)]);
      if (stmtTotal > 0) summaryData.push(["Bank & Brokerage", fmtCur(stmtTotal)]);

      autoTable(doc, {
        startY: infoY + 4,
        body: summaryData,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { halign: "right" } },
        margin: { left: 14 },
      });

      let curY = (doc as any).lastAutoTable?.finalY || 90;

      const allCryptoRows = [...exchangeRows, ...walletRows];
      const consolidatedMap = new Map<string, { asset: string; quantity: number; marketValue: number; costBasis: number }>();
      for (const r of allCryptoRows) {
        const key = r.asset.toUpperCase();
        const existing = consolidatedMap.get(key);
        if (existing) {
          existing.quantity += r.quantity;
          existing.marketValue += r.marketValue;
          existing.costBasis += r.costBasis;
        } else {
          consolidatedMap.set(key, { asset: r.asset, quantity: r.quantity, marketValue: r.marketValue, costBasis: r.costBasis });
        }
      }
      const consolidatedRows = Array.from(consolidatedMap.values()).map(r => ({
        ...r,
        price: r.quantity > 0 ? r.marketValue / r.quantity : 0,
        gainLoss: r.costBasis > 0 ? r.marketValue - r.costBasis : 0,
        gainLossPct: r.costBasis > 0 ? ((r.marketValue - r.costBasis) / r.costBasis) * 100 : 0,
      }));

      const detailedMode = req.query.detail === "true";

      if (detailedMode) {
        if (exchangeRows.length > 0) {
          curY += 8;
          if (curY > 250) { doc.addPage(); curY = 14; }
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text("Exchange Holdings", 14, curY);
          autoTable(doc, {
            startY: curY + 4,
            head: [["Asset", "Source", "Qty", "Price", "Mkt Value", "Cost Basis", "Gain/Loss"]],
            body: exchangeRows.sort((a, b) => b.marketValue - a.marketValue).map(r => [
              r.asset, r.source, fmtQty(r.quantity), fmtCur(r.price),
              fmtCur(r.marketValue), r.costBasis > 0 ? fmtCur(r.costBasis) : "--", r.costBasis > 0 ? `${fmtCur(r.gainLoss)} (${fmtPct(r.gainLossPct)})` : "--",
            ]),
            theme: "striped",
            headStyles: { fillColor: [0, 164, 228], fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 1.5 },
            columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
            margin: { left: 14, right: 14 },
          });
          curY = (doc as any).lastAutoTable?.finalY || curY + 40;
        }

        if (walletRows.length > 0) {
          curY += 8;
          if (curY > 250) { doc.addPage(); curY = 14; }
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text("Wallet Holdings", 14, curY);
          autoTable(doc, {
            startY: curY + 4,
            head: [["Asset", "Wallet", "Chain", "Qty", "Price", "Mkt Value", "Cost Basis", "Gain/Loss"]],
            body: walletRows.sort((a, b) => b.marketValue - a.marketValue).map(r => [
              r.asset, r.source, r.chain, fmtQty(r.quantity), fmtCur(r.price),
              fmtCur(r.marketValue), r.costBasis > 0 ? fmtCur(r.costBasis) : "--", r.costBasis > 0 ? `${fmtCur(r.gainLoss)} (${fmtPct(r.gainLossPct)})` : "--",
            ]),
            theme: "striped",
            headStyles: { fillColor: [0, 164, 228], fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 1.5 },
            columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
            margin: { left: 14, right: 14 },
          });
          curY = (doc as any).lastAutoTable?.finalY || curY + 40;
        }
      } else {
        const DUST_THRESHOLD = 100;
        const significantRows = consolidatedRows.filter(r => r.marketValue >= DUST_THRESHOLD);
        const dustRows = consolidatedRows.filter(r => r.marketValue < DUST_THRESHOLD);
        if (dustRows.length > 0) {
          const dustTotal = dustRows.reduce((s, r) => s + r.marketValue, 0);
          const dustCost = dustRows.reduce((s, r) => s + r.costBasis, 0);
          const dustGL = dustCost > 0 ? dustTotal - dustCost : 0;
          significantRows.push({
            asset: `Other (${dustRows.length} assets)`,
            quantity: 0,
            price: 0,
            marketValue: dustTotal,
            costBasis: dustCost,
            gainLoss: dustGL,
            gainLossPct: dustCost > 0 ? (dustGL / dustCost) * 100 : 0,
          });
        }

        if (significantRows.length > 0) {
          curY += 8;
          if (curY > 250) { doc.addPage(); curY = 14; }
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text("Crypto Holdings", 14, curY);
          autoTable(doc, {
            startY: curY + 4,
            head: [["Asset", "Total Qty", "Avg Price", "Mkt Value", "Cost Basis", "Gain/Loss"]],
            body: significantRows.sort((a, b) => b.marketValue - a.marketValue).map(r => [
              r.asset, r.quantity > 0 ? fmtQty(r.quantity) : "--", r.price > 0 ? fmtCur(r.price) : "--",
              fmtCur(r.marketValue), r.costBasis > 0 ? fmtCur(r.costBasis) : "--", r.costBasis > 0 ? `${fmtCur(r.gainLoss)} (${fmtPct(r.gainLossPct)})` : "--",
            ]),
            theme: "striped",
            headStyles: { fillColor: [0, 164, 228], fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 1.5 },
            columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
            margin: { left: 14, right: 14 },
          });
          curY = (doc as any).lastAutoTable?.finalY || curY + 40;
        }
      }

      if (propertyRows.length > 0) {
        curY += 8;
        if (curY > 250) { doc.addPage(); curY = 14; }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Real Estate Holdings", 14, curY);
        autoTable(doc, {
          startY: curY + 4,
          head: [["Property", "City", "Purchase Price", "Current Value", "Gain/Loss"]],
          body: propertyRows.map(r => [
            r.address, r.city, fmtCur(r.purchasePrice), fmtCur(r.currentValue), fmtCur(r.gainLoss),
          ]),
          theme: "striped",
          headStyles: { fillColor: [0, 164, 228], fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
          margin: { left: 14, right: 14 },
        });
        curY = (doc as any).lastAutoTable?.finalY || curY + 40;
      }

      if (holdingsRows.length > 0) {
        curY += 8;
        if (curY > 250) { doc.addPage(); curY = 14; }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Other Investments & Insurance", 14, curY);
        const TYPE_LBL: Record<string, string> = {
          startup: "Startup", insurance: "Insurance", brokerage: "Brokerage",
          vehicle: "Vehicle", collectible: "Collectible", other: "Other",
        };
        autoTable(doc, {
          startY: curY + 4,
          head: [["Name", "Type", "Provider", "Acct/Policy #", "Quantity", "Invested", "Current Value"]],
          body: holdingsRows.map(r => [
            r.name,
            TYPE_LBL[r.type] || r.type,
            r.provider,
            r.accountId,
            r.quantity,
            r.invested > 0 ? fmtCur(r.invested) : "--",
            fmtCur(r.currentValue),
          ]),
          theme: "striped",
          headStyles: { fillColor: [0, 164, 228], fontSize: 8 },
          styles: { fontSize: 7.5, cellPadding: 2 },
          columnStyles: { 5: { halign: "right" }, 6: { halign: "right" } },
          margin: { left: 14, right: 14 },
        });
        curY = (doc as any).lastAutoTable?.finalY || curY + 40;

        const hasLegacyDetails = holdingsRows.some(r => r.contactUrl || r.contactPhone || r.legacyInstructions || r.beneficiary);
        if (hasLegacyDetails) {
          curY += 6;
          if (curY > 240) { doc.addPage(); curY = 14; }
          doc.setFontSize(10);
          doc.setTextColor(180, 100, 0);
          doc.text("Legacy Plan — Contact & Beneficiary Info", 14, curY);
          doc.setTextColor(0);
          autoTable(doc, {
            startY: curY + 4,
            head: [["Name", "Website", "Phone", "Beneficiary", "Instructions"]],
            body: holdingsRows.map(r => [
              r.name,
              r.contactUrl,
              r.contactPhone,
              r.beneficiary + (r.beneficiaryContact ? `\n${r.beneficiaryContact}` : ""),
              r.legacyInstructions,
            ]),
            theme: "grid",
            headStyles: { fillColor: [180, 100, 0], fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 2, valign: "top" },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 45 },
              2: { cellWidth: 25 },
              3: { cellWidth: 35 },
              4: { cellWidth: "auto" },
            },
            margin: { left: 14, right: 14 },
          });
          curY = (doc as any).lastAutoTable?.finalY || curY + 40;
        }
      }

      if (bankRows.length > 0) {
        curY += 8;
        if (curY > 250) { doc.addPage(); curY = 14; }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Bank & Brokerage Holdings", 14, curY);
        autoTable(doc, {
          startY: curY + 4,
          head: [["Account", "Balance", "APY"]],
          body: bankRows.map(r => [r.label, fmtCur(r.balance), r.apy ? r.apy.toFixed(2) + "%" : "--"]),
          theme: "striped",
          headStyles: { fillColor: [0, 164, 228], fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
          margin: { left: 14, right: 14 },
        });
        curY = (doc as any).lastAutoTable?.finalY || curY + 40;
      }

      doc.addPage();
      const discY = 20;
      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.text("Important Disclosures & Legal Notices", 14, discY);
      doc.setDrawColor(0, 164, 228);
      doc.setLineWidth(0.3);
      doc.line(14, discY + 3, 196, discY + 3);

      doc.setFontSize(7.5);
      doc.setTextColor(60);
      const disclaimers = [
        "GENERAL DISCLAIMER",
        "This Portfolio Statement is generated by CryptoOwnBank (operated by Wint Enterprises) and is provided for informational purposes only. It does not constitute financial, investment, tax, or legal advice. You should consult with qualified professionals before making any financial decisions.",
        "",
        "NOT A FINANCIAL INSTITUTION",
        "CryptoOwnBank is not a bank, broker-dealer, investment adviser, money transmitter, or any other type of licensed financial institution. We do not hold, custody, or control your assets at any time. All transactions are executed on-chain through non-custodial protocols.",
        "",
        "NO CUSTODIAL RELATIONSHIP",
        "CryptoOwnBank does not take custody of, hold, or control any user funds, tokens, private keys, or digital assets. All wallet addresses and blockchain interactions shown in this statement are user-directed and non-custodial.",
        "",
        "ACCURACY OF DATA",
        "Portfolio values, prices, and balances shown are based on data from third-party sources including blockchain networks, CoinGecko, and user-provided information. Prices are approximate market rates at the time of generation and may differ from actual execution prices. CryptoOwnBank makes no warranty regarding the accuracy, completeness, or timeliness of any data presented.",
        "",
        "GAIN/LOSS CALCULATIONS",
        "Unrealized gain/loss figures are estimates based on reported cost basis and current market prices. These figures are not audited and should not be used as the sole basis for tax reporting. Consult a qualified tax professional for official tax calculations.",
        "",
        "MARKET RISK",
        "Digital assets are highly volatile and speculative. Past performance is not indicative of future results. You may lose some or all of your investment. The values shown in this statement can fluctuate significantly within short time periods.",
        "",
        "REGULATORY NOTICE",
        "This statement is not a substitute for official account statements from regulated financial institutions. Digital asset regulations vary by jurisdiction. It is your responsibility to comply with applicable laws and regulations in your jurisdiction.",
        "",
        "CONFIDENTIALITY",
        "This document contains confidential financial information prepared exclusively for the named recipient. Do not share, distribute, or reproduce this statement without proper authorization. CryptoOwnBank is not responsible for unauthorized disclosure.",
        "",
        "NO FDIC OR SIPC COVERAGE",
        "Digital assets and cryptocurrency holdings are not insured by the Federal Deposit Insurance Corporation (FDIC), the Securities Investor Protection Corporation (SIPC), or any government agency. There is no guarantee of recovery in the event of loss.",
        "",
        "THIRD-PARTY SERVICES",
        "References to third-party exchanges, wallets, protocols, or services do not constitute endorsement. CryptoOwnBank is not responsible for the actions, security, or performance of any third-party service.",
      ];

      let dY = discY + 8;
      for (const line of disclaimers) {
        if (dY > 278) { doc.addPage(); dY = 20; }
        if (line === "") {
          dY += 2;
        } else if (line === line.toUpperCase() && line.length > 0) {
          doc.setFontSize(8);
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.text(line, 14, dY);
          doc.setFont("helvetica", "normal");
          dY += 4;
        } else {
          doc.setFontSize(7);
          doc.setTextColor(80);
          const lines = doc.splitTextToSize(line, 178);
          doc.text(lines, 14, dY);
          dY += lines.length * 3.2;
        }
      }

      dY += 6;
      if (dY > 270) { doc.addPage(); dY = 20; }
      doc.setDrawColor(180);
      doc.setLineWidth(0.2);
      doc.line(14, dY, 196, dY);
      dY += 5;
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text("CryptoOwnBank | cryptoownbank.com | Wint Enterprises", 14, dY);
      dY += 3.5;
      doc.text(`Statement generated: ${statementDate} UTC`, 14, dY);
      dY += 3.5;
      doc.text("Questions? Contact support@cryptoownbank.com", 14, dY);

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setDrawColor(0, 164, 228);
        doc.setLineWidth(0.3);
        doc.line(14, 8, 196, 8);
        doc.setFontSize(6.5);
        doc.setTextColor(0, 164, 228);
        doc.text("CryptoOwnBank", 14, 7);
        doc.setTextColor(140);
        doc.text("PORTFOLIO STATEMENT | CONFIDENTIAL", 196, 7, { align: "right" });

        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(14, 283, 196, 283);

        doc.setFontSize(6);
        doc.setTextColor(140);
        doc.text("This document is for informational purposes only and does not constitute financial, investment, tax, or legal advice.", 14, 286);
        doc.text("CryptoOwnBank does not hold, custody, or control your assets. Not FDIC insured. Not a bank. No guarantee of value.", 14, 289);
        doc.text(`Generated ${statementDate} | Page ${i} of ${pageCount}`, 196, 292, { align: "right" });
        doc.text("cryptoownbank.com | Wint Enterprises", 14, 292);
      }

      const pdfBuffer = doc.output("arraybuffer");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=CryptoOwnBank-Statement-${now.toISOString().slice(0, 10)}.pdf`);
      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error("Statement generation error:", error);
      res.status(500).json({ message: "Failed to generate portfolio statement" });
    }
  });

  registerHoldingsRoutes(app);
  const rpcRateLimits = new Map<string, { count: number; windowStart: number }>();
  const RPC_RATE_LIMIT_FREE = 10;
  const RPC_RATE_LIMIT_PRO = 60;
  const RPC_RATE_WINDOW_MS = 60_000;
  const RPC_MAX_BODY_BYTES = 64 * 1024;

  app.post("/api/rpc/:chain", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limit = tier === "pro" ? RPC_RATE_LIMIT_PRO : RPC_RATE_LIMIT_FREE;
      const now = Date.now();
      const bucket = rpcRateLimits.get(userId);
      if (!bucket || now - bucket.windowStart > RPC_RATE_WINDOW_MS) {
        rpcRateLimits.set(userId, { count: 1, windowStart: now });
      } else {
        bucket.count += 1;
        if (bucket.count > limit) {
          return res.status(429).json({
            message: tier === "pro"
              ? "Rate limit exceeded (60/min)"
              : "Free tier limit reached (10/min). Upgrade to Pro for 60/min.",
            tier,
            limit,
            upgradeUrl: "/settings?tab=subscription",
          });
        }
      }

      const { chain } = req.params;
      const ALLOWED = ["flare", "xrpl", "ethereum", "avalanche", "solana"];
      if (!ALLOWED.includes(chain)) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const bodyBytes = JSON.stringify(req.body || {}).length;
      if (bodyBytes > RPC_MAX_BODY_BYTES) {
        return res.status(413).json({ message: "Payload too large" });
      }

      const { method, params } = req.body || {};
      if (typeof method !== "string" || !Array.isArray(params)) {
        return res.status(400).json({ message: "Invalid JSON-RPC payload" });
      }

      const DENIED_METHODS = new Set([
        "debug_traceTransaction", "debug_traceBlockByNumber", "debug_traceBlockByHash",
        "trace_block", "trace_filter", "trace_replayBlockTransactions",
      ]);
      if (DENIED_METHODS.has(method)) {
        return res.status(403).json({ message: "Method not allowed via relay" });
      }

      const { relayJsonRpc } = await import("./services/rpc-relay");
      const result = await relayJsonRpc(chain as any, method, params);
      res.json({ jsonrpc: "2.0", id: 1, result });
    } catch (error: any) {
      console.error("RPC relay error:", error?.message || error);
      res.status(502).json({ message: "Relay failed", detail: error?.message });
    }
  });

  registerBillingRoutes(app);
  function sortObjectKeys(obj: any): any {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    return Object.keys(obj).sort().reduce((sorted: any, key) => {
      sorted[key] = sortObjectKeys(obj[key]);
      return sorted;
    }, {});
  }

  app.post("/api/nowpayments/ipn", async (req, res) => {
    try {
      const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
      if (!ipnSecret) {
        console.error("[NOWPayments IPN] IPN secret not configured");
        return res.status(500).json({ message: "IPN not configured" });
      }

      const signature = req.headers["x-nowpayments-sig"] as string;
      if (!signature) {
        console.warn("[NOWPayments IPN] Missing signature header");
        return res.status(400).json({ message: "Missing signature" });
      }

      const sortedBody = JSON.stringify(sortObjectKeys(req.body));
      const hmac = crypto.createHmac("sha512", ipnSecret).update(sortedBody).digest("hex");

      if (hmac !== signature) {
        console.warn("[NOWPayments IPN] Invalid signature");
        return res.status(401).json({ message: "Invalid signature" });
      }

      const { payment_status, order_id, pay_amount, pay_currency, actually_paid, payment_id, order_description } = req.body;
      console.log(`[NOWPayments IPN] Received: status=${payment_status}, order=${order_id}, paid=${actually_paid} ${pay_currency}, payment_id=${payment_id}`);

      if (payment_status === "finished" || payment_status === "confirmed") {
        if (order_id) {
          const payment = await storage.getCryptoPayment(order_id);
          if (payment && payment.status === "pending") {
            const txRef = `nowpayments:${payment_id}`;
            await storage.updateCryptoPaymentStatus(payment.id, "confirmed", txRef);
            const { activateSubscription } = await import("./services/crypto-payment-verifier");
            await activateSubscription(payment);
            console.log(`[NOWPayments IPN] Payment ${order_id} confirmed and subscription activated`);
          } else if (payment && payment.status === "confirmed") {
            console.log(`[NOWPayments IPN] Payment ${order_id} already confirmed, skipping`);
          } else if (!payment) {
            console.warn(`[NOWPayments IPN] No matching payment record for order_id=${order_id}`);
          }
        }
      } else if (payment_status === "expired" || payment_status === "failed") {
        if (order_id) {
          const payment = await storage.getCryptoPayment(order_id);
          if (payment && payment.status === "pending") {
            await storage.updateCryptoPaymentStatus(payment.id, "expired");
            console.log(`[NOWPayments IPN] Payment ${order_id} marked as ${payment_status}`);
          }
        }
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[NOWPayments IPN] Error:", error);
      res.status(500).json({ message: "IPN processing error" });
    }
  });

  registerAdminSubscriptionsRoutes(app);
  const TIER_LIMITS: Record<string, {
    exchanges: number | null;
    wallets: number | null;
    alerts: number | null;
    transactionHistoryDays: number | null;
    csvImport: boolean;
    autoWithdraw: boolean;
    xls66Lending: boolean;
    statementUploads: number | null;
    statementComparisons: boolean;
    portfolioSearch: boolean;
    recommendationsHub: "basic" | "full";
    recurringPayments: boolean;
    recurringPaymentsBatch: boolean;
    defiBorrowing: boolean;
    realEstateTokens: boolean;
    maxTeamMembers: number;
    treasuryDashboard: boolean;
    aiChatsPerMonth: number | null;
  }> = {
    free: {
      exchanges: 1,
      wallets: 1,
      alerts: 1,
      transactionHistoryDays: 7,
      csvImport: false,
      autoWithdraw: false,
      xls66Lending: false,
      statementUploads: 0,
      statementComparisons: false,
      portfolioSearch: false,
      recommendationsHub: "basic",
      recurringPayments: false,
      recurringPaymentsBatch: false,
      defiBorrowing: false,
      realEstateTokens: false,
      maxTeamMembers: 0,
      treasuryDashboard: false,
      aiChatsPerMonth: 0,
    },
    premium: {
      exchanges: null,
      wallets: null,
      alerts: null,
      transactionHistoryDays: null,
      csvImport: true,
      autoWithdraw: true,
      xls66Lending: false,
      statementUploads: null,
      statementComparisons: true,
      portfolioSearch: true,
      recommendationsHub: "full",
      recurringPayments: true,
      recurringPaymentsBatch: false,
      defiBorrowing: false,
      realEstateTokens: false,
      maxTeamMembers: 0,
      treasuryDashboard: false,
      aiChatsPerMonth: 50,
    },
    pro: {
      exchanges: null,
      wallets: null,
      alerts: null,
      transactionHistoryDays: null,
      csvImport: true,
      autoWithdraw: true,
      xls66Lending: true,
      statementUploads: null,
      statementComparisons: true,
      portfolioSearch: true,
      recommendationsHub: "full",
      recurringPayments: true,
      recurringPaymentsBatch: true,
      defiBorrowing: true,
      realEstateTokens: true,
      maxTeamMembers: 5,
      treasuryDashboard: true,
      aiChatsPerMonth: null,
    },
  };

  app.get("/api/subscription/limits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, billingCycle } = await getEffectiveTier(userId);

      const credentials = await storage.getApiCredentialsByUser(userId);
      const userWallets = await storage.getWalletsByUser(userId);
      const activeAlerts = await storage.countActiveAlertsByUser(userId);
      const activeAddons = await storage.getActiveUserAddons(userId);

      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      const hasAnnualPlan = billingCycle === "yearly";
      const taxReportsUnlocked = tier !== "free" && hasAnnualPlan;

      const addonKeys = activeAddons.map(a => a.addonKey);
      const hasAddon = (key: string) => addonKeys.includes(key);
      const hasTechnicalAnalysis = hasAddon("technical-analysis") || tier === "premium" || tier === "pro";
      const hasPayments = hasAddon("payments") || tier === "premium" || tier === "pro";

      const unlockedChains = ["xrpl"];
      if (tier === "premium" || tier === "pro") {
        unlockedChains.push("ethereum", "bitcoin", "solana", "stellar", "cardano", "polygon");
      } else {
        for (const addon of activeAddons) {
          if (addon.addonType === "multi_chain") {
            const chainName = addon.addonKey.replace("chain-", "");
            if (!unlockedChains.includes(chainName)) {
              unlockedChains.push(chainName);
            }
          }
        }
      }

      res.json({
        tier,
        billingCycle,
        exchanges: { limit: limits.exchanges, used: credentials.length },
        wallets: { limit: limits.wallets, used: userWallets.length },
        alerts: { limit: limits.alerts, used: activeAlerts },
        transactionHistoryDays: limits.transactionHistoryDays,
        csvImport: limits.csvImport,
        taxReports: taxReportsUnlocked,
        autoWithdraw: limits.autoWithdraw,
        xls66Lending: limits.xls66Lending,
        statementUploads: limits.statementUploads,
        statementComparisons: limits.statementComparisons,
        portfolioSearch: limits.portfolioSearch,
        recommendationsHub: limits.recommendationsHub,
        recurringPayments: hasPayments ? true : limits.recurringPayments,
        recurringPaymentsBatch: limits.recurringPaymentsBatch,
        defiBorrowing: limits.defiBorrowing,
        realEstateTokens: limits.realEstateTokens,
        maxTeamMembers: limits.maxTeamMembers,
        treasuryDashboard: limits.treasuryDashboard,
        technicalAnalysis: hasTechnicalAnalysis,
        paymentsAddon: hasPayments,
        aiChatsPerMonth: limits.aiChatsPerMonth,
        unlockedChains,
        activeAddons: activeAddons.map(a => ({ id: a.id, addonKey: a.addonKey, addonType: a.addonType, status: a.status })),
      });
    } catch (error) {
      console.error("Subscription limits error:", error);
      res.status(500).json({ message: "Failed to load subscription limits" });
    }
  });

  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const aiRateLimit = new Map<string, number[]>();

  const AI_SYSTEM_PROMPT = `You are CryptoOwnBank's AI Portfolio Assistant. You help members understand their crypto portfolio, market conditions, and platform features.

Key facts about CryptoOwnBank:
- Non-custodial platform: members always hold their own keys. We never hold funds.
- Supports XRPL, Stellar, Ethereum, Bitcoin, Solana, Cardano, Polygon, and 17+ other chains.
- Features: portfolio tracking, RLUSD yield vaults (Soil Protocol), DEX trading, DCA orders, cross-chain swaps, tax reports, legacy planning, price alerts, whale alerts, and more.
- Three tiers: Free (limited), Premium ($29/mo or $199/yr), Pro ($99/mo or $799/yr).
- RLUSD is Ripple's USD-pegged stablecoin on XRPL.

Rules you MUST follow:
1. NEVER provide financial advice. Always include a brief disclaimer when discussing investment decisions: "This is not financial advice."
2. NEVER suggest specific buy/sell actions. You can explain what metrics mean and how features work.
3. Be concise and helpful. Use plain language.
4. If asked about portfolio data, reference the data provided in the context. If no data is provided, say you can see their portfolio when they ask from the Portfolio Assistant page.
5. You can explain crypto concepts, platform features, tax implications (generally), and market mechanics.
6. Never mention internal implementation details, API keys, or system architecture.
7. Do not use emojis.`;

  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      if (!openai) {
        return res.status(503).json({ message: "AI assistant is not configured" });
      }

      const userId = req.user.claims.sub;
      const { messages, sessionId, portfolioContext } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages are required" });
      }
      if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const now = Date.now();
      const userCalls = aiRateLimit.get(userId) || [];
      const recentCalls = userCalls.filter(t => now - t < 60000);
      if (recentCalls.length >= 10) {
        return res.status(429).json({ message: "Too many requests. Please wait a moment before sending another message." });
      }
      recentCalls.push(now);
      aiRateLimit.set(userId, recentCalls);

      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      if (limits.aiChatsPerMonth !== null) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [countResult] = await db.select({ count: sql<number>`count(*)` })
          .from(aiChatMessages)
          .where(and(
            eq(aiChatMessages.userId, userId),
            eq(aiChatMessages.role, "user"),
            sql`${aiChatMessages.createdAt} >= ${monthStart}`
          ));
        const used = Number(countResult?.count || 0);
        if (used >= limits.aiChatsPerMonth) {
          return res.status(429).json({
            message: `You've used all ${limits.aiChatsPerMonth} AI chats this month. Upgrade your plan for more.`,
            limit: limits.aiChatsPerMonth,
            used,
          });
        }
      }

      const lastUserMsg = messages[messages.length - 1];
      if (!lastUserMsg || lastUserMsg.role !== "user") {
        return res.status(400).json({ message: "Last message must be from the user" });
      }

      const validRoles = new Set(["user", "assistant"]);
      const sanitized = messages.slice(-20)
        .filter((m: any) => m && validRoles.has(m.role) && typeof m.content === "string" && m.content.trim().length > 0)
        .map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: String(m.content).slice(0, 2000),
        }));

      if (sanitized.length === 0) {
        return res.status(400).json({ message: "No valid messages provided" });
      }

      let systemContent = AI_SYSTEM_PROMPT;
      if (portfolioContext && typeof portfolioContext === "string") {
        systemContent += `\n\nMember's portfolio context (auto-generated, not user-provided):\n${String(portfolioContext).slice(0, 1000)}`;
      }

      const apiMessages = [
        { role: "system" as const, content: systemContent },
        ...sanitized,
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: apiMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

      await db.insert(aiChatMessages).values([
        { userId, sessionId, role: "user", content: String(lastUserMsg.content).slice(0, 2000) },
        { userId, sessionId, role: "assistant", content: reply },
      ]);

      res.json({ reply, model: completion.model });
    } catch (error: any) {
      console.error("AI chat error:", error?.message || error);
      if (error?.status === 429) {
        return res.status(429).json({ message: "AI service rate limited. Please try again in a moment." });
      }
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  app.get("/api/ai/usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(aiChatMessages)
        .where(and(
          eq(aiChatMessages.userId, userId),
          eq(aiChatMessages.role, "user"),
          sql`${aiChatMessages.createdAt} >= ${monthStart}`
        ));
      const used = Number(countResult?.count || 0);

      res.json({
        limit: limits.aiChatsPerMonth,
        used,
        tier,
      });
    } catch (error) {
      console.error("AI usage error:", error);
      res.status(500).json({ message: "Failed to get AI usage" });
    }
  });

  app.get("/api/ai/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await db.select({
        sessionId: aiChatMessages.sessionId,
        lastMessage: sql<string>`MAX(${aiChatMessages.content})`,
        lastAt: sql<Date>`MAX(${aiChatMessages.createdAt})`,
        messageCount: sql<number>`count(*)`,
      })
        .from(aiChatMessages)
        .where(eq(aiChatMessages.userId, userId))
        .groupBy(aiChatMessages.sessionId)
        .orderBy(sql`MAX(${aiChatMessages.createdAt}) DESC`)
        .limit(20);

      res.json(sessions);
    } catch (error) {
      console.error("AI history error:", error);
      res.status(500).json({ message: "Failed to load chat history" });
    }
  });

  app.get("/api/ai/session/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const msgs = await db.select()
        .from(aiChatMessages)
        .where(and(
          eq(aiChatMessages.userId, userId),
          eq(aiChatMessages.sessionId, req.params.sessionId)
        ))
        .orderBy(aiChatMessages.createdAt);

      res.json(msgs);
    } catch (error) {
      console.error("AI session error:", error);
      res.status(500).json({ message: "Failed to load session" });
    }
  });

  const feedbackUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain", "text/csv"];
      cb(null, allowed.includes(file.mimetype));
    },
  });

  app.post("/api/feedback", feedbackUpload.array("files", 3), async (req: any, res) => {
    try {
      const { name, email, type, message } = req.body;
      if (!name || !email || !type || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (message.length > 5000) {
        return res.status(400).json({ message: "Message too long (max 5000 characters)" });
      }
      const attachments = (req.files || []).map((f: any) => ({
        filename: f.originalname,
        content: f.buffer,
      }));
      await sendFeedbackNotification(name, email, type, message, attachments);
      res.json({ success: true });
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(500).json({ message: "Failed to send feedback" });
    }
  });

  const xummApiKey = process.env.VITE_XUMM_API_KEY || process.env.XUMM_API_KEY;
  const xummApiSecret = process.env.XUMM_API_SECRET;
  let xummSdk: XummSdk | null = null;

  if (xummApiKey && xummApiSecret) {
    xummSdk = new XummSdk(xummApiKey, xummApiSecret);
  }

  app.post("/api/xumm/signin", async (_req, res) => {
    try {
      if (!xummSdk) {
        return res.status(500).json({ message: "Xumm SDK not configured" });
      }
      const payload = await xummSdk.payload.create({
        TransactionType: "SignIn" as any,
      } as any, true);
      if (!payload) {
        return res.status(500).json({ message: "Failed to create Xumm payload" });
      }
      res.json({
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
        mobileLink: payload.refs.websocket_status,
      });
    } catch (error: any) {
      console.error("Xumm signin error:", error?.message);
      res.status(500).json({ message: error.message || "Failed to create sign-in request" });
    }
  });

  app.get("/api/xumm/status/:uuid", async (req, res) => {
    try {
      if (!xummSdk) {
        return res.status(500).json({ message: "Xumm SDK not configured" });
      }
      const payload = await xummSdk.payload.get(req.params.uuid);
      if (!payload) {
        return res.status(404).json({ message: "Payload not found" });
      }
      const resolved = payload.meta.resolved;
      const signed = payload.meta.signed;
      const account = payload.response?.account || null;
      const txid = payload.response?.txid || null;
      const dispatchedResult = payload.response?.dispatched_result || null;
      const dispatchedTo = payload.response?.dispatched_to || null;
      res.json({ resolved, signed, account, txid, dispatchedResult, dispatchedTo });
    } catch (error: any) {
      console.error("Xumm status error:", error);
      res.status(500).json({ message: error.message || "Failed to check status" });
    }
  });

  app.post("/api/xumm/payload", async (req, res) => {
    try {
      if (!xummSdk) {
        return res.status(500).json({ message: "Xumm SDK not configured" });
      }
      const { TransactionType, Destination, Amount, LimitAmount, TakerGets, TakerPays, OfferSequence, Flags, Memos, DestinationTag, SourceTag, ...extraFields } = req.body;
      if (!TransactionType) {
        return res.status(400).json({ message: "TransactionType is required" });
      }
      const txJson: any = { TransactionType };
      if (Destination) txJson.Destination = Destination;
      if (Amount) txJson.Amount = Amount;
      if (LimitAmount) txJson.LimitAmount = LimitAmount;
      if (TakerGets !== undefined) txJson.TakerGets = TakerGets;
      if (TakerPays !== undefined) txJson.TakerPays = TakerPays;
      if (OfferSequence !== undefined) txJson.OfferSequence = OfferSequence;
      if (Flags !== undefined) txJson.Flags = Flags;
      if (Memos) txJson.Memos = Memos;
      if (DestinationTag !== undefined) txJson.DestinationTag = DestinationTag;
      if (SourceTag !== undefined) txJson.SourceTag = SourceTag;
      const allowedExtra = ["Fee", "Sequence", "AccountTxnID", "LastLedgerSequence", "NFTokenID", "NFTokenOffers", "Condition", "Fulfillment", "CancelAfter", "FinishAfter", "Owner", "Expiration", "VaultID", "Asset", "MPTokenIssuanceID", "SharesIn", "SharesOut", "AssetMaximum", "Data", "LoanAmount", "CollateralAmount", "InterestRate", "LoanTerm", "LoanID"];
      for (const key of allowedExtra) {
        if (extraFields[key] !== undefined) txJson[key] = extraFields[key];
      }

      let payload: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          payload = await xummSdk.payload.create({ txjson: txJson } as any, true);
          if (payload) break;
        } catch (retryErr: any) {
          console.error(`Xumm payload create attempt ${attempt + 1} failed:`, retryErr?.message);
          if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
        }
      }
      if (!payload) {
        return res.status(500).json({ message: "Failed to create Xaman signing request. Please try again." });
      }
      res.json({
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
      });
    } catch (error: any) {
      console.error("Xumm payload error:", error?.message, error?.stack?.slice(0, 300));
      res.status(500).json({ message: error.message || "Failed to create payload" });
    }
  });

  app.post("/api/dex/trade-notification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select({ email: users.email, firstName: users.firstName }).from(users).where(eq(users.id, userId));
      if (!user?.email) {
        return res.json({ sent: false, reason: "no email" });
      }
      const { dex, side, orderType, baseAsset, counterAsset, amount, price, total, walletAddress, pair } = req.body;
      const validDex = ["XRPL", "Stellar"];
      const validSide = ["Buy", "Sell"];
      const validOrderType = ["Limit", "Market"];
      if (!validDex.includes(dex) || !validSide.includes(side)) {
        return res.status(400).json({ message: "Invalid dex or side" });
      }
      if (!amount || !walletAddress || !pair) {
        return res.status(400).json({ message: "Missing required trade details" });
      }
      const sanitize = (s: string, max = 50) => String(s || "").slice(0, max);
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "long" });
      sendDexTradeConfirmation(user.email, {
        dex: dex as "XRPL" | "Stellar",
        side: side as "Buy" | "Sell",
        orderType: validOrderType.includes(orderType) ? orderType : "Market",
        baseAsset: sanitize(baseAsset, 20),
        counterAsset: sanitize(counterAsset, 20),
        amount: sanitize(amount, 30),
        price: sanitize(price || "Market", 30),
        total: sanitize(total || "0", 30),
        walletAddress: sanitize(walletAddress, 100),
        pair: sanitize(pair, 40),
        timestamp,
      }).catch(err => console.error("[dex-email] Failed to send trade notification:", err?.message));

      try {
        const swapQty = parseFloat(amount);
        const swapPrice = parseFloat(price || "0");
        const swapTotal = parseFloat(total || "0");
        if (swapQty > 0 && walletAddress) {
          const userWallets = await storage.getWalletsByUser(userId);
          const matchWallet = userWallets.find(w => w.address?.toLowerCase() === walletAddress.toLowerCase());
          if (matchWallet) {
            const walletBalances = await storage.getWalletBalances(matchWallet.id);
            if (side === "Sell" && baseAsset) {
              const soldBalance = walletBalances.find(wb => wb.assetSymbol.toUpperCase() === baseAsset.toUpperCase());
              if (soldBalance) {
                const lots = await storage.getTaxLotsByWalletBalance(userId, soldBalance.id);
                const activeLots = lots.filter(l => parseFloat(l.remainingQuantity) > 0);
                if (activeLots.length > 0) {
                  const sortedLots = [...activeLots].sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());
                  let remaining = swapQty;
                  const oneYear = 365 * 24 * 60 * 60 * 1000;
                  const sellDate = new Date();
                  for (const lot of sortedLots) {
                    if (remaining <= 0.0001) break;
                    const lotRemaining = parseFloat(lot.remainingQuantity);
                    if (lotRemaining <= 0) continue;
                    const sellFromLot = Math.min(remaining, lotRemaining);
                    const proceeds = swapPrice > 0 ? sellFromLot * swapPrice : (swapTotal > 0 ? swapTotal * (sellFromLot / swapQty) : 0);
                    const costBasis = sellFromLot * parseFloat(lot.costBasisPerUnit);
                    const isLongTerm = (sellDate.getTime() - new Date(lot.acquiredDate).getTime()) >= oneYear;
                    await storage.createGainEvent({
                      userId, sellTransactionId: null, taxLotId: lot.id,
                      assetSymbol: baseAsset.toUpperCase(), quantity: sellFromLot.toString(),
                      proceeds: proceeds.toFixed(2), costBasis: costBasis.toFixed(2),
                      gainLoss: (proceeds - costBasis).toFixed(2), isLongTerm,
                      taxMethod: "FIFO", soldDate: sellDate, acquiredDate: new Date(lot.acquiredDate),
                      disposalType: "swap", disposalNote: `DEX swap ${baseAsset} → ${counterAsset} on ${dex}`,
                    });
                    await storage.updateTaxLot(lot.id, { remainingQuantity: (lotRemaining - sellFromLot).toFixed(8) });
                    remaining -= sellFromLot;
                  }
                  console.log(`[dex-auto] Recorded sale of ${swapQty} ${baseAsset} from swap`);
                  const updatedLots = await storage.getTaxLotsByWalletBalance(userId, soldBalance.id);
                  const totalRemaining = updatedLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
                  const totalCostBasis = updatedLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
                  const avgCost = totalRemaining > 0 ? totalCostBasis / totalRemaining : 0;
                  await storage.updateWalletBalanceCostData(soldBalance.id, avgCost.toFixed(8), totalCostBasis.toFixed(2));
                }
              }
            }
            if (side === "Buy" && baseAsset && counterAsset) {
              const boughtBalance = walletBalances.find(wb => wb.assetSymbol.toUpperCase() === baseAsset.toUpperCase());
              if (boughtBalance) {
                const costPerUnit = swapPrice > 0 ? swapPrice : (swapTotal > 0 ? swapTotal / swapQty : 0);
                if (costPerUnit > 0) {
                  await storage.createTaxLot({
                    userId, walletBalanceId: boughtBalance.id, assetSymbol: baseAsset.toUpperCase(),
                    acquiredDate: new Date(), originalQuantity: swapQty.toString(),
                    remainingQuantity: swapQty.toString(), costBasisPerUnit: costPerUnit.toFixed(8),
                    acquisitionType: "purchase", note: `DEX buy via ${dex} swap (${counterAsset} → ${baseAsset})`,
                  });
                  console.log(`[dex-auto] Created lot for ${swapQty} ${baseAsset} from swap`);
                }
              }
            }
          }
        }
      } catch (autoErr: any) {
        console.error("[dex-auto] Failed to auto-record swap lots:", autoErr?.message);
      }

      res.json({ sent: true });
    } catch (error: any) {
      console.error("DEX trade notification error:", error?.message);
      res.json({ sent: false, reason: error.message });
    }
  });

  app.post("/api/send/disposal-notification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chain, assetSymbol, quantity, walletAddress, recipient, pricePerUnit, memo } = req.body;
      const qty = parseFloat(quantity);
      let price = parseFloat(pricePerUnit || "0");
      if (!assetSymbol || !qty || qty <= 0 || !walletAddress) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!price || price <= 0) {
        const cached = await db.select().from(priceCacheTable).where(eq(priceCacheTable.symbol, assetSymbol.toUpperCase()));
        if (cached.length > 0 && cached[0].price) {
          price = parseFloat(cached[0].price);
        }
      }
      const userWallets = await storage.getWalletsByUser(userId);
      const matchWallet = userWallets.find(w => w.address?.toLowerCase() === walletAddress.toLowerCase());
      if (!matchWallet) {
        return res.json({ recorded: false, reason: "wallet not found" });
      }
      const walletBalances = await storage.getWalletBalances(matchWallet.id);
      const balance = walletBalances.find(wb => wb.assetSymbol.toUpperCase() === assetSymbol.toUpperCase());
      if (!balance) {
        return res.json({ recorded: false, reason: "no balance for asset" });
      }
      const lots = await storage.getTaxLotsByWalletBalance(userId, balance.id);
      const activeLots = lots.filter(l => parseFloat(l.remainingQuantity) > 0)
        .sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());
      if (activeLots.length === 0) {
        return res.json({ recorded: false, reason: "no lots to dispose" });
      }
      let remaining = qty;
      const sellDate = new Date();
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      let totalGain = 0;
      for (const lot of activeLots) {
        if (remaining <= 0.0001) break;
        const lotRemaining = parseFloat(lot.remainingQuantity);
        if (lotRemaining <= 0) continue;
        const used = Math.min(remaining, lotRemaining);
        const proceeds = used * price;
        const costBasis = used * parseFloat(lot.costBasisPerUnit);
        const gainLoss = proceeds - costBasis;
        const isLongTerm = (sellDate.getTime() - new Date(lot.acquiredDate).getTime()) >= oneYear;
        await storage.createGainEvent({
          userId, sellTransactionId: null, taxLotId: lot.id,
          assetSymbol: assetSymbol.toUpperCase(), quantity: used.toString(),
          proceeds: proceeds.toFixed(2), costBasis: costBasis.toFixed(2),
          gainLoss: gainLoss.toFixed(2), isLongTerm,
          taxMethod: "FIFO", soldDate: sellDate, acquiredDate: new Date(lot.acquiredDate),
          disposalType: "send", disposalNote: `Sent ${assetSymbol} on ${chain || "unknown"} to ${recipient || "external"}${memo ? ` — ${memo}` : ""}`,
        });
        await storage.updateTaxLot(lot.id, { remainingQuantity: (lotRemaining - used).toFixed(8) });
        totalGain += gainLoss;
        remaining -= used;
      }
      const updatedLots = await storage.getTaxLotsByWalletBalance(userId, balance.id);
      const totalRemaining = updatedLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
      const totalCostBasis = updatedLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const avgCost = totalRemaining > 0 ? totalCostBasis / totalRemaining : 0;
      await storage.updateWalletBalanceCostData(balance.id, avgCost.toFixed(8), totalCostBasis.toFixed(2));
      console.log(`[send-disposal] Recorded disposal of ${qty} ${assetSymbol} via send on ${chain}`);
      res.json({ recorded: true, disposed: qty - remaining, gain: totalGain.toFixed(2) });
    } catch (error: any) {
      console.error("[send-disposal] Error:", error?.message);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== XLS-66 Native Lending & Single Asset Vaults =====
  const XLS66_LIVE = process.env.XLS66_LIVE === "true";

  let xls65AmendmentActive: boolean | null = null;
  let xls66AmendmentActive: boolean | null = null;
  let lastAmendmentCheck = 0;
  const AMENDMENT_CHECK_INTERVAL = 10 * 60 * 1000;

  interface AmendmentVoting {
    name: string;
    enabled: boolean;
    supported: boolean;
    vetoed: boolean;
    count: number;
    threshold: number;
    validatorCount: number;
    percentage: number;
  }

  let amendmentVotingCache: { xls65: AmendmentVoting | null; xls66: AmendmentVoting | null; checkedAt: number; lastSuccessAt: number; stale: boolean } = {
    xls65: null, xls66: null, checkedAt: 0, lastSuccessAt: 0, stale: false
  };

  async function checkAmendmentStatus(): Promise<{ xls65: boolean; xls66: boolean }> {
    const voting = await checkAmendmentVoting();
    return {
      xls65: voting.xls65?.enabled || false,
      xls66: voting.xls66?.enabled || false,
    };
  }

  async function checkAmendmentVoting(): Promise<typeof amendmentVotingCache> {
    const now = Date.now();
    if (amendmentVotingCache.checkedAt > 0 && now - amendmentVotingCache.checkedAt < AMENDMENT_CHECK_INTERVAL) {
      return amendmentVotingCache;
    }
    try {
      const resp = await fetch("https://api.xrpscan.com/api/v1/amendments", {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`XRPScan API returned ${resp.status}`);
      const amendments: any[] = await resp.json();

      xls65AmendmentActive = false;
      xls66AmendmentActive = false;
      let xls65Data: AmendmentVoting | null = null;
      let xls66Data: AmendmentVoting | null = null;

      for (const a of amendments) {
        if (a.name === "SingleAssetVault") {
          if (a.enabled === true) xls65AmendmentActive = true;
          const count = typeof a.count === "number" ? a.count : 0;
          const validatorCount = typeof a.validations === "number" ? a.validations : 35;
          const threshold = typeof a.threshold === "number" ? a.threshold : Math.ceil(validatorCount * 0.8);
          xls65Data = {
            name: "SingleAssetVault",
            enabled: a.enabled === true,
            supported: a.supported === true,
            vetoed: a.vetoed === true,
            count,
            threshold,
            validatorCount,
            percentage: validatorCount > 0 ? Math.round((count / validatorCount) * 100) : 0,
          };
        }
        if (a.name === "LendingProtocol") {
          if (a.enabled === true) xls66AmendmentActive = true;
          const count = typeof a.count === "number" ? a.count : 0;
          const validatorCount = typeof a.validations === "number" ? a.validations : 35;
          const threshold = typeof a.threshold === "number" ? a.threshold : Math.ceil(validatorCount * 0.8);
          xls66Data = {
            name: "LendingProtocol",
            enabled: a.enabled === true,
            supported: a.supported === true,
            vetoed: a.vetoed === true,
            count,
            threshold,
            validatorCount,
            percentage: validatorCount > 0 ? Math.round((count / validatorCount) * 100) : 0,
          };
        }
      }
      lastAmendmentCheck = now;
      console.log(`[XLS-66] Got amendment data from XRPScan — XLS-65: ${xls65Data?.count}/${xls65Data?.validatorCount} (${xls65Data?.percentage}%), XLS-66: ${xls66Data?.count}/${xls66Data?.validatorCount} (${xls66Data?.percentage}%)`);
      amendmentVotingCache = { xls65: xls65Data, xls66: xls66Data, checkedAt: now, lastSuccessAt: now, stale: false };
    } catch (error) {
      console.error("[XLS-66] XRPScan amendment check failed:", (error as any)?.message);
      if (xls65AmendmentActive === null) xls65AmendmentActive = false;
      if (xls66AmendmentActive === null) xls66AmendmentActive = false;
      amendmentVotingCache.checkedAt = now;
      amendmentVotingCache.stale = true;
    }
    return amendmentVotingCache;
  }

  let discoveredVaultsCache: any[] = [];
  let lastVaultDiscovery = 0;
  const VAULT_DISCOVERY_INTERVAL = 5 * 60 * 1000;

  async function discoverOnLedgerVaults(): Promise<any[]> {
    const now = Date.now();
    if (discoveredVaultsCache.length > 0 && now - lastVaultDiscovery < VAULT_DISCOVERY_INTERVAL) {
      return discoveredVaultsCache;
    }
    const amendments = await checkAmendmentStatus();
    if (!amendments.xls65 && !XLS66_LIVE) {
      return discoveredVaultsCache;
    }
    try {
      const { Client } = await import("xrpl");
      const client = new Client("wss://xrplcluster.com");
      await client.connect();
      const response = await client.request({
        command: "ledger_data",
        type: "vault",
        limit: 100,
      } as any);
      await client.disconnect();
      const state = (response?.result as any)?.state || [];
      const blocklist = await storage.getXls66VaultBlocklist();
      const blockedIds = new Set(blocklist.map(b => b.vaultId));
      const vaults = state
        .filter((entry: any) => entry.LedgerEntryType === "Vault" && !blockedIds.has(entry.index))
        .map((entry: any) => {
          const asset = entry.Asset;
          let assetDisplay = "XRP";
          if (typeof asset === "object") {
            assetDisplay = asset.currency?.length === 40
              ? Buffer.from(asset.currency, "hex").toString("utf8").replace(/\0/g, "")
              : asset.currency || "Unknown";
          }
          return {
            vaultId: entry.index,
            owner: entry.Owner,
            asset: assetDisplay,
            assetRaw: asset,
            assetsTotal: entry.AssetsTotal || "0",
            assetsAvailable: entry.AssetsAvailable || "0",
            shareMptId: entry.ShareMPTID || null,
            lossUnrealized: entry.LossUnrealized || "0",
            flags: entry.Flags || 0,
            ageDays: entry.PreviousTxnLgrSeq ? null : null,
            hasFirstLossCapital: false,
          };
        });
      discoveredVaultsCache = vaults;
      lastVaultDiscovery = now;
      console.log(`[XLS-66] Discovered ${vaults.length} vaults on-ledger (${blockedIds.size} blocked)`);
      return vaults;
    } catch (error) {
      console.error("[XLS-66] Vault discovery error:", (error as any)?.message);
      return discoveredVaultsCache;
    }
  }

  app.get("/api/xls66/amendment-progress", async (_req: any, res) => {
    try {
      const voting = await checkAmendmentVoting();
      res.json({
        xls65: voting.xls65 ? {
          name: "XLS-65 Single Asset Vaults",
          enabled: voting.xls65.enabled,
          count: voting.xls65.count,
          threshold: voting.xls65.threshold,
          validatorCount: voting.xls65.validatorCount,
          percentage: voting.xls65.percentage,
        } : null,
        xls66: voting.xls66 ? {
          name: "XLS-66 Lending Protocol",
          enabled: voting.xls66.enabled,
          count: voting.xls66.count,
          threshold: voting.xls66.threshold,
          validatorCount: voting.xls66.validatorCount,
          percentage: voting.xls66.percentage,
        } : null,
        lastChecked: voting.checkedAt ? new Date(voting.checkedAt).toISOString() : null,
        lastSuccessAt: voting.lastSuccessAt ? new Date(voting.lastSuccessAt).toISOString() : null,
        stale: voting.stale,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check amendment progress" });
    }
  });

  app.get("/api/xls66/status", isAuthenticated, async (_req: any, res) => {
    try {
      const voting = await checkAmendmentVoting();
      const xls65Active = voting.xls65?.enabled || false;
      const xls66Active = voting.xls66?.enabled || false;
      res.json({
        xls65Active,
        xls66Active,
        vaultsLive: xls65Active || XLS66_LIVE,
        lendingLive: xls66Active || XLS66_LIVE,
        featureEnabled: xls65Active || xls66Active || XLS66_LIVE,
        rippled_minimum: "3.1.0",
        voting: {
          xls65: voting.xls65 ? {
            name: voting.xls65.name,
            enabled: voting.xls65.enabled,
            count: voting.xls65.count,
            threshold: voting.xls65.threshold,
            validatorCount: voting.xls65.validatorCount,
            percentage: voting.xls65.percentage,
          } : null,
          xls66: voting.xls66 ? {
            name: voting.xls66.name,
            enabled: voting.xls66.enabled,
            count: voting.xls66.count,
            threshold: voting.xls66.threshold,
            validatorCount: voting.xls66.validatorCount,
            percentage: voting.xls66.percentage,
          } : null,
          lastChecked: voting.checkedAt ? new Date(voting.checkedAt).toISOString() : null,
          lastSuccessAt: voting.lastSuccessAt ? new Date(voting.lastSuccessAt).toISOString() : null,
          stale: voting.stale,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check XLS-66 status" });
    }
  });

  app.get("/api/xls66/vaults", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (!limits.xls66Lending) {
        return res.status(403).json({ message: "XLS-66 Lending requires Pro tier", requiredTier: "pro" });
      }
      const amendments = await checkAmendmentStatus();
      const vaultsLive = amendments.xls65 || XLS66_LIVE;
      let onLedgerVaults: any[] = [];
      if (vaultsLive) {
        onLedgerVaults = await discoverOnLedgerVaults();
      }
      const dbVaults = await storage.getXls66Vaults("active");
      res.json({
        onLedgerVaults,
        registeredVaults: dbVaults,
        vaultsLive,
        lendingLive: amendments.xls66 || XLS66_LIVE,
        disclaimer: "CryptoOwnBank does not endorse, audit, or guarantee any vault. All data shown is sourced directly from the XRP Ledger. You are responsible for evaluating vault operators. Never deposit more than you can afford to lose.",
      });
    } catch (error) {
      console.error("XLS-66 vaults error:", error);
      res.status(500).json({ message: "Failed to fetch vaults" });
    }
  });

  app.get("/api/xls66/positions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (!limits.xls66Lending) {
        return res.status(403).json({ message: "XLS-66 Lending requires Pro tier", requiredTier: "pro" });
      }
      const positions = await storage.getXls66PositionsByUser(userId);
      res.json({ positions });
    } catch (error) {
      console.error("XLS-66 positions error:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.post("/api/xls66/positions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (!limits.xls66Lending) {
        return res.status(403).json({ message: "XLS-66 Lending requires Pro tier", requiredTier: "pro" });
      }
      if (!XLS66_LIVE) {
        return res.status(400).json({ message: "XLS-66 amendment is not yet active on XRPL" });
      }
      const { vaultId, walletAddress, depositAmount, depositTxHash, sharesHeld } = req.body;
      if (!vaultId || !walletAddress || !depositAmount) {
        return res.status(400).json({ message: "vaultId, walletAddress, and depositAmount are required" });
      }
      const position = await storage.createXls66Position({
        userId,
        vaultId,
        walletAddress,
        depositAmount,
        sharesHeld: sharesHeld || "0",
        depositTxHash: depositTxHash || null,
        status: "active",
      });
      res.json({ position });
    } catch (error) {
      console.error("XLS-66 create position error:", error);
      res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.patch("/api/xls66/positions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const position = await storage.getXls66Position(req.params.id);
      if (!position || position.userId !== userId) {
        return res.status(404).json({ message: "Position not found" });
      }
      const updated = await storage.updateXls66Position(req.params.id, req.body);
      res.json({ position: updated });
    } catch (error) {
      console.error("XLS-66 update position error:", error);
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.post("/api/xls66/positions/:id/auto-reinvest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const position = await storage.getXls66Position(req.params.id);
      if (!position || position.userId !== userId) {
        return res.status(404).json({ message: "Position not found" });
      }
      const updated = await storage.updateXls66Position(req.params.id, {
        autoReinvest: req.body.enabled === true,
      });
      res.json({ position: updated });
    } catch (error) {
      console.error("XLS-66 auto-reinvest error:", error);
      res.status(500).json({ message: "Failed to toggle auto-reinvest" });
    }
  });

  app.get("/api/xls66/loans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (!limits.xls66Lending) {
        return res.status(403).json({ message: "XLS-66 Lending requires Pro tier", requiredTier: "pro" });
      }
      const loans = await storage.getXls66LoanOffersByUser(userId);
      res.json({ loans, amendmentActive: XLS66_LIVE });
    } catch (error) {
      console.error("XLS-66 loans error:", error);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.post("/api/xls66/loans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (!limits.xls66Lending) {
        return res.status(403).json({ message: "XLS-66 Lending requires Pro tier", requiredTier: "pro" });
      }
      if (!XLS66_LIVE) {
        return res.status(400).json({ message: "XLS-66 amendment is not yet active on XRPL" });
      }
      const { walletAddress, loanType, collateralAsset, collateralAmount, borrowAsset, borrowAmount, interestRateBps, termDays, ltvRatio, liquidationThreshold, onLedgerTxHash } = req.body;
      if (!walletAddress || !loanType || !collateralAsset || !collateralAmount || !borrowAsset || !borrowAmount || !interestRateBps || !termDays) {
        return res.status(400).json({ message: "Missing required loan fields" });
      }
      const loan = await storage.createXls66LoanOffer({
        userId,
        walletAddress,
        loanType,
        collateralAsset,
        collateralAmount,
        borrowAsset,
        borrowAmount,
        interestRateBps,
        termDays,
        ltvRatio: ltvRatio || null,
        liquidationThreshold: liquidationThreshold || null,
        onLedgerTxHash: onLedgerTxHash || null,
        status: "active",
      });
      res.json({ loan });
    } catch (error) {
      console.error("XLS-66 create loan error:", error);
      res.status(500).json({ message: "Failed to create loan" });
    }
  });

  app.post("/api/xls66/calculate-yield", isAuthenticated, async (req: any, res) => {
    try {
      const { amount, aprBps, days, compounding } = req.body;
      if (!amount || !aprBps || !days) {
        return res.status(400).json({ message: "amount, aprBps, and days are required" });
      }
      const principal = parseFloat(amount);
      const apr = aprBps / 10000;
      const daysNum = parseInt(days);
      let finalAmount: number;
      let yieldEarned: number;
      if (compounding === "daily") {
        const dailyRate = apr / 365;
        finalAmount = principal * Math.pow(1 + dailyRate, daysNum);
      } else if (compounding === "weekly") {
        const weeklyRate = apr / 52;
        const weeks = daysNum / 7;
        finalAmount = principal * Math.pow(1 + weeklyRate, weeks);
      } else if (compounding === "monthly") {
        const monthlyRate = apr / 12;
        const months = daysNum / 30;
        finalAmount = principal * Math.pow(1 + monthlyRate, months);
      } else {
        finalAmount = principal * (1 + apr * (daysNum / 365));
      }
      yieldEarned = finalAmount - principal;
      const effectiveApy = compounding && compounding !== "none"
        ? (Math.pow(1 + apr / (compounding === "daily" ? 365 : compounding === "weekly" ? 52 : 12), compounding === "daily" ? 365 : compounding === "weekly" ? 52 : 12) - 1) * 100
        : apr * 100;
      res.json({
        principal,
        finalAmount: parseFloat(finalAmount.toFixed(6)),
        yieldEarned: parseFloat(yieldEarned.toFixed(6)),
        apr: apr * 100,
        effectiveApy: parseFloat(effectiveApy.toFixed(4)),
        days: daysNum,
        compounding: compounding || "none",
      });
    } catch (error) {
      console.error("Yield calculator error:", error);
      res.status(500).json({ message: "Failed to calculate yield" });
    }
  });

  app.post("/api/xls66/trustline", isAuthenticated, async (req: any, res) => {
    try {
      if (!xummSdk) {
        return res.status(500).json({ message: "Xumm SDK not configured" });
      }
      const { currency, issuer, limit } = req.body;
      if (!currency || !issuer) {
        return res.status(400).json({ message: "currency and issuer are required" });
      }
      const payload = await xummSdk.payload.create({
        txjson: {
          TransactionType: "TrustSet",
          LimitAmount: {
            currency,
            issuer,
            value: limit || "1000000000",
          },
        },
      } as any, true);
      if (!payload) {
        return res.status(500).json({ message: "Failed to create trustline payload" });
      }
      res.json({
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
      });
    } catch (error: any) {
      console.error("XLS-66 trustline error:", error?.message);
      res.status(500).json({ message: error.message || "Failed to create trustline" });
    }
  });

  app.post("/api/xls66/vault-deposit", isAuthenticated, async (req: any, res) => {
    try {
      if (!xummSdk) {
        return res.status(500).json({ message: "Xumm SDK not configured" });
      }
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (!limits.xls66Lending) {
        return res.status(403).json({ message: "XLS-66 Lending requires Pro tier", requiredTier: "pro" });
      }
      if (!XLS66_LIVE) {
        return res.status(400).json({ message: "XLS-66 amendment is not yet active. Deposits will be enabled once the amendment activates on XRPL mainnet." });
      }
      const { vaultId, amount, asset } = req.body;
      if (!vaultId || !amount) {
        return res.status(400).json({ message: "vaultId and amount are required" });
      }
      const txJson: any = {
        TransactionType: "VaultDeposit",
        VaultID: vaultId,
        Amount: asset && asset !== "XRP"
          ? { currency: asset, value: amount, issuer: req.body.issuer || "" }
          : (parseFloat(amount) * 1000000).toString(),
      };
      const payload = await xummSdk.payload.create({ txjson: txJson } as any, true);
      if (!payload) {
        return res.status(500).json({ message: "Failed to create deposit payload" });
      }
      res.json({
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
      });
    } catch (error: any) {
      console.error("XLS-66 vault deposit error:", error?.message);
      res.status(500).json({ message: error.message || "Failed to create deposit transaction" });
    }
  });

  app.post("/api/xls66/vault-withdraw", isAuthenticated, async (req: any, res) => {
    try {
      if (!xummSdk) {
        return res.status(500).json({ message: "Xumm SDK not configured" });
      }
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (!limits.xls66Lending) {
        return res.status(403).json({ message: "XLS-66 Lending requires Pro tier", requiredTier: "pro" });
      }
      if (!XLS66_LIVE) {
        return res.status(400).json({ message: "XLS-66 amendment is not yet active" });
      }
      const { vaultId, shares } = req.body;
      if (!vaultId || !shares) {
        return res.status(400).json({ message: "vaultId and shares are required" });
      }
      const txJson: any = {
        TransactionType: "VaultWithdraw",
        VaultID: vaultId,
        SharesOut: shares,
      };
      const payload = await xummSdk.payload.create({ txjson: txJson } as any, true);
      if (!payload) {
        return res.status(500).json({ message: "Failed to create withdraw payload" });
      }
      res.json({
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
      });
    } catch (error: any) {
      console.error("XLS-66 vault withdraw error:", error?.message);
      res.status(500).json({ message: error.message || "Failed to create withdraw transaction" });
    }
  });

  app.get("/api/xls66/admin/blocklist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select({ email: users.email, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const blocklist = await storage.getXls66VaultBlocklist();
      res.json({ blocklist });
    } catch (error) {
      console.error("XLS-66 blocklist fetch error:", error);
      res.status(500).json({ message: "Failed to fetch blocklist" });
    }
  });

  app.post("/api/xls66/admin/blocklist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select({ email: users.email, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { vaultId, reason } = req.body;
      if (!vaultId) {
        return res.status(400).json({ message: "vaultId is required" });
      }
      const entry = await storage.addToXls66VaultBlocklist(vaultId, reason || "Blocked by admin", user.email || userId);
      discoveredVaultsCache = [];
      lastVaultDiscovery = 0;
      res.json({ success: true, entry });
    } catch (error) {
      console.error("XLS-66 blocklist add error:", error);
      res.status(500).json({ message: "Failed to add to blocklist" });
    }
  });

  app.delete("/api/xls66/admin/blocklist/:vaultId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select({ email: users.email, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
      if (!user?.isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase())) {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.removeFromXls66VaultBlocklist(req.params.vaultId);
      discoveredVaultsCache = [];
      lastVaultDiscovery = 0;
      res.json({ success: true });
    } catch (error) {
      console.error("XLS-66 blocklist remove error:", error);
      res.status(500).json({ message: "Failed to remove from blocklist" });
    }
  });

  app.get("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getPriceAlertsByUser(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Get alerts error:", error);
      res.status(500).json({ message: "Failed to load alerts" });
    }
  });

  app.post("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { asset, targetPrice, direction, isActive } = req.body;

      if (!asset || !targetPrice || !direction) {
        return res.status(400).json({ message: "Missing required fields: asset, targetPrice, direction" });
      }

      if (!["above", "below"].includes(direction)) {
        return res.status(400).json({ message: "Direction must be 'above' or 'below'" });
      }

      const supportedAssets = Object.keys(COINGECKO_ASSET_MAP);
      if (!supportedAssets.includes(asset.toUpperCase())) {
        return res.status(400).json({
          message: `Unsupported asset. Supported: ${supportedAssets.join(", ")}`,
        });
      }

      if (isNaN(parseFloat(targetPrice)) || parseFloat(targetPrice) <= 0) {
        return res.status(400).json({ message: "Target price must be a positive number" });
      }

      const { tier: alertTier } = await getEffectiveTier(userId);
      const activeCount = await storage.countActiveAlertsByUser(userId);

      if (alertTier === "free" && activeCount >= 1) {
        return res.status(403).json({
          message: "Free users can have 1 active alert. Upgrade to Premium for unlimited alerts.",
          limit: 1,
          current: activeCount,
        });
      }

      const alert = await storage.createPriceAlert({
        userId,
        asset: asset.toUpperCase(),
        targetPrice: targetPrice.toString(),
        direction,
        isActive: isActive !== undefined ? isActive : true,
      });

      res.json(alert);
    } catch (error) {
      console.error("Create alert error:", error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  app.delete("/api/alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }

      const alert = await storage.getPriceAlert(id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      if (alert.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this alert" });
      }

      await storage.deletePriceAlert(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete alert error:", error);
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  const { getWalletBalances: fetchChainBalances, CHAIN_CONFIG } = await import("./services/blockchain-balance");

  let priceCache: { prices: Record<string, number>; fetchedAt: number } = { prices: {}, fetchedAt: 0 };
  const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

  const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;
  const userLastAutoSync = new Map<string, number>();
  const userSyncInProgress = new Set<string>();
  const EXCHANGE_LABELS_SET = new Set(["CRYPTO.COM", "COINBASE", "BINANCE", "KRAKEN", "GEMINI", "KUCOIN", "BITSTAMP", "BITFINEX", "UPHOLD", "GATE.IO", "OKX", "BYBIT", "HUOBI", "BITGET", "MEXC"]);
  const SYNCABLE_CHAINS = new Set(["ethereum", "bitcoin", "xrp"]);

  async function backgroundWalletSync(userId: string) {
    if (userSyncInProgress.has(userId)) return;
    userSyncInProgress.add(userId);
    try {
      const userWallets = await storage.getWalletsByUser(userId);
      const syncableWallets = userWallets.filter(w => {
        if (w.chain === "manual") return false;
        if (EXCHANGE_LABELS_SET.has((w.label || "").toUpperCase().trim())) return false;
        const lastSync = w.lastSyncAt ? new Date(w.lastSyncAt).getTime() : 0;
        return (Date.now() - lastSync) > AUTO_SYNC_INTERVAL_MS;
      });

      if (syncableWallets.length === 0) {
        userLastAutoSync.set(userId, Date.now());
        return;
      }

      console.log(`[auto-sync] Syncing ${syncableWallets.length} wallet(s) for user ${userId.slice(0, 8)}...`);

      for (const wallet of syncableWallets) {
        try {
          const { detectCorrectChain } = await import("./services/blockchain-balance");
          let chain = wallet.chain;
          let balances: any[] = [];

          const detectedChain = detectCorrectChain(chain, wallet.address);
          if (detectedChain) {
            try {
              balances = await fetchChainBalances(detectedChain, wallet.address);
              if (balances.length > 0) chain = detectedChain;
            } catch {}
          }
          if (balances.length === 0) {
            try {
              balances = await fetchChainBalances(wallet.chain as any, wallet.address);
            } catch {
              continue;
            }
          }

          const existingBalances = await storage.getWalletBalances(wallet.id);
          const existingMap = new Map(existingBalances.map(b => [b.assetSymbol, b]));

          for (const bal of balances) {
            const existing = existingMap.get(bal.symbol);
            if (existing) {
              await db.update(walletBalances)
                .set({ balance: bal.balance.toString(), usdValue: bal.usdValue.toString(), updatedAt: new Date() })
                .where(eq(walletBalances.id, existing.id));
            } else {
              await storage.createWalletBalance({
                walletId: wallet.id,
                assetSymbol: bal.symbol,
                balance: bal.balance.toString(),
                usdValue: bal.usdValue.toString(),
              });
            }
          }

          await storage.updateWalletSyncTime(wallet.id);

          if (SYNCABLE_CHAINS.has(chain)) {
            try {
              const { getEthTransactions, getBtcTransactions, getXrpTransactions } = await import("./services/blockchain-transactions");
              const { getHistoricalPrice } = await import("./services/historical-prices");

              const blockchainTxs = chain === "ethereum"
                ? await getEthTransactions(wallet.address)
                : chain === "xrp"
                ? await getXrpTransactions(wallet.address)
                : await getBtcTransactions(wallet.address);

              if (blockchainTxs.length > 0) {
                const existingAccounts = await storage.getAccountsByUser(userId);
                let walletAccount = existingAccounts.find(a => a.accountName === `${wallet.label || chain} Wallet` && a.accountType === "wallet");
                if (!walletAccount) {
                  walletAccount = await storage.createAccount({
                    userId,
                    provider: chain,
                    accountName: `${wallet.label || chain} Wallet`,
                    accountType: "wallet",
                  });
                }

                const caseSensitiveChains = new Set(["xrp", "solana", "cardano", "cosmos", "stellar"]);
                const isCaseSensitive = caseSensitiveChains.has(chain);
                const ownAddresses = new Set(
                  userWallets.map(w => isCaseSensitive ? w.address : w.address.toLowerCase())
                );

                const existingTxns = await storage.getTransactionsByUser(userId);
                const existingExternalIds = new Set(
                  existingTxns.filter(t => t.externalId && t.accountId === walletAccount!.id).map(t => t.externalId)
                );

                const uniqueDates = new Map<string, Date>();
                for (const tx of blockchainTxs) {
                  if (!existingExternalIds.has(tx.hash)) {
                    const dayKey = tx.timestamp.toISOString().split("T")[0];
                    if (!uniqueDates.has(dayKey)) uniqueDates.set(dayKey, tx.timestamp);
                  }
                }

                const STABLECOINS_AUTO = new Set(["RLUSD", "USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD", "GUSD"]);
                const MAX_PRICE_LOOKUPS = 60;
                const nativeAssetAuto = chain === "ethereum" ? "ETH" : chain === "xrp" ? "XRP" : "BTC";
                const priceMapSync = new Map<string, number>();

                const uniqueAssetDatesAuto = new Map<string, { asset: string; date: Date }>();
                for (const tx of blockchainTxs) {
                  if (!existingExternalIds.has(tx.hash) && !STABLECOINS_AUTO.has(tx.asset.toUpperCase())) {
                    const key = `${tx.asset}:${tx.timestamp.toISOString().split("T")[0]}`;
                    if (!uniqueAssetDatesAuto.has(key)) uniqueAssetDatesAuto.set(key, { asset: tx.asset, date: tx.timestamp });
                  }
                }

                let lookupCount = 0;
                for (const [key, { asset: txAsset, date }] of uniqueAssetDatesAuto) {
                  if (lookupCount >= MAX_PRICE_LOOKUPS) break;
                  const lookupSymbol = txAsset === nativeAssetAuto || txAsset === "XRP" || txAsset === "ETH" || txAsset === "BTC" ? txAsset : nativeAssetAuto;
                  const price = await getHistoricalPrice(lookupSymbol, date);
                  priceMapSync.set(key, price);
                  lookupCount++;
                  if (lookupCount < uniqueAssetDatesAuto.size) await new Promise(r => setTimeout(r, 2500));
                }

                const walletBals = await storage.getWalletBalances(wallet.id);
                const assetBalanceMap = new Map<string, string>();
                for (const wb of walletBals) assetBalanceMap.set(wb.assetSymbol, wb.id);

                let newTxCount = 0;
                let totalCostBasis = 0;
                let totalQuantityBought = 0;

                for (const tx of blockchainTxs) {
                  if (existingExternalIds.has(tx.hash)) continue;
                  const normalizeAddr = (addr: string) => isCaseSensitive ? addr : addr.toLowerCase();
                  const isOwnTransfer = tx.type === "receive"
                    ? tx.senderAddress && ownAddresses.has(normalizeAddr(tx.senderAddress))
                    : tx.recipientAddress && ownAddresses.has(normalizeAddr(tx.recipientAddress));

                  const dayKey = tx.timestamp.toISOString().split("T")[0];
                  const isStableAuto = STABLECOINS_AUTO.has(tx.asset.toUpperCase());
                  const pricePerUnit = isStableAuto ? 1.0 : (priceMapSync.get(`${tx.asset}:${dayKey}`) || 0);
                  const totalValue = tx.quantity * pricePerUnit;
                  // Classify the transaction. Incoming = buy. Outgoing needs care:
                  // we must never silently invent a taxable "sale". Transfers to the
                  // user's own wallets and known yield vaults are not sales; anything
                  // else outgoing is HELD for the user to label before it can count.
                  const isVaultDeposit = tx.type !== "receive" && isKnownVaultAddress(tx.recipientAddress);
                  let txType: string;
                  let reviewStatus: string | null = null;
                  let txNotes: string;
                  if (tx.type === "receive") {
                    txType = "buy";
                    txNotes = isOwnTransfer
                      ? `Transfer between own wallets (auto-synced)`
                      : `Imported from blockchain (auto-synced)`;
                  } else if (isOwnTransfer) {
                    txType = "transfer";
                    txNotes = `Transfer between own wallets (auto-synced)`;
                  } else if (isVaultDeposit) {
                    txType = "transfer";
                    txNotes = `Vault deposit (auto-synced)`;
                  } else {
                    txType = "sell";
                    reviewStatus = "pending";
                    txNotes = `Outgoing transfer — needs review (auto-synced)`;
                  }

                  const transaction = await storage.createTransaction({
                    userId,
                    accountId: walletAccount!.id,
                    assetSymbol: tx.asset,
                    transactionType: txType,
                    quantity: tx.quantity.toString(),
                    pricePerUnit: pricePerUnit.toFixed(2),
                    totalValue: totalValue.toFixed(2),
                    fee: tx.fee.toString(),
                    transactionDate: tx.timestamp,
                    externalId: tx.hash,
                    reviewStatus,
                    notes: txNotes,
                  });

                  if (txType === "buy" && pricePerUnit > 0) {
                    const wbId = assetBalanceMap.get(tx.asset);
                    await storage.createTaxLot({
                      userId,
                      transactionId: transaction.id,
                      walletBalanceId: wbId || null,
                      assetSymbol: tx.asset,
                      acquiredDate: tx.timestamp,
                      originalQuantity: tx.quantity.toString(),
                      remainingQuantity: tx.quantity.toString(),
                      costBasisPerUnit: pricePerUnit.toFixed(2),
                    });
                    totalCostBasis += totalValue;
                    totalQuantityBought += tx.quantity;
                  }
                  newTxCount++;
                }

                if (totalQuantityBought > 0) {
                  const assetBal = walletBals.find(b => b.assetSymbol === asset);
                  if (assetBal) {
                    const allLots = await storage.getTaxLotsByWalletBalance(userId, assetBal.id);
                    const aggregateCost = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
                    const aggregateQty = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
                    const avgCost = aggregateQty > 0 ? aggregateCost / aggregateQty : 0;
                    await storage.updateWalletBalanceCostData(assetBal.id, avgCost.toFixed(8), aggregateCost.toFixed(2));
                  }
                }

                if (newTxCount > 0) {
                  console.log(`[auto-sync] Imported ${newTxCount} new ${chain} transaction(s) for wallet ${wallet.id}`);
                }
              }
            } catch (txErr: any) {
              console.error(`[auto-sync] Transaction import error for ${chain} wallet ${wallet.id}:`, txErr.message);
            }
          }
        } catch (err: any) {
          console.error(`[auto-sync] Error syncing wallet ${wallet.id}:`, err.message);
        }
      }

      userLastAutoSync.set(userId, Date.now());
      console.log(`[auto-sync] Completed for user ${userId.slice(0, 8)}...`);
    } catch (err: any) {
      console.error(`[auto-sync] Fatal error for user ${userId.slice(0, 8)}:`, err.message);
    } finally {
      userSyncInProgress.delete(userId);
    }
  }

  app.use("/api", (req: any, _res, next) => {
    if (req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const lastSync = userLastAutoSync.get(userId) || 0;
      if (Date.now() - lastSync > AUTO_SYNC_INTERVAL_MS) {
        userLastAutoSync.set(userId, Date.now());
        backgroundWalletSync(userId).catch(err => {
          console.error(`[auto-sync] Background sync failed:`, err.message);
        });
      }
    }
    next();
  });

  app.get("/api/wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWallets = await storage.getWalletsByUser(userId);
      const walletsWithBalances = await Promise.all(
        userWallets.map(async (w) => {
          const balances = await storage.getWalletBalances(w.id);
          return { ...w, balances };
        })
      );

      const stablecoins = new Set(["USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD", "GUSD", "RLUSD"]);
      const allSymbols = new Set<string>();
      const zeroSymbols = new Set<string>();
      for (const w of walletsWithBalances) {
        for (const b of w.balances) {
          const sym = b.assetSymbol;
          if (sym.includes("(staked)")) continue;
          allSymbols.add(sym);
          if (parseFloat(b.usdValue || "0") === 0 && parseFloat(b.balance) > 0 && !stablecoins.has(sym)) {
            zeroSymbols.add(sym);
          }
        }
      }

      if (zeroSymbols.size > 0) {
        try {
          const now = Date.now();
          const cacheExpired = (now - priceCache.fetchedAt) > PRICE_CACHE_TTL_MS;
          const missingFromCache = [...zeroSymbols].filter(s => !priceCache.prices[s]);
          if (cacheExpired || missingFromCache.length > 0) {
            const symbolsToFetch = [...allSymbols].filter(s => !stablecoins.has(s) && !s.includes("(staked)"));
            const freshPrices = await fetchCurrentPrices(symbolsToFetch);
            priceCache = { prices: { ...priceCache.prices, ...freshPrices }, fetchedAt: now };
          }
          for (const w of walletsWithBalances) {
            for (const b of w.balances) {
              const sym = b.assetSymbol;
              const bal = parseFloat(b.balance);
              const usd = parseFloat(b.usdValue || "0");
              if (usd === 0 && bal > 0) {
                if (stablecoins.has(sym)) {
                  b.usdValue = bal.toString();
                } else {
                  const baseSym = sym.replace(" (staked)", "");
                  const price = priceCache.prices[sym] || priceCache.prices[baseSym];
                  if (price) {
                    b.usdValue = (bal * price).toString();
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Wallet re-pricing error:", err);
        }
      }

      res.json(walletsWithBalances);
    } catch (error) {
      console.error("Get wallets error:", error);
      res.status(500).json({ message: "Failed to load wallets" });
    }
  });

  app.get("/api/wallets/chains", (_req: any, res) => {
    res.json(CHAIN_CONFIG);
  });

  app.post("/api/wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const { tier: walletTier } = await getEffectiveTier(userId);
      if (walletTier === "free") {
        const existingWallets = await storage.getWalletsByUser(userId);
        if (existingWallets.length >= 1) {
          return res.status(403).json({ message: "Free users can track 1 blockchain address. Upgrade to Premium for unlimited address tracking." });
        }
      }

      const parsed = insertWalletSchema.parse({ ...req.body, userId });

      const existing = await storage.getWalletsByUser(userId);
      const duplicate = existing.find(
        (w) => w.chain === parsed.chain && w.address.toLowerCase() === parsed.address.toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({ message: "This wallet address is already added" });
      }

      const chainPrefixMap: Record<string, string> = { xrp: "XRP", stellar: "XLM" };
      const prefix = chainPrefixMap[parsed.chain] || "";
      if (prefix && parsed.label) {
        const upper = parsed.label.toUpperCase();
        if (!upper.startsWith(`${prefix}_`) && !upper.startsWith(`${prefix} `) && !upper.startsWith(`${prefix}-`)) {
          parsed.label = `${prefix}_${parsed.label}`;
        }
      }
      if (prefix && !parsed.label) {
        const sameChain = existing.filter(w => w.chain === parsed.chain).length;
        parsed.label = sameChain === 0 ? `${prefix}_Wallet` : `${prefix}_Wallet_${sameChain + 1}`;
      }

      const wallet = await storage.createWallet(parsed);

      try {
        const existingUserWallets = await storage.getUserWallets(userId);
        const alreadyExists = existingUserWallets.find(
          (uw) => uw.chain === parsed.chain && uw.address.toLowerCase() === parsed.address.toLowerCase()
        );
        if (!alreadyExists) {
          await storage.createUserWallet({
            userId,
            label: parsed.label || wallet.label || `${parsed.chain.toUpperCase()} Wallet`,
            address: parsed.address,
            chain: parsed.chain,
            purpose: "general",
            isPrimary: existingUserWallets.filter(uw => uw.chain === parsed.chain).length === 0,
          });
        }
      } catch (syncErr: any) {
        console.warn("[wallet-sync] Failed to auto-create user wallet:", syncErr.message);
      }

      // Auto-assign new wallet to legacy plan default beneficiary (if configured)
      try {
        const legacyPlan = await storage.getLegacyPlan(userId);
        if (legacyPlan?.defaultBeneficiaryEmail) {
          const existingAssign = await storage.getLegacyWalletAssignmentByWalletId(legacyPlan.id, wallet.id);
          if (!existingAssign) {
            const beneficiaries = await storage.getLegacyBeneficiaries(legacyPlan.id);
            const defaultBen = beneficiaries.find(b => (b.email || "").toLowerCase() === legacyPlan.defaultBeneficiaryEmail!.toLowerCase());
            if (defaultBen) {
              const assignment = await storage.createLegacyWalletAssignment({
                legacyPlanId: legacyPlan.id,
                walletId: wallet.id,
                walletLabel: wallet.label || `${wallet.chain.toUpperCase()} wallet`,
                walletType: null,
                chain: wallet.chain,
                recoveryMode: "solo",
                thresholdK: null,
                thresholdN: null,
                wishesText: null,
                walletAssetSummary: null,
                autoAssigned: true,
              } as any);
              await storage.updateLegacyBeneficiary(defaultBen.id, { assignmentId: assignment.id } as any);
            }
          }
        }
      } catch (autoErr: any) {
        console.warn("[legacy-auto-assign] Failed:", autoErr.message);
      }

      res.json(wallet);
    } catch (error: any) {
      console.error("Create wallet error:", error);
      res.status(400).json({ message: error.message || "Failed to add wallet" });
    }
  });

  app.post("/api/wallets/sync-to-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolioWallets = await storage.getWalletsByUser(userId);
      const settingsWallets = await storage.getUserWallets(userId);
      let synced = 0;
      for (const pw of portfolioWallets) {
        if (!pw.address || pw.chain === "manual") continue;
        const exists = settingsWallets.find(
          (sw) => sw.chain === pw.chain && sw.address.toLowerCase() === pw.address.toLowerCase()
        );
        if (!exists) {
          await storage.createUserWallet({
            userId,
            label: pw.label || `${pw.chain.toUpperCase()} Wallet`,
            address: pw.address,
            chain: pw.chain,
            purpose: "general",
            isPrimary: settingsWallets.filter(sw => sw.chain === pw.chain).length === 0 && synced === 0,
          });
          synced++;
        }
      }
      res.json({ synced, total: portfolioWallets.filter(w => w.address && w.chain !== "manual").length });
    } catch (error: any) {
      console.error("Wallet sync error:", error);
      res.status(500).json({ message: "Failed to sync wallets" });
    }
  });

  app.post("/api/wallets/manual", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { label, assetSymbol, balance, costPerUnit } = req.body;
      if (!label || !assetSymbol || balance === undefined) {
        return res.status(400).json({ message: "label, assetSymbol, and balance are required" });
      }
      const sym = assetSymbol.toUpperCase().trim();
      const balanceNum = parseFloat(balance);
      if (isNaN(balanceNum) || balanceNum < 0) {
        return res.status(400).json({ message: "Balance must be a non-negative number" });
      }

      const costNum = costPerUnit ? parseFloat(costPerUnit) : 0;

      const existingWallets = await storage.getWalletsByUser(userId);
      let wallet = existingWallets.find(w => w.chain === "manual" && w.label?.toLowerCase() === label.trim().toLowerCase());
      if (!wallet) {
        const address = `manual-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
        wallet = await storage.createWallet({
          userId,
          chain: "manual",
          address,
          label: label.trim(),
        });
      }

      const prices = await db.select().from(priceCacheTable);
      const priceEntry = prices.find(p => p.symbol.toUpperCase() === sym);
      const usdValue = priceEntry ? balanceNum * parseFloat(priceEntry.price) : 0;

      const existingBalances = await storage.getWalletBalances(wallet.id);
      const existingBal = existingBalances.find(b => b.assetSymbol.toUpperCase() === sym);

      let walletBalance;
      if (existingBal) {
        const newBalance = parseFloat(existingBal.balance) + balanceNum;
        const newUsd = priceEntry ? newBalance * parseFloat(priceEntry.price) : parseFloat(existingBal.usdValue || "0") + usdValue;
        const existingCostBasis = parseFloat(existingBal.totalCostBasis || "0");
        const addedCostBasis = costNum > 0 ? balanceNum * costNum : 0;
        const newCostBasis = existingCostBasis + addedCostBasis;
        const newAvgCost = newBalance > 0 ? newCostBasis / newBalance : 0;
        await db.update(walletBalances)
          .set({
            balance: newBalance.toString(),
            usdValue: newUsd.toFixed(2),
            totalCostBasis: newCostBasis.toFixed(2),
            averageCost: newAvgCost.toFixed(8),
            updatedAt: new Date(),
          })
          .where(eq(walletBalances.id, existingBal.id));
        walletBalance = { ...existingBal, balance: newBalance.toString(), usdValue: newUsd.toFixed(2) };
      } else {
        const totalCostBasis = costNum > 0 ? (balanceNum * costNum) : 0;
        walletBalance = await storage.upsertWalletBalance({
          walletId: wallet.id,
          userId,
          assetSymbol: sym,
          balance: balanceNum.toString(),
          usdValue: usdValue.toFixed(2),
        });
        if (costNum > 0) {
          await storage.updateWalletBalanceCostData(walletBalance.id, costNum.toFixed(8), (balanceNum * costNum).toFixed(2));
        }
      }

      if (costNum > 0 && balanceNum > 0) {
        await storage.createTaxLot({
          userId,
          walletBalanceId: walletBalance.id,
          assetSymbol: sym,
          acquiredDate: new Date(),
          originalQuantity: balanceNum.toString(),
          remainingQuantity: balanceNum.toString(),
          costBasisPerUnit: costNum.toFixed(8),
          acquisitionType: "purchase",
          note: `Manual entry — ${label.trim()}`,
        });
      }

      try {
        const allUserLots = await storage.getTaxLotsByUser(userId);
        const unassigned = allUserLots.filter(l =>
          l.assetSymbol.toUpperCase() === sym &&
          !l.walletBalanceId &&
          parseFloat(l.remainingQuantity) > 0
        );
        if (unassigned.length > 0) {
          let assigned = 0;
          for (const lot of unassigned) {
            await storage.updateTaxLot(lot.id, { walletBalanceId: walletBalance.id });
            assigned++;
          }
          if (assigned > 0) {
            const wbLots = await storage.getTaxLotsByWalletBalance(userId, walletBalance.id);
            const tc = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
            const tq = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
            const avg = tq > 0 ? tc / tq : 0;
            await storage.updateWalletBalanceCostData(walletBalance.id, avg.toFixed(8), tc.toFixed(2));
            if (tq > parseFloat(walletBalance.balance || "0")) {
              const freshPrices = await db.select().from(priceCacheTable);
              const pe = freshPrices.find(p => p.symbol.toUpperCase() === sym);
              const newUsd = pe ? tq * parseFloat(pe.price) : 0;
              await db.update(walletBalances)
                .set({ balance: tq.toFixed(8), usdValue: newUsd.toFixed(2), updatedAt: new Date() })
                .where(eq(walletBalances.id, walletBalance.id));
              walletBalance = { ...walletBalance, balance: tq.toFixed(8), usdValue: newUsd.toFixed(2) };
            }
            console.log(`[manual-auto-assign] Assigned ${assigned} unassigned ${sym} lots to manual wallet ${label}`);
          }
        }
      } catch (autoErr) {
        console.error("[manual-auto-assign] Failed:", autoErr);
      }

      await storage.updateWalletSyncTime(wallet.id);
      res.json({ wallet, balance: walletBalance });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Create manual wallet error:", errMsg, error);
      res.status(500).json({ message: `Failed to create manual wallet entry: ${errMsg}` });
    }
  });

  app.patch("/api/wallets/:walletId/balances/:balanceId/manual", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(req.params.walletId);
      if (!wallet || wallet.userId !== userId || wallet.chain !== "manual") {
        return res.status(404).json({ message: "Manual wallet not found" });
      }
      const { balance } = req.body;
      if (balance === undefined) {
        return res.status(400).json({ message: "balance is required" });
      }
      const balanceNum = parseFloat(balance);
      if (isNaN(balanceNum) || balanceNum < 0) {
        return res.status(400).json({ message: "Balance must be a non-negative number" });
      }

      const allBalances = await storage.getWalletBalances(wallet.id);
      const wb = allBalances.find(b => b.id === req.params.balanceId);
      if (!wb) {
        return res.status(404).json({ message: "Wallet balance not found" });
      }

      const prices = await storage.getCachedPrices();
      const priceEntry = prices.find(p => p.symbol.toUpperCase() === wb.assetSymbol.toUpperCase());
      const usdValue = priceEntry ? balanceNum * parseFloat(priceEntry.price) : 0;

      await db.update(walletBalances)
        .set({ balance: balanceNum.toString(), usdValue: usdValue.toFixed(2), updatedAt: new Date() })
        .where(eq(walletBalances.id, wb.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Update manual balance error:", error);
      res.status(500).json({ message: "Failed to update balance" });
    }
  });

  const SYNC_COOLDOWN_MS = 2 * 60 * 1000;

  app.post("/api/wallets/:id/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const force = req.body?.force === true;
      if (!force && wallet.lastSyncAt) {
        const lastSync = new Date(wallet.lastSyncAt).getTime();
        const elapsed = Date.now() - lastSync;
        if (elapsed < SYNC_COOLDOWN_MS) {
          const existingBalances = await storage.getWalletBalances(wallet.id);
          console.log(`Sync skipped for ${wallet.chain} wallet ${wallet.id} — synced ${Math.round(elapsed / 1000)}s ago (cooldown ${SYNC_COOLDOWN_MS / 1000}s)`);
          return res.json({ ...wallet, balances: existingBalances, skipped: true, newTransactions: 0 });
        }
      }

      if (wallet.chain === "manual") {
        const existingBalances = await storage.getWalletBalances(wallet.id);
        await storage.updateWalletSyncTime(wallet.id);
        const updatedWallet = await storage.getWallet(wallet.id);
        return res.json({ ...updatedWallet, balances: existingBalances, skipped: true, newTransactions: 0, manual: true });
      }

      const EXCHANGE_LABELS = new Set(["CRYPTO.COM", "COINBASE", "BINANCE", "KRAKEN", "GEMINI", "KUCOIN", "BITSTAMP", "BITFINEX", "UPHOLD", "GATE.IO", "OKX", "BYBIT", "HUOBI", "BITGET", "MEXC"]);
      const walletLabel = (wallet.label || "").toUpperCase().trim();
      const isExchangeDeposit = EXCHANGE_LABELS.has(walletLabel);

      let chain = wallet.chain as any;
      let balances: Awaited<ReturnType<typeof fetchChainBalances>> = [];
      let fetchError = false;
      let correctedChain: string | null = null;

      if (isExchangeDeposit) {
        console.log(`Sync: skipping on-chain balance for "${wallet.label}" deposit address ${wallet.address.slice(0, 12)}... — use API key integration to track exchange holdings`);
        const existingBalances = await storage.getWalletBalances(wallet.id);
        if (existingBalances.length > 0) {
          for (const existing of existingBalances) {
            await db.delete(walletBalances).where(eq(walletBalances.id, existing.id));
          }
          console.log(`Cleared ${existingBalances.length} stale balance record(s) from exchange deposit address`);
        }
        await storage.updateWalletSyncTime(wallet.id);
        const updatedWallet = await storage.getWallet(wallet.id);
        return res.json({ ...updatedWallet, balances: [], newTransactions: 0, exchangeDeposit: true });
      }

      const { detectCorrectChain } = await import("./services/blockchain-balance");
      const detectedChain = detectCorrectChain(chain, wallet.address);
      if (detectedChain) {
        console.log(`Auto-detect: wallet ${wallet.id} stored as "${chain}" but address matches "${detectedChain}" — querying correct chain`);
        try {
          balances = await fetchChainBalances(detectedChain, wallet.address);
          if (balances.length > 0) {
            correctedChain = detectedChain;
            chain = detectedChain;
            const { wallets: walletsTable } = await import("@shared/schema");
            await db.update(walletsTable).set({ chain: detectedChain }).where(eq(walletsTable.id, wallet.id));
            console.log(`Auto-corrected wallet ${wallet.id} chain from "${wallet.chain}" to "${detectedChain}"`);
          }
        } catch (err) {
          console.error(`Auto-detect fetch error for ${detectedChain} wallet ${wallet.id}:`, err);
        }
      }

      if (balances.length === 0) {
        try {
          balances = await fetchChainBalances(wallet.chain as any, wallet.address);
        } catch (err) {
          console.error(`Sync fetch error for ${wallet.chain} wallet ${wallet.id}:`, err);
          fetchError = true;
        }
      }

      if (fetchError) {
        console.log(`Sync: keeping existing balances for ${chain} wallet ${wallet.id} (fetch error, preserving cached data)`);
        await storage.updateWalletSyncTime(wallet.id);
      } else if (balances.length === 0) {
        const existingBalances = await storage.getWalletBalances(wallet.id);
        if (existingBalances.length > 0) {
          console.log(`Sync: clearing ${existingBalances.length} stale balance(s) for ${chain} wallet ${wallet.id} (API returned 0 results)`);
          for (const existing of existingBalances) {
            await db.delete(walletBalances).where(eq(walletBalances.id, existing.id));
          }
        }
        await storage.updateWalletSyncTime(wallet.id);
      } else {
        const existingBalances = await storage.getWalletBalances(wallet.id);
        const activeSymbols = new Set(balances.map(b => b.symbol));

        for (const existing of existingBalances) {
          if (!activeSymbols.has(existing.assetSymbol)) {
            await db.delete(walletBalances).where(eq(walletBalances.id, existing.id));
          }
        }

        for (const bal of balances) {
          await storage.upsertWalletBalance({
            walletId: wallet.id,
            userId,
            assetSymbol: bal.symbol,
            balance: bal.balance.toString(),
            usdValue: bal.usdValue.toString(),
          });
        }

        await storage.updateWalletSyncTime(wallet.id);
      }

      let newTransactions = 0;

      if (chain === "ethereum" || chain === "bitcoin" || chain === "xrp") {
        try {
          const { getEthTransactions, getBtcTransactions, getXrpTransactions } = await import("./services/blockchain-transactions");
          const { getHistoricalPrice } = await import("./services/historical-prices");

          const blockchainTxs = chain === "ethereum"
            ? await getEthTransactions(wallet.address)
            : chain === "xrp"
            ? await getXrpTransactions(wallet.address)
            : await getBtcTransactions(wallet.address);

          const chainName = chain === "ethereum" ? "Ethereum" : chain === "xrp" ? "XRP Ledger" : "Bitcoin";

          if (blockchainTxs.length > 0) {
            const existingAccounts = await storage.getAccountsByUser(userId);
            let walletAccount = existingAccounts.find(a => a.accountName === `${wallet.label || chain} Wallet` && a.accountType === "wallet");
            if (!walletAccount) {
              walletAccount = await storage.createAccount({
                userId,
                provider: chain,
                accountName: `${wallet.label || chain} Wallet`,
                accountType: "wallet",
              });
            }

            const userWallets = await storage.getWalletsByUser(userId);
            const caseSensitiveChains = new Set(["xrp", "solana", "cardano", "cosmos", "stellar"]);
            const isCaseSensitive = caseSensitiveChains.has(chain);
            const ownAddresses = new Set(
              userWallets.map(w => isCaseSensitive ? w.address : w.address.toLowerCase())
            );

            const existingTxns = await storage.getTransactionsByUser(userId);
            const existingExternalIds = new Set(
              existingTxns.filter(t => t.externalId && t.accountId === walletAccount!.id).map(t => t.externalId)
            );

            const uniqueDates = new Map<string, Date>();
            for (const tx of blockchainTxs) {
              if (!existingExternalIds.has(tx.hash)) {
                const dayKey = tx.timestamp.toISOString().split("T")[0];
                if (!uniqueDates.has(dayKey)) uniqueDates.set(dayKey, tx.timestamp);
              }
            }

            const STABLECOINS_SET = new Set(["RLUSD", "USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD", "GUSD"]);
            const MAX_PRICE_LOOKUPS = 60;
            const priceMapByAssetDay = new Map<string, number>();
            const nativeAsset = chain === "ethereum" ? "ETH" : chain === "xrp" ? "XRP" : "BTC";

            const uniqueAssetDates = new Map<string, { asset: string; date: Date }>();
            for (const tx of blockchainTxs) {
              if (!existingExternalIds.has(tx.hash) && !STABLECOINS_SET.has(tx.asset.toUpperCase())) {
                const key = `${tx.asset}:${tx.timestamp.toISOString().split("T")[0]}`;
                if (!uniqueAssetDates.has(key)) uniqueAssetDates.set(key, { asset: tx.asset, date: tx.timestamp });
              }
            }

            let lookupCount = 0;
            for (const [key, { asset: txAsset, date }] of uniqueAssetDates) {
              if (lookupCount >= MAX_PRICE_LOOKUPS) {
                console.warn(`Capping price lookups at ${MAX_PRICE_LOOKUPS} for wallet ${wallet.id}`);
                break;
              }
              let price = await getHistoricalPrice(txAsset, date);
              if (price === 0 && txAsset !== nativeAsset) {
                price = await getHistoricalPrice(nativeAsset, date);
              }
              priceMapByAssetDay.set(key, price);
              lookupCount++;
              if (lookupCount < uniqueAssetDates.size) await new Promise(r => setTimeout(r, 2500));
            }

            let totalCostBasis = 0;
            let totalQuantityBought = 0;

            const walletBals = await storage.getWalletBalances(wallet.id);
            const assetBalanceMap = new Map<string, string>();
            for (const wb of walletBals) {
              assetBalanceMap.set(wb.assetSymbol, wb.id);
            }

            for (const tx of blockchainTxs) {
              if (existingExternalIds.has(tx.hash)) continue;

              const normalizeAddr = (addr: string) => isCaseSensitive ? addr : addr.toLowerCase();
              const isOwnTransfer = tx.type === "receive"
                ? tx.senderAddress && ownAddresses.has(normalizeAddr(tx.senderAddress))
                : tx.recipientAddress && ownAddresses.has(normalizeAddr(tx.recipientAddress));

              const dayKey = tx.timestamp.toISOString().split("T")[0];
              const isStable = STABLECOINS_SET.has(tx.asset.toUpperCase());
              const pricePerUnit = isStable ? 1.0 : (priceMapByAssetDay.get(`${tx.asset}:${dayKey}`) || 0);
              const totalValue = tx.quantity * pricePerUnit;
              // Classify the transaction. Incoming = buy. Outgoing is never silently
              // treated as a taxable "sale": own-wallet and known-vault transfers are
              // non-taxable; anything else outgoing is HELD for the user to label.
              const isVaultDeposit = tx.type !== "receive" && isKnownVaultAddress(tx.recipientAddress);
              let txType: string;
              let reviewStatus: string | null = null;
              let txNotes: string;
              if (tx.type === "receive") {
                txType = "buy";
                txNotes = isOwnTransfer
                  ? `Transfer between own wallets (${chainName})`
                  : `Imported from ${chainName} blockchain`;
              } else if (isOwnTransfer) {
                txType = "transfer";
                txNotes = `Transfer between own wallets (${chainName})`;
              } else if (isVaultDeposit) {
                txType = "transfer";
                txNotes = `Vault deposit (${chainName})`;
              } else {
                txType = "sell";
                reviewStatus = "pending";
                txNotes = `Outgoing transfer — needs review (${chainName})`;
              }

              const transaction = await storage.createTransaction({
                userId,
                accountId: walletAccount!.id,
                assetSymbol: tx.asset,
                transactionType: txType,
                quantity: tx.quantity.toString(),
                pricePerUnit: pricePerUnit.toFixed(2),
                totalValue: totalValue.toFixed(2),
                fee: tx.fee.toString(),
                transactionDate: tx.timestamp,
                externalId: tx.hash,
                reviewStatus,
                notes: txNotes,
              });

              if (txType === "buy" && pricePerUnit > 0) {
                const wbId = assetBalanceMap.get(tx.asset);
                await storage.createTaxLot({
                  userId,
                  transactionId: transaction.id,
                  walletBalanceId: wbId || null,
                  assetSymbol: tx.asset,
                  acquiredDate: tx.timestamp,
                  originalQuantity: tx.quantity.toString(),
                  remainingQuantity: tx.quantity.toString(),
                  costBasisPerUnit: pricePerUnit.toFixed(2),
                });
                totalCostBasis += totalValue;
                totalQuantityBought += tx.quantity;
              }

              newTransactions++;
            }

            if (totalQuantityBought > 0) {
              const assetBal = walletBals.find(b => b.assetSymbol === asset);
              if (assetBal) {
                const allLots = await storage.getTaxLotsByWalletBalance(userId, assetBal.id);
                const aggregateCost = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
                const aggregateQty = allLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
                const avgCost = aggregateQty > 0 ? aggregateCost / aggregateQty : 0;
                await storage.updateWalletBalanceCostData(
                  assetBal.id,
                  avgCost.toFixed(8),
                  aggregateCost.toFixed(2)
                );
              }
            }

            console.log(`Wallet sync: imported ${newTransactions} new ${chain} transactions for wallet ${wallet.id}`);
          }
        } catch (txError) {
          console.error(`Failed to import ${chain} transactions:`, txError);
        }
      }

      try {
        const syncedBalances = await storage.getWalletBalances(wallet.id);
        for (const wb of syncedBalances) {
          const sym = wb.assetSymbol.toUpperCase();
          const allUserLots = await storage.getTaxLotsByAsset(userId, sym);
          const unassigned = allUserLots.filter(l => !l.walletBalanceId && parseFloat(l.remainingQuantity) > 0);
          if (unassigned.length === 0) continue;
          const assigned = allUserLots.filter(l => l.walletBalanceId === wb.id).reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
          let capacity = Math.max(0, parseFloat(wb.balance) - assigned);
          if (capacity < 0.0001) continue;
          const sorted = [...unassigned].sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());
          let filled = 0;
          for (const lot of sorted) {
            if (filled >= capacity - 0.0001) break;
            const lotQty = parseFloat(lot.remainingQuantity);
            const spaceLeft = capacity - filled;
            if (lotQty <= spaceLeft + 0.0001) {
              await storage.updateTaxLot(lot.id, { walletBalanceId: wb.id });
              filled += lotQty;
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
              });
              await storage.updateTaxLot(lot.id, {
                remainingQuantity: (lotQty - splitQty).toFixed(8),
                originalQuantity: (parseFloat(lot.originalQuantity) - splitQty).toFixed(8),
              });
              filled += splitQty;
              break;
            }
          }
          if (filled > 0) {
            const wbLots = await storage.getTaxLotsByWalletBalance(userId, wb.id);
            const tc = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
            const tq = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
            const avg = tq > 0 ? tc / tq : 0;
            await storage.updateWalletBalanceCostData(wb.id, avg.toFixed(8), tc.toFixed(2));
            console.log(`[sync-auto-assign] Assigned ${filled.toFixed(4)} ${sym} lots to wallet ${wallet.label || wallet.id}`);
          }
        }
      } catch (autoErr) {
        console.error("[sync-auto-assign] Failed:", autoErr);
      }

      const updatedWallet = await storage.getWallet(wallet.id);
      const updatedBalances = await storage.getWalletBalances(wallet.id);
      res.json({ ...updatedWallet, balances: updatedBalances, newTransactions, correctedChain: correctedChain || undefined });
    } catch (error) {
      console.error("Sync wallet error:", error);
      res.status(500).json({ message: "Failed to sync wallet" });
    }
  });

  registerLegacyRoutes(app);
  await registerDcaRoutes(app);
  app.get("/api/wallets/portfolio", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const balances = await storage.getWalletBalancesByUser(userId);
      const userWallets = await storage.getWalletsByUser(userId);

      const holdings: Record<string, { symbol: string; balance: number; usdValue: number; sources: string[] }> = {};

      for (const bal of balances) {
        const wallet = userWallets.find((w) => w.id === bal.walletId);
        const label = wallet?.label || wallet?.chain || "Wallet";
        const sym = bal.assetSymbol;
        if (!holdings[sym]) {
          holdings[sym] = { symbol: sym, balance: 0, usdValue: 0, sources: [] };
        }
        holdings[sym].balance += parseFloat(bal.balance);
        holdings[sym].usdValue += parseFloat(bal.usdValue || "0");
        if (!holdings[sym].sources.includes(label)) {
          holdings[sym].sources.push(label);
        }
      }

      const stablecoins = new Set(["USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD", "GUSD", "RLUSD"]);
      const allNonStableSymbols = Object.keys(holdings).filter(s => !stablecoins.has(s) && !s.includes("(staked)") && holdings[s].balance > 0);

      try {
        const now = Date.now();
        const cacheExpired = (now - priceCache.fetchedAt) > PRICE_CACHE_TTL_MS;
        const missingFromCache = allNonStableSymbols.filter(s => !priceCache.prices[s]);

        if (cacheExpired || missingFromCache.length > 0) {
          const freshPrices = await fetchCurrentPrices(allNonStableSymbols);
          priceCache = { prices: { ...priceCache.prices, ...freshPrices }, fetchedAt: now };
        }

        for (const sym of allNonStableSymbols) {
          if (priceCache.prices[sym]) {
            holdings[sym].usdValue = holdings[sym].balance * priceCache.prices[sym];
          }
        }

        const stillZero = allNonStableSymbols.filter(s => holdings[s].usdValue === 0);
        if (stillZero.length > 0) {
          const dbPrices = await loadPricesFromDb(stillZero);
          for (const sym of stillZero) {
            if (dbPrices[sym]) {
              holdings[sym].usdValue = holdings[sym].balance * dbPrices[sym];
              priceCache.prices[sym] = dbPrices[sym];
            }
          }
        }

        for (const sym of Object.keys(holdings)) {
          if (stablecoins.has(sym) && holdings[sym].usdValue === 0) {
            holdings[sym].usdValue = holdings[sym].balance;
          }
        }
      } catch (err) {
        console.error("Portfolio re-pricing error:", err);
      }

      const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.usdValue, 0);

      res.json({
        holdings: Object.values(holdings),
        totalValue,
        walletCount: userWallets.length,
      });
    } catch (error) {
      console.error("Wallet portfolio error:", error);
      res.status(500).json({ message: "Failed to load wallet portfolio" });
    }
  });

  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      cb(null, file.mimetype === "text/csv" || file.originalname.endsWith(".csv"));
    },
  });

  app.post("/api/import/yahoo", isAuthenticated, csvUpload.single("file"), async (req: any, res) => {
    req.setTimeout(600000);
    res.setTimeout(600000);
    try {
      const userId = req.user.claims.sub;

      const { tier } = await getEffectiveTier(userId);
      if (tier === "free") {
        return res.status(403).json({ message: "CSV import is a Premium feature. Upgrade to import from Yahoo Finance and other platforms." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const { parse } = await import("csv-parse/sync");
      const csvText = req.file.buffer.toString("utf-8");

      let records: any[];
      try {
        records = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        });
      } catch (parseErr: any) {
        return res.status(400).json({ message: `CSV parse error: ${parseErr.message}` });
      }

      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty or has no valid rows" });
      }

      const headers = Object.keys(records[0]).map((h) => h.toLowerCase().trim());
      const hasYahooFormat = headers.some((h) => h.includes("symbol")) &&
        headers.some((h) => h.includes("quantity") || h.includes("shares"));

      const hasCoinTracker = headers.some((h) => h.includes("received quantity") || h.includes("sent quantity"));
      const hasGenericFormat = headers.some((h) => h.includes("asset") || h.includes("coin") || h.includes("ticker")) &&
        headers.some((h) => h.includes("amount") || h.includes("quantity") || h.includes("qty"));

      const hasLedgerLive = headers.some((h) => h.includes("operation date")) &&
        headers.some((h) => h.includes("currency ticker") || h.includes("currency name")) &&
        headers.some((h) => h.includes("operation type") || h.includes("operation amount"));

      if (!hasYahooFormat && !hasCoinTracker && !hasGenericFormat && !hasLedgerLive) {
        return res.status(400).json({
          message: "Unrecognized CSV format. Supported formats: Ledger Live, Yahoo Finance, CoinTracker, or generic CSV with columns: Symbol/Asset, Quantity, Purchase Price, Trade Date",
          detectedHeaders: Object.keys(records[0]),
        });
      }

      let importProvider = "yahoo_import";
      let importAccountName = "Yahoo Finance Import";
      if (hasLedgerLive) {
        importProvider = "ledger_live_import";
        importAccountName = "Ledger Live Import";
      }

      const existingAccounts = await storage.getAccountsByUser(userId);
      let importAccount = existingAccounts.find((a) => a.provider === importProvider);
      if (!importAccount) {
        importAccount = await storage.createAccount({
          userId,
          credentialId: null,
          provider: importProvider,
          accountName: importAccountName,
          accountType: "import",
        });
      }

      const findCol = (row: any, ...candidates: string[]) => {
        for (const key of Object.keys(row)) {
          const lk = key.toLowerCase().trim();
          for (const c of candidates) {
            if (lk === c || lk.includes(c)) return row[key];
          }
        }
        return null;
      };

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      const seenRows = new Set<string>();

      const existingTxns = await storage.getTransactionsByUser(userId);
      const existingKeys = new Set(
        existingTxns
          .filter((t) => t.notes?.includes("Imported from"))
          .map((t) => `${t.assetSymbol}|${t.quantity}|${new Date(t.transactionDate).toISOString().split("T")[0]}|${t.pricePerUnit}`)
      );

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          let symbol: string | null;
          let quantity: string | null;
          let price: string | null;
          let dateStr: string | null;
          let fee: string | null;
          let totalCost: string | null;
          let txType: string | null;
          let externalHash: string | null = null;

          if (hasLedgerLive) {
            symbol = findCol(row, "currency ticker");
            if (!symbol) {
              const currName = findCol(row, "currency name");
              if (currName) {
                const nameToTicker: Record<string, string> = {
                  "bitcoin": "BTC", "ethereum": "ETH", "xrp": "XRP", "solana": "SOL",
                  "cardano": "ADA", "dogecoin": "DOGE", "litecoin": "LTC", "polkadot": "DOT",
                  "stellar": "XLM", "algorand": "ALGO", "tron": "TRX", "hedera": "HBAR",
                  "avalanche": "AVAX", "polygon": "MATIC", "cosmos": "ATOM", "near": "NEAR",
                  "tezos": "XTZ", "vechain": "VET", "elrond": "EGLD", "filecoin": "FIL",
                  "verge": "XVG",
                };
                symbol = nameToTicker[currName.toLowerCase()] || currName.toUpperCase().slice(0, 10);
              }
            }
            quantity = findCol(row, "operation amount");
            price = findCol(row, "countervalue at operation date");
            dateStr = findCol(row, "operation date");
            fee = findCol(row, "operation fees");
            totalCost = findCol(row, "countervalue at csv export");
            txType = findCol(row, "operation type");
            externalHash = findCol(row, "operation hash");
          } else {
            symbol = findCol(row, "symbol", "ticker", "asset", "coin", "currency name");
            quantity = findCol(row, "quantity", "shares", "amount", "qty", "received quantity");
            price = findCol(row, "purchase price", "cost basis per unit", "price per unit", "price", "cost/unit", "buy price");
            dateStr = findCol(row, "trade date", "date", "purchase date", "acquired date", "transaction date");
            fee = findCol(row, "commission", "fee", "fees");
            totalCost = findCol(row, "cost basis", "total cost", "total", "cost basis total");
            txType = findCol(row, "type", "transaction type", "side", "action");
          }

          if (!symbol) {
            errors.push(`Row ${i + 2}: Missing symbol`);
            skipped++;
            continue;
          }

          symbol = symbol.replace(/-USD$/i, "").replace(/-USDT$/i, "").replace(/\.X$/i, "").toUpperCase().trim();

          if (!symbol || symbol === "" || symbol.length > 10) {
            errors.push(`Row ${i + 2}: Invalid symbol "${symbol}"`);
            skipped++;
            continue;
          }

          let rawQty = parseFloat(String(quantity || "0").replace(/,/g, ""));

          if (hasLedgerLive && txType) {
            const opType = txType.toLowerCase();
            if (opType === "out" || opType === "fees") {
              rawQty = Math.abs(rawQty);
            } else {
              rawQty = Math.abs(rawQty);
            }
          }

          const qty = rawQty;
          if (!qty || qty <= 0 || isNaN(qty)) {
            if (hasLedgerLive && txType && txType.toLowerCase() === "fees") {
              skipped++;
              continue;
            }
            errors.push(`Row ${i + 2}: Invalid quantity for ${symbol}`);
            skipped++;
            continue;
          }

          const dedupeKey = `${symbol}|${qty}|${dateStr || ""}|${price || ""}`;
          if (seenRows.has(dedupeKey)) {
            errors.push(`Row ${i + 2}: Duplicate row in file skipped (${symbol})`);
            skipped++;
            continue;
          }
          seenRows.add(dedupeKey);

          const dbDedupeKey = `${symbol}|${qty}|${dateStr ? new Date(dateStr).toISOString().split("T")[0] : ""}|${price || "0"}`;
          if (existingKeys.has(dbDedupeKey)) {
            errors.push(`Row ${i + 2}: Already imported (${symbol})`);
            skipped++;
            continue;
          }

          let unitPrice = 0;
          if (hasLedgerLive) {
            const counterValue = parseFloat(String(price || "0").replace(/[$,]/g, ""));
            if (counterValue && !isNaN(counterValue) && counterValue > 0 && qty > 0) {
              unitPrice = Math.abs(counterValue) / qty;
            }
            if ((!unitPrice || unitPrice <= 0) && totalCost) {
              const exportValue = parseFloat(String(totalCost).replace(/[$,]/g, ""));
              if (exportValue && !isNaN(exportValue) && exportValue > 0 && qty > 0) {
                unitPrice = Math.abs(exportValue) / qty;
              }
            }
          } else {
            unitPrice = parseFloat(String(price || "0").replace(/[$,]/g, ""));
            if ((!unitPrice || isNaN(unitPrice)) && totalCost) {
              const tc = parseFloat(String(totalCost).replace(/[$,]/g, ""));
              if (tc && !isNaN(tc)) unitPrice = tc / qty;
            }
          }
          if (!unitPrice || isNaN(unitPrice) || unitPrice < 0) unitPrice = 0;

          const feeVal = fee ? parseFloat(String(fee).replace(/[$,]/g, "")) : 0;
          const totalVal = qty * unitPrice;

          let transactionDate = new Date();
          if (dateStr) {
            const parsed = safeServerDate(dateStr);
            if (!isNaN(parsed.getTime())) transactionDate = parsed;
          }

          let transactionType = "buy";
          if (txType) {
            const lt = txType.toLowerCase();
            if (hasLedgerLive) {
              if (lt === "out" || lt === "send") transactionType = "sell";
              else if (lt === "in" || lt === "receive") transactionType = "buy";
              else if (lt === "reward" || lt === "staking") transactionType = "income";
              else if (lt === "fees") {
                skipped++;
                continue;
              }
              else if (lt === "nft_in" || lt === "nft_out" || lt === "approve" || lt === "delegate" || lt === "undelegate") {
                skipped++;
                continue;
              }
            } else {
              if (lt.includes("sell") || lt.includes("sold")) transactionType = "sell";
              else if (lt.includes("income") || lt.includes("interest") || lt.includes("reward") || lt.includes("staking")) transactionType = "income";
            }
          }

          if (hasLedgerLive && externalHash) {
            const existingByHash = existingTxns.find(t => t.externalId === externalHash && t.accountId === importAccount!.id);
            if (existingByHash) {
              skipped++;
              continue;
            }
          }

          const importSource = hasLedgerLive ? "Ledger Live" : "Yahoo Finance";
          const transaction = await storage.createTransaction({
            userId,
            accountId: importAccount.id,
            assetSymbol: symbol,
            transactionType,
            quantity: qty.toString(),
            pricePerUnit: unitPrice.toString(),
            totalValue: totalVal.toFixed(2),
            fee: (feeVal || 0).toFixed(2),
            transactionDate,
            externalId: externalHash || undefined,
            notes: `Imported from ${importSource} CSV (row ${i + 1})`,
          });

          if (transactionType === "buy" || transactionType === "income") {
            const existingPosition = await storage.getPositionByUserAndAsset(userId, importAccount.id, symbol);

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
                accountId: importAccount.id,
                assetSymbol: symbol,
                quantity: qty.toString(),
                averageCost: unitPrice.toString(),
                totalCostBasis: totalVal.toFixed(2),
              });
            }

            await storage.createTaxLot({
              userId,
              transactionId: transaction.id,
              assetSymbol: symbol,
              acquiredDate: transactionDate,
              originalQuantity: qty.toString(),
              remainingQuantity: qty.toString(),
              costBasisPerUnit: unitPrice.toString(),
            });
          } else if (transactionType === "sell") {
            const existingPosition = await storage.getPositionByUserAndAsset(userId, importAccount.id, symbol);
            if (existingPosition) {
              const existingQty = parseFloat(existingPosition.quantity);
              const existingCostBasis = parseFloat(existingPosition.totalCostBasis);
              const newQty = Math.max(0, existingQty - qty);
              const costReduction = existingQty > 0 ? (qty / existingQty) * existingCostBasis : 0;
              const newCostBasis = Math.max(0, existingCostBasis - costReduction);
              const newAvgCost = newQty > 0 ? newCostBasis / newQty : 0;

              await storage.updatePosition(existingPosition.id, {
                quantity: newQty.toString(),
                averageCost: newAvgCost.toString(),
                totalCostBasis: newCostBasis.toString(),
              });
            }

            const taxLots = await storage.getTaxLotsByAsset(userId, symbol);
            let remaining = qty;
            for (const lot of taxLots) {
              if (remaining <= 0) break;
              const lotRemaining = parseFloat(lot.remainingQuantity);
              if (lotRemaining <= 0) continue;
              const used = Math.min(remaining, lotRemaining);
              const newLotRemaining = lotRemaining - used;
              await storage.updateTaxLot(lot.id, {
                remainingQuantity: newLotRemaining.toString(),
              });

              const costBasisPerUnit = parseFloat(lot.costBasisPerUnit);
              const proceeds = used * unitPrice;
              const costBasis = used * costBasisPerUnit;
              const gainLoss = proceeds - costBasis;
              const holdingDays = (transactionDate.getTime() - new Date(lot.acquiredDate).getTime()) / (1000 * 60 * 60 * 24);

              await storage.createGainEvent({
                userId,
                sellTransactionId: transaction.id,
                taxLotId: lot.id,
                assetSymbol: symbol,
                quantity: used.toString(),
                proceeds: proceeds.toFixed(2),
                costBasis: costBasis.toFixed(2),
                gainLoss: gainLoss.toFixed(2),
                isLongTerm: holdingDays >= 365,
                taxMethod: "FIFO",
                soldDate: transactionDate,
                acquiredDate: new Date(lot.acquiredDate),
              });

              remaining -= used;
              if (lot.walletBalanceId) {
                const wbLots = await storage.getTaxLotsByWalletBalance(userId, lot.walletBalanceId);
                const totalRem = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
                const totalCb = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
                const avg = totalRem > 0 ? totalCb / totalRem : 0;
                await storage.updateWalletBalanceCostData(lot.walletBalanceId, avg.toFixed(8), totalCb.toFixed(2));
              }
            }
          }

          imported++;
        } catch (rowErr: any) {
          errors.push(`Row ${i + 2}: ${rowErr.message}`);
          skipped++;
        }
      }

      if (imported > 0) {
        try {
          const allPositions = await storage.getPositionsByUser(userId);
          const uniqueSymbols = [...new Set(allPositions.map(p => p.assetSymbol))];
          const prices = await fetchCurrentPrices(uniqueSymbols);
          let pricesUpdated = 0;
          for (const [symbol, price] of Object.entries(prices)) {
            if (price > 0) {
              const existingAsset = await storage.getAsset(symbol);
              if (existingAsset) {
                await storage.updateAssetPrice(symbol, price.toString());
              } else {
                const cgId = COINGECKO_ASSET_MAP[symbol.toUpperCase()];
                await storage.createAsset({
                  symbol,
                  name: symbol,
                  assetType: "crypto",
                  currentPrice: price.toString(),
                  coingeckoId: cgId || undefined,
                });
              }
              pricesUpdated++;
            }
          }
          console.log(`Updated prices for ${pricesUpdated} assets after CSV import`);
        } catch (priceErr) {
          console.error("Price update after import failed (non-critical):", priceErr);
        }
      }

      res.json({
        imported,
        skipped,
        total: records.length,
        errors: errors.slice(0, 10),
        message: `Successfully imported ${imported} transaction${imported !== 1 ? "s" : ""}${skipped > 0 ? `, skipped ${skipped} row${skipped !== 1 ? "s" : ""}` : ""}`,
      });
    } catch (error: any) {
      console.error("Yahoo import error:", error);
      res.status(500).json({ message: "Failed to import CSV: " + (error.message || "Unknown error") });
    }
  });

  const statementPdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf"));
    },
  });

  app.post("/api/statements/upload", statementPdfUpload.single("file"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      if (!req.file) {
        return res.status(400).json({ message: "Please upload a PDF file" });
      }

      const { parseStatement } = await import("./services/statement-parser");
      const { generateComparisons } = await import("./services/comparison-engine");

      const upload = await storage.createStatementUpload({
        userId,
        filename: req.file.originalname,
        status: "processing",
        tier,
      });

      try {
        const products = await parseStatement(req.file.buffer);

        for (const product of products) {
          await storage.createStatementProduct({
            uploadId: upload.id,
            userId,
            productType: product.productType,
            institutionName: product.institutionName,
            balance: product.balance?.toString() ?? null,
            interestRate: product.interestRate?.toString() ?? null,
            apy: product.apy?.toString() ?? null,
            maturityDate: product.maturityDate ? new Date(product.maturityDate) : null,
            term: product.term,
            isLocked: product.isLocked,
            rawDescription: product.rawDescription,
          });
        }

        await storage.updateStatementUpload(upload.id, {
          status: "complete",
          productCount: products.length,
        });

        const savedProducts = await storage.getProductsByUpload(upload.id);

        const rawInstitution = products[0]?.institutionName || "Unknown Institution";
        const institutionName = rawInstitution.trim();
        const accountLabel = req.body?.accountLabel?.trim() || null;

        const accountTypes = new Set(products.map(p => p.productType));
        const accountType = accountTypes.size === 1
          ? products[0].productType
          : accountTypes.has("brokerage") ? "brokerage" : "banking";

        let source = await storage.findStatementSource(userId, institutionName, accountLabel);
        let isUpdate = false;
        if (source) {
          isUpdate = true;
        } else {
          if (limits.statementUploads !== null) {
            const existingSources = await storage.getStatementSourcesByUser(userId);
            if (existingSources.length >= limits.statementUploads) {
              return res.status(403).json({
                message: "Statement Insights is a Premium feature. Upgrade to Premium for unlimited source institutions and comparison insights.",
              });
            }
          }
          source = await storage.createStatementSource({
            userId,
            institutionName,
            accountLabel,
            accountType,
          });
        }

        const totalValue = products.reduce((sum, p) => sum + (p.balance || 0), 0);

        const PRODUCT_TYPE_LABELS: Record<string, string> = {
          cd: "CD", savings: "Savings", money_market: "Money Market",
          checking: "Checking", bond: "Bond", brokerage: "Brokerage", other: "Account",
        };

        const holdingsData = products.map(p => {
          let label = PRODUCT_TYPE_LABELS[p.productType] || "Account";
          if (p.rawDescription && p.rawDescription.length < 50 && p.rawDescription.length > 0) {
            const clean = p.rawDescription.replace(/\d{4,}/g, "****").trim();
            if (clean.length > 0 && clean.length <= 80) label = clean;
          }
          return {
            productType: p.productType,
            label,
            balance: p.balance?.toString() ?? null,
            interestRate: p.interestRate?.toString() ?? null,
            apy: p.apy?.toString() ?? null,
            maturityDate: p.maturityDate ? new Date(p.maturityDate) : null,
            term: p.term,
            isLocked: p.isLocked,
          };
        });

        const savedHoldings = await storage.replaceStatementHoldings(
          source.id, upload.id, userId, holdingsData
        );

        await storage.updateStatementSource(source.id, {
          lastUploadId: upload.id,
          lastUploadDate: new Date(),
          totalValue: totalValue.toString(),
          holdingCount: savedHoldings.length,
        });

        let comparisons: any[] = [];
        if (limits.statementComparisons) {
          comparisons = savedHoldings.map((h) =>
            generateComparisons({
              productType: h.productType,
              institutionName: source.institutionName,
              balance: h.balance ? parseFloat(h.balance) : null,
              interestRate: h.interestRate ? parseFloat(h.interestRate) : null,
              apy: h.apy ? parseFloat(h.apy) : null,
              maturityDate: h.maturityDate?.toISOString() ?? null,
              term: h.term,
              isLocked: h.isLocked ?? false,
            })
          );
        }

        await storage.deleteStatementUpload(upload.id);

        res.json({
          source,
          holdings: savedHoldings,
          holdingCount: savedHoldings.length,
          isUpdate,
          comparisons: limits.statementComparisons ? comparisons : null,
          comparisonsLocked: !limits.statementComparisons,
        });

      } catch (parseError: any) {
        await storage.updateStatementUpload(upload.id, { status: "failed" });
        console.error("Statement parse error:", parseError?.message || parseError);
        const isEncrypted = parseError?.message?.includes("password") || parseError?.message?.includes("encrypted");
        const msg = isEncrypted
          ? "This PDF appears to be password-protected. Please upload an unencrypted version of your statement."
          : "Could not extract text from this PDF. It may be a scanned image or an unsupported format. Please try a different statement file.";
        res.status(422).json({ message: msg });
      }
    } catch (error) {
      console.error("Statement upload error:", error);
      res.status(500).json({ message: "Failed to process statement" });
    }
  });

  app.get("/api/statement-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sources = await storage.getStatementSourcesByUser(userId);
      const sourcesWithHoldings = await Promise.all(
        sources.map(async (source) => {
          const holdings = await storage.getStatementHoldingsBySource(source.id);
          return { ...source, holdings };
        })
      );
      res.json(sourcesWithHoldings);
    } catch (error) {
      console.error("Get statement sources error:", error);
      res.status(500).json({ message: "Failed to load statement sources" });
    }
  });

  app.get("/api/statement-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const source = await storage.getStatementSource(parseInt(req.params.id));
      if (!source || source.userId !== userId) {
        return res.status(404).json({ message: "Source not found" });
      }
      const holdings = await storage.getStatementHoldingsBySource(source.id);

      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      let comparisons: any[] = [];
      if (limits.statementComparisons) {
        const { generateComparisons } = await import("./services/comparison-engine");
        comparisons = holdings.map((h) =>
          generateComparisons({
            productType: h.productType,
            institutionName: source.institutionName,
            balance: h.balance ? parseFloat(h.balance) : null,
            interestRate: h.interestRate ? parseFloat(h.interestRate) : null,
            apy: h.apy ? parseFloat(h.apy) : null,
            maturityDate: h.maturityDate?.toISOString() ?? null,
            term: h.term,
            isLocked: h.isLocked ?? false,
          })
        );
      }

      res.json({
        source,
        holdings,
        comparisons: limits.statementComparisons ? comparisons : null,
        comparisonsLocked: !limits.statementComparisons,
      });
    } catch (error) {
      console.error("Get statement source detail error:", error);
      res.status(500).json({ message: "Failed to load source details" });
    }
  });

  await registerMarketRoutes(app);
  registerChainsRoutes(app);
  seedRoadmapStarterItems().catch((err) => console.error("[roadmap-seed] error:", err));

  startPriceAlertChecker();
  seedPriceCache();
  startPriceCacheScheduler(4);

  const { startMarketDataScheduler } = await import("./services/market-data");
  startMarketDataScheduler(4);

  const { startWhaleMonitor } = await import("./services/whale-monitor");
  startWhaleMonitor();

  const { startInactivityReminder } = await import("./services/inactivity-reminder");
  startInactivityReminder();

  return httpServer;
}

async function seedRoadmapStarterItems() {
  const STARTER_ITEMS = [
    { slug: "principles-page", category: "principles", title: "A welcome page that says exactly what we stand for", description: "No tech talk. Just plain words on what we promise and what we'll never do. (This is the Principles page.)", status: "shipped" },
    { slug: "external-tools-reference", category: "access", title: "A page that points you to other good tools we don't build ourselves", description: "Wallets, apps, and helpers from other teams that fit our principles — for the people who want them." },
    { slug: "site-translations", category: "language", title: "The site in your language", description: "Spanish, Portuguese, Arabic, Swahili first. More to follow. So you can use this in the words you actually think in." },
    { slug: "phone-walkthrough", category: "access", title: "A phone number you can call to set up your wallet", description: "A calm voice walks you through it in your language. No reading needed. No smartphone needed." },
    { slug: "flip-phone-payments", category: "access", title: "Send and receive money on a flip phone", description: "Dial a code, type the amount, money moves. Already works in parts of Africa — we want to bring it to more places." },
    { slug: "diaspora-send", category: "family", title: "Diaspora Send", description: "One tap to send small amounts to family back home. They don't need a bank, an app, or an ID to receive it." },
    { slug: "family-treasure-checklist", category: "family", title: "Family Treasure Checklist", description: "Step-by-step plain-English guide for keeping your money safe like the cash your grandparents hid in the mattress — but better. Hardware wallet, metal plate, family split, the whole thing.\n\nIncludes the old-fashioned trick that still works best: write your 24 words across three pieces of paper, give one to each adult you trust, and tell them any two of them brought together can rebuild it. No company involved. No third party holding anything. Just the people who would already be at your funeral." },
    { slug: "satellite-receiver", category: "infrastructure", title: "A receiver that works when the internet doesn't", description: "When the network is cut or censored, your wallet quietly switches to receiving over satellite. Free. Already working in space today." },
    { slug: "bitcoin-lightning-priority", category: "money", title: "Bitcoin and Lightning, faster", description: "Move our work on Bitcoin (the one that survives every government that ever tried to kill it) and Lightning (instant, almost-free sends) up the priority list." },
    { slug: "two-of-three-multisig", category: "family", title: "Two-of-three keys for big amounts", description: "A wizard that helps you set up a wallet where two trusted people have to agree before money moves. Like needing two signatures on a check." },
    { slug: "fedimint-pools", category: "community", title: "Community money pools (Fedimint)", description: "For families and villages that want to share a wallet protected by people they trust — instead of a corporation. We don't run it. We just help you connect." },
    { slug: "cash-swap-map", category: "community", title: "A map of trusted people who can swap cash for crypto in your area", description: "Like the corner store that does Western Union, but for digital money. We don't run them, we just help you find them." },
    { slug: "picture-and-voice-mode", category: "access", title: "Picture-and-voice mode", description: "No reading required. Big icons, audio confirmations of every step, in your own language." },
    { slug: "stablecoin-report-card", category: "honesty", title: "An honest report card on stablecoins", description: "Show clearly which kinds of digital dollars can be frozen by the company that issued them and which can't, so you choose with eyes open." },
    { slug: "lightning-bitcoin-swaps", category: "money", title: "Buy and sell Bitcoin and digital dollars right here — instantly, no middleman holding your money", description: "Trade between Bitcoin and digital dollars from inside your own wallet, in seconds, over the Lightning Network. We never take custody — your coins stay yours through every step of the swap. Built on a new tool called RailsX. No bridges, no wrapped fakes, no big exchange in the middle. Fits our principles: non-custodial, no gatekeeping, no taint scoring." },
  ];
  try {
    const items = STARTER_ITEMS.map((item, idx) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category as any,
      status: (item.status ?? "idea") as any,
      sortOrder: idx + 1,
    }));
    const inserted = await storage.seedRoadmapItemsIfEmpty(items);
    if (inserted > 0) {
      console.log(`[roadmap-seed] Inserted ${inserted} starter roadmap items`);
    }
    const followOnItems: InsertRoadmapItem[] = [
      {
        slug: "transaction-categories-money-flow",
        category: "tracking",
        title: "Tag every transaction so your dashboard shows real cash flow, not just a portfolio chart",
        description: "Every move of money — sent, received, swapped, deposited — gets tagged with who it was with (family, friend, client, customer, vendor, yourself) and what it was for (income, gift, allowance, expense, investment, internal transfer). From those two tags, the dashboard shows your real monthly cash flow, your tax report knows which lines are taxable income vs gifts vs internal moves, your year-end statement looks like a bank statement that actually means something, and your business persona (freelancers, small shops) gets a real P&L. Tags get set automatically when you use the right door inside the app (Send to Family, Invoice a Client, Vault Deposit). For wallet-scanned transactions, an address book learns over time — once you tag your son's wallet as Family/Allowance, every future send to that address tags itself. Categories are always editable, never gate a payment, and never require the user to fill out a form before sending money. Why this matters: the blockchain only knows addresses and amounts. It doesn't know that a transfer was a birthday gift to your son or a software invoice to a client — and without that, no report downstream (budget, P&L, tax) is honest. This is the layer that turns a portfolio tracker into a real personal-finance home for your crypto, non-custodially, the same way Mint did for bank money — except cleaner, because the tags are stamped at the moment the transaction is created rather than reverse-engineered from a bank scrape. (Conversation origin: founder asked whether labeling family-vs-business flows was just optics or whether it should also drive spend tracking and P&L — the answer turned out to be both, and this is the unified item.)",
        status: "idea",
      },
      {
        slug: "drawdown-drill",
        category: "tracking",
        title: "Practice holding through a real historical drawdown before you have to do it with real money",
        description: "An interactive forward-walk through real historical price action. Pick an asset (BTC, XRP, ETH, gold, the S&P 500), pick an entry date, and the tool walks you month-by-month through the actual price record — including the real headlines, the real 'everyone is panicking' moments, the real recoveries that took longer than anyone expected. At each painful point it asks: would you sell here? hold? add? Then it shows you the consequence of each choice playing forward through the next decade of real data. By the end, you've practiced the skill that actually matters — emotional discipline under pressure — using a real scenario that already happened. You finish saying either 'I could hold through that next time' or 'I would have panicked, so I need a different plan.' Either answer is a win because either answer is honest self-knowledge before real money is on the line.\n\nThree planned variants: (1) Practice the Drawdown — walk through a specific historical period (2017-18 crypto winter, 2020 COVID crash, 2022 monetary tightening crash). (2) Practice the Plan — build a hypothetical 10-year plan (starting amount, monthly DCA, target allocation, optional Soil vault yield, rebalancing rule) and run it against real historical record to see what the discipline produced. (3) Practice the Decision Rule — commit to a rule BEFORE you see the chart ('I'll sell at -30%', 'I'll never sell', 'I'll DCA $100/month', 'I'll rebalance quarterly') and then watch the rule run through real history. Teaches that rules beat reactions, which is the brand lesson in one tool.\n\nExplicitly NOT a paper-trading simulator. We will not build live ticking-price mock-buy dashboards, leaderboards, push notifications about 'your simulated performance,' or any framing that suggests 'graduate to real trades.' That version of this idea attracts speculative gambling behavior, teaches picking instead of holding, statistically hurts the very members we serve (paper-trader psychology does not transfer to real-money psychology), and would erode the brand within 12 months by making us indistinguishable from the brokerages we explicitly position against. The Drawdown Drill teaches the opposite skill: the patience and rule-discipline that makes someone actually sovereign instead of theoretically sovereign.\n\nBrand-aligned in three ways: (a) Sibling to the existing Sovereignty Drill — same brand language of 'annual exercise where you test whether you could actually do the thing you say you'd do' (one drill: could I recover my keys; this drill: could I hold through a 60% drawdown). (b) Sibling to the What-If Time Machine voting item — same historical-data spine, but participatory and forward-walking instead of summarized-and-final. (c) Sibling to the Purchasing-Power Tracker voting item — completes the trio: past observed, past replayed, past practiced.\n\nNo new data integrations needed. Uses the same CoinGecko historical + FRED + Yahoo equity data already in the stack. Build downstream of purchasing-power-tracker and what-if-time-machine since it reuses their historical data layer.\n\n(Conversation origin: founder asked honestly whether a 'fairy-tale buy / mock-buy / make-believe' simulator would convert spectators into real buyers. Honest answer was: the obvious paper-trading version conflicts hard with our brand because it teaches picking and gamification, two things we explicitly stand against. The underlying instinct — give spectators a participation surface to move from watching to doing — was correct, but the participation surface needs to teach holding/planning/rule-discipline rather than speculation. This item is the reframed version that keeps the instinct and drops the brand risk. Founder asked for honesty; this is the result of that honesty being applied to the original concept.)",
        status: "idea",
      },
      {
        slug: "what-if-time-machine",
        category: "tracking",
        title: "What if I had bought $X of [asset] on [date] and held? Compare it to anything.",
        description: "A historical 'what if' calculator that answers the question people already Google 30,000+ times a month ('what if I bought Bitcoin in 2010'). Pick an asset (BTC, XRP, ETH, Apple, Tesla, S&P 500, gold, 10-year Treasury, a 5% CD, cash under a mattress, even another crypto), pick a buy date, pick a sell date or hold-to-today, pick an amount. See the nominal outcome AND the CPI-adjusted real-purchasing-power outcome. Side-by-side mode shows the same dollars in, multiple destinations on one chart, same start/end dates — pick winners and losers in one view. Pre-built scenario pages (`/what-if/bitcoin-2010`, `/what-if/100-monthly-xrp-since-2020`, etc.) capture massive organic SEO traffic since these are real searches.\n\nSix planned variants: (1) Time Machine — the classic single-asset hold. (2) Side-by-Side Race — multiple destinations, one chart, ranked outcomes. (3) DCA What-If — '$50/week into [asset] for 5 years' — the most realistic version of the question most members actually have, and the natural handoff to our existing DCA Orders feature. (4) Cash-Under-the-Mattress — reframes the question from 'did the asset go up' to 'was inaction the safe choice it felt like' (usually no, once CPI is applied). (5) Yield-Stacked Variant — 'bought XRP AND deposited to Soil at 8% APR' vs just holding — demonstrates our actual product on historical data without recommending anything. (6) Lifetime Contribution Frame — '$100/month since you were 18' — the crypto-native retirement-calculator equivalent.\n\nEach result includes a short, plain-language sidebar explaining what affected this period (COVID, halving events, regulatory news, M2 expansion, dividend payments for stocks). Not analysis. Not prediction. Just context so the user understands what the chart is showing, not just what number it lands on.\n\nThe non-negotiable honesty guardrail: pre-built default scenarios MUST include unfavorable outcomes. BTC bought at 2021 ATH and held through 2022 crash. XRP bought at 2018 peak. ETH at 2017 peak vs S&P same day. The chart renders honestly whether or not the answer flatters crypto. Every other site only publishes the wins — publishing the losses too is our moat. Past does not promise future, said on every view.\n\nNo new integrations needed. Same data spine as purchasing-power-tracker (CoinGecko historical, FRED for CPI/gold/treasuries/CDs, Yahoo Finance for equities — all already in the stack).\n\nLives initially as a public page (`/what-if`) plus per-scenario SEO landing pages (`/what-if/bitcoin-2010` etc.) — no login, screenshot-friendly, shareable. The 'learn to earn' acquisition hook: someone Googles the question, lands on our page, gets the honest answer with educational context, and the soft handoff at the bottom shows the same decision available today inside our app (DCA Orders, Soil vault, portfolio tracker) — not a 'buy now' but a 'here's where that kind of decision lives in this app if you ever want it.'\n\nBuilds on the purchasing-power-tracker historical-data backbone — if that one is built first, this one is mostly a UI layer on top of work already done.\n\n(Conversation origin: founder wanted ideas for 'what if' scenarios as a learn-to-earn hook to convert spectators into members. The framing he reached for — 'what if I bought XRP on date X vs put that money in a CD or Apple' — turned out to be one of the highest-acquisition feature ideas in the entire strategic conversation because it answers a question people already search for, fits brand discipline of historical-only / no-predictions, and hands off to our actual product without selling. Distinct from the Drawdown Drill which is participatory and forward-walking; this one is summarized and final.)",
        status: "idea",
      },
      {
        slug: "purchasing-power-tracker",
        category: "tracking",
        title: "See what your money actually buys over time — crypto, gold, the dollar, or your local currency",
        description: "Pick an asset (Bitcoin, XRP, gold, the S&P 500, the US dollar, the Argentine peso, the Turkish lira, the Nigerian naira, whatever). Pick a real-world thing people actually buy (a loaf of bread, a gallon of gas, a McDonald's combo, an ounce of gold, a year of in-state tuition, a median US home, a share of the S&P 500). See how many of that thing one unit of your chosen asset bought year by year — and on the same chart, how many that same thing $1,000 bought year by year. The chart shows trajectories, not predictions. No trendlines extended into the future. No 'if this continues' language. Just historical record, in terms a regular person can feel.\n\nFive distinct views planned: (1) The 'what this buys' chart against any real-world basket item. (2) A 'real return' overlay on the existing portfolio dashboard so every position shows its CPI-adjusted return next to its nominal return — your XRP up 40% in dollars when the dollar is down 18% in real terms means a 71% real return, and almost no brokerage shows you this. (3) A standalone 'dollar's slow leak' chart that ignores crypto entirely — what $1 from your birth year buys today, just CPI math against the dollar itself, to establish that the ruler is shrinking before anything else gets measured against it. (4) A Big Mac frame — universally legible, screenshot-friendly, perfect for sharing. (5) A local-currency frame for members in emerging markets where their own fiat has lost 90-99% of its value over a decade and crypto isn't theoretical but lived experience.\n\nData already in the stack: FRED API (CPI, M2, housing, gold, gas — already integrated for housing) and CoinGecko historical (already integrated). This is a new-view task on existing data, not a new integration.\n\nLives initially as a public page (`/buying-power`) alongside `/principles` and `/sovereignty` — no login, SEO-rich, shareable. Later as a personalized overlay on the authenticated portfolio dashboard.\n\nThe non-negotiable guardrail: every chart is historical record, never prediction. The chart must render honestly across all periods — including ones where crypto underperformed gold, the S&P, or even cash. The credibility comes from publishing the chart whether or not it tells a flattering story. The brand isn't 'crypto wins'; the brand is 'this is the only place that shows you what actually happened, in terms you can feel.' Past does not promise future, and we say so on every view.\n\nWhy this matters: nominal price is a terrible measure. 'BTC went from $1 to $65,000' has been dismissed by half the public as a bubble narrative. Purchasing power against real-world goods is the honest measure — and against most major fiats, against most baskets, over long horizons, the data tells a story that doesn't need any hype to be persuasive. Showing it honestly is more powerful than selling it. Fits the existing 'asset-agnostic, no predictions' discipline of the Network Health page. (Conversation origin: founder wanted to capture the full spectrum of how to show members the buying power of crypto vs fiat over time, ignoring stablecoins since they're pegged. Explicitly framed as an honest test of the thesis — if the data supports the crypto-over-fiat story, the chart says it without us; if it doesn't, we publish anyway because honesty IS the brand.)",
        status: "idea",
      },
    ];
    for (const extra of followOnItems) {
      try {
        const added = await storage.addRoadmapItemIfMissing(extra);
        if (added) console.log(`[roadmap-seed] Added follow-on item: ${extra.slug}`);
      } catch (err) {
        console.error(`[roadmap-seed] follow-on insert failed for ${extra.slug}:`, err);
      }
    }
    const refreshedItems: { slug: string; title?: string; description?: string; category?: string }[] = [
      {
        slug: "headless-onramp-applepay",
        category: "access",
        title: "Buy Crypto — the front door: fiat in, your own wallet out, no exchange in the middle",
        description: "The 'Buy Crypto' interface CryptoOwnBank needs. Patterned on what crypto ATMs got right: wallet creation happens INSIDE the purchase, not before it. Newcomer arrives with no crypto knowledge, leaves 5 minutes later with assets in a wallet they truly own, seed phrase in their hand, ready to use the rest of the app. Every existing online on-ramp gets this wrong — they ask 'paste your wallet address' as step one, but the newcomer doesn't have an address, doesn't know what Xaman or Freighter is, so they bounce to Coinbase and get trapped in custody. This is the front door that fixes that.\n\nFinal architecture (every building block is already in our stack or one integration away):\n\n1. Member clicks 'Buy Crypto' (no prerequisites, no account required to start)\n2. Picks asset + amount (XRP, BTC, XLM, USDC, ETH, etc.)\n3. 'Where should it land?'\n   - 'I have a wallet' → paste address\n   - 'Create one for me right now' → in-browser keygen for the target chain, with a forced seed-backup ceremony before any money moves (show 12-24 words, require write-down, confirm two random words back). We never see or store the key. Pure non-custodial from second one.\n4. On-ramp aggregator (Onramper as primary — wraps MoonPay + Ramp + Transak + Stripe + Banxa + others) automatically routes fiat through the cheapest provider for the member's country and payment method. We never code against a single provider; aggregator absorbs all third-party risk.\n5. Asset lands directly in the wallet that was just created (or the one they pasted). On-chain settlement, member's custody, our interface as the orchestrator only.\n6. If the destination chain differs from where the on-ramp natively delivers, LI.FI or Squid Router (already in stack) bridges cross-chain transparently.\n7. Optional next-step prompts: 'Deposit to Soil vault for 8% APR?', 'Set up a DCA order?', 'Add to Legacy Plan?' — never pushed, always offered.\n\nMinimum realistic step count: 5-7 screens (click Buy Crypto → pick asset/amount → pick create-wallet → seed backup ceremony (3 micro-screens) → email/payment for the on-ramp partner's KYC → confirm). Cannot honestly go lower without (a) becoming custodial — breaks brand, (b) using shard-architecture embedded wallets like Privy/Magic — saves 2 screens but introduces small sovereignty compromise, only acceptable if data forces our hand, or (c) skipping seed backup — catastrophic, newcomer loses keys, blames us, deserved. The seed-backup ceremony is the only friction that's genuinely ours to shape; everything else is at the floor of what's physically possible while honoring banking law and non-custodial sovereignty.\n\nBrand-fit (both filters pass cleanly): NON-CUSTODIAL — we never see a key, never hold a coin, settlement is direct to member's own wallet, KYC stays on the on-ramp partner because banking law requires it (and we say so in the copy: 'Stripe or our routing partner verifies your identity to comply with their banking regulations. CryptoOwnBank never sees your ID, your bank, or your card. The crypto lands directly in your own non-custodial wallet.'). WORKS END-TO-END — newcomer with zero crypto knowledge arrives, ends the session with assets in their own wallet capable of using the rest of the app. Both filters honored, no compromise.\n\nWhy this is the keystone item: every other thing on this roadmap (transaction categories, purchasing power, what-if time machine, drawdown drill, sovereignty kit, Legacy Plan, yield vaults, Family mode, Whisper sharing) becomes dramatically more valuable once members can actually GET IN through a door we own. Today, the on-ramp gauntlet (sign up for Coinbase → KYC → buy → withdraw → set up Xaman → connect) takes 7-10 days and breaks at every step. Removing that single bottleneck is probably the highest-leverage build on the entire roadmap.\n\nDECIDED: pure in-browser keygen, full commit, no embedded-wallet fallback. The wallet-creation layer generates a real BIP-39 / chain-native keypair in the member's browser. We never see, store, transmit, or hold any part of the key — not even a shard. Seed backup is mandatory before any fiat moves. No 'easier path with a small trust tradeoff' option, ever.\n\nRationale for committing to the pure path and rejecting embedded wallets (Privy / Magic / Web3Auth / Dynamic / Turnkey):\n\n1. TWO-CLASS PROBLEM: Every other thing we've built — Sovereignty Kit, Sovereignty Drill, Sovereignty Page, Legacy Plan, AGPL-3.0 self-hostability — assumes members hold real seeds they wrote down themselves. Embedded wallets would create two classes of members: those with real seeds who can actually run the Sovereignty Drill, and those with shard-held wallets who think they're sovereign but can't demonstrate it without invoking a third party. Worldview fragmentation costs more long-term than 2 extra screens at signup.\n\n2. VENDOR ASYMMETRY: If Privy disappears, gets compelled, raises prices, or pivots, we face a migration crisis affecting every embedded-wallet member, and wallet migration is genuinely painful. If our in-browser keygen 'disappears,' that's impossible — we control every line. Asymmetric risk compounding over years tips the scale even if month-one conversion is slightly worse.\n\n3. SELF-SELECTION: Members who choose CryptoOwnBank over Coinbase do so BECAUSE we're more sovereign than the alternatives. Softening the door to improve conversion attracts members who don't want what we're building, making the product worse for the ones who do.\n\n4. BRAND-ASTERISK MATH: Pure path is one defensible sentence — 'we never see a key, period.' Embedded path requires the asterisk 'we never see a key, except a shard held by Privy under MPC, which is technically still non-custodial because we alone can't move funds, but...' The asterisk costs more in trust capital every time it gets explained than the screens cost in conversion.\n\nHumane seed-backup ceremony (this is where the UX investment goes, because the conversion cost of the pure path is real):\n\n(a) Founder-voice narration in plain language, no jargon. 'These 12 words ARE your wallet — not a backup of it, they literally are it. Anyone who sees them owns your crypto. Anyone who loses them loses access forever. This is the same way bearer bonds and physical cash work. You are about to do something that puts you in the same position as a 1950s banker holding the keys to the vault.'\n\n(b) Multiple backup format options on the same screen: handwrite on an included template, print a PDF, order a steel backup plate (link to Cryptosteel / Billfodl with no affiliate fee — principle), or follow encrypted-USB instructions. Member picks one or several; we never push any specific option.\n\n(c) Verification phrased as reassurance not a test: 'verify two of your words below' with copy that names the discomfort — 'if this feels uncomfortable, that is exactly the feeling that proves the system works — only you can do this.'\n\n(d) Anchor to what they already know: if they completed the Sovereignty Page or Sovereignty Drill before purchase, surface it — 'you already understand seed sovereignty. This is that, made real for the first time.'\n\nThat UX investment is what separates a 30% drop-off ceremony from a 10% drop-off ceremony, and every minute spent on it reinforces the worldview rather than fragmenting it.\n\n(Conversation origin: founder pushed across multiple sessions to find the simplest possible 'buy crypto' interface that doesn't compromise non-custodial principles or send users through exchanges. The breakthrough was recognizing that crypto ATMs already solved this by bundling wallet creation INTO the purchase rather than requiring it as a prerequisite. Industry-validated by Hyperliquid, Friend.tech, Story Protocol and a dozen other apps that converged on the same embedded-wallet + on-ramp-aggregator + bridge-layer pattern. This item replaces the earlier 'Onramper one-tap Apple Pay' framing with the full architectural picture. Supersedes that earlier description; this is the real product.)",
      },
    ];
    for (const refresh of refreshedItems) {
      try {
        const { slug, ...content } = refresh;
        const updated = await storage.refreshRoadmapItemContentBySlug(slug, content);
        if (updated) console.log(`[roadmap-seed] Refreshed item: ${slug}`);
      } catch (err) {
        console.error(`[roadmap-seed] refresh failed for ${refresh.slug}:`, err);
      }
    }
  } catch (err) {
    console.error("[roadmap-seed] error:", err);
  }
}

async function seedPriceCache() {
  try {
    const existing = await db.select().from(priceCacheTable);
    if (existing.length > 10) {
      console.log(`Price cache already seeded with ${existing.length} entries`);
      return;
    }
    await refreshPriceCache();
  } catch (err) {
    console.error("Price cache seeding error:", err);
  }
}

async function refreshPriceCache() {
  try {
    const allSymbols = [...new Set(Object.keys(COINGECKO_ASSET_MAP))];
    const allIds = [...new Set(allSymbols.map(s => COINGECKO_ASSET_MAP[s]).filter(Boolean))];
    
    let data: Record<string, any> | null = null;
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${allIds.join(",")}&vs_currencies=usd&include_24hr_change=true`;
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (response.status === 429 && attempt < maxRetries) {
          const backoff = (attempt + 1) * 15000;
          console.log(`[price-cache] Rate limited (429), retrying in ${backoff / 1000}s...`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        if (!response.ok) {
          console.warn(`[price-cache] CoinGecko API error: ${response.status}`);
          return;
        }
        data = await response.json();
        break;
      } catch (err: any) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
        console.error("[price-cache] Fetch failed after retries:", err?.message);
        return;
      }
    }

    if (!data) return;

    let totalUpdated = 0;
    const prices: Record<string, { usd: number; change24h?: number | null }> = {};
    for (const [symbol, cgId] of Object.entries(COINGECKO_ASSET_MAP)) {
      if (data[cgId]?.usd !== undefined) {
        prices[symbol] = {
          usd: data[cgId].usd,
          change24h: data[cgId].usd_24h_change ?? null,
        };
      }
    }
    if (Object.keys(prices).length > 0) {
      await savePricesToDb(prices);
      totalUpdated = Object.keys(prices).length;
    }
    console.log(`[price-cache] Refreshed ${totalUpdated} prices from CoinGecko`);
  } catch (err) {
    console.error("[price-cache] Refresh error:", err);
  }
}

function startPriceCacheScheduler(hours: number): void {
  const offsetMs = 60 * 1000;
  console.log(`[price-cache] Scheduler started — refreshing every ${hours}h, offset 1min`);
  setTimeout(async () => {
    await refreshPriceCache();
    setInterval(() => {
      refreshPriceCache();
    }, hours * 60 * 60 * 1000);
  }, offsetMs);
}

const COINGECKO_ASSET_MAP: Record<string, string> = {
  XRP: "ripple",
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  RLUSD: "rlusd",
  HBAR: "hedera-hashgraph",
  XLM: "stellar",
  ALGO: "algorand",
  TRX: "tron",
  VET: "vechain",
  XTZ: "tezos",
  EOS: "eos",
  AAVE: "aave",
  COMP: "compound-governance-token",
  MKR: "maker",
  SNX: "synthetix-network-token",
  SUSHI: "sushi",
  YFI: "yearn-finance",
  CRV: "curve-dao-token",
  FTM: "fantom",
  NEAR: "near",
  ICP: "internet-computer",
  FIL: "filecoin",
  GRT: "the-graph",
  SAND: "the-sandbox",
  MANA: "decentraland",
  APE: "apecoin",
  LDO: "lido-dao",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  SEI: "sei-network",
  INJ: "injective-protocol",
  RNDR: "render-token",
  FET: "fetch-ai",
  JASMY: "jasmycoin",
  EGLD: "elrond-erd-2",
  QNT: "quant-network",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  FLOKI: "floki",
  BCH: "bitcoin-cash",
  ETC: "ethereum-classic",
  XMR: "monero",
  ZEC: "zcash",
  DASH: "dash",
  NEO: "neo",
  IOTA: "iota",
  THETA: "theta-token",
  KAVA: "kava",
  ONE: "harmony",
  CELO: "celo",
  FLOW: "flow",
  ENJ: "enjincoin",
  BAT: "basic-attention-token",
  ZIL: "zilliqa",
  ICX: "icon",
  QTUM: "qtum",
  OMG: "omisego",
  WAVES: "waves",
  ANKR: "ankr",
  CRO: "crypto-com-chain",
  CHZ: "chiliz",
  ENS: "ethereum-name-service",
  GALA: "gala",
  AXS: "axie-infinity",
  IMX: "immutable-x",
  GMT: "stepn",
  APT: "aptos",
  ROSE: "oasis-network",
  KSM: "kusama",
  BAND: "band-protocol",
  STORJ: "storj",
  SKL: "skale",
  COTI: "coti",
  RVN: "ravencoin",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  BUSD: "binance-usd",
  TUSD: "true-usd",
  SPELL: "spell-token",
  ONDO: "ondo-finance",
  BTT: "bittorrent",
  BLZ: "bluzelle",
  UMA: "uma",
  TON: "the-open-network",
  WOJAK: "wojak",
  NCT: "polyswarm",
  RSR: "reserve-rights-token",
  AMP: "amp-token",
  XPR: "proton",
  BLUR: "blur",
  DYDX: "dydx-chain",
  HEX: "hex",
  ACH: "alchemy-pay",
  XYO: "xyo-network",
  "1INCH": "1inch",
  ZRX: "0x",
  WBTC: "wrapped-bitcoin",
  STETH: "staked-ether",
  WETH: "weth",
  STX: "blockstack",
  QI: "benqi",
  DGB: "digibyte",
  CSPR: "casper-network",
  CKB: "nervos-network",
  ZIL: "zilliqa",
  VTHO: "vethor-token",
  DNT: "district0x",
  EPX: "ellipsis-x",
  LSS: "lossless",
  PRQ: "parsiq",
  REEF: "reef",
  VRA: "verasity",
  XCN: "onyxcoin",
  ALI: "artificial-liquid-intelligence",
  ELON: "dogelon-mars",
  IQ: "everipedia",
  KRL: "kryll",
  MXC: "mxc",
  OOKI: "ooki",
  QSP: "quantstamp",
  RADAR: "dappradar",
  ASM: "assemble-protocol",
  ATH: "aethir",
  DAG: "constellation-labs",
  FLR: "flare-networks",
  KAS: "kaspa",
  MINA: "mina-protocol",
  NXRA: "allianceblock-nexera",
  SOLO: "sologenic",
  TAO: "bittensor",
  MONKY: "wise-monkey",
  ARPA: "arpa",
  BARA: "capybara-memecoin",
  BEAMX: "beam-2",
  CAW: "a-hunters-dream",
  CELR: "celer-network",
  CORGIAI: "corgiai",
  DOGS: "dogs-2",
  FTM: "fantom",
  MOBILE: "helium-mobile",
  IOST: "iostoken",
  IOTX: "iotex",
  LUNC: "terra-luna",
  MBL: "moviebloc",
  PDA: "playdapp",
  PENGU: "pudgy-penguins",
  S: "sonic-svm",
  TOSHI: "toshi",
  VVS: "vvs-finance",
  ZBCN: "zebec-protocol",
  VAULTA: "vaulta",
  COS: "contentos",
  STMX: "stormx",
  SUNDOG: "sundog",
  XVG: "verge",
  XDC: "xdce-crowd-sale",
  POL: "matic-network",
  TONIC: "tectonic",
  AWE: "awe",
  PRO: "propy",
};

async function savePricesToDb(prices: Record<string, { usd: number; change24h?: number | null }>): Promise<void> {
  try {
    const entries = Object.entries(prices).filter(([, v]) => v.usd > 0);
    for (const [symbol, data] of entries) {
      const change24hStr = (data.change24h != null && Number.isFinite(data.change24h)) ? data.change24h.toString() : null;
      await db.insert(priceCacheTable)
        .values({
          symbol: symbol.toUpperCase(),
          priceUsd: data.usd.toString(),
          change24h: change24hStr,
        })
        .onConflictDoUpdate({
          target: priceCacheTable.symbol,
          set: {
            priceUsd: data.usd.toString(),
            change24h: change24hStr,
            updatedAt: new Date(),
          },
        });
    }
  } catch (err) {
    console.error("Failed to save prices to DB:", err);
  }
}

async function loadPricesFromDb(symbols: string[]): Promise<Record<string, number>> {
  try {
    const rows = await db.select().from(priceCacheTable);
    const prices: Record<string, number> = {};
    for (const row of rows) {
      prices[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
    }
    return prices;
  } catch (err) {
    console.error("Failed to load prices from DB:", err);
    return {};
  }
}

async function fetchCurrentPrices(assets: string[]): Promise<Record<string, number>> {
  const enriched = await fetchCurrentPricesWithChange(assets);
  const simple: Record<string, number> = {};
  for (const [sym, data] of Object.entries(enriched)) {
    simple[sym] = data.usd;
  }
  return simple;
}

async function fetchCurrentPricesWithChange(assets: string[]): Promise<Record<string, { usd: number; change24h?: number }>> {
  const coingeckoIds = assets
    .map((a) => COINGECKO_ASSET_MAP[a.toUpperCase()])
    .filter(Boolean);

  if (coingeckoIds.length === 0) return {};

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(",")}&vs_currencies=usd&include_24hr_change=true`;
      const response = await fetch(url);
      if (response.status === 429 && attempt < maxRetries) {
        const backoff = (attempt + 1) * 10000;
        console.log(`[price-cache] Rate limited (429), retrying in ${backoff / 1000}s...`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      if (!response.ok) {
        console.error("CoinGecko API error:", response.status, "- falling back to cached prices");
        const cached = await loadPricesFromDb(assets);
        const result: Record<string, { usd: number; change24h?: number }> = {};
        for (const [sym, price] of Object.entries(cached)) result[sym] = { usd: price };
        return result;
      }
      const data = await response.json();
      const prices: Record<string, { usd: number; change24h?: number }> = {};
      for (const [symbol, cgId] of Object.entries(COINGECKO_ASSET_MAP)) {
        if (assets.includes(symbol) && data[cgId]?.usd !== undefined) {
          prices[symbol] = {
            usd: data[cgId].usd,
            change24h: data[cgId].usd_24h_change,
          };
        }
      }
      if (Object.keys(prices).length > 0) {
        await savePricesToDb(prices);
      }
      return prices;
    } catch (error) {
      if (attempt < maxRetries) continue;
      console.error("Failed to fetch prices from CoinGecko, falling back to cached:", error);
      const cached = await loadPricesFromDb(assets);
      const result: Record<string, { usd: number; change24h?: number }> = {};
      for (const [sym, price] of Object.entries(cached)) result[sym] = { usd: price };
      return result;
    }
  }
  return {};
}

async function runPriceAlertCheck() {
  try {
    const activeAlerts = await storage.getActivePriceAlerts();
    if (activeAlerts.length === 0) return;

    const uniqueAssets = Array.from(new Set(activeAlerts.map((a) => a.asset)));
    const prices = await fetchCurrentPrices(uniqueAssets);

    if (Object.keys(prices).length === 0) return;

    for (const alert of activeAlerts) {
      const currentPrice = prices[alert.asset.toUpperCase()];
      if (currentPrice === undefined) continue;

      const target = parseFloat(alert.targetPrice);
      let triggered = false;

      if (alert.direction === "above" && currentPrice >= target) {
        triggered = true;
      } else if (alert.direction === "below" && currentPrice <= target) {
        triggered = true;
      }

      if (triggered) {
        await storage.markPriceAlertTriggered(alert.id);

        try {
          const [user] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, alert.userId));

          if (user?.email) {
            await sendPriceAlertEmail(
              user.email,
              alert.asset,
              alert.targetPrice,
              currentPrice.toFixed(4),
              alert.direction
            );
          }
        } catch (emailError) {
          console.error("Failed to send price alert email:", emailError);
        }
      }
    }
  } catch (error) {
    console.error("Price alert checker error:", error);
  }
}

function startPriceAlertChecker() {
  setTimeout(() => {
    runPriceAlertCheck();
    setInterval(runPriceAlertCheck, 4 * 60 * 60 * 1000);
  }, 0);
  console.log("Price alert checker started (runs every 4h, offset 0min)");

  import("./services/crypto-payment-verifier").then(({ startCryptoPaymentVerifier }) => {
    startCryptoPaymentVerifier();
  });

  import("./services/subscription-renewal").then(({ startSubscriptionRenewalService }) => {
    startSubscriptionRenewalService();
  });

  import("./services/payment-scheduler").then(({ startPaymentScheduler }) => {
    startPaymentScheduler();
  });

  import("./services/housing-index").then(({ startHousingIndexScheduler }) => {
    startHousingIndexScheduler();
  });

  setTimeout(async () => {
    try {
      const existingAddrs = await storage.getCryptoPaymentAddresses(true);
      const existingChains = new Set(existingAddrs.map(a => a.chain.toLowerCase()));
      const defaultAddresses = [
        { chain: "xrp", address: "rwQ6SJMX6j7R5mVUXg5tSPgKRKvH12YQzc", label: "Ledger" },
        { chain: "rlusd", address: "rpwKnLcsi441mHxvUZtBeMHumLSSEzzqEY", label: "Xaman" },
        { chain: "bitcoin", address: "bc1qa2k2zypknlkta64sdgv7f7alp9ym7kxazwcw95", label: "Ledger" },
        { chain: "ethereum", address: "0xEc4e0f92BE6A1054FCfF951a5d28E55eB250E8a7", label: "Ledger" },
        { chain: "solana", address: "Ey4cAzgaSAcZJqi3T4o6eAFXRMjvYCTcFVNJ2ACgYSAZ", label: "SafePal" },
        { chain: "dogecoin", address: "D7aQa7LVAG5gdmYQpnXjweHpzbTxiFSGYe", label: "Ellipal" },
        { chain: "litecoin", address: "M9S7tv7qv5fPctYuvxph4h3xMnYUFuEWwg", label: "Ellipal" },
        { chain: "cardano", address: "addr1q8fkvkyguf8d7hx3h0fp79t38s5uyu3j233jlmvjate0dm84eagvqkg0rug72sm0yps7vm2wuhck8c3j36alz2ce4nzqvqtw37", label: "Ledger" },
        { chain: "avalanche", address: "0x1739b7096bC7a6b70869f8B17F7624eb645D615C", label: "CypheRock" },
        { chain: "algorand", address: "G73ZVJE4WDP5FWFSPFZCEICVL5HNEIVQ7VKCAELZ323O37IXQH5X6ROR3E", label: "Ledger" },
        { chain: "cosmos", address: "cosmos1g0uuvkjvc3dv2s2gw3j3jar4gyh3h6z9spw3v8", label: "Ledger" },
        { chain: "tron", address: "TP4ik3jen62RW5CBxUnehrDV6sQuouDdEK", label: "Ledger" },
        { chain: "hedera", address: "0.0.2953190", label: "Stader" },
        { chain: "polkadot", address: "12GEjjJDv339gcYSWF3fEzL7GkEacPyepEzNVEXcjETjCeQw", label: "Ledger" },
        { chain: "vechain", address: "0x27607b778b53E243B63E13D3f7a46cD864D4E67a", label: "Ledger" },
        { chain: "digibyte", address: "SRjSn5UEUsQ3qyZgnxAe1QjqQzGP6W7SoK", label: "Ledger" },
        { chain: "stellar", address: "GCMQNJIAZYBF2C3L5CK7PVKRVCBI75AGSGDVUCXDINBBR27ONRZDDEL3", label: "Ledger" },
        { chain: "ton", address: "UQD0BRQt-QdIEbsjuRsMqzDlBkUAEfQixShDECoKEOXRc4eR", label: "Crypto.com" },
        { chain: "polygon", address: "0x1b82116272AFAFde49742D6041A34eB8d917C841", label: "Ellipal" },
        { chain: "cronos", address: "cro1z0a5536kt28hga64ddlwcd82uq2a2ful3f9jxw", label: "Ledger" },
        { chain: "xdc", address: "xdc1b82116272AFAFde49742D6041A34eB8d917C841", label: "Ellipal" },
        { chain: "verge", address: "DEJ1aUcdh12zP5wBP5i4k6M1Nw2j9LR6YZ", label: "Ellipal" },
      ];
      const toCreate = defaultAddresses.filter(a => !existingChains.has(a.chain));
      for (const addr of toCreate) {
        await storage.createCryptoPaymentAddress(addr);
      }
      if (toCreate.length > 0) {
        console.log(`[seed] Created ${toCreate.length} crypto payment addresses (${toCreate.map(a => a.chain).join(", ")})`);
      }
    } catch (err) {
      console.error("[seed] Failed to seed crypto payment addresses:", err);
    }
  }, 3000);

  setTimeout(async () => {
    try {
      const ADMIN_USER_ID = "3e7353fc-9f2f-4f72-aba9-93c49b629b89";
      const adminWallets = await storage.getWalletsByUser(ADMIN_USER_ID);
      const ledgerXWallets = adminWallets.filter(w => w.label === "LEDGERX");
      if (ledgerXWallets.length > 0) {
        for (const w of ledgerXWallets) {
          await storage.updateWalletLabel(w.id, "LEDGER");
        }
        console.log(`[migration] Renamed ${ledgerXWallets.length} LEDGERX wallets to LEDGER`);
      }

      const existingLots = await storage.getTaxLotsByUser(ADMIN_USER_ID);
      console.log(`[migration] Database has ${existingLots.length} lots — preserved as-is (database is source of truth)`);
    } catch (err) {
      console.error("[migration] Startup migration error:", err);
    }
  }, 5000);

  setTimeout(async () => {
    try {
      const OWNER_ID = "1a4d009b-ca9c-46fe-a12b-193f4ec23f6e";
      const ownerXrpWallets = [
        { address: "rpwKnLcsi441mHxvUZtBeMHumLSSEzzqEY", label: "XRP_DeathKeepers (Xaman)" },
        { address: "rwQ6SJMX6j7R5mVUXg5tSPgKRKvH12YQzc", label: "XRP_LEDGER" },
        { address: "rKmgnmE8FNKx1uw7uPiB3aD2fup8Mw4k2z", label: "XRP_ELLIPAL" },
        { address: "rLHvxS7notX9d2HjwLoPh8ATGkCQRZi4QE", label: "XRP_CypheRock" },
        { address: "r4NX5ZUTUNHLxUkjp5mUge87EMuhojmfoU", label: "XRP_Arculus" },
        { address: "rPu4ceyz5fm6L5V87Xaq3RJ91cShd64irS", label: "XRP_SafePal" },
      ];
      const existing = await storage.getWalletsByUser(OWNER_ID);
      const existingAddrs = new Set(existing.map(w => w.address.toLowerCase()));
      let created = 0;
      for (const w of ownerXrpWallets) {
        if (!existingAddrs.has(w.address.toLowerCase())) {
          await storage.createWallet({ userId: OWNER_ID, chain: "xrp", address: w.address, label: w.label });
          created++;
        }
      }

      const { xamanConnections: xcTable } = await import("@shared/schema");
      const existingConns = await db.select().from(xcTable).where(eq(xcTable.userId, OWNER_ID));
      const existingConnAddrs = new Set(existingConns.map(c => c.xrpAddress.toLowerCase()));
      let connCreated = 0;
      for (const w of ownerXrpWallets) {
        if (!existingConnAddrs.has(w.address.toLowerCase())) {
          await db.insert(xcTable).values({ userId: OWNER_ID, xrpAddress: w.address, accountLabel: w.label });
          connCreated++;
        }
      }

      if (created > 0 || connCreated > 0) {
        console.log(`[seed] Owner wallets: ${created} wallets created, ${connCreated} xaman connections created`);
      }
    } catch (err) {
      console.error("[seed] Owner wallet seed error:", err);
    }
  }, 6000);

  setTimeout(async () => {
    try {
      const TEST_DCA_ID = "1ccf25ca-1a15-42a7-a712-e2afab208140";
      const { dcaOrders, dcaExecutions } = await import("@shared/schema");
      const [testOrder] = await db.select().from(dcaOrders).where(eq(dcaOrders.id, TEST_DCA_ID));
      if (testOrder) {
        await db.delete(dcaExecutions).where(eq(dcaExecutions.dcaOrderId, TEST_DCA_ID));
        await db.delete(dcaOrders).where(eq(dcaOrders.id, TEST_DCA_ID));
        console.log(`[cleanup] Removed test DCA order ${TEST_DCA_ID} and its executions`);
      }
    } catch (err) {
      console.error("[cleanup] DCA cleanup error:", err);
    }
  }, 7000);

  setTimeout(async () => {
    try {
      const { wallets, xamanConnections: xcTable } = await import("@shared/schema");
      let totalRenamed = 0;

      const xrpRenames: Record<string, string> = {
        "DeathKeepers (Xaman)": "XRP_DeathKeepers (Xaman)",
        "Xaman Wallet": "XRP_DeathKeepers (Xaman)",
        "LEDGER": "XRP_LEDGER",
        "ELLIPAL": "XRP_ELLIPAL",
        "CypheRock": "XRP_CypheRock",
        "Arculus": "XRP_Arculus",
        "SafePal": "XRP_SafePal",
        "LEDGERX": "XRP_LEDGER",
      };

      for (const [oldLabel, newLabel] of Object.entries(xrpRenames)) {
        const r1 = await db.update(wallets)
          .set({ label: newLabel })
          .where(and(eq(wallets.chain, "xrp"), eq(wallets.label, oldLabel)));
        if (r1.rowCount && r1.rowCount > 0) totalRenamed += r1.rowCount;

        const r2 = await db.update(xcTable)
          .set({ accountLabel: newLabel })
          .where(eq(xcTable.accountLabel, oldLabel));
        if (r2.rowCount && r2.rowCount > 0) totalRenamed += r2.rowCount;
      }

      const stellarRenames: Record<string, string> = {
        "OwnBank Stellar": "XLM_LOBSTR_OwnBank",
        "LOBSTR_OwnBank Stellar": "XLM_LOBSTR_OwnBank",
        "LEDGER": "XLM_LEDGER",
        "Arculus": "XLM_Arculus",
        "ELLIPAL": "XLM_ELLIPAL",
        "SafePal": "XLM_SafePal",
      };

      for (const [oldLabel, newLabel] of Object.entries(stellarRenames)) {
        const r = await db.update(wallets)
          .set({ label: newLabel })
          .where(and(eq(wallets.chain, "stellar"), eq(wallets.label, oldLabel)));
        if (r.rowCount && r.rowCount > 0) totalRenamed += r.rowCount;
      }

      if (totalRenamed > 0) {
        console.log(`[seed] Chain-prefix rename: updated ${totalRenamed} wallet/connection labels`);
      }

      // Clean up manually-added duplicate wallets (keep synced versions)
      const allUserWallets = await db.select({ id: wallets.id, label: wallets.label, address: wallets.address, chain: wallets.chain }).from(wallets);

      const dupeCleanups = [
        { keepLabel: "XRP_LEDGER", removeLabel: "XRP_Payment_Address", address: "rwQ6SJMX6j7R5mVUXg5tSPgKRKvH12YQzc" },
        { keepLabel: "XRP_DeathKeepers (Xaman)", removeLabel: "RLUS_Payment_Address", address: "rpwKnLcsi441mHxvUZtBeMHumLSSEzzqEY" },
      ];
      for (const dupe of dupeCleanups) {
        const matching = allUserWallets.filter(w => w.address === dupe.address && w.label === dupe.removeLabel);
        for (const w of matching) {
          await storage.deleteWallet(w.id);
          console.log(`[cleanup] Removed duplicate wallet "${dupe.removeLabel}" (keeping "${dupe.keepLabel}")`);
        }
      }

      const arculusMatches = allUserWallets.filter(w => (w.label === "Arculus " || w.label === "Arculus") && w.address === "r4NX5ZUTUNHLxUkjp5mUge87EMuhojmfoU");
      for (const w of arculusMatches) {
        await storage.updateWalletLabel(w.id, "XRP_Arculus");
        console.log(`[cleanup] Renamed "${w.label}" -> "XRP_Arculus"`);
      }

      const mismatchedWallets = allUserWallets.filter(w =>
        w.chain === "stellar" && w.address.startsWith("0x")
      );
      for (const w of mismatchedWallets) {
        await storage.deleteWallet(w.id);
        console.log(`[cleanup] Removed mismatched wallet: "${w.label}" (0x address stored as stellar chain)`);
      }
    } catch (err) {
      console.error("[seed] Chain-prefix rename error:", err);
    }
  }, 8000);

  setTimeout(async () => {
    try {
      const ADMIN_USER_ID = "3e7353fc-9f2f-4f72-aba9-93c49b629b89";
      const allLots = await storage.getTaxLotsByUser(ADMIN_USER_ID);

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
      for (const [, lots] of Object.entries(groups)) {
        if (lots.length > 1) {
          const toRemove = lots.slice(1);
          for (const lot of toRemove) {
            try {
              await storage.deleteTaxLot(lot.id);
              removedCount++;
            } catch {}
          }
        }
      }

      if (removedCount > 0) {
        console.log(`[dedup] Removed ${removedCount} duplicate tax lots`);

        const remainingLots = await storage.getTaxLotsByUser(ADMIN_USER_ID);
        const positionsData = await storage.getPositionsByUser(ADMIN_USER_ID);

        const lotTotals: Record<string, { qty: number; costBasis: number }> = {};
        for (const lot of remainingLots) {
          const sym = lot.assetSymbol;
          if (!lotTotals[sym]) lotTotals[sym] = { qty: 0, costBasis: 0 };
          const q = parseFloat(lot.remainingQuantity);
          const p = parseFloat(lot.costBasisPerUnit);
          lotTotals[sym].qty += q;
          lotTotals[sym].costBasis += q * p;
        }

        let recalcCount = 0;
        for (const pos of positionsData) {
          const lotData = lotTotals[pos.assetSymbol];
          if (lotData) {
            const newQty = lotData.qty.toFixed(8);
            const oldQty = parseFloat(pos.quantity).toFixed(8);
            if (oldQty !== newQty) {
              const newCostBasis = lotData.costBasis.toFixed(2);
              const newAvgCost = lotData.qty > 0 ? (lotData.costBasis / lotData.qty).toFixed(8) : "0";
              await storage.updatePosition(pos.id, {
                quantity: newQty,
                totalCostBasis: newCostBasis,
                averageCost: newAvgCost,
              });
              recalcCount++;
            }
          }
        }
        if (recalcCount > 0) {
          console.log(`[dedup] Recalculated ${recalcCount} positions from corrected lots`);
        }
      }
    } catch (err) {
      console.error("[dedup] Startup dedup error:", err);
    }
  }, 12000);

  // One-time cleanup: remove bad WLFI lot (141M manual entry error) and its position
  setTimeout(async () => {
    try {
      const badWlfiLots = await db.select().from(taxLots).where(
        and(eq(taxLots.assetSymbol, 'WLFI'), sql`CAST(original_quantity AS numeric) > 100000000`)
      );
      for (const lot of badWlfiLots) {
        await db.delete(taxLots).where(eq(taxLots.id, lot.id));
        console.log(`[startup-cleanup] Deleted bad WLFI lot: ${lot.id} qty=${lot.originalQuantity}`);
      }
      if (badWlfiLots.length > 0) {
        const badPositions = await db.execute(sql`SELECT id FROM positions WHERE asset_symbol = 'WLFI' AND CAST(quantity AS numeric) > 100000000`);
        for (const row of badPositions.rows) {
          await db.execute(sql`DELETE FROM positions WHERE id = ${row.id}`);
          console.log(`[startup-cleanup] Deleted bad WLFI position: ${row.id}`);
        }
      }
    } catch (err) {
      console.error("[startup-cleanup] WLFI cleanup error:", err);
    }
  }, 15000);

  setTimeout(async () => {
    try {
      const highValueStocks = new Set([
        "BTC", "ETH", "SOL", "TAO", "TAO22974", "ABBV", "VTI", "FDN", "PLTR",
        "IVV", "NVDA", "AAPL", "NFLX", "VGT", "HD", "QS", "KSM", "LINK",
        "MKR", "AAVE", "COMP", "YFI", "BNB", "AVAX", "DOT",
      ]);
      const ethThreshold = 500;

      const priceCacheRows = await db.select().from(priceCacheTable);
      const priceLookup: Record<string, number> = {};
      for (const row of priceCacheRows) {
        priceLookup[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
      }
      const assetsAll = await storage.getAllAssets();
      for (const a of assetsAll) {
        if (a.currentPrice) priceLookup[a.symbol.toUpperCase()] = parseFloat(a.currentPrice);
      }

      const allCorruptedLots = await db.execute(
        sql`SELECT id, asset_symbol, cost_basis_per_unit, remaining_quantity FROM tax_lots WHERE CAST(cost_basis_per_unit AS numeric) > ${ethThreshold}`
      );

      let fixCount = 0;
      for (const lot of allCorruptedLots.rows) {
        const sym = (lot.asset_symbol as string).toUpperCase();
        if (highValueStocks.has(sym)) continue;

        const currentPrice = priceLookup[sym] || 0;
        await db.execute(
          sql`UPDATE tax_lots SET cost_basis_per_unit = ${currentPrice.toFixed(8)} WHERE id = ${lot.id}`
        );
        console.log(`[startup-fix-erc20] Fixed ${lot.asset_symbol}: ${lot.cost_basis_per_unit} -> ${currentPrice.toFixed(8)}`);
        fixCount++;
      }

      if (fixCount > 0) {
        console.log(`[startup-fix-erc20] Fixed ${fixCount} corrupted tax lots. Recalculating positions...`);
        const allUsers = await db.execute(sql`SELECT DISTINCT user_id FROM tax_lots`);
        for (const row of allUsers.rows) {
          const uid = row.user_id as string;
          const lots = await storage.getTaxLotsByUser(uid);
          const positionsData = await storage.getPositionsByUser(uid);

          const lotTotals: Record<string, { qty: number; costBasis: number }> = {};
          for (const lot of lots) {
            const sym = lot.assetSymbol;
            if (!lotTotals[sym]) lotTotals[sym] = { qty: 0, costBasis: 0 };
            const qty = parseFloat(lot.remainingQuantity);
            const price = parseFloat(lot.costBasisPerUnit);
            lotTotals[sym].qty += qty;
            lotTotals[sym].costBasis += qty * price;
          }

          for (const pos of positionsData) {
            const lotData = lotTotals[pos.assetSymbol];
            if (lotData) {
              const newCostBasis = lotData.costBasis.toFixed(2);
              const newAvgCost = lotData.qty > 0 ? (lotData.costBasis / lotData.qty).toFixed(8) : "0";
              await storage.updatePosition(pos.id, {
                totalCostBasis: newCostBasis,
                averageCost: newAvgCost,
              });
            }
          }
          console.log(`[startup-fix-erc20] Recalculated positions for user ${uid}`);
        }
      } else {
        console.log("[startup-fix-erc20] No corrupted tax lots found.");
      }
    } catch (err) {
      console.error("[startup-fix-erc20] Error:", err);
    }
  }, 20000);

}
