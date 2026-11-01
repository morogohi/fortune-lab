/* =====================================================================
 *  world.js — v7 세계 확장
 *   ① 장소 이동: 활동마다 도서관·피아노 학원·은행·공항… 으로 이동해서 동작
 *   ② 사주 잠재력 + 노력 성장: 사주가 정한 기본치까지는 저절로 자라고,
 *      노력(행동)으로 그 위를 넘어설 수 있음 → '운명 극복'
 *   ③ 어학 (영어·중국어·일본어·스페인어·프랑스어·독일어·한국어)
 *   ④ 피아노 (학원 레슨·연습·연주회 리듬게임)
 *   ⑤ 20살 세계여행 · 교통수단(비행기·기차·배)별 비용
 *   ⑥ 세계 유명 대학 유학 · 해외 일자리
 * ===================================================================== */
const World = (() => {
  const S = window.SAJU;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ============================ ① 장소 ============================ */
  const PL = {
    home: ['🏠', '집'], school: ['🏫', '학교'], library: ['📚', '도서관'], piano: ['🎹', '피아노 학원'], lang: ['🗣️', '어학원'],
    gym: ['🏋️', '체육관'], park: ['🌳', '공원'], bank: ['🏦', '은행'], office: ['🏢', '회사'], shop: ['🏪', '알바 가게'],
    realty: ['🏘️', '부동산'], airport: ['✈️', '공항'], univ: ['🎓', '대학'], netcity: ['🌐', '넷시티'], hospital: ['🏥', '병원'],
    cafe: ['☕', '카페'], station: ['🚆', '기차역'], port: ['🚢', '항구'],
  };
  const ACT_PLACE = {
    '공부': () => P.inSchool && P.age < 19 ? 'school' : 'library', '그림책': 'library', '자기계발': 'library', '회고록': 'home',
    '놀이': 'park', '뛰어놀기': 'park', '산책': 'park', '운동': 'gym', '검진': 'hospital', '병원': 'hospital',
    '알바': 'shop', '추가근무': 'office', '구직': 'office', '이직·퇴사': 'office', '투자': 'bank', '은행': 'bank', '금융': 'bank',
    '여행': 'airport', '세계여행': 'airport', '해외': 'airport', '집': 'realty', '부동산': 'realty',
    '친구들': 'cafe', '만남': 'cafe', '데이트': 'cafe', '어학': 'lang', '피아노': 'piano', '넷시티': 'netcity',
    '가족시간': 'home', '집안일': 'home', '잠자기': 'home', '울기': 'home', '옹알이': 'home', '꾸미기': 'home', '노래': 'home',
    '나눔': 'home', '자식 연락': 'home', '취미': 'park', '동네 지도': null,
  };
  function placeOf(n) { const v = ACT_PLACE[n]; return typeof v === 'function' ? v() : v; }
  function ride() { // 이동 수단: 나이·형편에 따라
    if (P.age < 10) return '🚶'; if (P.age < 19) return P.money > M(2000) ? '🚲' : '🚶';
    return netWorth() > M(80000) ? '🚗' : '🚌';
  }
  let placeT = 0;
  function goTo(k, quiet) {
    if (!k || !PL[k] || !P) return;
    const from = P.place || 'home'; P.place = k;
    const bar = $('#placeBar'); if (!bar) return;
    const [e, n] = PL[k], [fe, fn] = PL[from] || PL.home;
    clearTimeout(placeT);
    if (from === k) { bar.className = 'on same'; bar.innerHTML = `<span class="pl-sign">${e} ${n}</span>`; }
    else {
      bar.className = 'on move';
      bar.innerHTML = `<span class="pl-from">${fe}</span><span class="pl-road"><i>${ride()}</i></span><span class="pl-to">${e}</span><span class="pl-sign">${n}(으)로 이동</span>`;
      if (!quiet) Snd.sfx('whoosh');
    }
    $('#stageWrap').dataset.place = k;
    placeT = setTimeout(() => { bar.className = 'on stay'; bar.innerHTML = `<span class="pl-sign">${e} ${n}</span>`; }, 900);
  }
  function openMap() {
    const open = Object.entries(PLACE_MENU).filter(([k, m]) => m.age(P));
    showModal({
      e: '🗺️', t: '어디로 갈까?', d: `지금 위치: ${(PL[P.place || 'home'] || PL.home).join(' ')} · 행동력 ${P.energy}`, grid: 1, auto: 1,
      ch: [...open.map(([k, m]) => ({ t: `<span class="ge">${PL[k][0]}</span>${PL[k][1]}<small>${m.d}</small>`, f: () => { goTo(k); setTimeout(() => m.go(), 350); } })), { t: '닫기', f: () => { } }],
    });
  }
  const PLACE_MENU = {
    library: { d: '공부·독학·금융책', age: p => p.age >= 5, go: () => openLibrary() },
    piano: { d: '레슨·연습·연주회', age: p => p.age >= 5, go: () => openPiano() },
    lang: { d: '영어·중국어·일본어…', age: p => p.age >= 6, go: () => openLang('lang') },
    gym: { d: '운동', age: p => p.age >= 8, go: () => { const a = actionList().find(x => x.n === '운동'); a ? doAct(a) : (useEnergy() && (fx({ hp: 4, look: 1 }), log('🏋️ 체육관에서 땀 흘렸다'), playAnim('exercise'))); } },
    shop: { d: '용돈벌이 알바', age: p => p.age >= 15 && !p.job, go: () => window.Money && Money.openAlba() },
    bank: { d: '저축·대출·금융 공부', age: p => p.age >= 12, go: () => window.Money && Money.openBank() },
    realty: { d: '내 집·부동산 투자', age: p => p.age >= 19, go: () => window.Money && Money.openRealty() },
    airport: { d: '세계여행·유학·해외 취업', age: p => p.age >= 16, go: () => openAbroad() },
    netcity: { d: '시즌 이벤트·합주·동창회', age: p => p.age >= 10 && (!window.Hist || Hist.era('internet')), go: () => window.Net && Net.open() },
  };

  /* ===================== ② 사주 잠재력 + 노력 ===================== */
  const KS = ['hap', 'hp', 'smart', 'look', 'bond'];
  function potential(p) {
    const a = p.saju; if (!a) return { hap: 62, hp: 62, smart: 62, look: 62, bond: 62 };
    const e = a.el, g = a.grp; // 목화토금수 · 비겁식상재성관성인성
    const f = v => Math.max(46, Math.min(88, Math.round(52 + v)));
    return {
      smart: f((e[4] + e[3]) * 4 + g[4] * 4 - 4), hp: f((e[0] + e[2]) * 4 + g[0] * 3 - 2), hap: f(e[1] * 5 + g[1] * 4),
      look: f((e[1] + e[0]) * 3 + g[1] * 3 + g[2] * 2), bond: f(e[2] * 4 + g[4] * 3 + g[3] * 2),
    };
  }
  function yearlyGrowth() {
    if (!P.pot) P.pot = potential(P);
    const young = P.age <= 25;
    KS.forEach(k => {
      const gap = P.pot[k] - P[k];
      if (gap > 0 && young) { const g0 = P[k]; P[k] = clamp(P[k] + Math.max(1, Math.round(gap * .1))); P.basePts = (P.basePts || 0) + (P[k] - g0); }   // 사주가 정한 기본치까지는 저절로
      if (P.age >= 15 && P[k] >= P.pot[k] + 20 && !(P.over || {})[k]) {
        P.over = P.over || {}; P.over[k] = P.age;
        log(`🔥 운명 극복! ${LAB[k]}이(가) 사주가 정한 기본치(${P.pot[k]})를 노력으로 넘어섰다`, 'good');
        cutin('🔥', '운명 극복!', `${LAB[k]} ${P[k]} (사주 기본 ${P.pot[k]})`); badge(`운명을 넘어선 ${LAB[k]}`); Snd.sfx('fanfare');
      }
    });
  }
  function paintPot() {
    if (!P || !P.pot) return;
    document.querySelectorAll('#stats .stat').forEach((el, i) => {
      const k = KS[i], b = el.querySelector('.bar'); if (!b || b.querySelector('.pot')) return;
      const m = document.createElement('em'); m.className = 'pot' + (P[k] > P.pot[k] ? ' over' : ''); m.style.left = P.pot[k] + '%'; m.title = '사주 기본치'; b.appendChild(m);
    });
  }

  /* ============================== ③ 어학 ============================== */
  const LANGS = [
    { k: 'en', e: '🇺🇸', n: '영어' }, { k: 'zh', e: '🇨🇳', n: '중국어' }, { k: 'ja', e: '🇯🇵', n: '일본어' },
    { k: 'es', e: '🇪🇸', n: '스페인어' }, { k: 'fr', e: '🇫🇷', n: '프랑스어' }, { k: 'de', e: '🇩🇪', n: '독일어' }, { k: 'ko', e: '🇰🇷', n: '한국어' },
  ];
  const NATIVE = { '미국': 'en', '영국': 'en', '캐나다': 'en', '호주': 'en', '중국': 'zh', '일본': 'ja', '멕시코': 'es', '프랑스': 'fr', '독일': 'de', '한국': 'ko', '나이지리아': 'en', '케냐': 'en', '인도': 'en', '필리핀': 'en' };
  const lv = v => v >= 90 ? '원어민급' : v >= 70 ? '고급' : v >= 45 ? '중급' : v >= 20 ? '초급' : v > 0 ? '입문' : '—';
  const L = k => (P.lang && P.lang[k]) || 0;
  function initLang() {
    P.lang = P.lang || {};
    const nat = NATIVE[P.country.n], second = ['인도', '필리핀', '나이지리아', '케냐'].includes(P.country.n);
    if (nat) P.lang[nat] = Math.max(P.lang[nat] || 0, second ? 40 : 100);
    P.native = nat && !second ? nat : null;        // 영어가 제2언어인 나라는 모국어로 치지 않음
  }
  // 주력 언어: 가장 잘하는 외국어, 없으면 영어(영어가 모국어면 중국어)
  function focusLang() { const e = Object.entries(P.lang || {}).filter(([k]) => k !== P.native).sort((a, b) => b[1] - a[1])[0]; return e && e[1] >= 15 ? e[0] : P.native === 'en' ? 'zh' : 'en'; }
  /* 생활 외국어 레슨: 표현 카드 2장 + 뜻 맞히기 퀴즈 → 정답이면 실력이 더 오름 */
  function speak(t, k) { try { const u = new SpeechSynthesisUtterance(t.replace(/\(.*?\)/g, '')); u.lang = CONTENT.L[k].tts; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } }
  function nextItems(k) {
    const it = CONTENT.L[k].items, v = L(k), tier = v < 20 ? 0 : v < 45 ? 1 : 2, base = tier * 6;
    P.learned = P.learned || {}; const got = P.learned[k] = P.learned[k] || [];
    const fresh = [0, 1, 2, 3, 4, 5].map(i => base + i).filter(i => !got.includes(i));
    const pool = fresh.length ? fresh : [0, 1, 2, 3, 4, 5].map(i => base + i).sort(() => Math.random() - .5);
    return { tier, idx: pool.slice(0, 2), review: !fresh.length };
  }
  function openLang(where) {
    const online = where === 'online', cost = online ? M(150) : M(400), atAcademy = where !== 'library', mult = online ? 1.5 : atAcademy ? 1.8 : 1;
    showModal({
      e: online ? '🌐' : '🗣️', t: online ? '넷시티 온라인 어학교' : atAcademy ? '어학원 수업' : '도서관 독학', d: `${online ? '원어민 화상 수업 ' + usd(cost) + ' · 효과 1.5배 · 집에서 수강' : atAcademy ? '수업료 ' + usd(cost) + ' · 효과 2배' : '무료 · 효과 보통'} · 실제 생활 표현을 배우고 퀴즈로 확인해요`, grid: 1,
      ch: [...LANGS.filter(l => l.k !== P.native).map(l => ({
        t: `<span class="ge">${l.e}</span>${l.n}<small>${L(l.k)} · ${lv(L(l.k))}${l.k === focusLang() ? ' ★' : ''}</small>`, f: () => {
          if (!useEnergy()) return;
          if (atAcademy && P.age >= 18) { if (P.money < cost) log('수업료가 부족해 도서관에서 독학했다'); else fx({ money: -cost }); }
          if (online) { P.onlineLang = (P.onlineLang || 0) + 1; if (window.Net && Net.addPts) Net.addPts(1, '온라인 어학교'); }
          lesson(l, mult);
        }
      })), { t: '📒 내 단어장', f: () => vocab() }, { t: '그만', f: () => { } }],
    });
  }
  function lesson(l, academy) {
    const k = l.k, C = CONTENT.L[k], nx = nextItems(k), cards = nx.idx.map(i => C.items[i]);
    const q = cards[0], wrong = C.items.filter(x => x[2] !== q[2]).sort(() => Math.random() - .5).slice(0, 2);
    const opts = [q, ...wrong].sort(() => Math.random() - .5);
    const tierN = ['단어', '생활 표현', '문장'][nx.tier];
    showModal({
      e: l.e, t: `${l.n} ${tierN}${nx.review ? ' 복습' : ''}`, auto: 1, noAuto: 1,
      html: () => `<div class="lcards">${cards.map((c, j) => `<div class="lcard"><button class="lspk" data-s="${j}">🔊</button><b>${c[0]}</b><span>${c[1]}</span><em>${c[2]}</em><small>${c[3]}</small></div>`).join('')}</div>
        <p class="lq">퀴즈: <b>${q[0]}</b> 의 뜻은?</p>`,
      ch: opts.map(o => ({ t: o[2], f: () => {
        const ok = o === q, young = P.age < 13 ? 1.3 : P.age < 20 ? 1.1 : P.age > 50 ? .7 : 1;
        const g = Math.max(1, Math.round(R(3, 6) * (academy === true ? 1.8 : academy || 1) * young * (.6 + P.smart / 120) * (1 - L(k) / 140) * (ok ? 1.3 : .9)));
        const before = L(k); P.lang[k] = Math.min(100, before + g); fx({ smart: 1 });
        nx.idx.forEach(i => { if (!P.learned[k].includes(i)) P.learned[k].push(i); });
        playAnim('read'); Snd.sfx(ok ? 'good' : 'bad'); say(q[0].length < 22 ? q[0] : q[0].slice(0, 20) + '…');
        log(`${l.e} ${l.n} ${tierN}: "${q[0]}" (${q[2]}) ${ok ? '✅ 정답' : '❌ 오답'} · +${g} → ${P.lang[k]} ${lv(P.lang[k])}`, ok ? 'good' : '');
        if (lv(before) !== lv(P.lang[k]) && P.lang[k] >= 45) { cutin(l.e, `${l.n} ${lv(P.lang[k])}!`, '세계로 가는 문이 넓어졌다'); Snd.sfx('levelup'); }
        if (Object.values(P.lang).filter(v => v >= 70).length >= 3) badge('다개국어 능통자');
      } })),
    });
    setTimeout(() => { document.querySelectorAll('.lspk').forEach(b => b.onclick = e => { e.stopPropagation(); speak(cards[+b.dataset.s][0], k); }); if (!(window.Grow && Grow.auto)) speak(cards[0][0], k); }, 50);
  }
  function vocab() {
    const rows = LANGS.filter(l => (P.learned || {})[l.k] && P.learned[l.k].length).map(l => `<div class="vhead">${l.e} ${l.n} · ${P.learned[l.k].length}개 · ${lv(L(l.k))}</div>` +
      P.learned[l.k].map(i => { const c = CONTENT.L[l.k].items[i]; return `<div class="vrow"><button class="vspk" data-k="${l.k}" data-i="${i}">🔊</button><b>${c[0]}</b><span>${c[1]}</span><em>${c[2]}</em></div>`; }).join('')).join('');
    openOverlay('📒 내 단어장', rows || '<p class="sjtxt" style="text-align:center">아직 배운 표현이 없어요. 어학원이나 도서관에서 수업을 들어 보세요.</p>', [{ t: '닫기' }]);
    document.querySelectorAll('.vspk').forEach(b => b.onclick = () => speak(CONTENT.L[b.dataset.k].items[+b.dataset.i][0], b.dataset.k));
  }

  /* ============================= ④ 피아노 ============================= */
  const plv = () => (P.hlv && P.hlv['피아노']) || 0;
  function pianoXp(n) { P.hxp['피아노'] = (P.hxp['피아노'] || 0) + n; const nl = Math.min(10, Math.floor(P.hxp['피아노'] / 5)), up = nl > plv(); P.hlv['피아노'] = nl; if (up) { Snd.sfx('levelup'); log(`🎹 피아노 Lv${nl}!`, 'good'); say(`피아노 Lv${nl}! 🎉`); if (nl === 10) badge('피아노 마스터'); } }
  function openPiano() {
    const fee = M(500), own = P.ownPiano || P.cls >= 3;
    showModal({
      e: '🎹', t: '피아노', d: `지금 Lv${plv()} · ${own ? '집에 피아노 있음' : '집에 피아노 없음'}`,
      ch: [
        { t: '🎓 학원 레슨', s: `수업료 ${usd(fee)} · 실력 2배로 늘어요`, f: () => { if (!useEnergy()) return; if (P.pianoFirst == null) P.pianoFirst = P.age; if (P.age >= 15) fx({ money: -fee }); pianoXp(R(4, 6)); fx({ hap: 2, smart: 1 }); P.sub.music = clamp(P.sub.music + 3); playAnim('sing'); log('🎹 피아노 학원 레슨: 바이엘 → 체르니 진도'); } },
        ...(own ? [{ t: '🏠 집에서 연습', s: '무료 · 실력 조금', f: () => { if (!useEnergy()) return; pianoXp(R(2, 3)); fx({ hap: 1 }); playAnim('sing'); log('🎹 집에서 스케일 연습'); } }]
          : [{ t: '🛒 피아노 들여놓기', s: `디지털 피아노 ${usd(M(2500))}`, f: () => { if (P.money < M(2500)) { log('돈이 부족해요 (알바·용돈을 모아 보세요)', 'bad'); return; } fx({ money: -M(2500), hap: 5 }); P.ownPiano = true; log('🎹 집에 피아노가 생겼다!', 'good'); } }]),
        ...(plv() >= 2 ? [{ t: `🎤 연주회 · ${song().n}`, s: `난이도 ${'★'.repeat(Math.max(1, Math.ceil(diff() / 2)))} · 건반 ${song().lanes}개`, f: () => { if (!useEnergy()) return; rhythm('연주회', r => { fx({ hap: 4 + Math.round(r * 8), look: Math.round(r * 4) }); P.fame += r > .8 ? 1 : 0; pianoXp(2); if (r >= .85 && plv() >= 6) { P.art = true; badge('피아노 콩쿠르 입상'); cutin('🏆', '콩쿠르 입상!', '예술가의 길이 열렸다'); } }); } }] : []),
        ...(window.Piano2 ? Piano2.choices() : []),
        { t: '닫기', f: () => { } }],
    });
  }
  /* 리듬게임: 4개 건반, 떨어지는 음표를 판정선에서 누르기 (net: 합주) */
  let actx = null;
  function note(freq) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = freq; g.gain.setValueAtTime(.18, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + .5); o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + .5); } catch (e) { } }
  // 난이도 = 피아노 레벨×0.7 + 연습 연차/3(최대 3) + 나이(13살 +0.5, 18살 +0.5) → 곡·속도·건반 수·판정이 달라짐
  function diff() { const yrs = P.pianoFirst != null ? P.age - P.pianoFirst : 0; return Math.min(10, Math.round(plv() * .7 + Math.min(3, yrs / 3) + (P.age >= 13 ? .5 : 0) + (P.age >= 18 ? .5 : 0))); }
  function song() { const d = diff(); return CONTENT.SONGS.filter(s => s.d <= d).pop(); }
  function rhythm(title, done, mates) {
    const s = song(), d = diff();
    if (window.Grow && Grow.auto) {   // 자동 진행 중엔 실력으로 결과를 바로 계산
      const r = Math.min(1, .35 + plv() * .06 - (s.d - d) * .02 + Math.random() * .2), gr = r >= .85 ? 'S' : r >= .65 ? 'A' : r >= .4 ? 'B' : 'C';
      log(`🎹 ${title} · ${s.n} ${gr}등급 (자동 · 정확도 ${Math.round(r * 100)}%)`, r >= .65 ? 'good' : ''); done && done(r, gr); return;
    }
    const el = $('#mini'), N = s.lanes, lane = n => Math.round(n * (N - 1) / 7), lab = i => CONTENT.NOTE_N[Math.round(i * 7 / (N - 1))];
    const extra = Math.max(0, d - s.d), gap = s.gap * (1 - extra * .05), fall = s.fall * (1 - extra * .04);
    const PER = Math.max(55, 95 - d * 4), GRE = PER + 60, GOO = GRE + 60;
    el.innerHTML = `<div class="mhead"><span>🎹 ${title}${mates ? ' · ' + mates : ''}</span><b id="rScore">0</b></div>
      <div class="mtip">🎼 ${s.n} (${s.by}) · 난이도 ${'★'.repeat(Math.max(1, Math.ceil(d / 2)))} · 건반 ${N}개</div>
      <div class="rstage" style="grid-template-columns:repeat(${N},1fr)">${Array.from({ length: N }, (_, i) => `<div class="rlane" data-l="${i}"></div>`).join('')}<div class="rline"></div><div id="rJudge" class="rjudge"></div></div>
      <div class="rkeys" style="grid-template-columns:repeat(${N},1fr)">${Array.from({ length: N }, (_, i) => `<button data-k="${i}" class="${N > 6 ? 'sm' : ''}">${lab(i)}</button>`).join('')}</div>`;
    el.classList.add('on');
    const t0 = performance.now() + 1000, notes = [];
    s.notes.forEach((n, i) => { const t = t0 + i * gap * 1000; notes.push({ ln: lane(n), f: CONTENT.FREQ[n], t }); if (s.chords && d >= 9 && i % 4 === 0) notes.push({ ln: (lane(n) + 3) % N, f: CONTENT.FREQ[(n + 4) % 8], t }); });
    const stage = el.querySelector('.rstage');
    notes.forEach(n => { const x = document.createElement('i'); x.className = 'rnote'; x.style.animationDuration = fall + 's'; x.style.animationDelay = ((n.t - performance.now()) / 1000 - fall) + 's'; stage.querySelector(`[data-l="${n.ln}"]`).appendChild(x); n.el = x; });
    let score = 0, combo = 0, best0 = 0; const max = notes.length;
    const judge = (txt, cls) => { const j = $('#rJudge'); j.textContent = txt; j.className = 'rjudge ' + cls; void j.offsetWidth; j.classList.add('pop'); };
    el.querySelectorAll('[data-k]').forEach(b => b.onpointerdown = e => {
      e.preventDefault(); const k = +b.dataset.k, now = performance.now(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120);
      let best = null, bd = 1e9; notes.forEach(n => { if (!n.hit && n.ln === k) { const dd = Math.abs(n.t - now); if (dd < bd) { bd = dd; best = n; } } });
      note(best && bd <= GOO ? best.f : CONTENT.FREQ[Math.round(k * 7 / (N - 1))]);
      if (!best || bd > GOO) { combo = 0; judge('MISS', 'no'); return; }
      best.hit = true; best.el.classList.add('hit'); combo++; best0 = Math.max(best0, combo);
      const pts = bd < PER ? 1 : bd < GRE ? .7 : .4; score += pts; judge(bd < PER ? `PERFECT ${combo}` : bd < GRE ? `GREAT ${combo}` : `GOOD ${combo}`, 'ok'); buzz(8);
      $('#rScore').textContent = Math.round(score * 10);
    });
    const endT = (t0 - performance.now()) + s.notes.length * gap * 1000 + fall * 300 + 900;
    setTimeout(() => {
      const r = Math.min(1, score / max), gr = r >= .85 ? 'S' : r >= .65 ? 'A' : r >= .4 ? 'B' : 'C';
      el.innerHTML = `<div class="mend"><div class="mgrade g${gr}">${gr}</div><h3>${s.n} ${gr === 'S' ? '기립박수!' : gr === 'A' ? '큰 박수!' : gr === 'B' ? '무사히 끝!' : '긴장했나 봐요'}</h3><p>정확도 ${Math.round(r * 100)}% · 최고 콤보 ${best0}</p>
        <p class="sjnote">다음 곡까지: ${(CONTENT.SONGS.find(x => x.d > d) || {}).n ? `${CONTENT.SONGS.find(x => x.d > d).n} (난이도 ${CONTENT.SONGS.find(x => x.d > d).d} 필요, 지금 ${d})` : '최고 난이도 도달!'}</p><button class="bigbtn sm" id="rDone">좋아요!</button></div>`;
      Snd.sfx(gr === 'S' || gr === 'A' ? 'fanfare' : 'pop'); if (gr === 'S' && window.Grow) Grow.confetti();
      $('#rDone').onclick = () => { el.classList.remove('on'); log(`🎹 ${title} · ${s.n} ${gr}등급 (정확도 ${Math.round(r * 100)}%)`, r >= .65 ? 'good' : ''); done && done(r, gr); renderActions(); };
    }, endT);
  }

  /* ========================= ⑤ 세계여행 · 교통 ========================= */
  const CITY = [
    { n: '도쿄', e: '🗼', r: 'asia', l: 'ja' }, { n: '베이징', e: '🏯', r: 'asia', l: 'zh' }, { n: '방콕', e: '🛕', r: 'asia' }, { n: '서울', e: '🏙️', r: 'asia', l: 'ko' },
    { n: '런던', e: '💂', r: 'eu', l: 'en' }, { n: '파리', e: '🗼', r: 'eu', l: 'fr' }, { n: '베를린', e: '🧱', r: 'eu', l: 'de' }, { n: '로마', e: '🏛️', r: 'eu' }, { n: '바르셀로나', e: '⛪', r: 'eu', l: 'es' },
    { n: '뉴욕', e: '🗽', r: 'am', l: 'en' }, { n: '멕시코시티', e: '🌮', r: 'am', l: 'es' }, { n: '리우', e: '🏖️', r: 'am' },
    { n: '시드니', e: '🦘', r: 'oc', l: 'en' }, { n: '카이로', e: '🐫', r: 'af' }, { n: '케이프타운', e: '🦁', r: 'af' },
  ];
  const ROUTES = [
    { e: '🌏', n: '아시아 한 바퀴', c: ['도쿄', '베이징', '방콕'] }, { e: '🇪🇺', n: '유럽 배낭여행', c: ['런던', '파리', '바르셀로나', '로마'] },
    { e: '🌎', n: '아메리카 대륙', c: ['뉴욕', '멕시코시티', '리우'] }, { e: '🌍', n: '세계 일주', c: ['도쿄', '파리', '뉴욕', '시드니', '카이로'] },
  ];
  // 구간 운임 = 기준 운임 × 교통수단 배율 (선진국 기준 달러 → 출생국 물가 반영)
  const TR = {
    plane: { e: '✈️', n: '비행기', far: 1, near: 1, d: '빠름 · 비쌈' }, train: { e: '🚆', n: '기차', near: .55, d: '창밖 풍경 · 지능 +1' },
    ship: { e: '🚢', n: '배', far: .45, near: .4, d: '느림 · 쌈 · 낭만 (행복 +2)' }, bus: { e: '🚌', n: '버스', near: .3, d: '가장 쌈 · 피곤 (건강 −1)' },
  };
  const LEG = { far: 1400, near: 400 };
  function legCost(far, t) { return M(LEG[far ? 'far' : 'near'] * (TR[t][far ? 'far' : 'near'] || 1)); }
  function legOpts(a, b) {
    const far = !b || !a || a.r !== b.r;
    return Object.entries(TR).filter(([k, t]) => far ? t.far : t.near).map(([k, t]) => ({ k, far, cost: legCost(far, k), ...t }));
  }
  function startCity() { const nat = P.native; return CITY.find(c => c.l === nat && c.n === '서울') || { n: P.country.n, e: P.country.f, r: P.country.r === 'eu' ? 'eu' : ['m', 'la'].includes(P.country.r) ? 'am' : ['af', 'me'].includes(P.country.r) ? 'af' : 'asia' }; }
  function openTrip(evMode) {
    if (window.Hist && Hist.era('travelBan')) { log('😷 코로나19로 국경이 닫혀 해외여행을 갈 수 없다', 'bad'); return; }
    if (window.Hist && !Hist.era('travel')) { log(`🛂 ${P.birth.y + P.age}년엔 아직 해외여행이 자유롭지 않다 (한국은 1989년 전면 자유화)`, 'bad'); return; }
    showModal({
      e: '🎒', t: evMode ? '스무 살, 세계로!' : '세계여행 계획', d: `모은 돈 ${usd(P.money)} · 구간마다 비행기·기차·배를 골라요`, big: 1,
      ch: [...ROUTES.map(r => ({ t: `${r.e} ${r.n}`, s: r.c.join(' → '), f: () => planLegs(r.c.map(n => CITY.find(c => c.n === n))) })),
        { t: evMode ? '나중에 갈래' : '닫기', f: () => evMode && log('여행은 다음 기회에') }],
    });
  }
  function planLegs(cities) {
    const home = startCity(), path = [home, ...cities, home], legs = [];
    const step = i => {
      if (i >= path.length - 1) return confirmTrip(cities, legs);
      const a = path[i], b = path[i + 1], opts = legOpts(a, b);
      showModal({
        e: opts[0].far ? '🌐' : '🧭', t: `${a.e} ${a.n} → ${b.e} ${b.n}`, d: `${i + 1}/${path.length - 1} 구간 · 무엇을 타고 갈까?`, auto: 1,
        ch: opts.map(o => ({ t: `${o.e} ${o.n}`, s: `${usd(o.cost)} · ${o.d}`, f: () => { legs.push({ a, b, ...o }); step(i + 1); } })),
      });
    };
    step(0);
  }
  function confirmTrip(cities, legs) {
    const fare = legs.reduce((s, l) => s + l.cost, 0), stay = M(320) * cities.length, total = fare + stay;
    const can = P.money >= total;
    showModal({
      e: '🧾', t: '여행 경비', html: () => `<div class="tripsum">${legs.map(l => `<div><span>${l.e} ${l.a.n} → ${l.b.n}</span><b>${usd(l.cost)}</b></div>`).join('')}
        <div><span>🏨 숙박·식비 (${cities.length}개 도시)</span><b>${usd(stay)}</b></div><div class="tot"><span>합계</span><b>${usd(total)}</b></div>
        <p>${can ? `여행 뒤 남는 돈 ${usd(P.money - total)}` : `돈이 ${usd(total - P.money)} 부족해요`}</p></div>`,
      ch: [...(can ? [{ t: '🎒 떠나자! 세상을 배우러', f: () => goTrip(cities, legs, total) }] : [
        ...(window.Money && P.age >= 19 ? [{ t: '🏦 은행 대출로 떠나기', s: '나중에 이자와 함께 갚아야 해요', f: () => { if (Money.borrow(total - P.money + M(200))) goTrip(cities, legs, total); } }] : []),
        { t: '💼 알바해서 모을게', f: () => log('여행 자금을 모으기로 했다') }]), { t: '취소', f: () => { } }],
    });
  }
  function goTrip(cities, legs, total) {
    fx({ money: -total }); P.energy = Math.max(0, P.energy - 1); P.trips++; P.cities = P.cities || [];
    goTo('airport'); playAnim('travel');
    let gain = { hap: 0, look: 0, smart: 0, hp: 0 };
    legs.forEach(l => { if (l.k === 'ship') { gain.hap += 2; gain.hp += 1; } else if (l.k === 'train') gain.smart += 1; else if (l.k === 'bus') gain.hp -= 1; });
    cities.forEach((c, i) => {
      if (!P.cities.includes(c.n)) P.cities.push(c.n);
      gain.hap += 3; gain.look += 1; gain.smart += 1;
      if (c.l && c.l !== P.native) { P.lang[c.l] = Math.min(100, L(c.l) + R(2, 5)); }
      setTimeout(() => { floatText(`${c.e} ${c.n}`, 'var(--hap)'); }, 300 + i * 450);
    });
    fx(gain); log(`🎒 세계여행: ${legs.map(l => l.e).join('')} ${cities.map(c => c.e + c.n).join(' → ')} (${usd(total)})`, 'good');
    P.moments.push({ a: P.age, e: '🎒', t: '세계여행', c: cities.map(c => c.n).join('·'), r: `${cities.length}개 도시` });
    cutin('🌍', `${cities.length}개 도시 여행 완료!`, cities.map(c => c.e).join(' ')); Snd.sfx('fanfare');
    if (P.cities.length >= 5) badge('세계여행자'); if (P.cities.length >= 10) badge('지구 반 바퀴');
    checkBucket(); renderActions();
  }

  /* ===================== ⑥ 세계 대학 유학 · 해외 취업 ===================== */
  const UNIS = [
    { id: 'harvard', n: '하버드대', f: '🇺🇸', l: 'en', need: 72, cut: 78, fee: 58000, sub: ['kor', 'soc', 'eng'] },
    { id: 'mit', n: 'MIT', f: '🇺🇸', l: 'en', need: 70, cut: 78, fee: 58000, sub: ['math', 'sci', 'code'] },
    { id: 'stanford', n: '스탠퍼드대', f: '🇺🇸', l: 'en', need: 70, cut: 76, fee: 60000, sub: ['code', 'math', 'eng'] },
    { id: 'oxford', n: '옥스퍼드대', f: '🇬🇧', l: 'en', need: 70, cut: 75, fee: 45000, sub: ['kor', 'soc', 'eng'] },
    { id: 'eth', n: 'ETH 취리히', f: '🇨🇭', l: 'de', need: 55, cut: 70, fee: 2000, sub: ['math', 'sci'] },
    { id: 'sorbonne', n: '소르본대', f: '🇫🇷', l: 'fr', need: 55, cut: 62, fee: 3000, sub: ['kor', 'art', 'soc'] },
    { id: 'tokyo', n: '도쿄대', f: '🇯🇵', l: 'ja', need: 60, cut: 70, fee: 6000, sub: ['math', 'sci', 'soc'] },
    { id: 'tsinghua', n: '칭화대', f: '🇨🇳', l: 'zh', need: 60, cut: 70, fee: 5000, sub: ['math', 'sci', 'code'] },
    { id: 'snu', n: '서울대', f: '🇰🇷', l: 'ko', need: 60, cut: 69, fee: 6000, sub: ['kor', 'math', 'sci'] },
    { id: 'nus', n: '싱가포르국립대', f: '🇸🇬', l: 'en', need: 60, cut: 66, fee: 30000, sub: ['math', 'code', 'eng'] },
  ];
  const uniScore = u => Math.round(P.smart * .5 + u.sub.reduce((s, k) => s + (P.sub[k] || 0), 0) / u.sub.length * .5 + (P.hlv && P.hlv['피아노'] >= 8 ? 2 : 0));
  const GJOBS = [
    { id: 'g_google', n: '구글 (미국)', e: '🔎', pay: 190000, lad: 'dev', l: 'en', need: 70, ok: p => (p.major === 'cs' || p.sub.code >= 70) && p.smart >= 70, why: '컴퓨터공학 또는 코딩 70 · 지능 70' },
    { id: 'g_gs', n: '골드만삭스 (미국)', e: '🏦', pay: 210000, lad: 'corp', l: 'en', need: 75, ok: p => p.sub.math >= 70 && p.smart >= 72 && (p.fin || 0) >= 40, why: '수학 70 · 지능 72 · 금융 지식 40' },
    { id: 'g_un', n: '유엔 국제기구', e: '🇺🇳', pay: 120000, lad: 'corp', l: 'en', need: 80, ok: p => p.edu >= 3 && Object.values(p.lang || {}).filter(v => v >= 50).length >= 3, why: '대졸 · 3개 언어 중급 이상' },
    { id: 'g_samsung', n: '삼성전자 (한국)', e: '📱', pay: 95000, lad: 'corp', l: 'ko', need: 60, ok: p => p.edu >= 3 && p.smart >= 65 && ['ee', 'cs', 'sci'].includes(p.major), why: '이공계 대졸 · 지능 65' },
    { id: 'g_toyota', n: '토요타 (일본)', e: '🚗', pay: 80000, lad: 'corp', l: 'ja', need: 55, ok: p => p.edu >= 3 && p.smart >= 60, why: '대졸 · 지능 60' },
    { id: 'g_tencent', n: '텐센트 (중국)', e: '🐧', pay: 90000, lad: 'dev', l: 'zh', need: 60, ok: p => p.sub.code >= 60 && p.smart >= 62, why: '코딩 60 · 지능 62' },
    { id: 'g_lvmh', n: '루이비통 (프랑스)', e: '👜', pay: 75000, lad: 'corp', l: 'fr', need: 55, ok: p => p.look >= 65 && p.edu >= 3, why: '매력 65 · 대졸' },
    { id: 'g_sap', n: 'SAP (독일)', e: '💾', pay: 100000, lad: 'dev', l: 'de', need: 50, ok: p => ['cs', 'ee'].includes(p.major) || p.sub.code >= 65, why: '컴공·전자 전공 또는 코딩 65' },
    { id: 'g_orch', n: '빈 필하모닉 (오스트리아)', e: '🎻', pay: 90000, lad: 'artist', l: 'de', need: 40, ok: p => (p.hlv && p.hlv['피아노'] >= 9) || p.badges.has('피아노 콩쿠르 입상'), why: '피아노 Lv9 또는 콩쿠르 입상' },
  ];
  function registerJobs() {
    GJOBS.forEach(g => { if (!JOBS.find(j => j.id === g.id)) JOBS.push({ id: g.id, n: g.n, e: g.e, pay: g.pay, lad: g.lad, global: g.l, req: p => !!p.gHunt && L(g.l) >= g.need && g.ok(p) }); });
  }
  function openAbroad() {
    const canUni = P.age >= 17 && P.age <= 35 && P.edu >= 2 && !P.uniAbroad;
    showModal({
      e: '✈️', t: '공항', d: `언어: ${Object.entries(P.lang || {}).filter(([, v]) => v > 0).map(([k, v]) => (LANGS.find(x => x.k === k) || {}).e + v).join(' ') || '없음'}`,
      ch: [{ t: '🎒 세계여행 떠나기', s: '구간마다 교통수단을 골라요', f: () => openTrip() },
        ...(canUni ? [{ t: '🎓 해외 대학 유학', s: '하버드·옥스퍼드·도쿄대·칭화대…', f: () => openUni() }] : []),
        ...(P.age >= 21 && P.age <= 55 && !P.retired ? [{ t: '🌍 해외 일자리', s: '구글·유엔·토요타·텐센트…', f: () => openGJobs() }] : []),
        { t: '닫기', f: () => { } }],
    });
  }
  function openUni() {
    showModal({
      e: '🎓', t: '세계 유명 대학', d: `내 실력: 지능 ${P.smart} · 언어가 기준 이상이어야 지원할 수 있어요`, grid: 1, big: 1,
      ch: [...UNIS.map(u => {
        const sc = uniScore(u), lok = L(u.l) >= u.need, chance = !lok ? 0 : Math.max(8, Math.min(95, 50 + (sc - u.cut) * 5));
        return { t: `<span class="ge">${u.f}</span>${u.n}<small>${lok ? `합격 가능성 ${chance}%` : `${(LANGS.find(x => x.k === u.l) || {}).n} ${u.need} 필요 (지금 ${L(u.l)})`}</small>`, f: () => applyUni(u, sc, lok, chance) };
      }), { t: '다음에', f: () => { } }],
    });
  }
  function applyUni(u, sc, lok, chance) {
    if (!lok) { log(`${u.n}: 어학 점수가 부족해 지원하지 못했다`, 'bad'); return; }
    if (Math.random() * 100 > chance) { log(`${u.f} ${u.n} 불합격… 내년에 다시!`, 'bad'); fx({ hap: -5 }); playAnim('sad'); return; }
    const scholar = sc >= u.cut + 8, fee = scholar ? 0 : M(u.fee);
    cutin('🎉', `${u.n} 합격!`, scholar ? '전액 장학금!' : `연 학비 ${usd(fee)}`); Snd.sfx('fanfare'); playAnim('grad');
    showModal({
      e: u.f, t: `${u.n} 입학`, d: `${scholar ? '🎖️ 성적 우수 전액 장학생!' : `4년 학비 ${usd(fee * 4)}`} · 출국 교통편을 골라요`, big: 1,
      ch: legOpts(startCity(), { r: 'x' }).map(o => ({ t: `${o.e} ${o.n}로 출국`, s: usd(o.cost), f: () => {
        const total = fee * 4 + o.cost;
        if (P.money < total && !scholar) { const need = total - Math.max(0, P.money); if (!(window.Money && Money.borrow(need, '학자금 대출'))) { if (P.cls >= 3) log('부모님이 학비를 대 주셨다'); else { log('학비를 마련하지 못해 입학을 포기했다', 'bad'); return; } } }
        fx({ money: -Math.min(total, Math.max(P.money, 0) + (P.cls >= 3 ? total : 0)), smart: 8, look: 3, bond: -5, hap: 6 });
        P.edu = 3; P.uniAbroad = u.n; P.lang[u.l] = Math.min(100, L(u.l) + 18); P.abroad = true; goTo('univ');
        log(`🎓 ${u.f} ${u.n} 유학 (${o.e} ${o.n} 출국)${scholar ? ' · 장학생' : ''}`, 'good'); badge('해외 유학'); if (['harvard', 'mit', 'stanford', 'oxford'].includes(u.id)) badge('세계 명문대');
        P.moments.push({ a: P.age, e: '🎓', t: '해외 유학', c: u.n, r: scholar ? '장학생' : '' });
        if (!P.major && typeof chooseMajor === 'function') chooseMajor();
      } })),
    });
  }
  function openGJobs() {
    P.gHunt = true;
    const rows = GJOBS.map(g => { const lok = L(g.l) >= g.need, ok = lok && g.ok(P); return { g, lok, ok }; });
    showModal({
      e: '🌍', t: '해외 일자리', d: '조건을 채운 곳만 지원할 수 있어요 · 합격하면 그 나라로 이주해요', big: 1,
      ch: [...rows.map(({ g, lok, ok }) => ({ t: `${g.e} ${g.n}`, s: ok ? `연봉 약 ${usd(Math.round(g.pay * (P.uniAbroad ? 1.1 : 1)))} · 지원 가능` : `조건: ${(LANGS.find(x => x.k === g.l) || {}).n} ${g.need}${lok ? ' ✓' : ` (지금 ${L(g.l)})`} · ${g.why}`, f: () => {
        P.gHunt = false;
        if (!ok) { log(`${g.n}: 아직 조건이 부족하다`, 'bad'); return; }
        const p = (P.uniAbroad ? .75 : .55) + (P.smart - 70) / 100;
        if (Math.random() > p) { log(`${g.e} ${g.n} 최종 면접 탈락…`, 'bad'); fx({ hap: -4 }); playAnim('sad'); return; }
        const j = JOBS.find(x => x.id === g.id);
        P.job = j; P.jobYears = 0; P.rank = 0; P.rankYears = 0; P.perf = 50; P.abroad = true; P.mult = Math.max(P.mult, 1); P.jobPay = M(j.pay);
        const fly = legCost(true, 'plane'); fx({ money: -fly, hap: 10, bond: -6 });
        cutin(g.e, `${g.n} 입사!`, '세계 무대로'); Snd.sfx('fanfare'); playAnim('newjob'); goTo('office');
        log(`${g.e} ${g.n} 입사! ✈️ 이주 비용 ${usd(fly)}`, 'good'); badge('글로벌 인재');
        if (!P.firstJob) P.firstJob = { a: P.age, n: j.n }; P.moments.push({ a: P.age, e: g.e, t: '해외 취업', c: g.n, r: '세계 무대' });
      } })), { t: '닫기', f: () => { P.gHunt = false; } }],
    });
  }

  /* ============================ 연결 ============================ */
  function extra(list) {
    if (!P || !P.alive) return;
    const add = (o, front) => front ? list.unshift(o) : list.push(o);
    if (P.age >= 5) add({ e: '🗺️', n: '동네 지도', f: openMap, free: 1 }, true);
    if (P.age >= 6) add({ e: '🗣️', n: '어학', f: () => { goTo('lang'); openLang('lang'); }, free: 1 });
    if (P.age >= 5) add({ e: '🎹', n: '피아노', f: () => { goTo('piano'); openPiano(); }, free: 1 });
    if (P.age >= 16) add({ e: '✈️', n: '해외', f: () => { goTo('airport'); openAbroad(); }, free: 1 });
  }
  function openLibrary() {
    showModal({
      e: '📚', t: '도서관', d: `행동력 ${P.energy}`,
      ch: [{ t: '📖 교과 공부', f: () => openStudy() }, { t: '🗣️ 외국어 독학', s: '무료 · 효과 보통', f: () => openLang('library') },
        ...(P.age >= 12 ? [{ t: '💹 금융·경제 책 읽기', s: '금융 지식 ↑ (투자·대출에 도움)', f: () => window.Money && Money.study('library') }] : []), { t: '닫기', f: () => { } }],
    });
  }
  function yearly() {
    if (!P || !P.alive) return;
    yearlyGrowth();
    if (P.inSchool && P.age >= 9 && P.age <= 18 && P.native !== 'en' && P.lang) P.lang.en = Math.min(100, (P.lang.en || 0) + 3);   // 학교 영어 수업
    if (P.age === 20 && !P.seen.has('trip20')) { P.seen.add('trip20'); openTrip(true); }
    // 외국어를 잘하면 해외 대학 도전 기회
    const best = Object.entries(P.lang || {}).filter(([k]) => k !== P.native).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 55 && P.age >= 17 && P.age <= 19 && P.edu >= 2 && !P.uniAbroad && !P.seen.has('uniEv')) {
      P.seen.add('uniEv'); const ln = LANGS.find(x => x.k === best[0]);
      showModal({ e: '🌍', t: '해외 대학에 도전해 볼까?', d: `${ln.e} ${ln.n} ${best[1]}점 (${lv(best[1])}) — 세계 명문대의 문을 두드릴 수 있어요`, big: 1,
        ch: [{ t: '🎓 세계 대학에 지원한다 (대학 유학 도전)', f: () => openUni() }, { t: '국내에 남을래', f: () => log('국내에 남기로 했다') }] });
    }
    // 조건을 채우면 해외 헤드헌터 연락
    if (P.age >= 24 && P.age <= 40 && !(P.job && P.job.global) && (P.hhAge || 0) + 5 <= P.age) {
      P.gHunt = true; const fit = GJOBS.filter(g => L(g.l) >= g.need && g.ok(P)); P.gHunt = false;
      if (fit.length) { P.hhAge = P.age; const g = fit[0];
        showModal({ e: '📞', t: '해외 헤드헌터의 연락', d: `${g.e} ${g.n}에서 당신을 찾고 있어요`, big: 1,
          ch: [{ t: '💼 지원해 본다 (연봉·도전)', f: () => openGJobs() }, { t: '지금 자리에 남는다', f: () => log('지금 삶을 지키기로 했다') }] }); }
    }
  }
  /* 엔딩: 사주 vs 노력 · 어학 · 세계 · 금융 요약 */
  function endBox() {
    if (!P || !P.pot || $('#endWorld')) return;
    const over = KS.filter(k => P.over && P.over[k]), langs = Object.entries(P.lang || {}).filter(([k, v]) => v >= 20 && k !== P.native);
    const b = P.bank || { save: 0, loan: 0, credit: 650 };
    const html = `<div class="box" id="endWorld"><div class="jua sec">🔥 사주 vs 노력</div>
      ${KS.map(k => `<div class="grow-r"><span>${ICON[k]} ${LAB[k]}</span><i class="hbar potbar"><i style="width:${P[k]}%;background:${COL[k]}"></i><em class="pot" style="left:${P.pot[k]}%"></em></i><b class="${P[k] > P.pot[k] ? 'up' : ''}">${P[k] - P.pot[k] > 0 ? '+' : ''}${P[k] - P.pot[k]}</b></div>`).join('')}
      <p class="sjnote">흰 눈금 = 사주가 정한 기본치. ${over.length ? `<b>${over.map(k => LAB[k]).join('·')}</b>은(는) 노력으로 운명을 넘어섰어요.` : '노력으로 넘어선 능력은 없었어요.'}</p>
      <div class="jua sec" style="margin-top:10px">🌍 세계 · 🗣️ 언어 · 🎹 피아노</div>
      <div class="row"><span>다녀온 도시</span><b>${(P.cities || []).length}곳</b></div>
      ${P.uniAbroad ? `<div class="row"><span>유학</span><b>${P.uniAbroad}</b></div>` : ''}
      ${P.job && P.job.global || P.firstJob && GJOBS.some(g => g.n === P.firstJob.n) ? `<div class="row"><span>해외 근무</span><b>✓</b></div>` : ''}
      <div class="row"><span>외국어</span><b>${langs.length ? langs.map(([k, v]) => (LANGS.find(x => x.k === k) || {}).n + ' ' + lv(v)).join(', ') : '없음'}</b></div>
      <div class="row"><span>피아노</span><b>Lv${plv()}</b></div>
      <div class="jua sec" style="margin-top:10px">💰 금융 성적표</div>
      <div class="row"><span>금융 지식</span><b>${P.fin || 0}</b></div><div class="row"><span>신용점수</span><b>${b.credit} (${window.Money ? Money.grade(b.credit) : ''})</b></div>
      <div class="row"><span>부동산</span><b>${(P.props || []).length}채</b></div><div class="row"><span>최고 순자산</span><b>${usd(P.peak)}</b></div></div>`;
    const boxes = [...document.querySelectorAll('#end .box')], at = boxes.find(x => x.textContent.trim().startsWith('⭐')) || boxes[boxes.length - 1];
    if (at) at.insertAdjacentHTML('beforebegin', html);
  }
  function init() {
    registerJobs();
    const _show = show; show = function (id) { _show(id); if (id === 'end') setTimeout(endBox, 30); };
    const sb = document.createElement('div'); sb.id = 'placeBar'; $('#stageWrap').appendChild(sb);
    const _list = actionList; actionList = function () { const l = _list(); extra(l); return l; };
    const _do = doAct; doAct = function (a) { const k = placeOf(a.n); if (k) goTo(k); return _do(a); };
    const _age = ageUp; ageUp = function () { const a0 = P && P.age; _age(); if (P && P.age !== a0) yearly(); };
    $('#ageBtn').onclick = () => ageUp();
    const _beg = beginLife; beginLife = function () { _beg(); P.pot = potential(P); KS.forEach(k => P.pot[k] = Math.min(92, Math.max(P.pot[k], P[k] + 6))); initLang(); P.place = 'home'; P.bank = P.bank || { save: 0, loan: 0, credit: 650 }; goTo('home', 1); renderStats(); };
    const _fx = fx; fx = function (o, q) {
      if (P && P.pot && o) { o = { ...o }; KS.forEach(k => { if (o[k] > 0 && P[k] >= P.pot[k]) o[k] = Math.max(1, Math.round(o[k] * .5)); }); }
      return _fx(o, q);
    };
    const _rs = renderStats; renderStats = function () {
      if (P) { if (!P.lang) initLang(); if (!P.pot) P.pot = potential(P); if (!P.bank) P.bank = { save: 0, loan: 0, credit: 650 }; }   // 예전 저장 파일 호환
      _rs(); paintPot();
    };
    // 유학·해외 취업·세계여행은 중요한 결정 → 자동 진행 중이면 멈춤
    if (window.Grow) { [['study', { '어학': 6, '피아노': 2, '해외': 2, '동네 지도': .5 }], ['art', { '피아노': 6, '어학': 1.5 }], ['money', { '어학': 2, '해외': 2 }], ['family', { '해외': .5 }], ['health', {}], ['balance', { '어학': 2, '피아노': 2 }]]
      .forEach(([k, o]) => { const p = Grow.POL.find(x => x.k === k); if (p) Object.assign(p.act, o); }); }
  }
  return { init, pianoXp, plv, goTo, openMap, openLang, lesson, vocab, diff, song, openPiano, openTrip, openUni, openGJobs, openAbroad, rhythm, potential, L, lv, LANGS, UNIS, GJOBS, CITY, legOpts, PL, ACT_PLACE };
})();
window.World = World;
World.init();
