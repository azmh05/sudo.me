import { MaintenanceManager } from "@/components/bills/MaintenanceManager";
import { getMaintenance } from "@/lib/bills";
import { getAccountOptions, getCategoryOptions } from "@/lib/finance";

export const metadata = { title: "Home & Devices" };

export default async function MaintenancePage() {
  const [items, accounts, categories] = await Promise.all([getMaintenance(), getAccountOptions(), getCategoryOptions()]);
  return <MaintenanceManager items={items} accounts={accounts} categories={categories} />;
}
