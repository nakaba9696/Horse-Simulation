// 立ち回りの釣り合いを測る（docs/BALANCE.md の表の数）。
// 東京・芝2000・14頭。1頭目（h0）にプレイヤーが乗り、決まった乗り方の打ち手（tests/ridebot.js）で N 回走らせて、勝率・平均着順を出す。
// 乗り方：おまかせ（騎手の腕で自動）・何もしない・ただ追う・噛み合った乗り方・噛み合わない乗り方
// 使い方：node tools/balance_bench.js [field|upset|strong|fight|all] [N]
//   field … 同じ強さの相手（全頭 level 82）。脚質 × 気性（荒い・穏やか）ごと
//   upset … 格上の相手（1頭だけ総合力が4・5上、ほかは3下）。勝率と、格上より先に入る割合
//   strong … 自分の馬だけ総合力が4上。噛み合わないと強い馬でも負けるか
//   fight … 競り合いの気合：根性の高い馬・低い馬の、競り合ったあとの伸び
const { load } = require('../tests/load.js');
const HS = globalThis.HS && globalThis.HS.Sim ? globalThis.HS : load();
const U = HS.U, H = HS.Horse, S = HS.Sim;
const BOT = require('../tests/ridebot.js')(HS);
const what = process.argv[2] || 'all';
const N = +process.argv[3] || 200;
const pct = x => Math.round(x * 100);
// 総合力の1は、能力の重み付きの値でおよそ 0.86（js/core/season.js の折れ線の傾き 25/21.6）
const FH = 21.6 / 25;

// 気性（mind）を変えても強さ（S.power の重み付きの値）が変わらないよう、スピードで埋め合わせる
function setMind(h, m) {
  const d = m - h.pot.mind; h.pot.mind = m;
  h.pot.spd -= d * 0.12 / 0.45; if (h.pot.dspd != null) h.pot.dspd -= d * 0.11 / 0.42;
}
function setGuts(h, g) {
  const d = g - h.pot.guts; h.pot.guts = g;
  h.pot.spd -= d * 0.16 / 0.45; if (h.pot.dspd != null) h.pot.dspd -= d * 0.15 / 0.42;
}

// o: { style, mind, guts, policy, rival（格上の相手の強さの差・総合力）, N, seed, race }
function bench(o) {
  const rng = new U.RNG(o.seed || 41);
  const n = o.N || N;
  const out = { win: 0, pos: 0, beat: 0, rivalWin: 0, kakari: 0, byPace: {} };
  for (let k = 0; k < n; k++) {
    const field = [];
    for (let i = 0; i < 14; i++) {
      // h1＝格上の相手（h0 より rival だけ上）、h2 以下＝ほかの馬（h0 より rest だけ上。負なら下）、h0＝自分の馬（self だけ上）
      const lv = i === 0 ? 82 + (o.self || 0) * FH : i === 1 && o.rival ? 82 + o.rival * FH : 82 + (o.rest || 0) * FH;
      const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 2000, born: 2000 }); h.name = 'h' + i;
      if (lv !== 82) for (const key of ['spd', 'dspd']) if (h.pot[key] != null) h.pot[key] += (lv - 82) / 0.45;
      if (i === 0) { if (o.style) h.style = o.style; if (o.mind != null) setMind(h, o.mind); if (o.guts != null) setGuts(h, o.guts); if (o.mod) o.mod(h); }
      field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1, rider: i === 0 ? 'P' : undefined });
    }
    const race = Object.assign({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004, month: 5 }, o.race || {});
    const ride = o.policy !== 'omakase';
    const sim = S.create(race, field, H.weekIndex(2004, 5, 1), new U.RNG(rng.int(1, 1e9)), { ride });
    const tick = ride ? BOT.make(o.policy) : null;
    while (!S.step(sim)) { if (tick) tick(sim); }
    const res = S.finish(sim).results;
    const q = res.findIndex(r => r.horse.name === 'h0') + 1, qr = res.findIndex(r => r.horse.name === 'h1') + 1;
    out.pos += q; if (q === 1) out.win++; if (q < qr) out.beat++; if (qr === 1) out.rivalWin++;
    if (sim.ctl && sim.ctl.everKakari) out.kakari++;
    const v = S.paceVerdict(sim.paceF), b = out.byPace[v] = out.byPace[v] || { n: 0, pos: 0, win: 0 };
    b.n++; b.pos += q; if (q === 1) b.win++;
  }
  out.win /= n; out.pos /= n; out.beat /= n; out.rivalWin /= n; out.kakari /= n;
  for (const v in out.byPace) { const b = out.byPace[v]; b.pos /= b.n; b.win /= b.n; }
  return out;
}

const POL = ['omakase', 'none', 'push', 'fit', 'misfit'];
const POL_JA = { omakase: 'おまかせ', none: '何もしない', push: 'ただ追う', fit: '噛み合った', misfit: '噛み合わない' };

function fieldTable() {
  const rows = [];
  console.log('同じ強さの相手（14頭・東京芝2000）。勝率％／平均着順');
  console.log('脚質・気性        ' + POL.map(p => POL_JA[p].padEnd(10, '　')).join(''));
  for (const style of ['逃げ', '先行', '差し', '追込']) {
    for (const [tag, mind] of [['荒い', 48], ['穏やか', 88]]) {
      const r = {}; for (const p of POL) r[p] = bench({ style, mind, policy: p });
      rows.push({ style, tag, mind, r });
      console.log(`${style}・${tag}`.padEnd(10, '　') + POL.map(p => `${String(pct(r[p].win)).padStart(3)}%／${r[p].pos.toFixed(1).padStart(4)}　`).join(''));
    }
  }
  return rows;
}

function upsetTable() {
  const rows = [];
  console.log('格上の相手（h1 が自分の馬より総合力で4・5上。ほかの12頭は自分の馬より3下）。勝率％・格上より先に入る割合％');
  for (const rival of [4, 5]) {
    for (const [tag, mind] of [['荒い', 48], ['穏やか', 88]]) {
      for (const style of ['先行', '差し']) {
        const r = {}; for (const p of POL) r[p] = bench({ style, mind, policy: p, rival, rest: -3 });
        rows.push({ rival, tag, style, r });
        console.log(`+${rival} ${style}・${tag}`.padEnd(12, '　') + POL.map(p => `${POL_JA[p]} 勝${pct(r[p].win)}%・先着${pct(r[p].beat)}%`).join('　'));
      }
    }
  }
  return rows;
}

// 強い馬（自分の馬だけ総合力が4上）でも、噛み合わないと負ける
function strongTable() {
  const rows = [];
  console.log('自分の馬だけ総合力が4上（ほかの13頭は同じ強さ）。勝率％／平均着順');
  for (const [tag, mind] of [['荒い', 48], ['穏やか', 88]]) {
    for (const style of ['先行', '差し']) {
      const r = {}; for (const p of POL) r[p] = bench({ style, mind, policy: p, self: 4 });
      rows.push({ tag, style, r });
      console.log(`${style}・${tag}`.padEnd(10, '　') + POL.map(p => `${POL_JA[p]} ${pct(r[p].win)}%／${r[p].pos.toFixed(1)}`).join('　'));
    }
  }
  return rows;
}

// 競り合いの気合：根性だけを変えた馬（おまかせ）の勝率と、気合の最大
function fightTable() {
  const rows = [];
  console.log('根性だけを変えた馬（強さは同じ・おまかせ）');
  for (const guts of [55, 70, 85, 95]) {
    const r = bench({ guts, policy: 'omakase' });
    rows.push({ guts, r });
    console.log(`根性 ${guts}　勝率 ${pct(r.win)}%　平均着順 ${r.pos.toFixed(2)}`);
  }
  return rows;
}

if (require.main === module) {
  if (what === 'field' || what === 'all') fieldTable();
  if (what === 'upset' || what === 'all') upsetTable();
  if (what === 'strong' || what === 'all') strongTable();
  if (what === 'fight' || what === 'all') fightTable();
}
module.exports = { bench, fieldTable, upsetTable, strongTable, fightTable, setMind, setGuts, FH };
