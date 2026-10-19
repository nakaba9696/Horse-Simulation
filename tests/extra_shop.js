// 確かめ：馬の店の決まり（持ち主の仕様書 2026-10-19「店」）とレーティング（「お手馬画面」「ゲームメニュー画面」）
//   店の馬の年齢は月で変わる（6〜12月は2歳・1〜5月は3歳）・見える評価値と値段はいまの総合力・同じ完成の強さなら晩成が安い
//   レーティング：1走の値＝負かした相手の評価＋着差、馬の値＝良かった3走の平均、部門ごと
// 店で選んでも買わず確かめで買う、は Godot の画面のテスト（godot/tests/test_flow.gd の _shop）が確かめる
// run.js から module.exports(check, assert, HS) で呼ぶ
module.exports = function (check, assert, HS) {
  const W = HS.World, E = HS.Eraless, H = HS.Horse, T = HS.Season, RT = HS.Rating;

  check('shop: 店の馬の年齢は月で変わる（6〜12月は2歳・1〜5月は3歳。同じ生まれ年を6月から翌年5月まで売る）', () => {
    W.newGame({ seed: 31, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const ages = {};
    for (const m of [1, 5, 6, 12]) {
      G.month = m;
      const shop = E.shop();
      assert(shop.length > 0, `${m}月の店が空`);
      const a = new Set(shop.map(it => G.year - it.horse.born));
      assert(a.size === 1 && a.has(m >= 6 ? 2 : 3), `${m}月の店の年齢 ${[...a]}`);
      ages[m] = [...a][0];
    }
    // 5月の3歳と前の年の6月の2歳は同じ生まれ年
    G.month = 5; const b5 = E.shopBorn(); G.year -= 1; G.month = 6; const b6 = E.shopBorn(); G.year += 1;
    assert(b5 === b6, `生まれ年がつながらない（${b5}・${b6}）`);
    G.month = 1;
    return Object.entries(ages).map(([m, a]) => `${m}月 ${a}歳`).join('・');
  });

  check('shop: 見える評価値と値段はいまの総合力。同じ完成の強さなら晩成ほど安く、早熟ほど高い', () => {
    W.newGame({ seed: 32, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const G = W.get();
    const wi = W.wIdx();
    // 店の値段は、いまの総合力から（同じ馬なら E.priceOf と同じ）
    for (const it of E.shop()) assert(it.price === E.priceOf(it.horse, it.legend, wi), `${it.horse.name} の値段がいまの値の式と違う`);
    // 同じ史実馬の成長型だけを替える（完成の強さは同じ）
    const d0 = E.pool().find(d => d.growth === '普通' && d.rating >= 85);
    const out = [];
    for (const [m, age] of [[6, 2], [1, 3]]) {
      G.month = m;
      const w = W.wIdx();
      const pr = {};
      for (const g of ['早熟', '普通', '晩成']) {
        const h = H.fromHistoric(E.shift(Object.assign({}, d0, { growth: g }), (G.year - age) - d0.born), 'test:' + g);
        const pk = T.fhPeak(h), now = E.shopFh(h, w);
        assert(Math.max(now.turf, now.dirt) <= Math.max(pk.turf, pk.dirt), `${g} のいまの値が完成より上`);
        pr[g] = E.priceOf(h, false, w);
      }
      assert(pr['晩成'] < pr['普通'] && pr['普通'] < pr['早熟'], `${m}月：晩成 ${pr['晩成']}・普通 ${pr['普通']}・早熟 ${pr['早熟']}`);
      out.push(`${m}月 早熟${pr['早熟']}・普通${pr['普通']}・晩成${pr['晩成']}`);
    }
    // 普通の馬の値段は、6月の2歳と翌年1月の3歳で大きく変わらない（時期の補い）
    G.month = 6; const h2 = H.fromHistoric(E.shift(d0, (G.year - 2) - d0.born), 't2'); const p6 = E.priceOf(h2, false, W.wIdx());
    G.year += 1; G.month = 1; const p1 = E.priceOf(h2, false, W.wIdx()); G.year -= 1;
    assert(p1 / p6 > 0.5 && p1 / p6 < 2, `普通の馬の値段が時期で大きく変わる（6月 ${p6}・翌1月 ${p1}）`);
    G.month = 1;
    return `${d0.name}（完成は同じ）${out.join(' ／ ')}（万円）`;
  });

  check('rating: 1走の値は負かした相手の評価＋着差。馬の値は良かった3走の平均で、部門ごとにも出せる', () => {
    W.newGame({ seed: 33, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
    const wi = W.wIdx();
    const field = W.all().filter(h => h.loc === 'stable').slice(0, 8);
    assert(field.length === 8, '馬が足りない');
    const race = { dist: 1600, surface: '芝' };
    const mk = gaps => field.map((h, k) => ({ horse: h, lengths: k === 0 ? 0 : gaps[k - 1] }));
    const close = mk([0.2, 0.3, 0.5, 0.5, 1, 1, 1]);
    const wide = mk([5, 0.3, 0.5, 0.5, 1, 1, 1]);
    RT.annotate(race, close, wi); RT.annotate(race, wide, wi);
    assert(wide[0].rt > close[0].rt, `大きな着差で勝つほど高い（${close[0].rt} → ${wide[0].rt}）`);
    for (let k = 1; k < close.length; k++) assert(close[k].rt <= close[k - 1].rt + 8, '着順と値が大きく食い違う');
    // 強い相手を負かすほど高い：相手の評価を上げると勝ち馬の値も上がる
    const v0 = RT.value(field[1], '芝', wi);
    assert(Math.abs(v0 - RT.prior(field[1], '芝', wi)) < 1e-9, 'まだ走っていない馬の評価は総合力からの見積もり');
    // 馬の値：良かった3走の平均・部門
    const h = { results: [{ rt: 100, surface: '芝', dist: 1200 }, { rt: 120, surface: '芝', dist: 2400 }, { rt: 110, surface: 'ダ', dist: 1800 }, { rt: 90, surface: '芝', dist: 1600 }, { rt: 115, surface: '芝', dist: 2000 }] };
    const all = RT.of(h);
    assert(all.v === Math.round((120 + 115 + 110) / 3) && all.n === 5 && all.best === 120, `総合 ${JSON.stringify(all)}`);
    assert(RT.of(h, 'sprint').v === 100 && RT.of(h, 'long').v === 120 && RT.of(h, 'mid').v === 115 && RT.of(h, 'mile').v === 90 && RT.of(h, 'dirt').v === 110, '部門の値');
    assert(RT.divOf('芝', 1400) === 'sprint' && RT.divOf('芝', 1800) === 'mile' && RT.divOf('芝', 2000) === 'mid' && RT.divOf('芝', 2200) === 'long' && RT.divOf('ダ', 1200) === 'dirt', '部門の境目');
    // 定まったレーティング（同じ馬場で3走）があれば、相手の評価はそれ
    assert(RT.value(h, '芝', wi) === Math.round((120 + 115 + 100) / 3), '定まったレーティングを相手の評価に使う');
    // 週を進めると、走った馬の戦績に値が付く
    for (let i = 0; i < 3; i++) W.finishWeek({});
    const rated = W.all().filter(x => (x.results || []).some(r => r.rt != null));
    assert(rated.length > 20, `値の付いた馬が少ない ${rated.length}`);
    const last = rated.flatMap(x => x.results.filter(r => r.rt != null).map(r => r.rt));
    assert(last.every(v => v >= RT.MIN && v <= RT.MAX), '値が範囲の外');
    return `大差の勝ち ${wide[0].rt}・小差 ${close[0].rt}・3週で ${rated.length}頭に値`;
  });
};
