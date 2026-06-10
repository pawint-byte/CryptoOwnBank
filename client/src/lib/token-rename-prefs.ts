import { useCallback, useEffect, useState } from "react";

/**
 * Per-member decisions about renamed tokens, stored only in this browser.
 * We never auto-change a holding's displayed name — the member chooses:
 *   - "accepted": show the new transition label (e.g. "Gram (prev. Toncoin)")
 *   - "kept":     leave the old ticker as-is, no more nudge
 *   - "dismissed": leave as-is and stop reminding
 * Keyed by the legacy ticker (uppercase), e.g. "TON".
 *
 * Storage is namespaced per authenticated user id so that, on a shared browser,
 * one member's choice never bleeds into another member's holdings.
 */
export type RenameDecision = "accepted" | "kept" | "dismissed";

const STORAGE_PREFIX = "token-rename-prefs-v1";
const VALID: RenameDecision[] = ["accepted", "kept", "dismissed"];

function keyFor(userId?: string | null): string {
  return `${STORAGE_PREFIX}:${userId || "anon"}`;
}

function readPrefs(userId?: string | null): Record<string, RenameDecision> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Record<string, RenameDecision> = {};
    for (const [k, v] of Object.entries(parsed || {})) {
      if (typeof v === "string" && (VALID as string[]).includes(v)) {
        clean[k.toUpperCase()] = v as RenameDecision;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function useTokenRenamePrefs(userId?: string | null) {
  const [prefs, setPrefs] = useState<Record<string, RenameDecision>>(() => readPrefs(userId));

  // Reload when the active member changes (login / logout / account switch).
  useEffect(() => {
    setPrefs(readPrefs(userId));
  }, [userId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyFor(userId)) setPrefs(readPrefs(userId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const setDecision = useCallback(
    (symbol: string, decision: RenameDecision) => {
      setPrefs((prev) => {
        const next = { ...prev, [symbol.toUpperCase()]: decision };
        try {
          window.localStorage.setItem(keyFor(userId), JSON.stringify(next));
        } catch {
          /* ignore quota / disabled storage */
        }
        return next;
      });
    },
    [userId],
  );

  return { prefs, setDecision };
}
