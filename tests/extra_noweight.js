// 確かめ：斤量の仕組みは無い（持ち主の決定 2026-10-21「このゲームでは斤量というシステム自体なくしていいです」）
// 斤量は強さ（S.power）に効かない・見習いの減量（HS.Jockey.allowance）は無い・自分が乗る馬の斤量を減らさない
module.exports = function (check, assert, HS) {
  const U = HS.U, H = HS.Horse, S = HS.Sim;
  check('noweight: 斤量は強さに効かない', () => {
    const race = { name: 'テスト', course: '東京', surface: '芝', dist: 2000, ground: '良', region: 'JRA', year: 2025, month: 5, week: 2, age: '3+', weight: 'ハンデ' };
    const h = H.makeFiller(new U.RNG(5), { level: 80, surface: '芝', dist: 2000, born: 2020 });
    const base = S.power(h, race, null, { jockey: { skill: 75 } }).total;
    for (const w of [48, 52, 56, 58, 60, 62]) {
      const v = S.power(h, race, null, { jockey: { skill: 75 }, weight: w }).total;
      assert(v === base, `斤量 ${w} で強さが変わった（${v} ≠ ${base}）`);
    }
  });
  check('noweight: 見習いの減量は無い', () => {
    assert(!HS.Jockey || (HS.Jockey.allowance === undefined && HS.Jockey.allowanceMark === undefined), 'HS.Jockey.allowance が残っている');
  });
};
