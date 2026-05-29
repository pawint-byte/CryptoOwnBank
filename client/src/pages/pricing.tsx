import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Bitcoin,
  HelpCircle,
  Wallet,
  HeartHandshake,
} from "lucide-react";
import {
  freeTierFeatures,
  premiumFeatures,
  annualBonusFeatures,
  proFeatures,
  legacyTiers,
} from "@/lib/pricing-data";
import { LegacyCheckout } from "@/components/legacy-checkout";

export default function Pricing() {
  const { user } = useAuth();
  const ctaHref = user ? "/settings" : "/signup";
  const ctaLabel = user ? "Upgrade in Settings" : "Start Free";

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Pricing — CryptoOwnBank | Non-custodial crypto plans"
        description="Simple pricing for self-custody. Free forever for the basics, Premium for the full cockpit (DEX, swaps, DCA, alerts), Pro for businesses and high-value portfolios. 10% off with crypto. Legacy Plan inheritance available separately."
        path="/pricing"
      />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3"
              data-testid="link-home-from-pricing"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A4E4]">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold">CryptoOwnBank</span>
            </Link>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p
              className="text-sm font-medium tracking-wide uppercase text-[#00A4E4] mb-3"
              data-testid="eyebrow-pricing"
            >
              Pricing
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              data-testid="heading-pricing"
            >
              Simple pricing for self-custody
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We don't take a cut of your money — we never touch it. We charge for the
              tools that make holding your own crypto practical: trading, swaps, DCA,
              alerts, tax reports, and inheritance.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <Badge variant="outline" className="gap-1.5 py-1 px-3">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Non-custodial — your keys, your coins
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1 px-3">
                <Bitcoin className="h-3.5 w-3.5 text-amber-600" />
                10% off when you pay with crypto
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card data-testid="card-plan-free">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-1">Free Forever</h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Enough to see whether CryptoOwnBank is right for you. No credit card.
                </p>
                <ul className="space-y-3 mb-6">
                  {freeTierFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={user ? "/" : "/signup"}>
                  <Button
                    className="w-full"
                    variant="outline"
                    data-testid="button-plan-free"
                  >
                    {user ? "You're on Free" : "Start Free"}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card
              className="relative overflow-hidden border-[#00A4E4] border-2 shadow-lg"
              data-testid="card-plan-premium"
            >
              <div className="absolute top-0 left-0 right-0 bg-[#00A4E4] text-white text-center text-xs font-medium py-1">
                Most Popular
              </div>
              <CardContent className="p-6 pt-8">
                <h2 className="text-xl font-bold mb-1">Premium</h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-[#00A4E4] font-medium mb-4">
                  or $199/yr — Save $149 ·{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    10% off with crypto
                  </span>
                </p>
                <ul className="space-y-3 mb-4">
                  {premiumFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-amber-200 dark:border-amber-800 pt-3 mb-4">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                    Annual plan bonus
                  </p>
                  <ul className="space-y-2">
                    {annualBonusFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={ctaHref}>
                  <Button
                    className="w-full bg-[#00A4E4] hover:bg-[#0090c9]"
                    data-testid="button-plan-premium"
                  >
                    {user ? ctaLabel : "Go Premium"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card
              className="relative overflow-hidden border-purple-500 border-2"
              data-testid="card-plan-pro"
            >
              <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white text-center text-xs font-medium py-1">
                Business & High-Value
              </div>
              <CardContent className="p-6 pt-8">
                <h2 className="text-xl font-bold mb-1">Pro</h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-4">
                  or $799/yr — Save $389 ·{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    10% off with crypto
                  </span>
                </p>
                <ul className="space-y-3 mb-6">
                  {proFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={ctaHref}>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    data-testid="button-plan-pro"
                  >
                    {user ? ctaLabel : "Go Pro"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Legacy Plan */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-2">
                <HeartHandshake className="h-5 w-5 text-pink-600" />
                <h2 className="text-2xl font-bold" data-testid="heading-legacy-plan">
                  Legacy Plan — crypto inheritance
                </h2>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Separate from Premium/Pro. A non-custodial dead-man switch with split
                delivery: if you stop checking in, encrypted shares are released to the
                family members you nominated. Three mutually exclusive plans — pick one.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {legacyTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={
                    tier.highlight
                      ? "border-pink-500 border-2 shadow-lg"
                      : "border-border"
                  }
                  data-testid={`card-legacy-${tier.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-1">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground text-sm">
                        {tier.cadence}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{tier.blurb}</p>
                    <LegacyCheckout tier={tier} isAuthed={!!user} />
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Pro members get <strong>Member for Life</strong> included free. Crypto
              payments get 10% off (15% on Bitcoin, Ethereum, Solana, XRP, and RLUSD).
            </p>
          </div>

          {/* Why we charge for tools, not assets */}
          <Card
            className="border-[#00A4E4]/30 bg-[#00A4E4]/5 mb-12"
            data-testid="card-pricing-philosophy"
          >
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#00A4E4]" />
                Why we charge a flat fee — not a cut of your assets
              </h2>
              <p className="text-sm leading-relaxed mb-3">
                Exchanges and custodial wallets take a percentage of every trade and
                often hold your funds. We don't, and we can't — your keys live on your
                device only. That means we have to charge for the software directly,
                not skim from your portfolio.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The upside for you: as your portfolio grows, our fee stays the same.
                $29/month is $29/month whether you hold $1,000 or $10,000,000.
              </p>
            </CardContent>
          </Card>

          {/* FAQ shortcut */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Questions about billing, refunds, or what's included in each tier?
            </p>
            <Link href="/faq">
              <Button variant="outline" data-testid="button-pricing-faq">
                <HelpCircle className="mr-2 h-4 w-4" />
                Read the Pricing FAQ
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
