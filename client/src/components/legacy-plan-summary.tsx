import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, AlertCircle } from "lucide-react";

type Beneficiary = {
  id: string;
  name: string;
  email: string;
  relationship: string | null;
  walletType: string | null;
  walletNickname: string | null;
  beneficiaryGroup: string | null;
  splitPieces: string | null;
  shardIndex: number | null;
  encryptedVault: string | null;
  vaultTested?: boolean;
  confirmationStatus?: string;
};

type PlanResponse = { plan: any; beneficiaries: Beneficiary[] };

function walletLabel(b: Beneficiary): string {
  if (b.walletNickname && b.walletNickname.trim()) return b.walletNickname.trim();
  if (b.walletType) return b.walletType;
  return "a wallet";
}

function groupKey(b: Beneficiary): string {
  if (b.beneficiaryGroup && b.beneficiaryGroup.trim()) return `group:${b.beneficiaryGroup.trim().toLowerCase()}`;
  return `wallet:${(b.walletNickname || "").toLowerCase()}|${(b.walletType || "").toLowerCase()}|${b.id}`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "no one";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function deliveryClause(b: Beneficiary, sharedCount: number): string {
  const protectedNote = b.encryptedVault
    ? (b.vaultTested ? " (protected by your passphrase, which you've confirmed works)" : " (protected by your passphrase \u2014 not yet test-decrypted)")
    : "";
  if (sharedCount > 1) {
    const piece = b.shardIndex != null ? ` (piece ${b.shardIndex + 1} of ${sharedCount})` : "";
    return `each receives their own envelope at the same time${piece}, then must coordinate to recover the wallet together${protectedNote}`;
  }
  return `receives the full recovery instructions${protectedNote}`;
}

export function LegacyPlanSummary() {
  const { data, isLoading } = useQuery<PlanResponse>({ queryKey: ["/api/legacy-plan"] });

  if (isLoading || !data) {
    return (
      <Card data-testid="card-plan-summary-loading">
        <CardHeader><CardTitle>Plan in Plain English</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  const beneficiaries = data.beneficiaries || [];

  if (beneficiaries.length === 0) {
    return (
      <Card data-testid="card-plan-summary-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Plan in Plain English
          </CardTitle>
          <CardDescription>Once you add wallets and people, you'll see your plan written out here in the same words you'd use to explain it to your family.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-summary-empty">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>No beneficiaries yet. Add at least one to see your plan summary.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groups = new Map<string, Beneficiary[]>();
  for (const b of beneficiaries) {
    const k = groupKey(b);
    const arr = groups.get(k) || [];
    arr.push(b);
    groups.set(k, arr);
  }

  const sentences: { id: string; text: string; pending: boolean }[] = [];
  for (const [k, members] of groups) {
    const sample = members[0];
    const wallet = walletLabel(sample);
    const names = members.map(m => m.name);
    const anyPending = members.some(m => m.confirmationStatus && m.confirmationStatus !== "confirmed");
    let sentence: string;
    if (members.length === 1) {
      const rel = sample.relationship ? ` (your ${sample.relationship.toLowerCase()})` : "";
      sentence = `${sample.name}${rel} receives the ${wallet} alone, and ${deliveryClause(sample, 1)}.`;
    } else {
      sentence = `${joinNames(names)} share the ${wallet} \u2014 ${deliveryClause(sample, members.length)}.`;
    }
    sentences.push({ id: k, text: sentence, pending: anyPending });
  }

  return (
    <Card data-testid="card-plan-summary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Plan in Plain English
        </CardTitle>
        <CardDescription>If this reads the way you'd explain it to your family, your plan is right.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-muted/30 p-5 space-y-3 text-sm leading-relaxed" data-testid="text-summary-body">
          <p className="font-medium text-foreground">When something happens to you:</p>
          <ul className="space-y-2 list-disc pl-5">
            {sentences.map(s => (
              <li key={s.id} data-testid={`summary-line-${s.id}`}>
                <span className={s.pending ? "text-muted-foreground" : "text-foreground"}>{s.text}</span>
                {s.pending && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400" data-testid={`summary-pending-${s.id}`}>
                    {"\u2014 not yet confirmed by recipient"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Read this to yourself out loud. If a sentence sounds wrong or surprises you, edit that beneficiary above and the summary will update.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
