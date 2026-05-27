import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeoHead } from "@/components/seo-head";
import { ArrowRight, Clock, Sparkles, TrendingUp, Heart } from "lucide-react";
import { HELP_GUIDES, HELP_SECTIONS, type GuideMeta } from "@shared/help-guides";

const SECTION_ICONS = {
  start: Sparkles,
  grow: TrendingUp,
  legacy: Heart,
} as const;

function GuideCard({ guide }: { guide: GuideMeta }) {
  const isLive = guide.status === "live";
  const inner = (
    <Card
      className={`h-full ${isLive ? "hover-elevate active-elevate-2 transition-all" : "opacity-60"}`}
      data-testid={`card-guide-${guide.slug}`}
    >
      <CardContent className="pt-5 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{guide.readMinutes} min</span>
          {!isLive && <Badge variant="outline" className="text-xs ml-auto">Coming soon</Badge>}
        </div>
        <h3 className="font-semibold text-foreground flex items-center justify-between gap-2">
          {guide.title}
          {isLive && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{guide.blurb}</p>
      </CardContent>
    </Card>
  );
  if (!isLive) return <div>{inner}</div>;
  return (
    <Link href={`/help/${guide.slug}`} className="block h-full" data-testid={`link-guide-${guide.slug}`}>
      {inner}
    </Link>
  );
}

export default function HelpIndex() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Help & Guides — CryptoOwnBank"
        description="Step-by-step micro-guides: create your first wallet, buy crypto, earn yield on a Soil vault, set up your Legacy Plan. Each guide is 2–4 minutes."
        path="/help"
      />
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <div className="space-y-3 mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground" data-testid="heading-help">
            Help & Guides
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Short, chained guides. Start anywhere — each guide tells you what to do next, and
            links sideways if your starting point is different.
          </p>
        </div>

        <div className="space-y-12">
          {HELP_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id];
            const guides = HELP_GUIDES.filter((g) => g.section === section.id);
            return (
              <section key={section.id} data-testid={`section-${section.id}`}>
                <div className="flex items-start gap-3 mb-5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{section.label}</h2>
                    <p className="text-sm text-muted-foreground">{section.tagline}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guides.map((g) => (
                    <GuideCard key={g.slug} guide={g} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
