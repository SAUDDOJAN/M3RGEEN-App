const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

module.exports = async function(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.resolve(__dirname, '../assets/icon.ico');

  const cacheDir = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\sdoja\\AppData\\Local', 'electron-builder', 'Cache', 'winCodeSign');
  let rceditPath = null;
  if (fs.existsSync(cacheDir)) {
    const subs = fs.readdirSync(cacheDir);
    for (const sub of subs) {
      const candidate = path.join(cacheDir, sub, 'rcedit-x64.exe');
      if (fs.existsSync(candidate)) {
        rceditPath = candidate;
        break;
      }
    }
  }

  if (rceditPath && fs.existsSync(exePath) && fs.existsSync(iconPath)) {
    console.log(`[AfterPack] Embedding icon via rcedit: ${exePath}`);
    try {
      execFileSync(rceditPath, [exePath, '--set-icon', iconPath], { stdio: 'inherit' });
      console.log(`[AfterPack] ✅ Successfully embedded icon into ${exePath}`);
    } catch (err) {
      console.error('[AfterPack] rcedit failed:', err.message);
    }
  } else {
    console.warn(`[AfterPack] Could not find rcedit or exe: rcedit=${rceditPath}, exe=${exePath}`);
  }
};
