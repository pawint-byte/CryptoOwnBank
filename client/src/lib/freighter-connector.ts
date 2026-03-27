import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSignTx,
  getNetwork,
} from "@stellar/freighter-api";

const HORIZON_URL = "https://horizon.stellar.org";
const NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

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

async function fetchAccountSequence(address: string): Promise<string> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (!res.ok) throw new Error("Account not found on Stellar network");
  const data = await res.json();
  return data.sequence;
}

interface StellarAssetParam {
  code: string;
  issuer: string | null;
  type: string;
}

function buildAssetXdr(asset: StellarAssetParam): string {
  if (asset.type === "native" || asset.code === "XLM") return "native";
  return `${asset.code}:${asset.issuer}`;
}

export async function buildAndSignOffer(params: {
  sourceAddress: string;
  selling: StellarAssetParam;
  buying: StellarAssetParam;
  amount: string;
  price: string;
}): Promise<FreighterSignResult> {
  try {
    const StellarSdk = await import("@stellar/stellar-sdk");
    const account = await new StellarSdk.Horizon.Server(HORIZON_URL).loadAccount(params.sourceAddress);

    let sellingAsset: any;
    let buyingAsset: any;

    if (params.selling.type === "native" || params.selling.code === "XLM") {
      sellingAsset = StellarSdk.Asset.native();
    } else {
      sellingAsset = new StellarSdk.Asset(params.selling.code, params.selling.issuer!);
    }

    if (params.buying.type === "native" || params.buying.code === "XLM") {
      buyingAsset = StellarSdk.Asset.native();
    } else {
      buyingAsset = new StellarSdk.Asset(params.buying.code, params.buying.issuer!);
    }

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.manageSellOffer({
          selling: sellingAsset,
          buying: buyingAsset,
          amount: params.amount,
          price: params.price,
        })
      )
      .setTimeout(300)
      .build();

    const xdr = tx.toXDR();

    const signResult = await freighterSignTx(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: params.sourceAddress,
    });

    if (signResult.error) {
      return { success: false, error: signResult.error.message || "Signing rejected" };
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResult.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const submitResult = await server.submitTransaction(signedTx as any);

    return {
      success: true,
      txHash: (submitResult as any).hash,
      address: params.sourceAddress,
    };
  } catch (err: any) {
    const msg = err?.response?.data?.extras?.result_codes
      ? JSON.stringify(err.response.data.extras.result_codes)
      : err?.message || "Transaction failed";
    return { success: false, error: msg };
  }
}

export async function buildAndSignPayment(params: {
  sourceAddress: string;
  destination: string;
  asset: StellarAssetParam;
  amount: string;
  memo?: string;
  memoType?: string;
}): Promise<FreighterSignResult> {
  try {
    const StellarSdk = await import("@stellar/stellar-sdk");
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(params.sourceAddress);

    let sendAsset: any;
    if (params.asset.type === "native" || params.asset.code === "XLM") {
      sendAsset = StellarSdk.Asset.native();
    } else {
      sendAsset = new StellarSdk.Asset(params.asset.code, params.asset.issuer!);
    }

    const builder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }).addOperation(
      StellarSdk.Operation.payment({
        destination: params.destination,
        asset: sendAsset,
        amount: params.amount,
      })
    );

    if (params.memo?.trim()) {
      if (params.memoType === "id") {
        builder.addMemo(StellarSdk.Memo.id(params.memo.trim()));
      } else if (params.memoType === "hash") {
        builder.addMemo(StellarSdk.Memo.hash(params.memo.trim()));
      } else {
        builder.addMemo(StellarSdk.Memo.text(params.memo.trim()));
      }
    }

    const tx = builder.setTimeout(300).build();
    const xdr = tx.toXDR();

    const signResult = await freighterSignTx(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: params.sourceAddress,
    });

    if (signResult.error) {
      return { success: false, error: signResult.error.message || "Signing rejected" };
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResult.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const submitResult = await server.submitTransaction(signedTx as any);

    return {
      success: true,
      txHash: (submitResult as any).hash,
      address: params.sourceAddress,
    };
  } catch (err: any) {
    const msg = err?.response?.data?.extras?.result_codes
      ? JSON.stringify(err.response.data.extras.result_codes)
      : err?.message || "Payment failed";
    return { success: false, error: msg };
  }
}

export async function buildAndSignChangeTrust(params: {
  sourceAddress: string;
  assetCode: string;
  assetIssuer: string;
  limit?: string;
}): Promise<FreighterSignResult> {
  try {
    const StellarSdk = await import("@stellar/stellar-sdk");
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(params.sourceAddress);

    const asset = new StellarSdk.Asset(params.assetCode, params.assetIssuer);

    const opParams: any = { asset };
    if (params.limit !== undefined) {
      opParams.limit = params.limit;
    }

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.changeTrust(opParams))
      .setTimeout(300)
      .build();

    const xdr = tx.toXDR();

    const signResult = await freighterSignTx(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: params.sourceAddress,
    });

    if (signResult.error) {
      return { success: false, error: signResult.error.message || "Signing rejected" };
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResult.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const submitResult = await server.submitTransaction(signedTx as any);

    return {
      success: true,
      txHash: (submitResult as any).hash,
      address: params.sourceAddress,
    };
  } catch (err: any) {
    const msg = err?.response?.data?.extras?.result_codes
      ? JSON.stringify(err.response.data.extras.result_codes)
      : err?.message || "Trustline change failed";
    return { success: false, error: msg };
  }
}
