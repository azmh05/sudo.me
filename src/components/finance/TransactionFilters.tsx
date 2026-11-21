"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import type { AccountOption, CategoryOption } from "@/lib/types";

type Values = { month: string; type: string; account: string; category: string; q: string };

// A plain GET form: every filter lives in the address bar, so you can bookmark it.
export function TransactionFilters({
  values,
  months,
  accounts,
  categories,
}: {
  values: Values;
  months: { key: string; label: string }[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const submit = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  const hasFilters = values.type || values.account || values.category || values.q;
  const cats = values.type === "INCOME" || values.type === "EXPENSE" ? categories.filter((c) => c.kind === values.type) : categories;

  return (
    <form action="/finance/transactions" autoComplete="off" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
      <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input name="q" autoComplete="off" defaultValue={values.q} placeholder="Search notes or categories" className="input h-10 pl-10 text-[14px]" />
      </div>

      <select name="month" defaultValue={values.month} onChange={submit} className="input h-10 text-[14px]" aria-label="Month">
        {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        <option value="all">All time</option>
      </select>

      <select name="type" defaultValue={values.type} onChange={submit} className="input h-10 text-[14px]" aria-label="Type">
        <option value="">All types</option>
        <option value="EXPENSE">Expenses</option>
        <option value="INCOME">Income</option>
        <option value="TRANSFER">Transfers</option>
      </select>

      <select name="account" defaultValue={values.account} onChange={submit} className="input h-10 text-[14px]" aria-label="Account">
        <option value="">All accounts</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.archived ? " (archived)" : ""}</option>)}
      </select>

      <select name="category" defaultValue={values.category} onChange={submit} className="input h-10 text-[14px]" aria-label="Category">
        <option value="">All categories</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}{c.archived ? " (archived)" : ""}</option>)}
      </select>

      {hasFilters && (
        <Link
          href={`/finance/transactions${values.month !== months[0]?.key ? `?month=${values.month}` : ""}`}
          className="col-span-2 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink sm:col-span-3 lg:col-span-5"
        >
          <X className="size-3.5" /> Clear filters
        </Link>
      )}
    </form>
  );
}
