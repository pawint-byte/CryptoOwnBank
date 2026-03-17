import { storage } from "../storage";

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
