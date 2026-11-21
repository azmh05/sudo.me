import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AddButtons, ItemList } from "@/components/planner/PlannerUI";
import { currentMonthKey, formatLongDate, isMonthKey, isoToDate, monthLabel, shiftMonth, todayISO } from "@/lib/dates";
import { getPlannerItems } from "@/lib/planner";
import { addInterval } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendar" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOT = { task: "bg-accent", event: "bg-[#5b7fa6]", health: "bg-negative", bill: "bg-warning" } as const;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const month = isMonthKey(sp.month) ? sp.month : currentMonthKey();
  const selected = sp.day && isoToDate(sp.day) && sp.day.startsWith(month) ? sp.day : today.startsWith(month) ? today : `${month}-01`;

  // Grid starts on the Monday on/before the 1st, 6 weeks long.
  const first = `${month}-01`;
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const gridStart = addInterval(first, "DAY", -weekday);
  const cells = Array.from({ length: 42 }, (_, i) => addInterval(gridStart, "DAY", i));
  const items = await getPlannerItems(gridStart, addInterval(gridStart, "DAY", 42));

  const href = (m: string, d?: string) => `/planner/calendar?month=${m}${d ? `&day=${d}` : ""}`;
  const navBtn = "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <section className="card p-3 sm:p-4 lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <Link href={href(shiftMonth(month, -1))} className={navBtn} aria-label="Previous month"><ChevronLeft className="size-[18px]" /></Link>
          <div className="text-center">
            <p className="text-[15px] font-medium">{monthLabel(month)}</p>
            {month !== currentMonthKey() && <Link href="/planner/calendar" className="text-[12px] text-muted hover:text-ink">Back to today</Link>}
          </div>
          <Link href={href(shiftMonth(month, 1))} className={navBtn} aria-label="Next month"><ChevronRight className="size-[18px]" /></Link>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
          {WEEKDAYS.map((d) => <div key={d} className="pb-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const dayItems = items.filter((it) => it.date === d);
            const inMonth = d.startsWith(month);
            return (
              <Link
                key={d}
                href={href(month, inMonth ? d : undefined)}
                className={cn(
                  "flex min-h-14 flex-col rounded-lg p-1.5 text-left transition-colors sm:min-h-20",
                  d === selected ? "bg-subtle ring-1 ring-line" : "hover:bg-subtle/60",
                  !inMonth && "pointer-events-none opacity-35",
                )}
              >
                <span className={cn("grid size-6 place-items-center rounded-full text-[12px] tabular-nums", d === today && "bg-accent font-semibold text-accent-ink")}>
                  {Number(d.slice(8))}
                </span>
                {/* Phone: dots. Larger screens: first two titles. */}
                <span className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                  {dayItems.slice(0, 4).map((it) => <span key={it.key} className={cn("size-1.5 rounded-full", DOT[it.kind])} />)}
                </span>
                <span className="mt-1 hidden space-y-0.5 sm:block">
                  {dayItems.slice(0, 2).map((it) => (
                    <span key={it.key} className={cn("flex items-center gap-1 truncate text-[11px] leading-tight", it.task?.done && "text-muted line-through")}>
                      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[it.kind])} />
                      <span className="truncate">{it.title}</span>
                    </span>
                  ))}
                  {dayItems.length > 2 && <span className="block text-[11px] text-muted">+{dayItems.length - 2} more</span>}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-muted">
          {(["task", "event", "health", "bill"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", DOT[k])} />
              {k === "task" ? "Tasks" : k === "event" ? "Events" : k === "health" ? "Health" : "Bills"}
            </span>
          ))}
        </div>
      </section>

      <section className="card self-start overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-[15px] font-medium">{selected === today ? "Today" : formatLongDate(selected)}</h2>
          <AddButtons date={selected} compact />
        </div>
        <ItemList items={items.filter((it) => it.date === selected)} empty="Nothing on this day." />
      </section>
    </div>
  );
}
