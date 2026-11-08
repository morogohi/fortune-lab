/* =====================================================================
 *  karma.js — 카르마 하나로 단순화한 유료 모델
 *   · 대표 상품 2개: 상세 사주 리포트(카르마 50) · AI 사주상담(1회 20, 첫 회 무료) / 게임 아이템은 별도
 *   · 카르마 모으기: 📺 광고 1번 +5 (3분 간격 · 하루 10번) · 🎲 인생 게임 엔딩 5~15 · 게임 중간 광고 휴식 +3
 *   · 💳 카르마는 돈으로도 살 수 있다 (100 · 330 · 1,200)
 *   · 🧪 테스트 모드(테스트 페이지·테스트 계정): 광고·결제를 실제 없이 가상으로 처리
 * ===================================================================== */
const Karma = (() => {
  const AD_K = 5, AD_GAP = 3 * 60e3, AD_DAY = 10, BREAK_K = 3, BREAK_EVERY = 10, AKEY = 'p8b_adk';
  const day = () => new Date().toISOString().slice(0, 10);
  const testMode = () => !Store.native && (!!window.P8B_COMMERCIAL || !!(window.Auth && Auth.isTest && Auth.isTest()));
  const bal = () => (typeof karma !== 'undefined' ? karma : 0);
  // 전환 측정 (이 기기에만): 광고 시작·완료·실패, 부족분 안내, 결제 시작·취소·완료, 콘텐츠 해제·재열람
  const MKEY = 'p8b_metrics';
  function metric(k) { const m = store.get(MKEY, {}); m[k] = (m[k] || 0) + 1; m._since = m._since || Date.now(); store.set(MKEY, m); }
  function add(n, why) { window.KREASON = why || '카르마 받기'; karma += n; saveMeta(); try { Auth.sync(); } catch (e) { } Store.notify(); if (why) Hub.toast(`✨ 카르마 +${n} · ${why}`); }
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
      Snd.sfx('coin'); add(AD_K, `광고 보상 (오늘 ${o.n}/${AD_DAY})`); after && after();
    });
  }

  /* ---------- 쓰기 · 충전 ---------- */
  // n 카르마를 써서 onOk 실행 (부족하면 충전 화면)
  function spend(n, label, onOk, back) {
    if (bal() < n) { metric('lack_shown'); openCharge(n - bal(), label, back); return; }
    openOverlay(`✨ ${label}`, `<p class="sjtxt" style="text-align:center">카르마 <b>${n}</b>를 써서 열까요?<br><small>보유 ${bal()} → ${bal() - n}</small></p>`,
      [{ t: `✨ 카르마 ${n} 쓰고 열기`, pri: 1, f: () => { window.KREASON = label.replace(/^\S+\s/, ''); karma -= n; saveMeta(); metric('spend'); try { Auth.sync(); } catch (e) { } Snd.sfx('fanfare'); onOk(); Store.notify(); } }, { t: '취소', f: () => back && back() }]);
  }
  function unlock(k, after) {
    const it = Store.item(k); if (!it || !it.k) return;
    if (Store.has(k)) { after && after(); return; }
    spend(it.k, `${it.e} ${it.n}`, () => { Store.unlock(k); metric('unlock_' + k); try { Auth.sync(); } catch (e) { } Hub.toast(`🔓 열렸어요 · ${it.n}`); after && after(); });
  }
  function adLabel() { const left = adLeft(), w = adWait(); return `${left ? (w ? `${fmt(w)} 뒤 다시 가능` : '지금 받을 수 있어요') : '오늘은 다 받았어요'} · 오늘 ${AD_DAY - left}/${AD_DAY}`; }
  let tick = null;
  function ledgerHTML() {
    const l = store.get('p8b_klog', []);
    return `<details class="kled"><summary>📒 카르마 내역 (최근 ${Math.min(l.length, 20)}건)</summary>${l.length ? l.slice(0, 20).map(x => `<div class="kledr"><span>${new Date(x.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><b>${esc(x.why)}</b><em class="${x.d > 0 ? 'p' : 'm'}">${x.d > 0 ? '+' : ''}${x.d}</em><small>잔액 ${x.bal}</small></div>`).join('') : '<p class="sjnote">아직 내역이 없어요.</p>'}</details>`;
  }
  // 테스트 모드: 전환 기록 보기
  function openMetrics() {
    const m = store.get(MKEY, {}), N = { ad_start: '광고 시작', ad_done: '광고 완료', ad_fail: '광고 중단·실패', lack_shown: '카르마 부족 안내', pay_start: '결제 시작', pay_cancel: '결제 취소', pay_done: '결제 완료', pay_fail: '결제 실패', spend: '카르마 사용', unlock_report: '상세 리포트 해제', unlock_fate: '운명 조작 해제', report_view: '상세 리포트 열람', counsel_run: '상담 실행' };
    const rate = (a, b) => m[b] ? Math.round((m[a] || 0) / m[b] * 100) + '%' : '—';
    openOverlay('📈 전환 기록 (이 기기)', `<p class="sjnote">${m._since ? new Date(m._since).toLocaleDateString('ko-KR') + '부터' : '아직 기록 없음'} · 서버로 보내지 않아요</p>
      ${Object.keys(N).map(k => `<div class="kledr"><b>${N[k]}</b><em>${m[k] || 0}</em></div>`).join('')}
      <p class="sjtxt">광고 완료율 ${rate('ad_done', 'ad_start')} · 결제 완료율 ${rate('pay_done', 'pay_start')} · 부족 안내 → 해제 ${rate('unlock_report', 'lack_shown')}</p>`,
      [{ t: '초기화', f: () => { store.set(MKEY, {}); } }, { t: '닫기' }]);
  }
  function chargeHTML(need, label) {
    const left = adLeft(), w = adWait();
    return `<div class="kbal"><span>보유 카르마</span><b>✨ ${bal()}</b>${need ? `<small>${label ? esc(label) + ' 열기까지 ' : ''}<b>${need}</b> 더 필요해요</small>` : ''}</div>
      ${testMode() ? '<div class="webtrial">🧪 테스트 모드 · 광고와 결제가 실제 없이 가상으로 처리돼요</div>' : ''}
      <h4 class="kh">무료로 모으기</h4>
      <button class="kopt" id="kAd"><i>📺</i><span><b>광고 보고 +${AD_K}</b><small id="kAdT">${adLabel()}</small></span></button>
      <button class="kopt" id="kGame"><i>🎲</i><span><b>인생 게임 한 판</b><small>엔딩마다 5~15 · 10살마다 광고 휴식 +${BREAK_K}</small></span></button>
      <h4 class="kh">카르마 구매</h4>
      ${Store.packs().map(k => { const it = Store.item(k); return `<button class="kopt" data-pack="${k}"><i>${it.e}</i><span><b>${it.n}</b><small>${it.d}</small></span><em>${Store.native || testMode() ? Store.price(k) : '앱'}</em></button>`; }).join('')}
      ${ledgerHTML()}
      <p class="sjnote">카르마로 여는 것: 📜 상세 사주 리포트 50 · 🤖 AI 사주상담 1회 20 (첫 회 무료) · 🎮 게임 아이템</p>`;
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openCharge(need, label, back) {
    openOverlay('✨ 카르마 모으기', chargeHTML(need, label), [{ t: '닫기', f: () => back && back() }]);
    bindCharge(() => openCharge(Math.max(0, need - 0), label, back));
  }
  function bindCharge(re) {
    const a = document.getElementById('kAd'); if (a) a.onclick = () => adReward(re);
    // 남은 시간을 1초마다 갱신 (창을 다시 열지 않아도 실제 대기 시간과 같게)
    clearInterval(tick); tick = setInterval(() => { const t = document.getElementById('kAdT'); if (!t) { clearInterval(tick); return; } t.textContent = adLabel(); }, 1000);
    const g = document.getElementById('kGame'); if (g) g.onclick = () => { closeOverlay(); Hub.go('game'); };
    document.querySelectorAll('[data-pack]').forEach(b => b.onclick = () => buyPack(b.dataset.pack, re));
  }
  function buyPack(k, after) {
    const it = Store.item(k); metric('pay_start');
    if (Store.native) { Store.buy(k, (ok, err) => { if (ok) { metric('pay_done'); add(it.karma, it.n + ' 구매'); Snd.sfx('fanfare'); after && after(); } else { metric(/cancel/i.test(err || '') ? 'pay_cancel' : 'pay_fail'); if (err && !/cancel/i.test(err)) Hub.toast('결제하지 못했어요'); } }); return; }
    if (testMode()) {
      openOverlay('🧪 테스트 결제', `<p class="sjtxt" style="text-align:center">${it.e} <b>${it.n}</b> · ${it.price}<br>테스트 모드라 실제 결제 없이 카르마가 지급돼요.</p>`,
        [{ t: `🧪 ${it.price} 결제한 것으로 하기`, pri: 1, f: () => { metric('pay_done'); add(it.karma, `${it.n} (테스트 결제)`); Snd.sfx('fanfare'); after && after(); } },
         ...(STORE_CONFIG.feedbackUrl ? [{ t: '💬 이 가격에 대한 의견 남기기', f: () => window.open(STORE_CONFIG.feedbackUrl, '_blank', 'noopener') }] : []),
         { t: '취소', f: () => { metric('pay_cancel'); after && after(); } }]);
      return;
    }
    openOverlay(`${it.e} ${it.n}`, `<p class="sjtxt" style="text-align:center">카르마 구매는 <b>안드로이드·아이폰 앱</b>에서 할 수 있어요.<br>웹에서는 광고 체험과 인생 게임으로 카르마를 모아 보세요.</p>`, [{ t: '돌아가기', f: () => after && after() }]);
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
        ch: noads ? [{ t: `✨ 카르마 +1 받기`, f: () => add(1, '쉬어 가기') }]
          : [{ t: `📺 광고 보고 카르마 +${BREAK_K}`, f: () => { if (window.Grow) Grow.setSpeed(0); showAd(ok => { if (ok) add(BREAK_K, '게임 중간 광고'); }, '📺 광고 휴식'); } }, { t: '다음에 볼게요' }] });
    };
  }
  init();
  return { metric, openMetrics, spend, unlock, openCharge, chargeHTML, bindCharge, adReward, showAd, testMode, add, bal, buyPack, AD_K, BREAK_K };
})();
