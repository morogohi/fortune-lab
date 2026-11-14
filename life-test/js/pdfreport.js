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
  // 이 스크립트 위치 기준 ../lib/ (운영 life/js → life/lib, 테스트 스냅숏 life-test/js → life-test/lib)
  const libBase = () => { const sc = [...document.scripts].find(x => /\/js\/pdfreport\.js(\?|$)/.test(x.src)); return sc ? new URL('../lib/', sc.src).href : new URL('lib/', document.baseURI).href; };
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
    // 앱 화면용 사주 카드(색 칸·막대)는 PDF 표로 바꿔 넣음
    const EL = ['🌳', '🔥', '⛰️', '⚔️', '💧'], LAB = ['년주', '월주', '일주', '시주'], P4 = [a.p.y, a.p.m, a.p.d, a.p.h];
    const pdfSaju = `<div class="pdf-saju"><table class="pdf-tbl"><tr>${LAB.map((l, i) => `<th>${l}${i === 2 ? ' (나)' : ''}</th>`).join('')}</tr>
      <tr>${P4.map(c => `<td>${c ? `<b>${S.ST[c.s]}</b> ${S.STK[c.s]}<br><small>${S.EK[S.SE[c.s]]}</small>` : '?'}</td>`).join('')}</tr>
      <tr>${P4.map(c => `<td>${c ? `<b>${S.BR[c.b]}</b> ${S.BRK[c.b]}<br><small>${S.EK[S.BE[c.b]]}</small>` : '?'}</td>`).join('')}</tr></table>
      <p><b>${a.dm.nm}</b> 일간 · ${a.ddi}띠 — ${a.dm.key}</p>
      <p><b>오행 분포</b> ${a.el.map((n, i) => `${EL[i]} ${S.EK[i]} ${n}`).join(' · ')}</p>
      <p><b>강한 운</b> ${['독립·경쟁운', '재능·표현운', '재물운', '승진·명예운', '학업·귀인운'][a.dom] || ''} · <b>부족한 기운</b> ${S.EK[a.weak]}</p></div>`;
    out.push({ t: '사주풀이', html: h('📜', '1. 타고난 사주풀이', '일간·오행·성격·강점·연애·재물·건강·개운') + `<div class="hcard">${reportHTML(esc(p.name), a, age).replace(Saju.summaryHTML(a), pdfSaju)}</div>` });
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
  // 📄 PDF 전용 문서 스타일 — 앱 화면 스타일(카드·칩·격자·작은 글씨)을 쓰지 않고 한 가지 문서 형식으로 통일
  //   폭 600px 를 A4 본문 190mm 에 맞춤 → 본문 16px ≈ 14pt, 소제목 18px, 장 제목 26px, 메모 14px
  const PDF_W = 600;
  const PDF_CSS = `
  .pdfdoc{position:fixed;left:-10000px;top:0;width:${PDF_W}px;background:#fff;color:#222;padding:0 2px;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif}
  .pdfdoc *{animation:none!important;transition:none!important;box-shadow:none!important;text-shadow:none!important;background:transparent!important;border:0!important;border-radius:0!important;
    font-size:16px!important;line-height:1.75!important;color:#222!important;font-weight:400;letter-spacing:0!important;font-style:normal!important;text-align:left!important;
    max-width:none!important;width:auto!important;min-height:0!important;height:auto!important;position:static!important;transform:none!important;opacity:1!important;filter:none!important}
  .pdfdoc div,.pdfdoc section,.pdfdoc ul,.pdfdoc ol,.pdfdoc label{display:block!important;margin:0!important;padding:0!important}
  .pdfdoc p{display:block!important;margin:0 0 10px!important;padding:0!important}
  .pdfdoc b,.pdfdoc strong,.pdfdoc em.on{font-weight:700!important}
  .pdfdoc i,.pdfdoc em,.pdfdoc span,.pdfdoc small,.pdfdoc a{display:inline!important;margin:0!important;padding:0!important}
  .pdfdoc ul,.pdfdoc ol{padding-left:22px!important;margin:0 0 10px!important}.pdfdoc li{display:list-item!important;margin:0 0 4px!important}
  .pdfdoc input,.pdfdoc button,.pdfdoc svg,.pdfdoc canvas,.pdfdoc img,.pdfdoc .vbtn,.pdfdoc .vdet,.pdfdoc .vfreetag{display:none!important}
  /* 묶음(카드) = 한 꼭지: 위아래 여백만 */
  .pdfdoc .pdf-blk{padding:6px 0 16px!important}
  /* 꼭지 제목 */
  .pdfdoc h2,.pdfdoc h3,.pdfdoc .ht{display:block!important;font-size:20px!important;font-weight:700!important;margin:0 0 12px!important;padding:0 0 6px!important;border-bottom:2px solid #d9d2f2!important;color:#3d2f86!important}
  .pdfdoc h3 small,.pdfdoc .ht small{font-size:15px!important;font-weight:400!important;color:#666!important}
  /* 소제목 */
  .pdfdoc h4,.pdfdoc h5{display:block!important;font-size:18px!important;font-weight:700!important;margin:14px 0 6px!important;color:#222!important}
  /* 격자·행(월별 행, 분야 칸, 비교 칸 등)은 한 줄씩 문단으로 */
  .pdfdoc .tjm,.pdfdoc .cs-deep,.pdfdoc .yf-m,.pdfdoc .yf-q,.pdfdoc .dsec{margin:0 0 14px!important;padding:0 0 10px!important;border-bottom:1px solid #e6e3ee!important}
  .pdfdoc .tjm-h b,.pdfdoc .yf-m>b:first-child{font-size:18px!important}
  .pdfdoc .tjm-g>div,.pdfdoc .cm-row,.pdfdoc .tjbrief>div,.pdfdoc .hdt-g>div,.pdfdoc .cs-two>div,.pdfdoc .cs-plan>div,.pdfdoc .dtwo>div,.pdfdoc .dscore>div,.pdfdoc .tjm-l>span,.pdfdoc .yf-a>div{display:block!important;margin:0 0 6px!important}
  .pdfdoc .tjm-g>div>b,.pdfdoc .cm-row>b,.pdfdoc .tjbrief>div>b,.pdfdoc .cs-plan>div>b,.pdfdoc .dtwo>div>b{display:inline!important;margin-right:8px!important}
  .pdfdoc .cm-row>span+span,.pdfdoc .tjm-h>*+*{margin-left:8px!important}
  .pdfdoc .tjm-h em,.pdfdoc .tjm-h small,.pdfdoc .cm-v{color:#555!important}
  .pdfdoc .tjm-s{font-weight:700!important}
  /* 메모(작은 글씨)도 너무 작지 않게 */
  .pdfdoc table.pdf-tbl{display:table!important;border-collapse:collapse!important;width:100%!important;margin:0 0 14px!important}.pdfdoc .pdf-tbl tr{display:table-row!important}
  .pdfdoc .pdf-tbl th,.pdfdoc .pdf-tbl td{display:table-cell!important;border:1px solid #cfc8e6!important;padding:8px 6px!important;text-align:center!important;vertical-align:middle!important}
  .pdfdoc .pdf-tbl th{background:#f1edfb!important;font-weight:700!important}.pdfdoc .pdf-tbl td b{font-size:24px!important}.pdfdoc .pdf-tbl small{font-size:14px!important;color:#666!important}
  /* 오행·원소 막대 → 한 줄 숫자 (목 1 · 화 2 …), 궁합 점수 크게 */
  .pdfdoc .dels{display:block!important;margin:0 0 10px!important}.pdfdoc .dels>div{display:inline!important;margin-right:16px!important}.pdfdoc .dels>div>i{display:none!important}.pdfdoc .dels>div>b{margin-left:4px!important}.pdfdoc .dels>div.on>span{font-weight:700!important}
  .pdfdoc .dscore{margin:0 0 10px!important}.pdfdoc .dscore b{font-size:28px!important;font-weight:700!important;margin-right:10px!important;color:#3d2f86!important}.pdfdoc .dscore span{font-size:18px!important;font-weight:700!important}
  .pdfdoc .sjnote,.pdfdoc .hsub,.pdfdoc .pdf-note{display:block!important;font-size:14px!important;color:#666!important;margin:4px 0 10px!important}
  .pdfdoc .sjnote *{font-size:14px!important;color:#666!important}
  /* 점수 막대는 남김 */
  .pdfdoc [class*="bar"]{display:block!important;height:10px!important;background:#eeeaf6!important;margin:4px 0 8px!important}
  .pdfdoc [class*="bar"]>i,.pdfdoc [class*="bar"]>b,.pdfdoc [class*="bar"]>span{display:block!important;height:10px!important;background:#7a68d6!important}
  /* 장 제목 */
  .pdfdoc .pdf-h{display:block!important;margin:0 0 18px!important;padding:0 0 10px!important;border-bottom:3px solid #3d2f86!important}
  .pdfdoc .pdf-h b{display:block!important;font-size:26px!important;color:#3d2f86!important;line-height:1.4!important}
  .pdfdoc .pdf-h small{display:block!important;font-size:15px!important;color:#666!important;margin-top:4px!important}
  /* 표지 */
  .pdfdoc .pdf-cover{display:flex!important;flex-direction:column;justify-content:center;height:${Math.round(PDF_W * 297 / 210)}px!important;padding:0 40px!important;background:#f7f4ff!important}
  .pdfdoc .pdf-cover *{text-align:center!important}
  .pdfdoc .pdf-cover .pdf-logo{font-size:20px!important;color:#6a5acd!important;font-weight:700!important;margin-bottom:24px!important}
  .pdfdoc .pdf-cover h1{display:block!important;font-size:38px!important;line-height:1.35!important;font-weight:700!important;margin:0 0 20px!important;color:#2a2060!important}
  .pdfdoc .pdf-cover .pdf-gz{font-size:22px!important;letter-spacing:2px!important;color:#5a4a1d!important}
  .pdfdoc .pdf-cover .pdf-toc{margin:30px auto!important;padding:18px 28px!important;background:#fff!important;border:1px solid #ddd6f3!important}
  .pdfdoc .pdf-cover .pdf-toc *{text-align:left!important;font-size:17px!important}.pdfdoc .pdf-cover .pdf-toc b{display:block!important;font-size:18px!important;margin-bottom:6px!important}
  .pdfdoc .pdf-cover .pdf-date{font-size:14px!important;color:#888!important}`;
  async function make(p, done) {
    const s = sections(p); if (!s) return;
    const msg = t => { const m = $('#pdfMsg'); if (m) m.textContent = t; }, bar = v => { const b = $('#pdfBar'); if (b) { b.parentNode.hidden = false; b.style.width = Math.round(v * 100) + '%'; } };
    const btn = $('#pdfMake'); if (btn) btn.disabled = true;
    try {
      msg('PDF 도구를 불러오는 중…'); await libs();
      let st = document.getElementById('pdfCss'); if (!st) { st = document.createElement('style'); st.id = 'pdfCss'; st.textContent = PDF_CSS; document.head.appendChild(st); }
      const box = document.createElement('div'); box.className = 'pdfdoc'; document.body.appendChild(box);
      const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const PW = 210, PH = 297, M = 12, W = PW - M * 2, HMAX = PH - M * 2 - 6;
      let y = M, page = 1, first = true;
      const foot = () => { doc.setFontSize(9); doc.setTextColor(140); doc.text(`- ${page} -`, PW / 2, PH - 5, { align: 'center' }); };
      // 섹션마다 블록(제목·카드) 단위로 캡처해서 페이지에 쌓는다 (카드가 페이지보다 길면 잘라서 이어 붙임)
      const blocks = []; s.forEach((x, i) => { const d = document.createElement('div'); d.innerHTML = x.html; d.querySelectorAll('.pdf-skip').forEach(e => e.remove()); [...d.children].forEach((c, k) => blocks.push({ el: c, sec: i, newPage: k === 0 && i > 0, cover: i === 0 })); });
      for (let i = 0; i < blocks.length; i++) {
        const B = blocks[i]; box.innerHTML = ''; B.el.classList.add('pdf-blk'); box.appendChild(B.el);
        box.querySelectorAll('img').forEach(im => im.remove());
        // 줄 중간에서 자르지 않도록: 문단·행·제목의 아래 끝 위치를 미리 모아 둠 (CSS px)
        const top0 = box.getBoundingClientRect().top;
        const cuts = [...new Set([...box.querySelectorAll('p,li,h2,h3,h4,h5,.cm-row,.tjm,.tjm-g>div,.tjm-l,.tjm-c,.cs-deep,.yf-m,.yf-q,.dsec,.pdf-h,div')].filter(e => e.children.length === 0 || /^(P|LI|H\d)$/.test(e.tagName) || e.matches('.cm-row,.tjm,.tjm-g>div,.tjm-c,.cs-deep,.yf-m,.yf-q,.dsec,.pdf-h'))
          .map(e => Math.round(e.getBoundingClientRect().bottom - top0 + 4)))].sort((x, y) => x - y);
        const cv = await html2canvas(box, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
        const jpg = c => c.toDataURL('image/jpeg', 0.75), k = cv.width / box.getBoundingClientRect().width;   // canvas px / CSS px
        const hmm = cv.height * W / cv.width, pxPerMm = cv.width / W;
        if (B.cover) { doc.addImage(jpg(cv), 'JPEG', 0, 0, PW, Math.min(PH, cv.height * PW / cv.width)); first = false; bar((i + 1) / blocks.length); continue; }
        if (B.newPage) { if (!first) { foot(); doc.addPage(); page++; } y = M; }
        else if (!first && y + Math.min(hmm, 25) > M + HMAX) { foot(); doc.addPage(); page++; y = M; }
        first = false;
        if (hmm <= M + HMAX - y + 2) { doc.addImage(jpg(cv), 'JPEG', M, y, W, hmm); y += hmm + 3; }
        else {   // 페이지를 넘는 꼭지: 문단 경계에서 나눔
          let sy = 0;
          while (sy < cv.height - 2) {
            const room = (M + HMAX - y) * pxPerMm;
            let cut = cv.height;
            if (cv.height - sy > room) {
              const lim = sy + room, ok = cuts.map(c => c * k).filter(c => c > sy + 40 && c <= lim);
              cut = ok.length ? ok[ok.length - 1] : lim;
              if (!ok.length && y > M + 5) { foot(); doc.addPage(); page++; y = M; continue; }   // 남은 칸에 문단 하나도 안 들어가면 다음 쪽부터
            }
            const hpx = Math.max(1, Math.round(cut - sy));
            const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = hpx; const g = c2.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c2.width, hpx); g.drawImage(cv, 0, sy, cv.width, hpx, 0, 0, cv.width, hpx);
            doc.addImage(jpg(c2), 'JPEG', M, y, W, hpx / pxPerMm); sy += hpx; y += hpx / pxPerMm + 3;
            if (sy < cv.height - 2) { foot(); doc.addPage(); page++; y = M; }
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
