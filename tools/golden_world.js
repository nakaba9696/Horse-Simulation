// Godot 版の世界の進行が JS 版と同じになるかを確かめる「答え」を作る（godot/tests/golden/world.json。生成物。手で直さない）。
//   node tools/golden_world.js          # 書き出す
//   node tools/golden_world.js --check  # 書き出し済みのものが今の JS と同じか
// 決まった遊び方（店で安い馬を買う・馬主の依頼を受ける・GF に出る・自分の馬の1レースを決まった乗り方で乗る）で週を進め、
// 毎週のセーブ（G）の指紋を書く。指紋は、辞書の項目を名前の順に並べ、null の項目を除き、-0 を 0 にした並べ方（JSON に書いて読み直したのと同じ）。
//   new：新しいゲームから WEEKS_NEW 週
//   late：JS で LATE_SKIP 週遊んだセーブ（JS のセーブそのもの）を Godot が読み、そこから WEEKS_LATE 週（12月の GF と年明けをまたぐ）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'godot', 'tests', 'golden');
const WEEKS_NEW = 4, LATE_SKIP = 46, WEEKS_LATE = 4;

const b8 = Buffer.alloc(8);
function canon(v, out) {
  if (v === null || v === undefined) out.push('n;');
  else if (typeof v === 'boolean') out.push(v ? 't;' : 'f;');
  else if (typeof v === 'number') { b8.writeDoubleBE(v === 0 ? 0 : v); out.push('d' + b8.toString('hex') + ';'); }
  else if (typeof v === 'string') out.push('s' + Buffer.byteLength(v, 'utf8') + ':' + v);
  else if (Array.isArray(v)) { out.push('['); for (const x of v) canon(x, out); out.push(']'); }
  else { out.push('{'); for (const k of Object.keys(v).sort()) { if (v[k] == null || typeof v[k] === 'function') continue; out.push('k' + Buffer.byteLength(k, 'utf8') + ':' + k); canon(v[k], out); } out.push('}'); }
  return out;
}
const digest = v => crypto.createHash('sha256').update(canon(v, []).join(''), 'utf8').digest('hex').slice(0, 16);

function play(HS, weeks, log) {
  const { World: W, Jockey: J, Owners: O, Season: T, Sim: S } = HS;
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const G = W.get(), step = {};
    // 1. 店：お手馬が3頭より少なければ、買えるいちばん安い馬を
    if (W.mine().length < 3) {
      const items = W.marketHistoric().slice().sort((a, b) => a.price - b.price);
      const it = items.find(x => x.price <= G.player.money);
      if (it) { step.buy = it.horse.name; step.buyErr = W.buy(it); }
    }
    // 出走表（レース・出走馬・騎手・人気）の指紋。ずれたときに、どの段でずれたかを見る
    const cs = W.cards();
    step.cards = digest(cs.map(c => [c.race.key, c.runners.map(x => [x.horse.name, x.jockey && x.jockey.name, x.odds, x.num])]));
    step.cardKeys = cs.map(c => c.race.key + ':' + c.runners.length);
    // 2. 馬主の依頼：最初のものを受ける
    const offers = O.offers();
    step.offers = offers.map(o => o.raceKey + '/' + o.horse);
    if (offers.length) step.accept = O.accept(offers[0].raceKey, offers[0].horseId);
    // 3. GF：返事を待っている GF に、出られる最初の馬で出る（いなければ出ない）
    for (const cat of T.dcPendingList()) { const e = T.dcEligible(cat); step['gf:' + cat] = e.length ? T.dcChoose(cat, e[0].h.id) : T.dcDecline(cat); }
    // 4. 自分の馬の最初の1レースを、決まった乗り方で乗る（ほかはおまかせ）
    const played = {};
    const rides = J.myRides();
    step.rides = rides.map(x => x.card.race.key);
    if (rides.length) {
      const card = rides[0].card;
      const sim = W.startSim(card, { ride: true });
      let next = 0;
      for (;;) {
        const s = sim.st[sim.me], R = sim.D - s.x;
        if (!sim.ctl.started) S.ctl.up(sim);
        else {
          if (R < sim.straight + 350 && sim.ctl.gear < 1 && sim.t >= next) { S.ctl.up(sim); next = sim.t + 0.2; }
          if (R < 250 && sim.t >= next + 0.3) { S.ctl.whip(sim, 'R'); next = sim.t + 0.3; }
          if (sim.ctl.blockedNow && sim.ctl.lane < 4) S.ctl.lane(sim, 1);
        }
        if (S.step(sim)) break;
      }
      played[card.race.key] = S.finish(sim);
      step.ride = played[card.race.key].results.map(x => x.horse.name).slice(0, 3);
    }
    const rep = W.finishWeek(played);
    step.races = rep.races.length;
    step.date = rep.date;
    step.g = digest(JSON.parse(W.serialize()));
    out.push(step);
    if (log) console.log(' ', step.date, 'レース', step.races, '買う', step.buy || '-', '依頼', (step.offers || []).length, '乗る', (step.rides || []).length, step.g);
  }
  return out;
}

function build(log) {
  const { load } = require('../tests/load.js');
  // new
  let HS = load();
  HS.World.newGame({ seed: 11, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const newStart = digest(JSON.parse(HS.World.serialize()));
  const newWeeks = play(HS, WEEKS_NEW, log);
  // late
  HS = load();
  HS.World.newGame({ seed: 23, mode: 'jockey', jockeyName: 'テスト騎手', region: '栗東' });
  play(HS, LATE_SKIP, false);
  const save = HS.World.serialize();
  // セーブを読み直してから続ける（遊んでいる間の使い回し（馬主の own など）を、Godot がセーブを読んだときと同じ空の状態にする）
  HS = load();
  HS.World.load(save);
  const lateStart = digest(JSON.parse(HS.World.serialize()));
  const lateWeeks = play(HS, WEEKS_LATE, log);
  return {
    'world.json': JSON.stringify({ note: 'tools/golden_world.js が作る。手で直さない', new: { seed: 11, start: newStart, weeks: newWeeks }, late: { start: lateStart, weeks: lateWeeks } }) + '\n',
    'world_save.json': save + '\n',
  };
}

if (require.main === module) {
  const files = build(!process.argv.includes('--check'));
  if (process.argv.includes('--check')) {
    const bad = Object.keys(files).filter(f => !fs.existsSync(path.join(OUT, f)) || fs.readFileSync(path.join(OUT, f), 'utf8') !== files[f]);
    if (bad.length) { console.error('godot/tests/golden が古い：' + bad.join(' ') + '（node tools/golden_world.js で作り直す）'); process.exit(1); }
    console.log('godot/tests/golden/world は最新');
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), s);
    console.log(`godot/tests/golden/world.json（セーブ ${(files['world_save.json'].length / 1e6).toFixed(1)}MB）`);
  }
}
module.exports = { build, digest };
