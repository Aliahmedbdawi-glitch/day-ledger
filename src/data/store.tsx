import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Activity,
  AppData,
  Category,
  IntervalLog,
  IntervalMinutes,
  Settings,
  TimeSlot,
} from '../domain/types';
import { addDays, todayKey } from '../domain/dates';
import { findSleepActivity } from '../domain/sleep';
import { createExampleSeed } from './seed';
import { loadData, saveData } from './storage';

interface StoreValue {
  data: AppData;
  saveIntervalLog: (slot: TimeSlot, activityIds: string[]) => void;
  saveIntervalLogsBatch: (slots: TimeSlot[], activityIds: string[]) => void;
  saveSleepForSlots: (slots: TimeSlot[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setDefaultInterval: (minutes: IntervalMinutes) => void;
  seedExampleData: () => void;
  addCategory: (partial: Pick<Category, 'name' | 'icon' | 'color'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategory: (id: string, direction: 'up' | 'down') => void;
  addActivity: (categoryId: string, name: string, points?: number) => void;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  reorderActivity: (categoryId: string, id: string, direction: 'up' | 'down') => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

function sortActivities(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => a.sortOrder - b.sortOrder);
}

function hasLogsOnDate(data: AppData, date: string): boolean {
  return data.logs.some((l) => l.date === date);
}

function applyIntervalChange(data: AppData, minutes: IntervalMinutes): AppData {
  const today = todayKey();
  const next = { ...data, settings: { ...data.settings, defaultIntervalMinutes: minutes } };
  if (!hasLogsOnDate(data, today)) {
    return {
      ...next,
      dayIntervalMinutes: { ...data.dayIntervalMinutes, [today]: minutes },
    };
  }
  const tomorrow = addDays(today, 1);
  return {
    ...next,
    dayIntervalMinutes: { ...data.dayIntervalMinutes, [tomorrow]: minutes },
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const persist = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => updater(prev));
  }, []);

  const saveIntervalLog = useCallback((slot: TimeSlot, activityIds: string[]) => {
    persist((prev) => {
      const log: IntervalLog = {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        activityIds,
        recordedAt: new Date().toISOString(),
      };
      const rest = prev.logs.filter(
        (l) => !(l.date === slot.date && l.startTime === slot.startTime),
      );
      return { ...prev, logs: [...rest, log] };
    });
  }, [persist]);

  const saveIntervalLogsBatch = useCallback((slots: TimeSlot[], activityIds: string[]) => {
    if (slots.length === 0) return;
    persist((prev) => {
      const recordedAt = new Date().toISOString();
      const keys = new Set(slots.map((s) => `${s.date}|${s.startTime}`));
      const rest = prev.logs.filter((l) => !keys.has(`${l.date}|${l.startTime}`));
      const newLogs: IntervalLog[] = slots.map((slot) => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        activityIds,
        recordedAt,
      }));
      return { ...prev, logs: [...rest, ...newLogs] };
    });
  }, [persist]);

  const saveSleepForSlots = useCallback((slots: TimeSlot[]) => {
    if (slots.length === 0) return;
    persist((prev) => {
      let categories = prev.categories;
      let activities = prev.activities;
      let sleep = findSleepActivity(activities);
      if (!sleep) {
        let healthId = categories.find((c) => c.name.trim().toLowerCase() === 'health')?.id;
        if (!healthId) {
          healthId = crypto.randomUUID();
          const maxOrder = categories.reduce((m, c) => Math.max(m, c.sortOrder), -1);
          categories = [
            ...categories,
            {
              id: healthId,
              name: 'Health',
              icon: '😴',
              color: '#2F7D4A',
              sortOrder: maxOrder + 1,
            },
          ];
        }
        const inCat = activities.filter((a) => a.categoryId === healthId);
        const maxOrder = inCat.reduce((m, a) => Math.max(m, a.sortOrder), -1);
        sleep = {
          id: crypto.randomUUID(),
          categoryId: healthId,
          name: 'Sleep',
          points: 40,
          sortOrder: maxOrder + 1,
        };
        activities = [...activities, sleep];
      }

      const recordedAt = new Date().toISOString();
      const keys = new Set(slots.map((s) => `${s.date}|${s.startTime}`));
      const rest = prev.logs.filter((l) => !keys.has(`${l.date}|${l.startTime}`));
      const newLogs: IntervalLog[] = slots.map((slot) => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        activityIds: [sleep!.id],
        recordedAt,
      }));
      return { ...prev, categories, activities, logs: [...rest, ...newLogs] };
    });
  }, [persist]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    persist((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, [persist]);

  const setDefaultInterval = useCallback((minutes: IntervalMinutes) => {
    persist((prev) => applyIntervalChange(prev, minutes));
  }, [persist]);

  const seedExampleData = useCallback(() => {
    persist((prev) => {
      const seed = createExampleSeed();
      return {
        ...prev,
        categories: seed.categories,
        activities: seed.activities,
        settings: { ...prev.settings, seeded: true },
      };
    });
  }, [persist]);

  const addCategory = useCallback(
    (partial: Pick<Category, 'name' | 'icon' | 'color'>) => {
      persist((prev) => {
        const maxOrder = prev.categories.reduce((m, c) => Math.max(m, c.sortOrder), -1);
        const cat: Category = {
          id: crypto.randomUUID(),
          name: partial.name,
          icon: partial.icon || '📁',
          color: partial.color || '#8A867C',
          sortOrder: maxOrder + 1,
        };
        return { ...prev, categories: [...prev.categories, cat] };
      });
    },
    [persist],
  );

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    persist((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, [persist]);

  const deleteCategory = useCallback((id: string) => {
    persist((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      activities: prev.activities.filter((a) => a.categoryId !== id),
      logs: prev.logs.map((l) => ({
        ...l,
        activityIds: l.activityIds.filter((aid) => {
          const act = prev.activities.find((a) => a.id === aid);
          return act?.categoryId !== id;
        }),
      })),
    }));
  }, [persist]);

  const reorderCategory = useCallback((id: string, direction: 'up' | 'down') => {
    persist((prev) => {
      const sorted = sortCategories(prev.categories);
      const idx = sorted.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= sorted.length) return prev;
      const a = sorted[idx];
      const b = sorted[swap];
      const categories = prev.categories.map((c) => {
        if (c.id === a.id) return { ...c, sortOrder: b.sortOrder };
        if (c.id === b.id) return { ...c, sortOrder: a.sortOrder };
        return c;
      });
      return { ...prev, categories };
    });
  }, [persist]);

  const addActivity = useCallback(
    (categoryId: string, name: string, points = 50) => {
      persist((prev) => {
        const inCat = prev.activities.filter((a) => a.categoryId === categoryId);
        const maxOrder = inCat.reduce((m, a) => Math.max(m, a.sortOrder), -1);
        const activity: Activity = {
          id: crypto.randomUUID(),
          categoryId,
          name,
          points,
          sortOrder: maxOrder + 1,
        };
        return { ...prev, activities: [...prev.activities, activity] };
      });
    },
    [persist],
  );

  const updateActivity = useCallback((id: string, patch: Partial<Activity>) => {
    persist((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, [persist]);

  const deleteActivity = useCallback((id: string) => {
    persist((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
      logs: prev.logs.map((l) => ({
        ...l,
        activityIds: l.activityIds.filter((aid) => aid !== id),
      })),
    }));
  }, [persist]);

  const reorderActivity = useCallback(
    (categoryId: string, id: string, direction: 'up' | 'down') => {
      persist((prev) => {
        const inCat = sortActivities(prev.activities.filter((a) => a.categoryId === categoryId));
        const idx = inCat.findIndex((a) => a.id === id);
        if (idx < 0) return prev;
        const swap = direction === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= inCat.length) return prev;
        const a = inCat[idx];
        const b = inCat[swap];
        const activities = prev.activities.map((act) => {
          if (act.id === a.id) return { ...act, sortOrder: b.sortOrder };
          if (act.id === b.id) return { ...act, sortOrder: a.sortOrder };
          return act;
        });
        return { ...prev, activities };
      });
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      data,
      saveIntervalLog,
      saveIntervalLogsBatch,
      saveSleepForSlots,
      updateSettings,
      setDefaultInterval,
      seedExampleData,
      addCategory,
      updateCategory,
      deleteCategory,
      reorderCategory,
      addActivity,
      updateActivity,
      deleteActivity,
      reorderActivity,
    }),
    [
      data,
      saveIntervalLog,
      saveIntervalLogsBatch,
      saveSleepForSlots,
      updateSettings,
      setDefaultInterval,
      seedExampleData,
      addCategory,
      updateCategory,
      deleteCategory,
      reorderCategory,
      addActivity,
      updateActivity,
      deleteActivity,
      reorderActivity,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function useSortedCatalog(data: AppData) {
  return useMemo(
    () => ({
      categories: sortCategories(data.categories),
      activities: sortActivities(data.activities),
    }),
    [data.categories, data.activities],
  );
}
