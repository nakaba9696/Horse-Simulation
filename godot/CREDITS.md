# Godot の試作で使った素材

すべて権利の問題が無いもの（CC0 と、フォントは SIL OFL 1.1）。参考作品の素材・実在の団体のロゴ・実在の人物の写真は使っていない。
コードで作った形（馬場・柵・ハロン棒・スタンド・観客・ゲート・騎手・遠くの町と山）は素材ではないので、ここには載せない。

| ファイル | 中身 | 作者 | ライセンス | 出典 |
|---|---|---|---|---|
| `assets/horse/Horse.gltf`（と `License.txt`） | 馬（骨50本・襲歩 Gallop ほか13のアニメーション）。毛色は試作の中で塗り替える | Quaternius | CC0 1.0 | Ultimate Animated Animals（2021年7月版） https://quaternius.com/packs/ultimateanimatedanimals.html 。公式の配布（Google Drive）が混んで落とせなかったので、同じパックを置いている公開リポジトリ https://github.com/Fialuxe/MouthOfGod_System （`Assets/ArtisticResources/ThirdParty/Quaternius/Ultimate Animated Animals - July 2021/`）から取った。中身は手を入れていない（法線は読み込んだときにならす） |
| `assets/trees/CommonTree_1.*`・`CommonTree_3.*`・`Pine_1.*`・`Leaves_NormalTree_C.png`・`Leaf_Pine_C.png`・`Bark_NormalTree*.png`（と `License.txt`） | 木（広葉樹2つ・松1つ）と葉・樹皮の質感 | Quaternius | CC0 1.0 | Stylized Nature MegaKit https://quaternius.com/packs/stylizednaturemegakit.html 。同じパックを置いている公開リポジトリ https://github.com/tilakpatell/tilakverse-assets （`quaternius/stylized-nature-megakit/glTF/`）から取った。樹皮の質感は 2048 から 512 に縮めた |
| `assets/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr` | 空（晴れて雲の多い空の HDRI。空と光と映り込みに使う） | Greg Zaal（撮影）・Jarod Guest（空の手直し） | CC0 1.0 | Poly Haven https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |
| `assets/textures/leafy_grass_*_1k.jpg` | 芝の質感（色・法線） | Charlotte Baglioni | CC0 1.0 | Poly Haven https://polyhaven.com/a/leafy_grass |
| `assets/textures/dirt_aerial_02_*_1k.jpg` | ダートの質感（色・法線） | Rob Tuytel | CC0 1.0 | Poly Haven https://polyhaven.com/a/dirt_aerial_02 |
| `assets/textures/aerial_grass_rock_*_1k.jpg` | 内馬場・外の草地の質感（色・法線） | Rob Tuytel | CC0 1.0 | Poly Haven https://polyhaven.com/a/aerial_grass_rock |
| `assets/fonts/NotoSansJP_700Bold.ttf`（と `OFL.txt`） | 画面の字（Noto Sans JP Bold） | Adobe（Source Han Sans）・Google | SIL Open Font License 1.1 | Google Fonts の Noto Sans JP。npm の `@expo-google-fonts/noto-sans-jp@0.4.4` に入っているものを使った |

## 確かめたこと
- Quaternius の2つのパックは、パックの中の `License.txt` と公式の頁で CC0 1.0 と書かれている（2026-10-16 に確かめた）。
- Poly Haven の素材はすべて CC0（https://polyhaven.com/license）。作者は Poly Haven の API（`/info/<名前>`）で確かめた。
- Noto Sans JP は SIL OFL 1.1。フォントだけを売らなければ、ゲームに入れて配ってよい。`OFL.txt` を一緒に配る。
