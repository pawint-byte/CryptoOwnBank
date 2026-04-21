import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Destination = { label: string; address: string; chain: string; source: "wallet" | "payee" };

export function FamilyRequestDialog({
  open, onOpenChange, seatId, ownerName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seatId: string;
  ownerName: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [actionType, setActionType] = useState<string>("send");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [destination, setDestination] = useState("");
  const [toAsset, setToAsset] = useState("");
  const [frequency, setFrequency] = useState("week");
  const [targetAsset, setTargetAsset] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");

  const { data: whitelist } = useQuery<{ destinations: Destination[] }>({
    queryKey: ["/api/family-seats", seatId, "whitelist"],
    queryFn: async () => {
      const r = await fetch(`/api/family-seats/${seatId}/whitelist`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: open && actionType === "send",
  });

  const reset = () => {
    setActionType("send"); setAmount(""); setAsset("USDC"); setDestination("");
    setToAsset(""); setFrequency("week"); setTargetAsset(""); setDescription(""); setNote("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let payload: any = {};
      let actionLabel = "";
      if (actionType === "send") {
        const dest = whitelist?.destinations.find(d => d.address === destination);
        payload = { amount, asset, destination, destinationLabel: dest?.label, chain: dest?.chain };
        actionLabel = `Send ${amount} ${asset}`;
      } else if (actionType === "dca") {
        payload = { amount, asset, frequency, targetAsset };
        actionLabel = `DCA ${amount} ${asset}/${frequency} → ${targetAsset}`;
      } else if (actionType === "stake" || actionType === "unstake") {
        payload = { amount, asset };
        actionLabel = `${actionType === "stake" ? "Stake" : "Unstake"} ${amount} ${asset}`;
      } else if (actionType === "swap") {
        payload = { amount, asset, toAsset };
        actionLabel = `Swap ${amount} ${asset} → ${toAsset}`;
      } else {
        payload = { description };
        actionLabel = description.slice(0, 80);
      }
      const res = await apiRequest("POST", "/api/family-proposals", { seatId, actionType, actionLabel, payload, proposerNote: note });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request sent", description: `${ownerName} will get an email and can approve in their account.` });
      qc.invalidateQueries({ queryKey: ["/api/family-proposals/mine"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't send request", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  const valid = (() => {
    if (actionType === "send") return amount && asset && destination;
    if (actionType === "dca") return amount && asset && frequency && targetAsset;
    if (actionType === "stake" || actionType === "unstake") return amount && asset;
    if (actionType === "swap") return amount && asset && toAsset;
    if (actionType === "other") return description.length > 0;
    return false;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-family-request">
        <DialogHeader>
          <DialogTitle>Make a request to {ownerName}</DialogTitle>
          <DialogDescription>
            Nothing will happen until {ownerName} approves it from their account. They get an email and can say yes or no.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label>What kind of request?</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger data-testid="select-action-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="send">Send funds</SelectItem>
                <SelectItem value="dca">Start a DCA (recurring buy)</SelectItem>
                <SelectItem value="swap">Swap tokens</SelectItem>
                <SelectItem value="stake">Stake</SelectItem>
                <SelectItem value="unstake">Unstake</SelectItem>
                <SelectItem value="other">Other (just ask)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType !== "other" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount</Label>
                <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="50" data-testid="input-amount" />
              </div>
              <div>
                <Label>Asset</Label>
                <Input value={asset} onChange={e => setAsset(e.target.value.toUpperCase())} placeholder="USDC" data-testid="input-asset" />
              </div>
            </div>
          )}

          {actionType === "send" && (
            <div>
              <Label>Send to (must be a saved address)</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger data-testid="select-destination">
                  <SelectValue placeholder={whitelist?.destinations.length ? "Pick a destination" : "No saved addresses available"} />
                </SelectTrigger>
                <SelectContent>
                  {whitelist?.destinations.map(d => (
                    <SelectItem key={`${d.chain}-${d.address}`} value={d.address}>
                      {d.label} ({d.chain.toUpperCase()}) {d.source === "wallet" ? "· own wallet" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                For safety, you can only request sends to addresses {ownerName} has already saved.
              </p>
            </div>
          )}

          {actionType === "dca" && (
            <>
              <div>
                <Label>Buy what?</Label>
                <Input value={targetAsset} onChange={e => setTargetAsset(e.target.value.toUpperCase())} placeholder="BTC" data-testid="input-target-asset" />
              </div>
              <div>
                <Label>How often?</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger data-testid="select-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {actionType === "swap" && (
            <div>
              <Label>Swap into</Label>
              <Input value={toAsset} onChange={e => setToAsset(e.target.value.toUpperCase())} placeholder="ETH" data-testid="input-to-asset" />
            </div>
          )}

          {actionType === "other" && (
            <div>
              <Label>What are you asking for?</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Buy me a coffee NFT..." rows={2} data-testid="textarea-description" />
            </div>
          )}

          <div>
            <Label>Note for {ownerName} (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="It's for my school books" rows={2} maxLength={1000} data-testid="textarea-note" />
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              {ownerName} reviews and signs every action in their own wallet. CryptoOwnBank doesn't move funds for you.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-request">Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending} data-testid="button-send-request">
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
