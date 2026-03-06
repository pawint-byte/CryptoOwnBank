import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "./replit_integrations/auth";
import { insertTransactionSchema, insertApiCredentialSchema, userSettings as userSettingsTable, users, insertPriceAlertSchema, insertWalletSchema } from "@shared/schema";
import { createCheckoutSession, PLANS } from "./stripe";
import { sendFeedbackNotification, sendPriceAlertEmail } from "./email";
import multer from "multer";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { XummSdk } from "xumm-sdk";
import { Client } from "xrpl";

const SOIL_VAULT_ADDRESS = "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX";
const RLUSD_CURRENCY_HEX = "524C555344000000000000000000000000000000";
const ADMIN_EMAILS = ["pawint@me.com", "andrew.wint@gmail.com"];

async function getEffectiveTier(userId: string): Promise<{ tier: string; billingCycle: string }> {
  const settings = await storage.getUserSettings(userId);
  const tier = settings?.subscriptionTier || "free";
  const billingCycle = settings?.subscriptionBillingCycle || "monthly";

  const [user] = await db.select({ email: users.email, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  if (user?.isAdmin || ADMIN_EMAILS.includes(user?.email?.toLowerCase() || "")) {
    return { tier: "premium", billingCycle: "yearly" };
  }

  return { tier, billingCycle };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

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
      await db.update(users).set({
        xrplWalletAddress: walletAddress || null,
        xrplWalletType: walletType || null,
      }).where(eq(users.id, userId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to save wallet" });
    }
  });

  app.post("/api/soil/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const [user] = await db.select({
        xrplWalletAddress: users.xrplWalletAddress,
      }).from(users).where(eq(users.id, userId));

      const walletAddress = user?.xrplWalletAddress;
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

      const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

      const client = new Client("wss://xrplcluster.com");
      await client.connect();

      const soilTxns: Array<{
        hash: string;
        type: "deposit" | "interest";
        amount: number;
        currency: string;
        date: string;
        fee: string;
      }> = [];

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

          for (const tx of txs) {
            const txData = tx.tx || tx.tx_json || {};
            const meta = tx.meta || {};

            if (meta.TransactionResult !== "tesSUCCESS") continue;
            if (txData.TransactionType !== "Payment") continue;

            const src = txData.Account || "";
            const dest = txData.Destination || "";
            const isSoilRelated =
              src === SOIL_VAULT_ADDRESS || dest === SOIL_VAULT_ADDRESS;
            if (!isSoilRelated) continue;

            let amount = 0;
            let currency = "Unknown";
            let validCurrency = false;

            if (typeof txData.Amount === "object" && txData.Amount) {
              const amountCurrency = txData.Amount.currency || "";
              const amountIssuer = txData.Amount.issuer || "";
              if (
                (amountCurrency === RLUSD_CURRENCY_HEX || amountCurrency === "RLUSD") &&
                amountIssuer === RLUSD_ISSUER
              ) {
                amount = parseFloat(txData.Amount.value || "0");
                currency = "RLUSD";
                validCurrency = true;
              }
            } else if (typeof txData.Amount === "string") {
              amount = Number(txData.Amount) / 1_000_000;
              currency = "XRP";
              validCurrency = true;
            }

            if (!validCurrency || amount <= 0) continue;

            const rippleEpoch = 946684800;
            const date = txData.date
              ? new Date((txData.date + rippleEpoch) * 1000).toISOString()
              : new Date().toISOString();

            const hash = txData.hash || (tx as any).hash || "";
            if (!hash) continue;

            const isDeposit = dest === SOIL_VAULT_ADDRESS;

            soilTxns.push({
              hash,
              type: isDeposit ? "deposit" : "interest",
              amount,
              currency,
              date,
              fee: txData.Fee
                ? (Number(txData.Fee) / 1_000_000).toFixed(6)
                : "0",
            });
          }

          marker = response.result.marker;
          hasMore = !!marker;
        }
      } finally {
        await client.disconnect().catch(() => {});
      }

      let imported = 0;
      for (const stx of soilTxns) {
        if (existingHashes.has(stx.hash)) continue;

        const transactionType = stx.type === "deposit" ? "transfer_out" : "income";
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
            ? "Soil vault deposit (auto-synced from XRPL)"
            : "Soil vault interest payment (auto-synced from XRPL)",
        });

        imported++;
      }

      const deposits = soilTxns.filter(t => t.type === "deposit");
      const interestPayments = soilTxns.filter(t => t.type === "interest");
      const totalDeposited = deposits.reduce((sum, t) => sum + t.amount, 0);
      const totalInterest = interestPayments.reduce((sum, t) => sum + t.amount, 0);

      res.json({
        success: true,
        totalTransactions: soilTxns.length,
        newlyImported: imported,
        summary: {
          deposits: deposits.length,
          totalDeposited: totalDeposited.toFixed(2),
          interestPayments: interestPayments.length,
          totalInterestReceived: totalInterest.toFixed(2),
          transactions: soilTxns.map(t => ({
            hash: t.hash,
            type: t.type,
            amount: t.amount.toFixed(2),
            currency: t.currency,
            date: t.date,
          })),
        },
      });
    } catch (error: any) {
      console.error("Soil sync error:", error);
      res.status(500).json({ message: "Failed to sync Soil transactions: " + (error.message || "Unknown error") });
    }
  });

  app.get("/api/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const txns = await storage.getTransactionsByUser(userId);
      const positionsData = await storage.getPositionsByUser(userId);
      
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

      for (const pos of positionsData) {
        const asset = await storage.getAsset(pos.assetSymbol);
        const currentPrice = asset?.currentPrice ? parseFloat(asset.currentPrice) : parseFloat(pos.averageCost);
        const qty = parseFloat(pos.quantity);
        const value = qty * currentPrice;
        totalValue += value;
        totalCostBasis += parseFloat(pos.totalCostBasis);
        allocationMap.set(pos.assetSymbol, (allocationMap.get(pos.assetSymbol) || 0) + value);
      }

      const walletBals = await storage.getWalletBalancesByUser(userId);
      for (const wb of walletBals) {
        const usdVal = parseFloat(wb.usdValue || "0");
        if (usdVal > 0) {
          totalValue += usdVal;
          allocationMap.set(wb.assetSymbol, (allocationMap.get(wb.assetSymbol) || 0) + usdVal);
        }
      }

      const allocation = Array.from(allocationMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }));

      const totalGainLoss = totalValue - totalCostBasis;
      const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

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
        dayChange: totalValue * 0.02,
        dayChangePercent: 2.0,
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

  app.get("/api/positions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positionsData = await storage.getPositionsByUser(userId);
      const accounts = await storage.getAccountsByUser(userId);
      const accountMap = new Map(accounts.map(a => [a.id, a]));
      const enriched = [];
      for (const pos of positionsData) {
        const asset = await storage.getAsset(pos.assetSymbol);
        const currentPrice = asset?.currentPrice ? parseFloat(asset.currentPrice) : 0;
        const qty = parseFloat(pos.quantity);
        const value = qty * currentPrice;
        const costBasis = parseFloat(pos.totalCostBasis);
        const gainLoss = value - costBasis;
        const account = accountMap.get(pos.accountId);
        const isImport = account?.accountType === "import";
        enriched.push({
          ...pos,
          currentPrice: currentPrice.toFixed(2),
          currentValue: value.toFixed(2),
          gainLoss: gainLoss.toFixed(2),
          gainLossPercent: costBasis > 0 ? ((gainLoss / costBasis) * 100).toFixed(2) : "0",
          source: account?.accountName || "",
          isImport,
        });
      }
      res.json(enriched);
    } catch (error) {
      console.error("Positions error:", error);
      res.status(500).json({ message: "Failed to load positions" });
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
      }

      const transaction = await storage.createTransaction({
        userId,
        accountId,
        assetSymbol: data.assetSymbol.toUpperCase(),
        transactionType: data.transactionType,
        quantity: qty.toString(),
        pricePerUnit: price.toString(),
        totalValue: totalVal.toFixed(2),
        fee: data.fee || "0",
        transactionDate: new Date(data.transactionDate),
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
          acquiredDate: new Date(data.transactionDate),
          originalQuantity: qty.toString(),
          remainingQuantity: qty.toString(),
          costBasisPerUnit: price.toString(),
        });
      }

      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({ message: "Failed to create transaction" });
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

  app.get("/api/portfolio", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positionsData = await storage.getPositionsByUser(userId);
      
      let totalValue = 0;
      let totalCostBasis = 0;
      const colors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
      ];

      const positionsWithMarket = await Promise.all(
        positionsData.map(async (pos, index) => {
          const asset = await storage.getAsset(pos.assetSymbol);
          const currentPrice = asset?.currentPrice 
            ? parseFloat(asset.currentPrice) 
            : parseFloat(pos.averageCost);
          const qty = parseFloat(pos.quantity);
          const currentValue = qty * currentPrice;
          const costBasis = parseFloat(pos.totalCostBasis);
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

      const walletBalsForPortfolio = await storage.getWalletBalancesByUser(userId);
      const userWalletsForPortfolio = await storage.getWalletsByUser(userId);

      const walletPositions = walletBalsForPortfolio.map((wb) => {
        const wallet = userWalletsForPortfolio.find((w) => w.id === wb.walletId);
        const usdVal = parseFloat(wb.usdValue || "0");
        const bal = parseFloat(wb.balance);
        const price = bal > 0 ? usdVal / bal : 0;
        totalValue += usdVal;
        return {
          id: wb.id,
          userId: wb.userId,
          accountId: wb.walletId,
          assetSymbol: wb.assetSymbol,
          quantity: wb.balance,
          averageCost: "0",
          totalCostBasis: "0",
          updatedAt: wb.updatedAt,
          currentPrice: price,
          currentValue: usdVal,
          gainLoss: 0,
          gainLossPercent: 0,
          source: wallet?.label || wallet?.chain || "Wallet",
        };
      });

      const allPositions = [...positionsWithMarket.map(p => ({ ...p, source: "Exchange" })), ...walletPositions];

      const allocationMap = new Map<string, number>();
      allPositions.forEach((pos) => {
        const val = pos.currentValue || 0;
        allocationMap.set(pos.assetSymbol, (allocationMap.get(pos.assetSymbol) || 0) + val);
      });

      const allocation = Array.from(allocationMap.entries()).map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length],
      }));

      const totalGainLoss = totalValue - totalCostBasis;
      const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

      res.json({
        positions: allPositions,
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        allocation,
      });
    } catch (error) {
      console.error("Portfolio error:", error);
      res.status(500).json({ message: "Failed to load portfolio" });
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

      const { syncExchange } = await import("./services/exchange-sync");
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
      
      res.json(settings);
    } catch (error) {
      console.error("Settings error:", error);
      res.status(500).json({ message: "Failed to load settings" });
    }
  });

  app.put("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taxMethod, defaultCurrency, taxYear } = req.body;
      
      const settings = await storage.upsertUserSettings({
        userId,
        taxMethod,
        defaultCurrency,
        taxYear,
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/tax-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier: taxTier, billingCycle: taxCycle } = await getEffectiveTier(userId);
      if (taxTier === "free" || taxCycle !== "yearly") {
        return res.status(403).json({ message: "Tax reports require an Annual Premium plan ($79/yr). Monthly subscribers can upgrade to annual for full tax report access." });
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      
      const events = await storage.getGainEventsByYear(userId, year);
      
      let shortTermGains = 0;
      let shortTermLosses = 0;
      let longTermGains = 0;
      let longTermLosses = 0;

      for (const event of events) {
        const gl = parseFloat(event.gainLoss);
        if (event.isLongTerm) {
          if (gl >= 0) longTermGains += gl;
          else longTermLosses += Math.abs(gl);
        } else {
          if (gl >= 0) shortTermGains += gl;
          else shortTermLosses += Math.abs(gl);
        }
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      const allTxns = await storage.getTransactionsByDateRange(userId, startDate, endDate);
      const incomeTxns = allTxns.filter(t => t.transactionType === "income");
      const totalIncome = incomeTxns.reduce((sum, t) => sum + parseFloat(t.totalValue), 0);
      const totalFees = allTxns.reduce((sum, t) => sum + parseFloat(t.fee || "0"), 0);

      res.json({
        shortTermGains,
        shortTermLosses,
        longTermGains,
        longTermLosses,
        netShortTerm: shortTermGains - shortTermLosses,
        netLongTerm: longTermGains - longTermLosses,
        totalNetGainLoss: shortTermGains - shortTermLosses + longTermGains - longTermLosses,
        totalIncome,
        totalFees,
        incomeTransactions: incomeTxns.length,
        gainEvents: events,
      });
    } catch (error) {
      console.error("Tax report error:", error);
      res.status(500).json({ message: "Failed to generate tax report" });
    }
  });

  app.post("/api/tax-report/calculate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const { tier: calcTier, billingCycle: calcCycle } = await getEffectiveTier(userId);
      if (calcTier === "free" || calcCycle !== "yearly") {
        return res.status(403).json({ message: "Tax reports require an Annual Premium plan ($79/yr). Monthly subscribers can upgrade to annual for full tax report access." });
      }

      const { year, method } = req.body;
      
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      
      const txns = await storage.getTransactionsByDateRange(userId, startDate, endDate);
      const sellTxns = txns.filter(t => t.transactionType === "sell");

      for (const sellTx of sellTxns) {
        const lots = await storage.getTaxLotsByAsset(userId, sellTx.assetSymbol);
        const sortedLots = method === "LIFO" ? lots.reverse() : lots;
        
        let remainingToSell = parseFloat(sellTx.quantity);
        const sellPrice = parseFloat(sellTx.pricePerUnit);
        const sellDate = new Date(sellTx.transactionDate);

        for (const lot of sortedLots) {
          if (remainingToSell <= 0) break;
          
          const lotRemaining = parseFloat(lot.remainingQuantity);
          if (lotRemaining <= 0) continue;

          const sellFromLot = Math.min(remainingToSell, lotRemaining);
          const costBasisPerUnit = parseFloat(lot.costBasisPerUnit);
          const proceeds = sellFromLot * sellPrice;
          const costBasis = sellFromLot * costBasisPerUnit;
          const gainLoss = proceeds - costBasis;

          const acquiredDate = new Date(lot.acquiredDate);
          const holdingPeriod = sellDate.getTime() - acquiredDate.getTime();
          const oneYear = 365 * 24 * 60 * 60 * 1000;
          const isLongTerm = holdingPeriod >= oneYear;

          await storage.createGainEvent({
            userId,
            sellTransactionId: sellTx.id,
            taxLotId: lot.id,
            assetSymbol: sellTx.assetSymbol,
            quantity: sellFromLot.toString(),
            proceeds: proceeds.toString(),
            costBasis: costBasis.toString(),
            gainLoss: gainLoss.toString(),
            isLongTerm,
            taxMethod: method,
            soldDate: sellDate,
            acquiredDate,
          });

          await storage.updateTaxLot(lot.id, {
            remainingQuantity: (lotRemaining - sellFromLot).toString(),
          });

          remainingToSell -= sellFromLot;
        }
      }

      res.json({ success: true, message: "Tax calculations completed" });
    } catch (error) {
      console.error("Calculate tax error:", error);
      res.status(500).json({ message: "Failed to calculate taxes" });
    }
  });

  app.get("/api/tax-report/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier: exportTier, billingCycle: exportCycle } = await getEffectiveTier(userId);
      if (exportTier === "free" || exportCycle !== "yearly") {
        return res.status(403).json({ message: "Tax report exports require an Annual Premium plan ($79/yr). Monthly subscribers can upgrade to annual for full tax report access." });
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const format = req.query.format as string || "csv";
      
      const events = await storage.getGainEventsByYear(userId, year);
      
      if (format === "csv" || format === "turbotax") {
        let csv: string;
        let filename: string;

        if (format === "turbotax") {
          const ttHeaders = [
            "Currency Name",
            "Purchase Date",
            "Date Sold",
            "Proceeds",
            "Cost Basis",
            "Gain/Loss",
          ];
          const ttRows = events.map((e) => {
            const escapeField = (val: string) => val.includes(",") ? `"${val}"` : val;
            return [
              escapeField(e.assetSymbol),
              new Date(e.acquiredDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
              new Date(e.soldDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
              parseFloat(e.proceeds).toFixed(2),
              parseFloat(e.costBasis).toFixed(2),
              parseFloat(e.gainLoss).toFixed(2),
            ];
          });
          csv = [ttHeaders.join(","), ...ttRows.map((r) => r.join(","))].join("\n");
          filename = `cryptoownbank-turbotax-${year}.csv`;
        } else {
          const headers = [
            "Date Sold",
            "Date Acquired",
            "Asset",
            "Quantity",
            "Proceeds",
            "Cost Basis",
            "Gain/Loss",
            "Type",
            "Method",
          ];
          const rows = events.map((e) => [
            new Date(e.soldDate).toISOString().split("T")[0],
            new Date(e.acquiredDate).toISOString().split("T")[0],
            e.assetSymbol,
            e.quantity,
            e.proceeds,
            e.costBasis,
            e.gainLoss,
            e.isLongTerm ? "Long-term" : "Short-term",
            e.taxMethod,
          ]);
          csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
          filename = `tax-report-${year}.csv`;
        }
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.send(csv);
      } else if (format === "pdf") {
        const settings = await storage.getUserSettings(userId);
        if (!settings || settings.subscriptionTier !== "premium") {
          return res.status(403).json({ message: "PDF export is a Premium feature. Please upgrade to access." });
        }

        const { jsPDF } = await import("jspdf");
        const autoTableModule = await import("jspdf-autotable");
        const autoTable = autoTableModule.default;

        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        const method = (req.query.method as string) || "FIFO";

        doc.setFontSize(18);
        doc.text(`CryptoOwnBank Tax Report — ${year}`, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Calculation Method: ${method} | Generated: ${new Date().toLocaleDateString("en-US")}`, 14, 28);
        doc.setTextColor(0);

        doc.setFontSize(9);
        doc.setTextColor(60);
        const filingY = 34;
        doc.text("IRS Filing Guide:", 14, filingY);
        doc.setFontSize(8);
        doc.text("• Capital gains/losses below → IRS Form 8949 (Sales and Dispositions of Capital Assets)", 14, filingY + 4);
        doc.text("• Totals transfer to Schedule D (Capital Gains and Losses) of your Form 1040", 14, filingY + 8);
        doc.text("• Soil vault interest income → Schedule 1 (Additional Income), Line 8z — Other income", 14, filingY + 12);
        doc.text("• TurboTax users: export the TurboTax-format CSV from CryptoOwnBank and import directly", 14, filingY + 16);
        doc.setTextColor(0);

        let shortTermGains = 0;
        let shortTermLosses = 0;
        let longTermGains = 0;
        let longTermLosses = 0;

        for (const event of events) {
          const gl = parseFloat(event.gainLoss);
          if (event.isLongTerm) {
            if (gl >= 0) longTermGains += gl;
            else longTermLosses += Math.abs(gl);
          } else {
            if (gl >= 0) shortTermGains += gl;
            else shortTermLosses += Math.abs(gl);
          }
        }

        const netShortTerm = shortTermGains - shortTermLosses;
        const netLongTerm = longTermGains - longTermLosses;
        const totalNet = netShortTerm + netLongTerm;

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        const allTxns = await storage.getTransactionsByDateRange(userId, startDate, endDate);
        const incomeTxns = allTxns.filter(t => t.transactionType === "income");
        const totalIncome = incomeTxns.reduce((sum, t) => sum + parseFloat(t.totalValue), 0);
        const totalFees = allTxns.reduce((sum, t) => sum + parseFloat(t.fee || "0"), 0);

        const fmtCurrency = (v: number) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

        const summaryY = 56;
        doc.setFontSize(12);
        doc.text("Summary", 14, summaryY);

        const summaryBody: string[][] = [
          ["Short-Term (< 1 year)", fmtCurrency(shortTermGains), fmtCurrency(shortTermLosses), fmtCurrency(netShortTerm)],
          ["Long-Term (>= 1 year)", fmtCurrency(longTermGains), fmtCurrency(longTermLosses), fmtCurrency(netLongTerm)],
          ["Total Capital Gains", fmtCurrency(shortTermGains + longTermGains), fmtCurrency(shortTermLosses + longTermLosses), fmtCurrency(totalNet)],
        ];
        if (totalIncome > 0) {
          summaryBody.push([`Ordinary Income (${incomeTxns.length} events)`, fmtCurrency(totalIncome), "—", fmtCurrency(totalIncome)]);
        }
        if (totalFees > 0) {
          summaryBody.push(["Total Transaction Fees", "—", fmtCurrency(totalFees), `(${fmtCurrency(totalFees)})`]);
        }

        autoTable(doc, {
          startY: summaryY + 4,
          head: [["Category", "Gains", "Losses", "Net"]],
          body: summaryBody,
          theme: "grid",
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 },
          margin: { left: 14 },
        });

        const afterSummaryY = (doc as any).lastAutoTable?.finalY || summaryY + 40;

        doc.setFontSize(12);
        doc.text("Gain/Loss Events", 14, afterSummaryY + 10);

        const tableRows = events.map((e) => [
          new Date(e.soldDate).toLocaleDateString("en-US"),
          new Date(e.acquiredDate).toLocaleDateString("en-US"),
          e.assetSymbol,
          parseFloat(e.quantity).toFixed(6),
          fmtCurrency(parseFloat(e.proceeds)),
          fmtCurrency(parseFloat(e.costBasis)),
          fmtCurrency(parseFloat(e.gainLoss)),
          e.isLongTerm ? "Long-term" : "Short-term",
        ]);

        autoTable(doc, {
          startY: afterSummaryY + 14,
          head: [["Date Sold", "Date Acquired", "Asset", "Quantity", "Proceeds", "Cost Basis", "Gain/Loss", "Type"]],
          body: tableRows,
          theme: "striped",
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 8 },
          margin: { left: 14 },
        });

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(7);
          doc.setTextColor(130);
          doc.text(
            "This report is for informational purposes only. Consult a tax professional.",
            14,
            doc.internal.pageSize.getHeight() - 8
          );
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() - 30,
            doc.internal.pageSize.getHeight() - 8
          );
        }

        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=tax-report-${year}.pdf`);
        res.send(pdfBuffer);
      } else {
        res.status(400).json({ message: "Unsupported format. Use csv or pdf." });
      }
    } catch (error) {
      console.error("Export tax report error:", error);
      res.status(500).json({ message: "Failed to export tax report" });
    }
  });

  app.post("/api/stripe/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body;

      if (!plan || !["monthly", "yearly"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Use 'monthly' or 'yearly'." });
      }

      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const baseUrl = `${protocol}://${host}`;

      const session = await createCheckoutSession(
        userId,
        plan as "monthly" | "yearly",
        `${baseUrl}/settings?subscription=success`,
        `${baseUrl}/settings?subscription=cancelled`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/webhook", async (req: any, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        const event = req.body;
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const userId = session.metadata?.userId;
          const billingCycle = session.metadata?.plan || "monthly";
          if (userId) {
            const existing = await storage.getUserSettings(userId);
            await storage.upsertUserSettings({
              userId,
              taxMethod: existing?.taxMethod || "FIFO",
              defaultCurrency: existing?.defaultCurrency || "USD",
              subscriptionTier: "premium",
              subscriptionBillingCycle: billingCycle,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            });
          }
        } else if (
          event.type === "customer.subscription.deleted" ||
          event.type === "customer.subscription.updated"
        ) {
          const subscription = event.data.object;
          const status = subscription.status;
          const customerId = subscription.customer;
          if (status === "canceled" || status === "unpaid") {
            const allSettings = await db
              .select()
              .from(userSettingsTable)
              .where(eq(userSettingsTable.stripeCustomerId, customerId as string));
            for (const s of allSettings) {
              await storage.upsertUserSettings({
                userId: s.userId,
                taxMethod: s.taxMethod || "FIFO",
                defaultCurrency: s.defaultCurrency || "USD",
                subscriptionTier: "free",
                subscriptionBillingCycle: null,
                stripeCustomerId: s.stripeCustomerId,
                stripeSubscriptionId: s.stripeSubscriptionId,
              });
            }
          }
        }
        return res.json({ received: true });
      }

      const { stripe } = await import("./stripe");
      const event = stripe.webhooks.constructEvent(
        JSON.stringify(req.body),
        sig,
        webhookSecret
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const billingCycle = session.metadata?.plan || "monthly";
        if (userId) {
          const existing = await storage.getUserSettings(userId);
          await storage.upsertUserSettings({
            userId,
            taxMethod: existing?.taxMethod || "FIFO",
            defaultCurrency: existing?.defaultCurrency || "USD",
            subscriptionTier: "premium",
            subscriptionBillingCycle: billingCycle,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
          });
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({ message: "Webhook error" });
    }
  });

  app.get("/api/stripe/plans", (_req, res) => {
    res.json(PLANS);
  });

  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      const tier = settings?.subscriptionTier || "free";
      res.json({ tier, status: "active" });
    } catch (error) {
      console.error("Subscription check error:", error);
      res.status(500).json({ message: "Failed to check subscription" });
    }
  });

  const TIER_LIMITS: Record<string, {
    exchanges: number | null;
    wallets: number | null;
    alerts: number | null;
    transactionHistoryDays: number | null;
    csvImport: boolean;
    autoWithdraw: boolean;
    xls66Lending: boolean;
  }> = {
    free: {
      exchanges: 1,
      wallets: 1,
      alerts: 3,
      transactionHistoryDays: 30,
      csvImport: false,
      autoWithdraw: false,
      xls66Lending: false,
    },
    premium: {
      exchanges: null,
      wallets: null,
      alerts: null,
      transactionHistoryDays: null,
      csvImport: true,
      autoWithdraw: true,
      xls66Lending: false,
    },
    pro: {
      exchanges: null,
      wallets: null,
      alerts: null,
      transactionHistoryDays: null,
      csvImport: true,
      autoWithdraw: true,
      xls66Lending: true,
    },
  };

  app.get("/api/subscription/limits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, billingCycle } = await getEffectiveTier(userId);

      const credentials = await storage.getApiCredentialsByUser(userId);
      const userWallets = await storage.getWalletsByUser(userId);
      const activeAlerts = await storage.countActiveAlertsByUser(userId);

      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      const hasAnnualPlan = billingCycle === "yearly";
      const taxReportsUnlocked = tier !== "free" && hasAnnualPlan;

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
      });
    } catch (error) {
      console.error("Subscription limits error:", error);
      res.status(500).json({ message: "Failed to load subscription limits" });
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
      res.json({ resolved, signed, account });
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
      const { TransactionType, Destination, Amount, LimitAmount } = req.body;
      if (!TransactionType) {
        return res.status(400).json({ message: "TransactionType is required" });
      }
      const txJson: any = { TransactionType };
      if (Destination) txJson.Destination = Destination;
      if (Amount) txJson.Amount = Amount;
      if (LimitAmount) txJson.LimitAmount = LimitAmount;

      const payload = await xummSdk.payload.create({ txjson: txJson } as any, true);
      if (!payload) {
        return res.status(500).json({ message: "Failed to create payload" });
      }
      res.json({
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
      });
    } catch (error: any) {
      console.error("Xumm payload error:", error?.message);
      res.status(500).json({ message: error.message || "Failed to create payload" });
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

      if (alertTier === "free" && activeCount >= 3) {
        return res.status(403).json({
          message: "Free users can have up to 3 active alerts. Upgrade to Premium for unlimited alerts.",
          limit: 3,
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

      const wallet = await storage.createWallet(parsed);
      res.json(wallet);
    } catch (error: any) {
      console.error("Create wallet error:", error);
      res.status(400).json({ message: error.message || "Failed to add wallet" });
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

      const chain = wallet.chain as any;
      let balances: Awaited<ReturnType<typeof fetchChainBalances>> = [];
      let fetchError = false;
      try {
        balances = await fetchChainBalances(chain, wallet.address);
      } catch (err) {
        console.error(`Sync fetch error for ${chain} wallet ${wallet.id}:`, err);
        fetchError = true;
      }

      if (fetchError || balances.length === 0) {
        console.log(`Sync: keeping existing balances for ${chain} wallet ${wallet.id} (API returned ${balances.length} results, error=${fetchError})`);
        await storage.updateWalletSyncTime(wallet.id);
      } else {
        await storage.deleteWalletBalances(wallet.id);

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

      if (chain === "ethereum" || chain === "bitcoin") {
        try {
          const { getEthTransactions, getBtcTransactions } = await import("./services/blockchain-transactions");
          const { getHistoricalPrice } = await import("./services/historical-prices");

          const blockchainTxs = chain === "ethereum"
            ? await getEthTransactions(wallet.address)
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

            const MAX_PRICE_LOOKUPS = 60;
            const priceMap = new Map<string, number>();
            const asset = chain === "ethereum" ? "ETH" : "BTC";
            let lookupCount = 0;
            for (const [dayKey, date] of uniqueDates) {
              if (lookupCount >= MAX_PRICE_LOOKUPS) {
                console.warn(`Capping price lookups at ${MAX_PRICE_LOOKUPS} for wallet ${wallet.id}`);
                break;
              }
              const price = await getHistoricalPrice(asset, date);
              priceMap.set(dayKey, price);
              lookupCount++;
              if (lookupCount < uniqueDates.size) await new Promise(r => setTimeout(r, 2500));
            }

            for (const tx of blockchainTxs) {
              if (existingExternalIds.has(tx.hash)) continue;

              const dayKey = tx.timestamp.toISOString().split("T")[0];
              const pricePerUnit = priceMap.get(dayKey) || 0;
              const totalValue = tx.quantity * pricePerUnit;
              const txType = tx.type === "receive" ? "buy" : "sell";

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
                notes: `Imported from ${chain === "ethereum" ? "Ethereum" : "Bitcoin"} blockchain`,
              });

              if (txType === "buy" && pricePerUnit > 0) {
                await storage.createTaxLot({
                  userId,
                  transactionId: transaction.id,
                  assetSymbol: tx.asset,
                  acquiredDate: tx.timestamp,
                  originalQuantity: tx.quantity.toString(),
                  remainingQuantity: tx.quantity.toString(),
                  costBasisPerUnit: pricePerUnit.toFixed(2),
                });
              }

              newTransactions++;
            }

            console.log(`Wallet sync: imported ${newTransactions} new ${chain} transactions for wallet ${wallet.id}`);
          }
        } catch (txError) {
          console.error(`Failed to import ${chain} transactions:`, txError);
        }
      }

      const updatedWallet = await storage.getWallet(wallet.id);
      const updatedBalances = await storage.getWalletBalances(wallet.id);
      res.json({ ...updatedWallet, balances: updatedBalances, newTransactions });
    } catch (error) {
      console.error("Sync wallet error:", error);
      res.status(500).json({ message: "Failed to sync wallet" });
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

  let priceCache: { prices: Record<string, number>; fetchedAt: number } = { prices: {}, fetchedAt: 0 };
  const PRICE_CACHE_TTL_MS = 60 * 1000;

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
      const zeroSymbols = Object.values(holdings)
        .filter(h => h.usdValue === 0 && h.balance > 0 && !stablecoins.has(h.symbol) && !h.symbol.includes("(staked)"))
        .map(h => h.symbol);

      if (zeroSymbols.length > 0) {
        try {
          const now = Date.now();
          const missingFromCache = zeroSymbols.filter(s => !priceCache.prices[s]);
          const cacheExpired = (now - priceCache.fetchedAt) > PRICE_CACHE_TTL_MS;

          if (cacheExpired || missingFromCache.length > 0) {
            const allSymbols = Object.keys(holdings).filter(s => !stablecoins.has(s) && !s.includes("(staked)"));
            const freshPrices = await fetchCurrentPrices(allSymbols);
            priceCache = { prices: { ...priceCache.prices, ...freshPrices }, fetchedAt: now };
          }

          for (const sym of zeroSymbols) {
            if (priceCache.prices[sym]) {
              holdings[sym].usdValue = holdings[sym].balance * priceCache.prices[sym];
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
            const parsed = new Date(dateStr);
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

  startPriceAlertChecker();

  return httpServer;
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
  AWE: "awe",
  PRO: "propy",
};

async function fetchCurrentPrices(assets: string[]): Promise<Record<string, number>> {
  const coingeckoIds = assets
    .map((a) => COINGECKO_ASSET_MAP[a.toUpperCase()])
    .filter(Boolean);

  if (coingeckoIds.length === 0) return {};

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(",")}&vs_currencies=usd`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error("CoinGecko API error:", response.status);
      return {};
    }
    const data = await response.json();
    const prices: Record<string, number> = {};
    for (const [symbol, cgId] of Object.entries(COINGECKO_ASSET_MAP)) {
      if (data[cgId]?.usd !== undefined) {
        prices[symbol] = data[cgId].usd;
      }
    }
    return prices;
  } catch (error) {
    console.error("Failed to fetch prices from CoinGecko:", error);
    return {};
  }
}

function startPriceAlertChecker() {
  setInterval(async () => {
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
  }, 60000);

  console.log("Price alert checker started (runs every 60 seconds)");
}
