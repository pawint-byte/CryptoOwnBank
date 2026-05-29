---
name: Legacy Plan add-on expiry rules
description: Why card vs crypto purchases of the same Legacy Plan SKU get different expiry dates
---

Legacy Plan add-on expiry depends on BOTH the SKU and the payment rail. Single
source of truth: `computeLegacyAddonExpiry(addonKey, paymentMethod)` in
`server/stripe.ts`; access gate: `isLegacyAddonActive(addon)`.

- Lifetime → no expiry (null), both rails.
- 5-Year → +5 years, both rails.
- Monthly / Annual (recurring SKUs):
  - **Card (stripe)** → expiresAt = null. The Stripe subscription auto-renews;
    access is revoked via the `customer.subscription.deleted/updated` webhook,
    NOT a stored expiry.
  - **Crypto** → one-time prepayment, so a concrete expiry is stored
    (Annual +1yr, Monthly +30d).

**Why:** a null expiry means "active until canceled" for live card subs, but
"prepaid term" doesn't auto-renew, so crypto must carry a real date. Mixing
these up would either cut off paying card members or give crypto buyers
unlimited access for one payment.

**How to apply:** any new Legacy SKU or new payment rail must go through
`computeLegacyAddonExpiry` — don't reinline date math in the webhook
(`server/routes.ts`) or crypto verifier
(`server/services/crypto-payment-verifier.ts`).
