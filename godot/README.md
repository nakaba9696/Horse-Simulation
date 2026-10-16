# Godot の試作（同じ1レースの場面）

エンジンを Godot 4 に移すかを決めるための試作。ゲーム全体は移していない。
いまの JS の模擬（`js/core/racesim.js`）で走らせた1レースの記録を、Godot 4.7（Forward+）で再生する。
見比べの絵と、移すときの見積もりは [docs/shots/godot/](../docs/shots/godot/README.md)。

## 動かし方
1. Godot 4.7 の標準版（.NET ではない方）を https://godotengine.org/download から取る（試作は 4.7.2 で作った）。
2. Godot でこのフォルダ（`godot/project.godot`）を開いて、▶（F5）で再生する。
   - 1＝中継のカメラ・2＝騎乗のカメラ（自分の馬＝11番の後ろ）・スペース＝止める・←→＝5秒戻す／進める・↑↓＝速さ・R＝はじめから・H＝表示を隠す

## レースの記録を作り直す
```
node tools/export_race.js          # godot/data/race.json（東京 芝2400m の G1、史実馬16頭、0.1秒ごと）
```
- 乱数の種は固定（`SEED`）。同じ記録が毎回出る。馬・枠・コースは `tools/export_race.js` の頭で変えられる。
- 記録の中身：コースの形（`js/core/track.js` と同じ値）・各馬の毛色（`js/ui/art.js` の表）・勝負服（`js/ui/raceview.js` の `silksOf`）・枠の色・0.1秒ごとの `[x, lane, v]`・着順・実況。

## 絵を撮る（画面の無い container でも撮れる）
```
# Godot（Xvfb と mesa の lavapipe＝CPU の Vulkan。1枚 10秒ほど）
sh godot/tools/shot_godot.sh 出力先 --shot=122:tv:straight --shot=122:ride:straight_ride --seq=137:140.6:10:tv:seq
# ブラウザ版（Playwright の Chromium、SwiftShader。同じ記録・同じ秒）
node godot/tools/shot_web.js 出力先 122:tv:straight 122:ride:straight_ride --seq=137:140.6:10:tv:seq
```
- カメラ：`tv`＝中継（横から追う。直線では斜め前から）、`ride`＝騎乗（自分の馬の後ろ）、`close`＝寄り（自分の馬の内側、斜め前から。Godot だけ）。
- container で Godot を動かすには `apt-get install mesa-vulkan-drivers`（lavapipe）と Godot の本体（`GODOT=` で場所を渡す。既定は `/home/user/godot-bin/godot`）が要る。本体はリポジトリに入れない。

## 中身
| 場所 | 中身 |
|---|---|
| `project.godot`・`main.tscn` | プロジェクト（Forward+・MSAA 2x・影 8192） |
| `scripts/main.gd` | 記録を読んで再生する。光・空・色の調子（AgX・SSAO・SSIL・SSR・グロー・霞）、カメラ（ブラウザ版の `js/ui/race3d.js` と同じ決め方）、撮影 |
| `scripts/track.gd` | コースの形（`js/core/track.js` をそのまま GDScript に） |
| `scripts/world.gd` | 競馬場を組む：芝とダート・柵・ハロン棒・ゴール板・スタンドと観客（MultiMesh で約3万人）・内馬場（池・大きな画面）・木・遠くの町と山・発走のゲート |
| `scripts/horse_rig.gd` | 馬（Quaternius の馬。毛色で塗る・法線をならす・襲歩を走った距離に合わせて進める）・騎手（勝負服の模様・枠の色の帽子）・鞍とゼッケン |
| `scripts/hud.gd` | 画面の上の表示（レース名・残り・時計・順位・実況・確定の掲示板） |
| `shaders/` | 芝・ダート（刈り目の縞・内ラチ沿いの荒れ）、地面、勝負服の模様 |
| `assets/` | 素材（出典とライセンスは [CREDITS.md](CREDITS.md)） |
| `tools/` | 撮影の道具（Godot・ブラウザ版） |
| `data/race.json` | レースの記録（`tools/export_race.js` が作る。手で直さない） |
