"use client";

import { Bell, BellOff, Send, Smartphone, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { removeSubscription, saveNotificationPrefs, saveSubscription, sendTestNotification } from "@/app/actions/notifications";
import { describeDevice } from "@/lib/device";
import type { ActionResult } from "@/lib/types";
import { FormError } from "../Modal";

type Prefs = {
  bills: boolean;
  upkeep: boolean;
  documents: boolean;
  health: boolean;
  planner: boolean;
  dailySummary: boolean;
  summaryTime: string;
  overdueTasks: boolean;
  loginAlerts: boolean;
  showDetails: boolean;
};
type Device = { id: number; endpoint: string; device: string; createdAt: string; lastSentAt: string | null };

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

function toKey(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Status = "checking" | "unsupported" | "insecure" | "ios-install" | "blocked" | "off" | "on";

function Notice({ result }: { result?: ActionResult }) {
  if (!result) return null;
  if (result.error) return <FormError message={result.error} />;
  return result.message ? <p className="rounded-lg bg-positive/10 px-3 py-2 text-[13px] text-positive">{result.message}</p> : null;
}

export function NotificationsPanel({ publicKey, prefs, devices }: { publicKey: string; prefs: Prefs; devices: Device[] }) {
  const [status, setStatus] = useState<Status>("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!window.isSecureContext) return setStatus("insecure");
      if (ios && !standalone) return setStatus("ios-install");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setStatus("unsupported");
      if (Notification.permission === "denied") return setStatus("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setEndpoint(sub?.endpoint ?? null);
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  const enable = () =>
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "blocked" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
        const r = await saveSubscription(sub.toJSON(), describeDevice(navigator.userAgent));
        setResult(r);
        if (r?.ok) {
          setEndpoint(sub.endpoint);
          setStatus("on");
        }
      } catch (e) {
        setResult({ error: `Couldn't turn on notifications: ${(e as Error).message}` });
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removeSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setStatus("off");
      setResult({ ok: true, message: "Notifications turned off for this device." });
    });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-medium">
            <Bell className="size-4 text-muted" strokeWidth={1.75} /> This device
          </h2>
          <div className="mt-3 text-[14px]">
            {status === "checking" && <p className="text-muted">Checking…</p>}
            {status === "on" && <p>Notifications are <b className="font-medium text-positive">on</b> for this device.</p>}
            {status === "off" && <p className="text-muted">Notifications are off for this device.</p>}
            {status === "insecure" && (
              <p className="rounded-xl bg-warning/10 px-3.5 py-2.5 text-[13px]">
                Notifications need a secure (https) address. Open the Hub through your Tailscale address (https://…ts.net), or on the laptop at http://localhost:3000.
              </p>
            )}
            {status === "ios-install" && (
              <p className="rounded-xl bg-warning/10 px-3.5 py-2.5 text-[13px]">
                On iPhone, first add the Hub to your Home Screen (Safari → Share → Add to Home Screen), then open it from that icon and come back here.
              </p>
            )}
            {status === "blocked" && (
              <p className="rounded-xl bg-warning/10 px-3.5 py-2.5 text-[13px]">
                Notifications are blocked for this site. Allow them in the browser&apos;s site settings (the icon left of the address bar), then reload.
              </p>
            )}
            {status === "unsupported" && <p className="text-[13px] text-muted">This browser doesn&apos;t support push notifications.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {status === "off" && (
              <button type="button" onClick={enable} disabled={pending} className="btn-primary h-10">
                <Bell className="size-4" /> {pending ? "Turning on…" : "Turn on notifications"}
              </button>
            )}
            {status === "on" && (
              <button type="button" onClick={disable} disabled={pending} className="btn h-10 border border-line px-3 text-[14px] hover:bg-subtle">
                <BellOff className="size-4" /> Turn off here
              </button>
            )}
            {devices.length > 0 && (
              <button type="button" onClick={() => start(async () => setResult(await sendTestNotification()))} disabled={pending} className="btn h-10 border border-line px-3 text-[14px] hover:bg-subtle">
                <Send className="size-4" /> Send a test
              </button>
            )}
          </div>
          <div className="mt-3"><Notice result={result} /></div>
          <p className="mt-3 text-[12px] text-muted">
            Notifications come from your laptop, so they only go out while it&apos;s on and awake. Anything missed while it was asleep is sent when it wakes up.
          </p>
        </section>

        <section className="card overflow-hidden">
          <h2 className="flex items-center gap-2 border-b border-line px-5 py-3 text-[15px] font-medium">
            <Smartphone className="size-4 text-muted" strokeWidth={1.75} /> Devices receiving notifications
          </h2>
          {devices.length === 0 ? (
            <p className="px-5 py-5 text-[13px] text-muted">None yet. Turn notifications on from each phone or laptop you use.</p>
          ) : (
            <ul className="divide-y divide-line">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">
                      {d.device} {d.endpoint === endpoint && <span className="text-[12px] text-muted">(this device)</span>}
                    </span>
                    <span className="block text-[12px] text-muted">
                      Added {fmt.format(new Date(d.createdAt))}{d.lastSentAt ? ` · last notified ${fmt.format(new Date(d.lastSentAt))}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => setResult(await removeSubscription(d.id)))}
                    className="btn-ghost h-8 px-2"
                    aria-label="Remove device"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <PrefsForm prefs={prefs} />
    </div>
  );
}

function PrefsForm({ prefs }: { prefs: Prefs }) {
  const [state, action, saving] = useActionState(saveNotificationPrefs, undefined);
  const rows: [keyof Prefs, string, string][] = [
    ["bills", "Bills", "When a bill enters its reminder window, on the due day, and if overdue"],
    ["upkeep", "Home & Devices", "Upkeep due soon, today, or overdue"],
    ["documents", "Records", "Documents nearing expiry, expiring today, or expired"],
    ["health", "Health", "Time to book a check-up, the day before and 1 hour before appointments"],
    ["planner", "Planner reminders", "Tasks and events where you set “Remind me”"],
    ["overdueTasks", "Overdue tasks", "One morning nudge if any tasks are overdue"],
    ["dailySummary", "Morning summary", "Your day at a glance: tasks, events, appointments, bills"],
    ["loginAlerts", "New sign-in alerts", "Tells you whenever someone signs in to the Hub"],
  ];
  return (
    <form action={action} className="card self-start p-5">
      <h2 className="text-[15px] font-medium">What to notify me about</h2>
      <ul className="mt-3 divide-y divide-line">
        {rows.map(([key, label, hint]) => (
          <li key={key}>
            <label className="flex cursor-pointer items-start gap-3 py-3">
              <input type="checkbox" name={key} defaultChecked={prefs[key] as boolean} className="mt-0.5 size-4 accent-[var(--accent)]" />
              <span>
                <span className="block text-[14px]">{label}</span>
                <span className="block text-[12px] text-muted">{hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-line pt-4">
        <label htmlFor="summaryTime" className="label">Morning reminders start at</label>
        <input id="summaryTime" name="summaryTime" type="time" defaultValue={prefs.summaryTime} className="input" />
        <p className="mt-1.5 text-[12px] text-muted">Date-based reminders and your summary are sent from this time.</p>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input type="checkbox" name="showDetails" defaultChecked={prefs.showDetails} className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>
          <span className="block text-[14px]">Show details in notifications</span>
          <span className="block text-[12px] text-muted">Turn off to show only “You have a new reminder” on your lock screen.</span>
        </span>
      </label>
      <div className="mt-4 flex items-center justify-end gap-3">
        {state?.ok && !saving && <span className="text-[13px] text-positive">{state.message}</span>}
        <FormError message={state?.error} />
        <button type="submit" disabled={saving} className="btn-primary h-10">{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
