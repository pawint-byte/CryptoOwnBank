import { useState, useCallback } from "react";
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
  DollarSign,
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
  ArrowRightLeft as TransferIcon,
  Route,
  Coins,
  TrendingUp,
  Send,
  FileText as InvoiceIcon,
  GitCompareArrows,
  Star,
  StarOff,
  ChevronDown,
  ChevronRight,
  Pin,
  Gem,
  ShieldCheck,
  Rocket,
  CircleDollarSign,
  CalendarClock,
  QrCode,
  CloudUpload,
  Fish,
  Bug,
  Pickaxe,
  Repeat,
  HeartHandshake,
  Mail,
  Newspaper,
  Flame,
  Droplets,
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

type NavItem = {
  title: string;
  url: string;
  icon: any;
  color?: string;
  group?: string;
};

const allItems: NavItem[] = [
  { title: "Quick Start", url: "/quick-start", icon: Rocket, group: "start" },
  { title: "Overview", url: "/", icon: LayoutDashboard, group: "start" },
  { title: "Wallets & Addresses", url: "/wallets", icon: Wallet, group: "start" },
  { title: "Import Data", url: "/integrations", icon: Link2, group: "start" },

  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight, group: "portfolio" },
  { title: "Portfolio", url: "/portfolio", icon: PieChart, group: "portfolio" },
  { title: "Tax Reports", url: "/tax-reports", icon: FileText, group: "portfolio" },
  { title: "Statement Insights", url: "/statement-insights", icon: FileSearch, group: "portfolio" },
  { title: "Reconciliation", url: "/reconciliation", icon: ReconcileIcon, group: "portfolio" },

  { title: "Crypto News", url: "/crypto-news", icon: Newspaper, group: "market" },
  { title: "Price Alerts", url: "/price-alerts", icon: Bell, group: "market" },
  { title: "Whale Alerts", url: "/whale-alerts", icon: Fish, group: "market" },
  { title: "Technical Analysis", url: "/technical-analysis", icon: BarChart3, group: "market" },
  { title: "Stablecoins", url: "/stablecoins", icon: DollarSign, group: "market" },
  { title: "Earn & Yield", url: "/rwa-yields", icon: Gem, group: "market" },
  { title: "AMM Pools", url: "/amm-pools", icon: Droplets, group: "market" },
  { title: "Native Staking", url: "/native-staking", icon: Pickaxe, group: "market" },
  { title: "Flare FTSO", url: "/flare", icon: Flame, group: "market" },

  { title: "Wallet & Yield", url: "/ownbank", icon: Landmark, color: "#00A4E4", group: "ownbank" },
  { title: "RLUSD Vaults", url: "/ownbank/vaults", icon: Vault, color: "#00A4E4", group: "ownbank" },
  { title: "Token Manager", url: "/ownbank/tokens", icon: Coins, color: "#00A4E4", group: "ownbank" },
  { title: "DEX Trading", url: "/ownbank/dex", icon: TrendingUp, color: "#00A4E4", group: "ownbank" },
  { title: "DCA Orders", url: "/ownbank/dca", icon: Repeat, color: "#00A4E4", group: "ownbank" },
  { title: "Send & Receive", url: "/ownbank/send", icon: Send, color: "#00A4E4", group: "ownbank" },
  { title: "Transfer", url: "/ownbank/transfer", icon: TransferIcon, color: "#00A4E4", group: "ownbank" },
  { title: "Invoices", url: "/ownbank/invoices", icon: InvoiceIcon, color: "#00A4E4", group: "ownbank" },
  { title: "My Payment Card", url: "/ownbank/my-card", icon: QrCode, color: "#00A4E4", group: "ownbank" },
  { title: "Payment Queue", url: "/ownbank/payment-queue", icon: CloudUpload, color: "#00A4E4", group: "ownbank" },
  { title: "Recurring Payments", url: "/ownbank/recurring", icon: CalendarClock, color: "#00A4E4", group: "ownbank" },
  { title: "Vault Positions", url: "/ownbank/withdraw", icon: ArrowDownToLine, color: "#00A4E4", group: "ownbank" },
  { title: "History", url: "/ownbank/history", icon: History, color: "#00A4E4", group: "ownbank" },
  { title: "My Referrals", url: "/ownbank/referrals", icon: Users, color: "#00A4E4", group: "ownbank" },
  { title: "XLS-66 Lending", url: "/xls66-lending", icon: Gem, color: "#00A4E4", group: "ownbank" },
  { title: "Signing Options", url: "/ownbank/signing-options", icon: Shield, color: "#00A4E4", group: "ownbank" },

  { title: "Wallet", url: "/stellar/wallet", icon: Wallet, color: "#7B61FF", group: "stellar" },
  { title: "Send & Receive", url: "/stellar/send", icon: Send, color: "#7B61FF", group: "stellar" },
  { title: "Token Manager", url: "/stellar/tokens", icon: Coins, color: "#7B61FF", group: "stellar" },
  { title: "Invoices", url: "/stellar/invoices", icon: InvoiceIcon, color: "#7B61FF", group: "stellar" },
  { title: "DEX Trading", url: "/stellar/dex", icon: TrendingUp, color: "#7B61FF", group: "stellar" },
  { title: "DCA Orders", url: "/stellar/dca", icon: Repeat, color: "#7B61FF", group: "stellar" },
  { title: "Payment Queue", url: "/stellar/payment-queue", icon: CloudUpload, color: "#7B61FF", group: "stellar" },
  { title: "Recurring Payments", url: "/stellar/recurring", icon: CalendarClock, color: "#7B61FF", group: "stellar" },
  { title: "Remittances", url: "/stellar/remittances", icon: Star, color: "#7B61FF", group: "stellar" },

  { title: "Legacy Plan", url: "/legacy-plan", icon: HeartHandshake, group: "planning" },
  { title: "Insurance", url: "/insurance", icon: ShieldCheck, group: "planning" },
  { title: "DeFi Borrowing", url: "/defi-borrowing", icon: CircleDollarSign, group: "planning" },
  { title: "Yield Calculator", url: "/yield-calculator", icon: Calculator, group: "planning" },

  { title: "Roadmap", url: "/roadmap", icon: Rocket, group: "learn" },
  { title: "Chain Guide", url: "/chain-guide", icon: GitCompareArrows, group: "learn" },
  { title: "Migration Guide", url: "/migration-guide", icon: Route, group: "learn" },
  { title: "FAQ", url: "/faq", icon: HelpCircle, group: "learn" },
  { title: "Contact & Feedback", url: "/contact", icon: MessageSquare, group: "learn" },
];

const DEFAULT_FAVORITES = ["/", "/portfolio", "/rwa-yields", "/stablecoins", "/chain-guide"];

const STORAGE_KEY_FAVS = "sidebar-favorites";
const STORAGE_KEY_GROUPS = "sidebar-groups-open";

function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FAVS);
      return stored ? JSON.parse(stored) : DEFAULT_FAVORITES;
    } catch {
      return DEFAULT_FAVORITES;
    }
  });

  const toggle = useCallback((url: string) => {
    setFavorites((prev) => {
      const next = prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url];
      localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(next));
      return next;
    });
  }, []);

  return { favorites, toggle, isFav: (url: string) => favorites.includes(url) };
}

function useGroupState(defaults: Record<string, boolean>) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GROUPS);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  const toggleGroup = useCallback((key: string) => {
    setOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(next));
      return next;
    });
  }, []);

  return { open, toggleGroup };
}

function NavItemRow({
  item,
  testPrefix,
  showFavStar,
  isActive,
  isFavorite,
  onToggleFav,
}: {
  item: NavItem;
  testPrefix: string;
  showFavStar: boolean;
  isActive: boolean;
  isFavorite: boolean;
  onToggleFav: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <div
        className="relative flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SidebarMenuButton
          asChild
          isActive={isActive}
          data-testid={`nav-${testPrefix}-${item.title.toLowerCase().replace(/[\s&()]/g, "-")}`}
          className="flex-1"
        >
          <Link href={item.url}>
            <Icon
              className="h-4 w-4"
              style={item.color ? { color: item.color } : undefined}
            />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {showFavStar && hovered && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFav();
            }}
            className="absolute right-1 p-1 rounded hover:bg-accent transition-colors z-10"
            data-testid={`fav-toggle-${item.url.replace(/\//g, "-")}`}
            title={isFavorite ? "Unpin from My Tools" : "Pin to My Tools"}
          >
            {isFavorite ? (
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            ) : (
              <StarOff className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
    enabled: !!user,
  });

  const { favorites, toggle, isFav } = useFavorites();
  const { open, toggleGroup } = useGroupState({
    start: true,
    portfolio: false,
    market: false,
    ownbank: false,
    stellar: false,
    planning: false,
    learn: false,
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

  const favoriteItems = allItems.filter((i) => favorites.includes(i.url));
  const startItems = allItems.filter((i) => i.group === "start");
  const portfolioItems = allItems.filter((i) => i.group === "portfolio");
  const marketItems = allItems.filter((i) => i.group === "market");
  const ownbankItems = allItems.filter((i) => i.group === "ownbank");
  const stellarItems = allItems.filter((i) => i.group === "stellar");
  const planningItems = allItems.filter((i) => i.group === "planning");
  const learnItems = allItems.filter((i) => i.group === "learn");

  const renderItem = (item: NavItem, testPrefix: string, showFavStar = true) => (
    <NavItemRow
      key={item.url}
      item={item}
      testPrefix={testPrefix}
      showFavStar={showFavStar}
      isActive={location === item.url}
      isFavorite={isFav(item.url)}
      onToggleFav={() => toggle(item.url)}
    />
  );

  const renderCollapsibleGroup = (
    key: string,
    label: string,
    items: NavItem[],
    dotColor?: string,
    extra?: JSX.Element
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel
        className="cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-md"
        onClick={() => toggleGroup(key)}
        data-testid={`group-toggle-${key}`}
      >
        <span className="flex items-center gap-2 flex-1">
          {dotColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />}
          {label}
        </span>
        {open[key] ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </SidebarGroupLabel>
      {open[key] && (
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => renderItem(item, key))}
            {extra}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="CryptoOwnBank" className="h-9 w-9 rounded-md" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">CryptoOwnBank</span>
            <span className="text-[10px] text-muted-foreground">Be Your Own Bank</span>
            <span className="text-[9px] italic text-muted-foreground/70">Value Flows Free. You Own the Flow.</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {favoriteItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <span className="flex items-center gap-2">
                <Pin className="h-3 w-3 text-amber-500" />
                My Tools
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favoriteItems.map((item) => renderItem(item, "pinned", true))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {renderCollapsibleGroup("start", "Getting Started", startItems)}

        {renderCollapsibleGroup("portfolio", "Portfolio", portfolioItems)}

        {renderCollapsibleGroup("market", "Market & Yields", marketItems)}

        {renderCollapsibleGroup(
          "ownbank",
          "OwnBank XRPL",
          ownbankItems,
          "#00A4E4",
        )}

        {renderCollapsibleGroup("stellar", "OwnBank Stellar", stellarItems, "#7B61FF")}

        {renderCollapsibleGroup("planning", "Planning & Tools", planningItems)}

        {renderCollapsibleGroup("learn", "Learn", learnItems)}

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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin/errors"}
                    data-testid="nav-admin-errors"
                  >
                    <Link href="/admin/errors">
                      <Bug className="h-4 w-4 text-amber-500" />
                      <span>Error Monitor</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin/vault-blocklist"}
                    data-testid="nav-admin-vault-blocklist"
                  >
                    <Link href="/admin/vault-blocklist">
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span>Vault Blocklist</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin/announcements"}
                    data-testid="nav-admin-announcements"
                  >
                    <Link href="/admin/announcements">
                      <Mail className="h-4 w-4 text-amber-500" />
                      <span>Announcements</span>
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
                  isActive={location === "/settings"}
                  data-testid="nav-settings"
                >
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
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
