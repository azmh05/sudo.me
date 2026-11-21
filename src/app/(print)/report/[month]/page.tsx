import Link from "next/link";
import { notFound } from "next/navigation";
import { CashflowChart, CategoryBars } from "@/components/finance/Charts";
import { PrintButton } from "@/components/PrintButton";
import { APP_FULL_NAME } from "@/lib/config";
import { db } from "@/lib/db";
import { currentMonthKey, dateToISO, formatDay, formatLongDate, isMonthKey, monthLabel, monthRange, todayISO } from "@/lib/dates";
import { findTransactions, getAccountsWithBalances, getBudgetStatus, getCashflow, getCategorySpending, getMonthTotals } from "@/lib/finance";
import { getGoals } from "@/lib/goals";
import { formatRM, percent } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  return { title: isMonthKey(month) ? `Report ${monthLabel(month)}` : "Report" };
}

export default async function MonthlyReport({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!isMonthKey(month) || month > currentMonthKey()) notFound();
  const { start, end } = monthRange(month);

  const [totals, cashflow, spending, budget, accounts, goals, biggest, billsPaid] = await Promise.all([
    getMonthTotals(month),
    getCashflow(month, 6),
    getCategorySpending(month),
    getBudgetStatus(month),
    getAccountsWithBalances(),
    getGoals(),
    findTransactions({ type: "EXPENSE", date: { gte: start, lt: end } }, 1000),
    db.billPayment.findMany({ where: { paidDate: { gte: start, lt: end } }, include: { bill: { select: { name: true } } }, orderBy: { paidDate: "asc" } }),
  ]);

  const top = [...biggest].sort((a, b) => b.amount - a.amount).slice(0, 10);
  const budgeted = budget.filter((b) => b.monthlyBudget !== null);
  const activeAccounts = accounts.filter((a) => !a.archived);
  const activeGoals = goals.filter((g) => !g.archived);
  const rate = percent(Math.max(0, totals.net), totals.income);
  const th = "py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted";
  const td = "py-2 text-[13px]";

  return (
    <main className="report mx-auto max-w-[800px] px-6 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href="/settings/data" className="text-[13px] text-muted hover:text-ink">← Back to Settings</Link>
        <PrintButton />
      </div>

      <header className="mb-8 border-b border-line pb-5">
        <p className="eyebrow">{APP_FULL_NAME} · Monthly report</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{monthLabel(month)}</h1>
        <p className="text-[12px] text-muted">Generated {formatLongDate(todayISO())}{month === currentMonthKey() ? " · month in progress" : ""}</p>
      </header>

      <section className="mb-8 grid grid-cols-4 gap-3">
        {[
          ["Income", formatRM(totals.income)],
          ["Spending", formatRM(totals.expense)],
          ["Left over", formatRM(totals.net)],
          ["Savings rate", `${rate}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line p-3">
            <p className="text-[11px] text-muted">{k}</p>
            <p className="mt-1 text-[17px] font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </section>

      <section className="mb-8 grid grid-cols-2 gap-6 break-inside-avoid">
        <div>
          <h2 className="mb-3 text-[14px] font-semibold">Spending by category</h2>
          {spending.length ? <CategoryBars items={spending} limit={8} /> : <p className="text-[13px] text-muted">No spending recorded.</p>}
        </div>
        <div>
          <h2 className="mb-3 text-[14px] font-semibold">Cash flow · last 6 months</h2>
          <CashflowChart data={cashflow} />
        </div>
      </section>

      {budgeted.length > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h2 className="mb-2 text-[14px] font-semibold">Budget</h2>
          <table className="w-full border-collapse">
            <thead className="border-b border-line">
              <tr><th className={th}>Category</th><th className={`${th} text-right`}>Limit</th><th className={`${th} text-right`}>Spent</th><th className={`${th} text-right`}>Left</th><th className={`${th} text-right`}>Used</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {budgeted.map((b) => {
                const pct = percent(b.used, b.monthlyBudget ?? 0);
                return (
                  <tr key={b.id}>
                    <td className={td}>{b.name}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatRM(b.monthlyBudget ?? 0)}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatRM(b.used)}</td>
                    <td className={`${td} text-right tabular-nums ${pct > 100 ? "text-negative" : ""}`}>{formatRM((b.monthlyBudget ?? 0) - b.used)}</td>
                    <td className={`${td} text-right tabular-nums ${pct > 100 ? "text-negative" : ""}`}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="mb-8 grid grid-cols-2 gap-6">
        <div className="break-inside-avoid">
          <h2 className="mb-2 text-[14px] font-semibold">Biggest expenses</h2>
          {top.length ? (
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-line">
                {top.map((t) => (
                  <tr key={t.id}>
                    <td className={`${td} pr-2 text-muted`}>{formatDay(t.date)}</td>
                    <td className={`${td} pr-2`}>{t.categoryName ?? "—"}{t.note ? <span className="text-muted"> · {t.note}</span> : null}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatRM(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-[13px] text-muted">None.</p>}
        </div>
        <div className="break-inside-avoid">
          <h2 className="mb-2 text-[14px] font-semibold">Bills paid</h2>
          {billsPaid.length ? (
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-line">
                {billsPaid.map((p) => (
                  <tr key={p.id}>
                    <td className={`${td} pr-2 text-muted`}>{formatDay(dateToISO(p.paidDate))}</td>
                    <td className={`${td} pr-2`}>{p.bill.name}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatRM(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-[13px] text-muted">None this month.</p>}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6 break-inside-avoid">
        <div>
          <h2 className="mb-2 text-[14px] font-semibold">Accounts (today)</h2>
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-line">
              {activeAccounts.map((a) => (
                <tr key={a.id}><td className={td}>{a.name}</td><td className={`${td} text-right tabular-nums`}>{formatRM(a.balance)}</td></tr>
              ))}
              <tr className="font-semibold"><td className={td}>Total</td><td className={`${td} text-right tabular-nums`}>{formatRM(activeAccounts.reduce((s, a) => s + a.balance, 0))}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="mb-2 text-[14px] font-semibold">Goals (today)</h2>
          {activeGoals.length ? (
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-line">
                {activeGoals.map((g) => (
                  <tr key={g.id}>
                    <td className={td}>{g.name}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatRM(g.saved)} / {formatRM(g.targetAmount)}</td>
                    <td className={`${td} w-12 text-right tabular-nums text-muted`}>{percent(g.saved, g.targetAmount)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-[13px] text-muted">No goals yet.</p>}
        </div>
      </section>
    </main>
  );
}
