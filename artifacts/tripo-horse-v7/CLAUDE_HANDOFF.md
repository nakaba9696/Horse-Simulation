# 馬モデル v7 — Claude 取り込み手順

納品先 `codex/tripo-horse-handoff` / `artifacts/tripo-horse-v7/`。ゲーム本体のコード・データは変更していない。依頼正本は `claude/lucid-ptolemy-j204a3` commit `972cd9842383cdc9f1b55f898dee34ffbd4d6022` の `docs/handoff/TRIPO_HORSE_V7_REQUEST.md` と同 commit の比較7枚。

**最終GLB SHA-256: `985091d66c7caeadd3d151c3b8f8e274399b9b2c96ec0507e7a8266fdc3052ea`**。画像と数値の対象をこのhashに固定する。元はv6の制作入力。`v6-rest.blend` はv6の閉鎖/鼻面修復・比率編集後の中間データで、同梱してv7の再生成を可能にしている。利用者提供の `source-rigged.glb` も収録。

## 取り込み前に

1. 外側READMEのZIP SHAを確認し、展開後 `sha256sum -c SHA256SUMS`。
2. Godot 4.6.3で独立 `preview/project.godot` を開く。Stand/Walk/Trot/Canter/Race、毛色、領域、6取付点、視点を切り替えられる。
3. ゲーム側の既存試作場面へ素材を選んで取り込み、v6/現行馬/既存騎手と同じ速度・位相・カメラで比べる。**枝全体のmergeは不要**。
4. GLBだけでなく **シェーダ差分、2つの補正トラック、v7の取付点JSON** を取り込む。詳細は下記。

## 首と頭の比と実馬資料

固定した皮膚のbarycentric点を使う。頭はうなじ→上唇、首上線はき甲→うなじの33点の皮膚上線。下線は喉付け根→首肩接合の**弦**で、下側輪郭の曲線長とは違う。5点のseed・三角形・重みと全サンプルを `anatomy-race-v5.json`, `anatomy-race-v6.json`, `anatomy-race-v7.json` に保存。同じ測り方によるStandの開始時点、倍率2.6のm。

| 版 | 頭長 | 首上線 | 首下線の弦 | 頭/首上線 | 上線/下線弦 |
|---|---:|---:|---:|---:|---:|
| v5 | 0.6057 | 0.6165 | 0.3630 | 0.982 | 1.698 |
| v6 | 0.5636 | 0.6930 | 0.3984 | 0.813 | 1.739 |
| v7 | 0.5633 | 0.7393 | 0.3616 | 0.762 | 2.044 |

目安の頭:首上線=2:3に**数値が完全一致したとはしていない**。今回の実測は頭/上線約0.762、上線/頭約1.31（依頼の「頭の1.2〜1.5倍」内）、上下線比約2.04。v6よりStandの上線の実測値を小さくした、という説明もしない。v6の細い支柱のような見え方に対し、付け根を太くし、喉へ細くつなぎ、走り/歩きの頭位を変えた。実馬の写真との見え方を優先し、測り方や姿勢の違いを隠して短縮率だけを合格理由にしない。

`reference/REAL_HORSE_REFERENCE.md` に原典と権利の確認を記録。立ち姿は1905年Ridgeway図129 “Irish Thoroughbred Stallion”（archive.orgのNOT_IN_COPYRIGHT US）、走行はWellcome所蔵Muybridge1887 plate626（Public Domain Mark）。`real-stand-comparison.jpg`, `real-gallop-comparison.jpg` を参照。走行写真の原番号と左右反転・対応フレームを `real-photo-correspondence.json` に明記。足の支持/収縮/伸長が近い位相を比較し、未知の撮影速度を16m/sと断定せず、厳密な時刻同期/mocap検証とは区別する。

利用者の動画2本はCGの動作見本。実馬の証拠とは分け、出所不明のため動画/抽出絵は納品しない。

## 胴・首・頭の動き

- Race: 首の傾き **30.09〜41.88°**。鼻先は全109時点でうなじより前。
- うなじ上下 **0.2776m**（v6約0.2863mを維持）。頭中心（うなじ/上唇の中点）の上下 **0.2577m**（v6約0.3074mから減少）。完全静止とはしていない。
- 胴のworld pitch幅 **10.00°**（v6約1.60°）、頭のworld pitch幅 **9.92°**（v6約11.01°）。首の骨のlocal角ではなく、頭の皮膚点と胴のSpine_0→Spine_7の方向をworldで測定。
- 胴のpitchを追加しつつき甲高を補償し、世界の蹄IK目標と従来の周期・脚順を維持。新しい胴/首運動に合わせて鞍とBitの軌跡を再出力している。
- Walkはうなじをき甲付近まで下げて1周期2回うなずく。Stand/Walkの脚順・接地・胴の上下は数値比較した。
- Dunbar2008は3頭のwalk/trot/canter（canter5.82m/s）の研究で、16m/sの競走ギャロップを測った論文ではない。頭の空間安定を完全な位置固定と読み替えていない。

## 歩法・接地・取付点の約束

その場走行、前 **−X**、上 **+Y**。親のY+90°と騎手の従来の向き補正を維持。骨54、三角形 **19,168（v6と同数）**。頭絡、52本の細い首の房/前髪6/尾8、UV0のnormal画像、UV2整数の8領域/5脚IDは維持。

| GLB名 | Godot名 | 周期 | 倍率2.6の完歩 | RaceNeckCorrective | WalkNeckCorrective |
|---|---|---:|---:|---:|---:|
| RaceGallop_Loop | RaceGallop | 0.45s | 7m | 1 | 0 |
| Stand_Loop | Stand | 3s | 0 | 0 | 0 |
| Walk_Loop | Walk | 1.2s | 1.6m | 0 | 1 |
| Trot_Loop | Trot | 173/240s | 2.8m | 1 | 0 |
| Canter_Loop | Canter | 0.6s | 4.5m | 1 | 0 |

再生倍率は `v*周期/(表の完歩*S/2.6)`。Raceの `L=7*S/2.6` を変えない。

独立測定で、Race浮遊割合 **20.0%**（全蹄が1.5cm超の時）、き甲上下 **0.14854m**、蹄最低点 **-1.409mm**。ゲームの19.4%/0.0cmとはサンプル/閾値/丸めが異なるので混同しない。脚別の皮膚蹄重心残留速度は16m/sで約0.48〜0.77m/sで、v6と同じ方法で比較した。ゲーム側の0.47m/sという単一指標と同じ算出値だとはしていない。

`regression-validation.json` は5歩法の足重心差とループ/浮遊/周期/接地を記録。Raceの足重心はv6から実寸約1.6mm以内の差、Stand/Walkは同じ。胴のpitchを変えたため「全軌跡がバイト一致」とは書かない。

`Saddle`, `Stirrup_L/R`, `Bit_L/R`, `Withers` を保持。Saddle/鐙のrest位置と向きは同じ。**新しい動作のためsaddle-track/attachment-tracksの値はv7へ置換**。v6の軌跡を混ぜない。

- `saddle-track.json`: Race28時点。
- `attachment-tracks.json`: 全5動作、60Hz。
- `attachment-godot-validation.json`: 全5動作の6点をGodot読込後に照合。

JSONはモデル座標、親の尺度/向き変換は1回だけ。骨追従とJSON駆動を二重適用しない。

## 追加のWalk補正 — 必須

低い首で喉が四角く垂れる問題に、**`WalkNeckCorrective`** を追加した。既存の `RaceNeckCorrective` の値は上表のまま。新しい補正はWalk1・他4動作0。NLA/GLBに両方を焼いている。

Walk補正内では、下頸の皮をならしたうえで、たてがみの52本の丸断面束と細い下地を**その姿勢の皮の上で再配置して逆バインド**している。単なる根元追従では低頭時に房が鱗状へ潰れたため、08の鱗状と09の平行な櫛状を差し戻し、10の長い孤立房も差し戻し、11では52本を13の短い後方流れの房へ4本ずつ緩く寄せ、隣接する束を密に重ねて再配置した。根元は分散させ、先端は緩く寄り合い、長さ・方向・曲がり・横方向の浮きを房ごとに変え、下地帯も狭めた。修正前後画像とレビュー記録を同梱。

既存コードが補正を1個と決め打ちしている場合は、名前で2個を扱う。Standへ戻すときは両方0へ戻ることを確認する。ゲーム本体へこの変更をこちらで入れてはいない。

## 付属シェーダとimport — 必須

`preview/coat.gdshader` を馬本体に使うか、既存シェーダへ差分を移す。BridleLeather/BridleMetalには適用しない。

1. **v6の法線補正を維持**。ビュー空間で三角形の幾何法線を微分から求め、`dot(NORMAL, geometric_normal)<0.15` のとき置換する。GLB内normal画像と強度0.03を維持。
2. UV2整数IDは変更なし。region=`floor(UV2.x*8)`, leg=`floor(UV2.y*8)`。region1/4の小数部によるmane/muzzle補間も維持。
3. **v7はCOLOR_0に頭の固定座標を格納**する。頂点色そのものをALBEDOへ乗算しない。shaderはCOLOR.rから左右位置、gから頭軸方向、bから表裏方向、aから頭の適用マスクを復号し、fragmentで小さい斜めの鼻孔と細い曲線の口を描く。骨変形に追従し、貼り付けた鼻ボタンの追加メッシュはない。
   - r = `0.5 + rest_y/0.12`
   - g = `(head_axis_fraction-0.65)/0.55`
   - b = `0.5 + head_perpendicular/0.12`
   - a = 頭の皮膚のみ1、他0
   - 正面側は `-face_front`。口線の縁には `fwidth` を使う。`COLOR_0` を削除したり、顔の旧黒領域をべた黒に戻さない。
4. exportはACTIVE colorだけを先頭COLOR_0へ。全色レイヤーexportは無効（白いダミーがCOLOR_0に入るのを防ぐ）。Godot読込後もCOLORが存在することを検証。

import設定: Animation FPS240、Remove Immutable Tracks false、Light Baking Disabled(0)、自動ライトマップUVでUV2を上書きしない。Advanced Importの **AnimationPlayerノード**で Optimizer false / Compression false。全5クリップはLoop Linear。`tools/configure_godot_import.py` はConfigFileで既存辞書を保って設定をマージする。

## 検証と画像レビュー

`surface-validation.json` は境界辺/非多様体辺/巻き順不整合0、Race109時点の退化面0と正の符号付き体積を確認。**隠れた全ての自己交差や変形面の裏返り0を証明したとはしない**。平均スキン行列による法線輸送の食い違いは近似診断であり、裏返り枚数と同一ではない。実レンダーの法線画素監査は別に実施し、付属補正適用後の28画像で0を確認する。

5動作×1,920ステップ、停止復帰、2補正の値、UV2/色座標、6取付点をGodotで照合。元入力とツールだけの別フォルダ再制作、GLB往復、ZIP展開後の再読込を別JSONへ記録。数値適合と美術上の合格は分ける。

最終比較は `comparison/iteration-11/`。同一カメラ/照明/尺度/位相のv5/v6/v7と、v7の背面・逆側・Walk首寄り・3毛色、578画像。固定参照v5/v6の310画像はモデルと撮影条件/画像hashが不変のため再利用し、v7の268画像は最終再描画。再利用はmanifestに明記。原寸PNGを配布時に可逆WebPへ変換し全復号RGBA画素の一致を検査する。中間試作は代表画像と差戻しの記録を抜粋、最終は全原寸を収録する。

制作/途中レビューと別担当の最終レビューを分離。最終判定・閲覧範囲・残件の正本は `review/FINAL_INDEPENDENT_REVIEW.md`。動画書き出しとコマ列の視認を実施し、人間による実時間動画再生を実施したとはしていない。

実ゲームの騎手/手綱干渉、速度による歩法遷移、複数頭のLOD/FPS、最終照明での見え方は未検証。独立素材の画像合格をゲーム採用の合格へ広げない。元素材の商用利用は利用者のTripo契約に従う。他作品のモデル/画像/動画を流用していない。
