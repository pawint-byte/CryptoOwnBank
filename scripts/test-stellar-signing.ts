// Farthest-point test of the Stellar build -> sign -> submit pipeline, run
// against Stellar Testnet with software stand-in wallets. A wallet extension's
// only job is to "reveal an address and sign an XDR" — a software Keypair
// replicates that exactly, so we can prove everything up to and through the
// cryptography and submission.
//
// What this proves, for real, with no extension:
//   1. The REAL production orchestrator `buildSignSubmitStellar` — the same
//      function the live Freighter path calls — drives a native XLM payment, a
//      changeTrust (trustline), an issued-asset payment, and a DEX sell offer
//      onto Testnet, each returning a real tx hash.
//   2. The shared builders (buildPaymentTx / buildChangeTrustTx / buildOfferTx)
//      produce transactions Horizon accepts.
//
// The ONLY thing this cannot do is the user's own Freighter/Ledger approval and
// a mainnet submit (needs real funds). Everything else is the real code path.
//
// Run: npx tsx scripts/test-stellar-signing.ts

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  buildSignSubmitStellar,
  buildPaymentTx,
  buildChangeTrustTx,
  buildOfferTx,
  STELLAR_TESTNET,
  type StellarSigner,
} from "../client/src/lib/stellar-signing";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.error(`  \u2717 ${name} ${extra}`);
  }
}

/** A software stand-in for Freighter: same StellarSigner interface, signs with a raw key. */
function softwareSigner(kp: StellarSdk.Keypair): StellarSigner {
  return {
    getAddress: async () => kp.publicKey(),
    signXdr: async (xdr, networkPassphrase) => {
      const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, networkPassphrase);
      tx.sign(kp);
      return tx.toXDR();
    },
  };
}

async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error(`Friendbot funding failed for ${address}: ${res.status}`);
}

async function main() {
  console.log("Creating + funding Testnet wallets (Friendbot)…");
  const issuer = StellarSdk.Keypair.random(); // "alice" — issues USD
  const receiver = StellarSdk.Keypair.random(); // "bob"
  await Promise.all([
    fundWithFriendbot(issuer.publicKey()),
    fundWithFriendbot(receiver.publicKey()),
  ]);
  console.log(`  Issuer (alice): ${issuer.publicKey()}`);
  console.log(`  Receiver (bob): ${receiver.publicKey()}`);

  // --- Test 1: native XLM payment via REAL orchestrator ------------------
  console.log("\n[1] Native XLM payment via REAL buildSignSubmitStellar");
  {
    const r = await buildSignSubmitStellar(
      (sdk, account, passphrase) =>
        buildPaymentTx(sdk, account, passphrase, {
          destination: receiver.publicKey(),
          asset: { code: "XLM", issuer: null, type: "native" },
          amount: "10",
          memo: "vault-test",
        }),
      softwareSigner(issuer),
      STELLAR_TESTNET,
    );
    check("native XLM payment lands on Testnet", r.success, JSON.stringify(r));
    check("payment returns a real tx hash", !!r.txHash && r.txHash.length === 64);
  }

  // --- Test 2: changeTrust (trustline) via REAL orchestrator -------------
  console.log("\n[2] changeTrust via REAL orchestrator — bob trusts USD:alice");
  {
    const r = await buildSignSubmitStellar(
      (sdk, account, passphrase) =>
        buildChangeTrustTx(sdk, account, passphrase, {
          assetCode: "USD",
          assetIssuer: issuer.publicKey(),
          limit: "1000000",
        }),
      softwareSigner(receiver),
      STELLAR_TESTNET,
    );
    check("trustline change lands on Testnet", r.success, JSON.stringify(r));
  }

  // --- Test 3: issued-asset payment via REAL orchestrator ----------------
  console.log("\n[3] Issued-asset payment via REAL orchestrator — alice pays 25 USD to bob");
  {
    const r = await buildSignSubmitStellar(
      (sdk, account, passphrase) =>
        buildPaymentTx(sdk, account, passphrase, {
          destination: receiver.publicKey(),
          asset: { code: "USD", issuer: issuer.publicKey(), type: "credit_alphanum4" },
          amount: "25",
        }),
      softwareSigner(issuer),
      STELLAR_TESTNET,
    );
    check("issued-asset (USD) payment lands on Testnet", r.success, JSON.stringify(r));
  }

  // --- Test 4: DEX sell offer via REAL orchestrator ----------------------
  console.log("\n[4] DEX manageSellOffer via REAL orchestrator — bob sells 5 USD for XLM");
  {
    const r = await buildSignSubmitStellar(
      (sdk, account, passphrase) =>
        buildOfferTx(sdk, account, passphrase, {
          selling: { code: "USD", issuer: issuer.publicKey(), type: "credit_alphanum4" },
          buying: { code: "XLM", issuer: null, type: "native" },
          amount: "5",
          price: "2",
        }),
      softwareSigner(receiver),
      STELLAR_TESTNET,
    );
    check("DEX sell offer lands on Testnet", r.success, JSON.stringify(r));
  }

  // --- Test 5: wrong key is rejected by the network ----------------------
  console.log("\n[5] A transaction signed by the wrong key is rejected");
  {
    const stranger = StellarSdk.Keypair.random();
    // Build for alice's account but sign with a stranger's key (getAddress is
    // alice, signXdr uses stranger) — Horizon must reject the bad signature.
    const badSigner: StellarSigner = {
      getAddress: async () => issuer.publicKey(),
      signXdr: async (xdr, passphrase) => {
        const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, passphrase);
        tx.sign(stranger);
        return tx.toXDR();
      },
    };
    const r = await buildSignSubmitStellar(
      (sdk, account, passphrase) =>
        buildPaymentTx(sdk, account, passphrase, {
          destination: receiver.publicKey(),
          asset: { code: "XLM", issuer: null, type: "native" },
          amount: "1",
        }),
      badSigner,
      STELLAR_TESTNET,
    );
    check("network rejects a transaction signed by the wrong key", !r.success);
  }

  // --- Test 6: per-operation fallback error parity (no network) ----------
  console.log("\n[6] Fallback error message parity when no message/result_codes");
  {
    // A signer whose getAddress rejects with a message-less error, so the
    // orchestrator must fall back to the per-operation default it was given.
    const noMsgSigner: StellarSigner = {
      getAddress: async () => {
        throw new Error("");
      },
      signXdr: async (xdr) => xdr,
    };
    const r = await buildSignSubmitStellar(
      (sdk, account, passphrase) =>
        buildPaymentTx(sdk, account, passphrase, {
          destination: receiver.publicKey(),
          asset: { code: "XLM", issuer: null, type: "native" },
          amount: "1",
        }),
      noMsgSigner,
      STELLAR_TESTNET,
      "Payment failed",
    );
    check("uses the per-operation fallback error ('Payment failed')", r.error === "Payment failed", JSON.stringify(r));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Harness error:", e);
  process.exit(1);
});
