// レースの記録を書き出す（Godot の試作で再生する）
//   node tools/export_race.js [出力先]   既定は godot/data/race.json
// いまの模擬（js/core/racesim.js）で、東京 芝2400m の G1 を史実馬16頭で1回走らせ、
// 0.1秒ごとの各馬の位置（x＝スタートからの距離・lane＝進路・v＝速さ）と、コースの形・毛色・勝負服・ゼッケンを JSON にする。
// 乱数の種は固定（同じ記録が毎回出る）。ブラウザ版の見比べ（godot/tools/shot_web.js）も同じ JSON を読む。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, ROOT } = require('../tests/load.js');

const HS = load();
// 勝負服と毛色の色は画面の側（js/ui）にあるので、DOM を使わない2つだけ読む
for (const f of ['js/ui/art.js', 'js/ui/raceview.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
const { U, H, Sim, Track, Art, RaceView } = { U: HS.U, H: HS.Horse, Sim: HS.Sim, Track: HS.Track, Art: HS.Art, RaceView: HS.RaceView };

const OUT = process.argv[2] || path.join(ROOT, 'godot', 'data', 'race.json');
const SEED = 20251130;
const YEAR = 2025;
const race = { name: 'ジャパンカップ', short: 'ジャパンC', grade: 'G1', course: '東京', surface: '芝', dist: 2400, ground: '良', year: YEAR, month: 11, week: 4 };
// 自分の馬（騎乗のカメラで追う）は1頭目
const FIELD = ['ディープインパクト', 'オルフェーヴル', 'キタサンブラック', 'ジェンティルドンナ', 'ウオッカ', 'ブエナビスタ', 'エルコンドルパサー', 'スペシャルウィーク',
  'テイエムオペラオー', 'ゴールドシップ', 'アーモンドアイ', 'イクイノックス', 'コントレイル', 'シンボリクリスエス', 'ゼンノロブロイ', 'エピファネイア'];

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

const sim = Sim.create(race, runners, wIdx, rng, { frames: true });
const DT = 0.1;
const frames = [{ t: 0, p: sim.st.map(s => [0, +s.lane.toFixed(2), 0]) }];
while (!Sim.step(sim)) frames.push({ t: +sim.t.toFixed(1), p: sim.st.map(s => [+s.x.toFixed(2), +s.lane.toFixed(3), +s.v.toFixed(2)]) });
const res = Sim.finish(sim);
// ゴールのあとも数秒走らせた記録（流して止まる）を足す：最後の速さから少しずつ落とす
const last = frames[frames.length - 1];
let p = last.p.map(a => a.slice());
for (let k = 1; k <= 60; k++) {
  p = p.map(a => { const v = Math.max(0, a[2] - 0.12); return [+(a[0] + v * DT).toFixed(2), a[1], +v.toFixed(2)]; });
  frames.push({ t: +(last.t + k * DT).toFixed(1), p });
}

const course = HS.DATA.courses[race.course];
const geo = course.turf;
const tr = Track.make(geo.lap, geo.straight, course.dir);
const FC = HS.DATA.frameColors, FT = HS.DATA.frameText;
const out = {
  about: 'ターフの系譜：レースの記録（tools/export_race.js で作る。手で直さない）',
  seed: SEED,
  race: { name: race.name, short: race.short, grade: race.grade, course: race.course, surface: race.surface, dist: race.dist, ground: race.ground },
  // コースの形（js/core/track.js の T.make と同じ値。Godot 側は同じ式で位置を出す）
  track: { lap: tr.L, a: tr.a, r: tr.r, straight: tr.straight, sign: tr.sign, dir: course.dir, slope: geo.slope, D: sim.D },
  dt: DT,
  me: runners.findIndex(r => r.mine),
  horses: runners.map(r => {
    const L = Art.coatLook(r.horse.coat, 4);
    return {
      num: r.num, frame: r.frame, name: r.horse.name, coat: r.horse.coat, sex: r.horse.sex, style: r.horse.style, jockey: r.jockey.name, weight: r.weight,
      coatLook: { body: L.body, top: L.top, belly: L.belly, mane: L.mane, tail: L.tail, points: L.points, muzzle: L.muzzle, hoof: L.hoof, gloss: L.gloss, dapple: L.dapple || 0, dappleCol: L.dappleCol || null },
      silks: RaceView.silksOf(r.horse), cap: FC[(r.frame - 1) % 8], capText: FT[(r.frame - 1) % 8],
    };
  }),
  results: res.results.map(r => ({ pos: r.pos, num: r.num, name: r.horse.name, time: +r.time.toFixed(2), margin: r.margin })),
  winnerTime: +res.winnerTime.toFixed(2),
  events: res.events.map(e => ({ t: +e.t.toFixed(1), text: e.text, kind: e.kind })),
  frames,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const w = out.results[0];
console.log(`${OUT}：${out.horses.length}頭・${frames.length}コマ（${DT}秒ごと）・勝ち ${w.name} ${U.time(w.time)}・${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
