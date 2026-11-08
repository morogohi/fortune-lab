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
    // 🔓 카르마로 여는 콘텐츠 (k: 필요한 카르마)
    newyear: { e: '📖', n: '2027 종합 사주풀이', d: '분야 6개 · 12개월+좋은 날 · 궁합 · MBTI 전략 · 토정비결 전체 · 개운', k: 50 },
    report:  { e: '📜', n: '프리미엄 사주 리포트', d: '올해 운세 · 10년 대운 상세 · 성격·연애·재물·건강 · 개운법', k: 40 },
    compat:  { e: '💞', n: '궁합 상세 풀이', d: '두 사람의 성격·연애(관계) 스타일·올해 흐름 (모든 상대)', k: 20 },
    fate:    { e: '🎛️', n: '운명 조작 팩', d: '인생 게임에서 태어날 가정형편과 타고난 재능을 직접 선택', k: 30 },
  },

  // 구매 전에 보여 줄 '무엇을 받는지 · 이용 범위' (상점 자세히 · 구매 확인 창)
  info: {
    report: ['구성: 올해 운세(총운·일·재물·연애·건강, 상·하반기) · 이번 달 한마디 · 10년 대운 8구간 표 · 성격·강점·약점 · 타고난 흐름·보완점·개운법',
      '무료와 차이: 무료는 사주 원국·오행·성격 요약까지',
      '이용 범위: 내 사주와 게임 속 인물 모두 · 기간 제한 없이 다시 열람 · 내 정보를 바꾸면 바뀐 정보로 다시 계산',
      '기기 변경: 같은 스토어 계정으로 「구매 복원」'],
    noads: ['없어지는 광고: 배너 광고 · 엔딩 전면 광고', '그대로인 것: 보상형 광고(카르마·무료 기적) — 원할 때만 직접 시청',
      '이용 범위: 기간 제한 없음 · 기기 변경 시 「구매 복원」'],
    fate: ['구성: 탄생할 때 가정형편과 타고난 재능을 직접 선택', '이용 범위: 이후 모든 판에 기간 제한 없이 적용 · 기기 변경 시 「구매 복원」'],
    karma: ['카르마로 하는 일: 2027 종합 사주풀이 50 · 프리미엄 리포트 40 · 토정비결 30 · 운명 조작 팩 30 · 궁합 상세 20 · AI 상담 1회 20', '무료로 모으기: 광고 1번 +5 (3분마다, 하루 10번) · 인생 게임 엔딩 5~15 · 게임 중간 광고 +3', '소모성: 쓰면 없어지고, 앱을 지우면 남은 카르마도 사라져요 (복원 대상 아님)'],
    karma300: ['카르마 330 즉시 지급 (보너스 10%)', '소모성 · 복원 대상 아님'], karma1000: ['카르마 1,200 즉시 지급 (보너스 20%)', '소모성 · 복원 대상 아님'],
    newyear: ['대상: 2027년(정미년) · 내 정보로 계산',
      '구성: 한눈에 보는 한 해(총점·분야 6개 점수) · 나의 사주 바탕 · 대운·세운·띠·일지로 본 흐름 · 분야별 상세 풀이 · 토정비결 전체 · 12개월 상세와 달마다 좋은 날 · 분기 전략 · 개운 가이드 · 주의할 점',
      '무료와 차이: 무료는 신년 총운·띠 관계·좋은 달, 토정비결 작괘와 총평 한 줄까지',
      '광고로 보기: 광고 1회 시청 시 그날 자정까지 열람 (앱)',
      '이용 범위: 2027년이 지나도 다시 열람 가능 · 기기 변경 시 「구매 복원」'],
    counsel: ['구성: 상담 1회마다 선택지별 적합도·종합 의견 · 지금 대운과 올해 좋은 달 · MBTI 결정 스타일 · 인생 게임 가상 인생 비교(선택지마다 3번) · 실행 조언 3가지',
      '무료와 차이: 첫 상담 1회 무료, 이후 1회당 상담권 1장 (카르마 40으로도 1장 교환 가능)',
      'AI 상담사 답변(로그인 시): 이름·생년월일 없이 사주 요약과 고민만 서버로 보내고 저장하지 않아요',
      '소모성: 쓰면 줄어들고, 앱을 지우면 남은 상담권도 사라져요 (복원 대상 아님) · 상담 기록은 이 기기에만 저장'],
    compat: ['무료: 궁합 지수·산정 요소·한 줄 평', '추가: 두 사람의 성격·연애 스타일·올해 두 사람의 연애운',
      '이용 범위: 관계도에 등록한 모든 상대 · 기간 제한 없음 · 기기 변경 시 「구매 복원」'],
  },
  webDemoFree: [],          // 웹 체험판에서 무료로 여는 상품
  newYearFree: ['report'],          // 신년 이벤트 기간 무료 상품
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
  function unlock(k) { const u = unlocks(); u[k] = Date.now(); try { localStorage.setItem(UKEY, JSON.stringify(u)); } catch (e) {} fire(); }
  const isKarmaItem = k => !!(CFG.products[k] && CFG.products[k].k);
  const isTest = () => !!(window.Auth && Auth.isTest && Auth.isTest());
  function has(k) {
    if (owned[k]) return true;
    if (unlocks()[k]) return true;
    if (isTest() && CFG.products[k] && !CFG.products[k].consumable) return true;   // 테스트 계정: 유료 상품 전체 열람
    if (k === 'noads' && passOn()) return true;
    if (newYear() && CFG.newYearFree.includes(k)) return true;
    if (!native && CFG.webDemoFree.includes(k)) return true;
    return false;
  }
  function why(k) {
    if (owned[k]) return '구매함';
    if (unlocks()[k]) return '✨ 카르마로 열림';
    if (isTest() && CFG.products[k] && !CFG.products[k].consumable) return '🧪 테스트 계정 열람';
    if (k === 'noads' && passOn()) return '🍀 행운패스 사용 중';
    if (newYear() && CFG.newYearFree.includes(k)) return '🧧 신년 이벤트 무료';
    if (!native && CFG.webDemoFree.includes(k)) return '웹 체험판 무료 개방';
    return '';
  }
  function price(k) { const p = CFG.products[k]; if (p && p.k) return `✨ 카르마 ${p.k}`; return prices[k] || (p ? p.price : ''); }

  async function init() {
    if (!native || !NP) return;
    try {
      const ids = Object.values(CFG.products).filter(p => p.id).map(p => p.id);
      const r = await NP.getProducts({ productIdentifiers: ids, productType: 'inapp' });
      (r.products || []).forEach(p => { const k = Object.keys(CFG.products).find(k => CFG.products[k].id === p.identifier); if (k) prices[k] = p.priceString; });
      await restore(true);
    } catch (e) { console.warn('[Store] init', e); }
  }
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
    } catch (e) { if (!silent) console.warn('[Store] restore', e); return 0; }
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
    } catch (e) { onDone && onDone(false, String(e && e.message || e)); }
  }
  return { native, init, has, why, buy, restore, price, newYear, grant, unlock, isKarmaItem, notify: fire, packs: () => Object.keys(CFG.products).filter(k => CFG.products[k].karma), contents: () => Object.keys(CFG.products).filter(k => CFG.products[k].k), addPass, passUntil, passOn, onChange: f => subs.add(f), list: () => Object.keys(CFG.products), item: k => CFG.products[k], info: k => (CFG.products[k] && CFG.products[k].info) || CFG.info[k] || [] };
})();
