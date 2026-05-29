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
  statementSources,
  statementHoldings,
  marketCache,
  emailConfig,
  alertLog,
  roadmapItems,
  roadmapVotes,
  whispers,
  apiUsageLog,
  apiBudgets,
  type ApiUsageLog,
  type ApiBudget,
  type InsertApiBudget,
  type RoadmapItem,
  type InsertRoadmapItem,
  type RoadmapVote,
  type InsertRoadmapVote,
  type RoadmapStatus,
  type Whisper,
  type InsertWhisper,
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
  type StatementSource,
  type InsertStatementSource,
  type StatementHolding,
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
  dcaOrders,
  dcaExecutions,
  type ScheduledPayment,
  type InsertScheduledPayment,
  type PaymentExecution,
  type InsertPaymentExecution,
  type PortfolioSnapshot,
  type DcaOrder,
  type InsertDcaOrder,
  type DcaExecution,
  type InsertDcaExecution,
  whaleAlerts,
  whaleAlertSettings,
  type WhaleAlert,
  type InsertWhaleAlert,
  type WhaleAlertSettings,
  type InsertWhaleAlertSettings,
  errorLogs,
  type ErrorLog,
  type InsertErrorLog,
  userAddons,
  type UserAddon,
  type InsertUserAddon,
  autoCompoundSettings,
  type AutoCompoundSettings,
  type InsertAutoCompoundSettings,
  yieldPositions,
  type YieldPosition,
  type InsertYieldPosition,
  xls66Vaults,
  xls66Positions,
  xls66LoanOffers,
  xls66VaultBlocklist,
  type Xls66Vault,
  type InsertXls66Vault,
  type Xls66Position,
  type InsertXls66Position,
  type Xls66LoanOffer,
  type InsertXls66LoanOffer,
  type Xls66VaultBlock,
  legacyPlans,
  legacyBeneficiaries,
  legacyCheckIns,
  legacyWalletAssignments,
  familySeats,
  familyProposals,
  type LegacyPlan,
  type InsertLegacyPlan,
  type LegacyBeneficiary,
  type InsertLegacyBeneficiary,
  type LegacyCheckIn,
  type LegacyWalletAssignment,
  type InsertLegacyWalletAssignment,
  type FamilySeat,
  type InsertFamilySeat,
  type FamilyProposal,
  type InsertFamilyProposal,
  tokenBuckets,
  tokenBucketItems,
  type TokenBucket,
  type InsertTokenBucket,
  type TokenBucketItem,
  type InsertTokenBucketItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sql, inArray } from "drizzle-orm";
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

  getStatementSourcesByUser(userId: string): Promise<StatementSource[]>;
  getStatementSource(id: number): Promise<StatementSource | undefined>;
  findStatementSource(userId: string, institutionName: string, accountLabel?: string | null): Promise<StatementSource | undefined>;
  createStatementSource(source: InsertStatementSource): Promise<StatementSource>;
  updateStatementSource(id: number, data: Partial<StatementSource>): Promise<StatementSource | undefined>;
  deleteStatementSource(id: number): Promise<void>;

  getStatementHoldingsBySource(sourceId: number): Promise<StatementHolding[]>;
  getStatementHoldingsByUser(userId: string): Promise<StatementHolding[]>;
  replaceStatementHoldings(sourceId: number, uploadId: string, userId: string, holdings: Array<Omit<StatementHolding, "id" | "sourceId" | "uploadId" | "userId" | "createdAt">>): Promise<StatementHolding[]>;
  deleteStatementHoldingsBySource(sourceId: number): Promise<void>;

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

  createDcaOrder(order: InsertDcaOrder): Promise<DcaOrder>;
  getDcaOrdersByUser(userId: string): Promise<DcaOrder[]>;
  getDcaOrder(id: string): Promise<DcaOrder | undefined>;
  updateDcaOrder(id: string, data: Partial<DcaOrder>): Promise<DcaOrder | undefined>;
  deleteDcaOrder(id: string): Promise<void>;
  getDueDcaOrders(): Promise<DcaOrder[]>;
  createDcaExecution(execution: InsertDcaExecution): Promise<DcaExecution>;
  getDcaExecutionsByOrder(orderId: string): Promise<DcaExecution[]>;
  getDcaExecutionsByUser(userId: string): Promise<DcaExecution[]>;
  getPendingDcaExecutions(): Promise<DcaExecution[]>;
  updateDcaExecution(id: string, data: Partial<DcaExecution>): Promise<DcaExecution | undefined>;

  createTokenBucket(bucket: InsertTokenBucket): Promise<TokenBucket>;
  getTokenBucketsByUser(userId: string): Promise<TokenBucket[]>;
  getTokenBucket(id: string): Promise<TokenBucket | undefined>;
  updateTokenBucket(id: string, data: Partial<TokenBucket>): Promise<TokenBucket | undefined>;
  deleteTokenBucket(id: string): Promise<void>;
  createTokenBucketItem(item: InsertTokenBucketItem): Promise<TokenBucketItem>;
  getTokenBucketItems(bucketId: string): Promise<TokenBucketItem[]>;
  deleteTokenBucketItems(bucketId: string): Promise<void>;

  createPortfolioSnapshot(data: { userId: string; token: string; totalValue: string; holdings: any; businessName?: string; businessLogo?: string; expiresAt: Date }): Promise<PortfolioSnapshot>;
  getPortfolioSnapshotByToken(token: string): Promise<PortfolioSnapshot | undefined>;
  getPortfolioSnapshotsByUser(userId: string): Promise<PortfolioSnapshot[]>;
  deletePortfolioSnapshot(id: string, userId: string): Promise<void>;

  createWhaleAlert(alert: InsertWhaleAlert): Promise<WhaleAlert | undefined>;
  getWhaleAlerts(limit: number, since?: Date): Promise<WhaleAlert[]>;
  getWhaleAlertSettings(userId: string): Promise<WhaleAlertSettings | undefined>;
  upsertWhaleAlertSettings(userId: string, data: { xrpThreshold?: string; rlusdThreshold?: string; enabled?: boolean }): Promise<WhaleAlertSettings>;

  createErrorLog(data: InsertErrorLog): Promise<ErrorLog>;
  getErrorLogs(options: { limit?: number; offset?: number; source?: string; status?: string; search?: string }): Promise<ErrorLog[]>;
  getErrorLogById(id: string): Promise<ErrorLog | undefined>;
  updateErrorLogStatus(id: string, status: string): Promise<ErrorLog | undefined>;
  getErrorStats(): Promise<{ totalToday: number; uniqueToday: number; mostFrequent: { fingerprint: string; message: string; count: number } | null }>;
  getErrorLogCount(options: { source?: string; status?: string; search?: string }): Promise<number>;

  createUserAddon(addon: InsertUserAddon): Promise<UserAddon>;
  activateLegacyAddon(params: {
    userId: string;
    addonType: string;
    addonKey: string;
    paymentMethod: string;
    stripeSubscriptionId?: string | null;
    paidInChain?: string | null;
    externalRef?: string | null;
    expiresAt: Date | null;
  }): Promise<UserAddon>;
  getUserAddons(userId: string): Promise<UserAddon[]>;
  getActiveUserAddons(userId: string): Promise<UserAddon[]>;
  getUserAddon(id: string): Promise<UserAddon | undefined>;
  getUserAddonByKey(userId: string, addonKey: string): Promise<UserAddon | undefined>;
  cancelUserAddon(id: string): Promise<UserAddon | undefined>;
  updateUserAddonStatus(id: string, status: string): Promise<UserAddon | undefined>;
  getExpiringAddons(withinDays: number): Promise<UserAddon[]>;

  getAutoCompoundSettings(userId: string): Promise<AutoCompoundSettings[]>;
  getAutoCompoundSetting(userId: string, vaultAddress: string): Promise<AutoCompoundSettings | undefined>;
  upsertAutoCompoundSetting(userId: string, vaultAddress: string, enabled: boolean): Promise<AutoCompoundSettings>;
  updateAutoCompoundYield(id: string, yieldAmount: string, yieldDate: Date): Promise<AutoCompoundSettings | undefined>;
  getEnabledAutoCompoundUsers(): Promise<AutoCompoundSettings[]>;

  createYieldPosition(position: InsertYieldPosition): Promise<YieldPosition>;
  getYieldPositionsByUser(userId: string): Promise<YieldPosition[]>;
  getYieldPosition(id: string): Promise<YieldPosition | undefined>;
  updateYieldPosition(id: string, data: Partial<YieldPosition>): Promise<YieldPosition | undefined>;
  deleteYieldPosition(id: string): Promise<void>;
  getActiveYieldPositionsByUser(userId: string): Promise<YieldPosition[]>;

  getXls66Vaults(status?: string): Promise<Xls66Vault[]>;
  getXls66Vault(id: string): Promise<Xls66Vault | undefined>;
  createXls66Vault(vault: InsertXls66Vault): Promise<Xls66Vault>;
  updateXls66Vault(id: string, data: Partial<Xls66Vault>): Promise<Xls66Vault | undefined>;

  getXls66PositionsByUser(userId: string): Promise<Xls66Position[]>;
  getXls66Position(id: string): Promise<Xls66Position | undefined>;
  createXls66Position(position: InsertXls66Position): Promise<Xls66Position>;
  updateXls66Position(id: string, data: Partial<Xls66Position>): Promise<Xls66Position | undefined>;
  getActiveXls66PositionsByUser(userId: string): Promise<Xls66Position[]>;

  getXls66LoanOffersByUser(userId: string): Promise<Xls66LoanOffer[]>;
  getXls66LoanOffer(id: string): Promise<Xls66LoanOffer | undefined>;
  createXls66LoanOffer(offer: InsertXls66LoanOffer): Promise<Xls66LoanOffer>;
  updateXls66LoanOffer(id: string, data: Partial<Xls66LoanOffer>): Promise<Xls66LoanOffer | undefined>;

  getXls66VaultBlocklist(): Promise<Xls66VaultBlock[]>;
  addToXls66VaultBlocklist(vaultId: string, reason: string, blockedBy: string): Promise<Xls66VaultBlock>;
  removeFromXls66VaultBlocklist(vaultId: string): Promise<void>;
  isXls66VaultBlocked(vaultId: string): Promise<boolean>;

  getLegacyPlan(userId: string): Promise<LegacyPlan | undefined>;
  createLegacyPlan(plan: InsertLegacyPlan): Promise<LegacyPlan>;
  updateLegacyPlan(id: string, data: Partial<LegacyPlan>): Promise<LegacyPlan | undefined>;
  getLegacyBeneficiaries(legacyPlanId: string): Promise<LegacyBeneficiary[]>;
  createLegacyBeneficiary(beneficiary: InsertLegacyBeneficiary): Promise<LegacyBeneficiary>;
  updateLegacyBeneficiary(id: string, data: Partial<LegacyBeneficiary>): Promise<LegacyBeneficiary | undefined>;
  deleteLegacyBeneficiary(id: string): Promise<void>;
  getLegacyBeneficiary(id: string): Promise<LegacyBeneficiary | undefined>;
  getLegacyBeneficiaryByConfirmationToken(token: string): Promise<LegacyBeneficiary | undefined>;
  getLegacyBeneficiaryByHeartbeatToken(token: string): Promise<LegacyBeneficiary | undefined>;
  getLegacyBeneficiaryByVaultVerificationToken(token: string): Promise<LegacyBeneficiary | undefined>;
  getLegacyPlanById(id: string): Promise<LegacyPlan | undefined>;
  getLegacyBeneficiaryByDeliveryAckToken(token: string): Promise<LegacyBeneficiary | undefined>;
  getLegacyPlanByEarlyTriggerVetoToken(token: string): Promise<LegacyPlan | undefined>;
  getLegacyPlanByEarlyTriggerRequestToken(token: string): Promise<LegacyPlan | undefined>;
  getLegacyPlansNeedingExportReminder(): Promise<LegacyPlan[]>;
  getLegacyPlansWithPendingEarlyTrigger(): Promise<LegacyPlan[]>;
  getTriggeredLegacyPlans(): Promise<LegacyPlan[]>;
  getTriggeredLegacyPlansForLastResort(): Promise<LegacyPlan[]>;
  getLegacyPlanByLastResortToken(token: string): Promise<LegacyPlan | undefined>;
  createLegacyCheckIn(legacyPlanId: string): Promise<LegacyCheckIn>;
  getLegacyCheckIns(legacyPlanId: string, limit?: number): Promise<LegacyCheckIn[]>;
  getActiveLegacyPlans(): Promise<LegacyPlan[]>;
  getGracePeriodLegacyPlans(): Promise<LegacyPlan[]>;

  getLegacyWalletAssignments(legacyPlanId: string): Promise<LegacyWalletAssignment[]>;
  getLegacyWalletAssignment(id: string): Promise<LegacyWalletAssignment | undefined>;
  createLegacyWalletAssignment(data: InsertLegacyWalletAssignment): Promise<LegacyWalletAssignment>;
  updateLegacyWalletAssignment(id: string, data: Partial<LegacyWalletAssignment>): Promise<LegacyWalletAssignment | undefined>;
  deleteLegacyWalletAssignment(id: string): Promise<void>;
  getLegacyWalletAssignmentByWalletId(legacyPlanId: string, walletId: string): Promise<LegacyWalletAssignment | undefined>;

  getFamilySeats(ownerUserId: string): Promise<FamilySeat[]>;
  getFamilySeatsForUser(seatUserId: string): Promise<FamilySeat[]>;
  getFamilySeat(id: string): Promise<FamilySeat | undefined>;
  getFamilySeatByToken(token: string): Promise<FamilySeat | undefined>;
  createFamilySeat(data: InsertFamilySeat & { inviteToken: string }): Promise<FamilySeat>;
  updateFamilySeat(id: string, data: Partial<FamilySeat>): Promise<FamilySeat | undefined>;
  deleteFamilySeat(id: string): Promise<void>;
  listRoadmapItems(viewerUserId?: string | null): Promise<Array<RoadmapItem & { voteCount: number; userVoted: boolean }>>;
  getRoadmapItem(id: number): Promise<RoadmapItem | undefined>;
  getRoadmapItemBySlug(slug: string): Promise<RoadmapItem | undefined>;
  createRoadmapItem(data: InsertRoadmapItem): Promise<RoadmapItem>;
  updateRoadmapItemStatus(id: number, status: RoadmapStatus): Promise<RoadmapItem | undefined>;
  updateRoadmapItemMeta(id: number, data: { shippedAt?: Date | null; learnMoreUrl?: string | null }): Promise<RoadmapItem | undefined>;
  postRoadmapTeamResponse(id: number, response: string): Promise<RoadmapItem | undefined>;
  voteOnRoadmapItem(itemId: number, userId: string, comment?: string | null): Promise<RoadmapVote>;
  unvoteRoadmapItem(itemId: number, userId: string): Promise<void>;
  getUserActiveVoteCount(userId: string): Promise<number>;
  seedRoadmapItemsIfEmpty(items: InsertRoadmapItem[]): Promise<number>;
  addRoadmapItemIfMissing(item: InsertRoadmapItem): Promise<boolean>;
  refreshRoadmapItemContentBySlug(slug: string, content: { title?: string; description?: string; category?: string }): Promise<boolean>;
  createWhisper(data: InsertWhisper & { token: string }): Promise<Whisper>;
  getWhisperByToken(token: string): Promise<Whisper | undefined>;
  listWhispersByOwner(ownerId: string): Promise<Whisper[]>;
  revokeWhisper(id: string, ownerId: string): Promise<void>;
  deleteWhisper(id: string, ownerId: string): Promise<void>;
  recordWhisperView(id: string): Promise<void>;
  createFamilyProposal(data: InsertFamilyProposal): Promise<FamilyProposal>;
  getFamilyProposalsByOwner(ownerUserId: string, status?: string): Promise<FamilyProposal[]>;
  getFamilyProposalsBySeat(seatId: string): Promise<FamilyProposal[]>;
  getFamilyProposalsByProposer(proposedByUserId: string): Promise<FamilyProposal[]>;
  getFamilyProposal(id: string): Promise<FamilyProposal | undefined>;
  updateFamilyProposal(id: string, data: Partial<FamilyProposal>): Promise<FamilyProposal | undefined>;
  getApiUsageSummary(periodHours: number): Promise<Array<{ provider: string; callCount: number; errorCount: number; totalCostCents: number; avgLatencyMs: number }>>;
  getRecentApiFailures(limit: number): Promise<ApiUsageLog[]>;
  getTopApiConsumers(periodHours: number, limit: number): Promise<Array<{ userId: string; email: string | null; callCount: number; costCents: number }>>;
  getApiBudgetsWithSpend(): Promise<Array<ApiBudget & { currentSpendCents: number }>>;
  upsertApiBudget(data: InsertApiBudget): Promise<ApiBudget>;
  deleteApiBudget(id: number): Promise<void>;
  resetApiBudgetAlerts(id: number): Promise<void>;
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

  async getStatementSourcesByUser(userId: string): Promise<StatementSource[]> {
    return db.select().from(statementSources)
      .where(eq(statementSources.userId, userId))
      .orderBy(desc(statementSources.lastUploadDate));
  }

  async getStatementSource(id: number): Promise<StatementSource | undefined> {
    const [result] = await db.select().from(statementSources).where(eq(statementSources.id, id));
    return result;
  }

  async findStatementSource(userId: string, institutionName: string, accountLabel?: string | null): Promise<StatementSource | undefined> {
    const normalizedName = institutionName.trim().toLowerCase();
    const allSources = await db.select().from(statementSources)
      .where(eq(statementSources.userId, userId));

    if (accountLabel) {
      const labelMatch = allSources.find(s =>
        s.institutionName.trim().toLowerCase() === normalizedName &&
        s.accountLabel?.trim().toLowerCase() === accountLabel.trim().toLowerCase()
      );
      if (labelMatch) return labelMatch;
    }

    return allSources.find(s =>
      s.institutionName.trim().toLowerCase() === normalizedName && !s.accountLabel
    );
  }

  async createStatementSource(source: InsertStatementSource): Promise<StatementSource> {
    const [result] = await db.insert(statementSources).values(source).returning();
    return result;
  }

  async updateStatementSource(id: number, data: Partial<StatementSource>): Promise<StatementSource | undefined> {
    const [result] = await db.update(statementSources).set(data).where(eq(statementSources.id, id)).returning();
    return result;
  }

  async deleteStatementSource(id: number): Promise<void> {
    await db.delete(statementHoldings).where(eq(statementHoldings.sourceId, id));
    await db.delete(statementSources).where(eq(statementSources.id, id));
  }

  async getStatementHoldingsBySource(sourceId: number): Promise<StatementHolding[]> {
    return db.select().from(statementHoldings).where(eq(statementHoldings.sourceId, sourceId));
  }

  async getStatementHoldingsByUser(userId: string): Promise<StatementHolding[]> {
    return db.select().from(statementHoldings).where(eq(statementHoldings.userId, userId));
  }

  async replaceStatementHoldings(
    sourceId: number,
    uploadId: string,
    userId: string,
    holdings: Array<Omit<StatementHolding, "id" | "sourceId" | "uploadId" | "userId" | "createdAt">>
  ): Promise<StatementHolding[]> {
    await db.delete(statementHoldings).where(eq(statementHoldings.sourceId, sourceId));

    if (holdings.length === 0) return [];

    const rows = holdings.map(h => ({
      sourceId,
      uploadId,
      userId,
      productType: h.productType,
      label: h.label,
      balance: h.balance,
      interestRate: h.interestRate,
      apy: h.apy,
      maturityDate: h.maturityDate,
      term: h.term,
      isLocked: h.isLocked,
    }));

    return db.insert(statementHoldings).values(rows).returning();
  }

  async deleteStatementHoldingsBySource(sourceId: number): Promise<void> {
    await db.delete(statementHoldings).where(eq(statementHoldings.sourceId, sourceId));
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

  async createDcaOrder(order: InsertDcaOrder): Promise<DcaOrder> {
    const [result] = await db.insert(dcaOrders).values(order).returning();
    return result;
  }

  async getDcaOrdersByUser(userId: string): Promise<DcaOrder[]> {
    return db.select().from(dcaOrders)
      .where(eq(dcaOrders.userId, userId))
      .orderBy(desc(dcaOrders.createdAt));
  }

  async getDcaOrder(id: string): Promise<DcaOrder | undefined> {
    const [result] = await db.select().from(dcaOrders).where(eq(dcaOrders.id, id));
    return result;
  }

  async updateDcaOrder(id: string, data: Partial<DcaOrder>): Promise<DcaOrder | undefined> {
    const [result] = await db.update(dcaOrders)
      .set(data)
      .where(eq(dcaOrders.id, id))
      .returning();
    return result;
  }

  async deleteDcaOrder(id: string): Promise<void> {
    await db.delete(dcaOrders).where(eq(dcaOrders.id, id));
  }

  async getDueDcaOrders(): Promise<DcaOrder[]> {
    return db.select().from(dcaOrders)
      .where(
        and(
          eq(dcaOrders.status, "active"),
          lte(dcaOrders.nextRunAt, new Date())
        )
      );
  }

  async createDcaExecution(execution: InsertDcaExecution): Promise<DcaExecution> {
    const [result] = await db.insert(dcaExecutions).values(execution).returning();
    return result;
  }

  async getDcaExecutionsByOrder(orderId: string): Promise<DcaExecution[]> {
    return db.select().from(dcaExecutions)
      .where(eq(dcaExecutions.dcaOrderId, orderId))
      .orderBy(desc(dcaExecutions.executedAt));
  }

  async getDcaExecutionsByUser(userId: string): Promise<DcaExecution[]> {
    return db.select().from(dcaExecutions)
      .where(eq(dcaExecutions.userId, userId))
      .orderBy(desc(dcaExecutions.executedAt));
  }

  async getPendingDcaExecutions(): Promise<DcaExecution[]> {
    return db.select().from(dcaExecutions)
      .where(eq(dcaExecutions.status, "pushed"));
  }

  async updateDcaExecution(id: string, data: Partial<DcaExecution>): Promise<DcaExecution | undefined> {
    const [result] = await db.update(dcaExecutions)
      .set(data)
      .where(eq(dcaExecutions.id, id))
      .returning();
    return result;
  }

  async createTokenBucket(bucket: InsertTokenBucket): Promise<TokenBucket> {
    const [result] = await db.insert(tokenBuckets).values(bucket).returning();
    return result;
  }

  async getTokenBucketsByUser(userId: string): Promise<TokenBucket[]> {
    return db.select().from(tokenBuckets)
      .where(eq(tokenBuckets.userId, userId))
      .orderBy(desc(tokenBuckets.createdAt));
  }

  async getTokenBucket(id: string): Promise<TokenBucket | undefined> {
    const [result] = await db.select().from(tokenBuckets).where(eq(tokenBuckets.id, id));
    return result;
  }

  async updateTokenBucket(id: string, data: Partial<TokenBucket>): Promise<TokenBucket | undefined> {
    const [result] = await db.update(tokenBuckets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tokenBuckets.id, id))
      .returning();
    return result;
  }

  async deleteTokenBucket(id: string): Promise<void> {
    await db.delete(tokenBucketItems).where(eq(tokenBucketItems.bucketId, id));
    await db.delete(tokenBuckets).where(eq(tokenBuckets.id, id));
  }

  async createTokenBucketItem(item: InsertTokenBucketItem): Promise<TokenBucketItem> {
    const [result] = await db.insert(tokenBucketItems).values(item).returning();
    return result;
  }

  async getTokenBucketItems(bucketId: string): Promise<TokenBucketItem[]> {
    return db.select().from(tokenBucketItems)
      .where(eq(tokenBucketItems.bucketId, bucketId));
  }

  async deleteTokenBucketItems(bucketId: string): Promise<void> {
    await db.delete(tokenBucketItems).where(eq(tokenBucketItems.bucketId, bucketId));
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

  async getWhaleAlerts(limit: number, since?: Date): Promise<WhaleAlert[]> {
    const conditions = [];
    if (since) {
      conditions.push(gte(whaleAlerts.timestamp, since));
    }
    if (conditions.length > 0) {
      return db.select().from(whaleAlerts)
        .where(and(...conditions))
        .orderBy(sql`CAST(${whaleAlerts.amount} AS NUMERIC) DESC`)
        .limit(limit);
    }
    return db.select().from(whaleAlerts)
      .orderBy(sql`CAST(${whaleAlerts.amount} AS NUMERIC) DESC`)
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

  async createUserAddon(addon: InsertUserAddon): Promise<UserAddon> {
    const [result] = await db.insert(userAddons).values(addon).returning();
    return result;
  }

  async activateLegacyAddon(params: {
    userId: string;
    addonType: string;
    addonKey: string;
    paymentMethod: string;
    stripeSubscriptionId?: string | null;
    paidInChain?: string | null;
    externalRef?: string | null;
    expiresAt: Date | null;
  }): Promise<UserAddon> {
    const { LEGACY_ADDON_KEYS } = await import("./stripe");
    const legacyKeys = LEGACY_ADDON_KEYS as unknown as string[];
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${params.userId + ":legacy"}))`);
      if (params.externalRef) {
        const [already] = await tx
          .select()
          .from(userAddons)
          .where(
            and(
              eq(userAddons.userId, params.userId),
              eq(userAddons.externalRef, params.externalRef),
            ),
          );
        if (already) return already;
      }
      await tx
        .update(userAddons)
        .set({ status: "superseded", cancelledAt: new Date() })
        .where(
          and(
            eq(userAddons.userId, params.userId),
            eq(userAddons.status, "active"),
            inArray(userAddons.addonKey, legacyKeys),
          ),
        );
      const [result] = await tx
        .insert(userAddons)
        .values({
          userId: params.userId,
          addonType: params.addonType,
          addonKey: params.addonKey,
          status: "active",
          paymentMethod: params.paymentMethod,
          stripeSubscriptionId: params.stripeSubscriptionId ?? null,
          paidInChain: params.paidInChain ?? null,
          externalRef: params.externalRef ?? null,
          expiresAt: params.expiresAt,
        })
        .returning();
      return result;
    });
  }

  async getUserAddons(userId: string): Promise<UserAddon[]> {
    return db.select().from(userAddons).where(eq(userAddons.userId, userId)).orderBy(desc(userAddons.createdAt));
  }

  async getActiveUserAddons(userId: string): Promise<UserAddon[]> {
    return db.select().from(userAddons).where(and(eq(userAddons.userId, userId), eq(userAddons.status, "active")));
  }

  async getUserAddon(id: string): Promise<UserAddon | undefined> {
    const [result] = await db.select().from(userAddons).where(eq(userAddons.id, id));
    return result;
  }

  async getUserAddonByKey(userId: string, addonKey: string): Promise<UserAddon | undefined> {
    const [result] = await db.select().from(userAddons).where(and(eq(userAddons.userId, userId), eq(userAddons.addonKey, addonKey), eq(userAddons.status, "active")));
    return result;
  }

  async cancelUserAddon(id: string): Promise<UserAddon | undefined> {
    const [result] = await db.update(userAddons).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(userAddons.id, id)).returning();
    return result;
  }

  async updateUserAddonStatus(id: string, status: string): Promise<UserAddon | undefined> {
    const [result] = await db.update(userAddons).set({ status }).where(eq(userAddons.id, id)).returning();
    return result;
  }

  async getExpiringAddons(withinDays: number): Promise<UserAddon[]> {
    const future = new Date();
    future.setDate(future.getDate() + withinDays);
    return db.select().from(userAddons).where(and(eq(userAddons.status, "active"), lte(userAddons.expiresAt, future)));
  }

  async getAutoCompoundSettings(userId: string): Promise<AutoCompoundSettings[]> {
    return db.select().from(autoCompoundSettings).where(eq(autoCompoundSettings.userId, userId));
  }

  async getAutoCompoundSetting(userId: string, vaultAddress: string): Promise<AutoCompoundSettings | undefined> {
    const [result] = await db.select().from(autoCompoundSettings).where(and(eq(autoCompoundSettings.userId, userId), eq(autoCompoundSettings.vaultAddress, vaultAddress)));
    return result;
  }

  async upsertAutoCompoundSetting(userId: string, vaultAddress: string, enabled: boolean): Promise<AutoCompoundSettings> {
    const existing = await this.getAutoCompoundSetting(userId, vaultAddress);
    if (existing) {
      const [result] = await db.update(autoCompoundSettings).set({ enabled, updatedAt: new Date() }).where(eq(autoCompoundSettings.id, existing.id)).returning();
      return result;
    }
    const [result] = await db.insert(autoCompoundSettings).values({ userId, vaultAddress, enabled }).returning();
    return result;
  }

  async updateAutoCompoundYield(id: string, yieldAmount: string, yieldDate: Date): Promise<AutoCompoundSettings | undefined> {
    const [result] = await db.update(autoCompoundSettings).set({ lastYieldDetected: yieldAmount, lastYieldDate: yieldDate, lastNotifiedAt: new Date(), updatedAt: new Date() }).where(eq(autoCompoundSettings.id, id)).returning();
    return result;
  }

  async getEnabledAutoCompoundUsers(): Promise<AutoCompoundSettings[]> {
    return db.select().from(autoCompoundSettings).where(eq(autoCompoundSettings.enabled, true));
  }

  async createYieldPosition(position: InsertYieldPosition): Promise<YieldPosition> {
    const [result] = await db.insert(yieldPositions).values(position).returning();
    return result;
  }

  async getYieldPositionsByUser(userId: string): Promise<YieldPosition[]> {
    return db.select().from(yieldPositions).where(eq(yieldPositions.userId, userId)).orderBy(desc(yieldPositions.createdAt));
  }

  async getYieldPosition(id: string): Promise<YieldPosition | undefined> {
    const [result] = await db.select().from(yieldPositions).where(eq(yieldPositions.id, id));
    return result;
  }

  async updateYieldPosition(id: string, data: Partial<YieldPosition>): Promise<YieldPosition | undefined> {
    const [result] = await db.update(yieldPositions).set({ ...data, updatedAt: new Date() }).where(eq(yieldPositions.id, id)).returning();
    return result;
  }

  async deleteYieldPosition(id: string): Promise<void> {
    await db.delete(yieldPositions).where(eq(yieldPositions.id, id));
  }

  async getActiveYieldPositionsByUser(userId: string): Promise<YieldPosition[]> {
    return db.select().from(yieldPositions).where(and(eq(yieldPositions.userId, userId), eq(yieldPositions.status, "active"))).orderBy(desc(yieldPositions.createdAt));
  }

  async getXls66Vaults(status?: string): Promise<Xls66Vault[]> {
    if (status) {
      return db.select().from(xls66Vaults).where(eq(xls66Vaults.status, status)).orderBy(desc(xls66Vaults.aprBps));
    }
    return db.select().from(xls66Vaults).orderBy(desc(xls66Vaults.aprBps));
  }

  async getXls66Vault(id: string): Promise<Xls66Vault | undefined> {
    const [result] = await db.select().from(xls66Vaults).where(eq(xls66Vaults.id, id));
    return result;
  }

  async createXls66Vault(vault: InsertXls66Vault): Promise<Xls66Vault> {
    const [result] = await db.insert(xls66Vaults).values(vault).returning();
    return result;
  }

  async updateXls66Vault(id: string, data: Partial<Xls66Vault>): Promise<Xls66Vault | undefined> {
    const [result] = await db.update(xls66Vaults).set({ ...data, updatedAt: new Date() }).where(eq(xls66Vaults.id, id)).returning();
    return result;
  }

  async getXls66PositionsByUser(userId: string): Promise<Xls66Position[]> {
    return db.select().from(xls66Positions).where(eq(xls66Positions.userId, userId)).orderBy(desc(xls66Positions.createdAt));
  }

  async getXls66Position(id: string): Promise<Xls66Position | undefined> {
    const [result] = await db.select().from(xls66Positions).where(eq(xls66Positions.id, id));
    return result;
  }

  async createXls66Position(position: InsertXls66Position): Promise<Xls66Position> {
    const [result] = await db.insert(xls66Positions).values(position).returning();
    return result;
  }

  async updateXls66Position(id: string, data: Partial<Xls66Position>): Promise<Xls66Position | undefined> {
    const [result] = await db.update(xls66Positions).set({ ...data, updatedAt: new Date() }).where(eq(xls66Positions.id, id)).returning();
    return result;
  }

  async getActiveXls66PositionsByUser(userId: string): Promise<Xls66Position[]> {
    return db.select().from(xls66Positions).where(and(eq(xls66Positions.userId, userId), eq(xls66Positions.status, "active"))).orderBy(desc(xls66Positions.createdAt));
  }

  async getXls66LoanOffersByUser(userId: string): Promise<Xls66LoanOffer[]> {
    return db.select().from(xls66LoanOffers).where(eq(xls66LoanOffers.userId, userId)).orderBy(desc(xls66LoanOffers.createdAt));
  }

  async getXls66LoanOffer(id: string): Promise<Xls66LoanOffer | undefined> {
    const [result] = await db.select().from(xls66LoanOffers).where(eq(xls66LoanOffers.id, id));
    return result;
  }

  async createXls66LoanOffer(offer: InsertXls66LoanOffer): Promise<Xls66LoanOffer> {
    const [result] = await db.insert(xls66LoanOffers).values(offer).returning();
    return result;
  }

  async updateXls66LoanOffer(id: string, data: Partial<Xls66LoanOffer>): Promise<Xls66LoanOffer | undefined> {
    const [result] = await db.update(xls66LoanOffers).set({ ...data, updatedAt: new Date() }).where(eq(xls66LoanOffers.id, id)).returning();
    return result;
  }

  async getXls66VaultBlocklist(): Promise<Xls66VaultBlock[]> {
    return db.select().from(xls66VaultBlocklist).orderBy(desc(xls66VaultBlocklist.createdAt));
  }

  async addToXls66VaultBlocklist(vaultId: string, reason: string, blockedBy: string): Promise<Xls66VaultBlock> {
    const [result] = await db.insert(xls66VaultBlocklist).values({ vaultId, reason, blockedBy }).returning();
    return result;
  }

  async removeFromXls66VaultBlocklist(vaultId: string): Promise<void> {
    await db.delete(xls66VaultBlocklist).where(eq(xls66VaultBlocklist.vaultId, vaultId));
  }

  async isXls66VaultBlocked(vaultId: string): Promise<boolean> {
    const [result] = await db.select().from(xls66VaultBlocklist).where(eq(xls66VaultBlocklist.vaultId, vaultId));
    return !!result;
  }

  async getLegacyPlan(userId: string): Promise<LegacyPlan | undefined> {
    const [result] = await db.select().from(legacyPlans).where(eq(legacyPlans.userId, userId));
    return result;
  }

  async createLegacyPlan(plan: InsertLegacyPlan): Promise<LegacyPlan> {
    const now = new Date();
    const [result] = await db.insert(legacyPlans).values({
      ...plan,
      lastCheckIn: now,
      nextCheckInDue: this.calcNextCheckIn(now, plan.checkInFrequency),
    }).returning();
    return result;
  }

  async updateLegacyPlan(id: string, data: Partial<LegacyPlan>): Promise<LegacyPlan | undefined> {
    const [result] = await db.update(legacyPlans).set({ ...data, updatedAt: new Date() }).where(eq(legacyPlans.id, id)).returning();
    return result;
  }

  async getLegacyBeneficiaries(legacyPlanId: string): Promise<LegacyBeneficiary[]> {
    return db.select().from(legacyBeneficiaries).where(eq(legacyBeneficiaries.legacyPlanId, legacyPlanId));
  }

  async createLegacyBeneficiary(beneficiary: InsertLegacyBeneficiary): Promise<LegacyBeneficiary> {
    const [result] = await db.insert(legacyBeneficiaries).values(beneficiary).returning();
    return result;
  }

  async updateLegacyBeneficiary(id: string, data: Partial<LegacyBeneficiary>): Promise<LegacyBeneficiary | undefined> {
    const [result] = await db.update(legacyBeneficiaries).set(data).where(eq(legacyBeneficiaries.id, id)).returning();
    return result;
  }

  async deleteLegacyBeneficiary(id: string): Promise<void> {
    await db.delete(legacyBeneficiaries).where(eq(legacyBeneficiaries.id, id));
  }

  async getLegacyBeneficiary(id: string): Promise<LegacyBeneficiary | undefined> {
    const [result] = await db.select().from(legacyBeneficiaries).where(eq(legacyBeneficiaries.id, id));
    return result;
  }

  async getLegacyBeneficiaryByConfirmationToken(token: string): Promise<LegacyBeneficiary | undefined> {
    const [result] = await db.select().from(legacyBeneficiaries).where(eq(legacyBeneficiaries.confirmationToken, token));
    return result;
  }

  async getLegacyBeneficiaryByHeartbeatToken(token: string): Promise<LegacyBeneficiary | undefined> {
    const [result] = await db.select().from(legacyBeneficiaries).where(eq(legacyBeneficiaries.heartbeatToken, token));
    return result;
  }

  async getLegacyBeneficiaryByVaultVerificationToken(token: string): Promise<LegacyBeneficiary | undefined> {
    const [result] = await db.select().from(legacyBeneficiaries).where(eq(legacyBeneficiaries.vaultVerificationToken, token));
    return result;
  }

  async getLegacyPlanById(id: string): Promise<LegacyPlan | undefined> {
    const [result] = await db.select().from(legacyPlans).where(eq(legacyPlans.id, id));
    return result;
  }

  async getLegacyBeneficiaryByDeliveryAckToken(token: string): Promise<LegacyBeneficiary | undefined> {
    const [result] = await db.select().from(legacyBeneficiaries).where(eq(legacyBeneficiaries.deliveryAckToken, token));
    return result;
  }

  async getTriggeredLegacyPlans(): Promise<LegacyPlan[]> {
    return db.select().from(legacyPlans).where(eq(legacyPlans.status, "triggered"));
  }

  async getLegacyPlanByEarlyTriggerVetoToken(token: string): Promise<LegacyPlan | undefined> {
    const [result] = await db.select().from(legacyPlans).where(eq(legacyPlans.earlyTriggerVetoToken, token));
    return result;
  }

  async getLegacyPlanByEarlyTriggerRequestToken(token: string): Promise<LegacyPlan | undefined> {
    const [result] = await db.select().from(legacyPlans).where(eq(legacyPlans.earlyTriggerRequestToken, token));
    return result;
  }

  async getLegacyPlansNeedingExportReminder(): Promise<LegacyPlan[]> {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    return db.select().from(legacyPlans).where(
      and(
        eq(legacyPlans.status, "active"),
        sql`(${legacyPlans.lastExportedAt} IS NULL OR ${legacyPlans.lastExportedAt} < ${oneYearAgo})`,
        sql`(${legacyPlans.exportReminderSentAt} IS NULL OR ${legacyPlans.exportReminderSentAt} < ${oneYearAgo})`,
      )
    );
  }

  async getLegacyPlansWithPendingEarlyTrigger(): Promise<LegacyPlan[]> {
    return db.select().from(legacyPlans).where(
      and(
        sql`${legacyPlans.earlyTriggerRequestedAt} IS NOT NULL`,
        sql`${legacyPlans.earlyTriggerVetoedAt} IS NULL`,
        sql`${legacyPlans.status} != 'triggered'`,
      )
    );
  }

  async createLegacyCheckIn(legacyPlanId: string): Promise<LegacyCheckIn> {
    const [result] = await db.insert(legacyCheckIns).values({ legacyPlanId }).returning();
    return result;
  }

  async getLegacyCheckIns(legacyPlanId: string, limit = 20): Promise<LegacyCheckIn[]> {
    return db.select().from(legacyCheckIns).where(eq(legacyCheckIns.legacyPlanId, legacyPlanId)).orderBy(desc(legacyCheckIns.checkedInAt)).limit(limit);
  }

  async getActiveLegacyPlans(): Promise<LegacyPlan[]> {
    return db.select().from(legacyPlans).where(eq(legacyPlans.status, "active"));
  }

  async getGracePeriodLegacyPlans(): Promise<LegacyPlan[]> {
    return db.select().from(legacyPlans).where(eq(legacyPlans.status, "grace"));
  }

  async getLegacyPlanByLastResortToken(token: string): Promise<LegacyPlan | undefined> {
    const [result] = await db.select().from(legacyPlans).where(eq(legacyPlans.lastResortObjectionToken, token));
    return result;
  }

  async getTriggeredLegacyPlansForLastResort(): Promise<LegacyPlan[]> {
    return db.select().from(legacyPlans).where(
      and(
        eq(legacyPlans.status, "triggered"),
        eq(legacyPlans.lastResortEnabled, true),
        sql`${legacyPlans.lastResortReleasedAt} IS NULL`,
        sql`${legacyPlans.triggeredAt} IS NOT NULL`,
      )
    );
  }

  private calcNextCheckIn(from: Date, frequency: string): Date {
    const next = new Date(from);
    switch (frequency) {
      case "weekly": next.setDate(next.getDate() + 7); break;
      case "biweekly": next.setDate(next.getDate() + 14); break;
      case "monthly": next.setMonth(next.getMonth() + 1); break;
      case "quarterly": next.setMonth(next.getMonth() + 3); break;
      default: next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  async getLegacyWalletAssignments(legacyPlanId: string): Promise<LegacyWalletAssignment[]> {
    return db.select().from(legacyWalletAssignments).where(eq(legacyWalletAssignments.legacyPlanId, legacyPlanId));
  }

  async getLegacyWalletAssignment(id: string): Promise<LegacyWalletAssignment | undefined> {
    const [r] = await db.select().from(legacyWalletAssignments).where(eq(legacyWalletAssignments.id, id));
    return r;
  }

  async getLegacyWalletAssignmentByWalletId(legacyPlanId: string, walletId: string): Promise<LegacyWalletAssignment | undefined> {
    const [r] = await db.select().from(legacyWalletAssignments).where(and(eq(legacyWalletAssignments.legacyPlanId, legacyPlanId), eq(legacyWalletAssignments.walletId, walletId)));
    return r;
  }

  async createLegacyWalletAssignment(data: InsertLegacyWalletAssignment): Promise<LegacyWalletAssignment> {
    const [r] = await db.insert(legacyWalletAssignments).values(data).returning();
    return r;
  }

  async updateLegacyWalletAssignment(id: string, data: Partial<LegacyWalletAssignment>): Promise<LegacyWalletAssignment | undefined> {
    const [r] = await db.update(legacyWalletAssignments).set({ ...data, updatedAt: new Date() }).where(eq(legacyWalletAssignments.id, id)).returning();
    return r;
  }

  async deleteLegacyWalletAssignment(id: string): Promise<void> {
    await db.update(legacyBeneficiaries).set({ assignmentId: null }).where(eq(legacyBeneficiaries.assignmentId, id));
    await db.delete(legacyWalletAssignments).where(eq(legacyWalletAssignments.id, id));
  }

  async getFamilySeats(ownerUserId: string): Promise<FamilySeat[]> {
    return db.select().from(familySeats).where(eq(familySeats.ownerUserId, ownerUserId));
  }

  async getFamilySeatsForUser(seatUserId: string): Promise<FamilySeat[]> {
    return db.select().from(familySeats).where(and(eq(familySeats.seatUserId, seatUserId), eq(familySeats.status, "active")));
  }

  async getFamilySeat(id: string): Promise<FamilySeat | undefined> {
    const [r] = await db.select().from(familySeats).where(eq(familySeats.id, id));
    return r;
  }

  async getFamilySeatByToken(token: string): Promise<FamilySeat | undefined> {
    const [r] = await db.select().from(familySeats).where(eq(familySeats.inviteToken, token));
    return r;
  }

  async createFamilySeat(data: InsertFamilySeat & { inviteToken: string }): Promise<FamilySeat> {
    const [r] = await db.insert(familySeats).values({ ...data, inviteSentAt: new Date() }).returning();
    return r;
  }

  async updateFamilySeat(id: string, data: Partial<FamilySeat>): Promise<FamilySeat | undefined> {
    const [r] = await db.update(familySeats).set({ ...data, updatedAt: new Date() }).where(eq(familySeats.id, id)).returning();
    return r;
  }

  async createFamilyProposal(data: InsertFamilyProposal): Promise<FamilyProposal> {
    const [r] = await db.insert(familyProposals).values(data as any).returning();
    return r;
  }
  async getFamilyProposalsByOwner(ownerUserId: string, status?: string): Promise<FamilyProposal[]> {
    const where = status
      ? and(eq(familyProposals.ownerUserId, ownerUserId), eq(familyProposals.status, status))
      : eq(familyProposals.ownerUserId, ownerUserId);
    return db.select().from(familyProposals).where(where).orderBy(desc(familyProposals.createdAt));
  }
  async getFamilyProposalsBySeat(seatId: string): Promise<FamilyProposal[]> {
    return db.select().from(familyProposals).where(eq(familyProposals.seatId, seatId)).orderBy(desc(familyProposals.createdAt));
  }
  async getFamilyProposalsByProposer(proposedByUserId: string): Promise<FamilyProposal[]> {
    return db.select().from(familyProposals).where(eq(familyProposals.proposedByUserId, proposedByUserId)).orderBy(desc(familyProposals.createdAt));
  }
  async getFamilyProposal(id: string): Promise<FamilyProposal | undefined> {
    const [r] = await db.select().from(familyProposals).where(eq(familyProposals.id, id));
    return r;
  }
  async updateFamilyProposal(id: string, data: Partial<FamilyProposal>): Promise<FamilyProposal | undefined> {
    const [r] = await db.update(familyProposals).set(data as any).where(eq(familyProposals.id, id)).returning();
    return r;
  }

  async deleteFamilySeat(id: string): Promise<void> {
    await db.delete(familySeats).where(eq(familySeats.id, id));
  }

  async listRoadmapItems(viewerUserId?: string | null): Promise<Array<RoadmapItem & { voteCount: number; userVoted: boolean }>> {
    const items = await db
      .select()
      .from(roadmapItems)
      .orderBy(roadmapItems.sortOrder, roadmapItems.id);

    if (items.length === 0) return [];

    const counts = await db
      .select({
        itemId: roadmapVotes.itemId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(roadmapVotes)
      .groupBy(roadmapVotes.itemId);
    const countMap = new Map<number, number>();
    for (const row of counts) countMap.set(row.itemId, row.count);

    let votedSet = new Set<number>();
    if (viewerUserId) {
      const userVotes = await db
        .select({ itemId: roadmapVotes.itemId })
        .from(roadmapVotes)
        .where(eq(roadmapVotes.userId, viewerUserId));
      votedSet = new Set(userVotes.map((v) => v.itemId));
    }

    return items.map((item) => ({
      ...item,
      voteCount: countMap.get(item.id) ?? 0,
      userVoted: votedSet.has(item.id),
    }));
  }

  async getRoadmapItem(id: number): Promise<RoadmapItem | undefined> {
    const [r] = await db.select().from(roadmapItems).where(eq(roadmapItems.id, id));
    return r;
  }

  async getRoadmapItemBySlug(slug: string): Promise<RoadmapItem | undefined> {
    const [r] = await db.select().from(roadmapItems).where(eq(roadmapItems.slug, slug));
    return r;
  }

  async createRoadmapItem(data: InsertRoadmapItem): Promise<RoadmapItem> {
    const [r] = await db.insert(roadmapItems).values(data as any).returning();
    return r;
  }

  async updateRoadmapItemStatus(id: number, status: RoadmapStatus): Promise<RoadmapItem | undefined> {
    const patch: any = { status, updatedAt: new Date() };
    if (status === "shipped") {
      const [existing] = await db.select().from(roadmapItems).where(eq(roadmapItems.id, id));
      if (existing && !existing.shippedAt) {
        patch.shippedAt = new Date();
      }
    }
    const [r] = await db
      .update(roadmapItems)
      .set(patch)
      .where(eq(roadmapItems.id, id))
      .returning();
    return r;
  }

  async updateRoadmapItemMeta(
    id: number,
    data: { shippedAt?: Date | null; learnMoreUrl?: string | null }
  ): Promise<RoadmapItem | undefined> {
    const patch: any = { updatedAt: new Date() };
    if (data.shippedAt !== undefined) patch.shippedAt = data.shippedAt;
    if (data.learnMoreUrl !== undefined) patch.learnMoreUrl = data.learnMoreUrl;
    const [r] = await db
      .update(roadmapItems)
      .set(patch)
      .where(eq(roadmapItems.id, id))
      .returning();
    return r;
  }

  async postRoadmapTeamResponse(id: number, response: string): Promise<RoadmapItem | undefined> {
    const [r] = await db
      .update(roadmapItems)
      .set({ teamResponse: response, teamResponseAt: new Date(), updatedAt: new Date() })
      .where(eq(roadmapItems.id, id))
      .returning();
    return r;
  }

  async voteOnRoadmapItem(itemId: number, userId: string, comment?: string | null): Promise<RoadmapVote> {
    const [r] = await db
      .insert(roadmapVotes)
      .values({ itemId, userId, comment: comment ?? null })
      .returning();
    return r;
  }

  async unvoteRoadmapItem(itemId: number, userId: string): Promise<void> {
    await db
      .delete(roadmapVotes)
      .where(and(eq(roadmapVotes.itemId, itemId), eq(roadmapVotes.userId, userId)));
  }

  async getUserActiveVoteCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(roadmapVotes)
      .innerJoin(roadmapItems, eq(roadmapVotes.itemId, roadmapItems.id))
      .where(
        and(
          eq(roadmapVotes.userId, userId),
          sql`${roadmapItems.status} NOT IN ('shipped', 'not_pursuing')`,
        ),
      );
    return row?.count ?? 0;
  }

  async seedRoadmapItemsIfEmpty(items: InsertRoadmapItem[]): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(roadmapItems);
    if ((row?.count ?? 0) > 0) return 0;
    if (items.length === 0) return 0;
    await db.insert(roadmapItems).values(items as any[]);
    return items.length;
  }

  async addRoadmapItemIfMissing(item: InsertRoadmapItem): Promise<boolean> {
    const [existing] = await db.select({ id: roadmapItems.id }).from(roadmapItems).where(eq(roadmapItems.slug, item.slug));
    if (existing) return false;
    const [maxRow] = await db.select({ max: sql<number>`coalesce(max(${roadmapItems.sortOrder}), 0)`.mapWith(Number) }).from(roadmapItems);
    const nextSort = (maxRow?.max ?? 0) + 1;
    await db.insert(roadmapItems).values({ ...item, sortOrder: item.sortOrder ?? nextSort } as any);
    return true;
  }

  async refreshRoadmapItemContentBySlug(slug: string, content: { title?: string; description?: string; category?: string }): Promise<boolean> {
    const [existing] = await db.select({ id: roadmapItems.id, title: roadmapItems.title, description: roadmapItems.description, category: roadmapItems.category }).from(roadmapItems).where(eq(roadmapItems.slug, slug));
    if (!existing) return false;
    const updates: Record<string, any> = {};
    if (content.title !== undefined && content.title !== existing.title) updates.title = content.title;
    if (content.description !== undefined && content.description !== existing.description) updates.description = content.description;
    if (content.category !== undefined && content.category !== (existing as any).category) updates.category = content.category;
    if (Object.keys(updates).length === 0) return false;
    await db.update(roadmapItems).set(updates).where(eq(roadmapItems.slug, slug));
    return true;
  }

  async createWhisper(data: InsertWhisper & { token: string }): Promise<Whisper> {
    const [row] = await db.insert(whispers).values(data as any).returning();
    return row;
  }

  async getWhisperByToken(token: string): Promise<Whisper | undefined> {
    const [row] = await db.select().from(whispers).where(eq(whispers.token, token));
    return row;
  }

  async listWhispersByOwner(ownerId: string): Promise<Whisper[]> {
    return await db
      .select()
      .from(whispers)
      .where(eq(whispers.ownerId, ownerId))
      .orderBy(desc(whispers.createdAt));
  }

  async revokeWhisper(id: string, ownerId: string): Promise<void> {
    await db
      .update(whispers)
      .set({ revokedAt: new Date() })
      .where(and(eq(whispers.id, id), eq(whispers.ownerId, ownerId)));
  }

  async deleteWhisper(id: string, ownerId: string): Promise<void> {
    await db
      .delete(whispers)
      .where(and(eq(whispers.id, id), eq(whispers.ownerId, ownerId)));
  }

  async recordWhisperView(id: string): Promise<void> {
    await db
      .update(whispers)
      .set({ viewCount: sql`COALESCE(${whispers.viewCount}, 0) + 1`, lastViewedAt: new Date() })
      .where(eq(whispers.id, id));
  }

  async getApiUsageSummary(periodHours: number): Promise<Array<{ provider: string; callCount: number; errorCount: number; totalCostCents: number; avgLatencyMs: number }>> {
    const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const rows = await db
      .select({
        provider: apiUsageLog.provider,
        callCount: sql<string>`COUNT(*)`,
        errorCount: sql<string>`SUM(CASE WHEN ${apiUsageLog.ok} = false THEN 1 ELSE 0 END)`,
        totalMicroCents: sql<string>`COALESCE(SUM(${apiUsageLog.costMicroCents}), 0)`,
        avgLatencyMs: sql<string>`COALESCE(AVG(${apiUsageLog.latencyMs}), 0)`,
      })
      .from(apiUsageLog)
      .where(sql`${apiUsageLog.requestedAt} >= ${since}`)
      .groupBy(apiUsageLog.provider)
      .orderBy(sql`COALESCE(SUM(${apiUsageLog.costMicroCents}), 0) DESC`);
    return rows.map(r => ({
      provider: r.provider,
      callCount: Number(r.callCount || 0),
      errorCount: Number(r.errorCount || 0),
      totalCostCents: Math.round(Number(r.totalMicroCents || 0) / 10_000),
      avgLatencyMs: Number(r.avgLatencyMs || 0),
    }));
  }

  async getRecentApiFailures(limit: number): Promise<ApiUsageLog[]> {
    return await db
      .select()
      .from(apiUsageLog)
      .where(eq(apiUsageLog.ok, false))
      .orderBy(desc(apiUsageLog.requestedAt))
      .limit(limit);
  }

  async getTopApiConsumers(periodHours: number, limit: number): Promise<Array<{ userId: string; email: string | null; callCount: number; costCents: number }>> {
    const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const rows = await db
      .select({
        userId: apiUsageLog.userId,
        email: users.email,
        callCount: sql<string>`COUNT(*)`,
        totalMicroCents: sql<string>`COALESCE(SUM(${apiUsageLog.costMicroCents}), 0)`,
      })
      .from(apiUsageLog)
      .leftJoin(users, eq(users.id, apiUsageLog.userId))
      .where(sql`${apiUsageLog.requestedAt} >= ${since} AND ${apiUsageLog.userId} IS NOT NULL`)
      .groupBy(apiUsageLog.userId, users.email)
      .orderBy(sql`COALESCE(SUM(${apiUsageLog.costMicroCents}), 0) DESC`)
      .limit(limit);
    return rows
      .filter(r => r.userId)
      .map(r => ({
        userId: r.userId!,
        email: r.email,
        callCount: Number(r.callCount || 0),
        costCents: Math.round(Number(r.totalMicroCents || 0) / 10_000),
      }));
  }

  async getApiBudgetsWithSpend(): Promise<Array<ApiBudget & { currentSpendCents: number }>> {
    const budgets = await db.select().from(apiBudgets).orderBy(apiBudgets.provider, apiBudgets.period);
    const PERIOD_MS: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };
    const out: Array<ApiBudget & { currentSpendCents: number }> = [];
    for (const b of budgets) {
      const periodMs = PERIOD_MS[b.period] || 24 * 60 * 60 * 1000;
      const since = new Date(Date.now() - periodMs);
      const [row] = await db
        .select({ total: sql<string>`COALESCE(SUM(${apiUsageLog.costMicroCents}), 0)` })
        .from(apiUsageLog)
        .where(and(eq(apiUsageLog.provider, b.provider), sql`${apiUsageLog.requestedAt} >= ${since}`));
      out.push({ ...b, currentSpendCents: Math.round(Number(row?.total || 0) / 10_000) });
    }
    return out;
  }

  async upsertApiBudget(data: InsertApiBudget): Promise<ApiBudget> {
    const existing = await db.select().from(apiBudgets).where(
      and(eq(apiBudgets.provider, data.provider), eq(apiBudgets.period, data.period))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(apiBudgets).set({
        softLimitCents: data.softLimitCents,
        hardLimitCents: data.hardLimitCents,
        alertEmail: data.alertEmail ?? null,
        enforced: data.enforced ?? true,
        updatedAt: new Date(),
      }).where(eq(apiBudgets.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(apiBudgets).values({
      provider: data.provider,
      period: data.period,
      softLimitCents: data.softLimitCents,
      hardLimitCents: data.hardLimitCents,
      alertEmail: data.alertEmail ?? null,
      enforced: data.enforced ?? true,
    }).returning();
    return created;
  }

  async deleteApiBudget(id: number): Promise<void> {
    await db.delete(apiBudgets).where(eq(apiBudgets.id, id));
  }

  async resetApiBudgetAlerts(id: number): Promise<void> {
    await db.update(apiBudgets).set({
      softAlertSentAt: null,
      hardAlertSentAt: null,
      periodStartedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(apiBudgets.id, id));
  }
}

export const storage = new DatabaseStorage();
