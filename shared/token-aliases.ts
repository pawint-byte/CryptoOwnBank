/**
 * Token rename / alias tool — single source of truth.
 *
 * Some coins keep the same blockchain, addresses, and balances but change their
 * ticker and name (e.g. The Open Network renamed TON -> GRAM, no swap or
 * migration). When that happens we DON'T blindly follow a price feed's label —
 * we record the rename here, on purpose, so:
 *   1. prices keep flowing (both the old and new ticker map to one price), and
 *   2. members see a clear transition label like "Gram (prev. Toncoin)".
 *
 * To handle the next rebrand, add ONE entry below. No other code changes needed
 * for pricing — the price service fans the canonical price out to every alias.
 */

export interface TokenRename {
  /** Legacy ticker — also the key used in the price map (e.g. "TON"). */
  from: string;
  /** New ticker after the rename (e.g. "GRAM"). */
  to: string;
  /** Human label shown to members during/after the transition. */
  displayName: string;
  /** ISO date the rename goes live (metadata / documentation). */
  effective: string;
  /** Short plain-language note on what changed. */
  note?: string;
}

export const TOKEN_RENAMES: TokenRename[] = [
  {
    from: "TON",
    to: "GRAM",
    displayName: "Gram (prev. Toncoin)",
    effective: "2026-06-15",
    note: "The Open Network community renamed TON to GRAM. Same blockchain, same addresses, no swap, no migration — a balance of 10 TON simply shows as 10 GRAM.",
  },
];

const aliasToCanonical = new Map<string, string>();
const canonicalToRename = new Map<string, TokenRename>();

for (const r of TOKEN_RENAMES) {
  const from = r.from.toUpperCase();
  const to = r.to.toUpperCase();
  aliasToCanonical.set(from, from);
  aliasToCanonical.set(to, from);
  canonicalToRename.set(from, r);
}

/**
 * Resolve any ticker (old or new) to the single canonical ticker used for
 * price lookups. Unknown tickers are returned uppercased, unchanged.
 */
export function canonicalSymbol(symbol: string): string {
  if (!symbol) return symbol;
  const up = symbol.toUpperCase();
  return aliasToCanonical.get(up) || up;
}

/**
 * The label to show a member for this ticker, e.g. "Gram (prev. Toncoin)".
 * Falls back to the original symbol when there is no rename on record.
 */
export function displayLabel(symbol: string): string {
  if (!symbol) return symbol;
  const r = canonicalToRename.get(canonicalSymbol(symbol));
  return r ? r.displayName : symbol;
}

/** True if this ticker is part of a recorded rename (old or new name). */
export function isRenamedToken(symbol: string): boolean {
  if (!symbol) return false;
  return canonicalToRename.has(canonicalSymbol(symbol));
}

/**
 * All tickers (old + new) that share one price for the given ticker.
 * Returns just the canonical ticker when there is no rename on record.
 */
export function aliasGroup(symbol: string): string[] {
  const canon = canonicalSymbol(symbol);
  const r = canonicalToRename.get(canon);
  return r ? [r.from.toUpperCase(), r.to.toUpperCase()] : [canon];
}
