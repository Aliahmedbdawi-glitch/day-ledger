import { useEffect, useMemo, useState } from 'react';
import type { Activity, TimeSlot } from '../domain/types';
import { formatDurationMinutes } from '../domain/dates';
import {
  findSleepActivity,
  selectionFromSleepDefaults,
  sleepDefaultsFromSelection,
  slotCountForHours,
  slotsBetweenInclusive,
} from '../domain/sleep';

const DURATION_HOURS = [6, 7, 8, 9];

export interface SleepDefaults {
  durationHours: number;
  endTime: string;
}

interface Props {
  dateLabel: string;
  slots: TimeSlot[];
  activities: Activity[];
  intervalMinutes: number;
  sleepDefaults: SleepDefaults;
  onClose: () => void;
  onSave: (slots: TimeSlot[]) => void;
  onSaveSleepDefaults: (defaults: SleepDefaults) => void;
}

export function SleepQuickAddSheet({
  dateLabel,
  slots,
  activities,
  intervalMinutes,
  sleepDefaults,
  onClose,
  onSave,
  onSaveSleepDefaults,
}: Props) {
  const sleepActivity = findSleepActivity(activities);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [endIndex, setEndIndex] = useState(() => Math.max(0, slots.length - 1));
  const [activeDuration, setActiveDuration] = useState(sleepDefaults.durationHours);

  const slotKey = (s: TimeSlot) => s.startTime;

  const applyDefaults = (defaults: SleepDefaults) => {
    if (slots.length === 0) return;
    const { endIndex: end, selectedStartTimes } = selectionFromSleepDefaults(
      slots,
      intervalMinutes,
      defaults.durationHours,
      defaults.endTime,
    );
    setEndIndex(end);
    setActiveDuration(defaults.durationHours);
    setSelected(selectedStartTimes);
  };

  useEffect(() => {
    applyDefaults(sleepDefaults);
  }, [slots, intervalMinutes, sleepDefaults.durationHours, sleepDefaults.endTime]);

  const applyDuration = (hours: number) => {
    const count = slotCountForHours(hours, intervalMinutes);
    const end = Math.min(endIndex, slots.length - 1);
    const start = Math.max(0, end - count + 1);
    const picked = slotsBetweenInclusive(slots, start, end);
    setActiveDuration(hours);
    setSelected(new Set(picked.map(slotKey)));
  };

  const applyRange = (fromIndex: number, toIndex: number) => {
    const picked = slotsBetweenInclusive(slots, fromIndex, toIndex);
    setSelected(new Set(picked.map(slotKey)));
    setEndIndex(Math.max(fromIndex, toIndex));
    setActiveDuration(Math.round((picked.length * intervalMinutes) / 60));
  };

  const toggle = (slot: TimeSlot) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = slotKey(slot);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedSlots = useMemo(
    () => slots.filter((s) => selected.has(slotKey(s))),
    [slots, selected],
  );

  const totalMinutes = selectedSlots.length * intervalMinutes;

  const handleSave = () => {
    if (selectedSlots.length === 0) return;
    const defaults = sleepDefaultsFromSelection(selectedSlots, intervalMinutes);
    onSaveSleepDefaults(defaults);
    onSave(selectedSlots);
    onClose();
  };

  const handleSaveAsDefaultOnly = () => {
    const defaults = sleepDefaultsFromSelection(selectedSlots, intervalMinutes);
    if (selectedSlots.length > 0) {
      onSaveSleepDefaults(defaults);
    } else {
      const endSlot = slots[endIndex];
      onSaveSleepDefaults({
        durationHours: activeDuration,
        endTime: endSlot?.endTime ?? sleepDefaults.endTime,
      });
    }
  };

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="record-sheet sleep-sheet" role="dialog" aria-labelledby="sleep-title">
        <div className="sheet-header">
          <div>
            <h3 id="sleep-title">Add sleep</h3>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>{dateLabel}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!sleepActivity && (
          <p className="muted" style={{ marginTop: 0 }}>
            No Sleep activity yet — we&apos;ll create one under Health when you save.
          </p>
        )}

        <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          Default: {sleepDefaults.durationHours}h ending at{' '}
          <span className="mono">{sleepDefaults.endTime}</span>
        </p>

        <div className="sleep-controls">
          <label className="sleep-range-label">
            End at
            <select
              value={endIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setEndIndex(idx);
                applyDuration(activeDuration);
              }}
            >
              {slots.map((s) => (
                <option key={s.startTime} value={s.index}>
                  {s.endTime}
                </option>
              ))}
            </select>
          </label>
          <div className="sleep-presets" role="group" aria-label="Sleep duration">
            {DURATION_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                className={`btn${activeDuration === h ? ' btn-primary' : ''}`}
                onClick={() => applyDuration(h)}
              >
                {h}h
              </button>
            ))}
          </div>
          <div className="sleep-presets">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => applyDefaults(sleepDefaults)}
            >
              Use saved default
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                applyRange(0, Math.min(slots.length - 1, slotCountForHours(8, intervalMinutes) - 1))
              }
            >
              Early morning block
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        </div>

        <p className="muted sleep-hint">Tap intervals to include or exclude them.</p>

        <div className="sleep-interval-list">
          {slots.map((slot) => {
            const on = selected.has(slotKey(slot));
            return (
              <button
                key={slot.startTime}
                type="button"
                className={`sleep-interval-chip${on ? ' is-on' : ''}`}
                onClick={() => toggle(slot)}
                aria-pressed={on}
              >
                <span className="mono">{slot.startTime}</span>
                <span className="muted">–</span>
                <span className="mono">{slot.endTime}</span>
              </button>
            );
          })}
        </div>

        <div className="sheet-actions">
          <p className="muted" style={{ margin: 0 }}>
            {selectedSlots.length} interval{selectedSlots.length === 1 ? '' : 's'} ·{' '}
            {formatDurationMinutes(totalMinutes)}
          </p>
          <button type="button" className="btn" onClick={handleSaveAsDefaultOnly}>
            Save as default
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selectedSlots.length === 0}
            onClick={handleSave}
          >
            Save sleep
          </button>
        </div>
      </div>
    </>
  );
}
