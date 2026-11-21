// Mileage helpers — safe to use in both server and browser code.
import type { DueTone } from "./schedule";

const num = new Intl.NumberFormat("en-MY");

export function formatKm(km: number) {
  return `${num.format(km)} km`;
}

// Turns "14,500", "14500km" or "14 500" into 14500. Null if not a whole number.
export function parseKm(input: string) {
  const s = input.trim().replace(/km$/i, "").replace(/[,\s]/g, "");
  if (!/^\d{1,7}$/.test(s)) return null;
  return Number(s);
}

// How close an item is to its next service, based on the last odometer reading.
export function kmStatus(odometer: number, nextDueKm: number | null, lastDoneKm: number | null, intervalKm: number | null) {
  if (nextDueKm === null) return null;
  const left = nextDueKm - odometer;
  const warnAt = Math.max(100, Math.round((intervalKm ?? 2000) * 0.1)); // last 10% of the interval
  const tone: DueTone = left < 0 ? "overdue" : left <= warnAt ? "soon" : "later";
  const label = left < 0 ? `Overdue by ${formatKm(-left)}` : left === 0 ? "Due now" : `${formatKm(left)} left`;
  const progress =
    lastDoneKm !== null && nextDueKm > lastDoneKm
      ? Math.max(0, Math.min(100, ((odometer - lastDoneKm) / (nextDueKm - lastDoneKm)) * 100))
      : null;
  return { left, tone, label, progress };
}
