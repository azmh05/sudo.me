import { SubTabs } from "@/components/SubTabs";
import { PageHeader } from "@/components/ui";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Security, exports, backups and a history of changes." />
      <SubTabs
        tabs={[
          { href: "/settings", label: "Security" },
          { href: "/settings/notifications", label: "Notifications" },
          { href: "/settings/data", label: "Export & backups" },
          { href: "/settings/activity", label: "Activity" },
        ]}
      />
      {children}
    </>
  );
}
