import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useStore, useSortedCatalog } from '../data/store';
import { addDays, formatDisplayDate, formatDurationMinutes, todayKey } from '../domain/dates';
import {
  findLog,
  generateDaySlots,
  getCurrentSlot,
  getIntervalForDate,
  getUnrecordedSlots,
} from '../domain/grid';
import { computeDayStats, formatPoints } from '../domain/scoring';
import { computeTargetProgress } from '../domain/targets';
import { isSlotInSleepWindow, minutesToTime, sleepWindow } from '../domain/sleep';
import type { TimeSlot } from '../domain/types';
import { RecordSheet } from './RecordSheet';
import { SleepQuickAddSheet } from './SleepQuickAddSheet';
import { DayPulse } from './DayPulse';
import { Icon } from './Icon';
import { BACK_EVENT } from './backEvent';

function pointsClass(value: number): string {
  if (Math.round(value) > 0) return 'pts-pos';
  if (Math.round(value) < 0) return 'pts-neg';
  return 'muted';
}

/** A slot to open on mount, e.g. from clicking a desktop notification. */
export interface OpenSlotRequest {
  date: string;
  startTime: string;
}

export function TodayPage({ openSlot }: { openSlot?: OpenSlotRequest }) {
  const { data, saveIntervalLog, saveSleepForSlots, updateSettings } = useStore();
  const { categories, activities } = useSortedCatalog(data);
  const { settings } = data;
  const [viewDate, setViewDate] = useState(() => openSlot?.date ?? todayKey());
  const [activeSlot, setActiveSlot] = useState<TimeSlot | null>(() => {
    if (!openSlot) return null;
    const daySlots = generateDaySlots(openSlot.date, getIntervalForDate(data, openSlot.date));
    return daySlots.find((s) => s.startTime === openSlot.startTime) ?? null;
  });
  const [dismissedForSlot, setDismissedForSlot] = useState<string | null>(null);
  const [sleepOpen, setSleepOpen] = useState(false);
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
  const dayStats = computeDayStats(data, viewDate, now);
  const targetProgress = computeTargetProgress(data, viewDate, now);
  const targetsMet = targetProgress.filter((p) => p.met).length;
  const sleepWin = sleepWindow(settings);

  // Sleep-window slots are filled automatically at wake-up, so don't nag about them.
  const unrecorded = isToday
    ? getUnrecordedSlots(slots, data.logs, now).filter(
        (s) => !(settings.autoRegisterSleep && isSlotInSleepWindow(s, sleepWin)),
      )
    : [];

  // Dismissal lasts for the current interval only; the next one brings the banner back.
  const catchUpDismissed = dismissedForSlot !== null && dismissedForSlot === currentSlot?.startTime;

  // Android back button closes an open panel before leaving the page.
  useEffect(() => {
    const onBack = (e: Event) => {
      if (activeSlot || sleepOpen) {
        e.preventDefault();
        setActiveSlot(null);
        setSleepOpen(false);
      }
    };
    window.addEventListener(BACK_EVENT, onBack);
    return () => window.removeEventListener(BACK_EVENT, onBack);
  }, [activeSlot, sleepOpen]);

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
    return (
      <>
        {log.activityIds.map((id) => {
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
        })}
        {log.source === 'auto' && <span className="auto-badge">auto</span>}
      </>
    );
  };

  const openCatchUp = () => {
    if (unrecorded.length > 0) setActiveSlot(unrecorded[0]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Timeline</div>
          <h1 className="page-title">{formatDisplayDate(viewDate)}</h1>
        </div>
        <div className="date-nav">
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => setViewDate((d) => addDays(d, -1))}
            aria-label="Previous day"
          >
            <Icon name="left" />
          </button>
          <button
            type="button"
            className="btn"
            disabled={viewDate === todayKey()}
            onClick={() => setViewDate(todayKey())}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => setViewDate((d) => addDays(d, 1))}
            aria-label="Next day"
          >
            <Icon name="right" />
          </button>
          <button type="button" className="btn" onClick={() => setSleepOpen(true)}>
            <Icon name="bed" size={16} />
            Add sleep
          </button>
          {isToday && currentSlot && (
            <button type="button" className="btn btn-primary hide-mobile" onClick={() => setActiveSlot(currentSlot)}>
              Log {currentSlot.startTime}
            </button>
          )}
        </div>
      </div>

      <DayPulse
        stats={dayStats}
        slots={slots}
        intervalMinutes={interval}
        sleepWin={sleepWin}
        currentStart={currentSlot?.startTime}
        goal={settings.dailyPointsGoal}
      />

      {isToday && unrecorded.length > 0 && !catchUpDismissed && (
        <div className="catch-up" role="status">
          <div className="catch-up-text">
            <strong>
              {unrecorded.length} unrecorded interval{unrecorded.length > 1 ? 's' : ''}
            </strong>
            <span className="muted">
              Earliest <span className="mono">{unrecorded[0].startTime}–{unrecorded[0].endTime}</span>
              {settings.unrecordedPenaltyPerHour > 0 &&
                ` · costing ${formatPoints(-(unrecorded.length * interval * settings.unrecordedPenaltyPerHour) / 60)} pts`}
            </span>
          </div>
          <div className="catch-up-actions">
            <button type="button" className="btn btn-primary" onClick={openCatchUp}>
              Record now
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDismissedForSlot(currentSlot?.startTime ?? null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="today-layout">
        <div className="day-strip" role="list" aria-label="Day timeline">
          {slots.map((slot) => {
            const isCurrent = currentSlot?.startTime === slot.startTime;
            const recorded = findLog(data.logs, slot) !== undefined;
            const inSleep = isSlotInSleepWindow(slot, sleepWin);
            const pts = dayStats.slotPoints[slot.startTime];
            const rowClass = [
              'strip-row',
              isCurrent ? 'is-current' : '',
              !recorded ? 'is-unrecorded' : '',
              inSleep ? 'is-sleep-window' : '',
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
                  <span className="strip-time mono">
                    {slot.startTime}
                  </span>
                  <span className="strip-body">
                    {renderSlotLabel(slot)}
                    {pts !== undefined && Math.round(pts) !== 0 && (
                      <span className={`slot-points mono ${pointsClass(pts)}`}>{formatPoints(pts)}</span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <aside className="summary-panel card">
          <div>
            <div className="eyebrow">Day ledger</div>
            <ul className="ledger-list">
              <li>
                <span>Gained</span>
                <span className="mono pts-pos">{formatPoints(dayStats.gainedPoints)}</span>
              </li>
              <li>
                <span>Lost</span>
                <span className="mono pts-neg">{formatPoints(dayStats.lostPoints)}</span>
              </li>
              <li>
                <span>
                  Sleep {formatDurationMinutes(Math.round(dayStats.sleepMinutes))}
                  <span className="muted"> / {settings.sleepLimitHours}h limit</span>
                </span>
                {dayStats.oversleepMinutes > 0 ? (
                  <span className="mono pts-neg">{formatPoints(dayStats.oversleepPenalty)}</span>
                ) : (
                  <span className="muted">ok</span>
                )}
              </li>
              <li>
                <span>Unrecorded {formatDurationMinutes(dayStats.unrecordedMinutes)}</span>
                <span className={`mono ${pointsClass(dayStats.unrecordedPenalty)}`}>
                  {formatPoints(dayStats.unrecordedPenalty)}
                </span>
              </li>
              {targetProgress.length > 0 && (
                <li>
                  <span>Targets met</span>
                  <span className={`mono ${targetsMet === targetProgress.length ? 'pts-pos' : ''}`}>
                    {targetsMet}/{targetProgress.length}
                  </span>
                </li>
              )}
            </ul>

            <div style={{ marginTop: '1rem' }}>
              <div className="muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tracked of elapsed time</span>
                <strong className="mono" style={{ color: 'var(--ink)' }}>{dayStats.trackedPercent}%</strong>
              </div>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${dayStats.trackedPercent}%` }} />
              </div>
            </div>
            <p className="muted" style={{ margin: '1rem 0 0' }}>
              Sleep window{' '}
              <span className="mono" style={{ color: 'var(--night)' }}>
                {minutesToTime(sleepWin.bedMin)}–{minutesToTime(sleepWin.wakeMin)}
              </span>
              {settings.autoRegisterSleep ? ' · auto-registered' : ''}
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
          Log now
        </button>
      )}

      {sleepOpen && (
        <SleepQuickAddSheet
          dateLabel={formatDisplayDate(viewDate)}
          slots={slots}
          activities={activities}
          intervalMinutes={interval}
          sleepDefaults={{
            durationHours: settings.defaultSleepDurationHours,
            endTime: settings.defaultSleepEndTime,
          }}
          onClose={() => setSleepOpen(false)}
          onSave={(picked) => saveSleepForSlots(picked)}
          onSaveSleepDefaults={(d) =>
            updateSettings({
              defaultSleepDurationHours: d.durationHours,
              defaultSleepEndTime: d.endTime,
            })
          }
        />
      )}

      {activeSlot && (
        <RecordSheet
          slot={activeSlot}
          categories={categories}
          activities={activities}
          logs={data.logs}
          allSlots={slots}
          targetProgress={targetProgress}
          onClose={() => setActiveSlot(null)}
          onSave={(ids) => saveIntervalLog(activeSlot, ids)}
        />
      )}
    </div>
  );
}
