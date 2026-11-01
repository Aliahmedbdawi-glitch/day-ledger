import type { AppData, Settings } from '../domain/types';
import { readTaskLayout } from '../domain/habits';
import { todayKey } from '../domain/dates';

const STORAGE_KEY = 'day-ledger-v1';

export function defaultSettings(): Settings {
  return {
    theme: 'system',
    defaultIntervalMinutes: 30,
    notificationsEnabled: true,
    trackedDayTargetPercent: 80,
    seeded: false,
    defaultSleepDurationHours: 8,
    defaultSleepEndTime: '07:00',
    autoRegisterSleep: true,
    autoSleepSince: todayKey(),
    sleepLimitHours: 9,
    oversleepPenaltyPerHour: 50,
    quietDuringSleep: true,
    unrecordedPenaltyPerHour: 10,
    dailyPointsGoal: 400,
    taskLayout: 'cards',
  };
}

export function createEmptyData(): AppData {
  return {
    version: 1,
    categories: [],
    activities: [],
    logs: [],
    settings: defaultSettings(),
    dayIntervalMinutes: {},
    targets: [],
    habits: [],
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== 1) return createEmptyData();
    const taskLayout = parsed.settings?.taskLayout;
    const savedTheme = parsed.settings?.theme ?? localStorage.getItem('day-ledger-theme');
    const theme = ['light', 'dark', 'forest', 'sand'].includes(savedTheme ?? '') ? savedTheme as Settings['theme'] : 'system';
    return {
      ...createEmptyData(),
      ...parsed,
      settings: {
        ...defaultSettings(),
        ...parsed.settings,
        taskLayout: readTaskLayout(taskLayout),
        theme,
      },
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
    };
  } catch {
    return createEmptyData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
