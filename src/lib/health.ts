import type { HealthAppointment } from "@prisma/client";
import { openText } from "./crypto";
import { db } from "./db";
import { dateToISO, isoToDate, todayISO } from "./dates";
import type { AppointmentRow, CheckupRow, HealthProfileRow } from "./types";

export function toAppointmentRow(a: HealthAppointment): AppointmentRow {
  return {
    id: a.id,
    title: a.title,
    checkupId: a.checkupId,
    date: dateToISO(a.date),
    time: a.time,
    place: a.place,
    bookedVia: a.bookedVia,
    reference: a.reference,
    note: a.note,
    status: a.status,
    outcome: openText(a.outcome),
    cost: a.cost,
  };
}

export async function getHealth() {
  const today = isoToDate(todayISO())!;
  const [checkups, upcoming, pending, past, profile] = await Promise.all([
    db.healthCheckup.findMany({
      include: {
        appointments: { where: { status: "BOOKED", date: { gte: today } }, orderBy: [{ date: "asc" }, { time: "asc" }], take: 1 },
      },
      orderBy: [{ active: "desc" }, { nextDueDate: "asc" }, { name: "asc" }],
    }),
    db.healthAppointment.findMany({ where: { status: "BOOKED", date: { gte: today } }, orderBy: [{ date: "asc" }, { time: "asc" }] }),
    // Appointments whose date has passed but haven't been marked done yet.
    db.healthAppointment.findMany({ where: { status: "BOOKED", date: { lt: today } }, orderBy: [{ date: "desc" }] }),
    db.healthAppointment.findMany({ where: { status: "DONE" }, orderBy: [{ date: "desc" }, { id: "desc" }], take: 30 }),
    db.healthProfile.findUnique({ where: { id: 1 } }),
  ]);

  const checkupRows: CheckupRow[] = checkups.map((c) => ({
    id: c.id,
    name: c.name,
    intervalValue: c.intervalValue,
    intervalUnit: c.intervalUnit,
    bookLeadDays: c.bookLeadDays,
    lastDoneDate: c.lastDoneDate ? dateToISO(c.lastDoneDate) : null,
    nextDueDate: c.nextDueDate ? dateToISO(c.nextDueDate) : null,
    place: c.place,
    note: c.note,
    active: c.active,
    booked: c.appointments[0] ? toAppointmentRow(c.appointments[0]) : null,
  }));

  const profileRow: HealthProfileRow = {
    bloodType: profile?.bloodType ?? null,
    allergies: profile?.allergies ?? null,
    medications: profile?.medications ?? null,
    conditions: profile?.conditions ?? null,
    emergencyName: profile?.emergencyName ?? null,
    emergencyPhone: profile?.emergencyPhone ?? null,
    emergencyRelation: profile?.emergencyRelation ?? null,
    note: profile?.note ?? null,
  };

  return {
    checkups: checkupRows,
    upcoming: upcoming.map(toAppointmentRow),
    pending: pending.map(toAppointmentRow),
    past: past.map(toAppointmentRow),
    profile: profileRow,
  };
}
