/* 날짜 고르기: 기본 달력 대신 연·월·일을 위아래로 굴려 고르는 휠 (취소 / 확인)
 * 화면의 모든 input[type=date]를 자동으로 바꿈. 값 형식은 그대로 'YYYY-MM-DD'라 기존 코드는 그대로 동작 */
const DateWheel = (() => {
  const IH = 48;                      // 한 칸 높이
  let box = null, st = null;
  const pad = n => String(n).padStart(2, '0');
  const dim = (y, m) => new Date(y, m, 0).getDate();
  function parse(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }

  function build() {
    box = document.createElement('div'); box.className = 'dw-back'; box.hidden = true;
    box.innerHTML = `<div class="dw" role="dialog" aria-modal="true" aria-label="생년월일 선택">
      <div class="dw-cols"><div class="dw-col" data-k="y" tabindex="0" aria-label="연도"></div><div class="dw-col" data-k="m" tabindex="0" aria-label="월"></div><div class="dw-col" data-k="d" tabindex="0" aria-label="일"></div>
        <i class="dw-line t"></i><i class="dw-line b"></i></div>
      <div class="dw-btns"><button type="button" class="dw-no">취소</button><button type="button" class="dw-ok">확인</button></div></div>`;
    document.body.appendChild(box);
    box.addEventListener('click', e => { if (e.target === box) close(); });
    box.querySelector('.dw-no').onclick = close;
    box.querySelector('.dw-ok').onclick = ok;
    box.querySelectorAll('.dw-col').forEach(c => {
      let t = null;
      c.addEventListener('scroll', () => { mark(c); clearTimeout(t); t = setTimeout(() => settle(c), 90); }, { passive: true });
      c.addEventListener('click', e => { const it = e.target.closest('.dw-it'); if (it) to(c, +it.dataset.i); });
      c.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); to(c, idx(c) + (e.key === 'ArrowDown' ? 1 : -1)); }
        else if (e.key === 'Enter') { e.preventDefault(); ok(); } else if (e.key === 'Escape') close();
      });
    });
  }
  const cols = () => [...box.querySelectorAll('.dw-col')];
  const col = k => box.querySelector(`.dw-col[data-k="${k}"]`);
  const idx = c => Math.max(0, Math.min(c.children.length - 3, Math.round(c.scrollTop / IH)));
  function fill(c, vals, fmt, sel) {
    c.innerHTML = '<div class="dw-sp"></div>' + vals.map((v, i) => `<div class="dw-it" data-i="${i}" data-v="${v}">${fmt(v)}</div>`).join('') + '<div class="dw-sp"></div>';
    c.scrollTop = Math.max(0, vals.indexOf(sel)) * IH; mark(c);
  }
  function mark(c) { const i = idx(c); [...c.querySelectorAll('.dw-it')].forEach((e, k) => { e.classList.toggle('on', k === i); e.setAttribute('aria-selected', k === i); }); }
  function to(c, i) { i = Math.max(0, Math.min(c.querySelectorAll('.dw-it').length - 1, i)); c.scrollTo({ top: i * IH, behavior: 'smooth' }); setTimeout(() => { c.scrollTop = i * IH; settle(c); }, 220); }
  function val(k) { const c = col(k), it = c.querySelectorAll('.dw-it')[idx(c)]; return it ? +it.dataset.v : null; }
  function settle(c) {
    mark(c);
    if (c.dataset.k !== 'd') {           // 연·월이 바뀌면 그 달의 날짜 수로 다시 채움
      const y = val('y'), m = val('m'), n = dim(y, m), dc = col('d'), cur = Math.min(val('d') || 1, n);
      if (dc.querySelectorAll('.dw-it').length !== n) fill(dc, Array.from({ length: n }, (_, i) => i + 1), pad, cur);
    }
  }
  function open(inp) {
    if (!box) build();
    const lo = parse(inp.min) || { y: 1900 }, hi = parse(inp.max) || { y: new Date().getFullYear() + 5 };
    const v = parse(inp.value) || { y: Math.min(1990, hi.y), m: 1, d: 1 };
    st = { inp, lo, hi };
    box.hidden = false; document.documentElement.classList.add('dw-lock');
    fill(col('y'), Array.from({ length: hi.y - lo.y + 1 }, (_, i) => lo.y + i), String, Math.min(Math.max(v.y, lo.y), hi.y));
    fill(col('m'), Array.from({ length: 12 }, (_, i) => i + 1), String, v.m);
    fill(col('d'), Array.from({ length: dim(v.y, v.m) }, (_, i) => i + 1), pad, Math.min(v.d, dim(v.y, v.m)));
    setTimeout(() => col('y').focus({ preventScroll: true }), 30);
  }
  function close() { if (!box) return; box.hidden = true; document.documentElement.classList.remove('dw-lock'); const i = st && st.inp; st = null; if (i) i.focus({ preventScroll: true }); }
  function ok() {
    if (!st) return close();
    let s = `${val('y')}-${pad(val('m'))}-${pad(val('d'))}`;
    const { inp } = st;
    if (inp.max && s > inp.max) s = inp.max; if (inp.min && s < inp.min) s = inp.min;   // 미래 날짜 등은 범위 안으로
    inp.value = s;
    inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  }
  // input[type=date] → 글자 칸(값 형식 동일) + 누르면 휠
  function enhance(inp) {
    if (inp.dataset.dw) return; inp.dataset.dw = '1';
    const v = inp.value; inp.type = 'text'; inp.value = v;
    inp.setAttribute('inputmode', 'none'); inp.setAttribute('autocomplete', 'off');
    if (!inp.placeholder) inp.placeholder = '날짜를 눌러 고르세요';
    inp.classList.add('dw-in');
    inp.addEventListener('click', e => { e.preventDefault(); open(inp); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); open(inp); } });
  }
  function scan(root) { (root.querySelectorAll ? root : document).querySelectorAll('input[type=date]').forEach(enhance); }
  function init() {
    scan(document);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches && n.matches('input[type=date]')) enhance(n); else scan(n); })))
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { open, enhance, isOpen: () => !!(box && !box.hidden) };
})();
