/* =====================================================================
 *  Store — 상점 · 인앱결제
 *   앱(Android·iOS): @capgo/native-purchases 로 실제 결제
 *   웹(GitHub Pages): 결제가 없으므로 '체험판' — 프리미엄 사주 리포트만 무료 개방
 *   신년 이벤트 기간(12/15~2/28): 프리미엄 사주 리포트 무료
 * ===================================================================== */
window.STORE_CONFIG = {
  // 스토어 콘솔(Play Console · App Store Connect)에 같은 ID로 '일회성 상품'을 만들어야 합니다
  products: {
    // ✨ 카르마 (돈으로 사는 유일한 재화) — 콘텐츠는 모두 카르마로 연다
    karma:     { id: 'p8b_karma_100', e: '✨', n: '카르마 100', d: '콘텐츠 열기 · AI 상담 · 기적에 쓰는 카르마', price: '₩1,200', consumable: true, karma: 100 },
    karma300:  { id: 'p8b_karma_300', e: '💫', n: '카르마 330 (+10%)', d: '조금 넉넉하게 · 보너스 30', price: '₩3,300', consumable: true, karma: 330 },
    karma1000: { id: 'p8b_karma_1000', e: '🌟', n: '카르마 1,200 (+20%)', d: '모든 콘텐츠를 열고도 남는 양 · 보너스 200', price: '₩9,900', consumable: true, karma: 1200 },
    noads:     { id: 'p8b_remove_ads', e: '🚫', n: '광고 제거', d: '배너·전면 광고 영구 제거 (카르마를 주는 광고는 원할 때만)', price: '₩3,900', consumable: false },
    // 🔓 카르마로 여는 콘텐츠 — 대표 상품은 '상세 사주 리포트' 하나 (+ AI 상담은 회당 카르마)
    // 예전 상품: 한 번 열면 영구. 지금은 판매하지 않고(legacy) 이미 연 사용자만 모든 상세 보기를 무료로 이용
    report:  { e: '📜', n: '상세 사주 리포트', d: '2027 분야별 상세 · 12개월+좋은 날 · 10년 대운 · 궁합 상세 · MBTI 전략 · 토정비결 전체 · 개운', k: 50, legacy: 1 },
    fate:    { e: '🎛️', n: '운명 조작 팩 (게임 아이템)', d: '인생 게임에서 태어날 가정형편과 타고난 재능을 직접 선택', k: 30, game: 1 },
  },

  // 구매 전에 보여 줄 '무엇을 받는지 · 이용 범위' (상점 자세히 · 구매 확인 창)
  info: {
    report: ['구성: 2027 한눈에 보기(총점·분야 6개 점수) · 분야별 상세 풀이 · 12개월 상세와 달마다 좋은 날 · 10년 대운 8구간 · 관계도 상대별 궁합 상세 · MBTI 2027 전략 · 토정비결 전체 · 분기 전략 · 개운 가이드',
      '무료와 차이: 무료는 총운 한 줄·좋은 달·12개월 점수 요약, 토정비결 작괘와 총평 한 줄, 궁합 지수까지',
      '포함: 궁합 상세 풀이와 2027 토정비결 전체도 함께 열려요 (따로 카르마를 쓰지 않아요)',
      '보너스: 타로 사주 심층 풀이 무료 횟수가 하루 1회 → 3회로 늘어요',
      '이용 범위: 카르마로 한 번 열면 이 기기에서 계속 · 내 정보를 바꾸면 바뀐 정보로 다시 계산 · 계정 동기화는 로그인 서버 연결 후 지원'],
    noads: ['없어지는 광고: 배너 광고 · 엔딩 전면 광고', '그대로인 것: 카르마를 주는 광고(원할 때만 직접 시청)',
      '이용 범위: 기간 제한 없음 · 앱에서 산 경우 기기 변경 시 스토어 「구매 복원」'],
    fate: ['구성: 탄생할 때 가정형편과 타고난 재능을 직접 선택 (인생 게임 아이템)', '이용 범위: 카르마로 한 번 열면 이 기기에서 이후 모든 판에 적용'],
    karma: ['카르마로 하는 일: 서비스별 상세 풀이 5~15 (결제한 날 다시보기 3회 무료) · 타로 상세 1장 5·3장 10·5장 15 · AI 사주상담 질문 1개 3 (대화·선택 상담, 처음 1개 무료) · 종합 사주 리포트 PDF 40 · 게임 아이템 · 사주풀이·매일 타로 1장은 무료',
      '무료로 모으기: 처음 시작 +100 · 광고 1번 +5 (3분 간격, 하루 6번) · 인생 게임 엔딩 5~15 · 게임 중 10살마다 광고 휴식 +3 · 이벤트 기간 무상 지급',
      '소모성: 쓰면 없어지고, 앱을 지우면 남은 카르마도 사라져요 (계정 동기화는 로그인 서버 연결 후)'],
    karma300: ['카르마 330 즉시 지급 (보너스 10%)', '소모성'], karma1000: ['카르마 1,200 즉시 지급 (보너스 20%)', '소모성'],
  },
  // 🔓 상세 풀이 (메인 서비스별): 개요는 무료, 상세는 볼 때마다 카르마 · 결제한 날(자정까지) 같은 대상 다시보기 free회 무료
  //    사주풀이는 전부 무료 · 타로는 펼친 장 수에 따라 가격이 다름 · AI 사주상담은 질문 1개마다 차감(counsel)
  views: {
    free: 3,
    items: {
      newyear: { e: '🧧', n: '2027 신년운세 상세', d: '한 해 총점·키워드 · 6개 분야 기회·주의·실천 · 12개월 상세(달마다 일·재물·사람·건강·좋은 날) · 10년 대운 · 분기 전략 · 관계 · 개운', k: 15 },
      tojeong: { e: '🏮', n: '토정비결 상세', d: '상·중·하괘 풀이 · 계절 흐름 · 월별 상세(한 달씩: 신수 풀이·달의 기운·일/재물/사람/건강·좋은 날·행운 색·실천) · 길월 활용법', k: 10 },
      compat:  { e: '💞', n: '궁합 상세', d: '오행·일간·띠·배우자 자리 관계 · 성향 차이와 대화법 · 상황별 대화 예시 · 갈등 해법 · 두 사람의 월별 흐름 (상대마다)', k: 10 },
      flirt:   { e: '💘', n: '바람기 테스트 상세', d: '사주 근거 · 이상형과 연애 패턴 · 위험 신호 · 대운별 연애 흐름 · 월별 연애운 · 연애 단계별 조언', k: 5 },
      mbti:    { e: '🧩', n: '사주 MBTI 상세', d: '축별 계산 근거 · 일·관계·연애·스트레스 · 어울리는 일·환경 · 성장 로드맵 · 잘 맞는 유형 · 사주 보완', k: 5 },
      pdf:     { e: '📑', n: '종합 사주 리포트 (PDF)', d: '사주풀이 · 신년운세 상세 · 토정비결 월별 상세 · 사주 MBTI · 연애 성향 · 등록한 사람 궁합(최대 3명)을 한 권으로 · PDF 저장', k: 40 },
      tarot1:  { e: '🃏', n: '타로 1장 상세 리딩', d: '카드 깊이 읽기 · 그림·숫자·원소 · 주제별 풀이 · 시기 · 사주 연결 · 실천', k: 5 },
      tarot3:  { e: '🃏', n: '타로 3장 상세 리딩', d: '과거→현재→미래 흐름 · 카드끼리의 관계 · 원소 균형 · 시기 · 사주 연결 · 실천 계획', k: 10 },
      tarot5:  { e: '🃏', n: '타로 5장 상세 리딩', d: '상황·장애물·숨은 원인·조언·결과 · 장애물 vs 조언 · 원소 균형 · 핵심 카드 · 사주 연결 · 실천 계획', k: 15 },
    },
  },
  // 🤖 AI 사주상담: 질문 1개마다 카르마 (처음 1개 무료)
  counsel: { perQ: 3, firstFree: 1 },
  // ✨ 기본 지급: 처음 시작하는 사용자의 카르마 (예전 20 → 100)
  startKarma: 100,
  // 🎉 회원가입 보너스: 계정당 1회 (서버가 지급 여부를 기록 — 탈퇴 후 재가입해도 다시 주지 않음)
  signupBonus: 200,
  // 🧧 무상 카르마 이벤트: 기간 안에 앱을 열면 기기당 1회 지급 (id가 다르면 새 이벤트로 다시 지급)
  events: [
    { id: 'newyear2027', e: '🧧', n: '신년 이벤트 무상 카르마', karma: 200, until: '2026-12-31' },
  ],
  webDemoFree: [],          // 웹 체험판에서 무료로 여는 상품
  newYearFree: [],          // 신년 이벤트 무료 개방 없음 (대표 상품은 카르마로)
};

/* 상업용 테스트 모드 (life-test/ 페이지에서 window.P8B_MODE='commercial'로 켬)
 *  1안: 초기 출시는 기간제 행운패스를 팔지 않고 일회성 상품만 — 재설치·기기 시간 변경에 따른 기간 분쟁 방지
 *  웹 무료 개방 없음 → 잠긴 상품을 눌렀을 때 구매 의향을 묻는다 (실제 결제 없음) */
window.P8B_COMMERCIAL = window.P8B_MODE === 'commercial';
if (window.P8B_COMMERCIAL) {
  delete STORE_CONFIG.products.pass7; delete STORE_CONFIG.products.pass30;
  STORE_CONFIG.webDemoFree = [];
  STORE_CONFIG.feedbackUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfXlre8_TN1aG8hTyk48EPvN2c1mW1M4abrpZ4cdjqMdnmOrA/viewform';
}

window.Store = (() => {
  const C = window.Capacitor;
  const native = !!(C && C.isNativePlatform && C.isNativePlatform());
  const NP = native ? C.Plugins.NativePurchases : null;
  const CFG = window.STORE_CONFIG;
  const KEY = 'p8b_owned';
  let owned = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  let prices = {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch (e) {} };

  function newYear(d = new Date()) {
    const m = d.getMonth() + 1, day = d.getDate();
    return (m === 12 && day >= 15) || m === 1 || m === 2;
  }
  /* 행운패스: 기간 동안 광고 제거와 같은 효과 */
  const PASS = 'p8b_pass_until';
  const passUntil = () => { try { return +localStorage.getItem(PASS) || 0; } catch (e) { return 0; } };
  const passOn = () => passUntil() > Date.now();
  function addPass(ms) { const t = Math.max(Date.now(), passUntil()) + ms; try { localStorage.setItem(PASS, String(t)); } catch (e) {} fire(); return t; }
  const subs = new Set(); const fire = () => subs.forEach(f => { try { f(); } catch (e) {} });
  function grant(k) { owned[k] = true; save(); fire(); }
  // 카르마로 연 콘텐츠 (이 기기에 저장)
  const UKEY = 'p8b_unlocks';
  const unlocks = () => { try { return JSON.parse(localStorage.getItem(UKEY)) || {}; } catch (e) { return {}; } };
  function unlock(k) { k = al(k); const u = unlocks(); u[k] = Date.now(); try { localStorage.setItem(UKEY, JSON.stringify(u)); } catch (e) {} fire(); }
  const isKarmaItem = k => !!(CFG.products[k] && CFG.products[k].k);
  const ALIAS = { newyear: 'report', compat: 'report' };   // 신년 종합 풀이·궁합 상세는 상세 사주 리포트에 포함
  const al = k => ALIAS[k] || k;
  const isTest = () => !!(window.Auth && Auth.isTest && Auth.isTest());
  // 실제로 구매·카르마로 연 것만 (테스트 계정 전체 열람·이벤트 무료 제외) — 상세 보기 무료 판단용
  const ownedReal = k => !!(owned[k] || unlocks()[k]);
  function has(k) {
    if (ALIAS[k] && (owned[k] || unlocks()[k])) return true;   // 예전에 따로 연 경우 유지
    k = al(k);
    if (owned[k]) return true;
    if (unlocks()[k]) return true;
    if (isTest() && CFG.products[k] && !CFG.products[k].consumable) return true;   // 테스트 계정: 유료 상품 전체 열람
    if (k === 'noads' && passOn()) return true;
    if (newYear() && CFG.newYearFree.includes(k)) return true;
    if (!native && CFG.webDemoFree.includes(k)) return true;
    return false;
  }
  function why(k) {
    k = al(k);
    if (owned[k]) return '구매함';
    if (unlocks()[k]) return '✨ 카르마로 열림';
    if (isTest() && CFG.products[k] && !CFG.products[k].consumable) return '🧪 테스트 계정 열람';
    if (k === 'noads' && passOn()) return '🍀 행운패스 사용 중';
    if (newYear() && CFG.newYearFree.includes(k)) return '🧧 신년 이벤트 무료';
    if (!native && CFG.webDemoFree.includes(k)) return '웹 체험판 무료 개방';
    return '';
  }
  function price(k) { k = al(k); const p = CFG.products[k]; if (p && p.k) return `✨ 카르마 ${p.k}`; return prices[k] || (p ? p.price : ''); }

  async function init() {
    if (!native || !NP) return;
    try {
      const ids = Object.values(CFG.products).filter(p => p.id).map(p => p.id);
      const r = await NP.getProducts({ productIdentifiers: ids, productType: 'inapp' });
      (r.products || []).forEach(p => { const k = Object.keys(CFG.products).find(k => CFG.products[k].id === p.identifier); if (k) prices[k] = p.priceString; });
      await restore(true);
    } catch (e) { console.warn('[Store] init', e); }
  }
  let lastErr = '';
  async function restore(silent) {
    if (!native || !NP) return 0;
    try {
      const r = await NP.getPurchases({ productType: 'inapp' });
      let n = 0;
      (r.purchases || []).forEach(t => {
        const k = Object.keys(CFG.products).find(k => CFG.products[k].id === t.productIdentifier);
        if (k && !CFG.products[k].consumable && (t.purchaseState === undefined || String(t.purchaseState) === '1')) { owned[k] = true; n++; }
      });
      save(); return n;
    } catch (e) { if (!silent) console.warn('[Store] restore', e); lastErr = String(e && (e.code || '') + ' ' + (e.message || '') || e); return -1; }
  }
  // 스토어 오류를 사람이 읽는 말로 (결제 실패 안내용)
  function errText(e) {
    const t = String(e || '');
    if (/BILLING_SETUP|unavailable|not available|SERVICE_UNAVAILABLE|BILLING_UNAVAILABLE/i.test(t)) return '이 기기에서 Google Play 결제를 쓸 수 없어요. Play 스토어 앱에 Google 계정으로 로그인했는지 확인해 주세요.';
    if (/ITEM_UNAVAILABLE|not found|no product|invalid product|productIdentifier/i.test(t)) return '이 상품은 아직 스토어에 준비되지 않았어요. 잠시 후 다시 시도해 주세요.';
    if (/ALREADY_OWNED|already own/i.test(t)) return '이미 구매한 상품이에요. 상점 → 🔄 구매 복원을 눌러 주세요.';
    if (/network|timeout|offline/i.test(t)) return '인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    return '결제를 마치지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
  /* 구매: 성공하면 onDone(true) */
  async function buy(k, onDone) {
    const p = CFG.products[k];
    if (!native || !NP) { onDone && onDone(false, 'web'); return; }
    try {
      const t = await NP.purchaseProduct({ productIdentifier: p.id, productType: 'inapp', isConsumable: !!p.consumable, quantity: 1 });
      if (!t) throw new Error('no transaction');
      if (!p.consumable) { owned[k] = true; save(); }
      if (p.passDays) addPass(p.passDays * 864e5);
      fire(); onDone && onDone(true);
    } catch (e) { onDone && onDone(false, String(e && (e.code || '') + ' ' + (e.message || '') || e)); }
  }
  return { native, errText, lastErr: () => lastErr, init, has, why, buy, restore, price, newYear, grant, unlock, isKarmaItem, notify: fire, packs: () => Object.keys(CFG.products).filter(k => CFG.products[k].karma), contents: () => Object.keys(CFG.products).filter(k => CFG.products[k].k && !CFG.products[k].legacy), ownedReal, addPass, passUntil, passOn, onChange: f => subs.add(f), list: () => Object.keys(CFG.products), item: k => CFG.products[al(k)], info: k => { k = al(k); return (CFG.products[k] && CFG.products[k].info) || CFG.info[k] || []; } };
})();
