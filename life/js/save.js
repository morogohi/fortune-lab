/* =====================================================================
 *  save.js — 인생 체험 중간 저장 · 이어하기
 *   자동 저장 1칸 + 수동 저장 3칸 (이 기기 안에만 저장)
 *   - 선택 창이 없을 때마다 자동 저장, 앱을 닫거나 백그라운드로 갈 때도 저장
 *   - 인생이 끝나면 자동 저장은 지워지고, 수동 저장은 남아요
 * ===================================================================== */
const Save = (() => {
  const KEY = 'p8b_saves', VER = 1, SLOTS = ['auto', 's1', 's2', 's3'];
  const all = () => store.get(KEY, {});
  const put = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const pad = n => String(n).padStart(2, '0');
  const when = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------- 직렬화: Set은 배열로, 함수는 버림, 데이터표 객체는 id로 ---------- */
  const SKIP = new Set(['bubble', 'pendingAd', 'saju', 'skipDeath']);
  function pack() {
    const lines = [...$('#log').children].slice(-200).map(el => [el.className, el.textContent]);
    const data = JSON.stringify(P, function (k, v) {
      if (this === P && SKIP.has(k)) return undefined;
      if (v instanceof Set) return { __set: [...v] };
      if (typeof v === 'function') return undefined;
      return v;
    });
    return { v: VER, t: Date.now(), p: data, log: lines,
      meta: { name: P.name, f: P.country.f, c: P.country.n, age: P.age, year: P.birth.y + P.age, st: stageOf(P.age).n, pol: P.policy || null,
        job: P.job ? P.job.n : null, bk: P.bucket ? P.bucket.filter(b => b.done).length : 0 } };
  }
  function unpack(s) {
    const o = JSON.parse(s.p, (k, v) => (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v);
    // 데이터표 객체 다시 연결
    o.country = COUNTRIES.find(c => c.n === o.country.n) || o.country;
    o.tal = TALENTS.find(t => t.n === o.tal.n) || o.tal;
    o.clsInfo = CLASSES[o.cls] || o.clsInfo;
    if (o.job) o.job = JOBS.find(j => j.id === o.job.id) || o.job;
    ['marks', 'badges', 'seen', 'certs'].forEach(k => { if (!(o[k] instanceof Set)) o[k] = new Set(Array.isArray(o[k]) ? o[k] : []); });
    o.saju = Saju.analyze(o.birth, o.male);
    if (o.saju && o.gaeun && o.gaeun.done && o.gaeun.el != null) o.saju = { ...o.saju, el: o.saju.el.map((v, i) => i === o.gaeun.el ? v + 2 : v) };   // v9 개운 반영
    if (o.mate && o.mate.birth) { o.mate.saju = Saju.analyze(o.mate.birth, o.mate.male); if (o.saju && o.mate.saju) o.mate.c = Saju.compatPair(o.saju, o.mate.saju); }
    if (o.abroad && o.home && o.home.type === 'parents') o.home = { type: o.uniAbroad && o.age < 26 ? 'dorm' : 'abroad', value: 0 };   // 예전 저장: 해외 이주 후에도 부모님 집이던 문제 보정
    o.bubble = null; o.pendingAd = null;
    return o;
  }

  function save(slot, quiet) {
    if (!P || !P.alive) return false;
    if (typeof modalQ !== 'undefined' && modalQ.length && slot === 'auto') return false;
    const o = all(); o[slot] = pack();
    const ok = put(o);
    if (!quiet) { if (ok) { Hub.toast(`💾 ${slot === 'auto' ? '자동' : '슬롯 ' + slot.slice(1)}에 저장했어요`); Snd.sfx('coin'); } else Hub.toast('저장 공간이 부족해요. 다른 슬롯을 지워 주세요'); }
    flashIcon(); paintTitle();
    return ok;
  }
  function load(slot) { const s = all()[slot]; if (s) loadPack(s); }
  function loadPack(s, msg) {
    let o; try { o = unpack(s); } catch (e) { Hub.toast('저장 파일을 읽지 못했어요'); return false; }
    if (window.Grow) Grow.setSpeed(0);
    P = o;
    show('game'); modalQ = []; $('#modal').classList.remove('on'); $('#mini') && $('#mini').classList.remove('on');
    $('#nameTag').textContent = `${P.country.f} ${P.name}`;
    const L = $('#log'); L.innerHTML = '';
    (s.log || []).forEach(([c, t]) => { const d = document.createElement('div'); d.className = c; d.textContent = t; L.appendChild(d); });
    log(msg || `💾 ${when(s.t)}에 저장한 인생을 이어서 살아요`, 'good');
    renderStats(); renderActions(); resize(); Snd.mood(stageOf(P.age).k); Snd.sfx('reveal');
    if (window.Grow) Grow.refresh();
    L.scrollTop = 1e9; return true;
  }
  function remove(slot) { const o = all(); delete o[slot]; put(o); paintTitle(); }

  /* ---------- 자동 저장 ---------- */
  let tmr = null;
  function autoSoon() {
    clearTimeout(tmr);
    tmr = setTimeout(() => { if (P && P.alive && $('#game').classList.contains('on') && !modalQ.length) save('auto', true); }, 700);
  }
  function flashIcon() { const b = $('#saveBtn'); if (b) { b.classList.remove('saved'); void b.offsetWidth; b.classList.add('saved'); } }

  /* ---------- 슬롯 화면 ---------- */
  function slotHTML(slot, s, mode) {
    const lab = slot === 'auto' ? '⏱️ 자동 저장' : `📁 슬롯 ${slot.slice(1)}`;
    if (!s) return `<div class="svslot empty"><div><b>${lab}</b><small>비어 있음</small></div>${mode === 'save' && slot !== 'auto' ? `<button data-a="save" data-s="${slot}">여기에 저장</button>` : ''}</div>`;
    const m = s.meta;
    const pol = m.pol && window.Grow ? (Grow.POL.find(x => x.k === m.pol) || {}).e || '' : '';
    return `<div class="svslot"><div><b>${lab}</b><span>${m.f} ${esc(m.name)} · ${m.age}살 (${m.st})</span>
        <small>${m.year}년 · ${m.job ? m.job + ' · ' : ''}🎯 ${m.bk}/3 ${pol} · ${when(s.t)} 저장</small></div>
      <div class="svbtns">${mode === 'save' && slot !== 'auto' ? `<button data-a="save" data-s="${slot}">덮어쓰기</button>` : ''}<button data-a="load" data-s="${slot}" class="pri">불러오기</button><button data-a="del" data-s="${slot}" class="del">✕</button></div></div>`;
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openSlots(mode) {
    const o = all(), inGame = mode === 'save';
    if (inGame && modalQ.length) { Hub.toast('선택을 마친 뒤에 저장할 수 있어요'); return; }
    openOverlay(inGame ? '💾 인생 저장하기' : '📂 저장한 인생 불러오기',
      SLOTS.map(sl => slotHTML(sl, o[sl], mode)).join('') +
      `<p class="sjnote" style="text-align:center">저장은 이 기기 안에만 돼요. 자동 저장은 선택 창이 없을 때마다 갱신되고, 인생이 끝나면 지워져요.</p>`,
      inGame ? [{ t: '🏠 저장하고 메인 화면으로', pri: 1, keep: 1, f: exitHome }, { t: '계속 하기' }] : [{ t: '닫기' }]);
    document.querySelectorAll('.svslot [data-a]').forEach(b => b.onclick = () => {
      const sl = b.dataset.s, a = b.dataset.a; Snd.sfx('tap');
      if (a === 'save') { save(sl); openSlots(mode); }
      else if (a === 'load') {
        const playing = P && P.alive && $('#game').classList.contains('on');
        if (playing && sl === 'auto') { closeOverlay(); Hub.toast('지금 살고 있는 인생이 바로 자동 저장이에요'); return; }
        if (playing) {
          openOverlay('📂 불러오기', '<p class="sjtxt" style="text-align:center">불러오면 지금 살고 있는 인생은 사라져요.<br>남기고 싶다면 먼저 빈 슬롯에 저장하세요.</p>',
            [{ t: '불러오기', pri: 1, f: () => load(sl) }, { t: '먼저 저장하러 가기', f: () => openSlots('save') }, { t: '취소' }]);
          return;
        }
        closeOverlay(); load(sl);
      }
      else if (a === 'del') {
        openOverlay('🗑️ 저장 지우기', `<p class="sjtxt" style="text-align:center">${sl === 'auto' ? '자동 저장' : '슬롯 ' + sl.slice(1)}을(를) 지울까요? 되돌릴 수 없어요.</p>`,
          [{ t: '지우기', pri: 1, f: () => { remove(sl); openSlots(mode); } }, { t: '취소', f: () => openSlots(mode) }]);
      }
    });
  }

  /* ---------- 저장하고 메인 화면(허브)으로 ---------- */
  function exitHome() {
    if (typeof modalQ !== 'undefined' && modalQ.length) { Hub.toast('지금 뜬 선택을 마친 뒤에 나갈 수 있어요'); return; }
    if (window.Grow) Grow.setSpeed(0);
    const ok = !P || !P.alive || save('auto', true);
    closeOverlay();
    if (!ok) { Hub.toast('저장 공간이 부족해요. 다른 슬롯을 지워 주세요'); return; }
    Hub.go('home');
    Hub.toast('💾 저장했어요 · 인생 게임에서 ▶ 이어하기로 돌아올 수 있어요');
  }
  function askExit() {
    if (typeof modalQ !== 'undefined' && modalQ.length) { Hub.toast('지금 뜬 선택을 마친 뒤에 나갈 수 있어요'); return; }
    if (window.Grow) Grow.setSpeed(0);
    openOverlay('🏠 메인 화면으로', '<p class="sjtxt" style="text-align:center">지금까지의 인생을 자동 저장하고 메인 화면으로 갈까요?<br>인생 게임에 다시 들어와 <b>▶ 이어하기</b>를 누르면 그대로 이어져요.</p>',
      [{ t: '💾 저장하고 나가기', pri: 1, keep: 1, f: exitHome }, { t: '계속 하기' }]);
  }

  /* ---------- 첫 화면: 이어하기 ---------- */
  function paintTitle() {
    const box = $('#continueBox'); if (!box) return;
    const o = all(), a = o.auto, any = SLOTS.some(s => o[s]);
    box.innerHTML = (a ? `<button class="bigbtn contbtn" id="contBtn">▶ 이어하기<small>${a.meta.f} ${esc(a.meta.name)} · ${a.meta.age}살 ${a.meta.st} · ${when(a.t)}</small></button>` : '')
      + (any ? `<button class="ghost" id="loadBtn">📂 저장한 인생 불러오기</button>` : '');
    const c = $('#contBtn'); if (c) c.onclick = () => { Snd.sfx('tap'); load('auto'); };
    const l = $('#loadBtn'); if (l) l.onclick = () => { Snd.sfx('tap'); openSlots('load'); };
  }

  function init() {
    const sb = $('#startBtn'), box = document.createElement('div'); box.id = 'continueBox'; sb.parentNode.insertBefore(box, sb);
    // 진행 중인 인생이 있는데 새로 태어나려 하면 한 번 물어봄
    sb.onclick = () => {
      Snd.sfx('tap');
      const a = all().auto;
      if (!a) { show('setup'); return; }
      openOverlay('🌏 새 인생 시작', `<p class="sjtxt" style="text-align:center">${a.meta.f} ${esc(a.meta.name)}(${a.meta.age}살)의 인생이 진행 중이에요.<br>새로 태어나면 자동 저장이 새 인생으로 바뀌어요.</p>`,
        [{ t: '▶ 이어하기', pri: 1, f: () => load('auto') }, { t: '📁 슬롯에 보관하고 새로 시작', f: () => keepThenNew(a) }, { t: '그냥 새로 시작', f: () => show('setup') }]);
    };
    const _rt = renderTitle; renderTitle = function () { _rt(); paintTitle(); };
    const _ra = renderActions; renderActions = function () { _ra(); autoSoon(); };
    const _die = die; die = function (r) { const o = all(); delete o.auto; put(o); return _die(r); };
    document.addEventListener('visibilitychange', () => { if (document.hidden && P && P.alive && $('#game').classList.contains('on')) save('auto', true); });
    window.addEventListener('pagehide', () => { if (P && P.alive && $('#game').classList.contains('on')) save('auto', true); });
    paintTitle();
  }
  function keepThenNew(a) {
    const o = all(), free = ['s1', 's2', 's3'].find(s => !o[s]);
    if (!free) { Hub.toast('빈 슬롯이 없어요. 슬롯을 하나 지워 주세요'); openSlots('load'); return; }
    o[free] = a; put(o); Hub.toast(`📁 슬롯 ${free.slice(1)}에 보관했어요`); show('setup');
  }
  return { init, save, load, loadPack, pack, unpack, openSlots, paintTitle, exitHome, askExit };
})();
window.Save = Save;
Save.init();
