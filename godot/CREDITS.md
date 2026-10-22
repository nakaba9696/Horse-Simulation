# Godot 版で使った素材

すべて権利の問題が無いもの（CC0・CC-BY 4.0、フォントは SIL OFL 1.1）。CC-BY の素材は作者をゲームの中のクレジットにも出す。参考作品の素材・実在の団体のロゴ・実在の人物の写真は使っていない。
コードで作った形（馬場・柵・ハロン棒・スタンド・観客・ゲート・パドック・鞍とゼッケン・ムチ・遠くの町と山）は素材ではないので、ここには載せない。

| ファイル | 中身 | 作者 | ライセンス | 出典 |
|---|---|---|---|---|
| `assets/horse_rigged/horse.json`・`shade.jpg`・`hair.png` | 馬（骨入りの体・たてがみと尾の房・頭絡）。ブラウザ版と同じく、サラブレッドの比へ写し直した形を `tools/export_horse_godot.js` で書き出したもの。`shade.jpg` は素材の絵から明るさの陰影だけを取り出した絵（`tools/pack_horse.py`）、`hair.png` は毛の束の絵（コードで描いた） | abhayexe | CC-BY 4.0 | 「Horse Rigged(Game Ready)」 https://sketchfab.com/3d-models/horse-riggedgame-ready-bc64f4ff7966474ca9bacd42fa73a754 （元のファイルとクレジットの文は `../assets/src/horse_rigged/`。ブラウザ版の出典は `../assets/CREDITS.md`）。クレジットの文：This work is based on "Horse Rigged(Game Ready)" by abhayexe licensed under CC-BY-4.0 |
| `assets/jockey/jockey.glb` | 騎手の体（骨23本。部位は頂点色） | Quaternius | CC0 1.0 | 「Universal Base Characters」の Superhero_Male_FullBody（無料版） https://quaternius.itch.io/universal-base-characters 。ブラウザ版の `../assets/jockey.js`（Blender で帽子・ゴーグルを足し、部位を頂点色に入れたもの）から GLB を取り出した |
| `assets/trees/CommonTree_1.*`・`CommonTree_3.*`・`Pine_1.*`・`Leaves_NormalTree_C.png`・`Leaf_Pine_C.png`・`Bark_NormalTree*.png`（と `License.txt`） | 木（広葉樹2つ・松1つ）と葉・樹皮の質感 | Quaternius | CC0 1.0 | Stylized Nature MegaKit https://quaternius.com/packs/stylizednaturemegakit.html 。同じパックを置いている公開リポジトリ https://github.com/tilakpatell/tilakverse-assets （`quaternius/stylized-nature-megakit/glTF/`）から取った。樹皮の質感は 2048 から 512 に縮めた |
| `assets/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr` | 空（晴れて雲の多い空の HDRI。空と光と映り込みに使う） | Greg Zaal（撮影）・Jarod Guest（空の手直し） | CC0 1.0 | Poly Haven https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |
| `assets/textures/leafy_grass_*_1k.jpg` | 芝の質感（色・法線） | Charlotte Baglioni | CC0 1.0 | Poly Haven https://polyhaven.com/a/leafy_grass |
| `assets/textures/dirt_aerial_02_*_1k.jpg` | ダートの質感（色・法線） | Rob Tuytel | CC0 1.0 | Poly Haven https://polyhaven.com/a/dirt_aerial_02 |
| `assets/textures/aerial_grass_rock_*_1k.jpg` | 内馬場・外の草地の質感（色・法線） | Rob Tuytel | CC0 1.0 | Poly Haven https://polyhaven.com/a/aerial_grass_rock |
| `assets/ui/bg_title.jpg`・`bg_home.jpg`・`bg_shop.jpg`・`bg_paddock.jpg`・`bg_result.jpg` | 画面の背景（タイトル・ホームと番組表・馬の店・パドック・週の結果）。ブラウザ版の `../assets/ui_bg_*.js` から `tools/export_ui_assets.js` で取り出したもの | Poly Haven の各作者（Grasslands Sunset：Dimitrios Savva・Jarod Guest／Hayloft：Adrian Kubasa／Ladybrand Heritage House：Dario Barresi／Ballawley Park：Savva Zakharov）。結果の背景はこのゲームの3Dの競馬場の止め絵 | CC0 1.0 | 出典の一覧は `../assets/CREDITS.md` の「画面の背景」 |
| `assets/ui/*.png`（ボタン・札・帯・飾り・アイコン20・背景7）と `assets/ui/slices.json` | 画面の部品と背景（docs/art/UI_ART_REQUEST.md） | 持ち主が GPT の画像生成で作った絵（2026-10-20） | 持ち主のもの | — |
| `assets/owners/*.webp` | 馬主の顔（持ち主の絵のある6人・表情4つ：base・smile・joy・sad）。ブラウザ版の `../assets/owners_*.js` から `tools/export_ui_assets.js` で取り出したもの。絵の無い人は顔を出さない（名前とその人の色の帯だけ。コードで描いた顔は作らない・置かない。持ち主の指示 2026-10-20） | 持ち主 | 持ち主の作った絵（このゲームで使ってよい。持ち主の決定 2026-10-16） | https://github.com/nakaba9696/trpg-game/tree/main/assets/portraits （`../assets/CREDITS.md`） |
| `assets/fonts/NotoSansJP_700Bold.ttf`（と `OFL.txt`） | 画面の字（Noto Sans JP Bold） | Adobe（Source Han Sans）・Google | SIL Open Font License 1.1 | Google Fonts の Noto Sans JP。npm の `@expo-google-fonts/noto-sans-jp@0.4.4` に入っているものを使った |
| `assets/fonts/NotoSerifJP_900Black_sub.ttf` | 見出しの明朝（Noto Serif JP Black）。ゲームで使う字だけに減らした（`tools/subset_font.py`） | Adobe（Source Han Serif）・Google | SIL Open Font License 1.1 | Google Fonts の Noto Serif JP。npm の `@expo-google-fonts/noto-serif-jp@0.4.4` に入っているものから作った（減らしたものも同じ OFL で配れる。`OFL.txt` を一緒に配る） |
| `proto/tripo_horse/horse-gallop.glb`（と法線の絵） | 馬モデルの試作 v2（骨 54 本・襲歩のその場走行）。ゲームでは使わない試作で、書き出しにも入れない | 形：持ち主（Tripo で生成）。骨とアニメ：Codex | 持ち主の提供（Tripo の Pro プランで作った素材で、商用で使える。2026-10-22 持ち主に確かめた） | 枝 `codex/tripo-horse-handoff`（`../assets/CREDITS.md` の「馬モデルの試作 v2」） |

## 確かめたこと
- 骨入りの馬は CC-BY 4.0（作者 abhayexe。`../assets/src/horse_rigged/license.txt`）。作者の名前とクレジットの文をゲームの中のクレジットに出す。
- Quaternius の3つのパックは、パックの中の `License.txt` と公式の頁で CC0 1.0 と書かれている（2026-10-16 に確かめた）。
- Poly Haven の素材はすべて CC0（https://polyhaven.com/license）。作者は Poly Haven の API（`/info/<名前>`）で確かめた。
- Noto Sans JP は SIL OFL 1.1。フォントだけを売らなければ、ゲームに入れて配ってよい。`OFL.txt` を一緒に配る。
