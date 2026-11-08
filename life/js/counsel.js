/* =====================================================================
 *  counsel.js — AI 사주상담 (유료)
 *   인생의 갈림길(이직·창업·진학·결혼·이사·투자 …)에서 고민과 선택지를 받으면
 *   ① 사주(대운·올해 세운·좋은 달·타고난 기질) ② MBTI(검사 결과 또는 사주 MBTI)
 *   ③ 인생 게임 엔진(내 생년월일로 태어난 가상 인물이 선택지마다 끝까지 살아 봄)
 *   ④ 내가 해 온 인생 게임 기록 을 묶어 선택지별 적합도와 실행 조언을 드린다.
 *   - 기본: 기기 안에서 계산 (개인정보가 기기 밖으로 나가지 않음)
 *   - AI 서버(Supabase Edge Function → Claude)가 연결돼 있고 로그인했다면, 이름·생년월일 없이
 *     사주 요약·고민만 보내 상담사의 자연어 답변을 덧붙인다 (보내기 전 동의).
 *   - 이용권: 첫 상담 1회 무료 → 이후 상담권(인앱 구매) 또는 카르마 교환
 * ===================================================================== */
window.COUNSEL_CONFIG = window.COUNSEL_CONFIG || { fn: 'saju-counsel' };   // Supabase Edge Function 이름

const Counsel = (() => {
  const CR = 'p8b_counsel_cr', FREE = 'p8b_counsel_free', HIST = 'p8b_counsel_hist';
  const credits = () => store.get(CR, 0) + (store.get(FREE, 0) ? 0 : 1);
  const freeLeft = () => !store.get(FREE, 0);
  // 상담 기준 연도: 11월부터는 다음 해 (토정비결·신년운세와 같은 기준) — 안내와 결과를 한 해로 통일
  const baseYear = () => { const d = new Date(); return d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear(); };
  function useCredit() { if (freeLeft()) { store.set(FREE, 1); return true; } const c = store.get(CR, 0); if (c <= 0) return false; store.set(CR, c - 1); return true; }
  function addCredits(n) { store.set(CR, store.get(CR, 0) + n); }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clampN = v => Math.max(0, Math.min(100, Math.round(v)));

  /* ---------- 고민 주제 · 선택지 분류 ---------- */
  const TOPICS = [
    { k: 'career', e: '💼', n: '진로 · 이직', ex: ['지금 회사에 남는다', '이직한다'] },
    { k: 'biz', e: '🚀', n: '창업 · 독립', ex: ['회사를 다니며 준비한다', '퇴사하고 창업한다'] },
    { k: 'study', e: '📚', n: '공부 · 시험', ex: ['대학원에 진학한다', '바로 취업한다'] },
    { k: 'love', e: '💞', n: '연애 · 결혼', ex: ['올해 결혼한다', '조금 더 기다린다'] },
    { k: 'money', e: '💰', n: '돈 · 투자', ex: ['집을 산다', '전세로 더 모은다'] },
    { k: 'move', e: '🧳', n: '이사 · 해외', ex: ['해외로 나간다', '한국에 남는다'] },
    { k: 'hobby', e: '🎨', n: '취미 · 배움', ex: ['그림을 배운다', '피아노를 배운다'] },
  ];
  // 주제별 실행 조언 (질문과 맞는 조언만)
  const TIPS = {
    career: ['🤝 옮기기 전에 지금 자리에서 바꿀 수 있는 것(역할·연봉·근무 방식)을 먼저 요청해 보세요. 답을 듣고 결정해도 늦지 않아요.', '📋 새 자리의 ‘3년 뒤 내 모습’을 그 회사 사람에게 직접 물어보고, 지금 자리와 나란히 적어 비교해요.'],
    biz: ['🧪 바로 뛰어들기보다 3개월짜리 작은 실험(부업·시제품·주말 운영)으로 수요를 먼저 확인해요.', '💰 수입이 없어도 버틸 생활비 6개월치를 먼저 확보하고 시작 날짜를 정해요.'],
    study: ['📝 합격·수료까지 드는 비용(돈·시간)과 끝난 뒤 얻을 기회를 표로 나란히 적어 보세요.', '⏱️ 2주 동안 매일 같은 시간에 공부해 보고, 그 리듬이 지속 가능한지 먼저 확인해요.'],
    love: ['💬 상대와 “5년 뒤 우리 모습”을 각자 써서 바꿔 읽어 보세요. 차이가 곧 미리 풀어야 할 숙제예요.', '🧭 다툼이 생겼을 때 서로 푸는 방식이 맞는지 한 번 이야기해 보세요. 결정보다 오래가는 기준이 돼요.'],
    money: ['🧮 최악의 경우(금리 +2%, 수입 −20%)에도 버틸 수 있는지 계산한 뒤 결정해요.', '🪜 한 번에 다 하지 말고 나눠서 실행(분할 매수·단계적 이전)할 수 있는지 먼저 찾아보세요.'],
    move: ['🧳 떠나기 전에 그곳에서 2주 이상 살아 보거나, 먼저 다녀온 사람 3명에게 물어보세요.', '🏠 주거·일·언어 중 가장 걱정되는 한 가지를 먼저 해결할 계획을 세워요.'],
    hobby: ['🎟️ 두 가지 모두 원데이 클래스나 한 달 체험 수업으로 먼저 해 보세요. 해 보고 더 기다려지는 쪽이 답이에요.', '🗓️ 일주일에 쓸 수 있는 시간과 비용(수강료·재료비·악기)을 나란히 적어 보고, 3개월 이상 이어 갈 수 있는 쪽을 골라요.'],
  };
  // 사주 5대 운 그룹: 0 독립·경쟁 · 1 재능·표현 · 2 재물 · 3 승진·명예(직장) · 4 학업·귀인 / 5 관계 · 6 이동
  const KW = [
    ['창업', '독립', '사업', '프리랜서', '자영업', '개업', '퇴사', '내 가게', '도전', '스타트업', '경쟁'],
    ['예술', '유튜브', '크리에이터', '디자인', '작가', '음악', '표현', '콘텐츠', '방송', '취미', '글', '그림', '피아노', '악기', '노래', '춤', '사진', '요리', '운동'],
    ['투자', '부동산', '주식', '집을 산', '매수', '코인', '재테크', '연봉', '돈', '모은다', '저축'],
    ['회사', '직장', '승진', '공무원', '대기업', '정규직', '남는다', '취업', '안정', '이직', '다닌다'],
    ['공부', '대학원', '유학', '시험', '자격증', '학위', '박사', '석사', '배운다', '진학', '재수'],
    ['결혼', '연애', '고백', '이별', '헤어', '가족', '아이', '출산', '부모', '화해', '만남', '기다린다'],
    ['이사', '이민', '해외', '이주', '떠난다', '귀농', '지방', '외국'],
  ];
  const GN = ['독립·경쟁', '재능·표현', '재물', '직장·명예', '학업·귀인', '관계·가정', '이동·변화'];
  const POL_OF = ['money', 'art', 'money', 'balance', 'study', 'family', 'balance'];
  const TIE = 5;   // 이 점수 차 이하는 '우열 없음'
  function groupOf(t) {
    let best = -1, bs = 0;
    KW.forEach((ws, g) => { const s = ws.filter(w => t.includes(w)).length; if (s > bs) { bs = s; best = g; } });
    return best;
  }

  /* ---------- 맥락: 사주 · MBTI · 게임 기록 ---------- */
  function ctxOf(p) {
    const a = Hub.analyze(p); if (!a) return null;
    const Y = baseYear(), age = Y - +p.date.slice(0, 4);
    const luck = Saju.luckAt(a, age), nextD = a.dy.find(d => d.age > age);
    const ny = Fortune.newYear(a, Y), ny2 = ny;
    const test = store.get('p8b_mbti_test', null), sm = Fun.mbti(a);
    const set = MbtiTest.settled(test);
    const mbti = set ? { type: set, src: 'MBTI 성향 검사 결과', sure: true }
      : test ? { type: sm.type, src: '성향 검사 결과가 뚜렷하지 않아(반반인 축이 있음) 사주로 본 MBTI를 참고했어요', sure: false }
      : { type: sm.type, src: '사주로 본 MBTI (성향 검사를 하면 더 정확해요)', sure: false };
    const hist = store.get('p8b_hist', []);
    const GV = { S: 5, A: 4, B: 3, C: 2, D: 1 };
    const game = hist.length ? { n: hist.length, avg: (hist.reduce((s, h) => s + (GV[h.grade] || 2), 0) / hist.length), best: hist.reduce((m, h) => (GV[h.grade] || 0) > (GV[m.grade] || 0) ? h : m, hist[0]) } : null;
    const yearG = ny.ts ? ny.ts.g : null;
    return { p, a, age, Y, luck, nextD, ny, ny2, yearG, mbti, game };
  }
  const mbtiTraits = t => ({ E: t[0] === 'E', N: t[1] === 'N', T: t[2] === 'T', J: t[3] === 'J' });

  /* ---------- 선택지 적합도 ---------- */
  function fit(c, g) {
    const a = c.a, m = mbtiTraits(c.mbti.type), why = [];
    let s = 50;
    if (g >= 0 && g <= 4) {
      if (c.luck && c.luck.g === g) { s += 18; why.push(`지금 대운(${c.luck.name})과 같은 방향`); }
      if (c.nextD && c.nextD.g === g && c.nextD.age - c.age <= 4) { s += 8; why.push(`${c.nextD.age}살부터 오는 다음 대운도 같은 흐름`); }
      if (c.yearG === g) { s += 10; why.push(`${c.Y}년 세운이 밀어 주는 분야`); }
      if (a.dom === g) { s += 10; why.push('타고난 사주의 중심 기운과 일치'); }
      if (a.grp && a.grp[g] === 0) { s -= 6; why.push('원국에 없는 기운이라 준비가 더 필요'); }
    }
    if (g === 5) { if (!m.T) { s += 6; why.push('관계를 중시하는 F 성향과 맞음'); } if (c.luck && c.luck.g === 4) { s += 6; why.push('귀인운이 들어오는 시기'); } }
    if (g === 6) { if (c.luck && (c.luck.g === 0 || c.luck.g === 1)) { s += 8; why.push('변화·도전의 대운'); } if (m.N) { s += 4; why.push('새 환경을 즐기는 N 성향'); } }
    if (g === 0) { if (m.E) { s += 5; why.push('밖으로 뻗는 E 성향'); } if (!m.J) { s += 3; why.push('유연한 P 성향'); } else { s -= 2; } }
    if (g === 3 || g === 4) { if (m.J) { s += 5; why.push('계획형 J 성향과 잘 맞음'); } }
    if (g === 2 && m.T) { s += 4; why.push('숫자로 판단하는 T 성향'); }
    if (g === 1 && m.N) { s += 4; why.push('직관형 N 성향'); }
    return { s: clampN(s), why };
  }

  /* ---------- 화면 ---------- */
  let st = { topic: 'career', q: '', opts: ['', ''], res: null, busy: false };
  function pageHTML(p, a) {
    const c = credits(), T = TOPICS.find(t => t.k === st.topic) || TOPICS[0];
    const head = `<div class="hcard cs-hero"><div class="cs-ava">🤖</div><div><b>AI 사주상담</b><small>인생의 갈림길에서 사주 · MBTI · 인생 게임으로 함께 고민해요</small></div></div>`;
    if (st.res) return head + st.res.html + `<div class="hcard"><button class="bigbtn wide" id="csNew">🗂️ 다른 고민 상담하기</button></div>`;
    return head + `<div class="hcard">
      <h3 class="ht">무엇이 고민인가요?</h3>
      <div class="tsel cs-top" id="csTopic">${TOPICS.map(t => `<button data-v="${t.k}" class="${t.k === st.topic ? 'on' : ''}">${t.e} ${t.n}</button>`).join('')}</div>
      <label class="cs-l">상황을 한두 줄로 적어 주세요<textarea id="csQ" maxlength="200" rows="3" placeholder="예: 지금 회사 5년 차인데 스타트업에서 제안이 왔어요. 연봉은 비슷하고 성장 기회가 커요.">${esc(st.q)}</textarea></label>
      <label class="cs-l">선택지 A<input id="csA" maxlength="40" value="${esc(st.opts[0])}" placeholder="예: ${T.ex[0]}"></label>
      <label class="cs-l">선택지 B<input id="csB" maxlength="40" value="${esc(st.opts[1])}" placeholder="예: ${T.ex[1]}"></label>
      <label class="cs-l">선택지 C <small>(선택)</small><input id="csC" maxlength="40" value="${esc(st.opts[2] || '')}" placeholder="비워 두어도 돼요"></label>
      <div id="csErr" class="cs-err"></div>
      <button class="bigbtn wide" id="csGo">🔮 상담 받기 <small>${freeLeft() ? '첫 상담 무료' : c > 0 ? `상담권 ${c}회 남음` : `카르마 ${KARMA}`}</small></button>
      <p class="sjnote">📍 이름·생년월일 같은 개인정보는 이 기기 안에서만 계산해요. 상담 기록도 이 기기에만 남아요.</p></div>
      <div class="hcard cs-what"><h3 class="ht">무엇을 받나요?</h3>
      <div class="cs-tier"><b>📊 기본 분석</b> <small>이 기기 안에서 계산 · 카르마 20이 적용되는 범위 (첫 1회 무료)</small></div>
      <ul><li>🧭 선택지별 <b>적합도</b>와 종합 의견</li><li>🔮 지금 대운 · ${baseYear()}년 세운 · 움직이기 좋은 달</li><li>🧠 MBTI로 본 나의 결정 스타일과 함정</li>
      <li>🎲 내 생년월일로 태어난 가상 인물이 선택지마다 <b>끝까지 살아 본 결과</b> (인생 게임 엔진, 선택지마다 3번)</li><li>✅ 바로 해 볼 실행 조언 3가지</li></ul>
      <div class="cs-tier"><b>🤖 AI 상담사 답변</b> <small>${window.Auth && Auth.ready() ? '선택 · 로그인 후 동의하면 기본 분석을 바탕으로 자연어 답변 (추가 카르마 없음)' : '준비 중 · 서버가 연결되면 로그인 후 받을 수 있어요 (추가 카르마 없음)'}</small></div>
      <div class="cs-price">${pricing()}</div></div>
      ${histHTML()}`;
  }
  function pricing() {
    return `<span>${freeLeft() ? '🎁 첫 상담은 <b>무료</b>예요' : credits() > 0 ? `🎟️ 남은 상담권 <b>${credits()}회</b>` : `✨ 상담 1회 = 카르마 <b>${KARMA}</b>`} · 보유 카르마 ${typeof karma !== 'undefined' ? karma : 0}</span>
      <div class="row2"><button class="ghost" id="csKarma">✨ 카르마 모으기 (광고 +${Karma.AD_K})</button></div>`;
  }
  const KARMA = 20;   // 상담 1회 카르마
  function histHTML() {
    const h = store.get(HIST, []); if (!h.length) return '';
    return `<div class="hcard"><h3 class="ht">지난 상담 (이 기기)</h3>${h.slice(0, 5).map((x, i) => `<button class="cs-past" data-i="${i}"><b>${x.e} ${esc(x.q || x.opts.join(' vs '))}</b><small>${new Date(x.t).toLocaleDateString()} · 추천: ${esc(x.pick)}</small></button>`).join('')}</div>`;
  }
  function bind(p, a, rerender) {
    const r = rerender;
    document.querySelectorAll('#csTopic button').forEach(b => b.onclick = () => { keep(); st.topic = b.dataset.v; Snd.sfx('tap'); r(); });
    const keep = () => { const q = $('#csQ'); if (q) { st.q = q.value.trim(); st.opts = [$('#csA').value.trim(), $('#csB').value.trim(), $('#csC').value.trim()]; } };
    const go = $('#csGo'); if (go) go.onclick = () => { keep(); start(p, r); };
    const n = $('#csNew'); if (n) n.onclick = () => { st.res = null; r(); };
    const by = $('#csBuy'); if (by) by.onclick = () => buy(r);
    const k = $('#csKarma'); if (k) k.onclick = () => Karma.openCharge(Math.max(0, KARMA - karma), 'AI 사주상담', () => r());
    document.querySelectorAll('.cs-past').forEach(b => b.onclick = () => { const x = store.get(HIST, [])[+b.dataset.i]; if (x) openOverlay(`${x.e} 지난 상담`, x.html, [{ t: '닫기' }]); });
    bindResult();
  }
  function buy(r) {
    if (typeof openShop === 'function') { openShop('counsel'); const un = Store.onChange(() => r && r()); }
  }

  /* ---------- 상담 실행 ---------- */
  async function start(p, r) {
    const err = t => { const e = $('#csErr'); if (e) e.textContent = t; Snd.sfx('bad'); };
    const opts = st.opts.filter(Boolean);
    if (opts.length < 2) return err('선택지를 두 개 이상 적어 주세요');
    if (new Set(opts).size !== opts.length) return err('선택지가 서로 같아요');
    if (st.busy) return;
    if (credits() <= 0) { Karma.spend(KARMA, 'AI 사주상담 1회', () => { addCredits(1); start(p, r); }, () => r()); return; }
    const c = ctxOf(p); if (!c) return err('내 정보를 먼저 입력해 주세요');
    st.busy = true;
    openOverlay('🤖 AI 사주상담', `<div class="fk-load"><div class="fk-reel">🔮</div><p id="csStep">사주와 올해 흐름을 살피는 중…</p><div class="fk-bar"><i id="fkBar"></i></div></div>`, []);
    const stepT = t => { const e = $('#csStep'); if (e) e.textContent = t; };
    try {
      const groups = opts.map(groupOf);
      const fits = opts.map((o, i) => fit(c, groups[i]));
      await wait(500); stepT('MBTI로 결정 스타일을 보는 중…'); await wait(400);
      stepT('내 생년월일로 태어난 가상 인물이 선택지마다 살아 보는 중…');
      const birth = { cal: p.cal || 's', y: +p.date.slice(0, 4), m: +p.date.slice(5, 7), d: +p.date.slice(8, 10), hh: p.time ? +p.time.split(':')[0] : 12, mm: p.time ? +p.time.split(':')[1] : 0, unk: !p.time };
      let sims = null;
      const sameField = groups.every(g => g === groups[0]);
      if (!sameField && typeof Fork !== 'undefined' && !Fork.busy && !(P && P.alive && $('#game').classList.contains('on'))) {
        try {
          const raw = await Fork.simulateVirtual({ birth, male: p.sex !== 'f', age: Math.max(1, c.age), q: st.q },
            opts.slice(0, 3).map((t, i) => ({ t, pol: POL_OF[groups[i]] || 'balance', fx: FX[groups[i]] })),
            v => { const b = $('#fkBar'); if (b) b.style.width = Math.round(v * 100) + '%'; });
          if (raw.length === Math.min(3, opts.length)) sims = raw.map(Fork.agg);
        } catch (e) { console.warn('counsel sim', e); }
        if (!sims) console.warn('counsel sim empty');
      }
      const res = compose(c, opts, groups, fits, sims);
      if (!useCredit()) { st.busy = false; closeOverlay(); return; }
      try { Karma.metric('counsel_run'); } catch (e) { }
      st.res = res; st.busy = false;
      const h = store.get(HIST, []); h.unshift({ t: Date.now(), e: (TOPICS.find(t => t.k === st.topic) || {}).e || '🤖', q: st.q, opts, pick: res.best < 0 ? '우열 없음' : opts[res.best], html: res.html }); store.set(HIST, h.slice(0, 10));
      closeOverlay(); Snd.sfx('reveal'); r();
      askAI(c, opts, groups, fits, sims, res);
    } catch (e) { console.warn(e); st.busy = false; closeOverlay(); Hub.toast('상담을 만들지 못했어요. 다시 시도해 주세요'); }
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const FX = [p => { p.money -= Math.round(p.money * .15); p.hap += 3; }, p => { p.hap += 4; }, null, p => { p.hap -= 1; }, p => { p.smart += 4; p.money -= Math.round(p.money * .08); }, p => { p.bond += 6; }, p => { p.hap += 2; p.bond -= 4; }];

  /* ---------- 상담 결과 구성 (기기 안 계산) ---------- */
  const AB = ['A', 'B', 'C'];
  function compose(c, opts, groups, fits, sims) {
    const a = c.a, m = mbtiTraits(c.mbti.type);
    const total = opts.map((o, i) => {
      let s = fits[i].s;
      if (sims && sims[i]) s = Math.round(s * .55 + sims[i].total * .45 + (sims[i].A.joy - 50) * .1);
      return clampN(s);
    });
    const best = total.indexOf(Math.max(...total)), sorted = [...total].sort((x, y) => y - x), tie = sorted[0] - sorted[1] <= TIE;
    const NY = c.ny, L = c.luck, bm = [...NY.best].sort((x, y) => x.yr - y.yr || x.solarM - y.solarM).map(x => `${x.yr !== c.Y ? x.yr + '년 ' : ''}${x.solarM}월`).join('·'), wm = `${NY.worst.yr !== c.Y ? NY.worst.yr + '년 ' : ''}${NY.worst.solarM}월`;
    const gtxt = g => g >= 0 ? GN[g] : '일반';
    const line = tie
      ? `두 길의 적합도가 거의 같아요(${opts.map((o, i) => total[i]).join(' vs ')}). 사주·성향·미리 살아 본 결과로는 <b>우열을 가리기 어려워요</b>. 이럴 땐 어느 쪽이 맞는지보다 <b>내가 더 끌리는 쪽</b>과 아래 실행 조언으로 정하는 것이 좋아요.`
      : `종합하면 <b>‘${esc(opts[best])}’</b> 쪽이 지금의 당신에게 조금 더 잘 맞아요(${sorted[0]} vs ${sorted[1]}). ${fits[best].why[0] ? fits[best].why[0] + '이고, ' : ''}${sims && sims[best] ? `가상 인생에서도 「${sims[best].type}」으로 더 좋은 평가를 받았어요.` : '흐름이 받쳐 주는 시기예요.'}`;
    const mtip = (m.J ? '계획형(J)이라 결정 뒤 흔들리지 않는 대신, 정보가 부족해도 빨리 결론을 내리는 함정이 있어요. 결정 기한을 일부러 2주 늦춰 보세요.' : '유연형(P)이라 기회를 잘 잡지만, 마지막까지 선택을 미루다 좋은 시기를 놓치기 쉬워요. 결정할 날짜를 먼저 정해 두세요.')
      + ' ' + (m.T ? '논리(T)로 판단하니 조건·숫자만 보다 마음의 만족을 놓치지 않게 "1년 뒤 나는 행복한가?"를 같이 물어보세요.' : '감정(F)을 중시하니 주변의 기대보다 내 마음이 끌리는 쪽을 따로 적어 보세요. 의외로 답이 빨리 나와요.');
    const tips = TIPS[st.topic] || TIPS.career;
    const acts = [
      ...tips,
      `📅 시작하기 좋은 달: <b>${bm}</b> · <b>${wm}</b>은 서두르지 말고 점검하는 달이에요.`,
      `🌱 개운 습관: ${a.dm.개운} — 부족한 기운(${SAJU.EK[a.weak]})을 채우면 결정 뒤의 실행력이 좋아져요.`,
    ];
    const KS = Fork.KS || ['wealth', 'bond', 'health', 'achieve', 'joy'];
    const simHTML = !sims && groups.every(g => g === groups[0]) ? `<div class="hcard"><h3 class="ht">🎲 인생 게임 시뮬레이션</h3><p class="cs-p">두 선택이 같은 분야(${gtxt(groups[0])})라 인생 전체의 큰 흐름은 비슷하게 나와요. 그래서 이번에는 가상 인생 비교를 생략했어요.</p></div>` : sims ? `<div class="hcard"><h3 class="ht">🎲 인생 게임으로 미리 살아 본 결과</h3>
      <p class="sjnote">${c.p.name ? esc(c.p.name) + '님과' : '나와'} 같은 생년월일·시간으로 태어난 가상 인물을 지금 나이(${c.age}살)까지 키운 뒤, 선택지마다 3번씩 끝까지 살아 봤어요.</p>
      <div class="fk-cmp"><div class="fk-cmph"><span></span>${opts.slice(0, 3).map((o, i) => `<b>${AB[i]}</b>`).join('')}</div>
      ${KS.map(k => { const mx = Math.max(...sims.map(r => r.A[k])); return `<div class="fk-row"><span>${EVAL_N[k][0]} ${EVAL_N[k][1]}</span>${sims.map(r => `<i class="${r.A[k] === mx && sims.length > 1 ? 'win' : ''}"><em style="width:${r.A[k]}%"></em><small>${r.A[k]}</small></i>`).join('')}</div>`; }).join('')}</div>
      ${sims.map((r, i) => `<div class="cs-sim"><b>${AB[i]} · ${esc(opts[i])}</b> → ${r.grade}등급 「${r.type}」 · 10년 뒤 ${r.alive10 ? `${usd(r.money10)} · 행복 ${r.hap10}` : '—'}</div>`).join('')}
      <p class="sjnote">게임 속 인생은 재미로 보는 가상 실행이에요. 실제 직업·자산은 반영되지 않아요.</p></div>` : '';
    const html = `<div class="cs-badge">📊 기본 분석 · 이 기기 안에서 계산 · ${c.Y}년 기준</div><div class="hcard cs-res"><div class="cs-q">“${esc(st.q || opts.join(' vs '))}”</div>
      <h3 class="ht">🧭 종합 의견</h3><p class="cs-line">${line}</p>
      <div class="cs-opts">${opts.map((o, i) => `<div class="cs-opt${i === best && !tie ? ' best' : ''}"><div class="cs-oh"><b>${AB[i]}</b><span>${esc(o)}</span><em>${total[i]}</em></div>
        <div class="cs-ob"><i style="width:${total[i]}%"></i></div><small>${gtxt(groups[i])} 분야 · ${fits[i].why.slice(0, 2).join(' · ') || '사주에서 특별히 막거나 미는 기운은 없어요'}</small></div>`).join('')}</div></div>
      <div class="hcard"><h3 class="ht">🔮 사주로 본 지금</h3>
        <p class="cs-p"><b>${L.e} 지금 대운: ${L.name}</b> (${L.start}살~) — ${L.desc}</p>
        ${c.nextD ? `<p class="cs-p">⏭️ ${c.nextD.age}살부터는 ${c.nextD.g === L.g ? `<b>${Saju.GRPN[c.nextD.g]}</b> 흐름이 한 번 더 이어져요.` : `<b>${Saju.GRPN[c.nextD.g]}</b>으로 바뀌어요.`}</p>` : ''}
        <p class="cs-p">📆 ${NY.year}년(${NY.gzTxt}년) 움직이기 좋은 달 <b>${bm}</b> · 조심할 달 <b>${wm}</b></p>
        <p class="cs-p">🌿 타고난 기질: ${a.dm.nm} — ${a.dm.key}</p></div>
      <div class="hcard"><h3 class="ht">🧠 ${c.mbti.sure ? 'MBTI' : '사주로 본 MBTI'}로 본 결정 스타일 · ${c.mbti.type}</h3><p class="cs-p">${mtip}</p><p class="sjnote">기준: ${c.mbti.src}</p></div>
      ${simHTML}
      <div class="hcard"><h3 class="ht">✅ 바로 해 볼 일</h3>${acts.map(x => `<p class="cs-p">${x}</p>`).join('')}
      ${c.game ? `<p class="sjnote">🎮 지금까지 인생 게임 ${c.game.n}판 · 최고 「${esc(c.game.best.title)}」(${c.game.best.grade}) — 게임 속에서도 선택의 결과를 비교해 보세요.</p>` : ''}</div>
      <div id="csAI"></div>
      <p class="sjnote" style="text-align:center">※ 명리 이론과 게임 시뮬레이션을 바탕으로 한 참고·재미용 상담이에요. 건강·법률·투자처럼 중요한 결정은 전문가와 꼭 상의하세요.</p>`;
    return { html, best: tie ? -1 : best, total, tie };
  }
  function bindResult() {
    const b = $('#csAIgo'); if (b) b.onclick = () => sendAI();
  }

  /* ---------- AI 서버 답변 (선택: 연결돼 있을 때만) ---------- */
  let pendingAI = null;
  function aiReady() { return !!(window.Auth && Auth.ready() && Auth.user()); }
  function askAI(c, opts, groups, fits, sims, res) {
    const box = $('#csAI'); if (!box) return;
    if (!(window.Auth && Auth.ready())) { box.innerHTML = `<div class="hcard cs-ai off"><h3 class="ht">🤖 AI 상담사 답변 <small>준비 중</small></h3><p class="sjnote" style="margin:0">위 결과는 <b>기본 분석</b>(이 기기 안에서 계산)이에요. AI 상담사가 자연어로 풀어 주는 답변은 서버 연결 뒤 로그인하면 받을 수 있고, 추가 카르마는 들지 않아요.</p></div>`; return; }
    pendingAI = {
      topic: st.topic, question: st.q, options: opts,
      saju: { dayMaster: c.a.dm.nm, nature: c.a.dm.key, elements: c.a.el, weak: SAJU.EK[c.a.weak], luckNow: c.luck.name, luckNext: c.nextD ? Saju.GRPN[c.nextD.g] : null, goodMonths: c.ny.best.map(x => x.solarM), cautionMonth: c.ny.worst.solarM },
      mbti: c.mbti.type, ageBand: Math.floor(c.age / 10) * 10 + '대',
      scores: res.total, sims: sims ? sims.map(r => ({ grade: r.grade, type: r.type, A: r.A })) : null,
    };
    box.innerHTML = `<div class="hcard cs-ai"><h3 class="ht">🤖 AI 상담사에게 더 물어보기</h3>
      <p class="sjnote">AI 상담사가 위 결과를 자연스러운 말로 풀어 드려요. 서버로는 <b>이름·생년월일 없이</b> 사주 요약(일간·오행·대운)·MBTI·나이대·고민 내용만 보내고, 서버에 저장하지 않아요.</p>
      <button class="bigbtn wide" id="csAIgo">${aiReady() ? '동의하고 AI 답변 받기' : '로그인하고 AI 답변 받기'}</button></div>`;
    bindResult();
  }
  async function sendAI() {
    const box = $('#csAI'); if (!box || !pendingAI) return;
    if (!aiReady()) { if (typeof Hub.openLogin === 'function') Hub.openLogin(); else Hub.toast('오른쪽 위에서 로그인해 주세요'); return; }
    box.innerHTML = `<div class="hcard cs-ai"><h3 class="ht">🤖 AI 상담사</h3><p class="cs-p cs-typing">답변을 쓰는 중…</p></div>`;
    try {
      const cl = await Auth.client();
      const { data, error } = await cl.functions.invoke(COUNSEL_CONFIG.fn, { body: pendingAI });
      if (error || !data || !data.reply) throw new Error((error && error.message) || 'no reply');
      box.innerHTML = `<div class="hcard cs-ai"><h3 class="ht">🤖 AI 상담사</h3>${String(data.reply).split(/\n{2,}/).map(t => `<p class="cs-p">${esc(t).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
    } catch (e) {
      box.innerHTML = `<div class="hcard cs-ai"><h3 class="ht">🤖 AI 상담사</h3><p class="cs-p">지금은 AI 상담 서버에 연결하지 못했어요. 위의 상담 결과는 그대로 이용할 수 있어요.</p></div>`;
    }
  }

  /* ---------- 인생 게임 갈림길에서 바로 상담 ---------- */
  function forGame(ev, R) {
    if (!P || !P.saju) return '';
    const luck = Saju.luckAt(P.saju, P.age), opts = ev.ch.slice(0, R.length).map(x => String(x.t).replace(/<[^>]+>/g, '').trim());
    const sc = R.map((r, i) => { const g = groupOf(opts[i]); let s = r.total; if (g >= 0 && g <= 4 && luck && luck.g === g) s += 8; if (g >= 0 && g <= 4 && P.saju.dom === g) s += 5; return clampN(s); });
    const b = sc.indexOf(Math.max(...sc));
    return `<div class="cs-game"><b>🤖 AI 사주상담 한마디</b><p>${P.name}의 지금 대운은 <b>${luck.e} ${luck.name}</b>. ${luck.desc} 사주 흐름과 미리 살아 본 결과를 함께 보면 <b>${AB[b]} · ${opts[b]}</b> 쪽이 조금 더 맞아요.</p>
      <small>실제 내 인생의 고민은 홈 → 🤖 AI 사주상담에서 물어볼 수 있어요.</small></div>`;
  }

  function init() {
    Hub.register({
      item: { k: 'counsel', g: 'saju', c: 'mint', ic: 'spark', e: '🤖', n: 'AI 사주상담', d: '인생의 갈림길, 사주 · MBTI · 인생 게임으로 상담', need: 1, f: () => Hub.go('counsel') },
      after: 'tojeong', title: 'AI 사주상담',
      html: pageHTML, bind: (p, a) => bind(p, a, () => Hub.render()),
    });
  }
  return { init, credits, addCredits, forGame, ctxOf, groupOf };
})();
Counsel.init();
