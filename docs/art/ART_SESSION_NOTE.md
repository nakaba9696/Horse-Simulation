# 絵の係へ（持ち主の頼み・2026-10-21）

持ち主「別ゲーでキャラデザと画像生成をお願いしたい。生成する絵柄のプロンプトは（trpg-game で）使っているものと一緒でいい」。

- 頼みの全文：`docs/art/OWNER_ART_REQUEST_1.md`（見た目・色・表情 4 つ・ファイル名）。
- 絵柄：trpg-game の `docs/art/style.json`（男は `style_male.json`）と同じ設定。構図・背景（透明）・大きさ（1024×1024）・4 表情は頼みの「共通の決まり」に合わせる。
- 進め方：
  1. 新しい 7 人（hinata・sengoku・yuni・takenouchi・marie・lucy・ilona）は候補 3 枚ずつを作り、一人 1 枚の見本を `docs/art/candidates/<id>.webp` に置いて、このブランチ（`art/owners`）に push。trpg-game の art-inbox の返事に一行書く（配り役が選ぶページを作って持ち主に見せる）。
  2. 選ばれたら 4 表情を作る（基本の絵から顔だけ描き直す今のやり方で、服・髪・小物をずらさない）。置き場は `godot/assets/owners/<id>_<mood>.png`。id の読み替え：ひなた＝makino、マリエ＝takarada、イロナ＝gfhost。
  3. violaine・farina は前の絵（持ち主が持っている `docs/art/ref/`）を使う。新しい 7 人と画風が合わないときだけ、同じデザインで描き直す。
- lucy は 12 歳の子ども。子どもらしく描く。
