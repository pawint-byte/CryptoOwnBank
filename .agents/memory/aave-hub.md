---
name: Aave Hub integration pattern
description: How CryptoOwnBank integrates Aave v3 directly without third-party SDKs or indexers. Read before changing /aave or adding similar lending-protocol UIs.
---

# Aave v3 — direct-to-Pool integration

We deliberately do NOT use AaveKit, @aave/contract-helpers, or any third-party indexer. The Pool contract exposes everything a UI needs (`getReserveData`, `getUserAccountData`, `supply`/`withdraw`/`borrow`/`repay`) and Pool addresses have been stable since v3 launch on each chain. Going direct keeps the dep tree small and avoids beta-flavored upstream churn.

**Why:** AaveKit pulls heavy peer deps + their own React provider model, and indexer APIs add a new cost surface + a new failure mode. ethers v6 is already in our deps and the existing `useEvmWallet` + `sendEvmTransaction` work for every flow we need.

**How to apply:**
- Reads use a per-chain `ethers.JsonRpcProvider` against the public RPC defined in `EVM_CHAINS`. Public RPCs are flaky for ETH/Polygon — if reads start failing, swap in a paid endpoint, not a new SDK.
- Writes ALWAYS call `ensureChain(chainId)` first; if the wallet refuses to switch, throw, don't silently submit on the wrong network.
- Pool `referralCode` arg stays `0` — no hidden affiliate extraction, the tenet says we don't take fees from yields.
- **MAX withdraw/repay must send `type(uint256).max` (we export it as `MAX_UINT256`), not the parsed read amount.** Between read and submit, supplied balance accrues interest and debt grows; a literal amount leaves dust or under-repays. Track `isMaxAmount` in UI state and reset it whenever the user edits the input by hand.
- **USDT-style approvals require an `approve(0)` reset before re-approving to a non-zero amount** when an old non-zero allowance exists. `sendApprove` checks current allowance and inserts the reset tx automatically; keep that behaviour.
- Borrow flow must show a liquidation-risk disclosure inline in the dialog (not just on the page) and the health factor must be color-coded with a hard "red below ~1.1" rule.
- Health factor sentinel from `getUserAccountData` when there's no debt is `type(uint256).max`; decode that as `Infinity`, not a huge number.
- APY math: Aave returns annual rates in Ray (1e27). Convert to per-second, then compound `(1 + rps)^secondsPerYear - 1`. Don't display a simple `rate / 1e27` — it's wrong by enough to mislead.
- Adding a new chain: only need the Pool address + a curated asset list (address + decimals + symbol). Don't ship the full reserves list — keep it curated so we never surface an asset with broken oracle or zero liquidity.
