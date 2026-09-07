import { describe, expect, it, vi } from "vitest";
import { ADDONS, LEGACY_ADDON_KEYS } from "../server/stripe";
import {
  createPendingCryptoPayment,
  toPendingCryptoPaymentJson,
} from "../server/lib/crypto-payment-creator";

describe("shared crypto payment creator", () => {
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
        Math.round((ADDONS[addonKey].amount / 100) * 0.85 * 100) / 100
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