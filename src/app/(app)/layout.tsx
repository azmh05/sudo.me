import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { IdleLock } from "@/components/IdleLock";
import { maybeAutoBackup } from "@/lib/backup";
import { getCurrentPhotoId } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  void maybeAutoBackup(); // daily backup, runs in the background
  const photoId = await getCurrentPhotoId();

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar userName={user.name} photoId={photoId} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>
      <MobileNav />
      <IdleLock minutes={user.idleLockMinutes} />
    </div>
  );
}
