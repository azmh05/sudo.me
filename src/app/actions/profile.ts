"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasEncryptionKey } from "@/lib/crypto";
import { isoToDate } from "@/lib/dates";
import { detectFileType, MAX_FILE_BYTES, removeStoredFile, saveEncryptedFile } from "@/lib/storage";
import type { ActionResult, ProfileKind } from "@/lib/types";

const KINDS: ProfileKind[] = ["EDUCATION", "WORK", "SKILL", "CERTIFICATION", "ACHIEVEMENT"];

function done(message?: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, message };
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string, max: number) => str(fd, k).slice(0, max) || null;

// Accepts "2023-09" (month picker) or "2023-09-15". Undefined = invalid.
function optMonthOrDate(fd: FormData, k: string): Date | null | undefined {
  const raw = str(fd, k);
  if (!raw) return null;
  return isoToDate(/^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw) ?? undefined;
}

export async function saveProfileInfo(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const dob = optMonthOrDate(fd, "dateOfBirth");
  if (dob === undefined) return { error: "Date of birth isn't valid." };
  const email = str(fd, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email doesn't look right." };

  const data = {
    fullName: opt(fd, "fullName", 120),
    preferredName: opt(fd, "preferredName", 60),
    dateOfBirth: dob,
    phone: opt(fd, "phone", 30),
    email: email.slice(0, 120) || null,
    address: opt(fd, "address", 300),
    about: opt(fd, "about", 5000),
  };
  await db.profileInfo.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  return done("Saved.");
}

export async function saveProfileEntry(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const idNum = Number(fd.get("id"));
  const id = Number.isInteger(idNum) && idNum > 0 ? idNum : null;

  const kind = str(fd, "kind") as ProfileKind;
  if (!KINDS.includes(kind)) return { error: "Unknown section." };
  const title = str(fd, "title");
  if (!title) return { error: "Please fill in the name/title." };
  if (title.length > 160) return { error: "That's too long." };

  const startDate = optMonthOrDate(fd, "startDate");
  const endDate = optMonthOrDate(fd, "endDate");
  if (startDate === undefined || endDate === undefined) return { error: "One of the dates isn't valid." };
  const current = fd.get("current") === "on";
  if (startDate && endDate && !current && endDate < startDate) return { error: "End date is before the start date." };

  const data = {
    kind,
    title,
    organisation: opt(fd, "organisation", 160),
    detail: opt(fd, "detail", 120),
    startDate,
    endDate: current ? null : endDate,
    current,
    description: opt(fd, "description", 5000),
  };
  if (id) await db.profileEntry.update({ where: { id }, data });
  else await db.profileEntry.create({ data });
  return done();
}

export async function deleteProfileEntry(id: number): Promise<ActionResult> {
  await requireUser();
  await db.profileEntry.deleteMany({ where: { id } });
  return done("Deleted.");
}

// ---------- Profile picture (kept as a gallery so you can switch back) ----------

export async function uploadProfilePhoto(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  if (!hasEncryptionKey()) return { error: "Add ENCRYPTION_KEY to your .env file first (see the Step 4 notes)." };

  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a picture." };
  if (file.size > MAX_FILE_BYTES) return { error: "That picture is over 8 MB. Try a smaller one." };

  const data = Buffer.from(await file.arrayBuffer());
  const mimeType = detectFileType(data);
  if (!mimeType || mimeType === "application/pdf") return { error: "Use a JPG, PNG or WebP picture." };

  const storageName = await saveEncryptedFile(data);
  try {
    const photo = await db.profilePhoto.create({ data: { mimeType, size: data.length, storageName } });
    await db.profileInfo.upsert({ where: { id: 1 }, create: { id: 1, photoId: photo.id }, update: { photoId: photo.id } });
  } catch (e) {
    await removeStoredFile(storageName);
    throw e;
  }
  return done("Profile picture updated.");
}

// Switch to one of your earlier pictures, or pass null to show your initial instead.
export async function selectProfilePhoto(id: number | null): Promise<ActionResult> {
  await requireUser();
  if (id !== null && !(await db.profilePhoto.findUnique({ where: { id } }))) return { error: "That picture no longer exists." };
  await db.profileInfo.upsert({ where: { id: 1 }, create: { id: 1, photoId: id }, update: { photoId: id } });
  return done(id ? "Profile picture changed." : "Profile picture removed.");
}

export async function deleteProfilePhoto(id: number): Promise<ActionResult> {
  await requireUser();
  const photo = await db.profilePhoto.findUnique({ where: { id } });
  if (!photo) return done();
  const info = await db.profileInfo.findUnique({ where: { id: 1 } });
  if (info?.photoId === id) await db.profileInfo.update({ where: { id: 1 }, data: { photoId: null } });
  await db.profilePhoto.delete({ where: { id } });
  await removeStoredFile(photo.storageName);
  return done("Picture deleted.");
}
