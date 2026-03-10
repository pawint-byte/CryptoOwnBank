import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useXrplStore } from "@/lib/xrpl-store";
import { useToast } from "@/hooks/use-toast";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import FAQ from "@/pages/faq";
import Legal from "@/pages/legal";
import Privacy from "@/pages/privacy";
import SetupGuide from "@/pages/setup-guide";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Portfolio from "@/pages/portfolio";
import TaxReports from "@/pages/tax-reports";
import Integrations from "@/pages/integrations";
import Settings from "@/pages/settings";
import OwnBankDashboard from "@/pages/ownbank-dashboard";
import OwnBankVaults from "@/pages/ownbank-vaults";
import OwnBankWithdraw from "@/pages/ownbank-withdraw";
import OwnBankHistory from "@/pages/ownbank-history";
import OwnBankReferrals from "@/pages/ownbank-referrals";
import SigningOptions from "@/pages/signing-options";
import OwnBankTokens from "@/pages/ownbank-tokens";
import OwnBankDex from "@/pages/ownbank-dex";
import OwnBankSend from "@/pages/ownbank-send";
import Contact from "@/pages/contact";
import AdminUsers from "@/pages/admin-users";
import AdminMetrics from "@/pages/admin-metrics";
import YieldCalculator from "@/pages/yield-calculator";
import PriceAlerts from "@/pages/price-alerts";
import WalletsPage from "@/pages/wallets";
import StatementInsights from "@/pages/statement-insights";
import Reconciliation from "@/pages/reconciliation";
import MigrationGuide from "@/pages/migration-guide";
import OwnBankInvoices from "@/pages/ownbank-invoices";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex flex-col h-screen w-full">
        <div className="bg-[#00A4E4] text-white text-center py-1 text-xs font-medium shrink-0" data-testid="banner-beta-app">
          Beta — Early Access &middot; Your feedback shapes the product
        </div>
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-14 items-center justify-between gap-4 border-b px-4 lg:px-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto p-4 lg:p-6">
              {children}
              <footer className="mt-8 pt-4 border-t text-center space-y-1" data-testid="footer-app">
                <p className="text-xs text-muted-foreground">
                  &copy; {new Date().getFullYear()} CryptoOwnBank. All rights reserved.
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
        <Route path="/tax-reports" component={TaxReports} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/settings" component={Settings} />
        <Route path="/ownbank" component={OwnBankDashboard} />
        <Route path="/ownbank/vaults" component={OwnBankVaults} />
        <Route path="/ownbank/withdraw" component={OwnBankWithdraw} />
        <Route path="/ownbank/history" component={OwnBankHistory} />
        <Route path="/ownbank/referrals" component={OwnBankReferrals} />
        <Route path="/ownbank/signing-options" component={SigningOptions} />
        <Route path="/ownbank/tokens" component={OwnBankTokens} />
        <Route path="/ownbank/dex" component={OwnBankDex} />
        <Route path="/ownbank/send" component={OwnBankSend} />
        <Route path="/ownbank/invoices" component={OwnBankInvoices} />
        <Route path="/price-alerts" component={PriceAlerts} />
        <Route path="/wallets" component={WalletsPage} />
        <Route path="/statement-insights" component={StatementInsights} />
        <Route path="/reconciliation" component={Reconciliation} />
        <Route path="/migration-guide" component={MigrationGuide} />
        <Route path="/faq" component={FAQ} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/metrics" component={AdminMetrics} />
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
        <Route path="/setup-guide" component={SetupGuide} />
        <Route path="/signing-options" component={SigningOptions} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/migration-guide" component={MigrationGuide} />
        <Route path="/yield-calculator" component={YieldCalculator} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route path="/verify-email/:token" component={VerifyEmail} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/legal" component={Legal} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/setup-guide" component={SetupGuide} />
      <Route path="/signing-options" component={SigningOptions} />
      <Route path="/contact" component={Contact} />
      <Route path="/yield-calculator" component={YieldCalculator} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="cryptobroker-theme">
        <TooltipProvider>
          <ReferralDetector />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
