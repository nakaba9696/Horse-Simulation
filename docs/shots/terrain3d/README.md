# 3D のレースの地形・観客・影（枝 claude/lucid-ptolemy-j204a3-terrain3d）

`NODE_PATH=$(npm root -g) node tools/shot3d.js docs/shots/terrain3d` で撮った絵を 960×540 に縮めたもの。中山・京都・新潟・東京・エプソム（馬蹄形）は data/layouts.js の実際の形と高さ（tools/shot3d.js の仮の形はデータが無い場だけに使う）。

- `nakayama_*`：中山 芝2000（ゴール前の急坂・4コーナー）
- `kyoto_*`：京都 芝2400（3コーナーの坂の上り下り）
- `niigata1000_*`：新潟の直線1000m（中継・騎乗・ゲート）
- `epsom_*`：エプソムのダービーのコース（馬蹄形・周回しない）
- `dirt_*`：東京 ダート1600（土の塊と蹄の跡・影）
- `compare_*`：左が Godot の試作（docs/shots/compare の左半分）、右がこの枝のブラウザ版。同じ東京 芝2400 の同じ場面（馬の並びは別の模擬）
- `result_bg.jpg`：結果の画面の背景にした止め絵（assets/ui_bg_result.js）
