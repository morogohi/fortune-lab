/* =====================================================================
 *  fortune.js — 오늘의 운세 · 시간대별 흐름 · 행운 아이템 · 신년운세
 *   모든 운세는 '오늘의 일진(日辰)'과 '내 일간'의 십성 관계로 계산합니다.
 *   같은 사람·같은 날짜면 언제 열어도 같은 결과가 나옵니다(결정적 계산).
 * ===================================================================== */
window.Fortune = (() => {
  const S = window.SAJU;
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /* 문자열 → 0~1 난수 (날짜·사람별로 고정) */
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* 날짜의 일진 */
  function dayGz(d) {
    const p = S.pillars('s', d.getFullYear(), d.getMonth() + 1, d.getDate(), 12, 0, false, false, 'm');
    return p.d;
  }

  const AREAS = ['총운', '애정', '금전', '직장', '건강'];
  const AREA_E = ['🌟', '💕', '💰', '💼', '🩺'];
  // 십성 그룹(0 비겁·1 식상·2 재성·3 관성·4 인성)별 분야 보정치
  const MOD = [
    [2, -2, -6, -3, 6],
    [6, 9, 3, -2, 0],
    [7, 4, 12, 3, -2],
    [3, 2, 0, 11, -5],
    [5, 3, -3, 6, 7],
  ];
  const KEY = ['자기 주도', '표현과 재능', '실속과 기회', '책임과 인정', '배움과 도움'];
  const TXT = [
    ['나와 같은 기운이 들어와 자신감이 붙는 날이에요. 내 페이스대로 밀고 나가세요.',
     '친구 같은 편안한 인연이 가까이 있어요. 같이 웃을 일을 만들어 보세요.',
     '함께 쓰는 돈, 나눠 내는 돈이 늘기 쉬워요. 빌려주는 일은 오늘은 쉬어 가세요.',
     '경쟁자가 신경 쓰이는 날. 비교보다 내 결과물에 집중하면 이겨요.',
     '체력이 받쳐 주는 날이에요. 미뤄 둔 운동을 시작하기 좋아요.'],
    ['아이디어가 술술 나오는 날이에요. 생각난 것은 바로 적어 두세요.',
     '말과 표정에 매력이 묻어나요. 먼저 연락하면 반응이 좋아요.',
     '재능이 돈이 되는 흐름이에요. 작은 부업·판매·제안이 통해요.',
     '말이 앞서면 윗사람과 부딪힐 수 있어요. 결과로 보여 주세요.',
     '먹는 즐거움이 커지는 날. 과식만 조심하면 컨디션이 좋아요.'],
    ['현실적인 성과가 손에 잡히는 날이에요. 미뤄 둔 일을 마무리하세요.',
     '실속 있는 만남이 생겨요. 함께 맛있는 것을 먹으면 가까워져요.',
     '돈의 흐름이 살아나요. 계약·정산·영업에 유리한 날이에요.',
     '숫자로 증명할 수 있는 일을 맡으면 평가가 좋아요.',
     '바쁘게 움직이다 지치기 쉬워요. 끼니를 거르지 마세요.'],
    ['책임이 늘지만 그만큼 인정받는 날이에요. 약속과 원칙을 지키세요.',
     '진지한 대화가 관계를 깊게 해요. 가볍게 넘기지 말고 마음을 표현하세요.',
     '큰 지출보다 지키는 쪽이 맞는 날이에요. 고정비를 점검해 보세요.',
     '윗사람의 눈에 띄는 날. 보고와 마감을 깔끔하게 하면 점수를 따요.',
     '긴장이 어깨와 목으로 올 수 있어요. 스트레칭으로 풀어 주세요.'],
    ['배움과 도움의 기운이 들어오는 날이에요. 조언을 구하면 길이 보여요.',
     '배려 깊은 사람이 곁에 있어요. 고맙다는 말을 먼저 건네 보세요.',
     '당장의 수입보다 공부·자격·문서에 쓰는 돈이 남는 날이에요.',
     '자료 정리·기획·문서 작업이 술술 풀려요. 귀인의 추천이 있을 수 있어요.',
     '생각이 많아 잠이 얕아질 수 있어요. 일찍 쉬는 게 좋아요.'],
  ];
  const TIP = [
    ['오늘은 몸을 아끼고 무리한 결정을 미루세요.', '평소대로 차분하게 가면 무난한 하루예요.', '흐름이 좋아요. 미뤄 둔 일을 시도해 보세요!'],
  ];
  const BAND = [
    '내 힘으로 밀어붙이기 좋은 시간',
    '말과 아이디어가 빛나는 시간',
    '실속을 챙기기 좋은 시간',
    '책임 있는 일을 처리하기 좋은 시간',
    '공부·정리·휴식에 좋은 시간',
  ];
  const BANDS = [['오전', '09~11시', 5], ['오후', '13~15시', 7], ['저녁', '17~19시', 9]];

  const HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  const CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  const SAM = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
  const pair = (ps, x, y) => ps.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
  function relation(b1, b2) {
    if (pair(HAP6, b1, b2)) return { k: 'hap', n: '육합', d: '마음 맞는 사람과 손발이 척척 맞는 날', v: 6 };
    if (pair(CHUNG, b1, b2)) return { k: 'chung', n: '충', d: '변동과 이동이 많은 날 — 서두르지 말고 한 번 더 확인하세요', v: -7 };
    if (b1 !== b2 && SAM.some(s => s.includes(b1) && s.includes(b2))) return { k: 'sam', n: '삼합', d: '주변의 도움이 모여드는 날', v: 4 };
    if (b1 === b2) return { k: 'same', n: '같은 지지', d: '익숙한 일이 반복되는 날 — 습관을 점검하기 좋아요', v: 1 };
    return null;
  }

  const LUCK = [
    { c: '초록 · 청록', n: [3, 8], dir: '동쪽', it: '작은 화분, 나무 소품' },
    { c: '빨강 · 주황', n: [2, 7], dir: '남쪽', it: '향초, 붉은 소품' },
    { c: '노랑 · 베이지', n: [5, 10], dir: '가운데(집 근처)', it: '도자기 컵, 흙빛 소품' },
    { c: '흰색 · 은색', n: [4, 9], dir: '서쪽', it: '시계, 금속 액세서리' },
    { c: '검정 · 남색', n: [1, 6], dir: '북쪽', it: '텀블러 (물 자주 마시기)' },
  ];

  const clamp = v => Math.max(30, Math.min(99, Math.round(v)));
  function grade(v) { return v >= 85 ? '대길' : v >= 72 ? '길' : v >= 58 ? '평' : '주의'; }

  /* a = Saju.analyze 결과, key = 사람 식별 문자열 */
  function today(a, key, d = new Date()) {
    const gz = dayGz(d), me = a.me;
    const ts = S.tg10(me, gz.s), tb = S.tg10(me, S.HID[gz.b]);
    const rnd = seeded(key + '|' + ymd(d));
    const rd = relation(a.p.d.b, gz.b), ry = relation(a.p.y.b, gz.b);
    const rel = rd ? { ...rd, who: '일지(배우자 자리)' } : ry ? { ...ry, who: '띠(년지)' } : null;
    const helps = S.SE[gz.s] === a.weak || S.BE[gz.b] === a.weak;
    const base = 60 + (rel ? rel.v : 0) + (helps ? 5 : 0);
    const sc = AREAS.map((_, i) => clamp(base + MOD[ts.g][i] * 1.3 + MOD[tb.g][i] * 0.5 + (rnd() * 26 - 13)));
    const tone = s => s >= 72 ? 2 : s >= 55 ? 1 : 0;
    const lines = AREAS.map((_, i) => TXT[ts.g][i]);
    const bands = BANDS.map(([lab, time, hb]) => {
      const hs = (((gz.s % 5) * 2) + hb) % 10, t = S.tg10(me, hs);
      return { lab, time, gz: { s: hs, b: hb }, n: t.n, txt: BAND[t.g], sc: clamp(base + MOD[t.g][0] + (rnd() * 20 - 10)) };
    });
    const L = LUCK[a.weak], r2 = rnd();
    const lucky = { el: a.weak, color: L.c, num: L.n[r2 < .5 ? 0 : 1], dir: L.dir, item: L.it };
    const one = `${KEY[ts.g]}의 날 · ${TIP[0][tone(sc[0])]}`;
    return {
      date: ymd(d), gz, ts, tb, rel, helps, sc, grade: grade(sc[0]), lines, bands, lucky, one,
      gzTxt: S.STK[gz.s] + S.BRK[gz.b], gzHan: S.ST[gz.s] + S.BR[gz.b], key: KEY[ts.g],
    };
  }

  /* 알림 문구용 짧은 요약 */
  function brief(a, key, d) {
    const f = today(a, key, d);
    return { title: `오늘은 ${f.gzTxt}일 · 총운 ${f.sc[0]}점 (${f.grade})`, body: `${f.key}의 날. ${f.lines[0]}` };
  }

  /* 2027 정미년 신년운세 */
  function newYear(a, year = 2027) {
    const yg = S.yearGz(year), ts = S.tg10(a.me, yg.s), tb = S.tg10(a.me, S.HID[yg.b]);
    const sx = S.SEUN[ts.g], sb = S.SEUN[tb.g];
    const yrel = relation(a.p.y.b, yg.b), drel = relation(a.p.d.b, yg.b);
    const start = ((yg.s % 5) * 2 + 2) % 10;
    const months = Array.from({ length: 12 }, (_, n) => {
      const s = (start + n) % 10, b = (2 + n) % 12, t = S.tg10(a.me, s), r = relation(a.p.d.b, b);
      const v = clamp(62 + MOD[t.g][0] * 1.4 + (r ? r.v * 1.2 : 0) + (S.SE[s] === a.weak ? 6 : 0));
      const solarM = n + 2 > 12 ? n + 2 - 12 : n + 2;
      return { n, s, b, solarM, yr: n + 2 > 12 ? year + 1 : year, ten: t.n, txt: S.WOL[t.g], v, rel: r };
    });
    const best = [...months].sort((x, y) => y.v - x.v).slice(0, 2), worst = [...months].sort((x, y) => x.v - y.v)[0];
    return { year, yg, ts, tb, sx, sb, yrel, drel, months, best, worst, gzTxt: S.STK[yg.s] + S.BRK[yg.b], gzHan: S.ST[yg.s] + S.BR[yg.b] };
  }

  return { today, brief, newYear, dayGz, ymd, AREAS, AREA_E, LUCK, grade, seeded };
})();
