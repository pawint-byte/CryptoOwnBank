import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import { Wallet, ArrowLeft } from "lucide-react";

export default function Legal() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Legal & Disclaimers — CryptoOwnBank"
        description="Legal disclaimers, terms of use, and regulatory information for CryptoOwnBank. Non-custodial dashboard — we never hold your funds or keys."
        path="/legal"
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
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-legal">Legal &amp; Disclaimers</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-foreground leading-relaxed">
              CryptoOwnBank.com is a <strong>non-custodial</strong>, open-source-inspired web dashboard that helps users
              interact with public blockchains (primarily the XRP Ledger) and third-party protocols such as Soil.
              We do <strong>not</strong>:
            </p>

            <ul className="space-y-2 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                <span>Hold, control, custody, or have access to your funds or private keys</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                <span>Act as a bank, exchange, broker, money transmitter, investment adviser, or custodian</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                <span>Execute transactions on your behalf</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1.5 text-xs">&#9679;</span>
                <span>Provide personalized financial, investment, tax, or legal advice</span>
              </li>
            </ul>

            <p className="text-foreground leading-relaxed">
              <strong>All interactions</strong> (wallet connections, deposits, withdrawals, etc.) are signed directly
              from <strong>your own cold wallet</strong> (Ledger, Xaman, etc.). We never receive or store your private
              keys, seed phrases, or any sensitive information.
            </p>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">No Financial Advice</h2>
              <p className="text-foreground leading-relaxed">
                The information, tools, and features on this site are for informational and convenience purposes only.
                Any references to yields, APRs, vaults, or protocols (including Soil) are based on publicly available
                data and are <strong>not guarantees</strong> of future performance. Cryptocurrency, blockchain protocols,
                and yield opportunities involve significant risk, including total loss of principal. Past performance is
                not indicative of future results. You are solely responsible for your own decisions. Always do your own
                research (DYOR) and consult qualified professionals before making financial decisions.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Third-Party Protocols &amp; Links</h2>
              <p className="text-foreground leading-relaxed">
                Links to Soil, exchanges (Binance, Kraken, Coinbase, etc.), or other services are provided for
                convenience. We may earn referral rewards or SEED points if you use them — this is clearly disclosed
                where applicable. We do not control, endorse, or guarantee the safety, performance, or availability
                of any third-party service. Use them at your own risk.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">No Warranty</h2>
              <p className="text-foreground leading-relaxed">
                This site is provided "as is" without warranties of any kind, express or implied. We are not liable
                for any losses, damages, or issues arising from your use of the site, wallet connections, blockchain
                transactions, or third-party protocols.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Jurisdiction &amp; Governing Law</h2>
              <p className="text-foreground leading-relaxed">
                This site is operated from the United States. By using it, you agree that any disputes will be governed
                by the laws of the Commonwealth of Virginia, without regard to conflict of law principles.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Limitation of Liability</h2>
              <p className="text-foreground leading-relaxed">
                To the maximum extent permitted by applicable law, CryptoOwnBank, its operators, affiliates, and
                contributors shall not be liable for any indirect, incidental, special, consequential, or punitive
                damages, or any loss of profits, revenue, data, or goodwill, arising out of or in connection with
                your use of this site, wallet connections, blockchain transactions, third-party protocols, or any
                content provided herein — whether based on contract, tort, strict liability, or any other legal
                theory, even if we have been advised of the possibility of such damages.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Indemnification</h2>
              <p className="text-foreground leading-relaxed">
                You agree to indemnify, defend, and hold harmless CryptoOwnBank, its operators, affiliates,
                employees, and agents from and against any claims, liabilities, damages, losses, and expenses
                (including reasonable attorneys' fees) arising out of or in any way connected with your access
                to or use of the site, your violation of these terms, or your violation of any rights of any
                third party.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Eligibility &amp; Age Requirement</h2>
              <p className="text-foreground leading-relaxed">
                You must be at least 18 years of age (or the age of majority in your jurisdiction) to use
                this site. By using CryptoOwnBank, you represent and warrant that you meet this requirement
                and that you are not prohibited from using cryptocurrency services under the laws of your
                jurisdiction.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Prohibited Use</h2>
              <p className="text-foreground leading-relaxed">
                You agree not to use CryptoOwnBank for any unlawful purpose, including but not limited to
                money laundering, terrorist financing, fraud, or any activity that violates applicable local,
                state, national, or international laws or regulations. We reserve the right to terminate access
                to any user we reasonably suspect of engaging in prohibited activities.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Regulatory Compliance</h2>
              <p className="text-foreground leading-relaxed">
                CryptoOwnBank operates as a non-custodial software interface. We do not transmit money, hold
                customer funds, or facilitate the exchange of fiat currency and digital assets. Users are
                solely responsible for ensuring their use of this site complies with all applicable laws and
                regulations in their jurisdiction. Cryptocurrency regulations vary by location — it is your
                responsibility to understand and comply with local requirements.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Intellectual Property</h2>
              <p className="text-foreground leading-relaxed">
                All content, branding, logos, and software on this site are the property of CryptoOwnBank
                or its licensors. You may not reproduce, distribute, modify, or create derivative works
                without prior written consent.
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Changes to This Page</h2>
              <p className="text-foreground leading-relaxed">
                We may update this page from time to time. Material changes will be highlighted on the site.
                Continued use after changes constitutes acceptance of the revised terms.
              </p>
            </div>

            <div className="border-t pt-6">
              <p className="text-foreground leading-relaxed">
                If you have questions about these terms, contact us via the site (no support for wallet recovery or
                fund issues — we cannot assist with those).
              </p>
              <p className="text-foreground leading-relaxed mt-4 font-medium">
                Thank you for using CryptoOwnBank responsibly.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-3">
          <p className="text-sm">&copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-200">Legal &amp; Disclaimers</span>
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
