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


  /* ---------- 프리미엄 사주 리포트 ---------- */
  function premiumHTML(a, age, year) {
    const yg = S.yearGz(year), ts = S.tg10(a.me, yg.s), tb = S.tg10(a.me, S.HID[yg.b]), sx = S.SEUN[ts.g], sb = S.SEUN[tb.g];
    const L = luckAt(a, age);
    const dyRows = a.dy.slice(0, 8).map(d => `<tr class="${L && L.start === d.age ? 'on' : ''}"><td>${d.age}세~</td><td><b>${d.txt}</b></td><td>${GRPE[d.g]} ${GRPN[d.g]}</td><td>${GRPDESC[d.g]}</td></tr>`).join('');
    return `${summaryHTML(a)}
      <div class="sjnote" style="text-align:center;margin:6px 0">🔓 프리미엄 사주 리포트</div>
      <div class="sjtxt">
        <h4>🗓️ ${year}년 운세 · 세운 ${S.STK[yg.s]}${S.BRK[yg.b]}(${S.ST[yg.s]}${S.BR[yg.b]}) · ${ts.n}</h4>
        <p><b>총운</b> ${sx.총운}</p><p><b>일·직업</b> ${sx.직업}</p><p><b>재물</b> ${sx.재물}</p><p><b>연애</b> ${sx.연애}</p><p><b>건강</b> ${sx.건강}</p>
        <p><b>하반기(${S.BRK[yg.b]} · ${tb.n})</b> ${sb.총운}</p>
        <h4>📅 이번 달 한마디</h4><p>${S.WOL[S.tg10(a.me, (yg.s + new Date().getMonth()) % 10).g]}</p>
        <h4>🔮 10년 대운 흐름</h4>
        <table class="dytbl"><tr><th>시기</th><th>대운</th><th>기운</th><th>풀이</th></tr>${dyRows}</table>
        <h4>🧭 성격</h4><p>${a.dm.성격}</p><h4>💪 강점</h4><p>${a.dm.강점}</p><h4>⚠️ 약점</h4><p>${a.dm.약점}</p>
        <h4>💕 연애</h4><p>${a.dm.연애}</p><h4>💰 재물</h4><p>${a.dm.재물}</p><h4>🩺 건강</h4><p>${a.dm.건강}</p>
        <h4>✨ 타고난 흐름</h4><p>${S.GDOM[a.dom]}</p><h4>🧩 보완할 점</h4><p>${S.GLACK[a.dom]}</p>
        <h4>🍀 개운법</h4><p>${a.dm.개운} · 부족한 기운 ${S.EK[a.weak]}을(를) 채워 주세요.</p>
      </div>
      <p class="sjnote">※ 사주 풀이는 재미로 보는 콘텐츠예요. 중요한 결정은 스스로 판단하세요.</p>`;
  }

  /* ---------- 두 사람 궁합 (실제 사주끼리) ---------- */
  const HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  const CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  const inPairs = (ps, x, y) => ps.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
  function compatPair(a, b) {
    if (!a || !b) return null;
    const me = S.SE[a.me], o = S.SE[b.me], r = S.mod(o - me, 5);
    let sc = r === 0 ? 70 : (r === 1 || r === 4) ? 84 : 52;
    const notes = [];
    notes.push(r === 0 ? '같은 기운끼리라 말이 잘 통해요' : (r === 1 || r === 4) ? '서로를 살려 주는 상생 관계예요' : '부딪히며 성장하는 상극 관계예요');
    if (S.SE[a.me] % 1 === 0 && Math.abs(a.me - b.me) === 5) { sc += 8; notes.push('일간이 합을 이뤄 끌림이 강해요'); }
    if (inPairs(HAP6, a.p.y.b, b.p.y.b)) { sc += 6; notes.push(`${a.ddi}띠와 ${b.ddi}띠는 육합`); }
    if (inPairs(CHUNG, a.p.y.b, b.p.y.b)) { sc -= 8; notes.push(`${a.ddi}띠와 ${b.ddi}띠는 충 — 양보가 필요해요`); }
    if (b.el[a.weak] >= 2) { sc += 5; notes.push(`내게 부족한 ${S.EK[a.weak]} 기운을 상대가 채워 줘요`); }
    if (a.el[b.weak] >= 2) { sc += 5; notes.push(`상대에게 부족한 ${S.EK[b.weak]} 기운을 내가 채워 줘요`); }
    sc = Math.max(25, Math.min(99, sc));
    const word = sc >= 85 ? '천생연분' : sc >= 72 ? '잘 맞는 사이' : sc >= 58 ? '노력하면 좋은 사이' : '서로 다름을 배우는 사이';
    return { score: sc, word, notes };
  }
  function compatHTML(nameA, a, nameB, b) {
    const c = compatPair(a, b); if (!c) return '';
    return `<div class="sajucard compat"><div class="cmph"><span>${nameA}<small>${a.dm.nm} · ${a.ddi}띠</small></span><b>💞 ${c.score}%</b><span>${nameB}<small>${b.dm.nm} · ${b.ddi}띠</small></span></div>
      <div class="cmpw">${c.word}</div>${c.notes.map(n => `<div class="cmpn">· ${n}</div>`).join('')}</div>`;
  }

  return { premiumHTML, compatPair, compatHTML, ok, randomBirth, analyze, applyStats, luckAt, compat, stemName, summaryHTML, fullHTML, GRPN, GRPE, ELSUB, ELE, ELC };
})();
