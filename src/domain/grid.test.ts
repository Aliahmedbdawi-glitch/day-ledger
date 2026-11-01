import { describe, expect, it } from 'vitest';
import { createEmptyData } from '../data/storage';
import { applyIntervalChange, generateDaySlots, getCurrentSlot, getIntervalForDate } from './grid';

describe('interval changes', () => {
  it('changes an empty day immediately', () => {
    const data = applyIntervalChange(createEmptyData(), 15, '2026-11-01');
    expect(getIntervalForDate(data, '2026-11-01')).toBe(15);
    expect(generateDaySlots('2026-11-01', 15)).toHaveLength(96);
  });
  it('preserves logged days and applies repeated changes to tomorrow', () => {
    const data = createEmptyData();
    data.logs = ['2026-10-31', '2026-11-01'].map(date => ({ date, startTime: '09:00', endTime: '09:30', activityIds: ['a'], recordedAt: '' }));
    const changed = applyIntervalChange(applyIntervalChange(data, 15, '2026-11-01'), 60, '2026-11-01');
    expect(getIntervalForDate(changed, '2026-10-31')).toBe(30);
    expect(getIntervalForDate(changed, '2026-11-01')).toBe(30);
    expect(getIntervalForDate(changed, '2026-11-02')).toBe(60);
    expect(changed.logs).toBe(data.logs);
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
