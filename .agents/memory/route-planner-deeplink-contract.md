---
name: Route Planner deep-link contract
description: Which ?from / ?to query params /route-planner actually honors, so deep-links from other pages stay truthful.
---

# Route Planner deep-link contract

`/route-planner` reads `?to=` and `?from=` from the URL, but they are NOT symmetric:

- `?to=SYMBOL` — honored for any symbol in `DESTINATIONS` (BTC, ETH, SOL, XLM, XRP, MATIC, AVAX, LTC, DOGE, ADA, DOT, ATOM, TRX, ALGO, CRO, FLR, HBAR, and XMR which is `external` → redirects to `/own-privately`). RLUSD is intentionally NOT a destination.
- `?from=SYMBOL` — honored ONLY for `STABLE_STARTERS = ["USDC","USDT"]`. Any other `from` value (e.g. `from=XRP`) is **silently ignored** — no error, the field just doesn't preset.

**Why:** the planner auto-detects the member's held coins as sources; the `from` param exists only to seed the doctrine bridge coins when the member doesn't hold one yet. Non-stable starts are expected to come from wallet detection, not the URL.

**How to apply:** when deep-linking into the planner from onboarding/CTA pages, only pass `from=USDC`/`from=USDT`. For "I already hold XRP/XLM → route somewhere" CTAs, pass `to=` only and let held-coin detection fill the source — passing `from=XRP` looks right but does nothing.
