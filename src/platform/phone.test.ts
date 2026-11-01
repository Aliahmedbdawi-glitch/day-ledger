import { describe, expect, it } from 'vitest';
import { createEmptyData } from '../data/storage';
import { applyWidgetEdits, type WidgetEdit } from './phone';

const edit: WidgetEdit = { id: 'event-1', date: '2026-10-31', startTime: '10:00', endTime: '10:30', index: 20, activityId: 'reading', done: true };
function fixture() {
  const data = createEmptyData();
  data.activities = ['reading', 'work'].map(id => ({ id, name: id, categoryId: 'c', points: 10, sortOrder: 0 }));
  return data;
}
describe('widget synchronization', () => {
  it('records completion and its acknowledgement together', () => {
    const result = applyWidgetEdits(fixture(), [edit]);
    expect(result.logs[0].activityIds).toEqual(['reading']);
    expect(result.appliedWidgetEdits).toEqual(['event-1']);
  });
  it('does not replay a saved operation after the user changes the app', () => {
    const completed = applyWidgetEdits(fixture(), [edit]);
    const userCleared = { ...completed, logs: [] };
    expect(applyWidgetEdits(userCleared, [edit])).toBe(userCleared);
  });
  it('preserves unrelated actions when a widget habit is unchecked', () => {
    const data = applyWidgetEdits(fixture(), [edit]);
    data.logs[0].activityIds.push('work');
    const result = applyWidgetEdits(data, [{ ...edit, id: 'event-2', done: false }]);
    expect(result.logs[0].activityIds).toEqual(['work']);
  });
  it('acknowledges deleted activities without resurrecting them', () => {
    const data = fixture(); data.activities = [];
    const result = applyWidgetEdits(data, [edit]);
    expect(result.logs).toEqual([]);
    expect(result.appliedWidgetEdits).toEqual(['event-1']);
  });
  it('applies offline changes in order across a day boundary', () => {
    const result = applyWidgetEdits(fixture(), [edit, { ...edit, id: 'event-2', done: false }, { ...edit, id: 'event-3', date: '2026-11-01' }]);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].date).toBe('2026-11-01');
  });
});
