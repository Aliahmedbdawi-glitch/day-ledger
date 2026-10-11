import { useState } from 'react';
import type { PageId } from '../domain/types';
import { TodayPage } from './TodayPage';
import { StatsPage } from './StatsPage';
import { ActivitiesPage } from './ActivitiesPage';
import { RecordsPage } from './RecordsPage';
import { SettingsPage } from './SettingsPage';

const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: 'today', label: 'Timeline', icon: '◷' },
  { id: 'statistics', label: 'Statistics', icon: '▤' },
  { id: 'activities', label: 'Activities', icon: '☰' },
  { id: 'records', label: 'Records', icon: '★' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function PageContent({ page }: { page: PageId }) {
  switch (page) {
    case 'today':
      return <TodayPage />;
    case 'statistics':
      return <StatsPage />;
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

  return (
    <div className="app-shell">
      <nav className="side-nav" aria-label="Main">
        <p className="brand">Day Ledger</p>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav-btn"
            aria-current={page === item.id ? 'page' : undefined}
            onClick={() => setPage(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="main-column">
        <PageContent page={page} />
      </div>

      <nav className="bottom-nav" aria-label="Mobile">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav-btn"
            aria-current={page === item.id ? 'page' : undefined}
            onClick={() => setPage(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
