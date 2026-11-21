/* 단순한 회색 선 아이콘 (24×24, 선 굵기 1.8, currentColor) — 이모지 대신 메뉴·탭·버튼에 사용 */
window.ICONS = (() => {
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/><path d="M9 7.5h7M9 11h5"/>',
    scroll: '<path d="M7 3h11a2 2 0 0 1 2 2v1h-4"/><path d="M16 6v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 3a2 2 0 0 0-2 2v13"/><path d="M9 8h4M9 12h4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3M8 17h6"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" stroke-width="2.4"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
    spark: '<path d="M12 3.5 13.8 10 20.5 12l-6.7 2-1.8 6.5-1.8-6.5L3.5 12l6.7-2z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5z"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1.2"/><path d="M5 12.5V20h14v-7.5M12 8v12"/><path d="M12 8c-1.6-3.5-5.5-3.6-5.5-1.2C6.5 8 9 8 12 8zM12 8c1.6-3.5 5.5-3.6 5.5-1.2C17.5 8 15 8 12 8z"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.5a7.5 7.5 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.5 7.5 0 0 0 2.6-1.5l2.3 1 2-3.4z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  };
  const ic = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  // 제목 앞 컬러 이모지 제거 (본문 흐름은 그대로) — 화면 톤을 회색·단순하게
  const EMO = /^[\s\u200d\uFE0F\u20E3\p{Extended_Pictographic}\p{Regional_Indicator}]+/u;
  const SEL = '.hhead h2,.ht,.harea>div>b,.sjtxt h4,.hmenu b,#osheet>h3,.hhead small,.sjnow,.obtn,.ghost,.bigbtn,.hms>span,.hband small,.setrow>span,.hsteps span';
  function clean(root) {
    if (!root) return;
    root.querySelectorAll(SEL).forEach(el => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const n = w.nextNode();
      if (n && EMO.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(EMO, '');
    });
    const MAP = { hRep: 'scroll', mExch: 'gift', mShop: 'grid', mEdit: 'pen' };
    root.querySelectorAll('.hmenu button>span').forEach(sp => { if (!sp.querySelector('svg')) sp.innerHTML = ic(MAP[sp.parentElement.id] || 'chev'); });
  }
  return { ic, has: n => !!P[n], clean };
})();
