import { useEffect, useState } from 'react';
import type { Activity, Category, TimeSlot } from '../domain/types';
import { findLog, getPreviousSlot } from '../domain/grid';
import type { IntervalLog } from '../domain/types';

interface Props {
  slot: TimeSlot;
  categories: Category[];
  activities: Activity[];
  logs: IntervalLog[];
  allSlots: TimeSlot[];
  onClose: () => void;
  onSave: (activityIds: string[]) => void;
}

export function RecordSheet({
  slot,
  categories,
  activities,
  logs,
  allSlots,
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

  const byCategory = categories.map((cat) => ({
    cat,
    acts: activities.filter((a) => a.categoryId === cat.id),
  }));

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
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>What did you do?</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {byCategory.map(({ cat, acts }) =>
          acts.length === 0 ? null : (
            <div key={cat.id} className="category-group">
              <h4>{cat.icon} {cat.name}</h4>
              {acts.map((act) => (
                <label key={act.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={selected.includes(act.id)}
                    onChange={() => toggle(act.id)}
                  />
                  <span>{act.name}</span>
                </label>
              ))}
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
            Save
          </button>
        </div>
      </div>
    </>
  );
}
