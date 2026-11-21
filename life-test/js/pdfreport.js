/* =====================================================================
 *  pdfreport.js — 📑 종합 사주 리포트 (PDF)
 *   상점의 '프리미엄 사주 리포트'를 대신하는 종합 리포트. 한 사람의 모든 풀이를 한 권으로 묶어 PDF로 만든다.
 *   구성(중복 없이 주제별·월별로 다시 묶음): 표지 · 타고난 사주 · 한 해 총평 · 분야별 풀이(연애 성향 포함)
 *         → 상담 보고서 구성: 상담 요약 · 명식과 해석 기준 · 큰 흐름 · 분야별 · 월별 상담(같은 표 형식) · 사주 MBTI(압축) · 궁합 · 상담 정리
 *   - 만들기 조건 없음: 내 정보만으로 바로 만듦 · 궁합 상대는 미리보기에서 선택 부록으로 넣을 수 있음
 *   - 결제 전 안내(구성 · 조건 · 예시) → 결제(보관형: 같은 프로필 · 같은 연도 다시 열기 무료) → 미리보기 → PDF
 *   - 실패: 추가 차감 없이 다시 시도 · 한 번도 만들지 못했으면 환불
 *   - 요금: 만들 때 카르마 (views.js 'pdf' 항목) · 결제한 날 다시 만들기 3회 무료 · 예전 상세 리포트 보유자 무료
 *   - 모두 기기 안에서 만든다 (jsPDF + 한글 글꼴, 필요할 때만 불러옴). 개인정보를 어디로도 보내지 않음
 *   - 실제 글자로 쓰는 PDF: 화면과 같은 디자인(PDF_CSS)으로 배치한 뒤, 그 위치 그대로 글자·선·바탕을 PDF에 그린다
 *     (이미지가 아니라 한글 글꼴을 넣은 텍스트라 검색·복사·텍스트 추출이 됨)
 *   - 쪽 나눔: 글줄·표의 행·한 달 풀이·근거 상자 같은 단위를 자르지 않고, 표가 다음 쪽으로 이어지면 머리글 행을 다시 그림.
 *     짧은 꼭지를 통째로 다음 쪽으로 미루지 않고 남은 칸을 채워 불필요한 빈 쪽·큰 여백을 만들지 않음 (글자 크기는 줄이지 않음)
 *   - 저장: 앱은 파일 저장 후 공유 시트(Filesystem+Share), 웹은 내려받기
 * ===================================================================== */
const PdfReport = (() => {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 이 스크립트 위치 기준 ../lib/ (운영 life/js → life/lib, 테스트 스냅숏 life-test/js → life-test/lib)
  const libBase = () => { const sc = [...document.scripts].find(x => /\/js\/pdfreport\.js(\?|$)/.test(x.src)); return sc ? new URL('../lib/', sc.src).href : new URL('lib/', document.baseURI).href; };
  const loadJs = src => new Promise((ok, no) => { if ([...document.scripts].some(x => x.src === src)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.head.appendChild(s); });
  async function libs() {
    const b = libBase();
    if (!(window.jspdf && window.jspdf.jsPDF)) await loadJs(b + 'jspdf.umd.min.js');
  }
  /* ---------- PDF 글꼴 (한글 포함 · lib/pdf-fonts) ----------
   *  화면 배치와 PDF 글자가 같은 글꼴을 쓰도록 같은 파일을 FontFace(배치용)와 jsPDF(출력용)에 함께 등록한다.
   *  기본은 KS X 1001 한글 2,350자 부분 집합 · 그 밖의 글자(희귀 한글 이름 등)가 있으면 전체 한글 글꼴을 추가로 불러옴 */
  const FONTS = { sans: ['NotoSansKR-400-ks.ttf', 'PdfSans', '400'], sansB: ['NotoSansKR-700-ks.ttf', 'PdfSans', '700'], serif: ['NotoSerifKR-700-ks.ttf', 'PdfSerif', '700'], full: ['NotoSansKR-400-full.ttf', 'PdfSansFull', '400'] };
  const fontBuf = {};
  async function fontFile(k) {
    if (fontBuf[k]) return fontBuf[k];
    const r = await fetch(libBase() + 'pdf-fonts/' + FONTS[k][0]); if (!r.ok) throw new Error('font ' + k);
    const buf = await r.arrayBuffer(); let bin = ''; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    fontBuf[k] = { buf, b64: btoa(bin) };
    try { const ff = new FontFace(FONTS[k][1], buf, { weight: FONTS[k][2] }); await ff.load(); document.fonts.add(ff); } catch (e) { console.warn('fontface', k, e); }
    return fontBuf[k];
  }
  async function pdfFonts(doc, needFull) {
    for (const k of ['sans', 'sansB', 'serif'].concat(needFull ? ['full'] : [])) {
      const f = await fontFile(k), vfs = FONTS[k][0];
      doc.addFileToVFS(vfs, f.b64);
      doc.addFont(vfs, k === 'serif' ? 'KSerif' : k === 'full' ? 'KFull' : 'KSans', k === 'sansB' || k === 'serif' ? 'bold' : 'normal', 'Identity-H');
    }
  }
  const subj = p => Views.subj(p);
  const Y = () => KST.fortuneYear();

  /* ---------- 리포트 본문 (섹션 = 카드 묶음) ---------- */
  const partners = () => (Hub.people() || []).filter(q => q && q.date && Hub.analyze(q)).slice(0, 3);
  function sections(p, opt = {}) {
    const a = Hub.analyze(p); if (!a) return null;
    const S = window.SAJU, out = [];
    // 작성일(now) · 대상 연도(TY, 결제 보관 연도와 같음) · 나이(세는나이)를 명시적인 값으로
    const now = KST.now(), TY = Y(), by = Saju.birthYear(a) || +p.date.slice(0, 4), people = opt.appendix ? partners() : [];
    const h = (n, e, t, sub) => `<div class="pdf-h"><i>${String(n).padStart(2, '0')}</i><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    // 상담 보고서 구성 (detail.js reportParts): 요약 → 명식 → 큰 흐름 → 분야별 → 월별 → 성격 유형 → 궁합 → 상담 정리
    const R = Detail.reportParts(p, a, people);
    const isApp = x => /^궁합 · /.test(x.t), main = R.chapters.filter(x => !isApp(x)), apps = R.chapters.filter(isApp).map(x => Object.assign({}, x, { t: '부록 · ' + x.t }));
    const toc = ['상담 요약', '명식과 타고난 성향', ...main.map(x => x.t), '상담 정리', ...apps.map(x => x.t)];
    const gz4 = `${S.ST[a.p.y.s]}${S.BR[a.p.y.b]}년 ${S.ST[a.p.m.s]}${S.BR[a.p.m.b]}월 ${S.ST[a.p.d.s]}${S.BR[a.p.d.b]}일${a.p.h ? ` ${S.ST[a.p.h.s]}${S.BR[a.p.h.b]}시` : ''}`;
    out.push({ t: '표지', html: `<div class="pdf-cover"><div><span class="pdf-kicker">SAJU CONSULTATION REPORT</span>
      <h1>${esc(p.name)} 님의<br>삶과 흐름</h1><span class="pdf-sub">${TY} 사주 상담 보고서</span>
      <div class="pdf-info"><p><b>생년월일</b>${p.date.replace(/-/g, '.')} (${p.cal === 'l' ? '음력' : '양력'})</p><p><b>출생 시간</b>${p.time ? p.time : '확인되지 않음 — 시주를 제외한 세 기둥으로 해석'}</p><p><b>성별</b>${p.sex === 'f' ? '여성' : '남성'}</p><p><b>명식</b>${gz4}</p><p><b>작성일</b>${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 · ${TY}년 기준 (세는나이 ${TY - by + 1}세)</p></div>
      <div class="pdf-toc${toc.length > 8 ? ' two' : ''}">${toc.map((t, i) => `<p><span>${String(i + 1).padStart(2, '0')}</span>${esc(t)}</p>`).join('')}</div></div>
      <p class="pdf-foot">운명 연구소 · 이 보고서는 사용자의 기기 안에서 작성되었으며, 전통 명리 이론에 바탕을 둔 참고용 해석입니다.</p></div>` });
    out.push({ t: '상담 요약', html: h(1, '', '상담 요약', `타고난 바탕 · ${TY}년의 주제 · 우선 실천 세 가지`) + R.summary });
    // 명식과 해석 범위
    const EL = ['목', '화', '토', '금', '수'], LAB = ['년주', '월주', '일주', '시주'], P4 = [a.p.y, a.p.m, a.p.d, a.p.h];
    const pdfSaju = `<table class="pdf-tbl"><tr>${LAB.map((l, i) => `<th>${l}${i === 2 ? ' (나)' : ''}</th>`).join('')}</tr>
      <tr>${P4.map(c => `<td>${c ? `<b>${S.ST[c.s]}</b> ${S.STK[c.s]}<br><small>${S.EK[S.SE[c.s]]}</small>` : '-'}</td>`).join('')}</tr>
      <tr>${P4.map(c => `<td>${c ? `<b>${S.BR[c.b]}</b> ${S.BRK[c.b]}<br><small>${S.EK[S.BE[c.b]]}</small>` : '-'}</td>`).join('')}</tr></table>
      <table class="pdf-mt"><tr><th>일간</th><td>${a.dm.nm} — ${a.dm.key}</td></tr><tr><th>띠</th><td>${a.ddi}띠</td></tr>
      <tr><th>오행 분포</th><td>${a.el.map((n, i) => `${EL[i]} ${n}`).join(' · ')}</td></tr><tr><th>두드러진 흐름</th><td>${['독립·경쟁', '재능·표현', '재물', '직장·명예', '학업·귀인'][a.dom] || ''} · 겉으로 드러나지 않는 기운: ${S.EK[a.weak]}</td></tr></table>`;
    const zero = a.el.map((n, i) => n === 0 ? S.EK[i] : '').filter(Boolean);
    const basis = `<div class="pdf-basis"><p><b>해석 범위와 계산 기준</b></p>
      ${p.time ? '' : '<p>출생 시간이 확인되지 않아 <b>시주를 제외한 세 기둥(여섯 글자)</b>으로 해석했어요. 대운이 시작되는 나이는 정오 출생으로 가정해 계산한 추정값이며, 출생 시각에 따라 달라질 수 있어요.</p>'}
      <p>오행 분포는 천간·지지에 <b>겉으로 드러난 ${p.time ? '여덟' : '여섯'} 글자</b>만 센 값이며, 지지 속에 숨은 기운(지장간)은 포함하지 않았어요.${zero.length ? ` ${zero.join('·')}이(가) 0이어도 그 기운이 전혀 없다는 뜻이 아니라, 겉으로 드러나지 않는다는 의미예요.` : ''}</p>
      <p>나이는 <b>세는나이</b>(태어난 해를 1살로 셈) 기준이에요. ${TY}년에 세는나이 ${TY - by + 1}세(만 ${TY - by - 1}~${TY - by}세)이며, 대운 표에는 시작·끝 연도를 함께 적었어요. 작성일은 ${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일이에요.</p>
      <p>월별 상담의 달은 절기 기준(예: 2월은 입춘부터)이며, 토정비결 신수는 같은 월지를 가진 음력 달과 짝지었어요.</p>
      <p>본문의 지표(100 기준)는 명리 요소를 정해진 규칙으로 합산한 <b>상대적 참고값</b>으로, 측정 결과가 아니에요. 사주 궁합 지표와 성향(MBTI) 궁합 지표는 서로 다른 기준이에요.</p></div>`;
    out.push({ t: '명식과 타고난 성향', html: h(2, '', '명식과 타고난 성향', '명식 · 해석 범위와 계산 기준 · 성격 · 강점과 약점 · 타고난 흐름') + `<div class="hcard"><h3 class="ht">명식과 해석 범위</h3>${pdfSaju}${basis}</div>
      <div class="hcard"><h3 class="ht">타고난 성격</h3><div class="sjtxt"><p>${a.dm.성격}</p><h4>강점으로 해석되는 부분</h4><p>${a.dm.강점}</p><h4>부담이 될 수 있는 부분</h4><p>${a.dm.약점}</p></div></div>
      <div class="hcard"><h3 class="ht">타고난 흐름과 보완</h3><div class="sjtxt"><p>${S.GDOM[a.dom]}</p><h4>보완할 점</h4><p>${S.GLACK[a.dom]}</p></div></div>` });
    main.forEach((x, i) => out.push({ t: x.t, html: h(i + 3, '', x.t, x.sub) + x.html }));
    out.push({ t: '상담 정리', html: h(main.length + 3, '', '상담 정리', '첫 90일 실천 계획 · 돌아볼 질문 · 맺음말') + R.closing + `<div class="hcard"><h3 class="ht">맺음말</h3><div class="sjtxt"><p>사주는 정해진 결과를 알려 주기보다, 타고난 기운의 지도를 보며 나에게 맞는 속도와 방향을 찾는 도구예요. 이 보고서의 해석은 명리 이론에 따른 경향이며, 건강·법률·투자처럼 중요한 결정은 전문가와 상의해 주세요.</p></div>
      <p class="pdf-note">운명 연구소 「인생 게임」에서 내 생년월일로 태어난 가상 인물의 한평생을 미리 살아 볼 수 있어요.</p></div>` });
    apps.forEach((x, i) => out.push({ t: x.t, app: true, html: h(main.length + 4 + i, '', x.t, x.sub + ' · 선택 부록') + x.html }));
    if (out.length - 1 !== toc.length || out.slice(1).some((x, i) => x.t !== toc[i])) console.warn('pdf toc mismatch');
    return out;
  }

  /* ---------- 만들기 조건 없음: 내 정보만으로 바로 만들 수 있음 (예전 방문 기록은 참고용으로만 남김) ---------- */
  const DONE = 'p8b_done';
  const doneMap = () => { const m = store.get(DONE, {}); return m && typeof m === 'object' ? m : {}; };
  function mark(k) { const m = doneMap(); if (!m[k]) { m[k] = Date.now(); store.set(DONE, m); } }
  const missing = () => [];
  const ready = () => true;
  function noteHTML() {
    const it = Views.item('pdf') || {}, me = Hub.me(), own = me && Views.ownOf('pdf', subj(me));
    return `<p class="pdf-req ok">${own ? `보관된 리포트 · ${Views.keepId('pdf', subj(me)).slice(-4)}년 기준 · 다시 열기 · 다시 내려받기 무료` : `내 정보만으로 바로 만들어요 · ✨ ${it.k || 40} · 같은 프로필 · 같은 연도는 다시 내려받기 무료`}${partners().length ? ' · 궁합 상대는 선택 부록' : ''}</p>`;
  }
  /* ---------- 미리보기 + PDF 만들기 ---------- */
  let withApp = false;
  function previewHTML(p) { return `<div id="pdfWrap">${previewInner(p)}</div>`; }
  function previewInner(p) {
    const s = sections(p, { appendix: withApp }); if (!s) return '<p class="hsub">내 정보를 먼저 입력해 주세요.</p>';
    const ch = s.length - 1, pp = partners();
    return `<div class="hcard pdf-bar"><b>📑 종합 사주 리포트</b><small>표지와 ${ch}개 장${withApp && pp.length ? ` (궁합 부록 ${pp.length}개 포함)` : ''} · 아래 내용을 그대로 PDF로 저장해요</small>
      ${pp.length ? `<label class="pdf-app"><input type="checkbox" id="pdfApp" ${withApp ? 'checked' : ''}> 궁합 부록 넣기 (${pp.map(q => esc(q.name)).join(' · ')}) <small>· 추가 비용 없음</small></label>` : ''}
      <button class="bigbtn wide" id="pdfMake">📥 PDF로 저장하기</button><div class="fk-bar pdf-prog" hidden><i id="pdfBar"></i></div><p class="sjnote" id="pdfMsg"></p><div id="pdfFail"></div></div>`
      + s.map(x => `<div class="pdf-sec">${x.html}</div>`).join('');
  }
  function bindPreview(p) {
    const b = $('#pdfMake'); if (b) b.onclick = () => make(p);
    const c = $('#pdfApp'); if (c) c.onchange = () => { withApp = c.checked; const w = $('#pdfWrap'); if (w) { w.innerHTML = previewInner(p); bindPreview(p); } };
  }
  // 📄 PDF 보고서 템플릿 — 「프리미엄 상담형」: 아이보리 바탕 · 먹색 본문 · 남색 명조 제목 · 금색 가는 선 · 이모지 없음
  //   폭 600px 를 A4 본문 186mm 에 맞춤 → 본문 16px ≈ 14pt, 소제목 17px, 꼭지 제목 20px(명조), 장 제목 26px(명조), 메모 14px
  const PDF_W = 600, IVORY = '#F7F4EE', INK = '#292929', NAVY = '#24364B', GOLD = '#9B8457', LINE = '#D9CFBA', SOFT = '#EFE8DA';
  const SERIF = `'PdfSerif','Noto Serif KR','Nanum Myeongjo','AppleMyungjo','Batang',serif`, SANS = `'PdfSans','PdfSansFull','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
  const PDF_CSS = `
  .pdfdoc{position:fixed;left:-10000px;top:0;width:${PDF_W}px;background:${IVORY};color:${INK};padding:0 2px;font-family:${SANS}}
  .pdfdoc *{animation:none!important;transition:none!important;box-shadow:none!important;text-shadow:none!important;background:transparent!important;border:0!important;border-radius:0!important;
    font-family:${SANS}!important;font-size:16px!important;line-height:1.7!important;color:${INK}!important;font-weight:400;letter-spacing:0!important;font-style:normal!important;text-align:left!important;
    max-width:none!important;min-height:0!important;height:auto!important;position:static!important;transform:none!important;opacity:1!important;filter:none!important;word-break:keep-all!important}
  .pdfdoc div,.pdfdoc section,.pdfdoc ul,.pdfdoc ol,.pdfdoc label{display:block!important;margin:0!important;padding:0!important;width:auto!important}
  .pdfdoc p{display:block!important;margin:0 0 10px!important;padding:0!important}
  .pdfdoc b,.pdfdoc strong{font-weight:700!important}
  .pdfdoc i,.pdfdoc em,.pdfdoc span,.pdfdoc small,.pdfdoc a{display:inline!important;margin:0!important;padding:0!important}
  .pdfdoc ul,.pdfdoc ol{padding-left:22px!important;margin:0 0 10px!important}.pdfdoc li{display:list-item!important;margin:0 0 4px!important}
  .pdfdoc input,.pdfdoc button,.pdfdoc svg,.pdfdoc canvas,.pdfdoc img,.pdfdoc .vbtn,.pdfdoc .vdet,.pdfdoc .vfreetag,.pdfdoc .yf-kw,.pdfdoc [class*="bar"],.pdfdoc .yf-ar{display:none!important}
  .pdfdoc .pdf-blk{padding:4px 0 18px!important}
  /* 꼭지 제목: 명조 · 남색 · 금색 가는 선 */
  .pdfdoc h2,.pdfdoc h3,.pdfdoc .ht{display:block!important;font-family:${SERIF}!important;font-size:20px!important;font-weight:700!important;margin:0 0 12px!important;padding:0 0 7px!important;border-bottom:1px solid ${GOLD}!important;color:${NAVY}!important}
  .pdfdoc h3 *,.pdfdoc .ht *{font-family:${SERIF}!important;color:${NAVY}!important}
  .pdfdoc h3 small,.pdfdoc .ht small{font-family:${SANS}!important;font-size:14px!important;font-weight:400!important;color:#6b6457!important;margin-left:8px!important}
  /* 소제목 */
  .pdfdoc h4,.pdfdoc h5{display:block!important;font-size:17px!important;font-weight:700!important;margin:14px 0 6px!important;color:${NAVY}!important}
  .pdfdoc h4 *,.pdfdoc h5 *{color:${NAVY}!important;font-size:17px!important}
  /* 월·항목 묶음: 가는 선으로 구분 */
  .pdfdoc .tjm,.pdfdoc .cs-deep,.pdfdoc .yf-m,.pdfdoc .yf-q,.pdfdoc .dsec{margin:0 0 14px!important;padding:0 0 12px!important;border-bottom:1px solid ${LINE}!important}
  .pdfdoc .tjm-g>div,.pdfdoc .cm-row,.pdfdoc .tjbrief>div,.pdfdoc .hdt-g>div,.pdfdoc .cs-two>div,.pdfdoc .cs-plan>div,.pdfdoc .dtwo>div,.pdfdoc .dscore>div,.pdfdoc .tjm-l>span,.pdfdoc .yf-a>div{display:block!important;margin:0 0 6px!important}
  .pdfdoc .tjm-g>div>b,.pdfdoc .cm-row>b,.pdfdoc .tjbrief>div>b,.pdfdoc .cs-plan>div>b,.pdfdoc .dtwo>div>b{display:inline!important;margin-right:8px!important;color:${NAVY}!important}
  .pdfdoc .cm-row>span+span,.pdfdoc .tjm-h>*+*{margin-left:8px!important}
  .pdfdoc .tjm-h em,.pdfdoc .tjm-h small,.pdfdoc .cm-v{color:#6b6457!important}
  .pdfdoc .tjm-s{font-weight:700!important}
  .pdfdoc .yf-mh{margin:0 0 6px!important}.pdfdoc .yf-mh>b{font-family:${SERIF}!important;font-size:19px!important;color:${NAVY}!important}.pdfdoc .yf-mh>span{margin-left:12px!important;color:#6b6457!important}.pdfdoc .yf-mh>em{margin-left:12px!important;font-weight:700!important;color:${GOLD}!important}.pdfdoc .yf-mh>em::after{content:'점'}
  /* 표: 왼쪽 칸은 한 줄로, 마지막 칸만 줄바꿈 */
  .pdfdoc table{display:table!important;border-collapse:collapse!important;width:100%!important;margin:0 0 14px!important;table-layout:auto!important}
  .pdfdoc tr{display:table-row!important}
  .pdfdoc th,.pdfdoc td{display:table-cell!important;border:1px solid ${LINE}!important;padding:7px 9px!important;vertical-align:top!important;width:auto!important}
  .pdfdoc th{background:${SOFT}!important;font-weight:700!important;color:${NAVY}!important;white-space:nowrap!important}
  .pdfdoc td:not(:last-child){white-space:nowrap!important}
  .pdfdoc td *{white-space:inherit!important}
  .pdfdoc td small{display:block!important;font-size:14.5px!important;color:#4a4539!important;white-space:normal!important}
  .pdfdoc tr.on td{background:#F1E9D6!important;font-weight:700!important}
  .pdfdoc .pdf-tbl th,.pdfdoc .pdf-tbl td{text-align:center!important;vertical-align:middle!important}.pdfdoc .pdf-tbl td b{font-family:${SERIF}!important;font-size:24px!important;color:${NAVY}!important}.pdfdoc .pdf-tbl small{font-size:14px!important;color:#6b6457!important}
  /* 오행·원소 막대 → 한 줄 숫자, 점수 */
  .pdfdoc .dels{display:block!important;margin:0 0 10px!important}.pdfdoc .dels>div{display:inline!important;margin-right:16px!important}.pdfdoc .dels>div>i{display:none!important}.pdfdoc .dels>div>b{margin-left:4px!important}
  .pdfdoc .dscore{margin:0 0 10px!important}.pdfdoc .dscore b{font-family:${SERIF}!important;font-size:26px!important;font-weight:700!important;margin-right:10px!important;color:${NAVY}!important}.pdfdoc .dscore span{font-size:17px!important;font-weight:700!important}
  .pdfdoc .yf-top{display:block!important}.pdfdoc .yf-sc b{font-family:${SERIF}!important;font-size:26px!important;color:${NAVY}!important;margin-right:8px!important}
  /* 안내·근거 상자 */
  .pdfdoc .pdf-basis{border:1px solid ${LINE}!important;border-left:3px solid ${GOLD}!important;padding:12px 14px!important;margin:0 0 14px!important;background:#FBF8F2!important}
  .pdfdoc .pdf-basis *{font-size:14.5px!important;color:#4a4539!important}.pdfdoc .pdf-basis b{color:${NAVY}!important}
  .pdfdoc .pdf-mt th{width:104px!important;text-align:left!important}.pdfdoc .yf-m .pdf-mt th,.pdfdoc .yf-m .pdf-mt td{padding:5px 8px!important}.pdfdoc .pdf-gd{color:#6b6457!important}.pdfdoc .pdf-mt td{white-space:normal!important}
  .pdfdoc .dscore::before{content:'사주 궁합 지표';display:block;font-family:${SANS};font-size:14px;color:#6b6457;margin-bottom:2px}.pdfdoc .dscore.mb::before{content:'성향(MBTI) 궁합 지표'}
  .pdfdoc .sjnote,.pdfdoc .hsub,.pdfdoc .pdf-note{display:block!important;font-size:14px!important;color:#6b6457!important;margin:4px 0 10px!important}
  .pdfdoc .sjnote *{font-size:14px!important;color:#6b6457!important}
  /* 장 제목 */
  .pdfdoc .pdf-h{display:block!important;margin:0 0 20px!important;padding:6px 0 12px!important;border-bottom:2px solid ${NAVY}!important}
  .pdfdoc .pdf-h i{display:block!important;font-family:${SERIF}!important;font-size:15px!important;color:${GOLD}!important;letter-spacing:2px!important;margin-bottom:2px!important}
  .pdfdoc .pdf-h b{display:block!important;font-family:${SERIF}!important;font-size:27px!important;color:${NAVY}!important;line-height:1.4!important}
  .pdfdoc .pdf-h small{display:block!important;font-size:14.5px!important;color:#6b6457!important;margin-top:6px!important}
  /* 표지 */
  .pdfdoc .pdf-cover{display:flex!important;flex-direction:column;justify-content:space-between;height:${Math.round(PDF_W * 297 / 210)}px!important;padding:56px 44px 36px!important;border:1px solid ${GOLD}!important}
  .pdfdoc .pdf-cover .pdf-kicker{display:block!important;font-family:${SERIF}!important;font-size:15px!important;letter-spacing:4px!important;color:${GOLD}!important}
  .pdfdoc .pdf-cover h1{display:block!important;font-family:${SERIF}!important;font-size:36px!important;line-height:1.4!important;font-weight:700!important;margin:18px 0 10px!important;color:${NAVY}!important}
  .pdfdoc .pdf-cover .pdf-sub{display:block!important;font-family:${SERIF}!important;font-size:20px!important;color:${NAVY}!important;padding-bottom:18px!important;border-bottom:1px solid ${GOLD}!important;margin-bottom:22px!important}
  .pdfdoc .pdf-cover .pdf-info p{margin:0 0 4px!important;font-size:15px!important}.pdfdoc .pdf-cover .pdf-info b{color:${NAVY}!important;display:inline-block!important;min-width:84px!important}
  .pdfdoc .pdf-cover .pdf-toc{padding:14px 0 0!important;border-top:1px solid ${LINE}!important;margin-top:16px!important}.pdfdoc .pdf-cover .pdf-toc p{margin:0 0 2px!important;font-size:15.5px!important}
  .pdfdoc .pdf-cover .pdf-toc.two{columns:2!important;column-gap:18px!important}.pdfdoc .pdf-cover .pdf-toc.two p{break-inside:avoid!important}
  .pdfdoc .pdf-cover .pdf-toc p span{display:inline-block!important;width:34px!important;font-family:${SERIF}!important;color:${GOLD}!important}
  .pdfdoc .pdf-cover .pdf-foot{font-size:13px!important;color:#6b6457!important;border-top:1px solid ${LINE}!important;padding-top:12px!important}`;
  // 이모지·장식 기호 제거 (PDF 에서만)
  const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu;
  function stripEmoji(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), L = []; while (w.nextNode()) L.push(w.currentNode);
    L.forEach(t => { const v = t.nodeValue.replace(EMOJI, '').replace(/^\s*[·•]\s*$/, ''); if (v !== t.nodeValue) t.nodeValue = v.replace(/^\s+(?=\S)/, t.previousSibling ? ' ' : ''); });
  }
  /* ---------- 상담 문체: 해요체 → 합니다·하십시오체 (PDF 에서만, 따옴표 속 대화 예시는 그대로) ---------- */
  const HB = 0xAC00, jong = c => (c.charCodeAt(0) - HB) % 28, isH = c => c && c.charCodeAt(0) >= HB && c.charCodeAt(0) <= 0xD7A3;
  const setJ = (c, j) => String.fromCharCode(c.charCodeAt(0) - jong(c) + j);              // 받침 바꾸기 (0 없음 · 8 ㄹ · 17 ㅂ)
  const setV = (c, v) => { const k = c.charCodeAt(0) - HB; return String.fromCharCode(HB + Math.floor(k / 588) * 588 + v * 28 + k % 28); };
  const vow = c => Math.floor(((c.charCodeAt(0) - HB) % 588) / 28);                    // 0 ㅏ 1 ㅐ 4 ㅓ 5 ㅔ 6 ㅕ 8 ㅗ 9 ㅘ 10 ㅙ 11 ㅚ 13 ㅜ 14 ㅝ 18 ㅡ 20 ㅣ
  const SP = { 커: '크', 써: '쓰', 떠: '뜨', 꺼: '끄', 터: '트', 퍼: '프', 뻐: '쁘', 파: '프', 빠: '쁘' };
  function formalWord(w) {
    const end = (t, r) => w.endsWith(t) ? w.slice(0, -t.length) + r : null;
    let r = end('아니에요', '아닙니다') || end('거예요', '것입니다') || end('이에요', '입니다') || end('예요', '입니다') || end('세요', '십시오') || end('해요', '합니다') || end('돼요', '됩니다');
    if (r) return r;
    if (!w.endsWith('요') || w.length < 2) return w;
    const b = w.slice(0, -1);                                   // '요' 앞
    if ((b.endsWith('어') || b.endsWith('아')) && b.length >= 2) {   // 있어요·좋아요·쉬어요·늘어요
      const st = b.slice(0, -1), c = st.slice(-1); if (!isH(c)) return w;
      if (jong(c) === 8) return st.slice(0, -1) + setJ(c, 17) + '니다';            // ㄹ 받침: 늘어요 → 늡니다
      if (jong(c) > 0) return st + '습니다';
      return st.slice(0, -1) + setJ(c, 17) + '니다';
    }
    const c = b.slice(-1); if (!isH(c) || jong(c) !== 0) return w;
    const pre = b.slice(0, -1);
    if (c === '워') { const q = pre.slice(-1); if (!isH(q) || jong(q) !== 0) return w;
      if ('세키배채비지싸피깨메데외띄'.includes(q)) return pre + '웁니다';                         // 세워요 → 세웁니다 (-우다 동사)
      return pre.slice(0, -1) + setJ(q, 17) + '습니다'; }                                       // 어려워요 → 어렵습니다 (ㅂ 불규칙)
    if ((c === '러' || c === '라') && isH(pre.slice(-1)) && jong(pre.slice(-1)) === 8) return pre.slice(0, -1) + setJ(pre.slice(-1), 0) + '릅니다';   // 르 불규칙: 흘러요 → 흐릅니다
    if (SP[c]) return pre + setJ(SP[c], 17) + '니다';
    const v = vow(c), nv = { 9: 8, 14: 13, 10: 11, 6: 20 }[v];     // ㅘ→ㅗ ㅝ→ㅜ ㅙ→ㅚ ㅕ→ㅣ
    const base = nv != null ? setV(c, nv) : c;
    if ([0, 1, 4, 5, 8, 9, 10, 11, 13, 14, 6, 20, 18].includes(v)) return pre + setJ(base, 17) + '니다';
    return w;
  }
  function toFormal(t) {
    // 따옴표(“ ” " ") 안은 대화 예시라 그대로 둠
    return t.split(/(“[^”]*”|"[^"]*")/).map((seg, i) => i % 2 ? seg : seg.replace(/([가-힣]+요)(?=$|[\s.!,)·—\]】」』…])/g, (m, w) => formalWord(w))).join('');
  }
  // 점수·지표 이름을 상담 보고서 표현으로
  const LABELS = [[/바람기 지수/g, '관계 표현 지표'], [/바람기 테스트/g, '연애 성향 풀이'], [/바람기/g, '연애 성향'], [/인기(?=\s*\d)/g, '매력이 드러나는 정도'], [/흔들림(?=\s*\d)/g, '변화에 대한 선호'], [/한 해 총점/g, '한 해 종합 지표'], [/총점/g, '종합 지표']];
  function polishText(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), L = []; while (w.nextNode()) L.push(w.currentNode);
    L.forEach(n => { let v = n.nodeValue; LABELS.forEach(([re, to]) => { v = v.replace(re, to); }); v = toFormal(v); if (v !== n.nodeValue) n.nodeValue = v; });
  }
  async function serifReady(text) {
    if (!document.getElementById('pdfSerif')) { const l = document.createElement('link'); l.id = 'pdfSerif'; l.rel = 'stylesheet'; l.href = libBase() + 'noto-serif/serif-700.css'; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; setTimeout(r, 4000); }); }
    try { await Promise.race([document.fonts.load(`700 20px "Noto Serif KR"`, text.slice(0, 4000)), new Promise(r => setTimeout(r, 6000))]); } catch (e) { }
  }

  /* ---------- 배치 → PDF 그리기 재료 모으기 ----------
   *  box(폭 600px, PDF_CSS) 안의 요소를 문서 순서대로 훑어 바탕(rect)·테두리(line)·글줄(text)을 좌표(px)로 모은다.
   *  글줄: 글자마다 화면 위치를 재서 같은 줄의 이어진 글자를 한 덩어리로 묶음 → PDF에서도 같은 위치에 실제 글자로 씀 */
  const HEAD = 'h2,h3,h4,h5,.ht,.pdf-h,.yf-mh,.tjm-h';
  // 쪼개지 않는 단위: 한 달 · 표의 한 행 · 근거 상자 · 점수 묶음 등 (단위가 한 쪽보다 길 때만 글줄 경계에서 나눔)
  const ATOM = '.yf-m,.dsec,.tjm,.cs-deep,.pdf-basis,.dscore,.tjm-g,table.pdf-tbl,.cm,.yf-q,.dtwo,.dels,tr,li,.yf-mb,.cs-plan>div';
  const rgb = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return v.length > 3 && v[3] < 0.02 ? null : v.slice(0, 3); };
  const BASE = 1160 / 1448;   // 글자 상자 안 기준선 위치 (Noto Sans/Serif KR: hhea ascent/(ascent+descent))
  function materialize(root) {   // ::before/::after 글자를 실제 글자로 (PDF에서도 보이게)
    root.querySelectorAll('*').forEach(el => ['::before', '::after'].forEach(ps => {
      const c = getComputedStyle(el, ps).content; if (!c || c === 'none' || c === 'normal' || !/^["']/.test(c)) return;
      const t = c.slice(1, -1); if (!t) return;
      const cs = getComputedStyle(el, ps), sp = document.createElement('span');
      sp.textContent = t; sp.style.cssText = `display:${cs.display === 'block' ? 'block' : 'inline'}!important;font-size:${cs.fontSize}!important;color:${cs.color}!important;margin-bottom:${cs.marginBottom}!important;font-family:${cs.fontFamily}!important`;
      el.classList.add('pdf-nops'); ps === '::before' ? el.insertBefore(sp, el.firstChild) : el.appendChild(sp);
    }));
  }
  function collect(root) {
    const R0 = root.getBoundingClientRect(), X0 = R0.left, Y0 = R0.top, ops = [], lines = [], atoms = [], tables = [], heads = [];
    const rng = document.createRange();
    function text(t, cs) {
      const s = t.nodeValue; if (!s || !s.trim()) return;
      const fam = /Serif/i.test(cs.fontFamily.split(',')[0]) ? 'serif' : 'sans', bold = +cs.fontWeight >= 600 || fam === 'serif';
      const size = parseFloat(cs.fontSize), color = rgb(cs.color) || [41, 41, 41];
      let cur = null;
      const flush = () => {
        if (!cur) return; let str = cur.s.replace(/\s+$/, ''); if (!str.trim()) { cur = null; return; }
        const lead = str.length - str.replace(/^\s+/, '').length; str = str.trimStart();
        const x = lead ? cur.xs[lead] : cur.x, right = cur.rs[lead + str.length - 1];   // 앞뒤 공백을 뺀 실제 글자 폭
        const op = { t: 'text', s: str, x, w: right - x, top: cur.top, bot: cur.bot, y: cur.top + (cur.bot - cur.top) * BASE, fam, bold, size, color };
        ops.push(op); lines.push(op); cur = null;
      };
      for (let i = 0; i < s.length; i++) {
        rng.setStart(t, i); rng.setEnd(t, i + 1);
        const rs = rng.getClientRects(); if (!rs.length) continue;
        const r = rs[0]; if (r.width < 0.01 && r.height < 0.01) continue;
        const ch = s[i] === '\n' || s[i] === '\t' ? ' ' : s[i], top = r.top - Y0, x = r.left - X0;
        if (r.width < 0.01) continue;   // 접힌 공백
        if (cur && Math.abs(top - cur.top) < 2 && x >= cur.r - 2 && x - cur.r < size * 1.2) { cur.s += ch; cur.xs.push(x); cur.rs.push(x + r.width); cur.r = x + r.width; cur.bot = Math.max(cur.bot, r.bottom - Y0); }
        else { flush(); cur = { s: ch, x, xs: [x], rs: [x + r.width], r: x + r.width, top, bot: r.bottom - Y0 }; }
      }
      flush();
    }
    function walk(el, li) {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect(), x = r.left - X0, y = r.top - Y0, w = r.width, h = r.height;
      if (el !== root) {
        const bg = rgb(cs.backgroundColor); if (bg && w > 0.5 && h > 0.5) ops.push({ t: 'rect', x, y, w, h, fill: bg });
        [['Top', x, y, x + w, y], ['Bottom', x, y + h, x + w, y + h], ['Left', x, y, x, y + h], ['Right', x + w, y, x + w, y + h]].forEach(([S, x1, y1, x2, y2]) => {
          const bw = parseFloat(cs[`border${S}Width`]); if (!bw || cs[`border${S}Style`] === 'none') return; const c = rgb(cs[`border${S}Color`]); if (!c) return;
          const d = S === 'Top' ? bw / 2 : S === 'Bottom' ? -bw / 2 : 0, e = S === 'Left' ? bw / 2 : S === 'Right' ? -bw / 2 : 0;
          ops.push({ t: 'line', x1: x1 + e, y1: y1 + d, x2: x2 + e, y2: y2 + d, w: bw, color: c });
        });
        if (el.matches(ATOM)) atoms.push([y, y + h]);
        if (el.matches(HEAD)) heads.push(el);
        if (el.tagName === 'TABLE' && el.rows.length > 1 && [...el.rows[0].cells].every(c => c.tagName === 'TH')) {
          const h0 = el.rows[0].getBoundingClientRect(); tables.push({ ht: h0.top - Y0, hb: h0.bottom - Y0, top: y, bottom: y + h });
        }
      }
      // 목록 기호: 첫 글줄의 기준선에 맞춰 그림
      const isLi = cs.display === 'list-item', n0 = lines.length;
      for (const c of el.childNodes) { if (c.nodeType === 3) text(c, cs); else if (c.nodeType === 1) walk(c); }
      if (isLi && lines.length > n0) {
        const f = lines[n0], par = el.parentElement, ol = par && par.tagName === 'OL';
        const mark = ol ? ([...par.children].filter(x => x.tagName === 'LI').indexOf(el) + 1) + '.' : '•';
        const op = { t: 'text', s: mark, x: x - (ol ? 18 : 13), w: 0, top: f.top, bot: f.bot, y: f.y, fam: 'sans', bold: false, size: f.size, color: rgb(cs.color) || f.color, marker: 1 };
        ops.splice(ops.indexOf(f), 0, op);
      }
    }
    walk(root);
    // 제목은 다음 내용의 첫 줄과 같은 쪽에 (제목만 쪽 끝에 남지 않게)
    heads.forEach(hd => {
      const r = hd.getBoundingClientRect(), top = r.top - Y0, bot = r.bottom - Y0;
      const nx = lines.filter(l => l.top >= bot - 1).sort((a, b) => a.top - b.top)[0];
      atoms.push([top, nx && nx.top - bot < 60 ? nx.bot : bot]);
    });
    const H = root.getBoundingClientRect().height;
    return { ops, lines, atoms, tables, H };
  }
  /* 쪽 나누기: 띠(band) = 원본 배치에서 한 쪽에 들어갈 세로 구간 [s, e) */
  function paginate(L, ph, room0) {
    const bands = [], tol = 0.5;
    const cutsLine = y => !L.lines.some(l => l.top < y - tol && l.bot > y + tol);
    const cutsAtom = y => !L.atoms.some(([a, b]) => b - a <= ph * 0.92 && a < y - tol && b > y + tol);
    const cands = [...new Set([...L.lines.map(l => l.bot + 1), ...L.atoms.map(a => a[1] + 1), ...L.ops.filter(o => o.t === 'line' && o.y1 === o.y2).map(o => o.y1 + 0.6)].map(v => Math.round(v * 2) / 2))].sort((a, b) => a - b);
    const nextTop = y => { let m = Infinity; L.lines.forEach(l => { if (l.top >= y - tol && l.top < m) m = l.top; }); L.ops.forEach(o => { if (o.t === 'rect' && o.y >= y - tol && o.y < m) m = o.y; if (o.t === 'line' && Math.min(o.y1, o.y2) >= y - tol && Math.min(o.y1, o.y2) < m) m = Math.min(o.y1, o.y2); }); return m; };
    let s = Math.max(0, Math.min(nextTop(0), 0));
    let guard = 0;
    while (s < L.H - 1 && guard++ < 500) {
      const T = L.tables.find(t => s > t.hb + tol && s < t.bottom - tol);
      const room = (bands.length || room0 == null ? ph : room0) - (T ? T.hb - T.ht : 0), lim = s + room;
      if (L.H <= lim) { bands.push({ s, e: L.H, hdr: T }); break; }
      let best = -1;
      for (const y of cands) { if (y <= s + 30) continue; if (y > lim) break; if (cutsLine(y) && cutsAtom(y)) best = y; }
      if (best < 0) for (const y of cands) { if (y <= s + 30) continue; if (y > lim) break; if (cutsLine(y)) best = y; }
      if (best < 0) best = lim;
      bands.push({ s, e: best, hdr: T });
      const nt = nextTop(best); if (!isFinite(nt)) break;
      s = Math.max(best, nt - 3);
    }
    return bands;
  }
  /* PDF에 그리기 */
  function draw(doc, L, band, ox, oy, k, fontOK) {
    const pt = px => px * k * 72 / 25.4;
    const put = (o, dy) => {
      if (o.t === 'rect') { doc.setFillColor(...o.fill); doc.rect(ox + o.x * k, oy + (o.y + dy) * k, o.w * k, o.h * k, 'F'); return; }
      if (o.t === 'line') { doc.setDrawColor(...o.color); doc.setLineWidth(Math.max(0.1, o.w * k)); doc.line(ox + o.x1 * k, oy + (o.y1 + dy) * k, ox + o.x2 * k, oy + (o.y2 + dy) * k); return; }
      // 글자: 글꼴에 없는 글자는 전체 한글 글꼴로 (같은 위치 유지를 위해 덩어리별 시작 위치는 배치에서 잰 값)
      const fam = o.fam === 'serif' ? 'KSerif' : 'KSans', st = o.bold ? 'bold' : 'normal';
      doc.setTextColor(...o.color); doc.setFontSize(pt(o.size));
      const segs = []; for (const ch of o.s) { const f = fontOK(fam, st, ch) || !fontOK.full ? [fam, st] : ['KFull', 'normal']; const l = segs[segs.length - 1]; if (l && l.f[0] === f[0] && l.f[1] === f[1]) l.s += ch; else segs.push({ f, s: ch }); }
      let x = ox + o.x * k; const y = oy + (o.y + dy) * k;
      const tot = segs.reduce((a, g) => { doc.setFont(g.f[0], g.f[1]); return a + doc.getTextWidth(g.s); }, 0), want = o.w * k;
      const n = [...o.s].length, cs = !o.marker && n > 1 && want > 0 && Math.abs(want - tot) > 0.15 && Math.abs(want - tot) / want < 0.25 ? (want - tot) / (n - 1) : 0;
      segs.forEach(g => { doc.setFont(g.f[0], g.f[1]); doc.text(g.s, x, y, { baseline: 'alphabetic', charSpace: cs || undefined }); x += doc.getTextWidth(g.s) + cs * [...g.s].length; });
    };
    const inBand = (o, s, e) => o.t === 'text' ? (o.top >= s - 1 && o.bot <= e + 1)
      : o.t === 'rect' ? (o.y < e && o.y + o.h > s) : (Math.max(o.y1, o.y2) >= s - 0.6 && Math.min(o.y1, o.y2) <= e + 0.6);
    const clip = (o, s, e) => o.t === 'rect' ? Object.assign({}, o, { y: Math.max(o.y, s), h: Math.min(o.y + o.h, e) - Math.max(o.y, s) })
      : o.t === 'line' && o.x1 === o.x2 ? Object.assign({}, o, { y1: Math.max(Math.min(o.y1, o.y2), s), y2: Math.min(Math.max(o.y1, o.y2), e) }) : o;
    let dy = -band.s;
    if (band.hdr) {   // 표가 이어지면 머리글 행을 다시 그림
      const T = band.hdr, hh = T.hb - T.ht;
      L.ops.forEach(o => { if (inBand(o, T.ht, T.hb) && (o.t !== 'line' || Math.max(o.y1, o.y2) <= T.hb + 0.6) && (o.t !== 'rect' || o.y >= T.ht - 0.6)) put(clip(o, T.ht, T.hb), -T.ht); });
      dy += hh;
    }
    L.ops.forEach(o => { if (inBand(o, band.s, band.e)) put(clip(o, band.s, band.e), dy); });
  }

  async function make(p, done) {
    const s = sections(p, { appendix: withApp }); if (!s) return;
    if (make.busy) return; make.busy = true;   // 두 번 눌러도 한 번만 만듦
    const fills = [];
    const msg = t => { const m = $('#pdfMsg'); if (m) m.textContent = t; }, bar = v => { const b = $('#pdfBar'); if (b) { b.parentNode.hidden = false; b.style.width = Math.round(v * 100) + '%'; } };
    const btn = $('#pdfMake'); if (btn) btn.disabled = true;
    try {
      msg('PDF 도구를 불러오는 중…'); await libs();
      let st = document.getElementById('pdfCss'); if (!st) { st = document.createElement('style'); st.id = 'pdfCss'; st.textContent = PDF_CSS + `.pdfdoc .pdf-nops::before,.pdfdoc .pdf-nops::after{content:none!important}`; document.head.appendChild(st); }
      msg('보고서 글꼴을 준비하는 중…');
      for (const k of ['sans', 'sansB', 'serif']) await fontFile(k);
      const box = document.createElement('div'); box.className = 'pdfdoc'; document.body.appendChild(box);
      const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      // 섹션별 블록 준비 (내용은 미리보기와 같음 · PDF 에서만 이모지 제거·합니다체)
      const secs = s.map((x, i) => { const d = document.createElement('div'); d.innerHTML = x.html; d.querySelectorAll('.pdf-skip,img').forEach(e => e.remove()); [...d.children].forEach(e => { if (e.matches('p.sjnote') && /^\s*※/.test(e.textContent)) e.remove(); }); [...d.children].forEach(c => c.classList.add('pdf-blk')); stripEmoji(d); polishText(d); return d; });
      // 부분 집합에 없는 글자가 있으면 전체 한글 글꼴도 불러옴
      const sansBuf = fontBuf.sans.buf;
      const allText = secs.map(d => d.textContent).join('');
      let needFull = false;
      { const probe = new jsPDF({ unit: 'mm', format: 'a4' }); await pdfFonts(probe, false); probe.setFont('KSans', 'normal'); const md = probe.getFont().metadata; needFull = [...new Set(allText)].some(ch => /\S/.test(ch) && !md.characterToGlyph(ch.codePointAt(0))); }
      if (needFull) await fontFile('full');
      await pdfFonts(doc, needFull);
      await document.fonts.ready;
      const glyph = {}; const fontOK = (fam, st2, ch) => { const key = fam + st2; if (!glyph[key]) { doc.setFont(fam, st2); glyph[key] = doc.getFont().metadata; } return /\s/.test(ch) || !!glyph[key].characterToGlyph(ch.codePointAt(0)); };
      fontOK.full = needFull;
      const PW = 210, PH = 297, M = 12, W = PW - M * 2, HMAX = PH - M * 2 - 6, k = W / PDF_W;
      let page = 0, used = 0;
      const paint = () => { doc.setFillColor(247, 244, 238); doc.rect(0, 0, PW, PH, 'F'); };
      const foot = () => { if (page > 1) { doc.setDrawColor(155, 132, 87); doc.setLineWidth(0.2); doc.line(M, PH - 9, PW - M, PH - 9); doc.setFont('KSans', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 110, 90); doc.text(String(page), PW / 2, PH - 5, { align: 'center' }); } };
      const newPage = () => { if (page) { foot(); doc.addPage(); } page++; paint(); };
      for (let i = 0; i < secs.length; i++) {
        box.innerHTML = ''; [...secs[i].children].forEach(c => box.appendChild(c)); materialize(box);
        const L = collect(box);
        if (i === 0) {   // 표지: 쪽 전체에 그대로
          newPage(); const kc = PW / PDF_W; draw(doc, L, { s: 0, e: L.H }, 0, 0, kc, fontOK); fills.push(100);
        } else {
          // 앞 장의 마지막 쪽이 1/3도 차지 않았으면 그 쪽의 남은 칸에서 다음 장을 시작 (짧은 꼬리만으로 쪽이 늘지 않게)
          const GAP = 10, cont = i > 1 && used > 0 && used < HMAX * 0.33, off = cont ? used + GAP : 0;
          const bands = paginate(L, HMAX / k, cont ? (HMAX - off) / k : null);
          bands.forEach((b, j) => {
            const same = cont && j === 0; if (!same) newPage();
            const top = same ? M + off : M; draw(doc, L, b, M, top, k, fontOK);
            used = (same ? off : 0) + ((b.e - b.s) + (b.hdr ? b.hdr.hb - b.hdr.ht : 0)) * k;
            if (same) fills[fills.length - 1] = Math.round(used / HMAX * 100); else fills.push(Math.round(used / HMAX * 100));
          });
        }
        bar((i + 1) / secs.length); msg(`페이지를 만드는 중… ${Math.round((i + 1) / secs.length * 100)}%`);
        await new Promise(r => setTimeout(r, 0));
      }
      foot(); box.remove();
      if (window.__pdfFail) throw new Error('test failure');   // 테스트용: 실패 처리 확인
      const name = `종합사주리포트_${String(p.name).replace(/[^\w가-힣]/g, '')}_${Y()}.pdf`;
      save.fills = fills; const how = await save(doc, name);
      try { Views.own('pdf', subj(p), { made: Date.now(), pages: page }); } catch (e) { }
      try { Karma.metric('pdf_made'); } catch (e) { }
      msg(how === 'shared' ? `✅ ${page}쪽 PDF를 만들었어요. 공유 화면에서 저장하거나 보낼 수 있어요.` : `✅ ${page}쪽 PDF를 내려받았어요 (${name}).`);
      Hub.toast(`📑 종합 사주 리포트 PDF ${page}쪽 완성`);
      done && done(page);
    } catch (e) {
      console.warn('pdf', e); const bx = document.querySelector('.pdfdoc'); if (bx) bx.remove();
      const ow = Views.ownOf('pdf', subj(p)), it = Views.item('pdf') || {};
      msg('PDF를 만들지 못했어요. 「PDF로 저장하기」를 다시 누르면 추가 차감 없이 다시 시도해요.');
      // 한 번도 만들지 못한 카르마 결제분은 돌려받을 수 있음 (환불하면 이 리포트 보관도 함께 취소)
      const f = $('#pdfFail');
      if (f && ow && !ow.made && ow.v !== 'migrated' && !Store.ownedReal('report')) {
        f.innerHTML = `<button class="ghost wide" id="pdfRefund">✨ ${it.k} 카르마 돌려받기</button><p class="sjnote">돌려받으면 이 리포트의 보관도 취소되고, 다음에 열 때 다시 결제해요.</p>`;
        $('#pdfRefund').onclick = () => { if (!Views.ownOf('pdf', subj(p)) || Views.ownOf('pdf', subj(p)).made) return; Views.disown('pdf', subj(p)); Karma.add(it.k, '📑 종합 사주 리포트 생성 실패 환불', 'bonus'); Views.leave(); Hub.go('saju'); };
      }
    }
    make.busy = false;
    if (btn) btn.disabled = false;
  }
  async function save(doc, name) {
    window.__lastPdf = { name, pages: doc.getNumberOfPages(), fills: save.fills || [] };   // 테스트 확인용 (내용은 담지 않음)
    if (window.__pdfKeep) window.__pdfData = doc.output('datauristring');   // 테스트용: 만든 PDF 확인
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
    const go = () => Views.openDetail('pdf', subj(p), `📑 종합 사주 리포트 · ${p.name}`, () => previewHTML(p), { legacy: Store.ownedReal('report'), title: '종합 사주 리포트 (PDF)', bind: () => bindPreview(p) });
    const st = Views.status('pdf', subj(p), Store.ownedReal('report'));
    if (st.legacy || st.owned || (st.paid && st.freeLeft > 0)) return go();
    openOverlay('📑 종합 사주 리포트 안내', introHTML(p), [{ t: `✨ ${(Views.item('pdf') || {}).k} 카르마로 열기`, pri: 1, f: () => { closeOverlay(true); go(); } }, { t: '닫기' }]);
  }
  // 결제 전 안내: 실제 구성에서 계산한 목차 · 조건 · 예시(상담 요약 일부)
  function introHTML(p) {
    const s = sections(p) || [], it = Views.item('pdf') || {}, pp = partners(), Y0 = Views.keepId('pdf', subj(p)).slice(-4);
    let sample = ''; try { const d = document.createElement('div'); d.innerHTML = s[1].html; d.querySelectorAll('.pdf-h').forEach(e => e.remove()); const t = d.querySelector('table'); sample = t ? t.outerHTML : ''; } catch (e) { }
    return `<div class="sjtxt"><p><b>${esc(p.name)}</b> 님의 정보만으로 만드는 ${Y0}년 기준 상담 보고서예요. 결제하면 미리보기 화면이 열리고, 거기서 PDF로 저장해요.</p></div>
      <div class="pdf-reqlist"><div class="ok"><b>구성 · 표지와 ${s.length - 1}개 장 (약 25~30쪽)</b><small>${s.slice(1).map((x, i) => `${i + 1}. ${esc(x.t)}`).join('<br>')}</small></div>
      <div class="ok"><b>조건</b><small>· ✨ ${it.k} 카르마 1회 결제 · 같은 프로필 · ${Y0}년 기준은 다시 열기 · 다시 내려받기 무료<br>· 다른 프로필 · 다른 연도는 따로 결제${pp.length ? `<br>· 궁합 상대(${pp.map(q => esc(q.name)).join(' · ')})는 미리보기에서 부록으로 넣을지 고를 수 있어요 (추가 비용 없음)` : ''}<br>· 만들기에 실패하면 추가 차감 없이 다시 시도할 수 있고, 한 번도 만들지 못했다면 카르마를 돌려받을 수 있어요<br>· ${Views.ownedNote}</small></div></div>
      ${sample ? `<div class="hcard pdf-sample"><h3 class="ht">예시 · 상담 요약 첫 부분</h3>${sample}</div>` : ''}`;
  }
  return { open, make, sections, mark, missing, ready, noteHTML, toFormal, introHTML };
})();
