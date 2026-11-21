"use client";

import { Award, BadgeCheck, Briefcase, GraduationCap, Mail, MapPin, Pencil, Phone, Plus, Sparkles, type LucideIcon } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { deleteProfileEntry, saveProfileEntry, saveProfileInfo } from "@/app/actions/profile";
import { formatLongDate, formatMonthYear, todayISO } from "@/lib/dates";
import type { ActionResult, ProfileEntryRow, ProfileInfoRow, ProfileKind, ProfilePhotoRow } from "@/lib/types";
import { Avatar } from "../Avatar";
import { PhotoPicker } from "./PhotoPicker";
import { ConfirmDelete, FormError, Modal } from "../Modal";

type KindConfig = {
  label: string;
  icon: LucideIcon;
  add: string;
  title: [string, string];
  organisation?: [string, string];
  detail?: [string, string];
  dates: "range" | "single" | "issued" | "none";
  currentLabel?: string;
  empty: string;
};

const KIND: Record<ProfileKind, KindConfig> = {
  EDUCATION: {
    label: "Education",
    icon: GraduationCap,
    add: "Add education",
    title: ["Qualification / programme", "e.g. Diploma in Computer Science"],
    organisation: ["Institution", "e.g. UiTM, Politeknik, SMK …"],
    detail: ["Result", "e.g. CGPA 3.72, 8A"],
    dates: "range",
    currentLabel: "I'm currently studying here",
    empty: "Schools, diplomas, degrees.",
  },
  WORK: {
    label: "Work & internships",
    icon: Briefcase,
    add: "Add experience",
    title: ["Role", "e.g. IT Intern"],
    organisation: ["Company / organisation", "e.g. Telekom Malaysia"],
    detail: ["Type", "e.g. Internship, Part-time"],
    dates: "range",
    currentLabel: "I currently work here",
    empty: "Internships, part-time and full-time jobs.",
  },
  SKILL: {
    label: "Skills",
    icon: Sparkles,
    add: "Add skill",
    title: ["Skill", "e.g. Python, Video editing"],
    detail: ["Level (optional)", "e.g. Beginner, Intermediate, Advanced"],
    dates: "none",
    empty: "Languages, tools and things you're good at.",
  },
  CERTIFICATION: {
    label: "Certifications",
    icon: BadgeCheck,
    add: "Add certification",
    title: ["Certificate", "e.g. Google IT Support"],
    organisation: ["Issued by", "e.g. Coursera, Cisco"],
    detail: ["Credential ID (optional)", ""],
    dates: "issued",
    empty: "Courses and professional certificates.",
  },
  ACHIEVEMENT: {
    label: "Achievements",
    icon: Award,
    add: "Add achievement",
    title: ["Achievement", "e.g. Dean's List, Hackathon 2nd place"],
    organisation: ["Awarded by / event (optional)", ""],
    dates: "single",
    empty: "Awards, competitions and milestones you're proud of.",
  },
};

const ORDER: ProfileKind[] = ["EDUCATION", "WORK", "SKILL", "CERTIFICATION", "ACHIEVEMENT"];

type Open = { mode: "info" } | { mode: "photo" } | { mode: "entry"; kind: ProfileKind; entry?: ProfileEntryRow } | null;

function age(dob: string) {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = todayISO().split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

function period(e: ProfileEntryRow, mode: KindConfig["dates"]) {
  if (mode === "none") return null;
  if (mode === "single") return e.startDate ? formatMonthYear(e.startDate) : null;
  if (mode === "issued") {
    return [e.startDate ? `Issued ${formatMonthYear(e.startDate)}` : null, e.endDate ? `expires ${formatMonthYear(e.endDate)}` : null]
      .filter(Boolean)
      .join(" · ") || null;
  }
  if (!e.startDate && !e.endDate && !e.current) return null;
  return `${e.startDate ? formatMonthYear(e.startDate) : "?"} – ${e.current ? "Present" : e.endDate ? formatMonthYear(e.endDate) : "?"}`;
}

export function ProfileManager({ info, entries, photos }: { info: ProfileInfoRow; entries: ProfileEntryRow[]; photos: ProfilePhotoRow[] }) {
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const name = info.fullName || "Your name";
  const contact: [LucideIcon, string | null][] = [
    [Phone, info.phone],
    [Mail, info.email],
    [MapPin, info.address],
  ];

  return (
    <>
      <section className="card mb-4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => setOpen({ mode: "photo" })} className="group relative shrink-0 rounded-full" title="Change picture">
            <Avatar photoId={info.photoId} name={info.preferredName || info.fullName || "?"} className="size-16 text-[22px]" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              Change
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold tracking-tight">{name}</h2>
            <p className="text-[13px] text-muted">
              {[info.preferredName ? `Goes by ${info.preferredName}` : null, info.dateOfBirth ? `${age(info.dateOfBirth)} years old · born ${formatLongDate(info.dateOfBirth).replace(/^\w+, /, "")}` : null]
                .filter(Boolean)
                .join(" · ") || "Add your details"}
            </p>
          </div>
          <button type="button" onClick={() => setOpen({ mode: "info" })} className="btn-ghost h-9 shrink-0 px-3 text-[13px]">
            <Pencil className="size-3.5" /> Edit
          </button>
        </div>
        {contact.some(([, v]) => v) && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {contact.filter(([, v]) => v).map(([Icon, v]) => (
              <li key={v} className="flex items-center gap-1.5 text-muted">
                <Icon className="size-3.5" strokeWidth={1.75} />
                <span className="text-ink">{v}</span>
              </li>
            ))}
          </ul>
        )}
        {info.about && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-[14px] leading-relaxed">{info.about}</p>}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ORDER.map((kind) => {
          const cfg = KIND[kind];
          const list = entries.filter((e) => e.kind === kind);
          const Icon = cfg.icon;
          return (
            <section key={kind} className="card self-start overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <h2 className="flex items-center gap-2 text-[15px] font-medium">
                  <Icon className="size-4 text-muted" strokeWidth={1.75} /> {cfg.label}
                </h2>
                <button type="button" onClick={() => setOpen({ mode: "entry", kind })} className="btn-ghost h-8 px-2.5 text-[13px]" aria-label={cfg.add}>
                  <Plus className="size-4" /> Add
                </button>
              </div>
              {list.length === 0 ? (
                <p className="px-5 py-5 text-[13px] text-muted">{cfg.empty}</p>
              ) : kind === "SKILL" ? (
                <div className="flex flex-wrap gap-2 p-4">
                  {list.map((e) => (
                    <button key={e.id} type="button" onClick={() => setOpen({ mode: "entry", kind, entry: e })} className="rounded-full border border-line px-3 py-1.5 text-[13px] transition hover:bg-subtle">
                      {e.title}
                      {e.detail && <span className="text-muted"> · {e.detail}</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {list.map((e) => {
                    const when = period(e, cfg.dates);
                    return (
                      <li key={e.id}>
                        <button type="button" onClick={() => setOpen({ mode: "entry", kind, entry: e })} className="block w-full px-5 py-3.5 text-left transition-colors hover:bg-subtle/60">
                          <span className="block text-[14px] font-medium">{e.title}</span>
                          <span className="block text-[13px] text-muted">{[e.organisation, e.detail].filter(Boolean).join(" · ")}</span>
                          {when && <span className="block text-[12px] text-muted">{when}</span>}
                          {e.description && <span className="mt-1 line-clamp-2 block text-[13px]">{e.description}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Modal
        open={open !== null}
        onClose={close}
        title={open?.mode === "info" ? "Personal details" : open?.mode === "photo" ? "Profile picture" : open ? `${open.entry ? "Edit" : "Add"} · ${KIND[open.kind].label}` : ""}
      >
        {open?.mode === "info" && <InfoForm info={info} onDone={close} />}
        {open?.mode === "photo" && <PhotoPicker currentId={info.photoId} photos={photos} name={info.preferredName || info.fullName || "?"} />}
        {open?.mode === "entry" && <EntryForm kind={open.kind} entry={open.entry} onDone={close} />}
      </Modal>
    </>
  );
}

function InfoForm({ info, onDone }: { info: ProfileInfoRow; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveProfileInfo, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="fullName" className="label">Full name</label>
          <input id="fullName" name="fullName" autoComplete="off" defaultValue={info.fullName ?? ""} maxLength={120} className="input" />
        </div>
        <div>
          <label htmlFor="preferredName" className="label">Preferred name</label>
          <input id="preferredName" name="preferredName" autoComplete="off" defaultValue={info.preferredName ?? ""} maxLength={60} className="input" />
        </div>
        <div>
          <label htmlFor="dateOfBirth" className="label">Date of birth</label>
          <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={info.dateOfBirth ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone</label>
          <input id="phone" name="phone" autoComplete="off" inputMode="tel" defaultValue={info.phone ?? ""} maxLength={30} className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" autoComplete="off" inputMode="email" defaultValue={info.email ?? ""} maxLength={120} className="input" />
        </div>
        <div className="col-span-2">
          <label htmlFor="address" className="label">Address</label>
          <textarea id="address" name="address" rows={2} maxLength={300} defaultValue={info.address ?? ""} className="input h-auto py-2.5" />
        </div>
        <div className="col-span-2">
          <label htmlFor="about" className="label">About me (optional)</label>
          <textarea id="about" name="about" rows={3} maxLength={5000} defaultValue={info.about ?? ""} placeholder="A short summary — handy when writing a resume." className="input h-auto py-2.5" />
        </div>
      </div>
      <p className="text-[12px] text-muted">Your IC number belongs in Records, where it&apos;s stored encrypted.</p>
      <FormError message={state?.error} />
      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : "Save"}</button>
    </form>
  );
}

function EntryForm({ kind, entry, onDone }: { kind: ProfileKind; entry?: ProfileEntryRow; onDone: () => void }) {
  const cfg = KIND[kind];
  const [state, action, saving] = useActionState(saveProfileEntry, undefined);
  const [current, setCurrent] = useState(entry?.current ?? false);
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const month = (iso: string | null) => (iso ? iso.slice(0, 7) : "");
  const startLabel = cfg.dates === "issued" ? "Issued" : cfg.dates === "single" ? "Date" : "Start";
  const endLabel = cfg.dates === "issued" ? "Expires (optional)" : "End";

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="kind" value={kind} />
      <div>
        <label htmlFor="title" className="label">{cfg.title[0]}</label>
        <input id="title" name="title" autoComplete="off" defaultValue={entry?.title ?? ""} maxLength={160} placeholder={cfg.title[1]} className="input" required autoFocus={!entry} />
      </div>
      {cfg.organisation && (
        <div>
          <label htmlFor="organisation" className="label">{cfg.organisation[0]}</label>
          <input id="organisation" name="organisation" autoComplete="off" defaultValue={entry?.organisation ?? ""} maxLength={160} placeholder={cfg.organisation[1]} className="input" />
        </div>
      )}
      {cfg.detail && (
        <div>
          <label htmlFor="detail" className="label">{cfg.detail[0]}</label>
          <input id="detail" name="detail" autoComplete="off" defaultValue={entry?.detail ?? ""} maxLength={120} placeholder={cfg.detail[1]} className="input" />
        </div>
      )}
      {cfg.dates !== "none" && (
        <div className="grid grid-cols-2 gap-3">
          <div className={cfg.dates === "single" ? "col-span-2" : ""}>
            <label htmlFor="startDate" className="label">{startLabel}</label>
            <input id="startDate" name="startDate" type="month" defaultValue={month(entry?.startDate ?? null)} placeholder="YYYY-MM" className="input" />
          </div>
          {(cfg.dates === "range" || cfg.dates === "issued") && (
            <div>
              <label htmlFor="endDate" className="label">{endLabel}</label>
              <input id="endDate" name="endDate" type="month" defaultValue={month(entry?.endDate ?? null)} placeholder="YYYY-MM" disabled={current} className="input disabled:opacity-50" />
            </div>
          )}
        </div>
      )}
      {cfg.currentLabel && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="current" checked={current} onChange={(e) => setCurrent(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          {cfg.currentLabel}
        </label>
      )}
      {kind !== "SKILL" && (
        <div>
          <label htmlFor="description" className="label">Description (optional)</label>
          <textarea id="description" name="description" rows={3} maxLength={5000} defaultValue={entry?.description ?? ""} placeholder="What you did, learned or achieved." className="input h-auto py-2.5" />
        </div>
      )}
      <FormError message={state?.error ?? result?.error} />
      <div className="flex items-center gap-2">
        {entry && (
          <ConfirmDelete
            pending={busy}
            onConfirm={() =>
              start(async () => {
                const r = await deleteProfileEntry(entry.id);
                if (r?.ok) onDone();
                else setResult(r);
              })
            }
          />
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-28">
          {saving ? "Saving…" : entry ? "Save changes" : "Add"}
        </button>
      </div>
    </form>
  );
}
