import { db } from "./db";
import { dateToISO, formatTime, isoToDate, todayISO } from "./dates";
import { relativeDay } from "./health-math";
import { addInterval } from "./schedule";
import type { BillRow, MaintenanceRow, UpcomingItem } from "./types";

export async function getBills(): Promise<BillRow[]> {
  const bills = await db.bill.findMany({
    include: { payments: { orderBy: [{ paidDate: "desc" }, { id: "desc" }], take: 12 } },
    orderBy: [{ active: "desc" }, { nextDueDate: "asc" }, { name: "asc" }],
  });
  const categoryIds = bills.map((b) => b.categoryId).filter((x): x is number => x !== null);
  const categories = await db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } });
  const names = new Map(categories.map((c) => [c.id, c.name]));

  return bills.map((b) => ({
    id: b.id,
    name: b.name,
    amount: b.amount,
    frequency: b.frequency,
    nextDueDate: dateToISO(b.nextDueDate),
    remindDays: b.remindDays,
    accountId: b.accountId,
    categoryId: b.categoryId,
    categoryName: b.categoryId ? names.get(b.categoryId) ?? null : null,
    note: b.note,
    active: b.active,
    payments: b.payments.map((p) => ({
      id: p.id,
      dueDate: dateToISO(p.dueDate),
      paidDate: dateToISO(p.paidDate),
      amount: p.amount,
      recorded: p.transactionId !== null,
    })),
  }));
}

export async function getMaintenance(): Promise<MaintenanceRow[]> {
  const items = await db.maintenanceItem.findMany({
    include: { logs: { orderBy: [{ doneDate: "desc" }, { id: "desc" }], take: 12 } },
    orderBy: [{ active: "desc" }, { nextDueDate: "asc" }, { name: "asc" }],
  });
  // Items with a due date first, soonest first; items without one at the end.
  items.sort((a, b) =>
    a.active !== b.active ? (a.active ? -1 : 1) :
    !a.nextDueDate ? 1 : !b.nextDueDate ? -1 : a.nextDueDate.getTime() - b.nextDueDate.getTime(),
  );
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    groupLabel: i.groupLabel,
    intervalValue: i.intervalValue,
    intervalUnit: i.intervalUnit,
    lastDoneDate: i.lastDoneDate ? dateToISO(i.lastDoneDate) : null,
    nextDueDate: i.nextDueDate ? dateToISO(i.nextDueDate) : null,
    remindDays: i.remindDays,
    note: i.note,
    active: i.active,
    logs: i.logs.map((l) => ({ id: l.id, doneDate: dateToISO(l.doneDate), cost: l.cost, note: l.note })),
  }));
}

// Bills and home/device upkeep inside their reminder window (or overdue), plus documents
// that are inside their own reminder window (e.g. 30 days before expiry) or expired.
export async function getUpcoming(days = 7): Promise<UpcomingItem[]> {
  const until = isoToDate(addInterval(todayISO(), "DAY", days))!;
  const docUntil = isoToDate(addInterval(todayISO(), "DAY", 365))!;
  const farthest = isoToDate(addInterval(todayISO(), "DAY", 31))!; // longest bill/upkeep reminder option
  const [bills, items, records, appts, checkups] = await Promise.all([
    db.bill.findMany({ where: { active: true, nextDueDate: { lte: farthest } } }),
    db.maintenanceItem.findMany({ where: { active: true, nextDueDate: { lte: farthest } } }),
    db.personalRecord.findMany({
      where: { expiryDate: { not: null, lte: docUntil } },
      select: { id: true, title: true, expiryDate: true, remindDays: true },
    }),
    db.healthAppointment.findMany({ where: { status: "BOOKED", date: { lte: until } } }),
    db.healthCheckup.findMany({
      where: { active: true, nextDueDate: { not: null, lte: isoToDate(addInterval(todayISO(), "DAY", 180))! } },
      include: { appointments: { where: { status: "BOOKED", date: { gte: isoToDate(todayISO())! } }, take: 1 } },
    }),
  ]);
  const today = todayISO();
  return [
    // Each bill/item shows from its own "remind me" window (or once overdue).
    ...bills.filter((b) => dateToISO(b.nextDueDate) <= addInterval(today, "DAY", b.remindDays)).map((b) => ({
      key: `b${b.id}`,
      kind: "bill" as const,
      name: b.name,
      amount: b.amount,
      dueDate: dateToISO(b.nextDueDate),
      href: "/bills",
    })),
    ...items.filter((i) => dateToISO(i.nextDueDate!) <= addInterval(today, "DAY", i.remindDays)).map((i) => ({
      key: `m${i.id}`,
      kind: "maintenance" as const,
      name: i.name,
      amount: null,
      dueDate: dateToISO(i.nextDueDate!),
      href: "/bills/maintenance",
    })),
    ...records
      .map((r) => ({ r, iso: dateToISO(r.expiryDate!) }))
      .filter(({ r, iso }) => iso <= addInterval(today, "DAY", r.remindDays))
      .map(({ r, iso }) => ({
        key: `r${r.id}`,
        kind: "document" as const,
        name: r.title,
        amount: null,
        dueDate: iso,
        remindDays: r.remindDays,
        href: "/records",
      })),
    // Booked appointments in the next week (or passed but not marked done yet).
    ...appts.map((a) => {
      const date = dateToISO(a.date);
      const past = date < today;
      return {
        key: `h${a.id}`,
        kind: "health" as const,
        name: a.title,
        amount: null,
        dueDate: date,
        href: "/health",
        badge: past
          ? { tone: "overdue" as const, label: "Mark as done" }
          : { tone: "soon" as const, label: `${relativeDay(date)}${a.time ? ` · ${formatTime(a.time)}` : ""}` },
      };
    }),
    // Check-ups that are in their "time to book" window and not booked yet.
    ...checkups
      .filter((c) => c.appointments.length === 0 && dateToISO(c.nextDueDate!) <= addInterval(today, "DAY", c.bookLeadDays))
      .map((c) => {
        const date = dateToISO(c.nextDueDate!);
        return {
          key: `c${c.id}`,
          kind: "health" as const,
          name: c.name,
          amount: null,
          dueDate: date,
          href: "/health",
          badge: { tone: date < today ? ("overdue" as const) : ("soon" as const), label: "Time to book" },
        };
      }),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
