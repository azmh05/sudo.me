import { HealthManager } from "@/components/health/HealthManager";
import { PageHeader } from "@/components/ui";
import { ensureFinanceDefaults, getAccountOptions, getCategoryOptions } from "@/lib/finance";
import { getHealth } from "@/lib/health";

export const metadata = { title: "Health" };

export default async function HealthPage() {
  await ensureFinanceDefaults();
  const [health, accounts, categories] = await Promise.all([getHealth(), getAccountOptions(), getCategoryOptions()]);
  return (
    <>
      <PageHeader title="Health" description="Check-ups, appointments and the health info you need on hand." />
      <HealthManager {...health} accounts={accounts} categories={categories} />
    </>
  );
}
