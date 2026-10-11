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
  const durationHours = Math.max(
    1,
    Math.round((selectedSlots.length * intervalMinutes) / 60),
  );
  return { durationHours, endTime };
}
