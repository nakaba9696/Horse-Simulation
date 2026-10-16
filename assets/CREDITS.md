# 絵の素材の出典

3D のレース（`js/ui/race3d.js`）で使う素材と、その出典・作者・ライセンス。素材は `file://` でも読めるように base64 にして `assets/<名前>.js`（`HS.ASSETS[名前]`）に入れてある。
書き出しは `node assets/pack_assets.js <素材のフォルダ>`（フォルダの中のファイル名は `assets/pack_assets.js` の表のとおり）。素材が読めないときは、手作りの絵と形（`race3d.js` の中）で描く。

決まり（`CLAUDE.md`）：CC0 を優先し、CC-BY は表記して使う。参考作品の素材・実在の団体のロゴ・実在の人物の写真は使わない。1つ足すたびに、ここへ1行足す（テスト `tests/run.js` の「素材」が、`assets/*.js` が全部ここに載っているかを確かめる）。

| ファイル | 中身 | 元の素材 | 作者 | ライセンス | URL | 手を加えたこと |
|---|---|---|---|---|---|---|
| `assets/sky_clear.js` | 晴れ・稍重の空（空の球と、映り込みの光） | Poly Haven「Kloofendal 48d Partly Cloudy (Pure Sky)」 | Greg Zaal（撮影）・Jarod Guest（空の編集） | CC0 1.0 | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | 色調を整えた JPG（Tonemapped）の上 56% を切り出し、4096×1024 に縮めた |
| `assets/sky_overcast.js` | 重・不良の曇り空 | Poly Haven「Kloofendal Overcast (Pure Sky)」 | Greg Zaal | CC0 1.0 | https://polyhaven.com/a/kloofendal_overcast_puresky | 同上（2048×512） |
| `assets/turf_col.js` | 芝の色 | ambientCG「Grass 005」（Color） | ambientCG（Lennart Demes） | CC0 1.0 | https://ambientcg.com/a/Grass005 | 1024×1024 の JPG に縮めた |
| `assets/turf_nor.js` | 芝の凹凸 | ambientCG「Grass 005」（NormalGL） | ambientCG（Lennart Demes） | CC0 1.0 | https://ambientcg.com/a/Grass005 | 512×512 に縮めた |
| `assets/grass_col.js` | コースの外の草地・内馬場 | ambientCG「Grass 001」（Color） | ambientCG（Lennart Demes） | CC0 1.0 | https://ambientcg.com/a/Grass001 | 512×512 に縮めた |
| `assets/dirt_col.js` | ダートの砂の色 | ambientCG「Ground 054」（Color） | ambientCG（Lennart Demes） | CC0 1.0 | https://ambientcg.com/a/Ground054 | 1024×1024 に縮めた。色は材質の中で砂の色に寄せる |
| `assets/dirt_nor.js` | ダートの砂の凹凸 | ambientCG「Ground 054」（NormalGL） | ambientCG（Lennart Demes） | CC0 1.0 | https://ambientcg.com/a/Ground054 | 512×512 に縮めた |
| `assets/tree.js` | 木の板絵（正面・横の2枚を十字に組む） | Poly Haven「Island Tree 01」 | Rob Tuytel（スキャン・処理）・Rico Cilliers（整理・処理） | CC0 1.0 | https://polyhaven.com/a/island_tree_01 | Blender 3.6 で正面と横から描き（Cycles・背景透明）、1024×512 に並べて 256 色の PNG にした |
| `assets/jockey.js` | 騎手の体（GLB。近く 3,183 面・遠く 1,018 面、骨 23 本） | Quaternius「Universal Base Characters」の Superhero_Male_FullBody（無料版） | Quaternius | CC0 1.0 | https://quaternius.itch.io/universal-base-characters （https://quaternius.com） | Blender 3.6 で目・眉を外し、指の骨の重みを手へまとめ、帽子とゴーグルを足し、部位（肌・勝負服・袖・ズボン・長靴・手袋・帽子・ゴーグル）を頂点色に入れ、面を減らして GLB にした。絵（質感）は使わない。勝負服の柄は材質の中で描く |

## 外のライブラリ（`lib/`）

| ファイル | 中身 | ライセンス | URL |
|---|---|---|---|
| `lib/three.min.js` | Three.js r128 | MIT（`lib/three.js-LICENSE`） | https://github.com/mrdoob/three.js/tree/r128 |
| `lib/GLTFLoader.js` | glTF / GLB を読む（three.js r128 の examples/js/loaders） | MIT（`lib/three.js-LICENSE`） | https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js |
| `lib/SkeletonUtils.js` | 骨つきの形の複製（three.js r128 の examples/js/utils） | MIT（`lib/three.js-LICENSE`） | https://unpkg.com/three@0.128.0/examples/js/utils/SkeletonUtils.js |

## 探したが使わなかったもの（次に探す人のために）
- 走る馬の骨つきの形（CC0）：写実の馬で骨と襲歩の動きのあるものは見つからなかった。Quaternius「Farm Animals Animated」（CC0、Run の動き）・OpenGameArt「horse」（CC0、骨なし 593 面）は、いまの手作りの馬より粗いので使わなかった。馬は手作りの形のまま、体の凹凸（法線の絵）と光の当たり方で質を上げた。
- Sketchfab の馬：ダウンロードに登録が要るので、この環境からは取れなかった。
