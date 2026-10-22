# 海外馬「主な勝鞍」レビュー

確認日：2026-10-22  
対象：`nakaba9696/Horse-Simulation`、`claude/lucid-ptolemy-j204a3`  
対象コミット：`a0d70baddc8a94a81a079235424d1e1bef7aba93`  
対象ファイル：`docs/review/main_wins.csv`、`data/main_wins_world.js`

著名馬とG1勝利数の多い馬を優先した抜き取りレビュー。外部資料で裏付けた指摘は**26頭・50件**。全1,477頭の史実照合を完了したという意味ではない。CSVとJSについては全1,477頭の日本語勝鞍・英語勝鞍・G1勝利数が一致することを機械的に確認したため、下表は両ファイルに共通する指摘となる。コードとデータは変更していない。総合力・能力値は対象外。

G1勝利数は掲載件数ではなく生涯の勝利数で、競走の格は勝った年で判定した。表中のG1・G2・Listedはレビュー上の説明であり、勝鞍の表示文字列へ追加する提案ではない。「 / 」は日本語・英語の対訳を示す。スポンサーを除く英語名は、今回指定された表記方針への修正として扱った。

## 出典で確認できた指摘

| 名前 | 項目 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|
| コンガリー | 未勝利レース | 2001 ケンタッキーダービー / 2001 Kentucky Derby | 削除（3着） | https://cms.equibase.com/node/141300 |
| コンガリー | 未勝利レース | 2001 プリークネスステークス / 2001 Preakness Stakes | 削除（3着） | https://cms.equibase.com/node/141300 |
| コンガリー | G1の勝ち数 | 7 | 5 | https://cms.equibase.com/node/141300 |
| コンガリー | G1勝鞍の抜け | 記載なし | 2003 カーターハンデキャップ / 2003 Carter Handicap | https://en.wikipedia.org/wiki/Congaree_(horse) |
| ジオポンティ | 未勝利レース | 2009 ブリーダーズカップクラシック / 2009 Breeders' Cup Classic | 削除（2着） | https://arrowfield.com.au/news/gio-ponti-just-how-good-was-he-really-html/ |
| ジオポンティ | 未勝利レース | 2010 ブリーダーズカップマイル / 2010 Breeders' Cup Mile | 削除（2着） | https://arrowfield.com.au/news/gio-ponti-just-how-good-was-he-really-html/ |
| ジオポンティ | G1の勝ち数 | 5 | 7 | https://arrowfield.com.au/2012/04/12/us-champion-gio-ponti-joins-2012-arrowfield-roster-html/ |
| ジオポンティ | G1勝鞍の抜け | 記載なし | 2009 マンノウォーステークス / 2009 Man o' War Stakes | https://en.wikipedia.org/wiki/Gio_Ponti_(horse) |
| ジオポンティ | G1勝鞍の抜け | 記載なし | 2010 マンノウォーステークス / 2010 Man o' War Stakes | https://en.wikipedia.org/wiki/Gio_Ponti_(horse) |
| ジオポンティ | G1勝鞍の抜け | 記載なし | 2010 シャドウェルターフマイルステークス / 2010 Shadwell Turf Mile Stakes | https://en.wikipedia.org/wiki/Gio_Ponti_(horse) |
| ジオポンティ | G1勝鞍の抜け | 記載なし | 2011 シャドウェルターフマイルステークス / 2011 Shadwell Turf Mile Stakes | https://en.wikipedia.org/wiki/Gio_Ponti_(horse) |
| アシャド | G1の勝ち数 | 6 | 7（2004 コティリオンは当時G2） | https://cms.equibase.com/node/30341 |
| アシャド | G1勝鞍の抜け | 記載なし | 2005 ゴーフォーワンドハンデキャップ / 2005 Go for Wand Handicap | https://cms.equibase.com/node/30341 |
| アシャド | G1勝鞍の抜け | 記載なし | 2005 ベルデイムステークス / 2005 Beldame Stakes | https://cms.equibase.com/node/30341 |
| インサイドインフォメーション | G1の勝ち数 | 5 | 6 | https://nrm.tjctechnology.com/hall-of-fame/horse/inside-information-ky |
| インサイドインフォメーション | G1勝鞍の抜け | 記載なし | 1995 ブリーダーズカップディスタフ / 1995 Breeders' Cup Distaff（G2ボニーミスより優先） | https://nrm.tjctechnology.com/hall-of-fame/horse/inside-information-ky |
| レモンドロップキッド | G1の勝ち数 | 6 | 5（2000 ブルックリンとサバーバンは当時G2） | https://www.racingpost.com/bloodstock/news/top-stallion-lemon-drop-kid-pensioned-at-lanes-end-aXZay4f5DYrQ/<br>https://www.thoroughbreddailynews.com/lemon-drop-kid-passes-away-aged-28-at-lanes-end/ |
| レモンドロップキッド | G1勝鞍の抜け | 記載なし | 1998 フューチュリティステークス / 1998 Futurity Stakes（ベルモントパーク） | https://www.racingpost.com/bloodstock/news/top-stallion-lemon-drop-kid-pensioned-at-lanes-end-aXZay4f5DYrQ/ |
| グッバイヘイロー | G1の勝ち数 | 6 | 7 | https://www.americanclassicpedigrees.com/goodbye-halo.html |
| グッバイヘイロー | G1勝鞍の抜け | 記載なし | 1989 ラカナダステークス / 1989 La Cañada Stakes | https://www.americanclassicpedigrees.com/goodbye-halo.html |
| バヤコア | G1の勝ち数 | 10 | 13（米国12勝＋アルゼンチン1勝） | https://en.wikipedia.org/wiki/Bayakoa |
| スーパーインポーズ | G1の勝ち数 | 11 | 8 | https://en.wikipedia.org/wiki/Super_Impose |
| スーパーインポーズ | G1勝鞍の抜け | 記載なし | 1991 ランヴェットステークス / 1991 Ranvet Stakes | https://en.wikipedia.org/wiki/Super_Impose |
| スーパーインポーズ | G1勝鞍の抜け | 記載なし | 1991 チッピングノートンステークス / 1991 Chipping Norton Stakes | https://en.wikipedia.org/wiki/Super_Impose |
| スーパーインポーズ | G1勝鞍の抜け | 記載なし | 1992 チッピングノートンステークス / 1992 Chipping Norton Stakes | https://en.wikipedia.org/wiki/Super_Impose |
| ウィークエンドハスラー | G1の勝ち数 | 9 | 7（2008 メムジーとマカイビーディーヴァは当時G2） | https://www.abc.net.au/news/2010-10-13/top-galloper-weekend-hussler-retired/2296540 |
| ウィークエンドハスラー | G1勝鞍の抜け | 記載なし | 2008 アンダーウッドステークス / 2008 Underwood Stakes | https://inglis.com.au/news/easter-bluebloods-and-hussler-highlight-stakes-rai |
| ソングバード | G1の勝ち数 | 7 | 9 | https://nrm.tjctechnology.com/hall-of-fame/horse/songbird-ky |
| ソングバード | G1勝鞍の選定不足 | 7件のみ | 8件にする。未掲載の2015 シャンデリアステークス / 2015 Chandelier Stakes、2017 デラウェアハンデキャップ / 2017 Delaware Handicapのうち1件を追加（両方の必須追加という指摘ではない） | https://nrm.tjctechnology.com/hall-of-fame/horse/songbird-ky |
| ストラディバリウス | G1の勝ち数 | 8 | 7（2018 ロングディスタンスカップは当時G2） | https://www.thoroughbreddailynews.com/stradivarius-to-stay-in-training/ |
| コディーズウィッシュ | G1の勝ち数 | 6 | 5（2023 ヴォスバーグはG2） | https://www.truenicks.com/articles/274527/codys-wish-earns-horse-of-the-year-honors |
| ミスフィンランド | G1の勝ち数 | 6 | 5（2007 メムジーは当時G2） | https://arrowfield.com.au/2013/06/12/miss-finland-html/<br>https://www.racingaustralia.horse/FreeFields/RaceHistory.aspx?GroupID=353 |
| アレクサンダーゴールドラン | 勝利年（日英） | 2004 プリティーポリーステークス / 2004 Pretty Polly Stakes | 2006 プリティーポリーステークス / 2006 Pretty Polly Stakes（2005年の既存行は維持） | https://www.rte.ie/sport/racing/2006/0701/206360-alexandergoldrun/ |
| ラクティ | G1の勝ち数 | 5 | 6 | https://www.rte.ie/sport/racing/2005/0704/194094-rakti/ |
| エレクトロキューショニスト | G1勝鞍の抜け | 記載なし | 2005 ミラノ大賞 / 2005 Gran Premio di Milano | https://www.thoroughbreddailynews.com/pdf/tdn/2005/tdn050620.pdf |
| エレクトロキューショニスト | 選定対象外の勝鞍 | 2004 イタリア大賞 / 2004 Gran Premio d'Italia | 削除（勝利自体は事実だがListed。今回のG1・G2の選定条件外） | https://www.thoroughbreddailynews.com/pdf/tdn/2005/tdn050620.pdf |
| エレクトロキューショニスト | 英語名（スポンサー・略記） | 2005 Juddmonte International | 2005 International Stakes | https://en.wikipedia.org/wiki/International_Stakes |
| アルマンディン | G1の勝ち数 | 3 | 2（メルボルンカップ、タンクレッド。2014 バーデン企業大賞はG2） | https://www.breednet.com.au/news/3836/almandin-proves-too-strong-in-tancred-stakes<br>https://www.deutscher-galopp.de/gr/aktuelles/meldungen/20140601-almandin-der-Ueberraschungssieger.php |
| アルマンディン | 選定対象外の勝鞍 | 2016 ハリー・ホワイト / 2016 Harry White | 削除（勝利自体は事実だがListed。今回のG1・G2の選定条件外） | https://www.races.com.au/2016/09/24/spring-cup-hope-almandin-wins-2016-harry-white-classic/ |
| アルマンディン | 英語名（末尾欠落） | 2016 Harry White | 2016 Harry White Classic（原記録の競走名。主な勝鞍からは上記理由で削除） | https://www.races.com.au/2016/09/24/spring-cup-hope-almandin-wins-2016-harry-white-classic/ |
| ヴェンジェンスオブレイン | 日本語レース名 | 2005 エリザベス女王杯 | 2005 クイーンエリザベス2世カップ | https://world.jra-van.jp/race/hkcd/2019/qe2c/winner/ |
| ヴィヴァパタカ | 日本語レース名 | 2007 エリザベス女王杯 | 2007 クイーンエリザベス2世カップ | https://world.jra-van.jp/race/hkcd/2019/qe2c/winner/ |
| ヴィヴァパタカ | 日本語レース名 | 2010 エリザベス女王杯 | 2010 クイーンエリザベス2世カップ | https://world.jra-van.jp/race/hkcd/2019/qe2c/winner/ |
| プレスヴィス | 日本語レース名 | 2009 エリザベス女王杯 | 2009 クイーンエリザベス2世カップ | https://world.jra-van.jp/race/hkcd/2019/qe2c/winner/ |
| アンビシャスドラゴン | 日本語レース名 | 2011 エリザベス女王杯 | 2011 クイーンエリザベス2世カップ | https://world.jra-van.jp/race/hkcd/2019/qe2c/winner/ |
| ミリタリーアタック | 日本語レース名 | 2013 エリザベス女王杯 | 2013 クイーンエリザベス2世カップ | https://world.jra-van.jp/race/hkcd/2019/qe2c/winner/ |
| デザインズオンローム | 日本語レース名 | 2014 エリザベス女王杯 | 2014 クイーンエリザベス2世カップ | https://world.jra-van.jp/race/hkcd/2019/qe2c/winner/ |
| ハイランドリール | 英語名（表示用略記） | 2016 K.George VI & Q. Elizabeth Stakes | 2016 King George VI and Queen Elizabeth Stakes | https://www.skysports.com/racing/news/10510617/highland-reel-wins-king-george-vi-and-queen-elizabeth-stakes-at-ascot |
| キャンディライド | 英語名（表示用略記） | 2002 G. P. Internacional Joaquín S. de Anchorena | 2002 Gran Premio Internacional Joaquín S. de Anchorena | https://www.rionegro.com.ar/un-haras-neuquino-que-quiere-jugar-en-primera-OAHRN1240715899244/ |
| モスターダフ | 英語名（スポンサー） | 2023 Juddmonte International Stakes | 2023 International Stakes | https://en.wikipedia.org/wiki/International_Stakes |

アシャドは欠けた2勝を加えるとG1が7件になるため、G2の2004 コティリオンは主な勝鞍から外す。スーパーインポーズは欠けた3勝を加え、1989 ターンブルと1990・1991 ワーウィックを外すとG1の8件になる。ウィークエンドハスラーは欠けたアンダーウッドを加え、当時G2のメムジーとマカイビーディーヴァを外すとG1の7件になる。これらは勝っていないという指摘ではなく、G1を優先する選定条件の適用である。当時の格は[ターンブルの格付け沿革](https://en.wikipedia.org/wiki/Turnbull_Stakes)、[ワーウィックの沿革](https://www.justhorseracing.com.au/general-news/snippets/facts/warwick-stakes-history-and-past-winners/158455)、Racing Australiaの[メムジー](https://www.racingaustralia.horse/FreeFields/RaceHistory.aspx?GroupID=353)・[マカイビーディーヴァ](https://www.racingaustralia.horse/FreeFields/RaceHistory.aspx?GroupID=214)の年別記録も参照。

ソングバードとバヤコアはG1が8勝を超える。実際のG1勝利数の訂正と、最大8件の表示枠の選定は別問題として扱い、省略されたG1をすべて必須追加とはしていない。

## 未確認・集計方針の確認が必要なもの

以下は確定した誤りとは扱わず、上記50件にも含めない。

| 名前 | 項目 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|
| ヴィヴァパタカ | G1集計基準 | 8（香港ダービー、国際G1昇格前の香港ゴールドカップ等を含む） | 未確認。香港ローカルG1を含めるか、当時の国際G1に限るかを決めてから再集計。今回の確定指摘には算入しない | 未確認 |
| アルマンディン | 日本語名の慣用表記 | 2016 ハリー・ホワイト | 未確認。英語名Harry White Classicの末尾欠落は上表で確認済みだが、「ハリーホワイトクラシック」が日本で定着した表記かは確認できず | 未確認 |

ヘンリー2世ステークス、ゴドルフィンマイル、リボー賞など、手作業で当てた日本語名約36種の全件を検証したわけではない。同名別馬の取り違えについても、今回確定できた指摘はない。

## 全体の所見

- 最優先は未勝利レースの混入。コンガリーの米二冠、ジオポンティのBC2競走は勝鞍から削除する必要がある。
- G1勝利数は掲載件数や現在の格から求めず、勝利当年の格で集計する必要がある。過大計上と過少計上の両方が見つかった。
- G2の補充前にG1の抜けを確認したい。アシャド、インサイドインフォメーションなどで重要なG1勝利が落ちている。
- 日本語名は香港のQueen Elizabeth II Cupの誤訳が反復している。英語名には略記・末尾欠落・スポンサーの残存がある。
- 本レビューは重点抽出であり網羅的な品質保証ではない。香港ローカル格の集計基準と、未検証の日本語名は追加確認が必要。

## 対応結果（2026-10-22）

指摘を記載の出典（en.wikipedia の馬・レースの記事、Equibase、Arrowfield、TDN、RTÉ、ABC など）と1件ずつ照合し、確定したものを `data/main_wins_world.js` に反映した。`docs/review/main_wins.csv` は元データから作り直す道具 `tools/build_main_wins_csv.js`（`--check` で一致だけ確かめる）で書き出した。総合力・能力値は変えていない。

### レビューの50件

50件すべてを出典で確かめ、全部を反映した（26頭）。

| 種類 | 件数 | 内容 |
|---|---|---|
| 未勝利レースの混入 | 4 | コンガリーの2001 ケンタッキーダービー・プリークネス（いずれも3着。Equibase）、ジオポンティの2009 BC クラシック・2010 BC マイル（いずれも2着。Arrowfield） |
| G1 の勝ち数 | 15 | コンガリー 7→5、ジオポンティ 5→7、アシャド 6→7、インサイドインフォメーション 5→6、レモンドロップキッド 6→5、グッバイヘイロー 6→7、バヤコア 10→13、スーパーインポーズ 11→8、ウィークエンドハスラー 9→7、ソングバード 7→9、ストラディバリウス 8→7、コディーズウィッシュ 6→5（2023 ヴォスバーグは G2。TrueNicks）、ミスフィンランド 6→5、ラクティ 5→6、アルマンディン 3→2 |
| G1 の抜け | 16 | コンガリーのカーター H、ジオポンティのマンノウォー2回・シャドウェルターフマイル2回、アシャドのゴーフォーワンド・ベルデイム、インサイドインフォメーションの1995 BC ディスタフ、レモンドロップキッドの1998 フューチュリティ、グッバイヘイローのラカナダ、スーパーインポーズのランヴェット・チッピングノートン2回、ウィークエンドハスラーのアンダーウッド、ソングバードの2017 デラウェア H（9勝のうち8件の枠に1件）、エレクトロキューショニストのミラノ大賞 |
| 香港の Queen Elizabeth II Cup の誤訳 | 7 | 「エリザベス女王杯」→「クイーンエリザベス2世カップ」（6頭） |
| そのほか | 8 | アレクサンダーゴールドランのプリティーポリーを2004→2006、エレクトロキューショニストの2004 イタリア大賞（当時 Listed。TDN 2005-06-20）とアルマンディンの2016 ハリーホワイトクラシック（Listed）を外す、英語名の略記・スポンサー名（K.George… → King George VI and Queen Elizabeth Stakes、G. P. → Gran Premio、Juddmonte International → International Stakes を2頭） |

G1 を優先する選定にあわせて、G1 の抜けを足した馬は G2 の勝鞍を外した（アシャドの2004 コティリオン、インサイドインフォメーションのボニーミス、レモンドロップキッドの2000 ブルックリン、スーパーインポーズのターンブル・ワーウィック2回、ウィークエンドハスラーのメムジー・マカイビーディーヴァ、ストラディバリウスのロングディスタンスカップ（G2）、ジオポンティのバーボン S）。エレクトロキューショニストは G1 が3勝なので、同じ TDN で G2 と確かめたカルロダレッシオ賞を足した。

### 未確認の2件

- ヴィヴァパタカの G1 集計：下の「香港の G1 の数え方」で基準を決めて数え直した。香港ダービー（国内 G1）を含めて8勝で、いまの値と同じため変更なし。
- アルマンディンの「ハリー・ホワイト」の日本語名：この勝鞍は Listed で G1・G2 の選定から外したため、日本語名を決める必要が無くなった（推測の名前は入れていない）。

### 香港の G1 の数え方（判断）

香港ジョッキークラブがその年に付けていた格で数え、香港ダービー・香港クラシックマイルのような国内 G1（domestic Group 1）も G1 に含める。根拠：米国の Grade 1 も米国の格付け委員会が付ける国内の格で、このデータはそれを G1 として数えている。香港の馬の記事（en.wikipedia）も香港ダービーを「最初の Group One」と数える（ヴィヴァパタカの記事）。格が上がった年のあとの勝ちだけを数える（例：クイーンズシルヴァージュビリーカップは2005/06年から、センテナリースプリントカップは2017/18年から G1）。いままで香港ダービーだけの馬が0勝になっていた食い違いを直した（ルガー・ピンハイスター・スカイダーシー・マッシヴソヴリン・キャップフェラ・インビンシブルアイビス 0→1、フローレ 0→2、ビューティーオンリー・マイウィッシュ・ラッパードラゴン 1→2、ワーザー 3→4）。ヴォイッジバブルは抜けていた2023 香港ダービーを足して 6→7。

### レビューの外で見つけて直したもの（109頭）

誤りの原因は、元にした英語版 Wikipedia の馬の記事の infobox の勝鞍の欄の読み方にあった。着順の行（「3rd Kentucky Derby (2001)」「Preakness Stakes 2nd」「Breeders' Cup placings」の見出しの下の行）を勝ちとして読み、太字の見出し（「Triple Crown race wins:」など）の下の行や欄の最後の行・「2,000 Guineas」のカンマの入った名前を落としていた。同じ種類の誤りを、次の方法でデータ全体から機械的に探した。

1. ゲームの勝ち馬の記録（`data/src/winners_*.jsonl` から作る史実馬の勝ち鞍）・着順の記録（`data/src/placings_world.jsonl`）と、主な勝鞍の全4,300件余りを突き合わせた（ほかの馬が勝ったレース・2着以下のレース・記録にある大きなレースの抜け）。
2. 主な勝鞍の英語のレース名ごとに en.wikipedia のレースの記事（勝ち馬の一覧）を取り、年の直後の勝ち馬と照らした（4,083件が一致。残りは記事の表の形で読めなかったもので、目で見た範囲で誤りは無かった）。
3. 馬の記事（1,467頭）の本文の「G1 を N 勝」の言い方といまの g1 を比べ、食い違った馬を当時の格（レースの記事の格の変化）で数え直した。
4. 生年+2 より前の年、日本の G1 の名前（エリザベス女王杯など）を持つ海外の馬、香港調教でない馬の香港のレース（26件。すべてレースの記事で勝ちを確認）、英語名の略記・スポンサー名・Wikipedia の曖昧さ回避の括弧。

| 種類 | 件数 | 例 |
|---|---|---|
| 未勝利レースの混入 | 6件（5頭） | アーヴルドグレースの2010 BC レディーズクラシック（3着）・2011 BC クラシック（4着）、イッツマイラッキーデイの2013 プリークネス（2着）、ロックハードテンの2004 プリークネス（2着）、オーサムフェザーの「2012 Breeders' Cup」（レース名でない。2011 ガゼル H に）、ドーンアプローチの「2000 2000 Guineas」（生まれる前の年） |
| 勝った年の違い | 3件 | アシュカラニの仏2000ギニー 1995→1996、リドパレスのホイットニー 2002→2001、テンモーストウォンテッドのトラヴァーズ 2004→（2003 の1回だけ。2003 のイリノイダービー・スーパーダービーを足す） |
| 別のレースとの取り違え | 7件（5頭） | アルハース・ディスタントミュージックの「インターナショナルステークス」は愛国の International Stakes（当時 G2）なので「愛インターナショナルステークス」、ディスタントリラティヴの1989年はフェニックスインターナショナルステークス、ルアーの「ブリーダーズカップターフマイル」→ブリーダーズカップマイル、2016年に改名する前のキングズビショップ S を「H・アレン・ジャーケンスメモリアル S」としていた2頭 |
| 主要 G1 の抜け | 48件（41頭） | 米三冠（ウォーエンブレム・シルバーチャーム・リアルクワイエット・ポイントギヴン・ハンセル・モナルコス・フサイチペガサスなど17頭）、英2000ギニー・1000ギニー（カジア・サイエダティ・ロドリゴデトリアーノなど14頭）、フィオレンテの2013 メルボルンカップ、ホールディングコートの2000 仏ダービー、ボルジアの1997 ドイツダービー、ヘニーヒューズの2006 ヴォスバーグ、ラヴァマンのチャールズウィッティンガム、ゲームオンデュードのグッドウッド S 2回、セイントリアムのスティーヴンフォスター、ジンジャーパンチのゴーフォーワンド2回、ネイチャーストリップの2022 キングズスタンド（G1 でない2021 ジ・エベレストと入れ替え） |
| G1 の勝ち数 | 72頭 | 上の抜けを足した馬のほか、ムーンライトクラウド 3→6、マルシャンドール 2→5、キプリオス 9→8（ロングディスタンスカップは G2）、プライド 4→3（2005 ジャンロマネ賞は G1 になる前）、フライングスパー 4→3（1995 ゴールデンローズは当時 G2）、G1 を勝っているのに0だった馬（アナバーブルー・タピット・レジェーラなど）など |
| 英語名の略記・スポンサー名 | 33件 | King George VI & Q. Elizabeth Stakes などを King George VI and Queen Elizabeth Stakes に、Investec Oaks → Epsom Oaks、LKS Mackinnon Stakes → Mackinnon Stakes、The BMW Stakes・Mercedes Classic → Tancred Stakes（タンクレッドステークス）、Yalumba Stakes → Caulfield Stakes（コーフィールドステークス）、Irish 2000&amp;nbsp;Guineas、「(ATC)」「(VRC)」「(Perth racing)」「(United States)」「(Argentina)」「(Hong Kong)」の括弧 |

### 見送ったもの

- G1 の勝ち数は、記事の本文の数と食い違った馬・ゲームの勝ち馬の記録で抜けが見つかった馬を数え直した。1,477頭すべての g1 を1勝ずつ当時の格で数え直したわけではない（とくにシルバーチャームは1998 ストラブ S の当時の格が確かめられず、三冠の2勝を足した3勝にとどめた）。
- 香港の馬のうち、香港クラシックカップ（ラッパードラゴン）・センテナリースプリントカップ（ペニアフォビア）など格の変わった年が確かめきれないレースを含む馬は、確かめられた G1 だけで数え、ほかは変えていない。
- 改名したレースの日本語名の揺れ（ジャック・ル・マロワ賞とジャックルマロワ賞、ドンカスターマイルとドンカスターハンデキャップ、ロートシルト賞と当時のアスタルテ賞など）と、当時の正式名だったスポンサー名（Emirates Stakes・Crown Oaks・Darley Sprint Classic・Moët & Chandon Rennen）は、年ごとの正式名を確かめきれないため変えていない。
- フェニックスインターナショナルステークス（1989年）の当時の格は確かめられなかった（勝ったこと自体は記事で確認）。
- 同着の勝ち（1997 ナンソープ、2003 BC ターフ、2011 愛セントレジャー、2022 ドバイターフ）と、降着による繰り上がりの勝ち（2015 英セントレジャーのシンプルヴァーズ、2025 仏1000ギニーのザリガナ）は史実どおり勝ちのまま。

### 整合のチェック（`tests/extra_mainwins.js`）

年の形と範囲（生年+2〜2026年）・日英の件数と年の一致・同じ勝鞍の重複・件数の上限（8件、G2 を足すのは6件まで＝7件以上は g1 が件数以上）・g1 が表示の件数と矛盾しない（G1 は全部載せる）・着順の混入や略記・スポンサー名・香港の誤訳が無い・勝ち馬と着順の記録と食い違わない・記録にある大きなレース（三冠・クラシック・メルボルンカップなど）の抜けが無い、を確かめる。直す前のデータではこのうち4つが落ちることを確かめた。
