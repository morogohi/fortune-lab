/* =====================================================================
 *  yearfull.js — 2027 종합 사주풀이 (상세)
 *   무료: 신년운세·토정비결 간략 버전 (기존 화면)
 *   상세: 광고 1회 시청 → 오늘 하루 열람 / 유료(2027 종합 사주풀이) → 기간 제한 없이 열람
 *   구성: 한눈에 보는 한 해 · 나의 사주 바탕 · 2027년이 나에게 오는 방식 · 분야별 상세 6개
 *        · 토정비결 전체 · 12개월 상세(좋은 날 포함) · 분기 전략 · 개운 가이드 · 주의할 점
 * ===================================================================== */
const YearFull = (() => {
  const Y = 2027, PASS = 'p8b_yf_pass';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cl = (v, a = 35, b = 96) => Math.max(a, Math.min(b, Math.round(v)));
  const keyOf = p => `${p.date}|${p.cal}|${p.time || ''}|${p.sex}`;

  /* ---------- 열람 권한 ---------- */
  const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
  function passOf(p) { const o = store.get(PASS, null); return o && o.k === keyOf(p) && o.until > Date.now() ? o : null; }
  const owned = () => Store.has('newyear');
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
  const TIPG = [
    ['내 이름을 걸고 할 수 있는 작은 프로젝트를 하나 시작하세요.', '돈을 빌려주거나 보증을 서는 일은 피하세요.'],
    ['아이디어를 메모하고 매달 한 가지는 실제로 만들어 보세요.', '말이 앞서면 구설이 생기니 약속은 줄이고 결과로 보여 주세요.'],
    ['수입·지출 표를 만들어 한 달에 한 번 점검하세요.', '큰 투자는 나눠서 하고, 한 곳에 몰지 마세요.'],
    ['맡은 일의 성과를 숫자로 정리해 두세요. 평가 시기에 힘이 돼요.', '무리한 책임을 혼자 떠안지 말고 도움을 요청하세요.'],
    ['배우고 싶던 것을 하나 등록하세요. 올해 시작한 공부가 오래 남아요.', '생각만 길어지지 않게 시작 날짜를 먼저 정하세요.'],
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

  /* ---------- 화면 ---------- */
  function html(p, a) {
    if (!a) return '<div class="hcard"><p class="hsub">생년월일을 먼저 입력해 주세요.</p></div>';
    if (!unlocked(p)) return `<div class="hhead"><small>${esc(p.name)}님</small><h2>2027 종합 사주풀이</h2></div>${ctaHTML(p, true)}`;
    const B = build(p, a), n = B.n, dm = a.dm, L = LUCK[a.weak], ps = passOf(p);
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
    const qs = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]].map(ix => Math.round(ix.reduce((s, i) => s + n.months[i].v, 0) / 3));
    const qtxt = v => v >= 74 ? '밀고 나갈 때 — 미뤄 둔 계획을 실행하세요.' : v >= 62 ? '다지는 때 — 하던 일을 꾸준히 이어 가세요.' : '쉬어 가는 때 — 무리한 결정은 피하고 점검에 집중하세요.';
    const months = n.months.map(m => {
      const g = TEN_G[m.ten] != null ? TEN_G[m.ten] : 0, tj = B.t ? B.t.months[m.n] : null, gd = goodDays(a, p, m);
      return `<div class="yf-m ${m.v >= 74 ? 'hi' : m.v < 58 ? 'lo' : ''}"><div class="yf-mh"><b>${mm(m)}</b><span>${SAJU.STK[m.s]}${SAJU.BRK[m.b]}월 · ${m.ten}</span><em>${m.v}</em></div>
        <p>${m.txt}${m.rel ? ` <small>(${m.rel.n})</small>` : ''}</p>
        <p class="yf-mf">🎯 이달의 초점: <b>${GN[g]}</b> — ${TIPG[g][m.v >= 66 ? 0 : 1]}</p>
        ${tj ? `<p class="yf-mt">📜 토정 신수: ${tj.a} · ${tj.b}</p>` : ''}
        ${gd.length ? `<p class="yf-md">📌 좋은 날: ${gd.map(d => `${m.solarM}/${d}`).join(', ')}</p>` : ''}</div>`;
    }).join('');
    const cautions = [
      `${mm(n.worst)}은 한 해 중 기운이 가장 약한 달이에요. 큰 계약·이사·투자는 피하고 점검과 휴식에 쓰세요.`,
      `분야 중 ${AREAS[B.area.indexOf(Math.min(...B.area))][1]} 점수가 가장 낮아요(${Math.min(...B.area)}). ${TIPG[B.gA][1]}`,
      n.drel && n.drel.v < 0 ? `일지와 올해 지지가 「${n.drel.n}」 관계라 생활 리듬·거처의 변화가 생기기 쉬워요. 일정에 여유를 두세요.` : `부족한 ${EKN[a.weak]} 기운을 채우지 않으면 하반기에 피로가 쌓이기 쉬워요. ${L.b}을(를) 챙기세요.`,
    ];
    return `<div class="hhead"><small>${esc(p.name)}님 · ${n.gzHan}년 · 만 ${B.age - 1}~${B.age}세</small><h2>2027 종합 사주풀이</h2></div>
      ${ps && !owned() ? `<div class="yf-pass">📺 광고로 연 상세 풀이 · 오늘 ${new Date(ps.until).getHours()}시 59분까지 볼 수 있어요 <button id="yfBuy2">평생 보기 ${Store.price('newyear')}</button></div>` : ''}
      <div class="hcard"><h3 class="ht">📊 한눈에 보는 2027</h3>
        <div class="yf-top"><div class="yf-sc"><b>${B.total}</b><small>한 해 총점</small></div><div><div class="yf-kw">${B.kw.map(k => `<span>#${k}</span>`).join('')}</div><p>${S6.총운}</p></div></div>
        ${AREAS.map((x, i) => bar(`${x[0]} ${x[1]}`, B.area[i])).join('')}
        <p class="sjnote">좋은 달 <b>${n.best.map(mm).join(', ')}</b> · 조심할 달 <b>${mm(n.worst)}</b></p></div>
      <div class="hcard"><h3 class="ht">🧭 나의 사주 바탕</h3><div class="sjtxt">
        <p><b>${dm.nm}</b> — ${dm.key}</p><p>${dm.성격}</p>
        <p>오행: ${a.el.map((v, i) => `${['🌳', '🔥', '⛰️', '⚔️', '💧'][i]}${EKN[i]} ${v}`).join(' · ')} → 가장 강한 기운 <b>${EKN[a.strong]}</b>, 부족한 기운 <b>${EKN[a.weak]}</b></p>
        <p>✨ 강점: ${dm.강점}</p><p>⚠️ 약점: ${dm.약점}</p></div></div>
      <div class="hcard"><h3 class="ht">🔄 2027년이 나에게 오는 방식</h3><div class="sjtxt">
        <p>2027년 ${n.gzTxt}(${n.gzHan})년은 상반기에 <b>${n.ts.n}</b>, 하반기에 <b>${n.tb.n}</b>의 기운으로 들어와요.</p>
        <p>🌱 상반기 — ${S6.총운}</p><p>🍂 하반기 — ${S7.총운}</p>
        ${B.luck ? `<p>🔮 지금은 <b>${B.luck.name}</b> 대운(${B.luck.start}살~)이에요. ${B.luck.g === B.gA || B.luck.g === B.gB ? '올해 세운과 대운이 같은 방향이라 그 기운이 <b>크게</b> 작용해요. 기회도 변화도 평소보다 커요.' : '대운과 세운의 방향이 달라, 큰 흐름은 대운이 잡고 올해는 그 안에서 ' + GN[B.gA] + ' 쪽 일이 두드러져요.'}</p>` : ''}
        ${n.yrel ? `<p>🐑 띠 관계: 내 띠 ↔ 2027 양띠 「${n.yrel.n}」 — ${n.yrel.d.replace('날', '해')}</p>` : ''}
        ${n.drel ? `<p>🏠 일지 관계: 「${n.drel.n}」 — ${n.drel.d.replace('날', '해')}</p>` : ''}</div></div>
      <div class="hcard"><h3 class="ht">🗂️ 분야별 상세</h3><div class="sjtxt">${AREAS.map((x, i) => `<h4>${x[0]} ${x[1]} <small class="yf-s">${B.area[i]}점</small></h4><p>${areaTxt[i]}</p>`).join('')}</div></div>
      ${B.t ? `<div class="hcard"><h3 class="ht">📜 2027 토정비결 전체</h3>${Tojeong.fullHTML(B.t)}</div>` : ''}
      <div class="hcard"><h3 class="ht">📅 12개월 상세</h3><p class="sjnote">명리의 달은 절기로 바뀌어요 (2월은 입춘부터). 좋은 날은 그달 일진 중 오늘의 운세 점수가 가장 높은 날이에요.</p>${months}</div>
      <div class="hcard"><h3 class="ht">🗓️ 분기 전략</h3>${qs.map((v, i) => `<div class="yf-q"><b>${['1분기 (2~4월)', '2분기 (5~7월)', '3분기 (8~10월)', '4분기 (11~1월)'][i]}</b><em>${v}</em><span>${qtxt(v)}</span></div>`).join('')}</div>
      <div class="hcard"><h3 class="ht">🍀 2027 개운 가이드</h3><div class="sjtxt">
        <p>부족한 <b>${EKN[a.weak]}</b> 기운을 채우면 한 해가 고르게 흘러요.</p>
        <ul class="yf-ul"><li>🎨 행운의 색: ${L.c}</li><li>🔢 행운의 숫자: ${L.n}</li><li>🧭 좋은 방향: ${L.d}</li><li>🍽️ 도움 되는 음식: ${L.f}</li><li>🩺 챙길 몸: ${L.b}</li><li>🌱 개운 습관: ${dm.개운}</li></ul></div></div>
      <div class="hcard"><h3 class="ht">⚠️ 2027 주의할 점</h3><div class="sjtxt">${cautions.map(c => `<p>· ${c}</p>`).join('')}</div></div>
      <div class="hcard"><p class="sjtxt" style="margin:0">💌 ${esc(p.name)}님, 2027년은 <b>${B.kw[0]}</b>의 기운이 중심이 되는 해예요. 좋은 달에 움직이고 조심할 달에 쉬어 가며, 부족한 기운을 채워 가면 한 해를 내 편으로 만들 수 있어요.</p>
        <p class="sjnote">※ 전통 명리·토정비결 이론을 바탕으로 한 참고·재미용 풀이예요.</p></div>`;
  }
  // 무료 화면(신년운세·토정비결) 아래에 붙는 안내 카드
  function ctaHTML(p, page) {
    if (unlocked(p)) return `<div class="hcard yf-cta open"><b>📖 2027 종합 사주풀이</b><small>${owned() ? '보유 중 · 언제든 다시 볼 수 있어요' : '광고로 열림 · 오늘 하루 볼 수 있어요'}</small><button class="bigbtn wide" id="yfGo">📖 아주 자세한 종합 풀이 보기</button></div>`;
    return `<div class="hcard yf-cta"><b>📖 2027 종합 사주풀이 · 아주 자세히</b>
      <small>지금 보신 무료 풀이는 요약이에요. 상세 풀이에는 이런 내용이 들어 있어요.</small>
      <ul class="yf-ul"><li>📊 분야 6개 점수와 상세 풀이 (직업·재물·연애·건강·가정·학업)</li><li>🔄 대운·세운·띠·일지 관계로 본 2027년의 흐름</li>
        <li>📜 토정비결 전체 (상·중·하괘 · 월별 신수)</li><li>📅 12개월 상세 + 달마다 좋은 날</li><li>🗓️ 분기 전략 · 🍀 개운 가이드 · ⚠️ 주의할 점</li></ul>
      <button class="adbtn yf-adb" id="yfAd">📺 광고 보고 오늘 무료로 보기</button>
      <button class="bigbtn wide" id="yfBuy">💳 ${Store.price('newyear')} · 기간 제한 없이 보기</button>
      <p class="sjnote">광고로 열면 오늘 하루(자정까지) 볼 수 있어요. 결제하면 2027년이 지나도 계속 다시 볼 수 있어요.</p></div>`;
  }
  function bind(p, a, rerender) {
    const r = rerender || (() => Hub.render());
    const g = document.getElementById('yfGo'); if (g) g.onclick = () => { Snd.sfx('reveal'); Hub.go('yearfull'); };
    const ad = document.getElementById('yfAd'); if (ad) ad.onclick = () => watchAd(p, () => Hub.go('yearfull'));
    const by = document.getElementById('yfBuy'); if (by) by.onclick = () => openShop('newyear');
    const b2 = document.getElementById('yfBuy2'); if (b2) b2.onclick = () => openShop('newyear');
  }
  function init() {
    Hub.register({ page: 'yearfull', title: '2027 종합 사주풀이', html: (p, a) => html(p, a), bind: (p, a) => bind(p, a) });
    Store.onChange(() => { if (document.getElementById('hub').classList.contains('on')) try { Hub.render(); } catch (e) { } });
  }
  init();
  return { unlocked, ctaHTML, bind, html, build };
})();
