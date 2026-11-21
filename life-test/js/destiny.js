/* 프로젝트 80억 v9 — 사주 운명과 노력
 * ① 기본 성장: 아무것도 안 해도 사주 오행대로 능력치·과목·취미가 저절로 조금씩 자람
 * ② 노력 성장: 공부·연습·레슨으로 얻은 성장을 따로 세어 '노력 비율'로 표시
 * ③ 노력 연출: 연습하면 알이 생기고, 두드리기·꾹 누르기·타이밍 맞추기로 알을 키워 '펑' 깨뜨림 (잘하면 보너스)
 * ④ 개운: 부족한 기운과 관련된 활동(🔮개운) 25번 → 그 기운이 채워지고 기본 성장 자체가 바뀜
 * ⑤ 엔딩: 사주가 예측한 6개 분야 점수 vs 실제 인생 점수 비교 */
const Destiny = (() => {
  const EK = ['목', '화', '토', '금', '수'], EE = ['🌳', '🔥', '⛰️', '⚔️', '💧'];
  const NEED = 25;
  // 오행별로 저절로 자라는 과목·취미
  const EL_SUB = [['kor', 'soc'], ['pe', 'music'], ['soc', 'math'], ['math', 'code', 'art'], ['eng', 'sci']];
  const EL_HOB = [['독서', '등산', '캠핑'], ['댄스', '축구', '농구', '기타'], ['요리', '바둑', '등산'], ['피아노', '그림', '사진'], ['수영', '게임', '독서']];
  // 개운 활동 키워드 (버튼·선택지 이름에서 찾음)
  const EL_KW = [
    ['국어', '사회', '독서', '그림책', '캠핑', '산책', '도서관', '원예'],
    ['체육', '축구', '농구', '댄스', '운동', '체육관', '연주회', '합주', '발표'],
    ['요리', '등산', '바둑', '예금', '저축', '금융', '집안일', '가족시간', '투자 수업'],
    ['음악', '미술', '피아노', '기타', '그림', '사진', '수학', '코딩', '악보', '화성학', '레슨'],
    ['영어', '과학', '수영', '여행', '어학', '중국어', '일본어', '스페인어', '프랑스어', '독일어', '한국어', '단어', '명상'],
  ];
  const SUB_EL = { kor: 0, soc: 0, pe: 1, music: 3, art: 3, math: 3, code: 3, eng: 4, sci: 4 };
  const HOB_EL = {}; EL_HOB.forEach((a, e) => a.forEach(h => { if (HOB_EL[h] == null) HOB_EL[h] = e; }));
  const KS = ['smart', 'hp', 'look', 'bond'];
  const LABS = { smart: '지능', hp: '건강', look: '매력', bond: '가족유대', hap: '행복' };

  const weak = () => P && P.saju ? P.saju.weak : null;
  const st = () => (P.gaeun = P.gaeun || { n: 0, done: 0 });
  const ratio = () => { const e = P.effPts || 0, b = P.basePts || 0; return e + b ? Math.round(e / (e + b) * 100) : 0; };
  const hatchOn = () => !(window.Grow && Grow.auto) && !window.HATCH_OFF && !(store.get('p8b_hatch', 1) === 0);

  /* ---------------- ② 노력 측정: 행동력 1을 쓰는 순간부터 그 결과까지 ---------------- */
  let tick = null;
  function snap() {
    return { ks: KS.map(k => P[k]), hap: P.hap, sub: { ...P.sub }, lang: { ...(P.lang || {}) }, hxp: { ...(P.hxp || {}) }, fin: P.fin || 0, save: (P.bank || {}).save || 0,
      certs: P.certs ? P.certs.size : 0, cities: (P.cities || []).length, trips: P.trips || 0, pg: P.pgrade || 0, th: P.pTheory || 0, kw: lastKw };
  }
  let lastKw = '';
  function start(kw) {
    if (!P || !P.alive) return;
    if (kw) lastKw = kw;
    if (tick) return;
    tick = snap(); setTimeout(() => finish(false), 0);
  }
  function diff(a) {
    const g = [];
    KS.forEach((k, i) => { const d = P[k] - a.ks[i]; if (d > 0) g.push({ k, n: LABS[k], d, el: k === 'hp' ? 1 : k === 'bond' ? 2 : k === 'smart' ? 0 : k === 'look' ? 3 : null }); });
    Object.keys(P.sub || {}).forEach(k => { const d = P.sub[k] - (a.sub[k] || 0); if (d > 0) g.push({ k: 'sub.' + k, n: (SUBJ.find(s => s.k === k) || {}).n || k, d, el: SUB_EL[k] }); });
    Object.keys(P.lang || {}).forEach(k => { const d = P.lang[k] - (a.lang[k] || 0); if (d > 0) g.push({ k: 'lang.' + k, n: ((window.World && World.LANGS.find(l => l.k === k)) || {}).n || k, d, el: 4 }); });
    Object.keys(P.hxp || {}).forEach(k => { const d = P.hxp[k] - (a.hxp[k] || 0); if (d > 0) g.push({ k: 'hxp.' + k, n: k, d, el: HOB_EL[k] }); });
    if ((P.fin || 0) > a.fin) g.push({ k: 'fin', n: '금융 지식', d: P.fin - a.fin, el: 2 });
    if (((P.bank || {}).save || 0) > a.save) g.push({ k: 'save', n: '저축', d: 1, el: 2, silent: 1 });
    if ((P.certs ? P.certs.size : 0) > a.certs) g.push({ k: 'cert', n: '자격증', d: 3, el: null });
    if ((P.cities || []).length > a.cities || (P.trips || 0) > a.trips) g.push({ k: 'trip', n: '여행', d: 2, el: 4 });
    if ((P.pgrade || 0) > a.pg) g.push({ k: 'pg', n: '피아노 급수', d: 3, el: 3 });
    if ((P.pTheory || 0) > a.th) g.push({ k: 'th', n: '음악 이론', d: 1, el: 3 });
    return g;
  }
  function finish(force) {
    if (!tick || !P) { tick = null; return; }
    const g = diff(tick);
    if (!g.length && !force && modalQ.length) return;          // 퀴즈·선택이 남아 있으면 결과가 나올 때까지 기다림
    const kw = tick.kw; tick = null; lastKw = '';
    if (!g.length) return;
    const pts = g.reduce((s, x) => s + (x.silent ? 0 : x.d), 0);
    P.effPts = (P.effPts || 0) + pts; P.effActs = (P.effActs || 0) + 1;
    // 개운 체크: 부족한 기운과 관련된 결과가 나왔거나, 그 기운의 활동을 골랐으면 1회
    const w = weak();
    if (w != null && !st().done && (g.some(x => x.el === w) || EL_KW[w].some(k => kw.includes(k)))) gaeunStep();
    if (hatchOn() && pts > 0) hatch(g, kw);
    renderStats();
  }

  /* ---------------- ③ 노력 연출: 알 깨기 ---------------- */
  const MODE_TXT = { tap: '톡톡 두드려 알을 깨요!', hold: '꾹 눌러 힘을 모으고, 초록 구간에서 손을 떼요!', timing: '고리가 알에 딱 닿을 때 눌러요! (3번)' };
  function modeOf(g) {
    const ks = g.map(x => x.k).join(' ');
    if (/hp|sub\.pe|hxp\.(축구|농구|수영|댄스|등산)/.test(ks)) return 'hold';
    if (/sub\.music|sub\.art|hxp\.(피아노|기타|그림|사진)|\bth\b|\bpg\b/.test(ks)) return 'timing';
    return 'tap';
  }
  function iconOf(g) {
    const k = (g.slice().sort((a, b) => b.d - a.d)[0] || {}).k || '';
    if (k.startsWith('lang')) return '🗣️'; if (k.startsWith('hxp.피아노') || k === 'th' || k === 'pg') return '🎹'; if (k === 'hp' || k === 'sub.pe') return '💪';
    if (k.startsWith('sub.')) return (SUBJ.find(s => 'sub.' + s.k === k) || {}).e || '📚'; if (k.startsWith('hxp.')) return (HOBBIES.find(h => 'hxp.' + h.k === k) || {}).e || '🎯';
    if (k === 'fin') return '💹'; return '⭐';
  }
  function bonus(g) {
    const t = g.filter(x => !x.silent).sort((a, b) => b.d - a.d)[0]; if (!t) return '';
    const [a, b] = t.k.split('.');
    if (a === 'sub') P.sub[b] = clamp(P.sub[b] + 2); else if (a === 'lang') P.lang[b] = Math.min(100, P.lang[b] + 2);
    else if (a === 'hxp') { if (b === '피아노' && window.World) World.pianoXp(2); else P.hxp[b] += 2; } else if (KS.includes(a)) P[a] = clamp(P[a] + 2);
    else if (a === 'fin') P.fin = Math.min(100, P.fin + 2);
    P.effPts = (P.effPts || 0) + 2;
    return `${t.n} +2`;
  }
  function hatch(g, kw) {
    const old = document.getElementById('hatch'); if (old) old.remove();
    const mode = modeOf(g), icon = iconOf(g), w = weak(), isGaeun = w != null && g.some(x => x.el === w) && !st().done;
    const gains = g.filter(x => !x.silent).map(x => `+${x.d} ${x.n}`).join(' · ');
    const el = document.createElement('div'); el.id = 'hatch'; el.className = 'm-' + mode;
    el.innerHTML = `<div class="hbox"><div class="hti">${icon} 노력의 순간${isGaeun ? ` <em>🔮 개운 ${st().n}/${NEED}</em>` : ''}</div>
      <div class="hhint">${MODE_TXT[mode]}</div>
      <div class="hstage"><div class="ring"></div><button class="egg" aria-label="알"><span class="eg">🥚</span><svg class="crack" viewBox="0 0 100 100"><polyline points="18,48 32,40 40,54 52,38 62,52 72,42 84,50" /></svg></button><div class="burst"></div></div>
      <div class="hgauge"><i></i><b></b></div><div class="hres"></div>
      <div class="hfoot"><button class="hskip">건너뛰기</button><label><input type="checkbox" class="hoff"> 연출 끄기</label></div></div>`;
    document.body.appendChild(el);
    const egg = el.querySelector('.egg'), eg = el.querySelector('.eg'), gauge = el.querySelector('.hgauge i'), ring = el.querySelector('.ring'), res = el.querySelector('.hres');
    let n = 0, done = false, good = 0, t0 = performance.now(), holdT = 0, raf = 0, holding = false;
    const setScale = s => { egg.style.transform = `scale(${s})`; };
    const crack = lv => { el.classList.toggle('cr1', lv >= 1); el.classList.toggle('cr2', lv >= 2); };
    const pop = perfect => {
      if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(tmo);
      el.classList.add('popped'); Snd.sfx('levelup'); buzz(40);
      const b = el.querySelector('.burst');
      for (let i = 0; i < 14; i++) { const s = document.createElement('i'); s.textContent = ['✨', '⭐', '💥', icon][i % 4]; s.style.setProperty('--a', (i / 14 * 360) + 'deg'); s.style.setProperty('--d', (60 + Math.random() * 50) + 'px'); b.appendChild(s); }
      eg.textContent = '🐣';
      setTimeout(() => { eg.textContent = icon; }, 380);
      const bon = perfect ? bonus(g) : '';
      res.innerHTML = `<b>${perfect ? '🌟 PERFECT!' : '💥 펑!'}</b><span>${gains}</span>${bon ? `<em>노력 보너스 ${bon}</em>` : ''}`;
      if (bon) log(`🐣 알 깨기 PERFECT! ${bon}`, 'good');
      renderStats();
      setTimeout(close, perfect ? 1500 : 1100);
    };
    const close = () => { cancelAnimationFrame(raf); el.classList.add('out'); setTimeout(() => el.remove(), 220); };
    const tmo = setTimeout(() => pop(false), 9000);
    el.querySelector('.hskip').onclick = () => { if (!done) { done = true; clearTimeout(tmo); } close(); };
    el.querySelector('.hoff').onchange = e => { store.set('p8b_hatch', e.target.checked ? 0 : 1); };
    if (mode === 'tap') {
      const need = 6;
      egg.onclick = () => {
        if (done) return; n++; Snd.sfx('tap'); buzz(12);
        setScale(1 + n * .13); egg.classList.remove('shake'); void egg.offsetWidth; egg.classList.add('shake');
        gauge.style.width = (n / need * 100) + '%'; crack(n >= 4 ? 2 : n >= 2 ? 1 : 0);
        if (n >= need) pop(performance.now() - t0 < 2600);
      };
    } else if (mode === 'hold') {
      const zone = [.72, .92]; el.querySelector('.hgauge b').style.cssText = `left:${zone[0] * 100}%;width:${(zone[1] - zone[0]) * 100}%`;
      const loop = () => { if (!holding || done) return; holdT = Math.min(1.08, holdT + .016); setScale(1 + holdT * .9); gauge.style.width = Math.min(100, holdT * 100) + '%'; crack(holdT > .7 ? 2 : holdT > .4 ? 1 : 0); if (holdT >= 1.08) { holding = false; pop(false); return; } raf = requestAnimationFrame(loop); };
      const down = e => { e.preventDefault(); if (done) return; holding = true; egg.classList.add('charging'); raf = requestAnimationFrame(loop); };
      const up = () => { if (!holding || done) return; holding = false; egg.classList.remove('charging');
        if (holdT >= .5) pop(holdT >= zone[0] && holdT <= zone[1]); else { holdT = 0; setScale(1); gauge.style.width = '0'; crack(0); el.querySelector('.hhint').textContent = '조금 더 오래 눌러요! 💪'; } };
      egg.addEventListener('pointerdown', down); egg.addEventListener('pointerup', up); egg.addEventListener('pointerleave', up);
    } else {
      // 타이밍: 고리가 2.2배에서 1배로 줄어들 때 맞춰 누르기
      let rs = 2.2, dir = -1; const loop = () => { if (done) return; rs += dir * .028; if (rs <= .75) { rs = 2.2; } ring.style.transform = `scale(${rs})`; raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      egg.onclick = () => {
        if (done) return; n++; const hit = Math.abs(rs - 1.05) < .22; good += hit ? 1 : 0;
        Snd.sfx(hit ? 'good' : 'tap'); buzz(hit ? 25 : 10);
        el.querySelector('.hhint').textContent = hit ? `딱 맞았어요! ${n}/3` : `조금 어긋났어요 ${n}/3`;
        setScale(1 + n * .22); egg.classList.remove('shake'); void egg.offsetWidth; egg.classList.add('shake');
        gauge.style.width = (n / 3 * 100) + '%'; crack(n);
        rs = 2.2; if (n >= 3) pop(good >= 2);
      };
    }
  }

  /* ---------------- ④ 개운 ---------------- */
  function gaeunStep() {
    const s = st(), w = weak(); if (s.done) return; s.n++;
    if (s.n === 10 || s.n === 20) log(`🔮 개운 ${s.n}/${NEED} — 부족한 ${EK[w]} 기운이 차오르고 있다`);
    if (s.n >= NEED) complete();
  }
  function complete() {
    const s = st(), w = weak(); if (s.done) return;
    s.done = P.age; s.el = w;
    const before = { ...P.pot };
    P.saju = { ...P.saju, el: P.saju.el.map((v, i) => i === w ? v + 2 : v) };   // 그 기운이 채워짐
    if (window.World) { const np = World.potential(P); Object.keys(np).forEach(k => P.pot[k] = Math.max(P.pot[k], Math.min(95, np[k] + 2))); }
    const ch = Object.keys(P.pot).filter(k => P.pot[k] > before[k]).map(k => `${LABS[k]} ${before[k]}→${P.pot[k]}`).join(', ');
    cutin('🔮', `개운 완성! ${EE[w]} ${EK[w]} 기운이 채워졌다`, '이제부터 기본 성장이 달라져요');
    Snd.sfx('fanfare'); badge(`${EK[w]} 기운 개운`);
    log(`🔮 개운 완성 (${P.age}살) — 부족했던 ${EK[w]} 기운을 ${NEED}번의 노력으로 채웠다. 사주 기본치 변화: ${ch || '균형이 잡혔다'}`, 'good');
    if (P.moments) P.moments.push({ a: P.age, e: '🔮', t: '개운', c: `${EK[w]} 기운 채움`, r: ch });
  }
  // 버튼·선택지에 🔮개운 표시
  function markActions() {
    const w = weak(); if (w == null || !P || st().done) return;
    document.querySelectorAll('#actions .act').forEach(b => { if (EL_KW[w].some(k => b.textContent.includes(k)) && !b.querySelector('.gae')) { b.classList.add('gaeun'); b.insertAdjacentHTML('beforeend', '<i class="gae">🔮</i>'); } });
  }
  function markModal() {
    const w = weak(); if (w == null || !P || st().done) return;
    document.querySelectorAll('#sheet .choice').forEach(b => { const t = b.textContent; if (EL_KW[w].some(k => t.includes(k)) && !/닫기|그만|쉬자/.test(t) && !b.querySelector('.gae')) b.insertAdjacentHTML('beforeend', '<em class="gae">🔮개운</em>'); });
  }

  /* ---------------- ① 사주 기본 성장 (매년) ---------------- */
  function yearlyBase() {
    if (!P || !P.saju || !P.sub) return;
    const el = P.saju.el; let got = 0;
    if (P.age >= 6 && P.age <= 22) EL_SUB.forEach((subs, e) => { const g = Math.round(el[e] * .45 + Math.random() * .5); if (g > 0) subs.forEach(k => { const b = P.sub[k]; P.sub[k] = clamp(b + g); got += P.sub[k] - b; }); });
    if (P.age >= 6 && P.hxp) EL_HOB.forEach((hs, e) => { if (el[e] < 2) return; hs.forEach(h => { if (P.hxp[h] > 0) { P.hxp[h] += 1; got += 1; const lv = Math.min(10, Math.floor(P.hxp[h] / 5)); if (lv > (P.hlv[h] || 0)) { P.hlv[h] = lv; log(`🌱 사주 기운대로 ${h}이(가) 저절로 늘었다 → Lv${lv}`); } } }); });
    P.basePts = (P.basePts || 0) + got;
  }

  /* ---------------- 상태 칩 ---------------- */
  function chip() {
    const sl = document.getElementById('subline'); if (!sl || !P || !P.saju) return;
    const w = weak(), s = st();
    const g = s.done ? `<span class="dchip done">🔮 ${EK[s.el]} 개운 완료</span>` : `<span class="dchip"><i style="width:${s.n / NEED * 100}%"></i>🔮 ${EE[w]}${EK[w]} 개운 ${s.n}/${NEED}</span>`;
    sl.insertAdjacentHTML('afterend', `<div id="dchips">${g}<span class="dchip eff">💪 노력 ${ratio()}%</span></div>`);
    document.getElementById('dchips').onclick = info;
  }
  function info() {
    const w = weak(), s = st();
    showModal({
      e: '🔮', t: '사주 운명과 노력', html: () => `<div class="fincard"><b>🌱 기본 성장 ${P.basePts || 0}점</b><p>아무것도 안 해도 사주의 기운대로 능력치·과목·취미가 저절로 조금씩 자라요.</p></div>
        <div class="fincard"><b>💪 노력 성장 ${P.effPts || 0}점 · 노력 비율 ${ratio()}%</b><p>공부·연습·레슨으로 얻은 성장이에요. 알을 PERFECT로 깨면 보너스가 붙어요.</p></div>
        <div class="fincard"><b>🔮 개운 ${s.done ? '완료' : `${s.n}/${NEED}`}</b><p>부족한 기운은 ${EE[w]} ${EK[w]}. 🔮 표시가 붙은 활동(${EL_KW[w].slice(0, 6).join('·')} 등)을 ${NEED}번 하면 그 기운이 채워지고 기본 성장 자체가 바뀌어요.</p></div>`,
      ch: [{ t: store.get('p8b_hatch', 1) === 0 ? '🥚 알 깨기 연출 켜기' : '🥚 알 깨기 연출 끄기', f: () => store.set('p8b_hatch', store.get('p8b_hatch', 1) === 0 ? 1 : 0) }, { t: '닫기', f: () => { } }],
    });
  }

  /* ---------------- ⑤ 엔딩: 사주 예측 vs 실제 ---------------- */
  const cl = v => Math.max(5, Math.min(100, Math.round(v)));
  function predict(a) {
    const e = a.el, g = a.grp, spread = Math.max(...e) - Math.min(...e);
    return { 학업: cl(38 + g[4] * 11 + e[4] * 3 + e[0] * 2), 재물: cl(38 + g[2] * 11 + e[2] * 3), 명예: cl(38 + g[3] * 11 + e[3] * 3),
      재능: cl(38 + g[1] * 11 + e[1] * 3), 관계: cl(40 + g[0] * 6 + g[2] * 3 + e[0] * 3), 건강: cl(88 - spread * 7) };
  }
  function actual() {
    const peak = Math.max(1, (P.peak || 0) / (P.mult || 1)), langs = Object.entries(P.lang || {}).filter(([k, v]) => k !== P.native && v >= 45).length;
    const hob = Math.max(0, ...Object.values(P.hlv || {}));
    return {
      학업: cl((P.edu || 0) * 14 + P.smart * .3 + Math.max(...Object.values(P.sub || { a: 0 })) * .15 + (P.uniAbroad ? 10 : 0)),
      재물: cl(20 * Math.log10(peak / 1000) + 20),
      명예: cl((P.fame || 0) * 7 + (P.rank || 0) * 9 + (P.badges ? P.badges.size : 0) * 1.5 + (P.job && P.job.global ? 10 : 0)),
      재능: cl(hob * 6 + (P.pgrade || 0) * 3 + langs * 8 + (P.contest || 0) * 4),
      관계: cl(P.bond * .45 + (P.married ? 18 : 0) + (P.kids || 0) * 7 + (P.rel ? 5 : 0)),
      건강: cl(P.age * .85 + P.hp * .12),
    };
  }
  function endBox() {
    if (!P || !P.saju || document.getElementById('endDestiny')) return;
    const pr = predict(P.saju), ac = actual(), w = weak(), s = st();
    const ICON = { 학업: '📚', 재물: '💰', 명예: '🏅', 재능: '🎨', 관계: '💞', 건강: '🌿' };
    const rows = Object.keys(pr).map(k => { const d = ac[k] - pr[k];
      return `<div class="dsrow"><span class="dsk">${ICON[k]} ${k}</span><div class="dsbars"><i class="pr" style="width:${pr[k]}%"></i><i class="ac" style="width:${ac[k]}%"></i></div><b class="${d >= 0 ? 'up' : 'dn'}">${pr[k]}→${ac[k]}</b></div>`; }).join('');
    const beat = Object.keys(pr).filter(k => ac[k] > pr[k]).length;
    const html = `<div class="box" id="endDestiny"><b>🔮 사주 예측 vs 실제 인생</b>
      <div class="dslegend"><span><i class="pr"></i>사주 예측</span><span><i class="ac"></i>실제 인생</span></div>${rows}
      <p class="sjnote">6개 분야 중 <b>${beat}개</b>에서 사주를 넘어섰어요 · 노력 비율 <b>${ratio()}%</b> (기본 ${P.basePts || 0} · 노력 ${P.effPts || 0}) · 개운 ${s.done ? `${EK[s.el]} 기운 ${s.done}살에 완성` : `${EK[w]} ${s.n}/${NEED}`}${P.pgrade ? ` · 피아노 ${Piano2.GRADES[P.pgrade - 1]}` : ''}</p></div>`;
    const hist = document.getElementById('endWorld'), boxes = [...document.querySelectorAll('#end .box')], at = hist || boxes.find(x => x.textContent.trim().startsWith('⭐')) || boxes[boxes.length - 1];
    if (at) at.insertAdjacentHTML('beforebegin', html);
  }

  function init() {
    const _ue = useEnergy; useEnergy = function () { const ok = _ue(); if (ok) start(''); return ok; };
    const _do = doAct; doAct = function (a) { if (a && !a.free && P && P.energy > 0 && !modalQ.length) start(a.n); else if (a) lastKw = a.n; return _do(a); };
    const _on = openNext; openNext = function () { _on(); if (modalQ.length) markModal(); else if (tick) finish(true); };
    // 선택지를 누르면 그 글자를 개운 키워드로 기억
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#sheet .choice'); if (b) { lastKw = b.textContent; if (tick && !tick.kw) tick.kw = lastKw; } }, true);
    const _ra = renderActions; renderActions = function () { _ra(); markActions(); };
    const _rs = renderStats; renderStats = function () { _rs(); if (P && P.alive !== undefined && document.getElementById('subline')) chip(); };
    const _age = ageUp; ageUp = function () { if (tick) finish(true); const a0 = P && P.age; _age(); if (P && P.age !== a0 && P.alive) yearlyBase(); };
    $('#ageBtn').onclick = () => ageUp();
    const _beg = beginLife; beginLife = function () { _beg(); P.effPts = 0; P.basePts = 0; P.gaeun = { n: 0, done: 0 }; renderStats(); };
    const _show = show; show = function (id) { _show(id); if (id === 'end') setTimeout(endBox, 60); };
  }
  return { init, ratio, predict, actual, hatch, complete, gaeunStep, yearlyBase, info, NEED, EL_KW, get tick() { return tick; } };
})();
window.Destiny = Destiny;
Destiny.init();
