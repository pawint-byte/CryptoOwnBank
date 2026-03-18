import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useXrplStore } from "@/lib/xrpl-store";
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
import { Wallet, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface XamanConnection {
  id: number;
  xrpAddress: string;
  accountLabel: string | null;
  connectedAt: string;
}

interface WalletPickerProps {
  value: string;
  onChange: (address: string) => void;
  label?: string;
  className?: string;
}

const CHAIN_PREFIX = "XRP";

function ensureChainPrefix(name: string): string {
  const upper = name.toUpperCase();
  if (upper.startsWith("XRP_") || upper.startsWith("XRP ") || upper.startsWith("XRP-")) return name;
  return `${CHAIN_PREFIX}_${name}`;
}

function hasDuplicateBaseName(newName: string, existingNames: string[], currentId: number, allWallets: { id: number; label: string }[]): boolean {
  const baseName = newName.replace(/^XRP[_\s-]/i, "").toLowerCase().trim();
  return allWallets.some(w => {
    if (w.id === currentId) return false;
    const otherBase = w.label.replace(/^XRP[_\s-]/i, "").toLowerCase().trim();
    return otherBase === baseName;
  });
}

export function WalletPicker({ value, onChange, label, className }: WalletPickerProps) {
  const { walletAddress } = useXrplStore();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const { data: xamanConnections = [] } = useQuery<XamanConnection[]>({
    queryKey: ["/api/xaman-connections"],
  });

  const wallets = xamanConnections.length > 0
    ? xamanConnections.map(c => ({
        id: c.id,
        address: c.xrpAddress,
        label: c.accountLabel || c.xrpAddress.slice(0, 8) + "..." + c.xrpAddress.slice(-6),
        isPrimary: c.xrpAddress === walletAddress,
      }))
    : walletAddress
      ? [{ id: 0, address: walletAddress, label: "Xaman Wallet", isPrimary: true }]
      : [];

  if (wallets.length <= 1) return null;

  const handleRename = async (connId: number) => {
    if (!editLabel.trim()) return;
    const finalLabel = ensureChainPrefix(editLabel.trim());

    if (hasDuplicateBaseName(finalLabel, [], connId, wallets)) {
      toast({ title: "Duplicate Name", description: "Another XRP wallet already has this name. Use a unique name to avoid confusion.", variant: "destructive" });
      return;
    }

    try {
      await apiRequest("PATCH", `/api/xaman-connections/${connId}/label`, { label: finalLabel });
      queryClient.invalidateQueries({ queryKey: ["/api/xaman-connections"] });
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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm" data-testid="select-signing-wallet">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Select wallet" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {wallets.map(w => (
            <div key={w.address} className="flex items-center gap-1">
              {editingId === w.id ? (
                <div className="flex items-center gap-1 px-2 py-1 w-full">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 mr-0.5">XRP_</span>
                  <Input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="h-7 text-xs flex-1"
                    placeholder="e.g. Ledger, Spending, Cold..."
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") handleRename(w.id);
                      if (e.key === "Escape") { setEditingId(null); setEditLabel(""); }
                    }}
                    data-testid={`input-rename-wallet-${w.id}`}
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRename(w.id)} data-testid={`button-save-rename-${w.id}`}>
                    <Check className="h-3 w-3 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(null); setEditLabel(""); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <SelectItem value={w.address} className="flex-1" data-testid={`wallet-option-${w.address.slice(0, 8)}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.label}</span>
                    {w.isPrimary && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500 text-emerald-600">
                        Primary
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-[10px] font-mono">
                      {w.address.slice(0, 6)}...{w.address.slice(-4)}
                    </span>
                  </div>
                </SelectItem>
              )}
              {editingId !== w.id && w.id > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 mr-1"
                  onClick={e => {
                    e.stopPropagation();
                    const baseName = w.label.replace(/^XRP[_\s-]/i, "");
                    setEditingId(w.id);
                    setEditLabel(baseName);
                  }}
                  data-testid={`button-rename-wallet-${w.id}`}
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

export function useSigningWallet() {
  const { walletAddress } = useXrplStore();
  const { data: xamanConnections = [] } = useQuery<XamanConnection[]>({
    queryKey: ["/api/xaman-connections"],
  });

  const hasMultipleWallets = xamanConnections.length > 1;

  return { defaultAddress: walletAddress, hasMultipleWallets, connections: xamanConnections };
}
