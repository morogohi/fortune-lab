/* =====================================================================
 *  biz.js — 사업화 기능
 *  상점 · 프리미엄 사주 리포트 · 궁합 모드(운명의 상대) · 쇼츠용 인생 카드 · 신년 이벤트
 * ===================================================================== */

/* ---------- 공용 오버레이 ---------- */
function openOverlay(title, html, btns = [{ t: '닫기' }]) {
  const o = document.getElementById('overlay'), sh = document.getElementById('osheet');
  sh.innerHTML = `<h3>${title}</h3>${html}`;
  btns.forEach(b => {
    const el = document.createElement('button'); el.className = 'obtn' + (b.pri ? ' pri' : ''); el.innerHTML = b.t;
    el.onclick = () => { Snd.sfx('tap'); if (!b.keep) closeOverlay(); b.f && b.f(); };
    sh.appendChild(el);
  });
  o.classList.add('on'); sh.scrollTop = 0;
}
function closeOverlay() { document.getElementById('overlay').classList.remove('on'); }
document.getElementById('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeOverlay(); });

/* ---------- 상점 ---------- */
function openShop(focus) {
  const rows = Store.list().map(k => {
    const it = Store.item(k), own = Store.has(k) && !it.consumable, why = Store.why(k);
    return `<div class="shopitem${focus === k ? ' focus' : ''}"><span class="se">${it.e}</span><div><b>${it.n}</b><small>${it.d}</small>${why ? `<small style="color:var(--money)">${why}</small>` : ''}</div>
      <button data-k="${k}" class="${own ? 'own' : ''}">${own ? '보유 중' : Store.price(k)}</button></div>`;
  }).join('');
  const note = Store.native ? '구매 내역은 스토어 계정에 저장돼요.' : '웹 체험판에서는 결제가 없어요. 앱에서 구매할 수 있어요.';
  openOverlay('🛍️ 상점', rows + `<p class="sjnote" style="text-align:center">${note}</p>`,
    [...(Store.native ? [{ t: '🔄 구매 복원', keep: true, f: async () => { const n = await Store.restore(); log && P && log(`구매 ${n}건 복원`); openShop(); } }] : []), { t: '닫기' }]);
  document.querySelectorAll('#osheet .shopitem button').forEach(b => b.onclick = () => {
    const k = b.dataset.k, it = Store.item(k);
    if (Store.has(k) && !it.consumable) return;
    Snd.sfx('tap');
    Store.buy(k, (ok, err) => {
      if (ok) {
        if (it.karma) { karma += it.karma; saveMeta(); renderTitle(); }
        Snd.sfx('fanfare'); if (k === 'noads') Ads.banner(false); refreshFateLock(); openShop();
      } else if (err === 'web') {
        openOverlay(`${it.e} ${it.n}`, `<p class="sjtxt" style="text-align:center">결제는 <b>안드로이드·아이폰 앱</b>에서 할 수 있어요.<br>웹 체험판에서는 프리미엄 사주 리포트를 무료로 열어 두었어요.</p>`, [{ t: '상점으로', f: () => openShop() }]);
      } else if (err && !/cancel/i.test(err)) {
        openOverlay('결제 실패', `<p style="text-align:center;color:var(--dim)">${err}</p>`, [{ t: '상점으로', f: () => openShop() }]);
      }
    });
  });
}

/* ---------- 프리미엄 사주 리포트 ---------- */
function reportHTML(name, a, age) {
  if (Store.has('report')) return Saju.premiumHTML(a, age, new Date().getFullYear());
  return `${Saju.summaryHTML(a)}
    <div class="lock"><b>🔒 프리미엄 사주 리포트</b><small>${new Date().getFullYear()}년 운세 · 10년 대운 상세 · 성격·연애·재물·건강·개운법</small></div>
    <p class="sjnote" style="text-align:center">※ 사주 풀이는 재미로 보는 콘텐츠예요.</p>`;
}
function showReport(name, a, age, fromGame) {
  const locked = !Store.has('report');
  openOverlay(`📜 ${name}의 사주`, reportHTML(name, a, age), [
    ...(locked ? [{ t: `🔓 프리미엄 리포트 열기 (${Store.price('report')})`, pri: 1, f: () => openShop('report') }] : []),
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
    e: '💞', t: '운명의 상대 등장!', d: `${m.name}을(를) 만났다. 사주 궁합 ${c.score}% · ${c.word}`, ch: [
      {
        t: '💘 다가간다', f: () => {
          P.rel = { name: m.name, job: pick(['회사원', '디자이너', '교사', '개발자', '요리사', '간호사']), traits: [{ t: '운명처럼 끌림', k: P.ideal || 'kind' }], compat: c.score, aff: 45 + Math.round(c.score / 3), since: P.age, match: true, mate: true };
          P.partner = m.name; fx({ hap: 12 }); playAnim('love'); Snd.sfx('love'); cutin('💞', '운명의 상대!', `${m.name} · 궁합 ${c.score}%`);
          log(`💞 운명의 상대 ${m.name}와(과) 사귀기 시작했다 (사주 궁합 ${c.score}%)`, 'good');
          P.moments.push({ a: P.age, e: '💞', t: '운명의 상대', c: m.name, r: `궁합 ${c.score}%` });
        }
      },
      { t: '🍃 지금은 아니야', f: () => { log(`${m.name}와(과) 스쳐 지나갔다…`); say('언젠가 다시 만날까?'); } }]
  };
}
function mateLine() {
  const m = P && P.mate; if (!m) return '';
  const sc = m.c ? m.c.score : '?';
  if (P.spouseName === m.name) return `💍 사주 궁합 ${sc}%의 ${m.name}와(과) 평생을 함께했다`;
  if (P.exes.includes(m.name)) return `💔 ${m.name}와(과) 만났지만 인연이 이어지지 않았다 (궁합 ${sc}%)`;
  if (P.rel && P.rel.name === m.name) return `💕 ${m.name}와(과) 끝까지 연인으로 지냈다 (궁합 ${sc}%)`;
  if (P.mateMet) return `🍃 ${m.name}와(과)는 스쳐 지나간 인연이었다 (궁합 ${sc}%)`;
  return `⏳ 이번 생에서는 ${m.name}을(를) 만나지 못했다 (궁합 ${sc}%)`;
}

/* ---------- 운명 조작 팩 (설정 화면) ---------- */
function refreshFateLock() {
  const own = Store.has('fate'), fl = document.getElementById('fateLock');
  if (!fl) return;
  fl.textContent = own ? '가정형편과 재능을 직접 골라요' : '🔒 상점에서 열기';
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
  g.fillStyle = '#ff8a3d'; g.font = '40px Jua'; g.fillText('PROJECT 8 BILLION · 프로젝트 80억', Wc / 2, 110);
  // 초상
  const last = P.album[P.album.length - 1], pc = document.createElement('canvas'); pc.width = 440; pc.height = 480;
  drawSnapTo(pc, last, true, { w: 440, h: 480, k: 1.85 });
  g.save(); roundRectOn(g, (Wc - 440) / 2, 140, 440, 480, 44); g.clip(); g.drawImage(pc, (Wc - 440) / 2, 140); g.restore();
  // 이름·국가
  g.fillStyle = '#fff7ea'; g.font = '88px Jua'; g.fillText(P.name, Wc / 2, 720);
  g.fillStyle = '#b9addb'; g.font = '38px "Gowun Dodum"';
  g.fillText(`${P.country.f} ${P.country.n} · ${P.rural ? '농촌' : '도시'} · ${P.clsInfo.n} · 향년 ${P.age}세`, Wc / 2, 778);
  // 등급·칭호
  const gc = { S: '#ffcc4d', A: '#5be08f', B: '#5ec8ff', C: '#c58bff', D: '#ff6b81' }[info.grade];
  g.fillStyle = gc; g.font = '130px Jua'; g.fillText(info.grade, Wc / 2, 910);
  g.fillStyle = '#fff7ea'; g.font = '50px Jua';
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
  g.font = '40px "Gowun Dodum"'; g.textAlign = 'left';
  P.bucket.forEach((b, i) => { g.fillStyle = b.done ? '#5be08f' : '#b9addb'; g.fillText(`${b.done ? '✅' : '⬜'} ${b.e} ${b.t}`, 140, y + 40 + i * 54); });
  y += 40 + 3 * 54;
  // 인생 그래프
  const tr = P.trace, gx = 120, gw = 840, gh = 100, gy0 = y + 30;
  g.strokeStyle = '#ffffff22'; g.lineWidth = 2; g.strokeRect(gx, gy0, gw, gh);
  g.strokeStyle = '#ffcc4d'; g.lineWidth = 6; g.beginPath();
  tr.forEach((p, i) => { const X = gx + gw * p.a / Math.max(10, P.age), Y = gy0 + gh * (1 - p.h / 100); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
  g.fillStyle = '#b9addb'; g.font = '30px "Gowun Dodum"'; g.fillText('행복 그래프', gx, gy0 - 12);
  y = Math.min(gy0 + gh + 58, Hc - 250);
  g.textAlign = 'center';
  if (info.fr) { g.fillStyle = info.fr.ok ? '#5be08f' : '#ff8a3d'; g.font = '40px Jua'; g.fillText(`📜 사주 vs 실제: ${info.fr.verdict.replace(/^[^ ]+ /, '')}`, Wc / 2, y); y += 50; }
  const ml = mateLine(); if (ml) { g.fillStyle = '#ff9ecf'; g.font = '32px "Gowun Dodum"'; y += wrapText(g, ml, Wc / 2, y, 980, 40, 1); }
  // 하단
  g.fillStyle = '#ff8a3d'; roundRectOn(g, 160, Hc - 165, Wc - 320, 96, 48); g.fill();
  g.fillStyle = '#fff'; g.font = '48px Jua'; g.fillText('나도 다른 인생 살아보기 ▶', Wc / 2, Hc - 101);
  g.fillStyle = '#b9addb'; g.font = '32px "Gowun Dodum"'; g.fillText('morogohi.github.io/fortune-lab/life', Wc / 2, Hc - 28);
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
  document.getElementById('fateBox').addEventListener('toggle', e => { if (e.target.open && !Store.has('fate')) { e.target.open = false; openShop('fate'); } });
  const me = store.get('p8b_me', null);
  if (me && me.mate) { document.getElementById('mName').value = me.mate.name || ''; document.getElementById('mDate').value = me.mate.date || ''; document.getElementById('mCal').value = me.mate.cal || 's'; document.querySelectorAll('#mSex button').forEach(x => x.classList.toggle('on', x.dataset.v === (me.mate.sex || 'f'))); }
  refreshFateLock();
  Store.init().then(refreshFateLock);
})();
