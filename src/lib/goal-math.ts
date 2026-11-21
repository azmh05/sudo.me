// Pure goal calculations — usable in both server and browser code.
import { todayISO } from "./dates";
import type { GoalRow } from "./types";

// Months left until the target date (at least 1), counting this month.
export function monthsLeft(targetISO: string, today = todayISO()) {
  const [ty, tm] = targetISO.split("-").map(Number);
  const [ny, nm] = today.split("-").map(Number);
  return Math.max(1, (ty - ny) * 12 + (tm - nm) + 1);
}

// How much to put aside each month to reach the goal on time.
export function monthlyNeeded(goal: Pick<GoalRow, "targetAmount" | "saved" | "targetDate">) {
  const remaining = goal.targetAmount - goal.saved;
  if (remaining <= 0 || !goal.targetDate) return null;
  if (goal.targetDate < todayISO()) return { perMonth: remaining, months: 0, late: true };
  const months = monthsLeft(goal.targetDate);
  return { perMonth: Math.ceil(remaining / months), months, late: false };
}
