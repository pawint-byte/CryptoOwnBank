import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useXrplStore } from "@/lib/xrpl-store";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary, installGlobalErrorHandlers } from "@/components/error-boundary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { MobileTabBar } from "@/components/mobile-tab-bar";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import FAQ from "@/pages/faq";
import Roadmap from "@/pages/roadmap";
import Pricing from "@/pages/pricing";
import Legal from "@/pages/legal";
import Privacy from "@/pages/privacy";
import Principles from "@/pages/principles";
import Sovereignty from "@/pages/sovereignty";
import WealthArchitecture from "@/pages/wealth-architecture";
import SovereigntyKit from "@/pages/sovereignty-kit";
import SetupGuide from "@/pages/setup-guide";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import VerifyPassphrase from "@/pages/verify-passphrase";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Portfolio from "@/pages/portfolio";
import TaxReports from "@/pages/tax-reports";
import Integrations from "@/pages/integrations";
import Settings from "@/pages/settings";
import DvpnDirectory from "@/pages/dvpn-directory";
import OwnBankDashboard from "@/pages/ownbank-dashboard";
import OwnBankVaults from "@/pages/ownbank-vaults";
import OwnBankWithdraw from "@/pages/ownbank-withdraw";
import OwnBankHistory from "@/pages/ownbank-history";
import OwnBankReferrals from "@/pages/ownbank-referrals";
import SigningOptions from "@/pages/signing-options";
import OwnBankTokens from "@/pages/ownbank-tokens";
import OwnBankDex from "@/pages/ownbank-dex";
import EvmSwap from "@/pages/evm-swap";
import TokenResearch from "@/pages/token-research";
import CrossChainSwap from "@/pages/cross-chain-swap";
import XrplBridge from "@/pages/xrpl-bridge";
import OwnBankSend from "@/pages/ownbank-send";
import OwnBankTransfer from "@/pages/ownbank-transfer";
import Contact from "@/pages/contact";
import AdminUsers from "@/pages/admin-users";
import AdminMetrics from "@/pages/admin-metrics";
import AdminApiWatch from "@/pages/admin-api-watch";
import AdminVaultBlocklist from "@/pages/admin-vault-blocklist";
import AdminAnnouncements from "@/pages/admin-announcements";
import YieldCalculator from "@/pages/yield-calculator";
import PriceAlerts from "@/pages/price-alerts";
import WalletsPage from "@/pages/wallets";
import StatementInsights from "@/pages/statement-insights";
import Reconciliation from "@/pages/reconciliation";
import MigrationGuide from "@/pages/migration-guide";
import OwnBankInvoices from "@/pages/ownbank-invoices";
import PayPage from "@/pages/pay";
import StellarRemittances from "@/pages/stellar-remittances";
import StellarSend from "@/pages/stellar-send";
import StellarWallet from "@/pages/stellar-wallet";
import StellarTokens from "@/pages/stellar-tokens";
import StellarInvoices from "@/pages/stellar-invoices";
import StellarDex from "@/pages/stellar-dex";
import ChainGuide from "@/pages/chain-guide";
import NativeStaking from "@/pages/native-staking";
import Stablecoins from "@/pages/stablecoins";
import RwaYields from "@/pages/rwa-yields";
import QuickStart from "@/pages/quick-start";
import Insurance from "@/pages/insurance";
import DeFiBorrowing from "@/pages/defi-borrowing";
import AavePage from "@/pages/aave";
import RecurringPayments from "@/pages/recurring-payments";
import DcaOrders from "@/pages/dca-orders";
import BitcoinLightning from "@/pages/bitcoin-lightning";
import { Card, CardContent } from "@/components/ui/card";
import { Button as UiButton } from "@/components/ui/button";
import TokenBuckets from "@/pages/token-buckets";
import MyCard from "@/pages/my-card";
import Snapshot from "@/pages/snapshot";
import WhisperView from "@/pages/whisper-view";
import Whispers from "@/pages/whispers";
import PaymentQueue from "@/pages/payment-queue";
import PaymentsHub from "@/pages/payments-hub";
import WhaleAlerts from "@/pages/whale-alerts";
import CryptoNews from "@/pages/crypto-news";
import TechnicalAnalysis from "@/pages/technical-analysis";
import AdminErrorMonitor from "@/pages/admin-error-monitor";
import XLS66Lending from "@/pages/xls66-lending";
import LegacyPlan from "@/pages/legacy-plan";
import FamilyPage from "@/pages/family";
import FamilyAcceptPage from "@/pages/family-accept";
import FamilyViewPage from "@/pages/family-view";
import LearnSlip39 from "@/pages/learn-slip39";
import Slip39Setup from "@/pages/slip39-setup";
import LegacyObject from "@/pages/legacy-object";
import AmmPools from "@/pages/amm-pools";
import FlareFtso from "@/pages/flare-ftso";
import BuyCrypto from "@/pages/buy-crypto";
import WalletCreate from "@/pages/wallet-create";
import HelpIndex from "@/pages/help-index";
import HelpCreateWallet from "@/pages/help-create-wallet";
import CryptoDebitCards from "@/pages/crypto-debit-cards";
import DecryptPage from "@/pages/decrypt";
import AiAssistant from "@/pages/ai-assistant";
import { OfflineBanner } from "@/components/offline-banner";

const TOS_LAST_UPDATED = new Date("2026-03-21T00:00:00Z");

function TosAcceptanceModal() {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);

  const needsAcceptance = user && !user.tosAcceptedAt;
  const needsReAcceptance = user?.tosAcceptedAt && new Date(user.tosAcceptedAt) < TOS_LAST_UPDATED;
  const showModal = needsAcceptance || needsReAcceptance;

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/accept-tos", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to accept terms");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  if (!showModal) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="heading-tos-modal">
            <Shield className="h-5 w-5 text-[#00A4E4]" />
            {needsReAcceptance ? "Updated Terms of Service" : "Terms of Service"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          {needsReAcceptance ? (
            <p>We've updated our Terms of Service and Privacy Policy to cover new features including DEX trading, EVM swaps, cross-chain bridging, and more. Please review and accept to continue.</p>
          ) : (
            <p>Please review and accept our Terms of Service and Privacy Policy to continue using CryptoOwnBank.</p>
          )}
          <div className="flex flex-col gap-2 text-xs">
            <a href="/legal" target="_blank" className="text-[#00A4E4] hover:underline font-medium">Read Terms of Service</a>
            <a href="/privacy" target="_blank" className="text-[#00A4E4] hover:underline font-medium">Read Privacy Policy</a>
          </div>
          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="tosModalAccept"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#00A4E4] cursor-pointer"
              data-testid="checkbox-tos-modal-accept"
            />
            <label htmlFor="tosModalAccept" className="text-xs cursor-pointer leading-relaxed">
              I have read and agree to the Terms of Service and Privacy Policy
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full bg-[#00A4E4] hover:bg-[#0090c9]"
            disabled={!accepted || acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
            data-testid="button-accept-tos"
          >
            {acceptMutation.isPending ? "Accepting..." : "Accept & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <TosAcceptanceModal />
      <div className="flex flex-col h-screen w-full">
        <div className="bg-[#00A4E4] text-white text-center py-1 text-xs font-medium shrink-0" data-testid="banner-beta-app">
          Beta — Early Access &middot; Your feedback shapes the product
        </div>
        <OfflineBanner />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-14 items-center justify-between gap-4 border-b px-4 lg:px-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 md:pb-6">
              {children}
              <footer className="mt-8 pt-4 border-t text-center space-y-1" data-testid="footer-app">
                <p className="text-xs text-muted-foreground">
                  &copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.
                  {" "}&middot;{" "}
                  <a href="/principles" className="hover:text-foreground transition-colors underline-offset-4 hover:underline" data-testid="link-principles-footer-app">Our Principles</a>
                  {" "}&middot;{" "}
                  <a href="/sovereignty" className="hover:text-foreground transition-colors underline-offset-4 hover:underline" data-testid="link-sovereignty-footer-app">Sovereignty</a>
                  {" "}&middot;{" "}
                  <a href="/legal" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">Legal</a>
                  {" "}&middot;{" "}
                  <a href="/privacy" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">Privacy</a>
                  {" "}&middot;{" "}
                  <a href="/contact" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">Contact</a>
                </p>
                <p className="text-[10px] text-muted-foreground/60 max-w-2xl mx-auto leading-relaxed">
                  Non-custodial dashboard. We never hold your funds or keys. Not financial, tax, or legal advice. Crypto carries risk including loss of principal. DYOR.
                </p>
              </footer>
            </main>
          </div>
        </div>
        <MobileTabBar />
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedRoutes() {
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/whispers" component={Whispers} />
        <Route path="/tax-reports" component={TaxReports} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/settings" component={Settings} />
        <Route path="/dvpn" component={DvpnDirectory} />
        <Route path="/ownbank" component={OwnBankDashboard} />
        <Route path="/ownbank/vaults" component={OwnBankVaults} />
        <Route path="/ownbank/withdraw" component={OwnBankWithdraw} />
        <Route path="/ownbank/history" component={OwnBankHistory} />
        <Route path="/ownbank/referrals" component={OwnBankReferrals} />
        <Route path="/ownbank/signing-options" component={SigningOptions} />
        <Route path="/ownbank/tokens" component={OwnBankTokens} />
        <Route path="/ownbank/dex" component={OwnBankDex} />
        <Route path="/ownbank/evm-swap" component={EvmSwap} />
        <Route path="/token-research" component={TokenResearch} />
        <Route path="/ownbank/cross-chain" component={CrossChainSwap} />
        <Route path="/ownbank/xrpl-bridge" component={XrplBridge} />
        <Route path="/ownbank/send" component={OwnBankSend} />
        <Route path="/ownbank/transfer" component={OwnBankTransfer} />
        <Route path="/ownbank/invoices" component={OwnBankInvoices} />
        <Route path="/ownbank/dca" component={DcaOrders} />
        <Route path="/bitcoin" component={BitcoinLightning} />
        <Route path="/bitcoin/send" component={BitcoinLightning} />
        {/* <Route path="/token-buckets" component={TokenBuckets} /> */}{/* TODO: Hidden until cross-chain bucket execution is built */}
        <Route path="/ownbank/recurring" component={RecurringPayments} />
        <Route path="/stellar/dca" component={DcaOrders} />
        <Route path="/stellar/recurring" component={RecurringPayments} />
        <Route path="/ownbank/my-card" component={MyCard} />
        <Route path="/ownbank/payment-queue" component={PaymentQueue} />
        <Route path="/stellar/payment-queue" component={PaymentQueue} />
        <Route path="/payments" component={PaymentsHub} />
        <Route path="/stellar/wallet" component={StellarWallet} />
        <Route path="/stellar/dex" component={StellarDex} />
        <Route path="/stellar/send" component={StellarSend} />
        <Route path="/stellar/tokens" component={StellarTokens} />
        <Route path="/stellar/invoices" component={StellarInvoices} />
        <Route path="/stellar/remittances" component={StellarRemittances} />
        <Route path="/price-alerts" component={PriceAlerts} />
        <Route path="/whale-alerts" component={WhaleAlerts} />
        <Route path="/crypto-news" component={CryptoNews} />
        <Route path="/technical-analysis" component={TechnicalAnalysis} />
        <Route path="/wallets" component={WalletsPage} />
        <Route path="/statement-insights" component={StatementInsights} />
        <Route path="/reconciliation" component={Reconciliation} />
        <Route path="/chain-guide" component={ChainGuide} />
        <Route path="/rwa-yields" component={RwaYields} />
        <Route path="/stablecoins" component={Stablecoins} />
        <Route path="/quick-start" component={QuickStart} />
        <Route path="/insurance" component={Insurance} />
        <Route path="/defi-borrowing" component={DeFiBorrowing} />
        <Route path="/aave" component={AavePage} />
        <Route path="/xls66-lending" component={XLS66Lending} />
        <Route path="/sovereignty-kit" component={SovereigntyKit} />
        <Route path="/sovereignty/wealth-architecture" component={WealthArchitecture} />
        <Route path="/legacy-plan" component={LegacyPlan} />
        <Route path="/family" component={FamilyPage} />
        <Route path="/family/view/:seatId" component={FamilyViewPage} />
        <Route path="/family/accept/:token" component={FamilyAcceptPage} />
        <Route path="/legacy-plan/learn-slip39" component={LearnSlip39} />
        <Route path="/legacy-plan/slip39-setup" component={Slip39Setup} />
        <Route path="/legacy-plan/object/:token" component={LegacyObject} />
        <Route path="/amm-pools" component={AmmPools} />
        <Route path="/flare" component={FlareFtso} />
        <Route path="/native-staking" component={NativeStaking} />
        <Route path="/ai-assistant" component={AiAssistant} />
        <Route path="/buy-crypto" component={BuyCrypto} />
        <Route path="/wallet/create" component={WalletCreate} />
        <Route path="/help" component={HelpIndex} />
        <Route path="/help/create-wallet" component={HelpCreateWallet} />
        <Route path="/crypto-debit-cards" component={CryptoDebitCards} />
        <Route path="/migration-guide" component={MigrationGuide} />
        <Route path="/faq" component={FAQ} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/metrics" component={AdminMetrics} />
        <Route path="/admin/api-watch" component={AdminApiWatch} />
        <Route path="/admin/errors" component={AdminErrorMonitor} />
        <Route path="/admin/vault-blocklist" component={AdminVaultBlocklist} />
        <Route path="/admin/announcements" component={AdminAnnouncements} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/legal" component={Legal} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/principles" component={Principles} />
        <Route path="/sovereignty" component={Sovereignty} />
        <Route path="/sovereignty/wealth-architecture" component={WealthArchitecture} />
        <Route path="/setup-guide" component={SetupGuide} />
        <Route path="/signing-options" component={SigningOptions} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/chain-guide" component={ChainGuide} />
        <Route path="/rwa-yields" component={RwaYields} />
        <Route path="/stablecoins" component={Stablecoins} />
        <Route path="/insurance" component={Insurance} />
        <Route path="/stellar/wallet" component={StellarWallet} />
        <Route path="/stellar/dex" component={StellarDex} />
        <Route path="/stellar/dca" component={DcaOrders} />
        <Route path="/stellar/send" component={StellarSend} />
        <Route path="/stellar/tokens" component={StellarTokens} />
        <Route path="/stellar/invoices" component={StellarInvoices} />
        <Route path="/stellar/remittances" component={StellarRemittances} />
        <Route path="/migration-guide" component={MigrationGuide} />
        <Route path="/native-staking" component={NativeStaking} />
        <Route path="/amm-pools" component={AmmPools} />
        <Route path="/flare" component={FlareFtso} />
        <Route path="/buy-crypto" component={BuyCrypto} />
        <Route path="/wallet/create" component={WalletCreate} />
        <Route path="/help" component={HelpIndex} />
        <Route path="/help/create-wallet" component={HelpCreateWallet} />
        <Route path="/crypto-debit-cards" component={CryptoDebitCards} />
        <Route path="/yield-calculator" component={YieldCalculator} />
        <Route path="/pay" component={PayPage} />
        <Route path="/decrypt" component={DecryptPage} />
        <Route path="/legacy-plan/learn-slip39" component={LearnSlip39} />
        <Route path="/legacy-plan/slip39-setup" component={Slip39Setup} />
        <Route path="/legacy-plan/object/:token" component={LegacyObject} />
        <Route path="/snapshot/:token" component={Snapshot} />
        <Route path="/v/:token" component={WhisperView} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route path="/verify-email/:token" component={VerifyEmail} />
        <Route path="/verify-passphrase/:token?" component={VerifyPassphrase} />
        <Route path="/verify-passphrase" component={VerifyPassphrase} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/legal" component={Legal} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/principles" component={Principles} />
      <Route path="/sovereignty" component={Sovereignty} />
      <Route path="/sovereignty/wealth-architecture" component={WealthArchitecture} />
      <Route path="/setup-guide" component={SetupGuide} />
      <Route path="/signing-options" component={SigningOptions} />
      <Route path="/contact" component={Contact} />
      <Route path="/yield-calculator" component={YieldCalculator} />
      <Route path="/pay" component={PayPage} />
      <Route path="/decrypt" component={DecryptPage} />
      <Route path="/legacy-plan/learn-slip39" component={LearnSlip39} />
      <Route path="/legacy-plan/slip39-setup" component={Slip39Setup} />
        <Route path="/legacy-plan/object/:token" component={LegacyObject} />
      <Route path="/snapshot/:token" component={Snapshot} />
      <Route path="/v/:token" component={WhisperView} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify-email/:token" component={VerifyEmail} />
      <Route><AuthenticatedRoutes /></Route>
    </Switch>
  );
}

function ReferralDetector() {
  const { referredBy, setReferredBy } = useXrplStore();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode && !referredBy) {
      setReferredBy(refCode);
      toast({
        title: "Welcome via referral!",
        description:
          "Thanks for coming via referral! Your referrer gets bonus points when you deposit.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  return null;
}

installGlobalErrorHandlers();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="cryptobroker-theme">
          <TooltipProvider>
            <ReferralDetector />
            <Toaster />
            <PWAInstallPrompt />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
