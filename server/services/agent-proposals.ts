import type { AgentMandate, Position, AgentPayee } from "@shared/schema";
import type { BlendPoolApy } from "./blend";

// HIDDEN proposals-only prototype.
// Deterministic rule engine (intentionally NOT an LLM) so behavior is testable
// and predictable. It reads positions and SUGGESTS moves within the member's
// guardrails. It never signs, never moves funds — every proposal ends at the
// member's own signature.

const STABLES = new Set([
  "RLUSD", "USDC", "USDT", "DAI", "USD", "USDP", "GUSD", "PYUSD", "TUSD", "USDD",
]);

// Soil Protocol vault addresses (XRPL). A "yield move" deposit is simply an RLUSD
// Payment to one of these — the member signs it themselves in Xaman.
const SOIL_TREASURY_ADDRESS = "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8";
const SOIL_CREDITPLUS_ADDRESS = "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX";

export interface ProposalCandidate {
  kind: string;
  title: string;
  rationale: string;
  fromAsset: string | null;
  toAsset: string | null;
  amountUsd: string | null;
  // Outward-payment fields (null for inward yield proposals).
  chain?: string | null;
  toAddress?: string | null;
  destinationTag?: string | null;
  assetCode?: string | null;
  issuer?: string | null;
  amount?: string | null;
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

  // Soil vaults only accept RLUSD, and the member signs an RLUSD payment — so the
  // amount we propose to sign must be backed by RLUSD they actually hold, not the
  // aggregate stablecoin pile (which may be mostly USDC/USDT).
  const rlusdQty = positions
    .filter((p) => (p.assetSymbol || "").toUpperCase() === "RLUSD")
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
  move = Math.min(move, rlusdQty);
  move = Math.floor(move * 100) / 100;

  // Idle stablecoins exist, but not enough RLUSD to fund a Soil deposit the member
  // could actually sign. Be honest: suggest converting, don't show a signable card.
  if (move <= 1) {
    proposals.push({
      kind: "info",
      title: "Convert some stablecoins to RLUSD to use the Soil vaults",
      rationale:
        `You have about ${money(idle)} in idle stablecoins, but the Soil vaults take RLUSD and you ` +
        `currently hold about ${money(rlusdQty)} RLUSD. Swap some of your other stablecoins to RLUSD first, ` +
        `then the agent can propose a deposit you can review and sign in Xaman.`,
      fromAsset: "Stablecoins",
      toAsset: "RLUSD",
      amountUsd: null,
    });
    return proposals;
  }

  // Conservative → Treasury (5.2%, no lock). Balanced/Aggressive → CREDIT+ (8.0%, 90-day lock).
  const conservative = mandate.riskTolerance === "conservative";
  const vault = conservative ? "Soil Treasury Vault" : "Soil CREDIT+ Vault";
  const vaultAddress = conservative ? SOIL_TREASURY_ADDRESS : SOIL_CREDITPLUS_ADDRESS;
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
      `This proposal deposits ${money(move)} of RLUSD into the ${vault} (${apr} APR). ${lockNote} ` +
      `You review and sign this yourself in Xaman — the agent never signs and never holds your funds.`,
    fromAsset: "Stablecoins",
    toAsset: vault,
    amountUsd: String(move),
    // On-chain deposit details so the member can sign it in Xaman: a Soil deposit
    // is an RLUSD Payment to the vault address. issuer is left null — the client
    // fills in the canonical RLUSD issuer from its constants.
    chain: "xrpl",
    toAddress: vaultAddress,
    assetCode: "RLUSD",
    issuer: null,
    amount: String(move),
  });

  return proposals;
}

// ── Outward payments ─────────────────────────────────────────────────────────
// Drafts a payment proposal for each enabled payee the member has whitelisted.
// The agent can only ever draft a payment to an address the member already saved.
// Guardrails: for stablecoin payees (amount ≈ USD) the per-move cap and liquid
// floor are enforced; for volatile assets we cannot price them here, so we say so
// honestly instead of pretending the USD guardrail applies. Nothing signs here —
// every payment ends at the member's own wallet signature.
export function generatePaymentProposals(
  payees: AgentPayee[],
  mandate: AgentMandate,
  positions: Position[],
): ProposalCandidate[] {
  const out: ProposalCandidate[] = [];
  const floor = Number(mandate.floorUsd) || 0;
  const maxMove = Number(mandate.maxMoveUsd) || 0;

  const stableQty = positions
    .filter((p) => STABLES.has((p.assetSymbol || "").toUpperCase()))
    .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  for (const payee of payees) {
    if (!payee.enabled) continue;

    const asset = (payee.assetCode || "").toUpperCase();
    const isStable = STABLES.has(asset);
    const amt = Number(payee.amount) || 0;
    const wallet = payee.chain === "stellar" ? "Freighter" : "Xaman";
    const dest = `${payee.label} (${payee.address.slice(0, 8)}…${payee.address.slice(-4)})`;

    // Guardrail checks only make sense in USD, which we only trust for stablecoins.
    if (isStable) {
      if (maxMove > 0 && amt > maxMove) {
        out.push({
          kind: "info",
          title: `Payment to ${payee.label} is over your per-move cap`,
          rationale:
            `This payee is set to send ${amt} ${asset} (~${money(amt)}), but your per-move cap is ` +
            `${money(maxMove)}. The agent won't draft a payment above your cap. Raise the cap or lower ` +
            `the payee amount to see this proposal.`,
          fromAsset: null, toAsset: dest, amountUsd: String(amt),
          chain: payee.chain, toAddress: payee.address, destinationTag: payee.destinationTag,
          assetCode: payee.assetCode, issuer: payee.issuer, amount: payee.amount,
        });
        continue;
      }
      if (stableQty - amt < floor) {
        out.push({
          kind: "info",
          title: `Paying ${payee.label} would dip below your liquid floor`,
          rationale:
            `Sending ${amt} ${asset} (~${money(amt)}) would drop your stablecoins (about ` +
            `${money(stableQty)}) below your ${money(floor)} floor. The agent won't draft it. ` +
            `Add stablecoins or lower your floor first.`,
          fromAsset: null, toAsset: dest, amountUsd: String(amt),
          chain: payee.chain, toAddress: payee.address, destinationTag: payee.destinationTag,
          assetCode: payee.assetCode, issuer: payee.issuer, amount: payee.amount,
        });
        continue;
      }
    }

    out.push({
      kind: "payment",
      title: `Pay ${payee.label}: ${amt} ${asset}`,
      rationale:
        `Send ${amt} ${asset} to ${payee.label}${payee.note ? ` — ${payee.note}` : ""}. ` +
        `${isStable ? `This stays within your ${money(maxMove > 0 ? maxMove : amt)} cap and your ${money(floor)} floor. ` : `Note: ${asset} isn't a stablecoin, so the USD per-move cap can't be checked here — review the amount carefully. `}` +
        `You review and sign this yourself in ${wallet} — the agent never signs and never holds your funds.`,
      fromAsset: null,
      toAsset: dest,
      amountUsd: isStable ? String(amt) : null,
      chain: payee.chain,
      toAddress: payee.address,
      destinationTag: payee.destinationTag,
      assetCode: payee.assetCode,
      issuer: payee.issuer,
      amount: payee.amount,
    });
  }

  return out;
}

// ── Blend (Soroban lending on Stellar) ───────────────────────────────────────
// Deepens Blend from passive position-tracking into an actively-surfaced yield
// option: the agent proposes supplying idle stablecoins (USDC) to the best Blend
// pool, using the LIVE supply APY read from the chain. Supplying to Blend is a
// Soroban smart-contract action, so — honestly — the member completes and signs
// it in the Blend app with their own Stellar wallet. We never sign, never hold
// funds, and only ever promise what the standard actually delivers: we surface
// the live rate and the amount that fits the member's guardrails.
export function generateBlendProposals(
  blendApys: BlendPoolApy[],
  mandate: AgentMandate,
  positions: Position[],
): ProposalCandidate[] {
  const out: ProposalCandidate[] = [];
  if (!blendApys.length) return out;

  const floor = Number(mandate.floorUsd) || 0;
  const maxMove = Number(mandate.maxMoveUsd) || 0;

  const stableQty = positions
    .filter((p) => STABLES.has((p.assetSymbol || "").toUpperCase()))
    .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  const idle = stableQty - floor;
  if (idle <= 1) return out;

  let move = idle;
  if (maxMove > 0) move = Math.min(move, maxMove);
  move = Math.floor(move * 100) / 100;

  // Pick the best live USDC supply rate across all configured pools.
  let best: { apy: number; poolName: string } | null = null;
  for (const pool of blendApys) {
    for (const a of pool.assets) {
      if ((a.symbol || "").toUpperCase() === "USDC" && (!best || a.supplyApy > best.apy)) {
        best = { apy: a.supplyApy, poolName: pool.poolName };
      }
    }
  }
  if (!best) return out;

  const aprPct = (best.apy * 100).toFixed(2);
  out.push({
    kind: "yield_blend",
    title: `Optionally supply ${money(move)} USDC to ${best.poolName} (~${aprPct}% APR, live)`,
    rationale:
      `Another home for your idle stablecoins: Blend is a lending market on Stellar. Supplying USDC to ` +
      `the ${best.poolName} currently earns about ${aprPct}% APR — this rate is read live from the chain and floats. ` +
      `Supplying to Blend is a Stellar Soroban smart-contract action, so you complete and sign it yourself in the ` +
      `Blend app with your own Stellar wallet — CryptoOwnBank never signs and never holds your funds. We only ` +
      `surface the live rate and the amount that fits your ${money(floor)} liquid floor` +
      `${maxMove > 0 ? ` and ${money(maxMove)} per-move cap` : ""}. Requires USDC on Stellar.`,
    fromAsset: "Stablecoins (USDC on Stellar)",
    toAsset: best.poolName,
    amountUsd: String(move),
    chain: "stellar",
  });

  return out;
}
