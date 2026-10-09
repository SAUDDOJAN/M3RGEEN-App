const { contextBridge, ipcRenderer } = require('electron');

const isMock = process.argv.includes('--mock');
if (isMock) {
  contextBridge.exposeInMainWorld('__M3RGEEN_API__', process.env.M3RGEEN_API_URL || 'http://127.0.0.1:4177');
  try {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('m3rgeen.aion.session')) {
      sessionStorage.setItem('m3rgeen.aion.session', 'mock_dev_token');
    }
  } catch (e) {}
}

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowMode: (mode) => ipcRenderer.send('window:set-mode', mode),
  closeApp: () => ipcRenderer.send('window:close-app'),
  minimizeApp: () => ipcRenderer.send('window:minimize-app'),
  authSuccess: () => ipcRenderer.send('auth:success'),
  authFailed: () => ipcRenderer.send('auth:failed'),
  onUpdaterEvent: (callback) => {
    const handler = (_event, val) => callback(val);
    ipcRenderer.on('updater-event', handler);
    return () => ipcRenderer.removeListener('updater-event', handler);
  },
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getAppVersion: () => ipcRenderer.invoke('updater:version'),
  fetchShugoTimers: () => ipcRenderer.invoke('timers:fetch-shugo'),
  openExternal: (url) => ipcRenderer.send('app:open-external', url),
  saveAuthSession: (token) => ipcRenderer.send('auth:save-session', token),
  getAuthSession: () => ipcRenderer.invoke('auth:get-session')
});


