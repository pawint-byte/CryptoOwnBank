import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  Gift,
  Crown,
  UserPlus,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function OwnBankReferrals() {
  const { toast } = useToast();
  const {
    isConnected,
    walletAddress,
    referralCode,
    referrals,
    premiumCreditMonths,
    generateReferralCode,
  } = useXrplStore();
  const [copied, setCopied] = useState(false);

  const siteUrl = window.location.origin;
  const referralLink = referralCode
    ? `${siteUrl}/?ref=${referralCode}`
    : null;

  const handleGenerateCode = () => {
    generateReferralCode();
    toast({
      title: "Referral code generated",
      description: "Your unique referral link is ready to share.",
    });
  };

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

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-referrals-title">
            My Referrals
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your wallet to access the referral program
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Please connect your wallet from the OwnBank Dashboard to view your
              referral program.
            </p>
          </CardContent>
        </Card>
        <XrplDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-referrals-title">
          My Referrals
        </h1>
        <p className="text-muted-foreground mt-1">
          Invite friends and earn rewards when they deposit
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-[#00A4E4]" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralCode ? (
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
                Generate your unique referral link to start inviting friends.
              </p>
              <Button
                onClick={handleGenerateCode}
                data-testid="button-generate-referral"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Generate Referral Link
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Share this link with friends. When they sign up and make their first
            RLUSD deposit, you both earn bonus SEED points.
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#00A4E4]" />
            Referred Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <UserPlus className="h-10 w-10 text-muted-foreground" />
              <p
                className="text-muted-foreground text-sm text-center"
                data-testid="text-no-referrals"
              >
                No referrals yet. Share your link to get started.
              </p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <XrplDisclaimer />
    </div>
  );
}
