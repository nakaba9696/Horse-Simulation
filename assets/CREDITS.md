# 絵の素材の出典

素材ごとに、出典・作者・ライセンス・URL を書く（CLAUDE.md「絵の素材ファイルを使ってよい」）。CC0 を優先し、CC-BY は表記して使う。
別々の子が同じファイルに書くので、節ごとに分けて足す。

## 画面の背景

Poly Haven の HDRI（全周の写真）を、トーンマップ済みの JPG から 16:9（1600×900）の普通の画角に切り出し、JPEG にしてから base64 にした。色や明るさは画面の側（css/style.css）で重ねて整える。

| ファイル | 使う所 | 元の素材 | 作者 | ライセンス | URL |
|---|---|---|---|---|---|
| `assets/ui_bg_title.js` | タイトル | Grasslands Sunset | Dimitrios Savva・Jarod Guest | CC0 | https://polyhaven.com/a/grasslands_sunset |
| `assets/ui_bg_home.js` | ホーム・厩舎・データなど | Hayloft | Adrian Kubasa | CC0 | https://polyhaven.com/a/hayloft |
| `assets/ui_bg_shop.js` | 馬の店・馬の画面 | Ladybrand Heritage House | Dario Barresi | CC0 | https://polyhaven.com/a/ladybrand_heritage_house |
| `assets/ui_bg_paddock.js` | パドック | Ballawley Park | Savva Zakharov | CC0 | https://polyhaven.com/a/ballawley_park |
| `assets/ui_bg_result.js` | 結果・勝ったときの見せ場・レース | Orlando Stadium | Greg Zaal・Dimitrios Savva | CC0 | https://polyhaven.com/a/orlando_stadium |

Poly Haven の素材はすべて CC0（https://polyhaven.com/license）。人物の顔や団体のロゴは写っていない所を切り出した。

## 3D のレース（`js/ui/race3d.js`）

空・地面・木・騎手の素材。base64 にして `assets/<名前>.js`（`HS.ASSETS[名前]`）に入れ、書き出しは `node assets/pack_assets.cjs <素材のフォルダ>`（フォルダの中のファイル名は `assets/pack_assets.cjs` の表のとおり）。素材が読めないときは、手作りの絵と形（`race3d.js` の中）で描く。
テスト `tests/run.js` の「assets: 絵の素材は全部 CREDITS にあり…」が、この節のファイルが全部ここに載っているか・大きさ・騎手の GLB の形を確かめる。

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

### 外のライブラリ（`lib/`）

| ファイル | 中身 | ライセンス | URL |
|---|---|---|---|
| `lib/three.min.js` | Three.js r128 | MIT（`lib/three.js-LICENSE`） | https://github.com/mrdoob/three.js/tree/r128 |
| `lib/GLTFLoader.js` | glTF / GLB を読む（three.js r128 の examples/js/loaders） | MIT（`lib/three.js-LICENSE`） | https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js |
| `lib/SkeletonUtils.js` | 骨つきの形の複製（three.js r128 の examples/js/utils） | MIT（`lib/three.js-LICENSE`） | https://unpkg.com/three@0.128.0/examples/js/utils/SkeletonUtils.js |

### 探したが使わなかったもの（次に探す人のために）
- 走る馬の骨つきの形（CC0）：写実の馬で骨と襲歩の動きのあるものは見つからなかった。Quaternius「Farm Animals Animated」（CC0、Run の動き）・OpenGameArt「horse」（CC0、骨なし 593 面）は、いまの手作りの馬より粗いので使わなかった。馬は手作りの形のまま、体の凹凸（法線の絵）と光の当たり方で質を上げた。
- Sketchfab の馬：ダウンロードに登録が要るので、この環境からは取れなかった。
