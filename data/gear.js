// 史実馬の馬具（3D のレースで描く）。出典で着けていたと確かめた馬だけを入れる
//   shadowRoll シャドーロール / blinkers ブリンカー / hood メンコ（耳覆い・覆面）/ cheekPieces チークピーシーズ
//   rollColor シャドーロールの色・color メンコとブリンカーの色・cheekColor チークピーシーズの色（出典に色が書かれているときだけ）
//   ずっと、または終わりまで着けていた馬を入れ、1戦だけ試した馬は入れない。時期は各行のコメントに書く
//   出典は ja.wikipedia（無いときは en.wikipedia）の各馬の記事。2026-10-16 に確かめた
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  HS.DATA.gear = {
    // シャドーロール
    'ナリタブライアン': { shadowRoll: true },                 // 「シャドーロールの怪物」。1993年の京都3歳ステークスから（ja.wikipedia）
    'スピードシンボリ': { shadowRoll: true },                 // 1969年の欧州遠征で装着（ja.wikipedia「シャドーロール」）
    'ブラストワンピース': { shadowRoll: true, rollColor: '#3f9a4a' }, // 「緑色のシャドーロールを装着している」（ja.wikipedia）
    'スノードラゴン': { shadowRoll: true, rollColor: '#f2d23a' },     // 「黄色のシャドーロールがトレードマーク」（ja.wikipedia）
    'マツリダゴッホ': { shadowRoll: true },                   // 「白いシャドーロール」2007年有馬記念の写真の説明（ja.wikipedia）
    'ニシノライデン': { shadowRoll: true },                   // 「シャドーロールを代名詞とする一頭」（ja.wikipedia）
    'ナリタキングオー': { shadowRoll: true },                 // 1995年の共同通信杯から（ja.wikipedia）
    'セキテイリュウオー': { shadowRoll: true },               // 1994年の東京新聞杯から（ja.wikipedia）
    'エアウィンザー': { shadowRoll: true },                   // 共同通信杯から（ja.wikipedia）
    'ソレミア': { shadowRoll: true },                         // 2012年のヴェルメイユ賞から（ja.wikipedia）
    'ウォーパス': { shadowRoll: true },                       // 「白いシャドーロールを付けていた」（ja.wikipedia）
    'ゲームオンデュード': { blinkers: true, shadowRoll: true, rollColor: '#2f5fb8' }, // 「ブリンカーと青いシャドーロール」（ja.wikipedia）
    'ダノンレジェンド': { shadowRoll: true, blinkers: true }, // 2014年にシャドーロール、のちブリンカーも（ja.wikipedia）
    'ゴールドシップ': { shadowRoll: true, blinkers: true },   // 2013年有馬記念からブリンカー、2014年宝塚記念からシャドーロールも（ja.wikipedia）
    'アーモンドアイ': { shadowRoll: true, hood: true, color: '#1b1b1d' }, // 「黒いフードと白いシャドーロール」（en.wikipedia "Almond Eye"）
    // メンコ（耳覆い・覆面）
    'ビワハヤヒデ': { hood: true, color: '#c8282c' },         // 「耳覆いのついた赤いメンコ」。1993年の神戸新聞杯で外した（ja.wikipedia）
    'マーベラスサンデー': { hood: true, color: '#c8282c' },   // 「赤いメンコ（覆面）がトレードマーク」（ja.wikipedia）
    'ライデンリーダー': { hood: true, color: '#c8282c' },     // 「『RL』の文字が入った赤いメンコ」（ja.wikipedia）
    'サイレンススズカ': { hood: true, color: '#2f8a46' },     // 「緑色のメンコを着用して出走」1997年の東京優駿から（ja.wikipedia）
    'グリーングラス': { hood: true, color: '#2f8a46' },       // 「名前と同じ緑色のメンコ」（ja.wikipedia）
    'タイテエム': { hood: true, color: '#f2f2ee' },           // 「白いメンコを泥で真っ黒にしながら優勝」（ja.wikipedia）
    'カツラギエース': { hood: true, color: '#f2f2ee' },       // 1984年ジャパンカップで「特注の白いメンコ」（ja.wikipedia）
    'ツインターボ': { hood: true, color: '#f2f2ee' },         // 「white hood」1991年ラジオたんぱ賞の写真の説明（en.wikipedia "Twin Turbo (horse)"）
    'カワカミプリンセス': { hood: true },                     // 「音に敏感だったため、覆面を装着」（ja.wikipedia）
    'ジェンティルドンナ': { hood: true, color: '#1b1b1d' },   // 「黒いメンコの上に赤いメンコ」（赤はファンファーレまで）（ja.wikipedia）
    'エアスピネル': { hood: true, color: '#e9c32a' },         // 「勝負服に合わせた黄色と青色」2016年の皐月賞から（ja.wikipedia）
    'レインボーライン': { hood: true, color: '#2f5fb8' },     // 「青のメンコ」2016年アーリントンカップの写真の説明（ja.wikipedia）
    'ナイスネイチャ': { hood: true },                         // 1994年の高松宮杯まで着けていた（ja.wikipedia）
    'ダイワスカーレット': { hood: true },                     // 2007年秋から（ja.wikipedia）
    'ヴィルシーナ': { hood: true },                           // 「バツ印をデザインしたメンコ」（ja.wikipedia）
    'アラシ': { hood: true },                                 // 「『嵐』の文字が大きくメンコに描かれていた」（ja.wikipedia）
    'アメリカンファラオ': { hood: true },                     // デルマーフューチュリティから耳に綿を詰めたフード（ja.wikipedia）
    'ラヴズオンリーユー': { hood: true },                     // 「メンコを装着していながらも」（ja.wikipedia）
    // ブリンカー
    'セクレタリアト': { blinkers: true, hood: true },         // "typically wore a blinker hood"（en.wikipedia "Secretariat (horse)"）
    'ステイゴールド': { blinkers: true },                     // 2001年ジャパンカップから、左目だけを覆うもの（ja.wikipedia）
    'ローゼンカバリー': { blinkers: true, hood: true, color: '#e9c32a' }, // 「おばけブリンカー」黄と黒の縞（ja.wikipedia）
    'キンシャサノキセキ': { blinkers: true, cheekPieces: true }, // 右側だけのブリンカー、2011年オーシャンSからチークピーシーズ（ja.wikipedia）
    'タイキブリザード': { blinkers: true },                   // 1996年の安田記念から（ja.wikipedia）
    'シンコウウインディ': { blinkers: true },                 // 1997年の平安ステークスから（ja.wikipedia）
    'アルアイン': { blinkers: true },                         // 2019年の金鯱賞から（ja.wikipedia）
    'デルタブルース': { blinkers: true },                     // 2007年の天皇賞（秋）から（ja.wikipedia）
    'エズード': { blinkers: true },                           // 「レースでは基本的にブリンカーを着用」（ja.wikipedia）
    'カフェファラオ': { blinkers: true },                     // 2021年チャンピオンズカップ（ja.wikipedia）
    // チークピーシーズ
    'カネツクロス': { cheekPieces: true },                    // 「日本の競走馬で初めて装着した馬」（ja.wikipedia）
    'ストーミングホーム': { cheekPieces: true },              // 2002年のジャパンカップ（ja.wikipedia）
  };
})();
