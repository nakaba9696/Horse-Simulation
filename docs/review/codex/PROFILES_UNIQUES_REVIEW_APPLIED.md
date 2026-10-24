# 名鑑・固有の技のレビュー（Codex）を当てた記録

- 元：Codex のレビュー `docs/review/codex/PROFILES_UNIQUES_REVIEW.md`（枝 `codex/profiles-review`。対象は `8098dc8`）。Codex は外のサイトを開けなかったので、ここで 2026-10-24 に出典を開いて確かめた。
- 当てた枝：`claude/profiles-review-fix`（`e4706af` から）。
- 決まり（持ち主 2026-10-24）：出典で確かめられない着差・数は書かない。「大差」は10馬身以上と読まれるので使わない。名鑑に人の名前は書かない。
- URL は開いて中身を確かめたものだけ書く。ザフライングダッチマン・カランダガン・ラウンドテーブルは別の枝（`claude/profile-records`）が戦績を直しているので触っていない。

## 1. 直した所

| # | 馬 | ファイル（項目） | 前 | 後 | 根拠 | 出典 |
|---|---|---|---|---|---|---|
| 1 | リンドシェーバー | `data/profiles_1.js`（text） | 直線で抜け出して1馬身半差で勝った | 直線で抜け出して1馬身1/4差で勝った | 1990朝日杯3歳S：2着ビッグファイトの着差は「1 1/4」 | [JBIS](https://www.jbis.or.jp/race/result/19901209/106/11/) |
| 2 | デュランダル | `data/profiles_1.js`（text） | ファインモーションに1馬身1/3差をつけた | ファインモーションに3/4馬身差をつけた | 2003マイルCS：2着ファインモーションは「3/4」 | [JBIS](https://www.jbis.or.jp/race/result/20031123/108/11/) |
| 3 | カンパニー | `data/profiles_1.js`（text） | マイネルファルケに1馬身半差をつけた | マイネルファルケに1馬身1/4差をつけた | 2009マイルCS：2着マイネルファルケは「1 1/4」 | [JBIS](https://www.jbis.or.jp/race/result/20091122/108/11/) |
| 4 | チュウワウィザード | `data/profiles_2.js`（text） | 帝王賞ではオメガパフュームにクビ差及ばず2着だった | 帝王賞ではオメガパフュームに1馬身1/4差の2着だった | 2019帝王賞：2着チュウワウィザードは「1 1/4」（2022年のクビ差負けとは別） | [JBIS](https://www.jbis.or.jp/race/result/20190626/220/11/) |
| 5 | アスコリピチェーノ | `data/profiles_2.js`（text） | 3頭の接戦をハナ差で制した | ステレンボッシュとの接戦をクビ差で制した | 2023阪神JF：2着ステレンボッシュは「クビ」、3着はさらに「1 1/4」 | [JBIS](https://www.jbis.or.jp/race/result/20231210/109/11/) |
| 6 | ミハルオー | `data/profiles.js`（text） | 札幌3歳特別まで3歳で4戦4勝 | 札幌3歳特別まで2歳で4戦4勝 | 満年齢（1945年生まれ・1947年は2歳）。競走名の旧馬齢は残す | `data/legends.js` の生年 |
| 7 | イソノルーブル | `data/profiles_1.js`（text） | 1990年9月の新馬戦を3歳レコードで勝ち | 1990年9月の新馬戦を2歳レコードで勝ち | 満年齢（1988年生まれ・1990年は2歳） | `data/historic_1.js` の生年 |
| 8 | タイテエム | `data/profiles_old.js`（text） | 最優秀3歳牡馬ヒデヤテを破った | 最優秀3歳牡馬ヒデハヤテを破った | 馬名の書き違い。賞の名の旧馬齢は残す | `data/historic_old.js` の馬名 |
| 9 | クリフジ | `data/uniques.js`（why） | 11戦11勝で、7戦は10馬身以上の差 | 11戦11勝で、多くのレースで10馬身以上の差をつけた | 出典の本文は7・表からの集計は6と食い違う（`PROFILES_FACTCHECK.md`）ので数を外し、名鑑の書き方（「11戦の多くで10馬身以上」）にそろえた | [ja](https://ja.wikipedia.org/wiki/クリフジ)（既存の確認） |
| 10 | キンチェム | `data/profiles.js`（text） | ジョッケクルブ賞を大差で勝ち | ジョッケクルブ賞を勝ち | en は新聞で2馬身と10馬身に分かれると書く。ja の表は「大差」。確かめきれないので外した | [en](https://en.wikipedia.org/wiki/Kincsem)・[ja](https://ja.wikipedia.org/wiki/キンチェム) |
| 11 | キンチェム | `data/profiles.js`（text） | 走り直しの決勝では途中で野良犬にからまれながら楽に突き放した | 走り直しの決勝では途中で野良犬にからまれて前に出られたが、追いついて交わした | en は「残り200mで追いつき、疲れ切って5馬身差」、ja は「6馬身差で楽勝」。両方が書く所（犬で前に出られ、追いついて交わした）だけにした | [en](https://en.wikipedia.org/wiki/Kincsem)・[ja](https://ja.wikipedia.org/wiki/キンチェム) |
| 12 | キンチェム | `data/uniques.js`（why） | 走り直しの決勝で楽に突き放した | 走り直しの決勝で勝った | 11 と同じ | 同上 |
| 13 | トレヴ | `data/uniques.js`（why） | 外を回って後方から残り600mで動き、5馬身差で勝った | 出遅れて後方から外を回って進出し、直線で先頭に立って5馬身差で勝った | en は「出遅れ、外から一気に進出、直線で先頭、5馬身差」。残り600mは出典に無い | [en](https://en.wikipedia.org/wiki/Tr%C3%AAve_(horse)) |
| 14 | トレヴ | `data/profiles_world.js`（text） | ヴェルメイユ賞は6馬身差で勝ち | ヴェルメイユ賞は4馬身半差で勝ち | 2015年ヴェルメイユ賞は「four and a half lengths」（レビューの外で見つけた） | [en](https://en.wikipedia.org/wiki/Tr%C3%AAve_(horse)) |
| 15 | サイテーション | `data/uniques.js`（label・labelEn） | 100万ドルホース／Million-Dollar Horse | ビッグ・サイ／Big Cy（**仮の名前**） | 技の名前に数字は入れない（`data/uniques.js` の決まり）。出典のある愛称にした（マンノウォー「ビッグレッド」・ケルソ「キング・ケリー」と同じ付け方）。100万ドルの史実は why に残る | [ja](https://ja.wikipedia.org/wiki/サイテーション_(競走馬))「愛称は「ビッグ・サイ（Big Cy）」」（Britannica・NYRA を出典に挙げる）・[en](https://en.wikipedia.org/wiki/Citation_(horse))（"Cy"） |
| 16 | ブラックキャビア | `data/uniques.js`（why） | ライトニングステークスは直線の入り口で先頭に立って大差 | 2011年のライトニングステークスは直線の入り口で先頭に立って3馬身半差 | 名鑑で直し済みの3馬身半にそろえた | [en](https://en.wikipedia.org/wiki/Black_Caviar)（`PROFILES_FACTCHECK.md` の確認） |
| 17 | セントライト | `data/profiles.js`（text） | 三冠の合間には古馬相手のハンデ戦にも出て | 三冠の合間には古馬相手のレースにも出て | 斤量の数（58・66・68キロ）と72キロで引退した経緯は ja で確かめた。68キロの一戦は「古呼馬」でハンデ戦ではない | [ja](https://ja.wikipedia.org/wiki/セントライト)（本文と成績表） |
| 18 | ノースフライト | `data/profiles_1.js`（text） | 9馬身差、8馬身差と大差で2連勝した | 9馬身差、8馬身差で2連勝した | 9馬身・8馬身は ja で確かめた。10馬身に届かないので「大差」を外した | [ja](https://ja.wikipedia.org/wiki/ノースフライト) |
| 19 | シティオブトロイ | `data/profiles_world.js`（text） | 史上最多の13頭立てで逃げ切り | 13頭立てで逃げ切り | 13頭立ては en で確かめた。「史上最多」は en の本文・競走の記録の節に無い | [en](https://en.wikipedia.org/wiki/City_of_Troy_(horse))・[競走](https://en.wikipedia.org/wiki/International_Stakes) |
| 20 | オンブズマン | `data/profiles_world.js`（text） | 8頭立ての5番人気で | 8頭立てで | 8頭立ては en の成績表で確かめた。人気は出典に無い | [en](https://en.wikipedia.org/wiki/Ombudsman_(horse)) |
| 21 | オンブズマン | `data/profiles_world.js`（text） | 残り400メートル付近で先頭に立って3馬身半差で勝ち、英国の統括機関から128ポンドの評価を受けた | 最後の1ハロンで先頭に立って3馬身半差で勝ち、世界の競走馬のランキングで128の評価を受けて首位に立った | en は「残り2ハロンで2番手、最後の1ハロンで先頭」。128は世界のランキング（Longines World's Best Racehorse Rankings）の首位の評価 | [en](https://en.wikipedia.org/wiki/Ombudsman_(horse)) |
| 22 | オンブズマン | `data/profiles_world.js`（text） | ドバイターフを2馬身差で勝ち | ドバイターフを1馬身3/4差で勝ち | en の本文と成績表は「1+3⁄4 lengths」（レビューの外で見つけた） | [en](https://en.wikipedia.org/wiki/Ombudsman_(horse)) |
| 23 | カーインライジング | `data/profiles_world.js`（text） | シャティンヴァーズで古馬を2馬身退けて | シャティンヴァーズで古馬を1馬身1/4差で退けて | en の成績表（HKJC の結果を出典にする）は「1+1⁄4 lengths」（レビューの外で見つけた） | [en](https://en.wikipedia.org/wiki/Ka_Ying_Rising) |
| 24 | カーインライジング | `data/profiles_world.js`（text） | 暮れの香港スプリントは3馬身差で連覇した | 暮れの香港スプリントは3馬身3/4差で連覇した | 2025年香港スプリントは「3+3⁄4 lengths」（レビューの外で見つけた） | [en](https://en.wikipedia.org/wiki/Ka_Ying_Rising) |

## 2. 確かめて、そのまま残した数

| 馬 | 残した数 | 出典で確かめたこと | 出典 |
|---|---|---|---|
| セントライト | 58キロで頭差の2着・66キロで3着・68キロで2着・72キロで引退 | 成績表の斤量・着順・着差（アタマ）と、本文の「72kgの斤量を背負わされることが判明」して引退 | [ja](https://ja.wikipedia.org/wiki/セントライト) |
| ノースフライト | 母はセリで最も安い410万円 | 「410万円で落札」「このセリ市に上場された馬のなかで最も安い価格だった」 | [ja](https://ja.wikipedia.org/wiki/ノースフライト) |
| ノースフライト | 9馬身差・8馬身差 | 新馬戦「9馬身差」・足立山特別「8馬身差」 | [ja](https://ja.wikipedia.org/wiki/ノースフライト) |
| メイズイ | 東京優駿の1000m通過1分1秒 | 「1000メートル通過が1分1秒という当時としてはかなり速いペース」 | [ja](https://ja.wikipedia.org/wiki/メイズイ) |
| メイズイ | 2400m以下では16戦15勝 | 「2400m以下では16戦15勝、敗戦は東京記念の2着だけ」。成績表とも合う | [ja](https://ja.wikipedia.org/wiki/メイズイ) |
| ガンシンド | 別れの披露に約2万5千人 | 「25,000 people farewelled Gunsynd at Doomben Racecourse in 1973」 | [en](https://en.wikipedia.org/wiki/Gunsynd) |
| リファール | 115頭のグレード競走の勝ち馬 | 「he produced 115 graded stakes race winners」 | [en](https://en.wikipedia.org/wiki/Lyphard) |
| ハビタット | タイムフォームの評価134はこの年のどの馬よりも高かった | 「a rating of 134 … making him their highest-rated horse of the season」 | [en](https://en.wikipedia.org/wiki/Habitat_(horse)) |
| カーインライジング | 2026年4月の1分7秒10のレコード・9月の61キロ（135ポンド）・7馬身3/4差・21連勝・2月の18連勝・3馬身半差 | 成績表（HKJC・Racing Post を出典にする）。2024年2月から2026年9月まで21連勝 | [en](https://en.wikipedia.org/wiki/Ka_Ying_Rising) |
| シティオブトロイ | 13頭立て・カランダガンを1馬身・2分4秒32のレコード | 「in a thirteen-runner field」「win by a length in a record time of 2:04.32」 | [en](https://en.wikipedia.org/wiki/City_of_Troy_(horse)) |
| オンブズマン | 8頭立て・3馬身半差・128 | 成績表の頭数と着差、「top of the Longines World's Best Racehorse Rankings with a rating of 128」 | [en](https://en.wikipedia.org/wiki/Ombudsman_(horse)) |
| キンチェム | 1879年の最後のレースを10馬身差 | 最後の一戦（Kanczadij）は「by 10 lengths」 | [en](https://en.wikipedia.org/wiki/Kincsem) |

## 3. 当てなかったもの

- **ケルソ**（レビュー3）：`data/uniques.js` の why は `e4706af` で持ち主の決めた形「3分19秒2のレコード」になっていたので、変えていない。
- **カウントフリート・クリフジの型**（レビュー4）：レビューのとおり、いまの型（bigLead・front3）のまま。
- **出典で見つけた、名鑑より後の出来事**（戦績の数が変わるので、ここでは書き足していない）：
  - カーインライジング：2026年10月17日のジ・エベレストは Tempted にクビ差の2着で、連勝が21で止まった。いまの名鑑の戦績「24戦22勝」は、このレースの前の数（出典では25戦22勝）。[en](https://en.wikipedia.org/wiki/Ka_Ying_Rising)
  - オンブズマン：2026年10月17日の英チャンピオンステークスをカランダガンに3馬身3/4差で勝った。いまの名鑑の戦績「13戦9勝」は、このレースの前の数（出典の成績表では14戦10勝）。[en](https://en.wikipedia.org/wiki/Ombudsman_(horse))
