import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpSovereigntyKit() {
  return (
    <GuideLayout
      slug="sovereignty-kit"
      beforeYouStart={
        <>
          This works on any plan, free included. First make sure your wallet addresses are added
          here, so the kit includes them — you can see them under{" "}
          <Link href="/wallets" className="text-primary underline" data-testid="link-wallets">
            My Wallets
          </Link>
          .
        </>
      }
      steps={[
        {
          title: "Open the Recovery Kit",
          body: <>In the sidebar, under <span className="font-medium text-foreground">Back Up &amp; Recover</span>, open <span className="font-medium text-foreground">Recovery Kit</span>.</>,
          imageAlt: "Recovery Kit page in the Back Up & Recover sidebar group",
        },
        {
          title: "Check the wallets it found",
          body: <>The page lists every wallet address you've added, grouped by chain. Make sure the ones you care about are there — if any are missing, add them under My Wallets first.</>,
          imageAlt: "Recovery Kit page summarizing tracked wallets by chain",
        },
        {
          title: "Download the kit",
          body: <>Click <span className="font-medium text-foreground">Download my Sovereignty Kit</span>. A clean, printable page opens in your browser.</>,
          imageAlt: "Download my Sovereignty Kit button",
        },
        {
          title: "Print it on paper",
          body: <>Use the <span className="font-medium text-foreground">Print</span> button on the kit. Store the printout somewhere safe — a drawer, a safe, with your important documents.</>,
          imageAlt: "Printable kit with a print button at the top",
        },
        {
          title: "See what's inside",
          body: <>The kit holds your public addresses by chain, plain-English restore steps for each, wallet recommendations, storage advice, and an annual check-up checklist — everything a loved one needs to find and recover your crypto.</>,
          imageAlt: "Printed kit pages showing addresses and restore guidance",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">Safe to print — it holds no secrets. </span>
          The kit only contains <span className="font-medium text-foreground">public</span> addresses
          (the part you'd share to receive funds) and instructions. Your seed phrase is never in it.
          Pair this with a Legacy Plan and your handoff is covered.
        </p>
      }
    />
  );
}
