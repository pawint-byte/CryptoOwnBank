import { storage } from "../storage";
import { isKnownVaultAddress } from "../routes/shared";
import type { Transaction } from "@shared/schema";

export type TransferCategory = "sale" | "swap" | "own_transfer" | "vault_deposit" | "lost";

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

// Realize the taxable gain/loss for a sell transaction using FIFO/LIFO lot
// matching. Clears any prior gain events first so re-labeling never stacks
// duplicate events. Shared between the resolve-review endpoint and smart-memory
// auto-application at sync time.
export async function realizeSellGains(
  userId: string,
  sellTxId: string,
  disposalType: "sale" | "swap" | "lost",
) {
  const tx = await storage.getTransaction(sellTxId);
  if (!tx) return;

  await clearGainEventsForSell(userId, sellTxId);

  const settings = await storage.getUserSettings(userId);
  const method: "FIFO" | "LIFO" = settings?.taxMethod === "LIFO" ? "LIFO" : "FIFO";

  const allLots = await storage.getTaxLotsByAsset(userId, tx.assetSymbol);
  const activeLots = allLots.filter((l) => parseFloat(l.remainingQuantity) > 0);
  const sortedLots = method === "LIFO"
    ? [...activeLots].sort((a, b) => new Date(b.acquiredDate).getTime() - new Date(a.acquiredDate).getTime())
    : [...activeLots].sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime());

  const sellDate = new Date(tx.transactionDate);
  const sellPrice = parseFloat(tx.pricePerUnit);
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  let remaining = parseFloat(tx.quantity);

  for (const lot of sortedLots) {
    if (remaining <= 0.00000001) break;
    const lotRemaining = parseFloat(lot.remainingQuantity);
    if (lotRemaining <= 0) continue;

    const sellFromLot = Math.min(remaining, lotRemaining);
    // A lost/stolen disposal has no proceeds — nothing was received in return —
    // so the realized loss equals the cost basis of the coins that left.
    const proceeds = disposalType === "lost" ? 0 : sellFromLot * sellPrice;
    const costBasis = sellFromLot * parseFloat(lot.costBasisPerUnit);
    const gainLoss = proceeds - costBasis;
    const acquiredDate = new Date(lot.acquiredDate);
    const isLongTerm = (sellDate.getTime() - acquiredDate.getTime()) >= oneYear;

    await storage.createGainEvent({
      userId,
      sellTransactionId: sellTxId,
      taxLotId: lot.id,
      assetSymbol: tx.assetSymbol,
      quantity: sellFromLot.toString(),
      proceeds: proceeds.toFixed(2),
      costBasis: costBasis.toFixed(2),
      gainLoss: gainLoss.toFixed(2),
      isLongTerm,
      taxMethod: method,
      soldDate: sellDate,
      acquiredDate,
      disposalType,
      disposalNote: disposalType === "swap"
        ? "Swap — taxable disposal (you labeled this)"
        : disposalType === "lost"
        ? "Lost or stolen — disposed at $0 proceeds (you labeled this)"
        : "Sale — taxable disposal (you labeled this)",
    });

    await storage.updateTaxLot(lot.id, {
      remainingQuantity: (lotRemaining - sellFromLot).toFixed(8),
    });

    if (lot.walletBalanceId) {
      const wbLots = await storage.getTaxLotsByWalletBalance(userId, lot.walletBalanceId);
      const totalRem = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity), 0);
      const totalCb = wbLots.reduce((s, l) => s + parseFloat(l.remainingQuantity) * parseFloat(l.costBasisPerUnit), 0);
      const avg = totalRem > 0 ? totalCb / totalRem : 0;
      await storage.updateWalletBalanceCostData(lot.walletBalanceId, avg.toFixed(8), totalCb.toFixed(2));
    }

    remaining -= sellFromLot;
  }
}

// Apply a single category decision to one transaction. Own-wallet / vault moves
// are non-taxable transfers (wipe any phantom gain); sale / swap are taxable
// disposals (realize the gain/loss now).
async function applyCategoryToTx(
  userId: string,
  txId: string,
  category: TransferCategory,
  note: string,
) {
  if (category === "own_transfer" || category === "vault_deposit") {
    await clearGainEventsForSell(userId, txId);
    await storage.updateTransaction(txId, {
      transactionType: "transfer",
      reviewStatus: "resolved",
      notes: note,
    });
  } else {
    await storage.updateTransaction(txId, {
      transactionType: "sell",
      reviewStatus: "resolved",
      notes: note,
    });
    const disposalType: "sale" | "swap" | "lost" =
      category === "swap" ? "swap" : category === "lost" ? "lost" : "sale";
    await realizeSellGains(userId, txId, disposalType);
  }
}

// Chains whose addresses are case-sensitive — these must match exactly. Mirrors the
// normalization used at sync time in routes.ts so we never create a false "own
// wallet" match by lowercasing a case-sensitive address.
const CASE_SENSITIVE_CHAINS = new Set(["xrp", "solana", "cardano", "cosmos", "stellar"]);

// Compare two destination addresses. Exact match always counts; EVM-style 0x
// addresses are compared case-insensitively. Case-sensitive chains (XRP, Solana,
// etc.) only match exactly, so we never create a false grouping by lowercasing.
function addressesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith("0x") && b.startsWith("0x")) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

// Canonical key for storing a remembered address. EVM-style (0x) addresses are
// case-insensitive, so we lowercase them before saving — this keeps the unique
// (userId, address) constraint from ever holding two rows for the same EVM
// address with different casing (which would make classification nondeterministic
// and is tax-dangerous). Case-sensitive chains (XRP, Solana, etc.) are stored
// exactly as-is.
function canonicalAddress(addr: string): string {
  return addr.startsWith("0x") ? addr.toLowerCase() : addr;
}

const PRIMARY_NOTE: Record<TransferCategory, string> = {
  vault_deposit: "Vault deposit (you labeled this)",
  own_transfer: "Transfer to your own wallet (you labeled this)",
  swap: "Swap — taxable disposal (you labeled this)",
  sale: "Sale — taxable disposal (you labeled this)",
  lost: "Lost or stolen — coins gone, recorded as a loss (you labeled this)",
};

const AUTO_NOTE: Record<TransferCategory, string> = {
  vault_deposit: "Vault deposit (auto-applied from your saved label)",
  own_transfer: "Transfer to your own wallet (auto-applied from your saved label)",
  swap: "Swap — taxable disposal (auto-applied from your saved label)",
  sale: "Sale — taxable disposal (auto-applied from your saved label)",
  lost: "Lost or stolen — coins gone, recorded as a loss (you labeled this)",
};

// Per-user serialization. The reconciliation steps below do multi-step,
// non-transactional work (clear gain events -> restore lots -> reclassify, or
// realize gains across lots). Background sync, wallet add, manual sync, and the
// resolve-review endpoint can all trigger this work at once; running two at the
// same time for one user could read the same gain events and restore/realize
// twice. We chain runs per user so a user's corrections execute one after another.
const userCorrectLocks = new Map<string, Promise<unknown>>();

function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = userCorrectLocks.get(userId) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  userCorrectLocks.set(userId, run);
  return (async () => {
    try {
      return await run;
    } finally {
      if (userCorrectLocks.get(userId) === run) userCorrectLocks.delete(userId);
    }
  })();
}

// Smart memory: the member labels one outgoing transfer. We (1) apply that label
// to the transfer itself, (2) remember the destination address so future
// transfers to it are auto-labeled, and (3) apply the same label to every OTHER
// transfer still waiting for review that went to the same address. Returns how
// many additional transfers were auto-labeled so the UI can tell the member.
export async function resolveReviewWithMemory(
  userId: string,
  tx: Transaction,
  category: TransferCategory,
): Promise<{ alsoApplied: number }> {
  return withUserLock(userId, async () => {
    await applyCategoryToTx(userId, tx.id, category, PRIMARY_NOTE[category]);

    // A lost/stolen disposal is a deliberate one-off. Never remember the
    // destination (a scam address shouldn't auto-classify future transfers) and
    // never bulk-apply it to other pending transfers — each loss is reviewed alone.
    if (category === "lost") return { alsoApplied: 0 };

    const dest = tx.counterpartyAddress;
    if (!dest) return { alsoApplied: 0 };

    // Remember this address -> label mapping for future syncs. Store the
    // canonical form so EVM addresses can never create duplicate, conflicting rows.
    await storage.upsertRecognizedAddress(userId, canonicalAddress(dest), category);

    // Apply the same label to other still-pending transfers to the same address.
    const all = await storage.getTransactionsByUser(userId);
    let alsoApplied = 0;
    for (const t of all) {
      if (t.id === tx.id) continue;
      if (t.reviewStatus !== "pending") continue;
      if (t.transactionType !== "sell") continue;
      if (!addressesMatch(t.counterpartyAddress, dest)) continue;
      await applyCategoryToTx(userId, t.id, category, AUTO_NOTE[category]);
      alsoApplied++;
    }
    return { alsoApplied };
  });
}

export async function selfCorrectKnownTransfers(userId: string): Promise<number> {
  return withUserLock(userId, () => runSelfCorrect(userId));
}

// Build a classifier for a user's destination addresses. An address is known if
// it is one of the member's own wallets, a recognized yield vault, or an address
// the member has previously labeled (smart memory). Own wallets and vaults are
// always non-taxable transfers; smart-memory addresses use whatever label the
// member saved for them.
async function buildAddressClassifier(
  userId: string,
): Promise<(dest: string) => TransferCategory | null> {
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

  const recognized = await storage.getRecognizedAddresses(userId);

  return (dest: string): TransferCategory | null => {
    if (!dest) return null;
    if (ownExact.has(dest) || ownLower.has(dest.toLowerCase())) return "own_transfer";
    if (isKnownVaultAddress(dest)) return "vault_deposit";
    for (const r of recognized) {
      if (addressesMatch(r.address, dest)) {
        const c = r.classification as TransferCategory;
        if (c === "own_transfer" || c === "vault_deposit" || c === "sale" || c === "swap") {
          return c;
        }
      }
    }
    return null;
  };
}

// Self-healing reclassification. Once an address is known — the member's own
// wallet, a recognized yield vault, or an address the member previously labeled
// (smart memory) — any auto-synced "sell" transaction to it is reclassified to
// match. Own/vault destinations become non-taxable transfers (wiping phantom
// gain events); smart-memory sale/swap destinations realize the taxable gain on
// transfers still waiting for review. Safe to run repeatedly: own/vault rows stop
// being "sell" after correction, and sale/swap rows are only acted on while
// pending, so re-runs skip already-resolved rows.
//
// Note: only auto-synced transactions carry a counterpartyAddress, so manually
// entered sells/swaps (which have none) are never affected.
async function runSelfCorrect(userId: string): Promise<number> {
  const classify = await buildAddressClassifier(userId);

  const txns = await storage.getTransactionsByUser(userId);
  let corrected = 0;
  for (const t of txns) {
    if (t.transactionType !== "sell") continue;
    const dest = t.counterpartyAddress;
    if (!dest) continue;
    const category = classify(dest);
    if (!category) continue;

    if (category === "own_transfer" || category === "vault_deposit") {
      await applyCategoryToTx(
        userId,
        t.id,
        category,
        category === "vault_deposit"
          ? "Vault deposit (auto-corrected — recognized address)"
          : "Transfer to your own wallet (auto-corrected — recognized address)",
      );
      corrected++;
    } else if (t.reviewStatus === "pending") {
      // sale / swap: realize the disposal once, only for transfers still
      // waiting for review (already-resolved sells keep their existing events).
      await applyCategoryToTx(userId, t.id, category, AUTO_NOTE[category]);
      corrected++;
    }
  }
  return corrected;
}
