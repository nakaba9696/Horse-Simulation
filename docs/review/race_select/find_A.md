# JRA 平地重賞 130件（rows_A.md）と2025年の実際の照合

調べ方：JRA の「2025年 重賞レース一覧」（https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html）の全140件（うち障害10件を除く平地130件）と、各レースの JRA の結果ページ（施行日・競馬場・コース・性齢・負担重量・1着本賞金）を全部取り、rows_A.md の130行と1行ずつ突き合わせた（見本ではなく全行）。
週は「1〜7日＝1週、8〜15日＝2週、16〜23日＝3週、24日〜＝4週」（配り役の訂正どおり）。

## 1. 食い違い（53件・1件1行）

| レース | いま（一覧の値） | 2025年の実際 | 案 | 理由 | 出典（URL） |
|---|---|---|---|---|---|
| 京都金杯 | 場 京都 | 1月5日・場 中京 | 場を中京にするか、京都のまま残すかを決める | 2025年は阪神競馬場の改修工事に伴う日割の変更で中京で施行（2026年は京都に戻った） | https://www.jra.go.jp/datafile/seiseki/replay/2025/002.html https://ja.wikipedia.org/wiki/京都金杯 https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| シンザン記念 | 場 京都 | 1月13日・場 中京 | 場を中京にするか、京都のまま残すかを決める | 2025年は阪神競馬場の改修工事に伴う日割の変更で中京で施行（2026年は京都に戻った） | https://www.jra.go.jp/datafile/seiseki/replay/2025/004.html https://ja.wikipedia.org/wiki/シンザン記念 https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| フェアリーステークス | 重量 別定 | 1月12日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/003.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 京成杯 | 重量 別定 | 1月19日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢（ja.wikipediaでは2024年に馬齢へ変更） | https://www.jra.go.jp/datafile/seiseki/replay/2025/005.html https://ja.wikipedia.org/wiki/京成杯 https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 根岸ステークス | 時期 1月4週 | 2月2日＝2月1週 | 時期を2月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/010.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| シルクロードステークス | 時期 1月4週 | 2月2日＝2月1週 | 時期を2月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/011.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 東京新聞杯 | 時期 2月1週 | 2月9日＝2月2週 | 時期を2月2週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/012.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 京都記念 | 時期 2月2週 | 2月16日＝2月3週 | 時期を2月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/017.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 共同通信杯 | 時期 2月2週・重量 別定 | 2月16日＝2月3週・重量 馬齢 | 時期を2月3週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/016.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| クイーンカップ | 重量 別定 | 2月15日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/014.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 小倉大賞典 | 時期 2月2週 | 2月23日＝2月3週 | 時期を2月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/020.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 中山記念 | 時期 2月4週 | 3月2日＝3月1週 | 時期を3月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/022.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 阪急杯 | 場 阪神・時期 2月4週 | 場 京都・2月22日＝2月3週 | 場を京都にするか、阪神のまま残すかを決める・時期を2月3週に | 2025年は阪神競馬場の改修工事に伴う日割の変更で京都で施行（2026年は阪神に戻った）。2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/019.html https://ja.wikipedia.org/wiki/阪急杯 https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 弥生賞ディープインパクト記念 | 時期 3月1週・重量 別定 | 3月9日＝3月2週・重量 馬齢 | 時期を3月2週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/026.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 金鯱賞 | 時期 3月2週 | 3月16日＝3月3週 | 時期を3月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/029.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| スプリングステークス | 重量 別定 | 3月16日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/028.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| フラワーカップ | 重量 別定 | 3月22日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/030.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| ファルコンステークス | 重量 別定 | 3月22日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/031.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 毎日杯 | 重量 別定 | 3月29日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/035.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 桜花賞 | 重量 定量 | 4月13日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢（ja.wikipediaでは2024年に馬齢へ変更） | https://www.jra.go.jp/datafile/seiseki/g1/ouka/result/ouka2025.html https://ja.wikipedia.org/wiki/桜花賞 https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| ニュージーランドトロフィー | 重量 別定 | 4月12日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/039.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 皐月賞 | 重量 定量 | 4月20日・重量 馬齢 | 負担重量を馬齢に | JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/g1/satsuki/result/satsuki2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 天皇賞（春） | 時期 4月4週 | 5月4日＝5月1週 | 時期を5月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/g1/haruten/result/haruten2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 福島牝馬ステークス | 時期 4月4週 | 4月20日＝4月3週 | 時期を4月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/042.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| NHKマイルカップ | 時期 5月1週・重量 定量 | 5月11日＝5月2週・重量 馬齢 | 時期を5月2週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/g1/nmc/result/nmc2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| ヴィクトリアマイル | 時期 5月2週 | 5月18日＝5月3週 | 時期を5月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/g1/victoria/result/victoria2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 新潟大賞典 | 時期 5月2週 | 5月17日＝5月3週 | 時期を5月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/051.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 優駿牝馬 | 時期 5月3週・重量 定量 | 5月25日＝5月4週・重量 馬齢 | 時期を5月4週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/g1/oaks/result/oaks2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 平安ステークス | 時期 5月3週 | 5月24日＝5月4週 | 時期を5月4週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/052.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 東京優駿 | 時期 5月4週・重量 定量 | 6月1日＝6月1週・重量 馬齢 | 時期を6月1週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/g1/derby/result/derby2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 目黒記念 | 時期 5月4週 | 6月1日＝6月1週 | 時期を6月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/054.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 安田記念 | 時期 6月1週 | 6月8日＝6月2週 | 時期を6月2週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/g1/yasuda/result/yasuda2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 函館スプリントステークス | 時期 6月3週 | 6月14日＝6月2週 | 時期を6月2週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/056.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| ラジオNIKKEI賞 | 時期 7月1週 | 6月29日＝6月4週 | 時期を6月4週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/059.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| アイビスサマーダッシュ | 時期 7月4週 | 8月3日＝8月1週 | 時期を8月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/067.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| レパードステークス | 時期 8月1週・重量 別定 | 8月10日＝8月2週・重量 馬齢 | 時期を8月2週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/replay/2025/070.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 紫苑ステークス | 時期 9月2週 | 9月7日＝9月1週 | 時期を9月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/081.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 京成杯オータムハンデキャップ | 時期 9月2週 | 9月6日＝9月1週 | 時期を9月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/079.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| ローズステークス | 時期 9月3週 | 9月14日＝9月2週 | 時期を9月2週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/084.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| セントライト記念 | 時期 9月3週 | 9月15日＝9月2週 | 時期を9月2週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/085.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 産経賞オールカマー | 時期 9月4週 | 9月21日＝9月3週 | 時期を9月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/087.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| スプリンターズステークス | 時期 10月1週 | 9月28日＝9月4週 | 時期を9月4週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/g1/sprint/result/sprint2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 秋華賞 | 時期 10月2週・重量 定量 | 10月19日＝10月3週・重量 馬齢 | 時期を10月3週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/g1/shuka/result/shuka2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 毎日王冠 | 時期 10月2週 | 10月5日＝10月1週 | 時期を10月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/090.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 京都大賞典 | 時期 10月2週 | 10月5日＝10月1週 | 時期を10月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/091.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 菊花賞 | 時期 10月3週・重量 定量 | 10月26日＝10月4週・重量 馬齢 | 時期を10月4週に・負担重量を馬齢に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は馬齢 | https://www.jra.go.jp/datafile/seiseki/g1/kikka/result/kikka2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 天皇賞（秋） | 時期 10月4週 | 11月2日＝11月1週 | 時期を11月1週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/g1/akiten/result/akiten2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| アルゼンチン共和国杯 | 時期 11月1週 | 11月9日＝11月2週 | 時期を11月2週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/101.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| みやこステークス | 時期 11月1週 | 11月9日＝11月2週 | 時期を11月2週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/102.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| エリザベス女王杯 | 時期 11月2週 | 11月16日＝11月3週 | 時期を11月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/g1/eliza/result/eliza2025.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 福島記念 | 時期 11月2週 | 11月22日＝11月3週 | 時期を11月3週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/105.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 東京スポーツ杯2歳ステークス | 時期 11月3週 | 11月24日＝11月4週 | 時期を11月4週に | 2025年の施行日から週を決めると違う | https://www.jra.go.jp/datafile/seiseki/replay/2025/106.html https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |
| 阪神カップ | 時期 12月3週・重量 別定 | 12月27日＝12月4週・重量 定量 | 時期を12月4週に・負担重量を定量に | 2025年の施行日から週を決めると違う。JRAの2025年の結果ページの競走条件は定量（ja.wikipediaは「古馬混合のGIIで定量は本競走と札幌記念のみ」） | https://www.jra.go.jp/datafile/seiseki/replay/2025/114.html https://ja.wikipedia.org/wiki/阪神カップ https://www.jra.go.jp/datafile/seiseki/replay/2025/jyusyo.html |

食い違いの内訳：時期 41件・負担重量 19件・競馬場 3件（重なりあり）。格・芝ダート・距離・年齢・牝馬限定・1着本賞金（1割以上）の食い違いは0件。

## 2. 2025年に行われたのに一覧に無いもの：0件

- 2025年の平地重賞130件は、一覧の130行と1対1で全部対応した（名前の読み替えは 弥生賞＝弥生賞ディープインパクト記念、オークス＝優駿牝馬、日本ダービー＝東京優駿、アメリカJCC、京成杯オータムH、オールカマー＝産経賞オールカマー、東スポ杯2歳S、阪神ジュベナイルF の略称だけ）。
- 小倉2歳ステークス：2025年は行われていない。2024年を最後に事実上廃止され、2025年から条件を引き継いで「中京2歳ステークス」（GIII・中京・芝1400m・2025年8月31日）として第1回を施行。一覧の 小倉2歳S＝2024年まで／中京2歳S＝2025年から（#198）は正しい。出典：https://ja.wikipedia.org/wiki/小倉2歳ステークス https://ja.wikipedia.org/wiki/中京2歳ステークス https://www.jra.go.jp/datafile/seiseki/replay/2025/078.html
- マーメイドステークス：2025年は行われていない。条件（牝馬・ハンデ・6月）は2025年から「府中牝馬ステークス」（GIII・東京・芝1800m・ハンデ・2025年6月22日）が引き継ぎ、前年までの府中牝馬S（10月）は「アイルランドトロフィー」（GII・2025年10月12日）に改称。一覧の #143 府中牝馬S・#252 アイルランドトロフィー と合う。出典：https://ja.wikipedia.org/wiki/マーメイドステークス https://ja.wikipedia.org/wiki/府中牝馬ステークス https://www.jra.go.jp/datafile/seiseki/replay/2025/057.html https://www.jra.go.jp/datafile/seiseki/replay/2025/093.html

## 3. 一覧の重複：0件

130行のレース名はすべて別。同じ週に同じ名前の行も無い。

## 4. 2025年に行われていないのに一覧にあるもの：0件

一覧の130行はすべて JRA の2025年の重賞一覧にある。

## 参考：1着本賞金の1割未満の差（表には入れていない・36件）

いま→2025年（万円）。どれも差は1割未満（いちばん大きいのは 4100→3800 の小倉牝馬S・愛知杯・府中牝馬S・ターコイズS で、2025年の値の約8%）。
- シンザン記念 4000→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/004.html）
- 京成杯 3900→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/005.html）
- 小倉牝馬ステークス 4100→3800（https://www.jra.go.jp/datafile/seiseki/replay/2025/007.html）
- 根岸ステークス 3800→4000（https://www.jra.go.jp/datafile/seiseki/replay/2025/010.html）
- きさらぎ賞 3900→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/013.html）
- 共同通信杯 4000→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/016.html）
- 小倉大賞典 4100→4300（https://www.jra.go.jp/datafile/seiseki/replay/2025/020.html）
- ダイヤモンドステークス 4100→4300（https://www.jra.go.jp/datafile/seiseki/replay/2025/018.html）
- 阪急杯 4100→4300（https://www.jra.go.jp/datafile/seiseki/replay/2025/019.html）
- オーシャンステークス 4100→4300（https://www.jra.go.jp/datafile/seiseki/replay/2025/021.html）
- 金鯱賞 6200→6700（https://www.jra.go.jp/datafile/seiseki/replay/2025/029.html）
- 愛知杯 4100→3800（https://www.jra.go.jp/datafile/seiseki/replay/2025/033.html）
- ファルコンステークス 3800→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/031.html）
- 毎日杯 3900→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/035.html）
- マーチステークス 3600→3800（https://www.jra.go.jp/datafile/seiseki/replay/2025/036.html）
- ダービー卿チャレンジトロフィー 4300→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/037.html）
- チャーチルダウンズカップ 3900→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/038.html）
- 阪神牝馬ステークス 5900→5500（https://www.jra.go.jp/datafile/seiseki/replay/2025/040.html）
- 福島牝馬ステークス 3800→4000（https://www.jra.go.jp/datafile/seiseki/replay/2025/042.html）
- ユニコーンステークス 3800→3700（https://www.jra.go.jp/datafile/seiseki/replay/2025/047.html）
- エプソムカップ 4100→4300（https://www.jra.go.jp/datafile/seiseki/replay/2025/048.html）
- 葵ステークス 3800→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/053.html）
- 府中牝馬ステークス 4100→3800（https://www.jra.go.jp/datafile/seiseki/replay/2025/057.html）
- しらさぎステークス 4300→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/058.html）
- ラジオNIKKEI賞 3800→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/059.html）
- レパードステークス 3800→3700（https://www.jra.go.jp/datafile/seiseki/replay/2025/070.html）
- CBC賞 4300→4100（https://www.jra.go.jp/datafile/seiseki/replay/2025/071.html）
- エルムステークス 4000→3800（https://www.jra.go.jp/datafile/seiseki/replay/2025/069.html）
- 中京2歳ステークス 3300→3100（https://www.jra.go.jp/datafile/seiseki/replay/2025/078.html）
- チャレンジカップ 4100→4300（https://www.jra.go.jp/datafile/seiseki/replay/2025/083.html）
- アルテミスステークス 3100→2900（https://www.jra.go.jp/datafile/seiseki/replay/2025/097.html）
- ファンタジーステークス 3100→2900（https://www.jra.go.jp/datafile/seiseki/replay/2025/098.html）
- みやこステークス 3800→4000（https://www.jra.go.jp/datafile/seiseki/replay/2025/102.html）
- 武蔵野ステークス 3800→4000（https://www.jra.go.jp/datafile/seiseki/replay/2025/103.html）
- 東京スポーツ杯2歳ステークス 4000→3800（https://www.jra.go.jp/datafile/seiseki/replay/2025/106.html）
- ターコイズステークス 4100→3800（https://www.jra.go.jp/datafile/seiseki/replay/2025/113.html）

## 補足

- 競馬場の3件（京都金杯・シンザン記念＝中京、阪急杯＝京都）は、阪神競馬場の改修工事に伴う2025年だけの日割の変更による。2026年は京都金杯・シンザン記念が京都、阪急杯が阪神に戻っている（ja.wikipedia の各記事の歴代優勝馬の表）。「2025年の形で固定」を文字どおりにとるか、ふだんの場を残すかは決めが要る。
- 負担重量：JRA の2025年の結果ページでは、3歳限定の重賞（クラシックを含む）の競走条件はすべて「馬齢」。一覧は3歳の G2・G3 の一部を「別定」、3歳の G1 を「定量」としていた。ja.wikipedia の京成杯・桜花賞の記事は「2024年に負担重量を馬齢に変更」としている。ほかのレースの変更年は確かめていない（2025年の値が馬齢であることは JRA の結果ページで確かめた）。
- 小倉牝馬S（2025年1月25日）は1着同着。本賞金の表の1着は3,800万円。
- 年齢の表記：JRA は皐月賞・ダービー・菊花賞・NHKマイルC・スプリングS・NZT・神戸新聞杯・朝日杯FS・ホープフルS を「3歳牡・牝」「2歳牡・牝」（せん馬は出られない）と書く。一覧は「3歳」「2歳」＋備考「せん馬は出られない」の行と、備考の無い行（スプリングS・NZT・神戸新聞杯・朝日杯FS）がある。年齢は一致なので食い違いには数えていない。

## 確かめて一致した件数

- 食い違いが1つも無かった行：77件（130行のうち。表の53件と合わせて130）。
- 確かめられなかったレース：なし（130件すべて JRA の2025年の結果ページで確かめた）。
