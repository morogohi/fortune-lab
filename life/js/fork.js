/* =====================================================================
 *  fork.js — 갈림길 극장 · 평행 인생
 *   ① 인생의 중요한 갈림길에서 "두 갈래 인생 미리 보기"
 *      같은 사주·같은 능력치·같은 육성 방침으로 각 선택지를 끝까지 살아 보고(가상 실행)
 *      10년 뒤 모습과 인생의 끝(5분야 평가·등급·수명)을 나란히 비교한 뒤 직접 고른다.
 *   ② 인생이 끝나면 "그때 다른 길을 갔다면?" — 갈림길로 돌아가 다른 선택으로 다시 살고,
 *      엔딩에서 지난 인생과 이번 인생을 나란히 비교한다.
 *   가상 실행 중에는 화면·소리·저장·광고·카르마를 건드리지 않고, 끝나면 원래 상태로 되돌린다.
 * ===================================================================== */
const Fork = (() => {
  const FREE = 3, KARMA_COST = 3, RUNS = 3, CP_KEY = 'p8b_forks', CP_MAX = 6;
  const ST = window.setTimeout.bind(window);
  let busy = false;
  const mem = new Map();                       // 갈림길 사건 객체 (함수가 있어 저장 불가 → 이 세션 메모리)

  /* ---------- 가상 실행 환경 ---------- */
  const noop = () => { };
  function enterSim() {
    const g = window, S = {
      P0: P, mq: modalQ.slice(), karma, hist: hist.slice(), lastLog, ages: {},
      fn: {}, obj: [], st: [Storage.prototype.setItem, Storage.prototype.removeItem], hatch: window.HATCH_OFF,
      sheet: $('#sheet').innerHTML, modalOn: $('#modal').classList.contains('on'),
    };
    ['log', 'renderStats', 'renderActions', 'playAnim', 'cutin', 'floatText', 'say', 'snapAlbum', 'openNext', 'show', 'die'].forEach(k => { S.fn[k] = g[k]; });
    const so = (o, k, v) => { if (o && k in o) { S.obj.push([o, k, o[k]]); o[k] = v; } };
    S.logs = [];
    g.log = (t, c = '') => { lastLog = t; S.logs.push([P.age, t, c]); };
    g.renderStats = g.renderActions = g.playAnim = g.cutin = g.floatText = g.say = g.snapAlbum = g.show = g.openNext = noop;
    g.die = r => { P.alive = false; P.deathReason = r; modalQ = []; };
    so(Snd, 'sfx', noop); so(Snd, 'mood', noop); so(window.Native, 'vibrate', noop);
    so(Hub, 'toast', noop); so(window.Ads, 'canReward', () => false); so(window.Ads, 'showReward', (cb) => cb && cb(false));
    so(window.World, 'rhythm', (t, done) => done && done(.7, 'B')); so(window.World, 'goTo', noop);
    ['confetti', 'agePop', 'stageReport', 'refresh'].forEach(k => so(window.Grow, k, noop));
    // 안전망: 가상 실행 중 화면에 새로 붙는 요소(연출·미니게임 등)를 모아 두었다가 끝나면 제거
    S.added = []; S.miniOn = !!($('#mini') && $('#mini').classList.contains('on'));
    S.mo = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) S.added.push(n); })));
    S.mo.observe(document.body, { childList: true, subtree: true });
    Storage.prototype.setItem = noop; Storage.prototype.removeItem = noop;   // 가상 실행이 저장·시즌 포인트를 바꾸지 않게
    window.HATCH_OFF = 1;
    return S;
  }
  function exitSim(S) {
    const g = window;
    try { S.mo.disconnect(); S.mo.takeRecords().forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) S.added.push(n); })); } catch (e) { }
    const ov = $('#overlay');
    S.added.forEach(n => { if (n.isConnected && !(ov && ov.contains(n))) n.remove(); });
    const mini = $('#mini'); if (mini && !S.miniOn) { mini.classList.remove('on'); }
    Object.entries(S.fn).forEach(([k, f]) => { g[k] = f; });
    S.obj.reverse().forEach(([o, k, v]) => { o[k] = v; });
    [Storage.prototype.setItem, Storage.prototype.removeItem] = S.st;
    window.HATCH_OFF = S.hatch;
    P = S.P0; modalQ = S.mq; karma = S.karma; hist = S.hist; lastLog = S.lastLog;
  }
  // 동기 실행 구간: 그 사이 예약되는 타이머(연출용)는 버림
  function sync(fn) {
    const T = window.setTimeout; window.setTimeout = () => 0;
    try { return fn(); } finally { window.setTimeout = T; }
  }

  /* ---------- 한 갈래 살아 보기 ---------- */
  function pickIn(ev, i) {
    const c = ev.ch[i] || ev.ch[0]; modalQ.shift(); lastLog = '';
    try { c.f(); } catch (e) { }
    if (ev.id && KEY_EV.has(ev.id)) P.moments.push({ a: P.age, e: ev.e, t: ev.t, c: String(c.t).replace(/<[^>]+>/g, ''), r: lastLog });
    try { checkBucket(); checkDeath(); } catch (e) { }
  }
  function* liveOut(base, ev, ci) {
    P = Save.unpack(base); P.policy = P.policy || 'balance'; modalQ = [ev];
    const a0 = P.age, m0 = P.moments.length, L0 = S_.logs.length;
    let at10 = null, ops = 0, yearOps = 0, guard = 0;
    sync(() => pickIn(ev, ci));
    while (P.alive && P.age < 112 && guard++ < 40000) {
      sync(() => {
        for (let n = 0; n < 40 && P.alive; n++) {
          if (modalQ.length) { const e = modalQ[0]; pickIn(e, e.autoPick != null ? e.autoPick : Grow.bestChoice(e)); continue; }
          let a = null;
          if (P.energy > 0 && yearOps < 8) { const l = actionList(); a = Grow.recommend(l); if (a && Grow.scoreAct(a) <= 0) a = null; }
          if (a) {
            yearOps++;
            if (a.free) { if (!P.autoUse || P.autoUse.age !== P.age) P.autoUse = { age: P.age, m: {} }; P.autoUse.m[a.n] = (P.autoUse.m[a.n] || 0) + 1; }
            try { doAct(a); } catch (e) { }
            continue;
          }
          const was = P.age; try { ageUp(); } catch (e) { P.age++; } yearOps = 0;
          if (P.age === was && !modalQ.length) P.age++;   // 막힘 방지
          if (!at10 && P.age >= a0 + 10) at10 = snapAt();
        }
      });
      ops++; if (ops % 2 === 0) yield;                    // 화면이 멈추지 않게 조금씩
    }
    if (!at10) at10 = snapAt();
    const avg = Math.round(P.lifeHap / Math.max(1, P.age));
    const E = lifeEval(avg);
    return {
      at10, E, age: P.age, reason: P.deathReason || '', peak: P.peak, title: lifeTitle(avg), avg,
      married: !!(P.married || P.widowed), kids: P.kids || 0, job: P.bestRank || (P.job ? P.job.n : ''),
      moments: P.moments.slice(m0).filter(m => m.a > a0 || m.t !== ev.t).slice(0, 4),
      lines: S_.logs.slice(L0).filter(([, , c]) => c === 'good' || c === 'bad').slice(0, 40),
    };
  }
  function snapAt() {
    return { age: P.age, money: P.money, job: P.retired ? '은퇴' : P.job ? P.job.n : P.age < 23 && P.inSchool ? '학생' : '무직', married: !!P.married, kids: P.kids || 0,
      hap: P.hap, hp: P.hp, alive: P.alive, home: (typeof HOMES !== 'undefined' && HOMES[P.home.type] || {}).n || '' };
  }
  let S_ = null;
  function simulate(ev, onProg, prep) {
    return new Promise(res => {
      if (window.Grow) Grow.setSpeed(0);
      const keep = { log: $('#log').innerHTML, tag: ($('#nameTag') || {}).textContent };
      let base = prep ? null : Save.pack();
      S_ = enterSim(); S_.keep = keep;
      if (prep) { try { base = sync(prep); } catch (e) { console.warn('fork prep', e && e.stack); } }
      const out = ev.ch.map(() => []), jobs = [];
      if (base) ev.ch.slice(0, 3).forEach((c, ci) => { for (let r = 0; r < RUNS; r++) jobs.push(ci); });
      let j = 0, it = null;
      const step = () => {
        try {
          const t0 = performance.now();
          while (performance.now() - t0 < 30) {
            if (!it) { if (j >= jobs.length) break; it = liveOut(base, ev, jobs[j]); }
            const n = it.next();
            if (n.done) { out[jobs[j]].push(n.value); it = null; j++; onProg && onProg(j / jobs.length); }
          }
        } catch (e) { console.warn('fork sim', e && e.stack); it = null; j++; }
        if (j < jobs.length) { ST(step, 0); return; }
        const S = S_; S_ = null; exitSim(S);
        $('#log').innerHTML = S.keep.log; if ($('#nameTag') && S.keep.tag != null) $('#nameTag').textContent = S.keep.tag;
        if (P) finishRestore(S);
        res(out.slice(0, Math.min(3, ev.ch.length)).filter(x => x.length));
      };
      ST(step, 30);
    });
  }
  // 상담용: 내 생년월일로 태어난 가상 인물을 지금 나이까지 키운 뒤, 선택지(방침)별로 끝까지 살아 봄
  function simulateVirtual(me, choices, onProg) {
    const ev = { t: me.q || '상담 갈림길', ch: choices.map(c => ({ t: c.t, f: () => { P.policy = c.pol; if (c.fx) c.fx(P); } })) };
    const prep = () => {
      newLife({ birth: me.birth, male: me.male, country: '한국', cls: 2, name: '나' }); beginLife(); P.policy = 'balance'; modalQ = [];
      let g = 0, yearOps = 0;
      while (P.alive && P.age < me.age && g++ < 20000) {
        if (modalQ.length) { const e = modalQ[0]; pickIn(e, e.autoPick != null ? e.autoPick : Grow.bestChoice(e)); continue; }
        let a = null;
        if (P.energy > 0 && yearOps < 6) { a = Grow.recommend(actionList()); if (a && Grow.scoreAct(a) <= 0) a = null; }
        if (a) { yearOps++; if (a.free) { if (!P.autoUse || P.autoUse.age !== P.age) P.autoUse = { age: P.age, m: {} }; P.autoUse.m[a.n] = (P.autoUse.m[a.n] || 0) + 1; } try { doAct(a); } catch (e) { } continue; }
        const was = P.age; try { ageUp(); } catch (e) { P.age++; } yearOps = 0; if (P.age === was && !modalQ.length) P.age++;
      }
      if (!P.alive) { P.alive = true; P.hp = Math.max(P.hp, 50); P.deathReason = null; }   // 가상 성장 중 사고는 무시
      modalQ = [];
      return Save.pack();
    };
    return simulate(ev, onProg, prep);
  }
  function finishRestore(S) {
    try { renderStats(); renderActions(); } catch (e) { }
    if (modalQ.length) openNext(); else if (!S.modalOn) $('#modal').classList.remove('on');
  }

  /* ---------- 결과 정리 ---------- */
  const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const KS = ['wealth', 'bond', 'health', 'achieve', 'joy'];
  function agg(rs) {
    const A = {}; KS.forEach(k => { A[k] = Math.round(mean(rs.map(r => r.E.A[k]))); });
    const total = Math.round(mean(rs.map(r => r.E.total)));
    const grade = total >= 82 ? 'S' : total >= 70 ? 'A' : total >= 56 ? 'B' : total >= 42 ? 'C' : 'D';
    const ages = rs.map(r => r.age), live = rs.map(r => r.at10).filter(x => x.alive), t10 = live.length ? live : rs.map(r => r.at10);
    return { A, total, grade, type: rs[0].E.type, title: rs[0].title, amin: Math.min(...ages), amax: Math.max(...ages),
      money10: mean(t10.map(x => x.money)), hap10: Math.round(mean(t10.map(x => x.hap))), hp10: Math.round(mean(t10.map(x => x.hp))),
      age10: rs[0].at10.alive ? t10[0].age : (live[0] || { age: 0 }).age, job10: t10[0].job, home10: t10[0].home, alive10: live.length > 0, dead10: rs.length - live.length, n: rs.length,
      mar: Math.round(rs.filter(r => r.married).length / rs.length * 100), kids: mean(rs.map(r => r.kids)),
      peak: mean(rs.map(r => r.peak)), moments: rs[0].moments, reason: rs[0].reason };
  }
  const plain = t => String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const L = ['A', 'B', 'C'], GC = { S: 'var(--hap)', A: 'var(--money)', B: 'var(--smart)', C: 'var(--look)', D: 'var(--hp)' };
  function theaterHTML(ev, R) {
    const N = R.length, best = KS.map(k => Math.max(...R.map(r => r.A[k])));
    const card = (r, i) => `<div class="fk-card"><div class="fk-lab">${L[i]}의 인생</div><div class="fk-ch">${plain(ev.ch[i].t)}</div>
      <div class="fk-sec">⏩ 10년 뒤${r.alive10 ? ` · ${r.age10}살` : ''}</div>
      <ul class="fk-ul">${r.alive10 ? `<li>💰 ${usd(r.money10)}</li><li>💼 ${r.job10}</li><li>${r.home10 ? '🏠 ' + r.home10 : ''}</li><li>😊 행복 ${r.hap10} · ❤️ 건강 ${r.hp10}</li>${r.dead10 ? `<li class="fk-warn">⚠️ ${r.n}번 중 ${r.dead10}번은 10년 안에 세상을 떠났어요</li>` : ''}` : '<li class="fk-warn">🕊️ 미리 살아 본 모든 경우 10년을 넘기지 못했어요</li>'}</ul>
      <div class="fk-sec">🎬 인생의 끝</div>
      <div class="fk-grade" style="color:${GC[r.grade]}">${r.grade}<small>${r.total}점</small></div>
      <div class="fk-type">${r.type}</div>
      <div class="fk-meta">향년 ${r.amin === r.amax ? r.amin : r.amin + '~' + r.amax}세 · 결혼 ${r.mar}% · 자녀 ${r.kids.toFixed(1)}명</div>
      ${r.moments.length ? `<div class="fk-sec">📼 이 길에서 생길 일</div><div class="fk-mo">${r.moments.slice(0, 3).map(m => `<div>${m.a}살 ${m.e} ${m.t}</div>`).join('')}</div>` : ''}
      <button class="bigbtn sm fk-go" data-i="${i}">${L[i]} 길로 간다</button></div>`;
    return `<div class="fk-curtain"></div>
      <p class="fk-nar">“${P.name}, ${P.age}살. 인생의 갈림길 앞에 섰습니다.<br><b>${plain(ev.t)}</b> — 어느 쪽을 택하느냐에 따라 인생은 이렇게 달라집니다.”</p>
      <div class="fk-grid n${N}">${R.map(card).join('')}</div>
      <div class="fk-cmp"><div class="fk-cmph"><span></span>${R.map((r, i) => `<b>${L[i]}</b>`).join('')}</div>
        ${KS.map((k, x) => `<div class="fk-row"><span>${EVAL_N[k][0]} ${EVAL_N[k][1]}</span>${R.map(r => `<i class="${r.A[k] === best[x] && N > 1 ? 'win' : ''}"><em style="width:${r.A[k]}%"></em><small>${r.A[k]}</small></i>`).join('')}</div>`).join('')}</div>
      ${typeof Counsel !== 'undefined' ? Counsel.forGame(ev, R) : ''}
      <p class="sjnote" style="text-align:center">같은 사주·같은 능력치로 갈래마다 ${RUNS}번씩 미리 살아 본 예상이에요.<br>실제 인생은 운과 앞으로의 선택에 따라 달라질 수 있어요.</p>`;
  }

  /* ---------- 미리 보기 버튼 · 극장 ---------- */
  const usedTxt = () => { const u = P.forkUsed || 0; return u < FREE ? `무료 ${FREE - u}회 남음` : `카르마 ${KARMA_COST}`; };
  function decorate() {
    const ev = modalQ[0]; if (!ev || !P || !P.alive || busy || S_) return;
    const sh = $('#sheet'), gw = sh.querySelector('.chs'); if (!gw || sh.querySelector('.fk-open')) return;
    const n = ev.ch.length;
    if (!(window.Grow && Grow.isBig(ev)) || n < 2 || n > 4 || ev.noFork) return;
    if (P.parallel && P.parallel.cpT === ev.t && P.parallel.cpAge === P.age && !P.parallel.used) markPrev(ev, gw);
    const b = document.createElement('button'); b.className = 'fk-open';
    b.innerHTML = `🎬 갈림길 극장: 선택별 인생 미리 보기 <small>${usedTxt()}</small>`;
    b.onclick = e => { e.stopPropagation(); openTheater(ev); };
    gw.before(b);
  }
  function markPrev(ev, gw) {
    const i = P.parallel.prevCi, btn = gw.querySelectorAll('.choice')[i]; if (!btn) return;
    btn.classList.add('fk-prev'); btn.insertAdjacentHTML('beforeend', '<small class="fk-prevt">⏪ 지난 인생에서 고른 길</small>');
  }
  async function openTheater(ev) {
    if (busy) return;
    const u = P.forkUsed || 0;
    if (u >= FREE) {
      if (karma < KARMA_COST) { Hub.toast(`무료 미리 보기를 다 썼어요 · 카르마 ${KARMA_COST}가 필요해요`); return; }
      karma -= KARMA_COST; saveMeta();
    }
    P.forkUsed = u + 1;
    busy = true; Snd.sfx('reveal');
    openOverlay('🎬 갈림길 극장', `<div class="fk-load"><div class="fk-reel">🎞️</div><p>${ev.ch.slice(0, 3).map((c, i) => `${L[i]}의 인생`).join(' · ')}을 미리 살아 보는 중…</p><div class="fk-bar"><i id="fkBar"></i></div></div>`, []);
    const t0 = performance.now();
    let R;
    try { R = (await simulate(ev, p => { const b = $('#fkBar'); if (b) b.style.width = Math.round(p * 100) + '%'; })).map(agg); }
    catch (e) { console.warn(e); busy = false; closeOverlay(); Hub.toast('미리 보기를 만들지 못했어요'); return; }
    busy = false;
    if (performance.now() - t0 < 900) await new Promise(r => ST(r, 900 - (performance.now() - t0)));
    Snd.sfx('fanfare');
    openOverlay('🎬 갈림길 극장', theaterHTML(ev, R), [{ t: '조금 더 생각해 볼게요' }]);
    $('#osheet').classList.add('fk-sheet');
    document.querySelectorAll('.fk-go').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; closeOverlay();
      const btn = $('#sheet .chs').querySelectorAll('.choice')[i];
      if (window.cutin) cutin('🎬', '좋아, 이 길이다!', plain(ev.ch[i].t));
      if (btn) ST(() => btn.click(), 350);
    });
  }

  /* ---------- 갈림길 기록 (다른 선택으로 다시 살기용) ---------- */
  const cps = () => store.get(CP_KEY, null);
  function record(ev, ci) {
    if (!P || !P.alive || S_ || !(window.Grow && Grow.isBig(ev)) || ev.ch.length < 2) return;
    P.lifeId = P.lifeId || ('L' + Date.now().toString(36));
    const key = P.lifeId + ':' + P.age + ':' + ev.t;
    mem.set(key, ev);
    const pk = Save.pack();
    let o = cps(); if (!o || o.id !== P.lifeId) o = { id: P.lifeId, list: [] };
    o.list = o.list.filter(x => x.key !== key && x.age <= P.age);
    o.list.push({ key, age: P.age, t: plain(ev.t), e: ev.e, ci, chs: ev.ch.map(c => plain(c.t)), evId: ev.id || null, pack: pk });
    while (o.list.length > CP_MAX) o.list.shift();
    try { localStorage.setItem(CP_KEY, JSON.stringify(o)); } catch (e) { o.list.splice(0, o.list.length - 2); try { localStorage.setItem(CP_KEY, JSON.stringify(o)); } catch (e2) { } }
  }
  function evFor(cp) { return mem.get(cp.key) || (cp.evId && EVENTS.find(e => e.id === cp.evId)) || null; }

  /* ---------- 엔딩: 평행 인생 ---------- */
  function endBox() {
    const end = $('#end'); if (!end || end.querySelector('.fk-end') || !P || P.alive) return;
    const avg = Math.round(P.lifeHap / Math.max(1, P.age)), E = lifeEval(avg);
    let html = '';
    const pv = P.parallel && P.parallel.prev;
    if (pv) {
      const cur = { A: E.A, total: E.total, grade: E.grade, type: E.type, age: P.age, peak: P.peak, title: lifeTitle(avg), married: !!(P.married || P.widowed), kids: P.kids || 0 };
      const col = (x, lab, ch) => `<div class="fk-card"><div class="fk-lab">${lab}</div><div class="fk-ch">${ch}</div>
        <div class="fk-grade" style="color:${GC[x.grade]}">${x.grade}<small>${x.total}점</small></div><div class="fk-type">${x.type}</div>
        <div class="fk-meta">「${x.title}」<br>향년 ${x.age}세 · 최고 자산 ${usd(x.peak)}<br>${x.married ? '결혼' : '미혼'}${x.kids ? ` · 자녀 ${x.kids}명` : ''}</div></div>`;
      const best = KS.map(k => Math.max(pv.A[k], cur.A[k]));
      html += `<div class="box fk-end"><div class="jua sec">🔀 평행 인생 비교 · ${P.parallel.cpAge}살 「${P.parallel.cpT}」</div>
        <div class="fk-grid n2">${col(pv, '지난 인생', pv.chose)}${col(cur, '이번 인생', P.parallel.chose || '다른 길')}</div>
        <div class="fk-cmp"><div class="fk-cmph"><span></span><b>지난</b><b>이번</b></div>
        ${KS.map((k, x) => `<div class="fk-row"><span>${EVAL_N[k][0]} ${EVAL_N[k][1]}</span>${[pv, cur].map(r => `<i class="${r.A[k] === best[x] ? 'win' : ''}"><em style="width:${r.A[k]}%"></em><small>${r.A[k]}</small></i>`).join('')}</div>`).join('')}</div>
        <p class="fk-verdict">${cur.total > pv.total + 3 ? '🎉 다른 길을 택한 이번 인생이 더 좋은 평가를 받았어요.' : cur.total < pv.total - 3 ? '🤔 지난 인생의 선택이 더 나았네요. 그래도 가 보지 않은 길을 알게 됐어요.' : '⚖️ 두 인생의 평가는 비슷해요. 무엇을 얻고 잃었는지가 달랐을 뿐이에요.'}</p></div>`;
    }
    const o = cps(), list = o && o.id === P.lifeId ? o.list.filter(evFor).slice(-4).reverse() : [];
    if (list.length) {
      html += `<div class="box fk-end fk-redo"><div class="jua sec">🔀 그때 다른 길을 갔다면?</div>
        <p class="sjnote">갈림길로 돌아가 같은 사주·같은 상황에서 다른 선택으로 다시 살아 봐요. 끝나면 이번 인생과 나란히 비교해 드려요.</p>
        ${list.map((c, i) => `<button class="fk-cp" data-k="${c.key}"><b>${c.age}살 ${c.e} ${c.t}</b><small>그때 고른 길: ${c.chs[c.ci]}</small></button>`).join('')}</div>`;
    }
    if (!html) return;
    const at = end.querySelector('.evalbox') || end.querySelector('#lifeTitle');
    if (at) at.insertAdjacentHTML('afterend', html);
    end.querySelectorAll('.fk-cp').forEach(b => b.onclick = () => redo(b.dataset.k, E, avg));
  }
  function redo(key, E, avg) {
    const o = cps(), cp = o && o.list.find(x => x.key === key), ev = cp && evFor(cp);
    if (!ev) { Hub.toast('이 갈림길은 다시 열 수 없어요'); return; }
    const prev = { A: E.A, total: E.total, grade: E.grade, type: E.type, age: P.age, peak: P.peak, title: lifeTitle(avg), married: !!(P.married || P.widowed), kids: P.kids || 0, chose: cp.chs[cp.ci] };
    openOverlay('🔀 다른 길로 다시 살기', `<p class="sjtxt" style="text-align:center">${cp.age}살 「${cp.t}」로 돌아가요.<br>지난번엔 <b>${cp.chs[cp.ci]}</b>을(를) 골랐어요.<br>이번엔 다른 길을 골라 보세요.</p>`,
      [{ t: '⏪ 그 순간으로 돌아가기', pri: 1, f: () => {
        if (!Save.loadPack(cp.pack, `⏪ ${cp.age}살 「${cp.t}」 갈림길로 돌아왔다 — 이번엔 다른 길로`)) return;
        P.alive = true; P.lifeId = o.id; P.forkUsed = Math.max(0, (P.forkUsed || 0) - 1);
        P.parallel = { prev, cpT: cp.t, cpAge: cp.age, prevCi: cp.ci };
        o.list = o.list.filter(x => x.age <= cp.age); try { localStorage.setItem(CP_KEY, JSON.stringify(o)); } catch (e) { }
        modalQ = [ev]; openNext();
      } }, { t: '취소' }]);
  }
  function chosen(ev, ci) {
    if (P && P.parallel && !P.parallel.used && P.parallel.cpT === plain(ev.t) && P.parallel.cpAge === P.age) { P.parallel.used = 1; P.parallel.chose = plain(ev.ch[ci].t); }
  }

  function init() {
    const _on = openNext; openNext = function () { _on(); try { decorate(); } catch (e) { console.warn(e); } };
    // 큰 선택을 누르는 순간(처리 전) 갈림길을 기록
    $('#sheet').addEventListener('click', e => {
      const b = e.target.closest('.chs .choice'); if (!b || S_) return;
      const ev = modalQ[0]; if (!ev) return;
      const ci = [...$('#sheet .chs').querySelectorAll('.choice')].indexOf(b); if (ci < 0) return;
      try { record(ev, ci); chosen(ev, ci); } catch (er) { console.warn(er); }
    }, true);
    const _show = show; show = function (id) { _show(id); if (id === 'end') ST(endBox, 200); };
    const _beg = beginLife; beginLife = function () { _beg(); P.lifeId = 'L' + Date.now().toString(36); P.forkUsed = 0; P.parallel = null; };
  }
  init();
  return { simulate, simulateVirtual, openTheater, agg, KS, get busy() { return busy || !!S_; } };
})();
