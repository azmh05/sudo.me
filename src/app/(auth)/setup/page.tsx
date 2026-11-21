import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

// Only reachable once, before the owner account exists.
export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/login");
  return <SetupForm />;
}
