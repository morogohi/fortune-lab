/* 블로그 ↔ 웹앱 연결 (운명 연구소 블로그 fortune-lab.blogspot.com)
 *
 * 1) 들어오는 길: 블로그 글의 버튼  …/life/?go=tarot&from=blog
 *    → 해당 화면(타로·내 사주·신년운세·토정비결·궁합·인생 게임 등)을 바로 연다. 주소의 go·from 은 곧바로 지운다.
 * 2) 나가는 길: 사주·타로·신년운세·토정비결·궁합 화면 맨 아래에 「📖 그림으로 더 읽기」 카드
 *    → 블로그 최신 글 제목에서 지금 화면과 관련된 글을 골라 최대 3개 연결 (타로는 뽑은 카드 이름으로 매칭).
 *    블로그 글 목록은 화면을 열었을 때만 한 번 불러오고(JSONP, 입력한 생년월일 등은 보내지 않음) 탭을 닫을 때까지 재사용.
 * 3) 홈 「매일 혜택」 묶음에 「📚 운명 연구소 블로그」 항목.
 */
(function () {
  'use strict';
  const BLOG = 'https://fortune-lab.blogspot.com';
  const GO = ['today', 'saju', 'newyear', 'tojeong', 'compat', 'tarot', 'mbtitest', 'daily', 'game', 'flirt', 'mbti'];
  const TOPIC = {
    saju: { t: '사주 개념 그림 해설', kw: ['사주', '십성', '천간', '지지', '지장간', '격국', '용신', '오행', '신살', '명리'], q: '사주' },
    newyear: { t: '새해 흐름 더 읽기', kw: ['2027', '정미년', '신년', '절기'], q: '2027' },
    tojeong: { t: '토정비결 더 읽기', kw: ['토정'], q: '토정비결' },
    compat: { t: '궁합·띠 그림 해설', kw: ['궁합', '띠'], q: '궁합' },
    tarot: { t: '타로 카드 그림 해설', kw: ['타로'], q: '타로카드' },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hasHub = () => typeof Hub !== 'undefined';
  const isApp = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());

  /* ---------- 블로그 글 목록 (JSONP: blogspot 피드는 CORS 대신 callback 지원) ---------- */
  let posts = null, loading = null;
  function loadPosts() {
    if (posts) return Promise.resolve(posts);
    if (loading) return loading;
    try { const c = JSON.parse(sessionStorage.getItem('p8b_blogposts') || 'null'); if (c && Date.now() - c.at < 3600e3) { posts = c.list; return Promise.resolve(posts); } } catch (e) { }
    loading = new Promise(res => {
      const cb = '__blogFeed' + Date.now(), s = document.createElement('script');
      const done = list => { posts = list; loading = null; try { delete window[cb]; } catch (e) { } s.remove(); res(list); };
      const to = setTimeout(() => done([]), 6000);
      window[cb] = d => {
        clearTimeout(to);
        const list = ((d && d.feed && d.feed.entry) || []).map(e => ({
          t: e.title.$t, u: ((e.link || []).find(l => l.rel === 'alternate') || {}).href, l: (e.category || []).map(c => c.term),
        })).filter(x => x.u && /^https:\/\/fortune-lab\.blogspot\.com\//.test(x.u));
        try { sessionStorage.setItem('p8b_blogposts', JSON.stringify({ at: Date.now(), list })); } catch (e) { }
        done(list);
      };
      s.src = `${BLOG}/feeds/posts/summary?alt=json-in-script&max-results=150&callback=${cb}`;
      s.onerror = () => { clearTimeout(to); done([]); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function pick(list, words, n) {
    const score = p => words.reduce((s, w, i) => s + (p.t.includes(w) || p.l.includes(w) ? (words.length - i) : 0), 0);
    return list.map(p => [score(p), p]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);
  }
  // 타로: 뽑은 카드 이름(예: '전차', 'The Chariot') → 해당 카드 해설 글을 먼저
  function tarotWords(body) {
    const w = [];
    body.querySelectorAll('.tspread img[alt], .hdt-open img[alt], .tsum img[alt]').forEach(i => { const a = i.getAttribute('alt'); if (a && !w.includes(a)) w.push(a); });
    return w.length ? w.concat(['타로']) : ['타로'];
  }
  const link = u => u + (u.includes('?') ? '&' : '?') + 'm=1';

  /* ---------- 화면 맨 아래 관련 글 카드 ---------- */
  let seq = 0;
  function decorate() {
    const body = document.getElementById('hubBody'); if (!body || !hasHub()) return;
    const tab = Hub.cur(), T = TOPIC[tab];
    if (!T || body.querySelector('.blogrel')) return;
    const id = ++seq;
    body.insertAdjacentHTML('beforeend', `<div class="hcard blogrel"><h3 class="ht">📖 ${esc(T.t)}</h3>
      <p class="brsub">운명 연구소 블로그에서 그림으로 쉽게 풀어 드려요</p><div class="brlist"><small class="brwait">관련 글을 찾는 중…</small></div>
      <a class="bropen" href="${BLOG}/search?q=${encodeURIComponent(T.q)}&m=1" target="_blank" rel="noopener">블로그에서 더 보기 ›</a></div>`);
    const words = tab === 'tarot' ? tarotWords(body) : T.kw;
    loadPosts().then(list => {
      if (id !== seq) return;
      const box = body.querySelector('.blogrel .brlist'); if (!box) return;
      const hit = pick(list, words, 3);
      box.innerHTML = hit.length
        ? hit.map(p => `<a class="bri" href="${esc(link(p.u))}" target="_blank" rel="noopener">${esc(p.t)}</a>`).join('')
        : '<small class="brwait">이 주제의 글은 곧 올라와요. 블로그에서 다른 해설을 둘러보세요.</small>';
    });
  }

  /* ---------- 들어오는 길: ?go= ---------- */
  function deepLink() {
    let q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    const go = q.get('go'), from = q.get('from');
    if (!go && !from) return;
    q.delete('go'); q.delete('from');
    const rest = q.toString();
    try { history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) { }
    if (go && GO.includes(go) && hasHub()) setTimeout(() => { try { Hub.openItem(go); } catch (e) { } }, 60);
    if (from === 'blog' && hasHub()) setTimeout(() => Hub.toast('📚 블로그에서 오셨군요! 내 생년월일로 바로 확인해 보세요'), 600);
  }

  function css() {
    const st = document.createElement('style');
    st.textContent = `.blogrel .brsub{margin:2px 0 8px;font-size:13px;color:var(--dim)}
.blogrel .brlist{display:flex;flex-direction:column;gap:6px}
.blogrel .bri{display:block;padding:10px 12px;border-radius:12px;background:var(--card2);color:inherit;text-decoration:none;font-size:14px;line-height:1.4}
.blogrel .bri::before{content:'📄 '}
.blogrel .brwait{color:var(--dim);font-size:13px}
.blogrel .bropen{display:inline-block;margin-top:10px;font-size:13px;color:var(--hap,#c0392b);text-decoration:none;font-weight:600}`;
    document.head.appendChild(st);
  }

  function init() {
    if (!hasHub()) return;
    css();
    Hub.register({ after: 'daily', item: { k: 'blog', g: 'daily', c: 'peach', ic: 'book', e: '📚', n: '운명 연구소 블로그', d: '사주 · 타로 · 주역 그림 해설 읽기', need: 0,
      f: () => { const w = window.open(BLOG + '/?m=1', '_blank', 'noopener'); if (!w && !isApp()) location.href = BLOG + '/?m=1'; } } });
    const body = document.getElementById('hubBody');
    if (body) new MutationObserver(() => decorate()).observe(body, { childList: true });
    deepLink();
  }
  init();
  window.BlogBridge = { loadPosts, pick, decorate };
})();
