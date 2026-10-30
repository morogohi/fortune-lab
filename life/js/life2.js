/* =====================================================================
 *  life2.js — 피드백 반영 시스템
 *  놀이 · 과목별 공부 · 취미 · 전공 · 직급/승진 · 이상형/연애/이별/결혼 · 자녀 · 집 · 버킷리스트
 *  (game.js의 전역 함수 P, fx, log, showModal, playAnim, M, usd 등을 실행 시점에 사용)
 * ===================================================================== */

/* ---------- 데이터 ---------- */
const SUBJ = [
  { k: 'kor', n: '국어', e: '📖' }, { k: 'math', n: '수학', e: '➗' }, { k: 'eng', n: '영어', e: '🔤' },
  { k: 'sci', n: '과학', e: '🔬' }, { k: 'soc', n: '사회', e: '🌏' }, { k: 'code', n: '코딩', e: '💻' },
  { k: 'music', n: '음악', e: '🎵' }, { k: 'art', n: '미술', e: '🎨' }, { k: 'pe', n: '체육', e: '⚽' },
];
const PLAYS = [
  { id: 'blocks', n: '블록 쌓기', e: '🧱', fx: { smart: 3 }, sub: 'math', say: ['높이 쌓았다!', '와르르… 다시!', '성을 만들었어!'] },
  { id: 'doll', n: '인형놀이', e: '🧸', fx: { bond: 3, hap: 3 }, sub: 'kor', say: ['곰돌이랑 소꿉 대화', '인형 병원 놀이', '인형에게 이름을 지어줬다'] },
  { id: 'jumprope', n: '줄넘기', e: '🪢', fx: { hp: 4 }, sub: 'pe', say: ['100개 성공!', '2단 뛰기 도전!', '하나, 둘, 셋…'] },
  { id: 'hide', n: '숨바꼭질', e: '🙈', fx: { hap: 5 }, sub: null, say: ['못 찾겠다 꾀꼬리~', '찾았다!', '꼭꼭 숨어라~'] },
  { id: 'draw', n: '그림 그리기', e: '🖍️', fx: { hap: 2 }, sub: 'art', say: ['우리 가족 그림', '무지개를 그렸다', '벽에 낙서… 혼났다'] },
  { id: 'sand', n: '모래놀이', e: '🏖️', fx: { hap: 4, smart: 1 }, sub: null, say: ['모래성 완성!', '두꺼비집 만들기', '터널 뚫었다!'] },
  { id: 'bike', n: '자전거', e: '🚲', fx: { hp: 3, hap: 3 }, sub: 'pe', say: ['보조바퀴 뗐다!', '쌩쌩 달린다', '넘어져도 다시!'] },
  { id: 'ball', n: '공놀이', e: '⚽', fx: { hp: 3, hap: 2 }, sub: 'pe', say: ['골인!', '패스!', '공 차기 대장'] },
  { id: 'cook', n: '소꿉놀이', e: '🍳', fx: { bond: 4 }, sub: null, say: ['흙밥 드세요~', '엄마 역할 맡았다', '맛있는 요리 완성'] },
  { id: 'origami', n: '종이접기', e: '🦢', fx: { smart: 2 }, sub: 'art', say: ['종이학 완성', '비행기 날리기!', '개구리 폴짝'] },
];
const HOBBIES = [
  { k: '기타', e: '🎸', st: { hap: 2, look: 1 }, sub: 'music' }, { k: '피아노', e: '🎹', st: { hap: 2, smart: 1 }, sub: 'music' },
  { k: '축구', e: '⚽', st: { hp: 3 }, sub: 'pe', sport: 1 }, { k: '농구', e: '🏀', st: { hp: 3, look: 1 }, sub: 'pe', sport: 1 },
  { k: '수영', e: '🏊', st: { hp: 4 }, sub: 'pe', sport: 1 }, { k: '독서', e: '📚', st: { smart: 2 }, sub: 'kor' },
  { k: '요리', e: '🍳', st: { bond: 2, hap: 1 } }, { k: '사진', e: '📷', st: { hap: 2 }, sub: 'art' },
  { k: '게임', e: '🎮', st: { hap: 3, smart: -1 }, sub: 'code' }, { k: '등산', e: '🥾', st: { hp: 3, hap: 1 } },
  { k: '댄스', e: '💃', st: { look: 2, hp: 2 }, sub: 'pe' }, { k: '바둑', e: '⚫', st: { smart: 2 } },
  { k: '그림', e: '🎨', st: { hap: 2 }, sub: 'art' }, { k: '캠핑', e: '🏕️', st: { hap: 2, bond: 1 } },
];
const MAJORS = [
  { id: 'cs', n: '컴퓨터공학', e: '💻', sub: ['math', 'code'], cut: 62 }, { id: 'ee', n: '전기전자공학', e: '⚡', sub: ['math', 'sci'], cut: 58 },
  { id: 'med', n: '의학', e: '🩺', sub: ['sci', 'math'], cut: 84 }, { id: 'nurse', n: '간호학', e: '💉', sub: ['sci', 'kor'], cut: 55 },
  { id: 'biz', n: '경영학', e: '📊', sub: ['soc', 'math'], cut: 58 }, { id: 'law', n: '법학', e: '⚖️', sub: ['kor', 'soc'], cut: 72 },
  { id: 'edu', n: '교육학', e: '🍎', sub: ['kor', 'eng'], cut: 56 }, { id: 'art', n: '예술', e: '🎨', sub: ['art', 'music'], cut: 45 },
  { id: 'hum', n: '인문학', e: '📜', sub: ['kor', 'eng'], cut: 48 }, { id: 'sci', n: '자연과학', e: '🔬', sub: ['sci', 'math'], cut: 55 },
  { id: 'pe', n: '체육학', e: '🏃', sub: ['pe'], cut: 40 },
];
const LADDERS = {
  corp: ['사원', '대리', '과장', '차장', '부장', '상무', '전무', '사장'],
  doctor: ['인턴', '레지던트', '전문의', '과장', '부원장', '병원장'],
  nurse: ['간호사', '책임간호사', '수간호사', '간호부장'],
  teacher: ['교사', '부장교사', '교감', '교장'],
  dev: ['주니어', '시니어', '테크리드', 'CTO'],
  elec: ['전기기사', '주임', '현장소장', '전기기술사·대표'],
  lawyer: ['어소시에이트', '시니어', '파트너', '대표변호사'],
  farm: ['소농', '자영농', '대농', '농장주'],
  market: ['노점상', '가게 주인', '가게 2곳', '상가 건물주'],
  factory: ['생산직', '반장', '조장', '공장장'],
  day: ['일용직', '기능공', '팀장', '현장소장'],
  driver: ['기사', '베테랑 기사', '배달 대행 사장'],
  creator: ['새싹', '실버버튼', '골드버튼', '다이아버튼'],
  artist: ['무명', '신인', '중견', '거장'],
  athlete: ['신인', '주전', '국가대표', '레전드'],
  chef: ['막내', '라인쿡', '수셰프', '오너셰프'],
};
const IDEALS = [
  { k: 'look', e: '😍', n: '외모' }, { k: 'kind', e: '😊', n: '다정한 성격' }, { k: 'rich', e: '💼', n: '능력·경제력' },
  { k: 'fun', e: '🤣', n: '유머 감각' }, { k: 'smart', e: '🧠', n: '지적인 대화' }, { k: 'value', e: '🤝', n: '가치관' },
];
const TRAITS = [
  { t: '눈에 띄는 외모', k: 'look' }, { t: '패션 센스', k: 'look' }, { t: '다정다감', k: 'kind' }, { t: '배려심 깊음', k: 'kind' },
  { t: '성공한 커리어', k: 'rich' }, { t: '알뜰한 저축왕', k: 'rich' }, { t: '개그 본능', k: 'fun' }, { t: '분위기 메이커', k: 'fun' },
  { t: '책벌레', k: 'smart' }, { t: '말이 잘 통함', k: 'smart' }, { t: '가족 중심', k: 'value' }, { t: '봉사 정신', k: 'value' },
];
const MEET = [
  { id: 'blind', n: '소개팅', e: '☕', s: '친구가 주선' }, { id: 'club', n: '동호회·취미 모임', e: '🎯', s: '취미가 같은 사람' },
  { id: 'work', n: '학교·직장', e: '🏢', s: '매일 보는 사이' }, { id: 'app', n: '데이팅 앱', e: '📱', s: '많이 만나지만 복불복' },
];
const DATES = [
  { id: 'movie', n: '영화 보기', e: '🎬', cost: 60, aff: [4, 8], say: '팝콘 나눠 먹기' },
  { id: 'food', n: '맛집 탐방', e: '🍝', cost: 150, aff: [5, 10], say: '여기 진짜 맛있다!' },
  { id: 'park', n: '놀이공원', e: '🎡', cost: 250, aff: [7, 12], say: '관람차에서 두근두근' },
  { id: 'trip', n: '함께 여행', e: '✈️', cost: 1500, aff: [12, 18], say: '평생 기억할 여행' },
  { id: 'gift', n: '선물하기', e: '🎁', cost: 400, aff: [6, 11], say: '마음에 들어?' },
  { id: 'letter', n: '손편지', e: '💌', cost: 0, aff: [3, 9], say: '진심을 꾹꾹 눌러 썼다' },
  { id: 'talk', n: '진지한 대화', e: '🌙', cost: 0, aff: [2, 7], say: '미래 이야기를 나눴다' },
];
const HOMES = {
  parents: { n: '부모님 집', e: '🏠', price: 0 },
  monthly: { n: '원룸 월세', e: '🏢', rent: 9000 },
  jeonse: { n: '빌라 전세', e: '🏘️', deposit: 80000 },
  apt_s: { n: '소형 아파트', e: '🏙️', price: 300000, own: 1, vol: [-6, 12], st: { hap: 1 } },
  apt_l: { n: '대형 아파트', e: '🌆', price: 700000, own: 1, vol: [-6, 12], st: { hap: 2 } },
  country: { n: '전원주택', e: '🏡', price: 400000, own: 1, vol: [-3, 6], st: { hp: 2, bond: 2, hap: 2 } },
  house: { n: '단독주택', e: '🏘️', price: 500000, own: 1, vol: [-3, 8], st: { bond: 2, hap: 1 } },
  hut: { n: '흙집', e: '🛖', price: 50000, own: 1, vol: [-2, 4], st: { hap: 1 } },
  brick: { n: '벽돌집', e: '🧱', price: 150000, own: 1, vol: [-2, 6], st: { hap: 2, hp: 1 } },
};
const BUCKET = [
  { id: 'exec', e: '👔', t: '임원(상무 이상) 되기', ok: p => p.badges.has('임원 승진') },
  { id: 'doctor', e: '🩺', t: '의사 되기', ok: p => p.badges.has('의사 선생님') },
  { id: 'home', e: '🏠', t: '내 집 마련', ok: p => !!(p.home && HOMES[p.home.type].own) },
  { id: 'country', e: '🏡', t: '전원주택에서 살기', ok: p => p.home && p.home.type === 'country', tier: [1, 2] },
  { id: 'family', e: '👨‍👩‍👧‍👦', t: '결혼해서 아이 둘 키우기', ok: p => !!p.spouseName && p.kids >= 2 },
  { id: 'travel', e: '✈️', t: '여행 5번 다니기', ok: p => p.trips >= 5 },
  { id: 'rich', e: '💎', t: '자산 백만장자', ok: p => netWorth() >= M(1e6) },
  { id: 'old', e: '🎂', t: '85세까지 살기', ok: p => p.age >= 85 },
  { id: 'master', e: '🏅', t: '취미 하나 Lv10 달성', ok: p => Object.values(p.hlv).some(v => v >= 10) },
  { id: 'champ', e: '🏆', t: '대회 우승하기', ok: p => p.badges.has('대회 우승') },
  { id: 'biz', e: '🚀', t: '창업 성공', ok: p => p.badges.has('사업 성공') },
  { id: 'grand', e: '👶', t: '손주 안아보기', ok: p => p.badges.has('조부모') },
  { id: 'univ', e: '🎓', t: '대학 졸업하기', ok: p => p.edu >= 3 },
  { id: 'love', e: '💕', t: '평생의 사랑과 결혼하기', ok: p => !!p.spouseName },
];
const SAJU_BUCKET = ['biz', 'champ', 'rich', 'exec', 'univ'];

/* ---------- 초기화 ---------- */
function initLife2(P) {
  P.sub = {}; SUBJ.forEach(s => P.sub[s.k] = R(5, 20));
  P.hxp = {}; P.hlv = {}; P.major = null; P.certs = new Set();
  P.rank = 0; P.rankYears = 0; P.perf = 40;
  P.ideal = null; P.rel = null; P.exes = []; P.kidsList = [];
  P.home = { type: 'parents', value: 0 }; P.loan = 0; P.deposit = 0; P.trips = 0;
  P.bubble = null; P.contest = 0;
}
function pickBucket(P) {
  const ok = BUCKET.filter(b => !b.tier || b.tier.includes(P.tier));
  const first = P.saju ? ok.find(b => b.id === SAJU_BUCKET[P.saju.dom]) : null;
  const rest = ok.filter(b => b !== first).sort(() => Math.random() - .5);
  P.bucket = [first || rest.pop(), rest[0], rest[1]].map(b => ({ id: b.id, e: b.e, t: b.t, done: false, age: null, saju: b === first }));
}
function checkBucket() {
  if (!P || !P.bucket) return;
  P.bucket.forEach(b => {
    if (b.done) return;
    const def = BUCKET.find(x => x.id === b.id);
    if (def && def.ok(P)) {
      b.done = true; b.age = P.age; karma += 10; saveMeta();
      log(`🎯 버킷리스트 달성: ${b.e} ${b.t} (카르마 +10)`, 'good');
      cutin(b.e, '버킷리스트 달성!', b.t); Snd.sfx('fanfare');
    }
  });
  renderHud();
}
function netWorth() {
  if (!P) return 0;
  return P.money + (P.home && HOMES[P.home.type].own ? P.home.value : 0) + (P.deposit || 0) - (P.loan || 0);
}

/* ---------- 연출: 컷인 · 말풍선 ---------- */
function cutin(e, title, sub) {
  const c = document.getElementById('cutin'); if (!c) return;
  c.innerHTML = `<div class="ci"><div class="cie">${e}</div><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
  c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
}
function say(t, dur = 2.4) { if (P) P.bubble = { t, until: performance.now() / 1000 + dur }; }
function useEnergy() { if (P.energy <= 0) { log('행동력이 부족해요. 한 살 더 먹으면 회복돼요'); Snd.sfx('bad'); return false; } P.energy--; return true; }

/* ---------- 놀이 (3~12세) ---------- */
function openPlay() {
  const opts = PLAYS.slice().sort(() => Math.random() - .5).slice(0, 6);
  showModal({
    e: '🎈', t: '뭐 하고 놀까?', d: `행동력 ${P.energy} · 놀수록 취향과 재능이 생겨요`, grid: 1, ch: [
      ...opts.map(p => ({
        t: `<span class="ge">${p.e}</span>${p.n}`, f: () => {
          if (!useEnergy()) return;
          fx(p.fx); if (p.sub) P.sub[p.sub] = clamp(P.sub[p.sub] + R(2, 4));
          P.playCount = P.playCount || {}; P.playCount[p.id] = (P.playCount[p.id] || 0) + 1;
          playAnim(p.id); say(pick(p.say)); log(`${p.e} ${p.n}: ${pick(p.say)}`);
          if (p.id === 'draw' && Math.random() < .2 && !P.art) { P.art = true; log('🎨 그림에 소질이 보인다!', 'good'); }
          if (P.playCount[p.id] === 5) log(`⭐ ${p.n}을(를) 제일 좋아하는 아이로 자라고 있다`, 'good');
        }
      })), { t: '그만 놀래', f: () => { } }]
  });
}

/* ---------- 공부 (과목 선택) ---------- */
function aptitude(k) {
  let a = 1; if (P.saju) Saju.ELSUB.forEach((ks, i) => { if (ks.includes(k)) a += (P.saju.el[i] - 1.6) * .12; });
  return Math.max(.6, a);
}
function openStudy() {
  showModal({
    e: '📚', t: '무슨 공부를 할까?', d: `행동력 ${P.energy} · 과목 점수가 대학 전공과 직업을 결정해요`, grid: 1, ch: [
      ...SUBJ.map(s => ({
        t: `<span class="ge">${s.e}</span>${s.n}<small>${P.sub[s.k]}점${aptitude(s.k) > 1.1 ? ' ★' : ''}</small>`, f: () => {
          if (!useEnergy()) return;
          const L = Saju.luckAt(P.saju, P.age), luck = L && L.g === 4 ? 1.4 : 1;
          const g = Math.round(R(3, 6) * aptitude(s.k) * luck + (P.inSchool ? 2 : 0));
          P.sub[s.k] = clamp(P.sub[s.k] + g); fx({ smart: R(1, 2), hap: -1 });
          playAnim('read'); Snd.sfx('page');
          const hard = P.sub[s.k] < 35 && aptitude(s.k) < 1;
          say(hard ? `${s.n} 어렵다 😵` : P.sub[s.k] > 70 ? `${s.n} 1등 각! 💯` : `${s.n} 이해했다 💡`);
          log(`${s.e} ${s.n} 공부 +${g} (→ ${P.sub[s.k]}점)${luck > 1 ? ' · 학업운 보너스' : ''}`);
        }
      })), { t: '오늘은 쉬자', f: () => { } }]
  });
}
function topSubjects(n = 3) { return SUBJ.slice().sort((a, b) => P.sub[b.k] - P.sub[a.k]).slice(0, n); }

/* ---------- 취미 ---------- */
function openHobby() {
  showModal({
    e: '🎯', t: '취미 생활', d: '꾸준히 하면 레벨이 올라요 (Lv5부터 대회 출전 기회)', grid: 1, ch: [
      ...HOBBIES.map(h => ({
        t: `<span class="ge">${h.e}</span>${h.k}<small>${P.hlv[h.k] ? 'Lv' + P.hlv[h.k] : '처음'}</small>`, f: () => {
          if (!useEnergy()) return;
          const L = Saju.luckAt(P.saju, P.age), mul = L && L.g === 1 ? 1.5 : 1;
          P.hxp[h.k] = (P.hxp[h.k] || 0) + Math.round(R(2, 4) * mul);
          const lv = Math.min(10, Math.floor(P.hxp[h.k] / 5)), up = lv > (P.hlv[h.k] || 0);
          P.hlv[h.k] = lv; fx(h.st); if (h.sub) P.sub[h.sub] = clamp(P.sub[h.sub] + 1);
          playAnim(h.sport ? 'exercise' : h.k === '기타' || h.k === '피아노' ? 'sing' : h.k === '독서' || h.k === '바둑' ? 'read' : h.k === '요리' ? 'work' : 'jump');
          if (up) { say(`${h.k} Lv${lv}! 🎉`); Snd.sfx('levelup'); log(`${h.e} ${h.k} 레벨 업 → Lv${lv}`, 'good'); if (lv === 10) badge(`${h.k} 마스터`); }
          else { say(`${h.e} ${h.k} 재밌다`); log(`${h.e} ${h.k} 연습 (Lv${lv})`); }
          if (lv >= 5 && Math.random() < .25) contestEvent(h);
          checkBucket();
        }
      })), { t: '닫기', f: () => { } }]
  });
}
function contestEvent(h) {
  showModal({
    e: '🏆', t: `${h.k} 대회 출전 제안`, d: `지금 실력 Lv${P.hlv[h.k]} · 우승 확률 약 ${P.hlv[h.k] * 8}%`, ch: [
      {
        t: '출전한다!', f: () => {
          if (Math.random() < P.hlv[h.k] * .08) {
            fx({ hap: 12, look: 2 }); P.fame += 2; P.contest++; badge('대회 우승');
            cutin('🏆', `${h.k} 대회 우승!`, '트로피를 들어올렸다'); Snd.sfx('fanfare'); playAnim('jackpot', 2.5); log(`🏆 ${h.k} 대회 우승!`, 'good');
          } else { fx({ hap: -3 }); playAnim('sad'); log(`${h.k} 대회 예선 탈락… 다음엔 꼭!`); }
          checkBucket();
        }
      }, { t: '아직 부족해', f: () => log('더 연습하기로 했다') }]
  });
}

/* ---------- 자기계발 (자격증 등) ---------- */
function openSelfDev() {
  const certs = [
    { id: 'elec', n: '전기기사 자격증', e: '⚡', p: () => P.smart / 140 + (P.sub.math + P.sub.sci) / 400 },
    { id: 'it', n: '정보처리기사', e: '💻', p: () => P.smart / 140 + P.sub.code / 250 },
    { id: 'chef', n: '조리사 자격증', e: '👨‍🍳', p: () => .35 + (P.hlv['요리'] || 0) * .06 },
  ];
  showModal({
    e: '📘', t: '자기계발', d: `행동력 ${P.energy} · 비용 ${usd(M(500))}`, grid: 1, ch: [
      ...certs.map(c => ({
        t: `<span class="ge">${c.e}</span>${c.n}<small>${P.certs.has(c.id) ? '취득 ✓' : '합격률 ' + Math.round(Math.min(.95, c.p()) * 100) + '%'}</small>`, f: () => {
          if (P.certs.has(c.id)) { log('이미 갖고 있는 자격증이다'); return; }
          if (!useEnergy()) return; fx({ money: -M(500) }); playAnim('read'); Snd.sfx('page');
          if (Math.random() < Math.min(.95, c.p())) { P.certs.add(c.id); fx({ hap: 8 }); cutin(c.e, '자격증 합격!', c.n); Snd.sfx('fanfare'); log(`${c.e} ${c.n} 합격!`, 'good'); }
          else { fx({ hap: -3 }); say('다음 시험엔 꼭…'); log(`${c.n} 불합격. 다시 도전하자`); }
        }
      })),
      { t: '<span class="ge">🗣️</span>외국어 공부', f: () => { if (!useEnergy()) return; P.sub.eng = clamp(P.sub.eng + R(4, 7)); fx({ smart: 1 }); playAnim('read'); say('Hello~ 👋'); log('🗣️ 외국어 실력이 늘었다'); } },
      { t: '<span class="ge">📈</span>직무 교육', s: P.job ? '성과 점수 +8' : '직장인 전용', f: () => { if (!P.job) { log('직장이 있어야 해요'); return; } if (!useEnergy()) return; P.perf = clamp(P.perf + 8); playAnim('read'); say('업무 스킬 업!'); log(`📈 직무 교육 수료 (성과 ${P.perf})`); } },
      { t: '닫기', f: () => { } }]
  });
}

/* ---------- 전공 선택 (대학 합격 시) ---------- */
function chooseMajor(after) {
  const score = m => Math.round(P.smart * .45 + m.sub.reduce((s, k) => s + P.sub[k], 0) / m.sub.length * .55);
  const ranked = MAJORS.map(m => ({ m, sc: score(m) })).sort((a, b) => b.sc - a.sc);
  const strong = P.saju ? Saju.ELSUB[P.saju.strong] : [];
  showModal({
    e: '🎓', t: '전공을 고르자', d: `적성 점수가 합격선을 넘어야 해요 · 상위 과목: ${topSubjects().map(s => s.e + s.n).join(' ')}`, ch: [
      ...ranked.slice(0, 6).map(({ m, sc }) => ({
        t: `${m.e} ${m.n}${m.sub.some(k => strong.includes(k)) ? ' 🔮' : ''}`, s: `적성 ${sc} / 합격선 ${m.cut}${sc >= m.cut ? ' · 합격 유력' : ' · 도전'}`, f: () => {
          if (sc + R(-6, 6) >= m.cut) { P.major = m.id; P.majorName = m.n; log(`${m.e} ${m.n} 전공으로 입학!`, 'good'); cutin('🎓', '대학 입학!', m.n + ' 전공'); Snd.sfx('fanfare'); playAnim('grad', 2.5); }
          else { const fb = ranked.find(x => x.sc >= x.m.cut - 4 && x.m !== m) || ranked[ranked.length - 1]; P.major = fb.m.id; P.majorName = fb.m.n; log(`${m.n} 불합격… ${fb.m.n} 전공으로 진학했다`, 'bad'); playAnim('sad'); }
          after && after();
        }
      }))]
  });
}

/* ---------- 직급 · 승진 ---------- */
function ladder() { return P.job ? (LADDERS[P.job.lad] || LADDERS.corp) : null; }
function rankName() { const l = ladder(); return l ? l[Math.min(P.rank, l.length - 1)] : ''; }
function payMult() { const l = ladder(); if (!l) return 1; return (1 + P.rank * .32) * (P.job.lad === 'corp' && P.rank >= 5 ? 1.6 : 1); }
function yearlyCareer() {
  if (!P.job || P.retired) return null;
  const L = Saju.luckAt(P.saju, P.age);
  P.rankYears++;
  P.perf = clamp(Math.round(P.perf + (P.smart - 50) / 12 + R(-4, 6) + (L && L.g === 3 ? 5 : 0) + (P.home.type === 'country' ? -2 : 0) - (P.hap < 30 ? 3 : 0)));
  const l = ladder();
  if (P.rank < l.length - 1 && P.rankYears >= 2 + P.rank && P.perf >= 42 + P.rank * 6) return promotionEvent();
  return null;
}
function promotionEvent() {
  const l = ladder(), next = l[P.rank + 1], L = Saju.luckAt(P.saju, P.age), lb = L && L.g === 3 ? 10 : 0;
  const win = () => {
    P.rank++; P.rankYears = 0; P.perf = clamp(P.perf - 15); fx({ hap: 10 });
    cutin('🎉', `${next} 승진!`, `${P.job.n} · ${P.age}살`); Snd.sfx('fanfare'); playAnim('newjob', 2.5); say(`${next}이다!`);
    log(`🎉 ${next}(으)로 승진! 연봉이 올랐다`, 'good');
    P.moments.push({ a: P.age, e: '🎉', t: '승진', c: next, r: P.job.n });
    P.bestRank = `${P.job.n} ${next}`;
    if (P.job.lad === 'corp' && P.rank >= 5) badge('임원 승진');
    if (P.rank === l.length - 1) badge('정상에 서다');
    checkBucket();
  };
  const lose = () => { fx({ hap: -6 }); playAnim('sad'); say('이번엔 안 됐다…'); log(`${next} 승진 탈락. 내년을 노리자`, 'bad'); };
  return {
    e: '📋', t: `${next} 승진 심사`, d: `${P.job.e} ${P.job.n} · 현재 ${rankName()} ${P.rankYears}년차 · 성과 ${P.perf}${lb ? ' · 🔮 승진운' : ''}`, ch: [
      { t: '📊 실적으로 승부', s: '성과 점수가 높을수록 유리', f: () => (P.perf + R(-18, 18) + lb >= 50 + P.rank * 4 ? win() : lose()) },
      { t: '🤝 인간관계로 어필', s: '매력·가족유대 활용', f: () => ((P.look + P.bond) / 2 + R(-20, 20) + lb >= 52 + P.rank * 4 ? win() : lose()) },
      { t: '🙅 이번엔 양보', s: '행복 +3, 성과 +5', f: () => { fx({ hap: 3 }); P.perf = clamp(P.perf + 5); log('동료에게 기회를 양보했다'); } }]
  };
}

/* ---------- 연애 ---------- */
function idealEvent() {
  return {
    e: '💭', t: '나의 이상형은?', d: '이상형과 맞는 사람을 만나면 호감이 더 빨리 올라가요', grid: 1, ch:
      IDEALS.map(i => ({ t: `<span class="ge">${i.e}</span>${i.n}`, f: () => { P.ideal = i.k; log(`💭 이상형: ${i.e} ${i.n}`); say(`이상형은 ${i.n}!`); } }))
  };
}
function makeCandidate(route) {
  const pool = NAMES[P.country.r][P.male ? 1 : 0];
  let name = pick(pool); if (P.country.r === 'kr') name = pick(NAMES.kr[2]) + name;
  const age = Math.max(17, P.age + R(-3, 4));
  const jobs = age < 20 ? ['학생'] : age < 26 ? ['대학생', '취준생', '사원', '카페 사장', '디자이너'] : ['회사원', '교사', '간호사', '개발자', '요리사', '공무원', '프리랜서', '의사'];
  const tr = TRAITS.slice().sort(() => Math.random() - .5).slice(0, 2);
  const stem = R(0, 9), cp = Saju.compat(P.saju, stem);
  return { name, age, job: pick(jobs), traits: tr, stem, compat: cp, match: !!(P.ideal && tr.some(t => t.k === P.ideal)), route };
}
function openMeet() {
  showModal({
    e: '💘', t: '어디서 만날까?', d: P.ideal ? `이상형: ${IDEALS.find(i => i.k === P.ideal).n}` : '이상형을 아직 정하지 않았어요', ch: [
      ...MEET.map(m => ({ t: `${m.e} ${m.n}`, s: m.s, f: () => setTimeout(() => showCandidates(m), 50) })), { t: '다음에', f: () => { } }]
  });
}
function showCandidates(route) {
  const n = route.id === 'app' ? 3 : 2;
  const cs = Array.from({ length: n }, () => makeCandidate(route.id));
  if (route.id === 'club') { const hb = Object.keys(P.hlv).sort((a, b) => P.hlv[b] - P.hlv[a])[0]; if (hb) cs.forEach(c => c.hobby = hb); }
  showModal({
    e: route.e, t: `${route.n}에서 만난 사람`, d: '마음이 가는 사람을 골라보세요', ch: [
      ...cs.map(c => ({
        t: `${P.male ? '👩' : '👨'} ${c.name} (${c.age}) · ${c.job}`,
        s: `${c.traits.map(t => t.t).join(' · ')}${c.match ? ' · 💖이상형' : ''}${c.hobby ? ' · ' + c.hobby + ' 동호회' : ''} · 🔮 사주 궁합 ${c.compat}%`,
        f: () => {
          if (!useEnergy()) return;
          const ch = .32 + P.look / 260 + c.compat / 350 + (c.match ? .12 : 0) + (route.id === 'work' ? .08 : 0) + (route.id === 'app' ? -.05 : 0) + (c.hobby ? .1 : 0);
          if (Math.random() < ch) {
            P.rel = { name: c.name, job: c.job, traits: c.traits, compat: c.compat, aff: 38 + Math.round(c.compat / 6) + (c.match ? 8 : 0), since: P.age, match: c.match };
            P.partner = c.name; P.dateCount = (P.dateCount || 0) + 1;
            fx({ hap: 10 }); playAnim('love'); Snd.sfx('love'); cutin('💕', '연애 시작!', `${c.name} · 궁합 ${c.compat}%`);
            log(`💕 ${c.name}(${c.job})와(과) 사귀기 시작했다 · 궁합 ${c.compat}%`, 'good');
            P.moments.push({ a: P.age, e: '💕', t: '연애 시작', c: c.name, r: `궁합 ${c.compat}%` });
          } else { fx({ hap: -4 }); playAnim('sad'); say('읽씹… 🥲'); log(`${c.name}에게 거절당했다`, 'bad'); }
        }
      })), { t: '마음에 드는 사람이 없어', f: () => { } }]
  });
}
function openDate() {
  const r = P.rel;
  showModal({
    e: '💑', t: `${r.name}와(과) 데이트`, d: `호감도 ${r.aff}/100 · 궁합 ${r.compat}% · 사귄 지 ${P.age - r.since}년`, grid: 1, ch: [
      ...DATES.map(d => ({
        t: `<span class="ge">${d.e}</span>${d.n}<small>${d.cost ? usd(M(d.cost)) : '무료'}</small>`, f: () => {
          if (!useEnergy()) return;
          if (d.cost) fx({ money: -M(d.cost) });
          const g = Math.round(R(d.aff[0], d.aff[1]) * (.7 + r.compat / 200) * (r.traits.some(t => (t.k === 'rich' && d.id === 'gift') || (t.k === 'kind' && d.id === 'letter') || (t.k === 'fun' && d.id === 'park') || (t.k === 'smart' && d.id === 'talk')) ? 1.5 : 1));
          r.aff = clamp(r.aff + g); fx({ hap: R(3, 6) });
          if (d.id === 'trip') P.trips++;
          playAnim(d.id === 'trip' ? 'travel' : 'love'); Snd.sfx('love'); say(d.say);
          log(`${d.e} ${d.n} → 호감도 +${g} (${r.aff})`);
          checkBucket();
        }
      })), { t: '닫기', f: () => { } }]
  });
}
function yearlyRomance() {
  const r = P.rel; if (!r) return null;
  if (!P.married) {
    r.aff = clamp(r.aff - R(3, 7));
    if (r.aff < 18) return breakupEvent();
    if (r.aff >= 72 && P.age - r.since >= 1 && P.age >= 22 && Math.random() < .55) return proposalEvent();
    if (r.aff < 40 && Math.random() < .4) return {
      e: '😶', t: '권태기', d: `${r.name}와(과) 요즘 대화가 줄었다 (호감도 ${r.aff})`, ch: [
        { t: '깜짝 이벤트를 준비한다', s: `-${usd(M(300))}`, f: () => { fx({ money: -M(300), hap: 2 }); r.aff = clamp(r.aff + 15); playAnim('love'); log('깜짝 이벤트로 설렘을 되찾았다', 'good'); } },
        { t: '솔직하게 이야기한다', f: () => { const ok = Math.random() < .6; r.aff = clamp(r.aff + (ok ? 12 : -8)); log(ok ? '서로를 더 이해하게 됐다' : '대화가 싸움이 됐다', ok ? 'good' : 'bad'); } },
        { t: '시간이 해결해 주겠지', f: () => { r.aff = clamp(r.aff - 5); } }]
    };
  } else {
    r.aff = clamp(r.aff - R(0, 4));
    if (r.aff < 25 && Math.random() < .45) return {
      e: '💔', t: '부부 위기', d: `${r.name}와(과)의 사이가 얼어붙었다 (애정 ${r.aff})`, ch: [
        { t: '부부 상담을 받는다', s: `-${usd(M(800))}`, f: () => { fx({ money: -M(800) }); r.aff = clamp(r.aff + 20); fx({ bond: 5 }); log('상담 후 다시 손을 잡았다', 'good'); } },
        { t: '이혼한다', f: () => { P.married = false; P.divorced = true; P.exes.push(r.name); P.rel = null; P.partner = null; fx({ hap: -15, bond: -12, money: -Math.round(Math.max(0, P.money) * .4) }); playAnim('sad'); Snd.sfx('bad'); log('이혼 서류에 도장을 찍었다', 'bad'); P.marks.add('divorce'); } }]
    };
  }
  return null;
}
function breakupEvent() {
  const r = P.rel;
  return {
    e: '💔', t: '이별의 순간', d: `${r.name}: "우리… 그만하자."`, ch: [
      { t: '붙잡는다', s: '매력과 궁합이 중요', f: () => { if (Math.random() < .25 + P.look / 300 + r.compat / 400) { r.aff = 38; playAnim('hug'); log(`${r.name}이(가) 마음을 돌렸다`, 'good'); } else endRel(); } },
      { t: '보내준다', f: () => endRel() }]
  };
  function endRel() { P.exes.push(r.name); P.rel = null; P.partner = null; fx({ hap: -12 }); playAnim('cry'); Snd.sfx('bad'); say('잘 지내…'); log(`💔 ${r.name}와(과) 헤어졌다`, 'bad'); P.marks.add('breakup'); P.moments.push({ a: P.age, e: '💔', t: '이별', c: r.name, r: '' }); }
}
function proposalEvent() {
  const r = P.rel;
  return {
    e: '💍', t: '프러포즈', d: `${r.name}와(과) 함께한 지 ${P.age - r.since}년 · 호감도 ${r.aff}`, ch: [
      { t: '💍 반지를 준비해 고백한다', s: `-${usd(M(2000))}`, f: () => { fx({ money: -M(2000) }); propose(0); } },
      { t: '✈️ 여행지에서 깜짝 프러포즈', s: `-${usd(M(3500))} · 성공률↑`, f: () => { fx({ money: -M(3500) }); P.trips++; propose(12); } },
      { t: '아직은 이르다', f: () => { r.aff = clamp(r.aff - 3); log('조금 더 연애하기로 했다'); } }]
  };
  function propose(b) {
    if (r.aff + b + R(-15, 15) >= 70) { log(`💍 ${r.name}이(가) "예스!"라고 답했다`, 'good'); Snd.sfx('love'); setTimeout(() => showModal(weddingEvent()), 60); }
    else { r.aff = clamp(r.aff - 10); fx({ hap: -8 }); playAnim('sad'); log(`${r.name}: "아직 마음의 준비가 안 됐어…"`, 'bad'); }
  }
}
function weddingEvent() {
  const r = P.rel;
  const done = (cost, st, style) => {
    fx(Object.assign({ money: -M(cost) }, st));
    P.married = true; P.spouseName = r.name; r.aff = clamp(r.aff + 10);
    badge('결혼'); cutin('💒', '결혼을 축하합니다!', `${P.name} ♥ ${r.name} · ${style}`); Snd.sfx('wedding'); playAnim('wedding', 3);
    log(`💒 ${r.name}와(과) ${style}으로 결혼했다!`, 'good'); P.moments.push({ a: P.age, e: '💒', t: '결혼', c: r.name, r: style });
    checkBucket();
  };
  return {
    e: '💒', t: '어떤 결혼식을 할까?', d: '', ch: [
      { t: '🌿 스몰웨딩', s: `${usd(M(5000))} · 행복 +8`, f: () => done(5000, { hap: 8 }, '스몰웨딩') },
      { t: '🏨 호텔 웨딩', s: `${usd(M(30000))} · 행복 +12`, f: () => done(30000, { hap: 12, look: 2 }, '호텔 웨딩') },
      { t: '🎎 전통 혼례', s: `${usd(M(8000))} · 가족유대 +10`, f: () => done(8000, { bond: 10, hap: 6 }, '전통 혼례') },
      { t: '📝 혼인신고만', s: '돈 아끼기 · 행복 +3', f: () => done(0, { hap: 3 }, '혼인신고') }]
  };
}

/* ---------- 자녀 ---------- */
function addKid() {
  const male = Math.random() < .5, pool = NAMES[P.country.r][male ? 0 : 1];
  let name = pick(pool); if (P.country.r === 'kr') name = (P.name[0] || '') + pick(pool);
  P.kidsList.push({ name, male, age: 0 }); P.kids = P.kidsList.length; syncKids();
  cutin('👶', '아기가 태어났어요!', `${male ? '아들' : '딸'} ${name}`); Snd.sfx('baby');
  return name;
}
function syncKids() { P.kidAges = P.kidsList.map(k => k.age); P.kids = P.kidsList.length; }
function yearlyKids() {
  let ev = null;
  P.kidsList.forEach(k => {
    k.age++;
    if (k.age === 1) log(`👣 ${k.name}이(가) 첫걸음마를 뗐다!`, 'good');
    if (k.age === 7) { fx({ money: -M(1000) }, 1); log(`🎒 ${k.name} 초등학교 입학`); }
    if (k.age === 14 && !ev) ev = {
      e: '😤', t: `${k.name}의 사춘기`, d: `"${k.male ? '아빠' : '엄마'}는 몰라도 돼!"`, ch: [
        { t: '조용히 들어준다', f: () => { fx({ bond: 8 }); log(`${k.name}이(가) 조금씩 마음을 열었다`, 'good'); } },
        { t: '용돈으로 달랜다', s: `-${usd(M(300))}`, f: () => { fx({ money: -M(300), bond: 2 }); log('효과는… 잠깐이었다'); } },
        { t: '따끔하게 혼낸다', f: () => { fx({ bond: -6 }); log(`${k.name}이(가) 방문을 쾅 닫았다`, 'bad'); } }]
    };
    if (k.age === 19 && !ev) ev = {
      e: '🎓', t: `${k.name}의 대학 등록금`, d: `등록금 ${usd(M(8000))}`, ch: [
        { t: '전액 지원한다', f: () => { fx({ money: -M(8000), bond: 6 }); log(`${k.name}의 꿈을 응원했다`, 'good'); } },
        { t: '반반 부담하자', f: () => { fx({ money: -M(4000), bond: 2 }); log(`${k.name}이(가) 알바를 시작했다`); } },
        { t: '스스로 해결하게 한다', f: () => { fx({ bond: -4 }); log(`${k.name}이(가) 학자금 대출을 받았다`); } }]
    };
    if (k.age === 30) { fx({ money: -M(3000), hap: 8 }, 1); log(`💒 ${k.name}이(가) 결혼했다`, 'good'); }
  });
  syncKids();
  return ev;
}

/* ---------- 집 ---------- */
function openHome() {
  const cur = HOMES[P.home.type];
  const list = P.tier === 3 ? ['monthly', 'hut', 'brick', 'apt_s'] : ['monthly', 'jeonse', 'apt_s', 'apt_l', 'country', 'house'];
  const price = k => M(HOMES[k].price || HOMES[k].deposit || 0);
  showModal({
    e: '🏠', t: '집 구하기', d: `지금: ${cur.e} ${cur.n}${cur.own ? ` (시세 ${usd(P.home.value)})` : ''} · 현금 ${usd(P.money)}${P.loan ? ` · 대출 ${usd(P.loan)}` : ''}`, ch: [
      ...list.filter(k => k !== P.home.type).map(k => {
        const h = HOMES[k], pr = price(k);
        const sub = h.rent ? `연 월세 ${usd(M(h.rent))}` : h.deposit ? `보증금 ${usd(pr)} (나중에 돌려받음)` : `매매가 ${usd(pr)} · 최대 70% 대출`;
        return {
          t: `${h.e} ${h.n}`, s: sub, f: () => {
            const equity = (cur.own ? P.home.value : 0) + (P.deposit || 0) - P.loan;
            const cash = P.money + equity;
            const need = h.own ? pr * .3 : (h.deposit ? pr : 0);
            if (cash < need) { log(`돈이 부족하다 (필요 ${usd(need)})`, 'bad'); Snd.sfx('bad'); return; }
            P.money = cash; P.loan = 0; P.deposit = 0;
            if (h.own) { const pay = Math.min(P.money, pr); P.money -= pay; P.loan = pr - pay; }
            if (h.deposit) { P.money -= pr; P.deposit = pr; }
            P.home = { type: k, value: h.own ? pr : 0 };
            fx({ hap: 6 }); playAnim('cheer'); Snd.sfx('coin');
            if (h.own) { cutin(h.e, '내 집 마련!', h.n + (P.loan ? ` · 대출 ${usd(P.loan)}` : '')); Snd.sfx('fanfare'); badge('내 집 마련'); P.house = true; }
            log(`${h.e} ${h.n}(으)로 이사했다${P.loan ? ` · 대출 ${usd(P.loan)}` : ''}`, 'good');
            P.moments.push({ a: P.age, e: h.e, t: '이사', c: h.n, r: '' });
            checkBucket();
          }
        };
      }),
      ...(P.loan > 0 && P.money > 0 ? [{ t: '💳 대출 갚기', s: `${usd(Math.min(P.money, P.loan))} 상환`, f: () => { const v = Math.min(P.money, P.loan); P.money -= v; P.loan -= v; fx({ hap: 4 }); log(`대출 ${usd(v)} 상환${P.loan ? '' : ' — 완납! 🎉'}`, 'good'); } }] : []),
      { t: '그대로 산다', f: () => { } }]
  });
}
function yearlyHome() {
  const h = HOMES[P.home.type];
  if (h.rent) { fx({ money: -M(h.rent) }, 1); }
  if (h.own) {
    const pct = R(h.vol[0], h.vol[1]); P.home.value = Math.round(P.home.value * (1 + pct / 100));
    if (h.st) fx(h.st, 1);
    if (Math.abs(pct) >= 9) log(`${h.e} 집값 ${pct > 0 ? '급등' : '급락'} ${pct > 0 ? '+' : ''}${pct}% → ${usd(P.home.value)}`, pct > 0 ? 'good' : 'bad');
  }
  if (P.loan > 0) { const it = Math.round(P.loan * .04); fx({ money: -it }, 1); }
}
function spendRate() { const h = HOMES[P.home.type]; return h.own ? .5 : h.deposit ? .55 : .6; }

/* ---------- 계절 ---------- */
const SEASONS = [{ n: '봄', e: '🌸' }, { n: '여름', e: '☀️' }, { n: '가을', e: '🍁' }, { n: '겨울', e: '❄️' }];
function seasonOf(age) { return SEASONS[(age + (P && P.birth ? Math.floor((P.birth.m - 1) / 3) + 3 : 0)) % 4]; }

/* ---------- 사주 vs 실제 ---------- */
function fateReport() {
  if (!P.saju) return null;
  const d = P.saju.dom, hb = Math.max(0, ...Object.values(P.hlv));
  let ok = false, real = '';
  if (d === 0) { ok = P.badges.has('사업 성공') || P.biz || !!(P.job && ['market', 'creator', 'artist', 'athlete'].includes(P.job.id)); real = ok ? '내 이름을 걸고 스스로 판을 벌였다' : '독립보다 안정된 길을 걸었다'; }
  if (d === 1) { ok = P.contest > 0 || hb >= 6 || !!(P.job && ['artist', 'creator', 'chef', 'athlete'].includes(P.job.id)); real = ok ? (P.contest ? `대회 우승 ${P.contest}회, 재능을 꽃피웠다` : `취미 최고 Lv${hb}, 재능을 꽃피웠다`) : '재능을 펼칠 기회는 많지 않았다'; }
  if (d === 2) { ok = P.peak >= M(300000); real = `최고 자산 ${usd(P.peak)}${ok ? ', 재물을 크게 모았다' : ', 큰돈과는 인연이 적었다'}`; }
  if (d === 3) { ok = P.rank >= 3 || /장|부장|상무|전무|사장|교장|병원장|CTO|파트너|대표/.test(P.bestRank || ''); real = P.bestRank ? `${P.bestRank}까지 올랐다` : '직급 사다리와는 거리가 멀었다'; }
  if (d === 4) { ok = P.edu >= 3 || P.certs.size > 0; real = [P.edu >= 3 ? `대학(${P.majorName || '졸업'})` : '', P.certs.size ? `자격증 ${P.certs.size}개` : ''].filter(Boolean).join(' · ') || '배움보다 생활이 먼저였다'; }
  return { pred: Saju.GRPN[d], real, ok, verdict: ok ? '✅ 운명대로 살았다' : '🔄 운명을 거슬러 내 길을 갔다' };
}
