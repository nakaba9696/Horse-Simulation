# Godot 版の中身（gdcore）

持ち主の決定（2026-10-16）「Godotで作り始めていい」・移り方は「並行で移す」。
JS 版は遊べる見本として残し、遊びの決まり・データ・模擬を Godot 4 に移す。画面と 3D は Godot で作り直す（別の係。`godot/scenes/`・`godot/view/`）。
この文書は中身（`godot/core/`・`godot/data/`・`godot/tests/`・`tools/`）の係が書く。

## 構成
| 場所 | 中身 |
|---|---|
| `godot/core/hs_math.gd`（`HSMath`） | JS（V8）の `Math` と同じ値を返す数学の関数。V8 が使う fdlibm を GDScript に移した（cos・sin・log・exp・cbrt・pow）。`hypot`・`round_js`（Math.round）・`to_fixed`（toFixed）・`imul_u`・ビットの読み書き・`hex`（小数のビットを16進に） |
| `godot/core/hs_rng.gd`（`HSRng`） | 種で固定の乱数（JS の `U.RNG` と同じ mulberry32。同じ種なら同じ列） |
| `godot/core/hs_u.gd`（`HSU`） | `U` の小物（`hash32`＝U.hash・clamp・JS と同じ max/min・物価・走りの速さ・着差・金額・タイムの書式・安定な並べ替え・`or_`＝JS の `||`） |
| `godot/core/hs_data.gd`（`HSData`） | データ（JS の `HS.DATA` と同じ形）。`HSData.d()` で `godot/data/*.json` を全部読む |
| `godot/core/hs_track.gd`（`HSTrack`） | コースの形（`HS.Track`。forRace・fromLayout・make・at・h_at・g_at） |
| `godot/core/hs_horse.gd`（`HSHorse`） | 馬（`HS.Horse`。史実馬から作る・頭数合わせの馬・成長・能力・調教・故障） |
| `godot/core/hs_skills.gd`（`HSSkills`） | 発動する特殊能力（`HS.Skills`） |
| `godot/core/hs_sim.gd`（`HSSim`） | レースの模擬（`HS.Sim`。create・step・finish・操作・折り合い・競り合いの気合・実況） |
| `godot/core/hs_sort.gd`（`HSSort`） | JS（V8）の `Array.prototype.sort` と同じ並べ替え（TimSort）。比べる関数が乱数を引く所（出走の優先順）でも、比べる回数と順が JS と同じ |
| `godot/core/hs_json.gd`（`HSJson`） | セーブの JSON の読み書き。長い桁の小数を正しく読む（JS の JSON.parse と同じ値）。JS 版のセーブを読める |
| `godot/core/hs_world.gd`（`HSWorld`） | 世界（`HS.World`。新しいゲーム・週の流れ prepare_week → cards → finish_week・AI の出走・出走表・結果・調教・暦・市場・表彰・セーブ・古いセーブの直し） |
| `godot/core/hs_races.gd`・`hs_ped.gd` | 週のレース（`HS.Races`）・血統（`HS.Ped`） |
| `godot/core/hs_jockey.gd`・`hs_season.gd`・`hs_eraless.gd`・`hs_special.gd`・`hs_owners.gd`・`hs_trophy.gd`・`hs_hall.gd`・`hs_original.gd`・`hs_edits.gd`・`hs_datafix.gd` | 騎手のゲーム・シーズンと GF（season.js と dream.js）・年代なしと馬の店・スペシャルホース・馬主・トロフィー・殿堂・オリジナルホース・エディット |
| `godot/data/*.json` | `node tools/export_godot.js` が書き出す（生成物。手で直さない） |
| `godot/tests/` | 中身のテスト（`sh godot/tests/run.sh`）と、一致テストの答え（`golden/`） |

名前は JS とそろえる（`HS.Sim` → `HSSim`、項目名 `x`・`lane`・`spurtR` などもそのまま）。JS の関数の名前は GDScript の書き方に合わせて小文字と `_` にした（`S.oriaiStep` → `HSSim.oriai_step`、`S.ctl.up` → `HSSim.ctl_up`）。

## 模擬の呼び方（画面の係へ）
```gdscript
var race := { course = "東京", surface = "芝", dist = 2400.0, ground = "良", year = 2025.0, month = 11.0, week = 4.0, grade = "G1", region = "JRA", age = "3+", weight = "定量" }
var h := HSHorse.from_historic(史実馬のデータ, "id")      # HSData.d().historic の 1 件から
var runners := [{ horse = h, jockey = { name = "…", skill = 80.0 }, weight = 57.0, num = 1.0, frame = 1.0, rider = "P" }, …]
var sim := HSSim.create(race, runners, HSHorse.week_index(2025, 11, 4), HSRng.new(種), { ride = true, frames = true, bond = 0 })
# 0.1 秒ごとに
HSSim.ctl_up(sim)        # しごく（ゲートの中ならスタート）。戻り値 "good"・"ok"・"late"・"fast"
HSSim.ctl_down(sim)      # 引く
HSSim.ctl_whip(sim, "R") # ムチ（持っていない手なら持ち替え）。"ok"・"windmill"・"yore"・"tired"・"swap"
HSSim.ctl_swap(sim)      # ムチの持ち替え
HSSim.ctl_lane(sim, 1)   # 進路を 1 つ外へ（-1 で内へ）
var over := HSSim.step(sim)   # 0.1 秒進める。終われば true
var res := HSSim.finish(sim)  # { results, events, frames, D, straight, lap, winnerTime }
```
- 引数・戻り値・項目の意味は JS の `js/core/racesim.js` と同じ。`rider == "P"` の馬が自分。`opts.ride` のときだけ操作を受け付ける（無ければ騎手の腕で自動に乗る）。`opts.frames` で実況と 0.2 秒ごとの記録（`frames`）を作る。
- 描画で読む値：`sim.t`、`sim.st[i]`（`x`＝スタートからの距離・`lane`＝進路・`v`・`spurting`・`done`・`headUp`・`ears`・`fight`・`r.num`）、`sim.ctl`（`tension`・`gear`・`lane`・`hand`・`whipUntil`・`windmill`・`blockedNow`・`wide`・`kakariNow`・`reinFight`・`lastEv`）、`sim.events`（実況）、`sim.skillFx`（特殊能力の発動）、`sim.track.at(残り)`・`h_at`・`g_at`、`sim.D`・`sim.straight`。
- 3D は JS の race3d と同じく、0.1 秒の刻みのあいだを補間して描けばよい。模擬の結果は描画に左右されない。
- 速さの目安：1 レースを回し切って 0.5 秒ほど（一致テストの 48 本が、指紋を取りながら 22 秒。この container の CPU）。騎乗中は 1 フレームに 0〜1 刻みなので軽い。

## 世界の呼び方（画面の係へ）
```gdscript
HSWorld.new_game({ mode = "jockey", seed = 1, jockeyName = "…", region = "美浦" })  # または HSWorld.load_save(JSON の文字)
var G = HSWorld.G                       # JS の G と同じ形（G.player.money・G.horses・G.news …）
HSWorld.market_historic()               # 馬の店 → HSWorld.buy(item)
HSOwners.offers() → HSOwners.accept(raceKey, horseId)   # 馬主の依頼
HSSeason.dc_pending_list() → HSSeason.dc_choose(cat, id) / dc_decline(cat)   # 12月の GF
for r in HSJockey.my_rides():           # 今週自分が乗るレース
	var sim := HSWorld.start_sim(r.card, { ride = true })   # → HSSim.step … → HSSim.finish(sim)
var report := HSWorld.finish_week({ r.card.race.key: 結果 })   # 乗らなかったレースはおまかせで走る
var json := HSWorld.serialize()         # セーブ（JS 版でも読める）
```
- 関数の名前は JS の `W.prepareWeek` → `HSWorld.prepare_week` のように小文字と `_` にした。引数と戻り値は JS と同じ。
- 速さ：1 週を進めるのに、この container で 4〜5 秒（JS は 0.4 秒）。重いのは乗らなかったレースの模擬（1 週に 5〜13 本）。下の「速さ」を参照。

## データの流れ
```
data/*.js（正）→ index.html の並びで読む → fictional.js（騎手の名前を架空に）→ datafix.js（史実馬をまとめる）
  → node tools/export_godot.js → godot/data/<HS.DATA の名前>.json（1件1行）＋ manifest.json（各ファイルの指紋）
```
- 騎手の名前は架空にしたあと。実名 → 架空の対応表は書き出さない。
- Godot の JSON の読み取りは、有効数字の長い小数（14 桁以上）を最後の桁で読み違える。書き出しは 13 桁を越える小数があれば止まる（いまのデータには無い）。
- `manifest.json` の指紋：値を「数はビット（16進）・文字は UTF-8」で並べた SHA-256。Godot のテストが読んだ値で同じ指紋を作って比べる（読み違い・並びの違いがあれば落ちる）。
- データを直したら `node tools/export_godot.js` を回す。`node tests/run.js` が最新かを確かめる（作り直して同じか）。

## 一致テストの仕組み
同じ種・同じ操作で、JS と Godot が同じ結果になることを確かめる（着順・タイムは完全一致。浮動小数の計算の順も JS と同じにしてある）。
1. `node tools/golden_race.js` が JS でレースを回し、答えを `godot/tests/golden/races.json` に書く（48 本：番組から 40・形の違うコース 8。芝・ダート・1000〜3200m・5〜18 頭・4 つの馬場・1965〜2026 年・直線・周回しない・楕円）。
   - 出走馬は作り方で持つ（史実馬の名前と上書きする値・エディットで能力を決めた馬・伝説級・頭数合わせの馬の種）。Godot も同じ作り方で作り、馬の中身の指紋を比べる。
   - 自分で乗る操作：決まった乗り方の打ち手（`tests/ridebot.js` の fit・misfit）と、でたらめに操作する打ち手。呼んだ操作を刻みの番号と一緒に書き留め、Godot は同じ刻みで同じ操作をする（戻り値も比べる）。
   - 比べるもの：10 刻みごとの状態の指紋（全馬の x・lane・v・E と操作の気分・段・進路・高ぶりのビット）、100 刻みごとの全馬の値（ずれたときの手がかり）、ペース、着順・タイム・着差・上がり・残りのスタミナ、勝ちタイムの書式、実況の文と時刻、特殊能力の発動、描画のコマ。
2. `godot/tests/golden/free.json`：フリーレース 6 本（`tools/golden_race.js` が一緒に作る）。
   `godot/tests/golden/math.json`：数学の関数（各 1500 件）・乱数の列・U.hash・並べ替え（TimSort。長さ 1〜1500・比べる関数が乱数を引くもの）の答え。
3. `node tools/golden_world.js` → `godot/tests/golden/world.json`・`world_save.json`：決まった遊び方（店でいちばん安い馬を買う・馬主の最初の依頼を受ける・GF に出る・自分の馬の1レースを決まった乗り方で乗る）で週を進め、毎週のセーブ（G）の指紋・出走表の指紋・依頼・乗ったレースの着順を書く。
   - new：新しいゲームから 4 週。late：JS で 46 週遊んだセーブ（JS のセーブそのもの）を読んで、12月3週から 4 週（GF・年度表彰・年明けの史実馬のデビューをまたぐ）。
   - gf：11月4週のセーブに手を加え（1頭を4歳・前の年の GF（中長距離）の勝ち馬に）、12月1週の招待から年明けまで 7 週。
   - craft：late の続きのセーブに手を加え（週の初めの操作に、重賞の勝ちを足す・馬主の好感度を足す、も使う）（1頭を5歳・能力120・G1を4勝・トロフィー2つ、もう1頭を牝馬に）、JS が読み直したものを Godot も読み、8週。週の初めの操作（予約・引退・オリジナルホースを作る）も同じ列で行う。フェブラリーSにスペシャルホース（G1を5勝した名馬・歴代の勝ち馬）が出て、引退で殿堂入り、オリジナルホースが生まれる。
   - 指紋は、辞書の項目を名前の順に並べ、null の項目を除き、-0 を 0 にした並べ方（JSON に書いて読み直したのと同じ）。
4. `sh godot/tests/run.sh`（headless）が `godot/tests/test_*.gd` を回す。`node tests/run.js` は、Godot があればこれを呼ぶ（無ければ「飛ばした」と出す）。Godot の場所は `GODOT=`・PATH の `godot`・`/home/user/godot-bin/godot` の順に探す。

JS の模擬を直したら：`node tools/golden_race.js` で答えを作り直し、Godot の同じ所も直して `sh godot/tests/run.sh` を緑にする（`node tests/run.js` は、答えが今の JS と違えば落ちる）。

### 一致させるための決まり（GDScript を書くとき）
- 模擬の中で Godot の `sin`・`cos`・`exp`・`log`・`pow` を使わない（OS の数学ライブラリで、JS と最後の桁が 2〜10% の割合で違う。Windows と Linux でも違う）。`HSMath` を使う。
- `maxf`・`minf` ではなく `HSU.mx`・`HSU.mn`（JS の Math.max は +0 と -0 を区別する。`max(0, -0)` は +0）。`round` ではなく `HSMath.round_js`（JS は 0.5 を上へ、-0.5 は -0）。
- 数は小数（float）で持つ（整数どうしの `/` は切り捨てになる）。JSON から読んだ数は小数になる。
- 式の並びを JS と同じにする（`a * b / c` と `a * (b / c)` は最後の桁が違う）。乱数を引く順も同じに（オブジェクトの書き方の順に引いている所がある）。
- 並べ替えは `HSU.stable_sort`（JS の sort は安定。Godot の sort_custom は安定でない）。
- 長い桁の小数を GDScript のコードやテストの入力に書かない（読み違える）。定数はビットの16進で持つ（`HSMath._f("…")`）。
- `class_name` の静的関数と同じ名前の組み込み関数（`hash` など）を作らない（クラスの中から呼ぶと組み込みの方が呼ばれる）。
- テストは標準入力を `/dev/null` にして回す（スクリプトの誤りがあると、Godot は入力待ちで止まる）。
- 比べる関数が乱数を引く並べ替えは `HSSort.sort`（V8 と同じ TimSort）。比べる関数が純粋なら `HSU.stable_sort` でよい。
- JSON の数を Godot の `JSON.parse_string` で読まない（セーブは `HSJson.parse`）。オブジェクトの数の名前（年など）の項目は文字（`HSU.num(year)`）で持つ。
- 静的な変数の初期化でデータを読まない（`HSData.d()` は使うときに。読み込みの途中で呼ぶと止まる）。

## 速さ
- GDScript の模擬は JS（V8）の約 15 倍遅い：1 レース 250ms ほど（18 頭・2400m）、1 週 4〜5 秒。騎乗中（1 フレームに 1 刻み）は軽い。
- 結果を変えない直し（定数の辞書を定数に・0 になりえない所の max/min を組み込みに）で 1 割縮めた。
- 出走表づくり（prepare_week）は、騎手の腕前を出すたびに年の表を並べ替えていたのを一度だけにして 1.8 秒 → 0.6 秒。いま 1 週の内訳は、出走表 0.4〜0.6 秒・レース 1 本 0.3 秒ほど（1 週に 5〜13 本）。測り方は `godot --headless --path godot -s tests/bench_week.gd`。
- 週のレースは互いに独立なので並列に回せる（模擬は数学の作業用の共有の入れ物を持たないようにした。`test_parallel.gd` で、同時に回しても JS と同じ結果を確かめている）。ただ、いまの Godot 4.7.2 の実行ファイルでは、GDScript をスレッドで並べても速くならない（4 スレッドで逆に遅い）。
- 案：（1）週を進める間は進み具合の絵を出す（4〜5 秒）、（2）模擬だけを C++（GDExtension）か C# に移す（同じ一致テストで確かめられる。fdlibm は C のまま使える）。持ち主・配り役の判断待ち。

## JS 版で見つけたこと
- 馬主が誰か（`js/core/owners.js` の `O.ownerOf`）を馬の名前で覚えておく使い回し（`own`）が、その名前を最初に見たときの馬で決まる。遊んでいる間に同じ名前の別の馬（引退した史実馬がまたデビューする・頭数合わせの馬など）を先に見ていると答えが変わるので、セーブを読み直すと、その週の依頼が変わることがある。一致テストは JS もセーブを読み直してから続ける形にした。Godot は新しいゲーム・セーブを読んだときにこの使い回しを空にする（ページを開き直してセーブを読んだ JS と同じ）。
- 古いセーブの直し（`W.migrate`）の `g.shopKeys || …` のように、JS では空の配列も「ある」扱い。GDScript の `not []` は真なので、JS の真偽は `HSU.truthy` で見る。

## Godot の用意（画面の無い container）
- Godot 4.7.2（標準版）を https://github.com/godotengine/godot/releases から取り、`/home/user/godot-bin/godot` に置く（リポジトリに入れない）。
- 中身のテストは headless で動く（GPU は要らない）。先に `--import` で `class_name` の一覧を作る（`run.sh` がやる）。

## 移した範囲
| JS | Godot | 一致テスト |
|---|---|---|
| `js/core/util.js`（U.RNG・hash・clamp・物価・走りの速さ・着差・書式） | `hs_rng.gd`・`hs_u.gd` | ○ 乱数の列・hash |
| V8 の Math（cos・sin・log・exp・cbrt・pow・hypot・round・toFixed・imul） | `hs_math.gd` | ○ 各 1500 件 |
| データ（data/*.js → datafix・fictional のあと） | `godot/data/*.json`・`hs_data.gd` | ○ 全ファイルの指紋 |
| `js/core/track.js` | `hs_track.gd` | ○（レースの中で） |
| `js/core/horse.js` | `hs_horse.gd` | ○ 史実馬・伝説級・頭数合わせの馬・エディットの馬（調教・故障・回復は移したが、まだ一致テストが無い） |
| `js/core/skills.js` | `hs_skills.gd` | ○ |
| `js/core/racesim.js` | `hs_sim.gd` | ○ 48 本 |
| `js/core/races.js`・`world.js`（騎手のゲームの道すじ）・`season.js`・`dream.js`・`eraless.js`・`special.js`・`owners.js`・`jockey.js`・`hall.js`・`trophy.js`・`pedigree.js`・`edits.js`（当てる所） | `hs_races.gd` ほか | ○ 新しいゲームから 4 週・JS のセーブから 4 週（GF・年明け） |
| `original.js`（オリジナルホースを作る）・殿堂入り・予約・スペシャルホースが出てくるレース・トロフィー・冠・馬主の段階とご褒美（思い出の名馬） | 移した | ○ craft の 8 週（勝ち・好感度は週の初めの操作で足す） |
| 12月1週の GF の招待・GF の伝説級（前の年の GF を勝った馬が出ると、キンチェムなどが出てくる） | 移した | ○ gf の 7 週 |
| 馬主の引退した馬のご褒美（年明け） | 移した | まだ（起きる場面を作っていない） |
| `freerace.js`（フリーレース） | `hs_freerace.gd`（`HSFreeRace`） | ○ 6 本（出走表・着順・実況） |
| セーブ（JSON） | `HSJson`・`HSWorld.serialize`・`load_save`・`migrate` | ○ JS のセーブを読んで続きが同じ |
| `world.js` の馬主・生産者のゲームだけの所（種付け・売る・牧場の拡張・海外馬と繁殖牝馬の市場） | まだ | 新しく始められないので後回し |
| `replay.js`（リプレイを縮めて残す）・`edits.js`（書き出し・読み込み） | まだ | 画面の係と相談して |
