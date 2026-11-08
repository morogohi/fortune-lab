/* =====================================================================
 *  fun.js — 재미 테스트: 사주 바람기 테스트 · 사주 MBTI
 *   모두 만세력으로 세운 사주(도화살·홍염살·십성·합충·오행·음양)로 계산합니다.
 *   같은 사주면 언제나 같은 결과가 나와요. 참고·재미용입니다.
 * ===================================================================== */
const Fun = (() => {
  const S = window.SAJU;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cl = (v, a = 5, b = 95) => Math.max(a, Math.min(b, Math.round(v)));

  /* ---------- 공통: 십성(정·편 구분) · 음양 · 오행 집계 ---------- */
  function detail(a) {
    const me = a.me, cols = [['년', a.p.y], ['월', a.p.m], ['일', a.p.d], ['시', a.p.h]].filter(x => x[1]);
    const ten = {}, add = n => ten[n] = (ten[n] || 0) + 1;
    let yang = 0, yin = 0;
    cols.forEach(([lab, c]) => {
      if (lab !== '일') add(S.tg10(me, c.s).n);
      add(S.tg10(me, S.HID[c.b]).n);
      (c.s % 2 ? yin++ : yang++); (c.b % 2 ? yin++ : yang++);
    });
    const g = n => ten[n] || 0;
    return { ten, g, yang, yin, el: a.el, cols, branches: cols.map(x => x[1].b) };
  }

  /* =========================== 바람기 테스트 =========================== */
  // 도화살: 년지·일지 삼합의 '목욕' 자리 (申子辰→酉, 寅午戌→卯, 巳酉丑→午, 亥卯未→子)
  const DOHWA = b => [9, 6, 3, 0][[[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]].findIndex(s => s.includes(b))];
  // 홍염살: 일간 기준 (甲午 乙午 丙寅 丁未 戊辰 己辰 庚戌 辛酉 壬子 癸申)
  const HONG = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
  const HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]], CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  const isPair = (ps, x, y) => ps.some(([p, q]) => (p === x && q === y) || (p === y && q === x));

  function flirt(a, male) {
    const d = detail(a), g = d.g, br = d.branches, why = [];
    const dSet = new Set([DOHWA(a.p.y.b), DOHWA(a.p.d.b)]);
    const dohwa = br.filter(b => dSet.has(b)).length;
    const hong = br.includes(HONG[a.me]) ? 1 : 0;
    const sik = g('식신') + g('상관');
    const fire = a.el[1];
    // ① 이성에게 끌리는 매력(인기)
    let charm = 30 + dohwa * 16 + hong * 14 + sik * 6 + fire * 4 + (a.el[0] >= 3 ? 4 : 0);
    if (dohwa) why.push(['🌸', '도화살', `${S.BR[[...dSet].find(x => br.includes(x))]}이(가) 사주에 ${dohwa}개 — 사람을 끌어당기는 '꽃'의 기운`]);
    if (hong) why.push(['💋', '홍염살', `일간 ${S.ST[a.me]}에 ${S.BR[HONG[a.me]]}이(가) 있어 은근한 색기·분위기 미인`]);
    if (sik >= 2) why.push(['🎤', '식상 발달', `식신·상관 ${sik}개 — 말솜씨와 표현력이 매력 포인트`]);
    // ② 마음이 흔들리는 정도(바람기)
    const lover = male ? { a: '편재', b: '정재', n: '재성(남성에게 이성)' } : { a: '편관', b: '정관', n: '관성(여성에게 이성)' };
    const many = g(lover.a) + g(lover.b);
    let swing = 22 + g(lover.a) * 11 + g(lover.b) * 5 + g('상관') * 6 + dohwa * 7;
    if (many >= 3) why.push(['💞', `${lover.n} 많음`, `${lover.a} ${g(lover.a)} · ${lover.b} ${g(lover.b)} — 이성 인연이 자주 들어오는 구조`]);
    else if (many === 0) why.push(['🧊', `${lover.n} 없음`, '이성 인연이 드물게 오지만 한번 오면 오래 가는 편']);
    const dzHap = br.filter((b, i) => d.cols[i][0] !== '일' && isPair(HAP6, a.p.d.b, b)).length;
    const dzChung = br.filter((b, i) => d.cols[i][0] !== '일' && isPair(CHUNG, a.p.d.b, b)).length;
    if (dzHap) { swing += dzHap * 8; why.push(['🤝', '배우자 자리 합', `일지 ${S.BR[a.p.d.b]}가 다른 지지와 합 — 정에 약하고 마음이 잘 열려요`]); }
    if (dzChung) { swing += dzChung * 7; why.push(['⚡', '배우자 자리 충', `일지 ${S.BR[a.p.d.b]}가 충을 맞아 — 연애에 변화와 자극을 찾는 편`]); }
    // 지키는 힘: 정관·정인·토(신의)
    const guard = g('정관') * 5 + g('정인') * 6 + (a.el[2] >= 3 ? 6 : 0);
    if (guard >= 10) why.push(['🛡️', '지키는 힘', '정관·정인·토 기운이 받쳐 줘 — 약속을 지키는 의리파']);
    swing -= guard;
    charm = cl(charm); swing = cl(swing);
    // 유형
    let t;
    if (charm >= 60 && swing < 45) t = { e: '💎', n: '인기 많은 순정파', d: '다가오는 사람은 많지만 마음은 한 사람에게만. 의외로 철벽이라 상대가 애태우는 타입이에요.', tip: '마음을 표현하는 데 인색하지 않기. 상대는 내 확신을 기다리고 있어요.' };
    else if (charm >= 60) t = { e: '🦋', n: '자유로운 연애 영혼', d: '어디서든 눈에 띄고 새로운 설렘에 마음이 잘 움직여요. 연애가 즐겁지만 그만큼 오해도 많이 받는 타입.', tip: '애매한 친절은 오해의 씨앗! 연애 중일 땐 선을 분명히 하면 매력이 신뢰로 바뀌어요.' };
    else if (swing >= 47) t = { e: '💘', n: '금사빠 로맨티스트', d: '작은 친절에도 마음이 쿵! 사랑에 빠지는 속도가 빠르고 감정이 솔직한 타입이에요.', tip: '설렘과 확신은 달라요. 세 번 만나 본 뒤 마음을 정해 보세요.' };
    else if (swing < 30 && charm < 45) t = { e: '🌲', n: '일편단심 소나무', d: '쉽게 흔들리지 않고 한번 정한 사람을 오래 지키는 타입. 연애 속도는 느려도 깊이는 최고예요.', tip: '너무 신중하면 인연이 지나가요. 관심 있는 사람에겐 먼저 작은 신호를!' };
    else t = { e: '🎯', n: '밀당의 고수', d: '다가갈 때와 물러설 때를 아는 타입. 적당한 거리감이 매력이라 상대가 계속 궁금해해요.', tip: '밀당도 적당히! 중요한 순간엔 솔직함이 최고의 기술이에요.' };
    const idx = cl(charm * .45 + swing * .55, 3, 99);
    // 앞으로 10년, 도화 기운이 들어오는 해
    const now = new Date().getFullYear(), years = [];
    for (let y = now; y < now + 10; y++) if (dSet.has(S.yearGz(y).b)) years.push(y);
    return { charm, swing, idx, t, why, years, dohwa, hong };
  }

  /* ============================ 사주 MBTI ============================ */
  const MBTI = {
    ISTJ: ['원칙의 수호자', '맡은 일은 끝까지, 약속은 반드시. 믿고 맡길 수 있는 사람이에요.'],
    ISFJ: ['다정한 지킴이', '조용히 주변을 챙기고 작은 것도 기억해 주는 따뜻한 사람이에요.'],
    INFJ: ['깊은 통찰가', '사람의 속마음을 잘 읽고, 의미 있는 일에 마음을 쏟는 사람이에요.'],
    INTJ: ['전략 설계자', '큰 그림을 그리고 혼자서도 계획을 끝까지 밀고 가는 사람이에요.'],
    ISTP: ['만능 해결사', '말보다 손이 먼저. 문제가 생기면 조용히 고쳐 놓는 실전파예요.'],
    ISFP: ['감성 예술가', '자기만의 취향과 감성이 뚜렷하고, 지금 이 순간을 즐길 줄 알아요.'],
    INFP: ['이상주의 몽상가', '마음속에 큰 세계가 있고, 진심과 가치를 무엇보다 중요하게 여겨요.'],
    INTP: ['호기심 탐구자', '왜?를 끝까지 파고드는 생각의 달인. 아이디어가 끊이지 않아요.'],
    ESTP: ['행동파 승부사', '일단 해 보고 생각하는 타입. 순발력과 배짱이 최고예요.'],
    ESFP: ['분위기 메이커', '어디서든 무대의 주인공. 사람들을 즐겁게 하는 재주가 있어요.'],
    ENFP: ['열정 아이디어 뱅크', '새로운 것에 금방 빠지고 사람들에게 에너지를 나눠 주는 타입이에요.'],
    ENTP: ['재치 있는 도전자', '토론과 새로운 시도를 즐기고, 판을 뒤집는 아이디어를 내요.'],
    ESTJ: ['추진력 있는 관리자', '일을 체계적으로 정리하고 결과를 확실하게 만들어 내는 리더예요.'],
    ESFJ: ['모두의 살림꾼', '사람들 사이를 이어 주고 분위기를 챙기는 다정한 중심이에요.'],
    ENFJ: ['따뜻한 리더', '사람의 가능성을 믿고 이끌어 주는, 말에 힘이 있는 사람이에요.'],
    ENTJ: ['타고난 지휘관', '목표가 정해지면 사람과 자원을 움직여 끝내 이루어 내는 타입이에요.'],
  };
  function mbti(a) {
    const d = detail(a), g = d.g, el = a.el, why = {};
    // E/I: 양 기운·비겁·식상·재성은 밖으로, 음 기운·인성은 안으로
    const E = d.yang * 6 + (g('비견') + g('겁재')) * 5 + (g('식신') + g('상관')) * 6 + (g('편재') + g('정재')) * 3 + el[1] * 4;
    const I = (d.yin * 6 + (g('편인') + g('정인')) * 7 + el[4] * 4 + g('정관') * 3) * 1.22;
    why.EI = `양 ${d.yang} : 음 ${d.yin} · 비겁·식상 ${g('비견') + g('겁재') + g('식신') + g('상관')} vs 인성 ${g('편인') + g('정인')}`;
    // S/N: 토·금·재성은 현실 감각, 목·수·인성·상관은 직관
    const Sx = (el[2] + el[3]) * 7 + (g('편재') + g('정재')) * 6 + g('식신') * 3;
    const N = ((el[0] + el[4]) * 7 + (g('편인') + g('정인')) * 5 + g('상관') * 5) * 1.25;
    why.SN = `토·금 ${el[2] + el[3]} vs 목·수 ${el[0] + el[4]} · 재성 ${g('편재') + g('정재')} vs 인성·상관 ${g('편인') + g('정인') + g('상관')}`;
    // T/F: 금·관성·편재는 논리, 화·목·식신·정인은 감정
    const T = el[3] * 8 + (g('편관') + g('정관')) * 6 + g('편재') * 4 + g('상관') * 2;
    const F = (el[1] + el[0]) * 6 + g('식신') * 6 + g('정인') * 6;
    why.TF = `금 ${el[3]} · 관성 ${g('편관') + g('정관')} vs 화·목 ${el[1] + el[0]} · 식신·정인 ${g('식신') + g('정인')}`;
    // J/P: '정' 계열(정관·정인·정재)·토는 계획, '편' 계열(편관·편인·편재·상관)은 즉흥
    const J = (g('정관') + g('정인') + g('정재')) * 8 + el[2] * 5 + g('식신') * 3;
    const P = (g('편관') + g('편인') + g('편재') + g('상관')) * 8 + el[4] * 3 + el[1] * 3;
    why.JP = `정관·정인·정재 ${g('정관') + g('정인') + g('정재')} vs 편관·편인·편재·상관 ${g('편관') + g('편인') + g('편재') + g('상관')}`;
    const pct = (x, y) => Math.round((x + 4) / (x + y + 8) * 100);   // 0개일 때도 50%에 가깝게
    // 동점이면 일간 음양으로 결정
    const ax = [['E', 'I', pct(E, I)], ['S', 'N', pct(Sx, N)], ['T', 'F', pct(T, F)], ['J', 'P', pct(J, P)]]
      .map(([x, y, p]) => ({ x, y, p, pick: p > 50 ? x : p < 50 ? y : (a.me % 2 ? y : x) }));
    const type = ax.map(o => o.pick).join('');
    return { type, ax, why, info: MBTI[type] };
  }
  function matchMbti(saju, real) {
    if (!real) return null;
    const same = [...real].filter((c, i) => c === saju[i]).length;
    const word = ['사주로 본 기질과 지금 모습이 많이 달라 보여요 — 경험이 성향을 바꿨을 수 있어요', '사주와 꽤 다른 모습이 보여요 — 어느 쪽도 틀린 건 아니에요', '타고난 것과 만들어 간 것이 섞여 있는 것으로 보여요', '사주로 본 기질과 비슷한 편으로 보여요 (참고용)', '사주로 본 유형과 같게 나왔어요 — 재미로 참고하세요'][same];
    return { same, pct: same * 25, word };
  }

  /* ============================== 화면 ============================== */
  function targets() {
    const me = Hub.me(), list = [];
    if (me && me.date) list.push({ ...me, self: 1 });
    Hub.people().forEach(q => list.push(q));
    return list;
  }
  function chips(list, cur, kind) {
    return `<div class="fchips">${list.map((q, i) => `<button data-t="${i}" class="${i === cur ? 'on' : ''}">${q.self ? '🙋 나' : esc(q.name)}</button>`).join('')}</div>`;
  }
  function bar(l, r, p, cl1, cl2) {
    return `<div class="fax"><b class="${p >= 50 ? 'on' : ''}">${l}</b><i><i style="width:${p}%;background:${cl1}"></i><i style="width:${100 - p}%;background:${cl2}"></i></i><b class="${p < 50 ? 'on' : ''}">${r}</b></div>`;
  }

  function openFlirt(idx = 0) {
    const list = targets(); if (!list.length) { Hub.toast('먼저 내 생년월일을 입력해 주세요'); return; }
    const q = list[idx], a = Hub.analyze(q); if (!a) return;
    const f = flirt(a, q.sex !== 'f'), who = q.self ? '나' : esc(q.name);
    Snd.sfx('love');
    openOverlay('💘 사주 바람기 테스트', `${chips(list, idx)}
      <div class="fhero"><div class="fmeter" style="--v:${f.idx}"><b>${f.idx}</b><small>바람기 지수</small></div>
        <div><span class="ftype">${f.t.e} ${f.t.n}</span><p>${f.t.d}</p></div></div>
      <div class="fbox">${bar('💐 인기', '', f.charm, 'var(--look)', '#ffffff14')}<small class="fval">이성을 끌어당기는 힘 ${f.charm}</small>
        ${bar('🌀 흔들림', '', f.swing, 'var(--hp)', '#ffffff14')}<small class="fval">마음이 흔들리는 정도 ${f.swing}</small></div>
      <div class="sjtxt"><h4>🔍 ${who}의 사주에서 찾은 근거</h4>
        ${f.why.length ? f.why.map(w => `<p>${w[0]} <b>${w[1]}</b> · ${w[2]}</p>`).join('') : '<p>눈에 띄는 연애 신살이 없는 담백한 사주예요. 인연은 생활 속에서 천천히 와요.</p>'}
        <h4>📅 이성 인연이 몰리는 해 (도화의 해)</h4><p>${f.years.length ? f.years.map(y => `<b>${y}년</b>`).join(' · ') + ' — 새로운 만남이 많아지는 시기예요.' : '앞으로 10년 안엔 도화의 해가 없어요. 대신 꾸준한 인연이 와요.'}</p>
        <h4>💡 연애 조언</h4><p>${f.t.tip}</p></div>
      <p class="sjnote" style="text-align:center">※ 도화살·홍염살·십성·일지 합충으로 계산한 재미용 테스트예요. 실제 사람의 마음과 행동은 사주로 정해지지 않아요.</p>`,
      [{ t: '📤 결과 공유하기', pri: 1, keep: 1, f: () => share(`💘 사주 바람기 테스트\n${who}: ${f.t.e} ${f.t.n} (바람기 지수 ${f.idx})\n인기 ${f.charm} · 흔들림 ${f.swing}\n\n운명 연구소에서 내 바람기 확인하기`) },
       { t: '🧩 사주 MBTI도 보기', f: () => openMbti(idx) }, { t: '닫기' }]);
    bindChips(openFlirt);
  }

  function openMbti(idx = 0, real) {
    const list = targets(); if (!list.length) { Hub.toast('먼저 내 생년월일을 입력해 주세요'); return; }
    const q = list[idx], a = Hub.analyze(q); if (!a) return;
    const m = mbti(a), who = q.self ? '나' : esc(q.name);
    const saved = store.get('p8b_mbti', {}), key = q.date + q.name;
    real = real !== undefined ? real : saved[key] || '';
    const mt = matchMbti(m.type, real);
    const cols = [['var(--hap)', 'var(--smart)'], ['var(--money)', 'var(--look)'], ['var(--smart)', 'var(--bond)'], ['var(--accent)', 'var(--hp)']];
    const nm = { E: '외향', I: '내향', S: '감각', N: '직관', T: '사고', F: '감정', J: '판단', P: '인식' };
    Snd.sfx('reveal');
    openOverlay('🧩 사주 MBTI', `${chips(list, idx)}
      <div class="mhero"><small>${who}의 사주가 말하는 성격 유형</small><div class="mtype">${[...m.type].map((c, i) => `<span style="animation-delay:${i * .12}s">${c}</span>`).join('')}</div>
        <b>${m.info[0]}</b><p>${m.info[1]}</p></div>
      <div class="fbox">${m.ax.map((o, i) => bar(`${o.x} ${nm[o.x]}`, `${nm[o.y]} ${o.y}`, o.p, cols[i][0], cols[i][1])).join('')}</div>
      <div class="sjtxt"><h4>🔍 이렇게 계산했어요</h4>
        <p><b>E/I</b> 양·비겁·식상은 바깥으로, 음·인성은 안으로 — ${m.why.EI}</p>
        <p><b>S/N</b> 토·금·재성은 현실 감각, 목·수·인성·상관은 직관 — ${m.why.SN}</p>
        <p><b>T/F</b> 금·관성은 논리, 화·목·식신·정인은 공감 — ${m.why.TF}</p>
        <p><b>J/P</b> '정' 계열 십성은 계획, '편' 계열 십성은 즉흥 — ${m.why.JP}</p>
        <h4>🪞 실제 MBTI와 비교하기</h4>
        <select id="fReal"><option value="">실제 MBTI 고르기</option>${Object.keys(MBTI).map(k => `<option${k === real ? ' selected' : ''}>${k}</option>`).join('')}</select>
        ${mt ? `<div class="fmatch"><b>${mt.pct}%</b> 일치 · ${mt.word}</div>` : ''}</div>
      <p class="sjnote" style="text-align:center">※ 오행·음양·십성을 MBTI 네 축에 대응시킨 운명 연구소의 재미용 모델이에요. 공식 MBTI 검사가 아니에요.</p>`,
      [{ t: '📤 결과 공유하기', pri: 1, keep: 1, f: () => share(`🧩 사주 MBTI\n${who}: ${m.type} · ${m.info[0]}\n${m.ax.map(o => `${o.pick} ${o.pick === o.x ? o.p : 100 - o.p}%`).join(' · ')}${mt ? `\n실제 ${real}와 ${mt.pct}% 일치` : ''}\n\n운명 연구소에서 내 사주 MBTI 확인하기`) },
       { t: '💘 바람기 테스트도 보기', f: () => openFlirt(idx) }, { t: '닫기' }]);
    bindChips(i => openMbti(i));
    $('#fReal').onchange = e => { const s = store.get('p8b_mbti', {}); s[key] = e.target.value; store.set('p8b_mbti', s); openMbti(idx, e.target.value); };
  }
  function bindChips(fn) { document.querySelectorAll('.fchips [data-t]').forEach(b => b.onclick = () => { Snd.sfx('tap'); fn(+b.dataset.t); }); }
  async function share(text) { try { const r = await Native.share(text); if (r === 'copied') Hub.toast('결과를 복사했어요'); } catch (e) {} }

  return { flirt, mbti, openFlirt, openMbti, MBTI };
})();
window.Fun = Fun;
