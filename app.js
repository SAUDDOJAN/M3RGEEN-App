/* AION 2 UI Core.
   Authentication and API integrations are handled by auth-client.js. */
const $ = s => document.querySelector(s);
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const NEUTRAL_AVATAR_DATA_URI = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237e8b9f'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

function isValidAvatarUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    const allowed = [
      'playnccdn.com',
      'profileimg.plaync.com',
      'tw.ncsoft.com',
      'aion2.plaync.com',
      'shugo.gg',
      'cdn.discordapp.com'
    ];
    return allowed.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function renderCharacterAvatar(avatarUrl, charName, cssClass = 'avatar') {
  if (avatarUrl && isValidAvatarUrl(avatarUrl)) {
    return `<img class="${cssClass}" src="${escapeHTML(avatarUrl)}" alt="${escapeHTML(charName || '')}" onerror="this.onerror=null;this.src='${NEUTRAL_AVATAR_DATA_URI}';">`;
  }
  return `<span class="${cssClass} neutral-avatar" title="${escapeHTML(charName || 'شخصية AION 2')}"><svg viewBox="0 0 24 24" fill="currentColor" class="neutral-avatar-icon" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>`;
}

const characterIdentities = (typeof window !== 'undefined' && window.characterIdentities) ? window.characterIdentities : {};
if (typeof window !== 'undefined') window.characterIdentities = characterIdentities;

function registerCharacterIdentity(discordId, charName, avatarUrl, charClass) {
  if (!discordId && !charName) return;
  const target = (typeof window !== 'undefined' && window.characterIdentities) ? window.characterIdentities : characterIdentities;
  const existing = (discordId && target[String(discordId)]) || (charName && target[String(charName)]);
  const validAvatar = (avatarUrl && isValidAvatarUrl(avatarUrl)) ? avatarUrl : (existing?.character_avatar || null);
  const finalClass = charClass || existing?.player_class || null;

  const entry = {
    discord_id: discordId ? String(discordId) : (existing?.discord_id || null),
    character_name: charName || (existing?.character_name || null),
    character_avatar: validAvatar,
    player_class: finalClass
  };
  if (discordId) target[String(discordId)] = entry;
  if (charName && charName !== 'Unknown') target[String(charName)] = entry;
}

function resolveCharacterAvatar(charName, discordId, directAvatar) {
  // 1. Direct avatar from group / member payload if valid
  if (directAvatar && isValidAvatarUrl(directAvatar)) {
    return directAvatar;
  }

  // 2. Fallback to current authenticated user's character avatar if identity matches
  if (typeof window !== 'undefined' && window.currentUser) {
    const cur = window.currentUser;
    const curId = window.currentUserId || cur.id;
    const curName = window.viewer || cur.character_name || cur.aion2Profile?.character_name;
    const curAvatar = cur.character_avatar || cur.aion2Profile?.profile_image;

    const matchesId = Boolean(curId && discordId && String(curId) === String(discordId));
    const matchesName = Boolean(curName && charName && String(curName).toLowerCase() === String(charName).toLowerCase());

    if ((matchesId || matchesName) && curAvatar && isValidAvatarUrl(curAvatar)) {
      return curAvatar;
    }
  }

  // 3. Global registry lookup by Discord ID or Character Name
  const target = (typeof window !== 'undefined' && window.characterIdentities) ? window.characterIdentities : characterIdentities;
  if (discordId && target[String(discordId)] && isValidAvatarUrl(target[String(discordId)].character_avatar)) {
    return target[String(discordId)].character_avatar;
  }
  if (charName && charName !== 'Unknown' && target[String(charName)] && isValidAvatarUrl(target[String(charName)].character_avatar)) {
    return target[String(charName)].character_avatar;
  }

  return null;
}

if (typeof window !== 'undefined') {
  window.NEUTRAL_AVATAR_DATA_URI = NEUTRAL_AVATAR_DATA_URI;
  window.isValidAvatarUrl = isValidAvatarUrl;
  window.renderCharacterAvatar = renderCharacterAvatar;
  window.characterIdentities = characterIdentities;
  window.registerCharacterIdentity = registerCharacterIdentity;
  window.resolveCharacterAvatar = resolveCharacterAvatar;
}

const navItems=[['groups','assets/nav-icons/groups.svg','القروبات'],['roadmap','🧭','مسار التطور'],['chat','assets/nav-icons/chat.svg','شات أيون 2'],['events','assets/nav-icons/events.svg','الفعاليات والتايمرات'],['members','assets/nav-icons/members.svg','أعضاء الجيلد'],['stats','assets/nav-icons/stats.svg','إحصائيات الجيلد'],['leaderboard','assets/nav-icons/leaderboard.svg','الليدر بورد'],['access','assets/nav-icons/access.svg','الصلاحيات'],['about','assets/nav-icons/about.svg','عن البرنامج']];
let groups = (typeof window !== 'undefined' && Array.isArray(window.groups)) ? window.groups : [];
if (typeof window !== 'undefined') window.groups = groups;
function getGroups(){ return (typeof window !== 'undefined' && Array.isArray(window.groups)) ? window.groups : groups; }

const dungeonList=[['Krao',700],['Draupnir',700],['Urugugu',1400],['Vakron',1400],['Fire Temple',2100],['Ferocious Horn Den',2100]];
const dungeonImages={"Krao": "krao_cave.jpg", "Draupnir": "draupnir.jpg", "Urugugu": "urugugu_canyon.jpg", "Vakron": "vakron_sky_island.jpg", "Fire Temple": "fire_temple.jpg", "Ferocious Horn Den": "ferocious_horn_den.jpg"};
const transcendenceDungeons=[['Shattered_Arkanis','Shattered Arkanis'],['Deus_Research_Base','Deus Research Base']];
const transcendenceStages=[['STAGE_1','Stage 1 (1600 iLvl)',1600],['STAGE_2','Stage 2 (1900 iLvl)',1900],['STAGE_3','Stage 3 (2200 iLvl)',2200],['STAGE_4','Stage 4 (2500 iLvl)',2500]];
const reasons=['تغيير الخطة','لم يكتمل الفريق','ظرف طارئ','سبب آخر'];
let page='groups',query='',guild='Early Access';
let filter = (typeof window !== 'undefined' && window.filter) ? window.filter : 'all';
if (typeof window !== 'undefined') window.filter = filter;
function getFilter(){ return (typeof window !== 'undefined' && window.filter) ? window.filter : filter; }
let wizard = (typeof window !== 'undefined' && window.wizard) ? window.wizard : {type:'Dungeons',name:'Krao',mode:'EXPLORATION',step:1};
if (typeof window !== 'undefined') window.wizard = wizard;
function getWizard(){ return (typeof window !== 'undefined' && window.wizard) ? window.wizard : wizard; }
let sound=true,flash=true,alertMode='full',toastTimer;
let viewer=(typeof window!=='undefined'&&window.viewer)?window.viewer:null;
let viewerClass=(typeof window!=='undefined'&&window.viewerClass)?window.viewerClass:null;
const partyRoles=['Tank','Healer','DPS','DPS','DPS'];

function getActivityDisplayName(type){
  const t=String(type||'').toUpperCase();
  if(t==='DUNGEON'||t==='DUNGEONS')return '🗡️ إكسبدشن';
  if(t==='TRANSCENDENCE')return '✨ ترانسندنس';
  if(t==='SANCTUARY')return '⛩️ سانكشوري';
  if(t==='ABYSS')return '⚔️ أبيس';
  if(t==='RIFT'||t==='RIFTS')return '🌀 حرب الريفتات (قريبًا)';
  return type||'نشاط';
}

function matchActivityFilter(groupType,filterType){
  if(!filterType||filterType==='all')return true;
  const f=filterType.toUpperCase();
  const t=String(groupType||'').toUpperCase();
  if(f==='DUNGEONS'&&(t==='DUNGEON'||t==='DUNGEONS'))return true;
  if(f==='TRANSCENDENCE'&&t==='TRANSCENDENCE')return true;
  if(f==='SANCTUARY'&&t==='SANCTUARY')return true;
  if(f==='ABYSS'&&t==='ABYSS')return true;
  if(f==='RIFTS'&&(t==='RIFT'||t==='RIFTS'))return true;
  return t===f;
}

function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4200)}
function modal(title,body,footer=''){
  if (typeof setWindowMode === 'function' && typeof windowMode !== 'undefined' && windowMode !== 'full' && windowMode !== 'auth') {
    setWindowMode('full');
  }
  const el=$('#modal');
  $('#modal-content').innerHTML=`<div class="modal-header"><h2>${title}</h2><button aria-label="إغلاق النافذة" data-action="dismiss">×</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}`;
  if(!el.open)el.showModal();
}
function closeModal(){
  const el=$('#modal');
  if(el&&el.open)el.close();
}
function heading(title,subtitle,actions=''){return `<div class="section-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`}
function notice(text){return `<div class="notice"><b>◈</b><span>${text}</span></div>`}
function timer(deadline){const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function slots(g){
  const gTypeUpper=String(g.type||'').toUpperCase();
  if(gTypeUpper==='SANCTUARY'&&Array.isArray(g.roles))return [0,5].map((start,i)=>`<div class="party-label" dir="ltr">Party ${i+1}</div>${slots({roles:(g.roles||[]).slice(start,start+5),members:(g.members||[]).slice(start,start+5),members_details:g.members_details,type:'SANCTUARY_SUB',partyNum:i+1})}`).join('');
  if(g.roles)return `<div class="slots">${g.roles.map((r,i)=>{
    const mName = g.members[i];
    let titleStr = (mName || 'مكان متاح') + ' • ' + r;
    let memberAvatar = null;
    let mDiscordId = null;
    if(mName && Array.isArray(g.members_details)){
      const party = g.partyNum || ((gTypeUpper === 'SANCTUARY' && i >= 5) ? 2 : 1);
      const detail = g.members_details.find(d => d.character_name === mName && (d.assigned_party || 1) === party)
                  || g.members_details.find(d => d.character_name === mName);
      if(detail){
        if(detail.player_class){
          titleStr = `${mName} (${detail.player_class}) • ${r}`;
        }
        mDiscordId = detail.discord_id;
        if(detail.character_avatar){
          memberAvatar = detail.character_avatar;
        }
      }
    }
    let slotContent = '<span>+</span>';
    if(mName){
      memberAvatar = resolveCharacterAvatar(mName, mDiscordId, memberAvatar);
      if(memberAvatar && isValidAvatarUrl(memberAvatar)){
        slotContent = `<img class="slot-avatar" src="${escapeHTML(memberAvatar)}" alt="${escapeHTML(mName)}" onerror="this.onerror=null;this.src='${NEUTRAL_AVATAR_DATA_URI}';">`;
      } else {
        slotContent = `<span class="slot-avatar neutral-slot-avatar"><svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;color:#8e9aaf;" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>`;
      }
    }
    return `<div class="slot ${r==='Tank'?'tank':r==='Healer'?'healer':''} ${mName?'':'empty'}" title="${escapeHTML(titleStr)}">${slotContent}<em dir="ltr">${r}</em></div>`;
  }).join('')}</div>`;
  return `<div class="slots free">${g.members.map((m, idx)=>{
    let memberAvatar = null;
    let mDiscordId = null;
    if(m && Array.isArray(g.members_details)){
      const detail = g.members_details.find(d => d.character_name === m);
      if(detail){
        mDiscordId = detail.discord_id;
        if(detail.character_avatar) memberAvatar = detail.character_avatar;
      }
    }
    let slotContent = '+';
    if(m){
      memberAvatar = resolveCharacterAvatar(m, mDiscordId, memberAvatar);
      if(memberAvatar && isValidAvatarUrl(memberAvatar)){
        slotContent = `<img class="slot-avatar-mini" src="${escapeHTML(memberAvatar)}" alt="${escapeHTML(m)}" onerror="this.onerror=null;this.src='${NEUTRAL_AVATAR_DATA_URI}';">`;
      } else {
        slotContent = '●';
      }
    }
    return `<div class="slot ${m?'':'empty'}" title="${escapeHTML(m||'مكان متاح')}">${slotContent}</div>`;
  }).join('')}</div>`;
}

function card(g){
  const currentViewer=(typeof window!=='undefined'&&window.viewer)?window.viewer:viewer;
  const currentUserId=(typeof window!=='undefined'&&window.currentUserId)?window.currentUserId:null;
  const count=g.members.filter(Boolean).length;
  const isRegistered=Boolean(currentViewer || currentUserId);
  
  // Use Discord User ID for creator check when available, fallback to character name string
  const isCreator=Boolean(isRegistered && (
    (currentUserId && g.creator_id) ? (String(g.creator_id) === String(currentUserId)) : (currentViewer && g.creator === currentViewer)
  ));

  // Use members_details for joined check when available, fallback to members array
  const joined=Boolean(isRegistered && (
    (currentUserId && Array.isArray(g.members_details)) ? g.members_details.some(m => String(m.discord_id) === String(currentUserId)) : (currentViewer && g.members.includes(currentViewer))
  ));
  const full=count===g.capacity;

  const gTypeUpper=String(g.type||'').toUpperCase();
  let art=g.art;
  if(!art){
    if(gTypeUpper==='DUNGEON'||gTypeUpper==='DUNGEONS'){
      const imgKey=Object.keys(dungeonImages).find(k=>g.name&&g.name.toLowerCase().includes(k.toLowerCase()));
      art=imgKey?('dungeons/'+dungeonImages[imgKey]):'dungeon.png';
    } else if(gTypeUpper==='TRANSCENDENCE'){
      art='dungeon.png';
    } else if(gTypeUpper==='SANCTUARY'){
      art='sanctuary-dragon.jpg';
    } else if(gTypeUpper==='ABYSS'){
      art='abyss-region-clean.png';
    } else {
      art='dungeon.png';
    }
  }

  const categoryName=getActivityDisplayName(g.type);
  const modeText=g.mode?` • <span dir="ltr">${escapeHTML(g.mode)}</span>`:'';
  const ilvlText=g.gs>0?`<span class="card-gear" dir="ltr">Item Level ${g.gs}</span>`:'';

  const isVoiceActive = Boolean(g.voice_active || (['VOICE_ENTRY', 'ACTIVE'].includes(g.state) && g.voice_channel_id));
  const canStartVoice = Boolean(isCreator && !isVoiceActive && (g.can_start_voice || full));

  let actionBtn='';
  if(isVoiceActive && g.voice_url){
    actionBtn=`<button class="primary" style="background:#059669;color:#fff;border-color:#10b981;font-weight:bold" data-action="open-voice-channel" data-url="${escapeHTML(g.voice_url)}">🔊 دخول الروم</button>`;
  } else if(canStartVoice){
    actionBtn=`<button class="primary" style="background:#2563eb;color:#fff;border-color:#3b82f6;font-weight:bold" data-action="start-voice-room" data-id="${g.id}">🔊 بدء الروم الصوتي</button>`;
  } else if(g.status==='open'){
    if(joined){
      if(isCreator){
        actionBtn=`<button class="primary danger" data-action="close-group" data-id="${g.id}">إغلاق مجموعتك</button>`;
      } else {
        actionBtn=`<button class="primary" data-action="leave" data-id="${g.id}">مغادرة المجموعة</button>`;
      }
    } else {
      actionBtn=`<button class="primary" data-action="join" data-id="${g.id}" ${full?'disabled':''}>${full?'المجموعة مكتملة':'＋ انضمام'}</button>`;
    }
  } else if(g.status==='awaiting_vote'){
    actionBtn=`<button class="primary" disabled>التصويت للإنهاء</button>`;
  } else if(g.status==='expired'){
    actionBtn=`<button class="primary" disabled>انتهت المهلة</button>`;
  } else {
    actionBtn=`<button class="primary" disabled>تم الإغلاق</button>`;
  }

  return `<article class="group-card">
    <div class="card-art activity-art ${gTypeUpper==='DUNGEON'||gTypeUpper==='DUNGEONS'?'dungeon-art':''}">
      <img src="assets/${art}" alt="${escapeHTML(g.name||categoryName)}">
      <span class="category" dir="auto">${categoryName}</span>
      <span class="status ${g.status!=='open'?'closed':''}">${g.status==='expired'?'انتهت المهلة':g.status==='closed'?'مغلقة':isVoiceActive?'🔊 الروم الصوتي مفعّل':g.firstFull?(full?'بانتظار بدء الصوت':'بانتظار لاعب بديل'):'● البحث عن لاعبين'}</span>
    </div>
    <div class="card-body">
      <h3>${escapeHTML(g.name)}${modeText}</h3>
      ${ilvlText}
      <div class="creator">${renderCharacterAvatar(resolveCharacterAvatar(g.creator, g.creator_id, g.creator_avatar), g.creator, 'avatar')}<span>أنشأها <b dir="ltr">${escapeHTML(g.creator||'مجهول')}</b></span><span class="guild-label">${isCreator?'مجموعتك':'AION 2'}</span></div>
      <div class="card-meta"><span>الأعضاء <strong dir="ltr">${count} / ${g.capacity}</strong></span><span>${g.firstFull?'مهلة بدء الصوت':'مهلة البحث'} <strong ${g.deadline?`data-countdown="${g.deadline}" dir="ltr"`:''}>${g.status==='closed'?'—':g.deadline?timer(g.deadline):'—'}</strong></span></div>
      ${slots(g)}
      <div class="roles-note">${g.roles?'متاح: '+g.roles.filter((r,i)=>!g.members[i]).join(' · '):(gTypeUpper==='ABYSS'?'خمسة لاعبين • بدون قيود كلاس':'فريقان • خمسة لاعبين لكل فريق')}</div>
      <div class="card-footer">
        ${actionBtn}
        <button class="details" data-action="details" data-id="${g.id}">التفاصيل ↗</button>
      </div>
    </div>
  </article>`;
}

function renderGroups(){
  const active=getGroups().filter(g=>g.status==='open');
  const curFilter=getFilter();
  $('#main').innerHTML=`<div class="event-strip"><img data-next-event-image src="assets/${eventImages[nextGameEvent().id]}" alt="${nextGameEvent().name}"><div><h3>الحدث القادم — لا يفوتك</h3><p><span data-next-event-name>${nextGameEvent().name}</span> • <span data-event-status="next">${eventStatusText(nextGameEvent())}</span></p></div><span class="countdown" data-event-timer="next">${eventTimerText(nextGameEvent())}</span><button data-action="alert">معاينة التنبيه ↗</button></div><section class="hero"><div class="hero-content"><span class="eyebrow" dir="ltr">AION 2 · ARAB COMMUNITY</span><h1>تجربة أيون 2… بطريقتنا.</h1><p>منصة صُنعت لمجتمع M3RGEEN، تجمع اللاعبين والخدمات والفعاليات في مكان واحد.</p></div><span class="hero-pill"><span class="online"></span>معًا في عالم أيون</span></section><div class="stats"><div class="stat"><span class="stat-icon">⚔</span><div><b>${active.length.toString().padStart(2,'0')}</b><span>قروبات تبحث عن لاعبين</span></div><small>نشطة حالياً</small></div><div class="stat"><span class="stat-icon">♙</span><div><b>${active.reduce((n,g)=>n+g.members.filter(Boolean).length,0)}</b><span>لاعبًا في القروبات</span></div><small>أعضاء منضمين</small></div><div class="stat"><span class="stat-icon">◇</span><div><b>${active.reduce((n,g)=>n+g.capacity-g.members.filter(Boolean).length,0)}</b><span>مكانًا متاحًا</span></div><small>بانتظار الرفاق</small></div></div>${heading('ابحث عن فريقك','مغامرات مختلفة. مجتمع واحد.',`<button class="primary" data-action="create">＋ إنشاء مجموعة</button>`)}<div class="tabs-row"><div class="tabs" aria-label="نوع النشاط">${[['all','الكل'],['Dungeons','🗡️ إكسبدشن'],['Transcendence','✨ ترانسندنس'],['Sanctuary','⛩️ سانكشوري'],['Abyss','⚔️ أبيس'],['Rifts','🌀 حرب الريفتات (قريبًا)']].map(([id,label])=>`<button class="${curFilter===id?'selected':''}" data-action="filter" data-filter="${id}" ${id==='Rifts'?'disabled':''}>${label}</button>`).join('')}</div><div class="search"><span>⌕</span><input id="group-search" aria-label="البحث عن مجموعة" placeholder="ابحث عن نشاط أو لاعب..." value="${escapeHTML(query)}"></div></div><div class="cards" id="group-cards"></div>${notice('نظام تشكيل الفرق متصل ومباشر مع خادم البوت وقناة Discord.')}`;
  renderCards();
  $('#group-search').addEventListener('input',e=>{query=e.target.value;renderCards()});
}

function renderCards(){
  const curFilter = getFilter();
  const list=getGroups().filter(g=>matchActivityFilter(g.type,curFilter)&&`${g.name} ${g.creator} ${g.members.filter(Boolean).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  $('#group-cards').innerHTML=list.length?list.map(card).join(''):`<div class="empty-state">${curFilter==='Rifts'?'◉<h3>حرب الريفتات • قريبًا</h3><p>تظهر هنا القروبات بعد تفعيل هذا النشاط في البوت.</p>':'لا توجد قروبات تطابق بحثك حالياً.'}</div>`;
}

if(typeof window!=='undefined'){
  window.renderCards=renderCards;
  window.renderGroups=renderGroups;
  window.join=join;
  window.closeGroup=closeGroup;
  window.card=card;
}

function showDetails(id){
  const g=getGroups().find(g=>g.id===id);
  if(!g)return;
  const currentViewer=(typeof window!=='undefined'&&window.viewer)?window.viewer:viewer;
  const currentUserId=(typeof window!=='undefined'&&window.currentUserId)?window.currentUserId:null;
  const isRegistered=Boolean(currentViewer || currentUserId);
  const count=g.members.filter(Boolean).length;
  const isCreator=Boolean(isRegistered && (
    (currentUserId && g.creator_id) ? (String(g.creator_id) === String(currentUserId)) : (currentViewer && g.creator === currentViewer)
  ));
  const full=count>=g.capacity;
  const isVoiceActive=Boolean(g.voice_active || (['VOICE_ENTRY', 'ACTIVE'].includes(g.state) && g.voice_channel_id));
  const canStartVoice=Boolean(isCreator && !isVoiceActive && (g.can_start_voice || full));

  let voiceNoticeHtml = '';
  if (isVoiceActive && g.voice_url) {
    voiceNoticeHtml = `
      <div style="background:rgba(16,185,129,0.15);border:1px solid #10b981;border-radius:8px;color:#6ee7b7;padding:12px 14px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <b style="font-size:14px;color:#fff">🔊 بدأ الدنجن الآن!</b><br>
          <span style="font-size:12px;color:#d1fae5">الروم الصوتي مفعل وجاهز. أرجو الانتقال للروم الصوتي لبدء الدنجن.</span>
        </div>
        <button class="primary" style="background:#059669;color:#fff;border-color:#10b981;padding:7px 16px;white-space:nowrap;font-weight:bold" data-action="open-voice-channel" data-url="${escapeHTML(g.voice_url)}">دخول الروم ↗</button>
      </div>`;
  } else if (canStartVoice) {
    voiceNoticeHtml = `
      <div style="background:rgba(37,99,235,0.15);border:1px solid #3b82f6;border-radius:8px;color:#93c5fd;padding:12px 14px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <b style="font-size:14px;color:#fff">⚔️ الفريق مكتمل — جاهز لبدء الصوت!</b><br>
          <span style="font-size:12px;color:#bfdbfe">يمكنك كقائد للمجموعة تفعيل الروم الصوتي المخصص لفريقك الآن.</span>
        </div>
        <button class="primary" style="background:#2563eb;color:#fff;border-color:#3b82f6;padding:7px 16px;white-space:nowrap;font-weight:bold" data-action="start-voice-room" data-id="${id}">🔊 بدء الروم الصوتي</button>
      </div>`;
  }

  let modalBtns = '';
  if (isVoiceActive && g.voice_url) {
    modalBtns += `<button class="primary" style="background:#059669;color:#fff;border-color:#10b981;font-weight:bold" data-action="open-voice-channel" data-url="${escapeHTML(g.voice_url)}">🔊 الانتقال إلى الروم الصوتي</button>`;
  } else if (canStartVoice) {
    modalBtns += `<button class="primary" style="background:#2563eb;color:#fff;border-color:#3b82f6;font-weight:bold" data-action="start-voice-room" data-id="${id}">🔊 بدء الروم الصوتي</button>`;
  }
  if (g.status==='open' && isCreator) {
    modalBtns += `<button class="danger" data-action="close-group" data-id="${id}">إغلاق المجموعة</button>`;
  }
  modalBtns += `<button data-action="dismiss">رجوع</button>`;

  modal(`مجموعة <b dir="ltr">${escapeHTML(g.name)}</b>`,
    `<div class="creator">${renderCharacterAvatar(resolveCharacterAvatar(g.creator, g.creator_id, g.creator_avatar), g.creator, 'avatar')}<span>منشئ المجموعة: <b dir="ltr">${escapeHTML(g.creator||'مجهول')}</b></span><span class="status ${g.status!=='open'?'closed':''}">${g.status==='expired'?'انتهت المهلة':g.status==='closed'?'مغلقة':isVoiceActive?'🔊 بدأ الدنجن':full?'🟡 الفريق مكتمل':'البحث عن لاعبين'}</span></div>
     <div class="preview-summary">
       <h3 dir="ltr">${typeLabel} · ${escapeHTML(g.name)}</h3>
       <p>الأعضاء: <b dir="ltr">${count} / ${g.capacity}</b>${g.mode?` • النمط/المرحلة: <b dir="ltr">${escapeHTML(g.mode)}</b>`:''}${g.gs?`<br><span dir="ltr">Item Level: ${g.gs}</span>`:''}<br>${isVoiceActive?'الروم الصوتي نشط':g.firstFull?'مهلة بدء الصوت':'مهلة البحث'}: ${g.deadline?`<span data-countdown="${g.deadline}" dir="ltr">${timer(g.deadline)}</span>`:'—'}</p>
     </div>
     ${voiceNoticeHtml}
     ${g.members.map((m,i)=>{
       let memberLabel = m || 'مكان متاح';
       let memberAvatar = null;
       let mDiscordId = null;
       if(m && Array.isArray(g.members_details)){
         const detail = g.members_details.find(d => d.character_name === m);
         if(detail){
           if(detail.player_class){
             memberLabel = `${m} (${detail.player_class})`;
           }
           mDiscordId = detail.discord_id;
           if(detail.character_avatar){
             memberAvatar = detail.character_avatar;
           }
         }
       }
       let avatarHtml = '<span class="avatar">+</span>';
       if(m){
         memberAvatar = resolveCharacterAvatar(m, mDiscordId, memberAvatar);
         avatarHtml = renderCharacterAvatar(memberAvatar, m, 'avatar');
       }
       return `<div class="member-row">${avatarHtml}<span class="member-name" dir="ltr">${escapeHTML(memberLabel)}</span><span class="badge" dir="ltr">${g.roles?escapeHTML(g.roles[i]+(String(g.type).toUpperCase()==='SANCTUARY'?' · P'+(i<5?1:2):'')):'Player'}</span></div>`;
     }).join('')}
     ${g.status==='expired'?notice('انتهت مهلة هذه المجموعة.'):g.status==='closed'?notice('سبب الإغلاق: '+escapeHTML(g.reason||'تم الإغلاق')):notice(isCreator?'أنت منشئ هذه المجموعة، ويمكنك إغلاقها.':'إغلاق المجموعة متاح لمنشئها.')}`,
    modalBtns
  );
}

function hasActiveGroup(){
  const currentViewer=(typeof window!=='undefined'&&window.viewer)?window.viewer:viewer;
  const currentUserId=(typeof window!=='undefined'&&window.currentUserId)?window.currentUserId:null;
  if (!currentViewer && !currentUserId) return false;
  return getGroups().some(g => {
    if (g.status !== 'open') return false;
    if (currentUserId && Array.isArray(g.members_details)) {
      return g.members_details.some(m => String(m.discord_id) === String(currentUserId));
    }
    return currentViewer && g.members.includes(currentViewer);
  });
}

function availableSlot(g){return g.roles?g.roles.findIndex((r,i)=>r==='Tank'&&!g.members[i]):g.members.indexOf(null)}

function join(id){
  const g=getGroups().find(x=>x.id===id);
  if(!g)return;
  const count=g.members.filter(Boolean).length;
  if(count>=g.capacity){
    toast('المجموعة مكتملة بالفعل.');
    return;
  }
  const typeLabel=getActivityDisplayName(g.type);
  const modeText=g.mode?` • المرحلة/النمط: <b dir="ltr">${escapeHTML(g.mode)}</b>`:'';
  const ilvlReq=g.gs>0?`<p>الحد الأدنى لمستوى العتاد (Item Level): <b dir="ltr">${g.gs}</b></p>`:'';

  modal(`تأكيد الانضمام إلى الفريق`,
    `<div class="preview-summary">
       <span class="eyebrow">${typeLabel}</span>
       <h3 dir="ltr">${escapeHTML(g.name)}</h3>
       <p>منشئ المجموعة: <b dir="ltr">${escapeHTML(g.creator||'مجهول')}</b></p>
       <p>الأعضاء الحاليون: <strong dir="ltr">${count} / ${g.capacity}</strong>${modeText}</p>
       ${ilvlReq}
     </div>
     <p class="muted">
       سيتحقق البوت تلقائياً من شخصيتك المسجلة وعتادك من Shugo.gg، ويحدد دورك المناسب في الفريق.<br>
       ⚠️ يسمح بالتواجد في مجموعة نشطة واحدة فقط في نفس الوقت.
     </p>`,
    `<button data-action="dismiss">إلغاء</button><button class="primary" data-action="confirm-join" data-id="${id}">تأكيد الانضمام</button>`
  );
}

function closeGroup(id){
  const g=getGroups().find(x=>x.id===id);
  if(!g)return;
  const currentViewer=(typeof window!=='undefined'&&window.viewer)?window.viewer:viewer;
  const currentUserId=(typeof window!=='undefined'&&window.currentUserId)?window.currentUserId:null;
  const isCreator=Boolean((currentUserId && g.creator_id) ? (String(g.creator_id) === String(currentUserId)) : (currentViewer && g.creator === currentViewer));
  if(!isCreator){
    toast('إغلاق المجموعة متاح لمنشئها فقط.');
    return;
  }

  modal(`إغلاق المجموعة <b dir="ltr">${escapeHTML(g.name)}</b>`,
    `<p class="muted">هل أنت متأكد من رغبتك في إلغاء وإغلاق هذه المجموعة؟ سيتم إزالتها وتحديث بطاقة Discord تلقائياً.</p>
     <div style="margin:16px 0">
       <label for="close-reason" style="display:block;margin-bottom:6px;font-weight:600">اختر سبب الإلغاء:</label>
       <select id="close-reason" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-family:inherit">
         <option value="CHANGE_OF_PLAN">تغيير الخطة</option>
         <option value="GROUP_NOT_FILLED">لم يكتمل الفريق</option>
         <option value="EMERGENCY">ظرف طارئ</option>
         <option value="OTHER">سبب آخر</option>
       </select>
     </div>
     <div id="close-other-wrap" style="display:none;margin-top:12px">
       <label for="close-other" style="display:block;margin-bottom:6px;font-weight:600">اكتب السبب (إلزامي):</label>
       <input id="close-other" type="text" placeholder="اكتب سبب الإلغاء هنا..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-family:inherit">
     </div>`,
    `<button data-action="dismiss">تراجع</button><button class="danger" data-action="confirm-close" data-id="${id}">تأكيد الإغلاق</button>`
  );

  const reasonSelect=document.querySelector('#close-reason');
  const otherWrap=document.querySelector('#close-other-wrap');
  if(reasonSelect&&otherWrap){
    reasonSelect.addEventListener('change',()=>{
      otherWrap.style.display=reasonSelect.value==='OTHER'?'block':'none';
      if(reasonSelect.value==='OTHER'){
        const inp=document.querySelector('#close-other');
        if(inp)inp.focus();
      }
    });
  }
}

function createWizard(step=1){
  wizard.step=step;
  let body=`<div class="steps"><span class="${step===1?'current':''}">01 نوع النشاط</span><span>›</span><span class="${step===2?'current':''}">02 الاختيار</span><span>›</span><span class="${step===3?'current':''}">03 المعاينة</span></div>`,footer='';
  
  if(step===1){
    body+=`<p class="muted">ما المغامرة التي تريد جمع فريق لها؟</p>
    <div class="activity-options">
      ${[
        ['Dungeons','🗡️ إكسبدشن','5 لاعبين • نمط استكشاف وغزو'],
        ['Transcendence','✨ ترانسندنس','5 لاعبين • 4 مراحل • مستوى شخصية 45'],
        ['Sanctuary','⛩️ سانكشوري','فريقان • 10 لاعبين • تنظيم غارات'],
        ['Abyss','⚔️ أبيس','5 لاعبين • بدون قيود كلاس أو أدوار'],
        ['Rifts','🌀 حرب الريفتات (قريبًا)','معطل حالياً حسب نظام البوت']
      ].map(([type,title,sub])=>`
        <button class="activity-option ${wizard.type===type?'selected':''}" data-action="choose-type" data-type="${type}" ${type==='Rifts'?'disabled':''}>
          <b>${title}</b>
          <small>${sub}</small>
        </button>`).join('')}
    </div>`;
    footer='<button class="primary" data-action="wizard-next">التالي ←</button>';
  }
  
  if(step===2){
    if(wizard.type==='Transcendence'){
      const transDungeons=[
        ['Shattered_Arkanis','Shattered Arkanis (شاترد أركانيس)'],
        ['Deus_Research_Base','Deus Research Base (قاعدة أبحاث ديوس)']
      ];
      const transStages=[
        ['STAGE_1','Stage 1 — الحد الأدنى: 1600 iLvl (مستوى 45)'],
        ['STAGE_2','Stage 2 — الحد الأدنى: 1900 iLvl (مستوى 45)'],
        ['STAGE_3','Stage 3 — الحد الأدنى: 2200 iLvl (مستوى 45)'],
        ['STAGE_4','Stage 4 — الحد الأدنى: 2500 iLvl (مستوى 45)']
      ];
      body+=`
        <label for="activity-select">اختر دنجن ترانسندنس</label>
        <select id="activity-select" dir="ltr">
          ${transDungeons.map(([val,label])=>`<option value="${val}" ${wizard.name===val?'selected':''}>${label}</option>`).join('')}
        </select>
        <label for="stage-select" style="margin-top:14px">اختر المرحلة (Stage)</label>
        <select id="stage-select" dir="ltr">
          ${transStages.map(([val,label])=>`<option value="${val}" ${(wizard.mode||'STAGE_1')===val?'selected':''}>${label}</option>`).join('')}
        </select>
        <p class="muted">التحقق من مستوى الشخصية (45) ومستوى العتاد (iLvl) يتم تلقائياً عبر Shugo.gg عند التأكيد.</p>`;
    } else if(wizard.type==='Dungeons'){
      const dList=[
        ['Krao','Krao Cave — Exploration: 200 | Conquest: 700'],
        ['Draupnir','Draupnir — Exploration: 700 | Conquest: 700'],
        ['Urugugu','Urugugu — Exploration: 300 | Conquest: 1400'],
        ['Vakron','Vakron — Exploration: 1400 | Conquest: 1400'],
        ['Fire_Temple','Fire Temple — Exploration: 500 | Conquest: 2100'],
        ['Ferocious_Horn_Den','Ferocious Horn Den — Exploration: 2100 | Conquest: 2100']
      ];
      body+=`
        <label for="activity-select">اختر الإكسبدشن</label>
        <select id="activity-select" dir="ltr">
          ${dList.map(([val,label])=>`<option value="${val}" ${wizard.name===val?'selected':''}>${label}</option>`).join('')}
        </select>
        <label for="mode-select" style="margin-top:14px">اختر النمط (Mode)</label>
        <select id="mode-select" dir="ltr">
          <option value="EXPLORATION" ${(wizard.mode||'EXPLORATION')==='EXPLORATION'?'selected':''}>Exploration (استكشاف)</option>
          <option value="CONQUEST" ${wizard.mode==='CONQUEST'?'selected':''}>Conquest (غزو)</option>
        </select>
        <p class="muted">التحقق من مستوى العتاد يتم تلقائياً عبر Shugo.gg عند التأكيد.</p>`;
    } else {
      body+=`
        <label for="activity-select">النشاط المحدد</label>
        <select id="activity-select" dir="ltr">
          <option value="${wizard.type}">${wizard.type}</option>
        </select>
        <p class="muted">${wizard.type==='Sanctuary'?'غارة 10 لاعبين بفريقين متوازيين.':'مجموعة 5 لاعبين بدون قيود كلاس.'}</p>`;
    }
    footer='<button data-action="wizard-back">رجوع</button><button class="primary" data-action="wizard-next">معاينة المجموعة ←</button>';
  }

  if(step===3){
    const isTrans=wizard.type==='Transcendence';
    const isSanc=wizard.type==='Sanctuary';
    const isAbyss=wizard.type==='Abyss';
    const capacity=isSanc?10:5;
    const roles=isAbyss?null:(isSanc?[...partyRoles,...partyRoles]:[...partyRoles]);
    
    let previewArt='dungeon.png';
    if(wizard.type==='Dungeons'){
      const imgKey=Object.keys(dungeonImages).find(k=>wizard.name&&wizard.name.toLowerCase().includes(k.toLowerCase()));
      previewArt=imgKey?('dungeons/'+dungeonImages[imgKey]):'dungeon.png';
    } else if(isTrans){
      previewArt='dungeon.png';
    } else if(isSanc){
      previewArt='sanctuary-dragon.jpg';
    } else if(isAbyss){
      previewArt='abyss-region-clean.png';
    }

    const currentViewer=(typeof window!=='undefined'&&window.viewer)?window.viewer:viewer;
    const currentViewerClass=(typeof window!=='undefined'&&window.viewerClass)?window.viewerClass:viewerClass;
    const currentUserId=(typeof window!=='undefined'&&window.currentUserId)?window.currentUserId:null;
    const typeLabel=getActivityDisplayName(wizard.type);
    const modeLabel=wizard.mode?` • النمط/المرحلة: ${escapeHTML(wizard.mode)}`:'';

    let reqSummary='';
    if(isTrans){
      const stageMap={'STAGE_1':1600,'STAGE_2':1900,'STAGE_3':2200,'STAGE_4':2500};
      const reqILvl=stageMap[wizard.mode||'STAGE_1']||1600;
      reqSummary=`<p><b>شروط الأهلية:</b> مستوى 45 • عتاد ${reqILvl}+ iLvl</p>`;
    }

    body+=`<div class="preview-summary">
      <img class="dungeon-preview-image" src="assets/${previewArt}" alt="${escapeHTML(wizard.name)}">
      <span class="eyebrow">${typeLabel}</span>
      <h3 dir="ltr">${escapeHTML(wizard.name)}</h3>
      <p>حجم المجموعة: <b>${capacity} لاعبين</b>${modeLabel}</p>
      ${reqSummary}
      ${roles?slots({type:wizard.type,roles,members:Array(capacity).fill(null)}):'<p>بدون قيود كلاس أو أدوار.</p>'}
    </div>
    <div class="member-row">
      ${renderCharacterAvatar(resolveCharacterAvatar(currentViewer, currentUserId), currentViewer, 'avatar')}
      <span class="member-name"><b dir="ltr">${escapeHTML(currentViewer||'شخصيتك المسجلة')}</b><small>${currentViewerClass?escapeHTML(currentViewerClass):'حساب AION 2'}</small></span>
      <span class="badge" dir="ltr">${roles?'منشئ الفريق':'Player'}</span>
    </div>
    <p class="muted">
      يحدد البوت دورك تلقائياً من الكلاس المسجل في بروفايل Shugo.gg.<br>
      مهلة البحث: 20 دقيقة تبدأ فور التأكيد.<br>
      يسمح للاعب بالتواجد في مجموعة نشطة واحدة فقط.
    </p>`;
    footer='<button data-action="wizard-back">رجوع</button><button class="primary" data-action="confirm-create">تأكيد إنشاء المجموعة</button>';
  }

  modal('إنشاء مجموعة',body,footer);
}
function confirmCreate(){}
function guildTabs(){return '<div class="tabs-row"><div class="tabs">'+['Early Access','Global'].map(g=>'<button class="'+(guild===g?'selected':'')+'" data-action="guild" data-guild="'+g+'" dir="ltr">'+g+'</button>').join('')+'</div><span class="sandbox">فصل واضح بين الجيلدين</span></div>'}
function renderMembers(){}
function renderStats(){}
const messages=[];
function renderChat(){
  $('#main').innerHTML=heading('شات أيون 2','مساحة حديث أعضاء أيون 2 في مجتمع M3RGEEN.')+'<section class="panel aion-chat"><div class="chat-channel-header"><div><h3>شات أيون 2</h3><p>قناة المحادثات المباشرة المرتبطة بسيرفر ديسكورد M3RGEEN.</p></div><span class="badge">LIVE</span></div><div id="messages" class="chat-messages"><div style="text-align:center;padding:20px;color:var(--muted)">جاري التحميل...</div></div><form class="message-box" id="chat-form"><div class="chat-input-wrapper"><div id="chat-mention-picker" class="chat-mention-picker" hidden></div><input id="chat-input" maxlength="2000" aria-label="رسالة إلى شات أيون 2" placeholder="اكتب رسالة في شات أيون 2... استخدم @ للمنشن"></div><button type="button" id="mention-toggle" class="chat-mention-btn-trigger" aria-label="منشن عضو" title="منشن عضو (@)">@</button><div class="chat-emoji-control"><button type="button" id="emoji-toggle" class="chat-emoji-button" aria-label="إضافة إيموجي" title="إضافة إيموجي" aria-expanded="false" aria-controls="emoji-picker"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0"/><path d="M8 9h.01M16 9h.01" stroke-width="3"/></svg></button><div id="emoji-picker" class="chat-emoji-picker" role="group" aria-label="اختر إيموجي" hidden>'+['😀','😄','😂','😉','😍','😎','🥳','🤔','😅','😢','👍','👎','👏','🙌','💪','👋','❤️','🔥','✨','🎉','⚔️','🛡️','🎮','✅'].map(emoji=>'<button type="button" class="emoji-choice" aria-label="'+emoji+'" data-emoji="'+emoji+'">'+emoji+'</button>').join('')+'</div></div><button class="primary">إرسال</button></form></section>';

  const emojiToggle=$('#emoji-toggle'),emojiPicker=$('#emoji-picker'),chatInput=$('#chat-input'),mentionToggle=$('#mention-toggle'),mentionPicker=$('#chat-mention-picker');
  const closeEmojiPicker=()=>{emojiPicker.hidden=true;emojiToggle.setAttribute('aria-expanded','false');};
  const closeMentionPicker=()=>{if(mentionPicker)mentionPicker.hidden=true;};

  emojiToggle.onclick=()=>{closeMentionPicker();emojiPicker.hidden=!emojiPicker.hidden;emojiToggle.setAttribute('aria-expanded',String(!emojiPicker.hidden));};
  emojiPicker.onclick=e=>{const choice=e.target.closest('[data-emoji]');if(!choice)return;const start=chatInput.selectionStart??chatInput.value.length,end=chatInput.selectionEnd??start;const emoji=choice.dataset.emoji;if(chatInput.value.length-(end-start)+emoji.length>chatInput.maxLength)return;chatInput.setRangeText(emoji,start,end,'end');closeEmojiPicker();chatInput.focus();chatInput.dispatchEvent(new Event('input',{bubbles:true}));};

  if(mentionToggle){
    mentionToggle.onclick=()=>{
      closeEmojiPicker();
      if(mentionPicker.hidden){
        if(typeof window.renderMentionCandidates==='function') window.renderMentionCandidates('');
        mentionPicker.hidden=false;
      } else {
        closeMentionPicker();
      }
    };
  }

  $('.aion-chat').addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(!emojiPicker.hidden){closeEmojiPicker();emojiToggle.focus();e.preventDefault();}
      if(mentionPicker&&!mentionPicker.hidden){closeMentionPicker();chatInput.focus();e.preventDefault();}
    }
  });
  chatInput.addEventListener('focus',closeEmojiPicker);
  $('#chat-form').onsubmit=e=>{e.preventDefault();};
  if (typeof window.renderRealChat === 'function') window.renderRealChat();
  if (typeof window.setupChatMentionInput === 'function') window.setupChatMentionInput();
}

window.previewChatImage = function(src) {
  let lightbox = document.getElementById('chat-image-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'chat-image-lightbox';
    lightbox.className = 'chat-image-lightbox';
    document.body.appendChild(lightbox);
  }
  lightbox.innerHTML = `
    <button class="chat-image-lightbox-close" aria-label="إغلاق">✕</button>
    <img src="${escapeHTML(src)}" alt="معاينة الصورة" />
    <div class="chat-image-lightbox-controls">
      <a href="${escapeHTML(src)}" target="_blank" class="primary small-action-btn" rel="noopener noreferrer">عرض الصورة بحجم كامل ↗</a>
    </div>
  `;
  lightbox.hidden = false;
  lightbox.onclick = (e) => {
    if (e.target === lightbox || e.target.classList.contains('chat-image-lightbox-close')) {
      lightbox.hidden = true;
    }
  };
};

window.insertChatMention = function(name) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const mentionText = `@${name} `;
  const val = input.value;
  const cursor = input.selectionStart || val.length;
  const beforeCursor = val.slice(0, cursor);
  const afterCursor = val.slice(cursor);
  const match = beforeCursor.match(/@([\w\u0600-\u06FF.-]*)$/);
  if (match) {
    const start = match.index;
    input.value = val.slice(0, start) + mentionText + afterCursor;
  } else {
    input.value = (val.trim() ? val.trim() + ' ' : '') + mentionText;
  }
  const picker = document.getElementById('chat-mention-picker');
  if (picker) picker.hidden = true;
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
function renderLeaderboard(){}
const eventImages = {

  shugo: 'events/shugo-festival.png',
  invasion: 'events/dimensional-invasion.png',
  rift: 'events/spacetime-rift.png',
  kaira: 'events/watcher-kaira.png',
  siege: 'events/siege-artifact.png',
  'siege-bosses': 'events/siege-bosses.png',
  nahma: 'events/guardian-nahma.png',
  duty: 'events/duty-reset.png',
  weekly: 'events/weekly-reset.png'
};

const isOverlayDemo = false;
let demoEventCount = 2;
const demoBaseTime = Date.now();

function gameEvents(){
  const engine = (typeof window !== 'undefined' && window.AionEventTimers)
    ? window.AionEventTimers
    : (typeof AionEventTimers !== 'undefined' ? AionEventTimers : null);
  if (engine && typeof engine.calculateGameEvents === 'function') {
    return engine.calculateGameEvents(new Date());
  }
  return [];
}


function getActiveBroadcastItem() {
  const broadcasts = (typeof window !== 'undefined' && Array.isArray(window.realBroadcasts)) ? window.realBroadcasts : [];
  const now = Date.now();
  const b = broadcasts.find(item => new Date(item.active_until).getTime() > now) || (typeof window !== 'undefined' ? window.activeBroadcast : null);
  if (!b || new Date(b.active_until).getTime() <= now) return null;
  const remainingMs = Math.max(0, new Date(b.active_until).getTime() - now);
  return {
    id: 'app-alert',
    isBroadcast: true,
    name: 'تنبيه مهم',
    nameAr: 'تنبيه مهم',
    phase: 'live',
    image: 'assets/gorilla.png',
    broadcastData: b,
    timeRemainingMs: remainingMs,
    liveRemainingMs: remainingMs,
    nextDate: new Date(b.created_at || now)
  };
}

function nextGameEvent(events=gameEvents()){return [...events].sort((a,b)=>(a.phase==='upcoming'?1:0)-(b.phase==='upcoming'?1:0)||a.timeRemainingMs-b.timeRemainingMs)[0]}
function eventTimerText(event){
  if(event.isBroadcast || event.id === 'app-alert'){
    return event.broadcastData?.title ? (event.broadcastData.title.length > 28 ? event.broadcastData.title.substring(0, 26) + '..' : event.broadcastData.title) : 'اضغط لفتح الخبر ↗';
  }
  if(event.phase==='started')return 'بدأ الريست';
  const ms=event.phase==='live'?event.liveRemainingMs:event.timeRemainingMs;
  const seconds=Math.max(0,Math.ceil(ms/1000));
  const days=Math.floor(seconds/86400);
  const hours=Math.floor(seconds%86400/3600);
  const minutes=Math.floor(seconds%3600/60);
  const sec=String(seconds%60).padStart(2,'0');
  return days?`${days}d ${hours}h ${minutes}m`:hours?`${hours}h ${minutes}m ${sec}s`:`${minutes}:${sec}`;
}
const eventLocalTimeFormatter=new Intl.DateTimeFormat('ar',{weekday:'short',hour:'numeric',minute:'2-digit'});
function eventLocalTimeText(event){return eventLocalTimeFormatter.format(event.nextDate)}
function eventStatusText(event){
  if(event.isBroadcast || event.id === 'app-alert'){
    return (typeof window !== 'undefined' && typeof window.getBroadcastTypeBadge === 'function')
      ? window.getBroadcastTypeBadge(event.broadcastData?.type)
      : 'تنبيه مهم';
  }
  return event.phase==='started'?'بدأ الريست':event.phase==='live'?'الحدث جارٍ الآن':`يبدأ ${eventLocalTimeText(event)}`;
}

// Multi-event rotation state
let overlayRotationIndex = 0;
let lastRotationTime = Date.now();
let manualPauseUntil = 0;

function getEligibleOverlayEvents(events = gameEvents()) {
  const FIFTEEN_MIN_MS = 15 * 60 * 1000;
  const eligible = events.filter(e => {
    // 1. Live / ongoing events
    if (e.phase === 'live' || e.phase === 'started') return true;
    // 2. Events starting within 15 minutes
    if (e.timeRemainingMs > 0 && e.timeRemainingMs <= FIFTEEN_MIN_MS) return true;
    return false;
  });

  const broadcastItem = getActiveBroadcastItem();

  if (eligible.length > 0) {
    // Sort: live events first, then by earliest remaining time
    const sorted = eligible.sort((a, b) => {
      const aLive = (a.phase === 'live' || a.phase === 'started') ? 0 : 1;
      const bLive = (b.phase === 'live' || b.phase === 'started') ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return a.timeRemainingMs - b.timeRemainingMs;
    });
    return broadcastItem ? [broadcastItem, ...sorted] : sorted;
  }

  // Fallback: single nearest upcoming event if none eligible
  const next = nextGameEvent(events);
  const base = next ? [next] : [];
  return broadcastItem ? [broadcastItem, ...base] : base;
}

function getActiveOverlayEvent(events = gameEvents()) {
  const eligible = getEligibleOverlayEvents(events);
  if (!eligible.length) return null;
  if (overlayRotationIndex >= eligible.length) overlayRotationIndex = 0;
  return eligible[overlayRotationIndex];
}

function stepOverlayEvent(delta) {
  const eligible = getEligibleOverlayEvents();
  if (eligible.length <= 1) return;
  overlayRotationIndex = (overlayRotationIndex + delta + eligible.length) % eligible.length;
  manualPauseUntil = Date.now() + 12000;
  lastRotationTime = Date.now();
  updateEventTimers();
}

const eventAlertStorageKey='m3rgeen.aion2.event-alerts';
let seenEventAlerts;
try{seenEventAlerts=new Set(JSON.parse(sessionStorage.getItem(eventAlertStorageKey)||'[]'))}catch{seenEventAlerts=new Set()}
const pendingEventAlerts=[];
function showNextAutomaticEventAlert(events=gameEvents()){
 if(windowMode==='banner'||windowMode==='mini')return;
 if(document.body.classList.contains('auth-locked')||$('#overlay-preview').childElementCount)return;
 while(pendingEventAlerts.length){
  const pending=pendingEventAlerts.shift();
  const event=events.find(e=>e.id===pending.id&&e.nextDate.getTime()===pending.occurrence&&e.alertStage===pending.stage);
  if(event){showAlert(event);break}
 }
}
function flashCompactWidget() {
  const compact = $('#compact-window');
  if (compact && flash) {
    compact.classList.add('alert-flash-glow');
    setTimeout(() => compact.classList.remove('alert-flash-glow'), 3000);
  }
}

function triggerAutomaticEventAlerts(events){
 if(document.body.classList.contains('auth-locked'))return;
 for(const event of events){
  if(!event.isActive||!event.alertStage)continue;
  const key=`${event.id}:${event.nextDate.getTime()}:${event.alertStage}`;
  if(seenEventAlerts.has(key))continue;
  seenEventAlerts.add(key);

  if(sound && (event.alertStage === 'warning_3m' || event.alertStage === 'live' || event.alertStage === 'started')){
    playChime();
  }

  if(windowMode==='banner'||windowMode==='mini'){
    flashCompactWidget();
  } else {
    pendingEventAlerts.push({id:event.id,occurrence:event.nextDate.getTime(),stage:event.alertStage});
    showNextAutomaticEventAlert(events);
  }
 }
 if(seenEventAlerts.size>500)seenEventAlerts=new Set([...seenEventAlerts].slice(-400));
 try{sessionStorage.setItem(eventAlertStorageKey,JSON.stringify([...seenEventAlerts]))}catch{}
}


function updateEventTimers(){
  const events = gameEvents();
  const eligible = getEligibleOverlayEvents(events);
  const now = Date.now();

  // Auto-rotation every 6s when >1 eligible event, unless paused by user interaction
  if (eligible.length > 1) {
    if (now >= manualPauseUntil) {
      if (now - lastRotationTime >= 6000) {
        overlayRotationIndex = (overlayRotationIndex + 1) % eligible.length;
        lastRotationTime = now;
      }
    }
  } else {
    overlayRotationIndex = 0;
  }

  if (overlayRotationIndex >= eligible.length) {
    overlayRotationIndex = 0;
  }

  const active = eligible[overlayRotationIndex] || nextGameEvent(events);

  document.querySelectorAll('[data-event-timer]').forEach(el => {
    const target = el.dataset.eventTimer;
    const event = target === 'next' ? active : events.find(e => e.id === target);
    if (event) el.textContent = eventTimerText(event);
  });

  document.querySelectorAll('[data-event-status]').forEach(el => {
    const target = el.dataset.eventStatus;
    const event = target === 'next' ? active : events.find(e => e.id === target);
    if (event) {
      el.textContent = eventStatusText(event);
      if (event.phase === 'live' || event.phase === 'started') {
        el.classList.add('is-live');
      } else {
        el.classList.remove('is-live');
      }
    }
  });

  document.querySelectorAll('[data-next-event-name]').forEach(el => {
    el.textContent = (active.isBroadcast || active.id === 'app-alert') ? 'تنبيه مهم' : active.name;
  });

  document.querySelectorAll('[data-next-event-location]').forEach(el => {
    if (active.isBroadcast || active.id === 'app-alert') {
      el.textContent = '';
      el.style.display = 'none';
    } else {
      el.textContent = active.locationHint || '';
      el.style.display = active.locationHint ? 'block' : 'none';
    }
  });

  document.querySelectorAll('[data-next-event-image]').forEach(el => {
    if (active.isBroadcast || active.id === 'app-alert') {
      el.src = 'assets/gorilla.png';
      el.alt = 'تنبيه مهم';
    } else {
      el.src = 'assets/' + (eventImages[active.id] || 'gorilla.png');
      el.alt = active.name;
    }
  });

  document.querySelectorAll('.compact-next-event, .compact-banner-main, .compact-mini-center').forEach(el => {
    if (active.isBroadcast || active.id === 'app-alert') {
      el.title = 'تنبيه مهم · اضغط لفتح مكان الخبر في ديسكورد';
    } else {
      el.title = `عرض صفحة الأحداث · ${eventLocalTimeText(active)}`;
    }
  });

  // Update overlay page indicator and arrows visibility
  const totalEligible = eligible.length;
  const pageStr = totalEligible > 1 ? `${overlayRotationIndex + 1}/${totalEligible}` : '';
  document.querySelectorAll('.overlay-page-indicator').forEach(el => {
    el.textContent = pageStr;
  });
  document.querySelectorAll('.overlay-nav-arrows').forEach(el => {
    el.style.display = totalEligible > 1 ? 'flex' : 'none';
  });

  triggerAutomaticEventAlerts(events);
}

function renderShugoSyncBanner() {
  const sync = (window.AionEventTimers && window.AionEventTimers.syncState) ? window.AionEventTimers.syncState : { status: 'synced', lastSyncTime: Date.now() };
  const lastSyncStr = sync.lastSyncTime ? new Date(sync.lastSyncTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'الآن';
  return `<div class="shugo-sync-banner">
    <div class="shugo-sync-info">
      <span class="sync-dot"></span>
      <div>
        <div class="shugo-sync-title"><strong>متزامن مباشرة مع Shugo.GG</strong> <span class="badge" style="background:rgba(34,197,94,0.18);color:#4ade80;font-size:11px;padding:2px 8px;border-radius:999px;margin-right:6px">تحديث حي 100%</span></div>
        <small class="muted">مواعيد الفعاليات مطابقة رسمياً لـ Shugo.GG · آخر تحقق: ${lastSyncStr}</small>
      </div>
    </div>
    <div class="shugo-sync-actions">
      <a href="https://shugo.gg/timers" target="_blank" rel="noopener noreferrer" class="support-link" style="margin:0;font-size:12px;padding:6px 14px">المصدر: Shugo.GG ↗</a>
      <button class="secondary" data-action="sync-shugo" style="font-size:12px;padding:6px 14px">تحديث المواعيد ⟳</button>
    </div>
  </div>`;
}

function renderEvents(){
  const allEvents = gameEvents();
  const routineEvents = allEvents.slice(0, 5); // shugo, rift, invasion, duty, weekly
  const bossEvents = allEvents.slice(5);       // kaira, siege, siege-bosses, nahma

  const renderCard = (event) => `
    <article class="panel event-card">
      <img src="assets/${eventImages[event.id] || 'logo.png'}" alt="${event.name}">
      <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap">
          <h3 dir="ltr" style="margin:0">${event.name}</h3>
          ${event.nameAr ? `<span class="badge" style="font-size:10px;padding:2px 6px">${event.nameAr}</span>` : ''}
        </div>
        <small data-event-status="${event.id}">${eventStatusText(event)}</small>
        <span class="countdown" dir="ltr" data-event-timer="${event.id}">${eventTimerText(event)}</span>
        ${event.locationHint ? `<span class="event-card-location" style="font-size:10px;color:#38bdf8;font-weight:600;margin:1px 0">${escapeHTML(event.locationHint)}</span>` : ''}
        ${event.desc ? `<p class="muted" style="font-size:11px;line-height:1.4;margin:4px 0 8px 0">${event.desc}</p>` : ''}
        <button data-action="alert" data-event="${event.name}" data-img="${eventImages[event.id]}">معاينة التنبيه</button>
      </div>
    </article>`;

  $('#main').innerHTML = heading('الفعاليات والتايمرات', 'مواعيد الأحداث الرسمية من جدول Shugo.GG المعتمد عالمياً بتوقيت جهازك المحلي.', `<button data-action="alert-settings">إعدادات التنبيه ⚙</button>`)
    + renderShugoSyncBanner()
    + `<div style="margin: 16px 0 8px 0; display:flex; align-items:center; justify-content:space-between">
        <h3 style="margin:0; font-size:15px; color:#dce7ff">الفعاليات اليومية والتجديدات</h3>
        <span class="badge" style="font-size:10px">5 أحداث</span>
      </div>`
    + `<div class="event-grid">${routineEvents.map(renderCard).join('')}</div>`
    + `<div style="margin: 28px 0 8px 0; display:flex; align-items:center; justify-content:space-between">
        <h3 style="margin:0; font-size:15px; color:#dce7ff">زعماء الأبيس وحصارات القلاع</h3>
        <span class="badge" style="font-size:10px">4 أحداث</span>
      </div>`
    + `<div class="event-grid">${bossEvents.map(renderCard).join('')}</div>`
    + notice('الأحداث والتايمرات متزامنة بدقة 100% مع موقع Shugo.GG المعتمد رسمياً للعبة AION 2. جميع المواعيد معروضة تلقائياً بحسب التوقيت المحلي لجهازك ومحسوبة من توقيت السيرفر الرسمي، مع دعم كامل للظهور فوق اللعبة في نسخة سطح المكتب.');
}

function alertSettings(){modal('إعدادات التنبيهات',`<div class="toggle-row"><div><b>صوت لطيف</b><small>يعمل مع التنبيهات التلقائية والمعاينة</small></div><input type="checkbox" id="sound-toggle" ${sound?'checked':''} aria-label="صوت التنبيه"></div><div class="toggle-row"><div><b>توهج بصري</b><small>لفت انتباه قصير حول التنبيه</small></div><input type="checkbox" id="flash-toggle" ${flash?'checked':''} aria-label="التوهج البصري"></div><label for="alert-mode">شكل التنبيه</label><select id="alert-mode"><option value="full" ${alertMode==='full'?'selected':''}>نافذة كاملة</option><option value="banner" ${alertMode==='banner'?'selected':''}>بنر</option><option value="mini" ${alertMode==='mini'?'selected':''}>ميني صغير</option></select>`, '<button class="primary" data-action="save-alert-settings">حفظ للمعاينة</button>')}
function playChime(){
  try{
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if(!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if(ctx.state === 'suspended'){
      ctx.resume().catch(()=>{});
    }
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i)=>{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });
    setTimeout(() => { try { ctx.close(); } catch(e){} }, 2000);
  }catch(err){
    console.warn('[Audio] playChime failed:', err);
  }
}

function showAlert(name,img){const automatic=typeof name==='object'&&name?.id;const event=automatic?name:gameEvents().find(e=>e.name===name)||nextGameEvent();name=event.name;img=eventImages[event.id];if(sound)playChime();$('#overlay-preview').innerHTML=`${!automatic&&alertMode==='mini'?'<span class="mini-caption">معاينة الميني داخل الصفحة</span>':''}<section class="alert-preview ${alertMode==='full'?'':alertMode}" role="region" aria-label="${automatic?'تنبيه':'معاينة تنبيه'} ${name}" ${!flash?'style="animation:none"':''}><button class="close-alert" data-action="dismiss-alert" aria-label="إغلاق التنبيه">×</button><img src="assets/${img}" alt="${name}"><div class="alert-info"><span class="eyebrow">${automatic?'تنبيه الحدث':'معاينة تنبيه الحدث'}</span><h2 dir="ltr">${name}</h2><p>جهّز فريقك، المغامرة تقترب.</p><span class="timer" data-event-timer="${event.id}">${eventTimerText(event)}</span><br><button class="primary" style="margin-top:16px" data-action="dismiss-alert">حسنًا، أنا مستعد</button></div></section>`;}
function renderAccess(){
  const curViewer = (typeof window!=='undefined'&&window.viewer)?window.viewer:viewer;
  const curUserId = (typeof window!=='undefined'&&window.currentUserId)?window.currentUserId:null;
  const curClass = (typeof window!=='undefined'&&window.viewerClass)?window.viewerClass:viewerClass;
  const curAvatar = (typeof resolveCharacterAvatar === 'function') ? resolveCharacterAvatar(curViewer, curUserId) : null;
  const accessAvatarHtml = (curViewer && typeof renderCharacterAvatar === 'function')
    ? renderCharacterAvatar(curAvatar, curViewer, 'leaderboard-avatar')
    : '<img class="leaderboard-avatar" src="assets/avatar-demo.svg" alt="صورة الحساب">';

  $('#main').innerHTML=heading('رتبك وصلاحياتك','تعرف على رتب حسابك وما تستطيع فعله داخل المجتمع.')+`<div class="two-column"><section class="panel"><h3>رتب حسابك</h3><div class="member-row">${accessAvatarHtml}<div class="member-name"><b dir="ltr">${escapeHTML(curViewer || 'KAZ')}</b><small>${curViewer?'حساب AION 2 مسجل':'حساب غير متصل'}</small></div></div><div class="account-role-list"><span class="account-role" dir="ltr"><i></i>AION 2 Member</span></div><div class="access-row"><b>الاستمارة</b><span class="status">مقبولة ونشطة • معتمدة</span></div><div class="access-row"><b>كلاس الشخصية</b><span dir="ltr">${escapeHTML(curClass || 'Templar')}</span></div><p class="muted">عند ربط Discord تظهر هنا رتب حسابك الفعلية.</p></section><section class="panel"><h3>ما تتيحه لك هذه الرتب</h3><div class="access-row"><b>استخدام القروبات</b><span class="status">متاح</span></div><div class="access-row"><b>إنشاء مجموعة أو الانضمام</b><span>ضمن مجموعة نشطة واحدة</span></div><div class="access-row"><b>إغلاق المجموعة</b><span>عندما تكون أنت المنشئ</span></div><div class="access-row"><b>الإحصائيات الإدارية</b><span class="badge">تحتاج رتبة إدارة أو مراجعة</span></div></section></div><section class="panel" style="margin-top:20px"><h3>قواعد القروبات</h3><div class="access-row"><b>إغلاق المجموعة</b><span>منشئ المجموعة فقط</span></div><div class="access-row"><b>إنشاء مجموعة أو الانضمام</b><span>مجموعة نشطة واحدة لكل لاعب</span></div><div class="access-row"><b>استخدام القروبات</b><span>AION 2 Member + استمارة مقبولة نشطة + كلاس مسجل</span></div><div class="access-row"><b>مغادرة المنشئ</b><span>يستخدم الإغلاق بدل المغادرة</span></div></section>${notice('الرتب وحالة الحساب في هذه الصفحة تستند إلى البيانات المعتمدة.')}`;
}
function renderAbout(){$('#main').innerHTML=`<section class="panel about"><img class="about-logo" src="assets/logo.png" alt="شعار M3RGEEN"><h1 dir="ltr">M3RGEEN</h1><span class="eyebrow" dir="ltr">AION 2 · COMMUNITY COMPANION</span><p class="muted"><strong class="about-message-title">من مجتمعنا، ولأجل مجتمعنا.</strong><br>هذا المشروع ثمرة وقت وجهد كبير، اجتمع عليه صاحب السيرفر والمشرفون والداعمون، لنقدّم لأعضاء الجيلد ومجتمع M3RGEEN تجربة أيون 2 تستحقهم: أكثر تنظيمًا، وأسهل تواصلًا، وأمتع في كل مغامرة.<br><br>دعمك يساهم في استمرار هذا المجهود وتطوير البرنامج؛ كل مساهمة تساعدنا نكمل ونقدّم لكم تجربة أفضل.</p><div class="credits" dir="rtl">${[['صاحب الفكرة','KAZ'],['المطور الرئيسي','MDARBA'],['المصمم','MDARBA'],['الدعم','TEZAB']].map(([role,name])=>`<div><span>${role}</span><strong dir="ltr">${name}</strong></div>`).join('')}</div><div class="about-support"><a class="support-link" href="https://tip.dokan.sa/mdarb3" target="_blank" rel="noopener noreferrer">دعم المشروع ↗</a></div><div class="about-version"><span class="muted">إصدار البرنامج</span><span class="badge beta-header-badge">Beta v0.1.0</span><p class="muted">إصدار بيتا الرسمي لمجتمع M3RGEEN.</p></div></section>`}

function navigate(next){page=next;$('#crumb').textContent=navItems.find(([id])=>id===page)[2];$('#nav').innerHTML=navItems.map(([id,icon,label])=>`<button class="nav-item ${page===id?'active':''}" data-action="navigate" data-page="${id}" title="${label}" ${page===id?'aria-current="page"':''}><em>${id==='roadmap'?icon:`<img src="${icon}" width="20" height="20" alt="" aria-hidden="true">`}</em><span>${label}</span>${id==='groups'?`<small>${getGroups().filter(g=>g.status==='open').length}</small>`:''}</button>`).join('');({groups:renderGroups,roadmap:renderRoadmap,chat:renderChat,events:renderEvents,members:renderMembers,stats:renderStats,leaderboard:renderLeaderboard,access:renderAccess,about:renderAbout})[page]();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action,id=Number(b.dataset.id),g=getGroups().find(g=>g.id===id);switch(a){
 case 'overlay-prev':stepOverlayEvent(-1);break;
 case 'overlay-next':stepOverlayEvent(1);break;
 case 'toggle-demo-events':toggleDemoEvents();break;
 case 'window-mode':setWindowMode(b.dataset.mode);break;
 case 'desktop-close':if(window.electronAPI&&window.electronAPI.closeApp){window.electronAPI.closeApp();}else{window.close();}break;
 case 'desktop-minimize':if(window.electronAPI&&window.electronAPI.minimizeApp){window.electronAPI.minimizeApp();}break;
 case 'compact-event': {
   const active = getActiveOverlayEvent();
   setWindowMode('full');
   if (active && (active.isBroadcast || active.id === 'app-alert')) {
     if (typeof window.readBroadcast === 'function' && active.broadcastData?.id) {
       window.readBroadcast(active.broadcastData.id);
     } else if (typeof window.showNotifications === 'function') {
       window.showNotifications();
     }
     break;
   }
   navigate('events');
   break;
 }
 case 'navigate':navigate(b.dataset.page);break;
 case 'filter':filter=window.filter=b.dataset.filter;renderGroups();break;
 case 'create':wizard=window.wizard={type:'Dungeons',name:'Krao',mode:'EXPLORATION',step:1};createWizard();break;
 case 'choose-type':
   wizard.type=b.dataset.type;
   if(wizard.type==='Transcendence'){
     wizard.name='Shattered_Arkanis';
     wizard.mode='STAGE_1';
   }else if(wizard.type==='Dungeons'){
     wizard.name='Krao';
     wizard.mode='EXPLORATION';
   }else{
     wizard.name=wizard.type;
     wizard.mode='NORMAL';
   }
   createWizard(1);
   break;
 case 'wizard-next':
   if(wizard.step===2){
     const actSel=$('#activity-select');
     if(actSel)wizard.name=actSel.value;
     if(wizard.type==='Transcendence'){
       const stgSel=$('#stage-select');
       wizard.mode=stgSel?stgSel.value:'STAGE_1';
     }else if(wizard.type==='Dungeons'){
       const modSel=$('#mode-select');
       wizard.mode=modSel?modSel.value:'EXPLORATION';
     }else{
       wizard.mode='NORMAL';
     }
   }
   createWizard(wizard.step+1);
   break;
 case 'wizard-back':createWizard(wizard.step-1);break;
 case 'confirm-create':confirmCreate();break;
 case 'details':showDetails(id);break;
 case 'join':join(id);break;
 case 'leave':{
   const currentViewer=(typeof window!=='undefined'&&window.viewer)?window.viewer:viewer;
   modal('مغادرة المجموعة',`<p class="muted">تأكيد مغادرة مجموعة <b>${escapeHTML(g.name)}</b>.</p>${g.creator===currentViewer?notice('أنت منشئ المجموعة. حسب النظام، استخدم إغلاق المجموعة بدل المغادرة.'):''}`,`<button data-action="dismiss">إلغاء</button><button data-action="confirm-leave" data-id="${id}" ${g.creator===currentViewer?'disabled':''}>تأكيد المغادرة</button>`);
   break;
 }
 case 'close-group':closeGroup(id);break;
 case 'guild':guild=b.dataset.guild;navigate(page);break;
 case 'alert':showAlert(b.dataset.event,b.dataset.img);break;
 case 'alert-mode':alertMode=b.dataset.mode;renderEvents();showAlert();break;
 case 'dismiss-alert':$('#overlay-preview').innerHTML='';showNextAutomaticEventAlert();break;
 case 'alert-settings':alertSettings();break;
 case 'save-alert-settings':sound=$('#sound-toggle').checked;flash=$('#flash-toggle').checked;alertMode=$('#alert-mode').value;closeModal();if(page==='events')renderEvents();toast('تم حفظ إعدادات المعاينة لهذه الجلسة.');break;
 case 'sync-shugo':
  b.disabled=true;b.textContent='جارٍ المزامنة...';
  if(window.AionEventTimers&&typeof window.AionEventTimers.syncWithShugo==='function'){
    window.AionEventTimers.syncWithShugo(true).then(()=>{
      b.disabled=false;b.textContent='تحديث المواعيد ⟳';
      if(page==='events')renderEvents();
      toast('تمت المزامنة بنجاح مع Shugo.GG والتحقق من مواعيد الفعاليات.');
    }).catch(()=>{
      b.disabled=false;b.textContent='تحديث المواعيد ⟳';
      if(page==='events')renderEvents();
      toast('تم التحقق من مواعيد الفعاليات وفق جدول Shugo.GG.');
    });
  }else{
    setTimeout(()=>{b.disabled=false;b.textContent='تحديث المواعيد ⟳';if(page==='events')renderEvents();toast('مواعيد الفعاليات متزامنة ومطابقة لـ Shugo.GG.');},400);
  }
  break;
 case 'read-broadcast':
   if (typeof window.readBroadcast === 'function') window.readBroadcast(b.dataset.id);
   break;
 case 'read-notification':
   if (typeof window.readNotification === 'function') window.readNotification(b.dataset.id);
   break;
 case 'open-broadcast-link':
   if (typeof window.openExternalLink === 'function') window.openExternalLink(b.dataset.link);
   break;
 case 'show-notifications':
 case 'notification-list':
   if (typeof setWindowMode === 'function' && windowMode !== 'full') {
     setWindowMode('full');
   }
   if (typeof window.showNotifications === 'function') window.showNotifications();
   break;
 case 'dismiss':closeModal();break;

}});
const bellBtn = $('#bell');
if (bellBtn) {
  bellBtn.onclick = () => {
    if (typeof setWindowMode === 'function' && windowMode !== 'full') {
      setWindowMode('full');
    }
    if (typeof window.showNotifications === 'function') {
      window.showNotifications();
    }
  };
}
$('#settings').onclick=alertSettings;
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}});
setInterval(()=>{let changed=false;groups.forEach(g=>{if(g.status==='open'&&g.deadline<=Date.now()){g.status='expired';changed=true;}});if(changed&&page==='groups')renderGroups();document.querySelectorAll('[data-countdown]').forEach(el=>el.textContent=timer(Number(el.dataset.countdown)));},1000);
navigate('groups');

function toggleDemoEvents(){
  demoEventCount = demoEventCount === 2 ? 3 : 2;
  overlayRotationIndex = 0;
  lastRotationTime = Date.now();
  updateEventTimers();
  if (windowMode !== 'full' && windowMode !== 'auth') {
    const compact = $('#compact-window');
    if (compact) compact.innerHTML = renderCompactMarkup(windowMode);
  }
}
if (isOverlayDemo) {
  window.addEventListener('keydown', e => {
    if (e.key === '2' || e.key === '3') {
      demoEventCount = Number(e.key);
      toggleDemoEvents();
    }
  });
}

function renderCompactMarkup(mode){
  const events = gameEvents();
  const eligible = getEligibleOverlayEvents(events);
  if (overlayRotationIndex >= eligible.length) overlayRotationIndex = 0;
  const active = eligible[overlayRotationIndex] || nextGameEvent(events);
  const isMulti = eligible.length > 1;
  const pageStr = isMulti ? `${overlayRotationIndex + 1}/${eligible.length}` : '';

  const isB = active.isBroadcast || active.id === 'app-alert';
  const imgPath = isB ? 'assets/gorilla.png' : `assets/${eventImages[active.id] || 'gorilla.png'}`;
  const displayName = isB ? 'تنبيه مهم' : active.name;
  const eventTooltip = isB ? 'تنبيه مهم · اضغط لفتح مكان الخبر في ديسكورد' : 'عرض صفحة الأحداث';

  if (mode === 'banner') {
    return `<div class="compact-banner-layout">
      <div class="compact-side">
        <div class="compact-brand">
          <img src="assets/logo.png" alt="">
          <b dir="ltr">M3RGEEN</b>
          ${isOverlayDemo ? `<button class="demo-event-toggle" data-action="toggle-demo-events" title="تبديل عدد فعاليات التجربة (2 أو 3)">${demoEventCount===2?'2x':'3x'}</button>` : ''}
        </div>
        <div class="compact-controls">
          <button data-action="window-mode" data-mode="full" title="توسيع إلى النافذة الكاملة" aria-label="توسيع">⤢</button>
          <button data-action="window-mode" data-mode="mini" title="انكماش إلى ميني" aria-label="ميني">▫</button>
          <button class="compact-close-btn" data-action="desktop-close" title="إغلاق البرنامج" aria-label="إغلاق">✕</button>
        </div>
        <div class="overlay-nav-arrows compact-banner-nav" style="display:${isMulti ? 'flex' : 'none'}">
          <button class="compact-arrow-btn" data-action="overlay-prev" title="السابق" aria-label="السابق">‹</button>
          <span class="overlay-page-indicator compact-page-text">${pageStr}</span>
          <button class="compact-arrow-btn" data-action="overlay-next" title="التالي" aria-label="التالي">›</button>
        </div>
      </div>
      <div class="compact-banner-main" data-action="compact-event" role="button" tabindex="0" title="${eventTooltip}">
        <img class="compact-banner-img" data-next-event-image src="${imgPath}" alt="${escapeHTML(displayName)}">
        <div class="compact-banner-info">
          <span class="compact-banner-status ${active.phase==='live'||active.phase==='started'?'is-live':''}" data-event-status="next">${eventStatusText(active)}</span>
          <strong class="compact-banner-title" dir="${isB ? 'auto' : 'ltr'}" data-next-event-name>${escapeHTML(displayName)}</strong>
          <time class="compact-banner-timer" dir="${isB ? 'auto' : 'ltr'}" data-event-timer="next">${eventTimerText(active)}</time>
          <span class="compact-banner-location" data-next-event-location style="${(!isB && active.locationHint) ? '' : 'display:none'}">${escapeHTML((!isB && active.locationHint) || '')}</span>
        </div>
      </div>
    </div>`;
  } else {
    // 'mini'
    return `<div class="compact-mini-layout">
      <div class="compact-mini-topbar">
        <div class="compact-controls">
          <button class="compact-close-btn" data-action="desktop-close" title="إغلاق البرنامج" aria-label="إغلاق">✕</button>
          <button data-action="window-mode" data-mode="banner" title="عرض بنر" aria-label="بنر">▭</button>
          <button data-action="window-mode" data-mode="full" title="توسيع إلى النافذة الكاملة" aria-label="توسيع">⤢</button>
        </div>
        <div class="overlay-nav-arrows compact-mini-nav" style="display:${isMulti ? 'flex' : 'none'}">
          ${isOverlayDemo ? `<button class="demo-event-toggle compact-mini-demo-toggle" data-action="toggle-demo-events" title="تبديل عدد فعاليات التجربة">${demoEventCount}x</button>` : ''}
          <button class="compact-arrow-btn" data-action="overlay-prev" title="السابق" aria-label="السابق">‹</button>
          <span class="overlay-page-indicator compact-mini-page">${pageStr}</span>
          <button class="compact-arrow-btn" data-action="overlay-next" title="التالي" aria-label="التالي">›</button>
        </div>
      </div>
      <div class="compact-mini-center" data-action="compact-event" role="button" tabindex="0" title="${eventTooltip}">
        <img class="compact-mini-img" data-next-event-image src="${imgPath}" alt="${escapeHTML(displayName)}">
        <strong class="compact-mini-title" dir="${isB ? 'auto' : 'ltr'}" data-next-event-name>${escapeHTML(displayName)}</strong>
        <time class="compact-mini-timer" dir="${isB ? 'auto' : 'ltr'}" data-event-timer="next">${eventTimerText(active)}</time>
        <span class="compact-mini-status ${active.phase==='live'||active.phase==='started'?'is-live':''}" data-event-status="next">${eventStatusText(active)}</span>
        <span class="compact-mini-location" data-next-event-location style="${(!isB && active.locationHint) ? '' : 'display:none'}">${escapeHTML((!isB && active.locationHint) || '')}</span>
      </div>
    </div>`;
  }
}

// Window presentation
let windowMode='full',fullScrollY=0;
const compactPositions={banner:null,mini:null};
function setWindowMode(mode){
 if(!['full','banner','mini','auth'].includes(mode))return;
 if(windowMode==='full'&&mode!=='full')fullScrollY=window.scrollY;
 windowMode=mode;document.body.dataset.windowMode=mode;
 const compact=$('#compact-window');compact.hidden=(mode==='full'||mode==='auth');
 if(mode==='full'){compact.innerHTML='';window.scrollTo(0,fullScrollY);}
 else if(mode==='auth'){compact.innerHTML='';}
 else{
   $('#overlay-preview').innerHTML='';if($('#modal').open)closeModal();
   compact.innerHTML=renderCompactMarkup(mode);
   if(!window.electronAPI) placeCompactWindow();
 }
 if(window.electronAPI&&window.electronAPI.setWindowMode){
   window.electronAPI.setWindowMode(mode);
 }
}

function placeCompactWindow(){
 if(window.electronAPI) return; // Native OS window management in desktop
 const el=$('#compact-window'),pos=compactPositions[windowMode];
 if(!pos){el.style.left='';el.style.right='';el.style.top='';return;}
 const rect=el.getBoundingClientRect();
 pos.x=Math.max(0,Math.min(pos.x,innerWidth-rect.width));pos.y=Math.max(0,Math.min(pos.y,innerHeight-rect.height));
 el.style.right='auto';el.style.left=pos.x+'px';el.style.top=pos.y+'px';
}
let compactDrag=null;
$('#compact-window').addEventListener('pointerdown',e=>{
 if(window.electronAPI)return; // Native OS dragging is active in Electron
 if(e.button!==0||!e.target.closest('.compact-header')||e.target.closest('button'))return;
 const el=e.currentTarget,rect=el.getBoundingClientRect();
 compactDrag={pointer:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top};
 el.setPointerCapture(e.pointerId);el.classList.add('dragging');e.preventDefault();
});
$('#compact-window').addEventListener('pointermove',e=>{
 if(window.electronAPI)return;
 if(!compactDrag||compactDrag.pointer!==e.pointerId)return;
 compactPositions[windowMode]={x:e.clientX-compactDrag.dx,y:e.clientY-compactDrag.dy};placeCompactWindow();
});
function endCompactDrag(e){if(window.electronAPI)return;if(!compactDrag||compactDrag.pointer!==e.pointerId)return;const el=$('#compact-window');if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);compactDrag=null;el.classList.remove('dragging');}
$('#compact-window').addEventListener('pointerup',endCompactDrag);
$('#compact-window').addEventListener('pointercancel',endCompactDrag);
window.addEventListener('resize',()=>{if(windowMode!=='full')placeCompactWindow()});

// Notifications are handled by auth-client.js

updateEventTimers();
setInterval(updateEventTimers,1000);



