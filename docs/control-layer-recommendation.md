# Control Layer Recommendation — Safe Vaults vs. Smart-Account Upgrade

*Decision spike — written 2026-06-08. No code built yet. Goal: founder picks a
direction before we write anything.*

## The decision in one line

Both paths "put the member more in control," but they solve **different jobs**.
My recommendation: make **Safe vaults** the flagship control product (it's the real
sovereignty deepener and pairs perfectly with our Legacy Plan), and treat the
**wallet upgrade** path (pay gas in USDC, one-click batched actions) as a *later
convenience layer*, not the headline.

## What "control layer" means (plain version)

Right now a member's wallet is one key = one point of failure. Lose the seed, it's
gone. One leaked key, everything's gone. A control layer adds *structure* around
their own money — more than one approval for big moves, trusted people who can help
recover, spending limits — **without anyone (including us) ever holding their funds.**

## Guardrail — non-negotiable, applies to BOTH paths

- We never hold a key, a recovery key, or a "guardian" seat.
- We never run anything that touches or moves funds.
- We provide the screens; the member picks their own co-signers / guardians and
  signs every action themselves.

This is what keeps us non-custodial. Anything that breaks it is off the table.

---

## Path A — Safe vaults (the "control" product)

**What it is:** the member creates a *new* smart-contract wallet (a "Safe") that they
fully own. They set the rules: e.g. *"2 of my 3 keys must agree to move money,"* or
*"these 3 trusted people can help me recover if I lose my phone."*

**Why it fits us best:**

- The most member-legible "be your own bank" upgrade: a family vault, a business
  treasury, a high-value cold vault.
- A recovery answer that isn't "write your seed on paper and pray."
- **Huge synergy with our Legacy Plan**: a Safe with chosen guardians *is* an
  inheritance mechanism — successors can recover the seat without us holding
  anything. This is the most differentiated idea on the whole list.

**Cost to us:** low. Safe's contracts are open and free; the member pays a small gas
fee to create their vault. We mainly build UI. No servers that touch money.

**Honest downsides:**

- It's a *new address* — the member deliberately moves assets into it (great for a
  "vault," not for daily spending).
- The setup wizard is the hard part to make genuinely simple. Worth doing right.

## Path B — Upgrade the existing wallet (EIP-7702)

**What it is:** since May 2025 (live on Ethereum, supported by MetaMask), a normal
wallet can temporarily "borrow" smart-account powers *without changing its address*.
That unlocks:

- **Pay network fees in USDC** instead of needing ETH/MATIC first (via Circle's
  Paymaster — an on-chain contract, no account or API key needed, which fits our
  no-infra guardrail nicely).
- **One-click batched actions** — e.g. approve + revoke, or approve + swap, in a
  single signature.
- Spending limits / session rules.

**Why it's attractive:** keeps one address, lowers day-to-day friction, makes our
existing tools (swap, Aave, the new Security Center) feel smoother.

**Cost to us:** medium. To actually submit these upgraded transactions usually needs
a "bundler" service (e.g. Pimlico / ZeroDev) — there are free tiers, but it's one
more outside dependency, and it's more plumbing than product.

**Honest downsides:**

- It's a *convenience* layer, not a *control* layer — it doesn't give the
  family-vault / recovery story that makes us different.
- More moving parts (bundler + paymaster) for less differentiation.

---

## My recommendation

1. **Direction: Path A (Safe vaults).** The genuine sovereignty deepener, the
   cheapest for us to run, and it compounds with the Legacy Plan we've already built.
2. **Smallest first slice:** a guided "Create a Vault" flow on **one chain (Base —
   cheap gas, well supported)** that lets a member spin up a 2-of-3 Safe with
   co-signers / guardians they choose, then *view* that vault inside CryptoOwnBank
   alongside their other holdings. No money-movement features yet — just create, see,
   and recovery-setup. Member signs the deploy; we hold nothing.
3. **Park Path B for now** as a "nice later." Revisit "pay gas in USDC" once vaults
   land — by then the wallet-upgrade + Circle Paymaster can ride on top of the same
   plumbing.

## What I need from you

Pick one:

- **A** — Build toward Safe vaults (I'll start with the create + view + recovery
  slice above).
- **B** — Prioritize the wallet-upgrade convenience layer (gas-in-USDC / one-click
  batched actions) first.
- **Park it** — keep this as a recorded decision, build nothing yet.
