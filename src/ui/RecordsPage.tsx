import { useStore } from '../data/store';
import { formatDisplayDate, todayKey } from '../domain/dates';
import { computeDayStats, computePersonalRecords } from '../domain/scoring';

export function RecordsPage() {
  const { data } = useStore();
  const today = todayKey();
  const records = computePersonalRecords(data, today);
  const todayStats = computeDayStats(data, today);
  const prevBest = records.highestDailyNet;
  const isNewRecord =
    todayStats.netPoints !== null &&
    prevBest !== null &&
    todayStats.netPoints >= prevBest.value &&
    prevBest.date === today;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Personal records</h1>
      </div>

      {isNewRecord && todayStats.netPoints !== null && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--productive)' }}>
          <strong>New daily record</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            Today&apos;s net points: <strong>{todayStats.netPoints}</strong>
          </p>
        </div>
      )}

      <ul className="record-list card">
        <li>
          <span>Highest daily net points</span>
          <strong>
            {records.highestDailyNet
              ? `${records.highestDailyNet.value} (${formatDisplayDate(records.highestDailyNet.date)})`
              : '—'}
          </strong>
        </li>
        <li>
          <span>Highest weekly average (net/day)</span>
          <strong>
            {records.highestWeeklyAverage
              ? `${records.highestWeeklyAverage.value} (week of ${formatDisplayDate(records.highestWeeklyAverage.weekStart)})`
              : '—'}
          </strong>
        </li>
        <li>
          <span>Most tracked day</span>
          <strong>
            {records.mostTrackedDay
              ? `${records.mostTrackedDay.value}% (${formatDisplayDate(records.mostTrackedDay.date)})`
              : '—'}
          </strong>
        </li>
        <li>
          <span>Longest productive streak</span>
          <strong>{records.longestProductiveStreak} days</strong>
        </li>
        <li>
          <span>Current productive streak</span>
          <strong>{records.currentProductiveStreak} days</strong>
        </li>
      </ul>

      {prevBest && todayStats.netPoints !== null && !isNewRecord && (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Previous best: {prevBest.value}. Today: {todayStats.netPoints}.
        </p>
      )}
    </div>
  );
}
