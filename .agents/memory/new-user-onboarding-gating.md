---
name: New-user onboarding / welcome gating
description: Why first-run guidance must be gated per-user server-side, not by browser localStorage.
---

First-run UI (welcome modal, onboarding checklist, quiz) must decide "is this a brand-new user?" from per-user server state, NOT browser localStorage.

**Why:** The dashboard's inline OnboardingChecklist/InventoryQuiz hides itself via localStorage keys (`onboarding-dismissed`, `onboarding-inventory`, `onboarding-step-status`). localStorage is per-browser, not per-account, so once anyone dismisses it in a browser, the NEXT freshly-registered account in that same browser sees no guidance at all. The founder hit exactly this while testing new signups.

**How to apply:** Persist "have they seen the welcome?" with `useUserData("welcome_seen")` (server-side `/api/user-data`, the same store as `sovereignty_acknowledged_at`). Gate "new user" on actual emptiness — NO wallets AND no exchange/portfolio rows (the dashboard already computes `hasData`); a wallets-only check shows the popup to existing exchange/CSV importers by mistake. Wait for the data queries to settle (`dataReady`) before opening so it doesn't flash for users who do have data. localStorage is still fine for a deliberate "reset the checklist for me" action on the current browser.
