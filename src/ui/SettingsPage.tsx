import { useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { parseTimeToMinutes } from '../domain/dates';
import { minutesToTime, sleepWindow } from '../domain/sleep';
import { INTERVAL_OPTIONS, type IntervalMinutes } from '../domain/types';
import { desktop, type DesktopSettings } from '../platform/desktop';
import {
  exactAlarmsAllowed,
  isAndroid,
  notificationPermission,
  openExactAlarmSettings,
  requestNotificationPermission,
} from '../platform/android';

const ANDROID_APK =
  'https://github.com/Aliahmedbdawi-glitch/day-ledger/releases/download/android-latest/DayLedger.apk';

function AndroidRemindersCard() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [exact, setExact] = useState<boolean | null>(null);

  const refresh = () => {
    notificationPermission().then(setPermission).catch(() => undefined);
    exactAlarmsAllowed().then(setExact).catch(() => undefined);
  };
  useEffect(refresh, []);

  return (
    <div className="card settings-group">
      <h3>Phone reminders</h3>
      <p className="muted">
        Reminders are scheduled with Android for the next 24 hours, so they arrive even when the app
        is closed. Opening the app refreshes them.
      </p>
      <ul className="ledger-list" style={{ marginTop: 0 }}>
        <li>
          <span>Notifications</span>
          {permission === 'granted' ? (
            <span className="pts-pos">Allowed</span>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => requestNotificationPermission().then(refresh)}
            >
              Allow
            </button>
          )}
        </li>
        <li>
          <span>On-the-minute timing</span>
          {exact ? (
            <span className="pts-pos">On</span>
          ) : (
            <button type="button" className="btn" onClick={() => openExactAlarmSettings().then(refresh)}>
              Turn on
            </button>
          )}
        </li>
      </ul>
      <p className="muted" style={{ marginBottom: 0 }}>
        If reminders arrive late, set Day Ledger&apos;s battery usage to “Unrestricted” in Android settings.
      </p>
    </div>
  );
}

function DesktopSettingsCard() {
  const [prefs, setPrefs] = useState<DesktopSettings | null>(null);

  useEffect(() => {
    desktop?.getSettings().then(setPrefs).catch(() => undefined);
  }, []);

  const change = (patch: Partial<DesktopSettings>) => {
    desktop?.setSettings(patch).then(setPrefs).catch(() => undefined);
  };

  return (
    <div className="card settings-group">
      <h3>Desktop app</h3>
      <p className="muted">
        Reminders only fire while Day Ledger is running. Keep it in the tray so you never miss one.
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={prefs?.openAtLogin ?? false}
          disabled={!prefs}
          onChange={(e) => change({ openAtLogin: e.target.checked })}
        />
        <span>Start with Windows (opens quietly in the tray)</span>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={prefs?.closeToTray ?? true}
          disabled={!prefs}
          onChange={(e) => change({ closeToTray: e.target.checked })}
        />
        <span>Keep running in the tray when the window is closed</span>
      </label>
    </div>
  );
}

function numberOr(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function SettingsPage() {
  const { data, updateSettings, setDefaultInterval } = useStore();
  const { settings } = data;
  const sleep = sleepWindow(settings);
  const bedtime = minutesToTime(sleep.bedMin);

  const setSleepWindow = (bed: string, wake: string) => {
    const span = (parseTimeToMinutes(wake) - parseTimeToMinutes(bed) + 24 * 60) % (24 * 60);
    updateSettings({
      defaultSleepEndTime: wake,
      defaultSleepDurationHours: Math.round(span / 15) / 4,
    });
  };

  const notifStatus = isAndroid
    ? 'Scheduled with Android'
    : desktop
    ? 'Native Windows notifications'
    : typeof Notification === 'undefined'
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

      {!isAndroid && (
        <div className="card settings-group">
          <h3>Install</h3>
          <p className="muted">
            Install Day Ledger on your Android phone. Installing again updates the copy you already have.
          </p>
          <div className="install-actions">
            <a className="btn btn-primary" href={ANDROID_APK} download>
              Download Android app
            </a>
          </div>
        </div>
      )}

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
        <h3>Sleep schedule</h3>
        <p className="muted">
          Your default night. With auto-register on, any slot in this window you haven&apos;t
          logged is filled with Sleep when you wake up. Logs you make yourself are never overwritten.
        </p>
        <div className="form-row">
          <label>
            Bedtime
            <input
              type="time"
              value={bedtime}
              onChange={(e) => e.target.value && setSleepWindow(e.target.value, settings.defaultSleepEndTime)}
            />
          </label>
          <label>
            Wake time
            <input
              type="time"
              value={settings.defaultSleepEndTime}
              onChange={(e) => e.target.value && setSleepWindow(bedtime, e.target.value)}
            />
          </label>
          <span className="muted" style={{ alignSelf: 'end', paddingBottom: '0.4rem' }}>
            = {settings.defaultSleepDurationHours}h
          </span>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.autoRegisterSleep}
            onChange={(e) => updateSettings({ autoRegisterSleep: e.target.checked })}
          />
          <span>Auto-register sleep</span>
        </label>
        <div className="form-row" style={{ marginTop: '0.5rem' }}>
          <label>
            Sleep limit (hours/day)
            <input
              type="number"
              min={4}
              max={14}
              step={0.5}
              value={settings.sleepLimitHours}
              onChange={(e) =>
                updateSettings({ sleepLimitHours: numberOr(e.target.value, settings.sleepLimitHours) })
              }
              style={{ width: '5rem' }}
            />
          </label>
          <label>
            Penalty per extra hour
            <input
              type="number"
              min={0}
              max={200}
              value={settings.oversleepPenaltyPerHour}
              onChange={(e) =>
                updateSettings({
                  oversleepPenaltyPerHour: Math.abs(numberOr(e.target.value, settings.oversleepPenaltyPerHour)),
                })
              }
              style={{ width: '5rem' }}
            />
          </label>
        </div>
        <p className="muted">
          Sleep up to the limit earns the Sleep activity&apos;s points. Every hour beyond it costs{' '}
          <strong className="pts-neg">−{settings.oversleepPenaltyPerHour}</strong> instead.
        </p>
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
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.quietDuringSleep}
            disabled={!settings.notificationsEnabled}
            onChange={(e) => updateSettings({ quietDuringSleep: e.target.checked })}
          />
          <span>
            Silent during sleep ({bedtime}–{settings.defaultSleepEndTime})
          </span>
        </label>
        {!desktop && !isAndroid && typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
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

      {desktop && <DesktopSettingsCard />}
      {isAndroid && <AndroidRemindersCard />}

      <div className="card settings-group">
        <h3>Day assessment</h3>
        <p className="muted">
          A day&apos;s net points = points earned − points lost − penalties. A day is productive when it
          reaches the points goal <em>and</em> the tracked target.
        </p>
        <div className="form-row">
          <label>
            Daily points goal
            <input
              type="number"
              min={0}
              step={50}
              value={settings.dailyPointsGoal}
              onChange={(e) =>
                updateSettings({ dailyPointsGoal: Math.max(0, numberOr(e.target.value, settings.dailyPointsGoal)) })
              }
              style={{ width: '6rem' }}
            />
          </label>
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
              style={{ width: '5rem' }}
            />
          </label>
          <label>
            Unrecorded penalty (per hour)
            <input
              type="number"
              min={0}
              max={100}
              value={settings.unrecordedPenaltyPerHour}
              onChange={(e) =>
                updateSettings({
                  unrecordedPenaltyPerHour: Math.abs(numberOr(e.target.value, settings.unrecordedPenaltyPerHour)),
                })
              }
              style={{ width: '5rem' }}
            />
          </label>
        </div>
      </div>

      <div className="card settings-group">
        <h3>Data</h3>
        <p className="muted">All data is stored locally on this device only. Uninstalling the app keeps it unless you delete the Day Ledger folder in AppData.</p>
      </div>
    </div>
  );
}
