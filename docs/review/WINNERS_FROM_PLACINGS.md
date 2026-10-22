# G1 上位着順の記録から勝ち馬の記録に足した1着（2026-10-22）

G1 の上位着順の記録（`data/src/placings_jra.jsonl`・`placings_world.jsonl`。1989〜2026年）の1着のうち、勝ち馬の記録（`data/src/winners_*.jsonl`）に無かったレース×年を足した。
足す範囲は、その年のゲームの番組表（`data/races*.js` の from/to と grade）で G1 のレースだけ（持ち主の決定 2026-10-22。地方の JpnI は1995年から G1 扱いなので入れる）。記録に無かった 1,443 のレース×年（同着を入れて 1,444 頭分）は、全部この範囲に入っていた。

## 数

- 足した1着：**655 件**（JRA 1・地方 272・海外 382）。JRA と地方は `winners_jra_a.jsonl`、海外は `winners_world.jsonl` の末尾。
  - 行の形は既存の行と同じ。age は「その年 − いまのデータの生年」、sex・country はいまのデータの馬、surface・dist・course はその年の番組表、JRA と地方の time は着順の記録から。ref に出典の URL、note に「G1 上位着順の記録（placings_*）の1着から足した（2026-10-22）」。
  - 騎手・調教師の欄は書かない（人の名前を入れない。空の騎手を書くと、自動の史実馬の主戦騎手の見積もりが空に負けて消えるため欄ごと書かない）。
  - 推測で埋めた項目は無い（est は付けていない）。いまのデータに無い新しい4頭は、性別・生年・英語の名前を JBIS の馬のページで確かめた（note に書いた。英語の名前は data/names_en.js）。
- 名前をいまのデータの馬にそろえた：**5 件**（英語の名前と生年で 4・カナの書き方 1）。新しい別の馬は作っていない。
- 足さなかった：**793 件**（理由は下）。英語の綴りの違いで、もう記録にあった同じ馬：2 件（1989 メルボルンカップ Tawriffic＝トーリフィック・2017 ドイツダービー Windstoß＝ヴィントシュトース）。
- 同着の1着：記録に無かったのは 1995 チャンピオンズ＆チャターカップ（マカープラスター・Survey King）の1つ。マカープラスターは足し、Survey King はカナの名前が無いので足していない。

## 作り直しで変わった馬

足す前に `node tools/build_auto.js`・`node tools/build_jockeys_extra.js` を回し、いまの `data/historic_auto.js`・`data/jockeys_extra.js` と同じになることを確かめてから足した。足した後の差：
- 自動の史実馬で変わった馬：191 頭（勝ち鞍。そこから強さの元 rating・距離・成長型・引退の年など）。全部、記録を足した馬だった（ほかの馬は変わっていない）。
- 新しい史実馬：4 頭（アマンテビアンコ・ナチュラルライズ・フィンガー・パイロマンサー。どれも番組表で年齢の決まったレース（2歳・3歳）なので生年が決まる。番組表の年齢の条件（2歳・3歳）から出した生年と、JBIS の生年・性別（4頭とも牡）が合った）。
- 手で確かめた史実馬に足す勝ち鞍（historicExtraWins）が変わった馬：63 頭。残りの手の馬は、足した勝ちがもうデータの勝ち鞍にあった。
- 主戦騎手の見積もり（historicJockeysAuto）と `data/jockeys_extra.js` は変わっていない。
- 画面の総合力が動いた馬：156 頭。そのうち 129 頭は、上書き（`data/horse_fix.js`）の無い強さの元が、増えた勝ち鞍で上がった分（下の決め直しの対象外：G1 2勝以上で下限より上・持ち主が値を決めた馬・本当の G1 の数のほうが多い馬）。

## 総合力の決め直し

勝ち鞍の G1 が増えた自動の史実馬（`auto: true`）だけ、G1 の格の決まり（持ち主の決定 2026-10-22）で決め直した。G1 1勝＝勝った G1 の格の値、2勝以上＝いちばん格の高い G1 の値 ＋1.0、3勝目から1つごとに ＋0.5（下限。いまの値がそれ以上なら動かさない）。「レースの水準」の上げ下げは前と同じく格の値に足した。値は画面の総合力（0.5 刻み）で合わせ、`data/horse_fix.js` の上書きで入れた。

- 対象（勝ち鞍の G1 が増えた自動の馬）：192 頭
- 決め直した：**27 頭**（上げ 22・下げ 5。G1 1勝 6・2勝以上の下限 21）
- 動かさない：持ち主が値を決めた馬 30 頭、本当の G1 の数（`data/main_wins_world.js`）がゲームの G1 の数より多い馬 34 頭（前の決め直しと同じく飛ばす）、2勝以上でいまの値が下限以上の馬 101 頭
- 見直してほしい所：新しい馬のナチュラルライズ・フィンガー（羽田盃と東京ダービーの G1 2勝）は、下限 62.0 より自動の強さの元のほうが高く 66.5 のまま（前の決め直しと同じく、下限より上は動かさない）。下限ちょうどにするなら 62.0。

「元」は記録を足す前の画面の数、「作り直し後」は自動の馬を作り直した後・決め直しの前の数。

| 馬 | G1 の勝ち | 元 → 作り直し後 → 決め直し | 決まり |
|---|---|---|---|
| オリエンタルエクスプレス | 1997香港ダービー・1999チャンピオンズ＆チャターカップ・2001チャンピオンズ＆チャターカップ | 61.5 → 62.5 → 63（芝） | G1 複数勝ちの下限・案の格：チャンピオンズ＆チャターカップ |
| ディアトライブ | 2000コーフィールドカップ・2000ローズヒルギニー | 61.5 → 61.5 → 62.5（芝） | G1 複数勝ちの下限・案の格：ローズヒルギニー |
| シーロ | 1999ジャンリュックラガルデール賞・2000セクレタリアトステークス | 60.5 → 60.5 → 62（芝） | G1 複数勝ちの下限・案の格：セクレタリアトステークス |
| フルート | 2001アラバマステークス・2001ケンタッキーオークス | 61.5 → 61.5 → 62.5（ダ） | G1 複数勝ちの下限・案の格：アラバマステークス |
| スーパーキッド | 2004スチュワーズカップ・2004チャンピオンズ＆チャターカップ・2006香港ゴールドカップ | 62 → 63 → 63.5（芝） | G1 複数勝ちの下限・案の格：スチュワーズカップ・チャンピオンズ＆チャターカップ |
| レザルク | 2006クイーンエリザベス2世ジュビリーステークス・2006ジュライカップ | 62 → 62 → 63（芝） | G1 複数勝ちの下限・案の格：クイーンエリザベス2世ジュビリーステークス |
| キッケンクリス | 2003セクレタリアトステークス・2004アーリントンミリオン | 62 → 62 → 63（芝） | G1 複数勝ちの下限・案の格：セクレタリアトステークス |
| アブソリュートチャンピオン | 2006香港スプリント・2007チェアマンズスプリントプライズ | 63 → 63 → 64（芝） | G1 複数勝ちの下限・水準 +1・案の格：チェアマンズスプリントプライズ |
| イングリッシュチャンネル | 2006ジョーハーシュターフクラシック・2007ジョーハーシュターフクラシック・2007ブリーダーズカップターフ | 63.5 → 63.5 → 65（芝） | G1 複数勝ちの下限・案の格：ジョーハーシュターフクラシック |
| キングスゲイトネイティヴ | 2007ナンソープステークス・2008クイーンエリザベス2世ジュビリーステークス | 62 → 62 → 63（芝） | G1 複数勝ちの下限・案の格：クイーンエリザベス2世ジュビリーステークス |
| トレジャービーチ | 2011セクレタリアトステークス・2011愛ダービー | 62 → 62 → 63（芝） | G1 複数勝ちの下限・案の格：セクレタリアトステークス |
| ブレイジングスピード | 2014スチュワーズカップ・2014チャンピオンズ＆チャターカップ・2015クイーンエリザベス2世カップ・2016チャンピオンズ＆チャターカップ | 62.5 → 63.5 → 64.5（芝） | G1 複数勝ちの下限・案の格：スチュワーズカップ・チャンピオンズ＆チャターカップ |
| リーサルフォース | 2013クイーンエリザベス2世ジュビリーステークス・2013ジュライカップ | 62 → 62 → 63（芝） | G1 複数勝ちの下限・案の格：クイーンエリザベス2世ジュビリーステークス |
| スレイドパワー | 2014クイーンエリザベス2世ジュビリーステークス・2014ジュライカップ | 62 → 62 → 63（芝） | G1 複数勝ちの下限・案の格：クイーンエリザベス2世ジュビリーステークス |
| ゴールドリーム | 2015アベイドロンシャン賞・2015キングチャールズ3世ステークス | 61.5 → 61.5 → 63（芝） | G1 複数勝ちの下限・案の格：キングチャールズ3世ステークス |
| モンディアリスト | 2015ウッドバインマイル・2016アーリントンミリオン | 62 → 62 → 63（芝） | G1 複数勝ちの下限・案の格：ウッドバインマイル |
| ナイトオブサンダー | 2014英2000ギニー・2015ロッキンジステークス | 63 → 63 → 65（芝） | G1 複数勝ちの下限・水準 +1・案の格：ロッキンジステークス |
| オナーコード | 2015ホイットニーステークス・2015メトロポリタンハンデキャップ | 63 → 63 → 64.5（ダ） | G1 複数勝ちの下限・水準 +1 |
| マグナグレシア | 2018フューチュリティトロフィー・2019英2000ギニー | 62 → 62 → 63（芝） | G1 複数勝ちの下限・水準 -1・案の格：フューチュリティトロフィー |
| ザンドン | 2022ブルーグラスステークス・2023ウッドワードステークス | 61.5 → 61.5 → 62.5（ダ） | G1 複数勝ちの下限 |
| ロードフォンス | 2026さきたま杯 | 53 → 63.5 → 61（ダ） | G1 1勝の格・案の格：さきたま杯 |
| ラムジェット | 2024東京ダービー | 53 → 63.5 → 61（ダ） | G1 1勝の格・案の格：東京ダービー |
| アマンテビアンコ（新） | 2024羽田盃 | — → 63 → 60.5（ダ） | G1 1勝の格・案の格：羽田盃 |
| シャドウオブライト | 2024デューハーストステークス・2024ミドルパークステークス | 60.5 → 60.5 → 61.5（芝） | G1 複数勝ちの下限・案の格：ミドルパークステークス |
| モンローウォーク | 2026秋華賞 | 57 → 57 → 62（芝） | G1 1勝の格 |
| シルバーレシオ | 2026ジャパンダートクラシック | 53 → 63.5 → 61（ダ） | G1 1勝の格 |
| パイロマンサー（新） | 2025全日本2歳優駿 | — → 63 → 60（ダ） | G1 1勝の格 |

## 表に無かった G1 と付けた格の案

G1 の格の表（G1 の格のページ）に無いレースは、同じ格の近いレースから案を付けて使った（持ち主の見直し待ち）。上の決め直しで案を使った馬は「案の格」と書いた。

| レース | 案 | 近いレース |
|---|---|---|
| ワシントンDCインターナショナル | 62.0 | 古馬の芝の大レース。アーリントンミリオン（62.0） |
| 羽田盃 | 60.5 | ジャパンダートクラシック（61.0）より一つ下。3歳のダートの地方の G1（2024年から） |
| 東京ダービー | 61.0 | ジャパンダートダービー・ジャパンダートクラシック（61.0） |
| さきたま杯 | 61.0 | JBCスプリント（61.0） |
| JBCマイル | 61.0 | JBCスプリント（61.0） |
| ローズヒルギニー | 61.0 | 3歳の G1。フロリダダービー・ブルーグラスステークス（61.0） |
| ランドウィックギニー | 61.0 | 3歳の G1。フロリダダービー・ブルーグラスステークス（61.0） |
| コーフィールドギニー | 61.0 | 3歳の G1。フロリダダービー・ブルーグラスステークス（61.0） |
| オーストラリアンダービー | 61.5 | ドイツダービー・香港ダービー（61.5） |
| ヴィクトリアダービー | 61.5 | ドイツダービー・香港ダービー（61.5） |
| オーストラリアンオークス | 61.0 | 3歳牝馬の G1。仏オークス（61.5）より一つ下 |
| ブルーダイヤモンドステークス | 60.0 | 2歳の G1。ゴールデンスリッパーステークス（60.0） |
| TJスミスステークス | 62.0 | 古馬の短距離の大レース。ナンソープステークス・香港スプリント（62.0） |
| ジ・エベレスト | 62.0 | 古馬の短距離の大レース。ナンソープステークス・香港スプリント（62.0） |
| クイーンエリザベス2世ジュビリーステークス | 62.0 | 古馬の短距離の大レース。ジュライカップ（62.0） |
| キングチャールズ3世ステークス | 62.0 | 古馬の短距離の大レース。ナンソープステークス（62.0） |
| ブラックキャビアライトニング | 61.5 | 古馬の短距離の G1。アベイドロンシャン賞・ヴォスバーグステークス（61.5） |
| チェアマンズスプリントプライズ | 61.5 | 古馬の短距離の G1。アベイドロンシャン賞・ヴォスバーグステークス（61.5） |
| センテナリースプリントカップ | 61.5 | 古馬の短距離の G1。アベイドロンシャン賞・ヴォスバーグステークス（61.5） |
| スプリントカップ | 61.5 | 古馬の短距離の G1。モーリスドゲスト賞（61.5） |
| ブリティッシュチャンピオンズスプリントステークス | 61.5 | 古馬の短距離の G1。モーリスドゲスト賞（61.5） |
| アルクオーツスプリント | 61.5 | 古馬の短距離の G1。アベイドロンシャン賞（61.5） |
| ブリーダーズカップターフスプリント | 61.5 | 古馬の短距離の G1。ヴォスバーグステークス（61.5） |
| フライングファイブステークス | 61.0 | 古馬の短距離の G1 で上より一段軽い。JBCスプリント（61.0） |
| ブリーダーズカップフィリー＆メアスプリント | 61.0 | 牝馬の短距離の G1。JBCスプリント（61.0） |
| ニューマーケットハンデキャップ | 61.0 | 短距離のハンデの G1。JBCスプリント（61.0） |
| コモンウェルスカップ | 61.0 | 3歳の短距離の G1。フロリダダービー（61.0） |
| ロッキンジステークス | 62.0 | 古馬のマイルの G1。メトロポリタンハンデキャップ・ドンカスターマイル（62.0） |
| クイーンアンステークス | 62.0 | 古馬のマイルの G1。メトロポリタンハンデキャップ・ドンカスターマイル（62.0） |
| スチュワーズカップ | 62.0 | 古馬のマイルの G1。チャンピオンズマイル（62.5）より一つ下 |
| ウッドバインマイル | 61.5 | 古馬のマイルの G1。ブリーダーズカップダートマイル（61.5） |
| クイーンズシルヴァージュビリーカップ | 61.0 | 古馬の1400の G1。JBCスプリント（61.0） |
| シティオブヨークステークス | 61.0 | 古馬の1400の G1。JBCスプリント（61.0） |
| コロネーションステークス | 61.5 | 3歳牝馬のマイルの G1。愛1000ギニー・仏1000ギニー（61.5） |
| ファルマスステークス | 61.5 | 牝馬のマイルの G1。ナッソーステークス（61.5） |
| サンチャリオットステークス | 61.5 | 牝馬のマイルの G1。ナッソーステークス（61.5） |
| ロートシルト賞 | 61.5 | 牝馬のマイルの G1。ナッソーステークス（61.5） |
| メイトロンステークス | 61.5 | 牝馬のマイルの G1。ナッソーステークス（61.5） |
| ジャンプラ賞 | 61.0 | 3歳のマイル前の G1。フロリダダービー（61.0） |
| プリティーポリーステークス | 61.5 | 牝馬の2000の G1。オペラ賞・ナッソーステークス（61.5） |
| ジャンロマネ賞 | 61.5 | 牝馬の2000の G1。オペラ賞（61.5） |
| ブリティッシュチャンピオンズフィリーズ＆メアズステークス | 61.5 | 牝馬の2400の G1。ヴェルメイユ賞・ヨークシャーオークス（61.5） |
| ロワイヤリュー賞 | 61.0 | 牝馬の長距離の G1。ヴェルメイユ賞（61.5）より一つ下 |
| スピンスターステークス | 61.5 | 牝馬のダートの G1。ケンタッキーオークス（61.5） |
| E.P.テイラーステークス | 61.0 | 牝馬の芝の G1。ヴェルメイユ賞（61.5）より一つ下 |
| コーチングクラブアメリカンオークス | 61.0 | 3歳牝馬の G1。ケンタッキーオークス（61.5）より一つ下 |
| エイコーンステークス | 61.0 | 3歳牝馬の G1。ケンタッキーオークス（61.5）より一つ下 |
| アラバマステークス | 61.5 | 3歳牝馬の G1。ケンタッキーオークス（61.5） |
| アーカンソーダービー | 61.0 | 3歳のダートの前哨の G1。フロリダダービー（61.0） |
| サンタアニタダービー | 61.0 | 3歳のダートの前哨の G1。フロリダダービー（61.0） |
| ハスケルステークス | 61.5 | 3歳のダートの G1。トラヴァーズステークス（63.0）より下で、ケンタッキーオークス（61.5） |
| ペンシルベニアダービー | 61.5 | 3歳のダートの G1。ハスケルステークスと同じ（61.5） |
| セクレタリアトステークス | 61.0 | 3歳の芝の G1。フロリダダービー（61.0） |
| チャンピオンズ＆チャターカップ | 61.5 | 古馬の2400の G1。香港ダービー・ベルリン大賞（61.5）。香港ゴールドカップ（62.0）より一つ下 |
| タタソールズゴールドカップ | 62.0 | 古馬の2000の G1。香港ゴールドカップ・イスパーン賞（62.0） |
| ジョーハーシュターフクラシック | 62.0 | 古馬の芝の大レース。アーリントンミリオン（62.0） |
| ソードダンサーステークス | 61.5 | 古馬の芝の G1。ウッドワードステークス（61.5） |
| カナディアンインターナショナル | 61.5 | 古馬の芝の G1。ベルリン大賞（61.5） |
| クイーンエリザベスステークス | 62.5 | 古馬の2000の大レース。ジョージライダーステークス（62.5） |
| オーストラリアンカップ | 62.0 | 古馬の2000の G1。香港ゴールドカップ（62.0） |
| シドニーカップ | 61.5 | 古馬の長距離の G1。カドラン賞（61.5） |
| グッドウッドカップ | 61.5 | 古馬の長距離の G1。カドラン賞（61.5） |
| ブリティッシュチャンピオンズロングディスタンスカップ | 61.5 | 古馬の長距離の G1。カドラン賞・ロワイヤルオーク賞（61.5） |
| ヴィコンテスヴィジエ賞 | 61.5 | 古馬の長距離の G1。カドラン賞（61.5） |
| フィリーズマイル | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| フューチュリティトロフィー | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| チェヴァリーパークステークス | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| ミドルパークステークス | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| フェニックスステークス | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| モイグレアスタッドステークス | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| ナショナルステークス | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| ゴールデンフリースステークス | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| モルニ賞 | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| クリテリウムドサンクルー | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| クリテリウムアンテルナシオナル | 60.0 | 2歳の G1。デューハーストステークス（60.5）より一つ下 |
| ブリーダーズカップジュヴェナイルターフ | 60.0 | 2歳の G1。ブリーダーズカップジュヴェナイル（60.0） |
| ブリーダーズカップジュヴェナイルフィリーズターフ | 60.0 | 2歳の G1。ブリーダーズカップジュヴェナイル（60.0） |
| ブリーダーズカップジュヴェナイルターフスプリント | 60.0 | 2歳の G1。ブリーダーズカップジュヴェナイル（60.0） |

## 足さなかったもの

### カナの名前が無い、いまのデータに無い馬（772 件）

記録（placings_world）に英語の名前しか無く、いまのデータにもいない馬。足すと新しい史実馬になるが、ゲームで出すカナの名前と（年齢の決まっていないレースでは）生年が無いので足していない。足すなら、出典で確かめたカナの名前と生年が要る。

- オーストラリアンダービー（34）：1989 Research、1990 Dr Grace、1991 Durbridge、1992 Naturalism、1993 Innocent King、1994 Mahogany、1995 Ivory's Irish、1997 Ebony Grosve、1998 Gold Guru、2000 Fairway、2001 Universal Prince、2002 Don Eduardo、2003 Clangalang、2005 Eremein、2006 Headturner、2007 Fiumicino、2008 Nom du Jeu、2009 Roman Emperor、2010 Shoot Out、2011 Shamrocker、2012 Ethiopia、2013 It's A Dundeel、2014 Criterion、2016 Tavago、2017 Jon Snow、2018 Levendi、2019 Angel of Truth、2020 Quick Thinker、2021 Explosive Jack、2022 Hitotsu、2023 Major Beel、2024 Riff Rocket、2025 Aeliana、2026 Green Spaces
- ローズヒルギニー（32）：1989 Riverina Charm、1990 Solar Circle、1992 Naturalism、1993 Innocent King、1994 Star Of Maple、1995 Danewin、1997 Tarnpir Lane、1998 Tie The Knot、2001 Sale Of Century、2002 Carnegie Express、2003 Helenus、2004 Niello、2005 Eremein、2006 De Beers、2007 He's No Pie Eater、2008 Dealer Principal、2010 Zabrasive、2011 Jimmy Choux、2012 Laser Hawk、2013 It's A Dundeel、2014 Criterion、2015 Volkstok'n'barrell、2016 Tarzino、2017 Gingernuts、2018 D'Argento、2019 The Autumn Sun、2020 Castelvecchio、2021 Mo'unga、2023 Lindermann、2024 Riff Rocket、2025 Broadsiding、2026 Autumn Boy
- ブラックキャビアライトニング（31）：1989 Zeditave、1990 Redelva、1991 Shaftesbury Avenue、1994 Keltrice、1995 Mahogany、1996 Gold Ace、1997 Mahogany、1998 General Nediym、1999 Isca、2000 Testa Rossa、2001 Sports、2002 Spinning Hill、2003 Choisir、2004 Regimental Gal、2005 Fastnet Rock、2007 Miss Andretti、2008 Apache Cat、2009 Scenic Blast、2010 Nicconi、2014 Snitzerland、2015 Lankan Rupee、2016 Chautauqua、2017 Terravista、2018 Redkirk、2019 In Her Time、2020 Gytrash、2022 Home Affairs、2023 Coolangatta、2024 Imperatriz、2025 Skybird、2026 Tentyris
- エイコーンステークス（28）：1990 Stella Madrid、1992 Prospectors Delite、1995 Cat's Cradle、1996 Star De Lady Ann、1997 Sharp Cat、1998 Jersey Girl、1999 Three Ring、2000 Finder's Fee、2001 Forest Secrets、2002 You、2004 Island Sand、2006 Bushfire、2007 Cotton Blossom、2008 Zaftig、2009 Gabby's Golden Gal、2010 Champagne d'Oro、2011 It's Tricky、2012 Contested、2013 Midnight Lucky、2014 Sweet Reason、2015 Curalina、2016 Carina Mia、2019 Guarana、2020 Gamine、2021 Search Results、2022 Matareya、2025 La Cara、2026 Counting Stars
- ホープフルステークス（米）（25）：1994 Wild Escapade、1995 Hennessy、1996 Smoke Glacken、1998 Lucky Roberto、1999 High Yield、2002 Sky Mesa、2003 Silver Wagon、2005 First Samurai、2006 Circular Quay、2008 Vineyard Haven、2009 Dublin、2010 Boys at Tosconova、2011 Currency Swap、2013 Strong Mandate、2014 Competitive Edge、2015 Ralis、2016 Practical Joke、2017 Sporting Chance、2018 Mind Control、2019 Basin、2020 Jackie's Warrior、2021 Gunite、2023 Nutella Fella、2024 Chancer McPatrick、2026 The Good Life
- アラバマステークス（24）：1991 Versailles Treaty、1992 November Snow、1994 Heavenly Prize、1995 Pretty Discreet、1996 Yanks Music、1997 Runup The Colors、1998 Banshee Breeze、2000 Jostle、2003 Island Fashion、2004 Society Selection、2005 Sweet Symphony、2006 Pine Island、2007 Lady Joanne、2009 Careless Jewel、2012 Questing、2015 Embellish The Lace、2017 Elate、2018 Eskimo Kisses、2019 Dunbar Road、2022 Nest、2023 Randomized、2024 Power Squeeze、2025 Nitrogen、2026 My Gun's Loaded
- メトロポリタンハンデキャップ（20）：1989 Proper Reality、1992 Dixie Brass、1993 Ibero、1995 You And I、1996 Honour And Glory、1997 Langfuhr、1998 Wild Rush、1999 Sir Bear、2000 Yankee Victor、2001 Exciting Story、2003 Aldebaran、2004 Pico Central、2008 Divine Park、2009 Bribon、2013 Sahara Sky、2017 Mor Spirit、2018 Bee Jersey、2020 Vekoma、2021 Silver State、2025 Raging Torrent
- ジョーハーシュターフクラシック（20）：1989 Yankee Affair、1990 Cacoethes、1991 Solar Splendor、1992 Sky Classic、1995 Turk Passer、1996 Diplomatic Jet、2000 John's Call、2001 Timboroa、2002 Denon、2005 Shakespeare、2008 Grand Couturier、2009 Interpatation、2010 Winchester、2012 Point Of Entry、2015 Big Blue Kitten、2016 Ectot、2018 Channel Maker、2019 Arklow、2020 Channel Maker、2021 Rockemperor
- クイーンエリザベス2世ジュビリーステークス（17）：2002 Malhub、2003 Choisir、2004 Fayr Jag、2007 Soldier's Tale、2009 Art Connoisseur、2011 Society Rock、2015 Undrafted、2016 Twilight Son、2017 The Tin Man、2018 Merchant Navy、2019 Blue Point、2020 Hello Youmzain、2021 Dream Of Dreams、2022 Naval Crown、2023 Khaadem、2024 Khaadem、2026 Almeraq
- TJスミスステークス（16）：2005 Shamekha、2006 Red Oog、2007 Bentley Biscuit、2008 Apache Cat、2010 Melito、2012 Master Of Design、2014 Lankan Rupee、2015 Chautauqua、2016 Chautauqua、2017 Chautauqua、2018 Trapeze Artist、2019 Santa Ana Lane、2023 I Wish I Win、2024 Chain of Lightning、2025 Briasa、2026 Joliestar
- ヴォスバーグステークス（15）：2004 Pico Central、2005 Taste Of Paradise、2007 Fabulous Strike、2008 Black Seventeen、2009 Kodiak Kowboy、2010 Girolamo、2011 Giant Ryan、2012 The Lumber Guy、2013 Private Zone、2014 Private Zone、2015 Rock Fall、2016 Joking、2017 Takaful、2018 Imperial Hint、2019 Imperial Hint
- フォアゴーステークス（15）：2003 Aldebaran、2004 Midas Eyes、2005 Mass Media、2006 Pomeroy、2008 First Defence、2010 Here Comes Ben、2011 Jackson Bend、2012 Emcee、2013 Strapping Groom、2014 Palace、2015 Private Zone、2021 Yaupon、2023 Gunite、2024 Mullikin、2025 Book'em Danno
- ブリーダーズカップターフスプリント（13）：2012 Mizdirection、2013 Mizdirection、2014 Bobby's Kitten、2015 Mongolian Saturday、2016 Obviously、2017 Stormy Liberal、2018 Stormy Liberal、2019 Belvoir Bay、2021 Golden Pal、2022 Caravel、2023 Nobals、2024 Starlust、2025 Shisospicy
- モルニ賞（12）：2015 Shalaa、2016 Lady Aurelia、2017 Unfortunately、2018 Pretty Pollyanna、2019 Earthlight、2020 Campanelle、2021 Perfect Power、2022 Blackbeard、2023 Vandeek、2024 Whistlejacket、2025 Venetian Sun、2026 Senorita Bonita
- ブルーグラスステークス（12）：1999 Menifee、2000 High Yield、2001 Millennium Wind、2002 Harlan's Holiday、2003 Peace Rules、2004 The Cliff's Edge、2005 Bandini、2015 Carpe Diem、2016 Brody's Cause、2017 Irap、2019 Vekoma、2026 Further Ado
- ブルーダイヤモンドステークス（12）：2015 Pride Of Dubai、2016 Extreme Choice、2017 Catchy、2018 Written By、2019 Lyre、2020 Tagaloa、2021 Artorius、2022 Daumier、2023 Little Brose、2024 Hayasugi、2025 Devil Night、2026 Streisand
- ニューマーケットハンデキャップ（12）：2015 Brazen Beau、2016 The Quarterback、2017 Redkirk Warrior、2018 Redkirk、2019 Sunlight、2020 Bivouac、2021 Zoutori、2022 Roch 'n' Horse、2023 In Secret、2024 Cylinder、2025 Joliestar、2026 Caballus
- ウッドメモリアルステークス（12）：2002 Buddha、2005 Bellamy Road、2006 Bob And John、2007 Nobiz Like Shobiz、2008 Tale Of Ekati、2009 I Want Revenge、2010 Eskendereya、2011 Toby's Corner、2012 Gemologist、2013 Verrazano、2014 Wicked Strong、2016 Outwork
- セクレタリアトステークス（12）：2001 Startac、2002 Chiselling、2005 Gun Salute、2006 Showing Up、2007 Shamdinan、2008 Winchester、2009 Take The Points、2010 Paddy O'Prado、2012 Bayrir、2013 Admiral Kitten、2017 Oscar Performance、2018 Carrick
- ランドウィックギニー（11）：2014 Dissident、2015 Hallowed Crown、2016 Le Romain、2017 Inference、2018 Kementari、2019 The Autumn Sun、2020 Shadow Hero、2021 Lion's Roar、2022 Converge、2023 Communist、2025 Linebacker
- コーチングクラブアメリカンオークス（11）：2010 Devil May Care、2011 It's Tricky、2012 Questing、2015 Curalina、2019 Guarana、2020 Paris Lights、2021 Maracuja、2022 Nest、2023 Wet Paint、2025 Scottish Lassie、2026 Counting Stars
- スプリントカップ（11）：2015 Twilight Son、2016 Quiet Reflection、2018 The Tin Man、2019 Hello Youmzain、2020 Dream Of Dreams、2021 Emaraaty Ana、2022 Minzaal、2023 Regional、2024 Montassib、2025 Big Mojo、2026 Almeraq
- ロワイヤリュー賞（11）：2015 Candarliya、2016 The Juliet Rose、2017 The Juliet Rose、2018 Princess Yaiza、2020 Wonderful Tonight、2021 Loving Dream、2022 Sea La Rosa、2023 Sea Silk Road、2024 Grateful、2025 Consent、2026 Fairy Glen
- E.P.テイラーステークス（11）：2015 Curvy、2016 Al's Gal、2017 Blond Me、2018 Sheikha Reika、2019 Starship Jubilee、2020 Etoile、2021 Mutamakina、2023 Fev Rover、2024 Full Count Felicia、2025 She Feels Pretty、2026 Gimme A Nother
- シドニーカップ（11）：2015 Grand Marshal、2017 Polarisation、2018 Who Shot Thebarman、2019 Shraaoh、2020 Etah James、2021 Selino、2022 Knights Order、2023 Explosive Jack、2024 Circle of Fire、2025 Arapaho、2026 Changingoftheguard
- オーストラリアンオークス（11）：2015 Gust of Wind、2016 Sofia Rosa、2017 Bonneval、2018 Unforgotten、2020 Colette、2021 Hungry Heart、2022 El Patroness、2023 Pennyweka、2024 Autumn Angel、2025 Treasurethe Moment、2026 Ohope Wins
- ヴィクトリアダービー（11）：2015 Tarzino、2016 Prized Icon、2017 Ace High、2018 Extra Brut、2019 Warning、2020 Johnny Get Angry、2021 Hitotsu、2022 Manzoice、2023 Riff Rocket、2024 Goldrush Guru、2025 Observer
- チャンピオンズ＆チャターカップ（10）：1995 Survey King、1996 Privilege、2000 Housemaster、2002 Cheers Hong Kong、2008 Packing Winner、2010 Mr Medici、2011 Mighty High、2012 Liberator、2015 Helene Super Star、2021 Panfield
- ファルマスステークス（10）：2015 Amazing Maria、2016 Alice Springs、2017 Roly Poly、2019 Veracious、2020 Nazeef、2021 Snow Lantern、2022 Prosperous Voyage、2024 Porta Fortuna、2025 Cinderella's Dream、2026 Blue Bolt
- ブリティッシュチャンピオンズスプリントステークス（10）：2016 The Tin Man、2017 Librisa Breeze、2018 Sands Of Mali、2019 Donjuan Triumphant、2020 Glen Shiel、2021 Creative Force、2023 Art Power、2024 Kind Of Blue、2025 Powerful Glory、2026 Almeraq
- オーストラリアンカップ（10）：2015 Spillway、2016 Preferment、2017 Humidor、2018 Harlem、2019 Harlem、2020 Fifty Stars、2021 Homesman、2022 Duais、2025 Deny Knowledge、2026 Pride of Jenni
- コーフィールドギニー（10）：2015 Press Statement、2016 Divine Prophet、2017 Mighty Boss、2018 The Autumn Sun、2019 Super Seth、2020 Ole Kirk、2022 Golden Mile、2023 Griff、2024 Private Life、2025 Autumn Boy
- チェアマンズスプリントプライズ（9）：2002 Charming City、2003 Grand Delight、2009 Dim Sum、2011 Dim Sum、2012 Joy And Fun、2016 Chautauqua、2017 Lucky Bubbles、2018 Ivictory、2024 Invincible Sage
- コモンウェルスカップ（9）：2016 Quiet Reflection、2017 Caravaggio、2018 Eqtidaar、2020 Golden Horde、2021 Dragon Symbol、2022 Perfect Power、2024 Inisherin、2025 Time For Sandals、2026 Venetian Sun
- チェヴァリーパークステークス（9）：2015 Lumiere、2016 Brave Anna、2017 Clemmie、2018 Fairyland、2019 Millisle、2021 Tenebrism、2022 Lezoo、2023 Porta Fortuna、2026 Sun Goddess
- ミドルパークステークス（9）：2015 Shalaa、2016 The Last Lion、2019 Earthlight、2020 Supremacy、2021 Perfect Power、2022 Blackbeard、2023 Vandeek、2025 Wise Approach、2026 Orthodox
- ジャンプラ賞（9）：2015 Territories、2016 Zelzal、2018 Intellogent、2021 Laws Of Indices、2022 Tenebrism、2023 Good Guess、2024 Puchkine、2025 Woodshauna、2026 Thesecretadversary
- サンタアニタダービー（9）：2015 Dortmund、2017 Gormley、2019 Roadster、2020 Honor A. P.、2021 Rock Your World、2022 Taiba、2023 Practical Move、2024 Stronghold、2026 So Happy
- ソードダンサーステークス（9）：2017 Sadler's Joy、2018 Glorious Empire、2019 Annals of Time、2020 Channel Maker、2021 Gufo、2022 Gufo、2023 Bolshoi Ballet、2024 Far Bridge、2025 El Cordobes
- スチュワーズカップ（8）：2000 Resfa、2006 Russian Pearl、2010 Fellowship、2016 Giant Treasure、2017 Helene Paragon、2018 Seasons Bloom、2020 Waikuku、2022 Waikuku
- フェニックスステークス（8）：2016 Caravaggio、2017 Sioux Nation、2020 Lucky Vega、2021 Ebro River、2022 Little Big Bear、2023 Bucanero Fuerte、2024 Babouche、2025 Power Blue
- ヴィコンテスヴィジエ賞（8）：2015 Bathyrhon、2019 Called To The Bar、2020 San Huberto、2021 Skazino、2022 Skazino、2023 Sober、2024 Sevenna's Knight、2025 Candelari
- クリテリウムドサンクルー（8）：2015 Robin of Navan、2018 Wonderment、2019 Mkfancy、2020 Gear Up、2021 El Bodegon、2022 Dubai Mile、2024 Tennessee Stud、2025 Pierre Bonnard
- アーカンソーダービー（8）：2018 Magnum Moon、2019 Omaha Beach、2021 Super Stock、2022 Cyberknife、2023 Angel of Empire、2024 Muth、2025 Sandman、2026 Renegade
- アルクオーツスプリント（8）：2016 Buffering、2017 The Right Man、2018 Jungle Cat、2019 Blue Point、2021 Extravagant Kid、2023 Danyah、2025 Believing、2026 Native Approach
- ジ・エベレスト（7）：2017 Redzel、2018 Redzel、2019 Yes Yes Yes、2020 Classique Legend、2022 Giga Kick、2023 Think about it、2024 Bella Nipotina
- シティオブヨークステークス（7）：2015 Fadhayyil、2016 Nemoralia、2017 Talaayeb、2019 Shine So Bright、2020 Safe Voyage、2024 Breege、2025 Never So Brave
- サンチャリオットステークス（7）：2016 Alice Springs、2017 Roly Poly、2020 Nazeef、2021 Saffron Beach、2022 Fonteyn、2024 Tamfana、2026 Blue Bolt
- メイトロンステークス（7）：2016 Alice Springs、2017 Hydrangea、2020 Champers Elysees、2021 No Speak Alexander、2022 Pearls Galore、2024 Porta Fortuna、2026 Blue Bolt
- フライングファイブステークス（7）：2016 Ardhoomey、2017 Caravaggio、2018 Havana Grey、2019 Fairyland、2021 Romantic Proposal、2023 Moss Tucker、2025 Arizona Blaze
- ロートシルト賞（7）：2015 Amazing Maria、2016 Qemah、2017 Roly Poly、2018 With You、2020 Watch Me、2022 Saffron Beach、2026 Blue Bolt
- クリテリウムアンテルナシオナル（7）：2015 Johannes Vermeer、2018 Royal Meeting、2019 Alson、2020 Van Gogh、2022 Proud And Regal、2023 Sunway、2024 Twain
- スピンスターステークス（7）：2015 Got Lucky、2016 I'm a Chatterbox、2017 Romantic Vision、2020 Valiance、2021 Letruska、2025 Gin Gin、2026 Fully Subscribed
- カナディアンインターナショナル（7）：2015 Cannock Chase、2017 Bullards Alley、2018 Desert Encounter、2019 Desert Encounter、2021 Walton Street、2025 Silawi、2026 Arabian Crown
- キングチャールズ3世ステークス（6）：2016 Profitable、2017 Lady Aurelia、2018 Blue Point、2019 Blue Point、2025 American Affair、2026 Mission Central
- プリティーポリーステークス（6）：2015 Diamondsandrubies、2017 Nezwaah、2018 Urban Fox、2021 Thundering Nights、2022 La Petite Coco、2026 Estrange
- ジャンロマネ賞（6）：2015 Odeliz、2017 Ajman Princess、2018 Nonza、2021 Grand Glory、2022 Aristia、2025 Quisisana
- ペンシルベニアダービー（6）：2019 Math Wizard、2021 Hot Rod Charlie、2022 Taiba、2023 Saudi Crown、2025 Baeza、2026 The Puma
- クイーンアンステークス（5）：2018 Accidental Agent、2019 Lord Glitters、2023 Triple Time、2025 Docklands、2026 Ten Bob Tony
- コロネーションステークス（5）：2016 Qemah、2019 Watch Me、2020 Alpine Star、2024 Porta Fortuna、2025 Cercene
- フィリーズマイル（5）：2019 Quadrilateral、2020 Pretty Gorgeous、2022 Commissioning、2023 Ylang Ylang、2026 Musical Times
- ブリティッシュチャンピオンズフィリーズ＆メアズステークス（5）：2016 Journey、2017 Hydrangea、2020 Wonderful Tonight、2021 Eshaada、2023 Poptronic
- タタソールズゴールドカップ（5）：2018 Lancaster Bomber、2021 Helvic Dream、2022 Alenquer、2024 White Birch、2026 Almaqam
- フロリダダービー（5）：2015 Materiality、2018 Audible、2021 Known Agenda、2025 Tappan Street、2026 Commandment
- ウッドバインマイル（5）：2018 Oscar Performance、2019 El Tormenta、2020 Starship Jubilee、2021 Town Cruise、2024 Win For The Money
- センテナリースプリントカップ（4）：2018 D B Pin、2021 Hot King Prawn、2022 Stronger、2024 Victor The Winner
- フューチュリティトロフィー（4）：2015 Marcel、2016 Rivet、2023 Ancient Wisdom、2025 Hawk Mountain
- モイグレアスタッドステークス（4）：2016 Intricately、2018 Skitter Scatter、2020 Shale、2021 Discoveries
- ハスケルステークス（4）：2017 Girvin、2022 Cyberknife、2023 Geaux Rocket Ride、2026 Baby Vino
- クイーンエリザベスステークス（4）：2015 Criterion、2016 Lucia Valentina、2024 Pride of Jenni、2026 Delius
- 香港ゴールドカップ（3）：1989 Gold Belt、1990 Starlight、1991 Starlight
- ロッキンジステークス（3）：2019 Mustashry、2024 Audience、2025 Lead Artist
- ブリティッシュチャンピオンズロングディスタンスカップ（3）：2015 Flying Officer、2016 Sheikhzayedroad、2026 Mount Atlas
- クイーンズシルヴァージュビリーカップ（2）：2017 Helene Paragon、2021 Waikuku
- ブリーダーズカップジュヴェナイルターフスプリント（2）：2024 Magnum Force、2025 Cy Fair
- ブリーダーズカップフィリー＆メアスプリント（2）：2024 Soul of an Angel、2025 Splendora
- クイーンエリザベス2世ステークス（1）：2026 Talk Of New York
- グッドウッドカップ（1）：2023 Quickthorn
- ゴールデンフリースステークス（1）：2019 Innisfree
- ブリーダーズカップジュヴェナイルフィリーズターフ（1）：2025 Balantina

### そのほか（21 件）

| 年 | レース | 記録の1着 | 理由 |
|---|---|---|---|
| 2026 | マイルチャンピオンシップ南部杯 | メイショウハチロー | いまのデータに無い馬で、年齢の条件が決まっていないレース（3+）なので生年が分からない |
| 2014 | セクレタリアトステークス | アデレード | いまのデータの アデレード（2010年生）では年齢 4 で、番組表の年齢の条件（3）に合わない |
| 2026 | モイグレアスタッドステークス | サンダリングオン | いまのデータの サンダリングオン（2023年生）では年齢 3 で、番組表の年齢の条件（2）に合わない |
| 2026 | ランドウィックギニー | シーザアリバイ | いまのデータの シーザアリバイ（2021年生）では年齢 5 で、番組表の年齢の条件（3）に合わない |
| 1999 | ローズヒルギニー | スカイハイツ | いまのデータの スカイハイツ（1994年生）では年齢 5 で、番組表の年齢の条件（3）に合わない |
| 1999 | オーストラリアンダービー | スカイハイツ | いまのデータの スカイハイツ（1994年生）では年齢 5 で、番組表の年齢の条件（3）に合わない |
| 2024 | ランドウィックギニー | セレスティアルレジェンド | いまのデータの セレスティアルレジェンド（2019年生）では年齢 5 で、番組表の年齢の条件（3）に合わない |
| 2025 | 仏1000ギニー | Shes Perfect | 勝ち馬の記録（winners）に別の馬（ザリガナ）がいて、食い違う |
| 2015 | 英セントレジャー | Bondi Beach | 勝ち馬の記録（winners）に別の馬（シンプルヴァーズ）がいて、食い違う |
| 1998 | コーフィールドカップ | Lisa's Game | 勝ち馬の記録（winners）に別の馬（トーファンズメロディ）がいて、食い違う |
| 2006 | 香港ダービー | Hello Pretty | 勝ち馬の記録（winners）に別の馬（ヴィヴァパタカ）がいて、食い違う |
| 2016 | ナショナルステークス | ポストポンド | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2017 | ナショナルステークス | ユリシーズ | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2018 | ナショナルステークス | ロアリングライオン | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2019 | ナショナルステークス | ジャパン | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2020 | ナショナルステークス | ガイヤース | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2021 | ナショナルステークス | ミシュリフ | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2022 | ナショナルステークス | バーイード | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2023 | ナショナルステークス | モスターダフ | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2024 | ナショナルステークス | シティオブトロイ | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |
| 2025 | ナショナルステークス | オンブズマン | 記録の中身はヨークのインターナショナルステークス（出典の URL が york）で、別のレースの結果が混ざっている |

## そろえた名前

| 年 | レース | 記録の書き方 | いまのデータの馬 | そろえ方 |
|---|---|---|---|---|
| 1991 | ローズヒルギニー | (カナ無し) Surfers Paradise | サーファーズパラダイス | 英語の名前と生年 |
| 1990 | チャンピオンズ＆チャターカップ | (カナ無し) Quicken Away | クイッケンアウェイ | 英語の名前と生年 |
| 1991 | エイコーンステークス | (カナ無し) Meadow Star | メドウスター | 英語の名前と生年 |
| 1990 | アラバマステークス | (カナ無し) Go for Wand | ゴーフォーワンド | 英語の名前と生年 |
| 2016 | アーカンソーダービー | クリエイター（2013） | クリエイター | カナ（小さい字の違い） |

## 足したレース×年（レースごとの件数）

帝王賞 32・川崎記念 32・東京大賞典 31・マイルチャンピオンシップ南部杯 31・ジャパンダートダービー 25・JBCクラシック 25・全日本2歳優駿 24・JBCスプリント 24・かしわ記念 22・チャンピオンズ＆チャターカップ 21・メトロポリタンハンデキャップ 18・スチュワーズカップ 15・アラバマステークス 14・JBCレディスクラシック 13・ジョーハーシュターフクラシック 13・エイコーンステークス 10・チェアマンズスプリントプライズ 9・グッドウッドカップ 9・ブリティッシュチャンピオンズロングディスタンスカップ 9・ロッキンジステークス 8・ブルーグラスステークス 8・ハスケルステークス 8・クイーンエリザベスステークス 8・ブラックキャビアライトニング 7・クイーンアンステークス 7・コロネーションステークス 7・クイーンエリザベス2世ジュビリーステークス 7・フィリーズマイル 7・ブリティッシュチャンピオンズフィリーズ＆メアズステークス 7・フューチュリティトロフィー 7・タタソールズゴールドカップ 7・モイグレアスタッドステークス 7・フロリダダービー 7・ホープフルステークス（米） 7・TJスミスステークス 6・クイーンズシルヴァージュビリーカップ 6・コーチングクラブアメリカンオークス 6・キングチャールズ3世ステークス 6・プリティーポリーステークス 6・ジャンロマネ賞 6・ウッドバインマイル 6・セクレタリアトステークス 6・シティオブヨークステークス 5・サンチャリオットステークス 5・メイトロンステークス 5・フライングファイブステークス 5・ロートシルト賞 5・スピンスターステークス 5・ローズヒルギニー 4・ヴィコンテスヴィジエ賞 4・フォアゴーステークス 4・ジャパンダートクラシック 3・羽田盃 3・東京ダービー 3・さきたま杯 3・オーストラリアンダービー 3・コモンウェルスカップ 3・チェヴァリーパークステークス 3・ミドルパークステークス 3・ジャンプラ賞 3・クリテリウムアンテルナシオナル 3・アーカンソーダービー 3・サンタアニタダービー 3・アルクオーツスプリント 3・ウッドメモリアルステークス 3・ペンシルベニアダービー 3・ジ・エベレスト 2・センテナリースプリントカップ 2・ファルマスステークス 2・ブリティッシュチャンピオンズスプリントステークス 2・フェニックスステークス 2・クリテリウムドサンクルー 2・ソードダンサーステークス 2・カナディアンインターナショナル 2・オーストラリアンカップ 2・ブリーダーズカップジュヴェナイルターフ 2・秋華賞 1・JBCマイル 1・英チャンピオンステークス 1・香港ゴールドカップ 1・スプリントカップ 1・ゴールデンフリースステークス 1・ロワイヤリュー賞 1・E.P.テイラーステークス 1・シドニーカップ 1・オーストラリアンオークス 1・コーフィールドギニー 1・ヴォスバーグステークス 1・ブリーダーズカップジュヴェナイルフィリーズターフ 1・ブリーダーズカップターフスプリント 1

道具：数え上げと足す行は scratchpad の add.js（`APPLY=1` で書く）、総合力は plan.js。作り直しの差は diff.js・shown.js で確かめた。
