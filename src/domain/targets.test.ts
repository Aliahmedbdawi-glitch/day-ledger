import { describe, expect, it } from 'vitest';
import type { AppData } from './types';
import { computeTargetProgress, recommendedProgress } from './targets';
import { createEmptyData } from '../data/storage';

// 2026-10-12 is a Monday.
const DAY = '2026-10-12';
const AFTER = new Date(2026, 9, 20);

function makeData(): AppData {
  const base = createEmptyData();
  return {
    ...base,
    activities: [
      { id: 'med', categoryId: 'c', name: 'Medicine', points: 100, sortOrder: 0 },
      { id: 'gym', categoryId: 'c', name: 'Gym', points: 80, sortOrder: 1 },
      { id: 'sm', categoryId: 'c', name: 'Social Media', points: -50, sortOrder: 2 },
    ],
    logs: [
      { date: DAY, startTime: '09:00', endTime: '10:00', activityIds: ['med'], recordedAt: '' },
      { date: DAY, startTime: '12:00', endTime: '13:00', activityIds: ['sm'], recordedAt: '' },
    ],
    dayIntervalMinutes: { [DAY]: 60 },
    targets: [
      { id: 't1', activityId: 'med', kind: 'atLeast', minutes: 180, weekdays: [1] },
      { id: 't2', activityId: 'gym', kind: 'atLeast', minutes: 60, weekdays: [1, 3] },
      { id: 't3', activityId: 'sm', kind: 'atMost', minutes: 30, weekdays: [1] },
      { id: 't4', activityId: 'gym', kind: 'atLeast', minutes: 60, weekdays: [6] },
    ],
  };
}

describe('targets', () => {
  it('tracks progress only for targets scheduled that weekday', () => {
    const progress = computeTargetProgress(makeData(), DAY, AFTER);
    expect(progress.map((p) => p.target.id)).toEqual(['t1', 't2', 't3']);
    const med = progress[0];
    expect(med.doneMinutes).toBe(60);
    expect(med.remainingMinutes).toBe(120);
    expect(med.met).toBe(false);
    expect(progress[2].exceeded).toBe(true);
  });

  it('recommends unmet "at least" targets, biggest gap first', () => {
    const rec = recommendedProgress(computeTargetProgress(makeData(), DAY, AFTER));
    expect(rec.map((p) => p.activity.id)).toEqual(['med', 'gym']);
  });
});
