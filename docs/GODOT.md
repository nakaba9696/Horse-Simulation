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
2. `godot/tests/golden/math.json`：数学の関数（各 1500 件）・乱数の列・U.hash の答え。
3. `sh godot/tests/run.sh`（headless）が `godot/tests/test_*.gd` を回す。`node tests/run.js` は、Godot があればこれを呼ぶ（無ければ「飛ばした」と出す）。Godot の場所は `GODOT=`・PATH の `godot`・`/home/user/godot-bin/godot` の順に探す。

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
| `js/core/races.js`・`world.js`・`season.js`・`eraless.js`・`special.js`・`owners.js`・`jockey.js`・`hall.js`・`trophy.js`・`original.js`・セーブ | まだ | 次の段 |
| `js/core/pedigree.js`・`dream.js`・`replay.js`・`freerace.js`・`edits.js` | まだ | |
