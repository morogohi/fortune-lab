/* =====================================================================
 *  views.js — 서비스별 상세 풀이 · 열람할 때마다 카르마 차감 (개요는 각 화면에서 무료)
 *   · 서비스마다 가격(STORE_CONFIG.views.items) — 볼 때 카르마를 쓰고 열람
 *   · 결제한 날(자정까지)에는 같은 대상의 같은 서비스를 다시보기 FREE회(기본 3회) 무료
 *     → 무료 횟수를 다 쓰거나 날짜가 바뀌면 다시 결제
 *   · 대상: 사람(생년월일·시간·성별) 단위, 궁합은 두 사람 쌍 단위 — 다른 사람은 따로 결제
 *   · 예전에 '상세 사주 리포트'를 카르마로 연 사용자는 무료 (이미 낸 값 존중)
 *   · 열람 뒤 돌아오면 「방금 쓴 카르마」 영수증 카드를 보여 줌 (Views.receiptHTML)
 *   · 다시보기(무료)도 내역에 0으로 남겨 언제 봤는지 확인 가능
 * ===================================================================== */
const Views = (() => {
  const CFG = () => (window.STORE_CONFIG || {}).views || { free: 3, items: {} };
  const FREE = () => CFG().free;
  const SKEY = 'p8b_views';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const item = k => CFG().items[k];
  const list = () => Object.keys(CFG().items);
  const subj = p => p ? `${p.date}|${p.cal || 's'}|${p.time || ''}|${p.sex || ''}` : '-';
  const pair = (p, q) => subj(p) + '~' + subj(q);
  const all = () => store.get(SKEY, {});
  const id = (k, s) => k + '#' + s;
  // 예전 결제: 상세 사주 리포트를 실제로 연 경우(테스트 계정 전체 열람은 제외)
  const legacy = () => Store.ownedReal && Store.ownedReal('report');

  /* 오늘 상태: paid(오늘 결제했나) · used(오늘 본 횟수, 결제한 열람 포함) · freeLeft(남은 무료 다시보기) */
  function status(k, s, extraLegacy) {
    if (legacy() || extraLegacy) return { legacy: true, paid: true, used: 0, freeLeft: Infinity };
    const v = all()[id(k, s)];
    if (!v || v.day !== day()) return { paid: false, used: 0, freeLeft: 0 };
    return { paid: true, used: v.n, freeLeft: Math.max(0, FREE() - (v.n - 1)) };
  }
  function bump(k, s, paid) {
    const m = all(), cur = m[id(k, s)];
    m[id(k, s)] = paid || !cur || cur.day !== day() ? { day: day(), n: 1, t: Date.now() } : Object.assign(cur, { n: cur.n + 1 });
    // 오래된 기록 정리 (7일 지난 것)
    const old = day(Date.now() - 7 * 864e5); Object.keys(m).forEach(x => { if (m[x].day < old) delete m[x]; });
    store.set(SKEY, m);
    return m[id(k, s)];
  }

  /* ---------- 열람 세션 (같은 화면을 다시 그릴 때 두 번 세지 않게) ---------- */
  let cur = null;      // { k, s, at } — 지금 열람 중인 서비스
  let receipt = null;  // { k, d, bal, freeLeft, at, label, legacy }
  let ret = false;     // 열람 뒤 처음 돌아온 화면에 영수증을 한 번 보여 줄지
  const viewing = (k, s) => !!(cur && cur.k === k && (s == null || cur.s === s));

  /* 열기: 오늘 무료 다시보기가 남았으면 무료, 아니면 카르마 결제 후 열람
   * label: 내역·영수증에 쓸 이름 (예: '💰 재물운 · 홍길동') · show: 열람 화면을 여는 함수 · back: 취소 시 */
  function open(k, s, label, show, back, extraLegacy) {
    const it = item(k); if (!it) return;
    const st = status(k, s, extraLegacy);
    const go = (paid) => {
      const v = st.legacy ? null : bump(k, s, paid);
      const left = st.legacy ? Infinity : Math.max(0, FREE() - (v.n - 1));
      if (!paid && !st.legacy) Karma.note(`🔁 ${label} 다시보기 무료 (${v.n - 1}/${FREE()})`);
      if (st.legacy) Karma.note(`📜 ${label} 열람 (이전 구매 · 무료)`);
      cur = { k, s, at: Date.now() }; ret = true;
      receipt = { k, label, d: paid ? -it.k : 0, bal: Karma.bal(), freeLeft: left, at: Date.now(), legacy: !!st.legacy, again: !paid };
      try { Karma.metric(paid ? 'view_paid' : 'view_free'); } catch (e) { }
      show();
    };
    if (st.legacy) return go(false);
    if (st.paid && st.freeLeft > 0) return go(false);
    const why = st.paid ? `오늘 무료 다시보기 ${FREE()}회를 모두 썼어요. ` : '';
    Karma.spend(it.k, `${it.e} ${label.replace(/^\S+\s/, '')}`, () => go(true), back,
      `${why}결제한 오늘은 자정까지 <b>다시보기 ${FREE()}회 무료</b>예요.`);
  }
  function leave() { cur = null; }
  function takeReturn() { if (!ret || !receipt) return false; ret = false; return true; }

  /* ---------- 돌아왔을 때 보여 줄 영수증 ---------- */
  function receiptHTML() {
    if (!receipt || Date.now() - receipt.at > 30 * 60e3) return '';
    const r = receipt, it = item(r.k) || {};
    const left = r.legacy ? '이전 구매로 계속 무료' : r.freeLeft > 0 ? `오늘 무료 다시보기 <b>${r.freeLeft}회</b> 남음 (자정까지)` : '오늘 무료 다시보기를 다 썼어요 · 다음 열람은 다시 차감';
    return `<div class="hcard vrec" id="vRec"><div class="vrh"><b>🧾 방금 본 상세</b><button class="vrx" id="vRecX" aria-label="닫기">✕</button></div>
      <div class="vrr"><span>${esc(r.label)}</span><em class="${r.d < 0 ? 'm' : 'z'}">${r.d < 0 ? `✨ −${-r.d}` : r.legacy ? '무료' : '다시보기 무료'}</em></div>
      <small>${left} · 남은 카르마 <b>✨ ${Karma.bal()}</b></small>
      <div class="vrl">${Karma.recentHTML(3)}</div>
      <button class="ghost wide" id="vRecH">📒 카르마 사용 내역 전체 보기</button></div>`;
  }
  function bindReceipt(rerender) {
    const x = document.getElementById('vRecX'); if (x) x.onclick = () => { receipt = null; rerender && rerender(); };
    const h = document.getElementById('vRecH'); if (h) h.onclick = () => Karma.openHistory('spend');
  }
  /* 서비스 칩: 가격 또는 오늘 상태 */
  function chip(k, s, extraLegacy) {
    const it = item(k), st = status(k, s, extraLegacy);
    if (st.legacy) return '<em class="vch own">무료 (이전 구매)</em>';
    if (st.paid && st.freeLeft > 0) return `<em class="vch on">오늘 열람 · 다시보기 ${st.freeLeft}회 무료</em>`;
    if (st.paid) return `<em class="vch">무료 소진 · ✨ ${it.k}</em>`;
    return `<em class="vch">✨ ${it.k}</em>`;
  }
  // 테스트 도구: 오늘 열람 기록을 어제로 돌려 '날짜가 바뀐 뒤' 동작을 확인
  function shiftDay() { const m = all(), y = day(Date.now() - 864e5); Object.keys(m).forEach(x => m[x].day = y); store.set(SKEY, m); }
  function reset() { store.set(SKEY, {}); cur = null; receipt = null; }

  /* ---------- 상세 풀이 화면 (공통) ----------
   * openDetail(k, s, label, html, opt): 결제/무료 다시보기 → 'detail' 화면에 html() 결과를 보여 줌
   * opt.legacy: 이전 구매로 무료인지 · opt.back: 취소 시 · opt.title: 화면 제목 */
  let page = null;   // { k, s, label, html }
  function openDetail(k, s, label, html, opt = {}) {
    const from = Hub.cur ? Hub.cur() : 'home';
    open(k, s, label, () => { page = { k, s, label, html, from: from === 'detail' ? 'home' : from }; if (document.getElementById('overlay').classList.contains('on')) closeOverlay(true); Hub.register({ page: 'detail', title: opt.title || item(k).n, html: detailHTML, bind: bindDetail }); Hub.go('detail'); }, opt.back, opt.legacy);
  }
  // 상세 버튼: 가격 또는 오늘 다시보기 상태를 함께 표시
  function button(k, s, id, extraLegacy, label) {
    const it = item(k), st = status(k, s, extraLegacy);
    const tail = st.legacy ? '무료 (이전 구매)' : st.paid && st.freeLeft > 0 ? `오늘 다시보기 ${st.freeLeft}회 무료` : `✨ ${it.k}`;
    return `<button class="bigbtn wide vdet" id="${id}">🔓 ${label || '상세 풀이 보기'} <small>${tail}</small></button>`;
  }
  function detailHTML() {
    if (!page || !viewing(page.k, page.s)) return `<div class="hcard"><p class="sjtxt" style="margin:0">상세 풀이는 각 서비스 화면에서 「상세 풀이 보기」를 눌러 열 수 있어요.</p><button class="bigbtn wide" id="vHome">🏠 홈으로</button></div>`;
    const st = status(page.k, page.s), it = item(page.k);
    const left = st.legacy ? '이전 구매 · 무료' : st.freeLeft > 0 ? `오늘 무료 다시보기 ${st.freeLeft}회 남음` : '오늘 무료 다시보기를 다 썼어요';
    let body = ''; try { body = page.html(); } catch (e) { console.warn(e); body = '<div class="hcard"><p class="hsub">풀이를 만들지 못했어요. 정보를 확인해 주세요.</p></div>'; }
    return `<div class="hhead"><small>${esc(page.label.replace(/^\S+\s/, ''))}</small><h2>${it.e} ${it.n}</h2></div>
      <div class="vbar"><span>${left}</span><b>✨ ${Karma.bal()}</b></div>${body}
      <button class="bigbtn wide" id="vBack">← 돌아가기 · 사용 내역 보기</button>`;
  }
  function bindDetail() {
    const b = document.getElementById('vBack'); if (b) b.onclick = () => { leave(); Hub.go(page && page.from || 'home'); };
    const h = document.getElementById('vHome'); if (h) h.onclick = () => Hub.go('home');
    try { page && page.bind && page.bind(); } catch (e) { }
    document.querySelectorAll('#hubBody details.dfold').forEach(d => d.open = true);
  }

  return { openDetail, button, takeReturn, item, list, subj, pair, status, open, leave, viewing, receiptHTML, bindReceipt, chip, FREE, shiftDay, reset, cur: () => cur, receipt: () => receipt, day };
})();
