# Day Ledger

Personal 24-hour time accountability app. Data stays in your browser (`localStorage`).

## Run locally

```bash
cd day-ledger
npm install
npm run dev
```

Open http://localhost:5173/

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run test` — unit tests (scoring / grid)
- `npm run preview` — preview production build

On first use, open **Activities** and choose **Load example set**, or add your own categories. Log intervals from **Timeline**.

## Android app

The Android app wraps the same web build with [Capacitor](https://capacitorjs.com). Interval reminders are
scheduled with Android's alarm service for the next 24 hours, so they arrive even when the app is closed.

**Download:** every push to `master` builds a signed APK and attaches it to the
[android-latest release](../../releases/tag/android-latest). Open that page on the phone, download
`DayLedger.apk`, and allow "install unknown apps" for your browser when asked.

**Signing:** the workflow needs two repository secrets:

- `ANDROID_KEYSTORE_BASE64`: the base64 of the PKCS12 signing keystore
- `ANDROID_KEYSTORE_PASSWORD`: its password

Keep the keystore backed up. Phones only accept an update signed with the same key as the installed app.

**Local build** (needs JDK 21 and the Android SDK): `npm run android:sync`, then open `android/` in Android Studio.

## Android widget and updates

After opening the updated Android app once, long-press the phone home screen and
choose **Widgets → Day Ledger timeline**. The resizable widget shows today's
intervals, logged actions and daily habits. Tap a habit to check or uncheck it.
Changes are saved by Android even while the app is closed, and merged into the
app when it next opens. The title opens the app. Android refreshes the date
periodically; opening the app also refreshes the widget.

**Settings → Update app** downloads the published APK and checks its package,
signing certificate and version before opening Android's installer. Android may
ask you to allow updates from Day Ledger. Install over the existing app; do not
uninstall it. The first version containing this button still needs to be
installed using the existing APK download flow. Release builds must continue to
use the same signing key and increasing build numbers.

Native device checks before release: add/resize the widget; complete and undo
multiple habits with the app closed; reopen and confirm logs/points; test across
midnight; deny notification/install permission and retry; install a newer signed
APK over an older signed build and confirm existing history is retained.

## Windows packaging

`npm run dist` builds `release/DayLedger-Setup-<version>.exe` (Electron) with native notifications and a tray icon.
