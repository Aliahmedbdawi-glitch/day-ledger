import type { Activity, AppData, Category } from './types';
import { addDays, startOfWeekMonday, weekDateKeys } from './dates';
import { findLog, generateDaySlots, getIntervalForDate } from './grid';

export interface DayStats {
  date: string;
  score: number | null;
  trackedPercent: number;
  loggedCount: number;
  totalSlots: number;
  unrecordedMinutes: number;
  timeByCategoryMinutes: Record<string, number>;
  timeByActivityMinutes: Record<string, number>;
  isProductiveDay: boolean;
}

export interface WeekStats {
  weekStart: string;
  averageScore: number | null;
  averageTrackedPercent: number;
  timeByCategoryMinutes: Record<string, number>;
  timeByActivityMinutes: Record<string, number>;
  unrecordedMinutes: number;
  bestDay: string | null;
  weakestDay: string | null;
  dailyScores: { date: string; score: number | null; trackedPercent: number }[];
}

export interface PersonalRecords {
  highestDailyScore: { value: number; date: string } | null;
  highestWeeklyAverage: { value: number; weekStart: string } | null;
  mostTrackedDay: { value: number; date: string } | null;
  longestProductiveStreak: number;
  currentProductiveStreak: number;
}

function activityMap(activities: Activity[]): Map<string, Activity> {
  return new Map(activities.map((a) => [a.id, a]));
}

export function intervalScore(activityIds: string[], activities: Activity[]): number {
  if (activityIds.length === 0) return 0;
  const map = activityMap(activities);
  const points = activityIds.map((id) => map.get(id)?.points ?? 0);
  return points.reduce((a, b) => a + b, 0) / points.length;
}

export function computeDayStats(data: AppData, date: string): DayStats {
  const interval = getIntervalForDate(data, date);
  const slots = generateDaySlots(date, interval);
  const slotMinutes = interval;
  const activities = activityMap(data.activities);

  let scoreSum = 0;
  let scoreCount = 0;
  let loggedCount = 0;
  const timeByCategoryMinutes: Record<string, number> = {};
  const timeByActivityMinutes: Record<string, number> = {};

  for (const slot of slots) {
    const log = findLog(data.logs, slot);
    if (!log) continue;
    loggedCount += 1;
    const score = intervalScore(log.activityIds, data.activities);
    scoreSum += score;
    scoreCount += 1;

    if (log.activityIds.length === 0) continue;
    const share = slotMinutes / log.activityIds.length;
    for (const id of log.activityIds) {
      timeByActivityMinutes[id] = (timeByActivityMinutes[id] ?? 0) + share;
      const act = activities.get(id);
      if (act) {
        const catId = act.categoryId;
        timeByCategoryMinutes[catId] = (timeByCategoryMinutes[catId] ?? 0) + share;
      }
    }
  }

  const totalSlots = slots.length;
  const trackedPercent = totalSlots === 0 ? 0 : Math.round((loggedCount / totalSlots) * 100);
  const unrecordedMinutes = (totalSlots - loggedCount) * slotMinutes;
  const score = scoreCount === 0 ? null : Math.round(scoreSum / scoreCount);

  const target = data.settings.trackedDayTargetPercent;
  const isProductiveDay = trackedPercent >= target;

  return {
    date,
    score,
    trackedPercent,
    loggedCount,
    totalSlots,
    unrecordedMinutes,
    timeByCategoryMinutes,
    timeByActivityMinutes,
    isProductiveDay,
  };
}

export function computeWeekStats(data: AppData, anchorDate: string): WeekStats {
  const weekStart = startOfWeekMonday(anchorDate);
  const days = weekDateKeys(weekStart);
  const daily = days.map((d) => computeDayStats(data, d));

  let scoreSum = 0;
  let scoreDays = 0;
  let trackedSum = 0;
  const timeByCategoryMinutes: Record<string, number> = {};
  const timeByActivityMinutes: Record<string, number> = {};
  let unrecordedMinutes = 0;

  for (const day of daily) {
    if (day.score !== null) {
      scoreSum += day.score;
      scoreDays += 1;
    }
    trackedSum += day.trackedPercent;
    unrecordedMinutes += day.unrecordedMinutes;
    for (const [k, v] of Object.entries(day.timeByCategoryMinutes)) {
      timeByCategoryMinutes[k] = (timeByCategoryMinutes[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(day.timeByActivityMinutes)) {
      timeByActivityMinutes[k] = (timeByActivityMinutes[k] ?? 0) + v;
    }
  }

  const withScore = daily.filter((d) => d.score !== null);
  let bestDay: string | null = null;
  let weakestDay: string | null = null;
  if (withScore.length > 0) {
    const sorted = [...withScore].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    bestDay = sorted[0].date;
    weakestDay = sorted[sorted.length - 1].date;
  }

  return {
    weekStart,
    averageScore: scoreDays === 0 ? null : Math.round(scoreSum / scoreDays),
    averageTrackedPercent: Math.round(trackedSum / 7),
    timeByCategoryMinutes,
    timeByActivityMinutes,
    unrecordedMinutes,
    bestDay,
    weakestDay,
    dailyScores: daily.map((d) => ({
      date: d.date,
      score: d.score,
      trackedPercent: d.trackedPercent,
    })),
  };
}

function enumerateDatesWithLogs(data: AppData): string[] {
  const set = new Set(data.logs.map((l) => l.date));
  return [...set].sort();
}

function productiveStreakEndingOn(data: AppData, endDate: string): number {
  let streak = 0;
  let cursor = endDate;
  for (let i = 0; i < 4000; i += 1) {
    const stats = computeDayStats(data, cursor);
    if (!stats.isProductiveDay) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computePersonalRecords(data: AppData, today: string): PersonalRecords {
  const dates = enumerateDatesWithLogs(data);
  let highestDailyScore: { value: number; date: string } | null = null;
  let mostTrackedDay: { value: number; date: string } | null = null;

  for (const date of dates) {
    const stats = computeDayStats(data, date);
    if (stats.score !== null) {
      if (!highestDailyScore || stats.score > highestDailyScore.value) {
        highestDailyScore = { value: stats.score, date };
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
    const anchor = ws;
    const week = computeWeekStats(data, anchor);
    if (week.averageScore !== null) {
      if (!highestWeeklyAverage || week.averageScore > highestWeeklyAverage.value) {
        highestWeeklyAverage = { value: week.averageScore, weekStart: ws };
      }
    }
  }

  let longestProductiveStreak = 0;
  for (const date of dates) {
    const s = productiveStreakEndingOn(data, date);
    if (s > longestProductiveStreak) longestProductiveStreak = s;
  }

  const currentProductiveStreak = productiveStreakEndingOn(data, today);

  return {
    highestDailyScore,
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
