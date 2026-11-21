"use client";

import { KeyRound, LogOut, MonitorSmartphone, ShieldAlert, Timer } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { changePassword, setIdleLock, signOutOtherDevices } from "@/app/actions/security";
import type { ActionResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FormError } from "../Modal";
import { PasswordInput } from "@/app/(auth)/PasswordInput";

type Login = { at: string; device: string };

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

function Notice({ result }: { result?: ActionResult }) {
  if (!result) return null;
  if (result.error) return <FormError message={result.error} />;
  return result.message ? <p className="rounded-lg bg-positive/10 px-3 py-2 text-[13px] text-positive">{result.message}</p> : null;
}

export function SecurityPanel({
  idleLockMinutes,
  current,
  previous,
  failedRecent,
  history,
}: {
  idleLockMinutes: number;
  current: Login | null;
  previous: Login | null;
  failedRecent: number;
  history: { id: number; at: string; success: boolean; device: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-medium">
            <MonitorSmartphone className="size-4 text-muted" strokeWidth={1.75} /> Sign-ins
          </h2>
          <dl className="mt-4 space-y-3 text-[14px]">
            <div>
              <dt className="text-[12px] text-muted">This session</dt>
              <dd>{current ? `${current.device} · ${fmt.format(new Date(current.at))}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted">Previous sign-in</dt>
              <dd>{previous ? `${previous.device} · ${fmt.format(new Date(previous.at))}` : "None yet"}</dd>
            </div>
          </dl>
          {failedRecent > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning/10 px-3.5 py-2.5 text-[13px]">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.75} />
              {failedRecent} wrong password attempt{failedRecent === 1 ? "" : "s"} in the last 7 days. If that wasn&apos;t you, change your password.
            </p>
          )}
          <SignOutOthers />
        </section>

        <ChangePassword />
        <IdleLockSetting minutes={idleLockMinutes} />
      </div>

      <section className="card self-start overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 text-[15px] font-medium">Login history</h2>
        <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto">
          {history.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className={cn("size-2 shrink-0 rounded-full", h.success ? "bg-positive" : "bg-negative")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{h.device}</span>
                <span className="block text-[12px] text-muted">{fmt.format(new Date(h.at))}</span>
              </span>
              <span className={cn("text-[12px] font-medium", h.success ? "text-muted" : "text-negative")}>{h.success ? "Signed in" : "Wrong password"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SignOutOthers() {
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 border-t border-line pt-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await signOutOtherDevices()))}
        className="btn h-10 border border-line px-3 text-[14px] hover:bg-subtle"
      >
        <LogOut className="size-4" strokeWidth={1.75} /> {pending ? "Signing out…" : "Sign out all other devices"}
      </button>
      <p className="mt-2 text-[12px] text-muted">Use this if you lost your phone or signed in on someone else&apos;s device. This device stays signed in.</p>
      <div className="mt-2"><Notice result={result} /></div>
    </div>
  );
}

function ChangePassword() {
  const [state, action, saving] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-medium">
        <KeyRound className="size-4 text-muted" strokeWidth={1.75} /> Change password
      </h2>
      <div>
        <label htmlFor="current" className="label">Current password</label>
        <PasswordInput id="current" name="current" autoComplete="current-password" required />
      </div>
      <div>
        <label htmlFor="next" className="label">New password (min. 10 characters)</label>
        <PasswordInput id="next" name="next" autoComplete="new-password" minLength={10} required />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm new password</label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={10} required />
      </div>
      <Notice result={state} />
      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : "Change password"}</button>
      <p className="text-[12px] text-muted">Changing it signs out every other device.</p>
    </form>
  );
}

function IdleLockSetting({ minutes }: { minutes: number }) {
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-medium">
        <Timer className="size-4 text-muted" strokeWidth={1.75} /> Auto-lock
      </h2>
      <p className="mt-1 text-[13px] text-muted">Sign out automatically when the Hub is left open without activity.</p>
      <select
        defaultValue={String(minutes)}
        disabled={pending}
        onChange={(e) => {
          const v = Number(e.target.value);
          start(async () => setResult(await setIdleLock(v)));
        }}
        aria-label="Auto-lock after"
        className="input mt-3"
      >
        <option value="0">Off</option>
        {[5, 15, 30, 60].map((m) => <option key={m} value={m}>After {m} minutes</option>)}
      </select>
      <div className="mt-2"><Notice result={result} /></div>
    </section>
  );
}
