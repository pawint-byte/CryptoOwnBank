import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import {
  Wallet,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  MessageSquareWarning,
  Users,
  Globe2,
  AlertTriangle,
  Heart,
} from "lucide-react";

const promises = [
  {
    icon: KeyRound,
    title: "You hold your own money.",
    body: "We never touch it. We don't have it to freeze, lose, or hand over.",
  },
  {
    icon: ShieldCheck,
    title: "We don't decide who you can send to.",
    body: "That's between you and the person on the other side.",
  },
  {
    icon: MessageSquareWarning,
    title: "We tell you the truth.",
    body: "Some kinds of money — like Bitcoin held in your own wallet — can't be frozen overnight or pulled back by the company that issued them. Other kinds (like certain stablecoins) can be. We'll show you which is which so you choose with eyes open.",
  },
  {
    icon: Users,
    title: "Your family is part of this.",
    body: "We help you set things up so the people you love aren't locked out if something happens to you. You can split the secret words between trusted family — no one person can touch everything alone, but together they can help each other.",
  },
  {
    icon: Globe2,
    title: "It works where you are.",
    body: "Smartphone, flip phone, or no phone at all — we're building paths to all of them. You don't need perfect English. Some days you don't even need internet.",
  },
];

const audience = [
  "the schoolteacher in Buenos Aires watching her salary buy less rice every Friday.",
  "the dad in Houston sending money home so his mom doesn't have to wait in line at Western Union.",
  "the widow who shouldn't have to learn twenty new things in the worst week of her life.",
  "the auntie in the village with a flip phone who deserves the same tools as the trader on Wall Street.",
  "every family that just wants a fair shot when the rules keep changing.",
];

export default function Principles() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Our Principles — CryptoOwnBank"
        description="Money that works for all of us. Non-custodial. No gatekeeping. We tell you the truth. Your family is part of this. It works where you are. Welcome in — we saved you a seat at the table."
        path="/principles"
      />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-3" data-testid="link-home-from-principles">
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
          <div className="text-center mb-12">
            <p className="text-sm font-medium tracking-wide uppercase text-[#00A4E4] mb-3" data-testid="eyebrow-principles">
              Our Principles
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6" data-testid="heading-principles">
              Money That Works for All of Us
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-intro">
              We built this because money shouldn't pick sides.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed mt-4 max-w-2xl mx-auto">
              It shouldn't care what country you're from, what your government says this year,
              or whether you have a smartphone or a $20 flip phone. A dollar, a naira, a peso,
              a real, a satoshi &mdash; they should be worth the same in your hand as they are
              in mine. That's what money is supposed to be.
            </p>
            <p className="text-base font-medium mt-6">So here's what we promise:</p>
          </div>

          <div className="grid gap-4 mb-12">
            {promises.map((p, i) => {
              const Icon = p.icon;
              return (
                <Card key={i} data-testid={`card-promise-${i}`}>
                  <CardContent className="p-6 flex gap-4 items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{p.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 mb-12" data-testid="card-honest-part">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">And here's the honest part.</h3>
                <p className="text-sm leading-relaxed">
                  If you lose the secret words and your family doesn't have the pieces, the
                  money is gone. Nobody can recover it for you &mdash; not even us. That's the
                  trade for nobody being able to take it from you. We'll help you set this up
                  so it doesn't happen.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="border-t border-b py-10 my-12">
            <p className="text-base leading-relaxed text-muted-foreground" data-testid="text-history">
              People have always built their own money systems when the official one shut them
              out &mdash; <em>susu</em> circles in West Africa and the Caribbean, <em>tanda</em>{" "}
              groups in Mexico, <em>hui</em> in China, mutual aid societies in Black communities
              after Reconstruction, mattress money in every immigrant home everywhere. None of
              these are backward. They're what people do when the system isn't built for them.
              We're building the next version of that &mdash; same idea, modern tools, your
              family included.
            </p>
          </div>

          <div className="mb-12" data-testid="section-dedication">
            <p className="text-base font-medium mb-6">This is for&hellip;</p>
            <ul className="space-y-3 text-base leading-relaxed text-muted-foreground">
              {audience.map((line, i) => (
                <li key={i} className="flex gap-3" data-testid={`text-audience-${i}`}>
                  <Heart className="flex-shrink-0 h-4 w-4 text-[#00A4E4] mt-1.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center bg-[#00A4E4]/5 border border-[#00A4E4]/20 rounded-lg p-8 mb-8">
            <p className="text-2xl font-bold mb-3" data-testid="text-welcome">
              Welcome in. We saved you a seat at the table.
            </p>
            <p className="text-sm text-muted-foreground italic">&mdash; The CryptoOwnBank team</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-[#00A4E4] hover:bg-[#00A4E4]/90 text-white" data-testid="button-join-from-principles">
                Pull up a chair &mdash; create a free account
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
