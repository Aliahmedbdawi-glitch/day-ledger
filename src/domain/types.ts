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
  points: number;
  sortOrder: number;
}

export interface IntervalLog {
  date: string;
  startTime: string;
  endTime: string;
  activityIds: string[];
  recordedAt: string;
}

export interface Settings {
  defaultIntervalMinutes: IntervalMinutes;
  notificationsEnabled: boolean;
  trackedDayTargetPercent: number;
  seeded: boolean;
}

export interface AppData {
  version: number;
  categories: Category[];
  activities: Activity[];
  logs: IntervalLog[];
  settings: Settings;
  dayIntervalMinutes: Record<string, IntervalMinutes>;
}

export type PageId = 'today' | 'statistics' | 'activities' | 'records' | 'settings';

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  index: number;
}
