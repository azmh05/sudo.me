// Runs inside the Hub's server: every minute it checks what's due and sends notifications.
// Also makes the daily backup even if you don't open the Hub that day.
import { maybeAutoBackup } from "../backup";
import { rawDb } from "../db";
import { dateToISO, isoToDate } from "../dates";
import { addInterval } from "../schedule";
import { collectNotes, localISO, type NotifyData } from "./rules";
import { getNotificationPrefs, sendToAll } from "./push";

const MAX_PER_MINUTE = 6;
const g = globalThis as unknown as { __hubScheduler?: boolean; __hubBusy?: boolean; __hubLastBackupCheck?: number };

export function startScheduler() {
  if (g.__hubScheduler) return;
  g.__hubScheduler = true;
  setTimeout(tick, 20_000);
  setInterval(tick, 60_000);
  console.log("[sudo.me] Reminder scheduler started");
}

async function tick() {
  if (g.__hubBusy) return;
  g.__hubBusy = true;
  try {
    if (!g.__hubLastBackupCheck || Date.now() - g.__hubLastBackupCheck > 3_600_000) {
      g.__hubLastBackupCheck = Date.now();
      await maybeAutoBackup();
      await rawDb.notificationSent.deleteMany({ where: { sentAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
    }
    await runChecks(new Date());
  } catch (e) {
    console.error("[sudo.me] Scheduler error:", e);
  } finally {
    g.__hubBusy = false;
  }
}

export async function runChecks(now: Date) {
  if ((await rawDb.pushSubscription.count()) === 0) return;
  const prefs = await getNotificationPrefs();
  const data = await loadData(now);
  const notes = collectNotes(now, data, prefs);
  if (!notes.length) return;

  const already = await rawDb.notificationSent.findMany({ where: { key: { in: notes.map((n) => n.key) } }, select: { key: true } });
  const sentKeys = new Set(already.map((a) => a.key));
  const fresh = notes.filter((n) => !sentKeys.has(n.key)).slice(0, MAX_PER_MINUTE);

  for (const n of fresh) {
    // Mark first, so a crash can't cause the same reminder to repeat.
    await rawDb.notificationSent.create({ data: { key: n.key } }).catch(() => {});
    await sendToAll({ title: n.title, body: n.body, url: n.url, tag: n.key });
  }
}

async function loadData(now: Date): Promise<NotifyData> {
  const today = localISO(now);
  const d = (offset: number) => isoToDate(addInterval(today, "DAY", offset))!;

  const [bills, upkeep, documents, checkups, appointments, tasks, events, overdueTasks] = await Promise.all([
    rawDb.bill.findMany({ where: { active: true, nextDueDate: { lte: d(31) } } }),
    rawDb.maintenanceItem.findMany({ where: { active: true, nextDueDate: { not: null, lte: d(31) } } }),
    rawDb.personalRecord.findMany({ where: { expiryDate: { not: null, lte: d(91), gte: d(-30) } } }),
    rawDb.healthCheckup.findMany({
      where: { active: true, nextDueDate: { not: null, lte: d(181) } },
      include: { appointments: { where: { status: "BOOKED", date: { gte: d(0) } }, take: 1 } },
    }),
    rawDb.healthAppointment.findMany({ where: { status: "BOOKED", date: { gte: d(-3), lte: d(2) } } }),
    rawDb.task.findMany({ where: { done: false, dueDate: { gte: d(-1), lte: d(2) } } }),
    rawDb.plannerEvent.findMany({ where: { date: { gte: d(-1), lte: d(2) } } }),
    rawDb.task.count({ where: { done: false, dueDate: { lt: d(0) } } }),
  ]);

  return {
    bills: bills.map((b) => ({ id: b.id, name: b.name, amount: b.amount, nextDueDate: dateToISO(b.nextDueDate), remindDays: b.remindDays })),
    upkeep: upkeep.map((u) => ({ id: u.id, name: u.name, nextDueDate: dateToISO(u.nextDueDate!), remindDays: u.remindDays })),
    documents: documents.map((r) => ({ id: r.id, title: r.title, expiryDate: dateToISO(r.expiryDate!), remindDays: r.remindDays })),
    checkups: checkups.map((c) => ({ id: c.id, name: c.name, nextDueDate: dateToISO(c.nextDueDate!), bookLeadDays: c.bookLeadDays, booked: c.appointments.length > 0 })),
    appointments: appointments.map((a) => ({ id: a.id, title: a.title, date: dateToISO(a.date), time: a.time, place: a.place })),
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, dueDate: dateToISO(t.dueDate!), dueTime: t.dueTime, remindMinutes: t.remindMinutes })),
    events: events.map((e) => ({ id: e.id, title: e.title, date: dateToISO(e.date), startTime: e.startTime, location: e.location, remindMinutes: e.remindMinutes })),
    overdueTasks,
  };
}
