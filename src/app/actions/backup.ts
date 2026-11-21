"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createBackup, deleteBackup, isBackupName, restoreBackup } from "@/lib/backup";
import { SESSION_COOKIE } from "@/lib/session";
import type { ActionResult } from "@/lib/types";

export async function backupNow(): Promise<ActionResult> {
  await requireUser();
  try {
    const name = await createBackup("manual");
    revalidatePath("/settings/data");
    return { ok: true, message: `Backup ${name} created.` };
  } catch (e) {
    return { error: `Backup failed: ${(e as Error).message}` };
  }
}

export async function removeBackup(name: string): Promise<ActionResult> {
  await requireUser();
  if (!isBackupName(name)) return { error: "Invalid backup." };
  await deleteBackup(name);
  revalidatePath("/settings/data");
  return { ok: true };
}

// Requires typing RESTORE. Signs you out afterwards, because the account itself is restored too.
export async function restoreAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const name = String(fd.get("name") ?? "");
  if (String(fd.get("confirm") ?? "").trim() !== "RESTORE") return { error: "Type RESTORE (in capitals) to confirm." };
  if (!isBackupName(name)) return { error: "Invalid backup." };
  try {
    await restoreBackup(name);
  } catch (e) {
    return { error: `Restore failed — nothing was changed. (${(e as Error).message})` };
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
