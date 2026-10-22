# 外した史実馬の見直し（2026-10-22）

持ち主の指示（2026-10-22）「外した馬の一覧も見直して」への対応。`data/drop_horses.js` は「G1 を1つだけ勝った」をゲームのデータの勝ち鞍で数えていたため、史実では G1 を何勝もしている馬まで外れていた（例：ゴーフォーワンド。先に戻した）。ここでは外した 158 頭（ゴーフォーワンドを除く）について、史実の G1 の勝ち数を出典で確かめた。

## 決まり
- 格は勝った当時のもの。当時 G1 でなかったレースは数えない（例：プリンスオブウェールズS は2000年まで G2、オペラ賞は1999年まで G2、モーリスドゲスト賞は1994年まで G2、香港カップ・香港マイルは1999〜2000年まで国際 G1 でない）。
- 史実で G1 を2勝以上の馬は外す決まりに当たらないので戻した（`data/drop_horses.js` にコメントで理由を残し、主な勝鞍を `data/main_wins_world.js` に入れた）。総合力・能力値は変えていない。
- G1 1勝以下の馬と、確かめられなかった馬（未確認）は外したまま。
- 香港の国内のレース（香港ダービー・香港のクイーンエリザベス2世カップ）は香港の国内の格で、国際 G1 ではないので「国内 1」と書いた（外したまま）。

## 出典
- 英語版 Wikipedia の馬の記事（勝鞍）と、レースの記事（勝ち馬一覧・格の移り変わり）。
- 米国の G1：年ごとの G1 の勝ち馬一覧（sportsbetting3.com の「YEAR Grade 1 Stakes Races」、1988〜1995年）。
- 豪州・ニュージーランド：英語版 Wikipedia のほか、競馬の報道（bloodstock.com.au・thoroughbredexpress.com.au・tasracing・ttrausnz）と「優駿達の蹄跡」（ahonoora.com。ジューンの全成績）。
- 「レースの勝ち馬一覧」：その国の、ゲームのデータに無い G1（例：英 チェヴァリーパークS・ミドルパークS・ヘイドックのスプリントカップ・コロネーションS・フィリーズマイル・レーシングポストトロフィー、愛 ナショナルS・フェニックスS・モイグレアスタッドS、仏 リュパン賞・クリテリウムドサンクルー・モルニ賞・サラマンドル賞・ジャンプラ賞・サンタラリ賞、独 オイロパ賞・アラルポカル・ベルリン大賞・バイエルン大賞、伊 ローマ賞・ミラノ大賞・ジョッキークラブ大賞・イタリアダービー・イタリアオークス・イタリア大賞・共和国大統領賞・ヴィットリオディカプア賞・グランクリテリウム）の1986〜1995年の勝ち馬を英語版 Wikipedia で確かめ、その馬の名が無いことを見た。

## 結果
- 見直した馬：158 頭
- 戻した馬（史実で G1 2勝以上）：36 頭
- 外したまま（史実で G1 1勝以下。当時 G1 でなかったため0勝の馬・香港の国内の格の馬を含む）：118 頭
- 未確認（外したまま）：4 頭

| 馬 | 英語名 | 生年 | 国 | データの勝ち鞍 | 史実の G1 | 判定 | 根拠 | 出典 |
|---|---|---|---|---|---|---|---|---|
| クリケットボール | Cricket Ball | 1983 | 仏 | 1989モーリスドゲスト賞 | 0 | 外したまま | モーリスドゲスト賞は1980〜1994年 G2 | https://en.wikipedia.org/wiki/Prix_Maurice_de_Gheest |
| コールディーゼル | Cole Diesel | 1984 | 豪 | 1989コーフィールドカップ | 1 | 外したまま | コーフィールドカップ。ほかの G1 の記事なし | https://en.wikipedia.org/wiki/Caulfield_Cup |
| トレブルック | Trebrook | 1984 | 仏 | 1989カドラン賞 | 1 | 外したまま | カドラン賞。仏の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Prix_du_Cadran |
| ムヒム | Muhim | 1984 | 香港 | 1993クイーンエリザベス2世カップ | 国内 1 | 外したまま | 香港の国内の格（国際 G1 ではない）。香港の大レースは勝ち馬の記録で確かめ済み | レースの勝ち馬一覧 |
| メリンブラベイ | Merimbula Bay | 1984 | 豪 | 1989ドンカスターマイル | 1 | 外したまま | ドンカスターマイル。豪の主な G1 の勝ち馬一覧（エプソムH・ストラドブローク・ドゥームベン10000・ライトニング・ニューマーケット・フューチュリティなど）に無い | https://en.wikipedia.org/wiki/Epsom_Handicap |
| イルドシプル | Ile de Chypre | 1985 | 英 | 1989インターナショナルステークス | 1 | 外したまま | インターナショナルS | https://en.wikipedia.org/wiki/Ile_de_Chypre |
| インディアンローズ | Indian Rose | 1985 | 仏 | 1988ヴェルメイユ賞 | 1 | 外したまま | ヴェルメイユ賞。仏の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Prix_Vermeille |
| ウィリアムズコーチ | William's Coach | 1985 | 香港 | 1989香港ダービー | 国内 1 | 外したまま | 香港ダービー（香港の国内の格） | https://en.wikipedia.org/wiki/Hong_Kong_Derby |
| ウォン | Wong | 1985 | 豪 | 1989ジョージライダーステークス | 1 | 外したまま | ジョージライダーS。豪の主な G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/George_Ryder_Stakes |
| エラロマラ | Ela Romara | 1985 | 英 | 1988ナッソーステークス | 1 | 外したまま | ナッソーS。英の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| ガビナ | Gabina | 1985 | 仏 | 1989フォレ賞 | 1 | 外したまま | フォレ賞。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| グレイインヴェイダー | Grey Invader | 1985 | 新 | 1989香港カップ | 0 | 外したまま | 香港カップ（当時は G1 でない。G1 は1999年から）。売り物の記録では香港の勝ちは Listed | https://en.wikipedia.org/wiki/Hong_Kong_Cup |
| ケッセム | Kessem | 1985 | 新 | 1990香港カップ | 未確認 | 外したまま | 香港カップ（当時は G1 でない）。ニュージーランドでの勝ち鞍を確かめられなかった | https://en.wikipedia.org/wiki/Hong_Kong_Cup |
| コロニアルチーフ | Colonial Chief | 1985 | 他 | 1989香港カップ | 未確認 | 外したまま | 香港カップ（当時は G1 でない）。シンガポールでの勝ち鞍を確かめられなかった | https://en.wikipedia.org/wiki/Hong_Kong_Cup |
| サルス | Salse | 1985 | 英 | 1988フォレ賞 | 1 | 外したまま | フォレ賞 | https://en.wikipedia.org/wiki/Salse_(horse) |
| サンシャインフォーエヴァー | Sunshine Forever | 1985 | 米 | 1988ワシントンDCインターナショナル | **3** | 戻した | 英語版 Wikipedia「1988年に G1 を3勝」（マンノウォーS・ターフクラシック・ワシントンDCインターナショナル） | https://en.wikipedia.org/wiki/Sunshine_Forever |
| シデストン | Sydeston | 1985 | 豪 | 1990コーフィールドカップ | **4** | 戻した | タンクレッドS・クイーンエリザベスS・コーフィールドS・コーフィールドカップ（1990） | https://en.wikipedia.org/wiki/Sydeston |
| シルヴァーフリング | Silver Fling | 1985 | 英 | 1989アベイドロンシャン賞 | 1 | 外したまま | アベイドロンシャン賞。英仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| ダンシングスプリー | Dancing Spree | 1985 | 米 | 1989ブリーダーズカップスプリント | **3** | 戻した | サバーバンH・BC スプリント（1989）・カーターH（1990）。出典は英語版 Wikipedia と米国の年ごとの G1 一覧 | https://en.wikipedia.org/wiki/Dancing_Spree |
| ダークロモンド | Dark Lomond | 1985 | 愛 | 1988愛セントレジャー | 1 | 外したまま | 愛セントレジャー | https://en.wikipedia.org/wiki/Dark_Lomond |
| トップサンライズ | Top Sunrise | 1985 | 仏 | 1989ロワイヤルオーク賞 | 1 | 外したまま | ロワイヤルオーク賞 | https://en.wikipedia.org/wiki/Prix_Royal-Oak |
| トラステッドパートナー | Trusted Partner | 1985 | 愛 | 1988愛1000ギニー | 1 | 外したまま | 愛1000ギニー | https://en.wikipedia.org/wiki/Trusted_Partner |
| ブルーノート | Blue Note | 1985 | 仏 | 1988モーリスドゲスト賞 | 0 | 外したまま | モーリスドゲスト賞は1980〜1994年 G2 | https://en.wikipedia.org/wiki/Prix_Maurice_de_Gheest |
| プリンスオブバーズ | Prince of Birds | 1985 | 愛 | 1988愛2000ギニー | 1 | 外したまま | 愛2000ギニー | https://en.wikipedia.org/wiki/Prince_of_Birds |
| ペルシアンハイツ | Persian Heights | 1985 | 英 | 1988セントジェームズパレスステークス | 1 | 外したまま | セントジェームズパレスS | https://en.wikipedia.org/wiki/Persian_Heights |
| マーシャルロー | Martial Law | 1985 | 米 | 1989サンタアニタハンデキャップ | 1 | 外したまま | サンタアニタH（1989）。米国の年ごとの G1 一覧（1988〜1995）でほかに無い | https://www.sportsbetting3.com/horse-races/1989-grade-1-races |
| ミンスターサン | Minster Son | 1985 | 英 | 1988英セントレジャー | 1 | 外したまま | 英セントレジャー | https://en.wikipedia.org/wiki/Minster_Son |
| メロディスト | Melodist | 1985 | 英 | 1988愛オークス | **2** | 戻した | イタリアオークス・愛オークス（1988。愛オークスは同着） | https://en.wikipedia.org/wiki/Melodist_(horse) |
| ルイジ | Luigi | 1985 | 独 | 1988ドイツダービー | 1 | 外したまま | ドイツダービー。独の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Deutsches_Derby |
| ルールマン | Ruhlmann | 1985 | 米 | 1990サンタアニタハンデキャップ | **2** | 戻した | マーヴィンルロイH（1989）・サンタアニタH（1990）。出典は英語版 Wikipedia と米国の年ごとの G1 一覧 | https://en.wikipedia.org/wiki/Ruhlmann |
| レスレスカラ | Resless Kara | 1985 | 仏 | 1988仏オークス | 1 | 外したまま | 仏オークス。仏の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Prix_de_Diane |
| ローマンプローズ | Roman Prose | 1985 | 仏 | 1991モーリスドゲスト賞 | 0 | 外したまま | モーリスドゲスト賞は1980〜1994年 G2 | https://en.wikipedia.org/wiki/Prix_Maurice_de_Gheest |
| アシャル | Ashal | 1986 | 英 | 1990アスコットゴールドカップ | 1 | 外したまま | アスコットゴールドカップ | https://en.wikipedia.org/wiki/Ashal |
| アリダレス | Alydaress | 1986 | 英 | 1989愛オークス | 1 | 外したまま | 愛オークス | https://en.wikipedia.org/wiki/Alydaress |
| イズイットトゥルー | Is It True | 1986 | 米 | 1988ブリーダーズカップジュヴェナイル | 1 | 外したまま | BC ジュヴェナイル（ジムダンディS は G2） | https://en.wikipedia.org/wiki/Is_It_True_(horse) |
| エンスコンス | Ensconse | 1986 | 英 | 1989愛1000ギニー | 1 | 外したまま | 愛1000ギニー | https://en.wikipedia.org/wiki/Ensconse |
| カルテック | Caltech | 1986 | 米 | 1989ワシントンDCインターナショナル | 1 | 外したまま | ワシントンDCインターナショナル。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1989-grade-1-races |
| カードマニア | Cardmania | 1986 | 米 | 1993ブリーダーズカップスプリント | 1 | 外したまま | BC スプリント（1993）。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1993-grade-1-races |
| クイッケンアウェイ | Quicken Away | 1986 | 香港 | 1990クイーンエリザベス2世カップ | 国内 1 | 外したまま | 香港のクイーンエリザベス2世カップ（香港の国内の格） | レースの勝ち馬一覧 |
| グレンケイト | Glen Kate | 1986 | 米 | 1992香港マイル | 0 | 外したまま | 香港マイル（当時は G1 でない。G1 は2000年から）。米国の年ごとの G1 一覧にも無い | https://en.wikipedia.org/wiki/Hong_Kong_Mile |
| シュトラウスブルック | Straussbrook | 1986 | 豪 | 1990ジョージライダーステークス | 1 | 外したまま | ジョージライダーS。豪の主な G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/George_Ryder_Stakes |
| シーニック | Scenic | 1986 | 英 | 1988デューハーストステークス | 1 | 外したまま | デューハーストS（同着） | https://en.wikipedia.org/wiki/Scenic_(horse) |
| スターウォッチ | Star Watch | 1986 | 豪 | 1988ゴールデンスリッパーステークス | 1 | 外したまま | ゴールデンスリッパーS。そのあと1勝だけ | レースの勝ち馬一覧 |
| スターマーク | Star Mark | 1986 | 香港 | 1989クイーンエリザベス2世カップ | 国内 1 | 外したまま | 香港のクイーンエリザベス2世カップ（香港の国内の格） | レースの勝ち馬一覧 |
| セイフリーケプト | Safely Kept | 1986 | 米 | 1990ブリーダーズカップスプリント | **2** | 戻した | テストS（1989）・BC スプリント（1990） | https://en.wikipedia.org/wiki/Safely_Kept |
| ダンスホール | Dancehall | 1986 | 仏 | 1989パリ大賞 | 1 | 外したまま | パリ大賞。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| テリモン | Terimon | 1986 | 英 | 1991インターナショナルステークス | 1 | 外したまま | インターナショナルS | https://en.wikipedia.org/wiki/Terimon |
| ディスパーサル | Dispersal | 1986 | 米 | 1990ウッドワードステークス | 1 | 外したまま | ウッドワードS（1990）。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1990-grade-1-races |
| トゥータイミング | Two Timing | 1986 | 英 | 1989プリンスオブウェールズステークス | 0 | 外したまま | プリンスオブウェールズS は2000年まで G2 | レースの勝ち馬一覧 |
| バトシューフ | Batshoof | 1986 | 英 | 1990プリンスオブウェールズステークス | 0 | 外したまま | プリンスオブウェールズS は2000年まで G2 | レースの勝ち馬一覧 |
| パールブレスレット | Pearl Bracelet | 1986 | 仏 | 1989仏1000ギニー | 1 | 外したまま | 仏1000ギニー。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| フェスティン | Festin | 1986 | 米 | 1991ジョッキークラブゴールドカップ | **2** | 戻した | オークローンH・ジョッキークラブゴールドカップ（1991）。出典は米国の1991年の G1 一覧 | https://www.sportsbetting3.com/horse-races/1991-grade-1-races |
| フライティルドーン | Fly Till Dawn | 1986 | 米 | 1990ワシントンDCインターナショナル | **4** | 戻した | エディーリードH・ワシントンDCインターナショナル（1990）、サンルイレイS・サンフアンカピストラーノH（1992）。出典は米国の年ごとの G1 一覧（1990・1992） | https://www.sportsbetting3.com/horse-races/1990-grade-1-races |
| フライングコンチネンタル | Flying Continental | 1986 | 米 | 1990ジョッキークラブゴールドカップ | **2** | 戻した | ストラブS・ジョッキークラブゴールドカップ（1990）。出典は米国の1990年の G1 一覧 | https://www.sportsbetting3.com/horse-races/1990-grade-1-races |
| ブラーシー | Braashee | 1986 | 英 | 1990ロワイヤルオーク賞 | 1 | 外したまま | ロワイヤルオーク賞（同着） | https://en.wikipedia.org/wiki/Prix_Royal-Oak |
| プティティル | Petite Ile | 1986 | 愛 | 1989愛セントレジャー | 1 | 外したまま | 愛セントレジャー。愛の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| プリンスオブダンス | Prince of Dance | 1986 | 英 | 1988デューハーストステークス | 1 | 外したまま | デューハーストS（同着） | https://en.wikipedia.org/wiki/Prince_of_Dance |
| ママルナ | Mamaluna | 1986 | 英 | 1989ナッソーステークス | 1 | 外したまま | ナッソーS。英の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| マークオブディスティンクション | Markofdistinction | 1986 | 英 | 1990クイーンエリザベス2世ステークス | 1 | 外したまま | クイーンエリザベス2世S（クイーンアンS は当時 G2） | https://en.wikipedia.org/wiki/Markofdistinction |
| ミケロッツォ | Michelozzo | 1986 | 英 | 1989英セントレジャー | 1 | 外したまま | 英セントレジャー | https://en.wikipedia.org/wiki/Michelozzo_(horse) |
| ミュージカルブリス | Musical Bliss | 1986 | 英 | 1989英1000ギニー | 1 | 外したまま | 英1000ギニー | https://en.wikipedia.org/wiki/Musical_Bliss |
| メアリーリノア | Mary Linoa | 1986 | 仏 | 1988マルセルブサック賞 | 1 | 外したまま | マルセルブサック賞。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| ヤングマザー | Young Mother | 1986 | 仏 | 1989ヴェルメイユ賞 | 1 | 外したまま | ヴェルメイユ賞。仏の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Prix_Vermeille |
| リライアブルソース | Reliable Source | 1986 | 香港 | 1990香港ダービー | 国内 1 | 外したまま | 香港ダービー（香港の国内の格） | https://en.wikipedia.org/wiki/Hong_Kong_Derby |
| リーガルケース | Legal Case | 1986 | 英 | 1989英チャンピオンステークス | **2** | 戻した | 英チャンピオンS（1989）・ローマ賞（1990） | https://en.wikipedia.org/wiki/Legal_Case |
| レディインシルヴァー | Lady in Silver | 1986 | 仏 | 1989仏オークス | 1 | 外したまま | 仏オークス。仏の他の G1（サンタラリ賞など）の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Prix_de_Diane |
| ロゼートターン | Roseate Tern | 1986 | 英 | 1989ヨークシャーオークス | 1 | 外したまま | ヨークシャーオークス | https://en.wikipedia.org/wiki/Roseate_Tern_(horse) |
| エペルヴィエブルー | Epervier Bleu | 1987 | 仏 | 1991サンクルー大賞 | **2** | 戻した | リュパン賞（1990）・サンクルー大賞（1991）。出典は各レースの英語版 Wikipedia の勝ち馬一覧 | https://en.wikipedia.org/wiki/Prix_Lupin |
| カラーチャート | Colour Chart | 1987 | 仏 | 1990オペラ賞 | 0 | 外したまま | オペラ賞は1999年まで G2 | https://en.wikipedia.org/wiki/Prix_de_l'Op%C3%A9ra |
| カルロフ | Karloff | 1987 | 独 | 1990ドイツダービー | 1 | 外したまま | ドイツダービー。独の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Deutsches_Derby |
| キーンハンター | Keen Hunter | 1987 | 英 | 1991アベイドロンシャン賞 | 1 | 外したまま | アベイドロンシャン賞 | https://en.wikipedia.org/wiki/Keen_Hunter |
| コーツァ | Courtza | 1987 | 豪 | 1989ゴールデンスリッパーステークス | **2** | 戻した | ブルーダイヤモンドS・ゴールデンスリッパーS（1989。ブルーダイヤモンドSは1980年から G1） | https://en.wikipedia.org/wiki/Shane_Dye |
| ゴールウェイ | Galway | 1987 | 香港 | 1991クイーンエリザベス2世カップ | 国内 1 | 外したまま | 香港のクイーンエリザベス2世カップ（香港の国内の格） | レースの勝ち馬一覧 |
| サーティースルーズ | Thirty Slews | 1987 | 米 | 1992ブリーダーズカップスプリント | 1 | 外したまま | BC スプリント（1992）。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1992-grade-1-races |
| サーボーフォート | Sir Beaufort | 1987 | 米 | 1993サンタアニタハンデキャップ | 1 | 外したまま | サンタアニタH（1993）。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1993-grade-1-races |
| シェイヴィアン | Shavian | 1987 | 英 | 1990セントジェームズパレスステークス | 1 | 外したまま | セントジェームズパレスS（セレブレーションマイルは G2） | https://en.wikipedia.org/wiki/Shavian_(horse) |
| シーサイドアトラクション | Seaside Attraction | 1987 | 米 | 1990ケンタッキーオークス | 1 | 外したまま | ケンタッキーオークス（1990）。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1990-grade-1-races |
| ステージクラフト | Stagecraft | 1987 | 英 | 1991プリンスオブウェールズステークス | 0 | 外したまま | プリンスオブウェールズS は2000年まで G2 | レースの勝ち馬一覧 |
| スナージ | Snurge | 1987 | 英 | 1990英セントレジャー | **3** | 戻した | 英セントレジャー（1990）・ミラノ大賞（1991）・カナディアンインターナショナル（1992） | https://en.wikipedia.org/wiki/Snurge |
| ソーホースクエア | Soho Square | 1987 | 豪 | 1992ドンカスターマイル | 1 | 外したまま | ドンカスターマイル（アジャックスS は G1 でない） | https://en.wikipedia.org/wiki/Doncaster_Handicap |
| ダッシングブレード | Dashing Blade | 1987 | 英 | 1989デューハーストステークス | **3** | 戻した | ナショナルS・デューハーストS（1989）・イタリア大賞（1990） | https://en.wikipedia.org/wiki/Dashing_Blade |
| ディアドクター | Dear Doctor | 1987 | 仏 | 1992アーリントンミリオン | 1 | 外したまま | アーリントンミリオン（1992）。米国と仏の G1 の勝ち馬一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1992-grade-1-races |
| デッドサーテン | Dead Certain | 1987 | 英 | 1990モーリスドゲスト賞 | 1 | 外したまま | チェヴァリーパークS（1989）。モーリスドゲスト賞は当時 G2 | https://en.wikipedia.org/wiki/Cheveley_Park_Stakes |
| ナイツバロネス | Knight's Baroness | 1987 | 英 | 1990愛オークス | 1 | 外したまま | 愛オークス | https://en.wikipedia.org/wiki/Knight%27s_Baroness |
| ハウスプラウド | Houseproud | 1987 | 仏 | 1990仏1000ギニー | 1 | 外したまま | 仏1000ギニー。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| パセアナ | Paseana | 1987 | 米 | 1992ブリーダーズカップディスタフ | **10** | 戻した | 英語版 Wikipedia「G1 を10勝」。米国の年ごとの G1 一覧でも10勝 | https://en.wikipedia.org/wiki/Paseana |
| ファーマウェイ | Farma Way | 1987 | 米 | 1991サンタアニタハンデキャップ | **2** | 戻した | サンタアニタH・ピムリコスペシャル（1991） | https://en.wikipedia.org/wiki/Farma_Way |
| マナリズム | Mannerism | 1987 | 豪 | 1992コーフィールドカップ | **3** | 戻した | オーストラレージアンオークス（1991）・フューチュリティS・コーフィールドカップ（1992）。出典の記事は「G1 4勝」とするが、残りの1つは名を確かめられなかった | https://www.ttrausnz.com.au/edition/2023-02-24/who-was-i |
| マリルド | Marildo | 1987 | 仏 | 1994ガネー賞 | 1 | 外したまま | ガネー賞 | https://en.wikipedia.org/wiki/Prix_Ganay |
| マーケトリー | Marquetry | 1987 | 米 | 1991ハリウッドゴールドカップ | **3** | 戻した | ハリウッドゴールドカップ（1991）・エディーリードH（1992）・メドウランズカップ（1993）。出典は米国の年ごとの G1 一覧（1991〜1993） | https://www.sportsbetting3.com/horse-races/1991-grade-1-races |
| ミッショナリーリッジ | Missionary Ridge | 1987 | 米 | 1992パシフィッククラシック | 0 | 外したまま | 1992年のパシフィッククラシックは米国の1992年の G1 一覧に無い（1993年の一覧にはある）。ほかの G1 も無い | https://www.sportsbetting3.com/horse-races/1992-grade-1-races |
| ラファ | Rafha | 1987 | 英 | 1990仏オークス | 1 | 外したまま | 仏オークス。仏の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Prix_de_Diane |
| レアリーヴァ | Leariva | 1987 | 仏 | 1991ワシントンDCインターナショナル | 1 | 外したまま | ワシントンDCインターナショナル（1991）。米国と仏の G1 の勝ち馬一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1991-grade-1-races |
| ヴィクトワールブルー | Victoire Bleue | 1987 | 仏 | 1991カドラン賞 | 1 | 外したまま | カドラン賞 | https://en.wikipedia.org/wiki/Prix_du_Cadran |
| アディショナルリスク | Additional Risk | 1988 | 愛 | 1991香港マイル | 0 | 外したまま | 香港マイル（当時は G1 でない。G1 は2000年から）。愛の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Hong_Kong_Mile |
| アルカディアンハイツ | Arcadian Heights | 1988 | 英 | 1994アスコットゴールドカップ | 1 | 外したまま | アスコットゴールドカップ | https://en.wikipedia.org/wiki/Arcadian_Heights |
| ウイニングパートナーズ | Winning Partners | 1988 | 香港 | 1993香港マイル | 0 | 外したまま | 香港マイル（当時は G1 でない） | https://en.wikipedia.org/wiki/Hong_Kong_Mile |
| エグジットトゥノーウェア | Exit to Nowhere | 1988 | 仏 | 1992ジャックルマロワ賞 | 1 | 外したまま | ジャックルマロワ賞。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| エンヴァイロメントフレンド | Environment Friend | 1988 | 英 | 1991エクリプスステークス | 1 | 外したまま | エクリプスS | https://en.wikipedia.org/wiki/Environment_Friend |
| オールウェイズアーネスト | Always Earnest | 1988 | 仏 | 1995カドラン賞 | 1 | 外したまま | カドラン賞 | https://en.wikipedia.org/wiki/Prix_du_Cadran |
| キャニーラッド | Canny Lad | 1988 | 豪 | 1990ゴールデンスリッパーステークス | **2** | 戻した | VRC サイアーズプロデュースS・ゴールデンスリッパーS（1990） | https://en.wikipedia.org/wiki/Canny_Lad |
| キンジテ | Kinjite | 1988 | 豪 | 1992ジョージライダーステークス | **2** | 戻した | ジョージライダーS・エプソムH（1992。どちらも当時 G1）。出典は各レースの英語版 Wikipedia の勝ち馬一覧 | https://en.wikipedia.org/wiki/Epsom_Handicap |
| ケルリナ | Caerlina | 1988 | 仏 | 1991仏オークス | 1 | 外したまま | 仏オークス。仏の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Prix_de_Diane |
| コーポレートリポート | Corporate Report | 1988 | 米 | 1991トラヴァーズステークス | 1 | 外したまま | トラヴァーズS | https://en.wikipedia.org/wiki/Corporate_Report |
| サウンドプリント | Sound Print | 1988 | 香港 | 1992香港ダービー | 国内 1 | 外したまま | 香港ダービー（香港の国内の格） | https://en.wikipedia.org/wiki/Hong_Kong_Derby |
| サドラーズホール | Saddlers' Hall | 1988 | 英 | 1992コロネーションカップ | 1 | 外したまま | コロネーションカップ | https://en.wikipedia.org/wiki/Saddlers%27_Hall |
| ジェットスキーレディ | Jet Ski Lady | 1988 | 愛 | 1991英オークス | 1 | 外したまま | 英オークス | https://en.wikipedia.org/wiki/Jet_Ski_Lady |
| スケーティング | Skating | 1988 | 豪 | 1993ドンカスターマイル | 1 | 外したまま | ドンカスターマイル。豪の主な G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Doncaster_Handicap |
| スターオブコジーン | Star of Cozzene | 1988 | 米 | 1993アーリントンミリオン | **2** | 戻した | アーリントンミリオン・マンノウォーS（1993） | https://en.wikipedia.org/wiki/Star_of_Cozzene |
| スルーオブダマスカス | Slew of Damascus | 1988 | 米 | 1994ハリウッドゴールドカップ | 1 | 外したまま | ハリウッドゴールドカップ（1994）。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1994-grade-1-races |
| セカンドセット | Second Set | 1988 | 英 | 1991サセックスステークス | 1 | 外したまま | サセックスS | https://en.wikipedia.org/wiki/Second_Set_(horse) |
| ダンススマートリー | Dance Smartly | 1988 | 加 | 1991ブリーダーズカップディスタフ | 未確認 | 外したまま | BC ディスタフ（1991）は G1。カナダ三冠などカナダのレース（モルソンエクスポートミリオンなど）の当時の格を確かめられなかった（米国の1991年の G1 一覧には無い） | https://en.wikipedia.org/wiki/Dance_Smartly |
| テルケル | Tel Quel | 1988 | 仏 | 1991英チャンピオンステークス | **2** | 戻した | 英チャンピオンS（1991）・アラルポカル（1992）。出典は各レースの英語版 Wikipedia の勝ち馬一覧 | https://en.wikipedia.org/wiki/Grosser_Preis_von_Bayern |
| テンポラル | Temporal | 1988 | 独 | 1991ドイツダービー | 1 | 外したまま | ドイツダービー。独の他の G1 の勝ち馬一覧に無い | https://en.wikipedia.org/wiki/Deutsches_Derby |
| トゥーロン | Toulon | 1988 | 仏 | 1991英セントレジャー | 1 | 外したまま | 英セントレジャー | https://en.wikipedia.org/wiki/Toulon_(horse) |
| バックハー | Buckhar | 1988 | 米 | 1993ワシントンDCインターナショナル | 1 | 外したまま | ワシントンDCインターナショナル（1993）。米国の年ごとの G1 一覧でほかに無い | https://www.sportsbetting3.com/horse-races/1993-grade-1-races |
| パーペンディキュラー | Perpendicular | 1988 | 英 | 1992プリンスオブウェールズステークス | 0 | 外したまま | プリンスオブウェールズS は2000年まで G2 | レースの勝ち馬一覧 |
| フォースターズオールスター | Fourstars Allstar | 1988 | 愛 | 1991愛2000ギニー | 1 | 外したまま | 愛2000ギニー（米国の勝ちは G2・G3） | https://en.wikipedia.org/wiki/Fourstars_Allstar |
| フライソーフリー | Fly So Free | 1988 | 米 | 1990ブリーダーズカップジュヴェナイル | **3** | 戻した | シャンペンS・BC ジュヴェナイル（1990）・フロリダダービー（1991） | https://en.wikipedia.org/wiki/Fly_So_Free |
| フラール | Fraar | 1988 | 香港 | 1993コーフィールドカップ | 1 | 外したまま | コーフィールドカップ（ほかの勝ちは G3・Listed） | https://www.bloodstock.com.au/news/story.php?id=2154 |
| ポゼッシヴダンサー | Possessive Dancer | 1988 | 英 | 1991愛オークス | **2** | 戻した | イタリアオークス・愛オークス（1991） | https://en.wikipedia.org/wiki/Possessive_Dancer |
| ポリッシュパトリオット | Polish Patriot | 1988 | 英 | 1991ジュライカップ | 1 | 外したまま | ジュライカップ | https://en.wikipedia.org/wiki/Polish_Patriot |
| マグニフィセントスター | Magnificent Star | 1988 | 英 | 1991ヨークシャーオークス | 1 | 外したまま | ヨークシャーオークス | https://en.wikipedia.org/wiki/Magnificent_Star |
| マルテッサ | Martessa | 1988 | 独 | 1991オペラ賞 | 0 | 外したまま | オペラ賞は1999年まで G2 | https://en.wikipedia.org/wiki/Prix_de_l'Op%C3%A9ra |
| メドウスター | Meadow Star | 1988 | 米 | 1990ブリーダーズカップジュヴェナイルフィリーズ | **6** | 戻した | スピナウェイS・メイトロンS・フリゼットS・BC ジュヴェナイルフィリーズ（1990）、エイコーンS・マザーグースS（1991） | https://en.wikipedia.org/wiki/Meadow_Star |
| モチベーション | Motivation | 1988 | 香港 | 1993香港カップ | 0 | 外したまま | 香港カップ（当時は G1 でない） | https://en.wikipedia.org/wiki/Hong_Kong_Cup |
| ライトライト | Lite Light | 1988 | 米 | 1991ケンタッキーオークス | **4** | 戻した | ラスヴァージネスS・サンタアニタオークス・ケンタッキーオークス・CCA オークス（1991）。1990 オークリーフS は当時の格を確かめられず数えていない | https://en.wikipedia.org/wiki/Lite_Light |
| ラヒブ | Lahib | 1988 | 英 | 1992クイーンエリザベス2世ステークス | 1 | 外したまま | クイーンエリザベス2世S（クイーンアンS は当時 G2） | https://en.wikipedia.org/wiki/Lahib |
| ロマネコンティ | Romanee Conti | 1988 | 新 | 1992香港カップ | 0 | 外したまま | 香港カップ（当時は G3）。ほかは重賞・Listed | https://en.wikipedia.org/wiki/Hong_Kong_Cup |
| ワンドリーマー | One Dreamer | 1988 | 米 | 1994ブリーダーズカップディスタフ | 1 | 外したまま | BC ディスタフ | https://en.wikipedia.org/wiki/One_Dreamer_(horse) |
| ヴェールタマンド | Vert Amande | 1988 | 仏 | 1993ガネー賞 | 1 | 外したまま | ガネー賞 | https://en.wikipedia.org/wiki/Prix_Ganay |
| サブゼロ | Subzero | 1988 | 豪 | 1992メルボルンカップ | 未確認 | 外したまま | メルボルンカップは G1。1992年の南オーストラリアダービーの当時の格を確かめられなかった（今は G1） | https://en.wikipedia.org/wiki/Subzero_(horse) |
| ジューン | Jeune | 1988 | 香港 | 1994メルボルンカップ | **4** | 戻した | アンダーウッドS・メルボルンカップ（1994）、CF オーアS・クイーンエリザベスS（1995）。出典は各レースの英語版 Wikipedia の勝ち馬一覧と「優駿達の蹄跡」の全成績 | https://en.wikipedia.org/wiki/Underwood_Stakes |
| アルマーラド | Almaarad | 1983 | 豪 | 1989コックスプレート | **4** | 戻した | アラルポカル（1988）・アンダーウッドS・コーフィールドS・コックスプレート（1989） | https://en.wikipedia.org/wiki/Almaarad |
| オープニングヴァース | Opening Verse | 1986 | 米 | 1991ブリーダーズカップマイル | **2** | 戻した | オークローンH（1990）・BC マイル（1991）。出典は英語版 Wikipedia と米国の年ごとの G1 一覧 | https://en.wikipedia.org/wiki/Opening_Verse |
| サーファーズパラダイス | Surfers Paradise | 1987 | 新 | 1991コックスプレート | **5** | 戻した | ニュージーランド2000ギニー・ニュージーランドダービー（1990）、ニュージーランドS・ローズヒルギニー・コックスプレート（1991）。NZ の3つは当時の格を確かめていない（ローズヒルギニーとコックスプレートは当時も G1） | https://en.wikipedia.org/wiki/Surfers_Paradise_(horse) |
| ミスティコ | Mystiko | 1988 | 英 | 1991英2000ギニー | 1 | 外したまま | 英2000ギニー | https://en.wikipedia.org/wiki/Mystiko_(horse) |
| ソルヴィット | Solvit | 1988 | 新 | 1994コックスプレート | **3** | 戻した | ニュージーランドS（1993・1994）・コックスプレート（1994） | https://en.wikipedia.org/wiki/Solvit_(horse) |
| トーリフィック | Tawrrific | 1984 | 豪 | 1989メルボルンカップ | 1 | 外したまま | メルボルンカップ（AJC セントレジャーは当時 G2） | https://en.wikipedia.org/wiki/AJC_St_Leger |
| アワーズアフター | Hours After | 1985 | 仏 | 1988仏ダービー | 1 | 外したまま | 仏ダービー | https://en.wikipedia.org/wiki/Hours_After_(horse) |
| キングストンルール | Kingston Rule | 1985 | 豪 | 1990メルボルンカップ | 1 | 外したまま | メルボルンカップ（ムーニーヴァレーカップは G2）。Wikipedia の生年は1986年（データは1985年） | https://en.wikipedia.org/wiki/Kingston_Rule |
| プライズド | Prized | 1986 | 米 | 1989ブリーダーズカップターフ | **2** | 戻した | BC ターフ（1989）・サンルイレイS（1990）。英語版 Wikipedia はモルソンミリオンも G1 と書くが、当時の格は確かめられず数えていない | https://en.wikipedia.org/wiki/Prized |
| クエストフォーフェイム | Quest for Fame | 1987 | 英 | 1990英ダービー | **2** | 戻した | 英ダービー（1990）・ハリウッドターフハンデキャップ（1992） | https://en.wikipedia.org/wiki/Quest_for_Fame_(horse) |
| ゴーアンドゴー | Go And Go | 1987 | 愛 | 1990ベルモントステークス | 1 | 外したまま | ベルモントS（ローレルフューチュリティは1989年 G2） | https://en.wikipedia.org/wiki/Laurel_Futurity |
| スノーブライド | Snow Bride | 1986 | 英 | 1989英オークス | 1 | 外したまま | 英オークス | https://en.wikipedia.org/wiki/Snow_Bride |
| プレザントタップ | Pleasant Tap | 1987 | 米 | 1992ジョッキークラブゴールドカップ | **2** | 戻した | サバーバンH・ジョッキークラブゴールドカップ（1992） | https://en.wikipedia.org/wiki/Pleasant_Tap |
| ビューロクラシー | Bureaucracy | 1987 | 豪 | 1991ジョージライダーステークス | 1 | 外したまま | ジョージライダーS。アスコットヴェイルS（1990）は当時 G2（英語版 Wikipedia。死亡の記事は「G1」と書く） | https://en.wikipedia.org/wiki/Coolmore_Stud_Stakes |
| セルカーク | Selkirk | 1988 | 英 | 1991クイーンエリザベス2世ステークス | 1 | 外したまま | クイーンエリザベス2世S（ロッキンジS の G1 は1995年から） | https://en.wikipedia.org/wiki/Selkirk_(horse) |
| マルジュ | Marju | 1988 | 英 | 1991セントジェームズパレスステークス | 1 | 外したまま | セントジェームズパレスS。英の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| デインヒル | Danehill | 1986 | 英 | 1989コーク＆オラリーステークス・1989スプリントカップ | 1 | 外したまま | スプリントカップ（コークアンドオラリーS は G3） | https://en.wikipedia.org/wiki/Danehill_(horse) |
| ジェイドロバリー | Jade Robbery | 1987 | 仏 | 1989ジャンリュックラガルデール賞 | 1 | 外したまま | グランクリテリウム。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
| メルカル | Mercalle | 1986 | 仏 | 1990カドラン賞 | 1 | 外したまま | カドラン賞 | https://en.wikipedia.org/wiki/Prix_du_Cadran |
| ヘレニック | Hellenic | 1987 | 英 | 1990ヨークシャーオークス | 1 | 外したまま | ヨークシャーオークス | https://en.wikipedia.org/wiki/Hellenic_(horse) |
| ピストレブルー | Pistolet Bleu | 1988 | 仏 | 1992サンクルー大賞 | **2** | 戻した | クリテリウムドサンクルー（1990）・サンクルー大賞（1992）。出典は各レースの英語版 Wikipedia の勝ち馬一覧 | https://en.wikipedia.org/wiki/Crit%C3%A9rium_de_Saint-Cloud |
| ソートアウト | Sought Out | 1988 | 仏 | 1992カドラン賞 | 1 | 外したまま | カドラン賞 | https://en.wikipedia.org/wiki/Prix_du_Cadran |
| サマースコール | Summer Squall | 1987 | 米 | 1990プリークネスステークス | **2** | 戻した | ホープフルS（1989）・プリークネスS（1990）。出典は英語版 Wikipedia と米国の年ごとの G1 一覧 | https://en.wikipedia.org/wiki/Summer_Squall |
| リナミックス | Linamix | 1987 | 仏 | 1990仏2000ギニー | 1 | 外したまま | 仏2000ギニー | https://fr.wikipedia.org/wiki/Linamix |
| セプティエムシエル | Septieme Ciel | 1987 | 仏 | 1990フォレ賞 | 1 | 外したまま | フォレ賞。仏の他の G1 の勝ち馬一覧に無い | レースの勝ち馬一覧 |
