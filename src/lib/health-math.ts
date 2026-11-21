// Health check-up status — safe to use in both server and browser code.
import { formatDay, formatTime } from "./dates";
import { daysUntil, type DueTone } from "./schedule";
import type { CheckupRow } from "./types";

export type CheckupStage = { stage: "booked" | "book" | "due" | "none"; tone: DueTone; label: string };

// Due soon → Book now → Booked → (Done → next one scheduled)
export function checkupStage(c: Pick<CheckupRow, "nextDueDate" | "bookLeadDays" | "booked">): CheckupStage {
  if (c.booked) {
    return {
      stage: "booked",
      tone: "later",
      label: `Booked · ${formatDay(c.booked.date)}${c.booked.time ? `, ${formatTime(c.booked.time)}` : ""}`,
    };
  }
  if (!c.nextDueDate) return { stage: "none", tone: "later", label: "No due date" };
  const days = daysUntil(c.nextDueDate);
  if (days < 0) return { stage: "book", tone: "overdue", label: `Overdue · book now` };
  if (days <= c.bookLeadDays) return { stage: "book", tone: "soon", label: `Time to book · due ${formatDay(c.nextDueDate)}` };
  return { stage: "due", tone: "later", label: `Due ${formatDay(c.nextDueDate)}` };
}

// "Today", "Tomorrow", "In 3 days", "3 days ago"
export function relativeDay(iso: string) {
  const d = daysUntil(iso);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return d > 0 ? `In ${d} days` : `${-d} days ago`;
}
