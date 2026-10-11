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
