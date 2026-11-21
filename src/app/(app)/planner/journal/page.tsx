import { JournalEditor } from "@/components/planner/JournalEditor";
import { hasEncryptionKey } from "@/lib/crypto";
import { isoToDate, todayISO } from "@/lib/dates";
import { getJournalEntry, getJournalList } from "@/lib/planner";

export const metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const date = sp.date && isoToDate(sp.date) && sp.date <= today ? sp.date : today;
  const [entry, list] = await Promise.all([getJournalEntry(date), getJournalList()]);
  return <JournalEditor key={date} date={date} entry={entry} list={list} encrypted={hasEncryptionKey()} />;
}
