import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useXrplStore } from "@/lib/xrpl-store";
import { connectXumm, hasPendingXummSignIn, completePendingXummSignIn } from "@/lib/xumm-connector";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function InlineXrplConnect() {
  const [connecting, setConnecting] = useState(false);
  const { connect } = useXrplStore();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPendingXummSignIn()) {
      setConnecting(true);
      completePendingXummSignIn().then(result => {
        if (result.success && result.address) {
          connect(result.address, "xumm");
          saveWallet(result.address);
          toast({ title: "Wallet Connected", description: `Connected: ${result.address.slice(0, 8)}...${result.address.slice(-6)}` });
        } else if (result.error && result.error !== "No pending sign-in") {
          toast({ title: "Connection Failed", description: result.error, variant: "destructive" });
        }
        setConnecting(false);
      });
    }
  }, []);

  async function saveWallet(address: string) {
    try {
      await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ walletAddress: address, walletType: "xumm" }),
      });
    } catch {}
    try {
      await apiRequest("POST", "/api/xaman-connections", { xrpAddress: address });
      queryClient.invalidateQueries({ queryKey: ["/api/xaman-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
    } catch {}
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const result = await connectXumm();
      if (result.success && result.address) {
        connect(result.address, "xumm");
        await saveWallet(result.address);
        toast({ title: "Wallet Connected", description: `Connected: ${result.address.slice(0, 8)}...${result.address.slice(-6)}` });
      } else {
        toast({ title: "Connection Failed", description: result.error || "Could not connect.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast({ title: "Connection Error", description: msg, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-muted-foreground text-center text-sm">
        Connect your XRPL wallet to get started.
      </p>
      <Button
        onClick={handleConnect}
        disabled={connecting}
        className="bg-[#00A4E4] hover:bg-[#0090cc] text-white"
        data-testid="button-inline-xrpl-connect"
      >
        {connecting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
        ) : (
          <><Smartphone className="h-4 w-4 mr-2" />Connect via Xaman</>
        )}
      </Button>
    </div>
  );
}
