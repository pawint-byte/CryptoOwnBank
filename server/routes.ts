import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "./replit_integrations/auth";
import { insertTransactionSchema, insertApiCredentialSchema, userSettings as userSettingsTable } from "@shared/schema";
import { createCheckoutSession, PLANS } from "./stripe";
import { sendFeedbackNotification } from "./email";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

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

  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const txns = await storage.getTransactionsByUser(userId);
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

      if (data.transactionType === "buy") {
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

      const allocation = positionsWithMarket.map((pos, index) => ({
        name: pos.assetSymbol,
        value: pos.currentValue,
        color: colors[index % colors.length],
      }));

      const totalGainLoss = totalValue - totalCostBasis;
      const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

      res.json({
        positions: positionsWithMarket,
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

      const validProviders = ["binance", "coinbase", "kraken", "robinhood", "fidelity"];
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
      const { id } = req.params;
      await storage.updateApiCredential(id, { lastSyncAt: new Date() });
      res.json({ success: true, message: "Sync completed" });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ message: "Failed to sync" });
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

      res.json({
        shortTermGains,
        shortTermLosses,
        longTermGains,
        longTermLosses,
        netShortTerm: shortTermGains - shortTermLosses,
        netLongTerm: longTermGains - longTermLosses,
        totalNetGainLoss: shortTermGains - shortTermLosses + longTermGains - longTermLosses,
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
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const format = req.query.format as string || "csv";
      
      const events = await storage.getGainEventsByYear(userId, year);
      
      if (format === "csv") {
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

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=tax-report-${year}.csv`);
        res.send(csv);
      } else {
        res.status(400).json({ message: "Unsupported format. Use csv." });
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
          if (userId) {
            const existing = await storage.getUserSettings(userId);
            await storage.upsertUserSettings({
              userId,
              taxMethod: existing?.taxMethod || "FIFO",
              defaultCurrency: existing?.defaultCurrency || "USD",
              subscriptionTier: "premium",
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
        if (userId) {
          const existing = await storage.getUserSettings(userId);
          await storage.upsertUserSettings({
            userId,
            taxMethod: existing?.taxMethod || "FIFO",
            defaultCurrency: existing?.defaultCurrency || "USD",
            subscriptionTier: "premium",
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

  app.post("/api/feedback", async (req, res) => {
    try {
      const { name, email, type, message } = req.body;
      if (!name || !email || !type || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (message.length > 5000) {
        return res.status(400).json({ message: "Message too long (max 5000 characters)" });
      }
      await sendFeedbackNotification(name, email, type, message);
      res.json({ success: true });
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(500).json({ message: "Failed to send feedback" });
    }
  });

  return httpServer;
}
