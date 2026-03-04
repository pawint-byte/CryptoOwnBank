import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Wallet,
  ArrowLeft,
  Smartphone,
  Bluetooth,
  Plus,
  Link2,
  Shield,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Smartphone,
    title: "Install Xaman & Ledger Live",
    description: "Download and set up both apps if you haven't already.",
    details: [
      "Download Xaman (formerly Xumm) from the App Store or Google Play",
      "Download Ledger Live from ledger.com if you need to manage your Ledger device",
      "Make sure your Ledger Nano X firmware is up to date via Ledger Live",
      "Ensure the XRP app is installed on your Ledger device",
    ],
    tip: "Xaman is the XRPL-native wallet app that acts as a bridge between your Ledger and the XRPL ecosystem.",
  },
  {
    number: 2,
    icon: Bluetooth,
    title: "Pair Ledger to Xaman",
    description: "Connect your Ledger hardware wallet to the Xaman app via Bluetooth.",
    details: [
      "Open Xaman \u2192 Settings \u2192 Hardware Wallets \u2192 Ledger",
      "Enable Bluetooth on your phone",
      "Unlock your Ledger Nano X and open the XRP app on the device",
      "Xaman will detect and pair with your Ledger automatically",
      "Confirm the pairing on both your phone and Ledger device",
    ],
    tip: "Your Ledger stays in control of all private keys. Xaman just provides the interface — it never sees your seed phrase.",
  },
  {
    number: 3,
    icon: Plus,
    title: "Add RLUSD Trust Line",
    description: "Enable your wallet to hold RLUSD by setting up a trust line on the XRPL.",
    details: [
      "In Xaman, tap the \"+\" button or go to Add Token",
      "Search for \"RLUSD\" in the token list",
      "Tap \"Setup Trust Line\" to create the RLUSD trust line",
      "Your Ledger will prompt you to sign the TrustSet transaction — confirm on device",
      "Once confirmed, your wallet can now receive and hold RLUSD",
    ],
    tip: "A trust line is how the XRPL works — it tells the ledger your account accepts a specific token. This is a one-time setup with a small XRP reserve (~2 XRP).",
  },
  {
    number: 4,
    icon: Link2,
    title: "Connect to CryptoOwnBank",
    description: "Link your wallet to the dashboard to view balances and access Soil vaults.",
    details: [
      "On CryptoOwnBank, go to OwnBank Dashboard",
      "Click \"Connect Wallet\" \u2192 choose \"Connect Xumm\"",
      "A QR code appears — scan it with Xaman (or tap the deep link on mobile)",
      "Approve the connection request in Xaman",
      "If using Ledger + Xaman combo, Ledger may also prompt for confirmation",
      "Your wallet address and balances will appear on the dashboard",
    ],
    tip: "This is a read-only connection. We only see your public address — never your keys or seed phrase.",
  },
  {
    number: 5,
    icon: Shield,
    title: "Deposit RLUSD & Start Earning",
    description: "Deposit RLUSD into a Soil vault and start earning 5.2–7.8% APR yield.",
    details: [
      "Go to OwnBank \u2192 Vaults",
      "Choose a vault: Treasury (5.2% APR) or Private Credit (7.8% APR)",
      "Enter the amount of RLUSD you want to deposit",
      "Review the transaction preview — we pre-build everything for you",
      "Sign the deposit transaction in Xaman (Ledger confirms on device)",
      "Done — your RLUSD is now earning fixed yield!",
    ],
    tip: "Every deposit requires your cold wallet signature. We build the transaction; you approve it. Your keys never leave your device.",
  },
];

export default function SetupGuide() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A4E4]">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-semibold">CryptoOwnBank</span>
              </a>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a href="/">
                <Button variant="outline" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <Badge className="bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/30 mb-4" data-testid="badge-setup-guide">
              Setup Guide
            </Badge>
            <h1 className="text-3xl font-bold mb-3" data-testid="heading-setup-guide">
              How to Connect Ledger Nano X + Xaman for RLUSD & Soil Yield
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Follow these 5 steps to connect your Ledger hardware wallet through Xaman (Xumm),
              set up RLUSD, and start earning yield on Soil Protocol vaults — all while keeping
              your keys completely offline.
            </p>
          </div>

          <div className="rounded-lg bg-[#00A4E4]/5 border border-[#00A4E4]/20 p-4 mb-10">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[#00A4E4] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Non-Custodial — You Stay in Control</p>
                <p className="text-sm text-muted-foreground mt-1">
                  CryptoOwnBank is your helper, not your custodian. Your private keys stay on your Ledger
                  device at all times. Every transaction requires your physical confirmation. We never
                  see, store, or have access to your keys or funds.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {steps.map((step) => (
              <Card key={step.number} data-testid={`card-step-${step.number}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#00A4E4] text-white font-bold text-lg flex-shrink-0">
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <step.icon className="h-5 w-5 text-[#00A4E4]" />
                        <h2 className="text-lg font-semibold">{step.title}</h2>
                      </div>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      <ul className="space-y-2 mb-4">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Tip:</span> {step.tip}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 space-y-6">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2" data-testid="text-setup-done">You're All Set!</h3>
                    <p className="text-muted-foreground mb-4">
                      Your Ledger Nano X is paired with Xaman, your RLUSD trust line is active, and you're
                      connected to CryptoOwnBank. Now you can deposit RLUSD to Soil vaults and sign every
                      transaction with your Ledger/Xaman combo — keys always offline, site always your helper.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a href="/signup">
                        <Button className="bg-[#00A4E4] text-white hover:bg-[#0090c9]" data-testid="button-get-started">
                          Get Started Free
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </a>
                      <a href="https://xaman.app" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" data-testid="button-download-xaman">
                          Download Xaman
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3">What You'll Need</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "Ledger Nano X (with Bluetooth)",
                  "XRP app installed on Ledger",
                  "Xaman app on your phone",
                  "Some XRP for network reserves (~10 XRP)",
                  "RLUSD to deposit (buy on Binance, Kraken, or Coinbase)",
                  "A few minutes of setup time",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#00A4E4] flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-3">
          <p className="text-sm">&copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm flex-wrap justify-center">
            <a href="/setup-guide" className="text-gray-200">Setup Guide</a>
            <span>&middot;</span>
            <a href="/legal" className="hover:text-[#00A4E4] transition-colors">Legal & Disclaimers</a>
            <span>&middot;</span>
            <a href="/privacy" className="hover:text-[#00A4E4] transition-colors">Privacy Policy</a>
          </div>
          <p className="text-xs text-center">
            Non-custodial dashboard &middot; We never hold your funds or keys &middot; Not financial advice &middot; DYOR
          </p>
        </div>
      </footer>
    </div>
  );
}
