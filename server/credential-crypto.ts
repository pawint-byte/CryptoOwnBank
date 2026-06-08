import crypto from "crypto";

const DEDICATED_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY;
const KEY_SOURCE = DEDICATED_KEY || process.env.SESSION_SECRET;

if (!KEY_SOURCE) {
  throw new Error(
    "CREDENTIAL_ENCRYPTION_KEY or SESSION_SECRET must be set to encrypt exchange credentials",
  );
}

const RESOLVED_KEY: string = KEY_SOURCE;

if (!DEDICATED_KEY) {
  console.warn(
    "[credential-crypto] CREDENTIAL_ENCRYPTION_KEY is not set — falling back to SESSION_SECRET. " +
      "Set a dedicated CREDENTIAL_ENCRYPTION_KEY so exchange keys and login sessions don't share one secret.",
  );
}

export function encryptCredential(plaintext: string): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(RESOLVED_KEY, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v2",
    salt.toString("hex"),
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptCredential(payload: string): string {
  if (payload.startsWith("v2:")) {
    const [, saltHex, ivHex, tagHex, dataHex] = payload.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const key = crypto.scryptSync(RESOLVED_KEY, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  const legacySecret = process.env.SESSION_SECRET;
  if (!legacySecret) {
    throw new Error("Cannot decrypt legacy credential: SESSION_SECRET is not set");
  }
  const parts = payload.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const key = crypto.scryptSync(legacySecret, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(parts[1], "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
