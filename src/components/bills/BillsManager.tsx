"use client";

import { Check, Plus, Receipt } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { deleteBill, payBill, saveBill, setBillActive, undoLastPayment } from "@/app/actions/bills";
import { formatDay, todayISO } from "@/lib/dates";
import { senToInput } from "@/lib/money";
import { FREQ_LABEL, type BillFreq } from "@/lib/schedule";
import type { AccountOption, ActionResult, BillRow, CategoryOption } from "@/lib/types";
import { cn, formatRM } from "@/lib/utils";
import { DueBadge } from "../DueBadge";
import { ConfirmDelete, FormError, Modal } from "../Modal";
import { EmptyState } from "../ui";
import { MoneyInput } from "../MoneyInput";
import { RemindSelect } from "../RemindSelect";

type Open = { mode: "new" } | { mode: "edit"; bill: BillRow } | { mode: "pay"; bill: BillRow } | null;

// Rough monthly cost of a bill, for the summary at the top.
const PER_MONTH: Record<BillFreq, number> = { WEEKLY: 52 / 12, MONTHLY: 1, QUARTERLY: 1 / 3, YEARLY: 1 / 12 };

export function BillsManager({
  bills,
  accounts,
  categories,
}: {
  bills: BillRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const active = bills.filter((b) => b.active);
  const paused = bills.filter((b) => !b.active);
  const monthly = active.reduce((s, b) => s + Math.round(b.amount * PER_MONTH[b.frequency]), 0);
  const dueSoon = active.filter((b) => b.nextDueDate <= addDays(7));

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-[13px] text-muted">Bills per month</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums sm:text-[24px]">{formatRM(monthly)}</p>
          <p className="mt-1 text-[12px] text-muted">{active.length} active bill{active.length === 1 ? "" : "s"}</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Due in the next 7 days</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums sm:text-[24px]">
            {formatRM(dueSoon.reduce((s, b) => s + b.amount, 0))}
          </p>
          <p className="mt-1 text-[12px] text-muted">{dueSoon.length} bill{dueSoon.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-[15px] font-medium">Your bills</h2>
          <button type="button" onClick={() => setOpen({ mode: "new" })} className="btn-primary h-9 px-3 text-[14px]">
            <Plus className="size-4" /> Add bill
          </button>
        </div>
        {active.length === 0 ? (
          <EmptyState icon={Receipt} title="No bills yet" text="Add rent, phone, internet or anything you pay regularly." />
        ) : (
          <ul className="divide-y divide-line">
            {active.map((b) => (
              <BillLine key={b.id} bill={b} onEdit={() => setOpen({ mode: "edit", bill: b })} onPay={() => setOpen({ mode: "pay", bill: b })} />
            ))}
          </ul>
        )}
      </div>

      {paused.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">Paused bills ({paused.length})</summary>
          <ul className="card mt-3 divide-y divide-line opacity-70">
            {paused.map((b) => (
              <BillLine key={b.id} bill={b} onEdit={() => setOpen({ mode: "edit", bill: b })} />
            ))}
          </ul>
        </details>
      )}

      <Modal
        open={open !== null}
        onClose={close}
        title={open?.mode === "new" ? "New bill" : open?.mode === "pay" ? `Pay ${open.bill.name}` : "Edit bill"}
      >
        {open?.mode === "pay" ? (
          <PayForm bill={open.bill} accounts={accounts} onDone={close} />
        ) : open ? (
          <BillForm bill={open.mode === "edit" ? open.bill : undefined} accounts={accounts} categories={categories} onDone={close} />
        ) : null}
      </Modal>
    </>
  );
}

function addDays(n: number) {
  const d = new Date(`${todayISO()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function BillLine({ bill: b, onEdit, onPay }: { bill: BillRow; onEdit: () => void; onPay?: () => void }) {
  const last = b.payments[0];
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[15px] font-medium">{b.name}</span>
          {b.active && <DueBadge date={b.nextDueDate} />}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {formatRM(b.amount)} · {FREQ_LABEL[b.frequency]} · next {formatDay(b.nextDueDate)}
          {last ? ` · last paid ${formatDay(last.paidDate)}` : ""}
        </p>
      </button>
      {onPay && (
        <button type="button" onClick={onPay} className="btn h-9 shrink-0 border border-line px-3 text-[13px] hover:bg-subtle">
          <Check className="size-4" strokeWidth={2} /> Mark paid
        </button>
      )}
    </li>
  );
}

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

function BillForm({
  bill,
  accounts,
  categories,
  onDone,
}: {
  bill?: BillRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [state, action, saving] = useActionState(saveBill, undefined);
  const { result, busy, run } = useRun(onDone);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const expenseCats = categories.filter((c) => c.kind === "EXPENSE" && (!c.archived || c.id === bill?.categoryId));
  const usableAccounts = accounts.filter((a) => !a.archived || a.id === bill?.accountId);
  const defaultCat = bill?.categoryId ?? expenseCats.find((c) => c.name === "Bills & Utilities")?.id ?? "";

  return (
    <div className="space-y-5">
      <form action={action} autoComplete="off" className="space-y-4">
        {bill && <input type="hidden" name="id" value={bill.id} />}
        <div>
          <label htmlFor="name" className="label">Bill name</label>
          <input id="name" name="name" autoComplete="off" defaultValue={bill?.name} maxLength={80} placeholder="e.g. Rent, Phone, Internet" className="input" required autoFocus={!bill} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="label">Usual amount (RM)</label>
            <MoneyInput id="amount" name="amount" defaultValue={bill ? senToInput(bill.amount) : ""} className="input" required />
          </div>
          <div>
            <label htmlFor="frequency" className="label">Repeats</label>
            <select id="frequency" name="frequency" defaultValue={bill?.frequency ?? "MONTHLY"} className="input">
              {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nextDueDate" className="label">Next due date</label>
            <input id="nextDueDate" name="nextDueDate" type="date" defaultValue={bill?.nextDueDate ?? todayISO()} className="input" required />
          </div>
          <RemindSelect value={bill?.remindDays} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="accountId" className="label">Usually paid from</label>
            <select id="accountId" name="accountId" defaultValue={bill?.accountId ?? usableAccounts[0]?.id ?? ""} className="input">
              <option value="">Not set</option>
              {usableAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="categoryId" className="label">Spending category</label>
            <select id="categoryId" name="categoryId" defaultValue={defaultCat} className="input">
              <option value="">No category</option>
              {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="note" className="label">Note (optional)</label>
          <input id="note" name="note" defaultValue={bill?.note ?? ""} maxLength={255} placeholder="e.g. Account no. ends 1234" className="input" />
        </div>

        <FormError message={state?.error ?? result?.error} />

        <div className="flex flex-wrap items-center gap-2">
          {bill && (
            <>
              <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteBill(bill.id))} />
              <button type="button" disabled={busy} onClick={() => run(() => setBillActive(bill.id, !bill.active))} className="btn-ghost h-10 px-3 text-[14px]">
                {bill.active ? "Pause" : "Resume"}
              </button>
            </>
          )}
          <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
            {saving ? "Saving…" : bill ? "Save changes" : "Add bill"}
          </button>
        </div>
      </form>

      {bill && bill.payments.length > 0 && (
        <div className="border-t border-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium">Payment history</p>
            <button type="button" disabled={busy} onClick={() => run(() => undoLastPayment(bill.id))} className="text-[13px] text-muted hover:text-ink">
              Undo last payment
            </button>
          </div>
          <ul className="space-y-1.5 text-[13px]">
            {bill.payments.map((p) => (
              <li key={p.id} className="flex justify-between text-muted">
                <span>Paid {formatDay(p.paidDate)}{p.recorded ? "" : " · not recorded as expense"}</span>
                <span className="tabular-nums">{formatRM(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PayForm({ bill, accounts, onDone }: { bill: BillRow; accounts: AccountOption[]; onDone: () => void }) {
  const [state, action, saving] = useActionState(payBill, undefined);
  const [record, setRecord] = useState(true);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const usableAccounts = accounts.filter((a) => !a.archived);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <input type="hidden" name="billId" value={bill.id} />
      <p className="rounded-xl bg-subtle px-3.5 py-2.5 text-[13px] text-muted">
        For the payment due <span className="font-medium text-ink">{formatDay(bill.nextDueDate)}</span>. The next due date moves forward automatically.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className="label">Amount paid (RM)</label>
          <MoneyInput id="amount" name="amount" defaultValue={senToInput(bill.amount)} className="input" required />
        </div>
        <div>
          <label htmlFor="paidDate" className="label">Paid on</label>
          <input id="paidDate" name="paidDate" type="date" defaultValue={todayISO()} className="input" required />
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input type="checkbox" name="record" checked={record} onChange={(e) => setRecord(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span className="text-[14px]">
          Add as an expense in Finance
          <span className="block text-[12px] text-muted">
            {bill.categoryName ? `Recorded under ${bill.categoryName}` : "Recorded without a category"} — updates your balance and budget.
          </span>
        </span>
      </label>

      {record && (
        <div>
          <label htmlFor="accountId" className="label">Paid from</label>
          <select id="accountId" name="accountId" defaultValue={bill.accountId ?? usableAccounts[0]?.id} className="input">
            {usableAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className={cn("btn-primary w-full")}>
        {saving ? "Saving…" : "Mark as paid"}
      </button>
    </form>
  );
}
