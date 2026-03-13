import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, integer, serial, index, jsonb, unique } from "drizzle-orm/pg-core";
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
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  subscriptionPaymentMethod: varchar("subscription_payment_method", { length: 20 }),
  subscriptionRenewalWallet: varchar("subscription_renewal_wallet", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  customVaults: jsonb("custom_vaults").default(sql`'[]'::jsonb`),
  businessName: varchar("business_name", { length: 255 }),
  businessLogo: varchar("business_logo", { length: 1000 }),
  businessTagline: varchar("business_tagline", { length: 500 }),
  businessEmail: varchar("business_email", { length: 255 }),
  businessWebsite: varchar("business_website", { length: 500 }),
  businessPhone: varchar("business_phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const renewalNotifications = pgTable("renewal_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  method: varchar("method", { length: 20 }).notNull(),
  paymentId: varchar("payment_id", { length: 255 }),
  sentAt: timestamp("sent_at").defaultNow(),
}, (table) => [
  index("idx_renewal_notifications_user").on(table.userId),
]);

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

export const marketCache = pgTable("market_cache", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  symbol: text("symbol").notNull(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailConfig = pgTable("email_config", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  email: text("email").notNull(),
  enabled: boolean("enabled").default(true),
  alertTypes: text("alert_types").default("apy_change,new_opportunity,weekly_digest"),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_email_config_user").on(table.userId),
]);

export const alertLog = pgTable("alert_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const cryptoPaymentAddresses = pgTable("crypto_payment_addresses", {
  id: serial("id").primaryKey(),
  chain: varchar("chain", { length: 30 }).notNull(),
  address: text("address").notNull(),
  label: varchar("label", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cryptoPayments = pgTable("crypto_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  plan: varchar("plan", { length: 50 }).notNull(),
  chain: varchar("chain", { length: 30 }).notNull(),
  toAddress: text("to_address").notNull(),
  expectedAmount: decimal("expected_amount", { precision: 18, scale: 8 }).notNull(),
  expectedAsset: varchar("expected_asset", { length: 20 }).notNull(),
  usdAmount: decimal("usd_amount", { precision: 10, scale: 2 }).notNull(),
  destinationTag: integer("destination_tag"),
  txHash: text("tx_hash"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => [
  index("idx_crypto_payments_user").on(table.userId),
  index("idx_crypto_payments_status").on(table.status),
]);

export const insertMarketCacheSchema = createInsertSchema(marketCache).omit({ id: true, updatedAt: true });
export const insertEmailConfigSchema = createInsertSchema(emailConfig).omit({ id: true, createdAt: true });
export const insertAlertLogSchema = createInsertSchema(alertLog).omit({ id: true, sentAt: true });

export const insertCryptoPaymentAddressSchema = createInsertSchema(cryptoPaymentAddresses).omit({ id: true, createdAt: true });
export const insertCryptoPaymentSchema = createInsertSchema(cryptoPayments).omit({ id: true, createdAt: true, confirmedAt: true });

export type MarketCache = typeof marketCache.$inferSelect;
export type InsertMarketCache = z.infer<typeof insertMarketCacheSchema>;
export type EmailConfig = typeof emailConfig.$inferSelect;
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type AlertLog = typeof alertLog.$inferSelect;
export type InsertAlertLog = z.infer<typeof insertAlertLogSchema>;
export type CryptoPaymentAddress = typeof cryptoPaymentAddresses.$inferSelect;
export type InsertCryptoPaymentAddress = z.infer<typeof insertCryptoPaymentAddressSchema>;
export type CryptoPayment = typeof cryptoPayments.$inferSelect;
export type InsertCryptoPayment = z.infer<typeof insertCryptoPaymentSchema>;

export const insertRenewalNotificationSchema = createInsertSchema(renewalNotifications).omit({ id: true, sentAt: true });
export type RenewalNotification = typeof renewalNotifications.$inferSelect;
export type InsertRenewalNotification = z.infer<typeof insertRenewalNotificationSchema>;

export const userWallets = pgTable("user_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  chain: varchar("chain", { length: 30 }).notNull(),
  purpose: varchar("purpose", { length: 30 }).notNull().default("general"),
  destinationTag: varchar("destination_tag", { length: 20 }),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_wallets_user").on(table.userId),
]);

export const insertUserWalletSchema = createInsertSchema(userWallets).omit({
  id: true,
  createdAt: true,
});
export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;

export const scheduledPayments = pgTable("scheduled_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  payeeName: varchar("payee_name", { length: 100 }).notNull(),
  payeeAddress: varchar("payee_address", { length: 255 }).notNull(),
  chain: varchar("chain", { length: 20 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  nextRunAt: timestamp("next_run_at").notNull(),
  lastRunAt: timestamp("last_run_at"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  memo: text("memo"),
  destinationTag: varchar("destination_tag", { length: 20 }),
  totalRuns: integer("total_runs"),
  runsCompleted: integer("runs_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_scheduled_payments_user").on(table.userId),
  index("idx_scheduled_payments_status").on(table.status),
  index("idx_scheduled_payments_next_run").on(table.nextRunAt),
]);

export const paymentExecutions = pgTable("payment_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduledPaymentId: varchar("scheduled_payment_id").notNull(),
  userId: varchar("user_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  xamanPayloadId: varchar("xaman_payload_id", { length: 255 }),
  txHash: varchar("tx_hash", { length: 255 }),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").defaultNow(),
}, (table) => [
  index("idx_payment_executions_scheduled").on(table.scheduledPaymentId),
  index("idx_payment_executions_user").on(table.userId),
]);

export const insertScheduledPaymentSchema = createInsertSchema(scheduledPayments).omit({
  id: true,
  lastRunAt: true,
  runsCompleted: true,
  createdAt: true,
});
export const insertPaymentExecutionSchema = createInsertSchema(paymentExecutions).omit({
  id: true,
  executedAt: true,
});

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  totalValue: decimal("total_value", { precision: 18, scale: 2 }),
  holdings: jsonb("holdings").default(sql`'[]'::jsonb`),
  businessName: varchar("business_name", { length: 255 }),
  businessLogo: varchar("business_logo", { length: 1000 }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_portfolio_snapshots_token").on(table.token),
  index("idx_portfolio_snapshots_user").on(table.userId),
]);

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type ScheduledPayment = typeof scheduledPayments.$inferSelect;
export type InsertScheduledPayment = z.infer<typeof insertScheduledPaymentSchema>;
export type PaymentExecution = typeof paymentExecutions.$inferSelect;
export type InsertPaymentExecution = z.infer<typeof insertPaymentExecutionSchema>;

export const whaleAlerts = pgTable("whale_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txHash: varchar("tx_hash", { length: 255 }).notNull().unique(),
  amount: decimal("amount", { precision: 28, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull(),
  senderAddress: varchar("sender_address", { length: 255 }).notNull(),
  receiverAddress: varchar("receiver_address", { length: 255 }).notNull(),
  senderLabel: varchar("sender_label", { length: 255 }),
  receiverLabel: varchar("receiver_label", { length: 255 }),
  usdValue: decimal("usd_value", { precision: 18, scale: 2 }),
  txType: varchar("tx_type", { length: 30 }).default("payment"),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_whale_alerts_timestamp").on(table.timestamp),
  index("idx_whale_alerts_currency").on(table.currency),
  index("idx_whale_alerts_tx_type").on(table.txType),
]);

export const whaleAlertSettings = pgTable("whale_alert_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  xrpThreshold: decimal("xrp_threshold", { precision: 28, scale: 8 }).default("1000000"),
  rlusdThreshold: decimal("rlusd_threshold", { precision: 28, scale: 8 }).default("500000"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletIdentityCache = pgTable("wallet_identity_cache", {
  address: varchar("address", { length: 255 }).primaryKey(),
  label: varchar("label", { length: 255 }),
  source: varchar("source", { length: 50 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhaleAlertSchema = createInsertSchema(whaleAlerts).omit({
  id: true,
  createdAt: true,
});
export const insertWhaleAlertSettingsSchema = createInsertSchema(whaleAlertSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WhaleAlert = typeof whaleAlerts.$inferSelect;
export type InsertWhaleAlert = z.infer<typeof insertWhaleAlertSchema>;
export type WhaleAlertSettings = typeof whaleAlertSettings.$inferSelect;
export type InsertWhaleAlertSettings = z.infer<typeof insertWhaleAlertSettingsSchema>;
export type WalletIdentityCache = typeof walletIdentityCache.$inferSelect;

export const userAddons = pgTable("user_addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  addonType: varchar("addon_type", { length: 50 }).notNull(),
  addonKey: varchar("addon_key", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
}, (table) => [
  index("idx_user_addons_user").on(table.userId),
  index("idx_user_addons_status").on(table.status),
]);

export const insertUserAddonSchema = createInsertSchema(userAddons).omit({
  id: true,
  createdAt: true,
  cancelledAt: true,
});

export type UserAddon = typeof userAddons.$inferSelect;
export type InsertUserAddon = z.infer<typeof insertUserAddonSchema>;

export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  stack: text("stack"),
  source: varchar("source", { length: 50 }).notNull().default("server"),
  route: varchar("route", { length: 500 }),
  severity: varchar("severity", { length: 20 }).notNull().default("error"),
  userId: varchar("user_id"),
  userEmail: varchar("user_email"),
  statusCode: integer("status_code"),
  requestMethod: varchar("request_method", { length: 10 }),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  fingerprint: varchar("fingerprint", { length: 64 }),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_error_logs_created_at").on(table.createdAt),
  index("idx_error_logs_source").on(table.source),
  index("idx_error_logs_fingerprint").on(table.fingerprint),
  index("idx_error_logs_status").on(table.status),
]);

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export const autoCompoundSettings = pgTable("auto_compound_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  vaultAddress: varchar("vault_address", { length: 255 }).notNull(),
  enabled: boolean("enabled").notNull().default(false),
  lastYieldDetected: decimal("last_yield_detected", { precision: 18, scale: 8 }),
  lastYieldDate: timestamp("last_yield_date"),
  lastNotifiedAt: timestamp("last_notified_at"),
  totalAutoCompounded: decimal("total_auto_compounded", { precision: 18, scale: 8 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_auto_compound_user").on(table.userId),
  unique("uq_auto_compound_user_vault").on(table.userId, table.vaultAddress),
]);

export const insertAutoCompoundSettingsSchema = createInsertSchema(autoCompoundSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type AutoCompoundSettings = typeof autoCompoundSettings.$inferSelect;
export type InsertAutoCompoundSettings = z.infer<typeof insertAutoCompoundSettingsSchema>;

export const yieldPositions = pgTable("yield_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  protocol: varchar("protocol", { length: 100 }).notNull(),
  chain: varchar("chain", { length: 50 }).notNull(),
  asset: varchar("asset", { length: 50 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 255 }),
  depositAmount: decimal("deposit_amount", { precision: 18, scale: 8 }).notNull(),
  currentValue: decimal("current_value", { precision: 18, scale: 8 }),
  apr: decimal("apr", { precision: 8, scale: 4 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  trackingLevel: integer("tracking_level").notNull().default(2),
  externalLink: varchar("external_link", { length: 500 }),
  notes: text("notes"),
  depositDate: timestamp("deposit_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_yield_positions_user").on(table.userId),
  index("idx_yield_positions_status").on(table.status),
]);

export const insertYieldPositionSchema = createInsertSchema(yieldPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type YieldPosition = typeof yieldPositions.$inferSelect;
export type InsertYieldPosition = z.infer<typeof insertYieldPositionSchema>;
