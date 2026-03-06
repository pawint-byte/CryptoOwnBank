import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  FileText,
  Link2,
  Settings,
  LogOut,
  Landmark,
  Vault,
  ArrowDownToLine,
  History,
  Users,
  Zap,
  Shield,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Calculator,
  Bell,
  Wallet,
  FileSearch,
  ArrowRightLeft as ReconcileIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const trackerItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Portfolio", url: "/portfolio", icon: PieChart },
  { title: "Blockchain Addresses", url: "/wallets", icon: Wallet },
  { title: "Tax Reports", url: "/tax-reports", icon: FileText },
  { title: "Statement Insights", url: "/statement-insights", icon: FileSearch },
  { title: "Reconciliation", url: "/reconciliation", icon: ReconcileIcon },
  { title: "Integrations", url: "/integrations", icon: Link2 },
  { title: "Price Alerts", url: "/price-alerts", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

const ownbankItems = [
  { title: "Wallet & Yield", url: "/ownbank", icon: Landmark },
  { title: "Vaults", url: "/ownbank/vaults", icon: Vault },
  { title: "Withdraw Interest", url: "/ownbank/withdraw", icon: ArrowDownToLine },
  { title: "History", url: "/ownbank/history", icon: History },
  { title: "My Referrals", url: "/ownbank/referrals", icon: Users },
  { title: "Signing Options", url: "/ownbank/signing-options", icon: Shield },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
    enabled: !!user,
  });

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <PieChart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">CryptoOwnBank</span>
            <span className="text-xs text-muted-foreground">Portfolio & Yield</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tracker</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trackerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#00A4E4]" />
              OwnBank
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ownbankItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-ownbank-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4 text-[#00A4E4]" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  disabled
                  className="opacity-50 cursor-not-allowed"
                  data-testid="nav-ownbank-xls66"
                >
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="flex items-center gap-2">
                    XLS-66 Lending
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Q2 2026
                    </Badge>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {adminStatus?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <span className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-amber-500" />
                Admin
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin/metrics"}
                    data-testid="nav-admin-metrics"
                  >
                    <Link href="/admin/metrics">
                      <BarChart3 className="h-4 w-4 text-amber-500" />
                      <span>Metrics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin/users"}
                    data-testid="nav-admin-users"
                  >
                    <Link href="/admin/users">
                      <Users className="h-4 w-4 text-amber-500" />
                      <span>User Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/yield-calculator"}
                  data-testid="nav-yield-calculator"
                >
                  <Link href="/yield-calculator">
                    <Calculator className="h-4 w-4" />
                    <span>Yield Calculator</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/faq"}
                  data-testid="nav-faq"
                >
                  <Link href="/faq">
                    <HelpCircle className="h-4 w-4" />
                    <span>FAQ</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/contact"}
                  data-testid="nav-contact"
                >
                  <Link href="/contact">
                    <MessageSquare className="h-4 w-4" />
                    <span>Contact & Feedback</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[120px]">
                {user?.firstName || user?.email?.split("@")[0] || "User"}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {user?.email || ""}
              </span>
            </div>
          </div>
          <SidebarMenuButton
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
