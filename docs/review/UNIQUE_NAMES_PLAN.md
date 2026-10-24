# 固有の技の名前の付け替え案と、資料不足3頭の案（2026-10-23）

- 元：[UNIQUE_PLAN.md](UNIQUE_PLAN.md) の「4. 持ち主に決めてほしいこと」の2・「7. 確かめられなかったこと」・「8. 入れた」と、外部レビュー [codex/UNIQUE_REVIEW_FULL.md](codex/UNIQUE_REVIEW_FULL.md)。
- この文書は案だけ。`data/uniques.js` とコードは直していない（決めるのは持ち主）。
- 2026-10-23 に Web で出典を確かめた。URL は開いて中身を確かめたものだけ書く。開けなかったものは「未確認」と書く。
  - 開けなかった所：米国競馬殿堂（racingmuseum.org）・JRA-VAN World の記事2つ・Sports Illustrated の過去記事など。7節にまとめた。
- ゲーム・ゲームの攻略・二次創作・ファンの百科事典が出どころの呼び名は使っていない。出典にしたのは新聞・競馬団体・競馬の雑誌・Wikipedia など。

## 1. 先に知っておいてほしいこと

1. **29頭のうち2頭は持ち主の決定で名前が決まっている**：フライトライン「空駆ける怪物」・シャーガー「白面の暴君」。この2頭は今回も変えない。
2. **イクイノックス「蒼き天才」は出典が見つかった**（テレ東スポーツの記事の見出し）。名前はそのままでよく、変えるのは無い。
3. **残りの26頭は、いまの日本語の名前の使用例が見つからなかった**（日本語でも完全一致で探した。ただし調べた道具は米国向けの検索で、日本の書籍・雑誌までは見ていない）。
4. **2026-10-20 の持ち主の決定は「技の名前はそのまま（あまりにも変なものだけ代案を聞く）」だった。** そのあとフライトラインとシャーガーで、数字の名前（「十九馬身」「十馬身のダービー」）ではなく評価語の名前を選んでいる。なので答え方を3つ用意した（6節）：
   - 「推しで」＝推しの名前に全部替える
   - 「いまので」＝全部いまのまま
   - 馬を指名して一部だけ替える

## 2. 推しの決め方

- **出典のある異名（案B）があれば、それを推す。** `data/uniques.js` の決まり「名前は、その馬の異名か、馬名か、その馬だけの数字・レース。異名は出典で確かめたものだけ」の順に合わせた。
- 案Bが、記事の見出しに一度出ただけのもの・ほかの馬の名前と重なるものなら、**数字・レース名の案A**を推す。
- 同じ言葉が何頭にも並ばないようにした（「N戦N勝」は2頭まで、「凱旋門賞連覇」は1頭だけ、など）。

## 3. 26頭＋決まり済み3頭の表

書き方：案A＝数字・レース名・出来事。案B＝出典のある異名（日本語は訳。原文をカッコに）。英語の名前（`labelEn`）の案は6節の一覧に書く。

| # | 馬 | いまの名前 | 案A | 案B | 推し（理由） | 出典 |
|---|---|---|---|---|---|---|
| 1 | オーモンド | 英国の至宝 | 十六戦十六勝／ハードウィック連覇（1886・1887。1887年はクビ差） | **世紀の名馬**（horse of the century。同時代の呼び名）。ほかに「蒸気機関車」（damned steam-engine。セントサイモンの名前と重なる） | **B「世紀の名馬」**：同時代に実際に呼ばれた名 | [en](https://en.wikipedia.org/wiki/Ormonde_(horse))「was labelled the 'horse of the century' at the time」・[Thoroughbred Heritage](https://www.tbheritage.com/Portraits/Ormonde.html)「was dubbed "the Horse of the Century,"」 |
| 2 | ネアルコ | イタリアの至宝 | **十四戦十四勝**／パリ大賞典（1938。3000m・1馬身半） | 無し（評価の文「20世紀の偉大な競走馬の一頭」だけ） | **A「十四戦十四勝」**：異名が無い | [en](https://en.wikipedia.org/wiki/Nearco)・[ja](https://ja.wikipedia.org/wiki/ネアルコ) |
| 3 | カウントフリート | 疾風の伯爵 | **二十五馬身**（1943ベルモントS。逃げ切り・2分28秒1/5）／2歳のマイル世界レコード（1分34秒4/5） | 「ザ・カウント」（the Count。AP の記事の書き方）・「ストーナークリークの伯爵」（Count of Stoner Creek。牧場の名から） | **A「二十五馬身」**：Bは記事の中の呼び方で、異名として広く使われた跡が無い | [en](https://en.wikipedia.org/wiki/Count_Fleet)「he led from start to finish」・[America's Best Racing](https://www.americasbestracing.net/the-sport/2018-count-fleet-the-triple-crown-standard)・[American Classic Pedigrees](https://www.americanclassicpedigrees.com/count-fleet.html) |
| 4 | ザテトラーク | 白斑の稲妻 | 七戦七勝（2歳だけ）／コヴェントリー十馬身 | **驚異のまだら**（the Spotted Wonder。ja の訳）。若いころは「木馬」（the rocking horse） | **B「驚異のまだら」**：en・ja・Thoroughbred Heritage の3つに出る | [en](https://en.wikipedia.org/wiki/The_Tetrarch)「Quickly dubbed the "Spotted Wonder,"」・[ja](https://ja.wikipedia.org/wiki/ザテトラーク)「あだ名は「Spotted Wonder」（驚異のまだら）」・[Thoroughbred Heritage](https://www.tbheritage.com/Portraits/TheTetrarch.html) |
| 5 | ブリガディアジェラード | 常勝准将 | 十八戦十七勝／2000ギニー3馬身（1971。ミルリーフに） | **ザ・ブリガディア**（The Brigadier, as he was known）。ほかに「英国の世紀の名馬」（British Horse of the Century。オーモンドと重なる） | **B「ザ・ブリガディア」**：英語の名前（`labelEn`）がもう The Brigadier なので、日本語もそろう | [Thoroughbred Daily News](https://thoroughbreddailynews.com/brigadier-gerard-honoured-with-qipco-award/)「The Brigadier, as he was known, won an incredible 17 of his 18 starts」・[en](https://en.wikipedia.org/wiki/Brigadier_Gerard_(horse)) |
| 6 | ミルリーフ | 小さな巨人 | **凱旋門賞レコード**（1971。2分28秒3・3馬身）／キングジョージ六馬身 | 無し（「the good little one」は記事の言い回し。銅像の文「Though small, I gave my all」） | **A「凱旋門賞レコード」**：異名が無い。代表の一戦（4節）と同じ | [1971年凱旋門賞](https://en.wikipedia.org/wiki/1971_Prix_de_l%27Arc_de_Triomphe)「in a new race-record time of 2:28.3」・[ja](https://ja.wikipedia.org/wiki/ミルリーフ) |
| 7 | アーモンドアイ | 府中の女神 | **芝G1九勝**（国内外。日本の馬で初めて）／2分20秒6（2018ジャパンカップ） | 「絶対女王」（スポニチ 2018）・「最強牝馬」（報知 2019） | **A「芝G1九勝」**：Bの「絶対女王」はシンボリルドルフ「絶対皇帝」と重なる | [報知 2020](https://hochi.news/articles/20201129-OHT1T50274.html)「国内外芝Ｇ１・９勝」・[スポニチ 2018](https://www.sponichi.co.jp/gamble/news/2018/10/14/kiji/20181014s00004048232000c.html)・[JRA 顕彰馬](https://www.jra.go.jp/gallery/dendo/horse35/) |
| 8 | イクイノックス | 蒼き天才 | 1分55秒2（2023天皇賞（秋））／世界一（2023年のランキング1位・135） | **蒼き天才**（テレ東スポーツの見出し）・「天才少年」 | **そのまま**：いまの名前に出典があった | [テレ東スポーツ 2023](https://www.tv-tokyo.co.jp/sports/articles/2023/12/032251.html)「蒼き天才 競馬ファンに驚きを与えた閃光の如き疾走」・[IFHA](https://www.ifhaonline.org/resources/WTRRankings/LWBRR.asp?batch=116) |
| 9 | エネイブル | 欧州の女王 | **キングジョージ三勝**（2017・2019・2020。初めて）／凱旋門賞二勝（2017シャンティイ・2018ロンシャン） | 「アスコットの女王」（Queen of Ascot。Gulf News の見出し）・「女王」（netkeiba の見出し） | **A「キングジョージ三勝」**：Bは見出しに一度出ただけ | [Gulf News](https://gulfnews.com/sport/horse-racing/horse-racing-record-breaking-enable-is-the-queen-of-ascot-1.72793594)・[netkeiba](https://news.sp.netkeiba.com/?pid=news_view&no=174396)・[en](https://en.wikipedia.org/wiki/Enable_(horse)) |
| 10 | ゴルディコヴァ | 欧州マイルの女王 | **BCマイル三連覇**（2008〜2010。3回勝ったのはこの馬だけ）／G1十四勝／ロートシルト賞四連覇 | 「芝マイルの女王」（queen of the turf mile ranks。殿堂入りの紹介記事の言い回し） | **A「BCマイル三連覇」**：Bは記事の中の評価の言い回しで、呼び名ではない | [America's Best Racing](https://www.americasbestracing.net/the-sport/2017-call-the-hall-fame-goldikova)・[en](https://en.wikipedia.org/wiki/Goldikova) |
| 11 | ニジンスキー | 舞神 | **最後の英国三冠馬**（1970。2026年の時点でその後はいない）／35年ぶりの三冠 | 無し（ピゴットの「炎のような馬」は気性の説明。「舞神」は舞踊家ニジンスキーの舞台の題に出るだけで、馬とは関係ない） | **A「最後の英国三冠馬」** | [en](https://en.wikipedia.org/wiki/Nijinsky_(horse))「As of 2026, he is the last horse to accomplish the feat」・[三冠](https://en.wikipedia.org/wiki/Triple_Crown_of_Thoroughbred_Racing) |
| 12 | ミエスク | 稀代の名牝 | BCマイル連覇（1987・1988。BC の競走を2年続けて勝った初めての馬）／ジャックルマロワ連覇 | **ラ・コンシェルジュ**（La Concierge。周りのことに興味を持つので厩舎の人が付けた） | **B「ラ・コンシェルジュ」**：出典が2つある異名。Aの「BCマイル連覇」はゴルディコヴァの「三連覇」と並ぶと見劣りする | [en](https://en.wikipedia.org/wiki/Miesque)「The barn staff nicknamed her "La Concierge"」・[American Classic Pedigrees](https://www.americanclassicpedigrees.com/miesque.html)・[BloodHorse](https://www.bloodhorse.com/horse-racing/articles/216111/a-look-back-miesques-second-mile-victory) |
| 13 | シーバード | 伝説の海鳥 | **凱旋門賞六馬身**（1965。20頭立て）／タイムフォーム145 | 無し（「20世紀最強」の評価の文だけ） | **A「凱旋門賞六馬身」**：代表の一戦（UNIQUE_PLAN #30） | [en](https://en.wikipedia.org/wiki/Sea_Bird)「an easy 6-length winner from Reliance」・[ja](https://ja.wikipedia.org/wiki/シーバード) |
| 14 | セクレタリアト | 神速の赤馬 | **三十一馬身**（1973ベルモントS・2分24秒0） | 「ビッグレッド」（Big Red。マンノウォーの技の名前と重なる）・「スーパーホース」（Time 誌の表紙の見出し。リボーの案Bと意味が重なる） | **A「三十一馬身」**：Bはどちらもほかの馬と重なる | [en](https://en.wikipedia.org/wiki/Secretariat_(horse))・[Encyclopedia.com](https://www.encyclopedia.com/sports-and-everyday-life/sports/sports/secretary-bird)「The headlines dubbed him "Super Horse"」 |
| 15 | アバーナント | 灰色の閃光 | **ナンソープ連覇**（1949・1950）／短距離三冠（1949。キングズスタンド・ジュライC・ナンソープ） | 無し（騎手の「乗った中でいちばん速い馬」は言葉で、異名ではない） | **A「ナンソープ連覇」** | [en](https://en.wikipedia.org/wiki/Abernant_(horse))・[Lochnager](https://en.wikipedia.org/wiki/Lochnager)「since Abernant in 1949」 |
| 16 | マニカト | 豪州の短距離王 | **ウィリアムリード五連覇**（1979〜1983） | 「ザ・マン」（The Man）・「マイティ・マニカト」（ムーニーヴァレー競馬場のページ） | **A「ウィリアムリード五連覇」**：Bは競馬場のページの書き方だけ。G1の勝ち数は資料で4・11・20・22とばらばらなので名前に使わない | [ムーニーヴァレー](https://www.thevalley.com.au/racing/william-reid-stakes)「five times by "The Man," Manikato from 1979 to 1983」 |
| 17 | フォアゴー | 最強の巨人 | **137ポンドの追い込み**（1976マールボロC。アタマ差）／ウッドワード四連覇（1974〜1977） | 無し（「ビッグジョー」は検索の抜き書きにだけあり、記事は開けず未確認） | **A「137ポンドの追い込み」**：代表の一戦で、いまの型（後ろから伸びる）と同じ場面 | [America's Best Racing](https://www.americasbestracing.net/the-sport/2022-fabulous-forego-superstar-who-commanded-the-respect-all)・[en](https://en.wikipedia.org/wiki/Forego)「carrying 137 pounds」 |
| 18 | クリフジ | 不敗の女傑 | 十一戦十一勝（旧八大競走を含めた最多全勝）／東京優駿六馬身（1943。2馬身出遅れて） | **栗毛の女傑**（『優駿』のウェブ版）。ほかに「無敗の名牝」「最強の女傑」 | **B「栗毛の女傑」**：JRA の広報誌に出る | [優駿 1](https://www.yushunweb.jp/story/story56/2450/)「栗毛の女傑クリフジが残したこの成績は」・[優駿 3](https://www.yushunweb.jp/story/story56/2452/)・[JRA 顕彰馬](https://www.jra.go.jp/gallery/dendo/horse03/) |
| 19 | シーザスターズ | 星の王 | **G1六連勝**（2009。2000ギニー・ダービー・エクリプス・英インターナショナル・愛チャンピオン・凱旋門賞）／ギニー・ダービー・凱旋門賞を同じ年に（初めて） | 無し（「一生に一頭の馬」は評価の文） | **A「G1六連勝」** | [en](https://en.wikipedia.org/wiki/Sea_the_Stars)・[Off The Ball](https://www.offtheball.com/racing/sea-stars-always-special-horse-john-oxx-1092246)・[ja](https://ja.wikipedia.org/wiki/シーザスターズ) |
| 20 | リボー | イタリアの巨匠 | 十六戦十六勝／凱旋門賞連覇（1955・1956） | **イル・カヴァッロ・スーペル**（il cavallo super＝スーパーホース。イタリアの人々の呼び名）・「イル・ピッコロ」（ちびっこ。牧場での呼び名） | **B「イル・カヴァッロ・スーペル」**：出典が2つ。Aの「N戦N勝」はネアルコ・ブラックキャビアと並びすぎる | [en](https://en.wikipedia.org/wiki/Ribot_(horse))「He was nicknamed 'il cavallo super,' meaning 'the super horse'」・[Thoroughbred Daily News](https://www.thoroughbreddailynews.com/ribot-tesios-crowning-glory/) |
| 21 | ブラックキャビア | 漆黒の疾風 | **二十五戦二十五勝**（G1十五勝） | 「ワンダー・フロム・ダウンアンダー」（報道）・「ネリー」（厩舎）・「豪州の黒き短距離女王」（netkeiba の見出し） | **A「二十五戦二十五勝」**：この馬をいちばん言い表す数。Bの英語は長く、日本語は見出しだけ | [ABC 2024](https://www.abc.net.au/news/2024-08-18/horse-racing-black-caviar-fondly-remembered/104239070)・[TRC](https://www.thoroughbredracing.com/articles/6343/farewell-wonder-down-under-australia-mourns-black-caviar/)「Dubbed the 'Wonder from Down Under'」・[Racing Queensland](https://www.racingqueensland.com.au/news/2024/08-august/vale-black-caviar) |
| 22 | ウィンクス | 豪州の女王 | **三十三連勝**（G1二十五勝）／コックスプレート四連覇（2015〜2018。初めて） | 「ターフの女王」（unofficial Queen of the Turf。ABC）・「豪州の最強牝馬」（報知の見出し） | **A「三十三連勝」**：Bは「非公式の」と断った書き方と見出しだけ | [ABC 2019](https://www.abc.net.au/news/2019-04-13/winx-wins-like-a-queen-to-complete-stellar-career/10962550)「33 consecutive race wins, a world record 25 Group One victories」・[ABC 2018](https://www.abc.net.au/news/2018-10-27/winx-wins-cox-plate/10437038) |
| 23 | ゴールデンシックスティ | 黄金のマイラー | チャンピオンズマイル三連覇（2021〜2023）／十六連勝（香港記録の17に1つ届かず）／香港の年度代表馬3年連続 | **香港の誇り**（Pride of Hong Kong）・「香港之光」（香港ジョッキークラブ）。漢字の名「金鎗六十」は馬名で、異名ではない | **B「香港の誇り」**：英語の報道2つと、香港ジョッキークラブの「香港之光」が同じ向き | [DRF](https://www.drf.com/news/hong-kong-champion-golden-sixty-retires)「known as the 'Pride of Hong Kong'」・[Asian Racing Report](https://asianracingreport.com/a-tribute-to-golden-sixty/)・[香港ジョッキークラブ](https://racingnews.hkjc.com/chinese/2024/09/13/一代香港馬王金鎗六十光榮退役/) |
| 24 | トレヴ | ロンシャンの女王 | **凱旋門賞連覇**（2013・2014。アレッジド以来36年ぶり） | 「女王」（netkeiba の見出し）・「マイティ・トレヴ」（ガーディアンの見出し） | **A「凱旋門賞連覇」**：Bは見出しだけ。同じ連覇のリボーは案Bを推すので重ならない | [ガーディアン 2014](https://www.theguardian.com/sport/2014/oct/05/treve-wins-2014-prix-de-larc-de-triomphe)「the first dual winner … since Alleged in 1978」・[netkeiba](https://news.sp.netkeiba.com/?pid=news_view&no=27971) |
| 25 | スペクタキュラービッド | 砂の韋駄天 | **1分57秒8**（1980ストラブS。ダート10ハロンの世界レコード）／1980年9戦9勝（最後は単走） | 「ザ・ビッド」（The Bid。記事の略し方）。調教師の言葉「手綱の向こうを見たいちばんの馬」（the greatest horse to ever look through a bridle） | **A「1分57秒8」**：Bは略し方と言葉で、異名ではない。いまの型（道中で動いて前へ）にレコードの速さを足した名鑑とそろう | [Kentucky Derby](https://www.kentuckyderby.com/horses/news/spectacular-bid-40th-anniversary-of-a-triple-crown-that-got-away/)「in a world-record 1:57 4/5 for 1 1/4 miles on dirt」・[en](https://en.wikipedia.org/wiki/Spectacular_Bid) |
| 26 | ケルソ | 不屈の鉄人 | ゴールドカップ五連覇（ジョッキークラブGC 1960〜1964。2マイル）／年度代表馬五年連続 | **キング・ケリー**（King Kelly。ファンの呼び名。厩舎では「ケリー」） | **B「キング・ケリー」**：英語と ja の両方に出る | [American Classic Pedigrees](https://www.americanclassicpedigrees.com/kelso.html)「He was known to fans as "Kelly" and "King Kelly."」・[ja](https://ja.wikipedia.org/wiki/ケルソ)「畏敬を込めて「キング・ケリー（King Kelly）」と呼ばれる」 |
| 27 | ドクターフェイガー | 最速の逃亡者 | **1分32秒2**（1968ワシントンパークH。134ポンド・10馬身。29年破られなかった）／1968年に4部門の受賞 | 無し（「ザ・ドク」は記事の書き方。騎手の「風に穴を開けられる馬」は言葉） | **A「1分32秒2」** | [en](https://en.wikipedia.org/wiki/Dr._Fager)・[America's Best Racing](https://www.americasbestracing.net/the-sport/2020-dr-fager-speed-demon) |
| 28 | シャーガー | 白面の暴君 | （前の案「十馬身のダービー」） | — | **そのまま**（持ち主の決定済み） | — |
| 29 | フライトライン | 空駆ける怪物 | （前の案「十九馬身」） | — | **そのまま**（持ち主の決定済み） | — |

推しの内訳：案B 9頭（オーモンド・ザテトラーク・ブリガディアジェラード・ミエスク・クリフジ・リボー・ゴールデンシックスティ・ケルソ＋そのままのイクイノックス）、案A 18頭、決定済み2頭。

## 4. 資料不足の3頭（外部レビューの「資料不足」：ミルリーフ・ウィンクス・トレヴ）

ウィンクスとトレヴは 2026-10-20 に条件を直してある（UNIQUE_PLAN 8節）。今回、代表のレースの位置を出典で確かめ直した。3頭とも、**いまある部品の条件のままでよい**（新しい部品は要らない）。

### ミルリーフ（代表の一戦：1971年の凱旋門賞）

- 史実（BloodHorse の当時の記事の再掲）：
  - 序盤は先行勢のすぐ後ろ（never far off the early pace）。
  - 坂を上る所（中間点の手前）で内ラチ沿いの5番手（moved over to the rail in fifth place）。
  - 最後のコーナーの前で内から出し、オルティスの外へ回してから内へ寄せた。
  - 残り2ハロンで先頭に立ち、差を広げた（two furlongs from home had a lead he was to lengthen）。
  - 18頭立て、3馬身差、2分28秒3のレースレコード。
  - 出典：[BloodHorse BackTrack](https://www.bloodhorse.com/horse-racing/articles/236168/backtrack-mill-reef-wins-71-prix-de-larc-de-triomphe)・[1971年凱旋門賞](https://en.wikipedia.org/wiki/1971_Prix_de_l%27Arc_de_Triomphe)
- ダービー1971も、先行勢の後ろから直線でリンデンツリーと競り、2馬身差（dropping behind the front runners early and then confronting Linden Tree in the stretch）。出典：[The Racing Biz](https://www.theracingbiz.com/?p=93318)
- 案：

| 型（区間） | 条件 | 効き目 | 名前 |
|---|---|---|---|
| posBreak（st。いまのまま） | 直線入口で2〜4番手 | 速5%・4秒・free・E＋0.03（いまのまま） | 凱旋門賞レコード（3節の推し） |

- 理由：中間点5番手から外へ出して直線で抜け出した形が、いまの「好位で直線に入り、抜け出す」に合う。
- 別の案（推さない）：直線入口の位置を2〜5番手に広げる型 `posBreak5`（いまの部品で作れる）。凱旋門賞の直線入口の正確な番手は記事に無いので、広げる根拠が足りない。

### ウィンクス（キャリアの形：後ろに控えて、どこからでも動ける）

- 史実（コックスプレート4連覇）：
  - 2015：内ラチ沿い、直線の入口で抜け出して4馬身3/4。
  - 2016：序盤は2番手の馬の外、残り600mで動き、直線の入口で2馬身先頭、8馬身差。
  - 2017：中団から最後のコーナーで動き、直線の入口で先頭、1/2馬身差。
  - 2018：5番手。最後のコーナーで相手が先頭に立ったのを、外へ出して突き放し2馬身差。
  - 騎手の言葉：「いつでも控えられ、いつでも加速できる」（she can settle or accelerate at any time during a race）。
  - 出典：[en](https://en.wikipedia.org/wiki/Winx_(horse))
- 案：

| 型（区間） | 条件 | 効き目 | 名前 |
|---|---|---|---|
| fromBackKick（st。いまのまま） | 残400〜100m・中間点で後ろ半分（今の順位は問わない） | 速6%・4秒・free・top＋0.2（いまのまま） | 三十三連勝（3節の推し） |

- 理由：中団より後ろから、最後のコーナーで先に動いて先頭に立つ年が多い。いまの型は先頭に立ったあとも出るので、2016・2017年の勝ち方も拾える。
- 合わない所：2016年は序盤が前寄りで、中間点で後ろ半分だったかは出典で分からない。
- 別の案（推さない）：中間点の条件を「4番手以下」に緩める型 `midKick`（いまの部品で作れる）。本物のレース20回で、いまの型でも20回とも出ているので、広げても出る回数はほとんど変わらない。

### トレヴ（代表の一戦：2013年の凱旋門賞）

- 史実：
  - 発走前にひどく汗をかき、出が悪かった（started poorly）。
  - ずっと外を回った（She had to come on the outside all the way）。
  - 道中はオルフェーヴル（後方の内）より後ろ。
  - 残り600mで主導権を取り、直線を向いて早々と先頭へ。
  - 5馬身差、2分32秒04。
  - 出典：[2013年凱旋門賞](https://en.wikipedia.org/wiki/2013_Prix_de_l%27Arc_de_Triomphe)・[Al Jazeera](https://www.aljazeera.com/amp/sports/2013/10/6/treve-storms-to-prix-de-larc-de-triomphe)・[ABC](https://www.abc.net.au/news/2013-10-07/treve-runs-away-with-arc-de-triomphe/5002494)「took control of the race with 600 metres remaining」・[スポルティーバ](https://sportiva.shueisha.co.jp/clm/keiba/keiba/2013/10/07/___split_34/)「道中、オルフェーヴルの後方にいた」
- 2014年は違う形：序盤は掛かり、先行勢のすぐ後ろの内。最後のコーナーで内から先頭に立ち、2馬身差。仏オークス2013は後方から残り300mで先頭、4馬身差。出典：[en](https://en.wikipedia.org/wiki/Treve_(horse))
- 案：

| 型（区間） | 条件 | 効き目 | 名前 |
|---|---|---|---|
| earlyFromBack（any。いまのまま） | 残600〜200m・中間点で後ろ半分・いま3番手以内 | 速7%・5秒・free・top＋0.2（いまのまま） | 凱旋門賞連覇（3節の推し） |

- 理由：代表の2013年（後方の外から、残り600mで動いて先頭）と、仏オークスの勝ち方に合う。2014年は前寄りから内を突いた形で、この型では出ない。代表は1つと決める方針（UNIQUE_PLAN 1節）なのでそのままにする。
- **直すところ（why の文）**：いまの why の「中間点の14番手から」は、今回開いた出典のどれにも書かれていない。推しどおりなら「外を回って後方から」に替える（6節に入れた）。

### 3頭のほか、UNIQUE_PLAN 7節で確かめられなかったこと

- **カウントフリートのベルモントS**：逃げ切りだった。en「he led from start to finish」、3頭立て、25馬身（New York Times は30馬身と書いた）。いまの型 bigLead（直線で先頭・2番手に2馬身以上）に合う。
- **クリフジの道中の位置**：『優駿』のウェブ版に書いてあった。いまの型 front3（残400mで3番手以内）は、菊花賞にあたるレースとオークスに合い、東京優駿には合わない。代表は1つに決める方針なので、型はそのままでよい。
  - 東京優駿：2馬身ほど出遅れ → 後方4番手の内 → 残り400mで6〜7番手 → 残り300m過ぎに先頭 → 6馬身差。出典：[優駿 2](https://www.yushunweb.jp/story/story56/2451/)
  - 阪神優駿牝馬（いまのオークス）：逃げ切りで10馬身差。出典：[優駿 3](https://www.yushunweb.jp/story/story56/2452/)
  - 京都農商省賞典4歳呼馬（いまの菊花賞）：3番手から3コーナーで動き、残り600mで先頭、大差。出典：同じ
- ミルリーフの位置は上のとおり。

## 5. 名前を決めるときに一緒に直すとよい数字の食い違い（今回見つけたもの。データは直していない）

- セクレタリアトのベルモントS「31馬身」：公式記録ではなく Daily Racing Form が写真から出した数（ja の注）。
- スペクタキュラービッドの時計：1分57秒4/5（＝1分57秒8）。en・ja・Kentucky Derby とも同じ。
- ケルソの2マイル：1964年は3分19秒1/5（en の「3:19.1」は書き違いと思われる）。1960年の記録は「3分19秒4/5のアメリカレコード」と「世界レコード」で資料が食い違う。
- エネイブルの凱旋門賞2勝のうち、2017年はシャンティイ（ロンシャンの改修中）。「ロンシャンで連覇」とは言えない。
- ザテトラークのコヴェントリーS「実際は50馬身」は ja だけの「伝えられている」という書き方。

## 6. 答え方（「推しで」と言えば全部入る）

持ち主が「推しで」と言えば、次の表のとおりに `data/uniques.js` の `label`・`labelEn` を替え、トレヴの why の一か所を直す。条件と効き目は変えない（3頭とも、いまの型のまま）。

| 馬 | いま | 推し | labelEn の案 |
|---|---|---|---|
| オーモンド | 英国の至宝 | 世紀の名馬 | Horse of the Century |
| ネアルコ | イタリアの至宝 | 十四戦十四勝 | Fourteen from Fourteen |
| カウントフリート | 疾風の伯爵 | 二十五馬身 | Twenty-Five Lengths |
| ザテトラーク | 白斑の稲妻 | 驚異のまだら | The Spotted Wonder |
| ブリガディアジェラード | 常勝准将 | ザ・ブリガディア | The Brigadier（いまのまま） |
| ミルリーフ | 小さな巨人 | 凱旋門賞レコード | Arc Record |
| アーモンドアイ | 府中の女神 | 芝G1九勝 | Nine Turf G1s |
| イクイノックス | 蒼き天才 | 蒼き天才（そのまま） | Blue Genius（いまのまま） |
| エネイブル | 欧州の女王 | キングジョージ三勝 | Three King Georges |
| ゴルディコヴァ | 欧州マイルの女王 | BCマイル三連覇 | Three Straight BC Miles |
| ニジンスキー | 舞神 | 最後の英国三冠馬 | Last English Triple Crown |
| ミエスク | 稀代の名牝 | ラ・コンシェルジュ | La Concierge |
| シーバード | 伝説の海鳥 | 凱旋門賞六馬身 | Six-Length Arc |
| セクレタリアト | 神速の赤馬 | 三十一馬身 | Thirty-One Lengths |
| アバーナント | 灰色の閃光 | ナンソープ連覇 | Nunthorpe Double |
| マニカト | 豪州の短距離王 | ウィリアムリード五連覇 | Five William Reids |
| フォアゴー | 最強の巨人 | 137ポンドの追い込み | 137-Pound Charge |
| クリフジ | 不敗の女傑 | 栗毛の女傑 | Chestnut Heroine |
| シーザスターズ | 星の王 | G1六連勝 | Six Straight G1s |
| リボー | イタリアの巨匠 | イル・カヴァッロ・スーペル | Il Cavallo Super |
| ブラックキャビア | 漆黒の疾風 | 二十五戦二十五勝 | Twenty-Five from Twenty-Five |
| ウィンクス | 豪州の女王 | 三十三連勝 | Thirty-Three Straight |
| ゴールデンシックスティ | 黄金のマイラー | 香港の誇り | Pride of Hong Kong |
| トレヴ | ロンシャンの女王 | 凱旋門賞連覇 | Back-to-Back Arcs |
| スペクタキュラービッド | 砂の韋駄天 | 1分57秒8 | 1:57 4/5 |
| ケルソ | 不屈の鉄人 | キング・ケリー | King Kelly |
| ドクターフェイガー | 最速の逃亡者 | 1分32秒2 | 1:32 1/5 |
| シャーガー | 白面の暴君 | そのまま（決定済み） | White-Faced Tyrant（いまのまま） |
| フライトライン | 空駆ける怪物 | そのまま（決定済み） | Sky Monster（いまのまま） |

- あわせて直す文：トレヴの why「外を回って中間点の14番手から残り600mで動き」→「外を回って後方から、残り600mで動き」。
- 名前を替えた馬は、why に出典の言葉を足す（例：ケルソ「ファンに『キング・ケリー』と呼ばれた」）。名前が数字の馬は、why にもうその数字がある。

答え方（番号で）：
1. **「推しで」**：上の表のとおり全部入れる。
2. **「いまので」**：全部いまの名前のまま（2026-10-20 の決定のとおり）。トレヴの why だけ直す。
3. **一部だけ**：例「推しで。ただしアーモンドアイは府中の女神のまま、ミエスクは案A」。

## 7. 確かめられなかったこと

- 日本語の名前26個が、日本の書籍・競馬雑誌・JRA-VAN の海外名馬の解説で使われているか。調べた検索は米国向けで、日本語に弱い。
- 開けなかった所：
  - 米国競馬殿堂の各馬のページ（503）
  - JRA-VAN World の記事2つ（404。「豪州の女傑ウィンクス」「無敗の快足女王ブラックキャビア」）
  - Sports Illustrated 1975年の記事（404。フォアゴーの「ビッグジョー」）
  - CNN の凱旋門賞2013の記事（451。ライバルの騎手の「350mで離された」）
- トレヴの凱旋門賞2013の中間点の番手（14番手）。
- ミルリーフの凱旋門賞の直線入口の番手、キングジョージ・エクリプスの道中の位置。
- ウィンクスのコックスプレート2016の中間点の番手。
- 次の数は、資料によって違うか、確かめられなかった：
  - マニカトの G1 の勝ち数
  - カウントフリートのウッドメモリアルの着差（4馬身か3馬身半か）
  - ゴールデンシックスティの通算成績（31戦26勝とするものと、29戦25勝とするものがある）
- 数字は Wikipedia と報道で確かめた。データを直す前に、公式の成績（JRA・Racing Post・Equibase など）で見直す。

## 8. 決まったこと（2026-10-23、持ち主が名前選びのページで選んだ）

- 替えた8頭：オーモンド「世紀の名馬」・ザテトラーク「驚異の斑点」（持ち主が書いた）・ブリガディアジェラード「ザ・ブリガディア」・ゴルディコヴァ「クイーンオブザマイル」（持ち主が書いた）・マニカト「ザ・マン」（持ち主が書いた）・リボー「イル・カヴァッロ・スーペル」・ゴールデンシックスティ「香港之光」（持ち主が書いた）・ケルソ「キング・ケリー」。
- ほかはいまのまま（数字・レース名の案Aは選ばれなかった）。
- 持ち主の指摘「スキル名なのに秒数や馬身や勝利数をだしてもダサい」：技の名前に数字（秒数・馬身・勝ち数）は使わない。`data/uniques.js` の決まりも直した。数字は why に書く。
