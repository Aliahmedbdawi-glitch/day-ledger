import { describe, expect, it } from 'vitest';
import type { AppData } from './types';
import { applyAutoSleep, isNowInSleepWindow, isSlotInSleepWindow, sleepWindow } from './sleep';
import { createEmptyData } from '../data/storage';

function makeData(overrides: Partial<AppData['settings']> = {}): AppData {
  const base = createEmptyData();
  return {
    ...base,
    settings: {
      ...base.settings,
      defaultSleepDurationHours: 8,
      defaultSleepEndTime: '07:00',
      autoSleepSince: '2026-10-01',
      defaultIntervalMinutes: 60,
      ...overrides,
    },
  };
}

describe('sleep window', () => {
  it('derives bedtime across midnight', () => {
    const w = sleepWindow(makeData().settings);
    expect(w.bedMin).toBe(23 * 60);
    expect(w.wakeMin).toBe(7 * 60);
    expect(isNowInSleepWindow(new Date(2026, 9, 11, 23, 30), w)).toBe(true);
    expect(isNowInSleepWindow(new Date(2026, 9, 11, 3, 0), w)).toBe(true);
    expect(isNowInSleepWindow(new Date(2026, 9, 11, 7, 0), w)).toBe(false);
    expect(isSlotInSleepWindow({ date: 'x', startTime: '06:00', endTime: '07:00', index: 6 }, w)).toBe(true);
    expect(isSlotInSleepWindow({ date: 'x', startTime: '07:00', endTime: '08:00', index: 7 }, w)).toBe(false);
  });
});

describe('applyAutoSleep', () => {
  it('fills the night only after wake-up and never overwrites manual logs', () => {
    const manual = {
      date: '2026-10-11',
      startTime: '02:00',
      endTime: '03:00',
      activityIds: ['work'],
      recordedAt: '',
    };
    const data = { ...makeData(), logs: [manual] };

    // 05:00 — still asleep, nothing filled yet.
    const early = applyAutoSleep(data, new Date(2026, 9, 11, 5, 0));
    expect(early.logs.filter((l) => l.date === '2026-10-11')).toHaveLength(1);

    // 07:30 — morning part of the 11th filled (00–07 except the manual 02:00 slot).
    const morning = applyAutoSleep(data, new Date(2026, 9, 11, 7, 30));
    const filled = morning.logs.filter((l) => l.date === '2026-10-11' && l.source === 'auto');
    expect(filled.map((l) => l.startTime)).toEqual(['00:00', '01:00', '03:00', '04:00', '05:00', '06:00']);
    expect(morning.logs.find((l) => l.startTime === '02:00' && l.date === '2026-10-11')?.activityIds).toEqual(['work']);
    expect(morning.activities.some((a) => a.name === 'Sleep')).toBe(true);

    // Running again changes nothing (same reference).
    expect(applyAutoSleep(morning, new Date(2026, 9, 11, 7, 31))).toBe(morning);
  });

  it('does nothing when disabled', () => {
    const data = makeData({ autoRegisterSleep: false });
    expect(applyAutoSleep(data, new Date(2026, 9, 11, 9, 0))).toBe(data);
  });
});
