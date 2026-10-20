// レーティング（持ち主の仕様書 2026-10-19「レーティングの付け方は着差や勝った相手で決めたい」）
// 1走ごとの値（h.results[].rt）を、レースが終わったときに付ける（W.applyResults から HS.Rating.annotate）。
//   相手1頭ごとの見積もり ＝ 相手の評価 ＋ 相手との着差（馬身）× 1馬身の重さ
//   その走りの値 ＝ 見積もりの加重平均（着差の近い相手ほど重い：重さ 1 ÷ (1 ＋ 0.4 × 着差)）
//   相手の評価 ＝ 定まったレーティング（同じ馬場で3走以上）。まだなら、いまの総合力（その馬場）からの見積もりと混ぜる
//   1馬身の重さ ＝ 4200 ÷ 距離（1.2〜3.2。短い距離ほど1馬身が重い）。着差は1頭あたり12馬身まで数える
// 馬のレーティング ＝ 良かった3走の平均。部門（短距離・マイル・中距離・長距離・ダート）ごとにも出せる（HS.Rating.of(h, 部門)）。
// 目盛りは国際的なレーティングに寄せた：総合力62の馬（G1を勝つ水準）が110、総合力が1上がると1.25上がる（総合力70で120、80で132.5）。
// 1年回した見本（種5）：勝ち馬のなかほどは条件戦 約99・G3 約112・G2 約115・G1 約120、いちばん上は130ほど
// Godot 版は godot/core/hs_rating.gd（同じ式・同じ並び。世界の進行の一致テストで確かめる）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U;
  const R = HS.Rating = {};
  R.BASE = 110; R.FH0 = 62; R.PER_FH = 1.25;
  R.MIN = 40; R.MAX = 150;
  R.GAP_CAP = 12;  // 1頭あたりの着差は12馬身まで
  R.NEED = 3;      // 3走で定まる
  R.TOP = 3;       // 良かった3走の平均
  R.DIVS = [
    { id: 'sprint', label: '短距離', note: '芝1400mまで' },
    { id: 'mile', label: 'マイル', note: '芝1401〜1899m' },
    { id: 'mid', label: '中距離', note: '芝1900〜2100m' },
    { id: 'long', label: '長距離', note: '芝2101m以上' },
    { id: 'dirt', label: 'ダート', note: 'ダート' },
  ];
  R.divOf = (surface, dist) => surface === 'ダ' ? 'dirt' : dist <= 1400 ? 'sprint' : dist <= 1899 ? 'mile' : dist <= 2100 ? 'mid' : 'long';
  // 走りが部門 div に入るか（'turf' は芝の全部、null は全部）
  const inDiv = (r, div) => !div || (div === 'turf' ? r.surface !== 'ダ' : R.divOf(r.surface, r.dist) === div);
  R.lbPerLength = dist => U.clamp(4200 / dist, 1.2, 3.2);
  // 馬のレーティング（部門 div。無ければ全部）：{ v: 良かった3走の平均, n: 数えた走りの数, best: いちばん良い走り } か null
  R.of = function (h, div) {
    const xs = [];
    for (const r of (h && h.results) || []) if (r.rt != null && inDiv(r, div)) xs.push(r.rt);
    if (!xs.length) return null;
    xs.sort((a, b) => b - a);
    const k = Math.min(R.TOP, xs.length);
    let s = 0; for (let i = 0; i < k; i++) s += xs[i];
    return { v: Math.round(s / k), n: xs.length, best: xs[0] };
  };
  // レーティングの部門すべて（画面の表に）
  R.table = h => { const o = { all: R.of(h, null) }; for (const d of R.DIVS) o[d.id] = R.of(h, d.id); return o; };
  // 総合力からの見積もり（まだ走りの少ない馬の評価）
  R.prior = (h, surface, wIdx) => R.BASE + R.PER_FH * (HS.Season.fh(h, wIdx, surface) - R.FH0);
  // 相手の評価：同じ馬場で n 走あれば (n × レーティング ＋ (3 − n) × 見積もり) ÷ 3（3走以上ならレーティングだけ）
  R.value = function (h, surface, wIdx) {
    const r = R.of(h, surface === 'ダ' ? 'dirt' : 'turf');
    const n = r ? Math.min(R.NEED, r.n) : 0;
    if (n >= R.NEED) return r.v;
    const p = R.prior(h, surface, wIdx);
    return n > 0 ? (n * r.v + (R.NEED - n) * p) / R.NEED : p;
  };
  // レースの結果（着順の並び。各 res に horse・lengths（前の馬との馬身））に、走りの値 res.rt を付ける
  R.annotate = function (race, results, wIdx) {
    const n = results.length;
    if (!n) return;
    const lpl = R.lbPerLength(race.dist);
    const L = [];
    let cum = 0;
    for (let k = 0; k < n; k++) { if (k > 0) cum += Math.min(results[k].lengths || 0, R.GAP_CAP); L.push(cum); }
    const v = results.map(res => R.value(res.horse, race.surface, wIdx));
    for (let i = 0; i < n; i++) {
      let s = 0, sw = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const d = U.clamp(L[j] - L[i], -R.GAP_CAP, R.GAP_CAP);
        const w = 1 / (1 + 0.4 * Math.abs(d));
        s += w * (v[j] + d * lpl);
        sw += w;
      }
      results[i].rt = U.clamp(Math.round(sw > 0 ? s / sw : v[i]), R.MIN, R.MAX);
    }
  };
})();
