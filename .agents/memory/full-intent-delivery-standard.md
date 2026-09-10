---
name: Full-intent delivery standard
description: Standing rule from the founder — complete the full intent end-to-end and verify it works as intended before calling done; never stop at a surface checkbox.
---

# Full-intent delivery standard (standing, forever)

When Andrew asks to do something, complete the **FULL INTENT** end-to-end. Do not stop at a surface checkbox. Verify it actually works as intended before calling done; surface gaps instead of declaring done early.

**Why:** A task that looks finished in-app or in code can still fail the real outcome Andrew cares about (search, publish, member journey, honesty). Calling done early creates false confidence and rework.

**Canonical example:** FAQ content “exists in the app” is **NOT** done until `/faq` is crawlable for search (real HTML title/H1/Q&A that crawlers can read without JavaScript) — not only a React route or an in-app help screen.

**How to apply on every task:**
1. Restate the intended outcome (what a stranger / crawler / member would experience when it works).
2. Implement the change.
3. Verify that outcome end-to-end (live URL, curl without JS when crawlability matters, publish when production is the target).
4. If a gap remains (quota, auth, cache), report the gap — do not mark done.

**Source:** Andrew via Chief of Staff, 2026-09-10. Applies to Replit Agent and all product bots forever.
