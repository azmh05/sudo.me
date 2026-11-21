import { DataPanel } from "@/components/settings/DataPanel";
import { listBackups } from "@/lib/backup";
import { currentMonthKey, monthLabel, shiftMonth } from "@/lib/dates";

export const metadata = { title: "Export & backups" };

export default async function DataPage() {
  const now = currentMonthKey();
  const months = Array.from({ length: 24 }, (_, i) => shiftMonth(now, -i)).map((k) => ({ key: k, label: monthLabel(k) }));
  return <DataPanel backups={await listBackups()} months={months} />;
}
