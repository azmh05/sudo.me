"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { saveJournal } from "@/app/actions/planner";
import { formatDay, formatLongDate, todayISO } from "@/lib/dates";
import { addInterval } from "@/lib/schedule";
import type { JournalRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FormError } from "../Modal";

export const MOODS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

export function MoodDots({ mood }: { mood: number | null }) {
  if (!mood) return null;
  return (
    <span className="flex items-center gap-0.5" title={MOODS[mood - 1]?.label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("size-1.5 rounded-full", i <= mood ? "bg-accent" : "bg-line")} />
      ))}
    </span>
  );
}

export function JournalEditor({ date, entry, list, encrypted }: { date: string; entry: JournalRow | null; list: JournalRow[]; encrypted: boolean }) {
  const [state, action, saving] = useActionState(saveJournal, undefined);
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [content, setContent] = useState(entry?.content ?? "");
  const [dirty, setDirty] = useState(false);
  const today = todayISO();
  const prev = addInterval(date, "DAY", -1);
  const next = addInterval(date, "DAY", 1);

  useEffect(() => {
    if (state?.ok) setDirty(false);
  }, [state]);

  const href = (d: string) => (d === today ? "/planner/journal" : `/planner/journal?date=${d}`);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <form action={action} autoComplete="off" className="card p-5 lg:col-span-2">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="mood" value={mood ?? ""} />

        <div className="mb-4 flex items-center justify-between gap-2">
          <Link href={href(prev)} className="btn-ghost h-9 px-2" aria-label="Previous day">
            <ChevronLeft className="size-[18px]" />
          </Link>
          <div className="text-center">
            <p className="text-[15px] font-medium">{date === today ? "Today" : formatLongDate(date)}</p>
            {date === today && <p className="text-[12px] text-muted">{formatLongDate(date)}</p>}
          </div>
          {next <= today ? (
            <Link href={href(next)} className="btn-ghost h-9 px-2" aria-label="Next day">
              <ChevronRight className="size-[18px]" />
            </Link>
          ) : (
            <span className="w-9" />
          )}
        </div>

        <p className="label">How was the day?</p>
        <div className="mb-4 grid grid-cols-5 gap-1 rounded-xl bg-subtle p-1">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMood(mood === m.value ? null : m.value);
                setDirty(true);
              }}
              className={cn(
                "h-9 rounded-lg text-[13px] transition",
                mood === m.value ? "bg-surface font-medium text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <textarea
          name="content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          rows={12}
          maxLength={50000}
          placeholder="What happened today? What are you grateful for? What's on your mind?"
          className="input h-auto min-h-64 py-3 text-[15px] leading-relaxed"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Lock className="size-3.5" /> {encrypted ? "Stored encrypted" : "Add ENCRYPTION_KEY to store entries encrypted"}
          </span>
          <span className="ml-auto text-[12px] text-muted">{saving ? "Saving…" : dirty ? "Unsaved changes" : state?.ok ? "Saved" : ""}</span>
          <button type="submit" disabled={saving} className="btn-primary h-10">Save</button>
        </div>
        <div className="mt-2"><FormError message={state?.error} /></div>
      </form>

      <aside className="card self-start overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 text-[15px] font-medium">Past entries</h2>
        {list.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">Your entries will be listed here.</p>
        ) : (
          <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
            {list.map((e) => (
              <li key={e.id}>
                <Link href={href(e.date)} className={cn("block px-5 py-3 transition-colors hover:bg-subtle/60", e.date === date && "bg-subtle")}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{formatDay(e.date)}</span>
                    <MoodDots mood={e.mood} />
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[12px] text-muted">{e.content || "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
