import { VehiclesManager } from "@/components/bills/VehiclesManager";
import { getAccountOptions, getCategoryOptions } from "@/lib/finance";
import { getVehicles } from "@/lib/vehicles";

export const metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  const [vehicles, accounts, categories] = await Promise.all([getVehicles(), getAccountOptions(), getCategoryOptions()]);
  return <VehiclesManager vehicles={vehicles} accounts={accounts} categories={categories} />;
}
