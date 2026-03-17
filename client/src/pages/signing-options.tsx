import { SeoHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import {
  Shield,
  Smartphone,
  Shuffle,
  CheckCircle2,
  AlertTriangle,
  Target,
  Star,
  HeartHandshake,
  Split,
} from "lucide-react";

const options = [
  {
    title: "Full Hardware Signing",
    subtitle: "Ledger Nano X + Xaman",
    icon: Shield,
    recommended: true,
    color: "text-green-600 dark:text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/5",
    howItWorks: [
      "Xaman (on your phone) builds the transaction.",
      "It automatically sends the request to your paired Ledger Nano X.",
      "You physically approve on the Ledger device (PIN + buttons).",
      "Ledger signs offline and returns the signed transaction to Xaman, which broadcasts it to the XRPL network.",
    ],
    benefits: [
      "Highest security — private keys never leave the hardware device.",
      "Industry-standard for serious self-custody users.",
      "Full protection against phone compromise.",
    ],
    risks: [
      "Requires Ledger + phone nearby for every transaction.",
      "Slightly slower (Bluetooth/USB step).",
    ],
    bestFor: "Long-term holders, larger amounts, or anyone who prioritizes maximum safety.",
  },
  {
    title: "Xaman-Only Signing",
    subtitle: "Phone App Only",
    icon: Smartphone,
    recommended: false,
    color: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/5",
    howItWorks: [
      "Enable \"Xaman signing\" in the app settings.",
      "Site sends transaction to Xaman via deep link or QR.",
      "You approve directly on your phone (PIN or biometrics).",
      "Xaman signs and broadcasts — no Ledger needed.",
    ],
    benefits: [
      "Fastest and most convenient (phone-only).",
      "Great for small/regular interest withdrawals.",
      "Still fully non-custodial (keys stay encrypted in Xaman).",
    ],
    risks: [
      "Phone-level security only (if your phone is compromised, keys could be at risk).",
      "Not as secure as hardware for large amounts.",
    ],
    bestFor: "Everyday small actions or users who want maximum convenience.",
  },
  {
    title: "Hybrid Signing",
    subtitle: "Best of Both Worlds",
    icon: Shuffle,
    recommended: false,
    color: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/5",
    howItWorks: [
      "Use Ledger + Xaman for large deposits or important actions.",
      "Switch to Xaman-only signing for small/routine interest withdrawals.",
      "You control the choice every time.",
    ],
    benefits: [
      "Best of both worlds: maximum security when it matters most + convenience for daily use.",
      "Flexible as your needs change.",
    ],
    risks: [
      "Requires you to be disciplined about when to use each method.",
    ],
    bestFor: "Most people — balance security and convenience based on the action.",
  },
];

export default function SigningOptions() {
  return (
    <div className="space-y-6">
      <SeoHead
        title="Signing Options — CryptoOwnBank | Choose Your Security Level"
        description="Compare wallet signing options for CryptoOwnBank. Ledger Nano X, Xaman (Xumm), and software signing — understand the security tradeoffs for your XRPL transactions."
        path="/signing-options"
      />
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-signing-title">
          Signing Options — Choose Your Security Level
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          CryptoOwnBank is 100% non-custodial. We never see, store, or control
          your private keys. Every transaction (deposit to Soil, withdraw
          interest, etc.) must be signed by you using your own hardware or app.
        </p>
      </div>

      <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            We give you three flexible signing options so you can balance
            convenience and maximum security. Choose the level that feels right
            for you — you can change anytime.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {options.map((option, index) => {
          const Icon = option.icon;
          return (
            <Card
              key={index}
              className={`${option.borderColor}`}
              data-testid={`card-signing-option-${index}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${option.bgColor}`}>
                    <Icon className={`h-5 w-5 ${option.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Option {index + 1}: {option.title}
                      {option.recommended && (
                        <Badge className="bg-green-600 text-white" data-testid="badge-recommended">
                          <Star className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.subtitle}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">How it works</h4>
                  <ol className="space-y-1.5">
                    {option.howItWorks.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Benefits
                    </h4>
                    <ul className="space-y-1">
                      {option.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500 mt-1 shrink-0">+</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Risks / Caveats
                    </h4>
                    <ul className="space-y-1">
                      {option.risks.map((risk, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-amber-500 mt-1 shrink-0">-</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-md bg-muted/30 border border-muted px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Target className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${option.color}`} />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Best for:</span>{" "}
                      {option.bestFor}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
            Our Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Start with <span className="font-semibold text-foreground">Full Hardware Signing (Ledger Nano X + Xaman)</span>.
            This is the most trusted and safest way to use CryptoOwnBank. Your
            private keys stay completely offline on the Ledger device at all
            times. This is the same security model used by serious long-term
            holders and institutions.
          </p>
          <p className="text-sm text-muted-foreground">
            Once you're comfortable, you can gradually enable Xaman-only signing
            for smaller actions if you want more convenience.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-[#00A4E4]" />
            Security Reminder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No matter which option you choose, you always remain in full control.
            The site only builds the transaction — you must approve every single
            action. We never see your keys. We never hold your funds. All signing
            happens on your device.
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20" data-testid="card-legacy-promo">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartHandshake className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Using a Cold Wallet? Protect It with the Legacy Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A hardware wallet is the safest way to store crypto — but what happens if you're no longer around?
            Your Ledger, CypheRock, or Coldcard sits in a safe. Your seed phrase backup is locked away.
            Without clear instructions, your family may never be able to access those funds.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Tell beneficiaries <em>where</em> the device and seed backup are — never the actual keys</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>CypheRock 2-of-5 Shamir card locations, Ledger 24-word backup location, PIN notes</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Split className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
              <span>Split delivery — split info across beneficiaries so no single person gets everything</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Dead-man switch with grace period — only triggers when you stop checking in</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild className="bg-amber-500 hover:bg-amber-600">
              <a href="/legacy-plan" data-testid="link-legacy-from-signing">Set Up Legacy Plan</a>
            </Button>
            <p className="text-xs text-muted-foreground">
              From <strong>$9.99/mo</strong> as an add-on, or <strong>included free with Pro</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      <XrplDisclaimer />
    </div>
  );
}
