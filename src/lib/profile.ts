import { db } from "./db";
import { dateToISO } from "./dates";
import type { ProfileEntryRow, ProfileInfoRow } from "./types";

export async function getProfile() {
  const [info, entries, photos] = await Promise.all([
    db.profileInfo.findUnique({ where: { id: 1 } }),
    db.profileEntry.findMany({ orderBy: [{ current: "desc" }, { startDate: "desc" }, { createdAt: "desc" }] }),
    db.profilePhoto.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true } }),
  ]);

  const infoRow: ProfileInfoRow = {
    fullName: info?.fullName ?? null,
    preferredName: info?.preferredName ?? null,
    dateOfBirth: info?.dateOfBirth ? dateToISO(info.dateOfBirth) : null,
    phone: info?.phone ?? null,
    email: info?.email ?? null,
    address: info?.address ?? null,
    about: info?.about ?? null,
    photoId: info?.photoId ?? null,
  };

  const entryRows: ProfileEntryRow[] = entries.map((e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    organisation: e.organisation,
    detail: e.detail,
    startDate: e.startDate ? dateToISO(e.startDate) : null,
    endDate: e.endDate ? dateToISO(e.endDate) : null,
    current: e.current,
    description: e.description,
  }));

  return {
    info: infoRow,
    entries: entryRows,
    photos: photos.map((p) => ({ id: p.id, createdAt: p.createdAt.toISOString() })),
  };
}

// The picture shown in the sidebar (null = show your initial).
export async function getCurrentPhotoId() {
  const info = await db.profileInfo.findUnique({ where: { id: 1 }, select: { photoId: true } });
  return info?.photoId ?? null;
}
