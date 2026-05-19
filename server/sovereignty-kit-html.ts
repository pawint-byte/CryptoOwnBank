import type { UserWallet } from "@shared/schema";
import { escapeHtml } from "./email";

type Audience = "self" | "survivor";

interface ChainGuide {
  label: string;
  keyFormat: string;
  wallets: string;
  restore: string;
}

const CHAIN_GUIDES: Record<string, ChainGuide> = {
  bitcoin: {
    label: "Bitcoin",
    keyFormat: "12 or 24 words (BIP39 standard).",
    wallets: "Sparrow, Electrum, BlueWallet, Cake Wallet, Trezor Suite, Ledger Live, and any other BIP39-compliant wallet.",
    restore: "Install any wallet from the list above. Choose \"Restore from seed\" or \"Import wallet\". Enter the 12 or 24 words in order. The balance will appear after the wallet syncs.",
  },
  xrpl: {
    label: "XRPL",
    keyFormat: "Family seed starting with \"s...\" (canonical XRPL key format). Some wallets also accept a BIP39-style mnemonic.",
    wallets: "Xaman, Crossmark, Bifrost, GemWallet, and the open-source xrpl.js library that anyone can run themselves.",
    restore: "Install Xaman or Crossmark. Choose \"Import account\". Paste the family seed (begins with \"s\") OR enter a mnemonic if the wallet uses one. The account and balances appear immediately.",
  },
  stellar: {
    label: "Stellar",
    keyFormat: "Secret key starting with \"S...\" — portable across every Stellar wallet. Many wallets also support a 24-word SEP-0005 mnemonic.",
    wallets: "LOBSTR, Freighter, Solar, Vibrant, StellarTerm.",
    restore: "Install LOBSTR or Freighter. Choose \"Import existing account\". Enter the secret key (begins with \"S\") OR the 24-word mnemonic if one was set. XLM and trustlines appear after sync.",
  },
  ethereum: {
    label: "Ethereum & EVM chains",
    keyFormat: "12 or 24 words (BIP39 + BIP44 derivation). The same phrase works for Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche, and most other EVM chains.",
    wallets: "MetaMask, Rabby, Frame, Trust Wallet, Ledger Live, Trezor Suite, Safe.",
    restore: "Install MetaMask or Rabby. Choose \"Import wallet\" or \"Restore from secret recovery phrase\". Enter the 12 or 24 words. Add networks (Base, Arbitrum, etc.) from the network list. Balances appear per chain.",
  },
  monero: {
    label: "Monero",
    keyFormat: "25-word seed (Monero's own format — not BIP39).",
    wallets: "Cake Wallet, Feather, MyMonero, and the official Monero CLI maintained by the community.",
    restore: "Install Cake Wallet or Feather. Choose \"Restore from seed\". Enter the 25 words. Restore may take a few minutes as the wallet scans the chain — that's normal.",
  },
};

const KNOWN_CHAINS = Object.keys(CHAIN_GUIDES);

// Single source of truth for chain normalization. Used by both the tracked-set
// and the untracked-reference logic so they stay mutually exclusive.
export function normalizeChainKey(raw: string | null | undefined): string {
  const c = String(raw || "").toLowerCase().trim();
  if (!c) return "other";
  if (c === "xrp" || c === "xrpl") return "xrpl";
  if (c === "xlm" || c === "stellar") return "stellar";
  if (c === "btc" || c === "bitcoin") return "bitcoin";
  if (c === "xmr" || c === "monero") return "monero";
  if (["eth", "ethereum", "base", "arbitrum", "optimism", "polygon", "matic", "bsc", "avalanche", "avax", "evm"].includes(c)) return "ethereum";
  return c;
}

function guideFor(normalizedKey: string): ChainGuide | null {
  return CHAIN_GUIDES[normalizedKey] ?? null;
}

export function getSovereigntyKitStyles(): string {
  return `
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#222;line-height:1.55}
h1{color:#00A4E4;border-bottom:3px solid #00A4E4;padding-bottom:8px;margin-bottom:8px}
h2{color:#1e3a8a;margin-top:36px;border-bottom:1px solid #ddd;padding-bottom:6px}
h3{color:#444;margin-top:22px;font-size:15px}
.promise{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0}
.warning{background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:14px;margin:18px 0;color:#991b1b}
.guide{background:#f9fafb;border-left:3px solid #00A4E4;padding:12px 14px;margin:10px 0;border-radius:0 6px 6px 0}
.guide p{margin:4px 0;font-size:13px}
section.chain{page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:18px 0;background:#fff}
section.chain.reference{background:#fafafa}
table.addresses{border-collapse:collapse;width:100%;margin:6px 0;font-size:13px}
table.addresses th,table.addresses td{text-align:left;padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
table.addresses th{color:#555;font-weight:600;background:#f6f8fa}
td.addr{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;word-break:break-all}
.primary-tag{font-size:10px;background:#00A4E4;color:#fff;padding:1px 6px;border-radius:3px;margin-left:6px;text-transform:uppercase;letter-spacing:0.4px}
.muted{color:#888;font-size:12px}
.drill ol{padding-left:22px}
.drill li{margin:6px 0;font-size:13px}
.checkbox{display:inline-block;width:14px;height:14px;border:2px solid #999;margin-right:8px;vertical-align:middle;border-radius:2px}
.print-bar{position:sticky;top:0;background:#00A4E4;color:#fff;padding:10px 16px;margin:-32px -32px 24px -32px;display:flex;justify-content:space-between;align-items:center;font-size:13px}
.print-bar button{background:#fff;color:#00A4E4;border:0;padding:6px 14px;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:11px;text-align:center}
@media print{body{padding:16px}section.chain{break-inside:avoid;border-color:#ccc}.print-bar{display:none}}
`;
}

/**
 * Builds the chain-by-chain restore guidance, seed-storage advice, annual drill (self only),
 * and AGPL/durability note. Used standalone in the Sovereignty Recovery Kit endpoint AND
 * bundled as an appendix in the Legacy Plan export so survivors get complete restore guidance
 * without needing a second document.
 */
export function buildSovereigntyKitContent(opts: {
  wallets: UserWallet[];
  audience: Audience;
}): string {
  const { wallets, audience } = opts;
  const isSurvivor = audience === "survivor";

  const grouped: Record<string, UserWallet[]> = {};
  for (const w of wallets) {
    const key = normalizeChainKey(w.chain);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  }

  const addressSections = Object.keys(grouped).sort().map((chainKey) => {
    const guide = guideFor(chainKey);
    const label = guide?.label || chainKey.toUpperCase();
    const rows = grouped[chainKey].map((w) => `
        <tr>
          <td><strong>${escapeHtml(w.label)}</strong>${w.isPrimary ? ' <span class="primary-tag">primary</span>' : ""}</td>
          <td class="addr">${escapeHtml(w.address)}${w.destinationTag ? `<br/><span class="muted">Destination tag: ${escapeHtml(w.destinationTag)}</span>` : ""}</td>
        </tr>`).join("");
    return `
      <section class="chain">
        <h2>${escapeHtml(label)}</h2>
        <table class="addresses">
          <thead><tr><th>Label</th><th>Address</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${guide ? `
          <div class="guide">
            <p><strong>Key format:</strong> ${escapeHtml(guide.keyFormat)}</p>
            <p><strong>Current good wallets:</strong> ${escapeHtml(guide.wallets)}</p>
            <p><strong>${isSurvivor ? "Restore from the seed phrase the owner left you" : "Restore from your seed phrase"}:</strong> ${escapeHtml(guide.restore)}</p>
          </div>` : `
          <div class="guide muted">
            <p>No standard restore guide for this chain yet. Use the wallet that originally issued the address, and import the seed there.</p>
          </div>`}
      </section>`;
  }).join("\n");

  const trackedKeys = new Set(Object.keys(grouped));
  const untrackedGuides = KNOWN_CHAINS
    .filter((k) => !trackedKeys.has(k))
    .map((k) => {
      const g = CHAIN_GUIDES[k];
      return `
        <section class="chain reference">
          <h2>${escapeHtml(g.label)} <span class="muted">(reference — ${isSurvivor ? "no tracked addresses on this chain" : "you don't currently track this chain here"})</span></h2>
          <div class="guide">
            <p><strong>Key format:</strong> ${escapeHtml(g.keyFormat)}</p>
            <p><strong>Current good wallets:</strong> ${escapeHtml(g.wallets)}</p>
            <p><strong>${isSurvivor ? "Restore from a seed phrase" : "Restore from your seed phrase"}:</strong> ${escapeHtml(g.restore)}</p>
          </div>
        </section>`;
    }).join("\n");

  const addressesHeading = isSurvivor
    ? "Addresses by chain &mdash; with restore guidance"
    : "Your addresses, by chain";

  const drillBlock = isSurvivor ? "" : `
<h2>The annual sovereignty drill</h2>
<div class="drill">
  <p style="font-size:13px">Once a year &mdash; pick the same week so you don't forget &mdash; do this:</p>
  <ol>
    <li><span class="checkbox"></span> Pick one chain from this kit.</li>
    <li><span class="checkbox"></span> Get a clean device you don't normally use, or wipe an old phone.</li>
    <li><span class="checkbox"></span> Install one of the "current good wallets" for that chain.</li>
    <li><span class="checkbox"></span> Choose Import / Restore. Enter your seed phrase.</li>
    <li><span class="checkbox"></span> Confirm you see your balance &mdash; or at least the right addresses.</li>
    <li><span class="checkbox"></span> Delete the wallet, wipe the device, put it away.</li>
    <li><span class="checkbox"></span> Cross off this year's date on the printout. Set a calendar reminder for next year.</li>
  </ol>
  <p style="font-size:13px"><em>The point isn't to move money. The point is to know &mdash; in your hands, not just in theory &mdash; that you can get to your assets without us, without your usual wallet, without any specific company. Three drills in and the fear of being locked out is gone for good.</em></p>
</div>`;

  const emptyStateNote = wallets.length === 0
    ? `<p class="muted" style="font-style:italic">No wallet addresses tracked yet. The generic chain reference below is still a useful starting point.</p>`
    : addressSections;

  const storageHeader = isSurvivor
    ? "How to store the seed phrase (or SLIP-39 shares you've been given)"
    : "How to store your seed phrase";

  return `
<h2>${addressesHeading}</h2>
${emptyStateNote}

${untrackedGuides ? `<h2>Chain reference</h2>${untrackedGuides}` : ""}

<h2>${storageHeader}</h2>
<h3>Paper (good enough for now)</h3>
<p style="font-size:13px">Write the words on paper, in pencil or pen that won't fade. Two copies. Two locations. Never the same drawer as ${isSurvivor ? "the device" : "your phone or laptop"}.</p>
<h3>Metal (best for the long term)</h3>
<p style="font-size:13px">A metal seed plate (Cryptotag, Billfodl, Cobo Tablet, Steelwallet) survives fire, flood, and decades. Worth the $30-80 for any meaningful amount.</p>
<h3>${isSurvivor ? "If you received SLIP-39 shares" : "Split among family (Legacy Plan)"}</h3>
<p style="font-size:13px">${isSurvivor
  ? "The owner may have split the seed across several people using the SLIP-39 standard. You'll need the agreed number of shares to reconstruct the phrase. Use any SLIP-39-compatible tool (Trezor Suite supports this, and offline open-source tools exist) to combine them. Never share your piece with anyone but the other share-holders during the combine step."
  : "Our Legacy Plan splits your seed into multiple SLIP-39 shares. No single person can access the funds alone, but together your chosen people can. Survives the loss of any one share, any one device, any one person."}</p>
<h3>What to avoid</h3>
<p style="font-size:13px">Screenshots in a phone gallery. Notes apps that sync to the cloud. Emailing it to yourself. Storing it in a password manager you depend on a company to access. Photos in iCloud or Google Drive. These are convenient and they're how people lose money.</p>

${drillBlock}

<h2>If CryptoOwnBank disappears</h2>
<p style="font-size:13px">${isSurvivor
  ? "The assets are unaffected. CryptoOwnBank never held the owner's funds or keys. The dashboard and reports are conveniences on top of what's already on-chain — every address listed here is still controlled by the seed phrase and reachable from any compatible wallet. CryptoOwnBank publishes its code under the AGPL-3.0 license, so anyone can clone and self-host the dashboard if needed."
  : "Your assets are unaffected. We never hold your funds or your keys. The dashboard, Legacy Plan, reports, and vault integrations are conveniences on top of what's already on-chain — if we vanish tomorrow, every asset listed in this kit is still controlled by your seed phrase and reachable from any compatible wallet. We also publish our code under the AGPL-3.0 license, so anyone can clone, fork, and self-host CryptoOwnBank. The convenience can outlive us because the code is yours too."}</p>
`;
}
