"use client";

import Link from "next/link";
import { CalendarDays, Check, CheckSquare, ChevronRight, Flag, HeartPulse, Plus, Receipt } from "lucide-react";
import { useActionState, useCallback, useEffect, useOptimistic, useState, useTransition } from "react";
import { deleteEvent, deleteTask, saveEvent, saveTask, toggleTask } from "@/app/actions/planner";
import { formatDay, formatTime, todayISO } from "@/lib/dates";
import { REMIND_OPTIONS, type ActionResult, type EventRow, type PlannerItem, type TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfirmDelete, FormError, Modal } from "../Modal";

type Editing = { kind: "task"; task?: TaskRow; date?: string } | { kind: "event"; event?: EventRow; date?: string } | null;

// ---------- Shared editor modal ----------

export function usePlannerEditor() {
  const [editing, setEditing] = useState<Editing>(null);
  const close = useCallback(() => setEditing(null), []);
  const modal = (
    <Modal
      open={editing !== null}
      onClose={close}
      title={
        editing?.kind === "task" ? (editing.task ? "Edit task" : "New task") :
        editing?.kind === "event" ? (editing.event ? "Edit event" : "New event") : ""
      }
    >
      {editing?.kind === "task" && <TaskForm task={editing.task} defaultDate={editing.date} onDone={close} />}
      {editing?.kind === "event" && <EventForm event={editing.event} defaultDate={editing.date} onDone={close} />}
    </Modal>
  );
  return { setEditing, modal };
}

export function AddButtons({ date, compact }: { date?: string; compact?: boolean }) {
  const { setEditing, modal } = usePlannerEditor();
  return (
    <>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing({ kind: "event", date })} className={cn("btn border border-line hover:bg-subtle", compact ? "h-9 px-3 text-[13px]" : "h-10")}>
          <CalendarDays className="size-4" strokeWidth={1.75} /> Event
        </button>
        <button type="button" onClick={() => setEditing({ kind: "task", date })} className={cn("btn-primary", compact ? "h-9 px-3 text-[13px]" : "h-10")}>
          <Plus className="size-4" strokeWidth={2} /> Task
        </button>
      </div>
      {modal}
    </>
  );
}

// ---------- Task checkbox (updates instantly, saves in the background) ----------

export function TaskCheck({ task, size = "md" }: { task: TaskRow; size?: "md" | "sm" }) {
  const [optimistic, setOptimistic] = useOptimistic(task.done);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={optimistic ? "Mark as not done" : "Mark as done"}
      onClick={(e) => {
        e.stopPropagation();
        start(async () => {
          setOptimistic(!optimistic);
          await toggleTask(task.id, !optimistic);
        });
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border transition",
        size === "sm" ? "size-[18px]" : "size-5",
        optimistic ? "border-accent bg-accent text-accent-ink" : "border-muted/50 hover:border-ink",
      )}
    >
      {optimistic && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

const PRIORITY_LABEL = { HIGH: "High", NORMAL: "Normal", LOW: "Low" } as const;

// ---------- Item list (agenda / day view) ----------

export function ItemList({ items, empty, showDate = false }: { items: PlannerItem[]; empty?: string; showDate?: boolean }) {
  const { setEditing, modal } = usePlannerEditor();

  if (!items.length) return empty ? <p className="px-5 py-4 text-[13px] text-muted">{empty}</p> : null;

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((it) => {
          const timeLabel = it.kind === "task" && it.time ? formatTime(it.time) : null;
          const sub = [showDate ? formatDay(it.date) : null, timeLabel, it.sub].filter(Boolean).join(" · ");
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className={cn("flex items-center gap-1.5 truncate text-[14px] font-medium", it.task?.done && "text-muted line-through")}>
                  {it.task?.priority === "HIGH" && !it.task.done && <Flag className="size-3.5 shrink-0 text-negative" strokeWidth={2} />}
                  <span className="truncate">{it.title}</span>
                </span>
                {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
              </span>
              {it.href && <ChevronRight className="size-4 shrink-0 text-muted" />}
            </>
          );
          return (
            <li key={it.key} className="flex items-center gap-3 px-5 py-2.5">
              {it.kind === "task" && it.task ? (
                <TaskCheck task={it.task} />
              ) : (
                <KindIcon kind={it.kind} />
              )}
              {it.href ? (
                <Link href={it.href} className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80">{body}</Link>
              ) : (
                <button
                  type="button"
                  onClick={() => (it.task ? setEditing({ kind: "task", task: it.task }) : it.event && setEditing({ kind: "event", event: it.event }))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {modal}
    </>
  );
}

export function KindIcon({ kind }: { kind: PlannerItem["kind"] }) {
  const Icon = kind === "event" ? CalendarDays : kind === "health" ? HeartPulse : kind === "bill" ? Receipt : CheckSquare;
  return (
    <span className={cn("grid size-5 shrink-0 place-items-center", kind === "health" ? "text-negative/80" : "text-muted")}>
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

// ---------- Forms ----------

export function TaskForm({ task, defaultDate, onDone }: { task?: TaskRow; defaultDate?: string; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveTask, undefined);
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {task && <input type="hidden" name="id" value={task.id} />}
      <div>
        <label htmlFor="title" className="label">Task</label>
        <input id="title" name="title" autoComplete="off" defaultValue={task?.title ?? ""} maxLength={160} placeholder="e.g. Submit assignment" className="input" required autoFocus={!task} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dueDate" className="label">Due date</label>
          <input id="dueDate" name="dueDate" type="date" defaultValue={task ? task.dueDate ?? "" : defaultDate ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="dueTime" className="label">Time (optional)</label>
          <input id="dueTime" name="dueTime" type="time" defaultValue={task?.dueTime ?? ""} className="input" />
        </div>
      </div>
      <RemindField value={task?.remindMinutes ?? null} hint="With a date but no time, the reminder comes in the morning." />
      <div>
        <span className="label">Priority</span>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-subtle p-1">
          {(["LOW", "NORMAL", "HIGH"] as const).map((p) => (
            <label key={p} className="cursor-pointer">
              <input type="radio" name="priority" value={p} defaultChecked={(task?.priority ?? "NORMAL") === p} className="peer sr-only" />
              <span className="block h-9 rounded-lg text-center text-[14px] leading-9 text-muted transition peer-checked:bg-surface peer-checked:font-medium peer-checked:text-ink peer-checked:shadow-[var(--shadow)]">
                {PRIORITY_LABEL[p]}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <textarea id="note" name="note" rows={2} maxLength={1000} defaultValue={task?.note ?? ""} className="input h-auto py-2.5" />
      </div>
      <FormError message={state?.error ?? result?.error} />
      <div className="flex items-center gap-2">
        {task && (
          <ConfirmDelete
            pending={busy}
            onConfirm={() =>
              start(async () => {
                const r = await deleteTask(task.id);
                if (r?.ok) onDone();
                else setResult(r);
              })
            }
          />
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : task ? "Save changes" : "Add task"}
        </button>
      </div>
    </form>
  );
}

export function EventForm({ event, defaultDate, onDone }: { event?: EventRow; defaultDate?: string; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveEvent, undefined);
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {event && <input type="hidden" name="id" value={event.id} />}
      <div>
        <label htmlFor="title" className="label">Event</label>
        <input id="title" name="title" autoComplete="off" defaultValue={event?.title ?? ""} maxLength={160} placeholder="e.g. Group meeting" className="input" required autoFocus={!event} />
      </div>
      <div>
        <label htmlFor="date" className="label">Date</label>
        <input id="date" name="date" type="date" defaultValue={event?.date ?? defaultDate ?? todayISO()} className="input" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startTime" className="label">Starts</label>
          <input id="startTime" name="startTime" type="time" defaultValue={event?.startTime ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="endTime" className="label">Ends</label>
          <input id="endTime" name="endTime" type="time" defaultValue={event?.endTime ?? ""} className="input" />
        </div>
      </div>
      <p className="-mt-2 text-[12px] text-muted">Leave both times empty for an all-day event.</p>
      <RemindField value={event?.remindMinutes ?? null} hint="All-day events are reminded in the morning." />
      <div>
        <label htmlFor="location" className="label">Location (optional)</label>
        <input id="location" name="location" autoComplete="off" defaultValue={event?.location ?? ""} maxLength={160} className="input" />
      </div>
      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <textarea id="note" name="note" rows={2} maxLength={1000} defaultValue={event?.note ?? ""} className="input h-auto py-2.5" />
      </div>
      <FormError message={state?.error ?? result?.error} />
      <div className="flex items-center gap-2">
        {event && (
          <ConfirmDelete
            pending={busy}
            onConfirm={() =>
              start(async () => {
                const r = await deleteEvent(event.id);
                if (r?.ok) onDone();
                else setResult(r);
              })
            }
          />
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : event ? "Save changes" : "Add event"}
        </button>
      </div>
    </form>
  );
}

function RemindField({ value, hint }: { value: number | null; hint: string }) {
  return (
    <div>
      <label htmlFor="remindMinutes" className="label">Remind me (notification)</label>
      <select id="remindMinutes" name="remindMinutes" defaultValue={value === null ? "" : String(value)} className="input">
        <option value="">No reminder</option>
        {REMIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <p className="mt-1.5 text-[12px] text-muted">{hint} Turn on notifications in Settings → Notifications.</p>
    </div>
  );
}
