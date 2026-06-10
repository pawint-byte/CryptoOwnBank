import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSignTx,
  getNetwork,
} from "@stellar/freighter-api";
import {
  buildSignSubmitStellar,
  buildPaymentTx,
  buildChangeTrustTx,
  buildOfferTx,
  STELLAR_MAINNET,
  type StellarSigner,
} from "./stellar-signing";

export interface FreighterSignResult {
  success: boolean;
  txHash?: string;
  address?: string;
  error?: string;
}

export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await freighterIsConnected();
    return result.isConnected === true;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<{ address: string | null; error?: string }> {
  try {
    const installed = await isFreighterInstalled();
    if (!installed) {
      return { address: null, error: "Freighter extension not detected. Install it from freighter.app" };
    }
    const accessResult = await requestAccess();
    if (accessResult.error) {
      return { address: null, error: accessResult.error.message || "Access denied by user" };
    }
    if (!accessResult.address || !accessResult.address.startsWith("G")) {
      const addrResult = await getAddress();
      if (addrResult.error || !addrResult.address) {
        return { address: null, error: "Could not retrieve address from Freighter" };
      }
      return { address: addrResult.address };
    }
    return { address: accessResult.address };
  } catch (err: any) {
    return { address: null, error: err?.message || "Failed to connect Freighter" };
  }
}

export async function getFreighterAddress(): Promise<string | null> {
  try {
    const result = await getAddress();
    if (result.error || !result.address) return null;
    return result.address;
  } catch {
    return null;
  }
}

export async function getFreighterNetwork(): Promise<string | null> {
  try {
    const result = await getNetwork();
    if (result.error) return null;
    return result.network || null;
  } catch {
    return null;
  }
}

interface StellarAssetParam {
  code: string;
  issuer: string | null;
  type: string;
}

/**
 * The Freighter extension, expressed as a StellarSigner: reveal the address it
 * was opened with, and hand the XDR to Freighter to sign. This is the live
 * counterpart of the software signer used in scripts/test-stellar-signing.ts —
 * the orchestration code in buildSignSubmitStellar is identical for both.
 */
function freighterSigner(address: string): StellarSigner {
  return {
    getAddress: async () => address,
    signXdr: async (xdr, networkPassphrase) => {
      const signResult = await freighterSignTx(xdr, { networkPassphrase, address });
      if (signResult.error) {
        throw new Error(signResult.error.message || "Signing rejected");
      }
      return signResult.signedTxXdr;
    },
  };
}

export async function buildAndSignOffer(params: {
  sourceAddress: string;
  selling: StellarAssetParam;
  buying: StellarAssetParam;
  amount: string;
  price: string;
}): Promise<FreighterSignResult> {
  return buildSignSubmitStellar(
    (sdk, account, passphrase) =>
      buildOfferTx(sdk, account, passphrase, {
        selling: params.selling,
        buying: params.buying,
        amount: params.amount,
        price: params.price,
      }),
    freighterSigner(params.sourceAddress),
    STELLAR_MAINNET,
    "Transaction failed",
  );
}

export async function buildAndSignPayment(params: {
  sourceAddress: string;
  destination: string;
  asset: StellarAssetParam;
  amount: string;
  memo?: string;
  memoType?: string;
}): Promise<FreighterSignResult> {
  return buildSignSubmitStellar(
    (sdk, account, passphrase) =>
      buildPaymentTx(sdk, account, passphrase, {
        destination: params.destination,
        asset: params.asset,
        amount: params.amount,
        memo: params.memo,
        memoType: params.memoType,
      }),
    freighterSigner(params.sourceAddress),
    STELLAR_MAINNET,
    "Payment failed",
  );
}

export async function buildAndSignChangeTrust(params: {
  sourceAddress: string;
  assetCode: string;
  assetIssuer: string;
  limit?: string;
}): Promise<FreighterSignResult> {
  return buildSignSubmitStellar(
    (sdk, account, passphrase) =>
      buildChangeTrustTx(sdk, account, passphrase, {
        assetCode: params.assetCode,
        assetIssuer: params.assetIssuer,
        limit: params.limit,
      }),
    freighterSigner(params.sourceAddress),
    STELLAR_MAINNET,
    "Trustline change failed",
  );
}
