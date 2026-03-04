import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import { useAuth } from "@/hooks/use-auth";
import { AFFILIATE_LINKS } from "@/lib/xrpl-client";
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
} from "lucide-react";
import { SiBinance, SiCoinbase } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function OwnBankReferrals() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    isConnected,
    walletAddress,
    referralCode,
    referrals,
    premiumCreditMonths,
    generateReferralCode,
  } = useXrplStore();
  const [copied, setCopied] = useState(false);
  const [copiedAffiliate, setCopiedAffiliate] = useState<string | null>(null);

  useEffect(() => {
    if (user && !referralCode) {
      generateReferralCode();
    }
  }, [user, referralCode, generateReferralCode]);

  const siteUrl = window.location.origin;
  const referralLink = referralCode
    ? `${siteUrl}/?ref=${referralCode}`
    : null;

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

  const handleCopyAffiliate = async (name: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAffiliate(name);
      toast({
        title: `${name} link copied`,
        description: `Your ${name} affiliate link has been copied.`,
      });
      setTimeout(() => setCopiedAffiliate(null), 2000);
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
    (r) => r.depositCount > 0
  ).length;
  const totalEstimatedSeed = referrals.reduce(
    (sum, r) => sum + r.estimatedSeed,
    0
  );
  const premiumUpgrades = referrals.filter(
    (r) => r.upgradedToPremium
  ).length;

  const affiliateLinks = [
    { name: "Binance", url: AFFILIATE_LINKS.binance, color: "text-yellow-500" },
    { name: "Coinbase", url: AFFILIATE_LINKS.coinbase, color: "text-blue-500" },
    { name: "Kraken", url: AFFILIATE_LINKS.kraken, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-referrals-title">
          My Referrals
        </h1>
        <p className="text-muted-foreground mt-1">
          Share your links and earn rewards
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-[#00A4E4]" />
            Your CryptoOwnBank Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralLink ? (
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
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-muted-foreground text-sm text-center">
                Generating your referral link...
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Share this link with friends. When they sign up and make their first
            RLUSD deposit, you both earn bonus SEED points. If they upgrade to
            Premium, you get 1 free month.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-[#00A4E4]" />
            Your Exchange Affiliate Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These are your personal affiliate links for crypto exchanges. When
            someone signs up through your link, you earn a commission from the
            exchange.
          </p>
          <div className="space-y-2">
            {affiliateLinks.map((link) => (
              <div
                key={link.name}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-md border p-3"
                data-testid={`row-affiliate-${link.name.toLowerCase()}`}
              >
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className="font-medium text-sm">{link.name}</span>
                </div>
                <div className="flex-1 rounded bg-muted/50 px-3 py-1.5 text-xs font-mono break-all text-muted-foreground">
                  {link.url}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyAffiliate(link.name, link.url)}
                    data-testid={`button-copy-${link.name.toLowerCase()}`}
                  >
                    {copiedAffiliate === link.name ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copiedAffiliate === link.name ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    data-testid={`button-open-${link.name.toLowerCase()}`}
                  >
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#00A4E4]" />
            Premium Referral Bonus
          </CardTitle>
          <Badge variant="secondary">Bonus</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If your referral upgrades to Premium, you get{" "}
            <span className="font-semibold text-foreground">1 free month</span>{" "}
            of Premium added to your account. The more friends you refer who
            upgrade, the more free months you earn.
          </p>
          {premiumUpgrades > 0 && (
            <p className="text-sm mt-2 text-[#00A4E4]">
              {premiumUpgrades} referral{premiumUpgrades !== 1 ? "s" : ""}{" "}
              upgraded — you've earned {premiumUpgrades} free month
              {premiumUpgrades !== 1 ? "s" : ""}.
            </p>
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
