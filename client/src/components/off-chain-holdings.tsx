import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, ShieldCheck, Building2, Car, Gem, Package, Plus, Trash2, Pencil, Upload, FileSpreadsheet, ScrollText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OffChainHolding, OffChainAssetType, OffChainStatus } from "@shared/schema";
import { OFF_CHAIN_ASSET_TYPES, OFF_CHAIN_STATUSES } from "@shared/schema";

const TYPE_LABEL: Record<OffChainAssetType, string> = {
  startup: "Startup / Seed Investment",
  insurance: "Insurance Policy",
  brokerage: "Brokerage / Retirement",
  vehicle: "Vehicle",
  collectible: "Collectible",
  other: "Other",
};

const TYPE_ICON: Record<OffChainAssetType, any> = {
  startup: Briefcase,
  insurance: ShieldCheck,
  brokerage: Building2,
  vehicle: Car,
  collectible: Gem,
  other: Package,
};

const STATUS_LABEL: Record<OffChainStatus, string> = {
  active: "Active",
  exited: "Exited",
  matured: "Matured",
  written_off: "Written off",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<OffChainStatus, string> = {
  active: "bg-green-600 text-white",
  exited: "bg-blue-600 text-white",
  matured: "bg-purple-600 text-white",
  written_off: "bg-red-600 text-white",
  cancelled: "bg-gray-500 text-white",
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function num(s: string | null | undefined): number {
  const v = parseFloat(s || "0");
  return Number.isFinite(v) ? v : 0;
}

export function OffChainHoldingsCard() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<OffChainHolding | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: holdings = [], isLoading } = useQuery<OffChainHolding[]>({
    queryKey: ["/api/off-chain-holdings"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/off-chain-holdings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/off-chain-holdings"] });
      toast({ title: "Holding removed" });
    },
  });

  const totalActiveValue = useMemo(() =>
    holdings
      .filter(h => h.status === "active")
      .reduce((sum, h) => sum + (num(h.currentValue) || num(h.amountInvested)), 0),
    [holdings]
  );

  const byType = useMemo(() => {
    const map = new Map<OffChainAssetType, OffChainHolding[]>();
    for (const h of holdings) {
      const k = (h.assetType as OffChainAssetType);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(h);
    }
    return map;
  }, [holdings]);

  return (
    <Card data-testid="card-off-chain-holdings">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 gap-2">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-5 w-5 text-amber-600" />
            Other Investments &amp; Insurance
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Manually track seed investments, insurance, brokerage accounts &amp; more — included in your Legacy Plan.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} data-testid="button-bulk-import-holdings">
            <Upload className="h-3.5 w-3.5 mr-1" /> Bulk import
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setAddOpen(true); }} data-testid="button-add-holding">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading...</div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="empty-off-chain-holdings">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No off-chain holdings yet</p>
            <p className="text-xs mt-1 max-w-md mx-auto">
              Add your StartEngine, Republic, or Linqto seed investments, life insurance policies, brokerage accounts, or anything else you want your family to know about.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} data-testid="button-empty-bulk">
                <Upload className="h-3.5 w-3.5 mr-1" /> Bulk import CSV
              </Button>
              <Button size="sm" onClick={() => { setEditing(null); setAddOpen(true); }} data-testid="button-empty-add">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add one
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded border p-3">
                <p className="text-[11px] text-muted-foreground">Active value</p>
                <p className="text-lg font-bold" data-testid="text-off-chain-total">{formatCurrency(totalActiveValue)}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-[11px] text-muted-foreground">Total entries</p>
                <p className="text-lg font-bold">{holdings.length}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-[11px] text-muted-foreground">Active</p>
                <p className="text-lg font-bold">{holdings.filter(h => h.status === "active").length}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-[11px] text-muted-foreground">Categories</p>
                <p className="text-lg font-bold">{byType.size}</p>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all" className="text-xs" data-testid="tab-holdings-all">All ({holdings.length})</TabsTrigger>
                {Array.from(byType.keys()).map(t => (
                  <TabsTrigger key={t} value={t} className="text-xs" data-testid={`tab-holdings-${t}`}>
                    {TYPE_LABEL[t]} ({byType.get(t)!.length})
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all" className="space-y-2 mt-3">
                {holdings.map(h => (
                  <HoldingRow key={h.id} holding={h} onEdit={() => { setEditing(h); setAddOpen(true); }} onDelete={() => deleteMutation.mutate(h.id)} />
                ))}
              </TabsContent>
              {Array.from(byType.keys()).map(t => (
                <TabsContent key={t} value={t} className="space-y-2 mt-3">
                  {byType.get(t)!.map(h => (
                    <HoldingRow key={h.id} holding={h} onEdit={() => { setEditing(h); setAddOpen(true); }} onDelete={() => deleteMutation.mutate(h.id)} />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>

      {addOpen && (
        <HoldingDialog
          existing={editing}
          onClose={() => { setAddOpen(false); setEditing(null); }}
        />
      )}
      {bulkOpen && <BulkImportDialog onClose={() => setBulkOpen(false)} />}
    </Card>
  );
}

function HoldingRow({ holding, onEdit, onDelete }: { holding: OffChainHolding; onEdit: () => void; onDelete: () => void }) {
  const Icon = TYPE_ICON[holding.assetType as OffChainAssetType] || Package;
  const cv = num(holding.currentValue);
  const ai = num(holding.amountInvested);
  const displayValue = cv || ai;
  const gain = cv && ai ? cv - ai : 0;
  const gainPct = cv && ai ? ((cv - ai) / ai) * 100 : 0;
  const status = (holding.status || "active") as OffChainStatus;

  return (
    <div className="rounded-lg border p-3 hover:bg-accent/30 transition-colors" data-testid={`row-holding-${holding.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Icon className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate" data-testid={`text-holding-name-${holding.id}`}>{holding.name}</span>
              <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</Badge>
              {holding.provider && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{holding.provider}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {TYPE_LABEL[holding.assetType as OffChainAssetType]}
              {holding.accountIdentifier && ` · ${holding.accountIdentifier}`}
              {holding.purchaseDate && ` · ${holding.purchaseDate}`}
            </div>
            {holding.quantity && (
              <div className="text-xs text-foreground/80 mt-0.5">{holding.quantity}</div>
            )}
            {(holding.contactUrl || holding.contactPhone) && (
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                {holding.contactUrl && (
                  <a
                    href={holding.contactUrl.startsWith("http") ? holding.contactUrl : `https://${holding.contactUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate max-w-[200px]"
                    data-testid={`link-holding-url-${holding.id}`}
                  >
                    {holding.contactUrl.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {holding.contactPhone && (
                  <a
                    href={`tel:${holding.contactPhone.replace(/[^0-9+]/g, "")}`}
                    className="text-primary hover:underline"
                    data-testid={`link-holding-phone-${holding.id}`}
                  >
                    {holding.contactPhone}
                  </a>
                )}
              </div>
            )}
            {holding.notes && (
              <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{holding.notes}</p>
            )}
            {holding.legacyInstructions && (
              <div className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1">
                <ScrollText className="h-3 w-3 mt-0.5 text-amber-600 shrink-0" />
                <span className="line-clamp-2">
                  <span className="font-medium text-amber-700 dark:text-amber-500">Legacy:</span> {holding.legacyInstructions}
                  {holding.beneficiaryName && ` → ${holding.beneficiaryName}`}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-bold text-sm" data-testid={`text-holding-value-${holding.id}`}>
            {displayValue > 0 ? formatCurrency(displayValue) : "—"}
          </div>
          {ai > 0 && cv > 0 && cv !== ai && (
            <div className={`text-xs font-medium ${gain > 0 ? "text-green-600" : "text-red-600"}`}>
              {gain > 0 ? "+" : ""}{formatCurrency(gain)} ({gainPct > 0 ? "+" : ""}{gainPct.toFixed(1)}%)
            </div>
          )}
          {ai > 0 && (!cv || cv === ai) && (
            <div className="text-[10px] text-muted-foreground">Cost basis</div>
          )}
          <div className="flex items-center gap-1 mt-1 justify-end">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit} data-testid={`button-edit-holding-${holding.id}`}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Remove "${holding.name}"?`)) onDelete(); }} data-testid={`button-delete-holding-${holding.id}`}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HoldingDialog({ existing, onClose }: { existing: OffChainHolding | null; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    assetType: (existing?.assetType as OffChainAssetType) || "startup",
    name: existing?.name || "",
    provider: existing?.provider || "",
    accountIdentifier: existing?.accountIdentifier || "",
    amountInvested: existing?.amountInvested || "",
    currentValue: existing?.currentValue || "",
    quantity: existing?.quantity || "",
    contactUrl: existing?.contactUrl || "",
    contactPhone: existing?.contactPhone || "",
    purchaseDate: existing?.purchaseDate || "",
    status: (existing?.status as OffChainStatus) || "active",
    notes: existing?.notes || "",
    legacyInstructions: existing?.legacyInstructions || "",
    beneficiaryName: existing?.beneficiaryName || "",
    beneficiaryContact: existing?.beneficiaryContact || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { ...form };
      if (existing) return apiRequest("PATCH", `/api/off-chain-holdings/${existing.id}`, body);
      return apiRequest("POST", "/api/off-chain-holdings", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/off-chain-holdings"] });
      toast({ title: existing ? "Holding updated" : "Holding added" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Save failed", description: err?.message || String(err), variant: "destructive" }),
  });

  const isInsurance = form.assetType === "insurance";
  const isStartup = form.assetType === "startup";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-holding">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit holding" : "Add holding"}</DialogTitle>
          <DialogDescription>
            Manually entered. Numbers won't auto-update — refresh them when you check your account or get a statement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <Select value={form.assetType} onValueChange={(v) => setForm({ ...form, assetType: v as OffChainAssetType })}>
                <SelectTrigger data-testid="select-holding-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFF_CHAIN_ASSET_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as OffChainStatus })}>
                <SelectTrigger data-testid="select-holding-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFF_CHAIN_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{isInsurance ? "Policy name *" : isStartup ? "Company name *" : "Name *"}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isInsurance ? "e.g., Term Life — 20 yr" : isStartup ? "e.g., Replit Inc." : "e.g., Tesla Model 3"}
              data-testid="input-holding-name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{isInsurance ? "Insurance provider" : isStartup ? "Platform" : "Provider / institution"}</Label>
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder={isInsurance ? "e.g., MetLife" : isStartup ? "e.g., StartEngine" : "e.g., Fidelity"}
                data-testid="input-holding-provider"
              />
            </div>
            <div>
              <Label>{isInsurance ? "Policy #" : "Account / investor #"}</Label>
              <Input
                value={form.accountIdentifier}
                onChange={(e) => setForm({ ...form, accountIdentifier: e.target.value })}
                placeholder="optional"
                data-testid="input-holding-account"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>{isInsurance ? "Premium paid (USD)" : "Amount invested (USD)"}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amountInvested}
                onChange={(e) => setForm({ ...form, amountInvested: e.target.value })}
                placeholder="0.00"
                data-testid="input-holding-invested"
              />
            </div>
            <div>
              <Label>{isInsurance ? "Face value / coverage (USD)" : "Current value (USD)"}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.currentValue}
                onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                placeholder="0.00"
                data-testid="input-holding-current"
              />
            </div>
            <div>
              <Label>{isInsurance ? "Effective date" : "Purchase date"}</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                data-testid="input-holding-date"
              />
            </div>
          </div>

          <div>
            <Label>
              {isStartup ? "Quantity (shares / units)" : isInsurance ? "Policy term / coverage details" : "Quantity / units"}
            </Label>
            <Input
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder={
                isStartup ? "e.g., 5,000 shares @ $1.20 (Series Seed)"
                  : isInsurance ? "e.g., 20-yr term, $500K coverage"
                  : "e.g., 1 unit, 100 shares, 1 vehicle"
              }
              data-testid="input-holding-quantity"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{isStartup ? "Login URL" : isInsurance ? "Insurer website" : "Website / login URL"}</Label>
              <Input
                value={form.contactUrl}
                onChange={(e) => setForm({ ...form, contactUrl: e.target.value })}
                placeholder={
                  isStartup ? "https://startengine.com/login"
                    : isInsurance ? "https://metlife.com"
                    : "https://..."
                }
                data-testid="input-holding-url"
              />
            </div>
            <div>
              <Label>{isInsurance ? "Claims phone *" : "Customer service phone"}</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder={isInsurance ? "1-800-METLIFE" : "1-800-555-0100"}
                data-testid="input-holding-phone"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={isStartup ? "e.g., Series Seed (SAFE), exit target 2028, board observer rights" : "Anything you want to remember about this"}
              rows={2}
              data-testid="input-holding-notes"
            />
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-500">
              <ScrollText className="h-4 w-4" />
              For your Legacy Plan
            </div>
            <p className="text-xs text-muted-foreground">
              These fields appear in the heir packet so your beneficiary knows what to do.
            </p>
            <div>
              <Label className="text-xs">Instructions for beneficiary</Label>
              <Textarea
                value={form.legacyInstructions}
                onChange={(e) => setForm({ ...form, legacyInstructions: e.target.value })}
                placeholder={
                  isStartup
                    ? "e.g., Email investor relations at startengine.com with my account email and a death certificate to claim shares"
                    : isInsurance
                    ? "e.g., Call 1-800-METLIFE with policy # and death certificate. Beneficiary already named on file."
                    : "e.g., Account is in survivor-joint name; survivor just needs to call the institution"
                }
                rows={3}
                data-testid="input-holding-legacy-instructions"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Beneficiary name</Label>
                <Input
                  value={form.beneficiaryName}
                  onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                  placeholder="e.g., Jane Doe (spouse)"
                  data-testid="input-holding-beneficiary-name"
                />
              </div>
              <div>
                <Label className="text-xs">Beneficiary contact</Label>
                <Input
                  value={form.beneficiaryContact}
                  onChange={(e) => setForm({ ...form, beneficiaryContact: e.target.value })}
                  placeholder="email or phone"
                  data-testid="input-holding-beneficiary-contact"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-holding">Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending} data-testid="button-save-holding">
            {saveMutation.isPending ? "Saving..." : existing ? "Save changes" : "Add holding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkImportDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [defaultType, setDefaultType] = useState<OffChainAssetType>("startup");
  const [preview, setPreview] = useState<any[] | null>(null);

  const importMutation = useMutation({
    mutationFn: async (items: any[]) => apiRequest("POST", "/api/off-chain-holdings/bulk", { items }),
    onSuccess: async (res: any) => {
      const json = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/off-chain-holdings"] });
      toast({
        title: `Imported ${json.inserted} holdings`,
        description: json.errors?.length ? `${json.errors.length} row(s) skipped — check format` : "All rows added successfully.",
      });
      onClose();
    },
    onError: (err: any) => toast({ title: "Import failed", description: err?.message || String(err), variant: "destructive" }),
  });

  function parseCsv(text: string): any[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];
    const splitLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "", inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuote = !inQuote; continue; }
        if (c === "," && !inQuote) { out.push(cur); cur = ""; continue; }
        cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim());
    };
    const header = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const fieldMap: Record<string, string> = {
      name: "name", company: "name", policy: "name", description: "name",
      type: "assetType", category: "assetType", assettype: "assetType",
      provider: "provider", platform: "provider", institution: "provider", insurer: "provider",
      account: "accountIdentifier", accountnumber: "accountIdentifier", policynumber: "accountIdentifier", investorid: "accountIdentifier", id: "accountIdentifier",
      invested: "amountInvested", amount: "amountInvested", amountinvested: "amountInvested", premium: "amountInvested", costbasis: "amountInvested", cost: "amountInvested",
      value: "currentValue", currentvalue: "currentValue", facevalue: "currentValue", coverage: "currentValue", marketvalue: "currentValue",
      quantity: "quantity", shares: "quantity", units: "quantity", numberofshares: "quantity", numshares: "quantity", qty: "quantity",
      url: "contactUrl", website: "contactUrl", link: "contactUrl", loginurl: "contactUrl", site: "contactUrl",
      phone: "contactPhone", phonenumber: "contactPhone", telephone: "contactPhone", tel: "contactPhone", claimsphone: "contactPhone", customerservice: "contactPhone",
      date: "purchaseDate", purchasedate: "purchaseDate", effectivedate: "purchaseDate", investmentdate: "purchaseDate",
      status: "status",
      notes: "notes", note: "notes", description2: "notes",
      legacy: "legacyInstructions", legacyinstructions: "legacyInstructions", instructions: "legacyInstructions",
      beneficiary: "beneficiaryName", beneficiaryname: "beneficiaryName",
      beneficiarycontact: "beneficiaryContact", contact: "beneficiaryContact",
    };
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitLine(lines[i]);
      const row: any = { assetType: defaultType };
      header.forEach((h, idx) => {
        const target = fieldMap[h];
        if (target && cells[idx] !== undefined && cells[idx] !== "") {
          row[target] = cells[idx];
        }
      });
      if (row.assetType && !OFF_CHAIN_ASSET_TYPES.includes(row.assetType)) {
        row.assetType = defaultType;
      }
      if (row.amountInvested) row.amountInvested = String(row.amountInvested).replace(/[$,]/g, "");
      if (row.currentValue) row.currentValue = String(row.currentValue).replace(/[$,]/g, "");
      if (row.name) rows.push(row);
    }
    return rows;
  }

  const exampleCsv = `name,provider,amount,date,notes
Replit Inc,StartEngine,500,2024-03-15,500 shares Series Seed
Nuro,Republic,250,2023-08-02,Convertible note
Linqto Pre-IPO Vault,Linqto,1000,2024-01-10,Private market access`;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-bulk-import">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Bulk import from CSV
          </DialogTitle>
          <DialogDescription>
            Paste a CSV (or export from Excel/Google Sheets). One row = one holding. Header row required. Up to 200 rows.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription className="text-xs space-y-1">
              <p className="font-medium">Recognized columns (any order, case-insensitive):</p>
              <p><code>name</code> (required) · <code>type</code> · <code>provider</code> · <code>account</code> · <code>amount</code> · <code>value</code> · <code>date</code> · <code>status</code> · <code>notes</code> · <code>legacy</code> · <code>beneficiary</code> · <code>beneficiaryContact</code></p>
              <p>Aliases work too: company → name, policy → name, platform → provider, premium → amount, facevalue → value, etc.</p>
            </AlertDescription>
          </Alert>

          <div>
            <Label>Default category (used when no <code>type</code> column is present)</Label>
            <Select value={defaultType} onValueChange={(v) => setDefaultType(v as OffChainAssetType)}>
              <SelectTrigger className="w-full sm:w-72" data-testid="select-bulk-default-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OFF_CHAIN_ASSET_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>CSV content</Label>
              <Button size="sm" variant="ghost" type="button" onClick={() => setCsvText(exampleCsv)} className="text-xs h-6" data-testid="button-csv-example">
                Insert example
              </Button>
            </div>
            <Textarea
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setPreview(null); }}
              placeholder="name,provider,amount,date,notes&#10;Replit,StartEngine,500,2024-03-15,500 shares"
              rows={8}
              className="font-mono text-xs"
              data-testid="input-csv-text"
            />
          </div>

          {preview && (
            <div className="rounded border p-3 bg-muted/30 max-h-60 overflow-auto">
              <p className="text-xs font-medium mb-2">Preview ({preview.length} row{preview.length !== 1 ? "s" : ""}):</p>
              <div className="space-y-1">
                {preview.slice(0, 10).map((r, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[r.assetType as OffChainAssetType]}</Badge>
                    <span className="font-medium">{r.name}</span>
                    {r.provider && <span className="text-muted-foreground">· {r.provider}</span>}
                    {r.amountInvested && <span className="text-muted-foreground">· ${r.amountInvested}</span>}
                  </div>
                ))}
                {preview.length > 10 && <p className="text-[10px] text-muted-foreground">...and {preview.length - 10} more</p>}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-bulk">Cancel</Button>
          {!preview ? (
            <Button onClick={() => setPreview(parseCsv(csvText))} disabled={!csvText.trim()} data-testid="button-preview-csv">
              Preview
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPreview(null)} data-testid="button-back-csv">Back to edit</Button>
              <Button onClick={() => importMutation.mutate(preview)} disabled={preview.length === 0 || importMutation.isPending} data-testid="button-confirm-import">
                {importMutation.isPending ? "Importing..." : `Import ${preview.length}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
