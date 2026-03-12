import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  EyeOff,
  Search,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Monitor,
  Server,
  User,
  Clock,
  Hash,
  Globe,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ErrorLog {
  id: string;
  message: string;
  stack: string | null;
  source: string;
  route: string | null;
  severity: string;
  userId: string | null;
  userEmail: string | null;
  statusCode: number | null;
  requestMethod: string | null;
  userAgent: string | null;
  metadata: any;
  fingerprint: string | null;
  status: string;
  createdAt: string;
}

interface ErrorStats {
  totalToday: number;
  uniqueToday: number;
  mostFrequent: { fingerprint: string; message: string; count: number } | null;
}

function severityColor(severity: string) {
  switch (severity) {
    case "critical": return "text-red-600 bg-red-50 dark:bg-red-950/30";
    case "error": return "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
    case "warning": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30";
    default: return "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "resolved": return <Badge variant="outline" className="text-emerald-600 border-emerald-300"><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</Badge>;
    case "ignored": return <Badge variant="outline" className="text-gray-500 border-gray-300"><EyeOff className="h-3 w-3 mr-1" />Ignored</Badge>;
    default: return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Open</Badge>;
  }
}

function sourceIcon(source: string) {
  if (source === "server" || source === "server-middleware") return <Server className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AdminErrorMonitor() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ErrorStats>({
    queryKey: ["/api/admin/errors/stats"],
    enabled: adminStatus?.isAdmin === true,
    refetchInterval: 30000,
  });

  const errorsQueryUrl = (() => {
    const params = new URLSearchParams();
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    return `/api/admin/errors?${params.toString()}`;
  })();

  const { data: errorsData, isLoading: errorsLoading, isFetching } = useQuery<{ errors: ErrorLog[]; total: number }>({
    queryKey: [errorsQueryUrl],
    enabled: adminStatus?.isAdmin === true,
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/errors/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/admin/errors") });
      toast({ title: "Error status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  if (adminStatus && !adminStatus.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have admin permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errors = errorsData?.errors || [];
  const totalErrors = errorsData?.total || 0;
  const totalPages = Math.ceil(totalErrors / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-error-monitor">Error Monitor</h1>
        <p className="text-muted-foreground">Track and manage production errors across server and client.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Errors Today</p>
                <p className="text-3xl font-bold text-destructive" data-testid="stat-errors-today">
                  {statsLoading ? <Skeleton className="h-9 w-16" /> : stats?.totalToday ?? 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10">
                <Bug className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Unique Errors</p>
                <p className="text-3xl font-bold text-orange-600" data-testid="stat-unique-errors">
                  {statsLoading ? <Skeleton className="h-9 w-16" /> : stats?.uniqueToday ?? 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/30">
                <Hash className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Most Frequent Today</p>
              {statsLoading ? (
                <Skeleton className="h-5 w-full mt-2" />
              ) : stats?.mostFrequent ? (
                <div className="mt-1">
                  <p className="text-sm font-medium truncate" data-testid="stat-most-frequent" title={stats.mostFrequent.message}>
                    {stats.mostFrequent.message.slice(0, 80)}
                  </p>
                  <p className="text-xs text-muted-foreground">{stats.mostFrequent.count} occurrences</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1" data-testid="stat-most-frequent">No errors today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Error Logs ({totalErrors})
              {isFetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search errors, routes, emails..."
                  className="pl-8 h-9 w-[220px] text-xs"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  data-testid="input-error-search"
                />
              </div>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[120px] h-9 text-xs" data-testid="select-error-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="react-error-boundary">React</SelectItem>
                  <SelectItem value="window-onerror">Window</SelectItem>
                  <SelectItem value="unhandled-rejection">Promise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[120px] h-9 text-xs" data-testid="select-error-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/admin/errors") });
                }}
                data-testid="button-refresh-errors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {errorsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : errors.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium">No errors found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || sourceFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Everything is running smoothly"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {errors.map((error) => (
                <div key={error.id} className="hover:bg-muted/30 transition-colors">
                  <button
                    className="w-full text-left p-4 flex items-start gap-3"
                    onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                    data-testid={`error-row-${error.id}`}
                  >
                    <div className="mt-0.5">
                      {expandedId === error.id
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${severityColor(error.severity)}`}>
                          {error.severity}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {sourceIcon(error.source)}
                          {error.source}
                        </span>
                        {statusBadge(error.status)}
                      </div>
                      <p className="text-sm font-medium truncate" title={error.message}>
                        {error.message.slice(0, 120)}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(error.createdAt)}
                        </span>
                        {error.route && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {error.requestMethod && <span className="font-mono">{error.requestMethod}</span>}
                            <span className="font-mono">{error.route.slice(0, 40)}</span>
                          </span>
                        )}
                        {error.userEmail && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {error.userEmail}
                          </span>
                        )}
                        {error.statusCode && (
                          <span className="font-mono text-[10px]">HTTP {error.statusCode}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {expandedId === error.id && (
                    <div className="px-4 pb-4 ml-7 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-2">
                          <div>
                            <span className="text-muted-foreground">Full Message:</span>
                            <p className="font-mono text-[11px] bg-muted/50 p-2 rounded mt-1 break-all" data-testid={`error-detail-message-${error.id}`}>
                              {error.message}
                            </p>
                          </div>
                          {error.userId && (
                            <div>
                              <span className="text-muted-foreground">User ID:</span>
                              <p className="font-mono text-[11px]" data-testid={`error-detail-userid-${error.id}`}>{error.userId}</p>
                            </div>
                          )}
                          {error.userEmail && (
                            <div>
                              <span className="text-muted-foreground">User Email:</span>
                              <p className="text-[11px]" data-testid={`error-detail-email-${error.id}`}>{error.userEmail}</p>
                            </div>
                          )}
                          {error.route && (
                            <div>
                              <span className="text-muted-foreground">Route:</span>
                              <p className="font-mono text-[11px]">{error.requestMethod} {error.route}</p>
                            </div>
                          )}
                          {error.userAgent && (
                            <div>
                              <span className="text-muted-foreground">User Agent:</span>
                              <p className="text-[11px] truncate" title={error.userAgent}>{error.userAgent}</p>
                            </div>
                          )}
                          {error.fingerprint && (
                            <div>
                              <span className="text-muted-foreground">Fingerprint:</span>
                              <p className="font-mono text-[10px]">{error.fingerprint.slice(0, 16)}...</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Timestamp:</span>
                            <p className="text-[11px]">{new Date(error.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {error.stack && (
                            <div>
                              <span className="text-muted-foreground">Stack Trace:</span>
                              <pre className="font-mono text-[10px] bg-muted/50 p-2 rounded mt-1 overflow-x-auto max-h-64 whitespace-pre-wrap break-all" data-testid={`error-detail-stack-${error.id}`}>
                                {error.stack}
                              </pre>
                            </div>
                          )}
                          {error.metadata && Object.keys(error.metadata).length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Context / Metadata:</span>
                              <pre className="font-mono text-[10px] bg-muted/50 p-2 rounded mt-1 overflow-x-auto max-h-40 whitespace-pre-wrap" data-testid={`error-detail-metadata-${error.id}`}>
                                {JSON.stringify(error.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {error.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: error.id, status: "resolved" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-resolve-${error.id}`}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                            Mark Resolved
                          </Button>
                        )}
                        {error.status !== "ignored" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: error.id, status: "ignored" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-ignore-${error.id}`}
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Ignore
                          </Button>
                        )}
                        {error.status !== "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: error.id, status: "open" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-reopen-${error.id}`}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
                            Reopen
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages} ({totalErrors} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
