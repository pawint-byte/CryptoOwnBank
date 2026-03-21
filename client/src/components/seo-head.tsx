import { useEffect } from "react";

const BASE_URL = "https://cryptoownbank.com";
const SITE_NAME = "CryptoOwnBank";
const DEFAULT_TITLE = "CryptoOwnBank — Be Your Own Bank | Multi-Chain Crypto Platform";
const DEFAULT_DESCRIPTION = "Non-custodial multi-chain crypto platform. Portfolio tracker, RLUSD yield vaults (5-8% APR), XRPL & Stellar DEX trading, EVM swaps via 1inch, cross-chain bridging, DCA orders, Legacy Plan, whale alerts, and more. Your keys, your crypto.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

interface SeoHeadProps {
  title?: string;
  description?: string;
  path?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function setMetaTag(property: string, content: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (el) {
    el.setAttribute("content", content);
  } else {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    el.content = content;
    document.head.appendChild(el);
  }
}

function setCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (link) {
    link.href = url;
  } else {
    link = document.createElement("link");
    link.rel = "canonical";
    link.href = url;
    document.head.appendChild(link);
  }
}

export function SeoHead({
  title,
  description,
  path = "/",
  ogTitle,
  ogDescription,
  ogType = "website",
  jsonLd,
}: SeoHeadProps) {
  useEffect(() => {
    const fullTitle = title || DEFAULT_TITLE;
    const fullDescription = description || DEFAULT_DESCRIPTION;
    const canonicalUrl = `${BASE_URL}${path}`;

    document.title = fullTitle;
    setMetaTag("description", fullDescription);
    setCanonical(canonicalUrl);

    setMetaTag("og:title", ogTitle || fullTitle, true);
    setMetaTag("og:description", ogDescription || fullDescription, true);
    setMetaTag("og:type", ogType, true);
    setMetaTag("og:url", canonicalUrl, true);
    setMetaTag("og:image", DEFAULT_OG_IMAGE, true);
    setMetaTag("og:image:width", "1200", true);
    setMetaTag("og:image:height", "675", true);

    setMetaTag("twitter:title", ogTitle || fullTitle);
    setMetaTag("twitter:description", ogDescription || fullDescription);
    setMetaTag("twitter:image", DEFAULT_OG_IMAGE);

    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement("script");
      jsonLdScript.type = "application/ld+json";
      const data = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      jsonLdScript.textContent = JSON.stringify(data.length === 1 ? data[0] : data);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag("description", DEFAULT_DESCRIPTION);
      setMetaTag("og:title", DEFAULT_TITLE, true);
      setMetaTag("og:description", DEFAULT_DESCRIPTION, true);
      setMetaTag("og:url", BASE_URL, true);
      setMetaTag("og:type", "website", true);
      setCanonical(BASE_URL);
      if (jsonLdScript && jsonLdScript.parentNode) {
        jsonLdScript.parentNode.removeChild(jsonLdScript);
      }
    };
  }, [title, description, path, ogTitle, ogDescription, ogType, jsonLd]);

  return null;
}
