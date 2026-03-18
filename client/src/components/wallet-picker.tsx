import { useQuery } from "@tanstack/react-query";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";

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

export function WalletPicker({ value, onChange, label, className }: WalletPickerProps) {
  const { walletAddress } = useXrplStore();

  const { data: xamanConnections = [] } = useQuery<XamanConnection[]>({
    queryKey: ["/api/xaman-connections"],
  });

  const wallets = xamanConnections.length > 0
    ? xamanConnections.map(c => ({
        address: c.xrpAddress,
        label: c.accountLabel || c.xrpAddress.slice(0, 8) + "..." + c.xrpAddress.slice(-6),
        isPrimary: c.xrpAddress === walletAddress,
      }))
    : walletAddress
      ? [{ address: walletAddress, label: "Xaman Wallet", isPrimary: true }]
      : [];

  if (wallets.length <= 1) return null;

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
            <SelectItem key={w.address} value={w.address} data-testid={`wallet-option-${w.address.slice(0, 8)}`}>
              <div className="flex items-center gap-2">
                <span>{w.label}</span>
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
