import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Eye, Users, CheckCircle, XCircle, Clock, AlertTriangle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { FeatureAnnouncement } from "@shared/schema";

type AnnouncementDraft = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  audienceTier: string;
};

const SAVED_DRAFTS: AnnouncementDraft[] = [
  {
    title: "Introducing the Legacy Plan — Protect Your Crypto for Your Family",
    description: "Your crypto shouldn't disappear if something happens to you. Our new Legacy Plan is a dead-man switch that automatically delivers your wallet recovery instructions to the people you trust.\n\n• Set your check-in schedule (weekly, biweekly, monthly, or quarterly)\n• Add multiple beneficiaries with wallet-specific recovery instructions\n• Split delivery mode — split instructions across beneficiaries so they must collaborate\n• Annual review reminders to keep your plan current\n• Works with CypheRock, Ledger, Trezor, Xaman, Tangem, and more\n\nCompetitors charge $40–$250/year for crypto inheritance alone. Get it as a $9.99/mo add-on, or free with Pro.",
    ctaLabel: "Set Up Your Legacy Plan",
    ctaUrl: "https://cryptoownbank.com/legacy-plan",
    audienceTier: "all",
  },
  {
    title: "New: Split Delivery & Annual Review for Legacy Plans",
    description: "Two powerful upgrades to your Legacy Plan:\n\n🔒 Split Delivery — Split your wallet recovery instructions across multiple beneficiaries. No single person gets everything — they must collaborate to recover your wallet. Perfect for high-value cold wallets.\n\n📋 Annual Review — A yearly attestation that your plan is still accurate. Life changes (divorce, new family members, moved safes) can make your plan outdated. We'll remind you when it's time to review.\n\nBoth features are available now in your Legacy Plan dashboard.",
    ctaLabel: "Review Your Legacy Plan",
    ctaUrl: "https://cryptoownbank.com/legacy-plan",
    audienceTier: "all",
  },
  {
    title: "XRPL DEX Trading & DCA Orders Now Live",
    description: "Trade directly on the XRP Ledger DEX and set up recurring dollar-cost averaging — all non-custodial, all through your Xaman wallet.\n\n• Quick Swap for instant trades across 14+ pairs\n• Advanced order book with limit orders\n• DCA Orders — automated recurring buys (daily, weekly, biweekly, monthly, quarterly)\n• Each DCA execution creates a pending transaction for you to approve in Xaman\n• Full trade history and confirmation emails\n\nYour keys, your trades, your schedule.",
    ctaLabel: "Start Trading",
    ctaUrl: "https://cryptoownbank.com/ownbank/dex",
    audienceTier: "all",
  },
  {
    title: "Stellar Network Integration — Send, Trade, and Manage XLM",
    description: "CryptoOwnBank now supports the Stellar network alongside XRPL. Connect your Stellar wallet and access:\n\n• Stellar Wallet Dashboard — XLM + token balances, reserve display\n• Send & Receive with contacts, QR codes, and payment URIs\n• Token Manager — add/remove trustlines for popular Stellar tokens\n• DEX Trading — Quick Swap and Order Book for 8+ Stellar pairs\n• DCA Orders — recurring buys on the Stellar DEX\n• Invoices — create payment requests with shareable links\n• Remittance Calculator — compare cross-border corridors\n\nTwo chains, one dashboard. Non-custodial.",
    ctaLabel: "Connect Your Stellar Wallet",
    ctaUrl: "https://cryptoownbank.com/stellar/wallet",
    audienceTier: "all",
  },
  {
    title: "Whale Alerts, Technical Analysis & Price Alerts",
    description: "Stay ahead of the market with real-time intelligence:\n\n🐋 Whale Alerts — Live monitoring of large XRP (≥1M) and RLUSD (≥500K) transactions on the XRP Ledger. See the big moves as they happen.\n\n📊 Technical Analysis — Interactive price charts with SMA, EMA, RSI, MACD, and Bollinger Bands for 21 assets.\n\n🔔 Price Alerts — Set custom alerts for any tracked asset. Get notified by email when prices cross your targets.\n\nAll available now from your dashboard.",
    ctaLabel: "Explore Market Tools",
    ctaUrl: "https://cryptoownbank.com/whale-alerts",
    audienceTier: "all",
  },
  {
    title: "XLS-66 Native Lending Is Coming to XRPL — Get Ready Now",
    description: "Two new amendments — XLS-65 (Single Asset Vaults) and XLS-66 (Lending Protocol) — are being voted on by XRPL validators right now. When they reach 80% consensus for 2 consecutive weeks, non-custodial lending vaults go live directly on the XRP Ledger.\n\nWhat this means for you:\n\n🏦 Deposit XRP or RLUSD into on-ledger vaults and earn yield — your tokens never leave your wallet\n🔐 Non-custodial — no exchange, no middleman, no counterparty risk\n📊 CryptoOwnBank tracks validator voting in real-time so you know exactly when it activates\n\nWe've built an \"Are You Ready for XLS-66?\" checklist to help you prepare:\n\n✅ Connect your XRP wallet\n✅ Link Xaman for transaction signing\n✅ Set up RLUSD trustlines (for RLUSD vaults)\n✅ Use the yield calculator to model different scenarios\n\nDo the homework now so you're ready the moment vaults go live. Pro members get first access to all XLS-66 features.\n\nThis is where everything starts — own your crypto, earn yield, and never hand your keys to anyone.",
    ctaLabel: "Check Your XLS-66 Readiness",
    ctaUrl: "https://cryptoownbank.com/xls66-lending",
    audienceTier: "all",
  },
  {
    title: "XLS-66 Validator Update — Here's Where We Stand",
    description: "Quick update on the XLS-66 amendment vote:\n\nXLS-65 (Single Asset Vaults) and XLS-66 (Lending Protocol) are both in the validator voting phase. You can track live progress directly on the XLS-66 page — we pull data straight from the XRPL every 10 minutes.\n\nWhat to do while we wait:\n\n📋 Complete your readiness checklist — make sure your wallet, Xaman, and trustlines are set up\n🧮 Try the yield calculator — model potential earnings at different APR rates\n📖 Read \"What is XLS-66 & How Does It Work?\" on the lending page\n\nWhen validators hit 80% for 2 consecutive weeks on rippled 3.1.0+, the feature activates automatically — and CryptoOwnBank will be ready from day one.\n\nNo action required on your end other than being prepared. We'll notify you the moment it goes live.",
    ctaLabel: "Track Validator Progress",
    ctaUrl: "https://cryptoownbank.com/xls66-lending",
    audienceTier: "all",
  },
];

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [audienceTier, setAudienceTier] = useState("all");
  const [confirmSend, setConfirmSend] = useState(false);
  const [showDrafts, setShowDrafts] = useState(true);

  const { data: announcements = [], isLoading } = useQuery<FeatureAnnouncement[]>({
    queryKey: ["/api/admin/announcements"],
  });

  const { data: audienceData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/announcements/audience-count", audienceTier],
    queryFn: () => fetch(`/api/admin/announcements/audience-count?tier=${audienceTier}`, { credentials: "include" }).then(r => r.json()),
  });

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/announcements/send", {
      title, description, ctaLabel, ctaUrl, audienceTier,
    }),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({
        title: "Announcement sent",
        description: `${data.sent} of ${data.total} emails delivered successfully.`,
      });
      setTitle("");
      setDescription("");
      setCtaLabel("");
      setCtaUrl("");
      setConfirmSend(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: (err: Error) => {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
      setConfirmSend(false);
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/announcements/preview", {
      title, description, ctaLabel, ctaUrl,
    }),
    onSuccess: () => {
      toast({ title: "Preview sent", description: "Check your inbox for the preview email." });
    },
    onError: (err: Error) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const canSend = title.trim() && description.trim();

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Feature Announcements</h1>
          <p className="text-muted-foreground">Compose and send branded product announcements to your users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowDrafts(!showDrafts)}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ready-to-Send Drafts
                  </CardTitle>
                  <CardDescription>{SAVED_DRAFTS.length} pre-written announcements — click one to load it</CardDescription>
                </div>
                {showDrafts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {showDrafts && (
              <CardContent className="space-y-2">
                {SAVED_DRAFTS.map((draft, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setTitle(draft.title);
                      setDescription(draft.description);
                      setCtaLabel(draft.ctaLabel);
                      setCtaUrl(draft.ctaUrl);
                      setAudienceTier(draft.audienceTier);
                      setConfirmSend(false);
                      toast({ title: "Draft loaded", description: "Review the content below, then preview or send." });
                    }}
                    data-testid={`draft-${i}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{draft.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{draft.description.split("\n")[0]}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{draft.audienceTier}</Badge>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compose Announcement</CardTitle>
              <CardDescription>Write your announcement or load a draft above. Users who unsubscribed won't receive it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  data-testid="input-announcement-title"
                  placeholder="e.g. Introducing Split Delivery for Legacy Plans"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-desc">Description</Label>
                <Textarea
                  id="ann-desc"
                  data-testid="input-announcement-description"
                  placeholder="Describe the feature, update, or news. HTML is supported for the email body."
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ann-cta-label">CTA Button Label (optional)</Label>
                  <Input
                    id="ann-cta-label"
                    data-testid="input-cta-label"
                    placeholder="e.g. Try It Now"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ann-cta-url">CTA Button URL (optional)</Label>
                  <Input
                    id="ann-cta-url"
                    data-testid="input-cta-url"
                    placeholder="e.g. https://cryptoownbank.com/legacy-plan"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audienceTier} onValueChange={setAudienceTier}>
                  <SelectTrigger data-testid="select-audience-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="premium">Premium & Pro</SelectItem>
                    <SelectItem value="pro">Pro Only</SelectItem>
                  </SelectContent>
                </Select>
                {audienceData && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {audienceData.count} eligible recipient{audienceData.count !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  data-testid="button-preview"
                  disabled={!canSend || previewMutation.isPending}
                  onClick={() => previewMutation.mutate()}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMutation.isPending ? "Sending preview..." : "Send Preview to Me"}
                </Button>

                {!confirmSend ? (
                  <Button
                    data-testid="button-send"
                    disabled={!canSend}
                    onClick={() => setConfirmSend(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to {audienceData?.count ?? "..."} Users
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Are you sure?
                    </span>
                    <Button
                      variant="destructive"
                      data-testid="button-confirm-send"
                      disabled={sendMutation.isPending}
                      onClick={() => sendMutation.mutate()}
                    >
                      {sendMutation.isPending ? "Sending..." : `Yes, Send to ${audienceData?.count ?? "..."} Users`}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmSend(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border bg-card p-4 space-y-3"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}
              >
                <div className="text-center text-xs font-bold tracking-wider text-[#00A4E4]">
                  CRYPTOOWNBANK
                </div>
                <Separator />
                <h3 className="font-semibold text-base" data-testid="text-preview-title">
                  {title || "Your Title Here"}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-preview-description">
                  {description || "Your description will appear here..."}
                </p>
                {(ctaLabel || ctaUrl) && (
                  <div className="pt-2">
                    <div
                      className="inline-block px-4 py-2 rounded-md text-sm font-medium text-white"
                      style={{ backgroundColor: "#00A4E4" }}
                    >
                      {ctaLabel || "Learn More"}
                    </div>
                  </div>
                )}
                <Separator />
                <p className="text-[10px] text-muted-foreground text-center">
                  Audience: {audienceTier === "all" ? "All users" : audienceTier === "premium" ? "Premium & Pro" : "Pro only"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Send History</CardTitle>
              <CardDescription>{announcements.length} announcement{announcements.length !== 1 ? "s" : ""} sent</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No announcements sent yet.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="rounded-md border p-3 space-y-1.5" data-testid={`card-announcement-${ann.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight">{ann.title}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {ann.audienceTier}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ann.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {ann.totalSent}
                        </span>
                        {(ann.totalFailed ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            {ann.totalFailed}
                          </span>
                        )}
                        <span>of {ann.totalRecipients}</span>
                        <span className="ml-auto">
                          {ann.sentAt ? new Date(ann.sentAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
