/* =====================================================================
 *  pdfreport.js — 📑 종합 사주 리포트 (PDF)
 *   상점의 '프리미엄 사주 리포트'를 대신하는 종합 리포트. 한 사람의 모든 풀이를 한 권으로 묶어 PDF로 만든다.
 *   구성: 표지 · 사주풀이(무료 내용 전체) · 신년운세 상세 · 토정비결 상세(월별) · 사주 MBTI 상세 · 바람기 상세
 *         · 등록한 사람들과의 궁합 상세(최대 3명) · 오늘의 운세 요약
 *   - 요금: 만들 때 카르마 (views.js 'pdf' 항목) · 결제한 날 다시 만들기 3회 무료 · 예전 상세 리포트 보유자 무료
 *   - 모두 기기 안에서 만든다 (html2canvas → jsPDF, 필요할 때만 불러옴). 개인정보를 어디로도 보내지 않음
 *   - 저장: 앱은 파일 저장 후 공유 시트(Filesystem+Share), 웹은 내려받기
 * ===================================================================== */
const PdfReport = (() => {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const libBase = () => new URL('lib/', document.baseURI).href;   // 테스트 페이지(<base href="../life/">)도 공용 lib 사용
  const loadJs = src => new Promise((ok, no) => { if ([...document.scripts].some(x => x.src === src)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.head.appendChild(s); });
  async function libs() {
    const b = libBase();
    if (!window.html2canvas) await loadJs(b + 'html2canvas.min.js');
    if (!(window.jspdf && window.jspdf.jsPDF)) await loadJs(b + 'jspdf.umd.min.js');
  }
  const subj = p => Views.subj(p);
  const Y = () => { const d = new Date(); return d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear(); };

  /* ---------- 리포트 본문 (섹션 = 카드 묶음) ---------- */
  function sections(p) {
    const a = Hub.analyze(p); if (!a) return null;
    const S = window.SAJU, age = Y() - +p.date.slice(0, 4), out = [];
    const now = new Date(), people = (Hub.people() || []).filter(q => q && q.date && Hub.analyze(q)).slice(0, 3);
    const h = (e, t, sub) => `<div class="pdf-h"><b>${e} ${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    out.push({ t: '표지', html: `<div class="pdf-cover"><div class="pdf-logo">🔮 운명 연구소</div><h1>${esc(p.name)}님의<br>종합 사주 리포트</h1>
      <p>${p.date.replace(/-/g, '.')} ${p.cal === 'l' ? '음력' : '양력'} · ${p.time || '시간 모름'} · ${p.sex === 'f' ? '여' : '남'}</p>
      <p class="pdf-gz">${S.ST[a.p.y.s]}${S.BR[a.p.y.b]}년 · ${S.ST[a.p.m.s]}${S.BR[a.p.m.b]}월 · ${S.ST[a.p.d.s]}${S.BR[a.p.d.b]}일${a.p.h ? ` · ${S.ST[a.p.h.s]}${S.BR[a.p.h.b]}시` : ''}</p>
      <div class="pdf-toc"><b>차례</b>${['타고난 사주풀이', `${Y()} 신년운세 상세`, `${Y()} 토정비결 · 월별 상세`, '사주 MBTI 상세', '연애 성향(바람기) 상세', ...(people.length ? [`궁합 상세 · ${people.map(q => esc(q.name)).join(', ')}`] : [])].map((t, i) => `<p>${i + 1}. ${t}</p>`).join('')}</div>
      <p class="pdf-date">만든 날 ${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} · 이 리포트는 기기 안에서 만들어졌어요</p></div>` });
    out.push({ t: '사주풀이', html: h('📜', '1. 타고난 사주풀이', '일간·오행·성격·강점·연애·재물·건강·개운') + `<div class="hcard">${reportHTML(esc(p.name), a, age)}</div>` });
    try { out.push({ t: '신년운세', html: h('🧧', `2. ${Y()} 신년운세 상세`, '한 해 총운 · 분야별 · 12개월 · 대운 · 분기 전략') + Detail.newyear(p, a) }); } catch (e) { console.warn('pdf newyear', e); }
    try { const t = Tojeong.calc(p, Y()); if (t) out.push({ t: '토정비결', html: h('🏮', `3. ${Y()} 토정비결 상세`, '괘 풀이 · 계절 흐름 · 월별 상세') + Detail.tojeong(p, a, t) }); } catch (e) { console.warn('pdf tojeong', e); }
    const me = Object.assign({}, p, { self: true });
    try { out.push({ t: 'MBTI', html: h('🧩', '4. 사주 MBTI 상세', '축별 근거 · 일·관계·연애 · 잘 맞는 유형') + Detail.mbti(me, a, Fun.mbti(a), null) }); } catch (e) { console.warn('pdf mbti', e); }
    try { out.push({ t: '바람기', html: h('💘', '5. 연애 성향(바람기) 상세', '사주 근거 · 연애 패턴 · 대운별 연애 흐름') + Detail.flirt(me, a, Fun.flirt(a, p.sex !== 'f')) }); } catch (e) { console.warn('pdf flirt', e); }
    people.forEach((q, i) => { try { out.push({ t: '궁합 ' + q.name, html: h('💞', `6-${i + 1}. 궁합 상세 · ${esc(p.name)} × ${esc(q.name)}`, '오행·일간·띠 · 대화법 · 갈등 해법 · 함께 좋은 달') + Detail.compat(p, a, q, Hub.analyze(q), q.rel) }); } catch (e) { console.warn('pdf compat', e); } });
    out.push({ t: '맺음말', html: `<div class="hcard"><h3 class="ht">🍀 맺음말</h3><div class="sjtxt"><p>사주는 정해진 운명이 아니라 타고난 기운의 지도예요. 좋은 시기는 준비한 사람에게 더 크게 오고, 조심할 시기는 미리 아는 것만으로 한결 가벼워져요.</p>
      <p>${esc(p.name)}님에게 부족한 기운은 <b>${S.EK[a.weak]}</b>이에요. ${a.dm.개운}</p></div>
      <p class="sjnote">※ 전통 명리 이론을 바탕으로 한 참고·재미용 리포트예요. 건강·법률·투자처럼 중요한 결정은 전문가와 상의하세요. · 운명 연구소</p></div>` });
    return out;
  }

  /* ---------- 미리보기 + PDF 만들기 ---------- */
  function previewHTML(p) {
    const s = sections(p); if (!s) return '<p class="hsub">내 정보를 먼저 입력해 주세요.</p>';
    return `<div class="hcard pdf-bar"><b>📑 종합 사주 리포트</b><small>${s.length}개 장 · 아래 내용을 그대로 PDF로 저장해요</small>
      <button class="bigbtn wide" id="pdfMake">📥 PDF로 저장하기</button><div class="fk-bar pdf-prog" hidden><i id="pdfBar"></i></div><p class="sjnote" id="pdfMsg"></p></div>`
      + s.map(x => `<div class="pdf-sec">${x.html}</div>`).join('');
  }
  // 화면 테마와 상관없이 흰 바탕 · 진한 글씨로 그린다
  const PDF_CSS = `.pdfdoc{position:fixed;left:-10000px;top:0;width:720px;background:#fff;color:#222;padding:0;--card:#fff;--card2:#f4f3f8;--ink:#222;--ink2:#333;--dim:#666;--line:#e3e1ea;--line2:#d5d2de;--money:#2f8f5b;--hp:#c24b4b;--hap:#b98a1d;--accent:#6a5acd}
    .pdfdoc .hcard{box-shadow:none;border:1px solid #e3e1ea;background:#fff;margin:0 0 10px;border-radius:12px}.pdfdoc *{animation:none!important;transition:none!important;box-shadow:none!important}.pdfdoc .tjm.hi,.pdfdoc .cs-deep.best{border:1.5px solid #2f8f5b}.pdfdoc .tjm.lo{border:1.5px solid #c24b4b}.pdfdoc .tjm,.pdfdoc .tjm-g div,.pdfdoc .tjm-c{border:1px solid #e3e1ea}.pdfdoc .tjbrief div.hi{border-left:3px solid #2f8f5b}.pdfdoc .tjbrief div.lo{border-left:3px solid #c24b4b}.pdfdoc .tjmonths div.hi{border:1.5px solid #2f8f5b}.pdfdoc .tjmonths div.lo{border:1.5px solid #c24b4b}.pdfdoc .sjtxt,.pdfdoc .sjsum,.pdfdoc .hcard>div{background-color:transparent}.pdfdoc .pdf-toc p{margin:4px 0}
    .pdfdoc .pdf-cover{height:980px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(160deg,#f6f1ff,#fff7ea);border-radius:0}
    .pdfdoc .pdf-cover h1{font-size:40px;line-height:1.3;margin:18px 0}.pdfdoc .pdf-logo{font-size:20px;color:#6a5acd;font-weight:700}.pdfdoc .pdf-gz{font-size:22px;letter-spacing:2px;color:#5a4a1d}
    .pdfdoc .pdf-toc{text-align:left;background:#fff;border-radius:14px;padding:14px 22px;margin:22px 0;border:1px solid #e3e1ea;font-size:16px;line-height:1.8}.pdfdoc .pdf-date{color:#888;font-size:13px}
    .pdfdoc .pdf-h,.pdf-sec .pdf-h{display:flex;flex-direction:column;padding:12px 4px 8px;border-bottom:2px solid #6a5acd;margin:6px 0 10px}.pdf-h b{font-size:20px}.pdf-h small{color:#666;margin-top:2px}`;
  async function make(p, done) {
    const s = sections(p); if (!s) return;
    const msg = t => { const m = $('#pdfMsg'); if (m) m.textContent = t; }, bar = v => { const b = $('#pdfBar'); if (b) { b.parentNode.hidden = false; b.style.width = Math.round(v * 100) + '%'; } };
    const btn = $('#pdfMake'); if (btn) btn.disabled = true;
    try {
      msg('PDF 도구를 불러오는 중…'); await libs();
      let st = document.getElementById('pdfCss'); if (!st) { st = document.createElement('style'); st.id = 'pdfCss'; st.textContent = PDF_CSS; document.head.appendChild(st); }
      const box = document.createElement('div'); box.className = 'pdfdoc'; document.body.appendChild(box);
      const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const PW = 210, PH = 297, M = 10, W = PW - M * 2, HMAX = PH - M * 2 - 6;
      let y = M, page = 1, first = true;
      const foot = () => { doc.setFontSize(8); doc.setTextColor(150); doc.text(`- ${page} -`, PW / 2, PH - 5, { align: 'center' }); };
      // 섹션마다 블록(제목·카드) 단위로 캡처해서 페이지에 쌓는다 (카드가 페이지보다 길면 잘라서 이어 붙임)
      const blocks = []; s.forEach((x, i) => { const d = document.createElement('div'); d.innerHTML = x.html; [...d.children].forEach((c, k) => blocks.push({ el: c, sec: i, newPage: k === 0 && i > 0, cover: i === 0 })); });
      for (let i = 0; i < blocks.length; i++) {
        const B = blocks[i]; box.innerHTML = ''; box.appendChild(B.el);
        box.querySelectorAll('img').forEach(im => im.remove());
        const cv = await html2canvas(box, { scale: 1.6, backgroundColor: '#ffffff', logging: false, useCORS: true });
        const jpg = c => c.toDataURL('image/jpeg', 0.78);
        const hmm = cv.height * W / cv.width;
        if (B.cover) { doc.addImage(jpg(cv), 'JPEG', 0, 0, PW, Math.min(PH, cv.height * PW / cv.width)); first = false; bar((i + 1) / blocks.length); continue; }
        if (B.newPage || y + Math.min(hmm, 60) > M + HMAX) { if (!first) { foot(); doc.addPage(); page++; } y = M; }
        first = false;
        if (hmm <= M + HMAX - y + 4) { doc.addImage(jpg(cv), 'JPEG', M, y, W, hmm); y += hmm + 2; }
        else {   // 긴 카드: 페이지 높이만큼 잘라서
          const pxPerMm = cv.width / W; let sy = 0;
          while (sy < cv.height) {
            const room = (M + HMAX - y) * pxPerMm, rest = cv.height - sy, hpx = rest - room < 14 * pxPerMm ? rest : Math.min(room, rest);   // 남는 조각이 아주 작으면 여백에 함께 넣음
            const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = Math.ceil(hpx); c2.getContext('2d').drawImage(cv, 0, sy, cv.width, hpx, 0, 0, cv.width, hpx);
            doc.addImage(jpg(c2), 'JPEG', M, y, W, hpx / pxPerMm); sy += hpx; y += hpx / pxPerMm + 2;
            if (sy < cv.height) { foot(); doc.addPage(); page++; y = M; }
          }
        }
        bar((i + 1) / blocks.length); msg(`페이지를 만드는 중… ${Math.round((i + 1) / blocks.length * 100)}%`);
        if (i % 4 === 3) await new Promise(r => setTimeout(r, 0));
      }
      foot(); box.remove();
      const name = `종합사주리포트_${String(p.name).replace(/[^\w가-힣]/g, '')}_${Y()}.pdf`;
      const how = await save(doc, name);
      try { Karma.metric('pdf_made'); } catch (e) { }
      msg(how === 'shared' ? `✅ ${page}쪽 PDF를 만들었어요. 공유 화면에서 저장하거나 보낼 수 있어요.` : `✅ ${page}쪽 PDF를 내려받았어요 (${name}).`);
      Hub.toast(`📑 종합 사주 리포트 PDF ${page}쪽 완성`);
      done && done(page);
    } catch (e) { console.warn('pdf', e); msg('PDF를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요. (오늘 다시 만들기는 무료예요)'); const bx = document.querySelector('.pdfdoc'); if (bx) bx.remove(); }
    if (btn) btn.disabled = false;
  }
  async function save(doc, name) {
    window.__lastPdf = { name, pages: doc.getNumberOfPages() };   // 테스트 확인용 (내용은 담지 않음)
    const C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins.Filesystem && C.Plugins.Share) {
      const b64 = doc.output('datauristring').split(',')[1];
      const w = await C.Plugins.Filesystem.writeFile({ path: name, data: b64, directory: 'CACHE' });
      await C.Plugins.Share.share({ title: '종합 사주 리포트', files: [w.uri] }); return 'shared';
    }
    if (window.__pdfNoDownload) return 'downloaded';
    doc.save(name); return 'downloaded';
  }

  /* ---------- 열기: 카르마 결제(views.js) → 미리보기 화면 → PDF 저장 ---------- */
  function open(p) {
    p = p || Hub.me(); if (!p || !Hub.analyze(p)) { Hub.toast('내 정보를 먼저 입력해 주세요'); return; }
    Views.openDetail('pdf', subj(p), `📑 종합 사주 리포트 · ${p.name}`, () => previewHTML(p), { legacy: Store.ownedReal('report'), title: '종합 사주 리포트 (PDF)', bind: () => { const b = $('#pdfMake'); if (b) b.onclick = () => make(p); } });
  }
  return { open, make, sections };
})();
