import { useState } from 'react';
import { useStore, useSortedCatalog } from '../data/store';
import { addDays, formatDisplayDate, formatDurationMinutes, todayKey } from '../domain/dates';
import {
  computeDayStats,
  computeWeekStats,
  sortedActivityBreakdown,
  formatPoints,
  sortedCategoryBreakdown,
} from '../domain/scoring';

type Tab = 'daily' | 'weekly';

export function StatsPage() {
  const { data } = useStore();
  const { categories } = useSortedCatalog(data);
  const [tab, setTab] = useState<Tab>('daily');
  const [anchor, setAnchor] = useState(todayKey());

  const day = computeDayStats(data, anchor);
  const week = computeWeekStats(data, anchor);
  const prevWeek = computeWeekStats(data, addDays(week.weekStart, -7));

  const catBreak =
    tab === 'daily'
      ? sortedCategoryBreakdown(data, day.timeByCategoryMinutes)
      : sortedCategoryBreakdown(data, week.timeByCategoryMinutes);

  const actBreak =
    tab === 'daily'
      ? sortedActivityBreakdown(data, day.timeByActivityMinutes)
      : sortedActivityBreakdown(data, week.timeByActivityMinutes);

  const maxCat = Math.max(...catBreak.map((x) => x.minutes), 1);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Statistics</h1>
        <div className="date-nav">
          <button type="button" className="btn" onClick={() => setAnchor((d) => addDays(d, -1))}>
            ←
          </button>
          <span>{tab === 'daily' ? formatDisplayDate(anchor) : `Week of ${formatDisplayDate(week.weekStart)}`}</span>
          <button type="button" className="btn" onClick={() => setAnchor((d) => addDays(d, 1))}>
            →
          </button>
        </div>
      </div>

      <div className="stat-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'daily'} onClick={() => setTab('daily')}>
          Daily
        </button>
        <button type="button" role="tab" aria-selected={tab === 'weekly'} onClick={() => setTab('weekly')}>
          Weekly
        </button>
      </div>

      {tab === 'daily' ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            Net: <strong>{day.netPoints === null ? '—' : formatPoints(day.netPoints)}</strong> pts
            {day.goalPercent !== null && <span className="muted"> ({day.goalPercent}% of goal)</span>}
            {' · '}Tracked: <strong>{day.trackedPercent}%</strong>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Gained <span className="pts-pos">{formatPoints(day.gainedPoints)}</span> · Lost{' '}
            <span className="pts-neg">{formatPoints(day.lostPoints)}</span> · Unrecorded:{' '}
            {formatDurationMinutes(day.unrecordedMinutes)}
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            Average net: <strong>{week.averageNetPoints === null ? '—' : formatPoints(week.averageNetPoints)}</strong>
            {' '}/ day · Week total: <strong>{formatPoints(week.totalNetPoints)}</strong> · Tracked:{' '}
            <strong>{week.averageTrackedPercent}%</strong>
          </p>
          <p className="muted" style={{ margin: '0 0 0.5rem' }}>
            Unrecorded: {formatDurationMinutes(week.unrecordedMinutes)}
          </p>
          {week.bestDay && (
            <p className="muted" style={{ margin: 0 }}>
              Best day: {formatDisplayDate(week.bestDay)} · Weakest:{' '}
              {week.weakestDay ? formatDisplayDate(week.weakestDay) : '—'}
            </p>
          )}
          {prevWeek.averageNetPoints !== null && week.averageNetPoints !== null && (
            <p style={{ marginTop: '0.75rem' }}>
              vs previous week:{' '}
              <strong>{formatPoints(week.averageNetPoints - prevWeek.averageNetPoints)}</strong>{' '}
              points / day
            </p>
          )}
        </div>
      )}

      <h2 style={{ fontSize: '1.125rem' }}>
        {tab === 'weekly' ? 'This week — where did my time go?' : 'Today — where did my time go?'}
      </h2>

      {catBreak.length === 0 && actBreak.length === 0 ? (
        <p className="empty-hint">Log intervals to see time distribution.</p>
      ) : (
        <>
          {catBreak.map(({ category, minutes }) => (
            <div key={category.id} className="bar-chart-row">
              <span>{category.icon} {category.name}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(minutes / maxCat) * 100}%`,
                    background: category.color,
                  }}
                />
              </div>
              <span className="mono muted">{formatDurationMinutes(Math.round(minutes))}</span>
            </div>
          ))}
          {day.unrecordedMinutes > 0 && tab === 'daily' && (
            <div className="bar-chart-row">
              <span>Unrecorded</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: '40%', background: 'var(--rule)' }} />
              </div>
              <span className="mono muted">{formatDurationMinutes(day.unrecordedMinutes)}</span>
            </div>
          )}
        </>
      )}

      {actBreak.length > 0 && (
        <>
          <h3 style={{ marginTop: '1.5rem' }}>By activity</h3>
          {actBreak.slice(0, 12).map(({ activity, minutes }) => {
            const cat = categories.find((c) => c.id === activity.categoryId);
            return (
              <div key={activity.id} className="bar-chart-row">
                <span>{activity.name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(minutes / maxCat) * 100}%`, background: cat?.color }}
                  />
                </div>
                <span className="mono muted">{formatDurationMinutes(Math.round(minutes))}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
