// 史実の勝ち鞍の記録のためのレース（遊ぶ番組には入れない）。外部のレビュー（2026-10-20）の「暦と史実の実績が結びつきすぎる」への対応。
// 史実馬の勝ち鞍のうち、ゲームの暦（HS.DATA.races）にその年の形が無いレースの格・馬場・距離・時期を、ここから引く（js/core/horse.js の H.winRaces・
// Godot の HSHorse.win_races・tools/growth_rule.js の monthOf）。芝とダートの向き・大舞台・回りなどが、暦に無い大レースの勝ちからも出し直される。
// 勝ち鞍そのものは記録の補い（data/src/winners_world_hand.jsonl。手で確かめたもの）から tools/build_auto.js が史実馬に足す。
// 書くのは出典で確かめた年と形だけ。course は data/courses.js にある競馬場だけ書く（無ければ空の文字。Godot が r.course を読むので項目は必ず置く）。month は出典に日付の無いものは uncertain:true。
// 1979年より前の豪州は格付けが無いので、いまの G1 にあたる大レース（ダービー・ギニー・コーフィールドカップ・ブリスベンカップ）を G1 として扱う（暦の1960年代の豪州の大レースと同じ扱い）。
(function () {
  const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};
  const O = (name, grade, country, surface, dist, month, year, o) => Object.assign({ name, short: name, grade, region: '海外', country, course: '', surface, dist, month, week: 2, from: year, to: year }, o || {});
  const U = { uncertain: true };
  HS.DATA.histRaces = [
    // ---- タロック（1957年の3歳の大レースと1961年のブリスベンカップ。出典：en.wikipedia「Tulloch (horse)」・名鑑） ----
    O('ローズヒルギニー', 'G1', '豪', '芝', 2000, 9, 1957, Object.assign({ course: 'ローズヒル' }, U)),
    O('コーフィールドギニー', 'G1', '豪', '芝', 1600, 10, 1957, Object.assign({ course: 'コーフィールド' }, U)),
    O('オーストラリアンダービー', 'G1', '豪', '芝', 2400, 10, 1957, Object.assign({ course: 'ランドウィック' }, U)),
    O('コーフィールドカップ', 'G1', '豪', '芝', 2400, 10, 1957, Object.assign({ course: 'コーフィールド' }, U)),
    O('ヴィクトリアダービー', 'G1', '豪', '芝', 2400, 11, 1957, Object.assign({ course: 'フレミントン' }, U)),
    O('クイーンズランドダービー', 'G1', '豪', '芝', 2400, 6, 1957, U),
    // 1958年の2つのセントレジャー（名鑑の「1958年は2つのセントレジャーを勝った」）。当時のクラシックだが、いまの格はそれより下なので G2（仮）
    O('VRCセントレジャー', 'G2', '豪', '芝', 2800, 3, 1958, Object.assign({ course: 'フレミントン' }, U)),
    O('AJCセントレジャー', 'G2', '豪', '芝', 2800, 4, 1958, Object.assign({ course: 'ランドウィック' }, U)),
    O('ブリスベンカップ', 'G1', '豪', '芝', 3200, 6, 1961, U),
    // ---- ラヴァマン（芝の G1。2013年に G2 へ。出典：en.wikipedia「Lava Man」「Charles Whittingham Stakes」） ----
    O('チャールズウィッティンガムメモリアルハンデキャップ', 'G1', '米', '芝', 2000, 6, 2006, Object.assign({ course: 'ハリウッドパーク' }, U)),
    // ---- キャンディライド（アルゼンチンの芝の G1 と米国の芝の G2。出典：en.wikipedia「Candy Ride」「Gran Premio Joaquín S. de Anchorena」「American Handicap」） ----
    O('サンイシドロ大賞', 'G1', '亜', '芝', 1600, 10, 2002),
    O('ホアキンSデアンチョレナ大賞', 'G1', '亜', '芝', 1600, 12, 2002, U),
    O('アメリカンハンデキャップ', 'G2', '米', '芝', 1800, 7, 2003, { course: 'ハリウッドパーク' }),
    // ---- バヤコア（米国の G1。出典：America's Best Racing「Bayakoa: Better With Age」・en.wikipedia の各レース） ----
    O('サンタマルガリータ招待ハンデキャップ', 'G1', '米', 'ダ', 1800, 3, 1989, { course: 'サンタアニタ', to: 1990 }),
    O('アップルブロッサムハンデキャップ', 'G1', '米', 'ダ', 1700, 4, 1989),
    O('ミレイディハンデキャップ', 'G1', '米', 'ダ', 1700, 5, 1989, Object.assign({ to: 1990 }, U)),
    O('ヴァニティハンデキャップ', 'G1', '米', 'ダ', 1800, 6, 1989, Object.assign({ course: 'ハリウッドパーク' }, U)),
    O('ラフィアンハンデキャップ', 'G1', '米', 'ダ', 1800, 9, 1989, { course: 'ベルモント' }),
    O('スピンスターステークス', 'G1', '米', 'ダ', 1800, 10, 1989, Object.assign({ course: 'キーンランド', to: 1990 }, U)),
    // ---- セレナーズソング（米国の G1。暦に無い年の形だけ。出典：en.wikipedia の各レース（Starlet Stakes・Santa Anita Oaks・Mother Goose Stakes・Haskell Stakes・Gazelle Stakes・Beldame Stakes）） ----
    O('ハリウッドスターレットステークス', 'G1', '米', 'ダ', 1700, 12, 1994, { course: 'ハリウッドパーク' }),
    O('サンタアニタオークス', 'G1', '米', 'ダ', 1700, 4, 1995, Object.assign({ course: 'サンタアニタ' }, U)),
    O('マザーグースステークス', 'G1', '米', 'ダ', 1800, 6, 1995, Object.assign({ course: 'ベルモント' }, U)),
    O('ハスケル招待ハンデキャップ', 'G1', '米', 'ダ', 1800, 7, 1995, { course: 'モンマスパーク' }),
    O('ガゼルハンデキャップ', 'G1', '米', 'ダ', 1800, 9, 1995, Object.assign({ course: 'ベルモント' }, U)),
    O('ベルデイムステークス', 'G1', '米', 'ダ', 1800, 10, 1995, { course: 'ベルモント' }),
  ];
})();
