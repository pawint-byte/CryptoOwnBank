---
name: Canonical holding location ("one true source")
description: Why holding location/source must not be auto-migrated; how the unified Location model is scoped.
---

A holding's "where it's held" label is currently reconstructed from three independent origins depending on intake: the import account name (`accounts.accountName`), the connected/manual wallet label or chain (`wallets.label` / `wallets.chain`), and manual entries. The same asset in two origins shows as two rows with two labels. There is no shared list of locations.

**Decision:** If/when unifying these into one canonical "Location," apply it to NEW intake and NEW members only. Do NOT auto-migrate, bridge, or reconcile existing holdings' labels. Existing holdings are relabeled manually by the user (via an editable "Where it's held" field in the Edit Position dialog).

**Why:** A prior attempt to unify them broke the app precisely at the bridge/migrate step — stitching the three independent naming systems together caused confusion and data mess. The owner explicitly wants new members to "start fresh" so the tangle never grows, and wants nothing moving automatically under existing data.

**How to apply:** Treat the canonical Location as additive (existing rows keep working unchanged). De-dup/claiming (a live wallet claiming an asset so a manual/imported copy isn't duplicated) applies to NEW actions only, never a retroactive sweep. The full plan lives in `.local/tasks/canonical-holding-location.md` when active. Separately: Stargazer "Connect" is desktop-extension-only (`window.stargazer`); mobile/iPhone users cannot one-tap connect and must paste their DAG address.

**Shadow-row cost-basis trap (caused a real "edit won't save" report):** when the same symbol exists as BOTH a position and a wallet balance, `/api/portfolio` force-zeros the wallet row's `totalCostBasis` (`alreadyInPositions ? 0 : costBasis`) to avoid double-counting. Editing that copy's cost basis then *looks* like it never saves — the DB write is fine, but the row always re-renders 0. **Fix pattern:** surface the real value in a SEPARATE field (e.g. `storedCostBasis`) for display/edit + an `isDuplicate` flag; NEVER make the deduped `totalCostBasis` real, because reconciliation/dashboard/wallets re-sum `positions[].totalCostBasis` and would double-count. The un-zeroed `currentValue` on shadow rows also silently double-counts section subtotals — exclude `isDuplicate` rows from per-section value/cost sums.
