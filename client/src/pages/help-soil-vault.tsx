import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpSoilVault() {
  return (
    <GuideLayout
      slug="soil-vault"
      beforeYouStart={
        <>
          You need some <span className="font-medium text-foreground">RLUSD</span> (a dollar-pegged
          stablecoin) in your XRP wallet, and your Xaman app connected for signing. New here?{" "}
          <Link href="/help/buy-crypto" className="text-primary underline" data-testid="link-buy-crypto">
            Get crypto into your wallet first
          </Link>
          .
        </>
      }
      steps={[
        {
          title: "Open Yield Vaults",
          body: <>In the sidebar, open <span className="font-medium text-foreground">Yield Vaults</span>. You'll see the available Soil Protocol vaults with their current rates.</>,
          imageAlt: "Yield Vaults page listing the Soil vaults and rates",
        },
        {
          title: "Pick a vault",
          body: <>Two choices: <span className="font-medium text-foreground">Treasury</span> (around 5.2% a year, steadier) or <span className="font-medium text-foreground">CREDIT+</span> (around 8% a year, a bit more risk). Minimum deposit is 10 RLUSD for Treasury, 50 RLUSD for CREDIT+. Rates move over time — they're not guaranteed.</>,
          imageAlt: "Two vault cards showing Treasury 5.2% and CREDIT+ 8%",
        },
        {
          title: "Enter your amount",
          body: <>Click <span className="font-medium text-foreground">Deposit</span> on the vault you chose, type how much RLUSD you want to put in, then click <span className="font-medium text-foreground">Review Deposit</span> to see a summary before anything happens.</>,
          imageAlt: "Deposit dialog with amount entered and a review summary",
        },
        {
          title: "Confirm in Xaman",
          body: <>Click <span className="font-medium text-foreground">Sign &amp; Deposit</span>. A signing request opens in your Xaman app — approve it there. The funds move straight from your wallet to the vault; CryptoOwnBank never touches them.</>,
          imageAlt: "Xaman app showing the deposit payment to approve",
        },
        {
          title: "Watch it earn",
          body: <>Your deposit appears under <span className="font-medium text-foreground">Your Vault Positions</span> with interest adding up over time. You can withdraw whenever you like.</>,
          imageAlt: "Your Vault Positions showing a deposit with accruing interest",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">Why this is different from a bank: </span>
          The yield comes from Soil Protocol on the XRP Ledger, and the deposit is signed from your
          own wallet — your keys never leave your control. This is information, not financial advice;
          all crypto yield carries risk, so only deposit what you're comfortable with.
        </p>
      }
    />
  );
}
