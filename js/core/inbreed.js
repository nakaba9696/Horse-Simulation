// インブリード（オリジナルホースの配合。持ち主の決定 2026-10-20。docs/SPEC.md の末尾「インブリードの決まり」・数は docs/BALANCE.md「12. インブリード」）
// - 選べない：親子（1×2）・2×2 より濃いクロス（血量 50％以上。1×n はみなここ）・全きょうだい同士。画面は灰色にし「近すぎる（〇〇の2×2）」と出す
// - 因子：祖先ごとに1〜2つの能力。オリジナルホースは引退したときの能力でいちばん高い1つ（トロフィーで上がった能力を先に）。
//   セーブの G.origFactor（名前 → 因子）に残すので、牧場を去ったあとも、何代かあとの血統表に出てくれば効く（血統はセーブの G.pedExtra）。
//   史実の祖先は data/factors.js（手で決めた名馬）、なければ史実馬のデータの能力（H.fromHistoric）でいちばん高い1〜2つ、なければ種牡馬の特徴（traits）
// - 効き方：血量で3段（薄い・ほどよい・濃い）。因子の能力が上がり（2つ目の因子は半分）、濃いほど上がりは大きく、健康が下がりやすい。
//   同じ祖先が何度出ても血量で1つの段に数える。能力ごとの上がりは STAT_CAP まで。
//   ほかのクロスの祖先を通してだけ出てくる祖先（サンデーサイレンスの3×3 の裏のヘイローの4×4 など）は数えない
// 乱数は使わない（健康の下がりは healthDrop に渡す乱数で）。Godot 版は godot/core/hs_inbreed.gd（同じ答え）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const H = HS.Horse, P = HS.Ped;
  const I = HS.Inbreed = {};
  I.BLOCK_PCT = 50;     // この血量（％）から選べない（2×2 ＝ 50％。親子 1×2 ＝ 75％）
  // 段：min＝血量（％）の下限・up＝因子の能力の上がり・chance＝健康が下がる見込み・risk＝下がるときの平均
  I.TIERS = [
    { min: 25, name: '濃い', up: 3, chance: 0.6, risk: 9 },       // 2×3（37.5）・2×4（31.3）・3×3（25）
    { min: 12.5, name: 'ほどよい', up: 2, chance: 0.2, risk: 4 }, // 3×4（18.8）・3×5（15.6）・4×4（12.5）
    { min: 0, name: '薄い', up: 1, chance: 0, risk: 0 },          // 4×5（9.4）・5×5（6.3）
  ];
  I.SECOND = 0.5;       // 2つ目の因子は半分（四捨五入・1より下にしない）
  I.STAT_CAP = 3;       // 能力ごとの上がりの上限（クロスをいくつ重ねても）
  I.RISK_CAP = 20;      // 健康の下がりの上限
  I.HEALTH_MIN = 20;    // 下がっても健康はここまで
  I.FACTOR_CLOSE = 2;   // 史実の祖先の2つ目の因子：いちばん高い能力との差がこれ以内なら
  I.TRAIT_STAT = { 'スピード': 'spd', '瞬発力': 'spd', 'スタミナ': 'sta', '持続力': 'sta', 'パワー': 'slope', '底力': 'guts' };

  let cache = new Map(), legends = null;
  I.reset = function () { cache = new Map(); legends = null; };

  // 能力の高い順に n 個まで（2つ目は、いちばん高い能力との差が FACTOR_CLOSE 以内のときだけ）。同じ値は H.STATS の順
  I.topStats = function (pot, n) {
    let a = null;
    for (const k of H.STATS) if (pot[k] != null && (a == null || pot[k] > pot[a])) a = k;
    if (a == null) return [];
    if (n < 2) return [a];
    let b = null;
    for (const k of H.STATS) if (k !== a && pot[k] != null && (b == null || pot[k] > pot[b])) b = k;
    return b != null && pot[b] >= pot[a] - I.FACTOR_CLOSE ? [a, b] : [a];
  };
  // オリジナルホースの因子：引退したときの能力でいちばん高い1つ。トロフィーで上がった能力（potUp）があれば、いちばん上がった能力
  I.origFactorOf = function (h) {
    const up = h.potUp || {}, pot = h.pot || {};
    let best = null;
    for (const k of H.STATS) {
      const u = up[k] || 0;
      if (u > 0 && (best == null || u > up[best] || (u === up[best] && (pot[k] || 0) > (pot[best] || 0)))) best = k;
    }
    return best != null ? [best] : I.topStats(pot, 1);
  };
  // オリジナルホースの因子をセーブに残す（引退したとき・仔を作ったとき）
  I.remember = function (h) {
    const G = HS.World.get();
    if (!G || !h || !h.original || !h.name) return;
    G.origFactor = G.origFactor || {};
    if (!G.origFactor[h.name]) G.origFactor[h.name] = I.origFactorOf(h);
  };
  // 前のセーブ：牧場にいるオリジナルホースの因子と血統を足す（World.migrate から）
  I.migrate = function (g) {
    g.origFactor = g.origFactor || {};
    g.pedExtra = g.pedExtra || {};
    for (const h of Object.values(g.horses || {})) {
      if (!h.original || !h.name) continue;
      if (!g.pedExtra[h.name] && (h.sire || h.dam)) g.pedExtra[h.name] = [h.sire || null, h.dam || null];
      if (h.loc === 'retired' && !g.origFactor[h.name]) g.origFactor[h.name] = I.origFactorOf(h);
    }
  };

  // 祖先の因子（能力の名前の配列。1〜2つ。わからない祖先は空）
  I.factorOf = function (name) {
    if (!name) return [];
    const G = HS.World && HS.World.get();
    if (G && G.origFactor && G.origFactor[name]) return G.origFactor[name];
    if (cache.has(name)) return cache.get(name);
    const D = HS.DATA, hand = (D.factors || {})[name];
    let f = [];
    if (hand) f = hand.filter(k => H.STATS.includes(k)).slice(0, 2);
    else {
      if (!legends) { legends = new Map(); for (const x of D.legendsExtra || []) if (!legends.has(x.name)) legends.set(x.name, x); }
      const d = (HS.World.histByName && HS.World.histByName.get(name)) || legends.get(name);
      if (d) f = I.topStats(H.fromHistoric(d, 'factor').pot, 2);
      else {
        const st = (D.stallions || []).find(x => x.name === name);
        if (st) {
          for (const t of st.traits || []) {
            let k = I.TRAIT_STAT[t];
            if (!k) continue;
            if (st.surface === 'ダ') k = k === 'spd' ? 'dspd' : k === 'sta' ? 'dsta' : k;
            if (!f.includes(k)) f.push(k);
            if (f.length >= 2) break;
          }
        }
      }
    }
    cache.set(name, f);
    return f;
  };

  I.tierOf = pct => { let i = 0; while (i < I.TIERS.length - 1 && pct < I.TIERS[i].min) i++; return i; };

  // 配合を見る。sire・dam は名前。答え：block（選べない理由。選べるなら null）・crosses（血量の多い順）・up（能力ごとの上がり。上限まで）・risk（健康の下がりの見込み）
  // crosses の1つ：name・sire（父方の代の並び）・dam（母方）・label（"3×4"）・pct（血量％）・tier（段）・via（ほかのクロスの祖先を通してだけ）・factor・up（このクロスの上がり）
  I.analyze = function (sire, dam) {
    const t = P.tree(sire, dam, 5);
    const pos = new Map();
    for (let g = 0; g < t.length; g++) {
      const arr = t[g], half = arr.length / 2;
      for (let i = 0; i < arr.length; i++) {
        const n = arr[i];
        if (!n) continue;
        if (!pos.has(n)) pos.set(n, []);
        pos.get(n).push([g, i, i < half ? 0 : 1]);
      }
    }
    let list = [];
    for (const [n, ps] of pos) {
      const sg = ps.filter(p => p[2] === 0).map(p => p[0] + 1), dg = ps.filter(p => p[2] === 1).map(p => p[0] + 1);
      if (!sg.length || !dg.length) continue;
      let pct = 0;
      for (const p of ps) pct += Math.pow(0.5, p[0] + 1);
      pct *= 100;
      list.push({ name: n, sire: sg, dam: dg, label: sg.join('・') + '×' + dg.join('・'), pct, ps });
    }
    const names = new Set(list.map(c => c.name));
    for (const c of list) {
      // どの位置も、仔に近い側（子孫の位置）にほかのクロスの祖先がいれば、その祖先を通してだけ出てくる
      c.via = c.ps.every(p => {
        let i = p[1] >> 1;
        for (let g = p[0] - 1; g >= 0; g--) { const n = t[g][i]; if (n && n !== c.name && names.has(n)) return true; i >>= 1; }
        return false;
      });
      delete c.ps;
    }
    list.sort((a, b) => b.pct - a.pct);
    const up = {}, raw = {};
    for (const k of H.STATS) { up[k] = 0; raw[k] = 0; }
    let risk = 0;
    for (const c of list) {
      c.tier = I.tierOf(c.pct);
      c.factor = I.factorOf(c.name);
      c.up = {};
      if (c.via || c.pct >= I.BLOCK_PCT) continue;
      const T = I.TIERS[c.tier];
      for (let j = 0; j < c.factor.length; j++) {
        const k = c.factor[j], v = j === 0 ? T.up : Math.max(1, Math.round(T.up * I.SECOND));
        c.up[k] = v; raw[k] += v;
      }
      risk += T.chance * T.risk;
    }
    for (const k of H.STATS) up[k] = Math.min(I.STAT_CAP, raw[k]);
    let block = null;
    const sp = P.parents(sire), dp = P.parents(dam);
    if (sire && dam && sp[0] && sp[1] && sp[0] === dp[0] && sp[1] === dp[1]) block = '近すぎる（全きょうだい）';
    else { const c = list.find(x => x.pct >= I.BLOCK_PCT); if (c) block = `近すぎる（${c.name}の${c.label}）`; }
    return { block, crosses: list, up, raw, risk: Math.round(Math.min(I.RISK_CAP, risk) * 10) / 10 };
  };
  // 健康の下がり（仔を作るとき）。濃い段ほど下がりやすい
  I.healthDrop = function (rng, an) {
    let d = 0;
    for (const c of an.crosses) {
      if (c.via || c.pct >= I.BLOCK_PCT) continue;
      const T = I.TIERS[c.tier];
      if (T.chance > 0 && rng.chance(T.chance)) d += T.risk * (0.5 + rng.next());
    }
    return Math.round(Math.min(I.RISK_CAP, d));
  };
  // 画面の文：「ノーザンダンサーの3×4（芝スピード＋3・根性＋2）」
  I.upText = function (up) {
    const out = [];
    for (const k of H.STATS) if (up[k]) out.push(`${H.STAT_LABEL[k]}＋${up[k]}`);
    return out.join('・');
  };
  I.text = function (c) {
    const u = I.upText(c.up);
    return `${c.name}の${c.label}（${u || (c.factor.length ? '効き目なし' : '因子なし')}${c.tier === 0 ? '・健康が下がりやすい' : ''}）`;
  };
  // 画面に出すクロス（ほかのクロスを通してだけ出てくる祖先は出さない）
  I.shown = an => an.crosses.filter(c => !c.via);
})();
