// Exposes a small, explicit API to the web app. No Node access leaks into the page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dayLedger', {
  isDesktop: true,
  notify: (payload) => ipcRenderer.send('notify', payload),
  onOpenSlot: (callback) => {
    const listener = (_event, slot) => callback(slot);
    ipcRenderer.on('open-slot', listener);
    return () => ipcRenderer.removeListener('open-slot', listener);
  },
  getSettings: () => ipcRenderer.invoke('desktop-settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('desktop-settings:set', patch),
});
