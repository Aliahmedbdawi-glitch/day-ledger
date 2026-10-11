import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useStore, useSortedCatalog } from '../data/store';
import { addDays, formatDisplayDate, todayKey } from '../domain/dates';
import {
  findLog,
  generateDaySlots,
  getCurrentSlot,
  getIntervalForDate,
  getUnrecordedSlots,
} from '../domain/grid';
import { computeDayStats } from '../domain/scoring';
import type { TimeSlot } from '../domain/types';
import { useIntervalNotifications } from '../hooks/useIntervalNotifications';
import { RecordSheet } from './RecordSheet';

export function TodayPage() {
  const { data, saveIntervalLog } = useStore();
  const { categories, activities } = useSortedCatalog(data);
  const [viewDate, setViewDate] = useState(todayKey());
  const [activeSlot, setActiveSlot] = useState<TimeSlot | null>(null);
  const [catchUpDismissed, setCatchUpDismissed] = useState(false);
  const nowRef = useRef(new Date());
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      nowRef.current = new Date();
      tick((n) => n + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const interval = getIntervalForDate(data, viewDate);
  const slots = useMemo(
    () => generateDaySlots(viewDate, interval),
    [viewDate, interval],
  );
  const now = nowRef.current;
  const isToday = viewDate === todayKey();
  const currentSlot = isToday ? getCurrentSlot(slots, now) : undefined;
  const dayStats = computeDayStats(data, viewDate);

  const unrecorded = isToday ? getUnrecordedSlots(slots, data.logs, now) : [];

  const refreshCatchUp = useCallback(() => setCatchUpDismissed(false), []);
  useIntervalNotifications(data, refreshCatchUp);

  const currentRowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isToday && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [isToday, viewDate]);

  const activityById = useMemo(
    () => new Map(activities.map((a) => [a.id, a])),
    [activities],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const renderSlotLabel = (slot: TimeSlot) => {
    const log = findLog(data.logs, slot);
    if (!log) return <span className="muted">Not recorded</span>;
    if (log.activityIds.length === 0) {
      return <span className="muted">Recorded (no activities)</span>;
    }
    return log.activityIds.map((id) => {
      const act = activityById.get(id);
      const cat = act ? categoryById.get(act.categoryId) : undefined;
      return (
        <span
          key={id}
          className="activity-pill"
          style={{ '--pill-color': cat?.color } as CSSProperties}
        >
          {cat?.icon} {act?.name}
        </span>
      );
    });
  };

  const openCatchUp = () => {
    if (unrecorded.length > 0) setActiveSlot(unrecorded[0]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Timeline</h1>
        <div className="date-nav">
          <button
            type="button"
            className="btn"
            onClick={() => setViewDate((d) => addDays(d, -1))}
            aria-label="Previous day"
          >
            ←
          </button>
          <h2>{formatDisplayDate(viewDate)}</h2>
          <button
            type="button"
            className="btn"
            onClick={() => setViewDate((d) => addDays(d, 1))}
            aria-label="Next day"
          >
            →
          </button>
          {viewDate !== todayKey() && (
            <button type="button" className="btn btn-ghost" onClick={() => setViewDate(todayKey())}>
              Jump to today
            </button>
          )}
        </div>
      </div>

      {isToday && unrecorded.length > 0 && !catchUpDismissed && (
        <div className="catch-up">
          <strong>You have {unrecorded.length} unrecorded interval{unrecorded.length > 1 ? 's' : ''}.</strong>
          <ul>
            {unrecorded.slice(0, 5).map((s) => (
              <li key={s.startTime} className="mono">
                {s.startTime} – {s.endTime}
              </li>
            ))}
            {unrecorded.length > 5 && <li className="muted">…and {unrecorded.length - 5} more</li>}
          </ul>
          <button type="button" className="btn btn-primary" onClick={openCatchUp}>
            Record now
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginLeft: '0.5rem' }}
            onClick={() => setCatchUpDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="today-layout">
        <div className="day-strip" role="list" aria-label="Day timeline">
          {slots.map((slot) => {
            const isCurrent = currentSlot?.startTime === slot.startTime;
            const recorded = findLog(data.logs, slot) !== undefined;
            const rowClass = [
              'strip-row',
              isCurrent ? 'is-current' : '',
              !recorded ? 'is-unrecorded' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={slot.startTime}
                className={rowClass}
                ref={isCurrent ? currentRowRef : undefined}
                role="listitem"
              >
                <button type="button" onClick={() => setActiveSlot(slot)}>
                  <span className="strip-time mono">{slot.startTime}</span>
                  <span className="strip-body">{renderSlotLabel(slot)}</span>
                </button>
              </div>
            );
          })}
        </div>

        <aside className="summary-panel card">
          <div className="score-block">
            <div className="score-value">
              {dayStats.score !== null ? dayStats.score : '—'}
              <span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}> / 100</span>
            </div>
            <div className="score-label">Productivity score</div>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${dayStats.score ?? 0}%` }} />
            </div>
            <p className="muted" style={{ marginTop: '1rem' }}>
              Tracked: <strong>{dayStats.trackedPercent}%</strong>
            </p>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {dayStats.loggedCount} of {dayStats.totalSlots} intervals
            </p>
          </div>
        </aside>
      </div>

      {isToday && currentSlot && (
        <button
          type="button"
          className="btn btn-primary mobile-log-fab"
          onClick={() => setActiveSlot(currentSlot)}
        >
          Log current interval
        </button>
      )}

      {activeSlot && (
        <RecordSheet
          slot={activeSlot}
          categories={categories}
          activities={activities}
          logs={data.logs}
          allSlots={slots}
          onClose={() => setActiveSlot(null)}
          onSave={(ids) => saveIntervalLog(activeSlot, ids)}
        />
      )}
    </div>
  );
}
