/* 사운드 — WebAudio 실시간 합성 (음원 파일 없음 · 저작권 걱정 없음)
 *  Snd.mood('kid')   시기별 배경음악 전환
 *  Snd.sfx('coin')   효과음
 */
window.Snd = (() => {
  let ac = null, master, bgmBus, sfxBus, timer = null, mood = null, nextT = 0, step = 0;
  const S = (() => { try { return JSON.parse(localStorage.getItem('p8b_snd')) || { bgm: true, sfx: true }; } catch (e) { return { bgm: true, sfx: true }; } })();
  const save = () => { try { localStorage.setItem('p8b_snd', JSON.stringify(S)); } catch (e) {} };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.connect(master);
    bgmBus = ac.createGain(); bgmBus.gain.value = S.bgm ? .32 : 0; bgmBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = S.sfx ? .55 : 0; sfxBus.connect(comp);
    return true;
  }

  /* ---------- 악기 ---------- */
  function tone(bus, t, freq, dur, o = {}) {
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'triangle'; osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const a = o.a ?? .01, v = o.v ?? .3, rel = o.r ?? dur;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + rel);
    let node = osc;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(bus); osc.start(t); osc.stop(t + a + rel + .05);
  }
  function noise(bus, t, dur, v = .2, hp = 6000) {
    const len = Math.max(1, Math.floor(ac.sampleRate * dur)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = v;
    src.connect(f); f.connect(g); g.connect(bus); src.start(t);
  }
  const kick = (t, v = .5) => tone(bgmBus, t, 120, .18, { type: 'sine', slide: 40, v, a: .002 });

  /* ---------- 배경음악 (코드 진행 · 아르페지오) ---------- */
  // chords: MIDI 루트 + 형태, pat: 16스텝 아르페지오 인덱스(-1 쉼)
  const MOODS = {
    title: { bpm: 76, ch: [[60, 'M7'], [57, 'm7'], [53, 'M7'], [55, '7']], lead: 'sine', pat: [0, -1, 2, -1, 1, -1, 3, -1, 2, -1, 1, -1, 0, -1, 4, -1], pad: 1, drum: 0 },
    roll: { bpm: 112, ch: [[57, 'm'], [53, 'M'], [55, 'M'], [52, 'M']], lead: 'square', pat: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3], pad: 0, drum: 1 },
    baby: { bpm: 84, ch: [[65, 'M'], [60, 'M'], [58, 'M'], [60, 'M']], lead: 'box', pat: [0, -1, 1, 2, -1, 1, 0, -1, 2, -1, 3, 2, -1, 1, 0, -1], pad: 0, drum: 0 },
    kid: { bpm: 118, ch: [[60, 'M'], [55, 'M'], [57, 'm'], [53, 'M']], lead: 'square', pat: [0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 3, 2, 1, 0], pad: 0, drum: 1 },
    elem: { bpm: 112, ch: [[62, 'M'], [57, 'M'], [59, 'm'], [55, 'M']], lead: 'triangle', pat: [0, 1, 2, -1, 1, 2, 3, -1, 2, 1, 0, -1, 1, 2, 4, -1], pad: 0, drum: 1 },
    teen: { bpm: 104, ch: [[57, 'm'], [53, 'M'], [60, 'M'], [55, 'M']], lead: 'triangle', pat: [0, -1, 1, 2, -1, 2, 1, -1, 0, -1, 1, 2, 3, -1, 2, 1], pad: 1, drum: 2 },
    young: { bpm: 84, ch: [[62, 'm7'], [55, '7'], [60, 'M7'], [57, 'm7']], lead: 'sine', pat: [0, -1, -1, 2, -1, 1, -1, 3, -1, -1, 2, -1, 4, -1, 1, -1], pad: 1, drum: 3 },
    adult: { bpm: 90, ch: [[53, 'M'], [52, 'm'], [50, 'm'], [58, 'M']], lead: 'triangle', pat: [0, -1, 2, -1, 1, -1, 2, 3, 0, -1, 2, -1, 1, -1, 3, -1], pad: 1, drum: 2 },
    old: { bpm: 68, ch: [[55, 'M'], [52, 'm'], [48, 'M'], [50, 'M']], lead: 'sine', pat: [0, -1, -1, 1, -1, -1, 2, -1, 3, -1, -1, 2, -1, -1, 1, -1], pad: 1, drum: 0 },
    ending: { bpm: 62, ch: [[57, 'm'], [53, 'M'], [48, 'M'], [52, 'M']], lead: 'sine', pat: [2, -1, -1, 1, -1, -1, 0, -1, 3, -1, -1, 2, -1, -1, 1, -1], pad: 1, drum: 0 },
  };
  const SHAPE = { M: [0, 4, 7, 12, 16], m: [0, 3, 7, 12, 15], M7: [0, 4, 7, 11, 14], m7: [0, 3, 7, 10, 14], '7': [0, 4, 7, 10, 14] };

  function schedule() {
    if (!ac || !mood) return;
    const m = MOODS[mood], spb = 60 / m.bpm / 4;
    while (nextT < ac.currentTime + .25) {
      const bar = Math.floor(step / 16) % m.ch.length, s = step % 16, [root, sh] = m.ch[bar], notes = SHAPE[sh];
      const t = nextT;
      if (s === 0) {
        tone(bgmBus, t, mtof(root - 24), spb * 15, { type: 'sine', v: .22, a: .02 }); // 베이스
        if (m.pad) notes.slice(0, 3).forEach(n => tone(bgmBus, t, mtof(root + n), spb * 16, { type: 'sawtooth', v: .035, a: .4, lp: 900 }));
      }
      const idx = m.pat[s];
      if (idx >= 0) {
        const f = mtof(root + 12 + notes[idx % notes.length]);
        if (m.lead === 'box') { tone(bgmBus, t, f * 2, .9, { type: 'sine', v: .12, a: .002 }); tone(bgmBus, t, f * 4, .3, { type: 'sine', v: .03, a: .002 }); }
        else tone(bgmBus, t, f, spb * 1.8, { type: m.lead, v: m.lead === 'square' ? .045 : .09, a: .005, lp: 2600 });
      }
      if (m.drum === 1) { if (s % 4 === 0) kick(t, .35); if (s % 4 === 2) noise(bgmBus, t, .04, .06); }
      if (m.drum === 2) { if (s === 0 || s === 8 || s === 10) kick(t, .32); if (s === 4 || s === 12) noise(bgmBus, t, .12, .08, 1800); if (s % 2 === 0) noise(bgmBus, t, .02, .03); }
      if (m.drum === 3) { if (s === 0 || s === 7 || s === 10) kick(t, .3); if (s === 4 || s === 12) noise(bgmBus, t, .1, .06, 2500); if (s % 2 === 1) noise(bgmBus, t, .015, .025); }
      nextT += spb; step++;
    }
  }
  function setMood(m) {
    if (!MOODS[m]) m = 'title';
    if (m === mood) return;
    mood = m;
    if (!ac) return;
    step = 0; nextT = ac.currentTime + .08;
    if (!timer) timer = setInterval(schedule, 90);
  }

  /* ---------- 효과음 ---------- */
  const N = { C5: 72, D5: 74, E5: 76, G5: 79, A5: 81, C6: 84, E6: 88, G6: 91 };
  const FX = {
    tap: t => tone(sfxBus, t, 880, .05, { type: 'sine', v: .18, a: .002 }),
    tick: t => tone(sfxBus, t, 1400, .03, { type: 'square', v: .05, a: .001 }),
    reveal: t => [N.C5, N.G5, N.C6].forEach((n, i) => tone(sfxBus, t + i * .05, mtof(n), .25, { type: 'triangle', v: .18 })),
    age: t => { noise(sfxBus, t, .18, .05, 3000); tone(sfxBus, t + .08, mtof(N.E6), .5, { type: 'sine', v: .2 }); tone(sfxBus, t + .08, mtof(N.C6), .5, { type: 'sine', v: .12 }); },
    good: t => [N.C5, N.E5, N.G5, N.C6].forEach((n, i) => tone(sfxBus, t + i * .07, mtof(n), .3, { type: 'triangle', v: .2 })),
    bad: t => [N.E5, 72, 68, 65].forEach((n, i) => tone(sfxBus, t + i * .11, mtof(n - 5), .35, { type: 'sawtooth', v: .07, lp: 1200 })),
    coin: t => { tone(sfxBus, t, mtof(83), .08, { type: 'square', v: .08 }); tone(sfxBus, t + .08, mtof(88), .4, { type: 'square', v: .08 }); },
    fanfare: t => [[N.C5, 0], [N.E5, .12], [N.G5, .24], [N.C6, .36], [N.G5, .5], [N.C6, .6]].forEach(([n, d], i) => tone(sfxBus, t + d, mtof(n), i === 5 ? .9 : .2, { type: 'square', v: .09, lp: 3000 })),
    love: t => [N.E6, N.G6, N.E6, 95].forEach((n, i) => tone(sfxBus, t + i * .09, mtof(n), .3, { type: 'sine', v: .14 })),
    wedding: t => [[72, 0], [76, 0], [79, 0], [84, .5], [79, .75], [84, 1]].forEach(([n, d]) => { tone(sfxBus, t + d, mtof(n), 1.6, { type: 'sine', v: .12, a: .003 }); tone(sfxBus, t + d, mtof(n) * 2.76, .8, { type: 'sine', v: .03, a: .003 }); }),
    baby: t => [96, 91, 93, 100].forEach((n, i) => tone(sfxBus, t + i * .12, mtof(n), .5, { type: 'sine', v: .1, a: .002 })),
    death: t => [45, 52, 57].forEach(n => { tone(sfxBus, t, mtof(n), 3, { type: 'sine', v: .2, a: .005 }); tone(sfxBus, t, mtof(n) * 2.4, 1.5, { type: 'sine', v: .05, a: .005 }); }),
    boing: t => tone(sfxBus, t, 220, .25, { type: 'sine', slide: 660, v: .2, a: .005 }),
    page: t => noise(sfxBus, t, .15, .09, 2500),
    whoosh: t => { noise(sfxBus, t, .5, .12, 800); tone(sfxBus, t, 300, .5, { type: 'sine', slide: 900, v: .05 }); },
    pop: t => tone(sfxBus, t, 500, .08, { type: 'sine', slide: 1200, v: .2, a: .002 }),
    levelup: t => [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((n, i) => tone(sfxBus, t + i * .05, mtof(n), .18, { type: 'square', v: .06 })),
    snore: t => tone(sfxBus, t, 110, .8, { type: 'sawtooth', v: .04, lp: 400, a: .3 }),
  };
  function sfx(name) {
    if (!S.sfx || !FX[name]) return;
    if (!ensure()) return;
    try { FX[name](ac.currentTime + .01); } catch (e) {}
  }

  function unlock() {
    if (!ensure()) return;
    if (mood && !timer) { step = 0; nextT = ac.currentTime + .08; timer = setInterval(schedule, 90); }
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!ac) return; document.hidden ? ac.suspend() : ac.resume(); });

  function toggle(k) {
    S[k] = !S[k]; save();
    if (ac) { if (k === 'bgm') bgmBus.gain.value = S.bgm ? .32 : 0; else sfxBus.gain.value = S.sfx ? .55 : 0; }
    return S[k];
  }
  function mute(m) { if (master) master.gain.value = m ? 0 : .9; }
  return { mood: setMood, sfx, toggle, mute, get on() { return S; } };
})();
