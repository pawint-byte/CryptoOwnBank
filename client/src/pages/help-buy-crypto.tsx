import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpBuyCrypto() {
  return (
    <GuideLayout
      slug="buy-crypto"
      beforeYouStart={
        <>
          You need the XRP wallet from the first guide.{" "}
          <Link href="/help/create-wallet" className="text-primary underline" data-testid="link-create-wallet">
            Make one here
          </Link>{" "}
          if you haven't yet — and keep your 12 words handy. You'll also want a phone, since the card
          purchase for XRP happens in a free app called Xaman.
        </>
      }
      steps={[
        {
          title: "Open the 'Buy with card' section",
          body: <>Open your wallet (Wallets in the sidebar, or the screen right after you made it) and scroll to <span className="font-medium text-foreground">Fund your wallet with a debit or credit card</span>. You'll see a button for each coin you can buy.</>,
          imageAlt: "Wallet funding section with card-purchase buttons listed by coin",
        },
        {
          title: "For XRP, tap 'Buy XRP in Xaman'",
          body: <>Card companies haven't switched on instant XRP buying for us yet (they cover ETH, BTC, SOL, USDC and a few others — those show a one-tap <span className="font-medium text-foreground">Buy with card</span> button). For XRP, the button sends you to <span className="font-medium text-foreground">Xaman</span>, the most popular free XRP app, which has card buying built in.</>,
          imageAlt: "XRP row showing the 'Buy XRP in Xaman' button",
        },
        {
          title: "Open Xaman and import the same 12 words",
          body: <>Install Xaman, choose <span className="font-medium text-foreground">Import</span> (not Create), and type in the same 12 words from guide one. This is safe — it's the <span className="font-medium text-foreground">same wallet, same address</span>. You still hold the keys; Xaman is just a second window into the wallet you already own.</>,
          imageAlt: "Xaman import screen for entering an existing seed phrase",
        },
        {
          title: "Tap Buy and pay with your card",
          body: <>In Xaman, tap <span className="font-medium text-foreground">Buy</span>, pick a provider (Transak, MoonPay or Topper), enter about <span className="font-medium text-foreground">$20</span>, and pay with your debit card. They'll ask for ID once — that's a legal requirement for card-to-crypto, not us. <span className="text-foreground">Tip:</span> if one provider blocks your country, try another.</>,
          imageAlt: "Xaman buy screen with provider choice and amount entry",
        },
        {
          title: "Watch it land in both places",
          body: <>Your XRP arrives in a few minutes. Because Xaman and CryptoOwnBank are reading the <span className="font-medium text-foreground">same address</span>, the balance shows up in <span className="font-medium text-foreground">both</span> — no transfer needed. Open your wallet here and you'll see it's no longer empty.</>,
          imageAlt: "CryptoOwnBank wallet showing the new XRP balance",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">Why two apps for one wallet? </span>
          A wallet isn't a place that holds your coins — it's just your 12 words. Anything that knows
          those words (Xaman, CryptoOwnBank, or any other XRP app) can see and use the exact same
          balance. That's the whole idea behind owning your keys: no single company can lock you out.
        </p>
      }
    />
  );
}
