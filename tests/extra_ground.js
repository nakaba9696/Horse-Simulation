// 検証：馬場の状態（良・稍重・重・不良）。docs/BALANCE.md「14. 馬場の状態」
// 持ち主の決定 2026-10-20「道悪のパラメータ　高いほど重馬場でスピードが減りにくいにする…基本的に重馬場は全員スピードステータスにデバフがかかりますが
// 道悪のパラメータが高いほど効きにくいです　スタミナの減り、切れは道悪関係なく全馬共通で」
module.exports = function (check, assert, HS) {
  const S = HS.Sim, U = HS.U, H = HS.Horse;
  const B = require('../tools/ground_bench.js');
  const N = process.env.QUICK ? 60 : 120;
  const race = (ground, o) => Object.assign({ dist: 2000, surface: '芝', course: '東京', ground, year: 2004, month: 5 }, o || {});
  const horse = (heavy, kire) => ({ apt: { heavy }, kire: kire || 4 });

  check('ground: スタミナの減りと切れの効きは全馬共通（道悪の適性で変わらない）。道悪の段・距離・切れで決まる', () => {
    // 良では何も変わらない
    for (const a of [20, 66, 95]) {
      const g0 = S.groundFx(horse(a), race('良'));
      assert(g0.e === 1 && g0.k === 1 && S.groundDrop(horse(a), race('良')) === 0, `良で効いた（道悪 ${a}）`);
    }
    // 道悪の適性で e・k が変わらない（芝・ダート、どの段でも）
    for (const sf of ['芝', 'ダ']) for (const g of ['稍重', '重', '不良']) for (const kire of [2, 4, 7]) {
      const f = [25, 35, 66, 90, 100].map(a => S.groundFx(horse(a, kire), race(g, { surface: sf })));
      assert(f.every(x => x.e === f[0].e && x.k === f[0].k), `${sf}・${g}・切れ${kire}：道悪の適性でスタミナ・切れの効きが変わった`);
    }
    // 道悪の段が上がるほど大きく
    let pe = 1, pk = 1;
    for (const g of ['稍重', '重', '不良']) {
      const f = S.groundFx(horse(66), race(g));
      assert(f.e > pe && f.k < pk, `${g}：スタミナ ${f.e.toFixed(3)}・切れ ${f.k.toFixed(3)} が前の段より効いていない`);
      pe = f.e; pk = f.k;
    }
    // 大きさは前の「ふつう（66）の馬」と同じくらい（不良・芝2000・切れ4 で スタミナ ×1.031・切れ ×0.957）
    const mid = S.groundFx(horse(66), race('不良'));
    assert(mid.e > 1.02 && mid.e < 1.045 && mid.k > 0.94 && mid.k < 0.97, `不良・芝2000 の効き（×${mid.e.toFixed(3)}・×${mid.k.toFixed(3)}）`);
    // 長い距離ほどスタミナの減りの効きが大きく、切れる馬ほど切れの損が大きい
    const short = S.groundFx(horse(40), race('重', { dist: 1200 })), long = S.groundFx(horse(40), race('重', { dist: 3200 }));
    assert(long.e > short.e, `長い距離 ×${long.e.toFixed(3)}・短い距離 ×${short.e.toFixed(3)}`);
    const k7 = S.groundFx(horse(40, 7), race('不良')), k2 = S.groundFx(horse(40, 2), race('不良'));
    assert(k7.k < k2.k, `切れ7 ×${k7.k.toFixed(3)}・切れ2 ×${k2.k.toFixed(3)}`);
    // 出走表・パドックの印は馬の詳しい画面と同じ境目（45 未満が苦手・75 以上が得意）
    assert(S.mudLabel(44) === '苦手' && S.mudLabel(45) === 'ふつう' && S.mudLabel(74) === 'ふつう' && S.mudLabel(75) === '得意' && S.mudLabel(undefined) === 'ふつう', '道悪の印の境目');
    return `不良・芝2000・切れ4：全馬 スタミナ×${mid.e.toFixed(3)}・切れ×${mid.k.toFixed(3)}（切れ2 ×${k2.k.toFixed(3)}・切れ7 ×${k7.k.toFixed(3)}）`;
  });

  check('ground: 道悪ではスピード（強さの点）が全馬下がり、道悪の適性が高いほど下がりにくい', () => {
    const out = [];
    for (const sf of ['芝', 'ダ']) {
      let prev = null;
      for (const g of ['稍重', '重', '不良']) {
        const d = a => S.groundDrop(horse(a), race(g, { surface: sf }));
        assert(d(35) > d(66) && d(66) > d(90) && d(90) >= 0, `${sf}・${g}：下がりの順（35 ${d(35).toFixed(2)}・66 ${d(66).toFixed(2)}・90 ${d(90).toFixed(2)}）`);
        assert(d(90) < d(66) * 0.2, `${sf}・${g}：得意（90）がほとんど下がらない、にならない（${d(90).toFixed(2)}）`);
        assert(d(35) > d(66) * 2, `${sf}・${g}：苦手（35）が大きく下がらない（${d(35).toFixed(2)}）`);
        // 連続の値（段の境目で跳ばない）・適性が上がるほど下がりは小さい（0 は「無い」と同じ 50 に読む）
        for (let a = 1; a < 100; a++) assert(d(a + 1) <= d(a) && d(a) - d(a + 1) < d(66) * 0.06, `${sf}・${g}：適性 ${a}→${a + 1} で跳んだ`);
        if (prev) assert(d(66) > prev, `${sf}・${g}：段が上がっても下がりが大きくならない`);
        prev = d(66);
        if (g === '不良') out.push(`${sf}不良 35 −${d(35).toFixed(1)}・66 −${d(66).toFixed(1)}・90 −${d(90).toFixed(1)}点`);
      }
    }
    // 強さの点（S.power）に入り、良では道悪の適性で何も変わらない
    const pw = (a, g) => S.power(Object.assign(H.makeFiller(new U.RNG(3), { level: 80, surface: '芝', dist: 2000, born: 2000 }), { apt: { turf: 100, dirt: 50, heavy: a } }), race(g), null, {}).total;
    assert(pw(35, '良') === pw(90, '良'), '良で道悪の適性が強さに効いた');
    assert(pw(35, '不良') < pw(66, '不良') && pw(66, '不良') < pw(90, '不良') && pw(90, '不良') < pw(90, '良'), '不良の強さの順');
    return out.join('／');
  });

  check('ground: 模擬の中のスタミナの減りは道悪の適性で変わらない（同じ種で、1000m 通過のスタミナの残り）', () => {
    const run = (ground, heavy) => {
      const rng = new U.RNG(7), field = [];
      for (let i = 0; i < 10; i++) { const h = H.makeFiller(rng, { level: 80, surface: '芝', dist: 2000, born: 2000 }); h.apt.heavy = heavy; h.style = '先行'; field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      const sim = S.create(race(ground), field, H.weekIndex(2004, 5, 1), new U.RNG(11), {});
      while (sim.st[0].x < 1000) S.step(sim);
      return sim.st[0].E;
    };
    const g35 = run('良', 35), g90 = run('良', 90), b35 = run('不良', 35), b66 = run('不良', 66), b90 = run('不良', 90);
    assert(g35 === g90, `良で道悪の適性がスタミナに効いた（${g35}・${g90}）`);
    assert(Math.abs(b35 - b90) < 0.03 && Math.abs(b66 - b90) < 0.03, `不良のスタミナの残りが道悪の適性で大きく違う（35 ${b35.toFixed(3)}・66 ${b66.toFixed(3)}・90 ${b90.toFixed(3)}）`);
    return `1000m 通過のスタミナ：良 ${g35.toFixed(2)}・不良 35 ${b35.toFixed(2)}・66 ${b66.toFixed(2)}・90 ${b90.toFixed(2)}`;
  });

  check('ground: 走破タイムの目安（全馬の道悪の適性をそろえたレース。不良・芝2000 で ふつうは良より 2〜3 秒・苦手は 1 秒前後遅く・得意は 0.5〜1 秒速い）', () => {
    const t = {};
    for (const all of [35, 66, 90]) for (const g of B.GROUNDS) t[all + g] = B.bench({ surface: '芝', dist: 2000, ground: g, all, N }).time;
    assert(t['35良'] === t['66良'] && t['66良'] === t['90良'], '良で道悪の適性が走破タイムに効いた');
    assert(t['66良'] > 115 && t['66良'] < 122, `良の芝2000 ${U.time(t['66良'])}`);
    for (const g of ['稍重', '重', '不良']) assert(t['35' + g] > t['66' + g] && t['66' + g] > t['90' + g], `${g}：35・66・90 の順に遅くない（${[35, 66, 90].map(a => U.time(t[a + g])).join('・')}）`);
    assert(t['66良'] < t['66稍重'] && t['66稍重'] < t['66重'] && t['66重'] < t['66不良'], '芝の道悪ほど遅い');
    const slow = t['66不良'] - t['66良'], bad = t['35不良'] - t['66不良'], good = t['66不良'] - t['90不良'];
    assert(slow >= 2 && slow <= 3, `ふつうの馬の不良と良の差 ${slow.toFixed(2)}秒`);
    assert(bad >= 0.7 && bad <= 1.5, `苦手な馬の遅れ ${bad.toFixed(2)}秒`);
    assert(good >= 0.5 && good <= 1, `得意な馬の得 ${good.toFixed(2)}秒`);
    // ダート：ふつうの馬は道悪でも良とほぼ同じか少し速い（前からの決まり）。35・66・90 の順に遅い
    const td = {};
    for (const all of [35, 66, 90]) for (const g of ['良', '不良']) td[all + g] = B.bench({ surface: 'ダ', dist: 1600, ground: g, all, N }).time;
    assert(Math.abs(td['66不良'] - td['66良']) < 0.6, `ダ1600 ふつう 良 ${U.time(td['66良'])}・不良 ${U.time(td['66不良'])}`);
    assert(td['35不良'] > td['66不良'] && td['66不良'] > td['90不良'], `ダ1600 不良の順 ${[35, 66, 90].map(a => U.time(td[a + '不良'])).join('・')}`);
    return `芝2000 不良−良：ふつう +${slow.toFixed(2)}・苦手は +${bad.toFixed(2)} 遅く・得意は ${good.toFixed(2)} 速い／ダ1600 不良 ${[35, 66, 90].map(a => `${a} ${(td[a + '不良'] - td[a + '良']).toFixed(2)}`).join('・')}`;
  });

  check('ground: 不良で道悪の苦手な馬は着順を大きく落とし、得意な馬は上げる（ほかは史実馬の散らばり）', () => {
    const o = { surface: '芝', dist: 2000, field: 'hist', N };
    const r = {};
    for (const heavy of [35, 66, 90]) for (const g of ['良', '不良']) r[heavy + g] = B.bench(Object.assign({ heavy, ground: g }, o));
    assert(r['35不良'].pos > r['35良'].pos + 1.2 && r['35不良'].win < r['35良'].win, `苦手な馬：良 ${r['35良'].pos.toFixed(2)}着・不良 ${r['35不良'].pos.toFixed(2)}着`);
    assert(r['90不良'].pos < r['90良'].pos - 0.5, `得意な馬が不良で上がらない（良 ${r['90良'].pos.toFixed(2)}・不良 ${r['90不良'].pos.toFixed(2)}）`);
    assert(Math.abs(r['66不良'].pos - r['66良'].pos) < 0.8, `ふつうの馬が大きく動いた（良 ${r['66良'].pos.toFixed(2)}・不良 ${r['66不良'].pos.toFixed(2)}）`);
    return `芝2000 平均着順 苦手(35) ${r['35良'].pos.toFixed(1)}→${r['35不良'].pos.toFixed(1)}・ふつう(66) ${r['66良'].pos.toFixed(1)}→${r['66不良'].pos.toFixed(1)}・得意(90) ${r['90良'].pos.toFixed(1)}→${r['90不良'].pos.toFixed(1)}`;
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
    assert(S.groundDrop(bad, race('不良')) > S.groundDrop(plain, race('不良')) * 2, '苦手の馬が不良で大きく損をしない');
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
