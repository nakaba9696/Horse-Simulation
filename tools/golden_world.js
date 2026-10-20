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

// 週の初めに行う操作（ops）：['reserve', 馬の id, レース名]・['retire', 馬の id]・['make', 父の id, 母の id, 名前]・
//   ['win', 馬の id, 短い名, レース名, 格]（その年の重賞の勝ちを足して、冠とトロフィーを見る）・['pts', 馬主の id, 好感度]（好感度）・['meet', 馬主の id]（縁を作る）・['adv', 馬主の id]（課題をやり終えたことにする）・['ask', 馬主の id]（店に頼む）・
//   ['program', 馬の id]（番組表の行の指紋）・['rsvp', 馬の id]（番組表で出られる最初の条件戦を予約）・
//   ['away', 馬の id, 国]（その馬が先週その国で走ったことにする）・['fat', 馬の id]（疲労の段階・回復・今週のレースへの移動の疲れと出られるか・決まった着順の並びでたまる量の指紋。js/core/fatigue.js）
function runOps(HS, ops) {
  const { World: W, Jockey: J, Season: T, Original: Ori } = HS;
  return (ops || []).map(op => {
    if (op[0] === 'reserve') { const r = W.upcomingGraded(52).find(x => x.name === op[2]); return r ? T.reserve(op[1], r) : 'no race'; }
    if (op[0] === 'retire') { const r = J.retire(op[1]); return r.err || r.to; }
    if (op[0] === 'win') { const h = W.horse(op[1]), G = W.get(); const race = { name: op[3], short: op[2], grade: op[4], region: 'JRA', year: G.year }; h.gradedWins.push({ y: G.year, race: race.name, short: race.short, grade: race.grade, region: race.region }); return T.onWin(h, race, G.year).join(','); }
    if (op[0] === 'pts') return HS.Owners.addPts(op[1], op[2]);
    if (op[0] === 'meet') return HS.Owners.meet(op[1], { horse: 'テストホース', race: 'テストのレース' });
    if (op[0] === 'adv') return HS.Owners.advance(op[1], { horse: 'テストホース', race: 'テストのレース' });   // 馬主の課題をやり終えたことにする
    if (op[0] === 'ask') return HS.Owners.ask(op[1]) || 'ok';   // 来月の店に馬を頼む
    // 番組表（js/core/program.js）：行の指紋と、出られる最初の条件戦を予約する
    if (op[0] === 'program') return digest(HS.Program.rows(W.horse(op[1]), { show: 'all' }).map(r => [r.wk.i, r.race.key, r.why || '', r.fit, r.state || '', r.can || '', r.busy, r.others.join(',')]));
    if (op[0] === 'rsvp') { const r = HS.Program.rows(W.horse(op[1])).find(x => x.can === 'reserve' && !x.race.graded); return r ? r.race.key + ':' + (HS.Program.reserve(op[1], r.race.key) || 'ok') : 'no race'; }
    if (op[0] === 'away') { const h = W.horse(op[1]); h.at = op[2]; h.lastRaceW = W.wIdx() - 1; W.dirty(); return HS.Fatigue.where(h); }
    if (op[0] === 'fat') {
      const F = HS.Fatigue, h = W.horse(op[1]);
      const res = [{ lengths: 0, endE: 0.3 }, { lengths: 0.2, endE: 0.05 }, { lengths: 1.5, endE: -0.1 }, { lengths: 3, endE: 0.12 }];
      const rs = W.weekRaces();
      return digest([F.stage(h), F.recover(h), h.fatigue || 0, F.where(h) || '', rs.map(r => [r.key, F.countryOf(r), F.travel(h, r), F.travelWhy(h, r) || '', res.map((x, k) => F.gain(r, res, k))])]);
    }
    if (op[0] === 'make') { const r = Ori.make(op[1], op[2], op[3]); return r.err || (r.horse.name + ':' + r.skills.join(',')); }
    return 'unknown';
  });
}
function play(HS, weeks, log, opsByWeek) {
  const { World: W, Jockey: J, Owners: O, Season: T, Sim: S } = HS;
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const G = W.get(), step = {};
    if (opsByWeek && opsByWeek[i]) { step.ops = opsByWeek[i]; step.opsRet = runOps(HS, opsByWeek[i]); }
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
  // はじめは依頼が来ないので、2週目に2人と縁を作る（依頼を受ける道を通す）
  const newWeeks = play(HS, WEEKS_NEW, log, { 1: [['meet', 'sengoku'], ['meet', 'makino']] });
  // late
  HS = load();
  HS.World.newGame({ seed: 23, mode: 'jockey', jockeyName: 'テスト騎手', region: '栗東' });
  play(HS, LATE_SKIP - 3, false);
  // gf：11月4週のセーブに手を加え（1頭を4歳・前の年の GF（中長距離）の勝ち馬に）、12月1週の招待から年明けまで。
  //   前の年の勝ち馬は確定で招待され、出ると「伝説級の名馬」が出てくる
  let gfSave, gfStart, gfWeeks;
  {
    const HS2 = load(); HS2.World.load(HS.World.serialize());
    const W = HS2.World, G = W.get(), T = HS2.Season;
    const p1 = W.mine().filter(h => h.loc === 'stable' || h.loc === 'farm')[0];
    Object.assign(p1, { born: G.year - 4, loc: 'stable', fatigue: 0, wins: 6, starts: 10, distMin: 1800, distMax: 2800, apt: { turf: 100, dirt: 60, heavy: 70 } });
    for (const k of Object.keys(p1.pot)) p1.pot[k] = 112;
    p1.gradedWins = [{ y: G.year - 1, race: T.gfName('classic'), short: T.gfName('classic'), grade: 'GF', region: 'JRA' }];
    W.dirty(); W._week = null;
    gfSave = W.serialize();
    const HS3 = load(); HS3.World.load(gfSave);
    gfStart = digest(JSON.parse(HS3.World.serialize()));
    gfWeeks = play(HS3, 7, log);
  }
  play(HS, 3, false);
  const save = HS.World.serialize();
  // セーブを読み直してから続ける（遊んでいる間の使い回し（馬主の own など）を、Godot がセーブを読んだときと同じ空の状態にする）
  HS = load();
  HS.World.load(save);
  const lateStart = digest(JSON.parse(HS.World.serialize()));
  const lateWeeks = play(HS, WEEKS_LATE, log);
  // craft：いまの状態に手を加えて、ふだんの遊び方では起きにくい所を通す（JS で手を加えたセーブを Godot が読む）
  //   1頭目を5歳・能力120・G1を4勝・トロフィー2つにして、フェブラリーSを予約（G1を5勝した名馬・歴代のフェブラリーS馬のスペシャルホースが出る）。
  //   そのあと引退させて殿堂入り、もう1頭（牝馬にする）も引退させ、オリジナルホースを作る
  {
    const W = HS.World, G = W.get();
    const mine = W.mine().filter(h => h.loc === 'stable' || h.loc === 'farm');
    const p1 = mine[0], p2 = mine[1];
    Object.assign(p1, { born: G.year - 5, loc: 'stable', fatigue: 0, cond: 30, wins: 8, starts: 9, apt: { turf: 100, dirt: 100, heavy: 80 } });
    for (const k of Object.keys(p1.pot)) p1.pot[k] = 120;
    p1.gradedWins = [['皐月賞', '皐月賞'], ['東京優駿', '日本ダービー'], ['天皇賞（秋）', '天皇賞・秋'], ['有馬記念', '有馬記念']].map(([race, short]) => ({ y: G.year - 1, race, short, grade: 'G1', region: 'JRA' }));
    G.trophies = Object.assign(G.trophies || {}, { grandprix: { y: G.year - 1, horse: p1.name, hid: p1.id, bonus: 0 }, tenno: { y: G.year - 1, horse: p1.name, hid: p1.id, bonus: 0 } });
    Object.assign(p2, { sex: p1.sex === '牝' ? '牡' : '牝', gelding: false });
    if (p1.sex !== '牝' && p1.gelding) p1.gelding = false;
    W.dirty(); W._week = null;
    var craftSave = W.serialize();
    HS = load(); HS.World.load(craftSave);
    var ops = { 0: [['reserve', p1.id, 'フェブラリーステークス']], 1: [['win', p2.id, '皐月賞', '皐月賞', 'G1'], ['win', p2.id, '日本ダービー', '東京優駿', 'G1'], ['win', p2.id, '菊花賞', '菊花賞', 'G1'], ['meet', 'takenouchi'], ['meet', 'yuni'], ['pts', 'takenouchi', 30], ['adv', 'takenouchi'], ['ask', 'takenouchi'], ['adv', 'yuni'], ['adv', 'yuni'], ['adv', 'yuni'], ['adv', 'yuni'], ['adv', 'yuni'], ['pts', 'yuni', 5]], 2: [['win', p2.id, '宝塚記念', '宝塚記念', 'G1'], ['win', p2.id, '有馬記念', '有馬記念', 'G1'], ['away', p2.id, '仏'], ['fat', p2.id], ['fat', p1.id], ['program', p2.id]], 3: [['program', p1.id], ['rsvp', p1.id], ['rsvp', p1.id], ['fat', p2.id]], 4: [['program', p1.id], ['fat', p1.id]], 5: [['retire', p1.id], ['retire', p2.id]], 6: [['make', p1.sex === '牝' ? p2.id : p1.id, p1.sex === '牝' ? p1.id : p2.id, 'テストホース']] };
    var craftStart = digest(JSON.parse(HS.World.serialize()));
    var craftWeeks = play(HS, 8, log, ops);
  }
  return {
    'world.json': JSON.stringify({ note: 'tools/golden_world.js が作る。手で直さない', new: { seed: 11, start: newStart, weeks: newWeeks }, late: { start: lateStart, weeks: lateWeeks }, craft: { start: craftStart, weeks: craftWeeks }, gf: { start: gfStart, weeks: gfWeeks } }) + '\n',
    'world_gf.json': gfSave + '\n',
    'world_save.json': save + '\n',
    'world_craft.json': craftSave + '\n',
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
