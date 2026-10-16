// godot/tools/check_live.gd と同じ回し方を JS で（記録と同じ出走馬・同じ種。合図なしで 0.8 秒に出る）。着順の上位5頭を出す
const fs = require('fs'), path = require('path');
const { load, ROOT } = require('../tests/load.js');
const HS = load(), U = HS.U, H = HS.Horse, Sim = HS.Sim;
const rp = JSON.parse(fs.readFileSync(path.join(ROOT, 'godot', 'assets', 'replay_race.json'), 'utf8'));
const YEAR = 2025, SEED = 20251130;
const race = { name: rp.race.name, short: rp.race.short, grade: rp.race.grade, course: rp.race.course, surface: rp.race.surface, dist: rp.race.dist, ground: rp.race.ground, year: YEAR, month: 11, week: 4 };
const rng = new U.RNG(SEED);
for (let i = 0; i < rp.horses.length; i++) rng.next();
const runners = rp.horses.map((info, i) => {
  const d = HS.DATA.historic.find(h => h.name === info.name);
  const horse = H.fromHistoric(d, 'x' + i); horse.born = YEAR - 4;
  return { horse, jockey: { name: '—', skill: 80 }, weight: info.weight, num: info.num, frame: info.frame, rider: info.mine ? 'P' : undefined, mine: !!info.mine };
});
const sim = Sim.create(race, runners, H.weekIndex(YEAR, 11, 4), rng, { ride: true, frames: true });
let start = null;
while (true) { if (!sim.ctl.started && sim.t > 0.8 - 1e-9) start = Sim.ctl.up(sim); if (Sim.step(sim)) break; }
const res = Sim.finish(sim);
console.log('js:   ' + res.results.slice(0, 5).map(r => `${r.pos} ${r.horse.name} ${r.time.toFixed(2)}`).join(' / ') + '  start=' + start);
