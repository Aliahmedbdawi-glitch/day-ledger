import { useState, type CSSProperties } from 'react';
import { useStore, useSortedCatalog } from '../data/store';
import { formatDurationMinutes, todayKey } from '../domain/dates';
import { ALL_WEEKDAYS, computeTargetProgress } from '../domain/targets';
import type { DailyTarget, TargetKind } from '../domain/types';
import { Icon } from './Icon';

const WEEKDAY_LABELS: Record<number, string> = { 0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S' };
const WEEKDAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

function WeekdayChips({
  value,
  onChange,
  small = false,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  small?: boolean;
}) {
  return (
    <div className={`weekday-chips${small ? ' is-small' : ''}`} role="group" aria-label="Days">
      {ALL_WEEKDAYS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={WEEKDAY_NAMES[d]}
            title={WEEKDAY_NAMES[d]}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
          >
            {WEEKDAY_LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}

function hoursToMinutes(value: string): number {
  const h = Number(value);
  return Number.isFinite(h) ? Math.max(0, Math.round(h * 60)) : 0;
}

function describeDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  const sorted = ALL_WEEKDAYS.filter((d) => days.includes(d));
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '6,0') return 'Weekends';
  return sorted.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(', ');
}

export function TargetsPage() {
  const { data, addTarget, updateTarget, deleteTarget } = useStore();
  const { categories, activities } = useSortedCatalog(data);
  const today = todayKey();
  const progress = computeTargetProgress(data, today);
  const progressById = new Map(progress.map((p) => [p.target.id, p]));
  const activityById = new Map(activities.map((a) => [a.id, a]));
  const colorByCategory = new Map(categories.map((c) => [c.id, c.color]));

  const [activityId, setActivityId] = useState('');
  const [kind, setKind] = useState<TargetKind>('atLeast');
  const [hours, setHours] = useState('1');
  const [weekdays, setWeekdays] = useState<number[]>(ALL_WEEKDAYS);

  const pickActivity = (id: string) => {
    setActivityId(id);
    // Negative activities are usually something to cap, not to reach.
    const act = activityById.get(id);
    if (act) setKind(act.points < 0 ? 'atMost' : 'atLeast');
  };

  const canAdd = activityId !== '' && hoursToMinutes(hours) > 0 && weekdays.length > 0;
  const submit = () => {
    if (!canAdd) return;
    addTarget({ activityId, kind, minutes: hoursToMinutes(hours), weekdays });
    setActivityId('');
  };

  const targets = data.targets.filter((t) => activityById.has(t.activityId));
  const metCount = progress.filter((p) => p.met).length;
  const plannedMinutes = progress
    .filter((p) => p.target.kind === 'atLeast')
    .reduce((sum, p) => sum + p.target.minutes, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Daily</div>
          <h1 className="page-title">Targets</h1>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 0, maxWidth: '62ch' }}>
        Set how much time an activity should get each day. Unmet targets show up first as
        recommendations when you log an interval. Use a limit to cap time-wasters.
      </p>

      {progress.length > 0 && (
        <div className="card target-summary" style={{ marginBottom: '1rem' }}>
          <span>
            <strong className={metCount === progress.length ? 'pts-pos' : ''}>
              {metCount}/{progress.length}
            </strong>{' '}
            <span className="muted">targets met today</span>
          </span>
          <span>
            <strong>{formatDurationMinutes(plannedMinutes)}</strong>{' '}
            <span className="muted">of focused time planned</span>
          </span>
        </div>
      )}

      <div className="card settings-group">
        <h3>New target</h3>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <label>
            Activity
            <select id="target-activity" value={activityId} onChange={(e) => pickActivity(e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((cat) => (
                <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                  {activities
                    .filter((a) => a.categoryId === cat.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="segmented" role="group" aria-label="Target type">
            <button type="button" aria-pressed={kind === 'atLeast'} onClick={() => setKind('atLeast')}>
              At least
            </button>
            <button type="button" aria-pressed={kind === 'atMost'} onClick={() => setKind('atMost')}>
              At most
            </button>
          </div>
          <label>
            Hours per day
            <input
              id="target-hours"
              type="number"
              min={0.25}
              max={16}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={{ width: '5.5rem' }}
            />
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <WeekdayChips value={weekdays} onChange={setWeekdays} />
          <button type="button" className="btn btn-primary" disabled={!canAdd} onClick={submit}>
            Add target
          </button>
        </div>
      </div>

      {targets.length === 0 ? (
        <p className="empty-hint">
          No targets yet. Try “at least 2h Medicine” or “at most 30m Social Media”.
        </p>
      ) : (
        <div className="card">
          <ul className="target-list">
            {targets.map((t: DailyTarget) => {
              const act = activityById.get(t.activityId)!;
              const p = progressById.get(t.id);
              const pct = p ? Math.min(100, Math.round((p.doneMinutes / Math.max(1, t.minutes)) * 100)) : 0;
              const meterClass = p ? (p.exceeded ? ' is-over' : p.met && t.kind === 'atLeast' ? ' is-met' : '') : '';
              return (
                <li
                  key={t.id}
                  className="target-row"
                  style={{ '--pill-color': colorByCategory.get(act.categoryId) } as CSSProperties}
                >
                  <div>
                    <div className="target-title">
                      {act.name}
                      <span className={`target-kind${t.kind === 'atMost' ? ' is-max' : ''}`}>
                        {t.kind === 'atLeast' ? 'At least' : 'At most'} {formatDurationMinutes(t.minutes)}
                      </span>
                    </div>
                    <div className="muted" style={{ marginTop: '0.15rem' }}>{describeDays(t.weekdays)}</div>
                  </div>
                  <div className="target-controls">
                    <input
                      type="number"
                      min={0.25}
                      max={16}
                      step={0.25}
                      aria-label={`${act.name} hours per day`}
                      value={t.minutes / 60}
                      onChange={(e) => {
                        const m = hoursToMinutes(e.target.value);
                        if (m > 0) updateTarget(t.id, { minutes: m });
                      }}
                    />
                    <span className="muted">h</span>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      aria-label={`Delete ${act.name} target`}
                      onClick={() => deleteTarget(t.id)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  {p ? (
                    <div className={`target-meter${meterClass}`}>
                      <div className="progress-bar" aria-hidden="true">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <span className="mono muted">
                        {formatDurationMinutes(p.doneMinutes)} / {formatDurationMinutes(t.minutes)}
                      </span>
                    </div>
                  ) : (
                    <div className="target-meter">
                      <span className="muted">Not scheduled today</span>
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <WeekdayChips
                      small
                      value={t.weekdays}
                      onChange={(days) => days.length > 0 && updateTarget(t.id, { weekdays: days })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
