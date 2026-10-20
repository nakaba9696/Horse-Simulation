# trpg-game のセッションへ：「ターフの系譜」のオーナー9人の絵の依頼

持ち主のパソコンにいる trpg-game のセッションに、下の「ここから貼る」から「ここまで」をそのまま貼る。

---

（ここから貼る）

# 依頼：別のゲーム「ターフの系譜」のオーナー9人の立ち絵（基本＋表情3つ）を、trpg-game の道具で新しく描く

持ち主の決定（2026-10-20）「オーナー9人のデザイン　TRPGの画像使いまわしじゃなくて新規で生成してほしい　生成の仕方はTRPGセッションがしってる」「表情差分も作り方知ってるはず」。

いま「ターフの系譜」（リポジトリ `nakaba9696/Horse-Simulation`）のオーナー6人は、trpg-game の絵（tiria・dil・dorothea・gensai・violaine・farina）を流用している。残りの3人には絵が無い。これを9人とも、このゲームのために描いた新しい絵に替える。

## 1. 読むもの

リポジトリ `nakaba9696/Horse-Simulation` の枝 `claude/lucid-ptolemy-j204a3` にある次の2つ。

- `docs/art/owner_portraits.json`：9人の行。trpg-game の `docs/art/portraits.json` の `portraits` に足せる形そのまま。
  - id：`hs_hinata`・`hs_sengoku`・`hs_yuni`・`hs_marie`・`hs_genzaburo`・`hs_violaine`・`hs_lucy`・`hs_farina`・`hs_ilona`
  - 男は `type`：千石が `classic`、竹之内が `elder`
- `docs/OWNER_DESIGN.md`：9人の見た目の設計書。色見本・目印・表情、並べた一覧の絵 `docs/shots/owners/design_lineup.png` が載っている。絵を見て確かめるときの物差しにする。

clone できなければ、GitHub の Raw で2つのファイルを開いて写す。

## 2. trpg-game の一覧に足す（trpg-game には commit しない）

1. trpg-game の `docs/art/portraits.json` の `portraits` の終わりに、`owner_portraits.json` の9行を足す。
   - 手元だけで足す。終わったら元に戻してよい。
   - **trpg-game には commit も push もしない**。trpg-game のゲームにこの9人が出ないようにするため。
2. 絵は trpg-game の絵柄の設定をそのまま使う。女は `style.json`、男は `style.json` の上に `style_male.json` と型を重ねる。これで9人の画風がそろう。
   - 設定を書き換えない。前置き・後置き・ネガティブ（露出・複数人）は設定が足すので、行のタグは特徴だけになっている。
3. 似すぎの道具（`tools/portraits_similar.mjs`）やテストが、ほかのゲームの人と比べて落ちることがある。ここでは見なくてよい。9人の中での見分けは `OWNER_DESIGN.md` の「かぶりの点検」で確かめてある。

## 3. 作る（trpg-game の docs/art/README.md の手順どおり）

1. WebUI を `--api` で起動する。音量・ほかのアプリには触らない。
2. 確かめる：
   ```
   node tools/gen_portraits.mjs --only hs_hinata,hs_sengoku,hs_yuni,hs_marie,hs_genzaburo,hs_violaine,hs_lucy,hs_farina,hs_ilona --dry
   ```
   - 男の2人に型の語が付いているかを見る。
   - 米国の少女（`hs_lucy`）は12歳の子ども。子どもの体つき・肌を出さない服になっているかを見る。
3. 基本の絵：同じ `--only …` で `--dry` を外して作る。
   - 1枚ずつ見る。2人以上写っている・字や透かしがある・服や髪の色が設計書と違う・子どもが大人びて描かれている、なら `--force --new-seed` で作り直す。
   - 気に入ったら `--keep <id>` で seed を残す。
4. 表情の差分：
   ```
   node tools/gen_portraits.mjs --variants --only hs_hinata,hs_sengoku,hs_yuni,hs_marie,hs_genzaburo,hs_violaine,hs_lucy,hs_farina,hs_ilona
   ```
   - 基本の絵からの img2img。表情のタグだけを差し替える。
   - 1人3枚。ほほえみ＝`_joy` か `_faint_smile`、喜び＝`_fun`、残念＝`_sorrow`。
   - 竹之内・ヴィオレーヌ・ファリナ・イロナは崩した顔（大口・涙・汗・慌て）にしない。
   - 基本が笑顔の人（ひなた・マリエ・ユニ・ルーシー・イロナ）は、喜びを基本と違う笑い方にする。
   - 差分を作ったあとの直しは、trpg-game で積んだやり方でよい（小物・瞳の色を基本に戻す、目の数・眉と目の重なりの点検など）。
5. 切り抜き・透過：trpg-game と同じ抜き方（`python3 tools/a20/a20_gaps.py` ほか）で、背景を透明にする。
   - マゼンタの地と暗い地に置いて、縁と囲まれたすき間を見る。
   - 透けた画素が0の絵（抜き忘れ）が無いかも数える。
6. 大きさ：512×640 の webp・1枚 80KB 以下（trpg-game の道具の既定どおり）。
7. 持ち主に見せる：9人×4枚を、表情の名前つきで並べた確認票を出す。持ち主が「よい」にした絵だけ次へ進める。

## 4. 「ターフの系譜」へ入れる

できた36枚（`hs_*.webp`・`hs_*_joy.webp` か `_faint_smile`・`_fun`・`_sorrow`）を、このリポジトリに入れる。

1. `nakaba9696/Horse-Simulation` の枝 `claude/lucid-ptolemy-j204a3` を手元に持ってくる。
2. 書き出す：
   ```
   node tools/pack_owners.cjs <trpg-game の assets/portraits のフォルダ>
   ```
   - `tools/pack_owners.cjs` の `PICK` は、もう新しい id（`hs_*`）を先に探す形になっている。絵があれば新しい絵を、無ければ今の流用の絵を使う。
   - これで `assets/owners_<オーナーの id>.js`（JS 版）と `godot/assets/owners/<オーナーの id>_<base|smile|joy|sad>.webp`（Godot 版）ができる。
   - オーナーの id：makino・sengoku・yuni・takarada・takenouchi・violaine・dakota（米国の人）・farina・gfhost（イロナ）。
3. 顔の位置を書く：絵の顔の中心（横・縦の％）と、丸い札で切り抜く幅（％）を書く。
   - 例：`portrait: { x: 50, y: 20, w: 44 }`。
   - 書く場所は `data/owners.js`（8人）、イロナは `data/gfhost.js`。
   - 今の値がある6人も、新しい絵に合わせて直す。
   - 絵が無かった yuni・dakota・gfhost には新しく足す。
4. 出典を書く：`assets/CREDITS.md` の馬主の絵の表を、新しい絵に書き替える。
   - 作者は持ち主、ライセンスは「持ち主の作った絵（このゲームで使ってよい）」、出典は「trpg-game の道具で生成。設定は Horse-Simulation の docs/art/owner_portraits.json」。
   - 流用の行（tiria など）は外す。
5. 書き出し直す：
   ```
   node tools/owner_faces.js
   node tools/owners_draft.js
   node tools/export_godot.js
   ```
   - `owner_faces.js`：絵ができた人の SVG の顔を消す。
6. Godot を一度開くか、`godot --headless --path godot --import` で、新しい webp の `.import` を作る。
7. 検証：`node tests/run.js`。
   - 持ち主の PC で全部を回すと重いので、回せなければ回さずに、その旨を書く（クラウドのセッションが回す）。
8. 見た目の確認：オーナーの一覧と場面を Godot で撮り、持ち主に見せる。
9. 渡し方：
   - **このリポジトリへ push できるなら**：枝 `claude/lucid-ptolemy-j204a3` に commit して push する。
     - commit の末尾にモデル名の入った行を書かない。
     - 上の 2〜5 で変わったファイル（`assets/owners_*.js`・`godot/assets/owners/*`・`data/owners.js`・`data/gfhost.js`・`assets/CREDITS.md`・`docs/OWNERS_DRAFT.md`・`godot/data/*`）をまとめる。
   - **push できないなら**：できた36枚の webp と、使った seed（`docs/art/seeds.local.json` の9人の分か、`--keep` した値）を zip にまとめて持ち主に渡す。このリポジトリのクラウドのセッションが、上の 2〜8 をやる。

## 5. 守ること

- 作品名・作家名を新しく書き足さない。性的な描き方をしない（米国の少女は12歳の子ども）。
- 恋愛の場面の絵にしない。1枚に1人だけ。背景に物を置かない。
- 設計書の見た目（髪の色・髪型・目の色・服の色・目印）を変えない。変えたくなったら、持ち主に見せて決めてもらう。

（ここまで）
