import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import {
  getUpcomingCampaigns,
  isCampaignActive,
  CRYPTOOWNBANK_BIRTHDAY,
  type PromoCampaign,
} from "@shared/promo-calendar";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function AdminPromoCalendar() {
  const now = new Date();
  const upcoming = getUpcomingCampaigns(now);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" data-testid="admin-promo-calendar">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" /> Promotional Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          Crypto-date campaigns that drive free signups into the Founding seat. Each one can open a
          window for an extra crypto-payment discount — the free signup is never gated.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Set your real birthday:</strong> the CryptoOwnBank Birthday is currently a
            placeholder ({MONTHS[CRYPTOOWNBANK_BIRTHDAY.month - 1]} {CRYPTOOWNBANK_BIRTHDAY.day}).
            Update <code>CRYPTOOWNBANK_BIRTHDAY</code> in <code>shared/promo-calendar.ts</code> to the
            real launch date. Each member also gets a personal join-anniversary window automatically.
          </span>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {upcoming.map(({ campaign, date }) => {
          const active = isCampaignActive(campaign, now);
          const bonusPct = Math.round(campaign.cryptoBonusDiscount * 100);
          return (
            <Card key={campaign.slug} data-testid={`promo-row-${campaign.slug}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{campaign.emoji}</span>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {campaign.name}
                        {active && (
                          <Badge style={{ backgroundColor: campaign.accent, color: "white" }} data-testid={`badge-active-${campaign.slug}`}>
                            Live now
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Next: {MONTHS[date.getUTCMonth()]} {date.getUTCDate()}, {date.getUTCFullYear()}
                        {" · "}window {campaign.windowDays}d
                        {bonusPct > 0 && ` · +${bonusPct}% crypto`}
                      </CardDescription>
                    </div>
                  </div>
                  <Link href={`/promo/${campaign.slug}`}>
                    <Button size="sm" variant="outline" data-testid={`button-view-${campaign.slug}`}>
                      View page <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {campaign.subheadline}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🎉</span>
            <div>
              <CardTitle className="text-base">Member Join Anniversary</CardTitle>
              <CardDescription>Personal to each member — opens around their own join date (7-day window).</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          Automatically active for each member during their anniversary week, granting the same extra crypto-payment window.
        </CardContent>
      </Card>
    </div>
  );
}
