import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AFFILIATE_LINKS, WALLET_AFFILIATE_LINKS } from "@/lib/xrpl-client";
import {
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  Gift,
  Crown,
  UserPlus,
  ExternalLink,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Award,
  Sprout,
  HelpCircle,
} from "lucide-react";
import { SiBinance, SiCoinbase, SiUphold } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { SocialShare } from "@/components/social-share";

const referralFaq = [
  {
    q: "How much does it cost my friend to join?",
    a: "Nothing. Joining CryptoOwnBank through your link is free, and there's no payment or identity check to sign up. They only pay if they choose a paid plan later — and even then, it never costs them extra for using your link.",
  },
  {
    q: "When do I actually earn a reward?",
    a: "Only when someone you invited upgrades to a paid plan (Premium or Pro). A signup alone earns nothing. This keeps the program honest — we reward real, happy members, not empty signups.",
  },
  {
    q: "What do Founding Members get?",
    a: "Founding Members earn double reward points on every paid referral. The bonus is locked in at the moment your invitee upgrades.",
  },
  {
    q: "What is a Lineage Score?",
    a: "It's the number of people you brought in who went on to a paid plan. Think of it as your living family tree on the platform. Bring three paid members and you unlock a boosted reward tier plus the right to name one Legacy heir.",
  },
  {
    q: "What does 'name a Legacy heir' mean?",
    a: "Once you unlock it, you get the right to designate one successor in your Legacy Plan. As always, you stay fully in control — you approve and sign everything yourself. We never hold your funds or your keys.",
  },
  {
    q: "Is any of this custodial? Do you check IDs?",
    a: "No. CryptoOwnBank never holds your funds, never asks for ID, and never gates who you can invite. The referral program is just a link and a reward — it changes none of that.",
  },
  {
    q: "Where's my referral link?",
    a: "Right at the top of this page once you're signed in. It's a permanent personal link (ending in ?ref=yourcode) — share it by message, social, or copy and paste anywhere.",
  },
];

type ReferralStats = {
  code: string;
  totalReferrals: number;
  premiumReferrals: number;
  rewardPoints: number;
  lineageScore: number;
  boostUnlocked: boolean;
  canDesignateHeir: boolean;
  boostThreshold: number;
  isFounding: boolean;
  wasBaptizedByFounder: boolean;
};

const exchangeCards = [
  {
    name: "Binance",
    url: AFFILIATE_LINKS.binance,
    color: "bg-yellow-500/10 border-yellow-500/20",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    description: "Global exchange with deep RLUSD liquidity",
    icon: SiBinance,
  },
  {
    name: "Kraken",
    url: AFFILIATE_LINKS.kraken,
    color: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    description: "Trusted exchange with low fees",
    icon: null,
  },
  {
    name: "Coinbase",
    url: AFFILIATE_LINKS.coinbase,
    color: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    description: "Beginner-friendly, regulated platform",
    icon: SiCoinbase,
  },
  {
    name: "Crypto.com",
    url: AFFILIATE_LINKS.cryptoCom,
    color: "bg-indigo-500/10 border-indigo-500/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    description: "Popular app with Visa card rewards",
    icon: null,
  },
  ...(AFFILIATE_LINKS.uphold
    ? [
        {
          name: "Uphold",
          url: AFFILIATE_LINKS.uphold,
          color: "bg-emerald-500/10 border-emerald-500/20",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          description: "Easy RLUSD on/off-ramp with yield",
          icon: SiUphold,
        },
      ]
    : []),
];

export default function OwnBankReferrals() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedExchange, setCopiedExchange] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
    enabled: !!user,
  });

  const SITE_DOMAIN = "https://cryptoownbank.com";
  const referralLink = stats?.code ? `${SITE_DOMAIN}/?ref=${stats.code}` : null;

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Referral link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handleCopyExchange = async (name: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedExchange(name);
      toast({
        title: `${name} link copied`,
        description: `Your ${name} referral link has been copied.`,
      });
      setTimeout(() => setCopiedExchange(null), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link.",
        variant: "destructive",
      });
    }
  };

  const hasAffiliateLinks =
    AFFILIATE_LINKS.binance && AFFILIATE_LINKS.kraken && AFFILIATE_LINKS.coinbase;

  const boostThreshold = stats?.boostThreshold ?? 3;
  const premiumReferrals = stats?.premiumReferrals ?? 0;
  const progressToBoost = Math.min(premiumReferrals, boostThreshold);
  const remainingForBoost = Math.max(0, boostThreshold - premiumReferrals);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          data-testid="text-referrals-title"
        >
          Invite Members — Grow Your Lineage, Earn Real Rewards
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Share your personal link. When someone joins through it and later
          upgrades to a paid plan, you earn a reward — and they join your
          lineage. Founding Members earn double. Rewards are only credited on a
          real paid upgrade, never just a signup.
        </p>
      </div>

      {stats?.wasBaptizedByFounder && (
        <Card
          className="border-amber-500/30 bg-amber-500/5"
          data-testid="card-baptized-welcome"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Welcomed by a Founding Member
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You joined CryptoOwnBank through one of our Founding Members —
                you're part of their lineage.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#00A4E4]" />
            Your Member Referral Link
            {stats?.isFounding && (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <Crown className="h-3 w-3 mr-1" />
                Founding · 2× rewards
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-11 w-full" data-testid="skeleton-referral-link" />
          ) : referralLink ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div
                  className="flex-1 rounded-md border bg-muted/50 px-4 py-2.5 text-sm font-mono break-all"
                  data-testid="text-referral-link"
                >
                  {referralLink}
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  data-testid="button-copy-referral"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied" : "Copy Link"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {typeof navigator !== "undefined" && navigator.share && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-[#00A4E4] text-white"
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: "CryptoOwnBank — Earn Yield on RLUSD",
                          text: "Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC, no seed phrases — just connect your cold wallet and start earning.",
                          url: referralLink,
                        });
                      } catch {}
                    }}
                    data-testid="button-native-share"
                  >
                    <Smartphone className="h-4 w-4 mr-1.5" />
                    Share via SMS / Message
                  </Button>
                )}
                <SocialShare
                  url={referralLink}
                  text="Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC, no seed phrases — just connect your cold wallet and start earning."
                  buttonLabel="Share on Social"
                  data-testid="button-share-social"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-muted-foreground text-sm text-center">
                Sign in to get your personal referral link.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Friends pay nothing extra. You earn a reward only when they upgrade
            to a paid plan — and they become part of your lineage.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Referrals
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div
                className="text-2xl font-bold"
                data-testid="text-total-referrals"
              >
                {stats?.totalReferrals ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Members who joined via your link
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Went Premium</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div
                className="text-2xl font-bold"
                data-testid="text-premium-referrals"
              >
                {stats?.premiumReferrals ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Referrals on a paid plan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div
                className="text-2xl font-bold"
                data-testid="text-reward-points"
              >
                {(stats?.rewardPoints ?? 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Earned on paid upgrades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lineage Score</CardTitle>
            <Sprout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div
                className="text-2xl font-bold"
                data-testid="text-lineage-score"
              >
                {stats?.lineageScore ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Paid members tracing to you
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-lineage-privileges">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#00A4E4]" />
            Lineage Privileges
          </CardTitle>
          {stats?.boostUnlocked ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Unlocked
            </Badge>
          ) : (
            <Badge variant="secondary">Locked</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bring <span className="font-semibold text-foreground">{boostThreshold}</span>{" "}
            members to a paid plan to unlock a boosted reward tier and the right
            to name one Legacy heir.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress to boost</span>
              <span data-testid="text-boost-progress">
                {progressToBoost} / {boostThreshold}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00A4E4] transition-all"
                style={{
                  width: `${(progressToBoost / boostThreshold) * 100}%`,
                }}
                data-testid="bar-boost-progress"
              />
            </div>
            {!stats?.boostUnlocked && (
              <p className="text-xs text-muted-foreground">
                {remainingForBoost} more paid referral
                {remainingForBoost !== 1 ? "s" : ""} to unlock.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={`rounded-md border p-3 ${
                stats?.boostUnlocked
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-muted bg-muted/30"
              }`}
              data-testid="privilege-boosted-rewards"
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  className={`h-4 w-4 ${
                    stats?.boostUnlocked
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }`}
                />
                <p className="text-sm font-semibold">Boosted reward tier</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Higher reward rate on every future paid referral.
              </p>
            </div>

            <div
              className={`rounded-md border p-3 ${
                stats?.canDesignateHeir
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-muted bg-muted/30"
              }`}
              data-testid="privilege-legacy-heir"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`h-4 w-4 ${
                    stats?.canDesignateHeir
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }`}
                />
                <p className="text-sm font-semibold">Name one Legacy heir</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The right to designate a successor in your Legacy Plan. You
                always stay in control and approve everything yourself.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {referralLink && (
        <Card className="border-[#00A4E4]/20 bg-[#00A4E4]/5" data-testid="card-share-cta">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-[#00A4E4]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Invite more members to grow your lineage</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Every member who upgrades to a paid plan earns you a reward and joins your lineage.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {typeof navigator !== "undefined" && navigator.share && (
                  <Button
                    size="sm"
                    className="bg-[#00A4E4] text-white"
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: "CryptoOwnBank — Earn Yield on RLUSD",
                          text: "Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC, no seed phrases — just connect your cold wallet and start earning.",
                          url: referralLink,
                        });
                      } catch {}
                    }}
                    data-testid="button-cta-native-share"
                  >
                    <Smartphone className="h-4 w-4 mr-1.5" />
                    Send to a Friend
                  </Button>
                )}
                <SocialShare
                  url={referralLink}
                  text="Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC, no seed phrases — just connect your cold wallet and start earning."
                  buttonLabel="Post on Social"
                  data-testid="button-cta-social-share"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  data-testid="button-cta-copy"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? "Copied" : "Copy Link"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-[#00A4E4]" />
            Invite via Exchange — Your Affiliate Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Separate from your member referral above: share these so friends can
            sign up on an exchange, buy RLUSD, and get started. You earn a
            commission when they join through your link.
          </p>

          {hasAffiliateLinks ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {exchangeCards.map((exchange) => (
                <Card
                  key={exchange.name}
                  className={`border ${exchange.color}`}
                  data-testid={`card-affiliate-${exchange.name.toLowerCase()}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${exchange.color}`}
                      >
                        {exchange.icon ? (
                          <exchange.icon className={`h-4 w-4 ${exchange.iconColor}`} />
                        ) : (
                          <span className={`text-sm font-bold ${exchange.iconColor}`}>
                            {exchange.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{exchange.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {exchange.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        asChild
                        data-testid={`button-invite-${exchange.name.toLowerCase()}`}
                      >
                        <a
                          href={exchange.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Invite via {exchange.name}
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleCopyExchange(exchange.name, exchange.url)
                        }
                        data-testid={`button-copy-${exchange.name.toLowerCase()}`}
                      >
                        {copiedExchange === exchange.name ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <SocialShare
                        url={exchange.url}
                        text={`Sign up on ${exchange.name} and start buying crypto. ${exchange.description}`}
                        buttonLabel="Share"
                        buttonSize="sm"
                        data-testid={`button-share-${exchange.name.toLowerCase()}`}
                      />
                      {typeof navigator !== "undefined" && navigator.share && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={async () => {
                            try {
                              await navigator.share({
                                title: `Join ${exchange.name}`,
                                text: exchange.description,
                                url: exchange.url,
                              });
                            } catch {}
                          }}
                          data-testid={`button-sms-${exchange.name.toLowerCase()}`}
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          SMS
                        </Button>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Affiliate/referral link — we may earn a reward if used.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <LinkIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                Referral links coming soon — check back after setup.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {WALLET_AFFILIATE_LINKS.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#00A4E4]" />
              Get a Cold Wallet — Affiliate Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To use CryptoOwnBank, you need a cold wallet to sign transactions
              and keep your XRP and RLUSD safe. Both wallets below support XRP
              and XRPL tokens — they just protect your keys differently.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {WALLET_AFFILIATE_LINKS.map((wallet) => (
                <Card
                  key={wallet.name}
                  className={`border ${wallet.color}`}
                  data-testid={`card-wallet-${wallet.name.toLowerCase()}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${wallet.color}`}
                      >
                        <ShieldCheck className={`h-4 w-4 ${wallet.iconColor}`} />
                      </div>
                      <p className="font-semibold text-sm">{wallet.name}</p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {wallet.description}
                    </p>

                    <div className="rounded-md bg-muted/30 border border-muted px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Safety:</span>{" "}
                        {wallet.safety}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        asChild
                        data-testid={`button-shop-${wallet.name.toLowerCase()}`}
                      >
                        <a
                          href={wallet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Shop {wallet.name}
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleCopyExchange(wallet.name, wallet.url)
                        }
                        data-testid={`button-copy-wallet-${wallet.name.toLowerCase()}`}
                      >
                        {copiedExchange === wallet.name ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <SocialShare
                        url={wallet.url}
                        text={`Protect your crypto with ${wallet.name}. ${wallet.description}`}
                        buttonLabel="Share"
                        buttonSize="sm"
                        data-testid={`button-share-wallet-${wallet.name.toLowerCase()}`}
                      />
                      {typeof navigator !== "undefined" && navigator.share && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={async () => {
                            try {
                              await navigator.share({
                                title: `Get a ${wallet.name} Cold Wallet`,
                                text: wallet.description,
                                url: wallet.url,
                              });
                            } catch {}
                          }}
                          data-testid={`button-sms-wallet-${wallet.name.toLowerCase()}`}
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          SMS
                        </Button>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Affiliate link — we may earn a reward if used.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-referral-faq">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#00A4E4]" />
            Referral FAQ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {referralFaq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left text-sm" data-testid={`faq-trigger-${i}`}>
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground" data-testid={`faq-content-${i}`}>
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <XrplDisclaimer />
    </div>
  );
}
