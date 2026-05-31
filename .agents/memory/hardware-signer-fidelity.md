---
name: Hardware signer clear-vs-blind fidelity
description: Why hardware wallet support for new XRPL tx types (XLS-65/66 vault deposits) is gated on device firmware, not site plumbing — and the product policy that follows.
---

# Hardware signer clear-vs-blind fidelity

When deciding which wallets to enable for a NEW XRPL transaction type
(e.g. XLS-65/66 `VaultDeposit`/`VaultWithdraw`), the bottleneck is the
device maker's firmware, NOT our connection code.

- Our app **builds** the transaction; the device only **signs bytes**.
- A device can only **clear-sign** (show the user real details) if its firmware
  understands the transaction type. New types need a firmware/app update first.
- Until then a device can still **blind-sign** (signs a blob, shows only a code).

**Why this matters:** blind signing silently flips the trust model. Normally the
user verifies on their own device (the point of self-custody); with blind signing
they're trusting OUR screen and OUR transaction builder instead. For a
self-custody brand that's a strategic tension, not a UX detail.

**Policy decided:** classify each signer into 4 lanes — Recommended now /
Supported / Advanced / Coming soon. Clear-sign = Recommended/Supported.
Blind-sign = Advanced, opt-in only, behind an explicit warning, never default.
Not supported = disabled, point user to Xaman. Xaman is the safe day-one path
because it updates centrally and clear-signs new types before per-device
integrations are confirmed.

**How to apply:** the capability matrix is the single source of truth keyed by
signer × tx-type × fidelity. When firmware support changes, update the matrix
data — don't scatter per-device `if` checks across signing flows.

**Brand-neutral wallet positioning (durable principle):** never single out one
hardware-wallet brand as "best." A wallet only appears further along because
it's already integrated AND talks directly to a desktop browser — that's an
engineering state, not a security endorsement. For brand-new tx types every
hardware wallet is equal (blind-sign at best until firmware ships). Keep matrix
copy framed as roadmap parity, not current capability parity, and avoid
absolute claims like "highest security."
**Factual anchors:** Trezor supports XRP (Safe family + Model T, NOT Model One)
and connects via browser-USB like Ledger; Tangem/Arculus/D'CENT are mobile/NFC
or Bluetooth (no desktop web); Keystone/Ellipal are air-gapped QR. Coldcard is
BTC-only — never list it for XRP.
