// Pure Stellar signing core — injectable signer + network, no extension I/O.
//
// This mirrors xrpl-signing.ts: a hardware/extension wallet's only job is to
// "reveal an address and produce a signature", so we express that as an
// interface. The EXACT same build -> sign -> submit code runs in production
// (signer = the Freighter browser extension, network = mainnet Horizon) and in
// the test harness (signer = a software Keypair, network = Stellar Testnet
// Horizon). That means the harness exercises the real flow, not a copy of it.
//
// @stellar/stellar-sdk is isomorphic (works in Node), so this file is safe to
// import from a plain `tsx` test runner — unlike freighter-connector.ts, which
// top-level-imports the browser-only @stellar/freighter-api.

export const STELLAR_MAINNET: StellarNetwork = {
  horizonUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
};

export const STELLAR_TESTNET: StellarNetwork = {
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

/** A thing that can reveal an address and sign a Stellar transaction XDR. */
export interface StellarSigner {
  getAddress(): Promise<string>;
  /** Sign a base64 XDR for the given network, return the signed base64 XDR. */
  signXdr(xdr: string, networkPassphrase: string): Promise<string>;
}

export interface StellarNetwork {
  horizonUrl: string;
  networkPassphrase: string;
}

export interface StellarSubmitResult {
  success: boolean;
  txHash?: string;
  address?: string;
  error?: string;
}

/**
 * load account -> build tx -> sign -> submit, with the signer and network
 * injected. Single source of truth for the Stellar send/trade/trust flow; both
 * the live Freighter path and the Testnet harness call it so the assembly logic
 * is proven, not duplicated. The `buildTx` callback receives the loaded SDK,
 * the loaded source account, and the network passphrase, and returns a built
 * (unsigned) Transaction.
 */
export async function buildSignSubmitStellar(
  buildTx: (sdk: any, account: any, networkPassphrase: string) => any,
  signer: StellarSigner,
  net: StellarNetwork,
): Promise<StellarSubmitResult> {
  try {
    const StellarSdk = await import("@stellar/stellar-sdk");
    const server = new StellarSdk.Horizon.Server(net.horizonUrl);

    const address = await signer.getAddress();
    const account = await server.loadAccount(address);

    const tx = buildTx(StellarSdk, account, net.networkPassphrase);
    const signedXdr = await signer.signXdr(tx.toXDR(), net.networkPassphrase);

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      net.networkPassphrase,
    );
    const submitResult = await server.submitTransaction(signedTx as any);

    return { success: true, txHash: (submitResult as any).hash, address };
  } catch (err: any) {
    const msg = err?.response?.data?.extras?.result_codes
      ? JSON.stringify(err.response.data.extras.result_codes)
      : err?.message || "Transaction failed";
    return { success: false, error: msg };
  }
}

interface StellarAssetParam {
  code: string;
  issuer: string | null;
  type: string;
}

/** Resolve an asset param to a stellar-sdk Asset (native or credit). */
export function toStellarAsset(sdk: any, asset: StellarAssetParam): any {
  if (asset.type === "native" || asset.code === "XLM") return sdk.Asset.native();
  return new sdk.Asset(asset.code, asset.issuer!);
}

/** Build a payment transaction (used by the live flow and the harness). */
export function buildPaymentTx(
  sdk: any,
  account: any,
  networkPassphrase: string,
  params: {
    destination: string;
    asset: StellarAssetParam;
    amount: string;
    memo?: string;
    memoType?: string;
  },
): any {
  const builder = new sdk.TransactionBuilder(account, {
    fee: sdk.BASE_FEE,
    networkPassphrase,
  }).addOperation(
    sdk.Operation.payment({
      destination: params.destination,
      asset: toStellarAsset(sdk, params.asset),
      amount: params.amount,
    }),
  );

  if (params.memo?.trim()) {
    if (params.memoType === "id") {
      builder.addMemo(sdk.Memo.id(params.memo.trim()));
    } else if (params.memoType === "hash") {
      builder.addMemo(sdk.Memo.hash(params.memo.trim()));
    } else {
      builder.addMemo(sdk.Memo.text(params.memo.trim()));
    }
  }

  return builder.setTimeout(300).build();
}

/** Build a changeTrust (trustline) transaction. */
export function buildChangeTrustTx(
  sdk: any,
  account: any,
  networkPassphrase: string,
  params: { assetCode: string; assetIssuer: string; limit?: string },
): any {
  const opParams: any = { asset: new sdk.Asset(params.assetCode, params.assetIssuer) };
  if (params.limit !== undefined) opParams.limit = params.limit;

  return new sdk.TransactionBuilder(account, {
    fee: sdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(sdk.Operation.changeTrust(opParams))
    .setTimeout(300)
    .build();
}

/** Build a manageSellOffer (DEX) transaction. */
export function buildOfferTx(
  sdk: any,
  account: any,
  networkPassphrase: string,
  params: {
    selling: StellarAssetParam;
    buying: StellarAssetParam;
    amount: string;
    price: string;
  },
): any {
  return new sdk.TransactionBuilder(account, {
    fee: sdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      sdk.Operation.manageSellOffer({
        selling: toStellarAsset(sdk, params.selling),
        buying: toStellarAsset(sdk, params.buying),
        amount: params.amount,
        price: params.price,
      }),
    )
    .setTimeout(300)
    .build();
}
