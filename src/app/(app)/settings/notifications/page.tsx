import { NotificationsPanel } from "@/components/settings/NotificationsPanel";
import { rawDb } from "@/lib/db";
import { getNotificationPrefs, getVapidKeys } from "@/lib/notify/push";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const [keys, prefs, devices] = await Promise.all([
    getVapidKeys(),
    getNotificationPrefs(),
    rawDb.pushSubscription.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return (
    <NotificationsPanel
      publicKey={keys.publicKey}
      prefs={{
        bills: prefs.bills,
        upkeep: prefs.upkeep,
        documents: prefs.documents,
        health: prefs.health,
        planner: prefs.planner,
        dailySummary: prefs.dailySummary,
        summaryTime: prefs.summaryTime,
        overdueTasks: prefs.overdueTasks,
        loginAlerts: prefs.loginAlerts,
        showDetails: prefs.showDetails,
      }}
      devices={devices.map((d) => ({ id: d.id, endpoint: d.endpoint, device: d.device, createdAt: d.createdAt.toISOString(), lastSentAt: d.lastSentAt?.toISOString() ?? null }))}
    />
  );
}
