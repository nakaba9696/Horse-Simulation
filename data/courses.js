// 競馬場のデータ（おおよその値）。lap＝1周の長さ、straight＝最後の直線、slope＝ゴール前の坂、speed＝馬場の速さの補正
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  const C = (region, dir, turf, dirt, extra) => Object.assign({ region, dir, turf, dirt }, extra || {});
  HS.DATA.courses = {
    // JRA
    '東京': C('JRA', '左', { lap: 2083, straight: 526, slope: '中' }, { lap: 1899, straight: 502, slope: '中' }, { area: '関東' }),
    '中山': C('JRA', '右', { lap: 1667, straight: 310, slope: '急' }, { lap: 1493, straight: 308, slope: '急' }, { area: '関東' }),
    '京都': C('JRA', '右', { lap: 1894, straight: 404, slope: '平' }, { lap: 1608, straight: 329, slope: '平' }, { area: '関西' }),
    '阪神': C('JRA', '右', { lap: 2089, straight: 474, slope: '急' }, { lap: 1518, straight: 353, slope: '急' }, { area: '関西' }),
    '中京': C('JRA', '左', { lap: 1706, straight: 413, slope: '急' }, { lap: 1530, straight: 411, slope: '急' }, { area: '関西' }),
    '新潟': C('JRA', '左', { lap: 2223, straight: 659, slope: '平' }, { lap: 1473, straight: 354, slope: '平' }, { area: 'ローカル' }),
    '福島': C('JRA', '右', { lap: 1600, straight: 292, slope: '小' }, { lap: 1445, straight: 296, slope: '小' }, { area: 'ローカル' }),
    '小倉': C('JRA', '右', { lap: 1615, straight: 293, slope: '平' }, { lap: 1445, straight: 291, slope: '平' }, { area: 'ローカル' }),
    '札幌': C('JRA', '右', { lap: 1641, straight: 266, slope: '平' }, { lap: 1487, straight: 264, slope: '平' }, { area: 'ローカル' }),
    '函館': C('JRA', '右', { lap: 1627, straight: 262, slope: '小' }, { lap: 1476, straight: 260, slope: '小' }, { area: 'ローカル' }),
    // 地方
    '大井': C('地方', '右', null, { lap: 1600, straight: 386, slope: '平' }),
    '川崎': C('地方', '左', null, { lap: 1200, straight: 300, slope: '平' }),
    '船橋': C('地方', '左', null, { lap: 1400, straight: 308, slope: '平' }),
    '盛岡': C('地方', '左', { lap: 1400, straight: 300, slope: '中' }, { lap: 1600, straight: 300, slope: '中' }),
    '園田': C('地方', '右', null, { lap: 1051, straight: 213, slope: '平' }),
    '名古屋': C('地方', '右', null, { lap: 1180, straight: 240, slope: '平' }),
    '門別': C('地方', '右', null, { lap: 1600, straight: 330, slope: '平' }),
    '金沢': C('地方', '右', null, { lap: 1200, straight: 236, slope: '平' }),
    '佐賀': C('地方', '右', null, { lap: 1100, straight: 200, slope: '平' }),
    '浦和': C('地方', '左', null, { lap: 1200, straight: 220, slope: '平' }),
    '笠松': C('地方', '右', null, { lap: 1100, straight: 201, slope: '平' }),
    '高知': C('地方', '右', null, { lap: 1100, straight: 200, slope: '平' }),
    '水沢': C('地方', '右', null, { lap: 1200, straight: 245, slope: '平' }),
    // 海外
    'ロンシャン': C('海外', '右', { lap: 2750, straight: 533, slope: '小', speed: -0.025 }, null, { country: '仏' }),
    'シャンティイ': C('海外', '右', { lap: 2400, straight: 600, slope: '小', speed: -0.02 }, null, { country: '仏' }),
    'ドーヴィル': C('海外', '右', { lap: 2200, straight: 1000, slope: '平', speed: -0.02 }, null, { country: '仏' }),
    'サンクルー': C('海外', '左', { lap: 2300, straight: 500, slope: '平', speed: -0.02 }, null, { country: '仏' }),
    'アスコット': C('海外', '右', { lap: 2800, straight: 500, slope: '急', speed: -0.025 }, null, { country: '英' }),
    'エプソム': C('海外', '左', { lap: 2400, straight: 600, slope: '中', speed: -0.02 }, null, { country: '英' }),
    'ニューマーケット': C('海外', '右', { lap: 2400, straight: 1600, slope: '中', speed: -0.02 }, null, { country: '英' }),
    'ヨーク': C('海外', '左', { lap: 3200, straight: 900, slope: '平', speed: -0.015 }, null, { country: '英' }),
    'グッドウッド': C('海外', '右', { lap: 2400, straight: 600, slope: '中', speed: -0.02 }, null, { country: '英' }),
    'メイダン': C('海外', '左', { lap: 2400, straight: 450, slope: '平' }, { lap: 1750, straight: 400, slope: '平' }, { country: 'UAE' }),
    'ナドアルシバ': C('海外', '左', { lap: 2121, straight: 400, slope: '平' }, { lap: 2254, straight: 400, slope: '平' }, { country: 'UAE' }),
    'シャティン': C('海外', '右', { lap: 1900, straight: 430, slope: '平' }, { lap: 1550, straight: 365, slope: '平' }, { country: '香港' }),
    'サンタアニタ': C('海外', '左', { lap: 1448, straight: 300, slope: '平' }, { lap: 1609, straight: 300, slope: '平', speed: 0.02 }, { country: '米' }),
    'チャーチルダウンズ': C('海外', '左', { lap: 1400, straight: 375, slope: '平' }, { lap: 1609, straight: 375, slope: '平', speed: 0.02 }, { country: '米' }),
    'ベルモント': C('海外', '左', { lap: 2100, straight: 335, slope: '平' }, { lap: 2414, straight: 335, slope: '平', speed: 0.02 }, { country: '米' }),
    'デルマー': C('海外', '左', { lap: 1400, straight: 280, slope: '平' }, { lap: 1609, straight: 280, slope: '平', speed: 0.02 }, { country: '米' }),
    'キーンランド': C('海外', '左', { lap: 1500, straight: 363, slope: '平' }, { lap: 1700, straight: 377, slope: '平', speed: 0.02 }, { country: '米' }),
    'ガルフストリームパーク': C('海外', '左', { lap: 1609, straight: 274, slope: '平' }, { lap: 1800, straight: 274, slope: '平', speed: 0.02 }, { country: '米' }),
    'ローンスター': C('海外', '左', { lap: 1407, straight: 284, slope: '平' }, { lap: 1609, straight: 284, slope: '平', speed: 0.02 }, { country: '米' }),
    'モンマスパーク': C('海外', '左', { lap: 1400, straight: 300, slope: '平' }, { lap: 1609, straight: 300, slope: '平', speed: 0.02 }, { country: '米' }),
    'アーリントン': C('海外', '左', { lap: 1609, straight: 320, slope: '平' }, { lap: 1800, straight: 320, slope: '平' }, { country: '米' }),
    'キングアブドゥルアジーズ': C('海外', '左', { lap: 1800, straight: 438, slope: '平' }, { lap: 2000, straight: 500, slope: '平' }, { country: 'サウジ' }),
    'ムーニーバレー': C('海外', '左', { lap: 1805, straight: 173, slope: '平' }, null, { country: '豪' }),
    'フレミントン': C('海外', '左', { lap: 2312, straight: 450, slope: '平' }, null, { country: '豪' }),
    'ランドウィック': C('海外', '右', { lap: 2213, straight: 410, slope: '小' }, null, { country: '豪' }),
    'コーフィールド': C('海外', '左', { lap: 2080, straight: 367, slope: '平' }, null, { country: '豪' }),
    'ウッドバイン': C('海外', '左', { lap: 2400, straight: 439, slope: '平' }, { lap: 1609, straight: 300, slope: '平' }, { country: '加' }),
    'ニューベリー': C('海外', '左', { lap: 2800, straight: 1000, slope: '平', speed: -0.02 }, null, { country: '英' }),
    'ハリウッドパーク': C('海外', '左', { lap: 1653, straight: 300, slope: '平' }, { lap: 1810, straight: 300, slope: '平', speed: 0.02 }, { country: '米' }),
    'アーリントンパーク': C('海外', '左', { lap: 1609, straight: 320, slope: '平' }, { lap: 1800, straight: 320, slope: '平' }, { country: '米' }),
    'ローンスターパーク': C('海外', '左', { lap: 1407, straight: 284, slope: '平' }, { lap: 1609, straight: 284, slope: '平', speed: 0.02 }, { country: '米' }),
    'ドンカスター': C('海外', '左', { lap: 3118, straight: 900, slope: '平', speed: -0.02 }, null, { country: '英' }),
    'サンダウン': C('海外', '右', { lap: 2600, straight: 800, slope: '急', speed: -0.02 }, null, { country: '英' }),
    'ケンプトン': C('海外', '右', { lap: 2600, straight: 600, slope: '平', speed: -0.02 }, null, { country: '英' }),
    'エア': C('海外', '左', { lap: 2400, straight: 800, slope: '平', speed: -0.02 }, null, { country: '英' }),
    'カラ': C('海外', '右', { lap: 3200, straight: 900, slope: '中', speed: -0.02 }, null, { country: '愛' }),
    'フェニックスパーク': C('海外', '左', { lap: 2400, straight: 600, slope: '平', speed: -0.02 }, null, { country: '愛' }),
    'バーデンバーデン': C('海外', '左', { lap: 2000, straight: 500, slope: '平', speed: -0.02 }, null, { country: '独' }),
    'ハンブルク': C('海外', '右', { lap: 2000, straight: 500, slope: '平', speed: -0.02 }, null, { country: '独' }),
    'ホッペガルテン': C('海外', '右', { lap: 2400, straight: 500, slope: '平', speed: -0.02 }, null, { country: '独' }),
    'デュッセルドルフ': C('海外', '右', { lap: 2000, straight: 500, slope: '小', speed: -0.02 }, null, { country: '独' }),
    'ピムリコ': C('海外', '左', { lap: 1400, straight: 350, slope: '平' }, { lap: 1609, straight: 350, slope: '平', speed: 0.02 }, { country: '米' }),
    'ローレルパーク': C('海外', '左', { lap: 1600, straight: 309, slope: '平' }, { lap: 1811, straight: 309, slope: '平', speed: 0.02 }, { country: '米' }),
    'サラトガ': C('海外', '左', { lap: 1600, straight: 350, slope: '平' }, { lap: 1811, straight: 350, slope: '平', speed: 0.02 }, { country: '米' }),
    'アケダクト': C('海外', '左', { lap: 1609, straight: 350, slope: '平' }, { lap: 1811, straight: 350, slope: '平', speed: 0.02 }, { country: '米' }),
    'コロニアルダウンズ': C('海外', '左', { lap: 1800, straight: 400, slope: '平' }, { lap: 2012, straight: 400, slope: '平', speed: 0.02 }, { country: '米' }),
    'ハッピーバレー': C('海外', '右', { lap: 1417, straight: 310, slope: '平' }, null, { country: '香港' }),
    'ローズヒル': C('海外', '右', { lap: 2048, straight: 408, slope: '平' }, null, { country: '豪' }),
    'クランジ': C('海外', '左', { lap: 2000, straight: 400, slope: '平' }, null, { country: '星' }),
    'レパーズタウン': C('海外', '左', { lap: 2800, straight: 400, slope: '中', speed: -0.02 }, null, { country: '愛' }),
    // 世界の有名な重賞を足したときに増やした競馬場（data/races_more.js。おおよその値）
    'ヘイドック': C('海外', '左', { lap: 2600, straight: 600, slope: '平', speed: -0.02 }, null, { country: '英' }),
    'オークローンパーク': C('海外', '左', null, { lap: 1609, straight: 350, slope: '平', speed: 0.02 }, { country: '米' }),
    'パークスレーシング': C('海外', '左', null, { lap: 1609, straight: 297, slope: '平', speed: 0.02 }, { country: '米' }),
  };
  // 英語の名前（持ち主の決定 2026-10-21「言語は日本語と英語にしたい」）。JRA・地方は公式の英語表記、海外は元の名前
  const EN = {
    '東京': 'Tokyo', '中山': 'Nakayama', '京都': 'Kyoto', '阪神': 'Hanshin', '中京': 'Chukyo', '新潟': 'Niigata', '福島': 'Fukushima', '小倉': 'Kokura', '札幌': 'Sapporo', '函館': 'Hakodate',
    '大井': 'Oi', '川崎': 'Kawasaki', '船橋': 'Funabashi', '盛岡': 'Morioka', '園田': 'Sonoda', '名古屋': 'Nagoya', '門別': 'Mombetsu', '金沢': 'Kanazawa', '佐賀': 'Saga', '浦和': 'Urawa', '笠松': 'Kasamatsu', '高知': 'Kochi', '水沢': 'Mizusawa',
    'ロンシャン': 'ParisLongchamp', 'シャンティイ': 'Chantilly', 'ドーヴィル': 'Deauville', 'サンクルー': 'Saint-Cloud', 'アスコット': 'Ascot', 'エプソム': 'Epsom Downs', 'ニューマーケット': 'Newmarket', 'ヨーク': 'York', 'グッドウッド': 'Goodwood',
    'メイダン': 'Meydan', 'ナドアルシバ': 'Nad Al Sheba', 'シャティン': 'Sha Tin', 'サンタアニタ': 'Santa Anita Park', 'チャーチルダウンズ': 'Churchill Downs', 'ベルモント': 'Belmont Park', 'デルマー': 'Del Mar', 'キーンランド': 'Keeneland',
    'ガルフストリームパーク': 'Gulfstream Park', 'ローンスター': 'Lone Star Park', 'モンマスパーク': 'Monmouth Park', 'アーリントン': 'Arlington Park', 'キングアブドゥルアジーズ': 'King Abdulaziz', 'ムーニーバレー': 'Moonee Valley', 'フレミントン': 'Flemington',
    'ランドウィック': 'Randwick', 'コーフィールド': 'Caulfield', 'ウッドバイン': 'Woodbine', 'ニューベリー': 'Newbury', 'ハリウッドパーク': 'Hollywood Park', 'アーリントンパーク': 'Arlington Park', 'ローンスターパーク': 'Lone Star Park', 'ドンカスター': 'Doncaster',
    'サンダウン': 'Sandown Park', 'ケンプトン': 'Kempton Park', 'エア': 'Ayr', 'カラ': 'The Curragh', 'フェニックスパーク': 'Phoenix Park', 'バーデンバーデン': 'Baden-Baden', 'ハンブルク': 'Hamburg', 'ホッペガルテン': 'Hoppegarten', 'デュッセルドルフ': 'Düsseldorf',
    'ピムリコ': 'Pimlico', 'ローレルパーク': 'Laurel Park', 'サラトガ': 'Saratoga', 'アケダクト': 'Aqueduct', 'コロニアルダウンズ': 'Colonial Downs', 'ハッピーバレー': 'Happy Valley', 'ローズヒル': 'Rosehill', 'クランジ': 'Kranji', 'レパーズタウン': 'Leopardstown',
    'ヘイドック': 'Haydock Park', 'オークローンパーク': 'Oaklawn Park', 'パークスレーシング': 'Parx Racing',
  };
  for (const [k, v] of Object.entries(EN)) if (HS.DATA.courses[k]) HS.DATA.courses[k].nameEn = v;
  // その月にオープン（OP・リステッド）を開く競馬場（おおよその開催）
  HS.DATA.meets = {
    1: ['中山', '京都', '中京'], 2: ['東京', '京都', '小倉'], 3: ['中山', '阪神', '中京'], 4: ['中山', '阪神', '福島'],
    5: ['東京', '京都', '新潟'], 6: ['東京', '阪神', '函館'], 7: ['福島', '中京', '函館'], 8: ['新潟', '小倉', '札幌'],
    9: ['中山', '阪神', '札幌'], 10: ['東京', '京都', '新潟'], 11: ['東京', '京都', '福島'], 12: ['中山', '阪神', '中京'],
  };
  // 枠の色（1〜8枠）
  HS.DATA.frameColors = ['#ffffff', '#222222', '#e0312f', '#2a63d4', '#f2cf1d', '#2c9a48', '#f08a1c', '#f07fb0'];
  HS.DATA.frameText = ['#222', '#fff', '#fff', '#fff', '#222', '#fff', '#fff', '#222'];
})();
