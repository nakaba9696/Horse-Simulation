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

  // 重賞（実在のレース名。週・距離・条件はゲーム用に合わせている）。week は 1〜48、age は 2 / 3 / 'older'（3 歳以上）、filly は牝馬限定
  HS.GRADED_RACES = [
    { week: 4,  name: '根岸ステークス',                 grade: 'g3', surface: 'dirt', distance: 1400, age: 'older' },
    { week: 7,  name: 'フェブラリーステークス',         grade: 'g1', surface: 'dirt', distance: 1600, age: 'older' },
    { week: 9,  name: '弥生賞',                         grade: 'g2', surface: 'turf', distance: 2000, age: 3 },
    { week: 9,  name: 'チューリップ賞',                 grade: 'g2', surface: 'turf', distance: 1600, age: 3, filly: true },
    { week: 12, name: '高松宮記念',                     grade: 'g1', surface: 'turf', distance: 1200, age: 'older' },
    { week: 13, name: '大阪杯',                         grade: 'g1', surface: 'turf', distance: 2000, age: 'older' },
    { week: 14, name: '桜花賞',                         grade: 'g1', surface: 'turf', distance: 1600, age: 3, filly: true },
    { week: 15, name: '皐月賞',                         grade: 'g1', surface: 'turf', distance: 2000, age: 3 },
    { week: 16, name: '青葉賞',                         grade: 'g2', surface: 'turf', distance: 2400, age: 3 },
    { week: 17, name: '天皇賞（春）',                   grade: 'g1', surface: 'turf', distance: 3200, age: 'older' },
    { week: 18, name: 'NHKマイルカップ',                grade: 'g1', surface: 'turf', distance: 1600, age: 3 },
    { week: 19, name: 'ヴィクトリアマイル',             grade: 'g1', surface: 'turf', distance: 1600, age: 'older', filly: true },
    { week: 20, name: '優駿牝馬（オークス）',           grade: 'g1', surface: 'turf', distance: 2400, age: 3, filly: true },
    { week: 21, name: '東京優駿（日本ダービー）',       grade: 'g1', surface: 'turf', distance: 2400, age: 3 },
    { week: 22, name: '安田記念',                       grade: 'g1', surface: 'turf', distance: 1600, age: 'older' },
    { week: 23, name: '函館スプリントステークス',       grade: 'g3', surface: 'turf', distance: 1200, age: 'older' },
    { week: 24, name: '宝塚記念',                       grade: 'g1', surface: 'turf', distance: 2200, age: 'older' },
    { week: 35, name: '札幌2歳ステークス',              grade: 'g3', surface: 'turf', distance: 1800, age: 2 },
    { week: 36, name: 'スプリンターズステークス',       grade: 'g1', surface: 'turf', distance: 1200, age: 'older' },
    { week: 36, name: '神戸新聞杯',                     grade: 'g2', surface: 'turf', distance: 2200, age: 3 },
    { week: 38, name: '秋華賞',                         grade: 'g1', surface: 'turf', distance: 2000, age: 3, filly: true },
    { week: 38, name: '京都大賞典',                     grade: 'g2', surface: 'turf', distance: 2400, age: 'older' },
    { week: 40, name: '菊花賞',                         grade: 'g1', surface: 'turf', distance: 3000, age: 3 },
    { week: 41, name: '天皇賞（秋）',                   grade: 'g1', surface: 'turf', distance: 2000, age: 'older' },
    { week: 42, name: 'エリザベス女王杯',               grade: 'g1', surface: 'turf', distance: 2200, age: 'older', filly: true },
    { week: 43, name: 'マイルチャンピオンシップ',       grade: 'g1', surface: 'turf', distance: 1600, age: 'older' },
    { week: 44, name: 'ジャパンカップ',                 grade: 'g1', surface: 'turf', distance: 2400, age: 'older' },
    { week: 45, name: 'チャンピオンズカップ',           grade: 'g1', surface: 'dirt', distance: 1800, age: 'older' },
    { week: 46, name: '阪神ジュベナイルフィリーズ',     grade: 'g1', surface: 'turf', distance: 1600, age: 2, filly: true },
    { week: 47, name: '朝日杯フューチュリティステークス', grade: 'g1', surface: 'turf', distance: 1600, age: 2 },
    { week: 48, name: '有馬記念',                       grade: 'g1', surface: 'turf', distance: 2500, age: 'older' },
    { week: 48, name: 'ホープフルステークス',           grade: 'g1', surface: 'turf', distance: 2000, age: 2 },
  ];

  // 血統の系統。祖となる馬と、その系統名（実在の馬名。系統の分け方はゲーム用に簡単にしている）
  HS.FOUNDERS = {
    'サンデーサイレンス': 'サンデーサイレンス系',
    'ミスタープロスペクター': 'ミスプロ系',
    'ロベルト': 'ロベルト系',
    'ノーザンダンサー': 'ノーザンダンサー系',
    'ストームキャット': 'ストームキャット系',
    'ナスルーラ': 'ナスルーラ系',
  };
  // 種牡馬の父・母の父として出てくる馬の系統
  HS.ANCESTOR_LINES = {
    'キングマンボ': 'ミスプロ系',
    'アンブライドルズソング': 'ミスプロ系',
    'シンボリクリスエス': 'ロベルト系',
    'スクリーンヒーロー': 'ロベルト系',
    'ステイゴールド': 'サンデーサイレンス系',
    'スペシャルウィーク': 'サンデーサイレンス系',
    'ブラックタイド': 'サンデーサイレンス系',
    'アルザオ': 'ノーザンダンサー系',
    'ラストタイクーン': 'ノーザンダンサー系',
    'カーネギー': 'ノーザンダンサー系',
    'ノーザンテースト': 'ノーザンダンサー系',
    'ヌレイエフ': 'ノーザンダンサー系',
    'トニービン': 'ナスルーラ系',
    'サクラバクシンオー': 'ナスルーラ系',
  };
  // 祖先の父（インブリードを見つけるために、分かっている父系をたどる）
  HS.ANCESTOR_SIRES = {
    'ステイゴールド': 'サンデーサイレンス',
    'スペシャルウィーク': 'サンデーサイレンス',
    'ブラックタイド': 'サンデーサイレンス',
    'キングマンボ': 'ミスタープロスペクター',
    'ノーザンテースト': 'ノーザンダンサー',
    'ヌレイエフ': 'ノーザンダンサー',
  };
  // ニックス：この父系 × 母父系の組み合わせは相性が良い
  HS.NICKS = [
    ['サンデーサイレンス系', 'ストームキャット系'],
    ['ミスプロ系', 'サンデーサイレンス系'],
    ['ロベルト系', 'サンデーサイレンス系'],
    ['サンデーサイレンス系', 'ノーザンダンサー系'],
    ['ストームキャット系', 'サンデーサイレンス系'],
  ];

  // 種牡馬（実在の馬名）。sire は父、damSire は母の父。素質（potential）・脚質・距離・成長の型はゲーム用の値
  HS.STALLIONS = [
    { id: 'S1',  name: 'ディープインパクト', sire: 'サンデーサイレンス', damSire: 'アルザオ',               potential: { speed: 96, stamina: 86, power: 82, guts: 82, wits: 86 }, style: 'oikomi', bestDistance: 2400, aptitude: { turf: 'A', dirt: 'C' }, growth: 'normal' },
    { id: 'S2',  name: 'キングカメハメハ',   sire: 'キングマンボ',       damSire: 'ラストタイクーン',       potential: { speed: 88, stamina: 82, power: 90, guts: 82, wits: 80 }, style: 'senko',  bestDistance: 2000, aptitude: { turf: 'A', dirt: 'A' }, growth: 'normal' },
    { id: 'S3',  name: 'ハーツクライ',       sire: 'サンデーサイレンス', damSire: 'トニービン',             potential: { speed: 82, stamina: 92, power: 80, guts: 86, wits: 78 }, style: 'sashi',  bestDistance: 2400, aptitude: { turf: 'A', dirt: 'C' }, growth: 'late' },
    { id: 'S4',  name: 'ロードカナロア',     sire: 'キングカメハメハ',   damSire: 'ストームキャット',       potential: { speed: 95, stamina: 64, power: 88, guts: 78, wits: 80 }, style: 'senko',  bestDistance: 1400, aptitude: { turf: 'A', dirt: 'B' }, growth: 'normal' },
    { id: 'S5',  name: 'エピファネイア',     sire: 'シンボリクリスエス', damSire: 'スペシャルウィーク',     potential: { speed: 84, stamina: 86, power: 86, guts: 80, wits: 72 }, style: 'senko',  bestDistance: 2200, aptitude: { turf: 'A', dirt: 'C' }, growth: 'early' },
    { id: 'S6',  name: 'キタサンブラック',   sire: 'ブラックタイド',     damSire: 'サクラバクシンオー',     potential: { speed: 84, stamina: 90, power: 82, guts: 90, wits: 82 }, style: 'nige',   bestDistance: 2400, aptitude: { turf: 'A', dirt: 'C' }, growth: 'late' },
    { id: 'S7',  name: 'ドゥラメンテ',       sire: 'キングカメハメハ',   damSire: 'サンデーサイレンス',     potential: { speed: 90, stamina: 82, power: 86, guts: 80, wits: 72 }, style: 'sashi',  bestDistance: 2000, aptitude: { turf: 'A', dirt: 'C' }, growth: 'early' },
    { id: 'S8',  name: 'モーリス',           sire: 'スクリーンヒーロー', damSire: 'カーネギー',             potential: { speed: 86, stamina: 74, power: 84, guts: 76, wits: 76 }, style: 'senko',  bestDistance: 1600, aptitude: { turf: 'A', dirt: 'C' }, growth: 'late' },
    { id: 'S9',  name: 'ゴールドアリュール', sire: 'サンデーサイレンス', damSire: 'ヌレイエフ',             potential: { speed: 78, stamina: 72, power: 86, guts: 80, wits: 70 }, style: 'senko',  bestDistance: 1800, aptitude: { turf: 'C', dirt: 'A' }, growth: 'normal' },
    { id: 'S10', name: 'ダイワメジャー',     sire: 'サンデーサイレンス', damSire: 'ノーザンテースト',       potential: { speed: 82, stamina: 68, power: 82, guts: 76, wits: 70 }, style: 'senko',  bestDistance: 1600, aptitude: { turf: 'A', dirt: 'B' }, growth: 'early' },
    { id: 'S11', name: 'キズナ',             sire: 'ディープインパクト', damSire: 'ストームキャット',       potential: { speed: 80, stamina: 76, power: 80, guts: 74, wits: 72 }, style: 'oikomi', bestDistance: 2000, aptitude: { turf: 'A', dirt: 'B' }, growth: 'normal' },
    { id: 'S12', name: 'コントレイル',       sire: 'ディープインパクト', damSire: 'アンブライドルズソング', potential: { speed: 76, stamina: 72, power: 74, guts: 70, wits: 72 }, style: 'senko',  bestDistance: 2000, aptitude: { turf: 'A', dirt: 'C' }, growth: 'normal' },
  ];
})(globalThis.HS = globalThis.HS || {});

// ---- 騎手・調教師・ライバル馬主・海外遠征（架空） ----
(function (HS) {
  // クラスの格の順番（騎手が乗ってくれるかの判定に使う）
  HS.CLASS_ORDER = ['debut', 'maiden', 'win1', 'win2', 'win3', 'open', 'g3', 'g2', 'g1', 'intl'];

  // skill：腕前、style：得意な脚質、minClass：このクラス以上の馬にしか乗らない、fee：1 回の騎乗料（万円）
  HS.JOCKEYS = [
    { id: 'J1',  name: '武蔵野 翔',   skill: 92, style: 'sashi',  minClass: 'win2', fee: 60 },
    { id: 'J2',  name: '天城 隼人',   skill: 88, style: 'senko',  minClass: 'win1', fee: 50 },
    { id: 'J3',  name: '白峰 光',     skill: 85, style: 'nige',   minClass: 'win1', fee: 45 },
    { id: 'J4',  name: '霧島 大河',   skill: 82, style: 'oikomi', minClass: 'maiden', fee: 35 },
    { id: 'J5',  name: '朝霧 涼',     skill: 78, style: 'senko',  minClass: 'debut', fee: 30 },
    { id: 'J6',  name: '早瀬 誠',     skill: 74, style: 'sashi',  minClass: 'debut', fee: 25 },
    { id: 'J7',  name: '風間 悠斗',   skill: 70, style: 'nige',   minClass: 'debut', fee: 20 },
    { id: 'J8',  name: '御影 弘',     skill: 66, style: 'oikomi', minClass: 'debut', fee: 15 },
    { id: 'J9',  name: '岬 菜々子',   skill: 62, style: 'senko',  minClass: 'debut', fee: 12 },
    { id: 'J10', name: '見習い 新田', skill: 50, style: 'senko',  minClass: 'debut', fee: 5 },
  ];
  HS.DEFAULT_JOCKEY = 'J10';

  // skill：調教の効き（倍率）、specialty：特に伸ばしやすい能力、care：故障しにくさ（小さいほど故障しにくい）、fee：週の預託料（万円）
  HS.TRAINERS = [
    { id: 'T1', name: '大河原 厩舎', skill: 1.25, specialty: 'speed',   care: 1.1, fee: 16, note: 'スパルタ。伸びるが故障に注意' },
    { id: 'T2', name: '桐生 厩舎',   skill: 1.15, specialty: 'stamina', care: 0.8, fee: 14, note: '長距離の名門。馬を大事にする' },
    { id: 'T3', name: '真田 厩舎',   skill: 1.1,  specialty: 'power',   care: 1.0, fee: 12, note: 'ダートとパワー型が得意' },
    { id: 'T4', name: '日向 厩舎',   skill: 1.05, specialty: 'wits',    care: 0.7, fee: 11, note: '気性の難しい馬もうまく扱う' },
    { id: 'T5', name: '藤枝 厩舎',   skill: 1.0,  specialty: 'guts',    care: 0.9, fee: 10, note: '根性を鍛える昔気質' },
    { id: 'T6', name: '小野寺 厩舎', skill: 0.9,  specialty: 'speed',   care: 0.9, fee: 7,  note: '開業したての若手。安い' },
  ];
  HS.DEFAULT_TRAINER = 'T5';

  // ライバル馬主。level は素質の高さ（合計の幅）
  HS.RIVAL_OWNERS = [
    { id: 'R1', name: '黒崎ファーム',     level: [370, 425], color: '#222222' },
    { id: 'R2', name: '白鳥レーシング',   level: [362, 418], color: '#f5f5f5' },
    { id: 'R3', name: '紅葉ホースクラブ', level: [350, 405], color: '#d32f2f' },
    { id: 'R4', name: '青海牧場',         level: [340, 395], color: '#1565c0' },
  ];

  // 海外遠征のレース（実在のレース名）。出るには重賞 1 勝以上、遠征費がかかる
  HS.OVERSEAS_RACES = [
    { week: 12, name: 'ドバイワールドカップ', region: 'ドバイ', surface: 'dirt', distance: 2000 },
    { week: 28, name: 'キングジョージ6世&クイーンエリザベスステークス', region: 'イギリス', surface: 'turf', distance: 2400 },
    { week: 37, name: '凱旋門賞', region: 'フランス', surface: 'turf', distance: 2400, heavy: true },
    { week: 41, name: 'メルボルンカップ', region: 'オーストラリア', surface: 'turf', distance: 3200 },
  ];
  HS.CLASSES.intl = { label: '海外G1', sum: [355, 400], prize: 40000 };
  HS.TRAVEL_COST = 2000;
  HS.AWARD_BONUS = 1000;
})(globalThis.HS = globalThis.HS || {});
