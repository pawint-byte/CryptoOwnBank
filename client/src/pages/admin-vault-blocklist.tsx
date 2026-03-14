import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Shield,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  Vault,
  ExternalLink,
} from "lucide-react";

interface BlocklistEntry {
  id: number;
  vaultId: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
}

export default function AdminVaultBlocklist() {
  const { toast } = useToast();
  const [newVaultId, setNewVaultId] = useState("");
  const [newReason, setNewReason] = useState("");

  const blocklistQuery = useQuery<{ blocklist: BlocklistEntry[] }>({
    queryKey: ["/api/xls66/admin/blocklist"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/xls66/admin/blocklist", {
        vaultId: newVaultId.trim(),
        reason: newReason.trim() || "Blocked by admin",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/xls66/admin/blocklist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xls66/vaults"] });
      setNewVaultId("");
      setNewReason("");
      toast({ title: "Vault Blocked", description: "Vault added to blocklist. Discovery cache cleared." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message || "Could not add to blocklist", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (vaultId: string) => {
      const res = await apiRequest("DELETE", `/api/xls66/admin/blocklist/${encodeURIComponent(vaultId)}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/xls66/admin/blocklist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xls66/vaults"] });
      toast({ title: "Vault Unblocked", description: "Vault removed from blocklist." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message || "Could not remove from blocklist", variant: "destructive" });
    },
  });

  const blocklist = blocklistQuery.data?.blocklist || [];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6" data-testid="admin-vault-blocklist-page">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10">
          <Shield className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Vault Blocklist</h1>
          <p className="text-sm text-muted-foreground">Block vaults from appearing in discovery. Blocked vaults are hidden from all users.</p>
        </div>
      </div>

      <Card data-testid="add-to-blocklist-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-amber-500" />
            Block a Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-id">Vault ID (XRPL ledger object hash)</Label>
            <Input
              id="vault-id"
              value={newVaultId}
              onChange={(e) => setNewVaultId(e.target.value)}
              placeholder="e.g. A1B2C3D4E5F6..."
              className="font-mono text-sm"
              data-testid="input-block-vault-id"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-reason">Reason</Label>
            <Input
              id="block-reason"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g. Suspicious operator, known scam, etc."
              data-testid="input-block-reason"
            />
          </div>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!newVaultId.trim() || addMutation.isPending}
            data-testid="button-add-to-blocklist"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Block Vault
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="blocklist-entries-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Vault className="h-5 w-5 text-amber-500" />
            Blocked Vaults ({blocklist.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blocklistQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : blocklist.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No vaults are currently blocked.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blocklist.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-3 flex items-start justify-between gap-3"
                  data-testid={`blocklist-entry-${entry.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium truncate">{entry.vaultId}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => window.open(`https://livenet.xrpl.org/accounts/${entry.vaultId}`, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{entry.reason}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        by {entry.blockedBy}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.blockedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeMutation.mutate(entry.vaultId)}
                    disabled={removeMutation.isPending}
                    data-testid={`button-unblock-${entry.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
