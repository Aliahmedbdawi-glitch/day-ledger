import { useEffect, useRef } from 'react';
import type { AppData } from '../domain/types';
import { formatDurationMinutes, parseTimeToMinutes, todayKey } from '../domain/dates';
import {
  findLog,
  generateDaySlots,
  getCurrentSlot,
  getIntervalForDate,
} from '../domain/grid';
import { computeDayStats, formatPoints } from '../domain/scoring';
import { isNowInSleepWindow, isSlotInSleepWindow, sleepWindow } from '../domain/sleep';
import { computeTargetProgress, recommendedProgress } from '../domain/targets';
import { desktop } from '../platform/desktop';
import { isAndroid } from '../platform/android';

/**
 * Fires a reminder when a slot ends unrecorded. Silent during the sleep window
 * (and for slots that belong to it) when `quietDuringSleep` is on.
 * Mounted once at the app shell so it works on every page.
 */
export function useIntervalNotifications(data: AppData): void {
  const lastNotifiedEnd = useRef<string | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const enabled = data.settings.notificationsEnabled;

  useEffect(() => {
    // Android schedules its reminders with the OS instead (see useAndroidReminders).
    if (!enabled || isAndroid) return;
    // The desktop app uses native Windows toasts; the browser needs Notification permission.
    if (!desktop) {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => undefined);
      }
    }

    const tick = () => {
      const current = dataRef.current;
      const now = new Date();
      const today = todayKey();
      const slots = generateDaySlots(today, getIntervalForDate(current, today));
      const slot = getCurrentSlot(slots, now);
      if (!slot || slot.index === 0) return;

      const ended = slots[slot.index - 1];
      const key = `${today}|${ended.startTime}`;
      if (lastNotifiedEnd.current === key) return;

      const nowMin = now.getHours() * 60 + now.getMinutes();
      const endedMin = parseTimeToMinutes(ended.endTime);
      if (nowMin < endedMin || nowMin > endedMin + 2) return;
      lastNotifiedEnd.current = key;

      if (current.settings.quietDuringSleep) {
        const w = sleepWindow(current.settings);
        if (isNowInSleepWindow(now, w) || isSlotInSleepWindow(ended, w)) return;
      }

      if (findLog(current.logs, ended)) return;

      const title = `${ended.startTime} – ${ended.endTime} · What did you do?`;
      const net = computeDayStats(current, today, now).netPoints;
      const next = recommendedProgress(computeTargetProgress(current, today, now))[0];
      const body = [
        net === null ? null : `Today ${formatPoints(net)} pts`,
        next ? `Next up: ${next.activity.name} (${formatDurationMinutes(next.remainingMinutes)} left)` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Tap to log this interval.';

      if (desktop) {
        desktop.notify({ title, body, date: ended.date, startTime: ended.startTime });
      } else if (Notification.permission === 'granted') {
        new Notification(title, { body, tag: key, icon: './favicon.png' });
      }
    };

    const id = window.setInterval(tick, 30_000);
    tick();
    return () => window.clearInterval(id);
  }, [enabled]);
}
