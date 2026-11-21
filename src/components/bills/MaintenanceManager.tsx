"use client";

import { Check, Plus, Wrench } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { deleteMaintenance, markMaintenanceDone, saveMaintenance, setMaintenanceActive } from "@/app/actions/bills";
import { formatDay, todayISO } from "@/lib/dates";
import { intervalLabel, UNIT_LABEL } from "@/lib/schedule";
import type { AccountOption, ActionResult, CategoryOption, MaintenanceRow } from "@/lib/types";
import { formatRM } from "@/lib/utils";
import { DueBadge } from "../DueBadge";
import { ConfirmDelete, FormError, Modal } from "../Modal";
import { EmptyState } from "../ui";
import { MoneyInput } from "../MoneyInput";
import { RemindSelect } from "../RemindSelect";

type Open = { mode: "new" } | { mode: "edit"; item: MaintenanceRow } | { mode: "done"; item: MaintenanceRow } | null;

const GROUP_SUGGESTIONS = ["Home", "Device", "Appliance"];

export function MaintenanceManager({
  items,
  accounts,
  categories,
}: {
  items: MaintenanceRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const active = items.filter((i) => i.active);
  const paused = items.filter((i) => !i.active);

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-[15px] font-medium">Home & Devices</h2>
          <button type="button" onClick={() => setOpen({ mode: "new" })} className="btn-primary h-9 px-3 text-[14px]">
            <Plus className="size-4" /> Add item
          </button>
        </div>
        {active.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Nothing here yet"
            text="Track upkeep that repeats by time — aircon cleaning, water filter, a laptop warranty."
          />
        ) : (
          <ul className="divide-y divide-line">
            {active.map((i) => (
              <ItemLine key={i.id} item={i} onEdit={() => setOpen({ mode: "edit", item: i })} onDone={() => setOpen({ mode: "done", item: i })} />
            ))}
          </ul>
        )}
      </div>

      {paused.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">Paused ({paused.length})</summary>
          <ul className="card mt-3 divide-y divide-line opacity-70">
            {paused.map((i) => <ItemLine key={i.id} item={i} onEdit={() => setOpen({ mode: "edit", item: i })} />)}
          </ul>
        </details>
      )}

      <Modal
        open={open !== null}
        onClose={close}
        title={open?.mode === "new" ? "New item" : open?.mode === "done" ? `Done: ${open.item.name}` : "Edit item"}
      >
        {open?.mode === "done" ? (
          <DoneForm item={open.item} accounts={accounts} categories={categories} onDone={close} />
        ) : open ? (
          <ItemForm item={open.mode === "edit" ? open.item : undefined} onDone={close} />
        ) : null}
      </Modal>
    </>
  );
}

function ItemLine({ item: i, onEdit, onDone }: { item: MaintenanceRow; onEdit: () => void; onDone?: () => void }) {
  const every = intervalLabel(i.intervalValue, i.intervalUnit);
  const meta = [i.groupLabel, every, i.lastDoneDate ? `last done ${formatDay(i.lastDoneDate)}` : null].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[15px] font-medium">{i.name}</span>
          {i.active && i.nextDueDate && <DueBadge date={i.nextDueDate} />}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">{meta || "No schedule set"}</p>
      </button>
      {onDone && (
        <button type="button" onClick={onDone} className="btn h-9 shrink-0 border border-line px-3 text-[13px] hover:bg-subtle">
          <Check className="size-4" strokeWidth={2} /> Done
        </button>
      )}
    </li>
  );
}

function ItemForm({ item, onDone }: { item?: MaintenanceRow; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveMaintenance, undefined);
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r?.ok) onDone();
      else setResult(r);
    });

  return (
    <div className="space-y-5">
      <form action={action} autoComplete="off" className="space-y-4">
        {item && <input type="hidden" name="id" value={item.id} />}
        <div>
          <label htmlFor="name" className="label">What needs maintenance?</label>
          <input id="name" name="name" autoComplete="off" defaultValue={item?.name} maxLength={80} placeholder="e.g. Aircon cleaning" className="input" required autoFocus={!item} />
        </div>
        <div>
          <label htmlFor="groupLabel" className="label">Group (optional)</label>
          <input id="groupLabel" name="groupLabel" list="maintenance-groups" defaultValue={item?.groupLabel ?? ""} maxLength={40} placeholder="e.g. Home" className="input" />
          <datalist id="maintenance-groups">
            {GROUP_SUGGESTIONS.map((g) => <option key={g} value={g} />)}
          </datalist>
        </div>
        <div>
          <span className="label">Repeats every (optional)</span>
          <div className="grid grid-cols-2 gap-3">
            <input name="intervalValue" inputMode="numeric" defaultValue={item?.intervalValue ?? ""} placeholder="e.g. 6" aria-label="Interval" className="input" />
            <select name="intervalUnit" defaultValue={item?.intervalUnit ?? "MONTH"} aria-label="Interval unit" className="input">
              {Object.entries(UNIT_LABEL).map(([k, [, plural]]) => <option key={k} value={k}>{plural}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lastDoneDate" className="label">Last done</label>
            <input id="lastDoneDate" name="lastDoneDate" type="date" defaultValue={item?.lastDoneDate ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="nextDueDate" className="label">Next due</label>
            <input id="nextDueDate" name="nextDueDate" type="date" defaultValue={item?.nextDueDate ?? ""} className="input" />
          </div>
        </div>
        <p className="-mt-2 text-[12px] text-muted">Leave “Next due” empty and it&apos;s worked out from “Last done” + the repeat interval.</p>
        <RemindSelect value={item?.remindDays} />
        <div>
          <label htmlFor="note" className="label">Note (optional)</label>
          <input id="note" name="note" defaultValue={item?.note ?? ""} maxLength={255} placeholder="e.g. Bedroom unit, serviced by …" className="input" />
        </div>

        <FormError message={state?.error ?? result?.error} />

        <div className="flex flex-wrap items-center gap-2">
          {item && (
            <>
              <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteMaintenance(item.id))} />
              <button type="button" disabled={busy} onClick={() => run(() => setMaintenanceActive(item.id, !item.active))} className="btn-ghost h-10 px-3 text-[14px]">
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
          <p className="mb-2 text-[13px] font-medium">History</p>
          <ul className="space-y-1.5 text-[13px] text-muted">
            {item.logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="truncate">{formatDay(l.doneDate)}{l.note ? ` · ${l.note}` : ""}</span>
                {l.cost !== null && <span className="shrink-0 tabular-nums">{formatRM(l.cost)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DoneForm({
  item,
  accounts,
  categories,
  onDone,
}: {
  item: MaintenanceRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [state, action, saving] = useActionState(markMaintenanceDone, undefined);
  const [cost, setCost] = useState("");
  const [record, setRecord] = useState(true);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const expenseCats = categories.filter((c) => c.kind === "EXPENSE" && !c.archived);
  const usableAccounts = accounts.filter((a) => !a.archived);
  const every = intervalLabel(item.intervalValue, item.intervalUnit);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <input type="hidden" name="itemId" value={item.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="doneDate" className="label">Done on</label>
          <input id="doneDate" name="doneDate" type="date" defaultValue={todayISO()} className="input" required />
        </div>
        <div>
          <label htmlFor="cost" className="label">Cost (optional)</label>
          <MoneyInput id="cost" name="cost" value={cost} onValueChange={setCost} className="input" />
        </div>
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
                <select id="categoryId" name="categoryId" defaultValue={expenseCats.find((c) => c.name === "Others")?.id ?? ""} className="input">
                  <option value="">No category</option>
                  {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label htmlFor="nextDueDate" className="label">Next due (optional)</label>
        <input id="nextDueDate" name="nextDueDate" type="date" className="input" />
        <p className="mt-1.5 text-[12px] text-muted">
          {every ? `Leave empty to set it automatically (${every.toLowerCase()}).` : "No repeat interval set, so pick the next date yourself if there is one."}
        </p>
      </div>
      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input id="note" name="note" maxLength={255} placeholder="e.g. Cleaned filters and coils" className="input" />
      </div>

      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Saving…" : "Mark as done"}
      </button>
    </form>
  );
}
