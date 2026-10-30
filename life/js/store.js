/* =====================================================================
 *  Store — 상점 · 인앱결제
 *   앱(Android·iOS): @capgo/native-purchases 로 실제 결제
 *   웹(GitHub Pages): 결제가 없으므로 '체험판' — 프리미엄 사주 리포트만 무료 개방
 *   신년 이벤트 기간(12/15~2/28): 프리미엄 사주 리포트 무료
 * ===================================================================== */
window.STORE_CONFIG = {
  // 스토어 콘솔(Play Console · App Store Connect)에 같은 ID로 '일회성 상품'을 만들어야 합니다
  products: {
    report: { id: 'p8b_saju_report', e: '📜', n: '프리미엄 사주 리포트', d: '올해 운세 · 10년 대운 상세 · 성격·연애·재물·건강 풀이 (평생 무제한)', price: '₩2,900', consumable: false },
    noads:  { id: 'p8b_remove_ads', e: '🚫', n: '광고 제거', d: '배너·전면 광고 영구 제거 (보상형 광고는 원할 때만)', price: '₩3,900', consumable: false },
    fate:   { id: 'p8b_fate_pack', e: '🎛️', n: '운명 조작 팩', d: '태어날 가정형편과 타고난 재능을 직접 선택', price: '₩2,500', consumable: false },
    karma:  { id: 'p8b_karma_100', e: '✨', n: '카르마 100', d: '다시 태어나기 6번 또는 기적 2번', price: '₩1,200', consumable: true, karma: 100 },
  },
  webDemoFree: ['report'],          // 웹 체험판에서 무료로 여는 상품
  newYearFree: ['report'],          // 신년 이벤트 기간 무료 상품
};

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
  function has(k) {
    if (owned[k]) return true;
    if (newYear() && CFG.newYearFree.includes(k)) return true;
    if (!native && CFG.webDemoFree.includes(k)) return true;
    return false;
  }
  function why(k) {
    if (owned[k]) return '구매함';
    if (newYear() && CFG.newYearFree.includes(k)) return '🧧 신년 이벤트 무료';
    if (!native && CFG.webDemoFree.includes(k)) return '웹 체험판 무료 개방';
    return '';
  }
  function price(k) { return prices[k] || CFG.products[k].price; }

  async function init() {
    if (!native || !NP) return;
    try {
      const ids = Object.values(CFG.products).map(p => p.id);
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
      onDone && onDone(true);
    } catch (e) { onDone && onDone(false, String(e && e.message || e)); }
  }
  return { native, init, has, why, buy, restore, price, newYear, list: () => Object.keys(CFG.products), item: k => CFG.products[k] };
})();
