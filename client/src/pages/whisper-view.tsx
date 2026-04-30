import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Coins,
  Lock,
  Eye,
  Sparkles,
  Quote,
  Wallet,
  AlertTriangle,
  CircleAlert,
  ShieldCheck,
} from "lucide-react";

interface WhisperPayload {
  assetSymbol: string;
  quantity: number;
  currentPrice: number;
  value: number;
  priceSource: "live" | "stored";
  priceUpdatedAt: string | null;
  recipientName: string | null;
  personalNote: string | null;
  showAddress: boolean;
  walletAddress: string | null;
  senderName: string;
  createdAt: string;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n < 1 && n > 0 ? 4 : 2,
    maximumFractionDigits: n < 1 && n > 0 ? 6 : 2,
  });

const fmtQty = (n: number) => {
  if (n === 0) return "0";
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 8 });
};

export default function WhisperView() {
  const [, params] = useRoute("/v/:token");
  const token = params?.token || "";
  const [data, setData] = useState<WhisperPayload | null>(null);
  const [error, setError] = useState<"not_found" | "revoked" | "failed" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("not_found");
      setLoading(false);
      return;
    }
    fetch(`/api/whispers/public/${token}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("not_found");
        if (res.status === 410) throw new Error("revoked");
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((d: WhisperPayload) => setData(d))
      .catch((e: Error) => {
        const msg = e.message as "not_found" | "revoked" | "failed";
        setError(msg === "not_found" || msg === "revoked" ? msg : "failed");
      })
      .finally(() => setLoading(false));
  }, [token]);

  // SEO title
  useEffect(() => {
    if (data) {
      document.title = `${data.senderName} shared their ${data.assetSymbol} balance — CryptoOwnBank`;
    } else {
      document.title = "Whisper — CryptoOwnBank";
    }
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const isRevoked = error === "revoked";
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              {isRevoked ? (
                <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <h1 className="text-2xl font-semibold" data-testid="text-whisper-error-title">
              {isRevoked ? "This Whisper has been turned off" : "Whisper not found"}
            </h1>
            <p className="text-muted-foreground" data-testid="text-whisper-error-body">
              {isRevoked
                ? "The owner has revoked this share link. You'll need to ask them for a fresh one."
                : "The link you followed is invalid or no longer exists."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/">
                <Button variant="outline" data-testid="link-home">Go to CryptoOwnBank</Button>
              </Link>
              <Link href="/signup">
                <Button data-testid="link-signup">Create your own portfolio</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const greeting = data.recipientName
    ? `Hey ${data.recipientName},`
    : "A note from the owner";

  const priceFresh =
    data.priceUpdatedAt &&
    Date.now() - new Date(data.priceUpdatedAt).getTime() < 1000 * 60 * 60;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        {/* Brand bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
            data-testid="link-brand"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            CryptoOwnBank
          </Link>
          <Badge variant="outline" className="gap-1.5">
            <Eye className="w-3 h-3" /> Whisper
          </Badge>
        </div>

        {/* Main card */}
        <Card className="overflow-hidden border-2">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b">
            <p className="text-sm text-muted-foreground mb-1" data-testid="text-owner-line">
              <span className="font-semibold text-foreground">{data.senderName}</span>{" "}
              shared a snapshot of one asset with you
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-asset-symbol">
              {data.assetSymbol}
            </h1>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Holdings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Balance</div>
                <div className="text-2xl font-semibold tabular-nums" data-testid="text-balance">
                  {fmtQty(data.quantity)}{" "}
                  <span className="text-base text-muted-foreground font-normal">{data.assetSymbol}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Value</div>
                <div className="text-2xl font-semibold tabular-nums" data-testid="text-value">
                  {fmtUsd(data.value)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5" data-testid="text-price">
                  @ {fmtUsd(data.currentPrice)}
                  {data.priceSource === "live" && priceFresh && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">live</span>
                  )}
                </div>
              </div>
            </div>

            {data.showAddress && data.walletAddress && (
              <>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Wallet className="w-3 h-3" /> Wallet address
                  </div>
                  <code
                    className="block text-xs sm:text-sm font-mono bg-muted/60 rounded-md px-3 py-2 break-all"
                    data-testid="text-wallet-address"
                  >
                    {data.walletAddress}
                  </code>
                </div>
              </>
            )}

            {data.personalNote && (
              <>
                <Separator />
                <div className="bg-muted/40 rounded-lg p-4 sm:p-5 border-l-4 border-primary">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    <Quote className="w-3 h-3" /> {greeting}
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed" data-testid="text-personal-note">
                    {data.personalNote}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Trust strip */}
            <div className="flex items-start gap-3 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <p>
                This page shows <strong>only</strong> what {data.senderName} chose to share — one asset, no
                login required, no other balances or accounts revealed. The owner can revoke this link at any time.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="mt-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-start gap-3 mb-4">
              <Coins className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold mb-1" data-testid="text-cta-title">
                  Want a private dashboard like this?
                </h2>
                <p className="text-sm text-muted-foreground">
                  CryptoOwnBank is a non-custodial, multi-chain portfolio. Track everything you hold across
                  wallets, exchanges, and chains — and share specific assets with people you trust, on your terms.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-signup">
                  Create your free account
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-cta-learn">
                  See how it works
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footnote */}
        <p className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-1.5">
          <CircleAlert className="w-3 h-3" />
          We never see this link's contents — figures are fetched live from public chains and the owner's settings.
        </p>
      </div>
    </div>
  );
}
