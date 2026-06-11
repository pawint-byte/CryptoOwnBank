---
name: Sovereignty Cockpit
description: How the /cockpit "State of Your Sovereignty" command center is structured and the doctrine/storage rules that keep it aligned.
---

# Sovereignty Cockpit (`/cockpit`)

A "State of Your Sovereignty" command center that ties scattered sovereignty features into one living map. Client-only — NO schema/backend changes (matches the Wealth Architecture page's existing "client-side only, no server tracking" privacy stance; lower risk than db:push).

## Single source of truth
The six Wealth Architecture stages (Secured → Documented → Continuous → Productive → Liquid Without Selling → Tested) live in ONE place: `client/src/lib/wealth-stages.ts` (data, icons, labels, StageStatus, cadence, freshness, status + last-verified storage helpers). BOTH `/cockpit` and the Wealth Architecture page import from it — do NOT redefine stages locally in either page or they drift.

## Storage / per-user namespacing (CRITICAL — anti-bleed)
**Why:** a prior bug let one account's data show for another in the same browser. Posture data is the member's own; it must never bleed across accounts.
**How to apply:** every cockpit localStorage key is namespaced by `user.id`. Stage STATUS uses `wealth-architecture-status-v1:<uid>` for logged-in members; logged-out/public visitors fall back to the legacy GLOBAL key `wealth-architecture-status-v1`. Do NOT auto-migrate the global value into a user key — copying it into a freshly logged-in account is itself a cross-account bleed. Load user-scoped data only after `uid`/`user.id` is known (effect keyed on it), not in a bare `[]` mount effect.

## Doctrine bright lines (founder, confirmed 2026-06-09/06-11)
- Non-custodial always: never store seeds/keys/secrets. The access-continuity notes capture the ROUTE not the SECRET, with an explicit warning.
- No nagging / streaks / loot-box / FOMO. Calm opt-in reminders only.
- Self-attested posture — we do NOT surveil or report. Success = the member's sovereignty posture is current, NOT DAU.
- Framing: a money life splits into FLOW (spend/earn/borrow/bills — banks keep it) vs OWNERSHIP (hold/see/protect/grow/reach/pass-on/records — our lane). Cockpit = "the part of your memory the bank used to hold." Thesis spine: `docs/cockpit-thesis.md`.
