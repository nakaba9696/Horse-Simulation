// ゲームのデータ（馬名の材料・脚質・コース・レース名）。見た目のコードとは分けて持つ。
(function (HS) {
  HS.STAT_KEYS = ['speed', 'stamina', 'power', 'guts', 'wits'];
  HS.STAT_LABELS = { speed: 'スピード', stamina: 'スタミナ', power: 'パワー', guts: '根性', wits: '賢さ' };

  // 脚質ごとの、序盤・中盤・終盤の速さの配分
  HS.STYLES = {
    nige:    { label: '逃げ', pace: [1.045, 1.0, 0.975] },
    senko:   { label: '先行', pace: [1.02, 1.005, 0.99] },
    sashi:   { label: '差し', pace: [0.985, 0.998, 1.032] },
    oikomi:  { label: '追込', pace: [0.972, 0.99, 1.065] },
  };
  HS.STYLE_KEYS = Object.keys(HS.STYLES);

  // 適性 A〜D と速さの倍率
  HS.APTITUDE = { A: 1.0, B: 0.994, C: 0.987, D: 0.978 };

  HS.SURFACES = { turf: '芝', dirt: 'ダート' };
  // 馬場状態：速さの倍率（パワーで一部打ち消せる）
  HS.CONDITIONS = {
    good:    { label: '良',   penalty: 0.0 },
    yielding:{ label: '稍重', penalty: 0.01 },
    soft:    { label: '重',   penalty: 0.02 },
    heavy:   { label: '不良', penalty: 0.035 },
  };
  HS.CONDITION_KEYS = Object.keys(HS.CONDITIONS);
  HS.DISTANCES = [1200, 1400, 1600, 1800, 2000, 2200, 2400, 2500, 3000, 3200];

  // 馬名はカタカナの部品を組み合わせて作る（実在の馬名は使わない）
  HS.NAME_HEAD = ['アオ', 'ハヤテ', 'ミナト', 'ソラ', 'カゼ', 'ホシ', 'ツキ', 'ユキ', 'サクラ', 'イナズマ',
    'クロ', 'シロ', 'ギン', 'コハク', 'ルリ', 'ヒスイ', 'アカツキ', 'ヨイ', 'ナギ', 'シグレ',
    'テン', 'ハル', 'アキ', 'フユ', 'ナツ', 'キタ', 'ミナミ', 'トキ', 'カガリ', 'ウミ'];
  HS.NAME_TAIL = ['ノカゼ', 'ボシ', 'マル', 'ランナー', 'ダッシュ', 'オー', 'キング', 'クイーン', 'ハヤブサ',
    'ノヒカリ', 'ドリーム', 'スター', 'ブレイブ', 'ミラクル', 'フラッシュ', 'ロード', 'ウイング', 'エース',
    'ノツバサ', 'ビート', 'リズム', 'ソング', 'タイガー', 'ワルツ', 'ジェット'];

  HS.RACE_PREFIX = ['春風', '若葉', '青嵐', '夏空', '星月', '紅葉', '白雪', '暁', '潮騒', '黄金', '銀河', '朝凪'];
  HS.RACE_SUFFIX = ['ステークス', '特別', 'カップ', '賞', '記念'];
})(globalThis.HS = globalThis.HS || {});

// ---- 育成モード（ダビスタ型）のデータ ----
(function (HS) {
  HS.WEEKS_PER_YEAR = 48; // 1 か月 4 週

  // 成長の型：年齢ごとに、素質（上限）の何割まで力が出せるか
  HS.GROWTH = {
    early:  { label: '早熟', curve: { 0: 0.3, 1: 0.55, 2: 0.86, 3: 1.0, 4: 0.98, 5: 0.92, 6: 0.85, 7: 0.78 } },
    normal: { label: '普通', curve: { 0: 0.25, 1: 0.5, 2: 0.74, 3: 0.93, 4: 1.0, 5: 0.98, 6: 0.92, 7: 0.85 } },
    late:   { label: '晩成', curve: { 0: 0.2, 1: 0.45, 2: 0.62, 3: 0.82, 4: 0.95, 5: 1.0, 6: 0.98, 7: 0.92 } },
  };
  HS.GROWTH_KEYS = Object.keys(HS.GROWTH);

  // 調教：主に伸びる能力・少し伸びる能力・疲れ
  HS.TRAININGS = {
    hill:  { label: '坂路',       main: 'power',   sub: 'speed',   fatigue: 12 },
    wood:  { label: 'ウッド',     main: 'speed',   sub: 'stamina', fatigue: 12 },
    pair:  { label: '併せ馬',     main: 'guts',    sub: 'speed',   fatigue: 15 },
    pool:  { label: 'プール',     main: 'stamina', sub: 'power',   fatigue: 6 },
    gate:  { label: 'ゲート練習', main: 'wits',    sub: null,      fatigue: 4 },
    rest:  { label: '休ませる',   main: null,      sub: null,      fatigue: -25 },
  };
  HS.TRAINING_KEYS = Object.keys(HS.TRAININGS);

  HS.CONDITION_LABELS = { '-2': '絶不調', '-1': '不調', '0': '普通', '1': '好調', '2': '絶好調' };

  // レースのクラス。sum は相手の能力の合計（5 項目）の幅、prize は 1 着賞金（万円）
  HS.CLASSES = {
    debut:  { label: '新馬',     sum: [195, 250], prize: 1000 },
    maiden: { label: '未勝利',   sum: [205, 260], prize: 800 },
    win1:   { label: '1勝クラス', sum: [245, 290], prize: 1500 },
    win2:   { label: '2勝クラス', sum: [270, 310], prize: 2000 },
    win3:   { label: '3勝クラス', sum: [290, 330], prize: 2600 },
    open:   { label: 'オープン', sum: [305, 345], prize: 3500 },
    g3:     { label: 'G3',       sum: [315, 355], prize: 6000 },
    g2:     { label: 'G2',       sum: [327, 367], prize: 9000 },
    g1:     { label: 'G1',       sum: [342, 390], prize: 20000 },
  };
  HS.PRIZE_SHARE = [1, 0.4, 0.25, 0.15, 0.1];
  HS.APPEARANCE_FEE = 40; // 出走手当（万円）

  // 重賞（架空のレース）。week は 1〜48、age は 2 / 3 / 'older'（3 歳以上）、filly は牝馬限定
  HS.GRADED_RACES = [
    { week: 8,  name: '春砂ステークス',     grade: 'g3', surface: 'dirt', distance: 1600, age: 'older' },
    { week: 10, name: '早春特別',           grade: 'g3', surface: 'turf', distance: 1800, age: 3 },
    { week: 12, name: '弥生トライアル',     grade: 'g2', surface: 'turf', distance: 2000, age: 3 },
    { week: 14, name: '桜雲杯',             grade: 'g1', surface: 'turf', distance: 1600, age: 3, filly: true },
    { week: 15, name: '春光賞',             grade: 'g1', surface: 'turf', distance: 2000, age: 3 },
    { week: 17, name: '陽春大賞',           grade: 'g1', surface: 'turf', distance: 3200, age: 'older' },
    { week: 18, name: '青嵐トライアル',     grade: 'g2', surface: 'turf', distance: 2400, age: 3 },
    { week: 19, name: '新緑マイル',         grade: 'g1', surface: 'turf', distance: 1600, age: 'older' },
    { week: 20, name: '白百合オークス',     grade: 'g1', surface: 'turf', distance: 2400, age: 3, filly: true },
    { week: 21, name: '蒼穹ダービー',       grade: 'g1', surface: 'turf', distance: 2400, age: 3 },
    { week: 25, name: '宝珠記念',           grade: 'g1', surface: 'turf', distance: 2200, age: 'older' },
    { week: 28, name: '夏空スプリント',     grade: 'g3', surface: 'turf', distance: 1200, age: 'older' },
    { week: 31, name: '潮騒ステークス',     grade: 'g3', surface: 'turf', distance: 1800, age: 2 },
    { week: 34, name: '初秋トライアル',     grade: 'g2', surface: 'turf', distance: 2200, age: 3 },
    { week: 36, name: '疾風スプリント',     grade: 'g1', surface: 'turf', distance: 1200, age: 'older' },
    { week: 37, name: '秋桜ステークス',     grade: 'g2', surface: 'turf', distance: 2000, age: 'older' },
    { week: 39, name: '錦秋杯',             grade: 'g1', surface: 'turf', distance: 2000, age: 'older' },
    { week: 41, name: '銀杏賞',             grade: 'g1', surface: 'turf', distance: 3000, age: 3 },
    { week: 42, name: '翠嵐マイル',         grade: 'g1', surface: 'turf', distance: 1600, age: 'older' },
    { week: 44, name: '星冠カップ',         grade: 'g1', surface: 'turf', distance: 2400, age: 'older' },
    { week: 45, name: '木枯らしステークス', grade: 'g2', surface: 'turf', distance: 1400, age: 2 },
    { week: 46, name: 'ジュニアクラウン',   grade: 'g1', surface: 'turf', distance: 1600, age: 2 },
    { week: 47, name: '砂王決戦',           grade: 'g1', surface: 'dirt', distance: 1800, age: 'older' },
    { week: 48, name: '冬星グランプリ',     grade: 'g1', surface: 'turf', distance: 2500, age: 'older' },
  ];

  // 血統の系統（架空）。祖となる馬と、その系統名
  HS.FOUNDERS = {
    'オーロラスター': 'オーロラ系',
    'ハヤテオー': 'ハヤテ系',
    'ツキノカガミ': 'ツキ系',
    'クロガネオー': 'クロガネ系',
    'ナギノカゼ': 'ナギ系',
  };
  // ニックス：この父系 × 母父系の組み合わせは相性が良い
  HS.NICKS = [
    ['オーロラ系', 'ツキ系'],
    ['ハヤテ系', 'クロガネ系'],
    ['ツキ系', 'ナギ系'],
    ['クロガネ系', 'オーロラ系'],
    ['ナギ系', 'ハヤテ系'],
  ];

  // 種牡馬（架空）。sire は父、damSire は母の父。素質（potential）は 5 項目
  HS.STALLIONS = [
    { id: 'S1', sire: 'オーロラスター', damSire: 'ツキノカガミ',  name: 'ギンガオー',       potential: { speed: 92, stamina: 84, power: 86, guts: 80, wits: 84 }, style: 'senko',  bestDistance: 2200, aptitude: { turf: 'A', dirt: 'C' }, growth: 'normal' },
    { id: 'S2', sire: 'ハヤテオー', damSire: 'クロガネオー',  name: 'ハヤテキング',     potential: { speed: 95, stamina: 62, power: 88, guts: 76, wits: 72 }, style: 'nige',   bestDistance: 1400, aptitude: { turf: 'A', dirt: 'B' }, growth: 'early' },
    { id: 'S3', sire: 'ツキノカガミ', damSire: 'オーロラスター',  name: 'ツキノミラクル',   potential: { speed: 84, stamina: 94, power: 76, guts: 86, wits: 80 }, style: 'sashi',  bestDistance: 2800, aptitude: { turf: 'A', dirt: 'D' }, growth: 'late' },
    { id: 'S4', sire: 'クロガネオー', damSire: 'ナギノカゼ',  name: 'クロガネロード',   potential: { speed: 82, stamina: 76, power: 94, guts: 84, wits: 70 }, style: 'senko',  bestDistance: 1800, aptitude: { turf: 'C', dirt: 'A' }, growth: 'normal' },
    { id: 'S5', sire: 'ギンガオー', damSire: 'ハヤテオー',  name: 'サクラフラッシュ', potential: { speed: 88, stamina: 70, power: 78, guts: 72, wits: 78 }, style: 'sashi',  bestDistance: 1600, aptitude: { turf: 'A', dirt: 'C' }, growth: 'early' },
    { id: 'S6', sire: 'ツキノカガミ', damSire: 'クロガネオー',  name: 'アオノツバサ',     potential: { speed: 80, stamina: 82, power: 74, guts: 78, wits: 76 }, style: 'oikomi', bestDistance: 2400, aptitude: { turf: 'B', dirt: 'C' }, growth: 'late' },
    { id: 'S7', sire: 'ハヤテキング', damSire: 'ナギノカゼ',  name: 'ヒスイダッシュ',   potential: { speed: 82, stamina: 66, power: 80, guts: 70, wits: 70 }, style: 'nige',   bestDistance: 1400, aptitude: { turf: 'B', dirt: 'B' }, growth: 'early' },
    { id: 'S8', sire: 'ナギノカゼ', damSire: 'オーロラスター',  name: 'ナギノヒカリ',     potential: { speed: 76, stamina: 78, power: 72, guts: 74, wits: 74 }, style: 'senko',  bestDistance: 2000, aptitude: { turf: 'B', dirt: 'B' }, growth: 'normal' },
    { id: 'S9', sire: 'クロガネロード', damSire: 'ツキノカガミ',  name: 'ミナミブレイブ',   potential: { speed: 74, stamina: 70, power: 82, guts: 80, wits: 66 }, style: 'senko',  bestDistance: 1600, aptitude: { turf: 'D', dirt: 'A' }, growth: 'normal' },
    { id: 'S10', sire: 'ツキノミラクル', damSire: 'ハヤテオー', name: 'ユキワルツ',       potential: { speed: 72, stamina: 80, power: 68, guts: 72, wits: 78 }, style: 'sashi',  bestDistance: 2400, aptitude: { turf: 'B', dirt: 'C' }, growth: 'late' },
    { id: 'S11', sire: 'ナギノヒカリ', damSire: 'クロガネオー', name: 'カゼノリズム',     potential: { speed: 74, stamina: 66, power: 72, guts: 70, wits: 72 }, style: 'oikomi', bestDistance: 1800, aptitude: { turf: 'B', dirt: 'B' }, growth: 'normal' },
    { id: 'S12', sire: 'ナギノカゼ', damSire: 'ハヤテオー', name: 'トキノビート',     potential: { speed: 70, stamina: 68, power: 74, guts: 68, wits: 68 }, style: 'senko',  bestDistance: 1600, aptitude: { turf: 'C', dirt: 'B' }, growth: 'early' },
  ];
})(globalThis.HS = globalThis.HS || {});
