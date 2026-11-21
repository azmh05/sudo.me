import { PrismaClient } from "@prisma/client";

// Models that aren't recorded in the activity log.
const NOT_LOGGED = new Set(["User", "LoginLog", "ActivityLog", "AppSetting", "NotificationSent"]);

type Row = Record<string, unknown>;

const rm = (sen: unknown) => `RM ${(Number(sen) / 100).toFixed(2)}`;
const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? ""));

// A short, non-sensitive description of a changed row (never document numbers or journal text).
function labelOf(model: string, r: Row | null | undefined): string {
  if (!r) return "";
  switch (model) {
    case "Transaction":
      return `${String(r.type ?? "").toLowerCase()} ${rm(r.amount)}${r.note ? ` · ${r.note}` : ""}`;
    case "BillPayment":
      return `Paid ${rm(r.amount)}`;
    case "GoalContribution":
      return `${Number(r.amount) < 0 ? "Took out" : "Added"} ${rm(Math.abs(Number(r.amount)))}`;
    case "JournalEntry":
      return `Entry for ${iso(r.date)}`;
    case "HealthProfile":
      return "Health info";
    case "ProfileInfo":
      return "Personal details";
    case "ProfilePhoto":
      return "Profile picture";
    case "PushSubscription":
      return `Notifications on ${r.device ?? "a device"}`;
    case "NotificationPrefs":
      return "Notification settings";
    case "MaintenanceLog":
    case "VehicleServiceLog":
      return `Done on ${iso(r.doneDate)}`;
    default:
      return String(r.title ?? r.name ?? r.originalName ?? `#${r.id ?? ""}`);
  }
}

function createClients() {
  const base = new PrismaClient();
  const delegate = (model: string) =>
    (base as unknown as Record<string, { findMany: (a: unknown) => Promise<Row[]> }>)[model.charAt(0).toLowerCase() + model.slice(1)];

  const log = (action: string, model: string, label: string) => {
    void base.activityLog
      .create({ data: { action, entity: model, label: label.slice(0, 160) || "—" } })
      .catch(() => {});
  };

  const db = base.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const r = await query(args);
          if (!NOT_LOGGED.has(model)) log("Created", model, labelOf(model, r as Row));
          return r;
        },
        async update({ model, args, query }) {
          const r = await query(args);
          if (!NOT_LOGGED.has(model)) log("Updated", model, labelOf(model, r as Row));
          return r;
        },
        async upsert({ model, args, query }) {
          const r = await query(args);
          if (!NOT_LOGGED.has(model)) log("Saved", model, labelOf(model, r as Row));
          return r;
        },
        async delete({ model, args, query }) {
          const r = await query(args);
          if (!NOT_LOGGED.has(model)) log("Deleted", model, labelOf(model, r as Row));
          return r;
        },
        async deleteMany({ model, args, query }) {
          if (NOT_LOGGED.has(model)) return query(args);
          const before = await delegate(model).findMany({ where: (args as { where?: unknown }).where, take: 10 });
          const r = await query(args);
          for (const row of before) log("Deleted", model, labelOf(model, row));
          return r;
        },
        async updateMany({ model, args, query }) {
          const r = await query(args);
          const count = (r as { count?: number }).count ?? 0;
          if (!NOT_LOGGED.has(model) && count > 0) log("Updated", model, `${count} item${count === 1 ? "" : "s"}`);
          return r;
        },
      },
    },
  });

  return { base, db };
}

// Reuse one client during development so hot reload doesn't open
// a new MySQL connection every time a file is saved.
const globalForPrisma = globalThis as unknown as { prismaClients?: ReturnType<typeof createClients> };
const clients = globalForPrisma.prismaClients ?? createClients();
if (process.env.NODE_ENV !== "production") globalForPrisma.prismaClients = clients;

// Use `db` everywhere. Changes made through it are recorded in the activity log.
export const db = clients.db;
// Plain client without logging — for login bookkeeping, backups and restore.
export const rawDb = clients.base;
