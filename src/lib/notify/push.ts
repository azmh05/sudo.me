// Sends Web Push notifications to every device where you enabled them.
import webpush from "web-push";
import { rawDb } from "../db";

export type Payload = { title: string; body: string; url?: string; tag?: string };

// VAPID keys identify this Hub to the browsers' push services. Created once, automatically.
export async function getVapidKeys() {
  const row = await rawDb.appSetting.findUnique({ where: { key: "vapid" } });
  if (row) return JSON.parse(row.value) as { publicKey: string; privateKey: string };
  const keys = webpush.generateVAPIDKeys();
  await rawDb.appSetting.upsert({ where: { key: "vapid" }, create: { key: "vapid", value: JSON.stringify(keys) }, update: {} });
  const saved = await rawDb.appSetting.findUnique({ where: { key: "vapid" } });
  return JSON.parse(saved!.value) as { publicKey: string; privateKey: string };
}

export async function getNotificationPrefs() {
  return (
    (await rawDb.notificationPrefs.findUnique({ where: { id: 1 } })) ??
    (await rawDb.notificationPrefs.create({ data: { id: 1 } }))
  );
}

export async function sendToAll(payload: Payload, { respectPrivacy = true } = {}) {
  const subs = await rawDb.pushSubscription.findMany();
  if (!subs.length) return 0;
  const prefs = await getNotificationPrefs();
  const keys = await getVapidKeys();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:owner@sudo-me.local", keys.publicKey, keys.privateKey);

  const body = JSON.stringify(
    respectPrivacy && !prefs.showDetails ? { title: "sudo.me", body: "You have a new reminder.", url: payload.url, tag: payload.tag } : payload,
  );

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 12 * 3600 });
        sent++;
        await rawDb.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: new Date() } });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410: the device unsubscribed or the browser data was cleared — forget it.
        if (code === 404 || code === 410) await rawDb.pushSubscription.deleteMany({ where: { id: s.id } });
        else console.error("[push] send failed:", code ?? (e as Error).message);
      }
    }),
  );
  return sent;
}

// Sent to all your devices after a successful sign-in (can be turned off in Settings).
export async function notifyNewLogin(device: string) {
  const prefs = await rawDb.notificationPrefs.findUnique({ where: { id: 1 } });
  if (prefs && !prefs.loginAlerts) return;
  const time = new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
  await sendToAll(
    { title: "New sign-in to sudo.me", body: `${device} at ${time}. Not you? Change your password in Settings.`, url: "/settings", tag: "login" },
    { respectPrivacy: false },
  );
}
