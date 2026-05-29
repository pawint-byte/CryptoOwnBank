import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpLegacyTier() {
  return (
    <GuideLayout
      slug="legacy-tier"
      beforeYouStart={
        <>
          A free account is all you need to start. The Legacy Plan is how your loved ones can recover
          your crypto if something happens to you. First, it helps to have your{" "}
          <Link href="/help/sovereignty-kit" className="text-primary underline" data-testid="link-sovereignty-kit">
            Recovery Kit ready
          </Link>
          .
        </>
      }
      steps={[
        {
          title: "Open the Pricing page",
          body: <>Go to <span className="font-medium text-foreground">Pricing</span> (in the sidebar footer) and scroll down to the <span className="font-medium text-foreground">Legacy Plan</span> section.</>,
          imageAlt: "Pricing page scrolled to the Legacy Plan section",
        },
        {
          title: "Compare the three plans",
          body: <>You'll see three options: <span className="font-medium text-foreground">Annual</span> ($29/year), <span className="font-medium text-foreground">5-Year</span> ($99), and <span className="font-medium text-foreground">Member for Life</span> ($499, pay once). Pro members get Member for Life included.</>,
          imageAlt: "Three Legacy Plan tier cards side by side",
        },
        {
          title: "Pick one and set it up",
          body: <>Choose the plan that fits and click <span className="font-medium text-foreground">Set up Legacy Plan</span>. Only one plan is active at a time — you can switch or cancel later.</>,
          imageAlt: "Set up Legacy Plan button on a tier card",
        },
        {
          title: "Pay your way",
          body: <>Check out with a normal card, or pay with crypto for <span className="font-medium text-foreground">10% off</span>. Your choice.</>,
          imageAlt: "Checkout screen with card and crypto payment options",
        },
        {
          title: "Land on your dashboard",
          body: <>Once payment goes through, you arrive at your <span className="font-medium text-foreground">Legacy Plan</span> dashboard — ready to add the people who'll inherit your wallets.</>,
          imageAlt: "Legacy Plan dashboard ready to add a beneficiary",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">Why pay for this at all? </span>
          We charge for the tool — the planning, encryption, and recovery system — never for holding
          your assets. The crypto stays entirely yours; the Legacy Plan just makes sure it can reach
          the right hands.
        </p>
      }
    />
  );
}
