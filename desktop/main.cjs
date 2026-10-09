const { app, BrowserWindow, shell, dialog, ipcMain, screen } = require('electron');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setAppUserModelId('com.m3rgeen.aion2');
const http = require('node:http');

const fs = require('node:fs');
const path = require('node:path');
let handleMockApi = null;
try {
  handleMockApi = require('./mock-api.cjs').handleMockApi;
} catch (e) {}

const PORT = 4177;
const HOST = '127.0.0.1';

// Resolving static app root
const appRoot = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

let httpServer = null;
let mainWindow = null;
let authPopupWindow = null;
let currentMode = 'auth';

// Window config persistence (positions for banner, mini, full)
function getConfigFile() {
  try {
    return path.join(app.getPath('userData'), 'window-config.json');
  } catch (e) {
    return path.join(appRoot, 'window-config.json');
  }
}

function getAuthFile() {
  try {
    return path.join(app.getPath('userData'), 'auth-session.json');
  } catch (e) {
    return path.join(appRoot, 'auth-session.json');
  }
}

let windowConfig = {
  banner: null,
  mini: null,
  full: { width: 1200, height: 800, x: null, y: null }
};

function loadWindowConfig() {
  try {
    const file = getConfigFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      windowConfig = { ...windowConfig, ...data };
    }
  } catch (e) {
    console.error('[Config] Failed to load window config:', e);
  }
}

function saveWindowConfig() {
  try {
    const file = getConfigFile();
    fs.writeFileSync(file, JSON.stringify(windowConfig, null, 2), 'utf8');
  } catch (e) {
    console.error('[Config] Failed to save window config:', e);
  }
}

function ensureBoundsVisible(bounds) {
  if (!bounds) return null;
  const displays = screen.getAllDisplays();
  const isVisible = displays.some(d => {
    const db = d.workArea;
    return (
      bounds.x + (bounds.width || 100) > db.x &&
      bounds.x < db.x + db.width &&
      bounds.y + (bounds.height || 100) > db.y &&
      bounds.y < db.y + db.height
    );
  });

  if (!isVisible) {
    const primary = screen.getPrimaryDisplay().workArea;
    return {
      x: primary.x + Math.round((primary.width - (bounds.width || 360)) / 2),
      y: primary.y + Math.round((primary.height - (bounds.height || 110)) / 2),
      width: bounds.width,
      height: bounds.height
    };
  }
  return bounds;
}

function getDefaultBannerPosition() {
  const primary = screen.getPrimaryDisplay().workArea;
  return {
    x: primary.x + primary.width - 380,
    y: primary.y + 40
  };
}

function getDefaultMiniPosition() {
  const primary = screen.getPrimaryDisplay().workArea;
  return {
    x: primary.x + primary.width - 160,
    y: primary.y + primary.height - 160
  };
}

function getDefaultFullBounds() {
  const primary = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1200, primary.width - 40);
  const height = Math.min(800, primary.height - 60);
  return {
    width,
    height,
    x: primary.x + Math.round((primary.width - width) / 2),
    y: primary.y + Math.round((primary.height - height) / 2)
  };
}

function startHttpServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqUrlObj;
      try {
        reqUrlObj = new URL(req.url, `http://${HOST}:${PORT}`);
        reqPath = decodeURIComponent(reqUrlObj.pathname);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Invalid request URL');
      }

      // Inspection and capture endpoints (local loopback only)
      if (reqPath === '/__capture') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.capturePage().then(img => {
            const png = img.toPNG();
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': png.length,
              'Cache-Control': 'no-store'
            });
            res.end(png);
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Capture error: ' + err.message);
          });
          return;
        } else {
          res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Window not ready');
        }
      }

      if (reqPath === '/__eval') {
        const code = reqUrlObj.searchParams.get('code');
        if (code && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(code).then(result => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, result }));
          }).catch(e => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          });
          return;
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Missing code or window' }));
        }
      }

      if (reqPath === '/__mode') {
        const m = reqUrlObj.searchParams.get('mode');
        if (m && ['banner', 'mini', 'full', 'auth'].includes(m)) {
          applyWindowMode(m);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`if(typeof setWindowMode==='function')setWindowMode('${m}')`).catch(()=>{});
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, mode: m, bounds: mainWindow ? mainWindow.getBounds() : null }));
        }
      }

      if (reqPath === '/__center') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const primary = screen.getPrimaryDisplay().workArea;
          const currentBounds = mainWindow.getBounds();
          const cx = primary.x + Math.round((primary.width - currentBounds.width) / 2);
          const cy = primary.y + Math.round((primary.height - currentBounds.height) / 2);
          mainWindow.setBounds({ x: cx, y: cy, width: currentBounds.width, height: currentBounds.height });
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, bounds: mainWindow.getBounds() }));
        }
      }

      if (reqPath === '/__focus') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, focused: mainWindow.isFocused() }));
        }
      }

      if (reqPath === '/__info') {
        const display = screen.getPrimaryDisplay();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          mode: currentMode,
          bounds: mainWindow ? mainWindow.getBounds() : null,
          alwaysOnTop: mainWindow ? mainWindow.isAlwaysOnTop() : false,
          isVisible: mainWindow ? mainWindow.isVisible() : false,
          isFocused: mainWindow ? mainWindow.isFocused() : false,
          scaleFactor: display.scaleFactor,
          workArea: display.workArea,
          config: windowConfig
        }));
      }
      if (reqPath.startsWith('/api/auth/')) {
        const isMock = process.argv.includes('--mock');
        if (isMock && handleMockApi) {
          return handleMockApi(req, res, reqPath);
        }
      }

      let filePath = path.resolve(appRoot, '.' + reqPath);
      if (filePath === appRoot || filePath === appRoot + path.sep) {
        filePath = path.join(appRoot, 'index.html');
      }

      // Strict path traversal prevention
      if (!filePath.startsWith(appRoot + path.sep) && filePath !== path.join(appRoot, 'index.html')) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Forbidden');
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not Found');
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store'
        });
        res.end(data);
      });
    });

    server.on('error', (err) => {
      reject(err);
    });

    server.listen(PORT, HOST, () => {
      console.log(`[Desktop Server] Listening on http://${HOST}:${PORT}`);
      resolve(server);
    });
  });
}

function applyWindowMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  currentMode = mode;
  const isDemo = process.argv.includes('--demo') || process.argv.includes('--demo-overlay');

  if (mode === 'banner') {
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(320, 90);
    let pos;
    if (isDemo) {
      const primary = screen.getPrimaryDisplay().workArea;
      pos = {
        x: primary.x + Math.round((primary.width - 360) / 2),
        y: primary.y + Math.round((primary.height - 110) / 2)
      };
    } else {
      pos = ensureBoundsVisible({
        ...(windowConfig.banner || getDefaultBannerPosition()),
        width: 360,
        height: 110
      });
    }
    mainWindow.setBounds({
      x: pos.x,
      y: pos.y,
      width: 360,
      height: 110
    });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.show();
    mainWindow.focus();
  } else if (mode === 'mini') {
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(120, 120);
    let pos;
    if (isDemo) {
      const primary = screen.getPrimaryDisplay().workArea;
      pos = {
        x: primary.x + Math.round((primary.width - 140) / 2),
        y: primary.y + Math.round((primary.height - 140) / 2)
      };
    } else {
      pos = ensureBoundsVisible({
        ...(windowConfig.mini || getDefaultMiniPosition()),
        width: 140,
        height: 140
      });
    }
    mainWindow.setBounds({
      x: pos.x,
      y: pos.y,
      width: 140,
      height: 140
    });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.show();
    mainWindow.focus();
  } else if (mode === 'auth') {
    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(480, 600);
    const primary = screen.getPrimaryDisplay().workArea;
    const width = 520;
    const height = 680;
    mainWindow.setBounds({
      x: primary.x + Math.round((primary.width - width) / 2),
      y: primary.y + Math.round((primary.height - height) / 2),
      width,
      height
    });
  } else {
    // 'full' Dashboard mode
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(1000, 700);
    mainWindow.setResizable(true);
    const bounds = ensureBoundsVisible(windowConfig.full && windowConfig.full.x !== null ? windowConfig.full : getDefaultFullBounds());
    mainWindow.setBounds(bounds);
  }
}

async function safeOpenExternal(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') return;
  try {
    // If it's a Discord channel URL, attempt to launch Discord Desktop App first
    if (/^https?:\/\/(?:www\.)?discord\.com\/channels\//i.test(targetUrl)) {
      const discordAppUrl = targetUrl.replace(/^https?:\/\/(?:www\.)?discord\.com\//i, 'discord://-/');
      try {
        await shell.openExternal(discordAppUrl);
        return;
      } catch (err) {
        console.warn('[OpenExternal] Discord desktop app protocol failed, falling back to browser:', err);
      }
    }

    if (/^https?:\/\//i.test(targetUrl)) {
      await shell.openExternal(targetUrl);
    }
  } catch (err) {
    console.error('[OpenExternal] Failed to open external URL:', err);
  }
}

function createWindow() {
  loadWindowConfig();

  const isDemo = process.argv.includes('--demo') || process.argv.includes('--demo-overlay');
  const isMock = process.argv.includes('--mock');

  let hasSavedSession = false;
  try {
    const authFile = getAuthFile();
    if (fs.existsSync(authFile)) {
      const data = JSON.parse(fs.readFileSync(authFile, 'utf8'));
      if (data && data.token) hasSavedSession = true;
    }
  } catch (e) {}

  const initialMode = isDemo ? 'banner' : (isMock || hasSavedSession ? 'full' : 'auth');
  currentMode = initialMode;

  let initialBounds;
  if (isDemo) {
    const primary = screen.getPrimaryDisplay().workArea;
    initialBounds = {
      width: 360,
      height: 110,
      x: primary.x + Math.round((primary.width - 360) / 2),
      y: primary.y + Math.round((primary.height - 110) / 2)
    };
  } else if (isMock || hasSavedSession) {
    initialBounds = ensureBoundsVisible(windowConfig.full && windowConfig.full.x !== null ? windowConfig.full : getDefaultFullBounds());
  } else {
    const primary = screen.getPrimaryDisplay().workArea;
    initialBounds = {
      width: 520,
      height: 680,
      x: primary.x + Math.round((primary.width - 520) / 2),
      y: primary.y + Math.round((primary.height - 680) / 2)
    };
  }

  mainWindow = new BrowserWindow({
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y,
    frame: false,
    transparent: true,
    hasShadow: true,
    show: true,
    skipTaskbar: false,
    alwaysOnTop: isDemo,
    backgroundColor: '#00000000',
    icon: path.join(appRoot, 'assets', 'icon.ico'),
    title: 'M3RGEEN • Aion 2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: isMock ? ['--mock'] : [],
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  if (isDemo) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.flashFrame(true);
  } else {
    mainWindow.show();
    mainWindow.focus();
  }

  mainWindow.setMenuBarVisibility(false);
  const startUrl = isDemo ? `http://${HOST}:${PORT}/?demo=overlay` : `http://${HOST}:${PORT}/`;
  mainWindow.loadURL(startUrl);

  // Guarantee visibility across systems regardless of transparent window lifecycle
  const bringToFront = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
  };

  mainWindow.once('ready-to-show', bringToFront);
  mainWindow.webContents.on('did-finish-load', bringToFront);

  mainWindow.on('moved', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const [x, y] = mainWindow.getPosition();
    if (currentMode === 'banner') {
      windowConfig.banner = { x, y };
      saveWindowConfig();
    } else if (currentMode === 'mini') {
      windowConfig.mini = { x, y };
      saveWindowConfig();
    } else if (currentMode === 'full') {
      const [width, height] = mainWindow.getSize();
      windowConfig.full = { x, y, width, height };
      saveWindowConfig();
    }
  });

  mainWindow.on('resized', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (currentMode === 'full') {
      const [x, y] = mainWindow.getPosition();
      const [width, height] = mainWindow.getSize();
      windowConfig.full = { x, y, width, height };
      saveWindowConfig();
    }
  });

  // Window navigation restriction
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (parsed.origin !== `http://${HOST}:${PORT}`) {
        event.preventDefault();
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          safeOpenExternal(navigationUrl);
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  // Safe window.open handling for OAuth & external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (url === 'about:blank') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 580,
            height: 780,
            autoHideMenuBar: true,
            title: 'تسجيل الدخول عبر Discord • M3RGEEN',
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true
            }
          }
        };
      }

      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { action: 'deny' };
      }

      const isDiscordAuth =
        (parsed.hostname === 'discord.com' || parsed.hostname === 'canary.discord.com') &&
        parsed.pathname.startsWith('/oauth2/authorize');

      const isBackendAuth =
        parsed.hostname === 'mdarb3bot-production.up.railway.app' &&
        parsed.pathname.startsWith('/api/auth');

      if (isDiscordAuth || isBackendAuth) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 580,
            height: 780,
            autoHideMenuBar: true,
            title: 'تسجيل الدخول عبر Discord • M3RGEEN',
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true
            }
          }
        };
      }

      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        safeOpenExternal(url);
      }
      return { action: 'deny' };
    } catch {
      return { action: 'deny' };
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Track popup browser windows and auto-close on auth completion
app.on('browser-window-created', (event, childWindow) => {
  if (childWindow !== mainWindow) {
    authPopupWindow = childWindow;

    childWindow.webContents.on('did-navigate', (navEvent, navUrl) => {
      try {
        const u = new URL(navUrl);
        if (u.hostname === 'mdarb3bot-production.up.railway.app' && u.pathname === '/api/auth/callback') {
          // Callback page reached; wait safely for auth:success IPC from client exchange
          // Only as a long fallback (8s) close it if auth:success was missed
          setTimeout(() => {
            if (authPopupWindow && !authPopupWindow.isDestroyed()) {
              authPopupWindow.close();
              authPopupWindow = null;
            }
          }, 8000);
        }
      } catch (e) {}
    });

    childWindow.on('closed', () => {
      if (authPopupWindow === childWindow) {
        authPopupWindow = null;
      }
    });
  }
});

// IPC handlers for window control
ipcMain.on('window:set-mode', (event, mode) => {
  applyWindowMode(mode);
});

ipcMain.on('window:close-app', () => {
  app.quit();
});

ipcMain.on('window:minimize-app', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('auth:success', () => {
  if (authPopupWindow && !authPopupWindow.isDestroyed()) {
    authPopupWindow.close();
    authPopupWindow = null;
  }
});

ipcMain.on('auth:failed', () => {
  if (authPopupWindow && !authPopupWindow.isDestroyed()) {
    authPopupWindow.close();
    authPopupWindow = null;
  }
});

ipcMain.on('auth:save-session', (event, token) => {
  try {
    const file = getAuthFile();
    if (token) {
      fs.writeFileSync(file, JSON.stringify({ token, savedAt: Date.now() }), 'utf8');
    } else {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  } catch (e) {
    console.error('[Auth] Failed to save session to disk:', e);
  }
});

ipcMain.handle('auth:get-session', () => {
  try {
    const file = getAuthFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return data && data.token ? data.token : null;
    }
  } catch (e) {
    console.error('[Auth] Failed to read session from disk:', e);
  }
  return null;
});

ipcMain.on('app:open-external', (_, url) => {
  safeOpenExternal(url);
});

// Live synchronization with https://shugo.gg/timers
ipcMain.handle('timers:fetch-shugo', async () => {
  let cacheFile = '';
  try {
    cacheFile = path.join(app.getPath('userData'), 'shugo-timers-cache.json');
  } catch (e) {
    cacheFile = path.join(appRoot, 'shugo-timers-cache.json');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch('https://shugo.gg/timers', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const tableMatch = html.match(/<h2>(?:Europe|Asia)[\s\S]*?<table>([\s\S]*?)<\/table>/i) || html.match(/<table>([\s\S]*?)<\/table>/i);
    let parsedEvents = [];
    if (tableMatch) {
      const rows = [...tableMatch[1].matchAll(/<tr><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)];
      parsedEvents = rows.map(m => ({
        name: m[1].replace(/^[^\w\s\u0600-\u06FF]+/, '').trim(),
        schedule: m[2].trim(),
        duration: m[3].trim(),
        desc: m[4].trim()
      }));
    }

    const payload = {
      success: true,
      syncedAt: Date.now(),
      source: 'https://shugo.gg/timers',
      events: parsedEvents
    };

    try {
      fs.writeFileSync(cacheFile, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {}

    return payload;
  } catch (err) {
    console.warn('[ShugoTimers] Sync failed, attempting cache fallback:', err.message);
    try {
      if (fs.existsSync(cacheFile)) {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return { ...cached, success: false, fromCache: true, error: err.message };
      }
    } catch (e) {}
    return { success: false, error: err.message, syncedAt: null };
  }
});


let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.warn('[AutoUpdater] electron-updater failed to load:', e.message);
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', { type: 'available', version: info.version });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', { type: 'progress', percent: Math.round(progress.percent) });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', { type: 'downloaded', version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Error:', err.message);
  });

  ipcMain.handle('updater:check', async () => {
    if (app.isPackaged && autoUpdater) {
      try {
        return await autoUpdater.checkForUpdates();
      } catch (e) {
        return { error: e.message };
      }
    }
    return { dev: true };
  });

  ipcMain.handle('updater:install', () => {
    if (autoUpdater) {
      autoUpdater.quitAndInstall();
    }
  });

  ipcMain.handle('updater:version', () => {
    return app.getVersion();
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      httpServer = await startHttpServer();
    } catch (err) {
      console.error('[Desktop Server] Failed to bind port:', err);
      let errorMsg = `تعذر تشغيل خادم الواجهة الداخلي على المنفذ ${PORT}.\n`;
      if (err.code === 'EADDRINUSE') {
        errorMsg += `المنفذ ${PORT} مستخدم بالفعل بواسطة برنامج آخر. يرجى إغلاق البرنامج الذي يشغل المنفذ وإعادة المحاولة.`;
      } else {
        errorMsg += `السبب: ${err.message}`;
      }
      dialog.showErrorBox('خطأ في تشغيل M3RGEEN Aion 2', errorMsg);
      app.quit();
      return;
    }

    createWindow();
    setupAutoUpdater();

    if (app.isPackaged && autoUpdater) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(e => console.log('[AutoUpdater] Initial check error:', e.message));
      }, 5000);
      setInterval(() => {
        autoUpdater.checkForUpdates().catch(e => {});
      }, 4 * 60 * 60 * 1000);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    if (httpServer) {
      httpServer.close();
      httpServer = null;
    }
  });
}
