/* 사주 → 게임 연동 (능력치 보너스 · 대운 · 궁합 · 풀이 카드) */
window.Saju = (() => {
  const S = window.SAJU;
  const GRPN = ['독립·경쟁운', '재능·표현운', '재물운', '승진·명예운', '학업·귀인운'];
  const GRPE = ['🔥', '🎨', '💰', '👔', '📚'];
  const GRPDESC = [
    '내 힘으로 개척하는 시기. 창업·독립이 유리하지만 경쟁도 치열해요.',
    '재능이 터지는 시기. 취미·예술·콘텐츠가 빛나요.',
    '돈이 움직이는 시기. 투자·사업 성과가 좋아요.',
    '책임과 명예의 시기. 승진·합격 운이 강해요.',
    '배움과 귀인의 시기. 공부·자격증·도움받을 일이 생겨요.',
  ];
  const ELC = ['#4fbf85', '#ef6a5a', '#e2b947', '#c3cad6', '#7ea8f2'];
  const ELE = ['🌳', '🔥', '⛰️', '⚔️', '💧'];
  // 오행 → 과목 적성
  const ELSUB = [['kor', 'soc'], ['music', 'art', 'pe'], ['soc', 'pe'], ['math', 'sci', 'code'], ['sci', 'eng', 'math']];
  // 오행 → 능력치
  const ELSTAT = [['bond', 'smart'], ['hap', 'look'], ['hp', 'bond'], ['smart', 'hp'], ['smart', 'look']];

  const ok = () => !!(S && S.LIB);

  function randomBirth() {
    const y = 1955 + Math.floor(Math.random() * 56), m = 1 + Math.floor(Math.random() * 12);
    const dim = new Date(y, m, 0).getDate(), d = 1 + Math.floor(Math.random() * dim);
    const unk = Math.random() < .25;
    return { cal: 's', y, m, d, hh: unk ? 12 : Math.floor(Math.random() * 24), mm: unk ? 0 : Math.floor(Math.random() * 60), unk };
  }

  function analyze(b, male) {
    if (!ok()) return null;
    let p;
    try { p = S.pillars(b.cal, b.y, b.m, b.d, b.hh, b.mm, b.unk, true, male ? 'm' : 'f'); }
    catch (e) { return null; }
    const cols = [p.y, p.m, p.d, p.h].filter(Boolean);
    const el = [0, 0, 0, 0, 0];
    cols.forEach(c => { el[S.SE[c.s]]++; el[S.BE[c.b]]++; });
    const me = p.d.s, grp = [0, 0, 0, 0, 0];
    cols.forEach(c => { if (c !== p.d) grp[S.tg10(me, c.s).g]++; grp[S.tg10(me, S.HID[c.b]).g]++; });
    const dom = grp.indexOf(Math.max(...grp)), weak = el.indexOf(Math.min(...el)), strong = el.indexOf(Math.max(...el));
    const dy = (p.dy || []).map(x => ({ age: x.age, gz: x.gz, g: S.tg10(me, x.gz.s).g, txt: S.STK[x.gz.s] + S.BRK[x.gz.b] }));
    const pre = S.tg10(me, p.m.s).g; // 첫 대운 전
    const dm = S.DMX[me];
    return {
      p, el, grp, dom, weak, strong, me, meEl: S.SE[me], dy, pre, dm,
      ddi: S.ANI[p.y.b], cols,
      pillarTxt: [p.y, p.m, p.d, p.h].map(c => c ? S.STK[c.s] + S.BRK[c.b] : '??'),
      pillarHan: [p.y, p.m, p.d, p.h].map(c => c ? S.ST[c.s] + S.BR[c.b] : '??'),
    };
  }

  // 사주 → 시작 능력치 보정
  function applyStats(P, a) {
    if (!a) return;
    a.el.forEach((n, i) => {
      const v = Math.round((n - 1.6) * 4);
      ELSTAT[i].forEach(k => P[k] = Math.max(0, Math.min(100, P[k] + v)));
      ELSUB[i].forEach(k => P.sub[k] = Math.max(0, Math.min(100, P.sub[k] + Math.max(0, n - 1) * 4)));
    });
    if (a.dom === 1) P.art = true;
  }

  function luckAt(a, age) {
    if (!a) return null;
    let g = a.pre, txt = '초년', start = 0;
    a.dy.forEach(d => { if (age >= d.age) { g = d.g; txt = d.txt; start = d.age; } });
    return { g, txt, start, name: GRPN[g], e: GRPE[g], desc: GRPDESC[g] };
  }

  // 궁합: 일간 오행 관계 (상생↑ 상극↓)
  function compat(a, otherStem) {
    if (!a) return 50 + Math.floor(Math.random() * 40);
    const me = S.SE[a.me], o = S.SE[otherStem];
    const r = S.mod(o - me, 5);
    const base = r === 0 ? 72 : (r === 1 || r === 4) ? 88 : 48; // 같은 기운 / 상생 / 상극
    return Math.max(20, Math.min(99, base + Math.floor(Math.random() * 15) - 7));
  }
  function stemName(s) { return S.STK[s] + '(' + S.ST[s] + ')'; }

  /* ---------- 카드 HTML ---------- */
  function pillarsHTML(a) {
    const lab = ['년주', '월주', '일주', '시주'];
    return `<div class="pillars">${[a.p.y, a.p.m, a.p.d, a.p.h].map((c, i) => c ? `
      <div class="pl${i === 2 ? ' me' : ''}"><small>${lab[i]}</small>
        <b style="background:${ELC[S.SE[c.s]]}">${S.ST[c.s]}<em>${S.STK[c.s]}</em></b>
        <b style="background:${ELC[S.BE[c.b]]}">${S.BR[c.b]}<em>${S.BRK[c.b]}</em></b></div>` :
      `<div class="pl"><small>${lab[i]}</small><b class="unk">?</b><b class="unk">?</b></div>`).join('')}</div>`;
  }
  function elemHTML(a) {
    const mx = Math.max(...a.el, 1);
    return `<div class="elbars">${a.el.map((n, i) => `<div><span>${ELE[i]} ${S.EK[i]}</span><i style="width:${n / mx * 100}%;background:${ELC[i]}"></i><b>${n}</b></div>`).join('')}</div>`;
  }
  function summaryHTML(a) {
    return `<div class="sajucard">
      ${pillarsHTML(a)}
      <div class="sjline"><b>${ELE[a.meEl]} ${a.dm.nm}</b> 일간 · ${a.ddi}띠<br><span>${a.dm.key}</span></div>
      ${elemHTML(a)}
      <div class="sjtags"><span>${GRPE[a.dom]} 강한 운: ${GRPN[a.dom]}</span><span>${ELE[a.weak]} 부족한 기운: ${S.EK[a.weak]}</span></div>
    </div>`;
  }
  function fullHTML(a, age) {
    const L = luckAt(a, age);
    const dyRow = a.dy.slice(0, 8).map(d => `<div class="dy${L && L.start === d.age ? ' on' : ''}"><small>${d.age}세</small><b>${d.txt}</b><em>${GRPE[d.g]}</em></div>`).join('');
    return `${summaryHTML(a)}
      ${L ? `<div class="sjnow">${L.e} 지금 대운 (${L.start}세~) <b>${L.name}</b><br><span>${L.desc}</span></div>` : ''}
      <div class="dyrow">${dyRow}</div>
      <div class="sjtxt"><h4>🧭 성격</h4><p>${a.dm.성격}</p><h4>💪 강점</h4><p>${a.dm.강점}</p>
      <h4>💕 연애</h4><p>${a.dm.연애}</p><h4>💰 재물</h4><p>${a.dm.재물}</p><h4>🩺 건강</h4><p>${a.dm.건강}</p>
      <h4>✨ 타고난 흐름</h4><p>${S.GDOM[a.dom]}</p></div>
      <p class="sjnote">※ 운명 연구소 만세력 엔진으로 계산했어요. 게임 속 재미를 위한 풀이입니다.</p>`;
  }

  return { ok, randomBirth, analyze, applyStats, luckAt, compat, stemName, summaryHTML, fullHTML, GRPN, GRPE, ELSUB, ELE, ELC };
})();
