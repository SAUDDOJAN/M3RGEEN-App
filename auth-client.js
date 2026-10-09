// Real integrations
(()=>{
  const key='m3rgeen.aion.session';
  const api=(typeof window!=='undefined'&&window.__M3RGEEN_API__)||'https://mdarb3bot-production.up.railway.app';
  
  function getStoredToken() {
    try {
      const isLoggedOut = localStorage.getItem('m3rgeen.aion.logged_out') === '1' || sessionStorage.getItem('m3rgeen.aion.logged_out') === '1';
      if (isLoggedOut) return null;
      return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
    } catch(e) {
      return null;
    }
  }

  function setStoredToken(t) {
    token = t;
    try { localStorage.setItem(key, t); } catch(e) {}
    try { sessionStorage.setItem(key, t); } catch(e) {}
    try {
      localStorage.removeItem('m3rgeen.aion.logged_out');
      sessionStorage.removeItem('m3rgeen.aion.logged_out');
    } catch(e) {}
    if (window.electronAPI && typeof window.electronAPI.saveAuthSession === 'function') {
      window.electronAPI.saveAuthSession(t);
    }
  }

  function removeStoredToken() {
    token = null;
    try { localStorage.removeItem(key); } catch(e) {}
    try { sessionStorage.removeItem(key); } catch(e) {}
    if (window.electronAPI && typeof window.electronAPI.saveAuthSession === 'function') {
      window.electronAPI.saveAuthSession(null);
    }
  }

  let token = getStoredToken() || (api.includes('127.0.0.1:4177') && !localStorage.getItem('m3rgeen.aion.logged_out') ? 'mock_dev_token' : null);
  let user = null, busy = false;
  const message=document.querySelector('#auth-message'),button=document.querySelector('#discord-login');
  const errors={
    AUTH_NOT_CONFIGURED:'تسجيل الدخول ينتظر إعداد الخادم. حاول لاحقًا.',
    NOT_A_GUILD_MEMBER:'حسابك ليس عضوًا في سيرفر M3RGEEN الرسمي. انضم للسيرفر ثم أعد تسجيل الدخول.',
    LOGIN_CANCELLED:'تم إلغاء الدخول. يمكنك المحاولة مجددًا.',
    SESSION_EXPIRED:'انتهت جلسة الدخول. سجّل دخولك مجددًا.',
    INVALID_OR_EXPIRED_ATTEMPT:'انتهت مهلة الدخول. حاول مجددًا.',
    TOO_MANY_ATTEMPTS:'محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.',
    ACCESS_DENIED:'تم رفض الدخول لعدم استيفاء شروط عضوية الجيلد واعتماد استمارة شوقو.',
    NOT_QUALIFIED:'غير مؤهل لدخول البرنامج — لا تمتلك رول الجيلد في ديسكورد ولا توجد استمارة شخصية معتمدة.',
    NO_ACCEPTED_PROFILE:'تمتلك رول الجيلد، ولكن لا يوجد بروفايل شخصية معتمد (Accepted) في شوقو مرتبط بحسابك.',
    MISSING_GUILD_ROLE:'لديك استمارة شخصية معتمدة، ولكنك لا تمتلك رول الجيلد الرسمي المقابل في ديسكورد.',
    GUILD_MISMATCH:'عدم تطابق في العضوية: رول الديسكورد لا يطابق الجيلد المعتمد في استمارتك.',
    PROFILE_PENDING:'استمارة شخصيتك ما زالت قيد المراجعة (Pending) من قبل إدارة الجيلد.',
    PROFILE_REJECTED:'استمارة شخصيتك مرفوضة (Rejected). يرجى مراجعة إدارة الجيلد.'
  };
  function lock(error, detailMessage){
    if(typeof lfgPollInterval!=='undefined'&&lfgPollInterval){clearInterval(lfgPollInterval);lfgPollInterval=null;}
    if(typeof notifPollInterval!=='undefined'&&notifPollInterval){clearInterval(notifPollInterval);notifPollInterval=null;}
    if(typeof chatPollInterval!=='undefined'&&chatPollInterval){clearInterval(chatPollInterval);chatPollInterval=null;}
    document.body.classList.add('auth-locked');
    document.querySelector('#auth-screen').hidden=false;
    document.querySelector('#compact-window').hidden=true;
    document.querySelector('#modal').close();
    removeStoredToken();
    user=null;
    message.textContent=detailMessage || errors[error] || errors['ACCESS_DENIED'] || 'تعذر الاتصال بخدمة الدخول. حاول مجددًا.';
    const showInvite = ['NOT_A_GUILD_MEMBER','MISSING_GUILD_ROLE','NOT_QUALIFIED'].includes(error);
    document.querySelector('#auth-invite').hidden=!showInvite;
    if(typeof setWindowMode==='function')setWindowMode('auth');
  }
  async function request(path,body){
    const res=await fetch(api+path,{
      method:body?'POST':'GET',
      headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
      signal:AbortSignal.timeout(20000)
    });
    const data=await res.json();
    if(!res.ok && res.status!==202){
      const err = new Error(data.error || 'SERVICE_UNAVAILABLE');
      err.status = res.status;
      err.data = data;
      err.reason = data.reason || data.error;
      err.detailMessage = data.message;
      throw err;
    }
    return data;
  }
  function account(data){user=data;document.body.classList.remove('auth-locked');document.querySelector('#auth-screen').hidden=true;
    const charName = data.character_name || data.aion2Profile?.character_name || null;
    const charAvatar = data.character_avatar || data.aion2Profile?.profile_image || null;
    const charClass = data.aion2Profile?.selected_class || null;
    window.viewer = charName;
    window.viewerClass = charClass;
    window.currentUser = data;
    window.currentUserId = data.id;
    if (typeof viewer !== 'undefined') viewer = charName;
    if (typeof viewerClass !== 'undefined') viewerClass = charClass;
    if (typeof currentUserId !== 'undefined') currentUserId = data.id;
    if (typeof registerCharacterIdentity === 'function') {
      registerCharacterIdentity(data.id, charName, charAvatar, charClass);
    }

    // 1. Top of UI: In-game character identity ONLY (no discord name, no class, no level, no gear score)
    const top=document.querySelector('.account-summary');
    if (top) {
      const topImg = top.querySelector('img');
      if (topImg) {
        if (charAvatar && typeof isValidAvatarUrl === 'function' && isValidAvatarUrl(charAvatar)) {
          topImg.src = charAvatar;
          topImg.alt = charName ? `شخصية ${charName}` : 'شخصية AION 2';
          topImg.onerror = function() { this.onerror = null; this.src = window.NEUTRAL_AVATAR_DATA_URI || ''; };
        } else {
          topImg.src = window.NEUTRAL_AVATAR_DATA_URI || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237e8b9f'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
          topImg.alt = 'شخصية AION 2';
        }
      }
      const topName = top.querySelector('b');
      if (topName) {
        topName.textContent = charName || 'غير مسجل في شوقو';
      }
      const topSmall = top.querySelector('small');
      if (topSmall) {
        topSmall.innerHTML = '<strong id="account-points">—</strong> نقطة <em>• فعلية</em>';
      }
      top.title = charName ? `شخصية AION 2: ${charName}` : 'شخصية AION 2';
    }

    fetchLeaderboardData().then(lb => {
      if (lb && lb.me && lb.me.rank !== null && lb.me.total_points !== undefined) {
        const pts = document.getElementById('account-points');
        if (pts) pts.textContent = lb.me.total_points;
      }
    }).catch(console.error);

    // 2. Bottom of sidebar: Discord identity strictly preserved
    const profile=document.querySelector('#login');
    if (profile) {
      profile.innerHTML='<img class="avatar" alt="صورة حساب Discord"><span><b></b><small>تسجيل الخروج</small></span><span>↗</span>';
      const profileImg = profile.querySelector('img');
      if (profileImg) {
        profileImg.src = data.avatar;
        profileImg.onerror = function() { this.onerror = null; this.src = window.NEUTRAL_AVATAR_DATA_URI || ''; };
      }
      const profileName = profile.querySelector('b');
      if (profileName) {
        profileName.textContent = data.displayName || data.username;
      }
      profile.title = `حساب Discord: ${data.displayName || data.username}`;
      profile.onclick = logout;
    }

    if(page==='access')renderAccess();
    if(page==='groups' && typeof renderGroups==='function')renderGroups();
  }
  async function logout(){
    let confirmed=true;
    try{await request('/api/auth/logout',{});}catch{confirmed=false;}
    window.viewer=null;window.viewerClass=null;window.currentUser=null;window.currentUserId=null;
    if(typeof viewer!=='undefined')viewer=null;
    if(typeof viewerClass!=='undefined')viewerClass=null;
    if(typeof currentUserId!=='undefined')currentUserId=null;
    try {
      localStorage.setItem('m3rgeen.aion.logged_out', '1');
      sessionStorage.setItem('m3rgeen.aion.logged_out', '1');
    } catch(e) {}
    lock('SESSION_EXPIRED');
    message.textContent=confirmed?'تم تسجيل الخروج من البرنامج.':'تم الخروج محليًا؛ تعذر تأكيد إلغاء الجلسة على الخادم، وستنتهي تلقائيًا.';
    if(typeof setWindowMode==='function')setWindowMode('auth');
    if(page==='groups' && typeof renderGroups==='function')renderGroups();
  }
  const originalAccess=renderAccess;
  renderAccess=function(){
    if(!user){originalAccess();return;}
    let aion2Html = '';
    if (user.aion2Profile) {
      const p = user.aion2Profile;
      const getVal = (v) => v ? escapeHTML(String(v)) : 'غير محدد';
      const cpVal = (p.combat_power && Number(p.combat_power) > 0) ? `${Number(p.combat_power).toLocaleString('en-US')} CP` : 'غير متوفر';
      const lastSyncText = p.last_cp_sync_at ? new Intl.DateTimeFormat('ar-SA', { dateStyle:'short', timeStyle:'short' }).format(new Date(p.last_cp_sync_at)) : 'غير متوفر';
      const statusLabel = p.cp_sync_label || (Number(p.combat_power) > 0 ? 'آخر قيمة محفوظة' : 'غير متوفر');
      const statusColor = (p.cp_sync_status === 'SUCCESS' || p.cp_sync_status === 'COOLDOWN') ? '#88c8ac' : (p.cp_sync_status === 'IN_PROGRESS' ? '#00c0f3' : (p.cp_sync_status === 'QUEUED' ? '#d9b46c' : 'var(--muted)'));
      const avatarHtml = (typeof renderCharacterAvatar === 'function')
        ? renderCharacterAvatar(p.profile_image, p.character_name, 'avatar')
        : '';

      aion2Html = `
      <section class="panel" style="margin-top:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          ${avatarHtml}
          <div>
            <h3 style="margin:0" dir="ltr">${getVal(p.character_name)}</h3>
            <span style="font-size:11px;color:var(--muted)">${getVal(p.selected_class)} • ${getVal(p.assigned_guild)}</span>
          </div>
        </div>
        <div class="access-row"><b>اسم الشخصية</b><span dir="ltr">${getVal(p.character_name)}</span></div>
        <div class="access-row"><b>الكلاس</b><span dir="ltr">${getVal(p.selected_class)}</span></div>
        <div class="access-row"><b>القوة القتالية (CP)</b><span dir="ltr" style="color:var(--gold);font-weight:600">${escapeHTML(cpVal)}</span></div>
        <div class="access-row"><b>حالة تحديث CP</b><span><span class="badge" style="color:${statusColor};border-color:${statusColor}40">${escapeHTML(statusLabel)}</span></span></div>
        <div class="access-row"><b>وقت آخر تحديث CP</b><span dir="ltr">${escapeHTML(lastSyncText)}</span></div>
        <div class="access-row"><b>المستوى / Gear Score</b><span dir="ltr">Lvl ${p.character_level || 0} / GS ${p.item_level || '—'}</span></div>
        <div class="access-row"><b>العرق / السيرفر</b><span dir="ltr">${getVal(p.race_name)} - ${getVal(p.server_name)}</span></div>
        <div class="access-row"><b>مسار التسجيل</b><span dir="ltr">${getVal(p.guild_type)}</span></div>
        <div class="access-row"><b>الجيلد المعتمد</b><span dir="ltr">${getVal(p.assigned_guild)}</span></div>
        <div class="access-row"><b>حالة استمارة الجيلد</b><span dir="ltr">${getVal(p.guild_app_status)} ${p.guild_app_target ? '('+escapeHTML(p.guild_app_target)+')' : ''}</span></div>
      </section>`;
    } else {
      aion2Html = `
      <section class="panel" style="margin-top:20px">
        <h3>بيانات AION 2</h3>
        <p class="muted">لا يوجد سجل استمارة AION 2 مرتبط بهذا الحساب.</p>
      </section>`;
    }
    document.querySelector('#main').innerHTML = heading('رتبك وصلاحياتك','رتب حسابك وحالة ارتباطك بخوادم AION 2.') + 
    `<section class="panel"><h3>${escapeHTML(user.displayName)} (Discord)</h3><div class="account-role-list">${user.roles.map(r=>`<span class="account-role" dir="auto">${escapeHTML(r.name)}</span>`).join('')||'<p>لا توجد رتب إضافية.</p>'}</div></section>` + aion2Html;
  };


  let guildData = null;
  let lastGuildFetch = 0;
  async function fetchGuildData(force = false) {
    if (!token) return null;
    const now = Date.now();
    try {
      if (!guildData || force || (now - lastGuildFetch > 30000)) {
        guildData = await request('/api/auth/aion2-guilds');
        lastGuildFetch = now;
        if (guildData && Array.isArray(guildData.members)) {
          window.allCommunityMembers = guildData.members;
          if (typeof registerCharacterIdentity === 'function') {
            for (const m of guildData.members) {
              registerCharacterIdentity(m.discord_id, m.character_name, m.character_avatar || m.profile_image, m.selected_class);
            }
          }
        }
      }
      return guildData;
    } catch (e) {
      console.error('Failed to fetch guild data:', e);
      return null;
    }
  }

  const originalMembers = renderMembers;
  renderMembers = async function() {
    $('#main').innerHTML = heading('أعضاء الجيلد', 'جاري تحميل قائمة الأعضاء...', '<span class="badge">جاري التحميل...</span>') + guildTabs() + '<div class="panel" style="text-align:center;padding:40px">جاري جلب البيانات...</div>';
    
    const data = await fetchGuildData();
    if (!data) {
      $('#main').innerHTML = heading('أعضاء الجيلد', 'حدث خطأ أثناء جلب الأعضاء.', '<span class="badge">خطأ</span>') + guildTabs() + '<div class="panel" style="text-align:center;padding:40px;color:var(--danger)">تعذر الاتصال بالخادم لجلب بيانات الأعضاء.</div>';
      return;
    }

    const assignedGuildFilter = guild === 'Global' ? 'M3RGEEN_GLOBAL' : 'EMPEROR';
    const filteredMembers = data.members.filter(m => m.assigned_guild === assignedGuildFilter);

    if (filteredMembers.length === 0) {
      $('#main').innerHTML = heading('أعضاء الجيلد', 'قائمة أعضاء الجيلد الفعليين المعتمدين.', '<span class="badge">بيانات حقيقية</span>') + guildTabs() + '<div class="panel" style="text-align:center;padding:40px">لا يوجد أعضاء في هذا الجيلد بعد.</div>';
      return;
    }

    const html = heading('أعضاء الجيلد', 'قائمة أعضاء الجيلد الفعليين المعتمدين.', '<span class="badge">بيانات حقيقية</span>') + guildTabs() + `<div class="panel"><div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الكلاس</th><th>الجيلد</th><th>القوة القتالية (CP)</th></tr></thead><tbody>` + 
      filteredMembers.map(m => {
        const cpVal = (m.combat_power && Number(m.combat_power) > 0) ? `${Number(m.combat_power).toLocaleString('en-US')} CP` : 'غير متوفر';
        const cpStyle = (m.combat_power && Number(m.combat_power) > 0) ? 'color:var(--gold);font-weight:600' : 'color:var(--muted);font-style:italic';
        return `<tr><td>${(typeof renderCharacterAvatar === 'function' ? renderCharacterAvatar(m.character_avatar || m.profile_image, m.character_name, 'avatar leaderboard-avatar') : '<span class="avatar">'+escapeHTML((m.character_name||'?')[0])+'</span>')} <b dir="ltr">${escapeHTML(m.character_name || 'مجهول')}</b></td><td dir="ltr">${escapeHTML(m.selected_class || '-')}</td><td dir="ltr">${escapeHTML(m.assigned_guild)}</td><td><span style="${cpStyle}" dir="ltr">${escapeHTML(cpVal)}</span></td></tr>`;
      }).join('') + 
      `</tbody></table></div></div>${notice('قائمة الأعضاء تستند إلى الاستمارات المعتمدة نهائياً فقط مع قياسات القوة القتالية المسجلة.')}`;
      
    $('#main').innerHTML = html;
  };

  const originalStats = renderStats;
  renderStats = async function() {
    $('#main').innerHTML = heading('إحصائيات الجيلد', 'جاري تحميل الإحصائيات...', '<span class="badge">جاري التحميل...</span>') + guildTabs() + '<div class="panel" style="text-align:center;padding:40px">جاري جلب البيانات...</div>';
    
    const data = await fetchGuildData();
    if (!data) {
      $('#main').innerHTML = heading('إحصائيات الجيلد', 'حدث خطأ أثناء جلب الإحصائيات.', '<span class="badge">خطأ</span>') + guildTabs() + '<div class="panel" style="text-align:center;padding:40px;color:var(--danger)">تعذر الاتصال بالخادم لجلب الإحصائيات.</div>';
      return;
    }

    const isGlobal = guild === 'Global';
    const assignedGuildFilter = isGlobal ? 'M3RGEEN_GLOBAL' : 'EMPEROR';
    const stats = data.stats && data.stats[assignedGuildFilter];
    
    if (!stats) {
      $('#main').innerHTML = heading('إحصائيات الجيلد', 'لا توجد إحصائيات متوفرة.', '<span class="badge">بيانات حقيقية</span>') + guildTabs() + '<div class="panel" style="text-align:center;padding:40px">لا توجد إحصائيات لهذا الجيلد.</div>';
      return;
    }

    // Theme configuration: Cyan for M3RGEEN (Global), Gold for EMPEROR (Early Access)
    const themeColor = isGlobal ? '#00c0f3' : '#f59e0b';
    const themeGradient = isGlobal 
      ? 'linear-gradient(135deg, rgba(0, 192, 243, 0.12) 0%, rgba(18, 23, 32, 0.8) 100%)' 
      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(18, 23, 32, 0.8) 100%)';
    const themeBorder = isGlobal ? 'rgba(0, 192, 243, 0.3)' : 'rgba(245, 158, 11, 0.3)';
    const themeBadge = isGlobal ? 'M3RGEEN · GLOBAL (CYAN THEME)' : 'EMPEROR · EARLY ACCESS (GOLD THEME)';

    const classesList = [
      { id: 'Gladiator', ar: 'محارب' },
      { id: 'Templar', ar: 'حارس المعبد' },
      { id: 'Cleric', ar: 'معالج' },
      { id: 'Chanter', ar: 'منشد' },
      { id: 'Ranger', ar: 'رامي السهام' },
      { id: 'Assassin', ar: 'سفاح' },
      { id: 'Sorcerer', ar: 'ساحر' },
      { id: 'Spiritmaster', ar: 'سيد الأرواح' }
    ];

    const total = stats.memberCount || 0;
    const maxCapacity = 250;
    const capacityPct = Math.min(100, ((total / maxCapacity) * 100)).toFixed(1);

    const classStats = classesList.map(item => {
      let count = 0;
      if (stats.classCounts) {
        if (Array.isArray(stats.classCounts)) {
          const match = stats.classCounts.find(x => x.selected_class === item.id);
          count = match ? Number(match.count) : 0;
        } else if (typeof stats.classCounts === 'object') {
          count = Number(stats.classCounts[item.id] || 0);
        }
      }
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      return { ...item, count, pct: Number(pct) };
    });

    // Determine dominant and least popular class safely (handling 0s)
    let dominantClass = null;
    let leastClass = null;
    if (total > 0) {
      const sorted = [...classStats].sort((a, b) => b.count - a.count);
      dominantClass = sorted[0];
      leastClass = sorted[sorted.length - 1];
    }

    const dominantText = dominantClass && dominantClass.count > 0 
      ? `${dominantClass.id} (${dominantClass.ar}) — ${dominantClass.count} لاعب (${dominantClass.pct}%)`
      : 'غير محدد';
    const leastText = leastClass 
      ? `${leastClass.id} (${leastClass.ar}) — ${leastClass.count} لاعب (${leastClass.pct}%)`
      : 'غير محدد';

    const html = heading('إحصائيات الجيلد', 'لوحة التحكم التكتيكية وتوزيع القوة والأعضاء.', `<span class="badge" style="color:${themeColor};border-color:${themeBorder}">${themeBadge}</span>`) +
      guildTabs() +
      `<div class="stats" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
        <div class="stat" style="background:${themeGradient}; border-color:${themeBorder};">
          <div style="flex:1">
            <span style="color:var(--muted);font-size:11px">الأعضاء الفعليين</span>
            <b style="font-size:24px;color:${themeColor}">${total} <small style="font-size:12px;color:var(--muted)">/ ${maxCapacity}</small></b>
            <div class="progress" style="margin:8px 0 0;height:4px;background:#1a212d"><span style="width:${capacityPct}%;background:${themeColor}"></span></div>
          </div>
        </div>
        <div class="stat" style="border-color:${themeBorder};">
          <div>
            <span style="color:var(--muted);font-size:11px">استمارات معلقة (Pending)</span>
            <b style="font-size:24px;color:var(--text)">${stats.pendingCount || 0}</b>
            <small style="display:block;margin-top:4px;color:var(--muted)">بانتظار المراجعة</small>
          </div>
        </div>
        <div class="stat" style="border-color:${themeBorder};">
          <div>
            <span style="color:var(--muted);font-size:11px">الكلاس المتصدر (الأكثر)</span>
            <b style="font-size:14px;color:${themeColor}" dir="ltr">${dominantClass ? dominantClass.id : '—'}</b>
            <small style="display:block;margin-top:4px;color:var(--muted)">${dominantClass ? dominantClass.count + ' لاعب (' + dominantClass.pct + '%)' : 'لا يوجد أعضاء'}</small>
          </div>
        </div>
        <div class="stat" style="border-color:${themeBorder};">
          <div>
            <span style="color:var(--muted);font-size:11px">الكلاس الأقل تواجداً</span>
            <b style="font-size:14px;color:#efb1b5" dir="ltr">${leastClass ? leastClass.id : '—'}</b>
            <small style="display:block;margin-top:4px;color:var(--muted)">${leastClass ? leastClass.count + ' لاعب (' + leastClass.pct + '%)' : 'لا يوجد أعضاء'}</small>
          </div>
        </div>
      </div>

      <div class="panel" style="border-color:${themeBorder}; margin-top:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <h3 style="margin:0;display:flex;align-items:center;gap:10px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${themeColor}"></span>
            توزيع الكلاسات الثمانية (8 Classes Breakdown)
          </h3>
          <span style="font-size:11px;color:var(--muted)">نسبة التمثيل المحسوبة من إجمالي ${total} عضو</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:14px">
          ${classStats.map(c => `
            <div style="background:#0e131b;border:1px solid #1f2735;border-radius:8px;padding:12px 16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div>
                  <b dir="ltr" style="font-size:13px;color:var(--text)">${c.id}</b>
                  <span style="font-size:11px;color:var(--muted);margin-right:6px">(${c.ar})</span>
                </div>
                <div style="text-align:left" dir="ltr">
                  <span style="font-weight:700;color:${c.count > 0 ? themeColor : 'var(--muted)'};font-size:13px">${c.count}</span>
                  <small style="color:var(--muted);font-size:10px;margin-right:4px">(${c.pct}%)</small>
                </div>
              </div>
              <div class="progress" style="margin:4px 0 0;height:6px;background:#161d27">
                <span style="width:${c.pct}%;background:${c.count > 0 ? themeColor : 'transparent'}"></span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel" style="border-color:var(--line);margin-top:20px;padding:18px 24px">
        <h4 style="margin:0 0 10px;color:var(--muted);font-size:12px">تحليل التشكيلة التكتيكية للجيلد</h4>
        <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:12px">
          <div><span style="color:var(--muted)">الكلاس الأكثر طلباً/توفراً:</span> <strong style="color:${themeColor}">${escapeHTML(dominantText)}</strong></div>
          <div><span style="color:var(--muted)">الكلاس الأقل تواجداً:</span> <strong style="color:#efb1b5">${escapeHTML(leastText)}</strong></div>
        </div>
      </div>
      ${notice('الإحصائيات المذكورة هنا تتطابق مع قاعدة البيانات الحية وقنوات الإحصائيات في ديسكورد.')}`;

    $('#main').innerHTML = html;
  };


  let leaderboardData = null;
  async function fetchLeaderboardData() {
    if (!token) return null;
    try {
      if (!leaderboardData) {
        leaderboardData = await request('/api/auth/aion2-leaderboard');
        if (leaderboardData && Array.isArray(leaderboardData.leaderboard) && typeof registerCharacterIdentity === 'function') {
          for (const r of leaderboardData.leaderboard) {
            registerCharacterIdentity(r.discord_id, r.character_name, r.character_avatar, null);
          }
        }
      }
      return leaderboardData;
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
      return null;
    }
  }

  const originalLeaderboard = renderLeaderboard;
  renderLeaderboard = async function() {
    $('#main').innerHTML = heading('لوحة الشرف', 'جاري تحميل لوحة الشرف...', '<span class="badge">جاري التحميل...</span>') + '<div class="panel" style="text-align:center;padding:40px">جاري جلب البيانات...</div>';
    
    const data = await fetchLeaderboardData();
    if (!data) {
      $('#main').innerHTML = heading('لوحة الشرف', 'حدث خطأ أثناء جلب لوحة الشرف.', '<span class="badge">خطأ</span>') + '<div class="panel" style="text-align:center;padding:40px;color:var(--danger)">تعذر الاتصال بالخادم لجلب بيانات الترتيب.</div>';
      return;
    }

    const me = data.me;
    const top5 = data.leaderboard;

    let myRankHtml = '';
    if (me.rank === null) {
      myRankHtml = `<span class="rank-chip">—</span></div>`;
    } else {
      myRankHtml = `<span class="rank-chip">الترتيب #${me.rank}</span></div>`;
    }

    let podiumHtml = '';
    if (top5.length > 0) {
      podiumHtml = top5.slice(0,3).map(r => `<article class="panel podium-card"><span class="podium-rank">#${r.rank}</span>${(typeof renderCharacterAvatar === 'function' ? renderCharacterAvatar(r.character_avatar, r.character_name, 'avatar podium-avatar') : '<span class="avatar">'+escapeHTML(r.character_name[0])+'</span>')}<h3 dir="ltr">${escapeHTML(r.character_name)}</h3><strong>${r.total_points}<small> نقطة</small></strong></article>`).join('');
    }

    let tableHtml = '';
    if (top5.length > 0) {
      tableHtml = `<div class="table-wrap"><table><thead><tr><th>الترتيب</th><th>اللاعب</th><th>النقاط</th><th>المجموعات المكتملة</th><th>أعضاء جيلد مختلفين</th></tr></thead><tbody>` +
      top5.map(r => `<tr><td><span class="rank-chip">#${r.rank}</span></td><td>${(typeof renderCharacterAvatar === 'function' ? renderCharacterAvatar(r.character_avatar, r.character_name, 'avatar leaderboard-avatar') : '<span class="avatar">'+escapeHTML(r.character_name[0])+'</span>')}<b dir="ltr"> ${escapeHTML(r.character_name)}</b></td><td class="points-cell">${r.total_points}</td><td>${r.completed_groups}</td><td>${r.unique_guildmates}</td></tr>`).join('') +
      `</tbody></table></div>`;
    } else {
      tableHtml = `<div style="text-align:center;padding:20px">لا توجد نقاط مسجلة في الدورة الحالية.</div>`;
    }

    const selfCharName = me.character_name || user?.character_name || user?.aion2Profile?.character_name || null;
    const selfCharAvatar = me.character_avatar || user?.character_avatar || user?.aion2Profile?.profile_image || null;
    const selfAvatarHtml = (typeof renderCharacterAvatar === 'function')
      ? renderCharacterAvatar(selfCharAvatar, selfCharName, 'avatar leaderboard-avatar')
      : `<span class="avatar neutral-avatar"><svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;color:#7e8b9f;" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>`;
    const selfNameText = escapeHTML(selfCharName || 'شخصية غير مسجلة');

    $('#main').innerHTML = heading('لوحة الشرف', 'نقاط نشاط الأعضاء في الفعاليات - الدورة الحالية.', '<span class="badge">بيانات حقيقية</span>') +
    `<div class="leaderboard-self">${selfAvatarHtml}<div><b dir="ltr">${selfNameText}</b><p>نقاطك وترتيبك في هذه الدورة</p></div><div class="leaderboard-self-score"><strong>${me.total_points}</strong><small>نقطة مكتسبة</small></div>${myRankHtml}
    <div class="leaderboard-podium">${podiumHtml}</div>
    <div class="panel"><h3>قائمة الأوائل <span class="badge">Top 5</span></h3>${tableHtml}</div>${notice('ترتيب الأعضاء يعكس النظام الجديد فقط.')}`;
  };


  // Phase 4: Block Mutations
      document.addEventListener('click', async e => {
      const b = e.target.closest('[data-action]');
      if(!b) return;
      const a = b.dataset.action;
      
      if (a === 'confirm-join') {
        e.stopPropagation();
        e.preventDefault();
        
        const groupId = b.dataset.id;
        if (!groupId) return;
        
        if (b.disabled) return;
        b.disabled = true;
        const originalText = b.textContent;
        b.textContent = 'جارٍ التحقق من مستوى شخصيتك...';
        
        try {
          const res = await request('/api/auth/aion2-lfg/join', { groupId: Number(groupId) });
          if (res && res.success) {
            if(typeof closeModal === 'function') closeModal();
            if(typeof toast === 'function') toast('تم التحقق والانضمام بنجاح.');
            if(typeof pollLFG === 'function') pollLFG();
          } else {
            const errorMsg = res?.error || res?.message || 'فشل الانضمام';
            if(typeof toast === 'function') toast(errorMsg.startsWith('❌') ? errorMsg : '❌ ' + errorMsg);
            b.disabled = false;
            b.textContent = originalText;
          }
        } catch(err) {
          if(typeof toast === 'function') toast('❌ ' + (err.message || 'خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.'));
          b.disabled = false;
          b.textContent = originalText;
        }
      } else if (a === 'confirm-leave') {
        e.stopPropagation();
        e.preventDefault();
        
        const groupId = b.dataset.id;
        if (!groupId) return;
        
        if (b.disabled) return;
        b.disabled = true;
        const originalText = b.textContent;
        b.textContent = 'جاري المغادرة...';
        
        try {
          const res = await request('/api/auth/aion2-lfg/leave', { groupId: Number(groupId) });
          if (res && res.success) {
            if(typeof closeModal === 'function') closeModal();
            if(typeof toast === 'function') toast('غادرت المجموعة.');
            if(typeof pollLFG === 'function') pollLFG();
          } else {
            if(typeof toast === 'function') toast('خطأ: ' + (res.error || 'فشل المغادرة'));
            b.disabled = false;
            b.textContent = originalText;
          }
        } catch(err) {
          if(typeof toast === 'function') toast(err.message || 'خطأ في الاتصال بالخادم.');
          b.disabled = false;
          b.textContent = originalText;
        }
      } else if (a === 'confirm-close') {
        e.stopPropagation();
        e.preventDefault();
        
        const groupId = b.dataset.id;
        if (!groupId) return;
        
        const reasonInput = document.getElementById('close-reason')?.value;
        const otherInput = document.getElementById('close-other')?.value.trim();
        
        if (!reasonInput) {
          if(typeof toast === 'function') toast('الرجاء اختيار سبب الإلغاء.');
          return;
        }

        let reasonEnum = '';
        if (reasonInput === 'CHANGE_OF_PLAN' || reasonInput === 'تغيير الخطة') reasonEnum = 'CHANGE_OF_PLAN';
        else if (reasonInput === 'GROUP_NOT_FILLED' || reasonInput === 'لم يكتمل الفريق') reasonEnum = 'GROUP_NOT_FILLED';
        else if (reasonInput === 'EMERGENCY' || reasonInput === 'ظرف طارئ') reasonEnum = 'EMERGENCY';
        else if (reasonInput === 'OTHER' || reasonInput === 'سبب آخر') reasonEnum = 'OTHER';

        if (reasonEnum === 'OTHER' && !otherInput) {
          if(typeof toast === 'function') toast('الرجاء كتابة السبب.');
          return;
        }
        
        if (b.disabled) return;
        b.disabled = true;
        const originalText = b.textContent;
        b.textContent = 'جاري الإغلاق...';
        
        try {
          const res = await request('/api/auth/aion2-lfg/close', { 
            groupId: Number(groupId), 
            reasonEnum, 
            customReason: otherInput 
          });
          if (res && res.success) {
            if(typeof closeModal === 'function') closeModal();
            if(typeof toast === 'function') toast('تم إلغاء المجموعة.');
            if(typeof pollLFG === 'function') pollLFG();
          } else {
            if(typeof toast === 'function') toast('خطأ: ' + (res.error || 'فشل الإلغاء'));
            b.disabled = false;
            b.textContent = originalText;
          }
        } catch(err) {
          if(typeof toast === 'function') toast(err.message || 'خطأ في الاتصال بالخادم.');
          b.disabled = false;
          b.textContent = originalText;
        }
      } else if (['vote-start', 'vote-fallback-req', 'vote-fallback-conf', 'vote-submit-yes', 'vote-submit-no'].includes(a)) {
        e.stopPropagation();
        e.preventDefault();
        
        const groupId = b.dataset.id;
        if (!groupId) return;
        
        if (b.disabled) return;
        b.disabled = true;
        const originalText = b.textContent;
        b.textContent = 'جاري الإرسال...';
        
        let action = '';
        if (a === 'vote-start') action = 'START_VOTE';
        else if (a === 'vote-fallback-req') action = 'FALLBACK_REQ';
        else if (a === 'vote-fallback-conf') action = 'FALLBACK_CONF';
        else if (a === 'vote-submit-yes') action = 'SUBMIT_YES';
        else if (a === 'vote-submit-no') action = 'SUBMIT_NO';

        try {
          const res = await request('/api/auth/aion2-lfg/vote', { groupId: Number(groupId), action });
          if (res && res.success) {
            if(typeof toast === 'function') toast('تمت العملية بنجاح.');
            if(typeof pollLFG === 'function') pollLFG();
          } else {
            if(typeof toast === 'function') toast('خطأ: ' + (res.error || 'فشلت العملية'));
            b.disabled = false;
            b.textContent = originalText;
          }
        } catch(err) {
          if(typeof toast === 'function') toast(err.message || 'خطأ في الاتصال بالخادم.');
          b.disabled = false;
          b.textContent = originalText;
        }
      } else if (a === 'start-voice-room') {
        e.stopPropagation();
        e.preventDefault();
        const groupId = b.dataset.id;
        if (!groupId || b.disabled) return;
        b.disabled = true;
        const origText = b.textContent;
        b.textContent = 'جاري تفعيل الروم الصوتي...';
        try {
          const res = await request('/api/auth/aion2-lfg/start-voice', { groupId: Number(groupId) });
          if (res && res.success) {
            if (typeof toast === 'function') toast('🔊 تم تفعيل الروم الصوتي بنجاح! بدأ الدنجن الآن.');
            if (typeof playChime === 'function') playChime();
            if (typeof flashCompactWidget === 'function') flashCompactWidget();
            if (res.voice_url && typeof window.openExternalLink === 'function') {
              window.openExternalLink(res.voice_url);
            }
            if (typeof pollLFG === 'function') pollLFG();
            if (typeof closeModal === 'function') closeModal();
          } else {
            const errStr = res?.error || 'فشل تشغيل الروم الصوتي';
            if (typeof toast === 'function') toast('❌ ' + errStr);
            b.disabled = false;
            b.textContent = origText;
          }
        } catch(err) {
          if (typeof toast === 'function') toast('❌ ' + (err.message || 'خطأ في الاتصال بالخادم.'));
          b.disabled = false;
          b.textContent = origText;
        }
      } else if (a === 'open-voice-channel') {
        e.stopPropagation();
        e.preventDefault();
        const url = b.dataset.url;
        if (url) {
          if (typeof window.openExternalLink === 'function') {
            window.openExternalLink(url);
          } else {
            window.open(url, '_blank');
          }
        }
      }
    }, true);

  // Read-only Polling & Synchronization
  let lfgPollInterval = null;
  let isLfgPolling = false;
  let lastGroupsJson = '';
  let knownGroupIds = null;
  let knownVoiceActiveGroups = new Set();
  let lfgPollSeq = 0;
  let isLfgConnected = true;

  function updateLfgConnectionBadge(connected) {
    let badge = document.querySelector('#lfg-connection-badge');
    if (!connected) {
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'lfg-connection-badge';
        badge.style.cssText = 'background:rgba(239,68,68,0.9);color:#fff;text-align:center;padding:6px 12px;font-size:12px;font-weight:bold;position:fixed;top:0;left:0;right:0;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
        badge.textContent = '⚠️ انقطع الاتصال بالخادم — البيانات المعروضة مؤقتة وليست مباشرة. جارٍ إعادة الاتصال...';
        document.body.appendChild(badge);
      }
    } else {
      if (badge) {
        badge.remove();
      }
    }
  }

  async function pollLFG() {
    if (!token || isLfgPolling) return;
    isLfgPolling = true;
    const currentSeq = ++lfgPollSeq;

    try {
      const data = await request('/api/auth/aion2-lfg');
      
      // Ignore stale out-of-order responses
      if (currentSeq !== lfgPollSeq) return;

      if (!isLfgConnected) {
        isLfgConnected = true;
        updateLfgConnectionBadge(true);
      }

      if (data && data.success) {
        if (Array.isArray(data.groups) && typeof registerCharacterIdentity === 'function') {
          for (const g of data.groups) {
            if (g.creator_id || g.creator) {
              registerCharacterIdentity(g.creator_id, g.creator, g.creator_avatar, null);
            }
            if (Array.isArray(g.members_details)) {
              for (const d of g.members_details) {
                registerCharacterIdentity(d.discord_id, d.character_name, d.character_avatar, d.player_class);
              }
            }
          }
        }
        // Check for newly created groups to notify the user
        const currentGroups = Array.isArray(data.groups) ? data.groups : [];
        if (knownGroupIds === null) {
          knownGroupIds = new Set(currentGroups.map(g => g.id));
        } else {
          const newGroups = currentGroups.filter(g => !knownGroupIds.has(g.id) && g.status === 'open');
          for (const ng of newGroups) {
            knownGroupIds.add(ng.id);
            const isMe = (ng.creator_id && user && String(ng.creator_id) === String(user.id)) ||
                         (ng.creator && window.viewer && ng.creator === window.viewer);
            if (!isMe) {
              if (typeof playChime === 'function') playChime();
              if (typeof flashCompactWidget === 'function') flashCompactWidget();
              const actName = (typeof getActivityDisplayName === 'function') ? getActivityDisplayName(ng.type) : (ng.type || 'نشاط');
              if (typeof toast === 'function') {
                toast(`⚔️ مجموعة جديدة: ${escapeHTML(ng.creator || 'عضو')} بدأ فريق لـ ${escapeHTML(ng.name || actName)}!`);
              }
            }
          }
          knownGroupIds = new Set(currentGroups.map(g => g.id));
        }

        // Check for groups transitioning to voice active to alert members
        for (const g of currentGroups) {
          const isMyGroup = Boolean(
            (g.creator_id && user && String(g.creator_id) === String(user.id)) ||
            (Array.isArray(g.members_details) && user && g.members_details.some(m => String(m.discord_id) === String(user.id))) ||
            (window.viewer && g.members && g.members.includes(window.viewer))
          );
          if (isMyGroup && (g.voice_active || ['VOICE_ENTRY', 'ACTIVE'].includes(g.state)) && g.voice_channel_id) {
            if (!knownVoiceActiveGroups.has(g.id)) {
              knownVoiceActiveGroups.add(g.id);
              if (typeof playChime === 'function') playChime();
              if (typeof flashCompactWidget === 'function') flashCompactWidget();
              const actName = (typeof getActivityDisplayName === 'function') ? getActivityDisplayName(g.type) : (g.type || 'الدنجن');
              if (typeof toast === 'function') {
                toast(`🔊 بدأ الدنجن الآن (${escapeHTML(g.name || actName)})! أرجو الانتقال إلى الروم الصوتي لبدء الدنجن.`);
              }
              const modalEl = document.querySelector('#modal');
              if (modalEl && modalEl.classList.contains('active') && typeof showDetails === 'function') {
                showDetails(g.id);
              }
            }
          }
        }

        // preserve the global `groups` variable
        const newJson = JSON.stringify(data.groups);
        if (newJson !== lastGroupsJson) {
          lastGroupsJson = newJson;
          
          window.groups.length = 0;
          window.groups.push(...data.groups);
          
          if (typeof page !== 'undefined' && page === 'groups' && typeof renderGroups === 'function') {
            renderGroups();
          }
        }
      }
    } catch (e) {
      console.error('LFG Polling failed:', e);
      if (isLfgConnected) {
        isLfgConnected = false;
        updateLfgConnectionBadge(false);
      }
    } finally {
      isLfgPolling = false;
    }
  }

  function startLFGPolling() {
    if (lfgPollInterval) {
      clearInterval(lfgPollInterval);
      lfgPollInterval = null;
    }
    pollLFG(); // immediate first fetch
    lfgPollInterval = setInterval(pollLFG, 5000);
  }

  // Override original renderCards to show real Item Level from GS
  const originalRenderCards = renderCards;
  renderCards = function() {
    // Before rendering, patch the `card` function to show item level requirement if it exists
    if (typeof card !== 'undefined' && !card.patchedForReal) {
      const oldCard = card;
      window.card = function(g) {
        let html = oldCard(g);
        
        if (g.gs > 0) {
          html = html.replace('Gear Score: ' + g.gs, 'Item Level: ' + g.gs + ' | ' + escapeHTML(g.mode));
        } else {
          html = html.replace(/<span dir="ltr">Gear Score: .*?<\/span> &bull; /, '<span dir="ltr">' + escapeHTML(g.mode) + '</span> &bull; ');
        }

        // Voting UI Injection
        if (g.status === 'awaiting_vote') {
          html = html.replace('● البحث عن لاعبين', 'التصويت للإنهاء');
          html = html.replace('بانتظار لاعب بديل', 'التصويت للإنهاء');
          html = html.replace('بانتظار بدء الصوت', 'التصويت للإنهاء');
          html = html.replace('مغلقة', 'التصويت للإنهاء'); // Just in case
          
          let voteUI = `<div class="voting-panel" style="background:#141a24;border:1px solid #3a4350;border-radius:8px;padding:12px;margin:12px 0;">
            <h4 style="margin:0 0 8px 0;font-size:13px;display:flex;justify-content:space-between;">
              <span style="color:#edf0f6;font-weight:600">تصويت الإنهاء واحتساب النقاط</span>
              <span dir="ltr" data-countdown="${g.vote_deadline}" style="color:#ef4444;font-weight:bold">${timer(g.vote_deadline)}</span>
            </h4>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
              <span style="color:#10b981;font-weight:600">موافق (${g.yes_count})</span>
              <span style="color:#ef4444;font-weight:600">رفض (${g.no_count})</span>
              <span style="color:var(--muted)">المطلوب (${g.required_yes})</span>
            </div>
            ${g.can_vote ? `<div style="display:flex;gap:8px;">
              <button class="primary btn-vote-success" style="flex:1;background:#059669;color:#ffffff;border-color:#10b981;font-weight:bold" data-action="vote-submit-yes" data-id="${g.id}">موافق</button>
              <button class="danger" style="flex:1;font-weight:bold" data-action="vote-submit-no" data-id="${g.id}">رفض</button>
            </div>` : `<div style="text-align:center;font-size:12px;color:var(--muted);padding:4px;background:var(--bg);border-radius:4px;">${g.has_voted ? 'تم تسجيل تصويتك' : 'لا تملك صلاحية التصويت'}</div>`}
          </div>`;
          
          html = html.replace('<div class="roles-note">', voteUI + '<div class="roles-note">');
        } else {
          let buttonsUI = '';
          if (g.can_start_vote) {
            buttonsUI += `<button class="primary btn-vote-success" style="flex:1;background:#059669;color:#ffffff;border-color:#10b981;font-weight:bold" data-action="vote-start" data-id="${g.id}">بدء التصويت</button>`;
          }
          if (g.can_request_fallback) {
            buttonsUI += `<button class="primary btn-vote-warning" style="flex:1;background:#d97706;color:#ffffff;border-color:#f59e0b;font-weight:bold" data-action="vote-fallback-req" data-id="${g.id}">طلب تصويت الطوارئ</button>`;
          }
          if (g.can_confirm_fallback) {
            buttonsUI += `<button class="primary btn-vote-success" style="flex:1;background:#059669;color:#ffffff;border-color:#10b981;font-weight:bold" data-action="vote-fallback-conf" data-id="${g.id}">تأكيد طلب الطوارئ</button>`;
          }

          if (buttonsUI) {
            let container = `<div class="voting-actions" style="display:flex;gap:8px;margin:12px 0;">${buttonsUI}</div>`;
            html = html.replace('<div class="roles-note">', container + '<div class="roles-note">');
          }
        }

        return html;
      };
      window.card.patchedForReal = true;
    }
    originalRenderCards();
  };

  // Phase 9: Real Notifications & Broadcasts Polling
  let notifPollInterval = null;
  let broadcastPollInterval = null;
  let isNotifPolling = false;
  window.realNotifications = [];
  window.realBroadcasts = [];
  window.activeBroadcast = null;
  
  window.openExternalLink = function(url) {
    if (!url) return;
    if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  window.getBroadcastTypeBadge = function(type) {
    if (type === 'news') return '📰 خبر عاجل';
    if (type === 'warning') return '⚠️ تحذير مهم';
    if (type === 'update') return '🚀 تحديث جديد';
    return '🔔 تنبيه مهم';
  };

  function getReadNotifs() {
    try { return new Set(JSON.parse(localStorage.getItem('m3rgeen.aion2.read-notifs') || '[]')); }
    catch { return new Set(); }
  }
  function saveReadNotifs(set) {
    try { localStorage.setItem('m3rgeen.aion2.read-notifs', JSON.stringify([...set])); } catch {}
  }

  function getReadBroadcasts() {
    try { return new Set(JSON.parse(localStorage.getItem('m3rgeen.aion2.read-broadcasts') || '[]')); }
    catch { return new Set(); }
  }
  function saveReadBroadcasts(set) {
    try { localStorage.setItem('m3rgeen.aion2.read-broadcasts', JSON.stringify([...set])); } catch {}
  }

  const alertedBroadcasts = new Set();
  function handleIncomingBroadcasts(broadcastList) {
    if (!Array.isArray(broadcastList)) return;
    window.realBroadcasts = broadcastList;

    const now = Date.now();
    const active = broadcastList.find(b => new Date(b.active_until).getTime() > now) || null;
    window.activeBroadcast = active;

    if (active) {
      const readSet = getReadBroadcasts();
      if (!alertedBroadcasts.has(active.id) && !readSet.has(active.id)) {
        alertedBroadcasts.add(active.id);
        if (typeof playChime === 'function') playChime();
        if (typeof flashCompactWidget === 'function') flashCompactWidget();
        if (typeof toast === 'function') {
          toast(`${window.getBroadcastTypeBadge(active.type)}: ${active.title}`);
        }
      }
    }

    if (typeof updateNotificationCount === 'function') {
      updateNotificationCount();
    }
    if (typeof updateEventTimers === 'function') {
      updateEventTimers();
    }
  }

  async function pollPublicBroadcasts() {
    try {
      const res = await fetch(api + '/api/auth/aion2-broadcasts', { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.broadcasts) {
          handleIncomingBroadcasts(data.broadcasts);
        }
      }
    } catch (e) {}
  }

  async function pollNotifs() {
    if (!token || isNotifPolling) return;
    isNotifPolling = true;
    try {
      const data = await request('/api/auth/aion2-notifications');
      if (data && data.success) {
        window.realNotifications = data.notifications || [];
        if (data.broadcasts) {
          handleIncomingBroadcasts(data.broadcasts);
        }
        if (typeof updateNotificationCount === 'function') {
          updateNotificationCount();
        }
      }
    } catch (e) {
      console.error('Notif Polling failed:', e);
    } finally {
      isNotifPolling = false;
    }
  }

  function startNotifPolling() {
    if (notifPollInterval) clearInterval(notifPollInterval);
    pollNotifs(); // immediate first fetch
    notifPollInterval = setInterval(pollNotifs, 10000);
  }

  // Start standalone broadcast polling (runs even without login)
  if (!broadcastPollInterval) {
    pollPublicBroadcasts();
    broadcastPollInterval = setInterval(pollPublicBroadcasts, 15000);
  }

  // Override global notification UI functions
  window.updateNotificationCount = function() {
    const readSet = getReadNotifs();
    const readBSet = getReadBroadcasts();
    const unreadNotifs = window.realNotifications.filter(n => !readSet.has(n.notification_id)).length;
    const unreadBroadcasts = (window.realBroadcasts || []).filter(b => !readBSet.has(b.id)).length;
    const unreadCount = unreadNotifs + unreadBroadcasts;
    const badge = document.querySelector('#notification-count');
    if (badge) {
      badge.textContent = unreadCount;
      badge.hidden = unreadCount === 0;
    }
    const bell = document.querySelector('#bell');
    if (bell) {
      bell.setAttribute('aria-label', `إشعارات Aion 2 المهمة${unreadCount ? '، '+unreadCount+' إشعار غير مقروء' : ''}`);
      bell.onclick = () => {
        if (typeof setWindowMode === 'function' && typeof windowMode !== 'undefined' && windowMode !== 'full') {
          setWindowMode('full');
        }
        if (typeof window.showNotifications === 'function') {
          window.showNotifications();
        }
      };
    }
  };

  function getNotifMapping(n) {
    let title = 'إشعار النظام';
    let content = 'لديك إشعار جديد.';
    
    if (n.notification_type === 'FIRST_FULL') {
      title = 'اكتمل فريقك!';
      content = 'تم اكتمال العدد المطلوب للمجموعة. حان وقت بدء المغامرة والانتقال للقناة الصوتية.';
    } else if (n.notification_type === 'VOICE_START_EXPIRED_CREATOR') {
      title = 'انتهت مهلة بدء الصوت';
      content = 'انتهت مهلة انضمام الأعضاء للقناة الصوتية. يرجى اتخاذ الإجراء المناسب لمجموعتك.';
    } else if (n.notification_type === 'VOTE_DM') {
      title = 'تصويت الإنهاء متاح';
      content = 'بناءً على نشاط مجموعتك، تم إتاحة التصويت للإنهاء. يرجى الدخول وتسجيل تصويتك.';
    }
    return { title, content };
  }

  window.showNotifications = function() {
    const readSet = getReadNotifs();
    const readBSet = getReadBroadcasts();

    // Broadcasts HTML
    const broadcastsHtml = (window.realBroadcasts || []).map(b => {
      const isRead = readBSet.has(b.id);
      const badge = window.getBroadcastTypeBadge(b.type);
      const timeStr = new Intl.DateTimeFormat('ar-SA', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(b.created_at));
      return `<button class="notification-item ${isRead ? '' : 'unread'}" data-action="read-broadcast" data-id="${b.id}" style="border-right:3px solid var(--gold);background:rgba(212,175,55,0.06);">
        <img src="assets/gorilla.png" style="width:28px;height:28px;border-radius:6px;object-fit:contain;background:#131822;padding:2px;margin-left:8px;" alt="M3RGEEN">
        <span class="notification-dot" aria-label="${isRead ? 'مقروء' : 'تنبيه إداري غير مقروء'}"></span>
        <span><b style="color:var(--gold);">${escapeHTML(badge)}: ${escapeHTML(b.title)}</b><small>إعلان إداري موجه • ${timeStr}</small><p style="color:var(--text);">${escapeHTML(b.message.length > 90 ? b.message.substring(0, 90) + '...' : b.message)}</p></span>
        <span class="notification-arrow">›</span>
      </button>`;
    }).join('');

    // Regular LFG / System Notifications HTML
    const listHtml = window.realNotifications.map(n => {
      const isRead = readSet.has(n.notification_id);
      const mapping = getNotifMapping(n);
      const timeStr = new Intl.DateTimeFormat('ar-SA', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(n.created_at));
      
      return `<button class="notification-item ${isRead ? '' : 'unread'}" data-action="read-notification" data-id="${n.notification_id}">
        <span class="notification-dot" aria-label="${isRead ? 'مقروء' : 'إشعار غير مقروء'}"></span>
        <span><b>${escapeHTML(mapping.title)}</b><small>الإشعارات الرسمية • ${timeStr}</small><p>${escapeHTML(mapping.content)}</p></span>
        <span class="notification-arrow">›</span>
      </button>`;
    }).join('');

    const emptyHtml = '<div style="text-align:center;padding:40px;color:var(--muted)">لا توجد إشعارات حتى الآن.</div>';
    const totalCount = (window.realBroadcasts || []).length + window.realNotifications.length;

    modal('إشعارات وتنبيهات Aion 2', 
      `<p class="muted notification-channel">التنبيهات الإدارية وإشعارات النظام المباشرة لحسابك</p>
       <div class="notification-list">${totalCount ? (broadcastsHtml + listHtml) : emptyHtml}</div>`, 
      '<button data-action="dismiss">إغلاق</button>'
    );
  };

  window.readBroadcast = function(id) {
    const bId = Number(id);
    const b = (window.realBroadcasts || []).find(x => x.id === bId);
    if (!b) return;

    const readBSet = getReadBroadcasts();
    readBSet.add(bId);
    saveReadBroadcasts(readBSet);
    updateNotificationCount();

    const typeBadge = window.getBroadcastTypeBadge(b.type);
    const timeStr = new Intl.DateTimeFormat('ar-SA', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(b.created_at));

    modal(`📢 ${escapeHTML(b.title)}`,
      `<div class="notification-detail-meta" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
         <img src="assets/gorilla.png" style="width:24px;height:24px;object-fit:contain;" alt="">
         <span class="badge" style="background:rgba(212,175,55,0.2);color:var(--gold);">${typeBadge}</span>
         <small class="muted">${timeStr} • نشر في ${escapeHTML(b.channel_name ? '#' + b.channel_name : 'الديسكورد')}</small>
       </div>
       <div style="background:#0e131d;border:1px solid #1f2838;border-radius:10px;padding:16px;margin:16px 0;line-height:1.7;white-space:pre-wrap;font-size:14px;color:var(--text);">${escapeHTML(b.message)}</div>
       ${b.link ? `<div style="text-align:center;margin-top:16px;"><button class="primary" data-action="open-broadcast-link" data-link="${escapeHTML(b.link)}" style="display:inline-flex;align-items:center;gap:8px;font-size:13px;padding:9px 20px;">🔗 فتح مكان الخبر في ديسكورد</button></div>` : ''}`,
      `<button data-action="notification-list">رجوع للإشعارات</button><button data-action="dismiss">إغلاق</button>`
    );
  };

  window.readNotification = function(id) {
    const notifId = Number(id);
    const n = window.realNotifications.find(x => x.notification_id === notifId);
    if (!n) return;
    
    // Mark read locally
    const readSet = getReadNotifs();
    readSet.add(notifId);
    saveReadNotifs(readSet);
    updateNotificationCount();

    const mapping = getNotifMapping(n);
    const timeStr = new Intl.DateTimeFormat('ar-SA', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(n.created_at));

    modal(mapping.title, 
      `<div class="notification-detail-meta"><span class="badge">الإشعارات الرسمية</span><small class="muted">${timeStr}</small></div>
       <p class="notification-body">${escapeHTML(mapping.content)}</p>
       ${n.group_id ? `<p class="muted" style="margin-top:16px;">مجموعة رقم: ${n.group_id}</p>` : ''}`, 
      `<button data-action="notification-list">رجوع للإشعارات</button><button data-action="dismiss">إغلاق</button>`
    );
  };

  button.onclick=async()=>{
    try {
      localStorage.removeItem('m3rgeen.aion.logged_out');
      sessionStorage.removeItem('m3rgeen.aion.logged_out');
    } catch(e) {}
    if(busy)return;const popup=window.open('about:blank','m3rgeen-discord-login','width=520,height=760');if(!popup){message.textContent='اسمح بفتح نافذة تسجيل Discord ثم أعد المحاولة.';return;}popup.opener=null;busy=true;button.disabled=true;document.querySelector('#auth-invite').hidden=true;
    try{const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));const challenge=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');const login=await request('/api/auth/login',{challenge});if(new URL(login.authorizeUrl).origin!=='https://discord.com')throw new Error('SERVICE_UNAVAILABLE');popup.location.href=login.authorizeUrl;message.textContent='أكمل تسجيل الدخول في نافذة Discord. ننتظر التحقق من عضويتك…';const until=Date.now()+300000;let completed=false;
      while(Date.now()<until){
        await new Promise(resolve=>setTimeout(resolve,2000));
        const result=await request('/api/auth/exchange',{attempt:login.attempt,verifier});
        if(result.pending)continue;
        setStoredToken(result.token);
        account(result.user);
        startLFGPolling();
        startNotifPolling();
        if(typeof startChatPolling==='function')startChatPolling();
        completed=true;
        try{popup.close();}catch(e){}
        if(window.electronAPI&&window.electronAPI.authSuccess){window.electronAPI.authSuccess();}
        if(typeof setWindowMode==='function')setWindowMode('full');
        break;
      }
      if(!completed)throw new Error('INVALID_OR_EXPIRED_ATTEMPT');
    }catch(e){
      try{popup.close();}catch(err){}
      if(window.electronAPI&&window.electronAPI.authFailed){window.electronAPI.authFailed();}
      lock(e.reason||e.message, e.detailMessage);
    }finally{busy=false;button.disabled=false;}
  };

  async function refresh(){
    if(!token)return;
    try{
      const res = await request('/api/auth/me');
      if (res && res.user) account(res.user);
    }catch(e){
      // Only lock/clear if explicitly unauthorized or expired; keep session alive through offline/network bumps
      if (e.status === 401 || e.status === 403 || e.reason === 'NOT_A_GUILD_MEMBER' || e.reason === 'SESSION_EXPIRED') {
        lock(e.reason||e.message, e.detailMessage);
        if(notifPollInterval)clearInterval(notifPollInterval);
        if(typeof chatPollInterval!=='undefined'&&chatPollInterval)clearInterval(chatPollInterval);
      } else {
        console.warn('[Auth] Session check failed temporarily (network issue), preserving session:', e.message);
      }
    }
  }

  async function initAuth(){
    if(window.location.search.includes('demo=overlay')){
      document.body.classList.remove('auth-locked');
      const authScreen = document.querySelector('#auth-screen');
      if(authScreen) authScreen.hidden = true;
      if(typeof setWindowMode==='function') setWindowMode('banner');
      return;
    }

    if (!token && window.electronAPI && typeof window.electronAPI.getAuthSession === 'function') {
      try {
        const diskToken = await window.electronAPI.getAuthSession();
        const isLoggedOut = localStorage.getItem('m3rgeen.aion.logged_out') === '1';
        if (diskToken && !isLoggedOut) {
          setStoredToken(diskToken);
        }
      } catch(e) {}
    }

    if(token){
      refresh();
      startLFGPolling();
      startNotifPolling();
      if(typeof startChatPolling==='function')startChatPolling();
      if(typeof setWindowMode==='function')setWindowMode('full');
    }else{
      if(typeof setWindowMode==='function')setWindowMode('auth');
    }
  }

  initAuth();
  setInterval(refresh,300000);

  // Phase 5: Real Create Group
  window.confirmCreate = async function() {
    const currentWizard = (typeof window !== 'undefined' && window.wizard) ? window.wizard : wizard;
    if (currentWizard.type === 'Rifts') return;
    
    const btn = document.querySelector('[data-action="confirm-create"]');
    if (btn) {
      if (btn.disabled) return; // Prevent double click
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'جارٍ التحقق من مستوى شخصيتك وإنشاء المجموعة...';
    }

    try {
      const typeMap = {
        'Dungeons': 'DUNGEON',
        'DUNGEON': 'DUNGEON',
        'Transcendence': 'TRANSCENDENCE',
        'TRANSCENDENCE': 'TRANSCENDENCE',
        'Sanctuary': 'SANCTUARY',
        'SANCTUARY': 'SANCTUARY',
        'Abyss': 'ABYSS',
        'ABYSS': 'ABYSS'
      };
      const targetType = typeMap[currentWizard.type] || currentWizard.type;
      const targetName = (currentWizard.name || '').replace(/\s+/g, '_');
      let targetMode = 'NORMAL';
      if (targetType === 'DUNGEON') {
        targetMode = currentWizard.mode || 'EXPLORATION';
      } else if (targetType === 'TRANSCENDENCE') {
        targetMode = currentWizard.mode || 'STAGE_1';
      }
      const res = await request('/api/auth/aion2-lfg/create', {
        type: targetType,
        name: targetName,
        mode: targetMode
      });

      if (res && res.success) {
        closeModal();
        if (res.status === 'CREATED_PENDING_PUBLICATION') {
           if(typeof toast === 'function') toast('⚠️ تم حفظ المجموعة، وجارٍ استكمال نشر الإعلان في ديسكورد...');
        } else if (res.status === 'CREATED_AND_PUBLISHED') {
           if(typeof toast === 'function') toast('تم إنشاء المجموعة ونشر الإعلان بنجاح!');
        } else {
           if(typeof toast === 'function') toast('تم حفظ المجموعة بنجاح!');
        }
        pollLFG(); // force immediate refresh
      } else {
        if(typeof toast === 'function') toast('خطأ: ' + (res.error || 'فشل إنشاء المجموعة'));
      }
    } catch (e) {
      if(typeof toast === 'function') toast(e.message || 'خطأ في الاتصال بالخادم.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || 'تأكيد إنشاء المجموعة';
      }
    }
  };
  // Phase 10: Real Chat Integration
  window.realChatMessages = [];
  let chatPollInterval = null;
  let isChatPolling = false;
  let isSendingChat = false;

  async function pollChat() {
    if (isChatPolling) return;
    isChatPolling = true;
    try {
      const data = await request('/api/auth/aion2-chat');
      if (data && data.success) {
        window.realChatMessages = data.messages || [];
        if (page === 'chat' && typeof window.renderRealChat === 'function') {
           window.renderRealChat();
        }
      }
    } catch (e) {
      console.error('Chat Polling failed:', e);
    } finally {
      isChatPolling = false;
    }
  }

  window.startChatPolling = function() {
    if (chatPollInterval) clearInterval(chatPollInterval);
    pollChat();
    chatPollInterval = setInterval(pollChat, 5000);
  };

  function getMentionCandidates(query = '') {
    const map = new Map();
    // 1. From guild members
    if (Array.isArray(window.allCommunityMembers)) {
      for (const m of window.allCommunityMembers) {
        const name = m.character_name || m.displayName || m.username;
        if (!name) continue;
        map.set(name.toLowerCase(), {
          name,
          avatar: m.character_avatar || m.profile_image || null,
          badge: m.selected_class || (m.assigned_guild === 'M3RGEEN_GLOBAL' ? 'Global' : 'Emperor') || 'عضو'
        });
      }
    }
    // 2. From recent chat authors
    if (Array.isArray(window.realChatMessages)) {
      for (const msg of window.realChatMessages) {
        const name = msg.author_display_name;
        if (!name) continue;
        if (!map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), {
            name,
            avatar: msg.author_avatar || null,
            badge: 'شات'
          });
        }
      }
    }
    const q = (query || '').trim().toLowerCase();
    const list = [...map.values()];
    if (!q) return list.slice(0, 8);
    return list.filter(item => item.name.toLowerCase().includes(q)).slice(0, 8);
  }

  window.renderMentionCandidates = function(query = '') {
    const picker = document.getElementById('chat-mention-picker');
    if (!picker) return;
    const candidates = getMentionCandidates(query);
    if (candidates.length === 0) {
      picker.innerHTML = '<div style="padding:10px;text-align:center;font-size:11px;color:var(--muted)">لا يوجد أعضاء مطابقين</div>';
      return;
    }
    picker.innerHTML = '<div class="chat-mention-header"><span>منشن عضو (@)</span><small>' + candidates.length + ' أعضاء</small></div>' +
      candidates.map((c) => {
        const avatarHtml = c.avatar
          ? '<img src="' + escapeHTML(c.avatar) + '" class="chat-mention-avatar" alt="" onerror="this.src=\'assets/avatar-demo.svg\'">'
          : '<div class="chat-mention-avatar-placeholder">' + escapeHTML(c.name.charAt(0).toUpperCase()) + '</div>';
        return '<button type="button" class="chat-mention-item" data-mention-name="' + escapeHTML(c.name) + '">' +
          avatarHtml +
          '<div class="chat-mention-info">' +
            '<span class="chat-mention-name">@' + escapeHTML(c.name) + '</span>' +
            '<span class="chat-mention-badge">' + escapeHTML(c.badge) + '</span>' +
          '</div>' +
        '</button>';
      }).join('');

    picker.querySelectorAll('.chat-mention-item').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const name = btn.dataset.mentionName;
        if (name && typeof window.insertChatMention === 'function') {
          window.insertChatMention(name);
        }
      };
    });
  };

  window.setupChatMentionInput = function() {
    const input = document.getElementById('chat-input');
    const picker = document.getElementById('chat-mention-picker');
    if (!input || !picker) return;

    input.oninput = () => {
      const cursor = input.selectionStart || input.value.length;
      const textBefore = input.value.slice(0, cursor);
      const match = textBefore.match(/@([\w\u0600-\u06FF.-]*)$/);
      if (match) {
        window.renderMentionCandidates(match[1]);
        picker.hidden = false;
      } else {
        picker.hidden = true;
      }
    };

    input.onkeydown = (e) => {
      if (!picker.hidden) {
        const items = picker.querySelectorAll('.chat-mention-item');
        if (e.key === 'Escape') {
          picker.hidden = true;
          e.preventDefault();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          if (items.length > 0) {
            e.preventDefault();
            const first = items[0];
            const name = first.dataset.mentionName;
            if (name && typeof window.insertChatMention === 'function') {
              window.insertChatMention(name);
            }
          }
        }
      }
    };
  };

  window.renderRealChat = function() {
    const container = document.getElementById('messages');
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
    
    // Deduplicate messages by id or message_id
    const seen = new Set();
    const uniqueMessages = (window.realChatMessages || []).filter(m => {
      const key = m?.id || m?.message_id;
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueMessages.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">لا توجد رسائل.</div>';
    } else {
      const curUser = window.currentUser || {};
      const myCharName = (curUser.character_name || curUser.aion2Profile?.character_name || '').toLowerCase();
      const myDiscordName = (curUser.displayName || curUser.username || '').toLowerCase();
      const myId = String(curUser.id || window.currentUserId || '');

      container.innerHTML = uniqueMessages.map(m => {
        const timeStr = new Intl.DateTimeFormat('ar-SA', { hour:'numeric', minute:'2-digit' }).format(new Date(m.created_at));
        
        // Render rich attachments (displaying images properly)
        const attachmentsHtml = (m.attachments && m.attachments.length) ? m.attachments.map(a => {
          if (!a || !a.url) return '';
          const url = a.url;
          const name = a.name || 'image.png';
          const isImg = (a.contentType && a.contentType.startsWith('image/')) ||
                        /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url) ||
                        /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
          if (isImg) {
            return '<div class="chat-attachment-img-wrap"><img src="' + escapeHTML(url) + '" alt="' + escapeHTML(name) + '" class="chat-attachment-img" loading="lazy" onclick="window.previewChatImage(\'' + escapeHTML(url) + '\')" title="انقر لتكبير الصورة (' + escapeHTML(name) + ')"></div>';
          }
          return '<div class="chat-attachment-file"><a href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">📎 ' + escapeHTML(name) + '</a></div>';
        }).join('') : '';

        // Format message text with @Name mentions and <@id> tags
        let formattedContent = escapeHTML(m.content || '');
        formattedContent = formattedContent.replace(/&lt;@!?(\d+)&gt;/g, (match, id) => {
          let foundName = null;
          if (Array.isArray(window.allCommunityMembers)) {
            const found = window.allCommunityMembers.find(mem => mem.discord_id === id);
            if (found) foundName = found.character_name || found.displayName || found.username;
          }
          const label = foundName || 'عضو';
          return '<span class="chat-mention" onclick="window.insertChatMention(\'' + escapeHTML(label) + '\')">@' + escapeHTML(label) + '</span>';
        });
        formattedContent = formattedContent.replace(/(^|[\s(])@([\w\u0600-\u06FF.-]{2,30})/g, (match, prefix, tag) => {
          return prefix + '<span class="chat-mention" onclick="window.insertChatMention(\'' + escapeHTML(tag) + '\')">@' + escapeHTML(tag) + '</span>';
        });

        // Check if current user is mentioned
        const rawLow = (m.content || '').toLowerCase();
        const isMentioned = Boolean(
          (myCharName && rawLow.includes('@' + myCharName)) ||
          (myDiscordName && rawLow.includes('@' + myDiscordName)) ||
          (myId && (m.content || '').includes('<@' + myId + '>'))
        );

        const avatarHtml = m.author_avatar
          ? '<img class="avatar" src="' + escapeHTML(m.author_avatar) + '" alt="Avatar" style="object-fit:cover;border-radius:50%" onerror="this.src=\'assets/avatar-demo.svg\'">'
          : '<span class="avatar">' + escapeHTML(m.author_display_name ? m.author_display_name[0] : 'U') + '</span>';

        return '<div class="message ' + (isMentioned ? 'is-mentioned' : '') + '">' +
          avatarHtml +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<b dir="ltr" class="chat-author-name" onclick="window.insertChatMention(\'' + escapeHTML(m.author_display_name) + '\')">' + escapeHTML(m.author_display_name) + '</b>' +
              '<button type="button" class="chat-reply-btn" title="منشن ' + escapeHTML(m.author_display_name) + '" onclick="window.insertChatMention(\'' + escapeHTML(m.author_display_name) + '\')">@</button>' +
              '<small>' + timeStr + '</small>' +
            '</div>' +
            '<p>' + formattedContent + '</p>' +
            attachmentsHtml +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
  };

  if (typeof renderChat === 'function') {
    const originalRenderChat = renderChat;
    renderChat = function() {
      originalRenderChat();
      if (!window.allCommunityMembers) {
        fetchGuildData().catch(() => {});
      }
      if (typeof window.setupChatMentionInput === 'function') {
        window.setupChatMentionInput();
      }
      if (typeof window.renderRealChat === 'function') {
        window.renderRealChat();
      }
      pollChat();
    };
  }

  // Intercept the chat form submit
  document.addEventListener('submit', async e => {
    if (e.target && e.target.id === 'chat-form') {
      e.preventDefault();
      if (isSendingChat) return;
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text) return;
      
      const picker = document.getElementById('chat-mention-picker');
      if (picker) picker.hidden = true;

      isSendingChat = true;
      input.disabled = true;
      try {
        const res = await request('/api/auth/aion2-chat', { content: text });
        if (res && res.success) {
          input.value = '';
          await pollChat(); // Immediate fetch to show the new message
          const container = document.getElementById('messages');
          if (container) container.scrollTop = container.scrollHeight;
        } else {
          if (typeof toast === 'function') toast('خطأ: ' + (res.error || 'فشل إرسال الرسالة'));
        }
      } catch (err) {
        if (typeof toast === 'function') toast('خطأ في الاتصال بالخادم.');
      } finally {
        isSendingChat = false;
        input.disabled = false;
        input.focus();
      }
    }
  });

  // Auto-Updater Remote Events & Actions
  if (window.electronAPI && typeof window.electronAPI.onUpdaterEvent === 'function') {
    const banner = document.getElementById('update-banner');
    const bannerMsg = document.getElementById('update-banner-msg');
    const bannerBtn = document.getElementById('update-banner-btn');

    window.electronAPI.onUpdaterEvent((data) => {
      if (!data) return;
      if (data.type === 'available') {
        if (typeof toast === 'function') toast(`🚀 يتوفر تحديث جديد (${data.version || ''})، جاري التنزيل تلقائياً...`);
      } else if (data.type === 'downloaded') {
        if (banner && bannerMsg && bannerBtn) {
          bannerMsg.textContent = `🚀 تم تنزيل إصدار جديد (${data.version || ''}) جاهز للتثبيت!`;
          bannerBtn.textContent = 'إعادة التشغيل للتحديث';
          bannerBtn.onclick = () => {
            window.electronAPI.installUpdate();
          };
          banner.hidden = false;
        }
        if (typeof toast === 'function') toast(`✅ تم تنزيل التحديث (${data.version || ''}). أعد تشغيل البرنامج لتطبيقه.`);
      }
    });
  }
})();
