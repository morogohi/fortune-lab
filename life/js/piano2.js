/* 프로젝트 80억 v9 — 피아노 이론: 악보 읽기 · 화성학 레슨 · 8급~1급·전문가 급수 시험 */
const Piano2 = (() => {
  // 오선 위치: 아래 덧줄 도(C4)부터 위 덧줄 라(A5)까지. y = 오선 좌표, f = 주파수
  const NOTES = [
    { n: '도', l: 'C4', y: 80, f: 261.6, led: [80] }, { n: '레', l: 'D4', y: 75, f: 293.7 }, { n: '미', l: 'E4', y: 70, f: 329.6 },
    { n: '파', l: 'F4', y: 65, f: 349.2 }, { n: '솔', l: 'G4', y: 60, f: 392 }, { n: '라', l: 'A4', y: 55, f: 440 },
    { n: '시', l: 'B4', y: 50, f: 493.9 }, { n: '도', l: 'C5', y: 45, f: 523.3 }, { n: '레', l: 'D5', y: 40, f: 587.3 },
    { n: '미', l: 'E5', y: 35, f: 659.3 }, { n: '파', l: 'F5', y: 30, f: 698.5 }, { n: '솔', l: 'G5', y: 25, f: 784, led: [] },
    { n: '라', l: 'A5', y: 20, f: 880, led: [20] },
  ];
  const SOLF = ['도', '레', '미', '파', '솔', '라', '시'];
  // [최소 급수 단계, 주제, 설명, 문제, 정답, 오답1, 오답2]
  const THEORY = [
    [0, '박자', '4분음표는 한 박, 2분음표는 두 박, 온음표는 네 박이에요.', '온음표는 몇 박일까요?', '4박', '2박', '1박'],
    [0, '셈여림', 'p(피아노)는 여리게, f(포르테)는 세게, mf는 조금 세게예요.', 'f 기호의 뜻은?', '세게', '여리게', '느리게'],
    [1, '쉼표', '쉼표는 소리를 내지 않고 쉬는 박이에요. 4분쉼표는 한 박 쉬어요.', '4분쉼표는 몇 박 쉬나요?', '1박', '2박', '반 박'],
    [1, '샵과 플랫', '♯(샵)은 반음 올리고 ♭(플랫)은 반음 내려요. ♮(제자리표)는 원래 음으로.', '♯ 기호의 뜻은?', '반음 올림', '반음 내림', '한 옥타브 올림'],
    [2, '온음·반음', '미-파, 시-도 사이만 반음이고 나머지 이웃한 흰 건반은 온음이에요.', '흰 건반끼리 반음인 곳은?', '미-파', '도-레', '솔-라'],
    [2, '다장조 음계', '다장조(C major)는 검은 건반 없이 도부터 도까지 흰 건반만 쳐요.', '다장조 음계에 필요한 검은 건반 수는?', '0개', '1개', '2개'],
    [3, '으뜸화음', '화음은 3도씩 쌓은 세 음이에요. 다장조 으뜸화음(I)은 도·미·솔.', '다장조 으뜸화음(C)의 구성음은?', '도·미·솔', '도·파·라', '레·파·라'],
    [3, '버금딸림화음', '다장조에서 IV(버금딸림화음)는 파·라·도, F코드예요.', 'F 코드(IV)의 구성음은?', '파·라·도', '솔·시·레', '미·솔·시'],
    [4, '딸림화음', '다장조 V(딸림화음)는 솔·시·레, G코드. 으뜸화음으로 돌아가고 싶은 긴장감을 줘요.', 'G 코드(V)의 구성음은?', '솔·시·레', '라·도·미', '파·라·도'],
    [4, '장3화음·단3화음', '장3화음은 밝고 단3화음은 어두워요. 라·도·미는 가단조 으뜸화음(Am).', '라·도·미 화음의 이름은?', 'Am (단화음)', 'A (장화음)', 'C (장화음)'],
    [5, '음정', '장3도는 반음 4개, 단3도는 반음 3개, 완전5도는 반음 7개 거리예요.', '완전5도는 반음 몇 개?', '7개', '5개', '4개'],
    [5, '나란한조', '조표가 같은 장조와 단조를 나란한조라고 해요. 다장조의 나란한조는 가단조.', '사장조(G major)의 나란한조는?', '마단조(Em)', '가단조(Am)', '라단조(Dm)'],
    [6, '딸림7화음', 'V7은 딸림화음에 7도를 더한 화음. 다장조에서 G7 = 솔·시·레·파.', 'G7 코드의 구성음은?', '솔·시·레·파', '솔·시·레·미', '도·미·솔·시'],
    [6, '종지', 'V → I로 끝나면 정격종지(완전히 끝난 느낌), IV → I은 변격종지(아멘 종지).', 'V → I 진행의 이름은?', '정격종지', '반종지', '변격종지'],
    [7, '조표 순서', '샵은 파·도·솔·레·라·미·시 순서로 붙어요. 샵 1개는 사장조.', '샵이 1개인 장조는?', '사장조(G)', '라장조(D)', '바장조(F)'],
    [7, '전위', '화음의 맨 아래 음을 바꾸는 것이 전위. 미·솔·도는 C코드 제1전위.', '미·솔·도는 어떤 코드의 전위?', 'C 코드', 'E 코드', 'G 코드'],
    [8, '이차 딸림화음', '다른 화음을 잠깐 으뜸처럼 만드는 딸림화음. 다장조에서 D7 → G는 V7/V.', '다장조에서 D7 → G 진행의 D7은?', 'V의 딸림7화음 (V7/V)', '버금딸림화음', '으뜸화음'],
    [8, '전조', '곡 중간에 조를 바꾸는 것. 가까운 조(딸림조·나란한조)로 가장 자주 바꿔요.', '다장조 곡이 사장조로 바뀌는 것을 무엇이라 할까요?', '딸림조로 전조', '이명동음', '반음계'],
  ];
  const GRADES = ['8급', '7급', '6급', '5급', '4급', '3급', '2급', '1급', '전문가'];
  const NEED_LV = [1, 2, 3, 4, 5, 6, 7, 8, 9];          // 시험 응시에 필요한 피아노 레벨
  const PASS = i => .5 + i * .035;                      // 실기(리듬) 합격선

  let actx = null, cur = null;
  function tone(f, d = .5) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.2, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + d); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + d); } catch (e) { } }
  const grade = () => P.pgrade || 0;                    // 합격한 급수 개수 (0 = 아직 없음)
  const gradeName = () => grade() ? GRADES[grade() - 1] : '없음';
  const plv = () => (P.hlv && P.hlv['피아노']) || 0;

  function staffSVG(note) {
    const lines = [30, 40, 50, 60, 70].map(y => `<line x1="10" x2="250" y1="${y}" y2="${y}"/>`).join('');
    const led = (note.led || []).map(y => `<line x1="128" x2="162" y1="${y}" y2="${y}"/>`).join('');
    const stem = note.y > 50 ? `<line x1="153" x2="153" y1="${note.y}" y2="${note.y - 34}"/>` : `<line x1="137" x2="137" y1="${note.y}" y2="${note.y + 34}"/>`;
    return `<svg class="staff" viewBox="0 0 260 100" role="img" aria-label="오선 악보"><g stroke="currentColor" stroke-width="1.4">${lines}${led}${stem}</g>
      <text x="14" y="76" font-size="56" fill="currentColor">𝄞</text><ellipse cx="145" cy="${note.y}" rx="8.5" ry="6" fill="currentColor" transform="rotate(-20 145 ${note.y})"/></svg>`;
  }
  // 악보 읽기 문제: 레벨이 오를수록 음역이 넓어짐
  function noteQuiz(onDone) {
    const range = Math.min(NOTES.length, 6 + plv()), note = cur = NOTES[R(0, range - 1)];
    const wrong = SOLF.filter(x => x !== note.n).sort(() => Math.random() - .5).slice(0, 2);
    showModal({
      e: '🎼', t: '악보 읽기', auto: 1, noAuto: 1,
      html: () => `<div class="staffbox">${staffSVG(note)}<button class="lspk" id="stTone">🔊</button></div>
        <p class="lq">이 음의 이름은? <small>(오선 맨 아래 줄 = 미, 둘째 칸 = 라)</small></p>`,
      ch: [note.n, ...wrong].sort(() => Math.random() - .5).map(o => ({ t: o, f: () => {
        const ok = o === note.n; tone(note.f); Snd.sfx(ok ? 'good' : 'bad');
        P.pTheory = (P.pTheory || 0) + (ok ? 1 : 0);
        log(`🎼 악보 읽기: ${note.l} = ${note.n} ${ok ? '✅ 정답' : `❌ 오답 (${o})`}`, ok ? 'good' : '');
        onDone && onDone(ok);
      } })),
    });
    setTimeout(() => { const b = document.getElementById('stTone'); if (b) b.onclick = e => { e.stopPropagation(); tone(note.f); }; if (!(window.Grow && Grow.auto)) tone(note.f); }, 60);
  }
  // 화성학 문제: 급수 단계에 맞는 주제부터
  function theoryQuiz(stage, onDone) {
    const pool = THEORY.map((t, i) => i).filter(i => THEORY[i][0] <= stage && THEORY[i][0] >= stage - 2);
    P.thSeen = P.thSeen || [];
    const fresh = pool.filter(i => !P.thSeen.includes(i)), i = (fresh.length ? fresh : pool)[R(0, (fresh.length || pool.length) - 1)];
    const [, topic, desc, q, ans, w1, w2] = THEORY[i];
    showModal({
      e: '🎶', t: `화성학: ${topic}`, auto: 1, noAuto: 1,
      html: () => `<div class="fincard"><b>🎹 ${topic}</b><p>${desc}</p></div><p class="lq">퀴즈: ${q}</p>`,
      ch: [ans, w1, w2].sort(() => Math.random() - .5).map(o => ({ t: o, f: () => {
        const ok = o === ans; Snd.sfx(ok ? 'good' : 'bad');
        if (!P.thSeen.includes(i)) P.thSeen.push(i);
        P.pTheory = (P.pTheory || 0) + (ok ? 1 : 0);
        log(`🎶 화성학 「${topic}」 ${ok ? '✅ 정답' : `❌ 오답 (정답: ${ans})`}`, ok ? 'good' : '');
        onDone && onDone(ok);
      } })),
    });
  }
  function lessonDone(ok, kind) {
    World.pianoXp(ok ? R(2, 3) : 1); P.sub.music = clamp(P.sub.music + (ok ? 2 : 1)); fx({ smart: 1 });
    if ((P.pTheory || 0) >= 20) badge('화성학 박사');
    playAnim('read');
  }
  function exam() {
    const i = grade(); if (i >= GRADES.length) return;
    const fee = M(100 + i * 60), name = GRADES[i];
    if (plv() < NEED_LV[i]) { log(`📜 ${name} 시험은 피아노 Lv${NEED_LV[i]}부터 볼 수 있어요 (지금 Lv${plv()})`); return; }
    if (!useEnergy()) return;
    if (P.age >= 15) fx({ money: -fee }, 1);
    let th = 0;
    const perform = () => World.rhythm(`${name} 실기 시험`, (r, gr) => {
      const passTh = i < 2 ? th >= 1 : th >= 2, passPlay = r >= PASS(i), pass = passTh && passPlay;
      if (pass) {
        P.pgrade = i + 1; P.fame += i >= 7 ? 2 : 0; fx({ hap: 6 + i, look: 1 }); P.sub.music = clamp(P.sub.music + 4);
        cutin('📜', `피아노 ${name} 합격!`, `이론 ${th}/2 · 실기 ${gr}등급`); Snd.sfx('fanfare'); playAnim('jackpot', 2);
        log(`📜 피아노 ${name} 합격! (이론 ${th}/2 · 실기 ${Math.round(r * 100)}점 ${gr})`, 'good'); badge(i >= 8 ? '피아노 전문가' : `피아노 ${name}`);
        if (P.moments) P.moments.push({ a: P.age, e: '📜', t: '급수 시험', c: `피아노 ${name} 합격`, r: '' });
      } else {
        fx({ hap: -3 }); playAnim('sad');
        log(`📜 피아노 ${name} 불합격 — ${!passTh ? '이론을 더 공부하자 (악보·화성학 레슨)' : `실기 ${Math.round(r * 100)}점 (합격선 ${Math.round(PASS(i) * 100)})`}`, 'bad');
      }
    });
    noteQuiz(ok1 => { th += ok1 ? 1 : 0; theoryQuiz(i, ok2 => { th += ok2 ? 1 : 0; perform(); }); });
  }
  function choices() {
    if (P.age < 6) return [];
    const i = grade(), nx = GRADES[i];
    return [
      { t: '🎼 악보 읽기 레슨', s: '오선 위 음 이름 맞히기 · 행동력 1', f: () => { if (!useEnergy()) return; if (P.pianoFirst == null) P.pianoFirst = P.age; noteQuiz(ok => lessonDone(ok)); } },
      ...(P.age >= 8 ? [{ t: '🎶 화성학 레슨', s: '박자·음계·코드·종지 · 행동력 1', f: () => { if (!useEnergy()) return; theoryQuiz(Math.max(i, Math.floor(plv() / 1.2)), ok => lessonDone(ok)); } }] : []),
      ...(nx ? [{ t: `📜 급수 시험 · ${nx}`, s: `지금 ${gradeName()} · 필요 Lv${NEED_LV[i]}${plv() >= NEED_LV[i] ? ' ✓' : ` (지금 Lv${plv()})`} · 이론 2문제 + 실기`, f: exam }] : [{ t: '🏅 피아노 전문가', s: '모든 급수를 땄어요!', f: () => { } }]),
    ];
  }
  return { get cur() { return cur; }, choices, exam, noteQuiz, theoryQuiz, staffSVG, GRADES, NOTES, THEORY, grade, gradeName };
})();
window.Piano2 = Piano2;
