"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { useCallback, useState } from "react";
import { formatDay } from "@/lib/dates";
import type { AccountOption, CategoryOption, TxRow } from "@/lib/types";
import { cn, formatRM, formatSignedRM } from "@/lib/utils";
import { Modal } from "../Modal";
import { TransactionForm } from "./TransactionForm";

const ICON = { INCOME: ArrowDownLeft, EXPENSE: ArrowUpRight, TRANSFER: ArrowLeftRight };

export function TxLine({ row, onClick }: { row: TxRow; onClick?: () => void }) {
  const Icon = ICON[row.type];
  const title =
    row.type === "TRANSFER" ? "Transfer" : row.categoryName ?? row.note ?? (row.type === "INCOME" ? "Income" : "Expense");
  const sub =
    row.type === "TRANSFER"
      ? `${row.accountName} → ${row.toAccountName}${row.note ? ` · ${row.note}` : ""}`
      : `${row.accountName}${row.note && row.categoryName ? ` · ${row.note}` : ""}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors enabled:hover:bg-subtle/60"
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          row.type === "INCOME" ? "bg-positive/10 text-positive" : "bg-subtle text-muted",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{title}</span>
        <span className="block truncate text-[13px] text-muted">{sub}</span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[14px] font-medium tabular-nums",
          row.type === "INCOME" && "text-positive",
          row.type === "TRANSFER" && "text-muted",
        )}
      >
        {row.type === "INCOME"
          ? formatSignedRM(row.amount, "+")
          : row.type === "EXPENSE"
            ? formatSignedRM(row.amount, "-")
            : formatRM(row.amount)}
      </span>
    </button>
  );
}

// Records grouped by day. Tap one to edit or delete it.
export function TransactionList({
  rows,
  accounts,
  categories,
}: {
  rows: TxRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<TxRow | null>(null);
  const close = useCallback(() => setEditing(null), []);

  const groups: { date: string; rows: TxRow[]; net: number }[] = [];
  for (const r of rows) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== r.date) groups.push((g = { date: r.date, rows: [], net: 0 }));
    g.rows.push(r);
    if (r.type === "INCOME") g.net += r.amount;
    if (r.type === "EXPENSE") g.net -= r.amount;
  }

  return (
    <>
      <div className="divide-y divide-line">
        {groups.map((g) => (
          <section key={g.date}>
            <div className="flex items-center justify-between bg-subtle/50 px-5 py-2 text-[12px] font-medium text-muted">
              <span>{formatDay(g.date)}</span>
              {g.net !== 0 && <span className="tabular-nums">{formatSignedRM(g.net, g.net > 0 ? "+" : "-")}</span>}
            </div>
            {g.rows.map((r) => (
              <TxLine key={r.id} row={r} onClick={() => setEditing(r)} />
            ))}
          </section>
        ))}
      </div>

      <Modal open={editing !== null} onClose={close} title="Edit record">
        {editing && (
          <TransactionForm initial={editing} accounts={accounts} categories={categories} onDone={close} />
        )}
      </Modal>
    </>
  );
}
