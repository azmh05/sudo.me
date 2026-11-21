// AES-256-GCM encryption for document numbers and uploaded files.
// The key lives in .env as ENCRYPTION_KEY (64 hex characters). Keep a copy of it
// somewhere safe: without it, encrypted numbers and files can't be opened.
import crypto from "node:crypto";

const ALG = "aes-256-gcm";

function key() {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || !/^[0-9a-fA-F]{64}$/.test(k)) {
    throw new Error("ENCRYPTION_KEY is missing or invalid in .env (it must be 64 letters/numbers). See .env.example.");
  }
  return Buffer.from(k, "hex");
}

export function hasEncryptionKey() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

// Layout: 12-byte IV | 16-byte auth tag | ciphertext
export function encryptBuffer(plain: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decryptBuffer(data: Buffer) {
  const decipher = crypto.createDecipheriv(ALG, key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
}

export function encryptText(text: string) {
  return `v1:${encryptBuffer(Buffer.from(text, "utf8")).toString("base64")}`;
}

export function decryptText(value: string) {
  if (!value.startsWith("v1:")) throw new Error("Unknown encrypted format.");
  return decryptBuffer(Buffer.from(value.slice(3), "base64")).toString("utf8");
}

// Encrypts free text when a key is set; otherwise stores it as plain text.
export function sealText(text: string | null) {
  if (!text) return null;
  return hasEncryptionKey() ? encryptText(text) : text;
}

// Reads text saved by sealText (plain or encrypted).
export function openText(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("v1:")) return value;
  try {
    return decryptText(value);
  } catch {
    return "[Couldn't decrypt — was ENCRYPTION_KEY in .env changed?]";
  }
}
