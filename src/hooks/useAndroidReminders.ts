import { useEffect, useRef } from 'react';
import type { AppData } from '../domain/types';
import { isAndroid, onAppResume, syncReminders } from '../platform/android';

/**
 * Keeps the OS-scheduled reminders in step with the app: after any change to
 * logs or settings (debounced), and whenever the app comes back to the foreground.
 */
export function useAndroidReminders(data: AppData): void {
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!isAndroid) return;
    const id = window.setTimeout(() => {
      syncReminders(dataRef.current).catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [data.logs, data.settings, data.dayIntervalMinutes]);

  useEffect(
    () =>
      onAppResume(() => {
        syncReminders(dataRef.current).catch(() => undefined);
      }),
    [],
  );
}
