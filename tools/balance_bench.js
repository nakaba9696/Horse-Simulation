// 立ち回りの釣り合いを測る（docs/BALANCE.md の表の数）。
// 東京・芝2000・14頭。1頭目（h0）にプレイヤーが乗り、決まった乗り方の打ち手（tests/ridebot.js）で N 回走らせて、勝率・平均着順を出す。
// 乗り方：おまかせ（騎手の腕で自動）・何もしない・ただ追う・噛み合った乗り方・噛み合わない乗り方
// 使い方：node tools/balance_bench.js [field|upset|show|strong|fight|bond|beat|all] [N]
//   field … 同じ強さの相手（全頭 level 82）。脚質 × 気性（荒い・穏やか）ごと
//   upset … 格上の相手（1頭だけ総合力が4・5上、ほかは3下）。勝率と、格上より先に入る割合
//   show … 画面の総合力（0.5 刻みの目盛り）で 5.0 上の格上（自分 70.0・格上 75.0・ほかのまん中 67.0）。先着・勝率・平均着順
//   strong … 自分の馬だけ総合力が4上。噛み合わないと強い馬でも負けるか
//   fight … 競り合いの気合：根性の高い馬・低い馬の、競り合ったあとの伸び
//   bond … 絆（同じ馬に自分で乗った回数）で、気性の荒い馬の折り合いがどう変わるか
//   beat … 拍子：追い出してから馬の拍子に合わせてしごき続ける・拍子を見ずに連打する・噛み合った乗り方（段を上げたら手を止める）・おまかせ
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

// 画面の総合力（0.5 刻みの目盛り。HS.Season.fhShowOf・FH_SHOW_KNOTS）で強さをそろえる。
// 見た目の総合力 → もとの値（スピードとスタミナの重み付きの値）の逆の折れ線
const T = HS.Season;
function rawOfShow(y) {
  const K = T.FH_SHOW_KNOTS;
  let i = 0; while (i < K.length - 2 && y > K[i + 1][1]) i++;
  const [x0, y0] = K[i], [x1, y1] = K[i + 1];
  return x0 + (y - y0) * (x1 - x0) / (y1 - y0);
}
// 能力のもとの値を d だけ動かす（スピードとスタミナを同じだけ。芝もダートも）。見た目の総合力が d に見合うだけ動く
function shiftRaw(h, d) { for (const k of ['spd', 'sta', 'dspd', 'dsta']) if (h.pot[k] != null) h.pot[k] += d; }
// 見た目の総合力（芝）をちょうど y にする（丸める前の値で）
function setShow(h, y) { shiftRaw(h, rawOfShow(y) - T.fhRaw(h.pot, '芝', h)); }
// level 82 の頭数合わせの馬は、見た目でおよそ 58（まん中）。show.rest は、そのばらつきを保ったまま、まん中をそこへ動かす
const SHOW_L82 = 58;
const showOf = h => T.fhShowOf(h.pot, '芝', h);

// o: { style, mind, guts, policy, rival（格上の相手の強さの差・総合力）, N, seed, race,
//      show（画面の総合力でそろえる：{ self, rival, rest }。self と rival はちょうどその値、rest はまん中をそこへ。rival・rest・self より先に効く） }
function bench(o) {
  const rng = new U.RNG(o.seed || 41);
  const n = o.N || N;
  const out = { win: 0, pos: 0, beat: 0, rivalWin: 0, kakari: 0, tension: 0, byPace: {} };
  for (let k = 0; k < n; k++) {
    const field = [];
    for (let i = 0; i < 14; i++) {
      // h1＝格上の相手（h0 より rival だけ上）、h2 以下＝ほかの馬（h0 より rest だけ上。負なら下）、h0＝自分の馬（self だけ上）
      const lv = o.show ? 82 : i === 0 ? 82 + (o.self || 0) * FH : i === 1 && o.rival ? 82 + o.rival * FH : 82 + (o.rest || 0) * FH;
      const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 2000, born: 2000 }); h.name = 'h' + i;
      if (lv !== 82) for (const key of ['spd', 'dspd']) if (h.pot[key] != null) h.pot[key] += (lv - 82) / 0.45;
      if (i === 0) { if (o.style) h.style = o.style; if (o.mind != null) setMind(h, o.mind); if (o.guts != null) setGuts(h, o.guts); if (o.mod) o.mod(h); }
      if (o.show) {
        if (i === 0) setShow(h, o.show.self);
        // 格上の相手は、総合力に入らない能力（根性・気性・坂）を自分の馬にそろえる（強さの差が見た目の差だけになるように）
        else if (i === 1 && o.show.rival != null) { for (const k of ['guts', 'mind', 'slope']) h.pot[k] = field[0].horse.pot[k]; setShow(h, o.show.rival); }
        else shiftRaw(h, rawOfShow(o.show.rest) - rawOfShow(SHOW_L82));
      }
      field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1, rider: i === 0 ? 'P' : undefined });
    }
    const race = Object.assign({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004, month: 5 }, o.race || {});
    const ride = o.policy !== 'omakase';
    const sim = S.create(race, field, H.weekIndex(2004, 5, 1), new U.RNG(rng.int(1, 1e9)), { ride, bond: o.bond });
    const tick = ride ? BOT.make(o.policy) : null;
    let tsum = 0, tn = 0;
    while (!S.step(sim)) { if (tick) tick(sim); if (sim.ctl && !sim.st[0].spurting && sim.st[0].x > sim.D * 0.2) { tsum += sim.ctl.tension; tn++; } }
    out.tension += tn ? tsum / tn : 0;
    const res = S.finish(sim).results;
    const q = res.findIndex(r => r.horse.name === 'h0') + 1, qr = res.findIndex(r => r.horse.name === 'h1') + 1;
    out.pos += q; if (q === 1) out.win++; if (q < qr) out.beat++; if (qr === 1) out.rivalWin++;
    if (sim.ctl && sim.ctl.everKakari) out.kakari++;
    const v = S.paceVerdict(sim.paceF), b = out.byPace[v] = out.byPace[v] || { n: 0, pos: 0, win: 0 };
    b.n++; b.pos += q; if (q === 1) b.win++;
  }
  out.win /= n; out.pos /= n; out.beat /= n; out.rivalWin /= n; out.kakari /= n; out.tension /= n;
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

// 画面の総合力で 5.0 上の格上（持ち主の決定 2026-10-22「70が80にも勝てるゲームにしたい」「慣れた人間がのればだいたい勝てるくらい」）。
// 自分の馬 70.0・格上 75.0（どちらもちょうど）・ほかの12頭はまん中 67.0。格上より先に入る割合・勝率・平均着順
const SHOW = { self: 70, rival: 75, rest: 67 };
const POL_SHOW = ['omakase', 'none', 'push', 'fit', 'misfit'];
const JA_SHOW = POL_JA;
function showTable(o) {
  o = o || {};
  const rows = [];
  const sh = Object.assign({}, SHOW, o.show || {});
  console.log(`画面の総合力で格上（自分の馬 ${sh.self.toFixed(1)}・格上 ${sh.rival.toFixed(1)}・ほか12頭のまん中 ${sh.rest.toFixed(1)}。14頭・東京芝2000・各${o.N || N}回）。先着％・勝率％・平均着順`);
  for (const [tag, mind] of [['穏やか', 88], ['荒い', 48]]) {
    for (const style of ['先行', '差し']) {
      const r = {}; for (const p of POL_SHOW) r[p] = bench({ style, mind, policy: p, show: sh, N: o.N, seed: o.seed });
      rows.push({ tag, style, r });
      console.log(`${style}・${tag}`.padEnd(8, '　') + POL_SHOW.map(p => `${JA_SHOW[p]} ${pct(r[p].beat)}%・${pct(r[p].win)}%・${r[p].pos.toFixed(1)}`).join('　'));
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

// 絆（同じ馬に自分で乗った回数）：初騎乗・3回・12回で、気性の荒い馬（気性55）の掛かりやすさと着順
function bondTable() {
  const rows = [];
  console.log('絆（自分で乗った回数）と折り合い（差し・気性55）。道中の気分の平均・掛かった割合・平均着順');
  for (const policy of ['fit', 'misfit']) {
    for (const bond of [0, 3, 12]) {
      const r = bench({ style: '差し', mind: 55, policy, bond });
      rows.push({ policy, bond, r });
      console.log(`${POL_JA[policy]}・${bond}回　気分 ${r.tension.toFixed(0)}　掛かり ${pct(r.kakari)}%　平均着順 ${r.pos.toFixed(2)}　勝率 ${pct(r.win)}%`);
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

// 拍子：同じ相手・同じ種で、追い出してからの手の動かし方だけを変える
function beatTable() {
  const rows = [];
  const P = ['omakase', 'fit', 'beat', 'mash'];
  const JA = { omakase: 'おまかせ', fit: '噛み合った', beat: '拍子に合わせる', mash: '連打' };
  console.log('拍子（14頭・東京芝2000・気性88）。勝率％／平均着順');
  for (const style of ['先行', '差し']) {
    const r = {}; for (const p of P) r[p] = bench({ style, mind: 88, policy: p });
    rows.push({ style, r });
    console.log(style.padEnd(4, '　') + P.map(p => `${JA[p]} ${pct(r[p].win)}%／${r[p].pos.toFixed(2)}`).join('　'));
  }
  return rows;
}

if (require.main === module) {
  if (what === 'beat' || what === 'all') beatTable();
  if (what === 'field' || what === 'all') fieldTable();
  if (what === 'upset' || what === 'all') upsetTable();
  if (what === 'show' || what === 'all') showTable();
  if (what === 'strong' || what === 'all') strongTable();
  if (what === 'fight' || what === 'all') fightTable();
  if (what === 'bond' || what === 'all') bondTable();
}
module.exports = { bench, showTable, SHOW, rawOfShow, setShow, showOf, beatTable, fieldTable, upsetTable, strongTable, fightTable, bondTable, setMind, setGuts, FH };
