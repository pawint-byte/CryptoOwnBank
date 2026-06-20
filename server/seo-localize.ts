import { type Request } from "express";
import { getCampaignBySlug } from "@shared/promo-calendar";

export const SEO_LANGS = ["en", "es", "pt", "fr", "tr", "hi", "zh"] as const;
export type SeoLang = (typeof SEO_LANGS)[number];

type SeoMeta = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  locale: string;
};

const SEO: Record<Exclude<SeoLang, "en">, SeoMeta> = {
  es: {
    title:
      "CryptoOwnBank — Plataforma Cripto de Autocustodia | Herencia, Rendimiento, Pagos Globales",
    description:
      "¿Qué pasa con tu cripto cuando mueres? CryptoOwnBank lo resuelve. Plataforma sin custodia con herencia cripto automática (Plan Legado), bóvedas de rendimiento RLUSD del 5-8%, trading en DEX de XRPL y Stellar, remesas globales y seguimiento de portafolio en wallet fría. Tus llaves, tu cripto — incluso cuando ya no estés.",
    ogTitle:
      "CryptoOwnBank — Sé Tu Propio Banco | Herencia y Rendimiento Cripto sin Custodia",
    ogDescription:
      "El único panel cripto de autocustodia que resuelve la herencia, gana 5-8% de rendimiento en stablecoins y reemplaza a tu banco. Sin custodia. Más de 190 países. Gratis para empezar.",
    locale: "es_ES",
  },
  pt: {
    title:
      "CryptoOwnBank — Plataforma Cripto de Autocustódia | Herança, Rendimento, Pagamentos Globais",
    description:
      "O que acontece com sua cripto quando você morre? A CryptoOwnBank resolve. Plataforma sem custódia com herança cripto automática (Plano Legado), cofres de rendimento RLUSD de 5-8%, trading em DEX da XRPL e Stellar, remessas globais e rastreamento de portfólio em carteira fria. Suas chaves, sua cripto — mesmo depois que você partir.",
    ogTitle:
      "CryptoOwnBank — Seja Seu Próprio Banco | Herança e Rendimento Cripto sem Custódia",
    ogDescription:
      "O único painel cripto de autocustódia que resolve a herança, rende 5-8% em stablecoins e substitui seu banco. Sem custódia. Mais de 190 países. Grátis para começar.",
    locale: "pt_BR",
  },
  fr: {
    title:
      "CryptoOwnBank — Plateforme Crypto en Autoconservation | Héritage, Rendement, Paiements Mondiaux",
    description:
      "Que devient votre crypto à votre décès ? CryptoOwnBank y répond. Plateforme non dépositaire avec héritage crypto automatique (Plan Héritage), coffres de rendement RLUSD de 5-8%, trading sur DEX XRPL et Stellar, transferts mondiaux et suivi de portefeuille en cold wallet. Vos clés, votre crypto — même après votre départ.",
    ogTitle:
      "CryptoOwnBank — Devenez Votre Propre Banque | Héritage et Rendement Crypto sans Dépositaire",
    ogDescription:
      "Le seul tableau de bord crypto en autoconservation qui règle l'héritage, rapporte 5-8% de rendement en stablecoins et remplace votre banque. Non dépositaire. Plus de 190 pays. Gratuit pour commencer.",
    locale: "fr_FR",
  },
  tr: {
    title:
      "CryptoOwnBank — Kendi Saklamalı Kripto Platformu | Miras, Getiri, Küresel Ödemeler",
    description:
      "Öldüğünüzde kriptonuza ne olur? CryptoOwnBank bunu çözer. Otomatik kripto mirası (Miras Planı), %5-8 RLUSD getiri kasaları, XRPL ve Stellar DEX işlemleri, küresel havaleler ve soğuk cüzdan portföy takibi sunan saklamasız platform. Anahtarlarınız, kriptonuz — siz gittikten sonra bile.",
    ogTitle:
      "CryptoOwnBank — Kendi Bankan Ol | Saklamasız Kripto Mirası ve Getiri",
    ogDescription:
      "Mirası çözen, stablecoinlerde %5-8 getiri kazandıran ve bankanızın yerini alan tek saklamasız kripto paneli. Saklamasız. 190+ ülke. Başlaması ücretsiz.",
    locale: "tr_TR",
  },
  hi: {
    title:
      "CryptoOwnBank — सेल्फ-कस्टडी क्रिप्टो प्लेटफ़ॉर्म | विरासत, यील्ड, वैश्विक भुगतान",
    description:
      "आपके निधन के बाद आपकी क्रिप्टो का क्या होगा? CryptoOwnBank इसका समाधान देता है। नॉन-कस्टोडियल प्लेटफ़ॉर्म: स्वचालित क्रिप्टो विरासत (लिगेसी प्लान), 5-8% RLUSD यील्ड वॉल्ट, XRPL और Stellar DEX ट्रेडिंग, वैश्विक रेमिटेंस और कोल्ड वॉलेट पोर्टफोलियो ट्रैकिंग। आपकी चाबियाँ, आपकी क्रिप्टो — आपके जाने के बाद भी।",
    ogTitle:
      "CryptoOwnBank — अपना खुद का बैंक बनें | नॉन-कस्टोडियल क्रिप्टो विरासत और यील्ड",
    ogDescription:
      "एकमात्र सेल्फ-कस्टडी क्रिप्टो डैशबोर्ड जो विरासत हल करता है, स्टेबलकॉइन पर 5-8% यील्ड देता है और आपके बैंक की जगह लेता है। नॉन-कस्टोडियल। 190+ देश। शुरू करना मुफ़्त।",
    locale: "hi_IN",
  },
  zh: {
    title: "CryptoOwnBank — 自我保管加密平台 | 继承、收益、全球支付",
    description:
      "您离世后加密资产会怎样？CryptoOwnBank为您解决。非托管平台，提供自动加密继承（传承计划）、5-8% RLUSD收益金库、XRPL与Stellar DEX交易、全球汇款以及冷钱包投资组合追踪。您的私钥，您的加密资产——即使您离开也是如此。",
    ogTitle: "CryptoOwnBank — 成为自己的银行 | 非托管加密继承与收益",
    ogDescription:
      "唯一一个解决继承问题、赚取5-8%稳定币收益并取代银行的自我保管加密仪表板。非托管。190多个国家。免费开始。",
    locale: "zh_CN",
  },
};

export function pickLang(req: Request): SeoLang {
  const raw = (req.query?.lang ?? "").toString().toLowerCase();
  return (SEO_LANGS as readonly string[]).includes(raw) ? (raw as SeoLang) : "en";
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function replaceMeta(html: string, attr: string, value: string): string {
  const re = new RegExp(`(<meta ${attr} content=")[\\s\\S]*?("\\s*/>)`);
  return html.replace(re, `$1${escapeAttr(value)}$2`);
}

// Rewrites the static English <head> meta into the requested language so search
// engines and social cards see a genuinely localized document at ?lang= URLs.
// English is the source of truth and is returned unchanged.
export function localizeIndexHtml(html: string, lang: SeoLang): string {
  if (lang === "en" || !(lang in SEO)) return html;
  const s = SEO[lang as Exclude<SeoLang, "en">];
  let out = html;
  out = out.replace('<html lang="en">', `<html lang="${lang}">`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(s.title)}</title>`);
  out = replaceMeta(out, 'name="description"', s.description);
  out = replaceMeta(out, 'property="og:title"', s.ogTitle);
  out = replaceMeta(out, 'property="og:description"', s.ogDescription);
  out = replaceMeta(out, 'name="twitter:title"', s.ogTitle);
  out = replaceMeta(out, 'name="twitter:description"', s.ogDescription);
  out = out.replace(
    /(<meta property="og:locale" content=")[^"]*("\s*\/>)/,
    `$1${s.locale}$2`,
  );
  return out;
}

// Primary brand domain. Both cryptoownbank.com and the spare lifenest.me serve
// the same app, so we emit a canonical pointing at this origin no matter which
// host answered — that tells Google to credit one domain instead of splitting
// ranking across both.
const PRIMARY_ORIGIN = "https://cryptoownbank.com";

export function canonicalUrl(req: Request): string {
  const rawPath = (req.originalUrl || "/").split("?")[0] || "/";
  const path = rawPath === "/index.html" ? "/" : rawPath;
  const lang = pickLang(req);
  const query = lang !== "en" ? `?lang=${lang}` : "";
  return `${PRIMARY_ORIGIN}${path}${query}`;
}

export function setCanonical(html: string, url: string): string {
  const tag = `<link rel="canonical" href="${escapeAttr(url)}" />`;
  // Tolerant of attribute order / quote style / case so a future index.html
  // tweak can't silently leave a stale (or duplicate) canonical behind.
  const canonicalRe = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i;
  if (canonicalRe.test(html)) {
    return html.replace(canonicalRe, tag);
  }
  return html.replace(/<\/head>/, `    ${tag}\n  </head>`);
}

// Crypto-date campaign pages live at /promo/<slug>. Social scrapers (Twitter,
// Facebook, LinkedIn) don't run our client JS, so the per-campaign <head> that
// promo-campaign.tsx sets at runtime is invisible to them — a shared campaign
// link would otherwise fall back to the generic homepage card. This rewrites the
// served HTML head with the campaign's own title/description/OG so shared links
// carry the right preview. Campaign copy is English (agent-authored marketing),
// so it overrides any language localization on these specific pages.
function promoSlugFromReq(req: Request): string | null {
  const path = (req.originalUrl || "/").split("?")[0] || "/";
  const m = path.match(/^\/promo\/([^/]+)\/?$/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    // Malformed percent-encoding — treat as "no campaign" so we safely no-op.
    return null;
  }
}

export function applyCampaignMeta(html: string, req: Request): string {
  const slug = promoSlugFromReq(req);
  if (!slug) return html;
  const c = getCampaignBySlug(slug);
  if (!c) return html;

  const title = `${c.headline} | CryptoOwnBank`;
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`);
  out = replaceMeta(out, 'name="description"', c.subheadline);
  out = replaceMeta(out, 'property="og:title"', c.headline);
  out = replaceMeta(out, 'property="og:description"', c.subheadline);
  out = replaceMeta(out, 'name="twitter:title"', c.headline);
  out = replaceMeta(out, 'name="twitter:description"', c.subheadline);
  out = out.replace(
    /(<meta property="og:url" content=")[^"]*("\s*\/>)/,
    `$1${escapeAttr(`${PRIMARY_ORIGIN}/promo/${c.slug}`)}$2`,
  );
  return out;
}

// One call that both localizes the head meta and sets the canonical for the
// current request. Used by the dev (vite) and prod (static) document servers.
export function localizeAndCanonicalize(html: string, req: Request): string {
  const localized = localizeIndexHtml(html, pickLang(req));
  const withCampaign = applyCampaignMeta(localized, req);
  return setCanonical(withCampaign, canonicalUrl(req));
}
