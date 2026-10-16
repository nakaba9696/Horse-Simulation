// レースの記録を書き出す（Godot 版の見た目で再生する。模擬が GDScript に移るまでの入れ口）
//   node tools/export_race.js [出力先]   既定は godot/assets/replay_race.json
// いまの模擬（js/core/racesim.js）で、東京 芝2400m の G1 を史実馬16頭で1回走らせ、
// 0.1秒ごとの各馬の位置（x＝スタートからの距離・lane＝進路・v＝速さ・頭の上げ具合・耳の向き）と、コースの形（data/layouts.js の実際の回りと高さ）・毛色・白徴・勝負服・ゼッケンを JSON にする。
// 自分の馬（1頭目）は騎乗の操作つき（tests/ridebot.js の噛み合った乗り方）で走らせ、手綱の段・気分・脚の残り・ムチを記録する（騎乗の計器の見本）。
// 乱数の種は固定（同じ記録が毎回出る）。ブラウザ版の見比べ（godot/tools/shot_web.js）も同じ JSON を読む。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, ROOT } = require('../tests/load.js');

const HS = load();
// 勝負服と毛色の色は画面の側（js/ui）にあるので、DOM を使わない2つだけ読む
for (const f of ['js/ui/art.js', 'js/ui/raceview.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
const { U, H, Sim, Track, Art, RaceView } = { U: HS.U, H: HS.Horse, Sim: HS.Sim, Track: HS.Track, Art: HS.Art, RaceView: HS.RaceView };

const OUT = process.argv[2] || path.join(ROOT, 'godot', 'assets', 'replay_race.json');
const bot = require('../tests/ridebot.js')(HS).make('fit');
const SEED = 20251130;
const YEAR = 2025;
const race = { name: 'ジャパンカップ', short: 'ジャパンC', grade: 'G1', course: '東京', surface: '芝', dist: 2400, ground: '良', year: YEAR, month: 11, week: 4 };
// 自分の馬（騎乗のカメラで追う）は1頭目
const FIELD = ['ディープインパクト', 'オルフェーヴル', 'キタサンブラック', 'ジェンティルドンナ', 'ウオッカ', 'ブエナビスタ', 'エルコンドルパサー', 'スペシャルウィーク',
  'テイエムオペラオー', 'ゴールドシップ', 'アーモンドアイ', 'イクイノックス', 'コントレイル', 'シンボリクリスエス', 'ゼンノロブロイ', 'エピファネイア'];

// js/ui/horse_rigged.js と同じ hash（白い靴下の長さ）
function hash01(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function strHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

const rng = new U.RNG(SEED);
const wIdx = H.weekIndex(YEAR, race.month, race.week);
// 枠順は種つきの乱数で決める
const order = FIELD.map((n, i) => [rng.next(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const usedJ = new Set();
const runners = order.map((fi, k) => {
  const d = HS.DATA.historic.find(h => h.name === FIELD[fi]);
  if (!d) throw new Error('史実馬が無い: ' + FIELD[fi]);
  const horse = H.fromHistoric(d, 'x' + fi);
  horse.born = YEAR - 4; // 4歳（伸びきった年）で走らせる。データの生年は書き換えず、この記録の中だけ
  const hj = (HS.DATA.historicJockeys || {})[d.name];
  let jn = typeof hj === 'string' ? hj : hj ? hj.default : null;
  if (!jn || usedJ.has(jn)) jn = null;
  if (jn) usedJ.add(jn);
  const num = k + 1;
  const frame = Math.min(8, Math.ceil(num / 2)); // 16頭は各枠2頭
  return { horse, jockey: { name: jn || '—', skill: 80 }, weight: horse.sex === '牝' ? 56 : 58, num, frame, rider: fi === 0 ? 'P' : undefined, mine: fi === 0 };
});

const sim = Sim.create(race, runners, wIdx, rng, { frames: true, ride: true });
const DT = 0.1;
// 1コマ：各馬 [x, lane, v, 頭の上げ具合, 耳]。me＝自分の馬の [手綱の段, 気分（tension）, 脚の残り, ムチの手（1＝右）, 掛かり, 詰まり]
const rowOf = s => [+s.x.toFixed(2), +s.lane.toFixed(3), +s.v.toFixed(2), s.headUp || 0, s.ears != null ? s.ears : 0.4];
const meRow = () => { const c = sim.ctl, s = sim.st[sim.me]; return [+c.gear.toFixed(2), +c.tension.toFixed(1), +s.E.toFixed(3), c.hand === 'R' ? 1 : 0, c.kakariNow ? 1 : 0, c.blockedNow ? 1 : 0]; };
const frames = [{ t: 0, p: sim.st.map(s => [0, +s.lane.toFixed(2), 0, s.headUp || 0, 0.4]), me: meRow() }];
const whips = []; // 自分の馬のムチ [t, 手（1＝右）]
let nWhip = 0;
while (true) {
  bot(sim);
  if (sim.ctl.whips > nWhip) { nWhip = sim.ctl.whips; whips.push([+sim.t.toFixed(1), sim.ctl.lastWhip && sim.ctl.lastWhip.side === 'R' ? 1 : 0]); }
  const over = Sim.step(sim);
  frames.push({ t: +sim.t.toFixed(1), p: sim.st.map(rowOf), me: meRow() });
  if (over) break;
}
const res = Sim.finish(sim);
// ゴールのあとも数秒走らせた記録（流して止まる）を足す：ゴールした馬は少しずつ落とし、まだの馬はその速さでゴールまで走ってから落とす
const last = frames[frames.length - 1];
let p = last.p.map(a => a.slice());
for (let k = 1; k <= 120; k++) {
  p = p.map(a => { const v = a[0] < sim.D ? a[2] : Math.max(0, a[2] - 0.16); return [+(a[0] + v * DT).toFixed(2), a[1], +v.toFixed(2), 0.2, 0.5]; });
  frames.push({ t: +(last.t + k * DT).toFixed(1), p, me: last.me });
}

const course = HS.DATA.courses[race.course];
const geo = course.turf;
const cf = Track.forRace(race);
const tr = cf.track;
// コースの形を 1m ごとに：[x, y, 曲がり, コーナー, 高さ]（ゴールからさかのぼった距離 s で。js/core/track.js の at・hAt）
const STEP = 1;
const pts = [];
for (let s = 0; s <= tr.L + 1e-6; s += STEP) { const a = tr.at(s); pts.push(+a.x.toFixed(3), +a.y.toFixed(3), +a.curv.toFixed(5), a.corner, +(tr.hAt ? tr.hAt(s) : 0).toFixed(3)); }
const FC = HS.DATA.frameColors, FT = HS.DATA.frameText;
const out = {
  about: 'ターフの系譜：レースの記録（tools/export_race.js で作る。手で直さない）',
  seed: SEED,
  race: { name: race.name, short: race.short, grade: race.grade, course: race.course, surface: race.surface, dist: race.dist, ground: race.ground, num: 11, weather: '晴', dir: course.dir },
  // コースの形（js/core/track.js の T.make と同じ値。Godot 側は同じ式で位置を出す）
  track: { lap: tr.L, a: tr.a, r: tr.r, straight: tr.straight, sign: tr.sign, dir: course.dir, slope: geo.slope, D: sim.D, line: !!tr.line, step: STEP, pts, layout: cf.layout ? cf.layout.id || '' : null },
  dt: DT,
  me: runners.findIndex(r => r.mine),
  horses: runners.map(r => {
    const L = Art.coatLook(r.horse.coat, 4), mk = Art.marks(r.horse.name);
    // 白い靴下の高さ（m。js/ui/horse_rigged.js と同じ決め方）
    const sockLen = k => [0.16, 0.24, 0.34, 0.46][Math.floor(hash01(strHash(r.horse.name + k), 5) * 4)];
    return {
      num: r.num, frame: r.frame, name: r.horse.name, coat: r.horse.coat, sex: r.horse.sex, age: 4, style: r.horse.style, weight: r.weight, mine: !!r.mine,
      coatLook: { body: L.body, top: L.top, belly: L.belly, mane: L.mane, tail: L.tail, points: L.points, muzzle: L.muzzle, hoof: L.hoof, gloss: L.gloss, dapple: L.dapple || 0, dappleCol: L.dappleCol || null, pointsSoft: !!L.pointsSoft },
      marks: { blaze: mk.blaze, socks: mk.socks.map((on, k) => on ? sockLen(k) : 0) },
      silks: RaceView.silksOf(r.horse), cap: FC[(r.frame - 1) % 8], capText: FT[(r.frame - 1) % 8],
    };
  }),
  whips,
  results: res.results.map(r => ({ pos: r.pos, num: r.num, name: r.horse.name, time: +r.time.toFixed(2), margin: r.margin })),
  winnerTime: +res.winnerTime.toFixed(2),
  events: res.events.map(e => ({ t: +e.t.toFixed(1), text: e.text, kind: e.kind })),
  frames,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const w = out.results[0];
console.log(`${OUT}：${out.horses.length}頭・${frames.length}コマ（${DT}秒ごと）・勝ち ${w.name} ${U.time(w.time)}・${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
