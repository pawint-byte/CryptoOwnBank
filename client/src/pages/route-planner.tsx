import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  CreditCard,
  ArrowLeftRight,
  Route as RouteIcon,
  EyeOff,
  ArrowRight,
  Wallet,
  Info,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Coins,
  Trophy,
  Gauge,
  Scale,
  Zap,
} from "lucide-react";

type DestOption = {
  symbol: string;
  name: string;
  external?: boolean;
};

// Destinations must be coins the linked tools can actually deliver: every symbol
// here is in the canonical `tokens` grid that both /buy-crypto and /swap-any-pair
// render from, so a Swap Any Pair (or card) route is always executable.
const DESTINATIONS: DestOption[] = [
  { symbol: "XMR", name: "Monero (private — handled outside us)", external: true },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XLM", name: "Stellar Lumens" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "MATIC", name: "Polygon (MATIC)" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "ATOM", name: "Cosmos" },
  { symbol: "TRX", name: "TRON" },
  { symbol: "ALGO", name: "Algorand" },
  { symbol: "CRO", name: "Cronos" },
  { symbol: "FLR", name: "Flare" },
  { symbol: "HBAR", name: "Hedera" },
];

// Card-buyable coins that exist in the grid (Stripe supports these for delivery).
const STRIPE_DIRECT = ["ETH", "BTC", "SOL", "XLM", "AVAX", "MATIC"];
const EXTERNAL_PRIVACY = ["XMR", "ZEC"];
// EVM coins usable by the on-chain DEX. Destination gating only ever hits the
// grid EVM coins (ETH/MATIC/AVAX); the stables/others cover held source coins.
const EVM_ASSETS = ["ETH", "MATIC", "AVAX", "USDC", "USDT", "DAI", "WBTC", "BNB", "ARB", "OP"];

const TOOL = {
  buy: "/buy-crypto",
  evmSwap: "/ownbank/evm-swap",
  crossChain: "/ownbank/cross-chain",
  swapAny: "/swap-any-pair",
  bridge: "/ownbank/xrpl-bridge",
  external: "/own-privately",
  wallets: "/wallets",
};

type Priority = "balanced" | "cheapest" | "easiest" | "tax" | "private";

const PRIORITIES: { id: Priority; label: string; hint: string }[] = [
  { id: "balanced", label: "Best for me (balanced)", hint: "Weighs cost, ease, staying in your own custody, and tax" },
  { id: "cheapest", label: "Cheapest", hint: "Lowest total fees, even if it's a few more clicks" },
  { id: "easiest", label: "Easiest", hint: "Fewest steps, simplest path" },
  { id: "tax", label: "Lowest tax bill", hint: "Avoids selling coins you already hold where possible" },
  { id: "private", label: "Most private", hint: "Least personal info exposed" },
];

type StepKind = "buy" | "swap" | "bridge" | "external" | "have";

type PlanStep = {
  n: number;
  kind: StepKind;
  title: string;
  detail: string;
  toolLabel: string;
  href: string;
  note?: string;
};

type Custody = "self" | "regulated" | "inflight";

type Metric = {
  costMid: number; // representative fee %, lower is better
  costLabel: string;
  ease: number; // 1-5, higher is easier
  custody: Custody;
  taxable: boolean;
  privacy: number; // 1-5, higher is more private
  speed: string;
};

type RouteOption = {
  id: string;
  rail: string;
  steps: PlanStep[];
  metric: Metric;
  pros: string[];
  cons: string[];
};

// ---- step builders -------------------------------------------------------

function buyStep(n: number, coin: string): PlanStep {
  return {
    n,
    kind: "buy",
    title: `Buy ${coin} with your card`,
    detail: `Use the card on-ramp to buy ${coin}. It lands straight in your own wallet — we never hold it.`,
    toolLabel: `Open Buy ${coin}`,
    href: `${TOOL.buy}?coin=${coin}`,
    note: "Pay with a card via your choice of provider. The crypto is delivered straight to your address.",
  };
}

function haveStep(n: number, coin: string): PlanStep {
  return {
    n,
    kind: "have",
    title: `You already hold ${coin}`,
    detail: `You already own ${coin} — nothing to buy or swap.`,
    toolLabel: "View your wallets",
    href: TOOL.wallets,
  };
}

function evmSwapStep(n: number, from: string, to: string): PlanStep {
  return {
    n,
    kind: "swap",
    title: `Swap ${from} → ${to} on-chain`,
    detail: `Swap your ${from} for ${to} straight from your own wallet — best rates, never leaves your control.`,
    toolLabel: "Open EVM Swap",
    href: TOOL.evmSwap,
    note: `Powered by 1inch (use Cross-Chain Swap if the two coins live on different chains). This counts as selling your ${from}, so it's a taxable disposal.`,
  };
}

function swapAnyStep(n: number, from: string, to: string): PlanStep {
  return {
    n,
    kind: "swap",
    title: `Swap ${from} → ${to} (any pair)`,
    detail: `Use Swap Any Pair to turn your ${from} into ${to}, delivered to your own wallet.`,
    toolLabel: "Open Swap Any Pair",
    href: TOOL.swapAny,
    note: `Trocador shops dozens of services for the best rate. A third party briefly holds the coins while the swap completes — we never custody. Counts as selling your ${from} (taxable).`,
  };
}

function bridgeStep(n: number, from: string, to: string): PlanStep {
  return {
    n,
    kind: "bridge",
    title: `Bridge ${from} → ${to}`,
    detail: `Bridge your ${from} into native ${to}, delivered to your own ${to} wallet.`,
    toolLabel: "Open XRPL Bridge",
    href: TOOL.bridge,
    note: `Powered by Squid Router / Axelar. A bridge is a swap, so it's a taxable disposal of your ${from}. Takes a few minutes.`,
  };
}

function externalStep(n: number, from: string, dest: string, address: string): PlanStep {
  return {
    n,
    kind: "external",
    title: `Swap ${from} → ${dest} (handled outside us)`,
    detail: address
      ? `Use a no-KYC swap service to turn your ${from} into ${dest}, sent to your address: ${address}`
      : `Use a no-KYC swap service to turn your ${from} into ${dest}, sent to your own ${dest} address.`,
    toolLabel: "Open Own It Privately",
    href: TOOL.external,
    note: `${dest} is private by design — we never custody it and never touch the last step. We get you to ${from}; the final private leg is done by a third party you choose. (Swapping ${from} → ${dest} is a taxable disposal of your ${from}.)`,
  };
}

// ---- route builders ------------------------------------------------------

function cardRoute(dest: string): RouteOption {
  return {
    id: "card",
    rail: "Buy with a card",
    steps: [buyStep(1, dest)],
    metric: {
      costMid: 4,
      costLabel: "~3–5% card fee",
      ease: 5,
      custody: "regulated",
      taxable: false,
      privacy: 1,
      speed: "minutes",
    },
    pros: ["No crypto needed to start", "Not a taxable sale", "Simplest possible path"],
    cons: ["Card fees are the highest", "Needs ID verification"],
  };
}

function onchainRoute(from: string, dest: string): RouteOption {
  return {
    id: "onchain",
    rail: "On-chain swap (DEX)",
    steps: [evmSwapStep(1, from, dest)],
    metric: {
      costMid: 0.6,
      costLabel: "network gas + ~0.3% DEX fee",
      ease: 4,
      custody: "self",
      taxable: true,
      privacy: 3,
      speed: "seconds",
    },
    pros: ["Cheapest rates by far", "Stays in your own custody the whole time", "Near-instant"],
    cons: [`Counts as selling your ${from} (taxable)`, "Works for EVM coins only"],
  };
}

function swapAnyRoute(from: string, dest: string): RouteOption {
  return {
    id: "swapany",
    rail: "Swap Any Pair",
    steps: [swapAnyStep(1, from, dest)],
    metric: {
      costMid: 1.5,
      costLabel: "~1–2% swap spread",
      ease: 4,
      custody: "inflight",
      taxable: true,
      privacy: 2,
      speed: "a few minutes",
    },
    pros: ["Reaches almost any coin or chain", "Usually no account needed", "Lands in your own wallet"],
    cons: [`Counts as selling your ${from} (taxable)`, "A third party briefly holds the coins mid-swap"],
  };
}

function bridgeRoute(from: string, dest: string, withBuy: boolean): RouteOption {
  const steps: PlanStep[] = [];
  let n = 1;
  if (withBuy) steps.push(buyStep(n++, from));
  steps.push(bridgeStep(n++, from, dest));
  return {
    id: "bridge",
    rail: "XRPL Bridge",
    steps,
    metric: {
      costMid: withBuy ? 5 : 1,
      costLabel: withBuy ? "card fee + ~0.5–1.5% bridge" : "~0.5–1.5% bridge fee",
      ease: withBuy ? 3 : 3,
      custody: "self",
      taxable: true,
      privacy: 3,
      speed: "a few minutes",
    },
    pros: ["Delivers native " + dest, "Stays in your own custody"],
    cons: [`Bridging is a taxable disposal of your ${from}`, "A few minutes, multi-step"],
  };
}

function cashThenSwapRoute(dest: string): RouteOption {
  return {
    id: "cash-swap",
    rail: "Buy USDC → Swap Any Pair",
    steps: [buyStep(1, "USDC"), swapAnyStep(2, "USDC", dest)],
    metric: {
      costMid: 5,
      costLabel: "card fee + ~1–2% swap spread",
      ease: 3,
      custody: "inflight",
      taxable: true,
      privacy: 1,
      speed: "minutes",
    },
    pros: [
      `Reaches ${dest} even with no crypto to start`,
      "USDC is the easiest coin to buy, then swap from",
      "Lands in your own wallet",
    ],
    cons: ["Two steps and two sets of fees", "The swap counts as a disposal of the USDC (tiny gain, since it's a stablecoin)"],
  };
}

function privateRoute(dest: string, holdsBtc: boolean, address: string): RouteOption {
  const steps: PlanStep[] = [];
  let n = 1;
  if (!holdsBtc) steps.push(buyStep(n++, "BTC"));
  steps.push(externalStep(n++, "BTC", dest, address));
  return {
    id: "private",
    rail: "Private route",
    steps,
    metric: {
      costMid: holdsBtc ? 2 : 6,
      costLabel: holdsBtc ? "~1–2% no-KYC swap" : "card fee + ~1–2% no-KYC swap",
      ease: 2,
      custody: "inflight",
      taxable: true,
      privacy: 5,
      speed: "a few minutes",
    },
    pros: [`${dest} is private by design`, "We never touch the final step"],
    cons: ["Most involved path", "The BTC → " + dest + " swap is taxable"],
  };
}

function haveRoute(dest: string): RouteOption {
  return {
    id: "have",
    rail: "You already have it",
    steps: [haveStep(1, dest)],
    metric: {
      costMid: 0,
      costLabel: "free — you already own it",
      ease: 5,
      custody: "self",
      taxable: false,
      privacy: 3,
      speed: "now",
    },
    pros: [`You already hold ${dest} — nothing to do`],
    cons: [],
  };
}

// ---- candidate generation + scoring -------------------------------------

function pickFrom(held: string[], dest: string, evmOnly: boolean): string | null {
  const pool = held
    .filter((s) => s !== dest)
    .filter((s) => (evmOnly ? EVM_ASSETS.includes(s) : true));
  const pref = ["USDC", "USDT", "DAI", "ETH", "BTC", "SOL", "XLM"];
  for (const p of pref) if (pool.includes(p)) return p;
  return pool[0] ?? null;
}

function generateRoutes(dest: string, held: string[], address: string): RouteOption[] {
  const routes: RouteOption[] = [];
  const holdsDest = held.includes(dest);
  const heldOther = held.filter((s) => s !== dest);

  if (holdsDest) routes.push(haveRoute(dest));

  // Privacy coins keep their dedicated boundary — never routed through our aggregator.
  if (EXTERNAL_PRIVACY.includes(dest)) {
    routes.push(privateRoute(dest, held.includes("BTC"), address));
    return routes;
  }

  // Card buy, when the coin is natively card-buyable.
  if (STRIPE_DIRECT.includes(dest)) routes.push(cardRoute(dest));

  // On-chain DEX swap — only when both sides are EVM coins.
  if (EVM_ASSETS.includes(dest)) {
    const fromEvm = pickFrom(heldOther, dest, true);
    if (fromEvm) routes.push(onchainRoute(fromEvm, dest));
  }

  // Native XRP via the XRPL bridge (the right tool — not the EVM cross-chain page).
  if (dest === "XRP") {
    const fromEvm = pickFrom(heldOther, dest, true);
    if (fromEvm) routes.push(bridgeRoute(fromEvm, "XRP", false));
    else routes.push(bridgeRoute("ETH", "XRP", true));
  }

  // Swap Any Pair (Trocador) — the catch-all from any crypto you already hold.
  const fromAny = pickFrom(heldOther, dest, false);
  if (fromAny) routes.push(swapAnyRoute(fromAny, dest));

  // Nothing held and no native card rail: card-buy USDC, then swap.
  if (routes.length === 0 || (!holdsDest && !STRIPE_DIRECT.includes(dest) && !fromAny && dest !== "XRP")) {
    routes.push(cashThenSwapRoute(dest));
  }

  return routes;
}

function scoreRoute(m: Metric, p: Priority): number {
  const costScore = 5 - Math.min(m.costMid, 5); // 0..5, higher = cheaper
  const custodyScore = m.custody === "self" ? 2 : m.custody === "regulated" ? 1 : 0.7;
  const taxScore = m.taxable ? 0 : 2;
  switch (p) {
    case "cheapest":
      return costScore * 3 + m.ease * 0.3 + custodyScore * 0.4;
    case "easiest":
      return m.ease * 3 + costScore * 0.4 + custodyScore * 0.3;
    case "tax":
      return taxScore * 3 + costScore * 1 + m.ease * 0.4;
    case "private":
      return m.privacy * 3 + custodyScore * 1 + costScore * 0.3;
    case "balanced":
    default:
      return costScore * 1.4 + m.ease * 1.0 + custodyScore * 1.2 + taxScore * 0.9 + m.privacy * 0.3;
  }
}

function whyBest(m: Metric, p: Priority): string {
  switch (p) {
    case "cheapest":
      return `Lowest fees of your options (${m.costLabel}).`;
    case "easiest":
      return `Fewest steps and least friction to get there.`;
    case "tax":
      return m.taxable
        ? `The lightest tax footprint available for this coin.`
        : `Avoids selling anything you hold — no taxable gain.`;
    case "private":
      return `Exposes the least personal information.`;
    case "balanced":
    default:
      return `Best mix of low cost, ease, staying in your own custody, and tax for your situation.`;
  }
}

// ---- presentation --------------------------------------------------------

const STEP_ICON: Record<StepKind, ReactNode> = {
  buy: <CreditCard className="h-5 w-5" />,
  swap: <ArrowLeftRight className="h-5 w-5" />,
  bridge: <RouteIcon className="h-5 w-5" />,
  external: <EyeOff className="h-5 w-5" />,
  have: <CheckCircle2 className="h-5 w-5" />,
};

function easeLabel(e: number) {
  if (e >= 5) return "Very easy";
  if (e >= 4) return "Easy";
  if (e >= 3) return "Moderate";
  return "Involved";
}

function custodyLabel(c: Custody) {
  if (c === "self") return "Self-custody throughout";
  if (c === "regulated") return "Regulated on-ramp (ID needed)";
  return "Third party holds briefly";
}

function fmtUsd(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
}

function MetricBadges({ m, amount }: { m: Metric; amount: number | null }) {
  const estFee = amount && m.costMid > 0 ? fmtUsd((m.costMid / 100) * amount) : null;
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="gap-1 font-normal" data-testid="badge-metric-cost">
        <Coins className="h-3 w-3" /> {m.costLabel}
        {estFee && <span className="text-muted-foreground">(~{estFee})</span>}
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal" data-testid="badge-metric-ease">
        <Gauge className="h-3 w-3" /> {easeLabel(m.ease)}
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal" data-testid="badge-metric-tax">
        <Scale className="h-3 w-3" /> {m.taxable ? "Taxable swap" : "No taxable sale"}
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal" data-testid="badge-metric-custody">
        <ShieldCheck className="h-3 w-3" /> {custodyLabel(m.custody)}
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal" data-testid="badge-metric-speed">
        <Zap className="h-3 w-3" /> {m.speed}
      </Badge>
    </div>
  );
}

function RouteCard({
  route,
  recommended,
  why,
  amount,
}: {
  route: RouteOption;
  recommended: boolean;
  why: string;
  amount: number | null;
}) {
  return (
    <Card
      className={recommended ? "border-primary ring-1 ring-primary/30" : undefined}
      data-testid={`route-${route.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{route.rail}</CardTitle>
          {recommended ? (
            <Badge className="gap-1" data-testid={`badge-recommended-${route.id}`}>
              <Trophy className="h-3 w-3" /> Best for you
            </Badge>
          ) : (
            <Badge variant="secondary" data-testid={`badge-alt-${route.id}`}>
              Alternative
            </Badge>
          )}
        </div>
        {recommended && (
          <CardDescription data-testid={`text-why-${route.id}`}>{why}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricBadges m={route.metric} amount={amount} />

        <ol className="space-y-3" data-testid={`steps-${route.id}`}>
          {route.steps.map((step, idx) => (
            <li key={step.n}>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {STEP_ICON[step.kind]}
                  </div>
                  {idx < route.steps.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 space-y-1.5 pb-1">
                  <p className="text-sm font-semibold" data-testid={`text-step-${route.id}-${step.n}`}>
                    {step.n}. {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                  {step.note && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                      {step.note}
                    </p>
                  )}
                  <Button asChild size="sm" variant="outline" data-testid={`button-step-${route.id}-${step.n}`}>
                    <Link href={step.href}>
                      {step.toolLabel}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {(route.pros.length > 0 || route.cons.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {route.pros.length > 0 && (
              <ul className="space-y-1" data-testid={`pros-${route.id}`}>
                {route.pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {route.cons.length > 0 && (
              <ul className="space-y-1" data-testid={`cons-${route.id}`}>
                {route.cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RoutePlanner() {
  const search = useSearch();
  const initialDest = (() => {
    const to = new URLSearchParams(search).get("to")?.toUpperCase();
    return to && DESTINATIONS.some((d) => d.symbol === to) ? to : "XMR";
  })();
  const [destination, setDestination] = useState<string>(initialDest);
  const [amount, setAmount] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("balanced");

  const { data: positions, isLoading: positionsLoading } = useQuery<any[]>({
    queryKey: ["/api/positions"],
  });

  const heldSymbols = useMemo(() => {
    if (!Array.isArray(positions)) return [];
    const set = new Set<string>();
    for (const p of positions) {
      const sym = (p?.assetSymbol || p?.symbol || "").toString().toUpperCase();
      const qty = Number(p?.quantity ?? 0);
      if (sym && qty > 0) set.add(sym);
    }
    return Array.from(set);
  }, [positions]);

  const rankedRoutes = useMemo(() => {
    const routes = generateRoutes(destination, heldSymbols, address.trim());
    return [...routes].sort((a, b) => scoreRoute(b.metric, priority) - scoreRoute(a.metric, priority));
  }, [destination, heldSymbols, address, priority]);

  const amountNum = useMemo(() => {
    const n = parseFloat(amount);
    return isNaN(n) || n <= 0 ? null : n;
  }, [amount]);

  const destMeta = DESTINATIONS.find((d) => d.symbol === destination);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8" data-testid="page-route-planner">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Route Planner
          </h1>
        </div>
        <p className="text-muted-foreground">
          Tell us what you want to <span className="font-medium text-foreground">end up with</span>.
          We compare every way to get there — buying with a card, an on-chain swap, the all-pairs
          swap, or a bridge — and recommend the best one for you. You can change what “best” means.
        </p>
      </div>

      <Card data-testid="card-goal">
        <CardHeader>
          <CardTitle className="text-lg">Your goal</CardTitle>
          <CardDescription>Pick the finish line and what matters most to you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="destination">I want to end up with</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="destination" data-testid="select-destination">
                  <SelectValue placeholder="Choose a coin" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATIONS.map((d) => (
                    <SelectItem key={d.symbol} value={d.symbol} data-testid={`option-dest-${d.symbol}`}>
                      {d.symbol} — {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Pick the best by</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="priority" data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id} data-testid={`option-priority-${p.id}`}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground" data-testid="text-priority-hint">
                {PRIORITIES.find((p) => p.id === priority)?.hint}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Roughly how much (optional)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="e.g. 500 (USD value)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Your {destination} receiving address (optional)</Label>
              <Input
                id="address"
                placeholder={`Paste the ${destination} address you control`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="input-address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-holdings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" /> What you already have
          </CardTitle>
          <CardDescription>
            We start your route from these where possible, so you skip unnecessary steps and fees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positionsLoading ? (
            <p className="text-sm text-muted-foreground" data-testid="text-holdings-loading">
              Checking your holdings…
            </p>
          ) : heldSymbols.length > 0 ? (
            <div className="flex flex-wrap gap-2" data-testid="list-holdings">
              {heldSymbols.map((s) => (
                <Badge key={s} variant="secondary" data-testid={`badge-holding-${s}`}>
                  <Coins className="mr-1 h-3 w-3" />
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-holdings">
              No tracked holdings found — your route will start by buying with a card.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold" data-testid="text-plan-title">
          <RouteIcon className="h-5 w-5 text-primary" /> Your best route to {destination}
        </h2>
        <p className="text-sm text-muted-foreground">
          {rankedRoutes.length} option{rankedRoutes.length === 1 ? "" : "s"} compared. You approve and
          sign every step in your own wallet — we never move funds for you.
        </p>
      </div>

      <div className="space-y-4" data-testid="list-routes">
        {rankedRoutes.map((route, idx) => (
          <RouteCard
            key={route.id}
            route={route}
            recommended={idx === 0}
            why={whyBest(route.metric, priority)}
            amount={amountNum}
          />
        ))}
      </div>

      <Alert data-testid="alert-tax">
        <Info className="h-4 w-4" />
        <AlertTitle>About taxes on these routes</AlertTitle>
        <AlertDescription>
          Buying with a card is not a taxable event. Swapping or bridging a coin you already hold is —
          it counts as selling that coin and can create a taxable gain. Choose “Lowest tax bill” above
          and we'll favor routes that don't sell what you own.
        </AlertDescription>
      </Alert>

      {destMeta?.external && (
        <Alert data-testid="alert-privacy-boundary">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Where we stop, on purpose</AlertTitle>
          <AlertDescription>
            We plan and guide you right up to the privacy line, then hand you a curated list of
            no-KYC services for the final {destination} leg. We never hold {destination}, never mix,
            and never touch the last step — that keeps you fully in control.
          </AlertDescription>
        </Alert>
      )}

      <Alert data-testid="alert-estimate">
        <Info className="h-4 w-4" />
        <AlertTitle>A couple of honest notes</AlertTitle>
        <AlertDescription>
          Fees shown are typical ranges, not to the penny — each hop has a small fee and prices move.
          And because we never hold your keys, you approve every step yourself; the live price for each
          swap is shown inside each tool before you confirm.
        </AlertDescription>
      </Alert>
    </div>
  );
}
