import type { Activity, AppData, Category, IntervalLog, Settings, TimeSlot } from './types';
import { addDays, formatDateKey, parseDateKey, parseTimeToMinutes } from './dates';
import { generateDaySlots, getIntervalForDate, logKey } from './grid';

const DAY_MINUTES = 24 * 60;

/** Default points/hour for an auto-created Sleep activity. */
export const SLEEP_DEFAULT_POINTS = 10;

export function findSleepActivity(activities: Activity[]): Activity | undefined {
  return activities.find((a) => a.name.trim().toLowerCase() === 'sleep');
}

/** Returns the catalog with a Sleep activity guaranteed (creates Health › Sleep if missing). */
export function ensureSleepActivity(
  categories: Category[],
  activities: Activity[],
): { categories: Category[]; activities: Activity[]; sleep: Activity } {
  const existing = findSleepActivity(activities);
  if (existing) return { categories, activities, sleep: existing };

  let healthId = categories.find((c) => c.name.trim().toLowerCase() === 'health')?.id;
  if (!healthId) {
    healthId = crypto.randomUUID();
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sortOrder), -1);
    categories = [
      ...categories,
      { id: healthId, name: 'Health', icon: '😴', color: '#2F7D4A', sortOrder: maxOrder + 1 },
    ];
  }
  const inCat = activities.filter((a) => a.categoryId === healthId);
  const maxOrder = inCat.reduce((m, a) => Math.max(m, a.sortOrder), -1);
  const sleep: Activity = {
    id: crypto.randomUUID(),
    categoryId: healthId,
    name: 'Sleep',
    points: SLEEP_DEFAULT_POINTS,
    sortOrder: maxOrder + 1,
  };
  return { categories, activities: [...activities, sleep], sleep };
}

export interface SleepWindow {
  /** Minutes since midnight when sleep starts. */
  bedMin: number;
  /** Minutes since midnight when sleep ends. */
  wakeMin: number;
  durationMin: number;
}

export function sleepWindow(
  settings: Pick<Settings, 'defaultSleepDurationHours' | 'defaultSleepEndTime'>,
): SleepWindow {
  const wakeMin = parseTimeToMinutes(settings.defaultSleepEndTime);
  const hours = Math.min(Math.max(settings.defaultSleepDurationHours, 0), 23);
  const durationMin = Math.round(hours * 60);
  const bedMin = (((wakeMin - durationMin) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return { bedMin, wakeMin, durationMin };
}

export function minutesToTime(total: number): string {
  const m = ((Math.round(total) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function isMinuteInSleepWindow(minute: number, w: SleepWindow): boolean {
  if (w.durationMin <= 0) return false;
  if (w.bedMin < w.wakeMin) return minute >= w.bedMin && minute < w.wakeMin;
  return minute >= w.bedMin || minute < w.wakeMin;
}

function slotMidpoint(slot: TimeSlot): number {
  return (parseTimeToMinutes(slot.startTime) + parseTimeToMinutes(slot.endTime)) / 2;
}

/** A slot belongs to the sleep window when its midpoint falls inside it. */
export function isSlotInSleepWindow(slot: TimeSlot, w: SleepWindow): boolean {
  return isMinuteInSleepWindow(slotMidpoint(slot), w);
}

export function isNowInSleepWindow(now: Date, w: SleepWindow): boolean {
  return isMinuteInSleepWindow(now.getHours() * 60 + now.getMinutes(), w);
}

/** The moment the sleep window containing `slot` ends (wake-up). */
export function sleepWindowEndsAt(slot: TimeSlot, w: SleepWindow): Date {
  const wraps = w.bedMin >= w.wakeMin;
  const wakeDate = wraps && slotMidpoint(slot) >= w.bedMin ? addDays(slot.date, 1) : slot.date;
  const d = parseDateKey(wakeDate);
  d.setMinutes(w.wakeMin);
  return d;
}

/** How many days back auto-register looks (covers a missed morning or two). */
const AUTO_SLEEP_LOOKBACK_DAYS = 2;

/**
 * Logs Sleep into every unrecorded slot of the sleep window once that window
 * has ended. Waiting for wake-up means a late night you log manually is never
 * overwritten. Returns `data` unchanged (same reference) when there is nothing to add.
 */
export function applyAutoSleep(data: AppData, now: Date): AppData {
  const { settings } = data;
  if (!settings.autoRegisterSleep) return data;
  const w = sleepWindow(settings);
  if (w.durationMin <= 0) return data;

  const today = formatDateKey(now);
  const lookback = addDays(today, -AUTO_SLEEP_LOOKBACK_DAYS);
  let date = settings.autoSleepSince > lookback ? settings.autoSleepSince : lookback;

  const recorded = new Set(data.logs.map((l) => logKey(l.date, l.startTime)));
  const pending: TimeSlot[] = [];
  const pinnedIntervals = { ...data.dayIntervalMinutes };
  for (; date <= today; date = addDays(date, 1)) {
    const interval = getIntervalForDate(data, date);
    let added = false;
    for (const slot of generateDaySlots(date, interval)) {
      if (!isSlotInSleepWindow(slot, w)) continue;
      if (recorded.has(logKey(slot.date, slot.startTime))) continue;
      if (sleepWindowEndsAt(slot, w) > now) continue;
      pending.push(slot);
      added = true;
    }
    // Pin the grid so later interval changes don't orphan these logs.
    if (added && pinnedIntervals[date] === undefined) pinnedIntervals[date] = interval;
  }
  if (pending.length === 0) return data;

  const { categories, activities, sleep } = ensureSleepActivity(data.categories, data.activities);
  const recordedAt = now.toISOString();
  const newLogs: IntervalLog[] = pending.map((slot) => ({
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    activityIds: [sleep.id],
    recordedAt,
    source: 'auto',
  }));
  return {
    ...data,
    categories,
    activities,
    logs: [...data.logs, ...newLogs],
    dayIntervalMinutes: pinnedIntervals,
  };
}

export function slotsBetweenInclusive(
  slots: TimeSlot[],
  startIndex: number,
  endIndex: number,
): TimeSlot[] {
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return slots.filter((s) => s.index >= from && s.index <= to);
}

export function slotCountForHours(hours: number, intervalMinutes: number): number {
  return Math.round((hours * 60) / intervalMinutes);
}

export function findEndSlotIndexByEndTime(slots: TimeSlot[], endTime: string): number {
  const exact = slots.findIndex((s) => s.endTime === endTime);
  if (exact >= 0) return exact;
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    if (slots[i].endTime <= endTime) return i;
  }
  return Math.max(0, slots.length - 1);
}

export function selectionFromSleepDefaults(
  slots: TimeSlot[],
  intervalMinutes: number,
  durationHours: number,
  endTime: string,
): { endIndex: number; selectedStartTimes: Set<string> } {
  const endIndex = findEndSlotIndexByEndTime(slots, endTime);
  const count = Math.max(1, slotCountForHours(durationHours, intervalMinutes));
  const start = Math.max(0, endIndex - count + 1);
  const picked = slotsBetweenInclusive(slots, start, endIndex);
  return {
    endIndex,
    selectedStartTimes: new Set(picked.map((s) => s.startTime)),
  };
}

export function sleepDefaultsFromSelection(
  selectedSlots: TimeSlot[],
  intervalMinutes: number,
): { durationHours: number; endTime: string } {
  if (selectedSlots.length === 0) {
    return { durationHours: 8, endTime: '07:00' };
  }
  const sorted = [...selectedSlots].sort((a, b) => a.index - b.index);
  const endTime = sorted[sorted.length - 1].endTime;
  // Quarter-hour precision so a 7h30 night stays 7.5h.
  const durationHours = Math.max(
    1,
    Math.round((selectedSlots.length * intervalMinutes) / 15) / 4,
  );
  return { durationHours, endTime };
}
