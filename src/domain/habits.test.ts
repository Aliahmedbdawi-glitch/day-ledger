import { describe, expect, it } from 'vitest';
import { generateDaySlots } from './grid';
import { habitsInSlot, withHabitAdded, withHabitToggled } from './habits';
import type { DailyHabit, TimeSlot } from './types';

function habit(startTime: string, activityId = 'a'): DailyHabit {
  return { id: startTime + activityId, activityId, startTime };
}

function slot(start: string, end: string): TimeSlot {
  return { date: '2026-10-26', startTime: start, endTime: end, index: 0 };
}

describe('habitsInSlot', () => {
  it('pins a 07:30 task to the 07:30 slot on a 30-minute day', () => {
    const slots = generateDaySlots('2026-10-26', 30);
    const hit = slots.find((s) => habitsInSlot([habit('07:30')], s).length === 1);
    expect(hit?.startTime).toBe('07:30');
  });

  it('pins a 07:30 task to the 07:00 hour on a 60-minute day', () => {
    const slots = generateDaySlots('2026-10-26', 60);
    const hit = slots.find((s) => habitsInSlot([habit('07:30')], s).length === 1);
    expect(hit?.startTime).toBe('07:00');
  });

  it('keeps two tasks in the same interval', () => {
    const slots = generateDaySlots('2026-10-26', 30);
    const slot730 = slots.find((s) => s.startTime === '07:30');
    expect(slot730).toBeDefined();
    const found = habitsInSlot([habit('07:30', 'med'), habit('07:30', 'read')], slot730!);
    expect(found.map((h) => h.activityId)).toEqual(['med', 'read']);
  });
});

describe('withHabitToggled', () => {
  const s = slot('07:30', '08:00');

  it('records the activity on an empty interval', () => {
    expect(withHabitToggled([], s, 'med', 't')).toEqual([
      {
        date: s.date,
        startTime: '07:30',
        endTime: '08:00',
        activityIds: ['med'],
        recordedAt: 't',
      },
    ]);
  });

  it('keeps other activities when one task is unchecked', () => {
    const logs = withHabitToggled(
      [
        {
          date: s.date,
          startTime: '07:30',
          endTime: '08:00',
          activityIds: ['med', 'read'],
          recordedAt: 't',
        },
      ],
      s,
      'med',
      't2',
    );
    expect(logs[0].activityIds).toEqual(['read']);
  });

  it('clears the log when the last activity is unchecked', () => {
    const logs = withHabitToggled(
      [
        {
          date: s.date,
          startTime: '07:30',
          endTime: '08:00',
          activityIds: ['med'],
          recordedAt: 't',
        },
      ],
      s,
      'med',
      't2',
    );
    expect(logs).toEqual([]);
  });
});

describe('withHabitAdded', () => {
  it('ignores the same activity pinned to the same time', () => {
    const existing = habit('07:30', 'a');
    expect(withHabitAdded([existing], { id: '2', activityId: 'a', startTime: '07:30' })).toEqual([
      existing,
    ]);
  });

  it('allows the same activity at a different time', () => {
    const existing = habit('07:30', 'a');
    expect(withHabitAdded([existing], { id: '2', activityId: 'a', startTime: '21:00' })).toHaveLength(2);
  });
});
