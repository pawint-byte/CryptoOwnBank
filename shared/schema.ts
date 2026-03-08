import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const apiCredentials = pgTable("api_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret").notNull(),
  isConnected: boolean("is_connected").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_api_credentials_user").on(table.userId),
]);

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  credentialId: varchar("credential_id"),
  provider: varchar("provider", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 100 }),
  accountType: varchar("account_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_accounts_user").on(table.userId),
]);

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  assetType: varchar("asset_type", { length: 20 }).notNull(),
  coingeckoId: varchar("coingecko_id", { length: 100 }),
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }),
  priceUpdatedAt: timestamp("price_updated_at"),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id").notNull(),
  assetSymbol: varchar("asset_symbol", { length: 50 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  pricePerUnit: decimal("price_per_unit", { precision: 18, scale: 8 }).notNull(),
  totalValue: decimal("total_value", { precision: 18, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 18, scale: 8 }).default("0"),
  transactionDate: timestamp("transaction_date").notNull(),
  externalId: varchar("external_id", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_transactions_user").on(table.userId),
  index("idx_transactions_date").on(table.transactionDate),
]);

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id").notNull(),
  assetSymbol: varchar("asset_symbol", { length: 50 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  averageCost: decimal("average_cost", { precision: 18, scale: 8 }).notNull(),
  totalCostBasis: decimal("total_cost_basis", { precision: 18, scale: 2 }).notNull(),
  isAddressed: boolean("is_addressed").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_positions_user").on(table.userId),
]);

export const taxLots = pgTable("tax_lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  transactionId: varchar("transaction_id"),
  walletBalanceId: varchar("wallet_balance_id"),
  assetSymbol: varchar("asset_symbol", { length: 50 }).notNull(),
  acquiredDate: timestamp("acquired_date").notNull(),
  originalQuantity: decimal("original_quantity", { precision: 18, scale: 8 }).notNull(),
  remainingQuantity: decimal("remaining_quantity", { precision: 18, scale: 8 }).notNull(),
  costBasisPerUnit: decimal("cost_basis_per_unit", { precision: 18, scale: 8 }).notNull(),
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tax_lots_user").on(table.userId),
]);

export const gainEvents = pgTable("gain_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sellTransactionId: varchar("sell_transaction_id").notNull(),
  taxLotId: varchar("tax_lot_id").notNull(),
  assetSymbol: varchar("asset_symbol", { length: 50 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  proceeds: decimal("proceeds", { precision: 18, scale: 2 }).notNull(),
  costBasis: decimal("cost_basis", { precision: 18, scale: 2 }).notNull(),
  gainLoss: decimal("gain_loss", { precision: 18, scale: 2 }).notNull(),
  isLongTerm: boolean("is_long_term").notNull(),
  taxMethod: varchar("tax_method", { length: 10 }).notNull(),
  soldDate: timestamp("sold_date").notNull(),
  acquiredDate: timestamp("acquired_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gain_events_user").on(table.userId),
]);

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  taxMethod: varchar("tax_method", { length: 10 }).default("FIFO"),
  defaultCurrency: varchar("default_currency", { length: 10 }).default("USD"),
  taxYear: integer("tax_year"),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).default("free"),
  subscriptionBillingCycle: varchar("subscription_billing_cycle", { length: 20 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  customVaults: jsonb("custom_vaults").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CustomVault = {
  address: string;
  name: string;
  apr: number;
  addedAt: string;
};

export const priceHistory = pgTable("price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetSymbol: varchar("asset_symbol", { length: 50 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (table) => [
  index("idx_price_history_symbol").on(table.assetSymbol),
]);

export const insertApiCredentialSchema = createInsertSchema(apiCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  updatedAt: true,
});

export const insertTaxLotSchema = createInsertSchema(taxLots).omit({
  id: true,
  createdAt: true,
});

export const insertGainEventSchema = createInsertSchema(gainEvents).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const priceAlerts = pgTable("price_alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  asset: varchar("asset", { length: 20 }).notNull(),
  targetPrice: decimal("target_price", { precision: 18, scale: 8 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  triggered: boolean("triggered").default(false).notNull(),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_price_alerts_user").on(table.userId),
  index("idx_price_alerts_active").on(table.isActive),
]);

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
});

export type InsertApiCredential = z.infer<typeof insertApiCredentialSchema>;
export type ApiCredential = typeof apiCredentials.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

export type InsertTaxLot = z.infer<typeof insertTaxLotSchema>;
export type TaxLot = typeof taxLots.$inferSelect;

export type InsertGainEvent = z.infer<typeof insertGainEventSchema>;
export type GainEvent = typeof gainEvents.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({
  id: true as never,
  triggered: true as never,
  triggeredAt: true as never,
  createdAt: true as never,
});

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  chain: varchar("chain", { length: 20 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  label: varchar("label", { length: 100 }),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wallets_user").on(table.userId),
]);

export const walletBalances = pgTable("wallet_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  userId: varchar("user_id").notNull(),
  assetSymbol: varchar("asset_symbol", { length: 50 }).notNull(),
  balance: decimal("balance", { precision: 28, scale: 12 }).notNull(),
  usdValue: decimal("usd_value", { precision: 18, scale: 2 }),
  averageCost: decimal("average_cost", { precision: 18, scale: 8 }),
  totalCostBasis: decimal("total_cost_basis", { precision: 18, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wallet_balances_wallet").on(table.walletId),
  index("idx_wallet_balances_user").on(table.userId),
]);

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  lastSyncAt: true,
  createdAt: true,
});

export const insertWalletBalanceSchema = createInsertSchema(walletBalances).omit({
  id: true,
  updatedAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type PriceAlert = typeof priceAlerts.$inferSelect;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export type WalletBalance = typeof walletBalances.$inferSelect;
export type InsertWalletBalance = z.infer<typeof insertWalletBalanceSchema>;

export const priceCache = pgTable("price_cache", {
  symbol: varchar("symbol", { length: 20 }).primaryKey(),
  priceUsd: decimal("price_usd", { precision: 24, scale: 12 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const statementUploads = pgTable("statement_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("processing"),
  productCount: integer("product_count").default(0),
  tier: varchar("tier", { length: 20 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("idx_statement_uploads_user").on(table.userId),
]);

export const statementProducts = pgTable("statement_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadId: varchar("upload_id").notNull(),
  userId: varchar("user_id").notNull(),
  productType: varchar("product_type", { length: 30 }).notNull(),
  institutionName: varchar("institution_name", { length: 100 }),
  balance: decimal("balance", { precision: 18, scale: 2 }),
  interestRate: decimal("interest_rate", { precision: 6, scale: 3 }),
  apy: decimal("apy", { precision: 6, scale: 3 }),
  maturityDate: timestamp("maturity_date"),
  term: varchar("term", { length: 50 }),
  isLocked: boolean("is_locked").default(false),
  rawDescription: text("raw_description"),
}, (table) => [
  index("idx_statement_products_upload").on(table.uploadId),
  index("idx_statement_products_user").on(table.userId),
]);

export const insertStatementUploadSchema = createInsertSchema(statementUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertStatementProductSchema = createInsertSchema(statementProducts).omit({
  id: true,
});

export type StatementUpload = typeof statementUploads.$inferSelect;
export type InsertStatementUpload = z.infer<typeof insertStatementUploadSchema>;

export type StatementProduct = typeof statementProducts.$inferSelect;
export type InsertStatementProduct = z.infer<typeof insertStatementProductSchema>;
