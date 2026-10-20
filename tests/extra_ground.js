// 検証：馬場の状態（良・稍重・重・不良）がスタミナの減りと脚の切れに効き、道悪の苦手な馬が大きく損をする（持ち主の決定 2026-10-20。docs/BALANCE.md「14. 馬場の状態」）
module.exports = function (check, assert, HS) {
  const S = HS.Sim, U = HS.U, H = HS.Horse;
  const B = require('../tools/ground_bench.js');
  const N = process.env.QUICK ? 60 : 120;
  const race = (ground, o) => Object.assign({ dist: 2000, surface: '芝', course: '東京', ground, year: 2004, month: 5 }, o || {});
  const horse = (heavy, kire) => ({ apt: { heavy }, kire: kire || 4 });

  check('ground: 道悪ほどスタミナの減りが速く、切れが鈍る。苦手な馬ほど大きく、得意な馬はほとんど変わらない', () => {
    // 良では何も変わらない（前の結果のまま）
    const g0 = S.groundFx(horse(20), race('良'));
    assert(g0.e === 1 && g0.k === 1, '良で効いた');
    // 道悪の段が上がるほど大きく
    let pe = 1, pk = 1;
    for (const g of ['稍重', '重', '不良']) {
      const f = S.groundFx(horse(40), race(g));
      assert(f.e > pe && f.k < pk, `${g}：スタミナ ${f.e.toFixed(3)}・切れ ${f.k.toFixed(3)} が前の段より効いていない`);
      pe = f.e; pk = f.k;
    }
    // 苦手な馬（道悪 25）は大きく、ふつう（66）は小さく、得意（90）は逆に少し得
    const bad = S.groundFx(horse(25), race('不良')), mid = S.groundFx(horse(66), race('不良')), good = S.groundFx(horse(90), race('不良'));
    assert(bad.e >= 1.35 && bad.k <= 0.6, `苦手な馬の損が小さい（スタミナ ×${bad.e.toFixed(2)}・切れ ×${bad.k.toFixed(2)}）`);
    assert(mid.e < 1.1 && mid.k > 0.9, `ふつうの馬の損が大きい（×${mid.e.toFixed(2)}・×${mid.k.toFixed(2)}）`);
    assert(good.e <= 1 && good.e > 0.95 && good.k >= 1 && good.k < 1.1, `得意な馬が損をした・得をしすぎ（×${good.e.toFixed(3)}・×${good.k.toFixed(3)}）`);
    // 長い距離ほどスタミナの減りの効きが大きい
    const short = S.groundFx(horse(40), race('重', { dist: 1200 })), long = S.groundFx(horse(40), race('重', { dist: 3200 }));
    assert(long.e > short.e, `長い距離 ×${long.e.toFixed(3)}・短い距離 ×${short.e.toFixed(3)}`);
    // 切れる馬ほど切れの損が大きい
    const k7 = S.groundFx(horse(40, 7), race('不良')), k2 = S.groundFx(horse(40, 2), race('不良'));
    assert(k7.k < k2.k, `切れ7 ×${k7.k.toFixed(3)}・切れ2 ×${k2.k.toFixed(3)}`);
    // 出走表・パドックの印は馬の詳しい画面と同じ境目（45 未満が苦手・75 以上が得意）
    assert(S.mudLabel(44) === '苦手' && S.mudLabel(45) === 'ふつう' && S.mudLabel(74) === 'ふつう' && S.mudLabel(75) === '得意' && S.mudLabel(undefined) === 'ふつう', '道悪の印の境目');
    return `不良・芝2000：苦手(25) スタミナ×${bad.e.toFixed(2)}・切れ×${bad.k.toFixed(2)}／ふつう(66) ×${mid.e.toFixed(2)}・×${mid.k.toFixed(2)}／得意(90) ×${good.e.toFixed(2)}・×${good.k.toFixed(2)}`;
  });

  check('ground: 模擬の中でも道悪でスタミナの減りが速い（同じ馬・同じ種で、道中のスタミナの残り）', () => {
    const run = (ground, heavy) => {
      const rng = new U.RNG(7), field = [];
      for (let i = 0; i < 10; i++) { const h = H.makeFiller(rng, { level: 80, surface: '芝', dist: 2000, born: 2000 }); h.apt.heavy = heavy; h.style = '先行'; field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      const sim = S.create(race(ground), field, H.weekIndex(2004, 5, 1), new U.RNG(11), {});
      while (sim.st[0].x < 1000) S.step(sim);
      return sim.st[0].E;
    };
    const good = run('良', 40), heavyBad = run('不良', 40), heavyGood = run('不良', 90);
    assert(heavyBad < good - 0.04, `1000m で不良の苦手な馬の残り ${heavyBad.toFixed(3)}・良 ${good.toFixed(3)}`);
    assert(Math.abs(heavyGood - good) < 0.03, `得意な馬は良と同じくらい（${heavyGood.toFixed(3)}・良 ${good.toFixed(3)}）`);
    return `1000m 通過のスタミナ：良 ${good.toFixed(2)}・不良で苦手 ${heavyBad.toFixed(2)}・不良で得意 ${heavyGood.toFixed(2)}`;
  });

  check('ground: 不良で道悪の苦手な馬ははっきり負け、得意な馬は負けない。走破タイムは芝の道悪ほど遅い', () => {
    const o = { surface: '芝', dist: 2000, field: 'hist', N };
    const r = {};
    for (const heavy of [25, 66, 90]) for (const g of ['良', '不良']) r[heavy + g] = B.bench(Object.assign({ heavy, ground: g }, o));
    assert(r['25不良'].pos > r['25良'].pos + 3 && r['25不良'].win < 0.02, `苦手な馬：良 ${r['25良'].pos.toFixed(2)}着・不良 ${r['25不良'].pos.toFixed(2)}着・勝率 ${r['25不良'].win}`);
    assert(r['90不良'].pos <= r['90良'].pos, `得意な馬が不良で負けた（良 ${r['90良'].pos.toFixed(2)}・不良 ${r['90不良'].pos.toFixed(2)}）`);
    assert(Math.abs(r['66不良'].pos - r['66良'].pos) < 1.5, `ふつうの馬が大きく動いた（良 ${r['66良'].pos.toFixed(2)}・不良 ${r['66不良'].pos.toFixed(2)}）`);
    // 走破タイム：芝は良 < 稍重 < 重 < 不良（不良は良より 2〜7 秒遅い）。ダートは道悪でやや速い（前からの決まり）
    const t = {};
    for (const g of B.GROUNDS) t[g] = B.bench({ surface: '芝', dist: 2000, ground: g, N: Math.round(N / 2) }).time;
    assert(t['良'] < t['稍重'] && t['稍重'] < t['重'] && t['重'] < t['不良'], `芝の走破タイムの並び ${B.GROUNDS.map(g => U.time(t[g])).join('・')}`);
    assert(t['不良'] - t['良'] > 2 && t['不良'] - t['良'] < 7, `芝2000の不良と良の差 ${(t['不良'] - t['良']).toFixed(1)}秒`);
    assert(t['良'] > 115 && t['良'] < 122, `良の芝2000 ${U.time(t['良'])}`);
    const td = { '良': B.bench({ surface: 'ダ', dist: 1600, ground: '良', N: Math.round(N / 2) }).time, '不良': B.bench({ surface: 'ダ', dist: 1600, ground: '不良', N: Math.round(N / 2) }).time };
    assert(td['不良'] <= td['良'] + 0.3 && td['不良'] > td['良'] - 2, `ダ1600 良 ${U.time(td['良'])}・不良 ${U.time(td['不良'])}`);
    return `芝2000 平均着順 苦手(25) ${r['25良'].pos.toFixed(1)}→${r['25不良'].pos.toFixed(1)}・ふつう(66) ${r['66良'].pos.toFixed(1)}→${r['66不良'].pos.toFixed(1)}・得意(90) ${r['90良'].pos.toFixed(1)}→${r['90不良'].pos.toFixed(1)}　勝ち時計 ${B.GROUNDS.map(g => `${g}${U.time(t[g])}`).join('・')}`;
  });

  check('ground: 不良で道悪の苦手な馬は、切れる馬ほど損が大きい', () => {
    const o = { surface: '芝', dist: 2000, field: 'hist', heavy: 45, style: '差し', N };
    const k2 = { g: B.bench(Object.assign({ kire: 2, ground: '良' }, o)), b: B.bench(Object.assign({ kire: 2, ground: '不良' }, o)) };
    const k7 = { g: B.bench(Object.assign({ kire: 7, ground: '良' }, o)), b: B.bench(Object.assign({ kire: 7, ground: '不良' }, o)) };
    const l2 = k2.b.pos - k2.g.pos, l7 = k7.b.pos - k7.g.pos;
    assert(l7 > l2 + 1, `切れ7 の損 ${l7.toFixed(2)}・切れ2 の損 ${l2.toFixed(2)}`);
    return `道悪45・差し：切れ2 ${k2.g.pos.toFixed(1)}→${k2.b.pos.toFixed(1)}・切れ7 ${k7.g.pos.toFixed(1)}→${k7.b.pos.toFixed(1)}`;
  });
  // 史実馬の道悪の適性（data/mud.js。docs/BALANCE.md「14-6」）：史実で得手不得手がはっきりした馬だけ。ほかは 66
  check('ground: 史実馬の道悪の適性（得意 90・苦手 35・ほかは 66）', () => {
    const D = HS.DATA, SP = HS.Special;
    const of = n => { const d = (SP && SP.data(n)) || D.historic.find(x => x.name === n); assert(d, `${n} がデータに無い`); return H.fromHistoric(d, 'mudtest'); };
    const good = of('ブローザホーン'), bad = of('モンテプリンス'), plain = of('テイエムオペラオー');
    assert(good.apt.heavy === 90 && S.mudLabel(good.apt.heavy) === '得意' && good.skills.includes('mud'), `ブローザホーンが得意でない ${good.apt.heavy} ${good.skills}`);
    // 名馬の表で特殊能力を決めた馬にも道悪○が付く
    const orf = of('オルフェーヴル');
    assert(orf.apt.heavy === 90 && orf.skills.includes('mud') && orf.skills.includes('big'), `オルフェーヴル ${orf.apt.heavy} ${orf.skills}`);
    assert(bad.apt.heavy === 35 && S.mudLabel(bad.apt.heavy) === '苦手' && !bad.skills.includes('mud'), `モンテプリンスが苦手でない ${bad.apt.heavy}`);
    assert(S.groundFx(bad, race('不良')).e > 1.3, '苦手の馬が不良で大きく損をしない');
    assert(plain.apt.heavy === 66 && S.mudLabel(66) === 'ふつう', `書いていない馬が 66 でない ${plain.apt.heavy}`);
    // 表の馬は全部データにいて、表に無い史実馬は全員 66
    const fix = D.mudFix || {};
    for (const n of Object.keys(fix)) of(n);
    let nG = 0, nB = 0, other = 0;
    for (const d of D.historic) {
      const h = H.fromHistoric(d, 'mudtest');
      if (fix[d.name]) { if (h.apt.heavy === 90) nG++; else if (h.apt.heavy === 35) nB++; }
      else if (h.apt.heavy !== 66) other++;
    }
    assert(other === 0, `表に無いのに 66 でない史実馬 ${other}頭`);
    assert(Object.values(fix).every(f => f.why && (f.heavy === 90 || f.heavy === 35)), '表の値か根拠が無い');
    return `表 ${Object.keys(fix).length}頭（史実馬の中で得意 ${nG}・苦手 ${nB}）`;
  });
};
