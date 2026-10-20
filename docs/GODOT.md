# Godot 版の中身（gdcore）

持ち主の決定（2026-10-16）「Godotで作り始めていい」・移り方は「並行で移す」。
JS 版は遊べる見本として残し、遊びの決まり・データ・模擬を Godot 4 に移す。画面と 3D は Godot で作り直す（別の係。`godot/scenes/`・`godot/view/`）。
この文書は中身（`godot/core/`・`godot/native/`・`godot/data/`・`godot/tests/`・`tools/`）の係が書く。
レースの模擬は C++（GDExtension。`godot/native/`）で回す（持ち主の決定 2026-10-17「すぐ C++ に移す」）。GDScript の模擬は C++ が読めないときの代わりと、一致の確かめに残す。

## 構成
| 場所 | 中身 |
|---|---|
| `godot/core/hs_math.gd`（`HSMath`） | JS（V8）の `Math` と同じ値を返す数学の関数。V8 が使う fdlibm を GDScript に移した（cos・sin・log・exp・cbrt・pow）。`hypot`・`round_js`（Math.round）・`to_fixed`（toFixed）・`imul_u`・ビットの読み書き・`hex`（小数のビットを16進に） |
| `godot/core/hs_rng.gd`（`HSRng`） | 種で固定の乱数（JS の `U.RNG` と同じ mulberry32。同じ種なら同じ列） |
| `godot/core/hs_u.gd`（`HSU`） | `U` の小物（`hash32`＝U.hash・clamp・JS と同じ max/min・物価・走りの速さ・着差・金額・タイムの書式・安定な並べ替え・`or_`＝JS の `||`） |
| `godot/core/hs_data.gd`（`HSData`） | データ（JS の `HS.DATA` と同じ形）。`HSData.d()` で `godot/data/*.json` を全部読む |
| `godot/core/hs_track.gd`（`HSTrack`） | コースの形（`HS.Track`。forRace・fromLayout・make・at・h_at・g_at） |
| `godot/core/hs_horse.gd`（`HSHorse`） | 馬（`HS.Horse`。史実馬から作る・頭数合わせの馬・成長・能力・調教） |
| `godot/core/hs_fatigue.gd`（`HSFatigue`） | 疲労（`HS.Fatigue`。レースでたまる量・毎週の回復・段階・移動の疲れ・連闘で別の国へ行けない。故障は無い。段階ごとの強さの下げは `hs_sim.gd` の `FATIGUE` と C++ の `hs_horse.cpp`） |
| `godot/core/hs_skills.gd`（`HSSkills`） | 発動する特殊能力（`HS.Skills`） |
| `godot/core/hs_sim.gd`（`HSSim`） | レースの模擬（`HS.Sim`。create・step・finish・操作・折り合い・競り合いの気合・実況）。C++ が読めれば C++ に渡す窓口（切り替えはこのファイルの `use_native` の 1 か所） |
| `godot/native/`（`HSNativeSim`） | C++ の模擬（GDExtension）。`src/hs_math.cpp`（fdlibm）・`hs_rng.h`・`hs_track.cpp`・`hs_horse.cpp`（能力・強さ）・`hs_skills.cpp`・`hs_sim.cpp`（create・step・finish・操作・実況）・`hs_godot.cpp`（Godot に見せる窓口）。下の「C++ の模擬」 |
| `godot/core/hs_sort.gd`（`HSSort`） | JS（V8）の `Array.prototype.sort` と同じ並べ替え（TimSort）。比べる関数が乱数を引く所（出走の優先順）でも、比べる回数と順が JS と同じ |
| `godot/core/hs_json.gd`（`HSJson`） | セーブの JSON の読み書き。長い桁の小数を正しく読む（JS の JSON.parse と同じ値）。JS 版のセーブを読める |
| `godot/core/hs_world.gd`（`HSWorld`） | 世界（`HS.World`。新しいゲーム・週の流れ prepare_week → cards → finish_week・AI の出走・出走表・結果・調教・暦・市場・表彰・セーブ・古いセーブの直し） |
| `godot/core/hs_races.gd`・`hs_ped.gd`・`hs_program.gd` | 週のレース（`HS.Races`）・血統（`HS.Ped`）・番組表（`HS.Program`。1年先までのレースと出られるか・オープンの予約） |
| `godot/core/hs_rating.gd`（`HSRating`） | レーティング（`HS.Rating`。1走の値を `annotate` でレースの結果に付け、`h.results[].rt` に残す。馬の値＝良かった3走の平均・部門ごと）。式の並びは JS と同じで、世界の進行の一致テストで確かめる |
| `godot/core/hs_jockey.gd`・`hs_season.gd`・`hs_eraless.gd`・`hs_special.gd`・`hs_owners.gd`・`hs_trophy.gd`・`hs_hall.gd`・`hs_original.gd`・`hs_edits.gd`・`hs_datafix.gd` | 騎手のゲーム・シーズンと GF（season.js と dream.js）・年代なしと馬の店・スペシャルホース・馬主・トロフィー・殿堂・オリジナルホース・エディット |
| `godot/data/*.json` | `node tools/export_godot.js` が書き出す（生成物。手で直さない） |
| `godot/tests/` | 中身のテスト（`sh godot/tests/run.sh`）と、一致テストの答え（`golden/`） |

名前は JS とそろえる（`HS.Sim` → `HSSim`、項目名 `x`・`lane`・`spurtR` などもそのまま）。JS の関数の名前は GDScript の書き方に合わせて小文字と `_` にした（`S.oriaiStep` → `HSSim.oriai_step`、`S.ctl.up` → `HSSim.ctl_up`）。

## 模擬の呼び方（画面の係へ）
```gdscript
var race := { course = "東京", surface = "芝", dist = 2400.0, ground = "良", year = 2025.0, month = 11.0, week = 4.0, grade = "G1", region = "JRA", age = "3+", weight = "定量" }
var h := HSHorse.from_historic(史実馬のデータ, "id")      # HSData.d().historic の 1 件から
var runners := [{ horse = h, jockey = { name = "…", skill = 80.0 }, weight = 57.0, num = 1.0, frame = 1.0, rider = "P" }, …]
var sim = HSSim.create(race, runners, HSHorse.week_index(2025, 11, 4), HSRng.new(種), { ride = true, frames = true, bond = 0 })  # 型は付けない（C++ か GDScript のどちらかが返る）
# 0.1 秒ごとに
HSSim.ctl_up(sim, at)    # しごく（ゲートの中ならスタート）。at＝押した時刻（レースの秒。負はゲートの中。省くと sim.t）。戻り値 "good"・"ok"・"late"・"fumble"（早押しで馬が煽った。まだ出ていない）・"fast"
HSSim.ctl_down(sim)      # 引く
HSSim.ctl_whip(sim, "R") # ムチ（持っていない手なら持ち替え）。"ok"・"windmill"・"yore"・"tired"・"swap"
HSSim.ctl_swap(sim)      # ムチの持ち替え
HSSim.ctl_lane(sim, 1)   # 進路を 1 つ外へ（-1 で内へ）。毎秒 3 進路で動き、横に馬がいると止まる（sim.ctl.bumpT・bumpSide）
var over := HSSim.step(sim)   # 0.1 秒進める。終われば true
var res := HSSim.finish(sim)  # { results, events, frames, D, straight, lap, winnerTime }
```
- 引数・戻り値・項目の意味は JS の `js/core/racesim.js` と同じ。`rider == "P"` の馬が自分。`opts.ride` のときだけ操作を受け付ける（無ければ騎手の腕で自動に乗る）。`opts.frames` で実況と 0.2 秒ごとの記録（`frames`）を作る。
- 描画で読む値：`sim.t`、`sim.gateWait`（ゲートで待つ秒。レースの種で決まる。開く `HSSim.GATE.tell` 秒前に前触れの灯をつける）、`sim.st[i]`（`x`＝スタートからの距離・`lane`＝進路・`v`・`spurting`・`done`・`kakari`（掛かり・頭の上げ具合 0〜1。前の名前 `headUp` も読める）・`ears`・`fight`・`r.num`）、`sim.ctl`（`tension`・`gear`・`lane`・`hand`・`whipUntil`・`windmill`・`blockedNow`・`wide`・`kakariNow`・`reinFight`・`bumpT`（横に馬がいて止まった時刻。無ければ null）・`bumpSide`（押した向き ±1）・`lastEv`）、`sim.events`（実況）、`sim.skillFx`（特殊能力の発動）、`sim.track.at(残り)`・`h_at`・`g_at`、`sim.D`・`sim.straight`。
- 3D は JS の race3d と同じく、0.1 秒の刻みのあいだを補間して描けばよい。模擬の結果は描画に左右されない。
- 戻り値は C++ の模擬（`HSNativeSim`）か GDScript の模擬（`HSSim.Sim`）。どちらも同じ名前で値を読めるので、`var sim = …` と型を付けずに持つ（`:=` は型が決まらず誤りになる）。`HSSim.kind_of(sim)` で "native"・"gd"。
- C++ の模擬の馬・操作の値（`sim.st[i]`・`sim.ctl`）は読むだけ。模擬（`sim`）を持っている間だけ使う（模擬を捨てたあとに `sim.st[i]` だけを持ち続けない）。`sim.track` は `at`・`h_at`・`g_at`・`corner_at` と `L`・`straight`・`flat`・`line` などを読める（GDScript の HSTrack と同じ名前）。
- 速さの目安：1 レースを回し切って C++ で 3ms ほど（GDScript は 0.4 秒）。騎乗中は 1 フレームに 0〜1 刻みなので、どちらでも軽い。

## 世界の呼び方（画面の係へ）
```gdscript
HSWorld.new_game({ mode = "jockey", seed = 1, jockeyName = "…", region = "美浦" })  # または HSWorld.load_save(JSON の文字)
var G = HSWorld.G                       # JS の G と同じ形（G.player.money・G.horses・G.news …）
HSWorld.market_historic()               # 馬の店 → HSWorld.buy(item)
HSOwners.offers() → HSOwners.accept(raceKey, horseId)   # 馬主の依頼
HSSeason.dc_pending_list() → HSSeason.dc_choose(cat, id) / dc_decline(cat)   # 12月の GF
for r in HSJockey.my_rides():           # 今週自分が乗るレース
	var sim = HSWorld.start_sim(r.card, { ride = true })   # → HSSim.step … → HSSim.finish(sim)
var report := HSWorld.finish_week({ r.card.race.key: 結果 })   # 乗らなかったレースはおまかせで走る
var json := HSWorld.serialize()         # セーブ（JS 版でも読める）
```
- 関数の名前は JS の `W.prepareWeek` → `HSWorld.prepare_week` のように小文字と `_` にした。引数と戻り値は JS と同じ。
- 速さ：1 週を進めるのに、C++ の模擬で 0.3〜0.45 秒（JS は 0.4〜0.7 秒）。下の「速さ」を参照。

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
1. `node tools/golden_race.js` が JS でレースを回し、答えを `godot/tests/golden/races.json` に書く（54 本：番組から 40・形の違うコース 8・特殊能力を決めて持たせた 6（伝説級の名馬の固有の能力・幻惑逃げ・馬群さばき・追走○・外回し○を必ず通す）。芝・ダート・1000〜3200m・5〜18 頭・4 つの馬場・1965〜2026 年・直線・周回しない・楕円）。
   - 出走馬は作り方で持つ（史実馬の名前と上書きする値・エディットで能力を決めた馬・伝説級・頭数合わせの馬の種）。Godot も同じ作り方で作り、馬の中身の指紋を比べる。
   - 自分で乗る操作：決まった乗り方の打ち手（`tests/ridebot.js` の fit・misfit）と、でたらめに操作する打ち手。呼んだ操作を刻みの番号と一緒に書き留め、Godot は同じ刻みで同じ操作をする（戻り値も比べる）。
   - 比べるもの：10 刻みごとの状態の指紋（全馬の x・lane・v・E と操作の気分・段・進路・高ぶりのビット）、100 刻みごとの全馬の値（ずれたときの手がかり）、ペース、着順・タイム・着差・上がり・残りのスタミナ、勝ちタイムの書式、実況の文と時刻、特殊能力の発動、描画のコマ。
2. `godot/tests/golden/free.json`：フリーレース 6 本（`tools/golden_race.js` が一緒に作る）。
   `godot/tests/golden/math.json`：数学の関数（各 1500 件）・乱数の列・U.hash・並べ替え（TimSort。長さ 1〜1500・比べる関数が乱数を引くもの）の答え。
3. `node tools/golden_world.js` → `godot/tests/golden/world.json`・`world_save.json`：決まった遊び方（店でいちばん安い馬を買う・馬主の最初の依頼を受ける・GF に出る・自分の馬の1レースを決まった乗り方で乗る）で週を進め、毎週のセーブ（G）の指紋・出走表の指紋・依頼・乗ったレースの着順を書く。
   - new：新しいゲームから 4 週。late：JS で 46 週遊んだセーブ（JS のセーブそのもの）を読んで、12月3週から 4 週（GF・年度表彰・年明けの史実馬のデビューをまたぐ）。
   - gf：11月4週のセーブに手を加え（1頭を4歳・前の年の GF（中長距離）の勝ち馬に）、12月1週の招待から年明けまで 7 週。
   - craft（番組表の行の指紋と、オープンの予約も通す）：late の続きのセーブに手を加え（週の初めの操作に、重賞の勝ちを足す・馬主の好感度を足す、も使う）（1頭を5歳・能力120・G1を4勝・トロフィー2つ、もう1頭を牝馬に）、JS が読み直したものを Godot も読み、8週。週の初めの操作（予約・引退・オリジナルホースを作る）も同じ列で行う。フェブラリーSにスペシャルホース（G1を5勝した名馬・歴代の勝ち馬）が出て、引退で殿堂入り、オリジナルホースが生まれる。
   - 指紋は、辞書の項目を名前の順に並べ、null の項目を除き、-0 を 0 にした並べ方（JSON に書いて読み直したのと同じ）。
4. `sh godot/tests/run.sh`（headless）が `godot/tests/test_*.gd` を回す。C++ の模擬（`godot/native/bin`）があれば、模擬の 54 本と数学・乱数を C++ と GDScript の両方で比べ、世界の進行・フリーレース・並列は C++ で回す。無ければ「C++ の模擬が無いので飛ばした」と出して GDScript だけで比べる。`node tests/run.js` は、Godot があればこれを呼ぶ（無ければ「飛ばした」と出す）。Godot の場所は `GODOT=`・PATH の `godot`・`/home/user/godot-bin/godot` の順に探す。

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
この container の CPU（4 コア）で測った（2026-10-17）。測り方：Godot は `godot --headless --path godot -s tests/bench.gd`（レース）・`tests/bench_week.gd`（1 週）、JS は `node tools/bench_js.js`。

| | JS（V8） | GDScript | C++（GDExtension） |
|---|---|---|---|
| 模擬の 1 刻み（0.1 秒・平均） | 32 µs | 297 µs | 2.6 µs |
| レース 1 本：作る（create） | 3.6 ms | 48 ms | 1.4 ms |
| レース 1 本：回す（step を最後まで） | 39 ms | 367 ms | 3.2 ms |
| 1 週を進める（出走表＋週の締め。乗らなかったレース 6〜12 本を含む） | 0.39〜0.69 秒 | 3.3〜4.3 秒 | 0.28〜0.43 秒 |
| 内訳：出走表（prepare_week） | 0.11〜0.21 秒 | 0.12〜0.26 秒 | 0.11〜0.34 秒 |

- C++ の模擬は GDScript の約 110 倍、JS の約 12 倍速い。1 週は JS と同じくらいになった（目標の 1 秒未満）。
- 出走表づくりは GDScript のまま。結果を変えない直しで 0.5〜0.7 秒 → 0.1〜0.3 秒にした：
  - 年代なしの騎手の腕前（`HSWorld.jockey`）が、まだ現役の騎手（`to`＝9999）で 1990〜9999 年を 2 年ずつ回していた（1 人 30ms）。腕前の表の最後の年から先は同じ値なので、そこで止める（JS も同じ回り方をしている。JS は速いので目立たない）。名前・年ごとに結果も覚えておく。
  - 騎手の腕前の年の表（`skill_at`）が、同じ名前・年・地域の別の騎手の辞書と交互に並べ直されていた → 鍵ごとに両方を持つ。
  - 騎手の一覧（`jockeys_of`）を週ごとに作り直していた → データは変わらないので遊んでいる間は使い回す。
  - 頭数合わせの馬の名前の表を、レースごとに丸ごと写していた（7000 件）→ 写さずに、そのレースで付けた名前と両方を見る。種牡馬を選ぶ重みも週の一覧ごとに一度だけ出す。
- まだ速くしたいとき：出走表（`build_field`・AI の出走 `ai_choose`）を C++ に移すのが次の候補。ただ今は 1 週の半分ほどで、JS と同じくらいなので急がない。
- 週のレースは互いに独立なので並列に回せる（`test_parallel.gd` で、C++ の模擬を同時に回しても JS と同じ結果を確かめている）。C++ なら 1 本 3ms なので、いまは並べなくてよい。

## C++ の模擬（godot/native/）
- 呼び方は GDScript の `HSSim` と同じ（`HSSim.create`・`step`・`finish`・`ctl_*`）。`HSSim.use_native()` が C++ が読めるか（`ClassDB.class_exists("HSNativeSim")`）を見て、読めれば C++ に、読めなければ GDScript に渡す。切り替えはこの 1 か所。`HSSim.backend = "gd"` で GDScript に固定できる（テストが両方を回すのに使う）。`HSSim.power` も C++ に渡す。
- 中身は GDScript の `hs_sim.gd`・`hs_skills.gd`・`hs_track.gd` と式の並びまで同じに写した。模擬の中（step）は C++ の値だけで回し、Godot の値（Dictionary）は作るとき・実況・結果をまとめるときだけ触る。数学は fdlibm（`hs_math.cpp`）。`-ffp-contract=off`（掛け算と足し算を 1 つにまとめない）で作る。
- データ（競馬場・回り・特殊能力の名前）は、最初に使うときに GDScript が `HSNativeSim.set_data` で渡す。年代なしの走りの速さ（`HSU.era_speed`）は作るたびに渡す。
- JS・GDScript の模擬を直したら、C++ の同じ所も直す（`godot/native/src/hs_sim.cpp` ほか）。3 つが同じ答えになることを一致テストで確かめる。

### 作り方
```
sh godot/native/build.sh      # godot-cpp（版を固定）を取り、Linux 向けと（mingw があれば）Windows 向けを作る
```
- 要るもの：python3・scons（`pip install scons`）・g++。godot-cpp は `get_godot_cpp.sh` が `godot/native/godot-cpp` に取る（10.0.0-stable・コミット 507ed9d。api_version 4.7）。リポジトリには入れない。
- できるもの：`godot/native/bin/libhsnative.linux.template_debug.x86_64.so`・`libhsnative.windows.template_release.x86_64.dll`・`hs_native.gdextension`（作ったものだけを書く。無ければ Godot は GDScript の模擬を使う）。`bin/` はリポジトリに入れない。作ったあと Godot の `--import`（`run.sh` がやる）で読み込みの一覧に入る。
- 初めは godot-cpp の作りで 10 分ほど（4 コア）、そのあと模擬だけなら 20 秒ほど。
- **Windows（Steam の主な売り先）向け**：Linux で mingw のクロスで作る。`apt-get install g++-mingw-w64-x86-64-posix` のあと `scons platform=windows use_mingw=yes target=template_release`（`build.sh` がやる）。できた DLL は KERNEL32・msvcrt だけを使う（ほかの DLL は要らない）。Windows の機械では動かしていないので、Windows で初めて開いたときに `HSSim.kind_of` が "native" になるかと、一致テスト（`run.sh`）を確かめる。
  - 手元で作れないときは GitHub Actions の Windows（windows-latest・MSVC）で `scons platform=windows target=template_release` でも作れる。Actions を足すときは、使う Actions をコミットの SHA で固定し、`pull_request_target` は使わない（CLAUDE.md）。MSVC は `/fp:precise /fp:contract-` で作る（SConstruct が付ける）。
- 書き出し（配る版）は `target=template_release`。エディタで開くときは debug の版を読む（片方しか無ければ両方に同じものを書く）。

## JS 版で見つけたこと
- 年代なしの騎手の腕前（`js/core/world.js` の `W.jockey`）は、まだ現役の騎手（データの `to`＝9999）で、腕前の最大を 1990〜9999 年まで 2 年ずつ（約 4000 回）見ている。値は表の最後の年から変わらないので結果は正しいが、回る数が多い（Godot では最後の年で止めた。同じ値）。
- 馬主が誰か（`js/core/owners.js` の `O.ownerOf`）を馬の名前で覚えておく使い回し（`own`）が、その名前を最初に見たときの馬で決まっていた。いまは鍵を「名前|id」にして直った（JS・Godot とも）。一致テストは念のため JS もセーブを読み直してから続ける形のまま。Godot は新しいゲーム・セーブを読んだときにこの使い回しを空にする。
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
| `js/core/horse.js` | `hs_horse.gd` | ○ 史実馬・伝説級・頭数合わせの馬・エディットの馬（調教は世界の進行の中で） |
| `js/core/fatigue.js` | `hs_fatigue.gd` | ○ 世界の進行（毎週のセーブ）と、craft の週の操作 `away`・`fat`（段階・回復・移動の疲れ・出られるか・たまる量） |
| `js/core/skills.js` | `hs_skills.gd` | ○ |
| `js/core/racesim.js` | `hs_sim.gd`・`godot/native/src/hs_sim.cpp`（C++） | ○ 54 本（C++ と GDScript の両方） |
| `js/core/races.js`・`world.js`（騎手のゲームの道すじ）・`season.js`・`dream.js`・`eraless.js`・`special.js`・`owners.js`・`jockey.js`・`hall.js`・`trophy.js`・`pedigree.js`・`edits.js`（当てる所） | `hs_races.gd` ほか | ○ 新しいゲームから 4 週・JS のセーブから 4 週（GF・年明け） |
| `original.js`（オリジナルホースを作る）・殿堂入り・予約・スペシャルホースが出てくるレース・トロフィー・冠・馬主の段階とご褒美（思い出の名馬） | 移した | ○ craft の 8 週（勝ち・好感度は週の初めの操作で足す） |
| 12月1週の GF の招待・GF の伝説級（前の年の GF を勝った馬が出ると、キンチェムなどが出てくる） | 移した | ○ gf の 7 週 |
| 馬主の引退した馬のご褒美（年明け） | 移した | まだ（起きる場面を作っていない） |
| `freerace.js`（フリーレース） | `hs_freerace.gd`（`HSFreeRace`） | ○ 6 本（出走表・着順・実況） |
| セーブ（JSON） | `HSJson`・`HSWorld.serialize`・`load_save`・`migrate` | ○ JS のセーブを読んで続きが同じ |
| `world.js` の馬主・生産者のゲームだけの所（種付け・売る・牧場の拡張・海外馬と繁殖牝馬の市場） | まだ | 新しく始められないので後回し |
| `replay.js`（リプレイを縮めて残す）・`edits.js`（書き出し・読み込み） | まだ | 画面の係と相談して |

## Windows で遊べる版（.exe）を書き出す
```
sh godot/native/build.sh             # C++ の模擬（Windows の DLL は mingw で作る）
sh godot/tools/export_windows.sh     # build/windows/TurfLineage.exe ＋ libhsnative.windows.template_release.x86_64.dll
```
- 書き出しの設定は `godot/export_presets.cfg`（「Windows Desktop」。中身の pck は exe に埋める。tests・tools・C++ の元は入れない）。
- 書き出し部品（export templates）は Godot 4.7.2 のものから `windows_release_x86_64.exe` だけを `~/.local/share/godot/export_templates/4.7.2.stable/` に置けばよい（全部で 1.3GB あるので、要るものだけ取り出す）。
- 配るときは exe と DLL を同じフォルダに入れて zip にする。DLL が無くても動く（GDScript の模擬になり遅い）。`build/` はリポジトリに入れない。
- 遊べる範囲：タイトル（はじめから・つづきから）→ ホーム → 番組表（出走・予約）・馬の店・馬主の騎乗依頼 → 出走表 → 騎乗（その週の本当のレースを C++ の模擬で走る）→ 週の結果（見せ場・馬主のご褒美の場面）→ 次の週。ほかに厩舎（引退）・生産（オリジナルホース）・データ（成績・スペシャルホース・トロフィー・リーディング・表彰・殿堂・コースレコード）・馬主・グランドフェスティバル（招待と出す馬・ファンの票の順位）。セーブは週を締めるたびに自動で `user://save.json`（Windows では `%APPDATA%/Godot/app_userdata/ターフの系譜/`）。画面と週の流れは `godot/README.md`。
