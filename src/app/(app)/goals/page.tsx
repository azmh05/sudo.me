import { GoalsManager } from "@/components/goals/GoalsManager";
import { PageHeader } from "@/components/ui";
import { averageMonthlySpending, getGoals } from "@/lib/goals";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const [goals, avgSpending] = await Promise.all([getGoals(), averageMonthlySpending()]);
  return (
    <>
      <PageHeader title="Goals" description="Savings targets, your emergency fund and things you're saving up for." />
      <GoalsManager goals={goals} avgSpending={avgSpending} />
    </>
  );
}
