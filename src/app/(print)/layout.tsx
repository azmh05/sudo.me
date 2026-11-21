import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Plain layout (no sidebar) for pages meant to be printed or saved as PDF.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="min-h-dvh bg-bg print:bg-white">{children}</div>;
}
