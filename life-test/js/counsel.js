/* =====================================================================
 *  counsel.js — 사주 상담 (대화형 · 질문 1개마다 카르마, 처음 1개 무료)
 *   ▸ 기기 안 상담: 이 기기에서 사주(대운·세운·좋은 달)·MBTI·주제·선택지를 정해진 규칙으로 계산해
 *     상담사 말투로 답하고, 다음 질문을 이어 가도록 되물음. 서버·로그인·AI 연결 없음 (참고용 상담)
 *   ▸ 두 가지 상담: 💬 대화 상담 · 🧭 선택 상담(고민 + 선택지 A/B/C → 선택지별 상세 비교 풀이)
 *   ▸ 선택지 비교에는 인생 게임 엔진(내 생년월일로 태어난 가상 인물이 선택지마다 끝까지 살아 봄)을 참고로 덧붙임 (점수에는 넣지 않음)
 *   - 요금: 질문(대화 1개 · 선택 상담 1회)마다 카르마 STORE_CONFIG.counsel.perQ, 처음 1개 무료. 상담권은 없앰
 *     (예전 상담권이 남아 있으면 실제 서비스 모드에서 1장당 카르마 5로 한 번 돌려줌)
 *   - 개인정보·상담 기록은 이 기기에만 저장 (프로필별)
 * ===================================================================== */

const Counsel = (() => {
  const CR = 'p8b_counsel_cr', FREE = 'p8b_counsel_free', HIST = 'p8b_counsel_hist';
  // 무료 질문: STORE_CONFIG.counsel.firstFree 개 (공통 설정) · FREE 키 = 쓴 무료 질문 수 (예전 값 1 = 1개 사용)
  const freeUsed = () => { const v = +store.get(FREE, 0); return Number.isFinite(v) ? v : 1; };
  const credits = () => Math.max(0, CounselPrice.free() - freeUsed());   // 남은 무료 질문 수 (상담권은 없앰)
  const freeLeft = () => credits() > 0;
  /* ---------- 프로필별 상담 기록 (다른 사람의 상담 맥락이 섞이지 않게) ----------
   *  키 하나에 { __v: 2, [프로필]: 값 } 로 보관 · 예전(프로필 구분 없던) 기록은 처음 열 때 그때의 내 프로필로 옮김 */
  const subjOf = p => (window.Views && Views.subj) ? Views.subj(p) : (p ? `${p.date}|${p.cal || 's'}|${p.time || ''}|${p.sex || ''}` : '-');
  function pmap(key) {
    let m = store.get(key, null);
    if (m && m.__v === 2) return m;
    const me = Hub.me ? Hub.me() : null, n = { __v: 2 };
    if (m != null && !(Array.isArray(m) && !m.length) && me) n[subjOf(me)] = m;   // 예전 기록 보존
    store.set(key, n); return n;
  }
  const pget = (key, p, def) => { const v = pmap(key)[subjOf(p)]; return v === undefined || v === null ? def : v; };
  const pset = (key, p, v) => { const m = pmap(key); m[subjOf(p)] = v; store.set(key, m); };
  // 상담 기준 연도: 11월부터는 다음 해 (토정비결·신년운세와 같은 기준) — 안내와 결과를 한 해로 통일
  const baseYear = () => KST.fortuneYear();
  function addCredits() { }   // 상담권 없앰 (예전 호출 호환용)
  // 예전 상담권 정리: 실제 서비스 모드에서는 1장당 카르마 5로 돌려주고, 테스트 모드에서는 그냥 지움
  function migrateCredits() {
    const n = store.get(CR, 0); if (!n) return;
    store.set(CR, 0);
    if (typeof Karma !== 'undefined' && Karma.mode && Karma.mode() === 'live' && typeof karma !== 'undefined') { karma += n * 5; window.KREASON = `상담권 ${n}장 → 카르마 전환`; window.KCAT = 'bonus'; saveMeta(); try { Store.notify(); } catch (e) { } }
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clampN = v => Math.max(0, Math.min(100, Math.round(v)));

  /* ---------- 고민 주제 · 선택지 분류 ---------- */
  const TOPICS = [
    { k: 'career', e: '💼', n: '진로 · 이직', ex: ['지금 회사에 남는다', '이직한다'] },
    { k: 'biz', e: '🚀', n: '창업 · 독립', ex: ['회사를 다니며 준비한다', '퇴사하고 창업한다'] },
    { k: 'study', e: '📚', n: '공부 · 시험', ex: ['대학원에 진학한다', '바로 취업한다'] },
    { k: 'love', e: '💞', n: '연애 · 결혼', ex: ['올해 결혼한다', '조금 더 기다린다'] },
    { k: 'money', e: '💰', n: '돈 · 투자', ex: ['집을 산다', '전세로 더 모은다'] },
    { k: 'move', e: '🧳', n: '이사 · 해외', ex: ['해외로 나간다', '한국에 남는다'] },
    { k: 'hobby', e: '🎨', n: '취미 · 배움', ex: ['그림을 배운다', '피아노를 배운다'] },
  ];
  // 주제별 실행 조언 (질문과 맞는 조언만)
  const TIPS = {
    career: ['🤝 옮기기 전에 지금 자리에서 바꿀 수 있는 것(역할·연봉·근무 방식)을 먼저 요청해 보세요. 답을 듣고 결정해도 늦지 않아요.', '📋 새 자리의 ‘3년 뒤 내 모습’을 그 회사 사람에게 직접 물어보고, 지금 자리와 나란히 적어 비교해요.'],
    biz: ['🧪 바로 뛰어들기보다 3개월짜리 작은 실험(부업·시제품·주말 운영)으로 수요를 먼저 확인해요.', '💰 수입이 없어도 버틸 생활비 6개월치를 먼저 확보하고 시작 날짜를 정해요.'],
    study: ['📝 합격·수료까지 드는 비용(돈·시간)과 끝난 뒤 얻을 기회를 표로 나란히 적어 보세요.', '⏱️ 2주 동안 매일 같은 시간에 공부해 보고, 그 리듬이 지속 가능한지 먼저 확인해요.'],
    love: ['💬 상대와 “5년 뒤 우리 모습”을 각자 써서 바꿔 읽어 보세요. 차이가 곧 미리 풀어야 할 숙제예요.', '🧭 다툼이 생겼을 때 서로 푸는 방식이 맞는지 한 번 이야기해 보세요. 결정보다 오래가는 기준이 돼요.'],
    money: ['🧮 최악의 경우(금리 +2%, 수입 −20%)에도 버틸 수 있는지 계산한 뒤 결정해요.', '🪜 한 번에 다 하지 말고 나눠서 실행(분할 매수·단계적 이전)할 수 있는지 먼저 찾아보세요.'],
    move: ['🧳 떠나기 전에 그곳에서 2주 이상 살아 보거나, 먼저 다녀온 사람 3명에게 물어보세요.', '🏠 주거·일·언어 중 가장 걱정되는 한 가지를 먼저 해결할 계획을 세워요.'],
    hobby: ['🎟️ 두 가지 모두 원데이 클래스나 한 달 체험 수업으로 먼저 해 보세요. 해 보고 더 기다려지는 쪽이 답이에요.', '🗓️ 일주일에 쓸 수 있는 시간과 비용(수강료·재료비·악기)을 나란히 적어 보고, 3개월 이상 이어 갈 수 있는 쪽을 골라요.'],
  };
  // 사주 5대 운 그룹: 0 독립·경쟁 · 1 재능·표현 · 2 재물 · 3 승진·명예(직장) · 4 학업·귀인 / 5 관계 · 6 이동
  const KW = [
    ['창업', '독립', '사업', '프리랜서', '자영업', '개업', '퇴사', '내 가게', '도전', '스타트업', '경쟁'],
    ['예술', '유튜브', '크리에이터', '디자인', '작가', '음악', '표현', '콘텐츠', '방송', '취미', '글', '그림', '피아노', '악기', '노래', '춤', '사진', '요리', '운동'],
    ['투자', '부동산', '주식', '집을 산', '매수', '코인', '재테크', '연봉', '돈', '모은다', '저축'],
    ['회사', '직장', '승진', '공무원', '대기업', '정규직', '남는다', '취업', '안정', '이직', '다닌다'],
    ['공부', '대학원', '유학', '시험', '자격증', '학위', '박사', '석사', '배운다', '진학', '재수'],
    ['결혼', '연애', '고백', '이별', '헤어', '가족', '아이', '출산', '부모', '화해', '만남', '기다린다'],
    ['이사', '이민', '해외', '이주', '떠난다', '귀농', '지방', '외국'],
  ];
  const GN = ['독립·경쟁', '재능·표현', '재물', '직장·명예', '학업·귀인', '관계·가정', '이동·변화'];
  const POL_OF = ['money', 'art', 'money', 'balance', 'study', 'family', 'balance'];
  const TIE = 5;   // 이 점수 차 이하는 '우열 없음'
  function groupOf(t) {
    let best = -1, bs = 0;
    KW.forEach((ws, g) => { const s = ws.filter(w => t.includes(w)).length; if (s > bs) { bs = s; best = g; } });
    return best;
  }

  /* ---------- 맥락: 사주 · MBTI · 게임 기록 ---------- */
  function ctxOf(p) {
    const a = Hub.analyze(p); if (!a) return null;
    // 기준 연도(Y): 상담·토정비결과 같은 해 (11월부터 다음 해) · 현재 연도(cur): 오늘의 한국 날짜 · 작성일(made)
    const Y = baseYear(), cur = KST.year(), made = KST.ymd(), by = Saju.birthYear(a) || +p.date.slice(0, 4);
    const ag = Saju.ages(by, Y), age = ag.manAfter;   // age: 기준 연도의 만 나이(생일 이후) — 게임 시작 나이·나이대에 씀
    const luck = Saju.luckYear(a, Y), luckNow = cur !== Y ? Saju.luckYear(a, cur) : luck;
    const li = a.dy.findIndex(d => d.age === luck.start), nextD = li >= 0 ? a.dy[li + 1] : a.dy[0];
    const ny = Fortune.newYear(a, Y), ny2 = ny, mp = Fortune.monthPlan(a, Y);
    const test = MbtiTest.get(p), sm = Fun.mbti(a);   // 이 프로필의 성향 검사 결과만 (다른 프로필 결과는 쓰지 않음)
    const set = MbtiTest.settled(test), rm = Fun.realMbti ? Fun.realMbti(p) : null;
    const mbti = rm ? { type: rm.type, src: `${rm.src === 'test' ? 'MBTI 성향 검사 결과' : '직접 고른 실제 MBTI'}${rm.type !== sm.type ? ` · 사주로 본 타고난 기질은 ${sm.type} (보는 대상이 달라 다를 수 있어요)` : ''}`, sure: true }
      : test ? { type: sm.type, src: `${p.name}님의 성향 검사 결과에 반반인 축이 ${test.bal || test.ax.filter(x => x.pick === 'X').length}개 있어(중립 결과) 사주로 본 MBTI를 참고했어요`, sure: false }
      : { type: sm.type, src: `사주로 본 MBTI(타고난 기질 경향) · ${p.name}님의 실제 MBTI 기록이 없어요. 사주 MBTI 화면에서 실제 MBTI를 고르거나 성향 검사를 하면 그 결과로 조언해요`, sure: false };
    const hist = store.get('p8b_hist', []);
    const GV = { S: 5, A: 4, B: 3, C: 2, D: 1 };
    const game = hist.length ? { n: hist.length, avg: (hist.reduce((s, h) => s + (GV[h.grade] || 2), 0) / hist.length), best: hist.reduce((m, h) => (GV[h.grade] || 0) > (GV[m.grade] || 0) ? h : m, hist[0]) } : null;
    const yearG = ny.ts ? ny.ts.g : null;
    const lead = Y !== cur ? `${Y}년 기준으로는` : '지금은';
    return { p, a, age, ages: ag, by, Y, cur, made, lead, luck, luckNow, nextD, ny, ny2, mp, yearG, mbti, game };
  }
  const mbtiTraits = t => ({ E: t[0] === 'E', N: t[1] === 'N', T: t[2] === 'T', J: t[3] === 'J' });

  /* ---------- 선택지 정규화 · 분야 분류 · 기본 점수 (대화 상담 · 선택 상담 공통) ----------
   *  같은 뜻의 표현(창업 · 창업한다 · 사업을 시작한다 …)은 같은 개념으로 묶고, 개념마다 대표 분야(main)·보조 분야(sub)·보조 가중치(w)를 정한다.
   *  점수는 세 부분을 따로 관리한다: saju(대운·다음 대운·세운·원국) · mbti(성향) → base(기본 점수, 표시·비교에 쓰는 값)
   *  현실 조건(자금·수입·시간·가족)은 점수를 바꾸지 않고 최종 조언의 우선 기준이 되고, 게임 결과는 따로 보여 줄 뿐 점수에 섞지 않는다.
   *  선택지마다 독립적으로 계산하므로 A·B 순서를 바꿔도, 다시 열어도 같은 값이 나온다. */
  const CONCEPTS = [
    { k: 'biz', n: '창업', re: /(창업|사업\s*(을|를)?\s*(시작|차리|차린|열|연다|해\s*보|하기|한다)|개업|가게\s*(를)?\s*(열|차리|낸|내)|스타트업|자영업|내\s*사업|장사\s*(를)?\s*(시작|한다|하기))/, main: 0, sub: 2, w: .3, risk: 1 },
    { k: 'free', n: '프리랜서·독립', re: /(프리랜서|1인\s*(기업|사업)|독립\s*(한다|하기|해서|$))/, main: 0, sub: 1, w: .3, risk: 1 },
    { k: 'change', n: '이직', re: /(이직|회사\s*(를)?\s*옮|다른\s*회사|전직)/, main: 3, sub: 6, w: .25, risk: 1 },
    { k: 'quit', n: '퇴사', re: /(퇴사|회사\s*(를)?\s*그만|그만둔|그만두|사표)/, main: 0, sub: 6, w: .2, risk: 1 },
    { k: 'stay', n: '현재 직장 유지', re: /((현재|지금|다니던|다니는)\s*(회사|직장|일)|회사|직장).{0,8}(유지|남|계속|다니|버티|그대로|잔류)|^(현\s*직장|유지|잔류|계속 다닌다|남는다)/, main: 3, sub: -1, w: 0, safe: 1 },
    { k: 'job', n: '취업·직장', re: /(취업|입사|공무원|대기업|정규직|승진)/, main: 3, sub: -1, w: 0 },
    { k: 'study', n: '진학·공부', re: /(대학원|유학|진학|학위|석사|박사|편입|재수|공부\s*(를)?\s*(시작|다시|한다|하기))/, main: 4, sub: -1, w: 0, risk: 1 },
    { k: 'exam', n: '시험·자격', re: /(시험|자격증|공시|고시)/, main: 4, sub: -1, w: 0 },
    { k: 'invest', n: '투자·매수', re: /(투자|주식|코인|부동산|집\s*(을)?\s*(산|사|매수|구입)|매수|청약|재테크)/, main: 2, sub: -1, w: 0, risk: 1 },
    { k: 'save', n: '저축·지출 관리', re: /(저축|돈\s*(을)?\s*모|전세|월세로|아껴|모은다)/, main: 2, sub: -1, w: 0, safe: 1 },
    { k: 'art', n: '재능·표현 활동', re: /(유튜브|크리에이터|작가|예술|음악|디자인|콘텐츠|그림|피아노|악기|사진|방송|노래|춤)/, main: 1, sub: -1, w: 0 },
    { k: 'love', n: '연애·결혼', re: /(결혼|연애|고백|재회|헤어|이별|만남|소개팅|약혼)/, main: 5, sub: -1, w: 0 },
    { k: 'family', n: '가족·관계', re: /(가족|부모|아이|출산|육아|화해)/, main: 5, sub: -1, w: 0 },
    { k: 'move', n: '이사·이동', re: /(이사|이민|해외|이주|귀농|지방으로|외국)/, main: 6, sub: 0, w: .2, risk: 1 },
    { k: 'wait', n: '보류·기다림', re: /(기다린다|기다리기|미룬다|미루기|보류|나중에|천천히|조금 더)/, main: -1, sub: -1, w: 0, safe: 1 },
  ];
  // 표현 정리: 끝말·조사·꾸밈말을 떼어 같은 뜻이면 같은 글자가 되게 (표시는 사용자가 쓴 말 그대로)
  const normOpt = o => String(o || '').trim().replace(/[.,!?~·]+$/g, '').replace(/\s+/g, ' ')
    .replace(/\s*(입니다|이에요|예요|이다|합니다|해요|한다|하기|할까요?|하는\s*것|하는\s*쪽|할래|하자|이요)$/, '').replace(/\s*(을|를|은|는|이|가)$/, '').trim();
  function classify(o) {
    const t = normOpt(o), C = CONCEPTS.find(x => x.re.test(t));
    if (C) return { t: String(o).trim(), norm: t, key: C.k, label: C.n, main: C.main, sub: C.sub, w: C.w, risk: !!C.risk, safe: !!C.safe };
    const g = groupOf(t);
    return { t: String(o).trim(), norm: t, key: 'g' + g + ':' + t, label: g >= 0 ? GN[g] : '일반', main: g, sub: -1, w: 0, risk: RISK.test(t), safe: STAY.test(t) };
  }
  const gLabel = C => C.main < 0 ? '뚜렷한 분야 없음' : `${GN[C.main]}${C.sub >= 0 ? ` (보조: ${GN[C.sub]})` : ''}`;
  // 사주 부분: 대운 · 다음 대운 · 세운 · 원국 (성향 제외)
  function sajuPart(c, g) {
    const a = c.a, why = []; let s = 0;
    if (g < 0) return { s, why };
    if (g <= 4) {
      if (c.luck && c.luck.g === g) { s += 18; why.push(`${c.Y}년 기준 대운(${c.luck.name})과 같은 방향`); }
      if (c.nextD && c.nextD.g === g && c.nextD.age - c.ages.kor <= 4) { s += 8; why.push(`세는나이 ${c.nextD.age}세(${c.nextD.yr}년)부터 오는 다음 대운도 같은 흐름`); }
      if (c.yearG === g) { s += 10; why.push(`${c.Y}년 세운이 밀어 주는 분야`); }
      if (a.dom === g) { s += 10; why.push('타고난 사주의 중심 기운과 일치'); }
      if (a.grp && a.grp[g] === 0) { s -= 6; why.push('원국에 드러나지 않은 기운이라 준비가 더 필요'); }
    }
    if (g === 5 && c.luck && c.luck.g === 4) { s += 6; why.push('귀인운이 들어오는 시기'); }
    if (g === 6 && c.luck && (c.luck.g === 0 || c.luck.g === 1)) { s += 8; why.push('변화·도전의 대운'); }
    return { s, why };
  }
  // 성향 부분 (대표 분야 기준)
  function mbtiPart(c, g) {
    const m = mbtiTraits(c.mbti.type), why = []; let s = 0;
    if (g === 5 && !m.T) { s += 6; why.push('관계를 중시하는 F 성향과 맞음'); }
    if (g === 6 && m.N) { s += 4; why.push('새 환경을 즐기는 N 성향'); }
    if (g === 0) { if (m.E) { s += 5; why.push('밖으로 뻗는 E 성향'); } if (!m.J) { s += 3; why.push('유연한 P 성향'); } else s -= 2; }
    if ((g === 3 || g === 4) && m.J) { s += 5; why.push('계획형 J 성향과 잘 맞음'); }
    if (g === 2 && m.T) { s += 4; why.push('숫자로 판단하는 T 성향'); }
    if (g === 1 && m.N) { s += 4; why.push('직관형 N 성향'); }
    return { s, why };
  }
  function scoreOpt(c, C) {
    const m1 = sajuPart(c, C.main), m2 = C.sub >= 0 && C.w > 0 ? sajuPart(c, C.sub) : { s: 0, why: [] };
    const saju = Math.round(m1.s * (1 - C.w) + m2.s * C.w), mb = mbtiPart(c, C.main);
    const why = [...m1.why, ...m2.why.map(x => `보조 분야(${GN[C.sub]}): ${x}`), ...mb.why];
    return { saju, mbti: mb.s, base: clampN(50 + saju + mb.s), why };
  }
  // 현실 조건 읽기 (점수는 바꾸지 않고 최종 조언의 우선 기준)
  const COND_CAT = [['money', /(자금|돈|비용|대출|빚|저축|부족|여유|목돈)/], ['income', /(수입|월급|연봉|생활비|안정)/], ['time', /(시간|기간|나이|일정)/], ['family', /(가족|아이|육아|부모|배우자|결혼)/]];
  const condCat = t => (COND_CAT.find(([, re]) => re.test(t)) || ['etc'])[0];
  // 한 문장에 여러 종류의 조건이 있으면 나눔: '자금은 부족하고 안정적인 수입이 중요합니다' → 자금 · 수입 (나중에 한 가지만 바꿀 수 있게)
  const splitConds = L => [].concat(...L.map(x => { const q = x.split(/(?<=[가-힣])고\s+|,\s*|\s+그리고\s+/).map(v => v.trim()).filter(Boolean); return q.length > 1 && q.every(v => condCat(v) !== 'etc') && new Set(q.map(condCat)).size === q.length ? q.map(v => v.replace(/하$/, '하다')) : [x]; }));
  function flagsOf(conds) {
    const j = conds.join(' ');
    return { moneyShort: /(자금|돈|비용|목돈|여유).{0,6}(부족|없|적|빠듯)|(부족|빠듯).{0,4}(자금|돈)/.test(j) || /대출|빚/.test(j), stable: /(안정|수입|월급|생활비)/.test(j), time: /(시간|기간).{0,6}(부족|없|적|빠듯)/.test(j), family: /(가족|아이|육아|부모|배우자)/.test(j) };
  }
  const FLAGN = { moneyShort: '자금 부족', stable: '안정적인 수입', time: '시간 부족', family: '가족 상황' };
  // 공통 분석: 대화 상담·선택 상담·지난 기록이 모두 이 결과를 쓴다
  function analyzeOpts(c, opts, conds) {
    const L = opts.map(o => { const C = classify(o), sc = scoreOpt(c, C), fm = c.mp.fieldMonths(C.main); return Object.assign(C, sc, { fm }); });
    const sc = L.map(x => x.base), mx = Math.max(...sc), srt = [...sc].sort((x, y) => y - x), tie = srt[0] - srt[1] <= TIE;
    const best = tie ? -1 : sc.indexOf(mx), flags = flagsOf(conds || []);
    const fl = Object.keys(FLAGN).filter(k => flags[k]).map(k => FLAGN[k]);
    const ri = L.findIndex(x => x.risk), si = L.findIndex(x => x.safe);
    // 최종 조언: 현실 조건 → 사주 흐름 순서
    let pick = best, final;
    const nm = i => `${AB[i]}(${L[i].t})`;
    if ((flags.moneyShort || flags.stable || flags.time) && ri >= 0 && si >= 0) {
      pick = si;
      final = `${fl.join('·')} 조건을 우선하면, ${nm(si)}${josa(L[si].t, '을', '를')} 유지하면서 ${nm(ri)}${josa(L[ri].t, '을', '를')} 작게 준비하고 검증하는 순서를 먼저 권해요.${best === ri ? ` 사주 흐름은 ${nm(ri)} 쪽과 더 겹치지만, 이 점수는 실행 시기를 고르는 참고로만 쓰세요.` : ''}`;
    } else if ((flags.moneyShort || flags.stable) && ri >= 0) {
      final = `${fl.join('·')} 조건이 있으니, ${nm(ri)}${josa(L[ri].t, '은', '는')} 생활비·고정 수입을 먼저 확보할 수 있는지 확인한 뒤 단계적으로 검토해 보세요.${best >= 0 ? ` 사주 흐름은 ${nm(best)} 쪽과 더 겹쳐요.` : ''}`;
    } else if (best < 0) final = '사주 흐름으로는 두 선택의 차이가 작아 우열을 가리지 않아요. 비용·시간·수입처럼 직접 확인할 수 있는 조건을 기준으로 정해 보세요.';
    else final = `사주 흐름은 ${nm(best)} 쪽과 더 겹쳐요${L[best].why.length ? ` (${L[best].why.slice(0, 2).join(', ')})` : ''}. 다만 결정은 비용·시간·수입처럼 직접 확인할 수 있는 조건을 먼저 기준으로 삼으세요.`;
    return { L, sc, best, tie, gap: mx - Math.min(...sc), flags, fl, pick, final, Y: c.Y };
  }
  // 선택지 하나의 달 안내: '관련 달 없음' · '관련 달은 있지만 모두 주의 달(권장 실행 달 없음)' · '실행 권장 달'을 구분
  //  이미 하고 있는 선택(현재 직장 유지 등)은 '시작'이 아니라 '점검·조정' 행동으로 표현
  const actWord = x => x.key === 'stay' ? '역할·보상 조정 요청이나 평가처럼 지금 자리에서 움직이는 일' : x.safe ? '계획을 정하고 실천을 이어 가는 일' : '시작·계약·발표처럼 움직이는 일';
  function monthLine(c, x) {
    const mp = c.mp, f = x.fm, lb = L => L.map(mp.label).join('·'), alt = f.fallback || mp.go;
    if (!f.all.length) return `이 분야의 기운이 따로 드러나는 달은 없어요. ${actWord(x)}은 한 해 중 움직이기 좋은 ${lb(alt)}을 참고해 보세요.`;
    if (!f.exec.length) return `관련 기운은 ${lb(f.prep)}에 나타나지만 주의 요소도 커서 준비와 검증에 활용하고, ${actWord(x)}은 조건을 갖춘 뒤 ${alt.length ? lb(alt) + '을 참고해 보세요' : '서두르지 말고 시기를 다시 정해 보세요'}.`;
    return `${lb(f.exec)}에 이 분야의 기운이 들어와요. ${actWord(x)}은 이 달에 맞춰 보세요.${f.prep.length ? ` ${lb(f.prep)}에도 관련 기운이 있지만 주의 요소가 커서 실행보다 준비·검증·조건 점검에 쓰세요.` : ''}`;
  }
  // 선택지별 실행 시기 (요약·상세·4주 계획·바로 할 일이 같은 값을 씀)
  const runMonths = (c, x) => x.fm.exec.length ? x.fm.exec : (x.fm.fallback || c.mp.go);
  /* 실행 계획: 결정 전 공통 준비와 선택 후 실행을 나누고, 선택지마다 맞는 행동·시기를 연결
   *  · 단계적 병행(현실 조건이 유지 쪽을 먼저 권할 때): 유지하는 쪽은 '이어 가며 점검', 준비하는 쪽은 그 선택지의 실행 달
   *  · 그 밖: 선택지마다 '고르면 이렇게, 이 시기에' */
  function execPlan(c, R) {
    const mp = c.mp, lb = L => L.map(mp.label).join('·'), nm = i => `${AB[i]}(${R.L[i].t})`;
    const ri = R.L.findIndex(y => y.risk), k = R.pick, stage = k >= 0 && R.L[k].safe && ri >= 0 && ri !== k;
    const one = (x, i) => x.key === 'stay' || x.safe
      ? `${nm(i)}${josa(x.t, '을', '를')} 고르면 새로 시작할 일은 없어요. 지금처럼 이어 가며 ${x.key === 'stay' ? '역할·보상·배움을 다시 점검하고, 조정 요청은' : '계획을 점검하고, 바꿀 점은'} ${lb(runMonths(c, x))}에 맞춰 보세요.`
      : `${nm(i)}${josa(x.t, '을', '를')} 고르면 준비를 마친 뒤 ${lb(runMonths(c, x))}에 작은 규모로 실행해 보세요.${x.fm.prep.length ? ` ${lb(x.fm.prep)}은 준비·검증에 쓰세요.` : ''}`;
    if (stage) {
      const s = R.L[k], r = R.L[ri];
      return { stage: true, lines: [`단계적 병행: ${nm(k)}${josa(s.t, '은', '는')} 그대로 이어 가며 점검하고(새로 시작하는 일이 아니에요), ${nm(ri)}${josa(r.t, '은', '는')} 생활비·고정 수입 조건을 확인한 뒤 ${lb(runMonths(c, r))}에 작은 규모로 시작해 보세요.${r.fm.prep.length ? ` ${lb(r.fm.prep)}은 ${r.t} 준비·검증에 쓰세요.` : ''}`],
        short: `${r.t} 실행 ${lb(runMonths(c, r))} · ${s.t}${josa(s.t, '은', '는')} 이어 가며 점검` };
    }
    return { stage: false, lines: R.L.map(one), short: R.L.map((x, i) => `${AB[i]} ${lb(runMonths(c, x))}`).join(' · ') };
  }
  const yearMonthsLine = c => `시기로는 ${c.Y}년 **${c.mp.labels(c.mp.go)}**이 움직이기 좋고, **${c.mp.labels(c.mp.caution)}**은 큰 결정을 서두르기보다 조건을 점검하는 데 쓰는 달이에요.`;
  // 대운 안내: 기준 연도 대운과 현재 대운을 구분
  function luckLead(c) {
    const L = c.luck, N = c.luckNow; if (!L) return '';
    const own = `**${L.name}** 대운(${Saju.luckSpan(L)})`;
    if (c.Y === c.cur) return `지금은 ${own}이에요.`;
    return L.start === N.start ? `${c.Y}년 기준으로는 ${own}이에요. 지금(${c.cur}년)도 같은 대운이에요.` : `${c.Y}년 기준으로는 ${own}에 들어서요. 지금(${c.cur}년)은 **${N.name}** 대운(${Saju.luckSpan(N)})의 마지막 시기예요.`;
  }

  /* ---------- 대화형 화면 ---------- */
  const CKEY = 'p8b_counsel_chat';
  const PER = () => ((window.STORE_CONFIG || {}).counsel || {}).perQ || 3;
  const chat = p => pget(CKEY, p || Hub.me(), []);
  const setChat = (p, L) => pset(CKEY, p || Hub.me(), L.slice(-40));
  const getCtx = p => pget(CTXK, p || Hub.me(), null);
  const setCtx = (p, v) => pset(CTXK, p || Hub.me(), v);
  let busy = false;
  const price = () => freeLeft() ? '무료 (처음 1개)' : `✨ ${PER()}`;
  const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const START = ['이직을 할지 지금 회사에 남을지 고민돼요', '요즘 만나는 사람과 잘 될지 궁금해요', '올해 돈을 모으려면 어떻게 해야 할까요?', '창업을 해도 될까요?', '공부를 다시 시작할까 고민이에요', '요즘 마음이 너무 지쳐요'];
  const TABK = 'p8b_counsel_tab';
  const tabOf = () => store.get(TABK, 'chat') === 'pick' ? 'pick' : 'chat';
  const tabsHTML = () => `<div class="tsel cs-tabs" id="csTabs"><button data-v="chat" class="${tabOf() === 'chat' ? 'on' : ''}">💬 대화 상담</button><button data-v="pick" class="${tabOf() === 'pick' ? 'on' : ''}">🧭 선택 상담</button></div>`;
  function pageHTML(p, a) {
    migrateCredits();
    return tabOf() === 'pick' ? pickHTML(p, a) : chatHTML(p, a);
  }
  function bind(p, a, rerender) {
    document.querySelectorAll('#csTabs button').forEach(b => b.onclick = () => { store.set(TABK, b.dataset.v); Snd.sfx('tap'); rerender(); });
    if (tabOf() === 'pick') bindPick(p, a, rerender); else bindChat(p, a, rerender);
  }
  function chatHTML(p, a) {
    const L = chat(p);
    const head = `<div class="hcard cs-hero"><div class="cs-ava">🤖</div><div><b>사주 상담</b><small>고민을 편하게 말해 주세요. ${esc(p.name)}님의 사주·대운·올해 흐름·MBTI를 바탕으로 대화하며 함께 정리해요.</small></div></div>
      ${tabsHTML()}<div class="cs-mode local">📱 기기 안 상담 · 사주·대운·올해 흐름·MBTI를 이 기기 안에서 정해진 규칙으로 계산하는 참고용 상담이에요</div>`;
    const log = L.length ? L.map(m => `<div class="cs-msg ${m.r}"><div>${m.r === 'a' ? md(m.t) : esc(m.t)}</div>${m.r === 'u' && m.cost != null ? `<small>${m.cost ? `✨ −${m.cost}` : '무료'}</small>` : m.r === 'a' ? '<small>📱 기기 안 상담</small>' : ''}</div>`).join('')
      : `<div class="cs-msg a"><div>안녕하세요, ${esc(p.name)}님. 요즘 어떤 고민이 있으세요? 상황을 편하게 적어 주시면 사주 흐름과 함께 차근차근 이야기해 볼게요.<br><br>두 가지 중에서 고민 중이라면 “A 할까, B 할까?”처럼 적어 주시면 비교해 드려요.</div><small>📱 첫 인사는 무료</small></div>`;
    return head + `<div class="hcard cs-chat" id="csLog">${log}${busy ? '<div class="cs-msg a"><div class="cs-typing">답변을 쓰는 중…</div></div>' : ''}</div>
      ${L.length ? '' : `<div class="cs-chips">${START.map(t => `<button data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>`}
      <div class="hcard cs-in"><textarea id="csIn" maxlength="300" rows="3" placeholder="고민을 적어 주세요 (${CounselPrice.text()})"></textarea>
        <div class="cs-send"><span>보유 ✨ ${typeof karma !== 'undefined' ? karma : 0}</span><button class="bigbtn" id="csSend" ${busy ? 'disabled' : ''}>보내기 · ${price()}</button></div>
        <div class="row2">${L.length ? '<button class="ghost" id="csNew">🗂️ 새 대화</button>' : ''}<button class="ghost" id="csKarma">✨ 카르마 모으기</button></div>
        <p class="sjnote">질문 1개를 보낼 때마다 카르마 ${PER()}가 차감돼요${CounselPrice.free() ? ` (처음 ${CounselPrice.free()}개 무료)` : ''}. 확인 질문이나 답을 만들지 못한 경우에는 차감하지 않아요. 대화는 이 기기·브라우저에만 저장되고, 브라우저 데이터 삭제나 기기 변경 시 복원되지 않을 수 있어요.</p></div>
      <p class="sjnote" style="text-align:center">※ 명리 이론을 바탕으로 한 참고·재미용 상담이에요. 건강·법률·투자처럼 중요한 결정은 전문가와 꼭 상의하세요. 마음이 많이 힘들다면 자살예방상담전화 109(24시간)에 연락해 주세요.</p>`;
  }
  function bindChat(p, a, rerender) {
    const r = rerender;
    const send = t => { const v = (t != null ? t : ($('#csIn') || {}).value || '').trim(); if (v) ask(p, v, r); };
    const b = $('#csSend'); if (b) b.onclick = () => send();
    const ta = $('#csIn'); if (ta) ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
    document.querySelectorAll('.cs-chips [data-q]').forEach(x => x.onclick = () => send(x.dataset.q));
    const n = $('#csNew'); if (n) n.onclick = () => { setChat(p, []); setCtx(p, null); Snd.sfx('tap'); r(); };
    const k = $('#csKarma'); if (k) k.onclick = () => Karma.openCharge(Math.max(0, PER() - karma), '사주 상담', () => r());
    const lg = $('#csLog'); if (lg) lg.scrollTop = lg.scrollHeight;
    setTimeout(() => { const m = document.querySelectorAll('.cs-msg'); if (m.length > 1) m[m.length - 1].scrollIntoView({ block: 'end' }); }, 30);
  }
  /* 질문 1개 보내기: 위기 신호 확인 → 차감 → 답변(기기 안 계산) */
  const CRISIS = /(죽고\s*싶|자살|목숨|극단적|자해|사라지고\s*싶|살기\s*싫)/;
  let chargeLock = 0;
  function charge(r, after, reason) {
    if (Date.now() - chargeLock < 800) return;   // 같은 질문이 연달아 두 번 들어와도 한 번만 차감
    chargeLock = Date.now();
    if (freeLeft()) { store.set(FREE, freeUsed() + 1); after(0); return; }
    const n = CounselPrice.per();
    if (typeof syncMeta === 'function') syncMeta(false);   // 다른 탭에서 바뀐 잔액 반영
    if (karma < n) { try { Karma.metric('lack_shown'); } catch (e) { } Karma.openCharge(n - karma, '사주 상담 질문', () => r()); return; }
    karma -= n; window.KREASON = reason || '🤖 사주 상담 질문 1개'; window.KCAT = 'spend';
    if (saveMeta() === false) { karma += n; chargeLock = 0; Hub.toast('저장하지 못해 차감하지 않았어요. 저장 공간을 확인해 주세요'); return; }
    Store.notify(); after(n);
  }
  function ask(p, text, r) {
    if (busy) return;
    const c = ctxOf(p); if (!c) { Hub.toast('내 정보를 먼저 입력해 주세요'); return; }
    const L = chat(p);
    if (CRISIS.test(text)) {   // 위기 신호: 차감하지 않고 바로 도움 안내
      L.push({ r: 'u', t: text, at: Date.now(), cost: 0 }, { r: 'a', src: 'local', at: Date.now(), t: '많이 힘드셨겠어요. 지금 그 마음을 혼자 견디지 않으셨으면 해요.\n\n지금 바로 이야기할 사람이 필요하다면 **자살예방상담전화 109**(24시간), 정신건강위기상담 **1577-0199**, 또는 가까운 사람에게 연락해 주세요. 위급하다면 **112·119**에 연락하세요.\n\n여기서도 천천히 이야기를 들을게요. 요즘 가장 힘든 일이 무엇인지 조금 더 말해 줄 수 있을까요?' });
      setChat(p, L); r(); return;
    }
    // 선택을 묻는데 선택지를 읽지 못하면: 임의 비교 없이 확인 질문 (차감 없음)
    const AC = askContext(text, p);
    if (AC.clarify) {
      L.push({ r: 'u', t: text, at: Date.now(), cost: 0 }, { r: 'a', src: 'local', at: Date.now(), t: `선택지를 정확히 이해하고 답하고 싶어요. 아래처럼 한 줄씩 다시 알려 주시겠어요?\n\n**A는 ○○, B는 ○○**\n(예: A는 현재 회사 유지, B는 창업)\n\n함께 고려할 조건(자금·수입·시간·가족 등)이 있으면 한 문장으로 덧붙여 주세요.${AC.conds.length ? `\n\n지금까지 이해한 조건: ${AC.conds.join(' / ')}` : ''}\n\n확인 질문이라 카르마는 차감하지 않았어요.` });
      setChat(p, L); setCtx(p, { opts: null, conds: AC.conds, tp: AC.tp, Y: c.Y }); r(); return;
    }
    charge(r, (cost, via) => {
      if (AC.opts || AC.conds.length) setCtx(p, { opts: AC.opts, conds: AC.conds, tp: AC.tp, Y: c.Y });
      const u = { r: 'u', t: text, at: Date.now(), cost }; L.push(u); setChat(p, L);
      try { Karma.metric('counsel_q'); } catch (e) { }
      busy = true; r();
      const done = (t, src) => { busy = false; const L2 = chat(p); L2.push({ r: 'a', t, src, at: Date.now(), Y: c.Y }); setChat(p, L2); Snd.sfx('reveal'); if (Hub.cur() === 'counsel') r(); else Hub.toast('🤖 상담 답변이 도착했어요'); };
      // 답을 만들지 못하면 차감을 되돌림 (무료 질문이었으면 무료 횟수 복구)
      const fail = e => { console.warn(e); if (cost) { karma += cost; window.KREASON = '상담 답변 실패 환불'; window.KCAT = 'bonus'; saveMeta(); try { Store.notify(); } catch (x) { } } else store.set(FREE, Math.max(0, freeUsed() - 1));
        const L2 = chat(p); const lu = L2[L2.length - 1]; if (lu && lu.r === 'u') lu.cost = 0; setChat(p, L2); done('답을 만들지 못했어요. 차감한 카르마는 돌려드렸어요. 잠시 뒤 다시 질문해 주세요.', 'local'); };
      const local = () => { try { if (window.__counselFail) throw new Error('test failure'); return localReply(c, L, AC); } catch (e) { fail(e); return null; } };
      setTimeout(() => { const t = local(); if (t != null) done(t, 'local'); }, 700);
    });
  }
  /* ---------- 기기 안 상담 엔진 (API 없이) ----------
   * 질문에서 주제·감정·선택지를 읽고, 사주 흐름(대운·세운·좋은 달)·MBTI·선택지 적합도로 답한 뒤
   * 다음 이야기를 이어 갈 질문을 하나 되묻는다. 같은 대화 안에서는 앞 주제를 기억한다 */
  const TOPIC_KW = { career: ['회사', '직장', '이직', '퇴사', '취업', '승진', '상사', '연봉', '일이', '업무', '커리어', '진로'], biz: ['창업', '사업', '가게', '장사', '독립', '프리랜서', '부업', '스타트업'], study: ['공부', '시험', '자격증', '대학원', '유학', '학교', '수능', '재수', '배우'],
    love: ['연애', '사랑', '남자친구', '여자친구', '남친', '여친', '결혼', '이별', '헤어', '썸', '고백', '배우자', '재회', '짝사랑', '연락', '만나는', '그 사람', '데이트', '호감', '좋아하는', '소개팅', '잘 될지', '애인'], money: ['돈', '투자', '주식', '코인', '부동산', '집', '대출', '빚', '저축', '재테크', '월급', '전세'], move: ['이사', '해외', '이민', '지방', '이주', '유학'],
    hobby: ['취미', '그림', '피아노', '운동', '여행'], mind: ['지쳐', '힘들', '우울', '불안', '외로', '번아웃', '스트레스', '잠이', '무기력', '자존감'], family: ['가족', '부모', '엄마', '아빠', '아이', '자녀', '형제', '시댁', '처가'] };
  const TN = { career: '일과 진로', biz: '창업·독립', study: '공부', love: '연애·관계', money: '돈', move: '이사·이동', hobby: '배움·취미', mind: '마음', family: '가족', all: '지금의 고민' };
  const FOLLOW = {
    career: ['지금 일에서 가장 지치는 부분은 사람, 일의 양, 보상 중 어느 쪽인가요?', '옮긴다면 1년 뒤 어떤 모습이길 바라세요?', '지금 회사에서 바꿀 수 있는 것이 하나 있다면 무엇일까요?'],
    biz: ['지금 준비된 것(돈·기술·사람) 중 가장 자신 있는 것은 무엇인가요?', '실패해도 버틸 수 있는 기간을 따져 보면 몇 달 정도일까요?', '작게 먼저 시험해 볼 수 있는 방법이 있을까요?'],
    study: ['이 공부를 마치면 무엇이 달라지길 바라세요?', '하루에 실제로 낼 수 있는 시간은 얼마나 되나요?', '혼자 하는 게 맞는지, 함께하는 게 맞는지 어느 쪽이었나요?'],
    love: ['그 사람과 있을 때 가장 편한 순간은 언제인가요?', '지금 관계에서 가장 확인하고 싶은 마음은 무엇인가요?', '상대에게 아직 하지 못한 말이 있나요?'],
    money: ['지금 가장 큰 고정 지출은 무엇인가요?', '목표 금액과 기간을 정해 두셨나요?', '잃어도 괜찮은 돈과 지켜야 할 돈을 나눠 보면 어떨까요?'],
    move: ['떠나고 싶은 이유와 남고 싶은 이유를 하나씩 말해 줄 수 있을까요?', '그곳에서 가장 걱정되는 것은 무엇인가요?', '미리 짧게 살아 볼 방법이 있을까요?'],
    hobby: ['둘 중 상상만 해도 더 설레는 쪽은 어느 쪽인가요?', '일주일에 쓸 수 있는 시간은 얼마나 되나요?', '예전에 즐거웠던 취미는 무엇이었나요?'],
    mind: ['요즘 잠은 잘 주무시나요?', '마음이 조금이라도 편해지는 순간은 언제인가요?', '이 이야기를 나눌 수 있는 사람이 곁에 있나요?'],
    family: ['가장 마음이 쓰이는 사람은 누구인가요?', '그분에게 바라는 것을 한 문장으로 말하면 무엇일까요?', '내가 할 수 있는 것과 할 수 없는 것을 나눠 보면 어떨까요?'],
    all: ['조금 더 구체적으로 어떤 상황인지 말해 줄 수 있을까요?', '이 고민이 풀리면 무엇이 가장 달라질까요?', '결정해야 하는 시기가 정해져 있나요?'] };
  const TOPIC_G = { career: 3, biz: 0, study: 4, love: 5, money: 2, move: 6, hobby: 1, mind: -1, family: 5, all: -1 };
  function topicOf(t) { let best = null, bs = 0; Object.keys(TOPIC_KW).forEach(k => { const s = TOPIC_KW[k].filter(w => t.includes(w)).length; if (s > bs) { bs = s; best = k; } }); return best; }
  // 선택지 읽기: "A할까 B할까", "A 아니면 B", "A vs B", "A랑 B 중에"
  /* ---------- 질문 읽기: 선택지 · 조건 · 선택 의도 ----------
   * ① 이름표(A는 X, B는 Y / A: X / 1) X) ② "~할까 ~할까" ③ "X vs/아니면/또는 Y" ④ "X와 Y 중 (어느·뭐…)" 순서로 찾고,
   *   ②~④는 한 문장 안에서 짧은 선택지(25자 이하)만 인정한다. 선택지가 아닌 문장 중 조건 단어가 든 문장은 '조건'으로 따로 모은다. */
  const COND_RE = /(자금|돈|비용|대출|빚|저축|수입|월급|연봉|생활비|가족|아이|육아|부모|건강|나이|시간|경력|자격|준비|안정|위험|부족|여유|중요)/;
  const REQ_RE = /(알려|비교해|말해|설명해|추천해|정리해|봐 ?주|이해했|무엇으로)/;
  const sentences = t => t.replace(/\r/g, '').split(/(?<=[.!?？。])\s+|\n+/).map(x => x.trim()).filter(Boolean);
  const trimOpt = v => { let x = String(v).trim().replace(/[.,!?]+$/, ''); for (let k = 0; k < 3; k++) x = x.replace(/^(지금|그냥|아니면|또는|차라리|계속|요즘|이번에|올해)\s+/, ''); return x.replace(/\s*중\s*(?:에서|에)?\s*(?:어느|어디|뭐|뭘|무엇|하나|어떤).*$/, '').replace(/\s*(입니다|이에요|예요|이고|이며|이다|이요)$/, '').trim(); };
  function parseAsk(t) {
    const x = String(t).replace(/[?？!~]+/g, '.'), S = sentences(x);
    let opts = null;
    const lab = [...x.matchAll(/(?:^|[\s,.(])(?:선택\s*)?([AaBbCc]|[①②③]|[123](?=[).]))\s*(?:안|번)?\s*(?:은|는|:|\)|=|-|\.)\s*([^,.\n]{1,30}?)(?=\s*(?:[,.\n]|$|그리고|\s(?:선택\s*)?[BbCc]\s*(?:은|는|:)|\s[②③2-3][).]))/g)];
    if (lab.length >= 2) { const seen = {}; const o = lab.filter(m => { const k = m[1].toUpperCase(); if (seen[k]) return false; seen[k] = 1; return true; }).map(m => trimOpt(m[2])).filter(v => v.length >= 1 && v.length <= 25); if (o.length >= 2) opts = o.slice(0, 3); }
    if (!opts) for (const s0 of S) { const ks = s0.replace(/\./g, ' ').split(/(?<=[가-힣]까)(?=\s|$)/).map(v => trimOpt(v.replace(/\s*(고민|중|인지|일지).*$/, ''))).filter(v => /까$/.test(v) && v.length >= 2 && v.length <= 25); if (ks.length >= 2) { opts = ks.slice(0, 3); break; } }
    if (!opts) for (const s0 of S) { const m = s0.replace(/\.$/, '').match(/^(.+?)\s*(?:vs\.?|VS|아니면|또는)\s*(.+)$/); if (m) { const o = [trimOpt(m[1]), trimOpt(m[2])]; if (o.every(v => v.length >= 1 && v.length <= 25)) { opts = o; break; } } }
    if (!opts) for (const s0 of S) { const n = s0.match(/^(.+?)(?:이랑|랑|와|과|하고)\s+(.+?)\s*중\s*(?:에서|에)?\s*(?:어느|뭐|뭘|무엇|무얼|하나|고민|선택|어떤|어디|더|나을)/); if (n) { const o = [trimOpt(n[1]), trimOpt(n[2])]; if (o.every(v => v.length >= 1 && v.length <= 25)) { opts = o; break; } } }
    if (opts && opts.every(o => /^[A-Ca-c①-③1-3]$/.test(o))) opts = null;   // 'A랑 B 중'처럼 이름표만 있으면 선택지를 모르는 것
    const conds = [];
    S.forEach(s0 => {
      const v = s0.replace(/\.$/, '').trim(); if (opts && opts.some(o => v.includes(o)) && !COND_RE.test(v.replace(new RegExp(opts.map(o => o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'), ''))) return;
      const m = v.match(/(.+?)(?:다는|라는)\s*조건/); if (m) { conds.push(m[1].replace(/^.*?(?:A와 B를|정확히|그리고)\s*/, '') + '다'); return; }
      if (COND_RE.test(v) && !REQ_RE.test(v) && v.length <= 60 && !/^(테스트|예시)/.test(v)) {
        // 후속 질문의 조건 문장 다듬기: '그럼 자금은 이제 충분하다면 어떻게 달라지나요' → '자금은 이제 충분하다'
        const w = v.replace(/^(그럼|그러면|만약|만일|혹시)\s*/, '').replace(/\s*(다면|라면|면)?\s*(어떻게|어때|어떨|달라|바뀌).*$/, '').replace(/하$/, '하다').trim();
        conds.push(w.length >= 3 ? w : v);
      }
    });
    const wantsChoice = /(\bA\b|\bB\b|A[는와랑]|B[는와랑]|선택|둘 중|두 가지|어느 쪽|어떤 걸|비교)/.test(t);
    return { opts, conds: [...new Set(conds)].slice(0, 4), wantsChoice };
  }
  function optionsOf(t) { return parseAsk(t).opts; }
  // 대화 맥락: 앞에서 이해한 선택지·조건을 후속 질문에서도 유지
  const CTXK = 'p8b_counsel_ctx';
  function askContext(text, p) {
    const P = parseAsk(text), prev = (p ? getCtx(p) : null) || {}, tp = topicOf(text);
    // 새 고민으로 바뀌었는지: 이번 말의 주제가 앞 선택지들과 관련 없는 다른 주제면 앞 선택지를 다시 쓰지 않음
    const prevG = (prev.opts || []).map(o => classify(o).main), tpG = tp ? TOPIC_G[tp] : null;
    const switched = !!(tp && prev.tp && tp !== prev.tp && !prevG.includes(tpG) && !(REL_G[tp] || []).some(g => prevG.includes(g)));
    const follow = P.wantsChoice || /(다시|방금|앞에서|그럼|그러면|조건|바뀌|바꿔|대신)/.test(text);
    const opts = P.opts || (!switched && follow ? prev.opts : null) || null;
    // 조건: 같은 종류(자금·수입·시간·가족)의 조건을 새로 말하면 그 조건만 바꾸고, 나머지는 유지
    let conds = P.opts || switched ? [] : (prev.conds || []).slice();
    splitConds(P.conds).forEach(x => { const k = condCat(x); if (k !== 'etc') conds = conds.filter(y => condCat(y) !== k); conds.push(x); });
    conds = [...new Set(conds)].slice(-5);
    const clarify = !opts && P.wantsChoice && /(\bA\b|\bB\b|A[는와랑]|B[는와랑]|둘 중|두 가지|어느 쪽|비교)/.test(text);
    return { opts, conds, clarify, reused: !P.opts && !!opts, switched, tp: tp || prev.tp || null };
  }
  const RISK = /(창업|사업|퇴사|이직|독립|프리랜서|유학|이사|투자|전업|가게|장사|휴학|그만|도전|새로)/, STAY = /(유지|남|계속|현재|지금 회사|다니|버티|기다|그대로)/;
  const josa = (w, x, y) => { const k = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return k >= 0 && k <= 11171 && k % 28 ? x : y; };
  function realHTML(opts, conds) {
    const money = conds.some(c => /(자금|돈|비용|대출|빚|부족|저축)/.test(c)), stable = conds.some(c => /(안정|수입|월급|생활비)/.test(c));
    const L = ['A', 'B', 'C'];
    const rows = opts.map((o, i) => RISK.test(o)
      ? `**${L[i]} · ${o}** — 좋은 점: 하고 싶은 일과 성장의 폭이 넓어질 수 있어요. 부담: 초기 비용이 들고 수입이 한동안 일정하지 않을 수 있어요. 확인할 것: 생활비를 포함해 수입 없이 버틸 수 있는 기간, 작게 먼저 시험해 볼 방법.`
      : STAY.test(o) ? `**${L[i]} · ${o}** — 좋은 점: 수입이 안정적이고 지금까지 쌓은 경력을 이어 갈 수 있어요. 부담: 원하는 변화가 늦어지고, 시간이 지날수록 결정이 어려워질 수 있어요. 확인할 것: 지금 자리에서 더 얻을 수 있는 역할·보상·배움.`
      : `**${L[i]} · ${o}** — 확인할 것: 드는 비용과 시간, 수입의 안정성, 지금의 준비 수준.`);
    const ri = opts.findIndex(o => RISK.test(o)), si = opts.findIndex(o => STAY.test(o));
    const adv = [];
    if (money && ri >= 0) adv.push(`자금이 부족하다는 조건에서는 ${L[ri]}(${opts[ri]})${josa(opts[ri], '을', '를')} 바로 실행하기보다, ${si >= 0 ? `${L[si]}(${opts[si]})${josa(opts[si], '을', '를')} 이어 가면서 ` : ''}${opts[ri]}${josa(opts[ri], '을', '를')} 작게 준비하고 검증하는 단계적 방법도 함께 검토해 보세요.`);
    if (stable) adv.push('안정적인 수입이 중요하다면, 결정 전에 수입이 끊기지 않는 기간을 먼저 확보하는 것이 우선이에요.');
    return `**현실적으로 비교하면**\n${rows.join('\n')}${adv.length ? '\n' + adv.join(' ') : ''}`;
  }
  function checkQs(opts, conds) {
    const Q = [], ri = opts.findIndex(o => RISK.test(o));
    if (ri >= 0) Q.push(`${opts[ri]}에 필요한 초기 비용과, 수입 없이 버틸 수 있는 기간은 각각 얼마인가요?`);
    if (conds.some(c => /(안정|수입|월급)/.test(c))) Q.push('한 달 생활에 꼭 필요한 최소 수입은 얼마인가요?');
    Q.push(`${opts.join('와 ')} 중 1년 뒤 돌아봤을 때 더 후회할 것 같은 쪽은 어느 쪽인가요?`);
    return `**확인해 볼 질문**\n${Q.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  }
  // 대운 방향과 고민 분야의 관계 문장 (관련 그룹 기준이라 '재물운 대운인데 이 분야를 밀어 주지 않는다' 같은 모순이 생기지 않음)
  function luckRel(c, tp) {
    const rel = REL_G[tp] || [], Lk = c.luck; if (!Lk || !rel.length) return '';
    if (rel.includes(Lk.g)) return ' 지금 대운의 방향이 이 고민과 관련이 있어, 움직이면 힘을 받기 쉬운 시기로 해석해요.';
    if (rel.includes(c.yearG)) return ` ${c.Y}년 세운이 이 분야와 관련이 있어요. 큰 흐름보다 올해의 기회를 살피는 쪽이 좋아요.`;
    return ' 지금 대운은 이 고민과는 다른 방향이에요. 이런 때는 사주 흐름보다 실제 조건을 기준으로 판단하는 편이 좋아요.';
  }
  // 선택지별 분야와 기준 연도 대운의 관계 (대표·보조 분야 기준 · 선택 상담과 같은 분류)
  function luckOpts(c, R) {
    const Lk = c.luck; if (!Lk) return '';
    const rel = R.L.map((x, i) => x.main === Lk.g ? [i, '대표'] : x.sub === Lk.g && x.w > 0 ? [i, '보조'] : null).filter(Boolean);
    if (!rel.length) return '이 대운은 선택지들의 분야와 직접 관련이 적어요. 이런 때는 사주 흐름보다 현실 조건이 판단의 중심이 돼요.';
    return `이 대운은 ${rel.map(([i, k]) => `${AB[i]}(${R.L[i].t})의 ${k} 분야`).join(', ')}와 같은 방향이에요.`;
  }
  const REL_G = { career: [3, 1], biz: [0, 2], study: [4], love: [5], money: [2], move: [6, 0], hobby: [1], family: [5], mind: [], all: [] };
  function localReply(c, L, AC) {
    const us = L.filter(m => m.r === 'u'), text = us[us.length - 1].t, turn = us.length;
    AC = AC || askContext(text);
    const tpAt = i => i < 0 ? 'all' : (topicOf(us[i].t) || tpAt(i - 1));   // 주제가 없는 말은 앞 주제를 이어 감
    const tp = tpAt(us.length - 1);
    const a = c.a, Lk = c.luck, m = mbtiTraits(c.mbti.type), NY = c.ny;
    const mm = x => `${x.yr !== c.Y ? x.yr + '년 ' : ''}${x.solarM}월`, bm = [...NY.best].sort((x, y) => x.yr - y.yr || x.solarM - y.solarM).map(mm).join('·');
    const sad = /(힘들|지쳐|우울|불안|걱정|답답|막막|외로|속상|무기력)/.test(text), happy = /(설레|좋아|기대|행복|기뻐)/.test(text);
    // 선택지가 있으면: 이해한 내용 → 현실 비교 → 확인 질문 → 사주는 참고 관점 (점수는 성공 확률이 아님)
    if (AC.opts && AC.opts.length >= 2) {
      const opts = AC.opts, LB = AB, conds = AC.conds || [], R = analyzeOpts(c, opts, conds);
      const res = [`**제가 이해한 내용**${AC.reused ? ' (앞에서 말씀하신 선택지를 이어서 볼게요)' : ''}\n${opts.map((o, i) => `· 선택 ${LB[i]}: ${o}`).join('\n')}\n· 고려할 조건: ${conds.length ? conds.join(' / ') : '따로 말씀하신 조건은 없어요'}`];
      res.push(realHTML(opts, conds));
      res.push(checkQs(opts, conds));
      res.push(`**사주로 보는 참고 관점**\n${luckLead(c)} ${luckOpts(c, R)}\n분야: ${R.L.map((x, i) => `${LB[i]} ${gLabel(x)}`).join(' · ')}\n기본 점수(사주 흐름과 겹치는 정도): ${R.L.map((x, i) => `${LB[i]} ${x.base}`).join(' · ')} — 대운·세운·타고난 중심 기운(사주)과 MBTI 성향이 그 선택의 분야와 겹치는 정도를 정해진 규칙으로 합산한 참고값(100 기준)이에요. 성공 가능성을 뜻하지 않고, 선택 상담과 같은 계산이에요.`);
      res.push(`**현실 조건을 반영한 조언**\n${R.final}`);
      res.push(yearMonthsLine(c) + '\n' + R.L.map((x, i) => `· ${LB[i]}(${x.t}): ${monthLine(c, x)}`).join('\n'));
      res.push(`**선택 후 실행 계획**\n${execPlan(c, R).lines.map(t => '· ' + t).join('\n')}`);
      const f = FOLLOW[tp] || FOLLOW.all; res.push(f[(turn - 1) % f.length]);
      return res.join('\n\n');
    }
    const out = [];
    // 1) 공감
    out.push(tp === 'mind' ? (turn > 1 ? '이야기해 줘서 고마워요. 천천히 같이 볼게요.' : '요즘 많이 지치셨군요. 이렇게 털어놓는 것만으로도 한 걸음 나아간 거예요.') : sad ? `${TN[tp]} 때문에 마음이 많이 무거우셨겠어요. 이렇게 털어놓는 것만으로도 한 걸음 나아간 거예요.` : happy ? `${TN[tp]} 이야기를 들으니 저도 기대가 돼요. 좋은 흐름을 잘 살릴 방법을 같이 생각해 볼게요.` : turn > 1 ? `말씀해 주셔서 고마워요. ${TN[tp]}에 대해 조금 더 깊이 볼게요.` : `${TN[tp]}에 대한 고민이시군요. 사주 흐름과 함께 차근차근 볼게요.`);
    // 2) 사주 흐름 — 주제가 처음 나올 때는 대운, 같은 주제를 이어 갈 때는 다른 각도(세운·오행·다음 대운)
    const g = TOPIC_G[tp], again = us.length > 1 && tpAt(us.length - 2) === tp;
    if (tp === 'mind') { const G = Saju.gaeun(a); out.push(`사주로 보면 ${c.p.name || ''}님은 겉으로 드러난 글자 중 **${SAJU.EK[a.strong]}** 기운이 많고 **${SAJU.EK[a.weak]}** 기운이 적어요. ${G.fillLine} 마음이 지칠 때 이런 활동으로 생활 리듬을 돌아보는 것도 방법이에요. 다만 지친 마음이 오래간다면 사주보다 믿을 만한 사람·전문가와 이야기하는 것이 먼저예요.`); }
    else if (again) {
      const k = turn % 3;
      out.push(k === 0 && c.nextD ? `조금 멀리 보면 세는나이 ${c.nextD.age}세(${c.nextD.yr}년)부터 **${Saju.GRPN[c.nextD.g]}**의 대운이 와요. ${c.nextD.g === (Lk && Lk.g) ? '지금 흐름이 한 번 더 이어지니 지금 쌓는 것이 그대로 힘이 돼요.' : '흐름이 바뀌기 전, 지금 대운에서 해 둘 일을 마무리해 두면 좋아요.'}`
        : k === 1 ? `${c.Y}년은 상반기 **${NY.ts.n}**, 하반기 **${(NY.tb || NY.ts).n}**의 기운이 들어와요. ${NY.sx && NY.sx.총운 ? NY.sx.총운 : ''}`
        : `타고난 기운으로 보면 **${SAJU.EK[a.strong]}** 기운이 강하고 **${SAJU.EK[a.weak]}** 기운이 부족해요. ${a.dm.강점}`);
    } else if (Lk) out.push(`${luckLead(c)} ${Lk.desc}${luckRel(c, tp)}`);
    // 4) 성향
    if (!again || turn % 2 === 0) out.push(tp === 'mind' ? `${c.mbti.type} 성향은 ${m.E ? '사람들 속에서 기운을 얻는 편이라, 혼자 버티기보다 믿는 사람과 이야기를 나눌 때 회복이 빨라요.' : '혼자만의 시간에 충전되는 편이라, 하루쯤은 일정 없이 쉬는 날을 꼭 만들어 주세요.'}`
      : `${c.mbti.type} 성향으로 보면 ${m.J ? '결정을 빨리 내리고 싶어지는 편이라, 정보가 다 모일 때까지 2주쯤 기한을 두고 판단해 보세요.' : '여러 가능성을 열어 두는 편이라, 결정 기한을 스스로 정해 두면 마음이 편해져요.'} ${m.T ? '조건만 따지다 보면 마음의 만족을 놓칠 수 있으니 “1년 뒤 나는 행복한가?”도 함께 물어보세요.' : '주변의 기대보다 내 마음이 끌리는 쪽을 따로 적어 보세요.'}`);
    // 5) 시기 · 실천
    if (tp !== 'mind' && (!again || turn % 3 === 1)) out.push(yearMonthsLine(c));
    const tips = tp === 'mind' ? ['🌙 오늘 밤은 휴대폰을 30분 일찍 내려놓고, 따뜻한 물 한 잔과 함께 쉬어 보세요.', '🚶 하루 20분, 햇빛 아래 걷는 것만으로도 마음의 무게가 조금 가벼워져요.', '📝 걱정을 종이에 적고 “지금 할 수 있는 것”에만 동그라미를 쳐 보세요.'] : (TIPS[tp] || TIPS.career || []);
    if (tips.length) out.push(`바로 해 볼 일: ${tips[(turn - 1) % tips.length]}`);
    if (turn === 1) { const G = Saju.gaeun(a); out.push(`🍀 ${G.dmLine} 따로, ${G.fillLine} 둘 다 ${G.note}`); }
    // 6) 되묻기
    const f = FOLLOW[tp] || FOLLOW.all; out.push(f[(turn - 1) % f.length]);
    return out.join('\n\n');
  }
  /* ---------- 🧭 선택 상담 화면 (고민 + 선택지 → 선택지별 상세 비교) ---------- */
  let st = { topic: 'career', q: '', opts: ['', ''], cond: '', res: null, busy: false, subj: null };
  function pickHTML(p, a) {
    if (st.subj !== subjOf(p)) st = { topic: 'career', q: '', opts: ['', ''], cond: '', res: null, busy: st.busy, subj: subjOf(p) };   // 다른 프로필로 바꾸면 이전 사람의 입력·결과를 쓰지 않음
    const T = TOPICS.find(t => t.k === st.topic) || TOPICS[0];
    const head = `<div class="hcard cs-hero"><div class="cs-ava">🤖</div><div><b>사주 상담</b><small>인생의 갈림길에서 선택지를 적어 주시면 사주 · MBTI · 인생 게임으로 선택지마다 자세히 풀어 드려요.</small></div></div>${tabsHTML()}`;
    if (st.res) return head + st.res.html + `<div class="hcard"><button class="bigbtn wide" id="csNew2">🗂️ 다른 고민 상담하기</button></div>`;
    return head + `<div class="hcard">
      <h3 class="ht">무엇이 고민인가요?</h3>
      <div class="tsel cs-top" id="csTopic">${TOPICS.map(t => `<button data-v="${t.k}" class="${t.k === st.topic ? 'on' : ''}">${t.e} ${t.n}</button>`).join('')}</div>
      <label class="cs-l">상황을 한두 줄로 적어 주세요<textarea id="csQ" maxlength="200" rows="3" placeholder="예: 지금 회사 5년 차인데 스타트업에서 제안이 왔어요. 연봉은 비슷하고 성장 기회가 커요.">${esc(st.q)}</textarea></label>
      <label class="cs-l">선택지 A<input id="csA" maxlength="40" value="${esc(st.opts[0])}" placeholder="예: ${T.ex[0]}"></label>
      <label class="cs-l">선택지 B<input id="csB" maxlength="40" value="${esc(st.opts[1])}" placeholder="예: ${T.ex[1]}"></label>
      <label class="cs-l">선택지 C <small>(선택)</small><input id="csC" maxlength="40" value="${esc(st.opts[2] || '')}" placeholder="비워 두어도 돼요"></label>
      <label class="cs-l">중요 조건 <small>(선택 · 자금·수입·시간·가족 등)</small><input id="csCond" maxlength="80" value="${esc(st.cond || '')}" placeholder="예: 자금이 부족하고 안정적인 수입이 중요해요"></label>
      <div id="csErr" class="cs-err"></div>
      <div class="cs-send"><span>보유 ✨ ${typeof karma !== 'undefined' ? karma : 0}</span><button class="bigbtn" id="csGo">🔮 상담 받기 · ${price()}</button></div>
      <p class="sjnote">선택 상담 1회 = 카르마 ${CounselPrice.per()}${CounselPrice.free() ? ` (대화·선택 상담 합쳐 처음 ${CounselPrice.free()}개 무료)` : ''}. 📍 이름·생년월일 같은 개인정보는 이 기기 안에서만 계산하고, 상담 기록도 이 기기에만 남아요.</p></div>
      <div class="hcard cs-what"><h3 class="ht">무엇을 받나요?</h3>
      <ul><li>🧭 선택지별 <b>적합도</b>와 종합 의견</li><li>🔍 선택지마다 <b>상세 풀이</b> — 사주로 본 의미, 잘 맞는 점, 조심할 점, 이 선택의 기운이 들어오는 달, 1년 뒤·3년 뒤 모습, 시작 전 준비</li>
      <li>🔮 지금 대운 · ${baseYear()}년 세운 · 움직이기 좋은 달</li><li>🧠 MBTI로 본 나의 결정 스타일과 함정</li>
      <li>🎲 내 생년월일로 태어난 가상 인물이 선택지마다 <b>끝까지 살아 본 결과</b> (인생 게임 엔진)</li><li>✅ 결정까지의 4주 실행 계획</li></ul>
      <div class="row2"><button class="ghost" id="csKarma2">✨ 카르마 모으기</button></div></div>
      ${histHTML(p)}`;
  }
  const pickConds = () => { const P = parseAsk(st.q || ''); return [...new Set(splitConds([...(st.cond ? [st.cond] : []), ...P.conds]))].slice(0, 5); };
  const hist = p => pget(HIST, p, []);
  function histHTML(p) {
    const h = hist(p); if (!h.length) return '';
    return `<div class="hcard"><h3 class="ht">지난 선택 상담 (이 기기)</h3>${h.slice(0, 5).map((x, i) => `<button class="cs-past" data-i="${i}"><b>${x.e} ${esc(x.q || x.opts.join(' vs '))}</b><small>${KST.fmt(x.t)}${x.Y ? ` · ${x.Y}년 기준` : ''} · ${x.v === 2 ? '현실 조건 우선' : '추천'}: ${esc(x.pick)}</small></button>`).join('')}</div>`;
  }
  // 지난 상담 열기: 저장된 당시 결과(당시 프로필 · 기준 연도 · 작성일)를 그대로 보여 줌 (지금 프로필로 다시 계산하지 않음)
  function pastHTML(x) {
    const P = x.prof, basis = P ? `<p class="sjnote">당시 프로필: ${esc(P.name)} · ${esc(P.date.replace(/-/g, '.'))}(${P.cal === 'l' ? '음력' : '양력'}) · ${P.time ? esc(P.time) : '시간 모름'} · ${P.sex === 'f' ? '여성' : '남성'} · 해석 기준 ${x.Y}년 · 작성일 ${esc(x.made || KST.fmt(x.t))}</p>` : '';
    return basis + x.html;
  }
  function bindPick(p, a, r) {
    const keep = () => { const q = $('#csQ'); if (q) { st.q = q.value.trim(); st.opts = [$('#csA').value.trim(), $('#csB').value.trim(), $('#csC').value.trim()]; st.cond = ($('#csCond') || {}).value ? $('#csCond').value.trim() : ''; } };
    document.querySelectorAll('#csTopic button').forEach(b => b.onclick = () => { keep(); st.topic = b.dataset.v; Snd.sfx('tap'); r(); });
    const go = $('#csGo'); if (go) go.onclick = () => { keep(); start(p, r); };
    const n = $('#csNew2'); if (n) n.onclick = () => { st.res = null; r(); };
    const k = $('#csKarma2'); if (k) k.onclick = () => Karma.openCharge(Math.max(0, PER() - karma), '사주 상담', () => r());
    document.querySelectorAll('.cs-past').forEach(b => b.onclick = () => { const x = hist(p)[+b.dataset.i]; if (x) openOverlay(`${x.e} 지난 상담`, pastHTML(x), [{ t: '닫기' }]); });
    bindResult();
  }
  function buy(r) {
    if (typeof openShop === 'function') { openShop('counsel'); const un = Store.onChange(() => r && r()); }
  }

  /* ---------- 상담 실행 ---------- */
  async function start(p, r) {
    const err = t => { const e = $('#csErr'); if (e) e.textContent = t; Snd.sfx('bad'); };
    const opts = st.opts.filter(Boolean);
    if (opts.length < 2) return err('선택지를 두 개 이상 적어 주세요');
    if (new Set(opts.map(normOpt)).size !== opts.length) return err('선택지가 서로 같아요');
    if (st.busy) return;
    const c = ctxOf(p); if (!c) return err('내 정보를 먼저 입력해 주세요');
    if (CRISIS.test(st.q + ' ' + opts.join(' '))) { openOverlay('💛 잠깐 이야기해요', `<div class="sjtxt"><p>많이 힘드셨겠어요. 그 마음을 혼자 견디지 않으셨으면 해요.</p><p>지금 이야기할 사람이 필요하다면 <b>자살예방상담전화 109</b>(24시간), 정신건강위기상담 <b>1577-0199</b>, 또는 가까운 사람에게 연락해 주세요. 위급하다면 <b>112·119</b>에 연락하세요.</p><p>💬 대화 상담에서 천천히 이야기를 나눌 수도 있어요. 카르마는 차감하지 않았어요.</p></div>`, [{ t: '닫기' }]); return; }
    charge(r, cost => run(p, r, c, opts, cost), '🧭 사주 선택 상담 1회');
  }
  async function run(p, r, c, opts, cost) {
    st.busy = true;
    openOverlay('🤖 사주 상담', `<div class="fk-load"><div class="fk-reel">🔮</div><p id="csStep">사주와 올해 흐름을 살피는 중…</p><div class="fk-bar"><i id="fkBar"></i></div></div>`, []);
    const stepT = t => { const e = $('#csStep'); if (e) e.textContent = t; };
    try {
      const R = analyzeOpts(c, opts, pickConds()), groups = R.L.map(x => x.main);
      await wait(500); stepT('MBTI로 결정 스타일을 보는 중…'); await wait(400);
      stepT('내 생년월일로 태어난 가상 인물이 선택지마다 살아 보는 중…');
      const birth = { cal: p.cal || 's', y: +p.date.slice(0, 4), m: +p.date.slice(5, 7), d: +p.date.slice(8, 10), hh: p.time ? +p.time.split(':')[0] : 12, mm: p.time ? +p.time.split(':')[1] : 0, unk: !p.time };
      let sims = null;
      const sameField = groups.every(g => g === groups[0]);
      if (!sameField && typeof Fork !== 'undefined' && !Fork.busy && !(P && P.alive && $('#game').classList.contains('on'))) {
        // 같은 프로필·선택지·기준 연도면 같은 가상 인생이 나오도록 난수를 고정 (다시 열어도 결과가 바뀌지 않게)
        const seed = [subjOf(p), c.Y, ...R.L.map(x => x.key)].join('|'), rnd = Math.random;
        Math.random = mulberry(hashStr(seed));
        try {
          const raw = await Fork.simulateVirtual({ birth, male: p.sex !== 'f', age: Math.max(1, c.age), q: st.q },
            opts.slice(0, 3).map((t, i) => ({ t, pol: POL_OF[groups[i]] || 'balance', fx: FX[groups[i]] })),
            v => { const b = $('#fkBar'); if (b) b.style.width = Math.round(v * 100) + '%'; });
          if (raw.length === Math.min(3, opts.length)) sims = raw.map(Fork.agg);
        } catch (e) { console.warn('counsel sim', e); } finally { Math.random = rnd; }
        if (!sims) console.warn('counsel sim empty');
      }
      if (window.__counselFail) throw new Error('test failure');   // 테스트용: 실패 시 환불 확인
      const res = compose(c, opts, R, sims);
      try { Karma.metric('counsel_run'); } catch (e) { }
      st.res = res; st.busy = false;
      const h = hist(p); h.unshift({ v: 2, t: Date.now(), made: KST.ymd(), Y: c.Y, prof: { name: p.name, date: p.date, cal: p.cal || 's', time: p.time || '', sex: p.sex }, e: (TOPICS.find(t => t.k === st.topic) || {}).e || '🤖', q: st.q, opts, scores: R.sc, pick: R.pick < 0 ? '우열 없음' : opts[R.pick], html: res.html }); pset(HIST, p, h.slice(0, 10));
      closeOverlay(); Snd.sfx('reveal'); r();
    } catch (e) {
      console.warn(e); st.busy = false; closeOverlay();
      if (cost) { karma += cost; window.KREASON = '선택 상담 오류 환불'; window.KCAT = 'bonus'; saveMeta(); Store.notify(); } else store.set(FREE, Math.max(0, freeUsed() - 1));
      Hub.toast('상담을 만들지 못했어요. 차감한 카르마는 돌려드렸어요');
    }
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const hashStr = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const FX = [p => { p.money -= Math.round(p.money * .15); p.hap += 3; }, p => { p.hap += 4; }, null, p => { p.hap -= 1; }, p => { p.smart += 4; p.money -= Math.round(p.money * .08); }, p => { p.bond += 6; }, p => { p.hap += 2; p.bond -= 4; }];


  /* ---------- 선택지별 상세 풀이 ---------- */
  // 분야(그룹)별 [사주로 본 의미, 잘 맞는 점, 조심할 점, 시작 전 준비, 1년 뒤, 3년 뒤]
  const GDEEP = {
    0: ['비견·겁재(독립·경쟁)의 길이에요. 내 이름과 내 판단으로 서는 선택이라 자율과 성취감이 크지만, 모든 책임도 나에게 돌아와요.',
      ['스스로 결정하는 자유가 커서 의욕이 오래가요', '경쟁이 있는 자리에서 실력이 빨리 늘어요', '잘되면 성과가 고스란히 내 것이 돼요'],
      ['수입이 들쭉날쭉할 수 있어요', '혼자 다 하려다 지치기 쉬워요', '가까운 사람과의 돈거래·동업이 새는 구멍이 돼요'],
      ['버틸 생활비(최소 6개월)를 먼저 떼어 두기', '3개월짜리 작은 실험으로 수요·적성 확인하기', '도움받을 사람 3명을 미리 정해 두기'],
      '처음 몇 달은 정신없지만 내 방식이 자리를 잡아 가요. 수입보다 경험과 사람이 먼저 쌓이는 시기예요.',
      '버텨 낸다면 나만의 영역이 생겨요. 이때부터는 혼자보다 함께할 사람을 들이는 것이 성장의 열쇠예요.'],
    1: ['식신·상관(재능·표현)의 길이에요. 내가 가진 재주를 밖으로 꺼내 보이는 선택이라 즐거움과 몰입이 크고, 결과가 사람들 눈에 보여요.',
      ['좋아하는 일이라 오래 지치지 않아요', '아이디어와 표현력이 빛나요', '작게 시작해도 반응을 바로 볼 수 있어요'],
      ['즐거움만큼 수입이 바로 따라오지 않을 수 있어요', '기분에 따라 꾸준함이 흔들리기 쉬워요', '말과 표현이 앞서 구설이 생길 수 있어요'],
      ['결과물을 정기적으로 내놓을 주기(주 1회 등) 정하기', '취미 수준과 수익 목표를 분리해 적기', '피드백을 줄 사람이나 모임 찾기'],
      '해 본 것들이 쌓여 내 색깔이 생겨요. 처음 기대보다 느려도 꾸준히 낸 사람만 남는 시기예요.',
      '쌓인 결과물이 포트폴리오가 되어 기회를 불러와요. 재능이 일·수입으로 이어지는 갈림길이 와요.'],
    2: ['편재·정재(재물)의 길이에요. 돈과 실리를 직접 다루는 선택이라 결과가 숫자로 분명하게 드러나요.',
      ['노력한 만큼 손에 잡히는 결과가 생겨요', '목표가 숫자라 계획을 세우기 쉬워요', '자산이 불어나는 재미가 있어요'],
      ['욕심이 커지면 무리한 결정을 하기 쉬워요', '들어오는 만큼 나가는 돈도 커져요', '시장 상황처럼 내가 못 바꾸는 변수가 있어요'],
      ['최악의 경우(수입 −20%, 금리 +2%)에도 버틸지 계산하기', '한 번에 하지 말고 나눠 실행하기', '지켜야 할 돈과 써도 되는 돈을 나누기'],
      '첫해는 계획대로 되는지 확인하는 해예요. 숫자를 매달 기록하면 흔들릴 때 기준이 돼요.',
      '꾸준히 관리했다면 자산의 기반이 생겨요. 이때 욕심을 줄이고 지키는 쪽으로 무게를 옮기면 오래가요.'],
    3: ['편관·정관(직장·명예)의 길이에요. 조직과 규칙 안에서 자리를 지키고 올라가는 선택이라 안정과 인정을 얻어요.',
      ['수입과 생활이 안정적이에요', '쌓은 경력이 그대로 평가로 이어져요', '사회적 신뢰와 이름이 올라가요'],
      ['책임과 압박이 커질 수 있어요', '내 뜻대로 바꿀 수 있는 것이 적어요', '익숙함에 머물다 성장이 멈춘 느낌이 들 수 있어요'],
      ['지금 자리에서 바꿀 수 있는 것(역할·연봉·근무 방식)을 먼저 요청하기', '3년 뒤 내 모습을 선배·동료에게 물어보기', '평가 기준을 정확히 알아 두기'],
      '안정 속에서 맡은 일이 늘어요. 인정받는 만큼 책임도 커지니 체력과 마음 관리가 중요해요.',
      '쌓아 온 신뢰가 자리와 직함으로 돌아와요. 이때 새 역할에 도전할지, 지금 자리를 다질지 다시 고민이 와요.'],
    4: ['편인·정인(학업·귀인)의 길이에요. 배우고 준비하며 나를 키우는 선택이라 당장보다 나중에 크게 돌아와요.',
      ['실력과 자격이 오래 남는 자산이 돼요', '스승·선배 같은 귀인을 만나기 쉬워요', '생각이 깊어지고 방향이 분명해져요'],
      ['당장 수입이 줄거나 늦어질 수 있어요', '준비만 길어지고 실행이 늦어지기 쉬워요', '주변과 비교하며 조급해질 수 있어요'],
      ['끝나는 날짜와 그 뒤의 계획을 먼저 정하기', '드는 비용(돈·시간)과 얻을 기회를 표로 비교하기', '2주 동안 같은 리듬으로 해 보며 지속 가능성 확인하기'],
      '배우는 즐거움과 막막함이 함께 와요. 작은 성취(시험·수료)를 중간 목표로 두면 끝까지 가요.',
      '배운 것이 자격과 경력으로 바뀌어 선택지가 넓어져요. 이때 만난 사람이 다음 길을 열어 줘요.'],
    5: ['관계·가정의 길이에요. 사람과의 인연을 중심에 두는 선택이라 마음의 안정과 함께할 기쁨이 커요.',
      ['정서적으로 든든한 버팀목이 생겨요', '함께 계획을 세우며 삶의 방향이 분명해져요', '가족·주변의 지지를 얻기 쉬워요'],
      ['내 시간과 자유가 줄어들 수 있어요', '서로 다른 생활 방식이 부딪힐 수 있어요', '상대의 기대에 맞추다 나를 놓칠 수 있어요'],
      ['상대와 “5년 뒤 우리 모습”을 각자 써서 바꿔 읽기', '돈·집안일·가족 행사 기준을 미리 이야기하기', '다툴 때 푸는 방식이 맞는지 확인하기'],
      '함께하는 일상이 자리를 잡아 가요. 작은 차이를 그때그때 이야기하는 습관이 관계의 체력을 만들어요.',
      '함께 쌓은 시간이 큰 힘이 돼요. 이 무렵 집·아이·일처럼 함께 정해야 할 큰 결정이 찾아와요.'],
    6: ['이동·변화의 길이에요. 익숙한 곳을 떠나 새 환경으로 가는 선택이라 시야가 넓어지고 새 기회를 만나요.',
      ['새 환경에서 새로운 나를 발견해요', '사람·일의 선택지가 넓어져요', '정체된 느낌에서 벗어날 수 있어요'],
      ['적응 기간 동안 외로움과 피로가 커요', '이사·정착 비용이 생각보다 커요', '기존 인연과 멀어질 수 있어요'],
      ['그곳에서 2주 이상 살아 보거나 먼저 다녀온 사람 3명에게 묻기', '주거·일·언어 중 가장 걱정되는 하나부터 해결하기', '돌아올 수 있는 조건을 미리 정해 두기'],
      '처음 반년은 적응의 시간이에요. 새 사람을 만나는 자리에 일부러 나가면 정착이 빨라져요.',
      '새 환경이 내 것이 되어 처음의 선택이 맞았는지 보여요. 넓어진 경험이 다음 기회의 바탕이 돼요.'],
    '-1': ['사주로 뚜렷한 분야가 잡히지 않는 선택이에요. 이럴 때는 기운보다 조건과 마음이 더 중요해요.',
      ['내 뜻대로 방향을 정할 여지가 커요', '정해진 틀이 없어 유연하게 바꿀 수 있어요', '해 보면서 답을 찾을 수 있어요'],
      ['기준이 없으면 결정을 계속 미루게 돼요', '주변 의견에 쉽게 흔들릴 수 있어요', '해 보지 않으면 장단점이 보이지 않아요'],
      ['나에게 가장 중요한 기준 하나(성장·돈·사람·시간) 정하기', '작게 먼저 해 보기', '결정할 날짜를 먼저 정하기'],
      '해 본 만큼 판단 기준이 생겨요. 처음의 기대와 실제를 비교해 기록해 두세요.',
      '경험이 쌓여 다음 선택이 훨씬 쉬워져요.'],
  };
  const S_ = window.SAJU;
  function deepHTML(c, R, sims) {
    const m = mbtiTraits(c.mbti.type);
    const mFit = g => g === 0 ? (m.E ? '밖으로 뻗는 E 성향이라 사람을 만나며 길을 넓히기 좋아요.' : '혼자 깊이 파는 I 성향이라 사람을 만나는 일을 일정으로 정해 두면 좋아요.')
      : g === 1 ? (m.N ? '직관형 N이라 새로운 아이디어가 끊이지 않아요. 끝맺음만 챙기세요.' : '현실형 S라 손에 잡히는 결과물부터 만들면 오래가요.')
      : g === 2 ? (m.T ? '숫자로 판단하는 T라 계산은 강점이에요. 마음의 만족도 함께 따져 보세요.' : '감정형 F라 돈 결정이 마음에 흔들리기 쉬워요. 숫자 기준을 미리 적어 두세요.')
      : g === 3 || g === 4 ? (m.J ? '계획형 J라 정해진 틀 안에서 실력이 잘 쌓여요.' : '유연한 P라 틀이 답답할 수 있어요. 나만의 작은 재미를 함께 정해 두세요.')
      : g === 5 ? (m.T ? '논리형 T라 관계에서도 옳고 그름을 따지기 쉬워요. 공감 한마디를 먼저 건네세요.' : '관계를 중시하는 F 성향이라 마음을 나누는 데 강해요. 내 마음도 챙기세요.')
      : g === 6 ? (m.N ? '새 환경을 즐기는 N 성향이라 변화에 빨리 적응해요.' : '익숙함이 편한 S 성향이라 미리 살아 보는 준비가 특히 중요해요.')
      : `${c.mbti.type} 성향을 살려 내가 편한 방식으로 시작해 보세요.`;
    const best = R.best;
    return R.L.map((x, i) => {
      const g = x.main, D = GDEEP[g] || GDEEP['-1'], sm = sims && sims[i];
      // 기준 연도 대운과의 관계 (대표·보조 분야 기준 — 대화 상담과 같은 분류)
      const Lk = c.luck, yr = c.Y !== c.cur ? `${c.Y}년 기준` : '지금';
      const luckLine = g < 0 || g > 6 || !Lk ? '' : Lk.g === g ? `${yr} 대운(${Lk.name})이 이 선택의 대표 분야와 같은 방향이에요.`
        : x.sub >= 0 && x.w > 0 && Lk.g === x.sub ? `${yr} 대운(${Lk.name})은 이 선택의 보조 분야(${GN[x.sub]})와 같은 방향이에요. 대표 분야(${GN[g]})를 직접 미는 흐름은 아니라 준비를 단단히 하세요.`
        : g <= 4 && c.yearG === g ? `${c.Y}년 세운이 이 방향을 밀어 주는 해로 해석해요.`
        : g <= 4 && c.nextD && c.nextD.g === g ? `세는나이 ${c.nextD.age}세(${c.nextD.yr}년)부터 오는 다음 대운이 이 방향이에요. 지금은 준비하고 그때 크게 움직이는 그림이 좋아요.`
        : `${yr} 대운(${Lk.name})이 이 방향을 직접 밀어 주지는 않아요. 서두르기보다 준비를 단단히 하세요.`;
      return `<div class="hcard cs-deep${i === best ? ' best' : ''}"><h3 class="ht">🔍 ${AB[i]} · ${esc(x.t)} <small>${x.base}점${i === best ? ' · 사주 흐름과 더 겹침' : ''}</small></h3>
        <p class="cs-p"><b>사주로 본 의미</b> — ${D[0]} ${luckLine}</p>
        <p class="cs-p"><b>점수 근거</b> — 분야 ${gLabel(x)} · 사주 ${x.saju >= 0 ? '+' : ''}${x.saju} · 성향 ${x.mbti >= 0 ? '+' : ''}${x.mbti} → 기본 ${x.base}점${x.why.length ? ` (${x.why.join(' · ')})` : ''}</p>
        <div class="cs-two"><div><b>👍 잘 맞는 점</b><ul>${D[1].map(t => `<li>${t}</li>`).join('')}</ul></div><div><b>⚠️ 조심할 점</b><ul>${D[2].map(t => `<li>${t}</li>`).join('')}</ul></div></div>
        <p class="cs-p"><b>🧠 내 성향과의 궁합</b> — ${mFit(g)}</p>
        <p class="cs-p"><b>📅 이 선택의 기운이 들어오는 달</b> — ${monthLine(c, x)}</p>
        <p class="cs-p"><b>🌱 1년 뒤</b> — ${D[4]}</p>
        <p class="cs-p"><b>🌳 3년 뒤</b> — ${D[5]}</p>
        ${sm ? `<p class="cs-p"><b>🎲 가상 인생</b> — 이 길을 끝까지 살아 본 결과 ${sm.grade}등급 「${esc(sm.type)}」${sm.alive10 ? ` · 10년 뒤 행복 ${sm.hap10}` : ''} <small>(게임 결과 · 점수에는 넣지 않아요)</small></p>` : ''}
        <div class="cs-prep"><b>🧰 이 길을 고른다면 먼저 할 일</b>${D[3].map(t => `<label><input type="checkbox"><span>${t}</span></label>`).join('')}</div></div>`;
    }).join('');
  }
  // 4주 계획: 1~3주 = 결정 전 공통 준비 · 4주 = 선택 후 실행 (선택지별 행동·시기, execPlan)
  function planHTML(c, R) {
    const mp = c.mp, E = execPlan(c, R), ri = R.L.findIndex(y => y.risk);
    const tgt = ri >= 0 ? `‘${esc(R.L[ri].t)}’` : '각 선택지', tj = ri >= 0 ? josa(R.L[ri].t, '을', '를') : '를';
    return `<div class="hcard"><h3 class="ht">🗓️ 결정까지 4주 계획</h3><div class="cs-plan">
      <div><b>1주차</b><span>공통 준비 — 선택지마다 좋은 점·걱정되는 점을 3개씩 적고, ${R.fl.length ? `${R.fl.join('·')} 조건을 기준으로` : '가장 중요한 기준 하나에'} 동그라미를 쳐요.</span></div>
      <div><b>2주차</b><span>공통 준비 — ${tgt}${tj} 먼저 겪어 본 사람 2~3명에게 실제 모습을 물어봐요. 비용·수입·시간이 상상과 다른 점을 기록해요.</span></div>
      <div><b>3주차</b><span>공통 준비 — 되돌릴 수 있는 작은 시험(체험·면담·견적·상담)을 하나 해 봐요. 해 본 뒤 마음이 더 가벼운 쪽을 확인해요.</span></div>
      <div><b>4주차</b><span>선택 후 실행 — ${E.lines.map(esc).join(' ')}${(() => { const said = E.lines.join(' '), rest = mp.caution.filter(m => !said.includes(mp.label(m))); return rest.length ? ` ${mp.labels(rest)}은 실행보다 조건 점검에 쓰세요.` : ''; })()}</span></div></div></div>`;
  }

  /* ---------- 상담 결과 구성 (기기 안 계산 · 공통 분석 R 사용) ---------- */
  const AB = ['A', 'B', 'C'];
  function compose(c, opts, R, sims) {
    const a = c.a, m = mbtiTraits(c.mbti.type), L = c.luck, mp = c.mp, total = R.sc, best = R.best, tie = R.tie;
    const line = tie
      ? `두 선택의 기본 점수가 거의 같아요(${total.join(' vs ')}). 사주 흐름으로는 <b>우열을 가리지 않아요</b>.`
      : `기본 점수로는 <b>‘${esc(opts[best])}’</b> 쪽이 사주 흐름과 더 겹쳐요(${[...total].sort((x, y) => y - x).slice(0, 2).join(' vs ')}${R.L[best].why[0] ? ` · 근거: ${R.L[best].why.slice(0, 2).join(', ')}` : ''}).`;
    const mtip = (m.J ? '계획형(J)이라 결정 뒤 흔들리지 않는 대신, 정보가 부족해도 빨리 결론을 내리는 함정이 있어요. 결정 기한을 일부러 2주 늦춰 보세요.' : '유연형(P)이라 기회를 잘 잡지만, 마지막까지 선택을 미루다 좋은 시기를 놓치기 쉬워요. 결정할 날짜를 먼저 정해 두세요.')
      + ' ' + (m.T ? '논리(T)로 판단하니 조건·숫자만 보다 마음의 만족을 놓치지 않게 "1년 뒤 나는 행복한가?"를 같이 물어보세요.' : '감정(F)을 중시하니 주변의 기대보다 내 마음이 끌리는 쪽을 따로 적어 보세요. 의외로 답이 빨리 나와요.');
    // 실천 팁: 선택지 개념에 맞는 주제 (위험이 큰 선택지 → 준비할 쪽 기준) — 고민 주제 버튼을 고르지 않아도 선택지와 어긋나지 않게
    const K2T = { biz: 'biz', free: 'biz', quit: 'biz', change: 'career', stay: 'career', job: 'career', study: 'study', exam: 'study', invest: 'money', save: 'money', art: 'hobby', love: 'love', family: 'love', move: 'move' };
    const tk = (R.L.find(x => x.risk) || R.L[0]).key, tips = TIPS[K2T[tk]] || TIPS[st.topic] || TIPS.career, G = Saju.gaeun(a);
    const acts = [
      ...tips,
      `📅 실행 시기: <b>${esc(execPlan(c, R).short)}</b> · <b>${mp.labels(mp.caution)}</b>은 서두르지 말고 조건을 점검하는 달이에요 (선택지별 상세·4주 계획과 같은 기준).`,
      `🌱 생활 습관: ${G.dmLine} ${G.fillLine} ${G.note}`,
    ];
    const KS = Fork.KS || ['wealth', 'bond', 'health', 'achieve', 'joy'];
    const groups = R.L.map(x => x.main);
    const simHTML = !sims && groups.every(g => g === groups[0]) ? `<div class="hcard"><h3 class="ht">🎲 인생 게임 시뮬레이션</h3><p class="cs-p">두 선택이 같은 분야(${R.L[0].main >= 0 ? GN[R.L[0].main] : '일반'})라 인생 전체의 큰 흐름은 비슷하게 나와요. 그래서 이번에는 가상 인생 비교를 생략했어요.</p></div>` : sims ? `<div class="hcard"><h3 class="ht">🎲 인생 게임으로 미리 살아 본 결과</h3>
      <p class="sjnote">${c.p.name ? esc(c.p.name) + '님과' : '나와'} 같은 생년월일·시간으로 태어난 가상 인물을 ${c.Y}년 기준 만 ${c.age}세(세는나이 ${c.ages.kor}세)까지 키운 뒤, 선택지마다 3번씩 끝까지 살아 봤어요. 게임 결과는 위의 기본 점수에 넣지 않아요.</p>
      <div class="fk-cmp"><div class="fk-cmph"><span></span>${opts.slice(0, 3).map((o, i) => `<b>${AB[i]}</b>`).join('')}</div>
      ${KS.map(k => { const mx = Math.max(...sims.map(r => r.A[k])); return `<div class="fk-row"><span>${EVAL_N[k][0]} ${EVAL_N[k][1]}</span>${sims.map(r => `<i class="${r.A[k] === mx && sims.length > 1 ? 'win' : ''}"><em style="width:${r.A[k]}%"></em><small>${r.A[k]}</small></i>`).join('')}</div>`; }).join('')}</div>
      ${sims.map((r, i) => `<div class="cs-sim"><b>${AB[i]} · ${esc(opts[i])}</b> → ${r.grade}등급 「${r.type}」 · 10년 뒤 ${r.alive10 ? `${usd(r.money10)} · 행복 ${r.hap10}` : '—'}</div>`).join('')}
      <p class="sjnote">게임 속 인생은 재미로 보는 가상 실행이에요. 실제 직업·자산은 반영되지 않아요.</p></div>` : '';
    const conds = pickConds();
    const html = `<div class="cs-badge">📊 기본 분석 · 이 기기 안에서 계산 · ${c.Y}년 기준 · 작성일 ${c.made}</div><div class="hcard cs-res"><div class="cs-q">“${esc(st.q || opts.join(' vs '))}”</div>
      <div class="cs-und"><b>제가 이해한 내용</b><br>${opts.map((o, i) => `선택 ${AB[i]}: ${esc(o)}`).join('<br>')}<br>고려할 조건: ${esc(conds.join(' / ') || '따로 적은 조건 없음')}</div>
      <div class="cs-real">${md(realHTML(opts, conds))}<br><br>${md(checkQs(opts, conds))}</div>
      <p class="sjnote">아래 기본 점수는 대운·세운·타고난 기운(사주)과 MBTI 성향이 그 선택의 분야와 겹치는 정도를 정해진 규칙으로 합산한 참고값이며, 성공 가능성을 뜻하지 않아요. 대화 상담과 같은 계산이고, 인생 게임 결과는 점수에 넣지 않아요. 결정은 현실 조건을 먼저 기준으로 삼으세요.</p>
      <h3 class="ht">🧭 사주로 보는 종합 의견</h3><p class="cs-line">${line}</p><p class="cs-line"><b>현실 조건을 반영한 조언</b> — ${esc(R.final)}</p>
      <div class="cs-opts">${R.L.map((x, i) => `<div class="cs-opt${i === best ? ' best' : ''}"><div class="cs-oh"><b>${AB[i]}</b><span>${esc(x.t)}</span><em>${x.base}</em></div>
        <div class="cs-ob"><i style="width:${x.base}%"></i></div><small>${gLabel(x)} 분야 · ${x.why.slice(0, 2).join(' · ') || '사주에서 특별히 막거나 미는 기운은 없어요'}</small></div>`).join('')}</div></div>
      <div class="hcard"><h3 class="ht">🔮 사주로 본 지금</h3>
        <p class="cs-p"><b>${L.e} ${c.Y !== c.cur ? `${c.Y}년 기준 대운` : '지금 대운'}: ${L.name}</b> (${Saju.luckSpan(L)}) — ${L.desc}${c.Y !== c.cur && c.luckNow.start !== L.start ? ` 지금(${c.cur}년)은 ${c.luckNow.name} 대운(${Saju.luckSpan(c.luckNow)})이에요.` : ''}</p>
        ${c.nextD ? `<p class="cs-p">⏭️ 세는나이 ${c.nextD.age}세(${c.nextD.yr}년)부터는 ${c.nextD.g === L.g ? `<b>${Saju.GRPN[c.nextD.g]}</b> 흐름이 한 번 더 이어져요.` : `<b>${Saju.GRPN[c.nextD.g]}</b>으로 바뀌어요.`}</p>` : ''}
        <p class="cs-p">📆 ${c.Y}년(${c.ny.gzTxt}년) 움직이기 좋은 달 <b>${mp.labels(mp.go)}</b> · 조건을 점검할 달 <b>${mp.labels(mp.caution)}</b></p>
        <p class="cs-p">🌿 타고난 기질: ${a.dm.nm} — ${a.dm.key}</p>
        <p class="sjnote">나이 기준: ${c.Y}년 세는나이 ${c.ages.kor}세 · 만 ${c.ages.manBefore}세(생일 전)~${c.ages.manAfter}세(생일 뒤).${c.p.time ? '' : ' 출생 시간을 몰라 시주를 빼고 해석했고, 대운 시작 나이는 정오 출생으로 가정한 추정값이에요.'}</p></div>
      <div class="hcard"><h3 class="ht">🧠 ${c.mbti.sure ? 'MBTI' : '사주 MBTI'} 기반 결정 스타일 · ${c.mbti.type}</h3><p class="cs-p">${mtip}</p><p class="sjnote">기준: ${c.mbti.src}</p></div>
      <h3 class="cs-sec">🔍 선택지별 상세 풀이</h3>${deepHTML(c, R, sims)}
      ${simHTML}
      ${planHTML(c, R)}
      <div class="hcard"><h3 class="ht">✅ 바로 해 볼 일</h3>${acts.map(x => `<p class="cs-p">${x}</p>`).join('')}
      ${c.game ? `<p class="sjnote">🎮 지금까지 인생 게임 ${c.game.n}판 · 최고 「${esc(c.game.best.title)}」(${c.game.best.grade}) — 게임 속에서도 선택의 결과를 비교해 보세요.</p>` : ''}</div>
      <p class="sjnote" style="text-align:center">※ 명리 이론과 게임 시뮬레이션을 바탕으로 한 참고·재미용 상담이에요. 건강·법률·투자처럼 중요한 결정은 전문가와 꼭 상의하세요.</p>`;
    return { html, best, pick: R.pick, total, tie };
  }
  function bindResult() { }

  /* ---------- 인생 게임 갈림길에서 바로 상담 ---------- */
  function forGame(ev, R) {
    if (!P || !P.saju) return '';
    const luck = Saju.luckAt(P.saju, P.age), opts = ev.ch.slice(0, R.length).map(x => String(x.t).replace(/<[^>]+>/g, '').trim());
    const sc = R.map((r, i) => { const g = groupOf(opts[i]); let s = r.total; if (g >= 0 && g <= 4 && luck && luck.g === g) s += 8; if (g >= 0 && g <= 4 && P.saju.dom === g) s += 5; return clampN(s); });
    const b = sc.indexOf(Math.max(...sc));
    return `<div class="cs-game"><b>🤖 사주 상담 한마디</b><p>${P.name}의 지금 대운은 <b>${luck.e} ${luck.name}</b>. ${luck.desc} 사주 흐름과 미리 살아 본 결과를 함께 보면 <b>${AB[b]} · ${opts[b]}</b> 쪽이 조금 더 맞아요.</p>
      <small>실제 내 인생의 고민은 홈 → 🤖 사주 상담에서 물어볼 수 있어요.</small></div>`;
  }

  function init() {
    Hub.register({
      item: { k: 'counsel', g: 'saju', c: 'mint', ic: 'spark', e: '🧭', n: '사주 상담', d: '대화 상담 · 선택지 비교 상담', need: 1, f: () => Hub.go('counsel') },
      after: 'tojeong', title: '사주 상담',
      html: pageHTML, bind: (p, a) => bind(p, a, () => Hub.render()),
    });
  }
  return { hist: p => hist(p), pastHTML, init, credits, addCredits, forGame, ctxOf, groupOf, localReply, optionsOf, topicOf, parseAsk, askContext, classify, analyzeOpts, normOpt, splitConds };
})();
Counsel.init();
