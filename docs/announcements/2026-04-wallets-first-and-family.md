# Email Announcement — Wallets-first Legacy Plan + Family Mode

Paste this into **Admin → Announcements → New Announcement**. The "Description" field accepts HTML.

---

## Subject (auto-prefixed with "New on CryptoOwnBank:")

`Two big upgrades — Wallets-first inheritance + Family read-only access`

## Title

`Two big upgrades — Wallets-first inheritance + Family read-only access`

## CTA Label

`Open my Legacy Plan`

## CTA URL

`https://cryptoownbank.com/legacy-plan`

## Description (HTML)

```html
<p>This week we shipped two of the most-requested features in CryptoOwnBank, both built around the same idea: <strong>your family should never be locked out, and you should never have to do brittle math to make sure they aren't.</strong></p>

<h3 style="color:#0c4a6e; margin-top:24px; margin-bottom:8px; font-size:17px;">1. Wallets-first Legacy Plan view</h3>
<p>Open <a href="https://cryptoownbank.com/legacy-plan">/legacy-plan</a> and switch to the new <strong>Wallets</strong> tab. Every wallet in your portfolio is shown with a status dot:</p>
<ul style="color:#334155; line-height:1.7;">
  <li><strong>Green</strong> — covered, you've assigned heirs and a recovery mode.</li>
  <li><strong>Amber</strong> — auto-assigned (see below), needs a quick review.</li>
  <li><strong>Red</strong> — no heirs yet, your family would be locked out.</li>
</ul>
<p>For each wallet you choose <strong>how it recovers</strong>:</p>
<ul style="color:#334155; line-height:1.7;">
  <li><strong>Solo</strong> — one person can recover alone (e.g., your spouse holds the seed).</li>
  <li><strong>Joint (K-of-N)</strong> — multiple people each hold a piece and must cooperate (perfect for SLIP-39 shards or CypheRock cards).</li>
  <li><strong>Shared</strong> — multiple people each able to recover independently.</li>
</ul>
<p>Then you write a <strong>"piece description"</strong> for each heir ("Card 2 of 4 in the safe deposit box") and a <strong>private note only they see</strong>. At the wallet level you can add free-text <strong>wishes</strong> visible to everyone — like <em>"Split this evenly between the three of you"</em> or <em>"Hold in trust until the kids turn 25."</em> No more brittle percentage splits. You just say what you mean, in your own words.</p>
<p><strong>Auto-assign on new wallets:</strong> set a default heir in your Legacy Plan settings, and any new wallet you connect is automatically attached to them with an amber "Review" badge. You'll never have a forgotten wallet drift outside the plan.</p>

<h3 style="color:#0c4a6e; margin-top:24px; margin-bottom:8px; font-size:17px;">2. Family Collaborative Mode (read-only)</h3>
<p>Open <a href="https://cryptoownbank.com/family">/family</a> and invite the people you trust — your spouse, your kids, your accountant, your estate executor — by email. They sign in and see your portfolio in <strong>read-only mode</strong>: every wallet, every balance, every position, with a persistent banner saying "Viewing as guest of [you]."</p>
<p><strong>What they can do:</strong> see what you see on your dashboard.<br>
<strong>What they cannot do:</strong> send funds, swap, change settings, see private keys, or see seed phrases. Read-only is read-only — they have no keys and no authority.</p>
<p>This is great for teaching kids about money with real numbers (without giving them spending power), letting an aging parent's adult children keep an eye on the account, or giving an estate executor visibility before anything bad happens. <strong>You can revoke access from /family at any time and it takes effect immediately.</strong></p>

<h3 style="color:#0c4a6e; margin-top:24px; margin-bottom:8px; font-size:17px;">How they work together</h3>
<p>Family Mode is for <em>now</em> — the people you trust can see what's there while you're alive and well. The Legacy Plan is for <em>later</em> — the actual recovery information passes only when needed, on your terms. Most members will use both.</p>

<p style="margin-top:24px;"><strong>Both features are non-custodial.</strong> CryptoOwnBank never sees your seed phrases, never holds your keys, and never moves your funds. Family seats are included on Premium and Pro tiers. The Legacy Plan is included on Pro and available as a $9.99/mo add-on on Premium.</p>

<p>As always — your keys, your coins, your call.</p>
```

---

## Sending checklist

1. Log in as an admin and open `/admin/announcements`.
2. Click **New Announcement**.
3. Paste the **Title**, the **CTA Label**, the **CTA URL**, and the full HTML **Description**.
4. Preview, then click **Send**.
5. Users who have opted out of product announcements (`unsubscribedFromAnnouncements = true`) are skipped automatically.

## What was shipped (for the changelog)

- `client/src/components/legacy-wallets-view.tsx` — new Wallets-first picker.
- `client/src/pages/legacy-plan.tsx` — Wallets tab now uses the new component.
- `client/src/pages/family.tsx`, `family-accept.tsx`, `family-view.tsx` — Family Collaborative Mode pages.
- `server/routes.ts` — `/api/legacy-plan/wallet-assignments/*`, `/api/family-seats/*`, auto-assign hook on `POST /api/wallets`, `defaultBeneficiaryEmail` accepted in `PATCH /api/legacy-plan`.
- `shared/schema.ts` — `legacy_wallet_assignments`, `family_seats`, plus `assignmentId / pieceDescription / privateNote / backupBeneficiaryId` on beneficiaries and `defaultBeneficiaryEmail` on legacy plans.
- FAQ updated with four new entries about the Wallets-first view, auto-assign, Family Collaborative Mode, and how Family + Legacy work together.
