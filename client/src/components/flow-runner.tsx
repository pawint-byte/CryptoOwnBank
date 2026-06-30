import { Link } from "wouter";
import {
  CheckCircle2,
  Lock,
  Loader2,
  ArrowRight,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Flow, FlowStep, StepStatus } from "@/lib/flows/types";

const dot: Record<StepStatus, string> = {
  ready: "bg-emerald-500 border-emerald-500",
  action: "bg-amber-400 border-amber-400 animate-pulse",
  pending: "bg-sky-400 border-sky-400 animate-pulse",
  locked: "bg-transparent border-muted-foreground/30",
};

const ring: Record<StepStatus, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/5",
  action: "border-amber-400/40 bg-amber-400/5",
  pending: "border-sky-400/40 bg-sky-400/5",
  locked: "border-border bg-muted/20 opacity-70",
};

const titleColor: Record<StepStatus, string> = {
  ready: "text-emerald-700 dark:text-emerald-300",
  action: "text-amber-700 dark:text-amber-300",
  pending: "text-sky-700 dark:text-sky-300",
  locked: "text-muted-foreground",
};

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "ready")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === "action")
    return <ArrowRight className="h-4 w-4 text-amber-500 shrink-0" />;
  if (status === "pending")
    return <Loader2 className="h-4 w-4 text-sky-500 shrink-0 animate-spin" />;
  return <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
}

function gateTag(gate: FlowStep["gate"]) {
  const isPlatform = gate === "platform";
  return (
    <span
      className={`text-[10px] uppercase tracking-wide rounded px-1 py-0.5 ${
        isPlatform
          ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
          : "bg-sky-500/10 text-sky-600 dark:text-sky-300"
      }`}
      data-testid={`tag-gate-${gate}`}
    >
      {isPlatform ? "plan" : "chain"}
    </span>
  );
}

function StepActionButton({ step }: { step: FlowStep }) {
  const action = step.action;
  if (!action) return null;

  const className = "h-7 text-xs border-amber-400/50";

  if (action.kind === "inline") {
    return (
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={() => action.run?.()}
        disabled={action.busy || action.disabled}
        data-testid={`button-step-${step.id}`}
      >
        {action.busy ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Working…
          </>
        ) : (
          action.label
        )}
      </Button>
    );
  }

  if (action.kind === "external") {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer">
        <Button
          size="sm"
          variant="outline"
          className={className}
          data-testid={`button-step-${step.id}`}
        >
          {action.label}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </a>
    );
  }

  return (
    <Link href={action.href || "#"}>
      <Button
        size="sm"
        variant="outline"
        className={className}
        data-testid={`button-step-${step.id}`}
      >
        {action.label}
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </Link>
  );
}

/**
 * Generic guided-flow timeline. Green = done, amber = your move, grey = locked.
 * Every status comes from real wallet/network state via the readiness hook, so a
 * member never hits a dead end. Generalized from the vault "clear lane".
 */
export function FlowRunner({ flow }: { flow: Flow }) {
  const steps = flow.steps;
  const greenCount = steps.filter((s) => s.status === "ready").length;

  return (
    <div className="rounded-lg border p-3 space-y-2" data-testid="flow-runner">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{flow.title}</p>
          <p className="text-xs text-muted-foreground">{flow.subtitle}</p>
        </div>
        <span
          className="text-[11px] text-muted-foreground shrink-0"
          data-testid="text-flow-progress"
        >
          {greenCount}/{steps.length} done
        </span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex gap-2.5">
              <div className="flex flex-col items-center pt-1">
                <span
                  className={`h-3 w-3 rounded-full border-2 ${dot[step.status]}`}
                />
                {i < steps.length - 1 && (
                  <span className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              <div
                className={`flex-1 rounded-md border px-2.5 py-1.5 ${ring[step.status]}`}
                data-testid={`flow-step-${step.id}`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${titleColor[step.status]}`} />
                  <span className={`text-xs font-medium ${titleColor[step.status]}`}>
                    {step.title}
                  </span>
                  {gateTag(step.gate)}
                  <span className="ml-auto">
                    <StatusIcon status={step.status} />
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {step.detail}
                </p>
                {(step.action || step.aidHref) && (
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    <StepActionButton step={step} />
                    {step.aidHref && (
                      <Link href={step.aidHref}>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-300 hover:underline"
                          data-testid={`link-aid-${step.id}`}
                        >
                          <HelpCircle className="h-3 w-3" />
                          {step.aidLabel || "Learn how"}
                        </span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
