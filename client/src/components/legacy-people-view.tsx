import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, CheckCircle2, Clock, AlertCircle, Pencil } from "lucide-react";

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
                        </div>
                      </div>
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
