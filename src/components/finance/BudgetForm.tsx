"use client";

import { useActionState, useState } from "react";
import { saveBudgets } from "@/app/actions/finance";
import { parseAmount, senToInput } from "@/lib/money";
import type { CategoryWithBudget } from "@/lib/types";
import { cn, formatRM, percent } from "@/lib/utils";
import { FormError } from "../Modal";
import { Progress } from "../ui";
import { MoneyInput } from "../MoneyInput";

// One monthly limit per expense category. The same limits repeat every month.
export function BudgetForm({ rows, monthLabel }: { rows: CategoryWithBudget[]; monthLabel: string }) {
  const [state, action, saving] = useActionState(saveBudgets, undefined);
  const [draft, setDraft] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.monthlyBudget ? senToInput(r.monthlyBudget) : ""])),
  );

  const limitOf = (id: number) => parseAmount(draft[id] ?? "") ?? 0;
  const totalLimit = rows.reduce((s, r) => s + limitOf(r.id), 0);
  const totalUsed = rows.filter((r) => limitOf(r.id) > 0).reduce((s, r) => s + r.used, 0);
  const totalPct = percent(totalUsed, totalLimit);

  return (
    <form action={action} autoComplete="off">
      <div className="card mb-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[13px] text-muted">Monthly budget · {monthLabel} so far</p>
            <p className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums">
              {formatRM(totalUsed)} <span className="text-[16px] font-normal text-muted">of {formatRM(totalLimit)}</span>
            </p>
          </div>
          {totalLimit > 0 && (
            <p className={cn("text-[14px] tabular-nums", totalUsed > totalLimit ? "text-negative" : "text-muted")}>
              {totalUsed > totalLimit ? `${formatRM(totalUsed - totalLimit)} over` : `${formatRM(totalLimit - totalUsed)} left`}
            </p>
          )}
        </div>
        <Progress value={totalPct} className={cn("mt-4", totalPct > 100 && "[&>div]:bg-negative")} />
      </div>

      <div className="card divide-y divide-line">
        {rows.map((r) => {
          const limit = limitOf(r.id);
          const pct = percent(r.used, limit);
          return (
            <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-[1fr_200px_140px]">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{r.name}{r.archived ? <span className="text-muted"> (archived)</span> : null}</p>
                <p className="text-[12px] tabular-nums text-muted">Spent {formatRM(r.used)}</p>
              </div>
              <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                {limit > 0 ? (
                  <>
                    <Progress value={pct} className={pct > 100 ? "[&>div]:bg-negative" : ""} />
                    <p className={cn("mt-1 text-[12px] tabular-nums", pct > 100 ? "text-negative" : "text-muted")}>
                      {pct}% used
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] text-muted">No limit</p>
                )}
              </div>
              <div className="relative col-start-2 row-start-1 w-32 sm:col-start-auto sm:row-start-auto sm:w-auto">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-muted">RM</span>
                <MoneyInput
                  name={`budget_${r.id}`}
                  value={draft[r.id] ?? ""}
                  onValueChange={(v) => setDraft((d) => ({ ...d, [r.id]: v }))}
                  placeholder="—"
                  aria-label={`Monthly budget for ${r.name}`}
                  className="input h-10 pl-10 text-right text-[14px] tabular-nums"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-24 z-10 mt-4 flex items-center justify-end gap-3 lg:bottom-6">
        {state?.ok && !saving && <span className="text-[13px] text-positive">{state.message}</span>}
        <FormError message={state?.error} />
        <button type="submit" disabled={saving} className="btn-primary shadow-lg">
          {saving ? "Saving…" : "Save budget"}
        </button>
      </div>
      <p className="mt-3 text-[12px] text-muted">Leave a box empty for categories you don&apos;t want to limit.</p>
    </form>
  );
}
