import { useState, useMemo, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Unlock,
  Info,
  RefreshCw,
  Edit,
  XCircle,
  Split,
  Users,
  CalendarCheck,
  ClipboardCheck,
  Mail,
  Download,
  Eye,
  EyeOff,
  Key,
  Wallet,
  Smartphone,
  HardDrive,
  Globe,
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
    encryptedVault: string | null;
    encryptedVaultHint: string | null;
    walletAssetSummary: string | null;
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

const WALLET_TYPES: Record<string, { label: string; category: "cold" | "hot" | "exchange"; icon: typeof HardDrive; recoveryMethod: string; template: { deviceLabel: string; devicePlaceholder: string; seedLabel: string; seedPlaceholder: string; guidanceTitle: string; guidanceText: string; templateFields: Array<{ label: string; placeholder: string; key: string }>; } }> = {
  ledger: {
    label: "Ledger (Nano S/X/Stax)",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "24-word BIP39 seed phrase",
    template: {
      deviceLabel: "Where is the Ledger device?",
      devicePlaceholder: "e.g., Home office safe, top shelf behind the books",
      seedLabel: "Where is the 24-word recovery phrase?",
      seedPlaceholder: "e.g., Steel plate in bank safe deposit box #42, First National Bank, Main St branch",
      guidanceTitle: "Ledger Recovery Guide",
      guidanceText: "A Ledger device uses a 24-word BIP39 seed phrase. The survivor needs the physical device AND the PIN, OR just the 24 words to restore onto a new Ledger. If a 25th word (passphrase) is used, that must also be provided. The device connects via USB or Bluetooth to Ledger Live software.",
      templateFields: [
        { label: "Device PIN or where PIN is written", placeholder: "e.g., Written on card in home safe, envelope marked 'L'", key: "pin" },
        { label: "Is there a 25th word (passphrase)?", placeholder: "e.g., Yes — stored separately in attorney's safe, sealed envelope", key: "passphrase" },
        { label: "Which apps are installed? (chains)", placeholder: "e.g., Bitcoin, Ethereum, XRP, Stellar, Polygon", key: "apps" },
        { label: "Ledger Live installed on which computer?", placeholder: "e.g., MacBook Pro in home office, login password in password manager", key: "software" },
      ],
    },
  },
  cypherock: {
    label: "CypheRock X1 (2-of-5 Shamir)",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "Shamir Secret Sharing — 5 X1 cards, any 2 + device",
    template: {
      deviceLabel: "Where is the X1 device (dongle)?",
      devicePlaceholder: "e.g., Home safe, inside the gray electronics bag",
      seedLabel: "Where are the X1 cards stored?",
      seedPlaceholder: "General notes on card distribution",
      guidanceTitle: "CypheRock 2-of-5 Recovery Guide",
      guidanceText: "CypheRock uses Shamir Secret Sharing. 5 physical X1 cards are created during setup. To recover, the survivor needs the X1 device (dongle) PLUS any 2 of the 5 cards. No single card holds the full key. Cards can be distributed across locations and people for security.",
      templateFields: [
        { label: "Card 1 location", placeholder: "e.g., Home safe, top drawer", key: "card1" },
        { label: "Card 2 location", placeholder: "e.g., Bank safe deposit box #12", key: "card2" },
        { label: "Card 3 location", placeholder: "e.g., With attorney — Law Office of Smith & Associates", key: "card3" },
        { label: "Card 4 location", placeholder: "e.g., Parent's house, fireproof safe in basement", key: "card4" },
        { label: "Card 5 location", placeholder: "e.g., Office desk, locked drawer", key: "card5" },
        { label: "Device PIN", placeholder: "e.g., Written on card in attorney's sealed envelope", key: "pin" },
      ],
    },
  },
  trezor: {
    label: "Trezor (Model T / Safe 3)",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "12 or 24-word BIP39 seed phrase",
    template: {
      deviceLabel: "Where is the Trezor device?",
      devicePlaceholder: "e.g., Home office desk drawer, in the Trezor box",
      seedLabel: "Where is the recovery seed (12 or 24 words)?",
      seedPlaceholder: "e.g., Metal seed plate in fireproof safe, master bedroom closet",
      guidanceTitle: "Trezor Recovery Guide",
      guidanceText: "Trezor uses a 12 or 24-word BIP39 seed phrase. The survivor needs the device + PIN, or just the seed words to restore on a new Trezor. If a passphrase is set, it must also be provided. Trezor connects via USB to Trezor Suite software.",
      templateFields: [
        { label: "Device PIN or where PIN is stored", placeholder: "e.g., Written in sealed envelope in home safe", key: "pin" },
        { label: "Is there a passphrase (hidden wallet)?", placeholder: "e.g., Yes — passphrase stored with attorney", key: "passphrase" },
        { label: "Which coins are stored?", placeholder: "e.g., Bitcoin, Ethereum, Cardano", key: "apps" },
        { label: "Trezor Suite on which computer?", placeholder: "e.g., Desktop PC in home office", key: "software" },
      ],
    },
  },
  ellipal: {
    label: "ELLIPAL Titan",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "12/24-word mnemonic, air-gapped (QR only)",
    template: {
      deviceLabel: "Where is the ELLIPAL device?",
      devicePlaceholder: "e.g., Home safe, in the ELLIPAL box with charging cable",
      seedLabel: "Where is the recovery mnemonic (12 or 24 words)?",
      seedPlaceholder: "e.g., Written on recovery sheet, sealed envelope in bank safe deposit box",
      guidanceTitle: "ELLIPAL Recovery Guide",
      guidanceText: "ELLIPAL is air-gapped — it has NO USB, Bluetooth, or WiFi. All communication uses QR codes between the device and the ELLIPAL mobile app. The survivor needs the device + password, or the mnemonic words to restore on a new device. The ELLIPAL app is needed on a phone to manage transactions.",
      templateFields: [
        { label: "Device password", placeholder: "e.g., Written on card in home safe, labeled 'E'", key: "pin" },
        { label: "ELLIPAL app installed on which phone?", placeholder: "e.g., iPhone 15 Pro, personal phone", key: "software" },
        { label: "Which accounts are set up?", placeholder: "e.g., Bitcoin, Ethereum, XRP, BNB", key: "apps" },
      ],
    },
  },
  tangem: {
    label: "Tangem (NFC card wallet)",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "2-of-3 NFC card set — no seed phrase",
    template: {
      deviceLabel: "Where are the Tangem cards?",
      devicePlaceholder: "e.g., Primary card in wallet, backup cards in home safe",
      seedLabel: "Tangem does not use a seed phrase — backup cards ARE the recovery",
      seedPlaceholder: "Describe where each card in the set is located",
      guidanceTitle: "Tangem Recovery Guide",
      guidanceText: "Tangem is unique — there is NO seed phrase. The wallet is the NFC card itself. A typical Tangem set includes 2 or 3 cards. The survivor needs any one card + the Tangem app on their phone + the access code. Lost all cards = lost funds. There is no other recovery method.",
      templateFields: [
        { label: "Card 1 (primary) location", placeholder: "e.g., In my physical wallet, everyday carry", key: "card1" },
        { label: "Card 2 (backup) location", placeholder: "e.g., Home safe, fireproof box", key: "card2" },
        { label: "Card 3 (backup) location", placeholder: "e.g., With spouse / trusted family member", key: "card3" },
        { label: "Access code", placeholder: "e.g., Written on card inside sealed envelope in safe", key: "pin" },
        { label: "Tangem app on which phone?", placeholder: "e.g., iPhone, download from App Store", key: "software" },
      ],
    },
  },
  coldcard: {
    label: "Coldcard (Bitcoin only)",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "24-word BIP39 seed + optional passphrase",
    template: {
      deviceLabel: "Where is the Coldcard device?",
      devicePlaceholder: "e.g., Home safe, in anti-static bag",
      seedLabel: "Where are the 24 seed words?",
      seedPlaceholder: "e.g., Stamped on steel plate, bank safe deposit box",
      guidanceTitle: "Coldcard Recovery Guide",
      guidanceText: "Coldcard is a Bitcoin-only signing device. It uses a 24-word BIP39 seed and optionally a BIP39 passphrase. It connects via microSD card (air-gapped mode) or USB. The survivor needs the seed words and any passphrase to restore, or the device + PIN to sign transactions.",
      templateFields: [
        { label: "Device PIN", placeholder: "e.g., Written in sealed envelope with attorney", key: "pin" },
        { label: "Is there a BIP39 passphrase?", placeholder: "e.g., Yes, stored separately from seed words", key: "passphrase" },
        { label: "Anti-phishing words set?", placeholder: "e.g., Two words shown on device login — ignore if seen by survivor", key: "antiphish" },
        { label: "Companion software (Sparrow, Electrum)?", placeholder: "e.g., Sparrow Wallet on desktop PC, home office", key: "software" },
      ],
    },
  },
  keystone: {
    label: "Keystone (air-gapped QR)",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "24-word BIP39 seed, air-gapped via QR",
    template: {
      deviceLabel: "Where is the Keystone device?",
      devicePlaceholder: "e.g., Home safe, in the Keystone box",
      seedLabel: "Where is the 24-word seed phrase?",
      seedPlaceholder: "e.g., Metal seed plate in bank safe deposit box",
      guidanceTitle: "Keystone Recovery Guide",
      guidanceText: "Keystone is air-gapped — communication is via QR codes only (no USB/Bluetooth). The survivor needs the 24-word seed to restore on a new device, or the device + unlock password. Keystone works with MetaMask, Keplr, and other QR-compatible wallets.",
      templateFields: [
        { label: "Device password", placeholder: "e.g., Written on card in safe", key: "pin" },
        { label: "Is there a passphrase?", placeholder: "e.g., No passphrase set", key: "passphrase" },
        { label: "Companion wallets (MetaMask, etc.)", placeholder: "e.g., Paired with MetaMask in Chrome on desktop PC", key: "software" },
      ],
    },
  },
  bitbox: {
    label: "BitBox02",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "24-word BIP39 seed + optional passphrase",
    template: {
      deviceLabel: "Where is the BitBox02 device?",
      devicePlaceholder: "e.g., Home safe, in original box",
      seedLabel: "Where is the 24-word seed backup?",
      seedPlaceholder: "e.g., On the included microSD backup card in safe, plus steel plate in bank box",
      guidanceTitle: "BitBox02 Recovery Guide",
      guidanceText: "BitBox02 stores a backup on microSD card automatically during setup. The survivor needs either the microSD card or the 24 seed words. The device password unlocks the device. BitBox app is needed to interact with it (connects via USB-C).",
      templateFields: [
        { label: "Device password", placeholder: "e.g., Written in sealed envelope in home safe", key: "pin" },
        { label: "Where is the microSD backup card?", placeholder: "e.g., In the BitBox box, home safe", key: "sdcard" },
        { label: "Optional passphrase set?", placeholder: "e.g., No passphrase", key: "passphrase" },
        { label: "BitBox app installed where?", placeholder: "e.g., MacBook, desktop app", key: "software" },
      ],
    },
  },
  xaman: {
    label: "Xaman (formerly Xumm)",
    category: "hot",
    icon: Smartphone,
    recoveryMethod: "Family seed or secret numbers (XRPL)",
    template: {
      deviceLabel: "Which phone has Xaman installed?",
      devicePlaceholder: "e.g., iPhone 15 Pro, personal phone, Face ID enabled",
      seedLabel: "Where is the family seed / secret numbers backup?",
      seedPlaceholder: "e.g., Written on paper in home safe, labeled 'X'",
      guidanceTitle: "Xaman (XRPL) Recovery Guide",
      guidanceText: "Xaman is the primary XRPL wallet app. It uses a 'family seed' (starting with 's') or 'secret numbers' (8 rows of 6 digits) for backup. If paired with a Ledger, the Ledger is the signing device and Xaman is just the interface. The survivor needs the seed/numbers to import into a new Xaman install, OR the phone + access code.",
      templateFields: [
        { label: "Xaman access code (6-digit or biometric)", placeholder: "e.g., 6-digit code written on card in safe", key: "pin" },
        { label: "Is this account paired with a Ledger?", placeholder: "e.g., Yes — Ledger Nano X is the signing device, see Ledger instructions", key: "ledgerPaired" },
        { label: "XRPL address (r...)", placeholder: "e.g., rABC123... — so survivor can verify the right account", key: "address" },
        { label: "Is there a regular key or multi-sign?", placeholder: "e.g., No regular key set / Yes — secondary signer on address rXYZ...", key: "multisig" },
      ],
    },
  },
  metamask: {
    label: "MetaMask (browser/mobile)",
    category: "hot",
    icon: Globe,
    recoveryMethod: "12-word seed phrase",
    template: {
      deviceLabel: "Where is MetaMask installed?",
      devicePlaceholder: "e.g., Chrome extension on home PC + MetaMask mobile on iPhone",
      seedLabel: "Where is the 12-word Secret Recovery Phrase?",
      seedPlaceholder: "e.g., Written on card in home safe, sealed envelope",
      guidanceTitle: "MetaMask Recovery Guide",
      guidanceText: "MetaMask uses a 12-word Secret Recovery Phrase (SRP). The survivor can restore the wallet on any browser or phone by installing MetaMask and importing the 12 words. If hardware wallet accounts were added (Ledger/Trezor), those require the hardware device separately. The MetaMask password only unlocks the local install — the 12 words are the true backup.",
      templateFields: [
        { label: "MetaMask password (for existing install)", placeholder: "e.g., In password manager, or written in safe", key: "pin" },
        { label: "Any hardware wallet accounts added?", placeholder: "e.g., Yes — Ledger accounts imported, see Ledger instructions", key: "hardware" },
        { label: "Which networks/chains used?", placeholder: "e.g., Ethereum, Polygon, Arbitrum, BSC", key: "apps" },
      ],
    },
  },
  trust: {
    label: "Trust Wallet",
    category: "hot",
    icon: Smartphone,
    recoveryMethod: "12-word recovery phrase",
    template: {
      deviceLabel: "Which phone has Trust Wallet installed?",
      devicePlaceholder: "e.g., Samsung Galaxy S24, personal phone",
      seedLabel: "Where is the 12-word recovery phrase?",
      seedPlaceholder: "e.g., Written on recovery card in home safe",
      guidanceTitle: "Trust Wallet Recovery Guide",
      guidanceText: "Trust Wallet uses a 12-word recovery phrase. The survivor installs Trust Wallet on any phone and imports the 12 words. Trust Wallet supports many chains — all accounts are derived from the same 12 words. The app passcode only locks the local install.",
      templateFields: [
        { label: "App passcode", placeholder: "e.g., 6-digit code, or biometric only", key: "pin" },
        { label: "Which chains/tokens used?", placeholder: "e.g., BNB, Ethereum, Solana, various tokens", key: "apps" },
      ],
    },
  },
  phantom: {
    label: "Phantom (Solana/multi-chain)",
    category: "hot",
    icon: Smartphone,
    recoveryMethod: "12-word recovery phrase",
    template: {
      deviceLabel: "Where is Phantom installed?",
      devicePlaceholder: "e.g., Chrome extension on home PC + Phantom mobile on iPhone",
      seedLabel: "Where is the 12-word Secret Recovery Phrase?",
      seedPlaceholder: "e.g., Written on card in home safe",
      guidanceTitle: "Phantom Recovery Guide",
      guidanceText: "Phantom uses a 12-word recovery phrase. Primarily used for Solana but also supports Ethereum and Polygon. The survivor imports the 12 words into a new Phantom install. Check for any NFTs or staked SOL.",
      templateFields: [
        { label: "App password", placeholder: "e.g., In password manager", key: "pin" },
        { label: "Staked SOL or NFTs?", placeholder: "e.g., 50 SOL staked with Marinade, various NFTs in wallet", key: "staking" },
      ],
    },
  },
  exodus: {
    label: "Exodus (desktop/mobile)",
    category: "hot",
    icon: Smartphone,
    recoveryMethod: "12-word recovery phrase",
    template: {
      deviceLabel: "Where is Exodus installed?",
      devicePlaceholder: "e.g., Desktop app on Mac + mobile app on iPhone, synced",
      seedLabel: "Where is the 12-word recovery phrase?",
      seedPlaceholder: "e.g., Exported backup email + phrase written in safe",
      guidanceTitle: "Exodus Recovery Guide",
      guidanceText: "Exodus uses a 12-word recovery phrase. The survivor installs Exodus and restores with the 12 words. Exodus also has a backup feature that sends an encrypted backup via email — if this was used, the backup password is also needed. Check for staked assets inside Exodus.",
      templateFields: [
        { label: "Exodus password", placeholder: "e.g., In password manager, or written in safe", key: "pin" },
        { label: "Email backup enabled?", placeholder: "e.g., Yes — backup sent to myemail@gmail.com, backup password in safe", key: "emailBackup" },
        { label: "Any staked assets?", placeholder: "e.g., SOL staked, ADA staked via Exodus", key: "staking" },
      ],
    },
  },
  "coinbase-wallet": {
    label: "Coinbase Wallet (self-custody)",
    category: "hot",
    icon: Smartphone,
    recoveryMethod: "12-word recovery phrase",
    template: {
      deviceLabel: "Where is Coinbase Wallet installed?",
      devicePlaceholder: "e.g., Chrome extension + mobile app on iPhone",
      seedLabel: "Where is the recovery phrase?",
      seedPlaceholder: "e.g., Written on card in home safe",
      guidanceTitle: "Coinbase Wallet Recovery Guide",
      guidanceText: "Coinbase Wallet (not the Coinbase exchange app) is self-custody. It uses a 12-word recovery phrase. This is SEPARATE from any Coinbase exchange account. The survivor imports the 12 words into a new Coinbase Wallet install. Cloud backup may also be enabled via Google Drive/iCloud with a separate password.",
      templateFields: [
        { label: "App passcode", placeholder: "e.g., Biometric or PIN", key: "pin" },
        { label: "Cloud backup enabled?", placeholder: "e.g., Yes — backed up to iCloud, cloud backup password in safe", key: "cloudBackup" },
      ],
    },
  },
  exchange: {
    label: "Exchange Account (custodial)",
    category: "exchange",
    icon: Globe,
    recoveryMethod: "Login credentials + 2FA",
    template: {
      deviceLabel: "Which exchange?",
      devicePlaceholder: "e.g., Coinbase, Kraken, Binance — specify the exchange name",
      seedLabel: "Where are the login credentials?",
      seedPlaceholder: "e.g., In password manager (1Password, family vault) or written in safe",
      guidanceTitle: "Exchange Account Recovery Guide",
      guidanceText: "Exchange accounts are custodial — the exchange holds the keys. The survivor needs login credentials AND access to the 2FA method (authenticator app, phone number, or security key). Most exchanges have a death/estate process — contact support with a death certificate. Some exchanges allow beneficiary designation directly.",
      templateFields: [
        { label: "Email address for the account", placeholder: "e.g., myemail@gmail.com", key: "email" },
        { label: "Password or password manager location", placeholder: "e.g., 1Password, shared family vault, or written in safe", key: "pin" },
        { label: "2FA method and device", placeholder: "e.g., Google Authenticator on iPhone / SMS to phone number ending in 1234 / YubiKey in safe", key: "twofa" },
        { label: "Exchange estate/death process notes", placeholder: "e.g., Coinbase has an estate process — submit death certificate to support", key: "estateProcess" },
      ],
    },
  },
  arculus: {
    label: "Arculus Key Card",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "12-word recovery phrase + NFC card",
    template: {
      deviceLabel: "Where is the Arculus Key Card?",
      devicePlaceholder: "e.g., Wallet, home safe, with attorney",
      seedLabel: "Where is the 12-word recovery phrase?",
      seedPlaceholder: "e.g., Sealed envelope in home safe",
      guidanceTitle: "Arculus Recovery Guide",
      guidanceText: "Arculus is an NFC-tap card paired with a mobile app. Survivor needs the physical card AND the 6-digit PIN to unlock, OR the 12-word recovery phrase to restore on a new card. The Arculus app must be installed on a phone with NFC.",
      templateFields: [
        { label: "Card 6-digit PIN location", placeholder: "e.g., Written on slip in safe", key: "pin" },
        { label: "Arculus app installed where?", placeholder: "e.g., iPhone 15, in App Store", key: "software" },
        { label: "Which chains held?", placeholder: "e.g., BTC, ETH, USDC", key: "apps" },
      ],
    },
  },
  safepal: {
    label: "SafePal (S1 / X1)",
    category: "cold",
    icon: HardDrive,
    recoveryMethod: "12 or 24-word seed phrase, air-gapped (QR)",
    template: {
      deviceLabel: "Where is the SafePal device?",
      devicePlaceholder: "e.g., Home safe, in original SafePal box",
      seedLabel: "Where is the recovery phrase (12 or 24 words)?",
      seedPlaceholder: "e.g., Steel plate in fireproof safe",
      guidanceTitle: "SafePal Recovery Guide",
      guidanceText: "SafePal is air-gapped — communicates with its mobile app via QR codes only. Survivor needs the device + PIN, or the seed words to restore on a new SafePal. The SafePal app on a phone is required to use the device.",
      templateFields: [
        { label: "Device PIN", placeholder: "e.g., Written on card in safe", key: "pin" },
        { label: "SafePal app installed on which phone?", placeholder: "e.g., Android phone in nightstand drawer", key: "software" },
        { label: "Which chains held?", placeholder: "e.g., BTC, ETH, BNB, SOL", key: "apps" },
      ],
    },
  },
  uniswap: {
    label: "Uniswap Wallet (mobile)",
    category: "hot",
    icon: Smartphone,
    recoveryMethod: "12-word recovery phrase",
    template: {
      deviceLabel: "Where is the Uniswap Wallet installed?",
      devicePlaceholder: "e.g., iPhone, mobile app",
      seedLabel: "Where is the 12-word recovery phrase?",
      seedPlaceholder: "e.g., Written in safe, or iCloud Keychain backup",
      guidanceTitle: "Uniswap Wallet Recovery Guide",
      guidanceText: "Uniswap Wallet is a self-custody mobile wallet for Ethereum and L2s (Optimism, Arbitrum, Polygon, Base). Uses a 12-word recovery phrase. May have iCloud/Google Drive backup enabled with a separate password. Survivor imports the phrase into a new install.",
      templateFields: [
        { label: "App passcode / biometric", placeholder: "e.g., FaceID, or 6-digit PIN written in safe", key: "pin" },
        { label: "Cloud backup enabled?", placeholder: "e.g., Yes — iCloud Keychain backup, password in 1Password", key: "cloudBackup" },
        { label: "Which chains used?", placeholder: "e.g., Ethereum, Optimism, Base, Arbitrum", key: "apps" },
      ],
    },
  },
  manual: {
    label: "Manual Entry (paper / brain / custom)",
    category: "cold",
    icon: Wallet,
    recoveryMethod: "Whatever the owner describes",
    template: {
      deviceLabel: "What is being secured? (be specific)",
      devicePlaceholder: "e.g., Paper wallet for 5 BTC, generated 2014",
      seedLabel: "Where is the recovery information?",
      seedPlaceholder: "e.g., Sealed envelope at attorney's office labeled 'BTC paper'",
      guidanceTitle: "Manual Entry — Custom Wallet",
      guidanceText: "Use this for paper wallets, brain wallets, multi-sig setups, MPC wallets, or anything that doesn't fit the standard categories. Be very explicit about what kind of wallet this is, what software/library was used to create it, and exactly what the survivor needs to recover the funds.",
      templateFields: [
        { label: "Wallet type / software used to create it", placeholder: "e.g., bitaddress.org paper wallet, or Casa multi-sig 2-of-3", key: "walletDetails" },
        { label: "Recovery steps (be precise)", placeholder: "e.g., Import private key WIF into Electrum / Coordinate with co-signers at Casa", key: "steps" },
        { label: "Any time-locked or special conditions?", placeholder: "e.g., Time-locked until 2030, or requires 2 of 3 hardware co-signers", key: "conditions" },
      ],
    },
  },
  other: {
    label: "Other Wallet",
    category: "hot",
    icon: Wallet,
    recoveryMethod: "Varies — describe in notes",
    template: {
      deviceLabel: "Where is the wallet / device?",
      devicePlaceholder: "e.g., Description of where the wallet or device is located",
      seedLabel: "Where is the recovery method (seed, key, etc.)?",
      seedPlaceholder: "e.g., Describe where the backup is stored",
      guidanceTitle: "Custom Wallet Recovery Guide",
      guidanceText: "Provide as much detail as possible about how to access and recover this wallet. Include the type of wallet, where it is, what recovery method it uses, and any passwords or PINs needed.",
      templateFields: [
        { label: "Password / PIN", placeholder: "e.g., Where the password is stored", key: "pin" },
        { label: "Type of wallet and recovery method", placeholder: "e.g., Paper wallet, brain wallet, multi-sig, etc.", key: "walletDetails" },
      ],
    },
  },
};

type WalletAsset = {
  walletId: string;
  chain: string;
  address: string;
  label: string | null;
  hardwareDevice: string | null;
  assets: Array<{ symbol: string; balance: string; usdValue: string | null }>;
};

async function encryptVault(plaintext: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

function BeneficiaryCard({ beneficiary, onDelete, onEdit }: { beneficiary: LegacyPlanData["beneficiaries"][0]; onDelete: () => void; onEdit: () => void }) {
  const walletConfig = beneficiary.walletType ? WALLET_TYPES[beneficiary.walletType] : null;
  const { toast } = useToast();
  const b: any = beneficiary;
  const status: string = b.confirmationStatus || "pending";
  const isDeceased = !!b.markedDeceasedAt;
  const hasPendingChange = !!b.pendingChangeRequest;

  const resendConfirm = useMutation({
    mutationFn: () => apiRequest("POST", `/api/legacy-beneficiaries/${beneficiary.id}/resend-confirmation`),
    onSuccess: () => { toast({ title: "Confirmation resent", description: `New confirmation email sent to ${beneficiary.email}` }); queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const sendHb = useMutation({
    mutationFn: () => apiRequest("POST", `/api/legacy-beneficiaries/${beneficiary.id}/send-heartbeat`),
    onSuccess: () => { toast({ title: "Check-in sent", description: `Heartbeat email sent to ${beneficiary.email}` }); queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const markDeceased = useMutation({
    mutationFn: (deceased: boolean) => apiRequest("POST", `/api/legacy-beneficiaries/${beneficiary.id}/mark-deceased`, { deceased }),
    onSuccess: () => { toast({ title: "Updated", description: isDeceased ? "Marked as living again" : "Marked as deceased — share will redistribute on trigger" }); queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const clearFeedback = useMutation({
    mutationFn: () => apiRequest("POST", `/api/legacy-beneficiaries/${beneficiary.id}/clear-feedback`),
    onSuccess: () => { toast({ title: "Cleared" }); queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] }); },
  });

  const statusBadge = isDeceased
    ? <Badge className="text-[10px] bg-zinc-700 text-white">Marked Deceased</Badge>
    : status === "confirmed" ? <Badge className="text-[10px] bg-green-600 text-white">Confirmed</Badge>
    : status === "declined" ? <Badge className="text-[10px] bg-red-600 text-white">Declined</Badge>
    : status === "bounced" ? <Badge className="text-[10px] bg-orange-600 text-white">Bounced</Badge>
    : <Badge variant="outline" className="text-[10px]">Pending Confirmation</Badge>;

  return (
    <Card data-testid={`card-beneficiary-${beneficiary.id}`} className={isDeceased ? "opacity-60" : ""}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium" data-testid={`text-beneficiary-name-${beneficiary.id}`}>{beneficiary.name}</p>
            <p className="text-sm text-muted-foreground">{beneficiary.email}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {beneficiary.relationship && <Badge variant="outline" className="text-[10px]">{beneficiary.relationship}</Badge>}
              {b.beneficiaryGroup && <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400">Group: {b.beneficiaryGroup}</Badge>}
              {b.walletNickname && <Badge variant="outline" className="text-[10px]">{b.walletNickname}</Badge>}
              {statusBadge}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-beneficiary-${beneficiary.id}`}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-beneficiary-${beneficiary.id}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {hasPendingChange && !isDeceased && (
          <div className="text-xs rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Beneficiary submitted feedback:</p>
            <p className="whitespace-pre-wrap text-amber-800 dark:text-amber-200">{b.pendingChangeRequest}</p>
            <Button size="sm" variant="outline" onClick={() => clearFeedback.mutate()} data-testid={`button-clear-feedback-${beneficiary.id}`}>Mark Reviewed</Button>
          </div>
        )}

        {status === "declined" && !isDeceased && (
          <div className="text-xs rounded-md border border-red-500/40 bg-red-50 dark:bg-red-950/30 p-2.5 text-red-800 dark:text-red-200">
            This beneficiary declined. They will <em>still</em> receive their packet on trigger (defensive default), but consider reassigning their wallet pieces to someone else.
            {b.declineReason && <p className="mt-1 italic opacity-80">Reason: {b.declineReason}</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {!isDeceased && status !== "confirmed" && (
            <Button size="sm" variant="outline" onClick={() => resendConfirm.mutate()} disabled={resendConfirm.isPending} data-testid={`button-resend-confirm-${beneficiary.id}`} className="text-xs h-7">
              Resend Confirmation
            </Button>
          )}
          {!isDeceased && (
            <Button size="sm" variant="outline" onClick={() => sendHb.mutate()} disabled={sendHb.isPending} data-testid={`button-send-heartbeat-${beneficiary.id}`} className="text-xs h-7">
              Send Annual Check-In Now
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => markDeceased.mutate(!isDeceased)} disabled={markDeceased.isPending} data-testid={`button-mark-deceased-${beneficiary.id}`} className="text-xs h-7">
            {isDeceased ? "Mark Living Again" : "Mark Deceased"}
          </Button>
        </div>
        {walletConfig && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5">
              <walletConfig.icon className="h-3.5 w-3.5" />
              <span className="font-medium">{walletConfig.label}</span>
              <Badge variant="outline" className="text-[10px]">{walletConfig.category}</Badge>
            </div>
            <p className="text-muted-foreground">Recovery: {walletConfig.recoveryMethod}</p>
          </div>
        )}
        {beneficiary.walletAssetSummary && (
          <div className="text-xs rounded-md bg-muted/30 p-2">
            <p className="font-medium mb-1 flex items-center gap-1"><Wallet className="h-3 w-3" /> Assets on this device:</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{beneficiary.walletAssetSummary}</p>
          </div>
        )}
        {beneficiary.deviceInstructions && (
          <div className="text-xs"><span className="font-medium">Device:</span> {beneficiary.deviceInstructions}</div>
        )}
        {beneficiary.seedPhraseInstructions && (
          <div className="text-xs"><span className="font-medium">Recovery backup:</span> {beneficiary.seedPhraseInstructions}</div>
        )}
        {beneficiary.additionalNotes && (
          <div className="text-xs"><span className="font-medium">Details:</span> <span className="whitespace-pre-wrap">{beneficiary.additionalNotes}</span></div>
        )}
        {beneficiary.encryptedVault && (
          <div className="flex items-center gap-1.5">
            <Badge className="text-xs bg-blue-600 text-white" data-testid={`badge-vault-${beneficiary.id}`}>
              <Lock className="h-3 w-3 mr-1" />
              Encrypted Vault Attached
            </Badge>
            {beneficiary.encryptedVaultHint && (
              <span className="text-[10px] text-muted-foreground">Hint: {beneficiary.encryptedVaultHint}</span>
            )}
          </div>
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

function AddBeneficiaryDialog({ onAdd, splitEnabled, editBeneficiary, externalOpen, onExternalClose }: {
  onAdd: () => void;
  splitEnabled?: boolean;
  editBeneficiary?: LegacyPlanData["beneficiaries"][0] | null;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = editBeneficiary ? (externalOpen ?? false) : internalOpen;
  const setOpen = (v: boolean) => {
    if (editBeneficiary) { if (!v && onExternalClose) onExternalClose(); }
    else { setInternalOpen(v); }
  };
  const isEditing = !!editBeneficiary;
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [beneficiaryGroup, setBeneficiaryGroup] = useState("");
  const [walletNickname, setWalletNickname] = useState("");
  const [walletType, setWalletType] = useState("");
  const [deviceInstructions, setDeviceInstructions] = useState("");
  const [seedPhraseInstructions, setSeedPhraseInstructions] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [splitPieces, setSplitPieces] = useState("");
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({});
  const [walletAssetSummary, setWalletAssetSummary] = useState("");
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [vaultEnabled, setVaultEnabled] = useState(false);
  const [vaultContent, setVaultContent] = useState("");
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [vaultPassphraseConfirm, setVaultPassphraseConfirm] = useState("");
  const [vaultHint, setVaultHint] = useState("");
  const [showVaultPassphrase, setShowVaultPassphrase] = useState(false);
  const [encryptedVaultResult, setEncryptedVaultResult] = useState("");
  const [testDecryptResult, setTestDecryptResult] = useState<string | null>(null);
  const [encrypting, setEncrypting] = useState(false);

  useEffect(() => {
    if (!isEditing || !open || !editBeneficiary) return;
    if (initialized) return;
    setName(editBeneficiary.name || "");
    setEmail(editBeneficiary.email || "");
    setRelationship(editBeneficiary.relationship || "");
    setBeneficiaryGroup((editBeneficiary as any).beneficiaryGroup || "");
    setWalletNickname((editBeneficiary as any).walletNickname || "");
    setWalletType(editBeneficiary.walletType || "");
    setDeviceInstructions(editBeneficiary.deviceInstructions || "");
    setSeedPhraseInstructions(editBeneficiary.seedPhraseInstructions || "");
    setSplitPieces(editBeneficiary.splitPieces || "");
    setWalletAssetSummary(editBeneficiary.walletAssetSummary || "");

    const wt = editBeneficiary.walletType ? WALLET_TYPES[editBeneficiary.walletType] : null;
    const rawNotes = editBeneficiary.additionalNotes || "";
    if (wt && rawNotes) {
      const parsed: Record<string, string> = {};
      let remaining = rawNotes;
      for (const field of wt.template.templateFields) {
        const prefix = `${field.label}: `;
        const idx = remaining.indexOf(prefix);
        if (idx !== -1) {
          const afterPrefix = remaining.slice(idx + prefix.length);
          const lineEnd = afterPrefix.indexOf("\n");
          const val = lineEnd === -1 ? afterPrefix : afterPrefix.slice(0, lineEnd);
          parsed[field.key] = val;
          remaining = remaining.replace(`${prefix}${val}`, "").trim();
        }
      }
      setTemplateFields(parsed);
      setAdditionalNotes(remaining.replace(/^\n+/, ""));
    } else {
      setAdditionalNotes(rawNotes);
    }

    if (editBeneficiary.encryptedVault) {
      setVaultEnabled(true);
      setEncryptedVaultResult(editBeneficiary.encryptedVault);
      setVaultHint(editBeneficiary.encryptedVaultHint || "");
    }
    setInitialized(true);
  }, [open, editBeneficiary, isEditing, initialized]);

  const { data: walletAssets } = useQuery<WalletAsset[]>({
    queryKey: ["/api/legacy-plan/wallet-assets"],
    enabled: open,
  });

  const walletConfig = walletType ? WALLET_TYPES[walletType] : null;

  const filteredWallets = useMemo(() => {
    if (!walletAssets || !walletType) return [];
    return walletAssets.filter(w => {
      if (w.hardwareDevice === walletType) return true;
      if (walletType === "xaman" && w.chain === "xrp") return true;
      if (walletType === "metamask" && ["eth", "polygon", "arbitrum", "bsc", "avalanche", "optimism", "base"].includes(w.chain)) return true;
      if (walletType === "phantom" && w.chain === "sol") return true;
      return false;
    });
  }, [walletAssets, walletType]);

  const handleLoadWallets = () => {
    const selected = filteredWallets.filter(w => selectedWalletIds.includes(w.walletId));
    if (selected.length === 0) return;
    const lines: string[] = [];
    for (const w of selected) {
      const label = w.label || `${w.chain.toUpperCase()} wallet`;
      const addrShort = w.address.length > 20 ? w.address.slice(0, 8) + "..." + w.address.slice(-6) : w.address;
      lines.push(`${label} (${w.chain.toUpperCase()}) — ${addrShort}`);
      for (const a of w.assets) {
        const usd = a.usdValue ? ` (~$${Number(a.usdValue).toLocaleString()})` : "";
        lines.push(`  ${a.symbol}: ${Number(a.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })}${usd}`);
      }
    }
    setWalletAssetSummary(lines.join("\n"));
    toast({ title: "Wallet data loaded", description: `${selected.length} wallet(s) pre-filled into the asset summary.` });
  };

  const handleTemplateFieldChange = (key: string, value: string) => {
    setTemplateFields(prev => ({ ...prev, [key]: value }));
  };

  const buildAdditionalNotes = (): string => {
    const parts: string[] = [];
    if (walletConfig) {
      const filledFields = walletConfig.template.templateFields
        .filter(f => templateFields[f.key]?.trim())
        .map(f => `${f.label}: ${templateFields[f.key].trim()}`);
      if (filledFields.length > 0) {
        parts.push(filledFields.join("\n"));
      }
    }
    if (additionalNotes.trim()) parts.push(additionalNotes.trim());
    return parts.join("\n\n");
  };

  const handleEncrypt = async () => {
    if (!vaultContent.trim() || !vaultPassphrase) {
      toast({ title: "Missing information", description: "Enter the recovery text and a passphrase.", variant: "destructive" });
      return;
    }
    if (vaultPassphrase !== vaultPassphraseConfirm) {
      toast({ title: "Passphrase mismatch", description: "The passphrase and confirmation don't match.", variant: "destructive" });
      return;
    }
    if (vaultPassphrase.length < 8) {
      toast({ title: "Passphrase too short", description: "Use at least 8 characters for security.", variant: "destructive" });
      return;
    }
    setEncrypting(true);
    try {
      const encrypted = await encryptVault(vaultContent, vaultPassphrase);
      setEncryptedVaultResult(encrypted);
      toast({ title: "Encrypted successfully", description: "Your recovery data has been encrypted. Test the decryption before saving." });
    } catch {
      toast({ title: "Encryption failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setEncrypting(false);
    }
  };

  const handleTestDecrypt = async () => {
    if (!encryptedVaultResult) return;
    try {
      const raw = Uint8Array.from(atob(encryptedVaultResult), c => c.charCodeAt(0));
      const salt = raw.slice(0, 16);
      const iv = raw.slice(16, 28);
      const ciphertext = raw.slice(28);
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(vaultPassphrase), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      setTestDecryptResult(new TextDecoder().decode(decrypted));
    } catch {
      setTestDecryptResult("DECRYPTION FAILED — check your passphrase");
    }
  };

  const saveBeneficiary = useMutation({
    mutationFn: () => {
      const payload: any = {
        name, email, relationship: relationship || null,
        beneficiaryGroup: beneficiaryGroup.trim() || null,
        walletNickname: walletNickname.trim() || null,
        walletType: walletType || null,
        deviceInstructions: deviceInstructions || null,
        seedPhraseInstructions: seedPhraseInstructions || null,
        additionalNotes: buildAdditionalNotes() || null,
        splitPieces: splitPieces || null,
        encryptedVault: encryptedVaultResult || null,
        encryptedVaultHint: vaultHint || null,
        walletAssetSummary: walletAssetSummary || null,
      };
      if (isEditing && editBeneficiary) {
        return apiRequest("PATCH", `/api/legacy-beneficiaries/${editBeneficiary.id}`, payload);
      }
      return apiRequest("POST", "/api/legacy-beneficiaries", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      toast({ title: isEditing ? "Beneficiary updated" : "Beneficiary added" });
      setOpen(false);
      resetForm();
      onAdd();
    },
    onError: () => toast({ title: "Error", description: isEditing ? "Failed to update beneficiary" : "Failed to add beneficiary", variant: "destructive" }),
  });

  const resetForm = () => {
    setStep(1); setName(""); setEmail(""); setRelationship(""); setBeneficiaryGroup(""); setWalletNickname(""); setWalletType("");
    setDeviceInstructions(""); setSeedPhraseInstructions(""); setAdditionalNotes(""); setSplitPieces("");
    setTemplateFields({}); setWalletAssetSummary(""); setSelectedWalletIds([]);
    setVaultEnabled(false); setVaultContent(""); setVaultPassphrase(""); setVaultPassphraseConfirm("");
    setVaultHint(""); setEncryptedVaultResult(""); setTestDecryptResult(null); setInitialized(false);
  };

  const walletCategories = [
    { key: "cold", label: "Hardware Wallets (Cold)", icon: HardDrive },
    { key: "hot", label: "Software Wallets (Hot)", icon: Smartphone },
    { key: "exchange", label: "Exchange Accounts", icon: Globe },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button data-testid="button-add-beneficiary"><UserPlus className="h-4 w-4 mr-2" /> Add Beneficiary</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Beneficiary — Step {step} of 3</DialogTitle>
          <DialogDescription>
            {step === 1 && "Who should receive recovery instructions?"}
            {step === 2 && "Configure wallet-specific recovery template"}
            {step === 3 && "Optional: Attach encrypted recovery data"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 my-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 w-12 rounded-full ${s <= step ? "bg-amber-500" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
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
                <Label>Group (optional)</Label>
                <Input value={beneficiaryGroup} onChange={(e) => setBeneficiaryGroup(e.target.value)} placeholder="e.g., kids, siblings" data-testid="input-beneficiary-group" />
                <p className="text-[10px] text-muted-foreground">Members of the same group split a deceased member's share per-capita.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Wallet Nickname (optional)</Label>
                <Input value={walletNickname} onChange={(e) => setWalletNickname(e.target.value)} placeholder="e.g., Cold #1, Trading Ledger" data-testid="input-wallet-nickname" />
                <p className="text-[10px] text-muted-foreground">Use when you have multiple wallets of the same type.</p>
              </div>
              <div className="space-y-1">
                <Label>Wallet / Device Type *</Label>
                <Select value={walletType} onValueChange={(v) => { setWalletType(v); setTemplateFields({}); setSelectedWalletIds([]); setWalletAssetSummary(""); }}>
                  <SelectTrigger data-testid="select-wallet-type"><SelectValue placeholder="Select wallet..." /></SelectTrigger>
                  <SelectContent>
                    {walletCategories.map(cat => {
                      const items = Object.entries(WALLET_TYPES).filter(([, v]) => v.category === cat.key);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat.key}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <cat.icon className="h-3 w-3" /> {cat.label}
                          </div>
                          {items.map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem value="encrypted-vault-only">Encrypted vault only (needs passphrase)</SelectItem>
                    <SelectItem value="asset-summary-only">Asset summary only (what they hold, not how to access)</SelectItem>
                    <SelectItem value="all-instructions">All instructions (no split)</SelectItem>
                    <SelectItem value="custom">Custom split (describe in notes)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Each beneficiary only receives their assigned piece. They must collaborate to recover the wallet.</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!name || !email || !walletType} data-testid="button-next-step-1">
                Next: Recovery Template
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && walletConfig && (
          <div className="space-y-4 py-2">
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <walletConfig.icon className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-sm text-amber-700 dark:text-amber-400">{walletConfig.template.guidanceTitle}</AlertTitle>
              <AlertDescription className="text-xs text-amber-600 dark:text-amber-300">
                {walletConfig.template.guidanceText}
              </AlertDescription>
            </Alert>

            {filteredWallets.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm"><Download className="h-3.5 w-3.5 text-blue-500" /> Pre-fill from your connected wallets</Label>
                  <Button size="sm" variant="outline" onClick={handleLoadWallets} disabled={selectedWalletIds.length === 0} data-testid="button-load-wallets">
                    Load Selected
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {filteredWallets.map(w => (
                    <label key={w.walletId} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                      <Checkbox
                        checked={selectedWalletIds.includes(w.walletId)}
                        onCheckedChange={(checked) => {
                          setSelectedWalletIds(prev => checked ? [...prev, w.walletId] : prev.filter(id => id !== w.walletId));
                        }}
                        data-testid={`checkbox-wallet-${w.walletId}`}
                      />
                      <span className="font-medium">{w.label || `${w.chain.toUpperCase()} wallet`}</span>
                      <span className="text-muted-foreground">{w.chain.toUpperCase()} — {w.address.slice(0, 8)}...{w.address.slice(-4)}</span>
                      <span className="text-muted-foreground ml-auto">{w.assets.length} asset{w.assets.length !== 1 ? "s" : ""}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {walletAssetSummary && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Assets on this device (auto-filled)</Label>
                <Textarea value={walletAssetSummary} onChange={(e) => setWalletAssetSummary(e.target.value)} rows={4} className="font-mono text-xs" data-testid="input-asset-summary" />
                <p className="text-xs text-muted-foreground">You can edit this summary. It shows your survivor what's on this device so they know what to look for.</p>
              </div>
            )}

            <div className="space-y-1">
              <Label>{walletConfig.template.deviceLabel}</Label>
              <Input value={deviceInstructions} onChange={(e) => setDeviceInstructions(e.target.value)} placeholder={walletConfig.template.devicePlaceholder} data-testid="input-device-location" />
            </div>
            <div className="space-y-1">
              <Label>{walletConfig.template.seedLabel}</Label>
              <Input value={seedPhraseInstructions} onChange={(e) => setSeedPhraseInstructions(e.target.value)} placeholder={walletConfig.template.seedPlaceholder} data-testid="input-seed-location" />
              <p className="text-xs text-destructive font-medium">Never enter your actual seed phrase here — only describe WHERE it's stored.</p>
            </div>

            <Separator />
            <p className="text-xs font-medium text-muted-foreground">{walletConfig.label} — specific details your survivor will need:</p>

            {walletConfig.template.templateFields.map(field => (
              <div key={field.key} className="space-y-1">
                <Label className="text-sm">{field.label}</Label>
                <Input
                  value={templateFields[field.key] || ""}
                  onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  data-testid={`input-template-${field.key}`}
                />
              </div>
            ))}

            <div className="space-y-1">
              <Label>Additional Notes</Label>
              <Textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="Anything else the survivor should know — multi-sig details, attorney contact, safe combo, password manager access..." rows={3} data-testid="input-additional-notes" />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} data-testid="button-next-step-2">
                Next: Encrypted Vault (Optional)
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium flex items-center gap-2"><Key className="h-4 w-4 text-blue-500" /> Encrypted Recovery Vault</p>
                <p className="text-xs text-muted-foreground">Optionally encrypt sensitive recovery data (seed words, passwords) with a passphrase only you share separately.</p>
              </div>
              <Switch checked={vaultEnabled} onCheckedChange={setVaultEnabled} data-testid="switch-vault-enabled" />
            </div>

            {vaultEnabled && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Understand the risk</AlertTitle>
                  <AlertDescription className="text-xs space-y-1">
                    <p>You are about to encrypt sensitive recovery information (seed words, passwords, PINs). This data will be encrypted with AES-256-GCM in your browser before being stored. CryptoOwnBank never sees the plaintext.</p>
                    <p>The encryption passphrase must be shared separately with your survivor — verbally, in a will, or through an attorney. If they lose the passphrase, the encrypted data is unrecoverable.</p>
                    <p>This is a BACKUP to your physical seed storage, not a replacement. Your primary backup should always be physical (metal plates, paper in safes).</p>
                  </AlertDescription>
                </Alert>

                {!encryptedVaultResult ? (
                  <>
                    <div className="space-y-1">
                      <Label>Recovery data to encrypt</Label>
                      <Textarea
                        value={vaultContent}
                        onChange={(e) => setVaultContent(e.target.value)}
                        placeholder={"Enter what you want to protect, for example:\n\nSeed words: word1 word2 word3 ... word24\nPassphrase (25th word): mypassphrase\nPIN: 1234\nExchange password: ...\n\nThis text will be encrypted before leaving your browser."}
                        rows={6}
                        className="font-mono text-xs"
                        data-testid="input-vault-content"
                      />
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">This data is encrypted in your browser. It never leaves your device unencrypted.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Encryption Passphrase</Label>
                        <div className="relative">
                          <Input
                            type={showVaultPassphrase ? "text" : "password"}
                            value={vaultPassphrase}
                            onChange={(e) => setVaultPassphrase(e.target.value)}
                            placeholder="Strong passphrase (min 8 chars)"
                            data-testid="input-vault-passphrase"
                          />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowVaultPassphrase(!showVaultPassphrase)}>
                            {showVaultPassphrase ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Confirm Passphrase</Label>
                        <Input
                          type="password"
                          value={vaultPassphraseConfirm}
                          onChange={(e) => setVaultPassphraseConfirm(e.target.value)}
                          placeholder="Re-enter passphrase"
                          data-testid="input-vault-passphrase-confirm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Passphrase Hint (sent to survivor with encrypted data)</Label>
                      <Input value={vaultHint} onChange={(e) => setVaultHint(e.target.value)} placeholder="e.g., Ask my attorney for the sealed envelope labeled 'Legacy'" data-testid="input-vault-hint" />
                    </div>
                    {vaultPassphrase && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`h-2 flex-1 rounded-full ${vaultPassphrase.length >= 16 ? "bg-green-500" : vaultPassphrase.length >= 12 ? "bg-amber-500" : vaultPassphrase.length >= 8 ? "bg-orange-500" : "bg-red-500"}`} />
                        <span className="text-muted-foreground">
                          {vaultPassphrase.length >= 16 ? "Strong" : vaultPassphrase.length >= 12 ? "Good" : vaultPassphrase.length >= 8 ? "Acceptable" : "Too short"}
                        </span>
                      </div>
                    )}
                    <Button className="w-full" onClick={handleEncrypt} disabled={encrypting || !vaultContent.trim() || !vaultPassphrase || vaultPassphrase !== vaultPassphraseConfirm || vaultPassphrase.length < 8} data-testid="button-encrypt-vault">
                      <Lock className="h-4 w-4 mr-2" />
                      {encrypting ? "Encrypting..." : "Encrypt Recovery Data"}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-sm text-green-700 dark:text-green-400">Encrypted Successfully</AlertTitle>
                      <AlertDescription className="text-xs text-green-600 dark:text-green-300">
                        Your recovery data has been encrypted with AES-256-GCM. The ciphertext below will be included in the survivor's email when triggered. They must visit cryptoownbank.com/decrypt and enter your passphrase to read it.
                      </AlertDescription>
                    </Alert>
                    <div className="rounded-md bg-muted/30 border p-2 max-h-20 overflow-y-auto">
                      <p className="font-mono text-[10px] break-all text-muted-foreground">{encryptedVaultResult.slice(0, 200)}...</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleTestDecrypt} data-testid="button-test-decrypt">
                      <Unlock className="h-3.5 w-3.5 mr-1.5" />
                      Test Decrypt
                    </Button>
                    {testDecryptResult && (
                      <div className="rounded-md border p-2 bg-muted/20">
                        <p className="text-xs font-medium mb-1">Decryption test result:</p>
                        <pre className="text-xs font-mono whitespace-pre-wrap">{testDecryptResult}</pre>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setEncryptedVaultResult(""); setTestDecryptResult(null); }}>
                      Re-encrypt (start over)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!vaultEnabled && (
              <div className="text-center py-6 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No encrypted vault</p>
                <p className="text-xs">You can save without an encrypted vault. Your beneficiary will only receive the location-based instructions from the previous step.</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button
                onClick={() => saveBeneficiary.mutate()}
                disabled={!name || !email || saveBeneficiary.isPending || (vaultEnabled && !encryptedVaultResult)}
                data-testid="button-save-beneficiary"
              >
                {saveBeneficiary.isPending ? "Saving..." : isEditing ? "Update Beneficiary" : "Save Beneficiary"}
              </Button>
            </DialogFooter>
          </div>
        )}
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

  const [editingBeneficiary, setEditingBeneficiary] = useState<LegacyPlanData["beneficiaries"][0] | null>(null);

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
                  <BeneficiaryCard key={b.id} beneficiary={b} onDelete={() => deleteBeneficiary.mutate(b.id)} onEdit={() => setEditingBeneficiary(b)} />
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

      <AddBeneficiaryDialog
        onAdd={() => {}}
        splitEnabled={plan.splitDeliveryEnabled ?? false}
        editBeneficiary={editingBeneficiary}
        externalOpen={!!editingBeneficiary}
        onExternalClose={() => setEditingBeneficiary(null)}
      />

      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Security & Legal Note</p>
              <p>CryptoOwnBank never stores your seed phrases, private keys, or wallet passwords in plaintext. Location-based instructions describe WHERE your backups are stored. If you use the Encrypted Vault feature, your sensitive data is encrypted with AES-256-GCM in your browser using a passphrase only you know — CryptoOwnBank never sees the plaintext and cannot decrypt it. All beneficiary data is encrypted at rest.</p>
              <p>Your legacy plan is non-custodial — we help deliver instructions, but we never have access to your funds. CryptoOwnBank is not a fiduciary, estate planner, attorney, or financial advisor. This tool helps you organize and deliver information to your chosen beneficiaries — it does not replace a proper estate plan, will, or trust. Consult a qualified estate planning attorney for your specific legal needs.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}