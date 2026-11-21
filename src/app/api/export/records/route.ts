import { getCurrentUser } from "@/lib/auth";
import { recordsWorkbook, xlsxResponse } from "@/lib/excel";
import { buildTxFilter } from "@/lib/tx-filter";

export const dynamic = "force-dynamic";

// Excel of Finance → Records, using the same filters you're looking at.
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return new Response("Not signed in", { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const filter = buildTxFilter(sp);
  const buffer = await recordsWorkbook(filter.where, filter.month);
  return xlsxResponse(buffer, `sudo-me-records-${filter.month}.xlsx`);
}
