# AI Agent Layer — Member Personas & Mandate Model

**Status:** Strategy / design reference. NOT built. Captured 2026-06-10.
**Origin:** Ripple's XRPL AI Starter Kit (agentic finance, x402, RLUSD, MCP) — June 10, 2026 — prompted the question: *if we built customizable AI agents, who are they for and how would it impact what we do today?*

This document is the single source of truth for the persona/mandate thinking. It merges four independent passes (the in-house analysis plus three external AI writeups the founder gathered) that all converged on the same shape — which is itself a strong signal the direction is right.

---

## The one rule everything hangs on

The agent **proposes**; the member **approves and signs with their own keys**. Nothing completes because CryptoOwnBank pushed a button. This is the existing operating doctrine (member-orchestration / consent model), not a new idea. The agent layer is an *extension* of plumbing we already run:

- DCA today already works as **system builds the trade → member signs in Xaman → system submits**. The scheduler never signs and never moves funds; when a payment is due it only creates a *pending* item waiting for the member.
- The AI Portfolio Assistant today is **read-only** — it explains, it cannot act.

So an "AI agent with guardrails" is mostly **smarter triggers on top of existing rails**, plus a new guardrail/mandate config and a proposals inbox. It **streamlines** existing features, **adds** the mandate engine, and **replaces nothing** — members keep manual DCA, the read-only assistant, and the current scheduler.

### Why it's not "autonomy"
Risk tolerance is a **filter on what the agent is allowed to even suggest** — not permission to act alone. The agent's job is less "pick the best trade" and more "offer a menu that honors the member's mandate."

---

## Three signing models (the "how hands-on?" dial)

Every persona picks one of these. They go from most control to least:

1. **Sign-each** — the member signs every action in Xaman/hardware. Default and safest.
2. **Sign-the-plan** — one approval for a *bounded series* (e.g. "the next 4 DCA buys, max $200 each, only on dips, expires in 12 weeks"). Fewer taps, still no open-ended authority. **Tagline: "Sign once for this plan, not forever for everything."**
3. **Channel** — hands-off recurring **payments** only, via an XRPL payment channel / escrow the member funds with a hard cap and can close anytime. The agent can only claim within the cap. **Later / advanced.**

### The pre-signed "12 DCA" question — answered honestly
- A member *can* pre-sign a batch up front (sign-the-plan). It's brand-pure because they literally signed each one.
- **The honest catch:** that's *N signatures in one sitting, not one signature for N trades*, and the terms are **locked at signing time** — a pre-signed buy fires through a black swan or a change in the member's life.
- The real risk of pre-signing is **not** "the member didn't say yes" (they did) — it's that **consent given today can't react to tomorrow's conditions.** That's why any sign-the-plan / channel mode is only safe with a **circuit breaker** (below).
- "One tap authorizes N future *variable* trades" would require delegated signing authority — that crosses self-custody. **We do not offer that.**

### Channels move payments, not trades — important limit
Payment channels/escrow move **payments** (sending XRP/RLUSD). They do **not** do market buys or yield-vault deposits. So "hands-off DCA via a channel" only works if the DCA is a recurring *send to a destination* — buying crypto on the DEX or rotating into a vault still needs a fresh signed trade each time. This is also why **x402 belongs to the channel model, not the sign-each model**: the whole point of x402 is machine-initiated payments that *don't* interrupt a human — pairing it with per-payment approval removes its value.

---

## Cross-cutting pieces (apply to all personas)

- **Circuit breaker (mandatory on sign-the-plan and channel modes):** before any queued/plan-approved action fires, check live guardrails — pause everything if drawdown exceeds the member's threshold, if a protocol gets flagged, or if the mandate expired. This is what makes bounded modes defensible.
- **Tracker / audit log ("track-after" pillar):** a plain log of what the agent proposed, what the member approved, what fired, and what it earned or saved. Nice-to-have for individuals; **essential** for the Family Steward and Business Owner (they answer to other people / an accountant). Plugs into existing tax tooling.
- **Multi-sig as the permission layer (esp. business):** when more than one person must approve, use XRPL native multi-sig. The *keys* carry the permission — CryptoOwnBank never decides who is authorized. This keeps bright line #3 intact (we move identity, we never verify/gate it).
- **Starter templates + short intake:** at signup ask *"How involved do you want to be? How cautious? What's your hard limit?"* and drop the member into the persona preset closest to their life. Ship the presets, not just the engine — that's how we welcome members who don't think like the founder.
- **Doctrine bright lines still hold:** member signs with own keys; we never hold funds/credentials; we never verify/gate identity; only open standards (e.g. x402) may join the table.

---

## The five personas

The founder (hands-on builder) is the baseline the engine is built around. The five below are the members whose lives differ from his.

### 1. The Steady Saver
*Busy professional / family responsibilities. Moderate-to-conservative. Low touch. (Income/retiree is a sub-mode.)*
- **Emotional need:** reduce decision fatigue; not check yields every week.
- **Default mandate:** keep RLUSD in the top few protocols by risk-adjusted yield; never more than ~15% in any one; re-evaluate every ~60 days.
- **Allowed AI offers:** occasional high-quality "your position dropped below your floor — move $X to a better one inside your risk band?" proposals.
- **Signing model:** sign-each, or sign-the-plan for routine DCA.
- **Promise:** *"Your money quietly works while you don't think about it — but you approve every move."*

### 2. The Active Optimizer
*Higher risk tolerance, enjoys the game, wants data.*
- **Emotional need:** see and act on opportunities.
- **Default mandate:** wider bands, generous (but capped) budget, max allocation per protocol, total portfolio risk ceiling.
- **Allowed AI offers:** frequent ranked ideas ("three protocols just crossed your minimum improvement threshold, ranked by expected return vs. your risk band"); opportunistic DCA acceleration on dips within budget.
- **Signing model:** sign-each (they enjoy the taps).
- **Promise:** *"A research analyst that drafts the trades — you decide which to fire."*

### 3. The Family Steward
*Multi-generational; thinking about kids/spouse; conservative; audit matters.*
- **Emotional need:** be a good steward, not just a trader; nothing forgotten.
- **Default mandate:** per-person / per-portion conservative bands; timed reviews; restricted action types; mandatory sign-off.
- **Allowed AI offers:** proposals tied to family outcomes ("a modest shift inside the conservative band you set for your daughter's portion would add ~$X/yr without more volatility"); reminders.
- **Signing model:** sign-each; multi-sig where a spouse co-approves. Ties into Legacy Plan.
- **Promise:** *"Help looking after the people who depend on you — with a record you can show them."*

### 4. The Cautious Newcomer
*Lower crypto comfort; wants simplicity and safety; nervous about mistakes.*
- **Emotional need:** not do the wrong thing.
- **Default mandate:** ultra-conservative; small position sizes; stablecoin-first; low ceilings; nothing exotic.
- **Allowed AI offers:** one safe, fully-explained suggestion at a time ("the only move allowed under your profile is a small slice of idle XRP into RLUSD yield — most of your money stays put. Want to see it?").
- **Signing model:** sign-each, with plain-language explainer before each step (School-of-CryptoOwnBank pattern).
- **Promise:** *"Self-custody without the fear — small, safe steps, explained every time."*

### 5. The Business Owner / Operator
*Runs a shop / agency / small company. Project-based, lumpy cashflow. Takes payments, pays contractors/payroll/tools/taxes. Thinks in runway, not "risk tolerance." This is the persona that makes the agentic/x402 thesis commercially serious.*
- **Emotional need:** business cash that earns more than a bank account, faster/cheaper payments, clean records — without operating money ever at risk.
- **Default mandate (two buckets):**
  - *Operating capital* — very short lock (e.g. ≤48h), ultra-conservative yield only.
  - *Reserve* — slightly wider, still hard-capped.
  - **Liquidity-calendar awareness:** member tags upcoming outflows (payroll, contractor invoices, quarterly tax reserve); the agent only moves idle cash *inside the free window*, with a hard buffer (e.g. never touch funds within 5 business days of a known large outflow unless explicitly overridden).
- **Allowed AI offers:** "you have $X idle, next outflow is payroll in N days — moving $Y to a higher-yield protocol still leaves payroll fully liquid with a buffer, approve?"; supplier/payroll batch due; "your API agent is near its monthly cap"; **auto-set-aside estimated tax on incoming revenue** (plugs into existing tax tooling); monthly treasury review exportable for the accountant.
- **Signing model:** multi-sig sign-each or sign-the-plan; **channel-based for recurring sends and x402 agent micro-payments** — the one persona where channels are a near-term, first-class fit.
- **Promise:** *"A finance person on staff who never has signing authority — your cash works, payments are fast, you (and your partner) still sign everything, and we never hold the keys."*

> **Watch-points for Business Owner:** (a) the liquidity calendar is only as good as the member's tags — when unsure, default conservative (assume more is owed, move less) and lean on the circuit breaker; (b) don't over-promise instant finality on the *deposit-into-yield* step — finality depends on the protocol/chain, so say "fast settlement," not a hard number; (c) keep role-gating at the multi-sig/wallet layer (keys = permission), never become the verifier.

---

## Comparison at a glance

| Persona | Primary need | How the agent helps | Guardrail focus | Likely signing model |
|---|---|---|---|---|
| Steady Saver | Reduce decision fatigue | Occasional high-quality proposals | Simplicity + safety | Sign-each / sign-the-plan |
| Active Optimizer | See & act on opportunities | Frequent ranked suggestions | Personal risk band, per-protocol caps | Sign-each |
| Family Steward | Multi-generational responsibility | Proposals tied to family outcomes | Per-person / inheritance rules | Sign-each + multi-sig |
| Cautious Newcomer | Don't do the wrong thing | One safe, explained move at a time | Tight caps, stablecoin-first | Sign-each + explainer |
| Business Owner | Cashflow + professional duty | Treasury moves that respect payroll/obligations | Liquidity calendar, buckets, audit | Multi-sig + channel |

---

## Product impact summary

- **Streamlines:** DCA (smarter triggers), the AI Assistant (from "here's advice" to "here's a ready-to-sign action"), scheduled vault/yield moves (conditional).
- **Adds:** the mandate/guardrail engine, the proposals inbox, the risk-tuned suggestion engine, the circuit breaker, the tracker/audit log, and (later) the channel-based budget mode + x402.
- **Replaces:** nothing — manual DCA, the read-only assistant, and the current scheduler all stay; the agent sits on top.
- **Architecture risk:** low. It reuses the existing transaction builder + Xaman signing + scheduler.

**Umbrella story:** *"CryptoOwnBank works the way each member chooses — within their rules, but they're the only one who ever says yes."*

## If/when we build — first clean step
Define the 3–5 personas above in config, each with: a default risk mandate, an allowed list of AI offer types, a signing model, and a plain-English promise. Start with the **Steady Saver** (closest to existing DCA) and the **Business Owner** (highest commercial upside) as the two pilot presets.
