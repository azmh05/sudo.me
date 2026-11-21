import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { dateToISO, monthLabel, monthRange, shiftMonth } from "./dates";
import type {
  AccountOption,
  AccountWithBalance,
  CategoryOption,
  CategoryWithBudget,
  TxRow,
} from "./types";

// ---------- Starting data (created once, on first visit) ----------

const DEFAULT_ACCOUNTS = [
  { name: "Maybank", type: "BANK" },
  { name: "Touch 'n Go", type: "EWALLET" },
  { name: "ShopeePay", type: "EWALLET" },
  { name: "Cash", type: "CASH" },
] as const;

const DEFAULT_INCOME = ["MARA Allowance", "Pocket Money (Dad)", "Other Income"];
const DEFAULT_EXPENSE = [
  "Food & Drinks",
  "Groceries",
  "Transport",
  "Shopping",
  "Bills & Utilities",
  "Phone & Internet",
  "Education",
  "Entertainment",
  "Health",
  "Personal Care",
  "Subscriptions",
  "Gifts & Donations",
  "Others",
];

export async function ensureFinanceDefaults() {
  const [accounts, categories] = await Promise.all([db.account.count(), db.category.count()]);
  if (accounts === 0) {
    await db.account.createMany({
      data: DEFAULT_ACCOUNTS.map((a, i) => ({ ...a, sortOrder: i })),
      skipDuplicates: true,
    });
  }
  if (categories === 0) {
    await db.category.createMany({
      data: [
        ...DEFAULT_INCOME.map((name) => ({ name, kind: "INCOME" as const })),
        ...DEFAULT_EXPENSE.map((name) => ({ name, kind: "EXPENSE" as const })),
      ],
      skipDuplicates: true,
    });
  }
}

// ---------- Accounts & categories ----------

export async function getAccountOptions(): Promise<AccountOption[]> {
  return db.account.findMany({
    select: { id: true, name: true, type: true, archived: true },
    orderBy: [{ archived: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  return db.category.findMany({
    select: { id: true, name: true, kind: true, archived: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

// Balance = opening balance + income − expenses − transfers out + transfers in
export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const sumBy = (type: "INCOME" | "EXPENSE" | "TRANSFER") =>
    db.transaction.groupBy({ by: ["accountId"], where: { type }, _sum: { amount: true } });

  const [accounts, income, expense, transferOut, transferIn] = await Promise.all([
    db.account.findMany({ orderBy: [{ archived: "asc" }, { sortOrder: "asc" }, { id: "asc" }] }),
    sumBy("INCOME"),
    sumBy("EXPENSE"),
    sumBy("TRANSFER"),
    db.transaction.groupBy({
      by: ["toAccountId"],
      where: { type: "TRANSFER" },
      _sum: { amount: true },
    }),
  ]);

  const inc = new Map(income.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const exp = new Map(expense.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const tOut = new Map(transferOut.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const tIn = new Map(transferIn.map((r) => [r.toAccountId, r._sum.amount ?? 0]));

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    archived: a.archived,
    note: a.note,
    openingBalance: a.openingBalance,
    balance:
      a.openingBalance +
      (inc.get(a.id) ?? 0) -
      (exp.get(a.id) ?? 0) -
      (tOut.get(a.id) ?? 0) +
      (tIn.get(a.id) ?? 0),
  }));
}

// ---------- Monthly figures ----------

export async function getMonthTotals(monthKey: string) {
  const { start, end } = monthRange(monthKey);
  const rows = await db.transaction.groupBy({
    by: ["type"],
    where: { date: { gte: start, lt: end }, type: { in: ["INCOME", "EXPENSE"] } },
    _sum: { amount: true },
  });
  const income = rows.find((r) => r.type === "INCOME")?._sum.amount ?? 0;
  const expense = rows.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0;
  return { income, expense, net: income - expense };
}

// Income vs spending for the `months` months ending at `endKey`.
export async function getCashflow(endKey: string, months = 6) {
  const keys = Array.from({ length: months }, (_, i) => shiftMonth(endKey, i - months + 1));
  const rows = await db.transaction.findMany({
    where: {
      date: { gte: monthRange(keys[0]).start, lt: monthRange(endKey).end },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: { date: true, type: true, amount: true },
  });

  const buckets = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]));
  for (const r of rows) {
    const b = buckets.get(dateToISO(r.date).slice(0, 7));
    if (!b) continue;
    if (r.type === "INCOME") b.income += r.amount;
    else b.expense += r.amount;
  }
  return keys.map((key) => ({ key, label: monthLabel(key, "short"), ...buckets.get(key)! }));
}

// Spending per category for one month, largest first.
export async function getCategorySpending(monthKey: string) {
  const { start, end } = monthRange(monthKey);
  const [rows, categories] = await Promise.all([
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { type: "EXPENSE", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    db.category.findMany({ where: { kind: "EXPENSE" }, select: { id: true, name: true } }),
  ]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return rows
    .map((r) => ({
      id: r.categoryId,
      name: r.categoryId ? names.get(r.categoryId) ?? "Unknown" : "Uncategorised",
      amount: r._sum.amount ?? 0,
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

// Expense categories with their monthly budget and what's been spent this month.
export async function getBudgetStatus(monthKey: string): Promise<CategoryWithBudget[]> {
  const [categories, spending] = await Promise.all([
    db.category.findMany({ where: { kind: "EXPENSE" }, orderBy: { name: "asc" } }),
    getCategorySpending(monthKey),
  ]);
  const spent = new Map(spending.map((s) => [s.id, s.amount]));
  return categories
    .filter((c) => !c.archived || c.monthlyBudget !== null || spent.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      archived: c.archived,
      monthlyBudget: c.monthlyBudget,
      used: spent.get(c.id) ?? 0,
    }));
}

// ---------- Transactions ----------

const txInclude = {
  account: { select: { name: true } },
  toAccount: { select: { name: true } },
  category: { select: { name: true } },
} satisfies Prisma.TransactionInclude;

type TxWithNames = Prisma.TransactionGetPayload<{ include: typeof txInclude }>;

function toRow(t: TxWithNames): TxRow {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    date: dateToISO(t.date),
    accountId: t.accountId,
    accountName: t.account.name,
    toAccountId: t.toAccountId,
    toAccountName: t.toAccount?.name ?? null,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? null,
    note: t.note,
  };
}

export async function findTransactions(where: Prisma.TransactionWhereInput, take = 500) {
  const rows = await db.transaction.findMany({
    where,
    include: txInclude,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take,
  });
  return rows.map(toRow);
}

export function recentTransactions(take = 6) {
  return findTransactions({}, take);
}
