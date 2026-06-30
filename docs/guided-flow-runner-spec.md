# Guided Flow Runner — Spec

**Status:** Draft for founder review (2026-06-30). No build authorized yet — this exists so we can see the size first.

## 1. The idea in one line

One reusable engine. The member picks a **goal** ("get paid in crypto"). The runner shows the **ordered steps** they must complete, the **live status** of each, the **fix-it job aid** on any blocked step, and **one action** to clear it. The member is always the only one who says yes.

This replaces the piecemeal model (scattered readiness lights + standalone guide pages) with an **intent-first checklist**. It is our own doctrine made literal: *be the table · be the explainer · be the checklist and tracker · let the member be the only one who says yes.*

## 2. The flow model (declarative — no per-flow code)

```
Flow {
  id, title, goal            // "get-paid", "Get paid in crypto"
  steps: Step[]              // ordered
}

Step {
  id, label                  // "rlusd-trustline", "Set RLUSD trustline"
  gate:  "platform" | "chain"   // who owns the blocker
  rail?: "xrpl" | "stellar" | "evm" | "any"
  check:   () => Status      // live readiness signal
  aid?:    AidRef            // inline job aid, shown only when blocked
  action?: ActionRef         // sign / do-it on the member's own device
  appliesIf?: predicate      // e.g. only if rail == xrpl && asset == RLUSD
}

Status = ready | blocked | not-applicable | pending   // pending = action submitted, awaiting confirm
```

**Runner behavior:** evaluate steps top-down. The first `blocked` step is the "current" one (expanded, showing its aid + action); later steps stay locked until earlier ones are `ready`; `not-applicable` steps auto-hide (e.g. the trustline step disappears entirely on EVM). A `pending` step shows a spinner until the ledger confirms.

## 3. Two gate types (the key insight)

- **platform gate** — account tier / subscription, invoices enabled, etc. Source: server subscription status.
- **chain gate** — wallet, address, account activation/reserve, trustline, gas. Source: client readiness signals (mostly already computed).

A single ordered list naturally mixes both. That is *why* piecemeal felt wrong — the prerequisites are not all the same kind.

## 4. The first flows

### Flow A — "Get paid in crypto" (member is the receiver)
| # | Step | Gate | Check (signal) | Aid |
|---|------|------|----------------|-----|
| 1 | Plan allows invoices | platform | subscription status | upgrade prompt |
| 2 | Wallet + receive address | chain | wallet store has address | `help-create-wallet` |
| 3 | Pick your rail (XRP/RLUSD · XLM · EVM) | chain | n/a (choice) | `chain-guide` |
| 4 | Account activated on that rail | chain | XRPL `getBalances`→actNotFound / Stellar 404 / EVM n/a | `prime-the-pump` |
| 5 | Trustline set *(only RLUSD or Stellar asset)* | chain | `getAccountTrustlines` / Stellar balances | **inline trustline wizard (NET-NEW)** |
| 6 | Send request / pay-link to payer | platform | — | existing invoice/pay flow |

### Flow B — "Pay someone in crypto" (member is the payer)
| # | Step | Gate | Check (signal) | Aid |
|---|------|------|----------------|-----|
| 1 | Wallet + address | chain | wallet store | `help-create-wallet` |
| 2 | Hold the asset | chain | balances | `buy-crypto` |
| 3 | Enough for fees (XRP reserve / XLM reserve / **EVM gas**) | chain | balance vs reserve/gas | **EVM-gas aid (NET-NEW)** + reserve number |
| 4 | Review & sign on device | chain | — | existing signing |

### Flow C — "Join a vault" (proves reuse)
This is the **existing `vault-clear-lane.tsx`** re-expressed as a flow definition: Connect → signing route → trust RLUSD → hold RLUSD → deposit & sign. Same engine, zero new content.

## 5. Where it plugs into what exists (leverage map)

| Need | Reuse today | Net-new |
|------|-------------|---------|
| Step-runner UI pattern | `vault-clear-lane.tsx` | generalize into one generic runner |
| XRPL readiness | `getBalances`, `getAccountTrustlines` (`xrpl-client.ts`) | explicit "X XRP reserve needed" number |
| Stellar readiness | `fetchStellarBalances` 404 check (`stellar-store.ts`), `freighter-connector.ts` | sponsored-reserve option (phase 2) |
| EVM readiness | `eth_getBalance`, allowance check (`evm-wallet.ts`, `evm-swap.tsx`) | paymaster/gasless detection (phase 2) |
| Job aids | `prime-the-pump`, `help-create-wallet`, `buy-crypto`, `chain-guide`, `help-index` | **EVM-gas aid**, **inline trustline wizard** |
| Signing | Xaman / Ledger / Freighter / MetaMask | none |
| Pending-item home | — | unified inbox (phase 2; Agent Lab proposals slot in here too) |
| Reminders/scheduling | `payment-scheduler.ts`, Resend | none |

## 6. The actual net-new work

1. **One generic flow-runner component + model** — generalize `vault-clear-lane.tsx`. This is the core build.
2. **Three thin rail adapters** that wrap existing readiness signals into the `check()` shape. Net-new *calculations*: XRP reserve number now; Stellar sponsorship + EVM paymaster are phase 2.
3. **Two new job aids:** EVM gas, inline trustline wizard.
4. **Flow definitions** (small declarative files): get-paid, pay, join-vault.
5. **Entry points:** a "what do you want to do?" launcher on the invoices / pay / vault pages; active + pending flows surface in the inbox.

## 7. Build size & phasing

- **Reuse ≈ 80%** — readiness signals, job-aid content, signing, the vault-clear-lane pattern all already exist.
- **Net-new** — 1 runner component + model, 3 thin adapters, 2 aids, 3–4 flow definitions.
- **Phase 1:** XRP + XLM, the get-paid and pay flows, no sponsorship, reuse existing aids + the 2 new ones. Proves the engine end-to-end.
- **Phase 2:** EVM gas + paymaster, Stellar sponsored reserves (the "make the easy path free for newcomers" lever), the unified inbox, and Agent Lab proposals as a flow type.

## 8. Doctrine check

- Member is the only one who says yes ✓
- We never hold funds or keys ✓
- We explain / checklist / track, we never gate identity ✓
- Sponsorship (phase 2) = paying a reserve/gas subsidy, **not** custody ✓
- Each rail promises only what it actually delivers ✓
