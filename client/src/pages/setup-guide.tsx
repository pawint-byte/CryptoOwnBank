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
  ShoppingCart,
  ScanLine,
  UserCheck,
  Landmark,
  BarChart3,
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
      "Your Ledger will prompt you to sign the TrustSet transaction \u2014 confirm on device",
      "Once confirmed, your wallet can now receive and hold RLUSD",
    ],
    tip: "A trust line is how the XRPL works \u2014 it tells the ledger your account accepts a specific token. This is a one-time setup with a small XRP reserve (~2 XRP).",
  },
  {
    number: 4,
    icon: Link2,
    title: "Connect Wallet to CryptoOwnBank",
    description: "Link your wallet to the dashboard to view balances and access Soil vaults.",
    details: [
      "On CryptoOwnBank, go to OwnBank Dashboard",
      "Click \"Connect Wallet\" \u2192 choose \"Connect Xumm\"",
      "A QR code appears \u2014 scan it with Xaman (or tap the deep link on mobile)",
      "Approve the connection request in Xaman",
      "If using Ledger + Xaman combo, Ledger may also prompt for confirmation",
      "Your wallet address and balances will appear on the dashboard",
    ],
    tip: "This is a read-only connection. We only see your public address \u2014 never your keys or seed phrase.",
  },
  {
    number: 5,
    icon: ShoppingCart,
    title: "Buy RLUSD on an Exchange",
    description: "Purchase RLUSD on a supported exchange and withdraw it to your XRPL wallet.",
    details: [
      "Log in to a supported exchange: Binance, Kraken, Coinbase, Crypto.com, or Uphold",
      "Buy RLUSD (Ripple\u2019s regulated USD stablecoin, pegged 1:1 to USD)",
      "Go to Withdraw \u2192 select RLUSD \u2192 choose XRPL as the network",
      "Paste your XRPL wallet address (starts with r\u2026 \u2014 find it in Xaman or on the CryptoOwnBank dashboard)",
      "Confirm the withdrawal \u2014 RLUSD typically arrives in seconds",
      "Your CryptoOwnBank dashboard will show the new RLUSD balance",
    ],
    tip: "Make sure you select the XRPL network when withdrawing, not Ethereum or another chain. Double-check your wallet address before sending. Start with a small test amount.",
  },
  {
    number: 6,
    icon: ScanLine,
    title: "Connect Your Wallet to Soil Protocol",
    description: "From CryptoOwnBank, you\u2019ll be redirected to Soil to connect your wallet.",
    details: [
      "On CryptoOwnBank, go to OwnBank \u2192 Vaults",
      "Click \"Deposit RLUSD\" on a vault, then click \"Deposit on Soil\"",
      "You\u2019ll be redirected to Soil Protocol\u2019s XRPL app (xrpl.soil.co)",
      "On Soil\u2019s site, click \"Launch App\" or \"XRPL App\" in the top navigation",
      "Click \"Connect Wallet\" \u2014 a QR code appears",
      "Open Xaman on your phone and scan the QR code",
      "Approve the connection request in Xaman (Ledger may prompt for confirmation)",
      "Your wallet address and RLUSD balance will appear on Soil\u2019s dashboard",
    ],
    tip: "This is a separate connection from CryptoOwnBank. Soil needs to verify your wallet to manage vault deposits. This is also non-custodial \u2014 Soil never holds your keys.",
  },
  {
    number: 7,
    icon: UserCheck,
    title: "Complete Soil KYC Verification",
    description: "Soil requires identity verification before you can deposit into vaults.",
    details: [
      "After connecting your wallet, Soil will prompt you to verify your identity",
      "Upload a clear photo of your passport or government-issued ID",
      "Complete the camera/selfie verification \u2014 follow the on-screen instructions",
      "Submit and wait for verification \u2014 this usually completes within minutes",
      "Once verified, you\u2019ll see green checkmarks: Wallet Connected, Email Verified, Identity (KYC) Verified",
      "You only need to do this once \u2014 after that, you can deposit freely",
    ],
    tip: "Soil\u2019s KYC is required because their vaults involve real-world assets (US Treasuries, private credit). This is standard for regulated yield products. CryptoOwnBank does not require KYC.",
  },
  {
    number: 8,
    icon: Landmark,
    title: "Deposit RLUSD into a Soil Vault",
    description: "Choose a vault, enter your deposit amount, and sign the transaction.",
    details: [
      "On Soil\u2019s dashboard, click \"Vaults\" in the left sidebar",
      "Choose a vault based on your goals:",
      "\u2022 Treasury (~5.2% APR) \u2014 backed by US Treasuries, 3-day rolling withdrawal, lower risk",
      "\u2022 CREDIT+ (8.0% APR) \u2014 backed by private credit, 90-day notice + 10-day cooldown, higher yield",
      "Enter the amount of RLUSD you want to deposit",
      "Click \"Deposit\" \u2014 a QR code appears",
      "Scan with Xaman \u2192 approve on your phone \u2192 confirm on Ledger if prompted",
      "You\u2019ll see \"Allocation Successful\" with your principal, APR, and status confirmed",
    ],
    tip: "You can split your RLUSD across both vaults \u2014 for example, some in Treasury for quick access and some in CREDIT+ for higher yield. Interest compounds automatically if you don\u2019t withdraw it.",
  },
  {
    number: 9,
    icon: BarChart3,
    title: "Track Your Yield",
    description: "Monitor your vault positions and accrued interest.",
    details: [
      "Return to CryptoOwnBank \u2192 OwnBank Dashboard to see your updated wallet balances",
      "Your RLUSD wallet balance will be lower (since it\u2019s now in a Soil vault earning yield)",
      "Click \"View Vault & Yield on Soil\" to see your vault position on Soil\u2019s dashboard",
      "On Soil, you\u2019ll see: Total Commitment, Total Yield, Return Rate, and SEED Bonus",
      "Interest accrues daily \u2014 check back after 24 hours to see your first yield",
      "To withdraw interest: go to CryptoOwnBank \u2192 Withdraw Interest, or manage directly on Soil",
    ],
    tip: "Your principal stays locked and protected in the vault. Only the accrued interest is withdrawable. Interest compounds automatically if left in the vault.",
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
              Complete Setup: Ledger + Xaman + Soil Vault Yield
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Follow these 9 steps to set up your cold wallet, buy RLUSD, connect to Soil Protocol,
              and start earning 5.2–8.0% fixed APR on your stablecoins — all while keeping
              your keys completely offline on your Ledger device.
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
                      Your Ledger is paired with Xaman, your RLUSD trust line is active, you're connected to
                      CryptoOwnBank and Soil Protocol, KYC is complete, and your RLUSD is earning yield in a
                      Soil vault. Track everything from your CryptoOwnBank dashboard — keys always offline,
                      yield always growing.
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
                  "RLUSD to deposit (buy on Binance, Kraken, Coinbase, or Uphold)",
                  "Valid passport or government ID (for Soil KYC verification)",
                  "About 15–20 minutes for the full setup",
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
