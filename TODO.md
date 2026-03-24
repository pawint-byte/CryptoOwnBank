# CryptoOwnBank — To-Do List & Decision Log

**Last updated: 2026-03-24 by main agent**

**This file is the official memory for pending items, decisions made, and things to revisit. Every session MUST read this file and update it when items are completed or new ones are added. Update the "Last updated" line above with the current date every time you make changes. Every entry MUST include the date it was added. Completed items MUST include the date completed.**

---

## PENDING — Referral / Affiliate Links

| Provider | Status | Action Needed | Date Added |
|----------|--------|---------------|------------|
| Gnosis Pay | LIVE — Partner ID `cmn4r1myk000jxy2lnjzzhtzw` in URL | None | 2026-03-23 |
| CypheRock | LIVE — `ref=PETER.WINT` | None | pre-2026-03-23 |
| Ledger | LIVE — `referral_code=H7DFZEAP8RPK4` | None | pre-2026-03-23 |
| ELLIPAL | LIVE — `rfsn=9012773.864657d` | None | pre-2026-03-23 |
| Bleap | LIVE — `code=FMWHK7IM` | None | 2026-03-24 |
| MetaMask Card | NO REFERRAL — referral program suspended Feb 2026 | Swap in referral link when program reopens | 2026-03-24 |
| MoonPay | Generic link — awaiting partner approval | Embed widget once approved | 2026-03-24 |
| Transak | Generic link — awaiting partner approval | Embed widget once approved | 2026-03-24 |
| NoOnes | Generic link | Check if affiliate program exists | 2026-03-24 |
| ByBarter | Generic link | Check if affiliate program exists | 2026-03-24 |
| Narfex | Generic link | Check if affiliate program exists | 2026-03-24 |
| Onramp.money | Generic link | Check if affiliate program exists | 2026-03-24 |
| Digitap | Generic link | Check if affiliate program exists | 2026-03-24 |

---

## PENDING — External Approvals

- [2026-03-24] MoonPay partner approval (would enable embedded buy widget on our site)
- [2026-03-24] Transak partner approval (would enable embedded buy widget on our site)
- [2026-03-24] Stellar Development Foundation grant
- [2026-03-24] Ripple grant (Spring 2026 application window)
- [2026-03-24] XLS-65/66 XRPL validator activation (for native lending)

---

## PENDING — Revisit When Legislation Passes

- [2026-03-24] **Stablecoin yield legislation (GENIUS Act / STABLE Act / Clarity Act)**: When it passes, review the actual language and decide:
  - Add jurisdiction disclaimer to yield-related pages (Soil Protocol vault, RWA Yields)
  - Evaluate whether geo-restriction is needed based on the actual law
  - Review any impact on RLUSD yield messaging
  - **Reason**: We decided to wait because the bill hasn't passed and the final language could look very different from what's being debated. Non-custodial positioning already gives strong standing.

---

## PENDING — Future Improvements

- [2026-03-24] **Embedded on-ramp widget**: Currently all buy-crypto paths are outbound links. Once MoonPay or Transak approves, embed their widget so members can buy crypto without leaving CryptoOwnBank.
- [2026-03-24] **Telegram Mini-App**: A simplified version of the dashboard inside Telegram. Good for emerging markets (Nigeria, Philippines, Kenya). Available to ALL members, not restricted to any group. Worth exploring as a growth channel.
- [2026-03-24] **Backup domains**: cryptoownbank.com is the production domain. crypto-ledger--pawint.replit.app is the Replit domain (also serves production). Both serve the same deployed app. Buying a backup domain (.xyz, .io) is cheap insurance but not urgent since the Replit domain already works as a fallback.
- [2026-03-24] **Off-ramp / cash-out guide**: Buy Crypto page covers getting into crypto but doesn't guide users on converting back to fiat. Crypto Debit Cards partially fills this gap.
- [2026-03-24] **Ledger 4.0 platform update**: Review new features and update Buy Crypto / Crypto Debit Cards pages if new on-ramp providers or capabilities were added.

---

## DECISIONS MADE — For Reference

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-24 | No geo-blocking for yield pages yet | Wait for stablecoin legislation to pass first |
| 2026-03-24 | No IPFS/decentralized hosting yet | Site has a backend (database, APIs) that can't run on IPFS; only static sites work there |
| 2026-03-24 | Hardware wallet section added to Crypto Debit Cards page | CypheRock, Ledger, ELLIPAL with affiliate links |
| 2026-03-24 | Bleap referral code added | `FMWHK7IM` — user provided the code |
| 2026-03-24 | MetaMask Card stays with generic link | Referral program suspended since Feb 2026 — not the card itself |
| 2026-03-24 | Buy Crypto page is outbound links + instructions for now | No embedded widget until MoonPay/Transak approves; value today is personalized guidance and wallet detection |
| 2026-03-24 | Both domains serve production | cryptoownbank.com and crypto-ledger--pawint.replit.app are the same deployed app — user uses replit.app link at work because employer blocks cryptoownbank.com |
| 2026-03-24 | TODO.md created as official to-do list | Previous sessions claimed it existed but it did not. Now referenced in replit.md so every session reads it. |

---

## COMPLETED

- [2026-03-24] Server startup crash fixed ("app is not defined" — Gnosis Pay code was placed inside `startPriceAlertChecker()` which has no `app` in scope; moved to `registerRoutes()`)
- [2026-03-24] Bleap referral code added to Crypto Debit Cards page (`code=FMWHK7IM`)
- [2026-03-24] Hardware wallet recommendation section added to Crypto Debit Cards (CypheRock, Ledger, ELLIPAL with affiliate links)
- [2026-03-23] Gnosis Pay PSE integration (backend mTLS endpoint + frontend component for card details viewing)
- [2026-03-23] Crypto Debit Cards page built with Gnosis Pay, MetaMask Card, Bleap as featured cards
- [2026-03-23] "Spend Crypto" sidebar entry added with CreditCard icon
- [2026-03-23] Cross-links between Buy Crypto and Crypto Debit Cards pages
- [2026-03-23] All announcement drafts cleaned (no emoji — strictly enforced)
- [pre-2026-03-23] Buy Crypto page with 17 tokens, 11 wallets, 9 on-ramp providers, P2P section (NoOnes, ByBarter, Narfex), emerging market ramps (Onramp.money, Digitap), Telegram Wallet, FAQ
