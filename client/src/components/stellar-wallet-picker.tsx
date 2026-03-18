import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStellarStore } from "@/lib/stellar-store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrackerWallet {
  id: string;
  chain: string;
  address: string;
  label: string | null;
}

interface StellarWalletPickerProps {
  value?: string;
  onChange?: (address: string) => void;
  label?: string;
  className?: string;
}

const STELLAR_PURPLE = "#7B61FF";
const CHAIN_PREFIX = "XLM";

function ensureChainPrefix(name: string): string {
  const upper = name.toUpperCase();
  if (upper.startsWith("XLM_") || upper.startsWith("XLM ") || upper.startsWith("XLM-")) return name;
  return `${CHAIN_PREFIX}_${name}`;
}

function hasDuplicateBaseName(newName: string, currentId: string, allWallets: { id: string; label: string }[]): boolean {
  const baseName = newName.replace(/^XLM[_\s-]/i, "").toLowerCase().trim();
  return allWallets.some(w => {
    if (w.id === currentId) return false;
    const otherBase = w.label.replace(/^XLM[_\s-]/i, "").toLowerCase().trim();
    return otherBase === baseName;
  });
}

export function StellarWalletPicker({ value, onChange, label, className }: StellarWalletPickerProps) {
  const { stellarAddress, connect } = useStellarStore();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const { data: trackerWallets = [] } = useQuery<TrackerWallet[]>({
    queryKey: ["/api/wallets"],
  });

  const stellarWallets = trackerWallets
    .filter(w => w.chain === "stellar")
    .map(w => ({
      ...w,
      label: w.label || "Stellar Wallet",
    }));

  if (stellarWallets.length <= 1) return null;

  const currentValue = value || stellarAddress || "";
  const handleChange = (addr: string) => {
    if (onChange) {
      onChange(addr);
    } else {
      connect(addr);
    }
  };

  const handleRename = async (walletId: string) => {
    if (!editLabel.trim()) return;
    const finalLabel = ensureChainPrefix(editLabel.trim());

    if (hasDuplicateBaseName(finalLabel, walletId, stellarWallets.map(w => ({ id: w.id, label: w.label || "" })))) {
      toast({ title: "Duplicate Name", description: "Another XLM wallet already has this name. Use a unique name to avoid confusion.", variant: "destructive" });
      return;
    }

    try {
      await apiRequest("PATCH", `/api/wallets/${walletId}/label`, { label: finalLabel });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Wallet Renamed", description: `Updated to "${finalLabel}"` });
      setEditingId(null);
      setEditLabel("");
    } catch {
      toast({ title: "Rename Failed", variant: "destructive" });
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      )}
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="h-9 text-sm" data-testid="select-stellar-wallet">
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 shrink-0" style={{ color: STELLAR_PURPLE }} />
            <SelectValue placeholder="Select Stellar wallet" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {stellarWallets.map(w => (
            <div key={w.address} className="flex items-center gap-1">
              {editingId === w.id ? (
                <div className="flex items-center gap-1 px-2 py-1 w-full">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 mr-0.5">XLM_</span>
                  <Input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="h-7 text-xs flex-1"
                    placeholder="e.g. LOBSTR, Ledger, Spending..."
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") handleRename(w.id);
                      if (e.key === "Escape") { setEditingId(null); setEditLabel(""); }
                    }}
                    data-testid={`input-rename-stellar-${w.id}`}
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRename(w.id)} data-testid={`button-save-stellar-rename-${w.id}`}>
                    <Check className="h-3 w-3 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(null); setEditLabel(""); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <SelectItem value={w.address} className="flex-1" data-testid={`stellar-wallet-option-${w.address.slice(0, 8)}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.label}</span>
                    {w.address.toLowerCase() === stellarAddress?.toLowerCase() && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: STELLAR_PURPLE, color: STELLAR_PURPLE }}>
                        Active
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-[10px] font-mono">
                      {w.address.slice(0, 6)}...{w.address.slice(-4)}
                    </span>
                  </div>
                </SelectItem>
              )}
              {editingId !== w.id && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 mr-1"
                  onClick={e => {
                    e.stopPropagation();
                    const baseName = (w.label || "").replace(/^XLM[_\s-]/i, "");
                    setEditingId(w.id);
                    setEditLabel(baseName);
                  }}
                  data-testid={`button-rename-stellar-${w.id}`}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function useStellarWallets() {
  const { stellarAddress } = useStellarStore();
  const { data: trackerWallets = [] } = useQuery<TrackerWallet[]>({
    queryKey: ["/api/wallets"],
  });

  const stellarWallets = trackerWallets.filter(w => w.chain === "stellar");
  const hasMultipleWallets = stellarWallets.length > 1;

  return { defaultAddress: stellarAddress, hasMultipleWallets, wallets: stellarWallets };
}
