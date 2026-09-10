// NOTE: Full-document GET /faq is owned by Express (server/routes.ts) for crawler HTML.
// This React page remains for client-side / in-app routing & HMR, but a hard navigation
// or crawler fetch of /faq receives the server-rendered plain FAQ, not this SPA shell.

import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/seo-head";

import { localizeFaqGroups } from "@shared/faq-p0-i18n";
import { useLangStore } from "@/i18n/store";
import { useTranslations } from "@/i18n";


function FAQItem({ q, a, forceOpen, highlight }: { q: string; a: string; forceOpen?: boolean; highlight?: string }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const hasHtml = a.includes("<a ");

  const highlightText = (text: string, term: string) => {
    if (!term || term.length < 2) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
  };

  const displayQ = highlight ? highlightText(q, highlight) : q;
  const displayA = highlight ? highlightText(a, highlight) : a;
  const shouldRenderHtml = hasHtml || !!highlight;

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left gap-4"
        data-testid={`faq-toggle-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
      >
        {shouldRenderHtml ? (
          <span className="font-medium text-foreground" dangerouslySetInnerHTML={{ __html: displayQ }} />
        ) : (
          <span className="font-medium text-foreground">{q}</span>
        )}
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <p className="pb-5 text-muted-foreground leading-relaxed pr-8" dangerouslySetInnerHTML={{ __html: shouldRenderHtml ? displayA : a }} />
      )}
    </div>
  );
}

export default function FAQ() {
  const lang = useLangStore((s) => s.lang);
  const t = useTranslations();
  const groups = useMemo(() => localizeFaqGroups(lang), [lang]);

  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("q") ?? "";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setTimeout(() => {
        const el = document.querySelector('[data-testid="input-faq-search"]') as HTMLInputElement | null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, []);

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a.replace(/<[^>]*>/g, ""),
        },
      }))
    ),
  }), [groups]);

  const searchTerm = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.q.toLowerCase().includes(searchTerm) ||
            item.a.toLowerCase().includes(searchTerm)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchTerm, groups]);

  const totalResults = filteredGroups.reduce((s, g) => s + g.items.length, 0);
  const isSearching = searchTerm.length >= 2;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <SeoHead
        title="FAQ — CryptoOwnBank | Frequently Asked Questions"
        description="Get answers about CryptoOwnBank — portfolio tracking across 32+ blockchains, RLUSD yield vaults, cold wallet security, crypto news, whale alerts, technical analysis, exchange API keys, stablecoins, and more."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <div>
        <h1 className="text-3xl font-bold" data-testid="faq-title">{t.faq.title}</h1>
        <p className="text-muted-foreground mt-2">{t.faq.subtitle}</p>
        {lang !== "en" && (
          <p className="text-sm text-muted-foreground mt-2 italic" data-testid="faq-english-notice">
            {t.faq.englishNotice}
          </p>
        )}
      </div>

      <div className="relative" data-testid="faq-search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.faq.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-10"
          data-testid="input-faq-search"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setSearch("")}
            data-testid="button-clear-faq-search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isSearching && (
        <p className="text-sm text-muted-foreground" data-testid="text-faq-search-results">
          {totalResults === 0
            ? `${t.faq.noResults} "${search}" — ${t.faq.noResultsHint}`
            : `${totalResults} ${totalResults !== 1 ? t.faq.resultMany : t.faq.resultOne} "${search}"`}
        </p>
      )}

      {filteredGroups.map((group, groupIndex) => (
        <div key={group.groupKey || groupIndex} className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground mb-2" data-testid={`faq-group-${groupIndex}`}>
            {(t.faq.groups as Record<string, string>)[group.groupKey] || group.heading}
          </h2>
          <div className="rounded-lg border bg-card">
            {group.items.map((faq, index) => (
              <FAQItem
                key={index}
                q={faq.q}
                a={faq.a}
                forceOpen={isSearching}
                highlight={isSearching ? search.trim() : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
