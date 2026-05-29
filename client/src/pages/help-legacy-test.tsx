import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";
import decryptPageImg from "@assets/help-screenshots/decrypt-page.jpg";

export default function HelpLegacyTest() {
  return (
    <GuideLayout
      slug="legacy-test"
      beforeYouStart={
        <>
          You'll need at least one beneficiary with an encrypted vault —{" "}
          <Link href="/help/legacy-beneficiary" className="text-primary underline" data-testid="link-legacy-beneficiary">
            add one here
          </Link>{" "}
          if you haven't. Have the passphrase you set ready.
        </>
      }
      steps={[
        {
          title: "Open the encrypted vault",
          body: <>Go to <span className="font-medium text-foreground">Legacy Plan</span>, edit your beneficiary, and move to the <span className="font-medium text-foreground">Encrypted Recovery Vault</span> step — the same place you set the passphrase.</>,
          imageAlt: "Legacy Plan beneficiary edit screen on the encrypted vault step",
        },
        {
          title: "Run Test Decrypt",
          body: <>Click <span className="font-medium text-foreground">Test Decrypt</span> and type your passphrase. If your original text appears, the passphrase is correct and there's no typo. Fix it now if it doesn't — far better than discovering it later.</>,
          imageAlt: "Test Decrypt button revealing the recovered text",
        },
        {
          title: "Try the recovery page yourself",
          body: <>Open the recovery page at <span className="font-mono">/decrypt</span>, paste an encrypted block, and enter the passphrase. This is exactly what your beneficiary will do when they receive the email — so it's worth seeing it once.</>,
          imageAlt: "Decrypt page with an encrypted block and passphrase field",
          imageSrc: decryptPageImg,
        },
        {
          title: "Let your beneficiary rehearse",
          body: <>Walk your beneficiary through the <span className="font-mono">/decrypt</span> page so <span className="font-medium text-foreground">they</span> know the steps too. The best time for them to learn is now — not during an emergency.</>,
          imageAlt: "Beneficiary practicing on the decrypt page",
        },
        {
          title: "Repeat once a year",
          body: <>Put it on the calendar: run this check annually so you're always sure the plan still works as your wallets and passphrases change.</>,
          imageAlt: "Annual reminder to re-run the legacy check",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">A backup you've never tested isn't a backup. </span>
          The <span className="font-mono">/decrypt</span> page does the unlocking right in your
          browser, so the passphrase is never sent anywhere. You've now walked the whole journey:
          own it, grow it, and hand it off safely.
        </p>
      }
    />
  );
}
