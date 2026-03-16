import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Coins,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Zap,
  Clock,
  Shield,
  Wallet,
  RefreshCw,
  Search,
  Copy,
  Check,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeoHead } from "@/components/seo-head";
import {
  useStellarStore,
  fetchStellarBalances,
  type StellarBalance,
} from "@/lib/stellar-store";

const STELLAR_PURPLE = "#7B61FF";

interface PopularToken {
  name: string;
  code: string;
  issuer: string;
  description: string;
}

const POPULAR_TOKENS: PopularToken[] = [
  {
    name: "USDC (Circle)",
    code: "USDC",
    issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    description: "USD Coin — fully backed, audited USD stablecoin by Circle",
  },
  {
    name: "EURC (Circle)",
    code: "EURC",
    issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE",
    description: "Euro Coin — euro-backed stablecoin by Circle",
  },
  {
    name: "yXLM (UltraStellar)",
    code: "yXLM",
    issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55",
    description: "Yield-bearing XLM — earn interest by holding yXLM",
  },
  {
    name: "AQUA",
    code: "AQUA",
    issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
    description: "Aquarius — liquidity management and voting on Stellar DEX",
  },
  {
    name: "SHX (Stronghold)",
    code: "SHX",
    issuer: "GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEZ6JHR5PX7CXZJOQL5WFHAVPS",
    description: "Stronghold Token — regulatory-compliant financial infrastructure",
  },
];

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function isTokenActive(token: PopularToken, balances: StellarBalance[]): boolean {
  return balances.some(
    (b) => b.asset_code === token.code && b.asset_issuer === token.issuer
  );
}

function buildChangeTrustLink(code: string, issuer: string, wallet: string): string {
  if (wallet === "lobstr") {
    return `https://lobstr.co/asset/${code}-${issuer}`;
  }
  if (wallet === "stellarterm") {
    return `https://stellarterm.com/exchange/${code}-${issuer}/XLM-native`;
  }
  if (wallet === "stellarx") {
    return `https://www.stellarx.com/markets/${code}:${issuer}/native`;
  }
  return `https://laboratory.stellar.org/#txbuilder?params=changeTrust&asset_code=${code}&asset_issuer=${issuer}`;
}

function buildRemoveTrustLink(code: string, issuer: string, wallet: string): string {
  if (wallet === "lobstr") {
    return `https://lobstr.co/asset/${code}-${issuer}`;
  }
  if (wallet === "stellarterm") {
    return `https://stellarterm.com/exchange/${code}-${issuer}/XLM-native`;
  }
  if (wallet === "stellarx") {
    return `https://www.stellarx.com/markets/${code}:${issuer}/native`;
  }
  return `https://laboratory.stellar.org/#txbuilder?params=changeTrust&asset_code=${code}&asset_issuer=${issuer}&limit=0`;
}

export default function StellarTokens() {
  const { toast } = useToast();
  const { stellarAddress, isConnected, balances, loading, setBalances, setLoading } = useStellarStore();

  const [eduOpen, setEduOpen] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [issuerInput, setIssuerInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIssuer, setCopiedIssuer] = useState<string | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ code: string; issuer: string; action: "add" | "remove" } | null>(null);

  const fetchTrustlines = useCallback(async () => {
    if (!stellarAddress) return;
    setLoading(true);
    try {
      const result = await fetchStellarBalances(stellarAddress);
      setBalances(result.xlm, result.balances);
    } catch {
      toast({
        title: "Failed to fetch trustlines",
        description: "Could not connect to Stellar Horizon.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [stellarAddress, setBalances, setLoading, toast]);

  useEffect(() => {
    if (isConnected && stellarAddress) {
      fetchTrustlines();
    }
  }, [isConnected, stellarAddress, fetchTrustlines]);

  const nonNativeBalances = balances.filter((b) => b.asset_type !== "native");

  const handleAddTrustline = (code: string, issuer: string) => {
    setPendingAction({ code, issuer, action: "add" });
    setWalletDialogOpen(true);
  };

  const handleRemoveTrustline = (b: StellarBalance) => {
    const bal = parseFloat(b.balance);
    if (Math.abs(bal) > 0) {
      toast({
        title: "Cannot Remove",
        description: "Your balance must be zero before removing this trustline. Transfer or trade your tokens first.",
        variant: "destructive",
      });
      return;
    }
    setPendingAction({ code: b.asset_code, issuer: b.asset_issuer || "", action: "remove" });
    setWalletDialogOpen(true);
  };

  const handleCustomAdd = () => {
    if (!codeInput.trim() || !issuerInput.trim()) {
      toast({ title: "Missing Fields", description: "Enter both asset code and issuer address.", variant: "destructive" });
      return;
    }
    if (!issuerInput.startsWith("G") || issuerInput.length !== 56) {
      toast({ title: "Invalid Issuer", description: "Issuer must be a valid Stellar address (starts with G, 56 characters).", variant: "destructive" });
      return;
    }
    handleAddTrustline(codeInput.trim().toUpperCase(), issuerInput.trim());
    setAddModalOpen(false);
    setCodeInput("");
    setIssuerInput("");
  };

  const handleCopyIssuer = (issuer: string) => {
    navigator.clipboard.writeText(issuer);
    setCopiedIssuer(issuer);
    setTimeout(() => setCopiedIssuer(null), 2000);
  };

  const filteredBalances = nonNativeBalances.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.asset_code.toLowerCase().includes(q) ||
      (b.asset_issuer || "").toLowerCase().includes(q)
    );
  });

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <SeoHead title="Stellar Token Manager — CryptoOwnBank" description="Manage your Stellar trustlines and token holdings." path="/stellar/tokens" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-tokens-title">Stellar Token Manager</h1>
          <p className="text-muted-foreground">Manage your Stellar trustlines and token holdings</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect your Stellar wallet from the Stellar Wallet page to manage tokens.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SeoHead title="Stellar Token Manager — CryptoOwnBank" description="Manage your Stellar trustlines and token holdings." path="/stellar/tokens" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-tokens-title">Stellar Token Manager</h1>
          <p className="text-muted-foreground">Manage your Stellar trustlines and token holdings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={fetchTrustlines} disabled={loading} data-testid="button-refresh-stellar-tokens">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setAddModalOpen(true)}
                style={{ backgroundColor: STELLAR_PURPLE, borderColor: STELLAR_PURPLE }}
                className="text-white"
                size="sm"
                data-testid="button-add-stellar-trustline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Trustline
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">Opens your Stellar wallet to sign a ChangeTrust operation</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Collapsible open={eduOpen} onOpenChange={setEduOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                Learn: What are Stellar Trustlines?
              </CardTitle>
              {eduOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">Old Way</span>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-old-way-stellar">
                    Open a brokerage account, fill out forms, wait for approval to hold foreign assets
                  </p>
                </div>
                <div className="rounded-md border p-4 space-y-2" style={{ borderColor: `${STELLAR_PURPLE}30`, backgroundColor: `${STELLAR_PURPLE}08` }}>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                    <span className="text-sm font-semibold" style={{ color: STELLAR_PURPLE }}>New Way</span>
                  </div>
                  <p className="text-sm" data-testid="text-new-way-stellar">
                    Set a trustline in your wallet &rarr; instantly hold USDC, EURC, or any Stellar token
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-muted/30 border border-muted p-4">
                <p className="text-sm" data-testid="text-trustline-stellar-explainer">
                  <span className="font-semibold">What is a Stellar trustline?</span>{" "}
                  Like XRPL, Stellar requires you to explicitly trust an asset issuer before receiving their tokens.
                  Setting a trustline costs a small base reserve (0.5 XLM per trustline) and authorizes your account to hold that asset.
                </p>
              </div>
              <a
                href="https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#trustlines"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline inline-flex items-center gap-1"
                style={{ color: STELLAR_PURPLE }}
                data-testid="link-stellar-docs-trustlines"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Learn more on Stellar Docs
              </a>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base" data-testid="text-popular-stellar-tokens">Popular Tokens — Quick Add</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_TOKENS.map((token) => {
              const active = isTokenActive(token, balances);
              return (
                <div key={token.name} className="rounded-md border p-3 space-y-2" data-testid={`card-stellar-token-${token.code}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{token.name}</span>
                    {active ? (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-active-${token.code}`}>Active</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTrustline(token.code, token.issuer)}
                        data-testid={`button-quick-add-${token.code}`}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{token.description}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    Issuer: {truncateAddress(token.issuer)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base" data-testid="text-current-trustlines-stellar">
            Your Trustlines ({nonNativeBalances.length})
          </CardTitle>
          {nonNativeBalances.length > 3 && (
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
                data-testid="input-search-stellar-trustlines"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
              <p>{nonNativeBalances.length === 0 ? "No trustlines set yet. Add popular tokens above to get started." : "No matching trustlines."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBalances.map((b, i) => (
                <div key={`${b.asset_code}-${b.asset_issuer}-${i}`} className="flex items-center justify-between rounded-md border p-3" data-testid={`row-trustline-${b.asset_code}-${i}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: STELLAR_PURPLE }}>
                      {b.asset_code.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{b.asset_code}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {b.asset_issuer ? truncateAddress(b.asset_issuer) : "native"}
                        </p>
                        {b.asset_issuer && (
                          <button onClick={() => handleCopyIssuer(b.asset_issuer!)} className="shrink-0">
                            {copiedIssuer === b.asset_issuer ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-mono">{parseFloat(b.balance).toLocaleString(undefined, { maximumFractionDigits: 7 })}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTrustline(b)}
                      data-testid={`button-remove-${b.asset_code}-${i}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Trustline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Asset Code</label>
              <Input
                placeholder="e.g., USDC"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                data-testid="input-custom-asset-code"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Issuer Address</label>
              <Input
                placeholder="GXXXXXXXXX..."
                value={issuerInput}
                onChange={(e) => setIssuerInput(e.target.value)}
                data-testid="input-custom-issuer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The Stellar address of the asset issuer (starts with G, 56 chars)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCustomAdd}
              style={{ backgroundColor: STELLAR_PURPLE, borderColor: STELLAR_PURPLE }}
              className="text-white"
              data-testid="button-confirm-custom-add"
            >
              Add Trustline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === "add" ? "Add Trustline" : "Remove Trustline"} — {pendingAction?.code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {pendingAction?.action === "add"
                ? "Open your Stellar wallet to sign a ChangeTrust transaction. This authorizes your account to hold this token."
                : "Open your Stellar wallet to remove this trustline. Your balance must be zero."}
            </p>
            <p className="text-xs text-muted-foreground">
              Asset: <span className="font-mono">{pendingAction?.code}</span><br />
              Issuer: <span className="font-mono">{pendingAction?.issuer ? truncateAddress(pendingAction.issuer) : ""}</span>
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Open in your wallet:</p>
              <div className="flex flex-wrap gap-2">
                {pendingAction && (
                  <>
                    {(() => {
                      const linkFn = pendingAction.action === "remove" ? buildRemoveTrustLink : buildChangeTrustLink;
                      return (
                        <>
                          <a href={linkFn(pendingAction.code, pendingAction.issuer, "lobstr")} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" data-testid="button-trust-lobstr">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              LOBSTR
                            </Button>
                          </a>
                          <a href={linkFn(pendingAction.code, pendingAction.issuer, "stellarterm")} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" data-testid="button-trust-stellarterm">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              StellarTerm
                            </Button>
                          </a>
                          <a href={linkFn(pendingAction.code, pendingAction.issuer, "uri")} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" data-testid="button-trust-uri">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Stellar URI
                            </Button>
                          </a>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              After signing in your wallet, refresh this page to see the updated trustlines.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWalletDialogOpen(false); setPendingAction(null); }}>Close</Button>
            <Button variant="ghost" size="sm" onClick={fetchTrustlines} data-testid="button-refresh-after-trust">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
