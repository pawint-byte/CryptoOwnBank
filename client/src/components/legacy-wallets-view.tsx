import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Users, AlertCircle, CheckCircle2, Pencil, Plus, Trash2, Share2, KeyRound, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Beneficiary = {
  id: string;
  name: string;
  email: string;
  relationship: string | null;
  assignmentId?: string | null;
  pieceDescription?: string | null;
  privateNote?: string | null;
};

type AssignmentBeneficiary = {
  id: string;
  name: string;
  email: string;
  relationship: string | null;
  pieceDescription: string | null;
  privateNote: string | null;
  confirmationStatus?: string;
  vaultVerifiedAt?: string | null;
};

type WalletAssignment = {
  id: string;
  legacyPlanId: string;
  walletId: string | null;
  walletLabel: string;
  walletType: string | null;
  chain: string | null;
  recoveryMode: "solo" | "joint_threshold" | "shared";
  thresholdK: number | null;
  thresholdN: number | null;
  wishesText: string | null;
  walletAssetSummary: string | null;
  autoAssigned: boolean;
  reviewedAt: string | null;
  beneficiaries: AssignmentBeneficiary[];
};

type WalletAsset = {
  walletId: string;
  chain: string;
  address: string;
  label: string | null;
  hardwareDevice: string | null;
  assets: { symbol: string; balance: string; usdValue: string | null }[];
};

const RECOVERY_MODES = [
  { value: "solo", label: "Solo — one person can recover alone", icon: KeyRound },
  { value: "joint_threshold", label: "Joint — multiple people each hold a piece, must cooperate", icon: Share2 },
  { value: "shared", label: "Shared — multiple people each able to recover independently", icon: Users },
] as const;

function modeLabel(mode: string): string {
  if (mode === "solo") return "Solo";
  if (mode === "joint_threshold") return "Joint";
  if (mode === "shared") return "Shared";
  return mode;
}

function walletTotalUsd(w: WalletAsset): number {
  return w.assets.reduce((sum, a) => sum + (a.usdValue ? Number(a.usdValue) : 0), 0);
}

function buildAssetSummary(w: WalletAsset): string {
  const lines: string[] = [];
  const label = w.label || `${w.chain.toUpperCase()} wallet`;
  const addrShort = w.address.length > 20 ? w.address.slice(0, 8) + "..." + w.address.slice(-6) : w.address;
  lines.push(`${label} (${w.chain.toUpperCase()}) — ${addrShort}`);
  for (const a of w.assets) {
    const usd = a.usdValue ? ` (~$${Number(a.usdValue).toLocaleString()})` : "";
    lines.push(`  ${a.symbol}: ${Number(a.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })}${usd}`);
  }
  return lines.join("\n");
}

interface Props {
  beneficiaries: Beneficiary[];
}

export function LegacyWalletsView({ beneficiaries }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<WalletAssignment | null>(null);
  const [creating, setCreating] = useState<WalletAsset | "blank" | null>(null);

  const { data: assignments = [], isLoading } = useQuery<WalletAssignment[]>({
    queryKey: ["/api/legacy-plan/wallet-assignments"],
  });

  const { data: walletAssets = [] } = useQuery<WalletAsset[]>({
    queryKey: ["/api/legacy-plan/wallet-assets"],
  });

  const assignedWalletIds = useMemo(() => new Set(assignments.map(a => a.walletId).filter(Boolean) as string[]), [assignments]);

  const unassignedWallets = useMemo(
    () => walletAssets.filter(w => !assignedWalletIds.has(w.walletId)),
    [walletAssets, assignedWalletIds]
  );

  const totalAssigned = assignments.length;
  const totalReviewed = assignments.filter(a => !a.autoAssigned || a.reviewedAt).length;
  const totalUnassigned = unassignedWallets.length;
  const greenCount = assignments.filter(a => a.beneficiaries.length > 0 && (!a.autoAssigned || a.reviewedAt)).length;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading wallets...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 text-center" data-testid="stat-wallets-green">
          <div className="text-2xl font-bold text-green-600">{greenCount}</div>
          <div className="text-xs text-muted-foreground">Wallets covered</div>
        </div>
        <div className="rounded-lg border p-3 text-center" data-testid="stat-wallets-review">
          <div className="text-2xl font-bold text-amber-600">{totalAssigned - totalReviewed}</div>
          <div className="text-xs text-muted-foreground">Need review</div>
        </div>
        <div className="rounded-lg border p-3 text-center" data-testid="stat-wallets-unassigned">
          <div className="text-2xl font-bold text-red-600">{totalUnassigned}</div>
          <div className="text-xs text-muted-foreground">Not yet assigned</div>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold">{totalAssigned + totalUnassigned}</div>
          <div className="text-xs text-muted-foreground">Total wallets</div>
        </div>
      </div>

      {/* Unassigned wallets — call to action */}
      {unassignedWallets.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{unassignedWallets.length} wallet(s) in your portfolio are not yet covered by your Legacy Plan.</strong> Click any of them below to assign beneficiaries.
          </AlertDescription>
        </Alert>
      )}

      {unassignedWallets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Unassigned ({unassignedWallets.length})</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {unassignedWallets.map(w => (
              <div key={w.walletId} className="rounded-lg border-2 border-dashed border-red-300 dark:border-red-900 p-3 hover-elevate cursor-pointer" onClick={() => setCreating(w)} data-testid={`card-unassigned-${w.walletId}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">{w.label || `${w.chain.toUpperCase()} wallet`}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="mr-1.5 text-[10px]">{w.chain.toUpperCase()}</Badge>
                      {w.address.slice(0, 8)}...{w.address.slice(-4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">${walletTotalUsd(w).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-[10px] text-red-600 font-medium">UNASSIGNED</div>
                  </div>
                </div>
                <Button size="sm" className="w-full mt-2" variant="outline" onClick={(e) => { e.stopPropagation(); setCreating(w); }} data-testid={`button-assign-wallet-${w.walletId}`}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Assign beneficiaries
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing assignments */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assigned wallets ({assignments.length})</h3>
            <Button size="sm" variant="outline" onClick={() => setCreating("blank")} data-testid="button-add-custom-wallet">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add custom (off-portfolio) wallet
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {assignments.map(a => {
              const portfolioWallet = a.walletId ? walletAssets.find(w => w.walletId === a.walletId) : null;
              const usd = portfolioWallet ? walletTotalUsd(portfolioWallet) : null;
              const needsReview = a.autoAssigned && !a.reviewedAt;
              const noPeople = a.beneficiaries.length === 0;
              const statusColor = noPeople ? "border-red-300" : needsReview ? "border-amber-300" : "border-green-300";
              return (
                <div key={a.id} className={`rounded-lg border-2 ${statusColor} p-3 hover-elevate`} data-testid={`card-assignment-${a.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="font-semibold text-sm truncate" data-testid={`text-wallet-label-${a.id}`}>{a.walletLabel}</div>
                        {a.chain && <Badge variant="outline" className="text-[10px]">{a.chain.toUpperCase()}</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {modeLabel(a.recoveryMode)}
                          {a.recoveryMode === "joint_threshold" && a.thresholdK && a.thresholdN ? ` ${a.thresholdK}-of-${a.thresholdN}` : ""}
                        </Badge>
                        {a.walletType && <Badge variant="outline" className="text-[10px] capitalize">{a.walletType}</Badge>}
                        {needsReview && <Badge className="text-[10px] bg-amber-500">Review</Badge>}
                        {noPeople && <Badge variant="destructive" className="text-[10px]">No heirs</Badge>}
                        {!noPeople && !needsReview && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                      </div>
                    </div>
                    {usd !== null && (
                      <div className="text-right text-sm font-semibold flex-shrink-0">${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    )}
                  </div>

                  {a.beneficiaries.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {a.beneficiaries.map(b => (
                        <div key={b.id} className="flex items-center gap-1.5 text-xs" data-testid={`text-assigned-${b.id}`}>
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{b.name}</span>
                          {b.relationship && <span className="text-muted-foreground">({b.relationship})</span>}
                          {b.pieceDescription && <span className="text-muted-foreground italic truncate">— {b.pieceDescription}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {a.wishesText && (
                    <div className="mt-2 text-xs italic text-muted-foreground border-l-2 border-blue-300 pl-2 line-clamp-2">
                      "{a.wishesText}"
                    </div>
                  )}

                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setEditing(a)} data-testid={`button-edit-assignment-${a.id}`}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && unassignedWallets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No wallets in your portfolio yet</p>
          <p className="text-sm">Add wallets in Portfolio first, then come back to assign them to beneficiaries.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreating("blank")} data-testid="button-add-custom-wallet-empty">
            <Plus className="h-3.5 w-3.5 mr-1" /> Or add a custom (off-site) wallet
          </Button>
        </div>
      )}

      {creating && (
        <AssignmentDialog
          mode="create"
          seedWallet={creating === "blank" ? null : creating}
          beneficiaries={beneficiaries}
          onClose={() => setCreating(null)}
        />
      )}

      {editing && (
        <AssignmentDialog
          mode="edit"
          assignment={editing}
          beneficiaries={beneficiaries}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AssignmentDialog({
  mode,
  assignment,
  seedWallet,
  beneficiaries,
  onClose,
}: {
  mode: "create" | "edit";
  assignment?: WalletAssignment;
  seedWallet?: WalletAsset | null;
  beneficiaries: Beneficiary[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [walletLabel, setWalletLabel] = useState(
    assignment?.walletLabel ?? (seedWallet ? (seedWallet.label || `${seedWallet.chain.toUpperCase()} wallet`) : "")
  );
  const [walletType, setWalletType] = useState<string>(assignment?.walletType ?? seedWallet?.hardwareDevice ?? "");
  const [chain, setChain] = useState<string>(assignment?.chain ?? seedWallet?.chain ?? "");
  const [recoveryMode, setRecoveryMode] = useState<"solo" | "joint_threshold" | "shared">(assignment?.recoveryMode ?? "solo");
  const [thresholdK, setThresholdK] = useState<string>(assignment?.thresholdK?.toString() ?? "2");
  const [thresholdN, setThresholdN] = useState<string>(assignment?.thresholdN?.toString() ?? "3");
  const [wishesText, setWishesText] = useState(assignment?.wishesText ?? "");
  const [walletAssetSummary, setWalletAssetSummary] = useState(
    assignment?.walletAssetSummary ?? (seedWallet ? buildAssetSummary(seedWallet) : "")
  );
  // Per-beneficiary state: { beneficiaryId: { selected, piece, note } }
  const [beneficiaryState, setBeneficiaryState] = useState<Record<string, { selected: boolean; piece: string; note: string }>>(() => {
    const init: Record<string, { selected: boolean; piece: string; note: string }> = {};
    for (const b of beneficiaries) {
      const existing = assignment?.beneficiaries.find(x => x.id === b.id);
      init[b.id] = {
        selected: !!existing,
        piece: existing?.pieceDescription ?? "",
        note: existing?.privateNote ?? "",
      };
    }
    return init;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        walletId: seedWallet?.walletId ?? null,
        walletLabel: walletLabel.trim(),
        walletType: walletType || null,
        chain: chain || null,
        recoveryMode,
        thresholdK: recoveryMode === "joint_threshold" ? Number(thresholdK) : null,
        thresholdN: recoveryMode === "joint_threshold" ? Number(thresholdN) : null,
        wishesText: wishesText.trim() || null,
        walletAssetSummary: walletAssetSummary.trim() || null,
      };
      let savedAssignment: WalletAssignment;
      if (mode === "create") {
        const res = await apiRequest("POST", "/api/legacy-plan/wallet-assignments", body);
        savedAssignment = await res.json();
      } else {
        body.markReviewed = true;
        const res = await apiRequest("PATCH", `/api/legacy-plan/wallet-assignments/${assignment!.id}`, body);
        savedAssignment = await res.json();
      }
      // Sync beneficiary links
      const assignmentId = savedAssignment.id;
      for (const b of beneficiaries) {
        const state = beneficiaryState[b.id];
        const wasLinked = !!assignment?.beneficiaries.find(x => x.id === b.id);
        if (state.selected) {
          await apiRequest("POST", `/api/legacy-plan/wallet-assignments/${assignmentId}/beneficiaries`, {
            beneficiaryId: b.id,
            pieceDescription: state.piece || null,
            privateNote: state.note || null,
          });
        } else if (wasLinked) {
          await apiRequest("DELETE", `/api/legacy-plan/wallet-assignments/${assignmentId}/beneficiaries/${b.id}`);
        }
      }
      return savedAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan/wallet-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: mode === "create" ? "Wallet assigned" : "Wallet updated" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message || String(err), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/legacy-plan/wallet-assignments/${assignment!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan/wallet-assignments"] });
      toast({ title: "Wallet assignment removed" });
      onClose();
    },
  });

  const selectedCount = Object.values(beneficiaryState).filter(s => s.selected).length;
  const canSave = walletLabel.trim().length > 0 && selectedCount > 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-assignment">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Assign this wallet" : "Edit wallet assignment"}</DialogTitle>
          <DialogDescription>
            Choose how this wallet recovers and who inherits it. Each person can get their own piece + private note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Wallet identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Wallet label *</Label>
              <Input value={walletLabel} onChange={(e) => setWalletLabel(e.target.value)} placeholder="e.g., Cold #1, Trading Ledger" data-testid="input-wallet-label" />
            </div>
            <div>
              <Label>Chain</Label>
              <Input value={chain} onChange={(e) => setChain(e.target.value)} placeholder="e.g., btc, eth, xrp" data-testid="input-wallet-chain" />
            </div>
          </div>

          <div>
            <Label>Wallet / device type</Label>
            <Select value={walletType || "none"} onValueChange={(v) => setWalletType(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="select-wallet-type"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Not specified —</SelectItem>
                <SelectItem value="ledger">Ledger</SelectItem>
                <SelectItem value="trezor">Trezor</SelectItem>
                <SelectItem value="cypherock">Cypherock</SelectItem>
                <SelectItem value="ellipal">Ellipal</SelectItem>
                <SelectItem value="tangem">Tangem</SelectItem>
                <SelectItem value="coldcard">Coldcard</SelectItem>
                <SelectItem value="keystone">Keystone</SelectItem>
                <SelectItem value="bitbox">BitBox</SelectItem>
                <SelectItem value="arculus">Arculus</SelectItem>
                <SelectItem value="safepal">SafePal</SelectItem>
                <SelectItem value="xaman">Xaman (XRPL)</SelectItem>
                <SelectItem value="metamask">MetaMask</SelectItem>
                <SelectItem value="trust">Trust Wallet</SelectItem>
                <SelectItem value="phantom">Phantom</SelectItem>
                <SelectItem value="exodus">Exodus</SelectItem>
                <SelectItem value="uniswap">Uniswap Wallet</SelectItem>
                <SelectItem value="exchange">Exchange account</SelectItem>
                <SelectItem value="manual">Manual / paper</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recovery mode */}
          <div className="space-y-2">
            <Label>How does this wallet recover?</Label>
            <div className="space-y-1.5">
              {RECOVERY_MODES.map(m => {
                const Icon = m.icon;
                return (
                  <label key={m.value} className={`flex items-start gap-2 rounded border p-2 cursor-pointer hover-elevate ${recoveryMode === m.value ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30" : ""}`} data-testid={`radio-mode-${m.value}`}>
                    <input type="radio" name="recoveryMode" value={m.value} checked={recoveryMode === m.value} onChange={() => setRecoveryMode(m.value)} className="mt-1" />
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span className="text-sm">{m.label}</span>
                  </label>
                );
              })}
            </div>
            {recoveryMode === "joint_threshold" && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <Label className="text-xs">Threshold (K of N)</Label>
                  <Input type="number" min={1} value={thresholdK} onChange={(e) => setThresholdK(e.target.value)} data-testid="input-threshold-k" />
                </div>
                <div>
                  <Label className="text-xs">Total holders (N)</Label>
                  <Input type="number" min={1} value={thresholdN} onChange={(e) => setThresholdN(e.target.value)} data-testid="input-threshold-n" />
                </div>
              </div>
            )}
          </div>

          {/* Wishes */}
          <div>
            <Label>Your wishes for this wallet (visible to all assigned heirs)</Label>
            <Textarea value={wishesText} onChange={(e) => setWishesText(e.target.value)} rows={3} placeholder='e.g., "Split evenly among the three of you" or "Hold in trust for the grandkids — keep separate from spouses."' data-testid="input-wishes" />
          </div>

          {/* Asset summary */}
          {walletAssetSummary && (
            <div>
              <Label>Asset summary on this wallet</Label>
              <Textarea value={walletAssetSummary} onChange={(e) => setWalletAssetSummary(e.target.value)} rows={Math.min(8, Math.max(3, walletAssetSummary.split("\n").length))} className="font-mono text-xs" data-testid="input-asset-summary" />
            </div>
          )}

          {/* People assignment */}
          <div className="space-y-2">
            <Label>Who inherits this wallet? ({selectedCount} selected)</Label>
            {beneficiaries.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>You haven't added any beneficiaries yet. Switch to the People tab and add at least one, then come back here.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-1.5">
                {beneficiaries.map(b => {
                  const state = beneficiaryState[b.id];
                  return (
                    <div key={b.id} className={`rounded border p-2 ${state.selected ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20" : ""}`}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={state.selected}
                          onCheckedChange={(checked) => setBeneficiaryState(prev => ({ ...prev, [b.id]: { ...prev[b.id], selected: !!checked } }))}
                          data-testid={`checkbox-beneficiary-${b.id}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{b.name}</div>
                          <div className="text-xs text-muted-foreground">{b.email}{b.relationship ? ` — ${b.relationship}` : ""}</div>
                        </div>
                      </label>
                      {state.selected && (
                        <div className="mt-2 space-y-2 pl-6">
                          {recoveryMode !== "solo" && (
                            <div>
                              <Label className="text-xs">What this person holds / does</Label>
                              <Input
                                value={state.piece}
                                onChange={(e) => setBeneficiaryState(prev => ({ ...prev, [b.id]: { ...prev[b.id], piece: e.target.value } }))}
                                placeholder='e.g., "Card 2 of 4 (in safe deposit box)" or "Words 5–24 of the seed"'
                                data-testid={`input-piece-${b.id}`}
                              />
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Private note from you to {b.name} (only they see this)</Label>
                            <Textarea
                              value={state.note}
                              onChange={(e) => setBeneficiaryState(prev => ({ ...prev, [b.id]: { ...prev[b.id], note: e.target.value } }))}
                              rows={2}
                              placeholder="Anything personal you want them to know"
                              data-testid={`input-private-note-${b.id}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === "edit" && (
            <Button variant="destructive" size="sm" onClick={() => { if (confirm("Remove this wallet assignment? Beneficiaries stay; only the link is removed.")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} data-testid="button-delete-assignment">
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-assignment">Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending} data-testid="button-save-assignment">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
