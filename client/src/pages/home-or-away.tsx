import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SeoHead } from "@/components/seo-head";
import { Link } from "wouter";
import {
  Home,
  Plane,
  DoorClosed,
  Search,
  ArrowRight,
  ShieldCheck,
  Wallet,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Coins,
  Clock,
  Receipt,
} from "lucide-react";

interface Coin {
  symbol: string;
  name: string;
  network: string;
  coldWallets: string;
  needsMemo?: boolean;
}

const COINS: Coin[] = [
  { symbol: "XRP", name: "XRP", network: "XRP Ledger", coldWallets: "Ledger, Tangem, or Xaman with a Ledger", needsMemo: true },
  { symbol: "XLM", name: "Stellar Lumens", network: "Stellar", coldWallets: "Ledger", needsMemo: true },
  { symbol: "RLUSD", name: "Ripple USD", network: "XRP Ledger (also issued on Ethereum)", coldWallets: "Ledger, or Xaman with a Ledger", needsMemo: true },
  { symbol: "BTC", name: "Bitcoin", network: "Bitcoin", coldWallets: "Ledger, Trezor, Coldcard, or Arculus" },
  { symbol: "ETH", name: "Ethereum", network: "Ethereum", coldWallets: "Ledger, Trezor, or Arculus" },
  { symbol: "USDC", name: "USD Coin", network: "Ethereum, Base, Polygon, Solana, or Stellar", coldWallets: "Ledger or Arculus (match the network)" },
  { symbol: "SOL", name: "Solana", network: "Solana", coldWallets: "Ledger" },
  { symbol: "ADA", name: "Cardano", network: "Cardano", coldWallets: "Ledger or Arculus" },
  { symbol: "ATOM", name: "Cosmos", network: "Cosmos", coldWallets: "Ledger", needsMemo: true },
  { symbol: "DOT", name: "Polkadot", network: "Polkadot", coldWallets: "Ledger" },
  { symbol: "AVAX", name: "Avalanche", network: "Avalanche", coldWallets: "Ledger or Arculus" },
  { symbol: "MATIC", name: "Polygon", network: "Polygon", coldWallets: "Ledger or Arculus" },
  { symbol: "BNB", name: "BNB", network: "BNB Smart Chain", coldWallets: "Ledger or Arculus" },
  { symbol: "TRX", name: "Tron", network: "Tron", coldWallets: "Ledger" },
  { symbol: "DOGE", name: "Dogecoin", network: "Dogecoin", coldWallets: "Ledger or Trezor" },
  { symbol: "LTC", name: "Litecoin", network: "Litecoin", coldWallets: "Ledger or Trezor" },
  { symbol: "HBAR", name: "Hedera", network: "Hedera", coldWallets: "Ledger" },
  { symbol: "ALGO", name: "Algorand", network: "Algorand", coldWallets: "Ledger" },
  { symbol: "CRO", name: "Cronos", network: "Cronos", coldWallets: "Ledger" },
  { symbol: "FLR", name: "Flare", network: "Flare", coldWallets: "Ledger" },
  { symbol: "XMR", name: "Monero", network: "Monero", coldWallets: "Ledger (Monero app), or a Monero wallet like Cake or Feather" },
];

type Answer = "unknown" | "yes" | "no";

export default function HomeOrAway() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Coin | null>(null);
  const [other, setOther] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState<Answer>("unknown");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COINS;
    return COINS.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [query]);

  function pick(c: Coin) {
    setSelected(c);
    setOther(false);
    setCanWithdraw("unknown");
  }
  function pickOther() {
    setSelected(null);
    setOther(true);
    setCanWithdraw("unknown");
  }
  function reset() {
    setSelected(null);
    setOther(false);
    setQuery("");
    setCanWithdraw("unknown");
  }

  const coinLabel = selected ? `${selected.name} (${selected.symbol})` : "your coin";
  const hasPick = selected !== null || other;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <SeoHead
        title="Home or Away — Rescue a Delisted Coin Without Losing It | CryptoOwnBank"
        description="An exchange is delisting a coin you own? You don't have to lose it. This non-custodial guide shows you how to take it Home to your own cold wallet — or, if the exchange won't let you, how to get the value out safely. CryptoOwnBank never holds your coins."
      />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Home or Away
          </h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          An exchange is delisting a coin you own and telling you to "move it or lose it"?
          Take a breath — <strong>you don't have to lose it.</strong> This walks you through getting
          it to safety, step by step. <strong>CryptoOwnBank never holds your coins</strong> — we just
          show you the way; your own wallet holds the value the whole time.
        </p>
      </div>

      {/* The big idea: three outcomes */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card className="border-emerald-500/40 bg-emerald-500/5" data-testid="card-outcome-home">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold">🏠 Home</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              The exchange lets you withdraw the coin. You send it to a wallet <em>you</em> control —
              and no exchange can ever touch it again. <strong>Always possible if they allow withdrawals.</strong>
            </p>
          </CardContent>
        </Card>
        <Card className="border-sky-500/40 bg-sky-500/5" data-testid="card-outcome-away">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-5 w-5 text-sky-500" />
              <h3 className="font-semibold">✈️ Away</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              They <em>won't</em> let you withdraw this exact coin. So you swap it into one you
              <strong> can</strong> pull out (like USDC, ETH or BTC), then bring that home. You keep
              the <strong>value</strong>.
            </p>
          </CardContent>
        </Card>
        <Card className="border-muted bg-muted/30" data-testid="card-outcome-empty">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <DoorClosed className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">The empty room</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              A coin with no buyer left anywhere. It can still come <em>home</em> to your wallet, but
              there may be no one to sell it to. Honest truth: no app can conjure a buyer.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deadline warning — the part that bites */}
      <Alert className="mb-8 border-amber-500/50 bg-amber-500/10" data-testid="alert-deadline">
        <Clock className="h-4 w-4" />
        <AlertTitle>Watch the deadline — it's the part that bites</AlertTitle>
        <AlertDescription className="mt-1 space-y-2 text-muted-foreground">
          <p>
            A delisting email comes with a <strong>hard deadline</strong> ("sell or withdraw before
            [date]"). If you do nothing, most exchanges don't freeze your coin — they{" "}
            <strong>auto-convert it to cash or USDC at that day's market price</strong>. So you keep
            the <em>value</em>, but you lose the choice of <em>when</em> and <em>what</em> to sell
            into, and you're stuck with whatever the price happens to be that day.
          </p>
          <p>
            <strong>Act a few days before the date, not on it.</strong> If the deadline has already
            passed, don't panic — open your exchange account and look: your coin was most likely
            turned into cash or USDC already, and <em>that</em> you can still bring home.
          </p>
        </AlertDescription>
      </Alert>

      {/* Step 1: pick the coin */}
      <Card className="mb-6" data-testid="card-pick-coin">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Coins className="h-5 w-5 text-primary" />
            Step 1 — Which coin is being delisted?
          </CardTitle>
          <CardDescription>
            Pick it below so the steps match its blockchain. Don't see it? Choose "My coin isn't
            listed" and the general steps still apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a coin (e.g. XRP, Bitcoin)"
              className="pl-9"
              data-testid="input-coin-search"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filtered.map((c) => (
              <Button
                key={c.symbol}
                size="sm"
                variant={selected?.symbol === c.symbol ? "default" : "outline"}
                onClick={() => pick(c)}
                data-testid={`button-coin-${c.symbol}`}
              >
                {c.symbol}
                <span className="ml-1 hidden text-xs opacity-70 sm:inline">{c.name}</span>
              </Button>
            ))}
            <Button
              size="sm"
              variant={other ? "default" : "outline"}
              onClick={pickOther}
              data-testid="button-coin-other"
            >
              My coin isn't listed
            </Button>
          </div>
          {selected && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm" data-testid="text-coin-network">
              <strong>{selected.name}</strong> lives on the <strong>{selected.network}</strong> network.
              A good home for it: <strong>{selected.coldWallets}</strong>.
              {selected.needsMemo && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400">
                  ⚠️ This coin can use a <strong>Memo / Destination Tag</strong>. Only add one if the place
                  you're sending to shows it — your own basic wallet usually needs none, but an exchange
                  almost always does. A missing or wrong tag <em>where one is required</em> can lose the coins.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: the deciding question */}
      {hasPick && (
        <Card className="mb-6" data-testid="card-question">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="h-5 w-5 text-primary" />
              Step 2 — Does the exchange let you withdraw {coinLabel} to an outside wallet?
            </CardTitle>
            <CardDescription>
              Look for a <strong>Send</strong>, <strong>Withdraw</strong>, or "send to a crypto
              address" option for this coin. Some platforms (like older eToro) only let you
              <em> swap or sell</em> — not withdraw. That's the thing to check.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant={canWithdraw === "yes" ? "default" : "outline"}
              onClick={() => setCanWithdraw("yes")}
              data-testid="button-withdraw-yes"
            >
              Yes — I can withdraw it
            </Button>
            <Button
              variant={canWithdraw === "no" ? "default" : "outline"}
              onClick={() => setCanWithdraw("no")}
              data-testid="button-withdraw-no"
            >
              No — they only let me swap/sell
            </Button>
            <Button
              variant={canWithdraw === "unknown" ? "secondary" : "outline"}
              onClick={() => setCanWithdraw("unknown")}
              data-testid="button-withdraw-unsure"
            >
              Not sure
            </Button>
          </CardContent>
        </Card>
      )}

      {/* HOME path */}
      {hasPick && canWithdraw === "yes" && (
        <Card className="mb-6 border-emerald-500/40 bg-emerald-500/5" data-testid="card-home-path">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Home className="h-5 w-5 text-emerald-500" />
              Take it Home 🏠
            </CardTitle>
            <CardDescription>
              Great — this is the clean path. You'll move {coinLabel} into a wallet you control, and
              it's yours for good.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              {
                t: "Have a wallet that supports its network.",
                d: (
                  <>
                    {selected
                      ? `${selected.name} needs a wallet that supports the ${selected.network} network — ${selected.coldWallets}.`
                      : "You need a wallet that supports your coin's blockchain — a cold wallet like Ledger or Arculus is safest."}{" "}
                    Don't have one yet? <Link href="/wallet/create" className="text-primary underline">Create a wallet</Link> or see your <Link href="/wallets" className="text-primary underline">saved wallets</Link>.
                  </>
                ),
              },
              {
                t: "Copy the receive address — on the right network.",
                d: "In your wallet, open the coin, tap Receive, and copy the address. Double-check the network matches (e.g. send on the same chain the coin lives on). Picking the wrong network is the #1 way people lose coins.",
              },
              {
                t: "Withdraw from the exchange to that address.",
                d: (
                  <>
                    On the exchange, choose Withdraw / Send for this coin, paste your receive address
                    {selected?.needsMemo && <> (plus a <strong>Memo / Destination Tag</strong> only if your wallet shows one — most personal wallets don't)</>}, and confirm.
                    Send a <strong>small test amount first</strong> if you can, confirm it lands, then send the rest.
                  </>
                ),
              },
              {
                t: "Keep a little of the network's coin for fees.",
                d: "To ever move it out again, you pay a tiny fee in the network's own coin (for example, BNB on BNB Smart Chain, ETH on Ethereum). Keep a small amount handy.",
              },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3" data-testid={`home-step-${i + 1}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{s.t}</p>
                  <p className="text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
            <Alert className="border-emerald-500/40 bg-emerald-500/10" data-testid="alert-home-done">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>That's it — it's home for good.</AlertTitle>
              <AlertDescription>
                No exchange can ever tell you to "move it or lose it" again. Optional: add the wallet
                address in <Link href="/wallets" className="text-primary underline">My Wallets</Link> so it shows in your portfolio — we only watch the public info, never hold it.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* AWAY path */}
      {hasPick && canWithdraw === "no" && (
        <Card className="mb-6 border-sky-500/40 bg-sky-500/5" data-testid="card-away-path">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Plane className="h-5 w-5 text-sky-500" />
              Go Away ✈️ — get the value out
            </CardTitle>
            <CardDescription>
              This is the walled-garden case: they won't release {coinLabel} itself. So you rescue the
              <strong> value</strong> instead of the exact ticker.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This is normal, not a failure. Custodial platforms (Uphold, eToro and friends) often
              let you <em>trade or sell</em> a small coin but never <em>send it out</em> on its own
              blockchain. So you rescue the value first, then bring <strong>that</strong> home.
            </p>
            {[
              {
                t: "Swap it (inside the exchange) into a coin you CAN withdraw.",
                d: "On the exchange, swap or sell your coin into something they let you take out — usually USDC, USDT, ETH or BTC. You're trading the locked coin for a free one.",
              },
              {
                t: "Now bring that coin home.",
                d: (
                  <>
                    Withdraw that withdrawable coin to your own wallet, exactly like the Home steps. Need
                    a wallet? <Link href="/wallet/create" className="text-primary underline">Create one here</Link>.
                  </>
                ),
              },
              {
                t: "Optional — convert back later, on your terms.",
                d: (
                  <>
                    Once it's in your wallet, you can swap it toward whatever you actually want using
                    {" "}<Link href="/ownbank/cross-chain" className="text-primary underline">Cross-Chain Swap</Link> or{" "}
                    <Link href="/ownbank/evm-swap" className="text-primary underline">EVM Swap</Link> — no exchange needed, no one holding it for you.
                  </>
                ),
              },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3" data-testid={`away-step-${i + 1}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{s.t}</p>
                  <p className="text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
            <Alert className="border-amber-500/50 bg-amber-500/10" data-testid="alert-away-lastresort">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>If they won't even let you swap to a withdrawable coin</AlertTitle>
              <AlertDescription>
                Last resort: sell it to cash inside the exchange and move the cash to your bank, then
                buy what you want from your own wallet via <Link href="/buy-crypto" className="text-primary underline">Buy Crypto</Link>. Not ideal — but it beats being locked in.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive" data-testid="alert-fully-locked">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>"I can't transfer it AND I can't swap or sell it"</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  If every button is greyed out, the deadline has usually already passed and the
                  exchange has switched the coin off. Here's the honest part: the exchange normally
                  does <strong>not</strong> keep your money — it <strong>force-converts the coin into
                  cash or USDC at that day's price</strong> and drops it into your account. The coin
                  is gone, but the value comes back as something you <em>can</em> move.
                </p>
                <p className="font-semibold">What to do now:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Check your cash / USDC balance on the exchange — the converted money may be there already, or arrive within a few days.</li>
                  <li>Once it shows up, withdraw it home: USDC to your own wallet, or cash to your bank.</li>
                  <li>If nothing appears, message the exchange's support and ask when the delisted coin gets converted, and into what.</li>
                  <li>It became a real sale at a loss — record it so it can cut your taxes (see the note below).</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2" data-testid="text-tax-note">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Silver lining: a loss can cut your taxes.</p>
                <p className="text-muted-foreground">
                  If a delisted coin is far below what you paid, selling it locks in a{" "}
                  <em>real loss</em> that can offset gains elsewhere. Make sure the sale gets
                  recorded, then see <Link href="/tax-harvest" className="text-primary underline">Tax Savings (Harvest)</Link>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NOT SURE */}
      {hasPick && canWithdraw === "unknown" && (
        <Card className="mb-6" data-testid="card-unsure">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="h-5 w-5 text-primary" />
              How to check in 30 seconds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              On the exchange, find {coinLabel} and look for a <strong>Send</strong>,{" "}
              <strong>Withdraw</strong>, or "send to a crypto address" button.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>If you can enter an outside wallet address and a network → that's a <strong>Yes</strong>, take it <strong>Home</strong>.</li>
              <li>If the only options are "Sell" or "Convert/Swap" (no address field) → that's a <strong>No</strong>, go <strong>Away</strong>.</li>
            </ul>
            <p>Then pick your answer above and I'll show the exact steps.</p>
          </CardContent>
        </Card>
      )}

      {/* Honest note: home vs buyer */}
      <Card className="mb-6 border-primary/30 bg-primary/5" data-testid="card-honest-note">
        <CardHeader>
          <CardTitle className="text-lg">The one honest thing to know</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>A home and a buyer are two different things.</strong> Getting a coin into your own
            wallet (a home) is almost always possible. Being able to <em>sell</em> it later needs a
            live market — someone on the other side of the trade.
          </p>
          <p>
            For healthy coins, that market lives <strong>on the blockchain itself</strong>, so no
            single exchange can strand you. XRP is the classic example — when exchanges dropped it,
            it kept trading on the XRP Ledger's own built-in exchange. You can reach those on-chain
            markets here:{" "}
            <Link href="/ownbank/dex" className="text-primary underline">XRPL DEX</Link>,{" "}
            <Link href="/stellar/dex" className="text-primary underline">Stellar DEX</Link>,{" "}
            <Link href="/ownbank/evm-swap" className="text-primary underline">EVM Swap</Link>, and{" "}
            <Link href="/ownbank/cross-chain" className="text-primary underline">Cross-Chain Swap</Link>.
          </p>
          <p>
            Only a truly dead coin — no buyer anywhere — can't be sold. Even then, it still comes home
            and stays yours.
          </p>
        </CardContent>
      </Card>

      {/* Cold wallet pointer */}
      <Card className="mb-2" data-testid="card-coldwallet">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">No wallet yet? That's the real fix.</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              The reason any of this happens is leaving coins on someone else's platform. A cold
              wallet you own is the permanent home no one can evict you from. We'll help you set one up.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" data-testid="button-chain-guide">
              <Link href="/chain-guide">Which wallet?</Link>
            </Button>
            <Button asChild className="gap-2" data-testid="button-create-wallet">
              <Link href="/wallet/create">
                Create a wallet
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasPick && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={reset} data-testid="button-start-over">
            Start over
          </Button>
        </div>
      )}
    </div>
  );
}
