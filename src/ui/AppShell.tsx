import { useEffect, useRef, useState } from 'react';
import type { PageId } from '../domain/types';
import { useStore } from '../data/store';
import { useIntervalNotifications } from '../hooks/useIntervalNotifications';
import { desktop } from '../platform/desktop';
import { onBackButton, onReminderTap } from '../platform/android';
import { useAndroidReminders } from '../hooks/useAndroidReminders';
import { BACK_EVENT } from './backEvent';
import { Icon, type IconName } from './Icon';
import { TodayPage, type OpenSlotRequest } from './TodayPage';
import { StatsPage } from './StatsPage';
import { TargetsPage } from './TargetsPage';
import { ActivitiesPage } from './ActivitiesPage';
import { RecordsPage } from './RecordsPage';
import { SettingsPage } from './SettingsPage';

const NAV: { id: PageId; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Timeline', icon: 'timeline' },
  { id: 'statistics', label: 'Statistics', icon: 'stats' },
  { id: 'targets', label: 'Targets', icon: 'target' },
  { id: 'activities', label: 'Activities', icon: 'activities' },
  { id: 'records', label: 'Records', icon: 'records' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'day-ledger-theme';
const THEMES: { id: Theme; icon: IconName; label: string }[] = [
  { id: 'light', icon: 'sun', label: 'Light theme' },
  { id: 'system', icon: 'system', label: 'Match system theme' },
  { id: 'dark', icon: 'moon', label: 'Dark theme' },
];

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

interface OpenRequest extends OpenSlotRequest {
  nonce: number;
}

function PageContent({ page, openRequest }: { page: PageId; openRequest: OpenRequest | null }) {
  switch (page) {
    case 'today':
      // Remount on each request so the page opens straight onto that slot.
      return <TodayPage key={openRequest?.nonce ?? 0} openSlot={openRequest ?? undefined} />;
    case 'statistics':
      return <StatsPage />;
    case 'targets':
      return <TargetsPage />;
    case 'activities':
      return <ActivitiesPage />;
    case 'records':
      return <RecordsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <TodayPage />;
  }
}

export function AppShell() {
  const [page, setPage] = useState<PageId>('today');
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [openRequest, setOpenRequest] = useState<OpenRequest | null>(null);
  const { data } = useStore();
  useIntervalNotifications(data);
  useAndroidReminders(data);

  // Clicking a desktop or Android notification jumps to the Timeline with that interval open.
  useEffect(() => {
    const open = (slot: OpenSlotRequest) => {
      setPage('today');
      setOpenRequest({ ...slot, nonce: Date.now() });
    };
    const offDesktop = desktop?.onOpenSlot(open);
    const offAndroid = onReminderTap(open);
    return () => {
      offDesktop?.();
      offAndroid();
    };
  }, []);

  // Android back: close an open panel first, then return to the Timeline, then background the app.
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(
    () =>
      onBackButton(() => {
        const handledByPage = !window.dispatchEvent(new Event(BACK_EVENT, { cancelable: true }));
        if (handledByPage) return true;
        if (pageRef.current !== 'today') {
          setPage('today');
          return true;
        }
        return false;
      }),
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage unavailable: the choice just won't persist.
    }
  }, [theme]);

  const navButtons = NAV.map((item) => (
    <button
      key={item.id}
      type="button"
      className="nav-btn"
      aria-current={page === item.id ? 'page' : undefined}
      onClick={() => setPage(item.id)}
    >
      <Icon name={item.icon} />
      {item.label}
    </button>
  ));

  return (
    <div className="app-shell">
      <nav className="side-nav" aria-label="Main">
        <p className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="timeline" size={16} />
          </span>
          Day Ledger
        </p>
        {navButtons}
        <div className="nav-footer">
          <div className="theme-switch" role="group" aria-label="Theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={theme === t.id}
                aria-label={t.label}
                title={t.label}
                onClick={() => setTheme(t.id)}
              >
                <Icon name={t.icon} size={16} />
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="main-column">
        <PageContent page={page} openRequest={openRequest} />
      </div>

      <nav className="bottom-nav" aria-label="Mobile">
        {navButtons}
      </nav>
    </div>
  );
}
