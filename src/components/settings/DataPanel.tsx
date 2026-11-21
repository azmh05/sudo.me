"use client";

import { ArchiveRestore, DatabaseBackup, Download, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import { useActionState, useCallback, useState, useTransition } from "react";
import { backupNow, removeBackup, restoreAction } from "@/app/actions/backup";
import type { BackupInfo } from "@/lib/backup";
import type { ActionResult } from "@/lib/types";
import { FormError, Modal } from "../Modal";

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const KIND = { manual: "Manual", auto: "Automatic", "before-restore": "Before restore" } as const;

function size(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DataPanel({ backups, months }: { backups: BackupInfo[]; months: { key: string; label: string }[] }) {
  const [month, setMonth] = useState(months[0]?.key ?? "");
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  const [restoring, setRestoring] = useState<BackupInfo | null>(null);
  const close = useCallback(() => setRestoring(null), []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-medium">
            <FileSpreadsheet className="size-4 text-muted" strokeWidth={1.75} /> Excel export
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Sheets for finance records, monthly summary, accounts, budget, bills, goals and your document list. Document numbers are never exported.
          </p>
          <a href="/api/export/all" className="btn-primary mt-4 h-10">
            <Download className="size-4" /> Download everything (.xlsx)
          </a>
          <p className="mt-3 text-[12px] text-muted">
            To export only some records, filter them in <b className="font-medium text-ink">Finance → Records</b> and tap <b className="font-medium text-ink">Excel</b> there.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-medium">
            <FileText className="size-4 text-muted" strokeWidth={1.75} /> Monthly report (PDF)
          </h2>
          <p className="mt-1 text-[13px] text-muted">A clean one-page summary with charts. Open it, then tap “Save as PDF”.</p>
          <div className="mt-4 flex gap-2">
            <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" className="input h-10 flex-1">
              {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <a href={`/report/${month}`} target="_blank" rel="noopener" className="btn-primary h-10">Open report</a>
          </div>
        </section>
      </div>

      <section className="card self-start overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-[15px] font-medium">
            <DatabaseBackup className="size-4 text-muted" strokeWidth={1.75} /> Backups
          </h2>
          <button type="button" disabled={pending} onClick={() => start(async () => setResult(await backupNow()))} className="btn-primary h-9 px-3 text-[13px]">
            {pending ? "Backing up…" : "Back up now"}
          </button>
        </div>
        <div className="space-y-2 px-5 py-3 text-[13px] text-muted">
          <p>A backup is made automatically once a day (the newest 14 are kept). Each one includes all your data and encrypted files.</p>
          <p>
            Backups are saved in the <code className="rounded bg-subtle px-1">backups</code> folder of your project. Copy that folder to a USB drive or Google Drive now and then — and keep your
            <code className="mx-1 rounded bg-subtle px-1">.env</code>file safe, because the encryption key is needed to open files from a backup.
          </p>
        </div>
        {result?.error && <div className="px-5 pb-3"><FormError message={result.error} /></div>}
        {result?.message && <p className="mx-5 mb-3 rounded-lg bg-positive/10 px-3 py-2 text-[13px] text-positive">{result.message}</p>}

        {backups.length === 0 ? (
          <p className="border-t border-line px-5 py-6 text-center text-[13px] text-muted">No backups yet.</p>
        ) : (
          <ul className="max-h-[30rem] divide-y divide-line overflow-y-auto border-t border-line">
            {backups.map((b) => <BackupLine key={b.name} backup={b} onRestore={() => setRestoring(b)} />)}
          </ul>
        )}
      </section>

      <Modal open={restoring !== null} onClose={close} title="Restore backup">
        {restoring && <RestoreForm backup={restoring} />}
      </Modal>
    </div>
  );
}

function BackupLine({ backup: b, onRestore }: { backup: BackupInfo; onRestore: () => void }) {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  return (
    <li className="flex items-center gap-2 px-5 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px]">{fmt.format(new Date(b.createdAt))}</span>
        <span className="block text-[12px] text-muted">{KIND[b.kind]} · {size(b.size)} · {b.files} file{b.files === 1 ? "" : "s"}</span>
      </span>
      <a href={`/api/backup/${b.name}`} className="btn-ghost h-8 px-2" aria-label="Download data" title="Download data (.json)">
        <Download className="size-4" />
      </a>
      <button type="button" onClick={onRestore} className="btn-ghost h-8 px-2" aria-label="Restore" title="Restore this backup">
        <ArchiveRestore className="size-4" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => (armed ? start(async () => void (await removeBackup(b.name))) : setArmed(true))}
        onBlur={() => setArmed(false)}
        className={`btn h-8 px-2 text-[12px] ${armed ? "bg-negative text-white" : "text-muted hover:bg-subtle hover:text-negative"}`}
        aria-label="Delete backup"
        title="Delete backup"
      >
        {armed ? "Delete?" : <Trash2 className="size-4" />}
      </button>
    </li>
  );
}

function RestoreForm({ backup }: { backup: BackupInfo }) {
  const [state, action, pending] = useActionState(restoreAction, undefined);
  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <input type="hidden" name="name" value={backup.name} />
      <div className="rounded-xl bg-negative/10 px-4 py-3 text-[13px]">
        <p className="font-medium text-negative">This replaces everything in your Hub</p>
        <p className="mt-1">
          All your current data will be swapped for the backup from <b>{fmt.format(new Date(backup.createdAt))}</b>. A safety backup of what you have now is made first, so you can undo this.
          You&apos;ll be signed out afterwards — sign in with the password you had at the time of the backup.
        </p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">Type RESTORE to confirm</label>
        <input id="confirm" name="confirm" autoComplete="off" className="input" required />
      </div>
      <FormError message={state?.error} />
      <button type="submit" disabled={pending} className="btn w-full bg-negative text-white hover:opacity-90">
        {pending ? "Restoring… don't close this page" : "Restore backup"}
      </button>
    </form>
  );
}
