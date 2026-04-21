import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, CheckCircle2, Clock, AlertCircle, Pencil, ShieldCheck, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  vaultVerifiedAt?: string | null;
  vaultVerificationSentAt?: string | null;
  vaultVerificationCapsule?: string | null;
  confirmationStatus?: string;
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

type Person = {
  email: string;
  name: string;
  relationship: string | null;
  beneficiaries: Beneficiary[];
  confirmedCount: number;
  pendingCount: number;
};

function groupByPerson(beneficiaries: Beneficiary[]): Person[] {
  const map = new Map<string, Person>();
  for (const b of beneficiaries) {
    const key = (b.email || "").trim().toLowerCase();
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.beneficiaries.push(b);
      if (b.confirmationStatus === "confirmed") existing.confirmedCount++;
      else existing.pendingCount++;
    } else {
      map.set(key, {
        email: key,
        name: b.name,
        relationship: b.relationship,
        beneficiaries: [b],
        confirmedCount: b.confirmationStatus === "confirmed" ? 1 : 0,
        pendingCount: b.confirmationStatus === "confirmed" ? 0 : 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function walletLabel(b: Beneficiary): string {
  if (b.walletNickname && b.walletNickname.trim()) return b.walletNickname.trim();
  if (b.walletType) return b.walletType;
  return "wallet";
}

export function LegacyPeopleView({
  beneficiaries,
  onEditBeneficiary,
}: {
  beneficiaries: Beneficiary[];
  onEditBeneficiary: (b: Beneficiary) => void;
}) {
  const people = useMemo(() => groupByPerson(beneficiaries), [beneficiaries]);
  const { toast } = useToast();
  const sendVerification = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/legacy-beneficiaries/${id}/send-passphrase-verification`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Verification email sent", description: "They'll receive a link to confirm they still remember the passphrase." });
    },
    onError: (e: any) => toast({ title: "Couldn't send", description: e?.message || "Try again in a moment.", variant: "destructive" }),
  });

  if (people.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 space-y-3" data-testid="people-empty-state">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Let's start by adding the people you want to leave things to.</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enter their name + email. We'll send a quick confirmation link so we know the address is good and they're okay being named in your plan.
        </p>
        <p className="text-xs text-muted-foreground">You can always add more later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="people-list">
      <p className="text-xs text-muted-foreground" data-testid="text-people-count">
        {people.length} {people.length === 1 ? "person" : "people"} on your plan. Each card below shows everything one person receives.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {people.map((person) => (
          <div
            key={person.email}
            className="rounded-lg border bg-card p-4 space-y-3"
            data-testid={`person-card-${person.email}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold" data-testid={`person-name-${person.email}`}>{person.name}</span>
                  {person.relationship && (
                    <Badge variant="secondary" className="text-xs">{person.relationship}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{person.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {person.pendingCount === 0 ? (
                  <Badge variant="outline" className="text-green-600 border-green-600/40 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Confirmed
                  </Badge>
                ) : person.confirmedCount === 0 ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-600/40 gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-600/40 gap-1">
                    <AlertCircle className="h-3 w-3" /> Mixed
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">
                Receives {person.beneficiaries.length} {person.beneficiaries.length === 1 ? "wallet entry" : "wallet entries"}:
              </p>
              <ul className="space-y-1">
                {person.beneficiaries.map((b) => {
                  const isShared = !!(b.beneficiaryGroup && b.beneficiaryGroup.trim());
                  const isShardOf = b.shardIndex != null ? `shard ${b.shardIndex + 1}` : null;
                  return (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-2 text-sm py-1"
                      data-testid={`person-wallet-${b.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">{walletLabel(b)}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isShared && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              shared{isShardOf ? ` · ${isShardOf}` : ""}
                            </Badge>
                          )}
                          {!isShared && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">sole heir</Badge>
                          )}
                          {b.encryptedVault && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {b.vaultTested ? "vault tested" : "vault untested"}
                            </Badge>
                          )}
                          {b.encryptedVault && b.vaultVerifiedAt && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-green-600 border-green-600/40 gap-0.5" data-testid={`badge-passphrase-verified-${b.id}`}>
                              <ShieldCheck className="h-2.5 w-2.5" /> verified {relativeTime(b.vaultVerifiedAt)}
                            </Badge>
                          )}
                          {b.encryptedVault && !b.vaultVerifiedAt && b.vaultVerificationSentAt && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-600 border-amber-600/40">
                              verification sent {relativeTime(b.vaultVerificationSentAt)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {b.encryptedVault && b.vaultVerificationCapsule && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => sendVerification.mutate(b.id)}
                          disabled={sendVerification.isPending}
                          title="Email this person a link to confirm they still remember the passphrase"
                          data-testid={`button-send-verification-${b.id}`}
                        >
                          <Send className="h-3 w-3 mr-1" /> Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => onEditBeneficiary(b)}
                        data-testid={`button-edit-person-wallet-${b.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
