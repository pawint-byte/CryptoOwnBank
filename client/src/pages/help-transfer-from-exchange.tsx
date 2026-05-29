import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpTransferFromExchange() {
  return (
    <GuideLayout
      slug="transfer-from-exchange"
      beforeYouStart={
        <>
          You need a wallet here to send to —{" "}
          <Link href="/help/create-wallet" className="text-primary underline" data-testid="link-create-wallet">
            make one in two minutes
          </Link>{" "}
          if you haven't — and some crypto sitting on an exchange like Coinbase, Binance or Kraken.
        </>
      }
      steps={[
        {
          title: "Find your receive address",
          body: <>For XRP: open <span className="font-medium text-foreground">XRPL Send &amp; Receive</span> in the sidebar and tap the <span className="font-medium text-foreground">Receive</span> tab — your address (starts with <span className="font-mono">r</span>) and a QR code appear. For other coins, open <span className="font-medium text-foreground">My Wallets</span> and copy that chain's address. Use the copy button — never type an address by hand.</>,
          imageAlt: "Receive tab showing the XRP address and QR code with a copy button",
        },
        {
          title: "Match the network exactly",
          body: <>Send the coin on its own network. An XRP address starts with <span className="font-mono">r</span>; an Ethereum address starts with <span className="font-mono">0x</span>. Sending on the wrong network can lose the funds for good. If the exchange offers a network dropdown, pick the one that matches your address.</>,
          imageAlt: "Exchange withdrawal screen with the network dropdown highlighted",
        },
        {
          title: "Send a tiny test first",
          body: <>On the exchange, go to <span className="font-medium text-foreground">Withdraw</span> (or Send), paste your address, and send a small test amount — a dollar or two. This is the single best habit in crypto: prove the path works before moving the rest.</>,
          imageAlt: "Exchange withdraw form with a small test amount entered",
        },
        {
          title: "Confirm it arrived",
          body: <>Wait a few minutes, then open your wallet here. When the test amount shows up, you know the address and network are correct. (XRP note: your personal wallet doesn't need a destination tag — if the exchange forces one, any number is fine.)</>,
          imageAlt: "CryptoOwnBank wallet showing the test deposit received",
        },
        {
          title: "Send the rest",
          body: <>Go back to the exchange and withdraw the full amount to the same address. It lands in your own wallet and shows up here automatically — no extra import step.</>,
          imageAlt: "Wallet showing the full transferred balance",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">Why move it off the exchange? </span>
          On an exchange, the company holds the keys — if they freeze, fail, or get hacked, your
          coins go with them. In your own wallet, only your 12 words control the funds. Not your
          keys, not your coins.
        </p>
      }
    />
  );
}
