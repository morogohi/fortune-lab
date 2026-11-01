/* =====================================================================
 *  net.js — 넷시티 (전 세계 플레이어가 모이는 가상 도시)
 *   시즌 이벤트: 🎹 합주 콘서트 · 🎓 동창회 · 🌐 광장
 *   시즌 패스: 무료 트랙 + 프리미엄 트랙(인앱 '넷시티 시즌 패스')
 *   ※ 지금은 혼자 하기 모드 — 다른 플레이어 자리는 AI 친구가 채워요
 *  + 테스트 도구(QA 패널) · 빨리 감기
 * ===================================================================== */
const Net = (() => {
  /* ---------- 시즌: 실제 달력 기준 3개월 단위 ---------- */
  function season(d = new Date()) {
    const y = d.getFullYear(), m = d.getMonth() + 1, q = m === 12 ? 4 : Math.floor(m / 3);   // 12~2 겨울, 3~5 봄, 6~8 여름, 9~11 가을
    const yy = m <= 2 ? y - 1 : y, names = ['겨울', '봄', '여름', '가을', '겨울'], emo = ['❄️', '🌸', '☀️', '🍁', '❄️'];
    const end = new Date(m === 12 ? y + 1 : y, [2, 5, 8, 11, 2][q], 1);
    return { id: `${yy}${['W', 'P', 'S', 'F', 'W'][q]}`, n: `${yy} ${names[q]} 시즌`, e: emo[q], end, days: Math.max(0, Math.ceil((end - d) / 864e5)) };
  }
  const TIER_PTS = 3, TIERS = 10;
  const REWARD = {
    free: { 2: ['✨ 카르마 +5', () => karmaAdd(5)], 4: ['🧧 복주머니 3', () => pouchAdd(3)], 6: ['✨ 카르마 +10', () => karmaAdd(10)], 8: ['🧧 복주머니 5', () => pouchAdd(5)], 10: ['🏅 칭호 「넷시티 단골」', () => badgeG('넷시티 단골')] },
    prem: { 1: ['✨ 카르마 +15', () => karmaAdd(15)], 2: ['🧧 복주머니 5', () => pouchAdd(5)], 3: ['🎨 오행 테마 1개', () => themeAdd()], 4: ['✨ 카르마 +20', () => karmaAdd(20)],
      5: ['🎹 무대 의상 「콘서트 드레스」', () => store.set('p8b_stage_outfit', true)], 6: ['🧧 복주머니 8', () => pouchAdd(8)], 7: ['🎛️ 운명 조작 팩', () => Store.grant('fate')],
      8: ['✨ 카르마 +30', () => karmaAdd(30)], 9: ['🎨 오행 테마 1개', () => themeAdd()], 10: ['🌟 칭호 「넷시티 스타」 + 카르마 +50', () => { badgeG('넷시티 스타'); karmaAdd(50); }] },
  };
  function karmaAdd(n) { karma += n; saveMeta(); renderTitle(); }
  function pouchAdd(n) { store.set('p8b_pouch', store.get('p8b_pouch', 0) + n); }
  function themeAdd() { const o = store.get('p8b_themes', []), nx = [0, 1, 2, 3, 4].find(i => !o.includes(i)); if (nx != null) { o.push(nx); store.set('p8b_themes', o); } else pouchAdd(5); }
  function badgeG(b) { const t = store.get('p8b_titles', []); if (!t.includes(b)) { t.push(b); store.set('p8b_titles', t); } if (P && P.alive) badge(b); }
  function state() { const s = season(), st = store.get('p8b_season', null); return st && st.id === s.id ? st : { id: s.id, pts: 0, free: [], prem: [] }; }
  function addPts(n, why) {
    const st = state(), t0 = Math.floor(st.pts / TIER_PTS); st.pts += n; store.set('p8b_season', st);
    const t1 = Math.min(TIERS, Math.floor(st.pts / TIER_PTS));
    Hub.toast(`🌐 시즌 포인트 +${n} · ${why}`);
    if (t1 > t0) { cutin('🌐', `시즌 패스 ${t1}단계!`, '넷시티에서 보상을 받으세요'); Snd.sfx('levelup'); }
  }
  const premium = () => Store.has('netpass');

  /* ---------- 넷시티 메뉴 ---------- */
  const NAMES = ['Mia🇺🇸', 'Kenji🇯🇵', 'Lucas🇧🇷', 'Amara🇳🇬', 'Lea🇫🇷', 'Wei🇨🇳', 'Noah🇩🇪', 'Priya🇮🇳', 'Sofia🇲🇽', '하은🇰🇷'];
  function open() {
    const s = season(), st = state(), plv = (P.hlv && P.hlv['피아노']) || 0;
    const online = 1800 + Math.floor((Date.now() / 6e4) % 900);
    const reunionOk = P.age >= 25 && (P.reunionAge || 0) + 5 <= P.age;
    showModal({
      e: '🌐', t: `넷시티 · ${s.e} ${s.n}`, d: `지금 ${online.toLocaleString()}명 접속 중 · 시즌 종료까지 ${s.days}일 · 시즌 포인트 ${st.pts}`, big: 0,
      ch: [
        { t: '🎹 합주 콘서트', s: plv >= 2 ? `세계 친구 3명과 합주 (피아노 Lv${plv}) · 시즌 +4` : '피아노 Lv2부터 참가할 수 있어요', f: () => {
          if (plv < 2) { log('피아노를 조금 더 배워야 합주에 낄 수 있어요'); return; }
          if (!useEnergy()) return;
          const mates = NAMES.slice().sort(() => Math.random() - .5).slice(0, 3);
          World.rhythm('넷시티 합주 콘서트', (r, gr) => {
            const crowd = Math.round(300 + r * 4700);
            fx({ hap: 5 + Math.round(r * 8), look: Math.round(r * 3), bond: 2 }); P.fame += r > .8 ? 1 : 0;
            log(`🎼 ${mates.join(', ')}와 합주! 관객 ${crowd.toLocaleString()}명 · ${gr}등급`, 'good'); addPts(gr === 'S' ? 6 : 4, '합주 콘서트');
            if (gr === 'S') badge('넷시티 합주 스타');
          }, mates.join(' · '));
        } },
        { t: '🎓 동창회', s: reunionOk ? '옛 친구들과 다시 만나요 · 시즌 +3' : P.age < 25 ? '25살부터 열려요' : '동창회는 5년에 한 번', f: () => {
          if (!reunionOk) { log('아직 동창회 때가 아니다'); return; }
          if (!useEnergy()) return; P.reunionAge = P.age;
          const r = Math.random(); fx({ hap: 6, bond: 4 });
          if (r < .25 && !P.job && P.age < 55) { log('🎓 동창회에서 친구가 일자리를 소개해 줬다!', 'good'); setTimeout(() => jobHunt(), 80); }
          else if (r < .4 && !P.rel && !P.married && P.age < 50) { log('🎓 동창회에서 첫사랑과 다시 연락이 닿았다 💕', 'good'); P.flame = true; fx({ hap: 6 }); }
          else if (r < .6 && P.money > M(2000)) { log('🎓 동창회 회비를 내고 추억을 나눴다'); fx({ money: -M(300) }); }
          else log('🎓 동창회: "너 하나도 안 변했다!" 웃음꽃이 피었다');
          addPts(3, '동창회'); playAnim('cheer');
        } },
        { t: '🌐 광장 구경', s: '세계 친구들과 인사 · 시즌 +1', f: () => { if (!useEnergy()) return; const f = NAMES[R(0, NAMES.length - 1)]; fx({ hap: 3 }); log(`🌐 넷시티 광장에서 ${f}와(과) 인사했다`); addPts(1, '광장'); } },
        { t: `🎫 시즌 패스 보기 ${premium() ? '(프리미엄)' : ''}`, f: () => setTimeout(openPass, 50) },
        { t: '닫기', f: () => { } }],
    });
  }
  function openPass() {
    const s = season(), st = state(), tier = Math.min(TIERS, Math.floor(st.pts / TIER_PTS)), prem = premium();
    const row = t => {
      const f = REWARD.free[t], p = REWARD.prem[t];
      const cell = (r, kind) => !r ? '<td></td>' : `<td class="${t <= tier ? 'open' : ''}">${r[0]}${t <= tier && !(st[kind] || []).includes(t) && (kind === 'free' || prem) ? `<button data-c="${kind}" data-t="${t}">받기</button>` : (st[kind] || []).includes(t) ? ' ✓' : ''}</td>`;
      return `<tr><th class="${t <= tier ? 'open' : ''}">${t}</th>${cell(f, 'free')}${cell(p, 'prem')}</tr>`;
    };
    openOverlay(`🎫 넷시티 ${s.n} 패스`, `<div class="passhead"><b>${tier}</b>/${TIERS}단계 · 포인트 ${st.pts} · 종료까지 ${s.days}일
        <i class="hbar"><i style="width:${tier / TIERS * 100}%;background:var(--smart)"></i></i><small>합주 콘서트 +4~6 · 동창회 +3 · 광장 +1 (${TIER_PTS}점마다 1단계)</small></div>
      <table class="passtbl"><tr><th>단계</th><th>무료</th><th>프리미엄 ${prem ? '✅' : '🔒'}</th></tr>${Array.from({ length: TIERS }, (_, i) => row(i + 1)).join('')}</table>
      <p class="sjnote" style="text-align:center">시즌 패스 보상은 카르마·복주머니·테마·칭호처럼 꾸미기·편의 보상이에요. 능력치를 사는 상품은 팔지 않아요.</p>`,
      [...(prem ? [] : [{ t: `🌟 프리미엄 패스 열기 (${Store.price('netpass')})`, pri: 1, f: () => openShop('netpass') }]), { t: '닫기' }]);
    document.querySelectorAll('.passtbl [data-c]').forEach(b => b.onclick = () => {
      const k = b.dataset.c, t = +b.dataset.t, st2 = state(); if ((st2[k] || []).includes(t)) return;
      REWARD[k === 'free' ? 'free' : 'prem'][t][1](); (st2[k] = st2[k] || []).push(t); store.set('p8b_season', st2);
      Snd.sfx('fanfare'); Hub.toast(`🎁 ${REWARD[k][t][0]} 받았어요`); openPass();
    });
  }

  /* ---------- 테스트 도구 (QA 패널) — 주소 끝에 ?qa=1 또는 더보기 → 앱 정보 5번 누르기 ---------- */
  function qaOn() { return /[?&]qa=1/.test(location.search) || store.get('p8b_qa', false); }
  function qaPanel() {
    if (!P) { Hub.toast('인생을 시작한 뒤에 쓸 수 있어요'); return; }
    const A = (t, f) => ({ t, keep: 1, f: () => { f(); renderStats(); renderActions(); Hub.toast('✅ ' + t); } });
    openOverlay('🧪 테스트 도구', `<p class="sjnote" style="text-align:center">개발·QA용입니다. 기록에 반영되지만 실제 플레이엔 영향을 주지 않도록 테스트 인생에서만 쓰세요.</p>`, [
      A('나이 +5살', () => { for (let i = 0; i < 5; i++) { ageUp(); while (modalQ.length) document.querySelector('#sheet .choice').click(); } }),
      A('20살로 이동', () => { while (P.alive && P.age < 20) { ageUp(); while (modalQ.length) document.querySelector('#sheet .choice').click(); } }),
      A('돈 +100만', () => fx({ money: M(1e6) })),
      A('능력치 모두 90', () => ['hap', 'hp', 'smart', 'look', 'bond'].forEach(k => P[k] = 90)),
      A('모든 과목 80', () => Object.keys(P.sub).forEach(k => P.sub[k] = 80)),
      A('영어·일본어·중국어 +30', () => ['en', 'ja', 'zh'].forEach(k => P.lang[k] = Math.min(100, (P.lang[k] || 0) + 30))),
      A('피아노 Lv+3', () => { P.hxp['피아노'] = (P.hxp['피아노'] || 0) + 15; P.hlv['피아노'] = Math.min(10, Math.floor(P.hxp['피아노'] / 5)); }),
      A('금융 지식 +30', () => P.fin = Math.min(100, (P.fin || 0) + 30)),
      A('행동력 가득', () => P.energy = 3),
      A('시즌 포인트 +9', () => addPts(9, '테스트')),
      { t: '🔎 상태 보기 (JSON)', keep: 1, f: () => { const o = { age: P.age, money: Math.round(P.money), worth: Math.round(netWorth()), pot: P.pot, lang: P.lang, fin: P.fin, bank: P.bank, props: (P.props || []).length, cities: P.cities, uni: P.uniAbroad, job: P.job && P.job.n, place: P.place }; openOverlay('🔎 상태', `<pre class="qapre">${JSON.stringify(o, null, 1)}</pre>`, [{ t: '닫기' }]); } },
      { t: '닫기' }]);
  }

  function extra(list) {
    if (!P || !P.alive) return;
    if (P.age >= 10 && (!window.Hist || Hist.era('internet'))) list.push({ e: '🌐', n: '넷시티', f: () => { World.goTo('netcity'); open(); }, free: 1 });
    if (qaOn()) list.push({ e: '🧪', n: 'QA', f: qaPanel, free: 1, mini: 1 });
  }
  function init() {
    STORE_CONFIG.products.netpass = { id: 'p8b_netpass_' + season().id.toLowerCase(), e: '🌐', n: '넷시티 시즌 패스', d: `${season().n} 프리미엄 보상 (카르마·복주머니·테마·운명 조작 팩·한정 칭호)`, price: '₩4,900', consumable: false };
    const _list = actionList; actionList = function () { const l = _list(); extra(l); return l; };
    if (window.Grow) [['family', { '넷시티': 3 }], ['art', { '넷시티': 3 }], ['balance', { '넷시티': 1 }]].forEach(([k, o]) => { const p = Grow.POL.find(x => x.k === k); if (p) Object.assign(p.act, o); });
    if (/[?&]qa=1/.test(location.search)) store.set('p8b_qa', true);
  }
  return { init, open, openPass, season, addPts, qaPanel, state };
})();
window.Net = Net;
Net.init();
