export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return formatDateKey(d);
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function formatDisplayDate(key: string): string {
  const d = parseDateKey(key);
  const today = todayKey();
  if (key === today) return 'Today';
  const yesterday = addDays(today, -1);
  if (key === yesterday) return 'Yesterday';
  const tomorrow = addDays(today, 1);
  if (key === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatDurationMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function startOfWeekMonday(key: string): string {
  const d = parseDateKey(key);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDateKey(d);
}

export function weekDateKeys(weekStartMonday: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    keys.push(addDays(weekStartMonday, i));
  }
  return keys;
}
