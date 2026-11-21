import { BillsManager } from "@/components/bills/BillsManager";
import { getBills } from "@/lib/bills";
import { getAccountOptions, getCategoryOptions } from "@/lib/finance";

export const metadata = { title: "Bills" };

export default async function BillsPage() {
  const [bills, accounts, categories] = await Promise.all([getBills(), getAccountOptions(), getCategoryOptions()]);
  return <BillsManager bills={bills} accounts={accounts} categories={categories} />;
}
