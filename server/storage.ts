import {
  apiCredentials,
  accounts,
  transactions,
  positions,
  taxLots,
  gainEvents,
  userSettings,
  assets,
  priceHistory,
  priceAlerts,
  wallets,
  walletBalances,
  statementUploads,
  statementProducts,
  marketCache,
  emailConfig,
  alertLog,
  type ApiCredential,
  type InsertApiCredential,
  type Account,
  type InsertAccount,
  type Transaction,
  type InsertTransaction,
  type Position,
  type InsertPosition,
  type TaxLot,
  type InsertTaxLot,
  type GainEvent,
  type InsertGainEvent,
  type UserSettings,
  type InsertUserSettings,
  type Asset,
  type InsertAsset,
  type PriceAlert,
  type InsertPriceAlert,
  type Wallet,
  type InsertWallet,
  type WalletBalance,
  type InsertWalletBalance,
  type StatementUpload,
  type InsertStatementUpload,
  type StatementProduct,
  type InsertStatementProduct,
  type MarketCache,
  type EmailConfig,
  type AlertLog,
  cryptoPaymentAddresses,
  cryptoPayments,
  renewalNotifications,
  type CryptoPaymentAddress,
  type InsertCryptoPaymentAddress,
  type CryptoPayment,
  type InsertCryptoPayment,
  type RenewalNotification,
  type InsertRenewalNotification,
  userWallets,
  type UserWallet,
  type InsertUserWallet,
  scheduledPayments,
  paymentExecutions,
  portfolioSnapshots,
  type ScheduledPayment,
  type InsertScheduledPayment,
  type PaymentExecution,
  type InsertPaymentExecution,
  type PortfolioSnapshot,
  whaleAlerts,
  whaleAlertSettings,
  type WhaleAlert,
  type InsertWhaleAlert,
  type WhaleAlertSettings,
  type InsertWhaleAlertSettings,
  errorLogs,
  type ErrorLog,
  type InsertErrorLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sql } from "drizzle-orm";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.SESSION_SECRET!;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface IStorage {
  createApiCredential(credential: InsertApiCredential): Promise<ApiCredential>;
  getApiCredentialsByUser(userId: string): Promise<ApiCredential[]>;
  getApiCredential(id: string): Promise<ApiCredential | undefined>;
  updateApiCredential(id: string, data: Partial<ApiCredential>): Promise<ApiCredential | undefined>;
  deleteApiCredential(id: string): Promise<void>;

  createAccount(account: InsertAccount): Promise<Account>;
  getAccountsByUser(userId: string): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  deleteAccountWithData(accountId: string): Promise<void>;

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;

  createPosition(position: InsertPosition): Promise<Position>;
  getPositionsByUser(userId: string): Promise<Position[]>;
  getActivePositionsByUser(userId: string): Promise<Position[]>;
  updatePosition(id: string, data: Partial<Position>): Promise<Position | undefined>;
  getPositionByUserAndAsset(userId: string, accountId: string, assetSymbol: string): Promise<Position | undefined>;
  deletePosition(id: string): Promise<void>;
  markPositionAddressed(id: string, addressed: boolean): Promise<void>;

  createTaxLot(taxLot: InsertTaxLot): Promise<TaxLot>;
  getTaxLotsByUser(userId: string): Promise<TaxLot[]>;
  getTaxLotsByAsset(userId: string, assetSymbol: string): Promise<TaxLot[]>;
  getTaxLotsByWalletBalance(userId: string, walletBalanceId: string): Promise<TaxLot[]>;
  updateTaxLot(id: string, data: Partial<TaxLot>): Promise<TaxLot | undefined>;
  deleteTaxLot(id: string): Promise<void>;

  createGainEvent(gainEvent: InsertGainEvent): Promise<GainEvent>;
  getGainEventsByUser(userId: string): Promise<GainEvent[]>;
  getGainEventsByYear(userId: string, year: number): Promise<GainEvent[]>;

  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;

  createAsset(asset: InsertAsset): Promise<Asset>;
  getAsset(symbol: string): Promise<Asset | undefined>;
  updateAssetPrice(symbol: string, price: string): Promise<void>;
  getAllAssets(): Promise<Asset[]>;

  createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  getPriceAlertsByUser(userId: string): Promise<PriceAlert[]>;
  getPriceAlert(id: number): Promise<PriceAlert | undefined>;
  deletePriceAlert(id: number): Promise<void>;
  getActivePriceAlerts(): Promise<PriceAlert[]>;
  markPriceAlertTriggered(id: number): Promise<void>;
  countActiveAlertsByUser(userId: string): Promise<number>;

  createWallet(wallet: InsertWallet): Promise<Wallet>;
  getWalletsByUser(userId: string): Promise<Wallet[]>;
  getWallet(id: string): Promise<Wallet | undefined>;
  deleteWallet(id: string): Promise<void>;
  updateWalletSyncTime(id: string): Promise<void>;
  updateWalletLabel(id: string, label: string): Promise<void>;

  upsertWalletBalance(balance: InsertWalletBalance): Promise<WalletBalance>;
  updateWalletBalanceCostData(id: string, averageCost: string, totalCostBasis: string): Promise<void>;
  getWalletBalances(walletId: string): Promise<WalletBalance[]>;
  getWalletBalancesByUser(userId: string): Promise<WalletBalance[]>;
  deleteWalletBalances(walletId: string): Promise<void>;

  createStatementUpload(upload: InsertStatementUpload): Promise<StatementUpload>;
  updateStatementUpload(id: string, data: Partial<StatementUpload>): Promise<StatementUpload | undefined>;
  getStatementUploadsByUser(userId: string): Promise<StatementUpload[]>;
  getStatementUpload(id: string): Promise<StatementUpload | undefined>;
  deleteStatementUpload(id: string): Promise<void>;
  countStatementUploadsByUser(userId: string): Promise<number>;

  createStatementProduct(product: InsertStatementProduct): Promise<StatementProduct>;
  getProductsByUpload(uploadId: string): Promise<StatementProduct[]>;
  getProductsByUser(userId: string): Promise<StatementProduct[]>;

  getMarketCache(category: string, symbol: string): Promise<MarketCache | undefined>;
  getAllMarketCacheByCategory(category: string): Promise<MarketCache[]>;
  upsertMarketCache(category: string, symbol: string, data: any): Promise<MarketCache>;
  getEmailConfigByUser(userId: string): Promise<EmailConfig | undefined>;
  upsertEmailConfig(userId: string, data: { email: string; enabled?: boolean | null; alertTypes?: string | null; lastSentAt?: Date | null }): Promise<EmailConfig>;
  getAllEmailConfigs(): Promise<EmailConfig[]>;
  createAlertLog(data: { alertType: string; message: string; userId?: string | null }): Promise<AlertLog>;
  getAlertLogsByUser(userId: string, limit: number): Promise<AlertLog[]>;

  getCryptoPaymentAddresses(activeOnly?: boolean): Promise<CryptoPaymentAddress[]>;
  createCryptoPaymentAddress(address: InsertCryptoPaymentAddress): Promise<CryptoPaymentAddress>;
  deleteCryptoPaymentAddress(id: number): Promise<void>;
  createCryptoPayment(payment: InsertCryptoPayment): Promise<CryptoPayment>;
  getCryptoPayment(id: string): Promise<CryptoPayment | undefined>;
  getCryptoPaymentsByUser(userId: string): Promise<CryptoPayment[]>;
  getPendingCryptoPayments(): Promise<CryptoPayment[]>;
  updateCryptoPaymentStatus(id: string, status: string, txHash?: string): Promise<CryptoPayment | undefined>;
  getRecentCryptoPayments(limit: number): Promise<CryptoPayment[]>;

  getExpiringCryptoSubscriptions(withinDays: number): Promise<UserSettings[]>;
  createRenewalNotification(notification: InsertRenewalNotification): Promise<RenewalNotification>;
  getRenewalNotificationsByUser(userId: string): Promise<RenewalNotification[]>;
  hasRecentRenewalNotification(userId: string, type: string, withinHours: number): Promise<boolean>;

  createUserWallet(wallet: InsertUserWallet): Promise<UserWallet>;
  getUserWallets(userId: string): Promise<UserWallet[]>;
  getUserWallet(id: string): Promise<UserWallet | undefined>;
  updateUserWallet(id: string, data: Partial<UserWallet>): Promise<UserWallet | undefined>;
  deleteUserWallet(id: string): Promise<void>;
  getUserWalletsByPurpose(userId: string, purpose: string): Promise<UserWallet[]>;

  createScheduledPayment(payment: InsertScheduledPayment): Promise<ScheduledPayment>;
  getScheduledPaymentsByUser(userId: string): Promise<ScheduledPayment[]>;
  getScheduledPayment(id: string): Promise<ScheduledPayment | undefined>;
  updateScheduledPayment(id: string, data: Partial<ScheduledPayment>): Promise<ScheduledPayment | undefined>;
  deleteScheduledPayment(id: string): Promise<void>;
  getDueScheduledPayments(): Promise<ScheduledPayment[]>;

  createPaymentExecution(execution: InsertPaymentExecution): Promise<PaymentExecution>;
  getPaymentExecutionsByScheduled(scheduledPaymentId: string): Promise<PaymentExecution[]>;
  getPaymentExecutionsByUser(userId: string): Promise<PaymentExecution[]>;
  updatePaymentExecution(id: string, data: Partial<PaymentExecution>): Promise<PaymentExecution | undefined>;

  createPortfolioSnapshot(data: { userId: string; token: string; totalValue: string; holdings: any; businessName?: string; businessLogo?: string; expiresAt: Date }): Promise<PortfolioSnapshot>;
  getPortfolioSnapshotByToken(token: string): Promise<PortfolioSnapshot | undefined>;
  getPortfolioSnapshotsByUser(userId: string): Promise<PortfolioSnapshot[]>;
  deletePortfolioSnapshot(id: string, userId: string): Promise<void>;

  createWhaleAlert(alert: InsertWhaleAlert): Promise<WhaleAlert | undefined>;
  getWhaleAlerts(limit: number, since?: Date, xrpThreshold?: number, rlusdThreshold?: number): Promise<WhaleAlert[]>;
  getWhaleAlertSettings(userId: string): Promise<WhaleAlertSettings | undefined>;
  upsertWhaleAlertSettings(userId: string, data: { xrpThreshold?: string; rlusdThreshold?: string; enabled?: boolean }): Promise<WhaleAlertSettings>;

  createErrorLog(data: InsertErrorLog): Promise<ErrorLog>;
  getErrorLogs(options: { limit?: number; offset?: number; source?: string; status?: string; search?: string }): Promise<ErrorLog[]>;
  getErrorLogById(id: string): Promise<ErrorLog | undefined>;
  updateErrorLogStatus(id: string, status: string): Promise<ErrorLog | undefined>;
  getErrorStats(): Promise<{ totalToday: number; uniqueToday: number; mostFrequent: { fingerprint: string; message: string; count: number } | null }>;
  getErrorLogCount(options: { source?: string; status?: string; search?: string }): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async createApiCredential(credential: InsertApiCredential): Promise<ApiCredential> {
    const encryptedKey = encrypt(credential.apiKey);
    const encryptedSecret = encrypt(credential.apiSecret);
    
    const [result] = await db
      .insert(apiCredentials)
      .values({
        ...credential,
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
      })
      .returning();
    return result;
  }

  async getApiCredentialsByUser(userId: string): Promise<ApiCredential[]> {
    return db.select().from(apiCredentials).where(eq(apiCredentials.userId, userId));
  }

  async getApiCredential(id: string): Promise<ApiCredential | undefined> {
    const [result] = await db.select().from(apiCredentials).where(eq(apiCredentials.id, id));
    return result;
  }

  async updateApiCredential(id: string, data: Partial<ApiCredential>): Promise<ApiCredential | undefined> {
    const updateData: Partial<ApiCredential> & { updatedAt: Date } = { 
      ...data, 
      updatedAt: new Date() 
    };
    
    if (data.apiKey) {
      updateData.apiKey = encrypt(data.apiKey);
    }
    if (data.apiSecret) {
      updateData.apiSecret = encrypt(data.apiSecret);
    }
    
    const [result] = await db
      .update(apiCredentials)
      .set(updateData)
      .where(eq(apiCredentials.id, id))
      .returning();
    return result;
  }

  async deleteApiCredential(id: string): Promise<void> {
    await db.delete(apiCredentials).where(eq(apiCredentials.id, id));
  }

  async deleteAccountWithData(accountId: string): Promise<void> {
    await db.delete(positions).where(eq(positions.accountId, accountId));
    await db.delete(transactions).where(eq(transactions.accountId, accountId));
    await db.delete(accounts).where(eq(accounts.id, accountId));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [result] = await db.insert(accounts).values(account).returning();
    return result;
  }

  async getAccountsByUser(userId: string): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const [result] = await db.select().from(accounts).where(eq(accounts.id, id));
    return result;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [result] = await db.insert(transactions).values(transaction).returning();
    return result;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [result] = await db.select().from(transactions).where(eq(transactions.id, id));
    return result;
  }

  async getTransactionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      )
      .orderBy(transactions.transactionDate);
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [result] = await db.insert(positions).values(position).returning();
    return result;
  }

  async getPositionsByUser(userId: string): Promise<Position[]> {
    return db.select().from(positions).where(eq(positions.userId, userId));
  }

  async getActivePositionsByUser(userId: string): Promise<Position[]> {
    return db.select().from(positions).where(
      and(eq(positions.userId, userId), eq(positions.isAddressed, false))
    );
  }

  async updatePosition(id: string, data: Partial<Position>): Promise<Position | undefined> {
    const [result] = await db
      .update(positions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning();
    return result;
  }

  async getPositionByUserAndAsset(
    userId: string,
    accountId: string,
    assetSymbol: string
  ): Promise<Position | undefined> {
    const [result] = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.userId, userId),
          eq(positions.accountId, accountId),
          eq(positions.assetSymbol, assetSymbol)
        )
      );
    return result;
  }

  async deletePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

  async markPositionAddressed(id: string, addressed: boolean): Promise<void> {
    await db.update(positions).set({ isAddressed: addressed, updatedAt: new Date() }).where(eq(positions.id, id));
  }

  async createTaxLot(taxLot: InsertTaxLot): Promise<TaxLot> {
    const [result] = await db.insert(taxLots).values(taxLot).returning();
    return result;
  }

  async getTaxLotsByUser(userId: string): Promise<TaxLot[]> {
    return db.select().from(taxLots).where(eq(taxLots.userId, userId));
  }

  async getTaxLotsByAsset(userId: string, assetSymbol: string): Promise<TaxLot[]> {
    return db
      .select()
      .from(taxLots)
      .where(and(eq(taxLots.userId, userId), eq(taxLots.assetSymbol, assetSymbol)))
      .orderBy(taxLots.acquiredDate);
  }

  async getTaxLotsByWalletBalance(userId: string, walletBalanceId: string): Promise<TaxLot[]> {
    return db
      .select()
      .from(taxLots)
      .where(and(eq(taxLots.userId, userId), eq(taxLots.walletBalanceId, walletBalanceId)))
      .orderBy(taxLots.acquiredDate);
  }

  async updateTaxLot(id: string, data: Partial<TaxLot>): Promise<TaxLot | undefined> {
    const [result] = await db
      .update(taxLots)
      .set(data)
      .where(eq(taxLots.id, id))
      .returning();
    return result;
  }

  async deleteTaxLot(id: string): Promise<void> {
    await db.delete(taxLots).where(eq(taxLots.id, id));
  }

  async createGainEvent(gainEvent: InsertGainEvent): Promise<GainEvent> {
    const [result] = await db.insert(gainEvents).values(gainEvent).returning();
    return result;
  }

  async getGainEventsByUser(userId: string): Promise<GainEvent[]> {
    return db.select().from(gainEvents).where(eq(gainEvents.userId, userId));
  }

  async getGainEventsByYear(userId: string, year: number): Promise<GainEvent[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    return db
      .select()
      .from(gainEvents)
      .where(
        and(
          eq(gainEvents.userId, userId),
          gte(gainEvents.soldDate, startDate),
          lte(gainEvents.soldDate, endDate)
        )
      )
      .orderBy(desc(gainEvents.soldDate));
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [result] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return result;
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [result] = await db
      .insert(userSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...settings, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [result] = await db.insert(assets).values(asset).returning();
    return result;
  }

  async getAsset(symbol: string): Promise<Asset | undefined> {
    const [result] = await db.select().from(assets).where(eq(assets.symbol, symbol));
    return result;
  }

  async updateAssetPrice(symbol: string, price: string): Promise<void> {
    await db
      .update(assets)
      .set({ currentPrice: price, priceUpdatedAt: new Date() })
      .where(eq(assets.symbol, symbol));
  }

  async getAllAssets(): Promise<Asset[]> {
    return db.select().from(assets);
  }

  async createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    const [result] = await db.insert(priceAlerts).values(alert).returning();
    return result;
  }

  async getPriceAlertsByUser(userId: string): Promise<PriceAlert[]> {
    return db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, userId))
      .orderBy(desc(priceAlerts.createdAt));
  }

  async getPriceAlert(id: number): Promise<PriceAlert | undefined> {
    const [result] = await db.select().from(priceAlerts).where(eq(priceAlerts.id, id));
    return result;
  }

  async deletePriceAlert(id: number): Promise<void> {
    await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
  }

  async getActivePriceAlerts(): Promise<PriceAlert[]> {
    return db
      .select()
      .from(priceAlerts)
      .where(and(eq(priceAlerts.isActive, true), eq(priceAlerts.triggered, false)));
  }

  async markPriceAlertTriggered(id: number): Promise<void> {
    await db
      .update(priceAlerts)
      .set({ triggered: true, isActive: false, triggeredAt: new Date() })
      .where(eq(priceAlerts.id, id));
  }

  async countActiveAlertsByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, userId),
          eq(priceAlerts.isActive, true),
          eq(priceAlerts.triggered, false)
        )
      );
    return result[0]?.count || 0;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [result] = await db.insert(wallets).values(wallet).returning();
    return result;
  }

  async getWalletsByUser(userId: string): Promise<Wallet[]> {
    return db.select().from(wallets).where(eq(wallets.userId, userId)).orderBy(desc(wallets.createdAt));
  }

  async getWallet(id: string): Promise<Wallet | undefined> {
    const [result] = await db.select().from(wallets).where(eq(wallets.id, id));
    return result;
  }

  async deleteWallet(id: string): Promise<void> {
    await db.delete(walletBalances).where(eq(walletBalances.walletId, id));
    await db.delete(wallets).where(eq(wallets.id, id));
  }

  async updateWalletSyncTime(id: string): Promise<void> {
    await db.update(wallets).set({ lastSyncAt: new Date() }).where(eq(wallets.id, id));
  }

  async updateWalletLabel(id: string, label: string): Promise<void> {
    await db.update(wallets).set({ label }).where(eq(wallets.id, id));
  }

  async upsertWalletBalance(balance: InsertWalletBalance): Promise<WalletBalance> {
    const existing = await db
      .select()
      .from(walletBalances)
      .where(
        and(
          eq(walletBalances.walletId, balance.walletId),
          eq(walletBalances.assetSymbol, balance.assetSymbol)
        )
      );

    if (existing.length > 0) {
      const [result] = await db
        .update(walletBalances)
        .set({ balance: balance.balance, usdValue: balance.usdValue, updatedAt: new Date() })
        .where(eq(walletBalances.id, existing[0].id))
        .returning();
      return result;
    }

    const [result] = await db.insert(walletBalances).values(balance).returning();
    return result;
  }

  async updateWalletBalanceCostData(id: string, averageCost: string, totalCostBasis: string): Promise<void> {
    await db.update(walletBalances).set({ averageCost, totalCostBasis }).where(eq(walletBalances.id, id));
  }

  async getWalletBalances(walletId: string): Promise<WalletBalance[]> {
    return db.select().from(walletBalances).where(eq(walletBalances.walletId, walletId));
  }

  async getWalletBalancesByUser(userId: string): Promise<WalletBalance[]> {
    return db.select().from(walletBalances).where(eq(walletBalances.userId, userId));
  }

  async deleteWalletBalances(walletId: string): Promise<void> {
    await db.delete(walletBalances).where(eq(walletBalances.walletId, walletId));
  }

  async createStatementUpload(upload: InsertStatementUpload): Promise<StatementUpload> {
    const [result] = await db.insert(statementUploads).values(upload).returning();
    return result;
  }

  async updateStatementUpload(id: string, data: Partial<StatementUpload>): Promise<StatementUpload | undefined> {
    const [result] = await db
      .update(statementUploads)
      .set(data)
      .where(eq(statementUploads.id, id))
      .returning();
    return result;
  }

  async getStatementUploadsByUser(userId: string): Promise<StatementUpload[]> {
    return db
      .select()
      .from(statementUploads)
      .where(eq(statementUploads.userId, userId))
      .orderBy(desc(statementUploads.uploadedAt));
  }

  async getStatementUpload(id: string): Promise<StatementUpload | undefined> {
    const [result] = await db.select().from(statementUploads).where(eq(statementUploads.id, id));
    return result;
  }

  async deleteStatementUpload(id: string): Promise<void> {
    await db.delete(statementProducts).where(eq(statementProducts.uploadId, id));
    await db.delete(statementUploads).where(eq(statementUploads.id, id));
  }

  async countStatementUploadsByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(statementUploads)
      .where(eq(statementUploads.userId, userId));
    return result[0]?.count || 0;
  }

  async createStatementProduct(product: InsertStatementProduct): Promise<StatementProduct> {
    const [result] = await db.insert(statementProducts).values(product).returning();
    return result;
  }

  async getProductsByUpload(uploadId: string): Promise<StatementProduct[]> {
    return db.select().from(statementProducts).where(eq(statementProducts.uploadId, uploadId));
  }

  async getProductsByUser(userId: string): Promise<StatementProduct[]> {
    return db.select().from(statementProducts).where(eq(statementProducts.userId, userId));
  }

  async getMarketCache(category: string, symbol: string): Promise<MarketCache | undefined> {
    const [result] = await db.select().from(marketCache)
      .where(and(eq(marketCache.category, category), eq(marketCache.symbol, symbol)));
    return result;
  }

  async getAllMarketCacheByCategory(category: string): Promise<MarketCache[]> {
    return db.select().from(marketCache).where(eq(marketCache.category, category));
  }

  async upsertMarketCache(category: string, symbol: string, data: any): Promise<MarketCache> {
    const existing = await this.getMarketCache(category, symbol);
    if (existing) {
      const [result] = await db.update(marketCache)
        .set({ data, updatedAt: new Date() })
        .where(eq(marketCache.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await db.insert(marketCache).values({ category, symbol, data }).returning();
    return result;
  }

  async getEmailConfigByUser(userId: string): Promise<EmailConfig | undefined> {
    const [result] = await db.select().from(emailConfig).where(eq(emailConfig.userId, userId));
    return result;
  }

  async upsertEmailConfig(userId: string, data: { email: string; enabled?: boolean | null; alertTypes?: string | null; lastSentAt?: Date | null }): Promise<EmailConfig> {
    const existing = await this.getEmailConfigByUser(userId);
    if (existing) {
      const [result] = await db.update(emailConfig)
        .set(data)
        .where(eq(emailConfig.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await db.insert(emailConfig).values({ userId, email: data.email, enabled: data.enabled ?? true, alertTypes: data.alertTypes ?? "apy_change,new_opportunity,weekly_digest" }).returning();
    return result;
  }

  async getAllEmailConfigs(): Promise<EmailConfig[]> {
    return db.select().from(emailConfig).where(eq(emailConfig.enabled, true));
  }

  async createAlertLog(data: { alertType: string; message: string; userId?: string | null }): Promise<AlertLog> {
    const [result] = await db.insert(alertLog).values(data).returning();
    return result;
  }

  async getAlertLogsByUser(userId: string, limit: number): Promise<AlertLog[]> {
    return db.select().from(alertLog).where(eq(alertLog.userId, userId)).orderBy(desc(alertLog.sentAt)).limit(limit);
  }

  async getCryptoPaymentAddresses(activeOnly = true): Promise<CryptoPaymentAddress[]> {
    if (activeOnly) {
      return db.select().from(cryptoPaymentAddresses).where(eq(cryptoPaymentAddresses.isActive, true));
    }
    return db.select().from(cryptoPaymentAddresses);
  }

  async createCryptoPaymentAddress(address: InsertCryptoPaymentAddress): Promise<CryptoPaymentAddress> {
    const [result] = await db.insert(cryptoPaymentAddresses).values(address).returning();
    return result;
  }

  async deleteCryptoPaymentAddress(id: number): Promise<void> {
    await db.delete(cryptoPaymentAddresses).where(eq(cryptoPaymentAddresses.id, id));
  }

  async createCryptoPayment(payment: InsertCryptoPayment): Promise<CryptoPayment> {
    const [result] = await db.insert(cryptoPayments).values(payment).returning();
    return result;
  }

  async getCryptoPayment(id: string): Promise<CryptoPayment | undefined> {
    const [result] = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, id));
    return result;
  }

  async getCryptoPaymentsByUser(userId: string): Promise<CryptoPayment[]> {
    return db.select().from(cryptoPayments).where(eq(cryptoPayments.userId, userId)).orderBy(desc(cryptoPayments.createdAt));
  }

  async getPendingCryptoPayments(): Promise<CryptoPayment[]> {
    return db.select().from(cryptoPayments).where(eq(cryptoPayments.status, "pending"));
  }

  async updateCryptoPaymentStatus(id: string, status: string, txHash?: string): Promise<CryptoPayment | undefined> {
    const updateData: Partial<CryptoPayment> = { status };
    if (txHash) updateData.txHash = txHash;
    if (status === "confirmed") updateData.confirmedAt = new Date();
    const [result] = await db.update(cryptoPayments).set(updateData).where(eq(cryptoPayments.id, id)).returning();
    return result;
  }

  async getRecentCryptoPayments(limit: number): Promise<CryptoPayment[]> {
    return db.select().from(cryptoPayments).orderBy(desc(cryptoPayments.createdAt)).limit(limit);
  }

  async getExpiringCryptoSubscriptions(withinDays: number): Promise<UserSettings[]> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + withinDays);
    return db.select().from(userSettings)
      .where(
        and(
          or(
            eq(userSettings.subscriptionTier, "premium"),
            eq(userSettings.subscriptionTier, "pro"),
          ),
          eq(userSettings.subscriptionPaymentMethod, "crypto"),
          lte(userSettings.subscriptionExpiresAt, deadline)
        )
      );
  }

  async createRenewalNotification(notification: InsertRenewalNotification): Promise<RenewalNotification> {
    const [result] = await db.insert(renewalNotifications).values(notification).returning();
    return result;
  }

  async getRenewalNotificationsByUser(userId: string): Promise<RenewalNotification[]> {
    return db.select().from(renewalNotifications)
      .where(eq(renewalNotifications.userId, userId))
      .orderBy(desc(renewalNotifications.sentAt));
  }

  async hasRecentRenewalNotification(userId: string, type: string, withinHours: number): Promise<boolean> {
    const since = new Date();
    since.setHours(since.getHours() - withinHours);
    const results = await db.select().from(renewalNotifications)
      .where(
        and(
          eq(renewalNotifications.userId, userId),
          eq(renewalNotifications.type, type),
          gte(renewalNotifications.sentAt, since)
        )
      );
    return results.length > 0;
  }

  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const [result] = await db.insert(userWallets).values(wallet).returning();
    return result;
  }

  async getUserWallets(userId: string): Promise<UserWallet[]> {
    return db.select().from(userWallets)
      .where(eq(userWallets.userId, userId))
      .orderBy(desc(userWallets.createdAt));
  }

  async getUserWallet(id: string): Promise<UserWallet | undefined> {
    const [result] = await db.select().from(userWallets)
      .where(eq(userWallets.id, id));
    return result;
  }

  async updateUserWallet(id: string, data: Partial<UserWallet>): Promise<UserWallet | undefined> {
    const [result] = await db.update(userWallets)
      .set(data)
      .where(eq(userWallets.id, id))
      .returning();
    return result;
  }

  async deleteUserWallet(id: string): Promise<void> {
    await db.delete(userWallets).where(eq(userWallets.id, id));
  }

  async getUserWalletsByPurpose(userId: string, purpose: string): Promise<UserWallet[]> {
    return db.select().from(userWallets)
      .where(and(eq(userWallets.userId, userId), eq(userWallets.purpose, purpose)));
  }

  async createScheduledPayment(payment: InsertScheduledPayment): Promise<ScheduledPayment> {
    const [result] = await db.insert(scheduledPayments).values(payment).returning();
    return result;
  }

  async getScheduledPaymentsByUser(userId: string): Promise<ScheduledPayment[]> {
    return db.select().from(scheduledPayments)
      .where(eq(scheduledPayments.userId, userId))
      .orderBy(desc(scheduledPayments.createdAt));
  }

  async getScheduledPayment(id: string): Promise<ScheduledPayment | undefined> {
    const [result] = await db.select().from(scheduledPayments)
      .where(eq(scheduledPayments.id, id));
    return result;
  }

  async updateScheduledPayment(id: string, data: Partial<ScheduledPayment>): Promise<ScheduledPayment | undefined> {
    const [result] = await db.update(scheduledPayments)
      .set(data)
      .where(eq(scheduledPayments.id, id))
      .returning();
    return result;
  }

  async deleteScheduledPayment(id: string): Promise<void> {
    await db.delete(paymentExecutions).where(eq(paymentExecutions.scheduledPaymentId, id));
    await db.delete(scheduledPayments).where(eq(scheduledPayments.id, id));
  }

  async getDueScheduledPayments(): Promise<ScheduledPayment[]> {
    return db.select().from(scheduledPayments)
      .where(
        and(
          eq(scheduledPayments.status, "active"),
          lte(scheduledPayments.nextRunAt, new Date())
        )
      );
  }

  async createPaymentExecution(execution: InsertPaymentExecution): Promise<PaymentExecution> {
    const [result] = await db.insert(paymentExecutions).values(execution).returning();
    return result;
  }

  async getPaymentExecutionsByScheduled(scheduledPaymentId: string): Promise<PaymentExecution[]> {
    return db.select().from(paymentExecutions)
      .where(eq(paymentExecutions.scheduledPaymentId, scheduledPaymentId))
      .orderBy(desc(paymentExecutions.executedAt));
  }

  async getPaymentExecutionsByUser(userId: string): Promise<PaymentExecution[]> {
    return db.select().from(paymentExecutions)
      .where(eq(paymentExecutions.userId, userId))
      .orderBy(desc(paymentExecutions.executedAt));
  }

  async updatePaymentExecution(id: string, data: Partial<PaymentExecution>): Promise<PaymentExecution | undefined> {
    const [result] = await db.update(paymentExecutions)
      .set(data)
      .where(eq(paymentExecutions.id, id))
      .returning();
    return result;
  }

  async createPortfolioSnapshot(data: { userId: string; token: string; totalValue: string; holdings: any; businessName?: string; businessLogo?: string; expiresAt: Date }): Promise<PortfolioSnapshot> {
    const [result] = await db.insert(portfolioSnapshots)
      .values(data)
      .returning();
    return result;
  }

  async getPortfolioSnapshotByToken(token: string): Promise<PortfolioSnapshot | undefined> {
    const [result] = await db.select().from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.token, token));
    return result;
  }

  async getPortfolioSnapshotsByUser(userId: string): Promise<PortfolioSnapshot[]> {
    return db.select().from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.userId, userId))
      .orderBy(desc(portfolioSnapshots.createdAt));
  }

  async deletePortfolioSnapshot(id: string, userId: string): Promise<void> {
    await db.delete(portfolioSnapshots)
      .where(and(eq(portfolioSnapshots.id, id), eq(portfolioSnapshots.userId, userId)));
  }

  async createWhaleAlert(alert: InsertWhaleAlert): Promise<WhaleAlert | undefined> {
    const [result] = await db.insert(whaleAlerts)
      .values(alert)
      .onConflictDoNothing({ target: whaleAlerts.txHash })
      .returning();
    return result;
  }

  async getWhaleAlerts(limit: number, since?: Date, xrpThreshold?: number, rlusdThreshold?: number): Promise<WhaleAlert[]> {
    const conditions = [];
    if (since) {
      conditions.push(gte(whaleAlerts.timestamp, since));
    }
    if (xrpThreshold || rlusdThreshold) {
      const xrpMin = (xrpThreshold || 1_000_000).toString();
      const rlusdMin = (rlusdThreshold || 500_000).toString();
      conditions.push(
        sql`(
          (${whaleAlerts.currency} = 'XRP' AND CAST(${whaleAlerts.amount} AS NUMERIC) >= ${xrpMin}::numeric)
          OR
          (${whaleAlerts.currency} = 'RLUSD' AND CAST(${whaleAlerts.amount} AS NUMERIC) >= ${rlusdMin}::numeric)
        )`
      );
    }
    if (conditions.length > 0) {
      return db.select().from(whaleAlerts)
        .where(and(...conditions))
        .orderBy(desc(whaleAlerts.timestamp))
        .limit(limit);
    }
    return db.select().from(whaleAlerts)
      .orderBy(desc(whaleAlerts.timestamp))
      .limit(limit);
  }

  async getWhaleAlertSettings(userId: string): Promise<WhaleAlertSettings | undefined> {
    const [result] = await db.select().from(whaleAlertSettings)
      .where(eq(whaleAlertSettings.userId, userId));
    return result;
  }

  async upsertWhaleAlertSettings(userId: string, data: { xrpThreshold?: string; rlusdThreshold?: string; enabled?: boolean }): Promise<WhaleAlertSettings> {
    const [result] = await db.insert(whaleAlertSettings)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: whaleAlertSettings.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async createErrorLog(data: InsertErrorLog): Promise<ErrorLog> {
    const [result] = await db.insert(errorLogs).values(data).returning();
    return result;
  }

  async getErrorLogs(options: { limit?: number; offset?: number; source?: string; status?: string; search?: string }): Promise<ErrorLog[]> {
    const conditions = [];
    if (options.source) conditions.push(eq(errorLogs.source, options.source));
    if (options.status) conditions.push(eq(errorLogs.status, options.status));
    if (options.search) {
      conditions.push(sql`(${errorLogs.message} ILIKE ${'%' + options.search + '%'} OR ${errorLogs.route} ILIKE ${'%' + options.search + '%'} OR ${errorLogs.userEmail} ILIKE ${'%' + options.search + '%'})`);
    }
    const query = db.select().from(errorLogs);
    if (conditions.length > 0) {
      return query
        .where(and(...conditions))
        .orderBy(desc(errorLogs.createdAt))
        .limit(options.limit || 100)
        .offset(options.offset || 0);
    }
    return query
      .orderBy(desc(errorLogs.createdAt))
      .limit(options.limit || 100)
      .offset(options.offset || 0);
  }

  async getErrorLogById(id: string): Promise<ErrorLog | undefined> {
    const [result] = await db.select().from(errorLogs).where(eq(errorLogs.id, id));
    return result;
  }

  async updateErrorLogStatus(id: string, status: string): Promise<ErrorLog | undefined> {
    const [result] = await db.update(errorLogs)
      .set({ status })
      .where(eq(errorLogs.id, id))
      .returning();
    return result;
  }

  async getErrorStats(): Promise<{ totalToday: number; uniqueToday: number; mostFrequent: { fingerprint: string; message: string; count: number } | null }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(errorLogs)
      .where(gte(errorLogs.createdAt, todayStart));

    const [uniqueResult] = await db.select({ count: sql<number>`count(distinct ${errorLogs.fingerprint})::int` })
      .from(errorLogs)
      .where(gte(errorLogs.createdAt, todayStart));

    const mostFrequentRows = await db.select({
      fingerprint: errorLogs.fingerprint,
      message: errorLogs.message,
      count: sql<number>`count(*)::int`,
    })
      .from(errorLogs)
      .where(gte(errorLogs.createdAt, todayStart))
      .groupBy(errorLogs.fingerprint, errorLogs.message)
      .orderBy(sql`count(*) DESC`)
      .limit(1);

    return {
      totalToday: totalResult?.count || 0,
      uniqueToday: uniqueResult?.count || 0,
      mostFrequent: mostFrequentRows.length > 0
        ? { fingerprint: mostFrequentRows[0].fingerprint || "", message: mostFrequentRows[0].message, count: mostFrequentRows[0].count }
        : null,
    };
  }

  async getErrorLogCount(options: { source?: string; status?: string; search?: string }): Promise<number> {
    const conditions = [];
    if (options.source) conditions.push(eq(errorLogs.source, options.source));
    if (options.status) conditions.push(eq(errorLogs.status, options.status));
    if (options.search) {
      conditions.push(sql`(${errorLogs.message} ILIKE ${'%' + options.search + '%'} OR ${errorLogs.route} ILIKE ${'%' + options.search + '%'} OR ${errorLogs.userEmail} ILIKE ${'%' + options.search + '%'})`);
    }
    if (conditions.length > 0) {
      const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(errorLogs).where(and(...conditions));
      return result?.count || 0;
    }
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(errorLogs);
    return result?.count || 0;
  }
}

export const storage = new DatabaseStorage();
