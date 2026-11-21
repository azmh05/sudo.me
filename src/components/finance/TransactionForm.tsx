"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteTransaction, saveTransaction } from "@/app/actions/finance";
import { todayISO } from "@/lib/dates";
import { senToInput } from "@/lib/money";
import type { AccountOption, CategoryOption, TxKind, TxRow } from "@/lib/types";
import { TX_TYPE_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfirmDelete, FormError } from "../Modal";
import { MoneyInput } from "../MoneyInput";

export function TransactionForm({
  initial,
  accounts,
  categories,
  onDone,
}: {
  initial?: TxRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [type, setType] = useState<TxKind>(initial?.type ?? "EXPENSE");
  const [state, action, saving] = useActionState(saveTransaction, undefined);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  // Archived items are hidden, unless this record already uses them.
  const usableAccounts = accounts.filter(
    (a) => !a.archived || a.id === initial?.accountId || a.id === initial?.toAccountId,
  );
  const usableCategories = categories.filter(
    (c) => c.kind === type && (!c.archived || c.id === initial?.categoryId),
  );

  const fromLabel = type === "INCOME" ? "Into account" : "From account";

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-subtle p-1">
        {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "h-9 rounded-lg text-[14px] transition",
              type === t ? "bg-surface font-medium text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink",
            )}
          >
            {TX_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="amount" className="label">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[15px] text-muted">RM</span>
          <MoneyInput
            id="amount"
            name="amount"
            defaultValue={initial ? senToInput(initial.amount) : ""}
            className="input h-14 pl-12 text-[22px] font-semibold tabular-nums"
            autoFocus={!initial}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input id="date" name="date" type="date" defaultValue={initial?.date ?? todayISO()} className="input" required />
        </div>
        <div>
          <label htmlFor="accountId" className="label">{fromLabel}</label>
          <select id="accountId" name="accountId" defaultValue={initial?.accountId ?? usableAccounts[0]?.id} className="input" required>
            {usableAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {type === "TRANSFER" ? (
        <div>
          <label htmlFor="toAccountId" className="label">To account</label>
          <select
            id="toAccountId"
            name="toAccountId"
            defaultValue={initial?.toAccountId ?? usableAccounts[1]?.id}
            className="input"
            required
          >
            {usableAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-muted">
            Moving money between your own accounts, e.g. topping up Touch &apos;n Go from Maybank. It doesn&apos;t count as income or spending.
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="categoryId" className="label">Category</label>
          <select
            key={type}
            id="categoryId"
            name="categoryId"
            defaultValue={initial?.type === type ? initial.categoryId ?? "" : ""}
            className="input"
          >
            <option value="">No category</option>
            {usableCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input
          id="note"
          name="note"
          maxLength={255}
          defaultValue={initial?.note ?? ""}
          placeholder={type === "EXPENSE" ? "e.g. Lunch at café" : type === "INCOME" ? "e.g. November allowance" : "e.g. Top up"}
          className="input"
        />
      </div>

      <FormError message={state?.error} />

      <div className="flex items-center gap-2 pt-1">
        {initial && (
          <ConfirmDelete
            pending={deleting}
            onConfirm={() =>
              startDelete(async () => {
                await deleteTransaction(initial.id);
                onDone();
              })
            }
          />
        )}
        <button type="submit" disabled={saving || deleting} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : initial ? "Save changes" : "Add record"}
        </button>
      </div>
    </form>
  );
}
