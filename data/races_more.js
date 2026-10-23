/*
 * races_more.js — 暦に無かった海外の大レース
 *  1. トロフィー（data/trophies.js・持ち主の仕様書 docs/SPEC.md の「トロフィー」）に要るもの
 *  2. 世界の有名な重賞（持ち主の決定 2026-10-19「世界の有名な重賞は入れてほしい」）。各国の G1 の一覧（en.wikipedia の List of British / Irish / French /
 *     German flat horse races・List of American and Canadian Graded races・List of Australian Group races。2026-10-19 に確認）と、日本の馬がよく出る中東の重賞
 *  - 書式は races.js・races_world.js と同じ。prize は1着賞金（万円・概算）。月・週は2025年の施行日から（1〜7日＝1週…22日〜＝4週）
 *  - 年代なしのゲームは2025年の番組で走るので、いまの形（競馬場・距離・格）を出典で確かめて書いた。
 *    それより前の年の形（距離・競馬場の移り変わり）は確かめきれていない所があり、uncertain:true を付けた
 *  - 出典：en.wikipedia の各レースの記事（2026-10-19 に確認。施行日は記事の結果の表・参照の Racing Post の結果）
 *  - ドイツのディアナ賞（独オークス）は外した（持ち主の決定 2026-10-20「格が高くないならディアナ賞をなくして欧州オークス三冠もなくしましょう」）
 *  - ブリーダーズカップターフスプリントは、ブリーダーズカップの開催地（暦の BC マイルの競馬場）に合わせて年ごとに作る
 */
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  HS.DATA.races = HS.DATA.races || [];
  const add = [
    // ---- 豪州（シドニーの秋：ランドウィックギニー → ローズヒルギニー → ザ・チャンピオンシップス） ----
    { name: 'ランドウィックギニー', short: 'ランドウィックギニー', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 1600, month: 3, week: 1, age: '3', weight: '定量', prize: 5000, from: 2014, to: 9999, note: '2014年からランドウィックで施行' },
    { name: 'ローズヒルギニー', short: 'ローズヒルギニー', grade: 'G1', region: '海外', country: '豪', course: 'ローズヒル', surface: '芝', dist: 2000, month: 3, week: 4, age: '3', weight: '定量', prize: 5000, from: 1979, to: 9999, uncertain: true },
    { name: 'オーストラリアンダービー', short: '豪ダービー', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 2400, month: 4, week: 1, age: '3', weight: '定量', prize: 10000, from: 1979, to: 9999, uncertain: true, note: '1979年から秋の施行（それまでは春）。ザ・チャンピオンシップス初日' },
    { name: 'サイアーズプロデュースステークス', short: 'サイアーズプロデュースS', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 1400, month: 4, week: 1, age: '2', weight: '馬齢', prize: 5000, from: 1979, to: 9999, uncertain: true, note: 'ザ・チャンピオンシップス初日' },
    { name: 'シャンペンステークス', short: 'シャンペンS', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 1600, month: 4, week: 2, age: '2', weight: '馬齢', prize: 5000, from: 1979, to: 9999, uncertain: true, note: '豪州（ATC）のシャンペンステークス。ザ・チャンピオンシップス2日目' },
    { name: 'TJスミスステークス', short: 'TJスミスS', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 1200, month: 4, week: 1, age: '3+', weight: '定量', prize: 15000, from: 2005, to: 9999, note: '2005年からG1。ザ・チャンピオンシップス初日' },
    { name: 'ブラックキャビアライトニング', short: 'ブラックキャビアライトニング', grade: 'G1', region: '海外', country: '豪', course: 'フレミントン', surface: '芝', dist: 1000, month: 2, week: 3, age: '3+', weight: '定量', prize: 5000, from: 1987, to: 9999, note: '1987年からG1。2012年までは「ライトニングステークス」' },
    { name: 'ジ・エベレスト', short: 'ジ・エベレスト', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 1200, month: 10, week: 3, age: '3+', weight: '定量', prize: 60000, from: 2017, to: 9999, note: '2017年創設。2023年までは格付けの無い特別戦（ゲーム上はG1扱い）、2024年からG1' },
    // ---- 香港（シャティン） ----
    { name: 'スチュワーズカップ', short: 'スチュワーズC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1600, month: 1, week: 3, age: '3+', weight: '定量', prize: 8000, from: 2001, to: 9999, uncertain: true, note: '香港三冠の1冠目' },
    { name: 'チャンピオンズ＆チャターカップ', short: 'チャンピオンズ＆チャターC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 2400, month: 5, week: 4, age: '3+', weight: '定量', prize: 8000, from: 2001, to: 9999, uncertain: true, note: '香港三冠の3冠目。2015年から国際G1' },
    // 2001年より前の三冠のレースと、G1 になる前のスプリントのレース（香港の三冠の隠し馬の勝ち鞍を暦に結ぶため。2026-10-20 に en.wikipedia の
    // 各レースの記事で勝ち馬・距離を確かめた）。チャンピオンズ＆チャターC は1991年まで1800m・1992〜1994年は2200m・1995年から2400m。
    // センテナリースプリントC は2015年まで1000m（勝ち時計から）で、G1 は2017/18年のシーズンから。それより前の格は確かめきれていない
    { name: 'スチュワーズカップ', short: 'スチュワーズC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1600, month: 1, week: 3, age: '3+', weight: '定量', prize: 3000, from: 1993, to: 2000, uncertain: true, note: '香港三冠の1冠目（1999年は施行なし）' },
    { name: 'チャンピオンズ＆チャターカップ', short: 'チャンピオンズ＆チャターC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1800, month: 5, week: 4, age: '3+', weight: '定量', prize: 3000, from: 1990, to: 1991, uncertain: true, note: '香港三冠の3冠目' },
    { name: 'チャンピオンズ＆チャターカップ', short: 'チャンピオンズ＆チャターC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 2200, month: 5, week: 4, age: '3+', weight: '定量', prize: 3000, from: 1992, to: 1994, uncertain: true, note: '香港三冠の3冠目' },
    { name: 'チャンピオンズ＆チャターカップ', short: 'チャンピオンズ＆チャターC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 2400, month: 5, week: 4, age: '3+', weight: '定量', prize: 3000, from: 1995, to: 2000, uncertain: true, note: '香港三冠の3冠目' },
    { name: 'センテナリースプリントカップ', short: 'センテナリースプリントC', grade: 'G2', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1000, month: 1, week: 3, age: '3+', weight: '定量', prize: 2000, from: 2001, to: 2015, uncertain: true, note: 'G1 になる前（格は確かめきれていない）' },
    { name: 'センテナリースプリントカップ', short: 'センテナリースプリントC', grade: 'G2', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1200, month: 1, week: 3, age: '3+', weight: '定量', prize: 2000, from: 2016, to: 2017, uncertain: true, note: 'G1 になる前（格は確かめきれていない）' },
    { name: 'チェアマンズスプリントプライズ', short: 'チェアマンズスプリントプライズ', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1200, month: 4, week: 4, age: '3+', weight: '定量', prize: 3000, from: 2001, to: 2015, uncertain: true, note: '2000年までは香港スプリントチャンピオンシップ。2016年に国際G1になる前は香港の国内の格（確かめきれていない）' },
    { name: 'センテナリースプリントカップ', short: 'センテナリースプリントC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1200, month: 1, week: 3, age: '3+', weight: '定量', prize: 5000, from: 2018, to: 9999, note: '2017/18年のシーズンからG1' },
    { name: 'クイーンズシルヴァージュビリーカップ', short: 'クイーンズシルヴァージュビリーC', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1400, month: 2, week: 4, age: '3+', weight: '定量', prize: 5000, from: 2016, to: 9999, uncertain: true },
    { name: 'チェアマンズスプリントプライズ', short: 'チェアマンズスプリントプライズ', grade: 'G1', region: '海外', country: '香港', course: 'シャティン', surface: '芝', dist: 1200, month: 4, week: 4, age: '3+', weight: '定量', prize: 9000, from: 2016, to: 9999, note: '2016年から国際G1' },
    // ---- 米国（ニューヨークの3歳牝馬の三冠・メトロポリタンH） ----
    { name: 'エイコーンステークス', short: 'エイコーンS', grade: 'G1', region: '海外', country: '米', course: 'ベルモント', surface: 'ダ', dist: 1600, month: 6, week: 2, age: '3', sex: '牝', weight: '定量', prize: 4000, from: 1973, to: 2023, uncertain: true },
    { name: 'エイコーンステークス', short: 'エイコーンS', grade: 'G1', region: '海外', country: '米', course: 'サラトガ', surface: 'ダ', dist: 1800, month: 6, week: 2, age: '3', sex: '牝', weight: '定量', prize: 4000, from: 2024, to: 9999, note: 'ベルモントパークの改築でサラトガ・1800mで施行' },
    { name: 'コーチングクラブアメリカンオークス', short: 'CCAオークス', grade: 'G1', region: '海外', country: '米', course: 'サラトガ', surface: 'ダ', dist: 1800, month: 7, week: 3, age: '3', sex: '牝', weight: '定量', prize: 4000, from: 2010, to: 9999, uncertain: true, note: '2010年からサラトガで施行' },
    { name: 'アラバマステークス', short: 'アラバマS', grade: 'G1', region: '海外', country: '米', course: 'サラトガ', surface: 'ダ', dist: 2000, month: 8, week: 3, age: '3', sex: '牝', weight: '定量', prize: 4000, from: 1973, to: 9999 },
    { name: 'メトロポリタンハンデキャップ', short: 'メトロポリタンH', grade: 'G1', region: '海外', country: '米', course: 'ベルモント', surface: 'ダ', dist: 1600, month: 6, week: 2, age: '3+', weight: 'ハンデ', prize: 8000, from: 1973, to: 2023, uncertain: true, note: 'ベルモントステークスの日に施行' },
    { name: 'メトロポリタンハンデキャップ', short: 'メトロポリタンH', grade: 'G1', region: '海外', country: '米', course: 'サラトガ', surface: 'ダ', dist: 1600, month: 6, week: 2, age: '3+', weight: 'ハンデ', prize: 8000, from: 2024, to: 9999, note: 'ベルモントパークの改築でサラトガで施行' },
    // ---- 英国 ----
    { name: 'グッドウッドカップ', short: 'グッドウッドC', grade: 'G1', region: '海外', country: '英', course: 'グッドウッド', surface: '芝', dist: 3200, month: 7, week: 4, age: '3+', weight: '定量', prize: 5000, from: 2017, to: 9999, note: '2017年からG1。実距離は約3219m' },
  ];
  // 世界の有名な重賞：月・週は2025年の施行日から（確かめきれない週もある）。格付けと距離の年ごとの移り変わりは確かめていないので、FAMOUS_FROM（2015年）からの形だけを持つ
  const FAMOUS_FROM = 2015;
  add.push(
    // ---- 英国 ----
    { name: 'ロッキンジステークス', short: 'ロッキンジS', grade: 'G1', region: '海外', country: '英', course: 'ニューベリー', surface: '芝', dist: 1600, month: 5, week: 3, age: '4+', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'クイーンアンステークス', short: 'クイーンアンS', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1600, month: 6, week: 3, age: '4+', weight: '定量', prize: 5000, from: FAMOUS_FROM, to: 9999, uncertain: true, note: 'ロイヤルアスコット初日' },
    { name: 'キングチャールズ3世ステークス', short: 'キングチャールズ3世S', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1000, month: 6, week: 3, age: '3+', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true, note: '前の名前はキングズスタンドステークス' },
    { name: 'コモンウェルスカップ', short: 'コモンウェルスC', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1200, month: 6, week: 3, age: '3', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'コロネーションステークス', short: 'コロネーションS', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1600, month: 6, week: 3, age: '3', sex: '牝', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'クイーンエリザベス2世ジュビリーステークス', short: 'QE2世ジュビリーS', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1200, month: 6, week: 3, age: '4+', weight: '定量', prize: 5000, from: FAMOUS_FROM, to: 9999, uncertain: true, note: '前の名前はダイヤモンドジュビリーステークス・ゴールデンジュビリーステークス' },
    { name: 'ファルマスステークス', short: 'ファルマスS', grade: 'G1', region: '海外', country: '英', course: 'ニューマーケット', surface: '芝', dist: 1600, month: 7, week: 2, age: '3+', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    // シティオブヨークS：2016年 G3・2019年 G2・2025年 G1（en.wikipedia「City of York Stakes」）。2015年までは Listed なので持たない
    { name: 'シティオブヨークステークス', short: 'シティオブヨークS', grade: 'G3', region: '海外', country: '英', course: 'ヨーク', surface: '芝', dist: 1400, month: 8, week: 4, age: '3+', weight: '定量', prize: 3000, from: 2016, to: 2018, uncertain: true },
    { name: 'シティオブヨークステークス', short: 'シティオブヨークS', grade: 'G2', region: '海外', country: '英', course: 'ヨーク', surface: '芝', dist: 1400, month: 8, week: 4, age: '3+', weight: '定量', prize: 3000, from: 2019, to: 2024, uncertain: true },
    { name: 'シティオブヨークステークス', short: 'シティオブヨークS', grade: 'G1', region: '海外', country: '英', course: 'ヨーク', surface: '芝', dist: 1400, month: 8, week: 4, age: '3+', weight: '定量', prize: 3000, from: 2025, to: 9999, uncertain: true },
    { name: 'スプリントカップ', short: 'スプリントC', grade: 'G1', region: '海外', country: '英', course: 'ヘイドック', surface: '芝', dist: 1200, month: 9, week: 1, age: '3+', weight: '定量', prize: 3500, from: FAMOUS_FROM, to: 9999, uncertain: true, note: 'ヘイドックパーク' },
    { name: 'チェヴァリーパークステークス', short: 'チェヴァリーパークS', grade: 'G1', region: '海外', country: '英', course: 'ニューマーケット', surface: '芝', dist: 1200, month: 9, week: 4, age: '2', sex: '牝', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ミドルパークステークス', short: 'ミドルパークS', grade: 'G1', region: '海外', country: '英', course: 'ニューマーケット', surface: '芝', dist: 1200, month: 9, week: 4, age: '2', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true, note: '2歳の牡馬' },
    { name: 'サンチャリオットステークス', short: 'サンチャリオットS', grade: 'G1', region: '海外', country: '英', course: 'ニューマーケット', surface: '芝', dist: 1600, month: 9, week: 4, age: '3+', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'フィリーズマイル', short: 'フィリーズマイル', grade: 'G1', region: '海外', country: '英', course: 'ニューマーケット', surface: '芝', dist: 1600, month: 10, week: 2, age: '2', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ブリティッシュチャンピオンズロングディスタンスカップ', short: '英チャンピオンズLDC', grade: 'G2', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 3200, month: 10, week: 3, age: '3+', weight: '定量', prize: 3500, from: FAMOUS_FROM, to: 2024, uncertain: true, note: '2024年まで G2（G1 は2025年から。英は BHA、仏は France Galop の発表）' },
    { name: 'ブリティッシュチャンピオンズロングディスタンスカップ', short: '英チャンピオンズLDC', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 3200, month: 10, week: 3, age: '3+', weight: '定量', prize: 3500, from: 2025, to: 9999, uncertain: true },
    { name: 'ブリティッシュチャンピオンズスプリントステークス', short: '英チャンピオンズスプリントS', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1200, month: 10, week: 3, age: '3+', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ブリティッシュチャンピオンズフィリーズ＆メアズステークス', short: '英チャンピオンズF＆MS', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 2400, month: 10, week: 3, age: '3+', sex: '牝', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'フューチュリティトロフィー', short: 'フューチュリティトロフィー', grade: 'G1', region: '海外', country: '英', course: 'ドンカスター', surface: '芝', dist: 1600, month: 10, week: 4, age: '2', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true, note: '前の名前はレーシングポストトロフィー' },
    // ---- アイルランド ----
    { name: 'タタソールズゴールドカップ', short: 'タタソールズGC', grade: 'G1', region: '海外', country: '愛', course: 'カラ', surface: '芝', dist: 2100, month: 5, week: 4, age: '4+', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'プリティーポリーステークス', short: 'プリティーポリーS', grade: 'G1', region: '海外', country: '愛', course: 'カラ', surface: '芝', dist: 2000, month: 6, week: 4, age: '3+', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'フェニックスステークス', short: 'フェニックスS', grade: 'G1', region: '海外', country: '愛', course: 'カラ', surface: '芝', dist: 1200, month: 8, week: 2, age: '2', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ゴールデンフリースステークス', short: 'ゴールデンフリースS', grade: 'G1', region: '海外', country: '愛', course: 'レパーズタウン', surface: '芝', dist: 1800, month: 9, week: 2, age: '2', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'メイトロンステークス', short: 'メイトロンS', grade: 'G1', region: '海外', country: '愛', course: 'レパーズタウン', surface: '芝', dist: 1600, month: 9, week: 2, age: '3+', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'モイグレアスタッドステークス', short: 'モイグレアスタッドS', grade: 'G1', region: '海外', country: '愛', course: 'カラ', surface: '芝', dist: 1400, month: 9, week: 2, age: '2', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'フライングファイブステークス', short: 'フライングファイブS', grade: 'G1', region: '海外', country: '愛', course: 'カラ', surface: '芝', dist: 1000, month: 9, week: 2, age: '3+', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ナショナルステークス', short: 'ナショナルS', grade: 'G1', region: '海外', country: '愛', course: 'カラ', surface: '芝', dist: 1400, month: 9, week: 2, age: '2', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true, note: 'ヴィンセントオブライエンナショナルステークス' },
    // ---- フランス・ドイツ ----
    { name: 'ヴィコンテスヴィジエ賞', short: 'ヴィコンテスヴィジエ賞', grade: 'G2', region: '海外', country: '仏', course: 'ロンシャン', surface: '芝', dist: 3100, month: 5, week: 3, age: '4+', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 2024, uncertain: true, note: '2024年まで G2（G1 は2025年から。英は BHA、仏は France Galop の発表）' },
    { name: 'ヴィコンテスヴィジエ賞', short: 'ヴィコンテスヴィジエ賞', grade: 'G1', region: '海外', country: '仏', course: 'ロンシャン', surface: '芝', dist: 3100, month: 5, week: 3, age: '4+', weight: '定量', prize: 2500, from: 2025, to: 9999, uncertain: true },
    { name: 'ジャンプラ賞', short: 'ジャンプラ賞', grade: 'G1', region: '海外', country: '仏', course: 'ドーヴィル', surface: '芝', dist: 1400, month: 7, week: 2, age: '3', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ロートシルト賞', short: 'ロートシルト賞', grade: 'G1', region: '海外', country: '仏', course: 'ドーヴィル', surface: '芝', dist: 1600, month: 8, week: 1, age: '3+', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'モルニ賞', short: 'モルニ賞', grade: 'G1', region: '海外', country: '仏', course: 'ドーヴィル', surface: '芝', dist: 1200, month: 8, week: 4, age: '2', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ジャンロマネ賞', short: 'ジャンロマネ賞', grade: 'G1', region: '海外', country: '仏', course: 'ドーヴィル', surface: '芝', dist: 2000, month: 8, week: 4, age: '3+', sex: '牝', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ロワイヤリュー賞', short: 'ロワイヤリュー賞', grade: 'G1', region: '海外', country: '仏', course: 'ロンシャン', surface: '芝', dist: 2800, month: 10, week: 1, age: '3+', sex: '牝', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'クリテリウムドサンクルー', short: 'クリテリウムドサンクルー', grade: 'G1', region: '海外', country: '仏', course: 'サンクルー', surface: '芝', dist: 2000, month: 10, week: 4, age: '2', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'クリテリウムアンテルナシオナル', short: 'クリテリウムアンテルナシオナル', grade: 'G1', region: '海外', country: '仏', course: 'サンクルー', surface: '芝', dist: 1600, month: 10, week: 4, age: '2', weight: '定量', prize: 2500, from: FAMOUS_FROM, to: 9999, uncertain: true },
    // ---- 米国・カナダ ----
    { name: 'フロリダダービー', short: 'フロリダダービー', grade: 'G1', region: '海外', country: '米', course: 'ガルフストリームパーク', surface: 'ダ', dist: 1800, month: 3, week: 4, age: '3', weight: '定量', prize: 6000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'アーカンソーダービー', short: 'アーカンソーダービー', grade: 'G1', region: '海外', country: '米', course: 'オークローンパーク', surface: 'ダ', dist: 1800, month: 3, week: 4, age: '3', weight: '定量', prize: 6000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'サンタアニタダービー', short: 'サンタアニタダービー', grade: 'G1', region: '海外', country: '米', course: 'サンタアニタ', surface: 'ダ', dist: 1800, month: 4, week: 1, age: '3', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ブルーグラスステークス', short: 'ブルーグラスS', grade: 'G1', region: '海外', country: '米', course: 'キーンランド', surface: 'ダ', dist: 1800, month: 4, week: 1, age: '3', weight: '定量', prize: 6000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ハスケルステークス', short: 'ハスケルS', grade: 'G1', region: '海外', country: '米', course: 'モンマスパーク', surface: 'ダ', dist: 1800, month: 7, week: 3, age: '3', weight: '定量', prize: 8000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ソードダンサーステークス', short: 'ソードダンサーS', grade: 'G1', region: '海外', country: '米', course: 'サラトガ', surface: '芝', dist: 2400, month: 8, week: 2, age: '4+', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ブリーダーズフューチュリティ', short: 'ブリーダーズフューチュリティ', grade: 'G1', region: '海外', country: '米', course: 'キーンランド', surface: 'ダ', dist: 1800, month: 10, week: 1, age: '2', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'スピンスターステークス', short: 'スピンスターS', grade: 'G1', region: '海外', country: '米', course: 'キーンランド', surface: 'ダ', dist: 1800, month: 10, week: 1, age: '3+', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ウッドバインマイル', short: 'ウッドバインマイル', grade: 'G1', region: '海外', country: '加', course: 'ウッドバイン', surface: '芝', dist: 1600, month: 9, week: 2, age: '3+', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'E.P.テイラーステークス', short: 'E.P.テイラーS', grade: 'G1', region: '海外', country: '加', course: 'ウッドバイン', surface: '芝', dist: 2000, month: 9, week: 2, age: '3+', sex: '牝', weight: '定量', prize: 3000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'カナディアンインターナショナル', short: 'カナディアンインターナショナル', grade: 'G1', region: '海外', country: '加', course: 'ウッドバイン', surface: '芝', dist: 2400, month: 10, week: 2, age: '3+', weight: '定量', prize: 4000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    // ---- 豪州 ----
    { name: 'ブルーダイヤモンドステークス', short: 'ブルーダイヤモンドS', grade: 'G1', region: '海外', country: '豪', course: 'コーフィールド', surface: '芝', dist: 1200, month: 2, week: 4, age: '2', weight: '定量', prize: 5000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ニューマーケットハンデキャップ', short: 'ニューマーケットH', grade: 'G1', region: '海外', country: '豪', course: 'フレミントン', surface: '芝', dist: 1200, month: 3, week: 2, age: '3+', weight: 'ハンデ', prize: 5000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'オーストラリアンカップ', short: 'オーストラリアンカップ', grade: 'G1', region: '海外', country: '豪', course: 'フレミントン', surface: '芝', dist: 2000, month: 3, week: 2, age: '3+', weight: '定量', prize: 5000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'クイーンエリザベスステークス', short: 'クイーンエリザベスS', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 2000, month: 4, week: 2, age: '3+', weight: '定量', prize: 15000, from: FAMOUS_FROM, to: 9999, uncertain: true, note: '豪州（ATC）のクイーンエリザベスステークス。ザ・チャンピオンシップス2日目' },
    { name: 'シドニーカップ', short: 'シドニーカップ', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 3200, month: 4, week: 2, age: '3+', weight: 'ハンデ', prize: 5000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'オーストラリアンオークス', short: '豪オークス', grade: 'G1', region: '海外', country: '豪', course: 'ランドウィック', surface: '芝', dist: 2400, month: 4, week: 2, age: '3', sex: '牝', weight: '定量', prize: 5000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'コーフィールドギニー', short: 'コーフィールドギニー', grade: 'G1', region: '海外', country: '豪', course: 'コーフィールド', surface: '芝', dist: 1600, month: 10, week: 2, age: '3', weight: '定量', prize: 6000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ヴィクトリアダービー', short: 'ヴィクトリアダービー', grade: 'G1', region: '海外', country: '豪', course: 'フレミントン', surface: '芝', dist: 2500, month: 11, week: 1, age: '3', weight: '定量', prize: 6000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    // ---- 中東（日本の馬がよく出る重賞） ----
    { name: 'アルクオーツスプリント', short: 'アルクオーツスプリント', grade: 'G1', region: '海外', country: 'UAE', course: 'メイダン', surface: '芝', dist: 1200, month: 3, week: 4, age: '3+', weight: '定量', prize: 9000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'UAEダービー', short: 'UAEダービー', grade: 'G2', region: '海外', country: 'UAE', course: 'メイダン', surface: 'ダ', dist: 1900, month: 3, week: 4, age: '3', weight: '定量', prize: 6000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'ドバイゴールドカップ', short: 'ドバイゴールドカップ', grade: 'G2', region: '海外', country: 'UAE', course: 'メイダン', surface: '芝', dist: 3200, month: 3, week: 4, age: '4+', weight: '定量', prize: 6000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: '1351ターフスプリント', short: '1351ターフスプリント', grade: 'G2', region: '海外', country: 'サウジ', course: 'キングアブドゥルアジーズ', surface: '芝', dist: 1351, month: 2, week: 4, age: '3+', weight: '定量', prize: 12000, from: FAMOUS_FROM, to: 9999, uncertain: true },
    { name: 'レッドシーターフハンデキャップ', short: 'レッドシーターフH', grade: 'G2', region: '海外', country: 'サウジ', course: 'キングアブドゥルアジーズ', surface: '芝', dist: 3000, month: 2, week: 4, age: '4+', weight: 'ハンデ', prize: 18000, from: FAMOUS_FROM, to: 9999, uncertain: true },
  );
  // 史実馬の勝ち鞍に要る年（持ち主の決定 2026-10-20「重賞の勝ち鞍が記録から抜けている18頭は、出典で確かめて勝ち鞍を書き足す」）。
  //  デビューする史実馬の勝ち鞍のうち、1995年からの重賞で暦に無かったもの。en.wikipedia の各レースの記事（2026-10-20 に確認）で
  //  格付け・競馬場・距離が分かった年だけを持つ（今のゲームの番組（2025年）で走るのは、今も同じ形の G1 のホープフルS（米）とフォアゴーSだけ）
  add.push(
    // ダイヤモンドジュビリーS（2012年）。2002年からG1（ゴールデンジュビリーS）。2005年はヨークで行い、ゲームにヨークの芝1200m が無いので持たない。2014年までは3歳も出られた
    { name: 'クイーンエリザベス2世ジュビリーステークス', short: 'QE2世ジュビリーS', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1200, month: 6, week: 3, age: '3+', weight: '定量', prize: 5000, from: 2002, to: 2004, note: 'ゴールデンジュビリーステークス' },
    { name: 'クイーンエリザベス2世ジュビリーステークス', short: 'QE2世ジュビリーS', grade: 'G1', region: '海外', country: '英', course: 'アスコット', surface: '芝', dist: 1200, month: 6, week: 3, age: '3+', weight: '定量', prize: 5000, from: 2006, to: 2014, note: '2011年まではゴールデンジュビリーステークス、2012年からはダイヤモンドジュビリーステークス' },
    // ウッドメモリアルS（アケダクト・9ハロン）：1974〜1994年と2002〜2016年がG1、1995〜2001年と2017年からはG2
    { name: 'ウッドメモリアルステークス', short: 'ウッドメモリアルS', grade: 'G1', region: '海外', country: '米', course: 'アケダクト', surface: 'ダ', dist: 1800, month: 4, week: 1, age: '3', weight: '定量', prize: 4000, from: 2002, to: 2016 },
    // ブルーグラスS（キーンランド・9ハロン）：1999〜2016年がG1。2007〜2014年は全天候型の馬場なので持たない（2015年からの形は上の FAMOUS_FROM の行）
    { name: 'ブルーグラスステークス', short: 'ブルーグラスS', grade: 'G1', region: '海外', country: '米', course: 'キーンランド', surface: 'ダ', dist: 1800, month: 4, week: 1, age: '3', weight: '定量', prize: 4000, from: 1999, to: 2006 },
    // セクレタリアトS（アーリントンパーク・芝10ハロン）：1984〜2021年がG1。10ハロンは2018年まで（1998・1999年は行っていない）
    { name: 'セクレタリアトステークス', short: 'セクレタリアトS', grade: 'G1', region: '海外', country: '米', course: 'アーリントンパーク', surface: '芝', dist: 2000, month: 8, week: 2, age: '3', weight: '別定', prize: 3000, from: 2000, to: 2018 },
    // ジョーハーシュターフクラシック（芝12ハロン）：1979年からG1。ベルモントで行ったのは1984〜2021年。2003年までの名前はターフクラシック
    { name: 'ジョーハーシュターフクラシック', short: 'ジョーハーシュターフC', grade: 'G1', region: '海外', country: '米', course: 'ベルモント', surface: '芝', dist: 2400, month: 9, week: 4, age: '3+', weight: '別定', prize: 4000, from: 1984, to: 2021, note: '2003年まではターフクラシック' },
    // ヴォスバーグS（ベルモント）：1991〜2019年がG1（2020年からG2）。6ハロンになったのは2004年から
    { name: 'ヴォスバーグステークス', short: 'ヴォスバーグS', grade: 'G1', region: '海外', country: '米', course: 'ベルモント', surface: 'ダ', dist: 1200, month: 9, week: 4, age: '3+', weight: '別定', prize: 3000, from: 2004, to: 2019 },
    // ホープフルS（米。サラトガ・2歳・7ハロン）：1973年からG1、7ハロンは1994年から。JRA のホープフルSと分けるため（米）を付ける
    { name: 'ホープフルステークス（米）', short: 'ホープフルS（米）', grade: 'G1', region: '海外', country: '米', course: 'サラトガ', surface: 'ダ', dist: 1400, month: 9, week: 1, age: '2', weight: '馬齢', prize: 2500, from: 1994, to: 9999 },
    // フォアゴーS（サラトガ・4歳以上・7ハロン）：2001年からG1、7ハロンに戻ったのは2003年から
    { name: 'フォアゴーステークス', short: 'フォアゴーS', grade: 'G1', region: '海外', country: '米', course: 'サラトガ', surface: 'ダ', dist: 1400, month: 8, week: 4, age: '4+', weight: '別定', prize: 3000, from: 2003, to: 9999 },
    // ジェロームH（ベルモント・3歳・1マイル）：1995年はG2（HorseRacingNation の1995年の結果・ja.wikipedia「フレンチデピュティ」）。ほかの年の格付けは確かめていない。今は格付けの無い特別戦
    { name: 'ジェロームハンデキャップ', short: 'ジェロームH', grade: 'G2', region: '海外', country: '米', course: 'ベルモント', surface: 'ダ', dist: 1600, month: 9, week: 2, age: '3', weight: 'ハンデ', prize: 1500, from: 1995, to: 1995, uncertain: true, note: '施行の週は確かめていない' },
    // ---- オーナーのミッション（data/owners.js）に使う海外の G2（持ち主の決定 2026-10-20「ミッションは史実に基づいて選びたい」） ----
    // ロイヤルロッジS（2歳・1マイル）：フランケルが2010年に勝った（当時はアスコット）。2011年からニューマーケットの9月末。古い年の形は確かめきれていない
    { name: 'ロイヤルロッジステークス', short: 'ロイヤルロッジS', grade: 'G2', region: '海外', country: '英', course: 'ニューマーケット', surface: '芝', dist: 1600, month: 9, week: 4, age: '2', weight: '馬齢', prize: 1500, from: 1990, to: 9999, uncertain: true },
    // スキラッチS（コーフィールド・1000m）：ブラックキャビアが2010年・2011年に勝った（en.wikipedia「Black Caviar」の成績の表）。10月の2週。古い年の形は確かめきれていない
    // 2015年から 1100m・定量（WFA）（en.wikipedia「Schillaci Stakes」）
    { name: 'スキラッチステークス', short: 'スキラッチS', grade: 'G2', region: '海外', country: '豪', course: 'コーフィールド', surface: '芝', dist: 1000, month: 10, week: 2, age: '3+', weight: '別定', prize: 1000, from: 2000, to: 2014, uncertain: true },
    { name: 'スキラッチステークス', short: 'スキラッチS', grade: 'G2', region: '海外', country: '豪', course: 'コーフィールド', surface: '芝', dist: 1100, month: 10, week: 2, age: '3+', weight: '定量', prize: 1000, from: 2015, to: 9999, uncertain: true },
  );
  // ---- 重賞の一覧（2025年の番組）を見直して足したもの（2026-10-20。出典で確かめた年だけを持つ） ----
  add.push(
    // サウジダービー（3歳・ダ1600m）：2022年から国際G3。2025年は2月22日（en.wikipedia「Saudi Derby」）
    { name: 'サウジダービー', short: 'サウジダービー', grade: 'G3', region: '海外', country: 'サウジ', course: 'キングアブドゥルアジーズ', surface: 'ダ', dist: 1600, month: 2, week: 4, age: '3', weight: '定量', prize: 9000, from: 2022, to: 9999 },
    // リヤドダートスプリント（ダ1200m）：2022年からG3、2025年からG2。2025年は2月22日（en/ja.wikipedia「Riyadh Dirt Sprint」）
    { name: 'リヤドダートスプリント', short: 'リヤドダートスプリント', grade: 'G3', region: '海外', country: 'サウジ', course: 'キングアブドゥルアジーズ', surface: 'ダ', dist: 1200, month: 2, week: 4, age: '3+', weight: '定量', prize: 10000, from: 2022, to: 2024 },
    { name: 'リヤドダートスプリント', short: 'リヤドダートスプリント', grade: 'G2', region: '海外', country: 'サウジ', course: 'キングアブドゥルアジーズ', surface: 'ダ', dist: 1200, month: 2, week: 4, age: '3+', weight: '定量', prize: 12000, from: 2025, to: 9999 },
    // ペンシルベニアダービー（3歳・ダ9ハロン）：2017年からG1。最後の土曜（2025年は9月27日）。en/ja.wikipedia「Pennsylvania Derby」
    { name: 'ペンシルベニアダービー', short: 'ペンシルベニアダービー', grade: 'G1', region: '海外', country: '米', course: 'パークスレーシング', surface: 'ダ', dist: 1800, month: 9, week: 4, age: '3', weight: '定量', prize: 6000, from: 2017, to: 9999, note: '2020年は行っていない' },
    // シガーマイル（アケダクト・ダ1マイル）：1990年からG1、2023年からG2。2025年は12月6日（en.wikipedia「Cigar Mile Handicap」）。アケダクトは2025年で閉場するので2025年まで
    { name: 'シガーマイルハンデキャップ', short: 'シガーマイルH', grade: 'G2', region: '海外', country: '米', course: 'アケダクト', surface: 'ダ', dist: 1600, month: 12, week: 1, age: '3+', weight: 'ハンデ', prize: 3000, from: 2023, to: 2025 },
    // ブリーダーズカップの2歳の芝と牝馬のスプリント（2024・2025年はデルマー。2025年は2歳戦が10月31日、ほかが11月1日で、暦では BC の週にそろえる）。en.wikipedia「2025 Breeders' Cup」
    { name: 'ブリーダーズカップジュヴェナイルターフ', short: 'BCジュヴェナイルターフ', grade: 'G1', region: '海外', country: '米', course: 'デルマー', surface: '芝', dist: 1600, month: 11, week: 1, age: '2', weight: '馬齢', prize: 5000, from: 2024, to: 2025 },
    { name: 'ブリーダーズカップジュヴェナイルフィリーズターフ', short: 'BCジュヴェナイルフィリーズターフ', grade: 'G1', region: '海外', country: '米', course: 'デルマー', surface: '芝', dist: 1600, month: 11, week: 1, age: '2', sex: '牝', weight: '馬齢', prize: 5000, from: 2024, to: 2025 },
    { name: 'ブリーダーズカップジュヴェナイルターフスプリント', short: 'BCジュヴェナイルターフスプリント', grade: 'G1', region: '海外', country: '米', course: 'デルマー', surface: '芝', dist: 1000, month: 11, week: 1, age: '2', weight: '馬齢', prize: 5000, from: 2024, to: 2025, note: '2022年からG1' },
    { name: 'ブリーダーズカップフィリー＆メアスプリント', short: 'BCフィリー＆メアスプリント', grade: 'G1', region: '海外', country: '米', course: 'デルマー', surface: 'ダ', dist: 1400, month: 11, week: 1, age: '3+', sex: '牝', weight: '定量', prize: 5000, from: 2024, to: 2025 },
  );
  // ブリーダーズカップターフスプリント（2012年からG1）：開催地は BC マイルと同じ。距離は開催地の芝コースで変わる（デルマーは5ハロン＝1000m）
  const BCTS_DIST = { 'デルマー': 1000, 'キーンランド': 1100, 'サンタアニタ': 1300, 'チャーチルダウンズ': 1000 };
  for (const r of HS.DATA.races.filter(x => x.name === 'ブリーダーズカップマイル' && (x.to || 9999) >= 2012)) {
    add.push({ name: 'ブリーダーズカップターフスプリント', short: 'BCターフスプリント', grade: 'G1', region: '海外', country: '米', course: r.course, surface: '芝', dist: BCTS_DIST[r.course] || 1000, month: r.month, week: r.week, age: '3+', weight: '定量', prize: 7000,
      from: Math.max(2012, r.from), to: r.to, uncertain: r.course !== 'デルマー' || undefined });
  }
  HS.DATA.races.push(...add);
})();
