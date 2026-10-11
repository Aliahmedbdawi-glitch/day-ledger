import { useStore } from '../data/store';
import { INTERVAL_OPTIONS, type IntervalMinutes } from '../domain/types';

export function SettingsPage() {
  const { data, updateSettings, setDefaultInterval } = useStore();
  const { settings } = data;

  const notifStatus =
    typeof Notification === 'undefined'
      ? 'Not supported in this browser'
      : Notification.permission === 'granted'
        ? 'Allowed'
        : Notification.permission === 'denied'
          ? 'Blocked — you can still log from the catch-up list'
          : 'Not requested yet';

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="card settings-group">
        <h3>Time interval</h3>
        <p className="muted">
          Default slot length for new days. If today already has logs, changes apply from tomorrow.
        </p>
        <label>
          Interval length
          <select
            value={settings.defaultIntervalMinutes}
            onChange={(e) => setDefaultInterval(Number(e.target.value) as IntervalMinutes)}
            style={{ display: 'block', marginTop: '0.35rem', padding: '0.4rem' }}
          >
            {INTERVAL_OPTIONS.map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card settings-group">
        <h3>Notifications</h3>
        <p className="muted">Reminders fire when a slot ends while this app is open. Status: {notifStatus}</p>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
          />
          <span>Enable interval reminders</span>
        </label>
        {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
          <button
            type="button"
            className="btn"
            style={{ marginTop: '0.5rem' }}
            onClick={() => Notification.requestPermission()}
          >
            Request permission
          </button>
        )}
      </div>

      <div className="card settings-group">
        <h3>Default sleep</h3>
        <p className="muted">Used when you open Add sleep. Also updated when you save sleep or tap Save as default.</p>
        <div className="form-row">
          <label>
            Duration (hours)
            <select
              value={settings.defaultSleepDurationHours}
              onChange={(e) =>
                updateSettings({ defaultSleepDurationHours: Number(e.target.value) })
              }
            >
              {[5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <option key={h} value={h}>{h} hours</option>
              ))}
            </select>
          </label>
          <label>
            Wake time (end of sleep)
            <input
              type="time"
              value={settings.defaultSleepEndTime}
              onChange={(e) => updateSettings({ defaultSleepEndTime: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="card settings-group">
        <h3>Productive day</h3>
        <label>
          Tracked-day target (%)
          <input
            type="number"
            min={1}
            max={100}
            value={settings.trackedDayTargetPercent}
            onChange={(e) =>
              updateSettings({ trackedDayTargetPercent: Number(e.target.value) || 80 })
            }
            style={{ display: 'block', marginTop: '0.35rem', width: '6rem' }}
          />
        </label>
        <p className="muted">Days at or above this tracked percentage count toward your streak.</p>
      </div>

      <div className="card settings-group">
        <h3>Data</h3>
        <p className="muted">All data is stored locally in this browser only.</p>
      </div>
    </div>
  );
}
