export const BRAND = {
  name: "CryptoOwnBank",
  tagline: "Be Your Own Bank",
  domain: "cryptoownbank.com",
  url: "https://cryptoownbank.com",
  description:
    "Non-custodial crypto portfolio tracker with RLUSD yield vaults earning 5-8% APR. Connect your cold wallet, track your portfolio, and earn real yield — principal always protected.",
  xrplSection: "OwnBank XRPL",
  stellarSection: "OwnBank Stellar",
} as const;

export const CHAIN_COLORS = {
  xrpl: "#00A4E4",
  stellar: "#7B61FF",
} as const;

export const RLUSD = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  symbol: "RLUSD",
} as const;

export const TIERS = {
  free: { name: "Free", monthlyPrice: 0, yearlyPrice: 0 },
  premium: { name: "Premium", monthlyPrice: 29, yearlyPrice: 199 },
  pro: { name: "Pro", monthlyPrice: 99, yearlyPrice: 799 },
} as const;

export const ADMIN_EMAILS = [
  "pawint@me.com",
  "andrew.wint@gmail.com",
] as const;
