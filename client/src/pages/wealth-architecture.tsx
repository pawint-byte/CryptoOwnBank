import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  Wallet,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Info,
  Circle,
  CircleDot,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  STAGES,
  STAGE_STATUS_LABELS,
  loadStageStatuses as loadStatuses,
  saveStageStatuses as saveStatuses,
  type StageStatus,
} from "@/lib/wealth-stages";

function statusIcon(status: StageStatus | undefined) {
  if (status === "done_in_cob" || status === "handled_outside") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  }
  if (status === "in_progress") {
    return <CircleDot className="h-5 w-5 text-amber-500" />;
  }
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

export default function WealthArchitecture() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, StageStatus>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStatuses(loadStatuses(user?.id));
    setHydrated(true);
  }, [user?.id]);

  const updateStatus = (stageId: string, status: StageStatus) => {
    const next = { ...statuses, [stageId]: status };
    setStatuses(next);
    saveStatuses(user?.id, next);
  };

  const completedCount = STAGES.filter((s) => {
    const st = statuses[s.id];
    return st === "done_in_cob" || st === "handled_outside";
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Wealth Architecture — The Six Stages | CryptoOwnBank"
        description="The same architecture wealthy families use to hold and pass crypto across decades — buy, borrow, don't sell, pass the seat. Pre-packaged for anyone, in six stages. Use the parts you want."
        path="/sovereignty/wealth-architecture"
      />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3"
              data-testid="link-home-from-architecture"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A4E4]">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold">CryptoOwnBank</span>
            </Link>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/sovereignty">
                <Button variant="outline" size="sm" data-testid="button-back-sovereignty">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Sovereignty
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <p
              className="text-sm font-medium tracking-wide uppercase text-[#00A4E4] mb-3"
              data-testid="eyebrow-architecture"
            >
              Wealth Architecture
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
              data-testid="heading-architecture"
            >
              The Six Stages
            </h1>
            <p className="text-lg leading-relaxed" data-testid="text-hero-pitch">
              The same architecture wealthy families use to hold and pass crypto
              across decades — <strong>buy, borrow, don't sell, pass the seat.</strong>{" "}
              Pre-packaged for anyone, in six stages. Use the parts you want.
              The map stays visible regardless.
            </p>
            <p className="text-base text-muted-foreground mt-6">
              No nudges. No badges. No emails. The honest map is enough — what
              you do with it is yours.
            </p>
          </div>

          {/* Thesis essay */}
          <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5 mb-12" data-testid="card-thesis">
            <CardContent className="p-6 sm:p-8">
              <div className="flex gap-3 items-start mb-4">
                <Sparkles className="h-5 w-5 text-[#00A4E4] mt-1 flex-shrink-0" />
                <h2 className="text-xl font-bold">The thesis in one paragraph</h2>
              </div>
              <p className="text-sm leading-relaxed mb-3">
                Selling is the event that triggers most tax consequences. Holding
                does not. Transferring between your own wallets does not.
                Borrowing against your holdings does not. Passing the seat to a
                successor at the end of your time does not — and your successor
                typically gets a fresh basis on the day they take the seat,
                meaning the embedded gains often clear without anyone ever
                paying tax on them.
              </p>
              <p className="text-sm leading-relaxed mb-3">
                This is not a loophole. It's the operating model multi-generational
                wealth has used in traditional assets for a century, often
                summarized as <strong>buy, borrow, die</strong>. Crypto in
                self-custody is the first asset class in history where a regular
                household can run the same architecture without needing a
                private bank, a trust attorney on retainer, or an institutional
                custodian to broker any of it.
              </p>
              <p className="text-sm leading-relaxed">
                The six stages below are that architecture, broken into the
                pieces you can actually do something about. You don't have to do
                them in order. You don't have to do all of them. You don't have
                to do any of them. They're here so the full picture is visible
                — so when you pick a stage to work on, you're picking it on
                purpose, not by accident.
              </p>
            </CardContent>
          </Card>

          {/* Progress strip — quiet, no pressure */}
          {hydrated && (
            <div
              className="flex items-center gap-3 mb-8 p-4 rounded-md border border-border bg-card"
              data-testid="strip-progress"
            >
              <div className="flex-shrink-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Your architecture
                </p>
                <p className="text-sm font-medium" data-testid="text-progress-count">
                  {completedCount} of {STAGES.length} stages marked active
                </p>
              </div>
              <div className="flex-1 flex gap-1 ml-4">
                {STAGES.map((s) => {
                  const st = statuses[s.id];
                  const active = st === "done_in_cob" || st === "handled_outside";
                  const inProgress = st === "in_progress";
                  return (
                    <div
                      key={s.id}
                      className={`flex-1 h-2 rounded-full ${
                        active
                          ? "bg-emerald-500"
                          : inProgress
                            ? "bg-amber-500"
                            : "bg-muted"
                      }`}
                      title={`Stage ${s.number}: ${s.name}`}
                      data-testid={`progress-bar-${s.id}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Stages */}
          <div className="space-y-6 mb-12">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              const currentStatus = statuses[stage.id] ?? "not_started";
              return (
                <Card key={stage.id} data-testid={`card-stage-${stage.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Stage {stage.number}
                          </Badge>
                          {statusIcon(currentStatus)}
                        </div>
                        <h3 className="text-xl font-bold" data-testid={`heading-stage-${stage.id}`}>
                          {stage.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {stage.oneLiner}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 ml-0 sm:ml-16">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Why it matters
                        </p>
                        <p className="text-sm leading-relaxed">{stage.why}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          How to do it
                        </p>
                        <p className="text-sm leading-relaxed">{stage.how}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          What it costs
                        </p>
                        <p className="text-sm leading-relaxed">{stage.costs}</p>
                      </div>

                      {stage.cobFeatures.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Where this lives in CryptoOwnBank
                          </p>
                          {user ? (
                            <div className="flex flex-wrap gap-2">
                              {stage.cobFeatures.map((f) => (
                                <Link key={f.href} href={f.href}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    data-testid={`link-feature-${stage.id}-${f.href.replace(/\//g, "-")}`}
                                  >
                                    {f.label}
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Button>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {stage.cobFeatures.map((f) => f.label).join(" · ")}
                              <span className="block mt-1.5">
                                <Link
                                  href="/signup"
                                  className="text-[#00A4E4] hover:underline"
                                  data-testid={`link-signup-from-${stage.id}`}
                                >
                                  Create a free account
                                </Link>{" "}
                                to use these.
                              </span>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="pt-3 border-t border-border">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Your status
                        </p>
                        <Select
                          value={currentStatus}
                          onValueChange={(v) =>
                            updateStatus(stage.id, v as StageStatus)
                          }
                        >
                          <SelectTrigger
                            className="w-full sm:w-80"
                            data-testid={`select-status-${stage.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">
                              {STAGE_STATUS_LABELS.not_started}
                            </SelectItem>
                            <SelectItem value="in_progress">
                              {STAGE_STATUS_LABELS.in_progress}
                            </SelectItem>
                            <SelectItem value="done_in_cob">
                              {STAGE_STATUS_LABELS.done_in_cob}
                            </SelectItem>
                            <SelectItem value="handled_outside">
                              {STAGE_STATUS_LABELS.handled_outside}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                          <Info className="h-3 w-3 flex-shrink-0" />
                          Stored only on this device. We don't track or report
                          your stages.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Honest disclaimer */}
          <Card
            className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 mb-8"
            data-testid="card-disclaimer"
          >
            <CardContent className="p-6 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-2">
                  What this isn't
                </h3>
                <p className="text-sm leading-relaxed mb-2">
                  This is an architecture map, not personalized tax or legal
                  advice. The mechanics described are real and publicly
                  documented; whether any specific stage fits your situation
                  depends on your jurisdiction, your holdings, the rules in
                  effect at the time, and goals only you and your advisors
                  know.
                </p>
                <p className="text-sm leading-relaxed">
                  For decisions with real money on the line — especially
                  borrowing against collateral (Stage 5) and succession
                  planning that interacts with a will or trust (Stage 3) —
                  talk to an attorney or CPA who works with crypto holders.
                  The map shows what's possible. They help you decide what's
                  right for you.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Close — the same map, multiple legitimate routes */}
          <Card className="border-[#00A4E4]/30 mb-8" data-testid="card-closing">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-lg font-bold mb-3">
                The same map, multiple legitimate routes
              </h3>
              <p className="text-sm leading-relaxed mb-3">
                Some people will work this list top to bottom over a decade.
                Some will mirror it against a trust they already have, marking
                most stages as <em>handled outside CryptoOwnBank</em>. Some will
                stop at Stage 2 because that's what their life calls for right
                now. Some will only ever use the free tools and never touch the
                later stages. Every one of those is a real, valid way to use
                this.
              </p>
              <p className="text-sm leading-relaxed">
                What we don't do: tell you which one you should be. What we do:
                keep the full map visible, so the choice stays yours.
              </p>
            </CardContent>
          </Card>

          {/* CTA bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sovereignty">
              <Button variant="outline" data-testid="button-read-sovereignty">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Read Sovereignty first
              </Button>
            </Link>
            {!user && (
              <Link href="/signup">
                <Button
                  className="bg-[#00A4E4] hover:bg-[#0090c9]"
                  data-testid="button-start-free"
                >
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
