"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sealText } from "@/lib/crypto";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, isTime } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { addInterval, type Unit } from "@/lib/schedule";
import type { ActionResult, BookedViaKey } from "@/lib/types";

const UNITS: Unit[] = ["DAY", "WEEK", "MONTH", "YEAR"];
const VIA: BookedViaKey[] = ["MYSEJAHTERA", "PHONE", "WALK_IN", "ONLINE", "OTHER"];

function done(message?: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, message };
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string, max: number) => str(fd, k).slice(0, max) || null;
const optId = (fd: FormData, k: string) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};
function optDate(fd: FormData, k: string): Date | null | undefined {
  const raw = str(fd, k);
  if (!raw) return null;
  return isoToDate(raw) ?? undefined;
}

// ---------- Check-ups ----------

export async function saveCheckup(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give it a name, e.g. Dental scaling." };
  if (name.length > 80) return { error: "Name is too long." };

  const intervalValue = Number(str(fd, "intervalValue"));
  const intervalUnit = str(fd, "intervalUnit") as Unit;
  if (!Number.isInteger(intervalValue) || intervalValue < 1 || intervalValue > 120)
    return { error: "Repeat every should be a whole number, e.g. 6." };
  if (!UNITS.includes(intervalUnit)) return { error: "Choose days, weeks, months or years." };

  const bookLeadDays = Number(str(fd, "bookLeadDays") || 21);
  if (!Number.isInteger(bookLeadDays) || bookLeadDays < 0 || bookLeadDays > 180)
    return { error: "Booking reminder should be 0–180 days." };

  const lastDoneDate = optDate(fd, "lastDoneDate");
  let nextDueDate = optDate(fd, "nextDueDate");
  if (lastDoneDate === undefined || nextDueDate === undefined) return { error: "One of the dates isn't valid." };
  if (!nextDueDate && lastDoneDate) nextDueDate = isoToDate(addInterval(dateToISO(lastDoneDate), intervalUnit, intervalValue));

  const data = {
    name,
    intervalValue,
    intervalUnit,
    bookLeadDays,
    lastDoneDate,
    nextDueDate,
    place: opt(fd, "place", 120),
    note: opt(fd, "note", 255),
  };
  if (id) await db.healthCheckup.update({ where: { id }, data });
  else await db.healthCheckup.create({ data });
  return done();
}

export async function setCheckupActive(id: number, active: boolean): Promise<ActionResult> {
  await requireUser();
  await db.healthCheckup.update({ where: { id }, data: { active } });
  return done(active ? "Resumed." : "Paused.");
}

export async function deleteCheckup(id: number): Promise<ActionResult> {
  await requireUser();
  await db.healthCheckup.deleteMany({ where: { id } });
  return done("Deleted.");
}

// ---------- Appointments ----------

export async function saveAppointment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const title = str(fd, "title");
  if (!title) return { error: "What's the appointment for?" };
  if (title.length > 100) return { error: "Title is too long." };

  const date = isoToDate(str(fd, "date"));
  if (!date) return { error: "Choose the appointment date." };
  const time = str(fd, "time");
  if (time && !isTime(time)) return { error: "Time isn't valid." };

  const via = str(fd, "bookedVia") as BookedViaKey;
  let checkupId = optId(fd, "checkupId");
  if (checkupId && !(await db.healthCheckup.findUnique({ where: { id: checkupId } }))) checkupId = null;

  const data = {
    title,
    date,
    time: time || null,
    checkupId,
    place: opt(fd, "place", 120),
    bookedVia: VIA.includes(via) ? via : null,
    reference: opt(fd, "reference", 60),
    note: opt(fd, "note", 500),
  };
  if (id) await db.healthAppointment.update({ where: { id }, data });
  else await db.healthAppointment.create({ data });
  return done();
}

export async function deleteAppointment(id: number): Promise<ActionResult> {
  await requireUser();
  await db.healthAppointment.deleteMany({ where: { id } });
  return done("Appointment deleted.");
}

// Marks it done, optionally records the cost, and schedules the check-up's next due date.
export async function completeAppointment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const appt = id ? await db.healthAppointment.findUnique({ where: { id }, include: { checkup: true } }) : null;
  if (!appt) return { error: "This appointment no longer exists." };
  if (appt.status === "DONE") return { error: "Already marked as done." };

  const costRaw = str(fd, "cost");
  const cost = costRaw ? parseAmount(costRaw) : null;
  if (costRaw && (cost === null || cost <= 0)) return { error: "Cost should look like 80.00" };

  const record = fd.get("record") === "on" && cost !== null;
  const accountId = optId(fd, "accountId");
  if (record && (!accountId || !(await db.account.findUnique({ where: { id: accountId } }))))
    return { error: "Choose the account you paid from." };
  let categoryId = optId(fd, "categoryId");
  if (categoryId) {
    const c = await db.category.findUnique({ where: { id: categoryId } });
    if (!c || c.kind !== "EXPENSE") categoryId = null;
  }

  const outcome = sealText(str(fd, "outcome").slice(0, 5000) || null);

  await db.$transaction(async (tx) => {
    const t = record
      ? await tx.transaction.create({
          data: { type: "EXPENSE", amount: cost!, date: appt.date, accountId: accountId!, categoryId, note: appt.title.slice(0, 255) },
        })
      : null;
    await tx.healthAppointment.update({
      where: { id: appt.id },
      data: { status: "DONE", cost, outcome, transactionId: t?.id ?? null },
    });
    if (appt.checkup) {
      const next = addInterval(dateToISO(appt.date), appt.checkup.intervalUnit, appt.checkup.intervalValue);
      await tx.healthCheckup.update({
        where: { id: appt.checkup.id },
        data: { lastDoneDate: appt.date, nextDueDate: isoToDate(next) },
      });
    }
  });
  return done(appt.checkup ? "Done — next one scheduled." : "Marked as done.");
}

// ---------- Health info ----------

export async function saveHealthProfile(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const data = {
    bloodType: opt(fd, "bloodType", 5),
    allergies: opt(fd, "allergies", 500),
    medications: opt(fd, "medications", 500),
    conditions: opt(fd, "conditions", 500),
    emergencyName: opt(fd, "emergencyName", 80),
    emergencyPhone: opt(fd, "emergencyPhone", 30),
    emergencyRelation: opt(fd, "emergencyRelation", 40),
    note: opt(fd, "note", 500),
  };
  await db.healthProfile.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  return done("Saved.");
}
