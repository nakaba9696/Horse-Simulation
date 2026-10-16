// 騎手の名前を架空にする（持ち主の決定 2026-10-16「騎手の名前は全部架空でいい」）
// データ（data/jockeys*.js・data/historic_jockeys.js・史実馬の jockey）は実名のまま持ち、読み込んだときに
// 実名 → 架空の名前に一対一で置き換える。腕前・年代・所属・主戦の組み合わせはそのまま。名馬の解説などの文の中の騎手名も置き換える。
// 置き換えは実名から決まる（毎回同じ名前になる）。data の後、datafix.js の前に読む
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, D = HS.DATA = HS.DATA || {};
  const F = HS.Fictional = {};

  const SUR = ['青柳', '朝倉', '天野', '有村', '飯塚', '石倉', '泉田', '市原', '稲垣', '岩城', '植草', '内海', '浦野', '大河内', '大城', '大槻', '岡安', '小倉', '尾崎', '小野寺',
    '柏木', '片桐', '桂木', '金城', '鎌田', '河野', '神崎', '木暮', '北条', '久我', '楠', '倉持', '黒岩', '小暮', '小柳', '桜庭', '笹川', '佐伯', '沢渡', '塩見',
    '篠原', '柴崎', '島袋', '白石', '杉浦', '須賀', '関根', '瀬川', '高梨', '高峰', '滝沢', '立花', '辰巳', '玉置', '千早', '津川', '筒井', '鶴見', '寺岡', '遠野',
    '徳永', '戸川', '富樫', '仲間', '長峰', '成瀬', '新見', '西條', '野々村', '芳賀', '橋爪', '畑中', '早瀬', '日向', '氷室', '平賀', '広瀬', '深町', '藤堂', '古川',
    '星野', '堀越', '真壁', '槙', '真柴', '水城', '三ツ矢', '峰岸', '宮坂', '向井', '村雨', '望月', '森岡', '八神', '柳瀬', '山吹', '結城', '湯浅', '吉良', '若林'];
  const GIV = ['晃', '旭', '篤', '彰人', '歩', '渉', '一輝', '海斗', '景', '和真', '要', '奏太', '亘', '恭平', '健吾', '剛', '光一', '航', '昂', '颯',
    '慎吾', '駿', '翔吾', '新太', '進', '征爾', '聖', '惣一', '大地', '岳', '拓真', '匠', '達也', '樹', '翼', '哲平', '透', '直樹', '尚', '凪',
    '隼', '陽介', '響', '仁', '博', '風太', '誠', '雅人', '勝', '湊', '稔', '迅', '雄大', '悠', '洋平', '吉信', '龍', '亮', '凛', '蓮',
    '朔', '史郎', '修', '浩一', '照', '寛', '暁', '伊織', '鷹人', '弦'];
  const KANA = ['アルノー', 'ベルトラン', 'カルヴァン', 'デュラン', 'エヴァンス', 'フォルテ', 'ガルニエ', 'ハーラン', 'イングラム', 'ジャレット', 'ケスラー', 'ランバート', 'マクレー', 'ノーラン', 'オルセン',
    'ペルティエ', 'クインラン', 'ロシュ', 'サンチェス', 'タリス', 'ヴァレンティ', 'ウォルシュ', 'ヤンセン', 'ゼラー', 'ブレナン', 'コルビー', 'ドラン', 'フィンチ', 'グレイソン', 'ホロウェイ',
    'アイヴス', 'ジョスラン', 'カヴァナー', 'ルグラン', 'モロー', 'ネヴィル', 'オハラ', 'パスカル', 'リヴィエール', 'シモン', 'ターナー', 'ヴォス', 'ウィンストン', 'アシュビー', 'ボードワン',
    'クレマン', 'ダルトン', 'エルナンデス', 'ファレル', 'ギャロウェイ', 'ヘイスティング', 'ラフォン', 'メルシエ', 'ノースロップ', 'ペンローズ', 'レイノルズ', 'ストラウド', 'トレヴァー', 'ヴェルヌ', 'ワイルダー'];
  const INI = 'ABCDEFGHJKLMNPRSTW';

  F.map = new Map();
  const used = new Set();
  const realNames = new Set();
  const isForeign = name => /^[A-Z]\./.test(name) || /^[ァ-ヴー・]+$/.test(name.replace(/[A-Z.]/g, ''));
  // 実名から架空の名前を決める（同じ実名なら同じ名前。ほかの実在の騎手の名前とは重ならない）
  F.nameOf = function (real) {
    if (typeof real !== 'string' || !real || F.map.has(real) || real === '騎手未定') return F.map.get(real) || real;
    let h = U.hash('fict:' + real), name;
    for (let k = 0; k < 400; k++, h = U.hash(h + ':' + k)) {
      name = isForeign(real) ? `${INI[h % INI.length]}.${KANA[Math.floor(h / 17) % KANA.length]}` : `${SUR[h % SUR.length]}${GIV[Math.floor(h / 101) % GIV.length]}`;
      if (!used.has(name) && !realNames.has(name)) break;
    }
    used.add(name); F.map.set(real, name);
    return name;
  };
  // 文の中の騎手名（実名）を置き換える。長い名前から先に
  let pattern = null;
  F.text = function (s) {
    if (!s || typeof s !== 'string') return s;
    if (!pattern) {
      const names = [...F.map.keys()].filter(n => n.length >= 2).sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      pattern = names.length ? new RegExp(names.join('|'), 'g') : null;
    }
    return pattern ? s.replace(pattern, m => F.map.get(m) || m) : s;
  };

  F.apply = function () {
    const vals = v => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v) : []).filter(x => typeof x === 'string');
    // 先に実名を全部集める（架空の名前が実在の騎手と重ならないように）
    for (const j of D.jockeys || []) realNames.add(j.name);
    for (const key of ['historicJockeys', 'historicJockeysAuto']) for (const v of Object.values(D[key] || {})) vals(v).forEach(n => realNames.add(n));
    for (const d of (D.historic || []).concat(D.legendsExtra || [])) vals(d.jockey).forEach(n => realNames.add(n));
    for (const n of realNames) F.nameOf(n);
    for (const j of D.jockeys || []) j.name = F.nameOf(j.name);
    const mapJ = v => typeof v === 'string' ? F.nameOf(v) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'string' ? F.nameOf(x) : x])) : v;
    for (const key of ['historicJockeys', 'historicJockeysAuto']) if (D[key]) for (const n of Object.keys(D[key])) D[key][n] = mapJ(D[key][n]);
    // 文の中の名前は、名前を全部決めてから
    for (const d of (D.historic || []).concat(D.legendsExtra || [])) {
      if (d.jockey) d.jockey = mapJ(d.jockey);
      if (d.note) d.note = F.text(d.note);
      if (d.text) d.text = F.text(d.text);
    }
    for (const f of (D.famous || []).concat(D.profiles || [])) if (f.text) f.text = F.text(f.text);
  };
  F.apply();
})();
