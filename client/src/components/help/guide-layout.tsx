import { ReactNode } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/seo-head";
import { ArrowLeft, ArrowRight, Clock, ImageIcon } from "lucide-react";
import { getGuide } from "@shared/help-guides";

export interface GuideStep {
  title: string;
  body: ReactNode;
  imageAlt: string;
  imageSrc?: string;
}

interface GuideLayoutProps {
  slug: string;
  beforeYouStart: ReactNode;
  steps: GuideStep[];
  closing?: ReactNode;
}

export function GuideLayout({ slug, beforeYouStart, steps, closing }: GuideLayoutProps) {
  const guide = getGuide(slug);
  if (!guide) return null;
  const nextGuide = guide.next ? getGuide(guide.next) : undefined;
  const sidewaysGuide = guide.sideways ? getGuide(guide.sideways.slug) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title={`${guide.title} — CryptoOwnBank Help`}
        description={guide.blurb}
        path={`/help/${guide.slug}`}
      />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          data-testid="link-back-to-help"
        >
          <ArrowLeft className="h-4 w-4" />
          All guides
        </Link>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{guide.readMinutes} min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground" data-testid={`heading-guide-${guide.slug}`}>
            {guide.title}
          </h1>
          <p className="text-muted-foreground">{guide.blurb}</p>
        </div>

        <Card className="mb-8 border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Before you start: </span>
            {beforeYouStart}
          </CardContent>
        </Card>

        <ol className="space-y-8 mb-10">
          {steps.map((step, i) => (
            <li key={i} className="space-y-3" data-testid={`step-${i + 1}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="space-y-1 pt-0.5">
                  <h2 className="font-semibold text-foreground">{step.title}</h2>
                  <div className="text-sm text-muted-foreground leading-relaxed">{step.body}</div>
                </div>
              </div>
              <div className="ml-10">
                {step.imageSrc ? (
                  <img
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    className="rounded-lg border border-border w-full"
                    data-testid={`img-step-${i + 1}`}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 aspect-[16/10] flex flex-col items-center justify-center gap-2 text-muted-foreground p-4">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-xs text-center">Screenshot coming: {step.imageAlt}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        {closing && <div className="mb-10 text-sm text-muted-foreground">{closing}</div>}

        <div className="space-y-3">
          {nextGuide && (
            <Link href={`/help/${nextGuide.slug}`} className="block" data-testid="link-next-guide">
                <Card className="hover-elevate active-elevate-2 transition-all">
                  <CardContent className="pt-5 pb-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Next</Badge>
                        {nextGuide.status === "coming" && (
                          <Badge variant="outline" className="text-xs">Coming soon</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{nextGuide.readMinutes} min</span>
                      </div>
                      <p className="font-medium text-foreground">{nextGuide.title}</p>
                      <p className="text-sm text-muted-foreground">{nextGuide.blurb}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
            </Link>
          )}
          {sidewaysGuide && guide.sideways && (
            <Link href={`/help/${sidewaysGuide.slug}`} className="block" data-testid="link-sideways-guide">
                <Card className="hover-elevate active-elevate-2 transition-all border-dashed">
                  <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Different starting point?</Badge>
                        {sidewaysGuide.status === "coming" && (
                          <Badge variant="outline" className="text-xs">Coming soon</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{guide.sideways.label}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
