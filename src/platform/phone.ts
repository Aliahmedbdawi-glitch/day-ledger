import { registerPlugin } from '@capacitor/core';
import type { AppData, TimeSlot } from '../domain/types';
import { withHabitToggled } from '../domain/habits';

export interface WidgetEdit extends TimeSlot { id: string; activityId: string; done: boolean }
export const Phone = registerPlugin<{
  sync(options: { data: string; acknowledged: string[] }): Promise<{ edits: WidgetEdit[] }>;
  update(): Promise<{ message: string }>;
}>('Phone');

/** Absolute completion state makes replay after a crash safe. */
export function applyWidgetEdits(data: AppData, edits: WidgetEdit[], recordedAt = new Date().toISOString()): AppData {
  let logs = data.logs;
  const applied = new Set(data.appliedWidgetEdits ?? []);
  let changed = false;
  for (const edit of edits) {
    if (applied.has(edit.id)) continue;
    applied.add(edit.id);
    changed = true;
    if (!data.activities.some(a => a.id === edit.activityId)) continue;
    const done = logs.find(l => l.date === edit.date && l.startTime === edit.startTime)?.activityIds.includes(edit.activityId) ?? false;
    if (done !== edit.done) logs = withHabitToggled(logs, edit, edit.activityId, recordedAt);
  }
  return changed ? { ...data, logs, appliedWidgetEdits: [...applied] } : data;
}
