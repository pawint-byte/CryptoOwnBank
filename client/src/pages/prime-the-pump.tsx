import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Wallet,
  Droplets,
  ArrowLeftRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Coins,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

type StepProps = {
  n: number;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  optional?: boolean;
};

function Step({ n, title, children, actions, optional }: StepProps) {
  return (
    <div className="flex gap-3" data-testid={`step-${n}`}>
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {n}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-tight">{title}</h3>
          {optional && (
            <Badge variant="secondary" className="text-[10px]">Optional</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>
    </div>
  );
}

export default function PrimeThePump() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8" data-testid="page-prime-the-pump">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Prime the Pump
          </h1>
        </div>
        <p className="text-muted-foreground">
          Your starter playbook — from zero to <span className="font-medium text-foreground">in play</span>.
          The goal is simple: get real coins into a wallet only <span className="font-medium text-foreground">you</span> control,
          then turn them into what you actually want. You are your own bank the whole way — we never hold your money.
        </p>
      </div>

      {/* The 3 moves */}
      <Card data-testid="card-overview">
        <CardHeader>
          <CardTitle className="text-lg">The three moves</CardTitle>
          <CardDescription>That's the whole game. Everything below is just these three.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5" data-testid="move-wallet">
            <Wallet className="h-5 w-5 text-primary" />
            <p className="font-medium text-sm">1. Get a wallet</p>
            <p className="text-xs text-muted-foreground">A free app where only you hold the keys.</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5" data-testid="move-prime">
            <Droplets className="h-5 w-5 text-primary" />
            <p className="font-medium text-sm">2. Prime the pump</p>
            <p className="text-xs text-muted-foreground">Get your first coins in — by card or swap.</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5" data-testid="move-play">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            <p className="font-medium text-sm">3. Put them in play</p>
            <p className="text-xs text-muted-foreground">Swap into your target and set up stablecoins.</p>
          </div>
        </CardContent>
      </Card>

      {/* Decision tree — where are you starting from? */}
      <Card data-testid="card-decision-tree">
        <CardHeader>
          <CardTitle className="text-lg">Where are you starting from?</CardTitle>
          <CardDescription>Pick the line that sounds like you — it points to the right playbook below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="rounded-lg border p-3" data-testid="branch-zero">
            <p className="font-medium text-sm">"I'm starting from zero."</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick one entry wallet below and buy your first coin inside it. Two easy on-ramps:{" "}
              <span className="font-medium text-foreground">Xaman</span> (start with XRP or RLUSD) or{" "}
              <span className="font-medium text-foreground">LOBSTR</span> (start with XLM on Stellar). Both are
              wallets only you control — no exchange account needed. Prefer to start in dollars? Buy{" "}
              <span className="font-medium text-foreground">USDC</span> with MoonPay or Transak (reliable across
              the U.S.) into your own wallet, then swap.
            </p>
          </div>
          <div className="rounded-lg border p-3" data-testid="branch-have-ledger">
            <p className="font-medium text-sm">"I already hold XRP, RLUSD, or XLM."</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You're already in play. Skip to swapping — route into EVM coins, Bitcoin, or Monero.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-branch-route-evm">
                <Link href="/route-planner?to=ETH">
                  <ArrowLeftRight className="h-4 w-4" /> Route into EVM / BTC
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-branch-route-xmr">
                <Link href="/own-privately">
                  <ArrowLeftRight className="h-4 w-4" /> Route into Monero
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border p-3" data-testid="branch-have-usdc">
            <p className="font-medium text-sm">"I already have USDC or ETH somewhere else."</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Perfect — those are the universal bridge coins. Send them to a wallet you control, then plug them
              into the same routing logic to reach anything.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-branch-plug-in">
                <Link href="/route-planner?from=USDC">
                  <ArrowLeftRight className="h-4 w-4" /> Plan a swap from USDC
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Region-block honesty */}
      <Alert data-testid="alert-region-block">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Card site says "not supported in your region"? You're not doing anything wrong.</AlertTitle>
        <AlertDescription className="space-y-1.5 text-sm">
          <p>
            That message comes from the card company (like MoonPay), not from us — it's their own country/state rule.
            Two things that usually get you through:
          </p>
          <p>
            • <span className="font-medium text-foreground">Turn off any VPN.</span> A VPN is the most common reason a
            supported area still gets blocked.
          </p>
          <p>
            • <span className="font-medium text-foreground">Buy inside the wallet app instead of a website.</span> The
            buy button built into Xaman (for XRP) and LOBSTR (for XLM) often works even when the website blocks you,
            because it uses a different payment path. That's why the playbooks below start there.
          </p>
        </AlertDescription>
      </Alert>

      {/* Rail A — XRP Ledger */}
      <Card className="border-[#00A4E4]/30" data-testid="card-rail-xrpl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#00A4E4]" />
            XRP Ledger rail — get XRP & RLUSD in play
          </CardTitle>
          <CardDescription>
            The fastest sure-fire start. XRP is the native coin (no setup), and RLUSD is the dollar-stable coin that
            lives on the same ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Step
            n={1}
            title="Get Xaman — your free XRP wallet"
            actions={
              <Button asChild size="sm" className="gap-2" data-testid="button-xrpl-wallet">
                <Link href="/buy-crypto?coin=XRP">
                  <Smartphone className="h-4 w-4" /> Set up Xaman
                </Link>
              </Button>
            }
          >
            <p>
              Xaman is a free phone app where only you hold the keys. Install it and connect — we'll fill your XRP
              address in for you, no copy-paste.
            </p>
          </Step>

          <Step
            n={2}
            title="Prime the pump — get XRP in"
            actions={
              <>
                <Button asChild size="sm" className="gap-2 bg-[#00A4E4] hover:bg-[#0090cc] text-white" data-testid="button-xrpl-buy">
                  <Link href="/buy-crypto?coin=XRP">
                    <CreditCard className="h-4 w-4" /> Buy XRP in Xaman
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-xrpl-swap">
                  <Link href="/route-planner?to=XRP&from=USDC">
                    <ArrowLeftRight className="h-4 w-4" /> Already have USDC? Swap to XRP
                  </Link>
                </Button>
              </>
            }
          >
            <p>
              Buy XRP with a card <span className="font-medium text-foreground">right inside Xaman</span> — its in-app buy
              often works when websites get blocked. Getting XRP in also "activates" your ledger account so it can hold
              other coins.
            </p>
            <p className="text-xs">
              Keep a little XRP in there (about 2 XRP) — the network holds a tiny reserve for fees and for any extra coins
              you add next.
            </p>
          </Step>

          <Step
            n={3}
            title="Add RLUSD (the dollar-stable coin)"
            optional
            actions={
              <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-rlusd-trustline">
                <Link href="/ownbank/tokens">
                  <ShieldCheck className="h-4 w-4" /> Set up RLUSD
                </Link>
              </Button>
            }
          >
            <p>
              Want a steady dollar coin too? In the Token Manager, tap <span className="font-medium text-foreground">Add
              Trustline</span> for RLUSD (one approval in Xaman), then trade a bit of your XRP into RLUSD.
            </p>
            <p className="text-xs">
              This is step 3 on purpose: it needs a little XRP already in your wallet first to cover the tiny network
              reserve (~0.2 XRP).
            </p>
          </Step>

          <div className="flex items-center gap-2 text-sm text-green-600 pt-1" data-testid="text-xrpl-done">
            <CheckCircle2 className="h-4 w-4" /> You're in play on the XRP Ledger.
          </div>
        </CardContent>
      </Card>

      {/* Rail B — Stellar */}
      <Card className="border-[#7B61FF]/30" data-testid="card-rail-stellar">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#7B61FF]" />
            Stellar rail — get XLM (and USDC) in play
          </CardTitle>
          <CardDescription>
            Stellar is built for cheap global payments. XLM is its native coin; you can also hold USDC on Stellar once
            your wallet is set up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Step
            n={1}
            title="Get a Stellar wallet — LOBSTR or Freighter"
            actions={
              <Button asChild size="sm" className="gap-2" data-testid="button-stellar-wallet">
                <Link href="/buy-crypto?coin=XLM">
                  <Smartphone className="h-4 w-4" /> Set up a Stellar wallet
                </Link>
              </Button>
            }
          >
            <p>
              LOBSTR is the easiest (free phone app with a built-in card buy). Freighter is a browser wallet if you
              prefer your computer. Either way, only you hold the keys.
            </p>
          </Step>

          <Step
            n={2}
            title="Prime the pump — get XLM in"
            actions={
              <>
                <Button asChild size="sm" className="gap-2 bg-[#7B61FF] hover:bg-[#6a52e0] text-white" data-testid="button-stellar-buy">
                  <Link href="/buy-crypto?coin=XLM">
                    <CreditCard className="h-4 w-4" /> Buy XLM in LOBSTR
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-stellar-swap">
                  <Link href="/route-planner?to=XLM&from=USDC">
                    <ArrowLeftRight className="h-4 w-4" /> Already have USDC? Swap to XLM
                  </Link>
                </Button>
              </>
            }
          >
            <p>
              Buy XLM with a card <span className="font-medium text-foreground">inside LOBSTR</span> — like Xaman, its
              in-app buy often gets through when websites block you. Getting XLM in activates your Stellar account.
            </p>
            <p className="text-xs">
              <span className="font-medium text-foreground">Prefer to start in dollars?</span> The most reliable way to
              buy <span className="font-medium text-foreground">USDC</span> in the U.S. is with{" "}
              <span className="font-medium text-foreground">MoonPay or Transak</span> (by card or bank), landing in your
              own wallet — they're licensed across most states. LOBSTR's in-app USDC buy works in many countries too, but
              some U.S. states still block it. Either way, swap a little into XLM afterward to cover fees.
            </p>
            <p className="text-xs">
              Keep about 1–2 XLM in there for the network's small reserve, plus a little extra for each new coin you add.
            </p>
          </Step>

          <Step
            n={3}
            title="Add USDC on Stellar (or other assets)"
            optional
            actions={
              <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-stellar-trustline">
                <Link href="/stellar/tokens">
                  <ShieldCheck className="h-4 w-4" /> Add a Stellar trustline
                </Link>
              </Button>
            }
          >
            <p>
              To hold USDC (or other coins) on Stellar, add a <span className="font-medium text-foreground">trustline</span> for
              it once — a one-time approval. After that the coin can land in your wallet anytime.
            </p>
            <p className="text-xs">
              Each trustline locks a tiny 0.5 XLM reserve (you get it back if you ever remove the trustline) — that's why
              XLM comes first.
            </p>
          </Step>

          <div className="flex items-center gap-2 text-sm text-green-600 pt-1" data-testid="text-stellar-done">
            <CheckCircle2 className="h-4 w-4" /> You're in play on Stellar.
          </div>
        </CardContent>
      </Card>

      {/* USDC bridge option */}
      <Card data-testid="card-usdc-bridge">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            Or prime with USDC, the universal bridge
          </CardTitle>
          <CardDescription>
            Prefer to start with a steady dollar coin? Buy USDC into your own wallet, then swap it into anything —
            XRP, XLM, RLUSD, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-2" data-testid="button-buy-usdc">
              <Link href="/buy-crypto?coin=USDC">
                <CreditCard className="h-4 w-4" /> Buy USDC (card or bank)
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-plan-swap">
              <Link href="/route-planner">
                <ArrowLeftRight className="h-4 w-4" /> Plan a swap
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            USDC was never the finish line — it's just the bridge. The Buy USDC screen leads with{" "}
            <span className="font-medium text-foreground">MoonPay or Transak</span> (card or bank), which are licensed
            across most U.S. states and land the USDC straight in your own wallet. A few states are still blocked — if
            yours is, the screen shows other ways too. Either way it lands in a wallet only you control, then you swap
            straight into your target.
          </p>
        </CardContent>
      </Card>

      {/* Route anywhere */}
      <Card data-testid="card-route-anywhere">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            From here to anywhere
          </CardTitle>
          <CardDescription>
            Once you hold XRP, RLUSD, XLM, or USDC in your own wallet, that's your launchpad. Route it into whatever
            you actually want — the planner picks the cheapest honest path, and a no-account swap (Trocador) is the
            escape hatch for coins we can't reach in-app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-anywhere-evm">
              <Link href="/route-planner?to=ETH">
                <ArrowRight className="h-4 w-4" /> EVM coins (ETH, USDC…)
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-anywhere-btc">
              <Link href="/route-planner?to=BTC">
                <ArrowRight className="h-4 w-4" /> Bitcoin
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-anywhere-xmr">
              <Link href="/own-privately">
                <ArrowRight className="h-4 w-4" /> Monero (private)
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2" data-testid="button-anywhere-plan">
              <Link href="/route-planner">
                <ArrowLeftRight className="h-4 w-4" /> Plan any other coin
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* You're in play */}
      <Card className="border-green-500/20 bg-green-500/5" data-testid="card-in-play">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            You're in play — now grow it
          </CardTitle>
          <CardDescription>Coins in your own wallet? Here's where to go next.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline" className="justify-between gap-2" data-testid="link-track">
            <Link href="/">
              Track everything <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between gap-2" data-testid="link-yield">
            <Link href="/ownbank/vaults">
              Earn yield <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between gap-2" data-testid="link-plan">
            <Link href="/route-planner">
              Plan any swap <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
