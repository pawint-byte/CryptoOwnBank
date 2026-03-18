import { storage } from "../storage";
import { db } from "../db";
import { users, walletBalances, userSettings, autoWithdrawLogs, type CustomVault } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendLegacyBeneficiaryDelivery } from "../email";
import { Client } from "xrpl";
import { XummSdk } from "xumm-sdk";

function getNextRunDate(currentDate: Date, frequency: string, preferredDay?: number | null): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      if (preferredDay != null) {
        const diff = (preferredDay - next.getDay() + 7) % 7;
        if (diff > 0) next.setDate(next.getDate() + diff);
      }
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      if (preferredDay != null) {
        const diff = (preferredDay - next.getDay() + 7) % 7;
        if (diff > 0) next.setDate(next.getDate() + diff);
      }
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function processScheduledPayments(): Promise<void> {
  try {
    const duePayments = await storage.getDueScheduledPayments();

    for (const payment of duePayments) {
      try {
        const execution = await storage.createPaymentExecution({
          scheduledPaymentId: payment.id,
          userId: payment.userId,
          status: "pending",
          amount: payment.amount,
          xamanPayloadId: null,
          txHash: null,
          errorMessage: null,
        });

        const newRunsCompleted = (payment.runsCompleted || 0) + 1;
        const isComplete = payment.totalRuns && newRunsCompleted >= payment.totalRuns;

        await storage.updateScheduledPayment(payment.id, {
          lastRunAt: new Date(),
          nextRunAt: isComplete ? payment.nextRunAt : getNextRunDate(payment.nextRunAt, payment.frequency, null),
          runsCompleted: newRunsCompleted,
          status: isComplete ? "completed" : "active",
        });

        console.log(`[PaymentScheduler] Created execution ${execution.id} for payment ${payment.id} (${payment.payeeName})`);
      } catch (err) {
        console.error(`[PaymentScheduler] Failed to process payment ${payment.id}:`, err);
        await storage.createPaymentExecution({
          scheduledPaymentId: payment.id,
          userId: payment.userId,
          status: "failed",
          amount: payment.amount,
          xamanPayloadId: null,
          txHash: null,
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (duePayments.length > 0) {
      console.log(`[PaymentScheduler] Processed ${duePayments.length} due payments`);
    }
  } catch (error) {
    console.error("[PaymentScheduler] Error processing scheduled payments:", error);
  }
}

export async function processDcaOrders(): Promise<void> {
  try {
    const dueOrders = await storage.getDueDcaOrders();

    for (const order of dueOrders) {
      try {
        const execution = await storage.createDcaExecution({
          dcaOrderId: order.id,
          userId: order.userId,
          status: "pending",
          spendAmount: order.spendAmount,
          receivedAmount: null,
          xamanPayloadId: null,
          txHash: null,
          errorMessage: null,
        });

        const newRunsCompleted = (order.runsCompleted || 0) + 1;
        const isComplete = order.totalRuns && newRunsCompleted >= order.totalRuns;

        await storage.updateDcaOrder(order.id, {
          lastRunAt: new Date(),
          nextRunAt: isComplete ? order.nextRunAt : getNextRunDate(order.nextRunAt, order.frequency, order.preferredDay),
          runsCompleted: newRunsCompleted,
          status: isComplete ? "completed" : "active",
        });

        const buyDisplay = order.buyCurrency.length > 3 ? order.buyCurrency.slice(0, 6) : order.buyCurrency;
        console.log(`[DCA] Created pending execution ${execution.id} for order ${order.id} — Buy ${buyDisplay} with ${order.spendAmount} ${order.spendCurrency}`);
      } catch (err) {
        console.error(`[DCA] Failed to process order ${order.id}:`, err);
        await storage.createDcaExecution({
          dcaOrderId: order.id,
          userId: order.userId,
          status: "failed",
          spendAmount: order.spendAmount,
          receivedAmount: null,
          xamanPayloadId: null,
          txHash: null,
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (dueOrders.length > 0) {
      console.log(`[DCA] Processed ${dueOrders.length} due DCA orders`);
    }
  } catch (error) {
    console.error("[DCA] Error processing DCA orders:", error);
  }
}

async function processLegacyPlans(): Promise<void> {
  try {
    const now = new Date();

    const activePlans = await storage.getActiveLegacyPlans();
    for (const plan of activePlans) {
      if (plan.nextCheckInDue && new Date(plan.nextCheckInDue) <= now) {
        console.log(`[Legacy] Plan ${plan.id} missed check-in — entering grace period (${plan.gracePeriodDays} days)`);
        await storage.updateLegacyPlan(plan.id, {
          status: "grace",
          graceStartedAt: now,
        });
      }
    }

    const gracePlans = await storage.getGracePeriodLegacyPlans();
    for (const plan of gracePlans) {
      if (plan.graceStartedAt) {
        const graceEnd = new Date(plan.graceStartedAt);
        graceEnd.setDate(graceEnd.getDate() + (plan.gracePeriodDays || 14));
        if (now >= graceEnd) {
          console.log(`[Legacy] Plan ${plan.id} grace period expired — triggering beneficiary delivery`);
          await storage.updateLegacyPlan(plan.id, { status: "triggered" });

          try {
            const [owner] = await db.select({
              firstName: users.firstName,
              email: users.email,
            }).from(users).where(eq(users.id, plan.userId));
            const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "The plan holder";

            const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);

            const userWallets = await storage.getUserWallets(plan.userId);
            const walletSummary = userWallets.map(w => ({
              name: w.label || w.address?.slice(0, 12) + "..." || "Unnamed",
              chain: w.chain || "Unknown",
              address: w.address || undefined,
            }));

            const balances = await storage.getWalletBalancesByUser(plan.userId);
            const assetMap = new Map<string, { balance: number; value: number }>();
            for (const b of balances) {
              const existing = assetMap.get(b.asset) || { balance: 0, value: 0 };
              existing.balance += parseFloat(b.balance || "0");
              existing.value += parseFloat(b.usdValue || "0");
              assetMap.set(b.asset, existing);
            }
            const assetSummary = Array.from(assetMap.entries())
              .filter(([, v]) => v.balance > 0)
              .sort((a, b) => b[1].value - a[1].value)
              .slice(0, 20)
              .map(([asset, v]) => ({
                asset,
                balance: v.balance < 0.0001 ? v.balance.toExponential(2) : v.balance.toFixed(4),
                value: v.value > 0 ? `$${v.value.toFixed(2)}` : undefined,
              }));

            for (const b of beneficiaries) {
              try {
                await sendLegacyBeneficiaryDelivery(
                  b.email,
                  b.name,
                  ownerName,
                  plan.personalMessage,
                  b.walletType,
                  b.deviceInstructions,
                  b.seedPhraseInstructions,
                  b.additionalNotes,
                  b.splitPieces,
                  walletSummary,
                  assetSummary,
                );
                await storage.updateLegacyBeneficiary(b.id, { deliveredAt: now });
                console.log(`[Legacy] Delivered to beneficiary ${b.name} (${b.email})`);
              } catch (emailErr) {
                console.error(`[Legacy] Failed to deliver to ${b.email}:`, emailErr);
              }
            }
          } catch (deliveryError) {
            console.error(`[Legacy] Error during beneficiary delivery for plan ${plan.id}:`, deliveryError);
          }
        }
      }
    }
  } catch (error) {
    console.error("[Legacy] Error processing legacy plans:", error);
  }
}

const SOIL_VAULT_ADDRESSES = [
  "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX",
  "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8",
];
const SOIL_VAULT_APR: Record<string, number> = {
  "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX": 0.08,
  "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8": 0.05,
};
const SOIL_VAULT_NAMES: Record<string, string> = {
  "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX": "Credit+",
  "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8": "Liquid",
};
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const RLUSD_CURRENCY_HEX = "524C555344000000000000000000000000000000";
const ADMIN_EMAILS = ["pawint@me.com", "andrew.wint@gmail.com"];

async function getEffectiveTier(userId: string): Promise<string> {
  const settings = await storage.getUserSettings(userId);
  const tier = settings?.subscriptionTier || "free";
  const [user] = await db.select({ email: users.email, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  if (user?.isAdmin || ADMIN_EMAILS.includes(user?.email?.toLowerCase() || "")) {
    return "pro";
  }
  return tier;
}

async function scanVaultInterest(walletAddress: string, customVaults: CustomVault[]): Promise<Array<{ address: string; name: string; principal: number; apr: number; interest: number }>> {
  const allVaultAddresses = new Set([
    ...SOIL_VAULT_ADDRESSES,
    ...customVaults.filter(v => v.name !== "__dismissed__").map(v => v.address),
  ]);
  const vaultApr: Record<string, number> = { ...SOIL_VAULT_APR };
  const vaultNames: Record<string, string> = { ...SOIL_VAULT_NAMES };
  for (const cv of customVaults.filter(v => v.name !== "__dismissed__")) {
    vaultApr[cv.address] = cv.apr / 100;
    vaultNames[cv.address] = cv.name;
  }

  const xrplServers = ["wss://xrplcluster.com", "wss://s1.ripple.com", "wss://s2.ripple.com"];
  let client: Client | null = null;
  for (const server of xrplServers) {
    try {
      const c = new Client(server, { connectionTimeout: 15000 });
      await c.connect();
      client = c;
      break;
    } catch {}
  }
  if (!client) return [];

  const deposits: Array<{ address: string; amount: number; date: string }> = [];
  const withdrawals: Array<{ address: string; amount: number }> = [];

  try {
    let marker: unknown = undefined;
    let hasMore = true;
    while (hasMore) {
      const request: Record<string, unknown> = {
        command: "account_tx",
        account: walletAddress,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 100,
      };
      if (marker) request.marker = marker;

      const response = await client.request(request as never);
      const txs = (response.result as Record<string, unknown>).transactions as Array<Record<string, unknown>> || [];

      for (const tx of txs) {
        const txData = (tx.tx_json || tx.tx || {}) as Record<string, unknown>;
        const meta = typeof tx.meta === "string" ? {} : ((tx.meta || {}) as Record<string, unknown>);
        if (meta.TransactionResult && meta.TransactionResult !== "tesSUCCESS") continue;
        if (txData.TransactionType !== "Payment") continue;

        const src = (txData.Account || "") as string;
        const dest = (txData.Destination || "") as string;
        if (src === walletAddress && dest === walletAddress) continue;

        const isDeposit = src === walletAddress && allVaultAddresses.has(dest);
        const isVaultToWallet = dest === walletAddress && allVaultAddresses.has(src);

        const deliveredAmount = (meta.delivered_amount || txData.DeliverMax || txData.Amount) as Record<string, string> | string;
        if (typeof deliveredAmount !== "object" || !deliveredAmount) continue;

        const amountCurrency = deliveredAmount.currency || "";
        if (amountCurrency !== RLUSD_CURRENCY_HEX && amountCurrency !== "RLUSD") continue;

        const amount = parseFloat(deliveredAmount.value || "0");
        if (amount <= 0) continue;

        const rippleEpoch = 946684800;
        const closeTimeIso = (tx as Record<string, unknown>).close_time_iso as string | undefined;
        const date = closeTimeIso
          ? new Date(closeTimeIso).toISOString()
          : txData.date
            ? new Date(((txData.date as number) + rippleEpoch) * 1000).toISOString()
            : new Date().toISOString();

        if (isDeposit) {
          deposits.push({ address: dest, amount, date });
        } else if (isVaultToWallet && amount >= 50) {
          withdrawals.push({ address: src, amount });
        }
      }

      marker = (response.result as Record<string, unknown>).marker;
      hasMore = !!marker;
    }
  } finally {
    await client.disconnect().catch(() => {});
  }

  const vaultTotals: Record<string, { principal: number; deposits: Array<{ amount: number; date: string }> }> = {};
  for (const dep of deposits) {
    if (!vaultTotals[dep.address]) {
      vaultTotals[dep.address] = { principal: 0, deposits: [] };
    }
    vaultTotals[dep.address].principal += dep.amount;
    vaultTotals[dep.address].deposits.push({ amount: dep.amount, date: dep.date });
  }
  for (const wd of withdrawals) {
    if (vaultTotals[wd.address]) {
      vaultTotals[wd.address].principal -= wd.amount;
    }
  }

  const result: Array<{ address: string; name: string; principal: number; apr: number; interest: number }> = [];
  for (const [addr, info] of Object.entries(vaultTotals)) {
    if (info.principal <= 0) continue;
    const apr = vaultApr[addr] || 0.065;
    let interest = 0;
    for (const dep of info.deposits) {
      const daysSince = Math.max(0, (Date.now() - new Date(dep.date).getTime()) / (1000 * 60 * 60 * 24));
      interest += dep.amount * apr * (daysSince / 365);
    }
    result.push({
      address: addr,
      name: vaultNames[addr] || "Vault",
      principal: info.principal,
      apr: apr * 100,
      interest,
    });
  }
  return result;
}

function shouldRunAutoWithdraw(lastRunAt: Date | null, frequency: string): boolean {
  if (!lastRunAt) return true;
  const now = Date.now();
  const last = new Date(lastRunAt).getTime();
  const hoursSince = (now - last) / (1000 * 60 * 60);
  switch (frequency) {
    case "daily": return hoursSince >= 23;
    case "weekly": return hoursSince >= 167;
    case "biweekly": return hoursSince >= 335;
    case "monthly": return hoursSince >= 719;
    default: return hoursSince >= 23;
  }
}

async function processAutoWithdrawals(): Promise<void> {
  try {
    const enabledSettings = await db.select({
      userId: userSettings.userId,
      threshold: userSettings.autoWithdrawThreshold,
      frequency: userSettings.autoWithdrawFrequency,
      lastRunAt: userSettings.autoWithdrawLastRunAt,
      autoBuyEnabled: userSettings.autoBuyXrpEnabled,
      autoBuyPercent: userSettings.autoBuyXrpPercent,
      autoBuyMinAmount: userSettings.autoBuyXrpMinAmount,
      customVaults: userSettings.customVaults,
    }).from(userSettings).where(eq(userSettings.autoWithdrawEnabled, true));

    if (enabledSettings.length === 0) return;

    const xummApiKey = process.env.VITE_XUMM_API_KEY || process.env.XUMM_API_KEY;
    const xummApiSecret = process.env.XUMM_API_SECRET;
    let xummSdk: XummSdk | null = null;
    if (xummApiKey && xummApiSecret) {
      xummSdk = new XummSdk(xummApiKey, xummApiSecret);
    }

    for (const setting of enabledSettings) {
      try {
        const tier = await getEffectiveTier(setting.userId);
        if (tier !== "premium" && tier !== "pro") {
          console.log(`[AutoWithdraw] Skipping user ${setting.userId.slice(0, 8)} — not premium/pro`);
          continue;
        }

        if (!shouldRunAutoWithdraw(setting.lastRunAt, setting.frequency || "daily")) {
          continue;
        }

        const [user] = await db.select({
          xrplWalletAddress: users.xrplWalletAddress,
        }).from(users).where(eq(users.id, setting.userId));

        if (!user?.xrplWalletAddress) continue;

        const customVaults = ((setting.customVaults as CustomVault[] | null) || []);
        const vaults = await scanVaultInterest(user.xrplWalletAddress, customVaults);

        const threshold = parseFloat(setting.threshold || "5");
        const totalInterest = vaults.reduce((sum, v) => sum + v.interest, 0);

        if (totalInterest < threshold) {
          console.log(`[AutoWithdraw] User ${setting.userId.slice(0, 8)}: interest $${totalInterest.toFixed(4)} below threshold $${threshold}`);
          await db.update(userSettings).set({ autoWithdrawLastRunAt: new Date() })
            .where(eq(userSettings.userId, setting.userId));
          continue;
        }

        console.log(`[AutoWithdraw] User ${setting.userId.slice(0, 8)}: interest $${totalInterest.toFixed(4)} >= threshold $${threshold} — triggering withdrawal`);

        const autoBuyEnabled = setting.autoBuyEnabled ?? false;
        const autoBuyPercent = setting.autoBuyPercent ?? 100;
        const autoBuyMinAmount = parseFloat(setting.autoBuyMinAmount || "5");

        let combinedWithdrawnInterest = 0;
        const vaultSummaries: string[] = [];

        for (const vault of vaults) {
          if (vault.interest < 0.01) continue;

          let withdrawPayloadId: string | null = null;

          if (xummSdk) {
            try {
              const withdrawPayload = await xummSdk.payload.create({
                txjson: {
                  TransactionType: "Payment",
                  Destination: vault.address,
                  Amount: "1",
                  Memos: [{
                    Memo: {
                      MemoType: Buffer.from("auto-withdraw", "utf8").toString("hex").toUpperCase(),
                      MemoData: Buffer.from(`Withdraw ${vault.interest.toFixed(6)} RLUSD interest from ${vault.name}`, "utf8").toString("hex").toUpperCase(),
                    },
                  }],
                },
                options: {
                  submit: true,
                  expire: 1440,
                  return_url: {
                    app: "https://cryptoownbank.com/ownbank/withdraw",
                    web: "https://cryptoownbank.com/ownbank/withdraw",
                  },
                },
                custom_meta: {
                  instruction: `CryptoOwnBank Auto-Withdraw: Approve to withdraw ${vault.interest.toFixed(4)} RLUSD interest from your ${vault.name} vault. Tap Sign to confirm.`,
                },
              } as never);

              if (withdrawPayload) {
                withdrawPayloadId = withdrawPayload.uuid;
                combinedWithdrawnInterest += vault.interest;
                vaultSummaries.push(`${vault.name}: $${vault.interest.toFixed(4)}`);
                console.log(`[AutoWithdraw] Withdrawal payload ${withdrawPayload.uuid} pushed to Xaman for ${vault.name}`);
              }
            } catch (xummErr) {
              console.error(`[AutoWithdraw] Xaman payload error for user ${setting.userId.slice(0, 8)}:`, xummErr instanceof Error ? xummErr.message : xummErr);
            }
          }

          await db.insert(autoWithdrawLogs).values({
            userId: setting.userId,
            vaultAddress: vault.address,
            vaultName: vault.name,
            interestAmount: vault.interest.toFixed(6),
            xrpConvertAmount: null,
            keepRlusdAmount: vault.interest > 0 ? vault.interest.toFixed(6) : null,
            withdrawPayloadId,
            offerPayloadId: null,
            status: withdrawPayloadId ? "pushed" : "failed",
            errorMessage: withdrawPayloadId ? null : "Xaman SDK not available",
          });
        }

        if (autoBuyEnabled && combinedWithdrawnInterest >= autoBuyMinAmount && xummSdk) {
          const xrpConvertAmount = combinedWithdrawnInterest * (autoBuyPercent / 100);
          const keepRlusdAmount = combinedWithdrawnInterest - xrpConvertAmount;

          if (xrpConvertAmount > 0.01) {
            try {
              const offerPayload = await xummSdk.payload.create({
                txjson: {
                  TransactionType: "OfferCreate",
                  TakerPays: (xrpConvertAmount * 1000000).toFixed(0),
                  TakerGets: {
                    currency: RLUSD_CURRENCY_HEX,
                    value: xrpConvertAmount.toFixed(6),
                    issuer: RLUSD_ISSUER,
                  },
                  Flags: 524288,
                },
                options: {
                  submit: true,
                  expire: 1440,
                },
                custom_meta: {
                  instruction: `CryptoOwnBank Auto-Buy XRP: Convert ${xrpConvertAmount.toFixed(4)} RLUSD → XRP (combined from ${vaultSummaries.join(", ")}). Total: $${combinedWithdrawnInterest.toFixed(4)}. Tap Sign to confirm.`,
                },
              } as never);

              if (offerPayload) {
                console.log(`[AutoWithdraw] Combined DEX offer ${offerPayload.uuid} pushed — $${xrpConvertAmount.toFixed(4)} RLUSD → XRP from ${vaultSummaries.length} vault(s)`);

                await db.insert(autoWithdrawLogs).values({
                  userId: setting.userId,
                  vaultAddress: "combined",
                  vaultName: `Combined DEX Order (${vaultSummaries.join(" + ")})`,
                  interestAmount: combinedWithdrawnInterest.toFixed(6),
                  xrpConvertAmount: xrpConvertAmount.toFixed(6),
                  keepRlusdAmount: keepRlusdAmount > 0 ? keepRlusdAmount.toFixed(6) : null,
                  withdrawPayloadId: null,
                  offerPayloadId: offerPayload.uuid,
                  status: "pushed",
                  errorMessage: null,
                });
              }
            } catch (xummErr) {
              console.error(`[AutoWithdraw] Combined DEX offer error for user ${setting.userId.slice(0, 8)}:`, xummErr instanceof Error ? xummErr.message : xummErr);
            }
          }
        }

        await db.update(userSettings).set({ autoWithdrawLastRunAt: new Date() })
          .where(eq(userSettings.userId, setting.userId));

        console.log(`[AutoWithdraw] Processed user ${setting.userId.slice(0, 8)} — ${vaults.length} vault(s), combined interest $${combinedWithdrawnInterest.toFixed(4)}`);
      } catch (userErr) {
        console.error(`[AutoWithdraw] Error processing user ${setting.userId.slice(0, 8)}:`, userErr instanceof Error ? userErr.message : userErr);
      }
    }
  } catch (error) {
    console.error("[AutoWithdraw] Error:", error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;
let autoWithdrawInterval: NodeJS.Timeout | null = null;

export function startPaymentScheduler(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(async () => {
    await processScheduledPayments();
    await processDcaOrders();
    await processLegacyPlans();
  }, 60000);

  autoWithdrawInterval = setInterval(async () => {
    await processAutoWithdrawals();
  }, 5 * 60 * 1000);

  console.log("[PaymentScheduler] Started — checking every 60 seconds (payments + DCA + legacy)");
  console.log("[AutoWithdraw] Started — checking every 5 minutes");
}

export function stopPaymentScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (autoWithdrawInterval) {
    clearInterval(autoWithdrawInterval);
    autoWithdrawInterval = null;
  }
  console.log("[PaymentScheduler] Stopped (all schedulers)");
}
