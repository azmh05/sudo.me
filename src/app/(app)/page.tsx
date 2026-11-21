import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, BellRing, CalendarCheck, FolderLock, HeartPulse, History, PiggyBank, Receipt, Target, Wallet, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { currentMonthKey, formatDay, monthLabel, todayISO } from "@/lib/dates";
import {
  ensureFinanceDefaults,
  getAccountOptions,
  getAccountsWithBalances,
  getBudgetStatus,
  getCategoryOptions,
  getMonthTotals,
  recentTransactions,
} from "@/lib/finance";
import { getUpcoming } from "@/lib/bills";
import { getGoals } from "@/lib/goals";
import { getOverdueTasks, getPlannerItems, getUndatedTasks, taskToItem } from "@/lib/planner";
import { addInterval } from "@/lib/schedule";
import { ItemList } from "@/components/planner/PlannerUI";
import { NAV } from "@/lib/nav";
import { formatRM, percent } from "@/lib/utils";
import { Greeting } from "@/components/Greeting";
import { DueBadge, ToneBadge } from "@/components/DueBadge";
import { AddRecordButton } from "@/components/finance/AddRecordButton";
import { TxLine } from "@/components/finance/TransactionList";
import { EmptyState, Progress, StatCard } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  await ensureFinanceDefaults();

  const month = currentMonthKey();
  const today = todayISO();
  const [accounts, totals, budgets, recent, accountOptions, categoryOptions, upcoming, goals, todayItems, overdueTasks, undatedTasks] = await Promise.all([
    getAccountsWithBalances(),
    getMonthTotals(month),
    getBudgetStatus(month),
    recentTransactions(6),
    getAccountOptions(),
    getCategoryOptions(),
    getUpcoming(7),
    getGoals(),
    getPlannerItems(today, addInterval(today, "DAY", 1)),
    getOverdueTasks(),
    getUndatedTasks(),
  ]);
  // Today: overdue tasks first, then today's items, then a few undated tasks.
  const todayList = [...overdueTasks.map(taskToItem), ...todayItems, ...undatedTasks.slice(0, 3).map(taskToItem)].filter(
    (it) => !(it.kind === "bill"), // bills already show in "Coming up"
  );
  const activeGoals = goals.filter((g) => !g.archived);

  const active = accounts.filter((a) => !a.archived);
  const balance = active.reduce((s, a) => s + a.balance, 0);
  const budgetTotal = budgets.reduce((s, b) => s + (b.monthlyBudget ?? 0), 0);
  const savedPct = percent(Math.max(0, totals.net), totals.income);
  const short = monthLabel(month, "short");

  return (
    <>
      <Greeting name={user.name.split(" ")[0]} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total balance" value={formatRM(balance)} icon={Wallet}
          hint={`Across ${active.length} account${active.length === 1 ? "" : "s"}`} />
        <StatCard label={`Income · ${short}`} value={formatRM(totals.income)} icon={ArrowDownLeft}
          hint="MARA, pocket money and more" />
        <StatCard label={`Spent · ${short}`} value={formatRM(totals.expense)} icon={ArrowUpRight}
          hint={budgetTotal ? `${percent(totals.expense, budgetTotal)}% of ${formatRM(budgetTotal)} budget` : "No budget set yet"} />
        <StatCard label="Left over this month" value={formatRM(totals.net)} icon={PiggyBank}>
          <Progress value={savedPct} className="mt-3" />
          <p className="mt-2 text-[13px] text-muted">
            {totals.income ? `${savedPct}% of income kept` : "Record your income to see this"}
          </p>
        </StatCard>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-medium">Coming up</h2>
            <span className="text-[13px] text-muted">Next 7 days & reminders</span>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-line">
              {upcoming.map((u) => {
                const Icon = u.kind === "bill" ? Receipt : u.kind === "document" ? FolderLock : u.kind === "health" ? HeartPulse : Wrench;
                return (
                  <li key={u.key}>
                    <Link href={u.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle/60">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle">
                        <Icon className="size-[18px] text-muted" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{u.name}</span>
                        <span className="block text-[13px] text-muted">{formatDay(u.dueDate)}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {u.amount !== null && <span className="text-[14px] font-medium tabular-nums">{formatRM(u.amount)}</span>}
                        {u.badge ? <ToneBadge tone={u.badge.tone} label={u.badge.label} /> : <DueBadge date={u.dueDate} variant={u.kind === "document" ? "expiry" : "due"} remindDays={u.remindDays} />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={BellRing} title="Nothing due" text="Bills, appointments and expiring documents will show here." />
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-medium">Today</h2>
            <Link href="/planner" className="text-[13px] text-muted hover:text-ink">Planner →</Link>
          </div>
          {todayList.length ? (
            <ItemList items={todayList.slice(0, 8)} />
          ) : (
            <EmptyState icon={CalendarCheck} title="A clear day" text="Tasks, events and appointments for today will appear here." />
          )}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-[15px] font-medium">Recent activity</h2>
            <AddRecordButton accounts={accountOptions} categories={categoryOptions} className="h-9 px-3 text-[14px]" />
          </div>
          {recent.length ? (
            <>
              <div className="divide-y divide-line">
                {recent.map((r) => <TxLine key={r.id} row={r} />)}
              </div>
              <Link href="/finance/transactions" className="block border-t border-line px-5 py-3 text-[13px] text-muted hover:text-ink">
                See all records →
              </Link>
            </>
          ) : (
            <EmptyState icon={History} title="No activity yet" text="Add your first income or expense and it will show up here." />
          )}
        </div>

        <div className="flex flex-col gap-4">
        {activeGoals.length > 0 && (
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-medium">Goals</h2>
              <Link href="/goals" className="text-[13px] text-muted hover:text-ink">All →</Link>
            </div>
            <ul className="space-y-4">
              {activeGoals.slice(0, 3).map((g) => (
                <li key={g.id}>
                  <div className="mb-1.5 flex justify-between gap-2 text-[13px]">
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      <Target className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
                      {g.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">{percent(g.saved, g.targetAmount)}%</span>
                  </div>
                  <Progress value={percent(g.saved, g.targetAmount)} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="card p-5">
          <h2 className="text-[15px] font-medium">Quick access</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {NAV.filter((n) => n.href !== "/").map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="card-hover flex flex-col gap-2 rounded-xl border border-line p-3">
                <Icon className="size-[18px] text-muted" strokeWidth={1.75} />
                <span className="text-[13px] font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
        </div>
      </section>
    </>
  );
}
