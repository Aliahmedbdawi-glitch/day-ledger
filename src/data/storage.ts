import type { AppData, Settings } from '../domain/types';

const STORAGE_KEY = 'day-ledger-v1';

export function defaultSettings(): Settings {
  return {
    defaultIntervalMinutes: 30,
    notificationsEnabled: true,
    trackedDayTargetPercent: 80,
    seeded: false,
    defaultSleepDurationHours: 8,
    defaultSleepEndTime: '07:00',
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
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== 1) return createEmptyData();
    return {
      ...createEmptyData(),
      ...parsed,
      settings: { ...defaultSettings(), ...parsed.settings },
    };
  } catch {
    return createEmptyData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
