import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Activity, Category, TimeSlot } from '../domain/types';
import { Icon } from './Icon';

export interface SlotTaskItem {
  id: string;
  activityId: string;
  name: string;
  color?: string;
  done: boolean;
  canToggle: boolean;
}

export function SlotTasks({
  tasks,
  onToggle,
  onRemove,
  onAdd,
}: {
  tasks: SlotTaskItem[];
  onToggle: (activityId: string) => void;
  onRemove: (habitId: string, name: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className={`slot-tasks${tasks.length === 0 ? ' is-empty' : ''}`}>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`task-box${task.done ? ' is-done' : ''}`}
          style={{ '--task-color': task.color ?? 'var(--accent)' } as CSSProperties}
        >
          <button
            type="button"
            className="task-toggle"
            aria-pressed={task.done}
            disabled={!task.canToggle}
            onClick={() => onToggle(task.activityId)}
          >
            <span className="task-check" aria-hidden="true">
              {task.done && <Icon name="check" size={14} />}
            </span>
            <span className="task-name">{task.name}</span>
          </button>
          <button
            type="button"
            className="task-remove"
            aria-label={`Remove daily task ${task.name}`}
            onClick={() => onRemove(task.id, task.name)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="task-add" aria-label="Add daily task" onClick={onAdd}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

export function TaskPicker({
  slot,
  categories,
  activities,
  pinnedActivityIds,
  onClose,
  onPick,
}: {
  slot: TimeSlot;
  categories: Category[];
  activities: Activity[];
  pinnedActivityIds: string[];
  onClose: () => void;
  onPick: (activityId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const pinned = new Set(pinnedActivityIds);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const groups = categories
    .map((cat) => ({
      cat,
      acts: activities.filter((a) => {
        if (a.categoryId !== cat.id || pinned.has(a.id)) return false;
        return q === '' || a.name.toLowerCase().includes(q);
      }),
    }))
    .filter((g) => g.acts.length > 0);

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="record-sheet" role="dialog" aria-labelledby="task-picker-title">
        <div className="sheet-header">
          <div>
            <h3 id="task-picker-title">Daily task</h3>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              Shows every day at <span className="mono">{slot.startTime}</span>. The full name stays in the box.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <label className="task-search">
          <span className="muted">Find an activity</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            autoFocus
          />
        </label>

        {groups.length === 0 ? (
          <p className="empty-hint">
            {activities.length === 0
              ? 'Add activities first, then pin one here.'
              : 'Nothing left to pin at this time.'}
          </p>
        ) : (
          groups.map(({ cat, acts }) => (
            <div key={cat.id} className="category-group">
              <h4>
                {cat.icon} {cat.name}
              </h4>
              <div className="task-pick-list">
                {acts.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    className="task-pick"
                    onClick={() => onPick(act.id)}
                  >
                    <span className="task-pick-swatch" style={{ background: cat.color }} />
                    <span className="task-pick-name">{act.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
