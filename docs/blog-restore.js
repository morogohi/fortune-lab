/* 운명 연구소 블로그 — 그림 해설 도해 복원 (블로그 가젯에 <script>로 넣어 씀)
 * 원인: 이메일 게시(Gmail 발송) 과정에서 인라인 background·gap·align-items·flex-wrap 등이 지워져
 *       흰 글자만 남은 상자, 빈 막대·색칩, 한 줄로 넘치는 카드가 생김.
 * 방법: 남아 있는 글자색·모양 정보로 배경과 배치를 다시 입힌다. (글 HTML은 건드리지 않음)
 */
(function () {
  var NAVY = '#1b2442', GOLD = '#c9a45c', GOLD2 = '#e8c472';
  var EL = { wood: '#4f8a4b', fire: '#c0504d', earth: '#c9962e', metal: '#8a8f98', water: '#3b4a78' };
  var MAP = {};
  '甲乙寅卯목木'.split('').forEach(function (c) { MAP[c] = EL.wood; });
  '丙丁巳午화火'.split('').forEach(function (c) { MAP[c] = EL.fire; });
  '戊己辰戌丑未토土'.split('').forEach(function (c) { MAP[c] = EL.earth; });
  '庚辛申酉금金'.split('').forEach(function (c) { MAP[c] = EL.metal; });
  '壬癸亥子수水'.split('').forEach(function (c) { MAP[c] = EL.water; });
  var WORD = [[/완드|불|여름/, EL.fire], [/컵|물|겨울/, EL.water], [/소드|바람|가을/, EL.metal], [/펜타클|흙|환절기/, EL.earth], [/봄|나무/, EL.wood]];

  function sv(el, k) { return (el.getAttribute('style') || '').toLowerCase().replace(/\s+/g, '').indexOf(k) >= 0; }
  function hasBg(el) { var s = (el.getAttribute('style') || '').toLowerCase(); return /background/.test(s); }
  function isWhite(el) { return sv(el, 'color:#fff') || sv(el, 'color:white') || sv(el, 'color:rgb(255,255,255)'); }
  function isGoldText(el) { return sv(el, 'color:' + GOLD2) || sv(el, 'color:' + GOLD); }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ''); }
  function elColor(el) {
    var t = txt(el);
    if (t.length && t.length <= 4 && MAP[t.charAt(0)]) return MAP[t.charAt(0)];   // 壬10, 甲, 寅 …
    var b = el.querySelector('b,strong,div');
    if (b) { var bt = txt(b); for (var i = 0; i < WORD.length; i++) if (WORD[i][0].test(bt.slice(0, 6))) return WORD[i][1]; }
    var m = t.match(/^[^가-힣A-Za-z]*(.)/); if (m && MAP[m[1]] && t.length <= 6) return MAP[m[1]];
    var ds = el.querySelectorAll('div,span,b'); for (var j = 0; j < ds.length; j++) { var dt = txt(ds[j]); if (dt.length === 1 && /[\u4e00-\u9fff]/.test(dt) && MAP[dt]) return MAP[dt]; }
    return null;
  }
  function paint(el, bg) { el.style.background = bg; if (!el.style.padding && !sv(el, 'padding')) el.style.padding = '2px 6px'; }

  function fix(root) {
    if (root.getAttribute('data-flfix')) return; root.setAttribute('data-flfix', '1');
    var all = root.querySelectorAll('[style]');
    for (var i = 0; i < all.length; i++) {
      var el = all[i]; if (hasBg(el)) continue;
      var tag = el.tagName;
      // 1) 표 머리행
      if (tag === 'TR') { if (isGoldText(el)) el.style.background = NAVY; else if (sv(el, 'color:' + NAVY)) el.style.background = '#f3ead7'; continue; }
      // 2) 표지 배너 (금색 글자 + 둥근 모서리 상자)
      if (tag === 'DIV' && isGoldText(el) && sv(el, 'border-radius') && sv(el, 'padding')) { el.style.background = NAVY; continue; }
      // 3) 흰 글자 칸 → 오행 색 또는 남색 (비율 막대 묶음은 칸마다 따로 칠함)
      if (isWhite(el) && sv(el, 'display:flex') && el.children.length && /%/.test(el.children[0].getAttribute('style') || '')) {
        for (var c = 0; c < el.children.length; c++) el.children[c].style.background = elColor(el.children[c]) || NAVY;
        continue;
      }
      if (isWhite(el)) { paint(el, elColor(el) || NAVY); continue; }
      var empty = !txt(el) && !el.children.length;
      // 4) 막대그래프의 막대
      if (empty && sv(el, 'height:') && sv(el, 'border-radius:6px6px00')) { el.style.background = 'linear-gradient(180deg,' + GOLD2 + ',' + NAVY + ')'; el.style.width = '100%'; continue; }
      // 5) 색칩·그림 조각 (빈 span/div)
      if (empty && (sv(el, 'width:') || sv(el, 'height:'))) { el.style.background = sv(el, 'border:') ? '#ffffff' : (sv(el, 'height:34px') ? GOLD : NAVY); continue; }
    }
    // 6) 가로 배치 복원
    var flex = root.querySelectorAll('[style*="display:flex"],[style*="display: flex"]');
    for (var j = 0; j < flex.length; j++) {
      var f = flex[j], kids = f.children, k;
      if (sv(f, 'gap:')) continue;          // 새 [그림 해설] 글: gap 지정 행은 원래 레이아웃 유지
      if (sv(f, 'height:')) {                     // 막대그래프
        f.style.alignItems = 'flex-end'; f.style.justifyContent = 'space-around'; f.style.gap = '8px';
        for (k = 0; k < kids.length; k++) { kids[k].style.flex = '1'; kids[k].style.display = 'flex'; kids[k].style.flexDirection = 'column'; kids[k].style.justifyContent = 'flex-end'; }
      } else if (kids.length && sv(kids[0], 'width:') && /%/.test(kids[0].getAttribute('style'))) {   // 비율 막대(표 안)
        f.style.gap = '2px';
        for (k = 0; k < kids.length; k++) { kids[k].style.borderRadius = '4px'; kids[k].style.padding = '2px 0'; }
      } else {                                    // 카드 줄
        f.style.flexWrap = 'wrap'; f.style.gap = '8px'; f.style.justifyContent = 'center';
        for (k = 0; k < kids.length; k++) if (kids[k].tagName === 'DIV') kids[k].style.flex = txt(kids[k]).length <= 14 ? '1 1 80px' : '1 1 140px';
      }
    }
  }
  function run() {
    var css = document.createElement('style');
    css.textContent = '.post-body table{max-width:100%}.post-body table td,.post-body table th{word-break:keep-all;overflow-wrap:anywhere}.post-body img{max-width:100%;height:auto}';
    document.head.appendChild(css);
    var bodies = document.querySelectorAll('.post-body');
    for (var i = 0; i < bodies.length; i++) fix(bodies[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.FLRestore = { fix: fix };
})();
