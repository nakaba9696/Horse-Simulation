# Tripo Horse v5 — Claude 取り込み手順

納品先: `codex/tripo-horse-handoff` / `artifacts/tripo-horse-v5/`。
依頼の基準: `claude/lucid-ptolemy-j204a3` の `docs/handoff/TRIPO_HORSE_V5_REQUEST.md`、commit `20b43752859c0803884c1eb65e24ef27a33ba37d`。同 commit の v4 比較画像8枚を参照した。ゲーム本体のコード・データは変更していない。

## 最初にすること

1. このフォルダーの README にある ZIP の SHA-256 を確認して展開する。展開先で `sha256sum -c SHA256SUMS` を実行する。
2. まず独立した `preview/project.godot` を Godot 4.6.3 で開き、Stand / Walk / Trot / Canter / RaceGallop を確認する。初期状態は Stand。毛色、白斑、領域表示、正面・背面・側面、取付点表示を切り替えられる。
3. ゲームへの取り込みは既存の試作場面 `godot/proto/tripo_horse/` で行う。v4・現行馬・同じ騎手を同じ速度と時刻で並べる。枝全体はマージしない。採用判断前の本番置き換えはしない。

## 必須: GLB と一緒にシェーダ補正を取り込む

**GLB を差し替えるだけでは、この納品の見た目を再現できない。** `preview/coat.gdshader` を馬本体の材質に使用するか、既存の毛色シェーダに下記3点をマージする。頭絡の `BridleLeather` / `BridleMetal` には適用しない。既存の馬ごとの色・白斑パラメーターは保持する。

### A. 肩・首の黒い切れ目を抑える法線補正

`fragment()` で、通常の毛色処理の後、`ALBEDO` と `NORMAL_MAP` の設定より前に入れる。Godot のビュー空間の `VERTEX` / `NORMAL` / `VIEW` をそのまま使う。

```glsl
vec3 geometric_normal = normalize(cross(dFdx(VERTEX), dFdy(VERTEX)));
if (dot(geometric_normal, VIEW) < 0.0) geometric_normal = -geometric_normal;
if (dot(NORMAL, geometric_normal) < 0.15) NORMAL = geometric_normal;
```

スキニングで移送された法線が実際の三角形の面法線と大きく食い違う画素だけ、面法線に戻す。穴を隠す処理ではない。メッシュ自体の穴は閉鎖済み。元から正しく向く画素の滑らかな法線は維持する。

**通常の法線マップは強度 0.03 を引き継ぐこと。** GLB の `normalTexture.scale` は 0.03。preview は GLB の normal texture と scale を ShaderMaterial に渡す。既存ゲーム側で強度を固定しているなら 0.03 に合わせる。シェーダの uniform 初期値だけを見て 0.65 に戻さないこと。

### B. 鼻先の色を補間する

整数の領域 ID は従来どおり `floor(UV2.x * 8.0)`。region 4 の色を単純代入する代わりに、小数部を使う。

```glsl
float region_blend = clamp((fract(UV2.x * 8.0) - 0.1) / 0.8, 0.0, 1.0);
if (region == 4) color = mix(coat_color.rgb, muzzle_color.rgb, region_blend);
```

### C. たてがみの根元も補間する

region 1 も同じ `region_blend` で `mix(coat_color.rgb, mane_color.rgb, region_blend)`。毛束は黒、首の根元の帯は連続的に切り替える。UV2 の整数の意味・leg ID・白斑の高さの意味は変更していない。古いシェーダでも領域は読めるが、この補間は再現されない。

## 必須: Godot の import 設定

同梱 `preview/assets/horse.glb.import` が確認済みの設定。ゲームの取り込み先でパスを保ちながら次を合わせ、**再インポート**する。

- Animation FPS: **240**。
- Remove Immutable Tracks: **false**。停止への切り替えで走行姿勢が残ることを防ぐ。
- Light Baking: **Disabled (0)**。UV2 を自動ライトマップ UV で上書きしない。
- Generate LODs: true。ただし納品の寄りの検査画像は LOD bias 16 の詳細形状。
- Advanced Import の **AnimationPlayer ノード**で Optimizer Enabled: **false**、Compression Enabled: false。各クリップの設定ではない。
- ループは5クリップとも Linear。GLB の `_Loop` 接尾辞から Godot が設定し、表示名は接尾辞が外れる。

`_subresources` で対応する設定は以下。AnimationPlayer の import ID がゲーム側で異なる場合は Advanced Import で該当ノードを選ぶ。既存の辞書を丸ごと消さず、この項目をマージする。

```text
"nodes": {
  "PATH:AnimationPlayer": {
    "optimizer/enabled": false,
    "compression/enabled": false
  }
}
```

既定の optimizer では鞍約2.1mm・口元約10.9mmの誤差が出た。無効化後、6点の最大位置誤差は **0.0015mm未満**（倍率2.6）。これは JSON と Godot の読み込み結果の照合であり、騎手の体格に合うかの検証とは別。
`tools/configure_godot_import.py` は独立 preview 用。ゲームでカスタム設定がある場合は手動でマージする。

## v4 からの修正と検証済みの数

数値は倍率2.6、距離は実寸。JSON の `points_model` / `position_model` は倍率を掛ける前の座標。

| 項目 | v5 の検証結果 | 証拠 |
|---|---|---|
| 首の傾き | 23.40〜25.87° | `neck-line.json` |
| 頭と首の角度 | 100.06〜100.08°、鼻先は全サンプルで前 | 同上 |
| 首の線のへこみ | 弦より下は最大0.383mm。三角形分割の誤差許容2mm以内 | 同上、33点の crest profile |
| 左右の偏り | 首中点 <0.001mm、うなじ <0.042mm | 同上 |
| うなじ平均高 | 1.670m | 同上 |
| き甲の上下 | 0.14854m | `motion-validation.json` |
| 4蹄が浮く割合 | 20.0%（全蹄の最低点が1.5cm超） | 同上 |
| 蹄の最低点 | −2.475mm | 同上 |
| 完歩の実測 | 4脚で6.9918〜6.9982m | 同上、接地中の蹄重心の傾きから推定 |
| 接地中の重心の残留速度 | 脚別 RMS 0.47〜0.79m/s、瞬間最大2.51〜4.24m/s（16m/s時） | `contact-validation.json` |
| ループ端 | 全5動作で頂点差0（Blender reimport） | `motion-validation.json` |
| 開いた辺 / 非多様体辺 / 不整合な面の巻き順 | 3メッシュとも0 | `surface-validation.json` |
| 退化した面 | Race 109時点で0、体の符号付き体積は常に正 | 同上 |
| 三角形 / 骨 | **19,190 / 54**（v4: 19,358 / 54） | `geometry-report.json`, `gltf-validation.json` |
| 立ち姿の体長 | 2.44979m | `geometry-report.json` |
| Godot動作検査 | 5クリップ×1,920ステップ、停止復帰差0 | `godot-validation.json` |
| 書き出し往復差 | 最大0.084mm程度（許容0.26mm） | `roundtrip-validation.json` |

首の4点は骨の設計値ではなく、評価後の皮の表面から取る。109時点（240Hz、端点を含む）、首の上の線33点。鼻先は左右の表面点の中点で、片側の鼻孔を使って左右の偏りを水増ししない。動作検査は各クリップの241位相で行い、GLB に焼かれた240fpsの動きを補間して評価している。

首と胴は閉じたボリュームから再構成し、連続するウェイトに変更。たてがみは片側へ寝かせた閉じた房と、その下の連続した帯を追加した。頭絡は別材質のまま。

## 「裏返り」の検査範囲と限界

巻き順が不整合な辺、穴、退化面はいずれも0。しかし、**素の GLB の全変形法線が常に正しい、とは報告していない**。

`surface-validation.json` の `normal_transport_disagreement_faces` は、平均した線形スキン変換による法線と実際の面の向きの食い違いの近似検査で、最大626面（首・肩周辺35面）。ウェイトの空間勾配を省いており、これを「裏返った面626枚」と解釈しない。同時に「変形した全ての面の裏返り0」という証明にも使わない。

実レンダーの寄り28時点では、補正前の法線の反対向き画素は最大850、**付属補正を入れた後は全28枚で0**。`normal-render-validation.json` / `godot-renders/normal-*` を参照。これはそのカメラで可視の画素の検査で、隠れた全ての面の自己交差が無いことの証明ではない。監査用シェーダは法線マップを使わず、通常材質の法線マップ強度は0.03としている。

首の大きな穴・肩の袋状の盛り上がりは今回の画像で解消した。近接では、肩・胸の低ポリゴンの起伏や、たてがみの房と根元の境の段差・小さな胴色の見えは残る。房の間隔もやや均一で、最終的な毛の自然さには改善余地がある。鼻先の色の補間を加えたが、外形の多角形感は残る。すべて美術的に完成したとは扱わず、添付の28枚で確認してほしい。

## クリップと座標の約束

| GLB 名 | Godot 名 | 周期 | 倍率2.6での完歩 | 補正形状 |
|---|---|---:|---:|---:|
| RaceGallop_Loop | RaceGallop | 0.45s | 7m | 1 |
| Stand_Loop | Stand | 3.0s | 0 | 0 |
| Walk_Loop | Walk | 1.2s | 1.6m | 0 |
| Trot_Loop | Trot | 173/240s = 0.720833s | 2.8m | 1 |
| Canter_Loop | Canter | 0.60s | 4.5m | 1 |

その場走行。Race は既存どおり `L=7*S/2.6`、再生倍率 `v*0.45/L`。
他の移動クリップも `L=表の完歩*S/2.6`、再生倍率 `v*周期/L`。Trot / Canter は追加の試作クリップで、歩法の切り替え時のブレンドと騎手の同期はゲーム内で評価する。

GLB は **−X が前、+Y が上**。ゲーム側の親の Y +90°を維持する。`Saddle` 自体の軸は変えていないため、既存の騎手の −90°補正も維持。`Saddle`・`Stirrup_L/R` の rest 値は v4 の記録を使って維持した。体の上下を変更したため、**v4 の saddle-track.json を流用せず v5 のものを使用**する。

取付点は `Saddle`, `Stirrup_L`, `Stirrup_R`, `Bit_L`, `Bit_R`, `Withers`。
`saddle-track.json` は Race の28時点、`attachment-tracks.json` は全5動作。骨格の動きに追従する点に取り付ける方式と JSON 駆動を重複適用しない。いずれもモデル座標なので親の倍率・向きの変換を一度だけ掛ける。
`RaceNeckCorrective` は Race/Trot/Canter=1、Stand/Walk=0。クリップに焼き込んだトラックを維持し、停止時に戻ることを確認する。

## 同梱画像と残りのゲーム内確認

`run-sheet.jpg`（8コマ）、`neck-shoulder-sheet.jpg`（4コマ）、`front-back-sheet.jpg`、`gaits-sheet.jpg` は1600×1000。`godot-renders/` に原寸の横28枚・首肩28枚・正背面・各動作・領域・法線監査を含む。`gallop-preview.mp4` は0.45秒を8回、60fps。

Godot 4.6.3 / Compatibility / llvmpipe（ソフトウェア OpenGL）で実画面を撮影。Blender の見た目だけでの判定ではない。ただし独立 preview の詳細 LOD の検証であり、ゲームの実機 FPS や群馬の負荷・既存の騎手の再取り付け・レース画面のライティングまでは未確認。ゲーム内で v4 / 現行馬と同時刻比較し、首の線、肩の起伏、たてがみ、騎手の足とあぶみ、LOD を確認してから採否を決める。

元素材は利用者が提供した Tripo 生成モデル。今回の追加房・頭絡・動作・補正は同梱ツールで生成した。他作品の馬モデルや動画のデータを複製していない。Tripo Pro の利用条件・素材の利用権は元アカウントの契約に従う。
