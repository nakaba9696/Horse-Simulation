// 音：BGM と効果音を Web Audio で鳴らす（音のファイルは使わない。曲はこのゲームのための書き下ろし）
// 音色は FM 風のブラス・エレピ、リードシンセ、スラップベース、雑音とピッチの下がる正弦で作る太鼓。
// 全体に軽い響き（雑音で作った ConvolverNode）と、付点8分の山びこ、コンプレッサーをかける。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const AU = HS.Audio = {};
  const KEY = 'horse-sim-audio-v1';
  AU.settings = { bgm: 0.5, se: 0.7 };
  try { Object.assign(AU.settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* 既定のまま */ }
  AU.saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(AU.settings)); } catch (e) { /* 保存できなくても鳴らせる */ } };

  let E = null; // 鳴らす仕組み（ctx・バス・響き）。書き出し（AU.render）のときだけ一時的に差し替える
  let wantSong = null, cur = null, timer = null;
  const BGM_GAIN = 0.6;

  // 雑音で作った響き（2秒ほど。後ろほど暗く）
  function impulse(c, sec, decay) {
    const n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n, a = 0.85 - 0.7 * k;
        y += a * ((Math.random() * 2 - 1) - y);
        d[i] = y * Math.pow(1 - k, decay) * (i < c.sampleRate * 0.008 ? i / (c.sampleRate * 0.008) : 1);
      }
    }
    return buf;
  }
  function makeEngine(c, bgmVol) {
    const e = { ctx: c };
    const g = v => { const n = c.createGain(); n.gain.value = v; return n; };
    e.master = g(0.9);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.2;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
    e.master.connect(comp); comp.connect(lim); lim.connect(c.destination);
    e.bgmBus = g(bgmVol); e.bgmBus.connect(e.master);
    e.seBus = g(AU.settings.se); e.seBus.connect(e.master);
    // 倍音を絞った波形（フィルターを音ごとに置くと重いので、波形の側で丸めておく）
    const wave = (n, pow, odd) => { const re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) if (!odd || k % 2) im[k] = 1 / Math.pow(k, pow); return c.createPeriodicWave(re, im); };
    e.wave = { warm: wave(16, 1.5), soft: wave(10, 2), bright: wave(28, 1.05), reed: wave(14, 1.2, true) };
    e.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = e.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; // 雑音の素（ゲームの乱数とは無関係）
    // 響き
    const conv = c.createConvolver(); conv.buffer = impulse(c, 2.2, 3.2);
    e.rev = g(1); const revOut = g(0.5);
    e.rev.connect(conv); conv.connect(revOut); revOut.connect(e.bgmBus);
    // 山びこ（付点8分。曲ごとに速さを合わせる）
    e.delay = c.createDelay(2); e.delay.delayTime.value = 0.3;
    const fb = g(0.3), dlf = c.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2600;
    e.dly = g(1); const dlyOut = g(0.45);
    e.dly.connect(e.delay); e.delay.connect(dlf); dlf.connect(fb); fb.connect(e.delay); dlf.connect(dlyOut); dlyOut.connect(e.bgmBus);
    return e;
  }

  // ブラウザは操作のあとでないと音を出せないので、最初の操作で準備する
  AU.unlock = function () {
    if (E) { if (E.ctx.state === 'suspended') E.ctx.resume(); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    let c;
    try { c = new AC(); } catch (e) { return; }
    E = makeEngine(c, AU.settings.bgm * BGM_GAIN);
    if (wantSong) { const [s, r] = wantSong; wantSong = null; AU.bgm(s, r); }
  };
  AU.ready = () => !!E;
  AU.applyVolume = function () {
    if (!E) return;
    E.bgmBus.gain.setTargetAtTime(AU.settings.bgm * BGM_GAIN, E.ctx.currentTime, 0.05);
    E.seBus.gain.setTargetAtTime(AU.settings.se, E.ctx.currentTime, 0.05);
  };
  if (globalThis.document && document.addEventListener) ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => AU.unlock(), { passive: true }));

  // ---------- 音の高さ ----------
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const midi = n => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return null; return NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
  const nname = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const freq = n => { const m = midi(n); return m == null ? null : hz(m); };
  // 旋律を半音 k だけ移す（T(旋律, -12) で1オクターブ下）
  const T = (seq, k) => seq.replace(/([A-G][#b]?)(-?\d)/g, s => nname(midi(s) + k));

  // ---------- 音の部品 ----------
  function osc(type, f, t, end) { const o = E.ctx.createOscillator(); if (E.wave[type]) o.setPeriodicWave(E.wave[type]); else o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end); return o; }
  function gn(v) { const g = E.ctx.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { const b = E.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
  // 音量の形：a 秒で peak、d 秒ほどで sus まで下がり、離したら r 秒ほどで消える
  function amp(g, t, dur, a, peak, d, sus, r) {
    const p = g.gain;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * sus, t + a, Math.max(0.005, d / 3));
    p.setTargetAtTime(0, t + Math.max(dur, a), Math.max(0.005, r / 4));
  }
  // 遅れてかかるビブラート
  function vib(oscs, f, t, rate, depth, delay, end) {
    const l = osc('sine', rate, t, end), lg = gn(0);
    lg.gain.setValueAtTime(0, t + delay); lg.gain.linearRampToValueAtTime(f * depth, t + delay + 0.3);
    l.connect(lg); for (const o of oscs) lg.connect(o.frequency);
  }
  let distCurve = null;
  const dist = () => {
    if (distCurve) return distCurve;
    const n = 1024, k = 24; distCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; distCurve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return distCurve;
  };
  // 楽器：V[名前](出口, 周波数の並び, 時刻, 長さ, 強さ)
  const V = {};
  const each = fn => (out, fs, t, dur, v) => { for (const f of fs) fn(out, f, t, dur, v / Math.sqrt(Math.max(1, fs.length) * 0.7)); };
  // リードシンセ：のこぎりと矩形を少しずらして重ね、明るいフィルター
  V.lead = each((out, f, t, dur, v) => {
    const end = t + dur + 0.25;
    const a = osc('bright', f, t, end), b = osc('reed', f, t, end); a.detune.value = -6; b.detune.value = 6;
    const bg = gn(0.55), g = gn(0); a.connect(g); b.connect(bg); bg.connect(g); g.connect(out);
    if (dur > 0.25) vib([a, b], f, t, 5.6, 0.005, 0.22, end);
    amp(g, t, dur, 0.008, 0.1 * v, 0.2, 0.8, 0.14);
  });
  // やわらかいリード（ホーム）
  V.soft = each((out, f, t, dur, v) => {
    const end = t + dur + 0.35;
    const a = osc('triangle', f, t, end), b = osc('soft', f, t, end); b.detune.value = 4;
    const bg = gn(0.4), g = gn(0); a.connect(g); b.connect(bg); bg.connect(g); g.connect(out);
    if (dur > 0.3) vib([a, b], f, t, 5, 0.004, 0.25, end);
    amp(g, t, dur, 0.02, 0.2 * v, 0.3, 0.75, 0.2);
  });
  // FM 風のブラス：変調の深さが立ち上がりで開いて、少し戻る。下からしゃくり上げる。のこぎりの層で厚く
  V.brass = each((out, f, t, dur, v) => {
    const end = t + dur + 0.3;
    const car = osc('sine', f, t, end), mod = osc('sine', f, t, end), mg = gn(0);
    car.frequency.setValueAtTime(f * 0.97, t); car.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(f * 3.6, t + 0.05); mg.gain.setTargetAtTime(f * 1.8, t + 0.05, 0.15); mg.gain.setTargetAtTime(f * 0.4, t + dur, 0.06);
    mod.connect(mg); mg.connect(car.frequency);
    const s1 = osc('warm', f, t, end); s1.detune.value = 8;
    const sg = gn(0); s1.connect(sg);
    sg.gain.setValueAtTime(0.15, t); sg.gain.linearRampToValueAtTime(0.5, t + 0.06); sg.gain.setTargetAtTime(0.38, t + 0.06, 0.2);
    const cg = gn(0.6); car.connect(cg);
    if (dur > 0.45) vib([car, s1], f, t, 5.2, 0.004, 0.3, end);
    const g = gn(0); cg.connect(g); sg.connect(g); g.connect(out);
    amp(g, t, dur, 0.035, 0.12 * v, 0.25, 0.75, 0.16);
  });
  // FM 風のエレピ：胴の鳴り（1:1）と、叩いた瞬間の金属の音（1:14）
  V.epiano = each((out, f, t, dur, v) => {
    const end = t + dur + 0.45;
    const c1 = osc('sine', f, t, end), m1 = osc('sine', f, t, end), g1 = gn(0);
    g1.gain.setValueAtTime(f * 1.6 * v, t); g1.gain.setTargetAtTime(f * 0.25, t, 0.35);
    m1.connect(g1); g1.connect(c1.frequency);
    const c2 = osc('sine', f, t, t + 0.4), m2 = osc('sine', f * 14, t, t + 0.4), g2 = gn(0);
    g2.gain.setValueAtTime(f * 1.4, t); g2.gain.setTargetAtTime(0, t, 0.025);
    m2.connect(g2); g2.connect(c2.frequency);
    const tg = gn(0); tg.gain.setValueAtTime(0.35, t); tg.gain.setTargetAtTime(0, t, 0.06); c2.connect(tg);
    const g = gn(0); c1.connect(g); tg.connect(g); g.connect(out);
    const p = g.gain, peak = 0.13 * v;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + 0.003);
    p.setTargetAtTime(0, t + 0.003, f < 300 ? 0.9 : 0.6);
    p.setTargetAtTime(0, t + dur, 0.08);
  });
  // ベル（きらめき）
  V.bell = each((out, f, t, dur, v) => {
    const end = t + dur + 1.6;
    const c = osc('sine', f, t, end), m = osc('sine', f * 3.5, t, end), mg = gn(0);
    mg.gain.setValueAtTime(f * 2, t); mg.gain.setTargetAtTime(f * 0.2, t, 0.3);
    m.connect(mg); mg.connect(c.frequency);
    const g = gn(0); c.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * v, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, 0.45);
  });
  // パッド・ストリングス
  V.pad = each((out, f, t, dur, v) => {
    const end = t + dur + 1.0;
    const a = osc('soft', f, t, end), b = osc('soft', f, t, end); a.detune.value = -10; b.detune.value = 10;
    const g = gn(0); a.connect(g); b.connect(g); g.connect(out);
    amp(g, t, dur, 0.35, 0.045 * v, 0.4, 0.9, 0.7);
  });
  V.strings = each((out, f, t, dur, v) => {
    const end = t + dur + 0.8;
    const os = [-10, 10].map(dt => { const o = osc('warm', f, t, end); o.detune.value = dt; return o; });
    const g = gn(0); for (const o of os) o.connect(g); g.connect(out);
    vib(os, f, t, 5.4, 0.004, 0.3, end);
    amp(g, t, dur, 0.1, 0.05 * v, 0.3, 0.9, 0.45);
  });
  // ひずんだギター（単音）・刻み（和音をまとめてひずませる）
  V.guitar = each((out, f, t, dur, v) => {
    const end = t + dur + 0.25;
    const a = osc('sawtooth', f, t, end), b = osc('sawtooth', f, t, end); a.detune.value = -8; b.detune.value = 8;
    const pre = gn(0.5); a.connect(pre); b.connect(pre);
    const ws = E.ctx.createWaveShaper(); ws.curve = dist(); pre.connect(ws);
    const fl = filt('lowpass', 3600, 1); ws.connect(fl);
    if (dur > 0.25) vib([a, b], f, t, 5.8, 0.006, 0.18, end);
    const g = gn(0); fl.connect(g); g.connect(out);
    amp(g, t, dur, 0.005, 0.06 * v, 0.2, 0.85, 0.1);
  });
  V.power = (out, fs, t, dur, v) => {
    const end = t + dur + 0.2, pre = gn(0.5);
    fs.forEach((f, i) => { const o = osc('sawtooth', f, t, end); o.detune.value = i % 2 ? 7 : -7; o.connect(pre); });
    const ws = E.ctx.createWaveShaper(); ws.curve = dist(); pre.connect(ws);
    const fl = filt('lowpass', 2300, 0.9); ws.connect(fl);
    const g = gn(0); fl.connect(g); g.connect(out);
    amp(g, t, dur, 0.003, 0.05 * v, 0.12, 0.5, 0.05);
  };
  // アルペジオ（短く弾く矩形）
  V.arp = each((out, f, t, dur, v) => {
    const end = t + dur + 0.3;
    const a = osc('square', f, t, end), fl = filt('lowpass', f * 8, 3);
    fl.frequency.setValueAtTime(Math.min(f * 8, 9000), t); fl.frequency.setTargetAtTime(f * 2, t, 0.05);
    a.connect(fl);
    const g = gn(0); fl.connect(g); g.connect(out);
    amp(g, t, dur, 0.002, 0.06 * v, 0.15, 0.15, 0.06);
  });
  // ベース：スラップ（叩いた瞬間にフィルターが開く）・ピック弾き
  V.slap = each((out, f, t, dur, v) => {
    const end = t + dur + 0.2;
    const a = osc('sawtooth', f, t, end), s = osc('sine', f, t, end);
    const fl = filt('lowpass', f, 4.5);
    fl.frequency.setValueAtTime(Math.min(f * 28, 5200), t); fl.frequency.setTargetAtTime(f * 2.5, t, 0.045);
    a.connect(fl);
    const sg = gn(0.7); s.connect(sg);
    const g = gn(0); fl.connect(g); sg.connect(g); g.connect(out);
    amp(g, t, dur, 0.002, 0.24 * v, 0.25, 0.5, 0.05);
  });
  V.bass = each((out, f, t, dur, v) => {
    const end = t + dur + 0.2;
    const a = osc('sawtooth', f, t, end), s = osc('sine', f, t, end);
    const fl = filt('lowpass', f * 3, 1.2);
    fl.frequency.setValueAtTime(Math.min(f * 9, 3000), t); fl.frequency.setTargetAtTime(f * 3, t, 0.08);
    a.connect(fl);
    const sg = gn(0.6); s.connect(sg);
    const g = gn(0); fl.connect(g); sg.connect(g); g.connect(out);
    amp(g, t, dur, 0.004, 0.2 * v, 0.2, 0.8, 0.06);
  });

  // ---------- 太鼓（雑音とピッチの下がる正弦） ----------
  function hit(out, t, dur, type, f, vol, tc, q) {
    const s = E.ctx.createBufferSource(); s.buffer = E.noise;
    const fl = filt(type, f, q), g = gn(0);
    s.connect(fl); fl.connect(g); g.connect(out);
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t, tc);
    s.start(t, Math.random() * 1.5); s.stop(t + dur);
  }
  function drop(out, t, f0, f1, fall, vol, tc, type) {
    const o = osc(type || 'sine', f0, t, t + tc * 6 + 0.05), g = gn(0);
    o.frequency.exponentialRampToValueAtTime(f1, t + fall);
    o.connect(g); g.connect(out);
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + 0.005, tc);
  }
  const DR = {
    k: (o, t, v) => { drop(o, t, 160, 46, 0.09, 0.9 * v, 0.1); hit(o, t, 0.03, 'highpass', 2500, 0.25 * v, 0.006); },
    s: (o, t, v) => { hit(o, t, 0.3, 'highpass', 1100, 0.45 * v, 0.055); hit(o, t, 0.15, 'bandpass', 2800, 0.25 * v, 0.03, 0.8); drop(o, t, 220, 170, 0.05, 0.35 * v, 0.035, 'triangle'); },
    h: (o, t, v) => hit(o, t, 0.07, 'highpass', 7500, 0.14 * v, 0.012),
    o: (o, t, v) => hit(o, t, 0.4, 'highpass', 7000, 0.12 * v, 0.09),
    c: (o, t, v) => { hit(o, t, 2.4, 'highpass', 3800, 0.22 * v, 0.5); hit(o, t, 1.2, 'bandpass', 5500, 0.12 * v, 0.25, 0.6); },
    r: (o, t, v) => hit(o, t, 0.7, 'bandpass', 7200, 0.12 * v, 0.14, 1.2),
    t: (o, t, v) => { drop(o, t, 220, 140, 0.3, 0.55 * v, 0.11); hit(o, t, 0.05, 'lowpass', 1800, 0.12 * v, 0.015); },
    m: (o, t, v) => { drop(o, t, 160, 100, 0.3, 0.55 * v, 0.12); hit(o, t, 0.05, 'lowpass', 1500, 0.12 * v, 0.015); },
    l: (o, t, v) => { drop(o, t, 112, 70, 0.32, 0.6 * v, 0.14); hit(o, t, 0.05, 'lowpass', 1200, 0.12 * v, 0.015); },
    T: (o, t, v) => { drop(o, t, 96, 88, 0.5, 0.6 * v, 0.3); drop(o, t, 146, 140, 0.4, 0.2 * v, 0.2); hit(o, t, 0.1, 'lowpass', 320, 0.3 * v, 0.04); },
  };
  const VEL = { X: 1, x: 0.7, g: 0.28 };
  // 太鼓の置き場所（左右・響き）
  const DMIX = { k: { rev: 0.04 }, s: { rev: 0.28 }, h: { pan: 0.25, vol: 0.9, rev: 0.04 }, o: { pan: 0.25, rev: 0.06 }, c: { pan: -0.3, rev: 0.25 }, r: { pan: -0.2, rev: 0.1 }, t: { pan: -0.25, rev: 0.2 }, m: { pan: 0, rev: 0.2 }, l: { pan: 0.25, rev: 0.2 }, T: { rev: 0.35 } };

  // ---------- 曲の書式 ----------
  // 旋律：「音:長さ」を空白で並べる。長さは8分音符を1とする（0.5 で16分）。和音は「+」、休符は R、「*回数」でくり返し、
  //       「@楽器」で以後の楽器を替える。小節の区切り「|」は読み飛ばす（長さの確かめに使う）
  // 太鼓：{ k: 'X...x...', s: ..., h: ... } のように太鼓ごとの列。1文字が16分音符。X 強く・x 普通・g 弱く・. 休み
  // 曲（SONGS）は { bpm, loop, loopStart（くり返しの始まり。8分音符で数える）, length, tracks: [{ name, mix, seq } | { name, drum }] }
  function parseSeq(seq, inst0) {
    const out = []; let p = 0, inst = inst0 || 'lead';
    for (const tok0 of seq.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
      if (tok0[0] === '@') { inst = tok0.slice(1); continue; }
      const [tok, rep] = tok0.split('*');
      const [n, l] = tok.split(':');
      const len = l ? +l : 1;
      const notes = n === 'R' ? [] : n.split('+').map(midi);
      for (let i = 0; i < (rep ? +rep : 1); i++) {
        if (notes.length) out.push({ p, len, notes, inst, bad: notes.some(x => x == null) || !(len > 0) });
        else if (!(len > 0)) out.push({ p, len, notes, inst, bad: true });
        p += len;
      }
    }
    return { events: out, length: p };
  }

  // ---------- 伴奏を作る道具（コードの並びと型から） ----------
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus: [0, 5, 7], sus4: [0, 5, 7], '7sus': [0, 5, 7, 10],
    add9: [0, 4, 7, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], m7b5: [0, 3, 6, 10], dim: [0, 3, 6], 5: [0, 7],
  };
  const PCS = s => { const m = midi(s + '4'); return m == null ? null : m % 12; };
  function parseChord(sym) {
    const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym);
    if (!m || !QUAL[m[2]] || PCS(m[1]) == null) return null;
    const root = PCS(m[1]);
    return { sym, root, bass: m[3] ? PCS(m[3]) : root, iv: QUAL[m[2]] };
  }
  // 「C G/B | Am」：小節は | で区切り、小節の中は空白で等分（「C:6 D:2」と長さも書ける）
  function parseChords(str, errs, where) {
    return str.split('|').map(b => {
      const toks = b.trim().split(/\s+/).filter(Boolean);
      const out = []; let p = 0;
      toks.forEach(tk => {
        const [s, l] = tk.split(':');
        const len = l ? +l : 8 / toks.length;
        const c = parseChord(s);
        if (!c) errs.push(`${where}: コードが読めない ${s}`);
        out.push({ c: c || parseChord('C'), p, len }); p += len;
      });
      if (p !== 8) errs.push(`${where}: 小節の長さが ${p}（8 のはず）`);
      return out;
    });
  }
  const lowest = (pc, lo) => { let n = lo + ((pc - lo) % 12 + 12) % 12; return n; };
  const voicing = (c, lo) => c.iv.map(i => lowest((c.root + i) % 12, lo)).sort((a, b) => a - b);
  const bassNote = (c, kind) => {
    const r = lowest(c.bass, 28);
    if (kind === 'o') return r + 12;
    if (kind === '5') { const f = lowest((c.root + 7) % 12, r); return f; }
    return r;
  };
  const LO = { brass: 60, epiano: 55, pad: 52, strings: 55, arp: 64, power: 40, bell: 72, soft: 60, lead: 64, guitar: 60 };
  // 型：[位置, 長さ, 何を鳴らすか]（位置と長さは8分音符で、1小節＝8）
  const PAT = {
    // ベース
    rock8: [0, 1, 2, 3, 4, 5, 6, 7].map(p => [p, 1, p === 7 ? 'o' : 'r']),
    drive: [[0, 1, 'r'], [1, 1, 'r'], [2, 1, 'o'], [3, 1, 'r'], [4, 1, 'r'], [5, 1, 'r'], [6, 1, 'o'], [7, 1, '5']],
    gallop: [0, 2, 4, 6].flatMap(q => [[q, 1, 'r'], [q + 1, 0.5, 'r'], [q + 1.5, 0.5, q === 6 ? 'o' : 'r']]),
    slap: [[0, 0.75, 'r'], [1, 0.5, 'o'], [1.5, 0.5, 'r'], [2.5, 0.5, 'r'], [3, 0.5, 'o'], [4, 0.75, 'r'], [5, 0.5, '5'], [5.5, 0.5, 'o'], [6.5, 0.5, 'r'], [7, 0.5, 'o'], [7.5, 0.5, '5']],
    pump: [[0, 1.5, 'r'], [1.5, 0.5, 'r'], [2, 1, 'o'], [3, 1, '5'], [4, 1.5, 'r'], [5.5, 0.5, 'r'], [6, 1, 'o'], [7, 1, '5']],
    anthem: [[0, 2, 'r'], [2, 1, 'r'], [3, 1, '5'], [4, 2, 'o'], [6, 1, '5'], [7, 1, 'r']],
    half: [[0, 3, 'r'], [3, 1, 'r'], [4, 4, '5']],
    whole: [[0, 8, 'r']],
    // 和音
    ep: [[1, 1, 'c'], [2.5, 0.5, 'c'], [3.5, 1, 'c'], [5, 1, 'c'], [6.5, 1.5, 'c']],
    stab: [[0, 1, 'c'], [3, 1, 'c'], [5, 0.5, 'c'], [6, 1, 'c']],
    hit: [[0, 2, 'c']],
    power8: [0, 1, 2, 3, 4, 5, 6, 7].map(p => [p, 1, 'p']),
    arp16: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3].map((k, i) => [i * 0.5, 0.5, 'a' + k]),
    arp8: [0, 1, 2, 3, 4, 3, 2, 1].map((k, i) => [i, 1, 'a' + k]),
    sus: 'sus',
  };
  function genTrack(pat, bars, inst) {
    const lo = LO[inst] || 55;
    return bars.map(bar => {
      if (pat === 'sus') return bar.map(s => `${voicing(s.c, lo).map(nname).join('+')}:${s.len}`).join(' ');
      let cur = 0; const toks = [];
      for (const [p, l, w] of pat) {
        const si = bar.findIndex(s => p >= s.p && p < s.p + s.len), slot = bar[si];
        const len = Math.min(l, slot.p + slot.len - p); // コードの変わり目で切る
        let kind = w;
        if ((kind === 'o' || kind === '5') && p === slot.p && si > 0) kind = 'r'; // 変わり目は根音から
        let notes;
        if (kind === 'c') notes = voicing(slot.c, lo);
        else if (kind === 'p') { const r = lowest(slot.c.root, lo); notes = [r, r + 7, r + 12]; }
        else if (kind[0] === 'a') { const vc = voicing(slot.c, lo), k = +kind.slice(1); notes = [vc[k % vc.length] + 12 * Math.floor(k / vc.length)]; }
        else notes = [bassNote(slot.c, kind)];
        if (p > cur) toks.push(`R:${p - cur}`);
        toks.push(`${notes.map(nname).join('+')}:${len}`);
        cur = p + len;
      }
      if (cur < 8) toks.push(`R:${8 - cur}`);
      return toks.join(' ');
    }).join(' | ');
  }
  // 太鼓の型（1小節＝16文字）
  const DRUMS = {
    rock: { main: { k: 'X.....x.X.x.....', s: '....X.......X...', h: 'X.x.X.x.X.x.X.x.' } },
    funk: { main: { k: 'X.....x...X..x..', s: '....X..g.g..X..g', h: 'XxXxXxXxXxXxXx.x', o: '..............X.' }, fill: { k: 'X.....x...X.....', s: '....X..g.XgXXgXX', h: 'XxXxXxXx........' } },
    half: { main: { k: 'X.....x...x.....', s: '........X.......', h: 'X.x.X.x.X.x.X.x.' } },
    race: { main: { k: 'X.x...x.X.x...x.', s: '....X......gX...', h: 'X.xxX.xxX.xxX.xx' }, fill: { k: 'X.x...x.X.......', s: '....X...XxXxXXXX', h: 'X.xxX.xx........' } },
    tension: { main: { k: 'X.....x.X.......', s: '........X.......', h: 'x.X.x.X.x.X.x.X.' } },
    epic: { main: { k: 'X.......X.....x.', s: '........X.......', r: 'x...x...x...x...', T: 'X...............' }, fill: { k: 'X.......X.......', s: '........ggggXXXX', T: 'X.......XxXxXXXX' } },
  };
  const FILL = { k: 'X.....x.X.......', s: '....X...XX......', t: '..........XX....', m: '............XX..', l: '..............XX', h: 'X.x.X.x.........' };
  const MIX = { lead: { vol: 1, rev: 0.18, dly: 0.2 }, lead2: { vol: 0.8, pan: -0.12, rev: 0.22, dly: 0.06 }, comp: { vol: 0.8, pan: 0.22, rev: 0.2 }, pad: { vol: 0.75, pan: -0.2, rev: 0.35 }, bass: { vol: 1, rev: 0.02 } };
  const errors = [];
  const rests = n => Array(n).fill('R:8').join(' | ');

  // 曲を組み立てる：parts（部分ごとのコード・旋律）を intro・form の順に並べ、伴奏と太鼓を型から作る
  function arrange(name, sp) {
    const band = Object.assign({ lead: 'lead', lead2: 'brass', comp: null, compInst: 'epiano', pad: null, padInst: 'pad', bass: 'rock8', bassInst: 'bass', drum: 'rock' }, sp.band);
    const part = k => { const p = sp.parts[k]; if (!p) { errors.push(`${name}: 部分 ${k} が無い`); return { ch: 'C' }; } return p.from ? Object.assign({}, part(p.from), p, { from: null }) : p; };
    const order = (sp.intro || []).concat(sp.form);
    const seqs = { lead: [], lead2: [], comp: [], pad: [], bass: [] };
    const lanes = {}; let bars = 0, loopBars = 0;
    order.forEach((k, idx) => {
      if (idx === (sp.intro || []).length) loopBars = bars;
      const P = Object.assign({}, band, part(k));
      const where = `${name}.${k}`;
      const cb = parseChords(P.ch, errors, where), nb = cb.length;
      const fit = (tr, s, inst) => {
        const ln = parseSeq(s).length;
        if (Math.abs(ln - nb * 8) > 1e-6) errors.push(`${where}.${tr}: 長さ ${ln}（${nb * 8} のはず）`);
        seqs[tr].push(`@${inst} ${s}`);
      };
      fit('lead', P.mel || rests(nb), P.lead);
      fit('lead2', P.mel2 || rests(nb), P.lead2);
      for (const [tr, inst] of [['comp', P.compInst], ['pad', P.padInst], ['bass', P.bassInst]]) {
        const v = P[tr];
        fit(tr, !v ? rests(nb) : PAT[v] ? genTrack(PAT[v], cb, inst) : v, inst);
      }
      // 太鼓
      const L = {};
      if (P.dr) Object.assign(L, P.dr);
      else if (P.drum && DRUMS[P.drum]) {
        const st = DRUMS[P.drum];
        for (let b = 0; b < nb; b++) {
          const pat = b === nb - 1 && P.fill !== false ? (st.fill || FILL) : st.main;
          for (const ln of new Set([...Object.keys(L), ...Object.keys(pat)])) L[ln] = (L[ln] || '.'.repeat(b * 16)) + (pat[ln] || '.'.repeat(16));
        }
        if (P.crash !== false) { L.c = 'X' + (L.c || '.'.repeat(nb * 16)).slice(1); L.k = 'X' + (L.k || '.'.repeat(nb * 16)).slice(1); if (L.h) L.h = '.' + L.h.slice(1); }
      } else if (P.drum && !DRUMS[P.drum]) errors.push(`${where}: 太鼓の型 ${P.drum} が無い`);
      for (const ln of Object.keys(L)) if (L[ln].length !== nb * 16) errors.push(`${where}.drum.${ln}: 長さ ${L[ln].length}（${nb * 16} のはず）`);
      for (const ln of new Set([...Object.keys(lanes), ...Object.keys(L)])) lanes[ln] = (lanes[ln] || '.'.repeat(bars * 16)) + (L[ln] || '.'.repeat(nb * 16));
      bars += nb;
    });
    const tracks = Object.keys(seqs).map(k => ({ name: k, mix: Object.assign({}, MIX[k], (sp.mix || {})[k]), seq: seqs[k].join(' | ') }));
    tracks.push({ name: 'drums', drum: lanes, mix: Object.assign({ vol: 1 }, (sp.mix || {}).drums) });
    return { bpm: sp.bpm, loop: !!sp.loop, loopStart: sp.loop ? loopBars * 8 : 0, length: bars * 8, tracks };
  }

  // ---------- 曲（どれもこのゲームのための書き下ろし） ----------
  // 90年代後半の家庭用ゲームの、ブラスとリードシンセが歌うフュージョン・ロックの調子
  const MEL = {};
  // タイトル：ニ長調。堂々と始まり、サビへ向けて高まる
  MEL.tA = 'F#5:1.5 E5:0.5 F#5:1 A5:3 F#5:1 E5:1 | G#5:2 F#5:1 E5:1 C#5:2 A#4:2 | B4:1.5 C#5:0.5 D5:1 F#5:3 E5:1 D5:1 | E5:2 C5:1 A4:1 F#4:2 A4:1 C5:1 | B4:1.5 D5:0.5 F#5:1 B5:3 A5:1 F#5:1 | A5:2 E5:1 C#5:1 D5:2 F#5:2 | G5:1 F#5:1 E5:1 D5:1 E5:2 B4:2 | D5:3 C#5:1 E5:2 G5:2';
  MEL.tC = 'B5:3 A5:1 B5:2 D6:2 | C#6:3 B5:1 C#6:2 E6:2 | F#6:4 E6:2 C#6:2 | D6:6 B5:1 C#6:1 | D6:3 E6:1 D6:2 B5:2 | C#6:3 D6:1 E6:2 A5:2 | D6:3 F6:1 E6:3 G6:1';
  // レース：ホ短調。速く、ハイハットとベースが駆ける
  MEL.rA = T('E5:1 G5:1 B5:1 E6:2 D6:1 B5:1 G5:1 | F#5:1.5 A5:1.5 D6:3 A5:1 F#5:1 | G5:1.5 E5:1.5 C5:1 E5:1 G5:1 C6:1 E6:1 | D6:3 C6:1 B5:1 A5:1 F#5:2 | E5:1 G5:1 B5:1 E6:2 F#6:1 G6:2 | F#6:3 E6:1 D6:2 A5:2 | C6:2 B5:1 A5:1 G5:2 E5:2 | D#5:2 F#5:2 A5:2 B5:2', -12);
  MEL.rC = T('E6:3 D6:1 E6:2 G6:2 | F#6:3 E6:1 D6:2 A5:2 | B5:3 A5:1 B5:2 D6:2 | E6:6 R:2 | G6:3 F#6:1 E6:2 C6:2 | D6:3 E6:1 F#6:2 A6:2 | E6:4 F#6:2 E6:2 | D#6:4 B5:2 F#5:2', -12);
  MEL.hA = 'R:1 C5:1 F5:1 G5:1 A5:2 G5:1 F5:1 | E5:2 G5:1 E5:1 C#5:2 A4:2 | D5:1 E5:1 F5:1 A5:1 C6:2 A5:2 | Bb5:2 G5:1 Eb5:1 A5:2 F5:2 | R:1 D5:1 F5:1 A5:1 C6:3 A5:1 | G5:2 E5:1 C5:1 F#5:2 A5:2 | Bb5:1.5 A5:0.5 G5:1 F5:1 D5:2 F5:2 | G5:4 E5:2 R:2';
  MEL.pA = 'B4:6 G4:1 A4:1 | B4:3 C5:1 D5:4 | E5:6 D5:1 C5:1 | B4:4 D#5:4 | G5:6 F#5:1 E5:1 | F#5:3 E5:1 D5:4 | C5:3 E5:1 A5:4 | F#5:4 D#5:4';
  MEL.fA = 'G4:3 C5:1 Eb5:3 D5:1 | C5:6 Eb5:1 F5:1 | G5:3 F5:1 Eb5:2 Bb4:2 | D5:6 F5:1 G5:1 | G5:3 Eb5:1 C6:3 Bb5:1 | Ab5:6 G5:1 F5:1 | Eb5:2 F5:2 Ab5:2 C6:2 | C6:4 B5:4';
  MEL.fC = 'C6:6 Bb5:1 Ab5:1 | Bb5:6 Ab5:1 G5:1 | G5:8 | R:4 G5:1 C6:1 D6:1 Eb6:1 | Eb6:6 D6:1 C6:1 | D6:6 C6:1 D6:1 | C6:8 | B5:6 R:2';
  MEL.gA = 'D5:2 F5:2 Bb5:3 A5:1 | A5:3 G5:1 F5:4 | G5:2 Bb5:2 D6:3 C6:1 | Bb5:6 G5:1 Bb5:1 | C6:3 Bb5:1 G5:2 Eb5:2 | F5:3 G5:1 A5:2 C6:2 | D6:3 C6:1 Bb5:2 G5:2 | Bb5:4 A5:4';

  const SPEC = {
    title: {
      bpm: 148, loop: true,
      band: { lead: 'lead', comp: 'ep', bass: 'drive', drum: 'rock' },
      intro: ['I'], form: ['A', 'A2', 'B', 'C', 'C2'],
      parts: {
        I: {
          ch: 'Bb C | D | Bb C | A7', lead: 'brass', comp: null, pad: 'sus', padInst: 'strings', bass: 'rock8',
          mel: 'D5+F5:3 D5+F5:1 E5+G5:3 E5+G5:1 | D5+F#5+A5:6 R:2 | D5+F5:3 D5+F5:1 E5+G5:3 E5+A5:1 | E5 F#5 G5 A5 B5 C#6 D6 E6',
          dr: {
            k: 'X.....X.X.....X.X...............X.....X.X.....X.X...X...X...X...',
            s: '......X.......X...........g.g.g.......X.......X.X.X.X.X.XXXXXXXX',
            c: 'X.......X.......X...............X.......X.......................',
            T: '................X.......XxXxXXXX................................',
          },
        },
        A: { ch: 'Dmaj7 | C#m7 F#7 | Bm7 | Am7 D7 | Gmaj7 | F#m7 Bm7 | Em7 | A7sus A7', mel: MEL.tA },
        A2: { from: 'A', mel2: T(MEL.tA, 12), lead2: 'bell' },
        B: {
          ch: 'Em7 | F#m7 | Gmaj7 | A/G | F#m7 | Bm7 | Em7 A/G | A7sus A7', drum: 'half',
          mel: 'B4:1 D5:1 E5:2 R:1 D5:1 E5:1 G5:1 | A5:2 R:1 E5:1 F#5:2 R:2 | B4:1 D5:1 G5:2 R:1 F#5:1 G5:1 B5:1 | C#6:2 R:1 A5:1 B5:2 R:2 | C#6:1.5 B5:0.5 A5:1 F#5:1 A5:2 C#6:2 | D6:1.5 C#6:0.5 B5:1 F#5:1 B5:2 D6:2 | E6:2 D6:1 B5:1 C#6:2 A5:2 | B5:2 A5:1 B5:1 C#6:1 D6:1 E6:2',
          mel2: 'R:8 | R:6 C#5+E5+A5:1 C#5+E5+A5:1 | R:8 | R:6 E5+A5+C#6:1 E5+A5+C#6:1 | R:8 | R:8 | E5+G5+B5:4 E5+A5+C#6:4 | D5+E5+A5:4 C#5+E5+G5+A5:4',
        },
        C: { ch: 'G | A | F#m7 | Bm7 | Em7 | A | Bb C | D', comp: 'power8', compInst: 'power', pad: 'sus', padInst: 'strings', bass: 'rock8', mel: T(MEL.tC + ' | F#6:6 R:2', -12), mel2: T(MEL.tC + ' | F#6:6 R:2', -12) },
        C2: { from: 'C', ch: 'G | A | F#m7 | Bm7 | Em7 | A | Bb C | A7sus A7', mel: T(MEL.tC + ' | E6:4 D6:2 C#6:2', -12), mel2: T(MEL.tC + ' | E6:4 D6:2 C#6:2', -12) },
      },
    },
    // ホーム・厩舎：ヘ長調のフュージョン。スラップベースとエレピに、やわらかいリードが歌う
    home: {
      bpm: 112, loop: true,
      band: { lead: 'soft', comp: 'ep', bass: 'slap', bassInst: 'slap', drum: 'funk' },
      form: ['A', 'B', 'A2', 'C'],
      parts: {
        A: { ch: 'Fmaj7 | Em7 A7 | Dm7 | Cm7 F7 | Bbmaj7 | Am7 D7 | Gm7 | C7sus C7', mel: MEL.hA },
        B: {
          ch: 'Bbmaj7 | C/Bb | Am7 | Dm7 | Gm7 | C7 | Fmaj7 Dm7 | Gm7 C7',
          mel: 'F5:3 G5:1 A5:2 F5:2 | E5:3 F5:1 G5:2 E5:2 | C5:1 E5:1 G5:1 A5:1 C6:2 B5:1 A5:1 | A5:6 R:2 | Bb5:1 A5:1 G5:1 F5:1 D5:2 Bb4:2 | C5:1 D5:1 E5:1 G5:1 Bb5:2 G5:2 | A5:2 C6:2 D6:2 A5:2 | G5:2 F5:1 D5:1 E5:2 G5:2',
        },
        A2: { from: 'A', mel2: T(MEL.hA, -12) },
        C: { ch: 'Dm7 | Dm7/C | Bbmaj7 | Bbmaj7 | Gm7 | Am7 | Bbmaj7 | C7sus C7', lead: 'bell', bass: 'pump', mel: 'A5:6 R:2 | G5:2 F5:2 E5:4 | D5:6 R:2 | F5:2 E5:2 C5:4 | D5:4 Bb4:4 | C5:4 E5:4 | F5:4 A5:4 | G5:6 R:2', pad: 'sus' },
      },
      mix: { lead2: { vol: 0.55 } },
    },
    // パドック：ホ短調。歩く馬を見ながら、少し張りつめて
    paddock: {
      bpm: 120, loop: true,
      band: { lead: 'soft', comp: 'arp16', compInst: 'arp', pad: 'sus', padInst: 'strings', bass: 'rock8', drum: 'tension' },
      form: ['A', 'B', 'A2', 'C'],
      parts: {
        A: { ch: 'Em | Em/D | Cmaj7 | B7 | Em | Em/D | Am7 | B7sus B7', mel: MEL.pA },
        B: {
          ch: 'Cmaj7 | D | Bm7 | Em | Am7 | D | Gmaj7 | B7', lead: 'brass',
          mel: 'E5:1 G5:1 B5:2 A5:2 G5:2 | F#5:3 E5:1 D5:4 | D5:1 F#5:1 A5:2 G5:2 F#5:2 | G5:6 R:2 | C6:2 B5:2 A5:2 G5:2 | F#5:2 A5:2 D6:4 | B5:3 A5:1 G5:2 F#5:2 | D#5:2 F#5:2 A5:2 B5:2',
        },
        A2: { from: 'A', lead: 'lead', mel2: T(MEL.pA, -12), lead2: 'strings' },
        C: {
          ch: 'Em | Em | C | C | Am | Am | B7sus | B7', lead: 'strings', pad: null,
          mel: 'E4:8 | F#4:8 | G4:8 | E4:8 | A4:8 | C5:8 | B4:8 | D#5:8',
          mel2: 'R:8 | R:8 | R:8 | R:8 | R:8 | R:8 | B3+E4+F#4:2 R:2 B3+E4+F#4:2 R:2 | B3+D#4+F#4+A4:6 R:2',
        },
      },
      mix: { comp: { vol: 0.6, dly: 0.15 }, bass: { vol: 0.8 } },
    },
    // 年末の大レース（グランドフィナーレ）のパドック：ハ短調。重い太鼓と弦とブラスで特別に
    paddockGF: {
      bpm: 96, loop: true,
      band: { lead: 'strings', lead2: 'strings', comp: 'arp8', compInst: 'bell', pad: 'sus', padInst: 'pad', bass: 'anthem', drum: 'epic' },
      form: ['A', 'B', 'A2', 'C'],
      parts: {
        A: { ch: 'Cm | Ab | Eb | Bb | Cm | Ab | Fm7 | G7sus G7', mel: MEL.fA },
        B: { ch: 'Ab | Bb | Gm7 | Cm | Fm7 | Bb7 | Ebmaj7 | G7sus G7', lead: 'brass', mel: 'C5:2 Eb5:2 Ab5:3 G5:1 | F5:3 D5:1 Bb5:4 | Bb5:2 F5:2 D5:2 G5:2 | Eb5:6 D5:1 Eb5:1 | F5:3 G5:1 Ab5:2 C6:2 | Bb5:3 Ab5:1 F5:2 D5:2 | Eb5:2 G5:2 Bb5:2 D6:2 | C6:4 B5:4' },
        A2: { from: 'A', lead: 'brass', mel2: T(MEL.fA, -12) },
        C: { ch: 'Ab | Bb | Cm | Cm | Ab | Bb | G7sus | G7', lead: 'brass', comp: 'stab', compInst: 'brass', mel: MEL.fC, mel2: T(MEL.fC, -12) },
      },
      mix: { comp: { vol: 0.5, dly: 0.2 } },
    },
    // レースの間（自分で乗るとき）：ホ短調、速いロック。ハイハットとベースが駆け足の拍子
    race: {
      bpm: 166, loop: true,
      band: { lead: 'lead', comp: 'power8', compInst: 'power', bass: 'gallop', drum: 'race' },
      intro: ['I'], form: ['A', 'A2', 'B', 'C', 'C2', 'D'],
      parts: {
        I: { ch: 'Em | Em | C D | B7', lead: 'brass', comp: null, mel: 'E4+G4+B4+E5:2 R:1 E4+G4+B4+E5:1 R:2 E4+G4+B4+E5:2 | R:2 D4+G4+B4+D5:1 R:1 E4+G4+B4+E5:4 | E4+G4+C5+E5:3 E4+G4+C5+E5:1 F#4+A4+D5+F#5:3 F#4+A4+D5+F#5:1 | F#4+A4+B4+D#5:8' },
        A: { ch: 'Em | D | C | D | Em | D | C | B7', mel: MEL.rA },
        A2: { from: 'A', mel2: MEL.rA },
        B: { ch: 'Am7 | Bm7 | Cmaj7 | D | Am7 | Bm7 | Cmaj7 | D', drum: 'half', bass: 'drive', comp: 'stab', compInst: 'brass', mel: T('R:2 A5:1 B5:1 C6:2 B5:1 A5:1 | B5:4 F#5:2 D5:2 | R:2 E5:1 G5:1 B5:2 C6:1 B5:1 | A5:4 D6:4 | R:2 A5:1 B5:1 C6:2 D6:1 E6:1 | F#6:4 D6:2 B5:2 | G6:3 F#6:1 E6:2 D6:2 | F#6:4 A5:2 D6:2', -12) },
        C: { ch: 'C | D | Bm7 | Em | C | D | B7sus | B7', bass: 'rock8', pad: 'sus', padInst: 'strings', mel: MEL.rC, mel2: MEL.rC },
        C2: { from: 'C' },
        D: {
          ch: 'Em | Em | C | C | Am | Am | B7sus | B7', lead: 'guitar', comp: 'stab', compInst: 'brass',
          mel: 'E5:1 D5:1 B4:1 G4:1 A4:1 B4:1 D5:1 E5:1 | G5:2 E5:1 D5:1 E5:4 | E5:1 G5:1 E5:1 C5:1 D5:1 E5:1 G5:1 A5:1 | B5:2 A5:1 G5:1 E5:4 | A5:1 G5:1 E5:1 C5:1 D5:1 E5:1 A5:2 | C6:2 B5:1 A5:1 E5:4 | F#5:1 E5:1 F#5:1 A5:1 B5:2 E6:2 | D#6:4 B5:2 F#5:2',
        },
      },
      mix: { comp: { vol: 0.7 } },
    },
    // 本馬場入場・発走前のファンファーレ：変ロ長調のブラス
    fanfare: {
      bpm: 112,
      band: { lead: 'brass', lead2: 'brass', pad: 'sus', padInst: 'strings', bass: 'whole', drum: null },
      form: ['F'],
      parts: {
        F: {
          ch: 'Bb | Cm7 | F | Gm Eb | F7sus F7 | Bb',
          mel: 'F4:1 Bb4:1 D5:1 F5:3 D5:1 F5:1 | G5:3 F5:1 Eb5:2 C5:2 | D5:1 Eb5:1 F5:1 A5:3 F5:1 A5:1 | Bb5:3 A5:1 G5:2 Bb5:2 | C6:4 A5:4 | Bb5:8',
          mel2: 'D4:1 F4:1 Bb4:1 D5:3 Bb4:1 D5:1 | Eb5:3 D5:1 C5:2 G4:2 | Bb4:1 C5:1 C5:1 F5:3 C5:1 F5:1 | D5:3 D5:1 Eb5:2 G5:2 | F5:4 Eb5:4 | D5+F5:8',
          dr: {
            k: 'X.......X.......X.......X.......X.......X.......X.......X.......X...............X...............',
            s: '................................................................xxxxxxxxXXXXXXXX................',
            c: 'X...............................................................................X...............',
            T: 'X.......X.......X.......X.......X.......X.......X.....X.X.......X.x.X.x.XxXxXXXXX...............',
          },
        },
      },
    },
    // グランドフィナーレのファンファーレ：ハ長調で、より大きく
    fanfareGF: {
      bpm: 100,
      band: { lead: 'brass', lead2: 'brass', pad: 'sus', padInst: 'strings', bass: 'whole', drum: null },
      form: ['F'],
      parts: {
        F: {
          ch: 'C | Am | F | G | Ab Bb | C',
          mel: 'G4:1 C5:1 E5:1 G5:3 E5:1 G5:1 | A5:3 G5:1 E5:2 C5:2 | F5:1 A5:1 C6:1 F6:3 E6:1 C6:1 | D6:6 B5:1 D6:1 | Eb6:3 C6:1 F6:3 D6:1 | E6:8',
          mel2: 'E4:1 G4:1 C5:1 E5:3 C5:1 E5:1 | E5:3 E5:1 C5:2 A4:2 | C5:1 F5:1 A5:1 C6:3 A5:1 A5:1 | B5:6 G5:1 B5:1 | C6:3 Ab5:1 D6:3 Bb5:1 | G5+C6:8',
          dr: {
            k: 'X.......X.......X.......X.......X.......X.......X.......X.......X.......X.......X...............',
            s: '........................................................gggggggg....X.......X...XxXxXXXX........',
            c: 'X...............................................................................X...............',
            T: 'X.......X.......X.......X.......X.......X.......X.......XxXxXxXxX.......X.......XxXxXxXxX.......',
            l: '................................................................................................',
          },
        },
      },
      mix: { lead2: { vol: 0.9 } },
    },
    // 勝ったとき：駆け上がって、大きな和音で締める
    victory: {
      bpm: 144,
      band: { lead: 'lead', lead2: 'brass', pad: 'sus', padInst: 'strings', drum: null },
      form: ['V'],
      parts: {
        V: {
          ch: 'C | F G | Ab Bb | C',
          mel: 'G4:1 C5:1 E5:1 G5:1 C6:2 B5:1 C6:1 | A5:2 C6:2 B5:2 D6:2 | Eb6:2 C6:2 F6:2 D6:2 | E6:8',
          mel2: 'G3:1 C4:1 E4:1 G4:1 C5:2 B4:1 C5:1 | A4+C5+F5:2 R:2 B4+D5+G5:2 R:2 | C5+Eb5+Ab5:2 R:2 D5+F5+Bb5:2 R:2 | C5+E5+G5+C6:8',
          bass: 'C2 C2 C2 C2 C2 C2 C2 C2 | F1 F1 F1 F1 G1 G1 G1 G1 | Ab1 Ab1 Ab1 Ab1 Bb1 Bb1 Bb1 Bb1 | C2:8',
          dr: {
            k: 'X.x.X.x.X.x.X.x.X.x.X.x.X.x.X.x.X...X...X...X...X...............',
            s: '....X.......X.......X.......X...X.XXX.XXXXXXXXXX................',
            h: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.................................',
            c: 'X...............................................X...............',
          },
        },
      },
      mix: { lead: { vol: 0.75 } },
    },
    // 負けたとき：短く、次へ向かう明るさで
    lose: {
      bpm: 120,
      band: { lead: 'soft', comp: 'sus', compInst: 'epiano', bass: 'half', bassInst: 'slap', drum: null },
      form: ['L'],
      parts: {
        L: {
          ch: 'Bbmaj7 | C7 | Fmaj7',
          mel: 'D5:1 F5:1 A5:2 G5:2 F5:2 | E5:2 F5:1 G5:1 Bb5:2 A5:1 G5:1 | A5:8',
          dr: { k: 'X.......X.......X.......X...X...X...............', s: '....g.......X.......g.......X...................', h: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.................' },
        },
      },
    },
    // 結果・表彰・記録：変ロ長調、誇らしく
    glory: {
      bpm: 92, loop: true,
      band: { lead: 'brass', lead2: 'strings', comp: 'ep', pad: 'sus', padInst: 'strings', bass: 'anthem', drum: 'rock' },
      form: ['A', 'B', 'A2'],
      parts: {
        A: { ch: 'Bb | F/A | Gm7 | Ebmaj7 | Cm7 | F | Bb/D Eb | F7sus F7', mel: MEL.gA },
        B: { ch: 'Ebmaj7 | F | Dm7 | Gm7 | Cm7 | F/Eb | Dm7 G7 | Cm7 F7', lead: 'lead', pad: null, mel: 'Eb5:1 F5:1 G5:1 Bb5:1 D6:3 C6:1 | C6:4 A5:2 F5:2 | D5:1 F5:1 A5:2 C6:2 A5:2 | Bb5:6 R:2 | Eb5:1 G5:1 Bb5:2 C6:2 Eb6:2 | C6:3 A5:1 F5:2 Eb5:2 | F5:2 A5:2 B5:2 D6:2 | Eb6:2 C6:2 A5:2 F5:2' },
        A2: { from: 'A', mel2: T(MEL.gA, -12) },
      },
      mix: { lead: { vol: 1.1 }, pad: { vol: 0.6 } },
    },
  };
  const SONGS = {};
  for (const [k, sp] of Object.entries(SPEC)) SONGS[k] = arrange(k, sp);
  AU.SONGS = SONGS;
  AU.T = T;

  // 曲を、鳴らす形（トラックごとの出来事の並び）にする
  function compile(song) {
    const tracks = [];
    for (const tr of song.tracks) {
      if (tr.drum) {
        for (const [ln, str] of Object.entries(tr.drum)) {
          const ev = [];
          for (let i = 0; i < str.length; i++) if (VEL[str[i]]) ev.push({ p: i / 2, v: VEL[str[i]] });
          tracks.push({ drum: ln, mix: Object.assign({}, DMIX[ln] || {}, { vol: (DMIX[ln] && DMIX[ln].vol || 1) * (tr.mix.vol || 1) }), events: ev, length: str.length / 2, bad: !DR[ln] || /[^Xxg.]/.test(str) });
        }
      } else {
        const r = parseSeq(tr.seq);
        tracks.push({ name: tr.name, mix: tr.mix, events: r.events, length: r.length });
      }
    }
    return { bpm: song.bpm, loop: song.loop, loopStart: song.loopStart, length: song.length, tracks };
  }
  AU.compile = compile;
  // 曲の確かめ（テスト用）：書式の誤り・長さ
  AU.check = function () {
    const errs = errors.slice(), info = {};
    for (const [k, s] of Object.entries(SONGS)) {
      const c = compile(s), sec = 60 / s.bpm / 2;
      for (const tr of c.tracks) {
        if (Math.abs(tr.length - s.length) > 1e-6) errs.push(`${k}.${tr.name || tr.drum}: 長さ ${tr.length}（${s.length} のはず）`);
        if (tr.bad) errs.push(`${k}.${tr.drum}: 太鼓が読めない`);
        for (const ev of tr.events) {
          if (ev.bad) errs.push(`${k}.${tr.name}: 音が読めない（${ev.p} 拍目）`);
          if (!tr.drum && !V[ev.inst]) errs.push(`${k}.${tr.name}: 楽器 ${ev.inst} が無い`);
          if (ev.notes && ev.notes.some(n => n < 24 || n > 108)) errs.push(`${k}.${tr.name}: 音域の外（${ev.notes.map(nname)}）`);
        }
      }
      info[k] = { seconds: s.length * sec, loopSeconds: s.loop ? (s.length - s.loopStart) * sec : 0, loop: s.loop, tracks: c.tracks.length, notes: c.tracks.reduce((a, t) => a + t.events.length, 0) };
    }
    return { errors: errs, info };
  };

  // ---------- BGM の順番待ち（先読みで音を置く） ----------
  function channel(mix) {
    const c = E.ctx, inp = gn(mix.vol == null ? 1 : mix.vol);
    let node = inp;
    if (mix.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = mix.pan; inp.connect(p); node = p; }
    node.connect(E.bgmBus);
    if (mix.rev) { const s = gn(mix.rev); node.connect(s); s.connect(E.rev); }
    if (mix.dly) { const s = gn(mix.dly); node.connect(s); s.connect(E.dly); }
    return inp;
  }
  function startSong(name, t0) {
    const song = SONGS[name], c = compile(song), eighth = 60 / song.bpm / 2;
    E.delay.delayTime.setValueAtTime(eighth * 1.5, t0);
    const tracks = c.tracks.map(tr => ({ tr, out: channel(tr.mix), i: 0, base: 0, first: tr.events.findIndex(ev => ev.p >= song.loopStart) }));
    for (const x of tracks) if (x.first < 0) x.first = x.tr.events.length;
    return { name, song, eighth, t0, tracks, endAt: t0 + song.length * eighth };
  }
  function pump(st, until) {
    const s = st.song, span = s.length - s.loopStart;
    for (const x of st.tracks) {
      const ev = x.tr.events;
      for (let guard = 0; guard < 4096; guard++) {
        if (x.i >= ev.length) {
          if (!s.loop || span <= 0 || x.first >= ev.length) break;
          x.base += span; x.i = x.first;
        }
        const e = ev[x.i], at = st.t0 + (x.base + e.p) * st.eighth;
        if (at >= until) break;
        if (x.tr.drum) DR[x.tr.drum](x.out, at, e.v);
        else V[e.inst](x.out, e.notes.map(hz), at, e.len * st.eighth * 0.92, 1);
        x.i++;
      }
    }
  }
  function fadeOut(st) {
    const now = E.ctx.currentTime;
    for (const x of st.tracks) { x.out.gain.cancelScheduledValues(now); x.out.gain.setTargetAtTime(0, now, 0.06); }
    setTimeout(() => { for (const x of st.tracks) try { x.out.disconnect(); } catch (e) { /* 外れている */ } }, 1500);
  }
  // 年末の大レース（GF）には、その場面の特別な曲があればそちらを鳴らす
  const pick = (name, race) => (race && race.grade === 'GF' && SONGS[name + 'GF']) ? name + 'GF' : name;
  AU.bgm = function (name0, race) {
    const name = pick(name0, race);
    if (!E) { wantSong = [name0, race]; return; }
    if (cur && cur.name === name) return;
    AU.stopBgm();
    if (!SONGS[name]) return;
    cur = startSong(name, E.ctx.currentTime + 0.08);
    const me = cur;
    const tick = () => {
      if (cur !== me) return;
      const ahead = globalThis.document && document.hidden ? 1.5 : 0.3;
      pump(me, E.ctx.currentTime + ahead);
      if (!me.song.loop && E.ctx.currentTime > me.endAt + 0.5) { const done = me.onEnd; AU.stopBgm(); if (done) done(); }
    };
    tick();
    timer = setInterval(tick, 50);
  };
  AU.stopBgm = function () { if (timer) clearInterval(timer); timer = null; if (cur && E) fadeOut(cur); cur = null; };
  AU.current = () => cur && cur.name;
  // 終わりのある曲を鳴らし、終わったら resolve
  AU.playOnce = function (name, race) {
    return new Promise(res => {
      if (!E || AU.settings.bgm <= 0) return res();
      AU.stopBgm(); AU.bgm(name, race);
      if (cur) cur.onEnd = res; else res();
    });
  };
  // 画面ごとの曲
  AU.songFor = st => st.screen === 'title' || st.screen === 'newgame' ? 'title'
    : st.screen === 'game' && st.view && (st.view.name === 'jrecord' || st.view.name === 'records') ? 'glory' : 'home';
  // 曲を音の波形に書き出す（確かめ用。OfflineAudioContext がある所だけ）
  AU.render = function (name, sec) {
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    const s = SONGS[name];
    if (!OAC || !s) return Promise.reject(new Error('書き出せない'));
    const eighth = 60 / s.bpm / 2;
    sec = sec || s.length * eighth + 3;
    const oc = new OAC(2, Math.ceil(44100 * sec), 44100);
    // 実際に鳴らすときと同じく、少し先までずつ音を置く（一度に全部置くと、重さを測り違える）
    const keep = E, eng = makeEngine(oc, BGM_GAIN);
    const run = fn => { const k = E; E = eng; try { fn(); } finally { E = k; } };
    let st;
    run(() => { st = startSong(name, 0.05); pump(st, 0.6); });
    for (let t = 0.25; t < sec - 0.3; t += 0.25) { const at = t; oc.suspend(at).then(() => { run(() => pump(st, at + 0.6)); oc.resume(); }); }
    E = keep;
    return oc.startRendering();
  };

  // ---------- 効果音 ----------
  function noise(bus, t, dur, type, fq, vol, q) {
    const s = E.ctx.createBufferSource(); s.buffer = E.noise;
    const f = filt(type, fq, q), g = gn(0);
    s.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  AU.se = function (name) {
    if (!E || AU.settings.se <= 0) return;
    const c = E.ctx, t = c.currentTime + 0.01, bus = E.seBus;
    const blip = (f1, f2, dur, type, vol) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
    };
    if (name === 'click') blip(900, 1300, 0.045, 'square', 0.05);
    else if (name === 'tab') blip(600, 800, 0.05, 'triangle', 0.15);
    else if (name === 'ok') { blip(880, null, 0.06, 'square', 0.06); setTimeout(() => AU.se('_ok2'), 70); }
    else if (name === '_ok2') blip(1320, null, 0.09, 'square', 0.06);
    else if (name === 'coin') { V.lead(bus, [freq('B5')], t, 0.07, 1.2); V.lead(bus, [freq('E6')], t + 0.08, 0.3, 1.2); }
    else if (name === 'error') blip(180, 120, 0.25, 'sawtooth', 0.08);
    else if (name === 'week') { blip(500, 760, 0.12, 'triangle', 0.18); }
    else if (name === 'birth') { ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => V.bell(bus, [freq(n)], t + i * 0.08, 0.25, 1.5)); }
    else if (name === 'whip') { noise(bus, t, 0.05, 'highpass', 3000, 0.5); noise(bus, t + 0.01, 0.08, 'bandpass', 1800, 0.35, 2); }
    else if (name === 'skill') { ['E6', 'B6', 'E7'].forEach((n, i) => V.bell(bus, [freq(n)], t + i * 0.05, 0.18, 1.7)); }
    else if (name === 'fight') { blip(220, 660, 0.22, 'sawtooth', 0.07); blip(330, 990, 0.22, 'square', 0.04); noise(bus, t, 0.18, 'bandpass', 1200, 0.25, 1.2); } // 競り合いで気合が乗った：駆け上がる音と、どよめき
    // 騎乗の手ごたえ（js/ui/ride.js）：数え・進路・ぶつかり・ゴール板・着順の表示
    else if (name === 'count') blip(880, null, 0.07, 'square', 0.05);
    else if (name === 'lane') noise(bus, t, 0.09, 'bandpass', 700, 0.18, 1.4);
    else if (name === 'bump') { noise(bus, t, 0.12, 'lowpass', 220, 0.6, 1); blip(110, 60, 0.12, 'sine', 0.12); }
    else if (name === 'goal') { V.bell(bus, [freq('A6')], t, 0.08, 1.6); noise(bus, t, 0.5, 'bandpass', 1100, 0.3, 0.8); }
    else if (name === 'rank1') { ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => V.lead(bus, [freq(n)], t + i * 0.07, i === 3 ? 0.45 : 0.08, 1.1)); V.bell(bus, [freq('C7')], t + 0.28, 0.4, 1.4); }
    else if (name === 'rank') { V.bell(bus, [freq('E6')], t, 0.1, 1.1); V.bell(bus, [freq('B5')], t + 0.09, 0.2, 0.9); }
    else if (name === 'gate') { V.bell(bus, [1568], t, 0.05, 3); V.bell(bus, [2093], t, 0.05, 2); noise(bus, t, 0.25, 'bandpass', 900, 0.35, 1.5); }
  };

  // ---------- レースの音（蹄・歓声） ----------
  let race = null;
  AU.raceStart = function () {
    if (!E) return;
    AU.raceEnd();
    const c = E.ctx;
    const crowdSrc = c.createBufferSource(); crowdSrc.buffer = E.noise; crowdSrc.loop = true;
    const bp = filt('bandpass', 900, 0.6);
    const cg = gn(0.02);
    crowdSrc.connect(bp); bp.connect(cg); cg.connect(E.seBus); crowdSrc.start();
    race = { crowdSrc, cg, next: c.currentTime + 0.1, rate: 0, step: 0, timer: null, crowd: 0.02 };
    race.timer = setInterval(() => {
      if (!race || race.rate <= 0) return;
      const until = c.currentTime + 0.2;
      // 蹄：4拍の駆け足（タ・タ・タ・タン）
      const cycle = 0.42 / race.rate;
      const offs = [0, 0.13, 0.26, 0.42];
      while (race.next < until) {
        const k = race.step % 4;
        const tt = race.next + offs[k] * cycle;
        noise(E.seBus, tt, 0.06, 'lowpass', 260 + (k === 3 ? 0 : 60), k === 3 ? 0.5 : 0.32, 1);
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
    race.cg.gain.setTargetAtTime(lvl, E.ctx.currentTime, finished ? 0.1 : 0.4);
    if (finished && !race.cheered) { race.cheered = true; setTimeout(() => { if (race) race.cg.gain.setTargetAtTime(0.05, E.ctx.currentTime, 1.2); }, 1800); }
  };
  AU.raceEnd = function () {
    if (!race) return;
    clearInterval(race.timer);
    try { race.cg.gain.setTargetAtTime(0.0001, E.ctx.currentTime, 0.2); const s = race.crowdSrc; setTimeout(() => { try { s.stop(); } catch (e) { /* 止まっている */ } }, 600); } catch (e) { /* 何もしない */ }
    race = null;
  };
})();
