import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
  ArrowRightLeft,
  Zap,
  Clock,
  Shield,
  Wallet,
  RefreshCw,
  Search,
  Copy,
  Check,
} from "lucide-react";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  getAccountTrustlines,
  type XrplTrustline,
} from "@/lib/xrpl-client";
import { signTrustSet, signTransaction } from "@/lib/xumm-connector";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useToast } from "@/hooks/use-toast";

const RLUSD_HEX = "524C555344000000000000000000000000000000";

interface PopularToken {
  name: string;
  currency: string;
  issuer: string;
  description: string;
}

const POPULAR_TOKENS: PopularToken[] = [
  {
    name: "RLUSD",
    currency: "524C555344000000000000000000000000000000",
    issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
    description: "Ripple's USD stablecoin, backed 1:1 by US dollars",
  },
  {
    name: "SOLO (Sologenic)",
    currency: "534F4C4F00000000000000000000000000000000",
    issuer: "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz",
    description: "Sologenic DEX and tokenization platform token",
  },
  {
    name: "CORE (Coreum)",
    currency: "434F524500000000000000000000000000000000",
    issuer: "rcoreNywaoz2ZCQ8Lg2EbSLnGuRBmun6D",
    description: "Coreum enterprise blockchain native token on XRPL",
  },
  {
    name: "USD (Bitstamp)",
    currency: "USD",
    issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
    description: "USD IOU issued by Bitstamp exchange",
  },
  {
    name: "EUR (Gatehub)",
    currency: "EUR",
    issuer: "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    description: "EUR IOU issued by Gatehub exchange",
  },
];

function friendlyTokenName(currency: string, issuer: string): string {
  if (currency === "RLUSD" || currency === RLUSD_HEX) return "RLUSD";
  const found = POPULAR_TOKENS.find(
    (t) =>
      (t.currency === currency || t.currency === RLUSD_HEX) &&
      t.issuer === issuer
  );
  if (found) return found.name;
  if (currency.length > 3) {
    try {
      const decoded = currency
        .replace(/0+$/, "")
        .match(/.{1,2}/g)
        ?.map((h) => String.fromCharCode(parseInt(h, 16)))
        .join("");
      if (decoded && /^[A-Za-z0-9]+$/.test(decoded)) return decoded;
    } catch {}
  }
  return currency;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function isPopularTokenAlreadySet(
  token: PopularToken,
  trustlines: XrplTrustline[]
): boolean {
  return trustlines.some(
    (tl) =>
      (tl.currency === token.currency ||
        (token.currency === "RLUSD" && tl.currency === "RLUSD")) &&
      tl.issuer === token.issuer
  );
}

export default function OwnBankTokens() {
  const { toast } = useToast();
  const { isConnected, walletAddress, walletType } = useXrplStore();

  const [trustlines, setTrustlines] = useState<XrplTrustline[]>([]);
  const [loading, setLoading] = useState(false);
  const [eduOpen, setEduOpen] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [currencyInput, setCurrencyInput] = useState("");
  const [issuerInput, setIssuerInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIssuer, setCopiedIssuer] = useState<string | null>(null);

  const fetchTrustlines = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const lines = await getAccountTrustlines(walletAddress);
      setTrustlines(lines);
    } catch {
      toast({
        title: "Failed to fetch trustlines",
        description: "Could not connect to XRPL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, toast]);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchTrustlines();
    }
  }, [isConnected, walletAddress, fetchTrustlines]);

  const handleAddTrustline = async () => {
    if (!currencyInput.trim() || !issuerInput.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please enter both a currency code and issuer address.",
        variant: "destructive",
      });
      return;
    }
    setIsAdding(true);
    try {
      const result = await signTrustSet(
        currencyInput.trim(),
        issuerInput.trim()
      );
      if (result.success) {
        toast({
          title: "Trustline Set",
          description: `Successfully added trustline for ${currencyInput.trim()}.`,
        });
        setCurrencyInput("");
        setIssuerInput("");
        setAddModalOpen(false);
        setTimeout(() => fetchTrustlines(), 3000);
      } else {
        toast({
          title: "Failed",
          description: result.error || "Transaction was not completed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickAdd = async (token: PopularToken) => {
    setIsAdding(true);
    try {
      const result = await signTrustSet(token.currency, token.issuer);
      if (result.success) {
        toast({
          title: "Trustline Set",
          description: `Successfully added trustline for ${token.name}.`,
        });
        setTimeout(() => fetchTrustlines(), 3000);
      } else {
        toast({
          title: "Failed",
          description: result.error || "Transaction was not completed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTrustline = async (tl: XrplTrustline) => {
    const balance = parseFloat(tl.balance);
    if (Math.abs(balance) > 0) {
      toast({
        title: "Cannot Remove",
        description:
          "Your balance must be zero before removing this trustline. Transfer or trade your tokens first.",
        variant: "destructive",
      });
      return;
    }
    setIsRemoving(tl.issuer + tl.currency);
    try {
      const result = await signTransaction({
        TransactionType: "TrustSet",
        LimitAmount: {
          currency: tl.currency === "RLUSD" ? RLUSD_HEX : tl.currency,
          issuer: tl.issuer,
          value: "0",
        },
        Flags: 0x00020000,
      });
      if (result.success) {
        toast({
          title: "Trustline Removed",
          description: `Removed trustline for ${friendlyTokenName(tl.currency, tl.issuer)}.`,
        });
        setTimeout(() => fetchTrustlines(), 3000);
      } else {
        toast({
          title: "Failed",
          description: result.error || "Transaction was not completed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const handleCopyIssuer = async (issuer: string) => {
    await navigator.clipboard.writeText(issuer);
    setCopiedIssuer(issuer);
    setTimeout(() => setCopiedIssuer(null), 2000);
  };

  const filteredTrustlines = trustlines.filter((tl) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = friendlyTokenName(tl.currency, tl.issuer).toLowerCase();
    return (
      name.includes(q) ||
      tl.currency.toLowerCase().includes(q) ||
      tl.issuer.toLowerCase().includes(q)
    );
  });

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-tokens-title">
            Token Manager
          </h1>
          <p className="text-muted-foreground">
            Manage your XRPL trustlines and token holdings
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect your wallet from the OwnBank Dashboard to manage tokens.
            </p>
          </CardContent>
        </Card>

        <XrplDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-tokens-title">
            Token Manager
          </h1>
          <p className="text-muted-foreground">
            Manage your XRPL trustlines and token holdings
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTrustlines}
            disabled={loading}
            data-testid="button-refresh-trustlines"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setAddModalOpen(true)}
                className="bg-[#00A4E4] text-white border-[#00A4E4]"
                size="sm"
                disabled={isAdding}
                data-testid="button-add-trustline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Trustline
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Like opening a new currency account — you'll sign with your
                wallet to authorize
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Collapsible open={eduOpen} onOpenChange={setEduOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#00A4E4]" />
                Learn: What are Trustlines?
              </CardTitle>
              {eduOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      Old Way
                    </span>
                  </div>
                  <p className="text-sm" data-testid="text-old-way">
                    Open a brokerage account &rarr; fill out forms &rarr; wait
                    days &rarr; get approved to hold Euros/Yen
                  </p>
                </div>
                <div className="rounded-md border border-[#00A4E4]/30 bg-[#00A4E4]/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#00A4E4]" />
                    <span className="text-sm font-semibold text-[#00A4E4]">
                      New Way
                    </span>
                  </div>
                  <p className="text-sm" data-testid="text-new-way">
                    Set a trustline &rarr; sign with your cold wallet &rarr;
                    hold any XRPL token in 4 seconds
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-muted/30 border border-muted p-4">
                <p className="text-sm" data-testid="text-trustline-explainer">
                  <span className="font-semibold">
                    What is a trustline?
                  </span>{" "}
                  A trustline tells the XRPL: "I'm willing to hold this token
                  from this issuer." It's like opening a currency account at a
                  bank — except free, instant, and you own it.
                </p>
              </div>

              <a
                href="https://xrpl.org/trust-lines-and-issuing.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#00A4E4] hover:underline inline-flex items-center gap-1"
                data-testid="link-xrpl-docs-trustlines"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Learn more on XRPL.org
              </a>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base" data-testid="text-popular-tokens-heading">
            Popular Tokens — Quick Add
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_TOKENS.map((token) => {
              const alreadySet = isPopularTokenAlreadySet(token, trustlines);
              return (
                <div
                  key={token.name}
                  className="rounded-md border p-3 space-y-2"
                  data-testid={`card-popular-token-${token.name.replace(/[^a-zA-Z0-9]/g, "-")}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" data-testid={`text-token-name-${token.name.replace(/[^a-zA-Z0-9]/g, "-")}`}>
                      {token.name}
                    </span>
                    {alreadySet ? (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        data-testid={`badge-active-${token.name.replace(/[^a-zA-Z0-9]/g, "-")}`}
                      >
                        Active
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdd(token)}
                        disabled={isAdding}
                        data-testid={`button-quick-add-${token.name.replace(/[^a-zA-Z0-9]/g, "-")}`}
                      >
                        {isAdding ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 mr-1" />
                        )}
                        Add
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid={`text-token-desc-${token.name.replace(/[^a-zA-Z0-9]/g, "-")}`}>
                    {token.description}
                  </p>
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
          <CardTitle className="text-base" data-testid="text-your-trustlines-heading">
            Your Trustlines
            {!loading && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {trustlines.length}
              </Badge>
            )}
          </CardTitle>
          {trustlines.length > 3 && (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm"
                data-testid="input-search-trustlines"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTrustlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Coins className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center" data-testid="text-no-trustlines">
                {searchQuery
                  ? "No trustlines match your search."
                  : "No trustlines found. Add one above to hold tokens on the XRPL."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTrustlines.map((tl) => {
                const name = friendlyTokenName(tl.currency, tl.issuer);
                const balance = parseFloat(tl.balance);
                const canRemove = Math.abs(balance) === 0;
                const removingThis =
                  isRemoving === tl.issuer + tl.currency;

                return (
                  <div
                    key={`${tl.currency}-${tl.issuer}`}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                    data-testid={`row-trustline-${tl.currency}-${tl.issuer.slice(0, 6)}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" data-testid={`text-tl-name-${tl.currency}`}>
                          {name}
                        </span>
                        {tl.freeze && (
                          <Badge variant="destructive" className="text-xs">
                            Frozen
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">
                          {truncateAddress(tl.issuer)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleCopyIssuer(tl.issuer)}
                          data-testid={`button-copy-issuer-${tl.currency}`}
                        >
                          {copiedIssuer === tl.issuer ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold" data-testid={`text-tl-balance-${tl.currency}`}>
                          {balance.toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Limit: {parseFloat(tl.limit).toLocaleString()}
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTrustline(tl)}
                              disabled={!canRemove || removingThis}
                              data-testid={`button-remove-trustline-${tl.currency}`}
                            >
                              {removingThis ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2
                                  className={`h-4 w-4 ${
                                    canRemove
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            {canRemove
                              ? "Like closing an empty account. Only works if your balance is zero."
                              : "Balance must be zero to remove this trustline. Transfer or trade your tokens first."}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <XrplDisclaimer />

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-add-trustline-title">
              Add Trustline
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Currency Code
              </label>
              <Input
                placeholder="e.g. USD, EUR, or hex code"
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value)}
                data-testid="input-currency-code"
              />
              <p className="text-xs text-muted-foreground mt-1">
                3-letter code (USD, EUR) or 40-character hex for non-standard
                tokens.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Issuer Address</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      The issuer is like the bank that created this currency.
                      Verify you trust them before adding.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={issuerInput}
                onChange={(e) => setIssuerInput(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-issuer-address"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The XRPL address of the token issuer. Double-check this is
                correct.
              </p>
            </div>

            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Shield className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs">
                Only add trustlines for tokens from issuers you trust. A
                trustline authorizes your wallet to hold tokens from this
                issuer.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                data-testid="button-cancel-add-trustline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTrustline}
                className="bg-[#00A4E4] text-white border-[#00A4E4]"
                disabled={isAdding}
                data-testid="button-confirm-add-trustline"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Set Trustline
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
