import { SubTabs } from "@/components/SubTabs";
import { AddButtons } from "@/components/planner/PlannerUI";
import { PageHeader } from "@/components/ui";

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Planner" description="Tasks, events and your journal — with appointments and bills in view." actions={<AddButtons />} />
      <SubTabs
        tabs={[
          { href: "/planner", label: "Agenda" },
          { href: "/planner/calendar", label: "Calendar" },
          { href: "/planner/tasks", label: "Tasks" },
          { href: "/planner/journal", label: "Journal" },
        ]}
      />
      {children}
    </>
  );
}
