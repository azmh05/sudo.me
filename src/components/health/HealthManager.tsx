"use client";

import { CalendarPlus, Check, ClipboardList, HeartPulse, Pencil, Plus, Stethoscope } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import {
  completeAppointment,
  deleteAppointment,
  deleteCheckup,
  saveAppointment,
  saveCheckup,
  saveHealthProfile,
  setCheckupActive,
} from "@/app/actions/health";
import { formatDay, formatTime, todayISO } from "@/lib/dates";
import { checkupStage, relativeDay } from "@/lib/health-math";
import { intervalLabel, UNIT_LABEL } from "@/lib/schedule";
import {
  BOOKED_VIA_LABEL,
  type AccountOption,
  type ActionResult,
  type AppointmentRow,
  type BookedViaKey,
  type CategoryOption,
  type CheckupRow,
  type HealthProfileRow,
} from "@/lib/types";
import { cn, formatRM } from "@/lib/utils";
import { ToneBadge } from "../DueBadge";
import { ConfirmDelete, FormError, Modal } from "../Modal";
import { MoneyInput } from "../MoneyInput";
import { EmptyState } from "../ui";

type Open =
  | { mode: "checkup"; checkup?: CheckupRow }
  | { mode: "appointment"; appointment?: AppointmentRow; checkup?: CheckupRow }
  | { mode: "complete"; appointment: AppointmentRow }
  | { mode: "profile" }
  | null;

const CHECKUP_SUGGESTIONS = ["Dental scaling", "Dental check-up", "General health screening", "Eye test", "Blood test", "Vaccination"];

function useRun(onDone: () => void) {
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r?.ok) onDone();
      else setResult(r);
    });
  return { result, busy, run };
}

function when(a: AppointmentRow) {
  return `${formatDay(a.date)}${a.time ? `, ${formatTime(a.time)}` : ""}`;
}

export function HealthManager({
  checkups,
  upcoming,
  pending,
  past,
  profile,
  accounts,
  categories,
}: {
  checkups: CheckupRow[];
  upcoming: AppointmentRow[];
  pending: AppointmentRow[];
  past: AppointmentRow[];
  profile: HealthProfileRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const activeCheckups = checkups.filter((c) => c.active);
  const paused = checkups.filter((c) => !c.active);

  const title =
    open?.mode === "checkup" ? (open.checkup ? "Edit check-up" : "New recurring check-up") :
    open?.mode === "appointment" ? (open.appointment ? "Edit appointment" : open.checkup ? `Book: ${open.checkup.name}` : "New appointment") :
    open?.mode === "complete" ? `Done: ${open.appointment.title}` :
    open?.mode === "profile" ? "Health info" : "";

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {pending.length > 0 && (
            <div className="card overflow-hidden border-warning/40">
              <div className="border-b border-line bg-warning/5 px-5 py-3">
                <h2 className="text-[15px] font-medium">How did it go?</h2>
                <p className="text-[13px] text-muted">These appointments have passed. Mark them done to schedule the next one.</p>
              </div>
              <ul className="divide-y divide-line">
                {pending.map((a) => (
                  <AppointmentLine key={a.id} appt={a} onEdit={() => setOpen({ mode: "appointment", appointment: a })} onDone={() => setOpen({ mode: "complete", appointment: a })} />
                ))}
              </ul>
            </div>
          )}

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div>
                <h2 className="text-[15px] font-medium">Recurring check-ups</h2>
                <p className="text-[12px] text-muted">Reminds you when it&apos;s time to book</p>
              </div>
              <button type="button" onClick={() => setOpen({ mode: "checkup" })} className="btn-ghost h-9 px-3 text-[13px]">
                <Plus className="size-4" /> Add
              </button>
            </div>
            {activeCheckups.length === 0 ? (
              <EmptyState icon={Stethoscope} title="No check-ups yet" text="Add things you do regularly, like dental scaling every 6 months." />
            ) : (
              <ul className="divide-y divide-line">
                {activeCheckups.map((c) => {
                  const st = checkupStage(c);
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                      <button type="button" onClick={() => setOpen({ mode: "checkup", checkup: c })} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-[15px] font-medium">{c.name}</span>
                          <ToneBadge tone={st.tone} label={st.label} />
                        </div>
                        <p className="mt-0.5 truncate text-[13px] text-muted">
                          {[intervalLabel(c.intervalValue, c.intervalUnit), c.place, c.lastDoneDate ? `last done ${formatDay(c.lastDoneDate)}` : null].filter(Boolean).join(" · ")}
                        </p>
                      </button>
                      {st.stage === "booked" ? (
                        <button type="button" onClick={() => setOpen({ mode: "appointment", appointment: c.booked! })} className="btn h-9 shrink-0 border border-line px-3 text-[13px] hover:bg-subtle">
                          View
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpen({ mode: "appointment", checkup: c })}
                          className={cn("btn h-9 shrink-0 px-3 text-[13px]", st.stage === "book" ? "bg-accent text-accent-ink hover:opacity-90" : "border border-line hover:bg-subtle")}
                        >
                          <CalendarPlus className="size-4" strokeWidth={1.75} /> Booked it
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {paused.length > 0 && (
              <details className="border-t border-line px-5 py-3">
                <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">Paused ({paused.length})</summary>
                <ul className="mt-2 space-y-1">
                  {paused.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setOpen({ mode: "checkup", checkup: c })} className="text-[14px] text-muted hover:text-ink">
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="text-[15px] font-medium">Upcoming appointments</h2>
              <button type="button" onClick={() => setOpen({ mode: "appointment" })} className="btn-primary h-9 px-3 text-[13px]">
                <Plus className="size-4" /> Add appointment
              </button>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={HeartPulse} title="Nothing booked" text="After booking in MySejahtera or by phone, add it here to get reminders." />
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((a) => (
                  <AppointmentLine key={a.id} appt={a} onEdit={() => setOpen({ mode: "appointment", appointment: a })} />
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <details className="card overflow-hidden">
              <summary className="cursor-pointer px-5 py-3.5 text-[15px] font-medium">History ({past.length})</summary>
              <ul className="divide-y divide-line border-t border-line">
                {past.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[14px] font-medium">{a.title}</span>
                      {a.cost !== null && <span className="shrink-0 text-[13px] tabular-nums text-muted">{formatRM(a.cost)}</span>}
                    </div>
                    <p className="text-[13px] text-muted">{[formatDay(a.date), a.place].filter(Boolean).join(" · ")}</p>
                    {a.outcome && <p className="mt-1 whitespace-pre-line text-[13px]">{a.outcome}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <aside className="lg:col-span-1">
          <ProfileCard profile={profile} onEdit={() => setOpen({ mode: "profile" })} />
        </aside>
      </div>

      <Modal open={open !== null} onClose={close} title={title}>
        {open?.mode === "checkup" && <CheckupForm checkup={open.checkup} onDone={close} />}
        {open?.mode === "appointment" && (
          <AppointmentForm appointment={open.appointment} checkup={open.checkup} checkups={activeCheckups} onDone={close} onComplete={(a) => setOpen({ mode: "complete", appointment: a })} />
        )}
        {open?.mode === "complete" && <CompleteForm appointment={open.appointment} accounts={accounts} categories={categories} onDone={close} />}
        {open?.mode === "profile" && <ProfileForm profile={profile} onDone={close} />}
      </Modal>
    </>
  );
}

function AppointmentLine({ appt: a, onEdit, onDone }: { appt: AppointmentRow; onEdit: () => void; onDone?: () => void }) {
  const today = a.date === todayISO();
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <div className={cn("grid w-12 shrink-0 place-items-center rounded-xl py-1.5 text-center", today ? "bg-accent text-accent-ink" : "bg-subtle")}>
        <span className="text-[11px] uppercase leading-tight">
          {new Intl.DateTimeFormat("en-MY", { month: "short", timeZone: "UTC" }).format(new Date(`${a.date}T00:00:00Z`))}
        </span>
        <span className="text-[17px] font-semibold leading-tight">{Number(a.date.slice(8))}</span>
      </div>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15px] font-medium">{a.title}</p>
        <p className="truncate text-[13px] text-muted">
          {[`${relativeDay(a.date)}${a.time ? ` · ${formatTime(a.time)}` : ""}`, a.place, a.reference ? `Ref ${a.reference}` : null].filter(Boolean).join(" · ")}
        </p>
        {a.note && <p className="truncate text-[12px] text-warning">{a.note}</p>}
      </button>
      {onDone && (
        <button type="button" onClick={onDone} className="btn h-9 shrink-0 border border-line px-3 text-[13px] hover:bg-subtle">
          <Check className="size-4" strokeWidth={2} /> Done
        </button>
      )}
    </li>
  );
}

function ProfileCard({ profile: p, onEdit }: { profile: HealthProfileRow; onEdit: () => void }) {
  const rows: [string, string | null][] = [
    ["Blood type", p.bloodType],
    ["Allergies", p.allergies],
    ["Regular medicines", p.medications],
    ["Conditions", p.conditions],
    ["Emergency contact", p.emergencyName ? `${p.emergencyName}${p.emergencyRelation ? ` (${p.emergencyRelation})` : ""}${p.emergencyPhone ? ` · ${p.emergencyPhone}` : ""}` : null],
    ["Notes", p.note],
  ];
  const empty = rows.every(([, v]) => !v);
  return (
    <section className="card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 text-[15px] font-medium">
          <ClipboardList className="size-4 text-muted" strokeWidth={1.75} /> Health info
        </h2>
        <button type="button" onClick={onEdit} className="btn-ghost h-8 px-2.5 text-[13px]">
          <Pencil className="size-3.5" /> Edit
        </button>
      </div>
      {empty ? (
        <p className="px-5 py-6 text-[13px] text-muted">Keep your blood type, allergies, medicines and an emergency contact handy for clinic forms.</p>
      ) : (
        <dl className="divide-y divide-line">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="px-5 py-3">
              <dt className="text-[12px] text-muted">{k}</dt>
              <dd className="mt-0.5 whitespace-pre-line text-[14px]">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function CheckupForm({ checkup, onDone }: { checkup?: CheckupRow; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveCheckup, undefined);
  const { result, busy, run } = useRun(onDone);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {checkup && <input type="hidden" name="id" value={checkup.id} />}
      <div>
        <label htmlFor="name" className="label">Check-up</label>
        <input id="name" name="name" list="checkup-names" autoComplete="off" defaultValue={checkup?.name ?? ""} maxLength={80} placeholder="e.g. Dental scaling" className="input" required autoFocus={!checkup} />
        <datalist id="checkup-names">
          {CHECKUP_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      <div>
        <span className="label">Repeats every</span>
        <div className="grid grid-cols-2 gap-3">
          <input name="intervalValue" inputMode="numeric" defaultValue={checkup?.intervalValue ?? 6} aria-label="Interval" className="input" required />
          <select name="intervalUnit" defaultValue={checkup?.intervalUnit ?? "MONTH"} aria-label="Interval unit" className="input">
            {Object.entries(UNIT_LABEL).map(([k, [, plural]]) => <option key={k} value={k}>{plural}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lastDoneDate" className="label">Last done</label>
          <input id="lastDoneDate" name="lastDoneDate" type="date" defaultValue={checkup?.lastDoneDate ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="nextDueDate" className="label">Next due</label>
          <input id="nextDueDate" name="nextDueDate" type="date" defaultValue={checkup?.nextDueDate ?? ""} className="input" />
        </div>
      </div>
      <p className="-mt-2 text-[12px] text-muted">Leave “Next due” empty and it&apos;s worked out from “Last done”.</p>
      <div>
        <label htmlFor="bookLeadDays" className="label">Remind me to book</label>
        <select id="bookLeadDays" name="bookLeadDays" defaultValue={String(checkup?.bookLeadDays ?? 21)} className="input">
          {[1, 3, 7, 14, 21, 30, 45, 60].map((d) => <option key={d} value={d}>{d === 1 ? "1 day" : `${d} days`} before it&apos;s due</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="place" className="label">Usual clinic (optional)</label>
        <input id="place" name="place" autoComplete="off" defaultValue={checkup?.place ?? ""} maxLength={120} placeholder="e.g. Klinik Pergigian Kerajaan …" className="input" />
      </div>
      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input id="note" name="note" autoComplete="off" defaultValue={checkup?.note ?? ""} maxLength={255} placeholder="e.g. Book via MySejahtera" className="input" />
      </div>
      <FormError message={state?.error ?? result?.error} />
      <div className="flex flex-wrap items-center gap-2">
        {checkup && (
          <>
            <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteCheckup(checkup.id))} />
            <button type="button" disabled={busy} onClick={() => run(() => setCheckupActive(checkup.id, !checkup.active))} className="btn-ghost h-10 px-3 text-[14px]">
              {checkup.active ? "Pause" : "Resume"}
            </button>
          </>
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : checkup ? "Save changes" : "Add check-up"}
        </button>
      </div>
    </form>
  );
}

function AppointmentForm({
  appointment: a,
  checkup,
  checkups,
  onDone,
  onComplete,
}: {
  appointment?: AppointmentRow;
  checkup?: CheckupRow;
  checkups: CheckupRow[];
  onDone: () => void;
  onComplete: (a: AppointmentRow) => void;
}) {
  const [state, action, saving] = useActionState(saveAppointment, undefined);
  const { result, busy, run } = useRun(onDone);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div>
        <label htmlFor="title" className="label">Appointment</label>
        <input id="title" name="title" autoComplete="off" defaultValue={a?.title ?? checkup?.name ?? ""} maxLength={100} placeholder="e.g. Dental scaling, Specialist follow-up" className="input" required autoFocus={!a && !checkup} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input id="date" name="date" type="date" defaultValue={a?.date ?? ""} className="input" required autoFocus={!!checkup} />
        </div>
        <div>
          <label htmlFor="time" className="label">Time (optional)</label>
          <input id="time" name="time" type="time" defaultValue={a?.time ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="place" className="label">Clinic / hospital</label>
        <input id="place" name="place" autoComplete="off" defaultValue={a?.place ?? checkup?.place ?? ""} maxLength={120} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="bookedVia" className="label">Booked via</label>
          <select id="bookedVia" name="bookedVia" defaultValue={a?.bookedVia ?? "MYSEJAHTERA"} className="input">
            {(Object.keys(BOOKED_VIA_LABEL) as BookedViaKey[]).map((k) => <option key={k} value={k}>{BOOKED_VIA_LABEL[k]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="reference" className="label">Reference no.</label>
          <input id="reference" name="reference" autoComplete="off" defaultValue={a?.reference ?? ""} maxLength={60} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="checkupId" className="label">Part of a recurring check-up?</label>
        <select id="checkupId" name="checkupId" defaultValue={a?.checkupId ?? checkup?.id ?? ""} className="input">
          <option value="">No, one-off</option>
          {checkups.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="note" className="label">Prepare / remember (optional)</label>
        <input id="note" name="note" autoComplete="off" defaultValue={a?.note ?? ""} maxLength={500} placeholder="e.g. Fast 8 hours before, bring IC" className="input" />
      </div>
      <FormError message={state?.error ?? result?.error} />
      <div className="flex flex-wrap items-center gap-2">
        {a && (
          <>
            <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteAppointment(a.id))} />
            {a.status === "BOOKED" && a.date <= todayISO() && (
              <button type="button" onClick={() => onComplete(a)} className="btn-ghost h-10 px-3 text-[14px]">
                <Check className="size-4" /> Mark done
              </button>
            )}
          </>
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : a ? "Save changes" : "Save appointment"}
        </button>
      </div>
    </form>
  );
}

function CompleteForm({
  appointment: a,
  accounts,
  categories,
  onDone,
}: {
  appointment: AppointmentRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [state, action, saving] = useActionState(completeAppointment, undefined);
  const [cost, setCost] = useState("");
  const [record, setRecord] = useState(true);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const expenseCats = categories.filter((c) => c.kind === "EXPENSE" && !c.archived);
  const usableAccounts = accounts.filter((x) => !x.archived);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <input type="hidden" name="id" value={a.id} />
      <p className="text-[13px] text-muted">{[when(a), a.place].filter(Boolean).join(" · ")}</p>
      <div>
        <label htmlFor="outcome" className="label">What did the doctor say? (optional)</label>
        <textarea id="outcome" name="outcome" rows={3} maxLength={5000} placeholder="e.g. All good, come back in 6 months" className="input h-auto py-2.5" />
      </div>
      <div>
        <label htmlFor="cost" className="label">Cost (optional)</label>
        <MoneyInput id="cost" name="cost" value={cost} onValueChange={setCost} className="input" />
      </div>
      {cost.trim() !== "" && (
        <>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
            <input type="checkbox" name="record" checked={record} onChange={(e) => setRecord(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
            <span className="text-[14px]">
              Add as an expense in Finance
              <span className="block text-[12px] text-muted">Updates your balance and budget.</span>
            </span>
          </label>
          {record && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="accountId" className="label">Paid from</label>
                <select id="accountId" name="accountId" defaultValue={usableAccounts[0]?.id} className="input">
                  {usableAccounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="categoryId" className="label">Category</label>
                <select id="categoryId" name="categoryId" defaultValue={expenseCats.find((c) => c.name === "Health")?.id ?? ""} className="input">
                  <option value="">No category</option>
                  {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </>
      )}
      {a.checkupId && <p className="rounded-xl bg-subtle px-3.5 py-2.5 text-[13px] text-muted">The next check-up date will be scheduled automatically.</p>}
      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : "Mark as done"}</button>
    </form>
  );
}

function ProfileForm({ profile: p, onDone }: { profile: HealthProfileRow; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveHealthProfile, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <div>
        <label htmlFor="bloodType" className="label">Blood type</label>
        <select id="bloodType" name="bloodType" defaultValue={p.bloodType ?? ""} className="input">
          <option value="">Not set</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      {([
        ["allergies", "Allergies", p.allergies, "e.g. Penicillin, peanuts"],
        ["medications", "Regular medicines", p.medications, "e.g. Inhaler as needed"],
        ["conditions", "Conditions", p.conditions, "e.g. Asthma"],
      ] as const).map(([name, label, value, ph]) => (
        <div key={name}>
          <label htmlFor={name} className="label">{label}</label>
          <textarea id={name} name={name} rows={2} maxLength={500} defaultValue={value ?? ""} placeholder={ph} className="input h-auto py-2.5" />
        </div>
      ))}
      <div>
        <span className="label">Emergency contact</span>
        <div className="grid grid-cols-2 gap-3">
          <input name="emergencyName" autoComplete="off" defaultValue={p.emergencyName ?? ""} maxLength={80} placeholder="Name" aria-label="Emergency contact name" className="input" />
          <input name="emergencyRelation" autoComplete="off" defaultValue={p.emergencyRelation ?? ""} maxLength={40} placeholder="e.g. Father" aria-label="Relationship" className="input" />
        </div>
        <input name="emergencyPhone" autoComplete="off" inputMode="tel" defaultValue={p.emergencyPhone ?? ""} maxLength={30} placeholder="Phone number" aria-label="Emergency contact phone" className="input mt-3" />
      </div>
      <div>
        <label htmlFor="note" className="label">Notes</label>
        <textarea id="note" name="note" rows={2} maxLength={500} defaultValue={p.note ?? ""} className="input h-auto py-2.5" />
      </div>
      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : "Save"}</button>
    </form>
  );
}
