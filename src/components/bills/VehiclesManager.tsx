"use client";

import { Bike, Check, Gauge, Pencil, Plus } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteVehicle,
  deleteVehicleItem,
  logVehicleService,
  saveVehicle,
  saveVehicleItem,
  setVehicleArchived,
  setVehicleItemActive,
  updateOdometer,
} from "@/app/actions/vehicles";
import { formatDay, todayISO } from "@/lib/dates";
import { formatKm, kmStatus } from "@/lib/km";
import { daysUntil } from "@/lib/schedule";
import type { AccountOption, ActionResult, CategoryOption, VehicleItemRow, VehicleRow } from "@/lib/types";
import { cn, formatRM } from "@/lib/utils";
import { ToneBadge } from "../DueBadge";
import { ConfirmDelete, FormError, Modal } from "../Modal";
import { EmptyState } from "../ui";
import { MoneyInput } from "../MoneyInput";

const ITEM_SUGGESTIONS = [
  "Engine oil",
  "Oil filter",
  "Gearbox oil",
  "Chain & sprocket",
  "Front tyre",
  "Rear tyre",
  "Brake pads",
  "Spark plug",
  "Air filter",
  "Coolant",
  "Battery",
];

type Open =
  | { mode: "vehicle"; vehicle?: VehicleRow }
  | { mode: "odometer"; vehicle: VehicleRow }
  | { mode: "item"; vehicle: VehicleRow; item?: VehicleItemRow }
  | { mode: "service"; vehicle: VehicleRow; item: VehicleItemRow }
  | null;

function useRun(onDone: () => void) {
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r?.ok) onDone();
      else setResult(r);
    });
  return { result, busy, run };
}

function updatedLabel(iso: string | null) {
  if (!iso) return "not updated yet";
  const days = -daysUntil(iso);
  return days <= 0 ? "updated today" : days === 1 ? "updated yesterday" : `updated ${days} days ago`;
}

export function VehiclesManager({
  vehicles,
  accounts,
  categories,
}: {
  vehicles: VehicleRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const active = vehicles.filter((v) => !v.archived);
  const archived = vehicles.filter((v) => v.archived);

  const title =
    open?.mode === "vehicle" ? (open.vehicle ? "Edit vehicle" : "New vehicle") :
    open?.mode === "odometer" ? `Update km · ${open.vehicle.name}` :
    open?.mode === "item" ? (open.item ? "Edit service item" : "New service item") :
    open?.mode === "service" ? `Service done: ${open.item.name}` : "";

  return (
    <>
      {active.length === 0 ? (
        <div className="card">
          <EmptyState icon={Bike} title="No vehicles yet" text="Add your motorcycle, then track oil changes and other upkeep by mileage." />
          <div className="flex justify-center pb-8">
            <button type="button" onClick={() => setOpen({ mode: "vehicle" })} className="btn-primary h-10">
              <Plus className="size-4" /> Add vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onOpen={setOpen} />
          ))}
          <button
            type="button"
            onClick={() => setOpen({ mode: "vehicle" })}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[14px] text-muted transition hover:border-muted hover:text-ink"
          >
            <Plus className="size-4" /> Add another vehicle
          </button>
        </div>
      )}

      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">Archived vehicles ({archived.length})</summary>
          <ul className="card mt-3 divide-y divide-line opacity-70">
            {archived.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => setOpen({ mode: "vehicle", vehicle: v })} className="w-full px-5 py-3 text-left text-[14px] hover:bg-subtle/60">
                  {v.name}{v.plate ? ` · ${v.plate}` : ""}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-6 text-[13px] text-muted">
        The Hub can&apos;t read your bike&apos;s odometer, so tap <b className="font-medium text-ink">Update km</b> now and then (for example when you refuel) to keep the “km left” figures accurate.
      </p>

      <Modal open={open !== null} onClose={close} title={title}>
        {open?.mode === "vehicle" && <VehicleForm vehicle={open.vehicle} onDone={close} />}
        {open?.mode === "odometer" && <OdometerForm vehicle={open.vehicle} onDone={close} />}
        {open?.mode === "item" && <ItemForm vehicle={open.vehicle} item={open.item} onDone={close} />}
        {open?.mode === "service" && (
          <ServiceForm vehicle={open.vehicle} item={open.item} accounts={accounts} categories={categories} onDone={close} />
        )}
      </Modal>
    </>
  );
}

function VehicleCard({ vehicle: v, onOpen }: { vehicle: VehicleRow; onOpen: (o: Open) => void }) {
  const items = [...v.items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const la = a.nextDueKm === null ? Infinity : a.nextDueKm - v.odometer;
    const lb = b.nextDueKm === null ? Infinity : b.nextDueKm - v.odometer;
    return la - lb;
  });

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-subtle">
          <Bike className="size-5 text-muted" strokeWidth={1.75} />
        </span>
        <button type="button" onClick={() => onOpen({ mode: "vehicle", vehicle: v })} className="group min-w-0 flex-1 text-left">
          <p className="flex items-center gap-1.5 truncate text-[15px] font-medium">
            {v.name}
            {v.plate && <span className="font-normal text-muted">· {v.plate}</span>}
            <Pencil className="size-3.5 text-muted opacity-0 transition group-hover:opacity-100" />
          </p>
          <p className="text-[13px] text-muted">
            <span className="font-medium tabular-nums text-ink">{formatKm(v.odometer)}</span> · {updatedLabel(v.odometerDate)}
          </p>
        </button>
        <button type="button" onClick={() => onOpen({ mode: "odometer", vehicle: v })} className="btn h-9 border border-line px-3 text-[13px] hover:bg-subtle">
          <Gauge className="size-4" strokeWidth={1.75} /> Update km
        </button>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-muted">
          No service items yet. Add one, like <span className="text-ink">Engine oil every 2,000 km</span>.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <ItemLine key={i.id} item={i} odometer={v.odometer}
              onEdit={() => onOpen({ mode: "item", vehicle: v, item: i })}
              onService={i.active ? () => onOpen({ mode: "service", vehicle: v, item: i }) : undefined}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onOpen({ mode: "item", vehicle: v })}
        className="flex w-full items-center gap-1.5 border-t border-line px-5 py-3 text-[13px] text-muted hover:text-ink"
      >
        <Plus className="size-3.5" /> Add service item
      </button>
    </section>
  );
}

function ItemLine({ item: i, odometer, onEdit, onService }: { item: VehicleItemRow; odometer: number; onEdit: () => void; onService?: () => void }) {
  const status = i.active ? kmStatus(odometer, i.nextDueKm, i.lastDoneKm, i.intervalKm) : null;
  const meta = [
    i.intervalKm ? `Every ${formatKm(i.intervalKm)}` : null,
    i.nextDueKm !== null ? `next at ${formatKm(i.nextDueKm)}` : "no target set",
    i.lastDoneDate ? `last done ${formatDay(i.lastDoneDate)}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <li className={cn("flex items-center gap-3 px-5 py-3.5", !i.active && "opacity-60")}>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[15px] font-medium">{i.name}</span>
          {status && <ToneBadge tone={status.tone} label={status.label} />}
          {!i.active && <span className="text-[12px] text-muted">Paused</span>}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">{meta}</p>
        {status?.progress != null && (
          <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-subtle">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                status.tone === "overdue" ? "bg-negative" : status.tone === "soon" ? "bg-warning" : "bg-accent",
              )}
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
      </button>
      {onService && (
        <button type="button" onClick={onService} className="btn h-9 shrink-0 border border-line px-3 text-[13px] hover:bg-subtle">
          <Check className="size-4" strokeWidth={2} /> Done
        </button>
      )}
    </li>
  );
}

function VehicleForm({ vehicle, onDone }: { vehicle?: VehicleRow; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveVehicle, undefined);
  const { result, busy, run } = useRun(onDone);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" autoComplete="off" defaultValue={vehicle?.name ?? ""} maxLength={60} placeholder="e.g. Motorcycle" className="input" required autoFocus={!vehicle} />
        </div>
        <div>
          <label htmlFor="plate" className="label">Plate (optional)</label>
          <input id="plate" name="plate" autoComplete="off" defaultValue={vehicle?.plate ?? ""} maxLength={20} placeholder="e.g. WXY 1234" className="input uppercase" />
        </div>
      </div>
      <div>
        <label htmlFor="odometer" className="label">Current odometer (km)</label>
        <input id="odometer" name="odometer" inputMode="numeric" defaultValue={vehicle ? vehicle.odometer : ""} placeholder="e.g. 12500" className="input tabular-nums" />
      </div>
      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input id="note" name="note" autoComplete="off" defaultValue={vehicle?.note ?? ""} maxLength={255} placeholder="e.g. Honda Wave 125, usual workshop" className="input" />
      </div>
      <FormError message={state?.error ?? result?.error} />
      <div className="flex flex-wrap items-center gap-2">
        {vehicle && (
          <>
            <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteVehicle(vehicle.id))} />
            <button type="button" disabled={busy} onClick={() => run(() => setVehicleArchived(vehicle.id, !vehicle.archived))} className="btn-ghost h-10 px-3 text-[14px]">
              {vehicle.archived ? "Restore" : "Archive"}
            </button>
          </>
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : vehicle ? "Save changes" : "Add vehicle"}
        </button>
      </div>
    </form>
  );
}

function OdometerForm({ vehicle, onDone }: { vehicle: VehicleRow; onDone: () => void }) {
  const [state, action, saving] = useActionState(updateOdometer, undefined);
  const [value, setValue] = useState("");
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const typed = Number(value.replace(/[,\s]/g, ""));
  const lower = value.trim() !== "" && Number.isFinite(typed) && typed < vehicle.odometer;

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <input type="hidden" name="vehicleId" value={vehicle.id} />
      <p className="text-[13px] text-muted">
        Last reading: <span className="font-medium tabular-nums text-ink">{formatKm(vehicle.odometer)}</span> · {updatedLabel(vehicle.odometerDate)}
      </p>
      <div>
        <label htmlFor="odometer" className="label">Odometer now</label>
        <div className="relative">
          <input
            id="odometer"
            name="odometer"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={String(vehicle.odometer)}
            className="input h-14 pr-12 text-[22px] font-semibold tabular-nums"
            autoFocus
            required
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[15px] text-muted">km</span>
        </div>
        {lower && <p className="mt-1.5 text-[12px] text-warning">That&apos;s lower than the last reading. Fine if you&apos;re correcting a mistake.</p>}
      </div>
      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : "Update"}</button>
    </form>
  );
}

function ItemForm({ vehicle, item, onDone }: { vehicle: VehicleRow; item?: VehicleItemRow; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveVehicleItem, undefined);
  const { result, busy, run } = useRun(onDone);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <div className="space-y-5">
      <form action={action} autoComplete="off" className="space-y-4">
        {item ? <input type="hidden" name="id" value={item.id} /> : <input type="hidden" name="vehicleId" value={vehicle.id} />}
        <div>
          <label htmlFor="name" className="label">What needs servicing?</label>
          <input id="name" name="name" list="vehicle-items" autoComplete="off" defaultValue={item?.name ?? ""} maxLength={80} placeholder="e.g. Engine oil" className="input" required autoFocus={!item} />
          <datalist id="vehicle-items">
            {ITEM_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="intervalKm" className="label">Every (km)</label>
          <input id="intervalKm" name="intervalKm" inputMode="numeric" defaultValue={item?.intervalKm ?? ""} placeholder="e.g. 2000" className="input tabular-nums" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lastDoneKm" className="label">Last done at (km)</label>
            <input id="lastDoneKm" name="lastDoneKm" inputMode="numeric" defaultValue={item?.lastDoneKm ?? ""} placeholder="e.g. 12500" className="input tabular-nums" />
          </div>
          <div>
            <label htmlFor="nextDueKm" className="label">Next at (km)</label>
            <input id="nextDueKm" name="nextDueKm" inputMode="numeric" defaultValue={item?.nextDueKm ?? ""} placeholder="auto" className="input tabular-nums" />
          </div>
        </div>
        <p className="-mt-2 text-[12px] text-muted">Leave “Next at” empty and it&apos;s worked out as “Last done at” + the interval.</p>
        <div>
          <label htmlFor="note" className="label">Note (optional)</label>
          <input id="note" name="note" autoComplete="off" defaultValue={item?.note ?? ""} maxLength={255} placeholder="e.g. Motul 10W-40, 0.8 L" className="input" />
        </div>
        <FormError message={state?.error ?? result?.error} />
        <div className="flex flex-wrap items-center gap-2">
          {item && (
            <>
              <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteVehicleItem(item.id))} />
              <button type="button" disabled={busy} onClick={() => run(() => setVehicleItemActive(item.id, !item.active))} className="btn-ghost h-10 px-3 text-[14px]">
                {item.active ? "Pause" : "Resume"}
              </button>
            </>
          )}
          <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
            {saving ? "Saving…" : item ? "Save changes" : "Add item"}
          </button>
        </div>
      </form>

      {item && item.logs.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-[13px] font-medium">Service history</p>
          <ul className="space-y-1.5 text-[13px] text-muted">
            {item.logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="truncate">
                  {formatDay(l.doneDate)} · <span className="tabular-nums">{formatKm(l.odometer)}</span>{l.note ? ` · ${l.note}` : ""}
                </span>
                {l.cost !== null && <span className="shrink-0 tabular-nums">{formatRM(l.cost)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ServiceForm({
  vehicle,
  item,
  accounts,
  categories,
  onDone,
}: {
  vehicle: VehicleRow;
  item: VehicleItemRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [state, action, saving] = useActionState(logVehicleService, undefined);
  const [odometer, setOdometer] = useState(String(vehicle.odometer || ""));
  const [cost, setCost] = useState("");
  const [record, setRecord] = useState(true);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const expenseCats = categories.filter((c) => c.kind === "EXPENSE" && !c.archived);
  const usableAccounts = accounts.filter((a) => !a.archived);
  const odo = Number(odometer.replace(/[,\s]/g, ""));
  const autoNext = item.intervalKm && odometer.trim() && Number.isFinite(odo) ? odo + item.intervalKm : null;

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <input type="hidden" name="itemId" value={item.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="odometer" className="label">Odometer at service (km)</label>
          <input id="odometer" name="odometer" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="input tabular-nums" required autoFocus />
        </div>
        <div>
          <label htmlFor="doneDate" className="label">Date</label>
          <input id="doneDate" name="doneDate" type="date" defaultValue={todayISO()} className="input" required />
        </div>
      </div>

      <div>
        <label htmlFor="nextDueKm" className="label">Next service at (km)</label>
        <input id="nextDueKm" name="nextDueKm" inputMode="numeric" placeholder={autoNext ? String(autoNext) : "e.g. 16500"} className="input tabular-nums" />
        <p className="mt-1.5 text-[12px] text-muted">
          {autoNext
            ? <>Leave empty for <span className="font-medium text-ink tabular-nums">{formatKm(autoNext)}</span> (+{formatKm(item.intervalKm!)}).</>
            : "No interval set for this item, so type the next target if there is one."}
        </p>
      </div>

      <div>
        <label htmlFor="cost" className="label">Cost (optional)</label>
        <MoneyInput id="cost" name="cost" value={cost} onValueChange={setCost} className="input" />
      </div>

      {cost.trim() !== "" && (
        <>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
            <input type="checkbox" name="record" checked={record} onChange={(e) => setRecord(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
            <span className="text-[14px]">
              Add as an expense in Finance
              <span className="block text-[12px] text-muted">Updates your balance and budget.</span>
            </span>
          </label>
          {record && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="accountId" className="label">Paid from</label>
                <select id="accountId" name="accountId" defaultValue={usableAccounts[0]?.id} className="input">
                  {usableAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="categoryId" className="label">Category</label>
                <select id="categoryId" name="categoryId" defaultValue={expenseCats.find((c) => c.name === "Transport")?.id ?? ""} className="input">
                  <option value="">No category</option>
                  {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input id="note" name="note" autoComplete="off" maxLength={255} placeholder="e.g. Changed oil + filter" className="input" />
      </div>

      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : "Log service"}</button>
    </form>
  );
}
