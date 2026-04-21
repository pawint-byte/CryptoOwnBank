import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertTriangle, Lightbulb, ShieldAlert, X, ArrowRight } from "lucide-react";
import { Link } from "wouter";

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
  totalWallets: number;
  coveredWallets: number;
  totalBeneficiaries: number;
  confirmedBeneficiaries: number;
  slip39: { total: number; threshold: number; assigned: number } | null;
  checks: Check[];
};

const SEVERITY_META: Record<Severity, { label: string; cls: string; icon: any; barCls: string }> = {
  critical: { label: "Critical", cls: "border-red-500/40 bg-red-500/5", icon: ShieldAlert, barCls: "text-red-500" },
  warning: { label: "Warning", cls: "border-amber-500/40 bg-amber-500/5", icon: AlertTriangle, barCls: "text-amber-500" },
  tip: { label: "Tip", cls: "border-blue-500/30 bg-blue-500/5", icon: Lightbulb, barCls: "text-blue-500" },
};

function scoreColor(score: number) {
  if (score >= 85) return "text-green-500";
  if (score >= 65) return "text-amber-500";
  return "text-red-500";
}

function scoreLabel(score: number) {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Solid";
  if (score >= 65) return "Needs attention";
  if (score >= 40) return "At risk";
  return "Not ready";
}

export function LegacyReadinessPanel() {
  const { data, isLoading } = useQuery<Readiness>({
    queryKey: ["/api/legacy-plan/readiness"],
    refetchInterval: 60000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (tipId: string) => apiRequest("POST", "/api/legacy-plan/dismiss-tip", { tipId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan/readiness"] }),
  });

  if (isLoading || !data) {
    return (
      <Card data-testid="card-readiness-loading">
        <CardHeader><CardTitle>Plan Readiness</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  const critical = data.checks.filter(c => c.severity === "critical");
  const warnings = data.checks.filter(c => c.severity === "warning");
  const tips = data.checks.filter(c => c.severity === "tip");
  const allClear = data.checks.length === 0;

  return (
    <Card className="border-2" data-testid="card-readiness-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Plan Readiness
            </CardTitle>
            <CardDescription>One score that tells you if your plan will actually work when it has to.</CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${scoreColor(data.score)}`} data-testid="text-readiness-score">{data.score}</div>
            <div className={`text-sm font-medium ${scoreColor(data.score)}`}>{scoreLabel(data.score)}</div>
          </div>
        </div>
        <Progress value={data.score} className="h-2 mt-3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded border p-2" data-testid="stat-wallets">
            <div className="text-muted-foreground text-xs">Wallets covered</div>
            <div className="font-semibold">{data.coveredWallets} / {data.totalWallets}</div>
          </div>
          <div className="rounded border p-2" data-testid="stat-beneficiaries">
            <div className="text-muted-foreground text-xs">Beneficiaries confirmed</div>
            <div className="font-semibold">{data.confirmedBeneficiaries} / {data.totalBeneficiaries}</div>
          </div>
          <div className="rounded border p-2" data-testid="stat-slip39">
            <div className="text-muted-foreground text-xs">SLIP-39 shards</div>
            <div className="font-semibold">{data.slip39 ? `${data.slip39.assigned} / ${data.slip39.total} (need ${data.slip39.threshold})` : "Not configured"}</div>
          </div>
          <div className="rounded border p-2" data-testid="stat-issues">
            <div className="text-muted-foreground text-xs">Issues to fix</div>
            <div className="font-semibold">{critical.length + warnings.length} blocking, {tips.length} tips</div>
          </div>
        </div>

        {allClear && (
          <div className="flex items-center gap-2 rounded border border-green-500/40 bg-green-500/5 p-3 text-sm" data-testid="text-all-clear">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span>Your plan looks solid. Keep checking in and we'll keep watching for changes.</span>
          </div>
        )}

        {[...critical, ...warnings, ...tips].map(check => {
          const meta = SEVERITY_META[check.severity];
          const Icon = meta.icon;
          return (
            <div key={check.id} className={`rounded border-l-4 ${meta.cls} p-3`} data-testid={`check-${check.id}`}>
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 flex-shrink-0 ${meta.barCls}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={meta.barCls}>{meta.label}</Badge>
                    <span className="font-semibold text-sm">{check.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {check.fixUrl && (
                      check.fixUrl.startsWith("/") ? (
                        <Link href={check.fixUrl}>
                          <Button size="sm" variant="outline" data-testid={`button-fix-${check.id}`}>
                            {check.fixLabel || "Fix"} <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" asChild>
                          <a href={check.fixUrl} target="_blank" rel="noopener noreferrer">{check.fixLabel || "Fix"}</a>
                        </Button>
                      )
                    )}
                    {check.severity === "tip" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissMutation.mutate(check.id)}
                        disabled={dismissMutation.isPending}
                        data-testid={`button-dismiss-${check.id}`}
                      >
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
