import { describe, expect, it, vi } from "vitest";
import { ADDONS, LEGACY_ADDON_KEYS, getCryptoDiscountRate } from "../server/stripe";
import {
  createPendingCryptoPayment,
  toPendingCryptoPaymentJson,
} from "../server/lib/crypto-payment-creator";

describe("shared crypto payment creator", () => {
  it.each(["xrp", "rlusd", "bitcoin", "ethereum", "solana", "dogecoin", "stellar"])(
    "uses the same 10% base crypto discount for %s",
    (chain) => {
      expect(getCryptoDiscountRate(chain)).toBe(0.10);
    },
  );

  it("returns the same required pending XRP shape for Premium and Pro", async () => {
    const make = async (plan: "monthly" | "pro-monthly") => {
      const payment = await createPendingCryptoPayment(
        { userId: "user-1", plan, chain: "XRP", fullUsdAmount: plan === "monthly" ? 29 : 99 },
        {
          getPaymentAddresses: vi.fn(async () => [
            { id: 1, chain: "xrp", address: "rPaymentAddress", label: null, isActive: true, createdAt: new Date() },
          ]),
          createPayment: vi.fn(async (row: any) => ({ id: `payment-${plan}`, ...row })),
          fetchPriceUsd: vi.fn(async () => 2),
          random: vi.fn(() => 0.5),
          now: vi.fn(() => new Date("2026-03-01T00:00:00.000Z")),
        },
      );
      return toPendingCryptoPaymentJson(payment);
    };
    const premium = await make("monthly");
    const pro = await make("pro-monthly");
    expect(Object.keys(premium)).toEqual(Object.keys(pro));
    expect(premium).toMatchObject({ status: "pending", expectedAsset: "XRP", toAddress: "rPaymentAddress" });
    expect(pro).toMatchObject({ status: "pending", expectedAsset: "XRP", toAddress: "rPaymentAddress" });
  });

  it.each(LEGACY_ADDON_KEYS)(
    "creates a pending payment row for %s with the main-flow JSON contract",
    async (addonKey) => {
      const createPayment = vi.fn(async (payment: any) => ({
        id: `payment-${addonKey}`,
        ...payment,
      }));
      const payment = await createPendingCryptoPayment(
        {
          userId: "user-1",
          plan: `addon:${addonKey}`,
          chain: "XRP",
          fullUsdAmount: ADDONS[addonKey].amount / 100,
          joinDate: null,
        },
        {
          getPaymentAddresses: vi.fn(async () => [
            { id: 1, chain: "xrp", address: "rPaymentAddress", label: null, isActive: true, createdAt: new Date() },
          ]),
          createPayment,
          fetchPriceUsd: vi.fn(async () => 2),
          random: vi.fn(() => 0.5),
          now: vi.fn(() => new Date("2026-03-01T00:00:00.000Z")),
        },
      );

      const expectedDiscountedUsd = (
        Math.round((ADDONS[addonKey].amount / 100) * 0.90 * 100) / 100
      ).toFixed(2);
      expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({
        plan: `addon:${addonKey}`,
        chain: "xrp",
        toAddress: "rPaymentAddress",
        expectedAsset: "XRP",
        usdAmount: expectedDiscountedUsd,
        status: "pending",
      }));
      expect(toPendingCryptoPaymentJson(payment)).toEqual({
        id: `payment-${addonKey}`,
        status: "pending",
        expectedAmount: payment.expectedAmount,
        expectedAsset: "XRP",
        toAddress: "rPaymentAddress",
        destinationTag: payment.destinationTag,
      });
    },
  );
});