import { SubTabs } from "@/components/SubTabs";
import { PageHeader } from "@/components/ui";
import { ensureFinanceDefaults } from "@/lib/finance";

export default async function BillsLayout({ children }: { children: React.ReactNode }) {
  await ensureFinanceDefaults();
  return (
    <>
      <PageHeader title="Bills & Maintenance" description="What you pay regularly, and what needs looking after." />
      <SubTabs
        tabs={[
          { href: "/bills", label: "Bills" },
          { href: "/bills/vehicles", label: "Vehicles" },
          { href: "/bills/maintenance", label: "Home & Devices" },
        ]}
      />
      {children}
    </>
  );
}
