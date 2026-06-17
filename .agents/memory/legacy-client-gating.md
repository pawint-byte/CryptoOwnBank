---
name: Legacy surfaces can't be tier-gated client-side
description: Why dashboard/legacy widgets that call /api/legacy-plan must gate by render-null-on-403 instead of subscription tier.
---

Legacy Plan access (`hasLegacyAccess` in server/routes/legacy.ts) = Pro tier OR an active Legacy add-on SKU. But `/api/subscription/status` only returns `tier` — it does NOT expose add-on entitlement.

**Rule:** Any client surface that wants to show a Legacy feature (e.g. the Home dashboard check-in widget) must query `/api/legacy-plan` and render nothing on 403 / no-plan, with `retry:false` to avoid repeated failed calls. Do NOT gate by `subStatus.tier`.

**Why:** Gating by tier would wrongly hide the feature from members who bought the Legacy add-on while on a non-Pro tier. The 403 from `/api/legacy-plan` is the only authoritative entitlement signal available client-side (same pattern the `/legacy-plan` page itself uses).

**How to apply:** If you ever want to avoid the 403 network/monitoring noise, the correct fix is to add an `hasLegacyAccess` boolean to the `/api/subscription/status` response and gate the query with `enabled`, NOT to guess from tier.
