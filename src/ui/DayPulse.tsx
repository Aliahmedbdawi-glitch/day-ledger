import type { DayStats } from '../domain/scoring';
import { formatPoints } from '../domain/scoring';
import type { SleepWindow } from '../domain/sleep';
import { isSlotInSleepWindow } from '../domain/sleep';
import type { TimeSlot } from '../domain/types';
import { Icon } from './Icon';

interface Props {
  stats: DayStats;
  slots: TimeSlot[];
  intervalMinutes: number;
  sleepWin: SleepWindow;
  currentStart?: string;
  goal: number;
}

const CHART_H = 120;
const BASE_Y = 64;
const UP_H = 58;
const DOWN_H = 50;
const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

/** Net points readout + a 24h waveform: gains rise above the baseline, losses hang below. */
export function DayPulse({ stats, slots, intervalMinutes, sleepWin, currentStart, goal }: Props) {
  const net = stats.netPoints;
  const ringPct = Math.max(0, Math.min(100, stats.goalPercent ?? 0));
  // A full-strength (±100 pts/h) slot fills the bar height, so bars stay comparable across days.
  const slotMax = Math.max(1, (100 * intervalMinutes) / 60);
  const w = 10;
  const gap = slots.length > 48 ? 1 : 2;
  const width = slots.length * w;

  return (
    <section className="card pulse" aria-label="Day summary">
      <div className="pulse-readout">
        <div className="goal-ring" role="img" aria-label={`${stats.goalPercent ?? 0}% of daily goal`}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r={RING_R} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
            <circle
              cx="52"
              cy="52"
              r={RING_R}
              fill="none"
              stroke={net !== null && net < 0 ? 'var(--loss)' : 'var(--accent)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - ringPct / 100)}
              style={{ transition: 'stroke-dashoffset 0.6s var(--ease)' }}
            />
          </svg>
          <div className="goal-ring-label">
            <strong>{stats.goalPercent === null ? '—' : `${stats.goalPercent}%`}</strong>
            <span className="muted" style={{ fontSize: '0.6875rem' }}>of {goal}</span>
          </div>
        </div>
        <div>
          <div className="eyebrow">Net points</div>
          <div className={`net-value ${net === null ? '' : net >= 0 ? 'pts-pos' : 'pts-neg'}`}>
            {net === null ? '—' : formatPoints(net)}
            <span className="net-unit">pts</span>
          </div>
          <span className={`productive-chip${stats.isProductiveDay ? ' is-on' : ''}`}>
            {stats.isProductiveDay && <Icon name="check" size={12} />}
            {stats.isProductiveDay ? 'Productive day' : `${stats.trackedPercent}% tracked`}
          </span>
        </div>
      </div>

      <div className="pulse-chart">
        <svg
          viewBox={`0 0 ${width} ${CHART_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Points per interval: ${formatPoints(stats.gainedPoints)} gained, ${formatPoints(stats.lostPoints)} lost`}
        >
          {slots.map((slot, i) =>
            isSlotInSleepWindow(slot, sleepWin) ? (
              <rect key={`n${slot.startTime}`} x={i * w} y={0} width={w} height={CHART_H} fill="var(--night-soft)" />
            ) : null,
          )}
          <line
            x1={0}
            x2={width}
            y1={BASE_Y}
            y2={BASE_Y}
            stroke="var(--line)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {slots.map((slot, i) => {
            const pts = stats.slotPoints[slot.startTime];
            if (pts === undefined || Math.round(pts) === 0) return null;
            const ratio = Math.min(1, Math.abs(pts) / slotMax);
            const h = Math.max(2, ratio * (pts > 0 ? UP_H : DOWN_H));
            return (
              <rect
                key={slot.startTime}
                x={i * w + gap / 2}
                y={pts > 0 ? BASE_Y - h : BASE_Y}
                width={w - gap}
                height={h}
                rx={1.5}
                fill={pts > 0 ? 'var(--gain)' : 'var(--loss)'}
              >
                <title>{`${slot.startTime}–${slot.endTime}: ${formatPoints(pts)}`}</title>
              </rect>
            );
          })}
          {currentStart &&
            (() => {
              const i = slots.findIndex((s) => s.startTime === currentStart);
              if (i < 0) return null;
              return (
                <line
                  x1={i * w + w / 2}
                  x2={i * w + w / 2}
                  y1={0}
                  y2={CHART_H}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })()}
        </svg>
        <div className="pulse-axis" aria-hidden="true">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
      </div>
    </section>
  );
}
