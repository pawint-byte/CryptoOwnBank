import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  HeartHandshake,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  UserPlus,
  Crown,
  Lock,
  Info,
  RefreshCw,
  Edit,
  XCircle,
  Split,
  Users,
  CalendarCheck,
  ClipboardCheck,
  Mail,
} from "lucide-react";

type LegacyPlanData = {
  plan: {
    id: string;
    userId: string;
    status: string;
    checkInFrequency: string;
    gracePeriodDays: number;
    lastCheckIn: string | null;
    nextCheckInDue: string | null;
    graceStartedAt: string | null;
    secondaryContactName: string | null;
    secondaryContactEmail: string | null;
    secondaryContactVerified: boolean | null;
    personalMessage: string | null;
    splitDeliveryEnabled: boolean | null;
    splitDeliveryMode: string | null;
    splitDeliveryThreshold: number | null;
    lastAnnualReview: string | null;
    nextAnnualReviewDue: string | null;
    annualReviewCount: number | null;
    createdAt: string;
    updatedAt: string;
  };
  beneficiaries: Array<{
    id: string;
    legacyPlanId: string;
    name: string;
    email: string;
    relationship: string | null;
    walletType: string | null;
    deviceInstructions: string | null;
    seedPhraseInstructions: string | null;
    additionalNotes: string | null;
    splitPieces: string | null;
    createdAt: string;
  }>;
  checkIns: Array<{
    id: string;
    legacyPlanId: string;
    checkedInAt: string;
  }>;
};

function ProGate() {
  const { toast } = useToast();
  const buyAddon = useMutation({
    mutationFn: () => apiRequest("POST", "/api/addons/stripe-checkout", { addonKey: "legacy-plan" }),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    },
    onError: () => toast({ title: "Error", description: "Failed to start checkout", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6" data-testid="legacy-pro-gate">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
        <Crown className="h-10 w-10 text-white" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Legacy Plan</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Member for Life — your crypto doesn't die with you.
        </p>
      </div>

      <ul className="space-y-2 text-sm text-muted-foreground max-w-lg text-left">
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> Dead-man switch with configurable check-in schedule</li>
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> Encrypted beneficiary instructions — no seed phrases stored</li>
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> Grace period with secondary contact verification</li>
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> Wallet-specific recovery guidance (CypheRock, Ledger, Xaman, etc.)</li>
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> Member for Life — plan stays active as long as your subscription</li>
      </ul>

      <div className="grid gap-4 md:grid-cols-2 max-w-2xl w-full">
        <Card className="border-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Add-On</CardTitle>
            <CardDescription>Add to any tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$9.99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">Legacy Plan only — add it to Free or Premium</p>
            <Button className="w-full" onClick={() => buyAddon.mutate()} disabled={buyAddon.isPending} data-testid="button-buy-addon">
              {buyAddon.isPending ? "Loading..." : "Add Legacy Plan"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-500 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-amber-500 text-white">Best Value</Badge>
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Upgrade to Pro</CardTitle>
            <CardDescription>Legacy Plan + everything else</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">Legacy Plan included free, plus DeFi Borrowing, XLS-66 Lending, batch payments, team seats & more</p>
            <Button className="w-full bg-amber-500 hover:bg-amber-600" asChild>
              <a href="/settings" data-testid="link-upgrade-pro">Go Pro</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground max-w-md">
        Competitors charge $40–$250/yr for crypto inheritance alone. Our add-on is $9.99/mo, or get it free with Pro which includes 15+ additional features.
      </p>
    </div>
  );
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [frequency, setFrequency] = useState("monthly");
  const [graceDays, setGraceDays] = useState("14");
  const [secondaryName, setSecondaryName] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");

  const createPlan = useMutation({
    mutationFn: () => apiRequest("POST", "/api/legacy-plan", {
      checkInFrequency: frequency,
      gracePeriodDays: parseInt(graceDays),
      secondaryContactName: secondaryName || null,
      secondaryContactEmail: secondaryEmail || null,
      personalMessage: personalMessage || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Legacy Plan activated", description: "Member for Life — your plan is now active." });
      onComplete();
    },
    onError: () => toast({ title: "Error", description: "Failed to create legacy plan", variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="legacy-setup-wizard">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto">
          <HeartHandshake className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Set Up Your Legacy Plan</h1>
        <p className="text-muted-foreground">Member for Life — protect your crypto legacy in 3 steps</p>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-2 w-16 rounded-full ${s <= step ? "bg-amber-500" : "bg-muted"}`} />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Check-In Schedule</CardTitle>
            <CardDescription>How often do you want to confirm you're still active?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Check-in Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger data-testid="select-frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly (Recommended)</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grace Period (days)</Label>
              <Select value={graceDays} onValueChange={setGraceDays}>
                <SelectTrigger data-testid="select-grace-days"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days (Recommended)</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">After a missed check-in, your secondary contact is notified. If you still don't respond within the grace period, beneficiary instructions are delivered.</p>
            </div>
            <Button className="w-full" onClick={() => setStep(2)} data-testid="button-next-step">Next: Secondary Contact</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Secondary Contact</CardTitle>
            <CardDescription>Someone who can verify if you're unreachable (spouse, attorney, etc.)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input value={secondaryName} onChange={(e) => setSecondaryName(e.target.value)} placeholder="Jane Doe" data-testid="input-secondary-name" />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={secondaryEmail} onChange={(e) => setSecondaryEmail(e.target.value)} placeholder="jane@example.com" data-testid="input-secondary-email" />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">Your secondary contact will receive a notification during the grace period. They will NOT receive wallet instructions — only beneficiaries get those.</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} data-testid="button-next-step-2">Next: Personal Message</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5" /> Personal Message</CardTitle>
            <CardDescription>Optional message included when beneficiaries are notified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Message to Beneficiaries</Label>
              <Textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="If you're reading this, I want you to know..."
                rows={5}
                data-testid="input-personal-message"
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">This message is encrypted and only delivered if the dead-man switch triggers. You can update it anytime.</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button className="flex-1" onClick={() => createPlan.mutate()} disabled={createPlan.isPending} data-testid="button-activate-plan">
                {createPlan.isPending ? "Activating..." : "Activate Legacy Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBanner({ plan }: { plan: LegacyPlanData["plan"] }) {
  const now = new Date();
  const nextDue = plan.nextCheckInDue ? new Date(plan.nextCheckInDue) : null;
  const daysUntilDue = nextDue ? Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  if (plan.status === "triggered") {
    return (
      <Alert variant="destructive" data-testid="alert-triggered">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Legacy Plan Triggered</AlertTitle>
        <AlertDescription>Grace period expired. Beneficiary instructions have been delivered.</AlertDescription>
      </Alert>
    );
  }

  if (plan.status === "grace") {
    const graceStart = plan.graceStartedAt ? new Date(plan.graceStartedAt) : now;
    const graceEnd = new Date(graceStart);
    graceEnd.setDate(graceEnd.getDate() + (plan.gracePeriodDays || 14));
    const graceDaysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20" data-testid="alert-grace">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">Grace Period Active</AlertTitle>
        <AlertDescription className="text-amber-600 dark:text-amber-300">
          You missed a check-in. {graceDaysLeft > 0 ? `${graceDaysLeft} day${graceDaysLeft !== 1 ? "s" : ""} remaining` : "Expiring soon"} before beneficiary delivery. Check in now to reset.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20" data-testid="alert-active">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-700 dark:text-green-400">Plan Active — Member for Life</AlertTitle>
      <AlertDescription className="text-green-600 dark:text-green-300">
        {daysUntilDue !== null && daysUntilDue > 0
          ? `Next check-in due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`
          : "Check-in due now"}
        {plan.lastCheckIn && ` · Last check-in: ${new Date(plan.lastCheckIn).toLocaleDateString()}`}
      </AlertDescription>
    </Alert>
  );
}

function BeneficiaryCard({ beneficiary, onDelete }: { beneficiary: LegacyPlanData["beneficiaries"][0]; onDelete: () => void }) {
  const walletLabels: Record<string, string> = {
    cypherock: "CypheRock X1 (2-of-5 Shamir)",
    ledger: "Ledger (24-word seed)",
    trezor: "Trezor (12/24-word seed)",
    xaman: "Xaman (Family seed / secret numbers)",
    tangem: "Tangem (NFC card set)",
    coldcard: "Coldcard (BIP39 seed)",
    other: "Other hardware/software wallet",
  };

  return (
    <Card data-testid={`card-beneficiary-${beneficiary.id}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium" data-testid={`text-beneficiary-name-${beneficiary.id}`}>{beneficiary.name}</p>
            <p className="text-sm text-muted-foreground">{beneficiary.email}</p>
            {beneficiary.relationship && <Badge variant="outline" className="mt-1">{beneficiary.relationship}</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-beneficiary-${beneficiary.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        {beneficiary.walletType && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Wallet: {walletLabels[beneficiary.walletType] || beneficiary.walletType}</p>
            {beneficiary.walletType === "cypherock" && (
              <p className="text-amber-600 dark:text-amber-400">
                CypheRock uses 2-of-5 Shamir Secret Sharing — beneficiary needs at least 2 of the 5 cards plus the X1 device. Instructions should specify card locations.
              </p>
            )}
          </div>
        )}
        {beneficiary.deviceInstructions && (
          <div className="text-xs"><span className="font-medium">Device location:</span> {beneficiary.deviceInstructions}</div>
        )}
        {beneficiary.seedPhraseInstructions && (
          <div className="text-xs"><span className="font-medium">Recovery info location:</span> {beneficiary.seedPhraseInstructions}</div>
        )}
        {beneficiary.additionalNotes && (
          <div className="text-xs"><span className="font-medium">Notes:</span> {beneficiary.additionalNotes}</div>
        )}
        {beneficiary.splitPieces && (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-600 dark:text-purple-400" data-testid={`badge-split-${beneficiary.id}`}>
              <Split className="h-3 w-3 mr-1" />
              Receives: {beneficiary.splitPieces}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResendVerificationButton() {
  const { toast } = useToast();
  const resend = useMutation({
    mutationFn: () => apiRequest("POST", "/api/legacy-plan/resend-verification"),
    onSuccess: () => {
      toast({ title: "Verification email sent", description: "A new verification email has been sent to your secondary contact." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full mt-2 text-xs"
      onClick={() => resend.mutate()}
      disabled={resend.isPending}
      data-testid="button-resend-verification"
    >
      <Mail className="h-3 w-3 mr-1.5" />
      {resend.isPending ? "Sending..." : "Resend Verification Email"}
    </Button>
  );
}

function AddBeneficiaryDialog({ onAdd, splitEnabled }: { onAdd: () => void; splitEnabled?: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [walletType, setWalletType] = useState("");
  const [deviceInstructions, setDeviceInstructions] = useState("");
  const [seedPhraseInstructions, setSeedPhraseInstructions] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [splitPieces, setSplitPieces] = useState("");

  const createBeneficiary = useMutation({
    mutationFn: () => apiRequest("POST", "/api/legacy-beneficiaries", {
      name, email, relationship: relationship || null,
      walletType: walletType || null,
      deviceInstructions: deviceInstructions || null,
      seedPhraseInstructions: seedPhraseInstructions || null,
      additionalNotes: additionalNotes || null,
      splitPieces: splitPieces || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Beneficiary added" });
      setOpen(false);
      resetForm();
      onAdd();
    },
    onError: () => toast({ title: "Error", description: "Failed to add beneficiary", variant: "destructive" }),
  });

  const resetForm = () => {
    setName(""); setEmail(""); setRelationship(""); setWalletType("");
    setDeviceInstructions(""); setSeedPhraseInstructions(""); setAdditionalNotes(""); setSplitPieces("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-beneficiary"><UserPlus className="h-4 w-4 mr-2" /> Add Beneficiary</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Beneficiary</DialogTitle>
          <DialogDescription>Who should receive your wallet recovery instructions?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" data-testid="input-beneficiary-name" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" data-testid="input-beneficiary-email" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger data-testid="select-relationship"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse / Partner</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="attorney">Attorney</SelectItem>
                  <SelectItem value="executor">Estate Executor</SelectItem>
                  <SelectItem value="friend">Trusted Friend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Wallet Type</Label>
              <Select value={walletType} onValueChange={setWalletType}>
                <SelectTrigger data-testid="select-wallet-type"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cypherock">CypheRock X1</SelectItem>
                  <SelectItem value="ledger">Ledger</SelectItem>
                  <SelectItem value="trezor">Trezor</SelectItem>
                  <SelectItem value="xaman">Xaman</SelectItem>
                  <SelectItem value="tangem">Tangem</SelectItem>
                  <SelectItem value="coldcard">Coldcard</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {walletType === "cypherock" && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-sm text-amber-700 dark:text-amber-400">CypheRock 2-of-5 Shamir</AlertTitle>
              <AlertDescription className="text-xs text-amber-600 dark:text-amber-300">
                CypheRock uses Shamir Secret Sharing — 5 cards are created, and any 2 cards + the X1 device can recover the wallet.
                In your instructions, tell the beneficiary where each card is stored (e.g., "Card 1 in home safe, Card 3 with attorney").
                They do NOT need all 5 cards — just any 2 and the device.
              </AlertDescription>
            </Alert>
          )}

          {walletType === "ledger" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Ledger uses a standard 24-word BIP39 seed phrase. Explain where the seed phrase backup is stored — never put the seed phrase itself here. Also note if they need a PIN to access the device.
              </AlertDescription>
            </Alert>
          )}

          {walletType === "xaman" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Xaman (formerly Xumm) uses a family seed or secret numbers. Explain where the backup is stored. If they paired with a Ledger, note that the Ledger is the signing device.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Label>Where is the device?</Label>
            <Input value={deviceInstructions} onChange={(e) => setDeviceInstructions(e.target.value)} placeholder="e.g., Home office safe, top shelf" data-testid="input-device-location" />
          </div>
          <div className="space-y-1">
            <Label>Where is the recovery phrase / seed backup?</Label>
            <Input value={seedPhraseInstructions} onChange={(e) => setSeedPhraseInstructions(e.target.value)} placeholder="e.g., Bank safe deposit box #42, steel plate in fireproof safe" data-testid="input-seed-location" />
            <p className="text-xs text-destructive font-medium">Never enter your actual seed phrase — only describe WHERE it's stored.</p>
          </div>
          <div className="space-y-1">
            <Label>Additional Notes</Label>
            <Textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="PINs, passphrases notes, multi-sig details, attorney contact info..." rows={3} data-testid="input-additional-notes" />
          </div>

          {splitEnabled && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <Split className="h-3.5 w-3.5 text-purple-500" />
                Split Delivery — What does this person receive?
              </Label>
              <Select value={splitPieces} onValueChange={setSplitPieces}>
                <SelectTrigger data-testid="select-split-pieces"><SelectValue placeholder="Select info pieces..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="device-location">Device location only</SelectItem>
                  <SelectItem value="seed-location">Seed/recovery location only</SelectItem>
                  <SelectItem value="pin-passphrase">PIN / passphrase only</SelectItem>
                  <SelectItem value="card-locations-1-2">CypheRock Cards 1 & 2 locations</SelectItem>
                  <SelectItem value="card-locations-3-4">CypheRock Cards 3 & 4 locations</SelectItem>
                  <SelectItem value="card-location-5-device">CypheRock Card 5 + device location</SelectItem>
                  <SelectItem value="all-instructions">All instructions (no split)</SelectItem>
                  <SelectItem value="custom">Custom split (describe in notes)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">When split delivery is enabled, each beneficiary only receives their assigned piece. They must collaborate to recover the wallet.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => createBeneficiary.mutate()} disabled={!name || !email || createBeneficiary.isPending} data-testid="button-save-beneficiary">
            {createBeneficiary.isPending ? "Saving..." : "Save Beneficiary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnnualReviewSection({ plan }: { plan: LegacyPlanData["plan"] }) {
  const { toast } = useToast();
  const now = new Date();
  const nextReviewDue = plan.nextAnnualReviewDue ? new Date(plan.nextAnnualReviewDue) : null;
  const isOverdue = nextReviewDue ? now >= nextReviewDue : false;
  const daysUntilReview = nextReviewDue ? Math.ceil((nextReviewDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isDueSoon = daysUntilReview !== null && daysUntilReview <= 30 && daysUntilReview > 0;

  const submitReview = useMutation({
    mutationFn: () => apiRequest("POST", "/api/legacy-plan/annual-review"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Annual review completed", description: "Your Legacy Plan has been attested. Next review due in 1 year." });
    },
    onError: () => toast({ title: "Error", description: "Failed to record annual review", variant: "destructive" }),
  });

  if (!isOverdue && !isDueSoon) {
    return (
      <Card className="border-dashed" data-testid="card-annual-review">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Annual Review</p>
                <p className="text-xs text-muted-foreground">
                  {plan.lastAnnualReview
                    ? `Last reviewed: ${new Date(plan.lastAnnualReview).toLocaleDateString()}`
                    : "No review yet"}
                  {nextReviewDue && ` · Next due: ${nextReviewDue.toLocaleDateString()}`}
                  {plan.annualReviewCount ? ` · ${plan.annualReviewCount} review${(plan.annualReviewCount || 0) > 1 ? "s" : ""} completed` : ""}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isOverdue ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"}`} data-testid="card-annual-review-due">
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg flex items-center gap-2 ${isOverdue ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
          <CalendarCheck className="h-5 w-5" />
          {isOverdue ? "Annual Review Overdue" : "Annual Review Due Soon"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm ${isOverdue ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300"}`}>
          {isOverdue
            ? "Your annual Legacy Plan review is overdue. Life changes — divorce, the passing of a loved one, new family members, or changes to your wallet setup. Please review your beneficiaries, instructions, and contacts to make sure everything is still accurate."
            : `Your annual review is due in ${daysUntilReview} day${daysUntilReview !== 1 ? "s" : ""}. Take a few minutes to verify your beneficiaries, wallet instructions, and contacts are still correct.`}
        </p>

        <div className="space-y-2">
          <p className="text-sm font-medium">Before attesting, please verify:</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              All beneficiaries are still the people you want to receive instructions
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Beneficiary email addresses are still current
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Device and recovery phrase locations haven't changed
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Secondary contact is still appropriate (no divorce, estrangement, etc.)
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Split delivery assignments (if enabled) are still correct
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Personal message still reflects your wishes
            </li>
          </ul>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This is not just a check-in — it's a full attestation that your Legacy Plan is still accurate and reflects your current wishes. Life changes (divorce, death of a beneficiary, new wallets, moved safes) can make your plan outdated. Review everything above before clicking.
          </AlertDescription>
        </Alert>

        <Button
          className={`w-full ${isOverdue ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"}`}
          size="lg"
          onClick={() => submitReview.mutate()}
          disabled={submitReview.isPending}
          data-testid="button-annual-review"
        >
          <ClipboardCheck className="h-5 w-5 mr-2" />
          {submitReview.isPending ? "Recording..." : "I've Reviewed Everything — Attest My Plan Is Current"}
        </Button>

        {plan.lastAnnualReview && (
          <p className="text-xs text-muted-foreground text-center">
            Last review: {new Date(plan.lastAnnualReview).toLocaleDateString()}
            {plan.annualReviewCount ? ` · ${plan.annualReviewCount} review${(plan.annualReviewCount || 0) > 1 ? "s" : ""} completed` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const splitPieceLabels: Record<string, string> = {
  "device-location": "Device location only",
  "seed-location": "Seed/recovery location only",
  "pin-passphrase": "PIN / passphrase only",
  "card-locations-1-2": "CypheRock Cards 1 & 2",
  "card-locations-3-4": "CypheRock Cards 3 & 4",
  "card-location-5-device": "CypheRock Card 5 + device",
  "all-instructions": "All instructions",
  "custom": "Custom split",
};

function SplitDeliverySection({ plan, beneficiaries }: { plan: LegacyPlanData["plan"]; beneficiaries: LegacyPlanData["beneficiaries"] }) {
  const { toast } = useToast();
  const splitEnabled = plan.splitDeliveryEnabled ?? false;
  const splitMode = plan.splitDeliveryMode ?? "all";
  const splitThreshold = plan.splitDeliveryThreshold ?? 2;

  const toggleSplit = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("PATCH", "/api/legacy-plan", { splitDeliveryEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: splitEnabled ? "Split delivery disabled" : "Split delivery enabled" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update split delivery", variant: "destructive" }),
  });

  const updateSplitSettings = useMutation({
    mutationFn: (data: { splitDeliveryMode?: string; splitDeliveryThreshold?: number }) => apiRequest("PATCH", "/api/legacy-plan", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Split settings updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update split settings", variant: "destructive" }),
  });

  const assignedBeneficiaries = beneficiaries.filter(b => b.splitPieces);
  const unassignedBeneficiaries = beneficiaries.filter(b => !b.splitPieces);

  return (
    <Card data-testid="card-split-delivery">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Split className="h-4 w-4 text-purple-500" />
              Split Delivery
            </CardTitle>
            <CardDescription>Split instructions across beneficiaries so they must collaborate</CardDescription>
          </div>
          <Switch
            checked={splitEnabled}
            onCheckedChange={(checked) => toggleSplit.mutate(checked)}
            disabled={toggleSplit.isPending}
            data-testid="switch-split-delivery"
          />
        </div>
      </CardHeader>
      {splitEnabled && (
        <CardContent className="space-y-4">
          <Alert className="border-purple-500/30 bg-purple-50 dark:bg-purple-950/20">
            <Split className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-sm text-purple-700 dark:text-purple-400">Multi-Sig Email Delivery</AlertTitle>
            <AlertDescription className="text-xs text-purple-600 dark:text-purple-300">
              When triggered, each beneficiary only receives their assigned piece of information. They must contact each other and combine their pieces to access the wallet. No single person gets everything.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Delivery Mode</Label>
              <Select value={splitMode} onValueChange={(v) => updateSplitSettings.mutate({ splitDeliveryMode: v })}>
                <SelectTrigger data-testid="select-split-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All required — every beneficiary's piece is needed</SelectItem>
                  <SelectItem value="threshold">Threshold — only M-of-N pieces needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {splitMode === "threshold" && (
              <div className="space-y-1">
                <Label className="text-xs">Threshold — how many beneficiaries must collaborate?</Label>
                <Select value={String(splitThreshold)} onValueChange={(v) => updateSplitSettings.mutate({ splitDeliveryThreshold: parseInt(v) })}>
                  <SelectTrigger data-testid="select-split-threshold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5].filter(n => n <= beneficiaries.length || n === 2).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} of {Math.max(beneficiaries.length, n)} beneficiaries</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Like Shamir Secret Sharing — any {splitThreshold} of your {beneficiaries.length} beneficiaries can reconstruct the full instructions by combining their pieces.
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Piece Assignments
            </p>
            {beneficiaries.length < 2 ? (
              <p className="text-xs text-muted-foreground">Add at least 2 beneficiaries to use split delivery.</p>
            ) : (
              <div className="space-y-1.5">
                {beneficiaries.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-xs text-muted-foreground">{b.email}</span>
                    </div>
                    <Badge variant={b.splitPieces ? "default" : "outline"} className={b.splitPieces ? "bg-purple-600 text-white" : "border-dashed"}>
                      {b.splitPieces ? (splitPieceLabels[b.splitPieces] || b.splitPieces) : "Not assigned"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {unassignedBeneficiaries.length > 0 && beneficiaries.length >= 2 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {unassignedBeneficiaries.length} beneficiar{unassignedBeneficiaries.length === 1 ? "y has" : "ies have"} no piece assigned. Edit each beneficiary to assign their split piece.
              </p>
            )}
          </div>

          <div className="rounded-md bg-muted/30 border border-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Example with CypheRock:</span>{" "}
              Person A gets "Card 1 is in the home safe, Card 2 is with the attorney."
              Person B gets "Card 3 is in the bank safe deposit box, the X1 device is in the desk drawer."
              Neither person alone can recover the wallet — they must combine their pieces (any 2 cards + the device).
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function LegacyPlanPage() {
  const { toast } = useToast();
  const [editingSettings, setEditingSettings] = useState(false);
  const [editFrequency, setEditFrequency] = useState("");
  const [editGraceDays, setEditGraceDays] = useState("");

  const { data, isLoading, error } = useQuery<LegacyPlanData | null>({
    queryKey: ["/api/legacy-plan"],
  });

  const checkIn = useMutation({
    mutationFn: () => apiRequest("POST", "/api/legacy-plan/check-in"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Checked in!", description: "Your legacy plan timer has been reset." });
    },
    onError: () => toast({ title: "Error", description: "Check-in failed", variant: "destructive" }),
  });

  const updateSettings = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/legacy-plan", {
      checkInFrequency: editFrequency,
      gracePeriodDays: parseInt(editGraceDays),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Settings updated" });
      setEditingSettings(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to update settings", variant: "destructive" }),
  });

  const deleteBeneficiary = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/legacy-beneficiaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: "Beneficiary removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove beneficiary", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error && (error as Error)?.message?.startsWith("403")) {
    return <ProGate />;
  }

  if (!data) {
    return <SetupWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] })} />;
  }

  const { plan, beneficiaries, checkIns } = data;
  const frequencyLabels: Record<string, string> = { weekly: "Weekly", biweekly: "Every 2 Weeks", monthly: "Monthly", quarterly: "Quarterly" };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" data-testid="legacy-plan-dashboard">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <HeartHandshake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-legacy-title">Legacy Plan</h1>
            <p className="text-sm text-muted-foreground">Member for Life — Dead-Man Switch</p>
          </div>
        </div>
        <Badge className="bg-amber-500 text-white" data-testid="badge-member-for-life">Member for Life</Badge>
      </div>

      <StatusBanner plan={plan} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Check In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Press the button below to confirm you're active. This resets your timer.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => checkIn.mutate()}
              disabled={checkIn.isPending}
              data-testid="button-check-in"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {checkIn.isPending ? "Checking in..." : "I'm Still Here"}
            </Button>
            {checkIns.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Recent check-ins:</p>
                <div className="space-y-1">
                  {checkIns.slice(0, 5).map((ci) => (
                    <p key={ci.id} className="text-xs text-muted-foreground">
                      {new Date(ci.checkedInAt).toLocaleString()}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-4 w-4" /> Settings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {
                setEditFrequency(plan.checkInFrequency);
                setEditGraceDays(String(plan.gracePeriodDays));
                setEditingSettings(!editingSettings);
              }} data-testid="button-edit-settings">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingSettings ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={editFrequency} onValueChange={setEditFrequency}>
                    <SelectTrigger data-testid="select-edit-frequency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grace Period</Label>
                  <Select value={editGraceDays} onValueChange={setEditGraceDays}>
                    <SelectTrigger data-testid="select-edit-grace"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" size="sm" onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} data-testid="button-save-settings">
                  {updateSettings.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Frequency</span><span className="font-medium">{frequencyLabels[plan.checkInFrequency] || plan.checkInFrequency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Grace Period</span><span className="font-medium">{plan.gracePeriodDays} days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={plan.status === "active" ? "default" : plan.status === "grace" ? "outline" : "destructive"} data-testid="badge-plan-status">{plan.status}</Badge></div>
                {plan.secondaryContactName && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Secondary Contact</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.secondaryContactName}</span>
                      {plan.secondaryContactVerified ? (
                        <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-600 dark:text-green-400" data-testid="badge-contact-verified">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400" data-testid="badge-contact-unverified">Unverified</Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{new Date(plan.createdAt).toLocaleDateString()}</span></div>
                {plan.secondaryContactEmail && !plan.secondaryContactVerified && (
                  <ResendVerificationButton />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AnnualReviewSection plan={plan} />

      <SplitDeliverySection plan={plan} beneficiaries={beneficiaries} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Beneficiaries</CardTitle>
              <CardDescription>People who will receive your wallet recovery instructions</CardDescription>
            </div>
            <AddBeneficiaryDialog onAdd={() => {}} splitEnabled={plan.splitDeliveryEnabled ?? false} />
          </div>
        </CardHeader>
        <CardContent>
          {beneficiaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-beneficiaries">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No beneficiaries yet</p>
              <p className="text-sm">Add at least one beneficiary to complete your legacy plan</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {beneficiaries.map((b) => (
                  <BeneficiaryCard key={b.id} beneficiary={b} onDelete={() => deleteBeneficiary.mutate(b.id)} />
                ))}
              </div>
              {beneficiaries.length >= 1 && beneficiaries.length < 5 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {beneficiaries.length === 1
                      ? "You can add multiple beneficiaries — a spouse, child, attorney, etc. Each gets their own instructions."
                      : `${beneficiaries.length} beneficiaries configured. You can add more anytime.`}
                  </p>
                  <AddBeneficiaryDialog onAdd={() => {}} splitEnabled={plan.splitDeliveryEnabled ?? false} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Security & Legal Note</p>
              <p>CryptoOwnBank never stores your seed phrases, private keys, or wallet passwords. We only store YOUR encrypted instructions about where those items are located. All beneficiary data is encrypted at rest.</p>
              <p>Your legacy plan is non-custodial — we help deliver instructions, but we never have access to your funds. CryptoOwnBank is not a fiduciary, estate planner, attorney, or financial advisor. This tool helps you organize and deliver information to your chosen beneficiaries — it does not replace a proper estate plan, will, or trust. Consult a qualified estate planning attorney for your specific legal needs.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}