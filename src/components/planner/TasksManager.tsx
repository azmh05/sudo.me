"use client";

import { CheckSquare, Flag } from "lucide-react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { clearCompletedTasks, saveTask } from "@/app/actions/planner";
import { addInterval, daysUntil } from "@/lib/schedule";
import { formatDay, formatTime, todayISO } from "@/lib/dates";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FormError } from "../Modal";
import { EmptyState } from "../ui";
import { TaskCheck, usePlannerEditor } from "./PlannerUI";

export function TasksManager({ tasks }: { tasks: TaskRow[] }) {
  const { setEditing, modal } = usePlannerEditor();
  const today = todayISO();
  const weekEnd = addInterval(today, "DAY", 7);
  const open = tasks.filter((t) => !t.done);

  const groups: { title: string; rows: TaskRow[]; tone?: string }[] = [
    { title: "Overdue", rows: open.filter((t) => t.dueDate && t.dueDate < today), tone: "text-negative" },
    { title: "Today", rows: open.filter((t) => t.dueDate === today) },
    { title: "Next 7 days", rows: open.filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= weekEnd) },
    { title: "Later", rows: open.filter((t) => t.dueDate && t.dueDate > weekEnd) },
    { title: "No date", rows: open.filter((t) => !t.dueDate) },
  ];
  const completed = tasks.filter((t) => t.done);

  return (
    <>
      <QuickAdd />

      {open.length === 0 && completed.length === 0 ? (
        <div className="card">
          <EmptyState icon={CheckSquare} title="No tasks yet" text="Type a task above and press Enter. Add a date if it has a deadline." />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.filter((g) => g.rows.length).map((g) => (
            <section key={g.title} className="card overflow-hidden">
              <h2 className={cn("border-b border-line px-5 py-2.5 text-[13px] font-medium", g.tone ?? "text-muted")}>
                {g.title} <span className="font-normal">({g.rows.length})</span>
              </h2>
              <ul className="divide-y divide-line">
                {g.rows.map((t) => <TaskLine key={t.id} task={t} onEdit={() => setEditing({ kind: "task", task: t })} />)}
              </ul>
            </section>
          ))}
          {open.length === 0 && (
            <p className="card px-5 py-6 text-center text-[14px] text-muted">All done. Nice work.</p>
          )}
          {completed.length > 0 && <CompletedSection tasks={completed} onEdit={(t) => setEditing({ kind: "task", task: t })} />}
        </div>
      )}
      {modal}
    </>
  );
}

function TaskLine({ task: t, onEdit }: { task: TaskRow; onEdit: () => void }) {
  const overdue = !t.done && t.dueDate !== null && daysUntil(t.dueDate) < 0;
  const meta = [t.dueDate ? formatDay(t.dueDate) : null, t.dueTime ? formatTime(t.dueTime) : null, t.note].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <TaskCheck task={t} />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={cn("flex items-center gap-1.5 text-[14px] font-medium", t.done && "text-muted line-through")}>
          {t.priority === "HIGH" && !t.done && <Flag className="size-3.5 shrink-0 text-negative" strokeWidth={2} />}
          <span className="truncate">{t.title}</span>
        </span>
        {meta && <span className={cn("block truncate text-[12px]", overdue ? "text-negative" : "text-muted")}>{meta}</span>}
      </button>
    </li>
  );
}

function CompletedSection({ tasks, onEdit }: { tasks: TaskRow[]; onEdit: (t: TaskRow) => void }) {
  const [pending, start] = useTransition();
  return (
    <details className="card overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-[13px] text-muted">
        <span>Completed in the last 14 days ({tasks.length})</span>
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            e.preventDefault();
            start(async () => void (await clearCompletedTasks()));
          }}
          className="text-[13px] hover:text-ink"
        >
          {pending ? "Clearing…" : "Clear all"}
        </button>
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {tasks.map((t) => <TaskLine key={t.id} task={t} onEdit={() => onEdit(t)} />)}
      </ul>
    </details>
  );
}

// One-line add: type and press Enter. Date and priority are optional.
function QuickAdd() {
  const [state, action, saving] = useActionState(saveTask, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} autoComplete="off" className="card mb-4 p-3">
      <div className="flex flex-wrap gap-2">
        <input ref={titleRef} name="title" autoComplete="off" maxLength={160} placeholder="Add a task and press Enter" aria-label="New task" className="input h-10 min-w-0 flex-1 basis-60 text-[14px]" required />
        <input name="dueDate" type="date" aria-label="Due date" className="input h-10 w-auto text-[14px]" />
        <select name="priority" defaultValue="NORMAL" aria-label="Priority" className="input h-10 w-auto text-[14px]">
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
        </select>
        <button type="submit" disabled={saving} className="btn-primary h-10">{saving ? "Adding…" : "Add"}</button>
      </div>
      {state?.error && <div className="mt-2"><FormError message={state.error} /></div>}
    </form>
  );
}
