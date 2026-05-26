import { useState } from "react";
import { useUserData } from "@/hooks/use-user-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { KeyRound, CheckCircle2 } from "lucide-react";

const STATEMENTS = [
  "If I lose my secret words and don't have a family backup, the money is gone forever. No one — not even CryptoOwnBank — can recover it for me.",
  "Anyone who has my secret words can take everything in this wallet. I'll keep them physically secret, like cash hidden in the mattress.",
  "CryptoOwnBank will never ask me for my secret words. Anyone who does — by email, phone, chat, or text — is trying to rob me.",
  "Screenshots, photos, cloud notes, password managers, and email drafts of my secret words can all be hacked. Pen and paper, or steel, is safer.",
  "Big amounts deserve big protection. For meaningful money, I'll set up either a family split (Recovery Kit) or a 2-of-3 wallet so no single mistake or theft loses everything.",
];

interface Props {
  intent?: "create" | "import" | "general";
}

export function SovereigntyAcknowledgement({ intent = "general" }: Props) {
  const { data: acknowledgedAt, save, isSaving } = useUserData<string | null>(
    "sovereignty_acknowledged_at",
    null,
  );
  const [checked, setChecked] = useState<boolean[]>(STATEMENTS.map(() => false));
  const allChecked = checked.every(Boolean);

  if (acknowledgedAt) {
    const date = new Date(acknowledgedAt).toLocaleDateString();
    return (
      <Card
        className="border-emerald-500/30 bg-emerald-500/5"
        data-testid="card-sovereignty-acknowledged"
      >
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Sovereignty acknowledged on {date}</div>
            <div className="text-muted-foreground text-xs mt-1">
              You confirmed you understand how self-custody works. We'll never ask again.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const intros: Record<NonNullable<Props["intent"]>, string> = {
    create:
      "Before you start using this new wallet, take 30 seconds to confirm you understand how self-custody works. We do this once. You'll never see it again.",
    import:
      "Quick sovereignty refresher — even if you've done this before with other wallets. We ask once, then never again.",
    general:
      "Take 30 seconds to confirm you understand how self-custody works. This is the foundation everything else on the site stands on. We ask once, then never again.",
  };

  const handleSubmit = () => {
    if (!allChecked || isSaving) return;
    save(new Date().toISOString());
  };

  return (
    <Card
      className="border-amber-500/40 bg-amber-500/5"
      data-testid="card-sovereignty-acknowledgement"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-5 w-5 text-amber-600" />
          Sovereignty Acknowledgement
        </CardTitle>
        <CardDescription>{intros[intent]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {STATEMENTS.map((statement, i) => (
          <label
            key={i}
            className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border/50 hover-elevate cursor-pointer"
            data-testid={`sovereignty-statement-${i}`}
          >
            <Checkbox
              checked={checked[i]}
              onCheckedChange={(v) => {
                const next = [...checked];
                next[i] = !!v;
                setChecked(next);
              }}
              className="mt-0.5"
              data-testid={`checkbox-sovereignty-${i}`}
            />
            <span className="text-sm leading-relaxed">{statement}</span>
          </label>
        ))}
        <Button
          onClick={handleSubmit}
          disabled={!allChecked || isSaving}
          className="w-full"
          data-testid="button-acknowledge-sovereignty"
        >
          {isSaving
            ? "Saving..."
            : allChecked
              ? "I understand. Acknowledge sovereignty."
              : `Check all ${STATEMENTS.length} statements to continue`}
        </Button>
      </CardContent>
    </Card>
  );
}
