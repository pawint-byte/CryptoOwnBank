import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollText, AlertCircle, Briefcase, ShieldCheck, Building2, Car, Gem, Package, Phone, Globe } from "lucide-react";
import type { OffChainHolding } from "@shared/schema";

const OC_TYPE_LABEL: Record<string, string> = {
  startup: "Startup / Seed Investment",
  insurance: "Insurance Policy",
  brokerage: "Brokerage / Retirement",
  vehicle: "Vehicle",
  collectible: "Collectible",
  other: "Other",
};
const OC_TYPE_ICON: Record<string, any> = {
  startup: Briefcase, insurance: ShieldCheck, brokerage: Building2,
  vehicle: Car, collectible: Gem, other: Package,
};

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
  const { data: offChain = [] } = useQuery<OffChainHolding[]>({ queryKey: ["/api/off-chain-holdings"] });

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

        {offChain.filter(h => h.status === "active").length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3" data-testid="legacy-off-chain-section">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-600" />
              <p className="font-medium text-sm text-amber-700 dark:text-amber-500">
                Off-chain assets your family will need to know about
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              These items aren't on a blockchain. Your beneficiary will need to contact each provider directly to claim them.
            </p>
            <div className="space-y-2">
              {offChain.filter(h => h.status === "active").map(h => {
                const Icon = OC_TYPE_ICON[h.assetType] || Package;
                const url = h.contactUrl
                  ? (h.contactUrl.startsWith("http") ? h.contactUrl : `https://${h.contactUrl}`)
                  : null;
                const cv = parseFloat(h.currentValue || "0") || parseFloat(h.amountInvested || "0");
                return (
                  <div key={h.id} className="rounded border bg-background p-2.5 text-xs" data-testid={`legacy-off-chain-${h.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Icon className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground flex items-center gap-1 flex-wrap">
                            <span>{h.name}</span>
                            {h.provider && <Badge variant="outline" className="text-[10px] px-1 py-0">{h.provider}</Badge>}
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            {OC_TYPE_LABEL[h.assetType] || h.assetType}
                            {h.accountIdentifier && <> · {h.assetType === "insurance" ? "Policy #" : "Acct #"} <span className="font-mono">{h.accountIdentifier}</span></>}
                          </div>
                          {h.quantity && (
                            <div className="text-foreground/80 mt-0.5">{h.quantity}</div>
                          )}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {url && (
                              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" data-testid={`legacy-url-${h.id}`}>
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[180px]">{h.contactUrl?.replace(/^https?:\/\//, "")}</span>
                              </a>
                            )}
                            {h.contactPhone && (
                              <a href={`tel:${h.contactPhone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 text-primary hover:underline" data-testid={`legacy-phone-${h.id}`}>
                                <Phone className="h-3 w-3" />
                                <span>{h.contactPhone}</span>
                              </a>
                            )}
                          </div>
                          {(h.beneficiaryName || h.legacyInstructions) && (
                            <div className="mt-1.5 pt-1.5 border-t border-amber-500/20 text-[11px]">
                              {h.beneficiaryName && (
                                <div><span className="font-medium text-amber-700 dark:text-amber-500">Goes to:</span> {h.beneficiaryName}{h.beneficiaryContact && ` (${h.beneficiaryContact})`}</div>
                              )}
                              {h.legacyInstructions && (
                                <div className="mt-0.5 text-muted-foreground italic">"{h.legacyInstructions}"</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {cv > 0 && (
                        <div className="font-mono text-[11px] text-muted-foreground shrink-0">
                          ${cv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-amber-500/20">
              Edit any of these on your Portfolio page under "Other Investments &amp; Insurance".
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
