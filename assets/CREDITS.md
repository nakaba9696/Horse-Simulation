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
| `assets/ui_bg_result.js` | 結果・勝ったときの見せ場・レース | このゲームの3Dの競馬場（`js/ui/race3d.js`）をゴール前の内から撮った止め絵（`node tools/shot3d.js <出力先> result_bg`。1600×900） | このゲーム（絵の中の空・芝・ダート・木は下の「3D のレース」の CC0 の素材） | CC0 の素材から作った自作の絵 | - |

Poly Haven の素材はすべて CC0（https://polyhaven.com/license）。人物の顔や団体のロゴは写っていない所を切り出した。
結果の画面の背景は、前はサッカー場の写真（Orlando Stadium）だったので、ゲームの3Dの競馬場の止め絵に替えた。

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


## 馬主の顔

持ち主が別のゲームのために作った絵（Stable Diffusion）。持ち主の決定 2026-10-16「馬主の顔は別のゲームで素材作ったのでそれでいきます」。`tools/pack_owners.cjs` で、表情4つ（ふだん・ほほえみ・喜び・残念。無い表情は近いものか基本の絵）を base64 にした。2026-10-19 に鷺ノ宮・霧島・花房の絵を外し（馬主を仕様書の8つのジャンルに合わせた）、ヴィオレーヌ・ファリナ（持ち主の指定）を足した。絵の無い馬主（ユニ・ダコタ）は、コードで描く顔（`js/ui/ownerface.js`。Godot 版は `tools/owner_faces.js` が書き出す SVG）。

| ファイル | 馬主 | 元の絵 | 作者 | ライセンス | 出典 |
|---|---|---|---|---|---|
| `assets/owners_takenouchi.js` | 竹之内 源三郎 | `gensai.webp` と表情の差分 | 持ち主 | 持ち主の作った絵（このゲームで使ってよい） | https://github.com/nakaba9696/trpg-game/tree/main/assets/portraits |
| `assets/owners_makino.js` | 牧園 ひなた | `tiria.webp` と表情の差分 | 持ち主 | 持ち主の作った絵（このゲームで使ってよい） | https://github.com/nakaba9696/trpg-game/tree/main/assets/portraits |
| `assets/owners_sengoku.js` | 千石 悠斗 | `dil.webp` と表情の差分 | 持ち主 | 持ち主の作った絵（このゲームで使ってよい） | https://github.com/nakaba9696/trpg-game/tree/main/assets/portraits |
| `assets/owners_takarada.js` | 宝田 マリエ | `dorothea.webp` と表情の差分 | 持ち主 | 持ち主の作った絵（このゲームで使ってよい） | https://github.com/nakaba9696/trpg-game/tree/main/assets/portraits |
| `assets/owners_violaine.js` | ヴィオレーヌ・ド・サン＝クレール | `violaine.webp` と表情の差分 | 持ち主 | 持ち主の作った絵（このゲームで使ってよい） | https://github.com/nakaba9696/trpg-game/tree/main/assets/portraits |
| `assets/owners_farina.js` | ファリナ | `farina.webp` と表情の差分 | 持ち主 | 持ち主の作った絵（このゲームで使ってよい） | https://github.com/nakaba9696/trpg-game/tree/main/assets/portraits |

## 骨入りの馬（`js/ui/horse_rigged.js`）

CC-BY-4.0 なので、ゲームの中のクレジット（タイトルの「クレジット」。`js/ui/credits.js`）にも作者と作品名を出す。
書き出しは `python3 tools/pack_horse.py`（元のファイルは `assets/src/horse_rigged/`。絵は 1024 に縮め、毛色を抜いた明るさの陰影と、たてがみ・尾の印にした）。

| ファイル | 中身 | 元の素材 | 作者 | ライセンス | URL | 手を加えたこと |
|---|---|---|---|---|---|---|
| `assets/horse_rigged.js` | 骨入りの馬（GLB。2,914 面、骨 42 本） | Sketchfab「Horse Rigged(Game Ready)」 | abhayexe（https://sketchfab.com/abhayexe） | CC-BY-4.0（商用可・作者の表記が要る） | https://sketchfab.com/3d-models/horse-riggedgame-ready-bc64f4ff7966474ca9bacd42fa73a754 | 1つの GLB にまとめ、絵を 1024 の陰影の絵に変えた。読み込んだときにサラブレッドの比へ形を写し直す（脚を長く細く・脚の下の長い毛を消す・胴を浅く・首を細長く・頭を小さく）。毛色は材質の中で塗る |

表記：This work is based on "Horse Rigged(Game Ready)" (https://sketchfab.com/3d-models/horse-riggedgame-ready-bc64f4ff7966474ca9bacd42fa73a754) by abhayexe (https://sketchfab.com/abhayexe) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
