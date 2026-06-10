export interface LedgerResult {
  success: boolean;
  address?: string;
  publicKey?: string;
  error?: string;
}

export async function isWebUSBSupported(): Promise<boolean> {
  try {
    return !!(navigator as any).usb;
  } catch {
    return false;
  }
}

export async function connectLedger(): Promise<LedgerResult> {
  try {
    const supported = await isWebUSBSupported();
    if (!supported) {
      return {
        success: false,
        error: "WebUSB is not supported in this browser. Please use Chrome or Edge.",
      };
    }

    const TransportWebUSB = (await import("@ledgerhq/hw-transport-webusb")).default;
    const Xrp = (await import("@ledgerhq/hw-app-xrp")).default;

    const transport = await TransportWebUSB.create();
    const xrp = new Xrp(transport);

    const result = await xrp.getAddress("44'/144'/0'/0/0");

    await transport.close();

    return {
      success: true,
      address: result.address,
      publicKey: result.publicKey,
    };
  } catch (error: any) {
    let errorMessage = error.message || "Failed to connect Ledger";

    if (errorMessage.includes("No device selected")) {
      errorMessage = "No Ledger device detected. Make sure it's connected, unlocked, and the XRP app is open.";
    } else if (errorMessage.includes("denied")) {
      errorMessage = "USB access was denied. Please allow access to your Ledger device.";
    }

    return { success: false, error: errorMessage };
  }
}

export async function signWithLedger(
  _rawTx: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const supported = await isWebUSBSupported();
    if (!supported) {
      return { success: false, error: "WebUSB not supported" };
    }

    const TransportWebUSB = (await import("@ledgerhq/hw-transport-webusb")).default;
    const Xrp = (await import("@ledgerhq/hw-app-xrp")).default;

    const transport = await TransportWebUSB.create();
    const xrp = new Xrp(transport);

    const result = await xrp.signTransaction("44'/144'/0'/0/0", _rawTx);

    await transport.close();

    return { success: true, signature: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to sign with Ledger",
    };
  }
}

// ---------------------------------------------------------------------------
// Real cold-wallet signing: build -> autofill -> device sign -> assemble ->
// submit, all inside ONE USB session so the member only confirms once and we
// never store their public key. This is the live path that replaces the old
// `ledger-sim-` placeholder.
// ---------------------------------------------------------------------------

const XRP_PATH = "44'/144'/0'/0/0";

export interface LedgerTxResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

function friendlyLedgerError(message: string): string {
  if (/No device selected/i.test(message)) {
    return "No Ledger detected. Plug it in, unlock it, and open the XRP app, then try again.";
  }
  if (/0x6985|denied by the user|rejected|UserRefused/i.test(message)) {
    return "You declined the transaction on your Ledger. Nothing was sent.";
  }
  if (/denied|SecurityError/i.test(message)) {
    return "USB access to your Ledger was denied. Allow access and try again.";
  }
  if (/0x6e00|0x6d00|INS_NOT_SUPPORTED|app/i.test(message)) {
    return "Open the XRP app on your Ledger first, then try again.";
  }
  return message || "Could not sign with your Ledger.";
}

async function signAndSubmitWithLedger(
  baseTxFor: (account: string) => Record<string, any>,
  expectedAddress: string,
): Promise<LedgerTxResult> {
  if (!(await isWebUSBSupported())) {
    return {
      success: false,
      error:
        "Your Ledger connects over USB, which phones can't do. Open this on Chrome or Edge on a desktop computer — or use Xaman to sign on your phone.",
    };
  }

  const { autofillTx, submitSignedBlob } = await import("./xrpl-client");
  const { assembleSignSubmit, encodeForDevice } = await import("./xrpl-signing");

  let transport: any = null;
  try {
    const TransportWebUSB = (await import("@ledgerhq/hw-transport-webusb")).default;
    const Xrp = (await import("@ledgerhq/hw-app-xrp")).default;

    transport = await TransportWebUSB.create();
    const xrp = new Xrp(transport);

    // The Ledger device, expressed as a TxSigner: reveal its address, and sign
    // the device blob (Ledger applies the signing prefix internally).
    const ledgerSigner = {
      getAddress: async () => {
        const { address, publicKey } = await xrp.getAddress(XRP_PATH);
        return { address, publicKey };
      },
      signPrepared: (prepared: Record<string, any>) =>
        xrp.signTransaction(XRP_PATH, encodeForDevice(prepared)),
    };

    const net = {
      autofill: (tx: Record<string, any>) => autofillTx(tx),
      submit: (txBlob: string) => submitSignedBlob(txBlob),
    };

    const result = await assembleSignSubmit(
      baseTxFor,
      ledgerSigner,
      net,
      expectedAddress,
    );

    if (result.stage === "mismatch") {
      return {
        success: false,
        error:
          "This Ledger holds a different XRP address than the one you connected. Switch to the matching account and try again.",
      };
    }
    if (!result.success) {
      return {
        success: false,
        error: `The XRP Ledger didn't accept it (${result.code || result.error}). Nothing left your wallet.`,
      };
    }
    return { success: true, txHash: result.txHash };
  } catch (error: any) {
    return { success: false, error: friendlyLedgerError(error?.message || "") };
  } finally {
    try {
      if (transport) await transport.close();
    } catch {}
  }
}

/** Sign + broadcast an RLUSD (IOU) Payment to a vault, directly from a Ledger. */
export async function signRlusdPaymentWithLedger(
  params: { destination: string; amount: string; memos?: { MemoType?: string; MemoData?: string }[] },
  expectedAddress: string,
): Promise<LedgerTxResult> {
  const { buildRlusdPayment } = await import("./xrpl-signing");
  return signAndSubmitWithLedger(
    (account) => buildRlusdPayment({ ...params, account }),
    expectedAddress,
  );
}

/** Sign + broadcast a TrustSet (e.g. to open the RLUSD line) from a Ledger. */
export async function signTrustSetWithLedger(
  currency: string,
  issuer: string,
  expectedAddress: string,
  limit?: string,
): Promise<LedgerTxResult> {
  const { buildTrustSet } = await import("./xrpl-signing");
  return signAndSubmitWithLedger(
    (account) => buildTrustSet(account, currency, issuer, limit),
    expectedAddress,
  );
}
