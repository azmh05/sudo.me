import type { Prisma } from "@prisma/client";
import { currentMonthKey, isMonthKey, monthRange } from "./dates";
import type { TxKind } from "./types";

export type TxFilterParams = Record<string, string | undefined>;

// Turns ?month=&type=&account=&category=&q= into a database filter.
// Shared by the Records tab and its Excel export, so the export matches what you see.
export function buildTxFilter(sp: TxFilterParams) {
  const now = currentMonthKey();
  const month = sp.month === "all" ? "all" : isMonthKey(sp.month) ? sp.month : now;
  const type = (["INCOME", "EXPENSE", "TRANSFER"] as const).find((t) => t === sp.type) as TxKind | undefined;
  const accountId = Number(sp.account) || undefined;
  const categoryId = Number(sp.category) || undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;

  const filters: Prisma.TransactionWhereInput[] = [];
  if (month !== "all") {
    const { start, end } = monthRange(month);
    filters.push({ date: { gte: start, lt: end } });
  }
  if (type) filters.push({ type });
  if (accountId) filters.push({ OR: [{ accountId }, { toAccountId: accountId }] });
  if (categoryId) filters.push({ categoryId });
  if (q) filters.push({ OR: [{ note: { contains: q } }, { category: { name: { contains: q } } }] });

  return { where: { AND: filters } as Prisma.TransactionWhereInput, month, type, accountId, categoryId, q };
}

// Rebuilds the query string (for the export link).
export function txFilterQuery(f: ReturnType<typeof buildTxFilter>) {
  const p = new URLSearchParams();
  p.set("month", f.month);
  if (f.type) p.set("type", f.type);
  if (f.accountId) p.set("account", String(f.accountId));
  if (f.categoryId) p.set("category", String(f.categoryId));
  if (f.q) p.set("q", f.q);
  return p.toString();
}
