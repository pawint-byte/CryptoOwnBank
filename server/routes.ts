import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "./replit_integrations/auth";
import { insertTransactionSchema, insertApiCredentialSchema, userSettings as userSettingsTable, users, insertPriceAlertSchema, insertWalletSchema, priceCache as priceCacheTable, walletBalances, type CustomVault } from "@shared/schema";
import { createCheckoutSession, PLANS } from "./stripe";
import { sendFeedbackNotification, sendPriceAlertEmail } from "./email";
import multer from "multer";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { XummSdk } from "xumm-sdk";
import { Client } from "xrpl";

function detectChainMismatch(chain: string, address: string): string | null {
  const a = address.trim();
  const patterns: Record<string, (addr: string) => boolean> = {
    cronos: (addr) => addr.startsWith("cro1") || addr.startsWith("0x"),
    ethereum: (addr) => addr.startsWith("0x") && addr.length === 42,
    bitcoin: (addr) => /^(1|3|bc1)[a-zA-Z0-9]{25,}$/.test(addr),
    xrpl: (addr) => addr.startsWith("r") && addr.length >= 25 && addr.length <= 35,
    solana: (addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) && !addr.startsWith("0x"),
    tron: (addr) => addr.startsWith("T") && addr.length === 34,
    algorand: (addr) => addr.length === 58 && /^[A-Z2-7]+$/.test(addr),
    cosmos: (addr) => addr.startsWith("cosmos1"),
    hedera: (addr) => /^0\.0\.\d+$/.test(addr),
    polkadot: (addr) => /^[1-9A-HJ-NP-Za-km-z]{46,48}$/.test(addr),
    stellar: (addr) => addr.startsWith("G") && addr.length === 56,
  };
  const validator = patterns[chain];
  if (validator && !validator(a)) {
    for (const [otherChain, otherValidator] of Object.entries(patterns)) {
      if (otherChain !== chain && otherValidator(a)) {
        return `Address looks like ${otherChain}, not ${chain}`;
      }
    }
    return `Address format doesn't match ${chain}`;
  }
  return null;
}

const SOIL_VAULT_ADDRESSES = [
  "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX",
  "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8",
  // YIELD vault address — add here when Soil activates the pool
];
const SOIL_VAULT_ADDRESS = SOIL_VAULT_ADDRESSES[0];
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

      const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

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
            const isWithdrawal = dest === walletAddress && allKnownVaultAddresses.has(src);

            if (!isDeposit && !isWithdrawal) {
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
            const txType = isDeposit ? "deposit" : "withdrawal";
            console.log(`[Soil sync] Found ${txType}: ${amount} ${currency} | ${src.slice(0,8)}->${dest.slice(0,8)} | vault=${vaultAddr.slice(0,8)} | hash=${hash.slice(0,12)}`);
            soilTxns.push({
              hash,
              type: txType,
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
      for (const stx of soilTxns) {
        if (existingHashes.has(stx.hash)) continue;

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
            ? "Soil vault deposit (auto-synced from XRPL)"
            : "Soil vault withdrawal (auto-synced from XRPL)",
        });

        imported++;
      }

      const deposits = soilTxns.filter(t => t.type === "deposit");
      const withdrawals = soilTxns.filter(t => t.type === "withdrawal");
      const totalDeposited = deposits.reduce((sum, t) => sum + t.amount, 0);
      const totalWithdrawn = withdrawals.reduce((sum, t) => sum + t.amount, 0);

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
          await storage.updatePosition(existingPos.id, {
            quantity: total.toFixed(8),
            averageCost: "1",
            totalCostBasis: total.toFixed(2),
          });
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

      const vaultBreakdown: Record<string, { principal: number; apr: number; name: string; deposits: Array<{amount: number; date: string}> }> = {};
      for (const dep of deposits) {
        const addr = dep.vaultAddress || SOIL_VAULT_ADDRESSES[0];
        if (!vaultBreakdown[addr]) {
          vaultBreakdown[addr] = {
            principal: 0,
            apr: SOIL_VAULT_APR[addr] || 0.065,
            name: SOIL_VAULT_NAMES[addr] || "Vault",
            deposits: [],
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
        for (const dep of info.deposits) {
          const depositDate = new Date(dep.date);
          const daysSince = Math.max(0, (Date.now() - depositDate.getTime()) / (1000 * 60 * 60 * 24));
          vaultInterest += dep.amount * info.apr * (daysSince / 365);
        }
        return {
          address: addr,
          name: info.name,
          principal: Math.max(0, info.principal).toFixed(2),
          apr: (info.apr * 100).toFixed(1),
          interest: vaultInterest.toFixed(2),
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

      for (const pos of positionsData) {
        const asset = await storage.getAsset(pos.assetSymbol);
        const currentPrice = asset?.currentPrice ? parseFloat(asset.currentPrice) : parseFloat(pos.averageCost);
        const qty = parseFloat(pos.quantity);
        const value = qty * currentPrice;
        totalValue += value;
        totalCostBasis += parseFloat(pos.totalCostBasis);
        allocationMap.set(pos.assetSymbol, (allocationMap.get(pos.assetSymbol) || 0) + value);
      }

      const rawWalletBals = await storage.getWalletBalancesByUser(userId);
      const walletBals = await enrichWalletBalances(rawWalletBals);
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
      const { quantity, costPerUnit, acquiredDate, note } = req.body;
      const qty = parseFloat(quantity);
      const cost = parseFloat(costPerUnit);
      if (isNaN(qty) || qty <= 0) return res.status(400).json({ message: "Quantity must be positive" });
      if (isNaN(cost) || cost < 0) return res.status(400).json({ message: "Cost per unit must be non-negative" });
      if (!acquiredDate) return res.status(400).json({ message: "Acquired date is required" });

      const lot = await storage.createTaxLot({
        userId,
        walletBalanceId: id,
        assetSymbol: balance.assetSymbol,
        acquiredDate: new Date(acquiredDate),
        originalQuantity: qty.toString(),
        remainingQuantity: qty.toString(),
        costBasisPerUnit: cost.toString(),
        note: note || null,
      });

      const allLots = await storage.getTaxLotsByWalletBalance(userId, id);
      const totalCost = allLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = allLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity), 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      await storage.updateWalletBalanceCostData(id, avgCost.toFixed(8), totalCost.toFixed(2));

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
        updates.acquiredDate = new Date(acquiredDate);
      }
      if (note !== undefined) {
        updates.note = note || null;
      }

      const updated = await storage.updateTaxLot(lotId, updates);

      const allLots = await storage.getTaxLotsByWalletBalance(userId, balanceId);
      const totalCost = allLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = allLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity), 0);
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
      const totalCost = remainingLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = remainingLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity), 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      await storage.updateWalletBalanceCostData(balanceId, avgCost.toFixed(8), totalCost.toFixed(2));

      res.json({ message: "Purchase lot removed" });
    } catch (error) {
      console.error("Delete wallet lot error:", error);
      res.status(500).json({ message: "Failed to delete purchase lot" });
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
        if (sym && qty > 0) {
          csvLots.push({ symbol: sym, tradeDate: td, purchasePrice: pp, quantity: qty, commission: comm, comment });
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

      const results: any[] = [];
      let totalLotsCreated = 0;
      let totalAssetsMatched = 0;

      for (const wb of allWalletBalances) {
        const sym = wb.assetSymbol.replace(" (staked)", "");
        const lots = csvBySymbol[sym];
        if (!lots || lots.length === 0) continue;

        const existingLots = await storage.getTaxLotsByWalletBalance(userId, wb.id);
        if (existingLots.length > 0) {
          results.push({
            symbol: sym,
            walletBalance: wb.id,
            wallet: walletMap.get(wb.walletId)?.label || "Unknown",
            status: "skipped",
            reason: `Already has ${existingLots.length} purchase lots`,
          });
          continue;
        }

        const walletBalance = parseFloat(wb.balance);
        const lotsWithPrice = lots.filter(l => l.purchasePrice > 0);

        lotsWithPrice.sort((a, b) => {
          const da = a.tradeDate || "0";
          const db = b.tradeDate || "0";
          return da.localeCompare(db);
        });

        let lotsCreated = 0;
        let totalCost = 0;
        let totalQty = 0;

        for (const lot of lotsWithPrice) {
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

          await storage.createTaxLot({
            userId,
            walletBalanceId: wb.id,
            assetSymbol: sym,
            acquiredDate,
            originalQuantity: lot.quantity.toString(),
            remainingQuantity: lot.quantity.toString(),
            costBasisPerUnit: lot.purchasePrice.toString(),
            note: lot.comment ? `Yahoo CSV: ${lot.comment}` : "Yahoo CSV import",
          });

          totalCost += lot.quantity * lot.purchasePrice;
          totalQty += lot.quantity;
          lotsCreated++;
        }

        for (const lot of lots.filter(l => l.purchasePrice === 0)) {
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

          await storage.createTaxLot({
            userId,
            walletBalanceId: wb.id,
            assetSymbol: sym,
            acquiredDate,
            originalQuantity: lot.quantity.toString(),
            remainingQuantity: lot.quantity.toString(),
            costBasisPerUnit: "0",
            note: lot.comment ? `Yahoo CSV (free/airdrop): ${lot.comment}` : "Yahoo CSV (free/airdrop)",
          });

          totalQty += lot.quantity;
          lotsCreated++;
        }

        if (totalQty > 0) {
          const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
          await storage.updateWalletBalanceCostData(wb.id, avgCost.toFixed(8), totalCost.toFixed(2));
        }

        const wallet = walletMap.get(wb.walletId);
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
          walletQuantity: walletBalance.toFixed(2),
        });

        totalLotsCreated += lotsCreated;
        totalAssetsMatched++;
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
      const totalCost = updatedLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const totalQty = updatedLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity), 0);
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

      const rawWalletBalsForPortfolio = await storage.getWalletBalancesByUser(userId);
      const enrichedWalletBals = await enrichWalletBalances(rawWalletBalsForPortfolio);
      const userWalletsForPortfolio = await storage.getWalletsByUser(userId);

      const walletPositions = enrichedWalletBals.map((wb) => {
        const wallet = userWalletsForPortfolio.find((w: any) => w.id === wb.walletId);
        const usdVal = parseFloat(wb.usdValue || "0");
        const bal = parseFloat(wb.balance);
        const price = bal > 0 ? usdVal / bal : 0;
        const avgCost = parseFloat(wb.averageCost || "0");
        const costBasis = parseFloat(wb.totalCostBasis || "0");
        const gainLoss = costBasis > 0 ? usdVal - costBasis : 0;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
        totalValue += usdVal;
        if (costBasis > 0) totalCostBasis += costBasis;
        return {
          id: wb.id,
          userId: wb.userId,
          accountId: wb.walletId,
          assetSymbol: wb.assetSymbol,
          quantity: wb.balance,
          averageCost: avgCost.toString(),
          totalCostBasis: costBasis.toFixed(2),
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
      });

      const accounts = await storage.getAccountsByUser(userId);
      const accountMap = new Map(accounts.map(a => [a.id, a]));
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
      }), ...walletPositions];

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

      if (!plan || !["monthly", "yearly"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Use 'monthly' or 'yearly'." });
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

      const usdAmount = plan === "yearly" ? 79 : 9;

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
    statementUploads: number | null;
    statementComparisons: boolean;
    portfolioSearch: boolean;
    recommendationsHub: "basic" | "full";
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
        statementUploads: limits.statementUploads,
        statementComparisons: limits.statementComparisons,
        portfolioSearch: limits.portfolioSearch,
        recommendationsHub: limits.recommendationsHub,
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

            const MAX_PRICE_LOOKUPS = 60;
            const priceMap = new Map<string, number>();
            const asset = chain === "ethereum" ? "ETH" : chain === "xrp" ? "XRP" : "BTC";
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
              const pricePerUnit = priceMap.get(dayKey) || 0;
              const totalValue = tx.quantity * pricePerUnit;
              const txType = isOwnTransfer ? "transfer" : (tx.type === "receive" ? "buy" : "sell");

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
                notes: isOwnTransfer
                  ? `Transfer between own wallets (${chainName})`
                  : `Imported from ${chainName} blockchain`,
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
                const aggregateCost = allLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity) * parseFloat(l.costBasisPerUnit), 0);
                const aggregateQty = allLots.reduce((sum, l) => sum + parseFloat(l.originalQuantity), 0);
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

      const updatedWallet = await storage.getWallet(wallet.id);
      const updatedBalances = await storage.getWalletBalances(wallet.id);
      res.json({ ...updatedWallet, balances: updatedBalances, newTransactions, correctedChain: correctedChain || undefined });
    } catch (error) {
      console.error("Sync wallet error:", error);
      res.status(500).json({ message: "Failed to sync wallet" });
    }
  });

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
      res.json({ message: "Wallet label updated" });
    } catch (error) {
      console.error("Rename wallet error:", error);
      res.status(500).json({ message: "Failed to rename wallet" });
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
      const matching = userWallets.filter(w => w.label === fromLabel);
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

      if (limits.statementUploads !== null) {
        const currentCount = await storage.countStatementUploadsByUser(userId);
        if (currentCount >= limits.statementUploads) {
          return res.status(403).json({
            message: "Statement Insights is a Premium feature. Upgrade to Premium for unlimited uploads and comparison insights.",
          });
        }
      }

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

        let comparisons: any[] = [];
        if (limits.statementComparisons) {
          comparisons = savedProducts.map((p) =>
            generateComparisons({
              productType: p.productType,
              institutionName: p.institutionName,
              balance: p.balance ? parseFloat(p.balance) : null,
              interestRate: p.interestRate ? parseFloat(p.interestRate) : null,
              apy: p.apy ? parseFloat(p.apy) : null,
              maturityDate: p.maturityDate?.toISOString() ?? null,
              term: p.term,
              isLocked: p.isLocked ?? false,
            })
          );
        }

        res.json({
          upload: { ...upload, status: "complete", productCount: products.length },
          products: savedProducts,
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

  app.get("/api/statements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const uploads = await storage.getStatementUploadsByUser(userId);
      res.json(uploads);
    } catch (error) {
      console.error("Get statements error:", error);
      res.status(500).json({ message: "Failed to load statements" });
    }
  });

  app.get("/api/statements/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const upload = await storage.getStatementUpload(req.params.id);

      if (!upload || upload.userId !== userId) {
        return res.status(404).json({ message: "Statement not found" });
      }

      const products = await storage.getProductsByUpload(upload.id);
      const { tier } = await getEffectiveTier(userId);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      let comparisons: any[] = [];
      if (limits.statementComparisons) {
        const { generateComparisons } = await import("./services/comparison-engine");
        comparisons = products.map((p) =>
          generateComparisons({
            productType: p.productType,
            institutionName: p.institutionName,
            balance: p.balance ? parseFloat(p.balance) : null,
            interestRate: p.interestRate ? parseFloat(p.interestRate) : null,
            apy: p.apy ? parseFloat(p.apy) : null,
            maturityDate: p.maturityDate?.toISOString() ?? null,
            term: p.term,
            isLocked: p.isLocked ?? false,
          })
        );
      }

      res.json({
        upload,
        products,
        comparisons: limits.statementComparisons ? comparisons : null,
        comparisonsLocked: !limits.statementComparisons,
      });
    } catch (error) {
      console.error("Get statement detail error:", error);
      res.status(500).json({ message: "Failed to load statement details" });
    }
  });

  app.delete("/api/statements/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const upload = await storage.getStatementUpload(req.params.id);

      if (!upload || upload.userId !== userId) {
        return res.status(404).json({ message: "Statement not found" });
      }

      const TYPE_SHORT: Record<string, string> = {
        cd: "CD", savings: "SAVE", money_market: "MM", checking: "CHK",
        bond: "BOND", brokerage: "INVEST", other: "ACCT",
      };

      const products = await storage.getProductsByUpload(upload.id);
      const accounts = await storage.getAccountsByUser(userId);
      let removedCount = 0;

      for (const product of products) {
        const institution = product.institutionName || "Manual";
        const tag = TYPE_SHORT[product.productType] || "ACCT";
        const prefix = institution.replace(/[^A-Za-z0-9]/g, "").substring(0, 10).toUpperCase();

        let symbol = `${prefix}-${tag}`;
        if (product.rawDescription && product.rawDescription.length < 60) {
          const descTag = product.rawDescription.replace(/[^A-Za-z0-9]/g, "").substring(0, 12).toUpperCase();
          if (descTag && descTag.length > 0) {
            symbol = `${prefix}-${descTag}`;
          }
        }

        const accountName = institution;
        const account = accounts.find(a => a.provider === "manual" && a.accountName === accountName);
        if (account) {
          const position = await storage.getPositionByUserAndAsset(userId, account.id, symbol);
          if (position) {
            await storage.deletePosition(position.id);
            removedCount++;
          }
        }
      }

      await storage.deleteStatementUpload(upload.id);
      res.json({ message: "Statement deleted", removedPositions: removedCount });
    } catch (error) {
      console.error("Delete statement error:", error);
      res.status(500).json({ message: "Failed to delete statement" });
    }
  });

  app.get("/api/market-data/prices", isAuthenticated, async (_req: any, res) => {
    try {
      const { getCachedPrices } = await import("./services/market-data");
      const prices = await getCachedPrices();
      res.json(prices);
    } catch (error) {
      console.error("Market data prices error:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  app.get("/api/market-data/yields", isAuthenticated, async (_req: any, res) => {
    try {
      const { getCachedYields } = await import("./services/market-data");
      const yields = await getCachedYields();
      res.json(yields);
    } catch (error) {
      console.error("Market data yields error:", error);
      res.status(500).json({ message: "Failed to fetch yields" });
    }
  });

  app.post("/api/market-data/refresh", isAuthenticated, async (_req: any, res) => {
    try {
      const { refreshAllMarketData, getCachedPrices, getCachedYields } = await import("./services/market-data");
      const { checkAndSendAlerts, sendWeeklyDigest } = await import("./services/email-service");
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
      const { isEmailConfigured } = await import("./services/email-service");
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
      const { sendTestEmail, isEmailConfigured } = await import("./services/email-service");
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

  startPriceAlertChecker();
  seedPriceCache();

  const { startMarketDataScheduler } = await import("./services/market-data");
  startMarketDataScheduler(2);

  return httpServer;
}

async function seedPriceCache() {
  try {
    const existing = await db.select().from(priceCacheTable);
    if (existing.length > 10) {
      console.log(`Price cache already seeded with ${existing.length} entries`);
      return;
    }
    console.log("Seeding price cache from CoinGecko...");
    const allSymbols = Object.keys(COINGECKO_ASSET_MAP);
    const batchSize = 50;
    for (let i = 0; i < allSymbols.length; i += batchSize) {
      const batch = allSymbols.slice(i, i + batchSize);
      const prices = await fetchCurrentPrices(batch);
      if (Object.keys(prices).length > 0) {
        await savePricesToDb(prices);
      }
      if (i + batchSize < allSymbols.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    const count = (await db.select().from(priceCacheTable)).length;
    console.log(`Price cache seeded with ${count} entries`);
  } catch (err) {
    console.error("Price cache seeding error:", err);
  }
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

async function savePricesToDb(prices: Record<string, number>): Promise<void> {
  try {
    const entries = Object.entries(prices).filter(([, v]) => v > 0);
    for (const [symbol, price] of entries) {
      await db.insert(priceCacheTable)
        .values({ symbol: symbol.toUpperCase(), priceUsd: price.toString() })
        .onConflictDoUpdate({
          target: priceCacheTable.symbol,
          set: { priceUsd: price.toString(), updatedAt: new Date() },
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
  const coingeckoIds = assets
    .map((a) => COINGECKO_ASSET_MAP[a.toUpperCase()])
    .filter(Boolean);

  if (coingeckoIds.length === 0) return {};

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(",")}&vs_currencies=usd`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error("CoinGecko API error:", response.status, "- falling back to cached prices");
      return await loadPricesFromDb(assets);
    }
    const data = await response.json();
    const prices: Record<string, number> = {};
    for (const [symbol, cgId] of Object.entries(COINGECKO_ASSET_MAP)) {
      if (data[cgId]?.usd !== undefined) {
        prices[symbol] = data[cgId].usd;
      }
    }
    if (Object.keys(prices).length > 0) {
      savePricesToDb(prices);
    }
    return prices;
  } catch (error) {
    console.error("Failed to fetch prices from CoinGecko, falling back to cached:", error);
    return await loadPricesFromDb(assets);
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

  import("./services/crypto-payment-verifier").then(({ startCryptoPaymentVerifier }) => {
    startCryptoPaymentVerifier();
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

      const fs = await import("fs");
      const pathMod = await import("path");
      const jsonPath = pathMod.resolve("server/data/yahoo-csv-lots.json");
      const csvPath = pathMod.resolve("attached_assets/portfolio_(1)_1772983040841.csv");
      let lotsData: [string, string, number, number, string][] = [];
      if (fs.existsSync(jsonPath)) {
        lotsData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      } else if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, "utf-8");
        const csvLines = csvContent.trim().split("\n");
        for (let i = 1; i < csvLines.length; i++) {
          const parts = csvLines[i].split(",");
          const sym = (parts[0] || "").replace("-USD", "");
          const td = parts[9] || "";
          const pp = parseFloat(parts[10] || "0");
          const qty = parseFloat(parts[11] || "0");
          const comment = (parts[15] || "").trim();
          if (sym && qty > 0) lotsData.push([sym, td, pp, qty, comment]);
        }
      }
      if (lotsData.length > 0) {
        interface MigLot { symbol: string; tradeDate: string; purchasePrice: number; quantity: number; comment: string; }
        const csvLots: MigLot[] = lotsData.map(([symbol, tradeDate, purchasePrice, quantity, comment]) => ({ symbol, tradeDate, purchasePrice, quantity, comment }));
        const csvBySymbol: Record<string, MigLot[]> = {};
        for (const lot of csvLots) {
          if (!csvBySymbol[lot.symbol]) csvBySymbol[lot.symbol] = [];
          csvBySymbol[lot.symbol].push(lot);
        }

        const allWB = await storage.getWalletBalancesByUser(ADMIN_USER_ID);
        let totalCreated = 0;
        let assetsMatched = 0;
        for (const wb of allWB) {
          const sym = wb.assetSymbol.replace(" (staked)", "");
          const lots = csvBySymbol[sym];
          if (!lots || lots.length === 0) continue;
          const existing = await storage.getTaxLotsByWalletBalance(ADMIN_USER_ID, wb.id);
          if (existing.length > 0) continue;

          let totalCost = 0, totalQty = 0;
          for (const lot of lots) {
            let acquiredDate: Date;
            if (lot.tradeDate && lot.tradeDate.length === 8) {
              const y = lot.tradeDate.slice(0, 4), m = lot.tradeDate.slice(4, 6), d = lot.tradeDate.slice(6, 8);
              acquiredDate = new Date(`${y}-${m}-${d}T00:00:00Z`);
            } else {
              acquiredDate = new Date();
            }
            await storage.createTaxLot({
              userId: ADMIN_USER_ID,
              walletBalanceId: wb.id,
              assetSymbol: sym,
              acquiredDate,
              originalQuantity: lot.quantity.toString(),
              remainingQuantity: lot.quantity.toString(),
              costBasisPerUnit: lot.purchasePrice.toString(),
              note: lot.purchasePrice === 0
                ? (lot.comment ? `Yahoo CSV (reward): ${lot.comment}` : "Yahoo CSV (reward)")
                : (lot.comment ? `Yahoo CSV: ${lot.comment}` : "Yahoo CSV import"),
            });
            totalCost += lot.quantity * lot.purchasePrice;
            totalQty += lot.quantity;
            totalCreated++;
          }
          if (totalQty > 0) {
            const avgCost = totalCost / totalQty;
            await storage.updateWalletBalanceCostData(wb.id, avgCost.toFixed(8), totalCost.toFixed(2));
          }
          assetsMatched++;
        }
        if (totalCreated > 0) {
          console.log(`[migration] Yahoo CSV: ${assetsMatched} assets matched, ${totalCreated} purchase lots created`);
        } else {
          console.log("[migration] Yahoo CSV: no new lots to create (already imported or no matches)");
        }
      }
    } catch (err) {
      console.error("[migration] Startup migration error:", err);
    }
  }, 5000);
}
