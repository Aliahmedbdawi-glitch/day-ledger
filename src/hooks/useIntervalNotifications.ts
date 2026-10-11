import { useEffect, useRef } from 'react';
import type { AppData } from '../domain/types';
import { todayKey } from '../domain/dates';
import {
  findLog,
  generateDaySlots,
  getCurrentSlot,
  getIntervalForDate,
} from '../domain/grid';

export function useIntervalNotifications(
  data: AppData,
  onIntervalEnd: () => void,
): void {
  const lastNotifiedEnd = useRef<string | null>(null);

  useEffect(() => {
    if (!data.settings.notificationsEnabled) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }

    const tick = () => {
      const now = new Date();
      const today = todayKey();
      const interval = getIntervalForDate(data, today);
      const slots = generateDaySlots(today, interval);
      const current = getCurrentSlot(slots, now);
      if (!current) return;

      const prevIndex = current.index - 1;
      if (prevIndex < 0) return;
      const ended = slots[prevIndex];
      const key = `${ended.startTime}-${ended.endTime}`;
      if (lastNotifiedEnd.current === key) return;

      const endedMin =
        parseInt(ended.endTime.split(':')[0], 10) * 60 +
        parseInt(ended.endTime.split(':')[1], 10);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin < endedMin || nowMin > endedMin + 2) return;

      if (Notification.permission === 'granted') {
        const wasLogged = findLog(data.logs, ended);
        if (!wasLogged) {
          new Notification('Time check', {
            body: `What did you do during ${ended.startTime} – ${ended.endTime}?`,
            tag: key,
          });
        }
      }
      lastNotifiedEnd.current = key;
      onIntervalEnd();
    };

    const id = window.setInterval(tick, 30_000);
    tick();
    return () => window.clearInterval(id);
  }, [data, onIntervalEnd]);
}
