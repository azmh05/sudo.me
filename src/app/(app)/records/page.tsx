import { RecordsManager } from "@/components/records/RecordsManager";
import { PageHeader } from "@/components/ui";
import { hasEncryptionKey } from "@/lib/crypto";
import { getRecords } from "@/lib/records";

export const metadata = { title: "Records" };

export default async function RecordsPage() {
  const records = await getRecords();
  return (
    <>
      <PageHeader title="Records" description="Important documents, their numbers and expiry dates — scans stored encrypted." />
      <RecordsManager records={records} keyReady={hasEncryptionKey()} />
    </>
  );
}
