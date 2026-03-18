import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStellarStore } from "@/lib/stellar-store";

const STELLAR_PURPLE = "#7B61FF";

export function InlineStellarConnect() {
  const [addressInput, setAddressInput] = useState("");
  const { connect } = useStellarStore();
  const { toast } = useToast();

  function handleConnect() {
    const trimmed = addressInput.trim();
    if (!trimmed.startsWith("G") || trimmed.length !== 56) {
      toast({
        title: "Invalid Address",
        description: "Stellar addresses start with 'G' and are 56 characters long.",
        variant: "destructive",
      });
      return;
    }
    connect(trimmed);
    setAddressInput("");
    toast({ title: "Wallet Connected", description: `Connected: ${trimmed.slice(0, 8)}...${trimmed.slice(-6)}` });
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      <p className="text-muted-foreground text-center text-sm">
        Enter your Stellar address to get started.
      </p>
      <div className="flex gap-2 w-full">
        <Input
          placeholder="G... (Stellar public address)"
          value={addressInput}
          onChange={e => setAddressInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleConnect()}
          data-testid="input-inline-stellar-address"
        />
        <Button
          onClick={handleConnect}
          style={{ backgroundColor: STELLAR_PURPLE }}
          className="text-white shrink-0"
          data-testid="button-inline-stellar-connect"
        >
          <Star className="h-4 w-4 mr-2" />
          Connect
        </Button>
      </div>
    </div>
  );
}
