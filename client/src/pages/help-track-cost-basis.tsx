import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpTrackCostBasis() {
  return (
    <GuideLayout
      slug="track-cost-basis"
      beforeYouStart={
        <>
          Our tax tools only work if we know two things about each coin: how much you have, and
          what you paid for it. Connecting a wallet tells us how much you have. This guide shows
          you the three ways to fill in what you paid — pick whichever fits the amount of history
          you have. No wallet yet?{" "}
          <Link href="/help/create-wallet" className="text-primary underline" data-testid="link-create-wallet">
            Make one first
          </Link>
          .
        </>
      }
      steps={[
        {
          title: "Connect your wallets",
          body: <>Open <span className="font-medium text-foreground">My Wallets</span> in the sidebar and paste in each public address you want to track — or tap <span className="font-medium text-foreground">Create New Wallet</span> to make a fresh one. Your balances then update on their own. Important: this tracks <span className="italic">how much</span> you hold, but not yet <span className="italic">what you paid</span> — that's the next two steps.</>,
          imageAlt: "My Wallets page with an address being added",
        },
        {
          title: "Bulk-import what you paid (the template)",
          body: <>Have a lot of history? Open <span className="font-medium text-foreground">Quick Start</span> in the sidebar, expand <span className="font-medium text-foreground">Bulk Import via CSV</span>, and on the <span className="font-medium text-foreground">Portfolio Template</span> card tap <span className="font-medium text-foreground">Download CSV</span>. Fill one row per purchase — the columns that matter for taxes are <span className="font-mono">asset</span>, <span className="font-mono">quantity</span>, and <span className="font-mono">costPerUnit</span> (what you paid for one coin). Save the file.</>,
          imageAlt: "Quick Start Bulk Import section with the Portfolio Template download button",
        },
        {
          title: "Upload the filled template",
          body: <>Back in <span className="font-medium text-foreground">Bulk Import via CSV</span>, under <span className="font-medium text-foreground">Upload Filled Template</span> set the template type to <span className="font-medium text-foreground">Portfolio Template</span>, tap <span className="font-medium text-foreground">Choose CSV File</span>, and check the preview. When it looks right, tap the import button (it shows how many records it will add, e.g. <span className="font-medium text-foreground">Import 12 Records</span>). Each row becomes a recorded purchase with its cost — the foundation every tax number is built on.</>,
          imageAlt: "Import preview table with the import button showing the record count",
        },
        {
          title: "Add single entries by hand",
          body: <>For a one-off — a coin you missed, or a purchase you make from now on — go to <span className="font-medium text-foreground">Transactions</span> (under <span className="font-medium text-foreground">Plan &amp; Protect</span> in the sidebar) and tap <span className="font-medium text-foreground">Add Transaction</span>. Set <span className="font-medium text-foreground">Type</span> to <span className="font-medium text-foreground">Buy</span>, then fill in <span className="font-medium text-foreground">Asset Symbol</span>, <span className="font-medium text-foreground">Quantity</span>, <span className="font-medium text-foreground">Price per Unit ($)</span>, and the <span className="font-medium text-foreground">Date</span>. Save it and it joins your records.</>,
          imageAlt: "Add Transaction dialog set to Buy",
        },
        {
          title: "Record a sale or swap when it happens",
          body: <>When you let a coin go, record it the same way: <span className="font-medium text-foreground">Add Transaction</span>, set <span className="font-medium text-foreground">Type</span> to <span className="font-medium text-foreground">Sell / Swap</span>, then under <span className="font-medium text-foreground">What happened to it?</span> pick <span className="font-medium text-foreground">Sold for cash / stablecoin</span>, <span className="font-medium text-foreground">Swapped into another coin</span>, or <span className="font-medium text-foreground">Sent / spent it</span>. We match it against your recorded purchases and work out the gain or loss for you.</>,
          imageAlt: "Add Transaction dialog set to Sell / Swap with the disposal options",
        },
        {
          title: "See the payoff",
          body: <>Once purchases and sales are in, open <span className="font-medium text-foreground">Tax Reports</span> (under <span className="font-medium text-foreground">Plan &amp; Protect</span>) to see your realized gains and losses, and <span className="font-medium text-foreground">Tax Savings (Harvest)</span> to spot positions you could sell at a loss to lower your bill. The more complete your records, the more accurate these get.</>,
          imageAlt: "Tax Reports page showing realized gains and losses",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">You don't have to do it all at once. </span>
          Start with the coins worth the most, get their purchase cost in, and add the rest over
          time. These numbers are here to help you prepare — they aren't tax advice, so check with
          a tax professional before you file.
        </p>
      }
    />
  );
}
