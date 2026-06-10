import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FoundingBadge } from "@/components/founding-badge";
import { Check, Wallet, ShieldCheck, Zap, Crown, ArrowRight, Lock } from "lucide-react";

interface FoundingMember {
  seatNumber: number;
  isGenesis: boolean;
  claimedAt: string | null;
}
interface FoundingStats {
  claimed: number;
  remaining: number;
  total: number;
  genesisClaimed: number;
  genesisTotal: number;
}
interface FoundingStatus {
  member: FoundingMember | null;
  onboarding: { walletConnected: boolean; kitCreated: boolean; actionCompleted: boolean };
  canClaim: boolean;
  stats: FoundingStats;
}

function StatBar({ stats }: { stats: FoundingStats }) {
  const pct = stats.total > 0 ? (stats.claimed / stats.total) * 100 : 0;
  return (
    <div className="space-y-2" data-testid="founding-counter">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold" data-testid="text-founding-remaining">
            {stats.remaining.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">of {stats.total.toLocaleString()} Founding seats left</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium" data-testid="text-founding-claimed">
            {stats.claimed.toLocaleString()} claimed
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
            <Crown className="h-3 w-3" />
            {stats.genesisClaimed}/{stats.genesisTotal} Genesis Circle
          </p>
        </div>
      </div>
      <Progress value={pct} className="h-2" data-testid="progress-founding" />
    </div>
  );
}

export default function FoundingMemberPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Logged-out visitors still see the live counter via the public stats endpoint.
  const publicStats = useQuery<FoundingStats>({
    queryKey: ["/api/founding/stats"],
    enabled: !user,
  });

  const status = useQuery<FoundingStatus>({
    queryKey: ["/api/founding/status"],
    enabled: !!user,
  });

  const claim = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/founding/claim");
      return res.json();
    },
    onSuccess: (data: { status: string; member?: FoundingMember }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/founding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/founding/stats"] });
      if (data.member) {
        toast({
          title: `You're Founding Member #${data.member.seatNumber}!`,
          description: data.member.isGenesis ? "You made the Genesis Circle (first 100)." : "Your number is yours forever.",
        });
      }
    },
    onError: async (err: any) => {
      const msg = err?.message?.replace(/^\d+:\s*/, "") || "Could not claim your seat";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const stats = user ? status.data?.stats : publicStats.data;
  const member = status.data?.member;
  const onboarding = status.data?.onboarding;
  const isLoading = user ? status.isLoading : publicStats.isLoading;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-[#00A4E4] font-semibold">
          <Crown className="h-5 w-5" />
          Founding Members
        </div>
        <h1 className="text-3xl font-bold" data-testid="heading-founding">
          Be one of the first 1,000
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Finish a free, 3-step setup and earn a permanent <strong>Founding Member #N of 1,000</strong> badge.
          No payment. No ID checks. Your number is yours forever — even if you go quiet.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading || !stats ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <StatBar stats={stats} />
          )}
        </CardContent>
      </Card>

      {/* Already claimed — show the permanent badge */}
      {user && member && (
        <Card className="border-[#00A4E4]/40" data-testid="card-founding-claimed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" /> Your seat is locked in
            </CardTitle>
            <CardDescription>This badge stays on your profile forever.</CardDescription>
          </CardHeader>
          <CardContent>
            <FoundingBadge seatNumber={member.seatNumber} isGenesis={member.isGenesis} total={stats?.total ?? 1000} size="lg" />
          </CardContent>
        </Card>
      )}

      {/* Logged out — invite to sign up */}
      {!user && (
        <Card data-testid="card-founding-signup">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Create a free account to claim your Founding Member number.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/signup">
                <Button className="bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-signup-founding">
                  Sign up & claim <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" data-testid="button-login-founding">Log in</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logged in, no seat yet — onboarding checklist */}
      {user && !member && onboarding && (
        <Card data-testid="card-founding-onboarding">
          <CardHeader>
            <CardTitle>Your 3 steps</CardTitle>
            <CardDescription>All free, all non-custodial. We never hold your funds or keys.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step
              done={onboarding.walletConnected}
              icon={Wallet}
              title="Connect or import a wallet"
              desc="Add at least one wallet (a read-only / watch address is fine)."
              actionLabel="Add a wallet"
              href="/wallets"
              testid="step-wallet"
            />
            <Step
              done={onboarding.kitCreated}
              icon={ShieldCheck}
              title="Generate your Sovereignty Recovery Kit"
              desc="Open the Recovery Kit page and generate your kit — this step completes automatically once you do."
              actionLabel={onboarding.kitCreated ? undefined : "Generate Recovery Kit"}
              href="/sovereignty-kit"
              testid="step-kit"
            />
            <Step
              done={onboarding.actionCompleted}
              icon={Zap}
              title="Do one real action"
              desc="Set a price alert or start a Legacy Plan — anything that makes the platform yours."
              actionLabel="Set a price alert"
              href="/price-alerts"
              testid="step-action"
            />

            <div className="pt-2">
              <Button
                className="w-full bg-[#00A4E4] hover:bg-[#0090c9]"
                disabled={!status.data?.canClaim || claim.isPending}
                onClick={() => claim.mutate()}
                data-testid="button-claim-seat"
              >
                {claim.isPending ? (
                  "Claiming…"
                ) : status.data?.canClaim ? (
                  <>Claim my Founding Member number <ArrowRight className="ml-1 h-4 w-4" /></>
                ) : stats && stats.remaining === 0 ? (
                  "All seats claimed"
                ) : (
                  <><Lock className="mr-1 h-4 w-4" /> Finish all 3 steps to claim</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <FoundingFaq />
    </div>
  );
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Does it cost anything?",
    a: "No. The Founding Member badge is free. There is no payment at any step, ever — and your number stays yours even if you never pay for a plan.",
  },
  {
    q: "Do I have to verify my identity?",
    a: "Never. There are no ID checks, no KYC, and no documents. CryptoOwnBank is non-custodial — we never hold your funds or your keys, so we have no reason to ask who you are.",
  },
  {
    q: "What are the 3 steps?",
    a: "Connect or import a wallet (a read-only watch address is fine), generate your Sovereignty Recovery Kit, and do one real action like setting a price alert or starting a Legacy Plan. All free, all non-custodial.",
  },
  {
    q: "What is the Genesis Circle?",
    a: "The first 100 of the 1,000 Founding Members get an extra cosmetic Genesis Circle tag on their badge. It's a keepsake for the earliest members — nothing you have to pay for or maintain.",
  },
  {
    q: "Do I keep my number if I go quiet?",
    a: "Yes. Once you claim it, your Founding Member number is permanent. It stays on your profile forever, even if you stop using the platform for a while. There's no clawback of the badge.",
  },
  {
    q: "I've been a member for a while — do I get one automatically?",
    a: "No automatic grant for anyone — existing members claim the same way as new ones, by finishing the same 3 free steps. We wanted every Founding badge to mean the same thing.",
  },
  {
    q: "What happens when all 1,000 are gone?",
    a: "That's it — the Founding Member badge is capped at 1,000 forever. The live counter at the top of this page shows exactly how many seats are left.",
  },
];

function FoundingFaq() {
  return (
    <Card data-testid="card-founding-faq">
      <CardHeader>
        <CardTitle>Questions</CardTitle>
        <CardDescription>The short, honest answers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} data-testid={`faq-item-${i}`}>
              <AccordionTrigger className="text-left" data-testid={`faq-trigger-${i}`}>
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid={`faq-content-${i}`}>
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function Step({
  done,
  icon: Icon,
  title,
  desc,
  actionLabel,
  href,
  testid,
  secondary,
}: {
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  actionLabel?: string;
  href: string;
  testid: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border p-3"
      data-testid={testid}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
        {!done && (actionLabel || secondary) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actionLabel && (
              <Link href={href}>
                <Button size="sm" variant="outline" data-testid={`${testid}-action`}>
                  {actionLabel}
                </Button>
              </Link>
            )}
            {secondary}
          </div>
        )}
      </div>
      {done && <span className="text-xs font-medium text-green-700 dark:text-green-400">Done</span>}
    </div>
  );
}
