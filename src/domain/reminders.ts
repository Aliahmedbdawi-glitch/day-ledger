import type { AppData } from './types';
import { addDays, formatDateKey, parseDateKey, parseTimeToMinutes } from './dates';
import { findLog, generateDaySlots, getIntervalForDate } from './grid';
import { isMinuteInSleepWindow, isSlotInSleepWindow, sleepWindow } from './sleep';

export interface PlannedReminder {
  /** Stable numeric id per slot, so rescheduling replaces rather than duplicates. */
  id: number;
  at: Date;
  date: string;
  startTime: string;
  endTime: string;
}

/** Packs a date + start time into a positive 32-bit int (e.g. 261014 * 1440 + 1050). */
export function reminderId(date: string, startTime: string): number {
  return Number(date.slice(2).replace(/-/g, '')) * 1440 + parseTimeToMinutes(startTime);
}

/**
 * Reminders to pre-schedule with the OS: one at the end of every upcoming
 * interval within the horizon, skipping slots already logged and, when quiet
 * hours are on, anything in or ending inside the sleep window.
 */
export function planReminders(
  data: AppData,
  now: Date,
  horizonHours = 24,
  max = 96,
): PlannedReminder[] {
  const { settings } = data;
  if (!settings.notificationsEnabled) return [];

  const w = sleepWindow(settings);
  const horizon = now.getTime() + horizonHours * 3_600_000;
  const out: PlannedReminder[] = [];
  const today = formatDateKey(now);

  for (const date of [today, addDays(today, 1)]) {
    for (const slot of generateDaySlots(date, getIntervalForDate(data, date))) {
      const at = parseDateKey(date);
      at.setMinutes(parseTimeToMinutes(slot.endTime));
      const t = at.getTime();
      if (t <= now.getTime() || t > horizon) continue;
      if (findLog(data.logs, slot)) continue;
      if (settings.quietDuringSleep) {
        const endMin = parseTimeToMinutes(slot.endTime) % 1440;
        if (isSlotInSleepWindow(slot, w) || isMinuteInSleepWindow(endMin, w)) continue;
      }
      out.push({ id: reminderId(date, slot.startTime), at, date, startTime: slot.startTime, endTime: slot.endTime });
      if (out.length >= max) return out;
    }
  }
  return out;
}
