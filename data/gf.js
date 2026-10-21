// 年末のグランドフェスティバル（GF）の区分。持ち主の仕様書（docs/SPEC.md の「GF」・2026-10-19）と持ち主の決定（2026-10-19「牝馬の GF は無し」「GF スプリントは芝1200m」）
// 並びは画面と出走の順。招待の票・確定の G1 を数えるレースは votes（surface＝芝かダ・min〜max＝距離）。trophy：勝ったお手馬に付くトロフィーの名前。
// nameEn・trophyEn は英語の名前（持ち主の決定 2026-10-21「言語は日本語と英語にしたい」）。
// 担当の伝説級は data/legends.js の馬ごとの gf に書く（ここには書かない）。
// 競馬場の名前は data/courses.js の名前（パリロンシャン＝ロンシャン、ベルモントパーク＝ベルモント）。
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  HS.DATA.gf = [
    { id: 'sprint', nameEn: 'Grand Festival Sprint', trophyEn: 'GF Sprint Champion', label: '短距離', course: 'カラ', surface: '芝', dist: 1200, trophy: 'GF スプリント覇者', votes: { surface: '芝', min: 0, max: 1400 } },
    { id: 'mile', nameEn: 'Grand Festival Mile', trophyEn: 'GF Mile Champion', label: 'マイル', course: 'ニューマーケット', surface: '芝', dist: 1600, trophy: 'GF マイル覇者', votes: { surface: '芝', min: 1401, max: 1800 } },
    { id: 'distance', nameEn: 'Grand Festival Distance', trophyEn: 'GF Distance Champion', label: '中距離', course: 'エプソム', surface: '芝', dist: 2000, trophy: 'GF ディスタンス覇者', votes: { surface: '芝', min: 1801, max: 2200 } },
    { id: 'classic', nameEn: 'Grand Festival Classic', trophyEn: 'GF Classic Champion', label: 'クラシック', course: 'ロンシャン', surface: '芝', dist: 2400, trophy: 'GF クラシック覇者', votes: { surface: '芝', min: 2201, max: 2800 } },
    { id: 'long', nameEn: 'Grand Festival Stayers', trophyEn: 'GF Stayers Champion', label: '長距離', course: 'フレミントン', surface: '芝', dist: 3200, trophy: 'GF ステイヤー覇者', votes: { surface: '芝', min: 2801, max: 9999 } },
    { id: 'dirt', nameEn: 'Grand Festival Dirt', trophyEn: 'GF Dirt Champion', label: 'ダート', course: 'ベルモント', surface: 'ダ', dist: 2000, trophy: 'GF ダート覇者', votes: { surface: 'ダ' } },
  ];
})();
