// 暦の補い：格付けの無い重賞だった年・新設の重賞など（勝ち馬の記録に合わせて足したもの）
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  HS.DATA.races = (HS.DATA.races || []).concat([
    { name: '葵ステークス', short: '葵S', grade: 'G3', region: 'JRA', course: '京都', surface: '芝', dist: 1200, month: 5, week: 4, age: '3', weight: '馬齢', prize: 3800, from: 2018, to: 2020, note: '格付けの無い重賞' },
    { name: '葵ステークス', short: '葵S', grade: 'G3', region: 'JRA', course: '中京', surface: '芝', dist: 1200, month: 5, week: 4, age: '3', weight: '馬齢', prize: 3800, from: 2021, to: 2021, note: '格付けの無い重賞' },
    { name: 'レパードステークス', short: 'レパードS', grade: 'G3', region: 'JRA', course: '新潟', surface: 'ダ', dist: 1800, month: 8, week: 1, age: '3', weight: '別定', prize: 3800, from: 2009, to: 2010, note: '格付けの無い重賞' },
    { name: 'サウジアラビアロイヤルカップ', short: 'サウジアラビアRC', grade: 'G3', region: 'JRA', course: '東京', surface: '芝', dist: 1600, month: 10, week: 2, age: '2', weight: '馬齢', prize: 3300, from: 2014, to: 2015, note: '格付けの無い重賞' },
    { name: 'アルテミスステークス', short: 'アルテミスS', grade: 'G3', region: 'JRA', course: '東京', surface: '芝', dist: 1600, month: 10, week: 4, age: '2', sex: '牝', weight: '馬齢', prize: 3100, from: 2012, to: 2013, note: '格付けの無い重賞' },
    { name: 'ターコイズステークス', short: 'ターコイズS', grade: 'G3', region: 'JRA', course: '中山', surface: '芝', dist: 1600, month: 12, week: 3, age: '3+', sex: '牝', weight: 'ハンデ', prize: 4100, from: 2015, to: 2016, note: '格付けの無い重賞' },
    { name: 'しらさぎステークス', short: 'しらさぎS', grade: 'G3', region: 'JRA', course: '阪神', surface: '芝', dist: 1600, month: 6, week: 4, age: '3+', weight: '別定', prize: 4300, from: 2025, to: 9999 },
    { name: 'サファイヤステークス', short: 'サファイヤS', grade: 'G3', region: 'JRA', course: '阪神', surface: '芝', dist: 2000, month: 7, week: 2, age: '3', sex: '牝', weight: '別定', prize: 3000, from: 1983, to: 1995, uncertain: true },
    { name: '川崎記念', short: '川崎記念', grade: 'G1', region: '地方', course: '川崎', surface: 'ダ', dist: 2000, month: 1, week: 4, age: '4+', weight: '定量', prize: 6000, from: 1995, to: 1995, uncertain: true },
  ]);
})();
