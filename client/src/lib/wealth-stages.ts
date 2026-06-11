import {
  ShieldCheck,
  FileText,
  HeartHandshake,
  Sprout,
  Banknote,
  Repeat,
  type LucideIcon,
} from "lucide-react";

export type StageStatus =
  | "not_started"
  | "in_progress"
  | "done_in_cob"
  | "handled_outside";

export interface Stage {
  id: string;
  number: number;
  name: string;
  oneLiner: string;
  icon: LucideIcon;
  why: string;
  how: string;
  costs: string;
  cobFeatures: { label: string; href: string }[];
  /** Human label for how often this stage should be re-confirmed. */
  cadenceLabel: string;
  /** Recommended re-confirm interval in days, used for fresh/due/overdue. */
  cadenceDays: number;
}

export const STAGES: Stage[] = [
  {
    id: "secured",
    number: 1,
    name: "Secured",
    oneLiner:
      "Holdings are in self-custody. The seed is backed up. No exchange holds the keys.",
    icon: ShieldCheck,
    why:
      "Anything held on an exchange or with a custodian can be frozen, seized, or lost in a bankruptcy without your participation. The entire architecture above this stage assumes you control the keys. If you don't, nothing else applies — you're a creditor of a company, not a holder of an asset.",
    how:
      "Move holdings off custodial venues into a hardware wallet (Ledger, Trezor, ELLIPAL, CypheRock) or a vetted software wallet (Xaman for XRPL, Sparrow for BTC, Rabby for EVM). Write the seed phrase on paper or stamp it into metal. Two copies, two locations, never the same drawer as the device.",
    costs:
      "Hardware wallet $60-$200 one-time. Metal seed plate $30-$80 optional. Time: an afternoon to set up properly, including the first sovereignty drill.",
    cobFeatures: [
      { label: "Sovereignty essay (universal key model)", href: "/sovereignty" },
      { label: "Wallet setup guide", href: "/wallet/create" },
    ],
    cadenceLabel: "Review yearly",
    cadenceDays: 365,
  },
  {
    id: "documented",
    number: 2,
    name: "Documented",
    oneLiner:
      "Someone you trust can find and value the holdings without you in the room.",
    icon: FileText,
    why:
      "Self-custody only works if the next holder can actually take the seat. An undocumented seed phrase that nobody knows exists is functionally identical to lost coins. The Recovery Kit makes the holdings discoverable, valued at a point in time, and usable — without requiring you to be available to explain anything.",
    how:
      "Generate the Recovery Kit. Print it. Put one copy with the seed backup, one copy with the person who would need it. Update yearly or whenever holdings change materially.",
    costs:
      "Free. Time: 5 minutes to generate, 30 minutes to print and distribute properly.",
    cobFeatures: [{ label: "Generate Recovery Kit", href: "/sovereignty-kit" }],
    cadenceLabel: "Update yearly or on material change",
    cadenceDays: 365,
  },
  {
    id: "continuous",
    number: 3,
    name: "Continuous",
    oneLiner:
      "If you step out of the seat, the next holder steps in — with no court, no custodian, no delay.",
    icon: HeartHandshake,
    why:
      "Documentation alone doesn't guarantee transfer. A successor still needs the actual key material to act. Splitting the seed across trusted parties via SLIP-39, paired with a check-in mechanism, means no single person can act unilaterally — but together your designated successors can take the seat when needed. The asset itself never moves. Only the seat changes hands.",
    how:
      "Activate Legacy Plan. Designate successors. Optionally split the seed into SLIP-39 shares distributed across people and places. Set a check-in cadence. The system handles release coordination if you stop checking in.",
    costs:
      "$29/year, $99/5 years, or $499 one-time. Time: an hour to set up, a few minutes per check-in.",
    cobFeatures: [
      { label: "Legacy Plan", href: "/legacy-plan" },
      { label: "SLIP-39 setup", href: "/legacy-plan/slip39-setup" },
    ],
    cadenceLabel: "Check in quarterly",
    cadenceDays: 90,
  },
  {
    id: "productive",
    number: 4,
    name: "Productive",
    oneLiner:
      "Holdings earn yield or generate other value while still under your control.",
    icon: Sprout,
    why:
      "Holdings that just sit there are sovereign but idle. Productive holdings keep the same sovereignty properties while compounding. The key constraint: stay non-custodial. Custodial yield platforms (Celsius, BlockFi, Genesis, Voyager) have repeatedly demonstrated that 'high yield + custodial' often ends in zero. Non-custodial yield (vaults where you keep signing authority, staking where you control the validator delegation) is the productive form that doesn't trade away the security model.",
    how:
      "Deploy a portion to non-custodial vaults (Soil CREDIT+ on XRPL, Aave on EVM), stake natively (XRP, ETH, ATOM, SOL), or run AMM positions where appropriate. Match the deployment to your risk tolerance and time horizon. Keep the long-term storage layer (Stage 1) entirely separate from the productive layer.",
    costs:
      "No platform fees beyond the protocols themselves. Real costs are smart-contract risk, impermanent loss for AMMs, and validator risk for staking. Time: ongoing monitoring, low if you pick conservative options.",
    cobFeatures: [
      { label: "Soil vaults (XRPL)", href: "/ownbank/vaults" },
      { label: "Native staking", href: "/native-staking" },
      { label: "RWA yields", href: "/rwa-yields" },
    ],
    cadenceLabel: "Review quarterly",
    cadenceDays: 90,
  },
  {
    id: "liquid",
    number: 5,
    name: "Liquid Without Selling",
    oneLiner:
      "You can access dollar value from your holdings without disposing of the underlying asset.",
    icon: Banknote,
    why:
      "Selling is the only event that triggers most tax consequences. Borrowing against your holdings isn't a sale — it's a loan against collateral. The loan proceeds are not taxable income. You spend the loan, you keep the asset, and the asset continues to appreciate. This is the operational core of how multi-generational wealth is held: buy, borrow, don't sell. The holdings stay intact across the entire arc.",
    how:
      "Establish at least one borrow-against relationship before you need it. BTC: Ledn, Unchained, Arch, Milo (mortgages). ETH: Aave, Morpho (non-custodial). XRPL: Soil credit markets as they mature. Start small to learn the mechanics before you actually need liquidity. Always understand the liquidation threshold and keep meaningful collateral buffer.",
    costs:
      "Interest rates 6-15% typically, depending on lender and collateral. Real risks: liquidation if collateral value drops below the threshold; counterparty risk on centralized lenders. Time: a few hours to onboard with each lender; ongoing monitoring of collateral ratio.",
    cobFeatures: [
      { label: "DeFi borrowing overview", href: "/defi-borrowing" },
      { label: "XLS-66 lending (XRPL)", href: "/xls66-lending" },
    ],
    cadenceLabel: "Review collateral quarterly",
    cadenceDays: 90,
  },
  {
    id: "tested",
    number: 6,
    name: "Tested",
    oneLiner:
      "The architecture works in practice — proven once a year by someone other than you.",
    icon: Repeat,
    why:
      "Every stage above this is theoretical until it's actually rehearsed. Backups not tested are not backups. Successors not briefed are not successors. The annual drill makes the whole architecture real — confirms you can still get to the holdings, confirms the next holder can, confirms the documentation still matches reality. Most failures of self-custody come from architectures that worked on day one and quietly broke over the next ten years without anyone noticing.",
    how:
      "Once a year: restore the seed on a different device using a different wallet. Confirm balances visible. Have one designated successor run through the Recovery Kit themselves and confirm they could act on it. Update anything that's drifted. Then put it all back away.",
    costs:
      "Free. Time: 1-2 hours per year, ideally on the same calendar date so it doesn't get skipped.",
    cobFeatures: [{ label: "Sovereignty drill guidance", href: "/sovereignty" }],
    cadenceLabel: "Annual drill",
    cadenceDays: 365,
  },
];

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done_in_cob: "Done — in CryptoOwnBank",
  handled_outside: "Handled outside CryptoOwnBank",
};

export const VALID_STATUSES: StageStatus[] = [
  "not_started",
  "in_progress",
  "done_in_cob",
  "handled_outside",
];

/**
 * Shared with the Wealth Architecture page so posture stays in sync between the two
 * surfaces. Logged-in members get a per-user key so one account's posture never bleeds
 * into another on a shared browser. Anonymous visitors (public page, logged out) fall
 * back to the legacy global key, which preserves their existing behavior. We deliberately
 * do NOT migrate the legacy global value into a user key — copying it to a freshly
 * logged-in account would itself be a cross-account bleed.
 */
const LEGACY_STATUS_KEY = "wealth-architecture-status-v1";

function statusStorageKey(userId?: string): string {
  return userId ? `${LEGACY_STATUS_KEY}:${userId}` : LEGACY_STATUS_KEY;
}

export function loadStageStatuses(userId?: string): Record<string, StageStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(statusStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const cleaned: Record<string, StageStatus> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && (VALID_STATUSES as string[]).includes(v)) {
        cleaned[k] = v as StageStatus;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveStageStatuses(
  userId: string | undefined,
  statuses: Record<string, StageStatus>,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      statusStorageKey(userId),
      JSON.stringify(statuses),
    );
  } catch {
    // localStorage might be unavailable (Safari private mode etc.) — fail silently
  }
}

export function isStageActive(status: StageStatus | undefined): boolean {
  return status === "done_in_cob" || status === "handled_outside";
}

/* ---- Cadence: per-user last-verified timestamps (new data, namespaced per user) ---- */

export type Freshness = "never" | "fresh" | "due" | "overdue";

function verifiedKey(userId: string): string {
  return `cob-stage-verified-v1:${userId}`;
}

export function loadStageVerified(userId: string): Record<string, string> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = window.localStorage.getItem(verifiedKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && !Number.isNaN(Date.parse(v))) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveStageVerified(userId: string, map: Record<string, string>) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(verifiedKey(userId), JSON.stringify(map));
  } catch {
    // fail silently
  }
}

/** Classify how current a confirmation is, given when it last happened. */
export function computeFreshness(
  lastVerifiedISO: string | undefined,
  cadenceDays: number,
): Freshness {
  if (!lastVerifiedISO) return "never";
  const last = Date.parse(lastVerifiedISO);
  if (Number.isNaN(last)) return "never";
  const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
  if (days <= cadenceDays) return "fresh";
  if (days <= cadenceDays * 1.5) return "due";
  return "overdue";
}

export function formatVerifiedDate(iso: string | undefined): string {
  if (!iso) return "Never confirmed";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Never confirmed";
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
