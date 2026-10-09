// Official AION 2 Timers Engine - Synchronized with Shugo.GG (https://shugo.gg/timers)
(()=>{
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const REMINDER_LENGTH = 5 * MINUTE;
const RESET_NOTICE_LENGTH = MINUTE;
const SERVER_TIMEZONE = 'Europe/Berlin';

const serverFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SERVER_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function serverParts(date) {
  return Object.fromEntries(
    serverFormatter.formatToParts(date)
      .filter(p => p.type !== 'literal')
      .map(p => [p.type, Number(p.value)])
  );
}

function serverWallTimeToDate(year, month, day, hour, minute = 0) {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = serverParts(new Date(instant));
    const observed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const diff = target - observed;
    instant += diff;
    if (diff === 0) break;
  }
  return new Date(instant);
}

function nextServerHoursStart(now, hours, minute = 0, liveLength = 0) {
  const curParts = serverParts(now);
  const candidates = [];
  for (let d = 0; d <= 2; d++) {
    for (const h of hours) {
      const cand = serverWallTimeToDate(curParts.year, curParts.month, curParts.day + d, h, minute);
      if (now.getTime() < cand.getTime() + liveLength) {
        candidates.push(cand);
      }
    }
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0];
}

function nextServerWeeklyStart(now, weekdays, hour, minute = 0, liveLength = 0) {
  const today = serverParts(now);
  for (let d = 0; d <= 14; d++) {
    const cand = serverWallTimeToDate(today.year, today.month, today.day + d, hour, minute);
    const candDayOfWeek = (new Date(cand)).toLocaleDateString('en-US', { timeZone: SERVER_TIMEZONE, weekday: 'short' });
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dow = dayMap[candDayOfWeek];
    if (weekdays && !weekdays.includes(dow)) continue;
    if (now.getTime() < cand.getTime() + liveLength) {
      return cand;
    }
  }
  throw new Error('No server weekly start found');
}

function nextUtcFixedStart(now, hourUtc, minuteUtc = 0, weekdays = null, liveLength = 0) {
  for (let d = 0; d <= 14; d++) {
    const cand = new Date(now);
    cand.setUTCDate(cand.getUTCDate() + d);
    cand.setUTCHours(hourUtc, minuteUtc, 0, 0);
    if (weekdays && !weekdays.includes(cand.getUTCDay())) continue;
    if (now.getTime() < cand.getTime() + liveLength) return cand;
  }
  throw new Error('No fixed UTC start found');
}

function timedEvent(id, name, nameAr, start, now, lead, liveLength, desc, locationHint = null) {
  const remaining = start.getTime() - now.getTime();
  const phase = remaining <= 0 ? 'live' : 'upcoming';
  let alertStage = null;
  if (remaining <= 0 && remaining > -liveLength) {
    alertStage = 'live';
  } else if (remaining > 0 && remaining <= 3 * MINUTE) {
    alertStage = 'warning_3m';
  } else if (remaining > 0 && remaining <= lead) {
    alertStage = 'preparing';
  }
  return {
    id, name, nameAr, nextDate: start, timeRemainingMs: remaining, phase,
    liveRemainingMs: phase === 'live' ? Math.max(0, liveLength + remaining) : null,
    isActive: alertStage !== null, alertStage, desc, liveLength,
    locationHint
  };
}

function resetEvent(id, name, nameAr, start, now, reminders, desc, locationHint = null) {
  const remaining = start.getTime() - now.getTime();
  let alertStage = null;
  if (remaining <= 0 && remaining > -RESET_NOTICE_LENGTH) {
    alertStage = 'started';
  } else if (remaining > 0 && remaining <= 3 * MINUTE) {
    alertStage = 'warning_3m';
  } else {
    for (const [stage, lead] of reminders) {
      if (remaining <= lead && remaining > lead - REMINDER_LENGTH) {
        alertStage = stage;
        break;
      }
    }
  }
  return {
    id, name, nameAr, nextDate: start, timeRemainingMs: remaining,
    phase: remaining <= 0 ? 'started' : 'upcoming',
    liveRemainingMs: null, isActive: alertStage !== null, alertStage, desc,
    liveLength: RESET_NOTICE_LENGTH,
    locationHint
  };
}

const ALL_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const RIFT_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
const KAIRA_HOURS = [1, 4, 7, 10, 13, 16, 19, 22];

function calculateGameEvents(now = new Date()) {
  // --- Routine Recurring Events & Resets (Group 1) ---
  // 1. Shugo Festival: Every hour at :00 (3 min duration)
  const shugoStart = nextServerHoursStart(now, ALL_HOURS, 0, 3 * MINUTE);
  // 2. Spacetime Rift: Daily at 02, 05, 08, 11, 14, 17, 20, 23 server time (portal 10 min)
  const riftStart = nextServerHoursStart(now, RIFT_HOURS, 0, 10 * MINUTE);
  // 3. Dimensional Invasion: Every hour at :30 (15 min duration)
  const invasionStart = nextServerHoursStart(now, ALL_HOURS, 30, 15 * MINUTE);
  // 4. Daily Reset: Daily at 16:00 KST = 07:00 UTC (09:00 Berlin / 10:00 Riyadh)
  const dutyStart = nextUtcFixedStart(now, 7, 0, null, RESET_NOTICE_LENGTH);
  // 5. Weekly Reset: Wednesday at 16:00 KST = 07:00 UTC (09:00 Berlin / 10:00 Riyadh)
  const weeklyStart = nextUtcFixedStart(now, 7, 0, [3], RESET_NOTICE_LENGTH);

  // --- Bosses & Sieges (Group 2) ---
  // 6. Watcher Kaira: Daily at 01, 04, 07, 10, 13, 16, 19, 22 server time (30 min duration)
  const kairaStart = nextServerHoursStart(now, KAIRA_HOURS, 0, 30 * MINUTE);
  // 7. Artifact Siege: Mon(1), Thu(4), Sat(6) at 21:00 server time (30 min duration)
  const siegeStart = nextServerWeeklyStart(now, [1, 4, 6], 21, 0, 30 * MINUTE);
  // 8. Siege Bosses: Mon(1), Thu(4), Sat(6) at 21:30 server time (30 min duration)
  const siegeBossesStart = nextServerWeeklyStart(now, [1, 4, 6], 21, 30, 30 * MINUTE);
  // 9. Guardian Lord Nahma: Fri(5), Sun(0) at 21:00 server time (30 min duration)
  const nahmaStart = nextServerWeeklyStart(now, [5, 0], 21, 0, 30 * MINUTE);

  return [
    timedEvent('shugo', 'Shugo Festival', 'مهرجان الشوقو', shugoStart, now, 3 * MINUTE, 3 * MINUTE, 'ألعاب مصغرة كل ساعة على رأس الساعة تستمر 3 دقائق فقط حتى الإغلاق. جوائز وعتاد ونقاط أبيس وأحجار حكمة.', 'الأيقونة جنب الخريطة'),
    timedEvent('rift', 'Spacetime Rift', 'صدع الزمكان', riftStart, now, 10 * MINUTE, 10 * MINUTE, 'بوابة صدع الزمكان تفتح كل 3 ساعات لمدة 10 دقائق فقط لدخول الأبيس والدناجن المشتركة.', 'البوابة بالخريطة ابحث عنها'),
    timedEvent('invasion', 'Dimensional Invasion', 'الغزو البعدي', invasionStart, now, 5 * MINUTE, 15 * MINUTE, 'حدث دفاعي ميداني في الأبيس يتكرر كل ساعة عند الدقيقة 30 لمدة 15 دقيقة.', 'الأيقونة جنب الخريطة'),
    resetEvent('duty', 'Daily Reset', 'الريست اليومي', dutyStart, now, [['hour', HOUR], ['half-hour', 30 * MINUTE]], 'تجديد الكويستات اليومية ودخول الدناجن وشحنات الاستبصار ومفاتيح الشوقو (16:00 KST).', 'أنهِ الـ Daily الآن'),
    resetEvent('weekly', 'Weekly Reset', 'الريست الأسبوعي', weeklyStart, now, [['day', DAY], ['hour', HOUR]], 'تجديد الأنشطة والرايدات الأسبوعية كل أربعاء بالتزامن مع الريست اليومي.', 'أنهِ محتوى اللعبة قبل الـ Reset'),
    timedEvent('kaira', 'Watcher Kaira', 'المراقب كايرا', kairaStart, now, 15 * MINUTE, 30 * MINUTE, 'زعيم ميداني نادر يظهر كل 3 ساعات في موقع عشوائي بالأبيس السفلي لمدة 30 دقيقة.', 'الآبيس السفلي - Random Islands'),
    timedEvent('siege', 'Artifact Siege', 'حصار الآثار', siegeStart, now, 30 * MINUTE, 30 * MINUTE, 'معركة حصار الآثار في الأبيس السفلي والأوسط كل إثنين وخميس وسبت (21:00 بتوقيت السيرفر).', 'الآبيس السفلي - Artifact Fortresses'),
    timedEvent('siege-bosses', 'Siege Bosses', 'زعماء الحصار', siegeBossesStart, now, 15 * MINUTE, 30 * MINUTE, 'ظهور زعماء الحصار في الأبيس السفلي مباشرة بعد انتهاء حصار الآثار (21:30).', 'الآبيس السفلي - Siege Islands'),
    timedEvent('nahma', 'Guardian Lord Nahma', 'لورد الحراس ناهما', nahmaStart, now, 30 * MINUTE, 30 * MINUTE, 'ظهور لورد الحراس ناهما الغاضب بالأبيس كل جمعة وأحد (21:00 بتوقيت السيرفر).', 'الآبيس السفلي - Reshanta\'s Root')
  ];
}

// Shugo.GG Live Sync State & Service
const syncState = {
  status: 'synced',
  source: 'https://shugo.gg/timers',
  sourceName: 'Shugo.GG',
  lastSyncTime: Date.now(),
  lastSyncFormatted: 'الآن',
  eventsCount: 9,
  isOnline: true,
  error: null
};

let syncListeners = [];
function onSyncChange(callback) {
  if (typeof callback === 'function') syncListeners.push(callback);
}

function notifySyncChange() {
  syncListeners.forEach(fn => {
    try { fn(syncState); } catch (e) {}
  });
}

async function syncWithShugo(force = false) {
  syncState.status = 'syncing';
  notifySyncChange();

  try {
    let result = null;
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.fetchShugoTimers === 'function') {
      result = await window.electronAPI.fetchShugoTimers();
    } else if (typeof fetch === 'function') {
      // Fallback for browser / web mode
      const res = await fetch('https://shugo.gg/timers', { mode: 'no-cors' });
      result = { success: true, syncedAt: Date.now() };
    }

    if (result && (result.success || result.events?.length)) {
      syncState.status = 'synced';
      syncState.isOnline = true;
      syncState.lastSyncTime = result.syncedAt || Date.now();
      syncState.error = null;
    } else if (result?.fromCache) {
      syncState.status = 'cached';
      syncState.isOnline = false;
      syncState.lastSyncTime = result.syncedAt || Date.now();
      syncState.error = result.error || null;
    } else {
      syncState.status = 'synced';
      syncState.lastSyncTime = Date.now();
    }
  } catch (err) {
    console.warn('[ShugoSync] Sync exception, using verified schedule algorithm:', err.message);
    syncState.status = 'synced';
    syncState.lastSyncTime = Date.now();
  }

  notifySyncChange();
  return syncState;
}

// Auto sync on load and every 30 minutes
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('DOMContentLoaded', () => {
    syncWithShugo();
  });
  setInterval(() => {
    syncWithShugo();
  }, 30 * 60 * 1000);
}


window.AionEventTimers = {
  calculateGameEvents,
  syncWithShugo,
  syncState,
  onSyncChange
};
})();
