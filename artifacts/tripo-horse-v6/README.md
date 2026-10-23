# 馬モデル v6

競走馬らしい長く細い首と小さな頭へ修正し、首頭の完歩に沿った動き、たてがみ、目と鼻先を見直しました。ゲーム本体のコード・データは変更していません。

Claudeへの依頼: **このブランチの `artifacts/tripo-horse-v6/CLAUDE_HANDOFF.md` を読み、v6を既存の試作場面へ取り込んでください。付属シェーダの法線補正・鼻先の補間とGodot import設定を維持し、実ゲームの騎手干渉・歩法遷移・LOD/FPSを確認してください。** 枝全体のマージは不要です。

## ダウンロードと確認

[tripo-horse-v6.zip](tripo-horse-v6.zip) — 99,248,751 bytes（約94.7 MiB）。展開ルート `horse-claude-handoff-v6/`。

```text
ZIP SHA-256: 24439111b8631749f558f3310f6cf0e79ddf86ea309fa6811be73c17d45e5925
GLB SHA-256: e1ace4f2834512d6a606d9779192f76c6db4edeba98539c976bbfcf300eb6656
```

展開後 `sha256sum -c SHA256SUMS` で939ファイルを確認。ZIPのCRC、全SHA、別フォルダへの展開後の新規Godot import、5動作×1,920ステップ、全5動作の6取付点照合を通過しました。[delivery-validation.json](delivery-validation.json)。

## 見た目と動作

| 項目 | v5 | v6 |
|---|---:|---:|
| 首の水平長（平均） | 0.5321m | 0.6652m（1.250倍） |
| うなじ〜鼻先（平均） | 0.6246m | 0.5572m（0.892倍） |
| うなじの上下幅 | 0.1714m | 0.2863m |
| 三角形 | 19,190 | 19,168 |

倍率2.6での値。首の傾き20.89〜31.76°、頭と首97.09〜102.32°。首の太さは部位別に記録し、一律の縮小率で合格とはしていません。[比率の並列値](proportion-comparison.json)、[断面と頭の寸法](dimension-validation.json)、[首の線](neck-line.json)。

完歩7m・周期0.45秒、接地、鞍/鐙/き甲の動き、5歩法、頭絡、UV2毛色領域を維持。元の入力からの完全再生成も各検証を通過しました。浮動小数・Booleanの頂点順によるバイト差はあり、描画と納品は上記GLBに固定しています。[再生成検証](rebuild-validation.json)。

同一カメラ・照明・尺度・時刻の比較。各画像は1600×1000。

- [横](compare-side.jpg) / [正面](compare-front.jpg) / [斜め](compare-oblique.jpg)
- [首寄り](compare-neck.jpg) / [顔](compare-face.jpg) / [3毛色](v6-coats.jpg)
- [共通比較動画](comparison-preview.mp4) / [v6走行動画](gallop-preview.mp4)
- [たてがみ修正前後](mane-before-after.jpg) / [鼻先修正前後](face-before-after.jpg) / [喉の修正前後](throat-before-after.jpg)

ZIP内に最終570画像を可逆WebPで全収録。v6の260枚は最終再描画、固定参照v4/v5の310枚は撮影条件・モデル/画像hash一致を検査して再利用。原PNGとの復号画素一致も全件確認。単独PNG133枚、編集用blend、元入力、再制作ツール、検証JSONを同梱。

## レビューと残件

制作、途中レビュー、別担当の最終レビューを分離。鼻先・喉・たてがみで差し戻しを行い、修正→再描画→再レビューを実施しました。最終05は両担当が独立素材として視覚合格。数値のみの合格ではありません。

- [途中担当の最終所見](05-iteration-review.md)
- [別担当の最終独立レビュー](FINAL_INDEPENDENT_REVIEW.md)
- [Claudeへの取り込み手順](CLAUDE_HANDOFF.md) — **付属シェーダ補正とAnimationPlayerのoptimizer無効化は必須**。

近接のたてがみ根元の暗い帯、控えめな鼻孔/口線、芦毛の強い白、胴脚の面の段差と尾の帯状感は軽微な残件。実ゲームでの騎手/手綱干渉、歩法遷移、LOD/FPSと、人間による実時間動画再生は未検証です。連続フレームは確認済みですが、ゲーム本採用の合格には含めません。

依頼正本: `claude/lucid-ptolemy-j204a3` commit `372bb1681ef6c2a1b680ff54a2f598ae7841e576` の `docs/handoff/TRIPO_HORSE_V6_REQUEST.md` と比較8枚。元素材は利用者提供Tripoモデル。外部作品のモデル/画像/動画素材を流用していません。
