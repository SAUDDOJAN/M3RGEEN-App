// AION 2 Roadmap - Progression Tracker & Stage Detection
const roadmapProgress = { level: 45, gearScore: 1400 };
const roadmapChecks = new Set();
const roadmapStageExpanded = new Set();
const roadmapDetailsExpanded = new Set();
let roadmapStageInitialized = false;
let roadmapLastLoadedUserId = null;

function getRoadmapStorageKey() {
  const uid = (typeof window !== 'undefined' && (window.currentUserId || (window.currentUser && window.currentUser.id))) || 'guest';
  return 'aion2_roadmap_checks_' + uid;
}

function loadRoadmapChecks() {
  const currentUid = (typeof window !== 'undefined' && (window.currentUserId || (window.currentUser && window.currentUser.id))) || 'guest';
  if (roadmapLastLoadedUserId === currentUid) return;
  roadmapLastLoadedUserId = currentUid;
  roadmapChecks.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(getRoadmapStorageKey());
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          arr.forEach(k => roadmapChecks.add(k));
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load roadmap checks from localStorage:', e);
  }
}

function saveRoadmapChecks() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(getRoadmapStorageKey(), JSON.stringify([...roadmapChecks]));
    }
  } catch (e) {
    console.warn('Failed to save roadmap checks to localStorage:', e);
  }
}

function syncRoadmapWithUser() {
  const user = (typeof window !== 'undefined' && (window.currentUser || window.user)) || null;
  const aion2 = user && (user.aion2Profile || user.character_data);
  const realIlvl = aion2 && (aion2.item_level || (user.character_data && user.character_data.itemLevel));
  const realLvl = aion2 && aion2.character_level;
  
  if (realIlvl && Number(realIlvl) > 0) {
    roadmapProgress.gearScore = Number(realIlvl);
    if (realLvl && Number(realLvl) > 0) {
      roadmapProgress.level = Number(realLvl);
    }
    return true; // auto-synced
  }
  return false; // manual / fallback
}

function roadmapStageIndex(level, gearScore) {
  if (level < 1) return 0;
  if (level < 45) return 1;
  if (gearScore < 900) return 2;
  if (gearScore < 1000) return 3;
  if (gearScore < 1100) return 4;
  if (gearScore < 1300) return 5;
  if (gearScore < 1400) return 6;
  if (gearScore < 1600) return 7;
  if (gearScore < 1800) return 8;
  if (gearScore < 1900) return 9;
  if (gearScore < 2000) return 10;
  return 11;
}

function roadmapChecklist(items, stageId, kind = 'details') {
  return `<div class="roadmap-checklist">${items.map((item, index) => {
    const key = `${stageId}:${kind}:${index}`;
    return `<label class="roadmap-check"><input type="checkbox" data-roadmap-check="${key}" ${roadmapChecks.has(key) ? 'checked' : ''}><span>${escapeHTML(item)}</span></label>`;
  }).join('')}</div>`;
}

function renderRoadmap() {
  loadRoadmapChecks();
  const isAuto = syncRoadmapWithUser();
  const data = window.AionRoadmapData;
  if (!data) return;

  const current = roadmapStageIndex(roadmapProgress.level, roadmapProgress.gearScore);
  const stage = data.stages[current] || data.stages[0];
  if (!roadmapStageInitialized) {
    roadmapStageExpanded.add(stage.id);
    roadmapStageInitialized = true;
  }
  const routine = data.routine.filter(item => item.from <= current);
  const priorityList = items => `<ul class="roadmap-priorities">${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
  const cards = data.stages.map((item, index) => {
    const state = index < current ? 'done' : index === current ? 'current' : 'future';
    const stateLabel = state === 'done' ? '✓ مكتمل' : state === 'current' ? '● مرحلتك الحالية' : '○ قادم';
    const stageIsExpanded = roadmapStageExpanded.has(item.id);
    const details = `<div class="roadmap-detail-body"><span class="roadmap-source">من الماستر روتيشن · الخطوات ${escapeHTML(item.source)}</span>${roadmapChecklist(item.details, item.id)}${item.id === 'final2000' ? `<div class="roadmap-final-check"><h4>آخر تشيك قبل ما تعتبر مرحلة 2000 منتهية</h4>${roadmapChecklist(data.finalChecklist, item.id, 'final')}</div>` : ''}</div>`;
    return `<article class="panel roadmap-stage ${state} ${stageIsExpanded ? 'expanded' : 'collapsed'}" data-roadmap-stage="${item.id}"><div class="roadmap-marker" aria-hidden="true">${state === 'done' ? '✓' : state === 'current' ? '●' : '○'}</div><div class="roadmap-stage-top"><div><span class="roadmap-step">المحطة ${String(index + 1).padStart(2, '0')} · ${escapeHTML(item.source)}</span><h3>${escapeHTML(item.title)}</h3></div><div class="roadmap-stage-actions"><span class="roadmap-status ${state}">${stateLabel}</span><button class="roadmap-stage-toggle" type="button" data-roadmap-stage-toggle="${item.id}" aria-expanded="${stageIsExpanded}" aria-controls="roadmap-stage-content-${item.id}"><span class="roadmap-stage-toggle-label">${stageIsExpanded ? 'طي المحطة' : 'فتح المحطة'}</span><span class="roadmap-stage-toggle-icon" aria-hidden="true">⌄</span></button></div></div><div class="roadmap-stage-meta"><span dir="ltr">${escapeHTML(item.range)}</span><span>الهدف التالي <b>${escapeHTML(item.next)}</b></span></div><div class="roadmap-stage-content" id="roadmap-stage-content-${item.id}" ${stageIsExpanded ? '' : 'hidden'}>${priorityList(item.priorities)}${item.warning ? `<p class="roadmap-warning"><b>انتبه</b> ${escapeHTML(item.warning)}</p>` : ''}${item.parallel?.length ? `<div class="roadmap-parallel"><b>تقدم بالتوازي</b><div>${item.parallel.map(label => `<span dir="auto">${escapeHTML(label)}</span>`).join('')}</div></div>` : ''}<details class="roadmap-details" data-roadmap-details="${item.id}" ${stageIsExpanded && roadmapDetailsExpanded.has(item.id) ? 'open' : ''}><summary>عرض التفاصيل <span aria-hidden="true">⌄</span></summary>${details}</details></div></article>`;
  }).join('');

  const syncBanner = isAuto
    ? `<div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(0,192,243,0.12);border:1px solid rgba(0,192,243,0.3);border-radius:6px;color:#00c0f3;font-size:11px;margin-top:10px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00c0f3"></span> مزامنة تلقائية مع بيانات شخصيتك (Item Level: ${roadmapProgress.gearScore})</div>`
    : `<div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(148,156,171,0.1);border:1px solid rgba(148,156,171,0.25);border-radius:6px;color:#949cab;font-size:11px;margin-top:10px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#949cab"></span> قياس Item Level غير متوفر في ملف الشخصية — تفعيل الوضع اليدوي</div>`;

  document.querySelector('#main').innerHTML = `<section class="roadmap-page">${heading('مسار التطور', 'من بداية الشخصية إلى 2000 Gear Score — خطوة بخطوة بدون حرق الموارد.')}<div class="roadmap-intro"><form id="roadmap-progress-form" class="panel roadmap-input"><div><span class="eyebrow">وين وصلت الآن؟</span><h3>حدد تقدمك</h3><p>المحطة تتحدث تلقائياً مع Item Level، أو يمكنك تعديل القيم يدوياً للمعاينة.</p>${syncBanner}</div><div class="roadmap-fields" style="margin-top:14px"><label>Character Level<input id="roadmap-level" type="number" min="0" max="99" step="1" inputmode="numeric" value="${roadmapProgress.level}" required></label><label>Gear Score / Item Level<input id="roadmap-gs" type="number" min="0" max="9999" step="1" inputmode="numeric" value="${roadmapProgress.gearScore}" required></label><button class="primary" type="submit">تحديث المسار</button></div></form><section class="panel roadmap-current" aria-live="polite"><span class="eyebrow">مرحلتك الحالية</span><h3 dir="ltr">${escapeHTML(stage.range)}</h3><div class="roadmap-next"><span>الهدف التالي</span><strong>${escapeHTML(stage.next)}</strong></div>${priorityList(stage.priorities.slice(0, 3))}${stage.warning ? `<p class="roadmap-warning"><b>انتبه</b> ${escapeHTML(stage.warning)}</p>` : ''}</section></div>${routine.length ? `<section class="panel roadmap-routine"><div><span class="eyebrow">ما يتوقف عند محطة واحدة</span><h3>روتين مستمر</h3></div><div class="roadmap-routine-items">${routine.map(item => `<span>${escapeHTML(item.label)}</span>`).join('')}</div></section>` : ''}<div class="roadmap-section-title"><div><span class="eyebrow">AION 2 · PROGRESSION</span><h2>المحطات الرئيسية</h2></div><small>افتح أي محطة لقراءة تفاصيلها</small></div><div class="roadmap-timeline">${cards}</div></section>`;

  document.querySelector('#roadmap-progress-form').addEventListener('submit', event => {
    event.preventDefault();
    const level = document.querySelector('#roadmap-level');
    const gearScore = document.querySelector('#roadmap-gs');
    if (!level.reportValidity() || !gearScore.reportValidity()) return;
    roadmapProgress.level = Number(level.value);
    roadmapProgress.gearScore = Number(gearScore.value);
    renderRoadmap();
  });
  document.querySelectorAll('[data-roadmap-stage-toggle]').forEach(button => {
    const card = button.closest('.roadmap-stage');
    card.addEventListener('click', event => {
      if (card.classList.contains('collapsed') && !event.target.closest('[data-roadmap-stage-toggle]')) button.click();
    });
    button.addEventListener('click', () => {
      const id = button.dataset.roadmapStageToggle;
      const content = document.getElementById(`roadmap-stage-content-${id}`);
      const isExpanded = roadmapStageExpanded.has(id);
      if (isExpanded) {
        roadmapStageExpanded.delete(id);
        roadmapDetailsExpanded.delete(id);
        content.querySelector('.roadmap-details').open = false;
      } else {
        roadmapStageExpanded.add(id);
      }
      content.hidden = isExpanded;
      card.classList.toggle('expanded', !isExpanded);
      card.classList.toggle('collapsed', isExpanded);
      button.setAttribute('aria-expanded', String(!isExpanded));
      button.querySelector('.roadmap-stage-toggle-label').textContent = isExpanded ? 'فتح المحطة' : 'طي المحطة';
    });
  });
  document.querySelectorAll('[data-roadmap-details]').forEach(el => {
    el.addEventListener('toggle', () => {
      if (el.open) roadmapDetailsExpanded.add(el.dataset.roadmapDetails);
      else roadmapDetailsExpanded.delete(el.dataset.roadmapDetails);
    });
  });
  document.querySelector('.roadmap-page').addEventListener('change', event => {
    const key = event.target.dataset.roadmapCheck;
    if (!key) return;
    if (event.target.checked) roadmapChecks.add(key);
    else roadmapChecks.delete(key);
    saveRoadmapChecks();
  });
}
