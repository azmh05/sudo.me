import { BudgetForm } from "@/components/finance/BudgetForm";
import { currentMonthKey, monthLabel } from "@/lib/dates";
import { getBudgetStatus } from "@/lib/finance";

export const metadata = { title: "Budget" };

export default async function BudgetPage() {
  const month = currentMonthKey();
  const rows = await getBudgetStatus(month);
  return <BudgetForm rows={rows} monthLabel={monthLabel(month)} />;
}
