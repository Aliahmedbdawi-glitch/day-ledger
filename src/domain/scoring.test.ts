import { describe, expect, it } from 'vitest';
import type { AppData } from './types';
import { generateDaySlots } from './grid';
import { computeDayStats, intervalScore } from './scoring';
import { createEmptyData } from '../data/storage';

describe('scoring', () => {
  it('averages activity points per interval', () => {
    expect(intervalScore(['a', 'b'], [
      { id: 'a', categoryId: 'c', name: 'A', points: 100, sortOrder: 0 },
      { id: 'b', categoryId: 'c', name: 'B', points: 50, sortOrder: 1 },
    ])).toBe(75);
  });

  it('ignores unrecorded slots in daily score', () => {
    const base = createEmptyData();
    const data: AppData = {
      ...base,
      activities: [
        { id: 'p', categoryId: 'w', name: 'Programming', points: 100, sortOrder: 0 },
      ],
      categories: [{ id: 'w', name: 'Work', icon: '💼', color: '#5C4D8A', sortOrder: 0 }],
      logs: [
        {
          date: '2026-10-11',
          startTime: '00:00',
          endTime: '00:30',
          activityIds: ['p'],
          recordedAt: new Date().toISOString(),
        },
      ],
      dayIntervalMinutes: { '2026-10-11': 30 },
    };
    const stats = computeDayStats(data, '2026-10-11');
    expect(stats.score).toBe(100);
    expect(stats.trackedPercent).toBeLessThan(100);
    expect(stats.totalSlots).toBe(generateDaySlots('2026-10-11', 30).length);
  });
});
