import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Landmark,
  PieChart,
  TrendingUp,
  MoreHorizontal,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const tabs = [
  { label: "Home", icon: LayoutDashboard, url: "/" },
  { label: "Portfolio", icon: PieChart, url: "/portfolio" },
  { label: "OwnBank", icon: Landmark, url: "/ownbank" },
  { label: "Market", icon: TrendingUp, url: "/rwa-yields" },
];

const marketPaths = ["/rwa-yields", "/price-alerts", "/whale-alerts", "/technical-analysis", "/stablecoins", "/amm-pools", "/native-staking", "/flare", "/crypto-news"];
const ownbankPaths = ["/ownbank", "/stellar/"];

export function MobileTabBar() {
  const [location] = useLocation();
  const { toggleSidebar } = useSidebar();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    if (url === "/ownbank") return ownbankPaths.some((p) => location.startsWith(p));
    if (url === "/rwa-yields") return marketPaths.some((p) => location === p || location.startsWith(p));
    return location === url;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg md:hidden safe-area-bottom"
      data-testid="mobile-tab-bar"
    >
      <div className="flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const active = isActive(tab.url);
          const Icon = tab.icon;
          return (
            <Link key={tab.url} href={tab.url}>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                  active
                    ? "text-[#00A4E4]"
                    : "text-muted-foreground"
                }`}
                data-testid={`tab-${tab.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </button>
            </Link>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-muted-foreground transition-colors"
          data-testid="tab-more"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
