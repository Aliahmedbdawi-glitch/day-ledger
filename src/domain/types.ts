export type IntervalMinutes = 5 | 10 | 15 | 20 | 30 | 60;

export const INTERVAL_OPTIONS: IntervalMinutes[] = [5, 10, 15, 20, 30, 60];

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface Activity {
  id: string;
  categoryId: string;
  name: string;
  /** Points per hour, -100..+100. Negative = time-wasting or harmful. */
  points: number;
  sortOrder: number;
}

export interface IntervalLog {
  date: string;
  startTime: string;
  endTime: string;
  activityIds: string[];
  recordedAt: string;
  /** 'auto' when filled by sleep auto-register; absent for manual logs. */
  source?: 'auto';
}

export interface Settings {
  defaultIntervalMinutes: IntervalMinutes;
  notificationsEnabled: boolean;
  trackedDayTargetPercent: number;
  seeded: boolean;
  /** Typical sleep length for quick-add (hours). */
  defaultSleepDurationHours: number;
  /** Wake time: end of the last sleep slot (HH:mm). */
  defaultSleepEndTime: string;
  /** Fill unrecorded slots in the sleep window with Sleep once the window has passed. */
  autoRegisterSleep: boolean;
  /** Auto-register never backfills days before this date. */
  autoSleepSince: string;
  /** Sleep beyond this many hours in a day is penalised. */
  sleepLimitHours: number;
  /** Points lost per hour of sleep over the limit (positive number). */
  oversleepPenaltyPerHour: number;
  /** Silence interval reminders during the sleep window. */
  quietDuringSleep: boolean;
  /** Points lost per hour of elapsed time left unrecorded (positive number). */
  unrecordedPenaltyPerHour: number;
  /** Net points a day needs to count as productive. */
  dailyPointsGoal: number;
  /** Which task-box layout the timeline uses. */
  taskLayout: TaskLayout;
}

/** How daily task boxes sit on the timeline. */
export type TaskLayout = 'strip' | 'cards' | 'rail';

/** An activity pinned to a clock time, shown every day in the interval that contains it. */
export interface DailyHabit {
  id: string;
  activityId: string;
  /** Clock time this task is pinned to (HH:mm). */
  startTime: string;
}

export interface AppData {
  version: number;
  categories: Category[];
  activities: Activity[];
  logs: IntervalLog[];
  settings: Settings;
  dayIntervalMinutes: Record<string, IntervalMinutes>;
  targets: DailyTarget[];
  habits: DailyHabit[];
}

/** 'atLeast' = a goal to reach (e.g. 2h Medicine); 'atMost' = a cap (e.g. 30m Social Media). */
export type TargetKind = 'atLeast' | 'atMost';

export interface DailyTarget {
  id: string;
  activityId: string;
  kind: TargetKind;
  minutes: number;
  /** Days the target applies, 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
}

export type PageId = 'today' | 'statistics' | 'targets' | 'activities' | 'records' | 'settings';

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  index: number;
}
