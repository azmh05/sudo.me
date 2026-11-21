"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isoToDate, todayISO } from "@/lib/dates";
import { parseKm } from "@/lib/km";
import { parseAmount } from "@/lib/money";
import type { ActionResult } from "@/lib/types";

function done(message?: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, message };
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optId = (fd: FormData, k: string) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Reads an optional km field. Returns undefined when it's invalid.
function optKm(fd: FormData, k: string): number | null | undefined {
  const raw = str(fd, k);
  if (!raw) return null;
  const km = parseKm(raw);
  return km === null ? undefined : km;
}

// ---------- Vehicles ----------

export async function saveVehicle(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give the vehicle a name, e.g. Motorcycle." };
  if (name.length > 60) return { error: "Name is too long." };

  const odometer = optKm(fd, "odometer");
  if (odometer === undefined) return { error: "Odometer should be a whole number of km, e.g. 12500" };

  const data = {
    name,
    plate: str(fd, "plate").toUpperCase().slice(0, 20) || null,
    note: str(fd, "note").slice(0, 255) || null,
  };

  if (id) {
    const current = await db.vehicle.findUnique({ where: { id } });
    if (!current) return { error: "This vehicle no longer exists." };
    const changed = odometer !== null && odometer !== current.odometer;
    await db.vehicle.update({
      where: { id },
      data: { ...data, ...(changed ? { odometer, odometerDate: isoToDate(todayISO()) } : {}) },
    });
  } else {
    await db.vehicle.create({
      data: { ...data, odometer: odometer ?? 0, odometerDate: odometer ? isoToDate(todayISO()) : null },
    });
  }
  return done();
}

export async function updateOdometer(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "vehicleId");
  const vehicle = id ? await db.vehicle.findUnique({ where: { id } }) : null;
  if (!vehicle) return { error: "This vehicle no longer exists." };

  const odometer = parseKm(str(fd, "odometer"));
  if (odometer === null) return { error: "Enter the reading in km, e.g. 13900" };

  await db.vehicle.update({ where: { id: vehicle.id }, data: { odometer, odometerDate: isoToDate(todayISO()) } });
  return done("Odometer updated.");
}

export async function setVehicleArchived(id: number, archived: boolean): Promise<ActionResult> {
  await requireUser();
  await db.vehicle.update({ where: { id }, data: { archived } });
  return done(archived ? "Vehicle archived." : "Vehicle restored.");
}

// Service items and history go with it; expenses already recorded stay in Finance.
export async function deleteVehicle(id: number): Promise<ActionResult> {
  await requireUser();
  await db.vehicle.deleteMany({ where: { id } });
  return done("Vehicle deleted.");
}

// ---------- Service items (oil, tyres, chain…) ----------

export async function saveVehicleItem(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give it a name, e.g. Engine oil." };
  if (name.length > 80) return { error: "Name is too long." };

  const intervalKm = optKm(fd, "intervalKm");
  const lastDoneKm = optKm(fd, "lastDoneKm");
  let nextDueKm = optKm(fd, "nextDueKm");
  if (intervalKm === undefined || lastDoneKm === undefined || nextDueKm === undefined)
    return { error: "Distances should be whole numbers of km, e.g. 2000" };
  if (intervalKm === 0) return { error: "Interval must be more than 0 km." };

  // Work out the next service from the last one, if only that was given.
  if (nextDueKm === null && lastDoneKm !== null && intervalKm !== null) nextDueKm = lastDoneKm + intervalKm;

  const data = { name, intervalKm, lastDoneKm, nextDueKm, note: str(fd, "note").slice(0, 255) || null };

  if (id) {
    await db.vehicleItem.update({ where: { id }, data });
  } else {
    const vehicleId = optId(fd, "vehicleId");
    if (!vehicleId || !(await db.vehicle.findUnique({ where: { id: vehicleId } })))
      return { error: "This vehicle no longer exists." };
    await db.vehicleItem.create({ data: { ...data, vehicleId } });
  }
  return done();
}

export async function setVehicleItemActive(id: number, active: boolean): Promise<ActionResult> {
  await requireUser();
  await db.vehicleItem.update({ where: { id }, data: { active } });
  return done(active ? "Resumed." : "Paused.");
}

export async function deleteVehicleItem(id: number): Promise<ActionResult> {
  await requireUser();
  await db.vehicleItem.deleteMany({ where: { id } });
  return done("Deleted.");
}

// Logs a service: sets the next km target, updates the odometer, and can add the cost as an expense.
export async function logVehicleService(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const itemId = optId(fd, "itemId");
  const item = itemId ? await db.vehicleItem.findUnique({ where: { id: itemId }, include: { vehicle: true } }) : null;
  if (!item) return { error: "This item no longer exists." };

  const doneDate = isoToDate(str(fd, "doneDate"));
  if (!doneDate) return { error: "Choose the date it was done." };

  const odometer = parseKm(str(fd, "odometer"));
  if (odometer === null) return { error: "Enter the odometer reading at the service, e.g. 14500" };

  const costRaw = str(fd, "cost");
  const cost = costRaw ? parseAmount(costRaw) : null;
  if (costRaw && (cost === null || cost <= 0)) return { error: "Cost should look like 45.00" };

  const record = fd.get("record") === "on" && cost !== null;
  const accountId = optId(fd, "accountId");
  if (record && (!accountId || !(await db.account.findUnique({ where: { id: accountId } }))))
    return { error: "Choose the account you paid from." };
  let categoryId = optId(fd, "categoryId");
  if (categoryId) {
    const c = await db.category.findUnique({ where: { id: categoryId } });
    if (!c || c.kind !== "EXPENSE") categoryId = null;
  }

  let nextDueKm = optKm(fd, "nextDueKm");
  if (nextDueKm === undefined) return { error: "Next service should be a whole number of km." };
  if (nextDueKm === null && item.intervalKm) nextDueKm = odometer + item.intervalKm;

  const note = str(fd, "note").slice(0, 255) || null;

  await db.$transaction(async (tx) => {
    const t = record
      ? await tx.transaction.create({
          data: {
            type: "EXPENSE",
            amount: cost!,
            date: doneDate,
            accountId: accountId!,
            categoryId,
            note: `${item.vehicle.name}: ${item.name}`.slice(0, 255),
          },
        })
      : null;
    await tx.vehicleServiceLog.create({
      data: { itemId: item.id, doneDate, odometer, cost, note, transactionId: t?.id ?? null },
    });
    await tx.vehicleItem.update({
      where: { id: item.id },
      data: { lastDoneKm: odometer, lastDoneDate: doneDate, nextDueKm },
    });
    if (odometer > item.vehicle.odometer) {
      await tx.vehicle.update({ where: { id: item.vehicleId }, data: { odometer, odometerDate: doneDate } });
    }
  });
  return done("Service logged.");
}
