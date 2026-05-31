// Wallet / signer capability matrix for XRPL signing.
//
// This is the single source of truth for two questions:
//   1. Which wallet can a member use, and how good is the experience? (lanes)
//   2. For a given transaction type, will the device show full details
//      ("clear signing") or just an unreadable code ("blind signing")?
//
// The honest reality: our app BUILDS the transaction, but the device only
// SIGNS bytes. A device can only show the user what they're approving if its
// own firmware understands the transaction type. New XRPL transaction types
// (like the XLS-65/66 vault deposits) need a firmware/app update from the
// device maker before they can be clear-signed. Until then it's blind signing,
// which quietly shifts trust from the device back onto our app — so we gate it.

export type SignFidelity = "clear" | "blind" | "unsupported";

export type SignerLane = "recommended" | "supported" | "advanced" | "coming-soon";

// XRPL transaction types we care about here. Vault deposit/withdraw are the
// brand-new XLS-65/66 types; payment/trustset are the long-standing baseline.
export type TxType = "VaultDeposit" | "VaultWithdraw" | "Payment" | "TrustSet";

export interface SignerCapability {
  id: string;
  name: string;
  /** Plain-English description of how the device connects. */
  connection: string;
  /** Where this signer realistically works (desktop web, mobile, etc.). */
  platform: string;
  /** True once the connection plumbing actually exists in our app. */
  integrated: boolean;
  /** The primary, safest day-one path. Drives the "Recommended now" lane. */
  primary?: boolean;
  /** Per-transaction-type signing fidelity. */
  fidelity: Record<TxType, SignFidelity>;
  /** Short, honest note shown under the wallet. */
  note: string;
}

export const SIGNERS: SignerCapability[] = [
  {
    id: "xaman",
    name: "Xaman (XUMM)",
    connection: "Phone app — scan a QR code or tap a link",
    platform: "Phone (works alongside desktop via QR)",
    integrated: true,
    primary: true,
    fidelity: {
      VaultDeposit: "clear",
      VaultWithdraw: "clear",
      Payment: "clear",
      TrustSet: "clear",
    },
    note: "Xaman updates centrally, so it's the safest day-one path for brand-new transaction types like vault deposits. This is what we recommend at launch.",
  },
  {
    id: "ledger-xaman",
    name: "Ledger + Xaman",
    connection: "Ledger paired to Xaman (Bluetooth / NFC)",
    platform: "Phone + Ledger device",
    integrated: true,
    fidelity: {
      VaultDeposit: "clear",
      VaultWithdraw: "clear",
      Payment: "clear",
      TrustSet: "clear",
    },
    note: "Your keys stay protected on the Ledger, while Xaman shows you the full transaction details to approve — the clarity comes from Xaman, not the Ledger's own screen. Best of both worlds for larger amounts.",
  },
  {
    id: "ledger-usb",
    name: "Ledger (direct)",
    connection: "USB cable — Chrome or Edge on desktop",
    platform: "Desktop web only",
    integrated: true,
    fidelity: {
      // Regular XRP actions clear-sign today. Vault deposits will only "blind
      // sign" until Ledger ships an XRP-app update that understands XLS-65/66.
      VaultDeposit: "blind",
      VaultWithdraw: "blind",
      Payment: "clear",
      TrustSet: "clear",
    },
    note: "Regular XRP payments show full details on the device. Vault deposits can only be 'blind signed' until Ledger ships an XRP-app update for XLS-66 — so we keep this opt-in with a clear warning.",
  },
  {
    id: "trezor",
    name: "Trezor (Safe 5 / Safe 3 / Model T)",
    connection: "USB cable — desktop browser",
    platform: "Desktop web (USB)",
    integrated: false,
    fidelity: {
      VaultDeposit: "unsupported",
      VaultWithdraw: "unsupported",
      Payment: "unsupported",
      TrustSet: "unsupported",
    },
    note: "Supports XRP and connects straight to a desktop browser over USB — the same kind of path as Ledger. It's on our list to wire up. (The old Model One doesn't support XRP.) Like every hardware wallet, vault deposits also wait on a firmware update.",
  },
  {
    id: "keystone",
    name: "Keystone",
    connection: "Fully offline QR-code signing",
    platform: "Mobile or desktop (QR)",
    integrated: false,
    fidelity: {
      VaultDeposit: "unsupported",
      VaultWithdraw: "unsupported",
      Payment: "unsupported",
      TrustSet: "unsupported",
    },
    note: "Supports XRP with fully offline, air-gapped QR signing (the device never touches a cable or the internet). On our list; vault-deposit support also waits on a Keystone firmware update.",
  },
  {
    id: "tangem",
    name: "Tangem",
    connection: "Tap a card to your phone (NFC)",
    platform: "Mobile only (NFC)",
    integrated: false,
    fidelity: {
      VaultDeposit: "unsupported",
      VaultWithdraw: "unsupported",
      Payment: "unsupported",
      TrustSet: "unsupported",
    },
    note: "Supports XRP, but signing is mobile-first (tap the card to your phone) — it doesn't work over desktop web. A mobile integration is on the roadmap.",
  },
  {
    id: "dcent",
    name: "D'CENT",
    connection: "Bluetooth (mobile)",
    platform: "Mobile-first",
    integrated: false,
    fidelity: {
      VaultDeposit: "unsupported",
      VaultWithdraw: "unsupported",
      Payment: "unsupported",
      TrustSet: "unsupported",
    },
    note: "Supports XRP over Bluetooth, mobile-first. On the roadmap once vault-deposit support is confirmed.",
  },
  {
    id: "arculus",
    name: "Arculus",
    connection: "Tap-to-sign card (NFC)",
    platform: "Mobile only (NFC)",
    integrated: false,
    fidelity: {
      VaultDeposit: "unsupported",
      VaultWithdraw: "unsupported",
      Payment: "unsupported",
      TrustSet: "unsupported",
    },
    note: "NFC card wallet, mobile-first — doesn't work over desktop web. On the roadmap once vault-deposit support is confirmed.",
  },
  {
    id: "other",
    name: "Other wallets (Ellipal, SafePal, Cypherock…)",
    connection: "Mostly QR or mobile apps",
    platform: "Mostly mobile / QR",
    integrated: false,
    fidelity: {
      VaultDeposit: "unsupported",
      VaultWithdraw: "unsupported",
      Payment: "unsupported",
      TrustSet: "unsupported",
    },
    note: "Several other wallets support XRP via QR or mobile apps. We'll add the ones members ask for most, once vault-deposit signing is confirmed. Tell us which you use.",
  },
];

/** Work out which lane a signer belongs in for a given transaction type. */
export function laneFor(signer: SignerCapability, txType: TxType): SignerLane {
  if (!signer.integrated) return "coming-soon";
  const fidelity = signer.fidelity[txType] ?? "unsupported";
  if (fidelity === "unsupported") return "coming-soon";
  if (fidelity === "blind") return "advanced";
  // clear signing
  return signer.primary ? "recommended" : "supported";
}

export interface LaneMeta {
  id: SignerLane;
  label: string;
  description: string;
}

// Display order matters: best experience first.
export const LANE_ORDER: SignerLane[] = [
  "recommended",
  "supported",
  "advanced",
  "coming-soon",
];

export const LANE_META: Record<SignerLane, LaneMeta> = {
  recommended: {
    id: "recommended",
    label: "Recommended now",
    description:
      "Works today and shows you the full transaction details on your device. The safest path.",
  },
  supported: {
    id: "supported",
    label: "Supported",
    description: "Works today and shows full details. A solid, secure choice.",
  },
  advanced: {
    id: "advanced",
    label: "Advanced (opt-in)",
    description:
      "Works, but your device can't show the full vault details yet — so you'd be trusting our screen, not the device. For experienced users only, behind a warning.",
  },
  "coming-soon": {
    id: "coming-soon",
    label: "Coming soon",
    description:
      "Not available yet. We'll switch it on once it can sign vault transactions safely.",
  },
};

export interface FidelityMeta {
  label: string;
  detail: string;
}

export const FIDELITY_META: Record<SignFidelity, FidelityMeta> = {
  clear: {
    label: "Clear signing",
    detail: "Your device shows exactly what you're approving.",
  },
  blind: {
    label: "Blind signing",
    detail: "Your device shows only a code, not the details — you trust our screen.",
  },
  unsupported: {
    label: "Not available yet",
    detail: "This device can't sign vault transactions through our site yet.",
  },
};

/** Group signers into lanes for a given transaction type, in display order. */
export function signersByLane(
  txType: TxType,
): { lane: SignerLane; signers: SignerCapability[] }[] {
  return LANE_ORDER.map((lane) => ({
    lane,
    signers: SIGNERS.filter((s) => laneFor(s, txType) === lane),
  })).filter((group) => group.signers.length > 0);
}
