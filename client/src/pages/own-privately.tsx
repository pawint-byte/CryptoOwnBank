import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SeoHead } from "@/components/seo-head";
import {
  ExternalLink,
  Shield,
  EyeOff,
  Eye,
  ArrowRightLeft,
  Users,
  Wallet,
  Lock,
  AlertTriangle,
} from "lucide-react";

interface PrivacyProvider {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  notes: string;
  url: string;
}

const SWAP_SERVICES: PrivacyProvider[] = [
  {
    id: "trocador",
    name: "Trocador",
    description:
      "Compares several no-account swap services at once and routes you to the best rate. Privacy-first and Tor-friendly. Can swap most coins into — and back out of — Monero in a single transaction, delivered straight to your own wallet.",
    bestFor: "The 'one step' option — it shops the other services for you.",
    notes: "No account. You provide the destination wallet; the coins never sit with you mid-swap.",
    url: "https://trocador.app",
  },
  {
    id: "exch",
    name: "Exch",
    description:
      "Privacy-focused, no-account swap with a stated no-logs policy. Supports Monero and the major coins.",
    bestFor: "Privacy-maximalists who want minimal record-keeping.",
    notes: "No account. Delivers directly to the wallet address you enter.",
    url: "https://exch.cx",
  },
  {
    id: "changenow",
    name: "ChangeNOW",
    description:
      "No-account swaps across hundreds of coins, including Monero. Standard swaps need no sign-up.",
    bestFor: "Wide coin selection in one place.",
    notes: "Their risk system may pause or refund a trade it flags — that's the trade-off of a hosted swapper.",
    url: "https://changenow.io",
  },
  {
    id: "simpleswap",
    name: "SimpleSwap",
    description:
      "No-account instant swaps supporting Monero and many other coins, delivered to your wallet.",
    bestFor: "A simple, no-frills swapper.",
    notes: "No account required for standard swaps.",
    url: "https://simpleswap.io",
  },
];

const P2P_VENUES: PrivacyProvider[] = [
  {
    id: "haveno",
    name: "Haveno",
    description:
      "Decentralized, peer-to-peer Monero exchange with no central operator. Trade cash or other methods directly with another person for XMR.",
    bestFor: "The strongest no-ID entry for Monero.",
    notes: "Desktop. No company in the middle — you trade peer to peer.",
    url: "https://haveno.exchange",
  },
  {
    id: "bisq",
    name: "Bisq",
    description:
      "Decentralized peer-to-peer Bitcoin exchange. Buy BTC with cash or bank transfer through multisig escrow — no accounts, no KYC.",
    bestFor: "Buying Bitcoin with cash, privately.",
    notes: "Desktop app. Escrow is non-custodial multisig, not a company holding funds.",
    url: "https://bisq.network",
  },
  {
    id: "hodlhodl",
    name: "Hodl Hodl",
    description:
      "Global peer-to-peer Bitcoin marketplace with non-custodial multisig escrow. No KYC.",
    bestFor: "P2P Bitcoin in the browser, no download.",
    notes: "Web-based. The platform never holds your coins.",
    url: "https://hodlhodl.com",
  },
  {
    id: "robosats",
    name: "RoboSats",
    description:
      "Private peer-to-peer Bitcoin over the Lightning Network. No accounts, Tor-based, fast for smaller trades.",
    bestFor: "Quick, private, smaller Bitcoin buys.",
    notes: "Generates a throwaway identity per trade.",
    url: "https://robosats.com",
  },
];

const WALLETS: PrivacyProvider[] = [
  {
    id: "cake",
    name: "Cake Wallet",
    description:
      "Open-source wallet for Monero, Bitcoin and more, on mobile and desktop. A friendly home for your private coins, with swaps built in.",
    bestFor: "Most people — easy and cross-platform.",
    notes: "Open source. Your keys stay on your device.",
    url: "https://cakewallet.com",
  },
  {
    id: "feather",
    name: "Feather Wallet",
    description:
      "Lightweight, open-source Monero desktop wallet. Fast and privacy-respecting.",
    bestFor: "Desktop Monero users who want something lean.",
    notes: "Desktop. Optional Tor and your-own-node support.",
    url: "https://featherwallet.org",
  },
  {
    id: "monerogui",
    name: "Monero GUI",
    description:
      "The official Monero wallet from the core project. Maximum control, with the option to run your own node.",
    bestFor: "Maximum control and self-reliance.",
    notes: "Desktop. Straight from the source.",
    url: "https://getmonero.org/downloads",
  },
];

function ProviderCard({ p }: { p: PrivacyProvider }) {
  return (
    <Card key={p.id} data-testid={`card-provider-${p.id}`} className="flex flex-col">
      <CardHeader>
        <CardTitle data-testid={`text-provider-name-${p.id}`}>{p.name}</CardTitle>
        <CardDescription>{p.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-2 text-sm flex-1">
          <div>
            <span className="text-muted-foreground">Best for: </span>
            <span data-testid={`text-bestfor-${p.id}`}>{p.bestFor}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Note: </span>
            <span>{p.notes}</span>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="mt-4 w-full"
          data-testid={`button-visit-${p.id}`}
        >
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            Visit {p.name}
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function OwnPrivately() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SeoHead
        title="Own It Privately — Acquire Crypto Without It Tying Back to You | CryptoOwnBank"
        description="An honest, non-custodial guide to acquiring and holding crypto privately — no-KYC swaps, peer-to-peer cash venues, and Monero, the only coin private by design. CryptoOwnBank never holds your funds."
      />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <EyeOff className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Own It Privately
          </h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          The goal: own something of value and have it not tie back to you. This is a curated
          map of the honest ways to do that — using independent third-party services you deal
          with directly. <strong>CryptoOwnBank never holds your coins, never swaps them for you,
          and never runs a mixer.</strong> We point you to the right road; your own wallet holds
          the value the whole way.
        </p>
      </div>

      <Alert className="mb-8 border-amber-500/40 bg-amber-500/5" data-testid="alert-disclaimer">
        <Shield className="h-4 w-4" />
        <AlertTitle>Read this first — the honest truth</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p>
            <strong>Privacy depends on the coin, not just the path.</strong> Monero (XMR) is
            private by design. Bitcoin, XRP and most others run on public ledgers — they're
            traceable, never invisible.
          </p>
          <p>
            <strong>The first hop is where your name attaches.</strong> Any card, bank, or
            ID-verified exchange ties the coins to you, permanently. The only entries that don't:
            cash peer-to-peer, or earning crypto for goods and work — into your own wallet.
          </p>
          <p>
            <strong>"Doesn't tie back" is a discipline, not a switch.</strong> One reused address
            or one cash-out to a verified exchange can re-link the trail. These tools give you the
            cleanest roads; no one can promise anonymity.
          </p>
          <p>
            You are responsible for following the laws in your country. These services are operated
            by independent third parties; CryptoOwnBank receives no commission from this list.
          </p>
        </AlertDescription>
      </Alert>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3" data-testid="text-section-spectrum">
          How private is each coin?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5" data-testid="card-spectrum-private">
            <CardHeader>
              <div className="flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg">Private by design — Monero (XMR)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Balances and transfers are hidden at the protocol level. Once your value is in
              Monero, the on-chain trail goes dark — by the blockchain's own math, not by a
              company you have to trust. No method is ever perfect, but this is as close to a real
              "cleanroom" as exists, precisely because no operator runs it.
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5" data-testid="card-spectrum-public">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">Public ledgers — BTC, XRP, most coins</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Every transaction is permanently visible to everyone. These are pseudonymous, not
              private. The best you get is "not named on it" — and even that breaks if a coin ever
              touches something linked to you. Hold them privately only with real care.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2" data-testid="text-section-howitworks">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          The "one step," done honestly
        </h2>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground space-y-3">
            <p>
              Bring a coin you already hold → a no-KYC swap service turns it into{" "}
              <strong>Monero</strong> (the real cleanroom) in one shot, delivered to{" "}
              <strong>your own Monero wallet</strong> → if you want to send it onward as something
              else, one more no-KYC swap out. Cleanest of all: swap to Monero and simply stay there.
            </p>
            <div className="flex items-start gap-2 rounded-md border border-border p-3">
              <Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p>
                The swap service briefly holds the in-flight coins for the few minutes the swap
                takes — that's just how a hosted swap works, and each service's policies vary by
                country. <strong>CryptoOwnBank never holds a cent and never runs the swap.</strong>{" "}
                We only point you to the service; the swap happens directly between you and that
                third party, with your own wallet as both the start and the end point.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <p>
                The coin you start with is still visible on its public chain up to the moment you
                swap it, and if you exit back into a public coin like BTC or XRP, that exit becomes
                visible again. The truly private part is the Monero middle.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2" data-testid="text-section-swaps">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          No-KYC swap services
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Swap a coin you already hold into Monero (or back out), delivered to your own wallet — no
          account required.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SWAP_SERVICES.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2" data-testid="text-section-p2p">
          <Users className="h-5 w-5 text-primary" />
          Peer-to-peer (start from cash)
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          The fiat entries that don't require ID: buy directly from another person with cash, into
          your own wallet.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {P2P_VENUES.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2" data-testid="text-section-wallets">
          <Wallet className="h-5 w-5 text-primary" />
          A private wallet to call home
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Where your private coins live. Your keys, your device — no one else can see inside.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WALLETS.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
