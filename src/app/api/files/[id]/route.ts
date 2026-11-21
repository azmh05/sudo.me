import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readEncryptedFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Streams a decrypted document file to the logged-in owner only.
// ?download=1 saves it instead of opening it in the browser.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Not signed in", { status: 401 });

  const id = Number((await params).id);
  const file = Number.isInteger(id) && id > 0 ? await db.recordFile.findUnique({ where: { id } }) : null;
  if (!file) return new Response("Not found", { status: 404 });

  let data: Buffer;
  try {
    data = await readEncryptedFile(file.storageName);
  } catch {
    return new Response("This file couldn't be opened. It may be missing, or ENCRYPTION_KEY in .env was changed.", {
      status: 500,
    });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const fallback = file.originalName.replace(/[^\x20-\x7E]|["\\]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
