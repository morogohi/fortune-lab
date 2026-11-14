/* =====================================================================
 *  biz.js — 사업화 기능
 *  상점 · 프리미엄 사주 리포트 · 궁합 모드(운명의 상대) · 쇼츠용 인생 카드 · 신년 이벤트
 * ===================================================================== */

/* ---------- 공용 오버레이 ---------- */
function openOverlay(title, html, btns = [{ t: '닫기' }]) {
  const o = document.getElementById('overlay'), sh = document.getElementById('osheet');
  sh.innerHTML = `<button class="mclose" aria-label="닫기">✕</button><h3>${title}</h3>${html}`;
  sh.firstChild.onclick = () => { Snd.sfx('tap'); const c = btns.find(b => /^(닫기|취소|계속 하기)$/.test(b.t)); closeOverlay(); c && c.f && c.f(); };
  btns.forEach(b => {
    const el = document.createElement('button'); el.className = 'obtn' + (b.pri ? ' pri' : ''); el.innerHTML = b.t;
    el.onclick = () => { Snd.sfx('tap'); if (!b.keep) closeOverlay(); b.f && b.f(); };
    sh.appendChild(el);
  });
  o.classList.add('on'); sh.scrollTop = 0;
}
function closeOverlay() { document.getElementById('overlay').classList.remove('on'); }
document.getElementById('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeOverlay(); });

/* ---------- 상점 (카르마 하나로 단순화) ---------- */
// 콘텐츠: 카르마로 열기 / 카르마: 광고·게임으로 모으거나 구매 / 광고 제거: 유일한 현금 상품
const periodOf = it => it.k ? '영구 (이 기기)' : it.consumable ? '쓰면 소진' : '영구';
function openProduct(k, back) {
  const it = Store.item(k); if (!it) return openShop(null, true);
  if (it.karma) return Karma.buyPack(k, back || (() => openShop(null, true)));
  const own = Store.has(k), info = Store.info(k), why = Store.why(k);
  openOverlay(`${it.e} ${it.n}`, `<div class="prodhero"><span>${it.e}</span><b>${it.n}</b><em>${own ? '열림' : it.k ? `✨ 카르마 ${it.k}` : Store.price(k)}</em><small>${it.d}</small>${why ? `<small style="color:var(--money)">${why}</small>` : ''}</div>
    <div class="prodinfo"><b>무엇을 받나요?</b>${(info.length ? info : [it.d]).map(x => `<small>· ${x}</small>`).join('')}<small>· 이용 기간: ${periodOf(it)}</small></div>
    ${it.k && !own ? `<div class="kbal sm"><span>보유 카르마</span><b>✨ ${Karma.bal()}</b>${Karma.bal() < it.k ? `<small><b>${it.k - Karma.bal()}</b> 더 필요해요 · 광고 1번 +${Karma.AD_K}</small>` : ''}</div>` : ''}`,
    [...(own ? [] : it.k
      ? [{ t: Karma.bal() >= it.k ? `✨ 카르마 ${it.k}로 열기` : '✨ 카르마 모으기', pri: 1, keep: true, f: () => Karma.unlock(k, () => { Store.notify(); if (back) back(); else { closeOverlay(); Hub.render(); } }) }]
      : [{ t: `${it.e} ${Store.native || Karma.testMode() ? Store.price(k) + '에 구매하기' : '앱에서 구매할 수 있어요'}`, pri: 1, keep: true, f: () => doBuy(k, back) }]),
     { t: '✨ 카르마 상점 보기', f: () => openShop(null, true) }, { t: '닫기', f: () => back && back() }]);
}
function doBuy(k, after) {
  const it = Store.item(k);
  if (it.karma) return Karma.buyPack(k, after);
  if (Store.has(k) && !it.consumable) return;
  Snd.sfx('tap');
  if (!Store.native && Karma.testMode()) {
    openOverlay('🧪 테스트 결제', `<p class="sjtxt" style="text-align:center">${it.e} <b>${it.n}</b> · ${it.price}<br>테스트 모드라 실제 결제 없이 적용돼요.</p>`,
      [{ t: `🧪 무료로 결제한 것으로 하기 (실제 ${it.price})`, pri: 1, f: () => { Store.grant(k); if (k === 'noads') Ads.banner(false); Snd.sfx('fanfare'); after ? after() : openShop(null, true); } }, { t: '취소' }]);
    return;
  }
  Store.buy(k, (ok, err) => {
    if (ok) { Snd.sfx('fanfare'); if (k === 'noads') Ads.banner(false); refreshFateLock(); closeOverlay(); after ? after() : openShop(null, true); }
    else if (err === 'web') openOverlay(`${it.e} ${it.n}`, `<p class="sjtxt" style="text-align:center">결제는 <b>안드로이드·아이폰 앱</b>에서 할 수 있어요.</p>`, [{ t: '상점으로', f: () => openShop(null, true) }]);
    else if (err && !/cancel/i.test(err)) openOverlay('결제하지 못했어요', `<p class="sjtxt" style="text-align:center">${Store.errText(err)}</p>`, [{ t: '상점으로', f: () => openShop(null, true) }]);
  });
}
// 상점 목록 (팝업 상점과 하단 「상점」 탭이 함께 씀)
function shopListHTML(page) {
  const row = k => { const it = Store.item(k), own = Store.has(k);
    return `<div class="shopitem"><span class="se">${it.e}</span><div><b>${it.n}</b><small>${it.d}</small>${own ? `<small style="color:var(--money)">${Store.why(k)}</small>` : ''}</div>
      <button data-c="${k}" class="${own ? 'own' : ''}">${own ? '열림' : `✨ ${it.k}`}</button></div>`; };
  const main = Store.contents().filter(k => !Store.item(k).game), game = Store.contents().filter(k => Store.item(k).game);
  const vw = typeof Views !== 'undefined' ? Views.list().map(Views.item) : [], vk = vw.map(x => x.k);
  const cont = (vw.length ? `<div class="shopitem"><span class="se">🔎</span><div><b>목적별 상세 운세 ${vw.length}종</b><small>2027 종합·재물·연애·직업·건강·12개월·대운·궁합·토정비결 · 볼 때 차감 · 결제한 날 다시보기 ${Views.FREE()}회 무료 · 사주풀이는 무료</small></div><button data-go="yearfull">✨ ${Math.min(...vk)}~${Math.max(...vk)}/회</button></div>` : '')
    + main.map(row).join('') + `<div class="shopitem"><span class="se">🤖</span><div><b>AI 사주상담</b><small>인생의 갈림길 고민 — 선택지별 적합도·대운·MBTI·가상 인생 비교 · 첫 회 무료</small></div><button data-go="counsel">✨ 20/회</button></div>`
    + `<h4 class="kh">☕ 가볍게</h4><div class="shopitem"><span class="se">🔮</span><div><b>타로 사주 심층 풀이</b><small>뽑은 카드를 내 사주·대운·올해·이번 달과 엮은 주제별 상담 · 매일 1회 무료 (리포트 보유 시 3회)</small></div><button data-go="tarot">✨ 10/회</button></div>`
    + (game.length ? `<h4 class="kh">🎮 게임 아이템</h4>` + game.map(row).join('') : '');
  const noads = Store.item('noads'), nown = Store.has('noads');
  const charge = `<h4 class="kh">✨ 카르마 모으기 · 구매</h4>` + Karma.chargeHTML(0, '', page);
  // 상점 탭: 카르마 모으기를 먼저 (무엇을 살지보다 '어떻게 모으는지'가 첫 질문)
  return (page ? charge : '') + `<h4 class="kh">⭐ 카르마로 여는 콘텐츠</h4>` + cont + (page ? '' : charge)
    + (noads ? `<h4 class="kh">🚫 광고 제거</h4><div class="shopitem"><span class="se">${noads.e}</span><div><b>${noads.n}</b><small>${noads.d}</small></div><button data-buy="noads" class="${nown ? 'own' : ''}">${nown ? '보유 중' : Store.native || Karma.testMode() ? noads.price : '앱 전용'}</button></div>` : '');
}
function bindShopList(root, re) {
  Karma.bindCharge(re, root);
  root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => openProduct(b.dataset.c, re));
  root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (document.getElementById('overlay').classList.contains('on')) closeOverlay(); Hub.go(b.dataset.go); });
  root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => doBuy(b.dataset.buy, re));
}
async function restoreBuys(re) { const n = await Store.restore(); re && re(); Hub.toast(n > 0 ? `구매 ${n}건을 복원했어요` : n === 0 ? '복원할 구매 내역이 없어요 (카르마는 로그인 계정으로 복원돼요)' : Store.errText(Store.lastErr())); }
function openShop(focus, full) {
  if (focus && !full && Store.item(focus)) return openProduct(focus);
  openOverlay('✨ 카르마 상점',
    `<p class="sjnote" style="text-align:center;margin-top:0">유료 콘텐츠는 모두 <b>카르마</b>로 열어요. 카르마는 광고·인생 게임으로 모으거나 살 수 있어요. <a class="kqa" data-k="help">카르마가 뭔가요?</a></p>` + shopListHTML(false),
    [...(Store.native ? [{ t: '🔄 구매 복원', keep: true, f: () => restoreBuys(() => openShop(null, true)) }] : []), { t: '닫기' }]);
  const sh = document.getElementById('osheet');
  bindShopList(sh, () => openShop(null, true));
  const hq = sh.querySelector('[data-k=help]'); if (hq) hq.onclick = () => Karma.openHelp(() => openShop(null, true));
}

/* ---------- 프리미엄 사주 리포트 ---------- */
// 사주풀이는 무료 (타고난 성향 전체). 2027 운세·대운 등 시기 풀이는 목적별 상세 보기에서
function reportHTML(name, a, age) {
  const S = window.SAJU;
  return `${Saju.summaryHTML(a)}
    <div class="sjtxt"><h4>🧭 성격</h4><p>${a.dm.성격}</p><h4>💪 강점</h4><p>${a.dm.강점}</p><h4>⚠️ 약점</h4><p>${a.dm.약점}</p>
    <h4>💕 연애 성향</h4><p>${a.dm.연애}</p><h4>💰 재물 성향</h4><p>${a.dm.재물}</p><h4>🩺 건강 성향</h4><p>${a.dm.건강}</p>
    <h4>✨ 타고난 흐름</h4><p>${S.GDOM[a.dom]}</p><h4>🧩 보완할 점</h4><p>${S.GLACK[a.dom]}</p><h4>🍀 개운법</h4><p>${a.dm.개운}</p></div>
    <p class="sjnote" style="text-align:center">📜 사주풀이는 무료예요 · 2027 운세·12개월·대운은 목적별 상세 보기에서 골라 볼 수 있어요.<br>※ 사주 풀이는 재미로 보는 콘텐츠예요.</p>`;
}
function showReport(name, a, age, fromGame) {
  openOverlay(`📜 ${name}의 사주풀이`, reportHTML(name, a, age), [
    ...(fromGame ? [] : [{ t: '🔎 목적별 상세 운세 보기', pri: 1, f: () => Hub.go('yearfull') }]),
    { t: '닫기' }]);
}
function myReport() {
  const me = store.get('p8b_me', null);
  if (!me || !me.date) {
    openOverlay('📜 내 사주 리포트', '<p class="sjtxt" style="text-align:center">먼저 생년월일을 입력해 주세요.<br>[탄생하기 → 직접 정하기]에서 입력하면 저장돼요.</p>',
      [{ t: '생년월일 입력하러 가기', pri: 1, f: () => show('setup') }, { t: '닫기' }]); return;
  }
  const [y, m, d] = me.date.split('-').map(Number), t = me.time;
  const birth = { cal: me.cal || 's', y, m, d, hh: t ? +t.split(':')[0] : 12, mm: t ? +t.split(':')[1] : 0, unk: !t };
  const a = Saju.analyze(birth, me.sex !== 'f');
  if (!a) return;
  showReport(me.name || '나', a, new Date().getFullYear() - y, false);
}

/* ---------- 궁합 모드: 운명의 상대 ---------- */
function mateEvent() {
  const m = P.mate;
  if (!m || P.mateMet || P.married || P.rel || P.age < 19 || P.age > 45) return null;
  if (P.age < 27 && Math.random() > .3) return null;
  P.mateMet = true;
  const c = m.c || { score: 70, word: '' };
  return {
    e: '💞', t: '운명의 상대 등장!', d: `${m.name}을(를) 만났다. 사주 궁합 지수 ${c.score}점 · ${c.word}`, ch: [
      {
        t: '💘 다가간다', f: () => {
          P.rel = { name: m.name, job: pick(['회사원', '디자이너', '교사', '개발자', '요리사', '간호사']), traits: [{ t: '운명처럼 끌림', k: P.ideal || 'kind' }], compat: c.score, aff: 45 + Math.round(c.score / 3), since: P.age, match: true, mate: true };
          P.partner = m.name; fx({ hap: 12 }); playAnim('love'); Snd.sfx('love'); cutin('💞', '운명의 상대!', `${m.name} · 궁합 지수 ${c.score}점`);
          log(`💞 운명의 상대 ${m.name}와(과) 사귀기 시작했다 (사주 궁합 지수 ${c.score}점)`, 'good');
          P.moments.push({ a: P.age, e: '💞', t: '운명의 상대', c: m.name, r: `궁합 지수 ${c.score}점` });
        }
      },
      { t: '🍃 지금은 아니야', f: () => { log(`${m.name}와(과) 스쳐 지나갔다…`); say('언젠가 다시 만날까?'); } }]
  };
}
function mateLine() {
  const m = P && P.mate; if (!m) return '';
  const sc = m.c ? m.c.score : '?';
  if (P.spouseName === m.name) return `💍 사주 궁합 지수 ${sc}점의 ${m.name}와(과) 평생을 함께했다`;
  if (P.exes.includes(m.name)) return `💔 ${m.name}와(과) 만났지만 인연이 이어지지 않았다 (궁합 지수 ${sc}점)`;
  if (P.rel && P.rel.name === m.name) return `💕 ${m.name}와(과) 끝까지 연인으로 지냈다 (궁합 지수 ${sc}점)`;
  if (P.mateMet) return `🍃 ${m.name}와(과)는 스쳐 지나간 인연이었다 (궁합 지수 ${sc}점)`;
  return `⏳ 이번 생에서는 ${m.name}을(를) 만나지 못했다 (궁합 지수 ${sc}점)`;
}

/* ---------- 운명 조작 팩 (설정 화면) ---------- */
function refreshFateLock() {
  const own = Store.has('fate'), fl = document.getElementById('fateLock');
  if (!fl) return;
  fl.textContent = own ? '가정형편과 재능을 직접 골라요' : '🔒 카르마 30으로 열기';
  ['fCls', 'fTal'].forEach(id => { const el = document.getElementById(id); el.disabled = !own; });
}

/* ---------- 쇼츠용 인생 카드 (1080×1920) ---------- */
function wrapText(g, text, x, y, maxW, lh, maxLines = 3) {
  const words = text.split(''); let line = '', lines = [];
  for (const ch of words) { if (g.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch; }
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((l, i) => g.fillText(l, x, y + i * lh));
  return Math.min(lines.length, maxLines) * lh;
}
function makeLifeCard(info) {
  const Wc = 1080, Hc = 1920, cv2 = document.createElement('canvas'); cv2.width = Wc; cv2.height = Hc;
  const g = cv2.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, Hc); bg.addColorStop(0, '#3d2a66'); bg.addColorStop(.55, '#1f173a'); bg.addColorStop(1, '#140f26');
  g.fillStyle = bg; g.fillRect(0, 0, Wc, Hc);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${.15 + Math.random() * .5})`; g.beginPath(); g.arc(Math.random() * Wc, Math.random() * Hc * .6, Math.random() * 2.2 + .6, 0, 7); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ff8a3d'; g.font = '700 40px \"Noto Sans KR\"'; g.fillText('PROJECT 8 BILLION · 프로젝트 80억', Wc / 2, 110);
  // 초상
  const last = P.album[P.album.length - 1], pc = document.createElement('canvas'); pc.width = 440; pc.height = 480;
  drawSnapTo(pc, last, true, { w: 440, h: 480, k: 1.85 });
  g.save(); roundRectOn(g, (Wc - 440) / 2, 140, 440, 480, 44); g.clip(); g.drawImage(pc, (Wc - 440) / 2, 140); g.restore();
  // 이름·국가
  g.fillStyle = '#fff7ea'; g.font = '700 88px \"Noto Sans KR\"'; g.fillText(P.name, Wc / 2, 720);
  g.fillStyle = '#b9addb'; g.font = '500 38px \"Noto Sans KR\"';
  g.fillText(`${P.country.f} ${P.country.n} · ${P.rural ? '농촌' : '도시'} · ${P.clsInfo.n} · 향년 ${P.age}세`, Wc / 2, 778);
  // 등급·칭호
  const gc = { S: '#ffcc4d', A: '#5be08f', B: '#5ec8ff', C: '#c58bff', D: '#ff6b81' }[info.grade];
  g.fillStyle = gc; g.font = '700 130px \"Noto Sans KR\"'; g.fillText(info.grade, Wc / 2, 910);
  g.fillStyle = '#fff7ea'; g.font = '700 50px \"Noto Sans KR\"';
  let y = 985; y += wrapText(g, `「${info.title}」`, Wc / 2, y, 920, 60, 2);
  // 사주
  if (P.saju) {
    const cols = [P.saju.p.y, P.saju.p.m, P.saju.p.d, P.saju.p.h].filter(Boolean), bx = Wc / 2 - (cols.length - 1) * 65;
    cols.forEach((c, i) => {
      const x = bx + i * 130;
      [[SAJU.ST[c.s], Saju.ELC[SAJU.SE[c.s]]], [SAJU.BR[c.b], Saju.ELC[SAJU.BE[c.b]]]].forEach(([ch, col], j) => {
        g.fillStyle = col; roundRectOn(g, x - 50 + 0, y + 10 + j * 106, 100, 96, 16); g.fill();
        g.fillStyle = '#1b1530'; g.font = '62px serif'; g.fillText(ch, x, y + 80 + j * 106);
      });
    });
    y += 230;
  }
  // 버킷리스트
  g.font = '500 40px \"Noto Sans KR\"'; g.textAlign = 'left';
  P.bucket.forEach((b, i) => { g.fillStyle = b.done ? '#5be08f' : '#b9addb'; g.fillText(`${b.done ? '✅' : '⬜'} ${b.e} ${b.t}`, 140, y + 40 + i * 54); });
  y += 40 + 3 * 54;
  // 인생 그래프
  const tr = P.trace, gx = 120, gw = 840, gh = 100, gy0 = y + 30;
  g.strokeStyle = '#ffffff22'; g.lineWidth = 2; g.strokeRect(gx, gy0, gw, gh);
  g.strokeStyle = '#ffcc4d'; g.lineWidth = 6; g.beginPath();
  tr.forEach((p, i) => { const X = gx + gw * p.a / Math.max(10, P.age), Y = gy0 + gh * (1 - p.h / 100); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
  g.fillStyle = '#b9addb'; g.font = '500 30px \"Noto Sans KR\"'; g.fillText('행복 그래프', gx, gy0 - 12);
  y = Math.min(gy0 + gh + 58, Hc - 250);
  g.textAlign = 'center';
  if (info.fr) { g.fillStyle = info.fr.ok ? '#5be08f' : '#ff8a3d'; g.font = '700 40px \"Noto Sans KR\"'; g.fillText(`📜 사주 vs 실제: ${info.fr.verdict.replace(/^[^ ]+ /, '')}`, Wc / 2, y); y += 50; }
  const ml = mateLine(); if (ml) { g.fillStyle = '#ff9ecf'; g.font = '500 32px \"Noto Sans KR\"'; y += wrapText(g, ml, Wc / 2, y, 980, 40, 1); }
  // 하단
  g.fillStyle = '#ff8a3d'; roundRectOn(g, 160, Hc - 165, Wc - 320, 96, 48); g.fill();
  g.fillStyle = '#fff'; g.font = '700 48px \"Noto Sans KR\"'; g.fillText('나도 다른 인생 살아보기 ▶', Wc / 2, Hc - 101);
  g.fillStyle = '#b9addb'; g.font = '500 32px \"Noto Sans KR\"'; g.fillText('morogohi.github.io/fortune-lab/life', Wc / 2, Hc - 28);
  return cv2;
}
function roundRectOn(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
let lastCard = null;
function renderLifeCard(info) {
  try {
    const c = makeLifeCard(info); lastCard = c;
    const img = document.getElementById('cardImg'); if (img) img.src = c.toDataURL('image/png');
  } catch (e) { console.warn('card', e); }
}
async function shareCard(mode) {
  if (!lastCard) return;
  const text = `나는 ${P.country.n}의 ${P.name}(으)로 ${P.age}년을 살았다. 너의 또 다른 인생은? https://morogohi.github.io/fortune-lab/life/`;
  const url = lastCard.toDataURL('image/png');
  try {
    const r = await Native.shareImage(url, text, mode);
    if (r === 'downloaded') log && log('📸 인생 카드를 저장했어요');
  } catch (e) { openOverlay('📸 인생 카드', `<img src="${url}" style="width:100%;border-radius:12px"><p class="sjnote" style="text-align:center">이미지를 길게 눌러 저장하세요</p>`); }
}

/* ---------- 초기화 ---------- */
(function bizInit() {
  if (Store.newYear()) document.getElementById('nyBanner').style.display = 'block';
  document.getElementById('shopBtn').onclick = () => { Snd.sfx('tap'); openShop(); };
  document.getElementById('myReportBtn').onclick = () => { Snd.sfx('page'); myReport(); };
  const cls = document.getElementById('fCls'), tal = document.getElementById('fTal');
  cls.innerHTML += CLASSES.map((c, i) => `<option value="${i}">${c.e} ${c.n}</option>`).join('');
  tal.innerHTML += TALENTS.map((t, i) => `<option value="${i}">${t.e} ${t.n}</option>`).join('');
  document.querySelectorAll('#mSex button').forEach(b => b.onclick = () => { document.querySelectorAll('#mSex button').forEach(x => x.classList.toggle('on', x === b)); Snd.sfx('tap'); });
  document.getElementById('fateBox').addEventListener('toggle', e => { if (e.target.open && !Store.has('fate')) { e.target.open = false; openProduct('fate', () => { refreshFateLock(); const fb = document.getElementById('fateBox'); if (fb && Store.has('fate')) fb.open = true; }); } });
  Store.onChange(() => { try { refreshFateLock(); } catch (e) { } });   // 카르마로 연 직후 바로 선택 가능하게
  const me = store.get('p8b_me', null);
  if (me && me.mate) { document.getElementById('mName').value = me.mate.name || ''; document.getElementById('mDate').value = me.mate.date || ''; document.getElementById('mCal').value = me.mate.cal || 's'; document.querySelectorAll('#mSex button').forEach(x => x.classList.toggle('on', x.dataset.v === (me.mate.sex || 'f'))); }
  refreshFateLock();
  Store.init().then(refreshFateLock);
})();
