import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { everythingWorkbook, xlsxResponse } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getCurrentUser())) return new Response("Not signed in", { status: 401 });
  return xlsxResponse(await everythingWorkbook(), `sudo-me-export-${todayISO()}.xlsx`);
}
