import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  TrendingUp,
  Wallet,
  ArrowRight,
  Landmark,
  Briefcase,
  DollarSign,
  BookOpen,
  Shield,
} from "lucide-react";

const VAULTS = [
  { id: "soil-treasury", name: "Treasury Vault", apr: 5.2, icon: Landmark, risk: "Lower risk", backing: "US Treasuries" },
  { id: "soil-credit-plus", name: "CREDIT+ Vault", apr: 8.0, icon: Briefcase, risk: "Higher risk", backing: "Private Credit" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function calculateEarnings(
  principal: number,
  aprPercent: number,
  compound: boolean
) {
  const apr = aprPercent / 100;

  if (compound) {
    const dailyRate = apr / 365;
    const daily = principal * ((1 + dailyRate) ** 1 - 1);
    const weekly = principal * ((1 + dailyRate) ** 7 - 1);
    const monthly = principal * ((1 + dailyRate) ** 30 - 1);
    const yearly = principal * ((1 + dailyRate) ** 365 - 1);
    return { daily, weekly, monthly, yearly };
  }

  const daily = (principal * apr) / 365;
  const weekly = (principal * apr) / 52;
  const monthly = (principal * apr) / 12;
  const yearly = principal * apr;
  return { daily, weekly, monthly, yearly };
}

export default function YieldCalculator() {
  const [depositAmount, setDepositAmount] = useState("10000");
  const [selectedVaultId, setSelectedVaultId] = useState("soil-treasury");
  const [isCompound, setIsCompound] = useState(true);

  const selectedVault = VAULTS.find((v) => v.id === selectedVaultId) || VAULTS[0];
  const amount = parseFloat(depositAmount) || 0;

  const earnings = useMemo(
    () => calculateEarnings(amount, selectedVault.apr, isCompound),
    [amount, selectedVault.apr, isCompound]
  );

  useEffect(() => {
    document.title = "Yield Calculator — CryptoOwnBank | Estimate RLUSD Earnings";
    const metaDesc = document.querySelector('meta[name="description"]');
    const content =
      "Calculate your projected earnings on RLUSD with Soil Protocol vaults. Compare Treasury (5.2% APR) and CREDIT+ (8.0% APR) returns with compound or simple interest.";
    if (metaDesc) {
      metaDesc.setAttribute("content", content);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = content;
      document.head.appendChild(meta);
    }
    return () => {
      document.title = "CryptoOwnBank";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#00A4E4]">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold" data-testid="text-brand-name">CryptoOwnBank</span>
            </a>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <a href="/login">
                <Button size="sm" data-testid="button-login">Sign In</Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-sm font-medium mb-4">
            <Calculator className="h-3.5 w-3.5" />
            Yield Calculator
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" data-testid="heading-yield-calculator">
            How Much Can You Earn?
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enter your deposit amount, pick a vault, and see your projected daily, weekly, monthly, and yearly earnings on RLUSD.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-[#00A4E4]" />
                Your Deposit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Deposit Amount (USD)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 10000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  data-testid="input-deposit-amount"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {[1000, 5000, 10000, 50000].map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount(preset.toString())}
                      data-testid={`button-preset-${preset}`}
                    >
                      ${preset.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Vault</Label>
                <Select value={selectedVaultId} onValueChange={setSelectedVaultId}>
                  <SelectTrigger data-testid="select-vault">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAULTS.map((vault) => (
                      <SelectItem key={vault.id} value={vault.id}>
                        {vault.name} — {vault.apr}% APR
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    data-testid="badge-vault-risk"
                  >
                    {selectedVault.risk}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    data-testid="badge-vault-backing"
                  >
                    {selectedVault.backing}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="compound-toggle" className="text-sm font-medium">
                    Compound Interest
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isCompound
                      ? "Earnings reinvested daily"
                      : "Simple interest (no reinvestment)"}
                  </p>
                </div>
                <Switch
                  id="compound-toggle"
                  checked={isCompound}
                  onCheckedChange={setIsCompound}
                  data-testid="switch-compound"
                />
              </div>

              <div className="rounded-md bg-[#00A4E4]/5 border border-[#00A4E4]/20 p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your principal stays locked and protected. Only earned interest can be withdrawn. Soil vaults automatically compound if you don't withdraw.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-[#00A4E4]" />
                  Projected Earnings
                  <Badge className="bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/30 ml-auto">
                    {selectedVault.apr}% APR
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {amount > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                        <TableHead className="text-right">Total Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { label: "Daily", value: earnings.daily, days: 1 },
                        { label: "Weekly", value: earnings.weekly, days: 7 },
                        { label: "Monthly", value: earnings.monthly, days: 30 },
                        { label: "Yearly", value: earnings.yearly, days: 365 },
                      ].map((row) => (
                        <TableRow key={row.label} data-testid={`row-${row.label.toLowerCase()}`}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                            +{formatCurrency(row.value)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(amount + row.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-state">
                    Enter a deposit amount to see projected earnings.
                  </div>
                )}
              </CardContent>
            </Card>

            {amount > 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Monthly Passive Income</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-monthly-income">
                      +{formatCurrency(earnings.monthly)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isCompound ? "with compounding" : "simple interest"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">After 1 Year</p>
                    <p className="text-2xl font-bold" data-testid="text-yearly-total">
                      {formatCurrency(amount + earnings.yearly)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      +{formatCurrency(earnings.yearly)} earned
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {amount > 0 && (
              <div className="flex justify-center">
                <Link href="/ownbank/vaults" data-testid="link-deposit-now">
                  <Button className="bg-[#00A4E4] text-white border-[#00A4E4]">
                    <Wallet className="h-4 w-4 mr-2" />
                    Deposit into {selectedVault.name} Vault
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}

            {amount > 0 && VAULTS.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Compare Both Vaults</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vault</TableHead>
                        <TableHead className="text-right">APR</TableHead>
                        <TableHead className="text-right">Monthly</TableHead>
                        <TableHead className="text-right">Yearly</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {VAULTS.map((vault) => {
                        const e = calculateEarnings(amount, vault.apr, isCompound);
                        return (
                          <TableRow
                            key={vault.id}
                            className={vault.id === selectedVaultId ? "bg-muted/50" : ""}
                            data-testid={`row-compare-${vault.id}`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <vault.icon className="h-4 w-4 text-[#00A4E4]" />
                                {vault.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/30">
                                {vault.apr}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">
                              +{formatCurrency(e.monthly)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                              +{formatCurrency(e.yearly)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <Card className="hover-elevate">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 rounded-md bg-[#00A4E4] flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start Earning — Sign Up Free</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect your cold wallet and deposit RLUSD to start earning real yield today.
                </p>
                <a href="/signup">
                  <Button className="bg-[#00A4E4] text-white border-[#00A4E4]" data-testid="button-cta-signup">
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Learn How to Deposit</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Step-by-step guide: buy RLUSD, connect your wallet, and deposit into Soil vaults.
                </p>
                <a href="/setup-guide">
                  <Button variant="outline" data-testid="button-cta-setup-guide">
                    View Setup Guide
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8 max-w-xl mx-auto">
          Projected earnings are estimates based on the selected APR. Actual yields may vary.
          Not financial advice. DYOR. Soil Protocol manages the underlying vaults.
        </p>
      </main>
    </div>
  );
}
