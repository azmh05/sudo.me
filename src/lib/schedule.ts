import { dateToISO, formatDay, todayISO } from "./dates";

export type Unit = "DAY" | "WEEK" | "MONTH" | "YEAR";
export type BillFreq = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export const FREQ_LABEL: Record<BillFreq, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Every 3 months",
  YEARLY: "Yearly",
};

export const UNIT_LABEL: Record<Unit, [string, string]> = {
  DAY: ["day", "days"],
  WEEK: ["week", "weeks"],
  MONTH: ["month", "months"],
  YEAR: ["year", "years"],
};

export function freqToInterval(f: BillFreq): [Unit, number] {
  return f === "WEEKLY" ? ["WEEK", 1] : f === "MONTHLY" ? ["MONTH", 1] : f === "QUARTERLY" ? ["MONTH", 3] : ["YEAR", 1];
}

// Adds an interval to a "YYYY-MM-DD" date. For months/years, `anchorDay` keeps
// the usual day (e.g. the 31st becomes the 30th in short months, then back to 31st).
export function addInterval(iso: string, unit: Unit, n: number, anchorDay?: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (unit === "DAY" || unit === "WEEK") {
    d.setUTCDate(d.getUTCDate() + n * (unit === "WEEK" ? 7 : 1));
    return dateToISO(d);
  }
  const months = unit === "MONTH" ? n : n * 12;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(anchorDay ?? d.getUTCDate(), lastDay);
  return dateToISO(new Date(Date.UTC(y, m, day)));
}

export function daysUntil(iso: string, today = todayISO()) {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export type DueTone = "overdue" | "soon" | "later";

export function dueInfo(iso: string): { label: string; tone: DueTone; days: number } {
  const days = daysUntil(iso);
  if (days < 0) return { days, tone: "overdue", label: `Overdue by ${-days} day${days === -1 ? "" : "s"}` };
  if (days === 0) return { days, tone: "soon", label: "Due today" };
  if (days === 1) return { days, tone: "soon", label: "Due tomorrow" };
  if (days <= 7) return { days, tone: "soon", label: `Due in ${days} days` };
  return { days, tone: "later", label: `Due in ${days} days` };
}

export function intervalLabel(value: number | null, unit: Unit | null) {
  if (!value || !unit) return null;
  return `Every ${value === 1 ? "" : `${value} `}${UNIT_LABEL[unit][value === 1 ? 0 : 1]}`;
}

// For documents: "Expired 3 days ago", "Expires in 12 days", or "Valid until …".
export function expiryInfo(iso: string, remindDays = 30): { label: string; tone: DueTone; days: number } {
  const days = daysUntil(iso);
  if (days < 0) return { days, tone: "overdue", label: `Expired ${-days} day${days === -1 ? "" : "s"} ago` };
  if (days === 0) return { days, tone: "soon", label: "Expires today" };
  if (days <= remindDays) return { days, tone: "soon", label: days === 1 ? "Expires tomorrow" : `Expires in ${days} days` };
  return { days, tone: "later", label: `Valid until ${formatDay(iso)}` };
}
