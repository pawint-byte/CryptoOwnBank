import { db } from "../db";
import { apiUsageLog, apiBudgets, type ApiBudget } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { sendEmail, escapeHtml } from "../email";

const PERIOD_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

let budgetCache: ApiBudget[] | null = null;
let budgetCacheAt = 0;
const BUDGET_CACHE_MS = 60_000;

async function getBudgets(): Promise<ApiBudget[]> {
  const now = Date.now();
  if (budgetCache && now - budgetCacheAt < BUDGET_CACHE_MS) return budgetCache;
  budgetCache = await db.select().from(apiBudgets);
  budgetCacheAt = now;
  return budgetCache;
}

export function invalidateBudgetCache(): void {
  budgetCache = null;
  budgetCacheAt = 0;
}

/**
 * Cost unit convention: cost_micro_cents = 1/10,000 of a cent = $10^-6 per unit.
 * So $0.01 = 10,000 micro-cents, $1.00 = 1,000,000 micro-cents.
 * Divide by 10,000 to convert to cents.
 */
const MICROCENTS_PER_CENT = 10_000;

async function getCurrentPeriodSpendCents(provider: string, period: string): Promise<number> {
  const periodMs = PERIOD_MS[period];
  if (!periodMs) return 0;
  const since = new Date(Date.now() - periodMs);
  const [row] = await db
    .select({ total: sql<string>`COALESCE(SUM(${apiUsageLog.costMicroCents}), 0)` })
    .from(apiUsageLog)
    .where(and(eq(apiUsageLog.provider, provider), gte(apiUsageLog.requestedAt, since)));
  const microCents = Number(row?.total || 0);
  return microCents / MICROCENTS_PER_CENT;
}

export class BudgetExceededError extends Error {
  constructor(public provider: string, public period: string, public limitCents: number) {
    super(`API budget exceeded: ${provider} (${period}) hard limit $${(limitCents / 100).toFixed(2)}`);
    this.name = "BudgetExceededError";
  }
}

async function rollPeriodIfNeeded(b: ApiBudget): Promise<boolean> {
  const periodMs = PERIOD_MS[b.period];
  if (!periodMs) return false;
  const elapsed = Date.now() - new Date(b.periodStartedAt).getTime();
  if (elapsed > periodMs) {
    await db.update(apiBudgets).set({
      periodStartedAt: new Date(),
      softAlertSentAt: null,
      hardAlertSentAt: null,
      updatedAt: new Date(),
    }).where(eq(apiBudgets.id, b.id));
    invalidateBudgetCache();
    return true;
  }
  return false;
}

async function enforceAndAlert(provider: string): Promise<void> {
  const budgets = (await getBudgets()).filter(b => b.provider === provider && b.enforced);
  for (const b of budgets) {
    const rolled = await rollPeriodIfNeeded(b);
    if (rolled) continue;
    const totalCents = await getCurrentPeriodSpendCents(provider, b.period);
    if (totalCents >= b.hardLimitCents) {
      if (!b.hardAlertSentAt && b.alertEmail) {
        await sendEmail(
          b.alertEmail,
          `[CryptoOwnBank] HARD LIMIT HIT: ${provider} ${b.period}`,
          `<p>API provider <strong>${escapeHtml(provider)}</strong> has reached its <strong>hard</strong> ${b.period} budget of $${(b.hardLimitCents / 100).toFixed(2)}.</p>
           <p>Current period spend: <strong>$${(totalCents / 100).toFixed(2)}</strong></p>
           <p>New calls to this provider are now being <strong>refused</strong>. Visit <a href="/admin/api-watch">/admin/api-watch</a> to investigate or adjust the ceiling.</p>`
        ).catch(() => {});
        await db.update(apiBudgets).set({ hardAlertSentAt: new Date() }).where(eq(apiBudgets.id, b.id));
        invalidateBudgetCache();
      }
      throw new BudgetExceededError(provider, b.period, b.hardLimitCents);
    }
    if (totalCents >= b.softLimitCents && !b.softAlertSentAt && b.alertEmail) {
      const pct = b.hardLimitCents > 0 ? Math.round((totalCents / b.hardLimitCents) * 100) : 0;
      await sendEmail(
        b.alertEmail,
        `[CryptoOwnBank] Soft limit reached: ${provider} ${b.period}`,
        `<p>API provider <strong>${escapeHtml(provider)}</strong> crossed its soft ${b.period} limit of $${(b.softLimitCents / 100).toFixed(2)}.</p>
         <p>Current spend: <strong>$${(totalCents / 100).toFixed(2)}</strong> (${pct}% of hard limit $${(b.hardLimitCents / 100).toFixed(2)}).</p>
         <p>Calls are still flowing. Visit <a href="/admin/api-watch">/admin/api-watch</a> to monitor.</p>`
      ).catch(() => {});
      await db.update(apiBudgets).set({ softAlertSentAt: new Date() }).where(eq(apiBudgets.id, b.id));
      invalidateBudgetCache();
    }
  }
}

export interface TrackedFetchOpts extends RequestInit {
  userId?: string | null;
  /** Cost in micro-cents (1 cent = 10,000 micro-cents = $10^-6 per unit). $0.01 = 10000, $1.00 = 1000000. */
  costMicroCents?: number;
}

export async function trackedFetch(
  provider: string,
  url: string,
  opts: TrackedFetchOpts = {}
): Promise<Response> {
  const { userId = null, costMicroCents = 0, ...fetchOpts } = opts;
  try {
    await enforceAndAlert(provider);
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      db.insert(apiUsageLog).values({
        provider,
        endpoint: url.slice(0, 500),
        userId,
        statusCode: 0,
        costMicroCents: 0,
        latencyMs: 0,
        ok: false,
        errorMessage: "Refused by watchdog: hard limit reached",
      }).catch(() => {});
      throw e;
    }
    throw e;
  }
  const start = Date.now();
  let response: Response | null = null;
  let errorMessage: string | null = null;
  let statusCode = 0;
  let ok = false;
  let thrown: unknown = null;
  try {
    response = await fetch(url, fetchOpts);
    statusCode = response.status;
    ok = response.ok;
    if (!ok) {
      try {
        const text = await response.clone().text();
        errorMessage = text.slice(0, 500);
      } catch {}
    }
  } catch (err: any) {
    errorMessage = String(err?.message || err).slice(0, 500);
    thrown = err;
  }
  const latencyMs = Date.now() - start;
  db.insert(apiUsageLog).values({
    provider,
    endpoint: url.slice(0, 500),
    userId,
    statusCode,
    costMicroCents: ok ? costMicroCents : 0,
    latencyMs,
    ok,
    errorMessage,
  }).catch(() => {});
  if (ok && costMicroCents > 0) {
    enforceAndAlert(provider).catch(() => {});
  }
  if (thrown) throw thrown;
  return response!;
}

export async function recordApiCall(args: {
  provider: string;
  endpoint?: string;
  userId?: string | null;
  statusCode?: number;
  costMicroCents?: number;
  latencyMs?: number;
  ok: boolean;
  errorMessage?: string | null;
}): Promise<void> {
  await db.insert(apiUsageLog).values({
    provider: args.provider,
    endpoint: (args.endpoint || "").slice(0, 500),
    userId: args.userId ?? null,
    statusCode: args.statusCode ?? 0,
    costMicroCents: args.ok ? (args.costMicroCents ?? 0) : 0,
    latencyMs: args.latencyMs ?? 0,
    ok: args.ok,
    errorMessage: args.errorMessage ? args.errorMessage.slice(0, 500) : null,
  }).catch(() => {});
  if (args.ok && (args.costMicroCents ?? 0) > 0) {
    enforceAndAlert(args.provider).catch(() => {});
  }
}

export async function isProviderBlocked(provider: string): Promise<boolean> {
  try {
    await enforceAndAlert(provider);
    return false;
  } catch (e) {
    if (e instanceof BudgetExceededError) return true;
    return false;
  }
}
