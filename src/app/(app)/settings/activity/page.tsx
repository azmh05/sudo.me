import { History } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { rawDb } from "@/lib/db";
import { formatDay, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Activity" };

const ENTITY: Record<string, string> = {
  Transaction: "Finance record",
  Account: "Account",
  Category: "Category",
  Bill: "Bill",
  BillPayment: "Bill payment",
  MaintenanceItem: "Home & Devices",
  MaintenanceLog: "Upkeep done",
  Goal: "Goal",
  GoalContribution: "Goal money",
  Vehicle: "Vehicle",
  VehicleItem: "Vehicle service item",
  VehicleServiceLog: "Vehicle service",
  PersonalRecord: "Record",
  RecordFile: "Record file",
  HealthCheckup: "Check-up",
  HealthAppointment: "Appointment",
  HealthProfile: "Health info",
  Task: "Task",
  PlannerEvent: "Event",
  JournalEntry: "Journal",
  ProfileInfo: "Profile",
  ProfileEntry: "Profile",
  ProfilePhoto: "Profile",
  PushSubscription: "Notifications",
  NotificationPrefs: "Notifications",
  Security: "Security",
};

const timeFmt = new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit", hour12: true });

export default async function ActivityPage() {
  const rows = await rawDb.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState icon={History} title="No activity yet" text="Every add, edit and delete across your Hub will be listed here." />
      </div>
    );
  }

  const groups: { day: string; rows: typeof rows }[] = [];
  for (const r of rows) {
    const day = todayISO(r.createdAt);
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) groups.push((g = { day, rows: [] }));
    g.rows.push(r);
  }

  return (
    <div className="card overflow-hidden">
      {groups.map((g) => (
        <section key={g.day}>
          <h2 className="border-b border-line bg-subtle/50 px-5 py-2 text-[12px] font-medium text-muted">{formatDay(g.day)}</h2>
          <ul className="divide-y divide-line">
            {g.rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-[14px]">
                <span className="w-16 shrink-0 text-[12px] tabular-nums text-muted">{timeFmt.format(r.createdAt)}</span>
                <span
                  className={cn(
                    "w-16 shrink-0 text-[12px] font-medium",
                    r.action === "Deleted" ? "text-negative" : r.action === "Created" ? "text-positive" : "text-muted",
                  )}
                >
                  {r.action}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted">{ENTITY[r.entity] ?? r.entity} · </span>
                  {r.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="border-t border-line px-5 py-3 text-[12px] text-muted">Showing the latest 200 changes. History older than 180 days is cleared automatically.</p>
    </div>
  );
}
