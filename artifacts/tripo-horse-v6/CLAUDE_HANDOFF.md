# 馬モデル v6 — Claude 取り込み手順

納品: `codex/tripo-horse-handoff` / `artifacts/tripo-horse-v6/`。
依頼の正本: `claude/lucid-ptolemy-j204a3` の `docs/handoff/TRIPO_HORSE_V6_REQUEST.md`、commit `372bb1681ef6c2a1b680ff54a2f598ae7841e576`。同 commit の v5 比較画像8枚を参照。ゲーム本体のコード・データは変更していない。
最終 GLB SHA-256: `e1ace4f2834512d6a606d9779192f76c6db4edeba98539c976bbfcf300eb6656`。

## 取り込み

1. 外側 README の ZIP SHA-256 と、展開後 `sha256sum -c SHA256SUMS` を確認する。
2. 先に独立 `preview/project.godot` を Godot 4.6.3 で開く。初期は Stand。5動作、毛色、領域、取付点、視点を切り替えられる。
3. ゲームの既存試作場面 `godot/proto/tripo_horse/` に素材を取り込み、v5・現行馬・既存騎手と同じ時刻/速度で比較する。枝全体はマージしない。
4. GLB のほか **v6 の毛色シェーダと新しい取付点 JSON も使用する**。v5 の頭部の形・鼻先マスク・首振りが変わっている。

## 首と頭の比率・動き

数値は倍率2.6での実寸。首の4点は評価後の皮の表面を追跡した。109時点（240Hz、端点込み）。以下の長さは端点重複を除いた108位相の平均であり、編集パラメーターそのものではない。

| 項目 | v5 | v6 |
|---|---:|---:|
| き甲→うなじの水平長 | 0.5321m | 0.6652m（1.250倍） |
| き甲→うなじの弦の長さ | 0.5850m | 0.7408m |
| うなじ→鼻先の長さ | 0.6246m | 0.5572m（0.892倍） |
| うなじの上下幅 | 0.1714m | 0.2863m |

- 首の傾き: **20.89〜31.76°**。
- 頭と首: **97.09〜102.32°**。頭は首の動きに3.5%周期遅れて弱く追従する。
- 首の上の線の弦より下への誤差: 最大 **0.847mm**、三角形の分割による許容2mm以内。横/斜めの連続画像でも折れやへこみを確認した。
- 鼻先は全109時点でうなじより前。左右の偏りは `neck-line.json` に記録。
- 首の横幅を絞り、頭の幅・厚みを長さより強く絞った。鼻先の深い中央溝と二つの突起は、局所切除と閉じた丸い鼻面への置き換え・平滑化で解消した。
- `dimension-validation.json` は rest の幾何断面も記録する。上方の断面は顎を含み得るため、全部位の太さが一律に何%減ったという受け入れ基準には使わない。

`proportion-comparison.json` に v5/v6 の並列値、`neck-line.json` に4点と33点の首の上の線、`proportion-design.json` に制作パラメーターを収録。

## たてがみ・目・鼻の色

平たい大きな房を残した試作は独立最終レビューで不合格になった。最終版では、首の房を **52本の細い丸断面の束**へ置き換え、不規則な間隔・長さ・向きで片側に寝かせた。前髪6・尾8を合わせて66束。細い閉じた下地と根元の暗色を保ち、胴色の島を防ぐ。髪専用の追加ボーンや追加ブレンドシェイプは無い。

目は小さく滑らかな閉じた形（region 5）。v5 の角張った黒い体表の面は除いた。鼻先は鼻孔と口の周囲だけを小さく暗くし、region 4 の小数部で顔色へ補間する。大きな黒い二塊には戻さない。

## v5 から維持した約束

- その場走行、Race の周期 **0.45秒**、倍率2.6の完歩 **7m**。`L=7*S/2.6`、再生倍率 `v*0.45/L` を維持。
- き甲の上下 **0.14854m**、全蹄が1.5cm超浮く割合 **20.0%**、蹄最低点 **-2.474mm**。
- `regression-validation.json` で、5動作すべての蹄重心・き甲・周期・ループと、Saddle/Stirrups/Withers を v5 と同じ方法で照合。胴と脚の動きは維持。
- 接地中の残留速度は `contact-validation.json`。16m/sで脚別RMS約0.47〜0.79m/sで v5 と同じ。ゲーム側の0.47という単一値と、脚別の独立測定は算出範囲が違うので混同しない。
- 5クリップ、54骨。**19,168三角形**（v5:19,190）。胴の基準と鞍の位置は保ち、首と頭の変更に伴う鼻先を含む全長は `geometry-report.json` を参照。

| GLB 名 | Godot 名 | 周期 | 倍率2.6の完歩 | RaceNeckCorrective |
|---|---|---:|---:|---:|
| RaceGallop_Loop | RaceGallop | 0.45s | 7m | 1 |
| Stand_Loop | Stand | 3s | 0 | 0 |
| Walk_Loop | Walk | 1.2s | 1.6m | 0 |
| Trot_Loop | Trot | 173/240s | 2.8m | 1 |
| Canter_Loop | Canter | 0.6s | 4.5m | 1 |

他の移動クリップも `L=表の完歩*S/2.6`、再生倍率 `v*周期/L`。ゲームの速度による歩法切替を新しく書き換える必要はない。遷移の実ゲーム比較は下の未検証項目を参照。

## 向き・取付点

前は **−X、上は+Y**。既存の親の Y +90°と、騎手の −90°補正を維持。Saddle の向きの決まりを変えていない。

`Saddle`, `Stirrup_L`, `Stirrup_R`, `Bit_L`, `Bit_R`, `Withers` を収録。鞍/あぶみ/き甲は v5 と同じ動き。Bit の位置は細く小さくなった頭と新しい首振りに合わせたため、**v5 の JSON を流用せず v6 のものに置き換える**。

- `saddle-track.json`: Race の28時点。
- `attachment-tracks.json`: 全5動作の60Hz記録。
- `attachment-godot-validation.json`: Godot の全5動作・全6点と JSON の照合。
- マーカー画像は `comparison/iteration-05/` の `v6-markers-*`。

JSON の position_model は倍率を掛ける前のモデル座標。親の尺度/向きの変換を一度だけ掛ける。骨の子として追従する方式と JSON 駆動を重複適用しない。

## 必須: シェーダと Godot import

`preview/coat.gdshader` を馬本体に使うか、既存毛色シェーダへ以下をマージする。頭絡の BridleLeather/BridleMetal へは適用しない。既存の個体ごとの毛色・白斑・靴下パラメーターは維持する。

```glsl
// fragment(), ALBEDO / NORMAL_MAP 設定より前。ビュー空間の組み込み値を使用。
vec3 geometric_normal = normalize(cross(dFdx(VERTEX), dFdy(VERTEX)));
if (dot(geometric_normal, VIEW) < 0.0) geometric_normal = -geometric_normal;
if (dot(NORMAL, geometric_normal) < 0.15) NORMAL = geometric_normal;
```

v5 と同じ法線補正。GLB 内の normal texture を保持し、**強度0.03**を使う。付属シェーダの既定値も0.03に合わせた。

UV2 の整数の意味は変更していない: region=`floor(UV2.x*8)`、leg=`floor(UV2.y*8)`。region 1/4 では `clamp((fract(UV2.x*8)-0.1)/0.8,0,1)` をそれぞれ mane/muzzle の補間率に使う。region 4 を単純に黒で代入すると鼻先が大きく黒くなるため、既存の補間を維持する。

import は同梱 `.glb.import` の設定に合わせて再インポートする。

- Animation FPS **240**、Remove Immutable Tracks **false**。
- Light Baking **Disabled (0)**。UV2 を自動ライトマップ UV で上書きしない。
- Advanced Import の **AnimationPlayer ノード**で Optimizer **false**、Compression **false**。
- 全5クリップのループは Linear（GLB の `_Loop` 接尾辞から設定）。

optimizer は各クリップではなく AnimationPlayer ノードの `optimizer/enabled`。`tools/configure_godot_import.py` は ConfigFile で辞書を保ちながら設定をマージするが、ゲーム側の import ID が違う場合は Advanced Import で該当ノードを選ぶ。

## 検証の範囲

- `surface-validation.json`: 3メッシュとも境界辺0、非多様体辺0、巻き順不整合0。Race109時点で退化面0、体の符号付き体積は正。
- **変形した全ての面の自己交差や法線が完全に正しい、とまでは証明していない。** 平均スキン行列による近似法線の食い違いは最大626面（首肩35面）。これはウェイト勾配を省いた診断で、裏返った面626枚という意味ではない。0とも記載しない。
- 可視の反対向き法線画素の実レンダー監査は `normal-render-validation.json`。付属補正の適用後28枚で0。隠れた全表面の自己交差検査とは区別する。
- 5動作×1,920ステップ、停止復帰、UV2の8領域/5脚ID、全6取付点を Godot で確認。
- 最終 GLB の Blender 往復、別ディレクトリでの元入力からの再生成、配布ZIPの展開後検査を別 JSON に記録する。

## 実画像のレビューと残件

`comparison/iteration-05/` は同一カメラ・尺度・照明・時刻の v4/v5/v6 比較。自動の個体別カメラ合わせをしていない。全版に同じシェーダと法線強度0.03を使用。横/正面/斜めと首寄りは28連続時点、顔は4時点、v5/v6の他4歩法は各16時点。v6の背面・逆斜め28枚、反対側の首4枚、3毛色も収録。

v4/v5 はモデルと撮影条件が不変なので iteration-04 の描画を再利用し、metadata とモデル hash の一致を確認している。v6 は05で再描画した。再利用は capture-manifest.json に明記。

制作と途中レビュー、別担当の最終レビューを分けた。`review/` に不合格の指摘・修正前後画像・最終判定を保存。数値だけで完成とは判定していない。

残る細部と未検証の項目は最終レビュー文書を正とする。とくに、実ゲームの騎手干渉・速度の歩法遷移・複数頭でのLOD/FPSはこの独立素材場面では未検証。動画の書き出しと連続フレームの視認を行い、実時間の人間による動画再生とは区別している。Godot 4.6.3 / Compatibility / llvmpipe の詳細LODで撮影した。

原寸の比較PNGは配布時にロスレスWebPへ変換し、**復号後の全画素が一致すること**を検査する。比較文書とmanifestの画像パスも配布形式へ合わせる。画像の形や陰影を加工して欠点を隠していない。外側の代表シートは1600×1000 JPEG。

元素材は利用者提供の Tripo 生成モデル。追加の髪/目/鼻面/頭絡/動作/補正は同梱ツールで作成。他作品の馬モデル・画像・動画のデータは使用していない。素材の利用権は元の Tripo アカウントの契約に従う。
