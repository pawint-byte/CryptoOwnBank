import { Link } from "wouter";
import { GuideLayout } from "@/components/help/guide-layout";

export default function HelpLegacyBeneficiary() {
  return (
    <GuideLayout
      slug="legacy-beneficiary"
      beforeYouStart={
        <>
          You'll need an active Legacy Plan first —{" "}
          <Link href="/help/legacy-tier" className="text-primary underline" data-testid="link-legacy-tier">
            pick a tier here
          </Link>{" "}
          if you haven't. Decide who you want to inherit which wallets before you begin.
        </>
      }
      steps={[
        {
          title: "Start adding a beneficiary",
          body: <>Open <span className="font-medium text-foreground">Legacy Plan</span> and click <span className="font-medium text-foreground">Add Beneficiary</span>. A short three-step wizard opens.</>,
          imageAlt: "Legacy Plan dashboard with the Add Beneficiary button",
        },
        {
          title: "Who they are, what they get",
          body: <>Enter their <span className="font-medium text-foreground">name, email, and relationship</span> to you. Then use the wallet picker to choose exactly which of your wallets this person should inherit.</>,
          imageAlt: "Wizard step one with name fields and a wallet picker",
        },
        {
          title: "Write down where the backup lives",
          body: <>On the recovery template, note <span className="font-medium text-foreground">where</span> your backup is kept — for example, "metal plate in the home safe." <span className="font-medium text-foreground">Never type your actual seed words here.</span> You're leaving a treasure map, not the treasure.</>,
          imageAlt: "Recovery template with a physical-location field and a no-seed-phrase warning",
        },
        {
          title: "Lock it with a passphrase",
          body: <>Turn on the <span className="font-medium text-foreground">Encrypted Recovery Vault</span> and set a passphrase. Anything you add is scrambled right in your browser before it's saved — we only ever store the locked version.</>,
          imageAlt: "Encrypted Recovery Vault toggle with a passphrase field",
        },
        {
          title: "Save",
          body: <>Click <span className="font-medium text-foreground">Save Beneficiary</span>. Your beneficiary gets a friendly email letting them know they've been named — without revealing any sensitive details.</>,
          imageAlt: "Saved beneficiary card and a sent-email confirmation",
        },
      ]}
      closing={
        <p>
          <span className="font-medium text-foreground">We never hold the keys to your secrets. </span>
          The encryption happens on your own device, so neither CryptoOwnBank nor your beneficiary can
          open the vault without the passphrase you chose. That's why testing it next matters.
        </p>
      }
    />
  );
}
