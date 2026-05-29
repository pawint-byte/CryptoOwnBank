// Registry of help guides. Defined once, used by:
//   - /help index page (chain map)
//   - Each guide page (next + sideways links)
//   - Sitemap

export type GuideStatus = "live" | "coming";

export interface GuideMeta {
  slug: string;
  title: string;
  blurb: string;
  readMinutes: number;
  section: "start" | "grow" | "legacy";
  status: GuideStatus;
  next?: string;
  sideways?: { slug: string; label: string };
}

export const HELP_SECTIONS: { id: GuideMeta["section"]; label: string; tagline: string }[] = [
  { id: "start", label: "Getting started", tagline: "From zero to owning your first crypto." },
  { id: "grow", label: "Growing it", tagline: "Put what you own to work — without giving up control." },
  { id: "legacy", label: "Planning the handoff", tagline: "Make sure your family can recover everything if something happens to you." },
];

export const HELP_GUIDES: GuideMeta[] = [
  {
    slug: "create-wallet",
    title: "Create your first wallet",
    blurb: "Make a brand-new XRP wallet. You own the keys — we never see them.",
    readMinutes: 2,
    section: "start",
    status: "live",
    next: "buy-crypto",
    sideways: { slug: "transfer-from-exchange", label: "Already have crypto on an exchange? Transfer it instead" },
  },
  {
    slug: "buy-crypto",
    title: "Buy your first crypto",
    blurb: "Put $20 of XRP into the wallet you just made — paid with a normal debit card.",
    readMinutes: 3,
    section: "start",
    status: "live",
    next: "soil-vault",
    sideways: { slug: "transfer-from-exchange", label: "Prefer to move existing crypto over instead?" },
  },
  {
    slug: "transfer-from-exchange",
    title: "Transfer crypto from an exchange",
    blurb: "Move what you already own (on Coinbase, Binance, Kraken, etc.) into your own wallet.",
    readMinutes: 3,
    section: "start",
    status: "live",
    next: "soil-vault",
  },
  {
    slug: "soil-vault",
    title: "Earn yield on a Soil vault",
    blurb: "Deposit RLUSD into Soil Protocol and earn 5–8% — keys stay in your wallet.",
    readMinutes: 3,
    section: "grow",
    status: "live",
    next: "aave-borrow",
  },
  {
    slug: "aave-borrow",
    title: "Borrow against your crypto (optional)",
    blurb: "Get USDC liquidity without selling — the buy-borrow-don't-sell playbook.",
    readMinutes: 3,
    section: "grow",
    status: "live",
    next: "sovereignty-kit",
  },
  {
    slug: "sovereignty-kit",
    title: "Generate your Sovereignty Recovery Kit",
    blurb: "One printable page your family can use to recover everything you own.",
    readMinutes: 2,
    section: "legacy",
    status: "live",
    next: "legacy-tier",
  },
  {
    slug: "legacy-tier",
    title: "Choose a Legacy Plan tier",
    blurb: "Pick the plan that fits — Annual, 5-Year, or Member for Life.",
    readMinutes: 2,
    section: "legacy",
    status: "live",
    next: "legacy-beneficiary",
  },
  {
    slug: "legacy-beneficiary",
    title: "Add your first beneficiary",
    blurb: "Name a person, pick which wallets they inherit, lock it with a passphrase.",
    readMinutes: 4,
    section: "legacy",
    status: "live",
    next: "legacy-test",
  },
  {
    slug: "legacy-test",
    title: "Test your Legacy Plan",
    blurb: "Rehearse the recovery so you know it works. Unlock the vault yourself.",
    readMinutes: 3,
    section: "legacy",
    status: "live",
  },
];

export function getGuide(slug: string): GuideMeta | undefined {
  return HELP_GUIDES.find((g) => g.slug === slug);
}
