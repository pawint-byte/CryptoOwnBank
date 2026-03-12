import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Users,
  Search,
  Crown,
  CheckCircle2,
  XCircle,
  Mail,
  ArrowRight,
  Shield,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  isAdmin: boolean;
  emailVerified: boolean;
  authProvider: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users", search],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: adminStatus?.isAdmin === true,
  });

  const unverifiedCount = users?.filter((u) => !u.emailVerified).length || 0;

  const bulkVerifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/bulk-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Users Verified", description: `${data.verified} users have been verified and can now log in.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/admin/migrate-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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

  const totalUsers = users?.length || 0;
  const verifiedUsers = users?.filter((u) => u.emailVerified).length || 0;
  const emailAuthUsers = users?.filter((u) => u.authProvider === "email").length || 0;
  const legacyUsers = users?.filter((u) => u.authProvider !== "email").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-admin-users">Admin — User Management</h1>
        <p className="text-muted-foreground">Manage users, view stats, and migrate auth providers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#00A4E4]" data-testid="stat-total-users">{totalUsers}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600" data-testid="stat-verified">{verifiedUsers}</div>
            <div className="text-sm text-muted-foreground">Verified</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-email-auth">{emailAuthUsers}</div>
            <div className="text-sm text-muted-foreground">Email Auth</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600" data-testid="stat-legacy">{legacyUsers}</div>
            <div className="text-sm text-muted-foreground">Legacy Auth</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-admin-search"
          />
        </div>
        {unverifiedCount > 0 && (
          <Button
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => bulkVerifyMutation.mutate()}
            disabled={bulkVerifyMutation.isPending}
            data-testid="button-bulk-verify"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {bulkVerifyMutation.isPending ? "Verifying..." : `Verify All (${unverifiedCount})`}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-admin-users">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Verified</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Auth</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Loading users...</td>
                  </tr>
                ) : !users?.length ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30" data-testid={`row-user-${user.id}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {user.firstName || ""} {user.lastName || ""}
                          </span>
                          {user.isAdmin && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{user.email || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        {user.emailVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={user.authProvider === "email" ? "default" : "secondary"} className="text-xs">
                          {user.authProvider === "email" ? "Email" : user.authProvider || "Legacy"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {user.authProvider !== "email" && user.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => migrateMutation.mutate(user.id)}
                            disabled={migrateMutation.isPending}
                            data-testid={`button-migrate-${user.id}`}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Migrate
                          </Button>
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
    </div>
  );
}
