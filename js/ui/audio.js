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
    // 90年代のロック・フュージョンの音色
    guitar: { type: 'sawtooth', vol: 0.07, a: 0.008, d: 0.15, s: 0.75, r: 0.12, vib: 5.5, dist: 1, lp: 3200, det: 6 },
    power: { type: 'sawtooth', vol: 0.045, a: 0.004, d: 0.06, s: 0.6, r: 0.05, dist: 1, lp: 2200, det: 9 },
    slap: { type: 'square', vol: 0.16, a: 0.002, d: 0.09, s: 0.35, r: 0.05, lp: 1400, pluck: 1 },
    ebass: { type: 'sawtooth', vol: 0.16, a: 0.004, d: 0.1, s: 0.7, r: 0.05, lp: 700 },
    epiano: { type: 'sine', vol: 0.09, a: 0.004, d: 0.4, s: 0.35, r: 0.3, bellh: 1 },
    synth: { type: 'sawtooth', vol: 0.05, a: 0.01, d: 0.12, s: 0.7, r: 0.15, lp: 2600, det: 8, vib: 5 },
  };
  // 歪み（ギター）
  let distCurve = null;
  const getDist = () => {
    if (distCurve) return distCurve;
    const n = 1024, k = 28; distCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; distCurve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return distCurve;
  };
  function tone(bus, f, t, dur, instName, volMul) {
    const I = INST[instName] || INST.lead;
    const stopAt = t + dur + I.r + 0.05;
    const mix = ctx.createGain();
    const oscs = [];
    const mk = (type, fq, det) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(fq, t); if (det) o.detune.value = det; o.connect(mix); oscs.push(o); return o; };
    mk(I.type, f, 0);
    if (I.det) mk(I.type, f, I.det).detune.value = I.det; // 少しずらして厚く
    if (I.bellh) { const o = mk('sine', f * 4, 0); const hg = ctx.createGain(); o.disconnect(); o.connect(hg); hg.connect(mix); hg.gain.setValueAtTime(0.35, t); hg.gain.exponentialRampToValueAtTime(0.001, t + 0.25); }
    if (I.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = I.vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.005, t + Math.min(0.25, dur)); l.connect(lg); for (const o of oscs) lg.connect(o.frequency); l.start(t); l.stop(stopAt); }
    let node = mix;
    if (I.dist) { const ws = ctx.createWaveShaper(); ws.curve = getDist(); ws.oversample = '2x'; node.connect(ws); node = ws; }
    if (I.lp) {
      const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(I.pluck ? I.lp * 3 : I.lp, t);
      if (I.pluck) f2.frequency.exponentialRampToValueAtTime(I.lp * 0.5, t + 0.12);
      node.connect(f2); node = f2;
    }
    const g = ctx.createGain(); node.connect(g); g.connect(bus);
    env(g, t, I.a, I.vol * (volMul || 1), I.d, I.s, dur, I.r);
    for (const o of oscs) { o.start(t); o.stop(stopAt); }
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
    // ロックの太鼓：強いスネア・クラッシュ・オープンハイハット・低いタム
    S: t => { noise(bgmBus, t, 0.16, 'bandpass', 1500, 0.36, 0.7); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(g); g.connect(bgmBus); o.start(t); o.stop(t + 0.12); },
    c: t => { kick(bgmBus, t, 0.5); noise(bgmBus, t, 1.1, 'highpass', 5000, 0.16); },
    o: t => noise(bgmBus, t, 0.18, 'highpass', 6500, 0.07),
    l: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.3); g.gain.setValueAtTime(0.38, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(bgmBus); o.start(t); o.stop(t + 0.4); },
    K: t => { kick(bgmBus, t, 0.5); noise(bgmBus, t, 0.16, 'bandpass', 1500, 0.32, 0.7); },
  };

  // ---------- 曲（拍は8分音符を1とする。「音:長さ」、和音は「+」、休符は R、「*回数」でくり返し） ----------
  // どれもこのゲームのための書き下ろし。90年代後半の家庭用競馬ゲームのような、ギターとブラスのロック・フュージョンの調子
  // コード名から、1小節ぶんの伴奏を作る道具
  const PC = { D: 'D3+A3', A: 'A2+E3', Bm: 'B2+F#3', G: 'G2+D3', Em: 'E3+B3', 'F#m': 'F#2+C#3', Bb: 'Bb2+F3', C: 'C3+G3', B: 'B2+F#3', Am: 'A2+E3', F: 'F2+C3', E: 'E3+B3', Dm: 'D3+A3' };
  const BS = { D: 'D2', A: 'A1', Bm: 'B1', G: 'G1', Em: 'E2', 'F#m': 'F#1', Bb: 'Bb1', C: 'C2', B: 'B1', Am: 'A1', F: 'F1', E: 'E2', Dm: 'D2' };
  const power = chords => chords.map(c => `${PC[c]}*8`).join(' | ');
  const rockBass = chords => chords.map(c => `${BS[c]}*8`).join(' | ');
  // フュージョンのスラップ（根音・オクターブ上・7度）
  const slapBar = (r, o, s7) => `${r}2 R:1 ${o}3 ${r}2 R:1 ${r}2 ${s7} ${o}3`;
  // エレピの刻み（裏拍）
  const comp = v => `R:1 ${v}:1 R:2 ${v}:1 R:1 ${v}:2`;
  const ROCK = 'k.h.S.h.k.k.S.h.', ROCK2 = 'k.h.S.hkk.h.S.h.', CRASH = 'c.h.S.h.k.k.S.h.';
  const FILL = 'k.h.S.h.SSSSllll', FILL2 = 'SSSSSSllllllK.K.';
  const FUNK = 'k.h.S.hkh.k.S.ho', FUNKF = 'k.h.S.hkS.SSS.l.';
  const SONGS = {
    // タイトル：ニ長調、明るく駆け出すロック
    title: {
      bpm: 152, loop: true,
      tracks: [
        { inst: 'guitar', seq: 'D5:2 E5:1 F#5:1 A5:3 F#5:1 | E5:2 C#5:2 A4:4 | B4:2 D5:1 F#5:1 B5:3 A5:1 | G5:4 F#5:2 E5:2 | E5:2 G5:1 B5:1 E6:3 D6:1 | C#6:2 B5:2 A5:2 E5:2 | F#5:2 A5:2 D6:2 C#6:1 D6:1 | E6:6 R:2 | D6:3 B5:1 G5:2 D6:2 | E6:3 C#6:1 A5:2 E6:2 | F#6:3 E6:1 C#6:2 A5:2 | B5:4 F#5:4 | G5:2 B5:2 D6:2 G6:2 | F#6:2 E6:2 C#6:2 A5:2 | Bb5:2 D6:2 F6:2 D6:2 | E6:4 C#6:2 A5:2' },
        { inst: 'power', seq: power(['D', 'A', 'Bm', 'G', 'Em', 'A', 'D', 'A', 'G', 'A', 'F#m', 'Bm', 'G', 'A', 'Bb', 'A']) },
        { inst: 'ebass', seq: rockBass(['D', 'A', 'Bm', 'G', 'Em', 'A', 'D', 'A', 'G', 'A', 'F#m', 'Bm', 'G', 'A', 'Bb', 'A']) },
        { inst: 'brass', seq: 'D4+F#4+A4:2 R:6 | R:8 | R:8 | G4+B4+D5:1 R:1 G4+B4+D5:1 R:5 | E4+G4+B4:2 R:6 | R:8 | R:8 | A4+C#5+E5:1 R:1 A4+C#5+E5:1 R:1 A4+C#5+E5:4 | G4+B4+D5:2 R:6 | R:8 | R:8 | B4+D5+F#5:1 R:1 B4+D5+F#5:1 R:5 | G4+B4+D5:2 R:6 | R:8 | Bb4+D5+F5:2 R:2 Bb4+D5+F5:2 R:2 | A4+C#5+E5:6 R:2', vol: 0.8 },
        { drum: CRASH + ROCK.repeat(6) + FILL + CRASH + ROCK2.repeat(6) + FILL2 },
      ],
    },
    // ホーム：ヘ長調のフュージョン。スラップベースとエレピ、シンセの歌
    home: {
      bpm: 116, loop: true,
      tracks: [
        { inst: 'synth', seq: 'R:2 D5:1 F5:1 G5:2 Bb5:2 | A5:1 G5:1 E5:2 C5:2 R:2 | R:1 C5:1 E5:1 F5:1 A5:3 G5:1 | F5:4 R:2 A4:1 C5:1 | D5:2 F5:1 A5:1 Bb5:2 D6:2 | C6:1 Bb5:1 G5:2 E5:2 G5:2 | A5:3 G5:1 E5:2 C5:2 | F#5:4 A5:2 C6:2 | D6:3 C6:1 A5:2 F5:2 | G5:2 Bb5:1 C6:1 E5:2 G5:2 | A5:2 C6:1 E6:1 D6:2 C6:2 | A5:4 R:2 F5:1 G5:1 | Bb5:2 A5:1 G5:1 F5:2 D5:2 | C#5:2 E5:1 G5:1 A5:2 C#6:2 | D6:3 C6:1 A5:2 F5:2 | E5:2 G5:2 Bb5:2 C6:2' },
        { inst: 'epiano', seq: [comp('F4+Bb4+D5'), comp('E4+Bb4+D5'), comp('E4+A4+C5'), comp('F4+A4+C5'), comp('F4+Bb4+D5'), comp('E4+Bb4+D5'), comp('G4+C5+E5'), comp('F#4+C5+E5'), comp('D4+F4+A4'), comp('E4+Bb4+D5'), comp('G4+C5+E5'), comp('F4+A4+C5'), comp('F4+Bb4+D5'), comp('G4+C#5+E5'), comp('F4+A4+C5'), comp('E4+Bb4+D5')].join(' | ') },
        { inst: 'slap', seq: [slapBar('G', 'G', 'F3'), slapBar('C', 'C', 'Bb2'), slapBar('F', 'F', 'E3'), slapBar('D', 'D', 'C3'), slapBar('G', 'G', 'F3'), slapBar('C', 'C', 'Bb2'), slapBar('A', 'A', 'G3'), slapBar('D', 'D', 'C3'), slapBar('Bb', 'Bb', 'A2'), slapBar('C', 'C', 'Bb2'), slapBar('A', 'A', 'G3'), slapBar('D', 'D', 'C3'), slapBar('G', 'G', 'F3'), slapBar('A', 'A', 'G3'), slapBar('D', 'D', 'C3'), slapBar('C', 'C', 'Bb2')].join(' | ') },
        { drum: FUNK.repeat(7) + FUNKF + FUNK.repeat(7) + FUNKF },
      ],
    },
    // パドック：イ短調、少し張りつめて
    paddock: {
      bpm: 126, loop: true,
      tracks: [
        { inst: 'synth', seq: 'A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | G4 B4 D5 G5 D5 B4 G4 B4 | E4 G#4 B4 E5 B4 G#4 E4 G#4 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | D4 F4 A4 D5 A4 F4 D4 F4 | E4 G#4 B4 E5 G#5:2 B5:2', vol: 0.8 },
        { inst: 'guitar', seq: 'R:8 | R:8 | R:8 | R:4 B5:2 G#5:2 | A5:6 C6:2 | F5:6 A5:2 | D6:4 C6:2 A5:2 | B5:6 R:2', vol: 0.8 },
        { inst: 'ebass', seq: 'A1:3 A1:1 R:2 A1:2 | F1:3 F1:1 R:2 F1:2 | G1:3 G1:1 R:2 G1:2 | E2:3 E2:1 R:2 E2:2 | A1:3 A1:1 R:2 A1:2 | F1:3 F1:1 R:2 F1:2 | D2:3 D2:1 R:2 D2:2 | E2:3 E2:1 R:2 E2:2' },
        { drum: ('k...h...S...h.h.').repeat(7) + 'k...h...S.S.SSll' },
      ],
    },
    // レース：ホ短調、速いロック
    race: {
      bpm: 172, loop: true,
      tracks: [
        { inst: 'guitar', seq: 'E5 G5 B5 E6 D6 B5 G5 B5 | C6:2 B5:1 G5:1 E5:2 G5:2 | D6 A5 F#5 D5 F#5 A5 D6 E6 | F#6:3 E6:1 D#6:2 B5:2 | E6:2 B5:1 G5:1 E5:2 G5:1 B5:1 | C6:2 E6:2 G6:2 E6:2 | A5:2 C6:1 E6:1 D6:2 C6:2 | B5:2 D#6:2 F#6:4 | G5:3 A5:1 B5:2 D6:2 | F#5:3 G5:1 A5:2 D6:2 | E6:4 D6:2 B5:2 | C6:4 E6:2 G6:2 | A5:3 G5:1 E5:2 C6:2 | D6:3 E6:1 F#6:2 A5:2 | B5:4 A5:2 F#5:2 | D#6:2 F#6:2 B6:4' },
        { inst: 'power', seq: power(['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B', 'G', 'D', 'Em', 'C', 'Am', 'D', 'B', 'B']) },
        { inst: 'ebass', seq: rockBass(['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B', 'G', 'D', 'Em', 'C', 'Am', 'D', 'B', 'B']) },
        { inst: 'brass', seq: 'E4+G4+B4:2 R:6 | R:8 | R:8 | B3+D#4+F#4:1 R:1 B3+D#4+F#4:1 R:5 | R:8 | R:8 | R:8 | B3+D#4+F#4:2 R:2 B3+D#4+F#4:4 | G4+B4+D5:2 R:6 | R:8 | R:8 | R:8 | R:8 | R:8 | B3+D#4+F#4:2 R:2 B3+D#4+F#4:2 R:2 | B3+D#4+F#4:8', vol: 0.8 },
        { drum: CRASH + ROCK2.repeat(6) + FILL + CRASH + ROCK2.repeat(6) + FILL2 },
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
    // 勝ったとき：ギターとブラスで駆け上がる
    victory: {
      bpm: 150, loop: false,
      tracks: [
        { inst: 'guitar', seq: 'C5 E5 G5 C6 E6:2 D6:2 | C6:2 A5:2 B5:2 D6:2 | C6:8' },
        { inst: 'brass', seq: 'C5+E5+G5:2 R:2 C5+E5+G5:1 R:1 D5+F5+A5:2 | F5+A5+C6:4 G5+B5+D6:4 | C5+E5+G5+C6:8' },
        { inst: 'power', seq: 'C3+G3*8 | F2+C3*4 G2+D3*4 | C3+G3:8' },
        { inst: 'ebass', seq: 'C2:4 C2:2 D2:2 | F1:4 G1:4 | C2:8' },
        { drum: 'c.h.S.h.k.k.S.h.' + 'k.k.S.k.SSSSllll' + 'c...............' },
      ],
    },
  };
  AU.SONGS = SONGS;

  // 「音:長さ」を [{f:[周波数], len}] に
  function parse(seq) {
    const out = [];
    for (const tok0 of seq.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
      // 「音:長さ*回数」でくり返し
      const [tok, rep] = tok0.split('*');
      const [n, l] = tok.split(':');
      const len = l ? +l : 1;
      for (let i = 0; i < (rep ? +rep : 1); i++) out.push({ f: n === 'R' ? [] : n.split('+').map(freq).filter(Boolean), len });
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
    else if (name === 'whip') { noise(seBus, t, 0.05, 'highpass', 3000, 0.5); noise(seBus, t + 0.01, 0.08, 'bandpass', 1800, 0.35, 2); }
    else if (name === 'skill') { ['E6', 'B6', 'E7'].forEach((n, i) => tone(seBus, freq(n), t + i * 0.05, 0.18, 'bell', 1.4)); }
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
