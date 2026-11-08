/* =====================================================================
 *  hub.js — 운명 연구소 앱 허브 (하단 탭 5개)
 *   오늘 · 내 사주 · 궁합 · 인생 게임 · 더보기
 *   출석·미션·복주머니 · 행운패스 · 매일 운세 알림
 * ===================================================================== */
const Hub = (() => {
  const S = window.SAJU;
  const day = () => Fortune.ymd(new Date());
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let tab = 'home', editing = false;

  /* ---------- 내 정보 ---------- */
  const getMe = () => store.get('p8b_me', null);
  function birthOf(p) {
    if (!p || !p.date) return null;
    const [y, m, d] = p.date.split('-').map(Number), t = p.time;
    return { cal: p.cal || 's', y, m, d, hh: t ? +t.split(':')[0] : 12, mm: t ? +t.split(':')[1] : 0, unk: !t };
  }
  /* 실제 사용자·궁합 상대 프로필은 오늘 이후 날짜 불가 (게임 속 가상 인물은 별도 허용) */
  const todayStr = () => Fortune.ymd(new Date());
  const futureMsg = d => d > todayStr() ? '오늘 이후 날짜는 입력할 수 없어요.' : '';
  const TRIAL = () => Store.native ? '' : window.P8B_COMMERCIAL
    ? '<div class="webtrial">🧪 상업용 테스트 페이지 · 실제 결제는 일어나지 않아요. 유료 상품을 누르면 구매 의향만 여쭤봐요.</div>'
    : '<div class="webtrial">🌐 웹 체험판 · 결제 기능이 없어요. 가격은 앱 기준 안내이며 일부 상품은 무료로 열려 있어요.</div>';
  function analyzeP(p) { const b = birthOf(p); return b ? Saju.analyze(b, p.sex !== 'f') : null; }
  const keyOf = p => `${p.date}|${p.time || ''}|${p.sex}`;

  /* ---------- 출석 · 미션 · 복주머니 ---------- */
  const DAILY_CAP = 6;
  const MISSIONS = [
    { k: 'compat', e: '💞', n: '궁합 한 번 보기', go: () => go('compat') },
    { k: 'game', e: '🎲', n: '인생 게임 한 판 끝까지', go: () => go('game') },
    { k: 'learn', e: '🧮', n: '내 사주 계산 원리 보기', go: () => openLearn() },
  ];
  function daily() {
    const d = store.get('p8b_daily', null);
    return d && d.d === day() ? d : { d: day(), att: false, ms: {}, earned: 0, shared: false };
  }
  const pouch = () => store.get('p8b_pouch', 0);
  function addPouch(n, why, capped = true) {
    const d = daily();
    if (capped) { n = Math.max(0, Math.min(n, DAILY_CAP - d.earned)); d.earned += n; }
    store.set('p8b_daily', d);
    if (n > 0) { store.set('p8b_pouch', pouch() + n); toast(`🧧 ${why} · 복주머니 +${n}`); Snd.sfx('coin'); }
    return n;
  }
  function attend() {
    const d = daily(); if (d.att) return;
    d.att = true; store.set('p8b_daily', d);
    const st = store.get('p8b_streak', { last: '', n: 0 });
    const y = new Date(Date.now() - 864e5);
    st.n = st.last === Fortune.ymd(y) ? st.n + 1 : 1; st.last = day(); store.set('p8b_streak', st);
    addPouch(Store.passOn() ? 2 : 1, Store.passOn() ? '출석 (행운패스 2배)' : '출석 완료');
    if (st.n % 7 === 0) setTimeout(() => addPouch(5, `${st.n}일 연속 출석 보너스`, false), 1400);
  }
  function mission(k) {
    if (!getMe()) return;
    const d = daily(); if (d.ms[k]) return;
    d.ms[k] = true; store.set('p8b_daily', d);
    const m = MISSIONS.find(x => x.k === k);
    addPouch(1, `미션 완료: ${m ? m.n : k}`);
    if (tab === 'today' && $('#hub').classList.contains('on')) render();
  }

  /* ---------- 공용 UI ---------- */
  function toast(t) {
    const el = $('#toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 2400);
  }
  function go(t) {
    Snd.sfx('tap');
    if (t === 'game') { tab = 'game'; show('title'); renderTitle && renderTitle(); syncTabs(); return; }
    tab = t; editing = false; show('hub'); render();
  }
  function syncTabs() {
    const on = $('#hub').classList.contains('on') || $('#title').classList.contains('on');
    $('#tabbar').classList.toggle('on', on);
    document.documentElement.style.setProperty('--tab-h', on ? '60px' : '0px');
    const cur = $('#title').classList.contains('on') ? 'game' : (tab === 'today' || tab === 'input') ? 'home' : tab;
    document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.t === cur));
  }
  const bar = (v, c) => `<i class="hbar"><i style="width:${v}%;background:${c}"></i></i>`;
  const gColor = v => v >= 85 ? 'var(--money)' : v >= 72 ? 'var(--smart)' : v >= 58 ? 'var(--hap)' : 'var(--hp)';


  /* ---------- 홈: 서비스 목록 → 항목 선택 → (정보 없으면) 단계별 입력 → 결과 ---------- */
  let pending = null;          // 정보 입력 후 이어서 열 항목
  const ITEMS = [
    { k: 'today', g: 'main', e: '☀️', n: '오늘의 운세', d: '총운 · 애정 · 금전 · 직장 · 건강', need: 1, f: () => go('today') },
    { k: 'saju', g: 'saju', e: '📜', n: '내 사주 풀이', d: '사주팔자 · 오행 · 대운 · 성격', need: 1, f: () => go('saju') },
    { k: 'tojeong', g: 'saju', e: '🏮', n: () => `${Tojeong.year()} 토정비결`, d: '한 해 신수 · 월별 운세', need: 1, f: () => openTojeong() },
    { k: 'newyear', g: 'saju', e: '🧧', n: '2027 신년운세', d: '정미년 총운 · 12달 흐름', need: 1, f: () => { const p = getMe(); openNewYear(p, analyzeP(p)); } },
    { k: 'learn', g: 'saju', e: '🧮', n: '사주 계산 원리', d: '내 사주가 나오는 과정', need: 1, f: () => openLearn() },
    { k: 'compat', g: 'rel', e: '💞', n: '궁합', d: '두 사람의 궁합 지수 · 관계도', need: 1, f: () => go('compat') },
    { k: 'flirt', g: 'rel', e: '💘', n: '바람기 테스트', d: '도화살 · 홍염살 연애 기질', need: 1, f: () => Fun.openFlirt(0) },
    { k: 'mbti', g: 'rel', e: '🧩', n: '사주 MBTI', d: '오행 · 십성으로 본 성격 유형', need: 1, f: () => Fun.openMbti(0) },
    { k: 'game', g: 'game', e: '🌏', n: '프로젝트 80억 : 인생 게임', d: '80억 명 중 한 명으로 태어나 끝까지 살아 보기', need: 0, f: () => go('game') },
  ];
  const itemName = it => typeof it.n === 'function' ? it.n() : it.n;
  function openItem(k) {
    const it = ITEMS.find(x => x.k === k); if (!it) return;
    Snd.sfx('tap');
    if (it.need && !analyzeP(getMe())) { pending = k; tab = 'input'; editing = false; show('hub'); render(); return; }
    it.f();
  }
  function homeHTML(p, a) {
    const now = new Date(), wd = '일월화수목금토'[now.getDay()];
    const g = Fortune.dayGz ? Fortune.dayGz(now) : null;
    const f = a ? Fortune.today(a, keyOf(p)) : null;
    const tile = it => `<button class="htile${it.g === 'game' ? ' wide' : ''}" data-item="${it.k}"><i>${it.e}</i><b>${itemName(it)}</b><small>${it.d}</small></button>`;
    const sec = (t, gk) => `<h3 class="hsec">${t}</h3><div class="htiles">${ITEMS.filter(x => x.g === gk).map(tile).join('')}</div>`;
    const tj = p && a && !Tojeong.opened(p) ? `<small class="hnote">🏮 토정비결은 인생 게임에서 모은 카르마로 열려요</small>` : '';
    return `<div class="hhome">
      <div class="hbrand"><small>${now.getMonth() + 1}월 ${now.getDate()}일 (${wd})${g ? ` · 오늘은 <b>${S.STK[g.s]}${S.BRK[g.b]}일</b>` : ''}</small><h1>운명 연구소</h1></div>
      ${p && a
        ? `<button class="hme" id="hmMe"><span>🙂</span><div><b>${esc(p.name)}님</b><small>${p.date.replace(/-/g, '.')} ${p.cal === 'll' ? '음력 윤달' : p.cal === 'l' ? '음력' : '양력'} · ${p.time ? SIJIN.find(x => x[0] === p.time)[1].split(' ')[0] : '시간 모름'} · ${p.sex === 'f' ? '여' : '남'}</small></div><em>수정</em></button>`
        : `<div class="hme empty"><span>👋</span><div><b>보고 싶은 항목을 골라 주세요</b><small>필요할 때만 생년월일을 여쭤봐요 · 가입 없음</small></div></div>`}
      <button class="hhero" data-item="today"><div><small>오늘의 운세</small><b>${f ? `${f.sc[0]}점 · ${f.grade}` : '내 하루 미리 보기'}</b><span>${f ? f.lines[0] : '생년월일로 보는 오늘의 총운과 분야별 운세'}</span></div><i>☀️</i></button>
      ${sec('사주 · 운세', 'saju')}${tj}
      ${sec('궁합 · 관계', 'rel')}
      ${sec('인생 게임', 'game')}
      ${TRIAL()}
      <p class="sjnote" style="text-align:center">※ 전통 명리 이론을 바탕으로 한 참고·재미용 콘텐츠예요.</p>
    </div>`;
  }
  function bindHome() {
    document.querySelectorAll('[data-item]').forEach(b => b.onclick = () => openItem(b.dataset.item));
    const me = $('#hmMe'); if (me) me.onclick = editProfile;
  }

  /* ---------- 사주 정보 입력 (단계형) ---------- */
  function formHTML(p) {
    p = p || {};
    const it = !p.date && pending ? ITEMS.find(x => x.k === pending) : null;
    const sij = SIJIN.map(([v, l]) => `<option value="${v}"${p.time === v ? ' selected' : ''}>${l}</option>`).join('');
    return `<button class="hback" id="hBack">‹ 처음 화면</button>
      ${it ? `<div class="hsteps"><span class="on">① 내 정보 입력</span><span>② ${it.e} ${itemName(it)}</span></div>` : ''}
      <div class="hcard"><h3 class="ht">${p.date ? '✏️ 내 사주 정보 수정' : it ? `${it.e} ${itemName(it)} · 내 정보 입력` : '🔮 나의 사주 정보'}</h3>
      <p class="hsub">${p.date ? '바꾼 정보는 모든 항목에 바로 반영돼요.' : '생년월일만 있으면 돼요. 한 번 입력하면 다른 항목에서도 다시 묻지 않아요.'}<br><small>가입 없음 · 입력한 정보는 이 기기 안에만 저장돼요.</small></p>
      <div class="form hform">
        <label>이름(별명)<input type="text" id="hName" maxlength="10" value="${esc(p.name || '')}" placeholder="예: 김민준"></label>
        <label>생년월일<div class="row2"><input type="date" id="hDate" min="1900-01-01" max="${todayStr()}" value="${p.date || ''}">
          <select id="hCal"><option value="s">양력</option><option value="l"${p.cal === 'l' ? ' selected' : ''}>음력</option><option value="ll"${p.cal === 'll' ? ' selected' : ''}>음력(윤달)</option></select></div></label>
        <label>태어난 시간<select id="hTime"><option value="">모름</option>${sij}</select></label>
        <label>성별<div class="seg" id="hSex"><button data-v="m" class="${p.sex !== 'f' ? 'on' : ''}">👦 남자</button><button data-v="f" class="${p.sex === 'f' ? 'on' : ''}">👧 여자</button></div></label>
        <div id="hErr" class="herr"></div>
        <button class="bigbtn sm wide" id="hSave">${p.date ? '저장하기' : it ? `다음 → ${itemName(it)} 보기` : '저장하기'}</button>
        ${p.date ? '<button class="ghost wide" id="hCancel">취소</button>' : ''}
      </div></div>`;
  }
  function bindForm() {
    document.querySelectorAll('#hSex button').forEach(b => b.onclick = () => { document.querySelectorAll('#hSex button').forEach(x => x.classList.toggle('on', x === b)); Snd.sfx('tap'); });
    $('#hSave').onclick = () => {
      const date = $('#hDate').value;
      if (!date) { $('#hErr').textContent = '생년월일을 입력해 주세요.'; return; }
      if (futureMsg(date)) { $('#hErr').textContent = futureMsg(date); return; }
      const old = getMe() || {};
      const p = { ...old, name: $('#hName').value.trim() || '나', date, cal: $('#hCal').value, time: $('#hTime').value, sex: document.querySelector('#hSex .on').dataset.v };
      if (!analyzeP(p)) { $('#hErr').textContent = '날짜를 확인해 주세요. (존재하지 않는 음력 날짜일 수 있어요)'; return; }
      store.set('p8b_me', p); editing = false; Snd.sfx('reveal'); scheduleNoti();
      if (pending) { const k = pending; pending = null; tab = 'home'; render(); openItem(k); } else { if (tab === 'input') tab = 'home'; render(); }
    };
    const c = $('#hCancel'); if (c) c.onclick = () => { editing = false; if (tab === 'input') tab = 'home'; render(); };
    $('#hBack').onclick = () => { editing = false; pending = null; tab = 'home'; render(); };
  }
  function editProfile() { if (tab === 'more' || tab === 'game') tab = 'home'; editing = true; show('hub'); render(); }

  /* ---------- 오늘 ---------- */
  function todayHTML(p, a) {
    const f = Fortune.today(a, keyOf(p)), d = daily(), st = store.get('p8b_streak', { n: 0 });
    const now = new Date(), wd = '일월화수목금토'[now.getDay()];
    const areas = Fortune.AREAS.map((n, i) => i === 0 ? '' : `<div class="harea"><div><b>${Fortune.AREA_E[i]} ${n}</b><span style="color:${gColor(f.sc[i])}">${f.sc[i]}</span></div>${bar(f.sc[i], gColor(f.sc[i]))}<p>${f.lines[i]}</p></div>`).join('');
    const bands = f.bands.map(b => `<div class="hband"><small>${b.lab} · ${b.time}</small><b>${S.STK[b.gz.s]}${S.BRK[b.gz.b]}시</b><em style="color:${gColor(b.sc)}">${b.sc}</em><span>${b.txt}</span></div>`).join('');
    const ms = MISSIONS.map(m => `<div class="hms${d.ms[m.k] ? ' done' : ''}"><span>${m.e} ${m.n}</span>${d.ms[m.k] ? '<b>✓ +1</b>' : `<button data-m="${m.k}">하러 가기</button>`}</div>`).join('');
    const pass = Store.passOn() ? `<b style="color:var(--money)">🍀 행운패스 사용 중 · ${passLeft()}</b>` : '광고 없이 쾌적하게 보고 싶다면';
    return `<div class="hhead"><small>${now.getMonth() + 1}월 ${now.getDate()}일 (${wd}) · 오늘은 <b>${f.gzTxt}일</b> ${f.gzHan}</small>
        <h2>${esc(p.name)}님의 오늘</h2></div>${TRIAL()}
      <div class="hcard hmain">
        <div class="hring" style="--v:${f.sc[0]};--c:${gColor(f.sc[0])}"><b>${f.sc[0]}</b><small>${f.grade}</small></div>
        <div class="hone"><span class="hkey">오늘의 키워드 · ${f.key}</span><p>${f.lines[0]}</p>
          ${f.rel ? `<p class="hrel">🔗 내 ${f.rel.who}와 오늘 일진이 <b>${f.rel.n}</b> — ${f.rel.d}</p>` : ''}
          <button class="hwhy" id="hWhy">🤔 왜 이런 운세가 나왔나요?</button></div>
      </div>
      <div class="hcard">${areas}</div>
      <div class="hcard"><h3 class="ht">⏰ 시간대별 흐름</h3><div class="hbands">${bands}</div></div>
      <div class="hcard"><h3 class="ht">🍀 오늘의 행운 아이템</h3><p class="hsub">부족한 ${S.EK[f.lucky.el]} 기운을 채워 주는 것들이에요</p>
        <div class="hluck"><div><small>색</small><b>${f.lucky.color}</b></div><div><small>숫자</small><b>${f.lucky.num}</b></div><div><small>방향</small><b>${f.lucky.dir}</b></div><div><small>소품</small><b>${f.lucky.item}</b></div></div></div>
      <div class="hcard"><h3 class="ht">🧧 출석 · 데일리 미션</h3>
        <div class="hstat"><span>🔥 연속 출석 <b>${st.n || 1}일</b></span><span>🧧 복주머니 <b>${pouch()}개</b></span><span>오늘 <b>${d.earned}/${DAILY_CAP}</b></span></div>
        <div class="hweek">${Array.from({ length: 7 }, (_, i) => `<i class="${i < ((st.n - 1) % 7) + 1 ? 'on' : ''}">${i === 6 ? '🎁' : i + 1}</i>`).join('')}</div>
        ${ms}
        <div class="hms${d.shared ? ' done' : ''}"><span>📤 오늘의 운세 공유하기</span>${d.shared ? '<b>✓ +2</b>' : '<button id="hShare">공유 +2</button>'}</div>
        <button class="ghost wide" id="hExch">🎁 복주머니로 보상 교환하기</button></div>
      ${tojeongCard(p)}
      ${passCard(pass)}
      <p class="sjnote" style="text-align:center">※ 운세는 전통 명리 이론을 바탕으로 한 참고·재미용 콘텐츠예요.</p>`;
  }
  /* ---------- 토정비결: 인생 게임에서 모은 카르마로 열기 ---------- */
  function tojeongCard(p) {
    const Y = Tojeong.year(), t = Tojeong.calc(p, Y); if (!t) return '';
    const open = Tojeong.opened(p, Y), k = karma, need = Math.max(0, Tojeong.COST - k);
    return `<div class="hcard tjcard"><h3 class="ht">📜 ${Y} 토정비결 <small>${open ? '열림' : '인생 게임 카르마로 열기'}</small></h3>
      ${Tojeong.previewHTML(t)}
      ${open ? '<button class="bigbtn" id="hTJ">📜 월별 신수까지 전체 보기</button>'
        : `<div class="tjkarma"><div class="tjbar"><i style="width:${Math.min(100, k / Tojeong.COST * 100)}%"></i></div>
           <small>✨ 카르마 ${k} / ${Tojeong.COST}${need ? ` · <b>${need}</b> 더 모으면 열려요` : ' · 지금 열 수 있어요!'}</small></div>
           <button class="bigbtn" id="hTJ">${need ? '🌍 인생 게임하러 가기' : `✨ 카르마 ${Tojeong.COST}으로 열기`}</button>
           <p class="sjnote" style="text-align:center;margin:6px 0 0">인생 한 판을 끝까지 살면 점수에 따라 카르마를 받아요. 잘 살수록 더 많이!</p>`}</div>`;
  }
  function openTojeong(p) {
    p = p || getMe(); if (!p) return;
    const Y = Tojeong.year(), t = Tojeong.calc(p, Y); if (!t) { toast('생년월일을 확인해 주세요'); return; }
    if (Tojeong.opened(p, Y)) { openOverlay(`📜 ${p.name}님의 ${Y}년 토정비결`, Tojeong.fullHTML(t), [{ t: '닫기' }]); return; }
    const need = Math.max(0, Tojeong.COST - karma);
    if (need) {
      openOverlay(`📜 ${Y} 토정비결`, `<div class="sjtxt">${Tojeong.previewHTML(t)}
        <h4>🔒 월별 신수·재물·처세 풀이</h4><p>인생 게임에서 모은 <b>카르마 ${Tojeong.COST}</b>로 열 수 있어요. 지금 ${karma} · <b>${need}</b> 더 필요해요.</p>
        <p>🌍 인생 한 판을 끝내면 점수에 따라 카르마를 받아요 (보통 5~15). 버킷리스트를 이루고 오래 행복하게 살수록 많이 받아요.</p></div>`,
        [{ t: '🌍 인생 게임 하러 가기', pri: 1, f: () => go('game') }, { t: '닫기' }]);
      return;
    }
    openOverlay(`📜 ${Y} 토정비결 열기`, `<div class="sjtxt">${Tojeong.previewHTML(t)}<p>카르마 <b>${Tojeong.COST}</b>를 쓰면 ${p.name}님의 ${Y}년 토정비결 전체(재물·처세·좋은 달·월별 신수)가 열려요. 한 번 열면 계속 다시 볼 수 있어요.</p><p class="sjnote">보유 카르마 ${karma} → ${karma - Tojeong.COST}</p></div>`,
      [{ t: `✨ 카르마 ${Tojeong.COST} 쓰고 열기`, pri: 1, f: () => { karma -= Tojeong.COST; saveMeta(); Tojeong.open(p, Y); Snd.sfx('fanfare'); render(); setTimeout(() => openTojeong(p), 80); } }, { t: '나중에' }]);
  }
  function passCard(pass) {
    if (!Ads.native && !(window.WebAds && WebAds.on)) return '';   // 광고가 없는 웹에서는 광고 없애기 카드가 의미 없음
    return `<div class="hcard hpass"><div><b>🍀 행운패스</b><small>${pass}</small></div>
        ${Ads.native ? `<button class="adbtn" id="hPassAd" ${Ads.canReward() ? '' : 'disabled'}>📺 광고 보고 2시간 무료${Ads.canReward() ? '' : '<small>(지금은 불가)</small>'}</button>` : '<small>📺 광고 보고 2시간 무료는 앱에서 이용할 수 있어요 · 복주머니 3개로도 교환 가능</small>'}
        ${Store.item('pass7') ? `<button class="ghost" id="hPassBuy">7일 ${Store.price('pass7')} · 30일 ${Store.price('pass30')}</button>` : ''}</div>`;
  }
  function passLeft() {
    const ms = Store.passUntil() - Date.now(); if (ms <= 0) return '';
    const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return h >= 48 ? `${Math.floor(h / 24)}일 남음` : h ? `${h}시간 ${m}분 남음` : `${m}분 남음`;
  }
  function bindToday(p, a) {
    $('#hWhy').onclick = () => whyFortune(p, a);
    document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => MISSIONS.find(m => m.k === b.dataset.m).go());
    const sh = $('#hShare'); if (sh) sh.onclick = async () => {
      const f = Fortune.today(a, keyOf(p));
      try {
        await Native.share(`🔮 ${p.name}님의 오늘 운세 (${f.gzTxt}일)\n총운 ${f.sc[0]}점 · ${f.grade}\n${f.lines[0]}\n🍀 행운의 색 ${f.lucky.color} · 숫자 ${f.lucky.num}\n\n운명 연구소 — 내 사주로 사는 인생 게임`);
        const d = daily(); if (!d.shared) { d.shared = true; store.set('p8b_daily', d); addPouch(2, '운세 공유'); render(); }
      } catch (e) {}
    };
    $('#hExch').onclick = openExchange;
    const tj = $('#hTJ'); if (tj) tj.onclick = () => (Tojeong.opened(p) || karma >= Tojeong.COST) ? openTojeong(p) : go('game');
    const pa = $('#hPassAd'); if (pa) pa.onclick = () => Ads.showReward(got => { if (got) { Store.addPass(2 * 36e5); Ads.banner(false); toast('🍀 2시간 동안 광고 없이!'); Snd.sfx('fanfare'); render(); } });
    const pb = $('#hPassBuy'); if (pb) pb.onclick = () => openShop('pass7');
  }
  function whyFortune(p, a) {
    const f = Fortune.today(a, keyOf(p)), me = a.me;
    const REL = ['나와 같은 오행', '내가 생하는 오행', '내가 극하는 오행', '나를 극하는 오행', '나를 생하는 오행'];
    openOverlay('🤔 오늘 운세는 이렇게 계산했어요', `<div class="sjtxt">
      <h4>① 오늘의 일진</h4><p>오늘 ${f.date}은 60갑자로 <b>${f.gzTxt}(${f.gzHan})일</b>이에요. 날짜는 끊김 없이 60갑자를 돌기 때문에 기준일에서 며칠 지났는지로 구해요.</p>
      <h4>② 나의 일간</h4><p>당신의 일주 천간은 <b>${S.STK[me]}(${S.ST[me]}) · ${S.EK[S.SE[me]]}</b>이에요. 사주에서 '나 자신'을 뜻해요.</p>
      <h4>③ 두 글자의 관계 = 십성</h4><p>오늘 천간 ${S.ST[f.gz.s]}(${S.EK[S.SE[f.gz.s]]})은 나에게 <b>${REL[f.ts.g]}</b>이고 음양이 ${me % 2 === f.gz.s % 2 ? '같아' : '달라'} <b>${f.ts.n}</b>이 돼요. 그래서 오늘의 키워드가 '${f.key}'예요.<br>
        오늘 지지 ${S.BR[f.gz.b]} 속 본기 ${S.ST[S.HID[f.gz.b]]}는 <b>${f.tb.n}</b>으로 분야 점수에 조금 더 반영했어요.</p>
      ${f.rel ? `<h4>④ 지지의 합·충</h4><p>내 ${f.rel.who}와 오늘 지지 ${S.BR[f.gz.b]}가 <b>${f.rel.n}</b> 관계라 점수에 ${f.rel.v > 0 ? '+' : ''}${f.rel.v}점을 반영했어요.</p>` : ''}
      ${f.helps ? `<h4>⑤ 부족한 기운 보완</h4><p>오늘 일진에 내게 부족한 ${S.EK[a.weak]} 기운이 들어 있어 +5점을 더했어요.</p>` : ''}
      <h4>시간대별 흐름</h4><p>오전 巳시·오후 未시·저녁 酉시의 천간을 '일상기시법'(일간에 따라 子시 천간이 정해지는 규칙)으로 구해 같은 방식으로 풀었어요.</p>
      <p class="sjnote">분야 점수에는 사람·날짜마다 고정된 변동폭(±13점)이 더해져요. 같은 날 다시 열어도 결과는 같아요.</p></div>`,
      [{ t: '🧮 내 사주 계산 과정 자세히 보기', pri: 1, f: openLearn }, { t: '닫기' }]);
  }

  /* ---------- 내 사주 ---------- */
  function sajuHTML(p, a) {
    const age = new Date().getFullYear() - +p.date.slice(0, 4);
    const L = Saju.luckAt(a, age);
    return `<div class="hhead"><small>${p.date} (${p.cal === 'll' ? '음력 윤달' : p.cal === 'l' ? '음력' : '양력'}) · ${p.time ? SIJIN.find(x => x[0] === p.time)[1].split(' ')[0] : '태어난 시간 모름(시주 제외)'} · ${p.sex === 'f' ? '여' : '남'}</small><h2>${esc(p.name)}님의 사주</h2></div>
      ${Saju.summaryHTML(a)}
      ${L ? `<div class="sjnow">${L.e} 지금 대운 (${L.start}세~) <b>${L.name}</b><br><span>${L.desc}</span></div>` : ''}
      <div class="hcard"><div class="sjtxt"><h4>🧭 성격</h4><p>${a.dm.성격}</p><h4>💪 강점</h4><p>${a.dm.강점}</p></div></div>
      <div class="hmenu">
        <button id="hRep"><span>📜</span><b>프리미엄 사주 리포트</b><small>${Store.has('report') ? Store.why('report') || '열림' : Store.price('report')}</small></button>
        <button id="hTJb" class="hot"><span>📜</span><b>${Tojeong.year()} 토정비결</b><small>${Tojeong.opened(p) ? '열림' : `인생 게임 카르마 ${Tojeong.COST}로 열기`}</small></button>
        <button id="hNY"><span>🧧</span><b>2027 정미년 신년운세</b><small>${Store.has('newyear') ? Store.why('newyear') || '열림' : '총운 무료 · 전체 ' + Store.price('newyear')}</small></button>
        <button id="hFlirt" class="hot"><span>💘</span><b>사주 바람기 테스트</b><small>도화살·홍염살로 보는 연애 기질</small></button>
        <button id="hMbti" class="hot"><span>🧩</span><b>사주 MBTI</b><small>오행·십성으로 본 성격 유형</small></button>
        <button id="hLearn"><span>🧮</span><b>내 사주 계산 원리</b><small>년·월·일·시주가 나오는 과정</small></button>
        <button id="hEdit"><span>✏️</span><b>사주 정보 수정</b><small>생년월일·시간·성별</small></button>
      </div>`;
  }
  function bindSaju(p, a) {
    $('#hRep').onclick = () => showReport(p.name, a, new Date().getFullYear() - +p.date.slice(0, 4), false);
    $('#hNY').onclick = () => openNewYear(p, a);
    $('#hTJb').onclick = () => openTojeong(p);
    $('#hLearn').onclick = openLearn;
    $('#hEdit').onclick = editProfile;
    $('#hFlirt').onclick = () => Fun.openFlirt(0);
    $('#hMbti').onclick = () => Fun.openMbti(0);
  }
  function openNewYear(p, a) {
    const n = Fortune.newYear(a, 2027), open = Store.has('newyear');
    const mm = m => `${m.yr !== 2027 ? '이듬해 ' : ''}${m.solarM}월`;
    const months = n.months.map(m => `<tr><td>${mm(m)}<small>${S.BRK[m.b]}월</small></td><td>${S.STK[m.s]}${S.BRK[m.b]}<small>${m.ten}</small></td><td><b style="color:${gColor(m.v)}">${m.v}</b></td><td>${m.txt}${m.rel ? ` <small>(${m.rel.n})</small>` : ''}</td></tr>`).join('');
    openOverlay(`🧧 2027 ${n.gzTxt}년(${n.gzHan}) 신년운세`, `<div class="sjtxt">
      <h4>🌟 한 해 총운 · ${n.ts.n}의 해</h4><p>${n.sx.총운}</p>
      ${n.yrel ? `<p>🐑 내 띠와 올해 양띠는 <b>${n.yrel.n}</b> — ${n.yrel.d.replace('날', '해')}</p>` : ''}
      <p>📈 좋은 달: <b>${n.best.map(mm).join(', ')}</b> · 조심할 달: <b>${mm(n.worst)}</b></p>
      ${open ? `<h4>💼 일·직업</h4><p>${n.sx.직업}</p><h4>💰 재물</h4><p>${n.sx.재물}</p><h4>💕 연애</h4><p>${n.sx.연애}</p><h4>🩺 건강</h4><p>${n.sx.건강}</p>
        <h4>🍂 하반기 (${S.BRK[n.yg.b]} · ${n.tb.n})</h4><p>${n.sb.총운}</p>
        <h4>📅 12개월 흐름</h4><table class="dytbl hmonth"><tr><th>달</th><th>월건</th><th>점수</th><th>한마디</th></tr>${months}</table>
        <p class="sjnote">명리의 달은 절기로 바뀌어요. 2월은 입춘부터 寅월이에요.</p>`
        : `<div class="lock"><b>🔒 분야별 운세 + 12개월 흐름</b><small>일·재물·연애·건강, 하반기 흐름, 달마다 점수와 한마디</small></div>`}
      <p class="sjnote">※ 참고·재미용 풀이예요.</p></div>`,
      [...(open ? [] : [{ t: `🔓 전체 열기 (${Store.price('newyear')})`, pri: 1, f: () => openShop('newyear') }]), { t: '닫기' }]);
  }
  function openLearn() {
    const p = getMe(); mission('learn');
    const q = p ? `&d=${p.date}&cal=${p.cal === 's' ? 's' : p.cal === 'll' ? 'll' : 'l'}&sx=${p.sex}${p.time ? '&t=' + p.time : ''}` : '';
    openOverlay('🧮 내 사주 계산 원리', `<iframe class="hlearn" src="learn.html?embed=1${q}" title="명리 계산 원리"></iframe>`, [{ t: '닫기' }]);
  }

  /* ---------- 궁합 ---------- */
  const people = () => store.get('p8b_people', []);
  function compatTabHTML(p, a) {
    const list = people().map((q, i) => ({ q, i, b: analyzeP(q) })).filter(x => x.b).map(x => ({ ...x, c: Saju.compatPair(a, x.b) })).sort((x, y) => y.c.score - x.c.score);
    const sij = SIJIN.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    return `<div class="hhead"><small>내 사주와 상대 사주를 겹쳐 봐요</small><h2>💞 궁합</h2></div>
      <div class="hfun"><button id="cFlirt">💘 바람기 테스트</button><button id="cMbti">🧩 사주 MBTI</button></div>
      <div class="hcard"><div class="form hform">
        <label>상대 이름<input type="text" id="cName" maxlength="10" placeholder="예: 김서연"></label>
        <label>생년월일<div class="row2"><input type="date" id="cDate" min="1900-01-01" max="${todayStr()}"><select id="cCal"><option value="s">양력</option><option value="l">음력</option><option value="ll">음력(윤달)</option></select></div></label>
        <label>태어난 시간<select id="cTime"><option value="">모름</option>${sij}</select></label>
        <label>성별<div class="seg" id="cSex"><button data-v="f" class="${p.sex === 'f' ? '' : 'on'}">👧 여자</button><button data-v="m" class="${p.sex === 'f' ? 'on' : ''}">👦 남자</button></div></label>
        <div id="cErr" class="herr"></div>
        <button class="bigbtn sm wide" id="cGo">💞 궁합 보기</button></div></div>
      <div class="hcard"><h3 class="ht">👥 나의 관계도 <small>${list.length}/20명 · 재미로 보는 궁합 지수</small></h3>
        ${list.length ? list.map((x, r) => `<div class="hppl" data-i="${x.i}"><span class="hrk">${r + 1}</span><div><b>${esc(x.q.name)}</b><small>${x.b.ddi}띠 · ${x.b.dm.nm}</small></div><em style="color:${gColor(x.c.score)}">${x.c.score}점<small>${x.c.word}</small></em><button data-del="${x.i}">✕</button></div>`).join('')
          : '<p class="hsub">궁합을 본 사람이 여기에 순위로 저장돼요. 가족·친구·연인을 등록해 보세요.</p>'}</div>`;
  }
  function bindCompat(p, a) {
    $('#cFlirt').onclick = () => Fun.openFlirt(people().length ? 1 : 0);
    $('#cMbti').onclick = () => Fun.openMbti(people().length ? 1 : 0);
    document.querySelectorAll('#cSex button').forEach(b => b.onclick = () => { document.querySelectorAll('#cSex button').forEach(x => x.classList.toggle('on', x === b)); Snd.sfx('tap'); });
    $('#cGo').onclick = () => {
      const q = { name: $('#cName').value.trim() || '상대', date: $('#cDate').value, cal: $('#cCal').value, time: $('#cTime').value, sex: document.querySelector('#cSex .on').dataset.v };
      if (!q.date) { $('#cErr').textContent = '상대 생년월일을 입력해 주세요.'; return; }
      if (futureMsg(q.date)) { $('#cErr').textContent = futureMsg(q.date); return; }
      const b = analyzeP(q); if (!b) { $('#cErr').textContent = '날짜를 확인해 주세요.'; return; }
      const list = people().filter(x => !(x.name === q.name && x.date === q.date)); list.unshift(q); store.set('p8b_people', list.slice(0, 20));
      showCompat(p, a, q, b); mission('compat'); render();
    };
    document.querySelectorAll('.hppl').forEach(el => el.onclick = e => {
      if (e.target.dataset.del != null) { const l = people(); l.splice(+e.target.dataset.del, 1); store.set('p8b_people', l); Snd.sfx('tap'); render(); return; }
      const q = people()[+el.dataset.i]; showCompat(p, a, q, analyzeP(q)); mission('compat');
    });
  }
  function showCompat(p, a, q, b) {
    Snd.sfx('love');
    const open = Store.has('compat'), yg = S.yearGz(new Date().getFullYear());
    const yl = x => S.SEUN[S.tg10(x.me, yg.s).g].연애;
    const detail = open ? `<div class="sjtxt"><h4>🧭 ${esc(p.name)}의 성격</h4><p>${a.dm.성격}</p><h4>🧭 ${esc(q.name)}의 성격</h4><p>${b.dm.성격}</p>
        <h4>💕 ${esc(p.name)}의 연애 스타일</h4><p>${a.dm.연애}</p><h4>💕 ${esc(q.name)}의 연애 스타일</h4><p>${b.dm.연애}</p>
        <h4>📅 올해 두 사람의 연애운</h4><p><b>${esc(p.name)}</b> ${yl(a)}</p><p><b>${esc(q.name)}</b> ${yl(b)}</p></div>`
      : `<div class="lock"><b>🔒 궁합 상세 풀이</b><small>두 사람의 성격·연애 스타일·올해 연애운 (모든 상대 무제한)</small></div>`;
    openOverlay('💞 궁합 결과', Saju.compatHTML(esc(p.name), a, esc(q.name), b) + detail + '<p class="sjnote" style="text-align:center">※ 궁합은 참고·재미용이에요. 관계는 서로의 노력이 만들어요.</p>',
      [...(open ? [] : [{ t: `🔓 상세 풀이 열기 (${Store.price('compat')})`, pri: 1, f: () => openShop('compat') }]),
       { t: '🧮 두 사람 계산 과정 보기', f: () => { const pq = birthOf(q); openOverlay('🧮 궁합 계산 과정', `<iframe class="hlearn" src="learn.html?embed=1&d=${p.date}&cal=${p.cal || 's'}&sx=${p.sex}${p.time ? '&t=' + p.time : ''}&d2=${q.date}&cal2=${q.cal}&sx2=${q.sex}${q.time ? '&t2=' + q.time : ''}"></iframe>`, [{ t: '닫기' }]); } },
       { t: '닫기' }]);
  }

  /* ---------- 더보기 ---------- */
  const EXCH = [
    { k: 'pass2h', e: '🍀', n: '행운패스 2시간', c: 3, can: () => true, f: () => { Store.addPass(2 * 36e5); Ads.banner(false); } },
    { k: 'theme', e: '🎨', n: '오행 컬러 테마 1개', c: 10, can: () => themesOwned().length < 5, f: () => { const o = themesOwned(), nx = [0, 1, 2, 3, 4].find(i => !o.includes(i)); o.push(nx); store.set('p8b_themes', o); setTheme(nx); } },
    { k: 'fate', e: '🎛️', n: '운명 조작 팩 (인생 게임)', c: 20, can: () => !Store.has('fate'), f: () => Store.grant('fate') },
    { k: 'report', e: '📜', n: '프리미엄 사주 리포트', c: 60, can: () => !Store.has('report'), f: () => Store.grant('report') },
  ];
  // [이름, 블랙 테마용, 화이트 테마용] — 흰 바탕에서도 글씨 대비 4.5:1 이상 되도록 밝기 분리
  const THEMES = [['목', '#3fbf7f', '#1f7a4d'], ['화', '#ff6b5a', '#c8322b'], ['토', '#e2b13c', '#8a5a00'], ['금', '#b9c3d6', '#4f5d75'], ['수', '#5f9cff', '#1f5fb8']];
  const themesOwned = () => store.get('p8b_themes', []);
  function setTheme(i) {
    store.set('p8b_theme', i);
    const light = window.Theme && Theme.current() === 'light';
    if (i == null) document.documentElement.style.removeProperty('--accent');
    else document.documentElement.style.setProperty('--accent', THEMES[i][light ? 2 : 1]);
  }
  function openExchange() {
    const n = pouch();
    openOverlay(`🎁 복주머니 교환 · 보유 ${n}개`, EXCH.map(x => `<div class="shopitem"><span class="se">${x.e}</span><div><b>${x.n}</b><small>복주머니 ${x.c}개</small></div>
      <button data-x="${x.k}" ${n >= x.c && x.can() ? '' : 'disabled'} class="${x.can() ? '' : 'own'}">${x.can() ? '교환' : '보유 중'}</button></div>`).join('')
      + (themesOwned().length ? `<div class="hthemes"><small>내 테마</small>${themesOwned().map(i => `<button data-th="${i}" style="background:${THEMES[i][Theme.current() === 'light' ? 2 : 1]};color:#fff">${THEMES[i][0]}</button>`).join('')}<button data-th="-1">기본</button></div>` : '')
      + '<p class="sjnote" style="text-align:center">복주머니는 출석·미션·공유로 하루 최대 6개(연속 출석 보너스 별도) 모을 수 있어요.</p>');
    document.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
      const x = EXCH.find(e => e.k === b.dataset.x); if (pouch() < x.c || !x.can()) return;
      store.set('p8b_pouch', pouch() - x.c); x.f(); Snd.sfx('fanfare'); toast(`${x.e} ${x.n} 교환 완료!`); openExchange(); if ($('#hub').classList.contains('on')) render();
    });
    document.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { setTheme(+b.dataset.th < 0 ? null : +b.dataset.th); Snd.sfx('tap'); });
  }
  function moreHTML() {
    const nt = store.get('p8b_noti', { on: false, t: '08:00' }), native = Ads.native;
    const times = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '12:00', '21:00'].map(t => `<option${t === nt.t ? ' selected' : ''}>${t}</option>`).join('');
    return `<div class="hhead"><small>운명 연구소</small><h2>더보기</h2></div>
      <div class="hmenu">
        <button id="mExch"><span>🎁</span><b>복주머니 교환</b><small>보유 ${pouch()}개</small></button>
        <button id="mShop"><span>🛍️</span><b>상점</b><small>${Store.item('pass7') ? '행운패스 · ' : ''}리포트 · 궁합 상세 · 신년운세</small></button>
        <button id="mEdit"><span>✏️</span><b>내 사주 정보 수정</b><small>생년월일·시간·성별</small></button>
        ${native ? '' : '<button id="mBaram"><span>🌸</span><b>사주 바람기 테스트</b><small>도화살·홍염살로 보는 연애 체질</small></button>'}
      </div>
      <div class="hcard"><h3 class="ht">🎨 화면 테마</h3>
        <p class="hsub">글씨가 잘 보이는 바탕을 고르세요. 화이트가 기본이에요.</p>
        <div class="modeseg">${[['light', '화이트', '#f6f3ee'], ['dark', '블랙', '#111114'], ['system', '휴대폰 설정', 'linear-gradient(90deg,#f6f3ee 50%,#111114 50%)']].map(([m, n, c]) => `<button data-mode="${m}" class="${Theme.mode() === m ? 'on' : ''}"><i class="sw" style="background:${c}"></i>${n}</button>`).join('')}</div></div>
      <div class="hcard"><h3 class="ht">🔔 매일 운세 알림</h3>
        <p class="hsub">${native ? '정한 시각에 그날의 총운 점수와 한 줄 운세를 보내 드려요.' : '알림은 앱에서만 받을 수 있어요.'}</p>
        <div class="row2"><label class="chk"><input type="checkbox" id="nOn" ${nt.on ? 'checked' : ''} ${native ? '' : 'disabled'}> 알림 받기</label><select id="nT" ${native ? '' : 'disabled'}>${times}</select></div></div>
      <div class="hcard hlinks"><a href="privacy.html">개인정보 처리방침</a>${Ads.privacyRequired ? '<a id="mPriv">광고 개인정보 설정</a>' : ''}<a id="mWipe">내 정보·기록 지우기</a>
        <p class="sjnote">사주 풀이·운세·궁합·인생 게임 결과는 전통 명리 이론을 바탕으로 한 참고·재미용 콘텐츠예요. 만세력 계산: lunar-javascript (MIT).</p></div>`;
  }
  function bindMore() {
    $('#mExch').onclick = openExchange; $('#mShop').onclick = () => openShop(); $('#mEdit').onclick = editProfile;
    const mb = $('#mBaram'); if (mb) mb.onclick = () => { location.href = '../baram/'; };
    const pv = $('#mPriv'); if (pv) pv.onclick = () => Ads.privacyOptions();
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { Theme.set(b.dataset.mode); Snd.sfx('tap'); render(); });
    $('#mWipe').onclick = () => {
      const KEEP = new Set(['p8b_owned', 'p8b_pass_until', 'ads_reward_day']);   // 구매·패스·광고 제한은 유지
      const wipe = all => {
        const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
        ks.filter(k => all ? (k.startsWith('p8b_') && !KEEP.has(k)) : ['p8b_me', 'p8b_people', 'p8b_mbti'].includes(k)).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
        const ln = LN(); if (ln) ln.getPending().then(r => r.notifications.length && ln.cancel({ notifications: r.notifications.map(n => ({ id: n.id })) })).catch(() => {});
        location.reload();
      };
      openOverlay('🗑️ 내 정보·기록 지우기', `<div class="sjtxt"><p>이 기기에 저장된 정보만 지워요. 개발자 서버에는 원래 저장된 정보가 없어요.</p>
        <h4>① 내 사주·궁합 정보만</h4><p>내 이름(별명)·생년월일·시간·성별, 궁합 관계도(${people().length}명), 사주 MBTI 결과</p>
        <h4>② 게임 기록까지 모두</h4><p>①에 더해 저장 슬롯·지난 생애·카르마·출석/복주머니·테마·알림 설정·소리 설정</p>
        <h4>지워지지 않는 것</h4><p>구매한 상품(스토어 계정에서 「구매 복원」 가능)·행운패스 남은 기간·광고 시청 횟수 제한. 구글 설문에 남긴 응답은 이 기기와 별개로 구글 설문에 보관돼요.</p></div>`, [
        { t: '내 사주·궁합 정보만 지우기', f: () => wipe(false) },
        { t: '게임 기록까지 모두 지우기', f: () => wipe(true) }, { t: '취소' }]);
    };
    let qa = 0; const nt0 = document.querySelector('.hlinks .sjnote'); if (nt0) nt0.onclick = () => { if (++qa >= 5) { store.set('p8b_qa', !store.get('p8b_qa', false)); toast(store.get('p8b_qa', false) ? '🧪 테스트 도구 켜짐 (게임 화면의 QA 버튼)' : '테스트 도구 꺼짐'); qa = 0; } };
    const save = async () => {
      const nt = { on: $('#nOn').checked, t: $('#nT').value };
      if (nt.on && !(await notiPermission())) { nt.on = false; $('#nOn').checked = false; toast('알림 권한이 꺼져 있어요. 설정에서 허용해 주세요.'); }
      store.set('p8b_noti', nt); scheduleNoti(); if (nt.on) toast(`🔔 매일 ${nt.t}에 운세를 보내 드릴게요`);
    };
    $('#nOn').onchange = save; $('#nT').onchange = save;
  }

  /* ---------- 매일 운세 알림 (앱 전용): 앞으로 14일 치를 그날 운세 문구로 예약 ---------- */
  const LN = () => { const C = window.Capacitor; return Ads.native && C && C.Plugins && C.Plugins.LocalNotifications; };
  async function notiPermission() {
    const L = LN(); if (!L) return false;
    try { let r = await L.checkPermissions(); if (r.display !== 'granted') r = await L.requestPermissions(); return r.display === 'granted'; } catch (e) { return false; }
  }
  async function scheduleNoti() {
    const L = LN(); if (!L) return;
    try {
      await L.cancel({ notifications: Array.from({ length: 14 }, (_, i) => ({ id: 101 + i })) });
      const nt = store.get('p8b_noti', { on: false, t: '08:00' }), p = getMe(), a = analyzeP(p);
      if (!nt.on || !a) return;
      const [hh, mm] = nt.t.split(':').map(Number), list = [];
      for (let i = 0; i < 14; i++) {
        const at = new Date(); at.setDate(at.getDate() + i); at.setHours(hh, mm, 0, 0);
        if (at <= new Date()) continue;
        const b = Fortune.brief(a, keyOf(p), at);
        list.push({ id: 101 + i, title: `🔮 ${b.title}`, body: b.body, schedule: { at, allowWhileIdle: true } });
      }
      if (list.length) await L.schedule({ notifications: list });
    } catch (e) { console.warn('[Noti]', e); }
  }

  /* ---------- 렌더 ---------- */
  function render() {
    const body = $('#hubBody'), p = getMe(), a = analyzeP(p);
    if (tab === 'home' && !editing) { body.innerHTML = homeHTML(p, a); bindHome(); body.scrollTop = 0; syncTabs(); return; }
    if ((!a || editing || tab === 'input') && tab !== 'more') { if (!a && !editing && tab !== 'input') pending = tab; body.innerHTML = formHTML(editing ? p : null); bindForm(); syncTabs(); body.scrollTop = 0; return; }
    if (tab === 'today') { attend(); body.innerHTML = todayHTML(p, a); bindToday(p, a); }
    else if (tab === 'saju') { body.innerHTML = sajuHTML(p, a); bindSaju(p, a); }
    else if (tab === 'compat') { body.innerHTML = compatTabHTML(p, a); bindCompat(p, a); }
    else if (tab === 'more') { body.innerHTML = moreHTML(); bindMore(); }
    if (!body.dataset.keep) body.scrollTop = 0;
    syncTabs();
  }

  function init() {
    // 기존 화면 전환에 하단 탭 표시와 미션 체크를 연결
    const base = show;
    show = function (id) { base(id); if (id === 'end') mission('game'); syncTabs(); };
    document.querySelectorAll('#tabbar button').forEach(b => b.onclick = () => go(b.dataset.t));
    const th = store.get('p8b_theme', null); if (th != null) setTheme(th);
    window.addEventListener('themechange', () => { const t = store.get('p8b_theme', null); if (t != null) setTheme(t); });
    Store.onChange(() => { if ($('#hub').classList.contains('on')) render(); });
    tab = 'home'; show('hub'); render();
    scheduleNoti();
  }
  return { init, go, render, mission, toast, me: getMe, people, analyze: analyzeP, openTojeong };
})();
Hub.init();
