import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  Copy,
  Check,
  Shield,
  Wallet,
  Building2,
  ExternalLink,
  Share2,
  Zap,
  Clock,
  Eye,
  Plus,
  Trash2,
  Loader2,
  Timer,
  Link2,
} from "lucide-react";
import { useXrplStore } from "@/lib/xrpl-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserWallet, UserSettings, PortfolioSnapshot } from "@shared/schema";

export default function MyCardPage() {
  const { toast } = useToast();
  const { walletAddress, isConnected } = useXrplStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [defaultAmount, setDefaultAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("XRP");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotExpiry, setSnapshotExpiry] = useState("30");
  const [snapshotQrOpen, setSnapshotQrOpen] = useState(false);
  const [activeSnapshotUrl, setActiveSnapshotUrl] = useState("");

  const { data: savedWallets = [], isLoading: walletsLoading } = useQuery<UserWallet[]>({
    queryKey: ["/api/user-wallets"],
  });

  const { data: userSettings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery<PortfolioSnapshot[]>({
    queryKey: ["/api/portfolio-snapshots"],
  });

  const createSnapshotMutation = useMutation({
    mutationFn: (expiresInMinutes: number) =>
      apiRequest("POST", "/api/portfolio-snapshots", { expiresInMinutes }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-snapshots"] });
      setActiveSnapshotUrl(`${window.location.origin}${data.url}`);
      setSnapshotDialogOpen(false);
      setSnapshotQrOpen(true);
      toast({ title: "Snapshot created", description: "Share the QR code or link to let others view your balance." });
    },
    onError: () => toast({ title: "Failed to create snapshot", variant: "destructive" }),
  });

  const deleteSnapshotMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/portfolio-snapshots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-snapshots"] });
      toast({ title: "Snapshot deleted" });
    },
  });

  const receivingWallets = savedWallets.filter(
    (w) => w.purpose === "receiving" || w.purpose === "general" || w.purpose === "spending"
  );

  const selectedWallet = useMemo(() => {
    if (selectedWalletId) return savedWallets.find(w => w.id === selectedWalletId);
    if (receivingWallets.length > 0) return receivingWallets[0];
    return null;
  }, [selectedWalletId, savedWallets, receivingWallets]);

  const activeAddress = selectedWallet?.address || walletAddress || "";
  const activeTag = selectedWallet?.destinationTag || "";
  const activeChain = selectedWallet?.chain || "xrpl";

  const CHAIN_DEFAULT_CURRENCY: Record<string, string> = {
    xrpl: "XRP",
    stellar: "XLM",
    ethereum: "ETH",
    bitcoin: "BTC",
    solana: "SOL",
  };

  const currencyOptions = useMemo(() => {
    if (activeChain === "xrpl") return [{ value: "XRP", label: "XRP" }, { value: "RLUSD", label: "RLUSD" }];
    if (activeChain === "stellar") return [{ value: "XLM", label: "XLM" }, { value: "USDC", label: "USDC" }];
    return [{ value: CHAIN_DEFAULT_CURRENCY[activeChain] || activeChain.toUpperCase(), label: CHAIN_DEFAULT_CURRENCY[activeChain] || activeChain.toUpperCase() }];
  }, [activeChain]);

  const effectiveCurrency = useMemo(() => {
    const valid = currencyOptions.map(c => c.value);
    if (valid.includes(selectedCurrency)) return selectedCurrency;
    return valid[0] || "XRP";
  }, [selectedCurrency, currencyOptions]);

  const brand = useMemo(() => {
    if (!userSettings) return {};
    const s = userSettings as any;
    return {
      name: s.businessName || "",
      logo: s.businessLogo || "",
      tagline: s.businessTagline || "",
      email: s.businessEmail || "",
      phone: s.businessPhone || "",
      website: s.businessWebsite || "",
    };
  }, [userSettings]);

  const payLink = useMemo(() => {
    if (!activeAddress) return "";
    const params = new URLSearchParams();
    params.set("to", activeAddress);
    if (defaultAmount) params.set("amount", defaultAmount);
    params.set("currency", effectiveCurrency);
    if (activeTag) params.set("tag", activeTag);
    if (brand.name) params.set("from", brand.name);
    if (brand.logo) params.set("logo", brand.logo);
    return `${window.location.origin}/pay?${params.toString()}`;
  }, [activeAddress, defaultAmount, effectiveCurrency, activeTag, brand]);

  const qrSrc = payLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payLink)}`
    : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({ title: `${label} copied` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = async () => {
    if (navigator.share && payLink) {
      try {
        await navigator.share({
          title: brand.name ? `Pay ${brand.name}` : "Payment Request",
          text: `Pay me via CryptoOwnBank`,
          url: payLink,
        });
      } catch {
        copyToClipboard(payLink, "Payment link");
      }
    } else {
      copyToClipboard(payLink, "Payment link");
    }
  };

  const formatTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m left`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m left`;
  };

  if (walletsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-mycard-title">OwnCoin POS</h1>
        <p className="text-muted-foreground">
          Your portable point-of-sale — show this QR code to receive crypto payments instantly, anywhere
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#00A4E4]/30">
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-3">
              {brand.logo && (
                <div className="flex justify-center">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="h-14 w-14 rounded-xl object-contain border bg-white shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    data-testid="img-card-logo"
                  />
                </div>
              )}
              {brand.name && (
                <p className="font-semibold text-lg" data-testid="text-card-business">{brand.name}</p>
              )}
              {brand.tagline && (
                <p className="text-xs text-muted-foreground">{brand.tagline}</p>
              )}
              {!brand.name && !brand.logo && (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-[#00A4E4]/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-[#00A4E4]" />
                  </div>
                  <p className="font-semibold">My Payment QR</p>
                </div>
              )}
            </div>

            {activeAddress ? (
              <>
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl border-2 border-[#00A4E4]/20 bg-white shadow-sm" data-testid="qr-owncoin-pos">
                    <img
                      src={qrSrc}
                      alt="Scan to pay"
                      className="w-[200px] h-[200px] sm:w-[230px] sm:h-[230px]"
                      data-testid="img-payment-qr"
                    />
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Scan with any XRPL or Stellar wallet to pay
                </p>

                {defaultAmount && (
                  <div className="text-center">
                    <Badge variant="secondary" className="text-lg px-4 py-1.5" data-testid="badge-default-amount">
                      {defaultAmount} {effectiveCurrency}
                    </Badge>
                  </div>
                )}

                <Separator />

                <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Address</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-[11px] truncate max-w-[180px]" data-testid="text-card-address">
                        {activeAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => copyToClipboard(activeAddress, "Address")}
                        data-testid="button-copy-address"
                      >
                        {copiedField === "Address" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  {activeTag && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Dest. Tag</span>
                      <code className="font-mono font-bold" data-testid="text-card-tag">{activeTag}</code>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Network</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 h-5">{activeChain.toUpperCase()}</Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-[#00A4E4] hover:bg-[#0090c9] text-white"
                    onClick={handleShare}
                    data-testid="button-share-card"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => copyToClipboard(payLink, "Payment link")}
                    data-testid="button-copy-link"
                  >
                    {copiedField === "Payment link" ? (
                      <><Check className="h-4 w-4 mr-2 text-green-500" /> Copied</>
                    ) : (
                      <><Link2 className="h-4 w-4 mr-2" /> Copy Link</>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-3">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Add a receiving wallet in Settings to generate your payment QR
                </p>
                <a href="/settings">
                  <Button variant="outline" size="sm" data-testid="link-add-wallet">
                    <Plus className="h-4 w-4 mr-1" /> Add Wallet
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customize Your Card</CardTitle>
              <CardDescription>Set which wallet to show and an optional default amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Receiving Wallet</Label>
                <Select
                  value={selectedWalletId || (selectedWallet?.id || "")}
                  onValueChange={setSelectedWalletId}
                >
                  <SelectTrigger data-testid="select-wallet">
                    <SelectValue placeholder="Select wallet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedWallets.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label} — {w.address.slice(0, 8)}...{w.address.slice(-4)} ({w.chain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Default Amount (optional)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={defaultAmount}
                    onChange={(e) => setDefaultAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    data-testid="input-default-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={effectiveCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!brand.name && (
                <div className="rounded-lg border border-dashed p-3 text-center">
                  <Building2 className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    Add your business name and logo in{" "}
                    <a href="/settings" className="text-[#00A4E4] underline">Settings</a>{" "}
                    to brand your OwnCoin POS
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Portfolio Snapshot QR
                  </CardTitle>
                  <CardDescription>Generate a temporary, read-only balance view</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setSnapshotDialogOpen(true)}
                  data-testid="button-create-snapshot"
                >
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {snapshotsLoading ? (
                <Skeleton className="h-20" />
              ) : snapshots.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <QrCode className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Create a snapshot to generate a temporary QR code that shows your portfolio balance.
                    Share it or scan it from another device.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.slice(0, 5).map((snap) => {
                    const isExpired = new Date(snap.expiresAt) < new Date();
                    return (
                      <div
                        key={snap.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${isExpired ? "opacity-50" : ""}`}
                        data-testid={`snapshot-${snap.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isExpired ? "bg-muted" : "bg-emerald-500/10"}`}>
                            <Eye className={`h-4 w-4 ${isExpired ? "text-muted-foreground" : "text-emerald-600"}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              ${parseFloat(snap.totalValue || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {isExpired ? "Expired" : formatTimeLeft(snap.expiresAt as any)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isExpired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setActiveSnapshotUrl(`${window.location.origin}/snapshot/${snap.token}`);
                                setSnapshotQrOpen(true);
                              }}
                              data-testid={`button-show-snapshot-qr-${snap.id}`}
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => deleteSnapshotMutation.mutate(snap.id)}
                            data-testid={`button-delete-snapshot-${snap.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-card border">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] text-muted-foreground leading-tight">4-second settlement</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-card border">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground leading-tight">Non-custodial</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-card border">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] text-muted-foreground leading-tight">Near-zero fees</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={snapshotDialogOpen} onOpenChange={setSnapshotDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Portfolio Snapshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This creates a temporary, read-only view of your total portfolio value.
              Anyone with the link can see the snapshot until it expires. No login required.
            </p>
            <div className="space-y-2">
              <Label>Expires After</Label>
              <Select value={snapshotExpiry} onValueChange={setSnapshotExpiry}>
                <SelectTrigger data-testid="select-snapshot-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => createSnapshotMutation.mutate(parseInt(snapshotExpiry))}
              disabled={createSnapshotMutation.isPending}
              data-testid="button-confirm-snapshot"
            >
              {createSnapshotMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Generate Snapshot QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={snapshotQrOpen} onOpenChange={setSnapshotQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Snapshot QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl border-2 border-emerald-500/20 bg-white shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeSnapshotUrl)}`}
                  alt="Portfolio snapshot QR"
                  className="w-[200px] h-[200px]"
                  data-testid="img-snapshot-qr"
                />
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Scan to view your portfolio balance on any device
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(activeSnapshotUrl, "Snapshot link")}
                data-testid="button-copy-snapshot-link"
              >
                {copiedField === "Snapshot link" ? (
                  <><Check className="h-4 w-4 mr-2 text-green-500" /> Copied</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" /> Copy Link</>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(activeSnapshotUrl, "_blank")}
                data-testid="button-open-snapshot"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
