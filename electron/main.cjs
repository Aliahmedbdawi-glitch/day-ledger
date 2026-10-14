// Day Ledger desktop shell: window, tray, native notifications, launch at login.
const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const APP_ID = 'com.dayledger.app';
const isDev = !app.isPackaged;
const devUrl = process.env.DAY_LEDGER_DEV_URL;

/** @type {BrowserWindow | null} */
let win = null;
/** @type {Tray | null} */
let tray = null;
let quitting = false;

// ── Desktop settings (stored next to the app's data) ──
const settingsPath = () => path.join(app.getPath('userData'), 'desktop-settings.json');
const defaults = { closeToTray: true, openAtLogin: false };

function readSettings() {
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) };
  } catch {
    return { ...defaults };
  }
}

function writeSettings(next) {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
}

function applyLoginItem(openAtLogin) {
  // Windows/macOS only; started hidden so it lands quietly in the tray.
  app.setLoginItemSettings({ openAtLogin, args: ['--hidden'] });
}

// ── Window ──
function iconPath(name) {
  return path.join(__dirname, '..', 'build', name);
}

function createWindow({ show }) {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: 'Day Ledger',
    icon: iconPath('icon.png'),
    backgroundColor: '#0a0e16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Keep interval timers running while the window is hidden in the tray.
      backgroundThrottling: false,
    },
  });

  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.once('ready-to-show', () => {
    if (show) win.show();
  });

  // Open external links in the browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('close', (event) => {
    if (!quitting && readSettings().closeToTray) {
      event.preventDefault();
      win.hide();
    }
  });
}

function showWindow() {
  if (!win) createWindow({ show: true });
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// ── Tray ──
function createTray() {
  const image = nativeImage.createFromPath(iconPath('tray.png'));
  tray = new Tray(image);
  tray.setToolTip('Day Ledger');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Day Ledger', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', showWindow);
}

// ── IPC from the app ──
ipcMain.on('notify', (_event, payload) => {
  if (!Notification.isSupported()) return;
  const { title, body, date, startTime } = payload ?? {};
  const n = new Notification({
    title: String(title ?? 'Day Ledger'),
    body: String(body ?? ''),
    icon: iconPath('icon.png'),
    silent: false,
  });
  n.on('click', () => {
    showWindow();
    if (date && startTime) win?.webContents.send('open-slot', { date, startTime });
  });
  n.show();
});

ipcMain.handle('desktop-settings:get', () => readSettings());
ipcMain.handle('desktop-settings:set', (_event, patch) => {
  const next = { ...readSettings(), ...patch };
  writeSettings(next);
  applyLoginItem(Boolean(next.openAtLogin));
  return next;
});

// ── Lifecycle ──
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  // Required for Windows toasts to show "Day Ledger" instead of a generic app name.
  app.setAppUserModelId(isDev ? process.execPath : APP_ID);

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    const startHidden = process.argv.includes('--hidden');
    createWindow({ show: !startHidden });
    createTray();
    applyLoginItem(readSettings().openAtLogin);
  });

  app.on('before-quit', () => {
    quitting = true;
  });

  // Stay alive in the tray when all windows are hidden or closed.
  app.on('window-all-closed', () => {
    if (!readSettings().closeToTray) app.quit();
  });
}
