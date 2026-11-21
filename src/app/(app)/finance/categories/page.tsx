import { CategoriesManager } from "@/components/finance/CategoriesManager";
import { getCategoryOptions } from "@/lib/finance";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getCategoryOptions();
  return <CategoriesManager categories={categories} />;
}
