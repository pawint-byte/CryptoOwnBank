import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SeoHead } from "@/components/seo-head";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Repeat,
  Search,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Wallet,
  ShieldCheck,
  Info,
} from "lucide-react";
import {
  tokens,
  COIN_BLURB,
  tokenToChain,
  SYMBOL_CHAIN_ALIASES,
  TROCADOR_NETWORK,
  TROCADOR_STATUS_LABEL,
  TROCADOR_DONE_STATES,
  buildTrocadorUrl,
} from "@/pages/buy-crypto";

type Step = "coin" | "wallet" | "swap";

function fmtPrice(p?: number): string | null {
  if (p == null || isNaN(p)) return null;
  if (p >= 1) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (p >= 0.01) return `$${p.toFixed(3)}`;
  return `$${p.toPrecision(2)}`;
}

export default function SwapAnyPair() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("coin");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [coinSearch, setCoinSearch] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [selectedSavedAddress, setSelectedSavedAddress] = useState("");

  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const { data: prices } = useQuery<Record<string, { usd: number; usd_24h_change: number }>>({
    queryKey: ["/api/public/market-prices"],
  });

  const { data: savedWallets = [] } = useQuery<any[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const filteredCoins = useMemo(() => {
    const q = coinSearch.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    );
  }, [coinSearch]);

  const savedWalletsForToken = useMemo(() => {
    if (!selectedToken) return [] as any[];
    const aliases =
      SYMBOL_CHAIN_ALIASES[selectedToken] ||
      [tokenToChain[selectedToken]].filter(Boolean);
    const seen = new Set<string>();
    const out: any[] = [];
    for (const alias of aliases) {
      for (const w of savedWallets) {
        const addr = (w.address || "").trim();
        if ((w.chain || "").toLowerCase() === alias && addr && !seen.has(addr)) {
          seen.add(addr);
          out.push(w);
        }
      }
    }
    return out;
  }, [selectedToken, savedWallets]);

  useEffect(() => {
    if (savedWalletsForToken.length > 0) {
      setSelectedSavedAddress((prev) =>
        savedWalletsForToken.some((w) => w.address === prev)
          ? prev
          : savedWalletsForToken[0].address,
      );
    } else {
      setSelectedSavedAddress("");
    }
  }, [savedWalletsForToken]);

  const chosenSavedAddress =
    selectedSavedAddress &&
    savedWalletsForToken.some((w) => w.address === selectedSavedAddress)
      ? selectedSavedAddress
      : savedWalletsForToken[0]?.address || "";

  // A non-empty pasted address always wins over a saved selection.
  const effectiveAddress = newAddress.trim() || chosenSavedAddress;

  const sessionValid =
    !!sessionUrl &&
    sessionAddress === effectiveAddress &&
    sessionToken === selectedToken;

  function resetSession() {
    setSessionId(null);
    setSessionUrl(null);
    setSessionAddress(null);
    setSessionToken(null);
  }

  const startSwapMutation = useMutation({
    mutationFn: async (vars: { tickerTo: string; networkTo: string; address: string }) => {
      const res = await apiRequest("POST", "/api/trocador/anonpay-session", vars);
      return (await res.json()) as { id: string; url: string };
    },
    onSuccess: (data, variables) => {
      setSessionId(data.id);
      setSessionUrl(data.url);
      setSessionAddress(variables.address);
      setSessionToken(variables.tickerTo);
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't start the in-site swap",
        description:
          err?.message || "You can still open Trocador in a new tab below — just paste your address there before you send.",
        variant: "destructive",
      });
    },
  });

  const statusQuery = useQuery<{ id: string; status: string }>({
    queryKey: ["/api/trocador/status", sessionId],
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s && TROCADOR_DONE_STATES.has(s)) return false;
      return 15000;
    },
  });

  function handlePickCoin(symbol: string) {
    setSelectedToken(symbol);
    setNewAddress("");
    resetSession();
    setStep("wallet");
  }

  function handleConfirmWallet() {
    if (!effectiveAddress) {
      toast({
        title: "Add your receiving address",
        description: `Tell us the wallet your ${selectedToken} should land in.`,
        variant: "destructive",
      });
      return;
    }
    resetSession();
    setStep("swap");
  }

  function handleStartSwap() {
    if (!effectiveAddress || !selectedToken) return;
    startSwapMutation.mutate({
      tickerTo: selectedToken,
      networkTo: TROCADOR_NETWORK[selectedToken] || "Mainnet",
      address: effectiveAddress,
    });
  }

  function handleBack() {
    if (step === "swap") {
      setStep("wallet");
    } else if (step === "wallet") {
      setSelectedToken(null);
      setStep("coin");
    }
  }

  function handleStartOver() {
    setSelectedToken(null);
    setNewAddress("");
    setCoinSearch("");
    resetSession();
    setStep("coin");
  }

  const stepLabels: { id: Step; label: string }[] = [
    { id: "coin", label: "Coin" },
    { id: "wallet", label: "Your wallet" },
    { id: "swap", label: "Swap" },
  ];
  const stepIndex = stepLabels.findIndex((s) => s.id === step);

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <SeoHead
        title="Swap Any Pair — Stay in Crypto | CryptoOwnBank"
        description="Already own crypto? Move it into almost any coin, on any chain, without cashing out to a bank. Non-custodial swaps that land straight in your own wallet — BTC, Monero, XRP, ETH, and hundreds more pairs."
      />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Repeat className="h-6 w-6 text-green-600" />
          Swap Any Pair
        </h1>
        <p className="text-muted-foreground">
          Already hold some crypto? Stay in the crypto world — move it across the blockchain into
          almost any coin or chain available to you, without ever cashing out to a bank. The coins
          land straight in your own wallet; CryptoOwnBank never touches them.
        </p>
      </div>

      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle>When to use this</AlertTitle>
        <AlertDescription className="text-sm space-y-1">
          <p>
            This covers <strong>every pair we can reach</strong> — including coins our on-chain tools
            can't, like Bitcoin, Monero, Litecoin, and moving between different ecosystems.
          </p>
          <p>
            Swapping <strong>within Ethereum / Polygon / Base / Arbitrum</strong> (e.g. ETH → USDC)?
            Your{" "}
            <Link href="/ownbank/evm-swap" className="underline hover:text-foreground">
              EVM Swap
            </Link>{" "}
            and{" "}
            <Link href="/ownbank/cross-chain" className="underline hover:text-foreground">
              Cross-Chain Swap
            </Link>{" "}
            usually give a tighter rate and keep the trade fully on-chain. Use those there; use this
            for everything else.
          </p>
        </AlertDescription>
      </Alert>

      {/* Step badges */}
      <div className="flex items-center gap-2 text-xs">
        {stepLabels.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <Badge
              variant={i <= stepIndex ? "default" : "outline"}
              className={i <= stepIndex ? "bg-green-600" : ""}
              data-testid={`badge-step-${s.id}`}
            >
              {i + 1}. {s.label}
            </Badge>
            {i < stepLabels.length - 1 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {step !== "coin" && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleStartOver} data-testid="button-start-over">
            Start over
          </Button>
        </div>
      )}

      {/* Step 1: pick the coin to receive */}
      {step === "coin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Which coin do you want to receive?</CardTitle>
            <CardDescription>Pick the coin you want to end up with. You'll choose what to send next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={coinSearch}
                onChange={(e) => setCoinSearch(e.target.value)}
                placeholder="Search coins…"
                className="pl-9"
                data-testid="input-coin-search"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCoins.map((token) => {
                const price = fmtPrice(prices?.[token.symbol]?.usd);
                return (
                  <button
                    key={token.symbol}
                    onClick={() => handlePickCoin(token.symbol)}
                    className="rounded-lg border p-3 text-left hover:border-green-500 transition-colors"
                    data-testid={`button-coin-${token.symbol}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: token.color }}
                      />
                      <span className="font-semibold">{token.symbol}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{token.name}</p>
                    {price && <p className="text-xs mt-1" data-testid={`text-price-${token.symbol}`}>{price}</p>}
                  </button>
                );
              })}
            </div>
            {filteredCoins.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matches. You can still open the full Trocador list in a new tab from the swap step.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: confirm receiving wallet */}
      {step === "wallet" && selectedToken && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Where should your {selectedToken} land?
            </CardTitle>
            <CardDescription>
              This must be your own {selectedToken} wallet address. The swapped coins go straight here —
              double-check it's correct, because crypto transfers can't be reversed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {COIN_BLURB[selectedToken] && (
              <p className="text-sm text-muted-foreground">{COIN_BLURB[selectedToken]}</p>
            )}

            {savedWalletsForToken.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Your saved {selectedToken} addresses</p>
                {savedWalletsForToken.map((w) => (
                  <button
                    key={w.address}
                    onClick={() => {
                      setSelectedSavedAddress(w.address);
                      setNewAddress("");
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedSavedAddress === w.address && !newAddress
                        ? "border-green-500 bg-green-500/5"
                        : "hover:border-green-500"
                    }`}
                    data-testid={`button-saved-wallet-${w.address}`}
                  >
                    <p className="text-sm font-medium">{w.label || `${selectedToken} wallet`}</p>
                    <p className="font-mono text-xs break-all text-muted-foreground">{w.address}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {savedWalletsForToken.length > 0 ? "Or paste a different address" : `Paste your ${selectedToken} address`}
              </p>
              <Input
                value={newAddress}
                onChange={(e) => {
                  setNewAddress(e.target.value);
                  if (e.target.value.trim()) setSelectedSavedAddress("");
                }}
                placeholder={`Your ${selectedToken} receiving address`}
                className="font-mono text-sm"
                data-testid="input-new-address"
              />
              {(selectedToken === "XRP" || selectedToken === "XLM") && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  If your wallet shows a destination tag / memo, you'll add it on the swap screen too.
                </p>
              )}
            </div>

            {!user && (
              <p className="text-xs text-muted-foreground">
                Not logged in? That's fine — paste any address you control and the swap still works.
                Logging in lets us remember your wallets for next time.
              </p>
            )}

            <Button
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleConfirmWallet}
              disabled={!effectiveAddress}
              data-testid="button-confirm-wallet"
            >
              Continue to swap
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: in-site swap */}
      {step === "swap" && selectedToken && (
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Repeat className="h-5 w-5 text-green-600" />
              Swap into {selectedToken}
            </CardTitle>
            <CardDescription>
              Trocador shops dozens of swap services and picks the best rate. You pick the coin you're
              sending; the swapped {selectedToken} lands in your wallet below. Most swaps need no
              account. The coins never pass through CryptoOwnBank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground mb-1">Your {selectedToken} lands here — your own wallet:</p>
                <p className="font-mono break-all" data-testid="text-receiving-address">{effectiveAddress}</p>
              </div>
            </div>

            {!sessionValid && (
              <>
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  onClick={handleStartSwap}
                  disabled={startSwapMutation.isPending || !effectiveAddress}
                  data-testid="button-start-swap"
                >
                  {startSwapMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Starting your swap…</>
                  ) : (
                    <><Repeat className="h-4 w-4" /> Swap into {selectedToken} here</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  The swap runs right here on this page, with your {selectedToken} address already filled in.
                </p>
              </>
            )}

            {sessionValid && sessionUrl && (
              <div className="space-y-3">
                {statusQuery.data?.status && (
                  <div
                    className="rounded-lg border bg-muted/40 p-3 text-sm flex items-center gap-2"
                    data-testid="status-swap"
                  >
                    {!TROCADOR_DONE_STATES.has(statusQuery.data.status) && (
                      <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                    )}
                    <span>{TROCADOR_STATUS_LABEL[statusQuery.data.status] || statusQuery.data.status}</span>
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border">
                  <iframe
                    src={sessionUrl}
                    title={`Swap into ${selectedToken} via Trocador`}
                    className="w-full"
                    style={{ height: 640 }}
                    allow="clipboard-write"
                    data-testid="iframe-swap"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a href={sessionUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full gap-2" data-testid="button-swap-newtab">
                      <ExternalLink className="h-4 w-4" /> Open in a new tab
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    className="flex-1 gap-2"
                    onClick={resetSession}
                    data-testid="button-swap-restart"
                  >
                    <Repeat className="h-4 w-4" /> Start a new swap
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Prefer the full Trocador site?{" "}
              <a
                href={buildTrocadorUrl({ token: selectedToken })}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
                data-testid="link-trocador-full"
              >
                Open it in a new tab
              </a>
              {" "}— just paste your {selectedToken} address there yourself before you send.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
