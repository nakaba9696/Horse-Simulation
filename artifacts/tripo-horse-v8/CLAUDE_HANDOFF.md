# 馬モデル v8 — Claude 取り込み手順

納品先 `codex/tripo-horse-handoff` / `artifacts/tripo-horse-v8/`。ゲーム本体のコード・データは変更していません。依頼正本: `claude/lucid-ptolemy-j204a3` commit `e4b0738da11bb54f6a846f98508d0704732d9d6d` の `docs/handoff/TRIPO_HORSE_V8_REQUEST.md`、同枝のv7比較11枚。

**最終GLB SHA-256: `2a0be31f6bfb5382a192b6ba4477fadb99f1ca3368d23fabbc467abe1923a798`**。元は納品済みv7 GLB `985091d66c7caeadd3d151c3b8f8e274399b9b2c96ec0507e7a8266fdc3052ea` とv7制作の閉じた編集用入力 `v7-rest.blend`。元Tripoの `source-rigged.glb` も同梱。外部生成APIや追加課金は使っていません。

## v7からの変更

- **Standの首と頭の目標位置を短く低く**。neutralの頭/胴メッシュのサイズは変更せず、立ち姿のスキニング姿勢を変更。Stand横方向目標は0.220→0.194 model、角度目標39.5→32°。
- **Raceの首と頭の目標位置を短く低く**。横方向目標は可変0.200〜0.212→0.135 model、角度目標37.5±6.5°。頭の前下の向きはv7と同じ。頭の完全固定ではなく、上下振幅を少し減らしています。
- Walk/Trot/Canterの目標・皮膚・たてがみ・COLOR_0・2補正・脚のIK/周期/完歩・胴pitchは継承。常歩の皮膚点測定はv7と1e-5以内、全5歩法の蹄重心は同じサンプルで差0。
- 最初の試作はCodex測定0.583mでもゲーム測定0.552mで下限未達。Standを少し戻して再生成/再描画し、**両方の方法で0.56〜0.62m**へ収めました。数字に合わせて測定点を選び直していません。
- 中継距離の実寸比較を追加。元ゲームのFOV34°、対象から水平37.497m/高低差9.050mを取得し、同一条件でv6/v7/v8を描画。無拡大のA/B画像でも2人のレビュー担当がv8を短首・低頭と識別しました。ただし差は小さめで、騎手/背景込みの実ゲーム可読性の合格とはしません。

## 首と頭の並列測定 — 2つの方法を区別

`anatomy-comparison.json` と `anatomy-race-v6/v7/v8.json` は同じ固定皮膚点方式。倍率2.6、表は各クリップ開始位相のm。頭=うなじ→上唇、首上線=き甲→うなじの33点皮膚曲線、下線=喉付け根→首肩接合の**弦**。下側輪郭の曲線長とは違います。全位相の平均/最小/最大と測定点の三角形/重みもJSONに保存。

| 版 | 動作 | 頭長 | 首上線 | 首下線弦 | 頭/上線 | 上線/下線弦 |
|---|---|---:|---:|---:|---:|---:|
| v6 | Stand_Loop | 0.5636 | 0.6930 | 0.3984 | 0.813 | 1.739 |
| v6 | RaceGallop_Loop | 0.5655 | 0.7583 | 0.4340 | 0.746 | 1.747 |
| v7 | Stand_Loop | 0.5633 | 0.7393 | 0.3616 | 0.762 | 2.044 |
| v7 | RaceGallop_Loop | 0.5665 | 0.6830 | 0.3465 | 0.829 | 1.971 |
| v8 | Stand_Loop | 0.5640 | 0.5948 | 0.3115 | 0.948 | 1.909 |
| v8 | RaceGallop_Loop | 0.5668 | 0.4718 | 0.2866 | 1.201 | 1.646 |

v8 Standは上線/頭=約1.055、上線/下線弦=約1.91。頭のneutral形状は変更していません。皮膚点の頭長がv7と約0.7mm異なるのは姿勢による変形で、頭を大きくして比率を合わせたものではありません。

**ゲームの元measure.gdによる別測定**。ゲーム側の首上線は皮膚2点の弦、上のCodex表は皮膚曲線なので、v7も0.715と0.739mの差があります。元スクリプトを編集せず、隔離したgame archiveでv7素材だけv8に一時置換して再計測。ゲームの本体コードは編集せず、試験後の素材も元に戻しました。ログ内のラベルv7は、その一時置換時だけ実際はv8です。`game-measurement-comparison.json` と `reference/game-measure-provenance.json` に区別を記録。

| 版 | Stand首上線弦 | Race首上線弦 | 頭長 | Raceうなじ平均 | 同上下幅 |
|---|---:|---:|---:|---:|---:|
| v6 | 0.629 | 0.681 | 0.552 | 1.70 | 0.278 |
| v7 | 0.715 | 0.638 | 0.561 | 1.83 | 0.279 |
| v8 | 0.563 | 0.408 | 0.561 | 1.71 | 0.258 |

ゲーム測定v8は首の傾き30.4〜40.5°、頭中心上下0.236m（v7 0.256m）、胴pitch幅10.00°、頭pitch幅9.96°。Codex固定皮膚点ではうなじ平均1.6984m/幅0.2568m、首31.47〜44.01°、頭中心上下0.2376m。方法差を混ぜて都合のよい一値へ置換しません。頭と首の角度はゲーム85.5〜103.8°でv7とほぼ同じ、以前の別版90〜110°を今回の合格値とは書きません。

v7の旧「上線は頭の約1.5倍」を撤回し、v8の短首指定を優先しました。実馬PD写真との比較も付属します。1905年Ridgeway図129と1887年Muybridge plate626、出典/権利/反転と位相の対応は `reference/REAL_HORSE_REFERENCE.md` と `comparison/iteration-03/real-photo-correspondence.json`。未知の撮影速度を16m/sと断定せず、厳密なmocap同期とはしません。利用者のCG動画/切り出しは納品に含めていません。

## 取り込みの手順

1. 外側READMEのZIP SHAを照合し、展開後 `sha256sum -c SHA256SUMS`。
2. Godot4.6.3の独立 `preview/project.godot` で5歩法/毛色/領域/6取付点/視点を切り替える。
3. 既存ゲームの試作場面へ **v8 GLBとv8のsaddle-track/attachment-tracks JSON**を選んで取り込む。枝全体のmergeは不要。v7/現行馬/既存騎手と同一レース・時刻・カメラで比較する。
4. **付属シェーダの法線補正とCOLOR_0の鼻孔/口、2つの名前付き補正のトラック、import設定を維持**。v7で取り込み済みなら同一差分が残っているか確認する。

前−X、上+Y。ゲーム親Y+90°、SaddleのGLB座標の向きを維持。JSONはモデル座標で、親尺度と向きは1回だけ適用。骨追従とJSON駆動を二重適用しない。6点はSaddle/Stirrup_L/R/Bit_L/R/Withers。Saddle/鐙のrest配置不変。頭が動いたのでBit軌跡をv7から混ぜない。

| GLB名 | Godot名 | 周期 | 倍率2.6の完歩 | RaceNeckCorrective | WalkNeckCorrective |
|---|---|---:|---:|---:|---:|
| RaceGallop_Loop | RaceGallop | 0.45s | 7m | 1 | 0 |
| Stand_Loop | Stand | 3s | 0 | 0 | 0 |
| Walk_Loop | Walk | 1.2s | 1.6m | 0 | 1 |
| Trot_Loop | Trot | 173/240s | 2.8m | 1 | 0 |
| Canter_Loop | Canter | 0.6s | 4.5m | 1 | 0 |

再生倍率=`速度*周期/(表の完歩*S/2.6)`。RaceのL=7*S/2.6を維持。その場走行、54骨・19,168三角形。頭絡/UV0normal/UV2の8領域・5脚ID/たてがみを保持。RaceNeckCorrectiveとWalkNeckCorrectiveの名前/値は上表通り、Stand復帰で両方0。Walkの低頭喉と房を直したv7の補正を残し、1つに統合/削除しない。

## シェーダとGodot import — 必須

`preview/coat.gdshader` は**v7と同一SHA** `29104e4602e3e21e8ee514a316ff47e3de33f50f85f1a0a480ea170593e2743a`。馬本体に適用し、BridleLeather/BridleMetalには適用しません。

- 幾何法線を微分で求め、dot(NORMAL, geometric_normal)<0.15なら置換。GLB内normal画像を保持し、normal強度0.03を維持。修正を外すと黒い継ぎ目が再発する可能性があります。
- UV2整数ID: region=floor(UV2.x*8)、leg=floor(UV2.y*8)。region1/4の小数部の毛/鼻面補間を維持。
- COLOR_0は頭の固定座標。r=0.5+rest_y/0.12、g=(head_axis_fraction-0.65)/0.55、b=0.5+head_perpendicular/0.12、a=頭の適用マスク。**COLORをそのままALBEDOへ乗算しません**。fragmentで小さい斜め鼻孔/細い曲線の口を描き、fwidthで境界をならす。白いダミーCOLORを先頭へ入れない。
- `gltf/embedded_image_handling=3`（画像をGLB内へ残す）、Light Baking Disabled(0)、自動lightmapUVでUV2を上書きしない。
- Animation FPS240、Remove Immutable Tracks false。**AnimationPlayerノード**のOptimizer false/Compression false。5クリップLoop Linear。`tools/configure_godot_import.py` で既存ConfigFile辞書へマージできます。

## 検証・画像と残件

`regression-validation.json`、`motion-validation.json`、`contact-validation.json`で5歩法/接地/周期/蹄/首を比較。ゲーム測定は完歩7m、浮遊19.4%、滑り0.47m/s、蹄最低+0.001m。独立測定は浮遊20.0%（1.5cm閾値）、蹄最低−1.409mm、脚別重心RMS滑り約0.48〜0.77m/sで、同じ指標ではありません。き甲上下0.14854m、胴10°を維持。

`surface-validation.json`: 境界辺/非多様体辺/巻き順不整合0、Race109位相の退化面0、符号付き体積は正。法線輸送の食い違いは近似診断で、**裏返った面の実数とは区別**。全隠れ面の自己交差/局所裏返り0を証明したとはしません。付属法線補正のGPU診断は28画像で可視反転画素0。5動作×1,920ステップ/停止復帰/2補正/UV2/COLOR/6点をGodotで検証。取付点JSONとの誤差は最大約0.101mm。

元入力だけの別フォルダ再制作は最終GLBとバイト一致（rebuild-validation.json）。GLB往復/ZIP展開後の新規importも検査対象。ゲーム本体の騎手・手綱干渉/速度での歩法遷移/多数頭LODとFPS/ゲーム画面の最終採用は未検証です。CPU測定ログを性能合格に読み替えません。

比較は `comparison/iteration-03/`、v6/v7/v8の同じカメラ/照明/尺度/位相、最終578画像（v8新規268+GLBと条件が同じ固定v6/v7の310を検証再利用）。`comparison/iteration-03-tv/` は同一中継距離の24枚。TVはFOV/距離/高さを一致させた平地の単独素材検査で、騎手/HUD/実ゲーム背景はありません。画像の個別拡大や輪郭加工はしていません。配布WebPはPNGと復号RGBA全画素一致、対応hashはimage-conversion-validation.json。単独133PNGと60fps動画も収録。コマ列の目視と動画書出しであり、人間のリアルタイム再生を実施したとはしません。

制作と画像レビューを分け、試作02のStand下限不足を修正→再描画03→再レビュー。主担当 `review/iteration-03-visual-review.md`、別担当 `review/FINAL_INDEPENDENT_REVIEW.md` が閲覧範囲/残件の正本。数値だけで完成扱いにしません。

近接での短い毛束と塗り鼻孔/口の簡略感、下垂尾はv7由来の残件です。TV差は判別可能でも小さめ。独立素材の通過をゲームへの本採用合格へ広げないでください。商用利用は利用者のTripo契約に従い、他作品のモデル/映像は流用していません。
