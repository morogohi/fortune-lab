/* =====================================================================
 *  오늘의 운세 공유 카드 — 1080×1350 이미지 + 짧은 글 + 「나도 보기」 링크
 *   · 생년월일·출생 시간은 넣지 않음 · 이름은 기본 숨김(선택 시 첫 글자만: 홍○○)
 *   · 앱: 공유 시트 · 웹: 공유(지원 시) 또는 내려받기 · 글 공유는 기존 Native.share
 * ===================================================================== */
window.TodayShare = (() => {
  const W = 1080, H = 1350;
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
  async function draw(p, f, withName) {
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
    // 하단
    g.fillStyle = C.navy; round(g, 100, H - 214, W - 200, 92, 46); g.fill();
    g.fillStyle = '#fff'; g.font = `700 40px ${SANS}`; g.textAlign = 'center'; g.fillText('내 생년월일로 나도 보기  →  운명 연구소', W / 2, H - 154);
    g.fillStyle = C.dim; g.font = `400 28px ${SANS}`; g.fillText('morogohi.github.io/fortune-lab · 전통 명리를 바탕으로 한 참고·재미용 풀이', W / 2, H - 76); g.textAlign = 'left';
    return cv.toDataURL('image/png');
  }
  function round(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const text = (p, f, withName) => `${label(p, withName)} · ${f.gzTxt}일\n총운 ${f.sc[0]}점 · ${f.grade}\n${f.lines[0]}\n행운의 색 ${f.lucky.color} · 숫자 ${f.lucky.num}`;

  /* 공유 창: 미리보기 · 이름 넣기(첫 글자만) · 이미지로 공유 / 글로 공유 / 이미지 저장 */
  let withName = false;
  async function open(p, f, onShared) {
    const body = () => `<div class="tsh"><img id="tshImg" alt="오늘의 운세 공유 카드 미리보기"><label class="tsh-n"><input type="checkbox" id="tshName" ${withName ? 'checked' : ''}> 이름 넣기 <small>(첫 글자만 · 생년월일은 넣지 않아요)</small></label></div>`;
    openOverlay('📤 오늘의 운세 공유', body(), [
      { t: '🖼️ 이미지로 공유', pri: 1, f: () => go('share') }, { t: '💬 글로 공유', f: () => go('text') }, { t: '⬇️ 이미지 저장', f: () => go('save') }, { t: '닫기' }]);
    let cache = {};   // 미리 그려 둔 이미지 (탭 직후 바로 공유 시트를 열기 위해)
    const img = async () => cache[withName] || (cache[withName] = await draw(p, f, withName));
    const paint = async () => { const u = await img(); const im = document.getElementById('tshImg'); if (im) im.src = u; };
    const cb = document.getElementById('tshName'); if (cb) cb.onchange = () => { withName = cb.checked; paint(); };
    paint();
    async function go(mode) {
      try {
        let r;
        if (mode === 'text') r = await Native.share(text(p, f, withName));
        else r = await Native.shareImage(await img(), text(p, f, withName), mode === 'save' ? 'save' : 'share', { file: `today-fortune-${KST.ymd()}.png`, title: '오늘의 운세' });
        if (r === 'copied') Hub.toast('공유할 글을 복사했어요'); else if (r === 'downloaded') Hub.toast('이미지를 저장했어요');
        try { Karma.metric('today_share_' + mode); } catch (e) { }
        onShared && onShared(mode, r);
      } catch (e) { if (!/abort|cancel/i.test(String(e && (e.name || e.message)))) { console.warn('share', e); Hub.toast('공유하지 못했어요. 다시 시도해 주세요'); } }
    }
  }
  return { open, draw, text, mask };
})();
