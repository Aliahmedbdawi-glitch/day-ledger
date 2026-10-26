import { parseTimeToMinutes } from './dates';
import type { DailyHabit, IntervalLog, TaskLayout, TimeSlot } from './types';

export function readTaskLayout(value: string | undefined): TaskLayout {
  return value === 'strip' || value === 'rail' || value === 'cards' ? value : 'cards';
}

function slotRange(slot: TimeSlot): { start: number; end: number } {
  const start = parseTimeToMinutes(slot.startTime);
  let end = parseTimeToMinutes(slot.endTime);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

/** Habits whose pinned clock time falls inside this interval. */
export function habitsInSlot(habits: DailyHabit[], slot: TimeSlot): DailyHabit[] {
  const { start, end } = slotRange(slot);
  return habits.filter((habit) => {
    const t = parseTimeToMinutes(habit.startTime);
    return t >= start && t < end;
  });
}

/** Same activity at the same clock time is one daily task. */
export function withHabitAdded(habits: DailyHabit[], habit: DailyHabit): DailyHabit[] {
  const exists = habits.some(
    (h) => h.activityId === habit.activityId && h.startTime === habit.startTime,
  );
  return exists ? habits : [...habits, habit];
}

/**
 * Checking a task adds its activity to that day's interval log.
 * Unchecking removes only that activity. An empty log is deleted.
 */
export function withHabitToggled(
  logs: IntervalLog[],
  slot: TimeSlot,
  activityId: string,
  recordedAt: string,
): IntervalLog[] {
  const existing = logs.find((l) => l.date === slot.date && l.startTime === slot.startTime);
  const ids = existing?.activityIds ?? [];
  const next = ids.includes(activityId)
    ? ids.filter((id) => id !== activityId)
    : [...ids, activityId];
  const rest = logs.filter((l) => !(l.date === slot.date && l.startTime === slot.startTime));
  if (next.length === 0) return rest;
  return [
    ...rest,
    {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      activityIds: next,
      recordedAt,
    },
  ];
}
