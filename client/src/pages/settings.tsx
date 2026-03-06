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
} from "lucide-react";
import type { UserSettings } from "@shared/schema";

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
  const [walletInput, setWalletInput] = useState(spendingWallet);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription"],
  });

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

  const handleSaveSpendingWallet = () => {
    if (walletInput && !walletInput.startsWith("r")) {
      toast({
        title: "Invalid XRPL Address",
        description: "XRPL addresses must start with 'r'.",
        variant: "destructive",
      });
      return;
    }
    setSpendingWallet(walletInput);
    toast({ title: "Spending wallet saved" });
  };

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
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#00A4E4]" />
              OwnBank Spending Wallet
            </CardTitle>
            <CardDescription>
              Set an XRPL address where interest withdrawals will be sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spending-wallet">XRPL Wallet Address</Label>
              <Input
                id="spending-wallet"
                placeholder="rXXXX...XXXX"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-spending-wallet"
              />
              <p className="text-xs text-muted-foreground">
                Must be a valid XRPL address (starts with 'r'). Can be a cold wallet, exchange, or any XRPL address.
              </p>
            </div>
            <Button
              onClick={handleSaveSpendingWallet}
              className="bg-[#00A4E4] hover:bg-[#0090cc] text-white"
              data-testid="button-save-spending-wallet"
            >
              Save Spending Wallet
            </Button>
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
                <div className="space-y-3">
                  <p className="text-sm font-medium">Upgrade to Premium</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="flex flex-col h-auto py-4 gap-1 border-amber-500/30 hover:border-amber-500"
                      onClick={() => handleUpgrade("monthly")}
                      disabled={checkoutLoading !== null}
                      data-testid="button-upgrade-monthly"
                    >
                      <span className="text-lg font-bold">$9</span>
                      <span className="text-xs text-muted-foreground">/month</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col h-auto py-4 gap-1 border-amber-500/30 hover:border-amber-500 relative"
                      onClick={() => handleUpgrade("yearly")}
                      disabled={checkoutLoading !== null}
                      data-testid="button-upgrade-yearly"
                    >
                      <Badge className="absolute -top-2 right-2 bg-green-500 text-[10px] px-1.5">
                        Save $29
                      </Badge>
                      <span className="text-lg font-bold">$79</span>
                      <span className="text-xs text-muted-foreground">/year</span>
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Auto-withdraw interest weekly
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Tax CSV export & year-end reports
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Priority vault alerts
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      XLS-66 lending early access
                    </div>
                  </div>
                </div>
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
    </div>
  );
}
