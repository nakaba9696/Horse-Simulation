// オーナーの依頼（ミッション）の「OP の段階」で使う、名前のあるオープン（実在の JRA のオープン・リステッド）。
// 番組はふだん、オープンを競馬場ごとに作る（js/core/races.js の R.openOf。名前は「2歳オープン」など）。ミッションは馬とレースを固定するので、
// 依頼に使う8つだけ名前のあるレースとして番組に足す（js/core/owners.js が R.ofWeek を包んで、年代なしのゲームの週に足す。Godot 版は HSRaces.of_week）。
// 項目は data/races.js の重賞と同じ形（grade は無し。cls は OP、listed はリステッド）。月・週はゲームの暦（月4週）での位置（1〜7日＝1週…22日〜＝4週）。
// どのレースも、依頼の馬が史実で勝ったレース（持ち主の決定 2026-10-20「ミッションは史実に基づいて選びたい」。勝ち馬は ja.wikipedia の各レースの記事・馬の記事で確かめた）
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  HS.DATA.ownerRaces = [
    // 地方：ゴールドドリーム（2016年）
    { name: 'ヒヤシンスステークス', cls: 'OP', listed: true, region: 'JRA', course: '東京', surface: 'ダ', dist: 1600, month: 2, week: 3, age: '3', weight: '別定' },
    // 短距離：ロードカナロア（2011年）
    { name: '京洛ステークス', cls: 'OP', listed: false, region: 'JRA', course: '京都', surface: '芝', dist: 1200, month: 11, week: 1, age: '3+', weight: 'ハンデ' },
    // クラシック：トウカイテイオー（1991年）
    { name: '若駒ステークス', cls: 'OP', listed: true, region: 'JRA', course: '京都', surface: '芝', dist: 2000, month: 1, week: 4, age: '3', weight: '馬齢' },
    // 長距離：トウカイトリック（2008年）
    { name: '万葉ステークス', cls: 'OP', listed: false, region: 'JRA', course: '京都', surface: '芝', dist: 3000, month: 1, week: 1, age: '4+', weight: 'ハンデ' },
    // 牝馬：ウオッカ（2007年）
    { name: 'エルフィンステークス', cls: 'OP', listed: true, region: 'JRA', course: '京都', surface: '芝', dist: 1600, month: 2, week: 2, age: '3', sex: '牝', weight: '馬齢' },
    // 欧州：ドウデュース（2021年）
    { name: 'アイビーステークス', cls: 'OP', listed: true, region: 'JRA', course: '東京', surface: '芝', dist: 1800, month: 10, week: 4, age: '2', weight: '馬齢' },
    // 米国：レモンポップ（2020年。米国産）
    { name: 'カトレアステークス', cls: 'OP', listed: false, region: 'JRA', course: '東京', surface: 'ダ', dist: 1600, month: 11, week: 4, age: '2', weight: '馬齢' },
    // 豪州：ハナズゴール（2012年。2014年に豪州の G1 を勝った）
    { name: 'リゲルステークス', cls: 'OP', listed: true, region: 'JRA', course: '阪神', surface: '芝', dist: 1600, month: 12, week: 3, age: '3+', weight: '別定' },
  ];
})();
