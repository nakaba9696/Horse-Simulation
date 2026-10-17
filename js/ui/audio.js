// 音：BGM と効果音を Web Audio で鳴らす（音のファイルは使わない。曲はこのゲームのための書き下ろし）
// 曲の調子は、2000年ごろのクラブ・ミュージック（ハウス・テクノ・ブレイクビーツ）に、ソウル・R&B・ラテン・渋谷系のおしゃれな和音を乗せたもの。
// 音色は FM 風のエレピ・ブラス、和音のスタブ、スーパーソウ、ビブラフォン、フルート、ナイロンギター、オルガン、合唱、各種のベース、
// 雑音とピッチの下がる正弦で作る太鼓・クラップ・シェイカー・コンガ。曲ごとに響き・左右の山びこ・キックに合わせたうねり・フィルターをかける。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const AU = HS.Audio = {};
  const KEY = 'horse-sim-audio-v1';
  AU.settings = { bgm: 0.5, se: 0.7 };
  try { Object.assign(AU.settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* 既定のまま */ }
  AU.saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(AU.settings)); } catch (e) { /* 保存できなくても鳴らせる */ } };

  let E = null; // 鳴らす仕組み（ctx・バス・雑音・響きの素）。書き出し（AU.render）のときだけ一時的に差し替える
  let wantSong = null, cur = null, timer = null;
  const BGM_GAIN = 0.8;

  // 雑音の素は種で固定する（書き出した曲が毎回同じになるように。ゲームの乱数とは無関係）
  const prng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // 雑音で作った響き（後ろほど暗く、左右で少し違う）
  function impulse(c, sec, decay, rnd) {
    const n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n, a = 0.85 - 0.72 * k;
        y += a * ((rnd() * 2 - 1) - y);
        d[i] = y * Math.pow(1 - k, decay) * (i < c.sampleRate * 0.006 ? i / (c.sampleRate * 0.006) : 1);
      }
    }
    return buf;
  }
  function makeEngine(c, bgmVol) {
    const e = { ctx: c };
    const g = v => { const n = c.createGain(); n.gain.value = v; return n; };
    e.master = g(0.9);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 2.6; comp.attack.value = 0.008; comp.release.value = 0.22;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
    e.master.connect(comp); comp.connect(lim); lim.connect(c.destination);
    e.bgmBus = g(bgmVol); e.bgmBus.connect(e.master);
    e.seBus = g(AU.settings.se); e.seBus.connect(e.master);
    // 倍音を絞った波形（フィルターを音ごとに置くと重いので、波形の側で丸めておく）
    const wave = (n, amp) => { const re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = amp(k); return c.createPeriodicWave(re, im); };
    const ORG = { 1: 1, 2: 0.75, 3: 0.55, 4: 0.45, 6: 0.25, 8: 0.3 };
    e.wave = {
      warm: wave(16, k => 1 / Math.pow(k, 1.5)), soft: wave(10, k => 1 / Math.pow(k, 2)), bright: wave(28, k => 1 / Math.pow(k, 1.05)),
      reed: wave(14, k => k % 2 ? 1 / Math.pow(k, 1.2) : 0), organ: wave(9, k => ORG[k] || 0),
    };
    const rnd = prng(20261016);
    e.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = e.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    e.ir = impulse(c, 2.4, 3.4, rnd);
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

  // ---------- 音の部品（ここから「効果音」の前までが曲の音。tools/render_bgm.js はこの範囲で書き出しの古さを見分ける） ----------
  function osc(type, f, t, end) { const o = E.ctx.createOscillator(); if (E.wave[type]) o.setPeriodicWave(E.wave[type]); else o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end); return o; }
  function gn(v) { const g = E.ctx.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { const b = E.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
  function panner(v) { if (!E.ctx.createStereoPanner) return gn(1); const p = E.ctx.createStereoPanner(); p.pan.value = v; return p; }
  function noiseSrc(t, end, off) { const s = E.ctx.createBufferSource(); s.buffer = E.noise; s.loop = true; s.start(t, off % 1.9); s.stop(end); return s; }
  // 音量の形：a 秒で peak、d 秒ほどで sus まで下がり、離したら r 秒ほどで消える
  function amp(g, t, dur, a, peak, d, sus, r) {
    const p = g.gain;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * sus, t + a, Math.max(0.005, d / 3));
    p.setTargetAtTime(0, t + Math.max(dur, a), Math.max(0.005, r / 4));
  }
  // 叩いて減っていく音量（鍵盤・撥弦）
  function pluckAmp(g, t, dur, peak, tc, rel) {
    const p = g.gain;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + 0.003);
    p.setTargetAtTime(0, t + 0.003, tc); p.setTargetAtTime(0, t + dur, rel);
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
  // スーパーソウ（5本ののこぎりを少しずつずらす。2000年ごろのクラブの音）
  V.saw = each((out, f, t, dur, v) => {
    const end = t + dur + 0.3, fl = filt('lowpass', Math.min(f * 9, 7500), 0.7), g = gn(0);
    for (const dt of [-17, -8, 0, 8, 17]) { const o = osc('sawtooth', f, t, end); o.detune.value = dt; o.connect(fl); }
    fl.connect(g); g.connect(out);
    amp(g, t, dur, 0.005, 0.068 * v, 0.25, 0.7, 0.14);
  });
  // FM 風のブラス：変調の深さが立ち上がりで開いて、少し戻る。下からしゃくり上げる。のこぎりの層で厚く
  V.brass = each((out, f, t, dur, v) => {
    const end = t + dur + 0.3;
    const car = osc('sine', f, t, end), mod = osc('sine', f, t, end), mg = gn(0);
    car.frequency.setValueAtTime(f * 0.97, t); car.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(f * (2.6 + 1.4 * Math.min(v, 1.2)), t + 0.05); mg.gain.setTargetAtTime(f * 1.8, t + 0.05, 0.15); mg.gain.setTargetAtTime(f * 0.4, t + dur, 0.06);
    mod.connect(mg); mg.connect(car.frequency);
    const s1 = osc('warm', f, t, end); s1.detune.value = 8;
    const sg = gn(0); s1.connect(sg);
    sg.gain.setValueAtTime(0.15, t); sg.gain.linearRampToValueAtTime(0.5, t + 0.06); sg.gain.setTargetAtTime(0.38, t + 0.06, 0.2);
    const cg = gn(0.6); car.connect(cg);
    if (dur > 0.45) vib([car, s1], f, t, 5.2, 0.004, 0.3, end);
    const g = gn(0); cg.connect(g); sg.connect(g); g.connect(out);
    amp(g, t, dur, 0.03, 0.12 * v, 0.25, 0.75, 0.12);
  });
  // FM 風のエレピ：胴の鳴り（1:1。強く弾くほど金属っぽく）と、叩いた瞬間の金属の音（1:14）。少しずらした胴で揺らぐ
  V.epiano = each((out, f, t, dur, v) => {
    const end = t + dur + 0.6;
    const c1 = osc('sine', f, t, end), m1 = osc('sine', f, t, end), g1 = gn(0);
    g1.gain.setValueAtTime(f * (0.7 + 1.3 * Math.min(v, 1.2)), t); g1.gain.setTargetAtTime(f * 0.18, t, 0.3);
    m1.connect(g1); g1.connect(c1.frequency);
    const c3 = osc('sine', f * 1.0035, t, end), g3 = gn(0.35); c3.connect(g3);
    const c2 = osc('sine', f, t, t + 0.4), m2 = osc('sine', f * 14, t, t + 0.4), g2 = gn(0);
    g2.gain.setValueAtTime(f * 1.4, t); g2.gain.setTargetAtTime(0, t, 0.025);
    m2.connect(g2); g2.connect(c2.frequency);
    const tg = gn(0); tg.gain.setValueAtTime(0.3, t); tg.gain.setTargetAtTime(0, t, 0.06); c2.connect(tg);
    const g = gn(0); c1.connect(g); g3.connect(g); tg.connect(g); g.connect(out);
    pluckAmp(g, t, dur, 0.11 * v, f < 300 ? 1.1 : 0.75, 0.09);
  });
  // ハウスのピアノ：明るい波形に、叩いた瞬間だけ開くフィルター
  V.piano = each((out, f, t, dur, v) => {
    const end = t + dur + 0.9;
    const a = osc('bright', f, t, end), b = osc('sine', f * 2, t, end); a.detune.value = 3;
    const fl = filt('lowpass', f * 3, 0.8); fl.frequency.setValueAtTime(Math.min(f * 16, 10000), t); fl.frequency.setTargetAtTime(Math.min(f * 3, 4000), t, 0.18);
    const bg = gn(0.25); b.connect(bg); a.connect(fl); bg.connect(fl);
    const g = gn(0); fl.connect(g); g.connect(out);
    pluckAmp(g, t, dur, 0.13 * v, f < 400 ? 1.0 : 0.6, 0.12);
  });
  // 和音のスタブ（ディープ・ハウスの短い和音。のこぎり2本を、叩いた瞬間だけ開くフィルターで）
  V.stab = each((out, f, t, dur, v) => {
    const end = t + Math.max(dur, 0.1) + 0.3;
    const a = osc('sawtooth', f, t, end), b = osc('sawtooth', f, t, end); a.detune.value = -9; b.detune.value = 9;
    const fl = filt('lowpass', f * 4, 2.2);
    fl.frequency.setValueAtTime(Math.min(f * 9, 6500), t); fl.frequency.setTargetAtTime(Math.min(f * 2, 1600), t, 0.07);
    a.connect(fl); b.connect(fl);
    const g = gn(0); fl.connect(g); g.connect(out);
    amp(g, t, dur, 0.003, 0.14 * v, 0.18, 0.35, 0.1);
  });
  // ビブラフォン：胴と4倍の鳴り、ゆっくりの揺れ（モーター）
  V.vibes = each((out, f, t, dur, v) => {
    const end = t + dur + 1.4;
    const a = osc('sine', f, t, end), b = osc('sine', f * 4, t, t + 0.6), bg = gn(0);
    bg.gain.setValueAtTime(0.3, t); bg.gain.setTargetAtTime(0, t, 0.12); b.connect(bg);
    const g = gn(0); a.connect(g); bg.connect(g);
    const tr = gn(1), l = osc('sine', 5.2, t, end), lg = gn(0.22); l.connect(lg); lg.connect(tr.gain);
    g.connect(tr); tr.connect(out);
    pluckAmp(g, t, dur, 0.12 * v, 1.0, 0.3);
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
  // フルート：正弦に息の雑音。遅れてビブラート
  V.flute = each((out, f, t, dur, v) => {
    const end = t + dur + 0.3;
    const a = osc('sine', f, t, end), b = osc('soft', f, t, end); b.detune.value = 3;
    a.frequency.setValueAtTime(f * 0.985, t); a.frequency.setTargetAtTime(f, t, 0.03);
    const bg = gn(0.22); b.connect(bg);
    const g = gn(0); a.connect(g); bg.connect(g); g.connect(out);
    const n = noiseSrc(t, end, f * 0.0137), nf = filt('bandpass', Math.min(f * 2, 6000), 2.5), ng = gn(0);
    n.connect(nf); nf.connect(ng); ng.connect(out);
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.09 * v, t + 0.03); ng.gain.setTargetAtTime(0.022 * v, t + 0.03, 0.08); ng.gain.setTargetAtTime(0, t + dur, 0.05);
    if (dur > 0.3) vib([a, b], f, t, 5, 0.006, 0.25, end);
    amp(g, t, dur, 0.045, 0.11 * v, 0.3, 0.85, 0.1);
  });
  // ナイロンギター（爪弾き）
  V.gtr = each((out, f, t, dur, v) => {
    const end = t + dur + 0.8;
    const a = osc('warm', f, t, end), b = osc('triangle', f * 2, t, end), bg = gn(0.15);
    const fl = filt('lowpass', f * 3, 1); fl.frequency.setValueAtTime(Math.min(f * 12, 8000), t); fl.frequency.setTargetAtTime(f * 2.5, t, 0.12);
    b.connect(bg); a.connect(fl); bg.connect(fl);
    const g = gn(0); fl.connect(g); g.connect(out);
    pluckAmp(g, t, dur, 0.16 * v, 0.45, 0.08);
  });
  // ミュートしたギターの刻み（ファンクのカッティング。和音をまとめて短く）
  V.cut = (out, fs, t, dur, v) => {
    const end = t + 0.2, pre = gn(1.2 / Math.sqrt(fs.length));
    fs.forEach((f, i) => { const o = osc('sawtooth', f, t, end); o.detune.value = i % 2 ? 5 : -5; o.connect(pre); });
    const bp = filt('bandpass', 1500, 1.1); pre.connect(bp);
    const g = gn(0); bp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.8 * v, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, 0.03 + 0.06 * Math.min(dur, 0.4));
  };
  // オルガン（引き出しの音栓を重ねた波形と、弾いた瞬間の3倍の鳴り）
  V.organ = each((out, f, t, dur, v) => {
    const end = t + dur + 0.2;
    const a = osc('organ', f, t, end), p = osc('sine', f * 3, t, t + 0.5), pg = gn(0);
    pg.gain.setValueAtTime(0.35, t); pg.gain.setTargetAtTime(0, t, 0.08); p.connect(pg);
    const g = gn(0); a.connect(g); pg.connect(g); g.connect(out);
    amp(g, t, dur, 0.006, 0.05 * v, 0.1, 1, 0.06);
  });
  // パッド・ストリングス・合唱
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
  V.choir = each((out, f, t, dur, v) => {
    const end = t + dur + 1.0;
    const os = [-9, 9].map(dt => { const o = osc('sawtooth', f, t, end); o.detune.value = dt; return o; });
    const pre = gn(0.5); for (const o of os) o.connect(pre);
    const g = gn(0);
    for (const [fq, q, a] of [[700, 5, 1], [1150, 6, 0.6], [2700, 8, 0.25]]) { const b = filt('bandpass', fq, q), bg = gn(a); pre.connect(b); b.connect(bg); bg.connect(g); }
    g.connect(out);
    vib(os, f, t, 5, 0.005, 0.35, end);
    amp(g, t, dur, 0.25, 0.36 * v, 0.4, 0.9, 0.6);
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
  // プラック
  V.pluck = each((out, f, t, dur, v) => {
    const end = t + dur + 0.4;
    const a = osc('sawtooth', f, t, end), b = osc('square', f * 0.5, t, end), bg = gn(0.3);
    const fl = filt('lowpass', f * 2, 4); fl.frequency.setValueAtTime(Math.min(f * 14, 9000), t); fl.frequency.setTargetAtTime(f * 1.5, t, 0.06);
    a.connect(fl); b.connect(bg); bg.connect(fl);
    const g = gn(0); fl.connect(g); g.connect(out);
    pluckAmp(g, t, dur, 0.06 * v, 0.22, 0.06);
  });
  // ベース：スラップ・指弾き・ウッドベース風・低い正弦（サブ）・アシッド（共鳴の強いフィルターがうねる）
  V.slap = each((out, f, t, dur, v) => {
    const end = t + dur + 0.2;
    const a = osc('sawtooth', f, t, end), s = osc('sine', f, t, end);
    const fl = filt('lowpass', f, 4.5);
    fl.frequency.setValueAtTime(Math.min(f * 28, 5200), t); fl.frequency.setTargetAtTime(f * 2.5, t, 0.045);
    a.connect(fl);
    const sg = gn(0.7); s.connect(sg);
    const g = gn(0); fl.connect(g); sg.connect(g); g.connect(out);
    amp(g, t, dur, 0.002, 0.15 * v, 0.25, 0.5, 0.05);
  });
  V.bass = each((out, f, t, dur, v) => {
    const end = t + dur + 0.2;
    const a = osc('sawtooth', f, t, end), s = osc('sine', f, t, end);
    const fl = filt('lowpass', f * 3, 1.2);
    fl.frequency.setValueAtTime(Math.min(f * (5 + 5 * Math.min(v, 1.2)), 3000), t); fl.frequency.setTargetAtTime(f * 3, t, 0.08);
    a.connect(fl);
    const sg = gn(0.6); s.connect(sg);
    const g = gn(0); fl.connect(g); sg.connect(g); g.connect(out);
    amp(g, t, dur, 0.004, 0.16 * v, 0.2, 0.8, 0.06);
  });
  V.ubass = each((out, f, t, dur, v) => {
    const end = t + dur + 0.4;
    const a = osc('triangle', f, t, end), s = osc('sine', f, t, end), fl = filt('lowpass', f * 4, 1);
    fl.frequency.setValueAtTime(Math.min(f * 10, 2500), t); fl.frequency.setTargetAtTime(f * 3, t, 0.05);
    a.connect(fl);
    const g = gn(0); fl.connect(g); s.connect(g); g.connect(out);
    const p = g.gain; p.setValueAtTime(0, t); p.linearRampToValueAtTime(0.11 * v, t + 0.008);
    p.setTargetAtTime(0.05 * v, t + 0.008, 0.12); p.setTargetAtTime(0, t + dur, 0.07);
  });
  V.sub = each((out, f, t, dur, v) => {
    const end = t + dur + 0.2;
    const s = osc('sine', f, t, end), w = osc('warm', f, t, end), fl = filt('lowpass', f * 4, 0.8);
    s.frequency.setValueAtTime(f * 1.5, t); s.frequency.exponentialRampToValueAtTime(f, t + 0.012);
    w.connect(fl); const wg = gn(0.3); fl.connect(wg);
    const g = gn(0); s.connect(g); wg.connect(g); g.connect(out);
    amp(g, t, dur, 0.004, 0.16 * v, 0.3, 0.85, 0.05);
  });
  V.acid = each((out, f, t, dur, v) => {
    const end = t + dur + 0.15;
    const a = osc('sawtooth', f, t, end), fl = filt('lowpass', f * 2, 11);
    fl.frequency.setValueAtTime(Math.min(f * (5 + 16 * Math.min(v, 1.2)), 5500), t); fl.frequency.setTargetAtTime(f * 1.6, t, 0.05 + 0.08 * Math.min(v, 1.2));
    a.connect(fl);
    const s = osc('sine', f, t, end), sg = gn(0.5); s.connect(sg);
    const g = gn(0); fl.connect(g); sg.connect(g); g.connect(out);
    amp(g, t, dur, 0.003, 0.11 * Math.min(v, 1.2) + 0.03, 0.12, 0.7, 0.03);
  });

  // ---------- 太鼓（雑音とピッチの下がる正弦） ----------
  // r は雑音を読み始める位置（0〜1）。出来事の位置から決めるので、くり返しても同じ音になる
  function hit(out, t, dur, type, f, vol, tc, q, r) {
    const s = noiseSrc(t, t + dur, (r || 0) * 1.6);
    const fl = filt(type, f, q), g = gn(0);
    s.connect(fl); fl.connect(g); g.connect(out);
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t, tc);
  }
  function drop(out, t, f0, f1, fall, vol, tc, type) {
    const o = osc(type || 'sine', f0, t, t + tc * 6 + 0.05), g = gn(0);
    o.frequency.exponentialRampToValueAtTime(f1, t + fall);
    o.connect(g); g.connect(out);
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + 0.005, tc);
  }
  const DR = {
    k: (o, t, v, r) => { drop(o, t, 160, 46, 0.09, 0.9 * v, 0.1); hit(o, t, 0.03, 'highpass', 2500, 0.25 * v, 0.006, 0, r); },
    // ハウスのキック（長く鳴る胴）
    K: (o, t, v, r) => { drop(o, t, 150, 44, 0.11, 1.0 * v, 0.16); hit(o, t, 0.02, 'highpass', 3200, 0.16 * v, 0.005, 0, r); },
    s: (o, t, v, r) => { hit(o, t, 0.3, 'highpass', 1100, 0.45 * v, 0.055, 0, r); hit(o, t, 0.15, 'bandpass', 2800, 0.25 * v, 0.03, 0.8, r + 0.3); drop(o, t, 220, 170, 0.05, 0.35 * v, 0.035, 'triangle'); },
    // クラップ（3つの短い雑音と尾）
    p: (o, t, v, r) => { [[0, 0.5], [0.009, 0.42], [0.019, 0.55]].forEach(([d, a], i) => hit(o, t + d, 0.02, 'bandpass', 1250, a * v, 0.005, 1.4, r + i * 0.2)); hit(o, t + 0.028, 0.35, 'bandpass', 1150, 0.5 * v, 0.07, 1.1, r + 0.7); },
    // リム（縁を叩く短い音）
    R: (o, t, v, r) => { hit(o, t, 0.04, 'bandpass', 1800, 0.7 * v, 0.01, 5, r); drop(o, t, 840, 800, 0.02, 0.22 * v, 0.012, 'triangle'); },
    h: (o, t, v, r) => hit(o, t, 0.07, 'highpass', 7500, 0.14 * v, 0.012, 0, r),
    o: (o, t, v, r) => hit(o, t, 0.4, 'highpass', 7000, 0.12 * v, 0.09, 0, r),
    S: (o, t, v, r) => hit(o, t, 0.06, 'highpass', 6000, 0.17 * v, 0.016, 0, r),
    c: (o, t, v, r) => { hit(o, t, 2.4, 'highpass', 3800, 0.22 * v, 0.5, 0, r); hit(o, t, 1.2, 'bandpass', 5500, 0.12 * v, 0.25, 0.6, r + 0.4); },
    r: (o, t, v, r) => hit(o, t, 0.7, 'bandpass', 7200, 0.12 * v, 0.14, 1.2, r),
    t: (o, t, v, r) => { drop(o, t, 220, 140, 0.3, 0.55 * v, 0.11); hit(o, t, 0.05, 'lowpass', 1800, 0.12 * v, 0.015, 0, r); },
    m: (o, t, v, r) => { drop(o, t, 160, 100, 0.3, 0.55 * v, 0.12); hit(o, t, 0.05, 'lowpass', 1500, 0.12 * v, 0.015, 0, r); },
    l: (o, t, v, r) => { drop(o, t, 112, 70, 0.32, 0.6 * v, 0.14); hit(o, t, 0.05, 'lowpass', 1200, 0.12 * v, 0.015, 0, r); },
    T: (o, t, v, r) => { drop(o, t, 96, 88, 0.5, 0.6 * v, 0.3); drop(o, t, 146, 140, 0.4, 0.2 * v, 0.2); hit(o, t, 0.1, 'lowpass', 320, 0.3 * v, 0.04, 0, r); },
    // コンガ（高・低）とクラベス
    q: (o, t, v, r) => { drop(o, t, 400, 340, 0.03, 0.42 * v, 0.07); hit(o, t, 0.02, 'bandpass', 2200, 0.15 * v, 0.006, 2, r); },
    Q: (o, t, v, r) => { drop(o, t, 270, 225, 0.04, 0.48 * v, 0.1); hit(o, t, 0.02, 'bandpass', 1800, 0.12 * v, 0.006, 2, r); },
    w: (o, t, v) => drop(o, t, 2500, 2450, 0.01, 0.28 * v, 0.016),
    // 吹き上がる雑音（区切りの前の1小節）
    z: (o, t, v, r, e8) => {
      const L = 8 * e8, s = noiseSrc(t, t + L + 0.02, (r || 0) * 1.6), fl = filt('bandpass', 500, 1.3), g = gn(0);
      fl.frequency.setValueAtTime(450, t); fl.frequency.exponentialRampToValueAtTime(9000, t + L);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * v, t + L * 0.96); g.gain.linearRampToValueAtTime(0, t + L);
      s.connect(fl); fl.connect(g); g.connect(o);
    },
  };
  const VEL = { X: 1, x: 0.7, g: 0.28 };
  // 太鼓の置き場所（左右・響き）。nofilt はフィルターの掃き（sweep）を受けない
  const DMIX = {
    k: { vol: 0.55, rev: 0.04 }, K: { vol: 0.37, rev: 0.03, nofilt: true }, s: { rev: 0.28 }, p: { vol: 3.9, pan: 0.04, rev: 0.3 }, R: { vol: 3.3, pan: -0.18, rev: 0.18 },
    h: { pan: 0.35, vol: 5.6, rev: 0.04 }, o: { pan: 0.35, vol: 2, rev: 0.06 }, S: { pan: -0.45, vol: 2.8, rev: 0.06 }, c: { pan: -0.3, rev: 0.25 }, r: { pan: -0.2, vol: 1.5, rev: 0.1 },
    t: { pan: -0.25, rev: 0.2 }, m: { pan: 0, rev: 0.2 }, l: { pan: 0.25, rev: 0.2 }, T: { vol: 0.55, rev: 0.35 },
    q: { pan: 0.45, vol: 0.8, rev: 0.14 }, Q: { pan: 0.3, vol: 0.8, rev: 0.14 }, w: { pan: -0.45, rev: 0.2 }, z: { rev: 0.25 },
  };
  const DUCKERS = { k: 1, K: 1 }; // このキックに合わせて、うねらせるトラック（sp.duck）の音量を一瞬下げる

  // ---------- 曲の書式 ----------
  // 旋律：「音:長さ」を空白で並べる。長さは8分音符を1とする（0.5 で16分）。和音は「+」、休符は R、「*回数」でくり返し、
  //       「@楽器」で以後の楽器を替える。「音:進む長さ_鳴らす長さ^強さ」と、鳴らす長さ・強さ（既定 1）も書ける。
  //       小節の区切り「|」は読み飛ばす（長さの確かめに使う）
  // 太鼓：{ k: 'X...x...', s: ..., h: ... } のように太鼓ごとの列。1文字が16分音符。X 強く・x 普通・g 弱く・. 休み
  // 曲（SONGS）は { bpm, loop, loopStart（くり返しの始まり。8分音符で数える）, length, swing, tracks: [{ name, mix, seq } | { name, drum } | { sweep }] }
  const num = x => String(Math.round(x * 1000) / 1000);
  function parseSeq(seq, inst0) {
    const out = []; let p = 0, inst = inst0 || 'lead';
    for (const tok0 of seq.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
      if (tok0[0] === '@') { inst = tok0.slice(1); continue; }
      const [tok, rep] = tok0.split('*');
      const ci = tok.indexOf(':'), n = ci < 0 ? tok : tok.slice(0, ci);
      const m = /^(\d*\.?\d+)(?:_(\d*\.?\d+))?(?:\^(\d*\.?\d+))?$/.exec(ci < 0 ? '1' : tok.slice(ci + 1));
      const adv = m ? +m[1] : 0, len = m && m[2] ? +m[2] : adv, v = m && m[3] ? +m[3] : 1;
      const notes = n === 'R' ? [] : n.split('+').map(midi);
      const bad = !m || notes.some(x => x == null) || !(adv > 0) || !(len > 0);
      for (let i = 0; i < (rep ? +rep : 1); i++) {
        if (notes.length || bad) out.push({ p, len, v, notes, inst, bad });
        p += adv;
      }
    }
    return { events: out, length: p };
  }

  // ---------- 伴奏を作る道具（コードの並びと型から） ----------
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], sus: [0, 5, 7], sus4: [0, 5, 7], sus2: [0, 2, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], aug: [0, 4, 8], dim: [0, 3, 6],
    6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 69: [0, 4, 7, 9, 14], m69: [0, 3, 7, 9, 14],
    7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], mmaj7: [0, 3, 7, 11], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '7sus': [0, 5, 7, 10],
    9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], '9sus': [0, 5, 7, 10, 14], m11: [0, 3, 7, 10, 14, 17],
    13: [0, 4, 10, 14, 21], '13sus': [0, 5, 10, 14, 21], '7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15], 'maj7#11': [0, 4, 7, 11, 18],
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
  const lowest = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;
  const above = (pc, n) => n + ((((pc - n) % 12) + 12) % 12 || 12);
  // 下から密に積んだ和音（アルペジオ用）
  const voicing = (c, lo) => c.iv.map(i => lowest((c.root + i) % 12, lo)).sort((a, b) => a - b);
  // 和音の積み方：テンションの入った和音（5音以上）は、根音をベースに任せて抜く楽器がある。音が多ければ5度から抜く。
  // 転回形は、前の和音の高さに近いもの（声部のつながりがなめらか）を選ぶ
  const ROOTLESS = { epiano: 1, stab: 1, vibes: 1, gtr: 1, piano: 1, cut: 1, organ: 1 };
  const MAXN = { pad: 5, strings: 5, choir: 4 };
  function voiceChord(c, lo, prev, inst) {
    let iv = [...new Set(c.iv.map(i => i % 12))];
    if (iv.length >= 5 && ROOTLESS[inst]) iv = iv.filter(i => i !== 0);
    const max = MAXN[inst] || 4;
    while (iv.length > max) iv.splice(iv.includes(7) ? iv.indexOf(7) : iv.length - 1, 1);
    const pcs = iv.map(i => (c.root + i) % 12);
    const target = prev ? 0.65 * prev.reduce((a, b) => a + b, 0) / prev.length + 0.35 * (lo + 7) : lo + 7;
    let best = null, bc = 1e9;
    pcs.forEach((_, r) => {
      const order = pcs.slice(r).concat(pcs.slice(0, r)), out = [lowest(order[0], lo)];
      for (const pc of order.slice(1)) out.push(above(pc, out[out.length - 1]));
      const avg = out.reduce((a, b) => a + b, 0) / out.length;
      let cost = Math.abs(avg - target) + (out[1] - out[0] <= 2 && out[0] < 54 ? 4 : 0);
      for (let i = 1; i < out.length; i++) if (out[i] - out[i - 1] === 1) cost += i === out.length - 1 ? 1.5 : 3; // 隣り合う半音は濁るので避ける（いちばん上は少し許す）
      if (cost < bc) { bc = cost; best = out; }
    });
    return best;
  }
  const BLO = { sub: 28, bass: 33, slap: 33, acid: 38, ubass: 31 }; // ベースのいちばん低い所（E1＝28）
  const bassNote = (c, kind, inst) => {
    const r = lowest(c.bass, BLO[inst] || 28);
    if (kind === 'o') return r + 12;
    if (kind === '5') return lowest((c.root + (c.iv.includes(7) ? 7 : c.iv.includes(6) ? 6 : c.iv.includes(8) ? 8 : 7)) % 12, r);
    if (kind === '7') return lowest((c.root + (c.iv.includes(11) ? 11 : 10)) % 12, r);
    return r;
  };
  const LO = {
    brass: 58, epiano: 53, piano: 57, stab: 55, vibes: 62, gtr: 52, cut: 58, organ: 55, saw: 50, pad: 50, strings: 53, choir: 55,
    pluck: 62, bell: 72, lead: 64, guitar: 60, flute: 67,
  };
  // 型：[位置, 長さ, 何を鳴らすか, 強さ]（位置と長さは8分音符で、1小節＝8）
  //   何を：r 根音（分数コードはその低音）・o 1オクターブ上・5 5度・7 7度・c 和音・a0〜 分散和音の何番目か
  //   後ろに「>」を付けると16分音符、「>>」で8分音符先のコードを先取りする（食い）
  const P16 = (s, kinds, len) => s.split('').map((ch, i) => VEL[ch] ? [i / 2, len || 0.5, kinds[i % kinds.length], VEL[ch]] : null).filter(Boolean);
  const PAT = {
    // ベース
    rock8: [0, 1, 2, 3, 4, 5, 6, 7].map(p => [p, 1, p === 7 ? 'o' : 'r']),
    slap: [[0, 0.75, 'r'], [1, 0.5, 'o'], [1.5, 0.5, 'r'], [2.5, 0.5, 'r'], [3, 0.5, 'o'], [4, 0.75, 'r'], [5, 0.5, '5'], [5.5, 0.5, 'o'], [6.5, 0.5, 'r'], [7, 0.5, 'o'], [7.5, 0.5, '5']],
    anthem: [[0, 2, 'r'], [2, 1, 'r'], [3, 1, '5'], [4, 2, 'o'], [6, 1, '5'], [7, 1, 'r']],
    half: [[0, 3, 'r'], [3, 1, 'r'], [4, 4, '5']],
    whole: [[0, 8, 'r']],
    // ハウスのファンクなベース（オクターブと16分の食い）
    house: [[0, 1, 'r'], [1.5, 0.5, 'o', 0.7], [2, 0.5, 'r', 0.55], [3, 0.75, 'r', 0.9], [4, 0.5, 'r'], [5, 0.5, 'o', 0.8], [5.5, 0.5, 'r', 0.5], [6, 1, '5', 0.85], [7.5, 0.5, 'r>', 0.9]],
    // ディープ・ハウス（拍の裏に置いて、間を空ける）
    deep: [[0, 1, 'r'], [1.5, 1, 'r', 0.8], [3.5, 0.5, 'o', 0.6], [4, 1, 'r'], [5.5, 1, '5', 0.8], [7, 0.5, 'r', 0.6], [7.5, 0.5, 'r>', 0.85]],
    // ボサノバ（根音と5度、拍の前の食い）
    bossa: [[0, 3, 'r'], [3, 1, '5', 0.7], [4, 3, '5'], [7, 1, 'r>>', 0.75]],
    // 駆けるベース（拍の裏の16分を3つ。キックの合間を埋める）
    roll: [0, 2, 4, 6].flatMap(q => [[q + 0.5, 0.5, 'r', 0.75], [q + 1, 0.5, 'r', 1], [q + 1.5, 0.5, q === 6 ? 'o' : 'r', 0.7]]),
    acid: P16('XxXgXxgXxXgXxgXX', ['r', 'r', 'o', 'r', 'r', '5', 'o', 'r', 'r', 'r', 'o', 'r', '7', 'r', 'o', 'r>']),
    // R&B（ゴーストと食い）
    rnb: [[0, 1.5, 'r'], [1.5, 0.5, 'r', 0.35], [2.5, 0.5, '5', 0.7], [3, 1, 'o', 0.8], [4, 1.5, 'r'], [6, 0.5, '5', 0.6], [6.5, 0.5, 'r', 0.45], [7, 1, 'r>>', 0.85]],
    // 和音
    epHouse: [[1, 0.75, 'c', 0.8], [2.5, 0.5, 'c', 0.6], [3.5, 1.5, 'c>', 0.95], [5, 0.75, 'c', 0.7], [6.5, 0.5, 'c', 0.6], [7.5, 1.5, 'c>', 0.95]],
    epRnb: [[0, 2.5, 'c', 0.8], [3.5, 1.5, 'c>', 0.7], [5.5, 0.5, 'c', 0.45], [6, 1, 'c', 0.6], [7.5, 2, 'c>', 0.75]],
    deepStab: [[1.5, 0.5, 'c'], [3, 0.5, 'c', 0.7], [5, 1, 'c', 0.9], [7.5, 0.5, 'c>', 0.8]],
    raceStab: [[0, 0.5, 'c'], [1.5, 0.5, 'c', 0.8], [3, 0.5, 'c', 0.9], [5, 0.5, 'c', 0.8], [6.5, 1, 'c', 0.9]],
    bossaGtr: [[0, 1, 'c', 0.9], [1.5, 1, 'c', 0.65], [3, 1, 'c', 0.8], [5, 1, 'c', 0.7], [6, 1, 'c', 0.8], [7.5, 1, 'c>', 0.6]],
    cut16: P16('gg.gXgggggxgXg.x', ['c'], 0.4),
    stab: [[0, 1, 'c'], [3, 1, 'c'], [5, 0.5, 'c'], [6, 1, 'c']],
    hit: [[0, 2, 'c']],
    hold: [[0, 8, 'c']],
    arp8: [0, 1, 2, 3, 4, 3, 2, 1].map((k, i) => [i, 1, 'a' + k]),
    arpUp: P16('XgxgXgxgXgxgXgxg', ['a0', 'a1', 'a2', 'a3', 'a4', 'a3', 'a2', 'a1'], 1),
    sus: 'sus',
  };
  function genTrack(pat, bars, inst, nextC) {
    const lo = LO[inst] || 55;
    let prev = null;
    // 小節 bi の pos（8 以上は次の小節）で鳴っているコード
    const chordAt = (bi, pos) => {
      while (pos >= 8) { bi++; pos -= 8; }
      if (bi >= bars.length) return nextC || bars[bars.length - 1][bars[bars.length - 1].length - 1].c;
      return bars[bi].find(s => pos >= s.p && pos < s.p + s.len).c;
    };
    return bars.map((bar, bi) => {
      if (pat === 'sus') return bar.map(s => { const vc = voiceChord(s.c, lo, prev, inst); prev = vc; return `${vc.map(nname).join('+')}:${num(s.len)}`; }).join(' ');
      const toks = [];
      if (pat[0][0] > 0) toks.push(`R:${num(pat[0][0])}`);
      pat.forEach(([p, l, w0, vel], j) => {
        const ant = /\>\>$/.test(w0) ? 1 : /\>$/.test(w0) ? 0.5 : 0, w = w0.replace(/>+$/, '');
        const si = bar.findIndex(s => p >= s.p && p < s.p + s.len), slot = bar[si];
        const c = ant ? chordAt(bi, p + ant) : slot.c;
        const adv = (j + 1 < pat.length ? pat[j + 1][0] : 8) - p;
        const toNext = j + 1 < pat.length ? adv : 8 - p + pat[0][0];
        let len = Math.min(l, toNext);
        if (!ant) len = Math.min(len, slot.p + slot.len - p); // コードの変わり目で切る
        let kind = w;
        if ((kind === 'o' || kind === '5' || kind === '7') && !ant && p === slot.p && si > 0) kind = 'r'; // 変わり目は根音から
        let notes;
        if (kind === 'c') { notes = voiceChord(c, lo, prev, inst); prev = notes; }
        else if (kind[0] === 'a') { const vc = voicing(c, lo), k = +kind.slice(1); notes = [vc[k % vc.length] + 12 * Math.floor(k / vc.length)]; }
        else notes = [bassNote(c, kind, inst)];
        toks.push(`${notes.map(nname).join('+')}:${num(adv)}${len !== adv ? '_' + num(len) : ''}${vel != null && vel !== 1 ? '^' + num(vel) : ''}`);
      });
      return toks.join(' ');
    }).join(' | ');
  }
  // 太鼓の型（1小節＝16文字。32文字なら2小節で一回り）
  const H16 = 'xg.gxg.gxg.gxg.g'; // 閉じたハイハット（開いたハイハットの裏を避ける）
  const DRUMS = {
    rock: { main: { k: 'X.....x.X.x.....', s: '....X.......X...', h: 'X.x.X.x.X.x.X.x.' } },
    funk: { main: { k: 'X.....x...X..x..', s: '....X..g.g..X..g', h: 'XxXxXxXxXxXxXx.x', o: '..............X.' }, fill: { k: 'X.....x...X.....', s: '....X..g.XgXXgXX', h: 'XxXxXxXx........' } },
    // ハウス：4つ打ちのキック、2・4拍のクラップ、裏の開いたハイハット、16分の閉じたハイハットとシェイカー
    house: {
      main: { K: 'X...X...X...X...', p: '....X.......X...', o: '..X...X...X...X.', h: H16, S: 'gxgxgxgxgxgxgxgx' },
      fill: { K: 'X...X...X...X...', p: '....X.......X.Xg', o: '..X...X...X.....', h: 'xg.gxg.gxg.g....', s: '.........g.gxxXX' },
    },
    deep: {
      main: { K: 'X...X...X...X...', R: '....x..g....x...' + '....x..g....x.g.', o: '..x...x...x...x.', S: 'gxgXgxgXgxgXgxgX', q: '......x.......x.' + '......x....x..x.' },
      fill: { K: 'X...X...X...X...', R: '....x..g....xgxg', o: '..x...x...x.....', S: 'gxgXgxgXgxgXgxgX', Q: '..........x.x.xx' },
    },
    // ボサノバ（キックは付点のゆらぎ、リムはボサのクラーベ）
    bossa: {
      main: { k: 'x.....g.x.....g.', R: 'x..x..x...x..x..' + '..x..x..x..x....', S: 'gxgxXxgxgxgxXxgx' },
      fill: { k: 'x.....g.x.....g.', R: 'x..x..x...x..x..', S: 'gxgxXxgxgxgxXxgx', Q: '............x.x.' },
    },
    // テクノ：4つ打ちと、16分のハイハット、裏のゴーストのスネア
    techno: {
      main: { K: 'X...X...X...X...', p: '....X.......X...', o: '..X...X...X...X.', h: H16, s: '.......g......g.' },
      fill: { K: 'X...X...X...X...', p: '....X.......X...', o: '..X...X.........', h: 'xg.gxg.g........', s: '........xxxxXXXX' },
    },
    // ブレイクビーツ（レースの中間）
    breaks: {
      main: { k: 'X.........X..x..', s: '....X..g.g..X..g', h: 'XxXgXxXgXxXgXxXg', o: '..............x.' },
      fill: { k: 'X.........X.....', s: '....X..g.XgXXgXX', h: 'XxXgXxXg........' },
    },
    // 映画のようなゆっくりのブレイクビーツ（GF のパドック）
    cine: {
      main: { k: 'X......X..X.....', s: '....X......g....' + '....X......g..g.', h: 'x.xgx.xgx.xgx.xg', r: 'x.......x.......' },
      fill: { k: 'X......X..X.....', s: '....X......g.ggg', T: '........X.x.XxXX', h: 'x.xgx.xg........' },
    },
    // R&B（ゆれる16分のハイハット、2・4拍のクラップとスネア）
    rnb: {
      main: { K: 'X......X..X.....', p: '....X.......X...', s: '....x..g.g..x...', h: 'XgxgXgxgXgxgXgxg', o: '..............x.' },
      fill: { K: 'X......X..X.....', p: '....X.......X...', s: '....x..g.g..xgxx', h: 'XgxgXgxgXgxg....' },
    },
  };
  const FILL = { k: 'X.....x.X.......', s: '....X...XX......', t: '..........XX....', m: '............XX..', l: '..............XX', h: 'X.x.X.x.........' };
  const MIX = {
    lead: { vol: 1, rev: 0.2, dly: 0.22 }, lead2: { vol: 0.8, pan: -0.3, rev: 0.25, dly: 0.08, wide: 0.3 }, comp: { vol: 0.8, pan: 0.3, rev: 0.2, wide: 0.7 },
    comp2: { vol: 0.7, pan: -0.4, rev: 0.15 }, pad: { vol: 0.75, rev: 0.35, wide: 1 }, bass: { vol: 1, rev: 0.02 },
  };
  const TRACKS = ['lead', 'lead2', 'comp', 'comp2', 'pad', 'bass'];
  const INST = { lead: 'lead', lead2: 'lead2', comp: 'compInst', comp2: 'comp2Inst', pad: 'padInst', bass: 'bassInst' };
  const errors = [];
  const rests = n => Array(n).fill('R:8').join(' | ');
  const cyc = (s, b) => { const k = Math.max(1, Math.floor(s.length / 16)); return s.slice((b % k) * 16, (b % k) * 16 + 16); };
  const fit16 = (s, nb, b) => s.length === nb * 16 ? s.slice(b * 16, b * 16 + 16) : cyc(s, b);

  // 曲を組み立てる：parts（部分ごとのコード・旋律）を intro・form の順に並べ、伴奏と太鼓を型から作る
  function arrange(name, sp) {
    const band = Object.assign({ lead: 'lead', lead2: 'brass', comp: null, compInst: 'epiano', comp2: null, comp2Inst: 'cut', pad: null, padInst: 'pad', bass: 'rock8', bassInst: 'bass', drum: 'rock' }, sp.band);
    const part = k => { const p = sp.parts[k]; if (!p) { errors.push(`${name}: 部分 ${k} が無い`); return { ch: 'C' }; } return p.from ? Object.assign({}, part(p.from), p, { from: null }) : p; };
    const intro = sp.intro || [], order = intro.concat(sp.form);
    const Ps = order.map(k => Object.assign({}, band, part(k)));
    const CBs = Ps.map((P, i) => parseChords(P.ch, errors, `${name}.${order[i]}`));
    const seqs = {}; for (const k of TRACKS) seqs[k] = [];
    const lanes = {}, sweeps = []; let bars = 0, loopBars = 0;
    order.forEach((k, idx) => {
      if (idx === intro.length) loopBars = bars;
      const P = Ps[idx], cb = CBs[idx], nb = cb.length, where = `${name}.${k}`;
      const ni = idx + 1 < order.length ? idx + 1 : sp.loop ? intro.length : -1;
      const nextC = ni >= 0 ? CBs[ni][0][0].c : null;
      const fit = (tr, s, inst) => {
        const ln = parseSeq(s).length;
        if (Math.abs(ln - nb * 8) > 1e-6) errors.push(`${where}.${tr}: 長さ ${ln}（${nb * 8} のはず）`);
        seqs[tr].push(`@${inst} ${s}`);
      };
      fit('lead', P.mel || rests(nb), P.lead);
      fit('lead2', P.mel2 || rests(nb), P.lead2);
      for (const tr of ['comp', 'comp2', 'pad', 'bass']) {
        const v = P[tr], inst = P[INST[tr]];
        if (v && typeof v === 'string' && !PAT[v] && !/[A-G]|R:/.test(v)) errors.push(`${where}.${tr}: 型 ${v} が無い`);
        fit(tr, !v ? rests(nb) : PAT[v] ? genTrack(PAT[v], cb, inst, nextC) : v, inst);
      }
      // 太鼓
      const L = {};
      if (P.dr) Object.assign(L, P.dr);
      else if (P.drum && DRUMS[P.drum]) {
        const st = DRUMS[P.drum];
        for (let b = 0; b < nb; b++) {
          const pat = b === nb - 1 && P.fill !== false ? (st.fill || FILL) : st.main;
          for (const ln of new Set([...Object.keys(L), ...Object.keys(pat)])) L[ln] = (L[ln] || '.'.repeat(b * 16)) + (pat[ln] ? cyc(pat[ln], b) : '.'.repeat(16));
        }
        if (P.crash !== false) { L.c = 'X' + (L.c || '.'.repeat(nb * 16)).slice(1); const kk = L.K ? 'K' : 'k'; L[kk] = 'X' + (L[kk] || '.'.repeat(nb * 16)).slice(1); if (L.h) L.h = '.' + L.h.slice(1); }
      } else if (P.drum && !DRUMS[P.drum]) errors.push(`${where}: 太鼓の型 ${P.drum} が無い`);
      // 足す太鼓（16・32文字なら小節ごとにくり返す。部分の長さちょうどならそのまま）
      for (const [ln, s] of Object.entries(P.addDr || {})) { let full = ''; for (let b = 0; b < nb; b++) full += fit16(s, nb, b); L[ln] = (L[ln] || '.'.repeat(nb * 16)).split('').map((ch, i) => full[i] !== '.' ? full[i] : ch).join(''); }
      for (const ln of P.mute || []) delete L[ln];
      if (P.riser) L.z = '.'.repeat((nb - 1) * 16) + 'X' + '.'.repeat(15);
      for (const ln of Object.keys(L)) if (L[ln].length !== nb * 16) errors.push(`${where}.drum.${ln}: 長さ ${L[ln].length}（${nb * 16} のはず）`);
      for (const ln of new Set([...Object.keys(lanes), ...Object.keys(L)])) lanes[ln] = (lanes[ln] || '.'.repeat(bars * 16)) + (L[ln] || '.'.repeat(nb * 16));
      // フィルターの掃き：sweep: [始めの Hz, 終わりの Hz]（部分の長さで動かす）
      const sw = P.sweep || [20000, 20000];
      sweeps.push({ p: bars * 8, len: nb * 8, from: sw[0], to: sw[1] });
      bars += nb;
    });
    const tracks = TRACKS.map(k => ({ name: k, mix: Object.assign({}, MIX[k], (sp.mix || {})[k], { duck: (sp.duck || {})[k] || 0 }), seq: seqs[k].join(' | ') }));
    tracks.push({ name: 'drums', drum: lanes, mix: Object.assign({ vol: 1 }, (sp.mix || {}).drums) });
    return { bpm: sp.bpm, loop: !!sp.loop, loopStart: sp.loop ? loopBars * 8 : 0, length: bars * 8, swing: sp.swing || 0, rev: sp.rev, tracks, sweeps };
  }

  // ---------- 曲（どれもこのゲームのための書き下ろし） ----------
  // 2000年ごろのクラブ・ミュージックの調子：ハウス・テクノ・ブレイクビーツの拍に、9th・11th・13th の和音、分数コード、
  // 代理和音（裏コード・借りてきた和音）、16分の食い、ゴーストノート、スウィングした16分を乗せる
  const MEL = {};
  const bars = a => a.join(' | ');
  const rep = (s, n) => s.repeat(n);
  const dots = n => '.'.repeat(n);
  // タイトル：ヘ短調〜変イ長調のディスコ・ハウス。ドリアンの IV7（B♭13）でうねり、サビは IVmaj7–III7–vim7 の進行
  MEL.tA = bars([
    'R:1 C5:0.5 Eb5:0.5 F5:1 G5:1.5 Ab5:1 G5:0.5 F5:1 R:1', 'G5:0.5 Ab5:0.5 G5:1 F5:1 D5:1.5 C5:2.5 R:1',
    'R:1 Bb4:0.5 Db5:0.5 F5:1 Gb5:1 F5:0.5 Eb5:1 C5:1.5 Eb5:1', 'Eb5:3 C5:1 Ab4:1 F5:3',
    'R:1 G5:0.5 Ab5:0.5 Bb5:1 Db6:1 C6:1 Bb5:0.5 E5:1.5 G5:1', 'Ab5:2 G5:1 F5:1 C5:1.5 Eb5:0.5 F5:2',
    'R:1 F5:0.5 Ab5:0.5 C6:1.5 Bb5:0.5 Ab5:1 F5:1 Eb5:2', 'F5:2 Eb5:1 C5:1 Eb5:1.5 E5:0.5 G5:2',
  ]);
  MEL.tB = bars([
    'F5:3 Eb5:1 C5:2 Ab4:2', 'Bb4:3 Eb5:1 G5:4', 'G5:1.5 F5:0.5 Eb5:1 Bb4:1 G5:2 F5:2', 'Ab5:4 R:4',
    'Db5:1.5 F5:1.5 Ab5:1 C6:3 Bb5:1', 'Bb5:1.5 G5:1.5 Eb5:1 G5:2 Bb5:2', 'C6:3 Ab5:1 F5:2 Ab5:2', 'Bb5:4 Db6:2 C6:2',
  ]);
  // B の合いの手（ブラスのセクション）
  MEL.tB2 = bars(['R:8', 'R:8', 'R:8', 'R:4 C5+Eb5+Ab5:0.5 R:0.5 C5+Eb5+Ab5:1 R:1 Db5+F5+Bb5:1', 'R:8', 'R:8', 'R:8', 'R:4 Db5+F5+Bb5:0.5 R:0.5 Db5+G5+Bb5:1 R:0.5 Eb5+G5+Bb5+Db6:1.5']);
  const tC = [
    'Ab5:1.5 C6:1.5 Eb6:1 Db6:1.5 C6:1 Ab5:1.5', 'Bb5:1.5 G5:1 E5:1.5 G5:1 Bb5:1 Db6:2', 'C6:3 Ab5:1 F5:1.5 G5:0.5 Ab5:2', 'Gb5:1.5 F5:0.5 Eb5:1 Db5:1 C5:1.5 Eb5:1 Ab5:1.5',
    'Ab5:1.5 C6:1.5 Eb6:1 F6:1.5 Eb6:1 C6:1.5', 'Db6:1.5 Bb5:1 G5:1.5 E5:1 Eb6:1 E6:2', 'F6:2 Eb6:1 C6:1 G5:1.5 Ab5:0.5 C6:2',
  ];
  MEL.tC = bars(tC.concat('Bb5:1.5 Gb5:0.5 F5:1 Db5:1 F5:1.5 C6:1 Eb6:1.5'));
  MEL.tC2 = bars(tC.concat('Bb5:1.5 Db6:0.5 F6:1 Db6:1 C6:1.5 Bb5:1 G5:1.5'));
  // ホーム：ニ長調の渋谷系ボサノバ。maj9 から全音ずつ下がる ii–V、フルートとビブラフォンが掛け合う
  MEL.hA = bars([
    'F#5:3 E5:1 C#5:1.5 A4:2.5', 'R:1 F5:1 E5:1 D5:1 E5:1.5 B4:2.5', 'E5:3 D5:1 B4:1.5 G4:2.5', 'R:1 Eb5:1 D5:1 C5:1 D5:1.5 A4:2.5',
    'D5:1.5 F5:1.5 A5:3 G5:1 F5:1', 'Bb5:2 G5:1 E5:1 Bb5:1.5 C#5:0.5 E5:2', 'F#5:3 A5:1 C#6:1.5 B5:0.5 A5:2', 'G5:1.5 F#5:0.5 E5:1 D5:1 F#5:2 R:2',
  ]);
  MEL.hA2 = bars(['R:6 A5:0.5 C#6:0.5 E6:1', 'R:8', 'R:6 G5:0.5 B5:0.5 D6:1', 'R:8', 'R:6 F5:0.5 A5:0.5 C6:1', 'R:8', 'R:8', 'R:4 C#6:1 E6:1 G6:2']);
  MEL.hB = bars([
    'B5:2 A5:1 F#5:1 D5:2 E5:2', 'C#6:1.5 A5:0.5 E5:2 D#5:1.5 C5:0.5 A5:2', 'B5:3 G5:1 F#5:2 E5:2', 'G5:1.5 F#5:0.5 E5:1 C#5:1 B4:2 F#5:2',
    'A5:3 E5:1 C#5:2 F#5:2', 'Ab5:3 F5:1 D5:2 B4:2', 'G5:2 B5:1 D6:1 F#6:3 E6:1', 'D6:3 B5:1 C#6:1.5 Bb5:0.5 G5:2',
  ]);
  MEL.hC = bars([
    'D6:3 C6:1 A5:2 F5:2', 'G5:1.5 E5:0.5 C5:2 F#5:1.5 Eb5:0.5 C5:2', 'Bb5:3 A5:1 F5:2 D5:2', 'E5:1.5 G5:0.5 Bb5:1 D6:1 A5:4',
    'A5:3 G5:1 E5:2 C5:2', 'D5:1.5 E5:0.5 G5:1 Bb5:1 C#6:2 Bb5:2', 'A5:3 F#5:1 E5:1.5 C#5:2.5', 'B4:1.5 D5:0.5 F#5:1 G5:1 F#5:2 E5:2',
  ]);
  MEL.hC2 = bars(['F5:8', 'E5:4 F#5:4', 'F5:8', 'E5:8', 'E5:8', 'D5:4 C#5:4', 'C#5:8', 'B4:4 C#5:4']);
  // パドック：イ短調のディープ・ハウス。m9 の和音のスタブと山びこ、エレピが間をあけて歌う
  MEL.pA = bars([
    'R:2 E5:1 G5:1 B5:2.5 A5:1.5', 'G5:1.5 E5:2.5 R:4', 'R:2 D5:1 F5:1 A5:2.5 G5:1.5', 'G5:1 G#5:3 R:4',
    'R:2 E5:1 G5:1 B5:1.5 C6:1 B5:1.5', 'A5:1.5 G5:1 E5:1.5 R:4', 'R:1 F5:0.5 A5:0.5 C6:1.5 B5:0.5 A5:1 F5:1.5 E5:1.5', 'D5:1.5 E5:1 B4:1.5 G#4:1 B4:1 D5:2',
  ]);
  MEL.pB = bars([
    'A5:3 G5:1 E5:2 C5:2', 'B4:1.5 D5:0.5 E5:2 G5:4', 'F#5:3 G5:1 B5:2 D6:2', 'C6:3 B5:1 G5:2 E5:2',
    'F5:1.5 E5:0.5 D5:1 C5:1 A4:2 E5:2', 'G5:1.5 F#5:0.5 E5:1 B4:1 D5:4', 'E5:1.5 G5:0.5 A5:1 C6:1 B5:2 G5:2', 'A5:3 B5:1 G#5:2 G5:1 F5:1',
  ]);
  MEL.pC = bars(['E5:8', 'D5:8', 'C5:8', 'B4:8', 'A4:8', 'G#4:8', 'C5:8', 'B4:4 G#4:4']);
  MEL.pC2 = bars(['R:4 B5:1 C6:1 E6:2', 'R:4 F#5:1 G5:1 B5:2', 'R:4 E5:1 F5:1 A5:2', 'R:4 D5:1 E5:1 G5:2', 'R:4 D5:1 F5:1 A5:2', 'R:4 B4:1 D5:1 F5:2', 'R:4 B4:1 C5:1 E5:2', 'R:4 G#5:1 B5:1 D6:2']);
  // GF のパドック：ハ短調の映画のようなブレイクビーツ。弦とピアノ、合唱、ブラス
  MEL.fA = bars(['G4:3 C5:1 Eb5:3 D5:1', 'C5:6 Eb5:1 G5:1', 'Ab5:3 G5:1 F5:2 C5:2', 'D5:4 F5:2 Ab5:2', 'G5:3 Eb5:1 C6:3 Bb5:1', 'G5:6 F5:1 Eb5:1', 'F5:2 Ab5:2 C6:2 G5:2', 'G5:4 F5:2 Eb5:1 D5:1']);
  MEL.fB = bars(['C5:2 Eb5:2 G5:3 F5:1', 'F5:3 D5:1 Bb5:4', 'Bb5:2 F5:2 D5:2 G5:2', 'Eb5:6 D5:1 Eb5:1', 'F5:3 G5:1 Ab5:2 C6:2', 'Bb5:3 Ab5:1 Eb5:2 C5:2', 'Eb5:2 G5:2 Bb5:2 D6:2', 'C6:4 B5:4']);
  MEL.fC = bars(['C6:6 Bb5:1 Ab5:1', 'Bb5:6 Ab5:1 G5:1', 'G5:8', 'R:4 G5:1 C6:1 D6:1 Eb6:1', 'Eb6:6 D6:1 C6:1', 'D6:6 C6:1 D6:1', 'C6:8', 'B5:6 R:2']);
  // レース：ホ短調のテクノ。4つ打ちと駆けるベース、スーパーソウの和音。サビは IVmaj9–V/IV–iiim7–vim9
  MEL.rA = bars([
    'B5:1 E6:1 F#6:0.5 G6:1 F#6:1 E6:0.5 D6:1 B5:2', 'G5:1 B5:1 D6:0.5 E6:2.5 R:1 D6:0.5 B5:1.5', 'A5:1 D6:1 E6:0.5 F#6:1.5 E6:1 B5:1 A5:2', 'F#5:1.5 A5:1 D6:1.5 C#6:1 B5:1 A5:1 F#5:1',
    'B5:1 E6:1 F#6:0.5 G6:1 A6:1 G6:0.5 F#6:1 D6:2', 'E6:1 D6:0.5 B5:1.5 G5:1 B5:1 D6:1 E6:2', 'C6:1.5 B5:0.5 A5:1 E5:1 G5:1 B5:1 C6:1 E6:1', 'E6:2 F#6:1 E6:1 D#6:1.5 C6:0.5 A5:1 F#5:1',
  ]);
  MEL.rB = bars(['E5:3 G5:1 B5:4', 'A5:2 F#5:2 D5:4', 'G5:3 B5:1 D6:4', 'E6:2 D6:2 A5:4', 'F#5:3 A5:1 D6:2 C#6:2', 'B5:6 R:2', 'R:2 G5:1 B5:1 D6:1 E6:1 G6:2', 'F#6:4 E6:2 D6:2']);
  MEL.rC = bars([
    'E6:3 D6:1 E6:1 G6:1.5 E6:1.5', 'F#6:3 E6:1 D6:1 A5:1.5 D6:1.5', 'D6:3 C#6:1 B5:1 F#5:1.5 A5:1.5', 'B5:4 G5:1 A5:1 B5:1 D6:1',
    'E6:3 D6:1 E6:1 G6:1.5 B6:1.5', 'A6:3 G6:1 F#6:1 D6:1.5 F#6:1.5', 'E6:4 F#6:2 E6:2', 'D#6:4 B5:2 F#5:2',
  ]);
  MEL.rD = bars([
    'E5:1 D5:1 B4:1 G4:1 A4:1 B4:1 D5:1 E5:1', 'G5:2 E5:1 D5:1 E5:4', 'E5:1 G5:1 E5:1 C5:1 D5:1 E5:1 G5:1 A5:1', 'B5:2 A5:1 G5:1 E5:4',
    'A5:1 G5:1 E5:1 C5:1 D5:1 E5:1 A5:2', 'C6:2 B5:1 A5:1 E5:4', 'F#5:1 E5:1 F#5:1 A5:1 B5:2 E6:2', 'D#6:4 B5:2 F#5:2',
  ]);
  MEL.fan = bars(['F4:1 Bb4:1 D5:1 F5:3 D5:1 F5:1', 'G5:3 F5:1 Eb5:2 Bb4:2', 'D5:1.5 Bb4:0.5 G4:1 Bb4:1 C5:1.5 E5:0.5 G5:2', 'Bb5:3 G5:1 A5:3 F5:1', 'A5:2 F5:1 D5:1 B4:1.5 D5:0.5 F5:1 Ab5:1', 'G5:3 Eb5:1 C6:3 Bb5:1', 'Bb5:8']);
  MEL.fanGF = bars(['G4:1 C5:1 E5:1 G5:3 E5:1 G5:1', 'A5:3 G5:1 F5:2 C5:2', 'E5:1.5 C5:0.5 A4:1 C5:1 D5:1.5 F#5:0.5 A5:2', 'C6:3 A5:1 B5:3 G5:1', 'G5:2 E5:1 B4:1 C#5:1.5 E5:0.5 G5:1 Bb5:1', 'A5:3 F5:1 D6:3 C6:1', 'C6:3 Eb6:1 D6:3 F6:1', 'E6:8']);
  MEL.vic = bars(['C5:1 E5:1 G5:1 A5:1.5 G5:0.5 E5:1 G5:2', 'B5:1 A5:0.5 G5:1 E5:1.5 F5:1 G5:1 B5:1 D6:1', 'Eb6:1.5 C6:0.5 Bb5:1 G5:1 F6:1.5 D6:0.5 C6:1 D6:1']);
  // 栄光：変ロ長調のソウル・R&B。下がっていく低音、ゆれる16分、ブラスと合唱
  MEL.gA = bars([
    'R:1 D5:0.5 F5:1 Bb5:1.5 C6:1 D6:1.5 C6:1.5', 'A5:1.5 F5:0.5 C5:1 F5:1 G5:1.5 A5:1 C6:1.5', 'Bb5:3 A5:1 G5:1 F5:1 D5:2', 'R:1 D5:0.5 F5:0.5 G5:1 Bb5:1 A5:1.5 G5:0.5 F5:2',
    'G5:1.5 F5:0.5 G5:1 Bb5:1 D6:3 C6:1', 'C6:1.5 A5:0.5 F5:2 Bb5:1.5 A5:0.5 F5:2', 'Eb5:1 G5:1 Bb5:1 D6:1.5 C6:1 Bb5:0.5 G5:2', 'Bb5:3 C6:1 A5:2 F5:2',
  ]);
  MEL.gB = bars([
    'Bb5:1.5 G5:0.5 F5:1 D5:1 F5:1.5 G5:1 Bb5:1.5', 'C6:3 A5:1 F5:2 C5:2', 'D5:1.5 F5:0.5 A5:1 C6:1 A5:1.5 F5:1 D5:1.5', 'Bb5:6 R:2',
    'Eb6:1.5 D6:0.5 C6:1 G5:1 Bb5:1.5 C6:1 D6:1.5', 'C6:3 A5:1 F5:2 Eb5:2', 'F5:1.5 A5:0.5 C6:1 D6:1 B5:1.5 Ab5:0.5 F5:2', 'Eb5:1 G5:1 Bb5:1 D6:1 Eb6:1.5 D6:0.5 C6:2',
  ]);

  const SPEC = {
    title: {
      bpm: 124, loop: true, swing: 0.12,
      band: { lead: 'lead', lead2: 'brass', comp: 'epHouse', compInst: 'epiano', pad: 'sus', padInst: 'strings', bass: 'house', bassInst: 'bass', drum: 'house' },
      intro: ['I'], form: ['A', 'B', 'C', 'C2', 'D'],
      duck: { pad: 0.45, comp: 0.25, comp2: 0.2 },
      parts: {
        I: {
          ch: 'Dbmaj9 | C7#9 | Fm9 Fm9/Eb | Dbmaj7 C7#9', sweep: [280, 9000], riser: true,
          mel2: 'R:8 | R:8 | R:8 | R:4 E4+Bb4+Eb5:0.5 R:0.5 E4+Bb4+Eb5:1 R:0.5 E4+Bb4+Eb5+G5:1.5',
          dr: { K: rep('X...', 16), o: dots(16) + rep('..X.', 12), p: dots(32) + rep('....X.......X...', 2), h: dots(32) + rep(H16, 2), c: 'X' + dots(63) },
        },
        A: { ch: 'Fm9 | Bb13 | Ebm9 Ab13 | Dbmaj9 | Gm7b5 C7b9 | Fm9 Fm9/Eb | Dbmaj7 | C7sus C7#9', mel: MEL.tA },
        B: { ch: 'Dbmaj7 | Eb/Db | Cm7 | Fm7 | Bbm7 | Cm7 | Dbmaj7 | Eb7sus Eb7', comp: 'deepStab', compInst: 'stab', comp2: 'cut16', mel: MEL.tB, mel2: MEL.tB2, riser: true },
        C: { ch: 'Dbmaj7 | C7 | Fm7 | Ebm7 Ab7 | Dbmaj7 | C7#9 | Fm9 | Ebm9 Ab13', comp2: 'cut16', mel: MEL.tC, mel2: T(MEL.tC, -12) },
        C2: { from: 'C', ch: 'Dbmaj7 | C7 | Fm7 | Ebm7 Ab7 | Dbmaj7 | C7#9 | Fm9 | Gm7b5 C7#9', mel: MEL.tC2, mel2: T(MEL.tC2, -12) },
        D: { ch: 'Fm9 | Bb13 | Fm9 | C7#9', pad: null, lead: 'vibes', sweep: [600, 16000], riser: true, mute: ['o'], mel: 'R:4 C6:0.5 Ab5:0.5 G5:1 Eb5:2 | R:8 | R:4 C6:0.5 Ab5:0.5 G5:1 Bb5:2 | R:8' },
      },
      mix: { lead: { vol: 0.9, dly: 0.25 }, lead2: { vol: 0.55 }, comp: { vol: 0.85 }, comp2: { vol: 0.5 }, pad: { vol: 0.55 } },
    },
    home: {
      bpm: 112, loop: true, swing: 0.06, rev: 0.6,
      band: { lead: 'flute', lead2: 'vibes', comp: 'bossaGtr', compInst: 'gtr', pad: 'sus', padInst: 'pad', bass: 'bossa', bassInst: 'ubass', drum: 'bossa', crash: false },
      intro: ['I'], form: ['A', 'B', 'A2', 'C'],
      parts: {
        I: { ch: 'Em9 | A13', bass: null, pad: null, dr: { S: rep('gxgxXxgxgxgxXxgx', 2), R: dots(16) + '..X..X..X..X....' } },
        A: { ch: 'Dmaj9 | Dm9 G13 | Cmaj9 | Cm9 F13 | Bbmaj7 | Em7b5 A7b9 | Dmaj9 Bm9 | Em9 A13', mel: MEL.hA },
        B: { ch: 'Gmaj9 | F#m7 B7b9 | Em9 | A13 | F#m7 | Fdim7 | Em9 | A7sus A7b9', mel: MEL.hB, addDr: { q: '..........x..x..', Q: '......x.......x.' } },
        A2: { from: 'A', mel2: MEL.hA2 },
        C: { ch: 'Bbmaj9 | Am7 D7b9 | Gm9 | C13 | Fmaj9 | Em7b5 A7b9 | Dmaj9 | Em9 A13', lead: 'vibes', lead2: 'flute', mel: MEL.hC, mel2: MEL.hC2 },
      },
      mix: { lead: { vol: 1, rev: 0.3, dly: 0.18 }, lead2: { vol: 0.7, pan: 0.3, rev: 0.35, dly: 0.2 }, comp: { vol: 0.9, pan: -0.25, wide: 0.3, rev: 0.25 }, pad: { vol: 0.35 }, bass: { vol: 0.95 } },
    },
    paddock: {
      bpm: 120, loop: true, swing: 0.1,
      band: { lead: 'epiano', lead2: 'vibes', comp: 'deepStab', compInst: 'stab', pad: 'sus', padInst: 'pad', bass: 'deep', bassInst: 'sub', drum: 'deep' },
      intro: ['I'], form: ['A', 'B', 'A2', 'C'],
      duck: { pad: 0.55, comp: 0.3 },
      parts: {
        I: { ch: 'Am9 | Am9 | Am9 | E7#9', sweep: [350, 18000], riser: true, pad: null },
        A: { ch: 'Am9 | Fmaj9 | Dm9 | E7#9 | Am9 | Fmaj9 | Dm9 G13 | Cmaj9 E7#9', mel: MEL.pA },
        B: { ch: 'Fmaj9 | G6 | Em9 | Am9 | Dm9 | Em9 | Fmaj9 | E7sus E7#9', lead: 'vibes', mel: MEL.pB },
        A2: { from: 'A', mel2: T(MEL.pA, 12) },
        C: {
          ch: 'Fmaj7#11 | Em9 | Dm9 | Cmaj9 | Bm7b5 | E7b9 | Am9 | E7#9', lead: 'strings', comp: 'arpUp', compInst: 'epiano', bass: 'whole', mel: MEL.pC, mel2: MEL.pC2, riser: true,
          dr: { S: rep('gxgXgxgXgxgXgxgX', 8), R: rep('....x.......x...', 8), K: dots(64) + rep('X...', 16), Q: rep('..........x.x.x.', 8) },
        },
      },
      mix: { lead: { vol: 0.95, rev: 0.25, dly: 0.3 }, lead2: { vol: 0.6, pan: 0.3, dly: 0.25 }, comp: { vol: 0.75, dly: 0.35, rev: 0.3 }, pad: { vol: 0.6 }, bass: { vol: 0.62 } },
    },
    paddockGF: {
      bpm: 92, loop: true, swing: 0.08, rev: 0.7,
      band: { lead: 'strings', lead2: 'strings', comp: 'arp8', compInst: 'piano', pad: 'sus', padInst: 'pad', bass: 'anthem', bassInst: 'sub', drum: 'cine' },
      form: ['A', 'B', 'A2', 'C'],
      parts: {
        A: { ch: 'Cm9 | Abmaj9 | Fm9 | G7sus G7b9 | Cm9 | Abmaj9 | Dbmaj7#11 | G7sus G7#9', mel: MEL.fA, addDr: { T: 'X' + dots(127) } },
        B: { ch: 'Abmaj7 | Bb/Ab | Gm7 | Cm9 | Fm9 | Bb9sus | Ebmaj7 | G7sus G7', lead: 'brass', mel: MEL.fB, mel2: T(MEL.fB, -12) },
        A2: { from: 'A', lead: 'brass', padInst: 'choir', mel2: T(MEL.fA, -12) },
        C: { ch: 'Abmaj9 | Bb6 | Cm9 | Cm9/Bb | Abmaj7 | Bb6 | G7sus | G7b9', lead: 'brass', comp: 'stab', compInst: 'brass', padInst: 'choir', mel: MEL.fC, mel2: T(MEL.fC, -12), addDr: { T: 'X' + dots(127) } },
      },
      mix: { lead: { vol: 0.95, rev: 0.35 }, lead2: { vol: 0.55 }, comp: { vol: 0.5, dly: 0.25 }, pad: { vol: 0.6 }, bass: { vol: 0.75 } },
    },
    race: {
      bpm: 140, loop: true,
      band: { lead: 'saw', lead2: 'brass', comp: 'raceStab', compInst: 'saw', pad: 'sus', padInst: 'strings', bass: 'roll', bassInst: 'bass', drum: 'techno' },
      intro: ['I'], form: ['A', 'A2', 'B', 'C', 'C2', 'D'],
      duck: { pad: 0.5, comp: 0.35, lead2: 0.15 },
      parts: {
        I: {
          ch: 'Em9 | Em9 | Cmaj9 | B7sus B7#9', sweep: [500, 18000], riser: true, lead: 'brass', comp: null,
          mel: 'R:8 | R:8 | R:8 | R:4 F#4+B4+E5:0.5 R:0.5 F#4+B4+E5:1 R:0.5 D#4+A4+D5:1.5',
          dr: { K: rep('X...', 12) + 'X...X...X.X.X.X.', h: dots(16) + rep(H16, 3), o: dots(32) + rep('..X.', 8), p: dots(32) + rep('....X.......X...', 2), s: dots(48) + '........xxxxXXXX', c: 'X' + dots(63) },
        },
        A: { ch: 'Em9 | Cmaj9 | D69 | Bm7 | Em9 | Cmaj9 | Am9 | B7sus B7b9', mel: T(MEL.rA, -12) },
        A2: { from: 'A', lead2: 'bell', mel2: MEL.rA },
        B: { ch: 'Am9 | Bm7 | Cmaj9 | D/C | Bm7 | Em9 | Cmaj9 | D6', drum: 'breaks', bass: 'house', comp: 'stab', compInst: 'brass', mel: T(MEL.rB, -12), riser: true },
        C: { ch: 'Cmaj9 | D/C | Bm7 | Em9 | Cmaj9 | D/C | B7sus | B7#9', mel: T(MEL.rC, -12), mel2: T(MEL.rC, -24) },
        C2: { from: 'C', lead2: 'bell', mel2: MEL.rC },
        D: { ch: 'Em9 | Em9 | Cmaj9 | Cmaj9 | Am9 | Am9 | B7sus | B7#9', lead: 'guitar', bass: 'acid', bassInst: 'acid', mel: MEL.rD, riser: true },
      },
      mix: { lead: { vol: 0.9, rev: 0.18, dly: 0.25 }, lead2: { vol: 0.6 }, comp: { vol: 0.6, pan: 0, wide: 0.8, dly: 0.12 }, pad: { vol: 0.5 }, bass: { vol: 1.05 } },
    },
    // 本馬場入場・発走前のファンファーレ：変ロ長調のブラスのセクション
    fanfare: {
      bpm: 108,
      band: { lead: 'brass', lead2: 'brass', comp: 'sus', compInst: 'brass', pad: 'sus', padInst: 'strings', bass: 'whole', drum: null },
      form: ['F'],
      parts: {
        F: {
          ch: 'Bb | Eb/Bb | Gm7 C/E | Ebmaj7 F/Eb | Dm7 G7b9 | Cm9 F7sus | Bb69', mel: MEL.fan, mel2: T(MEL.fan, -12),
          dr: { T: rep('X.......X.......', 5) + 'X.......X.x.XxXX' + 'X' + dots(15), k: rep('X.......X.......', 6) + 'X' + dots(15), s: dots(80) + 'xxxxxxxxXXXXXXXX' + dots(16), c: 'X' + dots(95) + 'X' + dots(15) },
        },
      },
      mix: { comp: { vol: 0.45, pan: 0.2 }, lead2: { vol: 0.6 } },
    },
    // グランドフィナーレのファンファーレ：ハ長調で、合唱と鐘を足して大きく。最後は ♭VI–♭VII–I
    fanfareGF: {
      bpm: 104,
      band: { lead: 'brass', lead2: 'brass', comp: 'sus', compInst: 'brass', comp2: 'arp8', comp2Inst: 'bell', pad: 'sus', padInst: 'choir', bass: 'whole', drum: null },
      form: ['F'],
      parts: {
        F: {
          ch: 'C | F/C | Am7 D/F# | Fmaj7 G/F | Em7 A7b9 | Dm9 G7sus | Abmaj7 Bb6 | Cadd9', mel: MEL.fanGF, mel2: T(MEL.fanGF, -12),
          dr: { T: rep('X.......X.......', 6) + 'X.x.X.x.XxXxXXXX' + 'X' + dots(15), k: rep('X.......X.......', 6) + dots(16) + 'X' + dots(15), s: dots(96) + 'gggggggggxxxXXXX' + dots(16), c: 'X' + dots(111) + 'X' + dots(15) },
        },
      },
      mix: { comp: { vol: 0.45, pan: 0.2 }, comp2: { vol: 0.3, pan: 0.3 }, lead2: { vol: 0.6 }, pad: { vol: 0.5 } },
    },
    // 勝ったとき：ファンクのブラスで駆け上がり、C6/9 で締める
    victory: {
      bpm: 132,
      band: { lead: 'brass', lead2: 'brass', comp: 'stab', compInst: 'brass', comp2: 'cut16', pad: 'sus', padInst: 'strings', bass: 'slap', bassInst: 'slap', drum: 'funk' },
      form: ['V', 'E'],
      parts: {
        V: { ch: 'Fmaj9 | G13 | Abmaj9 Bb13', mel: MEL.vic, mel2: T(MEL.vic, -12) },
        E: { ch: 'C69', comp: 'hold', comp2: null, bass: 'whole', mel: 'E6:8', mel2: 'E5:8', dr: { c: 'X' + dots(15), k: 'X' + dots(15), T: 'X' + dots(15) } },
      },
      mix: { lead: { vol: 0.85 }, comp: { vol: 0.5 }, comp2: { vol: 0.5 }, pad: { vol: 0.5 } },
    },
    // 負けたとき：短く、エレピとビブラフォン。最後は maj9 の 9th で「また次」
    lose: {
      bpm: 96,
      band: { lead: 'vibes', comp: 'epRnb', compInst: 'epiano', pad: 'sus', padInst: 'pad', bass: 'half', bassInst: 'ubass', drum: null },
      form: ['L', 'E'],
      parts: {
        L: { ch: 'Bbmaj7 | Am7 D7b9 | Gm9 C13', mel: 'D5:3 C5:1 A4:2 F4:2 | G4:2 C5:1 E5:1 F#5:2 Eb5:2 | Bb4:2 D5:1 F5:1 E5:2 A5:2', dr: { R: rep('....x.......x...', 3), S: rep('gxgxgxgxgxgxgxgx', 3), k: rep('x.......x.......', 3) } },
        E: { ch: 'Fmaj9', comp: 'hold', bass: 'whole', mel: 'G5:8', dr: { k: 'x' + dots(15) } },
      },
      mix: { lead: { vol: 0.9, dly: 0.25 }, pad: { vol: 0.5 } },
    },
    // 結果・表彰・記録：変ロ長調のソウル・R&B。誇らしく
    glory: {
      bpm: 88, loop: true, swing: 0.25,
      band: { lead: 'brass', lead2: 'strings', comp: 'epRnb', compInst: 'epiano', pad: 'sus', padInst: 'choir', bass: 'rnb', bassInst: 'bass', drum: 'rnb' },
      form: ['A', 'B', 'A2'],
      parts: {
        A: { ch: 'Bb | F/A | Gm9 | Gm9/F | Ebmaj9 | Dm7 G7#9 | Cm9 | F13sus F13', mel: MEL.gA },
        B: { ch: 'Ebmaj9 | F/Eb | Dm7 | Gm9 | Cm9 | F/Eb | Dm7 G7b9 | Cm9 F13', comp2: 'cut16', mel: MEL.gB },
        A2: { from: 'A', padInst: 'organ', mel2: T(MEL.gA, -12) },
      },
      mix: { lead: { vol: 1, rev: 0.28 }, lead2: { vol: 0.55 }, comp: { vol: 0.8 }, comp2: { vol: 0.45 }, pad: { vol: 0.5 } },
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
          const ev = [], lh = ln.charCodeAt(0) * 0.137;
          for (let i = 0; i < str.length; i++) if (VEL[str[i]]) ev.push({ p: i / 2, v: VEL[str[i]], r: (i * 0.3819660113 + lh) % 1 });
          const dm = DMIX[ln] || {};
          tracks.push({ drum: ln, mix: Object.assign({}, dm, { vol: (dm.vol || 1) * (tr.mix.vol || 1) }), events: ev, length: str.length / 2, bad: !DR[ln] || /[^Xxg.]/.test(str) });
        }
      } else {
        const r = parseSeq(tr.seq);
        tracks.push({ name: tr.name, mix: tr.mix, events: r.events, length: r.length });
      }
    }
    tracks.push({ sweep: true, mix: {}, events: song.sweeps.slice(), length: song.length });
    return { bpm: song.bpm, loop: song.loop, loopStart: song.loopStart, length: song.length, swing: song.swing, tracks };
  }
  AU.compile = compile;
  // 和音の色（7th・テンション・分数コードの割合）と、拍の裏で鳴り始める音の割合（食い・シンコペーション）を数える
  function color(name) {
    const sp = SPEC[name], order = (sp.intro || []).concat(sp.form);
    const res = k => { const p = sp.parts[k]; return p && p.from ? Object.assign({}, res(p.from), p, { from: null }) : p || {}; };
    let n = 0, rich = 0, slash = 0; const kinds = new Set();
    for (const k of order) for (const s of (res(k).ch || '').split(/[|\s]+/).filter(Boolean)) {
      const c = parseChord(s.split(':')[0]); if (!c) continue;
      n++; kinds.add(c.sym);
      if (new Set(c.iv.map(i => i % 12)).size >= 4) rich++;
      if (c.bass !== c.root) slash++;
    }
    return { rich: n ? rich / n : 0, slash: n ? slash / n : 0, kinds: kinds.size };
  }
  // 曲の確かめ（テスト用）：書式の誤り・長さ・和音の色・食い
  AU.check = function () {
    const errs = errors.slice(), info = {};
    for (const [k, s] of Object.entries(SONGS)) {
      const c = compile(s), sec = 60 / s.bpm / 2;
      let on = 0, off = 0; const insts = new Set();
      for (const tr of c.tracks) {
        if (tr.sweep) continue;
        if (Math.abs(tr.length - s.length) > 1e-6) errs.push(`${k}.${tr.name || tr.drum}: 長さ ${tr.length}（${s.length} のはず）`);
        if (tr.bad) errs.push(`${k}.${tr.drum}: 太鼓が読めない`);
        for (const ev of tr.events) {
          if (ev.bad) errs.push(`${k}.${tr.name}: 音が読めない（${ev.p} 拍目）`);
          if (tr.drum) continue;
          if (!V[ev.inst]) errs.push(`${k}.${tr.name}: 楽器 ${ev.inst} が無い`);
          else insts.add(ev.inst);
          if (ev.notes && ev.notes.some(n => n < 24 || n > 108)) errs.push(`${k}.${tr.name}: 音域の外（${ev.notes.map(nname)}）`);
          on++; if (ev.p % 2 !== 0) off++;
        }
      }
      info[k] = Object.assign({ seconds: s.length * sec, loopSeconds: s.loop ? (s.length - s.loopStart) * sec : 0, loop: s.loop, bpm: s.bpm, swing: s.swing, tracks: c.tracks.length, notes: on, offbeat: on ? off / on : 0, instruments: [...insts] }, color(k));
    }
    return { errors: errs, info };
  };

  // ---------- BGM の順番待ち（先読みで音を置く） ----------
  // 曲ごとに：トラック → [フィルター] → 曲の出口 → BGM のバス。響き・山びこも曲ごとに持つ（曲を替えると尾ごと消える）
  function channel(st, mix) {
    const c = E.ctx, inp = gn(mix.vol == null ? 1 : mix.vol), duck = gn(1);
    inp.connect(duck);
    let node = duck;
    if (mix.pan) { const p = panner(mix.pan); node.connect(p); node = p; }
    const dest = mix.nofilt ? st.post : st.in;
    node.connect(dest);
    if (mix.wide) {
      // 左右の広がり：わずかに揺れる短い遅れを左右へ（コーラス）
      for (const s of [-1, 1]) {
        const d = c.createDelay(0.05); d.delayTime.value = 0.012 + 0.005 * s;
        // くり返す曲では、揺れがくり返しの長さでちょうど一回りするようにする（書き出した曲のつなぎ目が切れないように）
        const f0 = 0.27 + 0.08 * s, span = st.song.loop ? (st.song.length - st.song.loopStart) * st.eighth : 0;
        const l = c.createOscillator(), lg = gn(0.0025); l.frequency.value = span ? Math.max(1, Math.round(f0 * span)) / span : f0; l.connect(lg); lg.connect(d.delayTime); l.start(st.t0); st.lfos.push(l);
        const g = gn(0.75 * mix.wide), p = panner(0.9 * s);
        node.connect(d); d.connect(g); g.connect(p); p.connect(dest);
      }
    }
    if (mix.rev) { const s = gn(mix.rev); node.connect(s); s.connect(st.rev); }
    if (mix.dly) { const s = gn(mix.dly); node.connect(s); s.connect(st.dly); }
    return { inp, duck };
  }
  function startSong(name, t0, e8) {
    const song = SONGS[name], cs = compile(song), eighth = e8 || 60 / song.bpm / 2, c = E.ctx;
    const st = { name, song, eighth, t0, lfos: [], endAt: t0 + song.length * eighth };
    st.in = gn(1); st.lp = filt('lowpass', 20000, 0.9); st.post = gn(1); st.out = gn(1);
    // 出口の EQ：ごく低い所を切り、300Hz あたりの濁りを少し下げ、5kHz より上に張りを足す
    const eqLo = filt('highpass', 32, 0.7), eqMud = filt('peaking', 320, 0.9), eqAir = filt('highshelf', 4800);
    eqMud.gain.value = -3; eqAir.gain.value = 5;
    st.in.connect(st.lp); st.lp.connect(st.post); st.post.connect(eqLo); eqLo.connect(eqMud); eqMud.connect(eqAir); eqAir.connect(st.out); st.out.connect(E.bgmBus);
    // 響き（少し遅れて、低い所は響かせない）
    const pre = c.createDelay(0.1); pre.delayTime.value = 0.02;
    const hp = filt('highpass', 240, 0.7), conv = c.createConvolver(); conv.buffer = E.ir;
    const rg = gn(song.rev == null ? 0.5 : song.rev);
    st.rev = gn(1); st.rev.connect(pre); pre.connect(hp); hp.connect(conv); conv.connect(rg); rg.connect(st.in);
    // 山びこ：左は付点8分、右は4分（左右に跳ねる）
    st.dly = gn(1);
    const dhp = filt('highpass', 320, 0.7); st.dly.connect(dhp);
    for (const [k, pan, fbv] of [[1.5, -0.5, 0.3], [2, 0.5, 0.24]]) {
      const d = c.createDelay(2); d.delayTime.value = eighth * k;
      const lp = filt('lowpass', 2800), fb = gn(fbv), p = panner(pan), o = gn(0.42);
      dhp.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(p); p.connect(o); o.connect(st.in);
    }
    st.sw = p => (song.swing && Math.abs(p % 1 - 0.5) < 1e-6 ? song.swing * 0.5 : 0);
    const tracks = cs.tracks.map(tr => {
      const ch = tr.sweep ? null : channel(st, tr.mix);
      return { tr, out: ch && ch.inp, duck: ch && ch.duck, duckAmt: tr.mix.duck || 0, i: 0, base: 0, first: tr.events.findIndex(ev => ev.p >= song.loopStart) };
    });
    for (const x of tracks) if (x.first < 0) x.first = x.tr.events.length;
    st.tracks = tracks; st.ducked = tracks.filter(x => x.duckAmt > 0);
    return st;
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
        const e = ev[x.i], at = st.t0 + (x.base + e.p + st.sw(e.p)) * st.eighth;
        if (at >= until) break;
        if (x.tr.sweep) {
          const f = st.lp.frequency;
          f.setValueAtTime(e.from, at);
          if (e.to !== e.from) f.exponentialRampToValueAtTime(e.to, at + e.len * st.eighth);
        } else if (x.tr.drum) {
          DR[x.tr.drum](x.out, at, e.v, e.r, st.eighth);
          // キックに合わせて、パッドや和音を一瞬引っ込める（クラブの音のうねり）
          if (DUCKERS[x.tr.drum] && e.v > 0.5) for (const y of st.ducked) { const g = y.duck.gain; g.setTargetAtTime(1 - y.duckAmt * e.v, at, 0.004); g.setTargetAtTime(1, at + 0.035, 0.09); }
        } else V[e.inst](x.out, e.notes.map(hz), at, e.len * st.eighth * 0.92, e.v);
        x.i++;
      }
    }
  }
  function fadeOut(st) {
    const now = E.ctx.currentTime, g = st.out.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.setTargetAtTime(0, now, 0.08);
    setTimeout(() => { try { st.out.disconnect(); } catch (e) { /* 外れている */ } for (const l of st.lfos) try { l.stop(); } catch (e) { /* 止まっている */ } }, 1500);
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
  // 書き出しのときの8分音符の秒：くり返しの長さが 128 サンプル（Web Audio が一度に描く単位）の倍数になるように、
  // ごくわずか（0.002% 以下）丸める。半端だと、音の高さの動きが周ごとに少しずれて、つなぎ目で波形が合わない
  AU.renderEighth = function (name) {
    const s = SONGS[name], e8 = 60 / s.bpm / 2, n = s.length - s.loopStart;
    return s.loop ? Math.round(n * e8 * 44100 / 128) * 128 / (44100 * n) : e8;
  };
  // 曲を音の波形に書き出す（確かめ・Godot 用の書き出し。OfflineAudioContext がある所だけ）
  //   sec：書き出す長さ（既定は曲の長さ＋3秒。くり返す曲は、それより長くすると2周目に入る）、t0：曲の始まりの時刻、
  //   only：このトラック・太鼓だけを鳴らす（音の配分を調べるとき）
  AU.render = function (name, sec, t0, only) {
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    const s = SONGS[name];
    if (!OAC || !s) return Promise.reject(new Error('書き出せない'));
    const eighth = AU.renderEighth(name);
    t0 = t0 == null ? 0.05 : t0;
    sec = sec || s.length * eighth + 3;
    const oc = new OAC(2, Math.ceil(44100 * sec), 44100);
    // 実際に鳴らすときと同じく、少し先までずつ音を置く（一度に全部置くと、重さを測り違える）
    const keep = E, eng = makeEngine(oc, BGM_GAIN);
    const run = fn => { const k = E; E = eng; try { fn(); } finally { E = k; } };
    let st;
    run(() => { st = startSong(name, t0, eighth); if (only) st.tracks = st.tracks.filter(x => x.tr.sweep || only.includes(x.tr.name || x.tr.drum)); pump(st, 0.6); });
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
    else if (name === 'snort') { noise(bus, t, 0.16, 'bandpass', 700, 0.55, 1.4); noise(bus, t + 0.17, 0.12, 'bandpass', 520, 0.4, 1.2); } // 鼻息（掛かり始め・手綱とケンカ）：ブルッ、ブルッ
    else if (name === 'exhale') { noise(bus, t, 0.5, 'lowpass', 900, 0.22, 0.8); } // 折り合って、ふうっと息を吐く
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
