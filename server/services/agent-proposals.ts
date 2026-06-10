import type { AgentMandate, Position } from "@shared/schema";

// HIDDEN proposals-only prototype.
// Deterministic rule engine (intentionally NOT an LLM) so behavior is testable
// and predictable. It reads positions and SUGGESTS moves within the member's
// guardrails. It never signs, never moves funds — every proposal ends at the
// member's own signature.

const STABLES = new Set([
  "RLUSD", "USDC", "USDT", "DAI", "USD", "USDP", "GUSD", "PYUSD", "TUSD", "USDD",
]);

export interface ProposalCandidate {
  kind: string;
  title: string;
  rationale: string;
  fromAsset: string | null;
  toAsset: string | null;
  amountUsd: string | null;
}

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function generateProposals(mandate: AgentMandate, positions: Position[]): ProposalCandidate[] {
  const proposals: ProposalCandidate[] = [];
  const floor = Number(mandate.floorUsd) || 0;
  const maxMove = Number(mandate.maxMoveUsd) || 0;

  // Stablecoins are ~$1, so quantity ≈ USD value. Honest simplification for this
  // prototype (it only ever reasons about stablecoins, never volatile assets).
  const stableQty = positions
    .filter((p) => STABLES.has((p.assetSymbol || "").toUpperCase()))
    .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  const idle = stableQty - floor;

  if (idle <= 1) {
    proposals.push({
      kind: "info",
      title: "No idle stablecoins to put to work right now",
      rationale:
        `Your stablecoin balance (about ${money(stableQty)}) is at or below your ${money(floor)} ` +
        `liquid floor, so the agent has nothing to suggest moving. Lower your floor or add ` +
        `stablecoins to see a yield proposal here.`,
      fromAsset: null,
      toAsset: null,
      amountUsd: null,
    });
    return proposals;
  }

  let move = idle;
  if (maxMove > 0) move = Math.min(move, maxMove);
  move = Math.floor(move * 100) / 100;

  // Conservative → Treasury (5.2%, no lock). Balanced/Aggressive → CREDIT+ (8.0%, 90-day lock).
  const conservative = mandate.riskTolerance === "conservative";
  const vault = conservative ? "Soil Treasury Vault" : "Soil CREDIT+ Vault";
  const apr = conservative ? "5.2%" : "8.0%";
  const lockNote = conservative
    ? "Treasury-backed and no lock-up, so it's easy to exit."
    : "Higher yield via private credit. Note: CREDIT+ has a 90-day lock plus a 10-day cooldown before withdrawal.";

  proposals.push({
    kind: "yield_move",
    title: `Put ${money(move)} of idle stablecoins to work at ${apr} APR`,
    rationale:
      `You're holding about ${money(stableQty)} in stablecoins that are earning nothing. ` +
      `Keeping your ${money(floor)} liquid floor untouched leaves ${money(idle)} idle` +
      `${maxMove > 0 && idle > maxMove ? `, and your per-move cap is ${money(maxMove)}` : ""}. ` +
      `This proposal moves ${money(move)} into the ${vault} (${apr} APR). ${lockNote} ` +
      `You would review and sign this yourself in Xaman — nothing moves until you approve.`,
    fromAsset: "Stablecoins",
    toAsset: vault,
    amountUsd: String(move),
  });

  return proposals;
}
