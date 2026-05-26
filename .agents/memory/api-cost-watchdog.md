---
name: API Cost Watchdog
description: How CoB tracks external API spend, enforces ceilings, and notifies admins. Required for any new paid third-party integration.
---

CoB has an admin watchdog at `/admin/api-watch` backed by `server/services/api-watchdog.ts` and the `api_usage_log` + `api_budgets` tables.

**Rule:** any new external API call in CoB must be wrapped — `trackedFetch(provider, url, opts)` for HTTP fetches, or `recordApiCall({...})` after SDK client calls (OpenAI, Xumm, Stripe). Without this, the call is invisible to the watchdog and cost runaways won't be caught.

**Why:** before the watchdog, a hot-loop bug against OpenAI/Perplexity/Alchemy could burn through a month's API budget overnight with no warning. The watchdog adds a soft limit (Resend email warning) and hard limit (calls refused via thrown `BudgetExceededError`) per provider per period.

**How to apply:**
- Pick a stable `provider` slug (lowercase, hyphenated, e.g. `"openai"`, `"perplexity"`, `"zerion"`).
- Estimate cost per call in micro-cents using the documented convention: 1 cent = 10,000 micro-cents = $10^-6 per unit. So $0.01 = 10000, $1.00 = 1000000. The constant `MICROCENTS_PER_CENT` is in the service file.
- Pass `userId` when the call is user-attributable so "top consumers" data populates.
- Don't try to fetch around the watchdog (catching `BudgetExceededError` to retry) — the whole point is that hard caps refuse calls. Surface the error to the user.
- After wiring, an admin must set a budget under `/admin/api-watch` for the soft/hard alert flow to engage. Until a budget exists, calls log but never alert.
