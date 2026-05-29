---
name: Encrypted-vault "tested" gate integrity
description: Why a client-side "passed test" flag must reset whenever the encrypted payload changes
---

The Legacy Plan beneficiary wizard gates saving an encrypted recovery vault behind a
mandatory "Test Decrypt" step. The server rejects a save unless `vaultTested === true`,
and the client derives that from a `vaultTestPassed` boolean set when the in-wizard test
succeeds.

**Rule:** any client-side "verified / tested / confirmed" boolean that guards a save MUST
be reset to false the moment the underlying payload changes — on re-encrypt, on
"start over", and on form reset. Otherwise a stale pass from a *previous* payload carries
forward and lets a freshly-changed, untested payload slip past the guard.

**Why:** a previously-passed test left the flag true; re-encrypting new content did not
clear it, so a new (never-tested) vault could be saved. For an inheritance vault that
means survivors could be locked out of funds — the exact failure the test exists to
prevent. Architect review caught this; the normal happy path hid it.

**How to apply:** when adding/auditing any "must test before save" flow, grep for every
setter of the ciphertext/result state and confirm the test flag is cleared alongside each
one. The disabled-state on the Save button is not enough on its own — the server guard
relies on the flag being honest.
