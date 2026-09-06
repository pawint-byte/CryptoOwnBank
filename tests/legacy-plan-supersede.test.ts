import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { userAddons } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for storage.activateLegacyAddon — the idempotency + supersede logic.
//
// activateLegacyAddon must guarantee two invariants when a Legacy Plan is
// (re)purchased:
//   1. Idempotency — replaying the same payment (same externalRef) must NOT
//      create a second row; it returns the row already on file.
//   2. Supersede — a genuinely new purchase retires the member's previously
//      active legacy add-on (status -> "superseded") so only one is ever live.
//
// These run against the real local database so the actual transaction,
// advisory lock, and drizzle queries are exercised end to end. Each test uses
// dedicated throwaway user ids that are cleaned up before/after the run.
// ---------------------------------------------------------------------------

const TEST_USERS = ["test-legacy-supersede-u1", "test-legacy-supersede-u2"];

async function cleanup() {
  await db.delete(userAddons).where(inArray(userAddons.userId, TEST_USERS));
}

function activateParams(overrides: Record<string, unknown> = {}) {
  return {
    userId: TEST_USERS[0],
    addonType: "legacy_plan",
    addonKey: "legacy-plan-yearly",
    paymentMethod: "crypto",
    stripeSubscriptionId: null,
    paidInChain: "bitcoin",
    externalRef: "crypto:pay-1",
    expiresAt: null,
    ...overrides,
  } as any;
}

async function rowsFor(userId: string) {
  return db.select().from(userAddons).where(eq(userAddons.userId, userId));
}

describe("storage.activateLegacyAddon — idempotency + supersede", () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  it("is idempotent for a replayed crypto payment (same crypto:<id> externalRef)", async () => {
    const first = await storage.activateLegacyAddon(activateParams({ externalRef: "crypto:pay-1" }));
    const second = await storage.activateLegacyAddon(activateParams({ externalRef: "crypto:pay-1" }));

    expect(second.id).toBe(first.id);
    const rows = await rowsFor(TEST_USERS[0]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("active");
  });

  it("is idempotent for a replayed card payment (same stripe:<session> externalRef)", async () => {
    const first = await storage.activateLegacyAddon(
      activateParams({ paymentMethod: "stripe", paidInChain: null, externalRef: "stripe:cs_1" }),
    );
    const second = await storage.activateLegacyAddon(
      activateParams({ paymentMethod: "stripe", paidInChain: null, externalRef: "stripe:cs_1" }),
    );

    expect(second.id).toBe(first.id);
    const rows = await rowsFor(TEST_USERS[0]);
    expect(rows).toHaveLength(1);
    expect(rows[0].externalRef).toBe("stripe:cs_1");
  });

  it("supersedes the prior active legacy add-on on a genuinely new purchase", async () => {
    const old = await storage.activateLegacyAddon(
      activateParams({ addonKey: "legacy-plan-yearly", externalRef: "crypto:pay-1" }),
    );
    const fresh = await storage.activateLegacyAddon(
      activateParams({ addonKey: "legacy-plan-5yr", externalRef: "crypto:pay-2" }),
    );

    expect(fresh.id).not.toBe(old.id);

    const rows = await rowsFor(TEST_USERS[0]);
    const oldRow = rows.find((r) => r.id === old.id)!;
    const freshRow = rows.find((r) => r.id === fresh.id)!;
    expect(oldRow.status).toBe("superseded");
    expect(oldRow.cancelledAt).toBeInstanceOf(Date);
    expect(freshRow.status).toBe("active");

    const active = rows.filter((r) => r.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0].addonKey).toBe("legacy-plan-5yr");
  });

  it("supersedes a card plan when re-bought via crypto (cross-rail upgrade)", async () => {
    const card = await storage.activateLegacyAddon(
      activateParams({
        paymentMethod: "stripe",
        paidInChain: null,
        addonKey: "legacy-plan",
        externalRef: "stripe:cs_1",
      }),
    );
    const crypto = await storage.activateLegacyAddon(
      activateParams({ paymentMethod: "crypto", addonKey: "legacy-plan-lifetime", externalRef: "crypto:pay-9" }),
    );

    const rows = await rowsFor(TEST_USERS[0]);
    expect(rows.find((r) => r.id === card.id)!.status).toBe("superseded");
    expect(rows.find((r) => r.id === crypto.id)!.status).toBe("active");
  });

  it("only supersedes the buyer's own active legacy add-ons, not other members'", async () => {
    const other = await storage.activateLegacyAddon(
      activateParams({ userId: TEST_USERS[1], addonKey: "legacy-plan-lifetime", externalRef: "crypto:other" }),
    );
    await storage.activateLegacyAddon(activateParams({ externalRef: "crypto:pay-1" }));

    const otherRows = await rowsFor(TEST_USERS[1]);
    expect(otherRows.find((r) => r.id === other.id)!.status).toBe("active");
  });

  it("does not supersede non-legacy active add-ons", async () => {
    // Seed a non-legacy add-on directly as an active row.
    const [seeded] = await db
      .insert(userAddons)
      .values({
        userId: TEST_USERS[0],
        addonType: "tool",
        addonKey: "technical-analysis",
        status: "active",
        paymentMethod: "stripe",
        externalRef: "stripe:cs_ta",
        expiresAt: null,
      })
      .returning();

    await storage.activateLegacyAddon(activateParams({ externalRef: "crypto:pay-1" }));

    const rows = await rowsFor(TEST_USERS[0]);
    expect(rows.find((r) => r.id === seeded.id)!.status).toBe("active");
  });
});
