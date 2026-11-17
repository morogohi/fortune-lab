/* =====================================================================
 *  오늘의 운세 공유 카드 — 1080×1980 이미지 + 짧은 글 + 「나도 보기」 링크
 *   · 생년월일·출생 시간은 넣지 않음 · 이름은 기본 숨김(선택 시 첫 글자만: 홍○○)
 *   · 앱: 공유 시트 · 웹: 공유(지원 시) 또는 내려받기 · 글 공유는 기존 Native.share
 *   · 오늘의 타로(뽑았으면 그 카드) · 오늘의 명언(날짜마다 같은 문장) · Google Play 앱 받기 안내 포함
 *   · 하단 주소는 인생 게임 소개 페이지(PROMO)
 * ===================================================================== */
window.TodayShare = (() => {
  const W = 1080, H = 1980;
  const PROMO = 'https://morogohi.github.io/fortune-lab/game/';
  const PROMO_SHORT = 'morogohi.github.io/fortune-lab/game';
  // 오늘의 명언: 고전·옛사람의 말 (원문을 우리말로 옮김) — 날짜마다 같은 문장
  const QUOTES = [
    ['배우고 때때로 익히면 또한 기쁘지 아니한가.', '논어'], ['아는 것을 안다 하고 모르는 것을 모른다 하는 것, 그것이 아는 것이다.', '논어'],
    ['지나침은 모자람과 같다.', '논어'], ['군자는 화합하되 똑같아지지 않는다.', '논어'], ['세 사람이 길을 가면 그 가운데 반드시 나의 스승이 있다.', '논어'],
    ['날이 추워진 뒤에야 소나무와 잣나무가 늦게 시든다는 것을 안다.', '논어'], ['내가 원하지 않는 일을 남에게 시키지 말라.', '논어'],
    ['천 리 길도 한 걸음부터 시작된다.', '노자'], ['남을 아는 사람은 지혜롭고, 자신을 아는 사람은 밝다.', '노자'], ['가장 좋은 것은 물과 같다. 다투지 않고 만물을 이롭게 한다.', '노자'],
    ['만족할 줄 알면 욕되지 않고, 멈출 줄 알면 위태롭지 않다.', '노자'], ['큰 그릇은 늦게 이루어진다.', '노자'],
    ['하늘이 큰일을 맡기려 할 때는 먼저 마음을 괴롭히고 몸을 수고롭게 한다.', '맹자'], ['하늘의 때는 땅의 이로움만 못하고, 땅의 이로움은 사람의 화합만 못하다.', '맹자'],
    ['쓸모없는 것의 쓸모를 아는 사람은 드물다.', '장자'], ['우물 안 개구리에게는 바다를 이야기할 수 없다.', '장자'],
    ['복숭아와 오얏은 말이 없어도 그 아래 저절로 길이 난다.', '사기'], ['천 번 생각하는 지혜로운 이도 한 번은 실수한다.', '사기'], ['좋은 약은 입에 쓰나 병에 이롭다.', '사기'],
    ['작은 일을 참지 못하면 큰일을 그르친다.', '명심보감'], ['한때의 분을 참으면 백 날의 근심을 면한다.', '명심보감'], ['남을 이롭게 하는 말은 솜처럼 따뜻하다.', '명심보감'],
    ['집안이 화목하면 모든 일이 이루어진다.', '명심보감'], ['부지런함은 값을 매길 수 없는 보배다.', '명심보감'],
    ['물러설 줄 아는 한 걸음이 나아가는 바탕이 된다.', '채근담'], ['남의 작은 허물은 꾸짖지 말고, 남의 비밀은 드러내지 말라.', '채근담'],
    ['마음이 넓으면 몸도 편안하다.', '채근담'], ['고요한 가운데 보아야 마음의 참모습이 보인다.', '채근담'],
    ['오늘 할 수 있는 일을 내일로 미루지 말라.', '벤저민 프랭클린'], ['시간은 돈이다.', '벤저민 프랭클린'],
    ['우리를 괴롭히는 것은 일 자체가 아니라 그 일에 대한 생각이다.', '에픽테토스'], ['지금 할 수 있는 일에 마음을 쏟아라.', '마르쿠스 아우렐리우스'],
    ['운은 준비된 사람에게 찾아온다.', '세네카'], ['어려움이 클수록 그것을 이겨 낸 영광도 크다.', '세네카'],
    ['천천히 서두르라.', '아우구스투스'], ['너 자신을 알라.', '델포이 신전'], ['시작이 반이다.', '아리스토텔레스'],
    ['나무를 심기에 가장 좋은 때는 20년 전이었고, 그다음은 지금이다.', '옛 속담'], ['일곱 번 넘어져도 여덟 번 일어난다.', '옛 속담'],
    ['티끌 모아 태산.', '우리 속담'], ['돌다리도 두들겨 보고 건너라.', '우리 속담'], ['하늘이 무너져도 솟아날 구멍이 있다.', '우리 속담'],
  ];
  const quote = (d = KST.now()) => { const k = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate(); return QUOTES[(k * 7919) % QUOTES.length]; };
  const SANS = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  const C = { bg1: '#F7F4EE', bg2: '#ECE6F7', ink: '#292929', dim: '#6b6457', navy: '#24364B', gold: '#9B8457', line: '#D9CFBA', bar: '#E4DDCF' };
  const BAR = ['#7C6BC4', '#E07A9A', '#D9A441', '#4F86C6', '#5BAA7C'];
  const mask = n => { n = String(n || '').trim(); return n ? n[0] + '○'.repeat(Math.max(1, Math.min(2, n.length - 1))) : ''; };
  const label = (p, withName) => withName && p && p.name ? `${mask(p.name)}님의 오늘의 운세` : '오늘의 운세';

  function wrap(g, text, maxW) {
    const out = []; let line = '';
    for (const ch of String(text)) { const t = line + ch; if (g.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() ? ch : ''; } else line = t; }
    if (line) out.push(line); return out;
  }
  async function draw(p, f, withName, tr) {
    try { await document.fonts.ready; } catch (e) { }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, C.bg1); gr.addColorStop(1, C.bg2); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80);
    const d = KST.now(), wd = '일월화수목금토'[d.getDay()];
    g.textBaseline = 'alphabetic'; g.fillStyle = C.gold; g.font = `700 34px ${SANS}`; g.fillText('운명 연구소', 100, 140);
    g.fillStyle = C.dim; g.font = `400 34px ${SANS}`; g.textAlign = 'right'; g.fillText(`${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${wd}) · ${f.gzTxt}일`, W - 100, 140); g.textAlign = 'left';
    g.fillStyle = C.navy; g.font = `700 56px ${SANS}`; g.fillText(label(p, withName), 100, 250);
    g.fillStyle = C.ink; g.font = `800 150px ${SANS}`; g.fillText(`${f.sc[0]}`, 96, 430);
    const sw = g.measureText(`${f.sc[0]}`).width; g.font = `700 60px ${SANS}`; g.fillText(`점 · ${f.grade}`, 110 + sw, 430);
    g.fillStyle = C.ink; g.font = `500 44px ${SANS}`; let y = 530;
    const ls = wrap(g, f.lines[0], W - 200); if (ls.length > 2) { ls.length = 2; ls[1] = ls[1].replace(/.$/, '…'); }
    ls.forEach(l => { g.fillText(l, 100, y); y += 64; });
    // 분야별 막대
    y = 670; const AR = Fortune.AREAS || ['총운', '애정', '금전', '직장', '건강'];
    AR.forEach((n, i) => {
      const v = Math.max(0, Math.min(100, f.sc[i] || 0)), by = y + i * 66;
      g.fillStyle = C.dim; g.font = `500 38px ${SANS}`; g.fillText(n, 100, by + 14);
      g.fillStyle = C.bar; round(g, 240, by - 16, 620, 34, 17); g.fill();
      g.fillStyle = BAR[i % BAR.length]; round(g, 240, by - 16, Math.max(34, 620 * v / 100), 34, 17); g.fill();
      g.fillStyle = C.ink; g.font = `700 38px ${SANS}`; g.textAlign = 'right'; g.fillText(String(v), W - 100, by + 14); g.textAlign = 'left';
    });
    y = 985;
    g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(100, y); g.lineTo(W - 100, y); g.stroke();
    g.fillStyle = C.navy; g.font = `700 40px ${SANS}`; g.fillText('오늘의 행운', 100, y + 56);
    g.fillStyle = C.ink; g.font = `500 38px ${SANS}`;
    g.fillText(`색 ${f.lucky.color}  ·  숫자 ${f.lucky.num}${f.lucky.dir ? `  ·  방향 ${f.lucky.dir}` : ''}`, 100, y + 110);
    // 오늘의 타로
    y = 1140;
    g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(100, y); g.lineTo(W - 100, y); g.stroke();
    g.fillStyle = C.navy; g.font = `700 40px ${SANS}`; g.fillText('🃏 오늘의 타로', 100, y + 58);
    if (tr) {
      // 카드 그림 (오른쪽) — 역방향이면 뒤집어서
      const CW = 144, CH = 240, cx = W - 100 - CW, cy = y + 22; let pic = null;
      if (tr.img) pic = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = tr.img; });
      if (pic) {
        g.save(); round(g, cx, cy, CW, CH, 14); g.clip();
        if (tr.rev) { g.translate(cx + CW, cy + CH); g.rotate(Math.PI); g.drawImage(pic, 0, 0, CW, CH); } else g.drawImage(pic, cx, cy, CW, CH);
        g.restore(); g.strokeStyle = C.gold; g.lineWidth = 3; round(g, cx, cy, CW, CH, 14); g.stroke();
      }
      const TW = pic ? W - 200 - CW - 30 : W - 200;
      const nm = `${tr.name} · ${tr.rev ? '역방향' : '정방향'}`;
      g.fillStyle = C.gold; g.font = `700 40px ${SANS}`; g.fillText(nm, 100, y + 120);
      const nw = g.measureText(nm).width; g.font = `500 32px ${SANS}`;
      if (nw + 20 + g.measureText(`「${tr.kw}」`).width <= TW) { g.fillStyle = C.dim; g.fillText(`「${tr.kw}」`, 120 + nw, y + 120); }
      g.fillStyle = C.ink; g.font = `500 35px ${SANS}`;
      const tl = wrap(g, tr.msg, TW); if (tl.length > 3) { tl.length = 3; tl[2] = tl[2].replace(/.$/, '…'); }
      tl.forEach((l, i) => g.fillText(l, 100, y + 176 + i * 50));
    } else {
      g.fillStyle = C.ink; g.font = `500 38px ${SANS}`;
      g.fillText('하루 한 장, 질문을 떠올리고 카드를 골라 보세요.', 100, y + 120);
      g.fillStyle = C.dim; g.font = `400 34px ${SANS}`; g.fillText('운명 연구소에서 매일 무료로 뽑을 수 있어요.', 100, y + 176);
    }
    // 오늘의 명언
    y = 1440;
    const [qt, qs] = quote();
    g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(100, y); g.lineTo(W - 100, y); g.stroke();
    g.fillStyle = C.navy; g.font = `700 40px ${SANS}`; g.fillText('📜 오늘의 명언', 100, y + 58);
    g.fillStyle = C.ink; g.font = `600 40px ${SANS}`;
    const ql = wrap(g, `“${qt}”`, W - 200); if (ql.length > 2) { ql.length = 2; ql[1] = ql[1].replace(/.$/, '…'); }
    ql.forEach((l, i) => g.fillText(l, 100, y + 122 + i * 58));
    g.fillStyle = C.dim; g.font = `400 32px ${SANS}`; g.textAlign = 'right'; g.fillText(`— ${qs}`, W - 100, y + 122 + ql.length * 58 + 4); g.textAlign = 'left';
    // 하단: Google Play 앱 받기 안내 + 소개 페이지 주소
    g.fillStyle = C.navy; round(g, 100, H - 290, W - 200, 118, 59); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = `700 42px ${SANS}`; g.fillText('▶  Google Play에서 「운명 연구소」 받기', W / 2, H - 226);
    g.font = `400 30px ${SANS}`; g.fillStyle = '#D9E2EE'; g.fillText('인생 게임 · 오늘의 운세 · 매일 타로 · 사주', W / 2, H - 188);
    g.fillStyle = C.dim; g.font = `500 30px ${SANS}`; g.fillText(PROMO_SHORT, W / 2, H - 116);
    g.font = `400 26px ${SANS}`; g.fillText('전통 명리를 바탕으로 한 참고·재미용 풀이', W / 2, H - 78); g.textAlign = 'left';
    return cv.toDataURL('image/png');
  }
  function round(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const text = (p, f, withName, tr) => { const [qt, qs] = quote();
    return `${label(p, withName)} · ${f.gzTxt}일\n총운 ${f.sc[0]}점 · ${f.grade}\n${f.lines[0]}\n행운의 색 ${f.lucky.color} · 숫자 ${f.lucky.num}`
      + (tr ? `\n\n🃏 오늘의 타로: ${tr.name}(${tr.rev ? '역방향' : '정방향'}) 「${tr.kw}」\n${tr.msg}` : '')
      + `\n\n📜 오늘의 명언: “${qt}” — ${qs}`
      + `\n\n▶ Google Play에서 「운명 연구소」 앱 받기 · 인생 게임 소개\n${PROMO}`; };

  /* 공유 창: 미리보기 · 이름 넣기(첫 글자만) · 이미지로 공유 / 글로 공유 / 이미지 저장 */
  let withName = false;
  async function open(p, f, onShared, tr) {
    const body = () => `<div class="tsh"><img id="tshImg" alt="오늘의 운세 공유 카드 미리보기">${tr ? '' : '<p class="sjnote" style="margin:6px 0">🃏 오늘의 타로를 먼저 뽑으면 카드 메시지도 함께 담겨요</p>'}<label class="tsh-n"><input type="checkbox" id="tshName" ${withName ? 'checked' : ''}> 이름 넣기 <small>(첫 글자만 · 생년월일은 넣지 않아요)</small></label></div>`;
    openOverlay('📤 오늘의 운세 공유', body(), [
      { t: '🖼️ 이미지로 공유', pri: 1, f: () => go('share') }, { t: '💬 글로 공유', f: () => go('text') }, { t: '⬇️ 이미지 저장', f: () => go('save') }, { t: '닫기' }]);
    let cache = {};   // 미리 그려 둔 이미지 (탭 직후 바로 공유 시트를 열기 위해)
    const img = async () => cache[withName] || (cache[withName] = await draw(p, f, withName, tr));
    const paint = async () => { const u = await img(); const im = document.getElementById('tshImg'); if (im) im.src = u; };
    const cb = document.getElementById('tshName'); if (cb) cb.onchange = () => { withName = cb.checked; paint(); };
    paint();
    async function go(mode) {
      try {
        let r;
        if (mode === 'text') r = await Native.share(text(p, f, withName, tr));
        else r = await Native.shareImage(await img(), text(p, f, withName, tr), mode === 'save' ? 'save' : 'share', { file: `today-fortune-${KST.ymd()}.png`, title: '오늘의 운세' });
        if (r === 'copied') Hub.toast('공유할 글을 복사했어요'); else if (r === 'downloaded') Hub.toast('이미지를 저장했어요');
        try { Karma.metric('today_share_' + mode); } catch (e) { }
        onShared && onShared(mode, r);
      } catch (e) { if (!/abort|cancel/i.test(String(e && (e.name || e.message)))) { console.warn('share', e); Hub.toast('공유하지 못했어요. 다시 시도해 주세요'); } }
    }
  }
  return { open, draw, text, mask, quote, PROMO };
})();
