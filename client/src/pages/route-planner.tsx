import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Switch } from "@/components/ui/switch";
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
  Coins,
} from "lucide-react";

type DestOption = {
  symbol: string;
  name: string;
  external?: boolean;
};

const DESTINATIONS: DestOption[] = [
  { symbol: "XMR", name: "Monero (private — handled outside us)", external: true },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDC", name: "USD Coin (USDC)" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XLM", name: "Stellar Lumens" },
  { symbol: "XRP", name: "XRP" },
];

const STRIPE_DIRECT = ["USDC", "ETH", "BTC", "SOL", "XLM", "POL", "AVAX"];
const EXTERNAL_PRIVACY = ["XMR", "ZEC"];

const TOOL = {
  buy: "/buy-crypto",
  bridge: "/ownbank/xrpl-bridge",
  external: "/own-privately",
  wallets: "/wallets",
};

const EVM_ASSETS = ["ETH", "USDC", "USDT", "DAI", "WBTC", "POL", "AVAX", "BNB"];

type StepKind = "buy" | "bridge" | "external" | "have";

type PlanStep = {
  n: number;
  kind: StepKind;
  title: string;
  detail: string;
  toolLabel: string;
  href: string;
  note?: string;
};

function buyStep(n: number, coin: string): PlanStep {
  return {
    n,
    kind: "buy",
    title: `Buy ${coin} with your card`,
    detail: `Use the card on-ramp to buy ${coin}. It lands straight in your own wallet — we never hold it.`,
    toolLabel: "Open Buy Crypto",
    href: TOOL.buy,
    note: "Pay with a card via your choice of provider (Stripe, Changelly, and others). The crypto is delivered straight to your address.",
  };
}

function haveStep(n: number, coin: string): PlanStep {
  return {
    n,
    kind: "have",
    title: `You already hold ${coin}`,
    detail: `You already own ${coin} — nothing to buy or swap. You're done.`,
    toolLabel: "View your wallets",
    href: TOOL.wallets,
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
    note: `Powered by Squid Router / Axelar. Heads up: a bridge is a swap, so it's a taxable disposal of your ${from}. Multi-step (not instant) and takes a few minutes.`,
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
    note: `${dest} is private by design — no aggregator we use touches it and we never custody it. We get you to ${from}; the final private leg is done by a third party you choose. (Swapping ${from} → ${dest} is a taxable disposal of your ${from}.)`,
  };
}

function buildPlan(dest: string, held: string[], address: string, preferBuy: boolean) {
  const has = (s: string) => held.includes(s);
  const useHeld = (s: string) => has(s) && !preferBuy;
  const steps: PlanStep[] = [];
  let n = 1;

  // Already at the destination — done, UNLESS the member would rather buy fresh
  // (e.g. to avoid a taxable swap/disposal of an appreciated holding).
  if (has(dest) && !preferBuy) {
    steps.push(haveStep(n++, dest));
    return steps;
  }

  // Privacy coins (e.g. XMR): get native BTC, then hand off to a no-KYC swap.
  // We only buy BTC with a card here — our in-app swap tools are EVM-only and
  // cannot produce native BTC, so we never link a step a tool can't actually do.
  if (EXTERNAL_PRIVACY.includes(dest)) {
    if (!useHeld("BTC")) {
      steps.push(buyStep(n++, "BTC"));
    }
    steps.push(externalStep(n++, "BTC", dest, address));
    return steps;
  }

  // Native XRP: bridge from an EVM asset via the XRPL Bridge (Squid/Axelar).
  // There's no card rail straight to XRP, so a swap/bridge is unavoidable —
  // buying fresh first keeps the taxable gain on that bridge near zero.
  if (dest === "XRP") {
    const fromEvm = held.find((s) => EVM_ASSETS.includes(s));
    if (fromEvm && !preferBuy) {
      steps.push(bridgeStep(n++, has("ETH") ? "ETH" : fromEvm, "XRP"));
    } else {
      steps.push(buyStep(n++, "USDC"));
      steps.push(bridgeStep(n++, "USDC", "XRP"));
    }
    return steps;
  }

  // Card-buyable majors (USDC/ETH/BTC/SOL/XLM/POL/AVAX): buy directly.
  if (STRIPE_DIRECT.includes(dest)) {
    steps.push(buyStep(n++, dest));
    return steps;
  }

  // Anything else we don't yet have an in-app road for: start with a card buy.
  steps.push(buyStep(n++, "USDC"));
  return steps;
}

const STEP_ICON: Record<StepKind, ReactNode> = {
  buy: <CreditCard className="h-5 w-5" />,
  bridge: <ArrowLeftRight className="h-5 w-5" />,
  external: <EyeOff className="h-5 w-5" />,
  have: <CheckCircle2 className="h-5 w-5" />,
};

export default function RoutePlanner() {
  const [destination, setDestination] = useState<string>("XMR");
  const [amount, setAmount] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [preferBuy, setPreferBuy] = useState<boolean>(false);

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

  const plan = useMemo(
    () => buildPlan(destination, heldSymbols, address.trim(), preferBuy),
    [destination, heldSymbols, address, preferBuy],
  );

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
          We work backward from what you already have (or can buy with a card) and lay out the
          steps to get there.
        </p>
      </div>

      <Card data-testid="card-goal">
        <CardHeader>
          <CardTitle className="text-lg">Your goal</CardTitle>
          <CardDescription>Pick the finish line and your receiving address.</CardDescription>
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
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="prefer-buy" className="cursor-pointer">
                Buy fresh instead of swapping what I own
              </Label>
              <p className="text-xs text-muted-foreground">
                Swapping a coin you already hold counts as selling it, which can create a taxable
                gain. Turn this on to buy with a card instead — even if you already own something we
                could have swapped.
              </p>
            </div>
            <Switch
              id="prefer-buy"
              checked={preferBuy}
              onCheckedChange={setPreferBuy}
              data-testid="switch-prefer-buy"
            />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-holdings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" /> What you already have
          </CardTitle>
          <CardDescription>
            We start your route from these where possible, so you skip unnecessary steps.
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

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold" data-testid="text-plan-title">
          <RouteIcon className="h-5 w-5 text-primary" /> Your route to {destination}
        </h2>
        <p className="text-sm text-muted-foreground">
          {plan.length} step{plan.length === 1 ? "" : "s"}. You approve and sign each one in your own
          wallet — we never move funds for you.
        </p>
      </div>

      <Alert data-testid="alert-tax">
        <Info className="h-4 w-4" />
        <AlertTitle>About taxes on these steps</AlertTitle>
        <AlertDescription>
          Buying with a card is not a taxable event. Swapping or bridging a coin you already hold
          is — it counts as selling that coin and can create a taxable gain. If you'd rather not
          trigger that, turn on “Buy fresh instead of swapping what I own” above and we'll route you
          through a card buy where possible.
        </AlertDescription>
      </Alert>

      <ol className="space-y-3" data-testid="list-steps">
        {plan.map((step, idx) => (
          <li key={step.n} data-testid={`step-${step.n}`}>
            <Card>
              <CardContent className="flex gap-4 p-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {STEP_ICON[step.kind]}
                  </div>
                  {idx < plan.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold" data-testid={`text-step-title-${step.n}`}>
                        {step.n}. {step.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{step.detail}</p>
                    </div>
                    {step.kind === "external" && (
                      <Badge variant="outline" className="shrink-0" data-testid={`badge-external-${step.n}`}>
                        Outside us
                      </Badge>
                    )}
                  </div>
                  {step.note && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                      {step.note}
                    </p>
                  )}
                  <Button asChild size="sm" variant="outline" data-testid={`button-step-${step.n}`}>
                    <Link href={step.href}>
                      {step.toolLabel}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      {destMeta?.external && (
        <Alert data-testid="alert-privacy-boundary">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Where we stop, on purpose</AlertTitle>
          <AlertDescription>
            We plan and guide you right up to the privacy line, then hand you a curated list of
            no-KYC services for the final {destination} leg. We never hold {destination}, never
            mix, and never touch the last step — that keeps you fully in control.
          </AlertDescription>
        </Alert>
      )}

      <Alert data-testid="alert-estimate">
        <Info className="h-4 w-4" />
        <AlertTitle>A couple of honest notes</AlertTitle>
        <AlertDescription>
          Amounts work out to a close estimate, not to the penny — each hop has a small fee and
          price movement. And because we never hold your keys, you approve every step yourself; the
          live price for each swap is shown inside each tool before you confirm.
        </AlertDescription>
      </Alert>
    </div>
  );
}
