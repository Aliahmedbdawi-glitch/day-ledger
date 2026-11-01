import { describe, expect, it } from 'vitest';
import { createEmptyData } from '../data/storage';
import { applyIntervalChange, generateDaySlots, getCurrentSlot, getIntervalForDate } from './grid';
import { computeDayStats } from './scoring';
import { applyAutoSleep, selectionFromSleepDefaults, sleepDefaultsFromSelection } from './sleep';
import { parseTimeToMinutes } from './dates';

describe('interval changes', () => {
  it('changes an empty day immediately', () => {
    const data = applyIntervalChange(createEmptyData(), 15, '2026-11-01');
    expect(getIntervalForDate(data, '2026-11-01')).toBe(15);
    expect(generateDaySlots('2026-11-01', 15)).toHaveLength(96);
  });
  it('changes today immediately while preserving historical days and saved entries', () => {
    const data = createEmptyData();
    data.logs = ['2026-10-31', '2026-11-01'].map(date => ({ date, startTime: '09:00', endTime: '09:30', activityIds: ['a'], recordedAt: '' }));
    const changed = applyIntervalChange(applyIntervalChange(data, 15, '2026-11-01'), 60, '2026-11-01');
    expect(getIntervalForDate(changed, '2026-10-31')).toBe(30);
    expect(getIntervalForDate(changed, '2026-11-01')).toBe(60);
    expect(getIntervalForDate(changed, '2026-11-02')).toBe(60);
    expect(changed.logs).toBe(data.logs);
    const slots = generateDaySlots('2026-11-01', 60, changed.logs);
    expect(slots.find(s => s.startTime === '09:00')?.endTime).toBe('09:30');
    expect(slots.find(s => s.startTime === '10:00')?.endTime).toBe('11:00');
  });
  it('switches to 60 minutes even after automatic sleep has pinned today', () => {
    const initial = createEmptyData();
    initial.settings.autoSleepSince = '2026-11-01';
    const data = applyAutoSleep(initial, new Date(2026, 10, 1, 12));
    expect(data.logs.length).toBeGreaterThan(0);
    const changed = applyIntervalChange(data, 60, '2026-11-01');
    expect(getIntervalForDate(changed, '2026-11-01')).toBe(60);
    const slots = generateDaySlots('2026-11-01', 60, changed.logs);
    expect(slots.find(s => s.startTime === '12:00')?.endTime).toBe('13:00');
    expect(changed.logs).toBe(data.logs);
    expect(applyAutoSleep(changed, new Date(2026, 10, 1, 12)).logs).toBe(changed.logs);
  });
  it('covers the day without gaps or overlaps and keeps minutes and points after repeated changes', () => {
    const data = createEmptyData();
    data.activities = [{ id: 'a', categoryId: 'c', name: 'Work', points: 60, sortOrder: 0 }];
    data.logs = [{ date: '2026-11-01', startTime: '09:20', endTime: '09:40', activityIds: ['a'], recordedAt: '' }];
    for (const interval of [60, 15, 60] as const) {
      const changed = applyIntervalChange(data, interval, '2026-11-01');
      const slots = generateDaySlots('2026-11-01', interval, changed.logs);
      expect(slots[0].startTime).toBe('00:00');
      expect(slots.at(-1)?.endTime).toBe('24:00');
      slots.forEach((slot, i) => {
        expect(parseTimeToMinutes(slot.endTime)).toBeGreaterThan(parseTimeToMinutes(slot.startTime));
        if (i) expect(slot.startTime).toBe(slots[i - 1].endTime);
      });
      const stats = computeDayStats(changed, '2026-11-01', new Date(2026, 10, 2));
      expect(stats.timeByActivityMinutes.a).toBe(20);
      expect(stats.gainedPoints).toBe(20);
      expect(stats.unrecordedMinutes).toBe(1420);
      expect(stats.trackedPercent).toBe(1);
      const selection = selectionFromSleepDefaults(slots, interval, 8, '10:00');
      expect(sleepDefaultsFromSelection(slots.filter(s => selection.selectedStartTimes.has(s.startTime)), interval)).toEqual({ durationHours: 8, endTime: '10:00' });
    }
  });
  it('keeps existing future records on their original grid', () => {
    const data = createEmptyData();
    data.logs = [{ date: '2026-11-02', startTime: '09:00', endTime: '09:20', activityIds: ['a'], recordedAt: '' }];
    expect(getIntervalForDate(applyIntervalChange(data, 60, '2026-11-01'), '2026-11-02')).toBe(20);
  });
  it('moves the highlight at the exact interval boundary', () => {
    const slots = generateDaySlots('2026-11-01', 15);
    expect(getCurrentSlot(slots, new Date(2026, 10, 1, 9, 14))?.startTime).toBe('09:00');
    expect(getCurrentSlot(slots, new Date(2026, 10, 1, 9, 15))?.startTime).toBe('09:15');
  });
});
