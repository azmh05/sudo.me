import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, PieChart, PiggyBank, Percent } from "lucide-react";
import { CashflowChart, CategoryBars } from "@/components/finance/Charts";
import { MonthSwitcher } from "@/components/finance/MonthSwitcher";
import { EmptyState, Progress, StatCard } from "@/components/ui";
import { currentMonthKey, isMonthKey, monthLabel } from "@/lib/dates";
import {
  getAccountsWithBalances,
  getBudgetStatus,
  getCashflow,
  getCategorySpending,
  getMonthTotals,
} from "@/lib/finance";
import { ACCOUNT_TYPE_LABEL } from "@/lib/types";
import { formatRM, percent } from "@/lib/utils";

export const metadata = { title: "Finance" };

export default async function FinanceOverview({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month = isMonthKey(sp.month) && sp.month <= currentMonthKey() ? sp.month : currentMonthKey();

  const [totals, cashflow, spending, accounts, budgets] = await Promise.all([
    getMonthTotals(month),
    getCashflow(month, 6),
    getCategorySpending(month),
    getAccountsWithBalances(),
    getBudgetStatus(month),
  ]);

  const active = accounts.filter((a) => !a.archived);
  const totalBalance = active.reduce((s, a) => s + a.balance, 0);
  const savingsRate = percent(Math.max(0, totals.net), totals.income);
  const budgeted = budgets.filter((b) => b.monthlyBudget !== null);
  const budgetTotal = budgeted.reduce((s, b) => s + (b.monthlyBudget ?? 0), 0);
  const budgetUsed = budgeted.reduce((s, b) => s + b.used, 0);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <MonthSwitcher month={month} basePath="/finance" />
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Income" value={formatRM(totals.income)} icon={ArrowDownLeft} hint={monthLabel(month)} />
        <StatCard label="Spending" value={formatRM(totals.expense)} icon={ArrowUpRight}
          hint={budgetTotal ? `${percent(totals.expense, budgetTotal)}% of ${formatRM(budgetTotal)} budget` : "No budget set"} />
        <StatCard label="Left over" value={formatRM(totals.net)} icon={PiggyBank}
          hint={totals.net >= 0 ? "Income minus spending" : "You spent more than you received"} />
        <StatCard label="Savings rate" value={`${savingsRate}%`} icon={Percent}>
          <Progress value={savingsRate} className="mt-3" />
          <p className="mt-2 text-[13px] text-muted">Share of income kept</p>
        </StatCard>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="mb-4 text-[15px] font-medium">Cash flow · last 6 months</h2>
          <CashflowChart data={cashflow} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-[15px] font-medium">Spending by category</h2>
          {spending.length ? (
            <CategoryBars items={spending} />
          ) : (
            <EmptyState icon={PieChart} title="No spending yet" text={`Expenses you record for ${monthLabel(month)} will be broken down here.`} />
          )}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-medium">Accounts</h2>
            <span className="text-[14px] font-semibold tabular-nums">{formatRM(totalBalance)}</span>
          </div>
          <ul className="divide-y divide-line">
            {active.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[14px] font-medium">{a.name}</p>
                  <p className="text-[12px] text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</p>
                </div>
                <span className={`text-[14px] tabular-nums ${a.balance < 0 ? "text-negative" : ""}`}>{formatRM(a.balance)}</span>
              </li>
            ))}
          </ul>
          <Link href="/finance/accounts" className="block border-t border-line px-5 py-3 text-[13px] text-muted hover:text-ink">
            Manage accounts →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-medium">Budget</h2>
            {budgetTotal > 0 && (
              <span className="text-[13px] tabular-nums text-muted">
                {formatRM(budgetUsed)} of {formatRM(budgetTotal)}
              </span>
            )}
          </div>
          {budgeted.length ? (
            <ul className="space-y-4 p-5">
              {budgeted.slice(0, 5).map((b) => {
                const pct = percent(b.used, b.monthlyBudget ?? 0);
                return (
                  <li key={b.id}>
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span>{b.name}</span>
                      <span className={`tabular-nums ${pct > 100 ? "text-negative" : "text-muted"}`}>
                        {formatRM(b.used)} / {formatRM(b.monthlyBudget ?? 0)}
                      </span>
                    </div>
                    <Progress value={pct} className={pct > 100 ? "[&>div]:bg-negative" : ""} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={PiggyBank} title="No budget yet" text="Set monthly limits per category to see how you're tracking." />
          )}
          <Link href="/finance/budget" className="block border-t border-line px-5 py-3 text-[13px] text-muted hover:text-ink">
            {budgeted.length ? "Edit budget →" : "Set up budget →"}
          </Link>
        </div>
      </section>
    </>
  );
}
