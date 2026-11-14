/* =====================================================================
 *  karma.js — 카르마 하나로 단순화한 유료 모델
 *   · 대표 상품 2개: 상세 사주 리포트(카르마 50) · AI 사주상담(1회 20, 첫 회 무료)
 *   · 가벼운 상품: 타로 사주 심층 풀이(1회 10, 매일 1회 무료 · 리포트 보유 시 3회) / 게임 아이템은 별도
 *   · 카르마 모으기: 📺 광고 1번 +5 (3분 간격 · 하루 10번) · 🎲 인생 게임 엔딩 5~15 · 게임 중간 광고 휴식 +3
 *   · 💳 카르마는 돈으로도 살 수 있다 (100 · 330 · 1,200)
 *   · 🧪 테스트 모드(테스트 페이지·테스트 계정): 광고·결제를 실제 없이 가상으로 처리
 *   · 📒 사용 내역: 모으기(광고·게임·보너스) · 구매 · 사용을 나눠 기록하고 필터·요약으로 보여 줌
 *   · ✨ 기본 지급 100 (STORE_CONFIG.startKarma) · 🧧 무상 이벤트 (STORE_CONFIG.events: 신년 200, 2026-12-31까지 1회)
 *   · ❓ 카르마 안내: 무엇인지 · 어떻게 모으는지 · 어디에 쓰는지 (홈·상점의 ? 버튼)
 * ===================================================================== */
const Karma = (() => {
  const AD_K = 5, AD_GAP = 3 * 60e3, AD_DAY = 10, BREAK_K = 3, BREAK_EVERY = 10, AKEY = 'p8b_adk';
  const day = () => new Date().toISOString().slice(0, 10);
  const testMode = () => !Store.native && (!!window.P8B_COMMERCIAL || !!(window.Auth && Auth.isTest && Auth.isTest()));
  const bal = () => (typeof karma !== 'undefined' ? karma : 0);
  // 전환 측정 (이 기기에만): 광고 시작·완료·실패, 부족분 안내, 결제 시작·취소·완료, 콘텐츠 해제·재열람
  const MKEY = 'p8b_metrics';
  function metric(k) { const m = store.get(MKEY, {}); m[k] = (m[k] || 0) + 1; m._since = m._since || Date.now(); store.set(MKEY, m); }
  function add(n, why, cat) { window.KREASON = why || '카르마 받기'; window.KCAT = cat || null; karma += n; saveMeta(); try { Auth.sync(); } catch (e) { } Store.notify(); if (why) Hub.toast(`✨ 카르마 +${n} · ${why}`); }
  function adState() { const o = store.get(AKEY, null); return o && o.d === day() ? o : { d: day(), n: 0, last: 0 }; }
  function adLeft() { return Math.max(0, AD_DAY - adState().n); }
  function adWait() { return Math.max(0, adState().last + AD_GAP - Date.now()); }
  const fmt = ms => { const s = Math.ceil(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; };

  /* ---------- 광고 (앱: 보상형 광고 · 웹: 광고 체험 5초) ---------- */
  function showAd(done, title = '📺 광고') {
    if (Store.native || (window.WebAds && WebAds.on)) {
      if (!Ads.canReward()) { Hub.toast('지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해 주세요'); done(false); return; }
      Ads.showReward(got => done(!!got)); return;
    }
    let n = 5;
    openOverlay(`${title} ${testMode() ? '(테스트)' : '(웹 체험)'}`, `<div class="yf-ad"><div class="yf-adbox">광고 자리<small>${testMode() ? '🧪 테스트 모드 · 실제 광고 대신 5초 기다려요' : '앱에서는 여기에 실제 광고가 나와요'}</small></div><p id="kAdN">${n}초 뒤 보상을 받아요</p></div>`, []);
    const iv = setInterval(() => {
      n--; const e = document.getElementById('kAdN'); if (e) e.textContent = n > 0 ? `${n}초 뒤 보상을 받아요` : '완료!';
      if (n <= 0) { clearInterval(iv); setTimeout(() => { if (document.getElementById('kAdN')) closeOverlay(); done(true); }, 350); }
    }, 1000);
  }
  function adReward(after) {
    if (!adLeft()) { Hub.toast('오늘 광고 보상은 다 받았어요. 내일 다시 모을 수 있어요'); return; }
    const w = adWait(); if (w > 0) { Hub.toast(`다음 광고 보상까지 ${fmt(w)} 남았어요`); return; }
    metric('ad_start');
    showAd(ok => {
      if (!ok) { metric('ad_fail'); return; }
      metric('ad_done');
      const o = adState(); o.n++; o.last = Date.now(); store.set(AKEY, o);
      Snd.sfx('coin'); add(AD_K, `광고 보상 (오늘 ${o.n}/${AD_DAY})`, 'ad'); after && after();
    });
  }

  /* ---------- 쓰기 · 충전 ---------- */
  // n 카르마를 써서 onOk 실행 (부족하면 충전 화면)
  function spend(n, label, onOk, back) {
    if (bal() < n) { metric('lack_shown'); openCharge(n - bal(), label, back); return; }
    openOverlay(`✨ ${label}`, `<p class="sjtxt" style="text-align:center">카르마 <b>${n}</b>를 써서 열까요?<br><small>보유 ${bal()} → ${bal() - n}</small></p>`,
      [{ t: `✨ 카르마 ${n} 쓰고 열기`, pri: 1, f: () => { window.KREASON = label.replace(/^\S+\s/, ''); window.KCAT = 'spend'; karma -= n; saveMeta(); metric('spend'); try { Auth.sync(); } catch (e) { } Snd.sfx('fanfare'); onOk(); Store.notify(); } }, { t: '취소', f: () => back && back() }]);
  }
  function unlock(k, after) {
    const it = Store.item(k); if (!it || !it.k) return;
    if (Store.has(k)) { after && after(); return; }
    spend(it.k, `${it.e} ${it.n}`, () => { Store.unlock(k); metric('unlock_' + k); try { Auth.sync(); } catch (e) { } Hub.toast(`🔓 열렸어요 · ${it.n}`); after && after(); });
  }
  function adLabel() { const left = adLeft(), w = adWait(); return `${left ? (w ? `${fmt(w)} 뒤 다시 가능` : '지금 받을 수 있어요') : '오늘은 다 받았어요'} · 오늘 ${AD_DAY - left}/${AD_DAY}`; }
  let tick = null;
  /* ---------- 📒 사용 내역 ---------- */
  // 분류: ad 광고 · game 인생 게임 · bonus 이벤트·교환 · buy 구매 · spend 사용 (예전 기록은 이유 문구로 추정)
  const CATS = { ad: ['📺', '광고'], game: ['🎲', '인생 게임'], bonus: ['🎁', '보너스'], buy: ['💳', '구매'], spend: ['✨', '사용'] };
  function cat(x) {
    if (x.c && CATS[x.c]) return x.c;
    const w = x.why || '';
    if (x.d < 0) return 'spend';
    if (/구매|결제/.test(w)) return 'buy';
    if (/광고/.test(w)) return 'ad';
    if (/게임|엔딩|버킷|시즌|쉬어|넷시티/.test(w)) return 'game';
    return 'bonus';
  }
  const log = () => store.get('p8b_klog', []);
  const dayOf = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const localDay = () => dayOf(Date.now());
  // 기간별 합계: 모은 것(광고·게임·보너스) · 산 것 · 쓴 것
  function sum(from) {
    const r = { earn: 0, buy: 0, spend: 0, n: 0 };
    log().forEach(x => { if (from && x.t < from) return; const c = cat(x); r.n++; if (c === 'spend') r.spend -= x.d; else if (c === 'buy') r.buy += x.d; else if (x.d > 0) r.earn += x.d; });
    return r;
  }
  function today() { const d0 = new Date(); d0.setHours(0, 0, 0, 0); return Object.assign(sum(+d0), { adLeft: adLeft(), adMax: AD_DAY }); }
  function rowHTML(x) {
    const c = cat(x), [e] = CATS[c];
    return `<div class="kledr"><span>${new Date(x.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><b>${e} ${esc(x.why)}</b><em class="${x.d > 0 ? 'p' : 'm'}">${x.d > 0 ? '+' : ''}${x.d}</em><small>${CATS[c][1]} · 잔액 ${x.bal}</small></div>`;
  }
  function ledgerHTML() {
    const t = today();
    return `<button class="kopt" data-k="hist"><i>📒</i><span><b>카르마 사용 내역</b><small>오늘 모음 +${t.earn + t.buy} · 사용 −${t.spend} · 전체 ${log().length}건</small></span><em>›</em></button>`;
  }
  function openHistory(f = 'all', back) {
    const l = log(), m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    const mon = sum(+m0), all = sum(0), td = today();
    const F = [['all', '전체'], ['earn', '모으기'], ['buy', '구매'], ['spend', '사용']];
    const pick = l.filter(x => { const c = cat(x); return f === 'all' || (f === 'spend' ? c === 'spend' : f === 'buy' ? c === 'buy' : c !== 'spend' && c !== 'buy'); });
    // 날짜별로 묶어서 보여 줌
    let lastD = '', rows = '';
    pick.slice(0, 120).forEach(x => { const d = dayOf(x.t); if (d !== lastD) { lastD = d; rows += `<h4 class="kday">${d === localDay() ? '오늘' : d.slice(5).replace('-', '월 ') + '일'}</h4>`; } rows += rowHTML(x); });
    openOverlay('📒 카르마 사용 내역', `<div class="kbal"><span>보유 카르마</span><b>✨ ${bal()}</b><small>오늘 모음 +${td.earn} · 구매 +${td.buy} · 사용 −${td.spend} · 광고 보상 ${AD_DAY - td.adLeft}/${AD_DAY}</small></div>
      <div class="ksum"><div><small>이번 달 모음</small><b class="p">+${mon.earn}</b></div><div><small>이번 달 구매</small><b class="p">+${mon.buy}</b></div><div><small>이번 달 사용</small><b class="m">−${mon.spend}</b></div></div>
      <div class="modeseg kflt">${F.map(([k, n]) => `<button data-kf="${k}" class="${k === f ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${rows || '<p class="sjnote" style="text-align:center">아직 내역이 없어요.<br>광고를 보거나 인생 게임을 한 판 하면 여기에 쌓여요.</p>'}
      <p class="sjnote">누적: 모음 +${all.earn} · 구매 +${all.buy} · 사용 −${all.spend} · 최근 200건까지 이 기기에 저장돼요${pick.length > 120 ? ' (화면에는 120건)' : ''}.</p>`,
      [{ t: '✨ 카르마 모으기 · 상점', f: () => Hub.go('shop') }, { t: '닫기', f: () => back && back() }]);
    document.querySelectorAll('#osheet [data-kf]').forEach(b => b.onclick = () => { closeOverlay(true); openHistory(b.dataset.kf, back); });
  }

  /* ---------- ❓ 카르마 안내 ---------- */
  function helpHTML() {
    return `<div class="khelp">
      <p class="sjtxt"><b>카르마(✨)</b>는 운명 연구소의 유료 콘텐츠를 여는 <b>하나뿐인 재화</b>예요. 좋은 일을 쌓으면 복이 돌아오듯, 광고를 보거나 인생을 끝까지 살아 내면 쌓여요.</p>
      <h4 class="kh">어떻게 모으나요?</h4>
      <div class="kway"><i>📺</i><span><b>광고 보기 +${AD_K}</b><small>3분 간격 · 하루 ${AD_DAY}번 (최대 ${AD_K * AD_DAY})</small></span></div>
      <div class="kway"><i>🎲</i><span><b>인생 게임 엔딩 +5~15</b><small>한 판을 끝까지 살면 점수에 따라 지급 · 10살마다 광고 휴식 +${BREAK_K}</small></span></div>
      <div class="kway"><i>✨</i><span><b>처음 시작 +${START()}</b><small>처음 앱을 열면 기본으로 드려요</small></span></div>
      ${(window.STORE_CONFIG || {}).signupBonus ? `<div class="kway"><i>🎉</i><span><b>회원가입 +${STORE_CONFIG.signupBonus}</b><small>카카오·구글로 처음 로그인하면 계정당 1번 · 생년월일 등 사주 정보는 서버로 보내지 않아요</small></span></div>` : ''}
      ${events().map(g => `<div class="kway"><i>${g.e}</i><span><b>${esc(g.n)} +${g.karma}</b><small>${fmtD(g.until)}까지 앱을 열면 1회 · ${gotEvent(g.id) ? '받았어요 ✅' : '곧 지급돼요'}</small></span></div>`).join('')}
      <div class="kway"><i>🎁</i><span><b>복주머니 교환 +20</b><small>출석·미션으로 모은 복주머니 2개</small></span></div>
      <div class="kway"><i>💳</i><span><b>상점에서 구매</b><small>${Store.packs().map(k => { const it = Store.item(k); return `✨${it.karma.toLocaleString()} = ${it.price}`; }).join(' · ')}</small></span></div>
      <h4 class="kh">어디에 쓰나요?</h4>
      <div class="kway"><i>📜</i><span><b>상세 사주 리포트 ${(Store.item('report') || {}).k || 50}</b><small>한 번 열면 계속 · 궁합 상세·토정비결 전체 포함</small></span></div>
      <div class="kway"><i>🤖</i><span><b>AI 사주상담 1회 20</b><small>첫 회 무료</small></span></div>
      <div class="kway"><i>🔮</i><span><b>타로 사주 심층 풀이 1회 10</b><small>매일 1회 무료</small></span></div>
      <div class="kway"><i>🎮</i><span><b>인생 게임 아이템</b><small>다시 태어나기 15 · 기적 40 · 운명 조작 팩 30 · 갈림길 미리 보기 3</small></span></div>
      <p class="sjnote">카르마는 쓰면 없어지는 소모성 재화예요. 이 기기에 저장되며, 앱을 지우면 남은 카르마도 사라질 수 있어요 (로그인하면 계정에 함께 저장돼요). 카르마는 현금으로 바꾸거나 환불할 수 없어요 — 구매 환불은 스토어 정책을 따라요.</p></div>`;
  }
  function openHelp(back) {
    openOverlay('❓ 카르마가 뭔가요?', `<div class="kbal sm"><span>보유 카르마</span><b>✨ ${bal()}</b></div>` + helpHTML(),
      [{ t: '✨ 카르마 모으기 · 상점', pri: 1, f: () => Hub.go('shop') }, { t: '📒 사용 내역 보기', f: () => openHistory('all', back) }, { t: '닫기', f: () => back && back() }]);
  }
  // 다음 목표: 아직 안 연 대표 상품까지 남은 카르마 (홈 카드용)
  function nextGoal() {
    const it = Store.item('report');
    if (it && !Store.has('report')) return { e: it.e, n: it.n, need: Math.max(0, it.k - bal()), k: it.k };
    return { e: '🤖', n: 'AI 사주상담 1회', need: Math.max(0, 20 - bal()), k: 20 };
  }

  // 테스트 모드: 전환 기록 보기
  function openMetrics() {
    const m = store.get(MKEY, {}), N = { ad_start: '광고 시작', ad_done: '광고 완료', ad_fail: '광고 중단·실패', lack_shown: '카르마 부족 안내', pay_start: '결제 시작', pay_cancel: '결제 취소', pay_done: '결제 완료', pay_fail: '결제 실패', spend: '카르마 사용', unlock_report: '상세 리포트 해제', unlock_fate: '운명 조작 해제', unlock_tarot: '타로 심층 (카르마)', tarot_free: '타로 심층 (무료)', report_view: '상세 리포트 열람', counsel_run: '상담 실행', event_newyear2027: '신년 이벤트 지급' };
    const rate = (a, b) => m[b] ? Math.round((m[a] || 0) / m[b] * 100) + '%' : '—';
    openOverlay('📈 전환 기록 (이 기기)', `<p class="sjnote">${m._since ? new Date(m._since).toLocaleDateString('ko-KR') + '부터' : '아직 기록 없음'} · 서버로 보내지 않아요</p>
      ${Object.keys(N).map(k => `<div class="kledr"><b>${N[k]}</b><em>${m[k] || 0}</em></div>`).join('')}
      <p class="sjtxt">광고 완료율 ${rate('ad_done', 'ad_start')} · 결제 완료율 ${rate('pay_done', 'pay_start')} · 부족 안내 → 해제 ${rate('unlock_report', 'lack_shown')}</p>`,
      [{ t: '초기화', f: () => { store.set(MKEY, {}); } }, { t: '닫기' }]);
  }
  // noBal: 상점 탭처럼 위에 이미 잔액 카드가 있으면 잔액 줄을 빼요
  function chargeHTML(need, label, noBal) {
    return `${noBal ? '' : `<div class="kbal"><span>보유 카르마</span><b>✨ ${bal()}</b>${need ? `<small>${label ? esc(label) + ' 열기까지 ' : ''}<b>${need}</b> 더 필요해요</small>` : ''}</div>`}
      ${testMode() ? '<div class="webtrial">🧪 테스트 모드 · 광고와 결제가 실제 없이 가상으로 처리돼요</div>' : ''}
      <h4 class="kh">무료로 모으기</h4>
      <button class="kopt" data-k="ad"><i>📺</i><span><b>광고 보고 +${AD_K}</b><small class="kAdT">${adLabel()}</small></span></button>
      <button class="kopt" data-k="game"><i>🎲</i><span><b>인생 게임 한 판</b><small>엔딩마다 5~15 · 10살마다 광고 휴식 +${BREAK_K}</small></span></button>
      <h4 class="kh">카르마 구매</h4>
      ${Store.packs().map(k => { const it = Store.item(k); return `<button class="kopt" data-pack="${k}"><i>${it.e}</i><span><b>${it.n}</b><small>${it.d}</small></span><em>${Store.native || testMode() ? Store.price(k) : '앱'}</em></button>`; }).join('')}
      ${ledgerHTML()}
      <p class="sjnote">카르마로 여는 것: 📜 상세 사주 리포트 50 · 🤖 AI 사주상담 1회 20 (첫 회 무료) · 🔮 타로 사주 심층 풀이 1회 10 (매일 1회 무료) · 🎮 게임 아이템</p>`;
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openCharge(need, label, back) {
    openOverlay('✨ 카르마 모으기', chargeHTML(need, label), [{ t: '닫기', f: () => back && back() }]);
    bindCharge(() => openCharge(Math.max(0, need - 0), label, back));
  }
  // root: 묶을 범위 (기본 팝업 · 상점 페이지는 #hubBody)
  function bindCharge(re, root) {
    root = root || document.getElementById('osheet');
    const q = s => root.querySelector(s);
    const a = q('[data-k=ad]'); if (a) a.onclick = () => adReward(re);
    // 남은 시간을 1초마다 갱신 (창을 다시 열지 않아도 실제 대기 시간과 같게)
    clearInterval(tick); tick = setInterval(() => { const t = document.querySelectorAll('.kAdT'); if (!t.length) { clearInterval(tick); return; } t.forEach(x => x.textContent = adLabel()); }, 1000);
    const g = q('[data-k=game]'); if (g) g.onclick = () => { if (document.getElementById('overlay').classList.contains('on')) closeOverlay(); Hub.go('game'); };
    const h = q('[data-k=hist]'); if (h) h.onclick = () => openHistory('all', re);
    root.querySelectorAll('[data-pack]').forEach(b => b.onclick = () => buyPack(b.dataset.pack, re));
  }
  function buyPack(k, after) {
    const it = Store.item(k); metric('pay_start');
    if (Store.native) { Store.buy(k, (ok, err) => { if (ok) { metric('pay_done'); add(it.karma, it.n + ' 구매', 'buy'); Snd.sfx('fanfare'); after && after(); } else { metric(/cancel/i.test(err || '') ? 'pay_cancel' : 'pay_fail'); if (err && !/cancel/i.test(err)) openOverlay('결제하지 못했어요', `<p class="sjtxt" style="text-align:center">${Store.errText(err)}</p>`, [{ t: '확인', f: () => after && after() }]); } }); return; }
    if (testMode()) {
      openOverlay('🧪 테스트 결제', `<p class="sjtxt" style="text-align:center">${it.e} <b>${it.n}</b> · ${it.price}<br>테스트 모드라 실제 결제 없이 카르마가 지급돼요.</p>`,
        [{ t: `🧪 ${it.price} 결제한 것으로 하기`, pri: 1, f: () => { metric('pay_done'); add(it.karma, `${it.n} 구매 (테스트 결제)`, 'buy'); Snd.sfx('fanfare'); after && after(); } },
         ...(STORE_CONFIG.feedbackUrl ? [{ t: '💬 이 가격에 대한 의견 남기기', f: () => window.open(STORE_CONFIG.feedbackUrl, '_blank', 'noopener') }] : []),
         { t: '취소', f: () => { metric('pay_cancel'); after && after(); } }]);
      return;
    }
    openOverlay(`${it.e} ${it.n}`, `<p class="sjtxt" style="text-align:center">카르마 구매는 <b>안드로이드·아이폰 앱</b>에서 할 수 있어요.<br>웹에서는 광고 체험과 인생 게임으로 카르마를 모아 보세요.</p>`, [{ t: '돌아가기', f: () => after && after() }]);
  }

  /* ---------- ✨ 기본 지급 · 🧧 무상 카르마 이벤트 ---------- */
  const EKEY = 'p8b_events';                      // 받은 이벤트 {id: 받은 시각} — '기록 지우기'에도 남김
  const START = () => (window.STORE_CONFIG || {}).startKarma || 100;
  const events = () => ((window.STORE_CONFIG || {}).events || []).filter(g => g.karma > 0 && localDay() <= g.until && (!g.from || localDay() >= g.from));
  const gotEvent = id => !!store.get(EKEY, {})[id];
  const fmtD = d => `${d.slice(0, 4)}년 ${+d.slice(5, 7)}월 ${+d.slice(8)}일`;
  function grants() {
    const out = [];
    // 처음 시작: 내역에 '기본 지급'으로 남김 (잔액 0에서 시작해 +100)
    if (localStorage.getItem('p8b_karma') == null && !log().length) {
      karma = 0; store.set('p8b_karma', 0);
      add(START(), '첫 시작 기본 지급', 'bonus'); out.push(START());
    }
    events().forEach(g => {
      if (gotEvent(g.id)) return;
      const r = store.get(EKEY, {}); r[g.id] = Date.now(); store.set(EKEY, r);
      window.KREASON = `${g.e} ${g.n}`; window.KCAT = 'bonus'; karma += g.karma; saveMeta();
      try { Auth.sync(); } catch (e) { } Store.notify(); metric('event_' + g.id); out.push(g.karma);
      setTimeout(() => Hub.toast(`${g.e} ${g.n} +${g.karma} · ${fmtD(g.until)}까지`), out.length > 1 ? 2600 : 0);
    });
    return out;
  }

  /* ---------- 인생 게임 중간 광고 휴식 (10살마다) ---------- */
  function init() {
    if (typeof ageUp !== 'function') return;
    const _age = ageUp; ageUp = function () {
      const a0 = P && P.age; _age();
      if (!P || !P.alive || P.age === a0 || P.age % BREAK_EVERY || P.age === 0) return;
      if (typeof Fork !== 'undefined' && Fork.busy) return;   // 가상 실행 중에는 없음
      const noads = Store.has('noads');
      showModal({ id: 'adbreak', e: '📺', t: `${P.age}살 · 잠깐 쉬어 가요`, autoPick: noads ? 0 : 1, noFork: 1,
        d: noads ? `광고 제거 이용 중이라 광고 없이 카르마 +1을 드려요.` : `광고를 보면 카르마 <b>+${BREAK_K}</b>를 받아요. 모은 카르마로 종합 사주풀이·AI 상담 등을 열 수 있어요.`,
        ch: noads ? [{ t: `✨ 카르마 +1 받기`, f: () => add(1, '쉬어 가기 (인생 게임)', 'game') }]
          : [{ t: `📺 광고 보고 카르마 +${BREAK_K}`, f: () => { if (window.Grow) Grow.setSpeed(0); showAd(ok => { if (ok) add(BREAK_K, '게임 중간 광고', 'ad'); }, '📺 광고 휴식'); } }, { t: '다음에 볼게요' }] });
    };
  }
  init();
  setTimeout(grants, 600);   // 허브가 뜬 뒤 지급 (토스트·잔액 갱신)
  return { metric, openMetrics, spend, unlock, openCharge, chargeHTML, bindCharge, adReward, showAd, testMode, add, bal, buyPack, AD_K, BREAK_K, AD_DAY,
    openHistory, openHelp, helpHTML, ledgerHTML, today, nextGoal, cat, adLabel, grants, events };
})();
