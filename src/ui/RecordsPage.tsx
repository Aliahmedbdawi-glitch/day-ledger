import { useStore } from '../data/store';
import { formatDisplayDate, todayKey } from '../domain/dates';
import { computeDayStats, computePersonalRecords } from '../domain/scoring';

export function RecordsPage() {
  const { data } = useStore();
  const today = todayKey();
  const records = computePersonalRecords(data, today);
  const todayStats = computeDayStats(data, today);
  const prevBest = records.highestDailyScore;
  const isNewRecord =
    todayStats.score !== null &&
    prevBest !== null &&
    todayStats.score >= prevBest.value &&
    prevBest.date === today;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Personal records</h1>
      </div>

      {isNewRecord && todayStats.score !== null && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--productive)' }}>
          <strong>New daily record</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            Today&apos;s score: <strong>{todayStats.score}</strong>
          </p>
        </div>
      )}

      <ul className="record-list card">
        <li>
          <span>Highest daily score</span>
          <strong>
            {records.highestDailyScore
              ? `${records.highestDailyScore.value} (${formatDisplayDate(records.highestDailyScore.date)})`
              : '—'}
          </strong>
        </li>
        <li>
          <span>Highest weekly average</span>
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

      {prevBest && todayStats.score !== null && !isNewRecord && (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Previous best: {prevBest.value}. Today: {todayStats.score}.
        </p>
      )}
    </div>
  );
}
