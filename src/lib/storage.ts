// Encrypted file storage in <project>/storage/records (never inside the database).
import crypto from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { decryptBuffer, encryptBuffer } from "./crypto";

const DIR = path.join(process.cwd(), "storage", "records");
const NAME = /^[0-9a-f]{32}\.bin$/;

export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function saveEncryptedFile(data: Buffer) {
  await mkdir(DIR, { recursive: true });
  const name = `${crypto.randomUUID().replace(/-/g, "")}.bin`;
  await writeFile(path.join(DIR, name), encryptBuffer(data));
  return name;
}

export async function readEncryptedFile(name: string) {
  if (!NAME.test(name)) throw new Error("Invalid file name.");
  return decryptBuffer(await readFile(path.join(DIR, name)));
}

export async function removeStoredFile(name: string) {
  if (!NAME.test(name)) return;
  try {
    await unlink(path.join(DIR, name));
  } catch {
    // Already gone — nothing to do.
  }
}

// Identify the real file type from its first bytes (ignores the file extension).
export function detectFileType(buf: Buffer): "application/pdf" | "image/png" | "image/jpeg" | "image/webp" | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}
