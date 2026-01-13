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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
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

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;

  createPosition(position: InsertPosition): Promise<Position>;
  getPositionsByUser(userId: string): Promise<Position[]>;
  updatePosition(id: string, data: Partial<Position>): Promise<Position | undefined>;
  getPositionByUserAndAsset(userId: string, accountId: string, assetSymbol: string): Promise<Position | undefined>;

  createTaxLot(taxLot: InsertTaxLot): Promise<TaxLot>;
  getTaxLotsByUser(userId: string): Promise<TaxLot[]>;
  getTaxLotsByAsset(userId: string, assetSymbol: string): Promise<TaxLot[]>;
  updateTaxLot(id: string, data: Partial<TaxLot>): Promise<TaxLot | undefined>;

  createGainEvent(gainEvent: InsertGainEvent): Promise<GainEvent>;
  getGainEventsByUser(userId: string): Promise<GainEvent[]>;
  getGainEventsByYear(userId: string, year: number): Promise<GainEvent[]>;

  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;

  createAsset(asset: InsertAsset): Promise<Asset>;
  getAsset(symbol: string): Promise<Asset | undefined>;
  updateAssetPrice(symbol: string, price: string): Promise<void>;
  getAllAssets(): Promise<Asset[]>;
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

  async updateTaxLot(id: string, data: Partial<TaxLot>): Promise<TaxLot | undefined> {
    const [result] = await db
      .update(taxLots)
      .set(data)
      .where(eq(taxLots.id, id))
      .returning();
    return result;
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
}

export const storage = new DatabaseStorage();
