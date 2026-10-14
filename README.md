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

## Windows app

`npm run dist` builds `release/DayLedger-Setup-<version>.exe` (Electron) with native notifications and a tray icon.
