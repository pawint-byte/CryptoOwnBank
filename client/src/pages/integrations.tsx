import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IntegrationCard } from "@/components/integration-card";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Link2, Eye, EyeOff, ExternalLink, Info, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiBinance, SiCoinbase } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ApiCredential } from "@shared/schema";

interface SubscriptionLimits {
  tier: string;
  exchanges: { limit: number | null; used: number };
  wallets: { limit: number | null; used: number };
  alerts: { limit: number | null; used: number };
  transactionHistoryDays: number | null;
  csvImport: boolean;
  taxReports: boolean;
  autoWithdraw: boolean;
}

const EXCHANGE_OPTIONS = [
  { value: "binance_us", label: "Binance.US", icon: SiBinance },
  { value: "binance", label: "Binance (Global)", icon: SiBinance },
  { value: "coinbase", label: "Coinbase", icon: SiCoinbase },
  { value: "kraken", label: "Kraken", icon: null },
  { value: "crypto_com", label: "Crypto.com", icon: null },
  { value: "uphold", label: "Uphold (CSV only)", icon: null },
  { value: "gemini", label: "Gemini", icon: null },
  { value: "kucoin", label: "KuCoin", icon: null },
  { value: "bybit", label: "Bybit", icon: null },
  { value: "okx", label: "OKX", icon: null },
  { value: "bitfinex", label: "Bitfinex", icon: null },
  { value: "bitstamp", label: "Bitstamp", icon: null },
  { value: "gate_io", label: "Gate.io", icon: null },
  { value: "nexo", label: "Nexo", icon: null },
  { value: "webull", label: "Webull", icon: null },
  { value: "etoro", label: "eToro", icon: null },
  { value: "robinhood", label: "Robinhood", icon: null },
  { value: "fidelity", label: "Fidelity", icon: null },
];

const API_KEY_GUIDES: Record<string, { steps: string; url: string }> = {
  binance_us: {
    steps: "Log in to Binance.US > click your profile icon > API Management > Create API > choose 'System generated' > label it 'CryptoOwnBank' > complete 2FA > IMPORTANT: only enable 'Can Read' (disable trading/withdrawals) > copy your API Key and Secret Key. Note: Binance.US is the only Binance platform available to US residents.",
    url: "https://www.binance.us/settings/api-management",
  },
  binance: {
    steps: "Log in to Binance (Global) > hover over your profile icon > API Management > Create API > choose 'System generated' > label it 'CryptoOwnBank' > complete 2FA > IMPORTANT: only enable 'Enable Reading' (disable trading/withdrawals) > copy your API Key and Secret Key. Note: This is the global Binance platform — US residents should use Binance.US instead.",
    url: "https://www.binance.com/en/my/settings/api-management",
  },
  coinbase: {
    steps: "Log in to Coinbase > Settings > API > New API Key > select all 'View' permissions only (wallet:accounts:read, wallet:transactions:read, etc.) > complete 2FA > copy your API Key and API Secret.",
    url: "https://www.coinbase.com/settings/api",
  },
  kraken: {
    steps: "Log in to Kraken > Security > API > Add Key > name it 'CryptoOwnBank' > under Permissions check ONLY 'Query Funds' and 'Query Open Orders & Trades' > Generate Key > copy your API Key and Private Key.",
    url: "https://www.kraken.com/u/security/api",
  },
  crypto_com: {
    steps: "Crypto.com has 3 separate products — make sure you're using the right one:\n\n• Crypto.com Exchange (crypto.com/exchange): This is the ONLY one with API keys. Follow the steps below to connect it.\n• Crypto.com App (the regular mobile app): No API available. Use CSV export instead (Settings > Export Data), or find your deposit address under 'Receive' and add it on the Cold Wallets page.\n• Crypto.com Onchain (DeFi wallet): This is a self-custody wallet — go to Cold Wallets page and paste your public address to track it.\n\nFor Crypto.com Exchange API keys:\n1) Log in at crypto.com/exchange. 2) Profile icon (top right) > Account Management > API Management. 3) Create a New API Key > label it 'CryptoOwnBank'. 4) Set up 2FA if prompted. 5) Copy the API Secret Key immediately (shown only once). 6) Click 'Edit' on your key to find the API Key. 7) Remove IP whitelist restrictions. 8) Leave Withdrawal and Trading set to 'Off'. Paste both keys below.",
    url: "https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#generating-the-api-key",
  },
  uphold: {
    steps: "Uphold no longer offers personal API keys — their API is now restricted to enterprise partners only. To track your Uphold holdings in CryptoOwnBank, you have two options:\n\n1) CSV Import: In the Uphold app, go to Activity > click the download/export icon > download your transaction history as CSV. Then import it on the Transactions page.\n\n2) Cold Wallet Tracking: If you hold XRP on Uphold, go to your XRP wallet in the Uphold app, tap 'Transact' > 'Send to crypto network' to find your XRP address. Add that address on the Cold Wallets page to track your balance.",
    url: "https://uphold.com/dashboard",
  },
  gemini: {
    steps: "Log in to Gemini > Account > Settings > API > Create a New API Key > select 'Primary' scope > check ONLY 'Fund Management (Read)' and 'Order History' > copy your API Key and API Secret.",
    url: "https://exchange.gemini.com/settings/api",
  },
  kucoin: {
    steps: "Log in to KuCoin > Profile > API Management > Create API > name it 'CryptoOwnBank' > set a passphrase (you'll need this) > enable ONLY 'General' permission > copy your API Key, Secret Key, and Passphrase.",
    url: "https://www.kucoin.com/account/api",
  },
  bybit: {
    steps: "Log in to Bybit > Account & Security > API Management > Create New Key > select 'System-generated API Keys' > name it 'CryptoOwnBank' > check ONLY 'Read-Only' > copy your API Key and Secret Key.",
    url: "https://www.bybit.com/app/user/api-management",
  },
  okx: {
    steps: "Log in to OKX > Profile icon > API > Create API Key > label it 'CryptoOwnBank' > set passphrase > select 'Read Only' permission > complete 2FA > copy your API Key, Secret Key, and Passphrase.",
    url: "https://www.okx.com/account/my-api",
  },
  bitfinex: {
    steps: "Log in to Bitfinex > Account > API Keys > Create New Key > label it 'CryptoOwnBank' > enable ONLY 'Get account balance' and 'Get account history' > Generate Key > copy your API Key and API Key Secret.",
    url: "https://setting.bitfinex.com/api",
  },
  bitstamp: {
    steps: "Log in to Bitstamp > Account > Security > API Access > New API Key > enable ONLY 'Account balance' and 'User transactions' > Activate > confirm via email > copy your API Key and Secret.",
    url: "https://www.bitstamp.net/account/security/api/",
  },
  gate_io: {
    steps: "Log in to Gate.io > Profile > API Management > Create API Key > label it 'CryptoOwnBank' > check ONLY 'Spot/Margin Read' and 'Wallet Read' > copy your API Key and Secret Key.",
    url: "https://www.gate.io/myaccount/apikeys",
  },
  nexo: {
    steps: "1) Log in to Nexo at nexo.com. 2) Go to Settings (gear icon) > API. 3) Click 'Create API Key' > label it 'CryptoOwnBank'. 4) Set permissions to 'Read Only' — do NOT enable withdrawals or trading. 5) Complete 2FA verification. 6) Copy your API Key and Secret Key immediately (Secret is shown once). 7) Paste both into CryptoOwnBank.",
    url: "https://platform.nexo.com/api-keys",
  },
  webull: {
    steps: "Webull does not offer a public API. To track your Webull crypto in CryptoOwnBank:\n\n1) CSV Import: In the Webull app, go to Account > Menu (three dots) > Statements & History > Download CSV. Then import it on the Transactions page.\n\n2) Cold Wallet Tracking: If you've withdrawn crypto to your own wallet, add that wallet address on the Cold Wallets page to track it automatically.",
    url: "https://www.webull.com/",
  },
  etoro: {
    steps: "eToro does not offer a public API. To track your eToro crypto in CryptoOwnBank:\n\n1) CSV Import: In eToro, go to Settings > Account Statement > select your date range > Download as Excel/CSV. Then import it on the Transactions page.\n\n2) Cold Wallet Tracking: If you've transferred crypto to the eToro Money wallet or your own wallet, add the public address on the Cold Wallets page.",
    url: "https://www.etoro.com/settings/account",
  },
  robinhood: {
    steps: "Robinhood does not offer a public API. To track your Robinhood crypto in CryptoOwnBank:\n\n1) CSV Import: In the Robinhood app, go to Account > Statements & History > Download your transaction history as CSV. Then import it on the Transactions page.\n\n2) Cold Wallet Tracking: If you've transferred crypto out to your own wallet, add that wallet address on the Cold Wallets page to track it automatically.",
    url: "https://robinhood.com/account",
  },
  fidelity: {
    steps: "Fidelity does not offer a public API for crypto. To track your Fidelity crypto in CryptoOwnBank:\n\n1) CSV Import: On the Fidelity website, go to Accounts > Activity & Orders > Download your transaction history. Then import it on the Transactions page.\n\n2) Cold Wallet Tracking: If you've withdrawn crypto to your own wallet, add the public address on the Cold Wallets page.",
    url: "https://www.fidelity.com/",
  },
};

const NO_API_EXCHANGES = ["uphold", "webull", "etoro", "robinhood", "fidelity"];

const connectFormSchema = z.object({
  provider: z.string().min(1, "Select a provider"),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
}).refine((data) => {
  if (NO_API_EXCHANGES.includes(data.provider)) return true;
  return data.apiKey && data.apiKey.length > 0;
}, { message: "API key is required", path: ["apiKey"] })
.refine((data) => {
  if (NO_API_EXCHANGES.includes(data.provider)) return true;
  return data.apiSecret && data.apiSecret.length > 0;
}, { message: "API secret is required", path: ["apiSecret"] });

type ConnectFormValues = z.infer<typeof connectFormSchema>;

export default function Integrations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
    errors: string[];
    message: string;
  } | null>(null);
  const { toast } = useToast();

  const { data: credentials = [], isLoading } = useQuery<ApiCredential[]>({
    queryKey: ["/api/credentials"],
  });

  const { data: limits } = useQuery<SubscriptionLimits>({
    queryKey: ["/api/subscription/limits"],
  });

  const exchangeAtLimit = limits?.exchanges.limit !== null && limits?.exchanges.used !== undefined && limits.exchanges.used >= (limits.exchanges.limit ?? Infinity);
  const csvImportLocked = limits?.csvImport === false;

  const form = useForm<ConnectFormValues>({
    resolver: zodResolver(connectFormSchema),
    defaultValues: {
      provider: "",
      apiKey: "",
      apiSecret: "",
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (values: ConnectFormValues) => {
      const res = await apiRequest("POST", "/api/credentials", values);
      return res.json();
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Exchange connected! Syncing your data..." });
      setIsDialogOpen(false);
      form.reset();

      if (data?.id) {
        try {
          const syncRes = await apiRequest("POST", `/api/credentials/${data.id}/sync`);
          const syncData = await syncRes.json();
          queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
          const parts = [];
          if (syncData.balances > 0) parts.push(`${syncData.balances} assets`);
          if (syncData.tradesImported > 0) parts.push(`${syncData.tradesImported} trades`);
          toast({ title: parts.length > 0 ? `Imported ${parts.join(" and ")}` : "Sync complete — no new data found" });
        } catch {
          toast({ title: "Connected but sync failed — try the Sync button", variant: "destructive" });
        }
      }
    },
    onError: () => {
      toast({ title: "Failed to connect exchange", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Exchange disconnected" });
    },
    onError: () => {
      toast({ title: "Failed to disconnect exchange", variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/credentials/${id}/sync`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      const parts = [];
      if (data?.balances > 0) parts.push(`${data.balances} assets`);
      if (data?.tradesImported > 0) parts.push(`${data.tradesImported} new trades`);
      if (data?.pricesUpdated > 0) parts.push(`${data.pricesUpdated} prices updated`);
      toast({ title: parts.length > 0 ? `Synced: ${parts.join(", ")}` : "Sync complete — no new data" });
    },
    onError: async (error: any) => {
      let message = "Failed to sync";
      try {
        if (error?.message) message = error.message;
      } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const onSubmit = (values: ConnectFormValues) => {
    connectMutation.mutate(values);
  };

  const getExchangeIcon = (provider: string) => {
    const exchange = EXCHANGE_OPTIONS.find((e) => e.value === provider);
    if (exchange?.icon) {
      const Icon = exchange.icon;
      return <Icon className="h-6 w-6" />;
    }
    return <Link2 className="h-6 w-6 text-muted-foreground" />;
  };

  const getExchangeName = (provider: string) => {
    return EXCHANGE_OPTIONS.find((e) => e.value === provider)?.label || provider;
  };

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/yahoo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Import failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: data.message });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Could not process the CSV file",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportResult(null);
      csvImportMutation.mutate(file);
    }
    e.target.value = "";
  };

  const connectedProviders = credentials.map((c) => c.provider);
  const availableExchanges = EXCHANGE_OPTIONS.filter(
    (e) => !connectedProviders.includes(e.value)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your exchanges and brokerages
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-integration" disabled={exchangeAtLimit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Connect Exchange</DialogTitle>
              <DialogDescription>
                Enter your read-only API credentials to connect your exchange account.
                Your keys are encrypted with AES-256 and stored securely. We only need read-only access.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-provider">
                            <SelectValue placeholder="Select an exchange" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableExchanges.map((exchange) => (
                            <SelectItem key={exchange.value} value={exchange.value}>
                              <div className="flex items-center gap-2">
                                {exchange.icon && <exchange.icon className="h-4 w-4" />}
                                {exchange.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("provider") && API_KEY_GUIDES[form.watch("provider")] && (
                  <Alert className={cn(
                    "border-primary/20",
                    NO_API_EXCHANGES.includes(form.watch("provider")) ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-muted/50"
                  )}>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs leading-relaxed whitespace-pre-line">
                      <span className="font-semibold block mb-1">
                        {NO_API_EXCHANGES.includes(form.watch("provider"))
                          ? `${EXCHANGE_OPTIONS.find(e => e.value === form.watch("provider"))?.label?.replace(" (CSV only)", "")} — No API Available`
                          : `How to get your ${EXCHANGE_OPTIONS.find(e => e.value === form.watch("provider"))?.label} API Key:`}
                      </span>
                      {API_KEY_GUIDES[form.watch("provider")].steps}
                      <a
                        href={API_KEY_GUIDES[form.watch("provider")].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2 text-primary hover:underline font-medium"
                        data-testid="link-exchange-api-guide"
                      >
                        {NO_API_EXCHANGES.includes(form.watch("provider"))
                          ? `Open ${EXCHANGE_OPTIONS.find(e => e.value === form.watch("provider"))?.label?.replace(" (CSV only)", "")}`
                          : `Open ${EXCHANGE_OPTIONS.find(e => e.value === form.watch("provider"))?.label} API Settings`} <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>
                )}

                {!NO_API_EXCHANGES.includes(form.watch("provider")) && (
                  <>
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showApiKey ? "text" : "password"}
                                placeholder="Enter your API key"
                                {...field}
                                data-testid="input-api-key"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => setShowApiKey(!showApiKey)}
                              >
                                {showApiKey ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Find this in your exchange's API settings
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="apiSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Secret</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showApiSecret ? "text" : "password"}
                                placeholder="Enter your API secret"
                                {...field}
                                data-testid="input-api-secret"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => setShowApiSecret(!showApiSecret)}
                              >
                                {showApiSecret ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Your secret is encrypted and never exposed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    {NO_API_EXCHANGES.includes(form.watch("provider")) ? "Close" : "Cancel"}
                  </Button>
                  {!NO_API_EXCHANGES.includes(form.watch("provider")) && (
                    <Button
                      type="submit"
                      disabled={connectMutation.isPending}
                      data-testid="button-submit-integration"
                    >
                      {connectMutation.isPending ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {exchangeAtLimit && (
        <UpgradePrompt
          compact
          feature="Free users can connect 1 exchange. Upgrade to Premium for unlimited exchange connections."
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-full bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : credentials.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Link2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No integrations yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Connect your crypto exchanges and brokerage accounts to start
                  tracking your portfolio automatically.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => setIsDialogOpen(true)}
                  data-testid="button-add-first-integration"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Integration
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          credentials.map((credential) => (
            <IntegrationCard
              key={credential.id}
              name={getExchangeName(credential.provider)}
              provider={credential.provider}
              logo={getExchangeIcon(credential.provider)}
              isConnected={credential.isConnected || false}
              lastSync={credential.lastSyncAt}
              onSync={() => syncMutation.mutate(credential.id)}
              onDisconnect={() => disconnectMutation.mutate(credential.id)}
              isSyncing={syncMutation.isPending}
            />
          ))
        )}
      </div>

      <Card data-testid="card-csv-import">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Transaction History
          </CardTitle>
          <CardDescription>
            Import your purchase history from Yahoo Finance, CoinTracker, or any CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium">Supported Formats</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">Yahoo Finance</Badge>
                  <span className="text-muted-foreground">Portfolio export CSV</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">CoinTracker</Badge>
                  <span className="text-muted-foreground">Transaction history CSV</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">Generic CSV</Badge>
                  <span className="text-muted-foreground">Symbol, Quantity, Price, Date columns</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                <p className="font-medium text-foreground">How to export from Yahoo Finance:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Go to finance.yahoo.com and open your portfolio</li>
                  <li>Click the "Export" or download button (top right)</li>
                  <li>Save the .csv file and upload it here</li>
                </ol>
              </div>
            </div>
            {csvImportLocked ? (
              <UpgradePrompt feature="CSV import is a Premium feature. Upgrade to import from Yahoo Finance, CoinTracker, and other platforms." />
            ) : (
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">
                  {csvImportMutation.isPending ? "Importing..." : "Upload CSV File"}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Max 10 MB. Your data creates transactions and tax lots automatically.
                </p>
                <label>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={csvImportMutation.isPending}
                    data-testid="input-csv-upload"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    disabled={csvImportMutation.isPending}
                    asChild
                  >
                    <span data-testid="button-upload-csv">
                      <Upload className="h-4 w-4 mr-2" />
                      {csvImportMutation.isPending ? "Processing..." : "Choose File"}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {importResult && (
            <Alert className={importResult.imported > 0 ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"}>
              {importResult.imported > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <AlertDescription className="text-sm">
                <p className="font-medium" data-testid="text-import-result">{importResult.message}</p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-medium">Issues:</p>
                    <ul className="list-disc ml-4">
                      {importResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About API Security</CardTitle>
          <CardDescription>
            How we keep your data safe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center">
              <span className="text-chart-2 font-bold">1</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Encrypted Storage</p>
              <p>All API keys are encrypted using AES-256 before storage.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center">
              <span className="text-chart-2 font-bold">2</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Read-Only Access</p>
              <p>We only request read permissions. We cannot trade on your behalf.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center">
              <span className="text-chart-2 font-bold">3</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Instant Revocation</p>
              <p>Disconnect anytime to instantly revoke our access to your accounts.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
