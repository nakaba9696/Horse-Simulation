// 馬場の状態（良・稍重・重・不良）の効き目を測る（docs/BALANCE.md「13. 馬場の状態」の表の数）。
// 14頭（頭数合わせの馬・level 82。道悪の適性は 30〜89 のくじ）のうち1頭目（h0）だけ、道悪の適性・脚の切れを決めて、おまかせで N 回走らせる。
// 使い方：node tools/ground_bench.js [time|apt|kire|all] [N]
//   time … 馬場ごとの勝ち時計の平均（東京芝2000・東京芝3400・東京ダ1600）
//   apt  … 道悪の適性（25・45・66・90）ごとの、馬場ごとの勝率・平均着順（東京芝2000・東京ダ1600）
//   apthist … apt と同じ。ほかの馬の道悪の適性を史実馬の散らばりにする
//   kire … 脚の切れ（2・7）と道悪の適性（45・90）ごとの、良と不良の平均着順
const { load } = require('../tests/load.js');
const HS = globalThis.HS && globalThis.HS.Sim ? globalThis.HS : load();
const U = HS.U, H = HS.Horse, S = HS.Sim;
const what = process.argv[2] || 'all';
const N = +process.argv[3] || 200;
const GROUNDS = ['良', '稍重', '重', '不良'];
const pct = x => Math.round(x * 100);

// o: { ground, surface, dist, heavy, kire, N, seed }。h0 の勝率・平均着順・勝ち時計の平均・h0 の最後のスタミナの平均
function bench(o) {
  const rng = new U.RNG(o.seed || 61);
  const n = o.N || N, surface = o.surface || '芝', dist = o.dist || 2000;
  const out = { win: 0, pos: 0, time: 0, endE: 0 };
  for (let k = 0; k < n; k++) {
    const field = [];
    for (let i = 0; i < 14; i++) {
      const h = H.makeFiller(rng, { level: 82, surface, dist, born: 2000 }); h.name = 'h' + i;
      // field＝'hist' のとき、ほかの馬の道悪の適性を史実馬の散らばり（中央 66・おおよそ 46〜85）に寄せる
      if (i > 0 && o.field === 'hist') h.apt.heavy = Math.round(U.clamp(66 + rng.normal(0, 12), 20, 100));
      if (i === 0) { if (o.heavy != null) h.apt.heavy = o.heavy; if (o.kire != null) h.kire = o.kire; if (o.style) h.style = o.style; }
      field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 });
    }
    const race = { dist, surface, course: '東京', ground: o.ground || '良', year: 2004, month: 5 };
    const res = S.run(race, field, H.weekIndex(2004, 5, 1), new U.RNG(rng.int(1, 1e9)), {}).results;
    const q = res.findIndex(r => r.horse.name === 'h0');
    out.pos += q + 1; if (q === 0) out.win++;
    out.time += res[0].time; out.endE += res[q].endE;
  }
  out.win /= n; out.pos /= n; out.time /= n; out.endE /= n;
  return out;
}

function timeTable() {
  const rows = [];
  console.log('馬場ごとの勝ち時計の平均（14頭・level 82・おまかせ）');
  for (const [surface, dist] of [['芝', 2000], ['芝', 3400], ['ダ', 1600]]) {
    const r = {}; for (const g of GROUNDS) r[g] = bench({ surface, dist, ground: g });
    rows.push({ surface, dist, r });
    console.log(`東京${surface}${dist}　` + GROUNDS.map(g => `${g} ${U.time(r[g].time)}`).join('　'));
  }
  return rows;
}

function aptTable(field) {
  const rows = [];
  console.log(`道悪の適性ごとの勝率％／平均着順（h0 だけ適性を変える。ほかは ${field === 'hist' ? '史実馬の散らばり（66±12）' : '30〜89 のくじ（頭数合わせの馬）'}）`);
  for (const [surface, dist] of [['芝', 2000], ['ダ', 1600]]) {
    for (const heavy of [25, 45, 66, 90]) {
      const r = {}; for (const g of GROUNDS) r[g] = bench({ surface, dist, ground: g, heavy, field });
      rows.push({ surface, dist, heavy, field, r });
      console.log(`東京${surface}${dist}・道悪${heavy}`.padEnd(14, '　') + GROUNDS.map(g => `${g} ${String(pct(r[g].win)).padStart(3)}%／${r[g].pos.toFixed(1).padStart(4)}`).join('　'));
    }
  }
  return rows;
}

function kireTable() {
  const rows = [];
  console.log('脚の切れと道悪の適性ごとの平均着順（東京芝2000・差し。ほかの馬の道悪の適性は史実馬の散らばり）');
  for (const heavy of [45, 90]) {
    for (const kire of [2, 7]) {
      const r = {}; for (const g of ['良', '不良']) r[g] = bench({ ground: g, heavy, kire, style: '差し', field: 'hist' });
      rows.push({ heavy, kire, r });
      console.log(`道悪${heavy}・切れ${kire}　良 ${r['良'].pos.toFixed(2)}　不良 ${r['不良'].pos.toFixed(2)}（${(r['不良'].pos - r['良'].pos).toFixed(2)}）`);
    }
  }
  return rows;
}

if (require.main === module) {
  if (what === 'time' || what === 'all') timeTable();
  if (what === 'apt' || what === 'all') aptTable();
  if (what === 'apthist' || what === 'all') aptTable('hist');
  if (what === 'kire' || what === 'all') kireTable();
}
module.exports = { bench, timeTable, aptTable, kireTable, GROUNDS };
