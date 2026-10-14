import type { Activity, AppData, DailyTarget } from './types';
import { parseDateKey } from './dates';
import { computeDayStats } from './scoring';

export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export interface TargetProgress {
  target: DailyTarget;
  activity: Activity;
  doneMinutes: number;
  /** Minutes still needed (atLeast) or still allowed (atMost); never negative. */
  remainingMinutes: number;
  met: boolean;
  /** atMost only: the cap has been passed. */
  exceeded: boolean;
}

export function targetsForDate(data: AppData, date: string): DailyTarget[] {
  const weekday = parseDateKey(date).getDay();
  const ids = new Set(data.activities.map((a) => a.id));
  return data.targets.filter((t) => t.weekdays.includes(weekday) && ids.has(t.activityId));
}

export function computeTargetProgress(
  data: AppData,
  date: string,
  now: Date = new Date(),
): TargetProgress[] {
  const targets = targetsForDate(data, date);
  if (targets.length === 0) return [];
  const { timeByActivityMinutes } = computeDayStats(data, date, now);
  const byId = new Map(data.activities.map((a) => [a.id, a]));

  return targets.map((target) => {
    const done = Math.round(timeByActivityMinutes[target.activityId] ?? 0);
    const remaining = Math.max(0, target.minutes - done);
    return {
      target,
      activity: byId.get(target.activityId)!,
      doneMinutes: done,
      remainingMinutes: remaining,
      met: target.kind === 'atLeast' ? done >= target.minutes : done <= target.minutes,
      exceeded: target.kind === 'atMost' && done > target.minutes,
    };
  });
}

/** Unmet "at least" targets, biggest gap first: what to log next. */
export function recommendedProgress(progress: TargetProgress[]): TargetProgress[] {
  return progress
    .filter((p) => p.target.kind === 'atLeast' && !p.met)
    .sort((a, b) => b.remainingMinutes - a.remainingMinutes);
}
