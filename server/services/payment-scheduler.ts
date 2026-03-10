import { storage } from "../storage";

function getNextRunDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
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
          nextRunAt: isComplete ? payment.nextRunAt : getNextRunDate(payment.nextRunAt, payment.frequency),
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

let schedulerInterval: NodeJS.Timeout | null = null;

export function startPaymentScheduler(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(processScheduledPayments, 60000);
  console.log("[PaymentScheduler] Started — checking every 60 seconds");
}

export function stopPaymentScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[PaymentScheduler] Stopped");
  }
}
