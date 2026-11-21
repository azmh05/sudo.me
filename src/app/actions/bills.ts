"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, todayISO } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { addInterval, freqToInterval, type BillFreq, type Unit } from "@/lib/schedule";
import type { ActionResult } from "@/lib/types";

const FREQS: BillFreq[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];
const UNITS: Unit[] = ["DAY", "WEEK", "MONTH", "YEAR"];

// "Remind me" dropdown value, 0–31 days (defaults to 7).
function remindDaysOf(fd: FormData) {
  const n = Number(String(fd.get("remindDays") ?? "7"));
  return Number.isInteger(n) && n >= 0 && n <= 31 ? n : 7;
}

function done(message?: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, message };
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optId = (fd: FormData, k: string) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};

async function validExpenseCategory(id: number | null) {
  if (!id) return null;
  const c = await db.category.findUnique({ where: { id } });
  return c && c.kind === "EXPENSE" ? id : null;
}
async function validAccount(id: number | null) {
  if (!id) return null;
  return (await db.account.findUnique({ where: { id } })) ? id : null;
}

// ---------- Bills ----------

export async function saveBill(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give the bill a name." };
  if (name.length > 80) return { error: "Name is too long." };

  const amount = parseAmount(str(fd, "amount"));
  if (!amount || amount <= 0) return { error: "Enter the usual amount, e.g. 42.00" };

  const frequency = str(fd, "frequency") as BillFreq;
  if (!FREQS.includes(frequency)) return { error: "Choose how often it repeats." };

  const due = isoToDate(str(fd, "nextDueDate"));
  if (!due) return { error: "Choose the next due date." };

  const data = {
    name,
    amount,
    frequency,
    nextDueDate: due,
    dueDay: due.getUTCDate(),
    remindDays: remindDaysOf(fd),
    accountId: await validAccount(optId(fd, "accountId")),
    categoryId: await validExpenseCategory(optId(fd, "categoryId")),
    note: str(fd, "note").slice(0, 255) || null,
  };

  if (id) await db.bill.update({ where: { id }, data });
  else await db.bill.create({ data });
  return done();
}

export async function setBillActive(id: number, active: boolean): Promise<ActionResult> {
  await requireUser();
  await db.bill.update({ where: { id }, data: { active } });
  return done(active ? "Bill resumed." : "Bill paused.");
}

// Payment history goes with it; expense records it created stay in Finance.
export async function deleteBill(id: number): Promise<ActionResult> {
  await requireUser();
  await db.bill.deleteMany({ where: { id } });
  return done("Bill deleted.");
}

// Records a payment, optionally adds the expense, and moves the due date forward.
export async function payBill(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const bill = await db.bill.findUnique({ where: { id: optId(fd, "billId") ?? 0 } });
  if (!bill) return { error: "This bill no longer exists." };

  const amount = parseAmount(str(fd, "amount"));
  if (!amount || amount <= 0) return { error: "Enter the amount you paid." };
  const paidDate = isoToDate(str(fd, "paidDate"));
  if (!paidDate) return { error: "Choose the date you paid." };

  const record = fd.get("record") === "on";
  const accountId = await validAccount(optId(fd, "accountId"));
  if (record && !accountId) return { error: "Choose the account you paid from." };

  const [unit, n] = freqToInterval(bill.frequency);
  const nextDue = isoToDate(addInterval(dateToISO(bill.nextDueDate), unit, n, bill.dueDay))!;

  await db.$transaction(async (tx) => {
    const t = record
      ? await tx.transaction.create({
          data: {
            type: "EXPENSE",
            amount,
            date: paidDate,
            accountId: accountId!,
            categoryId: await validExpenseCategory(bill.categoryId),
            note: bill.name,
          },
        })
      : null;
    await tx.billPayment.create({
      data: { billId: bill.id, dueDate: bill.nextDueDate, paidDate, amount, transactionId: t?.id ?? null },
    });
    await tx.bill.update({ where: { id: bill.id }, data: { nextDueDate: nextDue } });
  });
  return done("Marked as paid.");
}

// Undo the most recent payment: removes its expense record and restores the due date.
export async function undoLastPayment(billId: number): Promise<ActionResult> {
  await requireUser();
  const last = await db.billPayment.findFirst({
    where: { billId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!last) return { error: "There's no payment to undo." };

  await db.$transaction(async (tx) => {
    await tx.billPayment.delete({ where: { id: last.id } });
    if (last.transactionId) await tx.transaction.deleteMany({ where: { id: last.transactionId } });
    await tx.bill.update({ where: { id: billId }, data: { nextDueDate: last.dueDate } });
  });
  return done("Payment undone.");
}

// ---------- Maintenance ----------

function readInterval(fd: FormData): { value: number | null; unit: Unit | null } | { error: string } {
  const raw = str(fd, "intervalValue");
  if (!raw) return { value: null, unit: null };
  const value = Number(raw);
  const unit = str(fd, "intervalUnit") as Unit;
  if (!Number.isInteger(value) || value < 1 || value > 999) return { error: "Repeat interval should be a whole number, e.g. 6." };
  if (!UNITS.includes(unit)) return { error: "Choose days, weeks, months or years." };
  return { value, unit };
}

export async function saveMaintenance(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give it a name, e.g. Motorcycle service." };
  if (name.length > 80) return { error: "Name is too long." };

  const interval = readInterval(fd);
  if ("error" in interval) return { error: interval.error };

  const lastRaw = str(fd, "lastDoneDate");
  const nextRaw = str(fd, "nextDueDate");
  const lastDoneDate = lastRaw ? isoToDate(lastRaw) : null;
  if (lastRaw && !lastDoneDate) return { error: "Last done date isn't valid." };
  let nextDueDate = nextRaw ? isoToDate(nextRaw) : null;
  if (nextRaw && !nextDueDate) return { error: "Next due date isn't valid." };

  // Work out the next date from the last one, if only that was given.
  if (!nextDueDate && lastDoneDate && interval.value && interval.unit) {
    nextDueDate = isoToDate(addInterval(dateToISO(lastDoneDate), interval.unit, interval.value));
  }

  const data = {
    name,
    groupLabel: str(fd, "groupLabel").slice(0, 40) || null,
    intervalValue: interval.value,
    intervalUnit: interval.unit,
    lastDoneDate,
    nextDueDate,
    remindDays: remindDaysOf(fd),
    note: str(fd, "note").slice(0, 255) || null,
  };

  if (id) await db.maintenanceItem.update({ where: { id }, data });
  else await db.maintenanceItem.create({ data });
  return done();
}

export async function setMaintenanceActive(id: number, active: boolean): Promise<ActionResult> {
  await requireUser();
  await db.maintenanceItem.update({ where: { id }, data: { active } });
  return done(active ? "Resumed." : "Paused.");
}

export async function deleteMaintenance(id: number): Promise<ActionResult> {
  await requireUser();
  await db.maintenanceItem.deleteMany({ where: { id } });
  return done("Deleted.");
}

export async function markMaintenanceDone(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const item = await db.maintenanceItem.findUnique({ where: { id: optId(fd, "itemId") ?? 0 } });
  if (!item) return { error: "This item no longer exists." };

  const doneDate = isoToDate(str(fd, "doneDate") || todayISO());
  if (!doneDate) return { error: "Choose the date it was done." };

  const costRaw = str(fd, "cost");
  const cost = costRaw ? parseAmount(costRaw) : null;
  if (costRaw && (cost === null || cost <= 0)) return { error: "Cost should look like 85.00" };

  const record = fd.get("record") === "on" && cost !== null;
  const accountId = await validAccount(optId(fd, "accountId"));
  if (record && !accountId) return { error: "Choose the account you paid from." };
  const categoryId = await validExpenseCategory(optId(fd, "categoryId"));

  const nextRaw = str(fd, "nextDueDate");
  let nextDueDate = nextRaw ? isoToDate(nextRaw) : null;
  if (!nextDueDate && item.intervalValue && item.intervalUnit) {
    nextDueDate = isoToDate(addInterval(dateToISO(doneDate), item.intervalUnit, item.intervalValue));
  }
  const note = str(fd, "note").slice(0, 255) || null;

  await db.$transaction(async (tx) => {
    const t = record
      ? await tx.transaction.create({
          data: { type: "EXPENSE", amount: cost!, date: doneDate, accountId: accountId!, categoryId, note: note ?? item.name },
        })
      : null;
    await tx.maintenanceLog.create({ data: { itemId: item.id, doneDate, cost, note, transactionId: t?.id ?? null } });
    await tx.maintenanceItem.update({ where: { id: item.id }, data: { lastDoneDate: doneDate, nextDueDate } });
  });
  return done("Marked as done.");
}
