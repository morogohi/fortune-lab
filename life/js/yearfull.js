/* =====================================================================
 *  yearfull.js — 목적별 상세 운세 (볼 때마다 카르마 · 결제한 날 다시보기 3회 무료 — views.js)
 *   예전: 상세 사주 리포트 한 덩어리(카르마 50·영구) → 지금: 서비스별로 나눠 열람 (예전 구매자는 모두 무료)
 *   무료: 신년운세·토정비결 간략 버전 (기존 화면)
 *   무료 화면 아래에 '무료 vs 상세'를 내 데이터 일부로 보여 주고, 카르마로 열면 기간 제한 없이 열람
 *   구성: 한눈에 보는 한 해 · 나의 사주 바탕 · 2027년이 나에게 오는 방식 · 분야별 상세 6개
 *        · 토정비결 전체 · 12개월 상세(좋은 날 포함) · 분기 전략 · 개운 가이드 · 주의할 점
 * ===================================================================== */
const YearFull = (() => {
  const Y = 2027, PASS = 'p8b_yf_pass';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 받침에 맞는 조사 (을/를, 이/가, 은/는, 와/과)
  const jo = (w, a, b) => { const t = String(w).replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
  const cl = (v, a = 35, b = 96) => Math.max(a, Math.min(b, Math.round(v)));
  const keyOf = p => `${p.date}|${p.cal}|${p.time || ''}|${p.sex}`;

  /* ---------- 열람 권한 ---------- */
  const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
  function passOf(p) { const o = store.get(PASS, null); return o && o.k === keyOf(p) && o.until > Date.now() ? o : null; }
  const owned = () => Store.has('report');
  const unlocked = p => owned() || !!passOf(p);
  function grantPass(p) { store.set(PASS, { k: keyOf(p), until: endOfToday() }); }
  // 광고 보고 열기: 앱은 보상형 광고, 광고가 없는 웹은 '광고 체험(5초)'으로 같은 흐름을 확인
  function watchAd(p, done) {
    if (Ads.native || (window.WebAds && WebAds.on)) {
      if (!Ads.canReward()) { Hub.toast('지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해 주세요'); return; }
      Ads.showReward(got => { if (got) { grantPass(p); Snd.sfx('fanfare'); done && done(); } else Hub.toast('광고를 끝까지 보면 열려요'); });
      return;
    }
    let n = 5;
    openOverlay('📺 광고 체험 (웹)', `<div class="yf-ad"><div class="yf-adbox">광고 자리<small>앱에서는 여기에 실제 광고가 나와요</small></div><p id="yfAdN">${n}초 뒤 열려요</p></div>`, []);
    const iv = setInterval(() => {
      n--; const e = document.getElementById('yfAdN'); if (e) e.textContent = n > 0 ? `${n}초 뒤 열려요` : '열렸어요!';
      if (n <= 0) { clearInterval(iv); grantPass(p); Snd.sfx('fanfare'); setTimeout(() => { closeOverlay(); done && done(); }, 400); }
    }, 1000);
  }

  /* ---------- 데이터표 ---------- */
  const WOL_ALT = [
    ['동료·경쟁자와 엮이는 일이 다시 늘어요. 협력하되 몫은 분명히.', '내 방식대로 밀어붙이고 싶은 달이에요. 한 번 더 의견을 들으세요.'],
    ['표현할 기회가 다시 와요. 미뤄 둔 아이디어를 꺼내세요.', '말과 글이 힘을 얻는 달. 다만 약속은 지킬 만큼만.'],
    ['돈의 흐름이 다시 움직여요. 들어온 만큼 일부를 먼저 떼어 두세요.', '거래·정산이 많은 달. 숫자를 한 번 더 확인하세요.'],
    ['책임이 한 번 더 무거워지는 달. 우선순위를 세 개로 줄이세요.', '평가와 시선이 모이는 달. 기본을 지키면 인정받아요.'],
    ['배움과 도움이 다시 들어와요. 조언을 기록해 두세요.', '문서·자격 관련 일이 이어지는 달. 마감을 먼저 챙기세요.'],
  ];
  const TEN_G = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  const GN = ['독립·경쟁', '재능·표현', '재물', '직장·명예', '학업·귀인'];
  // 운 그룹별 분야 가감: 직업·재물·연애·건강·가정·학업
  const AMOD = [[4, -6, -2, 4, -2, 0], [6, 4, 6, -2, 2, 2], [4, 10, 3, -2, 0, -4], [10, 2, 3, -4, 0, 2], [2, -4, 0, 4, 6, 10]];
  const AREAS = [['💼', '직업'], ['💰', '재물'], ['💕', '연애·결혼'], ['🩺', '건강'], ['🏠', '가정·관계'], ['📚', '학업·자기계발']];
  const FAM = [
    '형제·친구·동료와 얽히는 일이 많은 해예요. 함께하면 힘이 되지만 돈거래는 선을 분명히 하세요. 내 몫과 남의 몫을 구분할수록 관계가 편해져요.',
    '자녀·후배·아랫사람과의 관계가 활발해요. 챙겨 주는 만큼 기쁨이 돌아오지만, 잔소리가 길어지면 오히려 멀어질 수 있어요. 칭찬을 먼저 건네 보세요.',
    '집안 살림과 경제적 책임이 커지는 해예요. 가족과 돈 이야기를 미루지 말고 함께 계획을 세우면 갈등이 줄어요.',
    '윗사람·조직·배우자와의 약속과 책임이 무거워지는 해예요. 체면보다 솔직한 대화가 관계를 지켜 줘요.',
    '부모님·스승·어른의 도움과 조언이 들어오는 해예요. 안부를 자주 전하고 배운 것을 나누면 귀인이 이어져요.',
  ];
  const STUDY = [
    '경쟁이 붙어야 실력이 느는 해예요. 스터디·대회·시험처럼 마감과 상대가 있는 목표가 효과적이에요.',
    '배운 것을 바로 만들어 보는 해예요. 글·영상·포트폴리오로 결과물을 남기면 실력과 평판이 함께 올라요.',
    '돈이 되는 공부가 잘 맞아요. 재테크·실무 자격증처럼 바로 쓰이는 지식에 집중하세요.',
    '자격과 직함으로 이어지는 공부에 운이 있어요. 승진 시험·공인 자격에 도전하기 좋아요.',
    '문서·학업·귀인운이 가장 강한 해예요. 학위·자격증·긴 공부를 시작하기에 더없이 좋아요.',
  ];
  // [좋을 때 2개, 조심할 때 2개] — 같은 기운의 달이 여러 번 와도 문장이 겹치지 않게 돌아가며 사용
  const TIPG = [
    ['내 이름을 걸고 할 수 있는 작은 프로젝트를 하나 시작하세요.', '돈을 빌려주거나 보증을 서는 일은 피하세요.', '경쟁 상대를 의식하기보다 내 기록을 넘는 데 집중하세요.', '동업·공동 구매처럼 몫을 나누는 일은 조건을 글로 남기세요.'],
    ['아이디어를 메모하고 이달 안에 한 가지는 실제로 만들어 보세요.', '말이 앞서면 구설이 생기니 약속은 줄이고 결과로 보여 주세요.', '발표·글·영상처럼 나를 드러내는 기회를 잡으세요.', '감정이 앞서는 메시지는 하루 묵혔다 보내세요.'],
    ['수입·지출 표를 만들어 이달 숫자를 점검하세요.', '큰 투자는 나눠서 하고, 한 곳에 몰지 마세요.', '미뤄 둔 정산·청구를 이달에 처리하면 돈이 돌아요.', '충동구매를 막도록 장바구니에 하루 담아 두세요.'],
    ['맡은 일의 성과를 숫자로 정리해 두세요. 평가 시기에 힘이 돼요.', '무리한 책임을 혼자 떠안지 말고 도움을 요청하세요.', '윗사람에게 진행 상황을 먼저 보고하면 신뢰가 쌓여요.', '규정·마감을 다시 확인하세요. 작은 실수가 크게 보이는 달이에요.'],
    ['배우고 싶던 것을 하나 등록하세요. 이달 시작한 공부가 오래 남아요.', '생각만 길어지지 않게 시작 날짜를 먼저 정하세요.', '조언해 줄 선배·스승에게 연락해 보세요.', '서류·계약서는 서명 전에 한 번 더 읽으세요.'],
  ];
  // 부족한 오행 → 개운 (색·숫자·방향·음식·몸)
  const LUCK = [
    { c: '초록·청록', n: '3·8', d: '동쪽', f: '신맛·푸른 채소', b: '간·눈·근육' },
    { c: '빨강·주황', n: '2·7', d: '남쪽', f: '쓴맛·붉은 과일', b: '심장·혈액순환' },
    { c: '노랑·베이지', n: '5·10', d: '집 중앙·가까운 곳', f: '단맛·잡곡', b: '위장·소화' },
    { c: '흰색·은색', n: '4·9', d: '서쪽', f: '매운맛·흰 음식', b: '폐·호흡기·피부' },
    { c: '검정·남색', n: '1·6', d: '북쪽', f: '짠맛·검은콩·해조류', b: '신장·방광·수면' },
  ];
  const EKN = ['목', '화', '토', '금', '수'];

  /* ---------- 계산 ---------- */
  function build(p, a) {
    const n = Fortune.newYear(a, Y), age = Y - +p.date.slice(0, 4), luck = Saju.luckAt(a, age);
    const t = window.Tojeong ? Tojeong.calc(p, Y) : null;
    const gA = n.ts.g, gB = n.tb.g, avg = n.months.reduce((s, m) => s + m.v, 0) / 12;
    const relV = (n.yrel ? n.yrel.v : 0) + (n.drel ? n.drel.v * .6 : 0);
    const area = AREAS.map((x, i) => cl(avg + (AMOD[gA][i] * .6 + AMOD[gB][i] * .4) + relV * .8 + (luck && (luck.g === gA || luck.g === gB) ? 3 : 0)));
    const total = cl(avg + relV);
    const kw = [GN[gA], GN[gB], luck ? luck.name : ''].filter((v, i, s) => v && s.indexOf(v) === i);
    return { n, age, luck, t, gA, gB, area, total, kw };
  }
  // 그 달(양력)에서 오늘의 운세 점수가 가장 높은 날 2개
  function goodDays(a, p, m) {
    const y = m.yr, mo = m.solarM, dim = new Date(y, mo, 0).getDate(), out = [];
    for (let d = 1; d <= dim; d++) { try { const f = Fortune.today(a, keyOf(p), new Date(y, mo - 1, d, 12)); out.push([d, f.sc[0]]); } catch (e) { } }
    return out.sort((x, y2) => y2[1] - x[1]).slice(0, 2).map(x => x[0]).sort((x, y2) => x - y2);
  }

  /* ---------- 관계·궁합 · MBTI · 인생 게임 (보강) ---------- */
  const RELN = { love: ['💕', '연인'], family: ['🏠', '가족'], friend: ['🤝', '친구'], work: ['💼', '동료'] };
  const WITH = ['함께 새 일을 벌이기', '함께 배우고 만들기', '돈 계획·살림 함께 세우기', '역할을 나눠 목표 이루기', '함께 공부하고 조언 주고받기'];
  function relHTML(p, a, B) {
    const ppl = store.get('p8b_people', []).map(q => ({ q, b: Hub.analyze(q) })).filter(x => x.b).slice(0, 4);
    if (!ppl.length) return `<div class="hcard"><h3 class="ht">💞 2027 관계 · 궁합</h3><p class="sjtxt" style="margin:0">궁합 메뉴에 가족·연인·친구·동료를 등록하면, 여기에서 그 사람과의 2027년 흐름을 함께 풀어 드려요.</p></div>`;
    const myBest = B.n.best.map(m => m.solarM);
    return `<div class="hcard"><h3 class="ht">💞 2027 관계 · 궁합</h3><p class="sjnote">궁합 관계도에 등록한 사람과 올해를 함께 보낼 때의 흐름이에요.</p>
      ${ppl.map(({ q, b }) => {
        const c = Saju.compatPair(a, b), nb = Fortune.newYear(b, Y), r = RELN[q.rel] || RELN.love;
        const both = nb.best.map(m => m.solarM).filter(m => myBest.includes(m));
        const same = nb.ts.g === B.gA;
        return `<div class="yf-rel"><div class="yf-relh"><b>${r[0]} ${esc(q.name)}</b><span>${r[1]} · 궁합 ${c ? c.score : '-'}점</span></div>
          <p>${esc(q.name)}님의 2027년은 <b>${GN[nb.ts.g]}</b>의 해예요. ${same ? '나와 같은 방향의 해라 서로의 상황을 잘 이해해요.' : `나는 ${GN[B.gA]}, 상대는 ${GN[nb.ts.g]} — 서로 다른 쪽에 힘을 쓰는 해라 역할을 나누면 좋아요.`}</p>
          <p>🤝 올해 함께하면 좋은 일: <b>${WITH[nb.ts.g]}</b>${both.length ? ` · 둘 다 좋은 달: <b>${both.map(m => m + '월').join(', ')}</b>` : ''}</p>
          ${c && c.notes ? `<small>${c.notes.slice(0, 2).join(' · ')}</small>` : ''}</div>`;
      }).join('')}</div>`;
  }
  const MB_Y = { E: '사람을 만나는 자리에서 기회가 와요. 모임·발표를 올해의 무대로 쓰세요.', I: '혼자 깊이 파고드는 시간이 성과를 만들어요. 일정에 집중 시간을 먼저 넣으세요.',
    S: '구체적인 계획과 숫자로 움직일 때 운이 붙어요. 월별 목표를 작게 쪼개세요.', N: '새 아이디어가 올해의 자산이에요. 떠오른 생각을 기록하고 한 가지는 실행해 보세요.',
    T: '판단은 빠르지만 사람의 마음을 놓치기 쉬워요. 결정 전에 한 번 더 상대 입장을 물어보세요.', F: '사람을 챙기는 힘이 귀인을 부르지만, 거절해야 할 땐 분명히 하세요.',
    J: '계획대로 밀고 갈 때 강해요. 다만 변수가 생기면 계획을 고치는 것도 실력이에요.', P: '유연함이 기회를 잡지만 마감이 흐려지기 쉬워요. 중요한 일은 날짜부터 정하세요.' };
  function mbtiHTML(a, B) {
    const test = store.get('p8b_mbti_test', null), set = window.MbtiTest ? MbtiTest.settled(test) : null, sm = Fun.mbti(a);
    const type = set || sm.type, info = Fun.MBTI[type] || ['', ''];
    return `<div class="hcard"><h3 class="ht">🧩 MBTI로 본 2027 전략 · ${type}</h3><div class="sjtxt">
      <p><b>${info[0]}</b> ${info[1]}</p>
      <p>올해는 <b>${GN[B.gA]}</b>의 해 — ${type}에게는 이렇게 쓰면 좋아요.</p>
      ${(() => { const T = type, act = ['내 이름을 건 작은 프로젝트', '글·영상·발표 같은 결과물', '수입 구조 정비와 저축 계획', '성과 정리와 승진·평가 준비', '자격증·학위 같은 긴 공부'][B.gA];
        const how = T[0] === 'E' ? '사람들과 함께하는 방식(스터디·모임·협업)' : '혼자 집중하는 방식(정해진 시간의 루틴·온라인 강의)';
        const pace = T[3] === 'J' ? '월별 계획표를 만들어' : '2주 단위로 짧게 시험해 보며';
        const bm = B.n.best.map(m => `${m.solarM}월`).join('·');
        return `<div class="yf-mb"><b>📌 ${T}의 2027 실천 시나리오</b><p>올해는 <b>${act}</b>에 운이 실려요. ${T}에게는 ${how}이 잘 맞으니, ${pace} 진행하세요. 시작하기 좋은 달은 <b>${bm}</b>이에요.</p>
          <p>${T[2] === 'T' ? '⚠️ 숫자와 효율만 보다 동료의 마음을 놓치기 쉬워요. 중요한 결정 전에 한 사람에게 의견을 물어보세요.' : '⚠️ 사람을 챙기다 내 일이 밀리기 쉬워요. 거절할 일은 이번 주 안에 분명히 말하세요.'} ${T[1] === 'N' ? '아이디어가 많아도 올해는 한 가지를 끝까지 해 보는 것이 성과로 남아요.' : '익숙한 방식이 안전하지만, 올해 한 가지는 새 방법을 시도해 보세요.'}</p></div>`; })()}
      ${[...type].map(c => `<p>· <b>${c}</b> ${MB_Y[c] || ''}</p>`).join('')}
      <p class="sjnote">기준: ${set ? 'MBTI 성향 검사 결과' : test ? '성향 검사 결과가 뚜렷하지 않아 사주로 본 MBTI' : '사주로 본 MBTI (성향 검사를 하면 더 정확해요)'}${set && set !== sm.type ? ` · 사주로 본 MBTI는 ${sm.type}` : ''}</p></div></div>`;
  }
  function gameHTML(B) {
    const h = store.get('p8b_hist', []);
    if (!h.length) return `<div class="hcard"><h3 class="ht">🎲 인생 게임으로 미리 보는 선택</h3><p class="sjtxt" style="margin:0">인생 게임에서 갈림길마다 두 갈래 인생을 미리 살아 볼 수 있어요. 한 판 끝까지 살면 카르마도 모여요.</p></div>`;
    const GV = { S: 5, A: 4, B: 3, C: 2, D: 1 }, best = h.reduce((m, x) => (GV[x.grade] || 0) > (GV[m.grade] || 0) ? x : m, h[0]);
    return `<div class="hcard"><h3 class="ht">🎲 인생 게임 속 나</h3><div class="sjtxt">
      <p>지금까지 <b>${h.length}번</b>의 인생을 살아 봤어요. 가장 좋았던 인생은 ${best.f} ${esc(best.name)} — 「${esc(best.title)}」(${best.grade}등급).</p>
      <p>올해의 중심 기운 <b>${jo(GN[B.gA], '을', '를')}</b> 게임 속 육성 방침으로 시험해 보고, 갈림길 극장에서 선택의 결과를 비교해 보세요.</p></div></div>`;
  }

  /* ---------- 화면 ---------- */
  function parts(p, a) {
    const B = build(p, a), n = B.n, dm = a.dm, L = LUCK[a.weak];
    const mm = m => `${m.yr !== Y ? '이듬해 ' : ''}${m.solarM}월`;
    const bar = (lab, v) => `<div class="yf-ar"><span>${lab}</span><div class="yf-b"><i style="width:${v}%"></i></div><b>${v}</b></div>`;
    const S6 = n.sx, S7 = n.sb;
    const areaTxt = [
      `${S6.직업} 하반기에는 ${S7.직업.replace(/^./, c => c)} ${TIPG[B.gA][0]}`,
      `${S6.재물} ${S7.재물} 타고난 재물 성향으로 보면 — ${dm.재물}`,
      `${S6.연애} 하반기 흐름: ${S7.연애} ${dm.연애}`,
      `${S6.건강} ${dm.건강} 올해는 특히 부족한 ${EKN[a.weak]} 기운과 관련된 ${L.b} 관리가 중요해요.`,
      `${FAM[B.gA]} ${n.yrel ? `내 띠와 2027 양띠는 「${n.yrel.n}」 관계 — ${n.yrel.d.replace('날', '해')}` : ''}`,
      `${STUDY[B.gA]} ${B.gB !== B.gA ? '하반기에는 ' + STUDY[B.gB].replace(/해예요/, '시기예요') : ''}`,
    ];
    const QI = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]];
    const QACT = [['내 이름을 건 일을 시작', '경쟁 속에서 내 몫 지키기', '독립 준비를 차근차근'], ['결과물을 만들어 알리기', '아이디어를 작게 시험', '말보다 결과로 보여 주기'],
      ['수입 구조를 넓히기', '지출을 점검하고 새는 돈 막기', '계약·정산 마무리'], ['성과를 정리해 평가 준비', '맡은 책임을 정리', '윗사람과 방향 맞추기'], ['배움·자격 시작', '조언자 찾기', '문서·계약 꼼꼼히']];
    const qOcc = {};
    const qs = QI.map((ix, qi) => {
      const v = Math.round(ix.reduce((s2, i) => s2 + n.months[i].v, 0) / 3), cnt = [0, 0, 0, 0, 0];
      ix.forEach(i => { const g = TEN_G[n.months[i].ten]; if (g != null) cnt[g]++; });
      const g = cnt.indexOf(Math.max(...cnt)), best = ix.map(i => n.months[i]).sort((x, y) => y.v - x.v)[0];
      const mode = v >= 72 ? 0 : v >= 62 ? 1 : 2;
      return { v, g, txt: `<b>${GN[g]}</b> 흐름 · ${['밀고 나갈 때', '다지는 때', '쉬어 가는 때'][mode]} — 핵심 과제: ${(() => { const o = qOcc[g] = (qOcc[g] || 0) + 1; return QACT[g][(mode + o - 1) % 3]; })()}. 이 분기의 가장 좋은 달은 <b>${mm(best)}</b>(${best.v}점)이에요.` };
    });
    const occ = {}, seenT = {};
    const months = n.months.map(m => {
      const g = TEN_G[m.ten] != null ? TEN_G[m.ten] : 0, tj = B.t ? B.t.months[m.n] : null, gd = goodDays(a, p, m);
      const good = m.v >= 66, oc = occ[g + (good ? 'g' : 'b')] = (occ[g + (good ? 'g' : 'b')] || 0) + 1, tip = TIPG[g][(good ? 0 : 1) + ((oc - 1) % 2) * 2];
      return `<div class="yf-m ${m.v >= 74 ? 'hi' : m.v < 58 ? 'lo' : ''}"><div class="yf-mh"><b>${mm(m)}</b><span>${SAJU.STK[m.s]}${SAJU.BRK[m.b]}월 · ${m.ten}</span><em>${m.v}</em></div>
        <p>${(() => { const k = m.txt, c = seenT[k] = (seenT[k] || 0) + 1; return c === 1 ? k : WOL_ALT[g][(c - 2) % 2]; })()}${m.rel ? ` <small>(${m.rel.n})</small>` : ''}</p>
        <p class="yf-mf">🎯 이달의 초점: <b>${GN[g]}</b> — ${tip}</p>
        ${tj ? `<p class="yf-mt">📜 토정 신수 · 음력 ${m.n + 1}월 (${tj.s || ['기운 좋음', '보통', '조심'][tj.q]}): ${tj.a}. 실천 — ${tj.b}.</p>` : ''}
        ${gd.length ? `<p class="yf-md">📌 좋은 날: ${gd.map(d => `${m.solarM}/${d}`).join(', ')}</p>` : ''}</div>`;
    }).join('');
    const cautions = [
      `${mm(n.worst)}은 한 해 중 기운이 가장 약한 달이에요. 큰 계약·이사·투자는 피하고 점검과 휴식에 쓰세요.`,
      `분야 중 ${AREAS[B.area.indexOf(Math.min(...B.area))][1]} 점수가 가장 낮아요(${Math.min(...B.area)}). ${TIPG[B.gA][1]}`,
      n.drel && n.drel.v < 0 ? `일지와 올해 지지가 「${n.drel.n}」 관계라 생활 리듬·거처의 변화가 생기기 쉬워요. 일정에 여유를 두세요.` : `부족한 ${EKN[a.weak]} 기운을 채우지 않으면 하반기에 피로가 쌓이기 쉬워요. ${jo(L.b, '을', '를')} 챙기세요.`,
    ];
    return {
      B,
      head: `<div class="hhead"><small>${esc(p.name)}님 · ${n.gzHan}년 · 만 ${B.age - 1}~${B.age}세</small><h2>2027 상세 운세</h2></div>`,
      base: `<div class="hcard"><h3 class="ht">🧭 나의 사주 바탕</h3><div class="sjtxt">
        <p><b>${dm.nm}</b> — ${dm.key}</p><p>${dm.성격}</p>
        <p>오행: ${a.el.map((v, i) => `${['🌳', '🔥', '⛰️', '⚔️', '💧'][i]}${EKN[i]} ${v}`).join(' · ')} → 가장 강한 기운 <b>${EKN[a.strong]}</b>, 부족한 기운 <b>${EKN[a.weak]}</b></p>
        <p>✨ 강점: ${dm.강점}</p><p>⚠️ 약점: ${dm.약점}</p></div></div>`,
      y_total: `<div class="hcard"><h3 class="ht">📊 한눈에 보는 2027</h3>
        <div class="yf-top"><div class="yf-sc"><b>${B.total}</b><small>한 해 총점</small></div><div><div class="yf-kw">${B.kw.map(k => `<span>#${k}</span>`).join('')}</div><p>${S6.총운}</p></div></div>
        ${AREAS.map((x, i) => bar(`${x[0]} ${x[1]}`, B.area[i])).join('')}
        <p class="sjnote">좋은 달 <b>${n.best.map(mm).join(', ')}</b> · 조심할 달 <b>${mm(n.worst)}</b></p></div>
      <div class="hcard"><h3 class="ht">🔄 2027년이 나에게 오는 방식</h3><div class="sjtxt">
        <p>2027년 ${n.gzTxt}(${n.gzHan})년은 상반기에 <b>${n.ts.n}</b>, 하반기에 <b>${n.tb.n}</b>의 기운으로 들어와요.</p>
        <p>🌱 상반기 — ${S6.총운}</p><p>🍂 하반기 — ${S7.총운}</p>
        ${B.luck ? `<p>🔮 지금은 <b>${B.luck.name}</b> 대운(${B.luck.start}살~)이에요. ${B.luck.g === B.gA || B.luck.g === B.gB ? '올해 세운과 대운이 같은 방향이라 그 기운이 <b>크게</b> 작용해요. 기회도 변화도 평소보다 커요.' : '대운과 세운의 방향이 달라, 큰 흐름은 대운이 잡고 올해는 그 안에서 ' + GN[B.gA] + ' 쪽 일이 두드러져요.'}</p>` : ''}
        ${n.yrel ? `<p>🐑 띠 관계: 내 띠 ↔ 2027 양띠 「${n.yrel.n}」 — ${n.yrel.d.replace('날', '해')}</p>` : ''}
        ${n.drel ? `<p>🏠 일지 관계: 「${n.drel.n}」 — ${n.drel.d.replace('날', '해')}</p>` : ''}</div></div>
      <div class="hcard"><h3 class="ht">⚠️ 2027 주의할 점</h3><div class="sjtxt">${cautions.map(c => `<p>· ${c}</p>`).join('')}</div></div>
      <div class="hcard"><p class="sjtxt" style="margin:0">💌 ${esc(p.name)}님, 2027년은 <b>${B.kw[0]}</b>의 기운이 중심이 되는 해예요. 좋은 달에 움직이고 조심할 달에 쉬어 가며, 부족한 기운을 채워 가면 한 해를 내 편으로 만들 수 있어요.</p>
        <p class="sjnote">※ 전통 명리·토정비결 이론을 바탕으로 한 참고·재미용 풀이예요.</p></div>`,
      area: i => `<div class="hcard"><h3 class="ht">${AREAS[i][0]} 2027 ${AREAS[i][1]}운 <small class="yf-s">${B.area[i]}점</small></h3>${bar(`${AREAS[i][0]} ${AREAS[i][1]}`, B.area[i])}<div class="sjtxt"><p>${areaTxt[i]}</p></div><p class="sjnote">한 해 총점 ${B.total} · 여섯 분야 평균 ${Math.round(B.area.reduce((x, y) => x + y, 0) / 6)}</p></div>`,
      y_month: `<div class="hcard"><h3 class="ht">📅 12개월 상세</h3><p class="sjnote">명리의 달은 절기로 바뀌어요 (2월은 입춘부터 寅월). 토정 신수는 음력 달 기준이라, 寅월(양력 2월 무렵)에는 음력 1월 신수를 붙였어요. 좋은 날은 그달 일진 중 오늘의 운세 점수가 가장 높은 날이에요.</p>${months}</div>`,
      y_luck: `<div class="hcard"><h3 class="ht">🔮 10년 대운 흐름</h3><table class="dytbl"><tr><th>시기</th><th>대운</th><th>기운</th></tr>
        ${a.dy.slice(0, 8).map(d => { const L = Saju.luckAt(a, d.age); return `<tr class="${B.luck && B.luck.start === d.age ? 'on' : ''}"><td>${d.age}세~</td><td><b>${d.txt}</b></td><td>${Saju.GRPE[d.g]} ${Saju.GRPN[d.g]}<small style="display:block;color:var(--dim)">${L ? L.desc : ''}</small></td></tr>`; }).join('')}</table>
        <p class="sjnote">표시된 줄이 지금 지나고 있는 대운이에요. 대운은 10년마다 바뀌는 큰 흐름이고, 그 안에서 해마다 세운이 더해져요.</p></div>`,
      y_rel: relHTML(p, a, B),
      y_guide: `<div class="hcard"><h3 class="ht">🗓️ 분기 전략</h3>${qs.map((q, i) => `<div class="yf-q"><b>${['1분기 (2~4월)', '2분기 (5~7월)', '3분기 (8~10월)', '4분기 (11~1월)'][i]}</b><em>${q.v}</em><span>${q.txt}</span></div>`).join('')}</div>
      ${mbtiHTML(a, B)}
      <div class="hcard"><h3 class="ht">🍀 2027 개운 가이드</h3><div class="sjtxt">
        <p>부족한 <b>${EKN[a.weak]}</b> 기운을 채우면 한 해가 고르게 흘러요.</p>
        <ul class="yf-ul"><li>🎨 행운의 색: ${L.c}</li><li>🔢 행운의 숫자: ${L.n}</li><li>🧭 좋은 방향: ${L.d}</li><li>🍽️ 도움 되는 음식: ${L.f}</li><li>🩺 챙길 몸: ${L.b}</li><li>🌱 개운 습관: ${dm.개운}</li></ul></div></div>
      ${gameHTML(B)}`,
      tojeong: B.t ? `<div class="hcard"><h3 class="ht">📜 2027 토정비결 전체</h3>${Tojeong.fullHTML(B.t)}</div>` : '',
    };
  }
  /* ---------- 목적별 상세: 메뉴 · 열람 ---------- */
  const SVC = ['y_total', 'y_work', 'y_money', 'y_love', 'y_health', 'y_family', 'y_study', 'y_month', 'y_luck', 'y_guide', 'y_rel', 'tojeong', 'compat'];
  let vk = null;            // 지금 여는 서비스
  function sectionOf(k, P) { const it = Views.item(k); return it && it.area != null ? P.area(it.area) : P[k] || ''; }
  // 서비스 열기 (메뉴·다른 화면 공통): 결제/무료 다시보기 → 열람 화면
  function openView(k, p) {
    p = p || Hub.me(); if (!p || !Hub.analyze(p)) { Hub.go('yearfull'); return; }
    if (k === 'compat') { Hub.go('compat'); Hub.toast('궁합 탭에서 상대를 골라 「상세 풀이 보기」를 누르세요'); return; }
    const it = Views.item(k);
    Views.open(k, Views.subj(p), `${it.e} ${it.n} · ${p.name}`, () => { vk = k; Hub.go('yfview'); });
  }
  function menuHTML(p, a) {
    if (!a) return '<div class="hcard"><p class="hsub">생년월일을 먼저 입력해 주세요.</p></div>';
    const s = Views.subj(p), groups = {};
    SVC.forEach(k => { const it = Views.item(k); if (it) (groups[it.g] = groups[it.g] || []).push(k); });
    const legacy = Store.ownedReal('report');
    return `<div class="hhead"><small>${esc(p.name)}님 · 2027</small><h2>목적별 상세 운세</h2></div>
      ${Views.receiptHTML()}
      <div class="hcard vintro"><p class="sjtxt" style="margin:0">궁금한 것만 골라 보세요. <b>볼 때 카르마</b>를 쓰고, 결제한 날은 자정까지 같은 풀이를 <b>${Views.FREE()}번 더 무료</b>로 다시 볼 수 있어요.${legacy ? '<br>📜 예전에 상세 사주 리포트를 열어서 <b>모두 무료</b>예요.' : ''}</p>
        <div class="kbal sm"><span>보유 카르마</span><b>✨ ${Karma.bal()}</b><small>오늘 사용 −${Karma.today().spend}</small></div></div>
      <button class="vfree" id="vSaju"><span>📜</span><div><b>사주풀이 <em class="vch free">무료</em></b><small>타고난 성격·강점·약점·연애·재물·건강 성향·개운법</small></div><i>›</i></button>
      ${Object.keys(groups).map(g => `<h4 class="kh">${g}</h4>` + groups[g].map(k => { const it = Views.item(k);
        return `<button class="vsvc" data-yv="${k}"><span>${it.e}</span><div><b>${it.n}</b><small>${it.d}</small></div>${k === 'compat' ? '<em class="vch">✨ ' + it.k + ' · 상대마다</em>' : Views.chip(k, s)}</button>`; }).join('')).join('')}
      <p class="sjnote">※ 대상(생년월일)이 바뀌면 따로 결제해요. 다시보기 무료 횟수는 서비스·대상별로 세요. 전통 명리·토정비결 이론을 바탕으로 한 참고·재미용 풀이예요.</p>`;
  }
  function viewHTML(p, a) {
    if (!a || !vk || !Views.viewing(vk, Views.subj(p))) return menuHTML(p, a);
    const it = Views.item(vk), P = parts(p, a), st = Views.status(vk, Views.subj(p));
    try { Karma.metric('view_' + vk); } catch (e) { }
    const left = st.legacy ? '예전 리포트 보유 · 무료' : st.freeLeft > 0 ? `오늘 무료 다시보기 ${st.freeLeft}회 남음` : '오늘 무료 다시보기를 다 썼어요';
    return `<div class="hhead"><small>${esc(p.name)}님 · 2027</small><h2>${it.e} ${it.n}</h2></div>
      <div class="vbar"><span>${left}</span><b>✨ ${Karma.bal()}</b></div>
      ${sectionOf(vk, P) || '<div class="hcard"><p class="hsub">이 풀이를 만들 수 없어요. 생년월일을 확인해 주세요.</p></div>'}
      <button class="bigbtn wide" id="vBack">← 목록으로 · 사용 내역 보기</button>`;
  }
  // 신년운세·토정비결·내 사주 화면 아래 붙는 작은 카드
  function ctaHTML(p) {
    const s = Views.subj(p), pick = ['y_total', 'y_money', 'y_love', 'y_month'];
    return `<div class="hcard yf-cta"><b>🔎 목적별 상세 보기</b><small>궁금한 것만 골라 보세요 · 1회 ✨5~10 · 결제한 날 다시보기 ${Views.FREE()}회 무료</small>
      <div class="vmini">${pick.map(k => { const it = Views.item(k); return `<button data-yv="${k}"><span>${it.e}</span><b>${it.n}</b>${Views.chip(k, s)}</button>`; }).join('')}</div>
      <button class="ghost wide" id="yfGo">전체 상세 메뉴 보기 ›</button></div>`;
  }
  function bind(p, a) {
    const root = document.getElementById('hubBody');
    root.querySelectorAll('[data-yv]').forEach(b => b.onclick = () => openView(b.dataset.yv, p));
    const g = document.getElementById('yfGo'); if (g) g.onclick = () => Hub.go('yearfull');
    const sj = document.getElementById('vSaju'); if (sj) sj.onclick = () => Hub.go('saju');
    const vb = document.getElementById('vBack'); if (vb) vb.onclick = () => { Views.leave(); Hub.go('yearfull'); };
    Views.bindReceipt(() => Hub.render());
  }
  function init() {
    Hub.register({ page: 'yearfull', title: '목적별 상세 운세', html: (p, a) => menuHTML(p, a), bind: (p, a) => bind(p, a) });
    Hub.register({ page: 'yfview', title: '상세 보기', html: (p, a) => viewHTML(p, a), bind: (p, a) => bind(p, a) });
    Store.onChange(() => { if (document.getElementById('hub').classList.contains('on')) try { Hub.render(); } catch (e) { } });
  }
  init();
  return { unlocked, ctaHTML, bind, build, parts, openView, menuHTML };
})();
