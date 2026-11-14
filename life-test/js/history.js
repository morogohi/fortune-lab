/* =====================================================================
 *  history.js — 생년월일 기준 '내 삶의 세계사'
 *   · 해마다 실제 세계 경제 이슈가 배경으로 펼쳐지고 삶에 영향을 줌
 *   · 시대 제한: 인터넷(1995~)·ETF(1993~)·코인(2010~)·한국인 해외여행 자유화(1989~)·코로나 여행 제한(2020~21)
 *   · 투자 수익률: S&P 500 실제 연간 총수익률(배당 포함, 근사치)이 알려진 해는 그 값을, 나머지는 시대 흐름에 맞춘 연도별 고정값
 *   · 2027년부터는 '가상 미래 시나리오'
 * ===================================================================== */
const Hist = (() => {
  // y: 연도(배열이면 기간), r: 지역(kr=한국만), fx: 영향, big: 크게 알림
  const EV = [
    { y: [1950, 1953], r: 'kr', e: '⚔️', n: '한국전쟁', d: '전쟁으로 나라 전체가 폐허가 되고 많은 가족이 흩어졌다', fx: 'war', big: 1 },
    { y: 1957, e: '🛰️', n: '스푸트니크 발사', d: '소련이 첫 인공위성을 쏘아 올려 우주 경쟁이 시작됐다' },
    { y: 1962, r: 'kr', e: '🏭', n: '경제개발 5개년 계획', d: '공업화가 시작되며 일자리를 찾아 도시로 사람들이 몰렸다', fx: 'growth' },
    { y: 1969, e: '🌕', n: '아폴로 11호 달 착륙', d: '인류가 처음으로 달에 발을 디뎠다', fx: 'hope' },
    { y: 1970, r: 'kr', e: '🛣️', n: '경부고속도로 개통', d: '서울~부산이 하루 생활권이 됐다', fx: 'growth' },
    { y: 1971, e: '💵', n: '닉슨 쇼크', d: '달러와 금의 교환이 멈추며 세계 통화 질서가 바뀌었다' },
    { y: 1973, e: '🛢️', n: '1차 오일쇼크', d: '석유값이 몇 배로 뛰며 세계 물가가 치솟았다', fx: 'oil', big: 1 },
    { y: 1979, e: '🛢️', n: '2차 오일쇼크', d: '다시 석유값이 급등하고 금리가 크게 올랐다', fx: 'oil', big: 1 },
    { y: 1981, e: '🏦', n: '고금리 시대', d: '물가를 잡으려 미국 기준금리가 20% 가까이 올랐다', fx: 'rate' },
    { y: 1985, e: '💱', n: '플라자 합의', d: '달러 가치를 낮추기로 해 엔화가 크게 올랐다' },
    { y: 1987, e: '📉', n: '블랙 먼데이', d: '하루 만에 미국 주가가 20% 넘게 폭락했다(그해 전체로는 소폭 상승)', fx: 'shock', big: 1 },
    { y: 1988, r: 'kr', e: '🏅', n: '서울 올림픽', d: '온 나라가 들뜬 축제의 해', fx: 'festive' },
    { y: 1989, e: '🧱', n: '베를린 장벽 붕괴', d: '냉전이 끝나 가고 동서가 하나로 이어지기 시작했다', fx: 'hope' },
    { y: 1989, r: 'kr', e: '✈️', n: '해외여행 전면 자유화', d: '이제 누구나 여권을 만들어 해외여행을 갈 수 있다' },
    { y: 1991, e: '🚩', n: '소련 해체', d: '냉전이 끝나고 세계 시장이 하나로 묶이기 시작했다' },
    { y: 1993, e: '📊', n: '첫 ETF 상장', d: '주식 수백 개를 한 번에 사는 지수 ETF가 등장했다' },
    { y: 1995, e: '🌐', n: '인터넷 대중화', d: '집집마다 인터넷이 들어오며 새로운 직업들이 생겼다', fx: 'net', big: 1 },
    { y: [1997, 1998], r: 'kr', e: '🆘', n: 'IMF 외환위기', d: '외환이 바닥나 국제통화기금의 구제금융을 받았다. 대량 해고와 부도가 이어지고 금 모으기 운동이 일어났다', fx: 'imf', big: 1 },
    { y: 1997, e: '🌏', n: '아시아 외환위기', d: '태국에서 시작된 통화 위기가 아시아 전체로 번졌다', fx: 'asia' },
    { y: 1999, e: '🫧', n: '닷컴 버블', d: '이름에 .com만 붙어도 주가가 뛰던 과열의 해', fx: 'bubble' },
    { y: [2000, 2002], e: '💥', n: '닷컴 버블 붕괴', d: '인터넷 기업 주가가 폭락하며 기술주가 3년 연속 떨어졌다', fx: 'crash', big: 1 },
    { y: 2001, e: '🗽', n: '9·11 테러', d: '미국 뉴욕에서 일어난 테러로 세계가 충격에 빠졌다', fx: 'shock' },
    { y: 2002, r: 'kr', e: '⚽', n: '한일 월드컵 4강', d: '거리마다 붉은 응원 물결이 넘쳤다', fx: 'festive' },
    { y: 2007, e: '📱', n: '스마트폰 등장', d: '손안의 컴퓨터가 생기며 앱·콘텐츠 시장이 열렸다', fx: 'smart' },
    { y: 2008, e: '🏚️', n: '글로벌 금융위기', d: '미국 주택담보대출 부실로 대형 투자은행이 무너지고 세계 증시가 폭락했다', fx: 'crash', big: 1 },
    { y: 2009, e: '🪙', n: '비트코인 탄생', d: '정부 없이 돌아가는 디지털 화폐가 등장했다' },
    { y: 2010, e: '🇪🇺', n: '유럽 재정위기', d: '그리스 등 유럽 나라들의 나랏빚 문제가 불거졌다', fx: 'shock' },
    { y: 2011, e: '🌊', n: '동일본 대지진', d: '대지진과 원전 사고로 아시아 경제가 흔들렸다' },
    { y: 2016, e: '🤖', n: '알파고 vs 이세돌', d: 'AI가 바둑 최고수를 이기며 인공지능 시대가 성큼 다가왔다', fx: 'ai0' },
    { y: 2016, e: '🇬🇧', n: '브렉시트 투표', d: '영국이 유럽연합 탈퇴를 결정했다' },
    { y: 2018, e: '⚔️', n: '미·중 무역 전쟁', d: '서로 관세를 올리며 세계 교역이 위축됐다', fx: 'shock' },
    { y: [2020, 2021], e: '😷', n: '코로나19 팬데믹', d: '전 세계가 봉쇄되고 국경이 닫혔다. 재택근무와 온라인이 일상이 됐고, 각국이 돈을 풀어 주가는 빠르게 회복했다', fx: 'pandemic', big: 1 },
    { y: 2022, e: '🔥', n: '인플레이션과 금리 급등', d: '물가가 40년 만에 최고로 오르고 금리가 빠르게 올랐다. 주식·코인·부동산이 함께 떨어졌다', fx: 'inflation', big: 1 },
    { y: 2023, e: '🧠', n: '생성형 AI 붐', d: 'ChatGPT 등 생성형 AI가 퍼지며 AI·반도체 기업이 급성장했다', fx: 'ai', big: 1 },
    { y: [2024, 2026], e: '💾', n: 'AI 반도체 투자 열풍', d: '데이터센터와 AI 칩 투자가 세계 경제를 끌었다', fx: 'ai' },
  ];
  // S&P 500 연간 총수익률(배당 포함, 근사치 %) — 널리 알려진 해만
  const SP = { 1973: -14.7, 1974: -26.5, 1975: 37.2, 1987: 5.2, 1995: 37.6, 1997: 33.4, 1999: 21.0, 2000: -9.1, 2001: -11.9, 2002: -22.1, 2003: 28.7, 2008: -37.0, 2009: 26.5, 2013: 32.4, 2018: -4.4, 2019: 31.5, 2020: 18.4, 2021: 28.7, 2022: -18.1, 2023: 26.3, 2024: 25.0 };
  // 비트코인 연간 등락(근사치 %) — 큰 움직임이 알려진 해만
  const BTC = { 2017: 1300, 2018: -73, 2020: 300, 2021: 60, 2022: -64, 2023: 155, 2024: 120 };
  const FUTURE = [
    ['🤖', 'AI 비서 일상화', '대부분의 사무 업무를 AI가 돕는 시대'], ['🌡️', '기후 위기 대응 투자', '탄소 감축 산업에 돈이 몰린다'], ['🚀', '우주 관광 대중화', '돈만 있으면 우주에 다녀올 수 있다'],
    ['🧓', '초고령 사회', '일하는 사람보다 은퇴한 사람이 많아진다'], ['⚡', '전기차·재생에너지 전환', '주유소가 충전소로 바뀌었다'], ['🧬', '수명 연장 의학', '100세 건강이 흔해진다'],
    ['💱', '디지털 화폐 확산', '현금 대신 디지털 화폐로 계산한다'], ['🌊', '해수면 상승 대책', '해안 도시들이 방파제를 쌓는다'], ['📉', '가상 경기 침체', '세계 경기가 한동안 얼어붙는다'],
  ];
  const seeded = y => { let h = y * 2654435761 >>> 0; return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; };
  const inY = (e, Y) => Array.isArray(e.y) ? Y >= e.y[0] && Y <= e.y[1] : e.y === Y;
  const isKr = () => P && P.country && P.country.n === '한국';
  function events(Y) {
    const list = EV.filter(e => inY(e, Y) && (!e.r || (e.r === 'kr' && isKr())));
    if (Y > 2026) { const r = seeded(Y); if (r() < .35) { const f = FUTURE[Math.floor(r() * FUTURE.length)]; list.push({ e: f[0], n: f[1], d: f[2], fx: f[1].includes('침체') ? 'crash' : 'future', future: 1 }); } }
    return list;
  }
  // 그해 시장 수익률 (소수) — 모든 인생이 같은 역사를 공유하도록 연도로 고정
  function market(Y) {
    if (SP[Y] != null) return SP[Y] / 100;
    const r = seeded(Y + 7)(), ev = events(Y).map(e => e.fx);
    if (ev.includes('crash') || ev.includes('imf') || ev.includes('war')) return -.12 - r * .15;
    if (ev.includes('oil') || ev.includes('rate') || ev.includes('shock') || ev.includes('inflation')) return -.06 + r * .1;
    if (ev.includes('net') || ev.includes('bubble') || ev.includes('ai') || ev.includes('growth')) return .12 + r * .15;
    return -.04 + r * .2;   // 평범한 해: 대략 −4% ~ +16%
  }
  function coin(Y) { if (Y < 2010) return null; if (BTC[Y] != null) return BTC[Y] / 100; const r = seeded(Y + 13)(); return -.6 + r * 2.2; }
  const known = Y => SP[Y] != null;
  function era(k, Y = P ? P.birth.y + P.age : 2026) {
    if (k === 'internet') return Y >= 1995; if (k === 'etf') return Y >= 1993; if (k === 'coin') return Y >= 2010;
    if (k === 'travel') return !isKr() || Y >= 1989; if (k === 'travelBan') return Y === 2020 || Y === 2021;
    if (k === 'smartphone') return Y >= 2008; return true;
  }
  /* 해마다: 사건 알림 + 영향 */
  const SAFE = new Set(['doctor', 'teacher', 'nurse']);
  function yearly() {
    if (!P || !P.alive) return;
    const Y = P.birth.y + P.age, list = events(Y);
    if (!list.length) return;
    P.histLived = P.histLived || [];
    list.forEach(ev => {
      if (P.histLived.some(x => x.n === ev.n)) { if (!['pandemic', 'imf', 'crash', 'ai'].includes(ev.fx)) return; }
      else P.histLived.push({ y: Y, a: P.age, e: ev.e, n: ev.n, f: ev.future ? 1 : 0 });
      log(`📰 ${Y}년 ${ev.future ? '(가상 미래) ' : ''}${ev.e} ${ev.n} — ${ev.d}`, ['crash', 'imf', 'war', 'oil', 'inflation', 'pandemic'].includes(ev.fx) ? 'bad' : '');
      if (ev.big && !P.histCut?.[ev.n]) { (P.histCut = P.histCut || {})[ev.n] = 1; cutin(ev.e, `${Y}년 ${ev.n}`, ev.d.split('.')[0]); }
      apply(ev, Y);
    });
  }
  function apply(ev, Y) {
    const job = P.job && !P.retired, safe = job && SAFE.has(P.job.id);
    switch (ev.fx) {
      case 'war': fx({ hp: -6, hap: -10, money: -Math.max(0, Math.round(P.money * .5)) }, 1); break;
      case 'oil': fx({ money: -M(700), hap: -2 }, 1); log('⛽ 기름값·물가가 올라 생활비가 늘었다', 'bad'); break;
      case 'rate': if (P.bank && P.bank.loan) { fx({ money: -Math.round(P.bank.loan * .04) }, 1); log('💸 금리가 올라 대출 이자가 늘었다', 'bad'); } break;
      case 'imf': if (job && !safe && Math.random() < .25) { log(`📦 IMF 한파로 ${P.job.n} 일자리를 잃었다`, 'bad'); P.job = null; fx({ hap: -10 }, 1); }
        else fx({ hap: -4 }, 1); if (P.money > 0) fx({ money: -Math.round(P.money * .08) }, 1); if (Y === 1998 && !P.marks.has('goldDrive')) { P.marks.add('goldDrive'); log('💍 금 모으기 운동에 집에 있던 금반지를 내놓았다'); fx({ bond: 3 }, 1); } break;
      case 'crash': if (job && !safe && Math.random() < .12) { log(`📦 경기 침체로 ${P.job.n} 자리에서 구조조정을 당했다`, 'bad'); P.job = null; fx({ hap: -8 }, 1); } else fx({ hap: -2 }, 1); break;
      case 'pandemic': if (P.age >= 65) fx({ hp: -5 }, 1); if (P.job && ['dev', 'creator'].includes(P.job.id)) { fx({ money: Math.round((P.jobPay || 0) * .1) }, 1); log('💻 비대면 시대에 일감이 늘었다', 'good'); }
        else if (job && !safe && P.job.lad && ['market', 'driver', 'chef'].includes(P.job.lad) && Math.random() < .2) { log('🏪 손님이 끊겨 일을 잠시 쉬게 됐다', 'bad'); fx({ money: -Math.round((P.jobPay || 0) * .2), hap: -5 }, 1); } break;
      case 'inflation': fx({ money: -M(500), hap: -2 }, 1); if (P.bank && P.bank.loan) log('💸 대출 금리가 크게 올랐다', 'bad'); break;
      case 'net': case 'smart': case 'ai': if (P.job && ['dev', 'creator', 'eng'].includes(P.job.id)) { fx({ money: Math.round((P.jobPay || 0) * .12) }, 1); log(`🚀 ${ev.n} 덕분에 내 분야 몸값이 올랐다`, 'good'); } break;
      case 'festive': fx({ hap: 4 }, 1); break;
      case 'hope': fx({ hap: 2 }, 1); break;
    }
  }
  function birthLine() {
    const Y = P.birth.y, near = EV.filter(e => !e.r || (e.r === 'kr' && isKr())).map(e => ({ e, d: Math.abs((Array.isArray(e.y) ? e.y[0] : e.y) - Y) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d <= 4) log(`🌍 ${Y}년, 세상은 ${near.e.e} ${near.e.n} 무렵이었다`);
    else if (Y > 2026) log(`🌍 ${Y}년 — 지금보다 먼 미래에서 태어났다 (가상 미래 시나리오)`);
  }
  function endBox() {
    if (!P || !P.histLived || !P.histLived.length || $('#endHist')) return;
    const rows = P.histLived.slice(0, 24).map(h => `<div class="tli"><span class="tla">${h.a}살</span><span class="tle">${h.e}</span><span>${h.y}년 ${h.n}${h.f ? ' <em>(가상)</em>' : ''}</span></div>`).join('');
    const html = `<div class="box" id="endHist"><div class="jua sec">📜 내가 살아온 세계사</div><div class="tl">${rows}</div>
      <p class="sjnote">${P.birth.y}년생 ${P.name}이(가) 겪은 실제 세계 경제·역사 사건이에요. 2027년 이후는 가상 시나리오예요.</p></div>`;
    const w = $('#endWorld'); if (w) w.insertAdjacentHTML('afterend', html);
  }
  function init() {
    const _age = ageUp; ageUp = function () { const a0 = P && P.age; _age(); if (P && P.age !== a0) yearly(); };
    $('#ageBtn').onclick = () => ageUp();
    const _beg = beginLife; beginLife = function () { _beg(); P.histLived = []; birthLine(); };
    const _show = show; show = function (id) { _show(id); if (id === 'end') setTimeout(endBox, 60); };
  }
  return { init, events, market, coin, known, era, EV, SP, yearly };
})();
window.Hist = Hist;
Hist.init();
