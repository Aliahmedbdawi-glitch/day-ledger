import type { Activity, TimeSlot } from './types';

export function findSleepActivity(activities: Activity[]): Activity | undefined {
  return activities.find((a) => a.name.trim().toLowerCase() === 'sleep');
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
