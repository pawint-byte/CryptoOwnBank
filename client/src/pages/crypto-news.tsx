import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Newspaper,
  ExternalLink,
  Clock,
  Search,
  RefreshCw,
  Filter,
  Loader2,
} from "lucide-react";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  sourceIcon: string;
  snippet: string;
  categories: string[];
}

interface NewsResponse {
  items: NewsItem[];
  sources: string[];
  fetchedAt: string | null;
}

const SOURCE_COLORS: Record<string, string> = {
  CoinDesk: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
  CoinTelegraph: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  Decrypt: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400",
  "The Block": "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
};

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CryptoNews() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<NewsResponse>({
    queryKey: ["/api/news"],
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;
    if (activeSource) {
      items = items.filter(i => i.source === activeSource);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.snippet.toLowerCase().includes(q) ||
        i.categories.some(c => c.toLowerCase().includes(q))
      );
    }
    return items;
  }, [data?.items, activeSource, searchQuery]);

  const lastUpdated = data?.fetchedAt ? (() => {
    const d = new Date(data.fetchedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    });
  })() : null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-[#00A4E4]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="heading-news">Crypto News</h1>
            <p className="text-sm text-muted-foreground">Latest from CoinDesk, CoinTelegraph, Decrypt & The Block</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-news"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search headlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-news"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Button
            variant={activeSource === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSource(null)}
            className={activeSource === null ? "bg-[#00A4E4] hover:bg-[#0090c9]" : ""}
            data-testid="filter-all"
          >
            All
          </Button>
          {(data?.sources || []).map(source => (
            <Button
              key={source}
              variant={activeSource === source ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSource(activeSource === source ? null : source)}
              className={activeSource === source ? "bg-[#00A4E4] hover:bg-[#0090c9]" : ""}
              data-testid={`filter-${source.toLowerCase().replace(/\s/g, "-")}`}
            >
              {source}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00A4E4]" />
          <p className="text-sm text-muted-foreground">Loading latest crypto news...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Newspaper className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No articles found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term" : "News feeds are loading — check back shortly"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, idx) => (
            <a
              key={`${item.source}-${idx}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              data-testid={`news-article-${idx}`}
            >
              <Card className="transition-all hover:shadow-md hover:border-[#00A4E4]/30 group-hover:bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[item.source] || ""}`}>
                          {item.source}
                        </Badge>
                        {item.pubDate && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(item.pubDate)}
                          </span>
                        )}
                        {item.categories.slice(0, 2).map((cat, ci) => (
                          <Badge key={ci} variant="secondary" className="text-[10px]">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                      <h3 className="font-semibold text-sm leading-tight group-hover:text-[#00A4E4] transition-colors" data-testid={`news-title-${idx}`}>
                        {item.title}
                      </h3>
                      {item.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.snippet}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3 w-3" />
          <span>
            {lastUpdated
              ? `Last updated: ${lastUpdated} · Refreshes every 15 minutes`
              : "Connecting to news sources..."}
          </span>
        </div>
        <span>{filteredItems.length} article{filteredItems.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="text-[10px] text-muted-foreground text-center">
        News aggregated from CoinDesk, CoinTelegraph, Decrypt, and The Block. Articles open in a new tab to the original source.
        CryptoOwnBank does not endorse or verify the accuracy of third-party content.
      </div>
    </div>
  );
}
