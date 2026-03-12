import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import { Wallet, ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Privacy Policy — CryptoOwnBank"
        description="CryptoOwnBank privacy policy. We collect minimal data, never store private keys, and encrypt API keys with AES-256. Your data stays yours."
        path="/privacy"
      />
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
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-privacy">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-3 text-foreground">What We Collect</h2>
              <p className="text-foreground leading-relaxed">
                We collect minimal data to provide the CryptoOwnBank service:
              </p>
              <ul className="space-y-2 mt-3 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span><strong>Wallet public address</strong> — for display only, to show your balances and transaction history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span><strong>Local preferences</strong> — stored in your browser (via localStorage), including theme, wallet connection state, and vault deposit records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span><strong>Account information</strong> — if you sign in via Replit Auth, we store your user ID and display name for session management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span><strong>Anonymized usage stats</strong> — if you enable analytics (not enabled by default)</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">What We Do NOT Collect</h2>
              <p className="text-foreground leading-relaxed">
                We do <strong>not</strong> collect, store, or have access to:
              </p>
              <ul className="space-y-2 mt-3 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span>Private keys, seed phrases, or wallet recovery information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span>Personal identifiers (name, email, phone) beyond what you provide through Replit Auth</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span>Financial data beyond what is publicly visible on-chain</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                  <span>Browsing history or cross-site tracking data</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Payment Processing</h2>
              <p className="text-foreground leading-relaxed">
                Premium subscriptions are processed through <strong>Stripe</strong>. We do not store your credit card
                number, CVC, or billing address on our servers. Stripe handles all payment data securely under their
                own privacy policy and PCI DSS compliance. We only store your Stripe customer ID and subscription ID
                to manage your subscription status.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Exchange API Keys</h2>
              <p className="text-foreground leading-relaxed">
                If you connect exchange accounts (Coinbase, Kraken, Binance, etc.) for portfolio tracking, your API
                keys are <strong>encrypted at rest using AES-256 encryption</strong> and stored in our database. We
                use read-only API permissions where possible. Your API keys are never transmitted to third parties
                or displayed in plain text after initial entry.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Cookies &amp; Local Storage</h2>
              <p className="text-foreground leading-relaxed">
                We use minimal cookies for session management and wallet connection state. Local storage is used to
                persist your preferences, vault deposit records, and referral data in your browser. No third-party
                advertising or tracking cookies are used.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Data Sharing</h2>
              <p className="text-foreground leading-relaxed">
                We do <strong>not sell your data</strong> to anyone. We do not share your information with third
                parties except as required to provide the service (e.g., Stripe for payments) or as required by law.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">GDPR / CCPA Compliance</h2>
              <p className="text-foreground leading-relaxed">
                You have the right to access, correct, or delete your personal data. Since most of your data is
                stored locally in your browser, you can delete it at any time by clearing your browser storage.
                For server-side data (account settings, API keys), contact us and we will delete your data within
                30 days. You can also disconnect your exchange integrations and delete your API keys from the
                Integrations page at any time.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Changes to This Policy</h2>
              <p className="text-foreground leading-relaxed">
                We may update this privacy policy from time to time. We will notify users of significant changes
                by updating the "Last updated" date at the top of this page. Continued use of the service after
                changes constitutes acceptance of the updated policy.
              </p>
            </div>

            <div className="border-t pt-6">
              <p className="text-foreground leading-relaxed">
                If you have questions about this privacy policy, please contact us through the site.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-3">
          <p className="text-sm">&copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm">
            <a href="/legal" className="hover:text-[#00A4E4] transition-colors">Legal &amp; Disclaimers</a>
            <span>&middot;</span>
            <span className="text-gray-200">Privacy Policy</span>
          </div>
          <p className="text-xs text-center">
            Non-custodial dashboard &middot; We never hold your funds or keys &middot; Not financial advice &middot; DYOR
          </p>
        </div>
      </footer>
    </div>
  );
}
