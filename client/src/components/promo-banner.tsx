import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface ActivePromo {
  slug: string;
  name: string;
  emoji: string;
  accent: string;
  headline: string;
  cryptoBonusDiscount: number;
}

interface PromoActiveResponse {
  bonus: number;
  campaigns: ActivePromo[];
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Thin, dismissible banner that appears ONLY while a crypto-date campaign
// window is open. Dismissal is remembered per-campaign and per-user, so it is
// never naggy: dismiss it once and that campaign stays gone for you. Reads the
// existing /api/promo/active endpoint (excludes per-user anniversaries).
export function PromoBanner() {
  const { user } = useAuth();
  const uid = user?.id ?? "guest";
  const [dismissedSlug, setDismissedSlug] = useState<string | null>(null);

  const { data } = useQuery<PromoActiveResponse>({
    queryKey: ["/api/promo/active"],
    staleTime: 1000 * 60 * 30,
  });

  const campaign = data?.campaigns?.[0];
  if (!campaign) return null;

  const dismissKey = `promo-banner-dismissed:${campaign.slug}:${uid}`;
  const isDismissed =
    dismissedSlug === campaign.slug || localStorage.getItem(dismissKey) === "1";
  if (isDismissed) return null;

  const pct = Math.round((campaign.cryptoBonusDiscount || 0) * 100);
  const accent = campaign.accent;

  return (
    <div
      className="flex items-center justify-center gap-3 text-xs px-4 py-1.5 border-b shrink-0"
      style={{
        backgroundColor: hexToRgba(accent, 0.12),
        color: accent,
        borderColor: hexToRgba(accent, 0.35),
      }}
      data-testid="banner-promo-active"
    >
      <span className="text-center" style={{ color: "inherit" }}>
        <span aria-hidden className="mr-1">{campaign.emoji}</span>
        <strong>{campaign.headline}.</strong>{" "}
        {pct > 0 && (
          <span>Extra {pct}% off in crypto this week. </span>
        )}
        <Link
          href={`/promo/${campaign.slug}`}
          className="underline font-semibold"
          data-testid="link-promo-banner"
        >
          See what's special →
        </Link>
      </span>
      <button
        onClick={() => {
          localStorage.setItem(dismissKey, "1");
          setDismissedSlug(campaign.slug);
        }}
        className="shrink-0 opacity-70 hover:opacity-100"
        aria-label="Dismiss"
        data-testid="button-dismiss-promo-banner"
      >
        ✕
      </button>
    </div>
  );
}
