// Dates are stored as calendar days (no time). Months are keys like "2026-11".

const pad = (n: number) => String(n).padStart(2, "0");

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function isMonthKey(s?: string | null): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

// Start (inclusive) and end (exclusive) of a month, as stored-date values.
export function monthRange(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function shiftMonth(key: string, by: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function monthLabel(key: string, style: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("en-MY", {
    month: style,
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(monthRange(key).start);
}

// Today's date on this device, as "YYYY-MM-DD".
export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : d;
}

export function dateToISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

const dayFmt = new Intl.DateTimeFormat("en-MY", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayYearFmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// "Today", "Yesterday", "Sat, 21 Nov", or "21 Nov 2025" for other years.
export function formatDay(iso: string) {
  const today = todayISO();
  if (iso === today) return "Today";
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (iso === dateToISO(y)) return "Yesterday";
  const d = new Date(`${iso}T00:00:00Z`);
  return iso.slice(0, 4) === today.slice(0, 4) ? dayFmt.format(d) : dayYearFmt.format(d);
}

// ---------- Times ("HH:MM", 24-hour) ----------

export function isTime(s?: string | null): s is string {
  return !!s && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

// "14:30" -> "2:30 PM"
export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// "2023-09-01" -> "Sep 2023"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatMonthYear(iso: string) {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

// "2026-11-21" -> "Saturday, 21 November 2026"
export function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
