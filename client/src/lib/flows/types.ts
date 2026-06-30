import type { LucideIcon } from "lucide-react";

export type Rail = "xrpl" | "stellar";
export type Goal = "get-paid" | "pay";
export type AssetKind = "native" | "stable";
export type StepStatus = "ready" | "action" | "locked" | "pending";
export type GateType = "platform" | "chain";

export interface StepAction {
  kind: "inline" | "link" | "external";
  label: string;
  href?: string;
  run?: () => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
}

export interface FlowStep {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  status: StepStatus;
  gate: GateType;
  aidHref?: string;
  aidLabel?: string;
  action?: StepAction;
}

export interface Flow {
  id: string;
  goal: Goal;
  rail: Rail;
  asset: AssetKind;
  title: string;
  subtitle: string;
  steps: FlowStep[];
}

export const RAIL_LABEL: Record<Rail, string> = {
  xrpl: "XRP Ledger",
  stellar: "Stellar",
};

export const GOAL_LABEL: Record<Goal, string> = {
  "get-paid": "Get paid in crypto",
  pay: "Pay someone in crypto",
};

export function assetSymbol(rail: Rail, asset: AssetKind): string {
  if (asset === "native") return rail === "xrpl" ? "XRP" : "XLM";
  return rail === "xrpl" ? "RLUSD" : "USDC";
}

export function nativeSymbol(rail: Rail): string {
  return rail === "xrpl" ? "XRP" : "XLM";
}

// Network-set reserve / fee facts, surfaced UPFRONT so neither side gets stuck.
// XRPL: ~1 XRP base reserve to exist, ~0.2 XRP locked per owned object (e.g. a
//   trust line). Stellar: account must hold ~1 XLM (2 x 0.5 base reserve), each
//   extra entry (trust line) locks another ~0.5 XLM.
// feeHeadroom is a small comfort margin kept FREE on top of the locked reserve so
// a member can pay the (tiny) network fee for many transactions — not a fixed
// half-coin block that falsely locks someone sitting right at their reserve.
export const RESERVE = {
  xrpl: { base: 1, perObject: 0.2, fee: 0.00001, feeHeadroom: 0.05 },
  stellar: { base: 0.5, minAccount: 1, perEntry: 0.5, fee: 0.00001, feeHeadroom: 0.05 },
} as const;
