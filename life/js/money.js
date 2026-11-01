/* =====================================================================
 *  money.js — 금융 생활
 *   용돈 · 알바 · 은행(예금·대출·신용점수) · 금융 공부 · 투자(예금·ETF·주식·코인)
 *   부동산 투자(오피스텔·상가·아파트·토지, 대출 LTV) · 경기 순환
 *   ※ 돈 단위는 게임 공통 규칙(선진국 기준 금액 × 출생국 물가)을 따라요.
 * ===================================================================== */
const Money = (() => {
  const bank = () => (P.bank = P.bank || { save: 0, loan: 0, credit: 650 });
  const fin = () => P.fin || 0;
  const rate = () => +(3.5 + Math.max(0, (850 - bank().credit)) / 60).toFixed(1);       // 대출 금리 %
  const grade = c => c >= 900 ? '1등급' : c >= 840 ? '2등급' : c >= 770 ? '3등급' : c >= 700 ? '4등급' : c >= 630 ? '5등급' : c >= 560 ? '6등급' : c >= 480 ? '7등급' : '8등급 이하';
  const limit = () => Math.max(M(3000), Math.round((P.jobPay || 0) * 1.5 + netWorth() * .3)) * (bank().credit >= 600 ? 1 : .4);
  const TIPS = [
    ['복리', '이자에 이자가 붙어요. 연 7%면 약 10년 만에 두 배가 돼요(72의 법칙).'],
    ['분산 투자', '한 바구니에 달걀을 다 담지 마세요. 여러 자산에 나누면 한 번에 크게 잃지 않아요.'],
    ['신용점수', '대출을 제때 갚으면 오르고, 연체하면 크게 떨어져요. 점수가 높을수록 금리가 낮아요.'],
    ['LTV', '집값 대비 대출 비율. 60%면 10억 집에 6억까지 빌릴 수 있다는 뜻이에요.'],
    ['DSR', '1년 소득 중 원리금 상환에 쓰는 비율. 너무 높으면 대출이 막혀요.'],
    ['인플레이션', '물가가 오르면 현금 가치는 떨어져요. 그래서 예금만으로는 부족할 때가 있어요.'],
    ['ETF', '여러 주식을 묶어 놓은 상품. 개별 주식보다 덜 흔들리고 수수료가 싸요.'],
    ['비상금', '생활비 3~6개월치는 언제든 꺼낼 수 있게 따로 두세요.'],
    ['레버리지', '빚을 내 투자하면 이익도 손해도 커져요. 금리보다 수익이 낮으면 손해예요.'],
    ['임대 수익률', '1년 월세 합계 ÷ 매입가. 대출 이자보다 높아야 남는 장사예요.'],
  ];

  /* ---------- 경기 ---------- */
  const year = () => P.birth.y + P.age;
  function market() { if (P.mktAge !== P.age) { P.mktAge = P.age; P.mkt = window.Hist ? Hist.market(year()) : (Math.random() * .3 - .1); } return P.mkt; }
  const mktWord = () => { market(); return P.mkt <= -.1 ? '📉 불황' : P.mkt < .06 ? '➡️ 보합' : '📈 호황'; };

  /* ---------- 용돈 · 알바 ---------- */
  function allowance() {
    if (P.age < 7 || P.age > 17 || P.cls === 0) return;
    const a = M(R(60, 120) * (1 + P.cls * .6)); fx({ money: a }, 1);
    if (fin() >= 15) { const sv = Math.round(a * .3); bank().save += sv; P.money -= sv; }
    if (P.age % 3 === 1) log(`💵 올해 용돈 ${usd(a)}${fin() >= 15 ? ' (30%는 저금)' : ''}`);
  }
  const ALBA = [
    { e: '🏪', n: '편의점', pay: 1300, st: { hp: -2 }, min: 15 }, { e: '☕', n: '카페', pay: 1400, st: { look: 1, hp: -1 }, min: 15 },
    { e: '📰', n: '전단지 돌리기', pay: 700, st: { hp: -1 }, min: 14 }, { e: '🛵', n: '배달', pay: 2200, st: { hp: -3 }, min: 18 },
    { e: '✏️', n: '과외 선생님', pay: 2800, st: { smart: 1 }, min: 17, ok: p => p.smart >= 60 || Object.values(p.sub).some(v => v >= 70) },
    { e: '🎹', n: '피아노 반주', pay: 2000, st: { hap: 2 }, min: 16, ok: p => (p.hlv['피아노'] || 0) >= 5 },
  ];
  function openAlba() {
    const list = ALBA.filter(a => P.age >= a.min && (!a.ok || a.ok(P)));
    if (!list.length) { log('아직 할 수 있는 알바가 없어요 (14살부터)'); return; }
    showModal({
      e: '💼', t: '알바', d: `행동력 ${P.energy} · 번 돈은 저축하거나 여행·학원비로 써요`, grid: 1,
      ch: [...list.map(a => ({ t: `<span class="ge">${a.e}</span>${a.n}<small>${usd(M(a.pay))}</small>`, f: () => {
        if (!useEnergy()) return; World.goTo(a.n === '과외 선생님' ? 'library' : 'shop');
        fx({ money: M(a.pay), ...a.st }); playAnim('work'); say(a.n === '카페' ? '아메리카노 나왔습니다~' : a.n === '배달' ? '배달 왔습니다!' : '어서오세요~');
        log(`${a.e} ${a.n} 알바 +${usd(M(a.pay))}`); P.albaN = (P.albaN || 0) + 1; if (P.albaN === 10) badge('알바 장인');
      } })), { t: '그만', f: () => { } }],
    });
  }

  /* ---------- 은행 ---------- */
  function openBank() {
    const b = bank(), r = rate();
    showModal({
      e: '🏦', t: '은행', d: `현금 ${usd(P.money)} · 예금 ${usd(b.save)} · 대출 ${usd(b.loan)}${P.loan ? ` (+주택 ${usd(P.loan)})` : ''}\n신용점수 ${b.credit} (${grade(b.credit)}) · 금리 ${r}% · 금융 지식 ${fin()}`,
      ch: [
        ...(P.money > M(100) ? [{ t: '💰 예금하기', s: '현금의 절반 · 연 3% 이자 (금융 지식이 높으면 더)', f: () => { const v = Math.round(P.money / 2); P.money -= v; b.save += v; log(`🏦 예금 ${usd(v)}`); renderStats(); } }] : []),
        ...(b.save > 0 ? [{ t: '💸 예금 찾기', s: usd(b.save), f: () => { P.money += b.save; log(`🏦 예금 ${usd(b.save)} 인출`); b.save = 0; renderStats(); } }] : []),
        ...(P.age >= 19 ? [{ t: '📝 대출 받기', s: `한도 약 ${usd(limit() - b.loan)} · 금리 ${r}%`, f: () => askBorrow() }] : []),
        ...(b.loan > 0 && P.money > 0 ? [{ t: '✅ 대출 갚기', s: `${usd(Math.min(P.money, b.loan))} 상환 · 신용점수 ↑`, f: () => { const v = Math.min(P.money, b.loan); P.money -= v; b.loan -= v; b.credit = Math.min(950, b.credit + 15); log(`✅ 대출 ${usd(v)} 상환 (신용 ${b.credit})`, 'good'); renderStats(); } }] : []),
        { t: '📈 투자하기', s: `${climate()} · 보유 ${usd(pv())}`, f: () => openInvest() },
        { t: '🎓 금융 세미나 (퀴즈)', s: '금융 지식 ↑ · 행동력 1', f: () => study('bank') },
        { t: '닫기', f: () => { } }],
    });
    setTimeout(() => { const p = document.querySelector('#sheet p'); if (p) p.style.whiteSpace = 'pre-line'; }, 0);
  }
  function askBorrow() {
    const b = bank(), room = Math.max(0, limit() - b.loan);
    if (room < M(500)) { log('대출 한도가 부족해요 (소득·자산·신용점수를 올려 보세요)', 'bad'); return; }
    showModal({
      e: '📝', t: '대출 받기', d: `금리 ${rate()}% · 매년 이자를 내야 해요. 못 내면 신용점수가 떨어져요.`,
      ch: [[.25, '조금'], [.5, '절반'], [1, '한도까지']].map(([k, w]) => ({ t: `${w} ${usd(Math.round(room * k))}`, f: () => borrow(Math.round(room * k)) })).concat([{ t: '안 빌릴래', f: () => { } }]),
    });
  }
  function borrow(v, why = '신용대출') {
    const b = bank();
    if (P.age < 19 && why !== '학자금 대출') { log('대출은 19살부터 받을 수 있어요', 'bad'); return false; }
    if (why !== '학자금 대출' && b.loan + v > limit()) { log('대출 한도를 넘었어요', 'bad'); return false; }   // 학자금 대출은 학비만큼 가능
    b.loan += v; P.money += v; World.goTo('bank'); log(`🏦 ${why} ${usd(v)} (금리 ${rate()}%)`, 'bad'); renderStats(); return true;
  }
  function study(where) {
    if (!useEnergy()) return; World.goTo(where === 'library' ? 'library' : 'bank');
    P.finSeen = P.finSeen || [];
    const pool = CONTENT.FIN.map((_, i) => i).filter(i => !P.finSeen.includes(i)), i = (pool.length ? pool : CONTENT.FIN.map((_, j) => j))[R(0, (pool.length || CONTENT.FIN.length) - 1)];
    const [topic, desc, q, ans, w1, w2] = CONTENT.FIN[i];
    showModal({
      e: '💹', t: `금융 수업: ${topic}`, auto: 1, noAuto: 1,
      html: () => `<div class="fincard"><b>💡 ${topic}</b><p>${desc}</p></div><p class="lq">퀴즈: ${q}</p>`,
      ch: [ans, w1, w2].sort(() => Math.random() - .5).map(o => ({ t: o, f: () => {
        const ok = o === ans, g = ok ? R(8, 12) : R(2, 4);
        P.fin = Math.min(100, fin() + g); if (!P.finSeen.includes(i)) P.finSeen.push(i);
        fx({ smart: 1 }); playAnim('read'); Snd.sfx(ok ? 'good' : 'bad');
        log(`💹 금융 수업 「${topic}」 ${ok ? '✅ 정답' : `❌ 오답 (정답: ${ans})`} · 금융 지식 +${g} → ${P.fin}`, ok ? 'good' : '');
        if (P.fin >= 60) badge('금융 박사');
      } })),
    });
  }

  /* ---------- 투자: 실제로 사서 들고 있으면 해마다 그해 시장(실제 역사)에 따라 오르내림 ---------- */
  const port = () => (P.port = P.port || { etf: 0, stock: 0, coin: 0, cost: { etf: 0, stock: 0, coin: 0 } });
  const INV = [
    { k: 'etf', e: '📊', n: '지수 ETF (S&P 500)', alt: '주식형 펀드', era: 'etf', d: '미국 대기업 500곳에 나눠 투자. 시장 평균을 그대로 따라가요.', lesson: '하나만 산다면 이것. 수수료가 낮고 한 기업이 망해도 크게 다치지 않아요. 대신 시장 전체가 떨어지는 해엔 함께 떨어져요.' },
    { k: 'stock', e: '📈', n: '개별 주식', d: '몇몇 회사를 골라 투자. 시장보다 더 크게 오르내려요.', lesson: '회사의 실적과 미래를 공부할수록 유리해요(금융 지식이 수익에 반영). 시장이 좋아도 고른 회사가 나쁘면 잃을 수 있어요.' },
    { k: 'coin', e: '🪙', n: '코인 (비트코인)', era: 'coin', d: '2009년에 생긴 디지털 화폐. 1년에 몇 배가 되거나 반토막이 나요.', lesson: '변동성이 가장 커요. 잃어도 괜찮은 돈만 넣는 게 원칙이에요.' },
  ];
  const pv = () => { const q = port(); return q.etf + q.stock + q.coin; };
  const pct = v => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
  function climate() {
    const Y = year(), ev = window.Hist ? Hist.events(Y) : [], m = market();
    return `${Y}년${ev.length ? ' · ' + ev.map(e => e.e + ' ' + e.n).join(', ') : ''}${window.Hist && Hist.known(Y) ? '' : ''}`;
  }
  function openInvest() {
    const q = port(), Y = year();
    const hold = INV.filter(i => q[i.k] > 0).map(i => `${i.e} ${q[i.k] > 0 ? usd(q[i.k]) : ''} (${pct(q[i.k] / Math.max(1, q.cost[i.k]) - 1)})`).join(' · ');
    showModal({
      e: '📈', t: '투자', d: `${climate()}\n현금 ${usd(P.money)} · 보유 ${hold || '없음'} · 금융 지식 ${fin()}`,
      ch: [...INV.filter(i => !i.era || !window.Hist || Hist.era(i.era)).map(i => ({ t: `${i.e} ${i.k === 'etf' && window.Hist && !Hist.era('etf') ? i.alt : i.n} 사기`, s: `현금의 30% · ${i.d}`, f: () => buy(i) })),
        ...INV.filter(i => q[i.k] > 0).map(i => ({ t: `💰 ${i.e} ${i.n} 전부 팔기`, s: `평가액 ${usd(q[i.k])} · 손익 ${usd(q[i.k] - q.cost[i.k])}`, f: () => sell(i) })),
        ...(INV.some(i => i.era === 'coin') && window.Hist && !Hist.era('coin') ? [] : []),
        { t: '📚 투자 수업 듣기', s: '금융 퀴즈 · 행동력 1', f: () => study('bank') }, { t: '닫기', f: () => { } }],
    });
    setTimeout(() => { const p = document.querySelector('#sheet p'); if (p) p.style.whiteSpace = 'pre-line'; }, 0);
  }
  function buy(i) {
    const amt = Math.round(Math.max(0, P.money) * .3);
    if (amt < M(200)) { log('투자할 현금이 부족해요'); return; }
    if (!useEnergy()) return; World.goTo('bank');
    const q = port(); q[i.k] += amt; q.cost[i.k] += amt; P.money -= amt;
    showModal({ e: i.e, t: `${i.n} 매수 · ${usd(amt)}`, auto: 1, noAuto: 1, html: () => `<div class="fincard"><b>📚 알아 두기</b><p>${i.lesson}</p><p>이제부터 해마다 그해 실제 시장 흐름에 따라 평가액이 바뀌어요. 팔 때 손익이 확정돼요.</p></div>`, ch: [{ t: '알겠어요', f: () => { } }] });
    log(`${i.e} ${i.n} ${usd(amt)} 매수 (${climate()})`); playAnim('give'); Snd.sfx('coin'); renderStats();
  }
  function sell(i) {
    const q = port(), v = q[i.k], gain = v - q.cost[i.k];
    P.money += v; q[i.k] = 0; q.cost[i.k] = 0; fx({ hap: gain > 0 ? 5 : -3 });
    log(`💰 ${i.e} ${i.n} 매도 ${usd(v)} (손익 ${gain >= 0 ? '+' : ''}${usd(gain)})`, gain >= 0 ? 'good' : 'bad');
    if (gain > 0 && gain > M(50000)) badge('투자 수익 실현');
  }
  function yearlyPort() {
    const q = port(); if (pv() <= 0) return;
    const Y = year(), m = market(), skill = (fin() - 30) / 500, L = Saju.luckAt(P.saju, P.age), luck = L && L.g === 2 ? .03 : 0;
    const before = pv(), rets = {};
    rets.etf = m;
    rets.stock = m * 1.15 + skill + luck + (Math.random() - .5) * .4;
    const c = window.Hist ? Hist.coin(Y) : null; rets.coin = c == null ? 0 : c + (Math.random() - .5) * .3;
    ['etf', 'stock', 'coin'].forEach(k => { if (q[k] > 0) q[k] = Math.max(0, Math.round(q[k] * (1 + Math.max(-.95, rets[k])))); });
    const after = pv(), known = window.Hist && Hist.known(Y);
    const ev = window.Hist ? Hist.events(Y).filter(e => e.fx).map(e => e.n)[0] : '';
    log(`📈 ${Y}년 내 투자 ${usd(before)} → ${usd(after)} (${pct(after / before - 1)})${q.etf ? ` · ETF ${pct(rets.etf)}${known ? ` = 실제 S&P 500 ${Hist.SP[Y]}%` : ''}` : ''}${ev ? ` · ${ev}` : ''}`, after >= before ? 'good' : 'bad');
    // 폭락장 수업: 실제 투자자들이 가장 많이 실수하는 순간
    if (m <= -.15 && before > M(1000) && !P.crashLesson?.[Y]) {
      (P.crashLesson = P.crashLesson || {})[Y] = 1;
      showModal({ e: '📉', t: `${Y}년 폭락장, 어떻게 할까?`, d: `내 투자가 ${pct(after / before - 1)} 떨어졌어요. ${ev || '시장 전체가 흔들리고 있어요'}.`,
        ch: [{ t: '🧘 그대로 들고 버틴다 (장기 투자)', f: () => { log('🧘 폭락장에서 버티기로 했다. 역사적으로 큰 폭락은 몇 년 뒤 회복된 경우가 많았다'); P.fin = Math.min(100, fin() + 3); } },
          { t: '🛒 싸졌을 때 조금 더 산다 (분할 매수)', f: () => { const a = Math.round(Math.max(0, P.money) * .15); if (a > 0) { q.etf += a; q.cost.etf += a; P.money -= a; } log(`🛒 하락장에서 ${usd(a)} 추가 매수 (분할 매수)`); P.fin = Math.min(100, fin() + 4); } },
          { t: '😱 무서워서 다 판다 (손절)', f: () => { INV.forEach(i => { if (q[i.k] > 0) sell(i); }); log('😱 공포에 모두 팔았다. 손실이 확정됐다 — 다음엔 비상금과 분산이 답이다', 'bad'); } }] });
    }
  }

  /* ---------- 부동산 투자 ---------- */
  const PROP = [
    { k: 'officetel', e: '🏢', n: '오피스텔', price: 160000, rent: .055, grow: .01, d: '월세 수익 위주' },
    { k: 'shop', e: '🏪', n: '상가', price: 380000, rent: .065, grow: 0, vac: .15, d: '수익 높지만 공실 위험' },
    { k: 'apt', e: '🏙️', n: '아파트 (투자용)', price: 520000, rent: .025, grow: .045, d: '시세 차익 위주' },
    { k: 'land', e: '🌾', n: '토지', price: 120000, rent: 0, grow: .05, vol: 2, d: '개발 호재 기대 · 변동 큼' },
  ];
  function openRealty() {
    const props = P.props || [];
    showModal({
      e: '🏘️', t: '부동산', d: `현금 ${usd(P.money)} · 보유 ${props.length}채 · 경기 ${mktWord()} · 대출 LTV 최대 60%`,
      ch: [{ t: '🏠 내가 살 집 구하기', f: () => openHome() },
        ...PROP.map(pr => ({ t: `${pr.e} ${pr.n} 사기`, s: `${usd(M(pr.price))} · ${pr.d}`, f: () => buyProp(pr) })),
        ...props.map((p, i) => ({ t: `💰 ${p.e} ${p.n} 팔기`, s: `시세 ${usd(p.value)} · 대출 ${usd(p.loan)} · 손익 ${usd(p.value - p.paid)}`, f: () => sellProp(i) })),
        { t: '닫기', f: () => { } }],
    });
  }
  function buyProp(pr) {
    const price = M(pr.price), down = Math.round(price * .4);
    if (P.money < down) { log(`${pr.n}: 계약금(40%) ${usd(down)}이 부족해요`, 'bad'); return; }
    const loanOk = bank().credit >= 560, loan = loanOk ? price - Math.min(P.money, price) : 0;
    if (!loanOk && P.money < price) { log('신용점수가 낮아 대출이 안 돼요. 전액 현금이 필요해요', 'bad'); return; }
    const cash = price - loan; P.money -= cash;
    (P.props = P.props || []).push({ k: pr.k, e: pr.e, n: pr.n, value: price, paid: price, loan, rent: pr.rent, grow: pr.grow, vac: pr.vac || 0, vol: pr.vol || 1, since: P.age });
    World.goTo('realty'); Snd.sfx('coin'); playAnim('give');
    log(`🏘️ ${pr.e} ${pr.n} 매입 ${usd(price)} (대출 ${usd(loan)}, 금리 ${rate()}%)`, 'good'); badge('부동산 투자자');
    if (P.props.length >= 3) badge('건물주'); renderStats(); checkBucket();
  }
  function sellProp(i) {
    const p = P.props[i], net = p.value - p.loan, gain = p.value - p.paid;
    P.money += net; P.props.splice(i, 1); fx({ hap: gain > 0 ? 6 : -4 });
    log(`💰 ${p.e} ${p.n} 매도 ${usd(p.value)} → 대출 갚고 ${usd(net)} (차익 ${gain >= 0 ? '+' : ''}${usd(gain)})`, gain >= 0 ? 'good' : 'bad');
  }

  /* ---------- 해마다 ---------- */
  function yearly() {
    if (!P || !P.alive) return;
    const b = bank(), m = market(), r = rate() / 100;
    allowance();
    if (b.save > 0) { const it = Math.round(b.save * (.03 + fin() / 2000)); b.save += it; }
    yearlyPort();
    let interest = Math.round(b.loan * r);
    (P.props || []).forEach(p => {
      const vac = Math.random() < p.vac + (m < 0 ? .1 : 0);
      const rent = vac ? 0 : Math.round(p.value * p.rent); interest += Math.round(p.loan * r);
      p.value = Math.max(Math.round(p.paid * .3), Math.round(p.value * (1 + p.grow + m * .6 * p.vol + (Math.random() - .5) * .06 * p.vol)));
      if (rent) fx({ money: rent }, 1); else if (p.rent) log(`🏚️ ${p.n} 공실… 월세 수입 없음`, 'bad');
    });
    if (interest > 0) {
      if (P.money >= interest) { fx({ money: -interest }, 1); b.credit = Math.min(950, b.credit + 6); }
      else { fx({ money: -interest, hap: -5 }, 1); b.credit = Math.max(300, b.credit - 70); log(`⚠️ 대출 이자를 못 내 연체! 신용점수 ${b.credit}`, 'bad'); }
    }
    if (b.credit < 480 && !P.marks.has('badcredit')) { P.marks.add('badcredit'); log('🚫 신용불량 위기… 빚부터 정리해야 한다', 'bad'); }
    if ((P.props || []).length || b.loan || b.save) { if (P.age % 2 === 0) log(`🏦 올해 경기 ${mktWord()} · 예금 ${usd(b.save)} · 대출 ${usd(b.loan)}${P.props && P.props.length ? ` · 부동산 ${P.props.length}채 ${usd(P.props.reduce((s, p) => s + p.value, 0))}` : ''}`); }
  }
  function worth() { const b = P.bank || { save: 0, loan: 0 }; return b.save - b.loan + (P.port ? pv() : 0) + (P.props || []).reduce((s, p) => s + p.value - p.loan, 0); }

  function extra(list) {
    if (!P || !P.alive) return;
    if (P.age >= 14 && !P.job && P.age < 30) list.push({ e: '💼', n: '알바', f: () => { World.goTo('shop'); openAlba(); }, free: 1 });
    if (P.age >= 12) list.push({ e: '🏦', n: '은행', f: () => { World.goTo('bank'); openBank(); }, free: 1 });
    if (P.age >= 25) list.push({ e: '🏘️', n: '부동산', f: () => { World.goTo('realty'); openRealty(); }, free: 1 });
  }
  function init() {
    // 10대 알바 버튼은 새 알바 메뉴로 대체
    ACTS.teen = ACTS.teen.filter(a => a.n !== '알바');
    // 기존 '투자' 버튼은 은행 투자 메뉴로
    ACTS.adult.forEach(a => { if (a.n === '투자') { a.f = () => openInvest(); a.free = 1; } });
    const _list = actionList; actionList = function () { const l = _list(); extra(l); return l; };
    const _nw = netWorth; netWorth = function () { return _nw() + (P ? worth() : 0); };
    const _age = ageUp; ageUp = function () { const a0 = P && P.age; _age(); if (P && P.age !== a0) yearly(); };
    $('#ageBtn').onclick = () => ageUp();
    if (window.Grow) [['money', { '은행': 4, '부동산': 4, '알바': 5 }], ['study', { '은행': 1 }], ['balance', { '은행': 1.5, '알바': 2 }]]
      .forEach(([k, o]) => { const p = Grow.POL.find(x => x.k === k); if (p) Object.assign(p.act, o); });
  }
  return { init, openAlba, openBank, openInvest, openRealty, borrow, study, yearly, worth, rate, grade, TIPS, PROP };
})();
window.Money = Money;
Money.init();
