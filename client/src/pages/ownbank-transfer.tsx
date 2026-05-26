import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InlineXrplConnect } from "@/components/inline-xrpl-connect";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useXrplStore } from "@/lib/xrpl-store";
import { signPayment } from "@/lib/xumm-connector";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { VerifyOnDeviceNotice } from "@/components/verify-on-device-notice";
import {
  ArrowRightLeft,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Shield,
  Loader2,
  Wallet,
  Building2,
  Banknote,
  Clock,
  Zap,
  Check,
  Ban,
  Landmark,
  PiggyBank,
  TrendingUp,
  CreditCard,
  ArrowRight,
  Star,
  Info,
} from "lucide-react";
import { Link } from "wouter";
import type { UserWallet } from "@shared/schema";

import { RLUSD } from "@/lib/constants";
const RLUSD_CURRENCY = RLUSD.currency;
const RLUSD_ISSUER = RLUSD.issuer;

const PURPOSE_ICONS: Record<string, typeof Wallet> = {
  yield: TrendingUp,
  spending: CreditCard,
  receiving: Banknote,
  savings: PiggyBank,
  trading: ArrowRightLeft,
  general: Wallet,
};

const PURPOSE_COLORS: Record<string, string> = {
  yield: "text-green-500",
  spending: "text-blue-500",
  receiving: "text-purple-500",
  savings: "text-amber-500",
  trading: "text-red-500",
  general: "text-gray-500",
};

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function OwnBankTransfer() {
  const { toast } = useToast();
  const { isConnected, walletAddress, walletType } = useXrplStore();

  const [educationOpen, setEducationOpen] = useState(false);
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XRP");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { data: savedWallets = [], isLoading: walletsLoading } = useQuery<UserWallet[]>({
    queryKey: ["/api/user-wallets"],
  });

  const xrplWallets = savedWallets.filter((w) => w.chain === "xrpl");
  const fromWallet = xrplWallets.find((w) => w.id === fromWalletId);
  const toWallet = xrplWallets.find((w) => w.id === toWalletId);

  const sourceWalletMismatch = fromWallet && walletAddress && fromWallet.address !== walletAddress;

  const handleReviewTransfer = () => {
    if (!fromWalletId) {
      toast({ title: "Select source wallet", description: "Choose which wallet to send from.", variant: "destructive" });
      return;
    }
    if (!toWalletId) {
      toast({ title: "Select destination wallet", description: "Choose which wallet to send to.", variant: "destructive" });
      return;
    }
    if (fromWalletId === toWalletId) {
      toast({ title: "Same wallet selected", description: "Source and destination must be different wallets.", variant: "destructive" });
      return;
    }
    if (sourceWalletMismatch) {
      toast({
        title: "Wallet mismatch",
        description: `Your connected Xaman wallet (${truncateAddress(walletAddress!)}) doesn't match the source wallet. Switch wallets in Xaman first.`,
        variant: "destructive",
      });
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Enter an amount", description: "Please enter a valid amount to transfer.", variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    if (!fromWallet || !toWallet) return;
    setIsSending(true);

    try {
      const numAmount = parseFloat(amount);
      let amountField: string | { currency: string; value: string; issuer: string };

      if (currency === "XRP") {
        amountField = (numAmount * 1_000_000).toString();
      } else {
        amountField = {
          currency: currency === "RLUSD" ? RLUSD_CURRENCY : currency,
          value: numAmount.toString(),
          issuer: RLUSD_ISSUER,
        };
      }

      const paymentOptions: { destinationTag?: number; memos?: Array<{ MemoType?: string; MemoData?: string }> } = {};
      if (toWallet.destinationTag) {
        const tagNum = parseInt(toWallet.destinationTag, 10);
        if (!isNaN(tagNum) && tagNum >= 0) {
          paymentOptions.destinationTag = tagNum;
        }
      }
      paymentOptions.memos = [{
        MemoType: "text/plain",
        MemoData: `Transfer: ${fromWallet.label} → ${toWallet.label}`,
      }];

      const result = await signPayment(toWallet.address, amountField, paymentOptions);

      if (result.success) {
        toast({
          title: "Transfer complete",
          description: `${amount} ${currency} moved from ${fromWallet.label} to ${toWallet.label}`,
        });
        setShowConfirm(false);
        setAmount("");
      } else {
        toast({
          title: "Transfer cancelled",
          description: result.error || "Transaction was not signed",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Transfer failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setShowConfirm(false);
    }
  };

  const WalletOption = ({ wallet }: { wallet: UserWallet }) => {
    const Icon = PURPOSE_ICONS[wallet.purpose] || Wallet;
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${PURPOSE_COLORS[wallet.purpose] || "text-gray-500"}`} />
        <span>{wallet.label}</span>
        <span className="text-muted-foreground text-xs font-mono">
          ({truncateAddress(wallet.address)})
        </span>
        {wallet.isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="text-transfer-title">
          <ArrowRightLeft className="h-7 w-7 text-[#00A4E4]" />
          Transfer Between Wallets
        </h1>
        <p className="text-muted-foreground mt-1">
          Move funds between your own accounts — like transferring between checking and savings
        </p>
      </div>

      <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
        <Card className="border-[#00A4E4]/30 bg-gradient-to-br from-[#00A4E4]/5 to-transparent">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-5 w-5 text-[#00A4E4]" />
                  Why Transfer Between Your Own Wallets?
                </CardTitle>
                {educationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Think of your XRPL wallets like bank accounts you own. Just as you might have a checking account
                for daily spending, a savings account for emergencies, and an investment account for growth — you can
                organize your crypto the same way. Each wallet is a separate account with its own balance.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-400" />
                    The Old Way (Banks)
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
                      <span>Bank transfers take 1-3 business days</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
                      <span>Need to set up bank-to-bank links, verify accounts, wait for micro-deposits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Banknote className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
                      <span>Wire transfer fees of $15-30 even between your own accounts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
                      <span>Zelle limits of $500-2,000/day; ACH takes 2-3 days</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-400" />
                    The New Way (XRPL)
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                      <span>Arrives in 4 seconds — not 4 days</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                      <span>No account linking needed — just pick source and destination</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                      <span>Costs less than $0.01 — a fraction of a penny per transfer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                      <span>No limits — transfer $10 or $10 million, same speed, same cost</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-background/60 rounded-lg p-4 border border-[#00A4E4]/20">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#00A4E4]" />
                  Common Use Cases
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-[#00A4E4]" />
                    <span><strong>Paycheck allocation</strong> — Split received funds into spending, savings, and investment wallets</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-[#00A4E4]" />
                    <span><strong>Savings top-up</strong> — Move surplus from spending to savings when you have extra</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-[#00A4E4]" />
                    <span><strong>Yield deposit prep</strong> — Move RLUSD to your yield wallet before depositing to a vault</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-[#00A4E4]" />
                    <span><strong>Cold storage sweep</strong> — Move long-term holdings to your hardware wallet for safekeeping</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>You stay in control.</strong> Every transfer is signed by you in your Xaman wallet.
                  CryptoOwnBank never holds your funds — we just make it easy to organize them.
                  You can also do this directly from your wallet app anytime.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {!isConnected ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <InlineXrplConnect />
          </CardContent>
        </Card>
      ) : walletsLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading your wallets...</p>
          </CardContent>
        </Card>
      ) : xrplWallets.length < 2 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <ArrowRightLeft className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                You need at least two XRPL wallets to transfer between them.
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Go to Settings and add your wallets — label them by purpose (spending, savings, yield, etc.)
                so you can organize your funds like separate bank accounts.
              </p>
            </div>
            <Link href="/settings">
              <Button variant="outline" data-testid="button-add-wallets">
                <Wallet className="h-4 w-4 mr-2" />
                Add Wallets in Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#00A4E4]/20">
          <CardHeader>
            <CardTitle className="text-lg">Move Funds</CardTitle>
            <CardDescription>
              Select source and destination, enter the amount, and sign with Xaman
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">From (Source)</Label>
              <Select value={fromWalletId} onValueChange={setFromWalletId}>
                <SelectTrigger data-testid="select-from-wallet" className="h-12">
                  <SelectValue placeholder="Select source wallet..." />
                </SelectTrigger>
                <SelectContent>
                  {xrplWallets.filter((w) => w.id !== toWalletId).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <WalletOption wallet={w} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromWallet && (
                <p className="text-xs text-muted-foreground font-mono pl-1">
                  {fromWallet.address}
                </p>
              )}
              {sourceWalletMismatch && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20 mt-1">
                  <Shield className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-500">
                    Your connected Xaman wallet ({truncateAddress(walletAddress!)}) doesn't match this source wallet.
                    Switch to this wallet in Xaman, or select a different source.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A4E4]/10 border border-[#00A4E4]/30">
                <ArrowDown className="h-5 w-5 text-[#00A4E4]" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">To (Destination)</Label>
              <Select value={toWalletId} onValueChange={setToWalletId}>
                <SelectTrigger data-testid="select-to-wallet" className="h-12">
                  <SelectValue placeholder="Select destination wallet..." />
                </SelectTrigger>
                <SelectContent>
                  {xrplWallets.filter((w) => w.id !== fromWalletId).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <WalletOption wallet={w} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toWallet && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-mono pl-1">
                    {toWallet.address}
                  </p>
                  {toWallet.destinationTag && (
                    <p className="text-xs text-amber-500 pl-1">
                      Destination Tag: {toWallet.destinationTag}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg font-mono"
                  data-testid="input-transfer-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="select-transfer-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XRP">XRP</SelectItem>
                    <SelectItem value="RLUSD">RLUSD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {fromWallet && toWallet && (
              <div className="p-3 rounded-lg bg-muted/50 border flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  {(() => {
                    const FromIcon = PURPOSE_ICONS[fromWallet.purpose] || Wallet;
                    const ToIcon = PURPOSE_ICONS[toWallet.purpose] || Wallet;
                    return (
                      <>
                        <FromIcon className={`h-4 w-4 flex-shrink-0 ${PURPOSE_COLORS[fromWallet.purpose]}`} />
                        <span className="truncate font-medium">{fromWallet.label}</span>
                        <ArrowRight className="h-4 w-4 text-[#00A4E4] flex-shrink-0" />
                        <ToIcon className={`h-4 w-4 flex-shrink-0 ${PURPOSE_COLORS[toWallet.purpose]}`} />
                        <span className="truncate font-medium">{toWallet.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <Button
              onClick={handleReviewTransfer}
              className="w-full bg-[#00A4E4] hover:bg-[#0090cc] text-white h-12 text-base"
              data-testid="button-review-transfer"
            >
              <Shield className="h-5 w-5 mr-2" />
              Review Transfer
            </Button>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-green-400" /> 4-second settlement
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-blue-400" /> Non-custodial
              </span>
              <span className="flex items-center gap-1">
                <Banknote className="h-3 w-3 text-amber-400" /> Near-zero fees
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <XrplDisclaimer />

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-confirm-title">Confirm Transfer</DialogTitle>
          </DialogHeader>
          {fromWallet && toWallet && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">From</span>
                  <div className="text-right">
                    <p className="text-sm font-medium" data-testid="text-confirm-from">{fromWallet.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{truncateAddress(fromWallet.address)}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowDown className="h-4 w-4 text-[#00A4E4]" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">To</span>
                  <div className="text-right">
                    <p className="text-sm font-medium" data-testid="text-confirm-to">{toWallet.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{truncateAddress(toWallet.address)}</p>
                    {toWallet.destinationTag && (
                      <p className="text-xs text-amber-500">Tag: {toWallet.destinationTag}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold font-mono" data-testid="text-confirm-amount">
                    {amount} {currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  This is a transfer between your own wallets. Your Xaman app will open for you to review and
                  approve the transaction. Nothing happens until you sign.
                </p>
              </div>

              <VerifyOnDeviceNotice walletLabel="Xaman" />
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isSending}
              data-testid="button-cancel-transfer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTransfer}
              className="bg-[#00A4E4] text-white border-[#00A4E4]"
              disabled={isSending}
              data-testid="button-confirm-transfer"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Sign & Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
