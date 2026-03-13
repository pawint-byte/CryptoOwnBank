import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import { useAuth } from "@/hooks/use-auth";
import { AFFILIATE_LINKS, WALLET_AFFILIATE_LINKS } from "@/lib/xrpl-client";
import {
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  Gift,
  Crown,
  UserPlus,
  Coins,
  ExternalLink,
  Share2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { SiBinance, SiCoinbase, SiUphold } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { SocialShare } from "@/components/social-share";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

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
  const {
    referralCode,
    referrals,
    premiumCreditMonths,
    generateReferralCode,
  } = useXrplStore();
  const [copied, setCopied] = useState(false);
  const [copiedExchange, setCopiedExchange] = useState<string | null>(null);

  useEffect(() => {
    if (user && !referralCode) {
      generateReferralCode();
    }
  }, [user, referralCode, generateReferralCode]);

  const SITE_DOMAIN = "https://cryptoownbank.com";
  const referralLink = referralCode ? `${SITE_DOMAIN}/?ref=${referralCode}` : null;

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

  const totalReferrals = referrals.length;
  const referralsWithDeposits = referrals.filter(
    (r) => r.depositCount > 0,
  ).length;
  const totalEstimatedSeed = referrals.reduce(
    (sum, r) => sum + r.estimatedSeed,
    0,
  );
  const premiumUpgrades = referrals.filter(
    (r) => r.upgradedToPremium,
  ).length;

  const hasAffiliateLinks =
    AFFILIATE_LINKS.binance && AFFILIATE_LINKS.kraken && AFFILIATE_LINKS.coinbase;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          data-testid="text-referrals-title"
        >
          Your Referral Links — Earn Rewards When Others Join
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Share these links with friends. When they sign up, buy RLUSD, or join
          Soil via your link, you may earn rewards (affiliate commissions or SEED
          points). At no extra cost to them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#00A4E4]" />
            Invite Friends to CryptoOwnBank
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralLink ? (
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
                Generating your referral link...
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            When friends sign up and deposit RLUSD, you both earn bonus SEED
            points. If they upgrade to Premium, you get 1 free month.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-[#00A4E4]" />
            Invite via Exchange — Your Affiliate Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share these links so friends can sign up on an exchange, buy RLUSD,
            and get started. You earn a commission when they join through your
            link.
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Referrals
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-referrals"
            >
              {totalReferrals}
            </div>
            <p className="text-xs text-muted-foreground">
              Friends who signed up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Depositors
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-active-depositors"
            >
              {referralsWithDeposits}
            </div>
            <p className="text-xs text-muted-foreground">
              Referrals with deposits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Est. SEED Earned
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-estimated-seed"
            >
              {totalEstimatedSeed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Bonus SEED from referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Premium Credits
            </CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-premium-credits"
            >
              {premiumCreditMonths}
            </div>
            <p className="text-xs text-muted-foreground">
              Free months earned
            </p>
          </CardContent>
        </Card>
      </div>

      {referralLink && (
        <Card className="border-[#00A4E4]/20 bg-[#00A4E4]/5" data-testid="card-share-cta">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-[#00A4E4]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Invite more friends to earn rewards</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Every friend who joins earns you SEED points. If they go Premium, you get a free month.
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
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#00A4E4]" />
            Premium Referral Bonus
          </CardTitle>
          <Badge variant="secondary">Bonus</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If your referral upgrades to Premium, you get{" "}
            <span className="font-semibold text-foreground">1 free month</span>{" "}
            of Premium added to your account. The more friends you refer who
            upgrade, the more free months you earn.
          </p>
          {premiumUpgrades > 0 && (
            <p className="text-sm text-[#00A4E4]">
              {premiumUpgrades} referral{premiumUpgrades !== 1 ? "s" : ""}{" "}
              upgraded — you've earned {premiumUpgrades} free month
              {premiumUpgrades !== 1 ? "s" : ""}.
            </p>
          )}
          {referralLink && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-muted">
              {typeof navigator !== "undefined" && navigator.share && (
                <Button
                  size="sm"
                  className="bg-[#00A4E4] text-white"
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: "CryptoOwnBank — Earn Yield on RLUSD",
                        text: "Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC required, just connect your cold wallet and start earning.",
                        url: referralLink,
                      });
                    } catch {}
                  }}
                  data-testid="button-bonus-native-share"
                >
                  <Smartphone className="h-4 w-4 mr-1.5" />
                  Share & Earn
                </Button>
              )}
              <SocialShare
                url={referralLink}
                text="Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC, no seed phrases — just connect your cold wallet and start earning."
                buttonLabel="Post on Social"
                data-testid="button-bonus-social-share"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#00A4E4]" />
              Referred Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral, index) => (
                <div
                  key={referral.referredAddress}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                  data-testid={`row-referral-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00A4E4]/10">
                      <Users className="h-4 w-4 text-[#00A4E4]" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-mono font-medium"
                        data-testid={`text-referral-address-${index}`}
                      >
                        {truncateAddress(referral.referredAddress)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{" "}
                        {new Date(referral.joinedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {referral.depositCount > 0 ? (
                      <Badge variant="default">
                        {referral.depositCount} deposit
                        {referral.depositCount !== 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No deposits</Badge>
                    )}
                    {referral.upgradedToPremium && (
                      <Badge variant="default">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                    {referral.estimatedSeed > 0 && (
                      <span className="text-xs text-muted-foreground">
                        +{referral.estimatedSeed} SEED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <XrplDisclaimer />
    </div>
  );
}
