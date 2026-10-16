// 特殊能力の効き目を測る（docs/SKILLS.md の表の数）。
// 東京・芝2000・14頭（全頭 level 82 の頭数合わせの馬）を N 回走らせ、1頭目にだけ1つ持たせて、持たない場合と比べる。
// 使い方：node tools/skills_bench.js [trig|passive|count|style|all] [N]
const { load } = require('../tests/load.js');
const HS = globalThis.HS && globalThis.HS.Sim ? globalThis.HS : load();
const U = HS.U, H = HS.Horse, S = HS.Sim, K = HS.Skills, D = HS.DATA;
const what = process.argv[2] || 'all';
const N = +process.argv[3] || 400;
const pct = x => Math.round(x * 100);

// 1頭目を mod で変え、trig（発動する特殊能力）を1つだけ持たせて走らせる。ほかの馬は発動の能力を持たない
function bench(o) {
  const rng = new U.RNG(o.seed || 31);
  const course = o.course || '東京', dist = o.dist || 2000, surface = o.surface || '芝';
  let pos = 0, win = 0, fired = 0, top3 = 0;
  const setup0 = K.setup;
  K.setup = sim => { setup0(sim); sim.st.forEach(s => { s.trig = []; }); if (o.trig) sim.st[0].trig = [o.trig]; };
  try {
    for (let k = 0; k < (o.N || N); k++) {
      const field = [];
      for (let i = 0; i < 14; i++) {
        const h = H.makeFiller(rng, { level: 82, surface, dist, born: 2000 }); h.name = 'h' + i;
        if (i === 0) { if (o.style) h.style = o.style; h.skills = o.skills || []; if (o.mod) o.mod(h); }
        field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 });
      }
      const wIdx = H.weekIndex(2004, o.month || 5, 1);
      if (o.gap != null) field[0].horse.lastRaceW = wIdx - o.gap;
      const race = Object.assign({ dist, surface, course, ground: '良', year: 2004, month: o.month || 5, grade: o.grade, region: o.region }, o.race || {});
      const sim = S.create(race, field, wIdx, rng, {});
      while (!S.step(sim)) { /* 進める */ }
      const res = S.finish(sim).results;
      const q = res.findIndex(r => r.horse.name === 'h0') + 1;
      pos += q; if (q === 1) win++; if (q <= 3) top3++;
      if (o.trig && sim.skillFx.some(f => f.i === 0 && f.id === o.trig)) fired++;
      else if (!o.trig && o.skills && o.skills.length && sim.skillFx.some(f => f.i === 0 && f.id === o.skills[0])) fired++;
    }
  } finally { K.setup = setup0; }
  const n = o.N || N;
  return { win: win / n, pos: pos / n, top3: top3 / n, fired: fired / n };
}

// 発動する特殊能力：その能力を持てる脚質で比べる
const TRIG_STYLE = {
  saikoubi: '追込', chokusen: '差し', oosoto: '差し', bagun: '差し', sasari: '先行', kongomi: '追込', sessenB: '先行',
  isshun: '差し', hanno: '差し', startdash: '逃げ', nebari: '逃げ', tanki: '逃げ', yonkaku: '先行', oriai: '先行',
  demuchi: '逃げ', nimai: '逃げ', makuri: '差し', dokonjo: '先行', sessen: '先行',
};
function trigTable() {
  const base = {};
  const rows = [];
  for (const k of K.LIST) {
    const style = TRIG_STYLE[k.id] || '先行';
    if (!base[style]) base[style] = bench({ style });
    const b = base[style], r = bench({ style, trig: k.id });
    rows.push({ id: k.id, label: k.label, style, b, r });
    console.log(`${k.label.padEnd(8, '　')} ${style} 勝率 ${pct(b.win)}→${pct(r.win)}%  平均着順 ${b.pos.toFixed(2)}→${r.pos.toFixed(2)}  発動 ${pct(r.fired)}%`);
  }
  return rows;
}

// 持っている特性：効く場面で比べる
const PASSIVE = {
  big: { grade: 'G1' }, fresh: { gap: 12 }, tataki: { gap: 4 }, left: {}, right: { course: '中山' }, small: { course: '中山' }, long: {},
  summer: { month: 7 }, winter: { month: 12 }, hipace: {}, slowpace: {}, oonige: { style: '逃げ' }, longspurt: {}, narabu: {}, nino: { style: '逃げ' },
  inner: {}, travel: { region: '海外' }, homebody: { region: '海外' }, deokure: {}, kakari: {}, sora: {},
  jiyu: {}, sunaB: { surface: 'ダ', dist: 1800 }, leftB: {}, rightB: { course: '中山' },
};
function passiveTable() {
  const rows = [];
  for (const id of H.SKILL_IDS) {
    const o = Object.assign({}, PASSIVE[id] || {});
    const b = bench(o), r = bench(Object.assign({}, o, { skills: [id] }));
    rows.push({ id, b, r, o });
    console.log(`${H.SKILLS[id].label.padEnd(9, '　')} ${JSON.stringify(o)} 勝率 ${pct(b.win)}→${pct(r.win)}%  平均着順 ${b.pos.toFixed(2)}→${r.pos.toFixed(2)}  発動 ${pct(r.fired)}%`);
  }
  return rows;
}

// 史実馬のうち、それぞれの能力を持つ数
function countTable() {
  const cnt = {}; let n = 0;
  D.historic.forEach((d, i) => {
    const h = H.fromHistoric(d, 'c' + i); n++;
    for (const id of K.of(h)) cnt[id] = (cnt[id] || 0) + 1;
    for (const id of h.skills || []) cnt[id] = (cnt[id] || 0) + 1;
  });
  console.log(`史実馬 ${n}頭`);
  for (const k of K.LIST) console.log(`${k.label.padEnd(8, '　')} ${String(cnt[k.id] || 0).padStart(5)}頭 ${(100 * (cnt[k.id] || 0) / n).toFixed(1)}%`);
  for (const id of H.SKILL_IDS) console.log(`${H.SKILLS[id].label.padEnd(9, '　')} ${String(cnt[id] || 0).padStart(5)}頭 ${(100 * (cnt[id] || 0) / n).toFixed(1)}%`);
  return { cnt, n };
}

// 脚質の釣り合い：頭数合わせの馬（能力を持たない）を脚質だけ変えて、コースごと・ペースごとに平均着順
function styleTable() {
  const places = [['東京', 2000], ['中山', 1200], ['中山', 2000], ['阪神', 1600], ['京都', 3000], ['東京', 1600, 'ダ']];
  for (const [course, dist, surface] of places) {
    const line = H.STYLES.map(st => { const r = bench({ course, dist, surface, style: st, N: Math.min(N, 300) }); return `${st} ${r.pos.toFixed(1)}(${pct(r.win)}%)`; });
    console.log(`${course}${surface || '芝'}${dist}: ${line.join('  ')}`);
  }
  // ペースごと（東京芝2000）：全頭の脚質と着順を、レースの paceF で分けて数える
  const bins = { 'スロー': {}, '平均': {}, 'ハイ': {} };
  const rng = new U.RNG(77);
  for (let k = 0; k < N; k++) {
    const field = [];
    for (let i = 0; i < 14; i++) { const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 2000, born: 2000 }); field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
    const sim = S.create({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), rng, {});
    while (!S.step(sim)) { /* 進める */ }
    const v = S.paceVerdict(sim.paceF).replace('ペース', '');
    S.finish(sim).results.forEach(r => { const b = bins[v][r.horse.style] = bins[v][r.horse.style] || { n: 0, pos: 0 }; b.n++; b.pos += r.pos; });
  }
  for (const [v, b] of Object.entries(bins)) console.log(`${v}: ` + H.STYLES.map(st => b[st] ? `${st} ${(b[st].pos / b[st].n).toFixed(2)}` : `${st} -`).join('  '));
}

if (require.main === module) {
  if (what === 'trig' || what === 'all') trigTable();
  if (what === 'passive' || what === 'all') passiveTable();
  if (what === 'count' || what === 'all') countTable();
  if (what === 'style' || what === 'all') styleTable();
}
module.exports = { bench, trigTable, passiveTable, countTable, styleTable };
