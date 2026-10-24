# 馬モデル v7

実馬の立ち姿・走行写真と比較し、首の付け根の量感と歩法ごとの頭位、胴のピッチと頭の相対安定、正面の鼻孔・口線を修正しました。低頭Walkの喉とたてがみも繰り返し修正・再描画しています。**ゲーム本体のコード・データは変更していません。**

Claudeには **このブランチの `artifacts/tripo-horse-v7/CLAUDE_HANDOFF.md` を読み、v7素材・付属シェーダ・2つの補正と取付点JSONを既存試作場面へ取り込み、v6/現行馬/騎手と比較してください** と伝えてください。枝全体のマージは不要です。

## ZIPと確認

[tripo-horse-v7.zip](tripo-horse-v7.zip) — 101,570,751 bytes（96.87 MiB）。展開ルート `horse-claude-handoff-v7/`。

```text
ZIP SHA-256: b131229193e569bf2f773bcca6749e938ba24e7f2d281176967ae3e72ceb6bbd
GLB SHA-256: 985091d66c7caeadd3d151c3b8f8e274399b9b2c96ec0507e7a8266fdc3052ea
```

GLB・編集用blend・元Tripo・v6入力・独立Godot preview・シェーダ・再制作ツール・SHA256SUMS・数値記録・最終578画像・単独PNG133枚・動画・PD写真と出典・差戻し/最終レビューを収録。

CRCと全1002ファイルのSHA、別フォルダへ展開した後の新規Godot import、5歩法×1,920ステップ、2補正と6取付点の照合を通過。[delivery-validation.json](delivery-validation.json)。別フォルダで元入力から再生成したGLBも最終版と**バイト一致**。[rebuild-validation.json](rebuild-validation.json)。

## 比較画像とレビュー

すべて1600×1000。同一カメラ・照明・尺度・位相のv5/v6/v7比較です。

- [横](compare-side.jpg) / [正面](compare-front.jpg) / [斜め](compare-oblique.jpg) / [首](compare-neck.jpg) / [顔](compare-face.jpg) / [毛色](v7-coats.jpg)
- [実馬サラブレッドの立ち姿との比較](real-stand-comparison.jpg) / [Muybridgeと1完歩8組の比較](real-gallop-comparison.jpg)
- [比較動画](comparison-preview.mp4) / [単独走行動画](gallop-preview.mp4)
- [常歩の喉の修正前後](walk-neck-before-after.jpg) / [たてがみの修正前後](walk-mane-before-after.jpg) / [顔の修正前後](face-before-after.jpg)

制作とレビューを分け、板状の喉・鼻ボタン・鱗状の毛・櫛状の毛・孤立した長い房を差し戻し、修正→再描画→再レビューしました。最終11は両担当が独立素材として画像レビュー通過。[途中担当の最終所見](11-review.md) / [別担当の最終独立レビュー](FINAL_INDEPENDENT_REVIEW.md)。数値適合だけの判定ではありません。

最終全578画像は可逆WebP。元PNGと全復号RGBA画素が一致することを検査。v7の268枚は最終新規描画、固定v5/v6の310枚は撮影条件/GLB/画像hash一致を確認して再利用。中間画像は代表を抜粋しています。

## 比率と動作の記録

[anatomy-comparison.json](anatomy-comparison.json) に同じ固定皮膚点で測ったv5/v6/v7の頭長・首上線・下線弦とworld pitchを並列収録。Standのv7は頭0.5633m、首上線0.7393m、下線弦0.3616m、頭/上線0.762、上線/下線弦2.044。目安2:3に完全一致したとはしていません。実馬写真と、付け根から喉への太い三角形の量感を合わせて判断しています。

倍率2.6で、完歩7m・周期0.45秒、浮遊20.0%、き甲上下0.14854m、うなじ上下約0.2776m、54骨・19,168三角形を維持。頭中心上下はv6約0.3074m→v7約0.2577m、胴pitch約1.60°→10.00°、頭pitch約11.01°→9.92°。頭の完全静止や、生体の完全再現は主張しません。

5歩法と6取付点/鞍のrest配置、UV2領域を保持。新しい胴/首運動には**v7のsaddle-track/attachment-tracks**を使ってください。ゲーム測定19.4%/滑り0.47m/sと独立測定はサンプル/指標が異なるため混同しません。

## 取り込み条件と残件

[CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md) の **法線補正、COLOR_0の鼻孔/口線、WalkNeckCorrective、Godot import設定** が必須。旧RaceNeckCorrectiveの0/1を保ち、追加Walk補正はWalk1・他0。COLOR_0は座標データであり、そのまま頂点色としてALBEDOへ乗算しません。

近接の毛束と塗りによる鼻孔/口の簡略感、実馬より幾分立つ首・下垂尾は軽微な残件です。実ゲームの騎手/手綱干渉、歩法ブレンド、LOD/FPS、人間による実時間動画再生は未検証。全変形面の隠れた自己交差/裏返り0の証明とも区別します。

PD写真は1905年Ridgeway図129（archive.orgのNOT_IN_COPYRIGHT US）と、1887年Muybridge plate626（WellcomeのPublic Domain Mark）。[写真出典と研究の適用範囲](REAL_HORSE_REFERENCE.md)、[比較時の選択/反転/位相対応](real-photo-correspondence.json)。CGの利用者動画は動作の希望だけに参照し、納品へ入れていません。

依頼正本commit `972cd9842383cdc9f1b55f898dee34ffbd4d6022`。元は利用者提供Tripoモデル、他作品の馬モデル/画像/動画は流用していません。KnowledgeBaseへは403で追記できなかったため、[引き継ぐ一項目と出典](LESSON_FOR_KNOWLEDGEBASE.md)も同梱しました。
