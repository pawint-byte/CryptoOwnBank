# CryptoOwnBank — To-Do List & Decision Log

**This file is the official memory for pending items, decisions made, and things to revisit. Every session MUST read this file and update it when items are completed or new ones are added.**

---

## PENDING — Referral / Affiliate Links

| Provider | Status | Action Needed |
|----------|--------|---------------|
| Gnosis Pay | LIVE — Partner ID `cmn4r1myk000jxy2lnjzzhtzw` in URL | None |
| CypheRock | LIVE — `ref=PETER.WINT` | None |
| Ledger | LIVE — `referral_code=H7DFZEAP8RPK4` | None |
| ELLIPAL | LIVE — `rfsn=9012773.864657d` | None |
| Bleap | LIVE — `code=FMWHK7IM` | None |
| MetaMask Card | NO REFERRAL — referral program suspended Feb 2026 | Swap in referral link when program reopens |
| MoonPay | Generic link — awaiting partner approval | Embed widget once approved |
| Transak | Generic link — awaiting partner approval | Embed widget once approved |
| NoOnes | Generic link | Check if affiliate program exists |
| ByBarter | Generic link | Check if affiliate program exists |
| Narfex | Generic link | Check if affiliate program exists |
| Onramp.money | Generic link | Check if affiliate program exists |
| Digitap | Generic link | Check if affiliate program exists |

---

## PENDING — External Approvals

- MoonPay partner approval (would enable embedded buy widget on our site)
- Transak partner approval (would enable embedded buy widget on our site)
- Stellar Development Foundation grant
- Ripple grant (Spring 2026 application window)
- XLS-65/66 XRPL validator activation (for native lending)

---

## PENDING — Revisit When Legislation Passes

- **Stablecoin yield legislation (GENIUS Act / STABLE Act / Clarity Act)**: When it passes, review the actual language and decide:
  - Add jurisdiction disclaimer to yield-related pages (Soil Protocol vault, RWA Yields)
  - Evaluate whether geo-restriction is needed based on the actual law
  - Review any impact on RLUSD yield messaging
- **Reason**: We decided to wait because the bill hasn't passed and the final language could look very different from what's being debated. Non-custodial positioning already gives strong standing.

---

## PENDING — Future Improvements

- **Embedded on-ramp widget**: Currently all buy-crypto paths are outbound links. Once MoonPay or Transak approves, embed their widget so members can buy crypto without leaving CryptoOwnBank.
- **Telegram Mini-App**: A simplified version of the dashboard inside Telegram. Good for emerging markets (Nigeria, Philippines, Kenya). Available to ALL members, not restricted to any group. Worth exploring as a growth channel.
- **Backup domains**: cryptoownbank.com is the production domain. crypto-ledger--pawint.replit.app is the Replit domain (also serves production). Both serve the same deployed app. Buying a backup domain (.xyz, .io) is cheap insurance but not urgent since the Replit domain already works as a fallback.
- **Off-ramp / cash-out guide**: Buy Crypto page covers getting into crypto but doesn't guide users on converting back to fiat. Crypto Debit Cards partially fills this gap.

---

## DECISIONS MADE — For Reference

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-24 | No geo-blocking for yield pages yet | Wait for stablecoin legislation to pass first |
| 2026-03-24 | No IPFS/decentralized hosting yet | Site has a backend (database, APIs) that can't run on IPFS; only static sites work there |
| 2026-03-24 | Hardware wallet section added to Crypto Debit Cards page | CypheRock, Ledger, ELLIPAL with affiliate links |
| 2026-03-24 | Bleap referral code added | `FMWHK7IM` |
| 2026-03-24 | MetaMask Card stays with generic link | Referral program suspended since Feb 2026 |
| 2026-03-24 | Buy Crypto page is outbound links + instructions | No embedded widget until MoonPay/Transak approves |
| 2026-03-24 | Both domains serve production | cryptoownbank.com and crypto-ledger--pawint.replit.app are the same deployed app |

---

## COMPLETED

- Server startup crash fixed ("app is not defined" — Gnosis Pay code was placed inside wrong function scope)
- Gnosis Pay PSE integration (backend mTLS + frontend component)
- Crypto Debit Cards page with Gnosis Pay, MetaMask Card, Bleap
- Hardware wallet recommendation section on Crypto Debit Cards (CypheRock, Ledger, ELLIPAL)
- "Spend Crypto" sidebar entry
- Cross-links between Buy Crypto and Crypto Debit Cards pages
- Buy Crypto page with 17 tokens, 11 wallets, 9 on-ramp providers, P2P section (NoOnes, ByBarter, Narfex), emerging market ramps (Onramp.money, Digitap), Telegram Wallet, FAQ
- All announcement drafts cleaned (no emoji)
