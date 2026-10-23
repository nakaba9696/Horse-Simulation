# 番組（重賞）の取捨選択の洗い出し（2026-10-23）

いまの番組（年代なしのゲームの2025年の形・全321件。一覧は `docs/review/RACE_SELECT_CHECK.md`、`node tools/race_select.js` で作る）を、2025年の実際と1件ずつ照らした結果。**番組のデータは直していない。直すかどうかは持ち主が決める。**

- 照らし方：JRA の2025年の重賞一覧と各レースの結果ページ（130件全部）・NAR の2025年のダートグレード一覧・香港ジョッキークラブの結果・JRA の海外競馬の頁（ドバイ・香港・豪州）・Sporting Life の日ごとの結果（英愛仏、2025年4月18日〜11月3日）・BHA が載せた European Pattern Committee の発表・TOBA の2025年の格付け・各主催者の記事・英語版と日本語版の Wikipedia。
- 全321件を4つに分けて全部の行を見た（JRA 130・地方と香港と中東と豪 61・英愛仏独 84・米加 46）。
- 週は「月と週」。データのファイルで決め方が2通りあるので（下の #G1）、15日・22日・23日の施行で1週ずれて見えるだけのものは食い違いにしていない。
- 円換算は概算（1米ドル≒150円・1ポンド≒195円・1ユーロ≒165円・1豪ドル≒97円・1香港ドル≒20円）。賞金は1着の額。
- 出典で確かめられなかったものは「未確認」と書いた。

## 数

| 地域 | 見た件数 | 食い違いの無い行 | 食い違いのある行 | 一覧に無い（足すかの候補） |
|---|---|---|---|---|
| 日本（JRA） | 130 | 77 | 53（時期 41・負担重量 19・競馬場 3。重なりあり） | 0 |
| 日本の地方・香港・UAE・サウジ・豪 | 61 | 33 | 28 | 5（名の知れたもの） |
| 英・愛・仏・独 | 84 | 74（うち6件は賞金だけ違う） | 10 | 4（独の G1）＋ G2 の候補5 |
| 米・加 | 46 | 19 | 27 | 55（米 G1 53・加 G1 2） |

- 格・芝ダート・距離が2025年と違うのは **ゴールデンフリースS（2025年は G1 でない）・東京大賞典（G1 を Jpn1 と出す）・スキラッチS（1000m → 1100m）の3件だけ**。あとは時期・年齢・負担重量・賞金・競馬場。
- 番組の中の重複（同じレースが2行・名前の違う同じレース）は **0件**。
- 2025年に行われていないのに番組にあるものは **0件**（ゴールデンフリースSは「2025年は G1 でない」で、レースは行われている）。
- 小倉2歳S・マーメイドSが2024年で終わっているのは正しい（2025年から中京2歳S・府中牝馬S（6月）が条件を引き継いだ）。

## 持ち主に決めてほしい方針（3件）

洗い出しの多くは、次の3つの決め方しだいで「直す／そのまま」が分かれる。推しの案を添える。

| # | 決めること | 案（推しは①） | 関係する洗い出し |
|---|---|---|---|
| P1 | **2025年だけの例外を番組に入れるか。** 2025年は阪神の改修で京都金杯・シンザン記念が中京、阪急杯が京都。ドバイワールドカップデーはラマダンの関係で4月5日（ふだんは3月末）。ブルーグラスSは大雨で延期。JC ゴールドカップはサラトガで8月末（2026年はベルモントで9月に戻る） | ① ふだんの形のまま（2026年に戻ったもの・その年だけの事情は入れない） ② 2025年の形にそろえる | #1・J2・B1・D1・D9 |
| P2 | **JRA の週を2025年の日付にそろえるか。** 41件が1週ずれる（例：日本ダービー 5月4週 → 2025年は6月1日、天皇賞（秋）10月4週 → 11月2日）。ただし**レースの前後の順番が入れ替わるものは0件**（41件を全部の組で比べた） | ① いまのまま（1か月4週の暦で順番が合っていればよい） ② 2025年の日付で数え直す | J1・G1 |
| P3 | **海外の賞金を2025年の実際に寄せるか。** 米・豪・香港の大レースの多くが実際の半分以下（例：ケンタッキーダービー 2億円 → 約4.65億円、ドンカスターマイル 0.5億円 → 約2.2億円） | ① 実際の1着の額に寄せる（ゲームの釣り合いは `docs/BALANCE.md` で確かめてから） ② いまのまま（ゲームの都合で抑えている） | #10・B11〜B14・C12・C13・D10・D11 |

## 大事なもの（上位10）

| # | レース | いま | 案 | 理由 | 出典 |
|---|---|---|---|---|---|
| 1 | ドバイワールドカップ・シーマクラシック・ターフ・ゴールデンシャヒーン・アルクオーツスプリント・UAEダービー・ドバイゴールドカップ（7件） | 3月4週 | P1 の①ならそのまま、②なら4月1週 | 2025年は4月5日（ラマダンの関係）。トロフィー（ワールドダート GS・ワールドターフ GS・メイダンルーラー・ホールオブフェイム）に使う。4月1週にすると大阪杯と同じ週になる | https://www.jra.go.jp/keiba/overseas/racelist/2025.html ・ https://www.jra.go.jp/keiba/overseas/race/2025dubai/wc/kaiko.html |
| 2 | シティオブヨークS（英） | G1・この形の始まり2015 | G1 は2025年から。2015〜2024年は G2 の行に分ける | **2024年までは G2**。いまの暦だとエキスパートアイ（2018）・スペースブルース（2021）・キンロス（2022・2023）の勝ちが G1 に数えられる（英ロングディスタンスカップを分けたのと同じ型）。総合力の「G1 の格の決まり」・スペシャルホースの条件に響く | https://www.britishhorseracing.com/press_releases/european-pattern-committee-announces-changes-to-the-2025-european-programme-of-flat-black-type-races/ ・ https://www.sportinglife.com/racing/results/2025-08-23/york/867996/sky-bet-city-of-york-stakes-group-1 |
| 3 | ゴールデンフリースS（愛） | G1・1800m・この形の始まり2015 | 2025年の形は G1 でない・1600m（G1・9ハロンは2026年から）。2025年の形にするなら格と距離を下げる。2015〜2025年の行も G1 でない | 2025年は「Champions Juvenile Stakes」の名で行われた（Sporting Life は G2、en.wikipedia の記事は G3 と書き、格は出典で食い違う＝未確認。G1 でないのは両方一致）。スペシャルホース「歴代のゴールデンフリースS馬」がある | https://en.wikipedia.org/wiki/Golden_Fleece_Stakes ・ https://www.sportinglife.com/racing/results/2025-09-13/leopardstown/876276/kpmg-champions-juvenile-stakes-group-2 ・ https://www.britishhorseracing.com/press_releases/european-pattern-committee-announces-changes-to-the-2026-european-programme-of-flat-black-type-races/ |
| 4 | サクソンウォリアーの「2017ゴールデンフリースS」（史実馬の勝ち鞍） | 2017年のゴールデンフリースS（暦では G1） | 2017年ベレスフォードS（G2・ネース）ではないか確かめる | en.wikipedia の馬の記事では2017年の勝ちは未勝利戦・ベレスフォードS（G2）・レーシングポストトロフィー（G1）。G1 の数え過ぎの疑い。どこで取り違えたかは未確認 | https://en.wikipedia.org/wiki/Saxon_Warrior |
| 5 | 東京大賞典 | Jpn1（地方のレースを全部 Jpn で出す決まり。`js/core/races.js` の `R.gradeBadge`） | G1 と出す（データに国際 G1 の印を足す） | 2011年から地方で唯一の国際 GI。トロフィー「ジャパンダート GS」・オーナーの依頼に使う | https://www.keiba.go.jp/dirtgraderace/2025/1229_tokyodaishoten/introduction.html |
| 6 | スキラッチS（豪） | 芝1000・別定 | 芝1100・定量（WFA） | 2015年から1100m。**オーナー（ファリナ）の段階3の依頼に使う** | https://en.wikipedia.org/wiki/Schillaci_Stakes ・ https://www.sportsnews.com.au/horse-racing/giga-kick-bounces-back-in-schillaci-stakes/606131 |
| 7 | ナンソープS（英）・アベイドロンシャン賞（仏） | 3歳以上 | 2歳以上 | 実際は2歳も出られる。いまはゲームの2歳馬が出られない | https://www.sportinglife.com/racing/results/2025-08-22/york/867992/coolmore-wootton-bassett-nunthorpe-stakes-group-1 ・ https://en.wikipedia.org/wiki/Prix_de_l%27Abbaye_de_Longchamp |
| 8 | ドイツの G1：バイエリシェスツフトレネン・オイロパ賞・バイエルン大賞（ほかにディアナ賞） | 一覧に無い（独の G1 7つのうち3つだけ） | 足すかを決める | ディアナ賞は持ち主の決定（2026-10-20「格が高くないならディアナ賞をなくして…」）で外した。**ただし2025年も G1**。決定の前提が違うので伝えておく | https://en.wikipedia.org/wiki/List_of_German_flat_horse_races ・ https://en.wikipedia.org/wiki/Preis_der_Diana |
| 9 | 米国の名の知れた G1 の抜け（スティーブンフォスターS・パーソナルエンスンS・ベルモントダービー・ベルモントオークス・ダイアナS・マンハッタンS・テストS・シャンペンS・フリゼットS・ペガサスWC ターフ・クールモアターフマイル・QE2世チャレンジC・ハリウッドダービー・デルマーフューチュリティ・コティリオンS・アップルブロッサムH・アシュランドS・スピナウェイS・マリブS など） | 一覧に無い（米 G1 93のうち40） | 足すかを決める（全部の表は下の #D の抜け） | 2025年の米 G1 は93（TOBA）。カナダはサマーS・ナタルマS（2歳 G1）が無い | https://toba.org/toba-announces-u-s-graded-and-listed-stakes-for-2025/ ・ https://en.wikipedia.org/w/index.php?title=List_of_American_and_Canadian_Graded_races&oldid=1323713947 |
| 10 | 海外の大レースの賞金（ケンタッキーダービー・ドンカスターマイル・コーフィールドカップ・香港の国内 G1 5つ・チェアマンズスプリントプライズ ほか） | 実際の半分以下が多い | P3 しだい | 例：ケンタッキーダービー 20000 → 約46500、ドンカスターマイル 5000 → 約22000、コーフィールドカップ 5000 → 約22000、香港ゴールドカップ 5000 → 約14600、チェアマンズスプリントプライズ 9000 → 約24600。逆にサンタアニタH は 10000 → 約2700 と高すぎ | 下の #B・#C・#D の各行 |

## 全件

「大事さ」：A＝格・距離・年齢・トロフィーやオーナーの依頼に関わる、B＝時期・競馬場・負担重量、C＝賞金・説明の書き方。

### G：番組の作り方（自分で見たもの）

| # | 大事さ | レース | いま | 案 | 理由 | 出典 |
|---|---|---|---|---|---|---|
| G1 | B | 週の決め方 | `data/races.js` は1〜7日＝1週・8〜15日＝2週・16〜23日＝3週・24日〜＝4週、`data/races_more.js` は1〜7・8〜14・15〜21・22日〜 | どちらかにそろえる（並べ直すと週の変わるレースが出るので、そろえるなら P2 と一緒に） | 同じ日付でも別の週になる。15日・22日・23日の施行で食い違って見える | `data/races.js` の頭書き・`data/races_more.js` の頭書き |
| G2 | C | 「この形の始まり」の列（海外の補い） | 世界の有名な重賞の多くが2015 | 依頼文に「2015は FAMOUS_FROM（それより前を持たない）の意味」と書いた。直すのは #2・#3 のように格の変わった年が2015〜2024年にあるものだけ | `data/races_more.js` は2015年からの形だけを持つ決まり | `data/races_more.js` の FAMOUS_FROM |
| G3 | C | ジ・エベレスト・1351ターフスプリント・レッドシーターフH | G1 は2017年から・G2 は2015年から | そのまま（ジ・エベレストは「2023年までは格の無い特別戦（ゲーム上は G1 扱い）」と書いてある）。1351 は2024年から G2・レッドシーは2025年から G2 で、それより前を勝った史実馬はいない | 史実の数え方に響かない | https://en.wikipedia.org/wiki/The_Everest ・ https://thoroughbreddailynews.com/race-upgrades-announced-ahead-of-2025-saudi-cup-meeting/ |
| G4 | C | 同じ週・同じ競馬場の G1 | ロイヤルアスコット（8件）・凱旋門賞の週末（8件）・BC（14件）など | そのまま | 実際どおり。1つのレースに乗れるのは1頭なので、同じ週に別のレースへ別の馬で出るのは今の決まりで足りる | - |
| G5 | C | 月ごとの数 | JRA は6月が6件・7月が8件と少なめ。海外は10月が G1 32件で多い | そのまま（実際どおり） | 偏りは実際の番組のとおり | JRA の2025年の重賞一覧 |

### J：日本（JRA・130件）

全件の出典：JRA「2025年 重賞レース一覧」 https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html と、そこからたどれる各レースの結果ページ（例：京都金杯 https://www.jra.go.jp/datafile/seiseki/replay/2025/002.html）。

| # | 大事さ | レース | いま | 案 | 理由 | 出典 |
|---|---|---|---|---|---|---|
| J1 | B | 時期が1週ずれる41件：根岸S・シルクロードS（1月4週→2月1週）、東京新聞杯、京都記念、共同通信杯、小倉大賞典、中山記念（2月4週→3月1週）、阪急杯、弥生賞、金鯱賞、天皇賞（春）（4月4週→5月1週）、福島牝馬S、NHKマイルC、ヴィクトリアマイル、新潟大賞典、オークス、平安S、日本ダービー（5月4週→6月1週）、目黒記念、安田記念、函館スプリントS、ラジオNIKKEI賞（7月1週→6月4週）、アイビスSD（7月4週→8月1週）、レパードS、紫苑S、京成杯AH、ローズS、セントライト記念、オールカマー、スプリンターズS（10月1週→9月4週）、秋華賞、毎日王冠、京都大賞典、菊花賞、天皇賞（秋）（10月4週→11月1週）、アルゼンチン共和国杯、みやこS、エリザベス女王杯、福島記念、東スポ杯2歳S、阪神カップ | 一覧の週 | P2 の①ならそのまま | 2025年の施行日から数えると1週ずれる。前後の順番が入れ替わる組は0（41件の全部の組で比べた） | JRA の各レースの結果ページ（上の一覧から） |
| J2 | B | 京都金杯・シンザン記念・阪急杯 | 京都・京都・阪神 | P1 の①ならそのまま、②なら中京・中京・京都 | 2025年は阪神競馬場の改修で日割りが変わった。2026年は京都・京都・阪神に戻った | https://www.jra.go.jp/datafile/seiseki/replay/2025/002.html ・ https://ja.wikipedia.org/wiki/京都金杯 ・ https://ja.wikipedia.org/wiki/阪急杯 |
| J3 | B | 3歳限定の重賞の負担重量18件：フェアリーS・京成杯・共同通信杯・クイーンC・弥生賞・スプリングS・フラワーC・ファルコンS・毎日杯・NZT・レパードS（別定）、桜花賞・皐月賞・NHKマイルC・オークス・日本ダービー・秋華賞・菊花賞（定量） | 別定・定量 | 馬齢 | JRA の2025年の競走条件はすべて馬齢（ja.wikipedia では京成杯・桜花賞は2024年に馬齢へ。ほかの変わった年は未確認）。ゲームに斤量は無い（持ち主の決定 2026-10-21）ので、出すのは画面の文字だけ | JRA の各レースの結果ページ ・ https://ja.wikipedia.org/wiki/京成杯 ・ https://ja.wikipedia.org/wiki/桜花賞 |
| J4 | B | 阪神カップ | 別定 | 定量 | JRA の2025年の競走条件は定量 | https://www.jra.go.jp/datafile/seiseki/replay/2025/114.html |
| J5 | C | スプリングS・NZT・神戸新聞杯・朝日杯FS | せん馬の印（noGelding）が無い | 印を足す | JRA は「3歳牡・牝」「2歳牡・牝」と書く（せん馬は出られない）。皐月賞などには印がある | JRA の各レースの結果ページ |
| J6 | C | 1着本賞金の1割未満の差36件（いちばん大きいのは小倉牝馬S・愛知杯・府中牝馬S・ターコイズS の 4100 → 3800） | 一覧の額 | 直すなら一度に2025年の額へ | 差は1割未満 | JRA の各レースの結果ページ |

一覧に無い JRA の重賞は0件（2025年の平地重賞130件と一覧の130行が1対1で合った）。

### B：日本の地方・香港・UAE・サウジ・豪（61件）

| # | 大事さ | レース | いま | 案 | 理由 | 出典 |
|---|---|---|---|---|---|---|
| B1 | B | ドバイの7件（上の #1） | 3月4週 | P1 しだい | 2025年は4月5日 | https://www.jra.go.jp/keiba/overseas/racelist/2025.html |
| B2 | B | 川崎記念 | 4月1週 | 4月2週 | 2025年4月9日 | https://www.keiba.go.jp/dirtgraderace/2025/0409_kawasakikinen/introduction.html |
| B3 | B | 東京ダービー | 6月1週 | 6月2週 | 2025年6月11日（羽田盃・ジャパンダートクラシックとトロフィー「日本ダート三冠」） | https://www.keiba.go.jp/dirtgraderace/2025/0611_tokyoderby/introduction.html |
| B4 | B | さきたま杯 | 6月3週 | 6月4週 | 2025年6月25日 | https://www.keiba.go.jp/dirtgraderace/2025/0625_sakitamahai/introduction.html |
| B5 | B | ジャパンダートクラシック | 10月1週 | 10月2週 | 2025年10月8日 | https://www.keiba.go.jp/dirtgraderace/2025/1008_japandirtclassic/introduction.html |
| B6 | A | 東京大賞典 | Jpn1 | G1（上の #5） | 国際 GI | https://www.keiba.go.jp/dirtgraderace/2025/1229_tokyodaishoten/introduction.html |
| B7 | B | ランドウィックギニー（豪） | 3月1週 | 3月2週 | 2025年3月8日。トロフィー「豪州三冠」 | https://www.racingnsw.com.au/news/metropolitan-news/jockey-quotes-randwick-guineas-8 |
| B8 | B | オーストラリアンカップ（豪） | 3月2週 | 3月4週 | 2025年3月29日（2週あと） | https://www.ttrausnz.com.au/edition/2025-03-30/saturday-summary-light-infantry-man-soldiers-on-to-australian-cup-victory |
| B9 | B | シャンペンS（豪・外す行） | 4月2週 | 4月3週 | 2025年4月19日 | https://www.ttrausnz.com.au/edition/2025-04-20/saturday-summary-nepotism-stuns-in-stallion-making-champagne-victory |
| B10 | A | スキラッチS（豪） | 芝1000・別定 | 芝1100・定量（上の #6） | 2015年から1100m・WFA | https://en.wikipedia.org/wiki/Schillaci_Stakes |
| B11 | C | 香港の国内 G1 5つ（スチュワーズC・センテナリースプリントC・香港ゴールドC・クイーンズシルヴァージュビリーC・チャンピオンズ＆チャターC） | 5000〜8000 | 約14600 | 総額 HK$1300万、1着は約1.46億円 | https://racing.hkjc.com/en-us/local/information/archive/localresults?racedate=2025/01/19&racecourse=ST&RaceNo=8 （ほかの4つも同じ結果の頁の日付違い） |
| B12 | C | チェアマンズスプリントプライズ | 9000 | 約24600 | 1着 HK$1232万 | https://www.jra.go.jp/keiba/overseas/race/2025hkch/csp/kaiko.html |
| B13 | C | アルクオーツスプリント・UAEダービー | 9000・6000 | 約13000・約8700 | 実際は約1.45倍 | https://www.jra.go.jp/news/202503/032402.html |
| B14 | C | 豪州の G1 の賞金：ドンカスターマイル 5000 → 約22000、コーフィールドカップ 5000 → 約22000、クイーンエリザベスS 15000 → 約29000、オーストラリアンカップ 5000 → 約14000、シドニーカップ 5000 → 約11000、コーフィールドギニー 6000 → 約17000、ヴィクトリアダービー 6000 → 約11000 | 一覧の額 | P3 しだい | 実際の1着（概算。コーフィールドカップの1着は記事からの計算で公式の数は未確認） | https://www.jra.go.jp/keiba/overseas/race/2025qes/kaiko.html ・ https://en.wikipedia.org/wiki/Doncaster_Handicap ・ https://thenightly.com.au/sport/horse-racing/half-yours-wins-5-million-caulfield-cup-c-20387714 |
| B15 | - | 抜け：ゴドルフィンマイル（UAE・G2・ダ1600・ドバイWC デー） | 一覧に無い | 足すかを決める | ドバイWC デーの重賞で無いのはこれだけ | https://www.jra.go.jp/news/202503/032402.html |
| B16 | - | 抜け：ジェベルハッタ（G1・芝1800）・アルマクトゥームチャレンジ（G1・ダ1900） | 一覧に無い | 足すかを決める | UAE の G1（ドバイWC デーの外）。日付は en.wikipedia の出典からで主催者の頁では未確認 | https://en.wikipedia.org/wiki/Jebel_Hatta ・ https://en.wikipedia.org/wiki/Al_Maktoum_Challenge,_Round_3 |
| B17 | - | 抜け：オーストラリアンギニー（G1・フレミントン芝1600・3歳・3月1週）・オールスターマイル（G1・フレミントン芝1600・3月2週） | 一覧に無い | 足すかを決める | 豪州の G1 は75件（en.wikipedia。2025年の公式の数は未確認）で一覧は22件。ほかの抜けはランヴェットS・クールモアクラシック・オールエイジドSなど | https://en.wikipedia.org/wiki/List_of_Australian_Group_races ・ https://cms.vrc.com.au/latest-news/flemington-dates-set-for-2024-25-racing-season/ |
| B18 | - | 未確認：サウジの G2 の年齢（1351ターフスプリント 3歳以上・ネオムターフC 4歳以上・レッドシーターフH 4歳以上） | 一覧の値 | 確かめる | en.wikipedia と一覧が食い違う。主催者の頁は読めなかった | https://en.wikipedia.org/wiki/1351_Turf_Sprint |
| B19 | - | 未確認：サイアーズプロデュースS（豪・外す行）の2025年の施行日 | 4月1週 | 確かめる | 結果の日付が見つからなかった | - |

確かめて合ったもの：香港の G1 12件（香港ダービーは持ち主の決定で外した）・サウジカップデーの G1/G2 全部・地方の JpnI と GI の13件全部（2025年の JBC は船橋で合う）・コーフィールドカップ・メルボルンカップ・コックスプレート・ジ・エベレスト。ゴールデンイーグルは2025年は G1 でないので無くてよい（https://www.racingpost.com/news/international/australia/australias-second-richest-race-elevated-to-group-1-status-aIgog2t6Skg9/）。

### C：英・愛・仏・独（84件）

施行日の出典は Sporting Life の日ごとの結果（https://www.sportinglife.com/racing/results/2025-MM-DD）と、en.wikipedia の各レースの記事が引く Racing Post の結果。

| # | 大事さ | レース | いま | 案 | 理由 | 出典 |
|---|---|---|---|---|---|---|
| C1 | A | ゴールデンフリースS（愛） | G1・1800m | 上の #3 | 2025年は G1 でない | https://en.wikipedia.org/wiki/Golden_Fleece_Stakes |
| C2 | A | シティオブヨークS（英） | G1・始まり2015 | 上の #2 | G1 は2025年から | https://www.britishhorseracing.com/press_releases/european-pattern-committee-announces-changes-to-the-2025-european-programme-of-flat-black-type-races/ |
| C3 | A | ナンソープS・アベイドロンシャン賞 | 3歳以上 | 2歳以上（上の #7） | 2歳も出られる | https://en.wikipedia.org/wiki/Nunthorpe_Stakes |
| C4 | B | サンクルー大賞（仏） | 7月1週 | 6月4週 | 2025年6月29日（2026年は7月5日） | https://www.sportinglife.com/racing/results/2025-06-29 |
| C5 | B | ナッソーS（英） | 8月1週 | 7月4週 | 2025年7月31日 | https://www.sportinglife.com/racing/results/2025-07-31/goodwood/865471/qatar-nassau-stakes-fillies-and-mares-group-1 |
| C6 | B | サンチャリオットS（英） | 9月4週 | 10月1週 | 2025年10月4日 | https://www.sportinglife.com/racing/results/2025-10-04/newmarket/872903/betmgm-sun-chariot-stakes-fillies-and-mares-group-1 |
| C7 | B | ヴィコンテスヴィジエ賞（仏） | 5月3週 | 5月4週 | 2025年5月25日（イスパーン賞と同じ日）。格（2025年から G1）・3100m は合う | https://www.sportinglife.com/racing/results/2025-05-25 ・ https://en.wikipedia.org/wiki/Prix_Vicomtesse_Vigier |
| C8 | B | ジャンプラ賞（仏） | 7月2週 | 7月1週 | 2025年7月6日（ドーヴィル・1400m は合う） | https://www.sportinglife.com/racing/results/2025-07-06 |
| C9 | B | ベルリン大賞（独） | 8月1週 | 8月2週 | 2025年8月10日 | https://en.wikipedia.org/wiki/Grosser_Preis_von_Berlin |
| C10 | B | ジャックルマロワ賞（仏） | 8月2週 | 8月3週 | 2025年8月17日。トロフィー「欧州マイル三冠」 | https://www.sportinglife.com/racing/results/2025-08-17 |
| C11 | C | ジャンロマネ賞（仏） | 3歳以上・始まり2015 | そのまま（説明だけ） | 3歳以上になったのは2025年から（G1 は前から）。2015〜2024年は4歳以上 | https://www.britishhorseracing.com/press_releases/european-pattern-committee-announces-changes-to-the-2025-european-programme-of-flat-black-type-races/ |
| C12 | C | 賞金（英）：QE2世ジュビリーS 5000 → 約11000、キングチャールズ3世S・コモンウェルスC・コロネーションS 4000 → 約8000、シティオブヨークS 3000 → 約7350、フィリーズマイル 3000 → 約5850 | 一覧の額 | P3 しだい | 2025年の1着 | https://www.sportinglife.com/racing/results/2025-06-21/royal-ascot/859365/queen-elizabeth-ii-jubilee-stakes-group-1 ほか各レースの頁 |
| C13 | C | 未確認：仏・独31件の2025年の1着賞金 | 一覧の額 | 確かめる | 2022年の額ではサンクルー大賞（10000）・ベルリン大賞（5000）はゲームのほうが2倍以上高い | https://en.wikipedia.org/wiki/Grand_Prix_de_Saint-Cloud |
| C14 | A | 抜け：独の G1 3つ（バイエリシェスツフトレネン 7月4週・ミュンヘン2000m／オイロパ賞 9月4週・ケルン2400m／バイエルン大賞 11月2週・ミュンヘン2400m）とディアナ賞（8月1週・デュッセルドルフ2200m・3歳牝） | 一覧に無い | 上の #8 | 2025年の独の G1 は7つ | https://en.wikipedia.org/wiki/Bayerisches_Zuchtrennen ・ https://en.wikipedia.org/wiki/Preis_von_Europa ・ https://en.wikipedia.org/wiki/Grosser_Preis_von_Bayern |
| C15 | - | 抜け（G2 の候補）：フォワ賞・ニエル賞（凱旋門賞の前哨戦・9月1週）・ギヨームドルナノ賞（ドーヴィル2000m・8月3週）・ハードウィックS（アスコット2400m・6月3週）・ダンテS（ヨーク2050m・英ダービーの前哨戦・5月3週） | 一覧に無い | 足すかを決める | 日本の馬がよく使う・名の知れた G2 | https://www.sportinglife.com/racing/results/2025-09-07 ・ https://www.sportinglife.com/racing/results/2025-05-15/york/851551/al-basti-equiworld-dubai-dante-stakes-group-2 |

確かめて合ったもの：英38・愛13・仏28の G1 は全部一覧にある。英ロングディスタンスカップ（2025年から G1・3200m）、インターナショナルS（ヨーク）、ロワイヤルオーク賞（2025年はサンクルー）も合う。

### D：米・加（46件）

| # | 大事さ | レース | いま | 案 | 理由 | 出典 |
|---|---|---|---|---|---|---|
| D1 | B | ジョッキークラブゴールドカップ | 9月1週 | P1 の①ならそのまま、②なら8月4週 | 2025年はサラトガで8月31日。2026年はベルモントで9月に戻る | https://www.nyra.com/saratoga/news/antiquarian-wins-g1-jockey-club-gold-cup/ |
| D2 | B | E.P.テイラーS（加） | 9月2週 | 8月3週 | 2025年8月16日（ウッドバインマイルの日ではなかった） | https://woodbine.com/woodbine-news/she-feels-pretty-earns-breeders-cup-berth-by-winning-dramatic-grade-1-e-p-taylor-stakes/ |
| D3 | C | BC の2歳5競走（ジュヴェナイル・ジュヴェナイルフィリーズ・ジュヴェナイルターフ・ジュヴェナイルフィリーズターフ・ジュヴェナイルターフスプリント） | 11月1週 | そのまま | 2025年は前の日の10月31日（金）。データは「暦では BC の週にそろえる」と決めてある | https://en.wikipedia.org/wiki/2025_Breeders%27_Cup |
| D4 | B | ベルモントS・エイコーンS・メトロポリタンH | 6月2週 | 6月1週 | 2025年6月6〜7日（サラトガ）。トロフィー「米国三冠」・オーナーの依頼に使う | https://en.wikipedia.org/wiki/2025_Belmont_Stakes ・ https://www.americasbestracing.net/races/2025-metropolitan-handicap |
| D5 | B | パシフィッククラシック | 8月3週 | 8月4週 | 2025年8月30日 | https://www.dmtc.com/media/news/invader-fierceness-overcomes-trouble-scores-smartly-in-grade-i-pacific-2923 |
| D6 | B | アーリントンミリオン | 8月3週 | 8月2週 | 2025年8月9日（コロニアルダウンズ） | https://www.americasbestracing.net/races/2025-arlington-million-s |
| D7 | B | ペンシルベニアダービー | 9月4週 | 9月3週 | 2025年9月20日 | https://www.americasbestracing.net/the-sport/2025-2025-pennsylvania-derby-glance |
| D8 | B | カナディアンインターナショナル（加） | 10月2週 | 10月1週 | 2025年10月4日 | https://en.wikipedia.org/wiki/Canadian_International_Stakes |
| D9 | B | ブルーグラスS | 4月1週 | そのまま | 予定は4月5日、大雨で4月8日に延期（例外） | https://www.keeneland.com/media/news/burnham-square-nails-east-avenue-finish-win-rescheduled-toyota-blue-grass-earn-kentucky |
| D10 | C | 賞金が実際の半分ほど：ケンタッキーダービー 20000 → 約46500、ケンタッキーオークス 5000 → 約13500（概算）、アーカンソーダービー 6000 → 約12150、ブルーグラスS 6000 → 約11300、プリークネスS・ベルモントS 10000 → 約18000、BC スプリント・ジュヴェナイル・ジュヴェナイルフィリーズ 7000 → 約15600、BC の2歳芝3競走・フィリー＆メアスプリント 5000 → 約7800、ホイットニーS 5000 → 約8250、ソードダンサーS 4000 → 約6200、ウッドバインマイル 4000 → 約6900（概算）、E.P.テイラーS 3000 → 約4900（概算）、ブリーダーズフューチュリティ・スピンスターS 3000 → 約5800（概算） | 一覧の額 | P3 しだい | 2025年の1着（「概算」は総賞金に慣例の割合を掛けた見込み） | https://www.cbsnews.com/news/sovereignty-wins-151st-kentucky-derby ・ https://en.wikipedia.org/wiki/2025_Breeders%27_Cup ・ 各レースの頁 |
| D11 | C | サンタアニタH | 10000 | 約2700 | 2025年の1着は18万ドル（一覧が約3.7倍高い） | https://en.wikipedia.org/wiki/Santa_Anita_Handicap |
| D12 | - | 未確認：ソードダンサーS の年齢 | 4歳以上 | 確かめる | NYRA は「古馬」、en.wikipedia は「3歳以上」 | https://www.americasbestracing.net/races/2025-resorts-world-casino-sword-dancer-s |
| D13 | - | 抜け：米国 G1 の53件（★は名の知れたもの）。★ペガサスWC ターフ（1月4週）・★アシュランドS・★アップルブロッサムH・★マンハッタンS・★スティーブンフォスターS（6月4週）・★ベルモントダービー・★ベルモントオークス（7月1週）・★ダイアナS・★テストS・★パーソナルエンスンS・★バレリーナS・★スピナウェイS・★デルマーフューチュリティ・★コティリオンS・★アルシバイアディーズS・★シャンペンS・★フリゼットS・★クールモアターフマイル・★QE2世チャレンジC・★ハリウッドダービー・★マリブS、ほかにキルローマイル・ビホルダーマイル・マディソンS・メーカーズマークマイル・ジェニーワイリーS・ラトロワンヌS・チャーチルダウンズS・ダービーシティディスタフ・ターフクラシックS・アメリカンターフS・ゲイムリーS・シューメーカーマイル・ジャストアゲームS・ニューヨークS・オグデンフィップスS・ウッディスティーブンスS・ジャイプールS・ビングクロスビーS・クレメントLハーシュS・サラトガダービー・フォアスターデイヴS・デルマーオークス・H.アレンジャーケンズ記念・フランクリンシンプソンS・デルマーデビュタントS・グッドウッドS・ジョーハーシュターフクラシック・アメリカンファラオS・ファーストレディS・マトリアークS・ラブレアS・アメリカンオークス | 一覧に無い | 足すかを決める（上の #9）。施行日・競馬場・距離つきの表は調べの写しにある | 2025年の米 G1 は93、一覧は40 | https://toba.org/toba-announces-u-s-graded-and-listed-stakes-for-2025/ ・ https://en.wikipedia.org/w/index.php?title=List_of_American_and_Canadian_Graded_races&oldid=1323713947 |
| D14 | - | 抜け：サマーS・ナタルマS（加・2歳 G1・ウッドバイン芝1600・9月2週） | 一覧に無い | 足すかを決める | カナダの G1 は5つで一覧は3つ。キングスプレートは格の無いレースで、無くて正しい | 同上 |

確かめて合ったもの：三冠の前哨戦の G1 4つ・BC の14競走・トラヴァーズ・ハスケル・ホイットニー・ケンタッキーオークスは全部ある。G2 の3件（ハリウッドGC・ウッドワード・シガーマイル）は2025年も G2 で合う。

## 調べ方の写し

地域ごとの照合の表（1行ごとの施行日・URL・確かめて合った行・未確認の理由）は `docs/review/race_select/` に置いた：`find_A.md`（JRA）・`find_B.md`（地方・香港・中東・豪）・`find_C.md`（英愛仏独）・`find_D.md`（米加。抜けた G1 55件の施行日・競馬場・距離・条件の表つき）。中の `rows_A.md` などは、照合に使った `RACE_SELECT_CHECK.md` の地域ごとの行のこと。この文書の上の表は、その4つをまとめ直したもの（サクソンウォリアーの件・シティオブヨークSの史実の勝ちの件・週の決め方の件は、まとめるときに自分で確かめて足した）。
