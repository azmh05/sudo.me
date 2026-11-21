import { SecurityPanel } from "@/components/settings/SecurityPanel";
import { requireUser } from "@/lib/auth";
import { rawDb } from "@/lib/db";
import { describeDevice } from "@/lib/device";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  const user = await requireUser();
  const logs = await rawDb.loginLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  const successes = logs.filter((l) => l.success);
  const failedRecent = logs.filter((l) => !l.success && Date.now() - l.createdAt.getTime() < 7 * 86_400_000).length;

  return (
    <SecurityPanel
      idleLockMinutes={user.idleLockMinutes}
      current={successes[0] ? { at: successes[0].createdAt.toISOString(), device: describeDevice(successes[0].userAgent) } : null}
      previous={successes[1] ? { at: successes[1].createdAt.toISOString(), device: describeDevice(successes[1].userAgent) } : null}
      failedRecent={failedRecent}
      history={logs.map((l) => ({ id: l.id, at: l.createdAt.toISOString(), success: l.success, device: describeDevice(l.userAgent) }))}
    />
  );
}
