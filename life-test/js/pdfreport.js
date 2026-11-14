/* =====================================================================
 *  pdfreport.js — 📑 종합 사주 리포트 (PDF)
 *   상점의 '프리미엄 사주 리포트'를 대신하는 종합 리포트. 한 사람의 모든 풀이를 한 권으로 묶어 PDF로 만든다.
 *   구성(중복 없이 주제별·월별로 다시 묶음): 표지 · 타고난 사주 · 한 해 총평 · 분야별 풀이(연애 성향 포함)
 *         → 상담 보고서 구성: 상담 요약 · 명식과 해석 기준 · 큰 흐름 · 분야별 · 월별 상담(같은 표 형식) · 사주 MBTI(압축) · 궁합 · 상담 정리
 *   - 만들기 조건: 토정비결 · 2027 신년운세 · 궁합 · 사주 MBTI를 먼저 봐야 함 (p8b_done 기록, 개요만 봐도 완료)
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
    const S = window.SAJU, out = [];
    const now = new Date(), people = (Hub.people() || []).filter(q => q && q.date && Hub.analyze(q)).slice(0, 3);
    const h = (n, e, t, sub) => `<div class="pdf-h"><i>${String(n).padStart(2, '0')}</i><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    // 상담 보고서 구성 (detail.js reportParts): 요약 → 명식 → 큰 흐름 → 분야별 → 월별 → 성격 유형 → 궁합 → 상담 정리
    const R = Detail.reportParts(p, a, people);
    const toc = ['상담 요약', '명식과 타고난 성향', ...R.chapters.map(x => x.t), '상담 정리'];
    const gz4 = `${S.ST[a.p.y.s]}${S.BR[a.p.y.b]}년 ${S.ST[a.p.m.s]}${S.BR[a.p.m.b]}월 ${S.ST[a.p.d.s]}${S.BR[a.p.d.b]}일${a.p.h ? ` ${S.ST[a.p.h.s]}${S.BR[a.p.h.b]}시` : ''}`;
    out.push({ t: '표지', html: `<div class="pdf-cover"><div><span class="pdf-kicker">SAJU CONSULTATION REPORT</span>
      <h1>${esc(p.name)} 님의<br>삶과 흐름</h1><span class="pdf-sub">2027 사주 상담 보고서</span>
      <div class="pdf-info"><p><b>생년월일</b>${p.date.replace(/-/g, '.')} (${p.cal === 'l' ? '음력' : '양력'})</p><p><b>출생 시간</b>${p.time ? p.time : '확인되지 않음 — 시주를 제외한 세 기둥으로 해석'}</p><p><b>성별</b>${p.sex === 'f' ? '여성' : '남성'}</p><p><b>명식</b>${gz4}</p><p><b>작성일</b>${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일</p></div>
      <div class="pdf-toc">${toc.map((t, i) => `<p><span>${String(i + 1).padStart(2, '0')}</span>${esc(t)}</p>`).join('')}</div></div>
      <p class="pdf-foot">운명 연구소 · 이 보고서는 사용자의 기기 안에서 작성되었으며, 전통 명리 이론에 바탕을 둔 참고용 해석입니다.</p></div>` });
    out.push({ t: '상담 요약', html: h(1, '', '상담 요약', '타고난 바탕 · 2027년의 주제 · 우선 실천 세 가지') + R.summary });
    // 명식과 해석 범위
    const EL = ['목', '화', '토', '금', '수'], LAB = ['년주', '월주', '일주', '시주'], P4 = [a.p.y, a.p.m, a.p.d, a.p.h];
    const pdfSaju = `<table class="pdf-tbl"><tr>${LAB.map((l, i) => `<th>${l}${i === 2 ? ' (나)' : ''}</th>`).join('')}</tr>
      <tr>${P4.map(c => `<td>${c ? `<b>${S.ST[c.s]}</b> ${S.STK[c.s]}<br><small>${S.EK[S.SE[c.s]]}</small>` : '-'}</td>`).join('')}</tr>
      <tr>${P4.map(c => `<td>${c ? `<b>${S.BR[c.b]}</b> ${S.BRK[c.b]}<br><small>${S.EK[S.BE[c.b]]}</small>` : '-'}</td>`).join('')}</tr></table>
      <table class="pdf-mt"><tr><th>일간</th><td>${a.dm.nm} — ${a.dm.key}</td></tr><tr><th>띠</th><td>${a.ddi}띠</td></tr>
      <tr><th>오행 분포</th><td>${a.el.map((n, i) => `${EL[i]} ${n}`).join(' · ')}</td></tr><tr><th>두드러진 흐름</th><td>${['독립·경쟁', '재능·표현', '재물', '직장·명예', '학업·귀인'][a.dom] || ''} · 겉으로 드러나지 않는 기운: ${S.EK[a.weak]}</td></tr></table>`;
    const zero = a.el.map((n, i) => n === 0 ? S.EK[i] : '').filter(Boolean), by = +p.date.slice(0, 4);
    const basis = `<div class="pdf-basis"><p><b>해석 범위와 계산 기준</b></p>
      ${p.time ? '' : '<p>출생 시간이 확인되지 않아 <b>시주를 제외한 세 기둥(여섯 글자)</b>으로 해석했어요. 대운이 시작되는 나이는 정오 출생으로 가정해 계산한 추정값이며, 출생 시각에 따라 달라질 수 있어요.</p>'}
      <p>오행 분포는 천간·지지에 <b>겉으로 드러난 ${p.time ? '여덟' : '여섯'} 글자</b>만 센 값이며, 지지 속에 숨은 기운(지장간)은 포함하지 않았어요.${zero.length ? ` ${zero.join('·')}이(가) 0이어도 그 기운이 전혀 없다는 뜻이 아니라, 겉으로 드러나지 않는다는 의미예요.` : ''}</p>
      <p>나이는 <b>세는나이</b>(태어난 해를 1살로 셈) 기준이에요. 2027년에 ${2027 - by + 1}세이며, 대운 표에는 해당 연도를 함께 적었어요.</p>
      <p>월별 상담의 달은 절기 기준(예: 2월은 입춘부터)이며, 토정비결 신수는 같은 월지를 가진 음력 달과 짝지었어요.</p>
      <p>본문의 지표(100 기준)는 명리 요소를 정해진 규칙으로 합산한 <b>상대적 참고값</b>으로, 측정 결과가 아니에요. 사주 궁합 지표와 성향(MBTI) 궁합 지표는 서로 다른 기준이에요.</p></div>`;
    out.push({ t: '명식과 타고난 성향', html: h(2, '', '명식과 타고난 성향', '명식 · 해석 범위와 계산 기준 · 성격 · 강점과 약점 · 타고난 흐름') + `<div class="hcard"><h3 class="ht">명식과 해석 범위</h3>${pdfSaju}${basis}</div>
      <div class="hcard"><h3 class="ht">타고난 성격</h3><div class="sjtxt"><p>${a.dm.성격}</p><h4>강점으로 해석되는 부분</h4><p>${a.dm.강점}</p><h4>부담이 될 수 있는 부분</h4><p>${a.dm.약점}</p></div></div>
      <div class="hcard"><h3 class="ht">타고난 흐름과 보완</h3><div class="sjtxt"><p>${S.GDOM[a.dom]}</p><h4>보완할 점</h4><p>${S.GLACK[a.dom]}</p></div></div>` });
    R.chapters.forEach((x, i) => out.push({ t: x.t, html: h(i + 3, '', x.t, x.sub) + x.html }));
    out.push({ t: '상담 정리', html: h(R.chapters.length + 3, '', '상담 정리', '첫 90일 실천 계획 · 돌아볼 질문 · 맺음말') + R.closing + `<div class="hcard"><h3 class="ht">맺음말</h3><div class="sjtxt"><p>사주는 정해진 결과를 알려 주기보다, 타고난 기운의 지도를 보며 나에게 맞는 속도와 방향을 찾는 도구예요. 이 보고서의 해석은 명리 이론에 따른 경향이며, 건강·법률·투자처럼 중요한 결정은 전문가와 상의해 주세요.</p></div>
      <p class="pdf-note">운명 연구소 「인생 게임」에서 내 생년월일로 태어난 가상 인물의 한평생을 미리 살아 볼 수 있어요.</p></div>` });
    return out;
  }

  /* ---------- 만들기 조건: 토정비결 · 2027 신년운세 · 궁합 · 사주 MBTI를 먼저 본 뒤 ---------- */
  const DONE = 'p8b_done';
  const REQ = [['tojeong', '🏮', '토정비결', '토정비결 화면을 열어 올해 괘를 확인해요', () => Hub.go('tojeong')],
    ['newyear', '🧧', '2027 신년운세', '신년운세 화면에서 올해 흐름을 확인해요', () => Hub.go('newyear')],
    ['compat', '💞', '궁합', '궁합에 한 명 이상 등록하고 결과를 확인해요', () => Hub.go('compat')],
    ['mbti', '🧩', '사주 MBTI', '사주 MBTI 결과를 확인해요', () => Fun.openMbti(0)]];
  const doneMap = () => { const m = store.get(DONE, {}); return m && typeof m === 'object' ? m : {}; };
  function mark(k) { const m = doneMap(); if (!m[k]) { m[k] = Date.now(); store.set(DONE, m); } }
  const missing = () => { const m = doneMap(); return REQ.filter(r => !m[r[0]] || (r[0] === 'compat' && !(Hub.people() || []).length)); };
  const ready = () => !missing().length;
  // 버튼 아래 안내글
  function noteHTML() {
    const miss = missing(), n = REQ.length - miss.length;
    return `<p class="pdf-req ${miss.length ? '' : 'ok'}">${miss.length ? `📋 <b>토정비결 · 2027 신년운세 · 궁합 · 사주 MBTI</b>를 먼저 보면 만들 수 있어요 (${n}/${REQ.length} 완료${miss.length ? ` · 남은 것: ${miss.map(r => r[2]).join(', ')}` : ''})` : '✅ 필요한 서비스를 모두 봤어요. 지금 만들 수 있어요'}</p>`;
  }
  function askMissing() {
    const miss = missing();
    openOverlay('📑 종합 사주 리포트 준비', `<div class="sjtxt"><p>종합 사주 리포트는 아래 서비스의 결과를 모아 만들어요. <b>아직 보지 않은 서비스</b>를 먼저 진행해 주세요.</p></div>
      <div class="pdf-reqlist">${REQ.map(r => `<div class="${miss.includes(r) ? '' : 'ok'}"><b>${miss.includes(r) ? '⬜' : '✅'} ${r[1]} ${r[2]}</b><small>${r[3]}</small></div>`).join('')}</div>
      <p class="sjnote">각 서비스의 개요(무료)만 봐도 완료돼요. 다 보고 나면 이 버튼으로 리포트를 만들 수 있어요.</p>`,
      [...miss.map((r, i) => ({ t: `${r[1]} ${r[2]} 보러 가기`, pri: i === 0 ? 1 : 0, f: () => { closeOverlay(true); r[4](); } })), { t: '닫기' }]);
  }

  /* ---------- 미리보기 + PDF 만들기 ---------- */
  function previewHTML(p) {
    const s = sections(p); if (!s) return '<p class="hsub">내 정보를 먼저 입력해 주세요.</p>';
    return `<div class="hcard pdf-bar"><b>📑 종합 사주 리포트</b><small>${s.length}개 장 · 아래 내용을 그대로 PDF로 저장해요</small>
      <button class="bigbtn wide" id="pdfMake">📥 PDF로 저장하기</button><div class="fk-bar pdf-prog" hidden><i id="pdfBar"></i></div><p class="sjnote" id="pdfMsg"></p></div>`
      + s.map(x => `<div class="pdf-sec">${x.html}</div>`).join('');
  }
  // 📄 PDF 보고서 템플릿 — 「프리미엄 상담형」: 아이보리 바탕 · 먹색 본문 · 남색 명조 제목 · 금색 가는 선 · 이모지 없음
  //   폭 600px 를 A4 본문 186mm 에 맞춤 → 본문 16px ≈ 14pt, 소제목 17px, 꼭지 제목 20px(명조), 장 제목 26px(명조), 메모 14px
  const PDF_W = 600, IVORY = '#F7F4EE', INK = '#292929', NAVY = '#24364B', GOLD = '#9B8457', LINE = '#D9CFBA', SOFT = '#EFE8DA';
  const SERIF = `'Noto Serif KR','Nanum Myeongjo','AppleMyungjo','Batang',serif`, SANS = `'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
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
  .pdfdoc .pdf-cover{display:flex!important;flex-direction:column;justify-content:space-between;height:${Math.round(PDF_W * 297 / 210)}px!important;padding:70px 44px 46px!important;border:1px solid ${GOLD}!important}
  .pdfdoc .pdf-cover .pdf-kicker{display:block!important;font-family:${SERIF}!important;font-size:15px!important;letter-spacing:4px!important;color:${GOLD}!important}
  .pdfdoc .pdf-cover h1{display:block!important;font-family:${SERIF}!important;font-size:36px!important;line-height:1.4!important;font-weight:700!important;margin:18px 0 10px!important;color:${NAVY}!important}
  .pdfdoc .pdf-cover .pdf-sub{display:block!important;font-family:${SERIF}!important;font-size:20px!important;color:${NAVY}!important;padding-bottom:18px!important;border-bottom:1px solid ${GOLD}!important;margin-bottom:22px!important}
  .pdfdoc .pdf-cover .pdf-info p{margin:0 0 4px!important;font-size:15px!important}.pdfdoc .pdf-cover .pdf-info b{color:${NAVY}!important;display:inline-block!important;min-width:84px!important}
  .pdfdoc .pdf-cover .pdf-toc{padding:16px 0 0!important;border-top:1px solid ${LINE}!important;margin-top:20px!important}.pdfdoc .pdf-cover .pdf-toc p{margin:0 0 5px!important;font-size:15.5px!important}
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
      const paint = () => { doc.setFillColor(247, 244, 238); doc.rect(0, 0, PW, PH, 'F'); };
      const foot = () => { if (page > 1) { doc.setDrawColor(155, 132, 87); doc.setLineWidth(0.2); doc.line(M, PH - 9, PW - M, PH - 9); doc.setFontSize(9); doc.setTextColor(120, 110, 90); doc.text(String(page), PW / 2, PH - 5, { align: 'center' }); } };
      const newPage = () => { foot(); doc.addPage(); page++; paint(); y = M; };
      paint();
      // 섹션마다 블록(제목·카드) 단위로 캡처해서 페이지에 쌓는다 (카드가 페이지보다 길면 잘라서 이어 붙임)
      msg('보고서 글꼴을 준비하는 중…'); await serifReady(s.map(x => x.html.replace(/<[^>]+>/g, ' ')).join(' ').replace(/\s+/g, ' '));
      const blocks = []; s.forEach((x, i) => { const d = document.createElement('div'); d.innerHTML = x.html; d.querySelectorAll('.pdf-skip').forEach(e => e.remove()); [...d.children].forEach(e => { if (e.matches('p.sjnote') && /^\s*※/.test(e.textContent)) e.remove(); }); [...d.children].forEach((c, k) => blocks.push({ el: c, sec: i, newPage: k === 0 && i > 0, cover: i === 0 })); });
      for (let i = 0; i < blocks.length; i++) {
        const B = blocks[i]; box.innerHTML = ''; B.el.classList.add('pdf-blk'); box.appendChild(B.el);
        box.querySelectorAll('img').forEach(im => im.remove()); stripEmoji(box); polishText(box);
        // 줄 중간에서 자르지 않도록: 문단·행·제목의 아래 끝 위치를 미리 모아 둠 (CSS px)
        const top0 = box.getBoundingClientRect().top;
        const HEAD = 'h2,h3,h4,h5,.ht,.pdf-h,.yf-mh,.tjm-h';
        // 쪼개지 않는 단위: 한 달 · 목록 · 표 · 근거 상자 · 점수 묶음 (단위 안에서는 끊지 않고, 단위가 끝나는 곳에서만 끊음)
        const ATOM = '.yf-m,.dsec,.tjm,.cs-deep,ul,ol,.pdf-basis,.dscore,.tjm-g,table.pdf-mt,table.pdf-tbl,.cm,.yf-q,.dtwo,.dels';
        const inAtom = e => { let x = e.parentElement; while (x && x !== box) { if (x.matches(ATOM)) return true; x = x.parentElement; } return false; };
        const cuts = [...new Set([...box.querySelectorAll('p,li,tr,div,ul,ol,table')].filter(e => !e.matches(HEAD) && !inAtom(e) && (e.matches(ATOM) || /^(P|TR)$/.test(e.tagName) || (e.tagName === 'DIV' && e.children.length === 0)))
          .map(e => Math.round(e.getBoundingClientRect().bottom - top0 + 4)))].sort((x, y) => x - y);
        const cv = await html2canvas(box, { scale: 2, backgroundColor: IVORY, logging: false, useCORS: true });
        const jpg = c => c.toDataURL('image/jpeg', 0.75), k = cv.width / box.getBoundingClientRect().width;   // canvas px / CSS px
        const hmm = cv.height * W / cv.width, pxPerMm = cv.width / W;
        if (B.cover) { doc.addImage(jpg(cv), 'JPEG', 0, 0, PW, Math.min(PH, cv.height * PW / cv.width)); first = false; bar((i + 1) / blocks.length); continue; }
        if (B.newPage) { if (!first) newPage(); y = M; }
        else if (!first && y + Math.min(hmm, 25) > M + HMAX) newPage();
        first = false;
        if (hmm > M + HMAX - y + 2 && hmm <= HMAX * 0.55 && y > M + 5) newPage();   // 짧은 꼭지는 통째로 다음 쪽으로
        if (hmm <= M + HMAX - y + 2) { doc.addImage(jpg(cv), 'JPEG', M, y, W, hmm); y += hmm + 3; }
        else {   // 페이지를 넘는 꼭지: 문단 경계에서 나눔
          let sy = 0;
          while (sy < cv.height - 2) {
            const room = (M + HMAX - y) * pxPerMm;
            let cut = cv.height;
            if (cv.height - sy > room) {
              const lim = sy + room, ok = cuts.map(c => c * k).filter(c => c > sy + 40 && c <= lim);
              cut = ok.length ? ok[ok.length - 1] : lim;
              if (!ok.length && y > M + 5) { newPage(); continue; }   // 남은 칸에 문단 하나도 안 들어가면 다음 쪽부터
            }
            const hpx = Math.max(1, Math.round(cut - sy));
            const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = hpx; const g = c2.getContext('2d'); g.fillStyle = IVORY; g.fillRect(0, 0, c2.width, hpx); g.drawImage(cv, 0, sy, cv.width, hpx, 0, 0, cv.width, hpx);
            doc.addImage(jpg(c2), 'JPEG', M, y, W, hpx / pxPerMm); sy += hpx; y += hpx / pxPerMm + 3;
            if (sy < cv.height - 2) newPage();
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
    if (!ready()) { askMissing(); return; }
    Views.openDetail('pdf', subj(p), `📑 종합 사주 리포트 · ${p.name}`, () => previewHTML(p), { legacy: Store.ownedReal('report'), title: '종합 사주 리포트 (PDF)', bind: () => { const b = $('#pdfMake'); if (b) b.onclick = () => make(p); } });
  }
  return { open, make, sections, mark, missing, ready, noteHTML, toFormal };
})();
