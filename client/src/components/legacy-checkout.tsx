import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins, CreditCard, Copy, Loader2, Clock, CheckCircle2 } from "lucide-react";
import type { LegacyTier } from "@/lib/pricing-data";

const CHAIN_LABELS: Record<string, string> = {
  bitcoin: "Bitcoin (BTC)",
  ethereum: "Ethereum (ETH)",
  solana: "Solana (SOL)",
  xrp: "XRP",
  rlusd: "RLUSD",
  dogecoin: "Dogecoin (DOGE)",
  litecoin: "Litecoin (LTC)",
  cardano: "Cardano (ADA)",
  avalanche: "Avalanche (AVAX)",
  algorand: "Algorand (ALGO)",
  cosmos: "Cosmos (ATOM)",
  tron: "Tron (TRX)",
  hedera: "Hedera (HBAR)",
  polkadot: "Polkadot (DOT)",
  vechain: "VeChain (VET)",
  stellar: "Stellar (XLM)",
  ton: "TON",
  polygon: "Polygon (MATIC)",
  cronos: "Cronos (CRO)",
  xdc: "XDC",
  digibyte: "DigiByte (DGB)",
  casper: "Casper (CSPR)",
  nervos: "Nervos (CKB)",
  zilliqa: "Zilliqa (ZIL)",
  verge: "Verge (XVG)",
};

const HOUSE_CHAINS = ["xrp", "rlusd", "bitcoin", "ethereum", "solana"];

function parseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/^\d+:\s*([\s\S]*)$/);
  const body = match ? match[1] : raw;
  try {
    const parsed = JSON.parse(body);
    if (parsed?.message) return parsed.message;
  } catch {
    /* not json */
  }
  return body || "Something went wrong. Please try again.";
}

interface PendingPayment {
  id: string;
  toAddress: string;
  expectedAmount: string;
  expectedAsset: string;
  usdAmount: string;
  destinationTag: number | null;
  status: string;
  chain: string;
}

export function LegacyCheckout({
  tier,
  isAuthed,
}: {
  tier: LegacyTier;
  isAuthed: boolean;
}) {
  const { toast } = useToast();
  const [cryptoOpen, setCryptoOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState("");
  const [pending, setPending] = useState<PendingPayment | null>(null);

  const { data: addresses = [] } = useQuery<any[]>({
    queryKey: ["/api/crypto-payment/addresses"],
    enabled: cryptoOpen,
  });

  const cardCheckout = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/addons/stripe-checkout", { addonKey: tier.addonKey }),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    },
    onError: (err) =>
      toast({ title: "Can't start checkout", description: parseError(err), variant: "destructive" }),
  });

  const cryptoPurchase = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/addons/crypto-purchase", {
        addonKey: tier.addonKey,
        chain: selectedChain,
      }),
    onSuccess: async (res) => {
      const data = await res.json();
      setPending(data);
    },
    onError: (err) =>
      toast({ title: "Can't start payment", description: parseError(err), variant: "destructive" }),
  });

  useQuery({
    queryKey: ["/api/crypto-payment/status", pending?.id],
    enabled: !!pending?.id && pending?.status === "pending",
    refetchInterval: 5000,
    queryFn: async () => {
      const res = await fetch(`/api/crypto-payment/status/${pending!.id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.status === "confirmed" || data.status === "completed") {
        toast({ title: "Payment received", description: "Your Legacy Plan is now active." });
        window.location.href = "/legacy-plan?addon_success=true";
      } else if (data.status === "expired") {
        toast({ title: "Payment window expired", description: "Please start a new payment.", variant: "destructive" });
        setPending(null);
        setCryptoOpen(false);
      }
      return data;
    },
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const resetCrypto = () => {
    setPending(null);
    setSelectedChain("");
    setCryptoOpen(false);
  };

  if (!isAuthed) {
    return (
      <Link href="/signup">
        <Button
          variant={tier.highlight ? "default" : "outline"}
          className={tier.highlight ? "w-full bg-pink-600 hover:bg-pink-700" : "w-full"}
          data-testid={`button-legacy-${tier.name.toLowerCase().replace(/\s+/g, "-")}`}
        >
          Get a free account first
        </Button>
      </Link>
    );
  }

  const isHouse = HOUSE_CHAINS.includes(selectedChain);
  const discountPct = isHouse ? "15% off" : "10% off";
  const numericPrice = Number(tier.price.replace(/[^0-9.]/g, "")) || 0;
  const discountedUsd = (numericPrice * (isHouse ? 0.85 : 0.9)).toFixed(2);

  return (
    <div className="space-y-2">
      <Button
        variant={tier.highlight ? "default" : "outline"}
        className={tier.highlight ? "w-full bg-pink-600 hover:bg-pink-700" : "w-full"}
        onClick={() => cardCheckout.mutate()}
        disabled={cardCheckout.isPending}
        data-testid={`button-legacy-${tier.name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {cardCheckout.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        Pay with card
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        onClick={() => setCryptoOpen(true)}
        data-testid={`button-legacy-crypto-${tier.name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Coins className="mr-1 h-3 w-3" />
        Pay with crypto (10% off)
      </Button>

      <Dialog open={cryptoOpen} onOpenChange={(o) => (o ? setCryptoOpen(true) : resetCrypto())}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-legacy-crypto">
          <DialogHeader>
            <DialogTitle>Pay with crypto — {tier.name}</DialogTitle>
            <DialogDescription>
              {tier.price} {tier.cadence}. Crypto payments get 10% off (15% off on BTC, ETH, SOL,
              XRP, RLUSD).
            </DialogDescription>
          </DialogHeader>

          {!pending && (
            <div className="space-y-3">
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger data-testid="select-legacy-crypto-chain">
                  <SelectValue placeholder="Select a cryptocurrency..." />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((addr: any) => (
                    <SelectItem key={addr.id} value={addr.chain}>
                      {CHAIN_LABELS[addr.chain] || addr.chain.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                onClick={() => cryptoPurchase.mutate()}
                disabled={!selectedChain || cryptoPurchase.isPending}
                data-testid="button-legacy-pay-crypto"
              >
                {cryptoPurchase.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="mr-2 h-4 w-4" />
                )}
                {selectedChain ? (
                  <>
                    Pay ${discountedUsd}{" "}
                    <span className="ml-1 text-xs opacity-75">
                      ({discountPct}
                      {isHouse ? " · House Tier" : ""})
                    </span>
                  </>
                ) : (
                  "Choose a coin to continue"
                )}
              </Button>
            </div>
          )}

          {pending && (
            <div className="space-y-3" data-testid="legacy-crypto-pending">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">Awaiting your payment...</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Send exactly</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs font-bold">
                      {pending.expectedAmount} {pending.expectedAsset}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => copy(pending.expectedAmount, "Amount")}
                      data-testid="button-copy-legacy-amount"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">To address</span>
                  <div className="flex items-center gap-1">
                    <code className="max-w-[200px] truncate font-mono text-[10px]">
                      {pending.toAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => copy(pending.toAddress, "Address")}
                      data-testid="button-copy-legacy-address"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
                {pending.destinationTag && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Destination Tag</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{pending.destinationTag}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => copy(String(pending.destinationTag), "Destination Tag")}
                        data-testid="button-copy-legacy-tag"
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Checking for your payment every 5 seconds...</span>
              </div>
              <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                As soon as it lands, your Legacy Plan activates and you'll be taken to the dashboard.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
