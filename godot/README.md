# ターフの系譜 Godot 版

エンジンを Godot 4 へ並行で移している（持ち主の決定 2026-10-16「Godotで作り始めていい」・「並行で移す」）。JS 版（リポジトリのルート）は遊べる見本として残す。
- 見た目と操作（この README の中身）：`project.godot`・`scenes/`・`view/`・`ui/`・`assets/`・`tools/`（枝 `claude/lucid-ptolemy-j204a3-gdview`）
- 遊びの決まりと模擬（GDScript）：`core/`・`data/`・`tests/`（枝 `claude/lucid-ptolemy-j204a3-gdcore`。API は `docs/GODOT.md`）

模擬が GDScript に移るまでは、JS の模擬で走らせた1レースの記録（`assets/replay_race.json`）を再生する。見た目は「レースの入れ口」（`view/race_source.gd` の `ViewReplay`）から各馬の状態を読むだけなので、模擬ができたら入れ口だけを差し替える。

## 動かし方
1. Godot 4.7 の標準版（.NET ではない方）を https://godotengine.org/download から取る（4.7.2 で作っている）。
2. Godot でこのフォルダ（`godot/project.godot`）を開いて ▶（F5）。出走表 → GATE IN! → 騎乗。

### 操作（ゲームパッド・キーボード。押したコマで動く）
| 行い | ゲームパッド | キーボード |
|---|---|---|
| しごく（ゲートの中ならスタート） | 十字キー↑・左スティック↑ | ↑・W・スペース |
| 引く | 十字キー↓・左スティック↓ | ↓・S |
| 進路（押し続けると続けて動く） | 十字キー←→・左スティック←→ | ←→・A/D |
| ムチ（右・左。持っていない手は持ち替え） | B（○）・X（□） | X・Z |
| 持ち替え | A（×） | C |
| 左右を見る | LT・RT | Q・E |
| 視点（BEHIND・JOCKEY・TV） | Back | V |
| 出走表で選ぶ・決める・戻る | 十字キー・A・B | 矢印・Enter・Esc |

振動：蹄の拍子（後脚は強く・前脚は弱く。速いほど・追うほど強い）・ゲートが開く・ムチ・ゴール（勝つと2回）。`Input.start_joy_vibration`。

## 中身
| 場所 | 中身 |
|---|---|
| `scenes/race_card.tscn`・`ui/race_card.gd` | 出走表（全頭を1画面に。PADDOCK・GATE IN!）。後ろはパドック（`view/paddock.gd`） |
| `scenes/race.tscn`・`view/race_view.gd` | 3D のレース（騎乗）。ゲート → 走る → ゴールのあと流す → 着順 → 確定の表。カメラ・振動・撮影 |
| `view/race_source.gd` | レースの入れ口（記録の再生 `ViewReplay`。模擬ができたら差し替える） |
| `view/ride_input.gd` | 騎乗の操作（入力の割り当て・押し続け・振動） |
| `view/horse_model.gd`・`view/horse.gd`・`view/gait.gd` | 馬：素材の馬（JS 版と同じ比・たてがみ・尾・頭絡）を、JS 版の動き（襲歩の4拍子・関節の遅れ・背と骨盤・首と尾の遅れ・常歩・立ち姿・頭を上げる・耳・手前）で動かす。鞍とゼッケンは体の面の殻 |
| `view/jockey.gd` | 騎手：素材の体を手作りの骨（追う・ムチ・ガッツポーズ）へ IK で合わせる。読めないときは丸い棒の騎手 |
| `view/track.gd`・`view/course.gd` | コースの形（`data/layouts.js` の実際の回りと高さ）と競馬場（馬場・柵・ハロン棒・ゲート・スタンド・観客・木・空） |
| `view/shaders/` | 毛色（白徴・連銭・脚先）・鞍の布・勝負服・騎手・芝とダート |
| `ui/theme.gd` | 共通の部品（深緑と金。見出しの帯・表の行・数値の札・枠の色・ボタン） |
| `ui/ride_hud.gd`・`ui/ride_meter.gd`・`ui/minimap.gd`・`ui/style_arrows.gd` | 騎乗の表示（残り・順位・計器・ミニマップ・合図・着順・確定の表）、脚質の矢印 |
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
```
- container で動かすには `apt-get install mesa-vulkan-drivers` と Godot の本体（`GODOT=` で場所を渡す。既定は `/home/user/godot-bin/godot`）が要る。本体はリポジトリに入れない。
- 撮るときは決まった刻み（1/30 秒か fps）で進めるので、同じ引数なら同じ絵になる。
- 重さ：`godot --headless --path godot -s res://tools/bench_view.gd` で 1 コマの GDScript の重さ（馬の形・騎手の IK・模擬・表示）。この container の CPU で 3 ms ほど（60fps の 1 コマは 16.6 ms）。
- 絵の決まり（毛色・白徴・勝負服）が JS と同じか：`-s res://tools/check_art.gd`。模擬の入れ口が JS と同じレースになるか：`-s res://tools/check_live.gd` と `node tools/check_live.js`。この3つと操作の確かめは `node tests/run.js` が Godot があれば回す（`tests/extra_gdview.js`）。
