"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isTime } from "@/lib/dates";
import { sendToAll } from "@/lib/notify/push";
import type { ActionResult } from "@/lib/types";

type SubJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function saveSubscription(sub: SubJSON, device: string): Promise<ActionResult> {
  await requireUser();
  const endpoint = sub.endpoint ?? "";
  const p256dh = sub.keys?.p256dh ?? "";
  const auth = sub.keys?.auth ?? "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 600 || !p256dh || !auth) return { error: "This browser returned an invalid subscription." };

  const data = { p256dh: p256dh.slice(0, 200), auth: auth.slice(0, 100), device: device.slice(0, 80) || "This device" };
  await db.pushSubscription.upsert({ where: { endpoint }, create: { endpoint, ...data }, update: data });
  revalidatePath("/settings/notifications");
  return { ok: true, message: "Notifications are on for this device." };
}

export async function removeSubscription(endpointOrId: string | number): Promise<ActionResult> {
  await requireUser();
  await db.pushSubscription.deleteMany({ where: typeof endpointOrId === "number" ? { id: endpointOrId } : { endpoint: endpointOrId } });
  revalidatePath("/settings/notifications");
  return { ok: true, message: "Notifications turned off for that device." };
}

export async function sendTestNotification(): Promise<ActionResult> {
  await requireUser();
  const sent = await sendToAll({ title: "sudo.me test", body: "Notifications are working 🎉", url: "/settings/notifications", tag: "test" }, { respectPrivacy: false });
  return sent ? { ok: true, message: `Sent to ${sent} device${sent === 1 ? "" : "s"}.` } : { error: "No devices are signed up for notifications yet." };
}

const BOOLS = ["bills", "upkeep", "documents", "health", "planner", "dailySummary", "overdueTasks", "loginAlerts", "showDetails"] as const;

export async function saveNotificationPrefs(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const summaryTime = String(fd.get("summaryTime") ?? "08:00");
  if (!isTime(summaryTime)) return { error: "Choose a valid morning time." };
  const data = Object.fromEntries(BOOLS.map((k) => [k, fd.get(k) === "on"])) as Record<(typeof BOOLS)[number], boolean>;
  await db.notificationPrefs.upsert({ where: { id: 1 }, create: { id: 1, ...data, summaryTime }, update: { ...data, summaryTime } });
  revalidatePath("/settings/notifications");
  return { ok: true, message: "Saved." };
}
