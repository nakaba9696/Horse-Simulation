# 3D のレースの地形・観客・影（枝 claude/lucid-ptolemy-j204a3-terrain3d）

`NODE_PATH=$(npm root -g) node tools/shot3d.js docs/shots/terrain3d` で撮った絵を 960×540 に縮めたもの。中山・京都・新潟・東京・エプソム（馬蹄形）は data/layouts.js の実際の形と高さ（tools/shot3d.js の仮の形はデータが無い場だけに使う）。

- `nakayama_*`：中山 芝2000（ゴール前の急坂・4コーナー）
- `kyoto_*`：京都 芝2400（3コーナーの坂の上り下り）
- `niigata1000_*`：新潟の直線1000m（中継・騎乗・ゲート）
- `epsom_*`：エプソムのダービーのコース（馬蹄形・周回しない）
- `dirt_*`：東京 ダート1600（土の塊と蹄の跡・影）
- `compare_*`：左が Godot の試作（docs/shots/compare の左半分）、右がこの枝のブラウザ版。同じ東京 芝2400 の同じ場面（馬の並びは別の模擬）
- `result_bg.jpg`：結果の画面の背景にした止め絵（assets/ui_bg_result.js）

馬の作り込み（区切り2）：`docs/shots/horse3d_v2/before_after.jpg`（左が前・右が後。横からの襲歩6コマ・頭と首・脚・後ろ・肖像）と `portrait.jpg`。`compare_*` はこの区切りで撮り直した。

区切り3（背と腹の線・頭の彫り・毛のつや）：`docs/shots/horse3d_v2/before_after_2.jpg`（左が区切り2・右が区切り3）、`portrait_coats.jpg`（左上が区切り2の鹿毛、右上・左下・右下が区切り3の鹿毛・黒鹿毛・芦毛）、`head_before_after.jpg`、`portrait.jpg`。`compare_*` はこの区切りで撮り直した。

区切り4（サラブレッドの比・連銭）：`docs/shots/horse3d_v2/before_after_3.jpg`（左が区切り3・右が区切り4）、`proportion_before_after.jpg`（肖像の比の前後）、`portrait_coats_3.jpg`（鹿毛・黒鹿毛・芦毛（4歳）・栗毛）、`portrait.jpg`。
