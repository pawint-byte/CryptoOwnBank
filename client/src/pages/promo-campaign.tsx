import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Crown, Sparkles, Share2 } from "lucide-react";
import {
  getCampaignBySlug,
  isCampaignActive,
  campaignFixedDate,
  type PromoCampaign,
} from "@shared/promo-calendar";

interface FoundingStats {
  claimed: number;
  remaining: number;
  total: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(c: PromoCampaign): string {
  const fd = campaignFixedDate(c);
  if (fd) return `${MONTHS[fd.month - 1]} ${fd.day}`;
  return "your anniversary week";
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PromoCampaign() {
  const [, params] = useRoute("/promo/:slug");
  const slug = params?.slug ?? "";
  const campaign = getCampaignBySlug(slug);
  const { user } = useAuth();

  const stats = useQuery<FoundingStats>({ queryKey: ["/api/founding/stats"] });

  useEffect(() => {
    if (!campaign) return;
    const prevTitle = document.title;
    document.title = `${campaign.headline} | CryptoOwnBank`;

    const setMeta = (selector: string, attr: string, key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    const desc = setMeta('meta[name="description"]', "name", "description", campaign.subheadline);
    const ogTitle = setMeta('meta[property="og:title"]', "property", "og:title", campaign.headline);
    const ogDesc = setMeta('meta[property="og:description"]', "property", "og:description", campaign.subheadline);

    return () => {
      document.title = prevTitle;
      desc.setAttribute("content", "CryptoOwnBank — be your own bank.");
      ogTitle.setAttribute("content", "CryptoOwnBank");
      ogDesc.setAttribute("content", "CryptoOwnBank — be your own bank.");
    };
  }, [campaign]);

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold" data-testid="text-promo-notfound">No promotion here yet</h1>
          <p className="text-muted-foreground">
            This promotion link isn't active. Your free Founding seat is always available, though.
          </p>
          <Link href="/founding">
            <Button data-testid="button-promo-founding-fallback">
              Claim your Founding seat — free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const active = isCampaignActive(campaign, new Date());
  const bonusPct = Math.round(campaign.cryptoBonusDiscount * 100);
  const accent = campaign.accent;

  return (
    <div className="min-h-screen" data-testid={`promo-${campaign.slug}`}>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `radial-gradient(1200px 600px at 50% -10%, ${hexToRgba(accent, 0.22)}, transparent 70%)`,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24 text-center">
          <div className="text-6xl mb-6" aria-hidden>{campaign.emoji}</div>

          <Badge
            variant="secondary"
            className="mb-5"
            style={{ backgroundColor: hexToRgba(accent, 0.15), color: accent, borderColor: hexToRgba(accent, 0.4) }}
            data-testid="badge-promo-date"
          >
            {formatDate(campaign)}
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4" data-testid="text-promo-headline">
            {campaign.headline}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6" data-testid="text-promo-subheadline">
            {campaign.subheadline}
          </p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8">
            {campaign.body}
          </p>

          {/* Primary CTA — always the FREE Founding seat */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href={user ? campaign.ctaHref : "/signup"}>
              <Button size="lg" className="text-base" style={{ backgroundColor: accent }} data-testid="button-promo-primary">
                {campaign.ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-base" data-testid="button-promo-upgrade">
                See upgrade options
              </Button>
            </Link>
          </div>

          {/* Live Founding counter */}
          {stats.data && (
            <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-promo-counter">
              <Crown className="h-4 w-4 text-amber-500" />
              {stats.data.remaining.toLocaleString()} of {stats.data.total.toLocaleString()} Founding seats left
            </div>
          )}
        </div>
      </div>

      {/* Crypto-payment carrot — never gates the free signup */}
      {campaign.cryptoBonusDiscount > 0 && (
        <div className="max-w-3xl mx-auto px-6 pb-8">
          <Card style={{ borderColor: hexToRgba(accent, 0.4) }}>
            <CardContent className="p-6 flex items-start gap-4">
              <Sparkles className="h-6 w-6 shrink-0 mt-0.5" style={{ color: accent }} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold" data-testid="text-promo-offer-title">
                    Extra {bonusPct}% off when you pay with crypto
                  </h3>
                  {active ? (
                    <Badge style={{ backgroundColor: accent, color: "white" }} data-testid="badge-promo-window-open">
                      Window open now
                    </Badge>
                  ) : (
                    <Badge variant="outline" data-testid="badge-promo-window-upcoming">
                      Opens {formatDate(campaign)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {active
                    ? `Upgrade to Premium or Pro and pay in crypto during this window to stack an extra ${bonusPct}% on top of the standard crypto discount. Signing up and claiming your Founding seat is always free.`
                    : `When this window opens, upgrading and paying in crypto adds an extra ${bonusPct}% on top of the standard crypto discount. Signing up is always free — no payment needed to claim your seat.`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pizza Day — viral Whisper sharing */}
      {campaign.usesWhisper && (
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <Card>
            <CardContent className="p-6 flex items-start gap-4">
              <Share2 className="h-6 w-6 shrink-0 mt-0.5" style={{ color: accent }} />
              <div>
                <h3 className="font-semibold mb-1">Share your stack with a Whisper</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Create a no-login, revocable link to one of your positions and spread the word — no personal details, ever.
                </p>
                <Link href={user ? "/whispers" : "/signup"}>
                  <Button variant="outline" data-testid="button-promo-whisper">
                    {user ? "Create a Whisper" : "Sign up to share"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
