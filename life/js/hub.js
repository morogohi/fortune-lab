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
  function go(t, fromPop) {
    Snd.sfx('tap');
    if (!fromPop) {
      const st = history.state || {};
      if (t === 'home') { if (st.t) { ignorePop = true; history.back(); } }
      else if (st.t) history.replaceState({ t }, ''); else history.pushState({ t }, '');
    }
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



  /* ---------- 화면 이동: 상단 뒤로가기 바 + 브라우저·안드로이드 뒤로가기 ---------- */
  const TITLES = { today: '오늘의 운세', saju: '내 사주', compat: '궁합', more: '더보기', input: '내 정보 입력', tojeong: '토정비결', newyear: '신년운세', daily: '출석 · 미션', tarot: '타로카드', mbtitest: 'MBTI 성향 검사' };
  let ignorePop = false;
  const navHTML = t => `<div class="hnav"><button class="hnback" id="hnBack" aria-label="뒤로">${ICONS.ic('back')}</button><b>${TITLES[t] || ''}</b></div>`;
  function back() { if (history.state && history.state.t) history.back(); else go('home'); }
  function hookHistory() {
    const oo = window.openOverlay, co = window.closeOverlay;
    window.openOverlay = function () { oo.apply(this, arguments); if (!(history.state && history.state.ov)) history.pushState(Object.assign({}, history.state, { ov: 1 }), ''); };
    window.closeOverlay = function (fromPop) {
      co();
      if (fromPop === true) return;
      setTimeout(() => { if (!$('#overlay').classList.contains('on') && history.state && history.state.ov) { ignorePop = true; history.back(); } }, 0);
    };
    addEventListener('popstate', e => {
      if (ignorePop) { ignorePop = false; return; }
      if ($('#overlay').classList.contains('on')) { closeOverlay(true); return; }
      const inLife = ['game', 'mini', 'setup'].some(id => { const el = document.getElementById(id); return el && el.classList.contains('on'); });
      if (inLife) { history.pushState({ t: 'game' }, ''); toast('게임 화면에서는 메뉴(💾)로 저장하고 나갈 수 있어요'); return; }
      go((e.state && e.state.t) || 'home', true);
    });
  }

  /* ---------- 내 정보 입력 기록 (기기에만 저장, 최대 10명) ---------- */
  const PKEY = 'p8b_profiles';
  const pid = p => [p.name, p.date, p.cal, p.time, p.sex].join('|');
  const profiles = () => store.get(PKEY, []);
  function rememberProfile(p) {
    const list = profiles().filter(x => pid(x) !== pid(p));
    list.unshift({ name: p.name, date: p.date, cal: p.cal, time: p.time || '', sex: p.sex, at: Date.now() });
    store.set(PKEY, list.slice(0, 10));
  }
  const pLine = p => `${p.date.replace(/-/g, '.')} ${p.cal === 'll' ? '음력 윤달' : p.cal === 'l' ? '음력' : '양력'} · ${p.time ? SIJIN.find(x => x[0] === p.time)[1].split(' ')[0] : '시간 모름'} · ${p.sex === 'f' ? '여' : '남'}`;
  function openProfiles() {
    const me = getMe(), list = profiles();
    if (me && !list.some(x => pid(x) === pid(me))) { rememberProfile(me); return openProfiles(); }
    const rows = list.map((x, i) => `<div class="prow${me && pid(x) === pid(me) ? ' on' : ''}"><button data-pick="${i}"><b>${esc(x.name)}</b><small>${pLine(x)}</small></button>${me && pid(x) === pid(me) ? '<em>지금 보는 중</em>' : `<button class="pdel" data-pdel="${i}" aria-label="삭제">✕</button>`}</div>`).join('');
    openOverlay('🙂 내 정보 · 입력 기록', `<p class="sjnote">입력했던 정보는 이 기기에만 기록돼요 (최대 10명). 고르면 모든 운세가 그 정보로 바뀌어요.</p>
      <div class="plist">${rows || '<p class="sjnote">아직 기록이 없어요.</p>'}</div>`,
      [{ t: '✏️ 지금 정보 수정', f: editProfile }, { t: '➕ 새로운 사람 입력', pri: 1, f: () => { pending = 'today'; store.set('p8b_me', null); tab = 'input'; editing = false; show('hub'); render(); } }, { t: '닫기' }]);
    document.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const x = profiles()[+b.dataset.pick]; store.set('p8b_me', { name: x.name, date: x.date, cal: x.cal, time: x.time, sex: x.sex }); rememberProfile(x); closeOverlay(); scheduleNoti(); toast(`${x.name}님 정보로 바꿨어요`); render(); });
    document.querySelectorAll('[data-pdel]').forEach(b => b.onclick = () => { const l = profiles(); l.splice(+b.dataset.pdel, 1); store.set(PKEY, l); closeOverlay(true); openProfiles(); });
  }

  /* ---------- ⚙️ 설정 · 👤 로그인 ---------- */
  function openSettings() {
    const me = getMe(), u = Auth.user();
    openOverlay('⚙️ 설정', `<div class="sets">
      <div class="setrow"><span>👤 계정</span><div>${u ? `<b>${esc(Auth.name())}</b> <small>${Auth.provider() === 'kakao' ? '카카오' : Auth.provider() === 'google' ? '구글' : ''} 로그인</small>` : '<small>로그인하지 않음</small>'}</div><button id="sAcc">${u ? '관리' : '로그인'}</button></div>
      <div class="setrow"><span>🙂 내 정보</span><div>${me ? `<b>${esc(me.name)}</b> <small>${pLine(me)}</small>` : '<small>입력 전</small>'}</div><button id="sMe">${me ? '바꾸기' : '입력'}</button></div>
      <div class="setrow col"><span>🎨 화면</span><div class="modeseg">${[['light', '라이트'], ['dark', '다크'], ['system', '휴대폰 설정']].map(([m, n]) => `<button data-smode="${m}" class="${Theme.mode() === m ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="setrow"><span>🎵 배경음악</span><div></div><button class="tgl${Snd.on.bgm ? ' on' : ''}" id="sBgm" aria-label="배경음악"><i></i></button></div>
      <div class="setrow"><span>🔊 효과음</span><div></div><button class="tgl${Snd.on.sfx ? ' on' : ''}" id="sSfx" aria-label="효과음"><i></i></button></div>
      <div class="setrow"><span>🔔 알림 · 상점</span><div><small>매일 운세 알림, 복주머니, 상점</small></div><button id="sMore">더보기</button></div>
      <div class="setrow"><span>🔒 개인정보</span><div><small>정보는 이 기기에만 저장돼요</small></div><button id="sPriv">관리</button></div>
    </div>`, [{ t: '닫기' }]);
    $('#sAcc').onclick = () => { closeOverlay(true); u ? openAccount() : openLogin(); };
    $('#sMe').onclick = () => { closeOverlay(true); me ? openProfiles() : openItem('today'); };
    document.querySelectorAll('[data-smode]').forEach(b => b.onclick = () => { Theme.set(b.dataset.smode); document.querySelectorAll('[data-smode]').forEach(x => x.classList.toggle('on', x === b)); render(); });
    $('#sBgm').onclick = e => { Snd.toggle('bgm'); e.currentTarget.classList.toggle('on', Snd.on.bgm); };
    $('#sSfx').onclick = e => { Snd.toggle('sfx'); e.currentTarget.classList.toggle('on', Snd.on.sfx); Snd.sfx('tap'); };
    $('#sMore').onclick = () => { closeOverlay(); go('more'); };
    $('#sPriv').onclick = () => { closeOverlay(true); openPrivacy(); };
  }
  function openWipe() {
    const KEEP = new Set(['p8b_owned', 'p8b_pass_until', 'ads_reward_day', 'p8b_auth']);   // 구매·패스·광고 제한은 유지
    const wipe = all => {
      const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
      ks.filter(k => all ? (k.startsWith('p8b_') && !KEEP.has(k)) : ['p8b_me', 'p8b_people', 'p8b_mbti', 'p8b_profiles', 'p8b_mbti_test'].includes(k)).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      const ln = LN(); if (ln) ln.getPending().then(r => r.notifications.length && ln.cancel({ notifications: r.notifications.map(n => ({ id: n.id })) })).catch(() => {});
      location.reload();
    };
    openOverlay('🗑️ 내 정보·기록 지우기', `<div class="sjtxt"><p>이 기기에 저장된 정보만 지워요. 개발자 서버에는 원래 저장된 정보가 없어요.</p>
      <h4>① 내 사주·궁합 정보만</h4><p>내 이름(별명)·생년월일·시간·성별, 최근 입력 기록(${profiles().length}명), 궁합 관계도(${people().length}명), 사주 MBTI 결과</p>
      <h4>② 게임 기록까지 모두</h4><p>①에 더해 저장 슬롯·지난 생애·카르마·출석/복주머니·테마·알림 설정·소리 설정</p>
      <h4>지워지지 않는 것</h4><p>구매한 상품(스토어 계정에서 「구매 복원」 가능)·행운패스 남은 기간·광고 시청 횟수 제한. 구글 설문에 남긴 응답은 이 기기와 별개로 구글 설문에 보관돼요.</p></div>`, [
      { t: '내 사주·궁합 정보만 지우기', f: () => wipe(false) },
      { t: '게임 기록까지 모두 지우기', f: () => wipe(true) }, { t: '취소' }]);
  }
  function openPrivacy() {
    openOverlay('🔒 개인정보 관리', `<div class="sjtxt"><p>이름(별명)·생년월일·태어난 시간·성별, 입력 기록, 궁합 상대는 <b>이 기기 안에만</b> 저장돼요. 로그인해도 서버로 보내지 않아요.</p>
      <p>로그인하면 서버에는 계정 정보(로그인 공급자·닉네임)와 게임 기록 요약(카르마·살아 본 인생 수)만 저장돼요.</p></div>`,
      [{ t: '🗑️ 내 정보·기록 지우기', f: openWipe }, { t: '📄 개인정보 처리방침', f: () => { location.href = 'privacy.html'; } }, { t: '닫기' }]);
  }
  const KAKAO_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#000" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.4 0 .9.1 1.3.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>';
  const GOOGLE_SVG = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  function openLogin() {
    const ok = Auth.ready(), nat = Auth.native();
    openOverlay('👤 로그인', `<p class="sjnote" style="text-align:center">로그인하면 인생 게임의 카르마 기록이 계정에 저장돼<br>다른 기기에서도 이어서 할 수 있어요.</p>
      <button class="sso kakao" id="lgKakao" ${ok && !nat ? '' : 'disabled'}>${KAKAO_SVG}<span>카카오 로그인</span></button>
      <button class="sso google" id="lgGoogle" ${ok && !nat ? '' : 'disabled'}>${GOOGLE_SVG}<span>Google 계정으로 로그인</span></button>
      ${!ok ? '<p class="sjnote" style="text-align:center">로그인 서버 연결을 준비하고 있어요. 곧 열려요!</p>' : nat ? '<p class="sjnote" style="text-align:center">앱 로그인은 다음 업데이트에서 지원해요. 지금은 웹에서 로그인할 수 있어요.</p>' : ''}
      <p class="sjnote" style="text-align:center">생년월일 등 개인정보는 서버로 보내지 않고 이 기기에만 저장돼요.<br>로그인하지 않아도 모든 기능을 쓸 수 있어요.</p>`, [{ t: '닫기' }]);
    const run = async p => { toast('로그인 화면으로 이동해요…'); const r = await Auth.login(p); if (r.error) toast(r.error === 'not-configured' ? '로그인 서버 준비 중이에요' : '로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요'); };
    $('#lgKakao').onclick = () => run('kakao'); $('#lgGoogle').onclick = () => run('google');
  }
  function openAccount() {
    const t = store.get('p8b_synced', 0);
    openOverlay('👤 내 계정', `<div class="sets"><div class="setrow"><span>${Auth.provider() === 'kakao' ? '💬 카카오' : '🔵 구글'}</span><div><b>${esc(Auth.name())}</b></div></div>
      <div class="setrow"><span>☁️ 동기화</span><div><small>카르마 ${karma} · ${t ? new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' 저장' : '아직 저장 전'}</small></div><button id="acSync">지금 저장</button></div></div>
      <p class="sjnote">서버에는 계정 정보와 게임 기록 요약만 있어요. 생년월일 등은 이 기기에만 있어요.</p>`,
      [{ t: '로그아웃', f: async () => { await Auth.logout(); toast('로그아웃했어요'); } },
       { t: '회원 탈퇴', f: () => openOverlay('회원 탈퇴', '<p class="sjtxt">서버에 저장된 계정과 게임 기록이 모두 삭제돼요. 이 기기의 정보는 그대로 남아요.</p>',
           [{ t: '탈퇴하기', pri: 1, f: async () => toast(await Auth.deleteAccount() ? '탈퇴가 완료됐어요' : '탈퇴하지 못했어요. 문의: morogohi@gmail.com') }, { t: '취소' }]) },
       { t: '닫기' }]);
    $('#acSync').onclick = async () => { await Auth.sync(); toast('저장했어요'); closeOverlay(true); openAccount(); };
  }
  function topbarUI() {
    const b = $('#loginBtn'); if (!b) return; const u = Auth.user();
    const pv = Auth.provider();
    if (u) {
      const av = Auth.avatar();
      b.className = 'auth in' + (pv ? ' ' + pv : '');
      b.innerHTML = `<span class="aav">${av ? `<img src="${esc(av)}" alt="" referrerpolicy="no-referrer">` : esc(Auth.name().slice(0, 1))}<i class="adot"></i></span><span class="alab">${esc(Auth.name().slice(0, 5))}</span>`;
      b.title = `${Auth.name()} · ${pv === 'kakao' ? '카카오' : pv === 'google' ? '구글' : ''} 로그인됨`; b.setAttribute('aria-label', b.title);
    } else {
      b.className = 'auth out';
      b.innerHTML = '<span class="aav">👤</span><span class="alab">로그인</span>';
      b.title = '로그인하지 않음 · 눌러서 로그인'; b.setAttribute('aria-label', b.title);
    }
  }

  /* ---------- 홈: 서비스 목록 → 항목 선택 → (정보 없으면) 단계별 입력 → 결과 ---------- */
  let pending = null;          // 정보 입력 후 이어서 열 항목
  const ITEMS = [
    { k: 'today', g: 'main', ic: 'sun', e: '☀️', n: '오늘의 운세', d: '총운 · 애정 · 금전 · 직장 · 건강', need: 1, f: () => go('today') },
    { k: 'saju', g: 'saju', c: 'lav', ic: 'book', e: '📜', n: '내 사주 풀이', d: '사주팔자 · 오행 · 대운 · 성격', need: 1, f: () => go('saju') },
    { k: 'tojeong', g: 'saju', c: 'peach', ic: 'scroll', e: '🏮', n: () => `${Tojeong.year()} 토정비결`, d: '한 해 신수 · 월별 운세', need: 1, f: () => go('tojeong') },
    { k: 'newyear', g: 'saju', c: 'pink', ic: 'calendar', e: '🧧', n: '2027 신년운세', d: '정미년 총운 · 12달 흐름', need: 1, f: () => go('newyear') },
    { k: 'learn', g: 'saju', c: 'sky', ic: 'calc', e: '🧮', n: '사주 계산 원리', d: '내 사주가 나오는 과정', need: 1, f: () => openLearn() },
    { k: 'compat', g: 'rel', c: 'pink', ic: 'heart', e: '💞', n: '궁합', d: '두 사람의 궁합 지수 · 관계도', need: 1, f: () => go('compat') },
    { k: 'flirt', g: 'rel', c: 'butter', ic: 'spark', e: '💘', n: '바람기 테스트', d: '도화살 · 홍염살 연애 기질', need: 1, f: () => Fun.openFlirt(0) },
    { k: 'mbti', g: 'rel', c: 'mint', ic: 'grid', e: '🧩', n: '사주로 보는 MBTI', d: '오행 · 십성으로 본 성격 유형', need: 1, f: () => Fun.openMbti(0) },
    { k: 'tarot', g: 'rel', c: 'lav', ic: 'spark', e: '🃏', n: '타로카드', d: '78장 · 연애 · 일 · 재물', need: 0, f: () => go('tarot') },
    { k: 'mbtitest', g: 'rel', c: 'sky', ic: 'grid', e: '📝', n: 'MBTI 성향 검사', d: '24문항 설문으로 알아보는 내 성향 · 사주 MBTI와 비교', need: 0, f: () => go('mbtitest') },
    { k: 'daily', g: 'daily', c: 'butter', ic: 'gift', e: '🧧', n: '출석 · 데일리 미션', d: '매일 들러 복주머니 받고 보상으로 교환', need: 0, f: () => go('daily') },
    { k: 'game', g: 'game', c: 'sky', ic: 'globe', e: '🌏', n: '프로젝트 80억 : 인생 게임', d: '80억 명 중 한 명으로 태어나 끝까지 살아 보기', need: 0, f: () => go('game') },
  ];
  const itemName = it => typeof it.n === 'function' ? it.n() : it.n;
  function openItem(k) {
    const it = ITEMS.find(x => x.k === k); if (!it) return;
    Snd.sfx('tap');
    if (it.need && !analyzeP(getMe())) { pending = k; tab = 'input'; editing = false; show('hub'); render(); return; }
    it.f();
  }
  // 띠 동물 (사주 년지 기준 — 입춘 전 출생은 전년 띠)
  const DDI_E = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'];
  function homeHTML(p, a) {
    const now = new Date(), wd = '일월화수목금토'[now.getDay()];
    const g = Fortune.dayGz ? Fortune.dayGz(now) : null;
    const f = a ? Fortune.today(a, keyOf(p)) : null;
    const tile = it => `<button class="htile${it.g === 'game' ? ' wide' : ''}" data-c="${it.c || 'lav'}" data-item="${it.k}"><i>${it.e}</i><span><b>${itemName(it)}</b><small>${it.d}</small></span></button>`;
    const sec = (t, gk) => `<h3 class="hsec">${t}</h3><div class="htiles">${ITEMS.filter(x => x.g === gk).map(tile).join('')}</div>`;
    return `<div class="hhome">
      <div class="hbrand"><small>${now.getMonth() + 1}월 ${now.getDate()}일 (${wd})${g ? ` · 오늘은 <b>${S.STK[g.s]}${S.BRK[g.b]}일</b>` : ''}</small><h1>운명 연구소</h1></div>
      ${p && a
        ? `<button class="hme" id="hmMe"><span class="ddi" title="${a.ddi}띠">${DDI_E[a.p.y.b]}</span><div><b>${esc(p.name)}님 <em class="ddit">${a.ddi}띠</em></b><small>${pLine(p)}</small></div><em>${ICONS.ic('chev')}</em></button>`
        : `<button class="hme cta" data-item="today"><span>🎂</span><div><b>생년월일을 입력하고 시작해요</b><small>한 번 입력하면 모든 운세·사주·궁합에 쓰여요 · 가입 없음</small></div><em>${ICONS.ic('chev')}</em></button>`}
      <button class="hhero" data-item="today"><div><small>오늘의 운세</small><b>${f ? `${f.sc[0]}점 · ${f.grade}` : '내 하루 미리 보기'}</b><span>${f ? f.lines[0] : '생년월일로 보는 오늘의 총운과 분야별 운세'}</span><em class="hgo">시작하기 ›</em></div><i>☀️</i></button>
      ${sec('사주 · 운세', 'saju')}
      ${sec('궁합 · 관계', 'rel')}
      ${sec('인생 게임', 'game')}
      ${sec('매일 혜택', 'daily')}
      ${TRIAL()}
      <p class="sjnote" style="text-align:center">※ 전통 명리 이론을 바탕으로 한 참고·재미용 콘텐츠예요.</p>
    </div>`;
  }
  function bindHome() {
    document.querySelectorAll('[data-item]').forEach(b => b.onclick = () => openItem(b.dataset.item));
    const me = $('#hmMe'); if (me) me.onclick = openProfiles;
  }

  /* ---------- 사주 정보 입력 (단계형) ---------- */
  function formHTML(p) {
    p = p || {};
    const it = !p.date && pending ? ITEMS.find(x => x.k === pending) : null;
    const sij = SIJIN.map(([v, l]) => `<option value="${v}"${p.time === v ? ' selected' : ''}>${l}</option>`).join('');
    return `      ${it ? `<div class="hsteps"><span class="on">① 내 정보 입력</span><span>② ${itemName(it)}</span></div>` : ''}
      <div class="hcard"><h3 class="ht">${p.date ? '✏️ 내 사주 정보 수정' : it ? `${itemName(it)} · 내 정보 입력` : '🔮 나의 사주 정보'}</h3>
      <p class="hsub">${p.date ? '바꾼 정보는 모든 항목에 바로 반영돼요.' : '생년월일만 있으면 돼요. 한 번 입력하면 다른 항목에서도 다시 묻지 않아요.'}<br><small>가입 없음 · 입력한 정보는 이 기기 안에만 저장돼요.</small></p>
      <div class="form hform">
        ${!p.date && profiles().length ? `<div class="phist"><small>최근 입력에서 고르기</small><div>${profiles().slice(0, 5).map((x, i) => `<button data-ph="${i}">${esc(x.name)} <small>${x.date.slice(2).replace(/-/g, '.')}</small></button>`).join('')}</div></div>` : ''}
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
    document.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => {
      const x = profiles()[+b.dataset.ph]; $('#hName').value = x.name; $('#hDate').value = x.date; $('#hCal').value = x.cal; $('#hTime').value = x.time || '';
      document.querySelectorAll('#hSex button').forEach(y => y.classList.toggle('on', y.dataset.v === x.sex)); Snd.sfx('tap');
    });
    $('#hSave').onclick = () => {
      const date = $('#hDate').value;
      if (!date) { $('#hErr').textContent = '생년월일을 입력해 주세요.'; return; }
      if (futureMsg(date)) { $('#hErr').textContent = futureMsg(date); return; }
      const old = getMe() || {};
      const p = { ...old, name: $('#hName').value.trim() || '나', date, cal: $('#hCal').value, time: $('#hTime').value, sex: document.querySelector('#hSex .on').dataset.v };
      if (!analyzeP(p)) { $('#hErr').textContent = '날짜를 확인해 주세요. (존재하지 않는 음력 날짜일 수 있어요)'; return; }
      store.set('p8b_me', p); rememberProfile(p); editing = false; Snd.sfx('reveal'); scheduleNoti();
      if (pending) { const k = pending; pending = null; tab = 'home'; render(); openItem(k); } else { if (tab === 'input') tab = 'home'; render(); }
    };
    const c = $('#hCancel'); if (c) c.onclick = () => { editing = false; if (tab === 'input') tab = 'home'; render(); };

  }
  function editProfile() { if (tab === 'more' || tab === 'game') tab = 'home'; editing = true; show('hub'); render(); }

  /* ---------- 오늘 ---------- */
  function todayHTML(p, a) {
    const f = Fortune.today(a, keyOf(p));
    const now = new Date(), wd = '일월화수목금토'[now.getDay()];
    const areas = Fortune.AREAS.map((n, i) => i === 0 ? '' : `<div class="harea"><div><b>${Fortune.AREA_E[i]} ${n}</b><span style="color:${gColor(f.sc[i])}">${f.sc[i]}</span></div>${bar(f.sc[i], gColor(f.sc[i]))}<p>${f.lines[i]}</p></div>`).join('');
    const bands = f.bands.map(b => `<div class="hband"><small>${b.lab} · ${b.time}</small><b>${S.STK[b.gz.s]}${S.BRK[b.gz.b]}시</b><em style="color:${gColor(b.sc)}">${b.sc}</em><span>${b.txt}</span></div>`).join('');
    return `<div class="hhead"><small>${now.getMonth() + 1}월 ${now.getDate()}일 (${wd}) · 오늘은 <b>${f.gzTxt}일</b> ${f.gzHan}</small>
        <h2>${esc(p.name)}님의 오늘</h2></div>
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
      <button class="ghost wide" id="hShare">📤 오늘의 운세 공유하기</button>
      <p class="sjnote" style="text-align:center">※ 운세는 전통 명리 이론을 바탕으로 한 참고·재미용 콘텐츠예요.</p>`;
  }

  /* ---------- 타로카드 (독립 화면) : 섞기(소리·애니메이션) → 멈춤 → 부채꼴에서 직접 고르기 → 뒤집기 → 리딩 ---------- */
  let tarotD = null, tarotTopic = 'all', tarotN = 3, tPhase = 'idle', tOrder = null, tPicks = [], tTimer = null;
  const SPN = { 1: '1장 · 오늘의 카드', 3: '3장 · 과거·현재·미래', 5: '5장 · 고민 해결' };
  const FAN = 15;                                     // 펼쳐 놓는 카드 수
  function stopShuffleLoop() { if (tTimer) { clearInterval(tTimer); tTimer = null; } }
  function tarotHTML(p, a) {
    const D = tarotD, done = D && D.opened.size === D.n;
    const setup = `<div class="hcard"><h3 class="ht">주제</h3><div class="tsel" id="tTopic">${Object.entries(Tarot.TOPIC).map(([k, n]) => `<button data-v="${k}" class="${k === tarotTopic ? 'on' : ''}">${n}</button>`).join('')}</div>
        <h3 class="ht">펼칠 카드</h3><div class="tsel" id="tN">${[1, 3, 5].map(n => `<button data-v="${n}" class="${n === tarotN ? 'on' : ''}">${SPN[n]}</button>`).join('')}</div>
        <button class="bigbtn wide" id="tShuf">🃏 ${D ? '다시 섞기' : '카드 섞기'}</button>
        ${!a ? '<p class="sjnote" style="text-align:center;margin:8px 0 0">생년월일을 입력하면 카드 원소를 내 사주 오행과 연결해 풀어 드려요 · <a id="tIn">입력하기</a></p>' : ''}</div>`;
    let stage = '';
    if (tPhase === 'shuffle') {
      stage = `<div class="hcard tstage"><p class="tguide">마음속 질문을 떠올리세요.<br><b>원하는 순간에 멈춤</b>을 누르면 카드가 펼쳐져요.</p>
        <div class="tshuf">${Array.from({ length: 10 }, (_, k) => `<span class="sc${k % 2 ? ' r' : ' l'}" style="--k:${k}">${Tarot.TBACK}</span>`).join('')}</div>
        <button class="bigbtn wide" id="tStop">✋ 멈춤</button></div>`;
    } else if (tPhase === 'pick') {
      const left = tarotN - tPicks.length;
      stage = `<div class="hcard tstage"><p class="tguide">${left ? `끌리는 카드를 <b>${left}장</b> 더 골라 주세요` : '다 골랐어요! 아래 버튼을 눌러 펼쳐 보세요'}</p>
        <div class="tfan">${Array.from({ length: FAN }, (_, k) => { const pi = tPicks.indexOf(k), ang = (k - (FAN - 1) / 2) * 5;
          return `<button class="fc${pi >= 0 ? ' on' : ''}" data-f="${k}" style="--a:${ang}deg;--i:${k}" aria-label="${k + 1}번째 카드">${Tarot.TBACK}${pi >= 0 ? `<em>${pi + 1}</em>` : ''}</button>`; }).join('')}</div>
        <div class="tpicked">${Array.from({ length: tarotN }, (_, k) => `<span class="${k < tPicks.length ? 'on' : ''}">${Tarot.SPREADS[tarotN][k][0]}</span>`).join('')}</div>
        <button class="bigbtn wide" id="tGo" ${left ? 'disabled' : ''}>${left ? `${left}장 남았어요` : '🔮 고른 카드 펼치기'}</button>
        <button class="ghost wide" id="tReshuf">다시 섞기</button></div>`;
    } else if (D) {
      stage = `<div class="hcard">${done ? '' : '<p class="tguide" style="margin:0">카드를 눌러 한 장씩 뒤집으세요</p>'}${Tarot.spreadHTML(D)}</div>`;
    }
    return `<div class="hhead"><small>마음속 질문을 떠올리고 카드를 섞어 보세요</small><h2>타로카드</h2></div>
      ${tPhase === 'shuffle' || tPhase === 'pick' ? '' : setup}${stage}
      ${done && tPhase === 'reveal' ? Tarot.readingHTML(D, a ? a.el : null) : ''}`;
  }
  function startShuffle() {
    tPhase = 'shuffle'; tarotD = null; tPicks = []; tOrder = null; stopShuffleLoop();
    render(); Snd.sfx('riffle'); tTimer = setInterval(() => { if (tab !== 'tarot') { stopShuffleLoop(); return; } Snd.sfx('riffle'); }, 900);
  }
  function bindTarot(p, a) {
    if (tPhase === 'shuffle' && !tTimer) tPhase = tarotD ? 'reveal' : 'idle';   // 다른 화면에 다녀오면 섞기 중단
    document.querySelectorAll('#tTopic button').forEach(b => b.onclick = () => { tarotTopic = b.dataset.v; if (tarotD) tarotD.topic = tarotTopic; Snd.sfx('tap'); keepRender(); });
    document.querySelectorAll('#tN button').forEach(b => b.onclick = () => { tarotN = +b.dataset.v; Snd.sfx('tap'); keepRender(); });
    const sh = $('#tShuf'); if (sh) sh.onclick = startShuffle;
    const st = $('#tStop'); if (st) st.onclick = () => {
      stopShuffleLoop(); tOrder = Tarot.shuffled(); tPicks = []; tPhase = 'pick'; Snd.sfx('whoosh'); render();
      setTimeout(() => { const f = document.querySelector('.tfan'); if (f) f.classList.add('open'); }, 30);
    };
    document.querySelectorAll('.tfan .fc').forEach(b => b.onclick = () => {
      const k = +b.dataset.f, i = tPicks.indexOf(k);
      if (i >= 0) tPicks.splice(i, 1); else if (tPicks.length < tarotN) tPicks.push(k); else return;
      Snd.sfx('cardpick'); keepRender(); const f = document.querySelector('.tfan'); if (f) f.classList.add('open', 'still');
    });
    const go2 = $('#tGo'); if (go2) go2.onclick = () => { tarotD = Tarot.fromPicks(tOrder, tPicks, tarotTopic); tPhase = 'reveal'; Snd.sfx('reveal'); render(); };
    const rs = $('#tReshuf'); if (rs) rs.onclick = startShuffle;
    const ti = $('#tIn'); if (ti) ti.onclick = () => { pending = 'tarot'; tab = 'input'; render(); };
    document.querySelectorAll('.tflip').forEach(b => b.onclick = () => {
      if (!tarotD || b.classList.contains('open')) return;
      b.classList.add('open'); tarotD.opened.add(+b.dataset.k); Snd.sfx('page');
      if (tarotD.opened.size === tarotD.n) setTimeout(() => { keepRender(); setTimeout(() => { const r = document.querySelector('.tspread'); if (r) r.parentElement.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }, 650);
    });
  }
  function keepRender() { const body = $('#hubBody'), y = body.scrollTop; body.dataset.keep = 1; render(); body.scrollTop = y; delete body.dataset.keep; }

  /* ---------- MBTI 성향 검사 (설문 · 독립 화면) ---------- */
  let mtAns = null;
  function mbtiTestHTML(p, a) {
    const res = store.get('p8b_mbti_test', null);
    if (res && !mtAns) {
      const info = Fun.MBTI[res.type] || ['', ''], sm = a ? Fun.mbti(a) : null;
      const same = sm ? [...res.type].filter((c, i) => c === sm.type[i]).length : 0;
      return `<div class="hhead"><small>${new Date(res.at).toLocaleDateString('ko-KR')} 검사 결과 · 이 기기에만 저장돼요</small><h2>MBTI 성향 검사</h2></div>
        <div class="hcard"><div class="mtype"><b>${res.type}</b><span>${info[0]}</span></div><p class="sjtxt" style="text-align:center;margin:0">${info[1]}</p></div>
        <div class="hcard"><h3 class="ht">성향 비율</h3>${res.ax.map(x => `<div class="maxr"><span class="${x.pick === x.x ? 'on' : ''}">${x.x} ${x.xn}<br>${x.p}%</span><div class="tjbar"><i style="width:${x.p}%"></i></div><span class="${x.pick === x.y ? 'on' : ''}">${x.y} ${x.yn}<br>${100 - x.p}%</span></div>`).join('')}
          <p class="sjnote">50%에 가까운 축은 상황에 따라 양쪽을 오가는 편이에요.</p></div>
        <div class="hcard"><h3 class="ht">🧩 사주로 본 MBTI와 비교</h3>${sm
          ? `<p class="sjtxt" style="margin:0">사주 MBTI <b>${sm.type}</b> · 설문 결과 <b>${res.type}</b> → 4글자 중 <b>${same}개</b> 일치 (${same * 25}%)</p>
             <p class="sjtxt">${same >= 3 ? '타고난 기질과 지금의 성향이 거의 같아요. 사주의 흐름을 그대로 살리면 편안해요.' : same === 2 ? '절반은 타고난 대로, 절반은 살아오며 바뀐 모습이에요.' : '살아오면서 타고난 기질과 다른 모습을 많이 길렀어요. 그만큼 노력으로 만든 성향이에요.'}</p>`
          : '<p class="sjtxt" style="margin:0">생년월일을 입력하면 사주로 본 MBTI와 비교해 드려요.</p>'}</div>
        <button class="bigbtn wide" id="mtAgain">📝 다시 검사하기</button>
        ${sm ? '<button class="ghost wide" id="mtSaju">🧩 사주로 보는 MBTI 자세히</button>' : '<button class="ghost wide" id="mtIn">🎂 생년월일 입력하고 비교하기</button>'}
        <p class="sjnote">자체 제작한 24문항 성향 검사로, 공식 MBTI® 검사가 아니에요. 재미와 자기 이해를 위한 참고용이에요.</p>`;
    }
    const A = mtAns || [], n = A.filter(v => v != null).length, N = MbtiTest.Q.length;
    return `<div class="hhead"><small>정답은 없어요 · 평소의 나에 가깝게 골라 주세요</small><h2>MBTI 성향 검사</h2></div>
      <div class="mprog"><div class="tjbar"><i style="width:${n / N * 100}%"></i></div><small class="hnote">${n} / ${N} 문항</small></div>
      <div class="hcard">${MbtiTest.Q.map((q, i) => `<div class="mq" id="mq${i}"><p><b>${i + 1}.</b>${q[2]}</p><div class="sc">${MbtiTest.SCALE.map(([t, v]) => `<button data-q="${i}" data-v="${v}" class="${A[i] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('')}</div>
      <button class="bigbtn wide" id="mtDone" ${n < N ? 'disabled' : ''}>${n < N ? `${N - n}문항 남았어요` : '결과 보기'}</button>`;
  }
  function bindMbtiTest(p, a) {
    const ag = $('#mtAgain'); if (ag) ag.onclick = () => { mtAns = Array(MbtiTest.Q.length).fill(null); render(); };
    const sj = $('#mtSaju'); if (sj) sj.onclick = () => Fun.openMbti(0);
    const mi = $('#mtIn'); if (mi) mi.onclick = () => { pending = 'mbtitest'; tab = 'input'; render(); };
    if (!mtAns && store.get('p8b_mbti_test', null)) return;
    if (!mtAns) mtAns = Array(MbtiTest.Q.length).fill(null);
    document.querySelectorAll('.mq .sc button').forEach(b => b.onclick = () => {
      const i = +b.dataset.q; mtAns[i] = +b.dataset.v; Snd.sfx('tap');
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      const n = mtAns.filter(v => v != null).length, N = mtAns.length;
      document.querySelector('.mprog i').style.width = n / N * 100 + '%'; document.querySelector('.mprog small').textContent = `${n} / ${N} 문항`;
      const d = $('#mtDone'); d.disabled = n < N; d.textContent = n < N ? `${N - n}문항 남았어요` : '결과 보기';
      const next = mtAns.findIndex(v => v == null); if (next >= 0 && next > i) { const el = $('#mq' + next); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
    $('#mtDone').onclick = () => {
      if (mtAns.some(v => v == null)) return;
      const res = MbtiTest.score(mtAns); store.set('p8b_mbti_test', res); mtAns = null;
      const me = getMe(); if (me) { const s = store.get('p8b_mbti', {}); s[me.date + me.name] = res.type; store.set('p8b_mbti', s); }
      Snd.sfx('fanfare'); render();
    };
  }
  /* ---------- 출석 · 데일리 미션 (독립 화면) ---------- */
  function dailyHTML() {
    const d = daily(), st = store.get('p8b_streak', { n: 0 });
    const ms = MISSIONS.map(m => `<div class="hms${d.ms[m.k] ? ' done' : ''}"><span>${m.e} ${m.n}</span>${d.ms[m.k] ? '<b>✓ +1</b>' : `<button data-m="${m.k}">하러 가기</button>`}</div>`).join('');
    const pass = Store.passOn() ? `<b style="color:var(--money)">🍀 행운패스 사용 중 · ${passLeft()}</b>` : '광고 없이 쾌적하게 보고 싶다면';
    return `<div class="hhead"><small>매일 들르면 복주머니가 쌓여요</small><h2>출석 · 미션</h2></div>
      <div class="hcard"><h3 class="ht">🧧 출석 · 데일리 미션</h3>
        <div class="hstat"><span>🔥 연속 출석 <b>${st.n || 1}일</b></span><span>🧧 복주머니 <b>${pouch()}개</b></span><span>오늘 <b>${d.earned}/${DAILY_CAP}</b></span></div>
        <div class="hweek">${Array.from({ length: 7 }, (_, i) => `<i class="${i < ((st.n - 1) % 7) + 1 ? 'on' : ''}">${i === 6 ? '🎁' : i + 1}</i>`).join('')}</div>
        ${ms}
        <div class="hms${d.shared ? ' done' : ''}"><span>📤 오늘의 운세 공유하기</span>${d.shared ? '<b>✓ +2</b>' : '<button id="dShare">하러 가기</button>'}</div>
        <button class="ghost wide" id="hExch">🎁 복주머니로 보상 교환하기</button></div>
      ${passCard(pass)}`;
  }
  function bindDaily() {
    document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => MISSIONS.find(m => m.k === b.dataset.m).go());
    const ds = $('#dShare'); if (ds) ds.onclick = () => go('today');
    $('#hExch').onclick = openExchange;
    const pa = $('#hPassAd'); if (pa) pa.onclick = () => Ads.showReward(got => { if (got) { Store.addPass(2 * 36e5); Ads.banner(false); toast('🍀 2시간 동안 광고 없이!'); Snd.sfx('fanfare'); render(); } });
    const pb = $('#hPassBuy'); if (pb) pb.onclick = () => openShop('pass7');
  }
  /* ---------- 토정비결: 인생 게임에서 모은 카르마로 열기 ---------- */
  function tojeongHTML(p) {
    const Y = Tojeong.year(), t = Tojeong.calc(p, Y); if (!t) return '<div class="hcard"><p class="hsub">생년월일을 확인해 주세요.</p></div>';
    const open = Tojeong.opened(p, Y), k = karma, need = Math.max(0, Tojeong.COST - k);
    return `<div class="hhead"><small>${esc(p.name)}님 · 음력 ${t.lm}월 ${t.ld}일생</small><h2>${Y} 토정비결</h2></div>
      ${open ? `<div class="hcard">${Tojeong.fullHTML(t)}</div>`
      : `<div class="hcard">${Tojeong.previewHTML(t)}</div>
         <div class="hcard tjcard"><h3 class="ht">🔒 월별 신수 · 재물 · 처세</h3>
           <p class="hsub">인생 게임에서 모은 카르마 ${Tojeong.COST}으로 전체 풀이를 열 수 있어요. 한 번 열면 계속 다시 볼 수 있어요.</p>
           <div class="tjkarma"><div class="tjbar"><i style="width:${Math.min(100, k / Tojeong.COST * 100)}%"></i></div>
           <small>✨ 카르마 ${k} / ${Tojeong.COST}${need ? ` · <b>${need}</b> 더 모으면 열려요` : ' · 지금 열 수 있어요!'}</small></div>
           <button class="bigbtn" id="hTJ">${need ? '🌍 인생 게임하러 가기' : `✨ 카르마 ${Tojeong.COST}으로 열기`}</button>
           <p class="sjnote" style="text-align:center;margin:6px 0 0">인생 한 판을 끝까지 살면 점수에 따라 카르마를 받아요 (보통 5~15).</p></div>`}`;
  }
  function bindTojeong(p) {
    const b = $('#hTJ'); if (!b) return;
    b.onclick = () => {
      const Y = Tojeong.year();
      if (karma < Tojeong.COST) { go('game'); return; }
      openOverlay(`📜 ${Y} 토정비결 열기`, `<p class="sjtxt">카르마 <b>${Tojeong.COST}</b>를 쓰면 ${esc(p.name)}님의 ${Y}년 토정비결 전체가 열려요.</p><p class="sjnote">보유 카르마 ${karma} → ${karma - Tojeong.COST}</p>`,
        [{ t: `✨ 카르마 ${Tojeong.COST} 쓰고 열기`, pri: 1, f: () => { karma -= Tojeong.COST; saveMeta(); Tojeong.open(p, Y); Snd.sfx('fanfare'); Auth.sync(); render(); } }, { t: '나중에' }]);
    };
  }
  function openTojeong() { if (!analyzeP(getMe())) { openItem('tojeong'); return; } go('tojeong'); }
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
    const sh = $('#hShare'); if (sh) sh.onclick = async () => {
      const f = Fortune.today(a, keyOf(p));
      try {
        await Native.share(`🔮 ${p.name}님의 오늘 운세 (${f.gzTxt}일)\n총운 ${f.sc[0]}점 · ${f.grade}\n${f.lines[0]}\n🍀 행운의 색 ${f.lucky.color} · 숫자 ${f.lucky.num}\n\n운명 연구소 — 내 사주로 사는 인생 게임`);
        const d = daily(); if (!d.shared) { d.shared = true; store.set('p8b_daily', d); addPouch(2, '운세 공유'); render(); }
      } catch (e) {}
    };
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
        <button id="hRep"><span>📜</span><b>상세 사주 리포트</b><small>${Store.has('report') ? Store.why('report') || '열림' : '올해 운세 · 10년 대운 · 개운법 · ' + Store.price('report')}</small></button>
      </div>`;
  }
  function bindSaju(p, a) {
    $('#hRep').onclick = () => showReport(p.name, a, new Date().getFullYear() - +p.date.slice(0, 4), false);
  }
  function newYearHTML(p, a) {
    const n = Fortune.newYear(a, 2027), open = Store.has('newyear');
    const mm = m => `${m.yr !== 2027 ? '이듬해 ' : ''}${m.solarM}월`;
    const months = n.months.map(m => `<tr><td>${mm(m)}<small>${S.BRK[m.b]}월</small></td><td>${S.STK[m.s]}${S.BRK[m.b]}<small>${m.ten}</small></td><td><b style="color:${gColor(m.v)}">${m.v}</b></td><td>${m.txt}${m.rel ? ` <small>(${m.rel.n})</small>` : ''}</td></tr>`).join('');
    return `<div class="hhead"><small>${esc(p.name)}님 · ${n.gzHan}년</small><h2>2027 ${n.gzTxt}년 신년운세</h2></div>
      <div class="hcard"><div class="sjtxt">
      <h4>🌟 한 해 총운 · ${n.ts.n}의 해</h4><p>${n.sx.총운}</p>
      ${n.yrel ? `<p>🐑 내 띠와 올해 양띠는 <b>${n.yrel.n}</b> — ${n.yrel.d.replace('날', '해')}</p>` : ''}
      <p>📈 좋은 달: <b>${n.best.map(mm).join(', ')}</b> · 조심할 달: <b>${mm(n.worst)}</b></p>
      ${open ? `<h4>💼 일·직업</h4><p>${n.sx.직업}</p><h4>💰 재물</h4><p>${n.sx.재물}</p><h4>💕 연애</h4><p>${n.sx.연애}</p><h4>🩺 건강</h4><p>${n.sx.건강}</p>
        <h4>🍂 하반기 (${S.BRK[n.yg.b]} · ${n.tb.n})</h4><p>${n.sb.총운}</p>
        <h4>📅 12개월 흐름</h4><table class="dytbl hmonth"><tr><th>달</th><th>월건</th><th>점수</th><th>한마디</th></tr>${months}</table>
        <p class="sjnote">명리의 달은 절기로 바뀌어요. 2월은 입춘부터 寅월이에요.</p>`
        : `<div class="lock"><b>🔒 분야별 운세 + 12개월 흐름</b><small>일·재물·연애·건강, 하반기 흐름, 달마다 점수와 한마디</small></div>`}
      <p class="sjnote">※ 참고·재미용 풀이예요.</p></div></div>
      ${open ? '' : `<button class="bigbtn wide" id="nyOpen">🔓 분야별 운세 · 12개월 흐름 열기 (${Store.price('newyear')})</button>`}`;
  }
  function openNewYear() { go('newyear'); }
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
  const THEMES = [['목', '#a8dcc0', '#3d7a5c'], ['화', '#f5b3a8', '#a8493f'], ['토', '#ecd49a', '#80621c'], ['금', '#cfd4de', '#5a6170'], ['수', '#aac6f0', '#3a5f96']];
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
      + (themesOwned().length ? `<div class="hthemes"><small>내 테마</small>${themesOwned().map(i => `<button data-th="${i}" style="background:${THEMES[i][Theme.current() === 'light' ? 2 : 1]};color:${Theme.current() === 'light' ? '#fff' : '#1b1d2b'}">${THEMES[i][0]}</button>`).join('')}<button data-th="-1">기본</button></div>` : '')
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
      </div>
      <div class="hcard"><h3 class="ht">🎨 화면 테마</h3>
        <p class="hsub">글씨가 잘 보이는 바탕을 고르세요. 화이트가 기본이에요.</p>
        <div class="modeseg">${[['light', '라이트', '#f3f4f6'], ['dark', '다크', '#16171a'], ['system', '휴대폰 설정', 'linear-gradient(90deg,#f3f4f6 50%,#16171a 50%)']].map(([m, n, c]) => `<button data-mode="${m}" class="${Theme.mode() === m ? 'on' : ''}"><i class="sw" style="background:${c}"></i>${n}</button>`).join('')}</div></div>
      <div class="hcard"><h3 class="ht">🔔 매일 운세 알림</h3>
        <p class="hsub">${native ? '정한 시각에 그날의 총운 점수와 한 줄 운세를 보내 드려요.' : '알림은 앱에서만 받을 수 있어요.'}</p>
        <div class="row2"><label class="chk"><input type="checkbox" id="nOn" ${nt.on ? 'checked' : ''} ${native ? '' : 'disabled'}> 알림 받기</label><select id="nT" ${native ? '' : 'disabled'}>${times}</select></div></div>
      <div class="hcard hlinks"><a href="privacy.html">개인정보 처리방침</a>${Ads.privacyRequired ? '<a id="mPriv">광고 개인정보 설정</a>' : ''}<a id="mWipe">내 정보·기록 지우기</a>
        <p class="sjnote">사주 풀이·운세·궁합·인생 게임 결과는 전통 명리 이론을 바탕으로 한 참고·재미용 콘텐츠예요. 만세력 계산: lunar-javascript (MIT).</p></div>`;
  }
  function bindMore() {
    $('#mExch').onclick = openExchange; $('#mShop').onclick = () => openShop(); $('#mEdit').onclick = editProfile;
    const pv = $('#mPriv'); if (pv) pv.onclick = () => Ads.privacyOptions();
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { Theme.set(b.dataset.mode); Snd.sfx('tap'); render(); });
    $('#mWipe').onclick = openWipe;
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
    if ((!a || editing || tab === 'input') && !['more', 'daily', 'tarot', 'mbtitest'].includes(tab)) { if (!a && !editing && tab !== 'input') pending = tab; body.innerHTML = navHTML(editing ? 'input' : (tab === 'input' ? 'input' : tab)) + formHTML(editing ? p : null); bindForm(); bindNav(); syncTabs(); body.scrollTop = 0; return; }
    if (tab === 'today') { attend(); body.innerHTML = todayHTML(p, a); bindToday(p, a); }
    else if (tab === 'saju') { body.innerHTML = sajuHTML(p, a); bindSaju(p, a); }
    else if (tab === 'compat') { body.innerHTML = compatTabHTML(p, a); bindCompat(p, a); }
    else if (tab === 'more') { body.innerHTML = moreHTML(); bindMore(); }
    else if (tab === 'daily') { attend(); body.innerHTML = dailyHTML(); bindDaily(); }
    else if (tab === 'tarot') { body.innerHTML = tarotHTML(p, a); bindTarot(p, a); }
    else if (tab === 'mbtitest') { body.innerHTML = mbtiTestHTML(p, a); bindMbtiTest(p, a); }
    else if (tab === 'tojeong') { body.innerHTML = tojeongHTML(p); bindTojeong(p); }
    else if (tab === 'newyear') { body.innerHTML = newYearHTML(p, a); const b = $('#nyOpen'); if (b) b.onclick = () => openShop('newyear'); }
    body.insertAdjacentHTML('afterbegin', navHTML(tab)); bindNav();
    if (!body.dataset.keep) body.scrollTop = 0;
    syncTabs();
  }

  function bindNav() { const b = $('#hnBack'); if (b) b.onclick = () => { editing = false; pending = null; back(); }; }
  function paintIcons(root = document) { root.querySelectorAll('i[data-ic]').forEach(i => { if (!i.firstChild) i.innerHTML = ICONS.ic(i.dataset.ic); }); }
  function init() {
    paintIcons();
    // 기존 화면 전환에 하단 탭 표시와 미션 체크를 연결
    const base = show;
    show = function (id) { base(id); if (id === 'end') { mission('game'); Auth.sync(); } syncTabs(); };
    document.querySelectorAll('#tabbar button').forEach(b => b.onclick = () => go(b.dataset.t));
    const th = store.get('p8b_theme', null); if (th != null) setTheme(th);
    window.addEventListener('themechange', () => { const t = store.get('p8b_theme', null); if (t != null) setTheme(t); });
    Store.onChange(() => { if ($('#hub').classList.contains('on')) render(); });
    hookHistory();
    $('#setBtn').onclick = () => { Snd.sfx('tap'); openSettings(); };
    $('#loginBtn').onclick = () => { Snd.sfx('tap'); Auth.user() ? openAccount() : openLogin(); };
    let wasIn = !!Auth.user();
    Auth.on(u => { topbarUI(); if (u && !wasIn) { if ($('#lgKakao')) closeOverlay(); toast(`👋 ${Auth.name()}님, 로그인했어요`); } wasIn = !!u; }); topbarUI();
    tab = 'home'; show('hub'); render();
    scheduleNoti();
  }
  return { init, go, render, mission, toast, me: getMe, people, analyze: analyzeP, openTojeong };
})();
Hub.init();
