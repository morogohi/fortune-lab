/* =====================================================================
 *  grow.js — 육성 시뮬레이션 업그레이드
 *   ① 육성 유형(방침) 선택 → 방침대로 행동·선택을 고르는 자동 진행
 *   ② 나이별 미니게임 7종 (1년에 한 번)
 *   ③ 시기가 바뀔 때 성장 리포트
 *   ④ 화면 반응: 능력치 반짝임 · 나이 팝업 · 추천 행동 · 흔들림/꽃가루
 * ===================================================================== */
const Grow = (() => {
  /* ---------- ① 육성 유형 ---------- */
  const POL = [
    { k: 'study', e: '📚', n: '공부 우등생', d: '공부·자격증 위주 → 명문대·전문직',
      kw: ['공부', '수학', '과학', '영어', '국어', '코딩', '사회', '책', '대학', '자격', '시험', '독서', '바둑', '진학', '전공', '그림책', '배우'],
      act: { '공부': 6, '자기계발': 5, '그림책': 4, '취미': 1.5, '가족시간': 1, '운동': 1.2, '구직': 6 }, stat: 'smart' },
    { k: 'art', e: '🎨', n: '예체능 스타', d: '취미·대회 위주 → 예술가·운동선수',
      kw: ['노래', '음악', '미술', '그림', '체육', '피아노', '기타', '춤', '댄스', '축구', '농구', '수영', '대회', '출전', '그리기', '운동', '줄넘기', '자전거', '공놀이'],
      act: { '취미': 6, '노래': 5, '놀이': 5, '꾸미기': 3, '운동': 3, '옹알이': 3, '구직': 4 }, stat: 'look' },
    { k: 'money', e: '💼', n: '성공 사업가', d: '일·투자 위주 → 부자 되기',
      kw: ['투자', '사업', '창업', '돈', '알바', '이직', '승진', '계약', '도전', '영업', '주식', '부동산', '수입', '연봉', '매수', '산다'],
      act: { '추가근무': 5, '투자': 5, '알바': 5, '자기계발': 3, '구직': 8, '공부': 2, '집': 1.5 }, stat: 'money' },
    { k: 'family', e: '💗', n: '가족 행복', d: '가족·연애 위주 → 따뜻한 가정',
      kw: ['가족', '결혼', '사랑', '함께', '아이', '고백', '프러포즈', '데이트', '친구', '부모', '만남', '받아', '좋아', '응원', '안아', '화해', '사과'],
      act: { '가족시간': 6, '데이트': 6, '만남': 6, '집안일': 3, '친구들': 3, '자식 연락': 6, '여행': 3, '울기': 3, '구직': 4 }, stat: 'bond' },
    { k: 'health', e: '🌿', n: '건강 장수', d: '운동·검진 위주 → 100세 인생',
      kw: ['운동', '쉬', '병원', '검진', '산책', '건강', '휴식', '잠', '치료', '걷기', '수영', '등산', '요가'],
      act: { '운동': 6, '검진': 5, '병원': 5, '산책': 6, '잠자기': 5, '놀이': 2, '구직': 4 }, stat: 'hp' },
    { k: 'balance', e: '⚖️', n: '균형 잡힌 삶', d: '가장 부족한 능력을 채워 가며 고르게', kw: [], act: { '구직': 6 }, stat: null },
    { k: 'free', e: '🎲', n: '운명에 맡기기', d: '그때그때 무작위로 — 예측불가 인생', kw: [], act: {}, stat: null },
  ];
  const NEG = ['그만', '쉬자', '닫기', '다음에', '아직', '포기', '거절', '참는다', '무시', '계속 다닌다'];
  const STAT_ACTS = {
    hp: ['운동', '검진', '병원', '산책', '잠자기'], hap: ['여행', '놀이', '친구들', '취미', '노래', '옹알이'],
    smart: ['공부', '자기계발', '그림책', '회고록'], bond: ['가족시간', '집안일', '자식 연락', '울기'], look: ['꾸미기', '운동', '취미'],
  };
  const pol = () => POL.find(x => x.k === (P && P.policy)) || POL[5];

  function weakest() { return ['hp', 'hap', 'smart', 'bond', 'look'].sort((a, b) => P[a] - P[b])[0]; }
  function scoreAct(a) {
    const p = pol();
    if (a.mini) return -1;                       // 미니게임은 사람이 직접
    if (a.free && P.autoUse && P.autoUse.age === P.age && (P.autoUse.m[a.n] || 0) >= (a.n === '구직' ? 2 : 3)) return -1;
    if (['이직·퇴사', '집'].includes(a.n)) return p.k === 'money' && a.n === '집' && P.money > M(60000) ? 2 : -1;
    if (a.n === '추가근무' && !P.job) return -1;
    if (a.n === '투자' && P.money < M(1000)) return -1;
    if (a.n === '나눔' && P.money < M(3000)) return -1;
    if (a.n === '자식 연락' && !P.kids) return -1;
    let s = p.k === 'free' ? Math.random() * 5 : (p.act[a.n] || 1);
    if (p.k === 'balance') { const w = weakest(); if ((STAT_ACTS[w] || []).includes(a.n)) s += 5; }
    // 위기 대응: 방침보다 생존이 먼저
    if (P.hp < 35 && STAT_ACTS.hp.includes(a.n)) s += 6;
    if (P.hap < 28 && STAT_ACTS.hap.includes(a.n)) s += 4;
    if (P.money < 0 && ['알바', '추가근무', '구직'].includes(a.n)) s += 5;
    return s + Math.random() * 1.2;
  }
  function recommend(list) {
    if (!P || !P.alive || !P.policy) return null;
    let best = null, bs = 0;
    list.forEach(a => { if (!a.free && P.energy <= 0) return; const s = scoreAct(a); if (s > bs) { bs = s; best = a; } });
    return best;
  }
  function scoreChoice(c) {
    const p = pol(), t = (c.t + ' ' + (c.s || '')).replace(/<[^>]+>/g, '');
    if (p.k === 'free') return Math.random() * 4 - (NEG.some(w => t.includes(w)) ? 1 : 0);
    let s = 1 + Math.random() * 1.5;
    p.kw.forEach(w => { if (t.includes(w)) s += 3; });
    if (NEG.some(w => t.includes(w))) s -= 3;
    if (t.includes('★')) s += 2;
    if (['병원', '치료', '약을', '의사', '진료'].some(w => t.includes(w))) s += P.hp < 55 ? 6 : 3;   // 아플 땐 치료가 먼저
    const lv = t.match(/Lv(\d+)/); if (lv) s += +lv[1] * .4;
    const pay = t.match(/연 수입 약/); if (pay && p.k === 'money') s += 3;
    if (p.k === 'balance') { const w = weakest(), map = { hp: '건강', hap: '행복', smart: '공부', bond: '가족', look: '꾸미' }; if (t.includes(map[w])) s += 3; }
    return s;
  }
  function bestChoice(ev) {
    let bi = 0, bs = -1e9;
    ev.ch.forEach((c, i) => { const s = scoreChoice(c); if (s > bs) { bs = s; bi = i; } });
    return bi;
  }
  // 중요한 순간: 자동 진행 중이라도 멈추고 직접 고르게
  const BIG_ID = new Set(['college', 'army', 'migrate', 'biz', 'marry']);
  const BIG = ['결혼', '프러포즈', '청혼', '고백', '이별', '헤어', '창업', '이민', '전공', '이상형'];
  function isBig(ev) {
    if (ev.auto) return false;
    if (ev.id && BIG_ID.has(ev.id)) return true;
    return BIG.some(w => (ev.t || '').includes(w));
  }

  /* ---------- 자동 진행 ---------- */
  let timer = null, speed = 0, holdUntil = 0;
  const cfg = () => store.get('p8b_auto', { stopBig: true });
  function setSpeed(v) {
    speed = v; clearInterval(timer); timer = null;
    if (v) { timer = setInterval(tick, v === 2 ? 380 : 900); }
    paintAuto();
  }
  function stop(msg) { if (speed) { setSpeed(0); if (msg) toastG(msg); } }
  function tick() {
    if (!P || !P.alive || !$('#game').classList.contains('on')) { stop(); return; }
    if (performance.now() < holdUntil || $('#mini').classList.contains('on')) return;
    const ev = modalQ[0];
    if (ev) {
      if (cfg().stopBig && isBig(ev)) { stop('✋ 중요한 선택이에요. 직접 골라 주세요!'); markBig(); return; }
      if (ev.hold) { holdUntil = performance.now() + ev.hold; ev.hold = 0; return; }
      const btns = document.querySelectorAll('#sheet .chs .choice');
      const i = ev.autoPick != null ? ev.autoPick : bestChoice(ev); if (btns[i]) { btns[i].classList.add('picked'); setTimeout(() => btns[i].click(), 160); }
      return;
    }
    if (P.pendingAd) { stop(); return; }
    const list = actionList(), a = P.energy > 0 ? recommend(list) : null;
    if (a && scoreAct(a) > 0) {
      if (a.free) { if (!P.autoUse || P.autoUse.age !== P.age) P.autoUse = { age: P.age, m: {} }; P.autoUse.m[a.n] = (P.autoUse.m[a.n] || 0) + 1; }
      flashBtn(a.n); doAct(a); return;
    }
    ageUp();
  }
  function flashBtn(n) { document.querySelectorAll('#actions .act').forEach(b => { if (b.textContent.trim().endsWith(n)) { b.classList.add('auto'); setTimeout(() => b.classList.remove('auto'), 500); } }); }
  function markBig() { const s = $('#sheet'); s.classList.add('big'); setTimeout(() => s.classList.remove('big'), 1600); }
  function userTouched() { /* 사람이 직접 누르면 자동은 그대로 두되 다음 틱을 조금 늦춤 */ holdUntil = performance.now() + 900; }

  function paintAuto() {
    const b = $('#autoBar'); if (!b) return;
    const p = pol();
    b.innerHTML = `<button id="polBtn" class="polbtn">${P && P.policy ? p.e + ' ' + p.n : '🧭 방침 정하기'}</button>
      <div class="spd"><button data-s="0" class="${speed === 0 ? 'on' : ''}">⏸</button><button data-s="1" class="${speed === 1 ? 'on' : ''}">▶ 자동</button><button data-s="2" class="${speed === 2 ? 'on' : ''}">⏩ 빠르게</button></div>`;
    $('#polBtn').onclick = () => { Snd.sfx('tap'); openPolicy(true); };
    b.querySelectorAll('[data-s]').forEach(x => x.onclick = () => {
      Snd.sfx('tap'); buzz(12);
      if (+x.dataset.s && !P.policy) { openPolicy(true, () => setSpeed(+x.dataset.s)); return; }
      setSpeed(+x.dataset.s);
    });
    $('#game').classList.toggle('autoing', !!speed);
  }
  function policyHTML(cur) {
    return `<div class="polgrid">${POL.map(x => `<button data-p="${x.k}" class="${cur === x.k ? 'on' : ''}"><span>${x.e}</span><b>${x.n}</b><small>${x.d}</small></button>`).join('')}</div>`;
  }
  function openPolicy(inGame, after) {
    const c = cfg();
    openOverlay('🧭 어떻게 키울까요?', `<p class="sjnote" style="text-align:center;margin-top:-4px">고른 방침대로 행동을 추천하고, 자동 진행 때 대신 골라 줘요.</p>${policyHTML(P && P.policy)}
      <label class="chk polchk"><input type="checkbox" id="stopBig" ${c.stopBig ? 'checked' : ''}> 결혼·진학·이별 같은 중요한 순간엔 멈추고 내가 고르기</label>`, [{ t: '닫기' }]);
    document.querySelectorAll('.polgrid [data-p]').forEach(b => b.onclick = () => {
      P.policy = b.dataset.p; store.set('p8b_policy', P.policy); Snd.sfx('reveal'); buzz(20);
      store.set('p8b_auto', { stopBig: $('#stopBig').checked });
      closeOverlay(); const p = pol(); toastG(`${p.e} '${p.n}' 방침으로 키울게요`);
      if (inGame) { log(`🧭 육성 방침: ${p.e} ${p.n}`, 'good'); renderActions(); paintAuto(); }
      after && after();
    });
    $('#stopBig').onchange = e => store.set('p8b_auto', { stopBig: e.target.checked });
  }
  /* 모달마다 '방침대로 고르기' 단추 */
  function decorateModal(ev, gw) {
    if (!P || !P.policy || !ev.ch || ev.ch.length < 2 || ev.noAuto) return;
    const i = bestChoice(ev), btns = gw.querySelectorAll('.choice'); if (btns[i]) btns[i].classList.add('suggest');
    const p = pol(), b = document.createElement('button'); b.className = 'autopick';
    b.innerHTML = `${p.e} 방침대로 골라 줘`; b.onclick = () => { buzz(15); btns[i].click(); };
    gw.appendChild(b);
  }

  /* ---------- ② 나이별 미니게임 ---------- */
  const MINI = {
    baby: { e: '🧸', n: '까꿍 놀이', type: 'catch', items: ['🧸', '🍼', '🦆', '🎵', '⭐'], tip: '떠오르는 장난감을 톡톡 눌러요!', st: ['hap', 'bond'] },
    kid: { e: '🎈', n: '풍선 팡팡', type: 'catch', items: ['🎈', '🎈', '🎈', '🫧', '⭐'], tip: '풍선이 날아가기 전에 터뜨려요!', st: ['hap', 'hp'] },
    elem: { e: '🧮', n: '구구단 챌린지', type: 'quiz', tip: '15초 안에 정답을 많이 맞혀요!', st: ['smart'], sub: 'math' },
    teen: { e: '📝', n: '시험 집중력', type: 'timing', tip: '바늘이 초록 칸에 올 때 눌러요! (3번)', st: ['smart'], sub: 'kor' },
    young: { e: '🎤', n: '면접 타이밍', type: 'timing', tip: '자신감 게이지가 초록 칸일 때 대답해요!', st: ['look', 'hap'], perf: 1 },
    adult: { e: '💼', n: '마감 러시', type: 'timing', tip: '딱 맞는 순간에 결재 도장을 찍어요!', st: ['hap'], perf: 1, money: 1 },
    old: { e: '🃏', n: '추억 짝맞추기', type: 'memory', items: ['👶', '🎒', '💍', '🏠'], tip: '같은 그림 두 장을 찾아요!', st: ['smart', 'hap'] },
  };
  function extraActions(list) {
    if (!P || !P.alive) return;
    const m = MINI[stageOf(P.age).k]; if (!m) return;
    list.unshift({ e: m.e, n: P.miniAge === P.age ? '미니게임 ✓' : m.n, f: () => openMini(m), free: 1, mini: 1 });
  }
  let mg = null;
  function openMini(m) {
    if (P.miniAge === P.age) { toastG('미니게임은 1년에 한 번! 한 살 더 먹으면 다시 할 수 있어요'); return; }
    stop(); P.miniAge = P.age; Snd.sfx('levelup');
    const el = $('#mini');
    el.innerHTML = `<div class="mhead"><span>${m.e} ${m.n}</span><b id="mScore">0</b></div><div class="mtip">${m.tip}</div><div id="mArena" class="marena ${m.type}"></div><div id="mTime" class="mtime"><i></i></div>`;
    el.classList.add('on');
    mg = { m, score: 0, max: 1, done: false };
    const arena = $('#mArena');
    let n = 3; arena.innerHTML = `<div class="mcount">${n}</div>`;
    const iv = setInterval(() => { n--; if (n > 0) { arena.querySelector('.mcount').textContent = n; Snd.sfx('tick'); } else { clearInterval(iv); arena.innerHTML = ''; ({ catch: playCatch, quiz: playQuiz, timing: playTiming, memory: playMemory })[m.type](arena, m); } }, 650);
    Snd.sfx('tick');
  }
  function timeBar(sec, onEnd) {
    const i = $('#mTime i'), my = mg; i.style.transition = 'none'; i.style.width = '100%';
    requestAnimationFrame(() => { i.style.transition = `width ${sec}s linear`; i.style.width = '0%'; });
    return setTimeout(() => { if (mg === my) onEnd(); }, sec * 1000);
  }
  const setScore = v => { mg.score = v; const s = $('#mScore'); s.textContent = v; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); };
  function playCatch(arena, m) {
    mg.max = 14; let spawn = setInterval(() => {
      const d = document.createElement('button'); d.className = 'mitem'; d.textContent = m.items[R(0, m.items.length - 1)];
      d.style.left = R(6, 80) + '%'; d.style.animationDuration = (R(22, 32) / 10) + 's';
      d.onclick = () => { if (d.classList.contains('hit')) return; d.classList.add('hit'); d.textContent = '💥'; Snd.sfx('pop'); buzz(10); setScore(mg.score + 1); setTimeout(() => d.remove(), 250); };
      d.addEventListener('animationend', () => d.remove()); arena.appendChild(d);
    }, 520);
    timeBar(8, () => { clearInterval(spawn); finish(); });
  }
  function playQuiz(arena, m) {
    mg.max = 8;
    const q = () => {
      const a = R(2, 9), b = R(2, 9), ans = a * b, opts = new Set([ans]);
      while (opts.size < 3) opts.add(Math.max(1, ans + R(-3, 3) * (R(0, 1) ? 1 : a)));
      arena.innerHTML = `<div class="mq">${a} × ${b} = ?</div><div class="mopts">${[...opts].sort(() => Math.random() - .5).map(o => `<button data-o="${o}">${o}</button>`).join('')}</div>`;
      arena.querySelectorAll('[data-o]').forEach(bt => bt.onclick = () => {
        if (mg.done) return;
        const ok = +bt.dataset.o === ans; bt.classList.add(ok ? 'ok' : 'no'); buzz(ok ? 10 : 40); Snd.sfx(ok ? 'good' : 'bad');
        if (ok) setScore(mg.score + 1); setTimeout(() => !mg.done && q(), 260);
      });
    };
    q(); timeBar(15, finish);
  }
  function playTiming(arena, m) {
    mg.max = 3; let round = 0, pos = 0, dir = 1, raf, sp = 1.25;
    arena.innerHTML = `<div class="mgauge"><i class="zone"></i><i class="needle"></i></div><div class="mres"></div><button class="mtap">지금!</button>`;
    const zone = arena.querySelector('.zone'), needle = arena.querySelector('.needle');
    const z = () => { const w = 22 - round * 4, l = R(10, 88 - w); zone.style.left = l + '%'; zone.style.width = w + '%'; zone.dataset.l = l; zone.dataset.w = w; };
    z();
    let last = performance.now();
    const loop = t => { const dt = (t - last) / 1000; last = t; pos += dir * dt * 100 * sp; if (pos > 100) { pos = 100; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } needle.style.left = pos + '%'; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    $('#mTime i').style.width = '100%';
    arena.querySelector('.mtap').onclick = () => {
      if (mg.done) return;
      const l = +zone.dataset.l, w = +zone.dataset.w, c = l + w / 2, hit = pos >= l && pos <= l + w, perfect = Math.abs(pos - c) < w / 5;
      const r = arena.querySelector('.mres'); r.textContent = perfect ? 'PERFECT! ✨' : hit ? 'GREAT! 👍' : 'MISS 😵'; r.className = 'mres ' + (hit ? 'ok' : 'no');
      buzz(hit ? 15 : 50); Snd.sfx(perfect ? 'levelup' : hit ? 'good' : 'bad');
      if (hit) setScore(+(mg.score + (perfect ? 1 : .7)).toFixed(1));
      round++; sp += .45; $('#mTime i').style.width = (100 - round / 3 * 100) + '%';
      if (round >= 3) { cancelAnimationFrame(raf); setTimeout(finish, 500); } else z();
    };
  }
  function playMemory(arena, m) {
    mg.max = 4; const cards = [...m.items, ...m.items].sort(() => Math.random() - .5);
    arena.innerHTML = `<div class="mcards">${cards.map((c, i) => `<button data-i="${i}"><span>${c}</span></button>`).join('')}</div>`;
    let open = [], lock = false, tries = 0;
    arena.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      if (lock || b.classList.contains('flip') || mg.done) return;
      b.classList.add('flip'); Snd.sfx('page'); open.push(b);
      if (open.length === 2) {
        tries++; lock = true; const [x, y] = open;
        if (cards[x.dataset.i] === cards[y.dataset.i]) { setTimeout(() => { x.classList.add('ok'); y.classList.add('ok'); Snd.sfx('good'); buzz(12); setScore(mg.score + 1); open = []; lock = false; if (mg.score >= 4) setTimeout(finish, 400); }, 300); }
        else setTimeout(() => { x.classList.remove('flip'); y.classList.remove('flip'); open = []; lock = false; }, 650);
      }
    });
    timeBar(25, finish);
  }
  function finish() {
    if (mg.done) return; mg.done = true;
    const m = mg.m, r = Math.min(1, mg.score / mg.max), gr = r >= .85 ? ['S', '천재 등장!', 'fanfare'] : r >= .6 ? ['A', '아주 잘했어요!', 'good'] : r >= .3 ? ['B', '좋아요!', 'pop'] : ['C', '다음엔 더 잘할 수 있어요', 'bad'];
    const gain = Math.round(2 + r * 8), o = {};
    m.st.forEach(k => o[k] = gain);
    if (m.money && P.job) o.money = Math.round(P.jobPay * .04 * r);
    if (m.sub && P.sub) P.sub[m.sub] = clamp(P.sub[m.sub] + Math.round(r * 6));
    if (m.perf && P.job) P.perf = clamp((P.perf || 50) + Math.round(r * 10));
    const el = $('#mini');
    el.innerHTML = `<div class="mend"><div class="mgrade g${gr[0]}">${gr[0]}</div><h3>${gr[1]}</h3><p>${m.e} ${m.n} · ${mg.score}점</p>
      <div class="mgain">${Object.entries(o).map(([k, v]) => `<span style="color:${COL[k]}">${k === 'money' ? '💰 ' + usd(v) : ICON[k] + ' +' + v}</span>`).join('')}${m.sub ? `<span>📚 ${m.sub === 'math' ? '수학' : '국어'} +${Math.round(r * 6)}</span>` : ''}${m.perf && P.job ? `<span>📈 성과 +${Math.round(r * 10)}</span>` : ''}</div>
      <button class="bigbtn sm" id="mDone">좋아요!</button></div>`;
    Snd.sfx(gr[2]); if (gr[0] === 'S' || gr[0] === 'A') { confetti(); playAnim('cheer'); }
    $('#mDone').onclick = () => { el.classList.remove('on'); fx(o); log(`${m.e} ${m.n} ${gr[0]}등급 (${mg.score}점)`, r >= .6 ? 'good' : ''); if (gr[0] === 'S') badge(`${m.n} 천재`); renderActions(); };
  }

  /* ---------- ③ 시기별 성장 리포트 ---------- */
  const KS = ['hap', 'hp', 'smart', 'look', 'bond'];
  const snapNow = () => ({ age: P.age, money: P.money, ...Object.fromEntries(KS.map(k => [k, P[k]])), sub: P.sub ? { ...P.sub } : {}, hl: P.hlv ? { ...P.hlv } : {} });
  function stageReport() {
    const s0 = P.stageSnap || { age: 0, money: 0, hap: 50, hp: 60, smart: 30, look: 40, bond: 55, sub: {}, hl: {} }, prev = stageOf(P.age - 1);
    const rows = KS.map(k => { const d = P[k] - s0[k]; return `<div class="grow-r"><span>${ICON[k]} ${LAB[k]}</span><i class="hbar"><i style="width:${P[k]}%;background:${COL[k]}"></i></i><b class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}</b></div>`; }).join('');
    const best = KS.slice().sort((a, b) => (P[b] - s0[b]) - (P[a] - s0[a]))[0];
    const subs = P.sub ? Object.entries(P.sub).filter(([k, v]) => v - (s0.sub[k] || 0) >= 8).map(([k]) => (SUBJ.find(x => x.k === k) || {}).n).filter(Boolean) : [];
    const hob = P.hlv ? Object.entries(P.hlv).filter(([k, v]) => v > (s0.hl[k] || 0)).map(([k, v]) => `${k} Lv${v}`) : [];
    const total = KS.reduce((t, k) => t + P[k], 0) / 5, stars = total >= 75 ? 5 : total >= 63 ? 4 : total >= 52 ? 3 : total >= 40 ? 2 : 1;
    const tip = { smart: '공부 머리가 트였어요', hp: '몸이 튼튼해졌어요', hap: '밝고 긍정적으로 자랐어요', bond: '가족과 더 가까워졌어요', look: '매력이 반짝이기 시작했어요' }[best];
    const p = pol();
    P.stageSnap = snapNow();
    showModal({
      e: '🌱', t: `${prev.n} 시기 성장 리포트`, auto: 1, hold: 2600, noAuto: 1, autoPick: 0,
      html: () => `<div class="growrep"><div class="stars">${'★'.repeat(stars)}<span>${'★'.repeat(5 - stars)}</span></div>
        <p class="gtip">${P.name}은(는) ${s0.age}~${P.age - 1}살 동안 <b>${tip}</b></p>${rows}
        ${subs.length || hob.length ? `<div class="gtags">${subs.map(x => `<span>📚 ${x} 실력↑</span>`).join('')}${hob.map(x => `<span>🎯 ${x}</span>`).join('')}</div>` : ''}
        <p class="gnext">이제 <b>${stageOf(P.age).n}</b> 시기예요.${P.policy ? ` 지금 방침: ${p.e} ${p.n}` : ''}</p></div>`,
      ch: [{ t: '계속 키우기 ▶', f: () => { confetti(); } }, { t: '🧭 방침 바꾸기', f: () => setTimeout(() => openPolicy(true), 200) }],
    });
  }

  /* ---------- ④ 화면 반응 ---------- */
  function toastG(t) { if (typeof Hub !== 'undefined') Hub.toast(t); }
  function confetti(n = 28) {
    const L = $('#floatLayer'); if (!L) return;
    const cols = ['#ffcc4d', '#ff6b81', '#5ec8ff', '#5be08f', '#c58bff', '#ff8a3d'];
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'conf'; c.style.left = R(5, 95) + '%'; c.style.background = cols[i % cols.length]; c.style.animationDelay = (Math.random() * .3) + 's'; c.style.setProperty('--dx', R(-60, 60) + 'px'); c.style.setProperty('--r', R(-360, 360) + 'deg'); L.appendChild(c); setTimeout(() => c.remove(), 1800); }
  }
  function shake() { const s = $('#stageWrap'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
  function agePop(stageChanged) {
    const L = $('#floatLayer'); if (!L) return;
    const d = document.createElement('div'); d.className = 'agepop' + (stageChanged ? ' stage' : '');
    d.innerHTML = stageChanged ? `<small>새로운 시기</small>${stageOf(P.age).n}<em>${P.age}살</em>` : `🎂 ${P.age}살`;
    L.appendChild(d); setTimeout(() => d.remove(), stageChanged ? 2000 : 1100);
    const a = $('#ageBig'); a.classList.remove('bump'); void a.offsetWidth; a.classList.add('bump');
    if (stageChanged) confetti(36);
  }
  // 능력치 변화 반짝임 + 큰 변화엔 흔들림/꽃가루
  let prev = null;
  function afterStats() {
    if (!P) return;
    const cur = { ...Object.fromEntries(KS.map(k => [k, P[k]])), money: P.money };
    if (prev && prev.name === P.name && prev.age0 === P.birth.y) {
      document.querySelectorAll('#stats .stat').forEach((el, i) => {
        const k = KS[i], d = cur[k] - prev[k]; if (!d) return;
        el.classList.add(d > 0 ? 'up' : 'down');
        if (d <= -8) shake();
        [[80, '🌟'], [90, '👑']].forEach(([th, e]) => { if (prev[k] < th && cur[k] >= th) { toastG(`${e} ${LAB[k]} ${th} 돌파!`); confetti(18); Snd.sfx('levelup'); } });
      });
      const mb = $('#moneyBox'), dm = cur.money - prev.money;
      if (mb && dm) mb.classList.add(dm > 0 ? 'up' : 'down');
    }
    prev = { ...cur, name: P.name, age0: P.birth.y };
  }

  function init() {
    // 자동 진행 바 + 미니게임 판 추가
    const bar = document.createElement('div'); bar.id = 'autoBar'; $('#game').insertBefore(bar, $('#actions'));
    const mini = document.createElement('div'); mini.id = 'mini'; $('#game').appendChild(mini);
    // 출생 화면: 육성 유형 고르기
    const rb = $('#rollBtns'), pw = document.createElement('div'); pw.id = 'rollPolicy';
    rb.insertBefore(pw, rb.firstChild);
    const paintRoll = () => {
      const cur = store.get('p8b_policy', null);
      pw.innerHTML = `<div class="jua" style="margin:6px 0 4px">🧭 어떻게 키울까요?</div><div class="polrow">${POL.map(x => `<button data-p="${x.k}" class="${cur === x.k ? 'on' : ''}" title="${x.d}">${x.e}<small>${x.n}</small></button>`).join('')}</div><div class="poldesc">${cur ? (POL.find(x => x.k === cur) || {}).d : '고르면 행동 추천과 자동 진행을 쓸 수 있어요 (나중에 바꿔도 돼요)'}</div>`;
      pw.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { store.set('p8b_policy', b.dataset.p); Snd.sfx('tap'); buzz(10); paintRoll(); });
    };
    paintRoll();
    // 기존 함수 연결
    const _begin = beginLife;
    beginLife = function () { setSpeed(0); prev = null; P.policy = store.get('p8b_policy', null); _begin(); P.stageSnap = snapNow(); paintAuto(); if (P.policy) log(`🧭 육성 방침: ${pol().e} ${pol().n}`, 'good'); };
    const _start = startRoll; startRoll = function () { _start(); paintRoll(); };
    const _rs = renderStats; renderStats = function () { _rs(); afterStats(); };
    const _die = die; die = function (r) { stop(); return _die(r); };
  }
  return { init, extraActions, recommend, decorateModal, stageReport, agePop, userTouched, confetti, setSpeed, POL };
})();
window.Grow = Grow;
Grow.init();
