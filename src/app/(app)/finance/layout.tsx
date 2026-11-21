import { FinanceTabs } from "@/components/finance/FinanceTabs";
import { AddRecordButton } from "@/components/finance/AddRecordButton";
import { PageHeader } from "@/components/ui";
import { ensureFinanceDefaults, getAccountOptions, getCategoryOptions } from "@/lib/finance";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await ensureFinanceDefaults();
  const [accounts, categories] = await Promise.all([getAccountOptions(), getCategoryOptions()]);

  return (
    <>
      <PageHeader
        title="Finance"
        description="Your money in, money out, and where it goes."
        actions={<AddRecordButton accounts={accounts} categories={categories} />}
      />
      <FinanceTabs />
      {children}
    </>
  );
}
