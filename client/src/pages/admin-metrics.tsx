import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Crown,
  Shield,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Search,
  Mail,
  CreditCard,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ExternalLink,
  Filter,
  Coins,
  Plus,
  Trash2,
  Clock,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MetricsData {
  overview: {
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    adminUsers: number;
    premiumCount: number;
    freeCount: number;
    signupsToday: number;
    signups7d: number;
    signups30d: number;
  };
  authBreakdown: {
    email: number;
    legacy: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    totalRevenue: number;
    activeSubscriptions: number;
    monthlySubscribers: number;
    yearlySubscribers: number;
    recentCharges: {
      amount: number;
      email: string | null;
      date: string;
      status: string;
      description: string | null;
      source: string;
      currency: string;
      customer: string | null;
      receiptUrl: string | null;
    }[];
  };
  signupTrend: { date: string; count: number }[];
  utmSources: Record<string, number>;
  users: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
    isAdmin: boolean;
    emailVerified: boolean;
    authProvider: string;
    subscriptionTier: string;
    stripeCustomerId: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
  }[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  testId,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  color: string;
  subtitle?: string;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className={`text-2xl font-bold ${color}`} data-testid={testId}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-muted`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CHAIN_OPTIONS = [
  "bitcoin", "ethereum", "solana", "xrp", "dogecoin", "litecoin", "cardano",
  "avalanche", "algorand", "cosmos", "tron", "hedera", "polkadot", "vechain",
  "stellar", "ton", "polygon", "cronos", "xdc",
];

const CHAIN_LABELS: Record<string, string> = {
  bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)", solana: "Solana (SOL)",
  xrp: "XRP", dogecoin: "Dogecoin (DOGE)", litecoin: "Litecoin (LTC)",
  cardano: "Cardano (ADA)", avalanche: "Avalanche (AVAX)", algorand: "Algorand (ALGO)",
  cosmos: "Cosmos (ATOM)", tron: "Tron (TRX)", hedera: "Hedera (HBAR)",
  polkadot: "Polkadot (DOT)", vechain: "VeChain (VET)", stellar: "Stellar (XLM)",
  ton: "TON", polygon: "Polygon (MATIC)", cronos: "Cronos (CRO)", xdc: "XDC",
};

export default function AdminMetrics() {
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [chargeSourceFilter, setChargeSourceFilter] = useState("all");
  const [newAddrChain, setNewAddrChain] = useState("");
  const [newAddrAddress, setNewAddrAddress] = useState("");
  const [newAddrLabel, setNewAddrLabel] = useState("");

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: metrics, isLoading } = useQuery<MetricsData>({
    queryKey: ["/api/admin/metrics"],
    enabled: adminStatus?.isAdmin === true,
    refetchInterval: 60000,
  });

  const { data: paymentAddresses = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/payment-addresses"],
    enabled: adminStatus?.isAdmin === true,
  });

  const { data: cryptoPayments = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/crypto-payments"],
    enabled: adminStatus?.isAdmin === true,
  });

  const addAddressMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/payment-addresses", {
        chain: newAddrChain,
        address: newAddrAddress,
        label: newAddrLabel || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crypto-payment/addresses"] });
      setNewAddrChain("");
      setNewAddrAddress("");
      setNewAddrLabel("");
      toast({ title: "Payment address added" });
    },
    onError: () => {
      toast({ title: "Failed to add address", variant: "destructive" });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/payment-addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crypto-payment/addresses"] });
      toast({ title: "Payment address removed" });
    },
  });

  if (adminStatus && !adminStatus.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You do not have admin permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Metrics</h1>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { overview, revenue, signupTrend, utmSources, users } = metrics;

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.lastName?.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : users;

  const maxSignups = Math.max(...signupTrend.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-admin-metrics">
          Admin Metrics
        </h1>
        <p className="text-muted-foreground">
          Site performance, users, and revenue at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={overview.totalUsers}
          icon={Users}
          color="text-[#00A4E4]"
          testId="metric-total-users"
        />
        <StatCard
          title="Verified"
          value={overview.verifiedUsers}
          icon={CheckCircle2}
          color="text-emerald-600"
          subtitle={`${overview.unverifiedUsers} unverified`}
          testId="metric-verified"
        />
        <StatCard
          title="Premium"
          value={overview.premiumCount}
          icon={Crown}
          color="text-amber-500"
          subtitle={`${overview.freeCount} free`}
          testId="metric-premium"
        />
        <StatCard
          title="Admins"
          value={overview.adminUsers}
          icon={Shield}
          color="text-purple-600"
          testId="metric-admins"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              Signups Today
            </p>
            <p
              className="text-3xl font-bold text-[#00A4E4]"
              data-testid="metric-signups-today"
            >
              {overview.signupsToday}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              Last 7 Days
            </p>
            <p
              className="text-3xl font-bold text-blue-600"
              data-testid="metric-signups-7d"
            >
              {overview.signups7d}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              Last 30 Days
            </p>
            <p
              className="text-3xl font-bold text-indigo-600"
              data-testid="metric-signups-30d"
            >
              {overview.signups30d}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#00A4E4]" />
              Signups — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-end gap-[2px] h-32"
              data-testid="chart-signup-trend"
            >
              {signupTrend.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                  title={`${day.date}: ${day.count} signup${day.count !== 1 ? "s" : ""}`}
                >
                  <div
                    className="w-full bg-[#00A4E4] rounded-t-sm transition-all hover:bg-[#0090cc] min-h-[2px]"
                    style={{
                      height: `${Math.max((day.count / maxSignups) * 100, 2)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{signupTrend[0]?.date?.slice(5)}</span>
              <span>{signupTrend[signupTrend.length - 1]?.date?.slice(5)}</span>
            </div>
          </CardContent>
        </Card>

        {utmSources && Object.keys(utmSources).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Signup Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(utmSources)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between" data-testid={`utm-source-${source}`}>
                      <span className="text-sm capitalize">{source}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.round((count / overview.totalUsers) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">MRR</p>
                <p
                  className="text-xl font-bold text-emerald-600"
                  data-testid="metric-mrr"
                >
                  {formatCurrency(revenue.mrr)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ARR</p>
                <p
                  className="text-xl font-bold text-emerald-600"
                  data-testid="metric-arr"
                >
                  {formatCurrency(revenue.arr)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p
                  className="text-lg font-semibold"
                  data-testid="metric-total-revenue"
                >
                  {formatCurrency(revenue.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Active Subscriptions
                </p>
                <p className="text-lg font-semibold" data-testid="metric-active-subs">
                  {revenue.activeSubscriptions}
                </p>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {revenue.monthlySubscribers} monthly
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {revenue.yearlySubscribers} yearly
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {revenue.recentCharges.length > 0 && (() => {
        const sourceOptions = Array.from(new Set(revenue.recentCharges.map(c => c.source)));
        const filteredCharges = chargeSourceFilter === "all"
          ? revenue.recentCharges
          : revenue.recentCharges.filter(c => c.source === chargeSourceFilter);
        const cryptoOwnBankTotal = revenue.recentCharges
          .filter(c => c.source === "CryptoOwnBank" && c.status === "succeeded")
          .reduce((sum, c) => sum + c.amount, 0);

        return (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#00A4E4]" />
                Recent Charges ({filteredCharges.length})
                {cryptoOwnBankTotal > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    CryptoOwnBank: {formatCurrency(cryptoOwnBankTotal)}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={chargeSourceFilter} onValueChange={setChargeSourceFilter}>
                  <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-charge-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sourceOptions.map(src => (
                      <SelectItem key={src} value={src}>{src}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-recent-charges">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                      Source / App
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCharges.map((charge, idx) => (
                    <tr
                      key={idx}
                      className="border-b last:border-0 hover:bg-muted/30"
                      data-testid={`row-charge-${idx}`}
                    >
                      <td className="p-3 text-sm whitespace-nowrap">
                        {new Date(charge.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {charge.email || "—"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${charge.source === "CryptoOwnBank" ? "border-[#00A4E4] text-[#00A4E4]" : ""}`}
                        >
                          {charge.source}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate" title={charge.description || ""}>
                        {charge.description || "—"}
                      </td>
                      <td className="p-3 text-sm font-medium whitespace-nowrap">
                        {formatCurrency(charge.amount)}
                        {charge.currency !== "usd" && (
                          <span className="text-xs text-muted-foreground ml-1 uppercase">{charge.currency}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            charge.status === "succeeded"
                              ? "default"
                              : "secondary"
                          }
                          className={`text-xs ${charge.status === "succeeded" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : ""}`}
                        >
                          {charge.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {charge.receiptUrl ? (
                          <a
                            href={charge.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00A4E4] hover:underline inline-flex items-center gap-1 text-xs"
                            data-testid={`link-receipt-${idx}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        );
      })()}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-[#00A4E4]" />
              All Users ({filteredUsers.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
                data-testid="input-admin-user-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-all-users">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Verified
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Auth
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Plan
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                      data-testid={`row-user-${user.id}`}
                    >
                      <td className="p-3">
                        <span className="font-medium text-sm">
                          {user.firstName || ""} {user.lastName || ""}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm">{user.email || "—"}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-3">
                        {user.emailVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            user.authProvider === "email"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {user.authProvider === "email"
                            ? "Email"
                            : user.authProvider || "Legacy"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            user.subscriptionTier === "premium"
                              ? "default"
                              : "outline"
                          }
                          className={`text-xs ${user.subscriptionTier === "premium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : ""}`}
                        >
                          {user.subscriptionTier === "premium" ? (
                            <span className="flex items-center gap-1">
                              <Crown className="h-3 w-3" /> Premium
                            </span>
                          ) : (
                            "Free"
                          )}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {user.isAdmin && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Crypto Payment Addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={newAddrChain} onValueChange={setNewAddrChain}>
              <SelectTrigger data-testid="select-admin-chain">
                <SelectValue placeholder="Select chain..." />
              </SelectTrigger>
              <SelectContent>
                {CHAIN_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHAIN_LABELS[c] || c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Wallet address"
              value={newAddrAddress}
              onChange={(e) => setNewAddrAddress(e.target.value)}
              data-testid="input-admin-address"
            />
            <Input
              placeholder="Label (optional)"
              value={newAddrLabel}
              onChange={(e) => setNewAddrLabel(e.target.value)}
              data-testid="input-admin-label"
            />
            <Button
              onClick={() => addAddressMutation.mutate()}
              disabled={!newAddrChain || !newAddrAddress || addAddressMutation.isPending}
              data-testid="button-admin-add-address"
            >
              {addAddressMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add
            </Button>
          </div>

          {paymentAddresses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No payment addresses configured. Add one above to enable crypto payments.
            </p>
          ) : (
            <div className="space-y-2">
              {paymentAddresses.map((addr: any) => {
                const isVerified = ["xrp", "bitcoin", "ethereum", "solana"].includes(addr.chain);
                return (
                  <div
                    key={addr.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`row-payment-address-${addr.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-wrap">
                      <Badge variant="outline" className="shrink-0">
                        {CHAIN_LABELS[addr.chain]?.split(" ")[0] || addr.chain}
                      </Badge>
                      {addr.label && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {addr.label}
                        </Badge>
                      )}
                      {isVerified ? (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Auto-Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Manual Only
                        </Badge>
                      )}
                      <code className="text-xs font-mono truncate max-w-[300px]">{addr.address}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 shrink-0"
                      onClick={() => deleteAddressMutation.mutate(addr.id)}
                      disabled={deleteAddressMutation.isPending}
                      data-testid={`button-delete-address-${addr.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Crypto Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cryptoPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No crypto payments yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left p-2">Chain</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Plan</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">TX Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {cryptoPayments.map((payment: any) => (
                    <tr key={payment.id} className="border-b" data-testid={`row-crypto-payment-${payment.id}`}>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {CHAIN_LABELS[payment.chain]?.split(" ")[0] || payment.chain}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {payment.expectedAmount} {payment.expectedAsset}
                      </td>
                      <td className="p-2 text-xs capitalize">{payment.plan}</td>
                      <td className="p-2">
                        <Badge
                          className={`text-xs ${
                            payment.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                              : payment.status === "pending"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                : payment.status === "expired"
                                  ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-xs font-mono truncate max-w-[120px]">
                        {payment.txHash || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
