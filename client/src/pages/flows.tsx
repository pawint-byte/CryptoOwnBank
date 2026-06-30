import { useState, useEffect } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowRunner } from "@/components/flow-runner";
import { useReadiness } from "@/lib/flows/use-readiness";
import { buildFlow } from "@/lib/flows/definitions";
import type { Goal, Rail, AssetKind } from "@/lib/flows/types";
import { RAIL_LABEL, assetSymbol } from "@/lib/flows/types";

function readParam<T extends string>(key: string, allowed: T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = new URLSearchParams(window.location.search).get(key) as T | null;
  return v && allowed.includes(v) ? v : fallback;
}

const goalMeta: { value: Goal; label: string; icon: typeof ArrowDownToLine; blurb: string }[] = [
  {
    value: "get-paid",
    label: "Get paid in crypto",
    icon: ArrowDownToLine,
    blurb: "Set yourself up to receive, then send a payment request.",
  },
  {
    value: "pay",
    label: "Pay someone in crypto",
    icon: ArrowUpFromLine,
    blurb: "Get ready to send, then sign the payment with your own keys.",
  },
];

const rails: Rail[] = ["xrpl", "stellar"];

function PickerButton({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-[#00A4E4] bg-[#00A4E4]/10 text-[#00A4E4] font-medium"
          : "border-border hover:bg-muted/50 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function FlowsPage() {
  const [goal, setGoal] = useState<Goal>(
    readParam<Goal>("goal", ["get-paid", "pay"], "get-paid"),
  );
  const [rail, setRail] = useState<Rail>(
    readParam<Rail>("rail", ["xrpl", "stellar"], "xrpl"),
  );
  const [asset, setAsset] = useState<AssetKind>(
    readParam<AssetKind>("asset", ["native", "stable"], "native"),
  );

  const readiness = useReadiness();
  const flow = buildFlow({ goal, rail, asset, readiness });

  useEffect(() => {
    const prev = document.title;
    document.title = "Get Paid or Pay — Guided Setup | CryptoOwnBank";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          What do you want to do?
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a goal and we'll line up every step — plan and wallet alike — so
          nothing's missed. Both sides see the same checklist. You're the only one
          who says yes.
        </p>
      </div>

      {/* Goal picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {goalMeta.map((g) => {
          const Icon = g.icon;
          const active = goal === g.value;
          return (
            <Card
              key={g.value}
              onClick={() => setGoal(g.value)}
              data-testid={`card-goal-${g.value}`}
              className={`cursor-pointer transition-colors ${
                active ? "border-[#00A4E4] ring-1 ring-[#00A4E4]/30" : "hover:bg-muted/30"
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${active ? "text-[#00A4E4]" : "text-muted-foreground"}`}
                  />
                  {g.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{g.blurb}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rail + asset pickers */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Rail
          </span>
          {rails.map((rl) => (
            <PickerButton
              key={rl}
              active={rail === rl}
              onClick={() => setRail(rl)}
              testId={`button-rail-${rl}`}
            >
              {RAIL_LABEL[rl]}
            </PickerButton>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Coin
          </span>
          <PickerButton
            active={asset === "native"}
            onClick={() => setAsset("native")}
            testId="button-asset-native"
          >
            {assetSymbol(rail, "native")}
          </PickerButton>
          <PickerButton
            active={asset === "stable"}
            onClick={() => setAsset("stable")}
            testId="button-asset-stable"
          >
            {assetSymbol(rail, "stable")}
          </PickerButton>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs ml-auto"
          onClick={() => readiness.refresh()}
          data-testid="button-refresh-readiness"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      <FlowRunner flow={flow} />

      <p className="text-[11px] text-muted-foreground leading-snug">
        CryptoOwnBank brings everything to the table so you can set up, review,
        approve, and track — but you sign with your own keys and we never hold your
        funds. Reserve amounts shown are set by the network, not by us.
      </p>
    </div>
  );
}
