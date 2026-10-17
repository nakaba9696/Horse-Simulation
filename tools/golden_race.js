// Godot 版の模擬が JS 版と同じ結果になるかを確かめる「答え」を作る（godot/tests/golden/*.json。生成物。手で直さない）。
//   node tools/golden_race.js          # 書き出す
//   node tools/golden_race.js --check  # 書き出し済みのものが今の JS と同じか（JS の模擬を直したら作り直す）
// races.json：いろいろなレース（芝・ダート・距離・頭数・馬場・競馬場の形・年代）を JS で回し、
//   出走馬の作り方（史実馬の名前・頭数合わせの種）・自分で乗る操作の列（決まった乗り方の打ち手 tests/ridebot.js と、でたらめな操作）・
//   10刻みごとの状態の指紋・100刻みごとの全馬の値・着順・タイム・実況・特殊能力の発動を書く。Godot の godot/tests/test_race.gd が同じものを回して比べる
// math.json：数学の関数（V8 の Math）と乱数（U.RNG）・U.hash の答え
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const { load } = require('../tests/load.js');
const { digest } = require('./export_godot.js');
const HS = load();
const { U, Horse: H, Sim: S } = HS;
const D = HS.DATA;
const OUT = path.join(ROOT, 'godot', 'tests', 'golden');
const bot = require('../tests/ridebot.js')(HS);

const b8 = Buffer.alloc(8);
const hex = v => { b8.writeDoubleBE(v); return b8.toString('hex'); };
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
// 1刻みの状態の指紋（Godot の test_race.gd の _state と同じ並べ方）
const stateStr = sim => sim.st.map(s => hex(s.x) + hex(s.lane) + hex(s.v) + hex(s.E)).join('') + (sim.ctl ? hex(sim.ctl.tension) + hex(sim.ctl.gear) + hex(sim.ctl.lane) + hex(sim.ctl.surge) + hex(sim.ctl.bumpT == null ? -1 : sim.ctl.bumpT) + hex(sim.ctl.bumpSide) : '');

// ---------- レースの条件 ----------
const GROUNDS = ['良', '稍重', '重', '不良'];
function raceList() {
  const m = new U.RNG(20261016);
  const out = [];
  const add = (r, year, ground) => out.push(Object.assign({}, r, { year, ground, key: 'g' + out.length }));
  // 番組から：JRA と海外を混ぜて、芝・ダート・距離がばらけるように
  const jra = D.races.filter(r => r.region !== '海外'), world = D.racesWorld;
  const seen = new Set();
  while (out.length < 40) {
    const r = m.chance(0.7) ? m.pick(jra) : m.pick(world);
    const k = r.course + r.surface + r.dist; if (seen.has(k)) continue; seen.add(k);
    add(r, Math.max(r.from, Math.min(r.to || 2026, m.int(1965, 2026))), m.pick(GROUNDS));
  }
  // 形の違うコース：直線（line）・周回しない（open）・data/layouts.js の無い馬場（楕円）・知らない競馬場（東京の数で楕円）
  const base = { grade: 'G3', region: 'JRA', age: '3+', weight: '別定', month: 6, week: 2, prize: 3000 };
  add(Object.assign({}, base, { name: '直線', course: '新潟', surface: '芝', dist: 1000 }), 2010, '良');
  add(Object.assign({}, base, { name: '下り', course: 'サンタアニタ', surface: '芝', dist: 2400, region: '海外' }), 2000, '良');
  add(Object.assign({}, base, { name: 'ダービー', course: 'エプソム', surface: '芝', dist: 2400, region: '海外', loop: 'ダービー' }), 1990, '稍重');
  add(Object.assign({}, base, { name: '大井の芝', course: '大井', surface: '芝', dist: 1600 }), 2025, '重');
  add(Object.assign({}, base, { name: '知らない場', course: 'テスト', surface: 'ダ', dist: 1800 }), 1975, '不良');
  add(Object.assign({}, base, { name: '長距離', course: '京都', surface: '芝', dist: 3200, grade: 'G1', month: 4 }), 2005, '良');
  add(Object.assign({}, base, { name: '短距離', course: '中京', surface: 'ダ', dist: 1200, month: 12 }), 2025, '稍重');
  add(Object.assign({}, base, { name: '少頭数', course: '函館', surface: '芝', dist: 2000, month: 7 }), 1995, '良');
  return out;
}

// ---------- 出走馬 ----------
function fieldOf(race, k, m) {
  const n = k % 9 === 7 ? 5 : m.int(8, 18);
  const year = race.year;
  const pool = D.historic.filter(d => (race.surface === 'ダ' ? d.surface !== '芝' : d.surface !== 'ダ') && d.rating >= 70);
  const specs = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    const roll = m.next();
    if (roll < 0.55) {
      let d; do d = m.pick(pool); while (used.has(d.name)); used.add(d.name);
      const set = { born: year - m.int(2, 6), cond: Math.round(m.normal(0, 30)), fatigue: m.int(0, 30) };
      if (m.chance(0.4)) set.lastRaceW = H.weekIndex(year, race.month, race.week || 1) - m.int(2, 20);
      if (m.chance(0.3)) set.bonus = { spd: Math.round(m.float(0, 5) * 100) / 100, guts: Math.round(m.float(0, 3) * 100) / 100 }; // Godot は長い桁の小数を読み違えるので、入力の小数は短く
      const spec = { kind: 'hist', name: d.name, set };
      if (m.chance(0.08)) spec.d = { pot: { spd: m.int(70, 100), sta: m.int(70, 100), mind: m.int(40, 90) }, kire: m.int(1, 8) }; // エディットで能力を決めた馬
      if (m.chance(0.12)) spec.d = Object.assign(spec.d || {}, { skills: m.pick([['oonige'], ['narabu', 'sora'], ['kakari'], ['deokure', 'nino'], ['jiyu', 'longspurt'], ['sunaB', 'hipace']]) });
      specs.push(spec);
    } else if (roll < 0.6 && D.legendsExtra && D.legendsExtra.length) {
      const d = m.pick(D.legendsExtra); if (used.has(d.name)) { i--; continue; } used.add(d.name);
      specs.push({ kind: 'legend', name: d.name, set: { born: year - 4, legend: true } });
    } else {
      specs.push({ kind: 'filler', seed: m.int(1, 2147483646), opts: { level: m.int(55, 95), surface: race.surface, dist: race.dist, born: year - m.int(2, 7), foreign: m.chance(0.1) }, set: { name: 'モブ' + i } });
    }
  }
  return specs;
}
function makeHorse(spec, id) {
  let h;
  if (spec.kind === 'filler') h = H.makeFiller(new U.RNG(spec.seed), spec.opts);
  else {
    const src = spec.kind === 'legend' ? D.legendsExtra.find(d => d.name === spec.name) : D.historic.find(d => d.name === spec.name);
    const d = spec.d ? Object.assign({}, src, spec.d) : src;
    h = H.fromHistoric(d, id);
  }
  Object.assign(h, JSON.parse(JSON.stringify(spec.set || {})));
  return h;
}

// ---------- 操作の打ち手 ----------
// でたらめに操作する打ち手（引きすぎ・急な進路の変更・早いムチも混ぜる）
function chaos(m) {
  return sim => {
    const c = sim.ctl; if (!c) return;
    if (!c.started) { if (sim.t >= 0.02 + m.int(0, 6) * 0.1) S.ctl.up(sim); return; }
    const r = m.next();
    if (r < 0.05) S.ctl.up(sim); else if (r < 0.1) S.ctl.down(sim);
    else if (r < 0.12) S.ctl.lane(sim, m.chance(0.5) ? 1 : -1);
    else if (r < 0.14 || (sim.D - sim.st[sim.me].x < sim.straight && r < 0.2)) S.ctl.whip(sim, m.chance(0.7) ? c.hand : (c.hand === 'R' ? 'L' : 'R'));
    else if (r < 0.145) S.ctl.swap(sim);
  };
}
// 打ち手の呼んだ操作を、刻みの番号と一緒に書き留める
function recording(sim, actions) {
  const orig = {};
  for (const k of ['up', 'down', 'whip', 'swap', 'lane']) {
    orig[k] = S.ctl[k];
    S.ctl[k] = function (s, arg) { const ret = orig[k](s, arg); if (s === sim) actions.push([sim.step, k, arg == null ? null : arg, ret == null ? null : ret]); return ret; };
  }
  return () => { for (const k of Object.keys(orig)) S.ctl[k] = orig[k]; };
}

function runCase(race, k) {
  const m = new U.RNG(1000 + k * 7919);
  const specs = fieldOf(race, k, m);
  const wIdx = H.weekIndex(race.year, race.month, race.week || 1);
  const horses = specs.map((sp, i) => makeHorse(sp, 'g' + k + '_' + i));
  const mode = k % 5; // 0：自分は乗らない 1：打ち手 fit 2：でたらめ 3：自分の馬を AI が乗る 4：打ち手 misfit
  const meI = mode === 0 ? -1 : m.int(0, horses.length - 1);
  const js = D.jockeys.filter(j => j.region !== '地方');
  const runners = horses.map((h, i) => {
    const j = m.pick(js);
    return { horse: h, jockey: { name: j.name, skill: m.int(55, 95), region: j.region }, rider: i === meI ? 'P' : null };
  });
  m.shuffle(runners);
  runners.forEach((x, i) => { x.num = i + 1; x.frame = Math.min(8, Math.ceil((i + 1) * 8 / runners.length)); x.weight = S.weightFor(x.horse, race, race.year); });
  const opts = { frames: k % 2 === 0, ride: mode === 1 || mode === 2 || mode === 4 };
  if (opts.ride && m.chance(0.7)) opts.bond = m.int(0, 15);
  const seed = m.int(1, 2147483646);
  // 出走表の形（馬は作り方で持つ。Godot は同じ作り方で作り直す）
  const card = runners.map(x => ({ spec: specs[horses.indexOf(x.horse)], id: x.horse.id, jockey: x.jockey, rider: x.rider, num: x.num, frame: x.frame, weight: x.weight }));
  const horseDigest = runners.map(x => digest(JSON.parse(JSON.stringify(x.horse))));
  const sim = S.create(race, runners, wIdx, new U.RNG(seed), opts);
  const actions = [];
  const stop = recording(sim, actions);
  const tick = mode === 1 ? bot.make('fit') : mode === 4 ? bot.make('misfit') : mode === 2 ? chaos(new U.RNG(seed ^ 0x5bd1e995)) : null;
  const hashes = [], checkpoints = {};
  let bumps = 0, lastBump = null; // 横に馬がいて止まった回数（S.LANE）
  try {
    for (;;) {
      if (tick) tick(sim);
      const done = S.step(sim);
      if (sim.ctl && sim.ctl.bumpT !== lastBump) { bumps++; lastBump = sim.ctl.bumpT; }
      if (sim.step % 10 === 0) hashes.push(sha(stateStr(sim)));
      if (sim.step % 100 === 0) checkpoints[sim.step] = sim.st.map(s => [hex(s.x), hex(s.lane), hex(s.v), hex(s.E), s.spurting, hex(s.fight), hex(s.kakari), hex(s.ears)]);
      if (done) break;
    }
  } finally { stop(); }
  const res = S.finish(sim);
  return {
    name: `${race.course}${race.surface}${race.dist}m ${race.ground} ${race.year}年 ${runners.length}頭`,
    race, wIdx, seed, opts, card, horseDigest, actions,
    paceF: hex(sim.paceF), steps: sim.step, bumps, final: sha(stateStr(sim)), hashes, checkpoints,
    results: res.results.map(x => ({ pos: x.pos, num: x.num, time: hex(x.time), margin: x.margin, lengths: hex(x.lengths), last3f: x.last3f == null ? null : hex(x.last3f), endE: hex(x.endE), power: hex(x.power), late: x.late, blocked: x.blocked })),
    winnerTime: U.time(res.winnerTime),
    events: res.events.map(e => [hex(e.t), e.text, e.kind]),
    skillFx: sim.skillFx.map(f => [hex(f.t), f.i, f.id]),
    frames: res.frames ? sha(JSON.stringify(res.frames.map(f => [hex(f.t), f.p.map(p => p.map(hex))]))) : null,
    trig: sim.st.map(s => s.trig),
  };
}

function mathCases() {
  const m = new U.RNG(777);
  const out = { cos: [], sin: [], log: [], exp: [], cbrt: [], pow: [], hypot: [], round: [], fixed: [], rng: [], hash: [], consts: [hex(Math.PI), hex(2 * Math.PI), hex(Math.PI / 2)] };
  for (let i = 0; i < 1500; i++) {
    const x = i % 3 === 0 ? m.float(0, 2 * Math.PI) : i % 3 === 1 ? m.float(-10, 10) : m.float(-2000, 2000);
    out.cos.push([hex(x), hex(Math.cos(x))]); out.sin.push([hex(x), hex(Math.sin(x))]);
    const y = i % 2 ? m.float(1e-9, 3000) : m.float(0, 2); out.log.push([hex(y), hex(Math.log(y))]);
    const z = m.float(-7, 3); out.exp.push([hex(z), hex(Math.exp(z))]);
    const w = m.float(0, 5); out.cbrt.push([hex(w), hex(Math.cbrt(w))]);
    const pb = i % 2 ? m.float(1, 1.5) : m.float(0, 60), pe = i % 2 ? 3 : m.float(-4, 4); out.pow.push([hex(pb), hex(pe), hex(Math.pow(pb, pe))]);
    const ha = m.float(-5, 5), hb = m.float(-5, 5); out.hypot.push([hex(ha), hex(hb), hex(Math.hypot(ha, hb))]);
    const ro = i % 5 === 0 ? Math.floor(m.float(-500, 500)) + 0.5 : m.float(-500, 500); out.round.push([hex(ro), hex(Math.round(ro))]);
    const fx = i % 7 === 0 ? Math.round(m.float(-90, 210) * 100) / 100 + 0.05 : m.float(-90, 210); out.fixed.push([hex(fx), fx.toFixed(0), fx.toFixed(1), fx.toFixed(2)]);
  }
  for (const seed of [1, 0, 12345, 2147483646, 4294967295, 20251130]) {
    const r = new U.RNG(seed); const seq = [];
    for (let i = 0; i < 40; i++) seq.push(hex(r.next()));
    seq.push(hex(r.normal(0, 1.9)), String(r.int(1, 1e9)), hex(r.float(0.5, 1.4)), String(r.chance(0.3)));
    const f = r.fork(); seq.push(hex(f.next()));
    out.rng.push([seed, seq]);
  }
  // 並べ替え（V8 の TimSort）：比べる関数が乱数を引く・同じ値が多い・長さがいろいろ
  out.sort = [];
  for (const [n, kind] of [[1, 'r'], [5, 'r'], [17, 'r'], [40, 'r'], [64, 'r'], [65, 't'], [130, 'r'], [300, 't'], [700, 'r'], [1500, 't'], [33, 'd'], [200, 'd']]) {
    const seed = m.int(1, 2147483646), r = new U.RNG(seed);
    const arr = []; for (let i = 0; i < n; i++) arr.push({ i, k: kind === 't' ? r.int(0, 9) : kind === 'd' ? n - i + (i % 3) : r.int(0, 1000) });
    let calls = 0;
    arr.sort((a, b) => { calls++; return kind === 'r' && r.next() < 0.2 ? r.next() - 0.5 : a.k - b.k; });
    out.sort.push([seed, n, kind, calls, arr.map(x => x.i)]);
  }
  for (const s of ['hist:ディープインパクト', 'hist:シンボリルドルフ', 'fict:武豊', 'abc', '', 'hist:セントサイモン', '𩸽テスト']) out.hash.push([s, U.hash(s)]);
  return out;
}

// フリーレース（js/core/freerace.js）：出走表の作り方（騎手・枠・人気）と、そのまま走らせた結果
function freeCases() {
  const FR = HS.FreeRace, m = new U.RNG(4242);
  const pool = D.historic.filter(d => d.rating >= 85);
  const sp = FR.specials();
  const out = [];
  for (let k = 0; k < 6; k++) {
    const crs = FR.courses();
    const c = m.pick(crs);
    const surface = c.dirt && (!c.turf || m.chance(0.4)) ? 'ダ' : '芝';
    const ds = FR.dists(c.name, surface);
    const entries = [];
    const n = m.int(6, 18);
    for (let i = 0; i < n; i++) {
      if (k % 2 && sp.length && m.chance(0.25)) entries.push({ kind: 'special', key: m.pick(sp).name });
      else entries.push({ kind: 'hist', key: m.pick(pool).name });
    }
    const o = { course: c.name, surface, dist: m.chance(0.2) ? 1750 : m.pick(ds), ground: m.pick(['良', '稍重', '重', '不良', 'x']), weather: m.pick(['晴', '雨', '?']), entries, ride: k % 3 === 0 ? 0 : -1, seed: m.int(1, 2147483646), n: k };
    const card = FR.build(o, null);
    const res = FR.run(card);
    out.push({ o, race: card.race, card: card.runners.map(x => [x.horse.name, x.jockey.name, x.jockey.skill, x.num, x.frame, x.weight, x.odds, x.pop, x.rider]), seed: card.seed,
      results: res.results.map(x => [x.horse.name, hex(x.time)]), events: res.events.map(e => [hex(e.t), e.text]) });
  }
  return out;
}

function build() {
  const races = raceList();
  return {
    'free.json': JSON.stringify(freeCases()) + '\n',
    'races.json': JSON.stringify({ note: 'tools/golden_race.js が作る。手で直さない', cases: races.map(runCase) }, null, 0).replace(/\},\{"name"/g, '},\n{"name"') + '\n',
    'math.json': JSON.stringify(mathCases()) + '\n',
  };
}

if (require.main === module) {
  const files = build();
  if (process.argv.includes('--check')) {
    const bad = Object.keys(files).filter(f => !fs.existsSync(path.join(OUT, f)) || fs.readFileSync(path.join(OUT, f), 'utf8') !== files[f]);
    if (bad.length) { console.error('godot/tests/golden が古い：' + bad.join(' ') + '（node tools/golden_race.js で作り直す）'); process.exit(1); }
    console.log('godot/tests/golden は最新');
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), s);
    const c = JSON.parse(files['races.json']).cases;
    console.log(`godot/tests/golden：レース ${c.length} 本（${(files['races.json'].length / 1e6).toFixed(1)}MB）`);
    for (const x of c) console.log(' ', x.name, '勝ち', x.winnerTime, '操作', x.actions.length, x.bumps ? 'ぶつかる ' + x.bumps : '');
  }
}
module.exports = { build };
