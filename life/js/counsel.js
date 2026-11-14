/* =====================================================================
 *  counsel.js — AI 사주상담 (대화형 · 질문 1개마다 카르마, 처음 1개 무료)
 *   ▸ AI 대화 모드: 로그인 + 서버(Supabase Edge Function → Claude) 연결 시, 이름·생년월일 없이
 *     사주 요약 + 대화 내용을 보내 자연스러운 대화로 답함 (보내기 전 1회 동의)
 *   ▸ 기기 안 상담 모드: 서버가 없거나 실패하면 이 기기에서 사주(대운·세운·좋은 달)·MBTI·주제·선택지를
 *     분석해 상담사 말투로 답하고, 다음 질문을 이어 가도록 되물음 (API 없이 동작)
 *   (아래는 예전 '갈림길 비교' 계산 — 기기 안 상담의 선택지 비교에 그대로 씀)
 *   인생의 갈림길(이직·창업·진학·결혼·이사·투자 …)에서 고민과 선택지를 받으면
 *   ① 사주(대운·올해 세운·좋은 달·타고난 기질) ② MBTI(검사 결과 또는 사주 MBTI)
 *   ③ 인생 게임 엔진(내 생년월일로 태어난 가상 인물이 선택지마다 끝까지 살아 봄)
 *   ④ 내가 해 온 인생 게임 기록 을 묶어 선택지별 적합도와 실행 조언을 드린다.
 *   - 기본: 기기 안에서 계산 (개인정보가 기기 밖으로 나가지 않음)
 *   - AI 서버(Supabase Edge Function → Claude)가 연결돼 있고 로그인했다면, 이름·생년월일 없이
 *     사주 요약·고민만 보내 상담사의 자연어 답변을 덧붙인다 (보내기 전 동의).
 *   ▸ 두 가지 상담: 💬 대화 상담 · 🧭 선택 상담(고민 + 선택지 A/B/C → 선택지별 상세 비교 풀이)
 *   - 요금: 질문(대화 1개 · 선택 상담 1회)마다 카르마 STORE_CONFIG.counsel.perQ, 처음 1개 무료. 상담권은 없앰
 *     (예전 상담권이 남아 있으면 실제 서비스 모드에서 1장당 카르마 5로 한 번 돌려줌)
 * ===================================================================== */
window.COUNSEL_CONFIG = window.COUNSEL_CONFIG || { fn: 'saju-counsel' };   // Supabase Edge Function 이름

const Counsel = (() => {
  const CR = 'p8b_counsel_cr', FREE = 'p8b_counsel_free', HIST = 'p8b_counsel_hist';
  const credits = () => store.get(FREE, 0) ? 0 : 1;   // 남은 무료 질문 수 (상담권은 없앰)
  const freeLeft = () => !store.get(FREE, 0);
  // 상담 기준 연도: 11월부터는 다음 해 (토정비결·신년운세와 같은 기준) — 안내와 결과를 한 해로 통일
  const baseYear = () => { const d = new Date(); return d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear(); };
  function addCredits() { }   // 상담권 없앰 (예전 호출 호환용)
  // 예전 상담권 정리: 실제 서비스 모드에서는 1장당 카르마 5로 돌려주고, 테스트 모드에서는 그냥 지움
  function migrateCredits() {
    const n = store.get(CR, 0); if (!n) return;
    store.set(CR, 0);
    if (typeof Karma !== 'undefined' && Karma.mode && Karma.mode() === 'live' && typeof karma !== 'undefined') { karma += n * 5; window.KREASON = `상담권 ${n}장 → 카르마 전환`; window.KCAT = 'bonus'; saveMeta(); try { Store.notify(); } catch (e) { } }
  }
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

  /* ---------- 대화형 화면 ---------- */
  const CKEY = 'p8b_counsel_chat', OKKEY = 'p8b_counsel_ai_ok';
  const PER = () => ((window.STORE_CONFIG || {}).counsel || {}).perQ || 3;
  const chat = () => store.get(CKEY, []);
  let busy = false;
  const aiOn = () => !!(window.Auth && Auth.ready() && Auth.user());
  const price = () => freeLeft() ? '무료 (처음 1개)' : `✨ ${PER()}`;
  const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const START = ['이직을 할지 지금 회사에 남을지 고민돼요', '요즘 만나는 사람과 잘 될지 궁금해요', '올해 돈을 모으려면 어떻게 해야 할까요?', '창업을 해도 될까요?', '공부를 다시 시작할까 고민이에요', '요즘 마음이 너무 지쳐요'];
  const TABK = 'p8b_counsel_tab';
  const tabOf = () => store.get(TABK, 'chat') === 'pick' ? 'pick' : 'chat';
  const tabsHTML = () => `<div class="tsel cs-tabs" id="csTabs"><button data-v="chat" class="${tabOf() === 'chat' ? 'on' : ''}">💬 대화 상담</button><button data-v="pick" class="${tabOf() === 'pick' ? 'on' : ''}">🧭 선택 상담</button></div>`;
  function pageHTML(p, a) {
    migrateCredits();
    return tabOf() === 'pick' ? pickHTML(p, a) : chatHTML(p, a);
  }
  function bind(p, a, rerender) {
    document.querySelectorAll('#csTabs button').forEach(b => b.onclick = () => { store.set(TABK, b.dataset.v); Snd.sfx('tap'); rerender(); });
    if (tabOf() === 'pick') bindPick(p, a, rerender); else bindChat(p, a, rerender);
  }
  function chatHTML(p, a) {
    const L = chat(), mode = aiOn() && store.get(OKKEY, 0) ? 'ai' : aiOn() ? 'ask' : 'local';
    const head = `<div class="hcard cs-hero"><div class="cs-ava">🤖</div><div><b>AI 사주상담</b><small>고민을 편하게 말해 주세요. ${esc(p.name)}님의 사주·대운·올해 흐름·MBTI를 바탕으로 대화하며 함께 정리해요.</small></div></div>
      ${tabsHTML()}<div class="cs-mode ${mode}">${mode === 'ai' ? '🤖 AI 대화 모드 · 자연스러운 대화로 답해요' : mode === 'ask' ? '🤖 AI 대화를 쓰려면 아래에서 한 번 동의해 주세요 · 지금은 기기 안 상담' : (window.Auth && Auth.ready()) ? '📱 기기 안 상담 모드 · 로그인하면 AI와 자연스럽게 대화할 수 있어요' : '📱 기기 안 상담 모드 · 사주로 계산한 상담을 대화로 드려요 (AI 서버 연결 전)'}</div>`;
    const log = L.length ? L.map(m => `<div class="cs-msg ${m.r}"><div>${m.r === 'a' ? md(m.t) : esc(m.t)}</div>${m.r === 'u' && m.cost != null ? `<small>${m.cost ? `✨ −${m.cost}` : '무료'}</small>` : m.r === 'a' ? `<small>${m.src === 'ai' ? '🤖 AI 상담사' : '📱 기기 안 상담'}</small>` : ''}</div>`).join('')
      : `<div class="cs-msg a"><div>안녕하세요, ${esc(p.name)}님. 요즘 어떤 고민이 있으세요? 상황을 편하게 적어 주시면 사주 흐름과 함께 차근차근 이야기해 볼게요.<br><br>두 가지 중에서 고민 중이라면 “A 할까, B 할까?”처럼 적어 주시면 비교해 드려요.</div><small>📱 첫 인사는 무료</small></div>`;
    return head + `<div class="hcard cs-chat" id="csLog">${log}${busy ? '<div class="cs-msg a"><div class="cs-typing">답변을 쓰는 중…</div></div>' : ''}</div>
      ${L.length ? '' : `<div class="cs-chips">${START.map(t => `<button data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>`}
      <div class="hcard cs-in"><textarea id="csIn" maxlength="300" rows="3" placeholder="고민을 적어 주세요 (질문 1개마다 카르마 ${PER()}, 처음 1개 무료)"></textarea>
        <div class="cs-send"><span>보유 ✨ ${typeof karma !== 'undefined' ? karma : 0}</span><button class="bigbtn" id="csSend" ${busy ? 'disabled' : ''}>보내기 · ${price()}</button></div>
        ${mode === 'ask' ? '<button class="ghost wide" id="csAIok">🤖 AI 대화 켜기 (동의)</button>' : ''}
        <div class="row2">${L.length ? '<button class="ghost" id="csNew">🗂️ 새 대화</button>' : ''}<button class="ghost" id="csKarma">✨ 카르마 모으기</button></div>
        <p class="sjnote">질문 1개를 보낼 때마다 카르마 ${PER()}가 차감돼요 (처음 1개 무료). 대화는 이 기기에만 저장돼요.${aiOn() ? ' AI 대화 모드에서는 쓴 내용과 사주 요약(이름·생년월일 제외)이 서버를 거쳐 AI에게 전달되고, 서버에 저장하지 않아요.' : ''}</p></div>
      <p class="sjnote" style="text-align:center">※ 명리 이론을 바탕으로 한 참고·재미용 상담이에요. 건강·법률·투자처럼 중요한 결정은 전문가와 꼭 상의하세요. 마음이 많이 힘들다면 자살예방상담전화 109(24시간)에 연락해 주세요.</p>`;
  }
  function bindChat(p, a, rerender) {
    const r = rerender;
    const send = t => { const v = (t != null ? t : ($('#csIn') || {}).value || '').trim(); if (v) ask(p, v, r); };
    const b = $('#csSend'); if (b) b.onclick = () => send();
    const ta = $('#csIn'); if (ta) ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
    document.querySelectorAll('.cs-chips [data-q]').forEach(x => x.onclick = () => send(x.dataset.q));
    const n = $('#csNew'); if (n) n.onclick = () => { store.set(CKEY, []); Snd.sfx('tap'); r(); };
    const k = $('#csKarma'); if (k) k.onclick = () => Karma.openCharge(Math.max(0, PER() - karma), 'AI 사주상담', () => r());
    const ok = $('#csAIok'); if (ok) ok.onclick = () => consent(r);
    const lg = $('#csLog'); if (lg) lg.scrollTop = lg.scrollHeight;
    setTimeout(() => { const m = document.querySelectorAll('.cs-msg'); if (m.length > 1) m[m.length - 1].scrollIntoView({ block: 'end' }); }, 30);
  }
  function consent(r) {
    openOverlay('🤖 AI 대화 켜기', `<div class="sjtxt"><p>AI 대화 모드에서는 질문할 때마다 아래 내용이 서버를 거쳐 AI(Anthropic Claude)에게 전달돼요.</p>
      <p>· 내가 쓴 질문과 이번 대화의 앞부분<br>· 사주 요약: 일간·오행 개수·대운·올해 좋은 달 (이름·생년월일·태어난 시간은 보내지 않아요)<br>· MBTI, 나이대</p>
      <p>서버는 질문·답변을 저장하지 않고 하루 이용 횟수만 기록해요. 질문에 이름·연락처 같은 개인정보는 적지 마세요.</p></div>`,
      [{ t: '동의하고 켜기', pri: 1, f: () => { store.set(OKKEY, 1); r(); } }, { t: '나중에' }]);
  }
  /* 질문 1개 보내기: 위기 신호 확인 → 차감 → 답변(AI 또는 기기 안) */
  const CRISIS = /(죽고\s*싶|자살|목숨|극단적|자해|사라지고\s*싶|살기\s*싫)/;
  function charge(r, after, reason) {
    if (freeLeft()) { store.set(FREE, 1); after(0); return; }
    const n = PER();
    if (karma < n) { try { Karma.metric('lack_shown'); } catch (e) { } Karma.openCharge(n - karma, 'AI 사주상담 질문', () => r()); return; }
    karma -= n; window.KREASON = reason || '🤖 AI 사주상담 질문 1개'; window.KCAT = 'spend'; saveMeta(); try { Auth.sync(); } catch (e) { } Store.notify(); after(n);
  }
  function ask(p, text, r) {
    if (busy) return;
    const c = ctxOf(p); if (!c) { Hub.toast('내 정보를 먼저 입력해 주세요'); return; }
    const L = chat();
    if (CRISIS.test(text)) {   // 위기 신호: 차감하지 않고 바로 도움 안내
      L.push({ r: 'u', t: text, at: Date.now(), cost: 0 }, { r: 'a', src: 'local', at: Date.now(), t: '많이 힘드셨겠어요. 지금 그 마음을 혼자 견디지 않으셨으면 해요.\n\n지금 바로 이야기할 사람이 필요하다면 **자살예방상담전화 109**(24시간), 정신건강위기상담 **1577-0199**, 또는 가까운 사람에게 연락해 주세요. 위급하다면 **112·119**에 연락하세요.\n\n여기서도 천천히 이야기를 들을게요. 요즘 가장 힘든 일이 무엇인지 조금 더 말해 줄 수 있을까요?' });
      store.set(CKEY, L.slice(-40)); r(); return;
    }
    charge(r, (cost, via) => {
      const u = { r: 'u', t: text, at: Date.now(), cost }; L.push(u); store.set(CKEY, L.slice(-40));
      try { Karma.metric('counsel_q'); } catch (e) { }
      busy = true; r();
      const done = (t, src) => { busy = false; const L2 = chat(); L2.push({ r: 'a', t, src, at: Date.now() }); store.set(CKEY, L2.slice(-40)); Snd.sfx('reveal'); if (Hub.cur() === 'counsel') r(); else Hub.toast('🤖 상담 답변이 도착했어요'); };
      if (aiOn() && store.get(OKKEY, 0)) aiChat(c, L).then(t => done(t, 'ai')).catch(() => done(localReply(c, L) + '\n\n(AI 서버에 연결하지 못해 기기 안 상담으로 답했어요.)', 'local'));
      else setTimeout(() => done(localReply(c, L), 'local'), 700);
    });
  }
  /* ---------- AI 대화 (서버 연결 시) ---------- */
  async function aiChat(c, L) {
    const cl = await Auth.client();
    const msgs = L.slice(-12).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: String(m.t).slice(0, 1200) }));
    const body = { mode: 'chat', messages: msgs, ageBand: Math.floor(c.age / 10) * 10 + '대', mbti: c.mbti.type, year: c.Y,
      saju: { dayMaster: c.a.dm.nm, nature: c.a.dm.key, elements: c.a.el, weak: SAJU.EK[c.a.weak], strong: SAJU.EK[c.a.strong], luckNow: c.luck ? c.luck.name : null, luckDesc: c.luck ? c.luck.desc : null, luckNext: c.nextD ? Saju.GRPN[c.nextD.g] : null, yearFlow: c.ny.ts ? c.ny.ts.n : null, goodMonths: c.ny.best.map(x => x.solarM), cautionMonth: c.ny.worst.solarM } };
    const { data, error } = await cl.functions.invoke(COUNSEL_CONFIG.fn, { body });
    if (error || !data || !data.reply) throw new Error((error && error.message) || 'no reply');
    return String(data.reply).trim();
  }
  /* ---------- 기기 안 상담 엔진 (API 없이) ----------
   * 질문에서 주제·감정·선택지를 읽고, 사주 흐름(대운·세운·좋은 달)·MBTI·선택지 적합도로 답한 뒤
   * 다음 이야기를 이어 갈 질문을 하나 되묻는다. 같은 대화 안에서는 앞 주제를 기억한다 */
  const TOPIC_KW = { career: ['회사', '직장', '이직', '퇴사', '취업', '승진', '상사', '연봉', '일이', '업무', '커리어', '진로'], biz: ['창업', '사업', '가게', '장사', '독립', '프리랜서', '부업', '스타트업'], study: ['공부', '시험', '자격증', '대학원', '유학', '학교', '수능', '재수', '배우'],
    love: ['연애', '사랑', '남자친구', '여자친구', '남친', '여친', '결혼', '이별', '헤어', '썸', '고백', '배우자', '재회', '짝사랑', '연락', '만나는', '그 사람', '데이트', '호감', '좋아하는', '소개팅', '잘 될지', '애인'], money: ['돈', '투자', '주식', '코인', '부동산', '집', '대출', '빚', '저축', '재테크', '월급', '전세'], move: ['이사', '해외', '이민', '지방', '이주', '유학'],
    hobby: ['취미', '그림', '피아노', '운동', '여행'], mind: ['지쳐', '힘들', '우울', '불안', '외로', '번아웃', '스트레스', '잠이', '무기력', '자존감'], family: ['가족', '부모', '엄마', '아빠', '아이', '자녀', '형제', '시댁', '처가'] };
  const TN = { career: '일과 진로', biz: '창업·독립', study: '공부', love: '연애·관계', money: '돈', move: '이사·이동', hobby: '배움·취미', mind: '마음', family: '가족', all: '지금의 고민' };
  const FOLLOW = {
    career: ['지금 일에서 가장 지치는 부분은 사람, 일의 양, 보상 중 어느 쪽인가요?', '옮긴다면 1년 뒤 어떤 모습이길 바라세요?', '지금 회사에서 바꿀 수 있는 것이 하나 있다면 무엇일까요?'],
    biz: ['지금 준비된 것(돈·기술·사람) 중 가장 자신 있는 것은 무엇인가요?', '실패해도 버틸 수 있는 기간을 따져 보면 몇 달 정도일까요?', '작게 먼저 시험해 볼 수 있는 방법이 있을까요?'],
    study: ['이 공부를 마치면 무엇이 달라지길 바라세요?', '하루에 실제로 낼 수 있는 시간은 얼마나 되나요?', '혼자 하는 게 맞는지, 함께하는 게 맞는지 어느 쪽이었나요?'],
    love: ['그 사람과 있을 때 가장 편한 순간은 언제인가요?', '지금 관계에서 가장 확인하고 싶은 마음은 무엇인가요?', '상대에게 아직 하지 못한 말이 있나요?'],
    money: ['지금 가장 큰 고정 지출은 무엇인가요?', '목표 금액과 기간을 정해 두셨나요?', '잃어도 괜찮은 돈과 지켜야 할 돈을 나눠 보면 어떨까요?'],
    move: ['떠나고 싶은 이유와 남고 싶은 이유를 하나씩 말해 줄 수 있을까요?', '그곳에서 가장 걱정되는 것은 무엇인가요?', '미리 짧게 살아 볼 방법이 있을까요?'],
    hobby: ['둘 중 상상만 해도 더 설레는 쪽은 어느 쪽인가요?', '일주일에 쓸 수 있는 시간은 얼마나 되나요?', '예전에 즐거웠던 취미는 무엇이었나요?'],
    mind: ['요즘 잠은 잘 주무시나요?', '마음이 조금이라도 편해지는 순간은 언제인가요?', '이 이야기를 나눌 수 있는 사람이 곁에 있나요?'],
    family: ['가장 마음이 쓰이는 사람은 누구인가요?', '그분에게 바라는 것을 한 문장으로 말하면 무엇일까요?', '내가 할 수 있는 것과 할 수 없는 것을 나눠 보면 어떨까요?'],
    all: ['조금 더 구체적으로 어떤 상황인지 말해 줄 수 있을까요?', '이 고민이 풀리면 무엇이 가장 달라질까요?', '결정해야 하는 시기가 정해져 있나요?'] };
  const TOPIC_G = { career: 3, biz: 0, study: 4, love: 5, money: 2, move: 6, hobby: 1, mind: -1, family: 5, all: -1 };
  function topicOf(t) { let best = null, bs = 0; Object.keys(TOPIC_KW).forEach(k => { const s = TOPIC_KW[k].filter(w => t.includes(w)).length; if (s > bs) { bs = s; best = k; } }); return best; }
  // 선택지 읽기: "A할까 B할까", "A 아니면 B", "A vs B", "A랑 B 중에"
  function optionsOf(t) {
    const x = t.replace(/[?？!.~]+/g, ' ').replace(/\s+/g, ' ').trim(), FILL = /^(지금|그냥|아니면|또는|차라리|계속|요즘|이번에|올해)\s+/;
    const clean = o => { let v = o.trim(); for (let k = 0; k < 3; k++) v = v.replace(FILL, ''); return v.replace(/\s*(고민|중|인지|일지).*$/, '').trim(); };
    const ks = x.split(/(?<=[가-힣]까)(?=\s|$)/).map(clean).filter(v => /까$/.test(v) && v.length >= 2);
    if (ks.length >= 2) return ks.slice(0, 3);
    const m = x.match(/^(.+?)\s*(?:vs\.?|VS|아니면|또는)\s*(.+)$/);
    if (m) { const o = [clean(m[1]), clean(m[2])].filter(v => v.length >= 1 && v.length <= 40); if (o.length === 2) return o; }
    const n = x.match(/^(.+?)(?:이랑|랑|와|과|하고)\s+(.+?)\s*중(?:에|에서)?/);
    if (n) return [clean(n[1]), clean(n[2])];
    return null;
  }
  function localReply(c, L) {
    const us = L.filter(m => m.r === 'u'), text = us[us.length - 1].t, turn = us.length;
    const tpAt = i => i < 0 ? 'all' : (topicOf(us[i].t) || tpAt(i - 1));   // 주제가 없는 말은 앞 주제를 이어 감
    const tp = tpAt(us.length - 1);
    const a = c.a, Lk = c.luck, m = mbtiTraits(c.mbti.type), NY = c.ny;
    const mm = x => `${x.yr !== c.Y ? x.yr + '년 ' : ''}${x.solarM}월`, bm = [...NY.best].sort((x, y) => x.yr - y.yr || x.solarM - y.solarM).map(mm).join('·');
    const sad = /(힘들|지쳐|우울|불안|걱정|답답|막막|외로|속상|무기력)/.test(text), happy = /(설레|좋아|기대|행복|기뻐)/.test(text);
    const out = [];
    // 1) 공감
    out.push(tp === 'mind' ? (turn > 1 ? '이야기해 줘서 고마워요. 천천히 같이 볼게요.' : '요즘 많이 지치셨군요. 이렇게 털어놓는 것만으로도 한 걸음 나아간 거예요.') : sad ? `${TN[tp]} 때문에 마음이 많이 무거우셨겠어요. 이렇게 털어놓는 것만으로도 한 걸음 나아간 거예요.` : happy ? `${TN[tp]} 이야기를 들으니 저도 기대가 돼요. 좋은 흐름을 잘 살릴 방법을 같이 생각해 볼게요.` : turn > 1 ? `말씀해 주셔서 고마워요. ${TN[tp]}에 대해 조금 더 깊이 볼게요.` : `${TN[tp]}에 대한 고민이시군요. 사주 흐름과 함께 차근차근 볼게요.`);
    // 2) 사주 흐름 — 주제가 처음 나올 때는 대운, 같은 주제를 이어 갈 때는 다른 각도(세운·오행·다음 대운)
    const g = TOPIC_G[tp], again = us.length > 1 && tpAt(us.length - 2) === tp;
    if (tp === 'mind') out.push(`사주로 보면 ${c.p.name || ''}님은 **${SAJU.EK[a.strong]}** 기운이 강하고 **${SAJU.EK[a.weak]}** 기운이 부족해요. 부족한 기운이 더 비면 몸과 마음이 쉽게 지쳐요. ${['아침 햇빛과 가벼운 산책', '좋아하는 사람과의 따뜻한 대화', '규칙적인 식사와 잠', '방과 일정을 정리하는 시간', '충분한 잠과 물, 혼자 쉬는 시간'][a.weak]}이 지금 가장 좋은 보약이에요.`);
    else if (again) {
      const k = turn % 3;
      out.push(k === 0 && c.nextD ? `조금 멀리 보면 ${c.nextD.age}살부터 **${Saju.GRPN[c.nextD.g]}**의 대운이 와요. ${c.nextD.g === (Lk && Lk.g) ? '지금 흐름이 한 번 더 이어지니 지금 쌓는 것이 그대로 힘이 돼요.' : '흐름이 바뀌기 전, 지금 대운에서 해 둘 일을 마무리해 두면 좋아요.'}`
        : k === 1 ? `${c.Y}년은 상반기 **${NY.ts.n}**, 하반기 **${(NY.tb || NY.ts).n}**의 기운이 들어와요. ${NY.sx && NY.sx.총운 ? NY.sx.총운 : ''}`
        : `타고난 기운으로 보면 **${SAJU.EK[a.strong]}** 기운이 강하고 **${SAJU.EK[a.weak]}** 기운이 부족해요. ${a.dm.강점}`);
    } else if (Lk) out.push(`지금 ${c.p.name ? c.p.name + '님은' : ''} **${Lk.name}** 대운(${Lk.start}살~)을 지나고 있어요. ${Lk.desc}${g >= 0 && g <= 4 ? (Lk.g === g ? ' 지금 고민하는 분야와 대운의 방향이 같아서, 움직이면 힘을 받기 쉬운 시기예요.' : c.yearG === g ? ` ${c.Y}년 세운이 이 분야를 밀어 주고 있어요. 올해 안에 작게라도 시작해 보기 좋아요.` : ' 지금 대운이 이 분야를 직접 밀어 주지는 않아서, 서두르기보다 준비를 단단히 하는 쪽이 유리해요.') : ''}`);
    // 3) 선택지 비교
    const opts = optionsOf(text);
    if (opts && opts.length >= 2) {
      const fits = opts.map(o => fit(c, groupOf(o) >= 0 ? groupOf(o) : g));
      const sc = fits.map(f => f.s), bi = sc.indexOf(Math.max(...sc)), gap = Math.max(...sc) - Math.min(...sc);
      const gs = opts.map(o => groupOf(o)), same = gs.every(x => x === gs[0]);
      const pj = (w, x, y) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 ? x : y; };
      const both = opts.slice(0, -1).map(o => `**${o}**`).join(', ') + pj(opts[opts.length - 2], '과', '와') + ` **${opts[opts.length - 1]}**`, last = opts[opts.length - 1];
      out.push(same && gap <= TIE ? `${both}${pj(last, '은', '는')} 사주로 보면 같은 분야(${gs[0] >= 0 ? GN[gs[0]] : TN[tp]})의 선택이라 기운의 우열은 없어요. 이럴 땐 조건을 나란히 놓고 보세요 — 성장(배울 것), 보상(돈·시간), 사람(함께할 이들) 중 지금 나에게 가장 중요한 하나를 정하면 답이 보여요.`
        : gap <= TIE ? `${both}, 사주로 보면 두 길의 무게가 거의 비슷해요(${sc.join(' vs ')}). 이럴 땐 어느 쪽이 맞는지보다 상상했을 때 마음이 더 가벼워지는 쪽을 고르는 게 좋아요.`
        : `두 길을 비교해 보면 **${opts[bi]}** 쪽이 조금 더 맞아요(${sc.join(' vs ')}). ${fits[bi].why.slice(0, 2).join(', ') || '사주에서 크게 막는 기운이 없는 쪽'}이기 때문이에요. 다만 점수는 흐름일 뿐, 조건이 바뀌면 답도 달라질 수 있어요.`);
    }
    // 4) 성향
    if (!again || turn % 2 === 0) out.push(tp === 'mind' ? `${c.mbti.type} 성향은 ${m.E ? '사람들 속에서 기운을 얻는 편이라, 혼자 버티기보다 믿는 사람과 이야기를 나눌 때 회복이 빨라요.' : '혼자만의 시간에 충전되는 편이라, 하루쯤은 일정 없이 쉬는 날을 꼭 만들어 주세요.'}`
      : `${c.mbti.type} 성향으로 보면 ${m.J ? '결정을 빨리 내리고 싶어지는 편이라, 정보가 다 모일 때까지 2주쯤 기한을 두고 판단해 보세요.' : '여러 가능성을 열어 두는 편이라, 결정 기한을 스스로 정해 두면 마음이 편해져요.'} ${m.T ? '조건만 따지다 보면 마음의 만족을 놓칠 수 있으니 “1년 뒤 나는 행복한가?”도 함께 물어보세요.' : '주변의 기대보다 내 마음이 끌리는 쪽을 따로 적어 보세요.'}`);
    // 5) 시기 · 실천
    if (tp !== 'mind' && (!again || turn % 3 === 1)) out.push(`시기로는 ${NY.year}년 **${bm}**이 움직이기 좋고, **${mm(NY.worst)}**은 큰 결정보다 점검에 쓰는 달이에요.`);
    const tips = tp === 'mind' ? ['🌙 오늘 밤은 휴대폰을 30분 일찍 내려놓고, 따뜻한 물 한 잔과 함께 쉬어 보세요.', '🚶 하루 20분, 햇빛 아래 걷는 것만으로도 마음의 무게가 조금 가벼워져요.', '📝 걱정을 종이에 적고 “지금 할 수 있는 것”에만 동그라미를 쳐 보세요.'] : (TIPS[tp] || TIPS.career || []);
    if (tips.length) out.push(`바로 해 볼 일: ${tips[(turn - 1) % tips.length]}`);
    if (turn === 1) out.push(`🍀 ${a.dm.개운} — 부족한 ${SAJU.EK[a.weak]} 기운을 채우면 결정 뒤의 실행이 한결 쉬워져요.`);
    // 6) 되묻기
    const f = FOLLOW[tp] || FOLLOW.all; out.push(f[(turn - 1) % f.length]);
    return out.join('\n\n');
  }
  /* ---------- 🧭 선택 상담 화면 (고민 + 선택지 → 선택지별 상세 비교) ---------- */
  let st = { topic: 'career', q: '', opts: ['', ''], res: null, busy: false };
  function pickHTML(p, a) {
    const T = TOPICS.find(t => t.k === st.topic) || TOPICS[0];
    const head = `<div class="hcard cs-hero"><div class="cs-ava">🤖</div><div><b>AI 사주상담</b><small>인생의 갈림길에서 선택지를 적어 주시면 사주 · MBTI · 인생 게임으로 선택지마다 자세히 풀어 드려요.</small></div></div>${tabsHTML()}`;
    if (st.res) return head + st.res.html + `<div class="hcard"><button class="bigbtn wide" id="csNew2">🗂️ 다른 고민 상담하기</button></div>`;
    return head + `<div class="hcard">
      <h3 class="ht">무엇이 고민인가요?</h3>
      <div class="tsel cs-top" id="csTopic">${TOPICS.map(t => `<button data-v="${t.k}" class="${t.k === st.topic ? 'on' : ''}">${t.e} ${t.n}</button>`).join('')}</div>
      <label class="cs-l">상황을 한두 줄로 적어 주세요<textarea id="csQ" maxlength="200" rows="3" placeholder="예: 지금 회사 5년 차인데 스타트업에서 제안이 왔어요. 연봉은 비슷하고 성장 기회가 커요.">${esc(st.q)}</textarea></label>
      <label class="cs-l">선택지 A<input id="csA" maxlength="40" value="${esc(st.opts[0])}" placeholder="예: ${T.ex[0]}"></label>
      <label class="cs-l">선택지 B<input id="csB" maxlength="40" value="${esc(st.opts[1])}" placeholder="예: ${T.ex[1]}"></label>
      <label class="cs-l">선택지 C <small>(선택)</small><input id="csC" maxlength="40" value="${esc(st.opts[2] || '')}" placeholder="비워 두어도 돼요"></label>
      <div id="csErr" class="cs-err"></div>
      <div class="cs-send"><span>보유 ✨ ${typeof karma !== 'undefined' ? karma : 0}</span><button class="bigbtn" id="csGo">🔮 상담 받기 · ${price()}</button></div>
      <p class="sjnote">선택 상담 1회 = 질문 1개 (카르마 ${PER()}, 처음 1개 무료). 📍 이름·생년월일 같은 개인정보는 이 기기 안에서만 계산하고, 상담 기록도 이 기기에만 남아요.</p></div>
      <div class="hcard cs-what"><h3 class="ht">무엇을 받나요?</h3>
      <ul><li>🧭 선택지별 <b>적합도</b>와 종합 의견</li><li>🔍 선택지마다 <b>상세 풀이</b> — 사주로 본 의미, 잘 맞는 점, 조심할 점, 이 선택의 기운이 들어오는 달, 1년 뒤·3년 뒤 모습, 시작 전 준비</li>
      <li>🔮 지금 대운 · ${baseYear()}년 세운 · 움직이기 좋은 달</li><li>🧠 MBTI로 본 나의 결정 스타일과 함정</li>
      <li>🎲 내 생년월일로 태어난 가상 인물이 선택지마다 <b>끝까지 살아 본 결과</b> (인생 게임 엔진)</li><li>✅ 결정까지의 4주 실행 계획</li></ul>
      <div class="row2"><button class="ghost" id="csKarma2">✨ 카르마 모으기</button></div></div>
      ${histHTML()}`;
  }
  function histHTML() {
    const h = store.get(HIST, []); if (!h.length) return '';
    return `<div class="hcard"><h3 class="ht">지난 선택 상담 (이 기기)</h3>${h.slice(0, 5).map((x, i) => `<button class="cs-past" data-i="${i}"><b>${x.e} ${esc(x.q || x.opts.join(' vs '))}</b><small>${new Date(x.t).toLocaleDateString()} · 추천: ${esc(x.pick)}</small></button>`).join('')}</div>`;
  }
  function bindPick(p, a, r) {
    const keep = () => { const q = $('#csQ'); if (q) { st.q = q.value.trim(); st.opts = [$('#csA').value.trim(), $('#csB').value.trim(), $('#csC').value.trim()]; } };
    document.querySelectorAll('#csTopic button').forEach(b => b.onclick = () => { keep(); st.topic = b.dataset.v; Snd.sfx('tap'); r(); });
    const go = $('#csGo'); if (go) go.onclick = () => { keep(); start(p, r); };
    const n = $('#csNew2'); if (n) n.onclick = () => { st.res = null; r(); };
    const k = $('#csKarma2'); if (k) k.onclick = () => Karma.openCharge(Math.max(0, PER() - karma), 'AI 사주상담', () => r());
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
    const c = ctxOf(p); if (!c) return err('내 정보를 먼저 입력해 주세요');
    if (CRISIS.test(st.q + ' ' + opts.join(' '))) { openOverlay('💛 잠깐 이야기해요', `<div class="sjtxt"><p>많이 힘드셨겠어요. 그 마음을 혼자 견디지 않으셨으면 해요.</p><p>지금 이야기할 사람이 필요하다면 <b>자살예방상담전화 109</b>(24시간), 정신건강위기상담 <b>1577-0199</b>, 또는 가까운 사람에게 연락해 주세요. 위급하다면 <b>112·119</b>에 연락하세요.</p><p>💬 대화 상담에서 천천히 이야기를 나눌 수도 있어요. 카르마는 차감하지 않았어요.</p></div>`, [{ t: '닫기' }]); return; }
    charge(r, cost => run(p, r, c, opts, cost), '🧭 AI 선택 상담 1회');
  }
  async function run(p, r, c, opts, cost) {
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
      try { Karma.metric('counsel_run'); } catch (e) { }
      st.res = res; st.busy = false;
      const h = store.get(HIST, []); h.unshift({ t: Date.now(), e: (TOPICS.find(t => t.k === st.topic) || {}).e || '🤖', q: st.q, opts, pick: res.best < 0 ? '우열 없음' : opts[res.best], html: res.html }); store.set(HIST, h.slice(0, 10));
      closeOverlay(); Snd.sfx('reveal'); r();
      askAI(c, opts, groups, fits, sims, res);
    } catch (e) {
      console.warn(e); st.busy = false; closeOverlay();
      if (cost) { karma += cost; window.KREASON = '선택 상담 오류 환불'; window.KCAT = 'bonus'; saveMeta(); Store.notify(); } else store.set(FREE, 0);
      Hub.toast('상담을 만들지 못했어요. 차감한 카르마는 돌려드렸어요');
    }
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const FX = [p => { p.money -= Math.round(p.money * .15); p.hap += 3; }, p => { p.hap += 4; }, null, p => { p.hap -= 1; }, p => { p.smart += 4; p.money -= Math.round(p.money * .08); }, p => { p.bond += 6; }, p => { p.hap += 2; p.bond -= 4; }];


  /* ---------- 선택지별 상세 풀이 ---------- */
  // 분야(그룹)별 [사주로 본 의미, 잘 맞는 점, 조심할 점, 시작 전 준비, 1년 뒤, 3년 뒤]
  const GDEEP = {
    0: ['비견·겁재(독립·경쟁)의 길이에요. 내 이름과 내 판단으로 서는 선택이라 자율과 성취감이 크지만, 모든 책임도 나에게 돌아와요.',
      ['스스로 결정하는 자유가 커서 의욕이 오래가요', '경쟁이 있는 자리에서 실력이 빨리 늘어요', '잘되면 성과가 고스란히 내 것이 돼요'],
      ['수입이 들쭉날쭉할 수 있어요', '혼자 다 하려다 지치기 쉬워요', '가까운 사람과의 돈거래·동업이 새는 구멍이 돼요'],
      ['버틸 생활비(최소 6개월)를 먼저 떼어 두기', '3개월짜리 작은 실험으로 수요·적성 확인하기', '도움받을 사람 3명을 미리 정해 두기'],
      '처음 몇 달은 정신없지만 내 방식이 자리를 잡아 가요. 수입보다 경험과 사람이 먼저 쌓이는 시기예요.',
      '버텨 낸다면 나만의 영역이 생겨요. 이때부터는 혼자보다 함께할 사람을 들이는 것이 성장의 열쇠예요.'],
    1: ['식신·상관(재능·표현)의 길이에요. 내가 가진 재주를 밖으로 꺼내 보이는 선택이라 즐거움과 몰입이 크고, 결과가 사람들 눈에 보여요.',
      ['좋아하는 일이라 오래 지치지 않아요', '아이디어와 표현력이 빛나요', '작게 시작해도 반응을 바로 볼 수 있어요'],
      ['즐거움만큼 수입이 바로 따라오지 않을 수 있어요', '기분에 따라 꾸준함이 흔들리기 쉬워요', '말과 표현이 앞서 구설이 생길 수 있어요'],
      ['결과물을 정기적으로 내놓을 주기(주 1회 등) 정하기', '취미 수준과 수익 목표를 분리해 적기', '피드백을 줄 사람이나 모임 찾기'],
      '해 본 것들이 쌓여 내 색깔이 생겨요. 처음 기대보다 느려도 꾸준히 낸 사람만 남는 시기예요.',
      '쌓인 결과물이 포트폴리오가 되어 기회를 불러와요. 재능이 일·수입으로 이어지는 갈림길이 와요.'],
    2: ['편재·정재(재물)의 길이에요. 돈과 실리를 직접 다루는 선택이라 결과가 숫자로 분명하게 드러나요.',
      ['노력한 만큼 손에 잡히는 결과가 생겨요', '목표가 숫자라 계획을 세우기 쉬워요', '자산이 불어나는 재미가 있어요'],
      ['욕심이 커지면 무리한 결정을 하기 쉬워요', '들어오는 만큼 나가는 돈도 커져요', '시장 상황처럼 내가 못 바꾸는 변수가 있어요'],
      ['최악의 경우(수입 −20%, 금리 +2%)에도 버틸지 계산하기', '한 번에 하지 말고 나눠 실행하기', '지켜야 할 돈과 써도 되는 돈을 나누기'],
      '첫해는 계획대로 되는지 확인하는 해예요. 숫자를 매달 기록하면 흔들릴 때 기준이 돼요.',
      '꾸준히 관리했다면 자산의 기반이 생겨요. 이때 욕심을 줄이고 지키는 쪽으로 무게를 옮기면 오래가요.'],
    3: ['편관·정관(직장·명예)의 길이에요. 조직과 규칙 안에서 자리를 지키고 올라가는 선택이라 안정과 인정을 얻어요.',
      ['수입과 생활이 안정적이에요', '쌓은 경력이 그대로 평가로 이어져요', '사회적 신뢰와 이름이 올라가요'],
      ['책임과 압박이 커질 수 있어요', '내 뜻대로 바꿀 수 있는 것이 적어요', '익숙함에 머물다 성장이 멈춘 느낌이 들 수 있어요'],
      ['지금 자리에서 바꿀 수 있는 것(역할·연봉·근무 방식)을 먼저 요청하기', '3년 뒤 내 모습을 선배·동료에게 물어보기', '평가 기준을 정확히 알아 두기'],
      '안정 속에서 맡은 일이 늘어요. 인정받는 만큼 책임도 커지니 체력과 마음 관리가 중요해요.',
      '쌓아 온 신뢰가 자리와 직함으로 돌아와요. 이때 새 역할에 도전할지, 지금 자리를 다질지 다시 고민이 와요.'],
    4: ['편인·정인(학업·귀인)의 길이에요. 배우고 준비하며 나를 키우는 선택이라 당장보다 나중에 크게 돌아와요.',
      ['실력과 자격이 오래 남는 자산이 돼요', '스승·선배 같은 귀인을 만나기 쉬워요', '생각이 깊어지고 방향이 분명해져요'],
      ['당장 수입이 줄거나 늦어질 수 있어요', '준비만 길어지고 실행이 늦어지기 쉬워요', '주변과 비교하며 조급해질 수 있어요'],
      ['끝나는 날짜와 그 뒤의 계획을 먼저 정하기', '드는 비용(돈·시간)과 얻을 기회를 표로 비교하기', '2주 동안 같은 리듬으로 해 보며 지속 가능성 확인하기'],
      '배우는 즐거움과 막막함이 함께 와요. 작은 성취(시험·수료)를 중간 목표로 두면 끝까지 가요.',
      '배운 것이 자격과 경력으로 바뀌어 선택지가 넓어져요. 이때 만난 사람이 다음 길을 열어 줘요.'],
    5: ['관계·가정의 길이에요. 사람과의 인연을 중심에 두는 선택이라 마음의 안정과 함께할 기쁨이 커요.',
      ['정서적으로 든든한 버팀목이 생겨요', '함께 계획을 세우며 삶의 방향이 분명해져요', '가족·주변의 지지를 얻기 쉬워요'],
      ['내 시간과 자유가 줄어들 수 있어요', '서로 다른 생활 방식이 부딪힐 수 있어요', '상대의 기대에 맞추다 나를 놓칠 수 있어요'],
      ['상대와 “5년 뒤 우리 모습”을 각자 써서 바꿔 읽기', '돈·집안일·가족 행사 기준을 미리 이야기하기', '다툴 때 푸는 방식이 맞는지 확인하기'],
      '함께하는 일상이 자리를 잡아 가요. 작은 차이를 그때그때 이야기하는 습관이 관계의 체력을 만들어요.',
      '함께 쌓은 시간이 큰 힘이 돼요. 이 무렵 집·아이·일처럼 함께 정해야 할 큰 결정이 찾아와요.'],
    6: ['이동·변화의 길이에요. 익숙한 곳을 떠나 새 환경으로 가는 선택이라 시야가 넓어지고 새 기회를 만나요.',
      ['새 환경에서 새로운 나를 발견해요', '사람·일의 선택지가 넓어져요', '정체된 느낌에서 벗어날 수 있어요'],
      ['적응 기간 동안 외로움과 피로가 커요', '이사·정착 비용이 생각보다 커요', '기존 인연과 멀어질 수 있어요'],
      ['그곳에서 2주 이상 살아 보거나 먼저 다녀온 사람 3명에게 묻기', '주거·일·언어 중 가장 걱정되는 하나부터 해결하기', '돌아올 수 있는 조건을 미리 정해 두기'],
      '처음 반년은 적응의 시간이에요. 새 사람을 만나는 자리에 일부러 나가면 정착이 빨라져요.',
      '새 환경이 내 것이 되어 처음의 선택이 맞았는지 보여요. 넓어진 경험이 다음 기회의 바탕이 돼요.'],
    '-1': ['사주로 뚜렷한 분야가 잡히지 않는 선택이에요. 이럴 때는 기운보다 조건과 마음이 더 중요해요.',
      ['내 뜻대로 방향을 정할 여지가 커요', '정해진 틀이 없어 유연하게 바꿀 수 있어요', '해 보면서 답을 찾을 수 있어요'],
      ['기준이 없으면 결정을 계속 미루게 돼요', '주변 의견에 쉽게 흔들릴 수 있어요', '해 보지 않으면 장단점이 보이지 않아요'],
      ['나에게 가장 중요한 기준 하나(성장·돈·사람·시간) 정하기', '작게 먼저 해 보기', '결정할 날짜를 먼저 정하기'],
      '해 본 만큼 판단 기준이 생겨요. 처음의 기대와 실제를 비교해 기록해 두세요.',
      '경험이 쌓여 다음 선택이 훨씬 쉬워져요.'],
  };
  // 이 선택의 기운이 들어오는 달 (올해 월운 중 같은 분야)
  function monthsFor(c, g) {
    const M = c.ny.months, mm = x => `${x.yr !== c.Y ? x.yr + '년 ' : ''}${x.solarM}월`;
    let L = [];
    if (g >= 0 && g <= 4) L = M.filter(x => S_.tg10(c.a.me, x.s).g === g);
    else if (g === 5) L = M.filter(x => x.rel && x.rel.v > 0);
    else if (g === 6) L = M.filter(x => x.rel && x.rel.k === 'chung');
    if (!L.length) L = [...M].sort((x, y) => y.v - x.v).slice(0, 2);
    return L.sort((x, y) => y.v - x.v).slice(0, 3).sort((x, y) => x.yr - y.yr || x.solarM - y.solarM).map(mm);
  }
  const S_ = window.SAJU;
  function deepHTML(c, opts, groups, fits, total, sims, best, tie) {
    const m = mbtiTraits(c.mbti.type);
    const mFit = g => g === 0 ? (m.E ? '밖으로 뻗는 E 성향이라 사람을 만나며 길을 넓히기 좋아요.' : '혼자 깊이 파는 I 성향이라 사람을 만나는 일을 일정으로 정해 두면 좋아요.')
      : g === 1 ? (m.N ? '직관형 N이라 새로운 아이디어가 끊이지 않아요. 끝맺음만 챙기세요.' : '현실형 S라 손에 잡히는 결과물부터 만들면 오래가요.')
      : g === 2 ? (m.T ? '숫자로 판단하는 T라 계산은 강점이에요. 마음의 만족도 함께 따져 보세요.' : '감정형 F라 돈 결정이 마음에 흔들리기 쉬워요. 숫자 기준을 미리 적어 두세요.')
      : g === 3 || g === 4 ? (m.J ? '계획형 J라 정해진 틀 안에서 실력이 잘 쌓여요.' : '유연한 P라 틀이 답답할 수 있어요. 나만의 작은 재미를 함께 정해 두세요.')
      : g === 5 ? (m.T ? '논리형 T라 관계에서도 옳고 그름을 따지기 쉬워요. 공감 한마디를 먼저 건네세요.' : '관계를 중시하는 F 성향이라 마음을 나누는 데 강해요. 내 마음도 챙기세요.')
      : g === 6 ? (m.N ? '새 환경을 즐기는 N 성향이라 변화에 빨리 적응해요.' : '익숙함이 편한 S 성향이라 미리 살아 보는 준비가 특히 중요해요.')
      : `${c.mbti.type} 성향을 살려 내가 편한 방식으로 시작해 보세요.`;
    return opts.map((o, i) => {
      const g = groups[i], D = GDEEP[g] || GDEEP['-1'], mo = monthsFor(c, g), sm = sims && sims[i];
      const luckLine = g >= 0 && g <= 4 ? (c.luck && c.luck.g === g ? `지금 대운(${c.luck.name})이 바로 이 방향이라 힘을 받기 쉬워요.` : c.yearG === g ? `${c.Y}년 세운이 이 방향을 밀어 줘요. 올해 안에 시작하면 유리해요.` : c.nextD && c.nextD.g === g ? `${c.nextD.age}살부터 오는 다음 대운이 이 방향이에요. 지금은 준비하고 그때 크게 움직이는 그림이 좋아요.` : `지금 대운(${c.luck ? c.luck.name : '—'})이 이 방향을 직접 밀어 주지는 않아요. 서두르기보다 준비를 단단히 하세요.`) : '';
      return `<div class="hcard cs-deep${i === best && !tie ? ' best' : ''}"><h3 class="ht">🔍 ${AB[i]} · ${esc(o)} <small>${total[i]}점${i === best && !tie ? ' · 추천' : ''}</small></h3>
        <p class="cs-p"><b>사주로 본 의미</b> — ${D[0]} ${luckLine}</p>
        ${fits[i].why.length ? `<p class="cs-p"><b>점수 근거</b> — ${fits[i].why.join(' · ')}</p>` : ''}
        <div class="cs-two"><div><b>👍 잘 맞는 점</b><ul>${D[1].map(x => `<li>${x}</li>`).join('')}</ul></div><div><b>⚠️ 조심할 점</b><ul>${D[2].map(x => `<li>${x}</li>`).join('')}</ul></div></div>
        <p class="cs-p"><b>🧠 내 성향과의 궁합</b> — ${mFit(g)}</p>
        <p class="cs-p"><b>📅 이 선택의 기운이 들어오는 달</b> — ${mo.join(' · ')}. 시작·계약·발표처럼 움직이는 일을 이 달에 맞추면 힘을 받아요.</p>
        <p class="cs-p"><b>🌱 1년 뒤</b> — ${D[4]}</p>
        <p class="cs-p"><b>🌳 3년 뒤</b> — ${D[5]}</p>
        ${sm ? `<p class="cs-p"><b>🎲 가상 인생</b> — 이 길을 끝까지 살아 본 결과 ${sm.grade}등급 「${esc(sm.type)}」${sm.alive10 ? ` · 10년 뒤 행복 ${sm.hap10}` : ''}</p>` : ''}
        <div class="cs-prep"><b>🧰 이 길을 고른다면 먼저 할 일</b>${D[3].map(x => `<label><input type="checkbox"><span>${x}</span></label>`).join('')}</div></div>`;
    }).join('');
  }
  function planHTML(c, opts, best, tie) {
    const NY = c.ny, bm = [...NY.best].sort((x, y) => x.yr - y.yr || x.solarM - y.solarM).map(x => `${x.yr !== c.Y ? x.yr + '년 ' : ''}${x.solarM}월`).join('·');
    const tgt = tie ? '두 선택지' : `‘${esc(opts[best])}’`;
    return `<div class="hcard"><h3 class="ht">🗓️ 결정까지 4주 계획</h3><div class="cs-plan">
      <div><b>1주차</b><span>선택지마다 좋은 점·걱정되는 점을 3개씩 적고, 가장 중요한 기준 하나에 동그라미를 쳐요.</span></div>
      <div><b>2주차</b><span>${tgt}을 먼저 겪어 본 사람 2~3명에게 실제 모습을 물어봐요. 상상과 다른 점을 기록해요.</span></div>
      <div><b>3주차</b><span>되돌릴 수 있는 작은 시험(체험·면담·견적·상담)을 하나 해 봐요. 해 본 뒤 마음이 더 가벼운 쪽을 확인해요.</span></div>
      <div><b>4주차</b><span>결정하고, 실제 시작은 기운이 좋은 <b>${bm}</b>에 맞춰요. 결정한 이유를 한 줄로 적어 두면 흔들릴 때 힘이 돼요.</span></div></div></div>`;
  }

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
      <div class="hcard"><h3 class="ht">🧠 ${c.mbti.sure ? 'MBTI' : '사주 MBTI'} 기반 결정 스타일 · ${c.mbti.type}</h3><p class="cs-p">${mtip}</p><p class="sjnote">기준: ${c.mbti.src}</p></div>
      <h3 class="cs-sec">🔍 선택지별 상세 풀이</h3>${deepHTML(c, opts, groups, fits, total, sims, best, tie)}
      ${simHTML}
      ${planHTML(c, opts, best, tie)}
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
      item: { k: 'counsel', g: 'saju', c: 'mint', ic: 'spark', e: '🤖', n: 'AI 사주상담', d: '대화 상담 · 선택지 비교 상담 · 질문당 카르마 3', need: 1, f: () => Hub.go('counsel') },
      after: 'tojeong', title: 'AI 사주상담',
      html: pageHTML, bind: (p, a) => bind(p, a, () => Hub.render()),
    });
  }
  return { init, credits, addCredits, forGame, ctxOf, groupOf, localReply, optionsOf, topicOf };
})();
Counsel.init();
