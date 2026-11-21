"use client";

import {
  AlertTriangle,
  Briefcase,
  CarFront,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderLock,
  GraduationCap,
  HeartPulse,
  ImageIcon,
  Landmark,
  Package,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteRecord, deleteRecordFile, revealRecordNumber, saveRecord, uploadRecordFile } from "@/app/actions/records";
import { formatDay, todayISO } from "@/lib/dates";
import { expiryInfo } from "@/lib/schedule";
import {
  RECORD_CATEGORY_HINT,
  RECORD_CATEGORY_LABEL,
  type ActionResult,
  type RecordCategoryKey,
  type RecordFileRow,
  type RecordRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { DueBadge } from "../DueBadge";
import { ConfirmDelete, FormError, Modal } from "../Modal";
import { EmptyState } from "../ui";

const ICON: Record<RecordCategoryKey, LucideIcon> = {
  IDENTITY: UserRound,
  VEHICLE: CarFront,
  INSURANCE: ShieldCheck,
  EDUCATION: GraduationCap,
  FINANCE: Landmark,
  WORK: Briefcase,
  HEALTH: HeartPulse,
  PURCHASE: Package,
  OTHER: FileText,
};
const ORDER = Object.keys(RECORD_CATEGORY_LABEL) as RecordCategoryKey[];

type Open = { mode: "new" } | { mode: "view"; id: number } | null;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const needsAttention = (r: RecordRow) => r.expiryDate !== null && expiryInfo(r.expiryDate, r.remindDays).tone !== "later";

export function RecordsManager({ records, keyReady }: { records: RecordRow[]; keyReady: boolean }) {
  const [open, setOpen] = useState<Open>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<RecordCategoryKey | "">("");
  const close = useCallback(() => setOpen(null), []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return records.filter(
      (r) =>
        (!cat || r.category === cat) &&
        (!term ||
          [r.title, r.issuer, r.note, RECORD_CATEGORY_LABEL[r.category]].some((t) => t?.toLowerCase().includes(term))),
    );
  }, [records, q, cat]);

  const attention = records
    .filter(needsAttention)
    .sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!));
  const expired = attention.filter((r) => expiryInfo(r.expiryDate!, r.remindDays).tone === "overdue").length;
  const viewing = open?.mode === "view" ? records.find((r) => r.id === open.id) : undefined;

  return (
    <>
      {!keyReady && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-[13px]">
          <AlertTriangle className="size-5 shrink-0 text-warning" strokeWidth={1.75} />
          <p>
            <span className="font-medium">Encryption isn&apos;t set up yet.</span> You can save records, but document numbers and
            file uploads need an <code className="rounded bg-surface px-1">ENCRYPTION_KEY</code> in your <code className="rounded bg-surface px-1">.env</code> file. See the Step 4 notes.
          </p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Records", value: records.length },
          { label: "Expiring soon", value: attention.length - expired },
          { label: "Expired", value: expired },
        ].map((s) => (
          <div key={s.label} className="card p-4 sm:p-5">
            <p className="text-[12px] text-muted sm:text-[13px]">{s.label}</p>
            <p className={cn("mt-1 text-[22px] font-semibold tabular-nums sm:text-[24px]", s.label === "Expired" && s.value > 0 && "text-negative")}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {attention.length > 0 && (
        <div className="card mb-4 overflow-hidden">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-[15px] font-medium">Needs attention</h2>
          </div>
          <ul className="divide-y divide-line">
            {attention.map((r) => (
              <RecordLine key={r.id} record={r} onOpen={() => setOpen({ mode: "view", id: r.id })} />
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="Search records" aria-label="Search records" className="input h-10 pl-10 text-[14px]" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value as RecordCategoryKey | "")} aria-label="Category" className="input h-10 w-auto text-[14px]">
          <option value="">All categories</option>
          {ORDER.map((c) => <option key={c} value={c}>{RECORD_CATEGORY_LABEL[c]}</option>)}
        </select>
        <button type="button" onClick={() => setOpen({ mode: "new" })} className="btn-primary h-10">
          <Plus className="size-[18px]" strokeWidth={2} /> Add record
        </button>
      </div>

      {records.length === 0 ? (
        <div className="card">
          <EmptyState icon={FolderLock} title="No records yet" text="Add your IC, driving licence, certificates or insurance — with expiry reminders and encrypted scans." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Search} title="Nothing matches" text="Try a different search or category." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ORDER.filter((c) => filtered.some((r) => r.category === c)).map((c) => {
            const Icon = ICON[c];
            return (
              <section key={c} className="card self-start overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line px-5 py-3">
                  <Icon className="size-4 text-muted" strokeWidth={1.75} />
                  <h2 className="text-[14px] font-medium">{RECORD_CATEGORY_LABEL[c]}</h2>
                </div>
                <ul className="divide-y divide-line">
                  {filtered.filter((r) => r.category === c).map((r) => (
                    <RecordLine key={r.id} record={r} onOpen={() => setOpen({ mode: "view", id: r.id })} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Modal open={open !== null} onClose={close} title={open?.mode === "new" ? "New record" : viewing?.title ?? "Record"}>
        {open?.mode === "new" && <RecordForm onSaved={(id) => setOpen({ mode: "view", id })} onDone={close} />}
        {open?.mode === "view" &&
          (viewing ? (
            <RecordDetail key={viewing.id} record={viewing} keyReady={keyReady} onDone={close} />
          ) : (
            <p className="py-6 text-center text-[13px] text-muted">Loading…</p>
          ))}
      </Modal>
    </>
  );
}

function RecordLine({ record: r, onOpen }: { record: RecordRow; onOpen: () => void }) {
  const sub = [r.issuer, r.hasNumber ? `•••• ${r.numberLast4 ?? ""}`.trim() : null].filter(Boolean).join(" · ");
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-subtle/60">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{r.title}</span>
          {sub && <span className="block truncate text-[13px] text-muted">{sub}</span>}
        </span>
        {r.files.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted">
            <Paperclip className="size-3.5" /> {r.files.length}
          </span>
        )}
        {r.expiryDate && <DueBadge date={r.expiryDate} variant="expiry" remindDays={r.remindDays} className="shrink-0" />}
      </button>
    </li>
  );
}

function RecordDetail({ record, keyReady, onDone }: { record: RecordRow; keyReady: boolean; onDone: () => void }) {
  return (
    <div className="space-y-5">
      {record.hasNumber && <NumberReveal record={record} />}
      <FilesSection record={record} keyReady={keyReady} />
      <div className="border-t border-line pt-4">
        <p className="mb-3 text-[13px] font-medium">Details</p>
        <RecordForm record={record} onDone={onDone} />
        <p className="mt-3 text-[12px] text-muted">
          Last updated{" "}
          {new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(record.updatedAt))}
        </p>
      </div>
    </div>
  );
}

function NumberReveal({ record }: { record: RecordRow }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  // Hide the number again after 30 seconds.
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(() => setValue(null), 30_000);
    return () => clearTimeout(t);
  }, [value]);

  const show = () =>
    start(async () => {
      const r = await revealRecordNumber(record.id);
      if (r?.ok && r.value) {
        setValue(r.value);
        setError(undefined);
      } else setError(r?.error);
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy isn't available here. Select the number and copy it manually.");
    }
  };

  return (
    <div className="rounded-xl bg-subtle px-4 py-3">
      <p className="text-[12px] text-muted">Document number</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[16px] tracking-wide select-all">
          {value ?? `•••• •••• ${record.numberLast4 ?? ""}`}
        </span>
        {value && (
          <button type="button" onClick={copy} className="btn-ghost h-8 px-2 text-[13px]" aria-label="Copy number">
            <Copy className="size-4" /> {copied ? "Copied" : ""}
          </button>
        )}
        <button type="button" onClick={() => (value ? setValue(null) : show())} disabled={pending} className="btn-ghost h-8 px-2 text-[13px]">
          {value ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {value ? "Hide" : pending ? "…" : "Show"}
        </button>
      </div>
      {error && <p className="mt-1 text-[12px] text-negative">{error}</p>}
    </div>
  );
}

function FilesSection({ record, keyReady }: { record: RecordRow; keyReady: boolean }) {
  const [state, action, uploading] = useActionState(uploadRecordFile, undefined);
  const [inputKey, setInputKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) setInputKey((k) => k + 1);
  }, [state]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-medium">Files {record.files.length > 0 && <span className="text-muted">({record.files.length})</span>}</p>
        <span className="text-[12px] text-muted">Stored encrypted on your laptop</span>
      </div>

      {record.files.length > 0 && (
        <ul className="mb-3 divide-y divide-line rounded-xl border border-line">
          {record.files.map((f) => <FileLine key={f.id} file={f} />)}
        </ul>
      )}

      <form ref={formRef} action={action}>
        <input type="hidden" name="recordId" value={record.id} />
        <label
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-4 text-[14px] text-muted transition hover:border-muted hover:text-ink",
            (!keyReady || uploading) && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="size-4" strokeWidth={1.75} />
          {uploading ? "Encrypting & uploading…" : "Upload PDF or photo (max 8 MB)"}
          <input
            key={inputKey}
            type="file"
            name="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={!keyReady || uploading}
            onChange={(e) => e.currentTarget.files?.length && formRef.current?.requestSubmit()}
          />
        </label>
      </form>
      <div className="mt-2">
        <FormError message={state?.error} />
      </div>
    </div>
  );
}

function FileLine({ file: f }: { file: RecordFileRow }) {
  const [pending, start] = useTransition();
  const isImage = f.mimeType.startsWith("image/");
  const url = `/api/files/${f.id}`;

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-10 shrink-0 rounded-lg border border-line object-cover" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-subtle">
            {f.mimeType === "application/pdf" ? <FileText className="size-[18px] text-muted" strokeWidth={1.75} /> : <ImageIcon className="size-[18px] text-muted" />}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium hover:underline">{f.name}</span>
          <span className="block text-[12px] text-muted">{formatBytes(f.size)} · {formatDay(todayISO(new Date(f.createdAt)))}</span>
        </span>
      </a>
      <a href={`${url}?download=1`} className="btn-ghost h-8 px-2" aria-label="Download">
        <Download className="size-4" />
      </a>
      <ConfirmDelete label="Delete" pending={pending} onConfirm={() => start(async () => void (await deleteRecordFile(f.id)))} />
    </li>
  );
}

function RecordForm({ record, onSaved, onDone }: { record?: RecordRow; onSaved?: (id: number) => void; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveRecord, undefined);
  const [category, setCategory] = useState<RecordCategoryKey>(record?.category ?? "IDENTITY");
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();

  const handled = useRef<ActionResult>(undefined);
  useEffect(() => {
    if (!state?.ok || handled.current === state) return;
    handled.current = state;
    if (!record && state.id && onSaved) onSaved(state.id);
    else onDone();
  }, [state, record, onSaved, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {record && <input type="hidden" name="id" value={record.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" autoComplete="off" defaultValue={record?.title ?? ""} maxLength={100} placeholder="e.g. MyKad (IC)" className="input" required autoFocus={!record} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value as RecordCategoryKey)} className="input">
            {ORDER.map((c) => <option key={c} value={c}>{RECORD_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
      </div>
      <p className="-mt-2 text-[12px] text-muted">{RECORD_CATEGORY_HINT[category]}</p>

      <div>
        <label htmlFor="number" className="label">Document number (optional · encrypted)</label>
        <input
          id="number"
          name="number"
          autoComplete="off"
          maxLength={100}
          placeholder={record?.hasNumber ? `Saved (ends ${record.numberLast4 ?? "…"}) — type to replace` : "e.g. IC or policy number"}
          className="input font-mono"
        />
        {record?.hasNumber && (
          <label className="mt-2 flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" name="clearNumber" className="size-4 accent-[var(--accent)]" /> Remove saved number
          </label>
        )}
      </div>

      <div>
        <label htmlFor="issuer" className="label">Issued by (optional)</label>
        <input id="issuer" name="issuer" autoComplete="off" defaultValue={record?.issuer ?? ""} maxLength={100} placeholder="e.g. JPN, JPJ, university, insurer" className="input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="issueDate" className="label">Issue date</label>
          <input id="issueDate" name="issueDate" type="date" defaultValue={record?.issueDate ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="expiryDate" className="label">Expiry date</label>
          <input id="expiryDate" name="expiryDate" type="date" defaultValue={record?.expiryDate ?? ""} className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="remindDays" className="label">Remind me before expiry</label>
        <select id="remindDays" name="remindDays" defaultValue={String(record?.remindDays ?? 30)} className="input">
          {[1, 3, 7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d === 1 ? "1 day" : `${d} days`} before</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="note" className="label">Notes (optional)</label>
        <textarea id="note" name="note" defaultValue={record?.note ?? ""} maxLength={5000} rows={3} placeholder="e.g. Renew at UTC; original kept in the blue file" className="input h-auto py-2.5" />
      </div>

      <FormError message={state?.error ?? result?.error} />

      <div className="flex items-center gap-2">
        {record && (
          <ConfirmDelete
            pending={busy}
            onConfirm={() =>
              start(async () => {
                const r = await deleteRecord(record.id);
                if (r?.ok) onDone();
                else setResult(r);
              })
            }
          />
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : record ? "Save changes" : "Create record"}
        </button>
      </div>
      {!record && <p className="text-[12px] text-muted">After creating it, you can upload scans or photos.</p>}
    </form>
  );
}
