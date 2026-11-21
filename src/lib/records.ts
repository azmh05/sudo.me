import { db } from "./db";
import { dateToISO } from "./dates";
import type { RecordRow } from "./types";

export async function getRecords(): Promise<RecordRow[]> {
  const rows = await db.personalRecord.findMany({
    include: { files: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    hasNumber: r.numberEnc !== null,
    numberLast4: r.numberLast4,
    issuer: r.issuer,
    issueDate: r.issueDate ? dateToISO(r.issueDate) : null,
    expiryDate: r.expiryDate ? dateToISO(r.expiryDate) : null,
    remindDays: r.remindDays,
    note: r.note,
    updatedAt: r.updatedAt.toISOString(),
    files: r.files.map((f) => ({
      id: f.id,
      name: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      createdAt: f.createdAt.toISOString(),
    })),
  }));
}
