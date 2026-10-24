# 馬モデル v8

v7を元に、**立ち姿の首を短く、走行時の頭を低く**しました。ゲーム本体のコード・データは変更していません。

Claudeには次のように伝えてください。

> `codex/tripo-horse-handoff` の `artifacts/tripo-horse-v8/CLAUDE_HANDOFF.md` を読み、v8のGLB・付属シェーダ・2つの首補正・取付点JSONを試作場面へ取り込み、v7/現行馬/騎手と同一レース・時刻・カメラで比較してください。枝全体のマージは不要です。

## 納品ZIP

[tripo-horse-v8.zip](tripo-horse-v8.zip) — 101,700,052 bytes（96.99 MiB）。展開ルート `horse-claude-handoff-v8/`。

```text
ZIP SHA-256: df14c50fe032bb3c702b7be0c6de0d15f1c85732c6e1e3af674396253cb6c3f7
GLB SHA-256: 2a0be31f6bfb5382a192b6ba4477fadb99f1ca3368d23fabbc467abe1923a798
```

最終GLB/blend、元Tripo、凍結したv7編集用入力、独立Godot preview、補正入りシェーダ、再制作tools、SHA256SUMS、数値記録、最終比較578画像/中継24画像、単独PNG133枚、動画、PD実馬写真と出典、制作と分けた2名のレビューを収録。

CRCと全1016ファイルのSHA、数値報告hash、別フォルダへ展開した新規Godot import、5歩法×1,920ステップと2補正/6取付点の照合を通過。[delivery-validation.json](delivery-validation.json)。入力だけからの別フォルダ再生成も最終GLBとバイト一致。[rebuild-validation.json](rebuild-validation.json)。

## 首・頭の測定

ゲーム側と同じ元measure.gdを編集せず、隔離コピーのproto素材だけ一時置換して計測しました。元スクリプトのv7ラベルに実際のv8を入れたことをZIP内のprovenanceに明記し、素材も復元済みです。

| ゲームの同じ測定方法・倍率2.6 | v6 | v7 | v8 |
|---|---:|---:|---:|
| Stand首上線の弦 m | 0.629 | 0.715 | **0.563** |
| Race首上線の弦 m | 0.681 | 0.638 | **0.408** |
| 頭長 m | 0.552 | 0.561 | **0.561** |
| Raceうなじ平均 m | 1.70 | 1.83 | **1.71** |
| 同上下幅 m | 0.278 | 0.279 | **0.258** |

固定皮膚点によるCodexの別測定では、Stand首上線曲線0.5948m・頭0.5640m、上線/頭1.055、上線/下線弦1.909。Raceうなじ平均1.6984m/幅0.2568m、首角31.47〜44.01°。**曲線とゲームの弦を同一値として混ぜません**。[anatomy-comparison.json](anatomy-comparison.json) / [game-measurement-comparison.json](game-measurement-comparison.json)。

最初の試作はCodexで範囲内でもゲームで0.552mとなったため、Standを少し戻して両方法で目標内へ修正→再描画→再レビューしました。頭のneutralサイズと形状は不変。Race頭中心上下はゲーム0.256→0.236m、胴pitch10°を維持。

完歩7m・周期0.45s、ゲームの浮遊19.4%/接地滑り0.47m/s・き甲上下0.148mを保持。独立測定の20.0%/脚別RMS滑りとは指標が異なります。5歩法・2補正・54骨・19,168三角形、常歩・たてがみ・COLOR_0の鼻口・取付点を維持。[preservation-validation.json](preservation-validation.json)。

## 実画像と別担当レビュー

全て1600×1000。同じカメラ・照明・尺度・歩法位相のv6/v7/v8比較です。

- [立ち姿v7/v8](compare-stand.jpg) / [横](compare-side.jpg) / [正面](compare-front.jpg) / [斜め](compare-oblique.jpg) / [首](compare-neck.jpg) / [顔](compare-face.jpg) / [常歩](compare-walk.jpg)
- [中継距離・無拡大比較](tv-compare-native.jpg) / [修正前後](neck-before-after.jpg)
- [実馬の立ち姿](real-stand-comparison.jpg) / [Muybridgeの連続写真](real-gallop-comparison.jpg)
- [比較動画](comparison-preview.mp4) / [単独動画](gallop-preview.mp4)
- [主担当の最終レビュー](iteration-03-visual-review.md) / [別担当の最終独立レビュー](FINAL_INDEPENDENT_REVIEW.md)

2担当とも実画像で短首/低頭化を確認し、素材画像として通過。元ゲームの中継距離/FOV/高さに合わせた単独馬のA/Bでも識別しましたが、**差は小さめ**です。騎手/背景/群れ/HUDなし、平地へ再配置した代替検査であり、本ゲーム全体の中継可読性はまだ合格に含めません。

最終比較578枚はv8新規268+撮影条件/GLBhash不変の固定v6/v7 310の検証再利用。TV24枚を含め最終全画像収録。可逆WebPへ変換し、元PNGと復号RGBA全画素一致を検査。中間試作は抜粋、閲覧範囲と元PNGhashはcoverage JSONで確認できます。

## 取り込み条件・残件

[CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md) に **シェーダ法線補正、COLOR_0鼻孔/口、RaceNeckCorrective/WalkNeckCorrective、embedded_image_handling=3、自動lightmapUVなし、240fps/optimizer・compression無効**を明記。v8のsaddle-track/attachment-tracksを使い、v7のBit軌跡を混ぜないでください。

首肩の境界辺/巻き順不整合0と、全隠れ面の自己交差/局所裏返り0の証明は別です。付属法線補正適用下の可視反転画素0は28画像でのGPU監査。[normal-render-validation.json](normal-render-validation.json)。

近接の毛束/鼻口の簡略感、胴脚の面の陰影、下垂尾は残件。実ゲームの騎手・手綱干渉、歩法ブレンド、背景/群れ込み可読性、多数頭LOD/FPS、人間による実時間動画再生は未検証。素材レビューの合格をゲーム本採用の合格へ広げません。

実馬写真は1905年Ridgeway図129（archive.org NOT_IN_COPYRIGHT US）と1887年Muybridge plate626（Wellcome Public Domain Mark）。[写真出典](REAL_HORSE_REFERENCE.md) / [切り出し・反転・位相対応](real-photo-correspondence.json)。未知のCG動画/他作品モデルは同梱・流用していません。元Tripoの商用利用は利用者の契約に従います。
