# G1上位着順レビュー

対象：`claude/lucid-ptolemy-j204a3`、`733d912cbf43ec9694e674ba27d74d3eb2772349`。確認日：2026-10-22 JST。

**コード・データは変更していない。本書では「内部で確認できた不整合」と「外部の出典確認待ち」を分ける。外部サイト本文を取得できたレースは0件であり、以下の修正案を公式結果で裏取り済みとは扱わない。** 特に、重複や世代違いは判定できても、差し替える馬名・正しい全着順まで確定できない場合は、その旨を書く。

## 確認範囲

- 国内：`data/src/placings_jra.jsonl` 5,308行、1,061レース×年。
- 海外：`data/src/placings_world.jsonl` 15,996行、4,184レース×年。
- CSV：21,304行。元の2ファイルと、レース・年・着順・馬名・出典の多重集合が一致。CSVの行順の違いは誤りとしない。
- 全行について、同一レースの馬名重複、順位と同着の整合、欠落順位、国内着差の積み上げ、JBISのURL日付、ゲーム内の馬の生年との整合を機械照合。候補を個別に確認した。
- 全5,245組のレース名・年は、ゲームの暦の当該年のG1定義に対応した。ただし、同じリポジトリ内の整合確認であり、実際の当時の名称・格・開催条件の正しさを保証しない。

## 優先して確認・修正する不整合

この表の「正しい内容」が「要確認」となっている場合、不整合の存在は確認済みだが正解の馬名や順位は未確定である。元データの着順そのものを当て推量で置換しない。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| ドバイデューティフリー | 2005 | 3・5 | Right Approach が同じレースの2行に別順位で入る | 同一の馬は1つの確定着順だけ。少なくとも片方の馬名・順位・対象年が誤り。正しい差し替え名は未確認 | 内部確認：[元データL637](../../../data/src/placings_world.jsonl#L637)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=UADuFre)）、[元データL639](../../../data/src/placings_world.jsonl#L639) |
| ドバイターフ | 2023 | 1・4 | Lord North が同じレースの2行に別順位で入る | 同一の馬は1つの確定着順だけ。少なくとも片方の馬名・順位・対象年が誤り。正しい差し替え名は未確認 | 内部確認：[元データL700](../../../data/src/placings_world.jsonl#L700)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=UADuFre)）、[元データL703](../../../data/src/placings_world.jsonl#L703) |
| フォレ賞 | 2007 | 2・5 | Welsh Emperor が同じレースの2行に別順位で入る | 同一の馬は1つの確定着順だけ。少なくとも片方の馬名・順位・対象年が誤り。正しい差し替え名は未確認 | 内部確認：[元データL7992](../../../data/src/placings_world.jsonl#L7992)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FR-011)）、[元データL7995](../../../data/src/placings_world.jsonl#L7995) |
| ヴィコンテスヴィジエ賞 | 2016 | 4〜5 | 4着同着が3頭（Walzertakt / Bathyrhon / Kicky Blue）で、その後にMille et Milleが5着 | 現状の4着3頭と5着は両立しない。4着3頭が正しければ次は7着であり1〜5着から外れる。実際に3頭同着だったかを含め原典再確認 | 内部確認：[元データL14324](../../../data/src/placings_world.jsonl#L14324)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FLoViVi)）、[元データL14330](../../../data/src/placings_world.jsonl#L14330) |
| ジャパンカップダート | 2009 | 3 | ゴールデンチケット / inData=true。ゲームの同名馬は2009年生 / Golden Ticket | このゲーム内の同名馬への紐付けを外す（現行データでは inData=false 相当）。実際の出走馬の生年・IDは原典確認後に記録する。元の出走馬名は保持 | 内部確認：[元データL2873](../../../data/src/placings_jra.jsonl#L2873)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20091206/109/11/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| 朝日杯フューチュリティステークス | 2018 | 5 | ディープダイバー / inData=true。ゲームの同名馬は1969年生 / Deep Diver | このゲーム内の同名馬への紐付けを外す（現行データでは inData=false 相当）。実際の出走馬の生年・IDは原典確認後に記録する。元の出走馬名は保持 | 内部確認：[元データL3230](../../../data/src/placings_jra.jsonl#L3230)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20181216/109/11/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| 東京大賞典 | 2009 | 5 | ゴールデンチケット / inData=true。ゲームの同名馬は2009年生 / Golden Ticket | このゲーム内の同名馬への紐付けを外す（現行データでは inData=false 相当）。実際の出走馬の生年・IDは原典確認後に記録する。元の出走馬名は保持 | 内部確認：[元データL3541](../../../data/src/placings_jra.jsonl#L3541)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20091229/220/10/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| マイルチャンピオンシップ南部杯 | 2022 | 2 | ヘリオス / inData=true。ゲームの同名馬は1957年生 / Helios | このゲーム内の同名馬への紐付けを外す（現行データでは inData=false 相当）。実際の出走馬の生年・IDは原典確認後に記録する。元の出走馬名は保持 | 内部確認：[元データL4183](../../../data/src/placings_jra.jsonl#L4183)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20221010/210/12/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| 全日本2歳優駿 | 2008 | 2 | ナサニエル / inData=true。ゲームの同名馬は2008年生 / Nathaniel | このゲーム内の同名馬への紐付けを外す（現行データでは inData=false 相当）。実際の出走馬の生年・IDは原典確認後に記録する。元の出走馬名は保持 | 内部確認：[元データL4238](../../../data/src/placings_jra.jsonl#L4238)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20081217/221/10/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| ジャパンダートダービー | 2009 | 3 | ゴールデンチケット / inData=true。ゲームの同名馬は2009年生 / Golden Ticket | このゲーム内の同名馬への紐付けを外す（現行データでは inData=false 相当）。実際の出走馬の生年・IDは原典確認後に記録する。元の出走馬名は保持 | 内部確認：[元データL4379](../../../data/src/placings_jra.jsonl#L4379)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20090708/220/11/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| JBCスプリント | 2022 | 3 | ヘリオス / inData=true。ゲームの同名馬は1957年生 / Helios | このゲーム内の同名馬への紐付けを外す（現行データでは inData=false 相当）。実際の出走馬の生年・IDは原典確認後に記録する。元の出走馬名は保持 | 内部確認：[元データL4774](../../../data/src/placings_jra.jsonl#L4774)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20221103/210/11/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| ジャパンカップ | 1992 | 5 | ヒシマサル / inData=true。ゲームの同名馬は1955年生 / Hishi Masaru | ゲームの対象は「ヒシマサル（1989）」へ。1955年生の「ヒシマサル」と分ける（表記の史実裏取りは未確認） | 内部確認：[元データL5177](../../../data/src/placings_jra.jsonl#L5177)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/19921129/105/10/)）。ゲームの生年は読み込み済みhistoricデータと照合 |
| ブリーダーズカップフィリー＆メアターフ | 2026 | 1〜3 | Destino d'Oro / Crevalle d'Oro / Movin' on Up の結果が入る | 当該年のゲーム暦は11月。確認日2026-10-22にはまだ将来の競走なので、2026年の確定結果として採用しない。別競走・別年混入を調べる（正しい対応競走は未確認） | 内部確認：[元データL2767](../../../data/src/placings_world.jsonl#L2767)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=USBcFi)）。ゲームの暦の当該年は11月1週 |
| サウジカップ | 2020 | 1〜5 | 1着Maximum Security、2着Midnight Bisou。既存の勝ち馬データはMidnight Bisou | 勝ち馬データとの食い違いを解消する。後日の失格・裁決による確定着順の更新漏れを優先確認し、最新の公式結果がMidnight Bisouを1着としていれば全順位・着差を更新。公式本文未確認のため本書で確定しない | 内部確認：[元データL1528](../../../data/src/placings_world.jsonl#L1528)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2020-02-29/riyadh/566608)）、[勝ち馬データL5193](../../../data/src/winners_world.jsonl#L5193) |

### 同名馬の突合せを誤りと判断した理由

ヒシマサルはゲームに1955年生と1989年生が別名で存在する。1992年の出走馬を1955年生へ結びつけるべきではない。他の4つの名前もゲーム側では海外馬・過去世代で、対象年に生まれたばかり、まだ生まれていない、または数十歳となる組み合わせだった。

これは「史実の出走馬名を変えよ」という意味ではなく、**表示名だけでゲームの能力へ結合してはいけない**という指摘。英字名・生年・国・血統・登録IDなどで識別する必要がある。全馬の生年を公式に確認したという意味ではない。

## 着差・同着の表現で原典確認が必要な14組

以下は全て `marginTo="prev"`。同着の2頭・3頭に正の差が重複して入るか、同着の先頭行に `dh` が入り次の同着行に数値が入る。**単純に前の行から足すと同着馬の累計着差が食い違う。** ただし「前の異なる順位の馬から各同着馬への差」という表現なら同じ正数の併記も可能なため、外部表の転記ミスと一律には断定しない。収録規約・利用側の同着処理と原典を合わせて確認する。

前行から積む形式へ統一するなら、同着グループの最初に前順位との差を1回だけ持たせ、後続の同着行は差0または同着とする。元の値を保持するなら、同着グループへ同じ累計着差を割り当て、二重に加算しない。HKJCの勝ち馬基準の着差はこの表に混ぜていない。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| ドバイデューティフリー | 2005 | 5着同着 | Right Approach：shd / Martillo：shd | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL639](../../../data/src/placings_world.jsonl#L639)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=UADuFre)）、[元データL640](../../../data/src/placings_world.jsonl#L640) |
| ドバイターフ | 2023 | 5着同着 | Panthalassa：nk / Sir Busker：nk | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL704](../../../data/src/placings_world.jsonl#L704)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=UADuFre)）、[元データL705](../../../data/src/placings_world.jsonl#L705) |
| 仏ダービー | 2022 | 5着同着 | Vagalame：dh / Onesto：nk | dhと数値の対応順を原典で再確認。同着の最初の行に前順位との差を持たせる規約なら、現状は順序が逆になる | 内部確認：[元データL6448](../../../data/src/placings_world.jsonl#L6448)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2022-06-05/chantilly/687466)）、[元データL6449](../../../data/src/placings_world.jsonl#L6449) |
| カドラン賞 | 2011 | 3着同着 | Ley Hunter：s.h / Brigantin：s.h | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL7865](../../../data/src/placings_world.jsonl#L7865)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2011-10-02/longchamp/90840)）、[元データL7866](../../../data/src/placings_world.jsonl#L7866) |
| ジャンリュックラガルデール賞 | 2025 | 4着同着 | Imperial Me Cen：dh / Campacite：1 | dhと数値の対応順を原典で再確認。同着の最初の行に前順位との差を持たせる規約なら、現状は順序が逆になる | 内部確認：[元データL8344](../../../data/src/placings_world.jsonl#L8344)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2025-10-05/parislongchamp/883244)）、[元データL8345](../../../data/src/placings_world.jsonl#L8345) |
| ケンタッキーダービー | 2006 | 4着同着 | Brother Derek：9½ / Jazil：9½ | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL8780](../../../data/src/placings_world.jsonl#L8780)。外部未確認（[収録出典](https://en.wikipedia.org/wiki/2006_Kentucky_Derby)）、[元データL8781](../../../data/src/placings_world.jsonl#L8781) |
| ベルモントステークス | 2023 | 4着同着 | Hit Show：¾ / Angel of Empire：1½ | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL9231](../../../data/src/placings_world.jsonl#L9231)。外部未確認（[収録出典](https://en.wikipedia.org/wiki/2023_Belmont_Stakes)）、[元データL9232](../../../data/src/placings_world.jsonl#L9232) |
| アーリントンミリオン | 2012 | 3着同着 | Rahystrada：1½ / Colombian：1½ | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL10215](../../../data/src/placings_world.jsonl#L10215)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=USArM)）、[元データL10216](../../../data/src/placings_world.jsonl#L10216) |
| シンガポール航空国際カップ | 2011 | 3着同着 | Waikato：1 / Irian：1 | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL11495](../../../data/src/placings_world.jsonl#L11495)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=SiSiCup)）、[元データL11496](../../../data/src/placings_world.jsonl#L11496) |
| キングチャールズ3世ステークス | 2025 | 5着同着 | Asfoora：dh / Kerdos：½ | dhと数値の対応順を原典で再確認。同着の最初の行に前順位との差を持たせる規約なら、現状は順序が逆になる | 内部確認：[元データL13095](../../../data/src/placings_world.jsonl#L13095)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2025-06-17/royal-ascot/855901)）、[元データL13096](../../../data/src/placings_world.jsonl#L13096) |
| クイーンエリザベス2世ジュビリーステークス | 2022 | 3着同着 | Campanelle：dh / Artorius：½ | dhと数値の対応順を原典で再確認。同着の最初の行に前順位との差を持たせる規約なら、現状は順序が逆になる | 内部確認：[元データL13279](../../../data/src/placings_world.jsonl#L13279)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2022-06-18/royal-ascot/681150)）、[元データL13280](../../../data/src/placings_world.jsonl#L13280) |
| ファルマスステークス | 2024 | 3着同着 | A Lilac Rolla：dh / Rogue Millennium：hd | dhと数値の対応順を原典で再確認。同着の最初の行に前順位との差を持たせる規約なら、現状は順序が逆になる | 内部確認：[元データL13343](../../../data/src/placings_world.jsonl#L13343)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2024-07-12/newmarket/804346)）、[元データL13344](../../../data/src/placings_world.jsonl#L13344) |
| ヴィコンテスヴィジエ賞 | 2015 | 2着同着 | Mille Et Mille：d.h / Glaring：2.5 | dhと数値の対応順を原典で再確認。同着の最初の行に前順位との差を持たせる規約なら、現状は順序が逆になる | 内部確認：[元データL14322](../../../data/src/placings_world.jsonl#L14322)。外部未確認（[収録出典](https://www.sportinglife.com/racing/results/2015-05-24/longchamp/162023)）、[元データL14323](../../../data/src/placings_world.jsonl#L14323) |
| ヴィコンテスヴィジエ賞 | 2016 | 4着同着 | Walzertakt：4 / Bathyrhon：4 / Kicky Blue：4 | 同着グループの差を1回だけ扱う形へ。正しい数値・元表の列の意味は未確認 | 内部確認：[元データL14327](../../../data/src/placings_world.jsonl#L14327)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FLoViVi)）、[元データL14329](../../../data/src/placings_world.jsonl#L14329) |

2006ケンタッキーダービーの「6½・8½・9½」は勝ち馬基準の累計を前の馬との差として扱っていないかも要確認。ただし数字の並びだけで基準を断定せず、原表の見出しで確かめる。米国の「次の馬との差」を一行ずらす処理は、同着を含むレースでは特に検証が必要。

## 4着が抜けている30組（補充する馬名は未確認）

次は全て収録順位が `[1,2,3,5]` の組。3着までしか取れていない組は誤りに数えず、5着があるのに4着がない組を分けた。**4着行の欠落は内部で確認できるが、5着とされた馬が本当は4着なのか、別の4着馬を落としたのかは未確認。** 元表を見ずに5→4へ詰めない。収集済みが部分結果であると明示して使う選択もある。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| コックスプレート | 2018 | 4（欠落） | 1・2・3・5着を収録。5着行は Rostropovich | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL1648](../../../data/src/placings_world.jsonl#L1648)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=AusCoxPl)） |
| ジャックルマロワ賞 | 1998 | 4（欠落） | 1・2・3・5着を収録。5着行は Waky Nao | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL1882](../../../data/src/placings_world.jsonl#L1882)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FPJleM)） |
| ジャックルマロワ賞 | 2014 | 4（欠落） | 1・2・3・5着を収録。5着行は Red Dubawi | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL1935](../../../data/src/placings_world.jsonl#L1935)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FPJleM)） |
| ムーラン・ド・ロンシャン賞 | 2010 | 4（欠落） | 1・2・3・5着を収録。5着行は Lope de Vega | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL2057](../../../data/src/placings_world.jsonl#L2057)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FPMuLo)） |
| ムーラン・ド・ロンシャン賞 | 2015 | 4（欠落） | 1・2・3・5着を収録。5着行は Wild Chief | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL2075](../../../data/src/placings_world.jsonl#L2075)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FPMuLo)） |
| ムーラン・ド・ロンシャン賞 | 2021 | 4（欠落） | 1・2・3・5着を収録。5着行は Novemba | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL2098](../../../data/src/placings_world.jsonl#L2098)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FPMuLo)） |
| ブリーダーズカップフィリー＆メアターフ | 1999 | 4（欠落） | 1・2・3・5着を収録。5着行は Borgia | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL2665](../../../data/src/placings_world.jsonl#L2665)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=USBcFi)） |
| 英セントレジャー | 2006 | 4（欠落） | 1・2・3・5着を収録。5着行は Tusculum | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL3476](../../../data/src/placings_world.jsonl#L3476)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=EL)） |
| アスコットゴールドカップ | 2011 | 4（欠落） | 1・2・3・5着を収録。5着行は Askar Tau | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL4374](../../../data/src/placings_world.jsonl#L4374)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=EAsGoCup)） |
| コロネーションカップ | 1999 | 4（欠落） | 1・2・3・5着を収録。5着行は Borgia | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL4484](../../../data/src/placings_world.jsonl#L4484)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=ECorCu)） |
| コロネーションカップ | 2008 | 4（欠落） | 1・2・3・5着を収録。5着行は Getaway | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL4513](../../../data/src/placings_world.jsonl#L4513)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=ECorCu)） |
| ヨークシャーオークス | 2005 | 4（欠落） | 1・2・3・5着を収録。5着行は Iota | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL5196](../../../data/src/placings_world.jsonl#L5196)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=EYoOaks)） |
| 仏オークス | 2010 | 4（欠落） | 1・2・3・5着を収録。5着行は Zagora | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL6533](../../../data/src/placings_world.jsonl#L6533)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FO)） |
| パリ大賞 | 1996 | 4（欠落） | 1・2・3・5着を収録。5着行は Blackwater II | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL6632](../../../data/src/placings_world.jsonl#L6632)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FLoPrPar)） |
| ガネー賞 | 2007 | 4（欠落） | 1・2・3・5着を収録。5着行は Egerton | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL6795](../../../data/src/placings_world.jsonl#L6795)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FR-014)） |
| イスパーン賞 | 2014 | 4（欠落） | 1・2・3・5着を収録。5着行は Neatico | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL6954](../../../data/src/placings_world.jsonl#L6954)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FR-018)） |
| サンクルー大賞 | 1994 | 4（欠落） | 1・2・3・5着を収録。5着行は Kornado | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL7028](../../../data/src/placings_world.jsonl#L7028)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FSCl)） |
| サンクルー大賞 | 1999 | 4（欠落） | 1・2・3・5着を収録。5着行は Borgia | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL7044](../../../data/src/placings_world.jsonl#L7044)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FSCl)） |
| サンクルー大賞 | 2008 | 4（欠落） | 1・2・3・5着を収録。5着行は Getaway | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL7072](../../../data/src/placings_world.jsonl#L7072)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FSCl)） |
| アベイドロンシャン賞 | 2002 | 4（欠落） | 1・2・3・5着を収録。5着行は Agnetha | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL7330](../../../data/src/placings_world.jsonl#L7330)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FR-008)） |
| モーリスドゲスト賞 | 2000 | 4（欠落） | 1・2・3・5着を収録。5着行は Tertullian | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL7448](../../../data/src/placings_world.jsonl#L7448)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FR-024)） |
| オペラ賞 | 2011 | 4（欠落） | 1・2・3・5着を収録。5着行は Djumama | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL7587](../../../data/src/placings_world.jsonl#L7587)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=FOpera)） |
| ドイツダービー | 2011 | 4（欠落） | 1・2・3・5着を収録。5着行は Brown Panther | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL8419](../../../data/src/placings_world.jsonl#L8419)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=DD)） |
| ベルリン大賞 | 1996 | 4（欠落） | 1・2・3・5着を収録。5着行は Phantom Gold | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL8604](../../../data/src/placings_world.jsonl#L8604)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=DDuGB)） |
| ブリーダーズカップスプリント | 2003 | 4（欠落） | 1・2・3・5着を収録。5着行は Yankee Gentleman | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL10310](../../../data/src/placings_world.jsonl#L10310)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=USBcSpri)） |
| コーフィールドカップ | 2011 | 4（欠落） | 1・2・3・5着を収録。5着行は Lucas Cranach | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL11081](../../../data/src/placings_world.jsonl#L11081)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=AuCaCauC)） |
| コーフィールドカップ | 2014 | 4（欠落） | 1・2・3・5着を収録。5着行は Araldo | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL11091](../../../data/src/placings_world.jsonl#L11091)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=AuCaCauC)） |
| キングチャールズ3世ステークス | 2015 | 4（欠落） | 1・2・3・5着を収録。5着行は Sole Power | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL13047](../../../data/src/placings_world.jsonl#L13047)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=EAsKiStS)） |
| クイーンエリザベス2世ジュビリーステークス | 2010 | 4（欠落） | 1・2・3・5着を収録。5着行は Amico Fritz | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL13232](../../../data/src/placings_world.jsonl#L13232)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=EAsGolJu)） |
| オーストラリアンカップ | 2016 | 4（欠落） | 1・2・3・5着を収録。5着行は Our Ivanhowe | 4着の馬・確定順位を出典で確認して補充、または部分結果と明示。正解の馬名は未確認 | 内部確認：[元データL15204](../../../data/src/placings_world.jsonl#L15204)。外部未確認（[収録出典](http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=AuFlCup)） |

## 国内の大差の数値化（計算ミスとは別の注意）

国内の `behind` が数値の4,214行のうち9行は、原文の `タイサ` を10として積んでいる。残り4,205行が既知の数値から直接検算できた行である。文字列 `margin` はタイサを保持しているため表示は区別されるが、数値だけをレース水準の計算へ入れると正確な10馬身と近似値を区別できない。**9行の計算が算術的に誤っているという指摘ではなく、換算の仮定を保存・明記する提案。**

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| 川崎記念 | 2019 | 5着以降 | marginPrev=タイサ、behind=14.2。タイサ部分を10として計算 | タイサの原文は保持。数値を使うなら「10と置いた近似」と明記し、厳密な勝ち馬との差と区別する。正確な馬身数は未確認 | 内部確認：[元データL3901](../../../data/src/placings_jra.jsonl#L3901)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20190130/221/11/)） |
| マイルチャンピオンシップ南部杯 | 2023 | 2着以降 | marginPrev=タイサ、behind=10.0。タイサ部分を10として計算 | タイサの原文は保持。数値を使うなら「10と置いた近似」と明記し、厳密な勝ち馬との差と区別する。正確な馬身数は未確認 | 内部確認：[元データL4188](../../../data/src/placings_jra.jsonl#L4188)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20231009/210/12/)） |
| JBCクラシック | 2011 | 4着以降 | marginPrev=タイサ、behind=14.5。タイサ部分を10として計算 | タイサの原文は保持。数値を使うなら「10と置いた近似」と明記し、厳密な勝ち馬との差と区別する。正確な馬身数は未確認 | 内部確認：[元データL4615](../../../data/src/placings_jra.jsonl#L4615)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20111103/220/11/)） |
| JBCクラシック | 2013 | 4着以降 | marginPrev=タイサ、behind=12.1。タイサ部分を10として計算 | タイサの原文は保持。数値を使うなら「10と置いた近似」と明記し、厳密な勝ち馬との差と区別する。正確な馬身数は未確認 | 内部確認：[元データL4635](../../../data/src/placings_jra.jsonl#L4635)。外部未確認（[収録出典](https://www.jbis.or.jp/race/result/20131104/222/10/)） |

## 海外の馬名突合せの候補（未確認、採用保留）

以下は英字の大文字小文字・アクセント等を正規化し、ゲームの馬名・生年・当該年の年齢条件で拾った候補。**同名の別馬を排除する外部照合が済むまで `inData=true` にしない。** 年齢の不一致があるSahlan、英セントレジャーのTower Of Londonなどは、名前だけで既存馬へ結びつける候補から除外した。

| レース | 年 | 着順 | いまの内容 | 正しい内容 | 出典（URL か「未確認」） |
|---|---|---|---|---|---|
| 仏1000ギニー | 2013 | 1 | Flotilla、馬欄空・ゲームにいる空欄 | 対応候補：フロティラ（2010年生）。登録情報で同一個体と確認できた場合にだけ紐付け | 未確認（[収録出典](https://www.sportinglife.com/racing/results/2013-05-12/longchamp/120000)）。[元データL6264](../../../data/src/placings_world.jsonl#L6264) |
| 仏オークス | 2011 | 2 | Galikova、馬欄空・ゲームにいる空欄 | 対応候補：ガリコヴァ（2008年生）。登録情報で同一個体と確認できた場合にだけ紐付け | 未確認（[収録出典](https://www.sportinglife.com/racing/results/2011-06-12/chantilly/85058)）。[元データL6535](../../../data/src/placings_world.jsonl#L6535) |
| パリ大賞 | 2011 | 1 | Meandre、馬欄空・ゲームにいる空欄 | 対応候補：メアンドル（2008年生）。登録情報で同一個体と確認できた場合にだけ紐付け | 未確認（[収録出典](https://www.sportinglife.com/racing/results/2011-07-14/longchamp/86868)）。[元データL6676](../../../data/src/placings_world.jsonl#L6676) |
| ヴェルメイユ賞 | 2011 | 1 | Galikova、馬欄空・ゲームにいる空欄 | 対応候補：ガリコヴァ（2008年生）。登録情報で同一個体と確認できた場合にだけ紐付け | 未確認（[収録出典](https://www.sportinglife.com/racing/results/2011-09-11/longchamp/89917)）。[元データL7217](../../../data/src/placings_world.jsonl#L7217) |
| マルセルブサック賞 | 2010 | 5 | Galikova、馬欄空・ゲームにいる空欄 | 対応候補：ガリコヴァ（2008年生）。登録情報で同一個体と確認できた場合にだけ紐付け | 未確認（[収録出典](https://www.sportinglife.com/racing/results/2010-10-03/longchamp/74220)）。[元データL8149](../../../data/src/placings_world.jsonl#L8149) |
| マルセルブサック賞 | 2012 | 4 | Flotilla、馬欄空・ゲームにいる空欄 | 対応候補：フロティラ（2010年生）。登録情報で同一個体と確認できた場合にだけ紐付け | 未確認（[収録出典](https://www.sportinglife.com/racing/results/2012-10-07/longchamp/109438)）。[元データL8158](../../../data/src/placings_world.jsonl#L8158) |

## カナ未確定の20頭について

既存の注のとおり、20頭・21行（Blizzardが2行）を確認した。次はカナ表記の外部裏付けを取得できておらず、今回は採用するカナを確定しない。既に「未確認」とされているものを、新しい誤りの件数には加えない。

- Blizzard：2018年高松宮記念 5着（[元データL265](../../../data/src/placings_jra.jsonl#L265)）、2017年スプリンターズステークス 5着（[元データL1850](../../../data/src/placings_jra.jsonl#L1850)）。カナ・同一性は未確認。
- Victor the Winner：2024年高松宮記念 3着（[元データL293](../../../data/src/placings_jra.jsonl#L293)）。カナ・同一性は未確認。
- Allied Forces：1998年安田記念 5着（[元データL1435](../../../data/src/placings_jra.jsonl#L1435)）。カナ・同一性は未確認。
- Joyful Winner：2006年安田記念 3着（[元データL1473](../../../data/src/placings_jra.jsonl#L1473)）。カナ・同一性は未確認。
- armada：2008年安田記念 2着（[元データL1482](../../../data/src/placings_jra.jsonl#L1482)）。カナ・同一性は未確認。
- Cape of Good Hope：2004年スプリンターズステークス 3着（[元データL1783](../../../data/src/placings_jra.jsonl#L1783)）。カナ・同一性は未確認。
- Tigertail：2003年エリザベス女王杯 3着（[元データL2403](../../../data/src/placings_jra.jsonl#L2403)）。カナ・同一性は未確認。
- Caitano：1997年ジャパンカップ 4着（[元データL2684](../../../data/src/placings_jra.jsonl#L2684)）。カナ・同一性は未確認。
- Ela Athena：2000年ジャパンカップ 4着（[元データL2699](../../../data/src/placings_jra.jsonl#L2699)）。カナ・同一性は未確認。
- Sarafan：2002年ジャパンカップ 2着（[元データL2707](../../../data/src/placings_jra.jsonl#L2707)）。カナ・同一性は未確認。
- Policy Maker：2004年ジャパンカップ 4着（[元データL2719](../../../data/src/placings_jra.jsonl#L2719)）。カナ・同一性は未確認。
- Idaho：2017年ジャパンカップ 5着（[元データL2785](../../../data/src/placings_jra.jsonl#L2785)）。カナ・同一性は未確認。
- Lord Sterling：2000年ジャパンカップダート 3着（[元データL2828](../../../data/src/placings_jra.jsonl#L2828)）。カナ・同一性は未確認。
- Party Maker：2014年全日本2歳優駿 5着（[元データL4271](../../../data/src/placings_jra.jsonl#L4271)）。カナ・同一性は未確認。
- Lotus Pool：1993年安田記念 5着（[元データL4942](../../../data/src/placings_jra.jsonl#L4942)）。カナ・同一性は未確認。
- Shaftesbury Avenue：1991年ジャパンカップ 3着（[元データL5170](../../../data/src/placings_jra.jsonl#L5170)）。カナ・同一性は未確認。
- Rough Habit：1991年ジャパンカップ 5着（[元データL5172](../../../data/src/placings_jra.jsonl#L5172)）。カナ・同一性は未確認。
- Naturalism：1992年ジャパンカップ 2着（[元データL5174](../../../data/src/placings_jra.jsonl#L5174)）。カナ・同一性は未確認。
- Dear Doctor：1992年ジャパンカップ 3着（[元データL5175](../../../data/src/placings_jra.jsonl#L5175)）。カナ・同一性は未確認。
- Sandpit：1994年ジャパンカップ 5着（[元データL5187](../../../data/src/placings_jra.jsonl#L5187)）。カナ・同一性は未確認。

## 誤りに数えなかったもの・確認できた点

- 国内の同着9組は、順位の飛ばし方を含めて内部矛盾を検出しなかった。5着同着で6行になる有馬記念2020・天皇賞春1994・川崎記念1995は「1〜5着」なので余計な行ではない。
- 国内の勝ち馬との差 `behind` が数値である4,214行のうち、既知の数値・ハナ・アタマ・クビから検算できた4,205行は積み上げ結果と一致。残る9行はタイサを含む近似（「国内の大差の数値化」参照）。クビ0.3・アタマ0.2・ハナ0.1という**データ内の換算**での整合を確認したもので、公式の厳密な長さの保証ではない。本検査では `タイサ`・`*****` を既知の数値に含めず、別扱いにした。
- 指定の降着6レースは2着以下の24行が空欄になっていた。これを欠落・計算違いと扱わない。2010年オークスの1着2頭も保持する。
- JBIS出典URLの日付年と行の年に不一致はなく、国内行のURL日付は全て2026-10-18以前だった。
- HKJCの勝ち馬との差（1,283行）と、海外の前の馬との差（9,670行）は分離して確認した。勝ち馬基準の同着で同じ差が並ぶのは正常。
- 国内の勝ち馬は、別収録の勝ち馬データと同じレース名・年で比較できた788行に不一致なし。海外のカナ表記差は同一個体の別表記が多く、英字・世代を見ずに全件誤りとしない。2020サウジカップは別途掲載した。
- 古い海外年の3着まで、未取得と説明済みの競走、数値がない着差だけを理由に「写し間違い」とは判定していない。1〜5着がない年・競走からレース水準を出す際は、標本数と未取得状態も残したい。

## 外部確認の制約・次に確認する原典

このセッションにWeb検索ツールは提供されていない。managed環境の通信設定はpackage_managersの許可先が中心で、JRA・JBIS・Wikipedia・Sporting Life・HKJC・galopp-siegerを許可した状態とは確認できなかった。実際に次へ接続し、いずれも403で拒否された。認証画面や原文を読めたという意味ではない。

- JBISの実レース結果： https://www.jbis.or.jp/race/result/19970216/105/11/
- Wikipediaの年別結果： https://en.wikipedia.org/wiki/2023_Belmont_Stakes
- Sporting Lifeの2020サウジカップ： https://www.sportinglife.com/racing/results/2020-02-29/riyadh/566608
- HKJC： https://racing.hkjc.com/
- galopp-siegerのドバイターフ系統： http://www.galopp-sieger.de/galoppsieger/sieger?rennkz=UADuFre

原典にアクセスできる環境では、重複3組、2026BCフィリー＆メアターフの対象年、2020サウジカップの最新裁決、8行の別世代紐付け、同着14組を優先する。特に重複や順位矛盾を解消する前に、これらを「倒した相手」の強さの計算へ入れないことを提案する。

入力を変更しない読み取りスクリプトで検査し、本書の追加だけをコミットする。ゲームのコード・元データ・CSVには変更しないため、ゲーム全体テストは再実行していない。

## 全体の所見（5行）

1. 国内の数値着差の積み上げは整合し、同着や指定の降着空欄を一律に誤りとする必要はない。
2. 同名馬の世代違い8行はレース水準を歪めるため、馬名だけでゲーム内の馬へ結合する処理を避けたい。
3. 海外の重複・順位矛盾・将来年の結果らしき行は、対象年と原典の表構造を最優先で再確認する。
4. 海外の同着は着差の基準とグループを保持し、前行との差の単純積算や、欠落順位の自動詰めをしない。
5. 正しい差し替え馬名・カナ・確定着順の外部裏付けは未完了であり、内部指摘と採用保留の候補を分けて扱う。
