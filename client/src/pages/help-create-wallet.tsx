import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpCreateWallet() {
  return (
    <GuideLayout
      slug="create-wallet"
      beforeYouStart={
        <>
          You need a free CryptoOwnBank account.{" "}
          <Link href="/signup" className="text-primary underline" data-testid="link-signup">
            Sign up here
          </Link>
          , then come back. That's the only prerequisite.
        </>
      }
      steps={[
        {
          title: "Go to Wallets → Create Wallet",
          body: <>From the sidebar, open <span className="font-medium">Wallets</span> and click <span className="font-medium">Create Wallet</span>. You'll land on a chain picker.</>,
          imageAlt: "Sidebar with 'Create Wallet' highlighted",
        },
        {
          title: "Pick XRP for your first wallet",
          body: <>We recommend starting with XRP — it's the cheapest to send (fractions of a cent), settles in ~4 seconds, and is the easiest to recover if something goes wrong. You can add more chains later from the same 12-word seed.</>,
          imageAlt: "Chain picker with XRP card highlighted",
        },
        {
          title: "Write the 12 words on paper",
          body: <>The screen shows 12 words — your seed phrase. <span className="font-medium text-foreground">Write them on paper</span>. Not a screenshot. Not a note app. Paper. Whoever has these words controls the wallet. There's a printable backup template linked on the screen.</>,
          imageAlt: "Seed phrase screen with paper-only callout",
        },
        {
          title: "Type the words back to confirm",
          body: <>The next screen asks you to retype the 12 words in order. This proves you actually wrote them down — and isn't trusting your memory.</>,
          imageAlt: "Confirm seed phrase step",
        },
        {
          title: "Done — your wallet exists",
          body: <>You'll see your new XRP address. It's empty (0 XRP) — that's normal. The wallet lives on the XRP Ledger, not on our servers. Even if CryptoOwnBank disappears tomorrow, those 12 words still control it.</>,
          imageAlt: "Done screen showing new XRP address and 0 balance",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">Why we don't see your keys: </span>
          The seed phrase was generated in your browser and never sent to us. We only know your
          public address (the part you'd share to receive funds). That's the whole point.
        </p>
      }
    />
  );
}
