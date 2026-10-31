/* 사주 바람기 테스트 엔진 — 운명 연구소 기본 사주 엔진(life/js/saju-core.js, window.SAJU) 위에서 동작
   점수는 전통 명리의 이성운 신살(도화·홍염·역마·화개)과 십신(재성·관성·식상·비겁), 합·충을 조합한 사이트 자체 공식입니다. */
window.BARAM = (() => {
  const S = window.SAJU;
  const DO = { 0: 9, 2: 3, 1: 6, 3: 0 };   // 삼합 기준 도화: 申子辰→酉, 寅午戌→卯, 巳酉丑→午, 亥卯未→子
  const YM = { 0: 2, 2: 8, 1: 11, 3: 5 };  // 역마
  const HG = { 0: 4, 2: 10, 1: 1, 3: 7 };  // 화개
  const HY = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8]; // 홍염살: 일간별 지지
  const WANG = [0, 3, 6, 9];               // 子卯午酉 — 왕지(도화 지지)
  const PN = ['년지', '월지', '일지', '시지'];
  const isHe = (a, b) => (a + b) % 12 === 1;          // 지지 육합
  const isChung = (a, b) => Math.abs(a - b) === 6;    // 지지 충
  const isGanHe = (a, b) => Math.abs(a - b) === 5;    // 천간합

  function calc(b, male) {
    const p = S.pillars(b.cal, b.y, b.m, b.d, b.hh, b.mm, b.unk, b.corr !== false, male ? 'm' : 'f');
    const pos = [p.y, p.m, p.d, p.h];
    const cols = pos.filter(Boolean);
    const me = p.d.s, db = p.d.b;
    const brs = pos.map(c => (c ? c.b : null));
    const has = x => brs.includes(x);
    const F = []; // 근거 목록 {k, pt, t}
    const add = (k, pt, t) => F.push({ k, pt, t });

    // 십신 집계 (천간: 년·월·시 / 지지: 본기)
    const gc = [0, 0, 0, 0, 0], names = [];
    pos.forEach((c, i) => {
      if (!c) return;
      if (i !== 2) { const t = S.tg10(me, c.s); gc[t.g]++; names.push(t.n); }
      const t2 = S.tg10(me, S.HID[c.b]); gc[t2.g]++; names.push(t2.n);
    });
    const el = [0, 0, 0, 0, 0];
    cols.forEach(c => { el[S.SE[c.s]]++; el[S.BE[c.b]]++; });

    // 1) 도화살
    const doBr = new Set();
    [p.y.b, db].forEach(base => { const t = DO[base % 4]; brs.forEach((x, i) => { if (x === t) doBr.add(i); }); });
    if (doBr.size) {
      add('도화살', Math.min(22, 12 + (doBr.size - 1) * 6), `도화살(桃花)이 ${[...doBr].map(i => PN[i]).join('·')}에 있습니다. 사람을 끄는 매력과 분위기가 타고났다는 뜻입니다.`);
      if (doBr.has(3)) add('담 밖 도화', 6, '도화가 시지(담 밖)에 있어 매력이 밖으로 드러나고, 늦게까지 이성 인연이 이어지는 편입니다.');
      if (doBr.has(2)) add('배우자궁 도화', 4, '배우자 자리(일지)에 도화가 앉아 연애 감정이 풍부하고 설렘을 중시합니다.');
    }
    // 2) 홍염살
    if (has(HY[me])) add('홍염살', 12, '홍염살(紅艶)이 있어 은근한 색기와 눈길을 끄는 분위기가 있습니다.');
    // 3) 왕지 과다
    const wn = brs.filter(x => x !== null && WANG.includes(x)).length;
    if (wn >= 3) add('子午卯酉 집중', 8, `子·午·卯·酉 같은 왕지가 ${wn}개라 감정 기복과 열정이 강합니다.`);
    // 4) 이성성 (남=재성, 여=관성)
    const og = male ? 2 : 3, oN = male ? ['편재', '정재'] : ['편관', '정관'], oK = male ? '재성' : '관성';
    const mixed = oN.every(n => names.includes(n));
    if (mixed) add(`${oK} 혼잡`, 12, `${oN[1]}과 ${oN[0]}이 함께 있어(${oK} 혼잡) 마음이 한 사람에게만 머물기 어렵다고 봅니다.`);
    if (gc[og] >= 3) add(`${oK} 과다`, 8, `이성을 뜻하는 ${oK}이 ${gc[og]}개로 많아 이성 인연이 자주 찾아옵니다.`);
    if (!gc[og]) add(`${oK} 없음`, -4, `이성을 뜻하는 ${oK}이 없어 연애 자체에 무심한 편입니다.`);
    // 5) 식상 (표현·끼)
    if (gc[1] >= 3) add('식상 과다', 8, `식신·상관이 ${gc[1]}개로 말솜씨와 끼가 넘쳐 썸이 잘 생깁니다.`);
    if (!male && names.includes('상관') && gc[3]) add('상관견관', 5, '상관이 관성을 보아(상관견관) 정해진 관계의 틀에 답답함을 느끼기 쉽습니다.');
    // 6) 비겁 과다 (경쟁)
    if (gc[0] >= 4) add('비겁 과다', 5, '비견·겁재가 많아 경쟁 심리가 강하고, 삼각관계에 휘말리기 쉽습니다.');
    // 7) 일지(배우자궁) 합·충, 일간 합
    const others = brs.map((x, i) => (i !== 2 ? x : null)).filter(x => x !== null);
    if (others.some(x => isChung(x, db))) add('배우자궁 충', 8, '배우자 자리(일지)가 충을 받아 관계가 자주 흔들리고 새로운 자극을 찾게 됩니다.');
    const heN = others.filter(x => isHe(x, db)).length;
    if (heN) add('배우자궁 합', Math.min(8, heN * 4), '일지가 다른 지지와 합을 이뤄 정이 많고 다가오는 사람을 잘 밀어내지 못합니다.');
    const gh = [p.y, p.m, p.h].filter(c => c && isGanHe(c.s, me)).length;
    if (gh) add('일간 합', Math.min(10, gh * 5), '일간이 다른 천간과 합을 이뤄 사람에게 쉽게 정을 붙입니다.');
    // 8) 역마·화개
    const ym = [p.y.b, db].some(base => brs.some((x, i) => x === YM[base % 4]));
    if (ym) add('역마살', 6, '역마살(驛馬)이 있어 한곳에 머물기보다 새로운 사람·장소를 찾아 움직입니다.');
    const hg = [p.y.b, db].some(base => brs.some((x, i) => x === HG[base % 4] && i !== (base === p.y.b ? 0 : 2)));
    if (hg) add('화개살', -5, '화개살(華蓋)이 있어 혼자만의 세계가 깊고, 이성 관계에서는 오히려 담백합니다.');
    // 9) 오행
    if (el[4] >= 3) add('수(水) 과다', 5, '물의 기운이 많아 감수성이 풍부하고 분위기에 쉽게 젖어 듭니다.');
    if (el[1] >= 3) add('화(火) 과다', 4, '불의 기운이 많아 금방 뜨거워지고 금방 식는 연애를 합니다.');
    if (el[2] >= 3) add('토(土) 과다', -4, '흙의 기운이 많아 한결같고 변화를 싫어합니다.');
    // 10) 자제력 요소
    const jj = male ? gc[3] : gc[4];
    if (jj >= 2) add(male ? '관성(자제력)' : '인성(자제력)', -6, `${male ? '관성' : '인성'}이 받쳐 줘 선을 지키는 힘이 강합니다.`);
    const dbT = S.tg10(me, S.HID[db]).n;
    if (dbT === (male ? '정재' : '정관')) add('배우자궁 정성', -6, `배우자 자리에 ${dbT}이 앉아 한 사람과 오래가는 안정형입니다.`);

    const raw = 26 + F.reduce((s, f) => s + f.pt, 0);
    const score = Math.max(3, Math.min(97, Math.round(raw)));
    return { p, me, male, gc, el, F, score, type: typeOf(score, F), pillars: pos.map(c => (c ? S.ST[c.s] + S.BR[c.b] : '??')), pillarsK: pos.map(c => (c ? S.STK[c.s] + S.BRK[c.b] : '??')), ddi: S.ANI[p.y.b], dm: S.DMX[me], years: yearFlow(p, me, male) };
  }

  const TYPES = [
    { min: 0, e: '🛡️', n: '철벽 수호형', d: '눈앞에 누가 와도 흔들리지 않는 철벽입니다. 연애를 시작하기까지 오래 걸리지만, 한번 정하면 끝까지 갑니다.' },
    { min: 28, e: '🌻', n: '한 사람 해바라기형', d: '한 사람만 바라보는 해바라기입니다. 가끔 다른 꽃이 예뻐 보여도 고개는 결국 제자리로 돌아옵니다.' },
    { min: 45, e: '💞', n: '정 많은 썸 장인형', d: '바람을 피우려는 게 아니라 정이 많을 뿐입니다. 다만 그 다정함이 오해를 부르기 쉬우니 선 긋기가 필요합니다.' },
    { min: 60, e: '🌸', n: '매력 과잉 도화형', d: '가만히 있어도 사람이 꼬이는 도화 체질입니다. 내가 안 움직여도 유혹이 찾아오니, 거절하는 기술이 연애를 지킵니다.' },
    { min: 74, e: '🌬️', n: '자유로운 바람 나그네형', d: '구속을 싫어하고 설렘을 찾아 떠도는 나그네입니다. 함께 모험할 수 있는 상대를 만나야 정착합니다.' },
  ];
  function typeOf(score, F) {
    let t = TYPES[0]; TYPES.forEach(x => { if (score >= x.min) t = x; });
    const top = F.filter(f => f.pt > 0).sort((a, b) => b.pt - a.pt)[0];
    return { ...t, key: top ? top.k : null };
  }

  // 올해·내년 이성운 (세운)
  function yearFlow(p, me, male) {
    const Y = new Date().getFullYear();
    return [Y, Y + 1].map(y => {
      const g = S.yearGz(y), t = S.tg10(me, g.s), og = male ? 2 : 3, msg = [];
      let pt = 0;
      if ([p.y.b, p.d.b].some(base => DO[base % 4] === g.b)) { pt += 2; msg.push('도화운이 들어와 새로운 이성의 관심이 늘어납니다'); }
      if (t.g === og) { pt += 2; msg.push(`이성을 뜻하는 ${t.n}의 해라 인연이 활발합니다`); }
      if (t.g === 1) { pt += 1; msg.push('표현력이 살아나 썸이 잘 생깁니다'); }
      if (isChung(g.b, p.d.b)) { pt += 2; msg.push('배우자 자리가 충을 받아 관계에 흔들림이 생기기 쉽습니다'); }
      if (isHe(g.b, p.d.b)) { pt -= 1; msg.push('배우자 자리와 합이 들어 관계가 단단해지는 해입니다'); }
      if (!msg.length) msg.push('이성운이 잔잔한 해입니다. 지금 관계에 집중하기 좋습니다');
      const lv = pt >= 4 ? '주의' : pt >= 2 ? '설렘' : '안정';
      return { y, gz: S.ST[g.s] + S.BR[g.b], gzK: S.STK[g.s] + S.BRK[g.b], lv, msg };
    });
  }

  // 두 사람 관계 안정도
  function couple(a, b) {
    let s = 60; const why = [];
    const da = a.p.d, dbb = b.p.d;
    if (isHe(da.b, dbb.b)) { s += 15; why.push('두 사람의 배우자 자리(일지)가 육합이라 자연스럽게 끌리고 쉽게 떨어지지 않습니다.'); }
    if (isChung(da.b, dbb.b)) { s -= 15; why.push('일지끼리 충이라 생활 리듬이 부딪힙니다. 다툼 규칙을 먼저 정하세요.'); }
    if (isGanHe(da.s, dbb.s)) { s += 12; why.push('일간끼리 천간합이라 서로에게 마음이 묶이는 인연입니다.'); }
    const ea = S.SE[a.me], eb = S.SE[b.me];
    if ((ea + 1) % 5 === eb || (eb + 1) % 5 === ea) { s += 8; why.push('두 사람의 일간 오행이 상생이라 서로를 키워 줍니다.'); }
    if ((ea + 2) % 5 === eb || (eb + 2) % 5 === ea) { s -= 6; why.push('일간 오행이 상극이라 한쪽이 눌린다고 느끼기 쉽습니다.'); }
    const gap = Math.abs(a.score - b.score);
    if (gap >= 30) { s -= 8; why.push('바람기 지수 차이가 커서 연락 빈도와 이성 친구 기준을 미리 맞춰 두는 게 좋습니다.'); }
    s -= Math.round((a.score + b.score - 100) / 10);
    if (!why.length) why.push('특별한 합·충이 없어 두 사람이 만들어 가는 대로 흘러가는 관계입니다.');
    return { s: Math.max(10, Math.min(98, s)), why };
  }

  const TIPS = {
    도화살: '매력은 숨길 수 없으니, 애인이 있다는 사실을 먼저 밝히는 습관이 오해를 막습니다.',
    홍염살: '분위기에 휩쓸리기 쉬운 술자리·늦은 시간 약속은 짧게 끝내세요.',
    '재성 혼잡': '여러 사람에게 마음이 갈 때는 지금 관계에서 아쉬운 점을 먼저 대화로 꺼내 보세요.',
    '관성 혼잡': '여러 사람에게 마음이 갈 때는 지금 관계에서 아쉬운 점을 먼저 대화로 꺼내 보세요.',
    '배우자궁 충': '관계가 지루할 때는 사람 대신 여행·취미로 새로운 자극을 함께 만드세요.',
    역마살: '떨어져 지내는 시간이 길수록 연락 루틴을 정해 두면 신뢰가 쌓입니다.',
    '식상 과다': '다정한 말과 농담도 상대에게는 신호가 됩니다. 선을 넘는 칭찬은 아끼세요.',
    '배우자궁 합': '정 때문에 거절을 못 하는 편이니, 단호하게 말하는 연습이 필요합니다.',
    '일간 합': '정 때문에 거절을 못 하는 편이니, 단호하게 말하는 연습이 필요합니다.',
  };
  function tips(r) {
    const out = [];
    r.F.filter(f => f.pt > 0).sort((a, b) => b.pt - a.pt).forEach(f => { const t = TIPS[f.k]; if (t && !out.includes(t)) out.push(t); });
    if (out.length < 2) out.push('지금의 안정감이 강점입니다. 다만 표현이 적으면 상대가 불안해할 수 있으니 마음을 자주 말로 전하세요.');
    return out.slice(0, 3);
  }

  return { calc, couple, tips, TYPES };
})();
