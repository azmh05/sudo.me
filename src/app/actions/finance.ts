"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isoToDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import type { ActionResult } from "@/lib/types";

const TX_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
const ACCOUNT_TYPES = ["BANK", "EWALLET", "CASH", "CARD", "SAVINGS", "OTHER"] as const;

// Every change refreshes all pages, so the dashboard numbers update at once.
function done(message?: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, message };
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optId = (fd: FormData, key: string) => {
  const n = Number(fd.get(key));
  return Number.isInteger(n) && n > 0 ? n : null;
};

function isUniqueError(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// ---------- Transactions ----------

export async function saveTransaction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();

  const id = optId(fd, "id");
  const type = str(fd, "type") as (typeof TX_TYPES)[number];
  if (!TX_TYPES.includes(type)) return { error: "Choose expense, income or transfer." };

  const amount = parseAmount(str(fd, "amount"));
  if (!amount || amount <= 0) return { error: "Enter an amount greater than RM 0, e.g. 12.50" };

  const date = isoToDate(str(fd, "date"));
  if (!date) return { error: "Choose a valid date." };

  const accountId = optId(fd, "accountId");
  if (!accountId || !(await db.account.findUnique({ where: { id: accountId } })))
    return { error: "Choose an account." };

  let toAccountId: number | null = null;
  let categoryId: number | null = null;

  if (type === "TRANSFER") {
    toAccountId = optId(fd, "toAccountId");
    if (!toAccountId) return { error: "Choose the account the money goes to." };
    if (toAccountId === accountId) return { error: "Choose two different accounts." };
    if (!(await db.account.findUnique({ where: { id: toAccountId } })))
      return { error: "That account no longer exists." };
  } else {
    categoryId = optId(fd, "categoryId");
    if (categoryId) {
      const cat = await db.category.findUnique({ where: { id: categoryId } });
      if (!cat || cat.kind !== type) return { error: "That category doesn't match the type." };
    }
  }

  const note = str(fd, "note").slice(0, 255) || null;
  const data = { type, amount, date, accountId, toAccountId, categoryId, note };

  if (id) {
    const exists = await db.transaction.findUnique({ where: { id } });
    if (!exists) return { error: "This record was already deleted." };
    await db.transaction.update({ where: { id }, data });
  } else {
    await db.transaction.create({ data });
  }
  return done();
}

export async function deleteTransaction(id: number): Promise<ActionResult> {
  await requireUser();
  await db.transaction.deleteMany({ where: { id } });
  return done();
}

// ---------- Accounts ----------

export async function saveAccount(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();

  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give the account a name." };
  if (name.length > 60) return { error: "Name is too long (max 60 characters)." };

  const type = str(fd, "type") as (typeof ACCOUNT_TYPES)[number];
  if (!ACCOUNT_TYPES.includes(type)) return { error: "Choose an account type." };

  const rawOpening = str(fd, "openingBalance");
  const openingBalance = rawOpening === "" ? 0 : parseAmount(rawOpening, { allowNegative: true });
  if (openingBalance === null) return { error: "Opening balance should look like 250.00" };

  const note = str(fd, "note").slice(0, 255) || null;

  try {
    if (id) {
      await db.account.update({ where: { id }, data: { name, type, openingBalance, note } });
    } else {
      const last = await db.account.aggregate({ _max: { sortOrder: true } });
      await db.account.create({
        data: { name, type, openingBalance, note, sortOrder: (last._max.sortOrder ?? 0) + 1 },
      });
    }
  } catch (e) {
    if (isUniqueError(e)) return { error: "You already have an account with that name." };
    throw e;
  }
  return done();
}

export async function setAccountArchived(id: number, archived: boolean): Promise<ActionResult> {
  await requireUser();
  await db.account.update({ where: { id }, data: { archived } });
  return done(archived ? "Account archived." : "Account restored.");
}

// Accounts with records can't be deleted (it would erase history) — archive instead.
export async function deleteAccount(id: number): Promise<ActionResult> {
  await requireUser();
  const used = await db.transaction.count({
    where: { OR: [{ accountId: id }, { toAccountId: id }] },
  });
  if (used > 0) {
    return {
      error: `This account has ${used} record${used === 1 ? "" : "s"}, so it can't be deleted. Archive it instead to hide it.`,
    };
  }
  await db.account.deleteMany({ where: { id } });
  return done("Account deleted.");
}

// ---------- Categories ----------

export async function saveCategory(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();

  const id = optId(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Give the category a name." };
  if (name.length > 60) return { error: "Name is too long (max 60 characters)." };

  try {
    if (id) {
      await db.category.update({ where: { id }, data: { name } });
    } else {
      const kind = str(fd, "kind");
      if (kind !== "INCOME" && kind !== "EXPENSE") return { error: "Choose income or expense." };
      await db.category.create({ data: { name, kind } });
    }
  } catch (e) {
    if (isUniqueError(e)) return { error: "A category with that name already exists." };
    throw e;
  }
  return done();
}

export async function setCategoryArchived(id: number, archived: boolean): Promise<ActionResult> {
  await requireUser();
  await db.category.update({ where: { id }, data: { archived } });
  return done(archived ? "Category archived." : "Category restored.");
}

// Used categories are archived (hidden from new records) so old records keep their label.
export async function deleteCategory(id: number): Promise<ActionResult> {
  await requireUser();
  const used = await db.transaction.count({ where: { categoryId: id } });
  if (used > 0) {
    await db.category.update({ where: { id }, data: { archived: true, monthlyBudget: null } });
    return done(`Archived instead of deleted — ${used} record${used === 1 ? " uses" : "s use"} it.`);
  }
  await db.category.deleteMany({ where: { id } });
  return done("Category deleted.");
}

// ---------- Budgets ----------

// The budget form sends one field per category: budget_<id> = "300" or "" (no budget).
export async function saveBudgets(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();

  const updates: { id: number; monthlyBudget: number | null }[] = [];
  for (const [key, value] of fd.entries()) {
    const m = /^budget_(\d+)$/.exec(key);
    if (!m) continue;
    const raw = String(value).trim();
    if (raw === "") {
      updates.push({ id: Number(m[1]), monthlyBudget: null });
      continue;
    }
    const sen = parseAmount(raw);
    if (sen === null) return { error: `"${raw}" isn't a valid amount.` };
    updates.push({ id: Number(m[1]), monthlyBudget: sen === 0 ? null : sen });
  }

  await db.$transaction(
    updates.map((u) =>
      db.category.updateMany({
        where: { id: u.id, kind: "EXPENSE" },
        data: { monthlyBudget: u.monthlyBudget },
      }),
    ),
  );
  return done("Budget saved.");
}
