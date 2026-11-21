// Decides which notifications are due right now. Pure logic (no database), so it's easy to test.
// Each notification has a unique key; the scheduler sends a key only once.
import { formatDay, formatTime } from "../dates";
import { addInterval, daysUntil } from "../schedule";
import { formatRM } from "../utils";

export type Prefs = {
  bills: boolean;
  upkeep: boolean;
  documents: boolean;
  health: boolean;
  planner: boolean;
  dailySummary: boolean;
  summaryTime: string;
  overdueTasks: boolean;
};

export type NotifyData = {
  bills: { id: number; name: string; amount: number; nextDueDate: string; remindDays: number }[];
  upkeep: { id: number; name: string; nextDueDate: string; remindDays: number }[];
  documents: { id: number; title: string; expiryDate: string; remindDays: number }[];
  checkups: { id: number; name: string; nextDueDate: string; bookLeadDays: number; booked: boolean }[];
  appointments: { id: number; title: string; date: string; time: string | null; place: string | null }[]; // still BOOKED
  tasks: { id: number; title: string; dueDate: string; dueTime: string | null; remindMinutes: number | null }[]; // not done
  events: { id: number; title: string; date: string; startTime: string | null; location: string | null; remindMinutes: number | null }[];
  overdueTasks: number;
};

export type Note = { key: string; title: string; body: string; url: string };

const pad = (n: number) => String(n).padStart(2, "0");
export const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// A date + "HH:MM" as a moment in the laptop's local time.
export function localAt(iso: string, time: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi);
}

const inDays = (days: number) => (days === 1 ? "tomorrow" : `in ${days} days`);

function leadLabel(minutes: number) {
  if (minutes === 0) return "Now";
  if (minutes === 1440) return "Tomorrow";
  if (minutes === 60) return "In 1 hour";
  return `In ${minutes} minutes`;
}

export function collectNotes(now: Date, data: NotifyData, prefs: Prefs): Note[] {
  const today = localISO(now);
  const morning = hhmm(now) >= prefs.summaryTime;
  const tomorrow = addInterval(today, "DAY", 1);
  const notes: Note[] = [];
  const days = (iso: string) => daysUntil(iso, today);

  // ----- Date-based reminders, sent from the morning time onwards -----
  if (morning) {
    if (prefs.bills) {
      for (const b of data.bills) {
        const d = days(b.nextDueDate);
        if (d < 0) notes.push({ key: `bill:${b.id}:${b.nextDueDate}:overdue`, title: `${b.name} is overdue`, body: `${formatRM(b.amount)} was due ${formatDay(b.nextDueDate)}. Mark it paid once settled.`, url: "/bills" });
        else if (d === 0) notes.push({ key: `bill:${b.id}:${b.nextDueDate}:due`, title: `${b.name} is due today`, body: formatRM(b.amount), url: "/bills" });
        else if (d <= b.remindDays) notes.push({ key: `bill:${b.id}:${b.nextDueDate}:remind`, title: `${b.name} due ${inDays(d)}`, body: `${formatRM(b.amount)} · ${formatDay(b.nextDueDate)}`, url: "/bills" });
      }
    }

    if (prefs.upkeep) {
      for (const u of data.upkeep) {
        const d = days(u.nextDueDate);
        if (d < 0) notes.push({ key: `upkeep:${u.id}:${u.nextDueDate}:overdue`, title: `${u.name} is overdue`, body: `It was due ${formatDay(u.nextDueDate)}.`, url: "/bills/maintenance" });
        else if (d === 0) notes.push({ key: `upkeep:${u.id}:${u.nextDueDate}:due`, title: `${u.name} is due today`, body: "Home & Devices", url: "/bills/maintenance" });
        else if (d <= u.remindDays) notes.push({ key: `upkeep:${u.id}:${u.nextDueDate}:remind`, title: `${u.name} due ${inDays(d)}`, body: formatDay(u.nextDueDate), url: "/bills/maintenance" });
      }
    }

    if (prefs.documents) {
      for (const r of data.documents) {
        const d = days(r.expiryDate);
        if (d < 0) notes.push({ key: `doc:${r.id}:${r.expiryDate}:expired`, title: `${r.title} has expired`, body: `It expired ${formatDay(r.expiryDate)}.`, url: "/records" });
        else if (d === 0) notes.push({ key: `doc:${r.id}:${r.expiryDate}:today`, title: `${r.title} expires today`, body: "Renew it if you haven't yet.", url: "/records" });
        else if (d <= r.remindDays) notes.push({ key: `doc:${r.id}:${r.expiryDate}:remind`, title: `${r.title} expires ${inDays(d)}`, body: formatDay(r.expiryDate), url: "/records" });
      }
    }

    if (prefs.health) {
      for (const c of data.checkups) {
        if (!c.booked && days(c.nextDueDate) <= c.bookLeadDays)
          notes.push({ key: `book:${c.id}:${c.nextDueDate}`, title: `Time to book: ${c.name}`, body: `Due ${formatDay(c.nextDueDate)}. Book it in MySejahtera, then tap "Booked it".`, url: "/health" });
      }
      for (const a of data.appointments) {
        if (a.date < today && days(a.date) >= -3)
          notes.push({ key: `howdidgo:${a.id}`, title: "How did your appointment go?", body: `${a.title} · mark it done to schedule the next one.`, url: "/health" });
        if (!a.time && a.date === tomorrow)
          notes.push({ key: `appt:${a.id}:${a.date}:day`, title: `Tomorrow: ${a.title}`, body: a.place ?? "Health appointment", url: "/health" });
        if (!a.time && a.date === today)
          notes.push({ key: `appt:${a.id}:${a.date}:today`, title: `Today: ${a.title}`, body: a.place ?? "Health appointment", url: "/health" });
      }
    }

    if (prefs.planner) {
      // Items with a date but no time: remind in the morning (the day before for "1 day before").
      for (const t of data.tasks) {
        if (t.dueTime || t.remindMinutes === null) continue;
        const fireDay = t.remindMinutes === 1440 ? addInterval(t.dueDate, "DAY", -1) : t.dueDate;
        if (fireDay === today) notes.push({ key: `task:${t.id}:${t.dueDate}:morning`, title: t.dueDate === today ? `Today: ${t.title}` : `Tomorrow: ${t.title}`, body: "Task", url: "/planner" });
      }
      for (const e of data.events) {
        if (e.startTime || e.remindMinutes === null) continue;
        const fireDay = e.remindMinutes === 1440 ? addInterval(e.date, "DAY", -1) : e.date;
        if (fireDay === today) notes.push({ key: `event:${e.id}:${e.date}:allday`, title: e.date === today ? `Today: ${e.title}` : `Tomorrow: ${e.title}`, body: e.location ?? "All-day event", url: "/planner" });
      }
    }

    if (prefs.overdueTasks && data.overdueTasks > 0)
      notes.push({ key: `overdue:${today}`, title: `${data.overdueTasks} overdue task${data.overdueTasks === 1 ? "" : "s"}`, body: "Tick them off or give them a new date.", url: "/planner/tasks" });

    if (prefs.dailySummary) {
      const parts = [
        countLabel(data.tasks.filter((t) => t.dueDate === today).length, "task"),
        countLabel(data.events.filter((e) => e.date === today).length, "event"),
        ...data.appointments.filter((a) => a.date === today).map((a) => `${a.title}${a.time ? ` ${formatTime(a.time)}` : ""}`),
        ...data.bills.filter((b) => b.nextDueDate === today).map((b) => `${b.name} due`),
      ].filter(Boolean);
      if (parts.length) notes.push({ key: `summary:${today}`, title: "Your day", body: parts.join(" · "), url: "/" });
    }
  }

  // ----- Timed reminders, sent at the exact moment -----
  const timed = (key: string, iso: string, time: string, lead: number, title: string, body: string, url: string) => {
    const start = localAt(iso, time);
    const fireAt = new Date(start.getTime() - lead * 60_000);
    // Fire once the time arrives; skip if the laptop was off and it's long past.
    if (now >= fireAt && now.getTime() - fireAt.getTime() < 6 * 3_600_000 && now.getTime() < start.getTime() + 60 * 60_000)
      notes.push({ key, title, body, url });
  };

  if (prefs.planner) {
    for (const e of data.events) {
      if (!e.startTime || e.remindMinutes === null) continue;
      timed(`event:${e.id}:${e.date}:${e.startTime}:${e.remindMinutes}`, e.date, e.startTime, e.remindMinutes, e.title,
        [`${leadLabel(e.remindMinutes)} · ${formatTime(e.startTime)}`, e.location].filter(Boolean).join(" · "), "/planner");
    }
    for (const t of data.tasks) {
      if (!t.dueTime || t.remindMinutes === null) continue;
      timed(`task:${t.id}:${t.dueDate}:${t.dueTime}:${t.remindMinutes}`, t.dueDate, t.dueTime, t.remindMinutes, t.title,
        `${leadLabel(t.remindMinutes)} · due ${formatTime(t.dueTime)}`, "/planner");
    }
  }

  if (prefs.health) {
    for (const a of data.appointments) {
      if (!a.time || a.date < today) continue;
      const start = localAt(a.date, a.time).getTime();
      const body = [formatTime(a.time), a.place].filter(Boolean).join(" · ");
      if (start - now.getTime() > 2 * 3_600_000) timed(`appt:${a.id}:${a.date}:day`, a.date, a.time, 1440, `Tomorrow: ${a.title}`, body, "/health");
      timed(`appt:${a.id}:${a.date}:hour`, a.date, a.time, 60, `In 1 hour: ${a.title}`, body, "/health");
    }
  }

  return notes;
}

function countLabel(n: number, word: string) {
  return n ? `${n} ${word}${n === 1 ? "" : "s"}` : "";
}
