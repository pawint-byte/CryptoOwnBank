import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useXrplStore } from "@/lib/xrpl-store";
import { signPayment } from "@/lib/xumm-connector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  Settings2,
  Moon,
  Sun,
  Monitor,
  Wallet,
  Crown,
  Check,
  ExternalLink,
  Coins,
  CreditCard,
  Copy,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowUp,
  Sparkles,
  QrCode,
  Plus,
  Pencil,
  Trash2,
  Star,
  Tag,
} from "lucide-react";
import type { UserSettings, UserWallet } from "@shared/schema";

const settingsFormSchema = z.object({
  taxMethod: z.enum(["FIFO", "LIFO"]),
  defaultCurrency: z.string().min(1),
  taxYear: z.number().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { spendingWallet, setSpendingWallet, subscriptionTier } = useXrplStore();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<UserWallet | null>(null);
  const [walletForm, setWalletForm] = useState({
    label: "",
    address: "",
    chain: "xrpl",
    purpose: "general",
    destinationTag: "",
    isPrimary: false,
  });
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "card">("crypto");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [xamanPayLoading, setXamanPayLoading] = useState(false);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription"],
  });

  const { data: cryptoAddresses = [] } = useQuery<any[]>({
    queryKey: ["/api/crypto-payment/addresses"],
  });

  const { data: paymentStatus } = useQuery({
    queryKey: ["/api/crypto-payment/status", pendingPayment?.id],
    enabled: !!pendingPayment?.id && pendingPayment?.status === "pending",
    refetchInterval: 5000,
  });

  const { data: myWallets = [], isLoading: walletsLoading } = useQuery<UserWallet[]>({
    queryKey: ["/api/user-wallets"],
  });

  const createWalletMutation = useMutation({
    mutationFn: (data: typeof walletForm) => apiRequest("POST", "/api/user-wallets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-wallets"] });
      setWalletDialogOpen(false);
      toast({ title: "Wallet saved" });
    },
    onError: () => toast({ title: "Failed to save wallet", variant: "destructive" }),
  });

  const updateWalletMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof walletForm) =>
      apiRequest("PUT", `/api/user-wallets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-wallets"] });
      setWalletDialogOpen(false);
      setEditingWallet(null);
      toast({ title: "Wallet updated" });
    },
    onError: () => toast({ title: "Failed to update wallet", variant: "destructive" }),
  });

  const deleteWalletMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user-wallets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-wallets"] });
      toast({ title: "Wallet removed" });
    },
    onError: () => toast({ title: "Failed to remove wallet", variant: "destructive" }),
  });

  const openAddWallet = () => {
    setEditingWallet(null);
    setWalletForm({ label: "", address: "", chain: "xrpl", purpose: "general", destinationTag: "", isPrimary: false });
    setWalletDialogOpen(true);
  };

  const openEditWallet = (w: UserWallet) => {
    setEditingWallet(w);
    setWalletForm({
      label: w.label,
      address: w.address,
      chain: w.chain,
      purpose: w.purpose,
      destinationTag: w.destinationTag || "",
      isPrimary: w.isPrimary || false,
    });
    setWalletDialogOpen(true);
  };

  const handleSaveWallet = () => {
    if (!walletForm.label.trim() || !walletForm.address.trim()) {
      toast({ title: "Label and address are required", variant: "destructive" });
      return;
    }
    if (editingWallet) {
      updateWalletMutation.mutate({ id: editingWallet.id, ...walletForm });
    } else {
      createWalletMutation.mutate(walletForm);
    }
    if (walletForm.purpose === "yield" || walletForm.purpose === "spending") {
      setSpendingWallet(walletForm.address.trim());
    }
  };

  useEffect(() => {
    if (subscriptionData?.tier === "premium" && subscriptionTier !== "premium") {
      useXrplStore.getState().setSubscriptionTier("premium");
    } else if (subscriptionData?.tier === "free" && subscriptionTier !== "free") {
      useXrplStore.getState().setSubscriptionTier("free");
    }
  }, [subscriptionData]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      taxMethod: "FIFO",
      defaultCurrency: "USD",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        taxMethod: (settings.taxMethod as "FIFO" | "LIFO") || "FIFO",
        defaultCurrency: settings.defaultCurrency || "USD",
        taxYear: settings.taxYear || undefined,
      });
    }
  }, [settings, form]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      toast({ title: "Welcome to Premium!", description: "Your subscription is now active." });
      const url = new URL(window.location.href);
      url.searchParams.delete("subscription");
      window.history.replaceState({}, "", url.pathname);
    } else if (params.get("subscription") === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No changes were made." });
      const url = new URL(window.location.href);
      url.searchParams.delete("subscription");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  const updateMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      return apiRequest("PUT", "/api/settings", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateMutation.mutate(values);
  };


  useEffect(() => {
    if (paymentStatus && (paymentStatus as any).status === "confirmed") {
      setPendingPayment(null);
      toast({ title: "Payment confirmed! Welcome to Premium!" });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/limits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    }
  }, [paymentStatus]);

  const handleUpgrade = async (plan: "monthly" | "yearly") => {
    setCheckoutLoading(plan);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-checkout", { plan });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Failed to start checkout", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to start checkout", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCryptoPayment = async () => {
    if (!selectedChain) {
      toast({ title: "Please select a cryptocurrency", variant: "destructive" });
      return;
    }
    setCryptoLoading(true);
    try {
      const res = await apiRequest("POST", "/api/crypto-payment/create", {
        plan: selectedPlan,
        chain: selectedChain,
      });
      const data = await res.json();
      setPendingPayment(data);
    } catch {
      toast({ title: "Failed to create payment", variant: "destructive" });
    } finally {
      setCryptoLoading(false);
    }
  };

  const handleXamanPay = async () => {
    if (!pendingPayment) return;
    setXamanPayLoading(true);
    try {
      const chain = pendingPayment.chain?.toLowerCase();
      let amount: string | { currency: string; value: string; issuer: string };
      if (chain === "rlusd") {
        amount = {
          currency: "524C555344000000000000000000000000000000",
          value: pendingPayment.expectedAmount,
          issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
        };
      } else {
        amount = String(Math.round(parseFloat(pendingPayment.expectedAmount) * 1_000_000));
      }
      const options: { destinationTag?: number; memos?: Array<{ MemoType?: string; MemoData?: string }> } = {};
      if (pendingPayment.destinationTag) {
        options.destinationTag = Number(pendingPayment.destinationTag);
      }
      options.memos = [{ MemoType: "text/plain", MemoData: `CryptoOwnBank Premium ${pendingPayment.referenceCode || ""}` }];

      const result = await signPayment(pendingPayment.toAddress, amount, options);
      if (result.success) {
        toast({ title: "Payment sent! Verifying on-chain...", description: "We'll confirm your payment automatically within a few minutes." });
      } else {
        toast({ title: result.error || "Payment was not completed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to open Xaman", variant: "destructive" });
    } finally {
      setXamanPayLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const CHAIN_LABELS: Record<string, string> = {
    rlusd: "RLUSD (Stablecoin)", xrp: "XRP",
    bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)", solana: "Solana (SOL)",
    dogecoin: "Dogecoin (DOGE)", litecoin: "Litecoin (LTC)",
    cardano: "Cardano (ADA)", avalanche: "Avalanche (AVAX)", algorand: "Algorand (ALGO)",
    cosmos: "Cosmos (ATOM)", tron: "Tron (TRX)", hedera: "Hedera (HBAR)",
    polkadot: "Polkadot (DOT)", vechain: "VeChain (VET)", stellar: "Stellar (XLM)",
    ton: "TON", polygon: "Polygon (MATIC)", cronos: "Cronos (CRO)", xdc: "XDC",
    digibyte: "DigiByte (DGB)", casper: "Casper (CSPR)", nervos: "Nervos (CKB)",
    zilliqa: "Zilliqa (ZIL)", verge: "Verge (XVG)",
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-base sm:text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium truncate">{user?.email || "Not set"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Member Since</Label>
                <p className="font-medium">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => setTheme("system")}
                  data-testid="button-theme-system"
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#00A4E4]/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#00A4E4]" />
                  My Wallets
                </CardTitle>
                <CardDescription>
                  Organize your wallets by purpose — yield, spending, receiving, savings, or trading
                </CardDescription>
              </div>
              <Button size="sm" onClick={openAddWallet} data-testid="button-add-wallet">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {walletsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : myWallets.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Wallet className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No wallets saved yet</p>
                <p className="text-xs text-muted-foreground">Add wallets for different purposes — yield, spending, receiving, and more</p>
                {spendingWallet ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWalletForm({
                        label: "My XRPL Wallet",
                        address: spendingWallet,
                        chain: "xrpl",
                        purpose: "yield",
                        destinationTag: "",
                        isPrimary: true,
                      });
                      setEditingWallet(null);
                      setWalletDialogOpen(true);
                    }}
                    data-testid="button-migrate-wallet"
                  >
                    <ArrowUp className="h-4 w-4 mr-1" /> Import Existing Wallet ({spendingWallet.slice(0, 8)}...)
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={openAddWallet} data-testid="button-add-first-wallet">
                    <Plus className="h-4 w-4 mr-1" /> Add Your First Wallet
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {myWallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                    data-testid={`wallet-item-${w.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate" data-testid={`text-wallet-label-${w.id}`}>{w.label}</span>
                          {w.isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[220px]" data-testid={`text-wallet-address-${w.id}`}>
                          {w.address.length > 20 ? `${w.address.slice(0, 10)}...${w.address.slice(-8)}` : w.address}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 capitalize" data-testid={`badge-chain-${w.id}`}>
                        {w.chain === "xrpl" ? "XRPL" : w.chain === "stellar" ? "Stellar" : w.chain}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 capitalize ${
                          w.purpose === "yield" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          w.purpose === "spending" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          w.purpose === "receiving" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                          w.purpose === "savings" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          w.purpose === "trading" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          ""
                        }`}
                        data-testid={`badge-purpose-${w.id}`}
                      >
                        {w.purpose}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWallet(w)} data-testid={`button-edit-wallet-${w.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteWalletMutation.mutate(w.id)}
                        data-testid={`button-delete-wallet-${w.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Subscription
            </CardTitle>
            <CardDescription>
              Your current plan and upgrade options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant={subscriptionTier === "premium" ? "default" : "secondary"}
                className={subscriptionTier === "premium" ? "bg-amber-500" : ""}
                data-testid="badge-subscription-tier"
              >
                {subscriptionTier === "premium" ? "Premium" : "Free"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {subscriptionTier === "premium"
                  ? "Full access to all features"
                  : "Basic features included"}
              </span>
            </div>

            {subscriptionTier === "free" && (
              <>
                <Separator />

                {pendingPayment && pendingPayment.status === "pending" ? (
                  <div className="space-y-4" data-testid="crypto-payment-pending">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span className="text-sm font-medium">Awaiting payment...</span>
                      </div>
                      {pendingPayment.referenceCode && (
                        <Badge variant="outline" className="font-mono text-xs" data-testid="text-reference-code">
                          Ref: {pendingPayment.referenceCode}
                        </Badge>
                      )}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Send exactly</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm" data-testid="text-expected-amount">
                            {pendingPayment.expectedAmount} {pendingPayment.expectedAsset}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(pendingPayment.expectedAmount, "Amount")}
                            data-testid="button-copy-amount"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">USD equivalent</span>
                        <span className="text-sm">${pendingPayment.usdAmount}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Plan: {pendingPayment.plan === "yearly" ? "Annual" : "Monthly"}</span>
                        <span>Expires: {new Date(pendingPayment.expiresAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {(pendingPayment.chain === "xrp" || pendingPayment.chain === "rlusd") ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border-2 border-[#00A4E4]/40 bg-[#00A4E4]/5 p-4" data-testid="option-xaman">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-8 w-8 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Wallet className="h-4 w-4 text-[#00A4E4]" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-semibold">Pay with Xaman</span>
                                <Badge className="bg-[#00A4E4] text-[10px] px-1.5 py-0">Easiest</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Opens your Xaman wallet with the address, amount, and destination tag pre-filled. You just approve — one tap, 4 seconds, done. <a href="https://xaman.app" target="_blank" rel="noopener noreferrer" className="underline text-[#00A4E4]">Get Xaman free</a>
                              </p>
                            </div>
                          </div>
                          <Button
                            className="w-full bg-[#00A4E4] hover:bg-[#0090c9] text-white h-11"
                            onClick={handleXamanPay}
                            disabled={xamanPayLoading}
                            data-testid="button-pay-xaman"
                          >
                            {xamanPayLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Wallet className="h-4 w-4 mr-2" />
                            )}
                            Open Xaman & Pay
                          </Button>
                        </div>

                        <div className="rounded-lg border p-4" data-testid="option-qr">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-semibold block mb-0.5">Scan QR Code</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Open Xaman or any XRPL wallet on your phone and scan this code. The payment details are embedded — just confirm and send.
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-center">
                            <div className="p-3 rounded-lg border bg-white" data-testid="qr-payment-container">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                  pendingPayment.chain === "rlusd"
                                    ? `https://xrpl.to/?to=${pendingPayment.toAddress}&dt=${pendingPayment.destinationTag || ""}&amount=${pendingPayment.expectedAmount}&currency=RLUSD`
                                    : `https://xrpl.to/?to=${pendingPayment.toAddress}&dt=${pendingPayment.destinationTag || ""}&amount=${pendingPayment.expectedAmount}`
                                )}`}
                                alt="Payment QR Code"
                                className="w-40 h-40"
                                data-testid="img-payment-qr"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4" data-testid="option-manual">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-semibold block mb-0.5">Send Manually</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Copy the address and destination tag below and send from any XRPL-compatible wallet, exchange, or platform. Make sure to include the destination tag — without it, your payment can't be matched.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">To address</span>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-background rounded px-2 py-1 flex-1 break-all" data-testid="text-payment-address">
                                  {pendingPayment.toAddress}
                                </code>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => copyToClipboard(pendingPayment.toAddress, "Address")} data-testid="button-copy-address">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {pendingPayment.destinationTag && (
                              <div>
                                <span className="text-[11px] text-muted-foreground block mb-0.5">
                                  <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
                                  Destination Tag (required)
                                </span>
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded px-2 py-1" data-testid="text-destination-tag">
                                    {pendingPayment.destinationTag}
                                  </code>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(String(pendingPayment.destinationTag), "Destination tag")} data-testid="button-copy-tag">
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">Amount</span>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-background rounded px-2 py-1" data-testid="text-manual-amount">
                                  {pendingPayment.expectedAmount} {pendingPayment.expectedAsset}
                                </code>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(pendingPayment.expectedAmount, "Amount")} data-testid="button-copy-amount-manual">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-lg border p-4" data-testid="option-qr-other">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-semibold block mb-0.5">Scan Address QR</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Scan with your wallet app to get the address. Then send exactly <strong>{pendingPayment.expectedAmount} {pendingPayment.expectedAsset}</strong> — the last decimal places are unique to your order for automatic matching.
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-center">
                            <div className="p-3 rounded-lg border bg-white">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pendingPayment.toAddress)}`}
                                alt="Payment Address QR Code"
                                className="w-36 h-36"
                                data-testid="img-address-qr"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4" data-testid="option-manual-other">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-semibold block mb-0.5">Copy & Send Manually</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Copy the address below and send from any wallet or exchange. Send the exact amount shown — the last decimal places identify your payment.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">To address</span>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-background rounded px-2 py-1 flex-1 break-all" data-testid="text-payment-address">
                                  {pendingPayment.toAddress}
                                </code>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => copyToClipboard(pendingPayment.toAddress, "Address")} data-testid="button-copy-address">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">Exact amount</span>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono font-bold bg-background rounded px-2 py-1" data-testid="text-manual-amount">
                                  {pendingPayment.expectedAmount} {pendingPayment.expectedAsset}
                                </code>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(pendingPayment.expectedAmount, "Amount")} data-testid="button-copy-amount-manual">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3" data-testid="tip-xrpl-next-time">
                          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Faster next time
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                            Pay with XRP or RLUSD using <a href="https://xaman.app" target="_blank" rel="noopener noreferrer" className="underline font-medium">Xaman</a> on your phone — one tap to approve, settles in 4 seconds, fractions of a penny. No copy-paste needed.
                          </p>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const chain = pendingPayment.chain?.toLowerCase();
                      const dex = { name: "Changelly", url: "https://changelly.com" };
                      const chNow = { name: "ChangeNOW", url: "https://changenow.io" };
                      const swapLinks: Record<string, { name: string; url: string }[]> = {
                        ethereum: [{ name: "Uniswap", url: "https://app.uniswap.org/swap" }, { name: "1inch", url: "https://app.1inch.io" }],
                        solana: [{ name: "Jupiter", url: "https://jup.ag/swap" }, { name: "Raydium", url: "https://raydium.io/swap" }],
                        xrp: [{ name: "Sologenic DEX", url: "https://sologenic.org/trade" }],
                        rlusd: [{ name: "Sologenic DEX", url: "https://sologenic.org/trade" }, { name: "First Ledger", url: "https://firstledger.net" }],
                        bitcoin: [dex, chNow],
                        polygon: [{ name: "QuickSwap", url: "https://quickswap.exchange" }, { name: "1inch", url: "https://app.1inch.io" }],
                        avalanche: [{ name: "Trader Joe", url: "https://traderjoexyz.com/avalanche/trade" }, dex],
                        cronos: [{ name: "VVS Finance", url: "https://vvs.finance/swap" }],
                        tron: [{ name: "SunSwap", url: "https://sunswap.com" }],
                        cosmos: [{ name: "Osmosis", url: "https://app.osmosis.zone" }],
                        stellar: [{ name: "StellarX", url: "https://www.stellarx.com" }],
                        ton: [{ name: "STON.fi", url: "https://ston.fi/swap" }],
                        algorand: [{ name: "Tinyman", url: "https://app.tinyman.org" }],
                        dogecoin: [dex, chNow],
                        litecoin: [dex, chNow],
                        cardano: [{ name: "SundaeSwap", url: "https://sundae.fi" }, { name: "Minswap", url: "https://minswap.org" }],
                        hedera: [{ name: "SaucerSwap", url: "https://www.saucerswap.finance" }],
                        polkadot: [dex, chNow],
                        vechain: [dex, chNow],
                        digibyte: [dex, chNow],
                        casper: [dex, chNow],
                        nervos: [dex, chNow],
                        zilliqa: [{ name: "ZilSwap", url: "https://zilswap.io" }],
                        verge: [dex, chNow],
                        xdc: [{ name: "XSwap", url: "https://xspswap.finance" }, dex],
                      };
                      const links = swapLinks[chain] || [dex, chNow];
                      return (
                        <div className="text-xs text-muted-foreground" data-testid="swap-links">
                          <span>Need to convert first? Swap on </span>
                          {links.map((link, i) => (
                            <span key={link.name + i}>
                              {i > 0 && " or "}
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-600 hover:text-amber-700 underline inline-flex items-center gap-0.5"
                                data-testid={`link-swap-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {link.name}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </span>
                          ))}
                          <span>, then send {pendingPayment.expectedAsset} here.</span>
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Checking for payment every 5 seconds... {(paymentStatus as any)?.status === "confirmed" ? "Confirmed!" : ""}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingPayment(null)}
                      className="text-xs"
                      data-testid="button-cancel-crypto"
                    >
                      Cancel and choose different method
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Upgrade to Premium</p>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={selectedPlan === "monthly" ? "default" : "outline"}
                        className={`flex flex-col h-auto py-3 gap-1 ${selectedPlan === "monthly" ? "border-amber-500 bg-amber-500/10 text-foreground ring-2 ring-amber-500" : "border-amber-500/30 hover:border-amber-500"}`}
                        onClick={() => setSelectedPlan("monthly")}
                        data-testid="button-plan-monthly"
                      >
                        <span className="text-lg font-bold">$29</span>
                        <span className="text-xs text-muted-foreground">/month</span>
                      </Button>
                      <Button
                        variant={selectedPlan === "yearly" ? "default" : "outline"}
                        className={`flex flex-col h-auto py-3 gap-1 relative ${selectedPlan === "yearly" ? "border-amber-500 bg-amber-500/10 text-foreground ring-2 ring-amber-500" : "border-amber-500/30 hover:border-amber-500"}`}
                        onClick={() => setSelectedPlan("yearly")}
                        data-testid="button-plan-yearly"
                      >
                        <Badge className="absolute -top-2 right-2 bg-green-500 text-[10px] px-1.5">
                          Save $149
                        </Badge>
                        <span className="text-lg font-bold">$199</span>
                        <span className="text-xs text-muted-foreground">/year + tax reports</span>
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div
                        className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${paymentMethod === "crypto" ? "border-amber-500 bg-amber-500/5" : "border-muted hover:border-amber-500/50"}`}
                        onClick={() => setPaymentMethod("crypto")}
                        data-testid="button-method-crypto"
                      >
                        <div className="flex items-center gap-3">
                          <Coins className="h-5 w-5 text-amber-500" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Pay with Crypto</span>
                              <Badge className="bg-amber-500 text-[10px] px-1.5">Preferred</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">Stay on-chain. Pay with any supported cryptocurrency.</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${paymentMethod === "card" ? "border-amber-500 bg-amber-500/5" : "border-muted hover:border-amber-500/50"}`}
                        onClick={() => setPaymentMethod("card")}
                        data-testid="button-method-card"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <span className="text-sm font-medium">Pay with Card</span>
                            <p className="text-xs text-muted-foreground">Credit/debit card via Stripe</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {paymentMethod === "crypto" && (
                      <div className="space-y-3">
                        {cryptoAddresses.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Crypto payments coming soon. Use card payment for now.
                          </p>
                        ) : (
                          <>
                            <Select value={selectedChain} onValueChange={setSelectedChain}>
                              <SelectTrigger className="h-9 text-sm" data-testid="select-crypto-chain">
                                <SelectValue placeholder="Select cryptocurrency..." />
                              </SelectTrigger>
                              <SelectContent>
                                {cryptoAddresses.map((addr: any) => (
                                  <SelectItem key={addr.id} value={addr.chain}>
                                    {CHAIN_LABELS[addr.chain] || addr.chain.toUpperCase()}
                                    {addr.label ? ` (${addr.label})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedChain && (() => {
                              const addr = cryptoAddresses.find((a: any) => a.chain === selectedChain);
                              return addr?.label ? (
                                <p className="text-xs text-muted-foreground" data-testid="text-wallet-label">
                                  Payment goes to your <span className="font-medium">{addr.label}</span> cold wallet
                                </p>
                              ) : null;
                            })()}
                            {!selectedChain && (
                              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" />
                                Choose a cryptocurrency above to continue
                              </p>
                            )}
                            <Button
                              className={`w-full text-white ${selectedChain ? "bg-amber-600 hover:bg-amber-700" : "bg-amber-600/40 cursor-not-allowed"}`}
                              onClick={handleCryptoPayment}
                              disabled={!selectedChain || cryptoLoading}
                              data-testid="button-pay-crypto"
                            >
                              {cryptoLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Coins className="h-4 w-4 mr-2" />
                              )}
                              Pay ${selectedPlan === "yearly" ? "79" : "9"} with {selectedChain ? (CHAIN_LABELS[selectedChain]?.split(" ")[0] || selectedChain) : "Crypto"}
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {paymentMethod === "card" && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleUpgrade(selectedPlan)}
                        disabled={checkoutLoading !== null}
                        data-testid="button-pay-card"
                      >
                        {checkoutLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        Continue to Stripe Checkout
                      </Button>
                    )}

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        Full Recommendations Hub with staking guides
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        Unlimited exchanges, wallets & alerts
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        Portfolio search, filter & sort
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        Auto-withdraw interest weekly
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        Tax reports (annual plan only)
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax & Currency Settings</CardTitle>
          <CardDescription>
            Configure your default tax calculation method and currency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="taxMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Tax Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer">
                            <RadioGroupItem value="FIFO" id="settings-fifo" />
                            <Label htmlFor="settings-fifo" className="flex-1 cursor-pointer">
                              <span className="font-medium">FIFO</span>
                              <p className="text-xs text-muted-foreground">
                                First In, First Out
                              </p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer">
                            <RadioGroupItem value="LIFO" id="settings-lifo" />
                            <Label htmlFor="settings-lifo" className="flex-1 cursor-pointer">
                              <span className="font-medium">LIFO</span>
                              <p className="text-xs text-muted-foreground">
                                Last In, First Out
                              </p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        This will be used as the default for tax calculations
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        All values will be displayed in this currency
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-destructive/30">
            <div className="min-w-0">
              <p className="font-medium">Delete All Data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your transactions and settings
              </p>
            </div>
            <Button variant="destructive" size="sm" className="flex-shrink-0 self-start sm:self-center" data-testid="button-delete-data">
              Delete Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWallet ? "Edit Wallet" : "Add Wallet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wallet-label">Label</Label>
              <Input
                id="wallet-label"
                placeholder="e.g. My Cold Storage, Trading Wallet"
                value={walletForm.label}
                onChange={(e) => setWalletForm((f) => ({ ...f, label: e.target.value }))}
                data-testid="input-wallet-label"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-chain">Blockchain</Label>
              <Select
                value={walletForm.chain}
                onValueChange={(v) => setWalletForm((f) => ({ ...f, chain: v }))}
              >
                <SelectTrigger data-testid="select-wallet-chain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xrpl">XRPL (XRP Ledger)</SelectItem>
                  <SelectItem value="stellar">Stellar (XLM)</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="cardano">Cardano</SelectItem>
                  <SelectItem value="polkadot">Polkadot</SelectItem>
                  <SelectItem value="cosmos">Cosmos</SelectItem>
                  <SelectItem value="avalanche">Avalanche</SelectItem>
                  <SelectItem value="hedera">Hedera</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder={walletForm.chain === "xrpl" ? "rXXXX...XXXX" : walletForm.chain === "stellar" ? "GXXXX...XXXX" : walletForm.chain === "ethereum" ? "0x..." : "Enter address"}
                value={walletForm.address}
                onChange={(e) => setWalletForm((f) => ({ ...f, address: e.target.value }))}
                className="font-mono text-sm"
                data-testid="input-wallet-address"
              />
            </div>
            {(walletForm.chain === "xrpl" || walletForm.chain === "stellar") && (
              <div className="space-y-2">
                <Label htmlFor="wallet-tag">
                  {walletForm.chain === "stellar" ? "Memo ID (optional)" : "Destination Tag (optional)"}
                </Label>
                <Input
                  id="wallet-tag"
                  placeholder={walletForm.chain === "stellar" ? "e.g. 1234567890" : "e.g. 12345"}
                  value={walletForm.destinationTag}
                  onChange={(e) => setWalletForm((f) => ({ ...f, destinationTag: e.target.value }))}
                  data-testid="input-wallet-tag"
                />
                <p className="text-xs text-muted-foreground">
                  {walletForm.chain === "stellar"
                    ? "Required for exchange deposits — Stellar uses memo IDs to identify your account"
                    : "Required for exchange wallets"}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Purpose</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "yield", label: "Yield", color: "border-green-500 bg-green-50 dark:bg-green-900/20" },
                  { value: "spending", label: "Spending", color: "border-blue-500 bg-blue-50 dark:bg-blue-900/20" },
                  { value: "receiving", label: "Receiving", color: "border-purple-500 bg-purple-50 dark:bg-purple-900/20" },
                  { value: "savings", label: "Savings", color: "border-amber-500 bg-amber-50 dark:bg-amber-900/20" },
                  { value: "trading", label: "Trading", color: "border-red-500 bg-red-50 dark:bg-red-900/20" },
                  { value: "general", label: "General", color: "border-gray-400 bg-gray-50 dark:bg-gray-900/20" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setWalletForm((f) => ({ ...f, purpose: p.value }))}
                    className={`px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                      walletForm.purpose === p.value
                        ? `${p.color} ring-2 ring-offset-1 ring-[#00A4E4]`
                        : "border-border hover:bg-accent"
                    }`}
                    data-testid={`button-purpose-${p.value}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wallet-primary"
                checked={walletForm.isPrimary}
                onChange={(e) => setWalletForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                className="rounded border-gray-300"
                data-testid="checkbox-wallet-primary"
              />
              <Label htmlFor="wallet-primary" className="text-sm font-normal">
                Set as primary wallet
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletDialogOpen(false)} data-testid="button-cancel-wallet">
              Cancel
            </Button>
            <Button
              onClick={handleSaveWallet}
              disabled={createWalletMutation.isPending || updateWalletMutation.isPending}
              className="bg-[#00A4E4] hover:bg-[#0090cc] text-white"
              data-testid="button-save-wallet"
            >
              {(createWalletMutation.isPending || updateWalletMutation.isPending) ? "Saving..." : editingWallet ? "Update" : "Add Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
