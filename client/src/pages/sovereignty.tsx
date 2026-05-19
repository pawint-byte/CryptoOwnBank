import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import {
  Wallet,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CircleOff,
  Printer,
  RefreshCw,
  Github,
  Globe2,
  HeartHandshake,
  Sparkles,
} from "lucide-react";

const universalKeyChains = [
  {
    chain: "Bitcoin",
    seedLength: "12 or 24 words (BIP39 standard)",
    wallets: "Sparrow, Electrum, BlueWallet, Cake Wallet, Trezor Suite, Ledger Live, and any other BIP39-compliant wallet — today or 30 years from now.",
  },
  {
    chain: "XRPL",
    seedLength: "Family seed starting with 's...' (the canonical XRPL key format). Some wallets also accept a BIP39-style mnemonic.",
    wallets: "Xaman, Crossmark, Bifrost, GemWallet, and the open-source xrpl.js library that anyone can run themselves.",
  },
  {
    chain: "Stellar",
    seedLength: "Secret key starting with 'S...' — works in every Stellar wallet. Many wallets also support a 24-word mnemonic under the SEP-0005 spec.",
    wallets: "LOBSTR, Freighter, Solar, Vibrant, StellarTerm. The 'S...' key is portable across all of them.",
  },
  {
    chain: "Ethereum & EVM chains",
    seedLength: "12 or 24 words (BIP39 + BIP44 derivation)",
    wallets: "MetaMask, Rabby, Frame, Trust Wallet, Ledger Live, Trezor Suite, Safe.",
  },
  {
    chain: "Monero",
    seedLength: "25-word seed (Monero's own format — not BIP39)",
    wallets: "Cake Wallet, Feather, MyMonero, and the official Monero CLI maintained by the open-source community.",
  },
];

const wontProtect = [
  {
    title: "Exchanges",
    body: "Coinbase, Kraken, Binance, and the rest hold your assets in their custody. You have an account, not a key. If the exchange fails — like FTX, Celsius, Voyager, and BlockFi did — you become a creditor in their bankruptcy. Your seed phrase doesn't exist for funds held there.",
  },
  {
    title: "Custodial wallet products that look non-custodial",
    body: "Some apps that call themselves wallets quietly hold the keys for you in their cloud. Wallet of Satoshi is one famous example. If the company disappears, the funds disappear with them. When in doubt, ask: 'If this app shut down tomorrow, could I still get to my money?' If the honest answer is no, it's custodial.",
  },
  {
    title: "Custodial yield platforms",
    body: "If you handed your crypto to a company so they could 'stake it for you' or 'lend it out for you,' you're trusting their solvency. The seed phrase model doesn't apply. Stay non-custodial whenever you can.",
  },
];

const storage = [
  {
    title: "Paper (good enough for now)",
    body: "Write the words on paper, in pencil or pen that won't fade. Two copies. Two locations. Never the same drawer as your phone or laptop.",
  },
  {
    title: "Metal (best for the long term)",
    body: "A metal seed plate (Cryptotag, Billfodl, Cobo Tablet, Steelwallet) survives fire, flood, and decades. Worth the $30-80 for any meaningful amount.",
  },
  {
    title: "Split among family (Legacy Plan)",
    body: "Our Legacy Plan splits your seed into multiple SLIP-39 shares. No single person can access the funds alone, but together your chosen people can. Survives the loss of any one share, any one device, any one person.",
  },
  {
    title: "What to avoid",
    body: "Screenshots in your phone gallery. Notes apps that sync to the cloud. Emailing it to yourself. Storing it in a password manager you depend on a company to access. Photos in iCloud or Google Drive. These are convenient and they're how people lose money.",
  },
];

export default function Sovereignty() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Sovereignty — Be Your Own Bank | CryptoOwnBank"
        description="Your assets live on the blockchain, not in any company. As long as you have your seed phrase, you can always get to them — no matter which wallet, exchange, or company comes and goes. Here's how to make that real."
        path="/sovereignty"
      />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-3" data-testid="link-home-from-sovereignty">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A4E4]">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold">CryptoOwnBank</span>
            </a>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a href="/">
                <Button variant="outline" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <p className="text-sm font-medium tracking-wide uppercase text-[#00A4E4] mb-3" data-testid="eyebrow-sovereignty">
              Sovereignty
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6" data-testid="heading-sovereignty">
              Be Your Own Bank — Now and Forever
            </h1>
            <p className="text-lg leading-relaxed" data-testid="text-hero">
              We don't know which day this will matter to you. It might be the day a wallet
              disappears. It might be the day you need to hand everything to family. It might
              be the day you simply want to prove to yourself that you truly own your assets.
            </p>
            <p className="text-lg leading-relaxed mt-4 font-medium">
              We built this so it's here the moment you need it &mdash; for whatever reason
              that day comes.
            </p>
            <p className="text-base text-muted-foreground mt-4">
              Take it. Print it. Keep it safe.
            </p>
          </div>

          {/* The promise */}
          <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5 mb-12" data-testid="card-promise">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/15 text-[#00A4E4] flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-2">The promise the blockchain makes you.</h3>
                <p className="text-sm leading-relaxed">
                  Your assets don't live in our app. They don't live in your wallet app. They
                  don't live on your phone or your hardware device. They live on the blockchain
                  itself &mdash; a public network nobody owns and nobody can shut down. As long as
                  that network is running and you have your seed phrase, you can get to your
                  assets. With our app, without our app, with any wallet, with no wallet at all.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How it actually works */}
          <h2 className="text-2xl font-bold mb-4" data-testid="heading-how-it-works">
            How this actually works
          </h2>
          <div className="grid gap-4 mb-12">
            <Card data-testid="card-mechanic-1">
              <CardContent className="p-6 flex gap-4 items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">Your seed phrase is the universal key.</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The 12, 24, or 25 words your wallet gave you when you set it up are not
                    just a backup &mdash; they ARE your wallet. The app on your phone is just an
                    interface. The hardware device is just a safer interface. The words can
                    rebuild your wallet in any compatible app, on any device, anywhere in the
                    world, at any time in the future.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-mechanic-2">
              <CardContent className="p-6 flex gap-4 items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">The standards are open and won't disappear.</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Wallets use open, published specifications for representing your key
                    &mdash; like BIP39 for most Bitcoin and Ethereum wallets, SEP-0005 for
                    most Stellar wallets, and Monero's own 25-word format. The XRPL family
                    seed is documented in the open-source xrpl.js library. These specs are
                    written down, implemented by many independent projects, and translated
                    into many languages. If every wallet company on earth shut down tomorrow,
                    the specs would still be public, and someone could write a new wallet
                    from the math alone. Your key is not trapped inside any single app.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-mechanic-3">
              <CardContent className="p-6 flex gap-4 items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">The blockchain runs without permission.</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Bitcoin, XRPL, Stellar, Ethereum, and the chains we support are kept
                    running by thousands of independent computers all over the world. No
                    government, company, or single person can switch them off. As long as a
                    few of those computers stay online &mdash; and they always have &mdash;
                    your transactions can be sent and your balances can be read.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Universal key table */}
          <h2 className="text-2xl font-bold mb-2" data-testid="heading-universal-key">
            Your seed phrase works with all of these
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            For each chain we support, here's what your key looks like and which wallets it works
            with. You are not locked in to any one of them &mdash; switch anytime, use several,
            or use a wallet we've never heard of, as long as it follows the open standard.
          </p>
          <div className="grid gap-3 mb-12">
            {universalKeyChains.map((c, i) => (
              <Card key={i} data-testid={`card-chain-${i}`}>
                <CardContent className="p-4">
                  <p className="font-semibold text-sm mb-1">{c.chain}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">Key format:</span> {c.seedLength}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Works with:</span> {c.wallets}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* What seed phrase does NOT protect */}
          <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 mb-4" data-testid="card-honest-distinction">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-2">The honest distinction nobody tells you clearly.</h3>
                <p className="text-sm leading-relaxed">
                  Everything we just said is true for <em>self-custody</em> wallets &mdash;
                  the ones where you hold the seed phrase yourself. There's another category
                  that looks similar but doesn't get the same protection, and people lose
                  money every year because they don't know the difference.
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-3 mb-12">
            {wontProtect.map((w, i) => (
              <Card key={i} className="border-amber-500/20" data-testid={`card-wont-protect-${i}`}>
                <CardContent className="p-5 flex gap-3 items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <CircleOff className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">{w.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{w.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Storage */}
          <h2 className="text-2xl font-bold mb-2" data-testid="heading-storage">
            How to keep your seed phrase safe
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The seed phrase is the only thing that matters. If it survives, your assets survive.
            If it doesn't, nobody &mdash; not us, not any company, not any court &mdash; can
            recover them for you. That's the trade for nobody being able to take them from you.
          </p>
          <div className="grid gap-3 mb-12">
            {storage.map((s, i) => (
              <Card key={i} data-testid={`card-storage-${i}`}>
                <CardContent className="p-5">
                  <p className="font-semibold text-sm mb-1">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* The drill */}
          <Card className="border-[#00A4E4]/30 mb-12" data-testid="card-drill">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-2">Prove it to yourself once a year.</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Once a year, do a sovereignty drill. Get a different device. Install a
                  different wallet from the lists above. Enter your seed phrase. Confirm you
                  see your balance. Then delete that wallet and put the device away.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The point isn't to move money. The point is to know &mdash; really know, in
                  your hands, not just in theory &mdash; that you can get to your assets
                  without us, without your usual wallet, without any specific company. After
                  the second or third drill, the fear of being locked out goes away. Pass that
                  feeling on to whoever inherits this.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What if CryptoOwnBank disappears */}
          <Card className="mb-12" data-testid="card-if-we-disappear">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                <Github className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-2">If we disappear, your assets are unaffected.</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  We never hold your funds or your keys. If CryptoOwnBank shut down tomorrow,
                  every asset you track on this dashboard would still be on the blockchain,
                  controlled by your seed phrase, accessible from any wallet that supports the
                  chain.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We also publish our code under the <strong>AGPL-3.0 license</strong>. Anyone
                  can clone, fork, and self-host the entire CryptoOwnBank dashboard from the
                  source. The convenience features &mdash; the portfolio view, Legacy Plan,
                  reports, vaults integration &mdash; can survive us being gone, because the
                  code is yours too.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Closing — Be Your Own Bank */}
          <div className="text-center bg-[#00A4E4]/5 border border-[#00A4E4]/20 rounded-lg p-8 mb-8" data-testid="section-closing">
            <p className="text-2xl font-bold mb-3">
              You are your own bank. Now and forever.
            </p>
            <p className="text-sm text-muted-foreground italic max-w-xl mx-auto leading-relaxed">
              We don't need to be here for your assets to be safe. We're here so that the
              everyday parts &mdash; tracking what you own, paying your family, earning yield,
              preparing for the day you can't manage it yourself &mdash; are easier. The
              sovereignty was always yours. We just make it practical.
            </p>
          </div>

          {/* Action row */}
          <div className="grid gap-3 sm:grid-cols-2 mb-8">
            <a href="/sovereignty-kit" data-testid="link-sovereignty-kit">
              <Button size="lg" className="w-full justify-start gap-3 h-auto py-4 bg-[#00A4E4] hover:bg-[#00A4E4]/90 text-white">
                <Printer className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Download your Recovery Kit</p>
                  <p className="text-xs font-normal opacity-90">Printable, per-chain restore guide. Sign in if you haven't.</p>
                </div>
              </Button>
            </a>
            <a href="/legacy-plan" data-testid="link-legacy-plan">
              <Button size="lg" variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <HeartHandshake className="h-5 w-5 flex-shrink-0 text-[#00A4E4]" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Set up Legacy Plan</p>
                  <p className="text-xs text-muted-foreground font-normal">Split your seed phrase across trusted family.</p>
                </div>
              </Button>
            </a>
            <a href="/legacy-plan/learn-slip39" data-testid="link-learn-slip39">
              <Button size="lg" variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <Building2 className="h-5 w-5 flex-shrink-0 text-[#00A4E4]" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Learn how SLIP-39 works</p>
                  <p className="text-xs text-muted-foreground font-normal">The math behind splitting a seed phrase safely.</p>
                </div>
              </Button>
            </a>
            <a href="/principles" data-testid="link-principles">
              <Button size="lg" variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-[#00A4E4]" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Our Principles</p>
                  <p className="text-xs text-muted-foreground font-normal">The three promises this is all built on.</p>
                </div>
              </Button>
            </a>
            <a href="/chain-guide" data-testid="link-chain-guide">
              <Button size="lg" variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <Globe2 className="h-5 w-5 flex-shrink-0 text-[#00A4E4]" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Compare wallets and chains</p>
                  <p className="text-xs text-muted-foreground font-normal">Pick wallets that don't lock you in.</p>
                </div>
              </Button>
            </a>
          </div>

          {/* Print hint */}
          <div className="text-center text-xs text-muted-foreground mb-6 flex items-center justify-center gap-2">
            <Printer className="h-3.5 w-3.5" />
            <span>Print this page and keep it with your seed phrase. We update it as wallets come and go.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-[#00A4E4] hover:bg-[#00A4E4]/90 text-white" data-testid="button-join-from-sovereignty">
                Create a free account
              </Button>
            </a>
            <a href="/">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-back-home-bottom">
                Back to home
              </Button>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
