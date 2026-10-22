# G1上位着順レビュー

確認日：2026-10-22（UTC）。対象：`claude/lucid-ptolemy-j204a3` の `9d368b9357ab62b94fb088c4b74ebe5b9525ce23`。
一覧21,304行（国内5,308・海外15,996）を読み、元JSONLとの対応・国内着差の計算・同名重複・ゲームの暦との対応を検査した。外部照合は主要古馬G1、米欧クラシック、既存レビューの重要候補を優先した抽出確認であり、全行の史実を保証するものではない。

既存の本書（`a917797e`）を、今回読めたJRA・NAR・主催者発表・結果表で更新した。確定した誤り、カナ補完、未確認候補を分ける。コード・JSONL・CSVは変更しない。

## 確認済み：着順・別競走混入・抜け・収録年

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| ドバイターフ | 2023 | 4 | Lord North（1着にも同馬） | Shirl's Speight。Lord North は1着だけ | https://www.sportinglife.com/racing/results/2023-03-25/meydan/730202/dubai-turf-sponsored-by-dp-world-group-1-turf |
| ドバイターフ | 2023 | 5 | Panthalassa（同着） | Serifos の単独5着。Panthalassa は当該競走に出走していない | https://www.sportinglife.com/racing/results/2023-03-25/meydan/730202/dubai-turf-sponsored-by-dp-world-group-1-turf |
| ドバイターフ | 2023 | 5 | Sir Busker（同着） | Sir Busker は10着。1〜5着から除外 | https://www.sportinglife.com/racing/results/2023-03-25/meydan/730202/dubai-turf-sponsored-by-dp-world-group-1-turf |
| ドバイデューティフリー | 2005 | 4 | Paolini | Alkaadhem | https://www.godolphin.com/runners-and-results/racecard/380858 |
| ドバイデューティフリー | 2005 | 5 | Right Approach（3着にも同馬、同着注記） | Prince Kirk の単独5着。Right Approach は3着だけ | https://www.godolphin.com/runners-and-results/racecard/380858 |
| ドバイデューティフリー | 2005 | 5 | Martillo（同着） | 当該年の出走馬ではない。余分な5着行を除外 | https://www.godolphin.com/runners-and-results/racecard/380858 |
| フォレ賞 | 2007 | 4 | Caradak | US Ranger | https://www.racingpost.com/results/211/longchamp/2007-10-06/442182/ |
| フォレ賞 | 2007 | 5 | Welsh Emperor（2着にも同馬） | Tariq。Welsh Emperor は2着だけ | https://www.racingpost.com/results/211/longchamp/2007-10-06/442182/ |
| サウジカップ | 2020 | 1 | Maximum Security | 失格。確定着順1〜5着から除外（2024年8月の裁決後） | https://jcsa.sa/en/news/20240802_thesaudicup_2020_title/ |
| サウジカップ | 2020 | 2 | Midnight Bisou | 1着 Midnight Bisou（2024年8月の裁決後） | https://jcsa.sa/en/news/20240802_thesaudicup_2020_title/ |
| サウジカップ | 2020 | 3 | Benbatl | 2着 Benbatl（2024年8月の裁決後） | https://jcsa.sa/en/news/20240802_thesaudicup_2020_title/ |
| サウジカップ | 2020 | 4 | Mucho Gusto | 3着 Mucho Gusto（2024年8月の裁決後） | https://jcsa.sa/en/news/20240802_thesaudicup_2020_title/ |
| サウジカップ | 2020 | 5 | Tacitus | 4着 Tacitus（2024年8月の裁決後） | https://jcsa.sa/en/news/20240802_thesaudicup_2020_title/ |
| サウジカップ | 2020 | 5（欠落） | Gold Dream の行なし | 5着 Gold Dream（ゴールドドリーム）を補充（2024年8月の裁決後） | https://jcsa.sa/en/news/20240802_thesaudicup_2020_title/ |
| ブリーダーズカップフィリー＆メアターフ | 2026 | 1〜3 | Destino d'Oro / Crevalle d'Oro / Movin' on Up を確定結果として収録 | 2026年10月22日時点では未施行（10月31日予定）。3頭の並びと½・½は1月24日のペガサスWCフィリー＆メアターフ（G2）の結果に一致。BCの結果として採用しない | https://nominations.breederscup.com/Championships/RaceSchedule 、 https://www.americasbestracing.net/races/2026-pegasus-world-cup-filly-and-mare-turf-invitational-s-presented-thoroughbred-aftercare |
| コックスプレート | 2018 | 4（欠落） | 1・2・3・5着だけ。Rostropovich は5着 | 4着 Avilius を補充（Humidor から3馬身） | https://www.asianracing.org/news/an-historic-fourth-cox-plate-win-for-world-champion-mare-winx-aus |
| ドイツダービー | 2011 | 4（欠落） | 1・2・3・5着だけ。Brown Panther は5着 | 4着 Mawingo を補充（Saltas から hd） | https://www.ahonoora.com/gerderby_2011.html |
| 川崎記念 | 1995 | 1〜5（6頭） | 統一GI/JpnIの一覧に1995年の結果を収録。ゲームの暦にも当該年の同名競走なし | 結果の年をずらすのではなく、統一GI/JpnIとしての収録範囲から外すか旧地方重賞として区別。統一GI格付けは1998年から | https://www.keiba.go.jp/dirtgraderace/2026/0408_kawasakikinen/introduction.html |

サウジカップ2020の着順は引用元の当日記事よりも後日の主催者裁決を優先した。1〜5着を並べ直す際には着差も一緒に再設定する必要がある。2026年BCの混入元は、馬名だけでなく上位3頭と着差½・½まで一致する。

## 確認済み：着差

以下の訂正値は、特記のない限り「前の異なる着順の馬との差」。同着内の直前行との差とは区別する。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| ブリーダーズカップクラシック | 2018 | 3 | Thunder Snow：1¾（前の馬との差） | ¾（前の馬との差） | https://www.ahonoora.com/bcclassic_2018.html |
| ブリーダーズカップクラシック | 2018 | 4 | Yoshida：1¾（前の馬との差） | nose（前の馬との差） | https://www.godolphin.com/news/terrific-breeders-cup-classic-third-for-thunder-snow |
| ブリーダーズカップクラシック | 2018 | 5 | Mendelssohn：4（前の馬との差） | 2¼（前の馬との差） | https://www.ahonoora.com/bcclassic_2018.html |
| ブリーダーズカップクラシック | 2019 | 4 | Elate：8½（前の馬との差） | 2¼（前の馬との差） | https://en.wikipedia.org/wiki/2019_Breeders%27_Cup_Classic |
| ブリーダーズカップクラシック | 2019 | 5 | Math Wizard：10¾（前の馬との差） | 4¼（前の馬との差） | https://en.wikipedia.org/wiki/2019_Breeders%27_Cup_Classic |
| ブリーダーズカップクラシック | 2020 | 3 | Global Campaign：3¼（前の馬との差） | 1（前の馬との差） | https://www.ahonoora.com/bcclassic_2020.html |
| ブリーダーズカップクラシック | 2020 | 4 | Tacitus：5¼（前の馬との差） | 2（前の馬との差） | https://www.ahonoora.com/bcclassic_2020.html |
| ブリーダーズカップクラシック | 2020 | 5 | Maximum Security：5¼（前の馬との差） | nose（前の馬との差） | https://www.ahonoora.com/bcclassic_2020.html |
| ブリーダーズカップクラシック | 2021 | 3 | Essential Quality：2¾（前の馬との差） | ¾（前の馬との差） | https://www.ahonoora.com/bcclassic_2021.html |
| ブリーダーズカップクラシック | 2021 | 4 | Hot Rod Charlie：3½（前の馬との差） | 1（前の馬との差） | https://www.ahonoora.com/bcclassic_2021.html |
| ブリーダーズカップクラシック | 2021 | 5 | Stilleto Boy：4½（前の馬との差） | 5¾（前の馬との差） | https://www.ahonoora.com/bcclassic_2021.html |
| ブリーダーズカップクラシック | 2022 | 3 | Taiba：8¾（前の馬との差） | ½（前の馬との差） | https://en.wikipedia.org/wiki/2022_Breeders%27_Cup_Classic |
| ブリーダーズカップクラシック | 2022 | 4 | Rich Strike：11¼（前の馬との差） | 2½（前の馬との差） | https://en.wikipedia.org/wiki/2022_Breeders%27_Cup_Classic |
| ブリーダーズカップクラシック | 2022 | 5 | Life Is Good：12½（前の馬との差） | 1¼（前の馬との差） | https://en.wikipedia.org/wiki/2022_Breeders%27_Cup_Classic |
| プリークネスステークス | 1989 | 2 | Easy Goer：0（前の馬との差） | nose（前の馬との差） | https://en.wikipedia.org/wiki/1989_Preakness_Stakes |
| プリークネスステークス | 1998 | 2 | Victory Gallop：0（前の馬との差） | 2¼（前の馬との差） | https://www.nyra.com/belmont/news/nyra-experts-top-5-belmont-stakes-victory-gallop-and-affirmed-thrill-packed-belmont-park-crowds |
| プリークネスステークス | 2012 | 2 | Bodemeister：0（前の馬との差） | nk（前の馬との差） | https://www.horse-races.net/library/preak12-results.htm |
| プリークネスステークス | 2015 | 2 | Tale of Verve：0（前の馬との差） | 7（前の馬との差） | https://en.wikipedia.org/wiki/2015_Preakness_Stakes |
| プリークネスステークス | 2015 | 3 | Divining Rod：7（前の馬との差） | 1（前の馬との差） | https://en.wikipedia.org/wiki/2015_Preakness_Stakes |
| プリークネスステークス | 2015 | 4 | Dortmund：8（前の馬との差） | 7½（前の馬との差） | https://en.wikipedia.org/wiki/2015_Preakness_Stakes |
| プリークネスステークス | 2015 | 5 | Mr. Z：15½（前の馬との差） | 1¾（前の馬との差） | https://en.wikipedia.org/wiki/2015_Preakness_Stakes |
| ベルモントステークス | 2022 | 3 | Skippylongstocking：6¼（前の馬との差） | 3¼（前の馬との差） | https://en.wikipedia.org/wiki/2022_Belmont_Stakes |
| ベルモントステークス | 2022 | 4 | We The People：7（前の馬との差） | ¾（前の馬との差） | https://en.wikipedia.org/wiki/2022_Belmont_Stakes |
| ベルモントステークス | 2022 | 5 | Creative Minister：12（前の馬との差） | 5（前の馬との差） | https://en.wikipedia.org/wiki/2022_Belmont_Stakes |
| ベルモントステークス | 2023 | 4（同着） | Angel of Empire：1½。もう一頭の4着 Hit Show は¾ | 同着2頭とも3着 Tapit Trice から¾。前行との差を積む方式なら後続の同着行は0または同着とし、¾を二重加算しない | https://cms.equibase.com/node/233408 |

米国のWikipediaは表ごとに意味が違う。例えば2022年BCクラシックの8¼・8¾・11¼・12½は勝ち馬からの累計であり、一律の行ずらしでは直せない。2021年のように勝ち馬行にも優勝着差を置く表もある。2018・2020年の微差は累計の丸め値を引くと消えるため、別の結果表でnoseを確認した。1989〜2015年プリークネスの2着27行すべてが「0」なのは内部確認済みだが、この表では外部照合した代表年だけ訂正した。

## 確認済み：同名別馬への紐付け

ゲーム側は `data/historic_auto.js`・`data/historic_old.js`・`data/historic_world.js` と `docs/review/horses.csv` を確認した。以下は国内行にも起きている誤紐付け。表示上の出走馬名が合っていても、別馬の能力を参照する。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| ジャパンカップダート | 2009 | 3 | ゴールデンチケット：○。ゲームの同名馬は2009年生・米国の Golden Ticket | 出走馬は2006年生の日本馬（父キングカメハメハ）。2009年生の米国馬への紐付けを外す | https://www.jbis.or.jp/horse/0000991264/ |
| ジャパンダートダービー | 2009 | 3 | ゴールデンチケット：○。ゲームの同名馬は2009年生・米国の Golden Ticket | 出走馬は2006年生の日本馬（父キングカメハメハ）。2009年生の米国馬への紐付けを外す | https://www.jbis.or.jp/horse/0000991264/ |
| 東京大賞典 | 2009 | 5 | ゴールデンチケット：○。ゲームの同名馬は2009年生・米国の Golden Ticket | 出走馬は2006年生の日本馬（父キングカメハメハ）。2009年生の米国馬への紐付けを外す | https://www.jbis.or.jp/horse/0000991264/ |
| 川崎記念 | 2010 | 4 | ゴールデンチケット：○。ゲームの同名馬は2009年生・米国の Golden Ticket | 出走馬は2006年生の日本馬（父キングカメハメハ）。2009年生の米国馬への紐付けを外す | https://www.jbis.or.jp/horse/0000991264/ |
| ジャパンカップ | 1992 | 5 | ヒシマサル：○。ゲームの「ヒシマサル」は1955年生 | ゲームの「ヒシマサル（1989）」へ対応させる。出走馬は1989年2月20日生 | https://www.meiba.jp/horses/view/1989108574 |
| 全日本2歳優駿 | 2008 | 2 | ナサニエル：○。ゲームの同名馬は2008年生の Nathaniel（父Galileo） | 出走馬は2006年生の Nathanael（父キングカメハメハ）。Nathaniel への紐付けを外す | https://www.jbis.or.jp/horse/0000990504/ |
| 朝日杯フューチュリティステークス | 2018 | 5 | ディープダイバー：○。ゲームの同名馬は1969年生・英国馬 | 出走馬は2016年生（父ブラックタイド）。1969年生の馬への紐付けを外す | https://jse.jpn.org/jrasrch.cgi?key=%4027927616 |
| マイルチャンピオンシップ南部杯 | 2022 | 2 | ヘリオス：○。ゲームの同名馬は1957年生 | 出走馬は2016年2月23日生。1957年生の馬への紐付けを外す | https://sp.keiba.go.jp/KeibaWeb/DataRoom/RaceHorseInfo?k_activeCode=2&k_lineageLoginCode=30044405236 |
| JBCスプリント | 2022 | 3 | ヘリオス：○。ゲームの同名馬は1957年生 | 出走馬は2016年生。1957年生の馬への紐付けを外す | https://www.keiba.go.jp/dirtgraderace/2022/rating/dirtgraderacerating/1103_JBCsprint.html |

「○を外す」は該当する別世代馬との対応を外す意味であり、実際の出走馬を結果から削除する意味ではない。海外行で既にカナが入った馬については、今回の抽出照合で別個体への誤対応を確定できなかった。

## 確認済み：英字名への注記混入

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| ドバイワールドカップ | 2004 | 5 | 元の綴り：Qaayed Alkhail** | Qaayed Alkhail。** は馬名から除き、King's Boy という別名は注へ | https://en.wikipedia.org/wiki/2004_Dubai_World_Cup |
| ケンタッキーダービー | 2021 | 1 | 元の綴り：Mandaloun (winner) | Mandaloun。着順説明の (winner) は馬名に含めない | https://en.wikipedia.org/wiki/2021_Kentucky_Derby |
| ケンタッキーダービー | 2021 | 2 | 元の綴り：Hot Rod Charlie (place) | Hot Rod Charlie。着順説明の (place) は馬名に含めない | https://en.wikipedia.org/wiki/2021_Kentucky_Derby |
| ケンタッキーダービー | 2021 | 3 | 元の綴り：Essential Quality (show) | Essential Quality。着順説明の (show) は馬名に含めない | https://en.wikipedia.org/wiki/2021_Kentucky_Derby |
| ベルモントステークス | 2022 | 2 | 元の綴り：ƒ Nest | Nest。ƒ は牝馬を示す記号で馬名ではない | https://en.wikipedia.org/wiki/2022_Belmont_Stakes |

海外の英字名をカナへ一律置換する提案ではない。馬名に入り込んだ着順説明・性別・脚注記号だけを分離する。

## カナ補完：保留20頭・21行

これは既知の保留欄への補完であり、新発見の誤着順には数えない。Blizzardが2行ある。Party Makerは外国馬ではなく浦和所属馬。以下のカナは当該レースのJRA成績・関連公式資料で確認した（Party MakerはNAR）。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| エリザベス女王杯 | 2003 | 3 | Tigertail（カナ未確認の注） | タイガーテイル。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/eliza/result/eliza2003.html |
| ジャパンカップ | 1991 | 3 | Shaftesbury Avenue（カナ未確認の注） | シャフツベリーアヴェニュー。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/jc/result/jc1991.html |
| ジャパンカップ | 1991 | 5 | Rough Habit（カナ未確認の注） | ラフハビット。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/jc/result/jc1991.html |
| ジャパンカップ | 1992 | 2 | Naturalism（カナ未確認の注） | ナチュラリズム。元の英字は「元の綴り」列へ | https://jra.jp/datafile/seiseki/g1/jc/result/jc1992.html |
| ジャパンカップ | 1992 | 3 | Dear Doctor（カナ未確認の注） | ディアドクター。元の英字は「元の綴り」列へ | https://jra.jp/datafile/seiseki/g1/jc/result/jc1992.html |
| ジャパンカップ | 1994 | 5 | Sandpit（カナ未確認の注） | サンドピット。元の英字は「元の綴り」列へ | https://jra.jp/datafile/seiseki/g1/jc/result/jc1994.html |
| ジャパンカップ | 1997 | 4 | Caitano（カナ未確認の注） | カイタノ。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/jc/result/jc1997.html |
| ジャパンカップ | 2000 | 4 | Ela Athena（カナ未確認の注） | エラアシーナ。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/jc/result/jc2000.html |
| ジャパンカップ | 2002 | 2 | Sarafan（カナ未確認の注） | サラファン。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/jc/result/jc2002.html |
| ジャパンカップ | 2004 | 4 | Policy Maker（カナ未確認の注） | ポリシーメイカー。元の英字は「元の綴り」列へ | https://jra.jp/datafile/seiseki/g1/jc/result/jc2004.html |
| ジャパンカップ | 2017 | 5 | Idaho（カナ未確認の注） | アイダホ。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/jc/result/jc2017.html |
| ジャパンカップダート | 2000 | 3 | Lord Sterling（カナ未確認の注） | ロードスターリング。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/jcd/result/jcd2000.html |
| スプリンターズステークス | 2004 | 3 | Cape of Good Hope（カナ未確認の注） | ケープオブグッドホープ。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/sprint/result/sprint2004.html |
| スプリンターズステークス | 2017 | 5 | Blizzard（カナ未確認の注） | ブリザード。元の英字は「元の綴り」列へ | https://jra.jp/datafile/seiseki/g1/sprint/result/sprint2017.html |
| 全日本2歳優駿 | 2014 | 5 | Party Maker（カナ未確認の注） | パーティメーカー（浦和所属の日本馬）。元の英字は「元の綴り」列へ | https://www.keiba.go.jp/furlong/2014/highlight/1217-01.html |
| 安田記念 | 1993 | 5 | Lotus Pool（カナ未確認の注） | ロータスプール。元の英字は「元の綴り」列へ | https://own.jra.jp/datafile/seiseki/g1/yasuda/result/yasuda1993.html |
| 安田記念 | 1998 | 5 | Allied Forces（カナ未確認の注） | アライドフォーシズ。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/yasuda/result/yasuda1998.html |
| 安田記念 | 2006 | 3 | Joyful Winner（カナ未確認の注） | ジョイフルウィナー。元の英字は「元の綴り」列へ | https://own.jra.jp/datafile/seiseki/g1/yasuda/result/yasuda2006.html |
| 安田記念 | 2008 | 2 | armada（カナ未確認の注） | アルマダ。元の英字は「元の綴り」列へ | https://www.jra.go.jp/datafile/seiseki/g1/yasuda/result/yasuda2008.html |
| 高松宮記念 | 2018 | 5 | Blizzard（カナ未確認の注） | ブリザード。元の英字は「元の綴り」列へ | https://jra.jp/datafile/seiseki/g1/takamatsu/result/takamatsu2018.html |
| 高松宮記念 | 2024 | 3 | Victor the Winner（カナ未確認の注） | ビクターザウィナー。元の英字は「元の綴り」列へ | https://jra.jp/datafile/seiseki/g1/takamatsu/result/takamatsu2024.html |

## 未確認：失格後の着差と残る順位矛盾

外部の元記事は読めたが、失格後の隣接馬間の着差を確定できない2件と、正しい順位列が未確認の1件。順位を勝手に元へ戻さない。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| 凱旋門賞 | 2006 | 3 | Hurricane Run：2½、基準は前の馬 | 引用元の2½は失格馬 Deep Impact との差。繰上げ後の2着 Pride との差として使えるか未確認。元表の½を足すと3だが、裁決後の着差として裏付けるまでは採用保留 | 未確認 |
| ドバイワールドカップ | 2006 | 2 | Wilko：3、基準は前の馬 | 引用元の3は失格馬 Brass Hat との差。繰上げ後の1着 Electrocutionist との差は3だけでは表せない。裁決後の公表値を確認するまで採用保留 | 未確認 |
| ヴィコンテスヴィジエ賞 | 2016 | 4〜5 | Walzertakt / Bathyrhon / Kicky Blue が4着同着、その次に Mille et Mille が5着 | 順位列が両立しない。実際の同着頭数・後続順位は未確認のため、推測で詰めない | 未確認 |

2006年の参照表：[凱旋門賞](https://en.wikipedia.org/wiki/2006_Prix_de_l%27Arc_de_Triomphe)、[ドバイWC](https://en.wikipedia.org/wiki/2006_Dubai_World_Cup)。表には失格馬を含む着差が残っている。ヴィコンテスヴィジエ賞の収録出典は `http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FLoViVi`。正しい差・着順を外部確認できたとは扱わない。

## 未確認：旧版から残す4着補充候補

次の28組は元データ内で1・2・3・5着だけを収録していることは再確認した。ただし、4着の馬名は外部照合未了。部分収録という扱いもあり得るため、全件を誤着順とは数えない。旧版の候補から、今回AviliusとMawingoを確定できた2組を上の表へ移した。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| ジャックルマロワ賞 | 1998 | 4（欠落） | 1・2・3・5着を収録。5着行は Waky Nao | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ジャックルマロワ賞 | 2014 | 4（欠落） | 1・2・3・5着を収録。5着行は Red Dubawi | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ムーラン・ド・ロンシャン賞 | 2010 | 4（欠落） | 1・2・3・5着を収録。5着行は Lope de Vega | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ムーラン・ド・ロンシャン賞 | 2015 | 4（欠落） | 1・2・3・5着を収録。5着行は Wild Chief | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ムーラン・ド・ロンシャン賞 | 2021 | 4（欠落） | 1・2・3・5着を収録。5着行は Novemba | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ブリーダーズカップフィリー＆メアターフ | 1999 | 4（欠落） | 1・2・3・5着を収録。5着行は Borgia | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| 英セントレジャー | 2006 | 4（欠落） | 1・2・3・5着を収録。5着行は Tusculum | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| アスコットゴールドカップ | 2011 | 4（欠落） | 1・2・3・5着を収録。5着行は Askar Tau | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| コロネーションカップ | 1999 | 4（欠落） | 1・2・3・5着を収録。5着行は Borgia | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| コロネーションカップ | 2008 | 4（欠落） | 1・2・3・5着を収録。5着行は Getaway | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ヨークシャーオークス | 2005 | 4（欠落） | 1・2・3・5着を収録。5着行は Iota | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| 仏オークス | 2010 | 4（欠落） | 1・2・3・5着を収録。5着行は Zagora | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| パリ大賞 | 1996 | 4（欠落） | 1・2・3・5着を収録。5着行は Blackwater II | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ガネー賞 | 2007 | 4（欠落） | 1・2・3・5着を収録。5着行は Egerton | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| イスパーン賞 | 2014 | 4（欠落） | 1・2・3・5着を収録。5着行は Neatico | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| サンクルー大賞 | 1994 | 4（欠落） | 1・2・3・5着を収録。5着行は Kornado | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| サンクルー大賞 | 1999 | 4（欠落） | 1・2・3・5着を収録。5着行は Borgia | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| サンクルー大賞 | 2008 | 4（欠落） | 1・2・3・5着を収録。5着行は Getaway | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| アベイドロンシャン賞 | 2002 | 4（欠落） | 1・2・3・5着を収録。5着行は Agnetha | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| モーリスドゲスト賞 | 2000 | 4（欠落） | 1・2・3・5着を収録。5着行は Tertullian | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| オペラ賞 | 2011 | 4（欠落） | 1・2・3・5着を収録。5着行は Djumama | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ベルリン大賞 | 1996 | 4（欠落） | 1・2・3・5着を収録。5着行は Phantom Gold | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| ブリーダーズカップスプリント | 2003 | 4（欠落） | 1・2・3・5着を収録。5着行は Yankee Gentleman | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| コーフィールドカップ | 2011 | 4（欠落） | 1・2・3・5着を収録。5着行は Lucas Cranach | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| コーフィールドカップ | 2014 | 4（欠落） | 1・2・3・5着を収録。5着行は Araldo | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| キングチャールズ3世ステークス | 2015 | 4（欠落） | 1・2・3・5着を収録。5着行は Sole Power | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| クイーンエリザベス2世ジュビリーステークス | 2010 | 4（欠落） | 1・2・3・5着を収録。5着行は Amico Fritz | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |
| オーストラリアンカップ | 2016 | 4（欠落） | 1・2・3・5着を収録。5着行は Our Ivanhowe | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 未確認 |

## 検査範囲と除外した誤検出

- CSVと2つのJSONLは、レース・年・着順・馬・元の英字・出典の多重集合が一致した。今回の確定指摘はCSVだけの書き出しミスではなく元データにもある。
- 国内の着差文字列4,214行は、元JSONLの `marginPrev` を仕様どおり積み上げると一致した（タイサは文字のまま保持）。これは元のJBIS値が全行正しいことを示す検査ではない。`*****` と降着を含む計算不能箇所は正解を推測していない。
- 指定の降着6レースの2着以下24行の空欄は誤りに数えない。有馬記念2020の5着2頭もJBISで確認でき、6行あることは正しい。[JBIS結果](https://www.jbis.or.jp/race/result/20201227/106/11/)
- ジャパンカップ1996の3着同着もJRA公式結果と一致する。[JRA結果](https://www.jra.go.jp/datafile/seiseki/g1/jc/result/jc1996.html)
- `data/races.js`・`races_old.js`・`races_world.js`・`races_more.js` とのレース名・年の照合では、川崎記念1995以外は当該年に同名定義があった。海外の暦が現在名へ統一し旧称をnoteへ置く仕様を、名称の誤りとはしない。各年の実格付けの全件監査は未実施。
- 古い海外年の3着止まり、説明済みの未取得競走、単なる着差空欄は新しい誤りに数えない。旧版の任意の紐付け候補やタイサの近似換算案も、外部で確定した誤記とは区別する。
- 読み取りはGitHub接続機能、外部確認はWeb検索・本文取得を使用。一部JBIS・Equibaseページは取得できず、別の結果表を読めた箇所だけ確認済みにした。

## 全体の所見（5行）

1. 優先修正はドバイターフ等の別馬混入、サウジカップの裁決更新、将来のBCに入った別競走の結果である。
2. 米国の着差は「前馬・次馬・勝ち馬からの累計」を表ごとに判別する必要があり、一律の行ずらしは複数年を壊している。
3. 国内の積み上げ計算は内部整合しているが、同名別世代への9行の紐付けは相手の強さの評価を直接歪める。
4. 保留20頭・21行のカナは公式資料で補完でき、未知の外国馬扱いになっていたパーティメーカーも日本馬と確認できた。
5. 未確認の差・欠けた4着を推測で埋めず、同着・失格・部分収録を区別してからゲームへ取り込むのがよい。
