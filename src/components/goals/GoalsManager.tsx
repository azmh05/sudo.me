"use client";

import { Plus, ShieldCheck, ShoppingBag, Target, X } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { addContribution, deleteContribution, deleteGoal, saveGoal, setGoalArchived } from "@/app/actions/goals";
import { formatDay, todayISO } from "@/lib/dates";
import { monthlyNeeded } from "@/lib/goal-math";
import { senToInput } from "@/lib/money";
import type { ActionResult, GoalRow } from "@/lib/types";
import { cn, formatRM, formatSignedRM, percent } from "@/lib/utils";
import { ConfirmDelete, FormError, Modal } from "../Modal";
import { EmptyState, Progress } from "../ui";
import { MoneyInput } from "../MoneyInput";

const TYPE_INFO = {
  SAVINGS: { label: "Savings", icon: Target },
  EMERGENCY: { label: "Emergency fund", icon: ShieldCheck },
  PURCHASE: { label: "Future purchase", icon: ShoppingBag },
} as const;

type Open =
  | { mode: "new" }
  | { mode: "edit"; goal: GoalRow }
  | { mode: "add" | "withdraw"; goal: GoalRow }
  | null;

const monthYear = (iso: string) =>
  new Intl.DateTimeFormat("en-MY", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function GoalsManager({ goals, avgSpending }: { goals: GoalRow[]; avgSpending: number }) {
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);
  const totalSaved = active.reduce((s, g) => s + g.saved, 0);
  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0);
  const perMonth = active.reduce((s, g) => s + (monthlyNeeded(g)?.perMonth ?? 0), 0);

  return (
    <>
      {active.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-[13px] text-muted">Saved across goals</p>
            <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums sm:text-[24px]">{formatRM(totalSaved)}</p>
            <p className="mt-1 text-[12px] text-muted">of {formatRM(totalTarget)} · {percent(totalSaved, totalTarget)}%</p>
          </div>
          <div className="card p-5">
            <p className="text-[13px] text-muted">To stay on track</p>
            <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums sm:text-[24px]">{formatRM(perMonth)}</p>
            <p className="mt-1 text-[12px] text-muted">per month, for goals with a date</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((g) => (
          <GoalCard key={g.id} goal={g} onEdit={() => setOpen({ mode: "edit", goal: g })} onAdd={() => setOpen({ mode: "add", goal: g })} />
        ))}
        <button
          type="button"
          onClick={() => setOpen({ mode: "new" })}
          className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[14px] text-muted transition hover:border-muted hover:text-ink"
        >
          <Plus className="size-5" strokeWidth={1.75} />
          New goal
        </button>
      </div>

      {active.length === 0 && (
        <div className="card mt-4">
          <EmptyState icon={Target} title="No goals yet" text="Set a target — an emergency fund, a new laptop, a trip — and track your progress towards it." />
        </div>
      )}

      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">Completed & archived ({archived.length})</summary>
          <div className="mt-3 grid grid-cols-1 gap-4 opacity-70 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((g) => <GoalCard key={g.id} goal={g} onEdit={() => setOpen({ mode: "edit", goal: g })} />)}
          </div>
        </details>
      )}

      <Modal
        open={open !== null}
        onClose={close}
        title={
          open?.mode === "new" ? "New goal" :
          open?.mode === "edit" ? "Edit goal" :
          open ? open.goal.name : ""
        }
      >
        {open?.mode === "add" || open?.mode === "withdraw" ? (
          <ContributionForm goal={open.goal} initialDirection={open.mode} onDone={close} />
        ) : open ? (
          <GoalForm goal={open.mode === "edit" ? open.goal : undefined} avgSpending={avgSpending} onDone={close} />
        ) : null}
      </Modal>
    </>
  );
}

function GoalCard({ goal: g, onEdit, onAdd }: { goal: GoalRow; onEdit: () => void; onAdd?: () => void }) {
  const { label, icon: Icon } = TYPE_INFO[g.type];
  const pct = percent(g.saved, g.targetAmount);
  const reached = g.saved >= g.targetAmount;
  const plan = monthlyNeeded(g);

  return (
    <div className="card flex min-h-48 flex-col p-5">
      <button type="button" onClick={onEdit} className="flex items-start gap-3 text-left">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-subtle">
          <Icon className="size-[18px] text-muted" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium">{g.name}</span>
          <span className="block text-[12px] text-muted">
            {label}{g.targetDate ? ` · by ${monthYear(g.targetDate)}` : ""}
          </span>
        </span>
      </button>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[20px] font-semibold tracking-tight tabular-nums">{formatRM(g.saved)}</span>
          <span className="text-[13px] tabular-nums text-muted">of {formatRM(g.targetAmount)}</span>
        </div>
        <Progress value={pct} className={cn("mt-2", reached && "[&>div]:bg-positive")} />
        <p className={cn("mt-2 text-[12px]", reached ? "text-positive" : plan?.late ? "text-negative" : "text-muted")}>
          {reached
            ? "Goal reached"
            : plan?.late
              ? `Target date passed · ${formatRM(g.targetAmount - g.saved)} to go`
              : plan
                ? `${pct}% · save ${formatRM(plan.perMonth)}/month for ${plan.months} month${plan.months === 1 ? "" : "s"}`
                : `${pct}% · ${formatRM(g.targetAmount - g.saved)} to go`}
        </p>
      </div>

      {onAdd && (
        <button type="button" onClick={onAdd} className="btn mt-auto h-9 w-full border border-line text-[13px] hover:bg-subtle">
          <Plus className="size-4" /> Add money
        </button>
      )}
    </div>
  );
}

function GoalForm({ goal, avgSpending, onDone }: { goal?: GoalRow; avgSpending: number; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveGoal, undefined);
  const [type, setType] = useState<GoalRow["type"]>(goal?.type ?? "SAVINGS");
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const run = (fn: () => Promise<ActionResult>, close = true) =>
    start(async () => {
      const r = await fn();
      if (r?.ok) {
        if (close) onDone();
      } else setResult(r);
    });

  return (
    <div className="space-y-5">
      <form action={action} autoComplete="off" className="space-y-4">
        {goal && <input type="hidden" name="id" value={goal.id} />}
        <input type="hidden" name="type" value={type} />

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-subtle p-1">
          {(Object.keys(TYPE_INFO) as GoalRow["type"][]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "h-9 rounded-lg text-[13px] transition",
                type === t ? "bg-surface font-medium text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink",
              )}
            >
              {TYPE_INFO[t].label.replace("Future ", "")}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="name" className="label">Goal name</label>
          <input
            id="name"
            name="name"
            defaultValue={goal?.name ?? (type === "EMERGENCY" ? "Emergency fund" : "")}
            key={goal ? "edit" : type}
            maxLength={80}
            placeholder={type === "PURCHASE" ? "e.g. New laptop" : "e.g. Trip to Japan"}
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="targetAmount" className="label">Target (RM)</label>
            <MoneyInput id="targetAmount" name="targetAmount" defaultValue={goal ? senToInput(goal.targetAmount) : ""} className="input" required />
          </div>
          <div>
            <label htmlFor="targetDate" className="label">Target date (optional)</label>
            <input id="targetDate" name="targetDate" type="date" defaultValue={goal?.targetDate ?? ""} min={goal ? undefined : todayISO()} className="input" />
          </div>
        </div>

        {type === "EMERGENCY" && (
          <p className="rounded-xl bg-subtle px-3.5 py-2.5 text-[13px] text-muted">
            {avgSpending > 0 ? (
              <>A common rule is 3–6 months of spending. Yours averages {formatRM(avgSpending)}/month, so about{" "}
                <span className="font-medium text-ink">{formatRM(avgSpending * 3)}–{formatRM(avgSpending * 6)}</span>.</>
            ) : (
              "A common rule is 3–6 months of your usual spending. Once you've recorded a full month of expenses, a suggested amount appears here."
            )}
          </p>
        )}

        {!goal && (
          <div>
            <label htmlFor="startingAmount" className="label">Already saved (optional)</label>
            <MoneyInput id="startingAmount" name="startingAmount" className="input" />
          </div>
        )}

        <div>
          <label htmlFor="note" className="label">Note (optional)</label>
          <input id="note" name="note" defaultValue={goal?.note ?? ""} maxLength={255} placeholder="e.g. Keeping it in Maybank savings" className="input" />
        </div>

        <FormError message={state?.error ?? result?.error} />

        <div className="flex flex-wrap items-center gap-2">
          {goal && (
            <>
              <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteGoal(goal.id))} />
              <button type="button" disabled={busy} onClick={() => run(() => setGoalArchived(goal.id, !goal.archived))} className="btn-ghost h-10 px-3 text-[14px]">
                {goal.archived ? "Restore" : "Archive"}
              </button>
            </>
          )}
          <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
            {saving ? "Saving…" : goal ? "Save changes" : "Create goal"}
          </button>
        </div>
      </form>

      {goal && goal.contributions.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-[13px] font-medium">History</p>
          <ul className="space-y-1 text-[13px]">
            {goal.contributions.map((c) => (
              <li key={c.id} className="group flex items-center justify-between gap-3 text-muted">
                <span className="truncate">{formatDay(c.date)}{c.note ? ` · ${c.note}` : ""}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={cn("tabular-nums", c.amount > 0 ? "text-positive" : "text-ink")}>
                    {formatSignedRM(c.amount, c.amount > 0 ? "+" : "-")}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => deleteContribution(c.id), false)}
                    aria-label="Remove this entry"
                    className="rounded p-0.5 text-muted opacity-60 hover:bg-subtle hover:text-ink hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ContributionForm({ goal, initialDirection, onDone }: { goal: GoalRow; initialDirection: "add" | "withdraw"; onDone: () => void }) {
  const [state, action, saving] = useActionState(addContribution, undefined);
  const [direction, setDirection] = useState(initialDirection);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const plan = monthlyNeeded(goal);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <input type="hidden" name="goalId" value={goal.id} />
      <input type="hidden" name="direction" value={direction} />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-subtle p-1">
        {(["add", "withdraw"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={cn(
              "h-9 rounded-lg text-[14px] transition",
              direction === d ? "bg-surface font-medium text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink",
            )}
          >
            {d === "add" ? "Add money" : "Take out"}
          </button>
        ))}
      </div>

      <p className="text-[13px] text-muted">
        Saved {formatRM(goal.saved)} of {formatRM(goal.targetAmount)}
        {plan && !plan.late ? ` · suggested ${formatRM(plan.perMonth)} this month` : ""}
      </p>

      <div>
        <label htmlFor="amount" className="label">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[15px] text-muted">RM</span>
          <MoneyInput
            id="amount"
            name="amount"
            defaultValue={direction === "add" && plan && !plan.late ? senToInput(plan.perMonth) : ""}
            key={direction}
            placeholder="0.00"
            className="input h-14 pl-12 text-[22px] font-semibold tabular-nums"
            autoFocus
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input id="date" name="date" type="date" defaultValue={todayISO()} className="input" required />
        </div>
        <div>
          <label htmlFor="note" className="label">Note (optional)</label>
          <input id="note" name="note" maxLength={255} className="input" />
        </div>
      </div>

      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Saving…" : direction === "add" ? "Add to goal" : "Take out of goal"}
      </button>
      <p className="text-center text-[12px] text-muted">
        Goals track money you&apos;ve set aside. To actually move it, record a transfer in Finance (e.g. Maybank → savings account).
      </p>
    </form>
  );
}
