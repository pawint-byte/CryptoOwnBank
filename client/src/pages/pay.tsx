import { useState, useEffect } from "react";
import { RLUSD } from "@/lib/constants";
import { SeoHead } from "@/components/seo-head";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  Copy,
  QrCode,
  ExternalLink,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function textToHex(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export default function PayPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [xamanLoading, setXamanLoading] = useState(false);
  const [showNeedCrypto, setShowNeedCrypto] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const to = params.get("to") || "";
  const amount = params.get("amount") || "";
  const currency = params.get("currency") || "XRP";
  const memo = params.get("memo") || "";
  const tag = params.get("tag") || "";
  const senderName = params.get("from") || "";
  const senderLogo = params.get("logo") || "";
  const invoiceRef = params.get("ref") || "";

  const isXrpl = currency.toUpperCase() === "XRP" || currency.toUpperCase() === "RLUSD";
  const isRlusd = currency.toUpperCase() === "RLUSD";

  const RLUSD_ISSUER = RLUSD.issuer;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, description: text });
  };

  const handleXamanPay = async () => {
    if (!to || !amount) return;
    setXamanLoading(true);
    try {
      const txJson: any = {
        TransactionType: "Payment",
        Destination: to,
      };

      if (isRlusd) {
        txJson.Amount = {
          currency: "RLUSD",
          value: amount,
          issuer: RLUSD_ISSUER,
        };
      } else {
        txJson.Amount = String(Math.round(parseFloat(amount) * 1_000_000));
      }

      if (tag) {
        txJson.DestinationTag = parseInt(tag);
      }

      if (memo) {
        txJson.Memos = [
          {
            Memo: {
              MemoType: textToHex("text/plain"),
              MemoData: textToHex(memo),
            },
          },
        ];
      }

      const res = await fetch("/api/xumm/payload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txJson),
      });

      if (!res.ok) {
        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
        if (isMobile) {
          const deepLink = `xumm://xumm.app/detect/request:${to}?amount=${amount}${tag ? `&dt=${tag}` : ""}`;
          window.location.href = deepLink;
        } else {
          toast({
            title: "Xaman not available",
            description: "Use the QR code or manual send option below.",
            variant: "destructive",
          });
        }
        return;
      }

      const data = await res.json();
      if (data.deepLink || data.qrUrl) {
        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
        if (isMobile && data.deepLink) {
          window.location.href = data.deepLink;
        } else if (data.qrUrl) {
          const popup = window.open("", "xaman", "width=420,height=520,scrollbars=no");
          if (popup) {
            popup.document.write(`
              <html><head><title>Scan with Xaman</title>
              <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fa;font-family:-apple-system,sans-serif;}
              .wrap{text-align:center;padding:24px;}img{width:280px;height:280px;border-radius:12px;}
              p{margin-top:16px;color:#666;font-size:14px;}
              </style></head><body><div class="wrap">
              <img src="${data.qrUrl}" alt="Scan with Xaman" />
              <p>Scan this QR code with your Xaman wallet</p>
              </div></body></html>
            `);
          }
        }
      }
    } catch (err) {
      console.error("Xaman pay error:", err);
      toast({
        title: "Payment error",
        description: "Could not create payment request. Try QR code or manual send.",
        variant: "destructive",
      });
    } finally {
      setXamanLoading(false);
    }
  };

  const qrData = isXrpl
    ? `https://xrpl.to/?to=${to}${tag ? `&dt=${tag}` : ""}&amount=${amount}${isRlusd ? "&currency=RLUSD" : ""}`
    : to;

  if (!to) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold" data-testid="text-pay-error">Invalid Payment Link</h2>
            <p className="text-sm text-muted-foreground">
              This payment link is missing a destination address. Please check the link and try again.
            </p>
            <a href="/" className="inline-block">
              <Button variant="outline" data-testid="link-pay-home">Go to CryptoOwnBank</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <SeoHead
        title="Pay — CryptoOwnBank | Send Crypto Payments"
        description="Send and receive crypto payments on XRPL. Fast, low-cost wallet-to-wallet transfers with QR codes and payment links."
        path="/pay"
      />
      <div className="max-w-md w-full space-y-4">
        <div className="text-center space-y-3">
          {senderLogo && (
            <div className="flex justify-center">
              <img
                src={senderLogo}
                alt={senderName || "Sender"}
                className="h-12 w-12 rounded-xl object-contain border bg-white shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                data-testid="img-sender-logo"
              />
            </div>
          )}
          {senderName && (
            <p className="text-sm font-semibold text-foreground" data-testid="text-sender-name">{senderName}</p>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium" data-testid="badge-powered-xrpl">
            <Shield className="h-3 w-3" />
            Powered by XRPL
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-pay-title">
            Payment Request
          </h1>
          {invoiceRef && (
            <p className="text-xs font-mono text-muted-foreground" data-testid="text-invoice-ref">Ref: {invoiceRef}</p>
          )}
          {memo && (
            <p className="text-sm text-muted-foreground" data-testid="text-pay-memo">{memo}</p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-1">
              {amount && (
                <div className="text-3xl font-bold" data-testid="text-pay-amount">
                  {amount} <span className="text-xl text-muted-foreground">{currency.toUpperCase()}</span>
                </div>
              )}
              {!amount && (
                <div className="text-lg text-muted-foreground" data-testid="text-pay-open-amount">
                  Open amount — send any amount
                </div>
              )}
            </div>

            <Separator />

            {isXrpl && (
              <div className="rounded-lg border-2 border-[#00A4E4]/40 bg-[#00A4E4]/5 p-4 space-y-3" data-testid="option-xaman-pay">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet className="h-4 w-4 text-[#00A4E4]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">Pay with Xaman</span>
                      <Badge className="bg-[#00A4E4] text-[10px] px-1.5 py-0">Easiest</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Opens your Xaman wallet with everything pre-filled. Just approve — one tap, done.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#00A4E4] hover:bg-[#0090c9] text-white h-11"
                  onClick={handleXamanPay}
                  disabled={xamanLoading || !amount}
                  data-testid="button-pay-xaman"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Open Xaman & Pay
                </Button>
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-3" data-testid="option-qr-pay">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold block mb-0.5">Scan QR Code</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isXrpl
                      ? "Scan with Xaman or any XRPL wallet. Payment details are embedded in the code."
                      : "Scan to get the address, then send the exact amount shown below."
                    }
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="p-3 rounded-lg border bg-white" data-testid="qr-pay-container">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                    alt="Payment QR Code"
                    className="w-44 h-44"
                    data-testid="img-pay-qr"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3" data-testid="option-manual-pay">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold block mb-0.5">Send Manually</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Copy the details below and send from any wallet or exchange.
                    {tag ? " Include the destination tag — without it, the payment can't be matched." : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-0.5">To address</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-background rounded px-2 py-1 flex-1 break-all" data-testid="text-pay-address">
                      {to}
                    </code>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => copyToClipboard(to, "Address")} data-testid="button-copy-pay-address">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {tag && (
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-0.5">
                      <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
                      Destination Tag (required)
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded px-2 py-1" data-testid="text-pay-tag">
                        {tag}
                      </code>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(tag, "Destination tag")} data-testid="button-copy-pay-tag">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {amount && (
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-0.5">Amount</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-background rounded px-2 py-1" data-testid="text-pay-manual-amount">
                        {amount} {currency.toUpperCase()}
                      </code>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(amount, "Amount")} data-testid="button-copy-pay-amount">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-card border">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] text-muted-foreground leading-tight">4-second settlement</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-card border">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground leading-tight">Non-custodial</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-card border">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-[10px] text-muted-foreground leading-tight">Near-zero fees</span>
          </div>
        </div>

        <Card className="border-dashed">
          <button
            className="w-full text-left p-4 flex items-center justify-between"
            onClick={() => setShowNeedCrypto(!showNeedCrypto)}
            data-testid="button-need-crypto-toggle"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Don't have crypto yet?</span>
            </div>
            {showNeedCrypto ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showNeedCrypto && (
            <CardContent className="pt-0 space-y-3">
              <p className="text-sm text-muted-foreground">
                Get a wallet, buy some crypto, and you're ready to pay. It takes about 5 minutes to set up.
              </p>
              <div className="space-y-2">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-semibold">Fastest: Buy with your card</p>
                  <p className="text-xs text-muted-foreground">
                    Download <a href="https://xaman.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xaman</a> (for XRP) or{" "}
                    <a href="https://lobstr.co" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LOBSTR</a> (for XLM) — both have a built-in buy button that takes card or Apple/Google Pay. Buy, then come back here to pay.
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-semibold">Most flexible: Use gift cards, cash, or mobile money</p>
                  <p className="text-xs text-muted-foreground">
                    <a href="https://noones.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">NoOnes</a> (global, excluding US) or <a href="https://bybarter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ByBarter</a> — buy crypto with gift cards, cash deposits, M-Pesa, and more. No bank account or exchange needed.
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-semibold">India & Southeast Asia</p>
                  <p className="text-xs text-muted-foreground">
                    <a href="https://onramp.money" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Onramp.money</a> — buy with UPI, IMPS, or local bank transfer. <a href="https://digitap.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Digitap</a> — QR-based buying across emerging markets.
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-semibold">Telegram users</p>
                  <p className="text-xs text-muted-foreground">
                    Open <a href="https://t.me/wallet" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@wallet</a> in Telegram — buy USDT with Apple Pay, Google Pay, or card in seconds. Then send to your wallet and pay.
                  </p>
                </div>
              </div>
              <a href="/buy-crypto" target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full gap-2 text-sm" data-testid="button-go-buy-crypto">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Full Guide: How to Get Crypto
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Button>
              </a>
              <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-green-700 dark:text-green-400">Pro tip:</strong> After you buy, sign up at{" "}
                  <a href="/" className="text-green-600 hover:underline font-semibold">CryptoOwnBank</a> and add your wallet address.
                  We'll track your balances automatically and you'll have access to DEX trading, DCA orders, cross-chain swaps, yield tools, and more — all from one dashboard.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="text-center space-y-2 pt-2">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pay-home">
            {senderName ? (
              <>{senderName} <span className="text-muted-foreground/60">via</span> <span className="font-semibold">CryptoOwnBank</span></>
            ) : (
              <>Powered by <span className="font-semibold">CryptoOwnBank</span></>
            )}
          </a>
          <p className="text-[10px] text-muted-foreground/60">
            Non-custodial. We never hold your funds. Payments settle directly on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}
