// 音：BGM と効果音を Web Audio で鳴らす（音のファイルは使わない。曲はこのゲームのための書き下ろし）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const AU = HS.Audio = {};
  const KEY = 'horse-sim-audio-v1';
  AU.settings = { bgm: 0.5, se: 0.7 };
  try { Object.assign(AU.settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* 既定のまま */ }
  AU.saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(AU.settings)); } catch (e) { /* 保存できなくても鳴らせる */ } };

  let ctx = null, master, bgmBus, seBus, noiseBuf = null;
  let wantSong = null, cur = null, timer = null;

  // ブラウザは操作のあとでないと音を出せないので、最初のタップで準備する
  AU.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    bgmBus = ctx.createGain(); bgmBus.connect(master);
    seBus = ctx.createGain(); seBus.connect(master);
    AU.applyVolume();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; // 雑音の素（ゲームの乱数とは無関係）
    if (wantSong) { const s = wantSong; wantSong = null; AU.bgm(s); }
  };
  AU.ready = () => !!ctx;
  AU.applyVolume = function () {
    if (!ctx) return;
    bgmBus.gain.setTargetAtTime(AU.settings.bgm * 0.55, ctx.currentTime, 0.05);
    seBus.gain.setTargetAtTime(AU.settings.se, ctx.currentTime, 0.05);
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => AU.unlock(), { passive: true }));

  // ---------- 音の部品 ----------
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const freq = n => { const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n); if (!m) return null; return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };

  function env(g, t, a, peak, d, sus, dur, r) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.linearRampToValueAtTime(peak * sus, t + a + d);
    g.gain.setValueAtTime(peak * sus, t + Math.max(a + d, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r);
  }
  // 楽器
  const INST = {
    lead: { type: 'square', vol: 0.09, a: 0.01, d: 0.08, s: 0.6, r: 0.08, vib: 5 },
    flute: { type: 'triangle', vol: 0.2, a: 0.03, d: 0.1, s: 0.7, r: 0.15, vib: 4 },
    brass: { type: 'sawtooth', vol: 0.09, a: 0.04, d: 0.12, s: 0.75, r: 0.12, lp: 2400 },
    bass: { type: 'triangle', vol: 0.28, a: 0.005, d: 0.08, s: 0.7, r: 0.05 },
    pad: { type: 'triangle', vol: 0.05, a: 0.12, d: 0.2, s: 0.7, r: 0.4 },
    bell: { type: 'sine', vol: 0.12, a: 0.005, d: 0.3, s: 0.2, r: 0.6 },
  };
  function tone(bus, f, t, dur, instName, volMul) {
    const I = INST[instName] || INST.lead;
    const o = ctx.createOscillator(); o.type = I.type; o.frequency.setValueAtTime(f, t);
    let node = o;
    if (I.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = I.vib; lg.gain.value = f * 0.004; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + I.r + 0.05); }
    if (I.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = I.lp; o.connect(f2); node = f2; }
    const g = ctx.createGain(); node.connect(g); g.connect(bus);
    env(g, t, I.a, I.vol * (volMul || 1), I.d, I.s, dur, I.r);
    o.start(t); o.stop(t + dur + I.r + 0.05);
  }
  function noise(bus, t, dur, type, fq, vol, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = fq; if (q) f.Q.value = q;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  function kick(bus, t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol || 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2);
  }
  const DRUM = {
    k: t => kick(bgmBus, t, 0.45),
    s: t => noise(bgmBus, t, 0.12, 'bandpass', 1800, 0.25, 0.8),
    h: t => noise(bgmBus, t, 0.03, 'highpass', 7000, 0.08),
    x: t => { kick(bgmBus, t, 0.45); noise(bgmBus, t, 0.03, 'highpass', 7000, 0.08); },
    t: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.25); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(bgmBus); o.start(t); o.stop(t + 0.35); },
  };

  // ---------- 曲（拍は8分音符を1とする。「音:長さ」、和音は「+」、休符は R） ----------
  const SONGS = {
    // タイトル：ハ長調、ゆったり堂々と
    title: {
      bpm: 104, loop: true,
      tracks: [
        { inst: 'brass', seq: 'E5:2 G5:2 C6:3 B5:1 | A5:4 E5:2 A5:2 | F5:2 A5:2 C6:2 A5:2 | G5:6 R:2 | E5:2 G5:2 C6:3 D6:1 | B5:4 G5:2 E5:2 | A5:2 C6:2 D6:2 B5:2 | C6:6 R:2 | A5:2 C6:2 F6:3 E6:1 | D6:4 B5:2 G5:2 | G5:2 B5:2 E6:3 D6:1 | C6:4 A5:2 E5:2 | F5:2 A5:2 D6:3 C6:1 | B5:2 D6:2 G6:3 F6:1 | E6:4 D6:2 C6:2 | C6:6 R:2' },
        { inst: 'pad', seq: 'C4+E4+G4:8 | A3+C4+E4:8 | F3+A3+C4:8 | G3+B3+D4:8 | C4+E4+G4:8 | E3+G3+B3:8 | F3+A3+C4:4 G3+B3+D4:4 | C4+E4+G4:8 | F3+A3+C4:8 | G3+B3+D4:8 | E3+G3+B3:8 | A3+C4+E4:8 | D4+F4+A4:8 | G3+B3+D4:8 | C4+E4+G4:8 | C4+E4+G4:8' },
        { inst: 'bass', seq: 'C3:2 C3:2 G2:2 C3:2 | A2:2 A2:2 E2:2 A2:2 | F2:2 F2:2 C3:2 F2:2 | G2:2 G2:2 D3:2 G2:2 | C3:2 C3:2 G2:2 C3:2 | E2:2 E2:2 B2:2 E2:2 | F2:2 F2:2 G2:2 G2:2 | C3:2 G2:2 C3:4 | F2:2 F2:2 C3:2 F2:2 | G2:2 G2:2 D3:2 G2:2 | E2:2 E2:2 B2:2 E2:2 | A2:2 A2:2 E2:2 A2:2 | D3:2 D3:2 A2:2 D3:2 | G2:2 G2:2 D3:2 G2:2 | C3:2 C3:2 G2:2 C3:2 | C3:4 C3:4' },
        { drum: 'k...h...s...h...k...h.k.s...h...' },
      ],
    },
    // 牧場・ホーム：ヘ長調、のどか
    home: {
      bpm: 88, loop: true,
      tracks: [
        { inst: 'flute', seq: 'A4:3 C5:1 F5:2 E5:2 | D5:4 A4:4 | Bb4:2 D5:2 F5:2 D5:2 | C5:6 R:2 | A4:3 C5:1 F5:2 G5:2 | A5:4 E5:4 | D5:2 F5:2 E5:2 C5:2 | F5:6 R:2 | C5:2 F5:2 A5:3 G5:1 | F5:4 D5:4 | Bb4:2 D5:2 G5:3 F5:1 | E5:4 C5:4 | D5:2 F5:2 Bb5:3 A5:1 | G5:4 C5:4 | A4:2 C5:2 E5:2 G5:2 | F5:6 R:2' },
        { inst: 'pad', seq: 'F3+A3+C4:8 | D3+F3+A3:8 | Bb2+D3+F3:8 | C3+E3+G3:8 | F3+A3+C4:8 | A2+C3+E3:8 | Bb2+D3+F3:4 C3+E3+G3:4 | F3+A3+C4:8 | F3+A3+C4:8 | D3+F3+A3:8 | G3+Bb3+D4:8 | C3+E3+G3:8 | Bb2+D3+F3:8 | C3+E3+G3:8 | C3+E3+G3:8 | F3+A3+C4:8' },
        { inst: 'bass', seq: 'F2:4 C3:4 | D2:4 A2:4 | Bb2:4 F2:4 | C3:4 G2:4 | F2:4 C3:4 | A2:4 E2:4 | Bb2:4 C3:4 | F2:4 F2:4 | F2:4 C3:4 | D2:4 A2:4 | G2:4 D3:4 | C3:4 G2:4 | Bb2:4 F2:4 | C3:4 G2:4 | C3:4 C3:4 | F2:4 F2:4' },
        { drum: 'k.......h.......k.......h.......' },
      ],
    },
    // レース：ニ短調、速く
    race: {
      bpm: 152, loop: true,
      tracks: [
        { inst: 'lead', seq: 'D5 F5 A5 F5 D5 F5 A5 C6 | Bb4 D5 F5 D5 Bb4 D5 F5 A5 | C5 E5 G5 E5 C5 E5 G5 Bb5 | A4 C#5 E5 A5 G5 E5 C#5 A4 | D5 F5 A5 D6 C6 A5 F5 D5 | F5 A5 C6 F6 E6 C6 A5 F5 | G5 Bb5 D6 G6 F6 D6 Bb5 G5 | A5:2 C#6:2 E6:2 A6:2' },
        { inst: 'bass', seq: 'D3 D3 D3 D3 D3 D3 D3 D3 | Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 | C3 C3 C3 C3 C3 C3 C3 C3 | A2 A2 A2 A2 A2 A2 A2 A2 | D3 D3 D3 D3 D3 D3 D3 D3 | F2 F2 F2 F2 F2 F2 F2 F2 | G2 G2 G2 G2 G2 G2 G2 G2 | A2 A2 A2 A2 A2 A2 A2 A2' },
        { drum: 'k.h.s.hkk.h.s.h.' },
      ],
    },
    // 発走前のファンファーレ（書き下ろし）
    fanfare: {
      bpm: 116, loop: false,
      tracks: [
        { inst: 'brass', seq: 'Bb4:1 D5:1 F5:1 Bb5:3 R:2 | F5:1 Bb5:1 D6:1 C6:2 Bb5:2 R:1 | A5:2 C6:2 F6:4 | Eb6:2 D6:2 C6:2 A5:2 | Bb5+D6+F6:10 R:2' },
        { inst: 'brass', seq: 'R:8 | R:8 | F5:2 A5:2 C6:4 | C6:2 Bb5:2 A5:2 F5:2 | D5+F5+Bb5:10 R:2', vol: 0.7 },
        { inst: 'bass', seq: 'Bb2:6 R:2 | Bb2:6 R:2 | F2:8 | F2:8 | Bb1:10 R:2' },
        { drum: '................................t.t.t.t.t.t.t.t.ttttttttx.......' },
      ],
    },
    // 勝ったとき
    victory: {
      bpm: 132, loop: false,
      tracks: [
        { inst: 'brass', seq: 'C5:1 E5:1 G5:1 C6:3 R:1 G5:1 | C6:2 D6:2 E6:4 | C6+E6+G6:8' },
        { inst: 'pad', seq: 'C4+E4+G4:8 | F3+A3+C4:4 G3+B3+D4:4 | C4+E4+G4:8' },
        { inst: 'bass', seq: 'C3:4 G2:4 | F2:4 G2:4 | C2:8' },
        { drum: 'k...s...k.k.s...x...............' },
      ],
    },
  };
  AU.SONGS = SONGS;

  // 「音:長さ」を [{f:[周波数], len}] に
  function parse(seq) {
    const out = [];
    for (const tok of seq.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
      const [n, l] = tok.split(':');
      const len = l ? +l : 1;
      out.push({ f: n === 'R' ? [] : n.split('+').map(freq).filter(Boolean), len });
    }
    return out;
  }
  function compile(song) {
    return song.tracks.map(tr => tr.drum ? { drum: tr.drum.split(''), pos: 0 } : { inst: tr.inst, vol: tr.vol || 1, notes: parse(tr.seq), pos: 0 });
  }

  // ---------- BGM の順番待ち（先読みで音を置く） ----------
  AU.bgm = function (name) {
    if (!ctx) { wantSong = name; return; }
    if (cur && cur.name === name) return;
    AU.stopBgm();
    const song = SONGS[name];
    if (!song) return;
    const eighth = 60 / song.bpm / 2;
    const tracks = compile(song);
    const t0 = ctx.currentTime + 0.08;
    for (const tr of tracks) tr.next = t0;
    cur = { name, song, tracks, eighth, ended: false };
    const tick = () => {
      if (!cur) return;
      const until = ctx.currentTime + 0.25;
      let alive = false;
      for (const tr of cur.tracks) {
        if (tr.drum) {
          const step = cur.eighth / 2; // 打楽器は16分
          while (tr.next < until) {
            if (tr.pos >= tr.drum.length) { if (!cur.song.loop) break; tr.pos = 0; }
            const c = tr.drum[tr.pos++];
            if (DRUM[c]) DRUM[c](tr.next);
            tr.next += step;
          }
          if (tr.pos < tr.drum.length || cur.song.loop) alive = true;
        } else {
          while (tr.next < until) {
            if (tr.pos >= tr.notes.length) { if (!cur.song.loop) break; tr.pos = 0; }
            const n = tr.notes[tr.pos++];
            const dur = n.len * cur.eighth;
            for (const f of n.f) tone(bgmBus, f, tr.next, dur * 0.92, tr.inst, tr.vol);
            tr.next += dur;
          }
          if (tr.pos < tr.notes.length || cur.song.loop) alive = true;
        }
      }
      if (!alive && !cur.ended) {
        cur.ended = true;
        const endAt = Math.max(...cur.tracks.map(t => t.next));
        const done = cur.onEnd; const me = cur;
        setTimeout(() => { if (cur === me) { AU.stopBgm(); if (done) done(); } }, Math.max(0, (endAt - ctx.currentTime) * 1000) + 300);
      }
    };
    tick();
    timer = setInterval(tick, 50);
  };
  AU.stopBgm = function () { if (timer) clearInterval(timer); timer = null; cur = null; };
  AU.current = () => cur && cur.name;
  // 終わりのある曲を鳴らし、終わったら resolve
  AU.playOnce = function (name) {
    return new Promise(res => {
      if (!ctx || AU.settings.bgm <= 0) return res();
      AU.stopBgm(); AU.bgm(name);
      if (cur) cur.onEnd = res; else res();
    });
  };

  // ---------- 効果音 ----------
  AU.se = function (name) {
    if (!ctx || AU.settings.se <= 0) return;
    const t = ctx.currentTime + 0.01;
    const blip = (f1, f2, dur, type, vol) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(seBus); o.start(t); o.stop(t + dur + 0.02);
    };
    if (name === 'click') blip(900, 1300, 0.045, 'square', 0.05);
    else if (name === 'tab') blip(600, 800, 0.05, 'triangle', 0.15);
    else if (name === 'ok') { blip(880, null, 0.06, 'square', 0.06); setTimeout(() => AU.se('_ok2'), 70); }
    else if (name === '_ok2') blip(1320, null, 0.09, 'square', 0.06);
    else if (name === 'coin') { tone(seBus, freq('B5'), t, 0.07, 'lead', 1.2); tone(seBus, freq('E6'), t + 0.08, 0.3, 'lead', 1.2); }
    else if (name === 'error') blip(180, 120, 0.25, 'sawtooth', 0.08);
    else if (name === 'week') { blip(500, 760, 0.12, 'triangle', 0.18); }
    else if (name === 'birth') { ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => tone(seBus, freq(n), t + i * 0.08, 0.25, 'bell', 1.2)); }
    else if (name === 'gate') { tone(seBus, 1568, t, 0.05, 'bell', 2.5); tone(seBus, 2093, t, 0.05, 'bell', 1.5); noise(seBus, t, 0.25, 'bandpass', 900, 0.35, 1.5); }
  };

  // ---------- レースの音（蹄・歓声） ----------
  let race = null;
  AU.raceStart = function () {
    if (!ctx) return;
    AU.raceEnd();
    const crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = noiseBuf; crowdSrc.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const cg = ctx.createGain(); cg.gain.value = 0.02;
    crowdSrc.connect(bp); bp.connect(cg); cg.connect(seBus); crowdSrc.start();
    race = { crowdSrc, cg, next: ctx.currentTime + 0.1, rate: 0, step: 0, timer: null, crowd: 0.02 };
    race.timer = setInterval(() => {
      if (!race || race.rate <= 0) return;
      const until = ctx.currentTime + 0.2;
      // 蹄：4拍の駆け足（タ・タ・タ・タン）
      const cycle = 0.42 / race.rate;
      const offs = [0, 0.13, 0.26, 0.42];
      while (race.next < until) {
        const k = race.step % 4;
        const tt = race.next + offs[k] * cycle;
        noise(seBus, tt, 0.06, 'lowpass', 260 + (k === 3 ? 0 : 60), k === 3 ? 0.5 : 0.32, 1);
        race.step++;
        if (k === 3) race.next += cycle;
      }
    }, 50);
  };
  // remain：先頭の残り距離、straight：直線の長さ、running：走っているか
  AU.raceUpdate = function (remain, straight, running, finished) {
    if (!race) return;
    race.rate = running ? 1 : 0;
    let lvl = 0.03;
    if (running) lvl = remain < straight ? 0.06 + 0.22 * (1 - remain / straight) : 0.05;
    if (finished) lvl = 0.3;
    race.cg.gain.setTargetAtTime(lvl, ctx.currentTime, finished ? 0.1 : 0.4);
    if (finished && !race.cheered) { race.cheered = true; setTimeout(() => { if (race) race.cg.gain.setTargetAtTime(0.05, ctx.currentTime, 1.2); }, 1800); }
  };
  AU.raceEnd = function () {
    if (!race) return;
    clearInterval(race.timer);
    try { race.cg.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2); const s = race.crowdSrc; setTimeout(() => { try { s.stop(); } catch (e) { /* 止まっている */ } }, 600); } catch (e) { /* 何もしない */ }
    race = null;
  };
})();
