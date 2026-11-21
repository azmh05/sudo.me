// Backups live in <project>/backups/<date_time>/ :
//   data.json  – every table in the database
//   files/     – copies of the encrypted uploads from storage/records
// Copy the whole "backups" folder to a USB drive or cloud drive now and then:
// a backup on the same laptop won't help if the laptop is lost.
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { rawDb } from "./db";

const ROOT = process.cwd();
const BACKUP_DIR = path.join(ROOT, "backups");
const STORAGE_DIR = path.join(ROOT, "storage", "records");
const NAME = /^\d{4}-\d{2}-\d{2}_\d{4}(?:-\d+)?(?:-(?:auto|before-restore))?$/;
const KEEP_AUTO = 14;
const KEEP_OTHER = 10;

// Parents before children, so restoring respects links between tables.
export const TABLES = [
  "user", "loginLog", "activityLog", "account", "category", "transaction",
  "bill", "billPayment", "maintenanceItem", "maintenanceLog", "goal", "goalContribution",
  "vehicle", "vehicleItem", "vehicleServiceLog", "personalRecord", "recordFile",
  "healthCheckup", "healthAppointment", "healthProfile", "task", "plannerEvent",
  "journalEntry", "profilePhoto", "profileInfo", "profileEntry",
  "pushSubscription", "appSetting", "notificationPrefs", "notificationSent",
] as const;

type Delegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  createMany: (args: { data: unknown[] }) => Promise<unknown>;
  deleteMany: (args?: unknown) => Promise<unknown>;
};
const tablesOf = (client: unknown) => client as Record<string, Delegate>;

export type BackupInfo = { name: string; kind: "manual" | "auto" | "before-restore"; createdAt: string; size: number; files: number };

function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function isBackupName(name: string) {
  return NAME.test(name);
}

const kindOf = (name: string): BackupInfo["kind"] =>
  name.endsWith("-auto") ? "auto" : name.endsWith("-before-restore") ? "before-restore" : "manual";

export async function createBackup(kind: BackupInfo["kind"] = "manual", { tidy = true } = {}) {
  await mkdir(BACKUP_DIR, { recursive: true });
  const suffix = kind === "manual" ? "" : `-${kind}`;
  let name = `${stamp()}${suffix}`;
  for (let i = 2; await exists(path.join(BACKUP_DIR, name)); i++) name = `${stamp()}-${i}${suffix}`;

  const dir = path.join(BACKUP_DIR, name);
  await mkdir(dir);
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await tablesOf(rawDb)[t].findMany();
  await writeFile(
    path.join(dir, "data.json"),
    JSON.stringify({ app: "sudo.me", version: 1, createdAt: new Date().toISOString(), tables }),
  );
  if (await exists(STORAGE_DIR)) await cp(STORAGE_DIR, path.join(dir, "files"), { recursive: true });

  if (tidy) await prune();
  return name;
}

export async function listBackups(): Promise<BackupInfo[]> {
  if (!(await exists(BACKUP_DIR))) return [];
  const names = (await readdir(BACKUP_DIR)).filter(isBackupName);
  const out: BackupInfo[] = [];
  for (const name of names) {
    try {
      const info = await stat(path.join(BACKUP_DIR, name, "data.json"));
      const files = (await exists(path.join(BACKUP_DIR, name, "files")))
        ? (await readdir(path.join(BACKUP_DIR, name, "files"))).length
        : 0;
      out.push({ name, kind: kindOf(name), createdAt: info.mtime.toISOString(), size: info.size, files });
    } catch {
      // Incomplete folder — skip it.
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readBackupData(name: string) {
  if (!isBackupName(name)) throw new Error("Invalid backup name.");
  return readFile(path.join(BACKUP_DIR, name, "data.json"));
}

// Replaces EVERYTHING with the backup. A safety backup of the current data is made first.
export async function restoreBackup(name: string) {
  if (!isBackupName(name)) throw new Error("Invalid backup name.");
  const parsed = JSON.parse((await readBackupData(name)).toString("utf8")) as {
    app?: string;
    version?: number;
    tables?: Record<string, unknown[]>;
  };
  if (parsed.app !== "sudo.me" || parsed.version !== 1 || !parsed.tables) throw new Error("This isn't a sudo.me backup.");
  if (!parsed.tables.user?.length) throw new Error("This backup has no account in it.");

  // Safety copy first (no clean-up here, so the backup being restored can't be removed mid-way).
  await createBackup("before-restore", { tidy: false });

  await rawDb.$transaction(
    async (tx) => {
      const t = tablesOf(tx);
      for (const table of [...TABLES].reverse()) await t[table].deleteMany();
      for (const table of TABLES) {
        const rows = parsed.tables![table] ?? [];
        if (rows.length) await t[table].createMany({ data: rows });
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  // Swap the encrypted files for the backup's copies.
  await rm(STORAGE_DIR, { recursive: true, force: true });
  const filesDir = path.join(BACKUP_DIR, name, "files");
  if (await exists(filesDir)) {
    await mkdir(path.dirname(STORAGE_DIR), { recursive: true });
    await cp(filesDir, STORAGE_DIR, { recursive: true });
  }
}

export async function deleteBackup(name: string) {
  if (!isBackupName(name)) throw new Error("Invalid backup name.");
  await rm(path.join(BACKUP_DIR, name), { recursive: true, force: true });
}

// Keeps the newest 14 automatic backups and the newest 10 of the others.
async function prune() {
  const all = await listBackups();
  const extra = [
    ...all.filter((b) => b.kind === "auto").slice(KEEP_AUTO),
    ...all.filter((b) => b.kind !== "auto").slice(KEEP_OTHER),
  ];
  for (const b of extra) await rm(path.join(BACKUP_DIR, b.name), { recursive: true, force: true });
}

// Called on page loads: makes one automatic backup per day, and tidies the activity log.
let running = false;
export async function maybeAutoBackup() {
  if (running) return;
  running = true;
  try {
    const latest = (await listBackups()).find((b) => b.kind === "auto");
    if (!latest || Date.now() - Date.parse(latest.createdAt) > 24 * 3_600_000) {
      await createBackup("auto");
      await rawDb.activityLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 180 * 86_400_000) } } });
    }
  } catch (e) {
    console.error("Automatic backup failed:", e);
  } finally {
    running = false;
  }
}

async function exists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
