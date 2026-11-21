/* 본문의 「이전 글 제목」 언급을 실제 글 링크로 바꿈 (블로그 가젯) — 같은 블로그 피드에서 제목을 찾아 연결 */
(function () {
  function toks(s) { return (s.match(/[가-힣一-鿿A-Za-z0-9]{2,}/g) || []).map(function (t) { return t.replace(/(으로|에서|으로|로|의|와|과|을|를|은|는|이|가)$/, ''); }); }
  function best(q, posts, self) {
    var qt = toks(q); if (!qt.length) return null; var top = null, sc = 0;
    posts.forEach(function (p) {
      if (p.u === self) return;
      var pt = toks(p.t).join(' '), hit = 0;
      qt.forEach(function (t) { if (pt.indexOf(t) >= 0) hit++; });
      var s = hit / qt.length; if (s > sc) { sc = s; top = p; }
    });
    return sc >= 0.6 ? top : null;
  }
  function run() {
    var body = document.querySelector('.post-body'); if (!body || !/\/\d{4}\/\d{2}\//.test(location.pathname)) return;
    if (!/「[^」]{2,60}」/.test(body.textContent)) return;
    fetch('/feeds/posts/summary?alt=json&max-results=500').then(function (r) { return r.json(); }).then(function (d) {
      var posts = (d.feed.entry || []).map(function (e) { return { t: e.title.$t, u: (e.link.filter(function (l) { return l.rel === 'alternate'; })[0] || {}).href }; });
      var self = location.href.split(/[?#]/)[0];
      var w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = w.nextNode())) if (/「[^」]{2,60}」/.test(n.nodeValue) && !(n.parentNode.closest && n.parentNode.closest('a'))) nodes.push(n);
      nodes.forEach(function (node) {
        var frag = document.createDocumentFragment(), s = node.nodeValue, last = 0, m, re = /「([^」]{2,60})」/g;
        while ((m = re.exec(s))) {
          var p = best(m[1], posts, self);
          frag.appendChild(document.createTextNode(s.slice(last, m.index)));
          if (p) { var a = document.createElement('a'); a.href = p.u; a.textContent = '「' + m[1] + '」'; a.title = p.t; frag.appendChild(a); }
          else frag.appendChild(document.createTextNode(m[0]));
          last = re.lastIndex;
        }
        frag.appendChild(document.createTextNode(s.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    }).catch(function () { });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
