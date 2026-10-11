import type { AppData, IntervalLog, IntervalMinutes, TimeSlot } from './types';
import { parseTimeToMinutes, todayKey } from './dates';

export function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateDaySlots(date: string, intervalMinutes: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let totalMinutes = 0;
  const dayMinutes = 24 * 60;
  let index = 0;
  while (totalMinutes < dayMinutes) {
    const startH = Math.floor(totalMinutes / 60);
    const startM = totalMinutes % 60;
    const endTotal = Math.min(totalMinutes + intervalMinutes, dayMinutes);
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    slots.push({
      date,
      startTime: padTime(startH, startM),
      endTime: padTime(endH, endM),
      index,
    });
    totalMinutes += intervalMinutes;
    index += 1;
  }
  return slots;
}

export function getIntervalForDate(data: AppData, date: string): IntervalMinutes {
  return data.dayIntervalMinutes[date] ?? data.settings.defaultIntervalMinutes;
}

export function logKey(date: string, startTime: string): string {
  return `${date}|${startTime}`;
}

export function findLog(logs: IntervalLog[], slot: TimeSlot): IntervalLog | undefined {
  return logs.find((l) => l.date === slot.date && l.startTime === slot.startTime);
}

export function isSlotRecorded(logs: IntervalLog[], slot: TimeSlot): boolean {
  return findLog(logs, slot) !== undefined;
}

export function getCurrentSlot(slots: TimeSlot[], now: Date): TimeSlot | undefined {
  if (slots.length === 0) return undefined;
  const dateKey = todayKey();
  if (slots[0].date !== dateKey) return undefined;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return slots.find((s) => {
    const start = parseTimeToMinutes(s.startTime);
    const end = parseTimeToMinutes(s.endTime);
    return nowMin >= start && nowMin < end;
  });
}

export function getEndedSlotsBeforeNow(slots: TimeSlot[], now: Date): TimeSlot[] {
  const dateKey = todayKey();
  if (slots[0]?.date !== dateKey) return [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return slots.filter((s) => parseTimeToMinutes(s.endTime) <= nowMin);
}

export function getUnrecordedSlots(slots: TimeSlot[], logs: IntervalLog[], now: Date): TimeSlot[] {
  const ended = getEndedSlotsBeforeNow(slots, now);
  return ended.filter((s) => !isSlotRecorded(logs, s));
}

export function getPreviousSlot(slots: TimeSlot[], slot: TimeSlot): TimeSlot | undefined {
  const idx = slots.findIndex((s) => s.startTime === slot.startTime);
  if (idx <= 0) return undefined;
  return slots[idx - 1];
}
