// ゲームのバランスを数字で出す（測るだけ。遊びの決まりは変えない）。結果は docs/BALANCE_REPORT.md
// 騎手のゲーム（年代なし）を自動で何年も遊ぶ。自分が乗るレースは決まった乗り方の打ち手（tests/ridebot.js）で乗る：
//   fit  … 上手な人（噛み合った乗り方：ペースと脚質に合わせて位置を取り、仕掛けどころを選ぶ）
//   push … ふつうの人（位置は気にせず、直線の手前からしごいて直線でムチ）
// 立ち回り（どちらの乗り方も同じ。「筋のよい遊び方」）：
//   ・馬の店：毎月1週に、半年分の預託料を残して、いまの総合力がいちばん高い馬を買える限り買う（お手馬10頭まで）。
//     --swap を付けると、お手馬がいっぱいでも店に6以上強い馬がいれば、いちばん弱いお手馬を引退させて買い替える
//   ・出走：ふだんはおまかせ（出るレースを自動で選ぶ）。トロフィーのリーチ・途中のレースと、強い馬の G1（海外も）は自分で登録する
//   ・引退：1月1週に、7歳・下り坂の5歳以上・弱い4歳以上を引退させ、牧場（引退馬）がいっぱいなら弱い馬を放す
//   ・オリジナルホース：1月1週に、引退馬の牝馬それぞれに、いちばん強い牡馬を合わせて作る（お手馬の枠が空いている分）
//   ・GF：招待されたら、いちばん強い馬で出る（返事をしないときの決まりのまま）。オーナーの依頼は来たら必ず乗る
// 使い方：
//   node tools/balance_autoplay.js run  --seed=1 --rider=fit --years=10 [--out=dir]   1本走らせて JSON を書く
//   node tools/balance_autoplay.js all  --seeds=1,2,3,4,5 --years=10 [--out=dir] [--jobs=4] [--swap]  種×乗り方を並べて走らせる
//   node tools/balance_autoplay.js report [--out=dir]   JSON から表（Markdown）を出す
const path = require('path');
const fs = require('fs');
const args = Object.fromEntries(process.argv.slice(3).map(a => { const m = a.match(/^--([^=]+)=?(.*)$/); return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true]; }));
const mode = process.argv[2] || 'report';
const OUT = path.resolve(args.out || path.join(require('os').tmpdir(), 'hs_balance'));

function run(seed, rider, years, SWAP) {
  const { load } = require('../tests/load.js');
  const HS = load();
  const U = HS.U, W = HS.World, H = HS.Horse, S = HS.Sim, R = HS.Races, T = HS.Season, TR = HS.Trophy, O = HS.Owners;
  const Ori = HS.Original, J = HS.Jockey, E = HS.Eraless, F = HS.Fatigue;
  const BOT = require('../tests/ridebot.js')(HS);

  // ---------- お金の出入りを、どの処理で動いたかで分ける（入れ子は内側に付ける） ----------
  let cur = null; // いまの年の記録
  const stack = [];
  const book = (cat, d) => { if (!cur || !d) return; cur.inc[cat] = (cur.inc[cat] || 0) + d; };
  function wrap(obj, name, cat) {
    const f = obj[name];
    obj[name] = function () {
      const g = W.get(), m0 = g ? g.player.money : 0;
      stack.push(0);
      let out;
      try { out = f.apply(this, arguments); } finally {
        const nested = stack.pop();
        const all = (W.get() ? W.get().player.money : 0) - m0;
        book(cat, all - nested);
        if (stack.length) stack[stack.length - 1] += all;
      }
      return out;
    };
  }
  wrap(W, 'applyResults', 'prize');      // 自分の馬の賞金（馬主の取り分）
  wrap(J, 'record', 'jockey');           // 騎手の取り分（5%）
  wrap(O, 'onRide', 'ownerFee');         // 依頼の騎乗料
  wrap(O, 'advance', 'ownerReward');     // ミッションのお礼
  wrap(O, 'yearAward', 'ownerReward');   // 名コンビ賞
  wrap(TR, 'give', 'trophy');            // トロフィーのお金
  wrap(W, 'awards', 'award');            // 年末の表彰
  wrap(E, 'buy', 'shop');                // 馬の店
  wrap(W, 'monthEnd', 'upkeep');         // 預託料
  wrap(W, 'finishWeek', 'other');        // 残り（遠征費など）

  W.newGame({ seed, mode: 'jockey', jockeyName: '測る騎手', region: '美浦' });
  const G = W.get();
  const y0 = G.year;
  const yn = () => G.year - y0 + 1; // n年目
  const fhMax = (h) => { const w = W.wIdx(); return Math.max(T.fh(h, w, '芝'), T.fh(h, w, 'ダ')); };
  const fhPk = h => { const p = T.fhPeak(h); return Math.max(p.turf, p.dirt); };
  const fhSurf = (h, sf) => T.fh(h, W.wIdx(), sf === 'ダ' ? 'ダ' : '芝');
  const out = { seed, rider, years, start: y0, yr: [], trophies: [], owners: {}, originals: [], gf: [], legends: [], fields: {}, time: { weeks: 0, cards: 0, ride: 0, finish: 0, max: 0 }, gameOver: null, buys: [] };
  const genOf = {}; // オリジナルホースの世代（名前で）
  const origBest = {};
  const newYearRec = () => ({ y: yn(), inc: {}, money0: G.player.money, rides: 0, wins: 0, ownRides: 0, ownWins: 0, jobRides: 0, jobWins: 0, graded: 0, g1: 0, g1Jra: 0, g1Abroad: 0, shopMaxAll: 0, shopMaxAfford: 0, shopMinPrice: Infinity, allAfford: 0, buys: 0, spent: 0, own: 0, retired: 0, made: 0, gfInv: 0, gfRan: 0, gfWon: 0, legMet: 0, legWon: 0, legBeat: 0, overseasRides: 0 });
  cur = newYearRec();
  const fieldRec = (k, n) => { const f = out.fields[k] = out.fields[k] || { races: 0, sum: 0, min: 99, lt8: 0 }; f.races++; f.sum += n; f.min = Math.min(f.min, n); if (n < 8) f.lt8++; };
  const catOf = r => r.invite ? 'GF' : r.region === '海外' ? (r.grade === 'G1' ? '海外 G1' : '海外 G2・G3') : r.region === '地方' ? '地方' : r.graded ? 'JRA ' + r.grade : r.listed ? 'JRA L' : 'JRA OP';

  // ---------- 1月1週：引退とオリジナルホース ----------
  const retiredOf = sex => Ori.retired(sex).slice().sort((a, b) => fhPk(a) - fhPk(b));
  function yearStart() {
    for (const h of W.mine().filter(x => x.loc === 'stable' || x.loc === 'farm')) {
      const age = G.year - h.born; if (age < 4) continue;
      const now = fhMax(h), pk = fhPk(h);
      if (!(age >= 7 || (age >= 5 && now < pk - 4) || now < 48)) continue;
      let r = J.retire(h.id);
      if (r && r.err) { // 牧場がいっぱい：いちばん弱い引退馬が、この馬より弱ければ放す
        const weak = retiredOf(h.sex)[0];
        if (weak && fhPk(weak) < pk) { Ori.release(weak.id); r = J.retire(h.id); }
      }
      if (r && !r.err) cur.retired++;
    }
    // オリジナルホース：牝馬ごとに、いちばん強い牡馬（近すぎる組み合わせは飛ばす）
    const dams = Ori.retired('牝').slice().sort((a, b) => fhPk(b) - fhPk(a));
    for (const m of dams) {
      if (!T.canBuy()) break;
      if (m.foalY === G.year || !Ori.foalsLeft(m) || !W.horse(m.id)) continue;
      const sires = Ori.retired('牡').filter(s => Ori.foalsLeft(s) && W.horse(s.id)).sort((a, b) => fhPk(b) - fhPk(a));
      for (const s of sires) {
        if (HS.Inbreed.analyze(s.name, m.name).block) continue;
        const gs = genOf[s.name] || 0, gm = genOf[m.name] || 0, sv = fhPk(s), mv = fhPk(m);
        const r = Ori.make(s.id, m.id);
        if (r.err) continue;
        const gen = Math.max(gs, gm) + 1;
        genOf[r.horse.name] = gen;
        out.originals.push({ y: yn(), gen, name: r.horse.name, peak: fhPk(r.horse), sire: sv, dam: mv });
        cur.made++;
        break;
      }
    }
  }

  // ---------- 毎月1週：馬の店 ----------
  function shop() {
    const items = W.marketHistoric();
    const w = W.wIdx();
    const val = it => E.shopValue(it.horse, w);
    for (const it of items) {
      const v = val(it);
      cur.shopMaxAll = Math.max(cur.shopMaxAll, v);
      cur.shopMinPrice = Math.min(cur.shopMinPrice, it.price);
      if (it.price <= G.player.money) cur.shopMaxAfford = Math.max(cur.shopMaxAfford, v);
    }
    if (items.length && items.every(it => it.price <= G.player.money)) cur.allAfford++;
    for (let k = 0; k < 10 && T.canBuy(); k++) {
      const own = T.ownCount();
      const reserve = 6 * 60 * U.priceIndex() * (own + 1);
      const list = W.marketHistoric().filter(it => it.price <= G.player.money - reserve && (val(it) >= 50 || own < 3))
        .sort((a, b) => val(b) - val(a) || a.price - b.price);
      if (!list.length) break;
      const it = list[0];
      const v = val(it), p = it.price;
      if (W.buy(it)) break;
      cur.buys++; cur.spent += p;
      out.buys.push({ y: yn(), m: G.month, fh: v, peak: fhPk(it.horse), price: p });
    }
    // 入れ替え（--swap）：お手馬がいっぱいで、店に6以上強い馬が買えるなら、いちばん弱いお手馬を引退させて買う（月に3頭まで）
    if (!SWAP) return;
    const look = h => fhMax(h) + (G.year - h.born <= 2 ? 5 : 0); // 2歳はこれから伸びる分を見込む
    for (let k = 0; k < 3 && !T.canBuy(); k++) {
      const own = T.ownCount();
      const reserve = 6 * 60 * U.priceIndex() * own;
      const list = W.marketHistoric().filter(it => it.price <= G.player.money - reserve).sort((a, b) => val(b) - val(a) || a.price - b.price);
      const mine = W.mine().filter(h => (h.loc === 'stable' || h.loc === 'farm') && !(h.original && G.year - h.born <= 2)).sort((a, b) => look(a) - look(b));
      if (!list.length || !mine.length || val(list[0]) < look(mine[0]) + 6) break;
      const h = mine[0];
      let r = J.retire(h.id);
      if (r && r.err) { const weak = retiredOf(h.sex)[0]; if (weak) { Ori.release(weak.id); r = J.retire(h.id); } }
      if (!r || r.err) break;
      cur.retired++; cur.swaps = (cur.swaps || 0) + 1;
      const it = list[0], v = val(it), p = it.price;
      if (W.buy(it)) break;
      cur.buys++; cur.spent += p;
      out.buys.push({ y: yn(), m: G.month, fh: v, peak: fhPk(it.horse), price: p });
    }
  }

  // ---------- 毎週：自分で登録する重賞（トロフィーのリーチ・途中のレース・強い馬の G1） ----------
  const wonIn = (h, name, y) => (h.gradedWins || []).some(g => (g.short || g.race) === name && (y == null || g.y === y));
  function manual() {
    const w = W.wIdx();
    const races = W.weekRaces().filter(r => r.graded && !r.invite);
    for (const h of W.mine('stable')) {
      if (W.entryOf(h.id) || w < (h.restUntil || 0) || F.stage(h) >= 2) continue;
      let best = null, bestP = 0;
      for (const r of races) {
        if (R.ineligible(h, r, G.year) || W.rideTaken(r.key, h.id)) continue;
        if (r.dist < h.distMin - 200 || r.dist > h.distMax + 200) continue;
        const apt = (r.surface === 'ダ' ? h.apt.dirt : h.apt.turf) || 0;
        if (apt < 60) continue;
        const fh = fhSurf(h, r.surface);
        let p = 0;
        if (TR.LIST.some(t => TR.reach(h, t, r))) p = 3;
        else if (fh >= 58 && TR.LIST.some(t => t.kind === 'set' && t.races.includes(r.short) && t.races.some(n => n !== r.short && wonIn(h, n, t.same ? G.year : null)))) p = 2.5;
        else if (r.grade === 'G1' && fh >= (r.region === '海外' ? 63 : 60)) p = 2;
        if (p > bestP || (p === bestP && p && r.prize > best.prize)) { best = r; bestP = p; }
      }
      if (best && !W.enter(h.id, best.key) && best.region === '海外') cur.overseasRides++;
    }
  }

  // ---------- 週を回す ----------
  const policy = rider;
  while (G.year < y0 + years && !G.gameOver) {
    if (G.month === 1 && G.week === 1) yearStart();
    if (G.week === 1) shop();
    if (G.week <= 4) manual();
    if (G.week === T.GF_WEEK && G.dc && G.dc.y === G.year && G.dc.gf) {
      for (const c of T.GF_CATS) { const x = G.dc.gf[c.id]; if (x && x.elig.length) cur.gfInv++; }
    }
    const t0 = Date.now();
    const cards = W.cards();
    const t1 = Date.now();
    for (const c of cards) fieldRec(catOf(c.race), c.runners.length);
    const played = {};
    for (const { card } of J.myRides()) {
      const sim = W.startSim(card, { ride: true, frames: false });
      const tick = BOT.make(policy);
      while (!S.step(sim)) tick(sim);
      played[card.race.key] = S.finish(sim);
    }
    const t2 = Date.now();
    const yBefore = G.year;
    const rep = W.finishWeek(played);
    const t3 = Date.now();
    out.time.weeks++; out.time.cards += t1 - t0; out.time.ride += t2 - t1; out.time.finish += t3 - t2; out.time.max = Math.max(out.time.max, t3 - t0);
    for (const r of rep.races) {
      if (!r.ridden) continue;
      const me = r.sim.results.find(x => x.rider === 'P');
      if (!me) continue;
      const race = r.race, gf = race.grade === 'GF';
      const own = me.horse.owner === 'P';
      if (gf) { cur.gfRan++; if (me.pos === 1) cur.gfWon++; out.gf.push({ y: yn(), cat: race.gf, pos: me.pos, fh: fhSurf(me.horse, race.surface) }); }
      else {
        cur.rides++; if (me.pos === 1) cur.wins++;
        if (own) { cur.ownRides++; if (me.pos === 1) cur.ownWins++; } else { cur.jobRides++; if (me.pos === 1) cur.jobWins++; }
        if (me.pos === 1 && race.graded) { cur.graded++; if (race.grade === 'G1') { cur.g1++; if (race.region === '海外') cur.g1Abroad++; else cur.g1Jra++; } }
      }
      const legs = r.sim.results.filter(x => x.horse.legend);
      if (legs.length) {
        cur.legMet++; if (me.pos === 1) cur.legWon++;
        if (legs.some(l => l.pos > me.pos)) cur.legBeat++;
        out.legends.push({ y: yn(), race: race.short || race.name, legends: legs.map(l => l.horse.name), pos: me.pos, legPos: legs.map(l => l.pos) });
      }
    }
    // オリジナルホースの、走っていたときのいちばん高い総合力
    if (G.week === 1) for (const h of W.mine('stable')) if (h.original) origBest[h.name] = Math.max(origBest[h.name] || 0, fhMax(h));
    if (G.year !== yBefore) {
      cur.money = G.player.money; cur.own = T.ownCount();
      out.yr.push(cur);
      if (G.year < y0 + years) cur = newYearRec();
    }
  }
  if (G.gameOver) { out.gameOver = { y: G.gameOver.y - y0 + 1, m: G.gameOver.m }; cur.money = G.player.money; cur.own = T.ownCount(); out.yr.push(cur); }
  // トロフィー（手にした順）
  for (const t of TR.LIST) for (const x of TR.holders(t.id)) out.trophies.push({ id: t.id, label: t.label, cat: t.cat, tier: t.tier, y: x.y - y0 + 1, horse: x.horse });
  out.trophies.sort((a, b) => a.y - b.y);
  out.trophyAll = TR.LIST.map(t => ({ id: t.id, label: t.label, cat: t.cat, tier: t.tier }));
  // オーナー
  for (const o of O.list()) {
    const st = O.of(o.id);
    out.owners[o.id] = { name: o.name, known: st.known ? (st.knownAt.y - y0) + 1 + (st.knownAt.m - 1) / 12 : null, stage: st.stage, cleared: (st.cleared || []).map(c => c.y - y0 + 1), fails: st.fails || 0, rides: st.rides, wins: st.wins };
  }
  for (const x of out.originals) x.best = origBest[x.name] || null;
  out.unlocked = (G.unlocked || []).length;
  out.shopKeys = (G.shopKeys || []).slice();
  return out;
}

// ---------- 表 ----------
function report(dir) {
  const files = fs.readdirSync(dir).filter(f => /^run_.*\.json$/.test(f)).sort();
  const runs = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const riders = [...new Set(runs.map(r => r.rider))];
  const RJ = { fit: '上手な人', push: 'ふつうの人' };
  const man = v => v == null || !isFinite(v) ? '-' : (v / 10000).toFixed(1) + '億';
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
  const med = a => { if (!a.length) return NaN; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const f1 = v => isFinite(v) ? v.toFixed(1) : '-';
  const L = [];
  const p = s => L.push(s);
  const seeds = [...new Set(runs.map(r => r.seed))];
  p(`種 ${seeds.join('・')}（${seeds.length}つ）× 乗り方 ${riders.map(r => RJ[r] || r).join('・')}・各 ${runs[0] ? runs[0].years : '?'}年。`);
  for (const rd of riders) {
    const rs = runs.filter(r => r.rider === rd);
    const Y = Math.max(...rs.map(r => r.yr.length));
    p(`\n### ${RJ[rd] || rd}\n`);
    p(`買い替えのための引退（1本の10年の平均）：${f1(avg(rs.map(r => r.yr.reduce((s, y) => s + (y.swaps || 0), 0))))}頭\n`);
    p(`資金切れで終わった：${rs.filter(r => r.gameOver).length} / ${rs.length}${rs.filter(r => r.gameOver).map(r => `（種${r.seed}：${r.gameOver.y}年目${r.gameOver.m}月）`).join('')}\n`);
    p('#### お金（種の平均。万円は億に直した）\n');
    p('| 年目 | 年末の所持金 | 賞金（馬主の取り分） | 騎手の取り分 | 依頼（騎乗料＋お礼） | トロフィー | 馬の店 | 預託料 | 遠征費など | お手馬 | 買った頭数 |');
    p('|---|---|---|---|---|---|---|---|---|---|---|');
    for (let i = 0; i < Y; i++) {
      const ys = rs.map(r => r.yr[i]).filter(Boolean);
      const a = k => avg(ys.map(y => y.inc[k] || 0));
      p(`| ${i + 1} | ${man(avg(ys.map(y => y.money)))}（${man(Math.min(...ys.map(y => y.money)))}〜${man(Math.max(...ys.map(y => y.money)))}） | ${man(a('prize'))} | ${man(a('jockey'))} | ${man(a('ownerFee') + a('ownerReward'))} | ${man(a('trophy'))} | ${man(a('shop'))} | ${man(a('upkeep'))} | ${man(a('other') + a('award'))} | ${f1(avg(ys.map(y => y.own)))} | ${f1(avg(ys.map(y => y.buys)))} |`);
    }
    p('\n#### 馬の店（その年に店に並んだ馬の総合力のいちばん上・買えたいちばん上。種の平均）\n');
    p('| 年目 | 店のいちばん上 | 所持金で買えたいちばん上 | 店の全部を買えた月 | 買った馬の総合力（平均・いちばん上） | 1頭の値段の平均 |');
    p('|---|---|---|---|---|---|');
    for (let i = 0; i < Y; i++) {
      const ys = rs.map(r => r.yr[i]).filter(Boolean);
      const bs = rs.flatMap(r => r.buys.filter(b => b.y === i + 1));
      p(`| ${i + 1} | ${f1(avg(ys.map(y => y.shopMaxAll)))} | ${f1(avg(ys.map(y => y.shopMaxAfford)))} | ${f1(avg(ys.map(y => y.allAfford)))} / 12 | ${bs.length ? f1(avg(bs.map(b => b.fh))) + '・' + Math.max(...bs.map(b => b.fh)) : '-'} | ${bs.length ? man(avg(bs.map(b => b.price))) : '-'} |`);
    }
    p('\n#### 勝ち（自分が乗ったレース。GF は別。種の平均）\n');
    p('| 年目 | 騎乗 | 勝ち | 勝率 | 自分の馬 騎乗・勝ち | 依頼の馬 騎乗・勝ち | 重賞の勝ち | G1（JRA・海外） | 海外へ登録 |');
    p('|---|---|---|---|---|---|---|---|---|');
    for (let i = 0; i < Y; i++) {
      const ys = rs.map(r => r.yr[i]).filter(Boolean);
      const a = k => avg(ys.map(y => y[k]));
      p(`| ${i + 1} | ${f1(a('rides'))} | ${f1(a('wins'))} | ${f1(100 * a('wins') / Math.max(1e-9, a('rides')))}% | ${f1(a('ownRides'))}・${f1(a('ownWins'))} | ${f1(a('jobRides'))}・${f1(a('jobWins'))} | ${f1(a('graded'))} | ${f1(a('g1'))}（${f1(a('g1Jra'))}・${f1(a('g1Abroad'))}） | ${f1(a('overseasRides'))} |`);
    }
    p('\n#### GF・隠し馬（種の平均）\n');
    p('| 年目 | GF の招待（区分の数） | GF に出た | GF の勝ち | 隠し馬と走った | 隠し馬のいるレースで勝った | 隠し馬に先着 |');
    p('|---|---|---|---|---|---|---|');
    for (let i = 0; i < Y; i++) {
      const ys = rs.map(r => r.yr[i]).filter(Boolean);
      const a = k => avg(ys.map(y => y[k]));
      p(`| ${i + 1} | ${f1(a('gfInv'))} | ${f1(a('gfRan'))} | ${f1(a('gfWon'))} | ${f1(a('legMet'))} | ${f1(a('legWon'))} | ${f1(a('legBeat'))} |`);
    }
    const legs = rs.flatMap(r => r.legends);
    p(`\n隠し馬と走った ${legs.length}回・勝った ${legs.filter(x => x.pos === 1).length}回（${f1(100 * legs.filter(x => x.pos === 1).length / Math.max(1, legs.length))}%）。`);
    const byRace = {};
    for (const x of legs) { const b = byRace[x.race] = byRace[x.race] || { n: 0, w: 0, names: new Set() }; b.n++; if (x.pos === 1) b.w++; x.legends.forEach(n => b.names.add(n)); }
    p('隠し馬が出たレース：' + Object.entries(byRace).sort((a, b) => b[1].n - a[1].n).map(([k, b]) => `${k} ${b.w}/${b.n}（${[...b.names].join('・')}）`).join('、'));
    const gfs = rs.flatMap(r => r.gf);
    const gfByCat = {};
    for (const x of gfs) { const b = gfByCat[x.cat] = gfByCat[x.cat] || { n: 0, w: 0, fh: [] }; b.n++; if (x.pos === 1) b.w++; b.fh.push(x.fh); }
    p(`\nGF に出た ${gfs.length}回・勝った ${gfs.filter(x => x.pos === 1).length}回。区分ごと：` + Object.entries(gfByCat).map(([k, b]) => `${k} ${b.w}/${b.n}（出た馬の総合力 平均${f1(avg(b.fh))}）`).join('、'));
    const firstGF = rs.map(r => { const x = r.gf[0]; return x ? x.y : null; });
    p(`初めて GF に出た年目（種ごと）：${firstGF.map(x => x || '出ず').join('・')}`);

    // トロフィー
    p('\n#### トロフィー（40個）\n');
    const all = rs[0].trophyAll;
    const got = rs.map(r => new Set(r.trophies.map(t => t.id)));
    p(`10年で取れた数（種ごと）：${got.map(s => s.size).join('・')}（平均 ${f1(avg(got.map(s => s.size)))}）`);
    p('\n| トロフィー | 区分 | 難しさ | 取れた種の数 | いちばん早い年目 | 平均の年目 |');
    p('|---|---|---|---|---|---|');
    const rows = all.map(t => {
      const ys = rs.map(r => { const x = r.trophies.find(z => z.id === t.id); return x ? x.y : null; }).filter(x => x != null);
      return { t, n: ys.length, first: ys.length ? Math.min(...ys) : null, avg: ys.length ? avg(ys) : null };
    }).sort((a, b) => b.n - a.n || (a.first || 99) - (b.first || 99));
    for (const x of rows) if (x.n) p(`| ${x.t.label} | ${x.t.cat} | ${x.t.tier} | ${x.n} / ${rs.length} | ${x.first} | ${f1(x.avg)} |`);
    p(`\n一度も取れなかった（${rows.filter(x => !x.n).length}個）：${rows.filter(x => !x.n).map(x => `${x.t.label}（${x.t.tier}）`).join('・')}`);

    // オーナー
    p('\n#### オーナー（出会った年目／やり終えた段階。種ごと）\n');
    const oids = Object.keys(rs[0].owners);
    p('| オーナー | ' + rs.map(r => '種' + r.seed).join(' | ') + ' | 出会えた種 |');
    p('|---|' + rs.map(() => '---').join('|') + '|---|');
    for (const id of oids) {
      const cells = rs.map(r => { const o = r.owners[id]; return o && o.known != null ? `${f1(o.known)}年目・段階${o.stage}${o.cleared.length ? '（' + o.cleared.join(',') + '）' : ''}` : '-'; });
      p(`| ${rs[0].owners[id].name} | ${cells.join(' | ')} | ${rs.filter(r => r.owners[id] && r.owners[id].known != null).length} |`);
    }
    p('\n段階：0＝OP の依頼の段階・1＝G3・2＝G2・3＝G1・4＝お手馬の段階・5＝やり終えた。かっこはミッションをやり終えた年目。');

    // オリジナルホース
    p('\n#### オリジナルホース\n');
    const os = rs.flatMap(r => r.originals.map(o => Object.assign({ seed: r.seed }, o)));
    const firstO = rs.map(r => r.originals.length ? r.originals[0].y : null);
    p(`はじめて作った年目（種ごと）：${firstO.map(x => x || '作れず').join('・')}・作った数 ${os.length}頭`);
    p('\n| 世代 | 頭数 | 両親の総合力（完成・平均） | 仔の総合力（完成・平均） | 仔のいちばん上 | 走って届いた総合力（平均・いちばん上） |');
    p('|---|---|---|---|---|---|');
    for (const gen of [...new Set(os.map(o => o.gen))].sort()) {
      const g = os.filter(o => o.gen === gen);
      const best = g.map(o => o.best).filter(x => x != null);
      p(`| ${gen} | ${g.length} | ${f1(avg(g.map(o => (o.sire + o.dam) / 2)))} | ${f1(avg(g.map(o => o.peak)))} | ${Math.max(...g.map(o => o.peak))} | ${best.length ? f1(avg(best)) + '・' + Math.max(...best) : '-'} |`);
    }
  }
  // 出走頭数と重さ（乗り方で変わらないので全部まとめて）
  p('\n### 出走頭数（全部の種・乗り方・年をまとめて）\n');
  p('| 区分 | レース | 平均の頭数 | いちばん少ない | 8頭より少ない |');
  p('|---|---|---|---|---|');
  const fs2 = {};
  for (const r of runs) for (const [k, f] of Object.entries(r.fields)) { const t = fs2[k] = fs2[k] || { races: 0, sum: 0, min: 99, lt8: 0 }; t.races += f.races; t.sum += f.sum; t.min = Math.min(t.min, f.min); t.lt8 += f.lt8; }
  for (const [k, f] of Object.entries(fs2).sort()) p(`| ${k} | ${f.races} | ${f1(f.sum / f.races)} | ${f.min} | ${f.lt8} |`);
  p('\n### 週の処理の重さ（node・1週の平均 ms）\n');
  p('| 種・乗り方 | 週 | 出走表を作る | 自分の騎乗（模擬） | 週の締め | 1週のいちばん重い |');
  p('|---|---|---|---|---|---|');
  for (const r of runs) p(`| ${r.seed}・${RJ[r.rider] || r.rider} | ${r.time.weeks} | ${f1(r.time.cards / r.time.weeks)} | ${f1(r.time.ride / r.time.weeks)} | ${f1(r.time.finish / r.time.weeks)} | ${r.time.max} |`);
  return L.join('\n');
}

if (require.main === module) {
  if (mode === 'run') {
    const seed = +(args.seed || 1), rider = args.rider || 'fit', years = +(args.years || 10);
    const t0 = Date.now();
    const r = run(seed, rider, years, !!args.swap);
    r.wall = Date.now() - t0;
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `run_${seed}_${rider}.json`), JSON.stringify(r));
    console.log(`種${seed}・${rider}：${r.yr.length}年・${(r.wall / 1000).toFixed(0)}秒・所持金 ${r.yr.length ? r.yr[r.yr.length - 1].money : '?'}・トロフィー ${new Set(r.trophies.map(t => t.id)).size}${r.gameOver ? '・資金切れ' : ''}`);
  } else if (mode === 'all') {
    const { spawn } = require('child_process');
    const seeds = String(args.seeds || '1,2,3,4,5').split(',').map(Number), years = +(args.years || 10), jobs = +(args.jobs || 4);
    const todo = []; for (const s of seeds) for (const rd of ['fit', 'push']) todo.push([s, rd]);
    let running = 0;
    const next = () => {
      while (running < jobs && todo.length) {
        const [s, rd] = todo.shift(); running++;
        const c = spawn(process.execPath, [__filename, 'run', `--seed=${s}`, `--rider=${rd}`, `--years=${years}`, `--out=${OUT}`].concat(args.swap ? ['--swap'] : []), { stdio: 'inherit' });
        c.on('exit', () => { running--; if (!todo.length && !running) console.log(report(OUT)); else next(); });
      }
    };
    next();
  } else console.log(report(OUT));
}
module.exports = { run, report };
