"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sealText } from "@/lib/crypto";
import { db } from "@/lib/db";
import { isoToDate, isTime } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";

const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
const REMIND = [0, 10, 30, 60, 1440];

function remindOf(fd: FormData) {
  const raw = String(fd.get("remindMinutes") ?? "");
  return raw !== "" && REMIND.includes(Number(raw)) ? Number(raw) : null;
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

// ---------- Tasks ----------

export async function saveTask(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const title = str(fd, "title");
  if (!title) return { error: "What needs doing?" };
  if (title.length > 160) return { error: "That's a bit long — keep it under 160 characters." };

  const dateRaw = str(fd, "dueDate");
  const dueDate = dateRaw ? isoToDate(dateRaw) : null;
  if (dateRaw && !dueDate) return { error: "Due date isn't valid." };
  const dueTime = str(fd, "dueTime");
  if (dueTime && !isTime(dueTime)) return { error: "Time isn't valid." };
  if (dueTime && !dueDate) return { error: "Add a date for the time to make sense." };

  const priority = (PRIORITIES as readonly string[]).includes(str(fd, "priority"))
    ? (str(fd, "priority") as (typeof PRIORITIES)[number])
    : "NORMAL";

  const remindMinutes = remindOf(fd);
  if (remindMinutes !== null && !dueDate) return { error: "Add a date so the reminder knows when to go off." };
  const data = { title, dueDate, dueTime: dueTime || null, priority, remindMinutes, note: str(fd, "note").slice(0, 1000) || null };
  if (id) await db.task.update({ where: { id }, data });
  else await db.task.create({ data });
  return done();
}

export async function toggleTask(id: number, isDone: boolean): Promise<ActionResult> {
  await requireUser();
  await db.task.update({ where: { id }, data: { done: isDone, completedAt: isDone ? new Date() : null } });
  return done();
}

export async function deleteTask(id: number): Promise<ActionResult> {
  await requireUser();
  await db.task.deleteMany({ where: { id } });
  return done("Task deleted.");
}

export async function clearCompletedTasks(): Promise<ActionResult> {
  await requireUser();
  const { count } = await db.task.deleteMany({ where: { done: true } });
  return done(`Cleared ${count} completed task${count === 1 ? "" : "s"}.`);
}

// ---------- Events ----------

export async function saveEvent(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const title = str(fd, "title");
  if (!title) return { error: "Give the event a name." };
  if (title.length > 160) return { error: "Name is too long." };

  const date = isoToDate(str(fd, "date"));
  if (!date) return { error: "Choose a date." };
  const startTime = str(fd, "startTime");
  const endTime = str(fd, "endTime");
  if ((startTime && !isTime(startTime)) || (endTime && !isTime(endTime))) return { error: "Time isn't valid." };
  if (endTime && !startTime) return { error: "Add a start time too, or leave both empty for all day." };
  if (startTime && endTime && endTime <= startTime) return { error: "End time should be after the start time." };

  const data = {
    title,
    date,
    startTime: startTime || null,
    endTime: endTime || null,
    location: str(fd, "location").slice(0, 160) || null,
    remindMinutes: remindOf(fd),
    note: str(fd, "note").slice(0, 1000) || null,
  };
  if (id) await db.plannerEvent.update({ where: { id }, data });
  else await db.plannerEvent.create({ data });
  return done();
}

export async function deleteEvent(id: number): Promise<ActionResult> {
  await requireUser();
  await db.plannerEvent.deleteMany({ where: { id } });
  return done("Event deleted.");
}

// ---------- Journal (one entry per day, encrypted when a key is set) ----------

export async function saveJournal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const date = isoToDate(str(fd, "date"));
  if (!date) return { error: "Choose a date." };
  const content = String(fd.get("content") ?? "").slice(0, 50_000);
  const moodRaw = Number(fd.get("mood"));
  const mood = Number.isInteger(moodRaw) && moodRaw >= 1 && moodRaw <= 5 ? moodRaw : null;

  if (!content.trim() && mood === null) {
    await db.journalEntry.deleteMany({ where: { date } });
    return done("Entry cleared.");
  }
  const data = { content: sealText(content.trim()) ?? "", mood };
  await db.journalEntry.upsert({ where: { date }, create: { date, ...data }, update: data });
  return done("Saved.");
}
