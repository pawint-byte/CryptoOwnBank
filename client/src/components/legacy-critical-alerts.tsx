import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Severity = "critical" | "warning" | "tip";

type Check = {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  fixUrl?: string;
  fixLabel?: string;
};

type Readiness = {
  score: number;
  checks: Check[];
};

/**
 * Above-the-fold strip of critical/warning readiness checks only.
 * Tips stay in LegacyReadinessPanel. Renders nothing when clear.
 */
export function LegacyCriticalAlerts() {
  const { data, isLoading } = useQuery<Readiness>({
    queryKey: ["/api/legacy-plan/readiness"],
    refetchInterval: 60000,
  });

  if (isLoading || !data) return null;

  const alerts = data.checks.filter(
    (c) => c.severity === "critical" || c.severity === "warning",
  );
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="legacy-critical-alerts">
      {alerts.map((check) => {
        const isCritical = check.severity === "critical";
        const Icon = isCritical ? ShieldAlert : AlertTriangle;
        const borderCls = isCritical
          ? "border-red-500/50 bg-red-500/5"
          : "border-amber-500/50 bg-amber-500/5";
        const iconCls = isCritical ? "text-red-500" : "text-amber-500";
        return (
          <div
            key={check.id}
            className={`rounded-lg border ${borderCls} px-3 py-2.5 flex items-start gap-2.5`}
            data-testid={`legacy-alert-${check.id}`}
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconCls}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-snug">{check.title}</div>
              {check.message && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{check.message}</p>
              )}
            </div>
            {check.fixUrl?.startsWith("/") && (
              <Link href={check.fixUrl}>
                <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" data-testid={`button-alert-fix-${check.id}`}>
                  {check.fixLabel || "Fix"}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}