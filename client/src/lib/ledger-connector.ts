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
