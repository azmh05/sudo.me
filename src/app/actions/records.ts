"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { decryptText, encryptText, hasEncryptionKey } from "@/lib/crypto";
import { db } from "@/lib/db";
import { isoToDate } from "@/lib/dates";
import { detectFileType, MAX_FILE_BYTES, removeStoredFile, saveEncryptedFile } from "@/lib/storage";
import type { ActionResult, RecordCategoryKey } from "@/lib/types";

const CATEGORIES: RecordCategoryKey[] = [
  "IDENTITY", "VEHICLE", "INSURANCE", "EDUCATION", "FINANCE", "WORK", "HEALTH", "PURCHASE", "OTHER",
];
const NO_KEY = "Encryption isn't set up yet: add ENCRYPTION_KEY to your .env file (see README), then restart the server.";

function refresh() {
  revalidatePath("/", "layout");
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optId = (fd: FormData, k: string) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};
function optDate(fd: FormData, k: string): Date | null | undefined {
  const raw = str(fd, k);
  if (!raw) return null;
  return isoToDate(raw) ?? undefined;
}

export async function saveRecord(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");

  const title = str(fd, "title");
  if (!title) return { error: "Give it a title, e.g. MyKad (IC)." };
  if (title.length > 100) return { error: "Title is too long." };

  const category = str(fd, "category") as RecordCategoryKey;
  if (!CATEGORIES.includes(category)) return { error: "Choose a category." };

  const issueDate = optDate(fd, "issueDate");
  const expiryDate = optDate(fd, "expiryDate");
  if (issueDate === undefined || expiryDate === undefined) return { error: "One of the dates isn't valid." };
  if (issueDate && expiryDate && expiryDate < issueDate) return { error: "Expiry date is before the issue date." };

  const remindRaw = str(fd, "remindDays");
  const remindDays = remindRaw === "" ? 30 : Number(remindRaw);
  if (!Number.isInteger(remindDays) || remindDays < 0 || remindDays > 365)
    return { error: "Reminder should be between 0 and 365 days." };

  const note = str(fd, "note").slice(0, 5000) || null;

  // Document number: encrypted. Empty on edit means "keep the saved one".
  const number = str(fd, "number").slice(0, 100);
  const clearNumber = fd.get("clearNumber") === "on";
  let numberData: { numberEnc: string | null; numberLast4: string | null } | object = {};
  if (number) {
    if (!hasEncryptionKey()) return { error: NO_KEY };
    const plain = number.replace(/[^0-9A-Za-z]/g, "");
    numberData = { numberEnc: encryptText(number), numberLast4: plain.slice(-4) || null };
  } else if (clearNumber || !id) {
    numberData = { numberEnc: null, numberLast4: null };
  }

  const data = {
    title,
    category,
    issuer: str(fd, "issuer").slice(0, 100) || null,
    issueDate,
    expiryDate,
    remindDays,
    note,
    ...numberData,
  };

  if (id) {
    if (!(await db.personalRecord.findUnique({ where: { id } }))) return { error: "This record was already deleted." };
    await db.personalRecord.update({ where: { id }, data });
    refresh();
    return { ok: true, id };
  }
  const created = await db.personalRecord.create({ data });
  refresh();
  return { ok: true, id: created.id };
}

export async function deleteRecord(id: number): Promise<ActionResult> {
  await requireUser();
  const files = await db.recordFile.findMany({ where: { recordId: id }, select: { storageName: true } });
  await db.personalRecord.deleteMany({ where: { id } });
  await Promise.all(files.map((f) => removeStoredFile(f.storageName)));
  refresh();
  return { ok: true, message: "Record deleted." };
}

// Decrypts the document number only when you tap "Show".
export async function revealRecordNumber(id: number): Promise<ActionResult> {
  await requireUser();
  const r = await db.personalRecord.findUnique({ where: { id }, select: { numberEnc: true } });
  if (!r?.numberEnc) return { error: "No number saved." };
  if (!hasEncryptionKey()) return { error: NO_KEY };
  try {
    return { ok: true, value: decryptText(r.numberEnc) };
  } catch {
    return { error: "Couldn't decrypt. Was ENCRYPTION_KEY in .env changed?" };
  }
}

export async function uploadRecordFile(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  if (!hasEncryptionKey()) return { error: NO_KEY };

  const recordId = optId(fd, "recordId");
  if (!recordId || !(await db.personalRecord.findUnique({ where: { id: recordId } })))
    return { error: "This record no longer exists." };

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_FILE_BYTES) return { error: "That file is over 8 MB. Try a smaller scan or photo." };

  const data = Buffer.from(await file.arrayBuffer());
  const mimeType = detectFileType(data);
  if (!mimeType) return { error: "Only PDF, JPG, PNG or WebP files can be uploaded." };

  const count = await db.recordFile.count({ where: { recordId } });
  if (count >= 20) return { error: "This record already has 20 files." };

  const storageName = await saveEncryptedFile(data);
  try {
    await db.recordFile.create({
      data: {
        recordId,
        originalName: (file.name || "file").replace(/[\\/\0]/g, "_").slice(0, 255),
        mimeType,
        size: data.length,
        storageName,
      },
    });
  } catch (e) {
    await removeStoredFile(storageName);
    throw e;
  }
  refresh();
  return { ok: true, message: "File uploaded." };
}

export async function deleteRecordFile(id: number): Promise<ActionResult> {
  await requireUser();
  const f = await db.recordFile.findUnique({ where: { id } });
  if (!f) return { ok: true };
  await db.recordFile.delete({ where: { id } });
  await removeStoredFile(f.storageName);
  refresh();
  return { ok: true, message: "File deleted." };
}
