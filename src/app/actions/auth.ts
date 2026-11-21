"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { rawDb as db } from "@/lib/db";
import { describeDevice } from "@/lib/device";
import { notifyNewLogin } from "@/lib/notify/push";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/session";

export type FormState = { error?: string } | undefined;

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const MIN_PASSWORD = 10;

async function startSession(userId: number, ver: number) {
  const token = await signSession({ userId, ver });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

async function userAgent() {
  return (await headers()).get("user-agent")?.slice(0, 255) ?? null;
}

// First run only: create the owner account.
export async function setupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if ((await db.user.count()) > 0) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name) return { error: "Please enter your name." };
  if (name.length > 80) return { error: "Name is too long." };
  if (password.length < MIN_PASSWORD)
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (password !== confirm) return { error: "Passwords don't match." };

  const user = await db.user.create({
    data: { name, passwordHash: await bcrypt.hash(password, 12) },
  });
  await startSession(user.id, user.sessionVersion);
  redirect("/");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await db.user.findFirst();
  if (!user) redirect("/setup");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      error: `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  const password = String(formData.get("password") ?? "");
  const ok = password.length > 0 && (await bcrypt.compare(password, user.passwordHash));
  const ua = await userAgent();

  if (!ok) {
    const attempts = user.failedAttempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await db.user.update({
      where: { id: user.id },
      data: lock
        ? {
            failedAttempts: 0,
            lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000),
          }
        : { failedAttempts: attempts },
    });
    await db.loginLog.create({ data: { success: false, userAgent: ua } });
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return {
      error: lock
        ? `Too many wrong attempts. Locked for ${LOCK_MINUTES} minutes.`
        : `Incorrect password. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} left.`,
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await db.loginLog.create({ data: { success: true, userAgent: ua } });
  await startSession(user.id, user.sessionVersion);
  void notifyNewLogin(describeDevice(ua)).catch(() => {}); // push alert to your devices
  redirect("/");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
