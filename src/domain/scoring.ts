import type { Activity, AppData, Category, IntervalLog } from './types';
import { addDays, formatDateKey, parseTimeToMinutes, startOfWeekMonday, weekDateKeys } from './dates';
import { generateDaySlots, getIntervalForDate } from './grid';
import { findSleepActivity } from './sleep';

/**
 * Day assessment model ("net points ledger"):
 *  - Each activity earns its points *per hour* (negative for harmful activities),
 *    so the result does not depend on the interval length.
 *  - A slot with several activities splits its time evenly between them.
 *  - Sleep beyond `sleepLimitHours` earns -oversleepPenaltyPerHour instead of Sleep's points.
 *  - Elapsed time left unrecorded costs -unrecordedPenaltyPerHour, so logging only
 *    the good hours can't inflate the day.
 *  - Net = gained + lost. The day is "productive" when net reaches the daily goal
 *    and enough of the elapsed day is tracked.
 */
export interface DayStats {
  date: string;
  /** Net points, or null when nothing was logged that day. */
  netPoints: number | null;
  gainedPoints: number;
  /** Sum of all negative contributions (≤ 0), penalties included. */
  lostPoints: number;
  /** netPoints as % of the daily goal (can exceed 100 or be negative). */
  goalPercent: number | null;
  /** Points per slot, keyed by slot start time. */
  slotPoints: Record<string, number>;
  trackedPercent: number;
  loggedCount: number;
  elapsedSlots: number;
  totalSlots: number;
  unrecordedMinutes: number;
  unrecordedPenalty: number;
  sleepMinutes: number;
  oversleepMinutes: number;
  oversleepPenalty: number;
  timeByCategoryMinutes: Record<string, number>;
  timeByActivityMinutes: Record<string, number>;
  isProductiveDay: boolean;
}

export interface WeekStats {
  weekStart: string;
  averageNetPoints: number | null;
  totalNetPoints: number;
  averageTrackedPercent: number;
  timeByCategoryMinutes: Record<string, number>;
  timeByActivityMinutes: Record<string, number>;
  unrecordedMinutes: number;
  bestDay: string | null;
  weakestDay: string | null;
  dailyScores: { date: string; netPoints: number | null; trackedPercent: number }[];
}

export interface PersonalRecords {
  highestDailyNet: { value: number; date: string } | null;
  highestWeeklyAverage: { value: number; weekStart: string } | null;
  mostTrackedDay: { value: number; date: string } | null;
  longestProductiveStreak: number;
  currentProductiveStreak: number;
}

function activityMap(activities: Activity[]): Map<string, Activity> {
  return new Map(activities.map((a) => [a.id, a]));
}

/** Points for one slot, ignoring the sleep limit. */
export function intervalPoints(
  activityIds: string[],
  activities: Activity[],
  slotMinutes: number,
): number {
  if (activityIds.length === 0) return 0;
  const map = activityMap(activities);
  const hoursEach = slotMinutes / activityIds.length / 60;
  return activityIds.reduce((sum, id) => sum + (map.get(id)?.points ?? 0) * hoursEach, 0);
}

export function formatPoints(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `−${Math.abs(rounded)}`;
  return '0';
}

export function computeDayStats(data: AppData, date: string, now: Date = new Date()): DayStats {
  const { settings } = data;
  const interval = getIntervalForDate(data, date);
  const slots = generateDaySlots(date, interval);
  const activities = activityMap(data.activities);
  const sleepId = findSleepActivity(data.activities)?.id;
  const sleepLimitMinutes = Math.max(0, settings.sleepLimitHours) * 60;

  const today = formatDateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isElapsed = (endTime: string) =>
    date < today || (date === today && parseTimeToMinutes(endTime) <= nowMin);

  const logsByStart = new Map<string, IntervalLog>();
  for (const l of data.logs) if (l.date === date) logsByStart.set(l.startTime, l);

  let gained = 0;
  let lost = 0;
  let loggedCount = 0;
  let loggedElapsed = 0;
  let elapsedSlots = 0;
  let unrecordedMinutes = 0;
  let sleepMinutes = 0;
  let oversleepMinutes = 0;
  const slotPoints: Record<string, number> = {};
  const timeByCategoryMinutes: Record<string, number> = {};
  const timeByActivityMinutes: Record<string, number> = {};

  const add = (pts: number) => {
    if (pts >= 0) gained += pts;
    else lost += pts;
    return pts;
  };

  for (const slot of slots) {
    const elapsed = isElapsed(slot.endTime);
    if (elapsed) elapsedSlots += 1;
    const log = logsByStart.get(slot.startTime);
    if (!log) {
      if (elapsed) unrecordedMinutes += interval;
      continue;
    }
    loggedCount += 1;
    if (elapsed) loggedElapsed += 1;
    if (log.activityIds.length === 0) {
      slotPoints[slot.startTime] = 0;
      continue;
    }

    const share = interval / log.activityIds.length;
    let pts = 0;
    for (const id of log.activityIds) {
      timeByActivityMinutes[id] = (timeByActivityMinutes[id] ?? 0) + share;
      const act = activities.get(id);
      if (!act) continue;
      timeByCategoryMinutes[act.categoryId] = (timeByCategoryMinutes[act.categoryId] ?? 0) + share;

      if (id === sleepId) {
        const within = Math.min(share, Math.max(0, sleepLimitMinutes - sleepMinutes));
        const over = share - within;
        sleepMinutes += share;
        oversleepMinutes += over;
        pts += add((act.points * within) / 60);
        pts += add((-settings.oversleepPenaltyPerHour * over) / 60);
      } else {
        pts += add((act.points * share) / 60);
      }
    }
    slotPoints[slot.startTime] = pts;
  }

  const unrecordedPenalty =
    loggedCount === 0 ? 0 : (-settings.unrecordedPenaltyPerHour * unrecordedMinutes) / 60;
  add(unrecordedPenalty);

  const netPoints = loggedCount === 0 ? null : Math.round(gained + lost);
  const trackedPercent = elapsedSlots === 0 ? 0 : Math.round((loggedElapsed / elapsedSlots) * 100);
  const goal = settings.dailyPointsGoal;
  const goalPercent =
    netPoints === null || goal <= 0 ? null : Math.round((netPoints / goal) * 100);
  const isProductiveDay =
    netPoints !== null && netPoints >= goal && trackedPercent >= settings.trackedDayTargetPercent;

  return {
    date,
    netPoints,
    gainedPoints: Math.round(gained),
    lostPoints: Math.round(lost),
    goalPercent,
    slotPoints,
    trackedPercent,
    loggedCount,
    elapsedSlots,
    totalSlots: slots.length,
    unrecordedMinutes,
    unrecordedPenalty: Math.round(unrecordedPenalty),
    sleepMinutes,
    oversleepMinutes,
    oversleepPenalty: Math.round((-settings.oversleepPenaltyPerHour * oversleepMinutes) / 60),
    timeByCategoryMinutes,
    timeByActivityMinutes,
    isProductiveDay,
  };
}

export function computeWeekStats(data: AppData, anchorDate: string, now: Date = new Date()): WeekStats {
  const weekStart = startOfWeekMonday(anchorDate);
  const days = weekDateKeys(weekStart);
  const daily = days.map((d) => computeDayStats(data, d, now));

  let netSum = 0;
  let netDays = 0;
  let trackedSum = 0;
  let trackedDays = 0;
  const timeByCategoryMinutes: Record<string, number> = {};
  const timeByActivityMinutes: Record<string, number> = {};
  let unrecordedMinutes = 0;

  for (const day of daily) {
    if (day.netPoints !== null) {
      netSum += day.netPoints;
      netDays += 1;
    }
    if (day.elapsedSlots > 0) {
      trackedSum += day.trackedPercent;
      trackedDays += 1;
    }
    unrecordedMinutes += day.unrecordedMinutes;
    for (const [k, v] of Object.entries(day.timeByCategoryMinutes)) {
      timeByCategoryMinutes[k] = (timeByCategoryMinutes[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(day.timeByActivityMinutes)) {
      timeByActivityMinutes[k] = (timeByActivityMinutes[k] ?? 0) + v;
    }
  }

  const withScore = daily.filter((d) => d.netPoints !== null);
  let bestDay: string | null = null;
  let weakestDay: string | null = null;
  if (withScore.length > 0) {
    const sorted = [...withScore].sort((a, b) => (b.netPoints ?? 0) - (a.netPoints ?? 0));
    bestDay = sorted[0].date;
    weakestDay = sorted[sorted.length - 1].date;
  }

  return {
    weekStart,
    averageNetPoints: netDays === 0 ? null : Math.round(netSum / netDays),
    totalNetPoints: netSum,
    averageTrackedPercent: trackedDays === 0 ? 0 : Math.round(trackedSum / trackedDays),
    timeByCategoryMinutes,
    timeByActivityMinutes,
    unrecordedMinutes,
    bestDay,
    weakestDay,
    dailyScores: daily.map((d) => ({
      date: d.date,
      netPoints: d.netPoints,
      trackedPercent: d.trackedPercent,
    })),
  };
}

function enumerateDatesWithLogs(data: AppData): string[] {
  const set = new Set(data.logs.map((l) => l.date));
  return [...set].sort();
}

function productiveStreakEndingOn(data: AppData, endDate: string, now: Date): number {
  let streak = 0;
  let cursor = endDate;
  for (let i = 0; i < 4000; i += 1) {
    const stats = computeDayStats(data, cursor, now);
    if (!stats.isProductiveDay) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computePersonalRecords(
  data: AppData,
  today: string,
  now: Date = new Date(),
): PersonalRecords {
  const dates = enumerateDatesWithLogs(data);
  let highestDailyNet: { value: number; date: string } | null = null;
  let mostTrackedDay: { value: number; date: string } | null = null;

  for (const date of dates) {
    const stats = computeDayStats(data, date, now);
    if (stats.netPoints !== null) {
      if (!highestDailyNet || stats.netPoints > highestDailyNet.value) {
        highestDailyNet = { value: stats.netPoints, date };
      }
    }
    if (!mostTrackedDay || stats.trackedPercent > mostTrackedDay.value) {
      mostTrackedDay = { value: stats.trackedPercent, date };
    }
  }

  const weekStarts = new Set<string>();
  for (const date of dates) {
    weekStarts.add(startOfWeekMonday(date));
  }
  let highestWeeklyAverage: { value: number; weekStart: string } | null = null;
  for (const ws of weekStarts) {
    const week = computeWeekStats(data, ws, now);
    if (week.averageNetPoints !== null) {
      if (!highestWeeklyAverage || week.averageNetPoints > highestWeeklyAverage.value) {
        highestWeeklyAverage = { value: week.averageNetPoints, weekStart: ws };
      }
    }
  }

  let longestProductiveStreak = 0;
  for (const date of dates) {
    const s = productiveStreakEndingOn(data, date, now);
    if (s > longestProductiveStreak) longestProductiveStreak = s;
  }

  // Today is still in progress: don't break the streak before the day is over.
  const todayDone = computeDayStats(data, today, now).isProductiveDay;
  const currentProductiveStreak = productiveStreakEndingOn(
    data,
    todayDone ? today : addDays(today, -1),
    now,
  );

  return {
    highestDailyNet,
    highestWeeklyAverage,
    mostTrackedDay,
    longestProductiveStreak,
    currentProductiveStreak,
  };
}

export function sortedCategoryBreakdown(
  data: AppData,
  minutesByCategory: Record<string, number>,
): { category: Category; minutes: number }[] {
  return data.categories
    .map((c) => ({ category: c, minutes: minutesByCategory[c.id] ?? 0 }))
    .filter((x) => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

export function sortedActivityBreakdown(
  data: AppData,
  minutesByActivity: Record<string, number>,
): { activity: Activity; minutes: number }[] {
  return data.activities
    .map((a) => ({ activity: a, minutes: minutesByActivity[a.id] ?? 0 }))
    .filter((x) => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}
