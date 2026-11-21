import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Unlock" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const owner = await db.user.findFirst({ select: { name: true } });
  if (!owner) redirect("/setup");
  if (await getCurrentUser()) redirect("/");

  return <LoginForm name={owner.name} />;
}
