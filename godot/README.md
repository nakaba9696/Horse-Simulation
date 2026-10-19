# ターフの系譜 Godot 版

エンジンを Godot 4 へ並行で移している（持ち主の決定 2026-10-16「Godotで作り始めていい」・「並行で移す」）。JS 版（リポジトリのルート）は遊べる見本として残す。
- 見た目と操作（この README の中身）：`project.godot`・`scenes/`・`view/`・`ui/`・`assets/`・`tools/`（枝 `claude/lucid-ptolemy-j204a3-gdview`）
- 遊びの決まりと模擬（GDScript）：`core/`・`data/`・`tests/`（枝 `claude/lucid-ptolemy-j204a3-gdcore`。API は `docs/GODOT.md`）

遊ぶ流れ（騎手のゲーム）：タイトル → ホーム → 番組表・馬の店 → 出走表 → 騎乗 → 週の結果 → 次の週。遊びの決まりは `core/`（HSWorld など）を呼ぶだけで、画面では作り直さない。
レースは「レースの入れ口」（`view/race_live.gd` の `ViewLive`）がその週の出走表から C++ の模擬（`HSWorld.start_sim`）を回し、見た目はそこから各馬の状態を読む。タイトルの「1レースだけ走る」は前の見本（記録と同じ出走馬の東京 芝2400m）。

## 動かし方
1. Godot 4.7 の標準版（.NET ではない方）を https://godotengine.org/download から取る（4.7.2 で作っている）。
2. Godot でこのフォルダ（`godot/project.godot`）を開いて ▶（F5）。タイトル → はじめから（騎手の名前と所属）→ ホーム。
3. 馬の店でデビュー前の史実馬を買い（2歳の4月に入厩）、番組表で出走・予約する。馬主の騎乗依頼を受けると、その週から乗れる。「レースへ」→ 出走表 → ゲートイン（おまかせでも乗れる）→ 週の結果 → 次の週。週を締めるたびに自動でセーブ（`user://save.json`）。

### 画面の操作（docs/UI.md 4）
| 行い | ゲームパッド | キーボード |
|---|---|---|
| 選ぶ | 十字キー・左スティック | 矢印 |
| 決める | A | Enter |
| もどる | B | Esc |
| タブ（番組表の馬・店の牡馬と牝馬） | LB・RB | Q・E |
| 並べ替え（店） | Y | R |

### 操作（ゲームパッド・キーボード。押したコマで動く。docs/FEEL.md）
| 行い | ゲームパッド | キーボード |
|---|---|---|
| しごく（ゲートの中ならスタート。開く 150ms 前からの押しは覚えておく） | 十字キー↑・左スティック↑ | ↑・スペース |
| 引く | 十字キー↓・左スティック↓ | ↓ |
| 進路（押し続けると、すぐ1つ・0.28 秒でもう1つ・あとは 0.2 秒ごと） | 十字キー←→・左スティック←→ | ←→ |
| ムチ（右・左。持っていない手は持ち替え） | B（○）・X（□） | X・Z |
| 持ち替え（ゴールのあとは「次へ」） | A（×） | C |
| 左右を見る | LT・RT | Q・E |
| 照準（レーダーで見る馬） | LB・RB | A・S |
| 視点（JOCKEY CAM・HIGH CAM・TV CAM）・カメラを戻す | Back・R3 | V・R |
| 次へ（流している間なら着順へ飛ぶ）・ガッツポーズ | A・Y | Enter・G |
| 一時停止（ほかの窓へ移ると自動で止まる） | Start | Esc・P |
| 出走表で選ぶ・決める・戻る | 十字キー・A・B | 矢印・Enter・Esc |

手ざわり（docs/FEEL.md）：揺れは 3D のカメラだけ（減衰する正弦の kick。横 10cm・縦 5cm・ロール 0.012rad まで。計器は揺らさない）。ゴール板で白い光と振動（時は止めない）、駈歩の 8.5m/s まで落として走り続けながら 2.4 秒流してから着順（持ち主の指摘「ゴールしたあと止まらないで」）。
振動：蹄の拍子（後脚は強く・前脚は弱く。速いほど・追うほど強い）・ゲートが開く・ムチ・進路・ぶつかり・ゴール板・着順（勝つと2回）・掛かり（不規則にガツガツ）。`Input.start_joy_vibration`。

## 中身
| 場所 | 中身 |
|---|---|
| `ui/flow.gd`（`UiFlow`） | 週の流れ：セーブ（`user://save.json`）・今週の騎乗の列（`begin_week` → 出走表 → 騎乗 → `ride_done` → `close_week`）・出走表と騎乗が読む一式（`desc_of`）・撮影の見本（`demo`・`demo_ride`・`demo_week`） |
| `ui/screen.gd`（`UiScreen`） | 騎乗の外の画面の土台：背景の写真と深緑の幕・見出しの帯・帯の数・節の見出し・表の行・トースト・操作の案内・Q/E・入りの動き・撮影（`--shot`・`--demo`） |
| `scenes/title.tscn`・`ui/title.gd` | タイトル（はじめから・つづきから・1レースだけ走る・終わる） |
| `scenes/home.tscn`・`ui/home.gd` | ホーム（今週すること・暦の札・コマンドの札・お手馬・予約・これからのG1・騎乗依頼・GF の招待・今週の騎乗・ニュース） |
| `scenes/program.tscn`・`ui/program.gd` | 番組表（馬をタブで替え、今週は出走・先の週は予約。絞り込み） |
| `scenes/shop.tscn`・`ui/shop.gd` | 馬の店（牡馬・牝馬のタブ・並べ替え・右の見本・買う） |
| `scenes/week_result.tscn`・`ui/week_result.gd` | 週の結果（騎乗したレースの着順と進上金・着順の表・馬主のひと言・ご褒美・ニュース） |
| `scenes/stable.tscn`・`ui/stable.gd` | 厩舎（お手馬と牧場の馬のタブ・右の見本・番組表・引退させる・放す。確かめは「やめる」から） |
| `scenes/breed.tscn`・`ui/breed.gd` | 生産（牧場の牡馬と牝馬から父と母を選び、オリジナルホースを作る） |
| `scenes/data.tscn`・`ui/data.gd` | データ（わたしの成績・スペシャルホース・トロフィー・リーディング・騎手の表彰・殿堂・コースレコード・リプレイ・乗った馬・騎乗の記録・GF） |
| リプレイ（`UiFlow.save_replay`） | 自分で乗ったレースの描画のコマを 0.2 秒ごとに `user://replays/<id>.json` へ（セーブとは別。20本まで・お気に入りは消さない）。騎乗の画面が記録の再生（`ViewReplay`）で開く |
| `ui/horse_portrait.gd`（`UiHorsePortrait`） | 見本の馬の絵：3D の馬を小さな窓に立たせる（店・厩舎） |
| `scenes/owners.tscn`・`ui/owners.gd` | 馬主（7人の好感度・間柄とご褒美・勝負服を着せる・思い出の名馬を受け取る） |
| `scenes/gf.tscn`・`ui/gf.gd` | グランドフェスティバル（区分のタブ・招待と出す馬・ファンの票の順位） |
| `ui/celebrate.gd` | 見せ場の後ろの絵（金の光の筋と紙吹雪）。`UiScreen.celebrate`・`owner_scene`（馬主のご褒美の場面）・`confirm`（確かめ）は `ui/screen.gd` |
| `scenes/race_card.tscn`・`ui/race_card.gd` | 出走表（全頭を1画面に。パドック・ゲートイン・おまかせで乗る）。週の流れではその週の出走表。後ろはパドック（`view/paddock.gd`） |
| `scenes/race.tscn`・`view/race_view.gd` | 3D のレース（騎乗）。ゲート → 走る → ゴールのあと流す → 着順 → 確定の表。カメラ・振動・撮影 |
| `view/race_source.gd` | レースの入れ口（記録の再生 `ViewReplay`。模擬ができたら差し替える） |
| `view/ride_input.gd` | 騎乗の操作（入力の割り当て・押し続け・振動） |
| `view/horse_model.gd`・`view/horse.gd`・`view/gait.gd` | 馬：素材の馬（JS 版と同じ比・たてがみ・尾・頭絡）を、JS 版の動き（襲歩の4拍子・関節の遅れ・背と骨盤・首と尾の遅れ・常歩・立ち姿・頭を上げる・耳・手前）で動かす。鞍とゼッケンは体の面の殻 |
| `view/jockey.gd` | 騎手：素材の体を手作りの骨（追う・ムチ・ガッツポーズ）へ IK で合わせる。読めないときは丸い棒の騎手 |
| `view/track.gd`・`view/course.gd` | コースの形（`data/layouts.js` の実際の回りと高さ）と競馬場（馬場・柵・ハロン棒・ゲート・スタンド・観客・木・空） |
| `view/shaders/` | 毛色（白徴・連銭・脚先）・鞍の布・勝負服・騎手・芝とダート |
| `ui/theme.gd` | 共通の部品（深緑と金。見出しの帯・表の行・数値の札・枠の色・ボタン） |
| `ui/ride_hud.gd` | 騎乗の計器（docs/FEEL.md 4：左上＝順位と残り・上＝ペース・右上＝時計・右＝馬群のレーダー・左下の塊＝丸い計器と手綱・STAMINA・FIGHT・WHIP）、英語の合図・着順・確定の表。JS 版 `js/ui/ride.js` の hud() と同じ形 |
| `ui/style_arrows.gd` | 脚質の矢印（出走表） |
| `view/horse_lab.gd`・`scenes/horse_lab.tscn` | 馬の確かめ場（立ち姿・常歩・襲歩を並べて撮る） |
| `assets/` | 素材（出典とライセンスは [CREDITS.md](CREDITS.md)） |

## 作り直す
```
node tools/export_race.js                                  # assets/replay_race.json（東京 芝2400m の G1。実際の回り・高さ・白徴・頭と耳・自分の馬の操作）
NODE_PATH=$(npm root -g) node tools/export_horse_godot.js  # assets/horse_rigged/（JS 版で写し直した馬の形）
```

## 確かめる・撮る（画面の無い container でも動く：Xvfb と mesa の lavapipe）
```
godot --headless --path godot -s res://tools/check_input.gd      # 十字キー・スティック・キーボードの割り当て
sh godot/tools/run_scene.sh res://scenes/race.tscn -- --out=DIR --shot=秒:behind|jockey|tv:名前 --video=始め:終わり:fps:カメラ:名前 --press=秒:ride_up|ride_right|ride_whip_r…
sh godot/tools/run_scene.sh res://scenes/race_card.tscn -- --out=DIR --shot=秒:名前[:選ぶ馬[:paddock]] --video=始め:終わり:fps:名前
sh godot/tools/run_scene.sh res://scenes/horse_lab.tscn -- --out=DIR --cam=side|close|front|back|head --seq=枚数
sh godot/tools/run_scene.sh res://scenes/home.tscn -- --demo=1 --out=DIR --shot=0.8:名前   # title・home・program・shop・week_result も同じ。race_card・race も --demo=1 で週のレース
godot --headless --path godot -s res://tools/check_scripts.gd   # 画面のスクリプトがすべて読めるか
godot --headless --path godot -s res://tools/autoplay.gd -- --weeks=52 --seed=1   # 本物の画面で1年を自動で遊ぶ（止まる所・実行時の誤りを探す。node tests/run.js は10週）
node godot/tools/export_ui_assets.js                          # 画面の背景と馬主の顔をブラウザ版の素材から取り出す
```
- 撮影の見本の追加：`--setup=retire`（牡馬と牝馬を1頭ずつ引退させてから開く）・`--setup=celebrate`（見せ場）・`--setup=scene`（馬主のご褒美の場面）・`--setup=replay`（騎乗の画面で、見本の週に残したリプレイを開く）
- `--demo[=週]`：決まった種の新しいゲームで、店のいちばん安い馬を3頭買い、週を進めた見本から開く（セーブは書かない）。週の結果は1週を決まった乗り方で乗ってから開く。
- container で動かすには `apt-get install mesa-vulkan-drivers` と Godot の本体（`GODOT=` で場所を渡す。既定は `/home/user/godot-bin/godot`）が要る。本体はリポジトリに入れない。
- 撮るときは決まった刻み（1/30 秒か fps）で進めるので、同じ引数なら同じ絵になる。
- 重さ：`godot --headless --path godot -s res://tools/bench_view.gd` で 1 コマの GDScript の重さ（馬の形・騎手の IK・模擬・表示）。この container の CPU で 3 ms ほど（60fps の 1 コマは 16.6 ms）。
- 絵の決まり（毛色・白徴・勝負服）が JS と同じか：`-s res://tools/check_art.gd`。模擬の入れ口が JS と同じレースになるか：`-s res://tools/check_live.gd` と `node tools/check_live.js`。この3つと操作の確かめは `node tests/run.js` が Godot があれば回す（`tests/extra_gdview.js`）。
