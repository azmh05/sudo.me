import { getCurrentUser } from "@/lib/auth";
import { isBackupName, readBackupData } from "@/lib/backup";

export const dynamic = "force-dynamic";

// Downloads a backup's data.json (the database part of a backup).
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getCurrentUser())) return new Response("Not signed in", { status: 401 });
  const { name } = await params;
  if (!isBackupName(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await readBackupData(name);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sudo-me-backup-${name}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
