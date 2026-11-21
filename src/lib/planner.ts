import type { PlannerEvent, Task } from "@prisma/client";
import { openText } from "./crypto";
import { db } from "./db";
import { dateToISO, formatTime, isoToDate, todayISO } from "./dates";
import { formatRM } from "./utils";
import type { EventRow, JournalRow, PlannerItem, TaskRow } from "./types";

export function toTaskRow(t: Task): TaskRow {
  return {
    id: t.id,
    title: t.title,
    dueDate: t.dueDate ? dateToISO(t.dueDate) : null,
    dueTime: t.dueTime,
    priority: t.priority,
    remindMinutes: t.remindMinutes,
    done: t.done,
    note: t.note,
  };
}

export function toEventRow(e: PlannerEvent): EventRow {
  return {
    id: e.id,
    title: e.title,
    date: dateToISO(e.date),
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    remindMinutes: e.remindMinutes,
    note: e.note,
  };
}

const PRIORITY_ORDER = { HIGH: 0, NORMAL: 1, LOW: 2 } as const;

// Sort: by date, then all-day/untimed first, then by time; high-priority tasks first.
export function sortItems(items: PlannerItem[]) {
  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time ?? "").localeCompare(b.time ?? "") ||
      (a.task ? PRIORITY_ORDER[a.task.priority] : 1) - (b.task ? PRIORITY_ORDER[b.task.priority] : 1) ||
      a.title.localeCompare(b.title),
  );
}

// Everything dated between start (inclusive) and end (exclusive), as "YYYY-MM-DD".
export async function getPlannerItems(startISO: string, endISO: string): Promise<PlannerItem[]> {
  const range = { gte: isoToDate(startISO)!, lt: isoToDate(endISO)! };
  const [tasks, events, appts, bills] = await Promise.all([
    db.task.findMany({ where: { dueDate: range } }),
    db.plannerEvent.findMany({ where: { date: range } }),
    db.healthAppointment.findMany({ where: { date: range } }),
    db.bill.findMany({ where: { active: true, nextDueDate: range } }),
  ]);

  return sortItems([
    ...tasks.map((t) => {
      const row = toTaskRow(t);
      return { key: `t${t.id}`, kind: "task" as const, date: row.dueDate!, time: t.dueTime, title: t.title, sub: t.note, task: row };
    }),
    ...events.map((e) => {
      const row = toEventRow(e);
      const time = e.startTime ? `${formatTime(e.startTime)}${e.endTime ? ` – ${formatTime(e.endTime)}` : ""}` : "All day";
      return { key: `e${e.id}`, kind: "event" as const, date: row.date, time: e.startTime, title: e.title, sub: [time, e.location].filter(Boolean).join(" · "), event: row };
    }),
    ...appts.map((a) => ({
      key: `h${a.id}`,
      kind: "health" as const,
      date: dateToISO(a.date),
      time: a.time,
      title: a.title,
      sub: [a.time ? formatTime(a.time) : null, a.place, a.status === "DONE" ? "Done" : null].filter(Boolean).join(" · ") || null,
      href: "/health",
    })),
    ...bills.map((b) => ({
      key: `b${b.id}`,
      kind: "bill" as const,
      date: dateToISO(b.nextDueDate),
      time: null,
      title: `${b.name} due`,
      sub: formatRM(b.amount),
      href: "/bills",
    })),
  ]);
}

// Unfinished tasks that are overdue (before today).
export async function getOverdueTasks() {
  const rows = await db.task.findMany({
    where: { done: false, dueDate: { lt: isoToDate(todayISO())! } },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
  });
  return rows.map(toTaskRow);
}

// For the Tasks tab: everything open, plus what you finished in the last 14 days.
export async function getTaskList() {
  const since = new Date(Date.now() - 14 * 86_400_000);
  const rows = await db.task.findMany({
    where: { OR: [{ done: false }, { completedAt: { gte: since } }] },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { dueTime: "asc" }, { id: "asc" }],
  });
  return rows.map(toTaskRow);
}

export async function getUndatedTasks() {
  const rows = await db.task.findMany({ where: { done: false, dueDate: null }, orderBy: [{ priority: "asc" }, { id: "asc" }] });
  return rows.map(toTaskRow).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export async function getJournalEntry(iso: string): Promise<JournalRow | null> {
  const e = await db.journalEntry.findUnique({ where: { date: isoToDate(iso)! } });
  return e ? { id: e.id, date: dateToISO(e.date), content: openText(e.content) ?? "", mood: e.mood } : null;
}

export async function getJournalList(take = 60): Promise<JournalRow[]> {
  const rows = await db.journalEntry.findMany({ orderBy: { date: "desc" }, take });
  return rows.map((e) => ({ id: e.id, date: dateToISO(e.date), content: openText(e.content) ?? "", mood: e.mood }));
}

export function taskToItem(t: TaskRow): PlannerItem {
  return { key: `t${t.id}`, kind: "task", date: t.dueDate ?? "", time: t.dueTime, title: t.title, sub: t.note, task: t };
}
