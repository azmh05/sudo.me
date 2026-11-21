import { ItemList } from "@/components/planner/PlannerUI";
import { formatDay, formatLongDate, todayISO } from "@/lib/dates";
import { getOverdueTasks, getPlannerItems, getUndatedTasks, taskToItem } from "@/lib/planner";
import { addInterval } from "@/lib/schedule";

export const metadata = { title: "Planner" };

export default async function AgendaPage() {
  const today = todayISO();
  const [items, overdue, undated] = await Promise.all([
    getPlannerItems(today, addInterval(today, "DAY", 7)),
    getOverdueTasks(),
    getUndatedTasks(),
  ]);
  const days = Array.from({ length: 6 }, (_, i) => addInterval(today, "DAY", i + 1));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        {overdue.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-3 text-[15px] font-medium text-negative">Overdue ({overdue.length})</h2>
            <ItemList items={overdue.map(taskToItem)} showDate />
          </section>
        )}
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-[15px] font-medium">Today</h2>
            <p className="text-[12px] text-muted">{formatLongDate(today)}</p>
          </div>
          <ItemList items={items.filter((i) => i.date === today)} empty="Nothing planned for today." />
          {undated.length > 0 && (
            <>
              <h3 className="border-y border-line bg-subtle/50 px-5 py-2 text-[12px] font-medium text-muted">Anytime</h3>
              <ItemList items={undated.map(taskToItem)} />
            </>
          )}
        </section>
      </div>

      <section className="card self-start overflow-hidden lg:col-span-2">
        <h2 className="border-b border-line px-5 py-3 text-[15px] font-medium">Next 6 days</h2>
        <div className="divide-y divide-line">
          {days.map((d, i) => {
            const dayItems = items.filter((it) => it.date === d);
            return (
              <div key={d}>
                <p className="px-5 pb-1 pt-3 text-[12px] font-medium text-muted">{i === 0 ? "Tomorrow" : formatDay(d)}</p>
                {dayItems.length ? <ItemList items={dayItems} /> : <p className="px-5 pb-3 text-[13px] text-muted/70">—</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
