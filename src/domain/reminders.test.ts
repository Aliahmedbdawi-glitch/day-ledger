import { describe, expect, it } from 'vitest';
import type { AppData } from './types';
import { planReminders, reminderId } from './reminders';
import { createEmptyData } from '../data/storage';

function makeData(overrides: Partial<AppData['settings']> = {}): AppData {
  const base = createEmptyData();
  return {
    ...base,
    settings: {
      ...base.settings,
      defaultIntervalMinutes: 60,
      defaultSleepDurationHours: 8,
      defaultSleepEndTime: '07:00',
      ...overrides,
    },
  };
}

describe('planReminders', () => {
  it('schedules interval ends for the next day and stays silent overnight', () => {
    const now = new Date(2026, 9, 14, 20, 10);
    const plan = planReminders(makeData(), now);
    const labels = plan.map((r) => `${r.date} ${r.endTime}`);
    // 21:00 and 22:00 today; 23:00 ends exactly at bedtime and is inside the window.
    expect(labels.slice(0, 2)).toEqual(['2026-10-14 21:00', '2026-10-14 22:00']);
    expect(labels).not.toContain('2026-10-14 23:00');
    expect(labels).not.toContain('2026-10-15 03:00');
    // First reminder after waking is for 07:00–08:00.
    expect(labels[2]).toBe('2026-10-15 08:00');
  });

  it('skips slots already logged and respects the off switch', () => {
    const now = new Date(2026, 9, 14, 9, 30);
    const data = makeData();
    data.logs = [{ date: '2026-10-14', startTime: '10:00', endTime: '11:00', activityIds: [], recordedAt: '' }];
    const plan = planReminders(data, now);
    expect(plan.map((r) => r.startTime)).not.toContain('10:00');
    expect(planReminders(makeData({ notificationsEnabled: false }), now)).toEqual([]);
  });

  it('builds stable, unique ids', () => {
    expect(reminderId('2026-10-14', '17:30')).toBe(261014 * 1440 + 1050);
    expect(reminderId('2026-10-14', '17:30')).not.toBe(reminderId('2026-10-15', '17:30'));
  });
});
