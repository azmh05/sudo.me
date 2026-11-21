import { FileSpreadsheet, ReceiptText } from "lucide-react";
import { TransactionFilters } from "@/components/finance/TransactionFilters";
import { TransactionList } from "@/components/finance/TransactionList";
import { EmptyState } from "@/components/ui";
import { currentMonthKey, monthLabel, shiftMonth } from "@/lib/dates";
import { buildTxFilter, txFilterQuery } from "@/lib/tx-filter";
import { findTransactions, getAccountOptions, getCategoryOptions } from "@/lib/finance";
import { formatRM } from "@/lib/utils";

export const metadata = { title: "Records" };

const LIMIT = 500;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const now = currentMonthKey();
  const filter = buildTxFilter(sp);
  const { month, type, accountId, categoryId, q } = filter;

  const [rows, accounts, categories] = await Promise.all([
    findTransactions(filter.where, LIMIT),
    getAccountOptions(),
    getCategoryOptions(),
  ]);

  const income = rows.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);
  const months = Array.from({ length: 24 }, (_, i) => shiftMonth(now, -i)).map((k) => ({ key: k, label: monthLabel(k) }));
  const filtered = Boolean(type || accountId || categoryId || q);

  return (
    <>
      <TransactionFilters
        key={JSON.stringify(sp)}
        values={{ month, type: type ?? "", account: accountId ? String(accountId) : "", category: categoryId ? String(categoryId) : "", q: q ?? "" }}
        months={months}
        accounts={accounts}
        categories={categories}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5 text-[13px]">
          <span className="text-muted">
            {rows.length} record{rows.length === 1 ? "" : "s"}
            {month !== "all" ? ` in ${monthLabel(month)}` : ""}
          </span>
          <span className="flex items-center gap-4 tabular-nums">
            <span className="text-positive">In {formatRM(income)}</span>
            <span>Out {formatRM(expense)}</span>
            <a href={`/api/export/records?${txFilterQuery(filter)}`} className="flex items-center gap-1 text-muted hover:text-ink" title="Download what you see as an Excel file">
              <FileSpreadsheet className="size-4" strokeWidth={1.75} /> Excel
            </a>
          </span>
        </div>

        {rows.length ? (
          <TransactionList rows={rows} accounts={accounts} categories={categories} />
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={filtered ? "Nothing matches" : "No records yet"}
            text={filtered ? "Try a different search or clear the filters." : "Tap “Add record” to log your first income or expense."}
          />
        )}

        {rows.length === LIMIT && (
          <p className="border-t border-line px-5 py-3 text-center text-[12px] text-muted">
            Showing the latest {LIMIT}. Pick a month or filter to see older records.
          </p>
        )}
      </div>
    </>
  );
}
