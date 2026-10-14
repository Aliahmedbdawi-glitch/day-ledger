import { useEffect, useState, type CSSProperties } from 'react';
import type { Activity, Category, TimeSlot } from '../domain/types';
import { formatDurationMinutes } from '../domain/dates';
import { findLog, getPreviousSlot } from '../domain/grid';
import { formatPoints } from '../domain/scoring';
import { recommendedProgress, type TargetProgress } from '../domain/targets';
import type { IntervalLog } from '../domain/types';
import { Icon } from './Icon';

interface Props {
  slot: TimeSlot;
  categories: Category[];
  activities: Activity[];
  logs: IntervalLog[];
  allSlots: TimeSlot[];
  targetProgress: TargetProgress[];
  onClose: () => void;
  onSave: (activityIds: string[]) => void;
}

function targetHint(p: TargetProgress | undefined): { text: string; tone: string } | null {
  if (!p) return null;
  if (p.target.kind === 'atLeast') {
    return p.met
      ? { text: 'Target met', tone: 'pts-pos' }
      : { text: `${formatDurationMinutes(p.remainingMinutes)} left`, tone: 'tile-hint-accent' };
  }
  return p.exceeded
    ? { text: `Over ${formatDurationMinutes(p.target.minutes)} limit`, tone: 'pts-neg' }
    : { text: `${formatDurationMinutes(p.remainingMinutes)} allowed`, tone: 'muted' };
}

export function RecordSheet({
  slot,
  categories,
  activities,
  logs,
  allSlots,
  targetProgress,
  onClose,
  onSave,
}: Props) {
  const existing = findLog(logs, slot);
  const [selected, setSelected] = useState<string[]>(existing?.activityIds ?? []);

  useEffect(() => {
    setSelected(existing?.activityIds ?? []);
  }, [slot.startTime, slot.date, existing?.activityIds]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const sameAsPrevious = () => {
    const prev = getPreviousSlot(allSlots, slot);
    if (!prev) return;
    const prevLog = findLog(logs, prev);
    if (prevLog) setSelected([...prevLog.activityIds]);
  };

  const progressByActivity = new Map(targetProgress.map((p) => [p.activity.id, p]));
  const recommended = recommendedProgress(targetProgress);
  const colorByCategory = new Map(categories.map((c) => [c.id, c.color]));

  const byCategory = categories.map((cat) => ({
    cat,
    acts: activities.filter((a) => a.categoryId === cat.id),
  }));

  const renderTile = (act: Activity, keyPrefix = '') => {
    const on = selected.includes(act.id);
    const hint = targetHint(progressByActivity.get(act.id));
    return (
      <button
        key={keyPrefix + act.id}
        type="button"
        className={`act-tile${on ? ' is-on' : ''}`}
        aria-pressed={on}
        onClick={() => toggle(act.id)}
        style={{ '--pill-color': colorByCategory.get(act.categoryId) } as CSSProperties}
      >
        <span className="act-tile-top">
          <span className="act-tile-name">{act.name}</span>
          {on ? (
            <span className="act-tile-check"><Icon name="check" size={14} /></span>
          ) : (
            <span className={`mono act-points ${act.points > 0 ? 'pts-pos' : act.points < 0 ? 'pts-neg' : 'muted'}`}>
              {formatPoints(act.points)}
            </span>
          )}
        </span>
        {hint && <span className={`act-tile-hint ${hint.tone}`}>{hint.text}</span>}
      </button>
    );
  };

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="record-sheet" role="dialog" aria-labelledby="sheet-title">
        <div className="sheet-header">
          <div>
            <h3 id="sheet-title">
              <span className="mono">{slot.startTime}</span>
              {' – '}
              <span className="mono">{slot.endTime}</span>
            </h3>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              What did you do? Points are per hour.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        {recommended.length > 0 && (
          <div className="category-group recommended-group">
            <h4>
              <Icon name="target" size={13} /> Recommended for your targets
            </h4>
            <div className="act-grid">
              {recommended.slice(0, 4).map((p) => renderTile(p.activity, 'rec-'))}
            </div>
          </div>
        )}

        {byCategory.map(({ cat, acts }) =>
          acts.length === 0 ? null : (
            <div key={cat.id} className="category-group">
              <h4>{cat.icon} {cat.name}</h4>
              <div className="act-grid">{acts.map((act) => renderTile(act))}</div>
            </div>
          ),
        )}

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={sameAsPrevious}>
            Same as previous
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onSave(selected);
              onClose();
            }}
          >
            Save{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}
