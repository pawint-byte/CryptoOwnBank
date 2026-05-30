import { storage } from "../storage";
import { isKnownVaultAddress } from "../routes/shared";

// Shared helper: remove any gain events linked to a sell transaction and put the
// quantity they consumed back onto their tax lots. Used when a held "sale" turns
// out to be a non-taxable transfer, or when re-holding an imported sale.
export async function clearGainEventsForSell(userId: string, sellTxId: string) {
  const events = (await storage.getGainEventsByUser(userId)).filter(
    (g) => g.sellTransactionId === sellTxId,
  );
  if (events.length === 0) return;
  const allLots = await storage.getTaxLotsByUser(userId);
  const lotById = new Map(allLots.map((l) => [l.id, l]));
  const restoredByLot = new Map<string, number>();
  for (const ev of events) {
    restoredByLot.set(
      ev.taxLotId,
      (restoredByLot.get(ev.taxLotId) || 0) + parseFloat(ev.quantity),
    );
    await storage.deleteGainEvent(ev.id);
  }
  const affectedWalletBalances = new Set<string>();
  for (const [lotId, qty] of Array.from(restoredByLot.entries())) {
    const lot = lotById.get(lotId);
    if (lot) {
      await storage.updateTaxLot(lot.id, {
        remainingQuantity: (parseFloat(lot.remainingQuantity) + qty).toFixed(8),
      });
      if (lot.walletBalanceId) affectedWalletBalances.add(lot.walletBalanceId);
    }
  }
  // Keep wallet-balance cost aggregates in sync after restoring lot quantities,
  // matching the realize-sell and delete-sell paths (otherwise avg cost / total
  // cost basis go stale until another recompute runs).
  for (const wbId of Array.from(affectedWalletBalances)) {
    const wbLots = await storage.getTaxLotsByWalletBalance(userId, wbId);
    const totalRem = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
    const totalCb = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
    const avg = totalRem > 0 ? totalCb / totalRem : 0;
    await storage.updateWalletBalanceCostData(wbId, avg.toFixed(8), totalCb.toFixed(2));
  }
}

// Chains whose addresses are case-sensitive — these must match exactly. Mirrors the
// normalization used at sync time in routes.ts so we never create a false "own
// wallet" match by lowercasing a case-sensitive address.
const CASE_SENSITIVE_CHAINS = new Set(["xrp", "solana", "cardano", "cosmos", "stellar"]);

// Per-user serialization. selfCorrectKnownTransfers does multi-step, non-transactional
// work (clear gain events -> restore lots -> reclassify). Background sync, wallet add,
// and manual sync can all trigger it at once; running two at the same time for one user
// could read the same gain events and restore lots twice. We chain runs per user so a
// user's corrections always execute one after another.
const userCorrectLocks = new Map<string, Promise<unknown>>();

export async function selfCorrectKnownTransfers(userId: string): Promise<number> {
  const prev = userCorrectLocks.get(userId) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(() => runSelfCorrect(userId));
  userCorrectLocks.set(userId, run);
  try {
    return await run;
  } finally {
    if (userCorrectLocks.get(userId) === run) userCorrectLocks.delete(userId);
  }
}

// Self-healing reclassification. Once an address is known to be the member's own
// wallet (or a recognized yield vault), any outgoing transfer to it is, by
// definition, NOT a taxable sale. This finds auto-synced "sell" transactions whose
// recorded destination (counterpartyAddress) is now a known own/vault address and
// reclassifies them to non-taxable transfers, wiping the phantom gain events they
// created. Safe to run repeatedly: only touches rows that still look like sales to
// a known address, and clearGainEventsForSell is idempotent.
//
// Note: only auto-synced transactions carry a counterpartyAddress, so manually
// entered sells/swaps (which have none) are never affected.
async function runSelfCorrect(userId: string): Promise<number> {
  const wallets = await storage.getWalletsByUser(userId);
  // Exact-match set covers every chain (required for case-sensitive ones); the
  // lowercase set only holds case-insensitive (EVM-style) addresses, so an XRP/
  // Solana/etc. destination can only match its own wallet exactly.
  const ownExact = new Set<string>();
  const ownLower = new Set<string>();
  for (const w of wallets) {
    if (!w.address || w.chain === "manual") continue;
    ownExact.add(w.address);
    if (!CASE_SENSITIVE_CHAINS.has(w.chain)) ownLower.add(w.address.toLowerCase());
  }

  const txns = await storage.getTransactionsByUser(userId);
  let corrected = 0;
  for (const t of txns) {
    if (t.transactionType !== "sell") continue;
    const dest = t.counterpartyAddress;
    if (!dest) continue;
    const isOwn = ownExact.has(dest) || ownLower.has(dest.toLowerCase());
    const isVault = isKnownVaultAddress(dest);
    if (!isOwn && !isVault) continue;

    await clearGainEventsForSell(userId, t.id);
    await storage.updateTransaction(t.id, {
      transactionType: "transfer",
      reviewStatus: "resolved",
      notes: isVault
        ? "Vault deposit (auto-corrected — recognized address)"
        : "Transfer to your own wallet (auto-corrected — recognized address)",
    });
    corrected++;
  }
  return corrected;
}
