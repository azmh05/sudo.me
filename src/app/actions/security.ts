"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { rawDb } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import type { ActionResult } from "@/lib/types";

const MIN_PASSWORD = 10;

// Signs everyone else out: bumps the session version, then re-signs this device so it stays in.
async function rotateSessions(userId: number) {
  const user = await rawDb.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  const token = await signSession({ userId, ver: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function changePassword(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is incorrect." };
  if (next.length < MIN_PASSWORD) return { error: `New password must be at least ${MIN_PASSWORD} characters.` };
  if (next !== confirm) return { error: "New passwords don't match." };
  if (next === current) return { error: "That's the same as your current password." };

  await rawDb.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  await rotateSessions(user.id);
  await rawDb.activityLog.create({ data: { action: "Changed", entity: "Security", label: "Password changed · other devices signed out" } });
  revalidatePath("/settings");
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

export async function signOutOtherDevices(): Promise<ActionResult> {
  const user = await requireUser();
  await rotateSessions(user.id);
  await rawDb.activityLog.create({ data: { action: "Changed", entity: "Security", label: "Signed out all other devices" } });
  revalidatePath("/settings");
  return { ok: true, message: "All other devices have been signed out." };
}

export async function setIdleLock(minutes: number): Promise<ActionResult> {
  const user = await requireUser();
  const allowed = [0, 5, 15, 30, 60];
  if (!allowed.includes(minutes)) return { error: "Choose one of the options." };
  await rawDb.user.update({ where: { id: user.id }, data: { idleLockMinutes: minutes } });
  revalidatePath("/", "layout");
  return { ok: true, message: minutes ? `The Hub will lock after ${minutes} minutes of inactivity.` : "Auto-lock is off." };
}
