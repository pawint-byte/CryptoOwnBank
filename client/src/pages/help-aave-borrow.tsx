import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpAaveBorrow() {
  return (
    <GuideLayout
      slug="aave-borrow"
      beforeYouStart={
        <>
          This step is <span className="font-medium text-foreground">optional</span> and is a{" "}
          <span className="font-medium text-foreground">Pro</span> feature. You'll need an EVM wallet
          (like MetaMask) holding some crypto — for example ETH — to use as collateral.{" "}
          <Link href="/help/soil-vault" className="text-primary underline" data-testid="link-soil-vault">
            Not ready? Skip back to vaults.
          </Link>
        </>
      }
      steps={[
        {
          title: "Open the Aave Hub",
          body: <>In the sidebar, open <span className="font-medium text-foreground">Aave Hub</span>. This connects you to Aave, a well-known lending protocol, right inside CryptoOwnBank.</>,
          imageAlt: "Aave Hub page with supply and borrow panels",
        },
        {
          title: "Connect your wallet and pick a network",
          body: <>Connect MetaMask (or WalletConnect) and choose a network — <span className="font-medium text-foreground">Ethereum, Base, Arbitrum, or Polygon</span>. Your wallet stays in your control; you approve every action.</>,
          imageAlt: "Wallet connect prompt with the network selector",
        },
        {
          title: "Supply collateral",
          body: <>Deposit the crypto you want to borrow against — say some ETH. This becomes your collateral and quietly earns a little yield while it sits there. You're not selling it.</>,
          imageAlt: "Supply panel with an ETH amount entered",
        },
        {
          title: "Borrow USDC against it",
          body: <>Borrow <span className="font-medium text-foreground">USDC</span> (dollars) against your collateral. Borrow well under the limit and watch your <span className="font-medium text-foreground">health factor</span> — if it drops too low, your collateral can be sold off automatically. Keep a safe buffer.</>,
          imageAlt: "Borrow panel showing the health factor indicator",
        },
        {
          title: "Repay whenever you want",
          body: <>Pay the USDC back anytime to unlock your collateral. There's no fixed schedule — repay when it suits you.</>,
          imageAlt: "Repay panel unlocking the supplied collateral",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">Why borrow instead of sell? </span>
          This is the buy-borrow-don't-sell idea: you get cash today without selling your crypto, so
          you keep any future upside — and a loan isn't a taxable sale the way selling is. The
          trade-off is liquidation risk, so only borrow a comfortable amount. Not financial advice.
        </p>
      }
    />
  );
}
