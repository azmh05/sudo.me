import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readEncryptedFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Serves a decrypted profile picture to the signed-in owner only.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Not signed in", { status: 401 });
  const id = Number((await params).id);
  const photo = Number.isInteger(id) && id > 0 ? await db.profilePhoto.findUnique({ where: { id } }) : null;
  if (!photo) return new Response("Not found", { status: 404 });
  try {
    const data = await readEncryptedFile(photo.storageName);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=86400, immutable" },
    });
  } catch {
    return new Response("Couldn't open picture", { status: 500 });
  }
}
