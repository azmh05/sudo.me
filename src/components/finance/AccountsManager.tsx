"use client";

import { Banknote, CreditCard, Landmark, PiggyBank, Plus, Smartphone, Wallet } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { deleteAccount, saveAccount, setAccountArchived } from "@/app/actions/finance";
import { senToInput } from "@/lib/money";
import { ACCOUNT_TYPE_LABEL, type AccountKind, type AccountWithBalance, type ActionResult } from "@/lib/types";
import { cn, formatRM } from "@/lib/utils";
import { ConfirmDelete, FormError, Modal } from "../Modal";
import { MoneyInput } from "../MoneyInput";

const ICONS: Record<AccountKind, typeof Wallet> = {
  BANK: Landmark,
  EWALLET: Smartphone,
  CASH: Banknote,
  CARD: CreditCard,
  SAVINGS: PiggyBank,
  OTHER: Wallet,
};

export function AccountsManager({ accounts }: { accounts: AccountWithBalance[] }) {
  const [editing, setEditing] = useState<AccountWithBalance | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const total = active.reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[13px] text-muted">Total across {active.length} accounts</p>
          <p className="text-[28px] font-semibold tracking-tight tabular-nums">{formatRM(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {active.map((a) => (
          <AccountCard key={a.id} account={a} onEdit={() => setEditing(a)} />
        ))}
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[14px] text-muted transition hover:border-muted hover:text-ink"
        >
          <Plus className="size-5" strokeWidth={1.75} />
          Add account
        </button>
      </div>

      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">
            Archived accounts ({archived.length})
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-4 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((a) => (
              <AccountCard key={a.id} account={a} onEdit={() => setEditing(a)} />
            ))}
          </div>
        </details>
      )}

      <p className="mt-6 text-[13px] text-muted">
        Tip: set each account&apos;s <b className="font-medium text-ink">opening balance</b> to what it holds today. From then on, the balance updates by itself from your records.
      </p>

      <Modal open={editing !== null} onClose={close} title={editing === "new" ? "New account" : "Edit account"}>
        {editing && <AccountForm account={editing === "new" ? undefined : editing} onDone={close} />}
      </Modal>
    </>
  );
}

function AccountCard({ account: a, onEdit }: { account: AccountWithBalance; onEdit: () => void }) {
  const Icon = ICONS[a.type];
  return (
    <button type="button" onClick={onEdit} className="card card-hover flex min-h-36 flex-col p-5 text-left">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-subtle">
          <Icon className="size-[18px] text-muted" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{a.name}</p>
          <p className="text-[12px] text-muted">{ACCOUNT_TYPE_LABEL[a.type]}{a.archived ? " · Archived" : ""}</p>
        </div>
      </div>
      <p className={cn("mt-auto pt-4 text-[22px] font-semibold tracking-tight tabular-nums", a.balance < 0 && "text-negative")}>
        {formatRM(a.balance)}
      </p>
      {a.note && <p className="truncate text-[12px] text-muted">{a.note}</p>}
    </button>
  );
}

function AccountForm({ account, onDone }: { account?: AccountWithBalance; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveAccount, undefined);
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
    <form action={action} autoComplete="off" className="space-y-4">
      {account && <input type="hidden" name="id" value={account.id} />}
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" autoComplete="off" defaultValue={account?.name} maxLength={60} placeholder="e.g. Maybank Savings" className="input" required autoFocus={!account} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="type" className="label">Type</label>
          <select id="type" name="type" defaultValue={account?.type ?? "BANK"} className="input">
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="openingBalance" className="label">Opening balance (RM)</label>
          <MoneyInput
            id="openingBalance"
            name="openingBalance"
            allowNegative
            defaultValue={account ? senToInput(account.openingBalance) : ""}
            className="input pr-11"
          />
        </div>
      </div>
      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input id="note" name="note" defaultValue={account?.note ?? ""} maxLength={255} placeholder="e.g. Main account for allowance" className="input" />
      </div>

      {account && (
        <p className="rounded-xl bg-subtle px-3.5 py-2.5 text-[13px] text-muted">
          Current balance: <span className="font-medium text-ink tabular-nums">{formatRM(account.balance)}</span>
        </p>
      )}

      <FormError message={state?.error ?? result?.error} />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {account && (
          <>
            <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteAccount(account.id))} />
            <button type="button" disabled={busy} onClick={() => run(() => setAccountArchived(account.id, !account.archived))} className="btn-ghost h-10 px-3 text-[14px]">
              {account.archived ? "Restore" : "Archive"}
            </button>
          </>
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : account ? "Save changes" : "Add account"}
        </button>
      </div>
    </form>
  );
}
