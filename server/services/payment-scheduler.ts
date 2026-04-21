import crypto from "crypto";
import { storage } from "../storage";
import { db } from "../db";
import { users, walletBalances, userSettings, autoWithdrawLogs, dcaOrders, legacyPlans, type CustomVault } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendLegacyBeneficiaryDelivery } from "../email";
import { Client } from "xrpl";
import { XummSdk } from "xumm-sdk";

export function getNextRunDate(currentDate: Date, frequency: string, preferredDay?: number | null): Date {
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

async function getXrplOrderBookPrice(
  spendCurrency: string,
  spendIssuer: string | null,
  buyCurrency: string,
  buyIssuer: string | null,
): Promise<number> {
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
  if (!client) throw new Error("Cannot connect to XRPL");

  try {
    const takerPays = buyCurrency === "XRP"
      ? { currency: "XRP" }
      : { currency: buyCurrency, issuer: buyIssuer! };
    const takerGets = spendCurrency === "XRP"
      ? { currency: "XRP" }
      : { currency: spendCurrency, issuer: spendIssuer! };

    const response = await client.request({
      command: "book_offers",
      taker_pays: takerPays as any,
      taker_gets: takerGets as any,
      limit: 5,
    });

    const offers = (response.result as any).offers || [];
    if (offers.length > 0) {
      const offer = offers[0];
      const getVal = typeof offer.TakerGets === "string"
        ? parseFloat(offer.TakerGets) / 1_000_000
        : parseFloat(offer.TakerGets.value);
      const payVal = typeof offer.TakerPays === "string"
        ? parseFloat(offer.TakerPays) / 1_000_000
        : parseFloat(offer.TakerPays.value);
      if (getVal > 0) return payVal / getVal;
    }

    const reverseResponse = await client.request({
      command: "book_offers",
      taker_pays: takerGets as any,
      taker_gets: takerPays as any,
      limit: 5,
    });
    const reverseOffers = (reverseResponse.result as any).offers || [];
    if (reverseOffers.length > 0) {
      const offer = reverseOffers[0];
      const getVal = typeof offer.TakerGets === "string"
        ? parseFloat(offer.TakerGets) / 1_000_000
        : parseFloat(offer.TakerGets.value);
      const payVal = typeof offer.TakerPays === "string"
        ? parseFloat(offer.TakerPays) / 1_000_000
        : parseFloat(offer.TakerPays.value);
      if (payVal > 0) return getVal / payVal;
    }

    throw new Error("No order book data available");
  } finally {
    await client.disconnect().catch(() => {});
  }
}

function toHexCurrency(c: string): string {
  if (c.length <= 3) return c;
  if (c.length === 40 && /^[0-9A-Fa-f]+$/.test(c)) return c;
  return Buffer.from(c.padEnd(20, "\0")).toString("hex").toUpperCase().slice(0, 40);
}

function buildXrplAmount(currency: string, issuer: string | null, value: string): string | { currency: string; issuer: string; value: string } {
  if (currency === "XRP") {
    return (parseFloat(value) * 1_000_000).toFixed(0);
  }
  return { currency: toHexCurrency(currency), issuer: issuer!, value };
}

function getTokenDisplayName(currency: string): string {
  if (currency.length <= 3) return currency;
  if (currency.length === 40) {
    try {
      const decoded = Buffer.from(currency, "hex").toString("utf8").replace(/\0/g, "");
      return decoded || currency.slice(0, 6);
    } catch {
      return currency.slice(0, 6);
    }
  }
  return currency;
}

export async function processDcaOrders(): Promise<void> {
  try {
    const dueOrders = await storage.getDueDcaOrders();
    if (dueOrders.length === 0) return;

    const xummApiKey = process.env.VITE_XUMM_API_KEY || process.env.XUMM_API_KEY;
    const xummApiSecret = process.env.XUMM_API_SECRET;
    if (!xummApiKey || !xummApiSecret) {
      console.log(`[DCA] ${dueOrders.length} order(s) due but Xaman SDK not configured`);
      return;
    }
    const xummSdk = new XummSdk(xummApiKey, xummApiSecret);

    console.log(`[DCA] Processing ${dueOrders.length} due order(s)`);

    for (const order of dueOrders) {
      try {
        if (order.chain !== "xrpl") {
          console.log(`[DCA] Skipping order ${order.id.slice(0, 8)} — chain ${order.chain} not supported for auto-push`);
          continue;
        }

        const pendingExecutions = await storage.getDcaExecutionsByOrder(order.id);
        const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;
        for (const exec of pendingExecutions) {
          if (exec.status === "pushed" && exec.executedAt && new Date(exec.executedAt).getTime() < staleThreshold) {
            await storage.updateDcaExecution(exec.id, { status: "expired", errorMessage: "Auto-expired: no response within 24h" });
            console.log(`[DCA] Auto-expired stale pushed execution ${exec.id.slice(0, 8)} (created ${exec.executedAt})`);
          }
        }
        const freshPending = pendingExecutions.some(e => e.status === "pushed" && (!e.executedAt || new Date(e.executedAt).getTime() >= staleThreshold));
        if (freshPending) {
          console.log(`[DCA] Order ${order.id.slice(0, 8)} already has a recent pending Xaman payload — skipping`);
          continue;
        }

        const [user] = await db.select({
          xrplWalletAddress: users.xrplWalletAddress,
        }).from(users).where(eq(users.id, order.userId));

        if (!user?.xrplWalletAddress) {
          console.log(`[DCA] Order ${order.id.slice(0, 8)} — user has no XRPL wallet connected`);
          continue;
        }

        const spendAmount = parseFloat(order.spendAmount);
        const spendDisplay = getTokenDisplayName(order.spendCurrency);
        const buyDisplay = getTokenDisplayName(order.buyCurrency);

        let pricePerBuy = 0;
        try {
          pricePerBuy = await getXrplOrderBookPrice(
            order.spendCurrency, order.spendIssuer || null,
            order.buyCurrency, order.buyIssuer || null,
          );
        } catch (priceErr) {
          console.error(`[DCA] Order ${order.id.slice(0, 8)} — could not fetch order book price:`, priceErr instanceof Error ? priceErr.message : priceErr);
          continue;
        }

        if (pricePerBuy <= 0) {
          console.log(`[DCA] Order ${order.id.slice(0, 8)} — no valid price from order book`);
          continue;
        }

        let buyAmount = (spendAmount / pricePerBuy).toFixed(6);
        const sanityMax = spendAmount * 10;
        if (parseFloat(buyAmount) > sanityMax) {
          buyAmount = (spendAmount * pricePerBuy).toFixed(6);
        }
        if (parseFloat(buyAmount) <= 0) {
          console.log(`[DCA] Order ${order.id.slice(0, 8)} — calculated buy amount is zero`);
          continue;
        }

        const slippageBuyAmount = (parseFloat(buyAmount) * 0.97).toFixed(6);

        const takerGets = buildXrplAmount(order.spendCurrency, order.spendIssuer || null, spendAmount.toString());
        const takerPays = buildXrplAmount(order.buyCurrency, order.buyIssuer || null, slippageBuyAmount);

        try {
          const payload = await xummSdk.payload.create({
            txjson: {
              TransactionType: "OfferCreate",
              Account: user.xrplWalletAddress,
              TakerGets: takerGets,
              TakerPays: takerPays,
              Flags: 0x00040000,
            },
            options: {
              submit: true,
              expire: 1440,
              return_url: {
                app: "https://cryptoownbank.com/ownbank/dca",
                web: "https://cryptoownbank.com/ownbank/dca",
              },
            },
            custom_meta: {
              instruction: `CryptoOwnBank DCA: Buy ~${buyAmount} ${buyDisplay} with ${spendAmount} ${spendDisplay}. ${order.label || "Scheduled DCA order"}. Tap Sign to execute on the XRPL DEX.`,
            },
          } as never);

          if (payload?.uuid) {
            await storage.createDcaExecution({
              dcaOrderId: order.id,
              userId: order.userId,
              status: "pushed",
              spendAmount: order.spendAmount,
              receivedAmount: slippageBuyAmount,
              xamanPayloadId: payload.uuid,
              txHash: null,
              errorMessage: null,
            });

            console.log(`[DCA] Pushed Xaman payload ${payload.uuid} for order ${order.id.slice(0, 8)} — ${spendAmount} ${spendDisplay} → ~${buyAmount} ${buyDisplay}`);
          }
        } catch (xummErr) {
          console.error(`[DCA] Xaman push failed for order ${order.id.slice(0, 8)}:`, xummErr instanceof Error ? xummErr.message : xummErr);
        }
      } catch (orderErr) {
        console.error(`[DCA] Error processing order ${order.id.slice(0, 8)}:`, orderErr instanceof Error ? orderErr.message : orderErr);
      }
    }
  } catch (error) {
    console.error("[DCA] Error processing DCA orders:", error);
  }
}

export async function processDcaPendingPayloads(): Promise<void> {
  try {
    const pendingExecutions = await storage.getPendingDcaExecutions();
    if (pendingExecutions.length === 0) return;

    const xummApiKey = process.env.VITE_XUMM_API_KEY || process.env.XUMM_API_KEY;
    const xummApiSecret = process.env.XUMM_API_SECRET;
    if (!xummApiKey || !xummApiSecret) return;
    const xummSdk = new XummSdk(xummApiKey, xummApiSecret);

    for (const execution of pendingExecutions) {
      if (!execution.xamanPayloadId) {
        await storage.updateDcaExecution(execution.id, { status: "expired" });
        continue;
      }

      try {
        const payloadResult = await xummSdk.payload.get(execution.xamanPayloadId);
        if (!payloadResult) {
          await storage.updateDcaExecution(execution.id, { status: "expired", errorMessage: "Payload not found" });
          continue;
        }

        const meta = payloadResult.meta;
        const response = payloadResult.response;

        if (meta.resolved && meta.signed && response?.txid) {
          await storage.updateDcaExecution(execution.id, {
            status: "completed",
            txHash: response.txid,
          });

          const order = await storage.getDcaOrder(execution.dcaOrderId);
          if (order) {
            const newRunsCompleted = (order.runsCompleted || 0) + 1;
            const isComplete = order.totalRuns && newRunsCompleted >= order.totalRuns;

            await storage.updateDcaOrder(order.id, {
              lastRunAt: new Date(),
              nextRunAt: isComplete ? order.nextRunAt : getNextRunDate(order.nextRunAt, order.frequency, order.preferredDay),
              runsCompleted: newRunsCompleted,
              status: isComplete ? "completed" : order.status,
            });

            const buyDisplay = getTokenDisplayName(order.buyCurrency);
            const spendDisplay = getTokenDisplayName(order.spendCurrency);
            console.log(`[DCA] Confirmed — order ${order.id.slice(0, 8)} signed (tx: ${response.txid.slice(0, 12)}...) — ${order.spendAmount} ${spendDisplay} → ${buyDisplay}`);
          }
        } else if (meta.resolved && !meta.signed) {
          await storage.updateDcaExecution(execution.id, {
            status: "rejected",
            errorMessage: "User rejected the signing request",
          });
          console.log(`[DCA] Rejected — execution ${execution.id.slice(0, 8)} was declined by user`);
        } else if (meta.expired) {
          await storage.updateDcaExecution(execution.id, {
            status: "expired",
            errorMessage: "Xaman payload expired (24h timeout)",
          });
          console.log(`[DCA] Expired — execution ${execution.id.slice(0, 8)} timed out`);
        }
      } catch (checkErr) {
        console.error(`[DCA] Error checking payload ${execution.xamanPayloadId}:`, checkErr instanceof Error ? checkErr.message : checkErr);
      }
    }
  } catch (error) {
    console.error("[DCA] Error checking pending payloads:", error);
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

    try {
      const exportReminderPlans = await storage.getLegacyPlansNeedingExportReminder();
      for (const plan of exportReminderPlans) {
        try {
          const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
          if (!owner?.email) continue;
          const ownerName = owner.firstName || owner.email.split("@")[0];
          const exportUrl = `https://cryptoownbank.com/legacy-plan?action=export`;
          const { sendLegacyExportReminder } = await import("../email");
          await sendLegacyExportReminder(owner.email, ownerName, exportUrl, plan.lastExportedAt || null);
          await storage.updateLegacyPlan(plan.id, { exportReminderSentAt: now } as any);
          console.log(`[Legacy] Sent annual export reminder to ${owner.email}`);
        } catch (e) {
          console.error(`[Legacy] Export reminder failed for plan ${plan.id}:`, e);
        }
      }
    } catch (e) {
      console.error("[Legacy] Export reminder loop failed:", e);
    }

    try {
      const earlyTriggerPlans = await storage.getLegacyPlansWithPendingEarlyTrigger();
      for (const plan of earlyTriggerPlans) {
        if (!plan.earlyTriggerRequestedAt) continue;
        const vetoDays = plan.earlyTriggerVetoDays || 30;
        const deadline = new Date(plan.earlyTriggerRequestedAt.getTime() + vetoDays * 86400000);
        if (now >= deadline && plan.status !== "triggered") {
          console.log(`[Legacy] Plan ${plan.id} early-trigger veto window expired — triggering`);
          await storage.updateLegacyPlan(plan.id, { status: "grace", graceStartedAt: new Date(now.getTime() - (plan.gracePeriodDays || 14) * 86400000 - 1000) } as any);
        }
      }
    } catch (e) {
      console.error("[Legacy] Early-trigger loop failed:", e);
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
              notes: w.notes || undefined,
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

            const redistributionDays = plan.contingencyRedistributionDays ?? 14;
            for (const b of beneficiaries) {
              if (b.markedDeceasedAt) {
                console.log(`[Legacy] Skipping deceased beneficiary ${b.name} — will redistribute`);
                continue;
              }
              try {
                const ackToken = crypto.randomBytes(32).toString("hex");
                const ackUrl = `https://cryptoownbank.com/api/legacy-beneficiaries/acknowledge-delivery?token=${ackToken}`;
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
                  b.beneficiaryGroup ? ackUrl : null,
                  b.beneficiaryGroup ? redistributionDays : null,
                  null,
                );
                await storage.updateLegacyBeneficiary(b.id, {
                  deliveredAt: now,
                  deliveryAckToken: b.beneficiaryGroup ? ackToken : null,
                } as any);
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

    const triggeredPlans = await storage.getTriggeredLegacyPlans();
    for (const plan of triggeredPlans) {
      try {
        const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);
        const redistributionDays = plan.contingencyRedistributionDays ?? 14;

        const [ownerForFallback] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
        const ownerNameFB = ownerForFallback?.firstName || ownerForFallback?.email?.split("@")[0] || "The plan holder";
        const userWalletsFB = await storage.getUserWallets(plan.userId);
        const walletSummaryFB = userWalletsFB.map(w => ({
          name: w.label || w.address?.slice(0, 12) + "..." || "Unnamed",
          chain: w.chain || "Unknown",
          address: w.address || undefined,
          notes: w.notes || undefined,
        }));
        const balancesFB = await storage.getWalletBalancesByUser(plan.userId);
        const assetMapFB = new Map<string, { balance: number; value: number }>();
        for (const bal of balancesFB) {
          const ex = assetMapFB.get(bal.asset) || { balance: 0, value: 0 };
          ex.balance += parseFloat(bal.balance || "0");
          ex.value += parseFloat(bal.usdValue || "0");
          assetMapFB.set(bal.asset, ex);
        }
        const assetSummaryFB = Array.from(assetMapFB.entries())
          .filter(([, v]) => v.balance > 0)
          .sort((a, b) => b[1].value - a[1].value)
          .slice(0, 20)
          .map(([asset, v]) => ({
            asset,
            balance: v.balance < 0.0001 ? v.balance.toExponential(2) : v.balance.toFixed(4),
            value: v.value > 0 ? `$${v.value.toFixed(2)}` : undefined,
          }));

        for (const b of beneficiaries) {
          if (b.fallbackUsedAt) continue;
          if (b.deliveryAcknowledgedAt) continue;
          const fallbacks: any[] = Array.isArray((b as any).fallbackRecipients) ? (b as any).fallbackRecipients : [];
          if (fallbacks.length === 0) continue;
          const isLapsed = b.markedDeceasedAt || (b.deliveredAt && (now.getTime() - new Date(b.deliveredAt).getTime()) >= redistributionDays * 86400000 && !b.deliveryAcknowledgedAt);
          if (!isLapsed) continue;
          const reason = b.markedDeceasedAt
            ? `${b.name} was marked deceased — packet routed to their fallback recipient(s)`
            : `${b.name} did not acknowledge receipt within ${redistributionDays} days — packet routed to their fallback recipient(s)`;
          for (const fb of fallbacks) {
            if (!fb?.email || !fb?.name) continue;
            try {
              await sendLegacyBeneficiaryDelivery(
                String(fb.email), String(fb.name), ownerNameFB,
                plan.personalMessage,
                b.walletType, b.deviceInstructions, b.seedPhraseInstructions,
                b.additionalNotes, b.splitPieces, walletSummaryFB, assetSummaryFB,
                null, null,
                { fromName: b.name, reason },
              );
              console.log(`[Legacy] Fallback delivery to ${fb.name} for ${b.name}`);
            } catch (e) {
              console.error(`[Legacy] Fallback send failed:`, e);
            }
          }
          await storage.updateLegacyBeneficiary(b.id, { fallbackUsedAt: now, redistributionDoneAt: now } as any);
          (b as any).fallbackUsedAt = now;
          (b as any).redistributionDoneAt = now;
        }

        const groups = new Map<string, typeof beneficiaries>();
        for (const b of beneficiaries) {
          if (!b.beneficiaryGroup) continue;
          if (b.fallbackUsedAt) continue;
          const key = b.beneficiaryGroup.toLowerCase();
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(b);
        }
        for (const [groupKey, members] of Array.from(groups.entries())) {
          const survivors = members.filter(m => m.deliveryAcknowledgedAt && !m.markedDeceasedAt);
          const lapsed: typeof members = [];
          for (const m of members) {
            if (m.redistributionDoneAt) continue;
            if (m.deliveryAcknowledgedAt) continue;
            if (m.markedDeceasedAt) {
              lapsed.push(m);
              continue;
            }
            if (m.deliveredAt) {
              const windowEnd = new Date(m.deliveredAt);
              windowEnd.setDate(windowEnd.getDate() + redistributionDays);
              if (now >= windowEnd) lapsed.push(m);
            }
          }
          if (lapsed.length === 0 || survivors.length === 0) continue;

          const [owner] = await db.select({
            firstName: users.firstName,
            email: users.email,
          }).from(users).where(eq(users.id, plan.userId));
          const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "The plan holder";
          const userWallets = await storage.getUserWallets(plan.userId);
          const walletSummary = userWallets.map(w => ({
            name: w.label || w.address?.slice(0, 12) + "..." || "Unnamed",
            chain: w.chain || "Unknown",
            address: w.address || undefined,
            notes: w.notes || undefined,
          }));
          const balances = await storage.getWalletBalancesByUser(plan.userId);
          const assetMap = new Map<string, { balance: number; value: number }>();
          for (const bal of balances) {
            const ex = assetMap.get(bal.asset) || { balance: 0, value: 0 };
            ex.balance += parseFloat(bal.balance || "0");
            ex.value += parseFloat(bal.usdValue || "0");
            assetMap.set(bal.asset, ex);
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

          for (const lapsedMember of lapsed) {
            const reason = lapsedMember.markedDeceasedAt
              ? "They were marked deceased by the plan owner before the trigger fired"
              : `They did not acknowledge receipt within ${redistributionDays} days of the original delivery`;
            for (const survivor of survivors) {
              try {
                await sendLegacyBeneficiaryDelivery(
                  survivor.email,
                  survivor.name,
                  ownerName,
                  plan.personalMessage,
                  lapsedMember.walletType,
                  lapsedMember.deviceInstructions,
                  lapsedMember.seedPhraseInstructions,
                  lapsedMember.additionalNotes,
                  lapsedMember.splitPieces,
                  walletSummary,
                  assetSummary,
                  null,
                  null,
                  { fromName: lapsedMember.name, reason },
                );
                console.log(`[Legacy] Redistributed ${lapsedMember.name}'s packet to ${survivor.name} (group: ${groupKey})`);
              } catch (e) {
                console.error(`[Legacy] Redistribution send failed:`, e);
              }
            }
            await storage.updateLegacyBeneficiary(lapsedMember.id, { redistributionDoneAt: now } as any);
          }
        }
      } catch (e) {
        console.error(`[Legacy] Redistribution check failed for plan ${plan.id}:`, e);
      }
    }

    try {
      const { sendLegacyLastResortNotification, sendLegacyLastResortConfirmation, sendLegacyLastResortRelease } = await import("../email");
      const lastResortPlans = await storage.getTriggeredLegacyPlansForLastResort();
      const NOTIFY_PHASE_DAYS = 30;
      const CONFIRM_PHASE_DAYS = 60;

      for (const plan of lastResortPlans) {
        if (!plan.triggeredAt) continue;
        const windowDays = plan.lastResortWindowDays ?? 365;
        const windowOpensAt = new Date(plan.triggeredAt.getTime() + windowDays * 86400000);
        if (now < windowOpensAt) continue;
        if (plan.lastResortObjectedAt) {
          const objectedAge = now.getTime() - plan.lastResortObjectedAt.getTime();
          if (objectedAge < 90 * 86400000) continue;
          await storage.updateLegacyPlan(plan.id, {
            lastResortObjectedAt: null,
            lastResortObjectedBy: null,
            lastResortNotifyStartedAt: null,
            lastResortConfirmStartedAt: null,
            lastResortObjectionToken: null,
          } as any);
          continue;
        }

        const [owner] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
        const ownerName = owner?.firstName || owner?.email?.split("@")[0] || "The plan holder";
        const beneficiaries = await storage.getLegacyBeneficiaries(plan.id);

        const stakeholders: Array<{ name: string; email: string; role: string }> = [];
        for (const b of beneficiaries) {
          if (b.email) stakeholders.push({ name: b.name, email: b.email, role: "beneficiary" });
        }
        if (plan.secondaryContactEmail) {
          stakeholders.push({
            name: plan.secondaryContactName || "Secondary contact",
            email: plan.secondaryContactEmail,
            role: "secondary",
          });
        }
        if (owner?.email) stakeholders.push({ name: ownerName, email: owner.email, role: "owner" });

        if (!plan.lastResortNotifyStartedAt) {
          const token = crypto.randomBytes(32).toString("hex");
          const auditEntry = `${now.toISOString()} NOTIFY_OPENED stakeholders=${stakeholders.length}`;
          const [claimed] = await db.update(legacyPlans).set({
            lastResortNotifyStartedAt: now,
            lastResortObjectionToken: token,
            lastResortAuditLog: ((plan.lastResortAuditLog || "") + "\n" + auditEntry).trim(),
          } as any).where(
            and(
              eq(legacyPlans.id, plan.id),
              sql`${legacyPlans.lastResortNotifyStartedAt} IS NULL`,
              sql`${legacyPlans.lastResortReleasedAt} IS NULL`,
              sql`${legacyPlans.lastResortObjectedAt} IS NULL`,
            )
          ).returning();
          if (!claimed) {
            console.log(`[Legacy LastResort] Plan ${plan.id} notification phase already claimed — skipping`);
            continue;
          }
          const objectionUrl = `https://cryptoownbank.com/legacy-plan/object/${token}`;
          for (const s of stakeholders) {
            try {
              await sendLegacyLastResortNotification(s.email, s.name, ownerName, objectionUrl, NOTIFY_PHASE_DAYS, CONFIRM_PHASE_DAYS);
            } catch (e) {
              console.error(`[Legacy LastResort] Notify failed for ${s.email}:`, e);
            }
          }
          console.log(`[Legacy LastResort] Plan ${plan.id} entered notification phase — ${stakeholders.length} stakeholders contacted`);
          continue;
        }

        const notifyAge = now.getTime() - plan.lastResortNotifyStartedAt.getTime();
        if (notifyAge < NOTIFY_PHASE_DAYS * 86400000) continue;

        if (!plan.lastResortConfirmStartedAt) {
          const auditEntry = `${now.toISOString()} CONFIRM_OPENED stakeholders=${stakeholders.length}`;
          const [claimed] = await db.update(legacyPlans).set({
            lastResortConfirmStartedAt: now,
            lastResortAuditLog: ((plan.lastResortAuditLog || "") + "\n" + auditEntry).trim(),
          } as any).where(
            and(
              eq(legacyPlans.id, plan.id),
              sql`${legacyPlans.lastResortConfirmStartedAt} IS NULL`,
              sql`${legacyPlans.lastResortReleasedAt} IS NULL`,
              sql`${legacyPlans.lastResortObjectedAt} IS NULL`,
            )
          ).returning();
          if (!claimed) {
            console.log(`[Legacy LastResort] Plan ${plan.id} confirmation phase already claimed or objected — skipping`);
            continue;
          }
          const objectionUrl = `https://cryptoownbank.com/legacy-plan/object/${plan.lastResortObjectionToken}`;
          for (const s of stakeholders) {
            try {
              await sendLegacyLastResortConfirmation(s.email, s.name, ownerName, objectionUrl, CONFIRM_PHASE_DAYS);
            } catch (e) {
              console.error(`[Legacy LastResort] Confirm failed for ${s.email}:`, e);
            }
          }
          console.log(`[Legacy LastResort] Plan ${plan.id} entered confirmation phase`);
          continue;
        }

        const confirmAge = now.getTime() - plan.lastResortConfirmStartedAt.getTime();
        if (confirmAge < CONFIRM_PHASE_DAYS * 86400000) continue;

        const [ownerForRelease] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, plan.userId));
        const ownerNameRel = ownerForRelease?.firstName || ownerForRelease?.email?.split("@")[0] || "The plan holder";
        const userWalletsR = await storage.getUserWallets(plan.userId);
        const walletSummaryR = userWalletsR.map(w => ({
          name: w.label || w.address?.slice(0, 12) + "..." || "Unnamed",
          chain: w.chain || "Unknown",
          address: w.address || undefined,
          notes: w.notes || undefined,
        }));
        const balancesR = await storage.getWalletBalancesByUser(plan.userId);
        const assetMapR = new Map<string, { balance: number; value: number }>();
        for (const bal of balancesR) {
          const ex = assetMapR.get(bal.asset) || { balance: 0, value: 0 };
          ex.balance += parseFloat(bal.balance || "0");
          ex.value += parseFloat(bal.usdValue || "0");
          assetMapR.set(bal.asset, ex);
        }
        const assetSummaryR = Array.from(assetMapR.entries())
          .filter(([, v]) => v.balance > 0)
          .sort((a, b) => b[1].value - a[1].value).slice(0, 20)
          .map(([asset, v]) => ({
            asset,
            balance: v.balance < 0.0001 ? v.balance.toExponential(2) : v.balance.toFixed(4),
            value: v.value > 0 ? `$${v.value.toFixed(2)}` : undefined,
          }));

        const releaseAuditEntry = `${now.toISOString()} RELEASE_CLAIMED`;
        const [releaseClaimed] = await db.update(legacyPlans).set({
          lastResortReleasedAt: now,
          lastResortAuditLog: ((plan.lastResortAuditLog || "") + "\n" + releaseAuditEntry).trim(),
        } as any).where(
          and(
            eq(legacyPlans.id, plan.id),
            sql`${legacyPlans.lastResortReleasedAt} IS NULL`,
            sql`${legacyPlans.lastResortObjectedAt} IS NULL`,
            sql`${legacyPlans.lastResortConfirmStartedAt} IS NOT NULL`,
          )
        ).returning();
        if (!releaseClaimed) {
          console.log(`[Legacy LastResort] Plan ${plan.id} release already claimed or objection arrived — skipping`);
          continue;
        }
        let releasedCount = 0;
        for (const b of beneficiaries) {
          if (!b.email) continue;
          try {
            await sendLegacyLastResortRelease(
              b.email, b.name, ownerNameRel,
              plan.personalMessage,
              b.walletType, b.deviceInstructions, b.seedPhraseInstructions,
              b.additionalNotes, b.splitPieces, b.encryptedVault, b.encryptedVaultHint,
              walletSummaryR, assetSummaryR,
            );
            releasedCount++;
          } catch (e) {
            console.error(`[Legacy LastResort] Release send failed for ${b.email}:`, e);
          }
        }
        const finalAudit = `${now.toISOString()} RELEASED beneficiaries=${releasedCount}`;
        await storage.updateLegacyPlan(plan.id, {
          lastResortAuditLog: ((releaseClaimed.lastResortAuditLog || "") + "\n" + finalAudit).trim(),
        } as any);
        console.log(`[Legacy LastResort] Plan ${plan.id} RELEASED to ${releasedCount} beneficiaries`);
      }
    } catch (e) {
      console.error("[Legacy LastResort] Loop failed:", e);
    }

    return;
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
                      MemoData: Buffer.from(`Withdrawal reminder: ${vault.interest.toFixed(6)} RLUSD interest accrued in ${vault.name} — go to Soil to withdraw full position`, "utf8").toString("hex").toUpperCase(),
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
                  instruction: `CryptoOwnBank Reminder: Your ${vault.name} vault has ${vault.interest.toFixed(4)} RLUSD in accrued interest. Go to Soil to withdraw your full position (principal + interest). Tap to acknowledge.`,
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
let dcaInterval: NodeJS.Timeout | null = null;
let dcaPayloadInterval: NodeJS.Timeout | null = null;

export function startPaymentScheduler(): void {
  if (schedulerInterval) return;
  const paymentOffsetMs = 90 * 60 * 1000;
  const withdrawOffsetMs = 120 * 60 * 1000;
  const dcaOffsetMs = 5 * 60 * 1000;
  const dcaPayloadOffsetMs = 10 * 60 * 1000;

  setTimeout(() => {
    processScheduledPayments().catch(() => {});
    processLegacyPlans().catch(() => {});
    schedulerInterval = setInterval(async () => {
      await processScheduledPayments();
      await processLegacyPlans();
    }, 4 * 60 * 60 * 1000);
  }, paymentOffsetMs);

  setTimeout(() => {
    processDcaOrders().catch(() => {});
    dcaInterval = setInterval(async () => {
      await processDcaOrders();
    }, 30 * 60 * 1000);
  }, dcaOffsetMs);

  setTimeout(() => {
    processDcaPendingPayloads().catch(() => {});
    dcaPayloadInterval = setInterval(async () => {
      await processDcaPendingPayloads();
    }, 15 * 60 * 1000);
  }, dcaPayloadOffsetMs);

  setTimeout(() => {
    processAutoWithdrawals().catch(() => {});
    autoWithdrawInterval = setInterval(async () => {
      await processAutoWithdrawals();
    }, 4 * 60 * 60 * 1000);
  }, withdrawOffsetMs);

  console.log("[PaymentScheduler] Started — payments+legacy every 4h (offset 90min)");
  console.log("[DCA] Started — checking due orders every 30min (offset 5min), payload results every 15min (offset 10min)");
  console.log("[AutoWithdraw] Started — checking every 4h, offset 120min");
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
  if (dcaInterval) {
    clearInterval(dcaInterval);
    dcaInterval = null;
  }
  if (dcaPayloadInterval) {
    clearInterval(dcaPayloadInterval);
    dcaPayloadInterval = null;
  }
  console.log("[PaymentScheduler] Stopped (all schedulers)");
}
