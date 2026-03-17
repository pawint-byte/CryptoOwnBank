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
import { Mail, Send, Eye, Users, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { FeatureAnnouncement } from "@shared/schema";

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [audienceTier, setAudienceTier] = useState("all");
  const [confirmSend, setConfirmSend] = useState(false);

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
            <CardHeader>
              <CardTitle className="text-lg">Compose Announcement</CardTitle>
              <CardDescription>Write your announcement. Users who unsubscribed won't receive it.</CardDescription>
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
