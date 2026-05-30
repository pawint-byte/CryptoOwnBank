import { useState, useCallback, useEffect } from "react";
import { useUserData } from "@/hooks/use-user-data";
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
  Tag,
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
  Heart,
  Mail,
  Newspaper,
  Flame,
  Droplets,
  ShoppingCart,
  EyeOff,
  CreditCard,
  Layers,
  BrainCircuit,
  Search,
  KeyRound,
  Sparkles,
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
  chain?: "xrpl" | "stellar" | "evm";
};

const CHAIN_COLORS = {
  xrpl: "#00A4E4",
  stellar: "#7B61FF",
  evm: "#F7931A",
};

// Foundation-first grouping (2026-05-26):
//   home    - your starting point + your portfolio at a glance
//   wallets - create / import / view / sign (the foundation)
//   execute - any action that changes what you hold: buy, sell, swap, stake, earn
//   backup  - protect what you have: sovereignty, recovery kit, legacy, family
//   move    - send, receive, invoice, pay, spend (same asset, different person/place)
//   protect - the analysis surface: tax, reconciliation, alerts, insurance, AI
//   learn   - educational + supporting content
const allItems: NavItem[] = [
  // FOUNDATION
  { title: "Home", url: "/", icon: LayoutDashboard, group: "home" },
  { title: "Quick Start", url: "/quick-start", icon: Rocket, group: "home" },
  { title: "Portfolio", url: "/portfolio", icon: PieChart, group: "home" },

  { title: "My Wallets", url: "/wallets", icon: Wallet, group: "wallets" },
  { title: "Create New Wallet", url: "/wallet/create", icon: Sparkles, color: "#00A4E4", group: "wallets" },
  { title: "Import Data", url: "/integrations", icon: Link2, group: "wallets" },
  { title: "Signing Options", url: "/ownbank/signing-options", icon: Shield, group: "wallets" },

  // EXECUTE - anything that changes what you hold
  { title: "Buy Crypto", url: "/buy-crypto", icon: ShoppingCart, color: "#16a34a", group: "execute" },
  { title: "Own It Privately", url: "/own-privately", icon: EyeOff, color: "#7c3aed", group: "execute" },
  { title: "Tax Savings (Harvest)", url: "/tax-harvest", icon: Sparkles, color: "#f59e0b", group: "execute" },
  { title: "XRPL Dashboard", url: "/ownbank", icon: Landmark, group: "execute", chain: "xrpl" },
  { title: "Stellar Dashboard", url: "/stellar/wallet", icon: Landmark, group: "execute", chain: "stellar" },
  { title: "XRPL Tokens", url: "/ownbank/tokens", icon: Coins, group: "execute", chain: "xrpl" },
  { title: "Stellar Tokens", url: "/stellar/tokens", icon: Coins, group: "execute", chain: "stellar" },
  { title: "XRPL DEX", url: "/ownbank/dex", icon: TrendingUp, group: "execute", chain: "xrpl" },
  { title: "Stellar DEX", url: "/stellar/dex", icon: TrendingUp, group: "execute", chain: "stellar" },
  { title: "XRPL DCA", url: "/ownbank/dca", icon: Repeat, group: "execute", chain: "xrpl" },
  { title: "Stellar DCA", url: "/stellar/dca", icon: Repeat, group: "execute", chain: "stellar" },
  { title: "EVM Swap", url: "/ownbank/evm-swap", icon: Zap, group: "execute" },
  { title: "Cross-Chain Swap", url: "/ownbank/cross-chain", icon: Route, group: "execute" },
  { title: "XRPL Bridge", url: "/ownbank/xrpl-bridge", icon: GitCompareArrows, group: "execute", chain: "xrpl" },
  { title: "Yield Vaults", url: "/ownbank/vaults", icon: Vault, group: "execute", chain: "xrpl" },
  { title: "AMM Pools", url: "/amm-pools", icon: Droplets, group: "execute" },
  { title: "Native Staking", url: "/native-staking", icon: Pickaxe, group: "execute" },
  { title: "Flare FTSO", url: "/flare", icon: Flame, group: "execute" },
  { title: "XLS-66 Lending", url: "/xls66-lending", icon: Gem, group: "execute", chain: "xrpl" },
  { title: "Earn & Yield (RWA)", url: "/rwa-yields", icon: Gem, group: "execute" },
  { title: "Token Research", url: "/token-research", icon: Search, group: "execute" },
  { title: "Vault Positions", url: "/ownbank/withdraw", icon: ArrowDownToLine, group: "execute", chain: "xrpl" },
  { title: "Stablecoins", url: "/stablecoins", icon: DollarSign, group: "execute" },
  // { title: "Token Buckets", url: "/token-buckets", icon: Layers, group: "execute", chain: "xrpl" }, // TODO: Hidden until cross-chain bucket execution is built

  // BACK UP & RECOVER
  { title: "Sovereignty", url: "/sovereignty", icon: KeyRound, group: "backup" },
  { title: "Wealth Architecture", url: "/sovereignty/wealth-architecture", icon: Layers, group: "backup" },
  { title: "Recovery Kit", url: "/sovereignty-kit", icon: FileText, group: "backup" },
  { title: "Legacy Plan", url: "/legacy-plan", icon: HeartHandshake, group: "backup" },
  { title: "Family", url: "/family", icon: Users, group: "backup" },

  // MOVE MONEY - same asset, different person/place
  { title: "Payments Hub", url: "/payments", icon: CreditCard, group: "move" },
  { title: "XRPL Send & Receive", url: "/ownbank/send", icon: Send, group: "move", chain: "xrpl" },
  { title: "Stellar Send & Receive", url: "/stellar/send", icon: Send, group: "move", chain: "stellar" },
  { title: "Bitcoin & Lightning", url: "/bitcoin", icon: Send, group: "move" },
  { title: "XRPL Invoices", url: "/ownbank/invoices", icon: InvoiceIcon, group: "move", chain: "xrpl" },
  { title: "Stellar Invoices", url: "/stellar/invoices", icon: InvoiceIcon, group: "move", chain: "stellar" },
  { title: "XRPL Payment Queue", url: "/ownbank/payment-queue", icon: CloudUpload, group: "move", chain: "xrpl" },
  { title: "Stellar Payment Queue", url: "/stellar/payment-queue", icon: CloudUpload, group: "move", chain: "stellar" },
  { title: "XRPL Recurring", url: "/ownbank/recurring", icon: CalendarClock, group: "move", chain: "xrpl" },
  { title: "Stellar Recurring", url: "/stellar/recurring", icon: CalendarClock, group: "move", chain: "stellar" },
  { title: "Transfer", url: "/ownbank/transfer", icon: TransferIcon, group: "move", chain: "xrpl" },
  { title: "OwnCoin POS", url: "/ownbank/my-card", icon: QrCode, group: "move", chain: "xrpl" },
  { title: "Remittances", url: "/stellar/remittances", icon: Star, group: "move", chain: "stellar" },
  { title: "Spend Crypto", url: "/crypto-debit-cards", icon: CreditCard, color: "#3b82f6", group: "move" },

  // PLAN & PROTECT - the analysis surface
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight, group: "protect" },
  { title: "Tax Reports", url: "/tax-reports", icon: FileText, group: "protect" },
  { title: "Statement Insights", url: "/statement-insights", icon: FileSearch, group: "protect" },
  { title: "Reconciliation", url: "/reconciliation", icon: ReconcileIcon, group: "protect" },
  { title: "Price Alerts", url: "/price-alerts", icon: Bell, group: "protect" },
  { title: "Insurance", url: "/insurance", icon: ShieldCheck, group: "protect" },
  { title: "DeFi Borrowing", url: "/defi-borrowing", icon: CircleDollarSign, group: "protect" },
  { title: "Aave Hub", url: "/aave", icon: CircleDollarSign, group: "execute" },
  { title: "Yield Calculator", url: "/yield-calculator", icon: Calculator, group: "protect" },
  { title: "AI Assistant", url: "/ai-assistant", icon: BrainCircuit, color: "#8b5cf6", group: "protect" },
  { title: "History", url: "/ownbank/history", icon: History, group: "protect", chain: "xrpl" },
  { title: "My Referrals", url: "/ownbank/referrals", icon: Users, group: "protect" },

  // LEARN & DECIDE
  { title: "Our Principles", url: "/principles", icon: Heart, group: "learn" },
  { title: "Crypto News", url: "/crypto-news", icon: Newspaper, group: "learn" },
  { title: "Whale Alerts", url: "/whale-alerts", icon: Fish, group: "learn" },
  { title: "Technical Analysis", url: "/technical-analysis", icon: BarChart3, group: "learn" },
  { title: "Roadmap & Voting", url: "/roadmap", icon: Rocket, group: "learn" },
  { title: "Chain Guide", url: "/chain-guide", icon: GitCompareArrows, group: "learn" },
  { title: "Migration Guide", url: "/migration-guide", icon: Route, group: "learn" },
  { title: "FAQ", url: "/faq", icon: HelpCircle, group: "learn" },
  { title: "Contact & Feedback", url: "/contact", icon: MessageSquare, group: "learn" },
];

const DEFAULT_FAVORITES = ["/", "/portfolio", "/rwa-yields", "/stablecoins", "/chain-guide"];

function useFavorites() {
  const { data: serverFavorites, save: saveFavorites } = useUserData<string[]>("sidebar_favorites", DEFAULT_FAVORITES);
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);

  useEffect(() => {
    if (serverFavorites && serverFavorites.length > 0) {
      setFavorites(serverFavorites);
    }
  }, [serverFavorites]);

  const toggle = useCallback((url: string) => {
    setFavorites((prev) => {
      const next = prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url];
      saveFavorites(next);
      return next;
    });
  }, [saveFavorites]);

  return { favorites, toggle, isFav: (url: string) => favorites.includes(url) };
}

function useGroupState(defaults: Record<string, boolean>) {
  const { data: serverGroups, save: saveGroups } = useUserData<Record<string, boolean>>("sidebar_groups", defaults);
  const [open, setOpen] = useState<Record<string, boolean>>(defaults);

  useEffect(() => {
    if (serverGroups) {
      setOpen((prev) => ({ ...prev, ...serverGroups }));
    }
  }, [serverGroups]);

  const toggleGroup = useCallback((key: string) => {
    setOpen((prev) => {
      const isCurrentlyOpen = prev[key];
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) {
        next[k] = false;
      }
      if (!isCurrentlyOpen) {
        next[key] = true;
      }
      saveGroups(next);
      return next;
    });
  }, [saveGroups]);

  const openGroup = useCallback((key: string) => {
    setOpen((prev) => {
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) {
        next[k] = false;
      }
      next[key] = true;
      return next;
    });
  }, []);

  return { open, toggleGroup, openGroup };
}

function useChainFilter() {
  const { data: serverChain, save: saveChain } = useUserData<"all" | "xrpl" | "stellar">("sidebar_chain_filter", "all");
  const [chain, setChainState] = useState<"all" | "xrpl" | "stellar">("all");

  useEffect(() => {
    if (serverChain) {
      setChainState(serverChain);
    }
  }, [serverChain]);

  const setChain = useCallback((c: "all" | "xrpl" | "stellar") => {
    setChainState(c);
    saveChain(c);
  }, [saveChain]);

  return { chain, setChain };
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
  const chainColor = item.chain ? CHAIN_COLORS[item.chain] : item.color;

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
              style={chainColor ? { color: chainColor } : undefined}
            />
            <span>{item.title}</span>
            {item.chain && (
              <span
                className="ml-auto text-[9px] font-medium uppercase opacity-50"
                style={{ color: CHAIN_COLORS[item.chain] }}
              >
                {item.chain === "xrpl" ? "XRP" : "XLM"}
              </span>
            )}
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

function ChainSwitcher({ chain, setChain }: { chain: "all" | "xrpl" | "stellar"; setChain: (c: "all" | "xrpl" | "stellar") => void }) {
  const options: { value: "all" | "xrpl" | "stellar"; label: string; color?: string }[] = [
    { value: "all", label: "All" },
    { value: "xrpl", label: "XRPL", color: CHAIN_COLORS.xrpl },
    { value: "stellar", label: "Stellar", color: CHAIN_COLORS.stellar },
  ];

  return (
    <div className="flex gap-1 px-3 py-1.5" data-testid="chain-switcher">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setChain(opt.value)}
          className={`flex-1 text-[10px] font-medium py-1 px-2 rounded-md transition-colors ${
            chain === opt.value
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
          style={chain === opt.value && opt.color ? { borderBottom: `2px solid ${opt.color}` } : undefined}
          data-testid={`chain-switch-${opt.value}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
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

  const activeGroup = allItems.find((i) => i.url === location)?.group || "home";
  const defaultOpen: Record<string, boolean> = {
    home: activeGroup === "home",
    wallets: activeGroup === "wallets",
    execute: activeGroup === "execute",
    backup: activeGroup === "backup",
    move: activeGroup === "move",
    protect: activeGroup === "protect",
    learn: activeGroup === "learn",
  };

  const { open, toggleGroup, openGroup } = useGroupState(defaultOpen);
  const { chain, setChain } = useChainFilter();

  useEffect(() => {
    const group = allItems.find((i) => i.url === location)?.group;
    if (group && !open[group]) {
      openGroup(group);
    }
  }, [location]);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const filterByChain = (items: NavItem[]) => {
    if (chain === "all") return items;
    return items.filter((i) => !i.chain || i.chain === chain);
  };

  const favoriteItems = allItems.filter((i) => favorites.includes(i.url));
  const homeItems = allItems.filter((i) => i.group === "home");
  const walletItems = allItems.filter((i) => i.group === "wallets");
  const executeItems = filterByChain(allItems.filter((i) => i.group === "execute"));
  const backupItems = allItems.filter((i) => i.group === "backup");
  const moveItems = filterByChain(allItems.filter((i) => i.group === "move"));
  const protectItems = filterByChain(allItems.filter((i) => i.group === "protect"));
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

        {/* FOUNDATION — always visible, the ladder every member climbs */}
        {renderCollapsibleGroup("home", "Home", homeItems, "#00A4E4")}

        {renderCollapsibleGroup("wallets", "My Wallets", walletItems, "#00A4E4")}

        <SidebarGroup>
          <SidebarGroupLabel
            className="cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-md"
            onClick={() => toggleGroup("execute")}
            data-testid="group-toggle-execute"
          >
            <span className="flex items-center gap-2 flex-1">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#00A4E4] to-[#7B61FF]" />
              Execute
              <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal">
                {chain === "all" ? "All" : chain === "xrpl" ? "XRPL" : "Stellar"}
              </Badge>
            </span>
            {open["execute"] ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </SidebarGroupLabel>
          {open["execute"] && (
            <>
              <ChainSwitcher chain={chain} setChain={setChain} />
              <SidebarGroupContent>
                <SidebarMenu>
                  {executeItems.map((item) => renderItem(item, "execute"))}
                </SidebarMenu>
              </SidebarGroupContent>
            </>
          )}
        </SidebarGroup>

        {renderCollapsibleGroup("backup", "Back Up & Recover", backupItems, "#f59e0b")}

        {/* USE — built on top of the foundation */}
        {renderCollapsibleGroup("move", "Move Money", moveItems, "#16a34a")}

        {renderCollapsibleGroup("protect", "Plan & Protect", protectItems)}

        {renderCollapsibleGroup("learn", "Learn & Decide", learnItems)}

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
                  isActive={location === "/pricing"}
                  data-testid="nav-pricing"
                >
                  <Link href="/pricing">
                    <Tag className="h-4 w-4" />
                    <span>Pricing & Plans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/dvpn"}
                  data-testid="nav-dvpn"
                >
                  <Link href="/dvpn">
                    <Shield className="h-4 w-4" />
                    <span>dVPN Partners</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
