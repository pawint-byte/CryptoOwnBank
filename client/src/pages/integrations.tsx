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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Link2, Eye, EyeOff } from "lucide-react";
import { SiBinance, SiCoinbase } from "react-icons/si";
import type { ApiCredential } from "@shared/schema";

const EXCHANGE_OPTIONS = [
  { value: "binance", label: "Binance", icon: SiBinance },
  { value: "coinbase", label: "Coinbase", icon: SiCoinbase },
  { value: "kraken", label: "Kraken", icon: null },
  { value: "robinhood", label: "Robinhood", icon: null },
  { value: "fidelity", label: "Fidelity", icon: null },
];

const connectFormSchema = z.object({
  provider: z.string().min(1, "Select a provider"),
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
});

type ConnectFormValues = z.infer<typeof connectFormSchema>;

export default function Integrations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const { toast } = useToast();

  const { data: credentials = [], isLoading } = useQuery<ApiCredential[]>({
    queryKey: ["/api/credentials"],
  });

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
      return apiRequest("POST", "/api/credentials", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Exchange connected successfully" });
      setIsDialogOpen(false);
      form.reset();
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
      return apiRequest("POST", `/api/credentials/${id}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Sync completed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to sync", variant: "destructive" });
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
            <Button data-testid="button-add-integration">
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Connect Exchange</DialogTitle>
              <DialogDescription>
                Enter your API credentials to connect your exchange account.
                Your keys are encrypted and stored securely.
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={connectMutation.isPending}
                    data-testid="button-submit-integration"
                  >
                    {connectMutation.isPending ? "Connecting..." : "Connect"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

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
