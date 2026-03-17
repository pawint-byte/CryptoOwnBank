import { storage } from "../storage";
import { db } from "../db";
import { users, walletBalances } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendLegacyBeneficiaryDelivery } from "../email";

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

let schedulerInterval: NodeJS.Timeout | null = null;

export function startPaymentScheduler(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(async () => {
    await processScheduledPayments();
    await processDcaOrders();
    await processLegacyPlans();
  }, 60000);
  console.log("[PaymentScheduler] Started — checking every 60 seconds (payments + DCA + legacy)");
}

export function stopPaymentScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[PaymentScheduler] Stopped");
  }
}
