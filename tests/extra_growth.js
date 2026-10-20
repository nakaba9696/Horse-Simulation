// 確かめ：成長型は8つ（持ち主の決定 2026-10-20「早熟普通晩成持続に少し種類増やして良い　超晩成とか早め普通とか」）
//   ピークの順・持続の衰えがゆっくり・店の値段の掛け・史実馬の割り当て（勝ち鞍の年齢から。tools/growth_rule.js）・オリジナルホースの引き継ぎ（4:4:2）
//   数は docs/BALANCE.md「11. 成長型」
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const H = HS.Horse, E = HS.Eraless, U = HS.U, W = HS.World, D = HS.DATA;
  const GR = require('../tools/growth_rule.js');
  const at = (g, age) => H.growthFactor({ born: 2000, growth: g }, 2000 * 48 + 12 + age * 48);

  check('growth: 成長型は8つで、ピークは早い順に並ぶ（持続は3歳秋〜7歳と長い）', () => {
    assert(JSON.stringify(H.GROWTHS) === JSON.stringify(['超早熟', '早熟', '早め', '普通', '遅め', '晩成', '超晩成', '持続']), 'H.GROWTHS ' + H.GROWTHS);
    for (const g of H.GROWTHS) assert(H.PEAK[g] && H.PEAK[g][0] < H.PEAK[g][1], 'PEAK ' + g);
    for (const g of H.GROWTHS) assert(H.growthNote(g) && H.GROWTH_INFO[g].color, '説明と色 ' + g);
    const line = H.GROWTHS.slice(0, 7);
    for (let i = 1; i < line.length; i++) {
      const a = H.PEAK[line[i - 1]], b = H.PEAK[line[i]];
      assert(b[0] > a[0] && b[1] > a[1], `ピークの順 ${line[i - 1]} → ${line[i]}`);
    }
    // 満年齢のめやす：超早熟は2歳の夏〜3歳の春、超晩成は5歳の秋〜7歳
    assert(H.PEAK['超早熟'][0] <= 2.35 && H.PEAK['超早熟'][1] <= 3.25, '超早熟 ' + H.PEAK['超早熟']);
    assert(H.PEAK['超晩成'][0] >= 5.4 && H.PEAK['超晩成'][1] >= 7.5, '超晩成 ' + H.PEAK['超晩成']);
    const p = H.PEAK['持続'];
    assert(p[0] === H.PEAK['普通'][0] && p[1] - p[0] >= 3.5, '持続 ' + p);
    // 年齢ごとのいちばん良い型：2歳の夏は超早熟、7歳は超晩成か持続
    assert(at('超早熟', 2.4) === 1 && at('早熟', 2.4) < 1, '2歳の夏');
    assert(at('超晩成', 7.6) === 1 && at('晩成', 7.6) < 1 && at('持続', 7.6) < 1, '7歳の秋');
    return H.GROWTHS.map(g => `${g} ${H.PEAK[g].join('〜')}`).join('・');
  });

  check('growth: 持続はピークが長く、衰えもゆっくり（ほかの型の衰え方は前のまま）', () => {
    // どの年齢でも普通より下にならない
    for (let a = 1.5; a <= 10; a += 0.25) assert(at('持続', a) >= at('普通', a), `持続が普通より弱い（${a}歳）`);
    // ピークを過ぎて同じ年数のあとの衰え：持続は普通の半分より小さい
    const drop = (g, d) => 1 - at(g, H.PEAK[g][1] + d);
    for (const d of [1, 2, 3]) assert(drop('持続', d) < drop('普通', d) * 0.55, `衰え ${d}年 持続 ${drop('持続', d)}・普通 ${drop('普通', d)}`);
    // ほかの型の衰え（前の式 1 − 0.04d − 0.02d²）
    for (const g of H.GROWTHS.filter(g => g !== '持続')) {
      const d = 1.5;
      assert(Math.abs(at(g, H.PEAK[g][1] + d) - Math.max(0.55, 1 - 0.04 * d - 0.02 * d * d)) < 1e-9, '衰えの式 ' + g);
    }
    return `8歳 持続 ${at('持続', 8).toFixed(2)}・普通 ${at('普通', 8).toFixed(2)}・超晩成 ${at('超晩成', 8).toFixed(2)}／9歳 持続 ${at('持続', 9).toFixed(2)}`;
  });

  check('growth: 店の値段の成長型の掛け（超早熟 0.85〜超晩成 1.2・持続 1.1）', () => {
    const want = { '超早熟': 0.85, '早熟': 0.9, '早め': 0.95, '普通': 1, '遅め': 1.07, '晩成': 1.15, '超晩成': 1.2, '持続': 1.1 };
    for (const g of H.GROWTHS) assert(E.GROWTH_PRICE[g] === want[g], `掛け ${g} ${E.GROWTH_PRICE[g]}`);
    W.newGame({ seed: 33, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const wi = W.wIdx();
    const orig = E.shopValue, pr = {};
    try {
      E.shopValue = () => 60;
      for (const g of H.GROWTHS) pr[g] = E.priceOf({ growth: g }, false, wi);
    } finally { E.shopValue = orig; }
    const line = H.GROWTHS.slice(0, 7);
    for (let i = 1; i < line.length; i++) assert(pr[line[i]] > pr[line[i - 1]], `値段の順 ${line[i - 1]} ${pr[line[i - 1]]} → ${line[i]} ${pr[line[i]]}`);
    assert(pr['持続'] > pr['遅め'] && pr['持続'] < pr['晩成'], '持続の値段 ' + pr['持続']);
    // 古いセーブ・知らない型は掛け1
    assert(E.growthPrice({ growth: '???' }) === 1 && E.growthPrice({}) === 1, '知らない型');
    return H.GROWTHS.map(g => `${g} ${pr[g]}`).join('・') + '（万円・評価点60）';
  });

  check('growth: 史実馬の成長型は勝ち鞍の年齢から（2歳と3歳春で終わった＝超早熟・6歳から＝超晩成・3歳から6歳過ぎまで＝持続）', () => {
    // 決まり（tools/growth_rule.js）：年齢は 4月を0とした小数（at）
    const w = (year, age, month) => ({ year, age, at: GR.atOf(age, month) });
    assert(GR.growthOf([w(2000, 2, 12), w(2001, 3, 3)]) === '超早熟', '2歳12月と3歳3月');
    assert(GR.growthOf([w(2000, 2, 12)]) === '早熟', '2歳の1勝だけは早熟');
    assert(GR.growthOf([w(2000, 2, 12), w(2001, 3, 10)]) === '早熟', '3歳の秋も勝てば早熟');
    assert(GR.growthOf([w(2004, 6, 5), w(2005, 7, 12)]) === '超晩成', '6歳と7歳');
    assert(GR.growthOf([w(2004, 6, 5)]) === '遅め', '6歳の1勝だけは遅め');
    assert(GR.growthOf([w(2001, 3, 10), w(2002, 4, 6), w(2003, 5, 6), w(2004, 6, 6)]) === '持続', '3〜6歳');
    assert(GR.growthOf([w(2002, 4, 6), w(2003, 5, 6)]) === '普通', '4・5歳');
    // データ：代表の馬（手で書いた型を勝ち鞍の年齢で見直したもの・記録から作る馬）
    const by = n => D.historic.find(h => h.name === n);
    const want = { 'フジキセキ': '超早熟', 'アグネスタキオン': '超早熟', 'ステイゴールド': '超晩成', 'ダイユウサク': '超晩成', 'ゴールドシップ': '持続', 'カネヒキリ': '持続', 'エネイブル': '持続', 'ディープインパクト': null };
    for (const [n, g] of Object.entries(want)) {
      const h = by(n);
      assert(h, 'データに無い ' + n);
      if (g) assert(h.growth === g, `${n} は ${g}（いま ${h.growth}）`);
      assert(H.GROWTHS.includes(h.growth), n);
    }
    // 型ごとの頭数（史実馬の全部）：新しい3つの型も入っていて、多すぎない
    const cnt = {};
    for (const h of D.historic) cnt[h.growth] = (cnt[h.growth] || 0) + 1;
    for (const g of H.GROWTHS) assert(cnt[g] > 0, '頭数 0 ' + g);
    for (const g of ['超早熟', '超晩成', '持続']) assert(cnt[g] < D.historic.length * 0.05, `${g} が多すぎる ${cnt[g]}`);
    // 世界に出した馬も同じ型（年代なしのゲームで生年をずらしても）
    const hh = H.fromHistoric(Object.assign({}, by('ステイゴールド'), { born: 2010 }), 'test:sg');
    assert(hh.growth === '超晩成', '世界に出した馬 ' + hh.growth);
    return H.GROWTHS.map(g => `${g} ${cnt[g]}`).join('・');
  });

  check('growth: オリジナルホースの成長型は 父 4：母 4：8つの型から 2（古い5つの型の親もそのまま）', () => {
    const O = HS.Original;
    const rng = new U.RNG(77);
    const s = { growth: '早熟' }, m = { growth: '晩成' };
    const n = 20000, c = {};
    for (let i = 0; i < n; i++) { const g = O.childGrowth(rng, s, m); c[g] = (c[g] || 0) + 1; }
    // 父 0.4＋0.2/8・母 0.4＋0.2/8・そのほかの型はそれぞれ 0.2/8
    assert(Math.abs(c['早熟'] / n - 0.425) < 0.015 && Math.abs(c['晩成'] / n - 0.425) < 0.015, '父母 ' + JSON.stringify(c));
    for (const g of H.GROWTHS.filter(g => g !== '早熟' && g !== '晩成')) assert(Math.abs((c[g] || 0) / n - 0.025) < 0.008, `${g} ${(c[g] || 0) / n}`);
    // 親の型が無い・知らない型なら普通
    for (let i = 0; i < 200; i++) assert(H.GROWTHS.includes(O.childGrowth(rng, {}, { growth: 'xx' })), '知らない型');
    return Object.entries(c).map(([g, v]) => `${g} ${(v / n * 100).toFixed(1)}％`).join('・');
  });
};
