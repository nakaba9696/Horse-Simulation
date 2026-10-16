# 3D のレースの地形・観客・影（枝 claude/lucid-ptolemy-j204a3-terrain3d）

`NODE_PATH=$(npm root -g) node tools/shot3d.js docs/shots/terrain3d` で撮った絵を 960×540 に縮めたもの。中山・京都・新潟・東京は data/layouts.js の実際の形と高さ、エプソム（馬蹄形）は tools/shot3d.js の仮の形。

- `nakayama_*`：中山 芝2000（ゴール前の急坂・4コーナー）
- `kyoto_*`：京都 芝2400（3コーナーの坂の上り下り）
- `niigata1000_*`：新潟の直線1000m（中継・騎乗・ゲート）
- `epsom_*`：馬蹄形のコース（周回しない・高低差 40m）
- `dirt_*`：東京 ダート1600（土の塊と蹄の跡・影）
- `compare_*`：左が Godot の試作（docs/shots/compare の左半分）、右がこの枝のブラウザ版。同じ東京 芝2400 の同じ場面（馬の並びは別の模擬）
- `result_bg.jpg`：結果の画面の背景にした止め絵（assets/ui_bg_result.js）
