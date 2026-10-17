// JS 版の模擬と1週の速さを測る（Godot 版と比べるため。docs/GODOT.md の速さの表）。テストではない
//   node tools/bench_js.js
const fs = require('fs');
const path = require('path');
const { load } = require('../tests/load.js');
const HS = load();
const { Sim: S, U, World: W } = HS;
const g = JSON.parse(fs.readFileSync(path.join(__dirname, '../godot/tests/golden/races.json'), 'utf8'));
// レース：答えのレースと同じ条件で（出走馬は史実馬と頭数合わせの馬から作り直す。golden_race.js の作り方）
const H = HS.Horse;
let steps = 0, races = 0, tStep = 0n, tCreate = 0n;
for (const cs of g.cases) {
  const runners = cs.card.map(x => {
    const sp = x.spec;
    let h;
    if (sp.kind === 'filler') h = H.makeFiller(new U.RNG(sp.seed), sp.opts);
    else { const src = HS.DATA[sp.kind === 'legend' ? 'legendsExtra' : 'historic'].find(d => d.name === sp.name); h = H.fromHistoric(sp.d ? Object.assign({}, src, sp.d) : src, x.id); }
    if (sp.set) Object.assign(h, JSON.parse(JSON.stringify(sp.set)));
    return { horse: h, jockey: x.jockey, rider: null, num: x.num, frame: x.frame, weight: x.weight };
  });
  const a = process.hrtime.bigint();
  const sim = S.create(cs.race, runners, cs.wIdx, new U.RNG(cs.seed), {});
  const b = process.hrtime.bigint();
  while (!S.step(sim)) {}
  tCreate += b - a; tStep += process.hrtime.bigint() - b;
  steps += sim.step; races++;
}
console.log(`JS race: create ${(Number(tCreate) / 1e6 / races).toFixed(2)} ms/race・step ${(Number(tStep) / 1e3 / steps).toFixed(2)} us/step（${(Number(tStep) / 1e6 / races).toFixed(1)} ms/race）`);
// 1週：Godot の bench_week.gd と同じセーブから
W.load(fs.readFileSync(path.join(__dirname, '../godot/tests/golden/world_save.json'), 'utf8'));
for (let i = 0; i < 3; i++) {
  W._week = null;
  const a = process.hrtime.bigint();
  W.prepareWeek();
  const b = process.hrtime.bigint();
  W.cards();
  W.finishWeek({});
  const c = process.hrtime.bigint();
  console.log(`JS week ${i}: prepare ${(Number(b - a) / 1e9).toFixed(2)}s  finish(レースを含む) ${(Number(c - b) / 1e9).toFixed(2)}s  計 ${(Number(c - a) / 1e9).toFixed(2)}s`);
}
