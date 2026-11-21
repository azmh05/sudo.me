import { db } from "./db";
import { currentMonthKey, dateToISO, shiftMonth } from "./dates";
import { getCashflow } from "./finance";
import type { GoalRow } from "./types";

export async function getGoals(): Promise<GoalRow[]> {
  const goals = await db.goal.findMany({
    include: { contributions: { orderBy: [{ date: "desc" }, { id: "desc" }] } },
    orderBy: [{ archived: "asc" }, { targetDate: "asc" }, { createdAt: "asc" }],
  });
  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    targetAmount: g.targetAmount,
    targetDate: g.targetDate ? dateToISO(g.targetDate) : null,
    note: g.note,
    archived: g.archived,
    saved: g.contributions.reduce((s, c) => s + c.amount, 0),
    contributions: g.contributions.slice(0, 20).map((c) => ({
      id: c.id,
      amount: c.amount,
      date: dateToISO(c.date),
      note: c.note,
    })),
  }));
}

// Average monthly spending over the last 3 full months (for emergency fund advice).
export async function averageMonthlySpending() {
  const months = await getCashflow(shiftMonth(currentMonthKey(), -1), 3);
  const withData = months.filter((m) => m.expense > 0);
  if (!withData.length) return 0;
  return Math.round(withData.reduce((s, m) => s + m.expense, 0) / withData.length);
}
