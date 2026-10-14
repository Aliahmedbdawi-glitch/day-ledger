import { describe, expect, it } from 'vitest';
import type { AppData, IntervalLog } from './types';
import { generateDaySlots } from './grid';
import { computeDayStats, formatPoints, intervalPoints } from './scoring';
import { createEmptyData } from '../data/storage';

const DAY = '2026-10-11';
const AFTER = new Date(2026, 9, 20, 12, 0);

function log(startTime: string, endTime: string, activityIds: string[]): IntervalLog {
  return { date: DAY, startTime, endTime, activityIds, recordedAt: '' };
}

function hourLogs(fromHour: number, toHour: number, activityIds: string[]): IntervalLog[] {
  const out: IntervalLog[] = [];
  for (let h = fromHour; h < toHour; h += 1) {
    const pad = (n: number) => String(n).padStart(2, '0');
    out.push(log(`${pad(h)}:00`, `${pad(h + 1)}:00`, activityIds));
  }
  return out;
}

function makeData(logs: IntervalLog[], settings: Partial<AppData['settings']> = {}): AppData {
  const base = createEmptyData();
  return {
    ...base,
    categories: [{ id: 'w', name: 'Work', icon: '💼', color: '#5C4D8A', sortOrder: 0 }],
    activities: [
      { id: 'p', categoryId: 'w', name: 'Programming', points: 100, sortOrder: 0 },
      { id: 'tv', categoryId: 'w', name: 'Social Media', points: -50, sortOrder: 1 },
      { id: 's', categoryId: 'w', name: 'Sleep', points: 10, sortOrder: 2 },
    ],
    logs,
    dayIntervalMinutes: { [DAY]: 60 },
    settings: { ...base.settings, unrecordedPenaltyPerHour: 0, ...settings },
  };
}

describe('scoring', () => {
  it('earns points per hour and splits a slot between activities', () => {
    const acts = makeData([]).activities;
    expect(intervalPoints(['p'], acts, 30)).toBe(50);
    expect(intervalPoints(['p', 'tv'], acts, 60)).toBe(25);
  });

  it('negative activities subtract from the day', () => {
    const data = makeData([...hourLogs(9, 11, ['p']), ...hourLogs(11, 12, ['tv'])]);
    const stats = computeDayStats(data, DAY, AFTER);
    expect(stats.gainedPoints).toBe(200);
    expect(stats.lostPoints).toBe(-50);
    expect(stats.netPoints).toBe(150);
  });

  it('penalises sleep beyond the daily limit', () => {
    const data = makeData(hourLogs(0, 10, ['s']), {
      sleepLimitHours: 8,
      oversleepPenaltyPerHour: 50,
    });
    const stats = computeDayStats(data, DAY, AFTER);
    expect(stats.sleepMinutes).toBe(600);
    expect(stats.oversleepMinutes).toBe(120);
    expect(stats.oversleepPenalty).toBe(-100);
    expect(stats.netPoints).toBe(80 - 100);
    expect(stats.slotPoints['09:00']).toBe(-50);
  });

  it('charges unrecorded elapsed time once anything is logged', () => {
    const data = makeData(hourLogs(9, 10, ['p']), { unrecordedPenaltyPerHour: 10 });
    const stats = computeDayStats(data, DAY, AFTER);
    expect(stats.unrecordedMinutes).toBe(23 * 60);
    expect(stats.netPoints).toBe(100 - 230);
    expect(computeDayStats(makeData([]), DAY, AFTER).netPoints).toBeNull();
  });

  it('only counts elapsed slots for today', () => {
    const now = new Date(2026, 9, 11, 12, 0);
    const data = makeData(hourLogs(0, 12, ['p']));
    const stats = computeDayStats(data, DAY, now);
    expect(stats.elapsedSlots).toBe(12);
    expect(stats.trackedPercent).toBe(100);
    expect(stats.totalSlots).toBe(generateDaySlots(DAY, 60).length);
  });

  it('formats signed points', () => {
    expect(formatPoints(12.4)).toBe('+12');
    expect(formatPoints(-7)).toBe('−7');
    expect(formatPoints(0)).toBe('0');
  });
});
