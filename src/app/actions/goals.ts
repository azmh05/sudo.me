"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isoToDate, todayISO } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import type { ActionResult } from "@/lib/types";

const TYPES = ["SAVINGS", "EMERGENCY", "PURCHASE"] as const;

function done(message?: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, message };
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optId = (fd: FormData, k: string) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};

export async function saveGoal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give the goal a name." };
  if (name.length > 80) return { error: "Name is too long." };

  const type = str(fd, "type") as (typeof TYPES)[number];
  if (!TYPES.includes(type)) return { error: "Choose a goal type." };

  const targetAmount = parseAmount(str(fd, "targetAmount"));
  if (!targetAmount || targetAmount <= 0) return { error: "Enter a target amount, e.g. 3000" };

  const dateRaw = str(fd, "targetDate");
  const targetDate = dateRaw ? isoToDate(dateRaw) : null;
  if (dateRaw && !targetDate) return { error: "Target date isn't valid." };

  const data = { name, type, targetAmount, targetDate, note: str(fd, "note").slice(0, 255) || null };

  if (id) {
    await db.goal.update({ where: { id }, data });
  } else {
    // Optional amount you've already saved towards it.
    const startRaw = str(fd, "startingAmount");
    const starting = startRaw ? parseAmount(startRaw) : null;
    if (startRaw && (starting === null || starting < 0)) return { error: "Amount already saved should look like 500.00" };
    await db.goal.create({
      data: {
        ...data,
        contributions: starting
          ? { create: { amount: starting, date: isoToDate(todayISO())!, note: "Starting amount" } }
          : undefined,
      },
    });
  }
  return done();
}

export async function setGoalArchived(id: number, archived: boolean): Promise<ActionResult> {
  await requireUser();
  await db.goal.update({ where: { id }, data: { archived } });
  return done(archived ? "Goal archived." : "Goal restored.");
}

export async function deleteGoal(id: number): Promise<ActionResult> {
  await requireUser();
  await db.goal.deleteMany({ where: { id } });
  return done("Goal deleted.");
}

// direction "add" puts money towards the goal; "withdraw" takes some out.
export async function addContribution(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const goalId = optId(fd, "goalId");
  if (!goalId || !(await db.goal.findUnique({ where: { id: goalId } }))) return { error: "This goal no longer exists." };

  const amount = parseAmount(str(fd, "amount"));
  if (!amount || amount <= 0) return { error: "Enter an amount, e.g. 50.00" };
  const date = isoToDate(str(fd, "date"));
  if (!date) return { error: "Choose a date." };
  const sign = str(fd, "direction") === "withdraw" ? -1 : 1;

  await db.goalContribution.create({
    data: { goalId, amount: sign * amount, date, note: str(fd, "note").slice(0, 255) || null },
  });
  return done(sign > 0 ? "Added to goal." : "Taken out of goal.");
}

export async function deleteContribution(id: number): Promise<ActionResult> {
  await requireUser();
  await db.goalContribution.deleteMany({ where: { id } });
  return done();
}
