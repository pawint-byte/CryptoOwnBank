// Farthest-point test of the cold-wallet signing pipeline, run against XRPL
// Testnet with software stand-in wallets (the part a real hardware wallet plays
// is "produce a signature" — which a software key replicates exactly).
//
// What this proves, for real, with no hardware:
//   1. Our build -> sign -> assemble path is BYTE-IDENTICAL to xrpl's own
//      reference signer (Wallet.sign) for both native XRP and IOU payments.
//   2. The assembled blob actually lands on the ledger (tesSUCCESS) on testnet.
//   3. buildRlusdPayment produces a well-formed tx that encode/decode round-trips.
//
// The ONLY thing this cannot do is press the physical button on a Ledger — the
// cryptography and the submission are identical to the live path.
//
// Run: npx tsx scripts/test-xrpl-signing.ts

import { Client, Wallet, decode } from "xrpl";
import { sign } from "ripple-keypairs";
import {
  buildRlusdPayment,
  buildTrustSet,
  signingMessage,
  attachSignature,
} from "../client/src/lib/xrpl-signing";

const TESTNET = "wss://s.altnet.rippletest.net:51233";

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

/** Sign with a software key exactly the way the core expects a device to. */
function softwareSignToBlob(prepared: Record<string, any>, wallet: Wallet): string {
  const msg = signingMessage(prepared);
  const signature = sign(msg, wallet.privateKey);
  return attachSignature(prepared, signature).txBlob;
}

async function main() {
  console.log("Connecting to XRPL Testnet…");
  const client = new Client(TESTNET);
  await client.connect();

  try {
    console.log("Funding test wallets (faucet)…");
    const { wallet: alice } = await client.fundWallet();
    const { wallet: bob } = await client.fundWallet();
    console.log(`  Alice: ${alice.classicAddress}`);
    console.log(`  Bob:   ${bob.classicAddress}`);

    // --- Test 1: native XRP Payment ---------------------------------------
    console.log("\n[1] Native XRP Payment (build -> sign -> assemble -> submit)");
    {
      const tx: Record<string, any> = {
        TransactionType: "Payment",
        Account: alice.classicAddress,
        Destination: bob.classicAddress,
        Amount: "1000000", // 1 XRP in drops
      };
      const prepared = await client.autofill(tx as any);
      (prepared as any).SigningPubKey = alice.publicKey;

      const mine = softwareSignToBlob(prepared as any, alice);
      const reference = alice.sign(prepared as any).tx_blob;
      check("our blob is byte-identical to xrpl Wallet.sign", mine === reference);

      const res = await client.submitAndWait(mine);
      const code = (res.result.meta as any)?.TransactionResult;
      check("native XRP payment lands on ledger (tesSUCCESS)", code === "tesSUCCESS", `got ${code}`);
    }

    // --- Test 2: IOU Payment (same shape as an RLUSD deposit) -------------
    console.log("\n[2] IOU Payment — Alice issues USD, Bob trusts, Alice pays Bob");
    {
      // Bob trusts Alice's USD.
      const trust = buildTrustSet(bob.classicAddress, "USD", alice.classicAddress, "1000000");
      const trustPrepared = await client.autofill(trust as any);
      (trustPrepared as any).SigningPubKey = bob.publicKey;
      const trustBlob = softwareSignToBlob(trustPrepared as any, bob);
      check("TrustSet blob is byte-identical to Wallet.sign", trustBlob === bob.sign(trustPrepared as any).tx_blob);
      const trustRes = await client.submitAndWait(trustBlob);
      check("TrustSet lands on ledger", (trustRes.result.meta as any)?.TransactionResult === "tesSUCCESS");

      // Alice sends 25 USD (IOU) to Bob — same Amount-object shape as RLUSD.
      const pay: Record<string, any> = {
        TransactionType: "Payment",
        Account: alice.classicAddress,
        Destination: bob.classicAddress,
        Amount: { currency: "USD", issuer: alice.classicAddress, value: "25" },
      };
      const payPrepared = await client.autofill(pay as any);
      (payPrepared as any).SigningPubKey = alice.publicKey;
      const mine = softwareSignToBlob(payPrepared as any, alice);
      check("IOU payment blob is byte-identical to Wallet.sign", mine === alice.sign(payPrepared as any).tx_blob);
      const res = await client.submitAndWait(mine);
      const code = (res.result.meta as any)?.TransactionResult;
      check("IOU payment lands on ledger (tesSUCCESS)", code === "tesSUCCESS", `got ${code}`);
    }

    // --- Test 3: buildRlusdPayment is well-formed + round-trips -----------
    console.log("\n[3] buildRlusdPayment structure + encode/decode round-trip");
    {
      const tx = buildRlusdPayment({
        account: alice.classicAddress,
        destination: bob.classicAddress,
        amount: "100.5",
        memos: [{ MemoType: "vault", MemoData: "soil-treasury" }],
      });
      check("TransactionType is Payment", tx.TransactionType === "Payment");
      check("Amount is an IOU object (currency/issuer/value)",
        typeof tx.Amount === "object" && tx.Amount.value === "100.5" && !!tx.Amount.issuer);
      check("memo hex-encoded", /^[0-9A-F]+$/.test(tx.Memos[0].Memo.MemoData));

      const prepared = await client.autofill(tx as any);
      (prepared as any).SigningPubKey = alice.publicKey;
      const blob = softwareSignToBlob(prepared as any, alice);
      const round = decode(blob);
      check("signed RLUSD blob decodes back with a TxnSignature", !!(round as any).TxnSignature);
      check("decoded RLUSD amount survives round-trip",
        (round as any).Amount?.value === "100.5");
    }
  } finally {
    await client.disconnect();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Harness error:", e);
  process.exit(1);
});
