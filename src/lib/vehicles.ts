import { db } from "./db";
import { dateToISO } from "./dates";
import type { VehicleRow } from "./types";

export async function getVehicles(): Promise<VehicleRow[]> {
  const vehicles = await db.vehicle.findMany({
    include: {
      items: {
        include: { logs: { orderBy: [{ doneDate: "desc" }, { id: "desc" }], take: 12 } },
        orderBy: [{ active: "desc" }, { nextDueKm: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
  });

  return vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    plate: v.plate,
    odometer: v.odometer,
    odometerDate: v.odometerDate ? dateToISO(v.odometerDate) : null,
    note: v.note,
    archived: v.archived,
    items: v.items.map((i) => ({
      id: i.id,
      name: i.name,
      intervalKm: i.intervalKm,
      lastDoneKm: i.lastDoneKm,
      lastDoneDate: i.lastDoneDate ? dateToISO(i.lastDoneDate) : null,
      nextDueKm: i.nextDueKm,
      note: i.note,
      active: i.active,
      logs: i.logs.map((l) => ({
        id: l.id,
        doneDate: dateToISO(l.doneDate),
        odometer: l.odometer,
        cost: l.cost,
        note: l.note,
      })),
    })),
  }));
}
