import { describe, expect, it } from "vitest";
import { buildCheckoutSessionParams } from "../server/stripe";

describe("Premium plus Legacy Monthly Stripe checkout", () => {
  it("builds one subscription with both line items and the correct $38.99 total", () => {
    const params = buildCheckoutSessionParams(
      "user-1",
      "monthly",
      "https://example.com/success",
      "https://example.com/cancel",
      "legacy-plan",
    );
    const amounts = params.line_items!.map((item: any) => item.price_data.unit_amount);
    expect(amounts).toEqual([2900, 999]);
    expect(amounts.reduce((sum: number, amount: number) => sum + amount, 0)).toBe(3899);
    expect(params.metadata).toMatchObject({
      plan: "monthly",
      tier: "premium",
      addonKey: "legacy-plan",
      addonType: "legacy_plan",
    });
  });
});