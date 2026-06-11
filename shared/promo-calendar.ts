// Crypto-Date Promotional Calendar — single source of truth for both the
// public campaign landing pages (client) and the crypto-payment discount window
// (server). Pure data + pure date helpers: no DOM, no Node, no imports — safe to
// import from "@shared/promo-calendar" on either side.
//
// Doctrine: every campaign's PRIMARY call to action is the FREE "claim your
// Founding seat" path. The optional crypto-payment bonus is a carrot on an
// upgrade, never a toll on the free signup.

export type PromoKind = "fixed" | "cryptoOwnBankBirthday" | "memberAnniversary";

export interface PromoCampaign {
  /** URL slug — page lives at /promo/<slug> */
  slug: string;
  /** Internal/admin-facing name */
  name: string;
  kind: PromoKind;
  /** Month (1-12) and day (1-31) for kind "fixed" */
  month?: number;
  day?: number;
  /** How many days the promo window stays open (>= 1) */
  windowDays: number;
  /** Accent color (hex) used for per-date theming */
  accent: string;
  emoji: string;
  headline: string;
  subheadline: string;
  body: string;
  /** Primary CTA — always the free Founding-seat path by default */
  ctaLabel: string;
  ctaHref: string;
  /** Extra crypto-payment discount during the window (e.g. 0.10 = +10%). 0 = none. */
  cryptoBonusDiscount: number;
  /** Deliberate "crypto-only" identity drop — used sparingly. Never gates the free signup. */
  cryptoOnly?: boolean;
  /** Wire this date to the existing Whisper sharing flow for viral reach. */
  usesWhisper?: boolean;
}

// Founding Day — the date CryptoOwnBank first went live (Jan 13, 2026).
// This anchors the annual birthday campaign; the year is implicit (recurs every Jan 13).
export const CRYPTOOWNBANK_BIRTHDAY = { month: 1, day: 13 } as const;
// The year we were founded — used for "Year N" copy on the birthday campaign.
export const CRYPTOOWNBANK_FOUNDED_YEAR = 2026 as const;

const FREE_SEAT_CTA = { ctaLabel: "Claim your Founding seat — free", ctaHref: "/founding" };

export const CAMPAIGNS: PromoCampaign[] = [
  {
    slug: "genesis-day",
    name: "Genesis Day (Jan 3)",
    kind: "fixed",
    month: 1,
    day: 3,
    windowDays: 2,
    accent: "#F7931A",
    emoji: "🪙",
    headline: "Genesis Day",
    subheadline: "The first block was mined on January 3, 2009. Start your own chain of ownership.",
    body: "Bitcoin's genesis block carried a headline about bank bailouts — a reminder of why self-custody matters. Mark the day by claiming your free Founding seat and taking the keys into your own hands.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
  },
  {
    slug: "tax-day",
    name: "Crypto Tax Day (Apr 15)",
    kind: "fixed",
    month: 4,
    day: 15,
    windowDays: 3,
    accent: "#16A34A",
    emoji: "🧾",
    headline: "Sort your crypto, claim your seat",
    subheadline: "Tax season is the nudge to finally get your holdings organized.",
    body: "Bring every wallet and exchange into one clear picture, see your cost basis, and scan for tax-loss harvesting — then claim your free Founding seat while you're here. No accounts are ever held by us.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
  },
  {
    slug: "pizza-day",
    name: "Bitcoin Pizza Day (May 22)",
    kind: "fixed",
    month: 5,
    day: 22,
    windowDays: 2,
    accent: "#DC2626",
    emoji: "🍕",
    headline: "Bitcoin Pizza Day",
    subheadline: "10,000 BTC for two pizzas on May 22, 2010. Share your stack, spread the word.",
    body: "The most famous trade in crypto history. Celebrate by sharing a no-login Whisper of one of your positions — and claim your free Founding seat.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
    usesWhisper: true,
  },
  {
    slug: "leave-the-banks",
    name: "Leave the Banks (August beat)",
    kind: "fixed",
    month: 8,
    day: 1,
    windowDays: 14,
    accent: "#00A4E4",
    emoji: "🏦",
    headline: "Founding seats for people leaving the banks",
    subheadline: "Being de-banked shouldn't mean being shut out of your own money.",
    body: "If a bank can freeze you out, it was never fully yours. Learn how self-custody puts the keys back in your hands — then claim your free Founding seat. We never hold your funds and never gate who you are.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
  },
  {
    slug: "bitcoin-day",
    name: "Bitcoin Day (Sep 7)",
    kind: "fixed",
    month: 9,
    day: 7,
    windowDays: 2,
    accent: "#F7931A",
    emoji: "🌎",
    headline: "Bitcoin Day",
    subheadline: "On September 7, 2021 a country made Bitcoin legal tender.",
    body: "A milestone for money you actually own. Mark it by claiming your free Founding seat and bringing your whole portfolio into one self-custodied view.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
  },
  {
    slug: "whitepaper-day",
    name: "Whitepaper Day (Oct 31)",
    kind: "fixed",
    month: 10,
    day: 31,
    windowDays: 2,
    accent: "#6366F1",
    emoji: "📄",
    headline: "Read the paper, claim your seat",
    subheadline: "The Bitcoin whitepaper was published on October 31, 2008.",
    body: "Nine pages that started it all: money without a middleman. Read it, then claim your free Founding seat and put the idea into practice with real self-custody.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
  },
  {
    slug: "cryptoownbank-birthday",
    name: "Founding Day (Jan 13)",
    kind: "cryptoOwnBankBirthday",
    windowDays: 7,
    accent: "#EC4899",
    emoji: "🎂",
    headline: "January 13 — the day we became our own bank",
    subheadline: "On this day in 2026, CryptoOwnBank went live. Every year we mark it the only way that matters: more people holding their own keys.",
    body: "Founding Day is our birthday and our promise — your money should answer to you, not to us. Claim your free Founding seat to celebrate with us, and if you upgrade this week, paying with crypto gets you a Founding Day bonus on top.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
  },
  {
    slug: "member-anniversary",
    name: "Member Join Anniversary",
    kind: "memberAnniversary",
    windowDays: 7,
    accent: "#A855F7",
    emoji: "🎉",
    headline: "Happy anniversary of being your own bank",
    subheadline: "It's been a year since you took the keys into your own hands.",
    body: "Thanks for sticking with self-custody. As a small thank-you, your crypto-upgrade window is open this week — and your free Founding seat is always here if you haven't claimed it yet.",
    ...FREE_SEAT_CTA,
    cryptoBonusDiscount: 0.10,
  },
];

const DAY_MS = 86_400_000;

/** True if `now` falls inside an annual [month/day, +windowDays) window. Handles year-boundary windows. */
function fixedWindowActive(month: number, day: number, windowDays: number, now: Date): boolean {
  const t = now.getTime();
  const years = [now.getUTCFullYear(), now.getUTCFullYear() - 1];
  for (const yr of years) {
    const start = Date.UTC(yr, month - 1, day);
    const end = start + Math.max(1, windowDays) * DAY_MS;
    if (t >= start && t < end) return true;
  }
  return false;
}

/** Member-anniversary windows skip the first ~year so a brand-new signup isn't "celebrating". */
function anniversaryActive(joinDate: Date | null | undefined, windowDays: number, now: Date): boolean {
  if (!joinDate) return false;
  if (now.getTime() - joinDate.getTime() < 330 * DAY_MS) return false;
  return fixedWindowActive(joinDate.getUTCMonth() + 1, joinDate.getUTCDate(), windowDays, now);
}

export function isCampaignActive(
  c: PromoCampaign,
  now: Date = new Date(),
  joinDate?: Date | null,
): boolean {
  if (c.kind === "fixed" && c.month && c.day) {
    return fixedWindowActive(c.month, c.day, c.windowDays, now);
  }
  if (c.kind === "cryptoOwnBankBirthday") {
    return fixedWindowActive(CRYPTOOWNBANK_BIRTHDAY.month, CRYPTOOWNBANK_BIRTHDAY.day, c.windowDays, now);
  }
  if (c.kind === "memberAnniversary") {
    return anniversaryActive(joinDate, c.windowDays, now);
  }
  return false;
}

export function getActiveCampaigns(now: Date = new Date(), joinDate?: Date | null): PromoCampaign[] {
  return CAMPAIGNS.filter((c) => isCampaignActive(c, now, joinDate));
}

/** Highest active crypto-payment bonus (campaigns don't stack with each other). 0 if none active. */
export function getActiveCryptoBonus(now: Date = new Date(), joinDate?: Date | null): number {
  return getActiveCampaigns(now, joinDate).reduce(
    (max, c) => Math.max(max, c.cryptoBonusDiscount || 0),
    0,
  );
}

export function getCampaignBySlug(slug: string): PromoCampaign | undefined {
  return CAMPAIGNS.find((c) => c.slug === slug);
}

/** The fixed month/day a campaign displays as, or null for personal (anniversary). */
export function campaignFixedDate(c: PromoCampaign): { month: number; day: number } | null {
  if (c.kind === "fixed" && c.month && c.day) return { month: c.month, day: c.day };
  if (c.kind === "cryptoOwnBankBirthday") return { ...CRYPTOOWNBANK_BIRTHDAY };
  return null;
}

/** Next calendar occurrence (>= today) for a fixed/birthday campaign; null for personal. */
export function nextOccurrence(c: PromoCampaign, now: Date = new Date()): Date | null {
  const fd = campaignFixedDate(c);
  if (!fd) return null;
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let occ = Date.UTC(now.getUTCFullYear(), fd.month - 1, fd.day);
  if (occ < t) occ = Date.UTC(now.getUTCFullYear() + 1, fd.month - 1, fd.day);
  return new Date(occ);
}

/** Fixed + birthday campaigns sorted by their next occurrence — for the internal schedule view. */
export function getUpcomingCampaigns(
  now: Date = new Date(),
): Array<{ campaign: PromoCampaign; date: Date }> {
  return CAMPAIGNS.map((c) => ({ campaign: c, date: nextOccurrence(c, now) }))
    .filter((x): x is { campaign: PromoCampaign; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
