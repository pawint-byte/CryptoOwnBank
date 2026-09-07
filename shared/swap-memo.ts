export const SWAP_MEMO_REQUIRED_SYMBOLS = new Set(["XRP", "XLM"]);

export function normalizeSwapMemo(symbol: string | null | undefined, memo: string): string | undefined {
  const trimmed = memo.trim();
  if (trimmed) return trimmed;
  return SWAP_MEMO_REQUIRED_SYMBOLS.has((symbol || "").toUpperCase()) ? "0" : undefined;
}

export function validateSwapMemo(symbol: string | null | undefined, memo: string): string | null {
  const normalizedSymbol = (symbol || "").toUpperCase();
  const normalizedMemo = normalizeSwapMemo(normalizedSymbol, memo);
  if (!SWAP_MEMO_REQUIRED_SYMBOLS.has(normalizedSymbol)) return null;
  if (!normalizedMemo) return `A destination tag or memo is required for ${normalizedSymbol}.`;
  if (normalizedSymbol === "XRP") {
    if (!/^\d+$/.test(normalizedMemo)) {
      return "The XRP destination tag must be a whole number. Use 0 when your wallet does not provide one.";
    }
    if (BigInt(normalizedMemo) > 4_294_967_295n) {
      return "The XRP destination tag must be between 0 and 4294967295.";
    }
  }
  return null;
}