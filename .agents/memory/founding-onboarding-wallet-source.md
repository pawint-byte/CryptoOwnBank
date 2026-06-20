---
name: Founding onboarding wallet-source contract
description: Why Founding step 2 (kit generation) must gate on the same wallet source as step 1, not the kit-display merge.
---

The Founding Member 3-step onboarding and the Sovereignty Recovery Kit export read wallets from DIFFERENT places, and they must agree or step 2 can stick forever.

- Founding step 1 "wallet connected" (`computeOnboarding`) uses `getWalletsByUser` = the **portfolio `Wallet` table**.
- The kit export builds a display list via `mergeManualCryptoIntoWallets(getUserWallets, getWalletsByUser, balances)`. That merge = settings wallets (`getUserWallets`, **UserWallet table**) + ONLY synthetic `chain==="manual"` portfolio entries. It deliberately excludes normal-chain portfolio/watch wallets.

**The rule:** the kit export's `confirmFoundingKit` (sets `kitConfirmed`, which completes step 2) must gate on the SAME wallet definition step 1 uses — i.e. include `portfolioWallets.length > 0`, NOT just the merged display `wallets.length`.

**Why:** a member whose only wallet is a normal-chain portfolio/watch address (added via the Wallets/Portfolio page) passes step 1 (Done) but produces an EMPTY kit-display merge, so the flag was never written and step 2 was blocked permanently (member "JR" hit this). Zero-wallet members still correctly fail step 2.

**How to apply:** if you ever change the kit-display wallet sources or the onboarding wallet check, re-verify both sides still agree. Any "has a wallet" gate tied to onboarding should derive from `getWalletsByUser`, not from the kit merge.
