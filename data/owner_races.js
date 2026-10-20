// オーナーの依頼（ミッション）の「OP の段階」で使う、名前のあるオープン（実在の JRA のオープン・リステッド）。
// 番組はふだん、オープンを競馬場ごとに作る（js/core/races.js の R.openOf。名前は「2歳オープン」など）。ミッションは馬とレースを固定するので、
// 依頼に使う8つだけ名前のあるレースとして番組に足す（js/core/owners.js が R.ofWeek を包んで、年代なしのゲームの週に足す。Godot 版は HSRaces.of_week）。
// 項目は data/races.js の重賞と同じ形（grade は無し。cls は OP、listed はリステッド）。月・週はゲームの暦（月4週）での位置。
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  HS.DATA.ownerRaces = [
    { name: 'カトレアステークス', cls: 'OP', listed: false, region: 'JRA', course: '東京', surface: 'ダ', dist: 1600, month: 11, week: 4, age: '2', weight: '馬齢' },
    { name: 'すずらん賞', cls: 'OP', listed: false, region: 'JRA', course: '札幌', surface: '芝', dist: 1200, month: 7, week: 4, age: '2', weight: '馬齢' },
    { name: '芙蓉ステークス', cls: 'OP', listed: false, region: 'JRA', course: '中山', surface: '芝', dist: 2000, month: 9, week: 4, age: '2', weight: '馬齢' },
    { name: '万葉ステークス', cls: 'OP', listed: false, region: 'JRA', course: '京都', surface: '芝', dist: 3000, month: 1, week: 1, age: '4+', weight: 'ハンデ' },
    { name: 'エルフィンステークス', cls: 'OP', listed: true, region: 'JRA', course: '京都', surface: '芝', dist: 1600, month: 2, week: 2, age: '3', sex: '牝', weight: '馬齢' },
    { name: 'ブラジルカップ', cls: 'OP', listed: true, region: 'JRA', course: '東京', surface: 'ダ', dist: 2100, month: 10, week: 4, age: '3+', weight: 'ハンデ' },
    { name: 'メトロポリタンステークス', cls: 'OP', listed: true, region: 'JRA', course: '東京', surface: '芝', dist: 2400, month: 5, week: 1, age: '4+', weight: '別定' },
    { name: 'カンナステークス', cls: 'OP', listed: false, region: 'JRA', course: '中山', surface: '芝', dist: 1200, month: 9, week: 2, age: '2', weight: '馬齢' },
  ];
})();
