import { mnemonicToSeedSync } from "bip39";
import { HDKey } from "@scure/bip32";
import { bech32, base58, base32 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { derivePath, getPublicKey as ed25519PubKey } from "ed25519-hd-key";
import { Wallet as XrplWallet } from "xrpl";
import { ethers } from "ethers";

export type DerivedAddress = {
  chain: string;
  displayName: string;
  symbol: string;
  address: string;
  derivationPath: string;
  alsoCovers?: string[];
  notes?: string;
};

export const NON_DERIVABLE_CHAINS: { name: string; reason: string }[] = [
  { name: "Cardano (ADA)", reason: "Uses CIP-1852 derivation. Same seed still controls it — restore in Yoroi, Eternl, or Daedalus." },
  { name: "Polkadot (DOT) / Kusama", reason: "Uses the sr25519 curve, not secp256k1 or ed25519. Restore in Polkadot.js or Talisman." },
  { name: "Algorand (ALGO)", reason: "Uses its own 25-word mnemonic, not standard BIP-39. Generated separately in the Algorand wallet." },
  { name: "Near (NEAR)", reason: "Uses ed25519 with NEAR-specific account naming. Restore in the official NEAR Wallet." },
  { name: "Aptos (APT)", reason: "Uses ed25519 with Aptos-specific account derivation. Restore in Petra or Martian." },
  { name: "Sui (SUI)", reason: "Multi-scheme — restore in Sui Wallet or Suiet." },
  { name: "Tezos (XTZ)", reason: "Uses ed25519 with Tezos-specific encoding. Restore in Temple or Kukai." },
  { name: "Hedera (HBAR)", reason: "Uses ed25519 but accounts must be created on-network with a fee. Restore in HashPack." },
];

function toHex(bytes: Uint8Array | { length: number; [k: number]: number }): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += (bytes[i] & 0xff).toString(16).padStart(2, "0");
  }
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function hash160(pub: Uint8Array): Uint8Array {
  return ripemd160(sha256(pub));
}

function base58check(versioned: Uint8Array): string {
  const checksum = sha256(sha256(versioned)).slice(0, 4);
  const full = new Uint8Array(versioned.length + 4);
  full.set(versioned, 0);
  full.set(checksum, versioned.length);
  return base58.encode(full);
}

function crc16XModem(data: Uint8Array): number {
  let crc = 0;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc & 0xffff;
}

function stellarStrKey(pub: Uint8Array): string {
  const payload = new Uint8Array(1 + pub.length);
  payload[0] = 0x30; // version byte: account ID
  payload.set(pub, 1);
  const checksum = crc16XModem(payload);
  const full = new Uint8Array(payload.length + 2);
  full.set(payload, 0);
  full[payload.length] = checksum & 0xff;
  full[payload.length + 1] = (checksum >> 8) & 0xff;
  return base32.encode(full).replace(/=+$/g, "");
}

function evmAddressFromPriv(privKey: Uint8Array): string {
  const wallet = new ethers.Wallet("0x" + toHex(privKey));
  return wallet.address;
}

function tronAddressFromPriv(privKey: Uint8Array): string {
  const wallet = new ethers.Wallet("0x" + toHex(privKey));
  const pubHex = wallet.signingKey.publicKey;
  const uncompressed = hexToBytes(pubHex).slice(1);
  const hashed = keccak_256(uncompressed).slice(-20);
  const versioned = new Uint8Array(21);
  versioned[0] = 0x41;
  versioned.set(hashed, 1);
  return base58check(versioned);
}

function btcSegwit(pubCompressed: Uint8Array, hrp: string): string {
  const h160 = hash160(pubCompressed);
  const words = bech32.toWords(h160);
  return bech32.encode(hrp, [0, ...words]);
}

function btcP2PKH(pubCompressed: Uint8Array, versionByte: number): string {
  const h160 = hash160(pubCompressed);
  const versioned = new Uint8Array(21);
  versioned[0] = versionByte;
  versioned.set(h160, 1);
  return base58check(versioned);
}

function cosmosBech32(pubCompressed: Uint8Array, hrp: string): string {
  const h160 = hash160(pubCompressed);
  const words = bech32.toWords(h160);
  return bech32.encode(hrp, words);
}

export function deriveAllAddresses(mnemonic: string): DerivedAddress[] {
  const seedBuf = mnemonicToSeedSync(mnemonic);
  const seed = new Uint8Array(seedBuf as any);
  const seedHex = toHex(seed);
  const root = HDKey.fromMasterSeed(seed);
  const out: DerivedAddress[] = [];

  try {
    const xrpWallet = XrplWallet.fromMnemonic(mnemonic, { derivationPath: "m/44'/144'/0'/0/0" });
    out.push({
      chain: "xrp",
      displayName: "XRP Ledger",
      symbol: "XRP",
      address: xrpWallet.classicAddress,
      derivationPath: "m/44'/144'/0'/0/0",
    });
  } catch {}

  try {
    const n = root.derive("m/44'/60'/0'/0/0");
    if (n.privateKey) {
      out.push({
        chain: "evm",
        displayName: "Ethereum & all EVM chains",
        symbol: "ETH",
        address: evmAddressFromPriv(n.privateKey),
        derivationPath: "m/44'/60'/0'/0/0",
        alsoCovers: [
          "Polygon", "Arbitrum", "Optimism", "Base", "BNB Chain",
          "Avalanche C-Chain", "Linea", "zkSync Era", "Gnosis", "Fantom", "Scroll",
        ],
        notes: "The same address receives funds on every EVM-compatible chain.",
      });
    }
  } catch {}

  try {
    const n = root.derive("m/84'/0'/0'/0/0");
    if (n.publicKey) {
      out.push({
        chain: "btc",
        displayName: "Bitcoin",
        symbol: "BTC",
        address: btcSegwit(n.publicKey, "bc"),
        derivationPath: "m/84'/0'/0'/0/0",
        notes: "Native SegWit (bc1...). Modern format, lowest fees.",
      });
    }
  } catch {}

  try {
    const n = root.derive("m/84'/2'/0'/0/0");
    if (n.publicKey) {
      out.push({
        chain: "ltc",
        displayName: "Litecoin",
        symbol: "LTC",
        address: btcSegwit(n.publicKey, "ltc"),
        derivationPath: "m/84'/2'/0'/0/0",
        notes: "Native SegWit (ltc1...).",
      });
    }
  } catch {}

  try {
    const n = root.derive("m/44'/3'/0'/0/0");
    if (n.publicKey) {
      out.push({
        chain: "doge",
        displayName: "Dogecoin",
        symbol: "DOGE",
        address: btcP2PKH(n.publicKey, 0x1e),
        derivationPath: "m/44'/3'/0'/0/0",
      });
    }
  } catch {}

  try {
    const n = root.derive("m/44'/145'/0'/0/0");
    if (n.publicKey) {
      out.push({
        chain: "bch",
        displayName: "Bitcoin Cash",
        symbol: "BCH",
        address: btcP2PKH(n.publicKey, 0x00),
        derivationPath: "m/44'/145'/0'/0/0",
        notes: "Legacy format. Most BCH wallets accept this and convert to cashaddr automatically.",
      });
    }
  } catch {}

  try {
    const n = root.derive("m/44'/195'/0'/0/0");
    if (n.privateKey) {
      out.push({
        chain: "tron",
        displayName: "TRON",
        symbol: "TRX",
        address: tronAddressFromPriv(n.privateKey),
        derivationPath: "m/44'/195'/0'/0/0",
      });
    }
  } catch {}

  try {
    const n = root.derive("m/44'/118'/0'/0/0");
    if (n.publicKey) {
      out.push({
        chain: "cosmos",
        displayName: "Cosmos Hub",
        symbol: "ATOM",
        address: cosmosBech32(n.publicKey, "cosmos"),
        derivationPath: "m/44'/118'/0'/0/0",
        alsoCovers: ["Osmosis", "Juno", "Akash", "Stargaze"],
        notes: "Same key derives addresses on other Cosmos SDK chains (different prefix per chain).",
      });
    }
  } catch {}

  try {
    const { key } = derivePath("m/44'/501'/0'/0'", seedHex);
    const pub = ed25519PubKey(key, false);
    out.push({
      chain: "sol",
      displayName: "Solana",
      symbol: "SOL",
      address: base58.encode(new Uint8Array(pub)),
      derivationPath: "m/44'/501'/0'/0'",
    });
  } catch {}

  try {
    const { key } = derivePath("m/44'/148'/0'", seedHex);
    const pub = ed25519PubKey(key, false);
    out.push({
      chain: "stellar",
      displayName: "Stellar",
      symbol: "XLM",
      address: stellarStrKey(new Uint8Array(pub)),
      derivationPath: "m/44'/148'/0'",
    });
  } catch {}

  return out;
}
