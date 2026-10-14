import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import type { AppData } from '../domain/types';
import { planReminders } from '../domain/reminders';

/** True only inside the installed Android app. */
export const isAndroid = Capacitor.getPlatform() === 'android';

const CHANNEL_ID = 'interval-reminders';
let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Interval reminders',
    description: 'Asks what you did when each interval ends',
    importance: 4,
    visibility: 1,
    vibration: true,
  });
  channelReady = true;
}

export async function notificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

/** Android 12+: whether reminders can fire at the exact minute (otherwise the OS may delay them). */
export async function exactAlarmsAllowed(): Promise<boolean> {
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return exact_alarm === 'granted';
  } catch {
    return true;
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  await LocalNotifications.changeExactNotificationSetting();
}

/**
 * Replaces every pending reminder with a fresh plan for the next 24h.
 * Called on launch, on resume and whenever logs or settings change.
 */
export async function syncReminders(data: AppData): Promise<void> {
  if (!isAndroid) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
  const plan = planReminders(data, new Date());
  if (plan.length === 0) return;

  if ((await notificationPermission()) !== 'granted') {
    if (!(await requestNotificationPermission())) return;
  }
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: plan.map((r) => ({
      id: r.id,
      title: `${r.startTime} – ${r.endTime} · What did you do?`,
      body: 'Tap to log this interval.',
      channelId: CHANNEL_ID,
      smallIcon: 'ic_stat_notify',
      autoCancel: true,
      schedule: { at: r.at, allowWhileIdle: true },
      extra: { date: r.date, startTime: r.startTime },
    })),
  });
}

/** Tapping a reminder opens that interval. Returns an unsubscribe function. */
export function onReminderTap(callback: (slot: { date: string; startTime: string }) => void): () => void {
  if (!isAndroid) return () => undefined;
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const extra = action.notification.extra as { date?: string; startTime?: string } | undefined;
    if (extra?.date && extra.startTime) callback({ date: extra.date, startTime: extra.startTime });
  });
  return () => {
    handle.then((h) => h.remove()).catch(() => undefined);
  };
}

export function onAppResume(callback: () => void): () => void {
  if (!isAndroid) return () => undefined;
  const handle = App.addListener('resume', callback);
  return () => {
    handle.then((h) => h.remove()).catch(() => undefined);
  };
}

/**
 * Hardware back button: the handler returns true when it handled the press
 * (closed a panel, changed page); otherwise the app goes to the background.
 */
export function onBackButton(handler: () => boolean): () => void {
  if (!isAndroid) return () => undefined;
  const handle = App.addListener('backButton', () => {
    if (!handler()) App.minimizeApp().catch(() => undefined);
  });
  return () => {
    handle.then((h) => h.remove()).catch(() => undefined);
  };
}
