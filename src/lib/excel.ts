// Builds Excel (.xlsx) workbooks: real Excel tables with filter buttons,
// amounts as numbers (so you can sum and chart them), and totals with formulas.
import type { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { db } from "./db";
import { currentMonthKey, dateToISO, monthLabel } from "./dates";
import { findTransactions, getAccountsWithBalances, getBudgetStatus } from "./finance";
import { monthlyNeeded } from "./goal-math";
import { getGoals } from "./goals";
import { FREQ_LABEL } from "./schedule";
import { ACCOUNT_TYPE_LABEL, RECORD_CATEGORY_LABEL, TX_TYPE_LABEL } from "./types";

const MONEY = "#,##0.00";
const DATE = "dd/mm/yyyy";
const PERCENT = "0%";
const toDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);
const rm = (sen: number | null) => (sen === null ? null : sen / 100);

type Col = { header: string; width: number; fmt?: string };
type Cell = string | number | Date | boolean | null;

function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "sudo.me";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  return wb;
}

function tableSheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: Cell[][]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addTable({
    name: name.replace(/[^A-Za-z]/g, "") || "Table",
    ref: "A1",
    headerRow: true,
    style: { theme: "TableStyleLight9", showRowStripes: true },
    columns: cols.map((c) => ({ name: c.header, filterButton: true })),
    rows: rows.length ? rows : [cols.map(() => null)],
  });
  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.width;
    if (c.fmt) col.numFmt = c.fmt;
  });
  return ws;
}

function totalsBlock(ws: ExcelJS.Worksheet, startRow: number, lines: [string, string, number][]) {
  lines.forEach(([label, formula, result], i) => {
    const r = startRow + i;
    ws.getCell(`E${r}`).value = label;
    ws.getCell(`E${r}`).font = { bold: true };
    ws.getCell(`F${r}`).value = { formula, result };
    ws.getCell(`F${r}`).numFmt = MONEY;
    ws.getCell(`F${r}`).font = { bold: true };
  });
}

// ---------- Sheets ----------

async function addRecordsSheet(wb: ExcelJS.Workbook, where: Prisma.TransactionWhereInput) {
  const rows = await findTransactions(where, 100_000);
  const ws = tableSheet(
    wb,
    "Records",
    [
      { header: "Date", width: 12, fmt: DATE },
      { header: "Type", width: 10 },
      { header: "Category", width: 20 },
      { header: "Account", width: 16 },
      { header: "To account", width: 16 },
      { header: "Amount (RM)", width: 14, fmt: MONEY },
      { header: "Note", width: 40 },
    ],
    rows.map((r) => [toDate(r.date), TX_TYPE_LABEL[r.type], r.categoryName, r.accountName, r.toAccountName, rm(r.amount), r.note]),
  );
  const last = Math.max(rows.length, 1) + 1;
  const sum = (t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + r.amount, 0) / 100;
  totalsBlock(ws, last + 2, [
    ["Total income", `SUMIFS(F2:F${last},B2:B${last},"Income")`, sum("INCOME")],
    ["Total spending", `SUMIFS(F2:F${last},B2:B${last},"Expense")`, sum("EXPENSE")],
    ["Left over", `F${last + 2}-F${last + 3}`, sum("INCOME") - sum("EXPENSE")],
  ]);
}

async function addMonthlySummarySheet(wb: ExcelJS.Workbook) {
  const rows = await db.transaction.findMany({
    where: { type: { in: ["INCOME", "EXPENSE"] } },
    select: { date: true, type: true, amount: true },
  });
  const months = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    const key = dateToISO(r.date).slice(0, 7);
    const m = months.get(key) ?? { income: 0, expense: 0 };
    if (r.type === "INCOME") m.income += r.amount;
    else m.expense += r.amount;
    months.set(key, m);
  }
  const keys = [...months.keys()].sort().reverse();
  const ws = tableSheet(
    wb,
    "Monthly summary",
    [
      { header: "Month", width: 16 },
      { header: "Income", width: 14, fmt: MONEY },
      { header: "Spending", width: 14, fmt: MONEY },
      { header: "Left over", width: 14, fmt: MONEY },
      { header: "Savings rate", width: 13, fmt: PERCENT },
    ],
    keys.map((k) => {
      const m = months.get(k)!;
      const net = m.income - m.expense;
      return [monthLabel(k), m.income / 100, m.expense / 100, net / 100, m.income ? Math.max(0, net) / m.income : 0];
    }),
  );
  return ws;
}

async function addAccountsSheet(wb: ExcelJS.Workbook) {
  const accounts = await getAccountsWithBalances();
  tableSheet(
    wb,
    "Accounts",
    [
      { header: "Account", width: 20 },
      { header: "Type", width: 12 },
      { header: "Opening balance", width: 16, fmt: MONEY },
      { header: "Current balance", width: 16, fmt: MONEY },
      { header: "Status", width: 10 },
    ],
    accounts.map((a) => [a.name, ACCOUNT_TYPE_LABEL[a.type], a.openingBalance / 100, a.balance / 100, a.archived ? "Archived" : "Active"]),
  );
}

async function addBudgetSheet(wb: ExcelJS.Workbook, month: string) {
  const budget = (await getBudgetStatus(month)).filter((b) => b.monthlyBudget !== null || b.used > 0);
  tableSheet(
    wb,
    `Budget ${monthLabel(month, "short")}`,
    [
      { header: "Category", width: 22 },
      { header: "Monthly limit", width: 14, fmt: MONEY },
      { header: "Spent", width: 14, fmt: MONEY },
      { header: "Left", width: 14, fmt: MONEY },
      { header: "% used", width: 10, fmt: PERCENT },
    ],
    budget.map((b) => [
      b.name,
      rm(b.monthlyBudget),
      b.used / 100,
      b.monthlyBudget === null ? null : (b.monthlyBudget - b.used) / 100,
      b.monthlyBudget ? b.used / b.monthlyBudget : null,
    ]),
  );
}

async function addBillsSheet(wb: ExcelJS.Workbook) {
  const [bills, accounts, categories] = await Promise.all([
    db.bill.findMany({ orderBy: { nextDueDate: "asc" } }),
    db.account.findMany({ select: { id: true, name: true } }),
    db.category.findMany({ select: { id: true, name: true } }),
  ]);
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  tableSheet(
    wb,
    "Bills",
    [
      { header: "Bill", width: 22 },
      { header: "Amount", width: 12, fmt: MONEY },
      { header: "Repeats", width: 16 },
      { header: "Next due", width: 12, fmt: DATE },
      { header: "Paid from", width: 16 },
      { header: "Category", width: 18 },
      { header: "Status", width: 10 },
    ],
    bills.map((b) => [
      b.name,
      b.amount / 100,
      FREQ_LABEL[b.frequency],
      b.nextDueDate,
      b.accountId ? acc.get(b.accountId) ?? null : null,
      b.categoryId ? cat.get(b.categoryId) ?? null : null,
      b.active ? "Active" : "Paused",
    ]),
  );
}

async function addGoalsSheet(wb: ExcelJS.Workbook) {
  const goals = await getGoals();
  tableSheet(
    wb,
    "Goals",
    [
      { header: "Goal", width: 22 },
      { header: "Type", width: 16 },
      { header: "Target", width: 14, fmt: MONEY },
      { header: "Saved", width: 14, fmt: MONEY },
      { header: "Remaining", width: 14, fmt: MONEY },
      { header: "Target date", width: 12, fmt: DATE },
      { header: "Save per month", width: 15, fmt: MONEY },
    ],
    goals.map((g) => [
      g.name,
      g.type === "EMERGENCY" ? "Emergency fund" : g.type === "PURCHASE" ? "Future purchase" : "Savings",
      g.targetAmount / 100,
      g.saved / 100,
      Math.max(0, g.targetAmount - g.saved) / 100,
      toDate(g.targetDate),
      rm(monthlyNeeded(g)?.perMonth ?? null),
    ]),
  );
}

// Document list only — document numbers stay encrypted and are never exported.
async function addDocumentsSheet(wb: ExcelJS.Workbook) {
  const docs = await db.personalRecord.findMany({ include: { _count: { select: { files: true } } }, orderBy: [{ category: "asc" }, { title: "asc" }] });
  tableSheet(
    wb,
    "Documents",
    [
      { header: "Document", width: 26 },
      { header: "Category", width: 22 },
      { header: "Issued by", width: 18 },
      { header: "Issue date", width: 12, fmt: DATE },
      { header: "Expiry date", width: 12, fmt: DATE },
      { header: "Files", width: 8 },
    ],
    docs.map((d) => [d.title, RECORD_CATEGORY_LABEL[d.category], d.issuer, d.issueDate, d.expiryDate, d._count.files]),
  );
}

// ---------- Workbooks ----------

export async function recordsWorkbook(where: Prisma.TransactionWhereInput, month: string) {
  const wb = newWorkbook();
  await addRecordsSheet(wb, where);
  await addMonthlySummarySheet(wb);
  await addAccountsSheet(wb);
  await addBudgetSheet(wb, month === "all" ? currentMonthKey() : month);
  return wb.xlsx.writeBuffer();
}

export async function everythingWorkbook() {
  const wb = newWorkbook();
  await addRecordsSheet(wb, {});
  await addMonthlySummarySheet(wb);
  await addAccountsSheet(wb);
  await addBudgetSheet(wb, currentMonthKey());
  await addBillsSheet(wb);
  await addGoalsSheet(wb);
  await addDocumentsSheet(wb);
  return wb.xlsx.writeBuffer();
}

export function xlsxResponse(buffer: ArrayBuffer | Buffer, filename: string) {
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
